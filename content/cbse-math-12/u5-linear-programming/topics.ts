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
const UNIT = "u5-linear-programming";
const VERSION = "0.2.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
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

function calibrateMcDifficulty(
  seedDifficulty: Difficulty,
  index: number,
): Difficulty {
  return Math.max(
    seedDifficulty,
    MC_DIFFICULTY_FLOORS[index] ?? 2,
  ) as Difficulty;
}

function calibrateConstructedDifficulty(
  seedDifficulty: Difficulty,
  type: ResponseType,
): Difficulty {
  const floor = type === "laq" || type === "case" ? 4 : type === "saq" ? 3 : 2;
  return Math.max(seedDifficulty, floor) as Difficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("terminology") || tags.has("objective_function")) {
    return "Separate the decision variables, objective function, constraints, and non-negativity conditions.";
  }
  if (tags.has("formulation")) {
    return "Translate each resource or requirement sentence into exactly one inequality before optimizing.";
  }
  if (tags.has("feasible_region") || tags.has("graphical_method")) {
    return "Check the correct side of every boundary line and include the non-negative quadrant.";
  }
  if (tags.has("corner_point_method") || tags.has("optimization")) {
    return "Evaluate the objective function at every relevant corner point before choosing the optimum.";
  }
  if (tags.has("bounded_unbounded") || tags.has("multiple_optima")) {
    return "Decide whether the feasible region is bounded and whether the objective line is parallel to an optimal edge.";
  }

  return "Use the exact Linear Programming method required by this CBSE Class 12 topic.";
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
        : (seed.rationales?.[seedLetter] ??
          fallbackWrongRationale(seed, seedLetter)),
      misconceptionTag: isCorrect
        ? null
        : (seed.misconceptionTags?.[seedLetter] ??
          "incorrect_cbse_lpp_reasoning"),
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
  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(
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
      "mixes_up_constraint_objective_or_feasible_region",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(
      seed.difficulty,
      seed.responseType,
    ),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_formulation_graph_or_corner_check",
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

const halfPlaneFigure: ItemFigure = {
  type: "svg",
  title: "Half-plane for a linear constraint",
  description:
    "The boundary line x plus y equals 6 with the feasible side below the line in the first quadrant.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-half-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="70" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-half-axis)"/>
  <line x1="70" y1="300" x2="70" y2="48" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-half-axis)"/>
  <polygon points="70,300 280,300 70,90" fill="#bfdbfe" opacity="0.75"/>
  <line x1="280" y1="300" x2="70" y2="90" stroke="#2563eb" stroke-width="4"/>
  <text x="288" y="306" font-size="14" fill="#475569" font-family="Arial, sans-serif">6</text>
  <text x="54" y="94" font-size="14" fill="#475569" font-family="Arial, sans-serif">6</text>
  <text x="332" y="306" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="78" y="54" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <text x="160" y="180" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">x + y &#8804; 6</text>
</svg>`,
};

const feasibleRegionFigure: ItemFigure = {
  type: "svg",
  title: "Bounded feasible region",
  description:
    "Feasible region for x plus y at most 6, x plus 2y at most 8, and non-negative variables.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-feasible-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="70" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-feasible-axis)"/>
  <line x1="70" y1="300" x2="70" y2="48" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-feasible-axis)"/>
  <polygon points="70,300 280,300 210,230 70,160" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="280" y1="300" x2="70" y2="90" stroke="#2563eb" stroke-width="2" opacity="0.75"/>
  <line x1="350" y1="300" x2="70" y2="160" stroke="#16a34a" stroke-width="2" opacity="0.75"/>
  <circle cx="70" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="280" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="210" cy="230" r="5" fill="#1d4ed8"/>
  <circle cx="70" cy="160" r="5" fill="#1d4ed8"/>
  <text x="76" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,0)</text>
  <text x="266" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(6,0)</text>
  <text x="216" y="226" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(4,2)</text>
  <text x="78" y="156" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,4)</text>
  <text x="336" y="306" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="78" y="54" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const balancedConstraintFigure: ItemFigure = {
  type: "svg",
  title: "Two constraint lines",
  description:
    "Feasible region for 2x plus y at most 8, x plus 2y at most 8, and non-negative variables.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-balanced-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="70" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-balanced-axis)"/>
  <line x1="70" y1="300" x2="70" y2="48" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-balanced-axis)"/>
  <polygon points="70,300 210,300 163,207 70,160" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="210" y1="300" x2="70" y2="20" stroke="#2563eb" stroke-width="2" opacity="0.75"/>
  <line x1="350" y1="300" x2="70" y2="160" stroke="#16a34a" stroke-width="2" opacity="0.75"/>
  <circle cx="70" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="210" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="163" cy="207" r="5" fill="#1d4ed8"/>
  <circle cx="70" cy="160" r="5" fill="#1d4ed8"/>
  <text x="214" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(4,0)</text>
  <text x="168" y="202" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(8/3,8/3)</text>
  <text x="78" y="156" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,4)</text>
</svg>`,
};

const unboundedRegionFigure: ItemFigure = {
  type: "svg",
  title: "Unbounded feasible region",
  description:
    "Unbounded feasible region for x plus y at least 4 with non-negative variables.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-unbounded-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
    <marker id="arrow-u5-unbounded-region" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="70" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-unbounded-axis)"/>
  <line x1="70" y1="300" x2="70" y2="48" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-unbounded-axis)"/>
  <polygon points="70,160 70,55 315,55 315,300 210,300" fill="#bfdbfe" opacity="0.75"/>
  <line x1="70" y1="160" x2="210" y2="300" stroke="#2563eb" stroke-width="4"/>
  <path d="M 190 92 L 250 60" stroke="#2563eb" stroke-width="3" marker-end="url(#arrow-u5-unbounded-region)"/>
  <path d="M 286 222 L 340 190" stroke="#2563eb" stroke-width="3" marker-end="url(#arrow-u5-unbounded-region)"/>
  <text x="214" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(4,0)</text>
  <text x="78" y="156" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,4)</text>
  <text x="230" y="108" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">unbounded</text>
</svg>`,
};

const multipleOptimaFigure: ItemFigure = {
  type: "svg",
  title: "Multiple optimum along an edge",
  description:
    "Triangular feasible region where the objective line is parallel to an optimal boundary edge.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-multiple-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="70" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-multiple-axis)"/>
  <line x1="70" y1="300" x2="70" y2="48" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-multiple-axis)"/>
  <polygon points="70,300 280,300 70,90" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="280" y1="300" x2="70" y2="90" stroke="#dc2626" stroke-width="5"/>
  <line x1="250" y1="275" x2="40" y2="65" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="210" y="278" font-size="14" fill="#991b1b" font-family="Arial, sans-serif">optimal edge</text>
  <text x="284" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(6,0)</text>
  <text x="78" y="86" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,6)</text>
</svg>`,
};

