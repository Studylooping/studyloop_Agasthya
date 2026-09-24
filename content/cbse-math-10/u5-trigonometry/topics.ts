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
const UNIT = "u5-trigonometry";
const VERSION = "0.1.2";
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
  return `You chose ${choiceText}. Match the right triangle, ratio, identity, or line-of-sight relation before substituting.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class10_trigonometry_reasoning"),
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_opposite_adjacent_hypotenuse_or_standard_trig_values",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_trigonometric_result_without_identifying_the_correct_triangle_or_identity",
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

const ratioTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Right triangle ratio labels",
  description:
    "A right triangle labels the hypotenuse, side opposite the marked acute angle, and side adjacent to it.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <polygon points="130,285 130,80 470,285" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <path d="M130 252 H163 V285" fill="none" stroke="#475569" stroke-width="3"/>
  <path d="M188 285 A58 58 0 0 0 160 237" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="192" y="261" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#f97316">&#952;</text>
  <text x="108" y="306" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">A</text>
  <text x="110" y="72" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">B</text>
  <text x="482" y="307" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">C</text>
  <text x="76" y="180" font-family="Arial, sans-serif" font-size="16" fill="#334155">opposite</text>
  <text x="268" y="314" font-family="Arial, sans-serif" font-size="16" fill="#334155">adjacent</text>
  <text x="304" y="166" font-family="Arial, sans-serif" font-size="16" fill="#334155">hypotenuse</text>
</svg>`,
};

const standardTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Standard 30-60-90 triangle",
  description:
    "An equilateral triangle is split into two congruent 30-60-90 right triangles.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <polygon points="310,58 120,310 500,310" fill="#fff7ed" stroke="#f97316" stroke-width="4"/>
  <line x1="310" y1="58" x2="310" y2="310" stroke="#2563eb" stroke-width="4"/>
  <path d="M310 278 H342 V310" fill="none" stroke="#475569" stroke-width="3"/>
  <text x="294" y="48" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">A</text>
  <text x="100" y="335" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">B</text>
  <text x="510" y="335" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">C</text>
  <text x="318" y="337" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">D</text>
  <text x="372" y="190" font-family="Arial, sans-serif" font-size="16" fill="#334155">2</text>
  <text x="195" y="333" font-family="Arial, sans-serif" font-size="16" fill="#334155">1</text>
  <text x="322" y="190" font-family="Arial, sans-serif" font-size="16" fill="#334155">&#8730;3</text>
  <text x="156" y="291" font-family="Arial, sans-serif" font-size="16" fill="#f97316">60&#176;</text>
  <text x="334" y="92" font-family="Arial, sans-serif" font-size="16" fill="#f97316">30&#176;</text>
</svg>`,
};

const equilateralAltitudeFigure: ItemFigure = {
  type: "svg",
  title: "Altitude in an equilateral triangle",
  description:
    "An equilateral triangle has an altitude drawn from the top vertex to the midpoint of the base.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <polygon points="310,58 120,310 500,310" fill="#fff7ed" stroke="#f97316" stroke-width="4"/>
  <line x1="310" y1="58" x2="310" y2="310" stroke="#2563eb" stroke-width="4"/>
  <path d="M310 278 H342 V310" fill="none" stroke="#475569" stroke-width="3"/>
  <circle cx="310" cy="58" r="5" fill="#f97316"/>
  <circle cx="120" cy="310" r="5" fill="#f97316"/>
  <circle cx="500" cy="310" r="5" fill="#f97316"/>
  <circle cx="310" cy="310" r="5" fill="#2563eb"/>
  <text x="294" y="46" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">A</text>
  <text x="100" y="335" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">B</text>
  <text x="510" y="335" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">C</text>
  <text x="318" y="298" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">D</text>
  <text x="192" y="174" font-family="Arial, sans-serif" font-size="16" fill="#334155">2 units</text>
  <text x="408" y="174" font-family="Arial, sans-serif" font-size="16" fill="#334155">2 units</text>
  <text x="286" y="358" font-family="Arial, sans-serif" font-size="16" fill="#334155">2 units</text>
</svg>`,
};

