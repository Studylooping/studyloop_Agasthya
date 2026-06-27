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
const UNIT = "u4-vectors-3d";
const VERSION = "0.2.3";
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

  if (tags.has("vector_basics") || tags.has("direction_cosines")) {
    return "Compute the vector components first, then use magnitude or direction-cosine formulas.";
  }
  if (tags.has("vector_operations") || tags.has("section_formula")) {
    return "Combine corresponding components and use the correct internal-section formula.";
  }
  if (tags.has("dot_product") || tags.has("projection")) {
    return "Use the scalar product, then divide by the correct magnitude when angle or projection is needed.";
  }
  if (tags.has("cross_product") || tags.has("area_vector")) {
    return "Use the vector product carefully; parallelogram area is $|\\vec a\\times\\vec b|$ and triangle area is half of it.";
  }
  if (tags.has("line_3d")) {
    return "Identify one point and one direction vector before writing the line equation.";
  }
  if (tags.has("shortest_distance") || tags.has("skew_lines")) {
    return "Compare direction vectors first, then use the correct angle or shortest-distance formula.";
  }

  return "Use the exact vector or three-dimensional geometry rule required by this CBSE Class 12 topic.";
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
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_vector_reasoning",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(
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
      "uses_formula_without_checking_vector_components",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(
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
      "states_answer_without_showing_required_vector_work",
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

const vectorComponentsFigure: ItemFigure = {
  type: "svg",
  title: "Vector with components in space",
  description: "A simple component sketch for displacement vector OP with components 4, 3, and 12.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-components" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="92" y1="258" x2="500" y2="258" stroke="#64748b" stroke-width="2"/>
  <line x1="92" y1="258" x2="92" y2="58" stroke="#64748b" stroke-width="2"/>
  <line x1="92" y1="258" x2="58" y2="292" stroke="#64748b" stroke-width="2"/>
  <text x="508" y="263" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="98" y="54" font-size="15" fill="#475569" font-family="Arial, sans-serif">z</text>
  <text x="38" y="310" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <polyline points="92,258 220,258 256,222 256,86" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="92" y1="258" x2="256" y2="86" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-components)"/>
  <circle cx="92" cy="258" r="5" fill="#0f172a"/>
  <circle cx="256" cy="86" r="6" fill="#2563eb"/>
  <text x="76" y="278" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">O</text>
  <text x="266" y="82" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">P(4, 3, 12)</text>
  <text x="152" y="247" font-size="14" fill="#475569" font-family="Arial, sans-serif">4</text>
  <text x="222" y="236" font-size="14" fill="#475569" font-family="Arial, sans-serif">3</text>
  <text x="265" y="158" font-size="14" fill="#475569" font-family="Arial, sans-serif">12</text>
</svg>`,
};

const vectorAdditionFigure: ItemFigure = {
  type: "svg",
  title: "Head-to-tail vector addition",
  description: "Two horizontal-plane displacement vectors and their resultant.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-add-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-add-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a"/>
    </marker>
    <marker id="arrow-u4-add-red" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/>
    </marker>
  </defs>
  <line x1="70" y1="250" x2="500" y2="250" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="90" y1="270" x2="90" y2="50" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="90" y1="250" x2="218" y2="154" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-add-blue)"/>
  <line x1="218" y1="154" x2="154" y2="74" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-u4-add-green)"/>
  <line x1="90" y1="250" x2="154" y2="74" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-u4-add-red)"/>
  <text x="154" y="168" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">a</text>
  <text x="188" y="104" font-size="15" fill="#166534" font-family="Arial, sans-serif">b</text>
  <text x="104" y="120" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">a + b</text>
  <circle cx="90" cy="250" r="5" fill="#0f172a"/>
  <text x="72" y="274" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">O</text>
</svg>`,
};

const dotProductAngleFigure: ItemFigure = {
  type: "svg",
  title: "Angle between force and displacement",
  description: "Two vectors from the same point showing the angle used in scalar product.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-dot-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-dot-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="116" y1="238" x2="416" y2="178" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-dot-blue)"/>
  <line x1="116" y1="238" x2="336" y2="86" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-u4-dot-green)"/>
  <path d="M 176 226 C 184 202 202 184 226 168" fill="none" stroke="#f59e0b" stroke-width="3"/>
  <text x="212" y="198" font-size="17" fill="#b45309" font-family="Arial, sans-serif">theta</text>
  <text x="352" y="202" font-size="16" fill="#1e3a8a" font-family="Arial, sans-serif">s</text>
  <text x="280" y="88" font-size="16" fill="#166534" font-family="Arial, sans-serif">F</text>
  <circle cx="116" cy="238" r="5" fill="#0f172a"/>
  <text x="96" y="260" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">O</text>
</svg>`,
};

const crossProductParallelogramFigure: ItemFigure = {
  type: "svg",
  title: "Parallelogram and vector area",
  description: "A parallelogram formed by two adjacent vectors with a normal vector.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-cross-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-cross-red" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/>
    </marker>
  </defs>
  <polygon points="136,242 350,242 430,128 216,128" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <line x1="136" y1="242" x2="350" y2="242" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-cross-blue)"/>
  <line x1="136" y1="242" x2="216" y2="128" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-cross-blue)"/>
  <line x1="270" y1="188" x2="270" y2="72" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-u4-cross-red)"/>
  <text x="232" y="264" font-size="16" fill="#1e3a8a" font-family="Arial, sans-serif">a</text>
  <text x="166" y="164" font-size="16" fill="#1e3a8a" font-family="Arial, sans-serif">b</text>
  <text x="282" y="90" font-size="16" fill="#991b1b" font-family="Arial, sans-serif">a x b</text>
  <text x="246" y="202" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">area</text>
</svg>`,
};

const line3dFigure: ItemFigure = {
  type: "svg",
  title: "Line in three-dimensional space",
  description: "A line through a point with a direction vector in a simple 3D coordinate sketch.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-line" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
    <marker id="arrow-u4-line-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="96" y1="256" x2="488" y2="256" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u4-line)"/>
  <line x1="96" y1="256" x2="96" y2="58" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u4-line)"/>
  <line x1="96" y1="256" x2="58" y2="294" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u4-line)"/>
  <text x="498" y="262" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="102" y="54" font-size="15" fill="#475569" font-family="Arial, sans-serif">z</text>
  <text x="38" y="312" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <line x1="150" y1="226" x2="430" y2="118" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-line-blue)"/>
  <circle cx="224" cy="198" r="7" fill="#dc2626"/>
  <text x="236" y="194" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">A</text>
  <text x="346" y="132" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">direction</text>
</svg>`,
};

const skewLinesFigure: ItemFigure = {
  type: "svg",
  title: "Two skew lines",
  description:
    "Two non-parallel, non-intersecting lines in perspective. The back line has a gap where the front line passes, and the shortest-distance connector is separate from both lines.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-skew-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-skew-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a"/>
    </marker>
  </defs>
  <path d="M 86 238 L 230 202" stroke="#16a34a" stroke-width="4" fill="none"/>
  <path d="M 332 176 L 478 140" stroke="#16a34a" stroke-width="4" fill="none" marker-end="url(#arrow-u4-skew-green)"/>
  <path d="M 230 202 L 332 176" stroke="#16a34a" stroke-width="4" stroke-dasharray="8 8" opacity="0.35" fill="none"/>
  <path d="M 104 104 L 456 268" stroke="#2563eb" stroke-width="5" fill="none" marker-end="url(#arrow-u4-skew-blue)"/>
  <line x1="252" y1="196" x2="350" y2="219" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 6"/>
  <circle cx="252" cy="196" r="5" fill="#16a34a" stroke="#f8fafc" stroke-width="2"/>
  <circle cx="350" cy="219" r="5" fill="#2563eb" stroke="#f8fafc" stroke-width="2"/>
  <text x="452" y="286" font-size="16" fill="#1e3a8a" font-family="Arial, sans-serif">L1</text>
  <text x="482" y="140" font-size="16" fill="#166534" font-family="Arial, sans-serif">L2</text>
  <text x="304" y="202" font-size="15" fill="#b45309" font-family="Arial, sans-serif">shortest distance</text>
</svg>`,
};

const angleBetweenLinesFigure: ItemFigure = {
  type: "svg",
  title: "Angle between two lines",
  description: "Two intersecting lines in space with the smaller angle marked.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-angle-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-angle-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="110" y1="232" x2="458" y2="112" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-angle-blue)"/>
  <line x1="138" y1="84" x2="438" y2="244" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-u4-angle-green)"/>
  <circle cx="280" cy="174" r="7" fill="#0f172a"/>
  <path d="M 318 160 C 334 172 346 186 354 204" fill="none" stroke="#f59e0b" stroke-width="3"/>
  <text x="346" y="178" font-size="17" fill="#b45309" font-family="Arial, sans-serif">theta</text>
  <text x="450" y="106" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">L1</text>
  <text x="442" y="252" font-size="15" fill="#166534" font-family="Arial, sans-serif">L2</text>
</svg>`,
};

const parallelLinesDistanceFigure: ItemFigure = {
  type: "svg",
  title: "Distance between parallel lines",
  description: "Two parallel lines in space with a perpendicular connector.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-parallel-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-parallel-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="104" y1="230" x2="450" y2="116" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-parallel-blue)"/>
  <line x1="122" y1="270" x2="468" y2="156" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-u4-parallel-green)"/>
  <line x1="278" y1="172" x2="286" y2="196" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 6"/>
  <text x="452" y="112" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">L1</text>
  <text x="472" y="158" font-size="15" fill="#166534" font-family="Arial, sans-serif">L2</text>
  <text x="306" y="198" font-size="15" fill="#b45309" font-family="Arial, sans-serif">d</text>
</svg>`,
};

const lineThroughTwoPointsFigure: ItemFigure = {
  type: "svg",
  title: "Line through two points",
  description: "A line in space passing through two marked points.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-two-points" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-two-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="84" y1="260" x2="500" y2="260" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u4-two-axis)"/>
  <line x1="84" y1="260" x2="84" y2="58" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u4-two-axis)"/>
  <line x1="84" y1="260" x2="46" y2="298" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-u4-two-axis)"/>
  <text x="508" y="265" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="92" y="54" font-size="15" fill="#475569" font-family="Arial, sans-serif">z</text>
  <text x="30" y="316" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <line x1="136" y1="238" x2="440" y2="94" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-two-points)"/>
  <circle cx="214" cy="201" r="7" fill="#dc2626"/>
  <circle cx="348" cy="138" r="7" fill="#dc2626"/>
  <text x="226" y="197" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">A</text>
  <text x="360" y="134" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">B</text>
  <text x="300" y="116" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">AB direction</text>
