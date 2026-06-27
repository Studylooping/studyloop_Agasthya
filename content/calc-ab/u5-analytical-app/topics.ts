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
const UNIT = "u5-analytical-app";
const VERSION = "0.1.3";
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

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("domain_restriction")) {
    return "You likely chose the wrong side of the critical value or forgot to restrict the answer to the stated domain.";
  }
  if (tags.has("derivative_graph") || tags.has("graph_interpretation")) {
    return "You likely read the graph as the original function instead of using the derivative sign or slope information asked for.";
  }
  if (tags.has("increasing_decreasing") || tags.has("derivative_sign")) {
    return "You likely used the wrong sign of the derivative on the interval.";
  }
  if (tags.has("first_derivative_test") || tags.has("local_extrema")) {
    return "You likely reversed the derivative sign change or classified the critical point without checking both sides.";
  }
  if (tags.has("candidates_test") || tags.has("absolute_extrema")) {
    return "You likely stopped at a critical point without comparing all candidate values, including endpoints.";
  }
  if (
    tags.has("concavity") ||
    tags.has("second_derivative_sign") ||
    tags.has("inflection_points")
  ) {
    return "You likely used $f'$ when the question needs $f''$, or missed whether $f''$ changes sign.";
  }
  if (tags.has("second_derivative_test")) {
    return "You likely reversed what the sign of $f''$ says at a critical point, or used the test when it is inconclusive.";
  }
  if (tags.has("mean_value_theorem") || tags.has("rolles_theorem")) {
    return "You likely confused the theorem's guaranteed derivative value with an endpoint, an average rate, or the point $c$.";
  }
  if (Array.from(tags).some((tag) => tag.startsWith("optimization"))) {
    return "You likely set up the constraint or objective function incorrectly, or optimized before checking the feasible domain.";
  }
  if (tags.has("implicit_derivative")) {
    return "You likely mixed up the numerator and denominator in $dy/dx$, or swapped the horizontal and vertical tangent conditions.";
  }

  return "Your choice misses the decisive calculus step for this question.";
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
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_analytical_reasoning",
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
      "uses_derivative_rule_without_interpreting_behavior",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFrqDifficulty(seed.difficulty),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_calculus_justification",
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

const mvtSecantFigure: ItemFigure = {
  type: "svg",
  title: "Secant and parallel tangent sketch",
  description:
    "A smooth curve on a closed interval with a secant line and a tangent line of matching slope.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Smooth curve with secant and tangent lines">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <line x1="70" y1="285" x2="590" y2="285" stroke="#64748b" stroke-width="3"/>
  <line x1="95" y1="310" x2="95" y2="45" stroke="#64748b" stroke-width="3"/>
  <path d="M 95 285 L 88 272 M 95 285 L 102 272 M 590 285 L 577 278 M 590 285 L 577 292 M 95 45 L 88 58 M 95 45 L 102 58" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="600" y="292" fill="#475569" font-size="20">x</text>
  <text x="84" y="36" fill="#475569" font-size="20">y</text>
  <path d="M 125 245 C 210 185 250 135 320 138 C 395 141 465 193 540 92" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <line x1="125" y1="245" x2="540" y2="92" stroke="#9333ea" stroke-width="3" stroke-dasharray="10 8"/>
  <line x1="246" y1="189" x2="390" y2="136" stroke="#dc2626" stroke-width="4"/>
  <circle cx="125" cy="245" r="7" fill="#2563eb"/>
  <circle cx="540" cy="92" r="7" fill="#2563eb"/>
  <text x="116" y="308" fill="#334155" font-size="18">a</text>
  <text x="532" y="308" fill="#334155" font-size="18">b</text>
  <text x="304" y="165" fill="#dc2626" font-size="18">c</text>
</svg>`,
};

const derivativeSignGraphFigure: ItemFigure = {
  type: "svg",
  title: "Graph of first derivative",
  description:
    "The graph of f prime crosses the x-axis at x=-2 and x=1.",
  svg: `<svg viewBox="0 0 640 340" role="img" aria-label="Graph of f prime with zeros at -2 and 1">
  <rect width="640" height="340" rx="18" fill="#f8fafc"/>
  <line x1="70" y1="180" x2="590" y2="180" stroke="#64748b" stroke-width="3"/>
  <line x1="320" y1="292" x2="320" y2="45" stroke="#64748b" stroke-width="3"/>
  <path d="M 590 180 L 577 173 M 590 180 L 577 187 M 320 45 L 313 58 M 320 45 L 327 58" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="600" y="187" fill="#475569" font-size="20">x</text>
  <text x="330" y="54" fill="#475569" font-size="20">f'</text>
  <path d="M 95 70 C 145 130 170 170 200 180 C 255 200 318 250 380 180 C 430 125 490 82 555 62" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="200" cy="180" r="7" fill="#2563eb"/>
  <circle cx="380" cy="180" r="7" fill="#2563eb"/>
  <text x="184" y="207" fill="#334155" font-size="18">-2</text>
  <text x="374" y="207" fill="#334155" font-size="18">1</text>
</svg>`,
};

const firstDerivativeShapeFigure: ItemFigure = {
  type: "svg",
  title: "First derivative shape sketch",
  description:
    "A first derivative graph with a local maximum near x=0 and zeros at x=-2 and x=3.",
  svg: `<svg viewBox="0 0 640 340" role="img" aria-label="First derivative curve with a peak and two zeros">
  <rect width="640" height="340" rx="18" fill="#f8fafc"/>
  <line x1="70" y1="195" x2="590" y2="195" stroke="#64748b" stroke-width="3"/>
  <line x1="310" y1="290" x2="310" y2="45" stroke="#64748b" stroke-width="3"/>
  <path d="M 590 195 L 577 188 M 590 195 L 577 202 M 310 45 L 303 58 M 310 45 L 317 58" stroke="#64748b" stroke-width="3" fill="none"/>
  <text x="600" y="202" fill="#475569" font-size="20">x</text>
  <text x="320" y="54" fill="#475569" font-size="20">f'</text>
  <path d="M 95 270 C 145 240 185 200 210 195 C 260 185 285 98 310 92 C 365 82 412 185 460 195 C 505 205 535 230 560 260" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="210" cy="195" r="7" fill="#2563eb"/>
  <circle cx="460" cy="195" r="7" fill="#2563eb"/>
  <text x="194" y="222" fill="#334155" font-size="18">-2</text>
  <text x="453" y="222" fill="#334155" font-size="18">3</text>
</svg>`,
};

const functionDerivativeSecondDerivativeFigure: ItemFigure = {
  type: "svg",
  title: "Function, first derivative, and second derivative sketches",
  description:
    "Three aligned sketches show f, f prime, and f double prime on the same x-interval.",
  svg: `<svg viewBox="0 0 720 520" role="img" aria-label="Aligned sketches of f, f prime, and f double prime">
  <rect width="720" height="520" rx="18" fill="#f8fafc"/>
  <line x1="90" y1="145" x2="660" y2="145" stroke="#94a3b8" stroke-width="2"/>
  <line x1="90" y1="300" x2="660" y2="300" stroke="#94a3b8" stroke-width="2"/>
  <line x1="90" y1="430" x2="660" y2="430" stroke="#94a3b8" stroke-width="2"/>
  <line x1="90" y1="40" x2="90" y2="470" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="375" y1="40" x2="375" y2="470" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 7"/>
  <line x1="447" y1="40" x2="447" y2="470" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 7"/>
  <line x1="660" y1="40" x2="660" y2="470" stroke="#cbd5e1" stroke-width="2"/>
  <text x="78" y="495" fill="#334155" font-size="18">-3</text>
  <text x="370" y="495" fill="#334155" font-size="18">1</text>
  <text x="442" y="495" fill="#334155" font-size="18">2</text>
  <text x="655" y="495" fill="#334155" font-size="18">5</text>
  <text x="42" y="92" fill="#1d4ed8" font-size="22">f</text>
  <text x="35" y="245" fill="#7c3aed" font-size="22">f'</text>
  <text x="30" y="395" fill="#dc2626" font-size="22">f''</text>
  <path d="M 105 128 C 205 78 310 55 375 62 C 430 70 470 112 520 160 C 575 210 625 224 650 218" stroke="#2563eb" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="375" cy="62" r="6" fill="#2563eb"/>
  <path d="M 105 248 C 200 245 320 280 375 300 C 410 320 432 340 447 344 C 510 348 595 330 650 322" stroke="#7c3aed" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="375" cy="300" r="6" fill="#7c3aed"/>
  <path d="M 115 468 L 447 468" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
  <path d="M 447 392 L 650 392" stroke="#16a34a" stroke-width="5" stroke-linecap="round"/>
  <text x="250" y="461" fill="#dc2626" font-size="24">-</text>
  <text x="545" y="385" fill="#16a34a" font-size="24">+</text>
  <line x1="447" y1="468" x2="447" y2="392" stroke="#64748b" stroke-width="3" stroke-dasharray="5 6"/>
</svg>`,
};

const concavityChartFigure: ItemFigure = {
  type: "svg",
  title: "Second derivative sign chart",
  description:
    "A sign chart for f double prime with sign changes at x=-2 and x=1.",
  svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Sign chart for f double prime">
  <rect width="640" height="240" rx="18" fill="#f8fafc"/>
  <line x1="90" y1="120" x2="550" y2="120" stroke="#64748b" stroke-width="3"/>
  <path d="M 550 120 L 537 113 M 550 120 L 537 127" stroke="#64748b" stroke-width="3" fill="none"/>
  <line x1="230" y1="85" x2="230" y2="155" stroke="#94a3b8" stroke-width="3"/>
  <line x1="410" y1="85" x2="410" y2="155" stroke="#94a3b8" stroke-width="3"/>
  <text x="218" y="180" fill="#334155" font-size="20">-2</text>
  <text x="404" y="180" fill="#334155" font-size="20">1</text>
  <text x="143" y="112" fill="#16a34a" font-size="30">+</text>
  <text x="313" y="112" fill="#dc2626" font-size="34">-</text>
  <text x="490" y="112" fill="#16a34a" font-size="30">+</text>
  <text x="260" y="55" fill="#334155" font-size="20">sign of f''</text>
</svg>`,
};

const rectangleOptimizationFigure: ItemFigure = {
  type: "svg",
  title: "Rectangle optimization sketch",
  description:
    "A rectangle with width x and length 20 minus x for a fixed perimeter of 40.",
  svg: `<svg viewBox="0 0 560 300" role="img" aria-label="Rectangle with sides x and 20 minus x">
  <rect width="560" height="300" rx="18" fill="#f8fafc"/>
  <rect x="130" y="70" width="300" height="150" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <text x="265" y="58" fill="#1e3a8a" font-size="22">20 - x</text>
  <text x="442" y="150" fill="#1e3a8a" font-size="22">x</text>
  <line x1="130" y1="235" x2="430" y2="235" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="445" y1="70" x2="445" y2="220" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
</svg>`,
};

const openBoxFigure: ItemFigure = {
  type: "svg",
  title: "Open box cutout sketch",
  description:
    "A rectangular sheet with congruent x by x squares cut from each corner.",
  svg: `<svg viewBox="0 0 640 360" role="img" aria-label="Open box net with corner squares of side x">
  <rect width="640" height="360" rx="18" fill="#f8fafc"/>
  <rect x="125" y="70" width="390" height="220" fill="#e0f2fe" stroke="#0284c7" stroke-width="4"/>
  <rect x="125" y="70" width="55" height="55" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <rect x="460" y="70" width="55" height="55" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <rect x="125" y="235" width="55" height="55" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <rect x="460" y="235" width="55" height="55" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <line x1="180" y1="70" x2="180" y2="290" stroke="#0284c7" stroke-width="2" stroke-dasharray="7 7"/>
  <line x1="460" y1="70" x2="460" y2="290" stroke="#0284c7" stroke-width="2" stroke-dasharray="7 7"/>
  <line x1="125" y1="125" x2="515" y2="125" stroke="#0284c7" stroke-width="2" stroke-dasharray="7 7"/>
  <line x1="125" y1="235" x2="515" y2="235" stroke="#0284c7" stroke-width="2" stroke-dasharray="7 7"/>
  <text x="145" y="105" fill="#991b1b" font-size="22">x</text>
  <text x="282" y="48" fill="#075985" font-size="22">length</text>
  <text x="530" y="185" fill="#075985" font-size="22">width</text>
</svg>`,
};

