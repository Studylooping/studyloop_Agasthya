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

const COURSE = "cbse-math-12";
const UNIT = "u2-algebra";
const VERSION = "0.2.1";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const MC_DIFFICULTY_FLOORS = [2, 2, 3, 3, 4] as const;

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
  rationales?: Partial<Record<McLetter, string>>;
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, index: number): Difficulty {
  return Math.max(seedDifficulty, MC_DIFFICULTY_FLOORS[index] ?? 2) as Difficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, type: ResponseType): Difficulty {
  const floor = type === "laq" || type === "case" ? 4 : type === "saq" ? 3 : 2;
  return Math.max(seedDifficulty, floor) as Difficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("matrix_order") || tags.has("matrix_equality")) {
    return "Check the order of the matrix and compare only corresponding entries.";
  }
  if (tags.has("matrix_operations") || tags.has("matrix_multiplication")) {
    return "Match dimensions first, then compute row-by-column entries carefully.";
  }
  if (tags.has("transpose") || tags.has("symmetric_matrix") || tags.has("skew_symmetric_matrix")) {
    return "Use transpose rules: symmetric means $A^T=A$, while skew-symmetric means $A^T=-A$.";
  }
  if (tags.has("inverse_matrix") || tags.has("matrix_equation")) {
    return "Check determinant or inverse conditions before solving the matrix equation.";
  }
  if (tags.has("determinants") || tags.has("cofactors")) {
    return "Watch the determinant signs; cofactors include the factor $(-1)^{i+j}$.";
  }
  if (tags.has("area_triangle")) {
    return "Use the determinant area formula and take the absolute value at the end.";
  }
  if (tags.has("systems")) {
    return "Use the coefficient determinant to decide uniqueness before solving.";
  }

  return "Use the exact algebra rule required by this CBSE Class 12 topic.";
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. ${feedbackFocus(seed)}${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_algebra_reasoning",
    };
  });

  const rotation = index % LETTERS.length;
  const rotatedChoices =
    rotation === 0
      ? unletteredChoices
      : [
          ...unletteredChoices.slice(-rotation),
          ...unletteredChoices.slice(0, -rotation),
        ];
  const choices = rotatedChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];
  const correctLetter = choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_checking_conditions",
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

function makeConstructed(meta: TopicMeta, seed: ConstructedSeed, index: number): FrqItem {
  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_showing_required_work",
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
  const meta: TopicMeta = {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
  };

  return {
    ...meta,
    items: [
      ...seed.mc.map((item, index) => makeMc(meta, item, index)),
      ...seed.constructed.map((item, index) => makeConstructed(meta, item, index)),
    ],
  };
}

function singlePart(letter: string, promptMarkdown: string, points: number): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(part: string, points: number, description: string): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const triangleAreaFigure: ItemFigure = {
  type: "svg",
  title: "Triangle from coordinate points",
  description:
    "Coordinate sketch of a triangle with vertices A(2,1), B(5,3), and C(-1,4).",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <line x1="68" y1="286" x2="500" y2="286" stroke="#64748b" stroke-width="2"/>
  <line x1="164" y1="42" x2="164" y2="312" stroke="#64748b" stroke-width="2"/>
  <path d="M 500 286 L 488 280 M 500 286 L 488 292" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 164 42 L 158 54 M 164 42 L 170 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="508" y="291" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="172" y="40" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <polygon points="260,226 404,166 116,136" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="260" cy="226" r="6" fill="#2563eb"/>
  <circle cx="404" cy="166" r="6" fill="#2563eb"/>
  <circle cx="116" cy="136" r="6" fill="#2563eb"/>
  <text x="268" y="220" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">A(2,1)</text>
  <text x="410" y="160" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">B(5,3)</text>
  <text x="58" y="130" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">C(-1,4)</text>
</svg>`,
};

const productDimensionThreeTwoFigure: ItemFigure = {
  type: "svg",
  title: "Matrix product dimensions",
  description:
    "Dimension diagram showing a 3 by 2 matrix multiplied by a 2 by 4 matrix to produce a 3 by 4 matrix.",
  svg: `
<svg viewBox="0 0 640 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="640" height="300" rx="12" fill="#f8fafc"/>
  <text x="320" y="38" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Matrix product order</text>
  <rect x="70" y="84" width="105" height="120" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="70" y1="124" x2="175" y2="124" stroke="#93c5fd" stroke-width="2"/>
  <line x1="70" y1="164" x2="175" y2="164" stroke="#93c5fd" stroke-width="2"/>
  <line x1="122.5" y1="84" x2="122.5" y2="204" stroke="#93c5fd" stroke-width="2"/>
  <text x="122.5" y="232" text-anchor="middle" font-size="18" fill="#1e3a8a" font-family="Arial, sans-serif">A: 3 x 2</text>
  <text x="220" y="150" text-anchor="middle" font-size="34" fill="#475569" font-family="Arial, sans-serif">x</text>
  <rect x="265" y="104" width="140" height="80" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <line x1="265" y1="144" x2="405" y2="144" stroke="#86efac" stroke-width="2"/>
  <line x1="300" y1="104" x2="300" y2="184" stroke="#86efac" stroke-width="2"/>
  <line x1="335" y1="104" x2="335" y2="184" stroke="#86efac" stroke-width="2"/>
  <line x1="370" y1="104" x2="370" y2="184" stroke="#86efac" stroke-width="2"/>
  <text x="335" y="232" text-anchor="middle" font-size="18" fill="#14532d" font-family="Arial, sans-serif">B: 2 x 4</text>
  <path d="M 430 145 H 485" stroke="#64748b" stroke-width="3"/>
  <path d="M 485 145 L 473 138 M 485 145 L 473 152" stroke="#64748b" stroke-width="3" fill="none"/>
  <rect x="510" y="84" width="105" height="120" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <line x1="510" y1="124" x2="615" y2="124" stroke="#fbbf24" stroke-width="2"/>
  <line x1="510" y1="164" x2="615" y2="164" stroke="#fbbf24" stroke-width="2"/>
  <line x1="536.25" y1="84" x2="536.25" y2="204" stroke="#fbbf24" stroke-width="2"/>
  <line x1="562.5" y1="84" x2="562.5" y2="204" stroke="#fbbf24" stroke-width="2"/>
  <line x1="588.75" y1="84" x2="588.75" y2="204" stroke="#fbbf24" stroke-width="2"/>
  <text x="562.5" y="232" text-anchor="middle" font-size="18" fill="#92400e" font-family="Arial, sans-serif">AB: 3 x 4</text>
  <text x="320" y="272" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">Inner dimensions match: 2 and 2. Outer dimensions remain: 3 and 4.</text>
</svg>`,
};

const productDimensionTwoThreeFigure: ItemFigure = {
  type: "svg",
  title: "Row-by-column product dimensions",
  description:
    "Dimension diagram showing a 2 by 3 matrix multiplied by a 3 by 2 matrix to produce a 2 by 2 matrix.",
  svg: `
<svg viewBox="0 0 640 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="640" height="300" rx="12" fill="#f8fafc"/>
  <text x="320" y="38" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Row-by-column multiplication</text>
  <rect x="72" y="104" width="132" height="80" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="72" y1="144" x2="204" y2="144" stroke="#93c5fd" stroke-width="2"/>
  <line x1="116" y1="104" x2="116" y2="184" stroke="#93c5fd" stroke-width="2"/>
  <line x1="160" y1="104" x2="160" y2="184" stroke="#93c5fd" stroke-width="2"/>
  <text x="138" y="232" text-anchor="middle" font-size="18" fill="#1e3a8a" font-family="Arial, sans-serif">A: 2 x 3</text>
  <text x="244" y="150" text-anchor="middle" font-size="34" fill="#475569" font-family="Arial, sans-serif">x</text>
  <rect x="285" y="84" width="90" height="120" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <line x1="285" y1="124" x2="375" y2="124" stroke="#86efac" stroke-width="2"/>
  <line x1="285" y1="164" x2="375" y2="164" stroke="#86efac" stroke-width="2"/>
  <line x1="330" y1="84" x2="330" y2="204" stroke="#86efac" stroke-width="2"/>
  <text x="330" y="232" text-anchor="middle" font-size="18" fill="#14532d" font-family="Arial, sans-serif">B: 3 x 2</text>
  <path d="M 410 145 H 478" stroke="#64748b" stroke-width="3"/>
  <path d="M 478 145 L 466 138 M 478 145 L 466 152" stroke="#64748b" stroke-width="3" fill="none"/>
  <rect x="510" y="104" width="90" height="80" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <line x1="510" y1="144" x2="600" y2="144" stroke="#fbbf24" stroke-width="2"/>
  <line x1="555" y1="104" x2="555" y2="184" stroke="#fbbf24" stroke-width="2"/>
  <text x="555" y="232" text-anchor="middle" font-size="18" fill="#92400e" font-family="Arial, sans-serif">AB: 2 x 2</text>
  <text x="320" y="272" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">A row of A combines with a column of B to make each entry of AB.</text>
</svg>`,
};

const cofactorSignPatternFigure: ItemFigure = {
  type: "svg",
  title: "Cofactor sign pattern",
  description:
    "The 3 by 3 cofactor sign checkerboard: plus minus plus, minus plus minus, plus minus plus.",
  svg: `
<svg viewBox="0 0 420 330" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="420" height="330" rx="12" fill="#f8fafc"/>
  <text x="210" y="38" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Cofactor signs</text>
  <g transform="translate(90 66)">
    <rect x="0" y="0" width="80" height="70" fill="#dcfce7" stroke="#94a3b8" stroke-width="2"/>
    <rect x="80" y="0" width="80" height="70" fill="#fee2e2" stroke="#94a3b8" stroke-width="2"/>
    <rect x="160" y="0" width="80" height="70" fill="#dcfce7" stroke="#94a3b8" stroke-width="2"/>
    <rect x="0" y="70" width="80" height="70" fill="#fee2e2" stroke="#94a3b8" stroke-width="2"/>
    <rect x="80" y="70" width="80" height="70" fill="#dcfce7" stroke="#94a3b8" stroke-width="2"/>
    <rect x="160" y="70" width="80" height="70" fill="#fee2e2" stroke="#94a3b8" stroke-width="2"/>
    <rect x="0" y="140" width="80" height="70" fill="#dcfce7" stroke="#94a3b8" stroke-width="2"/>
    <rect x="80" y="140" width="80" height="70" fill="#fee2e2" stroke="#94a3b8" stroke-width="2"/>
    <rect x="160" y="140" width="80" height="70" fill="#dcfce7" stroke="#94a3b8" stroke-width="2"/>
    <text x="40" y="45" text-anchor="middle" font-size="36" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">+</text>
    <text x="120" y="45" text-anchor="middle" font-size="36" font-weight="700" fill="#b91c1c" font-family="Arial, sans-serif">-</text>
    <text x="200" y="45" text-anchor="middle" font-size="36" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">+</text>
    <text x="40" y="115" text-anchor="middle" font-size="36" font-weight="700" fill="#b91c1c" font-family="Arial, sans-serif">-</text>
    <text x="120" y="115" text-anchor="middle" font-size="36" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">+</text>
    <text x="200" y="115" text-anchor="middle" font-size="36" font-weight="700" fill="#b91c1c" font-family="Arial, sans-serif">-</text>
    <text x="40" y="185" text-anchor="middle" font-size="36" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">+</text>
    <text x="120" y="185" text-anchor="middle" font-size="36" font-weight="700" fill="#b91c1c" font-family="Arial, sans-serif">-</text>
    <text x="200" y="185" text-anchor="middle" font-size="36" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">+</text>
  </g>
  <text x="210" y="292" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">Cij = sign x minor, using (-1)^(i+j)</text>
</svg>`,
};

const clubEnrollmentBarFigure: ItemFigure = {
  type: "svg",
  title: "Club enrollment matrix data",
  description:
    "Grouped bar chart for boys and girls in Debate, Science, and Art clubs.",
  svg: `
<svg viewBox="0 0 640 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="640" height="360" rx="12" fill="#f8fafc"/>
  <text x="320" y="36" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Club enrollment</text>
  <line x1="70" y1="286" x2="585" y2="286" stroke="#64748b" stroke-width="2"/>
  <line x1="70" y1="66" x2="70" y2="286" stroke="#64748b" stroke-width="2"/>
  <text x="36" y="90" font-size="13" fill="#64748b" font-family="Arial, sans-serif">20</text>
  <text x="36" y="190" font-size="13" fill="#64748b" font-family="Arial, sans-serif">10</text>
  <line x1="66" y1="86" x2="585" y2="86" stroke="#e2e8f0" stroke-width="1"/>
  <line x1="66" y1="186" x2="585" y2="186" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="132" y="106" width="30" height="180" fill="#2563eb"/>
  <rect x="168" y="166" width="30" height="120" fill="#16a34a"/>
  <rect x="288" y="136" width="30" height="150" fill="#2563eb"/>
  <rect x="324" y="136" width="30" height="150" fill="#16a34a"/>
  <rect x="444" y="186" width="30" height="100" fill="#2563eb"/>
  <rect x="480" y="86" width="30" height="200" fill="#16a34a"/>
  <text x="150" y="310" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">Debate</text>
  <text x="306" y="310" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">Science</text>
  <text x="462" y="310" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">Art</text>
  <rect x="226" y="326" width="14" height="14" fill="#2563eb"/>
  <text x="246" y="338" font-size="13" fill="#334155" font-family="Arial, sans-serif">Boys</text>
  <rect x="320" y="326" width="14" height="14" fill="#16a34a"/>
  <text x="340" y="338" font-size="13" fill="#334155" font-family="Arial, sans-serif">Girls</text>
</svg>`,
};

const salesMatrixBarFigure: ItemFigure = {
  type: "svg",
  title: "Two-day sales matrix data",
  description:
    "Grouped bar chart comparing Monday and Tuesday sales for notebooks and pens in two branches.",
  svg: `
<svg viewBox="0 0 700 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="700" height="380" rx="12" fill="#f8fafc"/>
  <text x="350" y="36" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Shop sales by matrix entry</text>
  <line x1="70" y1="304" x2="650" y2="304" stroke="#64748b" stroke-width="2"/>
  <line x1="70" y1="64" x2="70" y2="304" stroke="#64748b" stroke-width="2"/>
  <text x="35" y="128" font-size="13" fill="#64748b" font-family="Arial, sans-serif">60</text>
  <text x="35" y="218" font-size="13" fill="#64748b" font-family="Arial, sans-serif">30</text>
  <line x1="66" y1="124" x2="650" y2="124" stroke="#e2e8f0" stroke-width="1"/>
  <line x1="66" y1="214" x2="650" y2="214" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="112" y="214" width="26" height="90" fill="#2563eb"/>
  <rect x="144" y="199" width="26" height="105" fill="#16a34a"/>
  <rect x="244" y="169" width="26" height="135" fill="#2563eb"/>
  <rect x="276" y="184" width="26" height="120" fill="#16a34a"/>
  <rect x="376" y="229" width="26" height="75" fill="#2563eb"/>
  <rect x="408" y="244" width="26" height="60" fill="#16a34a"/>
  <rect x="508" y="154" width="26" height="150" fill="#2563eb"/>
  <rect x="540" y="124" width="26" height="180" fill="#16a34a"/>
  <text x="135" y="328" text-anchor="middle" font-size="13" fill="#334155" font-family="Arial, sans-serif">B1 N</text>
  <text x="267" y="328" text-anchor="middle" font-size="13" fill="#334155" font-family="Arial, sans-serif">B1 P</text>
  <text x="399" y="328" text-anchor="middle" font-size="13" fill="#334155" font-family="Arial, sans-serif">B2 N</text>
  <text x="531" y="328" text-anchor="middle" font-size="13" fill="#334155" font-family="Arial, sans-serif">B2 P</text>
  <rect x="250" y="350" width="14" height="14" fill="#2563eb"/>
  <text x="270" y="362" font-size="13" fill="#334155" font-family="Arial, sans-serif">Monday</text>
  <rect x="360" y="350" width="14" height="14" fill="#16a34a"/>
  <text x="380" y="362" font-size="13" fill="#334155" font-family="Arial, sans-serif">Tuesday</text>
</svg>`,
};

const coincidentLinesFigure: ItemFigure = {
  type: "svg",
  title: "Coincident linear equations",
  description:
    "Graph sketch showing x plus y equals 3 and 2x plus 2y equals 6 as the same line.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <line x1="70" y1="270" x2="510" y2="270" stroke="#64748b" stroke-width="2"/>
  <line x1="120" y1="42" x2="120" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M 510 270 L 498 264 M 510 270 L 498 276" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 120 42 L 114 54 M 120 42 L 126 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="516" y="275" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="128" y="40" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <path d="M 120 90 L 420 270" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M 120 90 L 420 270" stroke="#16a34a" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="9 7"/>
  <text x="245" y="122" font-size="16" fill="#1d4ed8" font-family="Arial, sans-serif">x + y = 3</text>
  <text x="300" y="164" font-size="16" fill="#15803d" font-family="Arial, sans-serif">2x + 2y = 6</text>
  <text x="280" y="308" text-anchor="middle" font-size="14" fill="#64748b" font-family="Arial, sans-serif">Both equations represent the same line.</text>
</svg>`,
};

