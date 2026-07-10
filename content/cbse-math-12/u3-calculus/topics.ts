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
const UNIT = "u3-calculus";
const VERSION = "0.1.1";
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, index: number): Difficulty {
  return Math.max(seedDifficulty, MC_DIFFICULTY_FLOORS[index] ?? 2) as Difficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, type: ResponseType): Difficulty {
  const floor = type === "laq" || type === "case" ? 4 : type === "saq" ? 3 : 2;
  return Math.max(seedDifficulty, floor) as Difficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("continuity") || tags.has("differentiability")) {
    return "Check the left limit, right limit, function value, and derivative condition separately.";
  }
  if (tags.has("derivative_rules") || tags.has("chain_rule") || tags.has("inverse_trig_derivative")) {
    return "Apply the outer derivative and then multiply by the derivative of the inside function.";
  }
  if (tags.has("implicit") || tags.has("parametric") || tags.has("log_differentiation")) {
    return "Differentiate with respect to the correct variable and keep the dependent variable derivative attached.";
  }
  if (tags.has("increasing_decreasing") || tags.has("rate_of_change")) {
    return "Use the sign and meaning of the derivative before choosing the interval or rate.";
  }
  if (tags.has("maxima_minima") || tags.has("optimization")) {
    return "Find critical values, then use the sign change or second derivative test before deciding maximum or minimum.";
  }
  if (tags.has("indefinite_integral") || tags.has("substitution")) {
    return "Differentiate your antiderivative mentally; it should return the integrand.";
  }
  if (tags.has("parts") || tags.has("partial_fractions")) {
    return "Choose the correct integration technique and keep constants or logarithmic absolute values.";
  }
  if (tags.has("definite_integral") || tags.has("ftc")) {
    return "Use limits carefully; definite integrals do not include an arbitrary constant.";
  }
  if (tags.has("area_integral")) {
    return "Set up top-minus-bottom or geometric area before evaluating the integral.";
  }
  if (tags.has("differential_equations")) {
    return "Identify the type of differential equation before separating variables or choosing an integrating factor.";
  }

  return "Use the exact calculus rule required by this CBSE Class 12 topic.";
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
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_calculus_reasoning",
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(
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
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeConstructed(meta: TopicMeta, seed: ConstructedSeed, index: number): FrqItem {
  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(
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

const continuityCornerFigure: ItemFigure = {
  type: "svg",
  title: "Continuous graph with a corner",
  description:
    "Graph of a continuous piecewise function with two branches meeting at x equals 1.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <line x1="68" y1="260" x2="510" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="250" y1="42" x2="250" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M 510 260 L 498 254 M 510 260 L 498 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 250 42 L 244 54 M 250 42 L 256 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="518" y="265" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="258" y="40" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <line x1="310" y1="260" x2="310" y2="210" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="250" y1="210" x2="310" y2="210" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <text x="304" y="282" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="232" y="214" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <path d="M 105 300 C 166 270, 240 227, 310 210" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 310 210 L 470 76" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="310" cy="210" r="6" fill="#2563eb"/>
</svg>`,
};

const derivativeSignChartFigure: ItemFigure = {
  type: "svg",
  title: "Derivative sign chart",
  description:
    "Sign chart for f prime: positive before negative 1, negative between negative 1 and 2, and positive after 2.",
  svg: `
<svg viewBox="0 0 640 240" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="640" height="240" rx="12" fill="#f8fafc"/>
  <text x="320" y="38" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Sign of f'(x)</text>
  <line x1="88" y1="120" x2="552" y2="120" stroke="#64748b" stroke-width="3"/>
  <path d="M 552 120 L 540 114 M 552 120 L 540 126" stroke="#64748b" stroke-width="3" fill="none"/>
  <circle cx="220" cy="120" r="7" fill="#111827"/>
  <circle cx="420" cy="120" r="7" fill="#111827"/>
  <text x="220" y="148" text-anchor="middle" font-size="16" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <text x="420" y="148" text-anchor="middle" font-size="16" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="140" y="98" text-anchor="middle" font-size="26" font-weight="700" fill="#16a34a" font-family="Arial, sans-serif">+</text>
  <text x="320" y="98" text-anchor="middle" font-size="26" font-weight="700" fill="#dc2626" font-family="Arial, sans-serif">-</text>
  <text x="494" y="98" text-anchor="middle" font-size="26" font-weight="700" fill="#16a34a" font-family="Arial, sans-serif">+</text>
  <text x="320" y="202" text-anchor="middle" font-size="14" fill="#64748b" font-family="Arial, sans-serif">Increasing where f'(x) is positive; decreasing where f'(x) is negative.</text>
</svg>`,
};

const rectangleOptimizationFigure: ItemFigure = {
  type: "svg",
  title: "Rectangle with fixed perimeter",
  description:
    "A rectangle labelled with length x and breadth 20 minus x for a fixed perimeter of 40 cm.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <text x="280" y="42" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">Rectangle with perimeter 40 cm</text>
  <rect x="130" y="90" width="300" height="150" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <path d="M 130 264 H 430" stroke="#475569" stroke-width="2"/>
  <path d="M 130 264 L 142 258 M 130 264 L 142 270 M 430 264 L 418 258 M 430 264 L 418 270" stroke="#475569" stroke-width="2" fill="none"/>
  <text x="280" y="288" text-anchor="middle" font-size="17" fill="#334155" font-family="Arial, sans-serif">x</text>
  <path d="M 454 90 V 240" stroke="#475569" stroke-width="2"/>
  <path d="M 454 90 L 448 102 M 454 90 L 460 102 M 454 240 L 448 228 M 454 240 L 460 228" stroke="#475569" stroke-width="2" fill="none"/>
  <text x="480" y="170" font-size="17" fill="#334155" font-family="Arial, sans-serif">20 - x</text>
</svg>`,
};

const definiteAreaFigure: ItemFigure = {
  type: "svg",
  title: "Area under y equals x squared",
  description:
    "Graph of y equals x squared from x equals 0 to x equals 2 with the region under the curve shaded.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <line x1="82" y1="292" x2="506" y2="292" stroke="#64748b" stroke-width="2"/>
  <line x1="104" y1="42" x2="104" y2="312" stroke="#64748b" stroke-width="2"/>
  <path d="M 506 292 L 494 286 M 506 292 L 494 298" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 104 42 L 98 54 M 104 42 L 110 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 104 292 C 180 288, 260 258, 344 132" stroke="#2563eb" stroke-width="4" fill="none"/>
  <path d="M 104 292 C 180 288, 260 258, 344 132 L 344 292 Z" fill="#bfdbfe" opacity="0.7"/>
  <line x1="344" y1="132" x2="344" y2="292" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="338" y="314" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="360" y="128" font-size="17" fill="#1d4ed8" font-family="Arial, sans-serif">y = x^2</text>
</svg>`,
};

const parabolaAreaFigure: ItemFigure = {
  type: "svg",
  title: "Area bounded by a parabola and x-axis",
  description:
    "Graph of y equals 4 minus x squared crossing the x-axis at negative 2 and 2, with the bounded region shaded.",
  svg: `
<svg viewBox="0 0 600 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="600" height="380" rx="12" fill="#f8fafc"/>
  <line x1="70" y1="300" x2="540" y2="300" stroke="#64748b" stroke-width="2"/>
  <line x1="300" y1="46" x2="300" y2="324" stroke="#64748b" stroke-width="2"/>
  <path d="M 540 300 L 528 294 M 540 300 L 528 306" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 300 46 L 294 58 M 300 46 L 306 58" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 150 300 C 205 72, 395 72, 450 300" stroke="#2563eb" stroke-width="4" fill="none"/>
  <path d="M 150 300 C 205 72, 395 72, 450 300 Z" fill="#bfdbfe" opacity="0.72"/>
  <text x="140" y="322" font-size="14" fill="#334155" font-family="Arial, sans-serif">-2</text>
  <text x="444" y="322" font-size="14" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="312" y="105" font-size="17" fill="#1d4ed8" font-family="Arial, sans-serif">y = 4 - x^2</text>
</svg>`,
};

const areaBetweenCurvesFigure: ItemFigure = {
  type: "svg",
  title: "Area between y equals x and y equals x squared",
  description:
    "Graph of y equals x and y equals x squared from 0 to 1 with the enclosed region shaded.",
  svg: `
<svg viewBox="0 0 560 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="360" rx="12" fill="#f8fafc"/>
  <line x1="94" y1="292" x2="510" y2="292" stroke="#64748b" stroke-width="2"/>
  <line x1="104" y1="42" x2="104" y2="312" stroke="#64748b" stroke-width="2"/>
  <path d="M 510 292 L 498 286 M 510 292 L 498 298" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 104 42 L 98 54 M 104 42 L 110 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 104 292 L 344 92" stroke="#16a34a" stroke-width="4" fill="none"/>
  <path d="M 104 292 C 178 286, 270 222, 344 92" stroke="#2563eb" stroke-width="4" fill="none"/>
  <path d="M 104 292 L 344 92 C 270 222, 178 286, 104 292 Z" fill="#bfdbfe" opacity="0.72"/>
  <line x1="344" y1="92" x2="344" y2="292" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <text x="338" y="314" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="356" y="112" font-size="15" fill="#15803d" font-family="Arial, sans-serif">y = x</text>
  <text x="220" y="248" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">y = x^2</text>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Continuity and Differentiability",
    subtopic:
      "Continuity at a point, removable definitions, differentiability, and corner cases.",
    mc: [
      {
        questionLatex:
          "\\text{For }f(x)=\\begin{cases}x^2,&x<1\\\\ax+b,&x\\ge1\\end{cases}\\text{, if }f\\text{ is continuous at }x=1\\text{ and }f(2)=5,\\text{ then }a=",
        difficulty: 2,
        skillTags: ["continuity", "piecewise_function"],
        choices: ["$4$", "$3$", "$-3$", "$1$"],
        correctLetter: "A",
        hints: ["Continuity at $x=1$ gives $a+b=1$.", "The condition $f(2)=5$ gives $2a+b=5$.", "Subtract the first equation from the second."],
        solution: [{ step: 1, explanation: "Solve the two conditions.", math: "a+b=1,\\quad 2a+b=5\\Rightarrow a=4" }],
      },
      {
        questionLatex:
          "\\text{The function }f(x)=|x-2|\\text{ at }x=2\\text{ is}",
        difficulty: 2,
        skillTags: ["continuity", "differentiability"],
        choices: [
          "$\\text{continuous but not differentiable}$",
          "$\\text{differentiable but not continuous}$",
          "$\\text{neither continuous nor differentiable}$",
          "$\\text{not defined}$",
        ],
        correctLetter: "A",
        hints: ["Absolute value has no break at $x=2$.", "Check the left and right derivatives.", "The graph has a sharp corner."],
        solution: [{ step: 1, explanation: "The function is continuous but has unequal one-sided derivatives.", math: "f'_-(2)=-1,\\quad f'_+(2)=1" }],
      },
      {
        questionLatex:
          "\\text{Define }f(0)=1\\text{ and }f(x)=\\frac{\\sin x}{x}\\text{ for }x\\ne0.\\text{ Then }f\\text{ at }x=0\\text{ is}",
        difficulty: 3,
        skillTags: ["continuity", "standard_limit"],
        choices: [
          "$\\text{continuous}$",
          "$\\text{discontinuous because }\\frac{\\sin0}{0}\\text{ is undefined}$",
          "$\\text{not defined}$",
          "$\\text{continuous only from the right}$",
        ],
        correctLetter: "A",
        hints: ["Use the standard limit.", "$\\lim_{x\\to0}\\frac{\\sin x}{x}=1$.", "Compare the limit with $f(0)$."],
        solution: [{ step: 1, explanation: "The limit equals the function value.", math: "\\lim_{x\\to0}\\frac{\\sin x}{x}=1=f(0)" }],
      },
      {
        questionLatex:
          "\\text{If }f(x)=\\frac{x^2-4}{x-2}\\text{ for }x\\ne2\\text{ and }f(2)=k,\\text{ then }f\\text{ is continuous at }2\\text{ when }k=",
        difficulty: 3,
        skillTags: ["continuity", "removable_discontinuity"],
        choices: ["$4$", "$2$", "$0$", "$\\text{does not exist}$"],
        correctLetter: "A",
        hints: ["Factor $x^2-4$.", "For $x\\ne2$, the expression equals $x+2$.", "Take the limit as $x\\to2$."],
        solution: [{ step: 1, explanation: "Patch the removable discontinuity with the limiting value.", math: "\\lim_{x\\to2}\\frac{(x-2)(x+2)}{x-2}=4" }],
      },
      {
        questionLatex:
          "\\text{The derivative of }\\sqrt{x}\\text{ at }x=4\\text{ is}",
        difficulty: 4,
        skillTags: ["differentiability", "derivative_rules"],
        choices: ["$\\frac14$", "$\\frac12$", "$2$", "$4$"],
        correctLetter: "A",
        hints: ["Differentiate $x^{1/2}$.", "The derivative is $\\frac{1}{2\\sqrt{x}}$.", "Substitute $x=4$."],
        solution: [{ step: 1, explanation: "Evaluate the derivative.", math: "\\frac{d}{dx}\\sqrt{x}=\\frac1{2\\sqrt{x}},\\quad f'(4)=\\frac14" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }k\\text{ so that }f(x)=\\begin{cases}x+2,&x<3\\\\k,&x=3\\\\2x-1,&x>3\\end{cases}\\text{ is continuous at }x=3.",
        difficulty: 2,
        skillTags: ["continuity", "piecewise_function"],
        parts: singlePart("a", "Find $k$ or state why no such $k$ exists.", 2),
        hints: ["Compute the left-hand limit.", "Compute the right-hand limit.", "Both must equal $k$ for continuity."],
        rubric: singleRubric("a", 2, "Finds both one-sided limits as $5$ and writes $k=5$."),
        commonErrors: ["Using only one branch and not checking both sides."],
        workedSolution: [{ part: "a", explanation: "$\\lim_{x\\to3^-}(x+2)=5$ and $\\lim_{x\\to3^+}(2x-1)=5$. Hence $k=5$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{State whether }f(x)=|x|\\text{ is differentiable at }x=0.",
        difficulty: 2,
        skillTags: ["differentiability"],
        parts: singlePart("a", "Answer with one reason.", 2),
        hints: ["Find the left derivative.", "Find the right derivative.", "Compare them."],
        rubric: singleRubric("a", 2, "States not differentiable because left and right derivatives are unequal."),
        commonErrors: ["Saying differentiable because the function is continuous."],
        workedSolution: [{ part: "a", explanation: "For $x<0$, $f(x)=-x$, so the left derivative at $0$ is $-1$. For $x>0$, $f(x)=x$, so the right derivative is $1$. Hence $f$ is not differentiable at $0$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find }a,b\\text{ so that }f(x)=\\begin{cases}ax+b,&x<2\\\\x^2+1,&x\\ge2\\end{cases}\\text{ is continuous and differentiable at }x=2.",
        difficulty: 3,
        skillTags: ["continuity", "differentiability", "piecewise_function"],
        parts: singlePart("a", "Find $a$ and $b$.", 3),
        hints: ["Continuity gives $2a+b=5$.", "Differentiability gives left derivative $a$ equals right derivative $4$.", "Substitute $a=4$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses continuity condition correctly." },
            { part: "a", points: 1, description: "Uses differentiability condition correctly." },
            { part: "a", points: 1, description: "Finds $a=4,b=-3$." },
          ],
        },
        commonErrors: ["Using only continuity and forgetting differentiability."],
        workedSolution: [{ part: "a", explanation: "Continuity at $2$ gives $2a+b=2^2+1=5$. Differentiability gives $a=2(2)=4$. Hence $b=5-8=-3$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{For }f(x)=\\begin{cases}x^2,&x<1\\\\mx+n,&x\\ge1\\end{cases}\\text{, find }m,n\\text{ so that }f\\text{ is continuous and differentiable at }x=1.\\text{ Then find }f(3).",
        difficulty: 4,
        skillTags: ["continuity", "differentiability", "piecewise_function"],
        parts: [
          { letter: "a", promptMarkdown: "Use continuity at $x=1$.", points: 1 },
          { letter: "b", promptMarkdown: "Use differentiability at $x=1$ to find $m,n$.", points: 3 },
          { letter: "c", promptMarkdown: "Find $f(3)$.", points: 1 },
        ],
        hints: ["Continuity gives $m+n=1$.", "The derivative of $x^2$ at $1$ is $2$.", "So $m=2$ and then $n=-1$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Writes $m+n=1$." },
            { part: "b", points: 2, description: "Uses derivative matching to get $m=2$." },
            { part: "b", points: 1, description: "Finds $n=-1$." },
            { part: "c", points: 1, description: "Finds $f(3)=5$." },
          ],
        },
        commonErrors: ["Matching function values but not slopes.", "Using the wrong branch for $f(3)$."],
        workedSolution: [
          { part: "a", explanation: "Continuity at $1$ gives $1=m+n$." },
          { part: "b", explanation: "The left derivative is $2x$, so at $1$ it is $2$. The right derivative is $m$, hence $m=2$ and $n=-1$." },
          { part: "c", explanation: "Since $3\\ge1$, $f(3)=2(3)-1=5$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The graph shown represents a function near }x=1.\\text{ The two branches meet at the point }(1,1)\\text{ but have different slopes there.}",
        difficulty: 4,
        skillTags: ["continuity", "differentiability", "case_based"],
        figure: continuityCornerFigure,
        parts: [
          { letter: "a", promptMarkdown: "Is the function continuous at $x=1$?", points: 1 },
          { letter: "b", promptMarkdown: "Is the function differentiable at $x=1$?", points: 1 },
          { letter: "c", promptMarkdown: "Explain why the answers to parts (a) and (b) can be different.", points: 2 },
        ],
        hints: ["Continuity depends on meeting without a break.", "Differentiability also requires matching slopes.", "A corner can be continuous but not differentiable."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States that the function is continuous at $x=1$." },
            { part: "b", points: 1, description: "States that the function is not differentiable at $x=1$." },
            { part: "c", points: 2, description: "Explains that one-sided slopes are unequal although function values match." },
          ],
        },
        commonErrors: ["Assuming continuity automatically implies differentiability."],
        workedSolution: [
          { part: "a", explanation: "The branches meet at $(1,1)$, so the left and right limits equal the function value. The function is continuous at $x=1$." },
          { part: "b", explanation: "The graph has a corner at $x=1$, so the left and right derivatives are not equal. It is not differentiable there." },
          { part: "c", explanation: "Continuity checks no break in function value; differentiability checks a common tangent slope. A corner satisfies the first condition but not the second." },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Derivative Rules and Standard Functions",
    subtopic:
      "Chain rule, derivatives of inverse trigonometric, exponential, and logarithmic functions.",
    mc: [
      {
        questionLatex:
          "\\text{If }y=\\sin^{-1}(2x),\\text{ then }\\frac{dy}{dx}=",
        difficulty: 2,
        skillTags: ["derivative_rules", "inverse_trig_derivative", "chain_rule"],
        choices: ["$\\frac{2}{\\sqrt{1-4x^2}}$", "$\\frac{1}{\\sqrt{1-4x^2}}$", "$\\frac{2}{1+4x^2}$", "$\\frac{-2}{\\sqrt{1-4x^2}}$"],
        correctLetter: "A",
        hints: ["Use derivative of $\\sin^{-1}u$.", "Here $u=2x$.", "Multiply by $u'=2$."],
        solution: [{ step: 1, explanation: "Apply chain rule.", math: "\\frac{dy}{dx}=\\frac{2}{\\sqrt{1-(2x)^2}}" }],
      },
      {
        questionLatex:
          "\\text{If }y=\\ln(x^2+1),\\text{ then }\\frac{dy}{dx}=",
        difficulty: 2,
        skillTags: ["derivative_rules", "chain_rule", "log_derivative"],
        choices: ["$\\frac{2x}{x^2+1}$", "$\\frac{1}{x^2+1}$", "$2x\\ln(x^2+1)$", "$\\frac{x}{x^2+1}$"],
        correctLetter: "A",
        hints: ["Use $\\frac{d}{dx}\\ln u=\\frac{u'}u$.", "Here $u=x^2+1$.", "So $u'=2x$."],
        solution: [{ step: 1, explanation: "Differentiate the logarithm.", math: "\\frac{dy}{dx}=\\frac{2x}{x^2+1}" }],
      },
      {
        questionLatex:
          "\\text{If }y=e^x\\sin x,\\text{ then }\\frac{dy}{dx}=",
        difficulty: 3,
        skillTags: ["derivative_rules", "product_rule"],
        choices: ["$e^x(\\sin x+\\cos x)$", "$e^x\\cos x$", "$e^x\\sin x$", "$e^x(\\sin x-\\cos x)$"],
        correctLetter: "A",
        hints: ["Use the product rule.", "Differentiate $e^x$ and $\\sin x$ separately.", "Factor $e^x$."],
        solution: [{ step: 1, explanation: "Apply product rule.", math: "\\frac{dy}{dx}=e^x\\sin x+e^x\\cos x=e^x(\\sin x+\\cos x)" }],
      },
      {
        questionLatex:
          "\\text{If }y=(3x+1)^5,\\text{ then }\\frac{dy}{dx}=",
        difficulty: 3,
        skillTags: ["derivative_rules", "chain_rule"],
        choices: ["$15(3x+1)^4$", "$5(3x+1)^4$", "$3(3x+1)^5$", "$(3x+1)^4$"],
        correctLetter: "A",
        hints: ["Use chain rule.", "Outer derivative gives $5(3x+1)^4$.", "Multiply by derivative of $3x+1$."],
        solution: [{ step: 1, explanation: "Differentiate the composite power.", math: "\\frac{dy}{dx}=5(3x+1)^4\\cdot3=15(3x+1)^4" }],
      },
      {
        questionLatex:
          "\\text{If }y=\\tan^{-1}(x^2),\\text{ then }\\frac{dy}{dx}=",
        difficulty: 4,
        skillTags: ["inverse_trig_derivative", "chain_rule"],
        choices: ["$\\frac{2x}{1+x^4}$", "$\\frac{1}{1+x^4}$", "$\\frac{2x}{\\sqrt{1-x^4}}$", "$\\frac{x}{1+x^2}$"],
        correctLetter: "A",
        hints: ["Use derivative of $\\tan^{-1}u$.", "Here $u=x^2$.", "Then $u'=2x$ and $1+u^2=1+x^4$."],
        solution: [{ step: 1, explanation: "Apply inverse tangent derivative.", math: "\\frac{dy}{dx}=\\frac{2x}{1+x^4}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Differentiate }y=e^{3x}.",
        difficulty: 2,
        skillTags: ["derivative_rules", "chain_rule"],
        parts: singlePart("a", "Find $\\frac{dy}{dx}$.", 2),
        hints: ["Use derivative of $e^u$.", "Here $u=3x$.", "Multiply by $3$."],
        rubric: singleRubric("a", 2, "Finds $\\frac{dy}{dx}=3e^{3x}$."),
        commonErrors: ["Writing $e^{3x}$ and forgetting the factor $3$."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{dx}=e^{3x}\\cdot3=3e^{3x}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Differentiate }y=\\cos^{-1}x.",
        difficulty: 2,
        skillTags: ["inverse_trig_derivative"],
        parts: singlePart("a", "Find $\\frac{dy}{dx}$.", 2),
        hints: ["Recall the derivative of inverse cosine.", "It has a negative sign.", "The denominator is $\\sqrt{1-x^2}$."],
        rubric: singleRubric("a", 2, "Finds $\\frac{dy}{dx}=-\\frac1{\\sqrt{1-x^2}}$."),
        commonErrors: ["Missing the negative sign."],
        workedSolution: [{ part: "a", explanation: "$\\frac{d}{dx}(\\cos^{-1}x)=-\\frac1{\\sqrt{1-x^2}}$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Differentiate }y=e^{2x}\\ln x.",
        difficulty: 3,
        skillTags: ["derivative_rules", "product_rule", "log_derivative"],
        parts: singlePart("a", "Find $\\frac{dy}{dx}$.", 3),
        hints: ["Use the product rule.", "Differentiate $e^{2x}$ and $\\ln x$.", "Factor $e^{2x}$ if useful."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses product rule correctly." },
            { part: "a", points: 1, description: "Differentiates $e^{2x}$ and $\\ln x$ correctly." },
            { part: "a", points: 1, description: "Obtains $e^{2x}(2\\ln x+\\frac1x)$." },
          ],
        },
        commonErrors: ["Forgetting the product rule or the factor $2$ from $e^{2x}$."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{dx}=2e^{2x}\\ln x+e^{2x}\\frac1x=e^{2x}\\left(2\\ln x+\\frac1x\\right)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Differentiate }y=\\sin^{-1}\\left(\\frac{2x}{1+x^2}\\right),\\quad -1<x<1.",
        difficulty: 4,
        skillTags: ["inverse_trig_derivative", "chain_rule"],
        parts: [
          { letter: "a", promptMarkdown: "Use the identity $\\sin^{-1}\\left(\\frac{2x}{1+x^2}\\right)=2\\tan^{-1}x$ for $-1<x<1$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $\\frac{dy}{dx}$.", points: 3 },
        ],
        hints: ["The given expression is a standard inverse-trig identity.", "Differentiate $2\\tan^{-1}x$.", "The answer is $\\frac{2}{1+x^2}$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Correctly rewrites the expression as $2\\tan^{-1}x$." },
            { part: "b", points: 2, description: "Differentiates $\\tan^{-1}x$ correctly." },
            { part: "b", points: 1, description: "Finds $\\frac{2}{1+x^2}$." },
          ],
        },
        commonErrors: ["Using the identity outside the stated interval without checking branch conditions.", "Forgetting the factor $2$."],
        workedSolution: [
          { part: "a", explanation: "For $-1<x<1$, $\\sin^{-1}\\left(\\frac{2x}{1+x^2}\\right)=2\\tan^{-1}x$." },
          { part: "b", explanation: "Therefore $\\frac{dy}{dx}=2\\cdot\\frac1{1+x^2}=\\frac2{1+x^2}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The voltage at time }t\\text{ seconds is }V(t)=e^{2t}\\cos t\\text{ volts.}",
        difficulty: 4,
        skillTags: ["derivative_rules", "product_rule", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find $V'(t)$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $V'(0)$.", points: 1 },
          { letter: "c", promptMarkdown: "Interpret $V'(0)$ with units.", points: 1 },
        ],
        hints: ["Use product rule.", "At $t=0$, $e^0=1$, $\\cos0=1$, and $\\sin0=0$.", "Derivative units are volts per second."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $V'(t)=e^{2t}(2\\cos t-\\sin t)$." },
            { part: "b", points: 1, description: "Finds $V'(0)=2$." },
            { part: "c", points: 1, description: "Interprets as voltage increasing at $2$ volts per second." },
          ],
        },
        commonErrors: ["Ignoring product rule.", "Leaving out units in the interpretation."],
        workedSolution: [
          { part: "a", explanation: "$V'(t)=2e^{2t}\\cos t-e^{2t}\\sin t=e^{2t}(2\\cos t-\\sin t)$." },
          { part: "b", explanation: "$V'(0)=1(2\\cdot1-0)=2$." },
          { part: "c", explanation: "At $t=0$, the voltage is increasing at $2$ volts per second." },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Implicit, Parametric, Logarithmic, and Second Derivatives",
    subtopic:
      "CBSE differentiation techniques beyond direct formulas, including second derivatives.",
    mc: [
      {
        questionLatex:
          "\\text{If }x^2+y^2=25,\\text{ then }\\frac{dy}{dx}=",
        difficulty: 2,
        skillTags: ["implicit"],
        choices: ["$-\\frac{x}{y}$", "$\\frac{x}{y}$", "$-\\frac{y}{x}$", "$2x+2y$"],
        correctLetter: "A",
        hints: ["Differentiate both sides with respect to $x$.", "Remember $\\frac{d}{dx}(y^2)=2y\\frac{dy}{dx}$.", "Solve for $\\frac{dy}{dx}$."],
        solution: [{ step: 1, explanation: "Differentiate implicitly.", math: "2x+2y\\frac{dy}{dx}=0\\Rightarrow \\frac{dy}{dx}=-\\frac{x}{y}" }],
      },
      {
        questionLatex:
          "\\text{If }x=a\\cos t,\\ y=a\\sin t,\\text{ then }\\frac{dy}{dx}=",
        difficulty: 2,
        skillTags: ["parametric"],
        choices: ["$-\\cot t$", "$\\tan t$", "$\\cot t$", "$-\\tan t$"],
        correctLetter: "A",
        hints: ["Use $\\frac{dy}{dx}=\\frac{dy/dt}{dx/dt}$.", "$dy/dt=a\\cos t$.", "$dx/dt=-a\\sin t$."],
        solution: [{ step: 1, explanation: "Divide derivatives with respect to $t$.", math: "\\frac{dy}{dx}=\\frac{a\\cos t}{-a\\sin t}=-\\cot t" }],
      },
      {
        questionLatex:
          "\\text{If }y=x^x\\text{ for }x>0,\\text{ then }\\frac{dy}{dx}=",
        difficulty: 3,
        skillTags: ["log_differentiation"],
        choices: ["$x^x(\\ln x+1)$", "$x^{x-1}$", "$x^x\\ln x$", "$x^x$"],
        correctLetter: "A",
        hints: ["Take logarithm on both sides.", "$\\ln y=x\\ln x$.", "Differentiate and multiply by $y$."],
        solution: [{ step: 1, explanation: "Use logarithmic differentiation.", math: "\\frac{1}{y}\\frac{dy}{dx}=\\ln x+1\\Rightarrow \\frac{dy}{dx}=x^x(\\ln x+1)" }],
      },
      {
        questionLatex:
          "\\text{For }y=x^3-3x,\\text{ the value of }\\frac{d^2y}{dx^2}\\text{ at }x=2\\text{ is}",
        difficulty: 3,
        skillTags: ["second_derivative"],
        choices: ["$12$", "$9$", "$6$", "$3$"],
        correctLetter: "A",
        hints: ["Find the first derivative.", "Then differentiate again.", "Substitute $x=2$."],
        solution: [{ step: 1, explanation: "Compute the second derivative.", math: "y'=3x^2-3,\\quad y''=6x,\\quad y''(2)=12" }],
      },
      {
        questionLatex:
          "\\text{If }x^2+xy+y^2=3,\\text{ then }\\left.\\frac{dy}{dx}\\right|_{(1,1)}=",
        difficulty: 4,
        skillTags: ["implicit"],
        choices: ["$-1$", "$1$", "$0$", "$-2$"],
        correctLetter: "A",
        hints: ["Differentiate $xy$ using product rule.", "Collect terms containing $\\frac{dy}{dx}$.", "Substitute $(1,1)$."],
        solution: [{ step: 1, explanation: "Differentiate and substitute.", math: "2x+y+x\\frac{dy}{dx}+2y\\frac{dy}{dx}=0\\Rightarrow \\frac{dy}{dx}=-\\frac{2x+y}{x+2y};\\ (1,1)\\Rightarrow -1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{If }x^2+xy=6,\\text{ find }\\frac{dy}{dx}.",
        difficulty: 2,
        skillTags: ["implicit"],
        parts: singlePart("a", "Differentiate implicitly.", 2),
        hints: ["Differentiate $xy$ using product rule.", "Collect $dy/dx$ terms.", "Solve for $dy/dx$."],
        rubric: singleRubric("a", 2, "Finds $\\frac{dy}{dx}=-\\frac{2x+y}{x}$."),
        commonErrors: ["Differentiating $xy$ as only $x\\frac{dy}{dx}$."],
        workedSolution: [{ part: "a", explanation: "$2x+x\\frac{dy}{dx}+y=0$, so $\\frac{dy}{dx}=-\\frac{2x+y}{x}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{If }x=t^2+1\\text{ and }y=t^3,\\text{ find }\\frac{dy}{dx}\\text{ in terms of }t.",
        difficulty: 2,
        skillTags: ["parametric"],
        parts: singlePart("a", "Find $\\frac{dy}{dx}$.", 2),
        hints: ["Use $\\frac{dy}{dx}=\\frac{dy/dt}{dx/dt}$.", "$dy/dt=3t^2$.", "$dx/dt=2t$."],
        rubric: singleRubric("a", 2, "Finds $\\frac{dy}{dx}=\\frac{3t}{2}$."),
        commonErrors: ["Dividing $dx/dt$ by $dy/dt$."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{dx}=\\frac{3t^2}{2t}=\\frac{3t}{2}$ for $t\\ne0$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Differentiate }y=(x^2+1)^x.",
        difficulty: 3,
        skillTags: ["log_differentiation"],
        parts: singlePart("a", "Use logarithmic differentiation.", 3),
        hints: ["Take $\\ln$ on both sides.", "Use product rule on $x\\ln(x^2+1)$.", "Multiply by $y$ at the end."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\ln y=x\\ln(x^2+1)$." },
            { part: "a", points: 1, description: "Differentiates correctly." },
            { part: "a", points: 1, description: "Writes final derivative." },
          ],
        },
        commonErrors: ["Treating the exponent $x$ as a constant."],
        workedSolution: [{ part: "a", explanation: "$\\ln y=x\\ln(x^2+1)$. Thus $\\frac{y'}y=\\ln(x^2+1)+\\frac{2x^2}{x^2+1}$, so $y'=(x^2+1)^x\\left(\\ln(x^2+1)+\\frac{2x^2}{x^2+1}\\right)$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{For }x=a(\\theta-\\sin\\theta),\\ y=a(1-\\cos\\theta),\\text{ find }\\frac{dy}{dx}\\text{ and }\\frac{d^2y}{dx^2}.",
        difficulty: 5,
        skillTags: ["parametric", "second_derivative"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\frac{dy}{dx}$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $\\frac{d^2y}{dx^2}$.", points: 3 },
        ],
        hints: ["Use $dy/dx=(dy/d\\theta)/(dx/d\\theta)$.", "Use $1-\\cos\\theta=2\\sin^2(\\theta/2)$ and $\\sin\\theta=2\\sin(\\theta/2)\\cos(\\theta/2)$ if useful.", "For second derivative, divide derivative with respect to $\\theta$ by $dx/d\\theta$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $\\frac{dy}{dx}=\\cot\\frac\\theta2$." },
            { part: "b", points: 2, description: "Differentiates $\\cot\\frac\\theta2$ with respect to $\\theta$ correctly." },
            { part: "b", points: 1, description: "Finds $\\frac{d^2y}{dx^2}=-\\frac{1}{a(1-\\cos\\theta)^2}$." },
          ],
        },
        commonErrors: ["Differentiating $dy/dx$ directly with respect to $x$ without using the parameter."],
        workedSolution: [
          { part: "a", explanation: "$dx/d\\theta=a(1-\\cos\\theta)$ and $dy/d\\theta=a\\sin\\theta$, so $\\frac{dy}{dx}=\\frac{\\sin\\theta}{1-\\cos\\theta}=\\cot\\frac\\theta2$." },
          { part: "b", explanation: "$\\frac{d^2y}{dx^2}=\\frac{d}{d\\theta}(\\cot\\frac\\theta2)\\div a(1-\\cos\\theta)=\\frac{-\\frac12\\csc^2(\\theta/2)}{a(1-\\cos\\theta)}=-\\frac{1}{a(1-\\cos\\theta)^2}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A particle moves along the curve }x=t^2+1,\\ y=t^3-t\\text{ at time }t.",
        difficulty: 4,
        skillTags: ["parametric", "second_derivative", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\frac{dy}{dx}$ in terms of $t$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the slope of the tangent at $t=1$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $\\frac{d^2y}{dx^2}$ at $t=1$.", points: 2 },
        ],
        hints: ["Use parametric differentiation.", "$dx/dt=2t$ and $dy/dt=3t^2-1$.", "For second derivative, differentiate $dy/dx$ with respect to $t$ and divide by $dx/dt$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\frac{dy}{dx}=\\frac{3t^2-1}{2t}$." },
            { part: "b", points: 1, description: "Finds slope $1$ at $t=1$." },
            { part: "c", points: 2, description: "Finds $\\frac{d^2y}{dx^2}=\\frac{3t^2+1}{4t^3}$ and value $1$ at $t=1$." },
          ],
        },
        commonErrors: ["Using $dy/dt$ as the slope instead of $dy/dx$."],
        workedSolution: [
          { part: "a", explanation: "$\\frac{dy}{dx}=\\frac{3t^2-1}{2t}$." },
          { part: "b", explanation: "At $t=1$, the slope is $\\frac{3-1}{2}=1$." },
          { part: "c", explanation: "$\\frac{3t^2-1}{2t}=\\frac32t-\\frac1{2t}$, so $\\frac{d}{dt}(dy/dx)=\\frac32+\\frac1{2t^2}$. Dividing by $dx/dt=2t$ gives $\\frac{3t^2+1}{4t^3}$, which equals $1$ at $t=1$." },
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Applications of Derivatives: Rates and Monotonicity",
    subtopic:
      "Rate of change, marginal quantities, and increasing/decreasing intervals.",
    mc: [
      {
        questionLatex:
          "\\text{If }s(t)=t^3-6t^2+9t,\\text{ then }s(t)\\text{ is increasing on}",
        difficulty: 2,
        skillTags: ["increasing_decreasing"],
        choices: ["$(-\\infty,1)\\cup(3,\\infty)$", "$(1,3)$", "$(-\\infty,3)$", "$(1,\\infty)$"],
        correctLetter: "A",
        hints: ["Differentiate $s(t)$.", "Factor $s'(t)=3(t-1)(t-3)$.", "Increasing means $s'(t)>0$."],
        solution: [{ step: 1, explanation: "Use the derivative sign.", math: "s'(t)=3(t-1)(t-3)>0\\text{ on }(-\\infty,1)\\cup(3,\\infty)" }],
      },
      {
        questionLatex:
          "\\text{The radius of a circle increases at }2\\text{ cm/s. When }r=5\\text{ cm, }\\frac{dA}{dt}=",
        difficulty: 2,
        skillTags: ["rate_of_change"],
        choices: ["$20\\pi\\text{ cm}^2/\\text{s}$", "$10\\pi\\text{ cm}^2/\\text{s}$", "$25\\pi\\text{ cm}^2/\\text{s}$", "$4\\pi\\text{ cm}^2/\\text{s}$"],
        correctLetter: "A",
        hints: ["Area is $A=\\pi r^2$.", "Differentiate with respect to $t$.", "Substitute $r=5$ and $dr/dt=2$."],
        solution: [{ step: 1, explanation: "Differentiate area with respect to time.", math: "\\frac{dA}{dt}=2\\pi r\\frac{dr}{dt}=2\\pi(5)(2)=20\\pi" }],
      },
      {
        questionLatex:
          "\\text{For }f(x)=x^3-3x,\\text{ the function is decreasing on}",
        difficulty: 3,
        skillTags: ["increasing_decreasing"],
        choices: ["$(-1,1)$", "$(-\\infty,-1)$", "$(1,\\infty)$", "$(-\\infty,\\infty)$"],
        correctLetter: "A",
        hints: ["Find $f'(x)$.", "$f'(x)=3(x^2-1)$.", "Decreasing means $f'(x)<0$."],
        solution: [{ step: 1, explanation: "Use derivative sign.", math: "3(x^2-1)<0\\Rightarrow -1<x<1" }],
      },
      {
        questionLatex:
          "\\text{If }C(x)=x^2+5x+100\\text{ is cost in rupees, the marginal cost at }x=10\\text{ is}",
        difficulty: 3,
        skillTags: ["rate_of_change", "marginal_cost"],
        choices: ["$25$", "$100$", "$150$", "$205$"],
        correctLetter: "A",
        hints: ["Marginal cost is $C'(x)$.", "Differentiate $C(x)$.", "Substitute $x=10$."],
        solution: [{ step: 1, explanation: "Compute the derivative.", math: "C'(x)=2x+5,\\quad C'(10)=25" }],
      },
      {
        questionLatex:
          "\\text{For }h(x)=\\ln x-\\frac{x}{2}\\text{ with }x>0,\\text{ }h\\text{ is increasing on}",
        difficulty: 4,
        skillTags: ["increasing_decreasing"],
        choices: ["$(0,2)$", "$(2,\\infty)$", "$(-\\infty,2)$", "$(0,\\infty)$"],
        correctLetter: "A",
        hints: ["Differentiate $h$.", "$h'(x)=\\frac1x-\\frac12$.", "Solve $h'(x)>0$ with $x>0$."],
        solution: [{ step: 1, explanation: "Use the derivative sign.", math: "\\frac1x-\\frac12>0\\Rightarrow x<2;\\ x>0\\Rightarrow (0,2)" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the rate of change of }V=r^3\\text{ with respect to }r\\text{ at }r=2.",
        difficulty: 2,
        skillTags: ["rate_of_change"],
        parts: singlePart("a", "Find $\\frac{dV}{dr}$ at $r=2$.", 2),
        hints: ["Differentiate $r^3$.", "Then substitute $r=2$.", "The derivative is $3r^2$."],
        rubric: singleRubric("a", 2, "Finds rate $12$."),
        commonErrors: ["Substituting first and differentiating a constant."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dV}{dr}=3r^2$, so at $r=2$ the rate is $12$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the intervals on which }f(x)=x^2-4x+1\\text{ is increasing.}",
        difficulty: 2,
        skillTags: ["increasing_decreasing"],
        parts: singlePart("a", "Find the increasing interval.", 2),
        hints: ["Find $f'(x)$.", "Increasing means $f'(x)>0$.", "Solve $2x-4>0$."],
        rubric: singleRubric("a", 2, "Finds increasing on $(2,\\infty)$."),
        commonErrors: ["Using the function sign instead of derivative sign."],
        workedSolution: [{ part: "a", explanation: "$f'(x)=2x-4$. Since $f'(x)>0$ for $x>2$, $f$ is increasing on $(2,\\infty)$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{The side }x\\text{ of a square is increasing at }3\\text{ cm/s. Find the rate of change of its area when }x=10\\text{ cm.}",
        difficulty: 3,
        skillTags: ["rate_of_change"],
        parts: singlePart("a", "Find $\\frac{dA}{dt}$.", 3),
        hints: ["Area is $A=x^2$.", "Differentiate with respect to $t$.", "Substitute $x=10$ and $dx/dt=3$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Writes $A=x^2$." },
            { part: "a", points: 1, description: "Differentiates $\\frac{dA}{dt}=2x\\frac{dx}{dt}$." },
            { part: "a", points: 1, description: "Finds $60\\text{ cm}^2/\\text{s}$." },
          ],
        },
        commonErrors: ["Using $2x$ but forgetting to multiply by $dx/dt$."],
        workedSolution: [{ part: "a", explanation: "$A=x^2$, so $\\frac{dA}{dt}=2x\\frac{dx}{dt}=2(10)(3)=60\\text{ cm}^2/\\text{s}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Find the intervals where }f(x)=x^3-6x^2+9x+1\\text{ is increasing or decreasing.}",
        difficulty: 4,
        skillTags: ["increasing_decreasing"],
        parts: [
          { letter: "a", promptMarkdown: "Find the critical points.", points: 2 },
          { letter: "b", promptMarkdown: "Determine increasing and decreasing intervals.", points: 3 },
        ],
        hints: ["Differentiate and factor.", "$f'(x)=3(x-1)(x-3)$.", "Use a sign chart."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds critical points $1$ and $3$." },
            { part: "b", points: 2, description: "Correctly determines derivative signs." },
            { part: "b", points: 1, description: "States increasing on $(-\\infty,1)\\cup(3,\\infty)$ and decreasing on $(1,3)$." },
          ],
        },
        commonErrors: ["Reporting the critical points but not the intervals."],
        workedSolution: [
          { part: "a", explanation: "$f'(x)=3x^2-12x+9=3(x-1)(x-3)$, so critical points are $1$ and $3$." },
          { part: "b", explanation: "$f'(x)>0$ on $(-\\infty,1)$ and $(3,\\infty)$, while $f'(x)<0$ on $(1,3)$. Hence $f$ is increasing on $(-\\infty,1)\\cup(3,\\infty)$ and decreasing on $(1,3)$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A function }f\\text{ has the derivative sign chart shown.}",
        difficulty: 4,
        skillTags: ["increasing_decreasing", "case_based"],
        figure: derivativeSignChartFigure,
        parts: [
          { letter: "a", promptMarkdown: "State the intervals where $f$ is increasing.", points: 1 },
          { letter: "b", promptMarkdown: "State the interval where $f$ is decreasing.", points: 1 },
          { letter: "c", promptMarkdown: "Identify the nature of the points $x=-1$ and $x=2$.", points: 2 },
        ],
        hints: ["Positive derivative means increasing.", "Negative derivative means decreasing.", "A change $+$ to $-$ gives local maximum; $-$ to $+$ gives local minimum."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States increasing on $(-\\infty,-1)\\cup(2,\\infty)$." },
            { part: "b", points: 1, description: "States decreasing on $(-1,2)$." },
            { part: "c", points: 2, description: "Identifies local maximum at $x=-1$ and local minimum at $x=2$." },
          ],
        },
        commonErrors: ["Reading the sign of $f'$ as the sign of $f$ itself."],
        workedSolution: [
          { part: "a", explanation: "$f'(x)>0$ on $(-\\infty,-1)$ and $(2,\\infty)$, so $f$ is increasing there." },
          { part: "b", explanation: "$f'(x)<0$ on $(-1,2)$, so $f$ is decreasing there." },
          { part: "c", explanation: "At $x=-1$, $f'$ changes from positive to negative, so there is a local maximum. At $x=2$, $f'$ changes from negative to positive, so there is a local minimum." },
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Applications of Derivatives: Maxima and Minima",
    subtopic:
      "First derivative and second derivative tests, simple optimization, and board-style extrema problems.",
    mc: [
      {
        questionLatex:
          "\\text{The minimum value of }f(x)=x^2-4x+7\\text{ is}",
        difficulty: 2,
        skillTags: ["maxima_minima"],
        choices: ["$3$", "$2$", "$7$", "$-4$"],
        correctLetter: "A",
        hints: ["Complete the square or differentiate.", "$f(x)=(x-2)^2+3$.", "The minimum occurs when the square is zero."],
        solution: [{ step: 1, explanation: "Complete the square.", math: "x^2-4x+7=(x-2)^2+3" }],
      },
      {
        questionLatex:
          "\\text{For }f(x)=x^3-3x,\\text{ the local maximum occurs at}",
        difficulty: 2,
        skillTags: ["maxima_minima"],
        choices: ["$x=-1$", "$x=1$", "$x=0$", "$x=3$"],
        correctLetter: "A",
        hints: ["Find $f'(x)$.", "Critical points are $x=\\pm1$.", "Use $f''(x)=6x$."],
        solution: [{ step: 1, explanation: "Second derivative test gives maximum at $x=-1$.", math: "f''(-1)=-6<0" }],
      },
      {
        questionLatex:
          "\\text{A rectangle has perimeter }40\\text{ cm. Its maximum area is}",
        difficulty: 3,
        skillTags: ["optimization"],
        choices: ["$100\\text{ cm}^2$", "$80\\text{ cm}^2$", "$40\\text{ cm}^2$", "$200\\text{ cm}^2$"],
        correctLetter: "A",
        hints: ["For a fixed perimeter, area is maximum for a square.", "Each side is $40/4=10$.", "Area is $10^2$."],
        solution: [{ step: 1, explanation: "The rectangle of maximum area is a square.", math: "A_{\\max}=10\\cdot10=100" }],
      },
      {
        questionLatex:
          "\\text{For }x>0,\\text{ the minimum value of }x+\\frac1x\\text{ is}",
        difficulty: 3,
        skillTags: ["maxima_minima"],
        choices: ["$2$", "$1$", "$0$", "$\\frac12$"],
        correctLetter: "A",
        hints: ["Differentiate $x+1/x$.", "Set $1-1/x^2=0$.", "At $x=1$, the value is $2$."],
        solution: [{ step: 1, explanation: "The critical point gives the minimum.", math: "f'(x)=1-\\frac1{x^2}=0\\Rightarrow x=1,\\quad f(1)=2" }],
      },
      {
        questionLatex:
          "\\text{On }[0,\\pi],\\text{ the maximum value of }\\sin x\\text{ is}",
        difficulty: 4,
        skillTags: ["maxima_minima"],
        choices: ["$1$", "$0$", "$-1$", "$\\pi$"],
        correctLetter: "A",
        hints: ["Find where $\\cos x=0$ in the interval.", "That point is $x=\\pi/2$.", "Evaluate $\\sin(\\pi/2)$."],
        solution: [{ step: 1, explanation: "Check the critical point and endpoints.", math: "\\sin(\\pi/2)=1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the stationary points of }f(x)=x^2-6x+5.",
        difficulty: 2,
        skillTags: ["maxima_minima"],
        parts: singlePart("a", "Find the stationary point.", 2),
        hints: ["Stationary point means $f'(x)=0$.", "Differentiate.", "Then find the corresponding $y$ value."],
        rubric: singleRubric("a", 2, "Finds stationary point $(3,-4)$."),
        commonErrors: ["Finding only $x=3$ and not the point."],
        workedSolution: [{ part: "a", explanation: "$f'(x)=2x-6=0$ gives $x=3$. Then $f(3)=9-18+5=-4$, so the stationary point is $(3,-4)$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Use the second derivative test for }f(x)=x^2+2x+3\\text{ at its critical point.}",
        difficulty: 2,
        skillTags: ["maxima_minima"],
        parts: singlePart("a", "State whether the critical point is a maximum or minimum.", 2),
        hints: ["Find $f'(x)$ and solve.", "Then find $f''(x)$.", "Positive second derivative means minimum."],
        rubric: singleRubric("a", 2, "Finds a minimum at $x=-1$."),
        commonErrors: ["Using $f'(x)$ sign at one point only."],
        workedSolution: [{ part: "a", explanation: "$f'(x)=2x+2=0$ gives $x=-1$. Since $f''(x)=2>0$, the critical point is a minimum." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the local maximum and local minimum values of }f(x)=x^3-3x.",
        difficulty: 3,
        skillTags: ["maxima_minima"],
        parts: singlePart("a", "Find both local extremum values.", 3),
        hints: ["Find critical points.", "Use $f''(x)=6x$.", "Evaluate $f$ at each critical point."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds critical points $x=\\pm1$." },
            { part: "a", points: 1, description: "Classifies local maximum and minimum correctly." },
            { part: "a", points: 1, description: "Finds values $2$ and $-2$." },
          ],
        },
        commonErrors: ["Reporting $x$ values but not function values."],
        workedSolution: [{ part: "a", explanation: "$f'(x)=3x^2-3=0$ gives $x=\\pm1$. Since $f''(x)=6x$, $x=-1$ is a local maximum and $x=1$ is a local minimum. Values are $f(-1)=2$ and $f(1)=-2$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A rectangle has perimeter }40\\text{ cm. Find its maximum possible area using calculus.}",
        difficulty: 4,
        skillTags: ["optimization", "maxima_minima"],
        parts: [
          { letter: "a", promptMarkdown: "Set up area as a function of one side $x$.", points: 2 },
          { letter: "b", promptMarkdown: "Find the value of $x$ that maximizes the area.", points: 2 },
          { letter: "c", promptMarkdown: "Find the maximum area.", points: 1 },
        ],
        hints: ["If one side is $x$, the other is $20-x$.", "Area is $A=x(20-x)$.", "Differentiate and set equal to zero."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Writes $A=x(20-x)$." },
            { part: "b", points: 2, description: "Finds $x=10$ using derivative." },
            { part: "c", points: 1, description: "Finds maximum area $100\\text{ cm}^2$." },
          ],
        },
        commonErrors: ["Using $40-x$ as the other side instead of $20-x$."],
        workedSolution: [
          { part: "a", explanation: "Since $2(l+b)=40$, if $l=x$, then $b=20-x$. Thus $A=x(20-x)=20x-x^2$." },
          { part: "b", explanation: "$A'=20-2x=0$ gives $x=10$. Also $A''=-2<0$, so this gives a maximum." },
          { part: "c", explanation: "The maximum area is $10(10)=100\\text{ cm}^2$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A farmer uses }40\\text{ m of fencing to enclose a rectangular plot. One side is }x\\text{ m, so the adjacent side is }20-x\\text{ m.}",
        difficulty: 4,
        skillTags: ["optimization", "case_based"],
        figure: rectangleOptimizationFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the area $A(x)$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the value of $x$ for maximum area.", points: 2 },
          { letter: "c", promptMarkdown: "Find the maximum area.", points: 1 },
        ],
        hints: ["Area is length times breadth.", "Differentiate $A(x)=x(20-x)$.", "Use $A''(x)<0$ to confirm maximum."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $A=x(20-x)$." },
            { part: "b", points: 2, description: "Finds $x=10$ and confirms maximum." },
            { part: "c", points: 1, description: "Finds area $100\\text{ m}^2$." },
          ],
        },
        commonErrors: ["Maximizing perimeter instead of area."],
        workedSolution: [
          { part: "a", explanation: "$A(x)=x(20-x)$." },
          { part: "b", explanation: "$A'(x)=20-2x=0$ gives $x=10$; $A''(x)=-2<0$, so this is a maximum." },
          { part: "c", explanation: "$A_{\\max}=10(10)=100\\text{ m}^2$." },
        ],
      },
    ],
  },
  {
    topicCode: "3.6",
    title: "Indefinite Integrals and Substitution",
    subtopic:
      "Integration as the inverse of differentiation, standard forms, and substitution.",
    mc: [
      {
        questionLatex:
          "\\int(3x^2+2x)\\,dx=",
        difficulty: 2,
        skillTags: ["indefinite_integral"],
        choices: ["$x^3+x^2+C$", "$6x+2+C$", "$3x^3+2x^2+C$", "$x^3+2x+C$"],
        correctLetter: "A",
        hints: ["Integrate term by term.", "Add $1$ to each power.", "Do not forget $C$."],
        solution: [{ step: 1, explanation: "Integrate each term.", math: "\\int(3x^2+2x)\\,dx=x^3+x^2+C" }],
      },
      {
        questionLatex:
          "\\int 2x\\cos(x^2)\\,dx=",
        difficulty: 2,
        skillTags: ["substitution"],
        choices: ["$\\sin(x^2)+C$", "$\\cos(x^2)+C$", "$2\\sin(x^2)+C$", "$-\\sin(x^2)+C$"],
        correctLetter: "A",
        hints: ["Let $u=x^2$.", "Then $du=2x\\,dx$.", "Integrate $\\cos u$."],
        solution: [{ step: 1, explanation: "Use substitution.", math: "\\int 2x\\cos(x^2)\\,dx=\\int\\cos u\\,du=\\sin u+C" }],
      },
      {
        questionLatex:
          "\\int\\frac{dx}{1+x^2}=",
        difficulty: 3,
        skillTags: ["indefinite_integral", "standard_integral"],
        choices: ["$\\tan^{-1}x+C$", "$\\sin^{-1}x+C$", "$\\ln(1+x^2)+C$", "$\\frac{-1}{1+x^2}+C$"],
        correctLetter: "A",
        hints: ["This is a standard inverse trigonometric integral.", "Recall derivative of $\\tan^{-1}x$.", "It is $1/(1+x^2)$."],
        solution: [{ step: 1, explanation: "Use the standard formula.", math: "\\int\\frac{dx}{1+x^2}=\\tan^{-1}x+C" }],
      },
      {
        questionLatex:
          "\\int e^{2x}\\,dx=",
        difficulty: 3,
        skillTags: ["indefinite_integral", "substitution"],
        choices: ["$\\frac12e^{2x}+C$", "$2e^{2x}+C$", "$e^{2x}+C$", "$e^x+C$"],
        correctLetter: "A",
        hints: ["Let $u=2x$.", "Then $du=2dx$.", "A factor $1/2$ appears."],
        solution: [{ step: 1, explanation: "Integrate exponential composite.", math: "\\int e^{2x}\\,dx=\\frac12e^{2x}+C" }],
      },
      {
        questionLatex:
          "\\int\\frac{x}{x^2+1}\\,dx=",
        difficulty: 4,
        skillTags: ["substitution", "log_integral"],
        choices: ["$\\frac12\\ln(x^2+1)+C$", "$\\ln(x^2+1)+C$", "$\\tan^{-1}x+C$", "$\\frac{1}{x^2+1}+C$"],
        correctLetter: "A",
        hints: ["Let $u=x^2+1$.", "Then $du=2x\\,dx$.", "So a factor $1/2$ is needed."],
        solution: [{ step: 1, explanation: "Use substitution.", math: "\\int\\frac{x}{x^2+1}\\,dx=\\frac12\\ln(x^2+1)+C" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\int(4x^3-2x)\\,dx.",
        difficulty: 2,
        skillTags: ["indefinite_integral"],
        parts: singlePart("a", "Find the indefinite integral.", 2),
        hints: ["Integrate term by term.", "Use the power rule.", "Add the constant of integration."],
        rubric: singleRubric("a", 2, "Finds $x^4-x^2+C$."),
        commonErrors: ["Forgetting the constant of integration."],
        workedSolution: [{ part: "a", explanation: "$\\int(4x^3-2x)\\,dx=x^4-x^2+C$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\int\\frac{2x}{1+x^2}\\,dx.",
        difficulty: 2,
        skillTags: ["substitution", "log_integral"],
        parts: singlePart("a", "Find the integral.", 2),
        hints: ["Let $u=1+x^2$.", "Then $du=2x\\,dx$.", "Integrate $1/u$."],
        rubric: singleRubric("a", 2, "Finds $\\ln(1+x^2)+C$."),
        commonErrors: ["Writing $\\frac12\\ln(1+x^2)$ even though $2x$ is already present."],
        workedSolution: [{ part: "a", explanation: "Let $u=1+x^2$. Then $du=2x\\,dx$, so the integral is $\\ln(1+x^2)+C$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Evaluate }\\int\\frac{dx}{\\sqrt{9-x^2}}.",
        difficulty: 3,
        skillTags: ["indefinite_integral", "standard_integral"],
        parts: singlePart("a", "Use the standard formula.", 3),
        hints: ["Compare with $\\int\\frac{dx}{\\sqrt{a^2-x^2}}$.", "Here $a=3$.", "The result is inverse sine."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies the standard form." },
            { part: "a", points: 1, description: "Uses $a=3$ correctly." },
            { part: "a", points: 1, description: "Writes $\\sin^{-1}(x/3)+C$." },
          ],
        },
        commonErrors: ["Writing $\\sin^{-1}x$ instead of $\\sin^{-1}(x/3)$."],
        workedSolution: [{ part: "a", explanation: "$\\int\\frac{dx}{\\sqrt{9-x^2}}=\\sin^{-1}\\left(\\frac{x}{3}\\right)+C$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Evaluate }\\int x\\sqrt{x^2+4}\\,dx.",
        difficulty: 4,
        skillTags: ["substitution", "indefinite_integral"],
        parts: [
          { letter: "a", promptMarkdown: "Choose a substitution.", points: 2 },
          { letter: "b", promptMarkdown: "Evaluate the integral.", points: 3 },
        ],
        hints: ["Let $u=x^2+4$.", "Then $du=2x\\,dx$.", "Integrate $\\frac12u^{1/2}$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Uses $u=x^2+4$ and $du=2x\\,dx$." },
            { part: "b", points: 2, description: "Integrates $\\frac12u^{1/2}$ correctly." },
            { part: "b", points: 1, description: "Writes $\\frac13(x^2+4)^{3/2}+C$." },
          ],
        },
        commonErrors: ["Forgetting to replace $x\\,dx$ by $du/2$."],
        workedSolution: [
          { part: "a", explanation: "Let $u=x^2+4$. Then $du=2x\\,dx$, so $x\\,dx=\\frac12du$." },
          { part: "b", explanation: "$\\int x\\sqrt{x^2+4}\\,dx=\\frac12\\int u^{1/2}\\,du=\\frac13u^{3/2}+C=\\frac13(x^2+4)^{3/2}+C$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The acceleration of a particle is }a(t)=6t+4\\text{ m/s}^2.\\text{ Its velocity at }t=0\\text{ is }3\\text{ m/s.}",
        difficulty: 4,
        skillTags: ["indefinite_integral", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find the general form of velocity $v(t)$.", points: 2 },
          { letter: "b", promptMarkdown: "Use $v(0)=3$ to find the constant.", points: 1 },
          { letter: "c", promptMarkdown: "Find $v(2)$.", points: 1 },
        ],
        hints: ["Velocity is the integral of acceleration.", "Integrate $6t+4$.", "Use the initial condition."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $v(t)=3t^2+4t+C$." },
            { part: "b", points: 1, description: "Finds $C=3$." },
            { part: "c", points: 1, description: "Finds $v(2)=23$ m/s." },
          ],
        },
        commonErrors: ["Treating acceleration as velocity without integrating."],
        workedSolution: [
          { part: "a", explanation: "$v(t)=\\int(6t+4)\\,dt=3t^2+4t+C$." },
          { part: "b", explanation: "$v(0)=C=3$." },
          { part: "c", explanation: "$v(2)=3(4)+8+3=23$ m/s." },
        ],
      },
    ],
  },
  {
    topicCode: "3.7",
    title: "Integration by Parts and Partial Fractions",
    subtopic:
      "CBSE integration techniques: parts, partial fractions, and choosing a method.",
    mc: [
      {
        questionLatex:
          "\\int xe^x\\,dx=",
        difficulty: 2,
        skillTags: ["parts"],
        choices: ["$e^x(x-1)+C$", "$xe^x+C$", "$e^x(x+1)+C$", "$\\frac{x^2e^x}{2}+C$"],
        correctLetter: "A",
        hints: ["Use integration by parts.", "Take $u=x$, $dv=e^x dx$.", "Then integrate."],
        solution: [{ step: 1, explanation: "Apply integration by parts.", math: "\\int xe^x\\,dx=xe^x-\\int e^x\\,dx=e^x(x-1)+C" }],
      },
      {
        questionLatex:
          "\\int\\ln x\\,dx=",
        difficulty: 2,
        skillTags: ["parts"],
        choices: ["$x\\ln x-x+C$", "$\\frac1x+C$", "$\\ln x+C$", "$x\\ln x+C$"],
        correctLetter: "A",
        hints: ["Treat $\\ln x$ as $\\ln x\\cdot1$.", "Use parts with $u=\\ln x$.", "Then $du=dx/x$."],
        solution: [{ step: 1, explanation: "Use integration by parts.", math: "\\int\\ln x\\,dx=x\\ln x-\\int1\\,dx=x\\ln x-x+C" }],
      },
      {
        questionLatex:
          "\\int\\frac{dx}{x(x+1)}=",
        difficulty: 3,
        skillTags: ["partial_fractions"],
        choices: ["$\\ln|x|-\\ln|x+1|+C$", "$\\ln|x+1|-\\ln|x|+C$", "$\\frac1{x+1}+C$", "$\\ln|x(x+1)|+C$"],
        correctLetter: "A",
        hints: ["Write $\\frac1{x(x+1)}=\\frac A x+\\frac B{x+1}$.", "Solve for $A$ and $B$.", "You should get $A=1,B=-1$."],
        solution: [{ step: 1, explanation: "Use partial fractions.", math: "\\frac1{x(x+1)}=\\frac1x-\\frac1{x+1}" }],
      },
      {
        questionLatex:
          "\\int\\frac{x}{x^2-1}\\,dx=",
        difficulty: 3,
        skillTags: ["substitution", "log_integral"],
        choices: ["$\\frac12\\ln|x^2-1|+C$", "$\\ln|x^2-1|+C$", "$\\frac1{x^2-1}+C$", "$\\tan^{-1}x+C$"],
        correctLetter: "A",
        hints: ["Let $u=x^2-1$.", "Then $du=2x\\,dx$.", "A factor $1/2$ appears."],
        solution: [{ step: 1, explanation: "Use substitution.", math: "\\int\\frac{x}{x^2-1}\\,dx=\\frac12\\ln|x^2-1|+C" }],
      },
      {
        questionLatex:
          "\\int x\\sin x\\,dx=",
        difficulty: 4,
        skillTags: ["parts"],
        choices: ["$-x\\cos x+\\sin x+C$", "$x\\cos x-\\sin x+C$", "$-x\\sin x+\\cos x+C$", "$x\\sin x+\\cos x+C$"],
        correctLetter: "A",
        hints: ["Use integration by parts.", "Take $u=x$, $dv=\\sin x\\,dx$.", "Then $v=-\\cos x$."],
        solution: [{ step: 1, explanation: "Apply integration by parts.", math: "\\int x\\sin x\\,dx=-x\\cos x+\\int\\cos x\\,dx=-x\\cos x+\\sin x+C" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\int x\\cos x\\,dx.",
        difficulty: 2,
        skillTags: ["parts"],
        parts: singlePart("a", "Use integration by parts.", 2),
        hints: ["Take $u=x$.", "Take $dv=\\cos x\\,dx$.", "Then $v=\\sin x$."],
        rubric: singleRubric("a", 2, "Finds $x\\sin x+\\cos x+C$."),
        commonErrors: ["Missing the final integral of $\\sin x$."],
        workedSolution: [{ part: "a", explanation: "$\\int x\\cos x\\,dx=x\\sin x-\\int\\sin x\\,dx=x\\sin x+\\cos x+C$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Resolve }\\frac{1}{x^2-1}\\text{ into partial fractions.}",
        difficulty: 2,
        skillTags: ["partial_fractions"],
        parts: singlePart("a", "Find the partial fraction form.", 2),
        hints: ["Factor $x^2-1$.", "Use $\\frac A{x-1}+\\frac B{x+1}$.", "Solve for $A,B$."],
        rubric: singleRubric("a", 2, "Finds $\\frac{1}{x^2-1}=\\frac12\\left(\\frac1{x-1}-\\frac1{x+1}\\right)$."),
        commonErrors: ["Using equal signs for both fractions."],
        workedSolution: [{ part: "a", explanation: "$\\frac1{x^2-1}=\\frac A{x-1}+\\frac B{x+1}$. Solving gives $A=\\frac12$, $B=-\\frac12$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Evaluate }\\int\\frac{3x+5}{(x+1)(x+2)}\\,dx.",
        difficulty: 3,
        skillTags: ["partial_fractions"],
        parts: singlePart("a", "Use partial fractions.", 3),
        hints: ["Write $\\frac{3x+5}{(x+1)(x+2)}=\\frac A{x+1}+\\frac B{x+2}$.", "Solve $3x+5=A(x+2)+B(x+1)$.", "Then integrate logarithms."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Sets up partial fractions." },
            { part: "a", points: 1, description: "Finds $A=2,B=1$." },
            { part: "a", points: 1, description: "Integrates to $2\\ln|x+1|+\\ln|x+2|+C$." },
          ],
        },
        commonErrors: ["Solving for $A,B$ incorrectly by substituting the same root twice."],
        workedSolution: [{ part: "a", explanation: "$3x+5=A(x+2)+B(x+1)$. Taking $x=-1$ gives $A=2$; taking $x=-2$ gives $B=1$. Hence the integral is $2\\ln|x+1|+\\ln|x+2|+C$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Evaluate }\\int x^2e^x\\,dx.",
        difficulty: 4,
        skillTags: ["parts"],
        parts: [
          { letter: "a", promptMarkdown: "Apply integration by parts once.", points: 2 },
          { letter: "b", promptMarkdown: "Apply it again to finish the integral.", points: 3 },
        ],
        hints: ["Take $u=x^2$, $dv=e^xdx$.", "You will need $\\int xe^x dx$.", "The result should differentiate back to $x^2e^x$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Obtains $x^2e^x-2\\int xe^x dx$." },
            { part: "b", points: 2, description: "Evaluates $\\int xe^x dx$ correctly." },
            { part: "b", points: 1, description: "Finds $e^x(x^2-2x+2)+C$." },
          ],
        },
        commonErrors: ["Stopping after the first integration by parts."],
        workedSolution: [
          { part: "a", explanation: "$\\int x^2e^x dx=x^2e^x-\\int2xe^x dx=x^2e^x-2\\int xe^x dx$." },
          { part: "b", explanation: "$\\int xe^x dx=xe^x-e^x$. Hence the answer is $x^2e^x-2(xe^x-e^x)=e^x(x^2-2x+2)+C$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A student evaluates }I=\\int x\\ln x\\,dx\\text{ for }x>0\\text{ using integration by parts.}",
        difficulty: 4,
        skillTags: ["parts", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Choose $u$ and $dv$ suitably.", points: 1 },
          { letter: "b", promptMarkdown: "Evaluate $I$.", points: 2 },
          { letter: "c", promptMarkdown: "Differentiate your answer to check it.", points: 1 },
        ],
        hints: ["Choose $u=\\ln x$ because its derivative becomes simpler.", "Choose $dv=x\\,dx$.", "Differentiate the final answer as a check."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Chooses $u=\\ln x$, $dv=x\\,dx$." },
            { part: "b", points: 2, description: "Finds $\\frac{x^2}{2}\\ln x-\\frac{x^2}{4}+C$." },
            { part: "c", points: 1, description: "Verifies by differentiation." },
          ],
        },
        commonErrors: ["Taking $u=x$ and making the integral harder."],
        workedSolution: [
          { part: "a", explanation: "Let $u=\\ln x$ and $dv=x\\,dx$. Then $du=\\frac1x dx$ and $v=\\frac{x^2}{2}$." },
          { part: "b", explanation: "$I=\\frac{x^2}{2}\\ln x-\\int\\frac{x^2}{2}\\cdot\\frac1x dx=\\frac{x^2}{2}\\ln x-\\frac12\\int xdx=\\frac{x^2}{2}\\ln x-\\frac{x^2}{4}+C$." },
          { part: "c", explanation: "Differentiating gives $x\\ln x+\\frac{x}{2}-\\frac{x}{2}=x\\ln x$, as required." },
        ],
      },
    ],
  },
  {
    topicCode: "3.8",
    title: "Definite Integrals, Properties, and FTC",
    subtopic:
      "Definite integral evaluation, fundamental theorem of calculus, and standard properties.",
    mc: [
      {
        questionLatex:
          "\\int_0^2(3x^2+1)\\,dx=",
        difficulty: 2,
        skillTags: ["definite_integral"],
        choices: ["$10$", "$8$", "$9$", "$12$"],
        correctLetter: "A",
        hints: ["Find an antiderivative.", "Use $x^3+x$.", "Evaluate from $0$ to $2$."],
        solution: [{ step: 1, explanation: "Evaluate the antiderivative.", math: "[x^3+x]_0^2=8+2=10" }],
      },
      {
        questionLatex:
          "\\frac{d}{dx}\\left(\\int_0^x\\sqrt{1+t^2}\\,dt\\right)=",
        difficulty: 2,
        skillTags: ["ftc"],
        choices: ["$\\sqrt{1+x^2}$", "$\\sqrt{1+t^2}$", "$\\frac{x}{\\sqrt{1+x^2}}$", "$0$"],
        correctLetter: "A",
        hints: ["Use the Fundamental Theorem of Calculus.", "Replace the dummy variable by the upper limit.", "Differentiate only the variable upper limit."],
        solution: [{ step: 1, explanation: "By FTC.", math: "\\frac{d}{dx}\\int_0^x f(t)dt=f(x)=\\sqrt{1+x^2}" }],
      },
      {
        questionLatex:
          "\\int_{-2}^{2}x^3\\,dx=",
        difficulty: 3,
        skillTags: ["definite_integral", "symmetry"],
        choices: ["$0$", "$8$", "$16$", "$-8$"],
        correctLetter: "A",
        hints: ["$x^3$ is an odd function.", "The interval is symmetric about $0$.", "Integral of an odd function over $[-a,a]$ is $0$."],
        solution: [{ step: 1, explanation: "Use symmetry.", math: "\\int_{-2}^{2}x^3dx=0" }],
      },
      {
        questionLatex:
          "\\int_0^{\\pi/2}\\frac{\\sin x}{\\sin x+\\cos x}\\,dx=",
        difficulty: 3,
        skillTags: ["definite_integral", "definite_integral_properties"],
        choices: ["$\\frac\\pi4$", "$\\frac\\pi2$", "$1$", "$0$"],
        correctLetter: "A",
        hints: ["Let the integral be $I$.", "Use the property $x\\mapsto\\frac\\pi2-x$.", "Add the two equal forms."],
        solution: [{ step: 1, explanation: "Use complementary substitution.", math: "2I=\\int_0^{\\pi/2}1\\,dx=\\frac\\pi2\\Rightarrow I=\\frac\\pi4" }],
      },
      {
        questionLatex:
          "\\int_0^a f(x)\\,dx\\text{ equals }\\int_0^a f(a-x)\\,dx\\text{ because of}",
        difficulty: 4,
        skillTags: ["definite_integral_properties"],
        choices: [
          "$\\text{the substitution }u=a-x$",
          "$\\text{integration by parts}$",
          "$\\text{partial fractions}$",
          "$\\text{differentiability of }f$",
        ],
        correctLetter: "A",
        hints: ["Use a change of variable.", "Let $u=a-x$.", "The limits reverse and the negative sign reverses them back."],
        solution: [{ step: 1, explanation: "This is a standard definite integral property from substitution.", math: "u=a-x" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\int_0^1(2x+1)\\,dx.",
        difficulty: 2,
        skillTags: ["definite_integral"],
        parts: singlePart("a", "Evaluate the integral.", 2),
        hints: ["Find the antiderivative.", "Use $x^2+x$.", "Substitute limits $0$ and $1$."],
        rubric: singleRubric("a", 2, "Finds value $2$."),
        commonErrors: ["Adding an arbitrary constant to the final definite integral."],
        workedSolution: [{ part: "a", explanation: "$\\int_0^1(2x+1)dx=[x^2+x]_0^1=2$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find }\\frac{d}{dx}\\left(\\int_1^{x^2}\\cos t\\,dt\\right).",
        difficulty: 2,
        skillTags: ["ftc", "chain_rule"],
        parts: singlePart("a", "Differentiate using FTC.", 2),
        hints: ["The upper limit is $x^2$.", "Apply FTC and then chain rule.", "Multiply by $2x$."],
        rubric: singleRubric("a", 2, "Finds $2x\\cos(x^2)$."),
        commonErrors: ["Forgetting to multiply by derivative of $x^2$."],
        workedSolution: [{ part: "a", explanation: "By FTC and chain rule, the derivative is $\\cos(x^2)\\cdot2x=2x\\cos(x^2)$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Evaluate }\\int_{-1}^{1}(x^4+x^3)\\,dx.",
        difficulty: 3,
        skillTags: ["definite_integral", "symmetry"],
        parts: singlePart("a", "Use symmetry where possible.", 3),
        hints: ["Split the integral into even and odd parts.", "$x^4$ is even.", "$x^3$ is odd."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Recognizes odd part integrates to zero." },
            { part: "a", points: 1, description: "Evaluates $\\int_{-1}^{1}x^4dx$ correctly." },
            { part: "a", points: 1, description: "Gets $\\frac25$." },
          ],
        },
        commonErrors: ["Treating both terms as odd because the interval is symmetric."],
        workedSolution: [{ part: "a", explanation: "$\\int_{-1}^{1}x^3dx=0$ and $\\int_{-1}^{1}x^4dx=2\\int_0^1x^4dx=2/5$. Hence the value is $\\frac25$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Evaluate }\\int_0^{\\pi/2}\\frac{\\cos x}{\\sin x+\\cos x}\\,dx.",
        difficulty: 4,
        skillTags: ["definite_integral", "definite_integral_properties"],
        parts: [
          { letter: "a", promptMarkdown: "Use $x\\mapsto\\frac\\pi2-x$ to form a second expression for the integral.", points: 2 },
          { letter: "b", promptMarkdown: "Add the two expressions and evaluate.", points: 3 },
        ],
        hints: ["Let the integral be $I$.", "After substitution, it becomes the corresponding sine numerator integral.", "The two numerators add to the denominator."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Writes the transformed integral correctly." },
            { part: "b", points: 2, description: "Shows $2I=\\frac\\pi2$." },
            { part: "b", points: 1, description: "Finds $I=\\frac\\pi4$." },
          ],
        },
        commonErrors: ["Adding denominators instead of numerators."],
        workedSolution: [
          { part: "a", explanation: "Let $I=\\int_0^{\\pi/2}\\frac{\\cos x}{\\sin x+\\cos x}dx$. Using $x\\mapsto\\frac\\pi2-x$, $I=\\int_0^{\\pi/2}\\frac{\\sin x}{\\sin x+\\cos x}dx$." },
          { part: "b", explanation: "Adding, $2I=\\int_0^{\\pi/2}1dx=\\frac\\pi2$, so $I=\\frac\\pi4$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The shaded region shown is under }y=x^2\\text{ from }x=0\\text{ to }x=2.",
        difficulty: 4,
        skillTags: ["definite_integral", "area_integral", "case_based"],
        figure: definiteAreaFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the definite integral for the shaded area.", points: 1 },
          { letter: "b", promptMarkdown: "Evaluate the area.", points: 2 },
          { letter: "c", promptMarkdown: "Explain why no $+C$ appears in the final answer.", points: 1 },
        ],
        hints: ["Area under a positive curve is a definite integral.", "Evaluate $\\int_0^2x^2dx$.", "Constants cancel in definite integrals."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\int_0^2x^2dx$." },
            { part: "b", points: 2, description: "Finds area $\\frac83$." },
            { part: "c", points: 1, description: "Explains that definite integrals evaluate between limits, so arbitrary constants cancel." },
          ],
        },
        commonErrors: ["Adding $+C$ to a definite integral answer."],
        workedSolution: [
          { part: "a", explanation: "The shaded area is $\\int_0^2x^2dx$." },
          { part: "b", explanation: "$\\int_0^2x^2dx=\\left[\\frac{x^3}{3}\\right]_0^2=\\frac83$." },
          { part: "c", explanation: "A definite integral uses upper and lower limits. Any constant in an antiderivative cancels when subtracting values." },
        ],
      },
    ],
  },
  {
    topicCode: "3.9",
    title: "Applications of Integrals",
    subtopic:
      "Area under simple curves and area between two curves using definite integrals.",
    mc: [
      {
        questionLatex:
          "\\text{The area under }y=x\\text{ from }x=0\\text{ to }x=4\\text{ is}",
        difficulty: 2,
        skillTags: ["area_integral"],
        choices: ["$8$", "$4$", "$16$", "$12$"],
        correctLetter: "A",
        hints: ["Use the triangle area or integrate.", "The base is $4$ and height is $4$.", "Area is $\\frac12(4)(4)$."],
        solution: [{ step: 1, explanation: "Compute area.", math: "\\int_0^4x\\,dx=8" }],
      },
      {
        questionLatex:
          "\\text{The area under }y=\\sqrt{9-x^2}\\text{ from }x=-3\\text{ to }x=3\\text{ is}",
        difficulty: 2,
        skillTags: ["area_integral", "geometric_area"],
        choices: ["$\\frac{9\\pi}{2}$", "$9\\pi$", "$3\\pi$", "$18\\pi$"],
        correctLetter: "A",
        hints: ["The curve is the upper semicircle of radius $3$.", "Area of full circle is $9\\pi$.", "Take half."],
        solution: [{ step: 1, explanation: "Use semicircle area.", math: "\\frac12\\pi(3)^2=\\frac{9\\pi}{2}" }],
      },
      {
        questionLatex:
          "\\text{The area between }y=x\\text{ and }y=x^2\\text{ from }x=0\\text{ to }x=1\\text{ is}",
        difficulty: 3,
        skillTags: ["area_integral", "area_between_curves"],
        choices: ["$\\frac16$", "$\\frac12$", "$\\frac13$", "$1$"],
        correctLetter: "A",
        hints: ["On $[0,1]$, $x\\ge x^2$.", "Integrate top minus bottom.", "Compute $\\int_0^1(x-x^2)dx$."],
        solution: [{ step: 1, explanation: "Compute area between curves.", math: "\\int_0^1(x-x^2)dx=\\left[\\frac{x^2}{2}-\\frac{x^3}{3}\\right]_0^1=\\frac16" }],
      },
      {
        questionLatex:
          "\\text{The area bounded by }y=4-x^2\\text{ and the }x\\text{-axis is}",
        difficulty: 3,
        skillTags: ["area_integral"],
        figure: parabolaAreaFigure,
        choices: ["$\\frac{32}{3}$", "$\\frac{16}{3}$", "$8$", "$16$"],
        correctLetter: "A",
        hints: ["Find the x-intercepts.", "They are $-2$ and $2$.", "Evaluate $\\int_{-2}^{2}(4-x^2)dx$."],
        solution: [{ step: 1, explanation: "Evaluate the bounded area.", math: "\\int_{-2}^{2}(4-x^2)dx=\\left[4x-\\frac{x^3}{3}\\right]_{-2}^{2}=\\frac{32}{3}" }],
      },
      {
        questionLatex:
          "\\text{The area between }y=2x\\text{ and }y=x^2\\text{ from }x=0\\text{ to }x=2\\text{ is}",
        difficulty: 4,
        skillTags: ["area_integral", "area_between_curves"],
        choices: ["$\\frac43$", "$2$", "$\\frac23$", "$4$"],
        correctLetter: "A",
        hints: ["On $[0,2]$, $2x\\ge x^2$.", "Integrate $2x-x^2$.", "Evaluate from $0$ to $2$."],
        solution: [{ step: 1, explanation: "Compute top minus bottom.", math: "\\int_0^2(2x-x^2)dx=\\left[x^2-\\frac{x^3}{3}\\right]_0^2=\\frac43" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the area under }y=3x\\text{ from }x=0\\text{ to }x=2.",
        difficulty: 2,
        skillTags: ["area_integral"],
        parts: singlePart("a", "Find the area.", 2),
        hints: ["Set up $\\int_0^2 3x dx$.", "Find the antiderivative.", "Evaluate limits."],
        rubric: singleRubric("a", 2, "Finds area $6$."),
        commonErrors: ["Using rectangle area instead of triangular/integral area."],
        workedSolution: [{ part: "a", explanation: "$\\int_0^2 3x dx=\\left[\\frac{3x^2}{2}\\right]_0^2=6$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the area between }y=1\\text{ and }y=x\\text{ from }x=0\\text{ to }x=1.",
        difficulty: 2,
        skillTags: ["area_integral", "area_between_curves"],
        parts: singlePart("a", "Find the area.", 2),
        hints: ["On $[0,1]$, $1\\ge x$.", "Integrate $1-x$.", "Evaluate from $0$ to $1$."],
        rubric: singleRubric("a", 2, "Finds area $\\frac12$."),
        commonErrors: ["Reversing top and bottom functions."],
        workedSolution: [{ part: "a", explanation: "Area $=\\int_0^1(1-x)dx=\\left[x-\\frac{x^2}{2}\\right]_0^1=\\frac12$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Find the area bounded by }y=x^2,\\ x=0,\\ x=2,\\text{ and the }x\\text{-axis.}",
        difficulty: 3,
        skillTags: ["area_integral"],
        parts: singlePart("a", "Set up and evaluate the integral.", 3),
        hints: ["The curve is above the x-axis.", "Area is $\\int_0^2x^2dx$.", "Evaluate."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Sets up $\\int_0^2x^2dx$." },
            { part: "a", points: 1, description: "Uses correct antiderivative." },
            { part: "a", points: 1, description: "Finds area $\\frac83$." },
          ],
        },
        commonErrors: ["Using $2^2=4$ as the area."],
        workedSolution: [{ part: "a", explanation: "Area $=\\int_0^2x^2dx=\\left[\\frac{x^3}{3}\\right]_0^2=\\frac83$ square units." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Find the area enclosed between }y=x\\text{ and }y=x^2.",
        difficulty: 4,
        skillTags: ["area_integral", "area_between_curves"],
        parts: [
          { letter: "a", promptMarkdown: "Find the points of intersection.", points: 2 },
          { letter: "b", promptMarkdown: "Set up the area integral.", points: 1 },
          { letter: "c", promptMarkdown: "Evaluate the area.", points: 2 },
        ],
        hints: ["Solve $x=x^2$.", "On $0<x<1$, $x$ is above $x^2$.", "Integrate $x-x^2$ from $0$ to $1$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds intersection points $x=0$ and $x=1$." },
            { part: "b", points: 1, description: "Sets up $\\int_0^1(x-x^2)dx$." },
            { part: "c", points: 2, description: "Finds area $\\frac16$." },
          ],
        },
        commonErrors: ["Using $x^2-x$ and reporting a negative area."],
        workedSolution: [
          { part: "a", explanation: "$x=x^2$ gives $x(x-1)=0$, so $x=0,1$." },
          { part: "b", explanation: "On $[0,1]$, $y=x$ lies above $y=x^2$, so area $=\\int_0^1(x-x^2)dx$." },
          { part: "c", explanation: "$\\int_0^1(x-x^2)dx=\\left[\\frac{x^2}{2}-\\frac{x^3}{3}\\right]_0^1=\\frac16$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The shaded region shown lies between }y=x\\text{ and }y=x^2\\text{ from }x=0\\text{ to }x=1.",
        difficulty: 4,
        skillTags: ["area_integral", "area_between_curves", "case_based"],
        figure: areaBetweenCurvesFigure,
        parts: [
          { letter: "a", promptMarkdown: "Identify the upper curve on $[0,1]$.", points: 1 },
          { letter: "b", promptMarkdown: "Write the definite integral for the shaded area.", points: 1 },
          { letter: "c", promptMarkdown: "Evaluate the area.", points: 2 },
        ],
        hints: ["Compare $x$ and $x^2$ for $0<x<1$.", "Use top minus bottom.", "Evaluate $\\int_0^1(x-x^2)dx$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies $y=x$ as the upper curve." },
            { part: "b", points: 1, description: "Writes $\\int_0^1(x-x^2)dx$." },
            { part: "c", points: 2, description: "Finds area $\\frac16$." },
          ],
        },
        commonErrors: ["Subtracting lower curve from upper curve in the wrong order."],
        workedSolution: [
          { part: "a", explanation: "For $0<x<1$, $x>x^2$, so $y=x$ is above." },
          { part: "b", explanation: "The area is $\\int_0^1(x-x^2)dx$." },
          { part: "c", explanation: "The value is $\\left[\\frac{x^2}{2}-\\frac{x^3}{3}\\right]_0^1=\\frac16$." },
        ],
      },
    ],
  },
  {
    topicCode: "3.10",
    title: "Differential Equations",
    subtopic:
      "Order and degree, separation of variables, homogeneous equations, and first-order linear differential equations.",
    mc: [
      {
        questionLatex:
          "\\text{The order and degree of }\\left(\\frac{d^2y}{dx^2}\\right)^2+\\frac{dy}{dx}=0\\text{ are}",
        difficulty: 2,
        skillTags: ["differential_equations", "order_degree"],
        choices: ["$2,2$", "$2,1$", "$1,2$", "$1,1$"],
        correctLetter: "A",
        hints: ["Order is the highest derivative order.", "Degree is the power of the highest-order derivative after polynomial form.", "The highest derivative is squared."],
        solution: [{ step: 1, explanation: "Read order and degree.", math: "\\text{order}=2,\\quad \\text{degree}=2" }],
      },
      {
        questionLatex:
          "\\text{The general solution of }\\frac{dy}{dx}=3x^2\\text{ is}",
        difficulty: 2,
        skillTags: ["differential_equations", "separation"],
        choices: ["$y=x^3+C$", "$y=3x+C$", "$y=x^2+C$", "$y=\\frac{x^3}{3}+C$"],
        correctLetter: "A",
        hints: ["Integrate both sides with respect to $x$.", "Integral of $3x^2$ is $x^3$.", "Add the arbitrary constant."],
        solution: [{ step: 1, explanation: "Integrate.", math: "y=\\int3x^2dx=x^3+C" }],
      },
      {
        questionLatex:
          "\\text{The general solution of }\\frac{dy}{dx}=xy\\text{ is}",
        difficulty: 3,
        skillTags: ["differential_equations", "separation"],
        choices: ["$y=Ce^{x^2/2}$", "$y=Cx^2$", "$y=e^{x}+C$", "$y=\\frac{x^2}{2}+C$"],
        correctLetter: "A",
        hints: ["Separate variables.", "$\\frac{dy}{y}=x\\,dx$.", "Exponentiate after integrating."],
        solution: [{ step: 1, explanation: "Separate and integrate.", math: "\\ln|y|=\\frac{x^2}{2}+C\\Rightarrow y=Ce^{x^2/2}" }],
      },
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}+y=e^x,\\text{ the integrating factor is}",
        difficulty: 3,
        skillTags: ["differential_equations", "linear_de"],
        choices: ["$e^x$", "$e^{-x}$", "$x$", "$e^{e^x}$"],
        correctLetter: "A",
        hints: ["Compare with $\\frac{dy}{dx}+P(x)y=Q(x)$.", "Here $P(x)=1$.", "Integrating factor is $e^{\\int Pdx}$."],
        solution: [{ step: 1, explanation: "Use the linear differential equation formula.", math: "I.F.=e^{\\int1dx}=e^x" }],
      },
      {
        questionLatex:
          "\\text{The equation }\\frac{dy}{dx}=\\frac{x+y}{x}\\text{ is solved by the substitution}",
        difficulty: 4,
        skillTags: ["differential_equations", "homogeneous_de"],
        choices: ["$y=vx$", "$x=vy$", "$v=x+y$", "$y=v+x$"],
        correctLetter: "A",
        hints: ["The right side depends on $y/x$.", "This is a homogeneous first-order equation.", "Use $y=vx$."],
        solution: [{ step: 1, explanation: "Use the standard homogeneous substitution.", math: "y=vx" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the order and degree of }\\frac{d^3y}{dx^3}+\\left(\\frac{dy}{dx}\\right)^2=0.",
        difficulty: 2,
        skillTags: ["differential_equations", "order_degree"],
        parts: singlePart("a", "State order and degree.", 2),
        hints: ["Find the highest derivative.", "Check its power.", "The third derivative appears to the first power."],
        rubric: singleRubric("a", 2, "Finds order $3$ and degree $1$."),
        commonErrors: ["Taking degree as $2$ because the first derivative is squared."],
        workedSolution: [{ part: "a", explanation: "The highest derivative is $\\frac{d^3y}{dx^3}$, so the order is $3$. It appears to power $1$, so the degree is $1$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Solve }\\frac{dy}{dx}=2x.",
        difficulty: 2,
        skillTags: ["differential_equations", "separation"],
        parts: singlePart("a", "Find the general solution.", 2),
        hints: ["Integrate both sides.", "Integral of $2x$ is $x^2$.", "Add $C$."],
        rubric: singleRubric("a", 2, "Finds $y=x^2+C$."),
        commonErrors: ["Forgetting arbitrary constant."],
        workedSolution: [{ part: "a", explanation: "$dy=2x\\,dx$, so $y=x^2+C$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Solve }\\frac{dy}{dx}=2xy.",
        difficulty: 3,
        skillTags: ["differential_equations", "separation"],
        parts: singlePart("a", "Find the general solution.", 3),
        hints: ["Separate variables.", "Integrate $dy/y=2x dx$.", "Exponentiate."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Separates variables correctly." },
            { part: "a", points: 1, description: "Integrates both sides correctly." },
            { part: "a", points: 1, description: "Writes $y=Ce^{x^2}$." },
          ],
        },
        commonErrors: ["Integrating $2xy$ with respect to $x$ while treating $y$ as constant."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{y}=2x\\,dx$. Integrating, $\\ln|y|=x^2+C$, so $y=Ce^{x^2}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Solve }\\frac{dy}{dx}+y=e^x.",
        difficulty: 4,
        skillTags: ["differential_equations", "linear_de"],
        parts: [
          { letter: "a", promptMarkdown: "Find the integrating factor.", points: 1 },
          { letter: "b", promptMarkdown: "Multiply the equation by the integrating factor.", points: 2 },
          { letter: "c", promptMarkdown: "Find the general solution.", points: 2 },
        ],
        hints: ["Here $P(x)=1$.", "I.F. is $e^x$.", "Then $\\frac{d}{dx}(ye^x)=e^{2x}$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds integrating factor $e^x$." },
            { part: "b", points: 2, description: "Writes $\\frac{d}{dx}(ye^x)=e^{2x}$." },
            { part: "c", points: 2, description: "Finds $y=\\frac12e^x+Ce^{-x}$." },
          ],
        },
        commonErrors: ["Using $e^{-x}$ as the integrating factor for this equation."],
        workedSolution: [
          { part: "a", explanation: "The integrating factor is $e^{\\int1dx}=e^x$." },
          { part: "b", explanation: "Multiplying by $e^x$, $e^x\\frac{dy}{dx}+e^xy=e^{2x}$, so $\\frac{d}{dx}(ye^x)=e^{2x}$." },
          { part: "c", explanation: "$ye^x=\\frac12e^{2x}+C$, hence $y=\\frac12e^x+Ce^{-x}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The rate of growth of a culture is proportional to its current size. Let }N(t)\\text{ be the size at time }t,\\text{ so }\\frac{dN}{dt}=kN\\text{ and }N(0)=N_0.",
        difficulty: 4,
        skillTags: ["differential_equations", "separation", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Separate the variables.", points: 1 },
          { letter: "b", promptMarkdown: "Find the general solution in terms of $N_0$.", points: 2 },
          { letter: "c", promptMarkdown: "If $k>0$, state whether the culture is growing or decaying.", points: 1 },
        ],
        hints: ["Move $N$ to the left side.", "Integrate $dN/N=kdt$.", "Use $N(0)=N_0$ to find the constant."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\frac{dN}{N}=kdt$." },
            { part: "b", points: 2, description: "Finds $N=N_0e^{kt}$." },
            { part: "c", points: 1, description: "States growth for $k>0$." },
          ],
        },
        commonErrors: ["Writing a linear solution $N=N_0+kt$ instead of exponential growth."],
        workedSolution: [
          { part: "a", explanation: "$\\frac{dN}{N}=k\\,dt$." },
          { part: "b", explanation: "Integrating gives $\\ln|N|=kt+C$, so $N=Ce^{kt}$. Since $N(0)=N_0$, $C=N_0$, and $N=N_0e^{kt}$." },
          { part: "c", explanation: "If $k>0$, $e^{kt}$ increases with $t$, so the culture is growing." },
        ],
      },
    ],
  },
];

export const calculusTopics: Topic[] = topicSeeds.map(makeTopic);