</svg>`,
};

const lineConversionFigure: ItemFigure = {
  type: "svg",
  title: "Point-direction line model",
  description: "A point on a line and a direction vector used for vector, Cartesian, and parametric forms.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <defs>
    <marker id="arrow-u4-convert-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-u4-convert-red" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/>
    </marker>
  </defs>
  <line x1="120" y1="238" x2="444" y2="94" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-u4-convert-blue)"/>
  <circle cx="228" cy="190" r="7" fill="#dc2626"/>
  <line x1="228" y1="190" x2="326" y2="146" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-u4-convert-red)"/>
  <text x="238" y="186" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">P</text>
  <text x="316" y="138" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">direction vector</text>
  <text x="450" y="96" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">line</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Vector Basics, Components, Magnitude, and Direction Cosines",
    subtopic: "Position vectors, displacement vectors, unit vectors, direction ratios, and direction cosines",
    mc: [
      {
        questionLatex:
          "\\text{The magnitude of }2\\hat i-3\\hat j+6\\hat k\\text{ is}",
        difficulty: 2,
        skillTags: ["vector_basics", "magnitude"],
        choices: ["$5$", "$7$", "$\\sqrt{29}$", "$11$"],
        correctLetter: "B",
        hints: ["Square each component.", "Add the squares before taking the square root.", "$4+9+36=49$."],
        solution: [{ step: 1, explanation: "The magnitude is $\\sqrt{2^2+(-3)^2+6^2}=\\sqrt{49}=7$.", math: "\\sqrt{2^2+(-3)^2+6^2}=7" }],
      },
      {
        questionLatex:
          "\\text{A unit vector in the direction of }3\\hat i+4\\hat j\\text{ is}",
        difficulty: 2,
        skillTags: ["vector_basics", "unit_vector"],
        choices: ["$3\\hat i+4\\hat j$", "$\\frac45\\hat i+\\frac35\\hat j$", "$\\frac35\\hat i+\\frac45\\hat j$", "$\\frac13\\hat i+\\frac14\\hat j$"],
        correctLetter: "C",
        hints: ["Find the magnitude of $3\\hat i+4\\hat j$.", "Divide each component by the magnitude.", "The magnitude is $5$."],
        solution: [{ step: 1, explanation: "Since $|3\\hat i+4\\hat j|=5$, the unit vector is $\\frac35\\hat i+\\frac45\\hat j$.", math: "\\frac{3\\hat i+4\\hat j}{5}=\\frac35\\hat i+\\frac45\\hat j" }],
      },
      {
        questionLatex:
          "\\text{The direction cosines of the vector }\\hat i+2\\hat j+2\\hat k\\text{ are}",
        difficulty: 3,
        skillTags: ["direction_cosines", "vector_basics"],
        choices: ["$\\left(\\frac13,\\frac23,\\frac23\\right)$", "$\\left(1,2,2\\right)$", "$\\left(\\frac12,\\frac12,\\frac12\\right)$", "$\\left(\\frac23,\\frac13,\\frac23\\right)$"],
        correctLetter: "A",
        hints: ["Direction cosines are component divided by magnitude.", "Find $\\sqrt{1^2+2^2+2^2}$.", "The magnitude is $3$."],
        solution: [{ step: 1, explanation: "The magnitude is $3$, so the direction cosines are $\\left(\\frac13,\\frac23,\\frac23\\right)$.", math: "\\left(\\frac{1}{3},\\frac{2}{3},\\frac{2}{3}\\right)" }],
      },
      {
        questionLatex:
          "\\text{If }A(1,2,3)\\text{ and }B(4,6,5),\\text{ then the direction ratios of }\\overrightarrow{AB}\\text{ are}",
        difficulty: 3,
        skillTags: ["direction_ratios", "vector_basics"],
        choices: ["$(5,8,8)$", "$(3,4,2)$", "$(4,6,5)$", "$(-3,-4,-2)$"],
        correctLetter: "B",
        hints: ["Subtract the coordinates of $A$ from those of $B$.", "Direction ratios of $AB$ are $x_2-x_1,y_2-y_1,z_2-z_1$.", "$B-A=(3,4,2)$."],
        solution: [{ step: 1, explanation: "$\\overrightarrow{AB}=(4-1,6-2,5-3)=(3,4,2)$.", math: "(4-1,6-2,5-3)=(3,4,2)" }],
      },
      {
        questionLatex:
          "\\text{If }l=\\frac13\\text{ and }m=\\frac23\\text{ are direction cosines, a possible value of }n\\text{ is}",
        difficulty: 4,
        skillTags: ["direction_cosines", "identity"],
        choices: ["$\\frac13$", "$\\frac49$", "$\\frac23$", "$1$"],
        correctLetter: "C",
        hints: ["Direction cosines satisfy $l^2+m^2+n^2=1$.", "Substitute $l=1/3$ and $m=2/3$.", "Then $n^2=4/9$."],
        solution: [{ step: 1, explanation: "$n^2=1-\\frac19-\\frac49=\\frac49$, so $n=\\pm\\frac23$. A possible value is $\\frac23$.", math: "n^2=1-\\frac19-\\frac49=\\frac49" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the magnitude of }-2\\hat i+\\hat j+2\\hat k.",
        difficulty: 2,
        skillTags: ["vector_basics", "magnitude"],
        parts: singlePart("a", "Find the magnitude.", 2),
        hints: ["Use $|\\vec a|=\\sqrt{x^2+y^2+z^2}$.", "Square all three components.", "$4+1+4=9$."],
        rubric: singleRubric("a", 2, "Finds the magnitude $3$ after adding squared components."),
        commonErrors: ["Adding components directly instead of squares."],
        workedSolution: [{ part: "a", explanation: "$|-2\\hat i+\\hat j+2\\hat k|=\\sqrt{(-2)^2+1^2+2^2}=\\sqrt9=3$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Write the position vector of }P(3,-1,4).",
        difficulty: 2,
        skillTags: ["position_vector", "vector_basics"],
        parts: singlePart("a", "Write the position vector.", 2),
        hints: ["A point $(x,y,z)$ has position vector $x\\hat i+y\\hat j+z\\hat k$.", "Use the signs of the coordinates.", "The second coordinate is negative."],
        rubric: singleRubric("a", 2, "Writes $3\\hat i-\\hat j+4\\hat k$."),
        commonErrors: ["Dropping the negative sign in the $j$ component."],
        workedSolution: [{ part: "a", explanation: "The position vector of $P(3,-1,4)$ is $3\\hat i-\\hat j+4\\hat k$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the unit vector and direction cosines of }2\\hat i+\\hat j+2\\hat k.",
        difficulty: 3,
        skillTags: ["unit_vector", "direction_cosines"],
        parts: singlePart("a", "Find the unit vector and direction cosines.", 3),
        hints: ["Find the magnitude first.", "Divide every component by the magnitude.", "The magnitude is $3$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds magnitude $3$." },
            { part: "a", points: 1, description: "Writes the unit vector correctly." },
            { part: "a", points: 1, description: "States the direction cosines." },
          ],
        },
        commonErrors: ["Using the components themselves as direction cosines."],
        workedSolution: [{ part: "a", explanation: "The magnitude is $\\sqrt{4+1+4}=3$. Hence the unit vector is $\\frac23\\hat i+\\frac13\\hat j+\\frac23\\hat k$, and the direction cosines are $\\left(\\frac23,\\frac13,\\frac23\\right)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{For }A(2,-1,3)\\text{ and }B(5,3,5),\\text{ find }\\overrightarrow{AB},\\ |\\overrightarrow{AB}|\\text{ and its direction cosines.}",
        difficulty: 4,
        skillTags: ["direction_ratios", "direction_cosines", "magnitude"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\overrightarrow{AB}$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $|\\overrightarrow{AB}|$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the direction cosines.", points: 2 },
        ],
        hints: ["Subtract coordinates of $A$ from coordinates of $B$.", "Magnitude is the square root of the sum of squared components.", "Divide each component by $\\sqrt{29}$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\overrightarrow{AB}=3\\hat i+4\\hat j+2\\hat k$." },
            { part: "b", points: 1, description: "Finds magnitude $\\sqrt{29}$." },
            { part: "c", points: 2, description: "Finds all three direction cosines." },
          ],
        },
        commonErrors: ["Using $A-B$ when the question asks for $AB$.", "Forgetting to divide by the magnitude."],
        workedSolution: [
          { part: "a", explanation: "$\\overrightarrow{AB}=(5-2)\\hat i+(3+1)\\hat j+(5-3)\\hat k=3\\hat i+4\\hat j+2\\hat k$." },
          { part: "b", explanation: "$|\\overrightarrow{AB}|=\\sqrt{3^2+4^2+2^2}=\\sqrt{29}$." },
          { part: "c", explanation: "The direction cosines are $\\left(\\frac3{\\sqrt{29}},\\frac4{\\sqrt{29}},\\frac2{\\sqrt{29}}\\right)$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A drone moves from }O(0,0,0)\\text{ to }P(4,3,12)\\text{ metres. Use the vector model shown.}",
        difficulty: 4,
        skillTags: ["vector_basics", "direction_cosines", "case_based"],
        figure: vectorComponentsFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the displacement vector $\\overrightarrow{OP}$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the distance travelled in a straight line.", points: 1 },
          { letter: "c", promptMarkdown: "Find the direction cosines of $\\overrightarrow{OP}$.", points: 2 },
        ],
        hints: ["Use coordinates of $P$ for $\\overrightarrow{OP}$.", "Distance is the magnitude of the displacement vector.", "Divide each component by $13$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $4\\hat i+3\\hat j+12\\hat k$." },
            { part: "b", points: 1, description: "Finds distance $13$ m." },
            { part: "c", points: 2, description: "Finds all three direction cosines." },
          ],
        },
        commonErrors: ["Treating the components as distances to be added linearly.", "Not normalising the vector for direction cosines."],
        workedSolution: [
          { part: "a", explanation: "$\\overrightarrow{OP}=4\\hat i+3\\hat j+12\\hat k$." },
          { part: "b", explanation: "$|\\overrightarrow{OP}|=\\sqrt{4^2+3^2+12^2}=\\sqrt{169}=13$ metres." },
          { part: "c", explanation: "The direction cosines are $\\left(\\frac4{13},\\frac3{13},\\frac{12}{13}\\right)$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Vector Operations and Section Formula",
    subtopic: "Addition, scalar multiplication, parallel vectors, midpoint, and section formula",
    mc: [
      {
        questionLatex:
          "\\text{If }\\vec a=2\\hat i+\\hat j\\text{ and }\\vec b=-\\hat i+3\\hat j,\\text{ then }\\vec a+\\vec b\\text{ equals}",
        difficulty: 2,
        skillTags: ["vector_operations"],
        choices: ["$\\hat i+4\\hat j$", "$3\\hat i-2\\hat j$", "$-\\hat i+4\\hat j$", "$\\hat i-2\\hat j$"],
        correctLetter: "A",
        hints: ["Add corresponding components.", "$2+(-1)=1$.", "$1+3=4$."],
        solution: [{ step: 1, explanation: "$\\vec a+\\vec b=(2-1)\\hat i+(1+3)\\hat j=\\hat i+4\\hat j$.", math: "\\vec a+\\vec b=\\hat i+4\\hat j" }],
      },
      {
        questionLatex:
          "\\text{For }\\vec a=(1,2,3)\\text{ and }\\vec b=(2,-1,0),\\ 3\\vec a-2\\vec b\\text{ is}",
        difficulty: 2,
        skillTags: ["vector_operations"],
        choices: ["$(-1,8,9)$", "$(7,4,9)$", "$(-1,4,3)$", "$(1,8,9)$"],
        correctLetter: "A",
        hints: ["First find $3\\vec a$ and $2\\vec b$.", "Then subtract component-wise.", "$3\\vec a=(3,6,9)$ and $2\\vec b=(4,-2,0)$."],
        solution: [{ step: 1, explanation: "$3\\vec a-2\\vec b=(3,6,9)-(4,-2,0)=(-1,8,9)$.", math: "(3,6,9)-(4,-2,0)=(-1,8,9)" }],
      },
      {
        questionLatex:
          "\\text{The midpoint of }A(1,2,3)\\text{ and }B(5,6,7)\\text{ is}",
        difficulty: 3,
        skillTags: ["section_formula", "midpoint"],
        choices: ["$(6,8,10)$", "$(2,3,4)$", "$(3,4,5)$", "$(4,5,6)$"],
        correctLetter: "C",
        hints: ["Average each coordinate.", "Use $\\left(\\frac{x_1+x_2}{2},\\frac{y_1+y_2}{2},\\frac{z_1+z_2}{2}\\right)$.", "The first coordinate is $3$."],
        solution: [{ step: 1, explanation: "Midpoint $=\\left(\\frac{1+5}{2},\\frac{2+6}{2},\\frac{3+7}{2}\\right)=(3,4,5)$.", math: "(3,4,5)" }],
      },
      {
        questionLatex:
          "\\text{The point dividing }A(1,2,3)\\text{ and }B(4,5,6)\\text{ internally in the ratio }2:1\\text{ is}",
        difficulty: 3,
        skillTags: ["section_formula"],
        choices: ["$(2,3,4)$", "$(3,4,5)$", "$\\left(\\frac52,\\frac72,\\frac92\\right)$", "$(4,5,6)$"],
        correctLetter: "B",
        hints: ["Use $\\frac{mB+nA}{m+n}$ for ratio $m:n$.", "Here $m=2,n=1$.", "The first coordinate is $\\frac{2(4)+1(1)}3=3$."],
        solution: [{ step: 1, explanation: "The point is $\\left(\\frac{2\\cdot4+1\\cdot1}{3},\\frac{2\\cdot5+1\\cdot2}{3},\\frac{2\\cdot6+1\\cdot3}{3}\\right)=(3,4,5)$.", math: "(3,4,5)" }],
      },
      {
        questionLatex:
          "\\text{Which statement is true for }\\vec a=(1,2,3)\\text{ and }\\vec b=(2,4,6)?",
        difficulty: 4,
        skillTags: ["vector_operations", "parallel_vectors"],
        choices: ["$\\vec a\\text{ and }\\vec b\\text{ are perpendicular}$", "$\\vec a\\text{ and }\\vec b\\text{ are parallel}$", "$\\vec a+\\vec b=\\vec 0$", "$|\\vec a|=|\\vec b|$"],
        correctLetter: "B",
        hints: ["Check whether one vector is a scalar multiple of the other.", "Compare each component of $\\vec b$ with $\\vec a$.", "$\\vec b=2\\vec a$."],
        solution: [{ step: 1, explanation: "Since $(2,4,6)=2(1,2,3)$, the vectors are parallel.", math: "\\vec b=2\\vec a" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }(\\hat i+2\\hat j-\\hat k)+(3\\hat i-\\hat j+4\\hat k).",
        difficulty: 2,
        skillTags: ["vector_operations"],
        parts: singlePart("a", "Find the sum.", 2),
        hints: ["Add corresponding coefficients.", "For $\\hat j$, compute $2-1$.", "For $\\hat k$, compute $-1+4$."],
        rubric: singleRubric("a", 2, "Finds $4\\hat i+\\hat j+3\\hat k$."),
        commonErrors: ["Adding only the magnitudes and ignoring components."],
        workedSolution: [{ part: "a", explanation: "The sum is $(1+3)\\hat i+(2-1)\\hat j+(-1+4)\\hat k=4\\hat i+\\hat j+3\\hat k$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }-2(3\\hat i-\\hat j+2\\hat k).",
        difficulty: 2,
        skillTags: ["vector_operations", "scalar_multiplication"],
        parts: singlePart("a", "Multiply by the scalar.", 2),
        hints: ["Multiply every component by $-2$.", "The $j$ coefficient becomes positive.", "Check all signs."],
        rubric: singleRubric("a", 2, "Finds $-6\\hat i+2\\hat j-4\\hat k$."),
        commonErrors: ["Forgetting to multiply the middle component."],
        workedSolution: [{ part: "a", explanation: "$-2(3\\hat i-\\hat j+2\\hat k)=-6\\hat i+2\\hat j-4\\hat k$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the point which divides }A(1,2,3)\\text{ and }B(7,8,9)\\text{ internally in the ratio }1:2.",
        difficulty: 3,
        skillTags: ["section_formula"],
        parts: singlePart("a", "Find the internal division point.", 3),
        hints: ["Use $\\frac{mB+nA}{m+n}$.", "Here $m=1,n=2$.", "Compute each coordinate separately."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses the correct section formula." },
            { part: "a", points: 1, description: "Substitutes the ratio in the correct order." },
            { part: "a", points: 1, description: "Finds $(3,4,5)$." },
          ],
        },
        commonErrors: ["Reversing the ratio and obtaining $(5,6,7)$."],
        workedSolution: [{ part: "a", explanation: "The point is $\\frac{1B+2A}{3}=\\left(\\frac{7+2}{3},\\frac{8+4}{3},\\frac{9+6}{3}\\right)=(3,4,5)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A point }P\\text{ divides }A(2,-1,3)\\text{ and }B(8,5,0)\\text{ internally in the ratio }1:2.\\text{ Find }P\\text{ and verify the ratio using distances.}",
        difficulty: 4,
        skillTags: ["section_formula", "distance_3d"],
        parts: [
          { letter: "a", promptMarkdown: "Find the coordinates of $P$.", points: 2 },
          { letter: "b", promptMarkdown: "Verify that $AP:PB=1:2$.", points: 2 },
        ],
        hints: ["Use $P=\\frac{1B+2A}{3}$.", "Find $AP$ and $PB$ using the distance formula.", "The distances should be in the same ratio as the division."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $P(4,1,2)$." },
            { part: "b", points: 1, description: "Finds $AP=3$." },
            { part: "b", points: 1, description: "Finds $PB=6$ and verifies $1:2$." },
          ],
        },
        commonErrors: ["Using external division formula.", "Verifying with coordinate differences but not distances."],
        workedSolution: [
          { part: "a", explanation: "$P=\\frac{1(8,5,0)+2(2,-1,3)}3=\\left(4,1,2\\right)$." },
          { part: "b", explanation: "$AP=\\sqrt{2^2+2^2+(-1)^2}=3$ and $PB=\\sqrt{4^2+4^2+(-2)^2}=6$. Hence $AP:PB=1:2$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A point is displaced first by }\\vec a=2\\hat i+3\\hat j\\text{ and then by }\\vec b=-\\hat i+4\\hat j.\\text{ Use the head-to-tail sketch.}",
        difficulty: 4,
        skillTags: ["vector_operations", "resultant_vector", "case_based"],
        figure: vectorAdditionFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the resultant displacement.", points: 1 },
          { letter: "b", promptMarkdown: "Find its magnitude.", points: 1 },
          { letter: "c", promptMarkdown: "If the point starts at the origin, find its final position.", points: 2 },
        ],
        hints: ["Add the two displacement vectors.", "Magnitude comes from the resultant vector.", "The final point has coordinates equal to resultant components."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\hat i+7\\hat j$." },
            { part: "b", points: 1, description: "Finds $\\sqrt{50}$." },
            { part: "c", points: 2, description: "Finds final point $(1,7)$ with interpretation." },
          ],
        },
        commonErrors: ["Subtracting the second displacement because it has a negative $i$ component.", "Adding magnitudes instead of vectors."],
        workedSolution: [
          { part: "a", explanation: "$\\vec a+\\vec b=(2-1)\\hat i+(3+4)\\hat j=\\hat i+7\\hat j$." },
          { part: "b", explanation: "The magnitude is $\\sqrt{1^2+7^2}=\\sqrt{50}=5\\sqrt2$." },
          { part: "c", explanation: "Starting at the origin, the final point is $(1,7)$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Scalar Product, Projections, and Angles",
    subtopic: "Dot product, angle between vectors, scalar projection, vector projection, and work",
    mc: [
      {
        questionLatex:
          "\\text{If }\\vec a=(1,2,2)\\text{ and }\\vec b=(2,0,1),\\text{ then }\\vec a\\cdot\\vec b\\text{ is}",
        difficulty: 2,
        skillTags: ["dot_product"],
        choices: ["$2$", "$3$", "$4$", "$5$"],
        correctLetter: "C",
        hints: ["Multiply corresponding components.", "Add the products.", "$1\\cdot2+2\\cdot0+2\\cdot1=4$."],
        solution: [{ step: 1, explanation: "$\\vec a\\cdot\\vec b=1\\cdot2+2\\cdot0+2\\cdot1=4$.", math: "1\\cdot2+2\\cdot0+2\\cdot1=4" }],
      },
      {
        questionLatex:
          "\\text{The angle between }\\hat i+\\hat j\\text{ and }\\hat i-\\hat j\\text{ is}",
        difficulty: 2,
        skillTags: ["dot_product", "angle_between_vectors"],
        choices: ["$0^\\circ$", "$45^\\circ$", "$90^\\circ$", "$180^\\circ$"],
        correctLetter: "C",
        hints: ["Find the dot product.", "A zero dot product means perpendicular vectors.", "$(1,1)\\cdot(1,-1)=0$."],
        solution: [{ step: 1, explanation: "$(\\hat i+\\hat j)\\cdot(\\hat i-\\hat j)=1-1=0$, so the angle is $90^\\circ$.", math: "\\vec a\\cdot\\vec b=0" }],
      },
      {
        questionLatex:
          "\\text{The scalar projection of }(3,4,0)\\text{ on }(1,0,0)\\text{ is}",
        difficulty: 3,
        skillTags: ["projection", "dot_product"],
        choices: ["$3$", "$4$", "$5$", "$0$"],
        correctLetter: "A",
        hints: ["Scalar projection of $\\vec a$ on $\\vec b$ is $\\frac{\\vec a\\cdot\\vec b}{|\\vec b|}$.", "Here $|\\vec b|=1$.", "The dot product is $3$."],
        solution: [{ step: 1, explanation: "$\\frac{(3,4,0)\\cdot(1,0,0)}{|(1,0,0)|}=\\frac3{1}=3$.", math: "\\frac{3}{1}=3" }],
      },
      {
        questionLatex:
          "\\text{If two non-zero vectors have dot product }0,\\text{ then they are}",
        difficulty: 3,
        skillTags: ["dot_product", "perpendicular_vectors"],
        choices: ["parallel", "equal", "perpendicular", "opposite"],
        correctLetter: "C",
        hints: ["Use $\\vec a\\cdot\\vec b=|\\vec a||\\vec b|\\cos\\theta$.", "Non-zero magnitudes cannot make the product zero.", "So $\\cos\\theta=0$."],
        solution: [{ step: 1, explanation: "For non-zero vectors, $\\vec a\\cdot\\vec b=0$ implies $\\cos\\theta=0$, so $\\theta=90^\\circ$.", math: "\\theta=90^\\circ" }],
      },
      {
        questionLatex:
          "\\text{The angle between }(1,1,0)\\text{ and }(1,0,1)\\text{ is}",
        difficulty: 4,
        skillTags: ["dot_product", "angle_between_vectors"],
        choices: ["$30^\\circ$", "$45^\\circ$", "$60^\\circ$", "$90^\\circ$"],
        correctLetter: "C",
        hints: ["Compute $\\vec a\\cdot\\vec b$.", "Compute both magnitudes.", "Here $\\cos\\theta=\\frac{1}{2}$."],
        solution: [{ step: 1, explanation: "Dot product $=1$. Both magnitudes are $\\sqrt2$, so $\\cos\\theta=\\frac1{2}$ and $\\theta=60^\\circ$.", math: "\\cos\\theta=\\frac{1}{\\sqrt2\\sqrt2}=\\frac12" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }(2,-1,3)\\cdot(1,4,0).",
        difficulty: 2,
        skillTags: ["dot_product"],
        parts: singlePart("a", "Find the dot product.", 2),
        hints: ["Multiply corresponding components.", "Add the products.", "The third product is $0$."],
        rubric: singleRubric("a", 2, "Finds the dot product $-2$."),
        commonErrors: ["Multiplying only positive components."],
        workedSolution: [{ part: "a", explanation: "$(2,-1,3)\\cdot(1,4,0)=2-4+0=-2$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Show whether }(1,2,-1)\\text{ and }(3,-1,1)\\text{ are perpendicular.}",
        difficulty: 2,
        skillTags: ["dot_product", "perpendicular_vectors"],
        parts: singlePart("a", "Check perpendicularity.", 2),
        hints: ["Find the dot product.", "If it is $0$, the vectors are perpendicular.", "$3-2-1=0$."],
        rubric: singleRubric("a", 2, "Uses dot product and concludes perpendicular."),
        commonErrors: ["Checking equal magnitudes instead of dot product."],
        workedSolution: [{ part: "a", explanation: "$(1,2,-1)\\cdot(3,-1,1)=3-2-1=0$. Hence the vectors are perpendicular." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the angle }\\theta\\text{ between }(1,2,2)\\text{ and }(2,1,2).",
        difficulty: 3,
        skillTags: ["dot_product", "angle_between_vectors"],
        parts: singlePart("a", "Find $\\cos\\theta$ and hence the angle expression.", 3),
        hints: ["Use $\\vec a\\cdot\\vec b=|\\vec a||\\vec b|\\cos\\theta$.", "Both magnitudes are $3$.", "The dot product is $8$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds dot product $8$." },
            { part: "a", points: 1, description: "Finds both magnitudes $3$." },
            { part: "a", points: 1, description: "Finds $\\cos\\theta=8/9$." },
          ],
        },
        commonErrors: ["Dividing by only one magnitude."],
        workedSolution: [{ part: "a", explanation: "$\\vec a\\cdot\\vec b=8$, $|\\vec a|=|\\vec b|=3$. Therefore $\\cos\\theta=\\frac{8}{9}$ and $\\theta=\\cos^{-1}\\left(\\frac89\\right)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Find the scalar projection and vector projection of }\\vec a=(3,4,0)\\text{ on }\\vec b=(1,2,2).",
        difficulty: 4,
        skillTags: ["projection", "dot_product"],
        parts: [
          { letter: "a", promptMarkdown: "Find the scalar projection of $\\vec a$ on $\\vec b$.", points: 2 },
          { letter: "b", promptMarkdown: "Find the vector projection of $\\vec a$ on $\\vec b$.", points: 2 },
        ],
        hints: ["First compute $\\vec a\\cdot\\vec b$.", "For scalar projection, divide by $|\\vec b|$.", "For vector projection, multiply $\\vec b$ by $\\frac{\\vec a\\cdot\\vec b}{|\\vec b|^2}$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\vec a\\cdot\\vec b=11$ and $|\\vec b|=3$." },
            { part: "a", points: 1, description: "Finds scalar projection $11/3$." },
            { part: "b", points: 2, description: "Finds vector projection $\\frac{11}{9}(1,2,2)$." },
          ],
        },
        commonErrors: ["Using $|\\vec a|$ instead of $|\\vec b|$ for projection on $\\vec b$."],
        workedSolution: [
          { part: "a", explanation: "$\\vec a\\cdot\\vec b=3+8+0=11$ and $|\\vec b|=3$. Scalar projection $=\\frac{11}{3}$." },
          { part: "b", explanation: "Vector projection $=\\frac{\\vec a\\cdot\\vec b}{|\\vec b|^2}\\vec b=\\frac{11}{9}(1,2,2)$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A force }\\vec F=(3,4,0)\\text{ N moves an object by }\\vec s=(2,1,0)\\text{ m. Work done is }\\vec F\\cdot\\vec s.",
        difficulty: 4,
        skillTags: ["dot_product", "projection", "case_based"],
        figure: dotProductAngleFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the work done.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\cos\\theta$, where $\\theta$ is the angle between $\\vec F$ and $\\vec s$.", points: 2 },
          { letter: "c", promptMarkdown: "Find the component of $\\vec F$ along $\\vec s$.", points: 1 },
        ],
        hints: ["Work done is a dot product.", "Use $\\vec F\\cdot\\vec s=|\\vec F||\\vec s|\\cos\\theta$.", "Component along $\\vec s$ is scalar projection of $\\vec F$ on $\\vec s$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds work $10$ J." },
            { part: "b", points: 2, description: "Finds $\\cos\\theta=2/\\sqrt5$." },
            { part: "c", points: 1, description: "Finds component $2\\sqrt5$." },
          ],
        },
        commonErrors: ["Using ordinary multiplication of magnitudes instead of dot product.", "Confusing work with scalar projection."],
        workedSolution: [
          { part: "a", explanation: "$\\vec F\\cdot\\vec s=3(2)+4(1)+0=10$ J." },
          { part: "b", explanation: "$|\\vec F|=5$ and $|\\vec s|=\\sqrt5$, so $\\cos\\theta=\\frac{10}{5\\sqrt5}=\\frac2{\\sqrt5}$." },
          { part: "c", explanation: "Component of $\\vec F$ along $\\vec s$ is $\\frac{\\vec F\\cdot\\vec s}{|\\vec s|}=\\frac{10}{\\sqrt5}=2\\sqrt5$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Vector Product and Area",
    subtopic: "Cross product, perpendicular vectors, parallelogram area, triangle area, and vector area",
    mc: [
      {
        questionLatex:
          "\\hat i\\times\\hat j\\text{ equals}",
        difficulty: 2,
        skillTags: ["cross_product"],
        choices: ["$\\hat i$", "$\\hat j$", "$\\hat k$", "$-\\hat k$"],
        correctLetter: "C",
        hints: ["Use the cyclic order $\\hat i,\\hat j,\\hat k$.", "$\\hat i\\times\\hat j$ follows the positive cyclic order.", "So the result is $\\hat k$."],
        solution: [{ step: 1, explanation: "In the right-handed system, $\\hat i\\times\\hat j=\\hat k$.", math: "\\hat i\\times\\hat j=\\hat k" }],
      },
      {
        questionLatex:
          "\\text{The magnitude of }(1,0,0)\\times(0,2,0)\\text{ is}",
        difficulty: 2,
        skillTags: ["cross_product"],
        choices: ["$0$", "$1$", "$2$", "$4$"],
        correctLetter: "C",
        hints: ["The vectors are perpendicular.", "Magnitude is $|a||b|\\sin90^\\circ$.", "$1\\cdot2=2$."],
        solution: [{ step: 1, explanation: "Since the vectors are perpendicular, $|(1,0,0)\\times(0,2,0)|=1\\cdot2=2$.", math: "1\\cdot2=2" }],
      },
      {
        questionLatex:
          "\\text{The area of the parallelogram formed by }\\vec a=(1,2,0)\\text{ and }\\vec b=(3,0,0)\\text{ is}",
        difficulty: 3,
        skillTags: ["cross_product", "area_vector"],
        choices: ["$3$", "$6$", "$9$", "$12$"],
        correctLetter: "B",
        hints: ["Area of parallelogram is $|\\vec a\\times\\vec b|$.", "Compute the cross product.", "$\\vec a\\times\\vec b=(0,0,-6)$."],
        solution: [{ step: 1, explanation: "$(1,2,0)\\times(3,0,0)=(0,0,-6)$, so area is $6$.", math: "|(0,0,-6)|=6" }],
      },
      {
        questionLatex:
          "\\text{If }\\vec a\\times\\vec b=\\vec 0\\text{ for non-zero vectors }\\vec a,\\vec b,\\text{ then the vectors are}",
        difficulty: 3,
        skillTags: ["cross_product", "parallel_vectors"],
        choices: ["perpendicular", "parallel", "equal in magnitude", "opposite in direction only"],
        correctLetter: "B",
        hints: ["Use $|\\vec a\\times\\vec b|=|\\vec a||\\vec b|\\sin\\theta$.", "Non-zero magnitudes cannot make the product zero.", "So $\\sin\\theta=0$."],
        solution: [{ step: 1, explanation: "For non-zero vectors, $\\vec a\\times\\vec b=\\vec0$ implies $\\sin\\theta=0$, so the vectors are parallel.", math: "\\sin\\theta=0" }],
      },
      {
        questionLatex:
          "\\text{A vector perpendicular to both }(1,2,3)\\text{ and }(0,1,1)\\text{ is}",
        difficulty: 4,
        skillTags: ["cross_product", "normal_vector"],
        choices: ["$\\hat i+\\hat j+\\hat k$", "$-\\hat i-\\hat j+\\hat k$", "$2\\hat i+\\hat j$", "$\\hat i+2\\hat j+3\\hat k$"],
        correctLetter: "B",
        hints: ["Find the cross product.", "Use the determinant form.", "$(1,2,3)\\times(0,1,1)=(-1,-1,1)$."],
        solution: [{ step: 1, explanation: "$(1,2,3)\\times(0,1,1)=(-1,-1,1)$, so $-\\hat i-\\hat j+\\hat k$ is perpendicular to both.", math: "(1,2,3)\\times(0,1,1)=(-1,-1,1)" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }\\hat i\\times\\hat k.",
        difficulty: 2,
        skillTags: ["cross_product"],
        parts: singlePart("a", "Evaluate the cross product.", 2),
        hints: ["Recall $\\hat k\\times\\hat i=\\hat j$.", "Reversing order changes sign.", "So $\\hat i\\times\\hat k=-\\hat j$."],
        rubric: singleRubric("a", 2, "Finds $-\\hat j$."),
        commonErrors: ["Writing $\\hat j$ without accounting for order."],
        workedSolution: [{ part: "a", explanation: "Since $\\hat k\\times\\hat i=\\hat j$, reversing the order gives $\\hat i\\times\\hat k=-\\hat j$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the area of the triangle formed by vectors }(1,0,0)\\text{ and }(0,2,0).",
        difficulty: 2,
        skillTags: ["area_vector", "cross_product"],
        parts: singlePart("a", "Find the triangle area.", 2),
        hints: ["Area of triangle is half the parallelogram area.", "The vectors are perpendicular.", "Parallelogram area is $2$."],
        rubric: singleRubric("a", 2, "Finds triangle area $1$."),
        commonErrors: ["Giving parallelogram area instead of triangle area."],
        workedSolution: [{ part: "a", explanation: "$|(1,0,0)\\times(0,2,0)|=2$, so triangle area $=\\frac12(2)=1$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find }(2,1,0)\\times(0,1,3).",
        difficulty: 3,
        skillTags: ["cross_product"],
        parts: singlePart("a", "Find the vector product.", 3),
        hints: ["Use determinant expansion.", "The $i$ component is $1\\cdot3-0\\cdot1$.", "Watch the minus sign in the $j$ component."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Sets up determinant correctly." },
            { part: "a", points: 1, description: "Computes components correctly." },
            { part: "a", points: 1, description: "Finds $(3,-6,2)$." },
          ],
        },
        commonErrors: ["Missing the negative sign in the middle component."],
        workedSolution: [{ part: "a", explanation: "$(2,1,0)\\times(0,1,3)=(3,-6,2)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Find the area of triangle }ABC\\text{ where }A(1,0,0),\\ B(0,1,0),\\ C(0,0,1).",
        difficulty: 4,
        skillTags: ["area_vector", "cross_product"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\overrightarrow{AB}$ and $\\overrightarrow{AC}$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\overrightarrow{AB}\\times\\overrightarrow{AC}$.", points: 2 },
          { letter: "c", promptMarkdown: "Find the area of triangle $ABC$.", points: 1 },
        ],
        hints: ["Use two side vectors from the same vertex.", "Triangle area is half the magnitude of the cross product.", "The cross product has equal components."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $AB=(-1,1,0)$ and $AC=(-1,0,1)$." },
            { part: "b", points: 2, description: "Finds cross product $(1,1,1)$." },
            { part: "c", points: 1, description: "Finds area $\\sqrt3/2$." },
          ],
        },
        commonErrors: ["Using position vectors directly instead of side vectors.", "Forgetting the half for triangle area."],
        workedSolution: [
          { part: "a", explanation: "$\\overrightarrow{AB}=(-1,1,0)$ and $\\overrightarrow{AC}=(-1,0,1)$." },
          { part: "b", explanation: "$\\overrightarrow{AB}\\times\\overrightarrow{AC}=(1,1,1)$." },
          { part: "c", explanation: "Area $=\\frac12|(1,1,1)|=\\frac{\\sqrt3}{2}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Two adjacent sides of a parallelogram are }\\vec a=(3,0,0)\\text{ and }\\vec b=(0,4,0).",
        difficulty: 4,
        skillTags: ["cross_product", "area_vector", "case_based"],
        figure: crossProductParallelogramFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the vector area $\\vec a\\times\\vec b$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the area of the parallelogram.", points: 1 },
          { letter: "c", promptMarkdown: "Find the area of one triangle formed by a diagonal.", points: 2 },
        ],
        hints: ["Use cross product for vector area.", "Area is the magnitude of vector area.", "A diagonal divides a parallelogram into two equal triangles."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $(0,0,12)$." },
            { part: "b", points: 1, description: "Finds parallelogram area $12$." },
            { part: "c", points: 2, description: "Finds triangle area $6$ with reason." },
          ],
        },
        commonErrors: ["Using dot product for area.", "Forgetting that the triangle is half of the parallelogram."],
        workedSolution: [
          { part: "a", explanation: "$(3,0,0)\\times(0,4,0)=(0,0,12)$." },
          { part: "b", explanation: "Parallelogram area $=|(0,0,12)|=12$ square units." },
          { part: "c", explanation: "A diagonal makes two equal triangles, so each triangle has area $6$ square units." },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Lines in Three-Dimensional Geometry",
    subtopic: "Direction ratios, direction cosines, vector equation, Cartesian equation, and parametric form of lines",
    mc: [
      {
        questionLatex:
          "\\text{The direction ratios of the line through }(1,2,3)\\text{ and }(4,6,5)\\text{ are}",
        difficulty: 2,
        skillTags: ["line_3d", "direction_ratios"],
        figure: lineThroughTwoPointsFigure,
        choices: ["$(5,8,8)$", "$(3,4,2)$", "$(4,6,5)$", "$(-3,-4,-2)$"],
        correctLetter: "B",
        hints: ["Direction ratios come from coordinate differences.", "Subtract the first point from the second.", "$(4-1,6-2,5-3)$."],
        solution: [{ step: 1, explanation: "Direction ratios are $(4-1,6-2,5-3)=(3,4,2)$.", math: "(3,4,2)" }],
      },
      {
        questionLatex:
          "\\text{The symmetric equation of the line through }(1,0,-2)\\text{ with direction ratios }(2,3,4)\\text{ is}",
        difficulty: 2,
        skillTags: ["line_3d", "cartesian_line"],
        figure: lineConversionFigure,
        choices: ["$\\frac{x-1}{2}=\\frac{y}{3}=\\frac{z+2}{4}$", "$\\frac{x+1}{2}=\\frac{y}{3}=\\frac{z-2}{4}$", "$\\frac{x-1}{3}=\\frac{y}{2}=\\frac{z+2}{4}$", "$\\frac{x}{1}=\\frac{y}{0}=\\frac{z}{-2}$"],
        correctLetter: "A",
        hints: ["Use $\\frac{x-x_1}{a}=\\frac{y-y_1}{b}=\\frac{z-z_1}{c}$.", "The point is $(1,0,-2)$.", "So the $z$ numerator is $z-(-2)=z+2$."],
        solution: [{ step: 1, explanation: "Using point $(1,0,-2)$ and direction ratios $(2,3,4)$ gives $\\frac{x-1}{2}=\\frac{y}{3}=\\frac{z+2}{4}$.", math: "\\frac{x-1}{2}=\\frac{y}{3}=\\frac{z+2}{4}" }],
      },
      {
        questionLatex:
          "\\text{For }\\vec r=(\\hat i+2\\hat j-\\hat k)+\\lambda(3\\hat i-\\hat j+2\\hat k),\\text{ a point and direction ratios are}",
        difficulty: 3,
        skillTags: ["line_3d", "vector_line"],
        figure: lineConversionFigure,
        choices: ["$(3,-1,2),\\ (1,2,-1)$", "$(1,2,-1),\\ (3,-1,2)$", "$(1,2,1),\\ (3,1,2)$", "$(0,0,0),\\ (1,2,-1)$"],
        correctLetter: "B",
        hints: ["In $\\vec r=\\vec a+\\lambda\\vec b$, $\\vec a$ gives a point.", "$\\vec b$ gives direction ratios.", "Read both vectors carefully."],
        solution: [{ step: 1, explanation: "The fixed vector gives point $(1,2,-1)$ and the coefficient of $\\lambda$ gives direction ratios $(3,-1,2)$.", math: "(1,2,-1),\\ (3,-1,2)" }],
      },
      {
        questionLatex:
          "\\text{The direction cosines of a line with direction ratios }(2,1,2)\\text{ are}",
        difficulty: 3,
        skillTags: ["line_3d", "direction_cosines"],
        figure: lineConversionFigure,
        choices: ["$\\left(\\frac23,\\frac13,\\frac23\\right)$", "$\\left(2,1,2\\right)$", "$\\left(\\frac12,\\frac12,\\frac12\\right)$", "$\\left(\\frac13,\\frac23,\\frac23\\right)$"],
        correctLetter: "A",
        hints: ["Normalize the direction ratios.", "Find $\\sqrt{2^2+1^2+2^2}$.", "The magnitude is $3$."],
        solution: [{ step: 1, explanation: "The normalising factor is $3$, so direction cosines are $\\left(\\frac23,\\frac13,\\frac23\\right)$.", math: "\\left(\\frac23,\\frac13,\\frac23\\right)" }],
      },
      {
        questionLatex:
          "\\text{A line parallel to }3\\hat i-2\\hat j+\\hat k\\text{ has direction ratios}",
        difficulty: 4,
        skillTags: ["line_3d", "parallel_lines"],
        figure: lineConversionFigure,
        choices: ["$(1,1,1)$", "$(3,2,1)$", "$(3,-2,1)$", "$(-2,3,1)$"],
        correctLetter: "C",
        hints: ["A parallel line has a direction vector proportional to the given vector.", "Read the three coefficients.", "The middle coefficient is negative."],
        solution: [{ step: 1, explanation: "The direction ratios are proportional to the components of $3\\hat i-2\\hat j+\\hat k$, so one set is $(3,-2,1)$.", math: "(3,-2,1)" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Write the vector equation of the line through }(1,2,3)\\text{ with direction vector }(2,-1,4).",
        difficulty: 2,
        skillTags: ["line_3d", "vector_line"],
        figure: lineConversionFigure,
        parts: singlePart("a", "Write the vector equation.", 2),
        hints: ["Use $\\vec r=\\vec a+\\lambda\\vec b$.", "$\\vec a$ is the position vector of the point.", "$\\vec b$ is the direction vector."],
        rubric: singleRubric("a", 2, "Writes $\\vec r=(\\hat i+2\\hat j+3\\hat k)+\\lambda(2\\hat i-\\hat j+4\\hat k)$."),
        commonErrors: ["Interchanging point vector and direction vector."],
        workedSolution: [{ part: "a", explanation: "$\\vec r=(\\hat i+2\\hat j+3\\hat k)+\\lambda(2\\hat i-\\hat j+4\\hat k)$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the direction cosines of a line with direction ratios }(1,2,2).",
        difficulty: 2,
        skillTags: ["line_3d", "direction_cosines"],
        figure: lineConversionFigure,
        parts: singlePart("a", "Find the direction cosines.", 2),
        hints: ["Normalize by the magnitude of $(1,2,2)$.", "The magnitude is $3$.", "Divide each direction ratio by $3$."],
        rubric: singleRubric("a", 2, "Finds $\\left(\\frac13,\\frac23,\\frac23\\right)$."),
        commonErrors: ["Using direction ratios directly as direction cosines."],
        workedSolution: [{ part: "a", explanation: "Since $\\sqrt{1^2+2^2+2^2}=3$, the direction cosines are $\\left(\\frac13,\\frac23,\\frac23\\right)$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the Cartesian equation of the line through }A(1,0,2)\\text{ and }B(3,4,6).",
        difficulty: 3,
        skillTags: ["line_3d", "cartesian_line"],
        figure: lineThroughTwoPointsFigure,
        parts: singlePart("a", "Find the Cartesian equation.", 3),
        hints: ["Find direction ratios from $B-A$.", "Use the point $A$.", "The direction ratios are $(2,4,4)$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds direction ratios $(2,4,4)$." },
            { part: "a", points: 1, description: "Uses a correct point on the line." },
            { part: "a", points: 1, description: "Writes a correct symmetric equation." },
          ],
        },
        commonErrors: ["Using coordinates of $B$ as direction ratios."],
        workedSolution: [{ part: "a", explanation: "$\\overrightarrow{AB}=(2,4,4)$. Hence $\\frac{x-1}{2}=\\frac{y}{4}=\\frac{z-2}{4}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A line passes through }P(2,-1,3)\\text{ and is parallel to }\\hat i+2\\hat j-\\hat k.\\text{ Write its parametric equations and check whether }Q(4,3,1)\\text{ lies on it.}",
        difficulty: 4,
        skillTags: ["line_3d", "parametric_line"],
        figure: lineConversionFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the parametric equations of the line.", points: 2 },
          { letter: "b", promptMarkdown: "Check whether $Q(4,3,1)$ lies on the line.", points: 2 },
        ],
        hints: ["Use the point and direction vector.", "Parametric equations are $x=x_1+a\\lambda$, etc.", "For $Q$, all three coordinates must give the same $\\lambda$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Writes $x=2+\\lambda,y=-1+2\\lambda,z=3-\\lambda$." },
            { part: "b", points: 1, description: "Uses $x=4$ to get $\\lambda=2$." },
            { part: "b", points: 1, description: "Verifies the same $\\lambda$ for $y$ and $z$." },
          ],
        },
        commonErrors: ["Checking only one coordinate for point membership."],
        workedSolution: [
          { part: "a", explanation: "The line is $x=2+\\lambda,\\ y=-1+2\\lambda,\\ z=3-\\lambda$." },
          { part: "b", explanation: "For $Q(4,3,1)$, $4=2+\\lambda$ gives $\\lambda=2$. Then $-1+2(2)=3$ and $3-2=1$, so $Q$ lies on the line." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A drone starts at }A(1,2,3)\\text{ and flies along direction }(2,1,-1).\\text{ Its path is modelled as a line in space.}",
        difficulty: 4,
        skillTags: ["line_3d", "parametric_line", "case_based"],
        figure: line3dFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the vector equation of the path.", points: 1 },
          { letter: "b", promptMarkdown: "Find the point reached when $\\lambda=3$.", points: 2 },
          { letter: "c", promptMarkdown: "State one set of direction ratios of the path.", points: 1 },
        ],
        hints: ["Use $\\vec r=\\vec a+\\lambda\\vec b$.", "Substitute $\\lambda=3$ in each coordinate.", "Direction ratios are from the direction vector."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes the correct vector equation." },
            { part: "b", points: 2, description: "Finds $(7,5,0)$." },
            { part: "c", points: 1, description: "States $(2,1,-1)$." },
          ],
        },
        commonErrors: ["Adding the direction vector only once instead of multiplying by $\\lambda$.", "Changing the sign of the third direction ratio."],
        workedSolution: [
          { part: "a", explanation: "$\\vec r=(\\hat i+2\\hat j+3\\hat k)+\\lambda(2\\hat i+\\hat j-\\hat k)$." },
          { part: "b", explanation: "At $\\lambda=3$, the point is $(1+6,2+3,3-3)=(7,5,0)$." },
          { part: "c", explanation: "A set of direction ratios is $(2,1,-1)$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.6",
    title: "Angles, Skew Lines, and Shortest Distance",
    subtopic: "Angle between lines, parallel and skew lines, and shortest distance between lines",
    mc: [
      {
        questionLatex:
          "\\text{The angle between lines with direction ratios }(1,0,0)\\text{ and }(0,1,0)\\text{ is}",
        difficulty: 2,
        skillTags: ["angle_between_lines", "line_3d"],
        figure: angleBetweenLinesFigure,
        choices: ["$0^\\circ$", "$45^\\circ$", "$90^\\circ$", "$180^\\circ$"],
        correctLetter: "C",
        hints: ["Use the dot product of direction vectors.", "The dot product is $0$.", "A zero dot product means perpendicular directions."],
        solution: [{ step: 1, explanation: "$(1,0,0)\\cdot(0,1,0)=0$, so the angle is $90^\\circ$.", math: "\\theta=90^\\circ" }],
      },
      {
        questionLatex:
          "\\text{If two lines have direction ratios }(2,-1,2)\\text{ and }(1,2,2),\\text{ then }\\cos\\theta\\text{ is}",
        difficulty: 2,
        skillTags: ["angle_between_lines", "dot_product"],
        figure: angleBetweenLinesFigure,
        choices: ["$\\frac89$", "$\\frac13$", "$\\frac49$", "$\\frac23$"],
        correctLetter: "C",
        hints: ["Use the dot product formula for direction vectors.", "The dot product is $4$.", "Both magnitudes are $3$."],
        solution: [{ step: 1, explanation: "$\\cos\\theta=\\frac{2\\cdot1+(-1)\\cdot2+2\\cdot2}{3\\cdot3}=\\frac49$.", math: "\\cos\\theta=\\frac49" }],
      },
      {
        questionLatex:
          "\\text{The shortest distance between parallel lines }\\vec r=(1,0,0)+\\lambda(2,1,2)\\text{ and }\\vec r=(0,2,1)+\\mu(2,1,2)\\text{ is}",
        difficulty: 3,
        skillTags: ["shortest_distance", "parallel_lines"],
        figure: parallelLinesDistanceFigure,
        choices: ["$\\frac{5\\sqrt2}{3}$", "$\\frac{\\sqrt{50}}{2}$", "$3\\sqrt2$", "$\\frac23$"],
        correctLetter: "A",
        hints: ["Use the parallel-lines distance formula.", "Let $\\vec a_2-\\vec a_1=(-1,2,1)$ and $\\vec b=(2,1,2)$.", "Compute $\\frac{|(\\vec a_2-\\vec a_1)\\times\\vec b|}{|\\vec b|}$."],
        solution: [{ step: 1, explanation: "$(-1,2,1)\\times(2,1,2)=(3,4,-5)$, so the distance is $\\frac{\\sqrt{3^2+4^2+(-5)^2}}{3}=\\frac{5\\sqrt2}{3}$.", math: "\\frac{\\sqrt{50}}{3}=\\frac{5\\sqrt2}{3}" }],
      },
      {
        questionLatex:
          "\\text{The lines }\\vec r=(1,0,2)+\\lambda(1,-1,1)\\text{ and }\\vec r=(0,2,1)+\\mu(2,1,3)\\text{ are}",
        difficulty: 3,
        skillTags: ["skew_lines", "line_3d"],
        figure: skewLinesFigure,
        choices: ["intersecting", "parallel", "skew", "coincident"],
        correctLetter: "C",
        hints: ["Compare direction vectors first.", "They are not scalar multiples.", "Equating coordinates leads to inconsistent parameter values."],
        solution: [{ step: 1, explanation: "The direction vectors $(1,-1,1)$ and $(2,1,3)$ are not parallel. Solving the three coordinate equations gives inconsistent values, so the lines do not intersect. Hence they are skew.", math: "\\text{not parallel and no common point}" }],
      },
      {
        questionLatex:
          "\\text{The shortest distance between }\\vec r=\\lambda(1,1,0)\\text{ and }\\vec r=(0,0,3)+\\mu(1,0,2)\\text{ is}",
        difficulty: 4,
        skillTags: ["shortest_distance", "skew_lines"],
        figure: skewLinesFigure,
        choices: ["$\\frac13$", "$1$", "$3$", "$\\sqrt3$"],
        correctLetter: "B",
        hints: ["Use shortest distance of skew lines.", "Here $\\vec b_1\\times\\vec b_2=(2,-2,-1)$.", "Use the point difference $(0,0,3)$."],
        solution: [{ step: 1, explanation: "$\\vec b_1\\times\\vec b_2=(1,1,0)\\times(1,0,2)=(2,-2,-1)$. Thus $d=\\frac{|(0,0,3)\\cdot(2,-2,-1)|}{\\sqrt{4+4+1}}=\\frac3{3}=1$.", math: "d=\\frac3{3}=1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the angle between two lines directed along }\\hat i\\text{ and }\\hat j.",
        difficulty: 2,
        skillTags: ["angle_between_lines"],
        figure: angleBetweenLinesFigure,
        parts: singlePart("a", "Find the angle.", 2),
        hints: ["Use the dot product.", "$\\hat i\\cdot\\hat j=0$.", "Zero dot product means $90^\\circ$."],
        rubric: singleRubric("a", 2, "Finds $90^\\circ$."),
        commonErrors: ["Assuming coordinate axes are parallel."],
        workedSolution: [{ part: "a", explanation: "$\\hat i\\cdot\\hat j=0$, so the angle between the lines is $90^\\circ$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the shortest distance between }\\vec r=\\lambda\\hat i\\text{ and }\\vec r=2\\hat j+\\lambda\\hat i.",
        difficulty: 2,
        skillTags: ["shortest_distance", "parallel_lines"],
        figure: parallelLinesDistanceFigure,
        parts: singlePart("a", "Find the distance.", 2),
        hints: ["The lines are parallel to the $x$-axis.", "Compare the fixed points $(0,0,0)$ and $(0,2,0)$.", "Distance is $2$."],
        rubric: singleRubric("a", 2, "Finds shortest distance $2$."),
        commonErrors: ["Using the parameter $\\lambda$ as a distance."],
        workedSolution: [{ part: "a", explanation: "The lines are parallel and differ only by $2\\hat j$, so the shortest distance is $|2\\hat j|=2$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find }\\cos\\theta\\text{ for the angle between lines with direction ratios }(2,1,2)\\text{ and }(1,2,0).",
        difficulty: 3,
        skillTags: ["angle_between_lines", "dot_product"],
        figure: angleBetweenLinesFigure,
        parts: singlePart("a", "Find $\\cos\\theta$.", 3),
        hints: ["Use the dot product of direction vectors.", "The dot product is $4$.", "The magnitudes are $3$ and $\\sqrt5$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds dot product $4$." },
            { part: "a", points: 1, description: "Finds magnitudes $3$ and $\\sqrt5$." },
            { part: "a", points: 1, description: "Finds $\\cos\\theta=\\frac{4}{3\\sqrt5}$." },
          ],
        },
        commonErrors: ["Using cross product formula for angle but not completing the conversion."],
        workedSolution: [{ part: "a", explanation: "$\\cos\\theta=\\frac{2\\cdot1+1\\cdot2+2\\cdot0}{\\sqrt{2^2+1^2+2^2}\\sqrt{1^2+2^2}}=\\frac{4}{3\\sqrt5}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Show that }L_1:\\vec r=(1,0,0)+\\lambda(1,-1,1)\\text{ and }L_2:\\vec r=(0,2,1)+\\mu(2,1,-1)\\text{ are skew lines and find their shortest distance.}",
        difficulty: 5,
        skillTags: ["skew_lines", "shortest_distance"],
        figure: skewLinesFigure,
        parts: [
          { letter: "a", promptMarkdown: "Show that the lines are not parallel.", points: 1 },
          { letter: "b", promptMarkdown: "Show that the lines do not intersect.", points: 1 },
          { letter: "c", promptMarkdown: "Find the shortest distance.", points: 3 },
        ],
        hints: ["Compare direction vectors $(1,-1,1)$ and $(2,1,-1)$.", "Write a general point on each line and compare coordinates.", "Use $d=\\frac{|(\\vec a_2-\\vec a_1)\\cdot(\\vec b_1\\times\\vec b_2)|}{|\\vec b_1\\times\\vec b_2|}$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Shows direction vectors are not parallel." },
            { part: "b", points: 1, description: "Shows no common point exists." },
            { part: "c", points: 1, description: "Computes $\\vec b_1\\times\\vec b_2=(0,3,3)$." },
            { part: "c", points: 2, description: "Finds shortest distance $3/\\sqrt2$." },
          ],
        },
        commonErrors: ["Calling the lines intersecting because their drawn projections cross.", "Using distance between arbitrary points instead of shortest distance."],
        workedSolution: [
          { part: "a", explanation: "The direction vectors $(1,-1,1)$ and $(2,1,-1)$ are not scalar multiples, so the lines are not parallel." },
          { part: "b", explanation: "A point on $L_1$ is $(1+\\lambda,-\\lambda,\\lambda)$ and a point on $L_2$ is $(2\\mu,2+\mu,1-\\mu)$. Equating the $y$ and $z$ coordinates gives an inconsistency, so the lines do not intersect. Hence they are skew." },
          { part: "c", explanation: "Here $\\vec a_2-\\vec a_1=(-1,2,1)$ and $(1,-1,1)\\times(2,1,-1)=(0,3,3)$. Thus $d=\\frac{|(-1,2,1)\\cdot(0,3,3)|}{\\sqrt{0^2+3^2+3^2}}=\\frac9{3\\sqrt2}=\\frac3{\\sqrt2}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Two drone paths are modelled by }L_1:\\vec r=(1,0,0)+\\lambda(2,1,1)\\text{ and }L_2:\\vec r=(0,2,1)+\\mu(1,-1,2).",
        difficulty: 4,
        skillTags: ["skew_lines", "shortest_distance", "case_based"],
        figure: skewLinesFigure,
        parts: [
          { letter: "a", promptMarkdown: "State whether the direction vectors are parallel.", points: 1 },
          { letter: "b", promptMarkdown: "Explain whether the paths intersect.", points: 1 },
          { letter: "c", promptMarkdown: "Find the shortest distance between the paths.", points: 2 },
        ],
        hints: ["Compare $(2,1,1)$ and $(1,-1,2)$.", "Compare general points on both lines.", "Use the skew-line shortest distance formula."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States direction vectors are not parallel." },
            { part: "b", points: 1, description: "Explains the paths do not intersect." },
            { part: "c", points: 2, description: "Finds shortest distance $4/\\sqrt3$." },
          ],
        },
        commonErrors: ["Assuming the paths meet because the 2D sketch appears to cross.", "Forgetting the denominator in the shortest-distance formula."],
        workedSolution: [
          { part: "a", explanation: "The direction vectors $(2,1,1)$ and $(1,-1,2)$ are not scalar multiples, so the paths are not parallel." },
          { part: "b", explanation: "Solving $(1+2\\lambda,\\lambda,\\lambda)=(\\mu,2-\\mu,1+2\\mu)$ gives inconsistent parameter values, so the paths do not intersect." },
          { part: "c", explanation: "$(2,1,1)\\times(1,-1,2)=(3,-3,-3)$ and $\\vec a_2-\\vec a_1=(-1,2,1)$. Hence $d=\\frac{|(-1,2,1)\\cdot(3,-3,-3)|}{\\sqrt{3^2+(-3)^2+(-3)^2}}=\\frac{12}{3\\sqrt3}=\\frac4{\\sqrt3}$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.7",
    title: "Line Forms and Conversion in Three-Dimensional Geometry",
    subtopic: "Lines through two points, vector-Cartesian conversion, parametric form, and point membership",
    mc: [
      {
        questionLatex:
          "\\text{The vector equation of the line through }A(1,2,-1)\\text{ and }B(3,1,2)\\text{ is}",
        difficulty: 2,
        skillTags: ["line_3d", "two_point_line", "vector_line"],
        figure: lineThroughTwoPointsFigure,
        choices: ["$\\vec r=(\\hat i+2\\hat j-\\hat k)+\\lambda(2\\hat i-\\hat j+3\\hat k)$", "$\\vec r=(2\\hat i-\\hat j+3\\hat k)+\\lambda(\\hat i+2\\hat j-\\hat k)$", "$\\vec r=(\\hat i+2\\hat j+\\hat k)+\\lambda(2\\hat i+\\hat j+3\\hat k)$", "$\\vec r=(3\\hat i+\\hat j+2\\hat k)+\\lambda(\\hat i+2\\hat j-\\hat k)$"],
        correctLetter: "A",
        hints: ["Use $\\vec r=\\vec a+\\lambda\\vec b$.", "Find $\\overrightarrow{AB}=B-A$.", "$\\overrightarrow{AB}=(2,-1,3)$."],
        solution: [{ step: 1, explanation: "$\\overrightarrow{AB}=(3-1,1-2,2+1)=(2,-1,3)$, so $\\vec r=(\\hat i+2\\hat j-\\hat k)+\\lambda(2\\hat i-\\hat j+3\\hat k)$.", math: "\\vec r=(\\hat i+2\\hat j-\\hat k)+\\lambda(2\\hat i-\\hat j+3\\hat k)" }],
      },
      {
        questionLatex:
          "\\text{The Cartesian form of }\\vec r=(2,-1,3)+\\lambda(1,4,-2)\\text{ is}",
        difficulty: 2,
        skillTags: ["line_3d", "cartesian_line", "vector_cartesian_conversion"],
        figure: lineConversionFigure,
        choices: ["$\\frac{x-2}{1}=\\frac{y+1}{4}=\\frac{z-3}{-2}$", "$\\frac{x+2}{1}=\\frac{y-1}{4}=\\frac{z+3}{-2}$", "$\\frac{x-1}{2}=\\frac{y-4}{-1}=\\frac{z+2}{3}$", "$\\frac{x-2}{4}=\\frac{y+1}{1}=\\frac{z-3}{-2}$"],
        correctLetter: "A",
        hints: ["Use point $(2,-1,3)$ and direction ratios $(1,4,-2)$.", "The $y$ numerator is $y-(-1)$.", "The $z$ denominator is negative."],
        solution: [{ step: 1, explanation: "The Cartesian form is $\\frac{x-2}{1}=\\frac{y+1}{4}=\\frac{z-3}{-2}$.", math: "\\frac{x-2}{1}=\\frac{y+1}{4}=\\frac{z-3}{-2}" }],
      },
      {
        questionLatex:
          "\\text{Which point lies on }\\frac{x-1}{2}=\\frac{y+2}{-1}=\\frac{z-3}{3}?",
        difficulty: 3,
        skillTags: ["line_3d", "point_on_line"],
        figure: lineConversionFigure,
        choices: ["$(3,-3,6)$", "$(5,-4,9)$", "$(1,-2,3)$", "$(4,-5,8)$"],
        correctLetter: "B",
        hints: ["Set the common value equal to $\\lambda$.", "Then $x=1+2\\lambda$, $y=-2-\\lambda$, $z=3+3\\lambda$.", "Use $\\lambda=2$."],
        solution: [{ step: 1, explanation: "For $\\lambda=2$, the point is $(1+4,-2-2,3+6)=(5,-4,9)$.", math: "(5,-4,9)" }],
      },
      {
        questionLatex:
          "\\text{If }P(5,1,7)\\text{ lies on }\\vec r=(1,-1,3)+\\lambda(2,1,2),\\text{ then }\\lambda\\text{ is}",
        difficulty: 3,
        skillTags: ["line_3d", "point_on_line", "parametric_line"],
        figure: lineConversionFigure,
        choices: ["$1$", "$2$", "$3$", "$4$"],
        correctLetter: "B",
        hints: ["Use one coordinate equation first.", "$5=1+2\\lambda$.", "Check the same value in the other coordinates."],
        solution: [{ step: 1, explanation: "$5=1+2\\lambda$ gives $\\lambda=2$. This also gives $y=-1+2=1$ and $z=3+4=7$.", math: "\\lambda=2" }],
      },
      {
        questionLatex:
          "\\text{The line through }A(2,0,1),B(5,3,4)\\text{ and the line through }C(0,1,-1),D(3,4,2)\\text{ are}",
        difficulty: 4,
        skillTags: ["line_3d", "parallel_lines", "two_point_line"],
        figure: lineThroughTwoPointsFigure,
        choices: ["parallel", "perpendicular", "coincident", "skew"],
        correctLetter: "A",
        hints: ["Find direction vector $AB$.", "Find direction vector $CD$.", "Compare the two direction vectors."],
        solution: [{ step: 1, explanation: "$\\overrightarrow{AB}=(3,3,3)$ and $\\overrightarrow{CD}=(3,3,3)$. Since the direction vectors are equal, the lines are parallel.", math: "\\overrightarrow{AB}=\\overrightarrow{CD}=(3,3,3)" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Write the vector equation of the line through }A(-1,2,0)\\text{ and }B(2,5,6).",
        difficulty: 2,
        skillTags: ["line_3d", "two_point_line", "vector_line"],
        figure: lineThroughTwoPointsFigure,
        parts: singlePart("a", "Write the vector equation.", 2),
        hints: ["Find $B-A$.", "Use point $A$ as the fixed point.", "$B-A=(3,3,6)$."],
        rubric: singleRubric("a", 2, "Writes a correct vector equation with direction $(3,3,6)$."),
        commonErrors: ["Using $A+B$ as the direction vector."],
        workedSolution: [{ part: "a", explanation: "$\\overrightarrow{AB}=(3,3,6)$, so $\\vec r=(-\\hat i+2\\hat j)+\\lambda(3\\hat i+3\\hat j+6\\hat k)$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Convert }\\frac{x+1}{2}=\\frac{y-3}{-1}=\\frac{z}{4}\\text{ into vector form.}",
        difficulty: 2,
        skillTags: ["line_3d", "vector_cartesian_conversion"],
        figure: lineConversionFigure,
        parts: singlePart("a", "Write the vector form.", 2),
        hints: ["Read the point from the numerators.", "$x+1=x-(-1)$ and $z=z-0$.", "Read the direction ratios from denominators."],
        rubric: singleRubric("a", 2, "Writes $\\vec r=(-\\hat i+3\\hat j)+\\lambda(2\\hat i-\\hat j+4\\hat k)$."),
        commonErrors: ["Taking the point as $(1,-3,0)$ instead of $(-1,3,0)$."],
        workedSolution: [{ part: "a", explanation: "The point is $(-1,3,0)$ and direction vector is $(2,-1,4)$. Hence $\\vec r=(-\\hat i+3\\hat j)+\\lambda(2\\hat i-\\hat j+4\\hat k)$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the direction cosines of the line through }A(1,-2,3)\\text{ and }B(4,0,9).",
        difficulty: 3,
        skillTags: ["line_3d", "direction_cosines", "two_point_line"],
        figure: lineThroughTwoPointsFigure,
        parts: singlePart("a", "Find the direction cosines.", 3),
        hints: ["Find the direction ratios $B-A$.", "The direction ratios are $(3,2,6)$.", "Normalize by the magnitude."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds direction ratios $(3,2,6)$." },
            { part: "a", points: 1, description: "Finds magnitude $7$." },
            { part: "a", points: 1, description: "Finds direction cosines $\\left(\\frac37,\\frac27,\\frac67\\right)$." },
          ],
        },
        commonErrors: ["Using coordinates of one point as direction ratios."],
        workedSolution: [{ part: "a", explanation: "$\\overrightarrow{AB}=(3,2,6)$ and its magnitude is $\\sqrt{9+4+36}=7$. The direction cosines are $\\left(\\frac37,\\frac27,\\frac67\\right)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{For the line through }A(2,1,-1)\\text{ and }B(5,4,2),\\text{ write vector and Cartesian forms, and check whether }P(8,7,5)\\text{ lies on it.}",
        difficulty: 4,
        skillTags: ["line_3d", "two_point_line", "vector_cartesian_conversion", "point_on_line"],
        figure: lineThroughTwoPointsFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find a direction vector and write the vector form.", points: 2 },
          { letter: "b", promptMarkdown: "Write the Cartesian form.", points: 1 },
          { letter: "c", promptMarkdown: "Check whether $P(8,7,5)$ lies on the line.", points: 2 },
        ],
        hints: ["Find $B-A$.", "Use point $A$ and direction $(3,3,3)$.", "Check whether $P-A$ is a scalar multiple of $(3,3,3)$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds direction vector $(3,3,3)$." },
            { part: "a", points: 1, description: "Writes correct vector form." },
            { part: "b", points: 1, description: "Writes correct Cartesian form." },
            { part: "c", points: 2, description: "Shows $P$ lies on the line using a common parameter." },
          ],
        },
        commonErrors: ["Testing point membership with only one coordinate.", "Forgetting the negative coordinate in point $A$."],
        workedSolution: [
          { part: "a", explanation: "$\\overrightarrow{AB}=(3,3,3)$. Vector form: $\\vec r=(2\\hat i+\\hat j-\\hat k)+\\lambda(3\\hat i+3\\hat j+3\\hat k)$." },
          { part: "b", explanation: "Cartesian form: $\\frac{x-2}{3}=\\frac{y-1}{3}=\\frac{z+1}{3}$." },
          { part: "c", explanation: "For $P(8,7,5)$, $P-A=(6,6,6)=2(3,3,3)$, so $P$ lies on the line." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A straight communication cable is stretched from }A(1,2,0)\\text{ to }B(4,6,8).\\text{ Model the cable as a line segment in space.}",
        difficulty: 4,
        skillTags: ["line_3d", "two_point_line", "case_based"],
        figure: lineThroughTwoPointsFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the direction ratios of the cable.", points: 1 },
          { letter: "b", promptMarkdown: "Write the vector equation of the line containing the cable.", points: 2 },
          { letter: "c", promptMarkdown: "Find the midpoint of the cable.", points: 1 },
        ],
        hints: ["Direction ratios are $B-A$.", "Use $\\vec r=\\vec a+\\lambda\\vec b$.", "Midpoint is the average of endpoint coordinates."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds direction ratios $(3,4,8)$." },
            { part: "b", points: 2, description: "Writes the correct vector equation." },
            { part: "c", points: 1, description: "Finds midpoint $\\left(\\frac52,4,4\\right)$." },
          ],
        },
        commonErrors: ["Using endpoint $B$ as the direction vector.", "Forgetting to average all three coordinates for the midpoint."],
        workedSolution: [
          { part: "a", explanation: "$\\overrightarrow{AB}=(4-1,6-2,8-0)=(3,4,8)$." },
          { part: "b", explanation: "The line is $\\vec r=(\\hat i+2\\hat j)+\\lambda(3\\hat i+4\\hat j+8\\hat k)$." },
          { part: "c", explanation: "The midpoint is $\\left(\\frac{1+4}{2},\\frac{2+6}{2},\\frac{0+8}{2}\\right)=\\left(\\frac52,4,4\\right)$." },
        ],
      },
    ],
  },
];

export const vectors3dTopics: Topic[] = topicSeeds.map(makeTopic);
