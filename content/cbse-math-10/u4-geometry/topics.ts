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
const UNIT = "u4-geometry";
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
  return `You chose ${choiceText}. Match the theorem condition before using a ratio, similarity result, Pythagoras relation, or tangent property.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class10_geometry_reasoning"),
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "applies_a_geometry_theorem_without_checking_its_hypothesis",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_result_without_the_theorem_or_congruence_reason",
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

const bptTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Triangle with a parallel segment",
  description:
    "Triangle ABC has points D on AB and E on AC, with segment DE drawn parallel to BC.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <polygon points="310,58 110,320 510,320" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <line x1="218" y1="200" x2="402" y2="200" stroke="#16a34a" stroke-width="4"/>
  <circle cx="310" cy="58" r="7" fill="#dc2626"/>
  <circle cx="110" cy="320" r="7" fill="#dc2626"/>
  <circle cx="510" cy="320" r="7" fill="#dc2626"/>
  <circle cx="218" cy="200" r="7" fill="#16a34a"/>
  <circle cx="402" cy="200" r="7" fill="#16a34a"/>
  <text x="310" y="43" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">A</text>
  <text x="90" y="345" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">B</text>
  <text x="520" y="345" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">C</text>
  <text x="194" y="194" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#166534">D</text>
  <text x="412" y="194" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#166534">E</text>
  <text x="310" y="226" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#166534">DE || BC</text>
</svg>`,
};

const similarTrianglesFigure: ItemFigure = {
  type: "svg",
  title: "Two labelled triangles",
  description:
    "Two separate triangles are labelled ABC and DEF for comparing corresponding sides and angles.",
  svg: `<svg viewBox="0 0 680 310" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="310" fill="#ffffff"/>
  <polygon points="90,240 250,240 128,86" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <polygon points="410,240 610,240 456,48" fill="#f0fdf4" stroke="#16a34a" stroke-width="4"/>
  <text x="120" y="74" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">A</text>
  <text x="70" y="265" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">B</text>
  <text x="260" y="265" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">C</text>
  <text x="448" y="38" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#166534">D</text>
  <text x="392" y="265" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#166534">E</text>
  <text x="620" y="265" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#166534">F</text>
  <text x="340" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#475569">compare ratios</text>
</svg>`,
};

const rightTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Right triangle",
  description:
    "A right triangle with legs AB and AC perpendicular at A and hypotenuse BC.",
  svg: `<svg viewBox="0 0 560 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="330" fill="#ffffff"/>
  <polygon points="140,255 140,75 420,255" fill="#fff7ed" stroke="#f97316" stroke-width="4"/>
  <path d="M140 225 H170 V255" fill="none" stroke="#475569" stroke-width="3"/>
  <text x="118" y="278" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">A</text>
  <text x="118" y="68" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">B</text>
  <text x="430" y="278" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#9a3412">C</text>
  <text x="96" y="170" font-family="Arial, sans-serif" font-size="16" fill="#475569">leg</text>
  <text x="270" y="284" font-family="Arial, sans-serif" font-size="16" fill="#475569">leg</text>
  <text x="292" y="150" font-family="Arial, sans-serif" font-size="16" fill="#475569">hypotenuse</text>
</svg>`,
};

const altitudeTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Altitude to the hypotenuse",
  description:
    "A right triangle ABC has right angle at A and altitude AD drawn to hypotenuse BC.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <polygon points="150,285 150,85 500,285" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <line x1="150" y1="85" x2="250" y2="285" stroke="#16a34a" stroke-width="4"/>
  <path d="M150 255 H180 V285" fill="none" stroke="#475569" stroke-width="3"/>
  <path d="M240 268 L258 277 L249 295" fill="none" stroke="#475569" stroke-width="3"/>
  <text x="128" y="306" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">A</text>
  <text x="128" y="78" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">B</text>
  <text x="510" y="306" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1d4ed8">C</text>
  <text x="250" y="310" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#166534">D</text>
  <text x="190" y="170" font-family="Arial, sans-serif" font-size="16" fill="#166534">AD</text>
</svg>`,
};

const tangentFigure: ItemFigure = {
  type: "svg",
  title: "Radius and tangent",
  description:
    "A circle with centre O has tangent PT touching the circle at T and radius OT drawn.",
  svg: `<svg viewBox="0 0 620 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="330" fill="#ffffff"/>
  <circle cx="240" cy="165" r="86" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <line x1="240" y1="165" x2="326" y2="165" stroke="#334155" stroke-width="3"/>
  <line x1="326" y1="165" x2="540" y2="165" stroke="#16a34a" stroke-width="5" stroke-linecap="round"/>
  <path d="M326 165 V140 H351" fill="none" stroke="#475569" stroke-width="3"/>
  <circle cx="240" cy="165" r="6" fill="#dc2626"/>
  <circle cx="326" cy="165" r="7" fill="#dc2626"/>
  <circle cx="540" cy="165" r="7" fill="#dc2626"/>
  <text x="223" y="190" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">O</text>
  <text x="320" y="194" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">T</text>
  <text x="550" y="190" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">P</text>
  <text x="390" y="151" font-family="Arial, sans-serif" font-size="16" fill="#166534">tangent</text>
