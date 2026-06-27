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

const COURSE = "cbse-math-11";
const UNIT = "u4-calculus-xi";
const VERSION = "0.1.3";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

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
  rationales: Partial<Record<McLetter, string>>;
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, _index: number): Difficulty {
  return seedDifficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, _type: ResponseType): Difficulty {
  return seedDifficulty;
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the limit or derivative condition before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_class11_calculus_reasoning",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_substitution_or_derivative_rule_without_checking_the_expression",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_result_without_showing_the_limit_or_derivative_work",
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

function singlePart(letter: string, promptMarkdown: string, points: number): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(part: string, points: number, description: string): FrqRubric {
  return {
    maxPoints: points,
    criteria: [{ part, points, description }],
  };
}

function makeTopic(seed: TopicSeed): Topic {
  return {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
    items: [
      ...seed.mc.map((item, index) => makeMc(seed, item, index)),
      ...seed.constructed.map((item, index) => makeConstructed(seed, item, index)),
    ],
  };
}

const holeLimitFigure: ItemFigure = {
  type: "svg",
  title: "Limit graph with a removable break",
  description: "A smooth curve approaches the same height from both sides near x = 2, while the point at x = 2 is separately marked lower.",
  svg: `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="340" fill="#ffffff"/>
  <line x1="70" y1="270" x2="500" y2="270" stroke="#64748b" stroke-width="2"/>
  <line x1="130" y1="45" x2="130" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M500 270 L488 264 M500 270 L488 276" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M130 45 L124 57 M130 45 L136 57" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M90 245 C150 220 190 190 230 150 C270 110 315 92 370 88 C420 85 455 96 488 120" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="230" cy="150" r="9" fill="#ffffff" stroke="#2563eb" stroke-width="4"/>
  <circle cx="230" cy="235" r="7" fill="#f97316"/>
  <line x1="230" y1="270" x2="230" y2="150" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <line x1="130" y1="150" x2="230" y2="150" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="218" y="292" font-size="15" fill="#475569" font-family="Arial, sans-serif">2</text>
  <text x="238" y="241" font-size="15" fill="#9a3412" font-family="Arial, sans-serif">f(2)</text>
  <text x="506" y="275" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="138" y="48" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const tangentSecantFigure: ItemFigure = {
  type: "svg",
  title: "Secant approaching tangent",
  description: "A curve has a point P and a nearby point Q, with a secant line and tangent direction shown.",
  svg: `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="340" fill="#ffffff"/>
  <line x1="70" y1="270" x2="500" y2="270" stroke="#64748b" stroke-width="2"/>
  <line x1="120" y1="50" x2="120" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M88 255 C150 235 200 210 250 165 C300 120 355 94 460 80" fill="none" stroke="#2563eb" stroke-width="4"/>
  <line x1="150" y1="228" x2="410" y2="104" stroke="#f97316" stroke-width="3" stroke-dasharray="8 6"/>
  <line x1="170" y1="230" x2="345" y2="130" stroke="#16a34a" stroke-width="4"/>
  <circle cx="220" cy="190" r="8" fill="#1d4ed8"/>
  <circle cx="330" cy="125" r="8" fill="#f97316"/>
  <text x="198" y="184" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">P</text>
  <text x="340" y="121" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">Q</text>
  <text x="350" y="151" font-size="15" fill="#15803d" font-family="Arial, sans-serif">tangent direction</text>
  <text x="506" y="275" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="128" y="52" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const distanceTimeFigure: ItemFigure = {
  type: "svg",
  title: "Distance-time data near an instant",
  description: "A distance-time graph marks two times around t = 3 seconds for estimating an average rate.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <line x1="70" y1="300" x2="500" y2="300" stroke="#64748b" stroke-width="2"/>
  <line x1="95" y1="45" x2="95" y2="320" stroke="#64748b" stroke-width="2"/>
  <path d="M95 300 C160 280 230 238 300 178 C365 122 420 86 485 70" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="260" cy="208" r="7" fill="#f97316"/>
  <circle cx="340" cy="142" r="7" fill="#f97316"/>
  <line x1="260" y1="300" x2="260" y2="208" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <line x1="340" y1="300" x2="340" y2="142" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="245" y="324" font-size="15" fill="#475569" font-family="Arial, sans-serif">2</text>
  <text x="326" y="324" font-size="15" fill="#475569" font-family="Arial, sans-serif">4</text>
  <text x="260" y="196" font-size="15" fill="#9a3412" font-family="Arial, sans-serif">A</text>
  <text x="350" y="143" font-size="15" fill="#9a3412" font-family="Arial, sans-serif">B</text>
  <text x="504" y="305" font-size="15" fill="#475569" font-family="Arial, sans-serif">t</text>
  <text x="102" y="48" font-size="15" fill="#475569" font-family="Arial, sans-serif">s</text>
</svg>`,
};

const trigLimitFigure: ItemFigure = {
  type: "svg",
  title: "Small angle arc and chord",
  description: "A unit-circle sector shows a small angle x, its chord, and a tangent segment for comparing small-angle ratios.",
  svg: `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="340" fill="#ffffff"/>
  <line x1="120" y1="250" x2="470" y2="250" stroke="#64748b" stroke-width="2"/>
  <line x1="120" y1="250" x2="120" y2="50" stroke="#64748b" stroke-width="2"/>
  <path d="M120 250 A150 150 0 0 1 385 154" fill="none" stroke="#2563eb" stroke-width="4"/>
  <line x1="120" y1="250" x2="385" y2="154" stroke="#16a34a" stroke-width="3"/>
  <line x1="385" y1="154" x2="385" y2="250" stroke="#f97316" stroke-width="3"/>
  <path d="M160 250 A40 40 0 0 1 155 226" fill="none" stroke="#f97316" stroke-width="3"/>
  <text x="166" y="236" font-size="17" fill="#9a3412" font-family="Arial, sans-serif">x</text>
  <text x="260" y="188" font-size="15" fill="#15803d" font-family="Arial, sans-serif">chord</text>
  <text x="395" y="202" font-size="15" fill="#9a3412" font-family="Arial, sans-serif">height</text>
  <text x="104" y="270" font-size="15" fill="#475569" font-family="Arial, sans-serif">O</text>
</svg>`,
};

const quotientRuleFigure: ItemFigure = {
  type: "svg",
  title: "Quotient model with changing output",
  description: "A schematic input x feeds two simpler functions u and v before forming the quotient u over v.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <rect x="70" y="98" width="70" height="48" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <rect x="210" y="55" width="105" height="48" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <rect x="210" y="150" width="105" height="48" rx="6" fill="#fff7ed" stroke="#f97316" stroke-width="2"/>
  <rect x="390" y="98" width="105" height="48" rx="6" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <line x1="140" y1="122" x2="210" y2="79" stroke="#64748b" stroke-width="2"/>
  <line x1="140" y1="122" x2="210" y2="174" stroke="#64748b" stroke-width="2"/>
  <line x1="315" y1="79" x2="390" y2="122" stroke="#64748b" stroke-width="2"/>
  <line x1="315" y1="174" x2="390" y2="122" stroke="#64748b" stroke-width="2"/>
  <text x="97" y="128" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">x</text>
  <text x="238" y="85" font-size="17" fill="#15803d" font-family="Arial, sans-serif">u(x)</text>
  <text x="238" y="180" font-size="17" fill="#9a3412" font-family="Arial, sans-serif">v(x)</text>
  <text x="416" y="128" font-size="17" fill="#0f172a" font-family="Arial, sans-serif">u(x)/v(x)</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Limits: Meaning and Algebraic Evaluation",
    subtopic: "Intuitive limits and algebraic limits of polynomials and rational functions",
    mc: [
      {
        questionLatex: L`\text{From the graph, which statement is best supported near }x=2?`,
        difficulty: 3,
        skillTags: ["limits", "graphical_limit", "removable_break"],
        figure: holeLimitFigure,
        choices: [
          "$\\lim_{x\\to2} f(x)$ is the open-circle height, even though $f(2)$ is different",
          "$\\lim_{x\\to2} f(x)=f(2)$ because the point at $x=2$ is filled",
          "$\\lim_{x\\to2} f(x)$ does not exist because $f(2)$ is not on the curve",
          "$\\lim_{x\\to2} f(x)=2$ because the input approaches 2",
        ],
        correctLetter: "A",
        rationales: {
          B: "A limit depends on nearby values, not necessarily the value exactly at the input.",
          C: "A removable break does not prevent the limit if both sides approach the same height.",
          D: "This confuses the input being approached with the output value being approached.",
        },
        hints: ["Focus on the height approached by the blue curve.", "The filled orange point shows $f(2)$, not automatically the limit.", "Compare left-hand and right-hand behaviour."],
        solution: [{ step: 1, explanation: "The curve approaches the open-circle height from both sides, while the filled value at $x=2$ is lower.", math: "\\lim_{x\\to2} f(x)\\ne f(2)" }],
      },
      {
        questionLatex: L`\lim_{x\to3}(2x^2-5x+4)\text{ equals}`,
        difficulty: 2,
        skillTags: ["limits", "polynomial_limit", "direct_substitution"],
        choices: ["$7$", "$13$", "$1$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "This comes from adding $2(3)^2+5(3)-4$ or losing the minus signs.",
          C: "This substitutes $x=1$ or combines coefficients before substituting.",
          D: "A polynomial limit is found by substitution; no factor is forcing zero here.",
        },
        hints: ["Polynomials are evaluated by direct substitution for limits.", "Put $x=3$ in every term.", "Compute $2(9)-15+4$."],
        solution: [{ step: 1, explanation: "Substitute $x=3$ directly.", math: "2(3)^2-5(3)+4=18-15+4=7" }],
      },
      {
        questionLatex: L`\lim_{x\to2}\frac{x^2-4}{x-2}\text{ equals}`,
        difficulty: 3,
        skillTags: ["limits", "rational_limit", "factorisation"],
        choices: ["$4$", "$0$", "$2$", "$\\text{does not exist}$"],
        correctLetter: "A",
        rationales: {
          B: "Substituting before simplification gives $0/0$, not the final limit.",
          C: "This keeps only one factor or cancels incorrectly.",
          D: "The expression is undefined at $x=2$, but the nearby simplified values can still approach a limit.",
        },
        hints: ["Factor the numerator.", "Cancel only the common factor for $x\\ne2$.", "Evaluate the simplified expression at $x=2$."],
        solution: [{ step: 1, explanation: "For $x\\ne2$, factor and cancel.", math: "\\frac{x^2-4}{x-2}=\\frac{(x-2)(x+2)}{x-2}=x+2\\Rightarrow 4" }],
      },
      {
        questionLatex: L`\text{Assertion (A): }\lim_{x\to1}\frac{x^3-1}{x-1}=3.\text{ Reason (R): }x^3-1=(x-1)(x^2+x+1).`,
        difficulty: 3,
        skillTags: ["limits", "assertion_reason", "factorisation"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The factorisation is exactly what allows cancellation and then substitution.",
          C: "The stated factorisation of difference of cubes is correct.",
          D: "After cancellation, the limit is $1^2+1+1=3$, so A is true.",
        },
        hints: ["Use the difference-of-cubes identity.", "Cancel the common factor for $x\\ne1$.", "Check whether the reason gives the method."],
        solution: [{ step: 1, explanation: "The reason is true and it justifies cancelling $x-1$ before evaluating.", math: "\\lim_{x\\to1}(x^2+x+1)=3" }],
      },
      {
        questionLatex: L`\text{A student claims }\lim_{x\to4}\frac{\sqrt{x}-2}{x-4}\text{ cannot be found because substitution gives }0/0.\text{ What is the best correction?}`,
        difficulty: 4,
        skillTags: ["limits", "rationalisation", "error_analysis"],
        choices: [
          "Rationalise the numerator; the limit is $\\frac14$.",
          "Cancel $\\sqrt{x}$ with $x$; the limit is $1$.",
          "Since the expression is undefined at $x=4$, the limit does not exist.",
          "Replace $\\sqrt{x}$ by $x$ near 4; the limit is $\\frac12$.",
        ],
        correctLetter: "A",
        rationales: {
          B: "There is no valid cancellation between $\\sqrt{x}$ and $x$.",
          C: "Undefined value at the point does not by itself destroy a limit.",
          D: "Approximating by replacing $\\sqrt{x}$ with $x$ changes the expression.",
        },
        hints: ["Multiply by the conjugate.", "Use $(\\sqrt{x}-2)(\\sqrt{x}+2)=x-4$.", "Evaluate the simplified denominator at $x=4$."],
        solution: [{ step: 1, explanation: "Rationalising gives a removable factor.", math: "\\frac{\\sqrt{x}-2}{x-4}\\cdot\\frac{\\sqrt{x}+2}{\\sqrt{x}+2}=\\frac{1}{\\sqrt{x}+2}\\Rightarrow \\frac14" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Evaluate }\lim_{x\to-2}(x^2+3x-1).`,
        difficulty: 2,
        skillTags: ["limits", "polynomial_limit"],
        parts: singlePart("a", "Find the limit.", 2),
        hints: ["A polynomial limit allows direct substitution.", "Substitute $x=-2$.", "Compute $4-6-1$."],
        rubric: singleRubric("a", 2, "Finds the value $-3$ by substitution."),
        commonErrors: ["Dropping the negative sign in $3(-2)$.", "Writing $4+6-1$."],
        workedSolution: [{ part: "a", explanation: "$(-2)^2+3(-2)-1=4-6-1=-3$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Evaluate }\lim_{x\to5}\frac{x^2-25}{x-5}.`,
        difficulty: 2,
        skillTags: ["limits", "factorisation"],
        parts: singlePart("a", "Simplify before evaluating.", 2),
        hints: ["Factor $x^2-25$.", "Cancel $x-5$ for $x\\ne5$.", "Substitute $x=5$ in the remaining factor."],
        rubric: singleRubric("a", 2, "Finds the limit $10$ after factorisation."),
        commonErrors: ["Stopping at $0/0$.", "Cancelling to get $x-5$ instead of $x+5$."],
        workedSolution: [{ part: "a", explanation: "$x^2-25=(x-5)(x+5)$, so the limit is $\\lim_{x\\to5}(x+5)=10$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Evaluate }\lim_{x\to1}\frac{x^2+2x-3}{x^2-1}.`,
        difficulty: 3,
        skillTags: ["limits", "rational_limit", "factorisation"],
        parts: singlePart("a", "Show the factorisation and final value.", 3),
        hints: ["Factor numerator and denominator.", "Cancel the common factor.", "Then substitute $x=1$."],
        rubric: singleRubric("a", 3, "Factors correctly, cancels $x-1$, and obtains $2$."),
        commonErrors: ["Cancelling terms instead of factors.", "Forgetting the denominator factor $x+1$."],
        workedSolution: [{ part: "a", explanation: "$x^2+2x-3=(x-1)(x+3)$ and $x^2-1=(x-1)(x+1)$. Hence the limit is $\\frac{1+3}{1+1}=2$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A school club models the cost difference between two printing plans by }D(x)=\frac{x^2-9}{x-3}\text{ rupees per copy, where }x\text{ is near }3.`,
        difficulty: 4,
        skillTags: ["limits", "application", "removable_break"],
        parts: [
          { letter: "a", promptMarkdown: "Explain why direct substitution at $x=3$ is not enough.", points: 1 },
          { letter: "b", promptMarkdown: "Simplify $D(x)$ for $x\\ne3$.", points: 2 },
          { letter: "c", promptMarkdown: "Find the limiting cost difference as $x\\to3$.", points: 2 },
        ],
        hints: ["Check the form obtained by direct substitution.", "Factor $x^2-9$.", "Use the simplified expression only for nearby $x\\ne3$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies the indeterminate form $0/0$." },
            { part: "b", points: 2, description: "Factors and simplifies to $x+3$ for $x\\ne3$." },
            { part: "c", points: 2, description: "Evaluates the limit as $6$ rupees per copy." },
          ],
        },
        commonErrors: ["Saying the limit does not exist just because the formula is undefined at 3.", "Cancelling $x$ terms instead of the factor $x-3$."],
        workedSolution: [
          { part: "a", explanation: "Direct substitution gives $0/0$, so the expression must be simplified before evaluating the limit." },
          { part: "b", explanation: "$D(x)=\\frac{(x-3)(x+3)}{x-3}=x+3$ for $x\\ne3$." },
          { part: "c", explanation: "Therefore $\\lim_{x\\to3}D(x)=3+3=6$ rupees per copy." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{Let }g(x)=\frac{x^2-4x}{x}\text{ for }x\ne0.\text{ Study the limiting value of }g(x)\text{ as }x\text{ approaches }0.`,
        difficulty: 4,
        skillTags: ["limits", "case_based", "interpretation"],
        parts: [
          { letter: "a", promptMarkdown: "Simplify $g(x)$ for $x\\ne0$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\lim_{x\\to0}g(x)$.", points: 1 },
          { letter: "c", promptMarkdown: "Explain in one sentence why the limit can exist even though $g(0)$ is not defined.", points: 2 },
        ],
        hints: ["Factor $x$ from the numerator.", "Cancel only because nearby values have $x\\ne0$.", "A limit tracks nearby behaviour."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Simplifies to $x-4$ for $x\\ne0$." },
            { part: "b", points: 1, description: "Finds the limit $-4$." },
            { part: "c", points: 2, description: "Explains that the limit uses values arbitrarily close to 0, not the value at 0 itself." },
          ],
        },
        commonErrors: ["Cancelling to get $x^2-4$.", "Saying undefined at 0 means no nearby limiting value."],
        workedSolution: [
          { part: "a", explanation: "$g(x)=\\frac{x(x-4)}{x}=x-4$ for $x\\ne0$." },
          { part: "b", explanation: "$\\lim_{x\\to0}g(x)=\\lim_{x\\to0}(x-4)=-4$." },
          { part: "c", explanation: "The limit depends on the values as $x$ approaches 0, and those nearby values follow $x-4$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Limits of Trigonometric, Exponential and Logarithmic Functions",
    subtopic: "Standard limits and simple transformations within the Class 11 scope",
    mc: [
      {
        questionLatex: L`\lim_{x\to0}\frac{\sin 5x}{x}\text{ equals}`,
        difficulty: 3,
        skillTags: ["limits", "trigonometric_limit", "standard_limit"],
        choices: ["$5$", "$1$", "$0$", "$\\frac15$"],
        correctLetter: "A",
        rationales: {
          B: "The standard limit is for $\\frac{\\sin u}{u}$; here the denominator is $x$, not $5x$.",
          C: "Both numerator and denominator approach zero; the ratio has a finite limiting value.",
          D: "This inverts the factor $5$ introduced in the angle.",
        },
        hints: ["Let $u=5x$ only as an algebraic rewrite.", "Write $\\frac{\\sin5x}{x}=5\\cdot\\frac{\\sin5x}{5x}$.", "Use $\\lim_{u\\to0}\\frac{\\sin u}{u}=1$."],
        solution: [{ step: 1, explanation: "Multiply and divide by 5.", math: "\\lim_{x\\to0}\\frac{\\sin5x}{x}=5\\lim_{x\\to0}\\frac{\\sin5x}{5x}=5" }],
      },
      {
        questionLatex: L`\lim_{x\to0}\frac{1-\cos x}{x}\text{ equals}`,
        difficulty: 3,
        skillTags: ["limits", "trigonometric_limit", "identity"],
        choices: ["$0$", "$1$", "$\\frac12$", "$\\text{does not exist}$"],
        correctLetter: "A",
        rationales: {
          B: "This confuses the expression with $\\frac{\\sin x}{x}$.",
          C: "The value $\\frac12$ belongs to $\\lim_{x\\to0}\\frac{1-\\cos x}{x^2}$, not this ratio.",
          D: "The two-sided limit exists and equals zero.",
        },
        hints: ["Use $1-\\cos x=2\\sin^2\\frac{x}{2}$.", "Separate one factor as $\\frac{\\sin(x/2)}{x/2}$.", "A remaining sine factor approaches 0."],
        solution: [{ step: 1, explanation: "Since $1-\\cos x=2\\sin^2(x/2)$, the expression is $\\sin(x/2)\\cdot\\frac{\\sin(x/2)}{x/2}$, whose limit is $0\\cdot1$.", math: "0" }],
      },
      {
        questionLatex: L`\lim_{x\to0}\frac{e^x-1}{x}\text{ equals}`,
        difficulty: 2,
        skillTags: ["limits", "exponential_limit", "standard_limit"],
        choices: ["$1$", "$e$", "$0$", "$\\text{does not exist}$"],
        correctLetter: "A",
        rationales: {
          B: "The function $e^x$ approaches 1, but this quotient has the standard limiting slope 1.",
          C: "The quotient is $0/0$ before using the standard limit, not a zero limit.",
          D: "This is a standard exponential limit and exists.",
        },
        hints: ["Recall the standard exponential limit at 0.", "The numerator behaves like $x$ near 0.", "Use $\\lim_{x\\to0}\\frac{e^x-1}{x}=1$."],
        solution: [{ step: 1, explanation: "Using the standard exponential limit.", math: "\\lim_{x\\to0}\\frac{e^x-1}{x}=1" }],
      },
      {
        questionLatex: L`\lim_{x\to0}\frac{\log(1+3x)}{x}\text{ equals}`,
        difficulty: 3,
        skillTags: ["limits", "logarithmic_limit", "standard_limit"],
        choices: ["$3$", "$1$", "$0$", "$\\frac13$"],
        correctLetter: "A",
        rationales: {
          B: "The standard limit applies to $\\frac{\\log(1+u)}{u}$; here $u=3x$.",
          C: "The numerator and denominator both approach zero but their ratio approaches a nonzero value.",
          D: "This reverses the scale factor produced by $3x$.",
        },
        hints: ["Set $u=3x$ as a rewrite.", "Multiply by $3$ so the denominator matches $3x$.", "Use $\\lim_{u\\to0}\\frac{\\log(1+u)}{u}=1$."],
        solution: [{ step: 1, explanation: "Rewrite with $3x$ in the denominator.", math: "\\frac{\\log(1+3x)}{x}=3\\frac{\\log(1+3x)}{3x}\\Rightarrow 3" }],
      },
      {
        questionLatex: L`\text{Assertion (A): }\lim_{x\to0}\frac{\tan x}{x}=1.\text{ Reason (R): }\tan x=\frac{\sin x}{\cos x}\text{ and }\cos x\to1.`,
        difficulty: 3,
        skillTags: ["limits", "assertion_reason", "trigonometric_limit"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason connects $\\tan x/x$ to $(\\sin x/x)/\\cos x$, so it does explain the assertion.",
          C: "The identity and the cosine limit are both true.",
          D: "$\\tan x/x=(\\sin x/x)/\\cos x\\to1/1=1$, so the assertion is true.",
        },
        hints: ["Write $\\tan x/x$ using sine and cosine.", "Use the standard sine limit.", "Check whether the reason gives a complete path."],
        solution: [{ step: 1, explanation: "Using $\\tan x=\\frac{\\sin x}{\\cos x}$ gives the limit as $1/1$.", math: "\\lim_{x\\to0}\\frac{\\tan x}{x}=\\lim_{x\\to0}\\frac{\\sin x}{x}\\cdot\\frac{1}{\\cos x}=1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Evaluate }\lim_{x\to0}\frac{\sin 3x}{3x}.`,
        difficulty: 2,
        skillTags: ["limits", "trigonometric_limit"],
        parts: singlePart("a", "Find the limit.", 2),
        hints: ["Compare directly with $\\frac{\\sin u}{u}$.", "Here $u=3x$ approaches 0.", "Use the standard sine limit."],
        rubric: singleRubric("a", 2, "Finds the limit $1$."),
        commonErrors: ["Answering $3$ despite the denominator already being $3x$."],
        workedSolution: [{ part: "a", explanation: "As $x\\to0$, $3x\\to0$, so $\\lim_{x\\to0}\\frac{\\sin3x}{3x}=1$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Evaluate }\lim_{x\to0}\frac{e^{2x}-1}{2x}.`,
        difficulty: 2,
        skillTags: ["limits", "exponential_limit"],
        parts: singlePart("a", "Find the limit.", 2),
        hints: ["Compare with $\\frac{e^u-1}{u}$.", "Let the input expression be $u=2x$.", "As $x\\to0$, $u\\to0$."],
        rubric: singleRubric("a", 2, "Finds the limit $1$."),
        commonErrors: ["Writing $2$ although the denominator already matches $2x$."],
        workedSolution: [{ part: "a", explanation: "With $u=2x$, the expression is $\\frac{e^u-1}{u}$, so the limit is $1$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Evaluate }\lim_{x\to0}\frac{\sin 4x}{\sin 7x}.`,
        difficulty: 3,
        skillTags: ["limits", "trigonometric_limit", "ratio"],
        parts: singlePart("a", "Show how the standard sine limit is used.", 3),
        hints: ["Multiply and divide by $4x$ and $7x$ mentally.", "Use $\\sin ax\\sim ax$ near 0.", "The ratio should become $4/7$."],
        rubric: singleRubric("a", 3, "Uses the standard sine limit to obtain $\\frac47$."),
        commonErrors: ["Cancelling sine signs as if $\\sin4x/\\sin7x=4/7$ identically.", "Inverting the ratio."],
        workedSolution: [{ part: "a", explanation: "$\\frac{\\sin4x}{\\sin7x}=\\frac{\\sin4x}{4x}\\cdot\\frac{7x}{\\sin7x}\\cdot\\frac47$. The first two factors tend to $1$, so the limit is $\\frac47$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{Evaluate the limiting value of }R(x)=\frac{\log(1+5x)}{\sin 2x}\text{ as }x\to0.`,
        difficulty: 4,
        skillTags: ["limits", "logarithmic_limit", "trigonometric_limit", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Rewrite the quotient using standard limits.", points: 2 },
          { letter: "b", promptMarkdown: "Evaluate $\\lim_{x\\to0}R(x)$.", points: 2 },
          { letter: "c", promptMarkdown: "State why direct substitution is not the final method.", points: 1 },
        ],
        hints: ["Match $\\log(1+5x)$ with denominator $5x$.", "Match $\\sin2x$ with denominator $2x$.", "Take the ratio of the two limiting behaviours."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Expresses the quotient using $\\frac{\\log(1+5x)}{5x}$ and $\\frac{\\sin2x}{2x}$." },
            { part: "b", points: 2, description: "Obtains $\\frac52$." },
            { part: "c", points: 1, description: "Notes that direct substitution gives $0/0$." },
          ],
        },
        commonErrors: ["Using $5/2$ upside down.", "Treating $0/0$ as a zero limit."],
        workedSolution: [
          { part: "a", explanation: "$R(x)=\\frac{5x}{2x}\\cdot\\frac{\\log(1+5x)}{5x}\\cdot\\frac{2x}{\\sin2x}$." },
          { part: "b", explanation: "The standard-limit factors tend to $1$ and $1$, so the limit is $\\frac52$." },
          { part: "c", explanation: "Direct substitution gives $0/0$, so standard limits are needed to compare the rates." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{In a small-angle experiment, a unit-circle sector is used to compare chord height and arc angle }x\text{ in radians.}`,
        difficulty: 4,
        skillTags: ["limits", "case_based", "small_angle"],
        figure: trigLimitFigure,
        parts: [
          { letter: "a", promptMarkdown: "State the standard limit connecting $\\sin x$ and $x$ as $x\\to0$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\lim_{x\\to0}\\frac{\\tan x}{\\sin x}$.", points: 1 },
          { letter: "c", promptMarkdown: "Use the result to decide whether $\\tan x$ and $\\sin x$ are nearly equal for very small $x$.", points: 2 },
        ],
        hints: ["Use $\\lim \\sin x/x=1$.", "Write $\\tan x/\\sin x=1/\\cos x$.", "As $x$ approaches 0, $\\cos x$ approaches 1."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States $\\lim_{x\\to0}\\frac{\\sin x}{x}=1$." },
            { part: "b", points: 1, description: "Finds the limit $1$." },
            { part: "c", points: 2, description: "Concludes they are nearly equal for very small angles, with reasoning from the limit." },
          ],
        },
        commonErrors: ["Using degrees inside the standard radian limit.", "Saying the functions are exactly equal for all small nonzero $x$."],
        workedSolution: [
          { part: "a", explanation: "$\\lim_{x\\to0}\\frac{\\sin x}{x}=1$." },
          { part: "b", explanation: "$\\frac{\\tan x}{\\sin x}=\\frac{1}{\\cos x}$, so the limit is $1$." },
          { part: "c", explanation: "Since their ratio approaches $1$, $\\tan x$ and $\\sin x$ are close for very small radian angles, though not exactly equal for all nonzero $x$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Derivative from First Principles",
    subtopic: "Derivative as a limit and algebraic computation from the definition",
    mc: [
      {
        questionLatex: L`\text{Using first principles, the derivative of }f(x)=x^2\text{ is}`,
        difficulty: 3,
        skillTags: ["derivatives", "first_principles", "polynomial"],
        choices: ["$2x$", "$x$", "$x^2$", "$2$"],
        correctLetter: "A",
        rationales: {
          B: "This misses the second $x$ produced after expanding $(x+h)^2-x^2$.",
          C: "This repeats the original function instead of the rate of change.",
          D: "This is the derivative of $2x$, not of $x^2$.",
        },
        hints: ["Start with $\\frac{f(x+h)-f(x)}{h}$.", "Expand $(x+h)^2-x^2$.", "Cancel $h$ before taking $h\\to0$."],
        solution: [{ step: 1, explanation: "From the definition.", math: "\\frac{(x+h)^2-x^2}{h}=\\frac{2xh+h^2}{h}=2x+h\\to2x" }],
      },
      {
        questionLatex: L`\text{For }f(x)=3x+7,\text{ the difference quotient }\frac{f(x+h)-f(x)}{h}\text{ simplifies to}`,
        difficulty: 2,
        skillTags: ["derivatives", "difference_quotient", "linear_function"],
        choices: ["$3$", "$3h$", "$3x+7$", "$\\frac{3x+7}{h}$"],
        correctLetter: "A",
        rationales: {
          B: "The final division by $h$ cancels the factor $h$.",
          C: "This is the original function, not the difference quotient.",
          D: "The subtraction $f(x+h)-f(x)$ has not been performed.",
        },
        hints: ["Compute $f(x+h)=3x+3h+7$.", "Subtract $f(x)=3x+7$.", "Divide by $h$."],
        solution: [{ step: 1, explanation: "The numerator is $3h$.", math: "\\frac{3h}{h}=3" }],
      },
      {
        questionLatex: L`\text{Assertion (A): If }f(x)=x^2+1,\text{ then }f'(2)=4.\text{ Reason (R): }f'(a)=\lim_{h\to0}\frac{f(a+h)-f(a)}{h}.`,
        difficulty: 3,
        skillTags: ["derivatives", "assertion_reason", "first_principles"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is the definition used to compute the derivative at a point.",
          C: "The derivative definition at $a$ is correctly stated.",
          D: "$f'(x)=2x$, so $f'(2)=4$; the assertion is true.",
        },
        hints: ["Differentiate or apply the definition at $a=2$.", "Check the stated derivative definition.", "Decide whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "Using the definition gives the derivative at a point; here $f'(x)=2x$, so $f'(2)=4$.", math: "f'(2)=4" }],
      },
      {
        questionLatex: L`\text{If }f'(a)\text{ exists, which expression represents it from first principles?}`,
        difficulty: 2,
        skillTags: ["derivatives", "definition", "conceptual"],
        choices: [
          "$\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}$",
          "$\\lim_{h\\to0}\\frac{f(a+h)+f(a)}{h}$",
          "$\\lim_{h\\to a}\\frac{f(h)-f(a)}{h}$",
          "$\\frac{f(a+h)-f(a)}{h}$ with no limiting process",
        ],
        correctLetter: "A",
        rationales: {
          B: "The numerator must measure change in function value, so it uses subtraction.",
          C: "The increment approaches 0, not the point $a$.",
          D: "The derivative is the limiting value of difference quotients.",
        },
        hints: ["Derivative is a limit of average rates.", "The input increment is $h$.", "The change in output is $f(a+h)-f(a)$."],
        solution: [{ step: 1, explanation: "The first-principles definition at $a$ is the limit of the difference quotient.", math: "f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}" }],
      },
      {
        questionLatex: L`\text{A student computes }\frac{(x+h)^2-x^2}{h}=x+h.\text{ Which error is being made?}`,
        difficulty: 4,
        skillTags: ["derivatives", "error_analysis", "first_principles"],
        choices: [
          "The expansion missed the term $2xh$; the quotient should be $2x+h$.",
          "The expansion should be $x^2+h^2$, so the quotient is $h$.",
          "The derivative definition requires adding $x^2$ instead of subtracting it.",
          "The quotient should be evaluated by putting $h=0$ before simplifying.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The square $(x+h)^2$ includes the middle term $2xh$.",
          C: "The definition uses change, so subtraction is correct.",
          D: "Putting $h=0$ before simplification creates division by zero.",
        },
        hints: ["Expand the square carefully.", "Keep the middle term.", "Cancel a common factor $h$ only after simplifying the numerator."],
        solution: [{ step: 1, explanation: "The correct expansion is $(x+h)^2=x^2+2xh+h^2$.", math: "\\frac{2xh+h^2}{h}=2x+h" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find }f'(x)\text{ from first principles for }f(x)=5x-2.`,
        difficulty: 2,
        skillTags: ["derivatives", "first_principles", "linear_function"],
        parts: singlePart("a", "Use the difference quotient.", 2),
        hints: ["Find $f(x+h)$.", "Subtract $f(x)$.", "Divide by $h$ and take the limit."],
        rubric: singleRubric("a", 2, "Finds $f'(x)=5$ from the difference quotient."),
        commonErrors: ["Returning the original function.", "Forgetting to divide by $h$."],
        workedSolution: [{ part: "a", explanation: "$f(x+h)=5x+5h-2$, so $\\frac{f(x+h)-f(x)}h=\\frac{5h}{h}=5$. Hence $f'(x)=5$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Using first principles, find }f'(1)\text{ for }f(x)=x^2.`,
        difficulty: 2,
        skillTags: ["derivatives", "first_principles", "derivative_at_point"],
        parts: singlePart("a", "Find the derivative at $x=1$.", 2),
        hints: ["Use $f'(a)=\\lim_{h\\to0}\\frac{(a+h)^2-a^2}{h}$.", "Put $a=1$.", "Simplify before taking the limit."],
        rubric: singleRubric("a", 2, "Finds $f'(1)=2$."),
        commonErrors: ["Substituting $h=0$ before cancellation.", "Leaving the answer as $2+h$."],
        workedSolution: [{ part: "a", explanation: "$f'(1)=\\lim_{h\\to0}\\frac{(1+h)^2-1}{h}=\\lim_{h\\to0}(2+h)=2$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Derive }f'(x)\text{ from first principles for }f(x)=x^2+3x.`,
        difficulty: 3,
        skillTags: ["derivatives", "first_principles", "polynomial"],
        parts: singlePart("a", "Show the difference quotient and final derivative.", 3),
        hints: ["Write $f(x+h)$ fully.", "Subtract $x^2+3x$.", "After cancellation, take $h\\to0$."],
        rubric: singleRubric("a", 3, "Obtains $2x+3$ with valid first-principles work."),
        commonErrors: ["Forgetting the $3h$ term.", "Cancelling $h$ from terms where it is not a factor."],
        workedSolution: [{ part: "a", explanation: "$f(x+h)=(x+h)^2+3(x+h)=x^2+2xh+h^2+3x+3h$. The quotient is $\\frac{2xh+h^2+3h}{h}=2x+h+3$, so $f'(x)=2x+3$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{For }f(x)=x^2-4x,\text{ use the first-principles definition to study the tangent at }x=3.`,
        difficulty: 4,
        skillTags: ["derivatives", "first_principles", "tangent_slope"],
        parts: [
          { letter: "a", promptMarkdown: "Find $f'(x)$ from first principles.", points: 3 },
          { letter: "b", promptMarkdown: "Find the slope of the tangent at $x=3$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the point on the curve where $x=3$.", points: 1 },
        ],
        hints: ["Expand $f(x+h)$.", "Cancel the common factor $h$ in the numerator.", "Evaluate the derivative and function at $x=3$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 3, description: "Derives $f'(x)=2x-4$ from the definition." },
            { part: "b", points: 1, description: "Finds tangent slope $2$." },
            { part: "c", points: 1, description: "Finds the point $(3,-3)$." },
          ],
        },
        commonErrors: ["Using the point value $f(3)$ as the slope.", "Skipping the limit step after simplification."],
        workedSolution: [
          { part: "a", explanation: "$f(x+h)-f(x)=(x+h)^2-4(x+h)-(x^2-4x)=2xh+h^2-4h$. Dividing by $h$ gives $2x+h-4$, so $f'(x)=2x-4$." },
          { part: "b", explanation: "$f'(3)=6-4=2$." },
          { part: "c", explanation: "$f(3)=9-12=-3$, so the point is $(3,-3)$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A curve is inspected by drawing a secant through a fixed point }P\text{ and a nearby point }Q.\text{ As }Q\text{ moves toward }P,\text{ the secant approaches the tangent direction.}`,
        difficulty: 4,
        skillTags: ["derivatives", "case_based", "tangent_limit"],
        figure: tangentSecantFigure,
        parts: [
          { letter: "a", promptMarkdown: "Name the quantity represented by the slope of secant $PQ$.", points: 1 },
          { letter: "b", promptMarkdown: "Name the limiting quantity as $Q$ approaches $P$.", points: 1 },
          { letter: "c", promptMarkdown: "For $y=x^2$ at $x=2$, compute this limiting tangent slope.", points: 2 },
        ],
        hints: ["A secant slope is an average rate of change.", "A tangent slope is the derivative at the point.", "For $x^2$, use $f'(x)=2x$ or first principles."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies average rate of change." },
            { part: "b", points: 1, description: "Identifies derivative or instantaneous rate of change." },
            { part: "c", points: 2, description: "Finds tangent slope $4$ for $y=x^2$ at $x=2$." },
          ],
        },
        commonErrors: ["Treating the secant slope and tangent slope as always equal.", "Using $f(2)=4$ without identifying it as the slope only by derivative."],
        workedSolution: [
          { part: "a", explanation: "The secant slope represents average rate of change over the interval from $P$ to $Q$." },
          { part: "b", explanation: "The limiting slope is the derivative at $P$, also called the instantaneous rate of change." },
          { part: "c", explanation: "For $y=x^2$, $f'(x)=2x$, so at $x=2$ the tangent slope is $4$." },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Derivative as Rate of Change and Tangent Slope",
    subtopic: "Interpreting derivative values in motion and geometry contexts",
    mc: [
      {
        questionLatex: L`\text{If }s(t)=t^2+3t\text{ metres, then the instantaneous speed at }t=4\text{ seconds is}`,
        difficulty: 3,
        skillTags: ["derivatives", "rate_of_change", "motion"],
        choices: ["$11\\text{ m/s}$", "$28\\text{ m}$", "$8\\text{ m/s}$", "$19\\text{ m/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the position $s(4)$, not the instantaneous speed.",
          C: "This differentiates only $t^2$ and ignores the $3t$ term.",
          D: "This adds the derivative to the function value or mixes quantities.",
        },
        hints: ["Instantaneous speed is the derivative of position.", "Differentiate $t^2+3t$.", "Evaluate at $t=4$ with units."],
        solution: [{ step: 1, explanation: "Differentiate and evaluate.", math: "s'(t)=2t+3\\Rightarrow s'(4)=11\\text{ m/s}" }],
      },
      {
        questionLatex: L`\text{The slope of the tangent to }y=x^3-2x\text{ at }x=1\text{ is}`,
        difficulty: 3,
        skillTags: ["derivatives", "tangent_slope", "polynomial"],
        choices: ["$1$", "$-1$", "$3$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "This is the $y$-coordinate at $x=1$, not the tangent slope.",
          C: "This differentiates $x^3$ but ignores the derivative of $-2x$.",
          D: "The derivative value at $x=1$ is not zero.",
        },
        hints: ["Tangent slope equals $\\frac{dy}{dx}$.", "Differentiate $x^3-2x$.", "Substitute $x=1$."],
        solution: [{ step: 1, explanation: "$\\frac{dy}{dx}=3x^2-2$.", math: "3(1)^2-2=1" }],
      },
      {
        questionLatex: L`\text{For the distance-time graph, what type of rate is represented by the slope of chord }AB?`,
        difficulty: 2,
        skillTags: ["derivatives", "average_rate", "graphical_interpretation"],
        figure: distanceTimeFigure,
        choices: [
          "Average speed from $t=2$ to $t=4$",
          "Instantaneous speed exactly at $t=3$",
          "Total distance travelled by time $t=4$",
          "Acceleration at point $A$",
        ],
        correctLetter: "A",
        rationales: {
          B: "A chord through two points gives an average rate over an interval, not a single instant.",
          C: "Total distance is a function value, not the slope between two points.",
          D: "Acceleration would involve rate of change of velocity, not this distance chord alone.",
        },
        hints: ["A chord joining two graph points is a secant.", "Secant slope measures average change.", "Use the interval shown by the two marked times."],
        solution: [{ step: 1, explanation: "The chord is a secant line over $2\\le t\\le4$, so its slope is average speed over that interval.", math: "\\text{average speed on }[2,4]" }],
      },
      {
        questionLatex: L`\text{Assertion (A): The derivative at a point gives the slope of the tangent at that point. Reason (R): It is the limiting value of slopes of secants through nearby points.}`,
        difficulty: 3,
        skillTags: ["derivatives", "assertion_reason", "tangent_slope"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The secant-slope limiting process is precisely the geometric meaning of tangent slope.",
          C: "The reason correctly describes the derivative limit.",
          D: "The assertion is the standard geometric interpretation of derivative.",
        },
        hints: ["Connect secants to average rates.", "Let the second point move toward the first.", "That limiting slope is the tangent slope."],
        solution: [{ step: 1, explanation: "The derivative is defined as a limit of difference quotients, which are secant slopes.", math: "f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}h" }],
      },
      {
        questionLatex: L`\text{At }x=2,\text{ a curve has }y=7\text{ and }\frac{dy}{dx}=-3.\text{ Which interpretation is correct?}`,
        difficulty: 3,
        skillTags: ["derivatives", "interpretation", "tangent_slope"],
        choices: [
          "The tangent at the point has slope $-3$ and passes through $(2,7)$.",
          "The curve crosses the $x$-axis at $-3$.",
          "The value of the function at $x=2$ is $-3$.",
          "The tangent line must pass through the origin.",
        ],
        correctLetter: "A",
        rationales: {
          B: "A derivative value is a slope, not an $x$-intercept.",
          C: "The function value is given as $7$; $-3$ is the derivative.",
          D: "Nothing about the derivative or point forces the tangent through the origin.",
        },
        hints: ["Separate function value from derivative value.", "$y=7$ gives a point.", "$dy/dx=-3$ gives a slope."],
        solution: [{ step: 1, explanation: "The data mean the point is $(2,7)$ and the tangent slope there is $-3$.", math: "m_{\\text{tangent}}=-3" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{If }s(t)=4t^2\text{ metres, find the instantaneous speed at }t=3\text{ seconds.}`,
        difficulty: 2,
        skillTags: ["derivatives", "rate_of_change", "motion"],
        parts: singlePart("a", "Find the speed with unit.", 2),
        hints: ["Differentiate position to get speed.", "Find $s'(t)$.", "Substitute $t=3$."],
        rubric: singleRubric("a", 2, "Finds $24$ m/s."),
        commonErrors: ["Using $s(3)=36$ as speed.", "Omitting the unit."],
        workedSolution: [{ part: "a", explanation: "$s'(t)=8t$, so $s'(3)=24$ m/s." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the slope of the tangent to }y=x^2+2x\text{ at }x=-1.`,
        difficulty: 2,
        skillTags: ["derivatives", "tangent_slope"],
        parts: singlePart("a", "Give the tangent slope.", 2),
        hints: ["Differentiate $x^2+2x$.", "The derivative gives tangent slope.", "Evaluate at $x=-1$."],
        rubric: singleRubric("a", 2, "Finds slope $0$."),
        commonErrors: ["Using the function value instead of derivative.", "Writing $2x$ and forgetting the derivative of $2x$."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{dx}=2x+2$. At $x=-1$, the slope is $0$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{A particle's distance from a point is }s(t)=t^3-3t\text{ metres. Find its instantaneous rate of change at }t=2.`,
        difficulty: 3,
        skillTags: ["derivatives", "rate_of_change", "polynomial"],
        parts: singlePart("a", "Differentiate and evaluate.", 3),
        hints: ["Instantaneous rate means derivative.", "Find $s'(t)$.", "Substitute $t=2$ and include units."],
        rubric: singleRubric("a", 3, "Finds $9$ m/s with work."),
        commonErrors: ["Evaluating $s(2)$ instead of $s'(2)$.", "Differentiating $t^3$ as $3t$."],
        workedSolution: [{ part: "a", explanation: "$s'(t)=3t^2-3$, so $s'(2)=12-3=9$ m/s." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{For the curve }y=x^2-5x+6,\text{ answer the following about the tangent at }x=2.`,
        difficulty: 4,
        skillTags: ["derivatives", "tangent_slope", "line_equation"],
        parts: [
          { letter: "a", promptMarkdown: "Find the point on the curve at $x=2$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the slope of the tangent there.", points: 2 },
          { letter: "c", promptMarkdown: "Write the tangent line equation.", points: 2 },
        ],
        hints: ["Evaluate $y$ first.", "Differentiate to get the slope.", "Use point-slope form."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds point $(2,0)$." },
            { part: "b", points: 2, description: "Finds derivative $2x-5$ and slope $-1$." },
            { part: "c", points: 2, description: "Writes $y=-(x-2)$ or $y=-x+2$." },
          ],
        },
        commonErrors: ["Using the normal slope instead of tangent slope.", "Forgetting the point lies at $y=0$."],
        workedSolution: [
          { part: "a", explanation: "At $x=2$, $y=4-10+6=0$, so the point is $(2,0)$." },
          { part: "b", explanation: "$\\frac{dy}{dx}=2x-5$, so at $x=2$ the slope is $-1$." },
          { part: "c", explanation: "Using point-slope form, $y-0=-1(x-2)$, so $y=-x+2$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A toy car moves on a straight track. Its distance from the start after }t\text{ seconds is }s(t)=2t^2+t\text{ metres.}`,
        difficulty: 4,
        skillTags: ["derivatives", "case_based", "motion"],
        parts: [
          { letter: "a", promptMarkdown: "Find the average speed from $t=1$ to $t=3$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the instantaneous speed at $t=2$.", points: 1 },
          { letter: "c", promptMarkdown: "Compare the two values and explain why they are equal here.", points: 2 },
        ],
        hints: ["Average speed is $\\frac{s(3)-s(1)}{3-1}$.", "Instantaneous speed is $s'(2)$.", "For a quadratic, the symmetric average around $t=2$ matches the tangent slope at the midpoint."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds average speed $9$ m/s." },
            { part: "b", points: 1, description: "Finds instantaneous speed $9$ m/s." },
            { part: "c", points: 2, description: "Explains equality from the symmetric interval around $t=2$ and linear derivative $4t+1$." },
          ],
        },
        commonErrors: ["Comparing positions instead of speeds.", "Assuming average and instantaneous rates are always equal."],
        workedSolution: [
          { part: "a", explanation: "$s(3)=21$ and $s(1)=3$, so average speed is $\\frac{21-3}{2}=9$ m/s." },
          { part: "b", explanation: "$s'(t)=4t+1$, so $s'(2)=9$ m/s." },
          { part: "c", explanation: "They are equal because the interval $[1,3]$ is centred at $2$ and the derivative $4t+1$ is linear for this quadratic model." },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Derivative Rules for Polynomial and Trigonometric Functions",
    subtopic: "Sum, difference, product and quotient rules in the CBSE Class 11 derivative scope",
    mc: [
      {
        questionLatex: L`\frac{d}{dx}(x^4-3x^2+5)\text{ is}`,
        difficulty: 2,
        skillTags: ["derivatives", "polynomial_rule", "sum_difference"],
        choices: ["$4x^3-6x$", "$4x^3-3x$", "$x^3-6x$", "$4x^3-6x+5$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative of $-3x^2$ is $-6x$, not $-3x$.",
          C: "The power rule for $x^4$ gives $4x^3$, not $x^3$.",
          D: "The derivative of a constant is $0$.",
        },
        hints: ["Use the power rule term by term.", "Differentiate the constant as zero.", "Keep the coefficient $-3$."],
        solution: [{ step: 1, explanation: "Differentiate term by term.", math: "\\frac{d}{dx}(x^4-3x^2+5)=4x^3-6x" }],
      },
      {
        questionLatex: L`\frac{d}{dx}(\sin x+\cos x)\text{ is}`,
        difficulty: 2,
        skillTags: ["derivatives", "trigonometric_derivatives", "sum_rule"],
        choices: ["$\\cos x-\\sin x$", "$\\cos x+\\sin x$", "$-\\cos x+\\sin x$", "$\\sin x-\\cos x$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative of $\\cos x$ is $-\\sin x$, not $+\\sin x$.",
          C: "The derivative of $\\sin x$ is $\\cos x$, not $-\\cos x$.",
          D: "This keeps the original order without applying the derivative signs correctly.",
        },
        hints: ["Differentiate each trigonometric term.", "$\\frac{d}{dx}\\sin x=\\cos x$.", "$\\frac{d}{dx}\\cos x=-\\sin x$."],
        solution: [{ step: 1, explanation: "Apply the sum rule and basic trig derivatives.", math: "\\frac{d}{dx}(\\sin x+\\cos x)=\\cos x-\\sin x" }],
      },
      {
        questionLatex: L`\frac{d}{dx}(x^2\sin x)\text{ is}`,
        difficulty: 3,
        skillTags: ["derivatives", "product_rule", "trigonometric_derivatives"],
        choices: [
          "$2x\\sin x+x^2\\cos x$",
          "$2x\\cos x$",
          "$x^2\\cos x$",
          "$2x\\sin x-x^2\\cos x$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This differentiates both factors and multiplies the derivatives, which is not the product rule.",
          C: "This differentiates only $\\sin x$ and leaves out the derivative of $x^2$.",
          D: "The derivative of $\\sin x$ is $+\\cos x$, not $-\\cos x$.",
        },
        hints: ["Use $(uv)'=u'v+uv'$.", "Let $u=x^2$ and $v=\\sin x$.", "Differentiate both factors in separate terms."],
        solution: [{ step: 1, explanation: "Using the product rule.", math: "\\frac{d}{dx}(x^2\\sin x)=2x\\sin x+x^2\\cos x" }],
      },
      {
        questionLatex: L`\frac{d}{dx}\left(\frac{\sin x}{x}\right)\text{ is}`,
        difficulty: 4,
        skillTags: ["derivatives", "quotient_rule", "trigonometric_derivatives"],
        choices: [
          "$\\frac{x\\cos x-\\sin x}{x^2}$",
          "$\\frac{x\\sin x-\\cos x}{x^2}$",
          "$\\frac{\\cos x}{1}$",
          "$\\frac{x\\cos x+\\sin x}{x^2}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This swaps which function is differentiated in the numerator.",
          C: "This differentiates only the numerator and ignores the changing denominator.",
          D: "The quotient rule subtracts $uv'$, so the $\\sin x$ term is negative.",
        },
        hints: ["Use $(u/v)'=\\frac{vu'-uv'}{v^2}$.", "Let $u=\\sin x$ and $v=x$.", "Compute $x\\cos x-\\sin x$ in the numerator."],
        solution: [{ step: 1, explanation: "Apply the quotient rule.", math: "\\frac{d}{dx}\\left(\\frac{\\sin x}{x}\\right)=\\frac{x\\cos x-\\sin x}{x^2}" }],
      },
      {
        questionLatex: L`\text{Assertion (A): }\frac{d}{dx}(x\cos x)=\cos x-x\sin x.\text{ Reason (R): The product rule differentiates one factor at a time and adds the two results.}`,
        difficulty: 3,
        skillTags: ["derivatives", "assertion_reason", "product_rule"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The product rule is exactly the rule used to obtain the derivative.",
          C: "The product-rule description is correct.",
          D: "Using the product rule gives $1\\cdot\\cos x+x(-\\sin x)$, so the assertion is true.",
        },
        hints: ["Let $u=x$ and $v=\\cos x$.", "Use $u'v+uv'$.", "Check whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "The product rule gives the stated derivative.", math: "\\frac{d}{dx}(x\\cos x)=\\cos x-x\\sin x" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Differentiate }y=3x^3-2x+8.`,
        difficulty: 2,
        skillTags: ["derivatives", "polynomial_rule"],
        parts: singlePart("a", "Find $dy/dx$.", 2),
        hints: ["Use the power rule.", "The derivative of $-2x$ is $-2$.", "The constant differentiates to zero."],
        rubric: singleRubric("a", 2, "Finds $\\frac{dy}{dx}=9x^2-2$."),
        commonErrors: ["Keeping the constant 8.", "Differentiating $3x^3$ as $3x^2$."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{dx}=9x^2-2$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Differentiate }y=x\sin x.`,
        difficulty: 2,
        skillTags: ["derivatives", "product_rule", "trigonometric_derivatives"],
        parts: singlePart("a", "Use the product rule.", 2),
        hints: ["Let $u=x$, $v=\\sin x$.", "Use $u'v+uv'$.", "Differentiate $\\sin x$."],
        rubric: singleRubric("a", 2, "Finds $\\sin x+x\\cos x$."),
        commonErrors: ["Multiplying the derivatives to get $\\cos x$.", "Differentiating only $\\sin x$."],
        workedSolution: [{ part: "a", explanation: "$\\frac{d}{dx}(x\\sin x)=1\\cdot\\sin x+x\\cos x=\\sin x+x\\cos x$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Differentiate }y=\frac{x^2+1}{x-1}.`,
        difficulty: 3,
        skillTags: ["derivatives", "quotient_rule", "polynomial"],
        parts: singlePart("a", "Use the quotient rule and simplify the numerator.", 3),
        hints: ["Let $u=x^2+1$ and $v=x-1$.", "Use $\\frac{vu'-uv'}{v^2}$.", "Simplify $(x-1)(2x)-(x^2+1)$."],
        rubric: singleRubric("a", 3, "Finds $\\frac{x^2-2x-1}{(x-1)^2}$."),
        commonErrors: ["Reversing the quotient-rule numerator.", "Dropping the square on the denominator."],
        workedSolution: [{ part: "a", explanation: "$\\frac{dy}{dx}=\\frac{(x-1)(2x)-(x^2+1)(1)}{(x-1)^2}=\\frac{x^2-2x-1}{(x-1)^2}$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{For }y=x^2\cos x+x\sin x,\text{ answer the following.}`,
        difficulty: 4,
        skillTags: ["derivatives", "product_rule", "trigonometric_derivatives"],
        parts: [
          { letter: "a", promptMarkdown: "Differentiate $x^2\\cos x$.", points: 2 },
          { letter: "b", promptMarkdown: "Differentiate $x\\sin x$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $dy/dx$.", points: 2 },
        ],
        hints: ["Use the product rule on each product separately.", "Watch the sign of the derivative of $\\cos x$.", "Add the two derivative results."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $2x\\cos x-x^2\\sin x$." },
            { part: "b", points: 1, description: "Finds $\\sin x+x\\cos x$." },
            { part: "c", points: 2, description: "Combines to $3x\\cos x-x^2\\sin x+\\sin x$." },
          ],
        },
        commonErrors: ["Using a positive derivative for $\\cos x$.", "Multiplying derivatives instead of using product rule."],
        workedSolution: [
          { part: "a", explanation: "$\\frac{d}{dx}(x^2\\cos x)=2x\\cos x-x^2\\sin x$." },
          { part: "b", explanation: "$\\frac{d}{dx}(x\\sin x)=\\sin x+x\\cos x$." },
          { part: "c", explanation: "Adding gives $\\frac{dy}{dx}=3x\\cos x-x^2\\sin x+\\sin x$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A model uses }H(x)=\frac{x^2\sin x}{x+1}\text{ for }x\ne-1.\text{ The numerator and denominator are built from simpler polynomial and trigonometric functions.}`,
        difficulty: 4,
        skillTags: ["derivatives", "case_based", "product_rule", "quotient_rule"],
        figure: quotientRuleFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the derivative of the numerator $x^2\\sin x$.", points: 1 },
          { letter: "b", promptMarkdown: "Write the quotient-rule expression for $H'(x)$.", points: 2 },
          { letter: "c", promptMarkdown: "Evaluate $H'(0)$.", points: 1 },
        ],
        hints: ["First apply product rule to the numerator.", "Then use quotient rule with denominator $x+1$.", "Substitute $x=0$ only after forming $H'(x)$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds numerator derivative $2x\\sin x+x^2\\cos x$." },
            { part: "b", points: 2, description: "Writes correct quotient-rule expression." },
            { part: "c", points: 1, description: "Finds $H'(0)=0$." },
          ],
        },
        commonErrors: ["Trying to differentiate the quotient by differentiating numerator and denominator separately.", "Substituting $x=0$ before differentiating and concluding the derivative is automatically zero."],
        workedSolution: [
          { part: "a", explanation: "$(x^2\\sin x)'=2x\\sin x+x^2\\cos x$." },
          { part: "b", explanation: "$H'(x)=\\frac{(x+1)(2x\\sin x+x^2\\cos x)-x^2\\sin x}{(x+1)^2}$." },
          { part: "c", explanation: "At $x=0$, every numerator term contains $x$ or $\\sin0$, so $H'(0)=0$." },
        ],
      },
    ],
  },
];

export const calculusXiTopics: Topic[] = topicSeeds.map(makeTopic);
