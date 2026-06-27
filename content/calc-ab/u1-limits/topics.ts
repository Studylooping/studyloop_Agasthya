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

const COURSE = "calc-ab";
const UNIT = "u1-limits";
const VERSION = "0.3.5";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const MC_DIFFICULTY_FLOORS = [2, 2, 3, 3, 4] as const;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;

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

interface FrqSeed {
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
  frq: FrqSeed;
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

function calibrateFrqDifficulty(seedDifficulty: Difficulty): Difficulty {
  return Math.max(seedDifficulty, 3) as Difficulty;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const correctLetter = seed.correctLetter;
  const choices = LETTERS.map((letter, choiceIndex) => {
    const isCorrect = letter === correctLetter;
    return {
      letter,
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[letter] ??
          "This answer does not follow from the limit definition or the required algebraic step.",
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[letter] ?? "incorrect_limit_reasoning",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(
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
      "confuses_function_value_with_limit",
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

function makeFrq(meta: TopicMeta, seed: FrqSeed): FrqItem {
  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFrqDifficulty(seed.difficulty),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_function_value_with_limit",
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
      makeFrq(meta, seed.frq),
    ],
  };
}

const removableDiscontinuityFigure: ItemFigure = {
  type: "svg",
  title: "Removable discontinuity graph",
  description:
    "The graph approaches the open circle at (-2, 6), while the filled point at (-2, -1) gives the actual value f(-2).",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="40" y1="260" x2="520" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="28" x2="280" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 40 260 L 50 254 M 40 260 L 50 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 260 L 510 254 M 520 260 L 510 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 280 28 L 274 40 M 280 28 L 286 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="265" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="286" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="200" y1="80" x2="200" y2="260" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="200" y1="80" x2="280" y2="80" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="188" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">-2</text>
  <text x="288" y="85" font-size="14" fill="#334155" font-family="Arial, sans-serif">6</text>
  <text x="287" y="294" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>

  <path d="M 64 214 C 105 158, 150 102, 200 80" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 200 80 C 258 56, 318 96, 388 166" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="200" cy="80" r="9" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <circle cx="200" cy="290" r="8" fill="#dc2626"/>
</svg>`,
};

const discontinuityTypesFigure: ItemFigure = {
  type: "svg",
  title: "Three discontinuities on one graph",
  description:
    "The figure shows a hole at (-1, 2), a jump at x = 1 with different one-sided limits, and a dashed vertical asymptote at x = 3.",
  svg: `
<svg viewBox="0 0 640 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="640" height="340" rx="12" fill="#f8fafc"/>
  <line x1="48" y1="260" x2="592" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="252" y1="30" x2="252" y2="304" stroke="#64748b" stroke-width="2"/>
  <path d="M 592 260 L 580 254 M 592 260 L 580 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 252 30 L 246 42 M 252 30 L 258 42" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="600" y="265" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="258" y="25" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="185" y1="260" x2="185" y2="118" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="173" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <path d="M 70 196 C 110 150, 144 128, 185 118" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 185 118 C 224 112, 268 122, 312 142" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="185" cy="118" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>

  <line x1="320" y1="260" x2="320" y2="68" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="316" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <path d="M 275 76 L 320 76" stroke="#0f766e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="320" cy="76" r="7" fill="#f8fafc" stroke="#0f766e" stroke-width="4"/>
  <path d="M 320 204 L 382 204" stroke="#0f766e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="320" cy="204" r="7" fill="#0f766e"/>

  <line x1="455" y1="38" x2="455" y2="306" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="7 7"/>
  <text x="450" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">3</text>
  <path d="M 392 88 C 424 126, 445 190, 452 304" stroke="#7c3aed" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 520 88 C 490 126, 464 190, 458 304" stroke="#7c3aed" stroke-width="4" fill="none" stroke-linecap="round"/>
  <line x1="246" y1="76" x2="258" y2="76" stroke="#64748b" stroke-width="1.5"/>
  <line x1="246" y1="118" x2="258" y2="118" stroke="#64748b" stroke-width="1.5"/>
  <line x1="246" y1="204" x2="258" y2="204" stroke="#64748b" stroke-width="1.5"/>
  <text x="232" y="81" font-size="14" fill="#334155" font-family="Arial, sans-serif">4</text>
  <text x="232" y="123" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="226" y="209" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
</svg>`,
};

const openCircleAtTwoFigure: ItemFigure = {
  type: "svg",
  title: "Graph with a removable point at x = 2",
  description:
    "The graph has two branches approaching an open circle at (2, 7) and a filled point at (2, 1).",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="42" y1="260" x2="520" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="220" y1="28" x2="220" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 42 260 L 52 254 M 42 260 L 52 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 260 L 510 254 M 520 260 L 510 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 220 28 L 214 40 M 220 28 L 226 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="265" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="226" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="320" y1="70" x2="320" y2="260" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="220" y1="70" x2="320" y2="70" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="220" y1="220" x2="320" y2="220" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="316" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="230" y="75" font-size="14" fill="#334155" font-family="Arial, sans-serif">7</text>
  <text x="230" y="225" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>

  <path d="M 82 188 C 136 120, 218 78, 320 70" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 320 70 C 390 78, 444 116, 488 176" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="320" cy="70" r="9" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <circle cx="320" cy="220" r="8" fill="#dc2626"/>
</svg>`,
};

const matchingBranchesAtOneFigure: ItemFigure = {
  type: "svg",
  title: "Two branches with a separate function value",
  description:
    "The left and right branches meet at an open circle at (1, 2), and a filled point is shown at (1, 5).",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="260" x2="520" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="260" y1="28" x2="260" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 260 L 54 254 M 44 260 L 54 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 260 L 510 254 M 520 260 L 510 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 260 28 L 254 40 M 260 28 L 266 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="265" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="266" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="330" y1="160" x2="330" y2="260" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="260" y1="160" x2="330" y2="160" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="260" y1="70" x2="330" y2="70" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="326" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="270" y="165" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="270" y="75" font-size="14" fill="#334155" font-family="Arial, sans-serif">5</text>

  <path d="M 116 250 L 330 160" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 330 160 L 490 90" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="330" cy="160" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <circle cx="330" cy="70" r="8" fill="#dc2626"/>
</svg>`,
};

const jumpAtNegativeOneFigure: ItemFigure = {
  type: "svg",
  title: "Graph with different one-sided behavior at x = -1",
  description:
    "The graph approaches y = 4 from the left of x = -1 and y = -2 from the right.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="210" x2="520" y2="210" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="28" x2="280" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 210 L 54 204 M 44 210 L 54 216" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 210 L 510 204 M 520 210 L 510 216" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 280 28 L 274 40 M 280 28 L 286 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="215" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="286" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="220" y1="82" x2="220" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="220" y1="82" x2="280" y2="82" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="220" y1="250" x2="280" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="208" y="230" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <text x="290" y="87" font-size="14" fill="#334155" font-family="Arial, sans-serif">4</text>
  <text x="290" y="255" font-size="14" fill="#334155" font-family="Arial, sans-serif">-2</text>

  <path d="M 80 102 C 126 90, 166 84, 220 82" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="220" cy="82" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <circle cx="220" cy="250" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <path d="M 220 250 C 300 244, 388 232, 488 220" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`,
};

const positiveInfiniteAtThreeFigure: ItemFigure = {
  type: "svg",
  title: "Graph with unbounded behavior near x = 3",
  description:
    "The graph rises without bound from both sides as x approaches 3.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="260" x2="520" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="200" y1="28" x2="200" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 260 L 54 254 M 44 260 L 54 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 260 L 510 254 M 520 260 L 510 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 200 28 L 194 40 M 200 28 L 206 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="265" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="206" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="380" y1="36" x2="380" y2="292" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="7 7"/>
  <text x="376" y="280" font-size="14" fill="#334155" font-family="Arial, sans-serif">3</text>
  <path d="M 110 236 C 190 226, 288 182, 372 42" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 450 236 C 422 188, 392 98, 386 42" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 372 42 L 360 53 M 372 42 L 374 58" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 386 42 L 394 56 M 386 42 L 380 58" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`,
};

const mismatchedSidesAtZeroFigure: ItemFigure = {
  type: "svg",
  title: "Graph with mismatched one-sided behavior at x = 0",
  description:
    "The graph approaches y = -3 from the left of x = 0 and y = -1 from the right, with a filled point at (0, -3).",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="90" x2="520" y2="90" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="28" x2="280" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 90 L 54 84 M 44 90 L 54 96" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 90 L 510 84 M 520 90 L 510 96" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 280 28 L 274 40 M 280 28 L 286 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="95" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="286" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="280" y1="150" x2="280" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="280" y1="150" x2="240" y2="150" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="280" y1="250" x2="240" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="288" y="110" font-size="14" fill="#334155" font-family="Arial, sans-serif">0</text>
  <text x="214" y="155" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <text x="214" y="255" font-size="14" fill="#334155" font-family="Arial, sans-serif">-3</text>

  <path d="M 84 238 C 140 246, 208 250, 280 250" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="280" cy="250" r="8" fill="#dc2626"/>
  <circle cx="280" cy="150" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <path d="M 280 150 C 350 150, 424 158, 496 174" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`,
};

const holeAtThreeFiveFigure: ItemFigure = {
  type: "svg",
  title: "Graph with a hole at x = 3",
  description:
    "The graph follows a line near x = 3 and has an open circle at (3, 5).",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="250" x2="520" y2="250" stroke="#64748b" stroke-width="2"/>
  <line x1="180" y1="28" x2="180" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 250 L 54 244 M 44 250 L 54 256" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 250 L 510 244 M 520 250 L 510 256" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 180 28 L 174 40 M 180 28 L 186 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="255" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="186" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="360" y1="80" x2="360" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="180" y1="80" x2="360" y2="80" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="356" y="270" font-size="14" fill="#334155" font-family="Arial, sans-serif">3</text>
  <text x="190" y="85" font-size="14" fill="#334155" font-family="Arial, sans-serif">5</text>
  <path d="M 120 216 L 480 12" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="360" cy="80" r="9" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
</svg>`,
};

const jumpAtTwoOneFourFigure: ItemFigure = {
  type: "svg",
  title: "Graph with a jump at x = 2",
  description:
    "The graph approaches y = 1 from the left of x = 2 and y = 4 from the right.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="230" x2="520" y2="230" stroke="#64748b" stroke-width="2"/>
  <line x1="220" y1="28" x2="220" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 230 L 54 224 M 44 230 L 54 236" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 230 L 510 224 M 520 230 L 510 236" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 220 28 L 214 40 M 220 28 L 226 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="235" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="226" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="340" y1="170" x2="340" y2="230" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="340" y1="80" x2="340" y2="230" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="220" y1="170" x2="340" y2="170" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="220" y1="80" x2="340" y2="80" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="336" y="250" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="230" y="175" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="230" y="85" font-size="14" fill="#334155" font-family="Arial, sans-serif">4</text>
  <path d="M 82 184 C 164 174, 244 170, 340 170" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="340" cy="170" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <circle cx="340" cy="80" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
  <path d="M 340 80 C 404 78, 458 86, 500 104" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`,
};

const holeAtTwoFourFigure: ItemFigure = {
  type: "svg",
  title: "Graph with a hole at x = 2",
  description:
    "The graph follows a line near x = 2 and has an open circle at (2, 4).",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <line x1="44" y1="250" x2="520" y2="250" stroke="#64748b" stroke-width="2"/>
  <line x1="200" y1="28" x2="200" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 44 250 L 54 244 M 44 250 L 54 256" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 520 250 L 510 244 M 520 250 L 510 256" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 200 28 L 194 40 M 200 28 L 206 40" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="528" y="255" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="206" y="24" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="320" y1="95" x2="320" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="200" y1="95" x2="320" y2="95" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="316" y="270" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="210" y="100" font-size="14" fill="#334155" font-family="Arial, sans-serif">4</text>
  <path d="M 140 211.25 L 440 17.5" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="320" cy="95" r="9" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
</svg>`,
};

const discontinuitiesAtMinusOneZeroFourFigure: ItemFigure = {
  type: "svg",
  title: "Graph with three discontinuities",
  description:
    "The graph has a removable point at x = -1, a jump at x = 0, and unbounded behavior near x = 4.",
  svg: `
<svg viewBox="0 0 680 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="680" height="340" rx="12" fill="#f8fafc"/>
  <line x1="48" y1="190" x2="628" y2="190" stroke="#64748b" stroke-width="2"/>
  <line x1="300" y1="32" x2="300" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M 48 190 L 58 184 M 48 190 L 58 196" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 628 190 L 618 184 M 628 190 L 618 196" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 300 32 L 294 44 M 300 32 L 306 44" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="636" y="195" font-size="14" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="306" y="28" font-size="14" fill="#475569" font-family="Arial, sans-serif">y</text>

  <line x1="240" y1="110" x2="240" y2="190" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="240" y1="110" x2="300" y2="110" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="228" y="210" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <text x="310" y="115" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <path d="M 80 164 C 132 132, 184 116, 240 110" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 240 110 C 260 108, 280 104, 300 70" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="240" cy="110" r="8" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>

  <line x1="300" y1="70" x2="300" y2="270" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="300" y1="70" x2="340" y2="70" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="300" y1="270" x2="340" y2="270" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="306" y="210" font-size="14" fill="#334155" font-family="Arial, sans-serif">0</text>
  <text x="348" y="75" font-size="14" fill="#334155" font-family="Arial, sans-serif">3</text>
  <text x="348" y="275" font-size="14" fill="#334155" font-family="Arial, sans-serif">-2</text>
  <circle cx="300" cy="70" r="8" fill="#f8fafc" stroke="#0f766e" stroke-width="4"/>
  <circle cx="300" cy="270" r="8" fill="#f8fafc" stroke="#0f766e" stroke-width="4"/>
  <path d="M 300 270 C 350 250, 392 226, 432 200" stroke="#0f766e" stroke-width="4" fill="none" stroke-linecap="round"/>

  <line x1="540" y1="38" x2="540" y2="304" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="7 7"/>
  <text x="536" y="210" font-size="14" fill="#334155" font-family="Arial, sans-serif">4</text>
  <path d="M 446 232 C 488 190, 524 100, 536 46" stroke="#7c3aed" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 612 232 C 578 178, 550 100, 544 46" stroke="#7c3aed" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Introducing Calculus: Can Change Occur at an Instant?",
    subtopic:
      "Interpreting instantaneous change as the limiting value of average rates of change",
    mc: [
      {
        questionLatex:
          "\\text{For } f(t)=t^2,\\ \\text{the average rate of change on }[2,2+h]\\text{ is }4+h.\\ \\lim_{h\\to0}(4+h)=?",
        difficulty: 2,
        skillTags: ["limits.instantaneous_rate", "average_rate_of_change"],
        choices: ["0", "2", "4", "$4+h$"],
        correctLetter: "C",
        rationales: {
          A: "The interval width goes to 0, but the limiting rate does not have to be 0.",
          B: "This is the input value, not the limiting secant slope.",
          D: "The expression before taking the limit still contains h.",
        },
        hints: [
          "The average rate expression is already simplified.",
          "Instantaneous rate is the value the average rates approach as $h$ approaches 0.",
          "Substitute $h=0$ only after the limit expression is simplified.",
        ],
        solution: [
          { step: 1, explanation: "Start with the given average rate.", math: "4+h" },
          { step: 2, explanation: "Let the interval width shrink to zero.", math: "\\lim_{h\\to0}(4+h)=4" },
        ],
      },
      {
        questionLatex:
          "\\text{A position function is }s(t)=16t^2.\\ \\text{What is the average rate of change on }[1,1.1]?",
        difficulty: 2,
        skillTags: ["limits.average_rate_of_change", "secant_slope"],
        choices: ["$16$", "$32$", "$33.6$", "$35.2$"],
        correctLetter: "C",
        rationales: {
          A: "This uses only the coefficient of the function, not the change in position over time.",
          B: "This is the instantaneous rate at t=1, not the average rate over [1,1.1].",
          D: "This is an arithmetic error in evaluating s(1.1).",
        },
        hints: [
          "Average rate of change is $\\frac{s(1.1)-s(1)}{1.1-1}$.",
          "Compute $s(1.1)=16(1.1)^2$ and $s(1)=16$.",
          "Divide the change in position by $0.1$.",
        ],
        solution: [
          { step: 1, explanation: "Evaluate the two positions.", math: "s(1.1)=16(1.21)=19.36,\\quad s(1)=16" },
          { step: 2, explanation: "Divide by the change in time.", math: "\\frac{19.36-16}{0.1}=33.6" },
        ],
      },
      {
        questionLatex:
          "\\text{For a function }f,\\ \\frac{f(a+h)-f(a)}{h}=7-3h\\text{ for small nonzero }h.\\text{ What is }f'(a)?",
        difficulty: 3,
        skillTags: ["limits.instantaneous_rate", "conceptual_limits"],
        choices: ["$7$", "$-3$", "$0$", "Cannot be determined"],
        correctLetter: "A",
        rationales: {
          B: "This uses the coefficient of h, but the derivative is the limiting value of the whole quotient.",
          C: "The interval width approaches 0, but the slope need not approach 0.",
          D: "The difference quotient is given, so the limiting value can be found.",
        },
        hints: [
          "The derivative is the limit of the difference quotient.",
          "Use the whole expression $7-3h$.",
          "Let $h\\to0$ after the quotient is simplified.",
        ],
        solution: [
          { step: 1, explanation: "Use the limit definition of the derivative.", math: "f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}" },
          { step: 2, explanation: "Substitute the simplified quotient and evaluate the limit.", math: "f'(a)=\\lim_{h\\to0}(7-3h)=7" },
        ],
      },
      {
        questionLatex:
          "\\text{For }f(t)=\\frac{100}{t+1},\\ \\text{the average rate on }[1,1+h]\\text{ simplifies to }\\frac{-50}{2+h}.\\ \\text{Find the instantaneous rate at }t=1.",
        difficulty: 3,
        skillTags: ["limits.instantaneous_rate", "rational_functions"],
        choices: ["$-50$", "$-25$", "$25$", "0"],
        correctLetter: "B",
        rationales: {
          A: "This misses the denominator value when h approaches 0.",
          C: "The sign should be negative because the function is decreasing near t=1.",
          D: "The interval width approaches 0, not the rate.",
        },
        hints: [
          "Instantaneous rate is the limit of the simplified average rate.",
          "Use $h\\to0$ in $\\frac{-50}{2+h}$.",
          "The denominator approaches 2.",
        ],
        solution: [
          { step: 1, explanation: "Take the limit of the simplified secant slope.", math: "\\lim_{h\\to0}\\frac{-50}{2+h}" },
          { step: 2, explanation: "Substitute h=0.", math: "\\frac{-50}{2}=-25" },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cccc}\\text{interval}&[2.9,3]&[2.99,3]&[3,3.01]&[3,3.1]\\\\\\hline \\text{average velocity}&-2.10&-2.01&-1.99&-1.90\\end{array}\\quad\\text{Which estimate for the instantaneous velocity at }t=3\\text{ is best supported?}",
        difficulty: 3,
        skillTags: ["limits.graphical_interpretation", "instantaneous_velocity"],
        choices: [
          "$-2\\text{ units/s, because the nearby average velocities approach }-2$",
          "$0\\text{ units/s, because the interval widths approach }0$",
          "$2\\text{ units/s, because speed cannot be negative}$",
          "Cannot be estimated because the intervals have different widths",
        ],
        correctLetter: "A",
        rationales: {
          B: "The time widths shrink, but the average velocities approach a nonzero value.",
          C: "Velocity can be negative; speed is the magnitude of velocity.",
          D: "Different nearby intervals can still reveal the limiting trend.",
        },
        hints: [
          "Look for the value approached by average velocities as intervals shrink toward t=3.",
          "The left-side values are near -2 and the right-side values are also near -2.",
          "Keep the sign because velocity has direction.",
        ],
        solution: [
          { step: 1, explanation: "The average velocities from both sides are moving toward the same value.", math: "-2.10,-2.01,-1.99,-1.90\\to -2" },
          { step: 2, explanation: "The instantaneous velocity is the limiting value of those average velocities.", math: "-2\\text{ units/s}" },
        ],
      },
    ],
    frq: {
      questionLatex: "h(t)=64+48t-16t^2",
      difficulty: 3,
      skillTags: ["limits.instantaneous_rate", "average_rate_of_change"],
      parts: [
        { letter: "a", promptMarkdown: "Find the average velocity on $[1,1.5]$.", points: 1 },
        { letter: "b", promptMarkdown: "Find the average velocity on $[1,1.1]$.", points: 1 },
        { letter: "c", promptMarkdown: "Find the average velocity on $[1,1+k]$ and use it to determine the instantaneous velocity at $t=1$.", points: 4 },
      ],
      hints: [
        "Average velocity on $[a,b]$ is $\\frac{h(b)-h(a)}{b-a}$.",
        "For part (c), keep $k$ as a symbol until the expression is simplified.",
        "Instantaneous velocity comes from letting $k\\to0$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly computes the average velocity on [1,1.5] as 8." },
          { part: "b", points: 1, description: "Correctly computes the average velocity on [1,1.1] as 14.4." },
          { part: "c", points: 1, description: "Sets up the difference quotient with 1+k and 1." },
          { part: "c", points: 1, description: "Correctly expands and simplifies h(1+k)-h(1)." },
          { part: "c", points: 1, description: "Cancels k to get 16-16k." },
          { part: "c", points: 1, description: "Takes the limit k -> 0 and concludes 16." },
        ],
      },
      commonErrors: [
        "Using height instead of change in height over change in time.",
        "Substituting k=0 before cancelling in the difference quotient.",
        "Dropping the negative sign in the quadratic term.",
      ],
      workedSolution: [
        { part: "a", explanation: "$h(1)=96$ and $h(1.5)=100$, so the average velocity is $(100-96)/0.5=8$." },
        { part: "b", explanation: "$h(1.1)=97.44$, so the average velocity is $(97.44-96)/0.1=14.4$." },
        { part: "c", explanation: "$h(1+k)=64+48(1+k)-16(1+k)^2=96+16k-16k^2$. Thus $\\frac{h(1+k)-h(1)}{k}=\\frac{16k-16k^2}{k}=16-16k$. Letting $k\\to0$ gives instantaneous velocity $16$." },
      ],
    },
  },
  {
    topicCode: "1.2",
    title: "Defining Limits and Using Limit Notation",
    subtopic:
      "Reading, writing, and interpreting two-sided and one-sided limit notation",
    mc: [
      {
        questionLatex:
          "f(x)=\\begin{cases}x+3,&x<2\\\\9,&x=2\\\\2x+1,&x>2\\end{cases}\\quad\\text{Which statement is true?}",
        difficulty: 3,
        skillTags: ["limits.notation", "limits.conceptual_definition"],
        choices: [
          "$\\lim_{x\\to2}f(x)=5\\text{ and }f(2)=9$",
          "$\\lim_{x\\to2}f(x)=9\\text{ because }f(2)=9$",
          "$\\lim_{x\\to2}f(x)\\text{ does not exist because }f(2)\\ne5$",
          "$\\lim_{x\\to2}f(x)=3\\text{ because the left branch is }x+3$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The limit is controlled by nearby values, not the value at x=2.",
          C: "A limit can exist even when the function value is different.",
          D: "The left branch approaches 5, not 3, as x approaches 2.",
        },
        hints: [
          "Use the left branch for x-values less than 2 and the right branch for x-values greater than 2.",
          "Compute the two one-sided limits.",
          "Then compare the limit with the separately defined value f(2).",
        ],
        solution: [
          { step: 1, explanation: "Evaluate the one-sided limits from the neighboring formulas.", math: "\\lim_{x\\to2^-}(x+3)=5,\\quad \\lim_{x\\to2^+}(2x+1)=5" },
          { step: 2, explanation: "The two-sided limit exists and equals 5, while the point value is defined separately.", math: "\\lim_{x\\to2}f(x)=5,\\quad f(2)=9" },
        ],
      },
      {
        questionLatex:
          "g(x)=\\begin{cases}x^2-1,&x<4\\\\-3,&x=4\\\\2x+7,&x>4\\end{cases}\\quad\\lim_{x\\to4}g(x)=",
        difficulty: 2,
        skillTags: ["limits.one_sided_limits", "limits.two_sided_limits"],
        choices: ["$-3$", "$15$", "$4$", "Does not exist"],
        correctLetter: "B",
        rationales: {
          A: "This is g(4), but the limit depends on nearby values.",
          C: "4 is the input being approached, not the output value.",
          D: "The left and right nearby formulas approach the same value.",
        },
        hints: [
          "Use $x^2-1$ from the left of 4.",
          "Use $2x+7$ from the right of 4.",
          "The value at x=4 does not control the limit.",
        ],
        solution: [
          { step: 1, explanation: "Compute the two one-sided limits.", math: "\\lim_{x\\to4^-}(x^2-1)=15,\\quad \\lim_{x\\to4^+}(2x+7)=15" },
          { step: 2, explanation: "Because the one-sided limits agree, the two-sided limit is the common value.", math: "\\lim_{x\\to4}g(x)=15" },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to1^-}g(x)=4\\text{ and }\\lim_{x\\to1^+}g(x)=6,\\text{ then }\\lim_{x\\to1}g(x)=?",
        difficulty: 2,
        skillTags: ["limits.one_sided_limits", "limits.two_sided_limits"],
        choices: ["4", "5", "6", "Does not exist"],
        correctLetter: "D",
        rationales: {
          A: "This uses only the left-hand limit.",
          B: "A two-sided limit is not the average of mismatched one-sided limits.",
          C: "This uses only the right-hand limit.",
        },
        hints: [
          "A two-sided limit needs both sides to approach the same value.",
          "Compare 4 and 6.",
          "Different one-sided limits mean the two-sided limit does not exist.",
        ],
        solution: [
          { step: 1, explanation: "The one-sided limits are different.", math: "4\\ne6" },
          { step: 2, explanation: "The two-sided limit does not exist.", math: null },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}x^2,&x<1\\\\5-x,&x>1\\end{cases}\\quad\\lim_{x\\to1^+}f(x)=",
        difficulty: 2,
        skillTags: ["limits.notation", "right_hand_limits"],
        choices: ["$1$", "$4$", "$5$", "Does not exist"],
        correctLetter: "B",
        rationales: {
          A: "This uses the left-hand branch instead of the right-hand branch.",
          C: "This substitutes into the expression before simplifying the output value.",
          D: "The right-hand branch has a clear limiting value.",
        },
        hints: [
          "$x\\to1^+$ means use x-values greater than 1.",
          "For x>1, the formula is $5-x$.",
          "Let x approach 1 in that branch.",
        ],
        solution: [
          { step: 1, explanation: "A right-hand limit uses the branch for x greater than 1.", math: "f(x)=5-x" },
          { step: 2, explanation: "Evaluate the limiting value from that side.", math: "\\lim_{x\\to1^+}(5-x)=4" },
        ],
      },
      {
        questionLatex:
          "\\text{Use the graph of }f\\text{ shown. What is }\\lim_{x\\to2}f(x)?",
        difficulty: 2,
        skillTags: ["limits.notation", "limits.graphical_interpretation"],
        figure: openCircleAtTwoFigure,
        choices: ["1", "2", "7", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "This is f(2), but the limit depends on nearby values.",
          B: "2 is the x-value being approached.",
          D: "Both branches approach the same y-value, so the limit exists.",
        },
        hints: [
          "An open circle often marks the value being approached.",
          "The filled point gives the function value at x=2.",
          "For the limit, follow the branches near x=2.",
        ],
        solution: [
          { step: 1, explanation: "The branches approach the open circle at y=7.", math: null },
          { step: 2, explanation: "The filled point does not change the limit.", math: "\\lim_{x\\to2}f(x)=7" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\begin{cases}x+1,&x<2\\\\5,&x=2\\\\3x-3,&x>2\\end{cases}",
      difficulty: 2,
      skillTags: ["limits.notation", "one_sided_limits"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\lim_{x\\to2^-}f(x)$.", points: 1 },
        { letter: "b", promptMarkdown: "Find $\\lim_{x\\to2^+}f(x)$.", points: 1 },
        { letter: "c", promptMarkdown: "Find $\\lim_{x\\to2}f(x)$ and compare it with $f(2)$.", points: 3 },
      ],
      hints: [
        "Use the branch that matches the side of approach.",
        "For $x\\to2^-$, use $x+1$; for $x\\to2^+$, use $3x-3$.",
        "A two-sided limit exists only if the one-sided limits match.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Correct left-hand limit of 3." },
          { part: "b", points: 1, description: "Correct right-hand limit of 3." },
          { part: "c", points: 1, description: "States the two-sided limit exists and equals 3." },
          { part: "c", points: 1, description: "Identifies f(2)=5." },
          { part: "c", points: 1, description: "Clearly explains that the limit and function value are different." },
        ],
      },
      commonErrors: [
        "Using the x=2 branch to compute the limit.",
        "Assuming the limit must equal f(2).",
        "Mixing up left-hand and right-hand notation.",
      ],
      workedSolution: [
        { part: "a", explanation: "For $x<2$, $f(x)=x+1$, so $\\lim_{x\\to2^-}f(x)=2+1=3$." },
        { part: "b", explanation: "For $x>2$, $f(x)=3x-3$, so $\\lim_{x\\to2^+}f(x)=6-3=3$." },
        { part: "c", explanation: "Since both one-sided limits equal 3, $\\lim_{x\\to2}f(x)=3$. However, the piecewise definition gives $f(2)=5$, so the function value is not equal to the limit." },
      ],
    },
  },
  {
    topicCode: "1.3",
    title: "Estimating Limit Values from Graphs",
    subtopic:
      "Reading approaching values, holes, jumps, and vertical behavior from graphs",
    mc: [
      {
        questionLatex:
          "\\text{Use the graph of }f\\text{ shown. What is }\\lim_{x\\to1}f(x)?",
        difficulty: 2,
        skillTags: ["limits.graphical_interpretation"],
        figure: matchingBranchesAtOneFigure,
        choices: ["1", "2", "5", "Does not exist"],
        correctLetter: "B",
        rationales: {
          A: "1 is the input value, not the approaching output value.",
          C: "This is f(1), not the limit.",
          D: "Both sides approach the same y-value.",
        },
        hints: [
          "Evaluate the left branch as x approaches 1.",
          "Evaluate the right branch as x approaches 1.",
          "The filled point gives f(1), not necessarily the limit.",
        ],
        solution: [
          { step: 1, explanation: "Both branch descriptions approach the same y-value.", math: "\\lim_{x\\to1^-}(x+1)=2,\\quad \\lim_{x\\to1^+}(3-x)=2" },
          { step: 2, explanation: "Therefore the limit is 2.", math: "\\lim_{x\\to1}f(x)=2" },
        ],
      },
      {
        questionLatex:
          "\\text{Use the graph of }f\\text{ shown. What is }\\lim_{x\\to-1}f(x)?",
        difficulty: 2,
        skillTags: ["limits.graphical_interpretation", "one_sided_limits"],
        figure: jumpAtNegativeOneFigure,
        choices: ["4", "$-2$", "1", "Does not exist"],
        correctLetter: "D",
        rationales: {
          A: "This uses only the left-hand behavior.",
          B: "This uses only the right-hand behavior.",
          C: "The limit is not the average of the two sides.",
        },
        hints: [
          "Compare the two one-sided graph behaviors.",
          "A two-sided limit needs the same y-value from both sides.",
          "The left and right values are different.",
        ],
        solution: [
          { step: 1, explanation: "The left-hand and right-hand limits differ.", math: "4\\ne -2" },
          { step: 2, explanation: "The two-sided limit does not exist.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{Use the graph of }f\\text{ shown. What is }\\lim_{x\\to3}f(x)?",
        difficulty: 2,
        skillTags: ["limits.graphical_interpretation", "infinite_limits"],
        figure: positiveInfiniteAtThreeFigure,
        choices: ["0", "3", "$\\infty$", "Does not exist because the sides disagree"],
        correctLetter: "C",
        rationales: {
          A: "The output values do not approach zero.",
          B: "3 is the input value being approached.",
          D: "The sides agree in direction; the limit is described as an infinite limit.",
        },
        hints: [
          "Rising without bound means the y-values grow larger and larger.",
          "If both sides rise without bound, they share the same infinite behavior.",
          "Use infinite-limit notation.",
        ],
        solution: [
          { step: 1, explanation: "Both sides increase without bound.", math: null },
          { step: 2, explanation: "So the infinite limit is positive infinity.", math: "\\lim_{x\\to3}f(x)=\\infty" },
        ],
      },
      {
        questionLatex:
          "\\text{Use the graph of }f\\text{ shown. Which statement must be true?}",
        difficulty: 2,
        skillTags: ["limits.graphical_interpretation", "removable_discontinuity"],
        figure: removableDiscontinuityFigure,
        choices: [
          "$\\lim_{x\\to-2}f(x)=6$",
          "$\\lim_{x\\to6}f(x)=-2$",
          "$f(-2)=6$",
          "The limit cannot exist at an open circle",
        ],
        correctLetter: "A",
        rationales: {
          B: "This reverses the input and output roles.",
          C: "The filled point gives $f(-2)=-1$, not 6.",
          D: "A hole can still have a limit.",
        },
        hints: [
          "The x-coordinate of the open circle is the input being approached.",
          "The y-coordinate is the value approached.",
          "The filled point controls the function value, not the approaching value.",
        ],
        solution: [
          { step: 1, explanation: "Nearby graph points approach the hole.", math: "(-2,6)" },
          { step: 2, explanation: "Thus the limit as x approaches -2 is 6, even though the filled point gives a different function value.", math: "\\lim_{x\\to-2}f(x)=6" },
        ],
      },
      {
        questionLatex:
          "\\text{Use the graph of }f\\text{ shown. What can be concluded about }\\lim_{x\\to0}f(x)?",
        difficulty: 2,
        skillTags: ["limits.graphical_interpretation"],
        figure: mismatchedSidesAtZeroFigure,
        choices: ["$-3$", "$-1$", "$-2$", "Does not exist"],
        correctLetter: "D",
        rationales: {
          A: "This uses only the left-hand limit and the filled point.",
          B: "This uses only the right-hand limit.",
          C: "A two-sided limit is not the average of mismatched one-sided limits.",
        },
        hints: [
          "Compare the left-hand and right-hand graph behavior.",
          "A filled point does not fix a mismatch between the sides.",
          "Two-sided limits require the same approaching y-value from both sides.",
        ],
        solution: [
          { step: 1, explanation: "The one-sided graph behaviors are different.", math: "\\lim_{x\\to0^-}f(x)=-3,\\quad \\lim_{x\\to0^+}f(x)=-1" },
          { step: 2, explanation: "Because the one-sided limits disagree, the two-sided limit does not exist.", math: null },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Use the graph of }f\\text{ shown.}",
      difficulty: 3,
      skillTags: ["limits.graphical_interpretation", "discontinuity_types"],
      figure: discontinuityTypesFigure,
      parts: [
        { letter: "a", promptMarkdown: "Find $\\lim_{x\\to-1}f(x)$.", points: 1 },
        { letter: "b", promptMarkdown: "Does $\\lim_{x\\to1}f(x)$ exist? Justify using one-sided limits.", points: 2 },
        { letter: "c", promptMarkdown: "Write limit notation that describes the behavior of $f$ near $x=3$.", points: 2 },
      ],
      hints: [
        "For a hole, read the y-value the graph approaches.",
        "For a jump, compare the two one-sided limits.",
        "Falling without bound means the y-values approach negative infinity.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Correctly gives limit 2 at the hole." },
          { part: "b", points: 1, description: "Correctly identifies the two one-sided limits 4 and -1." },
          { part: "b", points: 1, description: "Concludes the two-sided limit does not exist because the one-sided limits differ." },
          { part: "c", points: 1, description: "Uses negative infinity for falling without bound." },
          { part: "c", points: 1, description: "Writes correct limit notation as x approaches 3." },
        ],
      },
      commonErrors: [
        "Using the function value instead of the approaching value at a hole.",
        "Averaging one-sided limits at a jump.",
        "Writing DNE without describing the infinite behavior.",
      ],
      workedSolution: [
        { part: "a", explanation: "Both branches approach the hole at $y=2$, so $\\lim_{x\\to-1}f(x)=2$." },
        { part: "b", explanation: "$\\lim_{x\\to1^-}f(x)=4$ and $\\lim_{x\\to1^+}f(x)=-1$. Because these are different, $\\lim_{x\\to1}f(x)$ does not exist." },
        { part: "c", explanation: "Falling without bound from both sides is written $\\lim_{x\\to3}f(x)=-\\infty$." },
      ],
    },
  },
  {
    topicCode: "1.4",
    title: "Estimating Limit Values from Tables",
    subtopic:
      "Using numerical evidence from values near, but not necessarily at, the input",
    mc: [
      {
        questionLatex:
          "\\begin{array}{c|cccc}x&1.9&1.99&2.01&2.1\\\\ f(x)&3.9&3.99&5.01&5.1\\end{array}\\quad \\text{Which conclusion is best supported by the table?}",
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["limits.tables", "numerical_estimation"],
        choices: [
          "$\\lim_{x\\to2}f(x)=4$",
          "$\\lim_{x\\to2}f(x)=5$",
          "$\\lim_{x\\to2}f(x)\\text{ does not exist}$",
          "$f(2)=4.5$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses only the left-hand pattern.",
          B: "This uses only the right-hand pattern.",
          D: "The table does not give f(2), and a limit is not found by averaging the sides.",
        },
        hints: [
          "Separate the values with x<2 from the values with x>2.",
          "The left side appears to approach 4 and the right side appears to approach 5.",
          "A two-sided limit needs the same value from both sides.",
        ],
        solution: [
          { step: 1, explanation: "Read the one-sided trends from the table.", math: "\\lim_{x\\to2^-}f(x)\\approx4,\\quad \\lim_{x\\to2^+}f(x)\\approx5" },
          { step: 2, explanation: "Because the one-sided trends differ, the table supports a non-existent two-sided limit.", math: null },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cccc}x&0.9&0.99&1.01&1.1\\\\ g(x)&2.1&2.01&4.99&4.9\\end{array}\\quad \\lim_{x\\to1}g(x)\\text{ is }?",
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["limits.tables", "one_sided_limits"],
        choices: ["2", "3.5", "5", "Does not exist"],
        correctLetter: "D",
        rationales: {
          A: "This uses only the left side of the table.",
          B: "A two-sided limit is not the average of different side trends.",
          C: "This uses only the right side of the table.",
        },
        hints: [
          "Separate values less than 1 and greater than 1.",
          "Left side approaches about 2; right side approaches about 5.",
          "Different one-sided trends mean no two-sided limit.",
        ],
        solution: [
          { step: 1, explanation: "The left-hand table values approach 2.", math: null },
          { step: 2, explanation: "The right-hand table values approach 5.", math: null },
          { step: 3, explanation: "Since 2 and 5 differ, the two-sided limit does not exist.", math: null },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cccc}x&-0.1&-0.01&0.01&0.1\\\\ f(x)&0.9983&0.99998&0.99998&0.9983\\end{array}\\quad \\lim_{x\\to0}f(x)\\approx ?",
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["limits.tables", "numerical_estimation"],
        choices: ["0", "0.5", "1", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "0 is the input being approached, not the output.",
          B: "The values shown are much closer to 1.",
          D: "Both sides approach the same value.",
        },
        hints: [
          "Use the f-values closest to x=0.",
          "The values are very close to 1.",
          "Estimate the common approaching output.",
        ],
        solution: [
          { step: 1, explanation: "Near x=0, f(x) is about 0.99998.", math: null },
          { step: 2, explanation: "The estimated limit is 1.", math: "\\lim_{x\\to0}f(x)\\approx1" },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cccc}x&2.9&2.99&3.01&3.1\\\\ h(x)&-10&-100&100&10\\end{array}\\quad \\text{What behavior is suggested near }x=3?",
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["limits.tables", "infinite_limits"],
        choices: [
          "The two-sided limit is 0",
          "The two-sided limit is 100",
          "The left side decreases without bound and the right side increases without bound",
          "The function is continuous at x=3",
        ],
        correctLetter: "C",
        rationales: {
          A: "The values are not approaching zero.",
          B: "Only one listed value is 100; the trend is unbounded.",
          D: "The table suggests vertical asymptote behavior, not continuity.",
        },
        hints: [
          "Look at signs and magnitudes as x gets closer to 3.",
          "From the left, the values become large negative.",
          "From the right, the values become large positive.",
        ],
        solution: [
          { step: 1, explanation: "Left side: -10, -100 suggests decreasing without bound.", math: null },
          { step: 2, explanation: "Right side: 100, 10 near the closer entry suggests increasing without bound as x approaches 3 from the right.", math: null },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccccc}x&4.9&4.99&5&5.01&5.1\\\\ p(x)&7.2&7.02&0&6.98&6.8\\end{array}\\quad \\text{Which statement is best supported?}",
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["limits.tables", "numerical_estimation"],
        choices: [
          "$\\lim_{x\\to5}p(x)\\approx7\\text{ and }p(5)=0$",
          "$\\lim_{x\\to5}p(x)=0\\text{ because }p(5)=0$",
          "$\\lim_{x\\to5}p(x)\\approx5\\text{ because }x\\to5$",
          "$\\lim_{x\\to5}p(x)\\text{ does not exist because }p(5)\\ne7$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The limit uses nearby values, not the exact function value.",
          C: "5 is the input being approached, not the output value.",
          D: "The value at x=5 can differ from an existing limit.",
        },
        hints: [
          "Use the entries closest to x=5.",
          "The nearby values 7.02 and 6.98 surround 7.",
          "The table separately gives p(5)=0.",
        ],
        solution: [
          { step: 1, explanation: "The closest nearby values suggest the limit is 7.", math: "7.02\\to7,\\quad 6.98\\to7" },
          { step: 2, explanation: "The table also shows the function value at x=5 is 0.", math: "p(5)=0" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\begin{array}{c|cccccc}x&2.9&2.99&2.999&3.001&3.01&3.1\\\\ f(x)&5.7&5.97&5.997&6.003&6.03&6.3\\\\ g(x)&1.9&1.99&1.999&2.001&2.01&2.1\\end{array}",
      difficulty: 2,
      calculatorAllowed: true,
      skillTags: ["limits.tables", "limit_laws"],
      parts: [
        { letter: "a", promptMarkdown: "Estimate $\\lim_{x\\to3}f(x)$ and $\\lim_{x\\to3}g(x)$.", points: 2 },
        { letter: "b", promptMarkdown: "Use your estimates to find $\\lim_{x\\to3}(f(x)+g(x))$.", points: 1 },
        { letter: "c", promptMarkdown: "Use your estimates to find $\\lim_{x\\to3}\\frac{f(x)}{g(x)}$ and explain why division is allowed.", points: 2 },
      ],
      hints: [
        "Use values nearest to x=3.",
        "For sums, add the estimated limits.",
        "For quotients, make sure the denominator limit is not zero.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Estimates lim f(x) as 6." },
          { part: "a", points: 1, description: "Estimates lim g(x) as 2." },
          { part: "b", points: 1, description: "Correctly adds limits to get 8." },
          { part: "c", points: 1, description: "Correctly computes quotient limit as 3." },
          { part: "c", points: 1, description: "Explains that denominator limit 2 is nonzero." },
        ],
      },
      commonErrors: [
        "Using x-values instead of function values.",
        "Dividing table entries before noticing the denominator limit.",
        "Forgetting to justify that the quotient law applies.",
      ],
      workedSolution: [
        { part: "a", explanation: "The table values closest to 3 suggest $f(x)\\to6$ and $g(x)\\to2$." },
        { part: "b", explanation: "By the sum law, $\\lim_{x\\to3}(f(x)+g(x))=6+2=8$." },
        { part: "c", explanation: "By the quotient law, $\\lim_{x\\to3}\\frac{f(x)}{g(x)}=\\frac{6}{2}=3$, and this is allowed because the denominator limit is $2\\ne0$." },
      ],
    },
  },
  {
    topicCode: "1.5",
    title: "Determining Limits Using Algebraic Properties of Limits",
    subtopic:
      "Applying sum, difference, product, quotient, power, and root limit laws",
    mc: [
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to a}f(x)=3\\text{ and }\\lim_{x\\to a}g(x)=-2,\\text{ find }\\lim_{x\\to a}(2f(x)-g(x)).",
        difficulty: 2,
        skillTags: ["limits.limit_laws", "linear_combinations"],
        choices: ["4", "6", "8", "$-8$"],
        correctLetter: "C",
        rationales: {
          A: "This adds 2 and 3 before subtracting g's limit.",
          B: "This ignores the subtraction of a negative value.",
          D: "This has a sign error.",
        },
        hints: [
          "Use the constant multiple and difference laws.",
          "Replace f's limit with 3 and g's limit with -2.",
          "Compute $2(3)-(-2)$.",
        ],
        solution: [
          { step: 1, explanation: "Apply limit laws.", math: "2\\lim f-\\lim g" },
          { step: 2, explanation: "Substitute values.", math: "2(3)-(-2)=8" },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to a}f(x)=4\\text{ and }\\lim_{x\\to a}g(x)=0,\\text{ which statement about }\\lim_{x\\to a}\\frac{f(x)}{g(x)}\\text{ is justified by limit laws alone?}",
        difficulty: 3,
        skillTags: ["limits.limit_laws", "quotient_law"],
        choices: [
          "It equals 0",
          "It equals 4",
          "It equals 1",
          "The quotient law cannot be applied because the denominator limit is 0",
        ],
        correctLetter: "D",
        rationales: {
          A: "A nonzero numerator over something approaching zero does not imply 0.",
          B: "This ignores the denominator behavior.",
          C: "There is no limit law that produces 1 here.",
        },
        hints: [
          "The quotient law has a condition.",
          "The denominator's limit must not be zero.",
          "Here the denominator limit is zero.",
        ],
        solution: [
          { step: 1, explanation: "The quotient law requires the denominator limit to be nonzero.", math: "\\lim g(x)\\ne0" },
          { step: 2, explanation: "Since $\\lim g(x)=0$, the quotient law cannot be used by itself.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to2}f(x)=9\\text{ and }f(x)\\ge0\\text{ near }2,\\text{ find }\\lim_{x\\to2}\\sqrt{f(x)}.",
        difficulty: 2,
        skillTags: ["limits.limit_laws", "root_law"],
        choices: ["0", "3", "9", "81"],
        correctLetter: "B",
        rationales: {
          A: "The inside limit is 9, not 0.",
          C: "Remember the square root outside the function.",
          D: "This squares instead of taking a square root.",
        },
        hints: [
          "Use the root law for limits.",
          "Move the limit inside the square root when conditions allow.",
          "Compute $\\sqrt{9}$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the root law.", math: "\\lim_{x\\to2}\\sqrt{f(x)}=\\sqrt{\\lim_{x\\to2}f(x)}" },
          { step: 2, explanation: "Evaluate.", math: "\\sqrt{9}=3" },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to2}f(x)=3\\text{ and }\\lim_{x\\to2}g(x)=-2,\\text{ find }\\lim_{x\\to2}\\left(2[f(x)]^2-g(x)\\right).",
        difficulty: 3,
        skillTags: ["limits.limit_laws", "polynomial_limits"],
        choices: ["$10$", "$16$", "$20$", "$22$"],
        correctLetter: "C",
        rationales: {
          A: "This uses $2f-g$ instead of $2f^2-g$.",
          B: "This subtracts 2 instead of subtracting the limit of g, which is -2.",
          D: "This squares after applying the linear combination incorrectly.",
        },
        hints: [
          "Use limit laws before substituting numbers.",
          "The square applies to the limiting value of f.",
          "Compute $2(3)^2-(-2)$.",
        ],
        solution: [
          { step: 1, explanation: "Apply power, constant multiple, and difference laws.", math: "2(\\lim f)^2-\\lim g" },
          { step: 2, explanation: "Substitute the given limits.", math: "2(3)^2-(-2)=18+2=20" },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to c}f(x)=2\\text{ and }\\lim_{x\\to c}g(x)=5,\\text{ find }\\lim_{x\\to c}f(x)(g(x)+1).",
        difficulty: 2,
        skillTags: ["limits.limit_laws", "product_law"],
        choices: ["7", "10", "11", "12"],
        correctLetter: "D",
        rationales: {
          A: "This adds the two basic limits but ignores the product.",
          B: "This computes $2\\cdot5$ but misses the +1.",
          C: "This is an arithmetic slip.",
        },
        hints: [
          "Use the sum law inside the parentheses.",
          "The limit of $g(x)+1$ is $5+1$.",
          "Multiply by the limit of f.",
        ],
        solution: [
          { step: 1, explanation: "Apply sum and product laws.", math: "\\lim f\\cdot(\\lim g+1)" },
          { step: 2, explanation: "Substitute values.", math: "2(5+1)=12" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\lim_{x\\to a}f(x)=2,\\quad \\lim_{x\\to a}g(x)=-3,\\quad \\lim_{x\\to a}h(x)=0",
      difficulty: 3,
      skillTags: ["limits.limit_laws", "quotient_law"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\lim_{x\\to a}(4f(x)+g(x)^2)$.", points: 2 },
        { letter: "b", promptMarkdown: "Find $\\lim_{x\\to a}\\frac{f(x)-g(x)}{f(x)+1}$ and justify that the quotient law applies.", points: 2 },
        { letter: "c", promptMarkdown: "Explain why the given information is not enough to evaluate $\\lim_{x\\to a}\\frac{f(x)}{h(x)}$ using the quotient law.", points: 2 },
      ],
      hints: [
        "Apply each limit law one operation at a time.",
        "For a quotient, check the denominator limit.",
        "A denominator limit of 0 blocks the quotient law.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly applies constant multiple and power laws." },
          { part: "a", points: 1, description: "Computes 17." },
          { part: "b", points: 1, description: "Correctly computes numerator and denominator limits." },
          { part: "b", points: 1, description: "Computes 5/3 and states denominator limit is nonzero." },
          { part: "c", points: 1, description: "Identifies h's limit as 0." },
          { part: "c", points: 1, description: "Explains quotient law cannot be applied when denominator limit is 0." },
        ],
      },
      commonErrors: [
        "Forgetting to square the limit of g in part (a).",
        "Using the quotient law without checking the denominator.",
        "Saying a quotient with denominator approaching 0 must equal 0.",
      ],
      workedSolution: [
        { part: "a", explanation: "$4\\lim f+(\\lim g)^2=4(2)+(-3)^2=8+9=17$." },
        { part: "b", explanation: "The numerator limit is $2-(-3)=5$ and denominator limit is $2+1=3\\ne0$, so the quotient limit is $5/3$." },
        { part: "c", explanation: "The denominator limit is $\\lim h(x)=0$, so the quotient law does not apply. More information about how h approaches 0 would be needed." },
      ],
    },
  },
  {
    topicCode: "1.6",
    title: "Determining Limits Using Algebraic Manipulation",
    subtopic:
      "Factoring, conjugates, expansion, and complex fractions for indeterminate forms",
    mc: [
      {
        questionLatex: "\\lim_{x\\to3}\\frac{x^2-9}{x-3}",
        difficulty: 2,
        skillTags: ["limits.algebraic_manipulation", "factoring.difference_of_squares"],
        commonMisconceptions: ["zero_over_zero_equals_zero", "indeterminate_means_dne"],
        choices: ["0", "6", "Does not exist", "3"],
        correctLetter: "B",
        rationales: {
          A: "$0/0$ is indeterminate, not zero.",
          C: "The indeterminate form can be resolved by factoring.",
          D: "This misses the $+3$ after cancellation.",
        },
        hints: [
          "Direct substitution gives $0/0$.",
          "Factor the numerator as a difference of squares.",
          "Cancel the common factor before substituting.",
        ],
        solution: [
          { step: 1, explanation: "Factor the numerator.", math: "x^2-9=(x-3)(x+3)" },
          { step: 2, explanation: "Cancel and evaluate.", math: "\\lim_{x\\to3}(x+3)=6" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to-2}\\frac{x^2+5x+6}{x+2}",
        difficulty: 2,
        skillTags: ["limits.algebraic_manipulation", "factoring.quadratic"],
        choices: ["$-1$", "0", "1", "Undefined"],
        correctLetter: "C",
        rationales: {
          A: "This is a sign error after factoring.",
          B: "$0/0$ is indeterminate, not zero.",
          D: "The function value is undefined, but the limit exists.",
        },
        hints: [
          "Direct substitution gives $0/0$.",
          "Factor $x^2+5x+6$.",
          "Cancel $x+2$ and substitute $x=-2$.",
        ],
        solution: [
          { step: 1, explanation: "Factor.", math: "x^2+5x+6=(x+2)(x+3)" },
          { step: 2, explanation: "Cancel and evaluate.", math: "\\lim_{x\\to-2}(x+3)=1" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to4}\\frac{\\sqrt{x}-2}{x-4}",
        difficulty: 3,
        skillTags: ["limits.algebraic_manipulation", "conjugates"],
        choices: ["0", "$\\frac{1}{2}$", "$\\frac{1}{4}$", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "$0/0$ is indeterminate, not zero.",
          B: "This drops the $\\sqrt{x}+2$ denominator after rationalizing.",
          D: "The conjugate resolves the indeterminate form.",
        },
        hints: [
          "A radical and $0/0$ suggest using a conjugate.",
          "Multiply by $\\sqrt{x}+2$ over itself.",
          "Cancel $x-4$ and substitute.",
        ],
        solution: [
          { step: 1, explanation: "Multiply by the conjugate.", math: "\\frac{\\sqrt{x}-2}{x-4}\\cdot\\frac{\\sqrt{x}+2}{\\sqrt{x}+2}=\\frac{x-4}{(x-4)(\\sqrt{x}+2)}" },
          { step: 2, explanation: "Cancel and evaluate.", math: "\\frac{1}{\\sqrt{4}+2}=\\frac14" },
        ],
      },
      {
        questionLatex: "\\lim_{h\\to0}\\frac{(3+h)^2-9}{h}",
        difficulty: 3,
        skillTags: ["limits.algebraic_manipulation", "binomial_expansion"],
        choices: ["0", "3", "6", "9"],
        correctLetter: "C",
        rationales: {
          A: "$0/0$ requires simplification.",
          B: "This is half the correct linear coefficient.",
          D: "This forgets to subtract 9 before cancelling.",
        },
        hints: [
          "Expand $(3+h)^2$.",
          "Subtract 9, then factor out h.",
          "Cancel h and let h approach 0.",
        ],
        solution: [
          { step: 1, explanation: "Expand and simplify.", math: "(3+h)^2-9=9+6h+h^2-9=h(6+h)" },
          { step: 2, explanation: "Cancel and evaluate.", math: "\\lim_{h\\to0}(6+h)=6" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to0}\\frac{\\frac{1}{x+2}-\\frac12}{x}",
        difficulty: 4,
        skillTags: ["limits.algebraic_manipulation", "complex_fractions"],
        choices: ["$-\\frac14$", "$-\\frac12$", "0", "$\\frac14$"],
        correctLetter: "A",
        rationales: {
          B: "This misses a factor of 2 in the denominator.",
          C: "$0/0$ must be simplified.",
          D: "This has a sign error in the subtraction.",
        },
        hints: [
          "Combine the fractions in the numerator.",
          "Use common denominator $2(x+2)$.",
          "Cancel the outer x.",
        ],
        solution: [
          { step: 1, explanation: "Combine the inner numerator.", math: "\\frac{1}{x+2}-\\frac12=\\frac{2-(x+2)}{2(x+2)}=\\frac{-x}{2(x+2)}" },
          { step: 2, explanation: "Divide by x and evaluate.", math: "\\lim_{x\\to0}\\frac{-1}{2(x+2)}=-\\frac14" },
        ],
      },
    ],
    frq: {
      questionLatex: "f(x)=\\frac{x^2+2x-8}{x-2}",
      difficulty: 3,
      skillTags: ["limits.algebraic_manipulation", "removable_discontinuity"],
      parts: [
        { letter: "a", promptMarkdown: "Show that direct substitution at $x=2$ gives an indeterminate form.", points: 1 },
        { letter: "b", promptMarkdown: "Evaluate $\\lim_{x\\to2}f(x)$, showing all algebraic steps.", points: 3 },
        { letter: "c", promptMarkdown: "What value should be assigned to $f(2)$ to make the function continuous at $x=2$?", points: 2 },
      ],
      hints: [
        "Substitute x=2 first.",
        "Factor the numerator.",
        "Continuity requires the assigned value to equal the limit.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Shows substitution gives 0/0." },
          { part: "b", points: 1, description: "Factors numerator as (x-2)(x+4)." },
          { part: "b", points: 1, description: "Cancels the common factor for x not equal to 2." },
          { part: "b", points: 1, description: "Evaluates the limit as 6." },
          { part: "c", points: 1, description: "States continuity requires f(2) to equal the limit." },
          { part: "c", points: 1, description: "Assigns f(2)=6." },
        ],
      },
      commonErrors: [
        "Treating 0/0 as zero.",
        "Factoring with the wrong signs.",
        "Assigning any value other than the limit in part (c).",
      ],
      workedSolution: [
        { part: "a", explanation: "At $x=2$, the expression gives $(4+4-8)/(2-2)=0/0$, an indeterminate form." },
        { part: "b", explanation: "$x^2+2x-8=(x-2)(x+4)$, so for $x\\ne2$, $f(x)=x+4$. Therefore $\\lim_{x\\to2}f(x)=6$." },
        { part: "c", explanation: "To make the function continuous at $x=2$, define $f(2)=\\lim_{x\\to2}f(x)=6$." },
      ],
    },
  },
  {
    topicCode: "1.7",
    title: "Selecting Procedures for Determining Limits",
    subtopic:
      "Choosing direct substitution, factoring, conjugates, tables, graphs, or squeeze reasoning",
    mc: [
      {
        questionLatex:
          "\\lim_{x\\to2}\\left(\\frac{x^2-4}{x-2}+3x\\right)",
        difficulty: 3,
        skillTags: ["limits.procedure_selection", "direct_substitution"],
        choices: [
          "Use direct substitution immediately; the expression is undefined, so the limit does not exist",
          "Factor and cancel first; the limit is $10$",
          "Use a conjugate; the limit is $4$",
          "Use squeeze theorem; the limit is $6$",
        ],
        correctLetter: "B",
        rationales: {
          A: "The original expression is undefined at x=2, but a removable factor can still have a limit.",
          C: "There is no radical expression requiring a conjugate.",
          D: "There are no bounding functions involved.",
        },
        hints: [
          "The fraction creates a 0/0 form before simplification.",
          "Factor $x^2-4$.",
          "After cancellation, substitute x=2.",
        ],
        solution: [
          { step: 1, explanation: "Factor the removable part.", math: "\\frac{x^2-4}{x-2}=\\frac{(x-2)(x+2)}{x-2}=x+2" },
          { step: 2, explanation: "Evaluate the simplified expression.", math: "\\lim_{x\\to2}(x+2+3x)=4+6=10" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to5}\\frac{x^2-25}{x-5}",
        difficulty: 2,
        skillTags: ["limits.procedure_selection", "factoring"],
        choices: ["Direct substitution only; limit is 0", "Factor and cancel; limit is 10", "Use a conjugate; limit is 5", "Use squeeze theorem; limit is 0"],
        correctLetter: "B",
        rationales: {
          A: "Direct substitution gives 0/0, so more work is needed.",
          C: "The expression has no radical.",
          D: "Squeeze theorem is not the natural procedure here.",
        },
        hints: [
          "Direct substitution gives $0/0$.",
          "The numerator is a difference of squares.",
          "Cancel $x-5$ before substituting.",
        ],
        solution: [
          { step: 1, explanation: "Factor.", math: "x^2-25=(x-5)(x+5)" },
          { step: 2, explanation: "Cancel and evaluate.", math: "\\lim_{x\\to5}(x+5)=10" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to9}\\frac{\\sqrt{x}-3}{x-9}",
        difficulty: 3,
        skillTags: ["limits.procedure_selection", "conjugates"],
        choices: ["Use a conjugate; limit is $\\frac16$", "Use direct substitution; limit is 0", "Use factoring; limit is 6", "Use IVT; limit is 9"],
        correctLetter: "A",
        rationales: {
          B: "Direct substitution gives 0/0, not 0.",
          C: "The key issue is the radical, not polynomial factoring.",
          D: "The Intermediate Value Theorem is not for evaluating this limit.",
        },
        hints: [
          "The radical and $0/0$ point to a conjugate.",
          "Multiply by $\\sqrt{x}+3$.",
          "Evaluate the resulting reciprocal.",
        ],
        solution: [
          { step: 1, explanation: "Use the conjugate.", math: "\\frac{\\sqrt{x}-3}{x-9}\\cdot\\frac{\\sqrt{x}+3}{\\sqrt{x}+3}=\\frac{1}{\\sqrt{x}+3}" },
          { step: 2, explanation: "Evaluate at x=9.", math: "\\frac{1}{6}" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to0}x^2\\sin\\left(\\frac1x\\right)",
        difficulty: 3,
        skillTags: ["limits.procedure_selection", "squeeze_theorem"],
        choices: ["Direct substitution", "Factoring", "Squeeze theorem", "Quotient law"],
        correctLetter: "C",
        rationales: {
          A: "$\\sin(1/x)$ is not defined at x=0.",
          B: "There is no common algebraic factor to cancel.",
          D: "The expression is not a quotient with known component limits.",
        },
        hints: [
          "$\\sin(1/x)$ oscillates but stays between -1 and 1.",
          "Multiplying by $x^2$ traps the expression between $-x^2$ and $x^2$.",
          "Both bounds approach 0.",
        ],
        solution: [
          { step: 1, explanation: "Use the bound for sine.", math: "-1\\le\\sin(1/x)\\le1" },
          { step: 2, explanation: "Multiply by x^2.", math: "-x^2\\le x^2\\sin(1/x)\\le x^2" },
          { step: 3, explanation: "Both bounds approach 0, so the limit is 0.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{A table shows }f(x)\\text{ approaches }2\\text{ from the left of }a\\text{ and }2\\text{ from the right. Which conclusion is best?}",
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["limits.procedure_selection", "tables"],
        choices: [
          "The table proves $f(a)=2$",
          "The table suggests $\\lim_{x\\to a}f(x)=2$",
          "The two-sided limit cannot exist",
          "A conjugate must be used",
        ],
        correctLetter: "B",
        rationales: {
          A: "Nearby table values do not determine the exact function value.",
          C: "Both sides suggest the same value.",
          D: "A table does not imply conjugate algebra is needed.",
        },
        hints: [
          "Tables provide numerical evidence.",
          "Compare left and right trends.",
          "They both approach 2.",
        ],
        solution: [
          { step: 1, explanation: "The table suggests a common approaching output.", math: null },
          { step: 2, explanation: "Therefore it supports the limit estimate 2.", math: "\\lim_{x\\to a}f(x)\\approx2" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Evaluate each limit and state the procedure you selected.}",
      difficulty: 4,
      skillTags: ["limits.procedure_selection", "mixed_limit_methods"],
      parts: [
        { letter: "a", promptMarkdown: "$\\lim_{x\\to2}(x^2+3x)$", points: 1 },
        { letter: "b", promptMarkdown: "$\\lim_{x\\to4}\\frac{x^2-16}{x-4}$", points: 2 },
        { letter: "c", promptMarkdown: "$\\lim_{x\\to1}\\frac{\\sqrt{x+3}-2}{x-1}$", points: 2 },
        { letter: "d", promptMarkdown: "$\\lim_{x\\to0}x^2\\cos(1/x)$", points: 2 },
      ],
      hints: [
        "Try direct substitution first.",
        "If direct substitution gives $0/0$, inspect the expression type.",
        "Bounded trig times a power of x often uses squeeze theorem.",
      ],
      rubric: {
        maxPoints: 7,
        criteria: [
          { part: "a", points: 1, description: "Uses direct substitution and gets 10." },
          { part: "b", points: 1, description: "Selects factoring/cancellation." },
          { part: "b", points: 1, description: "Gets 8." },
          { part: "c", points: 1, description: "Selects conjugate multiplication." },
          { part: "c", points: 1, description: "Gets 1/4." },
          { part: "d", points: 1, description: "Selects squeeze theorem." },
          { part: "d", points: 1, description: "Gets 0 with valid bounds." },
        ],
      },
      commonErrors: [
        "Trying to force every problem into factoring.",
        "Using direct substitution after getting 0/0.",
        "Forgetting to state the selected procedure.",
      ],
      workedSolution: [
        { part: "a", explanation: "Direct substitution: $2^2+3(2)=10$." },
        { part: "b", explanation: "Factor $x^2-16=(x-4)(x+4)$, cancel, then evaluate $x+4$ at 4 to get 8." },
        { part: "c", explanation: "Use the conjugate: $\\frac{\\sqrt{x+3}-2}{x-1}\\cdot\\frac{\\sqrt{x+3}+2}{\\sqrt{x+3}+2}=\\frac{1}{\\sqrt{x+3}+2}$, so the limit is $1/4$." },
        { part: "d", explanation: "Since $-1\\le\\cos(1/x)\\le1$, $-x^2\\le x^2\\cos(1/x)\\le x^2$. Both bounds approach 0, so the limit is 0." },
      ],
    },
  },
  {
    topicCode: "1.8",
    title: "Determining Limits Using the Squeeze Theorem",
    subtopic:
      "Trapping a function between two functions with the same limiting value",
    mc: [
      {
        questionLatex:
          "\\text{Near }x=2,\\quad 5-(x-2)^2\\le f(x)\\le5+3(x-2)^2.\\quad \\lim_{x\\to2}f(x)=",
        difficulty: 3,
        skillTags: ["limits.squeeze_theorem"],
        choices: ["$2$", "$5$", "$8$", "Cannot be determined"],
        correctLetter: "B",
        rationales: {
          A: "This is the input value, not the squeezed output value.",
          C: "This adds the coefficient 3 to the center value incorrectly.",
          D: "Both bounding functions approach the same value.",
        },
        hints: [
          "Find the limit of the lower bound.",
          "Find the limit of the upper bound.",
          "If both bounds approach the same number, f is squeezed to that number.",
        ],
        solution: [
          { step: 1, explanation: "Evaluate both bounding functions as x approaches 2.", math: "5-(x-2)^2\\to5,\\quad 5+3(x-2)^2\\to5" },
          { step: 2, explanation: "Since f is trapped between bounds with the same limit, the squeeze theorem gives the limit.", math: "\\lim_{x\\to2}f(x)=5" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to0}x^2\\sin\\left(\\frac{5}{x}\\right)",
        difficulty: 2,
        skillTags: ["limits.squeeze_theorem", "bounded_trig"],
        choices: ["$-1$", "0", "1", "Does not exist"],
        correctLetter: "B",
        rationales: {
          A: "The sine expression is bounded, but the multiplier x^2 shrinks to 0.",
          C: "The product is trapped near 0.",
          D: "The oscillation is squeezed by x^2.",
        },
        hints: [
          "Sine is always between -1 and 1.",
          "Multiply the inequality by $x^2\\ge0$.",
          "Both bounds approach 0.",
        ],
        solution: [
          { step: 1, explanation: "Bound the sine term.", math: "-1\\le\\sin(5/x)\\le1" },
          { step: 2, explanation: "Multiply by x^2.", math: "-x^2\\le x^2\\sin(5/x)\\le x^2" },
          { step: 3, explanation: "Both bounds approach 0.", math: null },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to0}x\\cos\\left(\\frac{1}{x}\\right)",
        difficulty: 2,
        skillTags: ["limits.squeeze_theorem", "bounded_trig"],
        choices: ["$-1$", "0", "1", "Does not exist"],
        correctLetter: "B",
        rationales: {
          A: "The cosine term is bounded, but the factor x goes to 0.",
          C: "The product is squeezed toward 0.",
          D: "Although cosine oscillates, the product has a limit.",
        },
        hints: [
          "Use $-1\\le\\cos(1/x)\\le1$.",
          "For x near 0, use $|x\\cos(1/x)|\\le |x|$.",
          "$|x|$ approaches 0.",
        ],
        solution: [
          { step: 1, explanation: "Use absolute value to avoid sign cases.", math: "|x\\cos(1/x)|\\le |x|" },
          { step: 2, explanation: "Since $|x|\\to0$, the product approaches 0.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{If }x^2\\le f(x)\\le |x|\\text{ for }0<|x|<1,\\text{ what is }\\lim_{x\\to0}f(x)?",
        difficulty: 2,
        skillTags: ["limits.squeeze_theorem", "inequality_bounds"],
        choices: ["0", "1", "Does not exist", "Cannot be determined"],
        correctLetter: "A",
        rationales: {
          B: "Both bounds approach 0, not 1.",
          C: "The squeeze theorem gives the limit.",
          D: "The bound limits match, so the limit is determined.",
        },
        hints: [
          "Find the limit of the lower bound.",
          "Find the limit of the upper bound.",
          "Both are 0.",
        ],
        solution: [
          { step: 1, explanation: "The lower and upper bounds both approach 0.", math: "\\lim_{x\\to0}x^2=0,\\quad \\lim_{x\\to0}|x|=0" },
          { step: 2, explanation: "By squeeze theorem, f(x) approaches 0.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{If }1\\le f(x)\\le3\\text{ near }x=0,\\text{ what can be concluded about }\\lim_{x\\to0}f(x)\\text{ by squeeze theorem alone?}",
        difficulty: 3,
        skillTags: ["limits.squeeze_theorem", "theorem_conditions"],
        choices: ["The limit is 1", "The limit is 2", "The limit is 3", "No single limit is forced by these bounds"],
        correctLetter: "D",
        rationales: {
          A: "The lower bound alone does not determine the squeezed function.",
          B: "The average of the bounds is not guaranteed.",
          C: "The upper bound alone does not determine the squeezed function.",
        },
        hints: [
          "Squeeze theorem needs both bounds to approach the same value.",
          "The bounds here are constant but different.",
          "The function could behave many ways between 1 and 3.",
        ],
        solution: [
          { step: 1, explanation: "The lower bound limit is 1 and the upper bound limit is 3.", math: "1\\ne3" },
          { step: 2, explanation: "The squeeze theorem does not force one limit value.", math: null },
        ],
      },
    ],
    frq: {
      questionLatex: "F(x)=x^2\\sin\\left(\\frac{3}{x}\\right),\\quad x\\ne0",
      difficulty: 3,
      skillTags: ["limits.squeeze_theorem", "bounded_trig"],
      parts: [
        { letter: "a", promptMarkdown: "Write an inequality that bounds $\\sin(3/x)$.", points: 1 },
        { letter: "b", promptMarkdown: "Use your inequality to bound $F(x)$ between two simpler functions.", points: 2 },
        { letter: "c", promptMarkdown: "Use the squeeze theorem to evaluate $\\lim_{x\\to0}F(x)$.", points: 2 },
      ],
      hints: [
        "Sine is always between -1 and 1.",
        "Since $x^2\\ge0$, multiplying preserves inequality order.",
        "Take the limits of the two bounds.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "States -1 <= sin(3/x) <= 1." },
          { part: "b", points: 1, description: "Correctly multiplies by x^2." },
          { part: "b", points: 1, description: "Gives -x^2 <= F(x) <= x^2." },
          { part: "c", points: 1, description: "Shows both bounds approach 0." },
          { part: "c", points: 1, description: "Concludes the limit is 0 by squeeze theorem." },
        ],
      },
      commonErrors: [
        "Forgetting that $x^2$ is nonnegative.",
        "Trying to evaluate $\\sin(3/x)$ directly at x=0.",
        "Not naming the squeeze theorem in the conclusion.",
      ],
      workedSolution: [
        { part: "a", explanation: "For all defined inputs, $-1\\le\\sin(3/x)\\le1$." },
        { part: "b", explanation: "Because $x^2\\ge0$, multiplying gives $-x^2\\le x^2\\sin(3/x)\\le x^2$." },
        { part: "c", explanation: "Both $-x^2$ and $x^2$ approach 0 as $x\\to0$, so by the squeeze theorem $\\lim_{x\\to0}F(x)=0$." },
      ],
    },
  },
  {
    topicCode: "1.9",
    title: "Connecting Multiple Representations of Limits",
    subtopic:
      "Reconciling formula, graph, table, and verbal evidence about the same limit",
    mc: [
      {
        questionLatex:
          "f(x)=\\frac{x^2-x-6}{x-3}.\\ \\text{Use the graph shown. }\\lim_{x\\to3}f(x)=?",
        difficulty: 2,
        skillTags: ["limits.multiple_representations", "removable_discontinuity"],
        figure: holeAtThreeFiveFigure,
        choices: ["0", "3", "5", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "$0/0$ is not the limit value after simplification.",
          B: "3 is the input value.",
          D: "A hole can still have a limit.",
        },
        hints: [
          "The formula and graph should tell the same approaching y-value.",
          "Factor the numerator.",
          "The hole's y-value is the limit.",
        ],
        solution: [
          { step: 1, explanation: "Factor and cancel.", math: "\\frac{(x-3)(x+2)}{x-3}=x+2" },
          { step: 2, explanation: "Evaluate near x=3.", math: "3+2=5" },
        ],
      },
      {
        questionLatex:
          "\\text{A table suggests }\\lim_{x\\to2^-}f(x)=1\\text{ and }\\lim_{x\\to2^+}f(x)=4.\\text{ Use the graph shown. What is }\\lim_{x\\to2}f(x)?",
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["limits.multiple_representations", "jump_discontinuity"],
        figure: jumpAtTwoOneFourFigure,
        choices: ["1", "2.5", "4", "Does not exist"],
        correctLetter: "D",
        rationales: {
          A: "This uses only the left-hand side.",
          B: "A two-sided limit is not the average of a jump.",
          C: "This uses only the right-hand side.",
        },
        hints: [
          "Use the one-sided limits from the representations.",
          "They must agree for a two-sided limit.",
          "Here they do not agree.",
        ],
        solution: [
          { step: 1, explanation: "The left and right limits differ.", math: "1\\ne4" },
          { step: 2, explanation: "So the two-sided limit does not exist.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{The expression }\\frac{s(4+h)-s(4)}{h}\\text{ approaches }12\\text{ as }h\\to0.\\text{ In words, this means }?",
        difficulty: 2,
        skillTags: ["limits.multiple_representations", "rates_of_change"],
        choices: [
          "The value of s at 4 is 12",
          "The instantaneous rate of change of s at 4 is 12",
          "The average value of s is 12",
          "h must equal 12",
        ],
        correctLetter: "B",
        rationales: {
          A: "The expression is a difference quotient, not the function value.",
          C: "Average value is a different concept from average rate.",
          D: "h approaches 0, not 12.",
        },
        hints: [
          "Recognize the difference quotient.",
          "As h approaches 0, average rates approach an instantaneous rate.",
          "The limit value is 12.",
        ],
        solution: [
          { step: 1, explanation: "The expression is a secant slope from 4 to 4+h.", math: null },
          { step: 2, explanation: "Its limiting value is the instantaneous rate at 4.", math: "12" },
        ],
      },
      {
        questionLatex:
          "\\text{The formula }f(x)=\\frac{x^2-4}{x-2}\\text{ and the graph shown describe the same function near }x=2.\\text{ Which y-value should the representations approach?}",
        difficulty: 2,
        skillTags: ["limits.multiple_representations", "factoring"],
        figure: holeAtTwoFourFigure,
        choices: ["0", "2", "4", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "Direct substitution gives 0/0, not the limit.",
          B: "2 is the x-value being approached.",
          D: "The removable discontinuity has a finite limit.",
        },
        hints: [
          "Simplify the formula.",
          "Factor $x^2-4$.",
          "The simplified expression approaches $x+2$.",
        ],
        solution: [
          { step: 1, explanation: "Simplify for x not equal to 2.", math: "\\frac{(x-2)(x+2)}{x-2}=x+2" },
          { step: 2, explanation: "Evaluate the simplified form at x=2.", math: "4" },
        ],
      },
      {
        questionLatex:
          "\\text{Which representation best confirms a suspected vertical asymptote at }x=1?",
        difficulty: 2,
        skillTags: ["limits.multiple_representations", "vertical_asymptotes"],
        choices: [
          "A table where f(x) stays near 3 on both sides of 1",
          "A graph where f(x) grows without bound near x=1",
          "A formula where f(1)=0 and nearby values stay finite",
          "A filled point at (1,4)",
        ],
        correctLetter: "B",
        rationales: {
          A: "Values staying near a finite number do not suggest a vertical asymptote.",
          C: "A finite nearby pattern does not suggest unbounded behavior.",
          D: "A single filled point does not confirm vertical asymptote behavior.",
        },
        hints: [
          "A vertical asymptote is about unbounded output behavior.",
          "Look for y-values becoming extremely large in magnitude.",
          "A graph can show this visually near x=1.",
        ],
        solution: [
          { step: 1, explanation: "Vertical asymptotes correspond to infinite limits.", math: null },
          { step: 2, explanation: "The graph showing growth without bound confirms that behavior.", math: null },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\frac{x^2-5x+6}{x-2}\\quad\\text{and a table near }x=2\\text{ shows values near }-1.",
      difficulty: 3,
      skillTags: ["limits.multiple_representations", "algebraic_manipulation"],
      parts: [
        { letter: "a", promptMarkdown: "Use algebra to evaluate $\\lim_{x\\to2}f(x)$.", points: 2 },
        { letter: "b", promptMarkdown: "Explain why a graph should show a hole at $x=2$ rather than a jump.", points: 2 },
        { letter: "c", promptMarkdown: "Explain how the table evidence supports your answer in part (a).", points: 1 },
      ],
      hints: [
        "Factor the numerator.",
        "A cancelled factor creates a removable discontinuity.",
        "The table should approach the same y-value as the simplified formula.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Correctly factors numerator as (x-2)(x-3)." },
          { part: "a", points: 1, description: "Cancels and gets limit -1." },
          { part: "b", points: 1, description: "Explains the factor x-2 cancels for x not equal to 2." },
          { part: "b", points: 1, description: "Identifies the discontinuity as removable/a hole." },
          { part: "c", points: 1, description: "Connects table values near -1 to the algebraic limit." },
        ],
      },
      commonErrors: [
        "Using f(2) even though the original formula is undefined there.",
        "Calling every undefined point a vertical asymptote.",
        "Treating table evidence as unrelated to algebra.",
      ],
      workedSolution: [
        { part: "a", explanation: "$x^2-5x+6=(x-2)(x-3)$, so for $x\\ne2$, $f(x)=x-3$. Therefore $\\lim_{x\\to2}f(x)=-1$." },
        { part: "b", explanation: "The same factor $x-2$ appears in numerator and denominator, so the discontinuity at x=2 is removable. The graph should follow the line $y=x-3$ with a hole at $(2,-1)$." },
        { part: "c", explanation: "Values near x=2 should be near $2-3=-1$, matching the table's trend." },
      ],
    },
  },
  {
    topicCode: "1.10",
    title: "Exploring Types of Discontinuities",
    subtopic:
      "Distinguishing removable, jump, infinite, and oscillatory discontinuities",
    mc: [
      {
        questionLatex:
          "f(x)=\\frac{x^2-4}{x-2}\\text{ for }x\\ne2\\text{, and }f(2)\\text{ is undefined. Which description is correct at }x=2?",
        difficulty: 2,
        skillTags: ["discontinuity.types", "removable_discontinuity"],
        choices: [
          "Removable discontinuity; the missing value should be $4$",
          "Jump discontinuity; the one-sided limits are different",
          "Infinite discontinuity; there is a vertical asymptote at $x=2$",
          "Oscillatory discontinuity; the values do not settle",
        ],
        correctLetter: "A",
        rationales: {
          B: "After cancellation, both sides approach the same finite value.",
          C: "The factor x-2 cancels, so the nearby behavior is not unbounded.",
          D: "There is no oscillating expression here.",
        },
        hints: [
          "Factor the numerator.",
          "Cancel the common factor for x not equal to 2.",
          "Evaluate the simplified expression at x=2.",
        ],
        solution: [
          { step: 1, explanation: "Simplify away the removable factor.", math: "\\frac{x^2-4}{x-2}=\\frac{(x-2)(x+2)}{x-2}=x+2" },
          { step: 2, explanation: "The finite limit is 4, so the discontinuity is removable.", math: "\\lim_{x\\to2}f(x)=4" },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}x+1,&x<0\\\\7,&x=0\\\\x+4,&x>0\\end{cases}\\quad\\text{Which description is correct at }x=0?",
        difficulty: 2,
        skillTags: ["discontinuity.types", "jump_discontinuity"],
        choices: [
          "Removable discontinuity because $f(0)$ can be changed to $7$",
          "Jump discontinuity because the one-sided limits are $1$ and $4$",
          "Infinite discontinuity because $f(0)=7$",
          "No discontinuity because $f(0)$ is defined",
        ],
        correctLetter: "B",
        rationales: {
          A: "Changing f(0) cannot make the left and right limits match.",
          C: "The nearby values approach finite numbers, not infinity.",
          D: "Being defined at the point is not enough for continuity.",
        },
        hints: [
          "Compute the left-hand limit from $x+1$.",
          "Compute the right-hand limit from $x+4$.",
          "Finite but unequal one-sided limits make a jump.",
        ],
        solution: [
          { step: 1, explanation: "The two one-sided limits are finite but different.", math: "\\lim_{x\\to0^-}f(x)=1,\\quad \\lim_{x\\to0^+}f(x)=4" },
          { step: 2, explanation: "Because the one-sided limits differ, the discontinuity is a jump.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\lim_{x\\to3^+}f(x)=\\infty\\text{ and }\\lim_{x\\to3^-}f(x)=-\\infty,\\text{ what discontinuity occurs at }x=3?",
        difficulty: 2,
        skillTags: ["discontinuity.types", "infinite_limits"],
        choices: ["Removable", "Jump", "Infinite", "Continuous"],
        correctLetter: "C",
        rationales: {
          A: "The behavior is unbounded, so one point cannot patch it.",
          B: "A jump has finite one-sided limits.",
          D: "Infinite one-sided behavior is not continuity.",
        },
        hints: [
          "Look for unbounded behavior.",
          "The function values grow without bound in magnitude.",
          "This corresponds to a vertical asymptote.",
        ],
        solution: [
          { step: 1, explanation: "At least one side is unbounded.", math: null },
          { step: 2, explanation: "The discontinuity is infinite.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{Which function has a removable discontinuity at }x=1?",
        difficulty: 2,
        skillTags: ["discontinuity.types", "algebraic_removable"],
        choices: [
          "$\\frac{x^2-1}{x-1}$",
          "$\\frac{1}{x-1}$",
          "$\\begin{cases}0,&x<1\\\\2,&x\\ge1\\end{cases}$",
          "$\\sin\\left(\\frac{1}{x-1}\\right)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This has an infinite discontinuity at x=1.",
          C: "This has a jump at x=1.",
          D: "This oscillates near x=1.",
        },
        hints: [
          "A removable discontinuity often has a common factor.",
          "Factor $x^2-1$.",
          "The factor $x-1$ cancels.",
        ],
        solution: [
          { step: 1, explanation: "Factor option A.", math: "\\frac{x^2-1}{x-1}=\\frac{(x-1)(x+1)}{x-1}" },
          { step: 2, explanation: "After cancellation, a hole remains at x=1.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{A function has no limit at }x=0\\text{ because it keeps oscillating between }-1\\text{ and }1\\text{ infinitely often. What type is this?}",
        difficulty: 2,
        skillTags: ["discontinuity.types", "oscillatory_behavior"],
        choices: ["Removable", "Jump", "Infinite", "Oscillatory"],
        correctLetter: "D",
        rationales: {
          A: "There is no single finite limit to patch.",
          B: "A jump has finite left and right limits.",
          C: "The values stay bounded between -1 and 1.",
        },
        hints: [
          "The key word is oscillating.",
          "The values do not settle to one y-value.",
          "The behavior is bounded but non-convergent.",
        ],
        solution: [
          { step: 1, explanation: "The function keeps oscillating and does not approach one value.", math: null },
          { step: 2, explanation: "That is an oscillatory discontinuity.", math: null },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Use the graph of }f\\text{ shown.}",
      difficulty: 3,
      skillTags: ["discontinuity.types", "one_sided_limits"],
      figure: discontinuitiesAtMinusOneZeroFourFigure,
      parts: [
        { letter: "a", promptMarkdown: "Classify the discontinuity at $x=-1$ and give the limit there.", points: 2 },
        { letter: "b", promptMarkdown: "Classify the discontinuity at $x=0$ and explain why the two-sided limit fails.", points: 2 },
        { letter: "c", promptMarkdown: "Classify the discontinuity at $x=4$ and name the related graph feature.", points: 2 },
      ],
      hints: [
        "A hole with a finite limiting value is removable.",
        "Different finite one-sided limits make a jump.",
        "Unbounded behavior corresponds to a vertical asymptote.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Classifies x=-1 as removable." },
          { part: "a", points: 1, description: "Gives limit 2." },
          { part: "b", points: 1, description: "Classifies x=0 as jump." },
          { part: "b", points: 1, description: "Explains one-sided limits 3 and -2 differ." },
          { part: "c", points: 1, description: "Classifies x=4 as infinite discontinuity." },
          { part: "c", points: 1, description: "Names vertical asymptote." },
        ],
      },
      commonErrors: [
        "Calling all discontinuities holes.",
        "Ignoring one-sided limits in a jump.",
        "Confusing infinite discontinuity with oscillatory behavior.",
      ],
      workedSolution: [
        { part: "a", explanation: "At $x=-1$, a hole at finite y-value 2 means a removable discontinuity, and $\\lim_{x\\to-1}f(x)=2$." },
        { part: "b", explanation: "At $x=0$, the one-sided limits are finite but different: 3 and -2. This is a jump discontinuity, and the two-sided limit does not exist." },
        { part: "c", explanation: "At $x=4$, values grow without bound, so the discontinuity is infinite and the graph has a vertical asymptote at $x=4$." },
      ],
    },
  },
  {
    topicCode: "1.11",
    title: "Defining Continuity at a Point",
    subtopic:
      "Checking the three point-continuity conditions: defined value, existing limit, and equality",
    mc: [
      {
        questionLatex:
          "\\text{At }x=a,\\ \\lim_{x\\to a^-}f(x)=3,\\ \\lim_{x\\to a^+}f(x)=3,\\text{ and }f(a)=5.\\text{ Which continuity condition fails?}",
        difficulty: 2,
        skillTags: ["continuity.point_definition"],
        choices: [
          "$f(a)$ is defined",
          "$\\lim_{x\\to a}f(x)$ exists",
          "$\\lim_{x\\to a}f(x)=f(a)$",
          "The left-hand and right-hand limits match",
        ],
        correctLetter: "C",
        rationales: {
          A: "f(a)=5, so the function value is defined.",
          B: "The one-sided limits match, so the two-sided limit exists.",
          D: "Both one-sided limits equal 3.",
        },
        hints: [
          "First decide whether the two-sided limit exists.",
          "Then compare that limit with f(a).",
          "The limit is 3, while the function value is 5.",
        ],
        solution: [
          { step: 1, explanation: "The matching one-sided limits make the two-sided limit exist.", math: "\\lim_{x\\to a}f(x)=3" },
          { step: 2, explanation: "Continuity fails because the limit does not equal the function value.", math: "3\\ne5" },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}x^2+1,&x\\ne2\\\\k,&x=2\\end{cases}\\quad \\text{What value of }k\\text{ makes }f\\text{ continuous at }x=2?",
        difficulty: 2,
        skillTags: ["continuity.point_definition", "removable_discontinuity"],
        choices: ["2", "3", "5", "Cannot be made continuous"],
        correctLetter: "C",
        rationales: {
          A: "This uses the input value, not the limiting output.",
          B: "This is an arithmetic error.",
          D: "A removable point can be patched by defining k as the limit.",
        },
        hints: [
          "Continuity requires $k=\\lim_{x\\to2}(x^2+1)$.",
          "Evaluate $2^2+1$.",
          "Set the point value equal to the limit.",
        ],
        solution: [
          { step: 1, explanation: "Find the limit of the surrounding formula.", math: "\\lim_{x\\to2}(x^2+1)=5" },
          { step: 2, explanation: "Set k equal to 5.", math: "k=5" },
        ],
      },
      {
        questionLatex:
          "\\text{For }p(x)=x^4-3x+1,\\text{ which statement correctly verifies continuity at }x=-1?",
        difficulty: 2,
        skillTags: ["continuity.point_definition", "polynomial_continuity"],
        choices: [
          "$\\lim_{x\\to-1}p(x)=p(-1)=5$",
          "$\\lim_{x\\to-1}p(x)=0\\text{ because }x+1\\to0$",
          "$p\\text{ is discontinuous unless }p(-1)=0$",
          "Continuity cannot be determined without a graph",
        ],
        correctLetter: "A",
        rationales: {
          B: "There is no factor x+1 in the denominator; direct substitution is valid.",
          C: "A continuous function need not have value 0.",
          D: "Polynomial continuity and direct substitution are enough.",
        },
        hints: [
          "Polynomials are continuous where they are defined.",
          "Use direct substitution at x=-1.",
          "Compare the limit with p(-1).",
        ],
        solution: [
          { step: 1, explanation: "Evaluate the polynomial at x=-1.", math: "p(-1)=(-1)^4-3(-1)+1=5" },
          { step: 2, explanation: "Because p is a polynomial, the limit equals the function value.", math: "\\lim_{x\\to-1}p(x)=p(-1)=5" },
        ],
      },
      {
        questionLatex:
          "f(x)=\\frac{1}{x-4}.\\ \\text{Which continuity condition fails at }x=4?",
        difficulty: 2,
        skillTags: ["continuity.point_definition", "domain_restrictions"],
        choices: [
          "$f(4)$ is not defined",
          "The limit equals the function value",
          "$f$ is a polynomial",
          "No condition fails",
        ],
        correctLetter: "A",
        rationales: {
          B: "There is no defined f(4) to equal a limit.",
          C: "The function is rational, not polynomial.",
          D: "Division by zero prevents continuity at x=4.",
        },
        hints: [
          "Check whether the function value exists.",
          "Substitute x=4 into the denominator.",
          "Division by zero is undefined.",
        ],
        solution: [
          { step: 1, explanation: "At x=4, the denominator is zero.", math: "4-4=0" },
          { step: 2, explanation: "So f(4) is undefined and continuity fails.", math: null },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}\\frac{x^2-9}{x-3},&x\\ne3\\\\6,&x=3\\end{cases}\\quad\\text{Which statement is true at }x=3?",
        difficulty: 3,
        skillTags: ["continuity.point_definition"],
        choices: [
          "$f$ is continuous because the surrounding limit and f(3) are both 6",
          "$f$ has a jump because the original fraction is 0/0",
          "$f$ has a vertical asymptote because the denominator is 0 at x=3",
          "$f$ is discontinuous because rational expressions can never be patched",
        ],
        correctLetter: "A",
        rationales: {
          B: "After cancellation, both sides approach the same value.",
          C: "The zero denominator comes from a removable factor, not an uncancelled asymptote.",
          D: "A removable discontinuity can be patched by defining the point value as the limit.",
        },
        hints: [
          "Factor the numerator.",
          "Find the limit of the simplified expression as x approaches 3.",
          "Compare that limit with the defined value f(3).",
        ],
        solution: [
          { step: 1, explanation: "Simplify the expression for x not equal to 3.", math: "\\frac{x^2-9}{x-3}=\\frac{(x-3)(x+3)}{x-3}=x+3" },
          { step: 2, explanation: "The limit equals the defined point value.", math: "\\lim_{x\\to3}f(x)=6=f(3)" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\begin{cases}2x+k,&x<3\\\\10,&x=3\\\\x^2+1,&x>3\\end{cases}",
      difficulty: 3,
      skillTags: ["continuity.point_definition", "piecewise_functions"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\lim_{x\\to3^-}f(x)$ in terms of $k$.", points: 1 },
        { letter: "b", promptMarkdown: "Find $\\lim_{x\\to3^+}f(x)$.", points: 1 },
        { letter: "c", promptMarkdown: "Find the value of $k$ that makes $f$ continuous at $x=3$, or explain why none exists.", points: 3 },
      ],
      hints: [
        "Use the left branch for the left-hand limit.",
        "Use the right branch for the right-hand limit.",
        "Continuity also requires the common limit to equal f(3).",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Computes left-hand limit as 6+k." },
          { part: "b", points: 1, description: "Computes right-hand limit as 10." },
          { part: "c", points: 1, description: "Sets 6+k equal to 10 for matching one-sided limits." },
          { part: "c", points: 1, description: "Finds k=4." },
          { part: "c", points: 1, description: "Checks the common limit equals f(3)=10." },
        ],
      },
      commonErrors: [
        "Matching only one side to f(3).",
        "Forgetting that the right-hand limit is 10.",
        "Solving for k but not checking continuity conditions.",
      ],
      workedSolution: [
        { part: "a", explanation: "From the left branch, $\\lim_{x\\to3^-}f(x)=2(3)+k=6+k$." },
        { part: "b", explanation: "From the right branch, $\\lim_{x\\to3^+}f(x)=3^2+1=10$." },
        { part: "c", explanation: "For continuity, the one-sided limits must equal each other and equal $f(3)=10$. Set $6+k=10$, so $k=4$. Then the common limit is 10, matching $f(3)$." },
      ],
    },
  },
  {
    topicCode: "1.12",
    title: "Confirming Continuity over an Interval",
    subtopic:
      "Determining intervals where standard and piecewise functions are continuous",
    mc: [
      {
        questionLatex:
          "\\text{On which interval is }f(x)=\\frac{x+1}{x-2}\\text{ continuous?}",
        difficulty: 2,
        skillTags: ["continuity.intervals", "rational_functions"],
        choices: ["$(-\\infty,\\infty)$", "$(-\\infty,2)$ only", "$(2,\\infty)$ only", "$(-\\infty,2)\\cup(2,\\infty)$"],
        correctLetter: "D",
        rationales: {
          A: "The denominator is zero at x=2.",
          B: "The function is also continuous to the right of 2.",
          C: "The function is also continuous to the left of 2.",
        },
        hints: [
          "Rational functions are continuous where their denominators are nonzero.",
          "Find where $x-2=0$.",
          "Exclude x=2 from the real line.",
        ],
        solution: [
          { step: 1, explanation: "The denominator is zero at x=2.", math: "x-2=0" },
          { step: 2, explanation: "So the function is continuous on intervals excluding 2.", math: "(-\\infty,2)\\cup(2,\\infty)" },
        ],
      },
      {
        questionLatex:
          "\\text{Let }F(x)=\\frac{p(x)}{x-1}\\text{ where }p(x)=x^5-4x+7.\\text{ Which interval is guaranteed to be an interval of continuity for }F?",
        difficulty: 3,
        skillTags: ["continuity.intervals", "polynomial_continuity"],
        choices: ["$(-\\infty,1)$", "$(-\\infty,\\infty)$", "$[1,\\infty)$", "No interval"],
        correctLetter: "A",
        rationales: {
          B: "The quotient is not defined at x=1 because of the denominator.",
          C: "This interval includes x=1, where the denominator is zero.",
          D: "The quotient is continuous wherever the denominator is nonzero.",
        },
        hints: [
          "A polynomial is continuous everywhere, but a quotient also needs a nonzero denominator.",
          "Find where $x-1=0$.",
          "Choose an interval that avoids x=1.",
        ],
        solution: [
          { step: 1, explanation: "The numerator is continuous everywhere, but the denominator is zero at x=1.", math: "x-1=0\\Rightarrow x=1" },
          { step: 2, explanation: "The quotient is continuous on intervals that do not include x=1.", math: "(-\\infty,1)" },
        ],
      },
      {
        questionLatex:
          "\\text{The function }r(x)=\\sqrt{5-x}\\text{ is continuous on its domain. What is the domain interval?}",
        difficulty: 2,
        skillTags: ["continuity.intervals", "radical_functions"],
        choices: ["$(-\\infty,5]$", "$[5,\\infty)$", "$(-\\infty,\\infty)$", "$(5,\\infty)$"],
        correctLetter: "A",
        rationales: {
          B: "For $\\sqrt{5-x}$, the radicand must satisfy $5-x\\ge0$.",
          C: "The square root expression is not defined for x>5.",
          D: "The endpoint x=5 is included.",
        },
        hints: [
          "Require the radicand to be nonnegative.",
          "Solve $5-x\\ge0$.",
          "Include the endpoint where the radicand is zero.",
        ],
        solution: [
          { step: 1, explanation: "Set the radicand nonnegative.", math: "5-x\\ge0" },
          { step: 2, explanation: "Solve.", math: "x\\le5" },
          { step: 3, explanation: "The domain interval is $(-\\infty,5]$.", math: null },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}x+2,&x<1\\\\3,&x\\ge1\\end{cases}\\quad \\text{Is }f\\text{ continuous on }(-\\infty,\\infty)?",
        difficulty: 2,
        skillTags: ["continuity.intervals", "piecewise_functions"],
        choices: ["Yes, because both pieces meet at 3", "No, because the left limit at 1 is 1", "No, because f(1) is undefined", "Yes, because all piecewise functions are continuous"],
        correctLetter: "A",
        rationales: {
          B: "The left branch value approaches $1+2=3$, not 1.",
          C: "f(1)=3 from the second branch.",
          D: "Piecewise functions must still be checked at joining points.",
        },
        hints: [
          "Only the join at x=1 needs special checking.",
          "Compute the left-hand limit from x+2.",
          "Compare it with f(1)=3.",
        ],
        solution: [
          { step: 1, explanation: "Left-hand limit at 1 is 3.", math: "\\lim_{x\\to1^-}(x+2)=3" },
          { step: 2, explanation: "Right-hand value and f(1) are also 3.", math: "f(1)=3" },
          { step: 3, explanation: "The function is continuous everywhere.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{Which interval avoids all discontinuities of }f(x)=\\frac{1}{(x+1)(x-4)}?",
        difficulty: 2,
        skillTags: ["continuity.intervals", "rational_functions"],
        choices: ["$(-2,0)$", "$(-2,5)$", "$(-1,4)$", "$[-1,4]$"],
        correctLetter: "C",
        rationales: {
          A: "This interval contains x=-1, where the denominator is zero.",
          B: "This interval contains both x=-1 and x=4.",
          D: "The closed interval includes both discontinuities.",
        },
        hints: [
          "Find where the denominator is zero.",
          "Discontinuities are at x=-1 and x=4.",
          "Choose an interval that contains neither point.",
        ],
        solution: [
          { step: 1, explanation: "The denominator is zero at x=-1 and x=4.", math: null },
          { step: 2, explanation: "The interval $(-1,4)$ avoids both endpoints and contains no zero of the denominator.", math: null },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\frac{\\sqrt{x+3}}{x^2-9}",
      difficulty: 3,
      skillTags: ["continuity.intervals", "domain_analysis"],
      parts: [
        { letter: "a", promptMarkdown: "Find the domain of $f$.", points: 2 },
        { letter: "b", promptMarkdown: "State the intervals on which $f$ is continuous.", points: 2 },
        { letter: "c", promptMarkdown: "Explain why $x=-3$ is excluded even though the square root is defined there.", points: 1 },
      ],
      hints: [
        "Check the square root and the denominator.",
        "The radicand requires $x+3\\ge0$.",
        "The denominator cannot be zero.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Identifies radical condition x >= -3." },
          { part: "a", points: 1, description: "Identifies denominator zeros x = -3 and x = 3, and excludes them." },
          { part: "b", points: 2, description: "States intervals of continuity as (-3,3) and (3,infinity)." },
          { part: "c", points: 1, description: "Explains denominator is zero at x=-3." },
        ],
      },
      commonErrors: [
        "Including x=-3 because the square root equals 0 there.",
        "Forgetting to exclude x=3.",
        "Writing one interval across x=3.",
      ],
      workedSolution: [
        { part: "a", explanation: "The square root requires $x\\ge-3$. The denominator $x^2-9=(x-3)(x+3)$ cannot be zero, so exclude $x=-3$ and $x=3$. The domain is $(-3,3)\\cup(3,\\infty)$." },
        { part: "b", explanation: "A quotient of continuous functions is continuous wherever it is defined, so $f$ is continuous on $(-3,3)$ and $(3,\\infty)$." },
        { part: "c", explanation: "At $x=-3$, the numerator is defined as 0, but the denominator is also 0, so the whole quotient is undefined." },
      ],
    },
  },
  {
    topicCode: "1.13",
    title: "Removing Discontinuities",
    subtopic:
      "Redefining point values to patch removable discontinuities when possible",
    mc: [
      {
        questionLatex:
          "f(x)=\\frac{x^2-4}{x-2},\\ x\\ne2.\\ \\text{What value should be assigned to }f(2)\\text{ to remove the discontinuity?}",
        difficulty: 2,
        skillTags: ["continuity.removing_discontinuities", "factoring"],
        choices: ["0", "2", "4", "Cannot be removed"],
        correctLetter: "C",
        rationales: {
          A: "$0/0$ is not the patched value.",
          B: "2 is the x-value being patched.",
          D: "The common factor cancels, so the discontinuity is removable.",
        },
        hints: [
          "Factor the numerator.",
          "Cancel the common factor.",
          "Evaluate the simplified expression at x=2.",
        ],
        solution: [
          { step: 1, explanation: "Simplify for x not equal to 2.", math: "\\frac{(x-2)(x+2)}{x-2}=x+2" },
          { step: 2, explanation: "Patch with the limit value.", math: "f(2)=2+2=4" },
        ],
      },
      {
        questionLatex:
          "\\text{A function has }\\lim_{x\\to1^-}f(x)=2\\text{ and }\\lim_{x\\to1^+}f(x)=5.\\text{ Can redefining }f(1)\\text{ make it continuous?}",
        difficulty: 2,
        skillTags: ["continuity.removing_discontinuities", "jump_discontinuity"],
        choices: ["Yes, set $f(1)=2$", "Yes, set $f(1)=5$", "Yes, set $f(1)=3.5$", "No, because the two-sided limit does not exist"],
        correctLetter: "D",
        rationales: {
          A: "This fixes only the left side.",
          B: "This fixes only the right side.",
          C: "Averaging the sides does not create a two-sided limit.",
        },
        hints: [
          "Redefining one point cannot change nearby left and right behavior.",
          "Continuity requires the two-sided limit to exist.",
          "The one-sided limits are different.",
        ],
        solution: [
          { step: 1, explanation: "The one-sided limits differ.", math: "2\\ne5" },
          { step: 2, explanation: "No single value of f(1) can make the function continuous.", math: null },
        ],
      },
      {
        questionLatex:
          "g(x)=\\frac{x^2+x-6}{x-2},\\ x\\ne2.\\ \\text{Which value removes the discontinuity at }x=2?",
        difficulty: 2,
        skillTags: ["continuity.removing_discontinuities", "factoring"],
        choices: ["$-3$", "0", "5", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "This is the other factor evaluated incorrectly.",
          B: "$0/0$ is not the patch value.",
          D: "The factor x-2 cancels.",
        },
        hints: [
          "Factor $x^2+x-6$.",
          "Cancel the factor causing the hole.",
          "Evaluate the remaining factor at x=2.",
        ],
        solution: [
          { step: 1, explanation: "Factor.", math: "x^2+x-6=(x-2)(x+3)" },
          { step: 2, explanation: "Cancel and evaluate.", math: "2+3=5" },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}\\frac{x^2-1}{x-1},&x\\ne1\\\\k,&x=1\\end{cases}\\quad \\text{Find }k\\text{ for continuity at }x=1.",
        difficulty: 2,
        skillTags: ["continuity.removing_discontinuities", "piecewise_functions"],
        choices: ["0", "1", "2", "No value works"],
        correctLetter: "C",
        rationales: {
          A: "This treats the indeterminate form as zero.",
          B: "This uses the input value.",
          D: "The discontinuity is removable.",
        },
        hints: [
          "Factor $x^2-1$.",
          "Cancel $x-1$.",
          "Set k equal to the limit.",
        ],
        solution: [
          { step: 1, explanation: "Simplify the expression for x not equal to 1.", math: "\\frac{(x-1)(x+1)}{x-1}=x+1" },
          { step: 2, explanation: "Evaluate at x=1.", math: "k=2" },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}\\frac{x^2-9}{x-3},&x\\ne3\\\\k,&x=3\\end{cases}\\quad\\text{Which value of }k\\text{ removes the discontinuity at }x=3?",
        difficulty: 2,
        skillTags: ["continuity.removing_discontinuities", "discontinuity_types"],
        choices: ["$0$", "$3$", "$6$", "No value works"],
        correctLetter: "C",
        rationales: {
          A: "This treats the 0/0 form as a function value.",
          B: "This uses the input value instead of the limiting output.",
          D: "The factor x-3 cancels, so the discontinuity is removable.",
        },
        hints: [
          "Factor the numerator.",
          "Cancel the factor causing the hole.",
          "Set k equal to the limiting value.",
        ],
        solution: [
          { step: 1, explanation: "Simplify the expression for x not equal to 3.", math: "\\frac{x^2-9}{x-3}=x+3" },
          { step: 2, explanation: "Patch the hole with the limit value.", math: "k=\\lim_{x\\to3}(x+3)=6" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\begin{cases}\\frac{x^2+ax+b}{x-1},&x\\ne1\\\\k,&x=1\\end{cases}",
      difficulty: 4,
      skillTags: ["continuity.removing_discontinuities", "parameter_selection"],
      parts: [
        { letter: "a", promptMarkdown: "Find one pair $(a,b)$ such that the expression has a removable discontinuity at $x=1$.", points: 2 },
        { letter: "b", promptMarkdown: "Using your pair, simplify the expression for $x\\ne1$.", points: 2 },
        { letter: "c", promptMarkdown: "Find $k$ so that $f$ is continuous at $x=1$.", points: 2 },
      ],
      hints: [
        "For a removable discontinuity, the numerator must also be zero at x=1.",
        "Choose a numerator with factor x-1.",
        "After cancellation, set k equal to the resulting limit.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Recognizes numerator must have factor x-1." },
          { part: "a", points: 1, description: "Gives a valid pair such as a=1, b=-2." },
          { part: "b", points: 1, description: "Correctly factors numerator for chosen pair." },
          { part: "b", points: 1, description: "Cancels x-1 to get simplified expression." },
          { part: "c", points: 1, description: "Evaluates the simplified expression at x=1." },
          { part: "c", points: 1, description: "Sets k equal to that value." },
        ],
      },
      commonErrors: [
        "Thinking there is only one possible pair.",
        "Choosing a pair where the numerator is not zero at x=1.",
        "Finding k before simplifying the removable factor.",
      ],
      workedSolution: [
        { part: "a", explanation: "One valid choice is numerator $(x-1)(x+2)=x^2+x-2$, so $a=1$ and $b=-2$." },
        { part: "b", explanation: "With that pair, $\\frac{x^2+x-2}{x-1}=\\frac{(x-1)(x+2)}{x-1}=x+2$ for $x\\ne1$." },
        { part: "c", explanation: "The limit as $x\\to1$ is $1+2=3$, so choose $k=3$ for continuity." },
      ],
    },
  },
  {
    topicCode: "1.14",
    title: "Connecting Infinite Limits and Vertical Asymptotes",
    subtopic:
      "Using one-sided infinite limits to identify and describe vertical asymptotes",
    mc: [
      {
        questionLatex: "\\lim_{x\\to2^+}\\frac{1}{x-2}",
        difficulty: 2,
        skillTags: ["limits.infinite_limits", "vertical_asymptotes"],
        choices: ["$-\\infty$", "0", "$\\infty$", "Does not exist with no sign"],
        correctLetter: "C",
        rationales: {
          A: "From the right, x-2 is positive.",
          B: "The denominator approaches 0, so the quotient grows without bound.",
          D: "A one-sided infinite limit can be described with sign.",
        },
        hints: [
          "For x just greater than 2, x-2 is small and positive.",
          "One divided by a tiny positive number is very large positive.",
          "Use positive infinity.",
        ],
        solution: [
          { step: 1, explanation: "As x approaches 2 from the right, denominator approaches 0 positive.", math: "x-2\\to0^+" },
          { step: 2, explanation: "The quotient approaches positive infinity.", math: "\\infty" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to3}\\frac{1}{(x-3)^2}",
        difficulty: 2,
        skillTags: ["limits.infinite_limits", "vertical_asymptotes"],
        choices: ["$-\\infty$", "0", "$\\infty$", "3"],
        correctLetter: "C",
        rationales: {
          A: "The squared denominator is always positive.",
          B: "The denominator approaches zero, so the reciprocal grows.",
          D: "3 is the input value.",
        },
        hints: [
          "The denominator is squared.",
          "From both sides it is small and positive.",
          "The reciprocal grows without bound.",
        ],
        solution: [
          { step: 1, explanation: "$(x-3)^2\\to0^+$ from both sides.", math: null },
          { step: 2, explanation: "Therefore the quotient approaches $\\infty$.", math: null },
        ],
      },
      {
        questionLatex:
          "f(x)=\\frac{x+1}{x^2-4}.\\ \\text{Which x-values are vertical asymptote candidates?}",
        difficulty: 2,
        skillTags: ["limits.infinite_limits", "vertical_asymptotes"],
        choices: ["$x=-1$ only", "$x=2$ only", "$x=-2$ and $x=2$", "No vertical asymptotes"],
        correctLetter: "C",
        rationales: {
          A: "x=-1 makes the numerator zero, not the denominator.",
          B: "x=-2 also makes the denominator zero.",
          D: "The denominator has real zeros.",
        },
        hints: [
          "Vertical asymptote candidates occur where the denominator is zero.",
          "Factor $x^2-4$.",
          "The zeros are x=-2 and x=2.",
        ],
        solution: [
          { step: 1, explanation: "Factor the denominator.", math: "x^2-4=(x-2)(x+2)" },
          { step: 2, explanation: "The denominator is zero at x=2 and x=-2.", math: null },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to1^-}\\frac{2}{x-1}",
        difficulty: 2,
        skillTags: ["limits.infinite_limits", "one_sided_limits"],
        choices: ["$-\\infty$", "$\\infty$", "0", "2"],
        correctLetter: "A",
        rationales: {
          B: "From the left, x-1 is negative.",
          C: "The reciprocal of a tiny number is unbounded, not zero.",
          D: "2 is the numerator, not the limit.",
        },
        hints: [
          "For x just less than 1, x-1 is small negative.",
          "2 divided by a tiny negative number is very large negative.",
          "Use negative infinity.",
        ],
        solution: [
          { step: 1, explanation: "From the left, $x-1\\to0^-$.", math: null },
          { step: 2, explanation: "Thus $2/(x-1)\\to-\\infty$.", math: null },
        ],
      },
      {
        questionLatex:
          "f(x)=\\frac{x+2}{(x-1)^2}.\\quad\\text{Which statement correctly describes the behavior near }x=1?",
        difficulty: 3,
        skillTags: ["limits.infinite_limits", "vertical_asymptotes"],
        choices: [
          "$x=1$ is a vertical asymptote and $f(x)\\to\\infty$ from both sides",
          "$x=1$ is removable because the denominator is squared",
          "$y=1$ is a horizontal asymptote because x approaches 1",
          "$x=1$ is an x-intercept because the denominator is 0",
        ],
        correctLetter: "A",
        rationales: {
          B: "No factor cancels, and the denominator approaches 0.",
          C: "Horizontal asymptotes describe end behavior as x approaches infinity.",
          D: "An x-intercept requires the numerator to be 0 and the function defined.",
        },
        hints: [
          "Check whether the denominator has an uncancelled zero at x=1.",
          "Near x=1, the numerator is positive.",
          "The squared denominator approaches 0 through positive values from both sides.",
        ],
        solution: [
          { step: 1, explanation: "At x=1, the denominator approaches 0 and no factor cancels.", math: "(x-1)^2\\to0^+" },
          { step: 2, explanation: "The numerator approaches 3, so the quotient grows without bound from both sides.", math: "f(x)\\to\\infty" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\frac{x+1}{(x-2)(x+3)}",
      difficulty: 4,
      skillTags: ["limits.infinite_limits", "vertical_asymptotes", "sign_analysis"],
      parts: [
        { letter: "a", promptMarkdown: "Find the vertical asymptotes of $f$.", points: 1 },
        { letter: "b", promptMarkdown: "Determine $\\lim_{x\\to2^-}f(x)$ and $\\lim_{x\\to2^+}f(x)$.", points: 2 },
        { letter: "c", promptMarkdown: "Determine $\\lim_{x\\to-3^-}f(x)$ and $\\lim_{x\\to-3^+}f(x)$.", points: 2 },
      ],
      hints: [
        "Vertical asymptotes occur where uncancelled denominator factors are zero.",
        "Use sign analysis near each factor.",
        "The numerator is finite and nonzero at x=2 and x=-3.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Identifies x=2 and x=-3 as vertical asymptotes." },
          { part: "b", points: 1, description: "Correctly gives limit -infinity from the left of 2." },
          { part: "b", points: 1, description: "Correctly gives limit infinity from the right of 2." },
          { part: "c", points: 1, description: "Correctly gives limit -infinity from the left of -3." },
          { part: "c", points: 1, description: "Correctly gives limit infinity from the right of -3." },
        ],
      },
      commonErrors: [
        "Only listing one vertical asymptote.",
        "Forgetting the numerator sign in sign analysis.",
        "Assuming both sides of every vertical asymptote have the same sign.",
      ],
      workedSolution: [
        { part: "a", explanation: "The denominator is zero at $x=2$ and $x=-3$, and no factor cancels with $x+1$, so both are vertical asymptotes." },
        { part: "b", explanation: "Near x=2, $x+1>0$ and $x+3>0$. From the left, $x-2<0$, so $f(x)\\to-\\infty$. From the right, $x-2>0$, so $f(x)\\to\\infty$." },
        { part: "c", explanation: "Near x=-3, $x+1<0$ and $x-2<0$. From the left, $x+3<0$, so the denominator is positive? Since $(x-2)(x+3)$ is positive and numerator negative, $f(x)\\to-\\infty$. From the right, the denominator is negative and numerator negative, so $f(x)\\to\\infty$." },
      ],
    },
  },
  {
    topicCode: "1.15",
    title: "Connecting Limits at Infinity and Horizontal Asymptotes",
    subtopic:
      "Using end behavior to identify horizontal asymptotes and long-run function values",
    mc: [
      {
        questionLatex: "\\lim_{x\\to\\infty}\\frac{3x^2-1}{2x^2+5}",
        difficulty: 2,
        skillTags: ["limits.at_infinity", "horizontal_asymptotes"],
        choices: ["0", "$\\frac{2}{3}$", "$\\frac{3}{2}$", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "The degrees are equal, so the ratio of leading coefficients applies.",
          B: "This reverses the leading coefficient ratio.",
          D: "The rational function has a finite end behavior limit.",
        },
        hints: [
          "Compare the degrees of numerator and denominator.",
          "They are both degree 2.",
          "Use the ratio of leading coefficients.",
        ],
        solution: [
          { step: 1, explanation: "For equal degrees, use leading coefficients.", math: "\\frac{3}{2}" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to\\infty}\\frac{5x-4}{x^2+1}",
        difficulty: 2,
        skillTags: ["limits.at_infinity", "degree_comparison"],
        choices: ["0", "1", "5", "$\\infty$"],
        correctLetter: "A",
        rationales: {
          B: "The denominator grows faster than the numerator.",
          C: "The leading coefficient alone is not enough when degrees differ.",
          D: "The numerator degree is smaller, so the quotient shrinks.",
        },
        hints: [
          "Compare degrees.",
          "The denominator degree is larger.",
          "The quotient approaches 0.",
        ],
        solution: [
          { step: 1, explanation: "Numerator degree is 1 and denominator degree is 2.", math: null },
          { step: 2, explanation: "The denominator grows faster, so the limit is 0.", math: null },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to\\infty}\\frac{x^3+1}{x^2+1}",
        difficulty: 2,
        skillTags: ["limits.at_infinity", "degree_comparison"],
        choices: ["0", "1", "$\\infty$", "$-\\infty$"],
        correctLetter: "C",
        rationales: {
          A: "The numerator grows faster, so the quotient does not shrink to 0.",
          B: "Equal leading coefficients matter only when degrees are equal.",
          D: "For positive large x, the quotient is positive.",
        },
        hints: [
          "Compare degrees.",
          "The numerator degree is larger by 1.",
          "For large positive x, the expression behaves like x.",
        ],
        solution: [
          { step: 1, explanation: "The expression behaves like $x^3/x^2=x$.", math: null },
          { step: 2, explanation: "As x approaches infinity, x approaches infinity.", math: "\\infty" },
        ],
      },
      {
        questionLatex: "\\lim_{x\\to\\infty}\\frac{\\sqrt{4x^2+1}}{x}",
        difficulty: 4,
        skillTags: ["limits.at_infinity", "radical_end_behavior"],
        choices: ["$-2$", "0", "2", "Does not exist"],
        correctLetter: "C",
        rationales: {
          A: "For x approaching positive infinity, x is positive.",
          B: "The numerator grows like 2x.",
          D: "The end behavior limit exists.",
        },
        hints: [
          "Factor $x^2$ inside the square root.",
          "For x>0, $\\sqrt{x^2}=x$.",
          "The expression approaches $\\sqrt{4}$.",
        ],
        solution: [
          { step: 1, explanation: "Factor inside the radical.", math: "\\frac{\\sqrt{x^2(4+1/x^2)}}{x}" },
          { step: 2, explanation: "For x -> infinity, $\\sqrt{x^2}=x$.", math: "\\sqrt{4+1/x^2}\\to2" },
        ],
      },
      {
        questionLatex:
          "f(x)=\\frac{-4x^2+3x-1}{x^2+5}.\\quad\\text{Which statement describes the right-end behavior of the graph?}",
        difficulty: 3,
        skillTags: ["limits.at_infinity", "horizontal_asymptotes"],
        choices: [
          "$y=-4$ is a horizontal asymptote because the leading coefficient ratio is $-4$",
          "$x=-4$ is a horizontal asymptote because the limit is $-4$",
          "$y=0$ is a horizontal asymptote because the denominator grows without bound",
          "There is no horizontal asymptote because the numerator has lower-degree terms",
        ],
        correctLetter: "A",
        rationales: {
          B: "Horizontal asymptotes are written as y-values, not x-values.",
          C: "The numerator and denominator have the same degree, so the limit is the leading coefficient ratio.",
          D: "Lower-degree terms vanish in the end behavior; they do not prevent an asymptote.",
        },
        hints: [
          "Compare the degrees of numerator and denominator.",
          "For equal degrees, use the ratio of leading coefficients.",
          "Write a horizontal asymptote as y equals the limiting value.",
        ],
        solution: [
          { step: 1, explanation: "The numerator and denominator both have degree 2.", math: "\\lim_{x\\to\\infty}f(x)=\\frac{-4}{1}=-4" },
          { step: 2, explanation: "A finite end-behavior limit gives the horizontal asymptote.", math: "y=-4" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\frac{2x^2-3x+1}{x^2+5}",
      difficulty: 3,
      skillTags: ["limits.at_infinity", "horizontal_asymptotes"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\lim_{x\\to\\infty}f(x)$.", points: 2 },
        { letter: "b", promptMarkdown: "Find $\\lim_{x\\to-\\infty}f(x)$.", points: 2 },
        { letter: "c", promptMarkdown: "State the horizontal asymptote and explain why the same asymptote applies on both ends.", points: 2 },
      ],
      hints: [
        "Compare numerator and denominator degrees.",
        "For equal degrees, use leading coefficients.",
        "The leading terms dominate for both positive and negative infinity.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Identifies equal degrees." },
          { part: "a", points: 1, description: "Computes right-end limit 2." },
          { part: "b", points: 1, description: "Uses leading terms for negative infinity." },
          { part: "b", points: 1, description: "Computes left-end limit 2." },
          { part: "c", points: 1, description: "States horizontal asymptote y=2." },
          { part: "c", points: 1, description: "Explains leading coefficient ratio controls both ends." },
        ],
      },
      commonErrors: [
        "Using lower-degree terms for end behavior.",
        "Reversing the leading coefficient ratio.",
        "Writing the horizontal asymptote as x=2.",
      ],
      workedSolution: [
        { part: "a", explanation: "Both numerator and denominator have degree 2, so the limit as $x\\to\\infty$ is the leading coefficient ratio $2/1=2$." },
        { part: "b", explanation: "The same leading terms dominate as $x\\to-\\infty$, so the limit is also 2." },
        { part: "c", explanation: "Since both end behavior limits equal 2, the horizontal asymptote is $y=2$." },
      ],
    },
  },
  {
    topicCode: "1.16",
    title: "Working with the Intermediate Value Theorem (IVT)",
    subtopic:
      "Using continuity on a closed interval to guarantee values between endpoint outputs",
    mc: [
      {
        questionLatex:
          "\\text{Let }f(x)=x^3+x-1.\\text{ Which IVT statement is justified on }[0,1]?",
        difficulty: 3,
        skillTags: ["continuity.ivt"],
        choices: [
          "There is at least one $c$ in $(0,1)$ with $f(c)=0$",
          "$f$ has exactly one zero in $(0,1)$ by IVT alone",
          "$f(0)=f(1)$, so IVT does not apply",
          "$f$ must have a vertical asymptote in $(0,1)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "IVT guarantees existence, not uniqueness.",
          C: "$f(0)=-1$ and $f(1)=1$, so the endpoint values differ and bracket 0.",
          D: "A polynomial is continuous and has no vertical asymptote.",
        },
        hints: [
          "Check continuity first.",
          "Compute f(0) and f(1).",
          "If 0 lies between the endpoint values, IVT guarantees a root.",
        ],
        solution: [
          { step: 1, explanation: "The polynomial is continuous on [0,1], and the endpoint values bracket 0.", math: "f(0)=-1,\\quad f(1)=1" },
          { step: 2, explanation: "By IVT, there is at least one c in (0,1) where f(c)=0.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{A student wants to use IVT for }f(x)=\\frac{1}{x-2}\\text{ on }[1,3]\\text{ to guarantee }f(c)=0.\\text{ What is the flaw?}",
        difficulty: 3,
        skillTags: ["continuity.ivt", "theorem_conditions"],
        choices: [
          "$f$ is not continuous on $[1,3]$ because it is undefined at $x=2$",
          "$f(1)$ and $f(3)$ are equal, so IVT cannot be used",
          "IVT applies only to polynomials",
          "The interval must be open, not closed",
        ],
        correctLetter: "A",
        rationales: {
          B: "$f(1)=-1$ and $f(3)=1$ are not equal, but the real issue is continuity.",
          C: "IVT applies to any function continuous on the closed interval, not just polynomials.",
          D: "IVT uses continuity on a closed interval.",
        },
        hints: [
          "Before using IVT, check continuity on the whole closed interval.",
          "The denominator is zero inside the interval.",
          "A vertical asymptote breaks the IVT hypothesis.",
        ],
        solution: [
          { step: 1, explanation: "The denominator is zero at an interior point.", math: "x-2=0\\Rightarrow x=2" },
          { step: 2, explanation: "Because f is not continuous on [1,3], IVT cannot be applied on that interval.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{For }f(x)=x^3+x,\\text{ which interval guarantees a solution to }f(x)=5\\text{ by IVT?}",
        difficulty: 2,
        skillTags: ["continuity.ivt", "polynomial_continuity"],
        choices: ["$[0,1]$", "$[1,2]$", "$[2,3]$", "$[-2,-1]$"],
        correctLetter: "B",
        rationales: {
          A: "f(0)=0 and f(1)=2, so 5 is not between them.",
          C: "f(2)=10 and f(3)=30, so 5 is not between them.",
          D: "Both endpoint values are negative, so 5 is not between them.",
        },
        hints: [
          "Compute endpoint values.",
          "Find an interval where 5 lies between f(a) and f(b).",
          "$f(1)=2$ and $f(2)=10$, so 5 is between them.",
        ],
        solution: [
          { step: 1, explanation: "Evaluate endpoints.", math: "f(1)=2,\\quad f(2)=10" },
          { step: 2, explanation: "Since 5 lies between 2 and 10 and f is continuous, IVT guarantees a solution in [1,2].", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{IVT guarantees that a continuous function takes every value between }f(a)\\text{ and }f(b).\\text{ What does it NOT guarantee?}",
        difficulty: 2,
        skillTags: ["continuity.ivt", "theorem_interpretation"],
        choices: [
          "At least one input for each intermediate output",
          "The exact input where the value occurs",
          "Existence of intermediate y-values",
          "A solution when the target lies between endpoint outputs",
        ],
        correctLetter: "B",
        rationales: {
          A: "That is exactly what IVT guarantees.",
          C: "That is the main conclusion of IVT.",
          D: "That is a standard use of IVT.",
        },
        hints: [
          "IVT is an existence theorem.",
          "It tells you something occurs, but not where exactly.",
          "It also does not guarantee uniqueness.",
        ],
        solution: [
          { step: 1, explanation: "IVT guarantees existence of at least one input.", math: null },
          { step: 2, explanation: "It does not identify the exact input value.", math: null },
        ],
      },
      {
        questionLatex:
          "\\text{Suppose }f\\text{ is continuous on }[-2,3],\\ f(-2)=8,\\text{ and }f(3)=-1.\\text{ Which equation is guaranteed to have at least one solution in }[-2,3]?",
        difficulty: 2,
        skillTags: ["continuity.ivt"],
        choices: ["$f(x)=-3$", "$f(x)=0$", "$f(x)=9$", "$f(x)=10$"],
        correctLetter: "B",
        rationales: {
          A: "-3 is below both endpoint values.",
          C: "9 is above both endpoint values.",
          D: "10 is above both endpoint values.",
        },
        hints: [
          "Find values between -1 and 8.",
          "IVT guarantees every output between the endpoint outputs.",
          "0 lies between -1 and 8.",
        ],
        solution: [
          { step: 1, explanation: "Endpoint outputs are -1 and 8.", math: "-1<0<8" },
          { step: 2, explanation: "By IVT, f(c)=0 for some c in [-2,3].", math: null },
        ],
      },
    ],
    frq: {
      questionLatex: "f(x)=x^3+x",
      difficulty: 3,
      skillTags: ["continuity.ivt", "polynomial_continuity"],
      parts: [
        { letter: "a", promptMarkdown: "Explain why $f$ is continuous on $[1,2]$.", points: 1 },
        { letter: "b", promptMarkdown: "Use IVT to show there is a number $c$ in $[1,2]$ such that $f(c)=5$.", points: 3 },
        { letter: "c", promptMarkdown: "Does IVT alone prove that this value of $c$ is unique? Explain.", points: 2 },
      ],
      hints: [
        "Polynomials are continuous everywhere.",
        "Compute $f(1)$ and $f(2)$.",
        "IVT proves existence, not uniqueness.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "States f is a polynomial, hence continuous on [1,2]." },
          { part: "b", points: 1, description: "Computes f(1)=2." },
          { part: "b", points: 1, description: "Computes f(2)=10." },
          { part: "b", points: 1, description: "Notes 5 is between 2 and 10 and applies IVT." },
          { part: "c", points: 1, description: "States IVT alone does not prove uniqueness." },
          { part: "c", points: 1, description: "Explains IVT is an existence theorem." },
        ],
      },
      commonErrors: [
        "Forgetting to verify continuity before applying IVT.",
        "Computing endpoint values incorrectly.",
        "Claiming IVT proves exactly one solution.",
      ],
      workedSolution: [
        { part: "a", explanation: "$f(x)=x^3+x$ is a polynomial, and polynomials are continuous on all real numbers, so f is continuous on $[1,2]$." },
        { part: "b", explanation: "$f(1)=2$ and $f(2)=10$. Since $5$ lies between $2$ and $10$, IVT guarantees at least one $c$ in $[1,2]$ such that $f(c)=5$." },
        { part: "c", explanation: "No. IVT guarantees existence of at least one such c, but it does not by itself prove there is only one." },
      ],
    },
  },
];

export const limitTopics: Topic[] = topicSeeds.map(makeTopic);
