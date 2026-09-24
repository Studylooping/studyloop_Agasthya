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

const COURSE = "cbse-math-10";
const UNIT = "u6-mensuration";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type SolutionSeed = Omit<SolutionStep, "step"> &
  Partial<Pick<SolutionStep, "step">>;

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
  solution: readonly SolutionSeed[];
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
  return `You chose ${choiceText}. Identify the exposed boundary or occupied region before substituting a mensuration formula.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class10_mensuration_reasoning"),
    };
  });

  const choices = unletteredChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];

  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_the_right_formula_but_counts_the_wrong_boundary_or_face",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      step: step.step ?? stepIndex + 1,
      explanation: step.explanation,
      ...(step.math ? { math: step.math } : {}),
    })),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_mensuration_answer_without_showing_which_region_or_face_is_counted",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: [...seed.parts],
    hintLadder: hints(seed.hints),
    rubric: seed.rubric,
    commonErrors: [...seed.commonErrors],
    workedSolution: [...seed.workedSolution],
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeTopic(seed: TopicSeed): Topic {
  const meta: TopicMeta = {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
  };

  return {
    ...meta,
    items: [
      ...seed.mc.map((item, index) => makeMc(meta, item, index)),
      ...seed.constructed.map((item, index) =>
        makeConstructed(meta, item, index),
      ),
    ],
  };
}

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const sectorFigure: ItemFigure = {
  type: "svg",
  title: "Sector of a circle",
  description:
    "A shaded sector of a circle is bounded by two radii and one arc.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <circle cx="310" cy="205" r="135" fill="#f8fafc" stroke="#334155" stroke-width="4"/>
  <path d="M310 205 L445 205 A135 135 0 0 0 242.5 88.1 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <circle cx="310" cy="205" r="5" fill="#334155"/>
  <path d="M365 205 A55 55 0 0 0 337.5 157.4" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="319" y="198" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#f97316">&#952;</text>
  <text x="326" y="225" font-family="Arial, sans-serif" font-size="17" fill="#1d4ed8">r</text>
  <text x="248" y="159" font-family="Arial, sans-serif" font-size="17" fill="#1d4ed8">r</text>
  <text x="298" y="228" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#334155">O</text>
  <text x="356" y="106" font-family="Arial, sans-serif" font-size="17" fill="#334155">arc</text>
</svg>`,
};

const segmentFigure: ItemFigure = {
  type: "svg",
  title: "Minor segment of a circle",
  description:
    "A chord cuts off a minor segment; the sector and triangle share the same radii.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <circle cx="310" cy="205" r="135" fill="#f8fafc" stroke="#334155" stroke-width="4"/>
  <path d="M445 205 A135 135 0 0 0 310 70 L445 205 Z" fill="#fed7aa" opacity="0.65"/>
  <path d="M445 205 A135 135 0 0 0 310 70 L445 205 Z" fill="none" stroke="#f97316" stroke-width="4"/>
  <line x1="310" y1="70" x2="445" y2="205" stroke="#16a34a" stroke-width="4"/>
  <line x1="310" y1="205" x2="445" y2="205" stroke="#2563eb" stroke-width="3"/>
  <line x1="310" y1="205" x2="310" y2="70" stroke="#2563eb" stroke-width="3"/>
  <circle cx="310" cy="205" r="5" fill="#334155"/>
  <text x="298" y="228" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#334155">O</text>
  <text x="305" y="58" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#334155">A</text>
  <text x="452" y="211" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#334155">B</text>
  <text x="357" y="130" font-family="Arial, sans-serif" font-size="16" fill="#9a3412">segment</text>
</svg>`,
};

const stadiumFigure: ItemFigure = {
  type: "svg",
  title: "Rectangle with two semicircular ends",
  description:
    "A rectangle has one semicircle attached to each shorter side, forming a stadium-like shape.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <rect x="230" y="100" width="240" height="140" fill="#ecfeff" stroke="#0891b2" stroke-width="4"/>
  <path d="M230 100 A70 70 0 0 0 230 240" fill="#cffafe" stroke="#0891b2" stroke-width="4"/>
  <path d="M470 240 A70 70 0 0 0 470 100" fill="#cffafe" stroke="#0891b2" stroke-width="4"/>
  <line x1="230" y1="270" x2="470" y2="270" stroke="#334155" stroke-width="3"/>
  <line x1="230" y1="262" x2="230" y2="278" stroke="#334155" stroke-width="3"/>
  <line x1="470" y1="262" x2="470" y2="278" stroke="#334155" stroke-width="3"/>
  <text x="326" y="296" font-family="Arial, sans-serif" font-size="17" fill="#334155">40 m</text>
  <line x1="520" y1="100" x2="520" y2="240" stroke="#334155" stroke-width="3"/>
  <line x1="512" y1="100" x2="528" y2="100" stroke="#334155" stroke-width="3"/>
  <line x1="512" y1="240" x2="528" y2="240" stroke="#334155" stroke-width="3"/>
  <text x="535" y="176" font-family="Arial, sans-serif" font-size="17" fill="#334155">20 m</text>
</svg>`,
};

const cylinderHemisphereFigure: ItemFigure = {
  type: "svg",
  title: "Cylinder with hemispherical top",
  description:
    "A right circular cylinder and a hemisphere of the same radius are joined along one circular face.",
  svg: `<svg viewBox="0 0 620 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="420" fill="#ffffff"/>
  <path d="M210 130 A100 70 0 0 1 410 130" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <path d="M210 130 C210 112 410 112 410 130" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="7 7"/>
  <path d="M210 130 V305 C210 328 410 328 410 305 V130" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <ellipse cx="310" cy="305" rx="100" ry="28" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/>
  <line x1="310" y1="305" x2="410" y2="305" stroke="#334155" stroke-width="3"/>
  <text x="353" y="294" font-family="Arial, sans-serif" font-size="17" fill="#334155">r</text>
  <line x1="450" y1="130" x2="450" y2="305" stroke="#334155" stroke-width="3"/>
  <text x="463" y="223" font-family="Arial, sans-serif" font-size="17" fill="#334155">h</text>
</svg>`,
};

const coneCylinderFigure: ItemFigure = {
  type: "svg",
  title: "Cone on a cylinder",
  description:
    "A cone and a cylinder have the same circular base and are joined along that base.",
  svg: `<svg viewBox="0 0 620 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="430" fill="#ffffff"/>
  <path d="M210 178 L310 70 L410 178" fill="#ffedd5" stroke="#f97316" stroke-width="4"/>
  <path d="M210 178 C210 154 410 154 410 178" fill="none" stroke="#f97316" stroke-width="3" stroke-dasharray="7 7"/>
  <path d="M210 178 C210 202 410 202 410 178" fill="#fed7aa" stroke="#f97316" stroke-width="4"/>
  <path d="M210 178 V330 C210 354 410 354 410 330 V178" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <ellipse cx="310" cy="330" rx="100" ry="27" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/>
  <line x1="310" y1="330" x2="410" y2="330" stroke="#334155" stroke-width="3"/>
  <text x="356" y="320" font-family="Arial, sans-serif" font-size="17" fill="#334155">r</text>
  <text x="442" y="258" font-family="Arial, sans-serif" font-size="17" fill="#334155">cylinder height</text>
  <text x="402" y="118" font-family="Arial, sans-serif" font-size="17" fill="#334155">cone</text>
</svg>`,
};

