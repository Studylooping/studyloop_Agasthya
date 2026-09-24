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

const COURSE = "cbse-math-9";
const UNIT = "u2-algebra-ix";
const VERSION = "0.2.2";
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
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
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
  return `You chose ${choiceText}. Recheck the algebraic meaning of the variable, operation, graph, or identity used in the question.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_algebra_reasoning"),
    };
  });

  const choices = unletteredChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];
  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_rule_mechanically_without_matching_the_context",
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

function makeConstructed(
  meta: TopicMeta,
  seed: ConstructedSeed,
  index: number,
): FrqItem {
  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_showing_algebraic_reasoning",
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

const sequencePatternFigure: ItemFigure = {
  type: "svg",
  title: "Growing dot pattern",
  description:
    "Three stages of a dot pattern: stage 1 has 3 dots, stage 2 has 5 dots, and stage 3 has 7 dots.",
  svg: `<svg viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="210" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="72" y="38" font-size="16">Stage 1</text>
    <text x="238" y="38" font-size="16">Stage 2</text>
    <text x="404" y="38" font-size="16">Stage 3</text>
  </g>
  <g fill="#2563eb" stroke="#1d4ed8" stroke-width="2">
    <circle cx="90" cy="100" r="9"/><circle cx="120" cy="100" r="9"/><circle cx="150" cy="100" r="9"/>
    <circle cx="220" cy="100" r="9"/><circle cx="250" cy="100" r="9"/><circle cx="280" cy="100" r="9"/><circle cx="310" cy="100" r="9"/><circle cx="340" cy="100" r="9"/>
    <circle cx="370" cy="100" r="9"/><circle cx="397" cy="100" r="9"/><circle cx="424" cy="100" r="9"/><circle cx="451" cy="100" r="9"/><circle cx="478" cy="100" r="9"/><circle cx="505" cy="100" r="9"/><circle cx="532" cy="100" r="9"/>
  </g>
  <line x1="80" y1="132" x2="160" y2="132" stroke="#94a3b8" stroke-width="2"/>
  <line x1="210" y1="132" x2="350" y2="132" stroke="#94a3b8" stroke-width="2"/>
  <line x1="360" y1="132" x2="542" y2="132" stroke="#94a3b8" stroke-width="2"/>
</svg>`,
};

const factorTilesFigure: ItemFigure = {
  type: "svg",
  title: "Algebra tiles for a quadratic",
  description:
    "A tile model with one x squared tile, five x tiles, and six unit tiles.",
  svg: `<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="300" fill="#ffffff"/>
  <text x="34" y="34" font-size="16" fill="#334155" font-family="Arial, sans-serif">Tile model</text>
  <rect x="60" y="70" width="110" height="110" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="100" y="132" font-size="20" fill="#1d4ed8" font-family="Arial, sans-serif">x²</text>
  <g fill="#dcfce7" stroke="#16a34a" stroke-width="2">
    <rect x="185" y="70" width="64" height="26" rx="4"/><rect x="185" y="104" width="64" height="26" rx="4"/><rect x="185" y="138" width="64" height="26" rx="4"/>
    <rect x="60" y="195" width="26" height="64" rx="4"/><rect x="94" y="195" width="26" height="64" rx="4"/>
  </g>
  <g fill="#fef3c7" stroke="#d97706" stroke-width="2">
    <rect x="185" y="195" width="24" height="24" rx="3"/><rect x="217" y="195" width="24" height="24" rx="3"/><rect x="249" y="195" width="24" height="24" rx="3"/>
    <rect x="185" y="227" width="24" height="24" rx="3"/><rect x="217" y="227" width="24" height="24" rx="3"/><rect x="249" y="227" width="24" height="24" rx="3"/>
  </g>
  <text x="315" y="114" font-size="15" fill="#334155" font-family="Arial, sans-serif">one square tile</text>
  <text x="315" y="150" font-size="15" fill="#334155" font-family="Arial, sans-serif">five length tiles</text>
  <text x="315" y="215" font-size="15" fill="#334155" font-family="Arial, sans-serif">six unit tiles</text>
</svg>`,
};

const lineGraphFigure: ItemFigure = {
  type: "svg",
  title: "Graph of a linear equation",
  description:
    "A coordinate grid with a straight line passing through the plotted points (0,2), (2,4), and (4,6).",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="300" x2="500" y2="300"/><line x1="90" y1="260" x2="500" y2="260"/><line x1="90" y1="220" x2="500" y2="220"/><line x1="90" y1="180" x2="500" y2="180"/><line x1="90" y1="140" x2="500" y2="140"/><line x1="90" y1="100" x2="500" y2="100"/><line x1="90" y1="60" x2="500" y2="60"/>
    <line x1="100" y1="50" x2="100" y2="310"/><line x1="150" y1="50" x2="150" y2="310"/><line x1="200" y1="50" x2="200" y2="310"/><line x1="250" y1="50" x2="250" y2="310"/><line x1="300" y1="50" x2="300" y2="310"/><line x1="350" y1="50" x2="350" y2="310"/><line x1="400" y1="50" x2="400" y2="310"/><line x1="450" y1="50" x2="450" y2="310"/>
  </g>
  <line x1="95" y1="300" x2="510" y2="300" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="312" x2="100" y2="45" stroke="#334155" stroke-width="2"/>
  <path d="M500 293 L510 300 L500 307" fill="none" stroke="#334155" stroke-width="2"/>
  <path d="M93 55 L100 45 L107 55" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="220" x2="400" y2="60" stroke="#2563eb" stroke-width="4"/>
  <g fill="#1d4ed8">
    <circle cx="100" cy="220" r="6"/><circle cx="250" cy="140" r="6"/><circle cx="400" cy="60" r="6"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="13">
    <text x="94" y="323">0</text><text x="245" y="323">2</text><text x="395" y="323">4</text>
    <text x="75" y="224">2</text><text x="75" y="144">4</text><text x="75" y="64">6</text>
    <text x="515" y="305">x</text><text x="89" y="40">y</text>
  </g>
</svg>`,
};