</svg>`,
};

const twoTangentsFigure: ItemFigure = {
  type: "svg",
  title: "Two tangents from an external point",
  description:
    "An external point P has two tangents PA and PB touching a circle with centre O.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <circle cx="250" cy="180" r="88" fill="#f0fdf4" stroke="#16a34a" stroke-width="4"/>
  <line x1="500" y1="180" x2="291" y2="102" stroke="#2563eb" stroke-width="4"/>
  <line x1="500" y1="180" x2="291" y2="258" stroke="#2563eb" stroke-width="4"/>
  <line x1="250" y1="180" x2="291" y2="102" stroke="#64748b" stroke-width="3"/>
  <line x1="250" y1="180" x2="291" y2="258" stroke="#64748b" stroke-width="3"/>
  <circle cx="250" cy="180" r="6" fill="#dc2626"/>
  <circle cx="291" cy="102" r="7" fill="#dc2626"/>
  <circle cx="291" cy="258" r="7" fill="#dc2626"/>
  <circle cx="500" cy="180" r="7" fill="#dc2626"/>
  <text x="232" y="204" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">O</text>
  <text x="280" y="88" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">A</text>
  <text x="280" y="284" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">B</text>
  <text x="510" y="204" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#991b1b">P</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Basic Proportionality Theorem and Converse",
    subtopic:
      "Using BPT, converse of BPT, and proportional division in triangles.",
    mc: [
      {
        questionLatex: L`In the figure, $DE\parallel BC$, $AD=3$, $DB=5$ and $AE=4.5$. The length $EC$ is`,
        difficulty: 2,
        figure: bptTriangleFigure,
        skillTags: ["basic_proportionality_theorem", "ratio"],
        choices: [L`$7.5$`, L`$6$`, L`$4$`, L`$12.5$`],
        correctLetter: "A",
        rationales: {
          B: "This treats the ratios as additive instead of comparing the divided sides.",
          C: "This uses the reciprocal ratio and places $E$ too close to $C$.",
          D: "This adds the known lengths instead of applying BPT.",
        },
        hints: [
          "Use the theorem for a line parallel to one side of a triangle.",
          "Write $\\frac{AD}{DB}=\\frac{AE}{EC}$.",
          "Solve $\\frac35=\\frac{4.5}{EC}$.",
        ],
        solution: [
          {
            explanation: "By BPT, the two sides are divided in the same ratio.",
            math: "\\frac{AD}{DB}=\\frac{AE}{EC}",
          },
          {
            explanation: "Substitute and solve.",
            math: "\\frac35=\\frac{4.5}{EC}\\Rightarrow EC=7.5",
          },
        ],
      },
      {
        questionLatex: L`In $\triangle PQR$, points $X$ and $Y$ lie on $PQ$ and $PR$ respectively. If $PX=4$, $XQ=6$, $PY=6$ and $YR=9$, then`,
        difficulty: 2,
        skillTags: ["converse_bpt", "parallel_test"],
        choices: [
          L`$XY$ need not be parallel to $QR$`,
          L`$XY\perp QR$`,
          L`$XY\parallel QR$`,
          L`$X$ and $Y$ are midpoints`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The two divided-side ratios are equal, so the converse theorem does apply.",
          B: "Equal ratios imply parallelism here, not perpendicularity.",
          D: "The ratios are $2:3$, not $1:1$, so the points are not midpoints.",
        },
        hints: [
          "Compare $PX:XQ$ with $PY:YR$.",
          "$4:6$ and $6:9$ both reduce to $2:3$.",
          "Use the converse of BPT.",
        ],
        solution: [
          {
            explanation: "The divided ratios are equal.",
            math: "\\frac{PX}{XQ}=\\frac46=\\frac23,\\quad \\frac{PY}{YR}=\\frac69=\\frac23",
          },
          {
            explanation:
              "By the converse of the Basic Proportionality Theorem, $XY\\parallel QR$.",
          },
        ],
      },
      {
        questionLatex: L`If $\triangle ABC\sim\triangle DEF$, $AB:DE=3:5$ and $AC=12$, then $DF$ equals`,
        difficulty: 2,
        skillTags: ["similarity", "corresponding_sides"],
        choices: [L`$15$`, L`$20$`, L`$\frac{36}{5}$`, L`$8$`],
        correctLetter: "B",
        rationales: {
          A: "This adds $3$ to the given side instead of using the scale factor.",
          C: "This multiplies by $3/5$ again, making the corresponding side smaller.",
          D: "This reverses the scale factor between the similar triangles.",
        },
        hints: [
          "Match $AB$ with $DE$ and $AC$ with $DF$.",
          "Use $\\frac{AC}{DF}=\\frac{AB}{DE}$.",
          "Solve $\\frac{12}{DF}=\\frac35$.",
        ],
        solution: [
          {
            explanation:
              "Corresponding sides of similar triangles are proportional.",
            math: "\\frac{12}{DF}=\\frac35",
          },
          {
            explanation: "Hence $DF=20$.",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): If a line divides two sides of a triangle in the same ratio, then the line is parallel to the third side. Reason (R): This is the converse of the Basic Proportionality Theorem.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "converse_bpt"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason names exactly the theorem that justifies the assertion.",
          C: "The reason is a true theorem statement, not a false claim.",
          D: "The assertion is also true because it states the converse of BPT.",
        },
        hints: [
          "Identify whether the assertion is BPT or its converse.",
          "BPT starts with a parallel line; the converse starts with equal ratios.",
          "The reason directly names the theorem.",
        ],
        solution: [
          {
            explanation:
              "The assertion is the converse of the Basic Proportionality Theorem.",
          },
          {
            explanation:
              "Therefore both statements are true, and the reason explains the assertion.",
          },
        ],
      },
      {
        questionLatex: L`In $\triangle ABC$, $D$ lies on $AB$, $E$ lies on $AC$ and $DE\parallel BC$. If $AD=2$, $DB=3$ and $AC=15$, then $AE$ is`,
        difficulty: 3,
        skillTags: ["basic_proportionality_theorem", "linear_ratio"],
        choices: [L`$9$`, L`$7.5$`, L`$5$`, L`$6$`],
        correctLetter: "D",
        rationales: {
          A: "This uses $DB:AB$ instead of $AD:AB$ for the smaller triangle.",
          B: "This treats $D$ as the midpoint, but $AD:DB$ is $2:3$.",
          C: "This uses only $AD+DB$ and ignores the side $AC$.",
        },
        hints: [
          "Because $DE\\parallel BC$, $\\triangle ADE\\sim\\triangle ABC$.",
          "So $\\frac{AE}{AC}=\\frac{AD}{AB}$.",
          "$AB=2+3=5$.",
        ],
        solution: [
          {
            explanation: "Use similarity from the parallel segment.",
            math: "\\frac{AE}{15}=\\frac{2}{2+3}",
          },
          {
            explanation: "Thus $AE=15\\cdot\\frac25=6$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In $\triangle ABC$, $DE\parallel BC$, $D$ lies on $AB$ and $E$ lies on $AC$. If $AD=2$, $DB=4$ and $AE=3$, find $EC$.`,
        difficulty: 1,
        skillTags: ["basic_proportionality_theorem"],
        parts: singlePart("a", "Find $EC$.", 1),
        hints: [
          "Use BPT.",
          "Write $\\frac{AD}{DB}=\\frac{AE}{EC}$.",
          "Solve $\\frac24=\\frac3{EC}$.",
        ],
        rubric: singleRubric("a", 1, "Correctly obtains $EC=6$."),
        commonErrors: [
          "Using $AD:AB$ instead of $AD:DB$.",
          "Writing the reciprocal ratio without adjusting both sides.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "By BPT, $\\frac{AD}{DB}=\\frac{AE}{EC}$, so $\\frac24=\\frac3{EC}$ and $EC=6$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In $\triangle ABC$, $DE\parallel BC$. If $AD=5$, $DB=7$ and $EC=8$, find $AE$.`,
        difficulty: 2,
        skillTags: ["basic_proportionality_theorem", "fractional_length"],
        parts: singlePart("a", "Find $AE$ with a theorem statement.", 3),
        hints: [
          "Use the ratio in which the parallel segment divides the sides.",
          "Write $\\frac{AD}{DB}=\\frac{AE}{EC}$.",
          "Substitute $EC=8$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States or uses BPT correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Substitutes the correct side ratios.",
            },
            { part: "a", points: 1, description: "Finds $AE=\\frac{40}{7}$." },
          ],
        },
        commonErrors: [
          "Using $AB$ instead of $DB$ in the denominator.",
          "Rounding the exact fractional answer unnecessarily.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $DE\\parallel BC$, by BPT $\\frac{AD}{DB}=\\frac{AE}{EC}$.",
          },
          {
            part: "a",
            explanation: "$\\frac57=\\frac{AE}{8}$, so $AE=\\frac{40}{7}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In $\triangle ABC$, points $D$ and $E$ lie on $AB$ and $AC$ respectively. Given $AD=3$, $DB=6$, $AE=4$ and $EC=8$, prove that $DE\parallel BC$.`,
        difficulty: 2,
        skillTags: ["converse_bpt", "proof"],
        parts: singlePart("a", "Give the proof.", 3),
        hints: [
          "Compare the two divided-side ratios.",
          "Reduce $3:6$ and $4:8$.",
          "Use the converse of BPT.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Computes both side ratios." },
            {
              part: "a",
              points: 1,
              description: "Shows that the ratios are equal.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes parallelism using the converse of BPT.",
            },
          ],
        },
        commonErrors: [
          "Using BPT instead of its converse.",
          "Comparing $AD:AB$ with $AE:EC$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\frac{AD}{DB}=\\frac36=\\frac12$ and $\\frac{AE}{EC}=\\frac48=\\frac12$.",
          },
          {
            part: "a",
            explanation:
              "The two sides are divided in the same ratio, so by the converse of BPT, $DE\\parallel BC$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In $\triangle ABC$, $DE\parallel BC$, $AD=x+1$, $DB=2x-1$, $AE=6$ and $EC=9$. Find $x$ and $AB$.`,
        difficulty: 3,
        figure: bptTriangleFigure,
        skillTags: ["basic_proportionality_theorem", "algebraic_ratio"],
        parts: [
          { letter: "a", promptMarkdown: "Find $x$.", points: 3 },
          { letter: "b", promptMarkdown: "Find $AB$.", points: 1 },
        ],
        hints: [
          "Use $\\frac{AD}{DB}=\\frac{AE}{EC}$.",
          "Substitute $AD=x+1$ and $DB=2x-1$.",
          "After finding $x$, add $AD$ and $DB$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes the correct BPT equation.",
            },
            {
              part: "a",
              points: 2,
              description: "Solves the equation and obtains $x=5$.",
            },
            { part: "b", points: 1, description: "Finds $AB=15$." },
          ],
        },
        commonErrors: [
          "Equating $AD:AE$ with $DB:EC$.",
          "Finding $x$ but forgetting to compute the full side $AB$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "By BPT, $\\frac{x+1}{2x-1}=\\frac69=\\frac23$.",
          },
          {
            part: "a",
            explanation: "$3(x+1)=2(2x-1)$, so $3x+3=4x-2$ and $x=5$.",
          },
          {
            part: "b",
            explanation: "$AD=6$ and $DB=9$, hence $AB=AD+DB=15$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A triangular garden $ABC$ has a path $DE$ parallel to side $BC$, with $D$ on $AB$ and $E$ on $AC$. The surveyor records $AD=4$ m, $DB=6$ m and $AE=5$ m.`,
        difficulty: 3,
        figure: bptTriangleFigure,
        skillTags: [
          "basic_proportionality_theorem",
          "converse_bpt",
          "application",
        ],
        parts: [
          { letter: "a", promptMarkdown: "Find $EC$.", points: 2 },
          {
            letter: "b",
            promptMarkdown:
              "If another path cuts the sides in the ratios $2:3$ and $8:12$, can it be parallel to $BC$?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the theorem used in part (b).",
            points: 1,
          },
        ],
        hints: [
          "Use the parallel-path theorem for part (a).",
          "Reduce both ratios in part (b).",
          "Equal divided-side ratios give parallelism by the converse theorem.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Uses BPT to obtain $EC=7.5$ m.",
            },
            {
              part: "b",
              points: 1,
              description: "Correctly says the second path can be parallel.",
            },
            { part: "c", points: 1, description: "Names the converse of BPT." },
          ],
        },
        commonErrors: [
          "Using total side lengths instead of divided side lengths.",
          "Not reducing the two ratios before comparing them.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\frac{AD}{DB}=\\frac{AE}{EC}$ gives $\\frac46=\\frac5{EC}$, so $EC=7.5$ m.",
          },
          {
            part: "b",
            explanation:
              "$2:3$ and $8:12$ are both $2:3$, so the path can be parallel.",
          },
          {
            part: "c",
            explanation: "The theorem is the converse of BPT.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Similarity Criteria and Corresponding Parts",
    subtopic:
      "AAA, SSS and SAS similarity, corresponding sides, scale factors and board-style applications.",
    mc: [
      {
        questionLatex: L`Two triangles have angle measures $50^\circ,60^\circ,70^\circ$ and $50^\circ,70^\circ,60^\circ$. The triangles are similar by`,
        difficulty: 1,
        skillTags: ["aaa_similarity", "angle_matching"],
        choices: [
          L`AAA similarity`,
          L`SSS similarity`,
          L`SAS similarity`,
          L`RHS congruence`,
        ],
        correctLetter: "A",
        rationales: {
          B: "No side lengths are given, so SSS similarity is not the direct reason.",
          C: "SAS needs an included angle and two side ratios, not only angles.",
          D: "RHS is a congruence test for right triangles, not a similarity criterion here.",
        },
        hints: [
          "Compare all three angles.",
          "The order of listing angles can change, but the set of angles is the same.",
          "Equal corresponding angles establish similarity.",
        ],
        solution: [
          {
            explanation:
              "All corresponding angles can be matched equal, so the triangles are similar by AAA.",
          },
        ],
      },
      {
        questionLatex: L`For two triangles, $\frac{AB}{PQ}=\frac{BC}{QR}=\frac{CA}{RP}=\frac23$. The similarity criterion directly used is`,
        difficulty: 2,
        skillTags: ["sss_similarity"],
        choices: [L`AAA`, L`SSS`, L`SAS`, L`BPT`],
        correctLetter: "B",
        rationales: {
          A: "Angles are not the given data in this question.",
          C: "SAS needs only two side ratios and the included angle, but here all three side ratios are given.",
          D: "BPT is about a line parallel to one side of a triangle, not two separate triangles.",
        },
        hints: [
          "Look at what information is given.",
          "All three pairs of corresponding sides are in the same ratio.",
          "That is exactly the SSS similarity criterion.",
        ],
        solution: [
          {
            explanation:
              "Since all three corresponding side ratios are equal, the triangles are similar by SSS.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, $DE\parallel BC$, $AD=6$, $AB=10$ and $BC=15$. The length $DE$ is`,
        difficulty: 2,
        figure: bptTriangleFigure,
        skillTags: ["similar_triangles", "parallel_line_similarity"],
        choices: [L`$6$`, L`$8$`, L`$9$`, L`$12$`],
        correctLetter: "C",
        rationales: {
          A: "This copies $AD$ instead of using the scale factor of the smaller triangle.",
          B: "This uses an incorrect scale factor of $8/15$.",
          D: "This reverses the ratio $AD:AB$.",
        },
        hints: [
          "$\\triangle ADE\\sim\\triangle ABC$.",
          "Use $\\frac{DE}{BC}=\\frac{AD}{AB}$.",
          "Substitute $\\frac{DE}{15}=\\frac6{10}$.",
        ],
        solution: [
          {
            explanation: "Parallel lines give similar triangles.",
            math: "\\frac{DE}{BC}=\\frac{AD}{AB}",
          },
          {
            explanation: "Thus $DE=15\\cdot\\frac6{10}=9$.",
          },
        ],
      },
      {
        questionLatex: L`In $\triangle ABC$ and $\triangle DEF$, $AB=6$, $AC=8$, $DE=9$, $DF=12$ and $\angle A=\angle D$. The triangles are similar by`,
        difficulty: 3,
        figure: similarTrianglesFigure,
        skillTags: ["sas_similarity"],
        choices: [L`AAA`, L`SSS`, L`RHS`, L`SAS`],
        correctLetter: "D",
        rationales: {
          A: "Only one angle equality is given, not two or three angle equalities.",
          B: "Only two side pairs are compared here, not all three.",
          C: "No right-angle and hypotenuse information is given.",
        },
        hints: [
          "Compare the ratios of the two sides around the equal angle.",
          "$6:9=8:12=2:3$.",
          "The equal angle is included between those side pairs.",
        ],
        solution: [
          {
            explanation:
              "$\\frac{AB}{DE}=\\frac69=\\frac23$ and $\\frac{AC}{DF}=\\frac8{12}=\\frac23$.",
          },
          {
            explanation:
              "The included angles are equal, so the triangles are similar by SAS.",
          },
        ],
      },
      {
        questionLatex: L`If $\triangle ABC\sim\triangle DEF$, $AB=8$, $BC=10$, $CA=12$ and $DE=12$, then the perimeter of $\triangle DEF$ is`,
        difficulty: 3,
        skillTags: ["similarity", "perimeter_ratio"],
        choices: [L`$30$`, L`$45$`, L`$36$`, L`$50$`],
        correctLetter: "B",
        rationales: {
          A: "This is the perimeter of the smaller triangle, not the enlarged triangle.",
          C: "This scales only one side and not the whole perimeter.",
          D: "This uses an incorrect scale factor.",
        },
        hints: [
          "Find the scale factor using $AB$ and $DE$.",
          "Perimeters of similar triangles are in the same ratio as corresponding sides.",
          "The perimeter of $\\triangle ABC$ is $30$.",
        ],
        solution: [
          {
            explanation: "The scale factor from $ABC$ to $DEF$ is",
            math: "\\frac{DE}{AB}=\\frac{12}{8}=\\frac32",
          },
          {
            explanation: "So the perimeter of $DEF$ is $30\\cdot\\frac32=45$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`If $\triangle ABC\sim\triangle PQR$, $AB=6$, $PQ=9$ and $BC=8$, find $QR$.`,
        difficulty: 1,
        skillTags: ["corresponding_sides", "similarity"],
        parts: singlePart("a", "Find $QR$.", 1),
        hints: [
          "Use corresponding sides.",
          "$AB$ corresponds to $PQ$ and $BC$ corresponds to $QR$.",
          "The scale factor is $9/6$.",
        ],
        rubric: singleRubric("a", 1, "Correctly finds $QR=12$."),
        commonErrors: [
          "Using the reciprocal scale factor.",
          "Matching $BC$ with the wrong side.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\frac{QR}{BC}=\\frac{PQ}{AB}=\\frac96=\\frac32$, so $QR=8\\cdot\\frac32=12$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In $\triangle ABC$ and $\triangle DEF$, $AB=4$, $AC=6$, $DE=6$, $DF=9$ and $\angle A=\angle D$. If $BC=5$, find $EF$.`,
        difficulty: 3,
        skillTags: ["sas_similarity", "corresponding_sides"],
        parts: singlePart("a", "Prove similarity and find $EF$.", 3),
        hints: [
          "Compare the sides around the equal angle.",
          "$4:6=6:9$.",
          "Use the same scale factor for $BC$ and $EF$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Shows the two side ratios are equal.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes similarity by SAS.",
            },
            { part: "a", points: 1, description: "Finds $EF=7.5$." },
          ],
        },
        commonErrors: [
          "Using SSS without the third side ratio.",
          "Forgetting that $EF$ is in the larger triangle.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\frac{AB}{DE}=\\frac46=\\frac23$ and $\\frac{AC}{DF}=\\frac69=\\frac23$, with $\\angle A=\\angle D$.",
          },
          {
            part: "a",
            explanation:
              "Therefore $\\triangle ABC\\sim\\triangle DEF$ by SAS similarity.",
          },
          {
            part: "a",
            explanation:
              "$\\frac{BC}{EF}=\\frac23$, so $\\frac5{EF}=\\frac23$ and $EF=7.5$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In $\triangle ABC$, $DE\parallel BC$, $D$ lies on $AB$ and $E$ lies on $AC$. Prove that $\triangle ADE\sim\triangle ABC$.`,
        difficulty: 2,
        figure: bptTriangleFigure,
        skillTags: ["aaa_similarity", "parallel_lines"],
        parts: singlePart("a", "Give the proof.", 3),
        hints: [
          "Use corresponding angles made by parallel lines.",
          "$\\angle ADE=\\angle ABC$ and $\\angle AED=\\angle ACB$.",
          "Then use AAA similarity.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies one pair of equal corresponding angles.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Identifies the second pair of equal corresponding angles.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes similarity by AAA.",
            },
          ],
        },
        commonErrors: [
          "Saying the triangles are congruent instead of similar.",
          "Not giving a reason for the angle equalities.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $DE\\parallel BC$, $\\angle ADE=\\angle ABC$ and $\\angle AED=\\angle ACB$.",
          },
          {
            part: "a",
            explanation:
              "Also $\\angle A$ is common. Hence $\\triangle ADE\\sim\\triangle ABC$ by AAA.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A vertical pole of height $1.5$ m casts a shadow of $2$ m. At the same time, a building casts a shadow of $18$ m. Find the height of the building, explaining the similarity used.`,
        difficulty: 3,
        skillTags: ["similarity_application", "shadow_problem"],
        parts: singlePart(
          "a",
          "Find the building height with similarity reasoning.",
          4,
        ),
        hints: [
          "Both objects and their shadows form right triangles.",
          "The sun's angle is the same, so the triangles are similar.",
          "Set height-to-shadow ratios equal.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States why the triangles are similar.",
            },
            {
              part: "a",
              points: 1,
              description: "Sets up the correct proportion.",
            },
            {
              part: "a",
              points: 1,
              description: "Solves the proportion correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "States the height with units.",
            },
          ],
        },
        commonErrors: [
          "Using shadow-to-height for one object and height-to-shadow for the other.",
          "Ignoring the shared sun angle that justifies similarity.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The pole-shadow and building-shadow triangles are similar because both are right triangles and have the same angle of elevation of the sun.",
          },
          {
            part: "a",
            explanation:
              "Let the building height be $h$. Then $\\frac{h}{18}=\\frac{1.5}{2}$.",
          },
          {
            part: "a",
            explanation: "So $h=18\\cdot\\frac{1.5}{2}=13.5$ m.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school makes a small triangular logo and a larger similar logo. The small logo has sides $6$ cm, $8$ cm and $10$ cm. The side corresponding to $6$ cm is $15$ cm in the larger logo.`,
        difficulty: 3,
        skillTags: ["similarity", "scale_factor", "perimeter_ratio"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the scale factor from the small logo to the large logo.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the remaining two sides of the larger logo.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the perimeter of the larger logo.",
            points: 1,
          },
        ],
        hints: [
          "Use the pair of corresponding sides $6$ and $15$.",
          "Multiply every side of the small logo by the same scale factor.",
          "Add the three larger sides at the end.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds scale factor $\\frac52$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds the other larger sides $20$ cm and $25$ cm.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds the larger perimeter $60$ cm.",
            },
          ],
        },
        commonErrors: [
          "Adding a fixed $9$ cm to all sides instead of scaling.",
          "Scaling only one side and leaving the others unchanged.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The scale factor is $\\frac{15}{6}=\\frac52$.",
          },
          {
            part: "b",
            explanation:
              "The other sides are $8\\cdot\\frac52=20$ cm and $10\\cdot\\frac52=25$ cm.",
          },
          {
            part: "c",
            explanation: "The larger perimeter is $15+20+25=60$ cm.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Areas of Similar Triangles and Pythagoras",
    subtopic:
      "Area ratios of similar triangles, Pythagoras theorem, converse, and altitude-to-hypotenuse applications.",
    mc: [
      {
        questionLatex: L`If two similar triangles have corresponding side ratio $3:4$, then their area ratio is`,
        difficulty: 1,
        skillTags: ["area_ratio_similar_triangles"],
        choices: [L`$9:16$`, L`$3:4$`, L`$6:8$`, L`$27:64$`],
        correctLetter: "A",
        rationales: {
          B: "This is the side ratio, not the area ratio.",
          C: "This is just another form of the side ratio.",
          D: "This cubes the side ratio, but areas scale by the square.",
        },
        hints: [
          "Areas of similar triangles scale as the square of corresponding sides.",
          "Square both terms of $3:4$.",
          "$3^2:4^2$ gives the answer.",
        ],
        solution: [
          {
            explanation:
              "For similar triangles, area ratio is the square of the side ratio.",
            math: "3^2:4^2=9:16",
          },
        ],
      },
      {
        questionLatex: L`The areas of two similar triangles are in the ratio $25:36$. If a side of the smaller triangle is $15$ cm, the corresponding side of the larger triangle is`,
        difficulty: 2,
        skillTags: ["area_ratio_similar_triangles", "side_ratio"],
        choices: [L`$16$ cm`, L`$20$ cm`, L`$21.6$ cm`, L`$18$ cm`],
        correctLetter: "D",
        rationales: {
          A: "This does not use the square-root relationship between areas and sides.",
          B: "This uses an incorrect scale factor of $4/3$.",
          C: "This multiplies by $36/25$ instead of using its square root.",
        },
        hints: [
          "Take the square root of the area ratio.",
          "The side ratio is $5:6$.",
          "Scale $15$ by $6/5$.",
        ],
        solution: [
          {
            explanation: "The side ratio is $\\sqrt{25}:\\sqrt{36}=5:6$.",
          },
          {
            explanation: "The larger side is $15\\cdot\\frac65=18$ cm.",
          },
        ],
      },
      {
        questionLatex: L`In a right triangle, the perpendicular sides are $9$ cm and $12$ cm. The hypotenuse is`,
        difficulty: 1,
        figure: rightTriangleFigure,
        skillTags: ["pythagoras_theorem"],
        choices: [L`$14$ cm`, L`$15$ cm`, L`$21$ cm`, L`$18$ cm`],
        correctLetter: "B",
        rationales: {
          A: "This is close numerically but does not satisfy Pythagoras.",
          C: "This adds the two legs instead of using squares.",
          D: "This doubles one leg and ignores the other.",
        },
        hints: [
          "Use $h^2=9^2+12^2$.",
          "$81+144=225$.",
          "Take the square root at the end.",
        ],
        solution: [
          {
            explanation: "By Pythagoras theorem,",
            math: "h=\\sqrt{9^2+12^2}=\\sqrt{225}=15",
          },
        ],
      },
      {
        questionLatex: L`Which set of side lengths can form a right triangle?`,
        difficulty: 2,
        skillTags: ["converse_pythagoras"],
        choices: [L`$6,8,9$`, L`$8,15,16$`, L`$7,24,25$`, L`$5,12,14$`],
        correctLetter: "C",
        rationales: {
          A: "$6^2+8^2=100$, not $9^2$.",
          B: "$8^2+15^2=289$, but $16^2=256$.",
          D: "$5^2+12^2=169$, but $14^2=196$.",
        },
        hints: [
          "Use the converse of Pythagoras theorem.",
          "Square the two smaller lengths and compare with the square of the largest.",
          "$7^2+24^2=25^2$.",
        ],
        solution: [
          {
            explanation: "Check the Pythagorean relation.",
            math: "7^2+24^2=49+576=625=25^2",
          },
          {
            explanation:
              "So $7,24,25$ can be the side lengths of a right triangle.",
          },
        ],
      },
      {
        questionLatex: L`A triangle has sides $6$ cm, $8$ cm and $10$ cm. The angle opposite the side $10$ cm is`,
        difficulty: 2,
        skillTags: ["converse_pythagoras", "right_angle_identification"],
        choices: [L`$30^\circ$`, L`$45^\circ$`, L`acute`, L`$90^\circ$`],
        correctLetter: "D",
        rationales: {
          A: "The side lengths do not determine a $30^\\circ$ angle here.",
          B: "A $45^\\circ$ conclusion would require a different side pattern.",
          C: "Since $6^2+8^2=10^2$, the opposite angle is right, not acute.",
        },
        hints: [
          "Compare squares of the side lengths.",
          "The largest side is opposite the largest angle.",
          "Use the converse of Pythagoras theorem.",
        ],
        solution: [
          {
            explanation: "Since",
            math: "6^2+8^2=36+64=100=10^2",
          },
          {
            explanation:
              "the triangle is right-angled, and the angle opposite the side $10$ cm is $90^\\circ$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`The areas of two similar triangles are in the ratio $16:25$. Find the ratio of their corresponding sides.`,
        difficulty: 1,
        skillTags: ["area_ratio_similar_triangles"],
        parts: singlePart("a", "Write the side ratio.", 1),
        hints: [
          "Take the square root of the area ratio.",
          "$\\sqrt{16}:\\sqrt{25}$ gives the side ratio.",
          "Areas scale with the square of side lengths.",
        ],
        rubric: singleRubric("a", 1, "Correctly writes $4:5$."),
        commonErrors: [
          "Writing the area ratio again as the side ratio.",
          "Squaring the area ratio instead of taking square roots.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The corresponding side ratio is $\\sqrt{16}:\\sqrt{25}=4:5$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The areas of two similar triangles are $49$ cm$^2$ and $81$ cm$^2$. If a side of the smaller triangle is $14$ cm, find the corresponding side of the larger triangle.`,
        difficulty: 2,
        skillTags: ["area_ratio_similar_triangles", "side_ratio"],
        parts: singlePart("a", "Find the corresponding side.", 3),
        hints: [
          "Find the ratio of the areas.",
          "Take square roots to get the side ratio.",
          "Scale $14$ by $9/7$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Writes area ratio $49:81$." },
            { part: "a", points: 1, description: "Finds side ratio $7:9$." },
            {
              part: "a",
              points: 1,
              description: "Finds the larger side $18$ cm.",
            },
          ],
        },
        commonErrors: [
          "Using $49:81$ directly as the side ratio.",
          "Applying the scale factor in the reverse direction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The ratio of corresponding sides is $\\sqrt{49}:\\sqrt{81}=7:9$.",
          },
          {
            part: "a",
            explanation:
              "If the smaller side is $14$ cm, the larger side is $14\\cdot\\frac97=18$ cm.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A ladder of length $13$ m reaches a window. Its foot is $5$ m away from the wall. Find the height of the window from the ground.`,
        difficulty: 2,
        skillTags: ["pythagoras_theorem", "application"],
        parts: singlePart("a", "Find the height.", 3),
        hints: [
          "Wall, ground and ladder form a right triangle.",
          "The ladder is the hypotenuse.",
          "Use $h^2+5^2=13^2$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies the right triangle correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses Pythagoras theorem correctly.",
            },
            { part: "a", points: 1, description: "Finds height $12$ m." },
          ],
        },
        commonErrors: [
          "Treating the ladder as a perpendicular side instead of the hypotenuse.",
          "Adding $13$ and $5$ instead of using squares.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Let the height be $h$. Then $h^2+5^2=13^2$.",
          },
          {
            part: "a",
            explanation: "$h^2=169-25=144$, so $h=12$ m.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In right $\triangle ABC$, $\angle A=90^\circ$, $D$ lies on $BC$ and $AD\perp BC$. Prove that $AB^2=BD\cdot BC$. If $AB=6$ cm and $BC=10$ cm, find $BD$.`,
        difficulty: 4,
        figure: altitudeTriangleFigure,
        skillTags: ["similarity_proof", "pythagoras_related_result"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Prove $AB^2=BD\\cdot BC$.",
            points: 3,
          },
          { letter: "b", promptMarkdown: "Find $BD$.", points: 1 },
        ],
        hints: [
          "Compare $\\triangle ABD$ and $\\triangle CBA$.",
          "Use one common or complementary angle and a right angle.",
          "After proving similarity, match corresponding sides carefully.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Establishes the required triangle similarity.",
            },
            {
              part: "a",
              points: 1,
              description: "Writes the correct corresponding-side ratio.",
            },
            {
              part: "a",
              points: 1,
              description: "Derives $AB^2=BD\\cdot BC$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $BD=\\frac{18}{5}$ cm.",
            },
          ],
        },
        commonErrors: [
          "Matching $AB$ with the wrong side after proving similarity.",
          "Using the final formula without proving the similar triangles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In $\\triangle ABD$ and $\\triangle CBA$, $\\angle ADB=\\angle CAB=90^\\circ$ and $\\angle ABD=\\angle CBA$.",
          },
          {
            part: "a",
            explanation:
              "So $\\triangle ABD\\sim\\triangle CBA$ by AA similarity.",
          },
          {
            part: "a",
            explanation:
              "Corresponding sides give $\\frac{BD}{BA}=\\frac{BA}{BC}$, hence $AB^2=BD\\cdot BC$.",
          },
          {
            part: "b",
            explanation:
              "$6^2=BD\\cdot10$, so $BD=\\frac{36}{10}=\\frac{18}{5}$ cm.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two similar triangular tiles are made. The smaller tile has sides $6$ cm, $8$ cm and $10$ cm and area $24$ cm$^2$. The side corresponding to $10$ cm is $25$ cm in the larger tile.`,
        difficulty: 3,
        skillTags: ["similar_triangles", "area_ratio", "pythagoras_theorem"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the scale factor from smaller to larger tile.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the area of the larger tile.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State why the smaller tile is right-angled.",
            points: 1,
          },
        ],
        hints: [
          "Use the corresponding sides $10$ and $25$.",
          "Areas scale by the square of the scale factor.",
          "For the right angle, check $6^2+8^2=10^2$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds scale factor $\\frac52$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Uses squared scale factor to get area $150$ cm$^2$.",
            },
            {
              part: "c",
              points: 1,
              description: "Uses converse of Pythagoras theorem.",
            },
          ],
        },
        commonErrors: [
          "Multiplying the area by $\\frac52$ instead of $\\left(\\frac52\\right)^2$.",
          "Calling the smaller triangle right-angled without checking the sides.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The scale factor is $\\frac{25}{10}=\\frac52$.",
          },
          {
            part: "b",
            explanation:
              "Area scale factor is $\\left(\\frac52\\right)^2=\\frac{25}{4}$, so larger area is $24\\cdot\\frac{25}{4}=150$ cm$^2$.",
          },
          {
            part: "c",
            explanation:
              "$6^2+8^2=36+64=100=10^2$, so it is right-angled by the converse of Pythagoras theorem.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Tangents to a Circle",
    subtopic:
      "Tangent-radius perpendicularity, tangent lengths from an external point, and angle applications.",
    mc: [
      {
        questionLatex: L`A tangent touches a circle at $T$ and $OT$ is the radius through the point of contact. The angle between $OT$ and the tangent is`,
        difficulty: 1,
        figure: tangentFigure,
        skillTags: ["tangent_radius_perpendicular"],
        choices: [L`$90^\circ$`, L`$60^\circ$`, L`$45^\circ$`, L`$180^\circ$`],
        correctLetter: "A",
        rationales: {
          B: "The tangent theorem gives a right angle, not an angle depending on the drawing.",
          C: "This would be a special triangle angle, not a general tangent property.",
          D: "The tangent and radius meet at a point, so they are perpendicular, not collinear.",
        },
        hints: [
          "Recall the tangent-radius theorem.",
          "The radius to the point of contact is perpendicular to the tangent.",
          "Perpendicular lines meet at a right angle.",
        ],
        solution: [
          {
            explanation:
              "The radius drawn to the point of contact of a tangent is perpendicular to the tangent.",
          },
          {
            explanation: "Hence the angle is $90^\\circ$.",
          },
        ],
      },
      {
        questionLatex: L`From an external point $P$, two tangents $PA$ and $PB$ are drawn to a circle. If $PA=7.5$ cm, then $PB$ is`,
        difficulty: 1,
        figure: twoTangentsFigure,
        skillTags: ["equal_tangents"],
        choices: [L`$15$ cm`, L`$7.5$ cm`, L`$3.75$ cm`, L`cannot be found`],
        correctLetter: "B",
        rationales: {
          A: "Tangent lengths from one external point are equal, not doubled.",
          C: "There is no halving in the equal tangents theorem.",
          D: "It can be found because both tangents come from the same external point.",
        },
        hints: [
          "Use the theorem about tangents from an external point.",
          "Both tangents start at $P$.",
          "So their lengths are equal.",
        ],
        solution: [
          {
            explanation:
              "Tangents drawn from the same external point to a circle are equal.",
          },
          {
            explanation: "Therefore $PB=PA=7.5$ cm.",
          },
        ],
      },
      {
        questionLatex: L`In the tangent figure, $OT=5$ cm and $OP=13$ cm. The tangent length $PT$ is`,
        difficulty: 2,
        figure: tangentFigure,
        skillTags: ["tangent_radius_perpendicular", "pythagoras_theorem"],
        choices: [L`$8$ cm`, L`$10$ cm`, L`$12$ cm`, L`$18$ cm`],
        correctLetter: "C",
        rationales: {
          A: "This subtracts the radius from $OP$ instead of using the right triangle.",
          B: "This is not consistent with $OP^2=OT^2+PT^2$.",
          D: "This adds $13$ and $5$ instead of applying Pythagoras theorem.",
        },
        hints: [
          "$OT\\perp PT$.",
          "Use right triangle $OTP$.",
          "$PT^2=OP^2-OT^2$.",
        ],
        solution: [
          {
            explanation:
              "Since radius $OT$ is perpendicular to tangent $PT$, $\\triangle OTP$ is right-angled at $T$.",
          },
          {
            explanation: "By Pythagoras theorem,",
            math: "PT=\\sqrt{13^2-5^2}=\\sqrt{144}=12",
          },
        ],
      },
      {
        questionLatex: L`From point $P$, tangents $PA$ and $PB$ touch a circle with centre $O$. If $\angle APB=60^\circ$, then $\angle AOB$ is`,
        difficulty: 3,
        figure: twoTangentsFigure,
        skillTags: ["two_tangents", "quadrilateral_angle_sum"],
        choices: [L`$60^\circ$`, L`$90^\circ$`, L`$100^\circ$`, L`$120^\circ$`],
        correctLetter: "D",
        rationales: {
          A: "The central angle is supplementary to the angle between the tangents in this quadrilateral.",
          B: "This ignores that both radius-tangent angles are already $90^\\circ$.",
          C: "This does not satisfy the angle sum of quadrilateral $AOBP$.",
        },
        hints: [
          "$OA\\perp PA$ and $OB\\perp PB$.",
          "Use quadrilateral $AOBP$.",
          "The four angles add to $360^\\circ$.",
        ],
        solution: [
          {
            explanation:
              "In quadrilateral $AOBP$, $\\angle OAP=90^\\circ$ and $\\angle OBP=90^\\circ$.",
          },
          {
            explanation:
              "$\\angle AOB+60^\\circ+90^\\circ+90^\\circ=360^\\circ$, so $\\angle AOB=120^\\circ$.",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Tangents drawn from an external point to a circle are equal in length. Reason (R): The radii to the points of contact are perpendicular to the tangents, and RHS congruence can compare the two right triangles.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "equal_tangents", "congruence_proof"],
        choices: [
          L`Both A and R are true, and R is the correct explanation of A.`,
          L`Both A and R are true, but R is not the correct explanation of A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason gives the standard proof idea for equal tangent lengths.",
          C: "The perpendicular-radius and RHS reasoning are both valid.",
          D: "The equal tangents theorem is true.",
        },
        hints: [
          "Think of the two right triangles formed with the centre and external point.",
          "The hypotenuse is common and the radii are equal.",
          "That proves the tangent segments equal.",
        ],
        solution: [
          {
            explanation:
              "The assertion is the equal tangents theorem, and the reason outlines its proof using right-triangle congruence.",
          },
          {
            explanation:
              "Hence both are true and the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A tangent touches a circle at $T$ and $OT$ is the radius through $T$. Find $\angle OTP$.`,
        difficulty: 1,
        figure: tangentFigure,
        skillTags: ["tangent_radius_perpendicular"],
        parts: singlePart("a", "Find the angle.", 1),
        hints: [
          "Use the tangent-radius theorem.",
          "The radius at the point of contact is perpendicular to the tangent.",
          "A perpendicular angle is a right angle.",
        ],
        rubric: singleRubric("a", 1, "Correctly writes $90^\\circ$."),
        commonErrors: [
          "Estimating the angle from the drawing.",
          "Forgetting that the theorem applies at the point of contact.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$OT$ is perpendicular to the tangent at $T$, so $\\angle OTP=90^\\circ$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A tangent from $P$ touches a circle at $T$. If $OP=10$ cm and the radius $OT=6$ cm, find $PT$.`,
        difficulty: 2,
        figure: tangentFigure,
        skillTags: ["tangent_radius_perpendicular", "pythagoras_theorem"],
        parts: singlePart("a", "Find the tangent length.", 3),
        hints: [
          "$OT\\perp PT$.",
          "Use right triangle $OTP$.",
          "$PT^2=OP^2-OT^2$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States or uses $OT\\perp PT$.",
            },
            {
              part: "a",
              points: 1,
              description: "Applies Pythagoras theorem correctly.",
            },
            { part: "a", points: 1, description: "Finds $PT=8$ cm." },
          ],
        },
        commonErrors: [
          "Using $OP+OT$ or $OP-OT$ as the tangent length.",
          "Putting $PT$ as the hypotenuse.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Since $OT\\perp PT$, $OP^2=OT^2+PT^2$.",
          },
          {
            part: "a",
            explanation: "$PT=\\sqrt{10^2-6^2}=\\sqrt{64}=8$ cm.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`From an external point $P$, tangents $PA$ and $PB$ are drawn to a circle. If $PA=12$ cm and $AB=10$ cm, find the perimeter of $\triangle PAB$.`,
        difficulty: 2,
        figure: twoTangentsFigure,
        skillTags: ["equal_tangents", "perimeter"],
        parts: singlePart("a", "Find the perimeter.", 3),
        hints: [
          "Use equal tangents from an external point.",
          "$PB=PA$.",
          "Add $PA$, $PB$ and $AB$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses $PA=PB$." },
            { part: "a", points: 1, description: "Finds $PB=12$ cm." },
            { part: "a", points: 1, description: "Finds perimeter $34$ cm." },
          ],
        },
        commonErrors: [
          "Assuming $AB$ is also equal to the tangent lengths.",
          "Adding only two sides of the triangle.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Tangents from the same external point are equal, so $PB=PA=12$ cm.",
          },
          {
            part: "a",
            explanation: "Perimeter of $\\triangle PAB=12+12+10=34$ cm.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Prove that the lengths of tangents drawn from an external point to a circle are equal.`,
        difficulty: 4,
        figure: twoTangentsFigure,
        skillTags: ["equal_tangents", "proof", "rhs_congruence"],
        parts: singlePart("a", "Give a complete proof.", 4),
        hints: [
          "Join the centre to the two points of contact and to the external point.",
          "Each radius is perpendicular to its tangent.",
          "Use RHS congruence on the two right triangles.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Draws or describes $OA$, $OB$ and $OP$.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses perpendicular radius-tangent angles.",
            },
            {
              part: "a",
              points: 1,
              description: "Proves the two right triangles congruent.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes the tangent lengths are equal.",
            },
          ],
        },
        commonErrors: [
          "Assuming the tangent lengths are equal without proof.",
          "Using an angle-only argument instead of congruence.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $PA$ and $PB$ be tangents and $O$ be the centre. Join $OA$, $OB$ and $OP$.",
          },
          {
            part: "a",
            explanation:
              "$OA\\perp PA$ and $OB\\perp PB$, so $\\triangle OAP$ and $\\triangle OBP$ are right triangles.",
          },
          {
            part: "a",
            explanation:
              "$OP$ is common and $OA=OB$ as radii. Hence $\\triangle OAP\\cong\\triangle OBP$ by RHS.",
          },
          {
            part: "a",
            explanation:
              "Therefore $PA=PB$ by corresponding parts of congruent triangles.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A circular roundabout has centre $O$ and radius $7$ m. A straight road from point $P$ just touches the roundabout at $T$. The distance $OP$ is $25$ m.`,
        difficulty: 3,
        figure: tangentFigure,
        skillTags: [
          "tangent_radius_perpendicular",
          "pythagoras_theorem",
          "application",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the angle between $OT$ and the road $PT$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $PT$.", points: 2 },
          {
            letter: "c",
            promptMarkdown:
              "If another tangent from $P$ touches the roundabout at $S$, find $PS$.",
            points: 1,
          },
        ],
        hints: [
          "The radius to a tangent point is perpendicular to the tangent.",
          "Use right triangle $OPT$.",
          "Tangents from the same external point are equal.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States the angle is $90^\\circ$.",
            },
            { part: "b", points: 2, description: "Finds $PT=24$ m." },
            { part: "c", points: 1, description: "Finds $PS=24$ m." },
          ],
        },
        commonErrors: [
          "Subtracting $25-7$ to get the tangent length.",
          "Forgetting equal tangents for the second tangent.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$OT\\perp PT$, so the angle between them is $90^\\circ$.",
          },
          {
            part: "b",
            explanation:
              "$PT=\\sqrt{OP^2-OT^2}=\\sqrt{25^2-7^2}=\\sqrt{576}=24$ m.",
          },
          {
            part: "c",
            explanation: "Tangents from $P$ are equal, so $PS=PT=24$ m.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Mixed Geometry Proofs and Applications",
    subtopic:
      "Multi-step board-style problems combining similarity, BPT, area ratios, Pythagoras and tangent reasoning.",
    mc: [
      {
        questionLatex: L`In $\triangle ABC$, $DE\parallel BC$ and $AD:DB=2:3$. If the area of $\triangle ADE$ is $16$ cm$^2$, then the area of $\triangle ABC$ is`,
        difficulty: 3,
        figure: bptTriangleFigure,
        skillTags: ["similar_triangles", "area_ratio", "bpt"],
        choices: [
          L`$40$ cm$^2$`,
          L`$100$ cm$^2$`,
          L`$64$ cm$^2$`,
          L`$80$ cm$^2$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This scales area by the side ratio $2:5$ instead of its square.",
          C: "This uses a scale factor of $2$ without using the total side ratio.",
          D: "This uses $2:3$ as the triangle side ratio instead of $2:5$.",
        },
        hints: [
          "Find $AD:AB$ first.",
          "$AD:AB=2:5$.",
          "Area ratio is the square of side ratio.",
        ],
        solution: [
          {
            explanation:
              "$\\triangle ADE\\sim\\triangle ABC$ and $AD:AB=2:(2+3)=2:5$.",
          },
          {
            explanation: "$[ADE]:[ABC]=2^2:5^2=4:25$.",
          },
          {
            explanation: "So $16:[ABC]=4:25$, giving $[ABC]=100$ cm$^2$.",
          },
        ],
      },
      {
        questionLatex: L`In a triangle, a line divides two sides in the ratios $x:(x+4)$ and $3:5$. If the line is parallel to the third side, then $x$ is`,
        difficulty: 3,
        skillTags: ["basic_proportionality_theorem", "algebraic_ratio"],
        choices: [L`$4$`, L`$5$`, L`$6$`, L`$8$`],
        correctLetter: "C",
        rationales: {
          A: "This comes from subtracting the ratio terms instead of solving the proportion.",
          B: "This is the denominator difference, not the value satisfying the ratio.",
          D: "This makes the first ratio $8:12=2:3$, not $3:5$.",
        },
        hints: [
          "Set the two ratios equal.",
          "$\\frac{x}{x+4}=\\frac35$.",
          "Cross multiply carefully.",
        ],
        solution: [
          {
            explanation: "By BPT,",
            math: "\\frac{x}{x+4}=\\frac35",
          },
          {
            explanation: "$5x=3x+12$, so $x=6$.",
          },
        ],
      },
      {
        questionLatex: L`From a point $P$, a tangent of length $24$ cm is drawn to a circle with centre $O$. If $OP=25$ cm, the radius of the circle is`,
        difficulty: 2,
        figure: tangentFigure,
        skillTags: ["tangent_radius_perpendicular", "pythagoras_theorem"],
        choices: [L`$5$ cm`, L`$6$ cm`, L`$8$ cm`, L`$7$ cm`],
        correctLetter: "D",
        rationales: {
          A: "This is part of another Pythagorean triple, but not for $24$ and $25$.",
          B: "This does not satisfy $r^2+24^2=25^2$.",
          C: "This is too large for the given right triangle.",
        },
        hints: [
          "The radius to the tangent point is perpendicular to the tangent.",
          "Use $OP^2=r^2+24^2$.",
          "Recognise the $7$-$24$-$25$ right triangle.",
        ],
        solution: [
          {
            explanation: "In right triangle $OTP$,",
            math: "r^2+24^2=25^2",
          },
          {
            explanation: "$r^2=625-576=49$, so $r=7$ cm.",
          },
        ],
      },
      {
        questionLatex: L`Two similar triangles have perimeters $24$ cm and $36$ cm. If the area of the smaller triangle is $64$ cm$^2$, then the area of the larger triangle is`,
        difficulty: 3,
        skillTags: ["perimeter_ratio", "area_ratio_similar_triangles"],
        choices: [
          L`$96$ cm$^2$`,
          L`$128$ cm$^2$`,
          L`$144$ cm$^2$`,
          L`$216$ cm$^2$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This multiplies area by the side ratio $3/2$ instead of its square.",
          B: "This uses a scale factor of $2$ without matching the perimeter ratio.",
          D: "This cubes the scale factor instead of squaring it for area.",
        },
        hints: [
          "For similar triangles, perimeter ratio equals side ratio.",
          "The side ratio smaller:larger is $24:36=2:3$.",
          "Area ratio is $4:9$.",
        ],
        solution: [
          {
            explanation:
              "The side ratio is $24:36=2:3$, so the area ratio is $4:9$.",
          },
          {
            explanation:
              "$64:[\\text{larger area}]=4:9$, so larger area is $144$ cm$^2$.",
          },
        ],
      },
      {
        questionLatex: L`A student claims: "If two sides of one triangle are proportional to two sides of another triangle, the triangles must be similar." The correction is`,
        difficulty: 3,
        skillTags: ["claim_correction", "sas_similarity"],
        choices: [
          L`The claim is always true by SSS similarity.`,
          L`The claim is true only when the triangles are right-angled.`,
          L`The claim is true only if the included angles are also equal, or if all three side ratios are equal.`,
          L`The claim is false because side ratios are never used for similarity.`,
        ],
        correctLetter: "C",
        rationales: {
          A: "SSS similarity needs all three corresponding side ratios, not only two.",
          B: "Right-angled information is not the general condition for similarity here.",
          D: "Side ratios are used in SSS and SAS similarity, but the conditions must be complete.",
        },
        hints: [
          "Recall SAS similarity carefully.",
          "Two proportional side pairs alone are not enough.",
          "You also need the included angle, unless all three side ratios are known.",
        ],
        solution: [
          {
            explanation:
              "Two side ratios alone do not force similarity because the included angle may differ.",
          },
          {
            explanation:
              "The corrected statement is: two proportional side pairs and the included angle equal give SAS similarity, or all three side ratios equal give SSS similarity.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In a triangle, a line parallel to one side divides the other two sides in the ratios $x:(x+5)$ and $2:3$. Find $x$.`,
        difficulty: 2,
        skillTags: ["basic_proportionality_theorem", "algebraic_ratio"],
        parts: singlePart("a", "Find $x$.", 2),
        hints: [
          "Set the two ratios equal.",
          "Use $\\frac{x}{x+5}=\\frac23$.",
          "Cross multiply.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Forms the correct proportion.",
            },
            { part: "a", points: 1, description: "Solves to get $x=10$." },
          ],
        },
        commonErrors: [
          "Solving $x+5=3$ directly.",
          "Using $x:5$ instead of $x:(x+5)$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\frac{x}{x+5}=\\frac23$, so $3x=2x+10$ and $x=10$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In $\triangle ABC$, $DE\parallel BC$ and $AD:AB=3:7$. If the area of $\triangle ADE$ is $45$ cm$^2$, find the area of $\triangle ABC$.`,
        difficulty: 3,
        figure: bptTriangleFigure,
        skillTags: ["similar_triangles", "area_ratio"],
        parts: singlePart("a", "Find the area of the larger triangle.", 3),
        hints: [
          "$\\triangle ADE\\sim\\triangle ABC$.",
          "Area ratio is the square of the corresponding side ratio.",
          "$[ADE]:[ABC]=9:49$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies the similar triangles.",
            },
            { part: "a", points: 1, description: "Uses area ratio $9:49$." },
            { part: "a", points: 1, description: "Finds area $245$ cm$^2$." },
          ],
        },
        commonErrors: [
          "Using $3:7$ directly as the area ratio.",
          "Reversing the smaller and larger triangle areas.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $DE\\parallel BC$, $\\triangle ADE\\sim\\triangle ABC$.",
          },
          {
            part: "a",
            explanation: "$[ADE]:[ABC]=3^2:7^2=9:49$.",
          },
          {
            part: "a",
            explanation:
              "$45:[ABC]=9:49$, so $[ABC]=45\\cdot\\frac{49}{9}=245$ cm$^2$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A tangent from $P$ to a circle is $20$ cm long. The distance from $P$ to the centre is $29$ cm. Find the radius of the circle.`,
        difficulty: 3,
        figure: tangentFigure,
        skillTags: ["tangent_radius_perpendicular", "pythagoras_theorem"],
        parts: singlePart("a", "Find the radius.", 3),
        hints: [
          "Radius to tangent point is perpendicular to the tangent.",
          "Use $OP^2=OT^2+PT^2$.",
          "The radius is $OT$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Forms a right triangle using tangent-radius perpendicularity.",
            },
            {
              part: "a",
              points: 1,
              description: "Applies Pythagoras theorem correctly.",
            },
            { part: "a", points: 1, description: "Finds radius $21$ cm." },
          ],
        },
        commonErrors: [
          "Subtracting $29-20$ to get the radius.",
          "Treating the tangent as the hypotenuse.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Let the radius be $r$. Then $r^2+20^2=29^2$.",
          },
          {
            part: "a",
            explanation: "$r^2=841-400=441$, so $r=21$ cm.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In right $\triangle ABC$, $\angle A=90^\circ$, $D$ lies on $BC$ and $AD\perp BC$. Prove that $\triangle ABD$, $\triangle ADC$ and $\triangle ABC$ are similar. If $AB=6$ cm and $AC=8$ cm, find $AD$.`,
        difficulty: 4,
        figure: altitudeTriangleFigure,
        skillTags: ["similarity_proof", "pythagoras_theorem", "area_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Prove the three triangles are similar.",
            points: 3,
          },
          { letter: "b", promptMarkdown: "Find $AD$.", points: 2 },
        ],
        hints: [
          "Use the right angles and shared/complementary acute angles.",
          "First find $BC$ using Pythagoras theorem.",
          "Use equality of area: $\\frac12 AB\\cdot AC=\\frac12 BC\\cdot AD$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Correctly proves two relevant triangle similarities.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes all three triangles are similar.",
            },
            { part: "b", points: 1, description: "Finds $BC=10$ cm." },
            {
              part: "b",
              points: 1,
              description: "Finds $AD=\\frac{24}{5}$ cm.",
            },
          ],
        },
        commonErrors: [
          "Assuming all triangles are congruent because they are right triangles.",
          "Using $AD$ as the hypotenuse in the area calculation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\triangle ABD\\sim\\triangle ABC$ because both have a right angle and share angle $B$.",
          },
          {
            part: "a",
            explanation:
              "$\\triangle ADC\\sim\\triangle ABC$ because both have a right angle and share angle $C$.",
          },
          {
            part: "a",
            explanation:
              "Hence $\\triangle ABD$, $\\triangle ADC$ and $\\triangle ABC$ are all similar.",
          },
          {
            part: "b",
            explanation:
              "$BC=\\sqrt{6^2+8^2}=10$ cm. Also, $\\frac12\\cdot6\\cdot8=\\frac12\\cdot10\\cdot AD$.",
          },
          {
            part: "b",
            explanation: "Therefore $24=5AD$, so $AD=\\frac{24}{5}$ cm.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A designer makes a triangular frame $ABC$ with a support $DE$ parallel to $BC$. The support divides $AB$ so that $AD:DB=2:3$. The small triangular part $ADE$ has area $36$ cm$^2$. Separately, a circular badge on the frame has radius $9$ cm and a tangent is drawn from a point $25$ cm from its centre.`,
        difficulty: 4,
        skillTags: [
          "similar_triangles",
          "area_ratio",
          "tangent_radius_perpendicular",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the area of $\\triangle ABC$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the tangent length to the circular badge.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State one theorem used in part (a) and one theorem used in part (b).",
            points: 1,
          },
        ],
        hints: [
          "For the triangles, convert $AD:DB$ into $AD:AB$.",
          "For the tangent, use a right triangle with radius and tangent.",
          "Name the similarity/area-ratio theorem and tangent-radius perpendicularity.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $[ABC]=225$ cm$^2$." },
            {
              part: "b",
              points: 2,
              description: "Finds tangent length $\\sqrt{544}=4\\sqrt{34}$ cm.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Names appropriate similarity/area ratio and tangent-radius/Pythagoras theorem.",
            },
          ],
        },
        commonErrors: [
          "Using $2:3$ as the small-to-large side ratio instead of $2:5$.",
          "Subtracting radius from centre distance to find tangent length.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$AD:AB=2:5$, so $[ADE]:[ABC]=4:25$. Hence $36:[ABC]=4:25$ and $[ABC]=225$ cm$^2$.",
          },
          {
            part: "b",
            explanation:
              "If tangent length is $t$, then $t^2+9^2=25^2$, so $t^2=544$ and $t=4\\sqrt{34}$ cm.",
          },
          {
            part: "c",
            explanation:
              "Part (a) uses similarity/area ratio of similar triangles; part (b) uses tangent-radius perpendicularity with Pythagoras theorem.",
          },
        ],
      },
    ],
  },
];

export const geometryXTopics: Topic[] = [...topicSeeds].map(makeTopic);