const productionRegionFigure: ItemFigure = {
  type: "svg",
  title: "Production feasible region",
  description:
    "Feasible region for a production problem with constraints x plus y at most 50 and 2x plus 3y at most 120.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-production-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="80" y1="300" x2="360" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-production-axis)"/>
  <line x1="80" y1="300" x2="80" y2="44" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-production-axis)"/>
  <polygon points="80,300 280,300 200,220 80,140" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="280" y1="300" x2="80" y2="100" stroke="#2563eb" stroke-width="2" opacity="0.75"/>
  <line x1="320" y1="300" x2="80" y2="140" stroke="#16a34a" stroke-width="2" opacity="0.75"/>
  <circle cx="80" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="280" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="200" cy="220" r="5" fill="#1d4ed8"/>
  <circle cx="80" cy="140" r="5" fill="#1d4ed8"/>
  <text x="284" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(50,0)</text>
  <text x="206" y="216" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(30,20)</text>
  <text x="88" y="136" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,40)</text>
  <text x="326" y="306" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="88" y="50" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const lppTerminologyFigure: ItemFigure = {
  type: "svg",
  title: "Vocabulary map for an LPP",
  description:
    "A sample feasible region with labels connecting decision variables, constraints, objective function, and optimal solution.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-terms-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="72" y1="300" x2="360" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-terms-axis)"/>
  <line x1="72" y1="300" x2="72" y2="70" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-terms-axis)"/>
  <polygon points="72,300 252,300 192,220 72,160" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="252" y1="300" x2="72" y2="120" stroke="#2563eb" stroke-width="2"/>
  <line x1="312" y1="300" x2="72" y2="160" stroke="#16a34a" stroke-width="2"/>
  <line x1="260" y1="250" x2="135" y2="125" stroke="#f59e0b" stroke-width="2" stroke-dasharray="7 6"/>
  <circle cx="192" cy="220" r="7" fill="#dc2626"/>
  <text x="366" y="306" font-size="14" fill="#475569" font-family="Arial, sans-serif">x: product A</text>
  <text x="82" y="72" font-size="14" fill="#475569" font-family="Arial, sans-serif">y: product B</text>
  <text x="302" y="118" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">constraints make</text>
  <text x="302" y="136" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">the feasible region</text>
  <text x="280" y="250" font-size="14" fill="#b45309" font-family="Arial, sans-serif">objective line</text>
  <text x="204" y="218" font-size="14" fill="#991b1b" font-family="Arial, sans-serif">optimal corner</text>
</svg>`,
};

const applicationProfitFigure: ItemFigure = {
  type: "svg",
  title: "Factory profit feasible region",
  description:
    "Feasible region for 2x plus y at most 100, x plus y at most 80, and non-negative variables.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-profit-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="80" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-profit-axis)"/>
  <line x1="80" y1="300" x2="80" y2="50" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-profit-axis)"/>
  <polygon points="80,300 255,300 150,90 80,20" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="255" y1="300" x2="105" y2="0" stroke="#2563eb" stroke-width="2" opacity="0.75"/>
  <line x1="360" y1="300" x2="80" y2="20" stroke="#16a34a" stroke-width="2" opacity="0.75"/>
  <circle cx="80" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="255" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="150" cy="90" r="5" fill="#dc2626"/>
  <circle cx="80" cy="20" r="5" fill="#1d4ed8"/>
  <text x="258" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(50,0)</text>
  <text x="156" y="86" font-size="14" fill="#991b1b" font-family="Arial, sans-serif">(20,60)</text>
  <text x="88" y="34" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,80)</text>
  <text x="336" y="306" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="88" y="56" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const applicationSaqFigure: ItemFigure = {
  type: "svg",
  title: "Application feasible region",
  description:
    "Feasible region for x plus y at most 10, x plus 2y at most 14, and non-negative variables.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-saq-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="70" y1="300" x2="410" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-saq-axis)"/>
  <line x1="70" y1="300" x2="70" y2="54" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-saq-axis)"/>
  <polygon points="70,300 320,300 220,200 70,125" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="300" x2="70" y2="50" stroke="#2563eb" stroke-width="2" opacity="0.75"/>
  <line x1="420" y1="300" x2="70" y2="125" stroke="#16a34a" stroke-width="2" opacity="0.75"/>
  <circle cx="70" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="320" cy="300" r="5" fill="#1d4ed8"/>
  <circle cx="220" cy="200" r="5" fill="#dc2626"/>
  <circle cx="70" cy="125" r="5" fill="#1d4ed8"/>
  <text x="324" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(10,0)</text>
  <text x="226" y="196" font-size="14" fill="#991b1b" font-family="Arial, sans-serif">(6,4)</text>
  <text x="78" y="122" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,7)</text>
</svg>`,
};

const applicationMinimumFigure: ItemFigure = {
  type: "svg",
  title: "Minimum-cost feasible region",
  description:
    "Unbounded feasible region for x plus y at least 5, 2x plus y at least 8, and non-negative variables.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u5-min-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
    <marker id="arrow-u5-min-region" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="80" y1="300" x2="390" y2="300" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-min-axis)"/>
  <line x1="80" y1="300" x2="80" y2="48" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u5-min-axis)"/>
  <polygon points="80,76 80,42 360,42 360,300 220,300 164,244" fill="#bfdbfe" opacity="0.72"/>
  <line x1="80" y1="160" x2="220" y2="300" stroke="#2563eb" stroke-width="3"/>
  <line x1="80" y1="76" x2="192" y2="300" stroke="#16a34a" stroke-width="3"/>
  <path d="M 230 112 L 288 82" stroke="#2563eb" stroke-width="3" marker-end="url(#arrow-u5-min-region)"/>
  <path d="M 258 244 L 322 214" stroke="#2563eb" stroke-width="3" marker-end="url(#arrow-u5-min-region)"/>
  <circle cx="80" cy="76" r="5" fill="#1d4ed8"/>
  <circle cx="164" cy="244" r="5" fill="#dc2626"/>
  <circle cx="220" cy="300" r="5" fill="#1d4ed8"/>
  <text x="88" y="72" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(0,8)</text>
  <text x="170" y="240" font-size="14" fill="#991b1b" font-family="Arial, sans-serif">(3,2)</text>
  <text x="224" y="318" font-size="14" fill="#1e3a8a" font-family="Arial, sans-serif">(5,0)</text>
  <text x="326" y="306" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="88" y="54" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const machineHoursFigure: ItemFigure = {
  type: "svg",
  title: "Machine-hour constraint",
  description:
    "Two products with machine-hour use and a total machine-hour availability.",
  svg: `
<svg viewBox="0 0 560 240" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="240" rx="12" fill="#f8fafc"/>
  <rect x="78" y="50" width="404" height="126" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="78" y1="92" x2="482" y2="92" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="78" y1="134" x2="482" y2="134" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="220" y1="50" x2="220" y2="176" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="352" y1="50" x2="352" y2="176" stroke="#cbd5e1" stroke-width="2"/>
  <text x="118" y="76" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Item</text>
  <text x="250" y="76" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">A</text>
  <text x="382" y="76" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">B</text>
  <text x="102" y="120" font-size="14" fill="#334155" font-family="Arial, sans-serif">Hours per unit</text>
  <text x="254" y="120" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="386" y="120" font-size="14" fill="#334155" font-family="Arial, sans-serif">3</text>
  <text x="104" y="162" font-size="14" fill="#334155" font-family="Arial, sans-serif">Available</text>
  <text x="250" y="162" font-size="14" fill="#334155" font-family="Arial, sans-serif">120 total hours</text>
</svg>`,
};

