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
const UNIT = "u5-system-particles-rigid-body";
const VERSION = "0.1.5";
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
  extraMc?: readonly McSeed[];
  extraConstructed?: readonly ConstructedSeed[];
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
  return `You chose ${choiceText}. Recheck the centre-of-mass, torque, angular-momentum, or moment-of-inertia relation being used.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_rotational_motion_reasoning"),
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_rotational_formula_without_checking_axis_or_external_torque",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "mixes_linear_and_angular_quantities_without_matching_the_analogy",
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
      ...(seed.extraMc ?? []).map((item, index) =>
        makeMc(seed, item, seed.mc.length + index),
      ),
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
      ...(seed.extraConstructed ?? []).map((item, index) =>
        makeConstructed(seed, item, seed.constructed.length + index),
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

const comLineFigure: ItemFigure = {
  type: "svg",
  title: "Three particles on a straight line",
  description:
    "Particles of 1 kg, 2 kg, and 3 kg are placed at 0 m, 3 m, and 6 m on the x-axis respectively.",
  svg: `<svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="250" fill="#ffffff"/>
  <defs>
    <marker id="u5-com-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="80" y1="140" x2="560" y2="140" stroke="#334155" stroke-width="3" marker-end="url(#u5-com-arrow)"/>
  <g stroke="#64748b" stroke-width="2">
    <line x1="100" y1="125" x2="100" y2="155"/>
    <line x1="320" y1="125" x2="320" y2="155"/>
    <line x1="540" y1="125" x2="540" y2="155"/>
  </g>
  <g fill="#2563eb" stroke="#1d4ed8" stroke-width="2">
    <circle cx="100" cy="105" r="14"/>
    <circle cx="320" cy="105" r="18"/>
    <circle cx="540" cy="105" r="22"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="88" y="185">0 m</text>
    <text x="308" y="185">3 m</text>
    <text x="528" y="185">6 m</text>
    <text x="76" y="70">1 kg</text>
    <text x="296" y="66">2 kg</text>
    <text x="516" y="62">3 kg</text>
    <text x="564" y="146">x</text>
  </g>
</svg>`,
};

const balanceBeamFigure: ItemFigure = {
  type: "svg",
  title: "Balanced beam about a pivot",
  description:
    "A horizontal beam is pivoted at O. A 20 N force acts 0.60 m to the left, and an unknown weight W acts 0.40 m to the right.",
  svg: `<svg viewBox="0 0 660 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="330" fill="#ffffff"/>
  <defs>
    <marker id="u5-beam-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
  <line x1="90" y1="150" x2="570" y2="150" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
  <polygon points="330,158 300,235 360,235" fill="#e2e8f0" stroke="#334155" stroke-width="3"/>
  <line x1="210" y1="150" x2="210" y2="232" stroke="#dc2626" stroke-width="4" marker-end="url(#u5-beam-arrow)"/>
  <line x1="410" y1="150" x2="410" y2="232" stroke="#dc2626" stroke-width="4" marker-end="url(#u5-beam-arrow)"/>
  <line x1="210" y1="270" x2="330" y2="270" stroke="#2563eb" stroke-width="2"/>
  <line x1="410" y1="270" x2="330" y2="270" stroke="#2563eb" stroke-width="2"/>
  <line x1="210" y1="260" x2="210" y2="280" stroke="#2563eb" stroke-width="2"/>
  <line x1="330" y1="260" x2="330" y2="280" stroke="#2563eb" stroke-width="2"/>
  <line x1="410" y1="260" x2="410" y2="280" stroke="#2563eb" stroke-width="2"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="317" y="144">O</text>
    <text x="180" y="96">20 N</text>
    <text x="399" y="96">W</text>
    <text x="248" y="296">0.60 m</text>
    <text x="355" y="296">0.40 m</text>
  </g>
</svg>`,
};

const omegaTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Angular velocity-time graph",
  description:
    "Angular velocity rises linearly from 0 to 12 rad per second in 4 seconds, stays constant until 6 seconds, then falls linearly to 0 at 10 seconds.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <defs>
    <marker id="u5-omega-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="95" y1="320" x2="580" y2="320"/>
    <line x1="95" y1="260" x2="580" y2="260"/>
    <line x1="95" y1="200" x2="580" y2="200"/>
    <line x1="95" y1="140" x2="580" y2="140"/>
    <line x1="95" y1="80" x2="580" y2="80"/>
    <line x1="140" y1="50" x2="140" y2="320"/>
    <line x1="300" y1="50" x2="300" y2="320"/>
    <line x1="380" y1="50" x2="380" y2="320"/>
    <line x1="540" y1="50" x2="540" y2="320"/>
  </g>
  <line x1="95" y1="320" x2="595" y2="320" stroke="#334155" stroke-width="3" marker-end="url(#u5-omega-arrow)"/>
  <line x1="140" y1="340" x2="140" y2="55" stroke="#334155" stroke-width="3" marker-end="url(#u5-omega-arrow)"/>
  <polyline points="140,320 300,80 380,80 540,320" fill="none" stroke="#2563eb" stroke-width="5" stroke-linejoin="round"/>
  <g fill="#2563eb">
    <circle cx="140" cy="320" r="6"/>
    <circle cx="300" cy="80" r="6"/>
    <circle cx="380" cy="80" r="6"/>
    <circle cx="540" cy="320" r="6"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="15" fill="#0f172a">
    <text x="112" y="350">0</text>
    <text x="293" y="350">4</text>
    <text x="373" y="350">6</text>
    <text x="531" y="350">10</text>
    <text x="82" y="86">12</text>
    <text x="586" y="350">t (s)</text>
    <text x="36" y="52">&#969; (rad/s)</text>
  </g>
</svg>`,
};