const coneHemisphereFigure: ItemFigure = {
  type: "svg",
  title: "Cone joined to a hemisphere",
  description:
    "A cone and a hemisphere share a circular rim; the joined face is not exposed.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <path d="M210 180 L310 70 L410 180" fill="#ffedd5" stroke="#f97316" stroke-width="4"/>
  <path d="M210 180 C210 156 410 156 410 180" fill="none" stroke="#f97316" stroke-width="3" stroke-dasharray="7 7"/>
  <path d="M210 180 C210 204 410 204 410 180" fill="#fed7aa" stroke="#f97316" stroke-width="4"/>
  <path d="M210 180 A100 82 0 0 0 410 180" fill="#dcfce7" stroke="#16a34a" stroke-width="4"/>
  <line x1="310" y1="180" x2="410" y2="180" stroke="#334155" stroke-width="3"/>
  <text x="356" y="170" font-family="Arial, sans-serif" font-size="17" fill="#334155">r</text>
  <text x="270" y="44" font-family="Arial, sans-serif" font-size="17" fill="#9a3412">cone</text>
  <text x="246" y="282" font-family="Arial, sans-serif" font-size="17" fill="#166534">hemisphere</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Circle Measures",
    subtopic:
      "Using radius, diameter, circumference and area of circles in direct and reverse situations.",
    mc: [
      {
        questionLatex: L`A wheel of radius $21$ cm makes one complete revolution without slipping. Taking $\pi=\frac{22}{7}$, the distance covered is`,
        difficulty: 1,
        skillTags: ["circumference", "circle"],
        choices: [L`$66$ cm`, L`$132$ cm`, L`$462$ cm`, L`$42$ cm`],
        correctLetter: "B",
        rationales: {
          A: L`This uses $\pi r$ and misses the factor $2$ in circumference.`,
          C: L`This is the area $\pi r^2$, not the distance in one revolution.`,
          D: L`This is the diameter, not the circumference.`,
        },
        hints: [
          L`One revolution covers the circumference of the wheel.`,
          L`Use $C=2\pi r$.`,
          L`Substitute $r=21$ and $\pi=\frac{22}{7}$.`,
        ],
        solution: [
          {
            explanation: L`Distance in one revolution is the circumference.`,
            math: L`2\pi r=2\cdot\frac{22}{7}\cdot21=132`,
          },
        ],
      },
      {
        questionLatex: L`A circular garden has diameter $28$ m. Taking $\pi=\frac{22}{7}$, its area is`,
        difficulty: 2,
        skillTags: ["area_of_circle", "diameter_to_radius"],
        choices: [L`$88$ m$^2$`, L`$196$ m$^2$`, L`$616$ m$^2$`, L`$2464$ m$^2$`],
        correctLetter: "C",
        rationales: {
          A: L`This is the circumference, not the area.`,
          B: L`This squares the radius but misses multiplication by $\pi$.`,
          D: L`This uses the diameter as the radius.`,
        },
        hints: [
          L`First convert diameter to radius.`,
          L`Use $A=\pi r^2$.`,
          L`Here $r=14$ m.`,
        ],
        solution: [
          {
            explanation: L`The radius is $14$ m, so`,
            math: L`A=\frac{22}{7}\cdot14^2=616`,
          },
        ],
      },
      {
        questionLatex: L`The radius of a circle increases from $6$ cm to $9$ cm. The increase in area is`,
        difficulty: 2,
        skillTags: ["area_difference", "circle"],
        choices: [L`$15\pi$ cm$^2$`, L`$45\pi$ cm$^2$`, L`$75\pi$ cm$^2$`, L`$90\pi$ cm$^2$`],
        correctLetter: "B",
        rationales: {
          A: L`This uses the difference of radii directly instead of the difference of squared radii.`,
          C: L`This adds $6^2$ and $9^2$ instead of subtracting the old area from the new area.`,
          D: L`This doubles the correct area increase.`,
        },
        hints: [
          L`Find new area minus old area.`,
          L`Use $\pi(9^2)-\pi(6^2)$.`,
          L`Subtract the squares, not the radii.`,
        ],
        solution: [
          {
            explanation: L`The increase is`,
            math: L`\pi(9^2-6^2)=\pi(81-36)=45\pi`,
          },
        ],
      },
      {
        questionLatex: L`A semicircular flower bed has radius $7$ m. Taking $\pi=\frac{22}{7}$, the perimeter of the flower bed is`,
        difficulty: 2,
        skillTags: ["semicircle_perimeter", "boundary_counting"],
        choices: [L`$22$ m`, L`$44$ m`, L`$58$ m`, L`$36$ m`],
        correctLetter: "D",
        rationales: {
          A: L`This counts only the curved semicircular arc.`,
          B: L`This is the full circumference of the circle.`,
          C: L`This adds the full circumference and the diameter.`,
        },
        hints: [
          L`A semicircle's perimeter includes the curved arc and the diameter.`,
          L`The curved part is $\pi r$.`,
          L`Add $2r$ to the curved part.`,
        ],
        solution: [
          {
            explanation: L`Perimeter of a semicircle is $\pi r+2r$.`,
            math: L`\frac{22}{7}\cdot7+14=22+14=36`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): If the radii of two circles are $7$ cm and $14$ cm, their areas are in the ratio $1:4$. Reason (R): Areas of circles are proportional to the squares of their radii.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "area_ratio"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains why $7^2:14^2=1:4$.`,
          C: L`The reason is true because $A=\pi r^2$.`,
          D: L`The assertion is true: $49:196=1:4$.`,
        },
        hints: [
          L`Compare $7^2$ and $14^2$.`,
          L`The common factor $\pi$ cancels in an area ratio.`,
          L`Check whether the reason explains the assertion.`,
        ],
        solution: [
          {
            explanation: L`The area ratio is $\pi\cdot7^2:\pi\cdot14^2=49:196=1:4$.`,
          },
          {
            explanation: L`The reason states the exact proportionality used, so it correctly explains the assertion.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the circumference of a circle whose diameter is $35$ cm. Take $\pi=\frac{22}{7}$.`,
        difficulty: 1,
        skillTags: ["circumference", "diameter"],
        parts: singlePart("a", L`Find the circumference.`, 1),
        hints: [
          L`Circumference can be found directly from diameter.`,
          L`Use $C=\pi d$.`,
          L`Substitute $d=35$ cm.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $110$ cm.`),
        commonErrors: [
          L`Using radius $35$ instead of diameter $35$.`,
          L`Finding area instead of circumference.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$C=\pi d=\frac{22}{7}\cdot35=110$ cm.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A circular walking path lies between two concentric circles of radii $21$ m and $14$ m. Find the area of the path. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        skillTags: ["annulus_area", "area_difference"],
        parts: singlePart("a", L`Find the area of the path.`, 2),
        hints: [
          L`The path area is outer circle area minus inner circle area.`,
          L`Use $\pi(R^2-r^2)$.`,
          L`Here $R=21$ and $r=14$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Sets up $\pi(21^2-14^2)$.` },
            { part: "a", points: 1, description: L`Gets $770$ m$^2$.` },
          ],
        },
        commonErrors: [
          L`Adding the two circle areas instead of subtracting.`,
          L`Subtracting radii before squaring without using the correct area formula.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Area of path`,
            math: L`=\frac{22}{7}(21^2-14^2)=\frac{22}{7}(441-196)=770`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A wire is bent into a square of side $11$ cm and then reshaped into a circle. Find the radius of the circle. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["perimeter_conservation", "circle_radius"],
        parts: singlePart("a", L`Find the radius of the circle.`, 3),
        hints: [
          L`The length of wire remains the same.`,
          L`First find the perimeter of the square.`,
          L`Set it equal to $2\pi r$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds wire length $44$ cm.` },
            { part: "a", points: 1, description: L`Sets $2\pi r=44$.` },
            { part: "a", points: 1, description: L`Gets $r=7$ cm.` },
          ],
        },
        commonErrors: [
          L`Equating square area to circle circumference.`,
          L`Using diameter as radius after solving.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The wire length is the square perimeter: $4\cdot11=44$ cm.`,
          },
          {
            part: "a",
            explanation: L`For the circle, $2\pi r=44$, so $2\cdot\frac{22}{7}r=44$ and $r=7$ cm.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A circular park has outer radius $35$ m. A circular track of uniform width $7$ m runs inside its boundary. Find the area of the track and the length of the outer boundary. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["annulus_area", "circumference"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the area of the track.`, points: 3 },
          { letter: "b", promptMarkdown: L`Find the length of the outer boundary.`, points: 2 },
        ],
        hints: [
          L`The inner radius is $35-7$.`,
          L`Track area is outer area minus inner area.`,
          L`Outer boundary length is the circumference with radius $35$ m.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds inner radius $28$ m.` },
            { part: "a", points: 1, description: L`Sets up $\pi(35^2-28^2)$.` },
            { part: "a", points: 1, description: L`Finds area $1386$ m$^2$.` },
            { part: "b", points: 2, description: L`Finds outer boundary length $220$ m.` },
          ],
        },
        commonErrors: [
          L`Using width $7$ m as the inner radius.`,
          L`Finding only one circular area instead of the ring-shaped track.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The inner radius is $28$ m. Track area`,
            math: L`=\frac{22}{7}(35^2-28^2)=\frac{22}{7}(1225-784)=1386`,
          },
          {
            part: "b",
            explanation: L`Outer boundary length $=2\cdot\frac{22}{7}\cdot35=220$ m.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A circular field has radius $28$ m. A farmer wants to fence it and spread seed over the whole field. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["circle_application", "area_and_circumference"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the length of fencing required.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the area to be seeded.`, points: 2 },
          { letter: "c", promptMarkdown: L`If seed is needed at $2$ kg per $100$ m$^2$, find the seed required to the nearest kilogram.`, points: 2 },
        ],
        hints: [
          L`Fencing means circumference.`,
          L`Seeding means area.`,
          L`Use proportional reasoning for seed required.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds fencing length $176$ m.` },
            { part: "b", points: 2, description: L`Finds area $2464$ m$^2$.` },
            { part: "c", points: 2, description: L`Finds seed required about $49$ kg.` },
          ],
        },
        commonErrors: [
          L`Using area for fencing length.`,
          L`Forgetting to scale the seed requirement per $100$ m$^2$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Fencing length $=2\pi r=2\cdot\frac{22}{7}\cdot28=176$ m.`,
          },
          {
            part: "b",
            explanation: L`Area $=\pi r^2=\frac{22}{7}\cdot28^2=2464$ m$^2$.`,
          },
          {
            part: "c",
            explanation: L`Seed required $=\frac{2}{100}\cdot2464=49.28$ kg, so about $49$ kg to the nearest kilogram.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.2",
    title: "Sectors and Arcs",
    subtopic:
      "Finding sector area, arc length and sector perimeter from central angle and radius.",
    mc: [
      {
        questionLatex: L`A sector has radius $14$ cm and central angle $90^\circ$. Taking $\pi=\frac{22}{7}$, its area is`,
        difficulty: 2,
        figure: sectorFigure,
        skillTags: ["sector_area", "right_angle_sector"],
        choices: [L`$44$ cm$^2$`, L`$98$ cm$^2$`, L`$154$ cm$^2$`, L`$616$ cm$^2$`],
        correctLetter: "C",
        rationales: {
          A: L`This is the arc length of the quadrant, not its area.`,
          B: L`This is the triangle area for two perpendicular radii, not the sector area.`,
          D: L`This is the area of the full circle.`,
        },
        hints: [
          L`A $90^\circ$ sector is one-fourth of a circle.`,
          L`Find the full circle area first.`,
          L`Then divide by $4$.`,
        ],
        solution: [
          {
            explanation: L`Area of sector`,
            math: L`=\frac{90}{360}\cdot\frac{22}{7}\cdot14^2=154`,
          },
        ],
      },
      {
        questionLatex: L`The length of the arc of a sector of radius $21$ cm and central angle $120^\circ$ is`,
        difficulty: 2,
        skillTags: ["arc_length", "sector"],
        choices: [L`$22$ cm`, L`$66$ cm`, L`$88$ cm`, L`$44$ cm`],
        correctLetter: "D",
        rationales: {
          A: L`This uses $60^\circ$ instead of $120^\circ$.`,
          B: L`This is half the full circumference, not one-third.`,
          C: L`This doubles the correct arc length.`,
        },
        hints: [
          L`Arc length is the same fraction of circumference as the angle is of $360^\circ$.`,
          L`Here $120^\circ$ is one-third of $360^\circ$.`,
          L`Find one-third of $2\pi r$.`,
        ],
        solution: [
          {
            explanation: L`Arc length`,
            math: L`=\frac{120}{360}\cdot2\cdot\frac{22}{7}\cdot21=44`,
          },
        ],
      },
      {
        questionLatex: L`A sector of radius $14$ cm has central angle $60^\circ$. Its perimeter is`,
        difficulty: 3,
        figure: sectorFigure,
        skillTags: ["sector_perimeter", "arc_length"],
        choices: [L`$\frac{44}{3}$ cm`, L`$\frac{128}{3}$ cm`, L`$28$ cm`, L`$\frac{172}{3}$ cm`],
        correctLetter: "B",
        rationales: {
          A: L`This is only the arc length; the two radii must also be counted.`,
          C: L`This counts only the two radii.`,
          D: L`This uses the full circumference instead of the $60^\circ$ arc.`,
        },
        hints: [
          L`Sector perimeter has one arc and two radii.`,
          L`Find the $60^\circ$ arc length first.`,
          L`Add $14+14$ to that arc length.`,
        ],
        solution: [
          {
            explanation: L`The arc length is $\frac{60}{360}\cdot2\pi\cdot14=\frac{44}{3}$ cm.`,
          },
          {
            explanation: L`Perimeter $=14+14+\frac{44}{3}=\frac{128}{3}$ cm.`,
          },
        ],
      },
      {
        questionLatex: L`A sector has radius $12$ cm and central angle $120^\circ$. Its area is`,
        difficulty: 2,
        skillTags: ["sector_area", "fraction_of_circle"],
        choices: [L`$48\pi$ cm$^2$`, L`$24\pi$ cm$^2$`, L`$72\pi$ cm$^2$`, L`$144\pi$ cm$^2$`],
        correctLetter: "A",
        rationales: {
          B: L`This uses one-sixth of the circle, which would match $60^\circ$.`,
          C: L`This uses half the circle, which would match $180^\circ$.`,
          D: L`This is the area of the full circle.`,
        },
        hints: [
          L`$120^\circ$ is one-third of a full angle.`,
          L`Find one-third of $\pi r^2$.`,
          L`The full circle area is $144\pi$.`,
        ],
        solution: [
          {
            explanation: L`Sector area`,
            math: L`=\frac{120}{360}\cdot\pi\cdot12^2=48\pi`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): For a fixed radius, doubling the central angle doubles the arc length. Reason (R): For a fixed radius, the area of a sector is proportional to its central angle.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "arc_length_proportionality"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The reason is about sector area, while the assertion is about arc length.`,
          C: L`The reason is true for sector area at fixed radius.`,
          D: L`The assertion is also true because arc length is proportional to central angle.`,
        },
        hints: [
          L`Check whether arc length changes linearly with central angle.`,
          L`Then check what the reason talks about.`,
          L`A true statement may fail to explain another true statement.`,
        ],
        solution: [
          {
            explanation: L`Arc length is proportional to central angle for a fixed radius, so the assertion is true.`,
          },
          {
            explanation: L`The reason is also true, but it speaks about sector area, not arc length. Hence it is not the correct explanation.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the length of a $90^\circ$ arc in a circle of radius $7$ cm. Take $\pi=\frac{22}{7}$.`,
        difficulty: 1,
        skillTags: ["arc_length", "quadrant"],
        parts: singlePart("a", L`Find the arc length.`, 1),
        hints: [
          L`A $90^\circ$ arc is one-fourth of a full circumference.`,
          L`Full circumference is $2\pi r$.`,
          L`Use $r=7$.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $11$ cm.`),
        commonErrors: [
          L`Finding area instead of arc length.`,
          L`Using half the circumference instead of one-fourth.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Arc length $=\frac{90}{360}\cdot2\cdot\frac{22}{7}\cdot7=11$ cm.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the area of a sector of radius $21$ cm and central angle $60^\circ$. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        figure: sectorFigure,
        skillTags: ["sector_area", "sixty_degree_sector"],
        parts: singlePart("a", L`Find the sector area.`, 2),
        hints: [
          L`A $60^\circ$ sector is one-sixth of a circle.`,
          L`Find $\pi r^2$ first.`,
          L`Then divide by $6$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Uses $\frac{60}{360}\pi r^2$.` },
            { part: "a", points: 1, description: L`Finds $231$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Using circumference formula for sector area.`,
          L`Dividing by $60$ instead of by $6$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Sector area`,
            math: L`=\frac{60}{360}\cdot\frac{22}{7}\cdot21^2=231`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the perimeter of a quadrant of radius $28$ cm. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        skillTags: ["quadrant_perimeter", "arc_length"],
        parts: singlePart("a", L`Find the perimeter of the quadrant.`, 2),
        hints: [
          L`A quadrant perimeter includes one arc and two radii.`,
          L`Find one-fourth of the circumference.`,
          L`Add $28+28$ to the arc length.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds quadrant arc length $44$ cm.` },
            { part: "a", points: 1, description: L`Gets perimeter $100$ cm.` },
          ],
        },
        commonErrors: [
          L`Using only the arc length.`,
          L`Using full circumference instead of one-fourth.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Quadrant arc length $=\frac14\cdot2\cdot\frac{22}{7}\cdot28=44$ cm.`,
          },
          {
            part: "a",
            explanation: L`Perimeter $=44+28+28=100$ cm.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`The minute hand of a clock is $14$ cm long. Find the area swept by it in $20$ minutes. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["sector_area_application", "clock_angle"],
        parts: singlePart("a", L`Find the swept area.`, 4),
        hints: [
          L`In $60$ minutes, the minute hand sweeps $360^\circ$.`,
          L`In $20$ minutes, it sweeps $120^\circ$.`,
          L`Now find the area of a $120^\circ$ sector of radius $14$ cm.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds angle swept $120^\circ$.` },
            { part: "a", points: 1, description: L`Uses sector area formula.` },
            { part: "a", points: 1, description: L`Substitutes radius $14$ correctly.` },
            { part: "a", points: 1, description: L`Finds $\frac{616}{3}$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Using arc length instead of sector area.`,
          L`Taking $20$ minutes as $20^\circ$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The angle swept in $20$ minutes is $\frac{20}{60}\cdot360^\circ=120^\circ$.`,
          },
          {
            part: "a",
            explanation: L`Swept area`,
            math: L`=\frac{120}{360}\cdot\frac{22}{7}\cdot14^2=\frac{616}{3}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A garden sprinkler waters a sector of radius $42$ m and central angle $120^\circ$. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        figure: sectorFigure,
        skillTags: ["sector_application", "arc_area_perimeter"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the arc length of the watered boundary.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the area watered by the sprinkler.`, points: 2 },
          { letter: "c", promptMarkdown: L`Find the total boundary length of the watered sector.`, points: 2 },
        ],
        hints: [
          L`The central angle is one-third of a full angle.`,
          L`Use one-third of circumference for arc length.`,
          L`For total boundary, add the two radii to the arc.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds arc length $88$ m.` },
            { part: "b", points: 2, description: L`Finds area $1848$ m$^2$.` },
            { part: "c", points: 2, description: L`Finds total boundary length $172$ m.` },
          ],
        },
        commonErrors: [
          L`Counting only the arc as the full sector boundary.`,
          L`Using $120$ as a length instead of a central angle.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Arc length $=\frac{120}{360}\cdot2\cdot\frac{22}{7}\cdot42=88$ m.`,
          },
          {
            part: "b",
            explanation: L`Area $=\frac{120}{360}\cdot\frac{22}{7}\cdot42^2=1848$ m$^2$.`,
          },
          {
            part: "c",
            explanation: L`Total boundary length $=88+42+42=172$ m.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.3",
    title: "Segments and Composite Plane Figures",
    subtopic:
      "Calculating segment areas and shaded regions using sectors, triangles, rectangles and semicircles.",
    mc: [
      {
        questionLatex: L`A minor segment is cut off by a chord that subtends $90^\circ$ at the centre of a circle of radius $14$ cm. Taking $\pi=\frac{22}{7}$, the area of the segment is`,
        difficulty: 3,
        figure: segmentFigure,
        skillTags: ["segment_area", "ninety_degree_segment"],
        choices: [L`$154$ cm$^2$`, L`$98$ cm$^2$`, L`$56$ cm$^2$`, L`$252$ cm$^2$`],
        correctLetter: "C",
        rationales: {
          A: L`This is the sector area only; the triangle under the chord must be subtracted.`,
          B: L`This is the triangle area only, not the segment area.`,
          D: L`This adds the sector and triangle instead of subtracting.`,
        },
        hints: [
          L`Segment area equals sector area minus triangle area.`,
          L`For $90^\circ$, the triangle formed by two radii is right-angled.`,
          L`Compute $154-98$.`,
        ],
        solution: [
          {
            explanation: L`Sector area $=\frac14\pi(14)^2=154$ cm$^2$. Triangle area $=\frac12\cdot14\cdot14=98$ cm$^2$.`,
          },
          {
            explanation: L`Segment area $=154-98=56$ cm$^2$.`,
          },
        ],
      },
      {
        questionLatex: L`A square of side $14$ cm has a quadrant of radius $14$ cm drawn inside it. Taking $\pi=\frac{22}{7}$, the area of the part of the square outside the quadrant is`,
        difficulty: 2,
        skillTags: ["shaded_area", "quadrant"],
        choices: [L`$154$ cm$^2$`, L`$42$ cm$^2$`, L`$196$ cm$^2$`, L`$350$ cm$^2$`],
        correctLetter: "B",
        rationales: {
          A: L`This is the quadrant area, not the part outside it.`,
          C: L`This is the whole square area.`,
          D: L`This adds the square and quadrant areas.`,
        },
        hints: [
          L`Find square area first.`,
          L`Find the quadrant area.`,
          L`Subtract quadrant area from square area.`,
        ],
        solution: [
          {
            explanation: L`Square area $=14^2=196$ cm$^2$ and quadrant area $=\frac14\cdot\frac{22}{7}\cdot14^2=154$ cm$^2$.`,
          },
          {
            explanation: L`Required area $=196-154=42$ cm$^2$.`,
          },
        ],
      },
      {
        questionLatex: L`For a circle of radius $6$ cm, a chord subtends $60^\circ$ at the centre. The exact area of the minor segment is`,
        difficulty: 4,
        figure: segmentFigure,
        skillTags: ["segment_area", "sixty_degree_segment", "exact_expression"],
        choices: [L`$6\pi-18\sqrt3$ cm$^2$`, L`$36\pi-9\sqrt3$ cm$^2$`, L`$9\sqrt3$ cm$^2$`, L`$6\pi-9\sqrt3$ cm$^2$`],
        correctLetter: "D",
        rationales: {
          A: L`The triangle area is $9\sqrt3$, not $18\sqrt3$.`,
          B: L`This uses the full circle area instead of the $60^\circ$ sector area.`,
          C: L`This is only the equilateral triangle area.`,
        },
        hints: [
          L`A $60^\circ$ sector is one-sixth of the circle.`,
          L`The triangle formed by the two radii and chord is equilateral of side $6$.`,
          L`Subtract triangle area from sector area.`,
        ],
        solution: [
          {
            explanation: L`Sector area $=\frac16\pi(6)^2=6\pi$ cm$^2$.`,
          },
          {
            explanation: L`The triangle is equilateral with side $6$, so its area is $\frac{\sqrt3}{4}\cdot6^2=9\sqrt3$ cm$^2$.`,
          },
          {
            explanation: L`Segment area $=6\pi-9\sqrt3$ cm$^2$.`,
          },
        ],
      },
      {
        questionLatex: L`A square of side $14$ cm has a semicircle drawn outward on one side. Taking $\pi=\frac{22}{7}$, the outer perimeter of the new figure is`,
        difficulty: 3,
        skillTags: ["composite_perimeter", "semicircle"],
        choices: [L`$64$ cm`, L`$56$ cm`, L`$78$ cm`, L`$86$ cm`],
        correctLetter: "A",
        rationales: {
          B: L`This is the perimeter of the original square, before replacing one side by an arc.`,
          C: L`This adds all four square sides and the semicircular arc, counting the shared side too.`,
          D: L`This uses a full circular arc instead of a semicircular arc.`,
        },
        hints: [
          L`The side used as diameter is no longer on the outer boundary.`,
          L`Count three square sides and one semicircular arc.`,
          L`The semicircular arc has length $\pi r$ with $r=7$ cm.`,
        ],
        solution: [
          {
            explanation: L`Outer perimeter $=3\cdot14+\pi\cdot7=42+22=64$ cm.`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): The area of a minor segment is found by subtracting the area of the triangle formed by the two radii and the chord from the corresponding sector area. Reason (R): The corresponding sector is exactly made of that triangle and the minor segment.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "segment_area_logic"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains the subtraction in the assertion.`,
          C: L`The reason is true: sector area is split into triangle area and segment area.`,
          D: L`The assertion is true for a minor segment cut off by a chord.`,
        },
        hints: [
          L`Visualise the sector bounded by two radii and the arc.`,
          L`The chord separates the triangle from the curved segment.`,
          L`Check whether this decomposition explains the formula.`,
        ],
        solution: [
          {
            explanation: L`A sector is composed of the central triangle and the minor segment.`,
          },
          {
            explanation: L`Therefore segment area $=$ sector area $-$ triangle area, so R correctly explains A.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the area of a quadrant of radius $7$ cm. Take $\pi=\frac{22}{7}$.`,
        difficulty: 1,
        skillTags: ["quadrant_area", "sector_area"],
        parts: singlePart("a", L`Find the quadrant area.`, 1),
        hints: [
          L`A quadrant is one-fourth of a circle.`,
          L`Find $\pi r^2$ for $r=7$.`,
          L`Divide by $4$.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $\frac{77}{2}$ cm$^2$ or $38.5$ cm$^2$.`),
        commonErrors: [
          L`Finding arc length instead of area.`,
          L`Using half the circle instead of one-fourth.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Area $=\frac14\cdot\frac{22}{7}\cdot7^2=\frac{77}{2}$ cm$^2$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A chord subtends $90^\circ$ at the centre of a circle of radius $7$ cm. Find the area of the minor segment. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        figure: segmentFigure,
        skillTags: ["segment_area", "quadrant_minus_triangle"],
        parts: singlePart("a", L`Find the minor segment area.`, 3),
        hints: [
          L`The sector is a quadrant.`,
          L`The triangle formed by two radii has area $\frac12\cdot7\cdot7$.`,
          L`Subtract the triangle from the sector.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds sector area $\frac{77}{2}$ cm$^2$.` },
            { part: "a", points: 1, description: L`Finds triangle area $\frac{49}{2}$ cm$^2$.` },
            { part: "a", points: 1, description: L`Gets segment area $14$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Stopping at sector area.`,
          L`Adding the sector and triangle areas.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Sector area $=\frac14\cdot\frac{22}{7}\cdot7^2=\frac{77}{2}$ cm$^2$.`,
          },
          {
            part: "a",
            explanation: L`Triangle area $=\frac12\cdot7\cdot7=\frac{49}{2}$ cm$^2$.`,
          },
          {
            part: "a",
            explanation: L`Minor segment area $=\frac{77}{2}-\frac{49}{2}=14$ cm$^2$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A circle is inscribed in a square of side $14$ cm. Find the area inside the square but outside the circle. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        skillTags: ["shaded_area", "inscribed_circle"],
        parts: singlePart("a", L`Find the required area.`, 2),
        hints: [
          L`The circle's diameter equals the square side.`,
          L`Find square area and circle area separately.`,
          L`Subtract circle area from square area.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds square area $196$ cm$^2$ and circle area $154$ cm$^2$.` },
            { part: "a", points: 1, description: L`Gets $42$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Using radius $14$ cm instead of diameter $14$ cm.`,
          L`Subtracting square area from circle area.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The circle radius is $7$ cm. Square area $=14^2=196$ cm$^2$ and circle area $=\frac{22}{7}\cdot7^2=154$ cm$^2$.`,
          },
          {
            part: "a",
            explanation: L`Required area $=196-154=42$ cm$^2$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A running track is made from a rectangle of length $40$ m and breadth $20$ m, with one semicircle attached to each shorter side. Find its area and perimeter. Take $\pi=\frac{22}{7}$.`,
        difficulty: 4,
        figure: stadiumFigure,
        skillTags: ["composite_area", "composite_perimeter", "semicircles"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the area of the track.`, points: 3 },
          { letter: "b", promptMarkdown: L`Find its perimeter.`, points: 2 },
        ],
        hints: [
          L`The two semicircles together form one full circle.`,
          L`The circle diameter is $20$ m.`,
          L`For perimeter, count two long straight sides and one full circular arc.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds rectangle area $800$ m$^2$.` },
            { part: "a", points: 1, description: L`Finds combined semicircle area $\frac{2200}{7}$ m$^2$.` },
            { part: "a", points: 1, description: L`Finds total area $\frac{7800}{7}$ m$^2$.` },
            { part: "b", points: 2, description: L`Finds perimeter $\frac{1000}{7}$ m.` },
          ],
        },
        commonErrors: [
          L`Counting the two short sides of the rectangle in the perimeter though they become internal diameters.`,
          L`Using two full circles instead of two semicircles.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The two semicircles form one circle of radius $10$ m. Area`,
            math: L`=40\cdot20+\frac{22}{7}\cdot10^2=800+\frac{2200}{7}=\frac{7800}{7}`,
          },
          {
            part: "b",
            explanation: L`Perimeter $=2\cdot40+2\pi\cdot10=80+\frac{440}{7}=\frac{1000}{7}$ m.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A designer cuts a quadrant of radius $28$ cm from a square sheet of side $28$ cm to make a decorative corner piece. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["quadrant", "shaded_area", "curved_boundary"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the area of the quadrant removed.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the area left in the square sheet.`, points: 2 },
          { letter: "c", promptMarkdown: L`Find the curved length of the cut edge.`, points: 2 },
        ],
        hints: [
          L`The removed part is one-fourth of a circle.`,
          L`The remaining area is square area minus quadrant area.`,
          L`The curved edge is one-fourth of the circumference.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds quadrant area $616$ cm$^2$.` },
            { part: "b", points: 2, description: L`Finds remaining area $168$ cm$^2$.` },
            { part: "c", points: 2, description: L`Finds curved edge length $44$ cm.` },
          ],
        },
        commonErrors: [
          L`Using semicircle formula for the quadrant.`,
          L`Finding straight-edge perimeter instead of curved edge length in part (c).`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Quadrant area $=\frac14\cdot\frac{22}{7}\cdot28^2=616$ cm$^2$.`,
          },
          {
            part: "b",
            explanation: L`Square area $=28^2=784$ cm$^2$, so remaining area $=784-616=168$ cm$^2$.`,
          },
          {
            part: "c",
            explanation: L`Curved edge length $=\frac14\cdot2\cdot\frac{22}{7}\cdot28=44$ cm.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.4",
    title: "Surface Area of Combined Solids",
    subtopic:
      "Counting only exposed curved and plane faces when two standard solids are joined.",
    mc: [
      {
        questionLatex: L`A hemisphere of radius $7$ cm is fixed on top of a cylinder of the same radius and height $10$ cm. Taking $\pi=\frac{22}{7}$, the total outer surface area including the bottom base is`,
        difficulty: 3,
        figure: cylinderHemisphereFigure,
        skillTags: ["surface_area_combination", "hemisphere_cylinder"],
        choices: [L`$748$ cm$^2$`, L`$902$ cm$^2$`, L`$1056$ cm$^2$`, L`$1232$ cm$^2$`],
        correctLetter: "B",
        rationales: {
          A: L`This misses one exposed circular base or part of the hemispherical surface.`,
          C: L`This counts the internal common circular face.`,
          D: L`This uses full sphere surface area and extra bases incorrectly.`,
        },
        hints: [
          L`Count cylinder curved surface, hemisphere curved surface and the bottom base.`,
          L`Do not count the common circular face.`,
          L`Use $2\pi rh+2\pi r^2+\pi r^2$.`,
        ],
        solution: [
          {
            explanation: L`Outer surface area`,
            math: L`=2\pi rh+2\pi r^2+\pi r^2=140\pi+98\pi+49\pi=287\pi=902`,
          },
        ],
      },
      {
        questionLatex: L`A cone of slant height $25$ cm is fixed on a cylinder of radius $7$ cm and height $10$ cm. The cone and cylinder have the same base radius. Taking $\pi=\frac{22}{7}$, the exposed surface area including the bottom base is`,
        difficulty: 4,
        figure: coneCylinderFigure,
        skillTags: ["surface_area_combination", "cone_cylinder"],
        choices: [L`$700$ cm$^2$`, L`$990$ cm$^2$`, L`$1232$ cm$^2$`, L`$1144$ cm$^2$`],
        correctLetter: "D",
        rationales: {
          A: L`This counts only the cone's curved surface and cylinder's curved surface incompletely.`,
          B: L`This misses the exposed bottom base.`,
          C: L`This counts an extra circular face at the join.`,
        },
        hints: [
          L`Count cone curved surface, cylinder curved surface and bottom base.`,
          L`The circular face at the join is internal.`,
          L`Use $\pi rl+2\pi rh+\pi r^2$.`,
        ],
        solution: [
          {
            explanation: L`Exposed surface area`,
            math: L`=\pi rl+2\pi rh+\pi r^2=175\pi+140\pi+49\pi=364\pi=1144`,
          },
        ],
      },
      {
        questionLatex: L`A toy is made by joining a cone of radius $3$ cm and height $4$ cm to a hemisphere of the same radius. Its exposed surface area is`,
        difficulty: 3,
        figure: coneHemisphereFigure,
        skillTags: ["surface_area_combination", "cone_hemisphere"],
        choices: [L`$24\pi$ cm$^2$`, L`$27\pi$ cm$^2$`, L`$33\pi$ cm$^2$`, L`$42\pi$ cm$^2$`],
        correctLetter: "C",
        rationales: {
          A: L`This misses part of the hemispherical curved surface.`,
          B: L`This uses cone height as slant height.`,
          D: L`This adds a circular base that is not exposed.`,
        },
        hints: [
          L`First find the cone's slant height.`,
          L`Only curved surfaces are exposed at the join.`,
          L`Use $\pi rl+2\pi r^2$.`,
        ],
        solution: [
          {
            explanation: L`Cone slant height $l=\sqrt{3^2+4^2}=5$ cm.`,
          },
          {
            explanation: L`Exposed surface area $=\pi\cdot3\cdot5+2\pi\cdot3^2=15\pi+18\pi=33\pi$ cm$^2$.`,
          },
        ],
      },
      {
        questionLatex: L`A capsule has a cylindrical middle part of radius $3$ cm and length $10$ cm, with two hemispherical ends of the same radius. Its curved outer surface area is`,
        difficulty: 3,
        skillTags: ["surface_area_combination", "capsule"],
        choices: [L`$96\pi$ cm$^2$`, L`$78\pi$ cm$^2$`, L`$60\pi$ cm$^2$`, L`$114\pi$ cm$^2$`],
        correctLetter: "A",
        rationales: {
          B: L`This uses only one hemisphere instead of two hemispheres.`,
          C: L`This counts only the cylindrical curved surface.`,
          D: L`This adds circular bases that are not exposed.`,
        },
        hints: [
          L`Two hemispheres make one full sphere.`,
          L`Add cylinder curved surface and sphere surface area.`,
          L`Use $2\pi rh+4\pi r^2$.`,
        ],
        solution: [
          {
            explanation: L`Curved surface area`,
            math: L`=2\pi\cdot3\cdot10+4\pi\cdot3^2=60\pi+36\pi=96\pi`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): When a cone is fixed exactly on a cylinder of the same radius, the common circular face should not be counted in the outer surface area. Reason (R): The common circular face must be counted twice because it belongs to both solids.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "exposed_surface"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`The reason is false: an internal joined face is not part of the outer surface.`,
          B: L`The reason is not true, so this option cannot be correct.`,
          D: L`The assertion is true because only exposed surfaces are counted.`,
        },
        hints: [
          L`Outer surface area counts only surfaces visible from outside.`,
          L`The circular face at the join is internal.`,
          L`Check the truth of the reason separately.`,
        ],
        solution: [
          {
            explanation: L`The assertion is true: a joined face is not exposed.`,
          },
          {
            explanation: L`The reason is false because counting it twice would overcount internal area.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A hemisphere of radius $7$ cm is fixed on a cylinder of radius $7$ cm and height $6$ cm. Find the curved surface area of the outside, excluding the bottom base. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        figure: cylinderHemisphereFigure,
        skillTags: ["surface_area_combination", "curved_surface_area"],
        parts: singlePart("a", L`Find the exposed curved surface area.`, 2),
        hints: [
          L`Count cylinder curved surface and hemisphere curved surface.`,
          L`Do not include the bottom base.`,
          L`Use $2\pi rh+2\pi r^2$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Sets up $2\pi rh+2\pi r^2$.` },
            { part: "a", points: 1, description: L`Gets $572$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Adding the bottom base when the question excludes it.`,
          L`Using $4\pi r^2$ for a hemisphere.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Exposed curved surface area`,
            math: L`=2\pi rh+2\pi r^2=84\pi+98\pi=182\pi=572`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cone of radius $7$ cm and slant height $10$ cm is joined to a hemisphere of radius $7$ cm. Find the exposed surface area. Take $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        figure: coneHemisphereFigure,
        skillTags: ["surface_area_combination", "cone_hemisphere"],
        parts: singlePart("a", L`Find the exposed surface area.`, 3),
        hints: [
          L`The common circular base is not exposed.`,
          L`Add cone curved surface and hemisphere curved surface.`,
          L`Use $\pi rl+2\pi r^2$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Uses cone curved surface area $\pi rl$.` },
            { part: "a", points: 1, description: L`Uses hemisphere curved surface area $2\pi r^2$.` },
            { part: "a", points: 1, description: L`Gets $528$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Counting the common circular face.`,
          L`Using cone height in place of slant height.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Exposed surface area`,
            math: L`=\pi\cdot7\cdot10+2\pi\cdot7^2=70\pi+98\pi=168\pi=528`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cone of slant height $5$ cm is fixed on a cylinder of radius $3$ cm and height $8$ cm. Find the exposed surface area including the bottom base.`,
        difficulty: 3,
        figure: coneCylinderFigure,
        skillTags: ["surface_area_combination", "exposed_base"],
        parts: singlePart("a", L`Find the exposed surface area.`, 3),
        hints: [
          L`Count cone curved surface, cylinder curved surface and bottom base.`,
          L`Do not count the circular face at the join.`,
          L`Use $\pi rl+2\pi rh+\pi r^2$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Identifies the three exposed parts correctly.` },
            { part: "a", points: 1, description: L`Sets up $15\pi+48\pi+9\pi$.` },
            { part: "a", points: 1, description: L`Gets $72\pi$ cm$^2$.` },
          ],
        },
        commonErrors: [
          L`Counting the common circular face at the join.`,
          L`Leaving out the bottom base though the question includes it.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Exposed surface area`,
            math: L`=\pi\cdot3\cdot5+2\pi\cdot3\cdot8+\pi\cdot3^2=15\pi+48\pi+9\pi=72\pi`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A medicine capsule has a cylindrical part of length $14$ mm and radius $3.5$ mm, with two hemispherical ends. Find its total outer surface area. Take $\pi=\frac{22}{7}$.`,
        difficulty: 4,
        skillTags: ["surface_area_combination", "capsule"],
        parts: singlePart("a", L`Find the total outer surface area.`, 4),
        hints: [
          L`Two hemispheres together form one sphere.`,
          L`Add the curved surface area of the cylinder and the surface area of the sphere.`,
          L`Use $2\pi rh+4\pi r^2$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Identifies two hemispheres as one sphere.` },
            { part: "a", points: 1, description: L`Finds cylindrical curved area $98\pi$ mm$^2$.` },
            { part: "a", points: 1, description: L`Finds spherical area $49\pi$ mm$^2$.` },
            { part: "a", points: 1, description: L`Gets $462$ mm$^2$.` },
          ],
        },
        commonErrors: [
          L`Adding circular end faces even though hemispheres cover the ends.`,
          L`Using diameter $3.5$ mm instead of radius $3.5$ mm.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Outer surface area`,
            math: L`=2\pi rh+4\pi r^2=2\cdot\frac{22}{7}\cdot3.5\cdot14+4\cdot\frac{22}{7}\cdot(3.5)^2`,
          },
          {
            part: "a",
            explanation: L`This equals $98\pi+49\pi=147\pi=462$ mm$^2$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A water tank has a cylindrical body of radius $7$ m and height $20$ m, with a hemispherical dome of the same radius on top. The tank stands on the ground, so its bottom is not painted. Take $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        figure: cylinderHemisphereFigure,
        skillTags: ["surface_area_application", "hemisphere_cylinder"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the curved surface area of the cylindrical body.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the curved surface area of the dome.`, points: 2 },
          { letter: "c", promptMarkdown: L`Find the total area to be painted.`, points: 2 },
        ],
        hints: [
          L`Painting excludes the bottom base on the ground.`,
          L`Use cylinder curved surface area for the body.`,
          L`Use hemisphere curved surface area for the dome.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds cylinder curved area $880$ m$^2$.` },
            { part: "b", points: 2, description: L`Finds dome area $308$ m$^2$.` },
            { part: "c", points: 2, description: L`Finds painted area $1188$ m$^2$.` },
          ],
        },
        commonErrors: [
          L`Painting the bottom base despite the ground contact.`,
          L`Using full sphere area for a hemispherical dome.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Cylinder curved area $=2\pi rh=2\cdot\frac{22}{7}\cdot7\cdot20=880$ m$^2$.`,
          },
          {
            part: "b",
            explanation: L`Dome curved area $=2\pi r^2=2\cdot\frac{22}{7}\cdot7^2=308$ m$^2$.`,
          },
          {
            part: "c",
            explanation: L`Total painted area $=880+308=1188$ m$^2$.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.5",
    title: "Volumes of Combined Solids",
    subtopic:
      "Adding volumes of non-overlapping solids in combinations of cones, cylinders, hemispheres, cubes and cuboids.",
    mc: [
      {
        questionLatex: L`A solid toy is made by joining a cone of radius $3$ cm and height $4$ cm to a hemisphere of the same radius. Its volume is`,
        difficulty: 2,
        figure: coneHemisphereFigure,
        skillTags: ["volume_combination", "cone_hemisphere"],
        choices: [L`$18\pi$ cm$^3$`, L`$24\pi$ cm$^3$`, L`$42\pi$ cm$^3$`, L`$30\pi$ cm$^3$`],
        correctLetter: "D",
        rationales: {
          A: L`This is only the hemisphere volume.`,
          B: L`This doubles the cone volume and misses the hemisphere.`,
          C: L`This adds cone surface area thinking to volume.`,
        },
        hints: [
          L`Add cone volume and hemisphere volume.`,
          L`Use $\frac13\pi r^2h$ for the cone.`,
          L`Use $\frac23\pi r^3$ for the hemisphere.`,
        ],
        solution: [
          {
            explanation: L`Cone volume $=\frac13\pi\cdot3^2\cdot4=12\pi$ and hemisphere volume $=\frac23\pi\cdot3^3=18\pi$.`,
          },
          {
            explanation: L`Total volume $=12\pi+18\pi=30\pi$ cm$^3$.`,
          },
        ],
      },
      {
        questionLatex: L`A cylinder of radius $6$ cm and height $10$ cm has a cone of the same radius and height $8$ cm fixed on top. The total volume is`,
        difficulty: 2,
        figure: coneCylinderFigure,
        skillTags: ["volume_combination", "cone_cylinder"],
        choices: [L`$360\pi$ cm$^3$`, L`$456\pi$ cm$^3$`, L`$480\pi$ cm$^3$`, L`$720\pi$ cm$^3$`],
        correctLetter: "B",
        rationales: {
          A: L`This is only the cylinder volume.`,
          C: L`This treats the cone height as if it adds directly to cylinder height.`,
          D: L`This counts the cone as a full cylinder of height $8$ cm.`,
        },
        hints: [
          L`Add cylinder volume and cone volume.`,
          L`The cone has one-third of $\pi r^2h$.`,
          L`Use the same radius $6$ cm for both solids.`,
        ],
        solution: [
          {
            explanation: L`Cylinder volume $=\pi\cdot6^2\cdot10=360\pi$ cm$^3$. Cone volume $=\frac13\pi\cdot6^2\cdot8=96\pi$ cm$^3$.`,
          },
          {
            explanation: L`Total volume $=456\pi$ cm$^3$.`,
          },
        ],
      },
      {
        questionLatex: L`A solid consists of a cylinder of radius $7$ cm and height $6$ cm with a hemisphere of the same radius attached. Its volume is`,
        difficulty: 3,
        figure: cylinderHemisphereFigure,
        skillTags: ["volume_combination", "hemisphere_cylinder"],
        choices: [L`$294\pi$ cm$^3$`, L`$\frac{686\pi}{3}$ cm$^3$`, L`$\frac{1568\pi}{3}$ cm$^3$`, L`$980\pi$ cm$^3$`],
        correctLetter: "C",
        rationales: {
          A: L`This is only the cylinder volume.`,
          B: L`This is only the hemisphere volume.`,
          D: L`This treats the hemisphere as a full cylinder-like part.`,
        },
        hints: [
          L`Find cylinder volume first.`,
          L`Find hemisphere volume separately.`,
          L`Add the two volumes.`,
        ],
        solution: [
          {
            explanation: L`Cylinder volume $=\pi\cdot7^2\cdot6=294\pi$. Hemisphere volume $=\frac23\pi\cdot7^3=\frac{686\pi}{3}$.`,
          },
          {
            explanation: L`Total volume $=294\pi+\frac{686\pi}{3}=\frac{1568\pi}{3}$ cm$^3$.`,
          },
        ],
      },
      {
        questionLatex: L`A solid is made by attaching a cube of edge $4$ cm on top of a cuboid of dimensions $10$ cm, $8$ cm and $6$ cm. Its volume is`,
        difficulty: 2,
        skillTags: ["volume_combination", "cube_cuboid"],
        choices: [L`$544$ cm$^3$`, L`$480$ cm$^3$`, L`$512$ cm$^3$`, L`$960$ cm$^3$`],
        correctLetter: "A",
        rationales: {
          B: L`This is only the cuboid volume.`,
          C: L`This adds $4^2$ instead of the cube volume $4^3$.`,
          D: L`This doubles the cuboid volume and misses the cube calculation.`,
        },
        hints: [
          L`Volumes of joined non-overlapping solids add.`,
          L`Find cuboid volume and cube volume separately.`,
          L`Use $lbh+e^3$.`,
        ],
        solution: [
          {
            explanation: L`Cuboid volume $=10\cdot8\cdot6=480$ cm$^3$ and cube volume $=4^3=64$ cm$^3$.`,
          },
          {
            explanation: L`Total volume $=480+64=544$ cm$^3$.`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): In a cone-cylinder combination of the same radius, the total volume is always $\pi r^2(h_{\text{cylinder}}+h_{\text{cone}})$. Reason (R): A cone has one-third the volume of a cylinder with the same base radius and the same height.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "cone_volume"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`The assertion is false because the cone part needs the factor $\frac13$.`,
          B: L`The assertion is not true, so both cannot be true.`,
          C: L`The reason is true: cone volume is $\frac13\pi r^2h$.`,
        },
        hints: [
          L`Write the correct volume formula for a cone.`,
          L`Compare it with the expression in the assertion.`,
          L`Now check the reason separately.`,
        ],
        solution: [
          {
            explanation: L`The correct total volume would be $\pi r^2h_{\text{cylinder}}+\frac13\pi r^2h_{\text{cone}}$, so the assertion is false.`,
          },
          {
            explanation: L`The reason is true because a cone has one-third the volume of a cylinder with the same base and height.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the volume of a cone of radius $7$ cm and height $12$ cm. Take $\pi=\frac{22}{7}$.`,
        difficulty: 1,
        skillTags: ["cone_volume", "formula"],
        parts: singlePart("a", L`Find the volume.`, 1),
        hints: [
          L`Use the cone volume formula.`,
          L`Substitute $r=7$ and $h=12$.`,
          L`Remember the factor $\frac13$.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $616$ cm$^3$.`),
        commonErrors: [
          L`Using cylinder volume instead of cone volume.`,
          L`Forgetting to square the radius.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Volume $=\frac13\pi r^2h=\frac13\cdot\frac{22}{7}\cdot7^2\cdot12=616$ cm$^3$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An ice-cream shape consists of a cone of radius $3$ cm and height $8$ cm with a hemisphere of radius $3$ cm on top. Find the total volume.`,
        difficulty: 2,
        figure: coneHemisphereFigure,
        skillTags: ["volume_combination", "ice_cream_shape"],
        parts: singlePart("a", L`Find the total volume.`, 3),
        hints: [
          L`Find cone volume and hemisphere volume separately.`,
          L`The same radius is used for both solids.`,
          L`Add the two volumes.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds cone volume $24\pi$ cm$^3$.` },
            { part: "a", points: 1, description: L`Finds hemisphere volume $18\pi$ cm$^3$.` },
            { part: "a", points: 1, description: L`Gets $42\pi$ cm$^3$.` },
          ],
        },
        commonErrors: [
          L`Using full sphere volume for the hemisphere.`,
          L`Using slant height instead of vertical height for cone volume.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Cone volume $=\frac13\pi\cdot3^2\cdot8=24\pi$ cm$^3$.`,
          },
          {
            part: "a",
            explanation: L`Hemisphere volume $=\frac23\pi\cdot3^3=18\pi$ cm$^3$. Total volume $=42\pi$ cm$^3$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A solid has a cylinder of radius $3$ cm and height $10$ cm with a hemisphere of radius $3$ cm attached on top. Find its volume.`,
        difficulty: 2,
        figure: cylinderHemisphereFigure,
        skillTags: ["volume_combination", "hemisphere_cylinder"],
        parts: singlePart("a", L`Find the total volume.`, 3),
        hints: [
          L`Add cylinder volume and hemisphere volume.`,
          L`Use radius $3$ cm in both.`,
          L`Keep the answer in terms of $\pi$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds cylinder volume $90\pi$ cm$^3$.` },
            { part: "a", points: 1, description: L`Finds hemisphere volume $18\pi$ cm$^3$.` },
            { part: "a", points: 1, description: L`Gets $108\pi$ cm$^3$.` },
          ],
        },
        commonErrors: [
          L`Using surface area formulas instead of volume formulas.`,
          L`Treating the hemisphere as a full sphere.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Cylinder volume $=\pi\cdot3^2\cdot10=90\pi$ cm$^3$.`,
          },
          {
            part: "a",
            explanation: L`Hemisphere volume $=\frac23\pi\cdot3^3=18\pi$ cm$^3$. Total volume $=108\pi$ cm$^3$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A solid is formed by fixing a hemisphere of radius $7$ cm on a cylinder of the same radius. Its outer curved surface area, excluding the bottom base, is $924$ cm$^2$. Find the height of the cylinder and then find the volume of the solid. Take $\pi=\frac{22}{7}$.`,
        difficulty: 5,
        figure: cylinderHemisphereFigure,
        skillTags: ["multi_step_combination", "surface_area_to_volume"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the height of the cylinder.`, points: 3 },
          { letter: "b", promptMarkdown: L`Find the volume of the solid.`, points: 3 },
        ],
        hints: [
          L`The given surface area is $2\pi rh+2\pi r^2$.`,
          L`Use $r=7$ to solve for $h$.`,
          L`Then add cylinder volume and hemisphere volume.`,
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            { part: "a", points: 1, description: L`Sets $2\pi rh+2\pi r^2=924$.` },
            { part: "a", points: 1, description: L`Substitutes $r=7$ correctly.` },
            { part: "a", points: 1, description: L`Finds $h=14$ cm.` },
            { part: "b", points: 1, description: L`Finds cylinder volume $2156$ cm$^3$.` },
            { part: "b", points: 1, description: L`Finds hemisphere volume $\frac{2156}{3}$ cm$^3$.` },
            { part: "b", points: 1, description: L`Finds total volume $\frac{8624}{3}$ cm$^3$.` },
          ],
        },
        commonErrors: [
          L`Adding the bottom base to the given curved surface area equation.`,
          L`Using the solved surface area directly as volume.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Given curved outer area`,
            math: L`2\pi rh+2\pi r^2=924`,
          },
          {
            part: "a",
            explanation: L`With $r=7$, $2\cdot\frac{22}{7}\cdot7h+2\cdot\frac{22}{7}\cdot49=924$, so $44h+308=924$ and $h=14$ cm.`,
          },
          {
            part: "b",
            explanation: L`Cylinder volume $=\frac{22}{7}\cdot7^2\cdot14=2156$ cm$^3$.`,
          },
          {
            part: "b",
            explanation: L`Hemisphere volume $=\frac23\cdot\frac{22}{7}\cdot7^3=\frac{2156}{3}$ cm$^3$. Therefore total volume $=\frac{8624}{3}$ cm$^3$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A decorative tower model has a cylindrical part of radius $4$ cm and height $9$ cm, with a cone of the same radius and height $3$ cm fixed on top.`,
        difficulty: 3,
        figure: coneCylinderFigure,
        skillTags: ["volume_application", "cone_cylinder"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the volume of the cylindrical part.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the volume of the conical part.`, points: 2 },
          { letter: "c", promptMarkdown: L`Find the total volume of the model.`, points: 2 },
        ],
        hints: [
          L`Use $\pi r^2h$ for the cylinder.`,
          L`Use $\frac13\pi r^2h$ for the cone.`,
          L`Add the two volumes.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds cylinder volume $144\pi$ cm$^3$.` },
            { part: "b", points: 2, description: L`Finds cone volume $16\pi$ cm$^3$.` },
            { part: "c", points: 2, description: L`Finds total volume $160\pi$ cm$^3$.` },
          ],
        },
        commonErrors: [
          L`Treating the cone as another cylinder.`,
          L`Adding heights first and using one cylinder formula for the whole model.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Cylinder volume $=\pi\cdot4^2\cdot9=144\pi$ cm$^3$.`,
          },
          {
            part: "b",
            explanation: L`Cone volume $=\frac13\pi\cdot4^2\cdot3=16\pi$ cm$^3$.`,
          },
          {
            part: "c",
            explanation: L`Total volume $=144\pi+16\pi=160\pi$ cm$^3$.`,
          },
        ],
      },
    ],
  },
];

export const mensurationXTopics: Topic[] = [...topicSeeds].map(makeTopic);