const dietTableFigure: ItemFigure = {
  type: "svg",
  title: "Diet data table",
  description: "A diet table showing nutrient units and cost for two foods.",
  svg: `
<svg viewBox="0 0 560 270" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="270" rx="12" fill="#f8fafc"/>
  <rect x="64" y="46" width="432" height="168" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="64" y1="90" x2="496" y2="90" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="208" y1="46" x2="208" y2="214" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="352" y1="46" x2="352" y2="214" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="64" y1="132" x2="496" y2="132" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="64" y1="174" x2="496" y2="174" stroke="#e2e8f0" stroke-width="2"/>
  <text x="114" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Item</text>
  <text x="244" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Food A</text>
  <text x="388" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Food B</text>
  <text x="92" y="118" font-size="14" fill="#334155" font-family="Arial, sans-serif">Protein</text>
  <text x="268" y="118" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="412" y="118" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="100" y="160" font-size="14" fill="#334155" font-family="Arial, sans-serif">Vitamin</text>
  <text x="268" y="160" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="412" y="160" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="108" y="202" font-size="14" fill="#334155" font-family="Arial, sans-serif">Cost</text>
  <text x="264" y="202" font-size="14" fill="#334155" font-family="Arial, sans-serif">6</text>
  <text x="408" y="202" font-size="14" fill="#334155" font-family="Arial, sans-serif">4</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Linear Programming Terminology",
    subtopic:
      "Decision variables, objective function, constraints, feasible solutions, and non-negativity conditions",
    mc: [
      {
        questionLatex:
          "\\text{In the LPP }\\max Z=40x+30y,\\ x+y\\le 80,\\ 2x+y\\le100,\\ x,y\\ge0,\\text{ the objective function is}",
        difficulty: 2,
        skillTags: ["terminology", "objective_function"],
        figure: lppTerminologyFigure,
        choices: ["$x+y\\le80$", "$Z=40x+30y$", "$2x+y\\le100$", "$x,y\\ge0$"],
        correctLetter: "B",
        hints: [
          "The objective function is the expression to be maximized or minimized.",
          "Constraints restrict the possible values.",
          "Here the word $\\max$ identifies the objective.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The expression being maximized is $Z=40x+30y$.",
            math: "Z=40x+30y",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }x\\text{ and }y\\text{ denote numbers of two products, the usual non-negativity restrictions are}",
        difficulty: 2,
        skillTags: ["terminology", "non_negativity"],
        choices: [
          "$x+y\\ge0$",
          "$x\\le0,\\ y\\le0$",
          "$x\\ge0,\\ y\\ge0$",
          "$x-y\\ge0$",
        ],
        correctLetter: "C",
        hints: [
          "Product numbers cannot be negative.",
          "Non-negativity is applied to each decision variable separately.",
          "Write two inequalities.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Numbers of products cannot be negative, so $x\\ge0$ and $y\\ge0$.",
            math: "x\\ge0,\\quad y\\ge0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If at least }20\\text{ items must be produced and }x,y\\text{ are the two item counts, the constraint is}",
        difficulty: 3,
        skillTags: ["formulation", "constraints"],
        choices: ["$x+y\\le20$", "$x+y=20$", "$x+y\\ge20$", "$x-y\\ge20$"],
        correctLetter: "C",
        hints: [
          "The phrase 'at least' means minimum.",
          "A minimum requirement uses $\\ge$.",
          "Total items are $x+y$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "'At least 20' means the total cannot be below 20, so $x+y\\ge20$.",
            math: "x+y\\ge20",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A product }A\\text{ uses }2\\text{ hours and product }B\\text{ uses }3\\text{ hours. If }60\\text{ hours are available, the machine constraint is}",
        difficulty: 3,
        skillTags: ["formulation", "constraints"],
        choices: [
          "$2x+3y\\le60$",
          "$3x+2y\\le60$",
          "$2x+3y\\ge60$",
          "$x+y\\le60$",
        ],
        correctLetter: "A",
        hints: [
          "Multiply each product count by its hour use.",
          "Available hours give an upper limit.",
          "Use $\\le$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Total machine hours used are $2x+3y$, and they cannot exceed $60$.",
            math: "2x+3y\\le60",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which point is feasible for }x+y\\le6,\\ 2x+y\\le7,\\ x\\ge0,\\ y\\ge0?",
        difficulty: 4,
        skillTags: ["feasible_solution", "constraints"],
        choices: ["$(2,3)$", "$(4,3)$", "$(-1,2)$", "$(3,2)$"],
        correctLetter: "A",
        hints: [
          "Substitute each point in all constraints.",
          "A feasible point must satisfy every inequality.",
          "Check non-negativity also.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$(2,3)$ gives $2+3=5\\le6$ and $2(2)+3=7\\le7$, with both coordinates non-negative.",
            math: "(2,3)\\text{ is feasible}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{A shop earns profit Rs. }50\\text{ on each pen set and Rs. }80\\text{ on each calculator. If }x\\text{ and }y\\text{ are the numbers sold, write the profit function.}",
        difficulty: 2,
        skillTags: ["objective_function", "formulation"],
        parts: singlePart("a", "Write the profit function.", 2),
        hints: [
          "Multiply each item count by its profit.",
          "Add the two profit contributions.",
          "Use $P$ or $Z$ for the objective.",
        ],
        rubric: singleRubric("a", 2, "Writes $P=50x+80y$."),
        commonErrors: ["Writing a constraint instead of the profit function."],
        workedSolution: [
          { part: "a", explanation: "Total profit is $P=50x+80y$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{If }x\\text{ and }y\\text{ are numbers of notebooks and files, state the non-negativity constraints.}",
        difficulty: 2,
        skillTags: ["terminology", "non_negativity"],
        parts: singlePart("a", "State the constraints.", 2),
        hints: [
          "Counts cannot be negative.",
          "Apply this to both variables.",
          "Use $\\ge0$.",
        ],
        rubric: singleRubric("a", 2, "States $x\\ge0, y\\ge0$."),
        commonErrors: [
          "Writing only $x+y\\ge0$, which is weaker than both counts being non-negative.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since both variables count items, $x\\ge0$ and $y\\ge0$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{A workshop makes tables and stools. A table uses }3\\text{ units of wood and a stool uses }1\\text{ unit. At most }90\\text{ units of wood are available. Profit is Rs. }120\\text{ per table and Rs. }50\\text{ per stool. Form the wood constraint and objective function.}",
        difficulty: 3,
        skillTags: ["formulation", "constraints", "objective_function"],
        parts: singlePart(
          "a",
          "Let $x$ be tables and $y$ be stools. Write the wood constraint and profit function.",
          3,
        ),
        hints: [
          "Wood used is $3x+y$.",
          "At most means $\\le$.",
          "Profit is $120x+50y$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Defines or uses $x,y$ correctly.",
            },
            { part: "a", points: 1, description: "Writes $3x+y\\le90$." },
            { part: "a", points: 1, description: "Writes $P=120x+50y$." },
          ],
        },
        commonErrors: ["Using $3x+y\\ge90$ for an upper resource limit."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "If $x$ is tables and $y$ is stools, the wood constraint is $3x+y\\le90$ and the profit function is $P=120x+50y$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A library buys }x\\text{ mathematics guides and }y\\text{ science guides. A mathematics guide costs Rs. }300\\text{ and a science guide costs Rs. }200.\\text{ The budget is Rs. }12000,\\text{ the shelf can hold at most }50\\text{ guides, and at least }10\\text{ mathematics guides must be bought. A mathematics guide has score }6\\text{ and a science guide has score }5.\\text{ Formulate the LPP to maximize total score.}",
        difficulty: 4,
        skillTags: ["formulation", "constraints", "objective_function"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Define the decision variables.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Write all constraints.", points: 3 },
          {
            letter: "c",
            promptMarkdown: "Write the objective function.",
            points: 1,
          },
        ],
        hints: [
          "Use $x,y$ for numbers of guides.",
          "Budget, shelf capacity, minimum mathematics guides, and non-negativity are all constraints.",
          "The score is to be maximized.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Defines $x,y$ as guide counts.",
            },
            {
              part: "b",
              points: 1,
              description: "Writes budget constraint $300x+200y\\le12000$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Writes shelf and minimum constraints $x+y\\le50, x\\ge10$.",
            },
            { part: "b", points: 1, description: "Includes $x,y\\ge0$." },
            { part: "c", points: 1, description: "Writes maximize $Z=6x+5y$." },
          ],
        },
        commonErrors: [
          "Forgetting the minimum condition $x\\ge10$.",
          "Writing the budget as an equality without reason.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $x$ be the number of mathematics guides and $y$ be the number of science guides.",
          },
          {
            part: "b",
            explanation:
              "The constraints are $300x+200y\\le12000$, $x+y\\le50$, $x\\ge10$, $x\\ge0$, and $y\\ge0$.",
          },
          { part: "c", explanation: "The objective is to maximize $Z=6x+5y$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A school canteen sells sandwiches and juice packs. Let }x\\text{ be sandwiches and }y\\text{ be juice packs. A sandwich needs }2\\text{ minutes of preparation and a juice pack needs }1\\text{ minute. At most }100\\text{ minutes are available. The canteen can serve at most }70\\text{ items. Profit is Rs. }12\\text{ per sandwich and Rs. }8\\text{ per juice pack.}",
        difficulty: 4,
        skillTags: [
          "formulation",
          "constraints",
          "objective_function",
          "case_based",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the preparation-time constraint.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the item-capacity and non-negativity constraints.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Write the objective function to maximize profit.",
            points: 2,
          },
        ],
        hints: [
          "Preparation time comes from $2x+y$.",
          "At most gives $\\le$.",
          "Profit is earned per item sold.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $2x+y\\le100$." },
            {
              part: "b",
              points: 1,
              description: "Writes $x+y\\le70$ and $x,y\\ge0$.",
            },
            {
              part: "c",
              points: 2,
              description: "Writes maximize $P=12x+8y$.",
            },
          ],
        },
        commonErrors: [
          "Using $x+y\\le100$ for time instead of $2x+y\\le100$.",
          "Leaving out non-negativity constraints.",
        ],
        workedSolution: [
          { part: "a", explanation: "Preparation time gives $2x+y\\le100$." },
          {
            part: "b",
            explanation:
              "Item capacity gives $x+y\\le70$, with $x\\ge0,y\\ge0$.",
          },
          {
            part: "c",
            explanation: "The profit function is $P=12x+8y$, to be maximized.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Graphical Method and Feasible Regions",
    subtopic:
      "Graphing constraints, selecting the feasible side, bounded regions, vertices, and infeasible points",
    mc: [
      {
        questionLatex:
          "\\text{For the constraint }x+y\\le6\\text{ in the first quadrant, the feasible side is}",
        difficulty: 2,
        skillTags: ["graphical_method", "feasible_region"],
        figure: halfPlaneFigure,
        choices: [
          "the side containing the origin",
          "only the line $x+y=6$",
          "the side away from the origin",
          "the whole plane",
        ],
        correctLetter: "A",
        hints: [
          "Test a simple point.",
          "The origin gives $0+0\\le6$.",
          "So the side containing the origin is feasible.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $(0,0)$ satisfies $x+y\\le6$, the feasible side is the side containing the origin.",
            math: "0\\le6",
          },
        ],
      },
      {
        questionLatex: "\\text{The intercepts of the line }x+2y=8\\text{ are}",
        difficulty: 2,
        skillTags: ["graphical_method", "intercepts"],
        choices: [
          "$(4,0)\\text{ and }(0,8)$",
          "$(8,0)\\text{ and }(0,4)$",
          "$(8,0)\\text{ and }(0,2)$",
          "$(2,0)\\text{ and }(0,4)$",
        ],
        correctLetter: "B",
        hints: [
          "Set $y=0$ for the $x$-intercept.",
          "Set $x=0$ for the $y$-intercept.",
          "The line is $x+2y=8$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If $y=0$, $x=8$. If $x=0$, $y=4$. The intercepts are $(8,0)$ and $(0,4)$.",
            math: "(8,0),(0,4)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{In the shown feasible region, the number of corner points is}",
        difficulty: 3,
        skillTags: ["feasible_region", "corner_points"],
        figure: feasibleRegionFigure,
        choices: ["$2$", "$3$", "$4$", "$5$"],
        correctLetter: "C",
        hints: [
          "Corner points are vertices of the shaded polygon.",
          "Count each vertex once.",
          "The region has four labelled vertices.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The shaded feasible region has vertices $(0,0),(6,0),(4,2),(0,4)$, so it has $4$ corner points.",
            math: "4",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x+y\\le6,\\ x+2y\\le8,\\ x\\ge0,\\ y\\ge0,\\text{ the corner points are}",
        difficulty: 3,
        skillTags: ["feasible_region", "corner_points"],
        figure: feasibleRegionFigure,
        choices: [
          "$(0,0),(6,0),(4,2),(0,4)$",
          "$(0,0),(8,0),(0,6)$",
          "$(6,0),(0,4)$ only",
          "$(0,0),(4,2)$ only",
        ],
        correctLetter: "A",
        hints: [
          "Use the axes and the two boundary lines.",
          "Find the intersection of $x+y=6$ and $x+2y=8$.",
          "That intersection is $(4,2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The axes give $(0,0),(6,0),(0,4)$, and the two lines intersect at $(4,2)$.",
            math: "(0,0),(6,0),(4,2),(0,4)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which point is not in the feasible region }x+y\\le6,\\ x+2y\\le8,\\ x,y\\ge0?",
        difficulty: 4,
        skillTags: ["feasible_region", "infeasible_solution"],
        figure: feasibleRegionFigure,
        choices: ["$(0,0)$", "$(4,2)$", "$(2,2)$", "$(5,2)$"],
        correctLetter: "D",
        hints: [
          "Test each point in both inequalities.",
          "A point must satisfy every constraint.",
          "Check $x+y\\le6$ for $(5,2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$(5,2)$ gives $5+2=7>6$, so it is not feasible.",
            math: "5+2=7>6",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Find the intercepts of }2x+y=8.",
        difficulty: 2,
        skillTags: ["graphical_method", "intercepts"],
        parts: singlePart("a", "Find both intercepts.", 2),
        hints: [
          "Put $y=0$ for one intercept.",
          "Put $x=0$ for the other.",
          "Use the equation $2x+y=8$.",
        ],
        rubric: singleRubric("a", 2, "Finds intercepts $(4,0)$ and $(0,8)$."),
        commonErrors: [
          "Interchanging the intercepts of $2x+y=8$ and $x+2y=8$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "When $y=0$, $2x=8$, so $x=4$. When $x=0$, $y=8$. Intercepts are $(4,0)$ and $(0,8)$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Check whether }(3,2)\\text{ satisfies }x+2y\\le8.",
        difficulty: 2,
        skillTags: ["feasible_solution", "constraints"],
        parts: singlePart(
          "a",
          "State whether the point satisfies the inequality.",
          2,
        ),
        hints: [
          "Substitute $x=3,y=2$.",
          "Compute $x+2y$.",
          "Compare with $8$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Substitutes and states that the point satisfies the inequality.",
        ),
        commonErrors: ["Checking $2x+y$ instead of $x+2y$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $(3,2)$, $x+2y=3+4=7\\le8$. Hence the point satisfies the inequality.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the corner points of the feasible region }x+y\\le6,\\ x+2y\\le8,\\ x\\ge0,\\ y\\ge0.",
        difficulty: 3,
        skillTags: ["feasible_region", "corner_points"],
        figure: feasibleRegionFigure,
        parts: singlePart("a", "List all corner points.", 3),
        hints: [
          "Use intercepts on the axes.",
          "Solve the two line equations together.",
          "Include the origin.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds intercept-related vertices.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds intersection $(4,2)$.",
            },
            { part: "a", points: 1, description: "Lists all four vertices." },
          ],
        },
        commonErrors: [
          "Listing line intercepts that are outside the feasible region.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The corner points are $(0,0),(6,0),(4,2),(0,4)$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Graph the constraints }2x+y\\le8,\\ x+2y\\le8,\\ x\\ge0,\\ y\\ge0\\text{ and find the vertices of the feasible region.}",
        difficulty: 4,
        skillTags: ["graphical_method", "feasible_region", "corner_points"],
        figure: balancedConstraintFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the intercepts of the two boundary lines.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the intersection of the two lines.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "List the feasible-region vertices.",
            points: 1,
          },
        ],
        hints: [
          "Use intercepts to draw each line.",
          "Solve $2x+y=8$ and $x+2y=8$ together.",
          "Remember the non-negative quadrant.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds correct intercepts for both lines.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds intersection $\\left(\\frac83,\\frac83\\right)$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Lists $(0,0),(4,0),\\left(\\frac83,\\frac83\\right),(0,4)$.",
            },
          ],
        },
        commonErrors: [
          "Using the wrong side of one inequality.",
          "Leaving out the origin as a corner point.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$2x+y=8$ has intercepts $(4,0),(0,8)$; $x+2y=8$ has intercepts $(8,0),(0,4)$.",
          },
          {
            part: "b",
            explanation: "Solving $2x+y=8$ and $x+2y=8$ gives $x=y=\\frac83$.",
          },
          {
            part: "c",
            explanation:
              "The feasible region vertices are $(0,0),(4,0),\\left(\\frac83,\\frac83\\right),(0,4)$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A small unit makes }x\\text{ units of item A and }y\\text{ units of item B. Two resource constraints are }x+y\\le6\\text{ and }x+2y\\le8,\\text{ with }x,y\\ge0.\\text{ The feasible region is shown.}",
        difficulty: 4,
        skillTags: ["feasible_region", "corner_points", "case_based"],
        figure: feasibleRegionFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "State whether the feasible region is bounded.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "List the corner points.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "Check whether $(5,1)$ is feasible.",
            points: 1,
          },
        ],
        hints: [
          "A closed polygon in the first quadrant is bounded.",
          "Read or compute the vertices.",
          "Substitute $(5,1)$ in both constraints.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States bounded." },
            {
              part: "b",
              points: 2,
              description: "Lists all four corner points.",
            },
            { part: "c", points: 1, description: "Shows $(5,1)$ is feasible." },
          ],
        },
        commonErrors: [
          "Calling a region unbounded because it touches an axis.",
          "Checking only one constraint for feasibility.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The feasible region is a closed polygon, so it is bounded.",
          },
          {
            part: "b",
            explanation: "The corner points are $(0,0),(6,0),(4,2),(0,4)$.",
          },
          {
            part: "c",
            explanation:
              "For $(5,1)$, $x+y=6\\le6$ and $x+2y=7\\le8$, so the point is feasible.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Corner Point Method",
    subtopic:
      "Evaluating objective functions at vertices to find maximum and minimum values",
    mc: [
      {
        questionLatex:
          "\\text{For corner points }(0,0),(4,0),(2,3),(0,5),\\text{ the maximum of }Z=3x+5y\\text{ occurs at}",
        difficulty: 2,
        skillTags: ["corner_point_method", "optimization"],
        choices: ["$(0,0)$", "$(4,0)$", "$(2,3)$", "$(0,5)$"],
        correctLetter: "D",
        hints: [
          "Evaluate $Z$ at every point.",
          "Compare $0,12,21,25$.",
          "Choose the largest value.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The values of $Z$ are $0,12,21,25$. The maximum is $25$ at $(0,5)$.",
            math: "Z(0,5)=25",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For corner points }(2,0),(0,3),(4,2),\\text{ the minimum of }C=2x+y\\text{ is}",
        difficulty: 2,
        skillTags: ["corner_point_method", "optimization"],
        choices: [
          "$3\\text{ at }(0,3)$",
          "$4\\text{ at }(2,0)$",
          "$10\\text{ at }(4,2)$",
          "$0\\text{ at }(0,0)$",
        ],
        correctLetter: "A",
        hints: [
          "Evaluate $C$ at each listed corner point.",
          "Do not use a point that is not listed.",
          "Compare $4,3,10$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$C(2,0)=4$, $C(0,3)=3$, and $C(4,2)=10$. Minimum is $3$ at $(0,3)$.",
            math: "C_{\\min}=3",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For the shown feasible region, the maximum of }Z=5x+4y\\text{ is}",
        difficulty: 3,
        skillTags: ["corner_point_method", "optimization"],
        figure: feasibleRegionFigure,
        choices: [
          "$30\\text{ at }(6,0)$",
          "$28\\text{ at }(4,2)$",
          "$16\\text{ at }(0,4)$",
          "$0\\text{ at }(0,0)$",
        ],
        correctLetter: "A",
        hints: [
          "Use the four corner points.",
          "Evaluate $5x+4y$ at each one.",
          "The largest value is $30$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At $(0,0),(6,0),(4,2),(0,4)$, $Z=0,30,28,16$. Maximum is $30$ at $(6,0)$.",
            math: "Z_{\\max}=30",
          },
        ],
      },
      {
        questionLatex:
          "\\text{At two adjacent corner points }A\\text{ and }B,\\text{ an objective function has the same maximum value. Then}",
        difficulty: 3,
        skillTags: ["corner_point_method", "multiple_optima"],
        figure: multipleOptimaFigure,
        choices: [
          "only $A$ is optimal",
          "only $B$ is optimal",
          "every point on segment $AB$ is optimal",
          "there is no feasible solution",
        ],
        correctLetter: "C",
        hints: [
          "Equal optimum at adjacent vertices means the objective line is parallel to the edge.",
          "Linear objective functions are constant along that edge.",
          "So the entire edge gives the same value.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If adjacent vertices give the same maximum, then every point on the edge joining them also gives that maximum.",
            math: "\\text{multiple optima on }AB",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For the shown feasible region, the maximum of }Z=2x+3y\\text{ occurs at}",
        difficulty: 4,
        skillTags: ["corner_point_method", "optimization"],
        figure: feasibleRegionFigure,
        choices: ["$(6,0)$", "$(4,2)$", "$(0,4)$", "$(0,0)$"],
        correctLetter: "B",
        hints: [
          "Evaluate $Z$ at all four vertices.",
          "The values are $0,12,14,12$.",
          "Choose the largest value.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$Z(0,0)=0$, $Z(6,0)=12$, $Z(4,2)=14$, $Z(0,4)=12$. Maximum occurs at $(4,2)$.",
            math: "Z(4,2)=14",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Evaluate }Z=4x+3y\\text{ at the point }(5,2).",
        difficulty: 2,
        skillTags: ["corner_point_method", "objective_function"],
        parts: singlePart("a", "Find the value of $Z$.", 2),
        hints: [
          "Substitute $x=5,y=2$.",
          "Compute $4(5)+3(2)$.",
          "Add the two values.",
        ],
        rubric: singleRubric("a", 2, "Finds $Z=26$."),
        commonErrors: ["Substituting the coordinates in the wrong order."],
        workedSolution: [{ part: "a", explanation: "$Z=4(5)+3(2)=20+6=26$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{The values of }Z\\text{ at four corner points are }0,18,22,20.\\text{ State the maximum value.}",
        difficulty: 2,
        skillTags: ["corner_point_method", "optimization"],
        parts: singlePart("a", "State the maximum value.", 2),
        hints: [
          "Compare the four numbers.",
          "The maximum is the largest number.",
          "Do not average them.",
        ],
        rubric: singleRubric("a", 2, "States maximum value $22$."),
        commonErrors: [
          "Choosing the last listed value instead of the largest value.",
        ],
        workedSolution: [
          { part: "a", explanation: "The largest of $0,18,22,20$ is $22$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{For corner points }(0,0),(5,0),(3,2),(0,4),\\text{ find the maximum value of }Z=4x+3y.",
        difficulty: 3,
        skillTags: ["corner_point_method", "optimization"],
        parts: singlePart(
          "a",
          "Evaluate $Z$ at all corner points and find the maximum.",
          3,
        ),
        hints: [
          "Make a small table of corner points and values.",
          "Compute $Z=4x+3y$ at each point.",
          "Choose the largest.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Evaluates $Z$ at at least two corner points correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Evaluates all corner values correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds maximum $20$ at $(5,0)$.",
            },
          ],
        },
        commonErrors: [
          "Stopping after evaluating the first nonzero corner point.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The values are $0,20,18,12$. Hence the maximum is $20$ at $(5,0)$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Use the corner point method to maximize }Z=5x+4y\\text{ subject to }x+y\\le6,\\ x+2y\\le8,\\ x\\ge0,\\ y\\ge0.",
        difficulty: 4,
        skillTags: ["corner_point_method", "optimization", "feasible_region"],
        figure: feasibleRegionFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "List the corner points of the feasible region.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Evaluate $Z$ at all corner points.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the maximum value and where it occurs.",
            points: 1,
          },
        ],
        hints: [
          "Use the feasible region from Topic 5.2.",
          "Evaluate $5x+4y$ at every vertex.",
          "Compare the values.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Lists $(0,0),(6,0),(4,2),(0,4)$.",
            },
            { part: "b", points: 2, description: "Computes $0,30,28,16$." },
            {
              part: "c",
              points: 1,
              description: "States maximum $30$ at $(6,0)$.",
            },
          ],
        },
        commonErrors: [
          "Evaluating only the intersection point.",
          "Choosing the largest coordinate instead of largest objective value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The corner points are $(0,0),(6,0),(4,2),(0,4)$.",
          },
          {
            part: "b",
            explanation:
              "The corresponding values of $Z=5x+4y$ are $0,30,28,16$.",
          },
          {
            part: "c",
            explanation: "Maximum value is $30$, attained at $(6,0)$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{For the shown feasible region, a manufacturer wants to maximize }Z=3x+5y.",
        difficulty: 4,
        skillTags: ["corner_point_method", "optimization", "case_based"],
        figure: feasibleRegionFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the corner points.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Evaluate $Z=3x+5y$ at the corner points.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the maximum value and the optimal point.",
            points: 1,
          },
        ],
        hints: [
          "Use the four labelled vertices.",
          "Substitute each vertex in $3x+5y$.",
          "Choose the largest value.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Lists all corner points." },
            {
              part: "b",
              points: 2,
              description: "Computes values $0,18,22,20$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds maximum $22$ at $(4,2)$.",
            },
          ],
        },
        commonErrors: [
          "Using the wrong objective from another problem.",
          "Missing the point $(4,2)$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The corner points are $(0,0),(6,0),(4,2),(0,4)$.",
          },
          {
            part: "b",
            explanation: "$Z$ values are $0,18,22,20$ respectively.",
          },
          { part: "c", explanation: "The maximum value is $22$ at $(4,2)$." },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Bounded, Unbounded, and Multiple Optimum Cases",
    subtopic:
      "Recognising bounded and unbounded regions, checking existence of optimum values, and interpreting multiple optima",
    mc: [
      {
        questionLatex:
          "\\text{The feasible region }x+y\\le5,\\ x\\ge0,\\ y\\ge0\\text{ is}",
        difficulty: 2,
        skillTags: ["bounded_unbounded", "feasible_region"],
        choices: ["bounded", "unbounded", "empty", "not in the first quadrant"],
        correctLetter: "A",
        hints: [
          "Draw the triangle in the first quadrant.",
          "The axes and line enclose a finite region.",
          "Finite enclosed region means bounded.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The constraints enclose a triangle with vertices $(0,0),(5,0),(0,5)$, so the region is bounded.",
            math: "\\text{bounded}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The feasible region }x+y\\ge4,\\ x\\ge0,\\ y\\ge0\\text{ is}",
        difficulty: 2,
        skillTags: ["bounded_unbounded", "feasible_region"],
        figure: unboundedRegionFigure,
        choices: ["bounded", "unbounded", "empty", "a single line segment"],
        correctLetter: "B",
        hints: [
          "The feasible side is away from the origin.",
          "It continues indefinitely in the first quadrant.",
          "So it is not enclosed.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The region $x+y\\ge4$ in the first quadrant extends indefinitely, so it is unbounded.",
            math: "\\text{unbounded}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Maximize }Z=x+y\\text{ subject to }x+y\\le6,\\ x\\ge0,\\ y\\ge0.\\text{ The optimum occurs}",
        difficulty: 3,
        skillTags: ["multiple_optima", "optimization"],
        figure: multipleOptimaFigure,
        choices: [
          "only at $(6,0)$",
          "only at $(0,6)$",
          "at every point on $x+y=6$ in the first quadrant",
          "nowhere",
        ],
        correctLetter: "C",
        hints: [
          "The objective function is parallel to the boundary $x+y=6$.",
          "At $(6,0)$ and $(0,6)$, $Z=6$.",
          "Every point on the segment has the same value.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "On the edge $x+y=6$, $Z=x+y=6$ at every point, so there are multiple optimal solutions.",
            math: "Z=6\\text{ on }x+y=6",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Minimize }Z=3x+2y\\text{ subject to }x+y\\ge4,\\ x\\ge0,\\ y\\ge0.\\text{ The minimum value is}",
        difficulty: 3,
        skillTags: ["bounded_unbounded", "corner_point_method", "optimization"],
        figure: unboundedRegionFigure,
        choices: ["$8$", "$12$", "$0$", "does not exist"],
        correctLetter: "A",
        hints: [
          "Even an unbounded region can have a minimum.",
          "Check boundary corner points $(4,0)$ and $(0,4)$.",
          "Compare $12$ and $8$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$Z(4,0)=12$ and $Z(0,4)=8$. To prove no smaller value is feasible, note that for every feasible point, $3x+2y=2(x+y)+x\\ge2(4)+0=8$. Thus the open half-plane $3x+2y<8$ has no feasible point, and the minimum is $8$ at $(0,4)$.",
            math: "Z_{\\min}=8",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Maximize }Z=x+y\\text{ subject to }x+y\\ge4,\\ x\\ge0,\\ y\\ge0.\\text{ The maximum value}",
        difficulty: 4,
        skillTags: ["bounded_unbounded", "optimization"],
        figure: unboundedRegionFigure,
        choices: ["is $4$", "is $0$", "does not exist", "is $8$"],
        correctLetter: "C",
        hints: [
          "The feasible region is unbounded.",
          "In the region, $x+y$ can be made larger without limit.",
          "So a maximum is not attained.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $x+y$ can increase indefinitely in the unbounded region, no maximum value exists.",
            math: "\\text{no maximum}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{State whether }(5,1)\\text{ is feasible for }x+y\\ge4,\\ x\\ge0,\\ y\\ge0.",
        difficulty: 2,
        skillTags: ["feasible_solution", "bounded_unbounded"],
        parts: singlePart("a", "State whether the point is feasible.", 2),
        hints: [
          "Substitute the point.",
          "Check non-negativity.",
          "$5+1\\ge4$.",
        ],
        rubric: singleRubric("a", 2, "States feasible with a valid check."),
        commonErrors: ["Using $\\le$ instead of $\\ge$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$(5,1)$ satisfies $5+1=6\\ge4$ and both coordinates are non-negative. Hence it is feasible.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{If an objective function has equal maximum value at adjacent vertices }(6,0)\\text{ and }(0,6),\\text{ what can be said about the segment joining them?}",
        difficulty: 2,
        skillTags: ["multiple_optima", "optimization"],
        figure: multipleOptimaFigure,
        parts: singlePart("a", "State the conclusion.", 2),
        hints: [
          "Think of the objective line moving parallel to itself.",
          "Equal values at adjacent vertices mean the edge is parallel to the objective line.",
          "Every point on that edge has the same value.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that every point on the segment is optimal.",
        ),
        commonErrors: ["Choosing only one endpoint as optimal."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Every point on the segment joining $(6,0)$ and $(0,6)$ gives the same maximum value.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{For }x+y\\le6,\\ x\\ge0,\\ y\\ge0,\\text{ state whether the feasible region is bounded and list its vertices.}",
        difficulty: 3,
        skillTags: ["bounded_unbounded", "corner_points"],
        figure: multipleOptimaFigure,
        parts: singlePart(
          "a",
          "State bounded/unbounded and list the vertices.",
          3,
        ),
        hints: [
          "Draw the first quadrant triangle.",
          "Use intercepts of $x+y=6$.",
          "Include the origin.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "States bounded." },
            { part: "a", points: 1, description: "Finds intercept vertices." },
            {
              part: "a",
              points: 1,
              description: "Lists all vertices $(0,0),(6,0),(0,6)$.",
            },
          ],
        },
        commonErrors: ["Forgetting the origin as a vertex."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The region is a bounded triangle with vertices $(0,0),(6,0),(0,6)$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Minimize }Z=3x+2y\\text{ subject to }x+y\\ge4,\\ x\\ge0,\\ y\\ge0.\\text{ Also state whether a maximum exists.}",
        difficulty: 4,
        skillTags: ["bounded_unbounded", "corner_point_method", "optimization"],
        figure: unboundedRegionFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "State whether the feasible region is bounded.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the minimum value of $Z$.",
            points: 3,
          },
          {
            letter: "c",
            promptMarkdown: "State whether a maximum exists.",
            points: 1,
          },
        ],
        hints: [
          "The feasible side is away from the origin.",
          "Check the boundary corner points $(4,0)$ and $(0,4)$.",
          "For maximum, ask whether $x+y$ can grow without bound.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "States unbounded." },
            {
              part: "b",
              points: 1,
              description: "Identifies boundary corner points.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds minimum $8$ at $(0,4)$.",
            },
            { part: "c", points: 1, description: "States no maximum exists." },
          ],
        },
        commonErrors: [
          "Assuming unbounded means no minimum can exist.",
          "Choosing $(4,0)$ without evaluating both boundary points.",
        ],
        workedSolution: [
          { part: "a", explanation: "The feasible region is unbounded." },
          {
            part: "b",
            explanation:
              "At $(4,0)$, $Z=12$; at $(0,4)$, $Z=8$. For the NCERT-style check, for every feasible point $3x+2y=2(x+y)+x\\ge2(4)+0=8$. Therefore the open half-plane $3x+2y<8$ has no common point with the feasible region, so $8$ is the true minimum.",
          },
          {
            part: "c",
            explanation:
              "No maximum exists because $Z=3x+2y$ can be made arbitrarily large in the unbounded region.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A delivery rule requires }x+y\\ge4\\text{ trips, with }x,y\\ge0.\\text{ The cost is }C=3x+2y.\\text{ The feasible region is shown.}",
        difficulty: 4,
        skillTags: ["bounded_unbounded", "optimization", "case_based"],
        figure: unboundedRegionFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "State whether the feasible region is bounded.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the minimum cost.", points: 2 },
          {
            letter: "c",
            promptMarkdown:
              "Explain whether a maximum cost exists under only these constraints.",
            points: 1,
          },
        ],
        hints: [
          "Use the same boundary corner points.",
          "Evaluate $C$ at $(4,0)$ and $(0,4)$.",
          "The region continues indefinitely.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States unbounded." },
            {
              part: "b",
              points: 2,
              description: "Finds minimum cost $8$ at $(0,4)$.",
            },
            { part: "c", points: 1, description: "States no maximum exists." },
          ],
        },
        commonErrors: [
          "Treating the visible drawing window as the whole unbounded region.",
          "Saying no optimum exists at all.",
        ],
        workedSolution: [
          { part: "a", explanation: "The feasible region is unbounded." },
          {
            part: "b",
            explanation:
              "$C(4,0)=12$ and $C(0,4)=8$. Also, for every feasible point, $3x+2y=2(x+y)+x\\ge8$, so $3x+2y<8$ has no feasible point. Hence the minimum cost is $8$.",
          },
          {
            part: "c",
            explanation:
              "There is no maximum cost because the feasible region extends indefinitely and cost can keep increasing.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Applications of Linear Programming",
    subtopic:
      "Board-style production, diet, and resource-allocation problems using formulation and corner-point solution",
    mc: [
      {
        questionLatex:
          "\\text{A factory maximizes }P=40x+30y\\text{ subject to }2x+y\\le100,\\ x+y\\le80,\\ x,y\\ge0.\\text{ The maximum profit occurs at}",
        difficulty: 2,
        skillTags: ["applications", "corner_point_method", "optimization"],
        figure: applicationProfitFigure,
        choices: ["$(50,0)$", "$(20,60)$", "$(0,80)$", "$(0,0)$"],
        correctLetter: "B",
        hints: [
          "Find the intersection of the two non-axis constraints.",
          "Evaluate profit at the corner points.",
          "The intersection is $(20,60)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Corner values are $2000$ at $(50,0)$, $2600$ at $(20,60)$, and $2400$ at $(0,80)$. Maximum occurs at $(20,60)$.",
            math: "P(20,60)=2600",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Minimize }C=6x+4y\\text{ subject to }x+y\\ge5,\\ 2x+y\\ge8,\\ x,y\\ge0.\\text{ The minimum occurs at}",
        difficulty: 2,
        skillTags: ["applications", "corner_point_method", "optimization"],
        figure: applicationMinimumFigure,
        choices: ["$(5,0)$", "$(0,8)$", "$(3,2)$", "$(0,0)$"],
        correctLetter: "C",
        hints: [
          "Solve the two boundary lines together.",
          "Compare with axis boundary points.",
          "At $(3,2)$, cost is $26$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The lines $x+y=5$ and $2x+y=8$ intersect at $(3,2)$. Costs at relevant boundary corners are $30,32,26$, so the minimum occurs at $(3,2)$.",
            math: "C(3,2)=26",
          },
        ],
      },
      {
        questionLatex:
          "\\text{In a two-variable CBSE Linear Programming problem, the graphical method normally finds the optimum by checking}",
        difficulty: 3,
        skillTags: ["applications", "corner_point_method"],
        choices: [
          "all points in the plane",
          "only the axes",
          "corner points of the feasible region",
          "only the origin",
        ],
        correctLetter: "C",
        hints: [
          "A linear objective reaches an optimum at a vertex when an optimum exists.",
          "This is the corner point method.",
          "Do not test infinitely many interior points.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The graphical method uses the corner points of the feasible region to find the optimum.",
            math: "\\text{corner points}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A product }A\\text{ needs }2\\text{ machine hours and product }B\\text{ needs }3\\text{ machine hours. With }120\\text{ machine hours available, the correct constraint is}",
        difficulty: 3,
        skillTags: ["applications", "formulation"],
        figure: machineHoursFigure,
        choices: [
          "$2x+3y\\le120$",
          "$3x+2y\\le120$",
          "$2x+3y\\ge120$",
          "$x+y\\le120$",
        ],
        correctLetter: "A",
        hints: [
          "This is a resource limit.",
          "Multiply product counts by their individual machine hours.",
          "Available hours form an upper bound.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Total machine hours used are $2x+3y$, so $2x+3y\\le120$.",
            math: "2x+3y\\le120",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For corner points }(0,40),(30,20),(50,0)\\text{ and profit }P=40x+50y,\\text{ the maximum occurs at}",
        difficulty: 4,
        skillTags: ["applications", "corner_point_method", "optimization"],
        figure: productionRegionFigure,
        choices: ["$(0,40)$", "$(30,20)$", "$(50,0)$", "all three points"],
        correctLetter: "B",
        hints: [
          "Evaluate $P$ at the three listed points.",
          "The values are $2000,2200,2000$.",
          "Choose the largest.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$P(0,40)=2000$, $P(30,20)=2200$, and $P(50,0)=2000$. Maximum occurs at $(30,20)$.",
            math: "P(30,20)=2200",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{A chair gives profit Rs. }40\\text{ and a table gives profit Rs. }50.\\text{ If }x\\text{ chairs and }y\\text{ tables are made, write the profit function.}",
        difficulty: 2,
        skillTags: ["applications", "objective_function"],
        parts: singlePart("a", "Write the profit function.", 2),
        hints: [
          "Multiply each item by its profit.",
          "Add the two terms.",
          "Use $P$ or $Z$.",
        ],
        rubric: singleRubric("a", 2, "Writes $P=40x+50y$."),
        commonErrors: ["Writing $40+50$ instead of depending on $x$ and $y$."],
        workedSolution: [
          { part: "a", explanation: "The profit function is $P=40x+50y$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Product }A\\text{ needs }2\\text{ kg of material and product }B\\text{ needs }3\\text{ kg. If }90\\text{ kg is available, write the material constraint.}",
        difficulty: 2,
        skillTags: ["applications", "formulation"],
        parts: singlePart("a", "Write the constraint.", 2),
        hints: [
          "Total material used is $2x+3y$.",
          "Available material is an upper limit.",
          "Use $\\le$.",
        ],
        rubric: singleRubric("a", 2, "Writes $2x+3y\\le90$."),
        commonErrors: ["Using $\\ge$ for a maximum available resource."],
        workedSolution: [
          {
            part: "a",
            explanation: "The material constraint is $2x+3y\\le90$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Maximize }P=20x+30y\\text{ subject to }x+y\\le10,\\ x+2y\\le14,\\ x\\ge0,\\ y\\ge0.",
        difficulty: 3,
        skillTags: ["applications", "corner_point_method", "optimization"],
        figure: applicationSaqFigure,
        parts: singlePart(
          "a",
          "Find the maximum value and the point where it occurs.",
          3,
        ),
        hints: [
          "Find the corner points.",
          "The two non-axis lines intersect at $(6,4)$.",
          "Evaluate $P$ at all vertices.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds relevant corner points.",
            },
            {
              part: "a",
              points: 1,
              description: "Evaluates the objective function.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds maximum $240$ at $(6,4)$.",
            },
          ],
        },
        commonErrors: [
          "Using only intercepts and missing the intersection $(6,4)$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Corner points are $(0,0),(10,0),(6,4),(0,7)$. Values of $P$ are $0,200,240,210$. Maximum is $240$ at $(6,4)$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A workshop makes chairs }(x)\\text{ and tables }(y).\\text{ A chair uses }2\\text{ machine hours and a table uses }3\\text{ machine hours. At most }120\\text{ machine hours are available. Labour permits at most }50\\text{ total items. Profit is Rs. }40\\text{ per chair and Rs. }50\\text{ per table. Formulate and solve the LPP.}",
        difficulty: 5,
        skillTags: [
          "applications",
          "formulation",
          "corner_point_method",
          "optimization",
        ],
        figure: productionRegionFigure,
        parts: [
          { letter: "a", promptMarkdown: "Formulate the LPP.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Find the corner points of the feasible region.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the maximum profit and production plan.",
            points: 2,
          },
        ],
        hints: [
          "Machine hours give $2x+3y\\le120$.",
          "Labour gives $x+y\\le50$.",
          "Evaluate $P=40x+50y$ at the corner points.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Writes correct constraints including non-negativity.",
            },
            {
              part: "a",
              points: 1,
              description: "Writes objective $P=40x+50y$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds corner points $(0,0),(50,0),(30,20),(0,40)$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds maximum profit $2200$ at $(30,20)$.",
            },
          ],
        },
        commonErrors: [
          "Reversing the machine-hour coefficients.",
          "Choosing $(50,0)$ or $(0,40)$ without checking the intersection.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Maximize $P=40x+50y$ subject to $2x+3y\\le120$, $x+y\\le50$, $x\\ge0$, $y\\ge0$.",
          },
          {
            part: "b",
            explanation:
              "The feasible region has corner points $(0,0),(50,0),(30,20),(0,40)$.",
          },
          {
            part: "c",
            explanation:
              "Profits are $0,2000,2200,2000$. Maximum profit is Rs. $2200$ at $(30,20)$, so the workshop should make $30$ chairs and $20$ tables.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A dietician mixes two foods A and B. Food A and B provide protein and vitamin units as shown. At least }8\\text{ protein units and at least }8\\text{ vitamin units are required. Let }x\\text{ and }y\\text{ be the units of foods A and B.}",
        difficulty: 4,
        skillTags: [
          "applications",
          "formulation",
          "corner_point_method",
          "diet_problem",
          "case_based",
        ],
        figure: dietTableFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the two nutrient constraints.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the cost function to be minimized.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Using relevant corner points $(8,0),(\\frac83,\\frac83),(0,8)$, find the minimum cost.",
            points: 2,
          },
        ],
        hints: [
          "Read protein and vitamin units from the table.",
          "Diet problems usually use minimum requirements, so use $\\ge$.",
          "Evaluate cost at the listed corner points.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $2x+y\\ge8$ and $x+2y\\ge8$.",
            },
            { part: "b", points: 1, description: "Writes $C=6x+4y$." },
            {
              part: "c",
              points: 2,
              description:
                "Finds minimum cost $80/3$ at $(\\frac83,\\frac83)$.",
            },
          ],
        },
        commonErrors: [
          "Using $\\le$ for minimum nutrient requirements.",
          "Reading nutrient rows as cost values.",
          "Choosing an axis point without checking the intersection.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Protein gives $2x+y\\ge8$ and vitamin gives $x+2y\\ge8$, with $x,y\\ge0$.",
          },
          {
            part: "b",
            explanation: "The cost function is $C=6x+4y$, to be minimized.",
          },
          {
            part: "c",
            explanation:
              "At $(8,0)$, $C=48$; at $(\\frac83,\\frac83)$, $C=\\frac{80}{3}$; at $(0,8)$, $C=32$. To confirm this is the true minimum, for every feasible point, $6x+4y=\\frac83(2x+y)+\\frac23(x+2y)\\ge\\frac83(8)+\\frac23(8)=\\frac{80}{3}$. So the open half-plane $6x+4y<\\frac{80}{3}$ has no feasible point, and the minimum is attained at $(\\frac83,\\frac83)$.",
          },
        ],
      },
    ],
  },
];

export const linearProgrammingTopics: Topic[] = topicSeeds.map(makeTopic);