const pointMassInertiaFigure: ItemFigure = {
  type: "svg",
  title: "Point masses about an axis",
  description:
    "Two point masses lie on a light rod at distances 1 m and 2 m from a fixed axis through O.",
  svg: `<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="280" fill="#ffffff"/>
  <line x1="100" y1="70" x2="100" y2="225" stroke="#334155" stroke-width="5"/>
  <line x1="100" y1="150" x2="560" y2="150" stroke="#64748b" stroke-width="4"/>
  <circle cx="100" cy="150" r="6" fill="#334155"/>
  <circle cx="300" cy="150" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="500" cy="150" r="32" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <line x1="100" y1="215" x2="300" y2="215" stroke="#16a34a" stroke-width="2"/>
  <line x1="100" y1="235" x2="500" y2="235" stroke="#16a34a" stroke-width="2"/>
  <g stroke="#16a34a" stroke-width="2">
    <line x1="100" y1="205" x2="100" y2="245"/>
    <line x1="300" y1="205" x2="300" y2="225"/>
    <line x1="500" y1="225" x2="500" y2="245"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="80" y="55">axis</text>
    <text x="108" y="142">O</text>
    <text x="274" y="112">1 kg</text>
    <text x="472" y="104">2 kg</text>
    <text x="182" y="205">1 m</text>
    <text x="292" y="258">2 m</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Centre of Mass and Centre-of-Mass Motion",
    subtopic:
      "Centre of mass of particle systems and rigid bodies; motion of centre of mass when external force is zero.",
    mc: [
      {
        questionLatex: L`Two particles of masses $2\text{ kg}$ and $3\text{ kg}$ are at $x=0$ and $x=5\text{ m}$ respectively. The centre of mass is at`,
        difficulty: 2,
        skillTags: ["centre_of_mass", "two_particles"],
        choices: [
          L`$3\text{ m}$`,
          L`$2\text{ m}$`,
          L`$2.5\text{ m}$`,
          L`$5\text{ m}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This treats the lighter particle as if it had the larger pull on the centre of mass.",
          C: "This is the midpoint of the two positions, but the masses are unequal.",
          D: "This is the position of the heavier particle, not the weighted average.",
        },
        hints: [
          "Use a weighted average of positions.",
          "The heavier mass pulls the centre of mass closer to $x=5\\text{ m}$.",
          "$x_{\\text{cm}}=(m_1x_1+m_2x_2)/(m_1+m_2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For two particles, use the mass-weighted average of positions.",
            math: "x_{\\text{cm}}=\\frac{2(0)+3(5)}{2+3}=3\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`The centre of mass of a uniform thin rod of length $L$ is`,
        difficulty: 1,
        skillTags: ["centre_of_mass", "uniform_rod"],
        choices: [
          L`at one end`,
          L`at its midpoint`,
          L`at $L/4$ from one end`,
          L`dependent on whether the rod is horizontal or vertical`,
        ],
        correctLetter: "B",
        rationales: {
          A: "A uniform rod has symmetric mass distribution, so no end is preferred.",
          C: "$L/4$ would break the left-right symmetry of a uniform rod.",
          D: "Changing orientation in a uniform gravitational field does not shift the mass distribution along the rod.",
        },
        hints: [
          "Uniform means equal mass per unit length.",
          "Use symmetry.",
          "The balancing point of a uniform rod is halfway along it.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The uniform rod is symmetric about its middle, so its centre of mass lies at the midpoint.",
          },
        ],
      },
      {
        questionLatex: L`For the particle system shown, the $x$-coordinate of the centre of mass is`,
        figure: comLineFigure,
        difficulty: 3,
        skillTags: ["centre_of_mass", "data_from_figure"],
        choices: [
          L`$3\text{ m}$`,
          L`$2\text{ m}$`,
          L`$4\text{ m}$`,
          L`$6\text{ m}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the average of the three positions, but it ignores the unequal masses.",
          B: "This uses the total mass incorrectly as if the numerator were $12$.",
          D: "This is the position of the heaviest particle, not the centre of mass.",
        },
        hints: [
          "Read both the masses and positions from the diagram.",
          "Multiply each position by its mass before adding.",
          "The total mass is $1+2+3=6\\text{ kg}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the weighted average for three particles.",
            math: "x_{\\text{cm}}=\\frac{1(0)+2(3)+3(6)}{1+2+3}=4\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`If no external force acts on a system of particles, the velocity of its centre of mass`,
        difficulty: 3,
        skillTags: ["centre_of_mass_motion", "momentum_conservation"],
        choices: [
          L`is always zero`,
          L`must increase with time`,
          L`must equal the velocity of the heaviest particle`,
          L`remains constant`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Zero external force means constant centre-of-mass velocity; the constant can be non-zero.",
          B: "An increase would require a non-zero net external force.",
          C: "The centre of mass depends on all particles, not only the heaviest one.",
        },
        hints: [
          "Relate net external force to total momentum.",
          "Constant total momentum means constant centre-of-mass velocity.",
          "$\\vec P=M\\vec v_{\\text{cm}}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "With zero net external force, total momentum is constant. Since $\\vec P=M\\vec v_{\\text{cm}}$, the centre-of-mass velocity is constant.",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Internal forces cannot change the motion of the centre of mass of a system. Reason (R): Internal forces occur in equal and opposite pairs within the system.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "internal_forces"],
        choices: [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The pairwise cancellation of internal forces is exactly why only external force changes centre-of-mass motion.",
          C: "The reason is true by Newton's third law for internal action-reaction pairs.",
          D: "The assertion is true: internal forces may change relative motion, but not the centre-of-mass motion.",
        },
        hints: [
          "Ask which forces can change the total momentum of the system.",
          "Internal forces cancel in pairs when the whole system is considered.",
          "Centre-of-mass acceleration obeys $M\\vec a_{\\text{cm}}=\\vec F_{\\text{ext}}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Internal forces cancel in the force sum for the complete system, so only the net external force determines centre-of-mass acceleration.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $4\text{ kg}$ particle is at $x=2\text{ m}$ and a $6\text{ kg}$ particle is at $x=7\text{ m}$. Find the centre of mass.`,
        difficulty: 2,
        skillTags: ["centre_of_mass", "two_particles"],
        parts: singlePart("a", "Find $x_{\\text{cm}}$.", 1),
        hints: [
          "Use the weighted average of position.",
          "The total mass is $10\\text{ kg}$.",
          "Compute $(4\\cdot2+6\\cdot7)/10$.",
        ],
        rubric: singleRubric("a", 1, "Finds $5\\text{ m}$ from the origin."),
        commonErrors: ["Taking the simple average of $2$ and $7$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$x_{\\text{cm}}=\\frac{4(2)+6(7)}{4+6}=\\frac{50}{10}=5\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $2\text{ kg}$ mass moves east at $3\text{ m s}^{-1}$ and a $3\text{ kg}$ mass moves west at $2\text{ m s}^{-1}$. Taking east as positive, find the velocity of the centre of mass.`,
        difficulty: 2,
        skillTags: ["centre_of_mass_velocity", "momentum"],
        parts: singlePart("a", "Find $v_{\\text{cm}}$.", 1),
        hints: [
          "Use signed velocities.",
          "West is negative in the chosen convention.",
          "$v_{\\text{cm}}=(m_1v_1+m_2v_2)/(m_1+m_2)$.",
        ],
        rubric: singleRubric("a", 1, "Finds $0\\text{ m s}^{-1}$."),
        commonErrors: ["Adding the speeds without signs."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v_{\\text{cm}}=\\frac{2(3)+3(-2)}{5}=0\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Particles of masses $1\text{ kg}$ and $3\text{ kg}$ are at $(0,0)$ and $(4\text{ m},3\text{ m})$ respectively.`,
        difficulty: 3,
        skillTags: ["centre_of_mass", "two_dimensions"],
        parts: [
          { letter: "a", promptMarkdown: "Find $x_{\\text{cm}}$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $y_{\\text{cm}}$.", points: 1 },
        ],
        hints: [
          "Apply the centre-of-mass formula separately to $x$ and $y$.",
          "The total mass is $4\\text{ kg}$.",
          "Only the $3\\text{ kg}$ mass has non-zero coordinates.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $x_{\\text{cm}}=3\\text{ m}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $y_{\\text{cm}}=9/4\\text{ m}$.",
            },
          ],
        },
        commonErrors: [
          "Using distance from origin instead of separate coordinates.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$x_{\\text{cm}}=\\frac{1(0)+3(4)}{4}=3\\text{ m}$.",
          },
          {
            part: "b",
            explanation:
              "$y_{\\text{cm}}=\\frac{1(0)+3(3)}{4}=\\frac94\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A body initially at rest explodes into two fragments. A $1\text{ kg}$ fragment moves east at $6\text{ m s}^{-1}$ and a $2\text{ kg}$ fragment moves west at $3\text{ m s}^{-1}$. External force during the explosion may be neglected.`,
        difficulty: 4,
        skillTags: [
          "centre_of_mass_motion",
          "explosion",
          "momentum_conservation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the total momentum after the explosion.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the centre-of-mass velocity after the explosion.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State what happens to the centre of mass after the explosion.",
            points: 1,
          },
        ],
        hints: [
          "Use east as positive.",
          "The total momentum is the sum of the two signed momenta.",
          "If total momentum is zero, the centre of mass remains at rest.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds total momentum $0$." },
            { part: "b", points: 1, description: "Finds $v_{\\text{cm}}=0$." },
            {
              part: "c",
              points: 1,
              description:
                "States that the centre of mass remains at the original position or moves with zero velocity.",
            },
          ],
        },
        commonErrors: [
          "Adding speeds instead of momenta.",
          "Ignoring the opposite direction of the second fragment.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$p_{\\text{total}}=1(6)+2(-3)=0$.",
          },
          {
            part: "b",
            explanation: "$v_{\\text{cm}}=p_{\\text{total}}/(1+2)=0$.",
          },
          {
            part: "c",
            explanation:
              "Since no external force acts and the centre of mass was initially at rest, it remains at rest at the original position.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A $40\text{ kg}$ student stands on a $160\text{ kg}$ platform at rest on a smooth horizontal floor. The student walks $3\text{ m}$ east relative to the platform. There is no external horizontal force on the student-platform system.`,
        difficulty: 5,
        skillTags: [
          "centre_of_mass_constraint",
          "relative_displacement",
          "smooth_floor",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the total mass of the system.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why the horizontal position of the centre of mass remains fixed.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If the platform shifts $x$ metres west, write the centre-of-mass equation.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the displacement of the platform.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Find the student's displacement relative to the ground.",
            points: 1,
          },
        ],
        hints: [
          "Let east be positive and let the platform displacement be $x$.",
          "The student's ground displacement is $x+3$ if the platform displacement is $x$.",
          "Use $40(x+3)+160x=0$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $200\\text{ kg}$." },
            {
              part: "b",
              points: 1,
              description:
                "States that no external horizontal force acts, so horizontal centre of mass remains fixed.",
            },
            {
              part: "c",
              points: 1,
              description: "Writes $40(x+3)+160x=0$ or equivalent.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds platform displacement $0.6\\text{ m}$ west.",
            },
            {
              part: "e",
              points: 1,
              description:
                "Finds student displacement $2.4\\text{ m}$ east relative to ground.",
            },
          ],
        },
        commonErrors: [
          "Treating the $3\\text{ m}$ as the student's ground displacement.",
          "Forgetting that the platform shifts in the opposite direction.",
        ],
        workedSolution: [
          { part: "a", explanation: "Total mass $=40+160=200\\text{ kg}$." },
          {
            part: "b",
            explanation:
              "With no external horizontal force, the horizontal coordinate of the centre of mass remains fixed.",
          },
          {
            part: "c",
            explanation:
              "Let platform displacement be $x$ east. Then the student displacement is $x+3$, so $40(x+3)+160x=0$.",
          },
          {
            part: "d",
            explanation:
              "$200x+120=0$, so $x=-0.6\\text{ m}$; the platform moves $0.6\\text{ m}$ west.",
          },
          {
            part: "e",
            explanation:
              "Student's ground displacement $=x+3=2.4\\text{ m}$ east.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Torque and Equilibrium of Rigid Bodies",
    subtopic:
      "Moment of force, rotational effect of force, and conditions for translational and rotational equilibrium.",
    mc: [
      {
        questionLatex: L`A force $F$ acts at a distance $r$ from a pivot and makes an angle $\theta$ with the position vector from the pivot. The magnitude of torque is`,
        difficulty: 1,
        skillTags: ["torque_definition"],
        choices: [L`$rF\cos\theta$`, L`$rF\sin\theta$`, L`$F/r$`, L`$r/F$`],
        correctLetter: "B",
        rationales: {
          A: "The cosine component is along the position vector and produces no turning effect.",
          C: "Torque is not force divided by distance.",
          D: "Torque increases with both force and perpendicular distance, not with $r/F$.",
        },
        hints: [
          "Torque uses the perpendicular component of force.",
          "The perpendicular component is $F\\sin\\theta$.",
          "$\\tau=rF\\sin\\theta$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The moment arm multiplies the perpendicular component of force.",
            math: "\\tau=rF\\sin\\theta",
          },
        ],
      },
      {
        questionLatex: L`A $20\text{ N}$ force acts perpendicular to a rod at a point $0.50\text{ m}$ from the pivot. The torque about the pivot is`,
        difficulty: 2,
        skillTags: ["torque", "perpendicular_force"],
        choices: [
          L`$40\text{ N m}$`,
          L`$20.5\text{ N m}$`,
          L`$10\text{ N m}$`,
          L`$0\text{ N m}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This divides by the distance instead of multiplying.",
          B: "Torque is a product here, not a sum.",
          D: "A perpendicular force has maximum turning effect, not zero torque.",
        },
        hints: [
          "For a perpendicular force, $\\sin90^\\circ=1$.",
          "Use $\\tau=rF$.",
          "Multiply $0.50$ by $20$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The force is perpendicular to the rod.",
            math: "\\tau=rF=0.50(20)=10\\text{ N m}",
          },
        ],
      },
      {
        questionLatex: L`For the balanced beam shown, the value of $W$ is`,
        figure: balanceBeamFigure,
        difficulty: 3,
        skillTags: ["torque_equilibrium", "data_from_figure"],
        choices: [
          L`$12\text{ N}$`,
          L`$20\text{ N}$`,
          L`$40\text{ N}$`,
          L`$30\text{ N}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This multiplies $20$ by $0.60$ but does not divide by the right arm.",
          B: "Equal forces would not balance because the lever arms are unequal.",
          C: "This reverses the lever-arm ratio.",
        },
        hints: [
          "For equilibrium, clockwise torque equals anticlockwise torque.",
          "The left torque is $20\\times0.60$.",
          "Set $20(0.60)=W(0.40)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Balance torques about the pivot.",
            math: "20(0.60)=W(0.40)\\Rightarrow W=30\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`A $10\text{ N}$ force at $0.20\text{ m}$ produces clockwise torque and a $5\text{ N}$ force at $0.60\text{ m}$ produces anticlockwise torque about the same pivot. The net torque is`,
        difficulty: 3,
        skillTags: ["net_torque", "sign_convention"],
        choices: [
          L`$1\text{ N m}$ anticlockwise`,
          L`$5\text{ N m}$ clockwise`,
          L`$2\text{ N m}$ anticlockwise`,
          L`$3\text{ N m}$ clockwise`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This adds the magnitudes and assigns the wrong direction.",
          C: "This is the clockwise torque alone.",
          D: "This is the anticlockwise torque alone, with the wrong direction.",
        },
        hints: [
          "Find each torque separately.",
          "Clockwise torque is $10\\times0.20$ and anticlockwise torque is $5\\times0.60$.",
          "Subtract opposite senses of rotation.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Clockwise torque is $2\\text{ N m}$ and anticlockwise torque is $3\\text{ N m}$.",
            math: "\\tau_{\\text{net}}=3-2=1\\text{ N m}\\text{ anticlockwise}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): For complete equilibrium of a rigid body, both net force and net torque must be zero. Reason (R): Zero net force prevents translational acceleration and zero net torque prevents angular acceleration.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "rigid_body_equilibrium"],
        choices: [
          L`Both A and R are true, but R does not explain A.`,
          L`Both A and R are true, and R correctly explains A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason directly connects the two equilibrium conditions to absence of translational and rotational acceleration.",
          C: "The reason is true: each condition controls a different type of acceleration.",
          D: "The assertion is true for rigid-body equilibrium.",
        },
        hints: [
          "A rigid body can translate and rotate.",
          "One condition controls translation; the other controls rotation.",
          "Check whether the reason explains why both conditions are needed.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Complete equilibrium requires zero translational acceleration and zero angular acceleration, so both net force and net torque must be zero.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $15\text{ N}$ force acts perpendicular to a spanner at a distance of $0.40\text{ m}$ from the nut. Find the torque.`,
        difficulty: 1,
        skillTags: ["torque", "perpendicular_force"],
        parts: singlePart("a", "Find the torque.", 1),
        hints: [
          "The force is perpendicular.",
          "Use $\\tau=rF$.",
          "Multiply $0.40$ by $15$.",
        ],
        rubric: singleRubric("a", 1, "Finds $6\\text{ N m}$."),
        commonErrors: ["Using $F/r$ instead of $rF$."],
        workedSolution: [
          { part: "a", explanation: "$\\tau=rF=0.40(15)=6\\text{ N m}$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $20\text{ N}$ force is applied at the end of a $0.50\text{ m}$ rod and makes $30^\circ$ with the rod. Find the torque about the other end.`,
        difficulty: 2,
        skillTags: ["torque", "angle_with_rod"],
        parts: singlePart("a", "Find the torque.", 1),
        hints: [
          "Only the perpendicular component of force produces torque.",
          "Use $\\tau=rF\\sin\\theta$.",
          "$\\sin30^\\circ=1/2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $5\\text{ N m}$."),
        commonErrors: [
          "Using $\\cos30^\\circ$ for the perpendicular component.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\tau=0.50(20)\\sin30^\\circ=10(1/2)=5\\text{ N m}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A uniform rod of length $2\text{ m}$ and weight $10\text{ N}$ is pivoted at one end. An upward force is applied at the other end to keep the rod horizontal.`,
        difficulty: 3,
        skillTags: ["torque_equilibrium", "uniform_rod"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Where does the rod's weight act?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the upward force required at the free end.",
            points: 1,
          },
        ],
        hints: [
          "For a uniform rod, weight acts at the centre of mass.",
          "Take moments about the pivot.",
          "The weight acts $1\\text{ m}$ from the pivot, while the upward force acts $2\\text{ m}$ from the pivot.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States that weight acts at the midpoint.",
            },
            { part: "b", points: 1, description: "Finds $5\\text{ N}$." },
          ],
        },
        commonErrors: [
          "Taking the weight at the free end instead of the midpoint.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The weight of a uniform rod acts at its midpoint, $1\\text{ m}$ from the pivot.",
          },
          {
            part: "b",
            explanation:
              "Taking torques about the pivot: $F(2)=10(1)$, so $F=5\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $300\text{ N}$ child sits $1.5\text{ m}$ to the left of the pivot of a seesaw. A $450\text{ N}$ child sits to the right. The seesaw is balanced and its own weight is negligible.`,
        difficulty: 4,
        skillTags: ["torque_equilibrium", "seesaw"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the distance of the $450\\text{ N}$ child from the pivot.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the upward reaction at the pivot.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State why balancing torques alone is not enough to find the pivot reaction.",
            points: 1,
          },
        ],
        hints: [
          "Balance clockwise and anticlockwise torques first.",
          "For vertical force equilibrium, total upward force equals total downward force.",
          "The pivot reaction has zero torque about the pivot but still appears in force balance.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds distance $1.0\\text{ m}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds pivot reaction $750\\text{ N}$ upward.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Explains that torque equilibrium and force equilibrium are separate conditions.",
            },
          ],
        },
        commonErrors: ["Forgetting the vertical force equilibrium condition."],
        workedSolution: [
          { part: "a", explanation: "$300(1.5)=450x$, so $x=1.0\\text{ m}$." },
          {
            part: "b",
            explanation:
              "Vertical force balance gives $R=300+450=750\\text{ N}$.",
          },
          {
            part: "c",
            explanation:
              "The pivot reaction passes through the pivot and gives no torque about it, so torque balance cannot determine it.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A horizontal beam $AB$ of length $2\text{ m}$ has weight $100\text{ N}$ acting at its centre. A $200\text{ N}$ load is placed $0.50\text{ m}$ from end $A$. The beam is supported at $A$ and $B$.`,
        difficulty: 5,
        skillTags: ["rigid_body_equilibrium", "support_reactions", "torque"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the vertical force-balance equation.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Take moments about $A$ and find the reaction at $B$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the reaction at $A$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why taking moments about $A$ is convenient.",
            points: 1,
          },
        ],
        hints: [
          "Let the reactions at $A$ and $B$ be $R_A$ and $R_B$.",
          "The beam's weight acts $1\\text{ m}$ from $A$.",
          "Moment about $A$: $R_B(2)=100(1)+200(0.5)$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $R_A+R_B=300\\text{ N}$.",
            },
            { part: "b", points: 1, description: "Finds $R_B=100\\text{ N}$." },
            { part: "c", points: 1, description: "Finds $R_A=200\\text{ N}$." },
            {
              part: "d",
              points: 1,
              description: "Explains that $R_A$ has zero moment about $A$.",
            },
          ],
        },
        commonErrors: [
          "Placing the beam's weight at an end instead of the centre.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Vertical equilibrium gives $R_A+R_B=100+200=300\\text{ N}$.",
          },
          {
            part: "b",
            explanation:
              "About $A$: $R_B(2)=100(1)+200(0.5)=200$, so $R_B=100\\text{ N}$.",
          },
          { part: "c", explanation: "$R_A=300-100=200\\text{ N}$." },
          {
            part: "d",
            explanation:
              "Taking moments about $A$ removes $R_A$ because its line of action passes through $A$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Angular Momentum and Its Conservation",
    subtopic:
      "Angular momentum of a particle and rigid body; relation between torque and angular momentum; conservation when external torque is zero.",
    mc: [
      {
        questionLatex: L`The angular momentum of a rigid body rotating about a fixed axis with moment of inertia $I$ and angular speed $\omega$ is`,
        difficulty: 1,
        skillTags: ["angular_momentum", "rigid_body"],
        choices: [L`$I/\omega$`, L`$\omega/I$`, L`$I\omega$`, L`$I\omega^2$`],
        correctLetter: "C",
        rationales: {
          A: "Angular momentum is proportional to angular speed, not inversely proportional.",
          B: "This has the wrong dependence on moment of inertia.",
          D: "$I\\omega^2$ is related to rotational kinetic energy only after a factor and not to angular momentum.",
        },
        hints: [
          "Compare with linear momentum $p=mv$.",
          "For rotation, $I$ plays the role of mass.",
          "$L=I\\omega$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a rigid body about a fixed axis, angular momentum is $L=I\\omega$.",
          },
        ],
      },
      {
        questionLatex: L`A $2\text{ kg}$ particle moves tangentially at $3\text{ m s}^{-1}$ in a circle of radius $4\text{ m}$. Its angular momentum about the centre is`,
        difficulty: 2,
        skillTags: ["angular_momentum", "particle"],
        choices: [
          L`$12\text{ kg m}^2\text{ s}^{-1}$`,
          L`$9\text{ kg m}^2\text{ s}^{-1}$`,
          L`$6\text{ kg m}^2\text{ s}^{-1}$`,
          L`$24\text{ kg m}^2\text{ s}^{-1}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This misses a factor of $2$ from the mass.",
          B: "This multiplies mass and speed but misses the radius.",
          C: "This uses only $mv$ and ignores the moment arm.",
        },
        hints: [
          "For tangential motion, $L=mvr$.",
          "All three quantities multiply.",
          "Compute $2\\times3\\times4$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since velocity is tangential, the angle between $\\vec r$ and $\\vec p$ is $90^\\circ$.",
            math: "L=mvr=2(3)(4)=24\\text{ kg m}^2\\text{ s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`Angular momentum of a system is conserved when the net external torque on the system is`,
        difficulty: 2,
        skillTags: ["angular_momentum_conservation", "external_torque"],
        choices: [
          L`zero`,
          L`maximum`,
          L`equal to angular momentum`,
          L`equal to moment of inertia`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A maximum torque would change angular momentum rapidly.",
          C: "Torque and angular momentum are different physical quantities.",
          D: "Moment of inertia is not a torque.",
        },
        hints: [
          "Use the rotational form of Newton's second law.",
          "Net external torque gives the rate of change of angular momentum.",
          "If $dL/dt=0$, $L$ is conserved.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $\\tau_{\\text{ext}}=dL/dt$, angular momentum is conserved when net external torque is zero.",
          },
        ],
      },
      {
        questionLatex: L`A skater rotating with arms extended pulls the arms inward so that the moment of inertia becomes half. If external torque is negligible, the angular speed becomes`,
        difficulty: 3,
        skillTags: [
          "angular_momentum_conservation",
          "moment_of_inertia_change",
        ],
        choices: [L`half`, L`twice`, L`unchanged`, L`four times`],
        correctLetter: "B",
        rationales: {
          A: "This would reduce angular momentum instead of conserving it.",
          C: "If $I$ changes and $L$ is conserved, $\\omega$ must change.",
          D: "The speed doubles, not quadruples, because $I$ is halved.",
        },
        hints: [
          "Use $I_1\\omega_1=I_2\\omega_2$.",
          "$I_2=I_1/2$.",
          "Solve for $\\omega_2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Conservation of angular momentum gives",
            math: "I_1\\omega_1=\\frac{I_1}{2}\\omega_2\\Rightarrow \\omega_2=2\\omega_1",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Angular momentum can remain conserved even when rotational kinetic energy changes. Reason (R): Angular momentum conservation requires zero net external torque, not conservation of mechanical energy.`,
        difficulty: 4,
        skillTags: ["assertion_reason", "angular_momentum_vs_energy"],
        choices: [
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`Both A and R are true, and R correctly explains A.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason explains why angular momentum and kinetic energy do not have to be conserved together.",
          B: "The reason is true; the conservation conditions are different.",
          D: "The assertion is true, for example when a skater changes moment of inertia or clay sticks to a rotating table.",
        },
        hints: [
          "Angular momentum and kinetic energy are controlled by different conservation conditions.",
          "Changing moment of inertia can change kinetic energy while preserving $L$.",
          "Check whether R explains why A can happen.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Zero external torque conserves angular momentum. Kinetic energy may still change if internal work or inelastic sticking is involved.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A wheel has moment of inertia $0.20\text{ kg m}^2$ and angular speed $10\text{ rad s}^{-1}$. Find its angular momentum.`,
        difficulty: 1,
        skillTags: ["angular_momentum", "rigid_body"],
        parts: singlePart("a", "Find $L$.", 1),
        hints: [
          "Use $L=I\\omega$.",
          "Multiply moment of inertia by angular speed.",
          "$0.20\\times10=2$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Finds $2\\text{ kg m}^2\\text{ s}^{-1}$.",
        ),
        commonErrors: ["Using $\\frac12I\\omega^2$ instead of $I\\omega$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$L=I\\omega=0.20(10)=2\\text{ kg m}^2\\text{ s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A constant external torque of $5\text{ N m}$ acts for $4\text{ s}$. Find the change in angular momentum.`,
        difficulty: 2,
        skillTags: ["torque_impulse", "angular_momentum_change"],
        parts: singlePart("a", "Find $\\Delta L$.", 1),
        hints: [
          "Torque is the rate of change of angular momentum.",
          "$\\Delta L=\\tau\\Delta t$ for constant torque.",
          "Multiply $5$ by $4$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Finds $20\\text{ kg m}^2\\text{ s}^{-1}$.",
        ),
        commonErrors: ["Dividing by time instead of multiplying by time."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta L=\\tau\\Delta t=5(4)=20\\text{ kg m}^2\\text{ s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A skater has moment of inertia $4\text{ kg m}^2$ and angular speed $3\text{ rad s}^{-1}$. The skater pulls the arms in so that the moment of inertia becomes $2\text{ kg m}^2$. External torque is negligible.`,
        difficulty: 3,
        skillTags: ["angular_momentum_conservation", "skater"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the initial angular momentum.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the final angular speed.",
            points: 1,
          },
        ],
        hints: [
          "Angular momentum is conserved.",
          "First calculate $I_1\\omega_1$.",
          "Set $I_1\\omega_1=I_2\\omega_2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $12\\text{ kg m}^2\\text{ s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $6\\text{ rad s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Assuming angular speed stays constant."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$L=I_1\\omega_1=4(3)=12\\text{ kg m}^2\\text{ s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "$2\\omega_2=12$, so $\\omega_2=6\\text{ rad s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A particle has position vector $\vec r=(2\hat i+3\hat j)\text{ m}$ and momentum $\vec p=(4\hat i+\hat j)\text{ kg m s}^{-1}$.`,
        difficulty: 4,
        skillTags: ["angular_momentum_vector", "cross_product"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the $z$-component of angular momentum.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the magnitude of angular momentum.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "State the direction.", points: 1 },
        ],
        hints: [
          "Use $\\vec L=\\vec r\\times\\vec p$.",
          "In the $xy$ plane, $L_z=xp_y-yp_x$.",
          "A negative $z$-component points along $-\\hat k$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $L_z=-10\\text{ kg m}^2\\text{ s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Finds magnitude $10\\text{ kg m}^2\\text{ s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "States direction $-\\hat k$.",
            },
          ],
        },
        commonErrors: ["Reversing $xp_y-yp_x$ and losing the direction."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$L_z=xp_y-yp_x=2(1)-3(4)=-10\\text{ kg m}^2\\text{ s}^{-1}$.",
          },
          {
            part: "b",
            explanation: "$|\\vec L|=10\\text{ kg m}^2\\text{ s}^{-1}$.",
          },
          {
            part: "c",
            explanation: "The negative sign means the direction is $-\\hat k$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A turntable of moment of inertia $0.50\text{ kg m}^2$ rotates freely at $8\text{ rad s}^{-1}$. A $0.50\text{ kg}$ piece of clay falls vertically and sticks at a distance $1.0\text{ m}$ from the axis. External torque about the axis is negligible.`,
        difficulty: 5,
        skillTags: [
          "angular_momentum_conservation",
          "inelastic_rotational_collision",
          "energy_change",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the final moment of inertia.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the final angular speed.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the initial rotational kinetic energy.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the final rotational kinetic energy.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Explain why angular momentum is conserved but kinetic energy is not.",
            points: 1,
          },
        ],
        hints: [
          "Treat the clay as a point mass after it sticks.",
          "Use conservation of angular momentum, not kinetic energy, for the sticking event.",
          "Compare $\\frac12I\\omega^2$ before and after.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $I_f=1.0\\text{ kg m}^2$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $\\omega_f=4\\text{ rad s}^{-1}$.",
            },
            { part: "c", points: 1, description: "Finds $16\\text{ J}$." },
            { part: "d", points: 1, description: "Finds $8\\text{ J}$." },
            {
              part: "e",
              points: 1,
              description:
                "Explains zero external torque but inelastic sticking/internal energy loss.",
            },
          ],
        },
        commonErrors: [
          "Conserving kinetic energy through an inelastic sticking process.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$I_f=0.50+mr^2=0.50+0.50(1)^2=1.0\\text{ kg m}^2$.",
          },
          {
            part: "b",
            explanation:
              "$0.50(8)=1.0\\omega_f$, so $\\omega_f=4\\text{ rad s}^{-1}$.",
          },
          { part: "c", explanation: "$K_i=\\frac12(0.50)(8^2)=16\\text{ J}$." },
          { part: "d", explanation: "$K_f=\\frac12(1.0)(4^2)=8\\text{ J}$." },
          {
            part: "e",
            explanation:
              "No external torque conserves angular momentum, but the clay sticking is inelastic, so kinetic energy decreases.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Rotational Kinematics and Dynamics",
    subtopic:
      "Angular displacement, angular velocity, angular acceleration, torque, and rotational motion equations.",
    mc: [
      {
        questionLatex: L`A wheel's angular velocity changes uniformly from $0$ to $20\text{ rad s}^{-1}$ in $5\text{ s}$. Its angular acceleration is`,
        difficulty: 2,
        skillTags: ["angular_acceleration", "rotational_kinematics"],
        choices: [
          L`$100\text{ rad s}^{-2}$`,
          L`$25\text{ rad s}^{-2}$`,
          L`$0.25\text{ rad s}^{-2}$`,
          L`$4\text{ rad s}^{-2}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This multiplies angular speed by time instead of dividing.",
          B: "This squares the time dependence incorrectly.",
          C: "This reverses the ratio.",
        },
        hints: [
          "Angular acceleration is change in angular velocity divided by time.",
          "$\\alpha=(\\omega-\\omega_0)/t$; here the initial angular velocity is zero.",
          "Compute $20/5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Uniform angular acceleration is",
            math: "\\alpha=\\frac{20-0}{5}=4\\text{ rad s}^{-2}",
          },
        ],
      },
      {
        questionLatex: L`A body starts from rest and rotates with constant angular acceleration $2\text{ rad s}^{-2}$ for $3\text{ s}$. The angular displacement is`,
        difficulty: 2,
        skillTags: ["angular_displacement", "constant_alpha"],
        choices: [
          L`$9\text{ rad}$`,
          L`$6\text{ rad}$`,
          L`$18\text{ rad}$`,
          L`$3\text{ rad}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses $\\alpha t$ and gives angular velocity, not displacement.",
          C: "This misses the factor $1/2$.",
          D: "This divides by time instead of using $t^2$.",
        },
        hints: [
          "Use the constant-acceleration rotational equation.",
          "Starting from rest means $\\omega_0=0$.",
          "$\\theta=\\frac12\\alpha t^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "From rest,",
            math: "\\theta=\\frac12(2)(3^2)=9\\text{ rad}",
          },
        ],
      },
      {
        questionLatex: L`The rotational analogue of $F=ma$ for a rigid body about a fixed axis is`,
        difficulty: 1,
        skillTags: ["torque_dynamics", "linear_rotational_analogy"],
        choices: [
          L`$\tau=I\omega$`,
          L`$\tau=I\alpha$`,
          L`$L=I\alpha$`,
          L`$K=I\omega$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This has angular speed instead of angular acceleration.",
          C: "Angular momentum is $I\\omega$, not $I\\alpha$.",
          D: "Rotational kinetic energy is $\\frac12I\\omega^2$.",
        },
        hints: [
          "Force corresponds to torque.",
          "Mass corresponds to moment of inertia.",
          "Linear acceleration corresponds to angular acceleration.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The rotational equation of motion is $\\tau=I\\alpha$.",
          },
        ],
      },
      {
        questionLatex: L`The angular displacement from $0$ to $10\text{ s}$ in the graph is`,
        figure: omegaTimeGraphFigure,
        difficulty: 4,
        skillTags: ["omega_time_graph", "angular_displacement"],
        choices: [
          L`$48\text{ rad}$`,
          L`$120\text{ rad}$`,
          L`$72\text{ rad}$`,
          L`$24\text{ rad}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This misses one of the triangular portions of the area.",
          B: "This multiplies the maximum angular speed by the full time, as if the graph were rectangular throughout.",
          D: "This counts only the first triangular area.",
        },
        hints: [
          "Angular displacement is area under the $\\omega$-$t$ graph.",
          "Split the graph into a triangle, a rectangle, and a triangle.",
          "$\\frac12(4)(12)+(2)(12)+\\frac12(4)(12)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Area under the graph gives angular displacement.",
            math: "\\theta=24+24+24=72\\text{ rad}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Equations of uniformly accelerated rotational motion have the same form as equations of uniformly accelerated linear motion. Reason (R): For constant angular acceleration, integrating $\alpha=d\omega/dt$ gives equations analogous to integrating $a=dv/dt$ in linear motion.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "rotational_kinematics"],
        choices: [
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
          L`Both A and R are true, and R correctly explains A.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The reason directly identifies the parallel integration step, so it does explain the same equation form.",
          B: "The reason is true by definition of angular acceleration.",
          C: "The assertion is true for constant angular acceleration.",
        },
        hints: [
          "Compare $v,u,a,s$ with $\\omega,\\omega_0,\\alpha,\\theta$.",
          "The same integration step connects velocity and acceleration in both cases when acceleration is constant.",
          "Decide whether the reason explains the analogy.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For constant angular acceleration, the equations mirror linear kinematics with $s\\to\\theta$, $v\\to\\omega$, and $a\\to\\alpha$.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`A flywheel has moment of inertia $3.0\text{ kg m}^2$. A constant torque of $12\text{ N m}$ acts on it. Its angular acceleration is`,
        difficulty: 2,
        skillTags: ["torque", "angular_acceleration"],
        choices: [
          L`$4\text{ rad s}^{-2}$`,
          L`$9\text{ rad s}^{-2}$`,
          L`$15\text{ rad s}^{-2}$`,
          L`$36\text{ rad s}^{-2}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This subtracts the numbers instead of using $\tau=I\alpha$.`,
          C: L`This adds torque and moment of inertia numerically.`,
          D: L`This multiplies instead of dividing.`,
        },
        hints: [
          L`Rotational form of Newton's second law is $\tau=I\alpha$.`,
          L`Solve for $\alpha$.`,
          L`Divide $12$ by $3$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use rotational dynamics.",
            math: L`\alpha=\frac{\tau}{I}=\frac{12}{3}=4\text{ rad s}^{-2}`,
          },
        ],
      },
      {
        questionLatex: L`A wheel starts from rest. A constant torque gives it angular acceleration $4\text{ rad s}^{-2}$. Its angular speed after $5\text{ s}$ is`,
        difficulty: 2,
        skillTags: ["rotational_kinematics", "angular_acceleration"],
        choices: [
          L`$20\text{ rad s}^{-1}$`,
          L`$9\text{ rad s}^{-1}$`,
          L`$1.25\text{ rad s}^{-1}$`,
          L`$10\text{ rad s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This adds $4$ and $5$ instead of multiplying.`,
          C: L`This divides time by angular acceleration.`,
          D: L`This halves the correct change in angular speed.`,
        },
        hints: [
          L`Use $\omega=\omega_0+\alpha t$.`,
          L`The wheel starts from rest.`,
          L`Compute $4\times5$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The angular speed is",
            math: L`\omega=0+(4)(5)=20\text{ rad s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A constant torque of $5\text{ N m}$ turns a body through $4\text{ rad}$. The work done by the torque is`,
        difficulty: 3,
        skillTags: ["work_by_torque", "rotational_work"],
        choices: [
          L`$20\text{ J}$`,
          L`$1.25\text{ J}$`,
          L`$9\text{ J}$`,
          L`$40\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This divides instead of multiplying.`,
          C: L`This adds the two quantities.`,
          D: L`This inserts an unnecessary factor of $2$.`,
        },
        hints: [
          L`Rotational work is analogous to force times displacement.`,
          L`Use $W=\tau\theta$.`,
          L`Radian is dimensionless in the energy unit.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Work done is",
            math: L`W=\tau\theta=5(4)=20\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`A rotating student pulls in the arms so that the moment of inertia becomes one-fourth of the original value. If no external torque acts, the angular speed becomes`,
        difficulty: 3,
        skillTags: ["angular_momentum_conservation", "moment_of_inertia"],
        choices: [L`four times`, L`one-fourth`, L`two times`, L`unchanged`],
        correctLetter: "A",
        rationales: {
          B: L`This reverses the angular momentum relation.`,
          C: L`This would correspond to moment of inertia becoming half.`,
          D: L`Angular speed changes when $I$ changes and angular momentum is conserved.`,
        },
        hints: [
          L`With no external torque, $I\omega$ is constant.`,
          L`If $I$ is reduced, $\omega$ must increase.`,
          L`A factor $1/4$ in $I$ gives a factor $4$ in $\omega$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Conserve angular momentum.",
            math: L`I_1\omega_1=I_2\omega_2=\frac{I_1}{4}\omega_2\Rightarrow\omega_2=4\omega_1`,
          },
        ],
      },
      {
        questionLatex: L`A solid disc of mass $2\text{ kg}$ and radius $0.50\text{ m}$ rotates about its symmetry axis with angular speed $10\text{ rad s}^{-1}$. Its rotational kinetic energy is`,
        difficulty: 4,
        skillTags: ["rotational_kinetic_energy", "moment_of_inertia"],
        choices: [
          L`$12.5\text{ J}$`,
          L`$25\text{ J}$`,
          L`$50\text{ J}$`,
          L`$6.25\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This misses the factor $1/2$ in kinetic energy.`,
          C: L`This also treats the disc as a ring.`,
          D: L`This halves the correct value again.`,
        },
        hints: [
          L`For a solid disc, $I=\frac12MR^2$.`,
          L`Then use $K=\frac12I\omega^2$.`,
          L`Compute $I=0.25\text{ kg m}^2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the moment of inertia.",
            math: L`I=\frac12(2)(0.50)^2=0.25\text{ kg m}^2`,
          },
          {
            step: 2,
            explanation: "Find rotational kinetic energy.",
            math: L`K=\frac12(0.25)(10)^2=12.5\text{ J}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A torque of $10\text{ N m}$ acts on a body of moment of inertia $2\text{ kg m}^2$. Find the angular acceleration.`,
        difficulty: 1,
        skillTags: ["torque_dynamics"],
        parts: singlePart("a", "Find $\\alpha$.", 1),
        hints: [
          "Use $\\tau=I\\alpha$.",
          "Solve for $\\alpha$.",
          "Divide $10$ by $2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $5\\text{ rad s}^{-2}$."),
        commonErrors: ["Multiplying torque and moment of inertia."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\alpha=\\tau/I=10/2=5\\text{ rad s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A body rotates with constant angular speed $10\text{ rad s}^{-1}$ for $4\text{ s}$. Find the angular displacement.`,
        difficulty: 1,
        skillTags: ["angular_displacement", "uniform_rotation"],
        parts: singlePart("a", "Find $\\theta$.", 1),
        hints: [
          "For constant angular speed, angular displacement is angular speed times time.",
          "Use $\\theta=\\omega t$.",
          "Multiply $10$ by $4$.",
        ],
        rubric: singleRubric("a", 1, "Finds $40\\text{ rad}$."),
        commonErrors: ["Using linear displacement units."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\theta=\\omega t=10(4)=40\\text{ rad}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A wheel has initial angular velocity $5\text{ rad s}^{-1}$ and constant angular acceleration $2\text{ rad s}^{-2}$ for $3\text{ s}$.`,
        difficulty: 3,
        skillTags: ["rotational_kinematics", "constant_alpha"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the final angular velocity.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the angular displacement.",
            points: 1,
          },
        ],
        hints: [
          "Use the constant angular acceleration equations.",
          "$\\omega=\\omega_0+\\alpha t$.",
          "$\\theta=\\omega_0t+\\frac12\\alpha t^2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $11\\text{ rad s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $24\\text{ rad}$." },
          ],
        },
        commonErrors: [
          "Using the initial angular velocity as if the wheel started from rest.",
        ],
        workedSolution: [
          { part: "a", explanation: "$\\omega=5+2(3)=11\\text{ rad s}^{-1}$." },
          {
            part: "b",
            explanation: "$\\theta=5(3)+\\frac12(2)(3^2)=15+9=24\\text{ rad}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A flywheel of moment of inertia $2\text{ kg m}^2$ starts from rest. A constant torque of $6\text{ N m}$ acts on it for $5\text{ s}$.`,
        difficulty: 4,
        skillTags: [
          "torque_dynamics",
          "rotational_kinematics",
          "rotational_energy",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the angular acceleration.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the angular velocity after $5\\text{ s}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the angular displacement in this time.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the rotational kinetic energy after $5\\text{ s}$.",
            points: 1,
          },
        ],
        hints: [
          "First use $\\tau=I\\alpha$.",
          "Then use constant angular acceleration equations.",
          "Finally use $K=\\frac12I\\omega^2$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $3\\text{ rad s}^{-2}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $15\\text{ rad s}^{-1}$.",
            },
            { part: "c", points: 1, description: "Finds $37.5\\text{ rad}$." },
            { part: "d", points: 1, description: "Finds $225\\text{ J}$." },
          ],
        },
        commonErrors: [
          "Stopping after angular acceleration without using it in the kinematics.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\alpha=\\tau/I=6/2=3\\text{ rad s}^{-2}$.",
          },
          { part: "b", explanation: "$\\omega=0+3(5)=15\\text{ rad s}^{-1}$." },
          {
            part: "c",
            explanation: "$\\theta=\\frac12(3)(5^2)=37.5\\text{ rad}$.",
          },
          { part: "d", explanation: "$K=\\frac12(2)(15^2)=225\\text{ J}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A motor changes its speed uniformly from $300\text{ rpm}$ to $900\text{ rpm}$ in $10\text{ s}$. Use $1\text{ revolution}=2\pi\text{ rad}$.`,
        difficulty: 5,
        skillTags: [
          "rpm_conversion",
          "rotational_kinematics",
          "angular_displacement",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Convert the initial angular speed to rad/s.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Convert the final angular speed to rad/s.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the angular acceleration.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the angular displacement in $10\\text{ s}$.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown: "Find the number of revolutions made in this time.",
            points: 1,
          },
        ],
        hints: [
          "Convert rpm to revolutions per second, then multiply by $2\\pi$.",
          "For uniform angular acceleration, average angular speed is $(\\omega_i+\\omega_f)/2$.",
          "Divide angular displacement by $2\\pi$ to get revolutions.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $10\\pi\\text{ rad s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $30\\pi\\text{ rad s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $2\\pi\\text{ rad s}^{-2}$.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds $200\\pi\\text{ rad}$.",
            },
            { part: "e", points: 1, description: "Finds $100$ revolutions." },
          ],
        },
        commonErrors: [
          "Forgetting to divide rpm by $60$ before converting to rad/s.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$300\\text{ rpm}=5\\text{ rps}=10\\pi\\text{ rad s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "$900\\text{ rpm}=15\\text{ rps}=30\\pi\\text{ rad s}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "$\\alpha=(30\\pi-10\\pi)/10=2\\pi\\text{ rad s}^{-2}$.",
          },
          {
            part: "d",
            explanation:
              "$\\theta=\\frac{10\\pi+30\\pi}{2}(10)=200\\pi\\text{ rad}$.",
          },
          {
            part: "e",
            explanation: "Number of revolutions $=200\\pi/(2\\pi)=100$.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A pulley has moment of inertia $0.40\text{ kg m}^2$. A torque of $2.0\text{ N m}$ acts on it from rest for $3\text{ s}$.`,
        difficulty: 3,
        skillTags: ["torque", "rotational_kinematics"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find its angular speed after $3\text{ s}$.`,
            points: 1,
          },
        ],
        hints: [
          L`First find angular acceleration.`,
          L`Use $\alpha=\tau/I$.`,
          L`Then use $\omega=\alpha t$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $15\text{ rad s}^{-1}$.`,
            },
          ],
        },
        commonErrors: [L`Stopping after finding angular acceleration only.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\alpha=2.0/0.40=5\text{ rad s}^{-2}$, so $\omega=5(3)=15\text{ rad s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A constant torque of $6\text{ N m}$ acts on a rotor initially at rest. The rotor turns through $8\text{ rad}$ while the torque acts.`,
        difficulty: 3,
        skillTags: ["work_by_torque", "rotational_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the work done by the torque.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`If the rotor's moment of inertia is $3\text{ kg m}^2$, find its final angular speed.`,
            points: 2,
          },
        ],
        hints: [
          L`Use $W=\tau\theta$.`,
          L`The work becomes rotational kinetic energy.`,
          L`Set $W=\frac12I\omega^2$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds $48\text{ J}$.` },
            {
              part: "b",
              points: 2,
              description: L`Finds $\omega=4\sqrt2\text{ rad s}^{-1}$.`,
            },
          ],
        },
        commonErrors: [
          L`Using linear kinetic energy instead of rotational kinetic energy.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`W=\tau\theta=6(8)=48\text{ J}.` },
          {
            part: "b",
            explanation: L`$48=\frac12(3)\omega^2$, so $\omega^2=32$ and $\omega=4\sqrt2\text{ rad s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A disc of moment of inertia $2\text{ kg m}^2$ spinning at $6\text{ rad s}^{-1}$ is coupled to a coaxial disc of moment of inertia $1\text{ kg m}^2$ initially at rest. No external torque acts.`,
        difficulty: 4,
        skillTags: ["angular_momentum_conservation", "energy_loss"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the common angular speed after coupling.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the rotational kinetic energy lost.`,
            points: 2,
          },
        ],
        hints: [
          L`Angular momentum is conserved, not kinetic energy.`,
          L`Use $I_1\omega_1=(I_1+I_2)\omega$.`,
          L`Compare rotational kinetic energies before and after.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $4\text{ rad s}^{-1}$.`,
            },
            {
              part: "b",
              points: 2,
              description: L`Finds energy loss $12\text{ J}$.`,
            },
          ],
        },
        commonErrors: [
          L`Conserving rotational kinetic energy during coupling.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$2(6)=(2+1)\omega$, so $\omega=4\text{ rad s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$K_i=\frac12(2)(6^2)=36\text{ J}$ and $K_f=\frac12(3)(4^2)=24\text{ J}$. Loss $=12\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A wheel of moment of inertia $1.5\text{ kg m}^2$ has angular speed $20\text{ rad s}^{-1}$. A brake applies a constant retarding torque of $6\text{ N m}$.`,
        difficulty: 4,
        skillTags: [
          "rotational_dynamics",
          "angular_deceleration",
          "rotational_work",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the angular deceleration.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the time taken to stop.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Find the angular displacement before stopping.`,
            points: 2,
          },
        ],
        hints: [
          L`The retarding angular acceleration has magnitude $\tau/I$.`,
          L`Use constant angular acceleration equations.`,
          L`You may also use work-energy for part (c).`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $4\text{ rad s}^{-2}$.`,
            },
            { part: "b", points: 1, description: L`Finds $5\text{ s}$.` },
            { part: "c", points: 2, description: L`Finds $50\text{ rad}$.` },
          ],
        },
        commonErrors: [
          L`Using positive acceleration while the wheel is slowing down.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`\alpha=-\tau/I=-6/1.5=-4\text{ rad s}^{-2}.`,
          },
          { part: "b", explanation: L`$0=20-4t$, so $t=5\text{ s}$.` },
          {
            part: "c",
            explanation: L`$0^2=20^2+2(-4)\theta$, so $\theta=50\text{ rad}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A rotor initially at rest is acted on by a constant torque for $4\text{ s}$, then the torque is removed and it continues with constant angular speed for the next $3\text{ s}$. During the first part its angular acceleration is $5\text{ rad s}^{-2}$.`,
        difficulty: 5,
        skillTags: [
          "rotational_kinematics",
          "angular_displacement",
          "multi_interval_motion",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the angular speed at $t=4\text{ s}$.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the angular displacement in the first $4\text{ s}$.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Find the angular displacement in the next $3\text{ s}$.`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Find the average angular speed over the full $7\text{ s}$.`,
            points: 1,
          },
        ],
        hints: [
          L`Treat the accelerated and constant-speed parts separately.`,
          L`For the first part use $\theta=\frac12\alpha t^2$.`,
          L`Average angular speed equals total angular displacement divided by total time.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $20\text{ rad s}^{-1}$.`,
            },
            { part: "b", points: 1, description: L`Finds $40\text{ rad}$.` },
            { part: "c", points: 1, description: L`Finds $60\text{ rad}$.` },
            {
              part: "d",
              points: 1,
              description: L`Finds $100/7\text{ rad s}^{-1}$.`,
            },
          ],
        },
        commonErrors: [L`Applying the acceleration for all $7\text{ s}$.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`\omega=\alpha t=5(4)=20\text{ rad s}^{-1}.`,
          },
          {
            part: "b",
            explanation: L`\theta_1=\frac12(5)(4^2)=40\text{ rad}.`,
          },
          { part: "c", explanation: L`\theta_2=\omega t=20(3)=60\text{ rad}.` },
          {
            part: "d",
            explanation: L`\bar\omega=(40+60)/7=100/7\text{ rad s}^{-1}.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Moment of Inertia and Radius of Gyration",
    subtopic:
      "Moment of inertia of simple bodies and point masses, radius of gyration, and rotational kinetic energy.",
    mc: [
      {
        questionLatex: L`A ring and a solid disc have the same mass $M$ and radius $R$. About their symmetry axes, which has the larger moment of inertia?`,
        difficulty: 2,
        skillTags: ["moment_of_inertia", "standard_bodies"],
        choices: [
          L`the ring`,
          L`the solid disc`,
          L`both are equal`,
          L`depends on angular speed`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The disc has more mass closer to the axis, so its moment of inertia is smaller.",
          C: "They have the same $M$ and $R$, but different mass distributions.",
          D: "Moment of inertia depends on mass distribution about the axis, not angular speed.",
        },
        hints: [
          "Moment of inertia depends on how far the mass is from the axis.",
          "For a ring, all mass is at radius $R$.",
          "$I_{\\text{ring}}=MR^2$ and $I_{\\text{disc}}=\\frac12MR^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A ring has all its mass at the outer radius, so $I=MR^2$, larger than the disc's $\\frac12MR^2$.",
          },
        ],
      },
      {
        questionLatex: L`If a body of mass $M$ has moment of inertia $I$ about an axis, its radius of gyration $K$ is given by`,
        difficulty: 1,
        skillTags: ["radius_of_gyration"],
        choices: [
          L`$K=IM$`,
          L`$K=\sqrt{I/M}$`,
          L`$K=I/M^2$`,
          L`$K=\sqrt{M/I}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This does not follow from $I=MK^2$ and has wrong dimensions.",
          C: "This has wrong dimensions for length.",
          D: "This is the reciprocal relation.",
        },
        hints: [
          "Start from the definition $I=MK^2$.",
          "Solve for $K$.",
          "Take the square root after dividing by $M$.",
        ],
        solution: [{ step: 1, explanation: "From $I=MK^2$, $K=\\sqrt{I/M}$." }],
      },
      {
        questionLatex: L`The moment of inertia of a uniform rod of mass $M$ and length $L$ about an axis through its centre and perpendicular to its length is`,
        difficulty: 2,
        skillTags: ["moment_of_inertia", "uniform_rod"],
        choices: [
          L`$ML^2$`,
          L`$\frac{ML^2}{3}$`,
          L`$\frac{ML^2}{12}$`,
          L`$\frac{MR^2}{2}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This would place all mass at distance $L$ from the axis, which is not the rod's distribution.",
          B: "This is the standard result for a uniform rod about an end, not about its centre.",
          D: "This is for a solid disc about its symmetry axis.",
        },
        hints: [
          "Identify the body and the axis carefully.",
          "Centre axis and end axis for a rod have different standard results.",
          "About the centre: $I=ML^2/12$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a uniform rod about its centre perpendicular to length, $I=ML^2/12$.",
          },
        ],
      },
      {
        questionLatex: L`For the point masses shown, the moment of inertia about the fixed axis through $O$ is`,
        figure: pointMassInertiaFigure,
        difficulty: 3,
        skillTags: ["moment_of_inertia", "point_masses", "data_from_figure"],
        choices: [
          L`$5\text{ kg m}^2$`,
          L`$3\text{ kg m}^2$`,
          L`$6\text{ kg m}^2$`,
          L`$9\text{ kg m}^2$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This adds $mr$ terms instead of $mr^2$ terms.",
          B: "This adds the masses and distances without squaring distance.",
          C: "This treats both masses as if they were at $1\\text{ m}$ or misses the larger radius contribution.",
        },
        hints: [
          "For point masses, use $I=\\sum mr^2$.",
          "Read the two distances from the diagram.",
          "$I=1(1^2)+2(2^2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Moment of inertia of point masses is the sum of $mr^2$.",
            math: "I=1(1^2)+2(2^2)=1+8=9\\text{ kg m}^2",
          },
        ],
      },
      {
        questionLatex: L`The rotational kinetic energy of a rigid body rotating about a fixed axis is`,
        difficulty: 2,
        skillTags: ["rotational_kinetic_energy"],
        choices: [
          L`$\frac12I\omega^2$`,
          L`$I\omega$`,
          L`$\frac12M v^2$`,
          L`$I\alpha$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is angular momentum, not kinetic energy.",
          C: "This is translational kinetic energy of a mass moving with speed $v$.",
          D: "This is torque, not energy.",
        },
        hints: [
          "Compare with translational kinetic energy $\\frac12mv^2$.",
          "For rotation, $I$ replaces $m$ and $\\omega$ replaces $v$.",
          "Do not confuse energy with angular momentum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rotational kinetic energy is $K=\\frac12I\\omega^2$.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`The moment of inertia of a uniform rod of mass $M$ and length $L$ about an axis through one end perpendicular to the rod is`,
        difficulty: 2,
        skillTags: ["moment_of_inertia", "parallel_axis_theorem"],
        choices: [
          L`$\frac{ML^2}{3}$`,
          L`$\frac{ML^2}{12}$`,
          L`$ML^2$`,
          L`$\frac{ML^2}{2}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is the value about the centre, not the end.`,
          C: L`This is too large by a factor of $3$.`,
          D: L`This is not the standard rod result.`,
        },
        hints: [
          L`Use the parallel-axis theorem from the centre.`,
          L`$I_{\text{cm}}=ML^2/12$.`,
          L`Add $M(L/2)^2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use parallel-axis theorem.",
            math: L`I=\frac{ML^2}{12}+M\left(\frac L2\right)^2=\frac{ML^2}{3}`,
          },
        ],
      },
      {
        questionLatex: L`The radius of gyration of a thin ring of radius $R$ about a diameter is`,
        difficulty: 3,
        skillTags: ["radius_of_gyration", "perpendicular_axis_theorem"],
        choices: [L`$\frac{R}{\sqrt2}$`, L`$R$`, L`$\sqrt2R$`, L`$\frac R2$`],
        correctLetter: "A",
        rationales: {
          B: L`$R$ is the radius of gyration about the symmetry axis.`,
          C: L`This is larger than the actual ring radius.`,
          D: L`This would mean $I=MR^2/4$, not the diameter value.`,
        },
        hints: [
          L`For a ring, $I_z=MR^2$.`,
          L`By symmetry, $I_x=I_y$.`,
          L`Use $I_z=I_x+I_y$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The diameter moment is $MR^2/2$.",
            math: L`Mk^2=\frac12MR^2\Rightarrow k=\frac{R}{\sqrt2}`,
          },
        ],
      },
      {
        questionLatex: L`Two equal point masses $m$ are fixed at distances $a$ and $2a$ from an axis. The radius of gyration of the system about the axis is`,
        difficulty: 3,
        skillTags: ["point_mass_mi", "radius_of_gyration"],
        choices: [
          L`$a\sqrt{\frac52}$`,
          L`$\sqrt5a$`,
          L`$\frac{3a}{2}$`,
          L`$\frac{a}{\sqrt2}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This forgets that total mass is $2m$.`,
          C: L`This averages distances instead of moment of inertia.`,
          D: L`This uses only the nearer mass.`,
        },
        hints: [
          L`Find $I=m a^2+m(2a)^2$.`,
          L`Total mass is $2m$.`,
          L`Use $I=M_{\text{total}}k^2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute radius of gyration.",
            math: L`I=5ma^2=2m k^2\Rightarrow k=a\sqrt{5/2}`,
          },
        ],
      },
      {
        questionLatex: L`A thin ring and a solid disc, each of mass $M$ and radius $R$, are joined coaxially. The total moment of inertia about their common axis is`,
        difficulty: 3,
        skillTags: ["composite_moment_of_inertia", "disc_ring"],
        choices: [L`$\frac32MR^2$`, L`$\frac12MR^2$`, L`$MR^2$`, L`$2MR^2$`],
        correctLetter: "A",
        rationales: {
          B: L`This includes only the disc.`,
          C: L`This includes only the ring.`,
          D: L`This treats both as rings.`,
        },
        hints: [
          L`Moments of inertia add for bodies rotating about the same axis.`,
          L`Ring: $MR^2$. Disc: $MR^2/2$.`,
          L`Add the two.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the two moments.",
            math: L`I=MR^2+\frac12MR^2=\frac32MR^2`,
          },
        ],
      },
      {
        questionLatex: L`For the same rigid body rotating with the same angular speed, if its radius of gyration about a new axis is half of the old value, its rotational kinetic energy becomes`,
        difficulty: 4,
        skillTags: ["radius_of_gyration", "rotational_kinetic_energy"],
        choices: [L`one-fourth`, L`half`, L`double`, L`four times`],
        correctLetter: "A",
        rationales: {
          B: L`Kinetic energy depends on $k^2$, not directly on $k$.`,
          C: L`Reducing $k$ reduces $I$ and hence $K$ for the same $\omega$.`,
          D: L`This reverses the dependence.`,
        },
        hints: [
          L`$I=Mk^2$.`,
          L`For the same $\omega$, $K=\frac12I\omega^2$.`,
          L`Halving $k$ makes $I$ one-fourth.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the $k^2$ dependence.",
            math: L`K\propto I\propto k^2\Rightarrow K'=(1/2)^2K=K/4`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A solid disc has mass $2\text{ kg}$ and radius $0.50\text{ m}$. Find its moment of inertia about its symmetry axis.`,
        difficulty: 2,
        skillTags: ["moment_of_inertia", "solid_disc"],
        parts: singlePart("a", "Find $I$.", 1),
        hints: [
          "For a solid disc about its symmetry axis, $I=\\frac12MR^2$.",
          "Square the radius before multiplying.",
          "$0.50^2=0.25$.",
        ],
        rubric: singleRubric("a", 1, "Finds $0.25\\text{ kg m}^2$."),
        commonErrors: ["Using $MR^2$ for a disc instead of a ring."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$I=\\frac12MR^2=\\frac12(2)(0.50)^2=0.25\\text{ kg m}^2$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A body of mass $2\text{ kg}$ has moment of inertia $8\text{ kg m}^2$ about an axis. Find its radius of gyration.`,
        difficulty: 2,
        skillTags: ["radius_of_gyration"],
        parts: singlePart("a", "Find $K$.", 1),
        hints: [
          "Use $I=MK^2$.",
          "Divide moment of inertia by mass.",
          "Take the square root.",
        ],
        rubric: singleRubric("a", 1, "Finds $2\\text{ m}$."),
        commonErrors: ["Forgetting the square root."],
        workedSolution: [
          {
            part: "a",
            explanation: "$K=\\sqrt{I/M}=\\sqrt{8/2}=2\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A uniform rod has mass $3\text{ kg}$ and length $2\text{ m}$.`,
        difficulty: 3,
        skillTags: ["moment_of_inertia", "uniform_rod", "parallel_axis_result"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find its moment of inertia about an axis through its centre and perpendicular to its length.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find its moment of inertia about a parallel axis through one end.",
            points: 1,
          },
        ],
        hints: [
          "Use the standard centre-axis result for a rod.",
          "Use the end-axis standard result or the parallel-axis theorem.",
          "$I_{\\text{centre}}=ML^2/12$ and $I_{\\text{end}}=ML^2/3$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $1\\text{ kg m}^2$." },
            { part: "b", points: 1, description: "Finds $4\\text{ kg m}^2$." },
          ],
        },
        commonErrors: ["Interchanging centre-axis and end-axis formulae."],
        workedSolution: [
          {
            part: "a",
            explanation: "$I_c=ML^2/12=3(2^2)/12=1\\text{ kg m}^2$.",
          },
          {
            part: "b",
            explanation: "$I_{\\text{end}}=ML^2/3=3(2^2)/3=4\\text{ kg m}^2$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two point masses, $2\text{ kg}$ at $0.50\text{ m}$ and $1\text{ kg}$ at $1.0\text{ m}$, are fixed to a light rod rotating about an axis through one end. A constant torque of $3\text{ N m}$ acts on the system from rest for $4\text{ s}$.`,
        difficulty: 4,
        skillTags: [
          "moment_of_inertia",
          "torque_dynamics",
          "rotational_kinematics",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the total moment of inertia.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the angular acceleration.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the angular speed after $4\\text{ s}$.",
            points: 1,
          },
        ],
        hints: [
          "For point masses, add $mr^2$.",
          "Then use $\\tau=I\\alpha$.",
          "From rest, $\\omega=\\alpha t$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1.5\\text{ kg m}^2$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $2\\text{ rad s}^{-2}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $8\\text{ rad s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Adding $mr$ instead of $mr^2$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$I=2(0.50)^2+1(1.0)^2=0.5+1=1.5\\text{ kg m}^2$.",
          },
          {
            part: "b",
            explanation: "$\\alpha=\\tau/I=3/1.5=2\\text{ rad s}^{-2}$.",
          },
          {
            part: "c",
            explanation: "$\\omega=\\alpha t=2(4)=8\\text{ rad s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A uniform disc turntable of mass $3\text{ kg}$ and radius $0.40\text{ m}$ carries a $1\text{ kg}$ small object stuck at its rim. The system rotates about the symmetry axis of the disc. A torque of $0.80\text{ N m}$ is then applied.`,
        difficulty: 5,
        skillTags: [
          "moment_of_inertia",
          "radius_of_gyration",
          "rotational_dynamics",
          "rotational_energy",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the moment of inertia of the disc alone.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the total moment of inertia of the disc-object system.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the radius of gyration of the whole system.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the angular acceleration produced by the torque.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Find the rotational kinetic energy when $\\omega=5\\text{ rad s}^{-1}$.",
            points: 1,
          },
        ],
        hints: [
          "Use $I_{\\text{disc}}=\\frac12MR^2$ and $I_{\\text{object}}=mr^2$.",
          "For radius of gyration, use the total mass of disc plus object.",
          "Use $\\alpha=\\tau/I$ and $K=\\frac12I\\omega^2$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.24\\text{ kg m}^2$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $0.40\\text{ kg m}^2$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Finds $\\sqrt{0.1}\\text{ m}$ or about $0.316\\text{ m}$.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds $2\\text{ rad s}^{-2}$.",
            },
            { part: "e", points: 1, description: "Finds $5\\text{ J}$." },
          ],
        },
        commonErrors: [
          "Using only the disc's mass while finding radius of gyration of the whole system.",
          "Forgetting the point-mass contribution of the object at the rim.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$I_d=\\frac12(3)(0.40)^2=0.24\\text{ kg m}^2$.",
          },
          {
            part: "b",
            explanation:
              "$I_{\\text{object}}=1(0.40)^2=0.16\\text{ kg m}^2$, so $I_{\\text{total}}=0.40\\text{ kg m}^2$.",
          },
          {
            part: "c",
            explanation:
              "Total mass is $4\\text{ kg}$, so $K=\\sqrt{I/M}=\\sqrt{0.40/4}=\\sqrt{0.1}\\text{ m}\\approx0.316\\text{ m}$.",
          },
          {
            part: "d",
            explanation: "$\\alpha=\\tau/I=0.80/0.40=2\\text{ rad s}^{-2}$.",
          },
          {
            part: "e",
            explanation: "$K_{\\text{rot}}=\\frac12(0.40)(5^2)=5\\text{ J}$.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Four point masses of $0.50\text{ kg}$ each are placed at the corners of a square of side $0.40\text{ m}$.`,
        difficulty: 3,
        skillTags: ["point_mass_mi", "square_geometry"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the moment of inertia about an axis through the centre perpendicular to the square.`,
            points: 1,
          },
        ],
        hints: [
          L`Distance from centre to each corner is $a/\sqrt2$.`,
          L`Use $I=\sum mr^2$.`,
          L`There are four equal masses.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $0.16\text{ kg m}^2$.`,
            },
          ],
        },
        commonErrors: [
          L`Using the side length as the distance from the centre to each corner.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For each mass, $r^2=(0.40)^2/2=0.08$. Thus $I=4(0.50)(0.08)=0.16\text{ kg m}^2$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A uniform rod of mass $3\text{ kg}$ and length $2\text{ m}$ rotates about an axis through one end perpendicular to its length.`,
        difficulty: 3,
        skillTags: ["moment_of_inertia", "rod"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find its moment of inertia about this axis.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find its radius of gyration about this axis.`,
            points: 1,
          },
        ],
        hints: [
          L`For a rod about one end, $I=ML^2/3$.`,
          L`Use $I=Mk^2$.`,
          L`Keep units in metres.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $4\text{ kg m}^2$.` },
            {
              part: "b",
              points: 1,
              description: L`Finds $2/\sqrt3\text{ m}$.`,
            },
          ],
        },
        commonErrors: [
          L`Using the centre-axis formula $ML^2/12$ for an end-axis question.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`I=ML^2/3=3(2^2)/3=4\text{ kg m}^2.` },
          {
            part: "b",
            explanation: L`$I=Mk^2$, so $4=3k^2$ and $k=2/\sqrt3\text{ m}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A body of mass $5\text{ kg}$ has radius of gyration $0.40\text{ m}$ about a given axis. A torque of $4\text{ N m}$ acts about that axis.`,
        difficulty: 3,
        skillTags: ["radius_of_gyration", "torque"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the moment of inertia.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the angular acceleration.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $I=Mk^2$.`,
          L`Then use $\tau=I\alpha$.`,
          L`Do not confuse radius of gyration with angular speed.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $0.80\text{ kg m}^2$.`,
            },
            {
              part: "b",
              points: 1,
              description: L`Finds $5\text{ rad s}^{-2}$.`,
            },
          ],
        },
        commonErrors: [L`Using $I=Mk$ instead of $Mk^2$.`],
        workedSolution: [
          { part: "a", explanation: L`I=Mk^2=5(0.40)^2=0.80\text{ kg m}^2.` },
          {
            part: "b",
            explanation: L`\alpha=\tau/I=4/0.80=5\text{ rad s}^{-2}.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A light rod carries two point masses $2m$ and $m$ at distances $a$ and $2a$ respectively from a fixed axis perpendicular to the rod. It is released from rest after being given rotational kinetic energy $9ma^2\omega_0^2/2$.`,
        difficulty: 5,
        skillTags: [
          "point_mass_mi",
          "rotational_kinetic_energy",
          "radius_of_gyration",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the moment of inertia of the system about the axis.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the angular speed in terms of $\omega_0$.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Find the radius of gyration about the axis.`,
            points: 2,
          },
        ],
        hints: [
          L`Treat the rod as light, so only point masses contribute.`,
          L`Use $K=\frac12I\omega^2$.`,
          L`Total mass is $3m$ for radius of gyration.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds $6ma^2$.` },
            {
              part: "b",
              points: 1,
              description: L`Finds $\omega=\sqrt{3/2}\,\omega_0$.`,
            },
            { part: "c", points: 2, description: L`Finds $k=\sqrt2a$.` },
          ],
        },
        commonErrors: [
          L`Using $m+2m$ but forgetting the different distances from the axis.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`I=(2m)a^2+m(2a)^2=6ma^2.` },
          {
            part: "b",
            explanation: L`$\frac12(6ma^2)\omega^2=\frac92ma^2\omega_0^2$, so $\omega^2=\frac32\omega_0^2$.`,
          },
          { part: "c", explanation: L`$I=(3m)k^2=6ma^2$, hence $k=\sqrt2a$.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The same rigid body is rotated about two different parallel axes. About axis $X$, its radius of gyration is $0.30\text{ m}$; about axis $Y$, its radius of gyration is $0.60\text{ m}$. Its mass is $10\text{ kg}$.`,
        difficulty: 4,
        skillTags: [
          "radius_of_gyration",
          "moment_of_inertia",
          "rotational_energy",
        ],
        parts: [
          { letter: "a", promptMarkdown: L`Find $I_X$.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find $I_Y$.`, points: 1 },
          {
            letter: "c",
            promptMarkdown: L`For the same angular acceleration, compare the required torques about $Y$ and $X$.`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`For the same angular speed, compare the rotational kinetic energies about $Y$ and $X$.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $I=Mk^2$ for each axis.`,
          L`Torque for a given angular acceleration is proportional to $I$.`,
          L`Rotational kinetic energy for a given angular speed is also proportional to $I$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $0.90\text{ kg m}^2$.`,
            },
            {
              part: "b",
              points: 1,
              description: L`Finds $3.6\text{ kg m}^2$.`,
            },
            {
              part: "c",
              points: 1,
              description: L`Finds torque about $Y$ is four times torque about $X$.`,
            },
            {
              part: "d",
              points: 1,
              description: L`Finds kinetic energy about $Y$ is four times that about $X$.`,
            },
          ],
        },
        commonErrors: [
          L`Comparing radii of gyration linearly instead of through $k^2$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`I_X=10(0.30)^2=0.90\text{ kg m}^2.` },
          { part: "b", explanation: L`I_Y=10(0.60)^2=3.6\text{ kg m}^2.` },
          {
            part: "c",
            explanation: L`For the same $\alpha$, $\tau\propto I$, so $\tau_Y/\tau_X=3.6/0.90=4$.`,
          },
          {
            part: "d",
            explanation: L`For the same $\omega$, $K\propto I$, so $K_Y/K_X=4$.`,
          },
        ],
      },
    ],
  },
];

export const systemParticlesRigidBodyTopics: Topic[] =
  topicSeeds.map(makeTopic);