const riverFenceFigure: ItemFigure = {
  type: "svg",
  title: "River fence optimization sketch",
  description:
    "A rectangular pen uses fencing on three sides and a river as the fourth side.",
  svg: `<svg viewBox="0 0 620 320" role="img" aria-label="Three-sided rectangular fence along a river">
  <rect width="620" height="320" rx="18" fill="#f8fafc"/>
  <path d="M 75 70 C 150 45 220 92 295 66 C 390 32 470 82 545 55" stroke="#0ea5e9" stroke-width="10" fill="none" stroke-linecap="round"/>
  <text x="276" y="42" fill="#0369a1" font-size="22">river</text>
  <path d="M 150 88 L 150 245 L 480 245 L 480 88" stroke="#2563eb" stroke-width="5" fill="none"/>
  <text x="304" y="274" fill="#1e3a8a" font-size="22">y</text>
  <text x="122" y="170" fill="#1e3a8a" font-size="22">x</text>
  <text x="493" y="170" fill="#1e3a8a" font-size="22">x</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Using the Mean Value Theorem",
    subtopic:
      "Verifying hypotheses and interpreting guaranteed derivative values",
    mc: [
      {
        questionLatex:
          "\\text{For }f(x)=x^2+3x\\text{ on }[1,4],\\text{ which value of }c\\text{ is guaranteed by the Mean Value Theorem?}",
        difficulty: 3,
        skillTags: ["mean_value_theorem", "average_rate"],
        choices: ["$\\frac52$", "$\\frac{19}{6}$", "$3$", "$8$"],
        correctLetter: "A",
        rationales: {
          B: "This comes from using an incorrect average rate.",
          C: "This is a plausible point but does not make $f'(c)$ equal to the average rate.",
          D: "This is the average rate, not the value of $c$.",
        },
        hints: [
          "First compute the secant slope on $[1,4]$.",
          "The MVT sets $f'(c)$ equal to that average rate.",
          "$f'(x)=2x+3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the average rate of change.",
            math: "\\frac{f(4)-f(1)}{4-1}=\\frac{28-4}{3}=8",
          },
          {
            step: 2,
            explanation: "Solve $f'(c)=8$.",
            math: "2c+3=8\\Rightarrow c=\\frac52",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }g(x)=|x-2|\\text{ on }[0,4].\\text{ Although }g(0)=g(4),\\text{ why does Rolle's Theorem not apply?}",
        difficulty: 2,
        skillTags: ["rolles_theorem", "hypotheses"],
        choices: [
          "$g$ is not differentiable at $x=2$.",
          "$g$ is not continuous at $x=2$.",
          "$g(0)\\ne g(4)$.",
          "The interval $[0,4]$ is not closed.",
        ],
        correctLetter: "A",
        rationales: {
          B: "$|x-2|$ is continuous at $x=2$.",
          C: "Both endpoint values are $2$.",
          D: "$[0,4]$ is a closed interval.",
        },
        hints: [
          "Rolle's Theorem needs continuity on the closed interval and differentiability inside it.",
          "Absolute value graphs have a corner at the vertex.",
          "A corner means the derivative does not exist there.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Check the interior point where the graph has a corner.",
            math: "x=2",
          },
          {
            step: 2,
            explanation: "The derivative fails at the corner, so the differentiability hypothesis fails.",
            math: "g'(2)\\text{ does not exist}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A differentiable function satisfies }f(1)=3\\text{ and }f(5)=11.\\text{ What derivative value is guaranteed somewhere in }(1,5)?",
        difficulty: 2,
        skillTags: ["mean_value_theorem", "table_to_derivative"],
        choices: ["$2$", "$4$", "$8$", "$\\frac{11}{5}$"],
        correctLetter: "A",
        hints: [
          "Use the slope of the secant line through the endpoints.",
          "The MVT guarantees a matching instantaneous rate.",
          "Compute $(11-3)/(5-1)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the average rate of change.",
            math: "\\frac{11-3}{5-1}=2",
          },
          {
            step: 2,
            explanation: "The MVT guarantees some $c$ with this derivative value.",
            math: "f'(c)=2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of a differentiable function is shown. The secant line from }a\\text{ to }b\\text{ has slope }2.\\text{ What must be true?}",
        difficulty: 3,
        skillTags: ["mean_value_theorem", "graph_interpretation"],
        figure: mvtSecantFigure,
        choices: [
          "There is some $c\\in(a,b)$ such that $f'(c)=2$.",
          "Every $c\\in(a,b)$ satisfies $f'(c)=2$.",
          "$f'(a)=f'(b)=2$.",
          "The function must be linear on $[a,b]$.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The theorem guarantees at least one point, not every point.",
          C: "The endpoint derivatives are not the conclusion of the MVT.",
          D: "A nonlinear curve can still have one tangent parallel to the secant.",
        },
        hints: [
          "The relevant visual feature is a tangent parallel to the secant line.",
          "Parallel lines have equal slopes.",
          "The MVT is an existence theorem.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The curve is continuous and differentiable on the needed interval.",
            math: "\\text{MVT hypotheses hold}",
          },
          {
            step: 2,
            explanation: "The theorem guarantees a point where instantaneous slope equals average slope.",
            math: "f'(c)=2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }h(x)=x^3-x\\text{ on }[-1,1],\\text{ which values of }c\\text{ satisfy the conclusion of Rolle's Theorem?}",
        difficulty: 4,
        skillTags: ["rolles_theorem", "critical_points"],
        choices: [
          "$c=\\pm\\frac{1}{\\sqrt{3}}$",
          "$c=0$ only",
          "$c=\\pm1$",
          "No such $c$ exists",
        ],
        correctLetter: "A",
        rationales: {
          B: "$h'(0)=-1$, so $c=0$ does not satisfy $h'(c)=0$.",
          C: "The values $\\pm1$ are endpoints and are not in the open interval.",
          D: "The function is polynomial and has equal endpoint values, so Rolle's Theorem applies.",
        },
        hints: [
          "First verify $h(-1)=h(1)$.",
          "Rolle's conclusion is $h'(c)=0$.",
          "$h'(x)=3x^2-1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The endpoint values are equal.",
            math: "h(-1)=0\\text{ and }h(1)=0",
          },
          {
            step: 2,
            explanation: "Solve $h'(c)=0$ inside the interval.",
            math: "3c^2-1=0\\Rightarrow c=\\pm\\frac{1}{\\sqrt{3}}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=x^3-3x\\text{ on }[0,2].\\text{ Use the Mean Value Theorem to analyze }f\\text{ on this interval.}",
      difficulty: 4,
      skillTags: ["mean_value_theorem", "theorem_justification", "solve_for_c"],
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Verify that the Mean Value Theorem applies to $f$ on $[0,2]$.",
          points: 1,
        },
        {
          letter: "b",
          promptMarkdown:
            "Find the average rate of change of $f$ on $[0,2]$.",
          points: 1,
        },
        {
          letter: "c",
          promptMarkdown:
            "Find all values of $c$ in $(0,2)$ whose existence is guaranteed by the theorem.",
          points: 2,
        },
      ],
      hints: [
        "Polynomials are continuous and differentiable everywhere.",
        "The average rate is the slope through the endpoints.",
        "Set $f'(c)$ equal to the average rate.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "States continuity and differentiability correctly." },
          { part: "b", points: 1, description: "Computes the average rate of change as 1." },
          { part: "c", points: 1, description: "Sets $3c^2-3=1$." },
          { part: "c", points: 1, description: "Finds $c=2/\\sqrt3$ and rejects the negative value." },
        ],
      },
      commonErrors: [
        "Solving $f'(c)=0$ instead of matching the average rate.",
        "Forgetting that $c$ must lie in the open interval.",
        "Omitting the theorem hypotheses.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f$ is a polynomial, so it is continuous on $[0,2]$ and differentiable on $(0,2)$. The MVT applies.",
        },
        {
          part: "b",
          explanation:
            "$f(0)=0$ and $f(2)=8-6=2$, so the average rate is $\\frac{2-0}{2-0}=1$.",
        },
        {
          part: "c",
          explanation:
            "$f'(x)=3x^2-3$. Set $3c^2-3=1$, giving $c^2=4/3$. The value in $(0,2)$ is $c=2/\\sqrt3$.",
        },
      ],
    },
  },
  {
    topicCode: "5.2",
    title: "Extreme Value Theorem, Global Versus Local Extrema, and Critical Points",
    subtopic:
      "Identifying candidate points and distinguishing guaranteed absolute extrema from local behavior",
    mc: [
      {
        questionLatex:
          "\\text{For }f(x)=x^3-3x^2+2\\text{ on }[-1,4],\\text{ which set contains all candidates for absolute extrema?}",
        difficulty: 3,
        skillTags: ["critical_points", "absolute_extrema_candidates"],
        choices: [
          "$\\{-1,0,2,4\\}$",
          "$\\{0,2\\}$",
          "$\\{-1,4\\}$",
          "$\\{-1,2,4\\}$",
        ],
        correctLetter: "A",
        hints: [
          "For a closed interval, include endpoints.",
          "Interior critical points occur where $f'(x)=0$ or undefined.",
          "$f'(x)=3x(x-2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find interior critical points.",
            math: "3x(x-2)=0\\Rightarrow x=0,2",
          },
          {
            step: 2,
            explanation: "Add the endpoints of the interval.",
            math: "\\{-1,0,2,4\\}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which statement explains why }f(x)=\\frac1x\\text{ on }(0,1]\\text{ is not guaranteed to have an absolute maximum by the EVT?}",
        difficulty: 2,
        skillTags: ["extreme_value_theorem", "hypotheses"],
        choices: [
          "The domain is not a closed interval.",
          "$f$ is not differentiable at $x=1$.",
          "$f(1)$ is undefined.",
          "$f$ has a critical point in the interval.",
        ],
        correctLetter: "A",
        rationales: {
          B: "$f$ is differentiable at $x=1$ from the left as an endpoint issue, but differentiability is not the EVT requirement.",
          C: "$f(1)=1$ is defined.",
          D: "A critical point would not prevent the EVT from applying.",
        },
        hints: [
          "The EVT needs continuity on a closed interval.",
          "The interval $(0,1]$ does not include its left endpoint.",
          "As $x\\to0^+$, $1/x$ grows without bound.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Check the interval condition in the EVT.",
            math: "(0,1]\\text{ is not closed}",
          },
          {
            step: 2,
            explanation: "So an absolute maximum is not guaranteed.",
            math: "\\lim_{x\\to0^+}\\frac1x=\\infty",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }g(x)=|x-3|+2,\\text{ which value is a critical point?}",
        difficulty: 2,
        skillTags: ["critical_points", "nondifferentiability"],
        choices: ["$x=3$", "$x=2$", "$x=0$", "There are no critical points."],
        correctLetter: "A",
        rationales: {
          B: "$x=2$ is not where the corner occurs.",
          C: "$x=0$ is in the domain but has a defined nonzero derivative.",
          D: "A point where the derivative does not exist can be critical if it is in the domain.",
        },
        hints: [
          "Critical points can occur where $g'(x)=0$ or where $g'$ does not exist.",
          "Absolute value graphs have corners.",
          "The corner of $|x-3|$ occurs at $x=3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Locate the nondifferentiable point.",
            math: "x=3",
          },
          {
            step: 2,
            explanation: "Since $g(3)$ exists but $g'(3)$ does not, $x=3$ is critical.",
            math: "g'(3)\\text{ does not exist}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Suppose }f'(x)=(x-2)(x+1)^2.\\text{ Which statement about the critical points is true?}",
        difficulty: 3,
        skillTags: ["critical_points", "local_extrema"],
        choices: [
          "$x=2$ is a local minimum, and $x=-1$ is not a local extremum.",
          "$x=-1$ is a local maximum, and $x=2$ is a local minimum.",
          "Both $x=-1$ and $x=2$ are local minima.",
          "Neither critical point can be classified from $f'$.",
        ],
        correctLetter: "A",
        hints: [
          "The factor $(x+1)^2$ does not change sign at $x=-1$.",
          "The factor $(x-2)$ changes from negative to positive at $x=2$.",
          "Use the sign of $f'$ around each critical point.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$f'$ has zeros at $x=-1$ and $x=2$.",
            math: "f'(x)=(x-2)(x+1)^2",
          },
          {
            step: 2,
            explanation: "The sign changes only at $x=2$, from negative to positive.",
            math: "x=2\\text{ is a local minimum}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }p(x)=x^4-8x^2\\text{ on }[-3,2],\\text{ where does }p\\text{ attain its absolute maximum?}",
        difficulty: 4,
        skillTags: ["absolute_extrema", "candidates_test"],
        choices: ["$x=-3$", "$x=-2$", "$x=0$", "$x=2$"],
        correctLetter: "A",
        hints: [
          "Find all candidates, including endpoints.",
          "$p'(x)=4x(x^2-4)$.",
          "Compare the actual function values.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Candidates in the interval are endpoints and critical points.",
            math: "x=-3,-2,0,2",
          },
          {
            step: 2,
            explanation: "Evaluate $p$ at each candidate.",
            math: "p(-3)=9,\\ p(-2)=-16,\\ p(0)=0,\\ p(2)=-16",
          },
          {
            step: 3,
            explanation: "The largest value is $9$ at $x=-3$.",
            math: "\\text{absolute maximum at }x=-3",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=x^3-3x^2+1\\text{ on }[-1,3].\\text{ Find and classify the absolute extrema of }f.",
      difficulty: 4,
      skillTags: ["extreme_value_theorem", "candidates_test", "absolute_extrema"],
      parts: [
        { letter: "a", promptMarkdown: "Explain why $f$ must have an absolute maximum and an absolute minimum on $[-1,3]$.", points: 1 },
        { letter: "b", promptMarkdown: "Find all candidate $x$-values for absolute extrema.", points: 2 },
        { letter: "c", promptMarkdown: "Determine the absolute maximum value and absolute minimum value.", points: 2 },
      ],
      hints: [
        "Use the EVT first, then the Candidates Test.",
        "Interior candidates come from $f'(x)=0$.",
        "Compare $f(-1)$, $f(0)$, $f(2)$, and $f(3)$.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Cites continuity on a closed interval." },
          { part: "b", points: 1, description: "Computes $f'(x)=3x(x-2)$." },
          { part: "b", points: 1, description: "Lists candidates $-1,0,2,3$." },
          { part: "c", points: 1, description: "Correctly evaluates candidate function values." },
          { part: "c", points: 1, description: "Identifies absolute maximum and minimum values with locations." },
        ],
      },
      commonErrors: [
        "Ignoring endpoints.",
        "Classifying local extrema only and never comparing values.",
        "Using $f'$ values instead of $f$ values for the final comparison.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f$ is a polynomial, so it is continuous on the closed interval $[-1,3]$. By the EVT, absolute extrema exist.",
        },
        {
          part: "b",
          explanation:
            "$f'(x)=3x^2-6x=3x(x-2)$, so the interior critical points are $x=0$ and $x=2$. Include endpoints: $x=-1,0,2,3$.",
        },
        {
          part: "c",
          explanation:
            "$f(-1)=-3$, $f(0)=1$, $f(2)=-3$, and $f(3)=1$. The absolute maximum value is $1$ at $x=0$ and $x=3$; the absolute minimum value is $-3$ at $x=-1$ and $x=2$.",
        },
      ],
    },
  },
  {
    topicCode: "5.3",
    title: "Determining Intervals on Which a Function Is Increasing or Decreasing",
    subtopic:
      "Using the sign of the first derivative to describe monotonic behavior",
    mc: [
      {
        questionLatex:
          "\\text{If }f'(x)=(x-1)(x+2),\\text{ on which intervals is }f\\text{ increasing?}",
        difficulty: 3,
        skillTags: ["increasing_decreasing", "derivative_sign"],
        choices: [
          "$(-\\infty,-2)\\cup(1,\\infty)$",
          "$(-2,1)$",
          "$(-\\infty,1)$",
          "$(-2,\\infty)$",
        ],
        correctLetter: "A",
        hints: [
          "A function increases where $f'(x)>0$.",
          "The sign can change at $x=-2$ and $x=1$.",
          "Test one point in each interval.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Make a sign chart for $f'$ using zeros $-2$ and $1$.",
            math: "f'(x)>0\\text{ on }(-\\infty,-2)\\text{ and }(1,\\infty)",
          },
          {
            step: 2,
            explanation: "Those are the intervals where $f$ is increasing.",
            math: "(-\\infty,-2)\\cup(1,\\infty)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The sign of }g'\\text{ is positive on }(-\\infty,0)\\text{ and negative on }(0,3)\\cup(3,\\infty).\\text{ Which statement is true?}",
        difficulty: 2,
        skillTags: ["increasing_decreasing", "sign_chart"],
        choices: [
          "$g$ is decreasing on $(0,3)$ and $(3,\\infty)$.",
          "$g$ is increasing on $(0,\\infty)$.",
          "$g$ has a local minimum at $x=0$.",
          "$g$ is constant on $(0,3)$.",
        ],
        correctLetter: "A",
        hints: [
          "Positive $g'$ means increasing; negative $g'$ means decreasing.",
          "Read the intervals directly from the sign information.",
          "A sign change from positive to negative would be a local maximum, not a minimum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the derivative sign to describe behavior.",
            math: "g'(x)<0\\text{ on }(0,3)\\cup(3,\\infty)",
          },
          {
            step: 2,
            explanation: "Therefore $g$ decreases on those intervals.",
            math: "(0,3)\\text{ and }(3,\\infty)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f'\\text{ is shown. On which interval is }f\\text{ decreasing?}",
        difficulty: 3,
        skillTags: ["derivative_graph", "decreasing_intervals"],
        figure: derivativeSignGraphFigure,
        choices: ["$(-2,1)$", "$(-\\infty,-2)$", "$(1,\\infty)$", "$(-\\infty,1)$"],
        correctLetter: "A",
        hints: [
          "A function decreases where its derivative is below the x-axis.",
          "Look for where the graph of $f'$ is negative.",
          "The shown graph of $f'$ is below the axis between its two zeros.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Read where $f'$ is below the x-axis.",
            math: "f'(x)<0\\text{ for }-2<x<1",
          },
          {
            step: 2,
            explanation: "That interval is where $f$ is decreasing.",
            math: "(-2,1)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }h(x)=\\ln x-\\frac{x}{2}\\text{ with }x>0,\\text{ on which interval is }h\\text{ increasing?}",
        difficulty: 3,
        skillTags: ["increasing_decreasing", "domain_restriction"],
        choices: ["$(0,2)$", "$(2,\\infty)$", "$(-\\infty,2)$", "$(0,\\infty)$"],
        correctLetter: "A",
        hints: [
          "Differentiate first.",
          "$h'(x)=1/x-1/2$.",
          "Remember the domain is $x>0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the derivative.",
            math: "h'(x)=\\frac1x-\\frac12",
          },
          {
            step: 2,
            explanation: "Solve $h'(x)>0$ on the domain.",
            math: "\\frac1x>\\frac12\\Rightarrow 0<x<2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }p'(x)=\\frac{(x-4)(x+1)}{x^2+1},\\text{ on which intervals is }p\\text{ increasing?}",
        difficulty: 4,
        skillTags: ["derivative_sign", "rational_derivative"],
        choices: [
          "$(-\\infty,-1)\\cup(4,\\infty)$",
          "$(-1,4)$",
          "$(-\\infty,4)$",
          "$(-1,\\infty)$",
        ],
        correctLetter: "A",
        hints: [
          "The denominator $x^2+1$ is always positive.",
          "So the sign comes from $(x-4)(x+1)$.",
          "Test intervals separated by $-1$ and $4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Because the denominator is positive, analyze the numerator.",
            math: "(x-4)(x+1)>0",
          },
          {
            step: 2,
            explanation: "The product is positive outside the two zeros.",
            math: "(-\\infty,-1)\\cup(4,\\infty)",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A differentiable function }f\\text{ has }f'(x)=(x-1)(x-3)\\text{ on }[0,5].",
      difficulty: 4,
      skillTags: ["increasing_decreasing", "first_derivative_test", "justification"],
      parts: [
        { letter: "a", promptMarkdown: "Determine the intervals on which $f$ is increasing and decreasing.", points: 2 },
        { letter: "b", promptMarkdown: "Classify any local extrema of $f$ in $(0,5)$.", points: 2 },
        { letter: "c", promptMarkdown: "Explain why your classifications follow from the derivative sign.", points: 1 },
      ],
      hints: [
        "Zeros of $f'$ split the interval into sign-test intervals.",
        "A positive derivative means increasing; a negative derivative means decreasing.",
        "A $+$ to $-$ sign change gives a local maximum; $-$ to $+$ gives a local minimum.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Correctly identifies where $f'(x)>0$." },
          { part: "a", points: 1, description: "Correctly identifies where $f'(x)<0$." },
          { part: "b", points: 1, description: "Classifies the local maximum at $x=1$." },
          { part: "b", points: 1, description: "Classifies the local minimum at $x=3$." },
          { part: "c", points: 1, description: "Uses derivative sign changes as justification." },
        ],
      },
      commonErrors: [
        "Reporting where $f'$ is increasing instead of where $f$ is increasing.",
        "Forgetting to restrict intervals to $[0,5]$.",
        "Naming critical points without classifying them.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(x)=(x-1)(x-3)$ is positive on $(0,1)$ and $(3,5)$, and negative on $(1,3)$. Thus $f$ increases on $(0,1)$ and $(3,5)$ and decreases on $(1,3)$.",
        },
        {
          part: "b",
          explanation:
            "At $x=1$, $f'$ changes from positive to negative, so $f$ has a local maximum. At $x=3$, $f'$ changes from negative to positive, so $f$ has a local minimum.",
        },
        {
          part: "c",
          explanation:
            "The classifications use the First Derivative Test: increasing-to-decreasing gives a local maximum, and decreasing-to-increasing gives a local minimum.",
        },
      ],
    },
  },
  {
    topicCode: "5.4",
    title: "Using the First Derivative Test to Determine Relative Extrema",
    subtopic:
      "Classifying local extrema from derivative sign changes",
    mc: [
      {
        questionLatex:
          "\\text{If }f'\\text{ changes from positive to negative at }x=-2\\text{ and from negative to positive at }x=3,\\text{ what follows?}",
        difficulty: 2,
        skillTags: ["first_derivative_test", "local_extrema"],
        choices: [
          "$f$ has a local maximum at $x=-2$ and a local minimum at $x=3$.",
          "$f$ has local minima at both $x=-2$ and $x=3$.",
          "$f$ has a local minimum at $x=-2$ and a local maximum at $x=3$.",
          "$f$ has no local extrema.",
        ],
        correctLetter: "A",
        hints: [
          "Positive derivative means the function is increasing.",
          "Negative derivative means the function is decreasing.",
          "Increasing then decreasing forms a peak.",
        ],
        solution: [
          {
            step: 1,
            explanation: "At $x=-2$, $f$ goes from increasing to decreasing.",
            math: "\\text{local maximum at }x=-2",
          },
          {
            step: 2,
            explanation: "At $x=3$, $f$ goes from decreasing to increasing.",
            math: "\\text{local minimum at }x=3",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }f'(x)=(x-2)^2(x+1).\\text{ Which critical point classification is correct?}",
        difficulty: 3,
        skillTags: ["first_derivative_test", "multiplicity"],
        choices: [
          "$x=-1$ is a local minimum, and $x=2$ is not a local extremum.",
          "$x=-1$ is a local maximum, and $x=2$ is a local minimum.",
          "$x=2$ is a local maximum, and $x=-1$ is not a local extremum.",
          "Both $x=-1$ and $x=2$ are local extrema.",
        ],
        correctLetter: "A",
        hints: [
          "The squared factor does not change sign at $x=2$.",
          "The factor $x+1$ changes sign at $x=-1$.",
          "Use signs of $f'$ on $(-\\infty,-1)$, $(-1,2)$, and $(2,\\infty)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Check signs of $f'$ around the zeros.",
            math: "f'\\text{ changes }-\\to+\\text{ at }x=-1",
          },
          {
            step: 2,
            explanation: "At $x=2$, the sign stays positive because of the squared factor.",
            math: "x=2\\text{ is not a local extremum}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f'\\text{ is shown. Which local extremum must }f\\text{ have?}",
        difficulty: 3,
        skillTags: ["derivative_graph", "first_derivative_test"],
        figure: firstDerivativeShapeFigure,
        choices: [
          "A local minimum at $x=-2$ and a local maximum at $x=3$",
          "A local maximum at $x=-2$ and a local minimum at $x=3$",
          "A local maximum at $x=0$ only",
          "No local extrema",
        ],
        correctLetter: "A",
        rationales: {
          B: "The sign of $f'$ changes from negative to positive at $x=-2$ and positive to negative at $x=3$.",
          C: "$x=0$ is where $f'$ has a peak, not where $f'=0$.",
          D: "The graph of $f'$ crosses the axis twice.",
        },
        hints: [
          "Look where the graph of $f'$ crosses the x-axis.",
          "At $x=-2$, $f'$ changes from negative to positive.",
          "At $x=3$, $f'$ changes from positive to negative.",
        ],
        solution: [
          {
            step: 1,
            explanation: "At $x=-2$, $f'$ changes from negative to positive.",
            math: "\\text{local minimum}",
          },
          {
            step: 2,
            explanation: "At $x=3$, $f'$ changes from positive to negative.",
            math: "\\text{local maximum}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Suppose }g'\\text{ is negative on }(1,4)\\text{ and positive on }(4,7).\\text{ What can be concluded about }g\\text{ at }x=4?",
        difficulty: 2,
        skillTags: ["first_derivative_test", "local_minimum"],
        choices: [
          "$g$ has a local minimum at $x=4$.",
          "$g$ has a local maximum at $x=4$.",
          "$g$ has an inflection point at $x=4$.",
          "$g$ must be undefined at $x=4$.",
        ],
        correctLetter: "A",
        hints: [
          "Negative $g'$ means decreasing.",
          "Positive $g'$ means increasing.",
          "Decreasing then increasing makes a valley.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The function decreases before $x=4$ and increases after.",
            math: "-\\to+",
          },
          {
            step: 2,
            explanation: "By the First Derivative Test, $g$ has a local minimum at $x=4$.",
            math: "\\text{local minimum at }x=4",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }p'(x)=e^x(x-2),\\text{ what does the First Derivative Test show at }x=2?",
        difficulty: 3,
        skillTags: ["first_derivative_test", "exponential_factor"],
        choices: [
          "$p$ has a local minimum at $x=2$.",
          "$p$ has a local maximum at $x=2$.",
          "$p$ has neither a maximum nor a minimum at $x=2$.",
          "The test cannot be applied because $e^x$ is never zero.",
        ],
        correctLetter: "A",
        hints: [
          "$e^x$ is always positive.",
          "So the sign of $p'$ is the sign of $x-2$.",
          "The derivative changes from negative to positive at $2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Since $e^x>0$, the derivative sign follows $x-2$.",
            math: "p'(x)<0\\text{ for }x<2,\\quad p'(x)>0\\text{ for }x>2",
          },
          {
            step: 2,
            explanation: "The sign change is negative to positive.",
            math: "\\text{local minimum at }x=2",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A differentiable function }f\\text{ has }f'(x)=\\frac{(x-1)(x+2)}{x^2+1}.",
      difficulty: 4,
      skillTags: ["first_derivative_test", "rational_derivative", "local_extrema"],
      parts: [
        { letter: "a", promptMarkdown: "Find the critical points of $f$.", points: 1 },
        { letter: "b", promptMarkdown: "Determine where $f$ is increasing and decreasing.", points: 2 },
        { letter: "c", promptMarkdown: "Classify each local extremum.", points: 2 },
      ],
      hints: [
        "The denominator is always positive.",
        "Analyze the sign of $(x-1)(x+2)$.",
        "Use the First Derivative Test at each zero.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Finds critical points $x=-2$ and $x=1$." },
          { part: "b", points: 1, description: "Gives increasing intervals correctly." },
          { part: "b", points: 1, description: "Gives decreasing interval correctly." },
          { part: "c", points: 1, description: "Classifies $x=-2$ as local maximum." },
          { part: "c", points: 1, description: "Classifies $x=1$ as local minimum." },
        ],
      },
      commonErrors: [
        "Treating the denominator as a source of sign changes.",
        "Reversing maximum and minimum classifications.",
        "Classifying critical points without showing derivative signs.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$x^2+1$ is never zero, so critical points occur when $(x-1)(x+2)=0$. Thus $x=-2$ and $x=1$.",
        },
        {
          part: "b",
          explanation:
            "Since the denominator is positive, $f'$ is positive on $(-\\infty,-2)$ and $(1,\\infty)$, and negative on $(-2,1)$. So $f$ increases on $(-\\infty,-2)$ and $(1,\\infty)$ and decreases on $(-2,1)$.",
        },
        {
          part: "c",
          explanation:
            "At $x=-2$, $f'$ changes from positive to negative, so $f$ has a local maximum. At $x=1$, $f'$ changes from negative to positive, so $f$ has a local minimum.",
        },
      ],
    },
  },
  {
    topicCode: "5.5",
    title: "Using the Candidates Test to Determine Absolute Extrema",
    subtopic:
      "Comparing endpoint and critical-point values on closed intervals",
    mc: [
      {
        questionLatex:
          "\\text{For }f(x)=x^3-6x\\text{ on }[0,3],\\text{ where does }f\\text{ attain its absolute minimum?}",
        difficulty: 3,
        skillTags: ["candidates_test", "absolute_minimum"],
        choices: ["$x=\\sqrt2$", "$x=0$", "$x=3$", "$x=2$"],
        correctLetter: "A",
        hints: [
          "Use endpoints and interior critical points.",
          "$f'(x)=3x^2-6$.",
          "Compare $f(0)$, $f(\\sqrt2)$, and $f(3)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the interior critical point.",
            math: "3x^2-6=0\\Rightarrow x=\\sqrt2\\text{ in }[0,3]",
          },
          {
            step: 2,
            explanation: "Compare values.",
            math: "f(0)=0,\\quad f(\\sqrt2)=-4\\sqrt2,\\quad f(3)=9",
          },
          {
            step: 3,
            explanation: "The smallest value occurs at $x=\\sqrt2$.",
            math: "\\text{absolute minimum at }x=\\sqrt2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }g(x)=x+\\frac4x\\text{ on }[1,5],\\text{ which statement is true?}",
        difficulty: 3,
        skillTags: ["absolute_extrema", "candidates_test", "rational_function"],
        choices: [
          "$g$ has an absolute minimum of $4$ at $x=2$.",
          "$g$ has an absolute maximum of $4$ at $x=2$.",
          "$g$ has an absolute minimum of $5$ at $x=1$.",
          "$g$ has no absolute extrema on the interval.",
        ],
        correctLetter: "A",
        hints: [
          "Differentiate and find critical points in the interval.",
          "$g'(x)=1-4/x^2$.",
          "Compare $x=1$, $x=2$, and $x=5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the critical point.",
            math: "1-\\frac4{x^2}=0\\Rightarrow x=2",
          },
          {
            step: 2,
            explanation: "Compare values.",
            math: "g(1)=5,\\quad g(2)=4,\\quad g(5)=\\frac{29}{5}",
          },
          {
            step: 3,
            explanation: "The smallest value is $4$ at $x=2$.",
            math: "\\text{absolute minimum}=4",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which list must be checked when using the Candidates Test for }f\\text{ on }[a,b]?",
        difficulty: 2,
        skillTags: ["candidates_test", "method_selection"],
        choices: [
          "The endpoints and all critical points in $(a,b)$",
          "Only points where $f'(x)=0$",
          "Only points where $f''(x)=0$",
          "Only the endpoints",
        ],
        correctLetter: "A",
        hints: [
          "Absolute extrema on a closed interval can occur at endpoints.",
          "Interior extrema can occur at critical points.",
          "The Candidates Test compares function values.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The Candidates Test requires all possible absolute-extremum locations.",
            math: "a,\\ b,\\text{ and critical points in }(a,b)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }p(x)=\\sin x+\\cos x\\text{ on }[0,\\pi],\\text{ where is the absolute maximum attained?}",
        difficulty: 4,
        skillTags: ["trig_extrema", "candidates_test"],
        choices: ["$x=\\frac{\\pi}{4}$", "$x=0$", "$x=\\frac{\\pi}{2}$", "$x=\\pi$"],
        correctLetter: "A",
        hints: [
          "Find where $p'(x)=0$.",
          "$p'(x)=\\cos x-\\sin x$.",
          "Compare endpoint and critical values.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set the derivative equal to zero.",
            math: "\\cos x-\\sin x=0\\Rightarrow x=\\frac\\pi4",
          },
          {
            step: 2,
            explanation: "Compare candidate values.",
            math: "p(0)=1,\\quad p\\left(\\frac\\pi4\\right)=\\sqrt2,\\quad p(\\pi)=-1",
          },
          {
            step: 3,
            explanation: "The greatest value occurs at $x=\\pi/4$.",
            math: "\\text{absolute maximum at }x=\\frac\\pi4",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A continuous function on }[-2,4]\\text{ has candidate values }f(-2)=5,\\ f(0)=-1,\\ f(1)=3,\\ f(4)=-4.\\text{ Which conclusion is valid?}",
        difficulty: 2,
        skillTags: ["candidates_test", "value_comparison"],
        choices: [
          "The absolute minimum is $-4$ at $x=4$.",
          "The absolute maximum is $-4$ at $x=4$.",
          "The absolute minimum is $-1$ at $x=0$.",
          "No conclusion can be made from candidate values.",
        ],
        correctLetter: "A",
        hints: [
          "The Candidates Test compares actual function values.",
          "The smallest listed value gives the absolute minimum.",
          "The largest listed value gives the absolute maximum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compare the candidate values.",
            math: "5,\\ -1,\\ 3,\\ -4",
          },
          {
            step: 2,
            explanation: "The smallest is $-4$.",
            math: "\\text{absolute minimum at }x=4",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=x^4-4x^2\\text{ on }[-2,3].\\text{ Use the Candidates Test to find the absolute extrema.}",
      difficulty: 4,
      skillTags: ["candidates_test", "absolute_extrema", "polynomial"],
      parts: [
        { letter: "a", promptMarkdown: "Find all candidate $x$-values.", points: 2 },
        { letter: "b", promptMarkdown: "Evaluate $f$ at each candidate.", points: 2 },
        { letter: "c", promptMarkdown: "State the absolute maximum and absolute minimum values with their locations.", points: 2 },
      ],
      hints: [
        "Include endpoints $-2$ and $3$.",
        "$f'(x)=4x(x^2-2)$.",
        "Compare function values, not derivative values.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Computes $f'(x)=4x(x^2-2)$." },
          { part: "a", points: 1, description: "Lists candidates $-2,-\\sqrt2,0,\\sqrt2,3$." },
          { part: "b", points: 2, description: "Correctly evaluates all candidate values." },
          { part: "c", points: 1, description: "Identifies absolute maximum value $45$ at $x=3$." },
          { part: "c", points: 1, description: "Identifies absolute minimum value $-4$ at $x=\\pm\\sqrt2$." },
        ],
      },
      commonErrors: [
        "Forgetting the endpoints.",
        "Dropping the negative critical point.",
        "Calling $x=0$ the maximum because $f'(0)=0$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(x)=4x^3-8x=4x(x^2-2)$, so the interior critical points are $x=-\\sqrt2,0,\\sqrt2$. Include endpoints $-2$ and $3$.",
        },
        {
          part: "b",
          explanation:
            "$f(-2)=0$, $f(-\\sqrt2)=-4$, $f(0)=0$, $f(\\sqrt2)=-4$, and $f(3)=45$.",
        },
        {
          part: "c",
          explanation:
            "The absolute maximum value is $45$ at $x=3$. The absolute minimum value is $-4$ at $x=-\\sqrt2$ and $x=\\sqrt2$.",
        },
      ],
    },
  },
  {
    topicCode: "5.6",
    title: "Determining Concavity of Functions over Their Domains",
    subtopic:
      "Using the second derivative to determine concavity and inflection points",
    mc: [
      {
        questionLatex:
          "\\text{If }f''(x)=6x-12,\\text{ where is }f\\text{ concave up?}",
        difficulty: 2,
        skillTags: ["concavity", "second_derivative_sign"],
        choices: ["$(2,\\infty)$", "$(-\\infty,2)$", "$(-\\infty,\\infty)$", "$(0,2)$"],
        correctLetter: "A",
        hints: [
          "Concave up means $f''(x)>0$.",
          "Solve $6x-12>0$.",
          "The sign changes at $x=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Solve for where the second derivative is positive.",
            math: "6x-12>0\\Rightarrow x>2",
          },
          {
            step: 2,
            explanation: "Therefore $f$ is concave up on $(2,\\infty)$.",
            math: "(2,\\infty)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }g'(x)=3x^2-6x,\\text{ at which }x\\text{-value does }g\\text{ have a possible inflection point?}",
        difficulty: 3,
        skillTags: ["inflection_points", "second_derivative"],
        choices: ["$x=1$", "$x=0$", "$x=3$", "$x=2$"],
        correctLetter: "A",
        hints: [
          "Inflection points are about concavity, so use $g''$.",
          "Differentiate $g'$.",
          "Check where $g''$ can change sign.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the second derivative.",
            math: "g''(x)=6x-6",
          },
          {
            step: 2,
            explanation: "The second derivative changes sign at $x=1$.",
            math: "x=1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The sign chart for }f''\\text{ is shown. On which interval is }f\\text{ concave down?}",
        difficulty: 2,
        skillTags: ["concavity", "sign_chart"],
        figure: concavityChartFigure,
        choices: ["$(-2,1)$", "$(-\\infty,-2)$", "$(1,\\infty)$", "$(-\\infty,-2)\\cup(1,\\infty)$"],
        correctLetter: "A",
        hints: [
          "Concave down means $f''<0$.",
          "Read the interval marked with a negative sign.",
          "The negative sign lies between $-2$ and $1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "From the sign chart, $f''$ is negative between $-2$ and $1$.",
            math: "f''(x)<0\\text{ on }(-2,1)",
          },
          {
            step: 2,
            explanation: "Therefore $f$ is concave down there.",
            math: "(-2,1)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }h(x)=\\ln x,\\ x>0,\\text{ which statement about concavity is true?}",
        difficulty: 3,
        skillTags: ["concavity", "domain_restriction", "logarithmic_function"],
        choices: [
          "$h$ is concave down on $(0,\\infty)$.",
          "$h$ is concave up on $(0,\\infty)$.",
          "$h$ changes concavity at $x=1$.",
          "$h$ has no concavity because $h'$ is undefined.",
        ],
        correctLetter: "A",
        hints: [
          "Compute $h''(x)$.",
          "$h'(x)=1/x$.",
          "On the domain, $-1/x^2$ is always negative.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate twice.",
            math: "h'(x)=\\frac1x,\\quad h''(x)=-\\frac1{x^2}",
          },
          {
            step: 2,
            explanation: "$h''$ is negative for every $x>0$.",
            math: "\\text{concave down on }(0,\\infty)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }p''(x)=(x-1)^2(x+2),\\text{ where does }p\\text{ have an inflection point?}",
        difficulty: 4,
        skillTags: ["inflection_points", "multiplicity", "concavity"],
        choices: ["$x=-2$ only", "$x=1$ only", "$x=-2$ and $x=1$", "Neither value"],
        correctLetter: "A",
        hints: [
          "An inflection point requires a change in concavity.",
          "The squared factor does not change sign at $x=1$.",
          "The factor $x+2$ changes sign at $x=-2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Zeros of $p''$ occur at $x=-2$ and $x=1$.",
            math: "p''(x)=(x-1)^2(x+2)",
          },
          {
            step: 2,
            explanation: "The sign changes only at $x=-2$.",
            math: "\\text{inflection point at }x=-2\\text{ only}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A twice-differentiable function }f\\text{ has }f''(x)=x(x-3).",
      difficulty: 4,
      skillTags: ["concavity", "inflection_points", "second_derivative_sign"],
      parts: [
        { letter: "a", promptMarkdown: "Determine where $f$ is concave up and concave down.", points: 2 },
        { letter: "b", promptMarkdown: "Find the $x$-coordinates of all inflection points.", points: 1 },
        { letter: "c", promptMarkdown: "Justify why the points in part (b) are inflection points.", points: 1 },
      ],
      hints: [
        "Use the sign of $f''$.",
        "The zeros of $x(x-3)$ are $0$ and $3$.",
        "An inflection point requires a sign change in $f''$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Gives concave up intervals correctly." },
          { part: "a", points: 1, description: "Gives concave down interval correctly." },
          { part: "b", points: 1, description: "Identifies $x=0$ and $x=3$." },
          { part: "c", points: 1, description: "Justifies by sign changes of $f''$." },
        ],
      },
      commonErrors: [
        "Using the sign of $f'$ instead of $f''$.",
        "Claiming every zero of $f''$ is automatically an inflection point.",
        "Reversing concave up and concave down.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f''(x)=x(x-3)$ is positive on $(-\\infty,0)$ and $(3,\\infty)$, and negative on $(0,3)$. Thus $f$ is concave up on $(-\\infty,0)$ and $(3,\\infty)$, and concave down on $(0,3)$.",
        },
        {
          part: "b",
          explanation:
            "The possible inflection points occur at $x=0$ and $x=3$.",
        },
        {
          part: "c",
          explanation:
            "At both $x=0$ and $x=3$, the sign of $f''$ changes, so the concavity changes. Therefore both are inflection points.",
        },
      ],
    },
  },
  {
    topicCode: "5.7",
    title: "Using the Second Derivative Test to Determine Extrema",
    subtopic:
      "Classifying critical points using second derivative information",
    mc: [
      {
        questionLatex:
          "\\text{If }f'(2)=0\\text{ and }f''(2)<0,\\text{ what does the Second Derivative Test show?}",
        difficulty: 2,
        skillTags: ["second_derivative_test", "local_maximum"],
        choices: [
          "$f$ has a local maximum at $x=2$.",
          "$f$ has a local minimum at $x=2$.",
          "$f$ has an inflection point at $x=2$.",
          "The test is inconclusive.",
        ],
        correctLetter: "A",
        hints: [
          "$f'(2)=0$ makes $x=2$ a critical point.",
          "$f''(2)<0$ means the graph is concave down there.",
          "A horizontal tangent with concave down behavior forms a peak.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the Second Derivative Test.",
            math: "f'(2)=0,\\quad f''(2)<0",
          },
          {
            step: 2,
            explanation: "A negative second derivative at a critical point gives a local maximum.",
            math: "\\text{local maximum at }x=2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }g(x)=x^4,\\text{ what does the Second Derivative Test say at }x=0?",
        difficulty: 3,
        skillTags: ["second_derivative_test", "inconclusive_case"],
        choices: [
          "The test is inconclusive.",
          "$g$ has a local maximum at $x=0$.",
          "$g$ has no local extremum at $x=0$.",
          "$g$ is not differentiable at $x=0$.",
        ],
        correctLetter: "A",
        hints: [
          "Compute $g'(0)$ and $g''(0)$.",
          "The Second Derivative Test requires $g''(0)$ to be positive or negative.",
          "If $g''(0)=0$, the test gives no conclusion.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute derivatives at the critical point.",
            math: "g'(x)=4x^3,\\quad g''(x)=12x^2",
          },
          {
            step: 2,
            explanation: "At $x=0$, both $g'(0)$ and $g''(0)$ are zero.",
            math: "g''(0)=0\\Rightarrow\\text{test inconclusive}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f'(x)=(x-1)(x-4),\\text{ and }f''(x)=2x-5,\\text{ how are the critical points classified?}",
        difficulty: 3,
        skillTags: ["second_derivative_test", "critical_point_classification"],
        choices: [
          "$x=1$ is a local maximum and $x=4$ is a local minimum.",
          "$x=1$ is a local minimum and $x=4$ is a local maximum.",
          "Both are local maxima.",
          "Both are inconclusive.",
        ],
        correctLetter: "A",
        hints: [
          "The critical points are where $f'=0$.",
          "Evaluate $f''$ at each critical point.",
          "Negative means local maximum; positive means local minimum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the second derivative.",
            math: "f''(1)=-3,\\quad f''(4)=3",
          },
          {
            step: 2,
            explanation: "Classify by the signs.",
            math: "x=1\\text{ max},\\quad x=4\\text{ min}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }p(x)=x^3-6x^2+9x,\\text{ which classification is correct?}",
        difficulty: 4,
        skillTags: ["second_derivative_test", "polynomial_extrema"],
        choices: [
          "$p$ has a local maximum at $x=1$ and a local minimum at $x=3$.",
          "$p$ has a local minimum at $x=1$ and a local maximum at $x=3$.",
          "$p$ has local maxima at both $x=1$ and $x=3$.",
          "$p$ has no local extrema.",
        ],
        correctLetter: "A",
        hints: [
          "Find $p'$ and solve $p'=0$.",
          "$p'(x)=3(x-1)(x-3)$.",
          "Use $p''(x)=6x-12$ at each critical point.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find critical points and the second derivative.",
            math: "p'(x)=3(x-1)(x-3),\\quad p''(x)=6x-12",
          },
          {
            step: 2,
            explanation: "Evaluate $p''$ at the critical points.",
            math: "p''(1)=-6,\\quad p''(3)=6",
          },
          {
            step: 3,
            explanation: "Classify the critical points.",
            math: "x=1\\text{ max},\\quad x=3\\text{ min}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which condition makes the Second Derivative Test inconclusive at a critical point }x=c?",
        difficulty: 2,
        skillTags: ["second_derivative_test", "test_limitations"],
        choices: [
          "$f'(c)=0$ and $f''(c)=0$",
          "$f'(c)=0$ and $f''(c)>0$",
          "$f'(c)=0$ and $f''(c)<0$",
          "$f''(c)$ is positive",
        ],
        correctLetter: "A",
        hints: [
          "The test only classifies when $f''(c)$ is clearly positive or negative.",
          "Positive gives local minimum; negative gives local maximum.",
          "Zero gives no conclusion.",
        ],
        solution: [
          {
            step: 1,
            explanation: "At a critical point, the test uses the sign of $f''(c)$.",
            math: "f''(c)=0",
          },
          {
            step: 2,
            explanation: "If $f''(c)=0$, the Second Derivative Test is inconclusive.",
            math: "\\text{no conclusion from this test}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A twice-differentiable function }f\\text{ has }f'(x)=(x-1)(x-3)\\text{ and }f''(x)=2x-4.",
      difficulty: 4,
      skillTags: ["second_derivative_test", "first_derivative_test_connection"],
      parts: [
        { letter: "a", promptMarkdown: "Find the critical points of $f$.", points: 1 },
        { letter: "b", promptMarkdown: "Use the Second Derivative Test to classify each critical point.", points: 2 },
        { letter: "c", promptMarkdown: "Confirm the classifications using the sign of $f'$.", points: 2 },
      ],
      hints: [
        "Critical points come from $f'(x)=0$.",
        "Evaluate $f''$ at each critical point.",
        "A sign chart for $f'$ should match the classifications.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Finds $x=1$ and $x=3$." },
          { part: "b", points: 1, description: "Uses $f''(1)<0$ to classify a local maximum." },
          { part: "b", points: 1, description: "Uses $f''(3)>0$ to classify a local minimum." },
          { part: "c", points: 1, description: "Shows $f'$ changes $+\\to-$ at $x=1$." },
          { part: "c", points: 1, description: "Shows $f'$ changes $-\\to+$ at $x=3$." },
        ],
      },
      commonErrors: [
        "Using $f''=0$ to find critical points.",
        "Reversing the meaning of positive and negative second derivative.",
        "Skipping the requested first-derivative confirmation.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(x)=(x-1)(x-3)=0$ at $x=1$ and $x=3$.",
        },
        {
          part: "b",
          explanation:
            "$f''(1)=-2$, so $f$ has a local maximum at $x=1$. Also $f''(3)=2$, so $f$ has a local minimum at $x=3$.",
        },
        {
          part: "c",
          explanation:
            "$f'$ is positive on $(-\\infty,1)$, negative on $(1,3)$, and positive on $(3,\\infty)$. Thus $f'$ changes $+\\to-$ at $1$ and $-\\to+$ at $3$, confirming the max/min classifications.",
        },
      ],
    },
  },
  {
    topicCode: "5.8",
    title: "Sketching Graphs of Functions and Their Derivatives",
    subtopic:
      "Using graphs of derivatives to infer features of original functions",
    mc: [
      {
        questionLatex:
          "\\text{The graph of }f'\\text{ is shown. Where does }f\\text{ have a local minimum?}",
        difficulty: 3,
        skillTags: ["derivative_graph", "local_extrema"],
        figure: firstDerivativeShapeFigure,
        choices: ["$x=-2$", "$x=0$", "$x=3$", "No local minimum"],
        correctLetter: "A",
        hints: [
          "A local minimum of $f$ occurs where $f'$ changes from negative to positive.",
          "Use the x-intercepts of the graph of $f'$.",
          "At $x=-2$, the graph crosses from below to above the axis.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Read the sign change of $f'$ at $x=-2$.",
            math: "f'\\text{ changes }-\\to+",
          },
          {
            step: 2,
            explanation: "Therefore $f$ has a local minimum at $x=-2$.",
            math: "x=-2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Using the same graph of }f',\\text{ on which interval is }f\\text{ increasing?}",
        difficulty: 3,
        skillTags: ["derivative_graph", "increasing_decreasing"],
        figure: firstDerivativeShapeFigure,
        choices: ["$(-2,3)$", "$(-\\infty,-2)$", "$(3,\\infty)$", "$(-\\infty,-2)\\cup(3,\\infty)$"],
        correctLetter: "A",
        hints: [
          "$f$ increases where $f'>0$.",
          "Look for where the graph of $f'$ is above the x-axis.",
          "The graph is above the axis between the two intercepts.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Read where $f'$ is positive.",
            math: "f'(x)>0\\text{ on }(-2,3)",
          },
          {
            step: 2,
            explanation: "That is where $f$ increases.",
            math: "(-2,3)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If the graph of }f'\\text{ has a local maximum at }x=0\\text{ and is increasing before }0\\text{ and decreasing after }0,\\text{ what happens to }f\\text{ at }x=0?",
        difficulty: 4,
        skillTags: ["derivative_graph", "concavity_from_f_prime"],
        choices: [
          "$f$ changes from concave up to concave down.",
          "$f$ has a local maximum.",
          "$f$ has a local minimum.",
          "$f$ must have a horizontal tangent.",
        ],
        correctLetter: "A",
        hints: [
          "Concavity of $f$ depends on whether $f'$ is increasing or decreasing.",
          "$f'$ increasing means $f''>0$.",
          "$f'$ decreasing means $f''<0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Before $0$, $f'$ increases, so $f$ is concave up.",
            math: "f''>0",
          },
          {
            step: 2,
            explanation: "After $0$, $f'$ decreases, so $f$ is concave down.",
            math: "f''<0",
          },
          {
            step: 3,
            explanation: "Thus $f$ changes from concave up to concave down.",
            math: "\\text{inflection behavior at }x=0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f'\\text{ is below the x-axis and increasing on an interval. Which description of }f\\text{ is correct there?}",
        difficulty: 3,
        skillTags: ["function_derivative_connection", "concavity_and_monotonicity"],
        choices: [
          "$f$ is decreasing and concave up.",
          "$f$ is increasing and concave up.",
          "$f$ is decreasing and concave down.",
          "$f$ is increasing and concave down.",
        ],
        correctLetter: "A",
        hints: [
          "Below the x-axis means $f'<0$.",
          "Increasing graph of $f'$ means $f''>0$.",
          "Combine monotonicity and concavity.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Since $f'<0$, the original function is decreasing.",
            math: "f'<0",
          },
          {
            step: 2,
            explanation: "Since $f'$ is increasing, $f''>0$ and $f$ is concave up.",
            math: "f''>0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f\\text{ is increasing and concave down on an interval, which statement about }f'\\text{ is true there?}",
        difficulty: 3,
        skillTags: ["graph_matching", "derivative_behavior"],
        choices: [
          "$f'$ is positive and decreasing.",
          "$f'$ is positive and increasing.",
          "$f'$ is negative and decreasing.",
          "$f'$ is zero throughout the interval.",
        ],
        correctLetter: "A",
        hints: [
          "Increasing means $f'>0$.",
          "Concave down means $f''<0$.",
          "$f''<0$ means $f'$ is decreasing.",
        ],
        solution: [
          {
            step: 1,
            explanation: "From increasing behavior, $f'$ is positive.",
            math: "f'>0",
          },
          {
            step: 2,
            explanation: "From concave down behavior, $f'$ is decreasing.",
            math: "f''<0",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The graph of }f'\\text{ is shown for }-4<x<5.",
      difficulty: 4,
      skillTags: ["derivative_graph", "sketching_from_derivative", "concavity"],
      figure: firstDerivativeShapeFigure,
      parts: [
        { letter: "a", promptMarkdown: "Determine the intervals where $f$ is increasing and decreasing.", points: 2 },
        { letter: "b", promptMarkdown: "Identify the $x$-coordinates of the local extrema of $f$ and classify them.", points: 2 },
        { letter: "c", promptMarkdown: "Describe the concavity of $f$ near $x=0$ based on the behavior of $f'$.", points: 1 },
      ],
      hints: [
        "Use the sign of $f'$ for increasing/decreasing.",
        "Use sign changes of $f'$ for local extrema.",
        "Use increasing/decreasing behavior of $f'$ for concavity of $f$.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Identifies $f$ increasing where $f'>0$." },
          { part: "a", points: 1, description: "Identifies $f$ decreasing where $f'<0$." },
          { part: "b", points: 1, description: "Classifies local minimum at $x=-2$." },
          { part: "b", points: 1, description: "Classifies local maximum at $x=3$." },
          { part: "c", points: 1, description: "Connects local maximum of $f'$ near $0$ to a concavity change in $f$." },
        ],
      },
      commonErrors: [
        "Treating the graph as $f$ instead of $f'$.",
        "Using y-values of $f'$ as values of $f$.",
        "Confusing zeros of $f'$ with zeros of $f$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f$ is increasing where $f'>0$, which is approximately on $(-2,3)$. It is decreasing where $f'<0$, approximately on $(-4,-2)$ and $(3,5)$.",
        },
        {
          part: "b",
          explanation:
            "At $x=-2$, $f'$ changes from negative to positive, so $f$ has a local minimum. At $x=3$, $f'$ changes from positive to negative, so $f$ has a local maximum.",
        },
        {
          part: "c",
          explanation:
            "Near $x=0$, the graph of $f'$ changes from increasing to decreasing, so $f''$ changes from positive to negative. Thus $f$ changes from concave up to concave down near $x=0$.",
        },
      ],
    },
  },
  {
    topicCode: "5.9",
    title: "Connecting a Function, Its First Derivative, and Its Second Derivative",
    subtopic:
      "Combining sign, slope, and concavity information across representations",
    mc: [
      {
        questionLatex:
          "\\text{At }x=2,\\ f'(2)=0\\text{ and }f''(2)<0.\\text{ Which statement is most complete?}",
        difficulty: 2,
        skillTags: ["first_second_derivative_connection", "local_maximum"],
        choices: [
          "$f$ has a local maximum at $x=2$ and is concave down there.",
          "$f$ has a local minimum at $x=2$ and is concave up there.",
          "$f$ is increasing at $x=2$.",
          "$f$ must have an inflection point at $x=2$.",
        ],
        correctLetter: "A",
        hints: [
          "$f'(2)=0$ gives a horizontal tangent.",
          "$f''(2)<0$ means concave down.",
          "A horizontal tangent with concave down behavior is a local maximum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the Second Derivative Test.",
            math: "f'(2)=0,\\quad f''(2)<0",
          },
          {
            step: 2,
            explanation: "This gives a local maximum and concave down behavior.",
            math: "\\text{local maximum at }x=2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f\\text{ is increasing and concave down at }x=4,\\text{ which signs are consistent?}",
        difficulty: 2,
        skillTags: ["sign_interpretation", "concavity"],
        choices: ["$f'(4)>0$ and $f''(4)<0$", "$f'(4)<0$ and $f''(4)<0$", "$f'(4)>0$ and $f''(4)>0$", "$f'(4)=0$ and $f''(4)=0$"],
        correctLetter: "A",
        hints: [
          "Increasing is about $f'$.",
          "Concavity is about $f''$.",
          "Concave down corresponds to negative second derivative.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Translate increasing to derivative sign.",
            math: "f'(4)>0",
          },
          {
            step: 2,
            explanation: "Translate concave down to second derivative sign.",
            math: "f''(4)<0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{On an interval, }f'(x)<0\\text{ and }f''(x)>0.\\text{ Which graph behavior matches }f?",
        difficulty: 3,
        skillTags: ["function_behavior", "derivative_signs"],
        choices: [
          "$f$ is decreasing and concave up.",
          "$f$ is decreasing and concave down.",
          "$f$ is increasing and concave up.",
          "$f$ is increasing and concave down.",
        ],
        correctLetter: "A",
        hints: [
          "$f'<0$ controls increasing/decreasing.",
          "$f''>0$ controls concavity.",
          "Combine the two descriptions.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Since $f'<0$, $f$ is decreasing.",
            math: "f'<0",
          },
          {
            step: 2,
            explanation: "Since $f''>0$, $f$ is concave up.",
            math: "f''>0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The graph of }f'\\text{ is above the x-axis and decreasing on an interval. Which statement about }f\\text{ is true?}",
        difficulty: 3,
        skillTags: ["derivative_graph", "function_behavior"],
        choices: [
          "$f$ is increasing and concave down.",
          "$f$ is decreasing and concave down.",
          "$f$ is increasing and concave up.",
          "$f$ is decreasing and concave up.",
        ],
        correctLetter: "A",
        hints: [
          "Above the x-axis means $f'>0$.",
          "A decreasing $f'$ means $f''<0$.",
          "Use both facts.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$f'>0$ means $f$ is increasing.",
            math: "f'>0",
          },
          {
            step: 2,
            explanation: "$f'$ decreasing means $f''<0$, so $f$ is concave down.",
            math: "f''<0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A function }f\\text{ has }f'(c)=0\\text{ and }f''(c)>0.\\text{ What is the best local description of }f\\text{ at }c?",
        difficulty: 2,
        skillTags: ["second_derivative_test", "local_description"],
        choices: [
          "A local minimum with concave up behavior",
          "A local maximum with concave down behavior",
          "An inflection point with no extremum",
          "A vertical tangent",
        ],
        correctLetter: "A",
        hints: [
          "$f'(c)=0$ means a horizontal tangent.",
          "$f''(c)>0$ means concave up.",
          "A horizontal tangent with concave up behavior is a valley.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the Second Derivative Test.",
            math: "f'(c)=0,\\quad f''(c)>0",
          },
          {
            step: 2,
            explanation: "This indicates a local minimum and concave up behavior.",
            math: "\\text{local minimum}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The figure shows compatible sketches of }f,\\ f',\\text{ and }f''\\text{ on }-3<x<5.",
      difficulty: 4,
      skillTags: ["first_second_derivative_connection", "local_extrema", "concavity"],
      figure: functionDerivativeSecondDerivativeFigure,
      parts: [
        { letter: "a", promptMarkdown: "Use the graph of $f'$ to determine where $f$ is increasing and decreasing.", points: 2 },
        { letter: "b", promptMarkdown: "Use the graph of $f'$ to classify any local extremum at $x=1$.", points: 1 },
        { letter: "c", promptMarkdown: "Use the graph of $f''$ to determine the concavity intervals and identify the inflection point.", points: 2 },
      ],
      hints: [
        "Read increasing/decreasing from where the graph of $f'$ is above or below the x-axis.",
        "Read concavity from where the graph of $f''$ is above or below the x-axis.",
        "A sign change in $f'$ gives a local extremum; a sign change in $f''$ gives an inflection point.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "States increasing interval." },
          { part: "a", points: 1, description: "States decreasing interval." },
          { part: "b", points: 1, description: "Classifies local maximum at $x=1$." },
          { part: "c", points: 1, description: "States concavity intervals." },
          { part: "c", points: 1, description: "Identifies inflection point at $x=2$." },
        ],
      },
      commonErrors: [
        "Using $f''$ to decide increasing/decreasing.",
        "Calling $x=2$ a local extremum because $f''$ changes sign.",
        "Forgetting that local extrema use the sign of $f'$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "From the graph of $f'$, $f'>0$ on $(-3,1)$, so $f$ is increasing there. Also $f'<0$ on $(1,5)$, so $f$ is decreasing there.",
        },
        {
          part: "b",
          explanation:
            "At $x=1$, the graph of $f'$ crosses the x-axis from positive to negative, so $f$ has a local maximum at $x=1$.",
        },
        {
          part: "c",
          explanation:
            "From the graph of $f''$, $f''<0$ on $(-3,2)$, so $f$ is concave down there. Also $f''>0$ on $(2,5)$, so $f$ is concave up there. The sign changes at $x=2$, so $x=2$ is an inflection point.",
        },
      ],
    },
  },
  {
    topicCode: "5.10",
    title: "Introduction to Optimization Problems",
    subtopic:
      "Building objective functions, constraints, and feasible domains",
    mc: [
      {
        questionLatex:
          "\\text{A rectangle has perimeter }40.\\text{ If one side is }x,\\text{ which objective function gives its area?}",
        difficulty: 2,
        skillTags: ["optimization_setup", "rectangle_area"],
        figure: rectangleOptimizationFigure,
        choices: ["$A(x)=x(20-x)$", "$A(x)=x(40-x)$", "$A(x)=2x(20-x)$", "$A(x)=40x$"],
        correctLetter: "A",
        hints: [
          "Perimeter $40$ means $2x+2y=40$.",
          "Solve the constraint for the other side.",
          "Area is length times width.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the perimeter constraint.",
            math: "2x+2y=40\\Rightarrow y=20-x",
          },
          {
            step: 2,
            explanation: "Write area as a one-variable function.",
            math: "A(x)=x(20-x)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Squares of side }x\\text{ are cut from the corners of a }10\\text{ by }16\\text{ sheet to make an open box. Which volume model is correct?}",
        difficulty: 3,
        skillTags: ["optimization_setup", "open_box"],
        figure: openBoxFigure,
        choices: [
          "$V(x)=x(10-2x)(16-2x),\\ 0<x<5$",
          "$V(x)=x(10-x)(16-x),\\ 0<x<10$",
          "$V(x)=x(10-2x)(16-2x),\\ 0<x<8$",
          "$V(x)=x(10+x)(16+x),\\ x>0$",
        ],
        correctLetter: "A",
        hints: [
          "The cut squares become the height of the box.",
          "Each base dimension loses $2x$.",
          "The smaller original side controls the domain.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Height is $x$, and base dimensions are reduced by two corner cuts.",
            math: "10-2x,\\quad 16-2x",
          },
          {
            step: 2,
            explanation: "Both base dimensions must stay positive.",
            math: "0<x<5",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A rectangular pen is built along a river using }200\\text{ ft of fencing for the other three sides. If }x\\text{ is the width perpendicular to the river, which area model is correct?}",
        difficulty: 3,
        skillTags: ["optimization_setup", "constraint_modeling"],
        figure: riverFenceFigure,
        choices: [
          "$A(x)=x(200-2x),\\ 0<x<100$",
          "$A(x)=x(200-x),\\ 0<x<200$",
          "$A(x)=2x(200-2x),\\ 0<x<100$",
          "$A(x)=x(100-x),\\ 0<x<100$",
        ],
        correctLetter: "A",
        hints: [
          "Only three sides need fencing.",
          "The two widths use $2x$ feet of fencing total.",
          "The side along the river has length $200-2x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the fencing constraint.",
            math: "2x+y=200\\Rightarrow y=200-2x",
          },
          {
            step: 2,
            explanation: "The area is width times length.",
            math: "A(x)=x(200-2x),\\quad 0<x<100",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Two positive numbers have sum }30.\\text{ If }x\\text{ is one number, which function should be maximized to maximize their product?}",
        difficulty: 2,
        skillTags: ["optimization_setup", "constraint"],
        choices: ["$P(x)=x(30-x),\\ 0<x<30$", "$P(x)=30x$", "$P(x)=x(x-30)$", "$P(x)=x^2+30$"],
        correctLetter: "A",
        hints: [
          "If one number is $x$, express the other number using the sum.",
          "The other number is $30-x$.",
          "Product means multiply the two numbers.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the sum constraint.",
            math: "y=30-x",
          },
          {
            step: 2,
            explanation: "The product is a one-variable function.",
            math: "P(x)=x(30-x),\\quad 0<x<30",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A closed rectangular box has square base side }x\\text{ and volume }500.\\text{ If }h\\text{ is height, which surface area model uses one variable?}",
        difficulty: 4,
        skillTags: ["optimization_setup", "surface_area", "constraint"],
        choices: [
          "$S(x)=2x^2+\\frac{2000}{x},\\ x>0$",
          "$S(x)=x^2+4xh,\\ x>0$",
          "$S(x)=2x^2+500x,\\ x>0$",
          "$S(x)=x^2+\\frac{500}{x},\\ x>0$",
        ],
        correctLetter: "A",
        hints: [
          "Volume gives $x^2h=500$.",
          "A closed box has top, bottom, and four side faces.",
          "Substitute $h=500/x^2$ into $S=2x^2+4xh$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the volume constraint.",
            math: "h=\\frac{500}{x^2}",
          },
          {
            step: 2,
            explanation: "Substitute into surface area.",
            math: "S=2x^2+4x\\left(\\frac{500}{x^2}\\right)=2x^2+\\frac{2000}{x}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A poster has total area }180\\text{ in}^2.\\text{ The top and bottom margins are }2\\text{ in each, and the left and right margins are }1\\text{ in each. Let }x\\text{ be the poster width.}",
      difficulty: 4,
      skillTags: ["optimization_setup", "area_model", "domain"],
      parts: [
        { letter: "a", promptMarkdown: "Express the poster height in terms of $x$.", points: 1 },
        { letter: "b", promptMarkdown: "Write a one-variable function for the printed area.", points: 2 },
        { letter: "c", promptMarkdown: "State a reasonable domain for $x$.", points: 1 },
      ],
      hints: [
        "Total area gives width times height.",
        "Printed width loses 2 inches total; printed height loses 4 inches total.",
        "Both printed dimensions must be positive.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Finds poster height $180/x$." },
          { part: "b", points: 1, description: "Uses printed width $x-2$." },
          { part: "b", points: 1, description: "Uses printed height $180/x-4$." },
          { part: "c", points: 1, description: "States domain $2<x<45$." },
        ],
      },
      commonErrors: [
        "Subtracting only one margin instead of both margins.",
        "Using total area as printed area.",
        "Forgetting the domain restrictions from positive printed dimensions.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "If the poster width is $x$ and total area is $180$, then the poster height is $180/x$.",
        },
        {
          part: "b",
          explanation:
            "The printed width is $x-2$ because the left and right margins remove $1+1$ inches. The printed height is $180/x-4$ because the top and bottom margins remove $2+2$ inches. Thus $A(x)=(x-2)(180/x-4)$.",
        },
        {
          part: "c",
          explanation:
            "Need $x-2>0$ and $180/x-4>0$. With $x>0$, this gives $x>2$ and $x<45$, so $2<x<45$.",
        },
      ],
    },
  },
  {
    topicCode: "5.11",
    title: "Solving Optimization Problems",
    subtopic:
      "Differentiating objective functions and confirming optimal values",
    mc: [
      {
        questionLatex:
          "\\text{A rectangle has perimeter }40.\\text{ What dimensions maximize its area?}",
        difficulty: 3,
        skillTags: ["optimization", "rectangle_area"],
        figure: rectangleOptimizationFigure,
        choices: ["$10\\text{ by }10$", "$5\\text{ by }15$", "$8\\text{ by }12$", "$1\\text{ by }19$"],
        correctLetter: "A",
        hints: [
          "Use $A(x)=x(20-x)$.",
          "Differentiate the area function.",
          "The vertex of the quadratic gives the maximum.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write and differentiate the area model.",
            math: "A(x)=20x-x^2,\\quad A'(x)=20-2x",
          },
          {
            step: 2,
            explanation: "Set $A'(x)=0$.",
            math: "20-2x=0\\Rightarrow x=10",
          },
          {
            step: 3,
            explanation: "The other side is also $10$.",
            math: "10\\text{ by }10",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A farmer has }240\\text{ ft of fencing for three sides of a rectangular pen along a river. What dimensions maximize the area?}",
        difficulty: 3,
        skillTags: ["optimization", "river_fence"],
        figure: riverFenceFigure,
        choices: [
          "$60\\text{ ft perpendicular to the river and }120\\text{ ft along the river}$",
          "$80\\text{ ft perpendicular to the river and }80\\text{ ft along the river}$",
          "$40\\text{ ft perpendicular to the river and }160\\text{ ft along the river}$",
          "$120\\text{ ft perpendicular to the river and }0\\text{ ft along the river}$",
        ],
        correctLetter: "A",
        hints: [
          "Let $x$ be the perpendicular side and $y$ the side along the river.",
          "The fencing constraint is $2x+y=240$.",
          "Maximize $A=x(240-2x)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write area in terms of $x$.",
            math: "A(x)=x(240-2x)=240x-2x^2",
          },
          {
            step: 2,
            explanation: "Differentiate and solve.",
            math: "A'(x)=240-4x=0\\Rightarrow x=60",
          },
          {
            step: 3,
            explanation: "Find the other side.",
            math: "y=240-2(60)=120",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Squares of side }x\\text{ are cut from a }10\\text{ by }20\\text{ sheet to make an open box. Which }x\\text{ maximizes the volume?}",
        difficulty: 4,
        skillTags: ["optimization", "open_box"],
        figure: openBoxFigure,
        choices: [
          "$5-\\frac{5\\sqrt3}{3}$",
          "$5+\\frac{5\\sqrt3}{3}$",
          "$\\frac52$",
          "$5$",
        ],
        correctLetter: "A",
        hints: [
          "Use $V=x(10-2x)(20-2x)$.",
          "The domain is $0<x<5$.",
          "Only one critical point from the quadratic derivative lies in the domain.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Expand and differentiate.",
            math: "V=200x-60x^2+4x^3,\\quad V'=200-120x+12x^2",
          },
          {
            step: 2,
            explanation: "Solve $V'=0$.",
            math: "3x^2-30x+50=0\\Rightarrow x=5\\pm\\frac{5\\sqrt3}{3}",
          },
          {
            step: 3,
            explanation: "Only the smaller root lies in $0<x<5$.",
            math: "x=5-\\frac{5\\sqrt3}{3}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which points on }y=x^2\\text{ are closest to }(0,2)?",
        difficulty: 5,
        skillTags: ["optimization", "distance_minimization"],
        choices: [
          "$\\left(\\pm\\sqrt{\\frac32},\\frac32\\right)$",
          "$(0,0)$",
          "$(\\pm1,1)$",
          "$\\left(\\pm\\sqrt2,2\\right)$",
        ],
        correctLetter: "A",
        hints: [
          "Minimize squared distance to avoid a square root.",
          "For a point $(x,x^2)$, use $D^2=x^2+(x^2-2)^2$.",
          "Differentiate and compare candidates.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write squared distance.",
            math: "D^2=x^2+(x^2-2)^2",
          },
          {
            step: 2,
            explanation: "Differentiate and solve.",
            math: "\\frac{d}{dx}D^2=2x+4x(x^2-2)=2x(2x^2-3)",
          },
          {
            step: 3,
            explanation: "The minimum occurs at $x=\\pm\\sqrt{3/2}$.",
            math: "y=x^2=\\frac32",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Among rectangles with area }16,\\text{ which dimensions minimize perimeter?}",
        difficulty: 3,
        skillTags: ["optimization", "perimeter_minimization"],
        choices: ["$4\\text{ by }4$", "$2\\text{ by }8$", "$1\\text{ by }16$", "$3\\text{ by }\\frac{16}{3}$"],
        correctLetter: "A",
        hints: [
          "Let one side be $x$ and the other be $16/x$.",
          "Write perimeter as a function of $x$.",
          "Differentiate and solve for the critical point.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write the perimeter function.",
            math: "P(x)=2x+\\frac{32}{x}",
          },
          {
            step: 2,
            explanation: "Differentiate and solve.",
            math: "P'(x)=2-\\frac{32}{x^2}=0\\Rightarrow x=4",
          },
          {
            step: 3,
            explanation: "The other side is $16/4=4$.",
            math: "4\\text{ by }4",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Squares of side }x\\text{ are cut from each corner of a }12\\text{ by }20\\text{ sheet, and the sides are folded up to form an open-top box.}",
      difficulty: 5,
      skillTags: ["optimization", "open_box", "endpoint_analysis"],
      figure: openBoxFigure,
      parts: [
        { letter: "a", promptMarkdown: "Write the volume $V(x)$ and state its domain.", points: 2 },
        { letter: "b", promptMarkdown: "Find the value of $x$ that maximizes the volume.", points: 3 },
        { letter: "c", promptMarkdown: "Justify that your value gives an absolute maximum.", points: 1 },
      ],
      hints: [
        "The base dimensions are $12-2x$ and $20-2x$.",
        "The domain is controlled by the smaller side.",
        "Use the derivative and reject the critical point outside the domain.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Writes $V=x(12-2x)(20-2x)$." },
          { part: "a", points: 1, description: "States domain $0<x<6$." },
          { part: "b", points: 1, description: "Computes derivative correctly." },
          { part: "b", points: 1, description: "Solves the resulting quadratic." },
          { part: "b", points: 1, description: "Chooses the feasible critical point." },
          { part: "c", points: 1, description: "Justifies maximum using endpoint behavior or sign change." },
        ],
      },
      commonErrors: [
        "Using $12-x$ and $20-x$ instead of subtracting $2x$.",
        "Accepting the critical point outside the domain.",
        "Forgetting to justify that the critical point gives a maximum.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$V(x)=x(12-2x)(20-2x)$, with $0<x<6$ because the shorter side $12-2x$ must be positive.",
        },
        {
          part: "b",
          explanation:
            "Expanding gives $V=240x-64x^2+4x^3$, so $V'=240-128x+12x^2=4(3x^2-32x+60)$. Solving $3x^2-32x+60=0$ gives $x=\\frac{16\\pm2\\sqrt{19}}{3}$. Only $x=\\frac{16-2\\sqrt{19}}{3}$ lies in $(0,6)$.",
        },
        {
          part: "c",
          explanation:
            "As $x\\to0^+$ or $x\\to6^-$, the volume approaches $0$. The feasible interior critical point therefore gives the absolute maximum volume.",
        },
      ],
    },
  },
  {
    topicCode: "5.12",
    title: "Exploring Behaviors of Implicit Relations",
    subtopic:
      "Using implicit derivatives to analyze slopes, tangent behavior, and extrema on relations",
    mc: [
      {
        questionLatex:
          "\\text{For the relation }x^2+y^2=25,\\text{ what is }\\frac{dy}{dx}\\text{ at }(3,4)?",
        difficulty: 2,
        skillTags: ["implicit_derivative", "slope"],
        choices: ["$-\\frac34$", "$\\frac34$", "$-\\frac43$", "$\\frac43$"],
        correctLetter: "A",
        hints: [
          "Differentiate both sides with respect to $x$.",
          "Remember that $d(y^2)/dx=2y\\,dy/dx$.",
          "Substitute $(3,4)$ after solving for $dy/dx$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate implicitly.",
            math: "2x+2y\\frac{dy}{dx}=0",
          },
          {
            step: 2,
            explanation: "Solve and substitute.",
            math: "\\frac{dy}{dx}=-\\frac{x}{y}\\Rightarrow -\\frac34",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x^2+xy+y^2=7,\\text{ where does the relation have horizontal tangents?}",
        difficulty: 4,
        skillTags: ["implicit_derivative", "horizontal_tangent"],
        choices: [
          "$\\left(\\pm\\sqrt{\\frac73},\\mp2\\sqrt{\\frac73}\\right)$",
          "$\\left(\\pm\\sqrt{\\frac73},\\pm2\\sqrt{\\frac73}\\right)$",
          "$\\left(0,\\pm\\sqrt7\\right)$",
          "$\\left(\\pm\\sqrt7,0\\right)$",
        ],
        correctLetter: "A",
        hints: [
          "A horizontal tangent has $dy/dx=0$.",
          "For this relation, $dy/dx=-(2x+y)/(x+2y)$.",
          "Set the numerator equal to zero and substitute into the relation.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the implicit derivative.",
            math: "\\frac{dy}{dx}=-\\frac{2x+y}{x+2y}",
          },
          {
            step: 2,
            explanation: "Horizontal tangents occur when $2x+y=0$, so $y=-2x$.",
            math: "x^2+x(-2x)+(-2x)^2=7\\Rightarrow 3x^2=7",
          },
          {
            step: 3,
            explanation: "The points are found by pairing $y=-2x$.",
            math: "\\left(\\pm\\sqrt{\\frac73},\\mp2\\sqrt{\\frac73}\\right)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x^2+xy+y^2=7,\\text{ where does the relation have vertical tangents?}",
        difficulty: 4,
        skillTags: ["implicit_derivative", "vertical_tangent"],
        choices: [
          "$\\left(\\mp2\\sqrt{\\frac73},\\pm\\sqrt{\\frac73}\\right)$",
          "$\\left(\\pm\\sqrt{\\frac73},\\mp2\\sqrt{\\frac73}\\right)$",
          "$\\left(0,\\pm\\sqrt7\\right)$",
          "$\\left(\\pm\\sqrt7,0\\right)$",
        ],
        correctLetter: "A",
        hints: [
          "A vertical tangent occurs when the denominator of $dy/dx$ is zero while the numerator is not.",
          "Use $x+2y=0$.",
          "Substitute $x=-2y$ into the relation.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the denominator of the implicit derivative.",
            math: "x+2y=0\\Rightarrow x=-2y",
          },
          {
            step: 2,
            explanation: "Substitute into the relation.",
            math: "(-2y)^2+(-2y)y+y^2=7\\Rightarrow 3y^2=7",
          },
          {
            step: 3,
            explanation: "Pair each $y$ with $x=-2y$.",
            math: "\\left(\\mp2\\sqrt{\\frac73},\\pm\\sqrt{\\frac73}\\right)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x^2+4y^2=16,\\text{ at which points is the tangent slope }-1?",
        difficulty: 4,
        skillTags: ["implicit_derivative", "slope_condition"],
        choices: [
          "$\\left(\\pm\\frac8{\\sqrt5},\\pm\\frac2{\\sqrt5}\\right)$ with matching signs",
          "$\\left(\\pm\\frac8{\\sqrt5},\\mp\\frac2{\\sqrt5}\\right)$",
          "$(0,\\pm2)$",
          "$(\\pm4,0)$",
        ],
        correctLetter: "A",
        hints: [
          "Differentiate to get $dy/dx=-x/(4y)$.",
          "Set $-x/(4y)=-1$.",
          "Substitute $x=4y$ into the ellipse.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find and set the slope.",
            math: "\\frac{dy}{dx}=-\\frac{x}{4y}=-1\\Rightarrow x=4y",
          },
          {
            step: 2,
            explanation: "Substitute into the relation.",
            math: "(4y)^2+4y^2=16\\Rightarrow 20y^2=16\\Rightarrow y=\\pm\\frac2{\\sqrt5}",
          },
          {
            step: 3,
            explanation: "Then $x=4y$ has the same sign.",
            math: "\\left(\\pm\\frac8{\\sqrt5},\\pm\\frac2{\\sqrt5}\\right)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x^2+y^2=25,\\text{ which point has a horizontal tangent?}",
        difficulty: 2,
        skillTags: ["implicit_derivative", "horizontal_tangent"],
        choices: ["$(0,5)$", "$(3,4)$", "$(5,0)$", "$(4,3)$"],
        correctLetter: "A",
        hints: [
          "The slope is $dy/dx=-x/y$.",
          "A horizontal tangent has slope $0$.",
          "That requires $x=0$ and $y\\ne0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the derivative of the circle.",
            math: "\\frac{dy}{dx}=-\\frac{x}{y}",
          },
          {
            step: 2,
            explanation: "At $(0,5)$, the slope is $0$.",
            math: "-\\frac05=0",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Consider the implicit relation }x^2+xy+y^2=7.",
      difficulty: 5,
      skillTags: ["implicit_derivative", "horizontal_vertical_tangents", "relation_behavior"],
      parts: [
        { letter: "a", promptMarkdown: "Find $\\frac{dy}{dx}$ in terms of $x$ and $y$.", points: 2 },
        { letter: "b", promptMarkdown: "Find the slope of the tangent line at $(1,2)$.", points: 1 },
        { letter: "c", promptMarkdown: "Find the points on the relation where the tangent is horizontal.", points: 2 },
        { letter: "d", promptMarkdown: "Find the points on the relation where the tangent is vertical.", points: 2 },
      ],
      hints: [
        "Differentiate $xy$ using the product rule.",
        "Horizontal means numerator zero; vertical means denominator zero.",
        "Substitute the resulting line relation back into $x^2+xy+y^2=7$.",
      ],
      rubric: {
        maxPoints: 7,
        criteria: [
          { part: "a", points: 1, description: "Differentiates implicitly including product rule on $xy$." },
          { part: "a", points: 1, description: "Solves for $dy/dx$ correctly." },
          { part: "b", points: 1, description: "Evaluates slope at $(1,2)$ as $-4/5$." },
          { part: "c", points: 1, description: "Uses $2x+y=0$ for horizontal tangents." },
          { part: "c", points: 1, description: "Finds both horizontal-tangent points." },
          { part: "d", points: 1, description: "Uses $x+2y=0$ for vertical tangents." },
          { part: "d", points: 1, description: "Finds both vertical-tangent points." },
        ],
      },
      commonErrors: [
        "Differentiating $xy$ as only $y$ or only $x y'$.",
        "Swapping horizontal and vertical tangent conditions.",
        "Finding one point but missing the symmetric partner.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Differentiate: $2x+(x y'+y)+2y y'=0$. Group terms with $y'$: $(x+2y)y'=-(2x+y)$, so $\\frac{dy}{dx}=-\\frac{2x+y}{x+2y}$.",
        },
        {
          part: "b",
          explanation:
            "At $(1,2)$, $\\frac{dy}{dx}=-\\frac{2(1)+2}{1+2(2)}=-\\frac45$.",
        },
        {
          part: "c",
          explanation:
            "Horizontal tangents occur when $2x+y=0$ and $x+2y\\ne0$. With $y=-2x$, the relation becomes $x^2-2x^2+4x^2=7$, so $3x^2=7$. The points are $\\left(\\sqrt{7/3},-2\\sqrt{7/3}\\right)$ and $\\left(-\\sqrt{7/3},2\\sqrt{7/3}\\right)$.",
        },
        {
          part: "d",
          explanation:
            "Vertical tangents occur when $x+2y=0$ and $2x+y\\ne0$. With $x=-2y$, the relation becomes $4y^2-2y^2+y^2=7$, so $3y^2=7$. The points are $\\left(-2\\sqrt{7/3},\\sqrt{7/3}\\right)$ and $\\left(2\\sqrt{7/3},-\\sqrt{7/3}\\right)$.",
        },
      ],
    },
  },
];

export const analyticalApplicationTopics: Topic[] = topicSeeds.map(makeTopic);
