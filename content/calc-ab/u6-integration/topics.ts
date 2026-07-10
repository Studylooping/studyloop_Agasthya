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
const UNIT = "u6-integration";
const VERSION = "0.1.8";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
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

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("riemann_sum") || tags.has("trapezoidal_sum")) {
    return "You likely used the wrong subinterval width, endpoint, or area formula for the approximation.";
  }
  if (tags.has("summation_notation") || tags.has("definite_integral_notation")) {
    return "You likely matched the sum to the wrong interval, sample point, or differential width.";
  }
  if (tags.has("accumulation") || tags.has("signed_area")) {
    return "You likely confused accumulated change with a rate value, or ignored signed area below the axis.";
  }
  if (tags.has("geometric_area")) {
    return "You likely used the wrong geometric area formula or missed that a definite integral can be read as signed area.";
  }
  if (tags.has("ftc_accumulation") || tags.has("accumulation_derivative")) {
    return "You likely confused the accumulation function with its derivative, or missed the chain rule on the upper or lower limit.";
  }
  if (tags.has("integral_properties")) {
    return "You likely used additivity, reversal of limits, or linearity with the wrong sign or scale factor.";
  }
  if (tags.has("definite_integral") || tags.has("ftc_evaluation")) {
    return "You likely evaluated the antiderivative at the bounds in the wrong order or used the wrong antiderivative.";
  }
  if (tags.has("antiderivative") || tags.has("particular_solution")) {
    return "You likely missed the constant of integration, used the power rule backward incorrectly, or did not apply the initial condition.";
  }
  if (tags.has("substitution")) {
    return "You likely chose a useful substitution but did not transform the differential, integrand, or bounds consistently.";
  }
  if (tags.has("algebraic_integration")) {
    return "You likely skipped the algebraic rewrite needed before integrating.";
  }
  if (tags.has("technique_selection")) {
    return "You likely chose a method before checking the structure of the integrand.";
  }

  return "Your choice misses the decisive integration step for this question.";
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math
    ? ` Recheck this step: $${keyStep.math}$.`
    : "";

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
        : seed.rationales?.[seedLetter] ??
          fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_integration_reasoning",
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
    ...choice,
  })) as McChoice[];
  const correctChoice = choices.find((choice) => choice.isCorrect);
  const correctLetter = correctChoice?.letter ?? seed.correctLetter;

  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(
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
      "confuses_integral_with_integrand",
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

function makeFrq(meta: TopicMeta, seed: FrqSeed): FrqItem {
  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFrqDifficulty(seed.difficulty),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_integral_without_interpretation",
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
      makeFrq(meta, seed.frq),
    ],
  };
}

const signedAreaFigure: ItemFigure = {
  type: "svg",
  title: "Signed area sketch",
  description:
    "A graph with one region above the x-axis and one region below the x-axis.",
  svg: `<svg viewBox="0 0 640 320" role="img" aria-label="Signed area graph with positive and negative regions">
  <rect width="640" height="320" rx="18" fill="#f8fafc"/>
  <line x1="70" y1="190" x2="585" y2="190" stroke="#64748b" stroke-width="3"/>
  <line x1="90" y1="270" x2="90" y2="50" stroke="#64748b" stroke-width="3"/>
  <path d="M 585 190 L 572 183 M 585 190 L 572 197 M 90 50 L 83 63 M 90 50 L 97 63" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="595" y="197" fill="#475569" font-size="20">t</text>
  <text x="99" y="58" fill="#475569" font-size="20">r</text>
  <path d="M 120 190 C 170 92 240 92 300 190" fill="#dcfce7" stroke="#16a34a" stroke-width="4"/>
  <path d="M 300 190 C 365 265 460 265 540 190" fill="#fee2e2" stroke="#dc2626" stroke-width="4"/>
  <text x="196" y="143" fill="#166534" font-size="22">8</text>
  <text x="410" y="238" fill="#991b1b" font-size="22">3</text>
</svg>`,
};

const rectangleAreaFigure: ItemFigure = {
  type: "svg",
  title: "Rectangle area under a rate graph",
  description:
    "A constant positive graph forming a rectangle above the horizontal axis.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Constant graph y equals 4 from t equals 0 to t equals 6">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <line x1="80" y1="280" x2="585" y2="280" stroke="#64748b" stroke-width="3"/>
  <line x1="110" y1="310" x2="110" y2="55" stroke="#64748b" stroke-width="3"/>
  <path d="M 585 280 L 572 273 M 585 280 L 572 287 M 110 55 L 103 68 M 110 55 L 117 68" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="595" y="287" fill="#475569" font-size="20">t</text>
  <text x="120" y="63" fill="#475569" font-size="20">r</text>
  <rect x="110" y="100" width="420" height="180" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="110" y1="100" x2="530" y2="100" stroke="#1d4ed8" stroke-width="5"/>
  <text x="104" y="305" fill="#334155" font-size="18">0</text>
  <text x="524" y="305" fill="#334155" font-size="18">6</text>
  <text x="86" y="106" fill="#334155" font-size="18">4</text>
</svg>`,
};

const triangleAreaFigure: ItemFigure = {
  type: "svg",
  title: "Triangle area under a graph",
  description:
    "A line segment from the origin to a positive endpoint forming a triangle with the horizontal axis.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Line segment from zero zero to six six with triangular area beneath it">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <line x1="80" y1="280" x2="585" y2="280" stroke="#64748b" stroke-width="3"/>
  <line x1="110" y1="310" x2="110" y2="55" stroke="#64748b" stroke-width="3"/>
  <path d="M 585 280 L 572 273 M 585 280 L 572 287 M 110 55 L 103 68 M 110 55 L 117 68" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="595" y="287" fill="#475569" font-size="20">x</text>
  <text x="120" y="63" fill="#475569" font-size="20">f</text>
  <path d="M 110 280 L 530 70 L 530 280 Z" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <line x1="110" y1="280" x2="530" y2="70" stroke="#166534" stroke-width="5"/>
  <text x="104" y="305" fill="#334155" font-size="18">0</text>
  <text x="524" y="305" fill="#334155" font-size="18">6</text>
  <text x="536" y="76" fill="#334155" font-size="18">6</text>
</svg>`,
};

const semicircleAreaFigure: ItemFigure = {
  type: "svg",
  title: "Semicircle area under a graph",
  description:
    "The upper half of a circle of radius 3 above the horizontal axis.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Upper semicircle of radius three from x equals negative three to x equals three">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <line x1="80" y1="260" x2="585" y2="260" stroke="#64748b" stroke-width="3"/>
  <line x1="320" y1="310" x2="320" y2="55" stroke="#64748b" stroke-width="3"/>
  <path d="M 585 260 L 572 253 M 585 260 L 572 267 M 320 55 L 313 68 M 320 55 L 327 68" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="595" y="267" fill="#475569" font-size="20">x</text>
  <text x="330" y="63" fill="#475569" font-size="20">f</text>
  <path d="M 140 260 A 180 180 0 0 1 500 260 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="4"/>
  <path d="M 140 260 A 180 180 0 0 1 500 260" fill="none" stroke="#0369a1" stroke-width="5"/>
  <line x1="320" y1="260" x2="320" y2="80" stroke="#0ea5e9" stroke-width="3" stroke-dasharray="8 8"/>
  <text x="128" y="285" fill="#334155" font-size="18">-3</text>
  <text x="316" y="285" fill="#334155" font-size="18">0</text>
  <text x="492" y="285" fill="#334155" font-size="18">3</text>
  <text x="330" y="174" fill="#075985" font-size="18">r=3</text>
</svg>`,
};

const trapezoidAreaFigure: ItemFigure = {
  type: "svg",
  title: "Trapezoid area under a graph",
  description:
    "A line segment above the horizontal axis forming a trapezoid.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Line segment from height two to height five over interval zero to four">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <line x1="80" y1="290" x2="585" y2="290" stroke="#64748b" stroke-width="3"/>
  <line x1="120" y1="315" x2="120" y2="55" stroke="#64748b" stroke-width="3"/>
  <path d="M 585 290 L 572 283 M 585 290 L 572 297 M 120 55 L 113 68 M 120 55 L 127 68" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="595" y="297" fill="#475569" font-size="20">x</text>
  <text x="130" y="63" fill="#475569" font-size="20">f</text>
  <path d="M 120 220 L 480 115 L 480 290 L 120 290 Z" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <line x1="120" y1="220" x2="480" y2="115" stroke="#b45309" stroke-width="5"/>
  <text x="114" y="315" fill="#334155" font-size="18">0</text>
  <text x="474" y="315" fill="#334155" font-size="18">4</text>
  <text x="95" y="225" fill="#334155" font-size="18">2</text>
  <text x="486" y="120" fill="#334155" font-size="18">5</text>
</svg>`,
};

const introductoryAreaFrqFigure: ItemFigure = {
  type: "svg",
  title: "Composite signed area graph",
  description:
    "A graph made from a rectangle, a semicircle, and a triangle for signed area reasoning.",
  svg: `<svg viewBox="0 0 720 470" role="img" aria-label="Composite graph with rectangle from zero to two, upper semicircle from two to six, and triangle below the axis from six to nine">
  <rect width="720" height="470" rx="18" fill="#f8fafc"/>
  <line x1="70" y1="240" x2="675" y2="240" stroke="#64748b" stroke-width="3"/>
  <line x1="110" y1="445" x2="110" y2="55" stroke="#64748b" stroke-width="3"/>
  <path d="M 675 240 L 662 233 M 675 240 L 662 247 M 110 55 L 103 68 M 110 55 L 117 68" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="685" y="247" fill="#475569" font-size="20">x</text>
  <text x="120" y="63" fill="#475569" font-size="20">f</text>
  <rect x="110" y="105" width="90" height="135" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="110" y1="105" x2="200" y2="105" stroke="#1d4ed8" stroke-width="5"/>
  <path d="M 200 240 A 90 90 0 0 1 380 240 Z" fill="#dcfce7" stroke="#16a34a" stroke-width="4"/>
  <path d="M 200 240 A 90 90 0 0 1 380 240" fill="none" stroke="#166534" stroke-width="5"/>
  <line x1="290" y1="240" x2="290" y2="150" stroke="#16a34a" stroke-width="3" stroke-dasharray="8 8"/>
  <path d="M 380 240 L 515 240 L 447.5 420 Z" fill="#fee2e2" stroke="#dc2626" stroke-width="4"/>
  <text x="104" y="263" fill="#334155" font-size="18">0</text>
  <text x="194" y="263" fill="#334155" font-size="18">2</text>
  <text x="284" y="263" fill="#334155" font-size="18">4</text>
  <text x="374" y="263" fill="#334155" font-size="18">6</text>
  <text x="509" y="263" fill="#334155" font-size="18">9</text>
  <text x="84" y="111" fill="#334155" font-size="18">3</text>
  <text x="455" y="423" fill="#991b1b" font-size="18">-4</text>
  <text x="153" y="88" fill="#1e3a8a" font-size="18">3</text>
  <text x="301" y="194" fill="#166534" font-size="18">2</text>
  <text x="486" y="333" fill="#991b1b" font-size="18">4</text>
</svg>`,
};

