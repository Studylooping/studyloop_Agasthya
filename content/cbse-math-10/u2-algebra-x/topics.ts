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
const UNIT = "u2-algebra-x";
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Match the algebraic condition to the correct formula or equation before calculating.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class10_algebra_reasoning"),
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
      "uses_a_formula_without_checking_the_given_condition",
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

const polynomialZeroGraphFigure: ItemFigure = {
  type: "svg",
  title: "Parabola with two x-intercepts",
  description:
    "A coordinate graph of a quadratic curve crossing the x-axis at -2 and 3.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="100" y1="70" x2="460" y2="70"/>
    <line x1="100" y1="140" x2="460" y2="140"/>
    <line x1="100" y1="210" x2="460" y2="210"/>
    <line x1="100" y1="280" x2="460" y2="280"/>
    <line x1="140" y1="50" x2="140" y2="305"/>
    <line x1="180" y1="50" x2="180" y2="305"/>
    <line x1="220" y1="50" x2="220" y2="305"/>
    <line x1="260" y1="50" x2="260" y2="305"/>
    <line x1="300" y1="50" x2="300" y2="305"/>
    <line x1="340" y1="50" x2="340" y2="305"/>
    <line x1="380" y1="50" x2="380" y2="305"/>
    <line x1="420" y1="50" x2="420" y2="305"/>
  </g>
  <line x1="90" y1="210" x2="480" y2="210" stroke="#334155" stroke-width="2"/>
  <path d="M468 203 L480 210 L468 217" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="260" y1="48" x2="260" y2="315" stroke="#334155" stroke-width="2"/>
  <path d="M253 60 L260 48 L267 60" fill="none" stroke="#334155" stroke-width="2"/>
  <polyline points="100,70 140,140 180,210 220,250 260,270 280,272.5 300,270 340,250 380,210 420,140 460,70" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="180" cy="210" r="6" fill="#dc2626"/>
  <circle cx="380" cy="210" r="6" fill="#dc2626"/>
  <text x="171" y="236" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">-2</text>
  <text x="376" y="236" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">3</text>
  <text x="485" y="215" font-size="15" fill="#334155" font-family="Arial, sans-serif">x</text>
  <text x="268" y="58" font-size="15" fill="#334155" font-family="Arial, sans-serif">y</text>
  <text x="286" y="295" font-size="16" fill="#1d4ed8" font-family="Arial, sans-serif">y = p(x)</text>
</svg>`,
};

const pairLinesGraphFigure: ItemFigure = {
  type: "svg",
  title: "Two intersecting linear graphs",
  description:
    "A graph of two straight lines intersecting at a grid point in the first quadrant.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="300" x2="460" y2="300"/>
    <line x1="90" y1="260" x2="460" y2="260"/>
    <line x1="90" y1="220" x2="460" y2="220"/>
    <line x1="90" y1="180" x2="460" y2="180"/>
    <line x1="90" y1="140" x2="460" y2="140"/>
    <line x1="90" y1="100" x2="460" y2="100"/>
    <line x1="90" y1="60" x2="460" y2="60"/>
    <line x1="120" y1="40" x2="120" y2="310"/>
    <line x1="160" y1="40" x2="160" y2="310"/>
    <line x1="200" y1="40" x2="200" y2="310"/>
    <line x1="240" y1="40" x2="240" y2="310"/>
    <line x1="280" y1="40" x2="280" y2="310"/>
    <line x1="320" y1="40" x2="320" y2="310"/>
    <line x1="360" y1="40" x2="360" y2="310"/>
  </g>
  <line x1="80" y1="300" x2="480" y2="300" stroke="#334155" stroke-width="2"/>
  <path d="M468 293 L480 300 L468 307" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="120" y1="318" x2="120" y2="36" stroke="#334155" stroke-width="2"/>
  <path d="M113 48 L120 36 L127 48" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="120" y1="100" x2="320" y2="300" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  <line x1="140" y1="300" x2="260" y2="60" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>
  <circle cx="200" cy="180" r="7" fill="#16a34a"/>
  <text x="210" y="172" font-size="17" fill="#166534" font-family="Arial, sans-serif">P</text>
  <text x="326" y="292" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">x + y = 5</text>
  <text x="268" y="74" font-size="15" fill="#c2410c" font-family="Arial, sans-serif">2x - y = 1</text>
  <text x="118" y="324" font-size="13" fill="#334155" font-family="Arial, sans-serif">0</text>
  <text x="196" y="324" font-size="13" fill="#334155" font-family="Arial, sans-serif">2</text>
  <text x="96" y="184" font-size="13" fill="#334155" font-family="Arial, sans-serif">3</text>
  <text x="486" y="305" font-size="15" fill="#334155" font-family="Arial, sans-serif">x</text>
  <text x="128" y="48" font-size="15" fill="#334155" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Polynomials and Zeroes",
    subtopic:
      "Zeros of a polynomial, graph interpretation, and relation between zeroes and coefficients.",
    mc: [
      {
        questionLatex: L`The graph of $y=p(x)$ is shown. Which polynomial could be $p(x)$?`,
        difficulty: 2,
        figure: polynomialZeroGraphFigure,
        skillTags: ["polynomial_zero_graph", "quadratic_factor_form"],
        choices: [L`$x^2+x-6$`, L`$x^2-5x+6$`, L`$x^2-x-6$`, L`$x^2+x+6$`],
        correctLetter: "C",
        rationales: {
          A: "This polynomial has zeroes $2$ and $-3$, not $-2$ and $3$.",
          B: "This polynomial has zeroes $2$ and $3$; the negative intercept is missing.",
          D: "This has no real zero matching the two x-intercepts shown.",
        },
        hints: [
          "Read the x-intercepts from the graph.",
          "A polynomial with zeroes $-2$ and $3$ has factors $(x+2)$ and $(x-3)$.",
          "Expand $(x+2)(x-3)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The graph crosses the x-axis at $-2$ and $3$, so the factors are $(x+2)$ and $(x-3)$.",
            math: L`(x+2)(x-3)=x^2-x-6`,
          },
        ],
      },
      {
        questionLatex: L`If the zeroes of $2x^2-5x+k$ have product $3$, then $k$ is`,
        difficulty: 2,
        skillTags: ["zeroes_coefficients_product"],
        choices: [L`$3$`, L`$6$`, L`$8$`, L`$12$`],
        correctLetter: "B",
        rationales: {
          A: "This treats the product as $k$, but for $ax^2+bx+c$ it is $c/a$.",
          C: "This gives product $8/2=4$, so it is one step above the required product $3$.",
          D: "This doubles the required coefficient.",
        },
        hints: [
          "For $ax^2+bx+c$, product of zeroes is $c/a$.",
          "Here $a=2$ and $c=k$.",
          "Set $k/2=3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the product relation.",
            math: L`\alpha\beta=\frac{k}{2}=3`,
          },
          { step: 2, explanation: "Solve for $k$.", math: L`k=6` },
        ],
      },
      {
        questionLatex: L`Assertion (A): If the sum of the zeroes of $ax^2+bx+c$ is $0$, then $b=0$. Reason (R): The sum of the zeroes is $-\frac{b}{a}$, where $a\ne0$. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "zeroes_coefficients_sum"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The formula in the Reason directly gives $-b/a=0$, hence $b=0$.",
          C: "The Reason is the standard coefficient relation.",
          D: "The Assertion is true because $a\\ne0$.",
        },
        hints: [
          "Use the coefficient relation for the sum.",
          "Since $a\\ne0$, a fraction is zero only when its numerator is zero.",
          "$-b/a=0$ implies $b=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true, and the formula for the sum explains the assertion.",
            math: L`-\frac{b}{a}=0\Rightarrow b=0`,
          },
        ],
      },
      {
        questionLatex: L`The zeroes of $x^2+px+q$ differ by $4$ and have sum $6$. The value of $q$ is`,
        difficulty: 3,
        skillTags: ["zeroes_coefficients_application"],
        choices: [L`$-5$`, L`$1$`, L`$-6$`, L`$5$`],
        correctLetter: "D",
        rationales: {
          A: "The product of the two zeroes is positive, not negative.",
          B: "This would come from zeroes $1$ and $1$, not numbers differing by $4$.",
          C: "This confuses the coefficient $p$ with the product $q$.",
        },
        hints: [
          "Let the zeroes be $r$ and $r+4$.",
          "Their sum is $2r+4=6$.",
          "Then $q$ equals the product of the zeroes.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the zeroes from the sum and difference.",
            math: L`r+(r+4)=6\Rightarrow r=1`,
          },
          {
            step: 2,
            explanation: "The zeroes are $1$ and $5$, so $q$ is their product.",
            math: L`q=1\cdot5=5`,
          },
        ],
      },
      {
        questionLatex: L`Can the zeroes of $2x^2+kx+3$ be reciprocals of each other for any real value of $k$?`,
        difficulty: 3,
        skillTags: ["zeroes_coefficients_reasoning", "reciprocal_zeroes"],
        choices: [
          "Yes, when $k=-5$.",
          "No, because the product of the zeroes is always $3/2$.",
          "Yes, only when $k=0$.",
          "No, because the sum of the zeroes must be $0$.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Changing $k$ changes only the sum, not the product $c/a$.",
          C: "Even when $k=0$, the product is still $3/2$, not $1$.",
          D: "Reciprocal zeroes require product $1$, not sum $0$.",
        },
        hints: [
          "If two non-zero numbers are reciprocals, their product is $1$.",
          "For $2x^2+kx+3$, product of zeroes is $c/a$.",
          "$c/a=3/2$ for every $k$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The product of the zeroes is fixed, regardless of $k$.",
            math: L`\alpha\beta=\frac{3}{2}`,
          },
          {
            step: 2,
            explanation:
              "Reciprocal zeroes would require product $1$, so this cannot happen.",
            math: null,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the sum of the zeroes of $5x^2-9x+2$.`,
        difficulty: 1,
        skillTags: ["zeroes_coefficients_sum"],
        parts: singlePart("a", "Give the sum of the zeroes.", 1),
        hints: [
          "Use the formula for $ax^2+bx+c$.",
          "The sum is $-b/a$.",
          "Here $a=5$ and $b=-9$.",
        ],
        rubric: singleRubric("a", 1, "Answers $9/5$."),
        commonErrors: ["Using $b/a$ instead of $-b/a$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $5x^2-9x+2$, the sum of zeroes is $-b/a=-(-9)/5=9/5$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Write a monic quadratic polynomial whose zeroes are $3$ and $-4$.`,
        difficulty: 1,
        skillTags: ["quadratic_from_zeroes"],
        parts: singlePart("a", "Give one polynomial.", 1),
        hints: [
          "Use factors from the zeroes.",
          "Zero $3$ gives factor $(x-3)$.",
          "Zero $-4$ gives factor $(x+4)$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Answers $x^2+x-12$ or an equivalent monic polynomial.",
        ),
        commonErrors: ["Writing $(x+3)(x-4)$ by reversing the signs."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The required monic polynomial is $(x-3)(x+4)=x^2+x-12$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $p(x)=x^2-6x+m$, one zero is twice the other. Find $m$.`,
        difficulty: 3,
        skillTags: ["zeroes_coefficients_application"],
        parts: singlePart("a", "Find $m$ with reasoning.", 3),
        hints: [
          "Let the zeroes be $r$ and $2r$.",
          "Use the sum of zeroes.",
          "Then use their product.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Sets zeroes as $r$ and $2r$.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses sum $3r=6$ to get $r=2$.",
            },
            { part: "a", points: 1, description: "Finds $m=2\\cdot4=8$." },
          ],
        },
        commonErrors: [
          "Using coefficient $-6$ directly as the product.",
          "Forgetting that $m$ is the product for a monic quadratic.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let the zeroes be $r$ and $2r$. Their sum is $6$, so $3r=6$ and $r=2$. The zeroes are $2$ and $4$, hence $m=2\\cdot4=8$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Can the zeroes of $2x^2+5x+7$ be reciprocals of each other? Justify using the coefficient relation.`,
        difficulty: 3,
        skillTags: ["zeroes_coefficients_reasoning", "reciprocal_zeroes"],
        parts: singlePart("a", "Decide and justify.", 3),
        hints: [
          "Reciprocal zeroes have product $1$.",
          "Use $c/a$ for the product of zeroes.",
          "Compare $7/2$ with $1$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States reciprocal zeroes require product $1$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds product of zeroes as $7/2$.",
            },
            { part: "a", points: 1, description: "Concludes no." },
          ],
        },
        commonErrors: [
          "Checking the sum instead of the product.",
          "Assuming all quadratics can have reciprocal zeroes after changing signs.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $2x^2+5x+7$, the product of zeroes is $c/a=7/2$. If zeroes were reciprocals, their product would be $1$. Since $7/2\\ne1$, the zeroes cannot be reciprocals.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A designer models the area of a rectangular poster by $A(x)=x^2+5x+6$, where the side lengths are linear expressions in $x$.`,
        difficulty: 3,
        skillTags: ["polynomial_factorisation", "case_based_reasoning"],
        parts: [
          { letter: "a", promptMarkdown: "Factorise $A(x)$.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the zeroes of $A(x)$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why the zeroes are algebraic information, not possible poster dimensions in this context.",
            points: 2,
          },
        ],
        hints: [
          "Find two numbers with sum $5$ and product $6$.",
          "Use the factors to read the zeroes.",
          "Poster dimensions cannot be negative.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Factorises as $(x+2)(x+3)$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds zeroes $-2$ and $-3$.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains that zeroes make the area expression zero, but negative side lengths are not physical poster dimensions.",
            },
          ],
        },
        commonErrors: [
          "Treating negative zeroes as valid side lengths.",
          "Writing zeroes as $2$ and $3$ by ignoring factor signs.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$A(x)=x^2+5x+6=(x+2)(x+3)$.",
          },
          {
            part: "b",
            explanation: "The zeroes are $x=-2$ and $x=-3$.",
          },
          {
            part: "c",
            explanation:
              "The zeroes tell where the algebraic area expression becomes zero. In the poster context, negative side lengths are impossible, so these zeroes are not possible dimensions.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Pair of Linear Equations",
    subtopic:
      "Graphical meaning, consistency, algebraic solution, and equation formation from contexts.",
    mc: [
      {
        questionLatex: L`The graph shows the lines $x+y=5$ and $2x-y=1$. Their solution is`,
        difficulty: 2,
        figure: pairLinesGraphFigure,
        skillTags: ["linear_pair_graphical_solution"],
        choices: [L`$(3,2)$`, L`$(1,4)$`, L`$(4,1)$`, L`$(2,3)$`],
        correctLetter: "D",
        rationales: {
          A: "This swaps the coordinates of the intersection point.",
          B: "This lies on $x+y=5$ but not on $2x-y=1$.",
          C: "This lies on $x+y=5$ but not on the orange line.",
        },
        hints: [
          "The solution is the point where the two lines intersect.",
          "Read the grid coordinates of point $P$.",
          "Check the point in both equations.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The lines intersect at $P=(2,3)$.",
            math: L`2+3=5,\quad 2(2)-3=1`,
          },
        ],
      },
      {
        questionLatex: L`For which value of $k$ do the equations $2x+3y=7$ and $4x+6y=k$ have infinitely many solutions?`,
        difficulty: 3,
        skillTags: ["linear_pair_consistency"],
        choices: [L`$7$`, L`$12$`, L`$14$`, L`$28$`],
        correctLetter: "C",
        rationales: {
          A: "For $k=7$, the constant ratio is $1$, not the same as the coefficient ratio $1/2$.",
          B: "For $k=12$, the lines are parallel and distinct, so there is no solution.",
          D: "For $k=28$, the constant ratio is $1/4$, not $1/2$.",
        },
        hints: [
          "Compare $a_1/a_2$, $b_1/b_2$, and $c_1/c_2$.",
          "The coefficient ratios are both $1/2$.",
          "Infinitely many solutions require the constant ratio to also be $1/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The equations represent the same line when all three ratios are equal.",
            math: L`\frac{2}{4}=\frac{3}{6}=\frac{7}{k}=\frac12`,
          },
          {
            step: 2,
            explanation: "Solving $7/k=1/2$ gives the required value.",
            math: L`k=14`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Coincident lines give infinitely many solutions. Reason (R): For coincident lines, $\frac{a_1}{a_2}=\frac{b_1}{b_2}=\frac{c_1}{c_2}$. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "linear_pair_consistency"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The equal-ratio condition is exactly the algebraic test for coincident lines.",
          C: "The equal-ratio condition is true for coincident lines.",
          D: "The Assertion is true because the same line contains infinitely many points.",
        },
        hints: [
          "Coincident lines are the same line.",
          "Every point on that line satisfies both equations.",
          "The ratio test identifies this case.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true, and the Reason explains the Assertion.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`Two adult tickets and three student tickets cost Rs $230$. Three adult tickets and two student tickets cost Rs $270$. The cost of one adult ticket is`,
        difficulty: 3,
        skillTags: ["linear_pair_word_problem"],
        choices: [L`Rs $50$`, L`Rs $70$`, L`Rs $80$`, L`Rs $100$`],
        correctLetter: "B",
        rationales: {
          A: "This does not satisfy both ticket-cost equations.",
          C: "This makes the first bill too high when paired with the correct student price.",
          D: "This treats the adult ticket as if the first bill alone decided it; it fails the second bill $3a+2s=270$.",
        },
        hints: [
          "Let adult price be $a$ and student price be $s$.",
          "Form $2a+3s=230$ and $3a+2s=270$.",
          "Subtract the equations after aligning terms.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set up the equations.",
            math: L`2a+3s=230,\quad 3a+2s=270`,
          },
          {
            step: 2,
            explanation: "Solving gives the ticket prices.",
            math: L`a-s=40,\quad s=30,\quad a=70`,
          },
        ],
      },
      {
        questionLatex: L`For which value of $\lambda$ is the pair $\lambda x+2y=5$ and $3x+6y=9$ not a unique-solution pair?`,
        difficulty: 3,
        skillTags: ["linear_pair_parameter", "consistency_condition"],
        choices: [L`$1$`, L`$2$`, L`$3$`, L`$6$`],
        correctLetter: "A",
        rationales: {
          B: "For $\\lambda=2$, the coefficient ratios are not equal, so the pair has a unique solution.",
          C: "For $\\lambda=3$, the first coefficient ratio is $1$, not $1/3$.",
          D: "For $\\lambda=6$, the first coefficient ratio is $2$, not $1/3$.",
        },
        hints: [
          "A unique solution requires $a_1/a_2\\ne b_1/b_2$.",
          "Here $b_1/b_2=2/6=1/3$.",
          "Set $\\lambda/3=1/3$ for the non-unique case.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The pair is not unique when the coefficient ratios are equal.",
            math: L`\frac{\lambda}{3}=\frac{2}{6}=\frac13\Rightarrow \lambda=1`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the number of solutions of $x+2y=4$ and $2x+4y=8$.`,
        difficulty: 1,
        skillTags: ["linear_pair_consistency"],
        parts: singlePart("a", "State the number of solutions.", 1),
        hints: [
          "Compare the second equation with the first.",
          "The second equation is twice the first.",
          "They represent the same line.",
        ],
        rubric: singleRubric("a", 1, "States infinitely many solutions."),
        commonErrors: [
          "Calling the pair inconsistent because there are two equations.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $2x+4y=8$ is exactly twice $x+2y=4$, both equations represent the same line. Therefore, there are infinitely many solutions.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Solve $x+y=9$ and $x-y=1$.`,
        difficulty: 1,
        skillTags: ["linear_pair_elimination"],
        parts: singlePart("a", "Give $(x,y)$.", 1),
        hints: [
          "Add the two equations.",
          "The $y$ terms cancel.",
          "Then substitute to find $y$.",
        ],
        rubric: singleRubric("a", 1, "Answers $(5,4)$."),
        commonErrors: ["Swapping the values of $x$ and $y$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Adding the equations gives $2x=10$, so $x=5$. Then $5+y=9$, so $y=4$. Therefore, $(x,y)=(5,4)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Solve the pair $3x+2y=18$ and $x+y=7$ by elimination.`,
        difficulty: 2,
        skillTags: ["linear_pair_elimination"],
        parts: singlePart("a", "Find $x$ and $y$.", 2),
        hints: [
          "Multiply $x+y=7$ by $2$ or $3$.",
          "Eliminate one variable.",
          "Substitute back into either equation.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly eliminates one variable.",
            },
            { part: "a", points: 1, description: "Finds $x=4$, $y=3$." },
          ],
        },
        commonErrors: [
          "Subtracting equations without matching coefficients.",
          "Finding one variable but not substituting back.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "From $x+y=7$, $2x+2y=14$. Subtract this from $3x+2y=18$ to get $x=4$. Then $4+y=7$, so $y=3$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two pens and three notebooks cost Rs $190$. Three pens and two notebooks cost Rs $160$. Find the cost of one pen and one notebook.`,
        difficulty: 3,
        skillTags: ["linear_pair_word_problem"],
        parts: singlePart("a", "Form equations and solve.", 3),
        hints: [
          "Let the pen cost be $p$ and notebook cost be $n$.",
          "Form two linear equations.",
          "Subtract them to relate $n$ and $p$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Forms $2p+3n=190$ and $3p+2n=160$.",
            },
            {
              part: "a",
              points: 1,
              description: "Solves for one variable correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds pen Rs $20$ and notebook Rs $50$.",
            },
          ],
        },
        commonErrors: [
          "Assigning one variable to the total cost instead of item cost.",
          "Forgetting to check both bills.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let pen cost be $p$ and notebook cost be $n$. Then $2p+3n=190$ and $3p+2n=160$. Subtracting gives $n-p=30$, so $n=p+30$. Substituting into $2p+3n=190$ gives $5p+90=190$, so $p=20$ and $n=50$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A taxi fare has a fixed charge plus a constant charge per kilometre. An $8$ km trip costs Rs $140$, and a $15$ km trip costs Rs $245$.`,
        difficulty: 3,
        skillTags: ["linear_pair_case_application", "modelling"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Let the fixed charge be $f$ and charge per km be $r$. Form two equations.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find $f$ and $r$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the fare for a $20$ km trip.",
            points: 1,
          },
        ],
        hints: [
          "Fare = fixed charge + distance times rate.",
          "Subtract the two equations to find $r$.",
          "Use the model for $20$ km.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Forms $f+8r=140$ and $f+15r=245$.",
            },
            { part: "b", points: 2, description: "Finds $r=15$ and $f=20$." },
            { part: "c", points: 1, description: "Finds fare Rs $320$." },
          ],
        },
        commonErrors: [
          "Treating the fixed charge as part of the per-km rate.",
          "Using direct proportion and ignoring the fixed charge.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The equations are $f+8r=140$ and $f+15r=245$.",
          },
          {
            part: "b",
            explanation:
              "Subtracting gives $7r=105$, so $r=15$. Then $f+8(15)=140$, so $f=20$.",
          },
          {
            part: "c",
            explanation: "For $20$ km, fare is $20+20(15)=320$ rupees.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Quadratic Equations",
    subtopic:
      "Standard form, factorisation, quadratic formula, discriminant, and contextual equations.",
    mc: [
      {
        questionLatex: L`The roots of $x^2-7x+12=0$ are`,
        difficulty: 1,
        skillTags: ["quadratic_factorisation"],
        choices: [L`$2,6$`, L`$3,4$`, L`$-3,-4$`, L`$1,12$`],
        correctLetter: "B",
        rationales: {
          A: "These multiply to $12$ but add to $8$, not $7$.",
          C: "These have the correct product but the wrong sum sign.",
          D: "These multiply to $12$ but add to $13$.",
        },
        hints: [
          "Find two numbers whose product is $12$ and sum is $7$.",
          "Factorise the quadratic.",
          "$x^2-7x+12=(x-3)(x-4)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Factorise the quadratic.",
            math: L`x^2-7x+12=(x-3)(x-4)`,
          },
          { step: 2, explanation: "Set each factor to zero.", math: L`x=3,4` },
        ],
      },
      {
        questionLatex: L`The equation $2x^2-4x+3=0$ has`,
        difficulty: 2,
        skillTags: ["discriminant_nature_roots"],
        choices: [
          "two equal real roots",
          "two distinct real roots",
          "rational roots only",
          "no real roots",
        ],
        correctLetter: "D",
        rationales: {
          A: "Equal real roots require discriminant $0$, not a negative value.",
          B: "Distinct real roots require positive discriminant.",
          C: "The equation has no real roots, so rational roots are impossible.",
        },
        hints: [
          "Compute the discriminant $D=b^2-4ac$.",
          "Here $a=2$, $b=-4$, $c=3$.",
          "Check the sign of $D$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the discriminant.",
            math: L`D=(-4)^2-4(2)(3)=16-24=-8`,
          },
          {
            step: 2,
            explanation: "Since $D<0$, there are no real roots.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`A rectangle has breadth $x$ cm, length $(x+5)$ cm, and area $84$ sq cm. The quadratic equation for $x$ is`,
        difficulty: 2,
        skillTags: ["quadratic_modelling"],
        choices: [
          L`$x^2+5x+84=0$`,
          L`$x^2-5x-84=0$`,
          L`$x^2+5x-84=0$`,
          L`$2x+5=84$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The area equation is $x(x+5)=84$, so $84$ must be moved to the left as $-84$.",
          B: "This uses $x-5$ as the length; the stem says the length is $x+5$, so the middle term must be positive.",
          D: "Area uses product of length and breadth, not their sum.",
        },
        hints: [
          "Area of a rectangle is length times breadth.",
          "Set $x(x+5)=84$.",
          "Bring all terms to one side.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Translate the area condition.",
            math: L`x(x+5)=84`,
          },
          {
            step: 2,
            explanation: "Write in standard form.",
            math: L`x^2+5x-84=0`,
          },
        ],
      },
      {
        questionLatex: L`If $x^2-kx+16=0$ has equal roots and their sum is positive, then $k$ is`,
        difficulty: 3,
        skillTags: ["discriminant_equal_roots"],
        choices: [L`$8$`, L`$-8$`, L`$4$`, L`$16$`],
        correctLetter: "A",
        rationales: {
          B: "This gives equal roots, but their sum would be negative.",
          C: "This does not make the discriminant zero.",
          D: "This gives a positive sum but not equal roots.",
        },
        hints: [
          "Equal roots mean discriminant $0$.",
          "Compute $k^2-64=0$.",
          "Use the condition that the sum of roots is positive.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the equal-roots condition.",
            math: L`D=k^2-4(1)(16)=k^2-64=0`,
          },
          {
            step: 2,
            explanation:
              "So $k=8$ or $k=-8$. Since the sum of roots is $k$, choose $k=8$.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): If the discriminant of a quadratic equation is negative, the equation has two real roots. Reason (R): $\sqrt{D}$ is not real when $D<0$. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "discriminant_nature_roots"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The Assertion is false: a negative discriminant gives no real roots.",
          B: "The Assertion is false, so it cannot be a case where both Assertion and Reason are true.",
          C: "The Reason is true because square roots of negative numbers are not real in this syllabus.",
        },
        hints: [
          "Look separately at the Assertion and the Reason.",
          "A negative discriminant means the square-root part is not real.",
          "Therefore real roots do not exist.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The Assertion is false, while the Reason is true. Negative discriminant gives no real roots.",
            math: null,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the discriminant of $3x^2-2x+1=0$ and state the nature of its roots.`,
        difficulty: 2,
        skillTags: ["discriminant_nature_roots"],
        parts: singlePart("a", "Find $D$ and state the nature.", 2),
        hints: [
          "Use $D=b^2-4ac$.",
          "Here $a=3$, $b=-2$, $c=1$.",
          "Check whether $D$ is positive, zero, or negative.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $D=-8$." },
            { part: "a", points: 1, description: "States no real roots." },
          ],
        },
        commonErrors: ["Using $b^2+4ac$ instead of $b^2-4ac$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$D=(-2)^2-4(3)(1)=4-12=-8$. Thus $D=-8$. Since $D<0$, the equation has no real roots.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Write $x(x+6)=40$ in standard quadratic form.`,
        difficulty: 1,
        skillTags: ["quadratic_standard_form"],
        parts: singlePart("a", "Give the standard form.", 1),
        hints: [
          "Expand the left side.",
          "Move $40$ to the left.",
          "Standard form is $ax^2+bx+c=0$.",
        ],
        rubric: singleRubric("a", 1, "Answers $x^2+6x-40=0$."),
        commonErrors: [
          "Writing $x^2+6x=40$ and not converting to standard form.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$x(x+6)=40$ gives $x^2+6x=40$, hence $x^2+6x-40=0$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Solve $x^2-5x-14=0$ by factorisation.`,
        difficulty: 2,
        skillTags: ["quadratic_factorisation"],
        parts: singlePart("a", "Find both roots.", 2),
        hints: [
          "Find two numbers with product $-14$ and sum $-5$.",
          "Split the middle term.",
          "Set each factor to zero.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Factorises as $(x-7)(x+2)$.",
            },
            { part: "a", points: 1, description: "Finds roots $7$ and $-2$." },
          ],
        },
        commonErrors: ["Using $7$ and $2$ without considering signs."],
        workedSolution: [
          {
            part: "a",
            explanation: "$x^2-5x-14=(x-7)(x+2)$. Thus $x=7$ or $x=-2$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Solve $2x^2-3x-2=0$ using the quadratic formula or factorisation.`,
        difficulty: 3,
        skillTags: ["quadratic_formula", "quadratic_factorisation"],
        parts: singlePart("a", "Find both roots.", 3),
        hints: [
          "You may factorise by splitting the middle term.",
          "Or use $x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$.",
          "The discriminant is $25$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Computes or factorises correctly.",
            },
            { part: "a", points: 1, description: "Finds root $2$." },
            { part: "a", points: 1, description: "Finds root $-1/2$." },
          ],
        },
        commonErrors: [
          "Forgetting the denominator $2a$ in the formula.",
          "Dropping the negative root.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Factorising, $2x^2-3x-2=(2x+1)(x-2)$. Hence $x=2$ or $x=-1/2$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A rectangular garden has length $4$ m more than its breadth and area $96$ sq m.`,
        difficulty: 3,
        skillTags: ["quadratic_case_application", "extraneous_root"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Form a quadratic equation for the breadth $x$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Solve the equation.", points: 2 },
          {
            letter: "c",
            promptMarkdown:
              "State the garden dimensions and explain which root is rejected.",
            points: 2,
          },
        ],
        hints: [
          "Let breadth be $x$ and length be $x+4$.",
          "Use area = length times breadth.",
          "A physical length cannot be negative.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Forms $x(x+4)=96$ or $x^2+4x-96=0$.",
            },
            {
              part: "b",
              points: 2,
              description: "Solves roots $8$ and $-12$.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Rejects $-12$ and states breadth $8$ m, length $12$ m.",
            },
          ],
        },
        commonErrors: [
          "Using perimeter instead of area.",
          "Keeping the negative root as a possible breadth.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let breadth be $x$ m. Then length is $(x+4)$ m, so $x(x+4)=96$, or $x^2+4x-96=0$.",
          },
          {
            part: "b",
            explanation: "$x^2+4x-96=(x-8)(x+12)=0$, so $x=8$ or $x=-12$.",
          },
          {
            part: "c",
            explanation:
              "Reject $x=-12$ because breadth cannot be negative. The breadth is $8$ m and the length is $12$ m.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Arithmetic Progressions",
    subtopic:
      "nth term, common difference, sum of first n terms, and AP modelling.",
    mc: [
      {
        questionLatex: L`The nth term of the AP $7,12,17,\ldots$ is`,
        difficulty: 1,
        skillTags: ["ap_nth_term"],
        choices: [L`$5n-2$`, L`$7n+5$`, L`$12n-5$`, L`$5n+2$`],
        correctLetter: "D",
        rationales: {
          A: "This gives $3$ when $n=1$, not $7$.",
          B: "This uses the first two terms as coefficients, not the AP formula.",
          C: "This gives $7$ for $n=1$ but the common difference would be $12$.",
        },
        hints: [
          "Here $a=7$ and $d=5$.",
          "Use $a_n=a+(n-1)d$.",
          "Simplify $7+5(n-1)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the nth-term formula.",
            math: L`a_n=7+(n-1)5=5n+2`,
          },
        ],
      },
      {
        questionLatex: L`The $20$th term of the AP with first term $3$ and common difference $4$ is`,
        difficulty: 1,
        skillTags: ["ap_nth_term"],
        choices: [L`$79$`, L`$80$`, L`$83$`, L`$76$`],
        correctLetter: "A",
        rationales: {
          B: "This uses $20d$ instead of $(20-1)d$.",
          C: "This adds one extra common difference.",
          D: "This uses only $18$ common differences; the $20$th term must add $19$ common differences to the first term.",
        },
        hints: [
          "Use $a_n=a+(n-1)d$.",
          "Here $n=20$.",
          "Compute $3+19\\cdot4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute in the nth-term formula.",
            math: L`a_{20}=3+19(4)=79`,
          },
        ],
      },
      {
        questionLatex: L`If the sum of the first $n$ terms of an AP is $S_n=3n^2+2n$, then its common difference is`,
        difficulty: 3,
        skillTags: ["ap_from_sum_formula"],
        choices: [L`$1$`, L`$3$`, L`$6$`, L`$5$`],
        correctLetter: "C",
        rationales: {
          A: "This may come from checking only the first two constants, not $S_n-S_{n-1}$.",
          B: "This is the coefficient of $n^2$, not the common difference.",
          D: "This is the first term, not the common difference.",
        },
        hints: [
          "Find $a_n=S_n-S_{n-1}$.",
          "Then compare consecutive terms.",
          "$a_n$ becomes linear in $n$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the nth term from the sum formula.",
            math: L`a_n=S_n-S_{n-1}=6n-1`,
          },
          {
            step: 2,
            explanation: "Since $a_n=6n-1$, consecutive terms differ by $6$.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`In an AP, if the $m$th term is $n$ and the $n$th term is $m$ with $m\ne n$, then the $(m+n)$th term is`,
        difficulty: 4,
        skillTags: ["ap_nth_term_reasoning", "parameter_reasoning"],
        choices: [L`$m+n$`, L`$0$`, L`$1$`, L`$-1$`],
        correctLetter: "B",
        rationales: {
          A: "This repeats the position number, but AP terms do not generally equal their positions.",
          C: "The constant term after solving is not $1$.",
          D: "This is the common difference, not the required term.",
        },
        hints: [
          "Write $a+(m-1)d=n$ and $a+(n-1)d=m$.",
          "Subtract the equations to find $d$.",
          "Then find $a$ and compute $a+(m+n-1)d$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set up and subtract the two term equations.",
            math: L`a+(m-1)d=n,\quad a+(n-1)d=m`,
          },
          {
            step: 2,
            explanation:
              "Subtracting gives $(m-n)d=n-m$, so $d=-1$. Then $a=m+n-1$.",
            math: L`a_{m+n}=m+n-1+(m+n-1)(-1)=0`,
          },
        ],
      },
      {
        questionLatex: L`Which value of $n$ makes $100$ the nth term of the AP $7,10,13,\ldots$?`,
        difficulty: 2,
        skillTags: ["ap_nth_term"],
        choices: [L`$30$`, L`$31$`, L`$32$`, L`$33$`],
        correctLetter: "C",
        rationales: {
          A: "This gives $7+29\\cdot3=94$, so it stops two common differences before $100$.",
          B: "This gives $7+30\\cdot3=97$, so it stops one common difference before $100$.",
          D: "This gives $103$, one common difference too far.",
        },
        hints: [
          "Here $a=7$ and $d=3$.",
          "Set $7+(n-1)3=100$.",
          "Solve for $n$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Solve the nth-term equation.",
            math: L`7+3(n-1)=100\Rightarrow 3(n-1)=93\Rightarrow n=32`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In an AP, $a_5=18$ and $a_9=34$. Find the common difference.`,
        difficulty: 2,
        skillTags: ["ap_common_difference"],
        parts: singlePart("a", "Find $d$.", 1),
        hints: [
          "Subtract the two term equations.",
          "$a_9-a_5$ covers four common differences.",
          "Compute $(34-18)/4$.",
        ],
        rubric: singleRubric("a", 1, "Answers $4$."),
        commonErrors: ["Dividing by $9-5+1$ instead of $9-5$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$a_9-a_5=(9-5)d=4d$. Thus $34-18=4d$, so $d=4$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the sum of the first $10$ terms of the AP $2,5,8,\ldots$.`,
        difficulty: 2,
        skillTags: ["ap_sum"],
        parts: singlePart("a", "Give $S_{10}$.", 1),
        hints: [
          "Here $a=2$ and $d=3$.",
          "Find the tenth term or use the direct sum formula.",
          "$a_{10}=29$.",
        ],
        rubric: singleRubric("a", 1, "Answers $155$."),
        commonErrors: ["Using $10d$ instead of $9d$ for the tenth term."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$a_{10}=2+9(3)=29$. Hence $S_{10}=\\frac{10}{2}(2+29)=155$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An AP has first term $6$ and common difference $5$. If its last term is $81$, find the number of terms and the sum of all terms.`,
        difficulty: 3,
        skillTags: ["ap_nth_term", "ap_sum"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the number of terms.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the sum of all terms.",
            points: 2,
          },
        ],
        hints: [
          "Use $a_n=a+(n-1)d$.",
          "Set $81=6+(n-1)5$.",
          "Then use $S_n=\\frac{n}{2}(a+l)$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $n=16$." },
            { part: "b", points: 2, description: "Finds $S_{16}=696$." },
          ],
        },
        commonErrors: [
          "Using $nd$ instead of $(n-1)d$.",
          "Using $81$ as the common difference in the sum formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$81=6+(n-1)5$ gives $(n-1)5=75$, so $n=16$.",
          },
          {
            part: "b",
            explanation: "$S_{16}=\\frac{16}{2}(6+81)=8\\cdot87=696$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An auditorium has $20$ rows. The first row has $18$ seats, and each next row has $2$ more seats than the previous row. Find the total number of seats.`,
        difficulty: 3,
        skillTags: ["ap_sum_application"],
        parts: singlePart("a", "Find the total number of seats.", 3),
        hints: [
          "The row sizes form an AP.",
          "Find the twentieth row or use the sum formula directly.",
          "Here $a=18$, $d=2$, $n=20$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies the AP values." },
            {
              part: "a",
              points: 1,
              description: "Finds last row as $56$ seats.",
            },
            { part: "a", points: 1, description: "Finds total $740$ seats." },
          ],
        },
        commonErrors: [
          "Adding only first and last row.",
          "Using $20$ as the common difference.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The last row has $18+19(2)=56$ seats. Total seats are $S_{20}=\\frac{20}{2}(18+56)=740$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student starts a weekly savings plan. She saves Rs $200$ in week $1$ and increases the amount by Rs $50$ every week.`,
        difficulty: 3,
        skillTags: ["ap_case_application", "ap_sum"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "How much does she save in week $12$?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the total saving over the first $12$ weeks.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "In which week does the weekly saving first become Rs $600$?",
            points: 1,
          },
        ],
        hints: [
          "The weekly savings form an AP.",
          "Use $a_n=a+(n-1)d$ for parts (a) and (c).",
          "Use the AP sum formula for part (b).",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds week 12 saving Rs $750$.",
            },
            { part: "b", points: 2, description: "Finds total Rs $5700$." },
            { part: "c", points: 1, description: "Finds week $9$." },
          ],
        },
        commonErrors: [
          "Using $12d$ instead of $11d$ for week $12$.",
          "Calculating only the final week's saving instead of the total.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Week $12$ saving is $200+11(50)=750$ rupees.",
          },
          {
            part: "b",
            explanation:
              "$S_{12}=\\frac{12}{2}(200+750)=6\\cdot950=5700$ rupees.",
          },
          {
            part: "c",
            explanation: "Set $200+(n-1)50=600$. Then $(n-1)50=400$, so $n=9$.",
          },
        ],
      },
    ],
  },
];

export const algebraXTopics: Topic[] = [...topicSeeds].map(makeTopic);