const elevationFigure: ItemFigure = {
  type: "svg",
  title: "Angle of elevation setup",
  description:
    "A ground observer views the top of a vertical object, forming a right triangle with the ground.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <line x1="90" y1="292" x2="590" y2="292" stroke="#64748b" stroke-width="3"/>
  <line x1="500" y1="292" x2="500" y2="74" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <line x1="150" y1="292" x2="500" y2="74" stroke="#16a34a" stroke-width="4"/>
  <path d="M211 292 A61 61 0 0 0 202 260" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="213" y="268" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#f97316">&#952;</text>
  <text x="122" y="318" font-family="Arial, sans-serif" font-size="16" fill="#334155">observer</text>
  <text x="478" y="318" font-family="Arial, sans-serif" font-size="16" fill="#334155">base</text>
  <text x="512" y="188" font-family="Arial, sans-serif" font-size="16" fill="#1d4ed8">height</text>
  <text x="296" y="316" font-family="Arial, sans-serif" font-size="16" fill="#334155">horizontal distance</text>
</svg>`,
};

const depressionFigure: ItemFigure = {
  type: "svg",
  title: "Angle of depression setup",
  description:
    "A horizontal line from an elevated observer and a line of sight to an object below show equal depression and elevation angles.",
  svg: `<svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="380" fill="#ffffff"/>
  <line x1="112" y1="310" x2="610" y2="310" stroke="#64748b" stroke-width="3"/>
  <line x1="185" y1="310" x2="185" y2="80" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <line x1="185" y1="80" x2="570" y2="80" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8 8"/>
  <line x1="185" y1="80" x2="470" y2="310" stroke="#16a34a" stroke-width="4"/>
  <path d="M244 80 A59 59 0 0 1 230 118" fill="none" stroke="#f97316" stroke-width="4"/>
  <path d="M425 310 A56 56 0 0 0 410 273" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="246" y="113" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#f97316">depression</text>
  <text x="354" y="292" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#f97316">elevation</text>
  <text x="132" y="204" font-family="Arial, sans-serif" font-size="16" fill="#1d4ed8">height</text>
  <text x="442" y="336" font-family="Arial, sans-serif" font-size="16" fill="#334155">object</text>
</svg>`,
};

const twoObservationFigure: ItemFigure = {
  type: "svg",
  title: "Two observations of one tower",
  description:
    "Two points on the same straight ground line observe the top of a tower at different angles of elevation.",
  svg: `<svg viewBox="0 0 700 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="390" fill="#ffffff"/>
  <line x1="80" y1="322" x2="620" y2="322" stroke="#64748b" stroke-width="3"/>
  <line x1="560" y1="322" x2="560" y2="76" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <line x1="160" y1="322" x2="560" y2="76" stroke="#16a34a" stroke-width="4"/>
  <line x1="400" y1="322" x2="560" y2="76" stroke="#f97316" stroke-width="4"/>
  <circle cx="160" cy="322" r="6" fill="#334155"/>
  <circle cx="400" cy="322" r="6" fill="#334155"/>
  <circle cx="560" cy="76" r="7" fill="#dc2626"/>
  <text x="145" y="348" font-family="Arial, sans-serif" font-size="16" fill="#334155">far point</text>
  <text x="370" y="348" font-family="Arial, sans-serif" font-size="16" fill="#334155">near point</text>
  <text x="573" y="204" font-family="Arial, sans-serif" font-size="16" fill="#1d4ed8">tower</text>
  <text x="204" y="305" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#16a34a">30&#176;</text>
  <text x="422" y="293" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#f97316">60&#176;</text>
</svg>`,
};

const towerFlagFigure: ItemFigure = {
  type: "svg",
  title: "Tower with flagstaff",
  description:
    "From one ground point, two lines of sight reach the top of a tower and the top of a flagstaff on it.",
  svg: `<svg viewBox="0 0 700 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="390" fill="#ffffff"/>
  <line x1="84" y1="326" x2="620" y2="326" stroke="#64748b" stroke-width="3"/>
  <line x1="520" y1="326" x2="520" y2="126" stroke="#2563eb" stroke-width="10" stroke-linecap="round"/>
  <line x1="520" y1="126" x2="520" y2="62" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
  <path d="M520 62 L575 82 L520 102 Z" fill="#f97316"/>
  <line x1="150" y1="326" x2="520" y2="126" stroke="#16a34a" stroke-width="4"/>
  <line x1="150" y1="326" x2="520" y2="62" stroke="#f97316" stroke-width="4"/>
  <path d="M205 326 A55 55 0 0 0 198 299" fill="none" stroke="#16a34a" stroke-width="4"/>
  <path d="M228 326 A78 78 0 0 0 214 281" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="209" y="304" font-family="Arial, sans-serif" font-size="16" fill="#16a34a">lower angle</text>
  <text x="234" y="279" font-family="Arial, sans-serif" font-size="16" fill="#f97316">upper angle</text>
  <text x="116" y="351" font-family="Arial, sans-serif" font-size="16" fill="#334155">observer</text>
  <text x="536" y="232" font-family="Arial, sans-serif" font-size="16" fill="#1d4ed8">tower</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Trigonometric Ratios in Right Triangles",
    subtopic:
      "Identifying opposite, adjacent and hypotenuse sides and forming the six trigonometric ratios for acute angles.",
    mc: [
      {
        questionLatex: L`In a right triangle, the side opposite acute angle $A$ is $5$ cm and the hypotenuse is $13$ cm. The value of $\sin A$ is`,
        difficulty: 1,
        skillTags: ["trig_ratio_definition", "right_triangle"],
        choices: [L`$\frac{5}{13}$`, L`$\frac{12}{13}$`, L`$\frac{5}{12}$`, L`$\frac{13}{5}$`],
        correctLetter: "A",
        rationales: {
          B: L`This is $\cos A$ after finding the adjacent side, not $\sin A$.`,
          C: L`This uses opposite over adjacent, which is $\tan A$.`,
          D: L`This reverses the sine ratio. The hypotenuse should be in the denominator.`,
        },
        hints: [
          L`Sine compares the opposite side with the hypotenuse.`,
          L`Use $\sin A=\frac{\text{opposite}}{\text{hypotenuse}}$.`,
          L`Substitute opposite $5$ and hypotenuse $13$.`,
        ],
        solution: [
          {
            explanation: L`For an acute angle in a right triangle, sine is opposite over hypotenuse.`,
            math: L`\sin A=\frac{5}{13}`,
          },
        ],
      },
      {
        questionLatex: L`If $A$ is acute and $\tan A=\frac{3}{4}$, then $\sec A$ is`,
        difficulty: 2,
        skillTags: ["trig_ratio_from_tangent", "pythagorean_triple"],
        choices: [L`$\frac{4}{5}$`, L`$\frac{5}{4}$`, L`$\frac{3}{5}$`, L`$\frac{5}{3}$`],
        correctLetter: "B",
        rationales: {
          A: L`This is $\cos A$, not $\sec A$. Secant is the reciprocal of cosine.`,
          C: L`This is $\sin A$, using the opposite side over the hypotenuse.`,
          D: L`This is $\csc A$, the reciprocal of sine.`,
        },
        hints: [
          L`Treat $\tan A=\frac{3}{4}$ as opposite:adjacent.`,
          L`The hypotenuse is $5$ by the $3$-$4$-$5$ triangle.`,
          L`$\sec A=\frac{\text{hypotenuse}}{\text{adjacent}}$.`,
        ],
        solution: [
          {
            explanation: L`Let opposite $=3k$ and adjacent $=4k$. Then the hypotenuse is $5k$.`,
          },
          {
            explanation: L`Therefore $\sec A=\frac{\text{hypotenuse}}{\text{adjacent}}=\frac{5k}{4k}=\frac54$.`,
          },
        ],
      },
      {
        questionLatex: L`For an acute angle $\theta$, $\cos\theta=\frac{8}{17}$. The value of $\sin\theta$ is`,
        difficulty: 2,
        skillTags: ["trig_ratio_from_cosine", "pythagorean_triple"],
        choices: [L`$\frac{8}{15}$`, L`$\frac{17}{15}$`, L`$\frac{8}{17}$`, L`$\frac{15}{17}$`],
        correctLetter: "D",
        rationales: {
          A: L`This divides adjacent by opposite. Sine needs opposite over hypotenuse.`,
          B: L`This reverses the sine ratio and gives a value greater than $1$.`,
          C: L`This repeats $\cos\theta$ instead of finding the opposite side.`,
        },
        hints: [
          L`Cosine is adjacent over hypotenuse.`,
          L`Use the $8$-$15$-$17$ right triangle.`,
          L`Sine is opposite over hypotenuse.`,
        ],
        solution: [
          {
            explanation: L`Since $\cos\theta=\frac{8}{17}$, the adjacent side may be $8$ and the hypotenuse $17$.`,
          },
          {
            explanation: L`The opposite side is $\sqrt{17^2-8^2}=15$, so`,
            math: L`\sin\theta=\frac{15}{17}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): In two right triangles having the same acute angle $\theta$, the value of $\sin\theta$ is the same. Reason (R): The two right triangles are similar by the AA criterion.`,
        difficulty: 3,
        figure: ratioTriangleFigure,
        skillTags: ["assertion_reason", "well_defined_trig_ratios"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason is exactly why the side ratio stays fixed for the same acute angle.`,
          C: L`The reason is true: two right triangles with one equal acute angle are similar.`,
          D: L`The assertion is true because corresponding side ratios in similar triangles are equal.`,
        },
        hints: [
          L`Ask why a trigonometric ratio does not depend on the size of the triangle.`,
          L`Right angle plus the same acute angle gives AA similarity.`,
          L`Similar triangles have equal corresponding side ratios.`,
        ],
        solution: [
          {
            explanation: L`The two triangles have one right angle and the same acute angle, so they are similar by AA.`,
          },
          {
            explanation: L`Corresponding side ratios are equal in similar triangles; hence $\sin\theta$ has the same value. R correctly explains A.`,
          },
        ],
      },
      {
        questionLatex: L`If $A$ is acute and $\csc A=\frac{13}{5}$, then $\cot A$ equals`,
        difficulty: 3,
        skillTags: ["reciprocal_ratios", "pythagorean_triple"],
        choices: [L`$\frac{5}{12}$`, L`$\frac{13}{12}$`, L`$\frac{12}{5}$`, L`$\frac{5}{13}$`],
        correctLetter: "C",
        rationales: {
          A: L`This is $\tan A$, not $\cot A$.`,
          B: L`This uses hypotenuse over adjacent, which is $\sec A$.`,
          D: L`This is $\sin A$, the reciprocal of $\csc A$.`,
        },
        hints: [
          L`$\csc A=\frac{13}{5}$ means $\sin A=\frac{5}{13}$.`,
          L`Use a right triangle with opposite $5$ and hypotenuse $13$.`,
          L`Find adjacent $12$, then use $\cot A=\frac{\text{adjacent}}{\text{opposite}}$.`,
        ],
        solution: [
          {
            explanation: L`Let opposite $=5k$ and hypotenuse $=13k$. Then adjacent $=12k$.`,
          },
          {
            explanation: L`Therefore`,
            math: L`\cot A=\frac{12k}{5k}=\frac{12}{5}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $15$ m ladder reaches a point $12$ m above the ground on a wall. Find the cosine of the angle made by the ladder with the ground.`,
        difficulty: 2,
        skillTags: ["right_triangle", "cosine_ratio"],
        parts: singlePart("a", L`Find $\cos\theta$, where $\theta$ is the angle with the ground.`, 2),
        hints: [
          L`The ladder is the hypotenuse.`,
          L`First find the horizontal distance from the wall.`,
          L`Use $\cos\theta=\frac{\text{adjacent}}{\text{hypotenuse}}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds the base distance $9$ m.` },
            { part: "a", points: 1, description: L`Gives $\cos\theta=\frac35$.` },
          ],
        },
        commonErrors: [
          L`Using the vertical height as the adjacent side for the angle with the ground.`,
          L`Reporting $\frac{12}{15}$, which is sine for this angle.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The horizontal distance is $\sqrt{15^2-12^2}=9$ m.`,
          },
          {
            part: "a",
            explanation: L`For the angle with the ground, adjacent $=9$ and hypotenuse $=15$, so $\cos\theta=\frac{9}{15}=\frac35$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`If $A$ is acute and $\tan A=\frac{5}{12}$, find $\sin A$ and $\cos A$.`,
        difficulty: 2,
        skillTags: ["trig_ratio_from_tangent", "right_triangle"],
        parts: singlePart("a", L`Find both ratios.`, 3),
        hints: [
          L`Use opposite:adjacent $=5:12$.`,
          L`Find the hypotenuse using Pythagoras theorem.`,
          L`Then write sine and cosine from the triangle.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Sets opposite and adjacent in the ratio $5:12$.` },
            { part: "a", points: 1, description: L`Finds hypotenuse proportional to $13$.` },
            { part: "a", points: 1, description: L`Finds $\sin A=\frac{5}{13}$ and $\cos A=\frac{12}{13}$.` },
          ],
        },
        commonErrors: [
          L`Treating tangent as opposite over hypotenuse.`,
          L`Giving reciprocal ratios instead of sine and cosine.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let the opposite side be $5k$ and the adjacent side be $12k$. Then the hypotenuse is $13k$.`,
          },
          {
            part: "a",
            explanation: L`Thus $\sin A=\frac{5k}{13k}=\frac{5}{13}$ and $\cos A=\frac{12k}{13k}=\frac{12}{13}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In right $\triangle ABC$, $\angle B=90^\circ$, $AB=7$ cm and $BC=24$ cm. Find $\sin C$, $\cos C$ and $\tan C$.`,
        difficulty: 2,
        skillTags: ["opposite_adjacent_identification", "right_triangle"],
        parts: singlePart("a", L`Find the three ratios with respect to angle $C$.`, 3),
        hints: [
          L`First find $AC$.`,
          L`For angle $C$, the opposite side is $AB$ and the adjacent side is $BC$.`,
          L`Use sine, cosine and tangent definitions.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds $AC=25$ cm.` },
            { part: "a", points: 1, description: L`Correctly identifies opposite and adjacent sides for angle $C$.` },
            { part: "a", points: 1, description: L`Gives all three ratios correctly.` },
          ],
        },
        commonErrors: [
          L`Using angle $A$ instead of angle $C$.`,
          L`Interchanging sine and cosine.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$AC=\sqrt{7^2+24^2}=25$ cm.`,
          },
          {
            part: "a",
            explanation: L`With respect to angle $C$, opposite $=AB=7$, adjacent $=BC=24$ and hypotenuse $=AC=25$.`,
          },
          {
            part: "a",
            explanation: L`So $\sin C=\frac{7}{25}$, $\cos C=\frac{24}{25}$ and $\tan C=\frac{7}{24}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Using the definitions of trigonometric ratios in a right triangle, prove that $\sin A\sec A=\tan A$ and $\cos A\csc A=\cot A$ for an acute angle $A$.`,
        difficulty: 3,
        skillTags: ["trig_ratio_relations", "proof"],
        parts: singlePart("a", L`Prove both relations.`, 4),
        hints: [
          L`Write $\sec A$ and $\csc A$ as reciprocals.`,
          L`Multiply the ratios before simplifying.`,
          L`Use $\tan A=\frac{\sin A}{\cos A}$ and $\cot A=\frac{\cos A}{\sin A}$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`States the reciprocal relations for secant and cosecant.` },
            { part: "a", points: 1, description: L`Proves $\sin A\sec A=\tan A$.` },
            { part: "a", points: 1, description: L`Proves $\cos A\csc A=\cot A$.` },
            { part: "a", points: 1, description: L`Keeps the argument valid for acute angles in right triangles.` },
          ],
        },
        commonErrors: [
          L`Using $\sec A=\sin A$ or $\csc A=\cos A$.`,
          L`Writing identities without showing the reciprocal step.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Since $\sec A=\frac{1}{\cos A}$,`,
            math: L`\sin A\sec A=\sin A\cdot\frac{1}{\cos A}=\frac{\sin A}{\cos A}=\tan A`,
          },
          {
            part: "a",
            explanation: L`Similarly, since $\csc A=\frac{1}{\sin A}$,`,
            math: L`\cos A\csc A=\cos A\cdot\frac{1}{\sin A}=\frac{\cos A}{\sin A}=\cot A`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school ramp rises $1.2$ m while its horizontal run is $1.6$ m. Let $\theta$ be the angle that the ramp makes with the ground.`,
        difficulty: 3,
        skillTags: ["right_triangle_application", "trig_ratios"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the length of the ramp.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find $\sin\theta$ and $\cos\theta$.`, points: 2 },
          { letter: "c", promptMarkdown: L`Find $\tan\theta$ and state what it compares in this ramp.`, points: 1 },
        ],
        hints: [
          L`The rise and run are perpendicular sides of a right triangle.`,
          L`The ramp length is the hypotenuse.`,
          L`For angle with the ground, rise is opposite and run is adjacent.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds ramp length $2$ m.` },
            { part: "b", points: 2, description: L`Finds $\sin\theta=\frac35$ and $\cos\theta=\frac45$.` },
            { part: "c", points: 1, description: L`Finds $\tan\theta=\frac34$ and connects it to rise per horizontal run.` },
          ],
        },
        commonErrors: [
          L`Using the horizontal run as the hypotenuse.`,
          L`Forgetting that tangent compares rise with horizontal run.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Ramp length $=\sqrt{1.2^2+1.6^2}=\sqrt{4}=2$ m.`,
          },
          {
            part: "b",
            explanation: L`$\sin\theta=\frac{1.2}{2}=\frac35$ and $\cos\theta=\frac{1.6}{2}=\frac45$.`,
          },
          {
            part: "c",
            explanation: L`$\tan\theta=\frac{1.2}{1.6}=\frac34$. It compares vertical rise with horizontal run.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Standard Angles and Exact Values",
    subtopic:
      "Using the exact values of trigonometric ratios for 30, 45 and 60 degrees.",
    mc: [
      {
        questionLatex: L`The value of $\sin30^\circ+\cos60^\circ$ is`,
        difficulty: 1,
        skillTags: ["standard_values", "thirty_sixty_degrees"],
        choices: [L`$\frac12$`, L`$\frac{\sqrt3}{2}$`, L`$2$`, L`$1$`],
        correctLetter: "D",
        rationales: {
          A: L`This uses only one of the two terms.`,
          B: L`This is the value of $\sin60^\circ$ or $\cos30^\circ$, not the sum here.`,
          C: L`Each term is $\frac12$, so the sum cannot be $2$.`,
        },
        hints: [
          L`Recall the values of $\sin30^\circ$ and $\cos60^\circ$.`,
          L`Both are equal to $\frac12$.`,
          L`Add the two values.`,
        ],
        solution: [
          {
            explanation: L`Use standard values.`,
            math: L`\sin30^\circ+\cos60^\circ=\frac12+\frac12=1`,
          },
        ],
      },
      {
        questionLatex: L`The value of $\tan60^\circ\cdot\sin30^\circ$ is`,
        difficulty: 2,
        skillTags: ["standard_values", "product"],
        choices: [L`$\sqrt3$`, L`$\frac{\sqrt3}{2}$`, L`$\frac{1}{2\sqrt3}$`, L`$\frac32$`],
        correctLetter: "B",
        rationales: {
          A: L`This uses only $\tan60^\circ$ and forgets the factor $\sin30^\circ=\frac12$.`,
          C: L`This uses $\tan30^\circ$ instead of $\tan60^\circ$.`,
          D: L`This incorrectly treats $\sqrt3\cdot\frac12$ as $\frac32$.`,
        },
        hints: [
          L`Use $\tan60^\circ=\sqrt3$.`,
          L`Use $\sin30^\circ=\frac12$.`,
          L`Multiply the two exact values.`,
        ],
        solution: [
          {
            explanation: L`Substitute the standard values.`,
            math: L`\tan60^\circ\cdot\sin30^\circ=\sqrt3\cdot\frac12=\frac{\sqrt3}{2}`,
          },
        ],
      },
      {
        questionLatex: L`The value of $\sin90^\circ+\cos0^\circ-\tan0^\circ$ is`,
        difficulty: 2,
        skillTags: ["standard_values", "zero_ninety_values"],
        choices: [L`$1$`, L`$0$`, L`$2$`, L`not defined`],
        correctLetter: "C",
        rationales: {
          A: L`This misses one of the two ratios equal to $1$.`,
          B: L`This treats $\sin90^\circ+\cos0^\circ$ as if it were cancelled by $\tan0^\circ$.`,
          D: L`Each ratio in the expression is defined: $\sin90^\circ=1$, $\cos0^\circ=1$ and $\tan0^\circ=0$.`,
        },
        hints: [
          L`Recall the standard values at $0^\circ$ and $90^\circ$ where they are defined.`,
          L`Here $\sin90^\circ$ and $\cos0^\circ$ are both $1$.`,
          L`$\tan0^\circ=0$, so the expression becomes $1+1-0$.`,
        ],
        solution: [
          {
            explanation: L`Use exact values.`,
            math: L`\sin90^\circ+\cos0^\circ-\tan0^\circ=1+1-0=2`,
          },
        ],
      },
      {
        questionLatex: L`The value of $2\cos30^\circ\sin60^\circ-\tan^245^\circ$ is`,
        difficulty: 3,
        skillTags: ["standard_values", "expression_evaluation"],
        choices: [L`$\frac12$`, L`$1$`, L`$\frac32$`, L`$0$`],
        correctLetter: "A",
        rationales: {
          B: L`This forgets to subtract $\tan^245^\circ=1$.`,
          C: L`This is only $2\cos30^\circ\sin60^\circ$.`,
          D: L`This treats the first product as $1$ instead of $\frac32$.`,
        },
        hints: [
          L`Use $\cos30^\circ=\sin60^\circ=\frac{\sqrt3}{2}$.`,
          L`Compute the product before subtracting.`,
          L`Remember $\tan45^\circ=1$.`,
        ],
        solution: [
          {
            explanation: L`Substitute exact values.`,
            math: L`2\cdot\frac{\sqrt3}{2}\cdot\frac{\sqrt3}{2}-1^2=\frac32-1=\frac12`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): $\sin30^\circ=\cos60^\circ$. Reason (R): For complementary acute angles, $\sin A=\cos(90^\circ-A)$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "complementary_ratios"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains why the two complementary-angle values are equal.`,
          C: L`The complementary-angle relation is true for acute angles in right triangles.`,
          D: L`The assertion is true because $30^\circ$ and $60^\circ$ are complementary.`,
        },
        hints: [
          L`Check the numerical values first.`,
          L`Then check whether the reason gives the general relationship.`,
          L`$60^\circ=90^\circ-30^\circ$.`,
        ],
        solution: [
          {
            explanation: L`$\sin30^\circ=\frac12$ and $\cos60^\circ=\frac12$, so the assertion is true.`,
          },
          {
            explanation: L`The reason is the complementary-angle relation and correctly explains the assertion.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In a standard-angle warm-up for trigonometry, evaluate $\cos0^\circ+\tan45^\circ$.`,
        difficulty: 1,
        skillTags: ["standard_values", "sum"],
        parts: singlePart("a", L`Find the exact value of the trigonometric expression.`, 1),
        hints: [
          L`Recall $\cos0^\circ$.`,
          L`Recall $\tan45^\circ$.`,
          L`Add the two exact values.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $2$.`),
        commonErrors: [
          L`Using $\cos0^\circ=0$ instead of $1$.`,
          L`Forgetting to add the two values.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\cos0^\circ+\tan45^\circ=1+1=2$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Evaluate $\sin^260^\circ+\cos^230^\circ+\tan^230^\circ$.`,
        difficulty: 3,
        skillTags: ["standard_values", "squares"],
        parts: singlePart("a", L`Find the exact value.`, 3),
        hints: [
          L`Square each standard value separately.`,
          L`$\sin60^\circ$ and $\cos30^\circ$ are both $\frac{\sqrt3}{2}$.`,
          L`$\tan30^\circ=\frac{1}{\sqrt3}$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Substitutes correct standard values.` },
            { part: "a", points: 1, description: L`Squares them correctly.` },
            { part: "a", points: 1, description: L`Gets $\frac{11}{6}$.` },
          ],
        },
        commonErrors: [
          L`Forgetting to square $\tan30^\circ$.`,
          L`Adding $\frac{\sqrt3}{2}$ values before squaring without justification.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Substitute the standard values.`,
            math: L`\left(\frac{\sqrt3}{2}\right)^2+\left(\frac{\sqrt3}{2}\right)^2+\left(\frac{1}{\sqrt3}\right)^2`,
          },
          {
            part: "a",
            explanation: L`Therefore the value is $\frac34+\frac34+\frac13=\frac32+\frac13=\frac{11}{6}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Using a $30^\circ$-$60^\circ$-$90^\circ$ triangle with side ratios $1:\sqrt3:2$, find $\tan60^\circ$ and $\cot60^\circ$.`,
        difficulty: 2,
        figure: standardTriangleFigure,
        skillTags: ["standard_triangle", "tangent_cotangent"],
        parts: singlePart("a", L`Find both values.`, 2),
        hints: [
          L`For $60^\circ$, identify the opposite and adjacent sides.`,
          L`Use $\tan=\frac{\text{opposite}}{\text{adjacent}}$.`,
          L`Cotangent is the reciprocal of tangent.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $\tan60^\circ=\sqrt3$.` },
            { part: "a", points: 1, description: L`Finds $\cot60^\circ=\frac{1}{\sqrt3}$.` },
          ],
        },
        commonErrors: [
          L`Using the $30^\circ$ angle sides instead of the $60^\circ$ angle sides.`,
          L`Writing cotangent equal to tangent.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For the $60^\circ$ angle, opposite $=\sqrt3$ and adjacent $=1$ in the standard triangle.`,
          },
          {
            part: "a",
            explanation: L`Thus $\tan60^\circ=\sqrt3$ and $\cot60^\circ=\frac{1}{\sqrt3}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An equilateral triangle of side $2$ units is divided into two congruent right triangles by drawing an altitude. Use this construction to obtain $\sin60^\circ$, $\cos60^\circ$ and $\tan60^\circ$.`,
        difficulty: 3,
        figure: equilateralAltitudeFigure,
        skillTags: ["derive_standard_values", "right_triangle"],
        parts: singlePart("a", L`Derive the three values.`, 4),
        hints: [
          L`The altitude bisects the base of the equilateral triangle.`,
          L`Find the altitude using Pythagoras theorem.`,
          L`Use the right triangle containing the $60^\circ$ angle.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`States that half the base is $1$ unit.` },
            { part: "a", points: 1, description: L`Finds altitude $\sqrt3$ units.` },
            { part: "a", points: 1, description: L`Finds $\sin60^\circ$ and $\cos60^\circ$.` },
            { part: "a", points: 1, description: L`Finds $\tan60^\circ$.` },
          ],
        },
        commonErrors: [
          L`Using the full base $2$ as the side adjacent to $60^\circ$.`,
          L`Forgetting that the altitude creates a right angle.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The altitude bisects the base, so each half is $1$ unit. The hypotenuse is $2$ units.`,
          },
          {
            part: "a",
            explanation: L`Altitude $=\sqrt{2^2-1^2}=\sqrt3$ units.`,
          },
          {
            part: "a",
            explanation: L`For the $60^\circ$ angle, opposite $=\sqrt3$, adjacent $=1$ and hypotenuse $=2$.`,
          },
          {
            part: "a",
            explanation: L`Therefore $\sin60^\circ=\frac{\sqrt3}{2}$, $\cos60^\circ=\frac12$ and $\tan60^\circ=\sqrt3$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A triangular traffic sign is equilateral with side $2$ m. A vertical support is fixed from its top vertex to the midpoint of the base.`,
        difficulty: 3,
        figure: equilateralAltitudeFigure,
        skillTags: ["standard_triangle_application", "exact_values"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the height of the sign.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the sine of each base angle.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find $\tan30^\circ$ using one of the right triangles.`, points: 2 },
        ],
        hints: [
          L`The support bisects the base and forms two right triangles.`,
          L`Each base angle of an equilateral triangle is $60^\circ$.`,
          L`The top angle in each small right triangle is $30^\circ$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds height $\sqrt3$ m.` },
            { part: "b", points: 1, description: L`Gives $\sin60^\circ=\frac{\sqrt3}{2}$.` },
            { part: "c", points: 2, description: L`Uses the correct sides and finds $\tan30^\circ=\frac{1}{\sqrt3}$.` },
          ],
        },
        commonErrors: [
          L`Taking the whole base as adjacent in one right triangle.`,
          L`Confusing the $30^\circ$ and $60^\circ$ angles after drawing the altitude.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Each half of the base is $1$ m, so the height is $\sqrt{2^2-1^2}=\sqrt3$ m.`,
          },
          {
            part: "b",
            explanation: L`Each base angle is $60^\circ$, so $\sin60^\circ=\frac{\sqrt3}{2}$.`,
          },
          {
            part: "c",
            explanation: L`In the small right triangle, the $30^\circ$ angle has opposite side $1$ and adjacent side $\sqrt3$, so $\tan30^\circ=\frac{1}{\sqrt3}$.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Trigonometric Identities",
    subtopic:
      "Applying sin^2 A + cos^2 A = 1 and its simple consequences.",
    mc: [
      {
        questionLatex: L`If $\sin A=\frac35$ for an acute angle $A$, then $1-\cos^2A$ equals`,
        difficulty: 2,
        skillTags: ["identity_application", "sine_cosine_identity"],
        choices: [L`$\frac{16}{25}$`, L`$\frac45$`, L`$\frac{9}{25}$`, L`$\frac{3}{5}$`],
        correctLetter: "C",
        rationales: {
          A: L`This is $\cos^2 A$, not $1-\cos^2A$.`,
          B: L`This is $\cos A$, not the squared sine value.`,
          D: L`This is $\sin A$, but $1-\cos^2A=\sin^2A$.`,
        },
        hints: [
          L`Use $\sin^2A+\cos^2A=1$.`,
          L`Rearrange to $1-\cos^2A=\sin^2A$.`,
          L`Now square $\frac35$.`,
        ],
        solution: [
          {
            explanation: L`By the identity, $1-\cos^2A=\sin^2A$.`,
            math: L`\sin^2A=\left(\frac35\right)^2=\frac{9}{25}`,
          },
        ],
      },
      {
        questionLatex: L`The expression $\frac{1-\sin^2A}{\cos A}$ simplifies to`,
        difficulty: 2,
        skillTags: ["identity_simplification", "sine_cosine_identity"],
        choices: [L`$\cos A$`, L`$\sin A$`, L`$\sec A$`, L`$\tan A$`],
        correctLetter: "A",
        rationales: {
          B: L`This would require the numerator to become $\sin^2A$, but it becomes $\cos^2A$.`,
          C: L`Dividing $\cos^2A$ by $\cos A$ gives $\cos A$, not its reciprocal.`,
          D: L`Tangent would need $\sin A/\cos A$.`,
        },
        hints: [
          L`Replace $1-\sin^2A$ using the basic identity.`,
          L`$1-\sin^2A=\cos^2A$.`,
          L`Cancel one factor of $\cos A$.`,
        ],
        solution: [
          {
            explanation: L`Use $1-\sin^2A=\cos^2A$.`,
            math: L`\frac{1-\sin^2A}{\cos A}=\frac{\cos^2A}{\cos A}=\cos A`,
          },
        ],
      },
      {
        questionLatex: L`If $A$ is acute and $\tan A=\frac{7}{24}$, then $\sec A$ is`,
        difficulty: 2,
        skillTags: ["identity_from_tangent", "pythagorean_triple"],
        choices: [L`$\frac{24}{25}$`, L`$\frac{7}{25}$`, L`$\frac{25}{7}$`, L`$\frac{25}{24}$`],
        correctLetter: "D",
        rationales: {
          A: L`This is $\cos A$, not $\sec A$.`,
          B: L`This is $\sin A$, not $\sec A$.`,
          C: L`This is $\csc A$, the reciprocal of sine.`,
        },
        hints: [
          L`Use a right triangle with opposite $7$ and adjacent $24$.`,
          L`The hypotenuse is $25$.`,
          L`Secant is hypotenuse over adjacent.`,
        ],
        solution: [
          {
            explanation: L`From the $7$-$24$-$25$ triangle, adjacent $=24$ and hypotenuse $=25$.`,
          },
          {
            explanation: L`Thus $\sec A=\frac{25}{24}$.`,
          },
        ],
      },
      {
        questionLatex: L`Dividing $\sin^2A+\cos^2A=1$ by $\cos^2A$ gives`,
        difficulty: 2,
        skillTags: ["derive_identity", "quotient_ratios"],
        choices: [
          L`$1+\cot^2A=\csc^2A$`,
          L`$\tan^2A+1=\sec^2A$`,
          L`$\sin A+\cos A=1$`,
          L`$\sec^2A-\csc^2A=1$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`That identity comes from dividing by $\sin^2A$, not by $\cos^2A$.`,
          C: L`The identity involves squares; it does not imply $\sin A+\cos A=1$.`,
          D: L`This is not a standard consequence of the basic identity.`,
        },
        hints: [
          L`Divide each term by $\cos^2A$.`,
          L`$\frac{\sin^2A}{\cos^2A}=\tan^2A$.`,
          L`$\frac{1}{\cos^2A}=\sec^2A$.`,
        ],
        solution: [
          {
            explanation: L`Divide every term by $\cos^2A$.`,
            math: L`\tan^2A+1=\sec^2A`,
          },
        ],
      },
      {
        questionLatex: L`A student says, "If $\sec A=\frac{13}{12}$, then $\tan A=\frac{1}{12}$ because $\sec A-\cos A=\tan A$." The best correction is`,
        difficulty: 3,
        skillTags: ["claim_correction", "identity_application"],
        choices: [
          L`The answer is correct, but the reason should use $\sec A+\cos A$.`,
          L`The answer is correct because $\tan A=\sec A-\cos A$.`,
          L`The identity is wrong; use $\sec^2A-\tan^2A=1$, giving $\tan A=\frac5{12}$.`,
          L`The value of $\tan A$ cannot be found from $\sec A$.`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`Changing the sign still does not create a correct tangent identity.`,
          B: L`There is no identity $\tan A=\sec A-\cos A$.`,
          D: L`For an acute angle, $\sec A$ fixes the right-triangle side ratio, so tangent can be found.`,
        },
        hints: [
          L`Use the identity connecting secant and tangent.`,
          L`$\sec^2A=1+\tan^2A$.`,
          L`Compute $\tan^2A=\frac{169}{144}-1$.`,
        ],
        solution: [
          {
            explanation: L`Use $\sec^2A-\tan^2A=1$.`,
            math: L`\tan^2A=\left(\frac{13}{12}\right)^2-1=\frac{169-144}{144}=\frac{25}{144}`,
          },
          {
            explanation: L`Since $A$ is acute, $\tan A=\frac5{12}$.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`If $\cos A=\frac45$, find $1-\sin^2A$.`,
        difficulty: 1,
        skillTags: ["sine_cosine_identity"],
        parts: singlePart("a", L`Find the value.`, 1),
        hints: [
          L`Use $\sin^2A+\cos^2A=1$.`,
          L`Rearrange to $1-\sin^2A=\cos^2A$.`,
          L`Square $\frac45$.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $\frac{16}{25}$.`),
        commonErrors: [
          L`Returning $\frac45$ without squaring.`,
          L`Using $1-\cos^2A$ instead of $1-\sin^2A$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$1-\sin^2A=\cos^2A=\left(\frac45\right)^2=\frac{16}{25}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Prove that $(\sec A-\tan A)(\sec A+\tan A)=1$ for an acute angle $A$.`,
        difficulty: 3,
        skillTags: ["identity_proof", "sec_tan_identity"],
        parts: singlePart("a", L`Give a proof.`, 3),
        hints: [
          L`Use the algebraic identity $(x-y)(x+y)=x^2-y^2$.`,
          L`The expression becomes $\sec^2A-\tan^2A$.`,
          L`Use $\sec^2A=1+\tan^2A$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Expands as a difference of squares.` },
            { part: "a", points: 1, description: L`Uses $\sec^2A-\tan^2A=1$.` },
            { part: "a", points: 1, description: L`Concludes the identity correctly.` },
          ],
        },
        commonErrors: [
          L`Expanding to $\sec^2A+\tan^2A$.`,
          L`Using $\sec A-\tan A=1$ directly.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Using difference of squares,`,
            math: L`(\sec A-\tan A)(\sec A+\tan A)=\sec^2A-\tan^2A`,
          },
          {
            part: "a",
            explanation: L`Since $\sec^2A=1+\tan^2A$, we have $\sec^2A-\tan^2A=1$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Simplify $\frac{\sin A}{1+\cos A}+\frac{1+\cos A}{\sin A}$.`,
        difficulty: 4,
        skillTags: ["identity_simplification", "algebraic_manipulation"],
        parts: singlePart("a", L`Simplify the expression.`, 4),
        hints: [
          L`Take a common denominator.`,
          L`Use $\sin^2A+\cos^2A=1$ in the numerator.`,
          L`Look for a factor of $1+\cos A$ that cancels.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Combines the fractions using a correct common denominator.` },
            { part: "a", points: 1, description: L`Expands the numerator correctly.` },
            { part: "a", points: 1, description: L`Uses $\sin^2A+\cos^2A=1$ to simplify.` },
            { part: "a", points: 1, description: L`Obtains $2\csc A$.` },
          ],
        },
        commonErrors: [
          L`Cancelling terms across addition before forming one fraction.`,
          L`Replacing $\sin^2A+\cos^2A$ by $\sin A+\cos A$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Combine the fractions.`,
            math: L`\frac{\sin^2A+(1+\cos A)^2}{\sin A(1+\cos A)}`,
          },
          {
            part: "a",
            explanation: L`Simplify the numerator.`,
            math: L`\sin^2A+1+2\cos A+\cos^2A=2+2\cos A=2(1+\cos A)`,
          },
          {
            part: "a",
            explanation: L`Cancel $1+\cos A$ to get $\frac{2}{\sin A}=2\csc A$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`If $A$ is acute and $\tan A=\frac43$, find $\sin A$, $\cos A$ and verify that $\sec^2A-\tan^2A=1$.`,
        difficulty: 3,
        skillTags: ["identity_verification", "right_triangle"],
        parts: [
          { letter: "a", promptMarkdown: L`Find $\sin A$ and $\cos A$.`, points: 2 },
          { letter: "b", promptMarkdown: L`Verify $\sec^2A-\tan^2A=1$.`, points: 2 },
        ],
        hints: [
          L`Use opposite:adjacent $=4:3$.`,
          L`The hypotenuse is proportional to $5$.`,
          L`Use $\sec A=\frac{1}{\cos A}$ for verification.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds the $3$-$4$-$5$ triangle correctly.` },
            { part: "a", points: 1, description: L`Finds $\sin A=\frac45$ and $\cos A=\frac35$.` },
            { part: "b", points: 1, description: L`Uses $\sec A=\frac53$ and $\tan A=\frac43$.` },
            { part: "b", points: 1, description: L`Shows $\sec^2A-\tan^2A=1$.` },
          ],
        },
        commonErrors: [
          L`Interchanging sine and cosine after forming the triangle.`,
          L`Verifying with $\sec A-\tan A$ instead of squares.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let opposite $=4k$ and adjacent $=3k$. Then hypotenuse $=5k$.`,
          },
          {
            part: "a",
            explanation: L`So $\sin A=\frac45$ and $\cos A=\frac35$.`,
          },
          {
            part: "b",
            explanation: L`$\sec A=\frac53$ and $\tan A=\frac43$. Hence`,
            math: L`\sec^2A-\tan^2A=\frac{25}{9}-\frac{16}{9}=1`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A ramp designer records $\cos A=\frac{12}{13}$ for the angle $A$ made by a ramp with the ground. A teammate claims that $\tan A=\frac{12}{5}$.`,
        difficulty: 3,
        skillTags: ["identity_application", "misconception_correction"],
        parts: [
          { letter: "a", promptMarkdown: L`Find $\sin A$.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the correct value of $\tan A$.`, points: 1 },
          { letter: "c", promptMarkdown: L`Explain the teammate's mistake in one sentence.`, points: 1 },
        ],
        hints: [
          L`Cosine is adjacent over hypotenuse.`,
          L`Use the $5$-$12$-$13$ right triangle.`,
          L`Tangent is opposite over adjacent.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds $\sin A=\frac5{13}$.` },
            { part: "b", points: 1, description: L`Finds $\tan A=\frac5{12}$.` },
            { part: "c", points: 1, description: L`Identifies that the teammate used adjacent/opposite, i.e. cotangent.` },
          ],
        },
        commonErrors: [
          L`Treating $\frac{12}{5}$ as tangent instead of cotangent.`,
          L`Forgetting that tangent uses opposite over adjacent.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`If adjacent $=12$ and hypotenuse $=13$, the opposite side is $5$. So $\sin A=\frac5{13}$.`,
          },
          {
            part: "b",
            explanation: L`$\tan A=\frac{\text{opposite}}{\text{adjacent}}=\frac5{12}$.`,
          },
          {
            part: "c",
            explanation: L`The teammate used adjacent over opposite, which is $\cot A$, not $\tan A$.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Heights and Distances: One Right Triangle",
    subtopic:
      "Solving single-triangle angle of elevation and angle of depression problems.",
    mc: [
      {
        questionLatex: L`A vertical pole casts an $18$ m shadow when the angle of elevation of the Sun is $45^\circ$. The height of the pole is`,
        difficulty: 1,
        skillTags: ["height_distance", "tan45"],
        choices: [L`$9$ m`, L`$18$ m`, L`$18\sqrt3$ m`, L`$36$ m`],
        correctLetter: "B",
        rationales: {
          A: L`This halves the shadow length without using $\tan45^\circ=1$.`,
          C: L`This would match a $60^\circ$ elevation, not $45^\circ$.`,
          D: L`This doubles the shadow length, but the height equals the shadow here.`,
        },
        hints: [
          L`Use $\tan\theta=\frac{\text{height}}{\text{shadow}}$.`,
          L`For $45^\circ$, $\tan45^\circ=1$.`,
          L`So height equals shadow length.`,
        ],
        solution: [
          {
            explanation: L`Let height be $h$. Then`,
            math: L`\tan45^\circ=\frac{h}{18}\Rightarrow 1=\frac{h}{18}\Rightarrow h=18`,
          },
        ],
      },
      {
        questionLatex: L`A $10$ m ladder makes an angle of $60^\circ$ with the ground. The height reached on the wall is`,
        difficulty: 2,
        skillTags: ["height_distance", "sine_ratio"],
        choices: [L`$5$ m`, L`$10\sqrt3$ m`, L`$5\sqrt3$ m`, L`$\frac{10}{\sqrt3}$ m`],
        correctLetter: "C",
        rationales: {
          A: L`This uses $\cos60^\circ$ and gives the horizontal distance, not the height.`,
          B: L`This forgets that $\sin60^\circ=\frac{\sqrt3}{2}$, not $\sqrt3$.`,
          D: L`This uses tangent with the hypotenuse as if it were adjacent.`,
        },
        hints: [
          L`The ladder is the hypotenuse.`,
          L`Height is opposite the angle with the ground.`,
          L`Use $h=10\sin60^\circ$.`,
        ],
        solution: [
          {
            explanation: L`Height $h=10\sin60^\circ$.`,
            math: L`h=10\cdot\frac{\sqrt3}{2}=5\sqrt3`,
          },
        ],
      },
      {
        questionLatex: L`A kite string is $80$ m long and makes an angle of $30^\circ$ with the ground. Ignoring slack, the height of the kite is`,
        difficulty: 2,
        skillTags: ["height_distance", "sine_ratio"],
        choices: [L`$80\sqrt3$ m`, L`$40\sqrt3$ m`, L`$20$ m`, L`$40$ m`],
        correctLetter: "D",
        rationales: {
          A: L`This treats $\sin30^\circ$ as $\sqrt3$, which is not a standard value.`,
          B: L`This uses $\cos30^\circ$ and gives the horizontal distance.`,
          C: L`This halves the already halved value.`,
        },
        hints: [
          L`The string is the hypotenuse.`,
          L`The height is opposite the $30^\circ$ angle.`,
          L`Use $\sin30^\circ=\frac12$.`,
        ],
        solution: [
          {
            explanation: L`Height $=80\sin30^\circ=80\cdot\frac12=40$ m.`,
          },
        ],
      },
      {
        questionLatex: L`From the top of a $60$ m lighthouse, the angle of depression of a boat is $30^\circ$. The horizontal distance of the boat from the base of the lighthouse is`,
        difficulty: 3,
        figure: depressionFigure,
        skillTags: ["angle_of_depression", "tan30"],
        choices: [L`$60\sqrt3$ m`, L`$20\sqrt3$ m`, L`$30$ m`, L`$60$ m`],
        correctLetter: "A",
        rationales: {
          B: L`This divides by $3$ after using the correct tangent relation.`,
          C: L`This treats $\tan30^\circ$ as $\frac12$.`,
          D: L`This would match a $45^\circ$ angle, not $30^\circ$.`,
        },
        hints: [
          L`The angle of depression equals the boat's angle of elevation.`,
          L`Use $\tan30^\circ=\frac{\text{height}}{\text{distance}}$.`,
          L`Solve $\frac1{\sqrt3}=\frac{60}{d}$.`,
        ],
        solution: [
          {
            explanation: L`Let the distance be $d$. The angle of elevation from the boat is $30^\circ$.`,
            math: L`\tan30^\circ=\frac{60}{d}`,
          },
          {
            explanation: L`So $\frac1{\sqrt3}=\frac{60}{d}$, giving $d=60\sqrt3$ m.`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): The angle of depression from a tower to a car equals the angle of elevation from the car to the top of the tower. Reason (R): The horizontal through the observer and the ground line are parallel.`,
        difficulty: 3,
        figure: depressionFigure,
        skillTags: ["assertion_reason", "angle_of_depression"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The parallel horizontals are exactly what makes the two angles equal.`,
          C: L`The reason is true: both horizontal lines are parallel to the ground level.`,
          D: L`The assertion is true by alternate interior angles.`,
        },
        hints: [
          L`Draw the horizontal through the top of the tower.`,
          L`Compare it with the ground horizontal.`,
          L`Use alternate interior angles with the line of sight as transversal.`,
        ],
        solution: [
          {
            explanation: L`The horizontal through the observer is parallel to the ground. The line of sight is a transversal.`,
          },
          {
            explanation: L`Therefore the angle of depression and the corresponding angle of elevation are equal. R correctly explains A.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $10$ m pole casts a shadow of $10\sqrt3$ m. Find the tangent of the angle of elevation of the Sun.`,
        difficulty: 2,
        skillTags: ["height_distance", "tangent_ratio"],
        parts: singlePart("a", L`Find $\tan\theta$.`, 1),
        hints: [
          L`Use tangent as height over shadow.`,
          L`Substitute height $10$ and shadow $10\sqrt3$.`,
          L`Simplify the ratio.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $\frac{1}{\sqrt3}$.`),
        commonErrors: [
          L`Using shadow over height instead of height over shadow.`,
          L`Cancelling $\sqrt3$ incorrectly.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\tan\theta=\frac{10}{10\sqrt3}=\frac{1}{\sqrt3}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`From a point $25$ m away from the base of a tower, the angle of elevation of the top is $60^\circ$. Find the height of the tower.`,
        difficulty: 2,
        figure: elevationFigure,
        skillTags: ["height_distance", "tan60"],
        parts: singlePart("a", L`Find the height.`, 2),
        hints: [
          L`The known horizontal distance is adjacent to the angle.`,
          L`Height is opposite the angle.`,
          L`Use $\tan60^\circ=\frac{h}{25}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Forms $\tan60^\circ=\frac{h}{25}$.` },
            { part: "a", points: 1, description: L`Finds $h=25\sqrt3$ m.` },
          ],
        },
        commonErrors: [
          L`Using sine with $25$ as the hypotenuse.`,
          L`Taking $\tan60^\circ$ as $\frac{1}{\sqrt3}$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let the height be $h$.`,
            math: L`\tan60^\circ=\frac{h}{25}`,
          },
          {
            part: "a",
            explanation: L`So $h=25\sqrt3$ m.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An observer's eye is $1.5$ m above the ground. From a point $20$ m from a building, the angle of elevation of the top is $45^\circ$. Find the height of the building.`,
        difficulty: 3,
        figure: elevationFigure,
        skillTags: ["height_distance", "eye_level_correction"],
        parts: singlePart("a", L`Find the building height.`, 3),
        hints: [
          L`The trigonometric triangle starts at the observer's eye level.`,
          L`Find the height above eye level first.`,
          L`Add the observer's eye height at the end.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Uses $\tan45^\circ$ correctly.` },
            { part: "a", points: 1, description: L`Finds height above eye level as $20$ m.` },
            { part: "a", points: 1, description: L`Adds $1.5$ m to get $21.5$ m.` },
          ],
        },
        commonErrors: [
          L`Forgetting to add the observer's eye height.`,
          L`Using $20$ m as the hypotenuse instead of the horizontal distance.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let the height above eye level be $h$. Since $\tan45^\circ=\frac{h}{20}$, $h=20$ m.`,
          },
          {
            part: "a",
            explanation: L`The building height is $20+1.5=21.5$ m.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A straight wire is fixed from the top of a vertical pole to a point on the ground. The wire is $20$ m long and makes an angle of $30^\circ$ with the ground. Find the height of the pole and the distance of the ground point from the foot of the pole.`,
        difficulty: 3,
        figure: elevationFigure,
        skillTags: ["height_distance", "sine_cosine"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the height of the pole.`, points: 2 },
          { letter: "b", promptMarkdown: L`Find the horizontal distance from the foot of the pole.`, points: 2 },
        ],
        hints: [
          L`The wire is the hypotenuse.`,
          L`Use sine for the height and cosine for the horizontal distance.`,
          L`Use standard values for $30^\circ$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Chooses the sine ratio for height.` },
            { part: "a", points: 1, description: L`Finds height $10$ m.` },
            { part: "b", points: 1, description: L`Chooses the cosine ratio for horizontal distance.` },
            { part: "b", points: 1, description: L`Finds distance $10\sqrt3$ m.` },
          ],
        },
        commonErrors: [
          L`Using tangent even though the hypotenuse is given.`,
          L`Interchanging the height and horizontal distance for the $30^\circ$ angle.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Height $=20\sin30^\circ=20\cdot\frac12=10$ m.`,
          },
          {
            part: "b",
            explanation: L`Horizontal distance $=20\cos30^\circ=20\cdot\frac{\sqrt3}{2}=10\sqrt3$ m.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A cable is tied from the top of a vertical mast to the ground. The mast is $36$ m high and the cable makes an angle of $60^\circ$ with the ground.`,
        difficulty: 3,
        figure: elevationFigure,
        skillTags: ["height_distance", "right_triangle_application"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the length of the cable.`, points: 2 },
          { letter: "b", promptMarkdown: L`Find the horizontal distance from the mast to the point where the cable is fixed.`, points: 2 },
          { letter: "c", promptMarkdown: L`Which trigonometric ratio directly compares height with horizontal distance here?`, points: 1 },
        ],
        hints: [
          L`Height is opposite the $60^\circ$ angle.`,
          L`Use sine to find the cable length.`,
          L`Use tangent to compare height and horizontal distance.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: L`Finds cable length $24\sqrt3$ m.` },
            { part: "b", points: 2, description: L`Finds horizontal distance $12\sqrt3$ m.` },
            { part: "c", points: 1, description: L`Identifies tangent.` },
          ],
        },
        commonErrors: [
          L`Taking the cable length as $36\sin60^\circ$.`,
          L`Using cosine with the height as adjacent for the angle at the ground.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let cable length be $l$. Then $\sin60^\circ=\frac{36}{l}$, so $l=\frac{36}{\sqrt3/2}=24\sqrt3$ m.`,
          },
          {
            part: "b",
            explanation: L`Let horizontal distance be $d$. Then $\tan60^\circ=\frac{36}{d}$, so $d=\frac{36}{\sqrt3}=12\sqrt3$ m.`,
          },
          {
            part: "c",
            explanation: L`The tangent ratio directly compares height with horizontal distance.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Heights and Distances: Two Right Triangles",
    subtopic:
      "Board-style applications involving two observations, angle changes, and combined right-triangle equations.",
    mc: [
      {
        questionLatex: L`The angle of elevation of the top of a tower from a point on the ground is $30^\circ$. After walking $20$ m towards the tower, the angle becomes $60^\circ$. The height of the tower is`,
        difficulty: 4,
        figure: twoObservationFigure,
        skillTags: ["two_triangle_height_distance", "tan30_tan60"],
        choices: [L`$20\sqrt3$ m`, L`$10\sqrt3$ m`, L`$10$ m`, L`$30$ m`],
        correctLetter: "B",
        rationales: {
          A: L`This effectively uses the walking distance as the nearer distance, which is not given.`,
          C: L`This misses the factor $\sqrt3$ from the $60^\circ$ triangle.`,
          D: L`This treats the angle change as a direct subtraction of distances and angles.`,
        },
        hints: [
          L`Let the nearer distance from the tower be $x$.`,
          L`Use $h=x\tan60^\circ$ and $h=(x+20)\tan30^\circ$.`,
          L`Equate the two expressions for $h$.`,
        ],
        solution: [
          {
            explanation: L`Let the nearer distance be $x$ and height be $h$.`,
            math: L`h=x\sqrt3,\qquad h=\frac{x+20}{\sqrt3}`,
          },
          {
            explanation: L`Equating gives $3x=x+20$, so $x=10$ and $h=10\sqrt3$ m.`,
          },
        ],
      },
      {
        questionLatex: L`A point lies between two vertical poles of equal height. The angles of elevation of the tops of the poles are $60^\circ$ and $30^\circ$. If the bases of the poles are $48$ m apart, their common height is`,
        difficulty: 4,
        skillTags: ["two_triangle_height_distance", "equal_heights"],
        choices: [L`$24$ m`, L`$16\sqrt3$ m`, L`$12\sqrt3$ m`, L`$24\sqrt3$ m`],
        correctLetter: "C",
        rationales: {
          A: L`This treats one angle as $45^\circ$ and loses the standard-angle relation.`,
          B: L`This comes from splitting the base equally, but the observation angles are not equal.`,
          D: L`This uses the whole $48$ m as the nearer distance.`,
        },
        hints: [
          L`Let the distance to the $60^\circ$ pole be $x$.`,
          L`Then the distance to the $30^\circ$ pole is $48-x$.`,
          L`Set the two expressions for the common height equal.`,
        ],
        solution: [
          {
            explanation: L`If height is $h$, then $h=x\sqrt3$ and $h=\frac{48-x}{\sqrt3}$.`,
          },
          {
            explanation: L`Thus $3x=48-x$, so $x=12$ and $h=12\sqrt3$ m.`,
          },
        ],
      },
      {
        questionLatex: L`From the top of a $50$ m tower, the angles of depression of two cars on the same side of the tower are $45^\circ$ and $30^\circ$. The distance between the cars is`,
        difficulty: 3,
        figure: depressionFigure,
        skillTags: ["angle_of_depression", "two_distances"],
        choices: [L`$50\sqrt3$ m`, L`$50$ m`, L`$50(\sqrt3+1)$ m`, L`$50(\sqrt3-1)$ m`],
        correctLetter: "D",
        rationales: {
          A: L`This is the distance of the farther car from the tower, not the distance between the cars.`,
          B: L`This is the distance of the nearer car from the tower.`,
          C: L`This adds the two distances, but both cars are on the same side of the tower.`,
        },
        hints: [
          L`Convert each angle of depression into an angle of elevation.`,
          L`Find each car's horizontal distance from the tower.`,
          L`Since the cars are on the same side, subtract the distances.`,
        ],
        solution: [
          {
            explanation: L`For $45^\circ$, distance $=50$ m. For $30^\circ$, distance $=50\sqrt3$ m.`,
          },
          {
            explanation: L`The cars are on the same side, so their separation is $50\sqrt3-50=50(\sqrt3-1)$ m.`,
          },
        ],
      },
      {
        questionLatex: L`From a point $30$ m from a tower, the angles of elevation of the top of the tower and the top of a flagstaff on the tower are $30^\circ$ and $60^\circ$ respectively. The height of the flagstaff is`,
        difficulty: 4,
        figure: towerFlagFigure,
        skillTags: ["tower_flagstaff", "two_angles"],
        choices: [L`$20\sqrt3$ m`, L`$10\sqrt3$ m`, L`$30(\sqrt3-1)$ m`, L`$30\sqrt3$ m`],
        correctLetter: "A",
        rationales: {
          B: L`This is the tower height, not the extra flagstaff height.`,
          C: L`This subtracts $30$ from the total height instead of subtracting the tower height.`,
          D: L`This is the total height up to the top of the flagstaff.`,
        },
        hints: [
          L`Find the tower height using the $30^\circ$ angle.`,
          L`Find the total height using the $60^\circ$ angle.`,
          L`The flagstaff height is total height minus tower height.`,
        ],
        solution: [
          {
            explanation: L`Tower height $=30\tan30^\circ=10\sqrt3$ m.`,
          },
          {
            explanation: L`Total height $=30\tan60^\circ=30\sqrt3$ m.`,
          },
          {
            explanation: L`Flagstaff height $=30\sqrt3-10\sqrt3=20\sqrt3$ m.`,
          },
        ],
      },
      {
        questionLatex: L`A student claims, "When an observer walks towards a tower on level ground, the angle of elevation of the top decreases." The correct response is`,
        difficulty: 2,
        skillTags: ["conceptual_height_distance", "claim_correction"],
        choices: [
          L`True, because the height of the tower becomes smaller.`,
          L`False, because the horizontal distance decreases while the height stays the same, so the angle increases.`,
          L`True, because tangent is inversely proportional to the height.`,
          L`False, because the angle of depression becomes undefined.`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The tower height does not change as the observer walks.`,
          C: L`For a fixed height, reducing horizontal distance increases the tangent value and the angle.`,
          D: L`The angle of elevation remains defined as long as the observer is on level ground away from the tower.`,
        },
        hints: [
          L`The height is fixed.`,
          L`The horizontal distance gets smaller.`,
          L`Use $\tan\theta=\frac{\text{height}}{\text{horizontal distance}}$.`,
        ],
        solution: [
          {
            explanation: L`For the same tower, $\tan\theta=\frac{h}{d}$. When the observer moves closer, $d$ decreases while $h$ stays fixed.`,
          },
          {
            explanation: L`So $\tan\theta$ increases, and for acute angles the angle of elevation increases.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`From a point $30\sqrt3$ m from the base of a tower, the angle of elevation of the top is $30^\circ$. Find the tower height.`,
        difficulty: 2,
        skillTags: ["height_distance", "tan30"],
        parts: singlePart("a", L`Find the height.`, 1),
        hints: [
          L`Use tangent because height and horizontal distance are involved.`,
          L`$\tan30^\circ=\frac{1}{\sqrt3}$.`,
          L`Height $=30\sqrt3\cdot\frac{1}{\sqrt3}$.`,
        ],
        rubric: singleRubric("a", 1, L`Gives $30$ m.`),
        commonErrors: [
          L`Multiplying by $\sqrt3$ instead of by $\frac1{\sqrt3}$.`,
          L`Using sine with the horizontal distance.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Height $=30\sqrt3\tan30^\circ=30\sqrt3\cdot\frac1{\sqrt3}=30$ m.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A person walks $30$ m towards a tower on level ground. The angle of elevation of the top changes from $30^\circ$ to $60^\circ$. Find the height of the tower.`,
        difficulty: 4,
        figure: twoObservationFigure,
        skillTags: ["two_triangle_height_distance", "tan30_tan60"],
        parts: singlePart("a", L`Find the tower height.`, 4),
        hints: [
          L`Let the nearer distance from the tower be $x$ m.`,
          L`Write height using the nearer and farther observations.`,
          L`Equate $x\sqrt3$ and $\frac{x+30}{\sqrt3}$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Defines the nearer distance correctly.` },
            { part: "a", points: 1, description: L`Forms two tangent equations.` },
            { part: "a", points: 1, description: L`Solves for the nearer distance $15$ m.` },
            { part: "a", points: 1, description: L`Finds height $15\sqrt3$ m.` },
          ],
        },
        commonErrors: [
          L`Treating $30$ m as the distance from the tower after walking.`,
          L`Using the same angle for both observations.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let the nearer distance be $x$ m and tower height be $h$ m.`,
          },
          {
            part: "a",
            explanation: L`From the nearer point, $h=x\tan60^\circ=x\sqrt3$. From the farther point, $h=(x+30)\tan30^\circ=\frac{x+30}{\sqrt3}$.`,
          },
          {
            part: "a",
            explanation: L`Equating gives $x\sqrt3=\frac{x+30}{\sqrt3}$, so $3x=x+30$ and $x=15$.`,
          },
          {
            part: "a",
            explanation: L`Hence $h=15\sqrt3$ m.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A point lies between two vertical poles of the same height. The angles of elevation of their tops are $60^\circ$ and $30^\circ$. If the poles are $80$ m apart, find their height.`,
        difficulty: 4,
        skillTags: ["two_triangle_height_distance", "equal_heights"],
        parts: singlePart("a", L`Find the common height.`, 4),
        hints: [
          L`Let the distance from the point to the $60^\circ$ pole be $x$.`,
          L`The other distance is $80-x$.`,
          L`Set $x\sqrt3=\frac{80-x}{\sqrt3}$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Sets up distances $x$ and $80-x$.` },
            { part: "a", points: 1, description: L`Forms two correct tangent equations.` },
            { part: "a", points: 1, description: L`Solves $x=20$ m.` },
            { part: "a", points: 1, description: L`Finds common height $20\sqrt3$ m.` },
          ],
        },
        commonErrors: [
          L`Splitting $80$ m equally despite unequal angles.`,
          L`Putting $\sqrt3$ in the denominator for the $60^\circ$ side.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let the distance to the pole seen at $60^\circ$ be $x$ m. Then the other distance is $80-x$ m.`,
          },
          {
            part: "a",
            explanation: L`For the common height $h$, $h=x\sqrt3$ and $h=\frac{80-x}{\sqrt3}$.`,
          },
          {
            part: "a",
            explanation: L`So $3x=80-x$, giving $x=20$ and $h=20\sqrt3$ m.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`From a point $28$ m from the base of a tower, the angles of elevation of the top of the tower and the top of a flagstaff fixed on the tower are $45^\circ$ and $60^\circ$ respectively. Find the height of the tower and the height of the flagstaff.`,
        difficulty: 4,
        figure: towerFlagFigure,
        skillTags: ["tower_flagstaff", "two_angles", "multi_step_application"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the height of the tower.`, points: 2 },
          { letter: "b", promptMarkdown: L`Find the height of the flagstaff.`, points: 3 },
        ],
        hints: [
          L`Use the $45^\circ$ line of sight for the tower alone.`,
          L`Use the $60^\circ$ line of sight for the total height.`,
          L`Subtract tower height from total height.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Uses $\tan45^\circ$ correctly.` },
            { part: "a", points: 1, description: L`Finds tower height $28$ m.` },
            { part: "b", points: 1, description: L`Uses $\tan60^\circ$ for total height.` },
            { part: "b", points: 1, description: L`Finds total height $28\sqrt3$ m.` },
            { part: "b", points: 1, description: L`Finds flagstaff height $28(\sqrt3-1)$ m.` },
          ],
        },
        commonErrors: [
          L`Reporting total height as the flagstaff height.`,
          L`Subtracting the horizontal distance instead of subtracting the tower height.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Let the tower height be $h$. Since $\tan45^\circ=\frac{h}{28}$, $h=28$ m.`,
          },
          {
            part: "b",
            explanation: L`Let the total height up to the top of the flagstaff be $H$. Since $\tan60^\circ=\frac{H}{28}$, $H=28\sqrt3$ m.`,
          },
          {
            part: "b",
            explanation: L`Flagstaff height $=H-h=28\sqrt3-28=28(\sqrt3-1)$ m.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A surveyor observes the top of a tower from point $P$ at an angle of elevation $30^\circ$. She then walks $40$ m straight towards the tower to point $Q$, where the angle of elevation becomes $60^\circ$.`,
        difficulty: 4,
        figure: twoObservationFigure,
        skillTags: ["two_triangle_height_distance", "survey_application"],
        parts: [
          { letter: "a", promptMarkdown: L`If $Q$ is $x$ m from the tower, write the height in terms of $x$ using the observation at $Q$.`, points: 1 },
          { letter: "b", promptMarkdown: L`Write the height in terms of $x$ using the observation at $P$.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find $x$ and the height of the tower.`, points: 3 },
        ],
        hints: [
          L`The nearer point is $Q$, so the distance from $P$ is $x+40$.`,
          L`Use tangent at both observation points.`,
          L`Equate the two expressions for the same tower height.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Writes $h=x\sqrt3$.` },
            { part: "b", points: 1, description: L`Writes $h=\frac{x+40}{\sqrt3}$.` },
            { part: "c", points: 1, description: L`Equates the expressions correctly.` },
            { part: "c", points: 1, description: L`Finds $x=20$ m.` },
            { part: "c", points: 1, description: L`Finds $h=20\sqrt3$ m.` },
          ],
        },
        commonErrors: [
          L`Using $40$ m as the nearer distance instead of the distance walked.`,
          L`Equating the two angles instead of the two height expressions.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`At $Q$, $h=x\tan60^\circ=x\sqrt3$.`,
          },
          {
            part: "b",
            explanation: L`At $P$, the distance is $x+40$, so $h=(x+40)\tan30^\circ=\frac{x+40}{\sqrt3}$.`,
          },
          {
            part: "c",
            explanation: L`Equate the height expressions: $x\sqrt3=\frac{x+40}{\sqrt3}$. Hence $3x=x+40$, so $x=20$ m.`,
          },
          {
            part: "c",
            explanation: L`The tower height is $h=20\sqrt3$ m.`,
          },
        ],
      },
    ],
  },
];

export const trigonometryXTopics: Topic[] = [...topicSeeds].map(makeTopic);