const riemannFigure: ItemFigure = {
  type: "svg",
  title: "Riemann sum sketch",
  description:
    "A graph of f(x)=x squared on [0,4] with four left-endpoint rectangles.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Left endpoint Riemann sum with four rectangles">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <line x1="70" y1="300" x2="590" y2="300" stroke="#64748b" stroke-width="3"/>
  <line x1="100" y1="300" x2="100" y2="45" stroke="#64748b" stroke-width="3"/>
  <path d="M 590 300 L 577 293 M 590 300 L 577 307 M 100 45 L 93 58 M 100 45 L 107 58" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="600" y="307" fill="#475569" font-size="20">x</text>
  <text x="110" y="54" fill="#475569" font-size="20">f</text>
  <line x1="120" y1="300" x2="215" y2="300" stroke="#2563eb" stroke-width="5"/>
  <rect x="215" y="286" width="95" height="14" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="310" y="244" width="95" height="56" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="405" y="174" width="95" height="126" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <path d="M 120 300 C 190 296 265 277 310 244 C 365 204 430 123 500 76" stroke="#111827" stroke-width="5" fill="none" stroke-linecap="round"/>
  <text x="115" y="325" fill="#334155" font-size="18">0</text>
  <text x="210" y="325" fill="#334155" font-size="18">1</text>
  <text x="305" y="325" fill="#334155" font-size="18">2</text>
  <text x="400" y="325" fill="#334155" font-size="18">3</text>
  <text x="493" y="325" fill="#334155" font-size="18">4</text>
  <text x="84" y="291" fill="#334155" font-size="16">1</text>
  <text x="84" y="249" fill="#334155" font-size="16">4</text>
  <text x="84" y="179" fill="#334155" font-size="16">9</text>
</svg>`,
};

const accumulationGraphFigure: ItemFigure = {
  type: "svg",
  title: "Graph for accumulation function",
  description:
    "A piecewise linear graph of f for reasoning about A(x) equals an initial value plus an integral of f.",
  svg: `<svg viewBox="0 0 700 380" role="img" aria-label="Piecewise linear graph of f">
  <rect width="700" height="380" rx="18" fill="#f8fafc"/>
  <line x1="80" y1="230" x2="650" y2="230" stroke="#64748b" stroke-width="3"/>
  <line x1="100" y1="315" x2="100" y2="55" stroke="#64748b" stroke-width="3"/>
  <path d="M 650 230 L 637 223 M 650 230 L 637 237 M 100 55 L 93 68 M 100 55 L 107 68" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="660" y="237" fill="#475569" font-size="20">x</text>
  <text x="110" y="63" fill="#475569" font-size="20">f</text>
  <path d="M 100 230 L 250 90 L 400 230 L 475 300 L 550 230 L 625 160" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="100" cy="230" r="5" fill="#2563eb"/>
  <circle cx="250" cy="90" r="5" fill="#2563eb"/>
  <circle cx="400" cy="230" r="5" fill="#2563eb"/>
  <circle cx="475" cy="300" r="5" fill="#2563eb"/>
  <circle cx="550" cy="230" r="5" fill="#2563eb"/>
  <circle cx="625" cy="160" r="5" fill="#2563eb"/>
  <text x="95" y="255" fill="#334155" font-size="18">0</text>
  <text x="245" y="255" fill="#334155" font-size="18">2</text>
  <text x="395" y="255" fill="#334155" font-size="18">4</text>
  <text x="470" y="255" fill="#334155" font-size="18">5</text>
  <text x="545" y="255" fill="#334155" font-size="18">6</text>
  <text x="620" y="255" fill="#334155" font-size="18">7</text>
  <text x="70" y="96" fill="#334155" font-size="18">4</text>
  <text x="68" y="306" fill="#334155" font-size="18">-2</text>
</svg>`,
};

const accumulationDerivativeLadderFigure: ItemFigure = {
  type: "svg",
  title: "Accumulation, integrand, and derivative sketches",
  description:
    "Three aligned sketches show A, f, and f prime on the same interval with A prime equal to f and A double prime equal to f prime.",
  svg: `<svg viewBox="0 0 720 600" role="img" aria-label="Aligned graphs of A, f, and f prime">
  <rect width="720" height="600" rx="18" fill="#f8fafc"/>
  <line x1="90" y1="185" x2="660" y2="185" stroke="#94a3b8" stroke-width="2"/>
  <line x1="90" y1="330" x2="660" y2="330" stroke="#94a3b8" stroke-width="2"/>
  <line x1="90" y1="505" x2="660" y2="505" stroke="#94a3b8" stroke-width="2"/>
  <line x1="90" y1="50" x2="90" y2="558" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="185" y1="50" x2="185" y2="558" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 7"/>
  <line x1="280" y1="50" x2="280" y2="558" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 7"/>
  <line x1="470" y1="50" x2="470" y2="558" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 7"/>
  <line x1="565" y1="50" x2="565" y2="558" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 7"/>
  <line x1="660" y1="50" x2="660" y2="558" stroke="#cbd5e1" stroke-width="2"/>
  <text x="40" y="112" fill="#1d4ed8" font-size="22">A</text>
  <text x="43" y="285" fill="#7c3aed" font-size="22">f</text>
  <text x="36" y="472" fill="#dc2626" font-size="22">f'</text>
  <text x="84" y="582" fill="#334155" font-size="18">0</text>
  <text x="179" y="582" fill="#334155" font-size="18">1</text>
  <text x="274" y="582" fill="#334155" font-size="18">2</text>
  <text x="464" y="582" fill="#334155" font-size="18">4</text>
  <text x="559" y="582" fill="#334155" font-size="18">5</text>
  <text x="654" y="582" fill="#334155" font-size="18">6</text>
  <text x="665" y="508" fill="#475569" font-size="18">x</text>
  <path d="M 90 160 C 125 174 158 178 185 175 C 218 172 250 161 280 160 L 470 100 C 505 90 535 85 565 85 C 600 86 632 95 660 100" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="185" cy="175" r="6" fill="#2563eb"/>
  <circle cx="565" cy="85" r="6" fill="#2563eb"/>
  <path d="M 90 400 L 185 330 L 280 260 L 470 260 L 565 330 L 660 400" stroke="#7c3aed" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="185" cy="330" r="6" fill="#7c3aed"/>
  <circle cx="565" cy="330" r="6" fill="#7c3aed"/>
  <text x="65" y="266" fill="#334155" font-size="18">2</text>
  <text x="62" y="406" fill="#334155" font-size="18">-2</text>
  <path d="M 105 455 L 265 455" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
  <path d="M 295 505 L 455 505" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
  <path d="M 485 555 L 645 555" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
  <circle cx="280" cy="455" r="6" fill="#f8fafc" stroke="#dc2626" stroke-width="4"/>
  <circle cx="280" cy="505" r="6" fill="#f8fafc" stroke="#dc2626" stroke-width="4"/>
  <circle cx="470" cy="505" r="6" fill="#f8fafc" stroke="#dc2626" stroke-width="4"/>
  <circle cx="470" cy="555" r="6" fill="#f8fafc" stroke="#dc2626" stroke-width="4"/>
  <text x="63" y="461" fill="#334155" font-size="18">2</text>
  <text x="63" y="511" fill="#334155" font-size="18">0</text>
  <text x="58" y="561" fill="#334155" font-size="18">-2</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Exploring Accumulations of Change",
    subtopic:
      "Understanding definite integrals as geometric and signed area",
    mc: [
      {
        questionLatex:
          "\\text{The graph of }r\\text{ is shown for }0\\le t\\le6.\\text{ Which value is represented by }\\int_0^6 r(t)\\,dt?",
        difficulty: 2,
        skillTags: ["accumulation", "geometric_area", "units"],
        figure: rectangleAreaFigure,
        choices: [
          "$24\\text{ units of accumulated change}$",
          "$4\\text{ units of accumulated change}$",
          "$6\\text{ units of accumulated change}$",
          "$10\\text{ units of accumulated change}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is only the rectangle height, so it gives the rate value instead of the accumulated area.",
          C: "This is only the rectangle width, so it gives the time interval instead of the accumulated area.",
          D: "This adds the height and width; area comes from multiplying them.",
        },
        hints: [
          "A definite integral can be read as signed area between the graph and the horizontal axis.",
          "Use the width and height shown in the figure.",
          "Rectangle area is base times height: $6\\cdot4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Read the shaded region as a rectangle under the rate graph.",
            math: "\\text{base}=6,\\quad \\text{height}=4",
          },
          {
            step: 2,
            explanation: "The accumulated change is the area.",
            math: "6\\cdot4=24",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f\\text{ is shown for }0\\le x\\le6.\\text{ What is }\\int_0^6 f(x)\\,dx?",
        difficulty: 2,
        skillTags: ["accumulation", "geometric_area", "triangle_area"],
        figure: triangleAreaFigure,
        choices: ["$18$", "$36$", "$12$", "$6$"],
        correctLetter: "A",
        rationales: {
          B: "This multiplies base and height but forgets the factor $1/2$ for a triangle.",
          C: "This adds the base and height instead of finding area.",
          D: "This uses only one dimension of the triangle.",
        },
        hints: [
          "Because the graph is above the axis, the integral is positive area.",
          "Identify the geometric region formed by the graph and the horizontal axis.",
          "Triangle area is $\\frac12 bh$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the triangle area formula.",
            math: "\\frac12(6)(6)",
          },
          {
            step: 2,
            explanation: "Evaluate the area.",
            math: "18",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f\\text{ is shown for }-3\\le x\\le3.\\text{ What is }\\int_{-3}^{3} f(x)\\,dx?",
        difficulty: 3,
        skillTags: ["accumulation", "geometric_area", "semicircle_area"],
        figure: semicircleAreaFigure,
        choices: ["$\\frac{9\\pi}{2}$", "$9\\pi$", "$6\\pi$", "$18$"],
        correctLetter: "A",
        rationales: {
          B: "This is the area of the full circle, but the graph shows only the upper half.",
          C: "This uses diameter information incorrectly instead of $\\frac12\\pi r^2$.",
          D: "This uses base times height like a triangle or rectangle, but the region is curved.",
        },
        hints: [
          "The region is above the axis, so the integral is positive area.",
          "Use the circular arc and the radius marked in the figure.",
          "The shaded area is half of $\\pi(3)^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the semicircle area formula.",
            math: "\\frac12\\pi r^2",
          },
          {
            step: 2,
            explanation: "Substitute $r=3$.",
            math: "\\frac12\\pi(3)^2=\\frac{9\\pi}{2}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f\\text{ is shown for }0\\le x\\le4.\\text{ What is }\\int_0^4 f(x)\\,dx?",
        difficulty: 3,
        skillTags: ["accumulation", "geometric_area", "trapezoid_area"],
        figure: trapezoidAreaFigure,
        choices: [
          "$14$",
          "$28$",
          "$7$",
          "$20$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This multiplies the sum of the parallel sides by the width but forgets the factor $1/2$.",
          C: "This averages the parallel sides but does not multiply by the width.",
          D: "This multiplies only the larger height by the width, as if the whole region were a rectangle.",
        },
        hints: [
          "The graph is above the axis, so the integral is the shaded area.",
          "Use the two vertical lengths and the interval width shown in the figure.",
          "Compute $\\frac12(2+5)(4)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the trapezoid area formula.",
            math: "\\frac12(b_1+b_2)h",
          },
          {
            step: 2,
            explanation: "Substitute the two vertical side lengths and the width.",
            math: "\\frac12(2+5)(4)=14",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }r\\text{ is shown for }0\\le t\\le6.\\text{ The numbers in the regions give their geometric areas. What is }\\int_0^6 r(t)\\,dt?",
        difficulty: 4,
        skillTags: ["signed_area", "accumulation", "graph_interpretation"],
        figure: signedAreaFigure,
        choices: ["$5$", "$11$", "$-5$", "$24$"],
        correctLetter: "A",
        hints: [
          "Area below the axis counts negatively in a definite integral.",
          "Signed area is positive area minus negative-region area.",
          "Compute $8-3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use signed area: above-axis area is positive and below-axis area is negative.",
            math: "\\int_0^6 r(t)\\,dt=8-3",
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: "5",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The figure shows the graph of }f\\text{ on }0\\le x\\le9.\\text{ Selected lengths are marked in the figure.}",
      difficulty: 4,
      skillTags: ["accumulation", "geometric_area", "signed_area", "graph_interpretation"],
      figure: introductoryAreaFrqFigure,
      parts: [
        { letter: "a", promptMarkdown: "Find $\\int_0^2 f(x)\\,dx$.", points: 1 },
        { letter: "b", promptMarkdown: "Find $\\int_2^6 f(x)\\,dx$.", points: 2 },
        { letter: "c", promptMarkdown: "Find $\\int_6^9 f(x)\\,dx$.", points: 1 },
        { letter: "d", promptMarkdown: "Find $\\int_0^9 f(x)\\,dx$. Justify your answer using the graph.", points: 2 },
      ],
      hints: [
        "Evaluate each integral by interpreting it as signed area from the graph.",
        "Area above the axis is positive; area below the axis is negative.",
        "Use the marked lengths to compute the geometric areas of each region.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Computes the rectangle area as 6." },
          { part: "b", points: 1, description: "Recognizes the region as a semicircle of radius 2." },
          { part: "b", points: 1, description: "Computes the semicircle area as $2\\pi$." },
          { part: "c", points: 1, description: "Computes the triangle contribution as $-6$." },
          { part: "d", points: 1, description: "Adds signed areas to get $2\\pi$." },
          { part: "d", points: 1, description: "Explains that below-axis area counts negatively." },
        ],
      },
      commonErrors: [
        "Counting the below-axis triangle as positive area.",
        "Using full-circle area instead of semicircle area.",
        "Trying to find an antiderivative even though the graph is geometric.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "On $[0,2]$, the graph forms a rectangle with width $2$ and height $3$, so $\\int_0^2 f(x)\\,dx=2\\cdot3=6$.",
        },
        {
          part: "b",
          explanation:
            "On $[2,6]$, the graph is an upper semicircle of radius $2$, so the signed area is $\\frac12\\pi(2)^2=2\\pi$.",
        },
        {
          part: "c",
          explanation:
            "On $[6,9]$, the graph forms a triangle below the axis with base $3$ and height $4$, so the signed area is $-\\frac12(3)(4)=-6$.",
        },
        {
          part: "d",
          explanation:
            "Add the signed areas: $6+2\\pi-6=2\\pi$. The triangle contributes negatively because it lies below the $x$-axis.",
        },
      ],
    },
  },
  {
    topicCode: "6.2",
    title: "Approximating Areas with Riemann Sums",
    subtopic:
      "Using left, right, midpoint, and trapezoidal approximations",
    mc: [
      {
        questionLatex:
          "\\text{For }f(x)=x^2\\text{ on }[0,4],\\text{ what is the left Riemann sum with }4\\text{ equal subintervals?}",
        difficulty: 2,
        skillTags: ["riemann_sum", "left_endpoint"],
        figure: riemannFigure,
        choices: ["$14$", "$30$", "$16$", "$21$"],
        correctLetter: "A",
        hints: [
          "The width is $\\Delta x=1$.",
          "Use left endpoints $0,1,2,3$.",
          "Compute $1[f(0)+f(1)+f(2)+f(3)]$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use left endpoints.",
            math: "1(0^2+1^2+2^2+3^2)",
          },
          {
            step: 2,
            explanation: "Add the rectangle areas.",
            math: "0+1+4+9=14",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cccc}x&0&1&3&4\\\\ \\hline f(x)&2&5&4&6\\end{array}\\quad\\text{Using right endpoints on the listed subintervals, approximate }\\int_0^4 f(x)\\,dx.",
        difficulty: 2,
        skillTags: ["riemann_sum", "right_endpoint", "unequal_subintervals"],
        choices: ["$19$", "$17$", "$23$", "$13$"],
        correctLetter: "A",
        hints: [
          "The subintervals are $[0,1]$, $[1,3]$, and $[3,4]$.",
          "Use the right endpoint height on each subinterval.",
          "Widths are $1$, $2$, and $1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Multiply each width by its right endpoint height.",
            math: "1f(1)+2f(3)+1f(4)",
          },
          {
            step: 2,
            explanation: "Substitute table values.",
            math: "1(5)+2(4)+1(6)=19",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A midpoint sum on }[0,6]\\text{ uses three subintervals of width }2.\\text{ If midpoint values are }3,5,4,\\text{ what is the approximation?}",
        difficulty: 3,
        skillTags: ["riemann_sum", "midpoint_rule"],
        choices: ["$24$", "$12$", "$18$", "$30$"],
        correctLetter: "A",
        hints: [
          "Each rectangle has width $2$.",
          "Use the three midpoint heights.",
          "Compute $2(3+5+4)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set up the midpoint sum.",
            math: "2(3+5+4)",
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: "24",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f\\text{ is increasing and positive on }[a,b],\\text{ which statement about a left Riemann sum with equal widths is true?}",
        difficulty: 3,
        skillTags: ["riemann_sum", "error_analysis"],
        choices: [
          "It underestimates $\\int_a^b f(x)\\,dx$.",
          "It overestimates $\\int_a^b f(x)\\,dx$.",
          "It is always exact.",
          "It must be negative.",
        ],
        correctLetter: "A",
        hints: [
          "For an increasing function, left endpoint heights are smaller than values to their right.",
          "Each left rectangle lies below the curve on its subinterval.",
          "Positive area does not change the underestimate direction.",
        ],
        solution: [
          {
            step: 1,
            explanation: "On each subinterval, the left endpoint gives the smallest height.",
            math: "L_n<\\int_a^b f(x)\\,dx",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f\\text{ is concave up on }[a,b],\\text{ what is true about the trapezoidal approximation for }\\int_a^b f(x)\\,dx?",
        difficulty: 4,
        skillTags: ["trapezoidal_sum", "concavity", "error_analysis"],
        choices: [
          "It overestimates the integral.",
          "It underestimates the integral.",
          "It is always exact.",
          "It equals the midpoint approximation.",
        ],
        correctLetter: "A",
        hints: [
          "For concave up graphs, secant lines lie above the curve.",
          "Trapezoids use secant segments as tops.",
          "So trapezoid area is above the true area.",
        ],
        solution: [
          {
            step: 1,
            explanation: "A concave up curve lies below its secant lines.",
            math: "T_n>\\int_a^b f(x)\\,dx",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\begin{array}{c|ccccc}t&0&2&5&7&10\\\\ \\hline v(t)&3&7&4&-1&2\\end{array}\\quad\\text{The table gives velocity }v(t)\\text{ in meters per second.}",
      difficulty: 4,
      skillTags: ["riemann_sum", "trapezoidal_sum", "velocity", "table_approximation"],
      parts: [
        { letter: "a", promptMarkdown: "Use a left Riemann sum on the listed subintervals to approximate displacement on $[0,10]$.", points: 2 },
        { letter: "b", promptMarkdown: "Use the trapezoidal rule on the listed subintervals to approximate displacement on $[0,10]$.", points: 2 },
        { letter: "c", promptMarkdown: "Explain why these are displacement approximations, not total distance approximations.", points: 1 },
      ],
      hints: [
        "Widths are not all equal.",
        "Left sum uses the velocity at the left endpoint of each listed interval.",
        "Displacement uses signed velocity values.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Uses correct left endpoint heights and widths." },
          { part: "a", points: 1, description: "Computes left sum as 32." },
          { part: "b", points: 1, description: "Uses trapezoidal averages correctly." },
          { part: "b", points: 1, description: "Computes trapezoidal approximation as 31." },
          { part: "c", points: 1, description: "Explains that negative velocity contributes signed displacement." },
        ],
      },
      commonErrors: [
        "Using equal widths even though table intervals are unequal.",
        "Using right endpoints for a left sum.",
        "Taking absolute values and accidentally approximating distance.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Left sum: $2(3)+3(7)+2(4)+3(-1)=6+21+8-3=32$ meters.",
        },
        {
          part: "b",
          explanation:
            "Trapezoidal rule: $2(3+7)/2+3(7+4)/2+2(4+(-1))/2+3((-1)+2)/2=10+16.5+3+1.5=31$ meters.",
        },
        {
          part: "c",
          explanation:
            "These approximations use signed velocity values. Total distance would require integrating or approximating $|v(t)|$, not $v(t)$.",
        },
      ],
    },
  },
  {
    topicCode: "6.3",
    title: "Riemann Sums, Summation Notation, and Definite Integral Notation",
    subtopic:
      "Connecting finite sums, limits of sums, and definite integrals",
    mc: [
      {
        questionLatex:
          "\\text{Which definite integral is represented by }\\lim_{n\\to\\infty}\\sum_{i=1}^n\\left(3+\\frac{2i}{n}\\right)^2\\frac{2}{n}\\text{?}",
        difficulty: 2,
        skillTags: ["summation_notation", "definite_integral_notation"],
        choices: ["$\\int_3^5 x^2\\,dx$", "$\\int_0^2 x^2\\,dx$", "$\\int_3^5 2x\\,dx$", "$\\int_0^n x^2\\,dx$"],
        correctLetter: "A",
        hints: [
          "The width is $\\Delta x=2/n$.",
          "The sample point is $x_i=3+2i/n$.",
          "The interval begins at $3$ and has length $2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the interval and integrand.",
            math: "x_i=3+\\frac{2i}{n},\\quad \\Delta x=\\frac2n",
          },
          {
            step: 2,
            explanation: "This is the definite integral over $[3,5]$.",
            math: "\\int_3^5 x^2\\,dx",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which left Riemann sum with }3\\text{ equal subintervals represents }\\int_0^6 f(x)\\,dx\\text{?}",
        difficulty: 2,
        skillTags: ["riemann_sum", "definite_integral_notation"],
        choices: [
          "$2[f(0)+f(2)+f(4)]$",
          "$2[f(2)+f(4)+f(6)]$",
          "$3[f(0)+f(3)+f(6)]$",
          "$6[f(0)+f(2)+f(4)]$",
        ],
        correctLetter: "A",
        hints: [
          "The width is $(6-0)/3=2$.",
          "Left endpoints are $0$, $2$, and $4$.",
          "Multiply the sum of heights by $2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find width and left endpoints.",
            math: "\\Delta x=2,\\quad x=0,2,4",
          },
          {
            step: 2,
            explanation: "Write the left sum.",
            math: "2[f(0)+f(2)+f(4)]",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }\\int_1^7 f(x)\\,dx\\text{ approximated with }12\\text{ equal subintervals, what is }\\Delta x\\text{?}",
        difficulty: 3,
        skillTags: ["riemann_sum", "delta_x"],
        choices: ["$\\frac12$", "$2$", "$\\frac16$", "$6$"],
        correctLetter: "A",
        hints: [
          "Use $\\Delta x=(b-a)/n$.",
          "Here $b-a=6$.",
          "Divide by $12$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the subinterval width.",
            math: "\\Delta x=\\frac{7-1}{12}=\\frac12",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For a midpoint Riemann sum for }\\int_0^4 f(x)\\,dx\\text{ with }8\\text{ subintervals, which expression gives the }i\\text{th midpoint?}",
        difficulty: 3,
        skillTags: ["riemann_sum", "midpoint_rule", "summation_notation"],
        choices: [
          "$\\frac{i-\\frac12}{2}$",
          "$\\frac{i}{2}$",
          "$\\frac{i-1}{2}$",
          "$4+\\frac{i}{8}$",
        ],
        correctLetter: "A",
        hints: [
          "$\\Delta x=4/8=1/2$.",
          "The midpoint of the $i$th interval is $a+(i-1/2)\\Delta x$.",
          "Here $a=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the midpoint formula.",
            math: "x_i^*=0+\\left(i-\\frac12\\right)\\frac12=\\frac{i-\\frac12}{2}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which definite integral is represented by }\\lim_{n\\to\\infty}\\sum_{i=1}^n\\frac1n\\left(1+\\frac{i}{n}\\right)^3\\text{?}",
        difficulty: 4,
        skillTags: ["summation_notation", "definite_integral_notation"],
        choices: ["$\\int_1^2 x^3\\,dx$", "$\\int_0^1 x^3\\,dx$", "$\\int_1^2 3x^2\\,dx$", "$\\int_0^n \\left(1+\\frac{x}{n}\\right)^3\\,dx$"],
        correctLetter: "A",
        rationales: {
          B: "This uses the width $1/n$ but misses that the sample points start at $1+1/n$ and end near $2$.",
          C: "This differentiates $x^3$ instead of preserving the integrand represented by the summand.",
          D: "A definite integral should have fixed bounds and a fixed integrand, not a bound or integrand still depending on $n$.",
        },
        hints: [
          "The width is $1/n$.",
          "The sample point runs from $1$ to $2$.",
          "The integrand is the cube of the sample point.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the width, sample point, interval, and integrand.",
            math: "\\Delta x=\\frac1n,\\quad x_i=1+\\frac{i}{n},\\quad 1\\le x\\le2",
          },
          {
            step: 2,
            explanation: "Write the represented definite integral.",
            math: "\\int_1^2 x^3\\,dx",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Consider }\\int_2^8 \\sqrt{1+x^3}\\,dx.",
      difficulty: 4,
      skillTags: ["summation_notation", "definite_integral_notation", "riemann_sum"],
      parts: [
        { letter: "a", promptMarkdown: "Write $\\Delta x$ for a right Riemann sum with $n$ equal subintervals.", points: 1 },
        { letter: "b", promptMarkdown: "Write the right endpoint $x_i$ for the $i$th subinterval.", points: 1 },
        { letter: "c", promptMarkdown: "Write the definite integral as a limit of right Riemann sums.", points: 2 },
      ],
      hints: [
        "The interval length is $8-2=6$.",
        "Right endpoints have the form $a+i\\Delta x$.",
        "The summand is $f(x_i)\\Delta x$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Writes $\\Delta x=6/n$." },
          { part: "b", points: 1, description: "Writes $x_i=2+6i/n$." },
          { part: "c", points: 1, description: "Uses correct integrand at $x_i$." },
          { part: "c", points: 1, description: "Includes limit and $\\Delta x$ factor." },
        ],
      },
      commonErrors: [
        "Using $8/n$ instead of $(8-2)/n$.",
        "Using left endpoints after being asked for right endpoints.",
        "Forgetting the $\\Delta x$ factor.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$\\Delta x=\\frac{8-2}{n}=\\frac6n$.",
        },
        {
          part: "b",
          explanation:
            "The right endpoint is $x_i=2+i\\Delta x=2+\\frac{6i}{n}$.",
        },
        {
          part: "c",
          explanation:
            "$\\int_2^8 \\sqrt{1+x^3}\\,dx=\\lim_{n\\to\\infty}\\sum_{i=1}^n \\sqrt{1+\\left(2+\\frac{6i}{n}\\right)^3}\\cdot\\frac6n$.",
        },
      ],
    },
  },
  {
    topicCode: "6.4",
    title: "The Fundamental Theorem of Calculus and Accumulation Functions",
    subtopic:
      "Differentiating accumulation functions with variable limits",
    mc: [
      {
        questionLatex:
          "\\text{Let }G(x)=\\int_1^x (t^3+2t)\\,dt.\\text{ What is }G'(x)\\text{?}",
        difficulty: 2,
        skillTags: ["ftc_accumulation", "accumulation_derivative"],
        choices: ["$x^3+2x$", "$3x^2+2$", "$t^3+2t$", "$\\int_1^x(3t^2+2)\\,dt$"],
        correctLetter: "A",
        hints: [
          "FTC Part 1 says derivative of an accumulation function is the integrand at the upper limit.",
          "Replace $t$ with $x$.",
          "Do not differentiate the integrand.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the Fundamental Theorem of Calculus.",
            math: "G'(x)=x^3+2x",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }H(x)=\\int_0^{x^2}\\cos(t^3)\\,dt.\\text{ What is }H'(x)\\text{?}",
        difficulty: 2,
        skillTags: ["ftc_accumulation", "chain_rule"],
        choices: ["$2x\\cos(x^6)$", "$\\cos(x^6)$", "$2x\\cos(x^3)$", "$-\\sin(x^6)$"],
        correctLetter: "A",
        hints: [
          "Use FTC, then multiply by the derivative of the upper limit.",
          "The integrand evaluated at $t=x^2$ is $\\cos((x^2)^3)$.",
          "The derivative of $x^2$ is $2x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the integrand at the upper limit and apply chain rule.",
            math: "H'(x)=\\cos((x^2)^3)\\cdot2x=2x\\cos(x^6)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }K(x)=\\int_x^4 e^{t^2}\\,dt.\\text{ What is }K'(x)\\text{?}",
        difficulty: 3,
        skillTags: ["ftc_accumulation", "lower_limit"],
        choices: ["$-e^{x^2}$", "$e^{x^2}$", "$2xe^{x^2}$", "$0$"],
        correctLetter: "A",
        hints: [
          "A variable lower limit introduces a negative sign.",
          "Rewrite $\\int_x^4=-\\int_4^x$ if helpful.",
          "Then apply FTC.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rewrite with the variable as the upper limit.",
            math: "K(x)=-\\int_4^x e^{t^2}\\,dt",
          },
          {
            step: 2,
            explanation: "Differentiate.",
            math: "K'(x)=-e^{x^2}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }A(x)=\\int_2^x f(t)\\,dt.\\text{ If }f(3)=-5,\\text{ what is }A'(3)\\text{?}",
        difficulty: 3,
        skillTags: ["ftc_accumulation", "table_value"],
        choices: ["$-5$", "$5$", "$0$", "$\\int_2^3 f(t)\\,dt$"],
        correctLetter: "A",
        hints: [
          "The derivative of the accumulation function is the integrand.",
          "$A'(x)=f(x)$.",
          "Substitute $x=3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use FTC Part 1.",
            math: "A'(3)=f(3)=-5",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }F(x)=\\int_0^{\\sin x}\\sqrt{1+t^2}\\,dt.\\text{ What is }F'(x)\\text{?}",
        difficulty: 4,
        skillTags: ["ftc_accumulation", "chain_rule", "trig"],
        choices: [
          "$\\cos x\\sqrt{1+\\sin^2 x}$",
          "$\\sqrt{1+\\sin^2 x}$",
          "$\\sin x\\sqrt{1+\\cos^2 x}$",
          "$\\frac{\\sin x}{\\sqrt{1+\\sin^2x}}$",
        ],
        correctLetter: "A",
        hints: [
          "Evaluate the integrand at $t=\\sin x$.",
          "Multiply by the derivative of $\\sin x$.",
          "The chain factor is $\\cos x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply FTC with chain rule.",
            math: "F'(x)=\\sqrt{1+(\\sin x)^2}\\cdot\\cos x",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }F(x)=\\int_1^{x^2}(t^2-4)\\,dt.",
      difficulty: 4,
      skillTags: ["ftc_accumulation", "chain_rule", "second_derivative"],
      parts: [
        { letter: "a", promptMarkdown: "Find $F'(x)$.", points: 2 },
        { letter: "b", promptMarkdown: "Find $F'(2)$.", points: 1 },
        { letter: "c", promptMarkdown: "Find $F''(x)$.", points: 2 },
      ],
      hints: [
        "The upper limit is $x^2$, so use the chain rule.",
        "Evaluate $t^2-4$ at $t=x^2$.",
        "Then differentiate your expression for $F'(x)$.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Evaluates integrand at $x^2$." },
          { part: "a", points: 1, description: "Includes chain factor $2x$." },
          { part: "b", points: 1, description: "Computes $F'(2)=48$." },
          { part: "c", points: 1, description: "Expands or differentiates $2x(x^4-4)$ correctly." },
          { part: "c", points: 1, description: "Finds $F''(x)=10x^4-8$." },
        ],
      },
      commonErrors: [
        "Forgetting the chain-rule factor $2x$.",
        "Substituting $x$ instead of $x^2$ into the integrand.",
        "Trying to evaluate the integral before differentiating.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$F'(x)=( (x^2)^2-4)(2x)=2x(x^4-4)$.",
        },
        {
          part: "b",
          explanation:
            "$F'(2)=2(2)(2^4-4)=4(12)=48$.",
        },
        {
          part: "c",
          explanation:
            "$F'(x)=2x^5-8x$, so $F''(x)=10x^4-8$.",
        },
      ],
    },
  },
  {
    topicCode: "6.5",
    title: "Interpreting the Behavior of Accumulation Functions Involving Area",
    subtopic:
      "Using the graph of an integrand to analyze an accumulation function",
    mc: [
      {
        questionLatex:
          "\\text{Let }A(x)=\\int_0^x f(t)\\,dt.\\text{ If }f>0\\text{ on }(0,2)\\text{ and }f<0\\text{ on }(2,5),\\text{ what is true about }A?",
        difficulty: 2,
        skillTags: ["accumulation_derivative", "signed_area"],
        choices: [
          "$A$ increases on $(0,2)$ and decreases on $(2,5)$.",
          "$A$ decreases on $(0,2)$ and increases on $(2,5)$.",
          "$A$ is concave up on both intervals.",
          "$A$ is constant on both intervals.",
        ],
        correctLetter: "A",
        hints: [
          "By FTC, $A'(x)=f(x)$.",
          "Positive derivative means increasing.",
          "Negative derivative means decreasing.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use $A'(x)=f(x)$.",
            math: "f>0\\Rightarrow A\\text{ increasing},\\quad f<0\\Rightarrow A\\text{ decreasing}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }A(x)=\\int_0^x f(t)\\,dt.\\text{ If }f\\text{ changes from positive to negative at }x=2,\\text{ what happens to }A\\text{ at }x=2?",
        difficulty: 2,
        skillTags: ["accumulation_derivative", "local_extrema"],
        choices: [
          "$A$ has a local maximum at $x=2$.",
          "$A$ has a local minimum at $x=2$.",
          "$A$ has a vertical tangent at $x=2$.",
          "$A(2)=0$.",
        ],
        correctLetter: "A",
        hints: [
          "$A'(x)=f(x)$.",
          "A positive-to-negative change in $A'$ gives a local maximum.",
          "You do not need $A(2)$ to classify the extremum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Since $A'=f$, the sign of $f$ is the sign of $A'$.",
            math: "+\\to-\\text{ at }x=2\\Rightarrow\\text{local maximum}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The aligned graphs shown satisfy }A'(x)=f(x)\\text{ and }A''(x)=f'(x).\\text{ On which interval is }A\\text{ increasing and concave down?}",
        difficulty: 3,
        skillTags: [
          "accumulation_derivative",
          "graph_interpretation",
          "concavity",
          "derivative_ladder",
        ],
        figure: accumulationDerivativeLadderFigure,
        choices: [
          "$(0,1)$",
          "$(1,2)$",
          "$(2,4)$",
          "$(4,5)$",
        ],
        correctLetter: "D",
        rationales: {
          A: "On $(0,1)$, the graph of $f$ is below the x-axis, so $A'(x)=f(x)<0$ and $A$ is decreasing, not increasing.",
          B: "On $(1,2)$, $f>0$ so $A$ is increasing, but $f'>0$, so $A''>0$ and $A$ is concave up.",
          C: "On $(2,4)$, $f>0$ so $A$ is increasing, but $f'=0$, so the graph of $A$ is linear rather than concave down.",
        },
        hints: [
          "Increasing requires $A'(x)>0$.",
          "Concave down requires $A''(x)<0$.",
          "Use $A'(x)=f(x)$ and $A''(x)=f'(x)$ together.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For $A$ to increase, the middle graph must show $f(x)>0$.",
            math: "A'(x)=f(x)>0",
          },
          {
            step: 2,
            explanation:
              "For $A$ to be concave down, the bottom graph must show $f'(x)<0$.",
            math: "A''(x)=f'(x)<0",
          },
          {
            step: 3,
            explanation:
              "Both conditions hold only on $(4,5)$: $f$ is above the axis and $f'$ is negative.",
            math: "(4,5)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Using the graph shown, let }A(x)=5+\\int_0^x f(t)\\,dt.\\text{ What is }A(4)?",
        difficulty: 3,
        skillTags: ["accumulation", "graph_interpretation", "signed_area"],
        figure: accumulationGraphFigure,
        choices: ["$13$", "$8$", "$5$", "$-3$"],
        correctLetter: "A",
        hints: [
          "Compute signed area from $0$ to $4$.",
          "The graph forms two triangles above the x-axis.",
          "Then add the initial value $5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find area from $0$ to $4$.",
            math: "\\frac12(2)(4)+\\frac12(2)(4)=8",
          },
          {
            step: 2,
            explanation: "Add the initial value.",
            math: "A(4)=5+8=13",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For the same }A(x)=5+\\int_0^x f(t)\\,dt\\text{ and graph shown, where does }A\\text{ have a local minimum on }(0,7)?",
        difficulty: 4,
        skillTags: ["accumulation_derivative", "graph_interpretation", "local_extrema"],
        figure: accumulationGraphFigure,
        choices: ["$x=6$", "$x=2$", "$x=4$", "$x=5$"],
        correctLetter: "A",
        hints: [
          "$A'(x)=f(x)$.",
          "A local minimum occurs where $f$ changes from negative to positive.",
          "On the graph, this happens when $f$ crosses the axis at $x=6$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use sign changes of $f$ as sign changes of $A'$.",
            math: "f:-\\to+\\text{ at }x=6",
          },
          {
            step: 2,
            explanation: "Thus $A$ has a local minimum at $x=6$.",
            math: "x=6",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The figure shows aligned graphs of }A, f,\\text{ and }f'\\text{ on }0\\le x\\le6.\\text{ They satisfy }A'(x)=f(x)\\text{ and }A''(x)=f'(x),\\text{ with }A(0)=2.",
      difficulty: 4,
      skillTags: [
        "accumulation",
        "graph_interpretation",
        "local_extrema",
        "concavity",
        "derivative_ladder",
      ],
      figure: accumulationDerivativeLadderFigure,
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Use signed area from the graph of $f$ to find $A(2)$ and $A(4)$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Find the $x$-coordinates of all local extrema of $A$ on $(0,6)$ and classify each. Justify your answer.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "Determine where $A$ is concave up, where $A$ is linear, and where $A$ is concave down. Justify using the graph of $f'$.",
          points: 2,
        },
      ],
      hints: [
        "For values of $A$, add signed area under $f$ to $A(0)=2$.",
        "For extrema of $A$, look for sign changes of $A'=f$.",
        "For concavity of $A$, use $A''=f'$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          {
            part: "a",
            points: 1,
            description:
              "Computes $A(2)=2$ using cancellation of equal signed triangular areas.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Computes $A(4)=6$ by adding the area from $2$ to $4$.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Identifies and classifies the local minimum of $A$ at $x=1$.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Identifies and classifies the local maximum of $A$ at $x=5$.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Uses $f'>0$ and $f'=0$ to identify where $A$ is concave up and linear.",
          },
          {
            part: "c",
            points: 1,
            description: "Uses $f'<0$ to identify where $A$ is concave down.",
          },
        ],
      },
      commonErrors: [
        "Reading $A(2)$ or $A(4)$ directly from the middle graph instead of accumulating signed area under $f$.",
        "Classifying extrema of $A$ from zeros of $f'$ instead of sign changes of $f$.",
        "Using the sign of $f$ for concavity instead of the sign of $f'$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "On $[0,1]$ the signed area under $f$ is $-1$, and on $[1,2]$ it is $+1$, so the net area from $0$ to $2$ is $0$. Therefore $A(2)=2$. From $2$ to $4$, the graph of $f$ is the horizontal segment $y=2$, so the signed area is $2\\cdot2=4$. Therefore $A(4)=2+4=6$.",
        },
        {
          part: "b",
          explanation:
            "$A'(x)=f(x)$. At $x=1$, $f$ changes from negative to positive, so $A$ changes from decreasing to increasing and has a local minimum. At $x=5$, $f$ changes from positive to negative, so $A$ changes from increasing to decreasing and has a local maximum.",
        },
        {
          part: "c",
          explanation:
            "$A''(x)=f'(x)$. The graph of $f'$ is positive on $(0,2)$, zero on $(2,4)$, and negative on $(4,6)$. Thus $A$ is concave up on $(0,2)$, linear on $(2,4)$, and concave down on $(4,6)$.",
        },
      ],
    },
  },
  {
    topicCode: "6.6",
    title: "Applying Properties of Definite Integrals",
    subtopic:
      "Using additivity, reversal, linearity, symmetry, and average value",
    mc: [
      {
        questionLatex:
          "\\text{If }\\int_0^3 f(x)\\,dx=5\\text{ and }\\int_3^7 f(x)\\,dx=-2,\\text{ what is }\\int_0^7 f(x)\\,dx?",
        difficulty: 2,
        skillTags: ["integral_properties", "additivity"],
        choices: ["$3$", "$7$", "$-10$", "$-3$"],
        correctLetter: "A",
        hints: [
          "Use additivity over adjacent intervals.",
          "$\\int_0^7=\\int_0^3+\\int_3^7$.",
          "Compute $5+(-2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply additivity.",
            math: "\\int_0^7 f=5+(-2)=3",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\int_0^7 f(x)\\,dx=3,\\text{ what is }\\int_7^0 f(x)\\,dx?",
        difficulty: 2,
        skillTags: ["integral_properties", "reversal_of_limits"],
        choices: ["$-3$", "$3$", "$7$", "$-7$"],
        correctLetter: "A",
        hints: [
          "Reversing limits changes the sign.",
          "$\\int_7^0 f=-\\int_0^7 f$.",
          "Use the value $3$ from $0$ to $7$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Reverse the limits.",
            math: "\\int_7^0 f=-\\int_0^7 f=-3",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\int_0^3 f(x)\\,dx=5,\\text{ what is }\\int_0^3 (2f(x)+4)\\,dx?",
        difficulty: 3,
        skillTags: ["integral_properties", "linearity"],
        choices: ["$22$", "$14$", "$18$", "$13$"],
        correctLetter: "A",
        hints: [
          "Use linearity.",
          "$\\int_0^3 2f=2\\int_0^3 f$.",
          "$\\int_0^3 4\\,dx=12$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply linearity.",
            math: "\\int_0^3(2f+4)\\,dx=2(5)+4(3)",
          },
          {
            step: 2,
            explanation: "Simplify.",
            math: "10+12=22",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }g\\text{ is odd and integrable, what is }\\int_{-2}^{2} g(x)\\,dx?",
        difficulty: 3,
        skillTags: ["integral_properties", "symmetry"],
        choices: ["$0$", "$2g(2)$", "$2\\int_0^2 g(x)\\,dx$", "$\\int_0^2 |g(x)|\\,dx$"],
        correctLetter: "A",
        hints: [
          "Odd functions have origin symmetry.",
          "Areas on symmetric intervals cancel.",
          "This is signed area, not total area.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use symmetry of odd functions.",
            math: "\\int_{-2}^{2} g(x)\\,dx=0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\int_1^4 f(x)\\,dx=6,\\text{ what is the average value of }f\\text{ on }[1,4]?",
        difficulty: 4,
        skillTags: ["integral_properties", "average_value"],
        choices: ["$2$", "$6$", "$\\frac32$", "$18$"],
        correctLetter: "A",
        hints: [
          "Average value is $\\frac{1}{b-a}\\int_a^b f(x)\\,dx$.",
          "Here $b-a=3$.",
          "Compute $6/3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the average value formula.",
            math: "\\frac{1}{4-1}\\int_1^4 f(x)\\,dx=\\frac{6}{3}=2",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Suppose }\\int_0^2 f(x)\\,dx=3,\\ \\int_2^5 f(x)\\,dx=-4,\\text{ and }\\int_0^5 g(x)\\,dx=7.",
      difficulty: 4,
      skillTags: ["integral_properties", "linearity", "average_value"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\int_5^0 f(x)\\,dx$.", points: 1 },
        { letter: "b", promptMarkdown: "Find $\\int_0^5 (2f(x)-g(x))\\,dx$.", points: 2 },
        { letter: "c", promptMarkdown: "Find the average value of $f$ on $[0,5]$.", points: 1 },
      ],
      hints: [
        "First combine the two integrals involving $f$.",
        "Use reversal of limits for part (a).",
        "Average value divides by interval length.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Computes $\\int_5^0 f=1$." },
          { part: "b", points: 1, description: "Uses $\\int_0^5 f=-1$." },
          { part: "b", points: 1, description: "Computes $2(-1)-7=-9$." },
          { part: "c", points: 1, description: "Computes average value $-1/5$." },
        ],
      },
      commonErrors: [
        "Forgetting that reversing limits changes sign.",
        "Applying the coefficient 2 to only one subinterval.",
        "Using interval length 4 instead of 5.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$\\int_0^5 f=3+(-4)=-1$, so $\\int_5^0 f=1$.",
        },
        {
          part: "b",
          explanation:
            "$\\int_0^5(2f-g)=2\\int_0^5f-\\int_0^5g=2(-1)-7=-9$.",
        },
        {
          part: "c",
          explanation:
            "The average value is $\\frac1{5-0}\\int_0^5 f(x)\\,dx=-\\frac15$.",
        },
      ],
    },
  },
  {
    topicCode: "6.7",
    title: "The Fundamental Theorem of Calculus and Definite Integrals",
    subtopic:
      "Evaluating definite integrals using antiderivatives and total change",
    mc: [
      {
        questionLatex:
          "\\text{Evaluate }\\int_1^3(2x+1)\\,dx.",
        difficulty: 2,
        skillTags: ["definite_integral", "ftc_evaluation"],
        choices: ["$10$", "$8$", "$12$", "$6$"],
        correctLetter: "A",
        hints: [
          "Find an antiderivative of $2x+1$.",
          "Use $x^2+x$.",
          "Evaluate at $3$ and $1$ and subtract.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the FTC.",
            math: "\\left[x^2+x\\right]_1^3=(9+3)-(1+1)=10",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\int_0^{\\pi}\\cos x\\,dx.",
        difficulty: 2,
        skillTags: ["definite_integral", "trig"],
        choices: ["$0$", "$2$", "$-2$", "$\\pi$"],
        correctLetter: "A",
        hints: [
          "An antiderivative of $\\cos x$ is $\\sin x$.",
          "Evaluate $\\sin x$ from $0$ to $\\pi$.",
          "$\\sin\\pi=0$ and $\\sin0=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate with the FTC.",
            math: "\\int_0^\\pi\\cos x\\,dx=[\\sin x]_0^\\pi=0-0=0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\int_1^e\\frac1x\\,dx.",
        difficulty: 3,
        skillTags: ["definite_integral", "logarithmic_integral"],
        choices: ["$1$", "$e-1$", "$\\ln(e-1)$", "$0$"],
        correctLetter: "A",
        hints: [
          "An antiderivative of $1/x$ is $\\ln x$ on $x>0$.",
          "Evaluate $\\ln e-\\ln1$.",
          "$\\ln e=1$ and $\\ln1=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the log antiderivative.",
            math: "[\\ln x]_1^e=1-0=1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }F'(x)=v(x)\\text{ and }\\int_2^5 v(x)\\,dx=-7,\\text{ what is }F(5)-F(2)?",
        difficulty: 3,
        skillTags: ["ftc_evaluation", "total_change"],
        choices: ["$-7$", "$7$", "$F(5)+7$", "$0$"],
        correctLetter: "A",
        hints: [
          "The integral of a derivative gives net change.",
          "$\\int_2^5 F'(x)\\,dx=F(5)-F(2)$.",
          "Here $F'=v$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the total change theorem.",
            math: "F(5)-F(2)=\\int_2^5 v(x)\\,dx=-7",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\int_0^2 3e^{3x}\\,dx.",
        difficulty: 4,
        skillTags: ["definite_integral", "exponential_integral"],
        choices: ["$e^6-1$", "$3e^6-3$", "$e^2-1$", "$6e^6$"],
        correctLetter: "A",
        hints: [
          "An antiderivative of $3e^{3x}$ is $e^{3x}$.",
          "Evaluate at $2$ and $0$.",
          "$e^{3\\cdot2}-e^0=e^6-1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the antiderivative.",
            math: "\\int_0^2 3e^{3x}\\,dx=[e^{3x}]_0^2=e^6-1",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }P'(x)=x^3-2x+1\\text{ and }P(0)=4.",
      difficulty: 4,
      skillTags: ["ftc_evaluation", "total_change", "definite_integral"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\int_0^2 (x^3-2x+1)\\,dx$.", points: 2 },
        { letter: "b", promptMarkdown: "Find $P(2)$.", points: 1 },
        { letter: "c", promptMarkdown: "Explain the meaning of the integral in part (a) in terms of $P$.", points: 1 },
      ],
      hints: [
        "Use an antiderivative of $x^3-2x+1$.",
        "The integral of $P'$ is the change in $P$.",
        "Add the change to $P(0)$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Finds correct antiderivative." },
          { part: "a", points: 1, description: "Evaluates integral as 2." },
          { part: "b", points: 1, description: "Computes $P(2)=6$." },
          { part: "c", points: 1, description: "Interprets integral as net change in $P$ from 0 to 2." },
        ],
      },
      commonErrors: [
        "Using $P'(2)$ instead of the integral.",
        "Forgetting to add $P(0)$.",
        "Reversing final minus initial.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$\\int_0^2(x^3-2x+1)\\,dx=\\left[\\frac{x^4}{4}-x^2+x\\right]_0^2=4-4+2=2$.",
        },
        {
          part: "b",
          explanation:
            "$P(2)=P(0)+\\int_0^2P'(x)\\,dx=4+2=6$.",
        },
        {
          part: "c",
          explanation:
            "The integral represents the net change in $P$ as $x$ goes from $0$ to $2$.",
        },
      ],
    },
  },
  {
    topicCode: "6.8",
    title: "Finding Antiderivatives and Indefinite Integrals: Basic Rules and Notation",
    subtopic:
      "Finding general antiderivatives and particular solutions",
    mc: [
      {
        questionLatex:
          "\\text{Find }\\int(6x^2-4x+5)\\,dx.",
        difficulty: 2,
        skillTags: ["antiderivative", "power_rule"],
        choices: [
          "$2x^3-2x^2+5x+C$",
          "$18x-4+C$",
          "$2x^3-4x^2+5+C$",
          "$6x^3-4x^2+5x+C$",
        ],
        correctLetter: "A",
        hints: [
          "Reverse the power rule term by term.",
          "Increase each power by $1$ and divide by the new power.",
          "Remember $+C$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Integrate each term.",
            math: "\\int(6x^2-4x+5)\\,dx=2x^3-2x^2+5x+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int(\\sec^2x+e^x)\\,dx.",
        difficulty: 2,
        skillTags: ["antiderivative", "trig", "exponential"],
        choices: ["$\\tan x+e^x+C$", "$\\sec x+e^x+C$", "$\\tan x+xe^x+C$", "$\\sec x+e^{x+1}+C$"],
        correctLetter: "A",
        hints: [
          "An antiderivative of $\\sec^2x$ is $\\tan x$.",
          "An antiderivative of $e^x$ is $e^x$.",
          "Add the constant.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use known antiderivatives.",
            math: "\\tan x+e^x+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f'(x)=3x^2-4\\text{ and }f(1)=2,\\text{ what is }f(x)\\text{?}",
        difficulty: 3,
        skillTags: ["particular_solution", "antiderivative"],
        choices: ["$x^3-4x+5$", "$x^3-4x+2$", "$6x-4$", "$x^3-4x-3$"],
        correctLetter: "A",
        hints: [
          "First find the general antiderivative.",
          "$f(x)=x^3-4x+C$.",
          "Use $f(1)=2$ to solve for $C$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Integrate $f'$.",
            math: "f(x)=x^3-4x+C",
          },
          {
            step: 2,
            explanation: "Use the initial value.",
            math: "2=1-4+C\\Rightarrow C=5",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int \\frac{1}{\\sqrt{x}}\\,dx\\text{ for }x>0.",
        difficulty: 3,
        skillTags: ["antiderivative", "power_rule"],
        choices: ["$2\\sqrt{x}+C$", "$\\frac{1}{2\\sqrt{x}}+C$", "$\\ln x+C$", "$-2x^{-1/2}+C$"],
        correctLetter: "A",
        hints: [
          "Rewrite $1/\\sqrt{x}$ as $x^{-1/2}$.",
          "Increase the exponent by $1$.",
          "Divide by $1/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the power rule backward.",
            math: "\\int x^{-1/2}\\,dx=\\frac{x^{1/2}}{1/2}+C=2\\sqrt{x}+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }y'=\\cos x\\text{ and }y\\left(\\frac\\pi2\\right)=4,\\text{ what is }y?",
        difficulty: 4,
        skillTags: ["particular_solution", "trig", "antiderivative"],
        choices: ["$y=\\sin x+3$", "$y=\\sin x+4$", "$y=-\\sin x+5$", "$y=\\cos x+4$"],
        correctLetter: "A",
        hints: [
          "An antiderivative of $\\cos x$ is $\\sin x$.",
          "Use $y=\\sin x+C$.",
          "Since $\\sin(\\pi/2)=1$, solve $1+C=4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Integrate and use the given value.",
            math: "y=\\sin x+C,\\quad 4=1+C\\Rightarrow C=3",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A particle has acceleration }a(t)=8t-5\\text{ for }t\\ge0.\\text{ Its velocity is }v(0)=2\\text{ and position is }s(0)=7.",
      difficulty: 4,
      skillTags: ["particular_solution", "antiderivative", "motion"],
      parts: [
        { letter: "a", promptMarkdown: "Find $v(t)$.", points: 2 },
        { letter: "b", promptMarkdown: "Find $s(t)$.", points: 2 },
        { letter: "c", promptMarkdown: "Find $s(2)$.", points: 1 },
      ],
      hints: [
        "Velocity is an antiderivative of acceleration.",
        "Position is an antiderivative of velocity.",
        "Use each initial condition to find its constant.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Integrates acceleration correctly." },
          { part: "a", points: 1, description: "Uses $v(0)=2$." },
          { part: "b", points: 1, description: "Integrates velocity correctly." },
          { part: "b", points: 1, description: "Uses $s(0)=7$." },
          { part: "c", points: 1, description: "Computes $s(2)=\\frac{29}{3}$." },
        ],
      },
      commonErrors: [
        "Using the same constant for velocity and position.",
        "Forgetting that velocity is the first antiderivative, not position.",
        "Dropping the initial position.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$v(t)=\\int(8t-5)\\,dt=4t^2-5t+C$. Since $v(0)=2$, $C=2$, so $v(t)=4t^2-5t+2$.",
        },
        {
          part: "b",
          explanation:
            "$s(t)=\\int(4t^2-5t+2)\\,dt=\\frac43t^3-\\frac52t^2+2t+C$. Since $s(0)=7$, $s(t)=\\frac43t^3-\\frac52t^2+2t+7$.",
        },
        {
          part: "c",
          explanation:
            "$s(2)=\\frac{32}{3}-10+4+7=\\frac{29}{3}$.",
        },
      ],
    },
  },
  {
    topicCode: "6.9",
    title: "Integrating Using Substitution",
    subtopic:
      "Recognizing composite structure and transforming integrals consistently",
    mc: [
      {
        questionLatex:
          "\\text{Find }\\int 2x\\cos(x^2)\\,dx.",
        difficulty: 2,
        skillTags: ["substitution", "indefinite_integral"],
        choices: ["$\\sin(x^2)+C$", "$2\\sin(x^2)+C$", "$-\\sin(x^2)+C$", "$x^2\\sin(x^2)+C$"],
        correctLetter: "A",
        hints: [
          "Let $u=x^2$.",
          "Then $du=2x\\,dx$.",
          "Integrate $\\cos u$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use $u=x^2$.",
            math: "\\int 2x\\cos(x^2)\\,dx=\\int\\cos u\\,du=\\sin u+C",
          },
          {
            step: 2,
            explanation: "Substitute back.",
            math: "\\sin(x^2)+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\int_0^1 3x^2e^{x^3}\\,dx.",
        difficulty: 2,
        skillTags: ["substitution", "definite_integral"],
        choices: ["$e-1$", "$e^3-1$", "$3e-3$", "$1$"],
        correctLetter: "A",
        hints: [
          "Let $u=x^3$.",
          "Then $du=3x^2\\,dx$.",
          "Bounds change from $x=0,1$ to $u=0,1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute and change bounds.",
            math: "\\int_0^1 3x^2e^{x^3}\\,dx=\\int_0^1 e^u\\,du",
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: "[e^u]_0^1=e-1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int \\frac{x}{x^2+4}\\,dx.",
        difficulty: 3,
        skillTags: ["substitution", "logarithmic_integral"],
        choices: ["$\\frac12\\ln(x^2+4)+C$", "$\\ln(x^2+4)+C$", "$\\frac{1}{x^2+4}+C$", "$2\\ln(x^2+4)+C$"],
        correctLetter: "A",
        hints: [
          "Let $u=x^2+4$.",
          "Then $du=2x\\,dx$.",
          "You have half of $du$ in the numerator.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute.",
            math: "u=x^2+4,\\quad du=2x\\,dx",
          },
          {
            step: 2,
            explanation: "Integrate.",
            math: "\\int\\frac{x}{x^2+4}\\,dx=\\frac12\\int\\frac1u\\,du=\\frac12\\ln(x^2+4)+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\int_0^{\\pi/2}\\sin x\\cos(\\cos x)\\,dx.",
        difficulty: 3,
        skillTags: ["substitution", "trig", "definite_integral"],
        choices: ["$\\sin 1$", "$1-\\cos1$", "$-\\sin1$", "$\\cos1$"],
        correctLetter: "A",
        hints: [
          "Let $u=\\cos x$.",
          "Then $du=-\\sin x\\,dx$.",
          "The bounds go from $u=1$ to $u=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute carefully with bounds.",
            math: "\\int_0^{\\pi/2}\\sin x\\cos(\\cos x)\\,dx=-\\int_1^0\\cos u\\,du",
          },
          {
            step: 2,
            explanation: "Reverse the bounds and evaluate.",
            math: "\\int_0^1\\cos u\\,du=\\sin1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int4x(2x^2+1)^5\\,dx.",
        difficulty: 4,
        skillTags: ["substitution", "power_rule"],
        choices: [
          "$\\frac{(2x^2+1)^6}{6}+C$",
          "$4x\\cdot\\frac{(2x^2+1)^6}{6}+C$",
          "$(2x^2+1)^6+C$",
          "$\\frac{(2x^2+1)^4}{4}+C$",
        ],
        correctLetter: "A",
        hints: [
          "Let $u=2x^2+1$.",
          "Then $du=4x\\,dx$.",
          "Integrate $u^5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute.",
            math: "\\int4x(2x^2+1)^5\\,dx=\\int u^5\\,du",
          },
          {
            step: 2,
            explanation: "Integrate and substitute back.",
            math: "\\frac{u^6}{6}+C=\\frac{(2x^2+1)^6}{6}+C",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Evaluate }\\int_0^2 x\\sqrt{x^2+5}\\,dx\\text{ exactly.}",
      difficulty: 5,
      skillTags: ["substitution", "definite_integral", "radical_integral"],
      parts: [
        { letter: "a", promptMarkdown: "Identify a change of variable that simplifies the radical, and transform the bounds.", points: 2 },
        { letter: "b", promptMarkdown: "Rewrite the integral entirely in terms of the new variable.", points: 1 },
        { letter: "c", promptMarkdown: "Evaluate the integral exactly.", points: 2 },
      ],
      hints: [
        "Use the expression inside the square root.",
        "If $u=x^2+5$, then $du=2x\\,dx$.",
        "Change bounds before integrating: $x=0\\to u=5$ and $x=2\\to u=9$.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Chooses $u=x^2+5$." },
          { part: "a", points: 1, description: "Transforms bounds to 5 and 9." },
          { part: "b", points: 1, description: "Rewrites as $\\frac12\\int_5^9u^{1/2}\\,du$." },
          { part: "c", points: 1, description: "Finds antiderivative $\\frac13u^{3/2}$." },
          { part: "c", points: 1, description: "Evaluates exactly as $9-\\frac{5\\sqrt5}{3}$ or equivalent." },
        ],
      },
      commonErrors: [
        "Forgetting the factor $1/2$ from $du=2x\\,dx$.",
        "Keeping old $x$-bounds after changing variables.",
        "Substituting back and then applying $u$-bounds.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Let $u=x^2+5$. Then $du=2x\\,dx$, so $x\\,dx=du/2$. The bounds become $u=5$ when $x=0$ and $u=9$ when $x=2$.",
        },
        {
          part: "b",
          explanation:
            "The integral becomes $\\frac12\\int_5^9 u^{1/2}\\,du$.",
        },
        {
          part: "c",
          explanation:
            "$\\frac12\\int_5^9u^{1/2}\\,du=\\frac12\\left[\\frac{2}{3}u^{3/2}\\right]_5^9=\\frac13(27-5\\sqrt5)=9-\\frac{5\\sqrt5}{3}$.",
        },
      ],
    },
  },
  {
    topicCode: "6.10",
    title: "Integrating Functions Using Long Division and Completing the Square",
    subtopic:
      "Rewriting rational functions before applying antiderivative rules",
    mc: [
      {
        questionLatex:
          "\\text{Find }\\int\\frac{x^2+1}{x+1}\\,dx.",
        difficulty: 2,
        skillTags: ["algebraic_integration", "long_division"],
        choices: [
          "$\\frac{x^2}{2}-x+2\\ln|x+1|+C$",
          "$\\frac{x^2}{2}+x+\\ln|x+1|+C$",
          "$\\ln|x^2+1|-\\ln|x+1|+C$",
          "$\\frac{x^3}{3}+x+C$",
        ],
        correctLetter: "A",
        hints: [
          "Divide $x^2+1$ by $x+1$ first.",
          "$\\frac{x^2+1}{x+1}=x-1+\\frac2{x+1}$.",
          "Now integrate term by term.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use long division.",
            math: "\\frac{x^2+1}{x+1}=x-1+\\frac2{x+1}",
          },
          {
            step: 2,
            explanation: "Integrate.",
            math: "\\frac{x^2}{2}-x+2\\ln|x+1|+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int\\frac{x^2+3x+5}{x+2}\\,dx.",
        difficulty: 2,
        skillTags: ["algebraic_integration", "long_division"],
        choices: [
          "$\\frac{x^2}{2}+x+3\\ln|x+2|+C$",
          "$\\frac{x^2}{2}+x+\\ln|x+2|+C$",
          "$\\ln|x^2+3x+5|+C$",
          "$\\frac{x^3}{3}+\\frac{3x^2}{2}+5x+C$",
        ],
        correctLetter: "A",
        hints: [
          "Divide $x^2+3x+5$ by $x+2$ first.",
          "$x^2+3x+5=(x+2)(x+1)+3$.",
          "Integrate $x+1+3/(x+2)$ term by term.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use long division.",
            math: "\\frac{x^2+3x+5}{x+2}=x+1+\\frac3{x+2}",
          },
          {
            step: 2,
            explanation: "Integrate.",
            math: "\\frac{x^2}{2}+x+3\\ln|x+2|+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int\\frac{1}{x^2+4x+8}\\,dx.",
        difficulty: 3,
        skillTags: ["algebraic_integration", "completing_square", "inverse_trig"],
        choices: [
          "$\\frac12\\arctan\\left(\\frac{x+2}{2}\\right)+C$",
          "$\\arctan(x+2)+C$",
          "$\\frac{1}{(x+2)^2+4}+C$",
          "$\\ln|x^2+4x+8|+C$",
        ],
        correctLetter: "A",
        hints: [
          "Complete the square in the denominator.",
          "$x^2+4x+8=(x+2)^2+4$.",
          "Use the form $\\int du/(u^2+a^2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Complete the square.",
            math: "x^2+4x+8=(x+2)^2+2^2",
          },
          {
            step: 2,
            explanation: "Apply the arctangent form.",
            math: "\\int\\frac{dx}{(x+2)^2+2^2}=\\frac12\\arctan\\left(\\frac{x+2}{2}\\right)+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int\\frac{x^2}{x^2+1}\\,dx.",
        difficulty: 3,
        skillTags: ["algebraic_integration", "long_division", "inverse_trig"],
        choices: [
          "$x-\\arctan x+C$",
          "$\\arctan x+C$",
          "$x+\\arctan x+C$",
          "$\\ln(x^2+1)+C$",
        ],
        correctLetter: "A",
        hints: [
          "Rewrite $x^2=(x^2+1)-1$.",
          "Then $x^2/(x^2+1)=1-1/(x^2+1)$.",
          "Integrate $1$ and $1/(x^2+1)$ separately.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rewrite the rational expression.",
            math: "\\frac{x^2}{x^2+1}=1-\\frac1{x^2+1}",
          },
          {
            step: 2,
            explanation: "Integrate.",
            math: "x-\\arctan x+C",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Find }\\int\\frac{x^3}{x^2+1}\\,dx.",
        difficulty: 4,
        skillTags: ["algebraic_integration", "long_division", "substitution"],
        choices: [
          "$\\frac{x^2}{2}-\\frac12\\ln(x^2+1)+C$",
          "$\\frac{x^2}{2}+\\frac12\\ln(x^2+1)+C$",
          "$x-\\arctan x+C$",
          "$\\frac{x^4}{4(x^2+1)}+C$",
        ],
        correctLetter: "A",
        hints: [
          "Divide $x^3$ by $x^2+1$.",
          "$x^3/(x^2+1)=x-\\frac{x}{x^2+1}$.",
          "Use substitution on the remaining rational term.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rewrite by division.",
            math: "\\frac{x^3}{x^2+1}=x-\\frac{x}{x^2+1}",
          },
          {
            step: 2,
            explanation: "Integrate each term.",
            math: "\\frac{x^2}{2}-\\frac12\\ln(x^2+1)+C",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Evaluate the following integrals exactly. Show the form of each integrand before finding an antiderivative.}",
      difficulty: 5,
      skillTags: ["algebraic_integration", "long_division", "completing_square", "definite_integral"],
      parts: [
        { letter: "a", promptMarkdown: "Evaluate $\\int_0^1 \\frac{x^2+2x+3}{x+1}\\,dx$.", points: 3 },
        { letter: "b", promptMarkdown: "Evaluate $\\int_0^2 \\frac{1}{x^2+4x+8}\\,dx$.", points: 3 },
      ],
      hints: [
        "For part (a), divide the numerator by $x+1$.",
        "For part (b), complete the square.",
        "Use exact antiderivatives and apply the bounds carefully.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Rewrites integrand as $x+1+2/(x+1)$." },
          { part: "a", points: 1, description: "Finds a correct antiderivative." },
          { part: "a", points: 1, description: "Evaluates as $3/2+2\\ln2$." },
          { part: "b", points: 1, description: "Completes the square correctly." },
          { part: "b", points: 1, description: "Finds arctangent antiderivative." },
          { part: "b", points: 1, description: "Evaluates with correct bounds." },
        ],
      },
      commonErrors: [
        "Trying to integrate a rational function before simplifying it.",
        "Making a sign error in polynomial division.",
        "Forgetting the scale factor in the arctangent antiderivative.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$\\frac{x^2+2x+3}{x+1}=x+1+\\frac2{x+1}$. Therefore $\\int_0^1 \\frac{x^2+2x+3}{x+1}\\,dx=\\left[\\frac{x^2}{2}+x+2\\ln|x+1|\\right]_0^1=\\frac12+1+2\\ln2=\\frac32+2\\ln2$.",
        },
        {
          part: "b",
          explanation:
            "$x^2+4x+8=(x+2)^2+4$. An antiderivative is $\\frac12\\arctan\\left(\\frac{x+2}{2}\\right)$. Thus the value is $\\frac12\\left[\\arctan2-\\arctan1\\right]$.",
        },
      ],
    },
  },
  {
    topicCode: "6.11",
    title: "Selecting Techniques for Antidifferentiation",
    subtopic:
      "Choosing among substitution, algebraic rewriting, completing the square, and basic antiderivative forms",
    mc: [
      {
        questionLatex:
          "\\text{Which technique is most efficient for finding }\\int x\\cos(x^2+1)\\,dx?",
        difficulty: 2,
        skillTags: ["technique_selection", "substitution"],
        commonMisconceptions: [
          "chooses_technique_from_surface_features",
          "misses_inner_derivative_match",
        ],
        choices: [
          "Use substitution with $u=x^2+1$.",
          "Use long division before integrating.",
          "Complete the square in $x^2+1$.",
          "Use a left Riemann sum.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Long division is useful for rational functions, but this integrand is a product with an inside function whose derivative is present.",
          C: "Completing the square helps with quadratic denominators, not with $\\cos(x^2+1)$ multiplied by $x$.",
          D: "A Riemann sum approximates a definite integral from data or rectangles; this asks for an antiderivative.",
        },
        hints: [
          "Look for a composed function and its derivative.",
          "The inside expression is $x^2+1$.",
          "Since $d(x^2+1)=2x\\,dx$, the extra factor $x$ is the key clue.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The integrand contains a composed function.",
            math: "\\cos(x^2+1)",
          },
          {
            step: 2,
            explanation: "The derivative of the inside is a constant multiple of the remaining factor.",
            math: "d(x^2+1)=2x\\,dx",
          },
          {
            step: 3,
            explanation: "So substitution is the efficient technique.",
            math: "u=x^2+1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Before integrating }\\int\\frac{x^2+4}{x+1}\\,dx,\\text{ which first step is most efficient?}",
        difficulty: 2,
        skillTags: ["technique_selection", "algebraic_integration", "long_division"],
        commonMisconceptions: [
          "tries_direct_quotient_integration",
          "misidentifies_rational_rewrite",
        ],
        choices: [
          "Use long division because the numerator degree is at least the denominator degree.",
          "Use substitution with $u=x+1$ because the denominator is linear.",
          "Complete the square in the numerator.",
          "Use the power rule directly on the quotient.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The derivative of $x+1$ is just $1$, which does not simplify the numerator $x^2+4$ into a basic form.",
          C: "Completing the square in the numerator does not separate the quotient into integrable pieces.",
          D: "There is no power rule for integrating a quotient as one piece.",
        },
        hints: [
          "Compare the degrees of the numerator and denominator.",
          "When the numerator degree is higher, rewrite the rational function first.",
          "Polynomial long division turns the quotient into simpler terms.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The numerator degree is $2$ and the denominator degree is $1$.",
            math: "2\\ge1",
          },
          {
            step: 2,
            explanation: "Rewrite before integrating.",
            math: "\\frac{x^2+4}{x+1}=x-1+\\frac5{x+1}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which technique should be chosen first for }\\int\\frac{1}{x^2-6x+13}\\,dx?",
        difficulty: 3,
        skillTags: ["technique_selection", "completing_square", "inverse_trig"],
        commonMisconceptions: [
          "misses_inverse_trig_form",
          "chooses_substitution_without_inner_derivative",
        ],
        choices: [
          "Complete the square to make an arctangent form.",
          "Use substitution with $u=x^2-6x+13$.",
          "Use long division.",
          "Use integration by parts.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The derivative $2x-6$ is not present in the numerator, so this substitution does not directly simplify the integral.",
          C: "Long division is not needed because the numerator degree is less than the denominator degree.",
          D: "Integration by parts is not an AP Calculus AB Unit 6 technique and is not needed here.",
        },
        hints: [
          "The denominator is a quadratic with no easy factor over the reals.",
          "Try rewriting it as a shifted square plus a constant.",
          "$x^2-6x+13=(x-3)^2+4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Complete the square in the denominator.",
            math: "x^2-6x+13=(x-3)^2+4",
          },
          {
            step: 2,
            explanation: "This matches the arctangent antiderivative form.",
            math: "\\int\\frac{du}{u^2+a^2}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }\\int_0^4\\left(\\sqrt{x}+\\frac1{x+1}\\right)\\,dx,\\text{ which plan is most efficient?}",
        difficulty: 3,
        skillTags: ["technique_selection", "basic_antiderivative", "definite_integral"],
        commonMisconceptions: [
          "overuses_substitution",
          "misses_split_integral_structure",
        ],
        choices: [
          "Split the integral, rewrite $\\sqrt{x}$ as $x^{1/2}$, and use basic antiderivatives.",
          "Use one substitution for the entire sum.",
          "Use long division on both terms.",
          "Complete the square in $x+1$.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The two terms do not share one inside function, so one substitution for the entire sum is not efficient.",
          C: "Long division applies to rational expressions with polynomial quotients, not to $\\sqrt{x}$.",
          D: "Completing the square is a quadratic-denominator strategy; $x+1$ is already linear.",
        },
        hints: [
          "A sum can be integrated term by term.",
          "$\\sqrt{x}$ is a power of $x$.",
          "$1/(x+1)$ has a natural logarithm antiderivative.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Split the integral into familiar pieces.",
            math: "\\int_0^4x^{1/2}\\,dx+\\int_0^4\\frac1{x+1}\\,dx",
          },
          {
            step: 2,
            explanation: "These use the power rule backward and the logarithm rule.",
            math: "\\frac23x^{3/2}+\\ln|x+1|",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which plan correctly starts }\\int\\left(\\frac{x^3}{x^2+1}+2xe^{x^2}\\right)\\,dx?",
        difficulty: 4,
        skillTags: ["technique_selection", "algebraic_integration", "substitution"],
        commonMisconceptions: [
          "tries_one_method_for_mixed_integral",
          "misses_need_to_rewrite_before_substitution",
        ],
        choices: [
          "Rewrite $\\frac{x^3}{x^2+1}=x-\\frac{x}{x^2+1}$, then use substitution on the remaining composed terms.",
          "Use completing the square on $x^2+1$ and integrate $2xe^{x^2}$ by the power rule.",
          "Use one substitution $u=x^2+1$ for the entire integral.",
          "Use long division on both terms.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Completing the square does not simplify $x^2+1$, and $2xe^{x^2}$ is not handled by the power rule.",
          C: "The substitution $u=x^2+1$ helps the rational part after rewriting, but it does not handle $e^{x^2}$ as written.",
          D: "Long division helps the rational term, but it does not apply to $2xe^{x^2}$.",
        },
        hints: [
          "The integral is a sum, so different terms may need different methods.",
          "The rational term should be rewritten first.",
          "After rewriting, both leftover non-basic pieces have inside functions with derivative factors present.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rewrite the rational term.",
            math: "\\frac{x^3}{x^2+1}=x-\\frac{x}{x^2+1}",
          },
          {
            step: 2,
            explanation: "Then use substitution on $x/(x^2+1)$ and on $2xe^{x^2}$.",
            math: "u=x^2+1\\quad\\text{and}\\quad v=x^2",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{For each integral, choose an efficient antidifferentiation technique and evaluate exactly.}",
      difficulty: 5,
      skillTags: [
        "technique_selection",
        "substitution",
        "long_division",
        "completing_square",
        "basic_antiderivative",
      ],
      commonMisconceptions: [
        "uses_named_technique_without_checking_structure",
        "forgets_to_rewrite_before_integrating",
      ],
      parts: [
        { letter: "a", promptMarkdown: "Evaluate $\\int \\frac{4x}{x^2+9}\\,dx$. State the technique.", points: 2 },
        { letter: "b", promptMarkdown: "Evaluate $\\int\\frac{x^2+2x+5}{x+1}\\,dx$. State the technique.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate $\\int\\frac{1}{x^2-4x+8}\\,dx$. State the technique.", points: 2 },
        { letter: "d", promptMarkdown: "Evaluate $\\int_0^4\\left(\\sqrt{x}+\\frac1{x+1}\\right)\\,dx$. State the technique.", points: 2 },
      ],
      hints: [
        "Classify each integrand before starting to compute.",
        "Look for inside-function derivatives, rational functions needing division, and quadratic denominators needing completed squares.",
        "For sums, split the integral when the terms require different basic rules.",
      ],
      rubric: {
        maxPoints: 8,
        criteria: [
          { part: "a", points: 1, description: "Chooses substitution with $u=x^2+9$." },
          { part: "a", points: 1, description: "Evaluates as $2\\ln(x^2+9)+C$." },
          { part: "b", points: 1, description: "Uses long division to rewrite the integrand." },
          { part: "b", points: 1, description: "Evaluates as $x^2/2+x+4\\ln|x+1|+C$." },
          { part: "c", points: 1, description: "Completes the square as $(x-2)^2+4$." },
          { part: "c", points: 1, description: "Evaluates as $\\frac12\\arctan\\left(\\frac{x-2}{2}\\right)+C$." },
          { part: "d", points: 1, description: "Splits and rewrites the integrand using basic antiderivative forms." },
          { part: "d", points: 1, description: "Evaluates exactly as $\\frac{16}{3}+\\ln5$." },
        ],
      },
      commonErrors: [
        "Choosing a technique by the topic title instead of by the integrand structure.",
        "Using substitution when the needed derivative factor is missing.",
        "Trying to integrate an unreduced rational expression directly.",
        "Forgetting the scale factor in the arctangent form after completing the square.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Use substitution because the derivative of $x^2+9$ is present up to a constant. Let $u=x^2+9$, so $du=2x\\,dx$. Then $\\int\\frac{4x}{x^2+9}\\,dx=2\\int\\frac{du}{u}=2\\ln|u|+C=2\\ln(x^2+9)+C$.",
        },
        {
          part: "b",
          explanation:
            "Use long division first: $\\frac{x^2+2x+5}{x+1}=x+1+\\frac4{x+1}$. Therefore the antiderivative is $\\frac{x^2}{2}+x+4\\ln|x+1|+C$.",
        },
        {
          part: "c",
          explanation:
            "Complete the square: $x^2-4x+8=(x-2)^2+4$. Then $\\int\\frac{dx}{(x-2)^2+2^2}=\\frac12\\arctan\\left(\\frac{x-2}{2}\\right)+C$.",
        },
        {
          part: "d",
          explanation:
            "Split the sum and use basic forms: $\\int_0^4x^{1/2}\\,dx+\\int_0^4\\frac1{x+1}\\,dx=\\left[\\frac23x^{3/2}+\\ln|x+1|\\right]_0^4=\\frac{16}{3}+\\ln5$.",
        },
      ],
    },
  },
];

export const integrationTopics: Topic[] = topicSeeds.map(makeTopic);