const uniqueIntersectionFigure: ItemFigure = {
  type: "svg",
  title: "Intersecting linear equations",
  description:
    "Graph sketch of two non-parallel lines meeting once, representing a unique solution.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <line x1="70" y1="270" x2="510" y2="270" stroke="#64748b" stroke-width="2"/>
  <line x1="120" y1="42" x2="120" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M 510 270 L 498 264 M 510 270 L 498 276" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 120 42 L 114 54 M 120 42 L 126 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="516" y="275" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="128" y="40" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <path d="M 100 78 L 455 292" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 108 290 L 420 82" stroke="#dc2626" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="260" cy="174" r="7" fill="#111827"/>
  <text x="274" y="168" font-size="15" fill="#111827" font-family="Arial, sans-serif">one common point</text>
  <text x="280" y="314" text-anchor="middle" font-size="14" fill="#64748b" font-family="Arial, sans-serif">Non-parallel lines meet once, so the system has a unique solution.</text>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Matrix Notation, Order, Equality, and Types",
    subtopic:
      "CBSE-style basics of matrix entries, order, equality, diagonal and special matrices.",
    mc: [
      {
        questionLatex:
          "\\text{If }A=[a_{ij}]_{2\\times3}\\text{ and }a_{ij}=i+2j,\\text{ then }a_{23}\\text{ is}",
        difficulty: 2,
        skillTags: ["matrix_notation", "matrix_order"],
        choices: ["$8$", "$7$", "$6$", "$5$"],
        correctLetter: "A",
        hints: ["Use $i=2$ and $j=3$.", "Substitute into $i+2j$.", "Compute $2+2(3)$."],
        solution: [{ step: 1, explanation: "Substitute the row and column indices.", math: "a_{23}=2+2(3)=8" }],
        rationales: {
          B: "This usually comes from adding $2+3+2$ instead of using $2j$.",
          C: "This uses $2\\cdot3$ but forgets the extra $i=2$ term.",
          D: "This adds the indices but does not use the given formula.",
        },
      },
      {
        questionLatex:
          "\\text{If }\\begin{bmatrix}x&2\\\\3&y\\end{bmatrix}=\\begin{bmatrix}5&2\\\\3&-1\\end{bmatrix},\\text{ then }(x,y)=",
        difficulty: 2,
        skillTags: ["matrix_equality"],
        choices: ["$(5,-1)$", "$(-1,5)$", "$(2,3)$", "$(5,1)$"],
        correctLetter: "A",
        hints: ["Equal matrices have equal corresponding entries.", "Compare the top-left entries.", "Compare the bottom-right entries."],
        solution: [{ step: 1, explanation: "Compare corresponding entries.", math: "x=5,\\quad y=-1" }],
      },
      {
        questionLatex:
          "\\text{If }A\\text{ is of order }3\\times2\\text{ and }B\\text{ is of order }2\\times4,\\text{ then }AB\\text{ has order}",
        difficulty: 3,
        skillTags: ["matrix_order", "matrix_multiplication"],
        figure: productDimensionThreeTwoFigure,
        choices: ["$3\\times4$", "$2\\times2$", "$4\\times3$", "$3\\times2$"],
        correctLetter: "A",
        hints: ["Inner dimensions decide whether the product exists.", "$2$ and $2$ match.", "The outer dimensions give the order."],
        solution: [{ step: 1, explanation: "The product exists and has the outer dimensions.", math: "(3\\times2)(2\\times4)=3\\times4" }],
      },
      {
        questionLatex:
          "\\text{Which matrix is skew-symmetric?}",
        difficulty: 3,
        skillTags: ["matrix_types", "skew_symmetric_matrix"],
        choices: [
          "$\\begin{bmatrix}0&2&-1\\\\-2&0&4\\\\1&-4&0\\end{bmatrix}$",
          "$\\begin{bmatrix}1&2\\\\2&1\\end{bmatrix}$",
          "$\\begin{bmatrix}0&2\\\\2&0\\end{bmatrix}$",
          "$\\begin{bmatrix}1&0&0\\\\0&1&0\\\\0&0&1\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["A skew-symmetric matrix has zero diagonal entries.", "Entries across the main diagonal must be opposites.", "Check whether $a_{ij}=-a_{ji}$."],
        solution: [{ step: 1, explanation: "The first matrix satisfies $a_{ij}=-a_{ji}$ and has zero diagonal entries.", math: "A^T=-A" }],
      },
      {
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&a\\\\b&2\\end{bmatrix}\\text{ to be diagonal, the required condition is}",
        difficulty: 4,
        skillTags: ["matrix_types"],
        choices: ["$a=0,\\ b=0$", "$a=b$", "$a=1,\\ b=2$", "$ab=1$"],
        correctLetter: "A",
        hints: ["A diagonal matrix is square.", "All non-diagonal entries must be zero.", "Here the non-diagonal entries are $a$ and $b$."],
        solution: [{ step: 1, explanation: "The off-diagonal entries must vanish.", math: "a=0,\\quad b=0" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Let }A=[a_{ij}]_{3\\times2}\\text{ where }a_{ij}=2i-j.",
        difficulty: 2,
        skillTags: ["matrix_notation"],
        parts: singlePart("a", "Write the matrix $A$.", 2),
        hints: ["Find entries row by row.", "Use $j=1,2$ for each row.", "For example, $a_{21}=2(2)-1=3$."],
        rubric: singleRubric("a", 2, "Writes $A=\\begin{bmatrix}1&0\\\\3&2\\\\5&4\\end{bmatrix}$ correctly."),
        commonErrors: ["Interchanging row and column indices.", "Writing a $2\\times3$ matrix instead of a $3\\times2$ matrix."],
        workedSolution: [{ part: "a", explanation: "Using $a_{ij}=2i-j$, the rows are $(1,0)$, $(3,2)$, and $(5,4)$. Hence $A=\\begin{bmatrix}1&0\\\\3&2\\\\5&4\\end{bmatrix}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{If }\\begin{bmatrix}2x&y-1&3\\end{bmatrix}=\\begin{bmatrix}6&4&3\\end{bmatrix},\\text{ find }x\\text{ and }y.",
        difficulty: 2,
        skillTags: ["matrix_equality"],
        parts: singlePart("a", "Find $x$ and $y$.", 2),
        hints: ["Compare corresponding entries.", "$2x=6$.", "$y-1=4$."],
        rubric: singleRubric("a", 2, "Finds $x=3$ and $y=5$."),
        commonErrors: ["Solving $y-1=3$ by comparing with the wrong entry."],
        workedSolution: [{ part: "a", explanation: "By equality of matrices, $2x=6$ and $y-1=4$. Therefore $x=3$ and $y=5$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Classify }A=\\begin{bmatrix}0&0&0\\\\2&0&0\\\\5&-1&0\\end{bmatrix}\\text{ as square, diagonal, scalar, identity, or triangular wherever applicable.}",
        difficulty: 3,
        skillTags: ["matrix_types"],
        parts: singlePart("a", "State the applicable types with reasons.", 3),
        hints: ["Check the order first.", "Look at entries above the main diagonal.", "A diagonal matrix has all off-diagonal entries zero."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies that the matrix is square." },
            { part: "a", points: 1, description: "Identifies that it is lower triangular." },
            { part: "a", points: 1, description: "Correctly rejects diagonal, scalar, and identity." },
          ],
        },
        commonErrors: ["Calling it diagonal because all diagonal entries are zero.", "Forgetting that nonzero entries below the diagonal are allowed in a lower triangular matrix."],
        workedSolution: [{ part: "a", explanation: "The matrix is of order $3\\times3$, so it is square. All entries above the main diagonal are zero, so it is lower triangular. Since entries below the main diagonal are nonzero, it is not diagonal, scalar, or identity." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Let }A=\\begin{bmatrix}x+1&2y\\\\3&z-4\\end{bmatrix}\\text{ and }B=\\begin{bmatrix}4&6\\\\3&1\\end{bmatrix}.\\text{ Suppose }A=B.",
        difficulty: 4,
        skillTags: ["matrix_equality", "matrix_types"],
        parts: [
          { letter: "a", promptMarkdown: "Find $x,y,z$.", points: 3 },
          { letter: "b", promptMarkdown: "State whether the resulting matrix is symmetric. Give a reason.", points: 2 },
        ],
        hints: ["Compare each corresponding entry.", "Use $x+1=4$, $2y=6$, and $z-4=1$.", "For symmetry, compare the off-diagonal entries $6$ and $3$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $x=3$." },
            { part: "a", points: 1, description: "Finds $y=3$." },
            { part: "a", points: 1, description: "Finds $z=5$." },
            { part: "b", points: 1, description: "States that the matrix is not symmetric." },
            { part: "b", points: 1, description: "Justifies using unequal off-diagonal entries." },
          ],
        },
        commonErrors: ["Comparing non-corresponding entries.", "Calling the matrix symmetric because both diagonal entries are real numbers."],
        workedSolution: [
          { part: "a", explanation: "By equality of matrices, $x+1=4$, $2y=6$, and $z-4=1$. Thus $x=3$, $y=3$, and $z=5$." },
          { part: "b", explanation: "The resulting matrix is $\\begin{bmatrix}4&6\\\\3&1\\end{bmatrix}$. It is not symmetric because the off-diagonal entries $6$ and $3$ are not equal." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A school records the number of boys and girls in three clubs by the matrix }M=\\begin{bmatrix}18&12\\\\15&15\\\\10&20\\end{bmatrix}.\\text{ Rows represent Debate, Science, and Art clubs; columns represent boys and girls.}",
        difficulty: 4,
        skillTags: ["matrix_order", "matrix_interpretation", "case_based"],
        figure: clubEnrollmentBarFigure,
        parts: [
          { letter: "a", promptMarkdown: "State the order of $M$.", points: 1 },
          { letter: "b", promptMarkdown: "Interpret the entry $m_{32}$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the total number of students in the Science club and write what $M^T$ would represent.", points: 2 },
        ],
        hints: ["Count rows and columns.", "$m_{32}$ means row $3$, column $2$.", "The transpose interchanges clubs and gender categories."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States the order as $3\\times2$." },
            { part: "b", points: 1, description: "Interprets $m_{32}=20$ as girls in the Art club." },
            { part: "c", points: 1, description: "Finds Science club total $15+15=30$." },
            { part: "c", points: 1, description: "Correctly explains that $M^T$ has gender rows and club columns." },
          ],
        },
        commonErrors: ["Writing the order as $2\\times3$.", "Reading $m_{32}$ as row $2$, column $3$."],
        workedSolution: [
          { part: "a", explanation: "$M$ has $3$ rows and $2$ columns, so its order is $3\\times2$." },
          { part: "b", explanation: "$m_{32}=20$, meaning there are $20$ girls in the Art club." },
          { part: "c", explanation: "The Science club has $15+15=30$ students. In $M^T$, rows would represent boys and girls while columns would represent the clubs." },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Operations on Matrices",
    subtopic:
      "Addition, subtraction, scalar multiplication, matrix multiplication, and non-commutativity.",
    mc: [
      {
        questionLatex:
          "\\text{If }A\\text{ and }B\\text{ are both of order }2\\times3,\\text{ then }A+B\\text{ is of order}",
        difficulty: 2,
        skillTags: ["matrix_operations", "matrix_order"],
        choices: ["$2\\times3$", "$3\\times2$", "$2\\times2$", "$3\\times3$"],
        correctLetter: "A",
        hints: ["Addition is defined only for matrices of the same order.", "The result keeps the same order.", "Here both are $2\\times3$."],
        solution: [{ step: 1, explanation: "The sum has the same order as the addends.", math: "A+B\\text{ is }2\\times3" }],
      },
      {
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&-2\\\\3&0\\end{bmatrix}\\text{ and }B=\\begin{bmatrix}2&1\\\\-1&4\\end{bmatrix},\\text{ the }(1,2)\\text{ entry of }2A-3B\\text{ is}",
        difficulty: 2,
        skillTags: ["matrix_operations"],
        choices: ["$-7$", "$-1$", "$7$", "$1$"],
        correctLetter: "A",
        hints: ["Use only the $(1,2)$ entries.", "The entries are $-2$ and $1$.", "Compute $2(-2)-3(1)$."],
        solution: [{ step: 1, explanation: "Compute the requested entry.", math: "2(-2)-3(1)=-7" }],
      },
      {
        questionLatex:
          "\\text{If }A=\\begin{bmatrix}1&0&2\\\\-1&3&1\\end{bmatrix}\\text{ and }B=\\begin{bmatrix}2&1\\\\0&-1\\\\3&2\\end{bmatrix},\\text{ then }AB=",
        difficulty: 3,
        skillTags: ["matrix_multiplication"],
        figure: productDimensionTwoThreeFigure,
        choices: [
          "$\\begin{bmatrix}8&5\\\\1&-2\\end{bmatrix}$",
          "$\\begin{bmatrix}2&1\\\\0&-1\\end{bmatrix}$",
          "$\\begin{bmatrix}8&1\\\\5&-2\\end{bmatrix}$",
          "$\\begin{bmatrix}5&8\\\\-2&1\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["The result is $2\\times2$.", "Use row-by-column multiplication.", "For example, first entry is $1(2)+0(0)+2(3)=8$."],
        solution: [{ step: 1, explanation: "Multiply rows of $A$ by columns of $B$.", math: "AB=\\begin{bmatrix}8&5\\\\1&-2\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{Let }A=\\begin{bmatrix}0&1\\\\0&0\\end{bmatrix}\\text{ and }B=\\begin{bmatrix}0&0\\\\1&0\\end{bmatrix}.\\text{ Which statement is true?}",
        difficulty: 3,
        skillTags: ["matrix_multiplication", "non_commutativity"],
        choices: [
          "$AB\\ne BA$",
          "$AB=BA=I$",
          "$AB=BA=0$",
          "$A+B=AB$",
        ],
        correctLetter: "A",
        hints: ["Compute both products separately.", "$AB=\\begin{bmatrix}1&0\\\\0&0\\end{bmatrix}$.", "$BA=\\begin{bmatrix}0&0\\\\0&1\\end{bmatrix}$."],
        solution: [{ step: 1, explanation: "Matrix multiplication is not commutative here.", math: "AB=\\begin{bmatrix}1&0\\\\0&0\\end{bmatrix},\\quad BA=\\begin{bmatrix}0&0\\\\0&1\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{Which pair shows that the product of two non-zero matrices can be the zero matrix?}",
        difficulty: 4,
        skillTags: ["matrix_multiplication", "zero_product"],
        choices: [
          "$A=\\begin{bmatrix}1&0\\\\0&0\\end{bmatrix},\\ B=\\begin{bmatrix}0&0\\\\0&1\\end{bmatrix}$",
          "$A=I,\\ B=I$",
          "$A=\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix},\\ B=\\begin{bmatrix}0&1\\\\1&0\\end{bmatrix}$",
          "$A=0,\\ B=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["Both matrices must be non-zero.", "Compute $AB$ for the first pair.", "Every entry of that product is zero."],
        solution: [{ step: 1, explanation: "Both matrices are non-zero but their product is zero.", math: "\\begin{bmatrix}1&0\\\\0&0\\end{bmatrix}\\begin{bmatrix}0&0\\\\0&1\\end{bmatrix}=\\begin{bmatrix}0&0\\\\0&0\\end{bmatrix}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }A+B\\text{ for }A=\\begin{bmatrix}2&-1\\\\0&3\\end{bmatrix},\\ B=\\begin{bmatrix}1&4\\\\5&-2\\end{bmatrix}.",
        difficulty: 2,
        skillTags: ["matrix_operations"],
        parts: singlePart("a", "Compute $A+B$.", 2),
        hints: ["Add corresponding entries.", "Top row is $(2+1,-1+4)$.", "Bottom row is $(0+5,3-2)$."],
        rubric: singleRubric("a", 2, "Finds $A+B=\\begin{bmatrix}3&3\\\\5&1\\end{bmatrix}$."),
        commonErrors: ["Adding rows or columns instead of corresponding entries."],
        workedSolution: [{ part: "a", explanation: "$A+B=\\begin{bmatrix}2+1&-1+4\\\\0+5&3-2\\end{bmatrix}=\\begin{bmatrix}3&3\\\\5&1\\end{bmatrix}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{If }A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix},\\text{ find the }(1,2)\\text{ entry of }2A.",
        difficulty: 2,
        skillTags: ["scalar_multiplication"],
        parts: singlePart("a", "Find the required entry.", 2),
        hints: ["The $(1,2)$ entry of $A$ is $2$.", "Scalar multiplication doubles every entry.", "Compute $2\\cdot2$."],
        rubric: singleRubric("a", 2, "Finds the entry as $4$."),
        commonErrors: ["Multiplying only the diagonal entries by the scalar."],
        workedSolution: [{ part: "a", explanation: "The $(1,2)$ entry of $A$ is $2$, so the $(1,2)$ entry of $2A$ is $2(2)=4$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Compute }AB\\text{ for }A=\\begin{bmatrix}1&0&2\\\\-1&3&1\\end{bmatrix},\\ B=\\begin{bmatrix}2&1\\\\0&-1\\\\3&2\\end{bmatrix}.",
        difficulty: 3,
        skillTags: ["matrix_multiplication"],
        parts: singlePart("a", "Find $AB$.", 3),
        hints: ["The result is $2\\times2$.", "First row times first column gives $8$.", "Compute all four row-column products."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses correct order and row-column multiplication." },
            { part: "a", points: 1, description: "Computes first row correctly." },
            { part: "a", points: 1, description: "Computes second row correctly." },
          ],
        },
        commonErrors: ["Multiplying entrywise.", "Trying to compute $BA$ instead of $AB$."],
        workedSolution: [{ part: "a", explanation: "$AB=\\begin{bmatrix}1(2)+0(0)+2(3)&1(1)+0(-1)+2(2)\\\\-1(2)+3(0)+1(3)&-1(1)+3(-1)+1(2)\\end{bmatrix}=\\begin{bmatrix}8&5\\\\1&-2\\end{bmatrix}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\text{ and }B=\\begin{bmatrix}3&1\\\\2&5\\end{bmatrix},\\text{ solve }2X+A=3B.",
        difficulty: 4,
        skillTags: ["matrix_operations", "matrix_equation"],
        parts: [
          { letter: "a", promptMarkdown: "Find $3B-A$.", points: 2 },
          { letter: "b", promptMarkdown: "Hence find $X$.", points: 3 },
        ],
        hints: ["Rearrange to $2X=3B-A$.", "Compute $3B$ first.", "Divide every entry of $3B-A$ by $2$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Computes $3B-A=\\begin{bmatrix}8&1\\\\3&11\\end{bmatrix}$." },
            { part: "b", points: 2, description: "Divides each entry by $2$ correctly." },
            { part: "b", points: 1, description: "Writes the final matrix $X$." },
          ],
        },
        commonErrors: ["Writing $X=3B-A$ instead of $2X=3B-A$.", "Dividing only diagonal entries by $2$."],
        workedSolution: [
          { part: "a", explanation: "$3B-A=\\begin{bmatrix}9&3\\\\6&15\\end{bmatrix}-\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}=\\begin{bmatrix}8&1\\\\3&11\\end{bmatrix}$." },
          { part: "b", explanation: "Since $2X=3B-A$, $X=\\frac12\\begin{bmatrix}8&1\\\\3&11\\end{bmatrix}=\\begin{bmatrix}4&\\frac12\\\\\\frac32&\\frac{11}{2}\\end{bmatrix}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A stationery shop records sales of notebooks and pens in two branches. Monday sales are }M=\\begin{bmatrix}30&45\\\\25&50\\end{bmatrix}\\text{ and Tuesday sales are }T=\\begin{bmatrix}35&40\\\\20&60\\end{bmatrix}.\\text{ Rows represent Branch 1 and Branch 2; columns represent notebooks and pens.}",
        difficulty: 4,
        skillTags: ["matrix_operations", "matrix_interpretation", "case_based"],
        figure: salesMatrixBarFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the two-day sales matrix $M+T$.", points: 2 },
          { letter: "b", promptMarkdown: "Find the total number of pens sold by Branch 2 over the two days.", points: 1 },
          { letter: "c", promptMarkdown: "If each notebook costs Rs. 40 and each pen costs Rs. 10, find Branch 1's Monday revenue.", points: 1 },
        ],
        hints: ["Add corresponding entries for the two-day sales matrix.", "Branch 2 pens are in row $2$, column $2$.", "For revenue, multiply quantities by their prices and add."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $M+T=\\begin{bmatrix}65&85\\\\45&110\\end{bmatrix}$." },
            { part: "b", points: 1, description: "Finds Branch 2 pen total as $110$." },
            { part: "c", points: 1, description: "Computes Branch 1 Monday revenue as Rs. $1650$." },
          ],
        },
        commonErrors: ["Adding all four entries into one number.", "Using Branch 1 values for Branch 2.", "Multiplying pens by the notebook price."],
        workedSolution: [
          { part: "a", explanation: "$M+T=\\begin{bmatrix}30+35&45+40\\\\25+20&50+60\\end{bmatrix}=\\begin{bmatrix}65&85\\\\45&110\\end{bmatrix}$." },
          { part: "b", explanation: "Branch 2 pens over two days are $50+60=110$." },
          { part: "c", explanation: "Branch 1 Monday revenue is $30(40)+45(10)=1200+450=1650$ rupees." },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Transpose, Symmetric, and Skew-Symmetric Matrices",
    subtopic:
      "Transpose operations, symmetric and skew-symmetric conditions, and decomposition.",
    mc: [
      {
        questionLatex:
          "\\text{If }A=\\begin{bmatrix}1&2&3\\\\4&5&6\\end{bmatrix},\\text{ then }A^T\\text{ is}",
        difficulty: 2,
        skillTags: ["transpose"],
        choices: [
          "$\\begin{bmatrix}1&4\\\\2&5\\\\3&6\\end{bmatrix}$",
          "$\\begin{bmatrix}1&2&3\\\\4&5&6\\end{bmatrix}$",
          "$\\begin{bmatrix}4&5&6\\\\1&2&3\\end{bmatrix}$",
          "$\\begin{bmatrix}1&4&2\\\\5&3&6\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["Transpose interchanges rows and columns.", "The first row becomes the first column.", "The order changes from $2\\times3$ to $3\\times2$."],
        solution: [{ step: 1, explanation: "Interchange rows and columns.", math: "A^T=\\begin{bmatrix}1&4\\\\2&5\\\\3&6\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&x\\\\3&2\\end{bmatrix}\\text{ to be symmetric, }x\\text{ must be}",
        difficulty: 2,
        skillTags: ["symmetric_matrix"],
        choices: ["$3$", "$1$", "$2$", "$-3$"],
        correctLetter: "A",
        hints: ["Symmetric means $A^T=A$.", "Off-diagonal entries must be equal.", "So compare $x$ and $3$."],
        solution: [{ step: 1, explanation: "For symmetry, $a_{12}=a_{21}$.", math: "x=3" }],
      },
      {
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}0&a\\\\-5&0\\end{bmatrix}\\text{ to be skew-symmetric, }a\\text{ must be}",
        difficulty: 3,
        skillTags: ["skew_symmetric_matrix"],
        choices: ["$5$", "$-5$", "$0$", "$1$"],
        correctLetter: "A",
        hints: ["Skew-symmetric means $a_{12}=-a_{21}$.", "Here $a_{21}=-5$.", "So $a=-(-5)$."],
        solution: [{ step: 1, explanation: "Use $a_{12}=-a_{21}$.", math: "a=5" }],
      },
      {
        questionLatex:
          "\\text{The symmetric part of }A=\\begin{bmatrix}2&4\\\\0&6\\end{bmatrix}\\text{ is }\\frac12(A+A^T)= ",
        difficulty: 3,
        skillTags: ["transpose", "symmetric_matrix"],
        choices: [
          "$\\begin{bmatrix}2&2\\\\2&6\\end{bmatrix}$",
          "$\\begin{bmatrix}2&4\\\\0&6\\end{bmatrix}$",
          "$\\begin{bmatrix}0&2\\\\-2&0\\end{bmatrix}$",
          "$\\begin{bmatrix}4&4\\\\4&12\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["Find $A^T$ first.", "Add $A$ and $A^T$.", "Then multiply every entry by $1/2$."],
        solution: [{ step: 1, explanation: "Compute the symmetric part.", math: "\\frac12(A+A^T)=\\frac12\\begin{bmatrix}4&4\\\\4&12\\end{bmatrix}=\\begin{bmatrix}2&2\\\\2&6\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{If }A\\text{ is skew-symmetric, then every diagonal entry of }A\\text{ is}",
        difficulty: 4,
        skillTags: ["skew_symmetric_matrix"],
        choices: ["$0$", "$1$", "$-1$", "$\\text{any real number}$"],
        correctLetter: "A",
        hints: ["Skew-symmetric means $A^T=-A$.", "For a diagonal entry, transpose does not change its position.", "So $a_{ii}=-a_{ii}$."],
        solution: [{ step: 1, explanation: "A diagonal entry must be its own negative.", math: "a_{ii}=-a_{ii}\\Rightarrow a_{ii}=0" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the transpose of }A=\\begin{bmatrix}2&-1&0\\\\3&4&5\\end{bmatrix}.",
        difficulty: 2,
        skillTags: ["transpose"],
        parts: singlePart("a", "Write $A^T$.", 2),
        hints: ["Rows become columns.", "The first row becomes the first column.", "The order changes to $3\\times2$."],
        rubric: singleRubric("a", 2, "Writes $A^T=\\begin{bmatrix}2&3\\\\-1&4\\\\0&5\\end{bmatrix}$."),
        commonErrors: ["Reversing the rows instead of transposing."],
        workedSolution: [{ part: "a", explanation: "$A^T=\\begin{bmatrix}2&3\\\\-1&4\\\\0&5\\end{bmatrix}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }x\\text{ so that }\\begin{bmatrix}0&x-1\\\\-3&0\\end{bmatrix}\\text{ is skew-symmetric.}",
        difficulty: 2,
        skillTags: ["skew_symmetric_matrix"],
        parts: singlePart("a", "Find $x$.", 2),
        hints: ["Use $a_{12}=-a_{21}$.", "Here $a_{21}=-3$.", "So $x-1=3$."],
        rubric: singleRubric("a", 2, "Finds $x=4$."),
        commonErrors: ["Setting $x-1=-3$ as if the matrix were symmetric."],
        workedSolution: [{ part: "a", explanation: "For skew-symmetry, $x-1=-(-3)=3$. Therefore $x=4$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Let }A\\text{ be a square matrix. Show that }A+A^T\\text{ is symmetric.}",
        difficulty: 3,
        skillTags: ["transpose", "symmetric_matrix", "proof"],
        parts: singlePart("a", "Prove the statement.", 3),
        hints: ["To prove symmetry, take the transpose.", "Use $(A+B)^T=A^T+B^T$.", "Also use $(A^T)^T=A$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Takes transpose of $A+A^T$." },
            { part: "a", points: 1, description: "Uses transpose properties correctly." },
            { part: "a", points: 1, description: "Concludes that the result is symmetric." },
          ],
        },
        commonErrors: ["Checking only one numerical example.", "Forgetting that $A$ must be square for symmetry to be discussed."],
        workedSolution: [{ part: "a", explanation: "$(A+A^T)^T=A^T+(A^T)^T=A^T+A=A+A^T$. Hence $A+A^T$ is symmetric." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Express }A=\\begin{bmatrix}2&3\\\\-1&4\\end{bmatrix}\\text{ as the sum of a symmetric matrix and a skew-symmetric matrix.}",
        difficulty: 4,
        skillTags: ["transpose", "symmetric_matrix", "skew_symmetric_matrix"],
        parts: [
          { letter: "a", promptMarkdown: "Find $S=\\frac12(A+A^T)$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $K=\\frac12(A-A^T)$ and verify $A=S+K$.", points: 3 },
        ],
        hints: ["Use the standard decomposition formulas.", "Compute $A^T$ first.", "The symmetric and skew-symmetric parts must add back to $A$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $S=\\begin{bmatrix}2&1\\\\1&4\\end{bmatrix}$." },
            { part: "b", points: 2, description: "Finds $K=\\begin{bmatrix}0&2\\\\-2&0\\end{bmatrix}$." },
            { part: "b", points: 1, description: "Verifies $A=S+K$." },
          ],
        },
        commonErrors: ["Using $A+A^T$ without multiplying by $1/2$.", "Writing the skew-symmetric part with equal off-diagonal entries."],
        workedSolution: [
          { part: "a", explanation: "$A^T=\\begin{bmatrix}2&-1\\\\3&4\\end{bmatrix}$, so $S=\\frac12(A+A^T)=\\begin{bmatrix}2&1\\\\1&4\\end{bmatrix}$." },
          { part: "b", explanation: "$K=\\frac12(A-A^T)=\\begin{bmatrix}0&2\\\\-2&0\\end{bmatrix}$. Then $S+K=\\begin{bmatrix}2&3\\\\-1&4\\end{bmatrix}=A$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A tournament table records goals scored by Team A, Team B, and Team C in two rounds as }G=\\begin{bmatrix}2&1\\\\0&3\\\\4&2\\end{bmatrix}.\\text{ Rows represent teams and columns represent rounds.}",
        difficulty: 4,
        skillTags: ["transpose", "matrix_interpretation", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write the order of $G$ and $G^T$.", points: 1 },
          { letter: "b", promptMarkdown: "Write $G^T$.", points: 2 },
          { letter: "c", promptMarkdown: "Explain why $G$ cannot be symmetric.", points: 1 },
        ],
        hints: ["Transpose changes $3\\times2$ into $2\\times3$.", "Rows become columns.", "Only square matrices can be symmetric."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States orders $3\\times2$ and $2\\times3$." },
            { part: "b", points: 2, description: "Writes $G^T=\\begin{bmatrix}2&0&4\\\\1&3&2\\end{bmatrix}$." },
            { part: "c", points: 1, description: "Explains that $G$ is not square, so it cannot be symmetric." },
          ],
        },
        commonErrors: ["Trying to compare $G$ with $G^T$ entry-by-entry despite different orders.", "Reversing columns instead of transposing."],
        workedSolution: [
          { part: "a", explanation: "$G$ is $3\\times2$, so $G^T$ is $2\\times3$." },
          { part: "b", explanation: "$G^T=\\begin{bmatrix}2&0&4\\\\1&3&2\\end{bmatrix}$." },
          { part: "c", explanation: "A symmetric matrix must be square. Since $G$ is not square, it cannot be symmetric." },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Invertible Matrices and Matrix Equations",
    subtopic:
      "Invertibility of square matrices, inverse of $2\\times2$ matrices, uniqueness, and matrix equations.",
    mc: [
      {
        questionLatex:
          "\\text{The matrix }A=\\begin{bmatrix}2&1\\\\3&k\\end{bmatrix}\\text{ is invertible if}",
        difficulty: 2,
        skillTags: ["inverse_matrix", "determinants"],
        choices: ["$k\\ne\\frac32$", "$k=\\frac32$", "$k=0$", "$k=3$"],
        correctLetter: "A",
        hints: ["A $2\\times2$ matrix is invertible when its determinant is nonzero.", "Compute $2k-3$.", "Require $2k-3\\ne0$."],
        solution: [{ step: 1, explanation: "The determinant must be nonzero.", math: "\\det A=2k-3\\ne0\\Rightarrow k\\ne\\frac32" }],
      },
      {
        questionLatex:
          "\\text{The inverse of }\\begin{bmatrix}1&2\\\\0&1\\end{bmatrix}\\text{ is}",
        difficulty: 2,
        skillTags: ["inverse_matrix"],
        choices: [
          "$\\begin{bmatrix}1&-2\\\\0&1\\end{bmatrix}$",
          "$\\begin{bmatrix}1&2\\\\0&1\\end{bmatrix}$",
          "$\\begin{bmatrix}1&0\\\\-2&1\\end{bmatrix}$",
          "$\\begin{bmatrix}0&1\\\\1&2\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["Use the inverse formula for a $2\\times2$ matrix.", "The determinant is $1$.", "Change the sign of the off-diagonal entry $2$ in the formula."],
        solution: [{ step: 1, explanation: "Apply the $2\\times2$ inverse formula.", math: "\\begin{bmatrix}1&2\\\\0&1\\end{bmatrix}^{-1}=\\begin{bmatrix}1&-2\\\\0&1\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{If }A\\text{ and }B\\text{ are square matrices of the same order and }AB=I,\\text{ then }B\\text{ is}",
        difficulty: 3,
        skillTags: ["inverse_matrix"],
        choices: ["$A^{-1}$", "$A^T$", "$0$", "$A$"],
        correctLetter: "A",
        hints: ["An inverse multiplies with the matrix to give identity.", "For square matrices, a right inverse is the inverse in CBSE context.", "So $B$ is the inverse of $A$."],
        solution: [{ step: 1, explanation: "By the definition of inverse matrix, $B=A^{-1}$.", math: "AB=I\\Rightarrow B=A^{-1}" }],
      },
      {
        questionLatex:
          "\\text{If }A=\\begin{bmatrix}2&1\\\\1&1\\end{bmatrix}\\text{ and }AX=\\begin{bmatrix}5\\\\3\\end{bmatrix},\\text{ then }X=",
        difficulty: 3,
        skillTags: ["inverse_matrix", "matrix_equation"],
        choices: [
          "$\\begin{bmatrix}2\\\\1\\end{bmatrix}$",
          "$\\begin{bmatrix}1\\\\2\\end{bmatrix}$",
          "$\\begin{bmatrix}3\\\\-1\\end{bmatrix}$",
          "$\\begin{bmatrix}5\\\\3\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["This is the same as solving $2x+y=5$ and $x+y=3$.", "Subtract the second equation from the first.", "Then find $y$."],
        solution: [{ step: 1, explanation: "Solve the corresponding system.", math: "x=2,\\quad y=1" }],
      },
      {
        questionLatex:
          "\\text{Which statement correctly expresses uniqueness of inverse?}",
        difficulty: 4,
        skillTags: ["inverse_matrix", "proof"],
        choices: [
          "$\\text{If a square matrix has an inverse, then it has exactly one inverse.}$",
          "$\\text{Every square matrix has infinitely many inverses.}$",
          "$\\text{Only identity matrices have inverses.}$",
          "$\\text{A rectangular matrix always has a two-sided inverse.}$",
        ],
        correctLetter: "A",
        hints: ["The CBSE theorem is about uniqueness once existence is known.", "Not every square matrix is invertible.", "A two-sided inverse, if it exists, is unique."],
        solution: [{ step: 1, explanation: "The inverse of an invertible square matrix is unique.", math: "AB=I=AC\\Rightarrow B=C" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Check whether }A=\\begin{bmatrix}3&1\\\\2&1\\end{bmatrix}\\text{ is invertible.}",
        difficulty: 2,
        skillTags: ["inverse_matrix", "determinants"],
        parts: singlePart("a", "Use the determinant test.", 2),
        hints: ["Compute $ad-bc$.", "Here $ad-bc=3(1)-1(2)$.", "A nonzero determinant means invertible."],
        rubric: singleRubric("a", 2, "Computes determinant $1$ and concludes invertible."),
        commonErrors: ["Saying invertible because all entries are nonzero."],
        workedSolution: [{ part: "a", explanation: "$\\det A=3(1)-1(2)=1\\ne0$. Hence $A$ is invertible." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the inverse of }D=\\begin{bmatrix}2&0\\\\0&5\\end{bmatrix}.",
        difficulty: 2,
        skillTags: ["inverse_matrix"],
        parts: singlePart("a", "Write $D^{-1}$.", 2),
        hints: ["A diagonal matrix is inverted by reciprocating nonzero diagonal entries.", "The reciprocals are $1/2$ and $1/5$.", "Keep the off-diagonal entries zero."],
        rubric: singleRubric("a", 2, "Finds $D^{-1}=\\begin{bmatrix}\\frac12&0\\\\0&\\frac15\\end{bmatrix}$."),
        commonErrors: ["Writing negative diagonal entries instead of reciprocals."],
        workedSolution: [{ part: "a", explanation: "$D^{-1}=\\begin{bmatrix}\\frac12&0\\\\0&\\frac15\\end{bmatrix}$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Verify that }B=\\begin{bmatrix}1&-1\\\\0&1\\end{bmatrix}\\text{ is the inverse of }A=\\begin{bmatrix}1&1\\\\0&1\\end{bmatrix}.",
        difficulty: 3,
        skillTags: ["inverse_matrix", "matrix_multiplication"],
        parts: singlePart("a", "Show the required multiplication.", 3),
        hints: ["For inverse verification, multiply the matrices.", "Compute $AB$.", "It is enough here to show the identity product."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Computes $AB=I$ correctly." },
            { part: "a", points: 1, description: "Concludes that $B=A^{-1}$." },
          ],
        },
        commonErrors: ["Checking only one entry of the product.", "Adding matrices instead of multiplying them."],
        workedSolution: [{ part: "a", explanation: "$AB=\\begin{bmatrix}1&1\\\\0&1\\end{bmatrix}\\begin{bmatrix}1&-1\\\\0&1\\end{bmatrix}=\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix}$. Hence $B=A^{-1}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Let }A=\\begin{bmatrix}2&1\\\\1&1\\end{bmatrix}\\text{ and }C=\\begin{bmatrix}5&1\\\\3&2\\end{bmatrix}.\\text{ Solve }AX=C.",
        difficulty: 4,
        skillTags: ["inverse_matrix", "matrix_equation"],
        parts: [
          { letter: "a", promptMarkdown: "Find $A^{-1}$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $X=A^{-1}C$.", points: 3 },
        ],
        hints: ["The determinant of $A$ is $1$.", "Use $A^{-1}=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}$.", "Multiply $A^{-1}$ by $C$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $A^{-1}=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}$." },
            { part: "b", points: 2, description: "Multiplies $A^{-1}C$ correctly." },
            { part: "b", points: 1, description: "Writes $X=\\begin{bmatrix}2&-1\\\\1&3\\end{bmatrix}$." },
          ],
        },
        commonErrors: ["Multiplying $C A^{-1}$ instead of $A^{-1}C$.", "Forgetting that matrix multiplication order matters."],
        workedSolution: [
          { part: "a", explanation: "$\\det A=2(1)-1(1)=1$, so $A^{-1}=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}$." },
          { part: "b", explanation: "$X=A^{-1}C=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}\\begin{bmatrix}5&1\\\\3&2\\end{bmatrix}=\\begin{bmatrix}2&-1\\\\1&3\\end{bmatrix}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Let }Y=AX,\\text{ where }A=\\begin{bmatrix}2&1\\\\1&1\\end{bmatrix}\\text{ and }Y=\\begin{bmatrix}11\\\\7\\end{bmatrix}.\\text{ Find the column matrix }X.",
        difficulty: 4,
        skillTags: ["inverse_matrix", "matrix_equation", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Show that $A$ is invertible.", points: 1 },
          { letter: "b", promptMarkdown: "Find $A^{-1}$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $X$ from $X=A^{-1}Y$.", points: 2 },
        ],
        hints: ["Compute $\\det A$.", "Use the $2\\times2$ inverse formula.", "Multiply $A^{-1}$ by $Y$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Shows $\\det A=1\\ne0$." },
            { part: "b", points: 1, description: "Finds $A^{-1}=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}$." },
            { part: "c", points: 2, description: "Computes $X=\\begin{bmatrix}4\\\\3\\end{bmatrix}$." },
          ],
        },
        commonErrors: ["Using $Y^{-1}A$ or treating a column matrix as invertible.", "Multiplying in the wrong order."],
        workedSolution: [
          { part: "a", explanation: "$\\det A=2(1)-1(1)=1$, so $A$ is invertible." },
          { part: "b", explanation: "$A^{-1}=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}$." },
          { part: "c", explanation: "$X=A^{-1}Y=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}\\begin{bmatrix}11\\\\7\\end{bmatrix}=\\begin{bmatrix}4\\\\3\\end{bmatrix}$." },
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Determinants, Minors, and Cofactors",
    subtopic:
      "Evaluating determinants up to order $3$, and computing minors and cofactors.",
    mc: [
      {
        questionLatex:
          "\\text{The value of }\\begin{vmatrix}3&4\\\\2&5\\end{vmatrix}\\text{ is}",
        difficulty: 2,
        skillTags: ["determinants"],
        choices: ["$7$", "$23$", "$-7$", "$1$"],
        correctLetter: "A",
        hints: ["For $2\\times2$, use $ad-bc$.", "Compute $3(5)-4(2)$.", "Subtract $8$ from $15$."],
        solution: [{ step: 1, explanation: "Use the determinant formula.", math: "3(5)-4(2)=7" }],
      },
      {
        questionLatex:
          "\\text{The determinant of }\\begin{bmatrix}2&1&3\\\\0&4&5\\\\0&0&3\\end{bmatrix}\\text{ is}",
        difficulty: 2,
        skillTags: ["determinants", "triangular_matrix"],
        choices: ["$24$", "$9$", "$0$", "$30$"],
        correctLetter: "A",
        hints: ["This is an upper triangular matrix.", "The determinant is the product of diagonal entries.", "Compute $2\\cdot4\\cdot3$."],
        solution: [{ step: 1, explanation: "For a triangular matrix, multiply diagonal entries.", math: "\\det A=2\\cdot4\\cdot3=24" }],
      },
      {
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&2&3\\\\0&4&5\\\\1&0&6\\end{bmatrix},\\text{ the cofactor }C_{12}\\text{ is}",
        difficulty: 3,
        skillTags: ["cofactors", "determinants"],
        figure: cofactorSignPatternFigure,
        choices: ["$5$", "$-5$", "$6$", "$-6$"],
        correctLetter: "A",
        hints: ["Delete row $1$ and column $2$.", "The minor is $\\begin{vmatrix}0&5\\\\1&6\\end{vmatrix}=-5$.", "Cofactor $C_{12}=(-1)^{1+2}M_{12}$."],
        solution: [{ step: 1, explanation: "Include the cofactor sign.", math: "M_{12}=-5,\\quad C_{12}=5" }],
      },
      {
        questionLatex:
          "\\text{If two rows of a determinant are identical, then the determinant is}",
        difficulty: 3,
        skillTags: ["determinants", "determinant_properties"],
        choices: ["$0$", "$1$", "$-1$", "$\\text{the product of diagonal entries}$"],
        correctLetter: "A",
        hints: ["This is a standard determinant property.", "Identical rows make the determinant vanish.", "No calculation is needed once the row repetition is noticed."],
        solution: [{ step: 1, explanation: "A determinant with two identical rows is zero.", math: "\\Delta=0" }],
      },
      {
        questionLatex:
          "\\text{The value of }\\begin{vmatrix}1&2&0\\\\3&4&5\\\\0&1&2\\end{vmatrix}\\text{ is}",
        difficulty: 4,
        skillTags: ["determinants"],
        choices: ["$-9$", "$9$", "$3$", "$-12$"],
        correctLetter: "A",
        hints: ["Expand along the first row.", "The first term is $1(8-5)=3$.", "The second term is $-2(6-0)$."],
        solution: [{ step: 1, explanation: "Expand along row $1$.", math: "\\Delta=1(8-5)-2(6-0)+0=-9" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\begin{vmatrix}4&-1\\\\2&3\\end{vmatrix}.",
        difficulty: 2,
        skillTags: ["determinants"],
        parts: singlePart("a", "Find the determinant.", 2),
        hints: ["Use $ad-bc$.", "Compute $4(3)-(-1)(2)$.", "Be careful with the negative sign."],
        rubric: singleRubric("a", 2, "Finds the determinant as $14$."),
        commonErrors: ["Writing $12-2$ instead of $12-(-2)$."],
        workedSolution: [{ part: "a", explanation: "$\\begin{vmatrix}4&-1\\\\2&3\\end{vmatrix}=4(3)-(-1)(2)=12+2=14$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&2&3\\\\0&4&5\\\\1&0&6\\end{bmatrix},\\text{ find }C_{23}.",
        difficulty: 2,
        skillTags: ["cofactors"],
        figure: cofactorSignPatternFigure,
        parts: singlePart("a", "Find the cofactor $C_{23}$.", 2),
        hints: ["Delete row $2$ and column $3$.", "The minor is $\\begin{vmatrix}1&2\\\\1&0\\end{vmatrix}$.", "Use the sign $(-1)^{2+3}$."],
        rubric: singleRubric("a", 2, "Finds $C_{23}=2$."),
        commonErrors: ["Reporting the minor $-2$ as the cofactor."],
        workedSolution: [{ part: "a", explanation: "$M_{23}=\\begin{vmatrix}1&2\\\\1&0\\end{vmatrix}=-2$. Since $(-1)^{2+3}=-1$, $C_{23}=2$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Evaluate }\\begin{vmatrix}2&0&1\\\\1&3&0\\\\0&2&4\\end{vmatrix}.",
        difficulty: 3,
        skillTags: ["determinants"],
        parts: singlePart("a", "Evaluate the determinant.", 3),
        hints: ["Expand along the first row.", "The zero entry removes one term.", "Compute $2(12)+1(2)$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Chooses a valid expansion." },
            { part: "a", points: 1, description: "Computes the cofactors correctly." },
            { part: "a", points: 1, description: "Gets final value $26$." },
          ],
        },
        commonErrors: ["Using all plus signs in expansion without checking cofactor signs."],
        workedSolution: [{ part: "a", explanation: "Expanding along the first row, $\\Delta=2\\begin{vmatrix}3&0\\\\2&4\\end{vmatrix}+1\\begin{vmatrix}1&3\\\\0&2\\end{vmatrix}=2(12)+2=26$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}1&2&3\\\\0&-1&4\\\\2&1&0\\end{bmatrix},\\text{ find }C_{11},C_{12},C_{13}\\text{ and hence evaluate }|A|\\text{ by expanding along the first row.}",
        difficulty: 4,
        skillTags: ["determinants", "cofactors"],
        figure: cofactorSignPatternFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find $C_{11},C_{12},C_{13}$.", points: 3 },
          { letter: "b", promptMarkdown: "Use these cofactors to find $|A|$.", points: 2 },
        ],
        hints: ["Delete the row and column for each cofactor.", "Remember the signs $+,-,+$ across the first row.", "Use $|A|=a_{11}C_{11}+a_{12}C_{12}+a_{13}C_{13}$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $C_{11}=-4$." },
            { part: "a", points: 1, description: "Finds $C_{12}=8$." },
            { part: "a", points: 1, description: "Finds $C_{13}=2$." },
            { part: "b", points: 2, description: "Computes $|A|=18$." },
          ],
        },
        commonErrors: ["Finding minors but forgetting cofactor signs.", "Multiplying cofactors by the wrong first-row entries."],
        workedSolution: [
          { part: "a", explanation: "$C_{11}=\\begin{vmatrix}-1&4\\\\1&0\\end{vmatrix}=-4$, $C_{12}=-\\begin{vmatrix}0&4\\\\2&0\\end{vmatrix}=8$, and $C_{13}=\\begin{vmatrix}0&-1\\\\2&1\\end{vmatrix}=2$." },
          { part: "b", explanation: "$|A|=1(-4)+2(8)+3(2)=18$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Let }C=\\begin{bmatrix}1&2&0\\\\3&4&1\\\\0&5&2\\end{bmatrix}.\\text{ Use the determinant of }C\\text{ to decide whether }C\\text{ is invertible.}",
        difficulty: 4,
        skillTags: ["determinants", "case_based"],
        figure: cofactorSignPatternFigure,
        parts: [
          { letter: "a", promptMarkdown: "Expand $|C|$ along the first row.", points: 2 },
          { letter: "b", promptMarkdown: "Find the value of $|C|$.", points: 1 },
          { letter: "c", promptMarkdown: "State whether $C$ is invertible.", points: 1 },
        ],
        hints: ["The first row has a zero entry.", "Use $1\\cdot C_{11}+2\\cdot C_{12}$.", "A square matrix is invertible when its determinant is nonzero."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Sets up first-row expansion correctly." },
            { part: "b", points: 1, description: "Finds $|C|=-9$." },
            { part: "c", points: 1, description: "Concludes that $C$ is invertible." },
          ],
        },
        commonErrors: ["Ignoring the cofactor sign for the second term.", "Saying a negative determinant means not invertible."],
        workedSolution: [
          { part: "a", explanation: "$|C|=1\\begin{vmatrix}4&1\\\\5&2\\end{vmatrix}-2\\begin{vmatrix}3&1\\\\0&2\\end{vmatrix}+0$." },
          { part: "b", explanation: "$|C|=1(8-5)-2(6-0)=3-12=-9$." },
          { part: "c", explanation: "Since $|C|=-9\\ne0$, $C$ is invertible." },
        ],
      },
    ],
  },
  {
    topicCode: "2.6",
    title: "Adjoint, Inverse, and Area Using Determinants",
    subtopic:
      "Adjoint and inverse of matrices, plus determinant formula for area of a triangle.",
    mc: [
      {
        questionLatex:
          "\\text{The area of the triangle with vertices }(0,0),(4,0),(0,3)\\text{ is}",
        difficulty: 2,
        skillTags: ["area_triangle", "determinants"],
        choices: ["$6$", "$12$", "$7$", "$3$"],
        correctLetter: "A",
        hints: ["The triangle is right-angled.", "Use $\\frac12\\times\\text{base}\\times\\text{height}$.", "Base $=4$, height $=3$."],
        solution: [{ step: 1, explanation: "Compute the right-triangle area.", math: "\\frac12(4)(3)=6" }],
      },
      {
        questionLatex:
          "\\text{For }A=\\begin{bmatrix}2&3\\\\1&4\\end{bmatrix},\\ \\operatorname{adj}A=",
        difficulty: 2,
        skillTags: ["adjoint", "inverse_matrix"],
        choices: [
          "$\\begin{bmatrix}4&-3\\\\-1&2\\end{bmatrix}$",
          "$\\begin{bmatrix}2&-3\\\\-1&4\\end{bmatrix}$",
          "$\\begin{bmatrix}4&3\\\\1&2\\end{bmatrix}$",
          "$\\begin{bmatrix}2&1\\\\3&4\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["For $\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}$, adjoint is $\\begin{bmatrix}d&-b\\\\-c&a\\end{bmatrix}$.", "Swap $2$ and $4$.", "Change signs of $3$ and $1$."],
        solution: [{ step: 1, explanation: "Use the $2\\times2$ adjoint formula.", math: "\\operatorname{adj}A=\\begin{bmatrix}4&-3\\\\-1&2\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{The inverse of }A=\\begin{bmatrix}2&1\\\\1&1\\end{bmatrix}\\text{ is}",
        difficulty: 3,
        skillTags: ["inverse_matrix", "adjoint"],
        choices: [
          "$\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}$",
          "$\\begin{bmatrix}2&-1\\\\-1&1\\end{bmatrix}$",
          "$\\begin{bmatrix}1&1\\\\1&2\\end{bmatrix}$",
          "$\\begin{bmatrix}2&1\\\\1&1\\end{bmatrix}$",
        ],
        correctLetter: "A",
        hints: ["Compute determinant first.", "$\\det A=1$.", "Use $A^{-1}=\\frac1{|A|}\\operatorname{adj}A$."],
        solution: [{ step: 1, explanation: "The determinant is $1$, so the inverse equals the adjoint.", math: "A^{-1}=\\begin{bmatrix}1&-1\\\\-1&2\\end{bmatrix}" }],
      },
      {
        questionLatex:
          "\\text{The points }(1,2),(2,4),(3,6)\\text{ are}",
        difficulty: 3,
        skillTags: ["area_triangle", "collinearity"],
        choices: [
          "$\\text{collinear}$",
          "$\\text{vertices of a triangle of area }1$",
          "$\\text{vertices of a triangle of area }3$",
          "$\\text{not enough information}$",
        ],
        correctLetter: "A",
        hints: ["Check whether the area determinant is zero.", "All three points lie on $y=2x$.", "Zero area means collinear."],
        solution: [{ step: 1, explanation: "The three points lie on one straight line.", math: "y=2x" }],
      },
      {
        questionLatex:
          "\\text{The area of the triangle with vertices }(-1,2),(3,2),(1,5)\\text{ is}",
        difficulty: 4,
        skillTags: ["area_triangle", "determinants"],
        choices: ["$6$", "$12$", "$3$", "$9$"],
        correctLetter: "A",
        hints: ["The base from $(-1,2)$ to $(3,2)$ is horizontal.", "The base length is $4$.", "The height from $(1,5)$ to $y=2$ is $3$."],
        solution: [{ step: 1, explanation: "Use base-height area.", math: "\\frac12(4)(3)=6" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }\\operatorname{adj}A\\text{ for }A=\\begin{bmatrix}5&2\\\\3&1\\end{bmatrix}.",
        difficulty: 2,
        skillTags: ["adjoint"],
        parts: singlePart("a", "Write $\\operatorname{adj}A$.", 2),
        hints: ["Use the $2\\times2$ adjoint formula.", "Swap the diagonal entries.", "Change signs of the off-diagonal entries."],
        rubric: singleRubric("a", 2, "Finds $\\operatorname{adj}A=\\begin{bmatrix}1&-2\\\\-3&5\\end{bmatrix}$."),
        commonErrors: ["Finding the transpose instead of the adjoint."],
        workedSolution: [{ part: "a", explanation: "$\\operatorname{adj}A=\\begin{bmatrix}1&-2\\\\-3&5\\end{bmatrix}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the area of the triangle with vertices }(1,1),(5,1),(1,4).",
        difficulty: 2,
        skillTags: ["area_triangle"],
        parts: singlePart("a", "Find the area.", 2),
        hints: ["The triangle is right-angled.", "Base length is $4$.", "Height is $3$."],
        rubric: singleRubric("a", 2, "Finds area $6$ square units."),
        commonErrors: ["Forgetting the factor $1/2$ in triangle area."],
        workedSolution: [{ part: "a", explanation: "The base is $5-1=4$ and height is $4-1=3$, so the area is $\\frac12(4)(3)=6$ square units." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find }A^{-1}\\text{ for }A=\\begin{bmatrix}3&1\\\\2&1\\end{bmatrix}.",
        difficulty: 3,
        skillTags: ["inverse_matrix", "adjoint"],
        parts: singlePart("a", "Use adjoint and determinant.", 3),
        hints: ["First find $|A|$.", "Then find $\\operatorname{adj}A$.", "Use $A^{-1}=\\frac1{|A|}\\operatorname{adj}A$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $|A|=1$." },
            { part: "a", points: 1, description: "Finds $\\operatorname{adj}A=\\begin{bmatrix}1&-1\\\\-2&3\\end{bmatrix}$." },
            { part: "a", points: 1, description: "Writes the correct inverse." },
          ],
        },
        commonErrors: ["Using determinant $5$ by adding products instead of subtracting.", "Not changing signs of off-diagonal entries."],
        workedSolution: [{ part: "a", explanation: "$|A|=3(1)-1(2)=1$ and $\\operatorname{adj}A=\\begin{bmatrix}1&-1\\\\-2&3\\end{bmatrix}$. Hence $A^{-1}=\\begin{bmatrix}1&-1\\\\-2&3\\end{bmatrix}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Find the inverse of }A=\\begin{bmatrix}1&2&0\\\\0&1&1\\\\1&0&1\\end{bmatrix}\\text{ using the adjoint method.}",
        difficulty: 5,
        skillTags: ["inverse_matrix", "adjoint", "determinants"],
        parts: [
          { letter: "a", promptMarkdown: "Find $|A|$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\operatorname{adj}A$.", points: 3 },
          { letter: "c", promptMarkdown: "Write $A^{-1}$.", points: 1 },
        ],
        hints: ["The determinant is $3$.", "Build the cofactor matrix first, then transpose it.", "Use $A^{-1}=\\frac1{|A|}\\operatorname{adj}A$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $|A|=3$." },
            { part: "b", points: 2, description: "Finds the cofactor matrix correctly." },
            { part: "b", points: 1, description: "Transposes cofactors to get the adjoint." },
            { part: "c", points: 1, description: "Writes $A^{-1}=\\frac13\\operatorname{adj}A$ correctly." },
          ],
        },
        commonErrors: ["Using the cofactor matrix directly as the adjoint without transposing.", "Forgetting to divide by determinant $3$."],
        workedSolution: [
          { part: "a", explanation: "Expanding along the first row, $|A|=1\\begin{vmatrix}1&1\\\\0&1\\end{vmatrix}-2\\begin{vmatrix}0&1\\\\1&1\\end{vmatrix}=1-2(-1)=3$." },
          { part: "b", explanation: "The cofactor matrix is $\\begin{bmatrix}1&1&-1\\\\-2&1&2\\\\2&-1&1\\end{bmatrix}$, so $\\operatorname{adj}A=\\begin{bmatrix}1&-2&2\\\\1&1&-1\\\\-1&2&1\\end{bmatrix}$." },
          { part: "c", explanation: "$A^{-1}=\\frac13\\begin{bmatrix}1&-2&2\\\\1&1&-1\\\\-1&2&1\\end{bmatrix}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A survey map marks three points }A(2,1),B(5,3),C(-1,4)\\text{ around a small triangular garden.}",
        difficulty: 4,
        skillTags: ["area_triangle", "determinants", "case_based"],
        figure: triangleAreaFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the determinant formula for the area of triangle $ABC$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the area of the garden.", points: 2 },
          { letter: "c", promptMarkdown: "State whether the three points are collinear.", points: 1 },
        ],
        hints: ["Use the coordinate area determinant.", "Substitute $(2,1),(5,3),(-1,4)$.", "Nonzero area means not collinear."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes the correct determinant area setup." },
            { part: "b", points: 2, description: "Computes area $\\frac{15}{2}$ square units." },
            { part: "c", points: 1, description: "Concludes that the points are not collinear." },
          ],
        },
        commonErrors: ["Forgetting the absolute value.", "Reporting determinant value $15$ as the area instead of half of it."],
        workedSolution: [
          { part: "a", explanation: "Area $=\\frac12\\left|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)\\right|$." },
          { part: "b", explanation: "Area $=\\frac12|2(3-4)+5(4-1)+(-1)(1-3)|=\\frac12|-2+15+2|=\\frac{15}{2}$." },
          { part: "c", explanation: "Since the area is nonzero, the points are not collinear." },
        ],
      },
    ],
  },
  {
    topicCode: "2.7",
    title: "Systems of Linear Equations Using Matrices",
    subtopic:
      "Consistency, uniqueness, and solving systems of linear equations using inverse matrices.",
    mc: [
      {
        questionLatex:
          "\\text{The system }x+y=3,\\ 2x+2y=6\\text{ has}",
        difficulty: 2,
        skillTags: ["systems", "consistency"],
        figure: coincidentLinesFigure,
        choices: [
          "$\\text{infinitely many solutions}$",
          "$\\text{a unique solution}$",
          "$\\text{no solution}$",
          "$\\text{exactly two solutions}$",
        ],
        correctLetter: "A",
        hints: ["The second equation is twice the first.", "Both equations represent the same line.", "So there are infinitely many common points."],
        solution: [{ step: 1, explanation: "The equations are dependent and consistent.", math: "2(x+y=3)\\Rightarrow 2x+2y=6" }],
      },
      {
        questionLatex:
          "\\text{The solution of }2x+y=5,\\ x+y=3\\text{ is}",
        difficulty: 2,
        skillTags: ["systems"],
        choices: ["$(2,1)$", "$(1,2)$", "$(3,-1)$", "$(5,3)$"],
        correctLetter: "A",
        hints: ["Subtract the second equation from the first.", "This gives $x=2$.", "Substitute into $x+y=3$."],
        solution: [{ step: 1, explanation: "Solve by elimination.", math: "x=2,\\quad y=1" }],
      },
      {
        questionLatex:
          "\\text{If the coefficient determinant of a square linear system is nonzero, then the system has}",
        difficulty: 3,
        skillTags: ["systems", "determinants"],
        figure: uniqueIntersectionFigure,
        choices: [
          "$\\text{a unique solution}$",
          "$\\text{no solution always}$",
          "$\\text{infinitely many solutions always}$",
          "$\\text{no conclusion}$",
        ],
        correctLetter: "A",
        hints: ["Nonzero determinant means the coefficient matrix is invertible.", "An inverse matrix gives one solution.", "So the solution is unique."],
        solution: [{ step: 1, explanation: "An invertible coefficient matrix gives a unique solution.", math: "|A|\\ne0\\Rightarrow X=A^{-1}B" }],
      },
      {
        questionLatex:
          "\\text{The determinant of the coefficient matrix of }2x+y=7,\\ 4x+2y=9\\text{ is}",
        difficulty: 3,
        skillTags: ["systems", "determinants"],
        choices: ["$0$", "$-2$", "$2$", "$18$"],
        correctLetter: "A",
        hints: ["Write the coefficient matrix.", "It is $\\begin{bmatrix}2&1\\\\4&2\\end{bmatrix}$.", "Compute $2(2)-1(4)$."],
        solution: [{ step: 1, explanation: "Compute the determinant.", math: "\\begin{vmatrix}2&1\\\\4&2\\end{vmatrix}=4-4=0" }],
      },
      {
        questionLatex:
          "\\text{For }AX=B,\\text{ where }A\\text{ is invertible, }X\\text{ equals}",
        difficulty: 4,
        skillTags: ["systems", "inverse_matrix", "matrix_equation"],
        choices: ["$A^{-1}B$", "$BA^{-1}$", "$AB^{-1}$", "$A+B$"],
        correctLetter: "A",
        hints: ["Pre-multiply both sides by $A^{-1}$.", "Use $A^{-1}A=I$.", "Matrix order matters."],
        solution: [{ step: 1, explanation: "Pre-multiply by the inverse of $A$.", math: "AX=B\\Rightarrow X=A^{-1}B" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Write the matrix form of }2x+3y=7,\\ x-y=1.",
        difficulty: 2,
        skillTags: ["systems", "matrix_form"],
        parts: singlePart("a", "Write the system as $AX=B$.", 2),
        hints: ["Use the coefficients as matrix $A$.", "Use $X=\\begin{bmatrix}x\\\\y\\end{bmatrix}$.", "Use the constants as $B$."],
        rubric: singleRubric("a", 2, "Writes $\\begin{bmatrix}2&3\\\\1&-1\\end{bmatrix}\\begin{bmatrix}x\\\\y\\end{bmatrix}=\\begin{bmatrix}7\\\\1\\end{bmatrix}$."),
        commonErrors: ["Putting constants into the coefficient matrix."],
        workedSolution: [{ part: "a", explanation: "$\\begin{bmatrix}2&3\\\\1&-1\\end{bmatrix}\\begin{bmatrix}x\\\\y\\end{bmatrix}=\\begin{bmatrix}7\\\\1\\end{bmatrix}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the coefficient determinant for }2x+y=4,\\ 4x+2y=8.",
        difficulty: 2,
        skillTags: ["systems", "determinants"],
        parts: singlePart("a", "Compute the determinant.", 2),
        hints: ["Use the coefficient matrix.", "Compute $\\begin{vmatrix}2&1\\\\4&2\\end{vmatrix}$.", "The rows are proportional."],
        rubric: singleRubric("a", 2, "Finds determinant $0$."),
        commonErrors: ["Using constants $4$ and $8$ as coefficients."],
        workedSolution: [{ part: "a", explanation: "The coefficient determinant is $\\begin{vmatrix}2&1\\\\4&2\\end{vmatrix}=2(2)-1(4)=0$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Solve }2x+3y=7,\\ x-y=1.",
        difficulty: 3,
        skillTags: ["systems"],
        parts: singlePart("a", "Find $x$ and $y$.", 3),
        hints: ["From $x-y=1$, write $x=y+1$.", "Substitute into $2x+3y=7$.", "Then solve for both variables."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses a valid elimination or substitution step." },
            { part: "a", points: 1, description: "Finds $y=1$." },
            { part: "a", points: 1, description: "Finds $x=2$." },
          ],
        },
        commonErrors: ["Changing the sign incorrectly in $x-y=1$."],
        workedSolution: [{ part: "a", explanation: "From $x-y=1$, $x=y+1$. Substituting gives $2(y+1)+3y=7$, so $5y=5$ and $y=1$. Hence $x=2$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Solve the system }x+2y=5,\\ y+z=5,\\ x+z=4\\text{ using the inverse matrix method.}",
        difficulty: 5,
        skillTags: ["systems", "inverse_matrix", "matrix_equation"],
        parts: [
          { letter: "a", promptMarkdown: "Write the system as $AX=B$.", points: 1 },
          { letter: "b", promptMarkdown: "Use $A^{-1}=\\frac13\\begin{bmatrix}1&-2&2\\\\1&1&-1\\\\-1&2&1\\end{bmatrix}$ to find $X$.", points: 4 },
        ],
        hints: ["The coefficient matrix is $\\begin{bmatrix}1&2&0\\\\0&1&1\\\\1&0&1\\end{bmatrix}$.", "Multiply the given inverse by $B=\\begin{bmatrix}5\\\\5\\\\4\\end{bmatrix}$.", "The solution is $x=1,y=2,z=3$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Writes correct matrix equation $AX=B$." },
            { part: "b", points: 2, description: "Substitutes the given inverse and column matrix correctly." },
            { part: "b", points: 2, description: "Finds $x=1,y=2,z=3$." },
          ],
        },
        commonErrors: ["Multiplying $B A^{-1}$ instead of $A^{-1}B$.", "Forgetting the factor $1/3$."],
        workedSolution: [
          { part: "a", explanation: "$\\begin{bmatrix}1&2&0\\\\0&1&1\\\\1&0&1\\end{bmatrix}\\begin{bmatrix}x\\\\y\\\\z\\end{bmatrix}=\\begin{bmatrix}5\\\\5\\\\4\\end{bmatrix}$." },
          { part: "b", explanation: "$X=A^{-1}B=\\frac13\\begin{bmatrix}1&-2&2\\\\1&1&-1\\\\-1&2&1\\end{bmatrix}\\begin{bmatrix}5\\\\5\\\\4\\end{bmatrix}=\\frac13\\begin{bmatrix}3\\\\6\\\\9\\end{bmatrix}=\\begin{bmatrix}1\\\\2\\\\3\\end{bmatrix}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{At a school fair, adult, student, and child tickets are sold. Let }x,y,z\\text{ be the numbers of adult, student, and child tickets. The data gives }x+y+z=100,\\ 100x+50y+20z=6100,\\ x-y=10.",
        difficulty: 4,
        skillTags: ["systems", "matrix_form", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write the system in matrix form.", points: 1 },
          { letter: "b", promptMarkdown: "State why the system has a unique solution if the coefficient determinant is $-110$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $x,y,z$.", points: 2 },
        ],
        hints: ["Use coefficient matrix rows from the three equations.", "A nonzero determinant gives a unique solution.", "Use $x-y=10$ and $x+y+z=100$ to reduce the system."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes the correct matrix equation." },
            { part: "b", points: 1, description: "Uses nonzero determinant to justify uniqueness." },
            { part: "c", points: 2, description: "Finds $x=40,y=30,z=30$." },
          ],
        },
        commonErrors: ["Using ticket prices as the variable column.", "Ignoring the third equation $x-y=10$.", "Dividing total revenue equally among ticket types."],
        workedSolution: [
          { part: "a", explanation: "$\\begin{bmatrix}1&1&1\\\\100&50&20\\\\1&-1&0\\end{bmatrix}\\begin{bmatrix}x\\\\y\\\\z\\end{bmatrix}=\\begin{bmatrix}100\\\\6100\\\\10\\end{bmatrix}$." },
          { part: "b", explanation: "Since the coefficient determinant is $-110\\ne0$, the system has a unique solution." },
          { part: "c", explanation: "Solving gives $x=40$, $y=30$, and $z=30$. These satisfy $40+30+30=100$, $4000+1500+600=6100$, and $40-30=10$." },
        ],
      },
    ],
  },
];

export const algebraTopics: Topic[] = topicSeeds.map(makeTopic);