const pairLinesFigure: ItemFigure = {
  type: "svg",
  title: "Intersection of two lines",
  description:
    "A coordinate grid with two lines crossing at the grid point (2,3).",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="300" x2="500" y2="300"/><line x1="90" y1="260" x2="500" y2="260"/><line x1="90" y1="220" x2="500" y2="220"/><line x1="90" y1="180" x2="500" y2="180"/><line x1="90" y1="140" x2="500" y2="140"/><line x1="90" y1="100" x2="500" y2="100"/><line x1="90" y1="60" x2="500" y2="60"/>
    <line x1="100" y1="50" x2="100" y2="310"/><line x1="150" y1="50" x2="150" y2="310"/><line x1="200" y1="50" x2="200" y2="310"/><line x1="250" y1="50" x2="250" y2="310"/><line x1="300" y1="50" x2="300" y2="310"/><line x1="350" y1="50" x2="350" y2="310"/><line x1="400" y1="50" x2="400" y2="310"/>
  </g>
  <line x1="95" y1="300" x2="510" y2="300" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="312" x2="100" y2="45" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="260" x2="400" y2="100" stroke="#2563eb" stroke-width="4"/>
  <line x1="100" y1="100" x2="400" y2="260" stroke="#f97316" stroke-width="4"/>
  <circle cx="250" cy="180" r="6" fill="#0f172a"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="13">
    <text x="94" y="323">0</text><text x="245" y="323">2</text><text x="75" y="184">3</text>
    <text x="410" y="112" fill="#1d4ed8">L1</text><text x="410" y="252" fill="#c2410c">L2</text>
    <text x="515" y="305">x</text><text x="89" y="40">y</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Introduction to Polynomials",
    subtopic:
      "Recognising polynomials, degree, coefficients, evaluation, and simple linear growth or decay models.",
    mc: [
      {
        questionLatex: L`A student must choose a model whose powers of $x$ are all non-negative integers. Which expression is a polynomial in $x$?`,
        difficulty: 2,
        skillTags: ["recognise_polynomial"],
        choices: [
          L`$3x^2-5x+1$`,
          L`$\frac{2}{x}+1$`,
          L`$\sqrt{x}+4$`,
          L`$x^{-1}+7$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A variable in the denominator gives a negative power of $x$, so it is not a polynomial.",
          C: "$\\sqrt{x}$ is $x^{1/2}$, and polynomial powers must be non-negative integers.",
          D: "$x^{-1}$ has a negative exponent, so it is not a polynomial.",
        },
        hints: [
          "Check the powers of $x$.",
          "Polynomial powers are whole numbers.",
          "No variable should appear in a denominator.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "All powers of $x$ in $3x^2-5x+1$ are non-negative integers.",
            math: "3x^2-5x+1",
          },
        ],
      },
      {
        questionLatex: L`For the polynomial $7x^4-2x^2+9$, the degree used to describe its highest-growth term is`,
        difficulty: 2,
        skillTags: ["degree_of_polynomial"],
        choices: [L`$7$`, L`$4$`, L`$2$`, L`$9$`],
        correctLetter: "B",
        rationales: {
          A: "This is the coefficient of the highest-power term, not the degree.",
          C: "This is another exponent, but it is not the highest exponent.",
          D: "This is the constant term, not the degree.",
        },
        hints: [
          "Look for the highest power of $x$.",
          "Coefficients do not decide degree.",
          "The term $7x^4$ has the highest exponent.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The highest exponent of $x$ is $4$.",
            math: "\\deg(7x^4-2x^2+9)=4",
          },
        ],
      },
      {
        questionLatex: L`If $p(x)=x^2-3x+1$, then $p(2)$ equals`,
        difficulty: 2,
        skillTags: ["evaluate_polynomial"],
        choices: [L`$1$`, L`$3$`, L`$-1$`, L`$-3$`],
        correctLetter: "C",
        rationales: {
          A: "This misses the subtraction of $3x$.",
          B: "This treats $2^2-3(2)$ as positive $2$.",
          D: "This subtracts the constant instead of adding it.",
        },
        hints: [
          "Substitute $x=2$.",
          "Square before multiplying by 3.",
          "Compute $4-6+1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute $x=2$.",
            math: "p(2)=2^2-3(2)+1=4-6+1=-1",
          },
        ],
      },
      {
        questionLatex: L`A parking lot charges a fixed entry fee of Rs. $20$ and Rs. $15$ for each hour. Which polynomial gives the total cost $C(h)$ for $h$ hours?`,
        difficulty: 2,
        skillTags: ["linear_polynomial_model"],
        choices: [
          L`$C(h)=20h+15$`,
          L`$C(h)=35h$`,
          L`$C(h)=15+h+20$`,
          L`$C(h)=15h+20$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This makes the fixed entry fee depend on the number of hours.",
          B: "This adds the two rates and loses the fixed fee structure.",
          C: "This adds only $h$ rupees per hour instead of $15h$.",
        },
        hints: [
          "Separate fixed cost and hourly cost.",
          "Hourly cost is multiplied by $h$.",
          "Then add the entry fee.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The hourly part is $15h$ and the fixed part is $20$.",
            math: "C(h)=15h+20",
          },
        ],
      },
      {
        questionLatex: L`A water tank has $120$ litres of water and loses $8$ litres every minute. Which linear polynomial gives the amount $A(t)$ after $t$ minutes?`,
        difficulty: 2,
        skillTags: ["linear_decay_model"],
        choices: [
          L`$A(t)=120-8t$`,
          L`$A(t)=120+8t$`,
          L`$A(t)=8t-120$`,
          L`$A(t)=112t$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This models water increasing by $8$ litres per minute, but the tank is losing water.",
          C: "This starts at $-120$ litres when $t=0$, which is impossible for the given tank.",
          D: "This treats the first-minute amount as a rate multiplied by $t$ and loses the fixed starting amount.",
        },
        hints: [
          "Start with the initial amount.",
          "Losing water means subtracting a repeated amount.",
          "After $t$ minutes, the loss is $8t$ litres.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The tank starts with $120$ litres and loses $8t$ litres in $t$ minutes.",
            math: "A(t)=120-8t",
          },
        ],
      },
      {
        questionLatex: L`Assertion: In $y=3x+5$, the slope is $3$ and the $y$-intercept is $5$. Reason: In $y=mx+c$, $m$ gives the slope and $c$ gives the $y$-intercept.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "slope_intercept_form"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason directly explains how to read both values from slope-intercept form.",
          C: "The reason is true: $m$ and $c$ have these meanings in $y=mx+c$.",
          D: "The assertion is true because $y=3x+5$ has $m=3$ and $c=5$.",
        },
        hints: [
          "Compare the equation with $y=mx+c$.",
          "The coefficient of $x$ is the slope.",
          "The constant term is the $y$-intercept.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compare $y=3x+5$ with $y=mx+c$.",
            math: "m=3,\\quad c=5",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In the polynomial $5x^2-3x+8$, identify the coefficient attached to the square term.`,
        difficulty: 2,
        skillTags: ["coefficient_identification"],
        parts: singlePart("a", "Give the coefficient.", 1),
        hints: [
          "Find the term containing $x^2$.",
          "The term is $5x^2$.",
          "The numerical factor is the coefficient.",
        ],
        rubric: singleRubric("a", 1, "Writes $5$."),
        commonErrors: ["Writing $2$ because it is the exponent."],
        workedSolution: [
          {
            part: "a",
            explanation: "The $x^2$ term is $5x^2$, so the coefficient is $5$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Is $4x^3+2x-1$ a polynomial? State its degree.`,
        difficulty: 1,
        skillTags: ["recognise_polynomial", "degree_of_polynomial"],
        parts: singlePart("a", "Answer yes or no and give the degree.", 1),
        hints: [
          "Check the exponents.",
          "All exponents are non-negative integers.",
          "The highest exponent is 3.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States that it is a polynomial of degree 3.",
        ),
        commonErrors: ["Calling the coefficient 4 the degree."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Yes. It is a polynomial, and the highest power is $3$, so its degree is $3$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $p(x)=2x^2+x-3$, find $p(-1)$ and $p(2)$.`,
        difficulty: 2,
        skillTags: ["evaluate_polynomial"],
        parts: singlePart("a", "Show both substitutions.", 2),
        hints: [
          "Substitute carefully.",
          "Remember that $(-1)^2=1$.",
          "Evaluate one input at a time.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $p(-1)=-2$." },
            { part: "a", points: 1, description: "Finds $p(2)=7$." },
          ],
        },
        commonErrors: [
          "Treating $(-1)^2$ as $-1$.",
          "Forgetting the constant term.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$p(-1)=2(1)-1-3=-2$. Also, $p(2)=2(4)+2-3=7$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A notebook costs Rs. $18$ and a pen costs Rs. $7$. Write a polynomial for the cost of buying $n$ notebooks and $4$ pens.`,
        difficulty: 2,
        skillTags: ["algebraic_expression_context"],
        parts: singlePart("a", "Write and simplify the expression.", 2),
        hints: [
          "Cost of notebooks depends on $n$.",
          "Cost of 4 pens is fixed.",
          "Add the two costs.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes notebook cost as $18n$.",
            },
            {
              part: "a",
              points: 1,
              description: "Adds pen cost to get $18n+28$.",
            },
          ],
        },
        commonErrors: [
          "Writing $18+7n$ by swapping the variable item.",
          "Forgetting to multiply 7 by 4.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The notebooks cost Rs. $18n$. Four pens cost Rs. $4\\times7=28$. Total cost is Rs. $(18n+28)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A school notice board has $r$ rows. Each row holds $6$ posters, and $3$ extra posters are placed below the rows. Write the expression for the total number of posters and find it when $r=5$.`,
        difficulty: 3,
        skillTags: ["linear_polynomial_model", "evaluate_expression"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the expression in terms of $r$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Evaluate it for $r=5$.", points: 1 },
        ],
        hints: [
          "Rows contribute repeated groups.",
          "Each row has 6 posters.",
          "Substitute $r=5$ after forming the expression.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Writes $6r+3$." },
            { part: "b", points: 1, description: "Finds $33$ posters." },
          ],
        },
        commonErrors: ["Writing $6+r+3$ instead of $6r+3$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The rows hold $6r$ posters, and there are $3$ extra, so the expression is $6r+3$.",
          },
          {
            part: "b",
            explanation: "For $r=5$, the total is $6(5)+3=33$ posters.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A small library charges a one-time card fee of Rs. $40$ and Rs. $6$ for each book borrowed in a month.`,
        difficulty: 3,
        skillTags: ["linear_polynomial_model", "interpret_coefficients"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the monthly cost $C(b)$ for borrowing $b$ books.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the cost for $7$ books.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain what the coefficient of $b$ represents.",
            points: 1,
          },
        ],
        hints: [
          "There is a fixed fee.",
          "The per-book fee is multiplied by $b$.",
          "A coefficient in a context has units.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Writes $C(b)=6b+40$." },
            { part: "b", points: 1, description: "Finds Rs. $82$." },
            {
              part: "c",
              points: 1,
              description: "Interprets 6 as the rupees charged per book.",
            },
          ],
        },
        commonErrors: [
          "Making the fixed fee depend on $b$.",
          "Interpreting 40 as the per-book charge.",
        ],
        workedSolution: [
          { part: "a", explanation: "The cost is $C(b)=6b+40$." },
          { part: "b", explanation: "$C(7)=6(7)+40=82$." },
          {
            part: "c",
            explanation:
              "The coefficient $6$ means each additional book adds Rs. $6$ to the cost.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Sequences and Progressions",
    subtopic:
      "Number patterns, arithmetic and geometric progressions, visual patterns, simple sums, and Tower of Hanoi growth.",
    mc: [
      {
        questionLatex: L`A staircase pattern has $4,7,10,13,\ldots$ tiles in successive stages. If the same rule continues, the next stage has`,
        difficulty: 2,
        skillTags: ["arithmetic_sequence_next_term"],
        choices: [L`$15$`, L`$17$`, L`$16$`, L`$18$`],
        correctLetter: "C",
        rationales: {
          A: "The common difference is $3$, not $2$.",
          B: "This adds $4$ instead of $3$.",
          D: "This adds $5$ instead of $3$.",
        },
        hints: [
          "Find the difference between consecutive terms.",
          "The difference is $3$.",
          "Add $3$ to $13$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Each term increases by $3$.",
            math: "13+3=16",
          },
        ],
      },
      {
        questionLatex: L`For the arithmetic progression $5,9,13,17,\ldots$, the $n$th term is`,
        difficulty: 2,
        skillTags: ["ap_nth_term"],
        choices: [L`$5n+4$`, L`$4n+5$`, L`$n+4$`, L`$4n+1$`],
        correctLetter: "D",
        rationales: {
          A: "This gives $9$ as the first term, not $5$.",
          B: "This gives $9$ when $n=1$, so it is shifted.",
          C: "This increases by $1$, not by $4$.",
        },
        hints: [
          "Identify first term and common difference.",
          "Use $a_n=a+(n-1)d$.",
          "Here $a=5$ and $d=4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the AP formula.",
            math: "a_n=5+(n-1)4=4n+1",
          },
        ],
      },
      {
        questionLatex: L`The dot pattern in the figure continues in the same way. Which rule gives the number of dots in stage $n$?`,
        difficulty: 2,
        figure: sequencePatternFigure,
        skillTags: ["visual_pattern_rule", "linear_sequence"],
        choices: [L`$2n+1$`, L`$3n$`, L`$n+2$`, L`$2^n+1$`],
        correctLetter: "A",
        rationales: {
          B: "This matches stage 1 only; stage 2 would be 6, not 5.",
          C: "This matches stage 1 only; stage 3 would be 5, not 7.",
          D: "The pattern grows by adding 2 dots, not by doubling.",
        },
        hints: [
          "Read the first three counts.",
          "The counts are $3,5,7$.",
          "Find a rule that gives these values for $n=1,2,3$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The count starts at $3$ and increases by $2$ each stage.",
            math: "a_n=3+(n-1)2=2n+1",
          },
        ],
      },
      {
        questionLatex: L`The fourth term of the geometric progression $2,6,18,\ldots$ is`,
        difficulty: 2,
        skillTags: ["gp_next_term"],
        choices: [L`$36$`, L`$54$`, L`$24$`, L`$20$`],
        correctLetter: "B",
        rationales: {
          A: "This doubles 18, but the common ratio is 3.",
          C: "This adds 6, but a GP uses multiplication by a fixed ratio.",
          D: "This adds 2 to 18, but the pattern multiplies by 3 at each step.",
        },
        hints: [
          "Find the common ratio.",
          "$6/2=3$ and $18/6=3$.",
          "Multiply 18 by 3.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The common ratio is $3$.",
            math: "18\\times3=54",
          },
        ],
      },
      {
        questionLatex: L`The sum $1+2+3+\cdots+20$ is`,
        difficulty: 2,
        skillTags: ["sum_first_n_natural_numbers"],
        choices: [L`$200$`, L`$220$`, L`$210$`, L`$400$`],
        correctLetter: "C",
        rationales: {
          A: "This is $20\\times10$, but the average of 1 and 20 is $10.5$.",
          B: "This overcounts by 10.",
          D: "This multiplies 20 by 20 instead of summing the sequence.",
        },
        hints: ["Use $n(n+1)/2$.", "Here $n=20$.", "Compute $20\\cdot21/2$."],
        solution: [
          {
            step: 1,
            explanation:
              "Use the formula for the sum of the first $n$ natural numbers.",
            math: "\\frac{20\\cdot21}{2}=210",
          },
        ],
      },
      {
        questionLatex: L`In the Tower of Hanoi puzzle, the minimum number of moves for $4$ disks is`,
        difficulty: 3,
        skillTags: ["tower_of_hanoi", "geometric_growth"],
        choices: [L`$8$`, L`$16$`, L`$12$`, L`$15$`],
        correctLetter: "D",
        rationales: {
          A: "This is $2n$, not the Tower of Hanoi move count.",
          B: "This is $2^4$, but the rule is one less.",
          C: "This adds the first four even numbers incorrectly for this puzzle.",
        },
        hints: [
          "The minimum moves for $n$ disks follow $2^n-1$.",
          "For 4 disks, compute $2^4-1$.",
          "$2^4=16$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The minimum moves are",
            math: "2^4-1=16-1=15",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the next two terms of $6,10,14,18,\ldots$.`,
        difficulty: 1,
        skillTags: ["arithmetic_sequence_next_term"],
        parts: singlePart("a", "Give the next two terms.", 1),
        hints: [
          "Find the common difference.",
          "Each term increases by 4.",
          "Add 4 twice.",
        ],
        rubric: singleRubric("a", 1, "Writes $22,26$."),
        commonErrors: ["Adding 2 instead of 4."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The common difference is $4$, so the next two terms are $22$ and $26$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the $10$th term of the AP $3,8,13,\ldots$.`,
        difficulty: 2,
        skillTags: ["ap_nth_term"],
        parts: singlePart("a", "Give the 10th term.", 1),
        hints: [
          "The first term is $3$.",
          "The common difference is $5$.",
          "Use $a_n=a+(n-1)d$.",
        ],
        rubric: singleRubric("a", 1, "Finds $48$."),
        commonErrors: [
          "Multiplying $10$ by $5$ and forgetting the first-term adjustment.",
        ],
        workedSolution: [
          { part: "a", explanation: "$a_{10}=3+(10-1)5=3+45=48$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The first term of a GP is $4$ and the common ratio is $2$. Find its first four terms.`,
        difficulty: 2,
        skillTags: ["gp_terms"],
        parts: singlePart("a", "List the four terms.", 2),
        hints: [
          "Start with 4.",
          "Multiply by 2 each time.",
          "Write four terms including the first one.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Uses multiplication by 2." },
            { part: "a", points: 1, description: "Lists $4,8,16,32$." },
          ],
        },
        commonErrors: ["Adding 2 instead of multiplying by 2."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The terms are $4,4\\cdot2,4\\cdot2^2,4\\cdot2^3$, so they are $4,8,16,32$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the dot pattern shown to find the number of dots in stage $8$.`,
        difficulty: 2,
        figure: sequencePatternFigure,
        skillTags: ["visual_pattern_rule", "linear_sequence"],
        parts: singlePart("a", "Find the stage 8 count.", 2),
        hints: [
          "The visible stages have $3,5,7$ dots.",
          "The number increases by 2 each time.",
          "Use $2n+1$ for stage $n$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies the rule $2n+1$ or equivalent.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds $17$ dots for stage 8.",
            },
          ],
        },
        commonErrors: ["Using $3n$ because stage 1 has 3 dots."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The rule is $2n+1$. For $n=8$, the number of dots is $2(8)+1=17$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find $1+2+3+\cdots+30$ using the formula for the sum of the first $n$ natural numbers.`,
        difficulty: 2,
        skillTags: ["sum_first_n_natural_numbers"],
        parts: singlePart("a", "Show the formula substitution.", 2),
        hints: [
          "Use $n(n+1)/2$.",
          "Here $n=30$.",
          "Multiply $30$ by $31$ and divide by $2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Substitutes $n=30$ in $n(n+1)/2$.",
            },
            { part: "a", points: 1, description: "Finds $465$." },
          ],
        },
        commonErrors: ["Using $30^2/2$ instead of $30\\cdot31/2$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$1+2+\\cdots+30=\\frac{30\\cdot31}{2}=465$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student saves Rs. $50$ in week $1$, Rs. $60$ in week $2$, Rs. $70$ in week $3$, and continues with the same increase.`,
        difficulty: 3,
        skillTags: ["ap_context", "sequence_model"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the amount saved in week $n$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the amount saved in week $8$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State whether this pattern is an AP or GP.",
            points: 1,
          },
        ],
        hints: [
          "The increase is constant.",
          "Use the AP nth-term formula.",
          "Compare addition with multiplication.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $10n+40$ or equivalent.",
            },
            { part: "b", points: 1, description: "Finds Rs. $120$." },
            { part: "c", points: 1, description: "Identifies an AP." },
          ],
        },
        commonErrors: [
          "Treating the sequence as a GP because the amounts are growing.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The first term is $50$ and common difference is $10$, so $a_n=50+(n-1)10=10n+40$.",
          },
          { part: "b", explanation: "For week $8$, $a_8=10(8)+40=120$." },
          {
            part: "c",
            explanation:
              "It is an AP because the same amount, Rs. $10$, is added each week.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Algebraic Identities and Factorisation",
    subtopic:
      "Using standard identities, geometric models, factorisation, and simple rational expressions.",
    mc: [
      {
        questionLatex: L`A square of side $(x+3)$ units is split into algebra tiles. Its total area expands to`,
        difficulty: 2,
        skillTags: ["identity_square_sum"],
        choices: [L`$x^2+6x+9$`, L`$x^2+9$`, L`$x^2+3x+9$`, L`$x^2+6x+3$`],
        correctLetter: "A",
        rationales: {
          B: "This misses the middle term $2\\cdot x\\cdot3$.",
          C: "The middle term should be $6x$, not $3x$.",
          D: "The constant term should be $3^2=9$.",
        },
        hints: [
          "Use $(a+b)^2=a^2+2ab+b^2$.",
          "Here $a=x$ and $b=3$.",
          "The middle term is $6x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the square identity.",
            math: "(x+3)^2=x^2+2(x)(3)+3^2=x^2+6x+9",
          },
        ],
      },
      {
        questionLatex: L`Using an identity, $101^2-99^2$ equals`,
        difficulty: 2,
        skillTags: ["difference_of_squares"],
        choices: [L`$200$`, L`$400$`, L`$20$`, L`$4$`],
        correctLetter: "B",
        rationales: {
          A: "This uses only $101+99$ and forgets the difference factor.",
          C: "This uses only the difference between 101 and 99 in a wrong way.",
          D: "This squares the difference only.",
        },
        hints: [
          "Use $a^2-b^2=(a-b)(a+b)$.",
          "Here $a=101$ and $b=99$.",
          "Compute $2\\times200$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the difference of squares.",
            math: "101^2-99^2=(101-99)(101+99)=2\\cdot200=400",
          },
        ],
      },
      {
        questionLatex: L`The factorisation of $x^2+7x+12$ is`,
        difficulty: 2,
        skillTags: ["factor_quadratic"],
        choices: [
          L`$(x+2)(x+6)$`,
          L`$(x-3)(x-4)$`,
          L`$(x+3)(x+4)$`,
          L`$(x+1)(x+12)$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The product is 12, but the sum is 8, not 7.",
          B: "This gives the correct constant but a negative middle term.",
          D: "The product is 12, but the sum is 13, not 7.",
        },
        hints: [
          "Find two numbers whose product is 12.",
          "Their sum must be 7.",
          "The pair is 3 and 4.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Split the middle term using $3+4=7$ and $3\\cdot4=12$.",
            math: "x^2+7x+12=(x+3)(x+4)",
          },
        ],
      },
      {
        questionLatex: L`The algebra tiles in the figure represent which expression?`,
        difficulty: 2,
        figure: factorTilesFigure,
        skillTags: ["algebra_tiles_expression"],
        choices: [L`$x^2+6x+5$`, L`$5x^2+x+6$`, L`$x^2+11x$`, L`$x^2+5x+6$`],
        correctLetter: "D",
        rationales: {
          A: "There are five $x$-tiles and six unit tiles, not the other way around.",
          B: "There is one $x^2$ tile, not five.",
          C: "This treats unit tiles as $x$-tiles.",
        },
        hints: [
          "Count each type of tile separately.",
          "There is one square tile.",
          "There are five length tiles and six unit tiles.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The model has one $x^2$ tile, five $x$ tiles, and six unit tiles.",
            math: "x^2+5x+6",
          },
        ],
      },
      {
        questionLatex: L`The expression $(a+b)^2-(a-b)^2$ simplifies to`,
        difficulty: 3,
        skillTags: ["identity_combination"],
        choices: [L`$4ab$`, L`$2a^2+2b^2$`, L`$a^2-b^2$`, L`$0$`],
        correctLetter: "A",
        rationales: {
          B: "This adds the two squares instead of subtracting them.",
          C: "This is the difference of squares identity, not this expanded expression.",
          D: "The middle terms do not cancel after subtraction; they add.",
        },
        hints: [
          "Expand both squares.",
          "Be careful when subtracting the second bracket.",
          "The $a^2$ and $b^2$ terms cancel.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Expand and subtract.",
            math: "(a+b)^2-(a-b)^2=(a^2+2ab+b^2)-(a^2-2ab+b^2)=4ab",
          },
        ],
      },
      {
        questionLatex: L`For $x\ne3$, the expression $\frac{x^2-9}{x-3}$ simplifies to`,
        difficulty: 3,
        skillTags: ["simplify_rational_expression", "difference_of_squares"],
        choices: [L`$x-3$`, L`$x+3$`, L`$x^2+3$`, L`$1$`],
        correctLetter: "B",
        rationales: {
          A: "This cancels the wrong factor after factorising.",
          C: "This does not factor the numerator.",
          D: "Only the common factor cancels; the other factor remains.",
        },
        hints: [
          "Factor $x^2-9$.",
          "Use difference of squares.",
          "Cancel the common factor $x-3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Factor and cancel the common factor.",
            math: "\\frac{x^2-9}{x-3}=\\frac{(x-3)(x+3)}{x-3}=x+3,\\quad x\\ne3",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`When the square of $(a+b)$ is modelled by area, the two mixed rectangles together give the missing term in $(a+b)^2=a^2+\_\_\_+b^2$.`,
        difficulty: 2,
        skillTags: ["identity_square_sum"],
        parts: singlePart("a", "Fill the missing term.", 1),
        hints: [
          "Recall the square of a sum.",
          "The middle term uses both $a$ and $b$.",
          "It is twice the product.",
        ],
        rubric: singleRubric("a", 1, "Writes $2ab$."),
        commonErrors: ["Writing $ab$ instead of $2ab$."],
        workedSolution: [
          {
            part: "a",
            explanation: "The complete identity is $(a+b)^2=a^2+2ab+b^2$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A strip model has area $3x+6$. Write it as a product by taking out the greatest common factor.`,
        difficulty: 2,
        skillTags: ["common_factor"],
        parts: singlePart("a", "Write the factorised form.", 1),
        hints: [
          "Look for the common factor.",
          "Both terms are divisible by 3.",
          "Take 3 outside the bracket.",
        ],
        rubric: singleRubric("a", 1, "Writes $3(x+2)$."),
        commonErrors: ["Taking out $x$ even though 6 has no $x$ factor."],
        workedSolution: [
          {
            part: "a",
            explanation: "The common factor is $3$, so $3x+6=3(x+2)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Expand $(2x-5)^2$ using an identity.`,
        difficulty: 2,
        skillTags: ["identity_square_difference"],
        parts: singlePart("a", "Show the expansion.", 2),
        hints: [
          "Use $(a-b)^2=a^2-2ab+b^2$.",
          "Here $a=2x$ and $b=5$.",
          "Square both terms and include the middle term.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Uses the correct identity." },
            { part: "a", points: 1, description: "Gets $4x^2-20x+25$." },
          ],
        },
        commonErrors: ["Writing $4x^2-25$ and missing the middle term."],
        workedSolution: [
          {
            part: "a",
            explanation: "$(2x-5)^2=(2x)^2-2(2x)(5)+5^2=4x^2-20x+25$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Factorise $x^2-8x+15$.`,
        difficulty: 2,
        skillTags: ["factor_quadratic"],
        parts: singlePart("a", "Show the two factors.", 2),
        hints: [
          "Find two numbers whose product is 15.",
          "Their sum must be $-8$.",
          "Use $-3$ and $-5$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds the pair $-3,-5$." },
            { part: "a", points: 1, description: "Writes $(x-3)(x-5)$." },
          ],
        },
        commonErrors: ["Using $(x+3)(x+5)$ and getting the wrong sign."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $(-3)+(-5)=-8$ and $(-3)(-5)=15$, $x^2-8x+15=(x-3)(x-5)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Simplify $\frac{x^2+5x+6}{x+2}$ for $x\ne-2$.`,
        difficulty: 3,
        skillTags: ["simplify_rational_expression", "factor_quadratic"],
        parts: singlePart("a", "Factor first, then simplify.", 2),
        hints: [
          "Factor the numerator.",
          "Look for two numbers with product 6 and sum 5.",
          "Cancel the common factor $x+2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Factors numerator as $(x+2)(x+3)$.",
            },
            {
              part: "a",
              points: 1,
              description: "Simplifies to $x+3$ with $x\\ne-2$.",
            },
          ],
        },
        commonErrors: [
          "Cancelling only the $x$ terms instead of a whole factor.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\frac{x^2+5x+6}{x+2}=\\frac{(x+2)(x+3)}{x+2}=x+3$, for $x\\ne-2$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A square garden has side $(x+4)$ metres. A square tile patch of side $x$ metres is removed from one corner.`,
        difficulty: 3,
        skillTags: ["difference_of_squares_context", "factorisation_context"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the remaining area as an algebraic expression.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Factorise the expression.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the remaining area when $x=6$.",
            points: 1,
          },
        ],
        hints: [
          "Subtract the smaller square area from the larger square area.",
          "Use $a^2-b^2$.",
          "Substitute after simplifying.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $(x+4)^2-x^2$ or $8x+16$.",
            },
            { part: "b", points: 1, description: "Factorises as $8(x+2)$." },
            { part: "c", points: 1, description: "Finds $64\\text{ m}^2$." },
          ],
        },
        commonErrors: [
          "Adding the two areas instead of subtracting.",
          "Substituting before understanding the expression.",
        ],
        workedSolution: [
          { part: "a", explanation: "Remaining area is $(x+4)^2-x^2$." },
          {
            part: "b",
            explanation:
              "Using difference of squares, $(x+4)^2-x^2=((x+4)-x)((x+4)+x)=4(2x+4)=8(x+2)$.",
          },
          {
            part: "c",
            explanation:
              "For $x=6$, the remaining area is $8(6+2)=64\\text{ m}^2$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Linear Equations in Two Variables",
    subtopic:
      "Solutions as ordered pairs, graphing linear equations, slope-intercept form, and contextual equations.",
    mc: [
      {
        questionLatex: L`A point is on the line $2x+y=7$ only if its coordinates make the equation true. Which ordered pair lies on the line?`,
        difficulty: 2,
        skillTags: ["check_ordered_pair_solution"],
        choices: [L`$(3,2)$`, L`$(1,4)$`, L`$(2,3)$`, L`$(0,5)$`],
        correctLetter: "C",
        rationales: {
          A: "$2(3)+2=8$, not $7$.",
          B: "$2(1)+4=6$, not $7$.",
          D: "$2(0)+5=5$, not $7$.",
        },
        hints: [
          "Substitute $x$ and $y$ from each ordered pair.",
          "Remember the first coordinate is $x$.",
          "Check whether the left side becomes 7.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For $(2,3)$, the equation gives",
            math: "2(2)+3=7",
          },
        ],
      },
      {
        questionLatex: L`A class has $x$ boys and $y$ girls. If there are $38$ students in all, the linear equation modelling the total is`,
        difficulty: 2,
        skillTags: ["form_linear_equation"],
        choices: [L`$x-y=38$`, L`$38x+y=0$`, L`$xy=38$`, L`$x+y=38$`],
        correctLetter: "D",
        rationales: {
          A: "The total uses addition, not difference.",
          B: "This multiplies boys by 38 without a reason.",
          C: "The product of boys and girls is not the total number of students.",
        },
        hints: [
          "Total means add the two groups.",
          "Boys plus girls equals the class size.",
          "Use $x+y$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The two groups together make 38 students.",
            math: "x+y=38",
          },
        ],
      },
      {
        questionLatex: L`In the equation $y=2x+3$, the slope and $y$-intercept are respectively`,
        difficulty: 2,
        skillTags: ["slope_intercept_form"],
        choices: [
          L`$2$ and $3$`,
          L`$3$ and $2$`,
          L`$2$ and $-3$`,
          L`$-2$ and $3$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This swaps the coefficient of $x$ and the constant.",
          C: "The intercept is positive 3.",
          D: "The slope is positive 2.",
        },
        hints: [
          "Compare with $y=mx+c$.",
          "$m$ is the slope.",
          "$c$ is the $y$-intercept.",
        ],
        solution: [
          {
            step: 1,
            explanation: "In $y=mx+c$, slope is $m$ and intercept is $c$.",
            math: "m=2,\\ c=3",
          },
        ],
      },
      {
        questionLatex: L`Which equation matches the line shown in the graph?`,
        difficulty: 2,
        figure: lineGraphFigure,
        skillTags: ["graph_to_equation", "slope_intercept_form"],
        choices: [L`$y=2x+1$`, L`$y=x+2$`, L`$y=x-2$`, L`$y=2x+2$`],
        correctLetter: "B",
        rationales: {
          A: "This has a steeper slope than the graph.",
          C: "This has the wrong $y$-intercept.",
          D: "This passes through $(0,2)$ but rises too fast.",
        },
        hints: [
          "Read the $y$-intercept.",
          "Use two plotted points to find the slope.",
          "The line rises 2 units when $x$ increases by 2.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The graph crosses the $y$-axis at $2$ and has slope $1$.",
            math: "y=x+2",
          },
        ],
      },
      {
        questionLatex: L`How many real ordered-pair solutions does the equation $x+y=5$ have?`,
        difficulty: 2,
        skillTags: ["infinite_solutions_single_linear_equation"],
        choices: [
          "Exactly one",
          "Exactly two",
          "Infinitely many",
          "No solution",
        ],
        correctLetter: "C",
        rationales: {
          A: "A single line contains infinitely many points.",
          B: "Two examples do not exhaust all possible points.",
          D: "For example, $(0,5)$ is a solution.",
        },
        hints: [
          "Try choosing different values of $x$.",
          "Each chosen $x$ gives a matching $y$.",
          "The graph is a full line.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For any real $x$, $y=5-x$ gives a solution, so there are infinitely many solutions.",
          },
        ],
      },
      {
        questionLatex: L`A fruit seller packs $x$ mangoes and $y$ apples in a box. Each box has $12$ fruits. If mangoes must be at least $4$, which ordered pair is possible?`,
        difficulty: 3,
        skillTags: ["linear_equation_restricted_values"],
        choices: [L`$(3,9)$`, L`$(8,5)$`, L`$(6,4)$`, L`$(5,7)$`],
        correctLetter: "D",
        rationales: {
          A: "The total is 12, but mangoes are fewer than 4.",
          B: "The mango and apple counts add to 13, not 12.",
          C: "The mango condition is satisfied, but the total is 10, not 12.",
        },
        hints: [
          "Check the sum first.",
          "Then check the restriction on mangoes.",
          "Both conditions must hold.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For $(5,7)$, the total is $12$ and mangoes are at least $4$.",
            math: "5+7=12",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A graph is supposed to pass through $(1,4)$ for the equation $3x+y=7$. Check whether the point really lies on the graph.`,
        difficulty: 2,
        skillTags: ["check_ordered_pair_solution"],
        parts: singlePart("a", "Answer yes or no with substitution.", 1),
        hints: [
          "Substitute $x=1$ and $y=4$.",
          "Compute $3(1)+4$.",
          "Compare with 7.",
        ],
        rubric: singleRubric("a", 1, "States yes and shows $3(1)+4=7$."),
        commonErrors: ["Substituting the coordinates in reverse order."],
        workedSolution: [
          {
            part: "a",
            explanation: "Yes. $3(1)+4=7$, so $(1,4)$ satisfies the equation.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Write two solutions of $x+2y=8$.`,
        difficulty: 2,
        skillTags: ["find_solutions_linear_equation"],
        parts: singlePart("a", "Give any two ordered pairs.", 1),
        hints: [
          "Choose simple values of $y$.",
          "If $y=0$, then $x=8$.",
          "If $y=1$, then $x=6$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Gives two correct ordered pairs such as $(8,0)$ and $(6,1)$.",
        ),
        commonErrors: ["Giving only $x$-values, not ordered pairs."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Two possible solutions are $(8,0)$ and $(6,1)$, since $8+2(0)=8$ and $6+2(1)=8$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Rewrite $2x+3y=12$ in the form $y=mx+c$.`,
        difficulty: 2,
        skillTags: ["slope_intercept_form"],
        parts: singlePart("a", "Solve for $y$.", 2),
        hints: [
          "Move $2x$ to the other side.",
          "Divide every term by 3.",
          "Keep the sign of the $x$ term.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Isolates $3y=12-2x$." },
            { part: "a", points: 1, description: "Writes $y=-\\frac23x+4$." },
          ],
        },
        commonErrors: [
          "Dividing only the constant by 3.",
          "Losing the negative sign.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$2x+3y=12$ gives $3y=12-2x$, so $y=-\\frac23x+4$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find three ordered-pair solutions of $x+y=6$ and state what their graph forms.`,
        difficulty: 2,
        skillTags: ["solutions_graph_line"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write three ordered-pair solutions.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State the shape of the graph.",
            points: 1,
          },
        ],
        hints: [
          "Choose easy values of $x$.",
          "Find the matching $y$ each time.",
          "Solutions of a linear equation lie on a straight line.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Gives three valid pairs such as $(0,6),(3,3),(6,0)$.",
            },
            {
              part: "b",
              points: 1,
              description: "States that the graph is a straight line.",
            },
          ],
        },
        commonErrors: [
          "Giving pairs whose sum is not 6.",
          "Saying the graph is only three points.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Three solutions are $(0,6),(3,3),(6,0)$.",
          },
          { part: "b", explanation: "All solutions lie on one straight line." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A taxi charges Rs. $30$ as a fixed charge and Rs. $12$ per kilometre. Let $y$ be the fare for $x$ kilometres. Write the equation and find the fare for $8$ km.`,
        difficulty: 3,
        skillTags: ["linear_equation_context", "evaluate_linear_model"],
        parts: [
          { letter: "a", promptMarkdown: "Write the equation.", points: 1 },
          { letter: "b", promptMarkdown: "Find $y$ when $x=8$.", points: 1 },
        ],
        hints: [
          "Fixed charge becomes the intercept.",
          "The per-kilometre charge multiplies $x$.",
          "Substitute $x=8$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Writes $y=12x+30$." },
            { part: "b", points: 1, description: "Finds Rs. $126$." },
          ],
        },
        commonErrors: [
          "Writing $y=30x+12$ by swapping fixed and variable charges.",
        ],
        workedSolution: [
          { part: "a", explanation: "The fare equation is $y=12x+30$." },
          { part: "b", explanation: "For $x=8$, $y=12(8)+30=126$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school fair sells entry tickets for Rs. $10$ each and game coupons for Rs. $5$ each. A student spends Rs. $60$ in all.`,
        difficulty: 3,
        skillTags: ["linear_equation_context", "restricted_integer_solutions"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "If $x$ is the number of tickets and $y$ is the number of coupons, write the equation.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write two non-negative integer solutions.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why negative solutions are not useful in this context.",
            points: 1,
          },
        ],
        hints: [
          "Multiply price by quantity.",
          "Try small ticket counts.",
          "Counts of objects cannot be negative.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $10x+5y=60$ or $2x+y=12$.",
            },
            {
              part: "b",
              points: 2,
              description: "Gives two valid non-negative integer pairs.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains the contextual restriction.",
            },
          ],
        },
        commonErrors: [
          "Writing only one solution and assuming uniqueness.",
          "Using negative counts in a buying context.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The equation is $10x+5y=60$, or $2x+y=12$.",
          },
          {
            part: "b",
            explanation: "Two possible solutions are $(0,12)$ and $(3,6)$.",
          },
          {
            part: "c",
            explanation:
              "Negative values would mean buying a negative number of tickets or coupons, which is not possible.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Pairs of Linear Equations",
    subtopic:
      "Graphical and algebraic solution of two linear equations, consistency, and simple contexts.",
    mc: [
      {
        questionLatex: L`The solution of $x+y=9$ and $x-y=1$ is`,
        difficulty: 2,
        skillTags: ["solve_pair_elimination"],
        choices: [L`$(5,4)$`, L`$(4,5)$`, L`$(9,1)$`, L`$(1,9)$`],
        correctLetter: "A",
        rationales: {
          B: "This satisfies the sum but gives $x-y=-1$.",
          C: "The sum is 10, not 9.",
          D: "The sum is 10 and the difference is -8.",
        },
        hints: [
          "Add the two equations.",
          "This eliminates $y$.",
          "Then substitute back.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the equations.",
            math: "2x=10\\Rightarrow x=5,\\quad y=4",
          },
        ],
      },
      {
        questionLatex: L`From the graph, the solution of the pair of lines is`,
        difficulty: 2,
        figure: pairLinesFigure,
        skillTags: ["graphical_solution_pair"],
        choices: [L`$(3,2)$`, L`$(2,3)$`, L`$(0,2)$`, L`$(4,0)$`],
        correctLetter: "B",
        rationales: {
          A: "This swaps the $x$- and $y$-coordinates.",
          C: "This is a point on only one line, not the intersection.",
          D: "This is not where the two lines cross.",
        },
        hints: [
          "A graphical solution is the intersection point.",
          "Read the $x$-coordinate first.",
          "Then read the $y$-coordinate.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The two lines cross at $x=2$ and $y=3$.",
            math: "(2,3)",
          },
        ],
      },
      {
        questionLatex: L`The pair $y=2x+1$ and $y=2x-3$ has`,
        difficulty: 2,
        skillTags: ["parallel_lines_no_solution"],
        choices: [
          "Exactly one solution",
          "Infinitely many solutions",
          "No solution",
          "Only the solution $(0,0)$",
        ],
        correctLetter: "C",
        rationales: {
          A: "The slopes are equal but the intercepts differ, so the lines never meet.",
          B: "Infinitely many solutions occur when the two equations represent the same line.",
          D: "$(0,0)$ satisfies neither equation.",
        },
        hints: [
          "Compare slopes and intercepts.",
          "Same slope means parallel or same line.",
          "Different intercepts mean distinct parallel lines.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both lines have slope $2$, but their intercepts are different.",
            math: "1\\ne -3",
          },
        ],
      },
      {
        questionLatex: L`For the pair $2x+y=11$ and $x+y=7$, the value of $x$ is`,
        difficulty: 2,
        skillTags: ["solve_pair_elimination"],
        choices: [L`$3$`, L`$7$`, L`$11$`, L`$4$`],
        correctLetter: "D",
        rationales: {
          A: "This is the value of $y$, not $x$.",
          B: "This is the sum equation value.",
          C: "This is the first equation constant.",
        },
        hints: [
          "Subtract the second equation from the first.",
          "The $y$ terms cancel.",
          "Then solve for $x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Subtract equations.",
            math: "(2x+y)-(x+y)=11-7\\Rightarrow x=4",
          },
        ],
      },
      {
        questionLatex: L`Two notebooks and one pen cost Rs. $70$. One notebook and one pen cost Rs. $45$. The cost of one notebook is`,
        difficulty: 3,
        skillTags: ["pair_context_elimination"],
        choices: [L`Rs. $25$`, L`Rs. $20$`, L`Rs. $30$`, L`Rs. $45$`],
        correctLetter: "A",
        rationales: {
          B: "This does not satisfy both cost statements.",
          C: "Then one pen would cost Rs. 15, but two notebooks and one pen would be Rs. 75.",
          D: "This is the total cost of one notebook and one pen.",
        },
        hints: [
          "Let notebook cost be $n$ and pen cost be $p$.",
          "Write $2n+p=70$ and $n+p=45$.",
          "Subtract the equations.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Subtract the second equation from the first.",
            math: "(2n+p)-(n+p)=70-45\\Rightarrow n=25",
          },
        ],
      },
      {
        questionLatex: L`Assertion: If two straight lines intersect at exactly one point, the corresponding pair of linear equations has a unique solution. Reason: A common point satisfies both equations.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "graphical_solution_pair"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason explains why the intersection point is the solution.",
          C: "The reason is true: a point on both lines satisfies both equations.",
          D: "The assertion is true for intersecting non-parallel lines.",
        },
        hints: [
          "Think of each equation as a line.",
          "A solution must lie on both lines.",
          "Exactly one intersection means exactly one common point.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A solution of a pair is an ordered pair satisfying both equations, so the single intersection point is the unique solution.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Solve: $x+y=5$ and $x-y=1$.`,
        difficulty: 2,
        skillTags: ["solve_pair_elimination"],
        parts: singlePart("a", "Give the ordered pair.", 1),
        hints: [
          "Add the two equations.",
          "Find $x$ first.",
          "Substitute to find $y$.",
        ],
        rubric: singleRubric("a", 1, "Finds $(3,2)$."),
        commonErrors: ["Giving $x=3$ only without finding $y$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Adding gives $2x=6$, so $x=3$. Then $3+y=5$, so $y=2$. The solution is $(3,2)$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In a graph of two linear equations, what does their intersection point represent?`,
        difficulty: 1,
        skillTags: ["graphical_solution_pair"],
        parts: singlePart("a", "State the meaning.", 1),
        hints: [
          "The point lies on both lines.",
          "A point on a line satisfies that equation.",
          "So it satisfies both equations.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States that it represents the common solution of the two equations.",
        ),
        commonErrors: [
          "Saying it is only the point where the lines cross without linking to solution.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The intersection point is the ordered pair that satisfies both equations, so it is the solution of the pair.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Solve by substitution: $y=x+2$ and $x+y=10$.`,
        difficulty: 2,
        skillTags: ["solve_pair_substitution"],
        parts: singlePart("a", "Show the substitution.", 2),
        hints: [
          "Substitute $y=x+2$ into the second equation.",
          "Solve for $x$.",
          "Then find $y$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Substitutes to get $x+x+2=10$ and finds $x=4$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds $y=6$ and writes $(4,6)$.",
            },
          ],
        },
        commonErrors: ["Substituting $x=y+2$ instead of the given expression."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Substitute $y=x+2$ in $x+y=10$: $x+x+2=10$, so $2x=8$ and $x=4$. Then $y=4+2=6$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Solve by elimination: $3x+2y=16$ and $x+2y=8$.`,
        difficulty: 2,
        skillTags: ["solve_pair_elimination"],
        parts: singlePart("a", "Show the elimination.", 2),
        hints: [
          "Subtract the second equation from the first.",
          "The $2y$ terms cancel.",
          "Substitute $x$ into one equation.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $x=4$." },
            { part: "a", points: 1, description: "Finds $y=2$." },
          ],
        },
        commonErrors: ["Adding the equations when subtraction is simpler."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Subtracting gives $2x=8$, so $x=4$. Then $4+2y=8$, so $y=2$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`At a school canteen, combo A has $2$ sandwiches and $1$ juice for Rs. $90$. Combo B has $3$ sandwiches and $2$ juices for Rs. $145$. A group has Rs. $300$ and wants $5$ sandwiches and $4$ juices.`,
        difficulty: 4,
        skillTags: ["pair_context_elimination"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write two equations using $s$ for one sandwich and $j$ for one juice.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the cost of one sandwich.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the cost of one juice.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Decide whether Rs. $300$ is enough for $5$ sandwiches and $4$ juices, and find the amount left or short.",
            points: 1,
          },
        ],
        hints: [
          "Translate each combo into one equation.",
          "Eliminate $j$ by comparing the two equations.",
          "Use the solved prices in the new order, not in either combo directly.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $2s+j=90$ and $3s+2j=145$.",
            },
            { part: "b", points: 1, description: "Finds $s=35$." },
            { part: "c", points: 1, description: "Finds $j=20$." },
            {
              part: "d",
              points: 1,
              description:
                "Computes Rs. $255$ for the new order and states that Rs. $45$ is left.",
            },
          ],
        },
        commonErrors: [
          "Using only one combo equation and guessing prices.",
          "Checking Rs. $300$ against one combo instead of the new order.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The combo equations are $2s+j=90$ and $3s+2j=145$.",
          },
          {
            part: "b",
            explanation:
              "Doubling the first equation gives $4s+2j=180$. Subtract $3s+2j=145$ to get $s=35$.",
          },
          { part: "c", explanation: "Then $2(35)+j=90$, so $j=20$." },
          {
            part: "d",
            explanation:
              "The new order costs $5(35)+4(20)=175+80=255$, so Rs. $300$ is enough and Rs. $45$ is left.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Decide whether the pair $2x+3y=12$ and $4x+6y=20$ is consistent. Give a reason.`,
        difficulty: 3,
        skillTags: ["consistency_of_pair", "parallel_lines"],
        parts: singlePart(
          "a",
          "State consistent or inconsistent with reason.",
          2,
        ),
        hints: [
          "Compare the left sides.",
          "The second left side is twice the first left side.",
          "Check whether the right side is also doubled.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Observes proportional left sides but non-proportional constants.",
            },
            {
              part: "a",
              points: 1,
              description: "States that the pair is inconsistent/no solution.",
            },
          ],
        },
        commonErrors: [
          "Thinking multiplying the left side by 2 is enough for the same line.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Doubling $2x+3y=12$ would give $4x+6y=24$, not $20$. The lines are parallel distinct lines, so the pair is inconsistent.",
          },
        ],
      },
    ],
  },
];

export const algebraTopics: Topic[] = topicSeeds.map(makeTopic);
