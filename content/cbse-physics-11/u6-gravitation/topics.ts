import type {
  FrqItem,
  FrqPart,
  FrqRubric,
  FrqSolutionPart,
  Hint,
  ItemFigure,
  McChoice,
  McSingleItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";
import { calibrateCbsePhysicsDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-physics-11";
const UNIT = "u6-gravitation";
const VERSION = "0.1.4";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  parts: readonly FrqPart[];
  hints: readonly [string, string, string];
  rubric: FrqRubric;
  commonErrors: readonly string[];
  workedSolution: readonly FrqSolutionPart[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly [McSeed, McSeed, McSeed, McSeed, McSeed];
  constructed: readonly [
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
  ];
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body,
  }));
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the gravitation law, distance from the centre, or energy sign before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : (seed.rationales[seedLetter] ??
          fallbackWrongRationale(seed, seedLetter)),
      misconceptionTag: isCorrect
        ? null
        : (seed.misconceptionTags?.[seedLetter] ??
          "incorrect_cbse_class11_physics_gravitation_reasoning"),
    };
  });

  const choices = unletteredChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];
  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_surface_formula_without_checking_orbital_radius_or_energy_reference",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeConstructed(
  meta: TopicMeta,
  seed: ConstructedSeed,
  index: number,
): FrqItem {
  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "drops_negative_sign_in_gravitational_potential_energy_or_uses_surface_radius_as_orbit_radius",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: [...seed.parts],
    hintLadder: hints(seed.hints),
    rubric: seed.rubric,
    commonErrors: [...seed.commonErrors],
    workedSolution: [...seed.workedSolution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeTopic(seed: TopicSeed): Topic {
  return {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
    items: [
      ...seed.mc.map((item, index) => makeMc(seed, item, index)),
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
    ],
  };
}

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return {
    maxPoints: points,
    criteria: [{ part, points, description }],
  };
}

const keplerOrbitFigure: ItemFigure = {
  type: "svg",
  title: "Planet at perihelion and aphelion",
  description:
    "An elliptical orbit with the Sun at one focus. The planet is shown at a nearer point P and a farther point A, with distances r and 4r from the Sun.",
  svg: `<svg viewBox="0 0 680 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="390" fill="#ffffff"/>
  <ellipse cx="350" cy="195" rx="235" ry="125" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <circle cx="209" cy="195" r="15" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
  <circle cx="115" cy="195" r="10" fill="#2563eb"/>
  <circle cx="585" cy="195" r="10" fill="#2563eb"/>
  <line x1="209" y1="195" x2="115" y2="195" stroke="#16a34a" stroke-width="3"/>
  <line x1="209" y1="195" x2="585" y2="195" stroke="#16a34a" stroke-width="3"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="188" y="170">Sun</text>
    <text x="96" y="178">P</text>
    <text x="598" y="178">A</text>
    <text x="154" y="220">r</text>
    <text x="392" y="220">4r</text>
    <text x="270" y="58">elliptical orbit</text>
  </g>
</svg>`,
};

const gVariationGraphFigure: ItemFigure = {
  type: "svg",
  title: "Variation of g with distance from Earth's centre",
  description:
    "A graph of g/g0 against r/R. Inside Earth it rises linearly from 0 to 1 at r/R=1; outside it falls to 1/4 at r/R=2.",
  svg: `<svg viewBox="0 0 680 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="430" fill="#ffffff"/>
  <defs>
    <marker id="u6-g-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="110" y1="330" x2="590" y2="330"/>
    <line x1="110" y1="270" x2="590" y2="270"/>
    <line x1="110" y1="210" x2="590" y2="210"/>
    <line x1="110" y1="150" x2="590" y2="150"/>
    <line x1="110" y1="90" x2="590" y2="90"/>
    <line x1="230" y1="70" x2="230" y2="330"/>
    <line x1="350" y1="70" x2="350" y2="330"/>
    <line x1="470" y1="70" x2="470" y2="330"/>
  </g>
  <line x1="110" y1="330" x2="610" y2="330" stroke="#334155" stroke-width="3" marker-end="url(#u6-g-arrow)"/>
  <line x1="110" y1="350" x2="110" y2="60" stroke="#334155" stroke-width="3" marker-end="url(#u6-g-arrow)"/>
  <path d="M110 330 L350 90 C410 150 450 210 470 270 C492 294 530 308 590 315" fill="none" stroke="#2563eb" stroke-width="5"/>
  <circle cx="230" cy="210" r="6" fill="#2563eb"/>
  <circle cx="350" cy="90" r="6" fill="#2563eb"/>
  <circle cx="470" cy="270" r="6" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#0f172a">
    <text x="92" y="335">0</text>
    <text x="84" y="215">0.5</text>
    <text x="96" y="95">1</text>
    <text x="222" y="356">0.5</text>
    <text x="346" y="356">1</text>
    <text x="466" y="356">2</text>
    <text x="596" y="356">r/R</text>
    <text x="48" y="58">g/g0</text>
    <text x="318" y="52">surface</text>
  </g>
</svg>`,
};

const satelliteOrbitFigure: ItemFigure = {
  type: "svg",
  title: "Satellite at height equal to Earth's radius",
  description:
    "Earth of radius R is shown with a circular satellite orbit at height R above the surface, so the orbital radius from the centre is 2R.",
  svg: `<svg viewBox="0 0 620 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="420" fill="#ffffff"/>
  <circle cx="310" cy="220" r="90" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="310" cy="220" r="180" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8 6"/>
  <circle cx="490" cy="220" r="12" fill="#f97316" stroke="#c2410c" stroke-width="3"/>
  <line x1="310" y1="220" x2="400" y2="220" stroke="#16a34a" stroke-width="3"/>
  <line x1="400" y1="220" x2="490" y2="220" stroke="#16a34a" stroke-width="3"/>
  <circle cx="310" cy="220" r="5" fill="#0f172a"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="280" y="225">O</text>
    <text x="350" y="206">R</text>
    <text x="438" y="206">R</text>
    <text x="456" y="190">satellite</text>
    <text x="278" y="322">Earth</text>
    <text x="216" y="78">circular orbit</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Kepler's Laws and Universal Gravitation",
    subtopic:
      "Kepler's laws of planetary motion and Newton's universal law of gravitation.",
    mc: [
      {
        questionLatex: L`Kepler's second law states that the line joining a planet and the Sun sweeps`,
        difficulty: 1,
        skillTags: ["keplers_laws", "equal_areas"],
        choices: [
          L`equal areas in equal intervals of time`,
          L`equal distances in equal intervals of time`,
          L`equal angles only for circular orbits`,
          L`equal speeds at all points of an elliptical orbit`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Equal distances would imply constant speed, which is not true for an elliptical orbit.",
          C: "The law is about areal velocity, not equal angular displacement.",
          D: "A planet moves faster near perihelion and slower near aphelion.",
        },
        hints: [
          "This is the law of areas.",
          "It talks about the area swept by the radius vector.",
          "The areal velocity is constant.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Kepler's second law says the radius vector from the Sun to the planet sweeps equal areas in equal times.",
          },
        ],
      },
      {
        questionLatex: L`Two point masses attract each other with force $F$. If both masses are doubled and their separation is tripled, the new gravitational force is`,
        difficulty: 2,
        skillTags: ["universal_law", "inverse_square"],
        choices: [
          L`$\frac{2F}{9}$`,
          L`$\frac{4F}{9}$`,
          L`$\frac{9F}{4}$`,
          L`$\frac{F}{9}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Doubling both masses gives a factor of $4$, not $2$.",
          C: "The separation is in the denominator, so tripling it reduces the force by $9$.",
          D: "This accounts only for the tripled separation and ignores the mass changes.",
        },
        hints: [
          "Use $F=Gm_1m_2/r^2$.",
          "Mass factors multiply in the numerator.",
          "The distance factor is squared in the denominator.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Relative to the original force,",
            math: "F'=F\\left(2\\right)\\left(2\\right)\\left(\\frac{1}{3^2}\\right)=\\frac{4F}{9}",
          },
        ],
      },
      {
        questionLatex: L`In the orbit shown, the planet's speed is largest at`,
        figure: keplerOrbitFigure,
        difficulty: 3,
        skillTags: ["keplers_second_law", "elliptical_orbit"],
        choices: [
          L`A`,
          L`both P and A equally`,
          L`P`,
          L`neither point, because speed is constant`,
        ],
        correctLetter: "C",
        rationales: {
          A: "At A the planet is farther from the Sun, so it moves slower to keep areal velocity constant.",
          B: "Equal areal velocity does not mean equal linear speed.",
          D: "Speed is not constant in an elliptical orbit.",
        },
        hints: [
          "Use Kepler's second law.",
          "Near the Sun, a smaller radius must sweep the same area in the same time.",
          "The planet is fastest at perihelion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At P the planet is nearest to the Sun. To sweep equal areas in equal times, it must move faster there than at A.",
          },
        ],
      },
      {
        questionLatex: L`A planet moves around the same star in a nearly circular orbit of radius $4$ times Earth's orbital radius. If Earth's period is $1$ year, the planet's period is`,
        difficulty: 3,
        skillTags: ["keplers_third_law", "period_radius_relation"],
        choices: [L`$4$ years`, L`$16$ years`, L`$64$ years`, L`$8$ years`],
        correctLetter: "D",
        rationales: {
          A: "The period is not directly proportional to radius.",
          B: "This uses $T\\propto r^2$, not Kepler's third law.",
          C: "This uses $T\\propto r^3$ instead of $T^2\\propto r^3$.",
        },
        hints: [
          "For planets around the same star, $T^2\\propto r^3$.",
          "Therefore $T\\propto r^{3/2}$.",
          "$4^{3/2}=8$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "By Kepler's third law,",
            math: "\\frac{T}{1\\text{ year}}=4^{3/2}=8",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Earth and an apple exert gravitational forces of equal magnitude on each other, but the apple has much larger acceleration. Reason (R): The force is the same on both bodies, while acceleration is inversely proportional to mass for a given force.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "newtons_third_law", "gravitation"],
        choices: [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why equal forces produce very unequal accelerations.",
          C: "The reason is true from $a=F/m$.",
          D: "The assertion is true: gravitational force pairs are equal and opposite.",
        },
        hints: [
          "Use Newton's third law for the force pair.",
          "Use Newton's second law for acceleration.",
          "Earth's mass is enormously larger than the apple's mass.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The gravitational forces are equal in magnitude, but $a=F/m$, so the much smaller apple has the much larger acceleration.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Two point masses $2\text{ kg}$ and $3\text{ kg}$ are separated by $0.50\text{ m}$. Find the gravitational force between them in terms of $G$.`,
        difficulty: 2,
        skillTags: ["universal_law", "force_calculation"],
        parts: singlePart("a", "Find the gravitational force.", 1),
        hints: [
          "Use Newton's law of gravitation.",
          "The denominator is $(0.50)^2$.",
          "$2\\times3=6$ and $0.50^2=0.25$.",
        ],
        rubric: singleRubric("a", 1, "Finds $24G\\text{ N}$."),
        commonErrors: ["Forgetting to square the separation."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$F=\\frac{Gm_1m_2}{r^2}=\\frac{G(2)(3)}{(0.50)^2}=24G\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A planet orbits the Sun at $9$ times Earth's orbital radius. Using Kepler's third law, find its period in years.`,
        difficulty: 2,
        skillTags: ["keplers_third_law", "period"],
        parts: singlePart("a", "Find the period.", 1),
        hints: [
          "For the same central mass, $T^2\\propto r^3$.",
          "So $T\\propto r^{3/2}$.",
          "$9^{3/2}=27$.",
        ],
        rubric: singleRubric("a", 1, "Finds $27$ years."),
        commonErrors: ["Writing $9$ years by assuming $T\\propto r$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$T=1\\text{ year}\\times 9^{3/2}=27\\text{ years}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two masses attract each other with gravitational force $F$. One mass is doubled and the separation is halved.`,
        difficulty: 3,
        skillTags: ["universal_law", "proportional_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the factor due to doubling one mass.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the final force in terms of $F$.",
            points: 1,
          },
        ],
        hints: [
          "The mass product appears in the numerator.",
          "Halving distance makes $1/r^2$ four times larger.",
          "Multiply the two factors.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies a factor of $2$ from mass.",
            },
            { part: "b", points: 1, description: "Finds final force $8F$." },
          ],
        },
        commonErrors: [
          "Using only the distance change and missing the mass change.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Doubling one mass doubles the gravitational force.",
          },
          {
            part: "b",
            explanation:
              "Halving separation multiplies force by $4$, so $F'=2\\times4F=8F$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two planets move in nearly circular orbits around the same star. Planet 1 has orbital radius $R$ and period $T$. Planet 2 has orbital radius $4R$.`,
        difficulty: 4,
        skillTags: ["keplers_third_law", "orbital_speed_ratio"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the period of planet 2 in terms of $T$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the ratio of orbital speeds $v_2/v_1$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State why the same central star condition matters.",
            points: 1,
          },
        ],
        hints: [
          "Apply Kepler's third law for the same central mass.",
          "For circular motion, $v=2\\pi r/T$.",
          "Use the radius ratio and period ratio together.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $T_2=8T$." },
            { part: "b", points: 1, description: "Finds $v_2/v_1=1/2$." },
            {
              part: "c",
              points: 1,
              description:
                "Notes that $T^2/r^3$ is constant only for the same central mass.",
            },
          ],
        },
        commonErrors: ["Using $T_2=4T$ instead of $8T$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$T_2/T=(4R/R)^{3/2}=4^{3/2}=8$, so $T_2=8T$.",
          },
          { part: "b", explanation: "$v_2/v_1=(4R/8T)/(R/T)=1/2$." },
          {
            part: "c",
            explanation:
              "Kepler's constant depends on the central mass, so both planets must orbit the same star.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A planet moves in the elliptical orbit shown. Its nearest distance from the Sun is $r$ at P and farthest distance is $4r$ at A. The gravitational force is central, so angular momentum about the Sun is conserved.`,
        figure: keplerOrbitFigure,
        difficulty: 5,
        skillTags: [
          "keplers_second_law",
          "angular_momentum",
          "elliptical_orbit",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Name the Kepler law connected with constant areal velocity.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the angular-momentum relation between speeds at P and A.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Find $v_P/v_A$.", points: 1 },
          {
            letter: "d",
            promptMarkdown: "If $v_A=5\\text{ km s}^{-1}$, find $v_P$.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "State where the planet has greater kinetic energy.",
            points: 1,
          },
        ],
        hints: [
          "For a central force, $mvr$ is conserved at the nearest and farthest points.",
          "Use the distances marked in the figure.",
          "Kinetic energy is larger where speed is larger.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States Kepler's second law.",
            },
            {
              part: "b",
              points: 1,
              description: "Writes $mv_Pr=mv_A(4r)$ or equivalent.",
            },
            { part: "c", points: 1, description: "Finds $v_P/v_A=4$." },
            {
              part: "d",
              points: 1,
              description: "Finds $20\\text{ km s}^{-1}$.",
            },
            {
              part: "e",
              points: 1,
              description: "States kinetic energy is greater at P.",
            },
          ],
        },
        commonErrors: [
          "Assuming speed is constant throughout the elliptical orbit.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The constant areal velocity statement is Kepler's second law.",
          },
          {
            part: "b",
            explanation:
              "At P and A, velocity is tangential, so $mv_Pr=mv_A(4r)$.",
          },
          { part: "c", explanation: "$v_P/v_A=4$." },
          { part: "d", explanation: "$v_P=4(5)=20\\text{ km s}^{-1}$." },
          {
            part: "e",
            explanation:
              "Kinetic energy is greater at P because the speed is greater there.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.2",
    title: "Gravitational Field and Acceleration Due to Gravity",
    subtopic:
      "Acceleration due to gravity as gravitational field strength and its dependence on mass and radius.",
    mc: [
      {
        questionLatex: L`The acceleration due to gravity at the surface of a planet of mass $M$ and radius $R$ is`,
        difficulty: 1,
        skillTags: ["surface_gravity", "gravitational_field"],
        choices: [
          L`$\frac{GMR}{2}$`,
          L`$\frac{GM}{R^2}$`,
          L`$\frac{GR^2}{M}$`,
          L`$GMR^2$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This does not follow from equating $mg$ with $GMm/R^2$.",
          C: "Mass belongs in the numerator and radius squared in the denominator.",
          D: "The inverse-square dependence on radius is missing.",
        },
        hints: [
          "Set weight equal to gravitational force.",
          "$mg=GMm/R^2$.",
          "Cancel the test mass $m$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "At the surface,",
            math: "mg=\\frac{GMm}{R^2}\\Rightarrow g=\\frac{GM}{R^2}",
          },
        ],
      },
      {
        questionLatex: L`A planet has mass $4M$ and radius $2R$, where $M$ and $R$ are Earth's mass and radius. Its surface gravity is`,
        difficulty: 2,
        skillTags: ["surface_gravity", "scaling"],
        choices: [L`$2g$`, L`$4g$`, L`$g$`, L`$\frac{g}{2}$`],
        correctLetter: "C",
        rationales: {
          A: "This accounts for radius only once, but radius is squared.",
          B: "This accounts for the mass increase but ignores the radius increase.",
          D: "This reverses the scaling.",
        },
        hints: [
          "Use $g\\propto M/R^2$.",
          "Mass gives a factor $4$.",
          "Radius $2R$ gives a denominator factor $4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The two factors cancel.",
            math: "g'=\\frac{G(4M)}{(2R)^2}=\\frac{GM}{R^2}=g",
          },
        ],
      },
      {
        questionLatex: L`A $60\text{ kg}$ astronaut stands on a planet where $g=4\text{ m s}^{-2}$. The astronaut's weight there is`,
        difficulty: 2,
        skillTags: ["weight", "gravitational_field"],
        choices: [
          L`$15\text{ N}$`,
          L`$60\text{ N}$`,
          L`$600\text{ N}$`,
          L`$240\text{ N}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This divides mass by $g$ instead of multiplying.",
          B: "This is the mass value written as a force.",
          C: "This uses Earth's approximate $g=10\\text{ m s}^{-2}$ instead of the planet's value.",
        },
        hints: ["Weight is a force.", "Use $W=mg$.", "Multiply $60$ by $4$."],
        solution: [
          {
            step: 1,
            explanation: "Weight on that planet is",
            math: "W=mg=60(4)=240\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`At a distance $2R$ from the centre of a planet, where $R$ is the planet's radius, the gravitational field is`,
        difficulty: 3,
        skillTags: ["gravitational_field", "inverse_square"],
        choices: [L`$\frac{g}{4}$`, L`$\frac{g}{2}$`, L`$2g$`, L`$4g$`],
        correctLetter: "A",
        rationales: {
          B: "The field follows inverse square, not inverse first power.",
          C: "Moving farther from the centre reduces the field.",
          D: "This reverses the inverse-square dependence.",
        },
        hints: [
          "Surface gravity is at distance $R$ from the centre.",
          "Use $g_r=GM/r^2$.",
          "Put $r=2R$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "At $r=2R$,",
            math: "g_r=\\frac{GM}{(2R)^2}=\\frac{g}{4}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): The acceleration due to gravity is independent of the mass of the falling object. Reason (R): The gravitational force on the object is proportional to its mass, and acceleration is force divided by mass.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "mass_independence_of_g"],
        choices: [
          L`Both A and R are true, but R does not explain A.`,
          L`Both A and R are true, and R correctly explains A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason explains exactly why the object's mass cancels out.",
          C: "The reason is true from $F=GMm/R^2$ and $a=F/m$.",
          D: "The assertion is true when air resistance is neglected.",
        },
        hints: [
          "Write the gravitational force on a test mass.",
          "Then divide by the test mass to get acceleration.",
          "Check whether the test mass remains in the final expression.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$F=GMm/R^2$ and $a=F/m$, so the factor $m$ cancels and $a=GM/R^2$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`For a planet of mass $M$ and radius $R$, derive the expression for surface gravity by equating weight with gravitational force.`,
        difficulty: 1,
        skillTags: ["surface_gravity", "derivation"],
        parts: singlePart("a", "Write the expression for $g$.", 1),
        hints: [
          "Weight at the surface is $mg$.",
          "Gravitational force at the surface is $GMm/R^2$.",
          "Cancel $m$.",
        ],
        rubric: singleRubric("a", 1, "Derives $g=GM/R^2$."),
        commonErrors: [
          "Leaving the test mass in the final expression for $g$.",
        ],
        workedSolution: [
          { part: "a", explanation: "$mg=GMm/R^2$, so $g=GM/R^2$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A body of mass $5\text{ kg}$ has weight $20\text{ N}$ on a planet. Find the value of $g$ on that planet.`,
        difficulty: 1,
        skillTags: ["weight", "gravitational_field"],
        parts: singlePart("a", "Find $g$.", 1),
        hints: ["Use $W=mg$.", "Solve for $g$.", "Divide $20$ by $5$."],
        rubric: singleRubric("a", 1, "Finds $4\\text{ m s}^{-2}$."),
        commonErrors: ["Multiplying weight and mass instead of dividing."],
        workedSolution: [
          { part: "a", explanation: "$g=W/m=20/5=4\\text{ m s}^{-2}$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Planet X has the same average density as Earth but twice Earth's radius.`,
        difficulty: 4,
        skillTags: ["surface_gravity", "density_scaling"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Express mass in terms of density and radius.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the surface gravity of Planet X in terms of Earth's $g$.",
            points: 1,
          },
        ],
        hints: [
          "Use $M=\\frac43\\pi\\rho R^3$.",
          "Substitute into $g=GM/R^2$.",
          "For equal density, $g\\propto R$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $M=\\frac43\\pi\\rho R^3$.",
            },
            { part: "b", points: 1, description: "Finds $g_X=2g$." },
          ],
        },
        commonErrors: ["Assuming equal density means equal mass."],
        workedSolution: [
          {
            part: "a",
            explanation: "For a spherical planet, $M=\\frac43\\pi\\rho R^3$.",
          },
          {
            part: "b",
            explanation:
              "$g=GM/R^2=\\frac43\\pi G\\rho R$, so doubling $R$ at same density doubles $g$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A planet has mass $8$ times Earth's mass and radius $2$ times Earth's radius. Take Earth's surface gravity as $10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["surface_gravity", "weight_scaling"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the planet's surface gravity.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the weight of a $50\\text{ kg}$ object on this planet.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State whether the object's mass changes.",
            points: 1,
          },
        ],
        hints: [
          "Use $g\\propto M/R^2$.",
          "The mass factor is $8$ and the radius-squared factor is $4$.",
          "Mass is an intrinsic property; weight depends on $g$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $20\\text{ m s}^{-2}$.",
            },
            { part: "b", points: 1, description: "Finds $1000\\text{ N}$." },
            {
              part: "c",
              points: 1,
              description: "States mass remains $50\\text{ kg}$.",
            },
          ],
        },
        commonErrors: ["Changing the mass of the object when moving planets."],
        workedSolution: [
          {
            part: "a",
            explanation: "$g'=g\\frac{8}{2^2}=2g=20\\text{ m s}^{-2}$.",
          },
          { part: "b", explanation: "$W=mg'=50(20)=1000\\text{ N}$." },
          {
            part: "c",
            explanation:
              "The object's mass remains $50\\text{ kg}$; only its weight changes.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two objects of masses $2\text{ kg}$ and $5\text{ kg}$ are released near the surface of the same planet where air resistance is negligible.`,
        difficulty: 4,
        skillTags: ["mass_independence_of_g", "free_fall", "conceptual_case"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the gravitational force on an object of mass $m$ near the planet's surface.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Use $F=ma$ to find the acceleration.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Compare the accelerations of the $2\\text{ kg}$ and $5\\text{ kg}$ objects.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Name the assumption needed for this comparison.",
            points: 1,
          },
        ],
        hints: [
          "Use the planet's mass $M$ and radius $R$.",
          "Cancel the falling object's mass when finding acceleration.",
          "Air resistance is the usual reason real objects may fall differently.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $F=GMm/R^2$." },
            { part: "b", points: 1, description: "Finds $a=GM/R^2$." },
            {
              part: "c",
              points: 1,
              description: "States both accelerations are equal.",
            },
            {
              part: "d",
              points: 1,
              description: "Mentions air resistance is neglected.",
            },
          ],
        },
        commonErrors: [
          "Saying the heavier body must have greater gravitational acceleration.",
        ],
        workedSolution: [
          { part: "a", explanation: "The force is $F=GMm/R^2$." },
          { part: "b", explanation: "Since $F=ma$, $a=F/m=GM/R^2$." },
          {
            part: "c",
            explanation:
              "The expression has no $m$, so both objects have the same acceleration.",
          },
          {
            part: "d",
            explanation: "The comparison assumes air resistance is negligible.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.3",
    title: "Variation of g with Altitude and Depth",
    subtopic:
      "Change in acceleration due to gravity above and below Earth's surface.",
    mc: [
      {
        questionLatex: L`At a height equal to Earth's radius above the surface, the acceleration due to gravity is`,
        difficulty: 2,
        skillTags: ["variation_of_g", "altitude"],
        choices: [L`$\frac{g}{2}$`, L`$g$`, L`$\frac{g}{4}$`, L`$2g$`],
        correctLetter: "C",
        rationales: {
          A: "The distance from Earth's centre is doubled, so inverse square gives one-fourth, not one-half.",
          B: "Gravity decreases with altitude.",
          D: "Gravity does not increase when moving away from Earth.",
        },
        hints: [
          "Height $R$ above the surface means distance $2R$ from Earth's centre.",
          "Use inverse-square dependence.",
          "$g_h=g(R/(R+h))^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "At $h=R$,",
            math: "g_h=g\\left(\\frac{R}{2R}\\right)^2=\\frac{g}{4}",
          },
        ],
      },
      {
        questionLatex: L`At a depth $R/2$ below Earth's surface, assuming uniform density, the acceleration due to gravity is`,
        difficulty: 2,
        skillTags: ["variation_of_g", "depth"],
        choices: [L`$\frac{g}{4}$`, L`$2g$`, L`$0$`, L`$\frac{g}{2}$`],
        correctLetter: "D",
        rationales: {
          A: "Inside Earth, the standard CBSE approximation is linear in depth, not inverse square.",
          B: "Gravity decreases as depth increases below the surface.",
          C: "It becomes zero only at the centre, not halfway down.",
        },
        hints: [
          "For depth $d$, $g_d=g(1-d/R)$.",
          "Here $d=R/2$.",
          "Halfway to the centre gives half the surface value.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Using the depth formula,",
            math: "g_d=g\\left(1-\\frac{R/2}{R}\\right)=\\frac{g}{2}",
          },
        ],
      },
      {
        questionLatex: L`For a small height $h$ above Earth's surface where $h$ is much smaller than $R$, the approximate value of $g_h$ is`,
        difficulty: 3,
        skillTags: ["variation_of_g", "small_height_approximation"],
        choices: [
          L`$g\left(1-\frac{2h}{R}\right)$`,
          L`$g\left(1-\frac{h}{R}\right)$`,
          L`$g\left(1+\frac{2h}{R}\right)$`,
          L`$g\frac{R}{h}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the depth approximation, not the small-altitude approximation.",
          C: "Gravity decreases with height, so the correction should be negative.",
          D: "This is not a valid expansion of $gR^2/(R+h)^2$.",
        },
        hints: [
          "Start with $g_h=gR^2/(R+h)^2$.",
          "Write it as $g(1+h/R)^{-2}$.",
          "Use $(1+x)^{-2}\\approx1-2x$ for small $x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For $h\\ll R$,",
            math: "g_h=g\\left(1+\\frac{h}{R}\\right)^{-2}\\approx g\\left(1-\\frac{2h}{R}\\right)",
          },
        ],
      },
      {
        questionLatex: L`The ratio of $g$ at height $R$ above Earth's surface to $g$ at depth $R/2$ below the surface is`,
        difficulty: 3,
        skillTags: ["variation_of_g", "altitude_depth_comparison"],
        choices: [L`$2:1$`, L`$1:2$`, L`$1:4$`, L`$1:1$`],
        correctLetter: "B",
        rationales: {
          A: "This reverses the two values.",
          C: "This compares the height value with surface $g$, not with the depth value.",
          D: "The two positions do not have the same $g$.",
        },
        hints: [
          "At height $R$, $g_h=g/4$.",
          "At depth $R/2$, $g_d=g/2$.",
          "Now form $g_h:g_d$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The ratio is",
            math: "\\frac{g}{4}:\\frac{g}{2}=1:2",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): The value of $g$ decreases both above Earth's surface and below Earth's surface. Reason (R): Above the surface the distance from Earth's centre increases, while below the surface the effective attracting mass decreases.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "variation_of_g"],
        choices: [
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`Both A and R are true, and R correctly explains A.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason gives the two different physical causes for the decrease.",
          B: "Both parts of the reason are true under the usual spherical-Earth model.",
          D: "The assertion is true: surface value is maximum in this model.",
        },
        hints: [
          "Think separately about altitude and depth.",
          "Outside Earth, inverse-square distance dominates.",
          "Inside Earth, only the mass within the smaller radius contributes in the standard model.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Above Earth, $r$ increases; below Earth, the effective enclosed mass decreases. Both make $g$ smaller than its surface value.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the value of $g$ at a depth $R/4$ below Earth's surface, where $R$ is Earth's radius.`,
        difficulty: 2,
        skillTags: ["variation_of_g", "depth"],
        parts: singlePart("a", "Find $g_d$ in terms of surface $g$.", 1),
        hints: ["Use $g_d=g(1-d/R)$.", "Here $d=R/4$.", "Compute $1-1/4$."],
        rubric: singleRubric("a", 1, "Finds $3g/4$."),
        commonErrors: ["Using inverse-square law inside Earth."],
        workedSolution: [
          {
            part: "a",
            explanation: "$g_d=g(1-\\frac{R/4}{R})=\\frac{3g}{4}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the value of $g$ at a height $2R$ above Earth's surface, where $R$ is Earth's radius.`,
        difficulty: 2,
        skillTags: ["variation_of_g", "altitude"],
        parts: singlePart("a", "Find $g_h$ in terms of surface $g$.", 1),
        hints: [
          "The distance from Earth's centre is $R+2R=3R$.",
          "Use inverse-square variation with distance from the centre.",
          "Compare $R$ and $3R$.",
        ],
        rubric: singleRubric("a", 1, "Finds $g/9$."),
        commonErrors: [
          "Using height $2R$ as the centre distance instead of $3R$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$g_h=g\\left(\\frac{R}{3R}\\right)^2=\\frac{g}{9}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`At what height above Earth's surface does $g$ become one-fourth of its surface value? Let Earth's radius be $R$.`,
        difficulty: 3,
        skillTags: ["variation_of_g", "altitude_equation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Set up the equation for $g_h=g/4$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the height $h$.", points: 1 },
        ],
        hints: [
          "Use $g_h=g(R/(R+h))^2$.",
          "Cancel $g$ and take the square root.",
          "$R+h=2R$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $\\frac14=(R/(R+h))^2$.",
            },
            { part: "b", points: 1, description: "Finds $h=R$." },
          ],
        },
        commonErrors: [
          "Answering $h=2R$ by forgetting the surface radius already contributes $R$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\frac{g}{4}=g\\left(\\frac{R}{R+h}\\right)^2$.",
          },
          {
            part: "b",
            explanation: "$\\frac12=\\frac{R}{R+h}$, so $R+h=2R$ and $h=R$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Take Earth's radius as $6400\text{ km}$ and surface gravity as $9.8\text{ m s}^{-2}$. Compare $g$ at a mine depth of $1600\text{ km}$ with $g$ at an altitude of $1600\text{ km}$.`,
        difficulty: 4,
        skillTags: ["variation_of_g", "altitude_depth_comparison"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $g$ at the mine depth.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find $g$ at the altitude.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State where $g$ is larger.",
            points: 1,
          },
        ],
        hints: [
          "For depth use $g_d=g(1-d/R)$.",
          "For altitude use $g_h=g(R/(R+h))^2$.",
          "Here $1600/6400=1/4$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $7.35\\text{ m s}^{-2}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds about $6.27\\text{ m s}^{-2}$.",
            },
            {
              part: "c",
              points: 1,
              description: "States $g$ is larger at the mine depth.",
            },
          ],
        },
        commonErrors: ["Using the depth formula for altitude as well."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$g_d=9.8(1-1600/6400)=9.8(3/4)=7.35\\text{ m s}^{-2}$.",
          },
          {
            part: "b",
            explanation:
              "$g_h=9.8(6400/8000)^2=9.8(0.8)^2\\approx6.27\\text{ m s}^{-2}$.",
          },
          {
            part: "c",
            explanation: "$7.35>6.27$, so $g$ is larger at the mine depth.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Use the graph of $g/g_0$ against $r/R$, where $r$ is distance from Earth's centre, $R$ is Earth's radius, and $g_0$ is surface gravity.`,
        figure: gVariationGraphFigure,
        difficulty: 5,
        skillTags: ["variation_of_g_graph", "graph_interpretation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Read $g/g_0$ at $r=0.5R$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Read $g/g_0$ at $r=2R$.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "State where $g$ is maximum.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why the inside-Earth part is a straight line in this model.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Explain why the outside-Earth part is not a straight line.",
            points: 1,
          },
        ],
        hints: [
          "Read the marked points on the graph first.",
          "Inside a uniform Earth, enclosed mass is proportional to $r^3$.",
          "Outside Earth, $g\\propto1/r^2$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Reads $0.5$." },
            { part: "b", points: 1, description: "Reads $0.25$." },
            {
              part: "c",
              points: 1,
              description: "States maximum at $r=R$, the surface.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Explains $g\\propto r$ inside the uniform Earth model.",
            },
            {
              part: "e",
              points: 1,
              description: "Explains outside variation is inverse square.",
            },
          ],
        },
        commonErrors: ["Treating the outside graph as linear with distance."],
        workedSolution: [
          {
            part: "a",
            explanation: "At $r=0.5R$, the graph gives $g/g_0=0.5$.",
          },
          {
            part: "b",
            explanation: "At $r=2R$, the graph gives $g/g_0=0.25$.",
          },
          {
            part: "c",
            explanation: "The maximum occurs at the surface, $r=R$.",
          },
          {
            part: "d",
            explanation:
              "Inside a uniform Earth, enclosed mass is proportional to $r^3$, so $g=GM_r/r^2\\propto r$.",
          },
          {
            part: "e",
            explanation:
              "Outside Earth, the whole mass acts as if at the centre, so $g\\propto1/r^2$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.4",
    title: "Gravitational Potential and Potential Energy",
    subtopic:
      "Potential, potential energy, work against gravity, and sign convention with zero at infinity.",
    mc: [
      {
        questionLatex: L`Taking gravitational potential to be zero at infinity, the potential at distance $r$ from a mass $M$ is`,
        difficulty: 1,
        skillTags: ["gravitational_potential", "sign_convention"],
        choices: [
          L`$\frac{GM}{r}$`,
          L`$-\frac{GM}{r^2}$`,
          L`$\frac{GMr}{2}$`,
          L`$-\frac{GM}{r}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Gravitational potential is negative when zero is chosen at infinity.",
          B: "This has the distance dependence of field, not potential.",
          C: "Potential decreases with distance as $1/r$, not proportional to $r$.",
        },
        hints: [
          "Potential is potential energy per unit mass.",
          "Gravity is attractive, so the bound state has negative potential.",
          "The distance dependence is $1/r$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "With zero potential at infinity, $V=-GM/r$.",
          },
        ],
      },
      {
        questionLatex: L`The gravitational potential energy of two masses $m_1$ and $m_2$ separated by distance $r$ is`,
        difficulty: 1,
        skillTags: ["gravitational_potential_energy"],
        choices: [
          L`$-\frac{Gm_1m_2}{r}$`,
          L`$\frac{Gm_1m_2}{r^2}$`,
          L`$-\frac{Gm_1m_2}{r^2}$`,
          L`$Gm_1m_2r$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This resembles force magnitude and has the wrong sign and distance power.",
          C: "This uses inverse-square dependence of force, not potential energy.",
          D: "Potential energy is not proportional to separation for gravitation.",
        },
        hints: [
          "Potential energy is force integrated with respect to distance.",
          "It varies as $1/r$, not $1/r^2$.",
          "The sign is negative for an attractive bound pair with zero at infinity.",
        ],
        solution: [
          { step: 1, explanation: "For two point masses, $U=-Gm_1m_2/r$." },
        ],
      },
      {
        questionLatex: L`The minimum work required to take a mass $m$ from Earth's surface to infinity, neglecting air resistance and Earth's rotation, is`,
        difficulty: 2,
        skillTags: ["escape_work", "potential_energy_change"],
        choices: [L`$\frac{GMm}{2R}$`, L`$\frac{GMm}{R}$`, L`$GMmR$`, L`$0$`],
        correctLetter: "B",
        rationales: {
          A: "The factor $1/2$ appears in circular-orbit total energy, not in escape from rest at the surface.",
          C: "This has the wrong distance dependence.",
          D: "External work is required to raise potential energy from negative to zero.",
        },
        hints: [
          "Initial potential energy at the surface is $-GMm/R$.",
          "Final potential energy at infinity is $0$.",
          "Minimum external work equals increase in potential energy.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The change in potential energy is",
            math: "\\Delta U=0-\\left(-\\frac{GMm}{R}\\right)=\\frac{GMm}{R}",
          },
        ],
      },
      {
        questionLatex: L`The gravitational potential energy of two masses is $-40\text{ J}$ when their separation is $r$. At separation $2r$, it becomes`,
        difficulty: 2,
        skillTags: ["potential_energy", "scaling"],
        choices: [
          L`$-80\text{ J}$`,
          L`$+20\text{ J}$`,
          L`$-20\text{ J}$`,
          L`$-10\text{ J}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Increasing separation makes the negative potential energy less negative in magnitude.",
          B: "The sign remains negative for finite separation with zero at infinity.",
          D: "Doubling separation halves the magnitude, not quarters it.",
        },
        hints: [
          "Use $U\\propto -1/r$.",
          "Doubling separation halves the magnitude.",
          "Keep the sign negative.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At twice the separation, $U$ is half as large in magnitude, so $U=-20\\text{ J}$.",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Gravitational potential near an isolated mass is negative if it is taken as zero at infinity. Reason (R): Work must be done by an external agent to take a mass from a finite distance to infinity without changing kinetic energy.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "potential_energy_sign"],
        choices: [
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
          L`Both A and R are true, and R correctly explains A.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The need for positive external work to reach zero at infinity explains why the finite-distance value is negative.",
          B: "The reason is true for an attractive gravitational field.",
          C: "The assertion is true under the stated zero-at-infinity convention.",
        },
        hints: [
          "Think of a bound mass as having lower energy than at infinity.",
          "Moving it to infinity increases potential energy.",
          "A positive increase to zero means the starting value was negative.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since external work is needed to move the mass to infinity where $V=0$, the potential at finite distance must be below zero.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the gravitational potential at Earth's surface in terms of Earth's mass $M$ and radius $R$, taking potential zero at infinity.`,
        difficulty: 1,
        skillTags: ["gravitational_potential"],
        parts: singlePart("a", "Write the expression for $V$.", 1),
        hints: [
          "Potential due to a spherical mass outside or at its surface is like that of a point mass at the centre.",
          "Use distance $R$.",
          "Remember the negative sign.",
        ],
        rubric: singleRubric("a", 1, "Writes $V=-GM/R$."),
        commonErrors: [
          "Writing the field expression $GM/R^2$ instead of potential.",
        ],
        workedSolution: [
          { part: "a", explanation: "At the surface, $V=-GM/R$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the gravitational potential energy of a mass $m$ placed at Earth's surface, where Earth's mass is $M$ and radius is $R$.`,
        difficulty: 1,
        skillTags: ["gravitational_potential_energy"],
        parts: singlePart("a", "Write $U$.", 1),
        hints: [
          "Potential energy is mass times potential.",
          "Use $V=-GM/R$ at the surface.",
          "Multiply by $m$.",
        ],
        rubric: singleRubric("a", 1, "Writes $U=-GMm/R$."),
        commonErrors: ["Dropping the negative sign."],
        workedSolution: [{ part: "a", explanation: "$U=mV=m(-GM/R)=-GMm/R$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`A $1\text{ kg}$ mass is slowly lifted from Earth's surface to a point at distance $2R$ from Earth's centre. Take $g=10\text{ m s}^{-2}$ and $R=6.4\times10^6\text{ m}$.`,
        difficulty: 3,
        skillTags: ["potential_energy_change", "work_against_gravity"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the change in gravitational potential energy in symbolic form.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the work required.", points: 1 },
        ],
        hints: [
          "Use $U=-GMm/r$.",
          "From $R$ to $2R$, $\\Delta U=GMm/(2R)$.",
          "Use $GM/R^2=g$, so $GM/R=gR$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $\\Delta U=GMm/(2R)$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $3.2\\times10^7\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          "Using constant $mg$ over a distance $R$ for a large height.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta U=-GMm/(2R)-(-GMm/R)=GMm/(2R)$.",
          },
          {
            part: "b",
            explanation:
              "$\\Delta U=mgR/2=(1)(10)(6.4\\times10^6)/2=3.2\\times10^7\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two masses have gravitational potential energy $-12\text{ J}$ when separated by distance $r$. They are slowly moved apart to separation $3r$.`,
        difficulty: 4,
        skillTags: ["potential_energy", "external_work"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the final potential energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work done by the external agent.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the sign of the work.",
            points: 1,
          },
        ],
        hints: [
          "Potential energy varies as $-1/r$.",
          "External work in a slow process equals change in potential energy.",
          "Moving masses apart increases potential energy toward zero.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $-4\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $+8\\text{ J}$." },
            {
              part: "c",
              points: 1,
              description:
                "Explains that work is positive because potential energy increases.",
            },
          ],
        },
        commonErrors: ["Saying final potential energy is $-36\\text{ J}$."],
        workedSolution: [
          { part: "a", explanation: "At $3r$, $U_f=(-12)/3=-4\\text{ J}$." },
          {
            part: "b",
            explanation:
              "$W_{\\text{ext}}=\\Delta U=U_f-U_i=-4-(-12)=+8\\text{ J}$.",
          },
          {
            part: "c",
            explanation:
              "The work is positive because the masses are moved against attraction and potential energy increases.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A satellite of mass $m$ is taken from rest at Earth's surface and placed into a circular orbit of radius $2R$ about Earth. Earth's mass is $M$ and radius is $R$. Ignore air resistance and Earth's rotation.`,
        difficulty: 5,
        skillTags: ["potential_energy", "orbital_energy", "minimum_work"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the satellite's initial mechanical energy at rest on the surface.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write its potential energy in the orbit.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Write its kinetic energy in the circular orbit.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the total mechanical energy in the orbit.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Find the minimum work required to place it in that orbit.",
            points: 1,
          },
        ],
        hints: [
          "At rest on the surface, only gravitational potential energy is counted.",
          "For circular orbit, $K=GMm/(2r)$ and $U=-GMm/r$.",
          "Here $r=2R$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $E_i=-GMm/R$." },
            { part: "b", points: 1, description: "Finds $U_f=-GMm/(2R)$." },
            { part: "c", points: 1, description: "Finds $K_f=GMm/(4R)$." },
            { part: "d", points: 1, description: "Finds $E_f=-GMm/(4R)$." },
            { part: "e", points: 1, description: "Finds $W=3GMm/(4R)$." },
          ],
        },
        commonErrors: [
          "Using only the potential-energy change and forgetting final orbital kinetic energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Initially at rest on the surface, $E_i=U_i=-GMm/R$.",
          },
          {
            part: "b",
            explanation: "At orbital radius $2R$, $U_f=-GMm/(2R)$.",
          },
          {
            part: "c",
            explanation: "For a circular orbit, $K_f=GMm/(2r)=GMm/(4R)$.",
          },
          {
            part: "d",
            explanation: "$E_f=K_f+U_f=GMm/(4R)-GMm/(2R)=-GMm/(4R)$.",
          },
          { part: "e", explanation: "$W=E_f-E_i=-GMm/(4R)+GMm/R=3GMm/(4R)$." },
        ],
      },
    ],
  },
  {
    topicCode: "6.5",
    title: "Escape Speed, Orbital Velocity and Satellite Energy",
    subtopic:
      "Escape speed, circular orbital velocity, total energy of an orbiting satellite, and orbital scaling.",
    mc: [
      {
        questionLatex: L`The escape speed from the surface of a planet of mass $M$ and radius $R$ is`,
        difficulty: 1,
        skillTags: ["escape_speed"],
        choices: [
          L`$\sqrt{\frac{2GM}{R}}$`,
          L`$\sqrt{\frac{GM}{R}}$`,
          L`$\frac{GM}{R^2}$`,
          L`$\sqrt{2GMR}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the circular orbital speed just above the surface, not escape speed.",
          C: "This is surface gravity, not speed.",
          D: "The radius should be in the denominator.",
        },
        hints: [
          "Set final total energy at infinity to zero.",
          "Use $\\frac12mv_e^2=GMm/R$.",
          "Solve for $v_e$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Energy conservation gives $v_e=\\sqrt{2GM/R}$.",
          },
        ],
      },
      {
        questionLatex: L`The speed of a satellite in a circular orbit of radius $r$ around a planet of mass $M$ is`,
        difficulty: 1,
        skillTags: ["orbital_velocity"],
        choices: [
          L`$\sqrt{\frac{2GM}{r}}$`,
          L`$\sqrt{\frac{GM}{r}}$`,
          L`$\frac{GM}{r^2}$`,
          L`$2\pi r$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This is escape speed at radius $r$, not circular orbital speed.",
          C: "This is gravitational field strength.",
          D: "This is circumference, not speed.",
        },
        hints: [
          "Gravity provides centripetal force.",
          "$GMm/r^2=mv^2/r$.",
          "Cancel $m$ and solve for $v$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For circular orbit,",
            math: "\\frac{GMm}{r^2}=\\frac{mv^2}{r}\\Rightarrow v=\\sqrt{\\frac{GM}{r}}",
          },
        ],
      },
      {
        questionLatex: L`The ratio of escape speed from Earth's surface to circular orbital speed just above Earth's surface is`,
        difficulty: 2,
        skillTags: ["escape_speed", "orbital_velocity_ratio"],
        choices: [L`$2:1$`, L`$1:\sqrt2$`, L`$\sqrt2:1$`, L`$1:1$`],
        correctLetter: "C",
        rationales: {
          A: "Escape speed is $\\sqrt2$ times circular speed, not twice.",
          B: "This reverses the ratio.",
          D: "Escape speed and circular orbital speed are not equal.",
        },
        hints: [
          "Near the surface, $v_o=\\sqrt{GM/R}$.",
          "Escape speed is $v_e=\\sqrt{2GM/R}$.",
          "Divide the two expressions.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The ratio is",
            math: "\\frac{v_e}{v_o}=\\sqrt2",
          },
        ],
      },
      {
        questionLatex: L`For the satellite shown, the orbital speed is`,
        figure: satelliteOrbitFigure,
        difficulty: 3,
        skillTags: ["orbital_velocity", "data_from_figure"],
        choices: [
          L`$\sqrt{\frac{GM}{R}}$`,
          L`$\sqrt{\frac{2GM}{R}}$`,
          L`$\sqrt{\frac{GM}{4R}}$`,
          L`$\sqrt{\frac{GM}{2R}}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This uses Earth's radius as the orbital radius, but the satellite is at distance $2R$ from the centre.",
          B: "This is escape speed from the surface, not orbital speed at $2R$.",
          C: "This treats the orbital radius as $4R$.",
        },
        hints: [
          "Read the orbital radius from the figure.",
          "The satellite is at height $R$ above the surface, so its distance from the centre is $2R$.",
          "Use $v=\\sqrt{GM/r}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The orbital radius is $r=2R$.",
            math: "v=\\sqrt{\\frac{GM}{2R}}",
          },
        ],
      },
      {
        questionLatex: L`The total mechanical energy of a satellite of mass $m$ in a circular orbit of radius $r$ around a planet of mass $M$ is`,
        difficulty: 3,
        skillTags: ["satellite_energy", "circular_orbit"],
        choices: [
          L`$-\frac{GMm}{2r}$`,
          L`$-\frac{GMm}{r}$`,
          L`$\frac{GMm}{2r}$`,
          L`$0$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is potential energy alone, not total mechanical energy.",
          C: "This is kinetic energy, not total energy.",
          D: "Total energy is zero only for escape with zero speed at infinity.",
        },
        hints: [
          "For a circular orbit, $K=GMm/(2r)$.",
          "Potential energy is $U=-GMm/r$.",
          "Add $K$ and $U$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Total energy is",
            math: "E=\\frac{GMm}{2r}-\\frac{GMm}{r}=-\\frac{GMm}{2r}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`If the circular orbital speed just above a planet's surface is $7.9\text{ km s}^{-1}$, estimate the escape speed from that surface. Use $\sqrt2\approx1.414$.`,
        difficulty: 1,
        skillTags: ["escape_speed", "orbital_velocity_ratio"],
        parts: singlePart("a", "Find escape speed.", 1),
        hints: [
          "Escape speed is $\\sqrt2$ times circular speed at the same radius.",
          "Multiply $7.9$ by $1.414$.",
          "Round suitably.",
        ],
        rubric: singleRubric("a", 1, "Finds about $11.2\\text{ km s}^{-1}$."),
        commonErrors: ["Multiplying by $2$ instead of $\\sqrt2$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v_e=\\sqrt2v_o\\approx1.414(7.9)=11.2\\text{ km s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A satellite orbits at radius $4R$ around Earth. If the circular orbital speed at radius $R$ is $v_0$, find the orbital speed at $4R$.`,
        difficulty: 2,
        skillTags: ["orbital_velocity", "scaling"],
        parts: singlePart("a", "Find the speed in terms of $v_0$.", 1),
        hints: [
          "Orbital speed varies as $1/\\sqrt r$.",
          "Radius becomes $4$ times.",
          "$\\sqrt4=2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $v_0/2$."),
        commonErrors: ["Using $1/r^2$ scaling for orbital speed."],
        workedSolution: [
          {
            part: "a",
            explanation: "$v/v_0=\\sqrt{R/(4R)}=1/2$, so $v=v_0/2$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A satellite of mass $m$ moves in a circular orbit of radius $2R$ around Earth of mass $M$.`,
        difficulty: 3,
        skillTags: ["satellite_energy", "circular_orbit"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find its kinetic energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find its total mechanical energy.",
            points: 1,
          },
        ],
        hints: [
          "For circular orbit, $K=GMm/(2r)$.",
          "Total energy is $-GMm/(2r)$.",
          "Here $r=2R$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $GMm/(4R)$." },
            { part: "b", points: 1, description: "Finds $-GMm/(4R)$." },
          ],
        },
        commonErrors: ["Using $R$ instead of the orbital radius $2R$."],
        workedSolution: [
          { part: "a", explanation: "$K=GMm/(2r)=GMm/(4R)$." },
          { part: "b", explanation: "$E=-GMm/(2r)=-GMm/(4R)$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Take Earth's radius as $6.4\times10^6\text{ m}$ and $g=10\text{ m s}^{-2}$. Estimate the escape speed and the circular orbital speed just above Earth's surface.`,
        difficulty: 4,
        skillTags: ["escape_speed", "orbital_velocity", "numerical_estimate"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the circular orbital speed just above the surface.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the escape speed.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "State the ratio $v_e/v_o$.",
            points: 1,
          },
        ],
        hints: [
          "Use $GM/R=gR$.",
          "Then $v_o=\\sqrt{gR}$ and $v_e=\\sqrt{2gR}$.",
          "Convert m/s to km/s if needed.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $8.0\\text{ km s}^{-1}$ approximately.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $11.3\\text{ km s}^{-1}$ approximately.",
            },
            { part: "c", points: 1, description: "States $\\sqrt2$." },
          ],
        },
        commonErrors: [
          "Using $g=9.8$ after the question explicitly says use $10$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v_o=\\sqrt{gR}=\\sqrt{10(6.4\\times10^6)}=8.0\\times10^3\\text{ m s}^{-1}=8.0\\text{ km s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "$v_e=\\sqrt{2gR}=\\sqrt{1.28\\times10^8}\\approx1.13\\times10^4\\text{ m s}^{-1}=11.3\\text{ km s}^{-1}$.",
          },
          { part: "c", explanation: "$v_e/v_o=\\sqrt2$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A satellite is shifted from a circular orbit of radius $R$ to another circular orbit of radius $4R$ around the same planet of mass $M$. The satellite mass is $m$.`,
        difficulty: 5,
        skillTags: [
          "satellite_energy",
          "orbital_velocity_scaling",
          "keplers_third_law",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the ratio of orbital speeds $v_2/v_1$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the initial total energy.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the final total energy.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the minimum energy supplied for the transfer, ignoring losses.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown: "Find the ratio of orbital periods $T_2/T_1$.",
            points: 1,
          },
        ],
        hints: [
          "Orbital speed varies as $1/\\sqrt r$.",
          "Circular-orbit total energy is $-GMm/(2r)$.",
          "Kepler's third law gives $T\\propto r^{3/2}$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $1/2$." },
            { part: "b", points: 1, description: "Finds $-GMm/(2R)$." },
            { part: "c", points: 1, description: "Finds $-GMm/(8R)$." },
            { part: "d", points: 1, description: "Finds $3GMm/(8R)$." },
            { part: "e", points: 1, description: "Finds $8$." },
          ],
        },
        commonErrors: [
          "Thinking the higher orbit has more negative total energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v\\propto1/\\sqrt r$, so $v_2/v_1=\\sqrt{R/(4R)}=1/2$.",
          },
          { part: "b", explanation: "$E_1=-GMm/(2R)$." },
          { part: "c", explanation: "$E_2=-GMm/[2(4R)]=-GMm/(8R)$." },
          {
            part: "d",
            explanation: "$\\Delta E=E_2-E_1=-GMm/(8R)+GMm/(2R)=3GMm/(8R)$.",
          },
          { part: "e", explanation: "$T_2/T_1=(4R/R)^{3/2}=8$." },
        ],
      },
    ],
  },
];

export const gravitationTopics: Topic[] = topicSeeds.map(makeTopic);
