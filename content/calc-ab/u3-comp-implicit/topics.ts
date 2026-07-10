import type {
  FrqItem,
  FrqPart,
  FrqRubric,
  FrqSolutionPart,
  Hint,
  McChoice,
  McSingleItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";

const COURSE = "calc-ab";
const UNIT = "u3-comp-implicit";
const VERSION = "0.4.0";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

type McLetter = (typeof LETTERS)[number];

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales?: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface FrqSeed {
  questionLatex: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
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
          "This answer comes from using an incomplete derivative rule or evaluating at the wrong input.",
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[letter] ?? "incorrect_derivative_procedure",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "omits_chain_rule_factor",
    ],
    questionLatex: seed.questionLatex,
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "omits_chain_rule_factor",
    ],
    questionLatex: seed.questionLatex,
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

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "The Chain Rule",
    subtopic:
      "Differentiating composite functions and combining chain rule with product or exponential rules",
    mc: [
      {
        questionLatex:
          "\\text{Which equation gives the tangent line to }y=(3x^2-5)^4\\text{ at }x=1?",
        difficulty: 3,
        skillTags: ["chain_rule", "tangent_line"],
        choices: [
          "$y-16=-192(x-1)$",
          "$y-16=-32(x-1)$",
          "$y+16=-192(x-1)$",
          "$y-16=24(x-1)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This differentiates the outside power but omits the derivative of $3x^2-5$.",
          C: "The point on the curve has y-value $16$, not $-16$.",
          D: "This does not correctly evaluate the signed inner value $3(1)^2-5=-2$.",
        },
        hints: [
          "Find both $y(1)$ and $y'(1)$.",
          "$y'=4(3x^2-5)^3(6x)$.",
          "At x=1, the inner expression is $-2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the point and derivative.",
            math: "y(1)=(-2)^4=16,\\quad y'(1)=24(1)(-2)^3=-192",
          },
          {
            step: 2,
            explanation: "Write the tangent line.",
            math: "y-16=-192(x-1)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }H(x)=f(g(x)).\\text{ If }g(2)=5,\\ g'(2)=-3,\\text{ and }f'(5)=4,\\text{ then }H'(2)=",
        difficulty: 2,
        skillTags: ["chain_rule", "table_values"],
        choices: ["$-12$", "$1$", "$4$", "$20$"],
        correctLetter: "A",
        rationales: {
          B: "This adds the derivative values instead of multiplying them through the chain rule.",
          C: "This uses only the outer derivative.",
          D: "This multiplies $f'(5)$ by $g(2)$ instead of $g'(2)$.",
        },
        hints: [
          "Use the derivative rule for a composite function.",
          "$H'(x)=f'(g(x))g'(x)$.",
          "At x=2, this becomes $f'(5)(-3)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the chain rule with the given values.",
            math: "H'(2)=f'(g(2))g'(2)=f'(5)(-3)=4(-3)=-12",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }F(x)=\\sin(2x^2-1),\\text{ then }F'(1)=",
        difficulty: 3,
        skillTags: ["chain_rule", "trig_derivative", "evaluate_derivative"],
        choices: ["$4\\cos1$", "$2\\cos1$", "$\\cos1$", "$4\\cos(2)$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative of $2x^2-1$ is $4x$, not 2.",
          C: "This omits the inner derivative.",
          D: "The inner value at x=1 is 1, not 2.",
        },
        hints: [
          "Differentiate sine first, then multiply by the derivative of the inside.",
          "$F'(x)=\\cos(2x^2-1)(4x)$.",
          "At x=1, the inside is 1 and $4x=4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the chain rule and evaluate.",
            math: "F'(1)=\\cos(1)\\cdot4=4\\cos1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A student differentiates }y=e^{x^3}\\text{ and writes }y'=3x^2e^{3x^2}.\\text{ Which correction is needed?}",
        difficulty: 3,
        skillTags: ["chain_rule", "exponential_derivative", "error_analysis"],
        choices: [
          "\\text{Use }y'=3x^2e^{x^3}",
          "\\text{Use }y'=e^{3x^2}",
          "\\text{Use }y'=x^3e^{3x^2}",
          "\\text{Use }y'=e^{x^3}",
        ],
        correctLetter: "A",
        rationales: {
          B: "This omits the inner derivative and changes the exponential input.",
          C: "The multiplier should be the derivative of $x^3$, not $x^3$ itself.",
          D: "This differentiates $e^u$ but omits $u'$.",
        },
        hints: [
          "The derivative of $e^u$ is $e^u u'$.",
          "Here the inside function is $u=x^3$.",
          "Keep the original exponent $x^3$ in the exponential factor.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the chain rule for $e^u$.",
            math: "\\frac{d}{dx}e^{x^3}=e^{x^3}(3x^2)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }F(x)=x^2(1-x^3)^5.\\text{ What is }F'(-1)?",
        difficulty: 4,
        skillTags: ["product_rule", "chain_rule", "evaluate_derivative"],
        choices: ["$-304$", "$-64$", "$176$", "$304$"],
        correctLetter: "A",
        rationales: {
          B: "This differentiates only the $x^2$ factor.",
          C: "This has a sign error in the chain-rule term.",
          D: "This has the correct magnitude but wrong sign.",
        },
        hints: [
          "Use product rule first, then chain rule on $(1-x^3)^5$.",
          "$F'(x)=2x(1-x^3)^5-15x^4(1-x^3)^4$.",
          "At x=-1, $1-x^3=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate using product and chain rules.",
            math: "F'(x)=2x(1-x^3)^5+x^2\\cdot5(1-x^3)^4(-3x^2)",
          },
          {
            step: 2,
            explanation: "Evaluate at x=-1.",
            math: "F'(-1)=-2(32)-15(16)=-64-240=-304",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }F(x)=e^{x^2-1}\\sin(3x).",
      difficulty: 4,
      skillTags: ["chain_rule", "product_rule", "tangent_line", "error_analysis"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $F'(x)$.",
          points: 3,
        },
        {
          letter: "b",
          promptMarkdown: "Find the tangent line to $y=F(x)$ at $x=0$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "A student writes $F'(x)=e^{x^2-1}\\cos(3x)$. Identify one missing product-rule term or chain-rule factor.",
          points: 1,
        },
      ],
      hints: [
        "The function is a product, and both factors involve derivative rules.",
        "Differentiate $e^{x^2-1}$ using chain rule and $\\sin(3x)$ using chain rule.",
        "At x=0, $\\sin0=0$, $\\cos0=1$, and $e^{-1}=1/e$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Uses product rule with two terms." },
          { part: "a", points: 1, description: "Correctly differentiates $e^{x^2-1}$ as $2xe^{x^2-1}$." },
          { part: "a", points: 1, description: "Correctly differentiates $\\sin(3x)$ as $3\\cos(3x)$." },
          { part: "b", points: 1, description: "Finds $F(0)=0$ and $F'(0)=3/e$." },
          { part: "b", points: 1, description: "Writes the tangent line $y=\\frac3e x$ or equivalent." },
          { part: "c", points: 1, description: "Identifies a missing term or factor from product or chain rule." },
        ],
      },
      commonErrors: [
        "Differentiating only one factor in the product.",
        "Forgetting the factor 2x from $e^{x^2-1}$.",
        "Forgetting the factor 3 from $\\sin(3x)$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$F'(x)=2xe^{x^2-1}\\sin(3x)+3e^{x^2-1}\\cos(3x)$.",
        },
        {
          part: "b",
          explanation:
            "$F(0)=0$ and $F'(0)=3e^{-1}=3/e$, so the tangent line is $y=\\frac3e x$.",
        },
        {
          part: "c",
          explanation:
            "The student omitted the product-rule term $2xe^{x^2-1}\\sin(3x)$ and also missed the chain-rule factor 3 on $\\cos(3x)$.",
        },
      ],
    },
  },
  {
    topicCode: "3.2",
    title: "Implicit Differentiation",
    subtopic:
      "Finding derivatives from equations where x and y are related implicitly",
    mc: [
      {
        questionLatex:
          "\\text{For }x^2+xy+y^2=7,\\text{ what is }\\frac{dy}{dx}\\text{ at }(1,2)?",
        difficulty: 3,
        skillTags: ["implicit_differentiation", "evaluate_derivative"],
        choices: ["$-\\frac45$", "$-\\frac54$", "$\\frac45$", "$-4$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses the denominator and numerator after solving for $y'$.",
          C: "The sign should be negative.",
          D: "This omits the $x+2y$ denominator.",
        },
        hints: [
          "Differentiate each term with respect to x.",
          "The derivative of $xy$ is $x y' + y$.",
          "Solve for $y'$ before substituting the point.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate implicitly.",
            math: "2x+x y'+y+2y y'=0",
          },
          {
            step: 2,
            explanation: "Solve and evaluate.",
            math: "y'=-\\frac{2x+y}{x+2y}\\Rightarrow y'(1,2)=-\\frac45",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which equation gives the tangent line to }x^2+y^2=25\\text{ at }(3,4)?",
        difficulty: 2,
        skillTags: ["implicit_differentiation", "tangent_line"],
        choices: [
          "$y-4=-\\frac34(x-3)$",
          "$y-4=\\frac34(x-3)$",
          "$y-3=-\\frac43(x-4)$",
          "$y-4=-\\frac43(x-3)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The slope has the wrong sign.",
          C: "This swaps x- and y-coordinates in the point-slope form.",
          D: "This reverses the ratio of x and y in the slope.",
        },
        hints: [
          "Differentiate $x^2+y^2=25$.",
          "$2x+2yy'=0$, so $y'=-x/y$.",
          "At $(3,4)$ the slope is $-3/4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the tangent slope.",
            math: "y'=-\\frac{x}{y}\\Rightarrow y'(3,4)=-\\frac34",
          },
          {
            step: 2,
            explanation: "Write the tangent line.",
            math: "y-4=-\\frac34(x-3)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\sin y+x^2y=1,\\text{ then }\\frac{dy}{dx}=",
        difficulty: 3,
        skillTags: ["implicit_differentiation", "chain_rule"],
        choices: [
          "$-\\frac{2xy}{\\cos y+x^2}$",
          "$-\\frac{2x}{\\cos y+x^2}$",
          "$-\\frac{2xy}{-\\sin y+x^2}$",
          "$-\\frac{\\cos y+x^2}{2xy}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This omits the y factor from differentiating $x^2y$.",
          C: "The derivative of $\\sin y$ with respect to x is $\\cos y\\,y'$.",
          D: "This solves the equation for $y'$ upside down.",
        },
        hints: [
          "Every y-term needs a factor of $y'$ when differentiating with respect to x.",
          "Differentiate $x^2y$ using the product rule.",
          "Collect the $y'$ terms on one side.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate implicitly.",
            math: "\\cos y\\,y'+2xy+x^2y'=0",
          },
          {
            step: 2,
            explanation: "Solve for $y'$.",
            math: "y'(\\cos y+x^2)=-2xy\\Rightarrow y'=-\\frac{2xy}{\\cos y+x^2}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x^2+xy+y^2=3,\\text{ at which point does the curve have a horizontal tangent?}",
        difficulty: 4,
        skillTags: ["implicit_differentiation", "horizontal_tangent"],
        choices: ["$(1,-2)$", "$(1,2)$", "$(-1,-2)$", "$(0,\\sqrt3)$"],
        correctLetter: "A",
        rationales: {
          B: "This point is not on the curve $x^2+xy+y^2=3$.",
          C: "This point gives $2x+y=-4$, not a horizontal tangent.",
          D: "This point is on the curve but its tangent is not horizontal.",
        },
        hints: [
          "From implicit differentiation, $y'=-(2x+y)/(x+2y)$.",
          "A horizontal tangent has numerator 0 and denominator nonzero.",
          "Set $2x+y=0$ and check which choice lies on the curve.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the horizontal tangent condition.",
            math: "2x+y=0\\Rightarrow y=-2x",
          },
          {
            step: 2,
            explanation: "Check the choices on the curve.",
            math: "(1,-2):\\ 1-2+4=3\\text{ and }x+2y=-3\\ne0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }xe^y+y=2,\\text{ what is }\\frac{dy}{dx}\\text{ at }(1,0)?",
        difficulty: 3,
        skillTags: ["implicit_differentiation", "exponential_derivative"],
        choices: ["$-\\frac12$", "$-1$", "$\\frac12$", "$-2$"],
        correctLetter: "A",
        rationales: {
          B: "This differentiates $xe^y$ without the $x e^y y'$ term.",
          C: "The sign should be negative after moving $e^y$ to the other side.",
          D: "This solves for $y'$ incorrectly.",
        },
        hints: [
          "Differentiate $xe^y$ using product rule and chain rule.",
          "The derivative is $e^y+x e^y y'$.",
          "At $(1,0)$, $e^0=1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate implicitly.",
            math: "e^y+x e^y y'+y'=0",
          },
          {
            step: 2,
            explanation: "Evaluate and solve.",
            math: "1+1\\cdot1\\cdot y'+y'=0\\Rightarrow y'=-\\frac12",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Consider the curve }x^2+2xy+3y^2=12.",
      difficulty: 4,
      skillTags: ["implicit_differentiation", "tangent_line", "horizontal_tangent", "vertical_tangent"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $\\frac{dy}{dx}$ in terms of $x$ and $y$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Find the tangent line to the curve at $(0,2)$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "Find all points on the curve where the tangent line is horizontal.",
          points: 2,
        },
      ],
      hints: [
        "Differentiate $2xy$ using the product rule.",
        "A horizontal tangent occurs when the numerator of $dy/dx$ is 0 and the denominator is not 0.",
        "For part (c), use $x+y=0$ with the original equation.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly differentiates all implicit terms." },
          { part: "a", points: 1, description: "Solves for $dy/dx=-(x+y)/(x+3y)$." },
          { part: "b", points: 1, description: "Finds slope $-1/3$ at $(0,2)$." },
          { part: "b", points: 1, description: "Writes a correct tangent line equation." },
          { part: "c", points: 1, description: "Sets $x+y=0$ and substitutes into the original equation." },
          { part: "c", points: 1, description: "Finds both horizontal tangent points." },
        ],
      },
      commonErrors: [
        "Differentiating $2xy$ as $2xy'$ only.",
        "Using the derivative equation instead of the original curve to find points.",
        "Forgetting to check the denominator for horizontal tangents.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Differentiating gives $2x+2(y+xy')+6yy'=0$, so $(2x+6y)y'=-(2x+2y)$ and $\\frac{dy}{dx}=-\\frac{x+y}{x+3y}$.",
        },
        {
          part: "b",
          explanation:
            "At $(0,2)$, $y'=-\\frac{2}{6}=-\\frac13$, so the tangent line is $y-2=-\\frac13x$.",
        },
        {
          part: "c",
          explanation:
            "Horizontal tangents require $x+y=0$, so $y=-x$. Substitution gives $x^2-2x^2+3x^2=12$, so $2x^2=12$ and $x=\\pm\\sqrt6$. The points are $(\\sqrt6,-\\sqrt6)$ and $(-\\sqrt6,\\sqrt6)$.",
        },
      ],
    },
  },
  {
    topicCode: "3.3",
    title: "Differentiating Inverse Functions",
    subtopic:
      "Using inverse-function derivative relationships from values, formulas, and tangent lines",
    mc: [
      {
        questionLatex:
          "\\text{Let }g=f^{-1}.\\text{ If }f(2)=5\\text{ and }f'(2)=3,\\text{ then }g'(5)=",
        difficulty: 2,
        skillTags: ["inverse_function_derivative"],
        choices: ["$\\frac13$", "$3$", "$\\frac15$", "$5$"],
        correctLetter: "A",
        rationales: {
          B: "The inverse derivative is the reciprocal of $f'$ at the corresponding input.",
          C: "This uses the output value 5 instead of $f'(2)$.",
          D: "This uses $g(5)$ as if it were the derivative.",
        },
        hints: [
          "Because $f(2)=5$, the corresponding inverse input is 5 and output is 2.",
          "$(f^{-1})'(f(a))=1/f'(a)$.",
          "Use $a=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the inverse derivative formula.",
            math: "g'(5)=\\frac{1}{f'(2)}=\\frac13",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccc}x&1&3&5\\\\\\hline f(x)&2&4&9\\\\ f'(x)&6&-2&5\\end{array}\\quad \\text{If }g=f^{-1},\\text{ then }g'(4)=",
        difficulty: 3,
        skillTags: ["inverse_function_derivative", "table_values"],
        choices: ["$-\\frac12$", "$-2$", "$\\frac14$", "$3$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $f'(3)$ instead of its reciprocal.",
          C: "This uses the inverse input 4 as if it were a derivative value.",
          D: "This gives $g(4)$, not $g'(4)$.",
        },
        hints: [
          "Find the x-value where $f(x)=4$.",
          "The table gives $f(3)=4$.",
          "Use $g'(4)=1/f'(3)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the corresponding input and take the reciprocal derivative.",
            math: "f(3)=4\\Rightarrow g'(4)=\\frac{1}{f'(3)}=-\\frac12",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }f(x)=x^3+x\\text{ and }g=f^{-1}.\\text{ What is }g'(2)?",
        difficulty: 3,
        skillTags: ["inverse_function_derivative", "formula"],
        choices: ["$\\frac14$", "$4$", "$\\frac12$", "$2$"],
        correctLetter: "A",
        rationales: {
          B: "This is $f'(1)$, not the reciprocal inverse derivative.",
          C: "This uses the input value 2 instead of solving $f(a)=2$.",
          D: "This gives the inverse input relationship incorrectly.",
        },
        hints: [
          "Find a such that $f(a)=2$.",
          "$f(1)=1^3+1=2$.",
          "$f'(x)=3x^2+1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the corresponding input and derivative.",
            math: "f(1)=2,\\quad f'(1)=4",
          },
          {
            step: 2,
            explanation: "Use the reciprocal relationship.",
            math: "g'(2)=\\frac1{f'(1)}=\\frac14",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }h=f^{-1}.\\text{ If }f(3)=7\\text{ and }f'(3)=-2,\\text{ which tangent line is for }y=h(x)\\text{ at }x=7?",
        difficulty: 3,
        skillTags: ["inverse_function_derivative", "tangent_line"],
        choices: [
          "$y-3=-\\frac12(x-7)$",
          "$y-7=-2(x-3)$",
          "$y-3=-2(x-7)$",
          "$y-7=-\\frac12(x-3)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses the original function point, not the inverse point.",
          C: "This uses $f'(3)$ instead of the reciprocal inverse slope.",
          D: "This swaps the inverse point coordinates.",
        },
        hints: [
          "If $f(3)=7$, then $h(7)=3$.",
          "The slope is $h'(7)=1/f'(3)$.",
          "Use point $(7,3)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the inverse point and slope.",
            math: "h(7)=3,\\quad h'(7)=\\frac1{-2}=-\\frac12",
          },
          {
            step: 2,
            explanation: "Write the tangent line.",
            math: "y-3=-\\frac12(x-7)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Suppose }f\\text{ is one-to-one, }f(1)=4,\\text{ and }f'(1)=0.\\text{ What does the inverse derivative formula imply about }(f^{-1})'(4)?",
        difficulty: 3,
        skillTags: ["inverse_function_derivative", "conceptual_reasoning"],
        choices: [
          "\\text{It is not defined by the formula because the denominator is }0",
          "$0$",
          "$1$",
          "$4$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reciprocal of 0 is not 0.",
          C: "There is no reason for the inverse slope to be 1.",
          D: "The output value 4 is not the derivative.",
        },
        hints: [
          "Use $(f^{-1})'(f(a))=1/f'(a)$ only when $f'(a)\\ne0$.",
          "Here $a=1$ and $f'(1)=0$.",
          "A zero tangent slope for f corresponds to a vertical tangent for the inverse.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the condition for the inverse derivative formula.",
            math: "(f^{-1})'(4)=\\frac1{f'(1)}=\\frac10\\text{, which is undefined}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\begin{array}{c|cccc}x&0&1&2&3\\\\\\hline f(x)&1&4&5&9\\\\ f'(x)&2&3&4&5\\end{array}\\quad \\text{Let }g=f^{-1}.",
      difficulty: 4,
      skillTags: ["inverse_function_derivative", "chain_rule", "tangent_line", "table_values"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $g'(5)$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Let $H(x)=g(x^2+1)$. Find $H'(2)$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown: "Find the tangent line to $y=g(x)$ at $x=5$.",
          points: 2,
        },
      ],
      hints: [
        "Find the x-value in the table where $f(x)=5$.",
        "Use the inverse derivative formula, then chain rule for part (b).",
        "The inverse point at x=5 is $(5,2)$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Identifies that $f(2)=5$." },
          { part: "a", points: 1, description: "Computes $g'(5)=1/4$." },
          { part: "b", points: 1, description: "Applies chain rule to $g(x^2+1)$." },
          { part: "b", points: 1, description: "Finds $H'(2)=1$." },
          { part: "c", points: 1, description: "Uses point $(5,2)$ and slope $1/4$." },
          { part: "c", points: 1, description: "Writes a correct tangent line equation." },
        ],
      },
      commonErrors: [
        "Using $f'(5)$ even though 5 is an output of f, not a listed input.",
        "Forgetting the factor $2x$ in part (b).",
        "Writing the tangent point as $(2,5)$ instead of $(5,2)$ for the inverse.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Since $f(2)=5$, $g'(5)=\\frac1{f'(2)}=\\frac14$.",
        },
        {
          part: "b",
          explanation:
            "$H'(x)=g'(x^2+1)(2x)$. At x=2, $x^2+1=5$, so $H'(2)=g'(5)\\cdot4=1$.",
        },
        {
          part: "c",
          explanation:
            "Because $g(5)=2$ and $g'(5)=\\frac14$, the tangent line is $y-2=\\frac14(x-5)$.",
        },
      ],
    },
  },
  {
    topicCode: "3.4",
    title: "Differentiating Inverse Trigonometric Functions",
    subtopic:
      "Using inverse trigonometric derivative rules in direct, chain, product, and tangent-line contexts",
    mc: [
      {
        questionLatex:
          "\\text{If }f(x)=\\arctan(3x),\\text{ then }f'(1)=",
        difficulty: 3,
        skillTags: ["inverse_trig_derivatives", "chain_rule"],
        choices: ["$\\frac3{10}$", "$\\frac1{10}$", "$\\frac34$", "$3$"],
        correctLetter: "A",
        rationales: {
          B: "This omits the derivative of the inside function $3x$.",
          C: "This uses $1+3$ instead of $1+(3x)^2$ at x=1.",
          D: "This omits the denominator from the arctangent derivative.",
        },
        hints: [
          "$\\frac{d}{dx}\\arctan u=\\frac{u'}{1+u^2}$.",
          "Here $u=3x$.",
          "At x=1, $u=3$ and $u'=3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the inverse tangent derivative rule.",
            math: "f'(1)=\\frac{3}{1+3^2}=\\frac3{10}",
          },
        ],
      },
      {
        questionLatex:
          "\\frac{d}{dx}\\left[\\arcsin(x^2)\\right]=",
        difficulty: 3,
        skillTags: ["inverse_trig_derivatives", "chain_rule"],
        choices: [
          "$\\frac{2x}{\\sqrt{1-x^4}}$",
          "$\\frac{1}{\\sqrt{1-x^4}}$",
          "$\\frac{2x}{1+x^4}$",
          "$-\\frac{2x}{\\sqrt{1-x^4}}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This omits the inner derivative $2x$.",
          C: "This uses the arctangent denominator instead of arcsine.",
          D: "The derivative of arcsine is positive on its domain.",
        },
        hints: [
          "$\\frac{d}{dx}\\arcsin u=\\frac{u'}{\\sqrt{1-u^2}}$.",
          "Use $u=x^2$.",
          "Then $u^2=x^4$ and $u'=2x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the chain rule with the arcsine derivative.",
            math: "\\frac{d}{dx}\\arcsin(x^2)=\\frac{2x}{\\sqrt{1-x^4}}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which equation gives the tangent line to }y=\\arcsin x\\text{ at }x=\\frac12?",
        difficulty: 3,
        skillTags: ["inverse_trig_derivatives", "tangent_line"],
        choices: [
          "$y-\\frac\\pi6=\\frac2{\\sqrt3}\\left(x-\\frac12\\right)$",
          "$y-\\frac\\pi6=\\frac{\\sqrt3}{2}\\left(x-\\frac12\\right)$",
          "$y-\\frac12=\\frac2{\\sqrt3}\\left(x-\\frac\\pi6\\right)$",
          "$y-\\frac\\pi3=\\frac2{\\sqrt3}\\left(x-\\frac12\\right)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses the reciprocal of the correct derivative value.",
          C: "This swaps the x-value and y-value of the point.",
          D: "The value $\\arcsin(1/2)$ is $\\pi/6$, not $\\pi/3$.",
        },
        hints: [
          "$\\arcsin(1/2)=\\pi/6$.",
          "$\\frac{d}{dx}\\arcsin x=\\frac1{\\sqrt{1-x^2}}$.",
          "At x=1/2, the derivative is $2/\\sqrt3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the point and slope.",
            math: "y=\\frac\\pi6,\\quad y'=\\frac1{\\sqrt{1-1/4}}=\\frac2{\\sqrt3}",
          },
          {
            step: 2,
            explanation: "Write the tangent line.",
            math: "y-\\frac\\pi6=\\frac2{\\sqrt3}\\left(x-\\frac12\\right)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }F(x)=x\\arctan x,\\text{ then }F'(1)=",
        difficulty: 3,
        skillTags: ["inverse_trig_derivatives", "product_rule", "evaluate_derivative"],
        choices: [
          "$\\frac\\pi4+\\frac12$",
          "$\\frac\\pi4+1$",
          "$\\frac12$",
          "$\\frac\\pi2$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses the derivative of arctangent as 1 instead of $1/(1+x^2)$ at x=1.",
          C: "This omits the derivative of the x factor.",
          D: "This does not apply the product rule.",
        },
        hints: [
          "Use the product rule.",
          "$F'(x)=\\arctan x+x\\frac1{1+x^2}$.",
          "At x=1, $\\arctan1=\\pi/4$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply product rule and evaluate.",
            math: "F'(1)=\\arctan1+\\frac1{1+1}=\\frac\\pi4+\\frac12",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }g(x)=\\arccos\\left(\\frac{x}{2}\\right),\\text{ then }g'(1)=",
        difficulty: 3,
        skillTags: ["inverse_trig_derivatives", "chain_rule", "evaluate_derivative"],
        choices: ["$-\\frac1{\\sqrt3}$", "$\\frac1{\\sqrt3}$", "$-\\frac2{\\sqrt3}$", "$-\\frac12$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative of arccosine is negative.",
          C: "This misses the inner derivative factor of $1/2$.",
          D: "This omits the square-root denominator.",
        },
        hints: [
          "$\\frac{d}{dx}\\arccos u=-\\frac{u'}{\\sqrt{1-u^2}}$.",
          "Here $u=x/2$.",
          "At x=1, $u=1/2$ and $u'=1/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the arccosine derivative and evaluate.",
            math: "g'(1)=-\\frac{1/2}{\\sqrt{1-(1/2)^2}}=-\\frac{1}{\\sqrt3}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=\\arctan(x^2)+\\arcsin\\left(\\frac{x}{2}\\right).",
      difficulty: 4,
      skillTags: ["inverse_trig_derivatives", "chain_rule", "tangent_line"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $f'(x)$.",
          points: 3,
        },
        {
          letter: "b",
          promptMarkdown: "Find the tangent line to $y=f(x)$ at $x=0$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown: "Find $f'(1)$.",
          points: 1,
        },
      ],
      hints: [
        "Use chain rule for both inverse trigonometric terms.",
        "$\\frac{d}{dx}\\arctan u=\\frac{u'}{1+u^2}$.",
        "$\\frac{d}{dx}\\arcsin(x/2)=\\frac{1}{\\sqrt{4-x^2}}$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly differentiates $\\arctan(x^2)$." },
          { part: "a", points: 1, description: "Correctly differentiates $\\arcsin(x/2)$." },
          { part: "a", points: 1, description: "Combines terms into a valid expression for $f'(x)$." },
          { part: "b", points: 1, description: "Finds $f(0)=0$ and $f'(0)=1/2$." },
          { part: "b", points: 1, description: "Writes the tangent line $y=x/2$." },
          { part: "c", points: 1, description: "Finds $f'(1)=1+1/\\sqrt3$." },
        ],
      },
      commonErrors: [
        "Using the arctangent denominator for arcsine.",
        "Forgetting the inner derivative of $x^2$.",
        "Forgetting the factor $1/2$ inside $\\arcsin(x/2)$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(x)=\\frac{2x}{1+x^4}+\\frac{1}{\\sqrt{4-x^2}}$.",
        },
        {
          part: "b",
          explanation:
            "$f(0)=0$ and $f'(0)=0+\\frac12$, so the tangent line is $y=\\frac12x$.",
        },
        {
          part: "c",
          explanation:
            "$f'(1)=\\frac2{2}+\\frac1{\\sqrt3}=1+\\frac1{\\sqrt3}$.",
        },
      ],
    },
  },
  {
    topicCode: "3.5",
    title: "Selecting Procedures for Calculating Derivatives",
    subtopic:
      "Choosing and combining product, quotient, chain, implicit, and inverse-function derivative procedures",
    mc: [
      {
        questionLatex:
          "\\frac{d}{dx}\\left(e^{x^2}\\ln x\\right)=",
        difficulty: 3,
        skillTags: ["selecting_derivative_procedures", "product_rule", "chain_rule", "log_derivative"],
        choices: [
          "$2xe^{x^2}\\ln x+\\frac{e^{x^2}}{x}$",
          "$e^{x^2}\\ln x+\\frac1x$",
          "$2xe^{x^2}\\cdot\\frac1x$",
          "$e^{x^2}\\left(2x+\\frac1x\\right)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This omits the chain-rule factor for $e^{x^2}$ and does not keep the product-rule structure.",
          C: "This multiplies the derivatives instead of using product rule.",
          D: "This treats $\\ln x$ as if it were 1 in the first product-rule term.",
        },
        hints: [
          "The expression is a product.",
          "The derivative of $e^{x^2}$ is $2xe^{x^2}$.",
          "Apply product rule: first derivative times second plus first times second derivative.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use product rule and chain rule.",
            math: "\\frac{d}{dx}(e^{x^2}\\ln x)=2xe^{x^2}\\ln x+e^{x^2}\\frac1x",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }y=\\frac{\\sin(x^2)}{x+1},\\text{ which setup correctly begins the derivative?}",
        difficulty: 3,
        skillTags: ["selecting_derivative_procedures", "quotient_rule", "chain_rule"],
        choices: [
          "$y'=\\frac{(2x\\cos(x^2))(x+1)-\\sin(x^2)}{(x+1)^2}$",
          "$y'=\\frac{\\cos(x^2)(x+1)-\\sin(x^2)}{(x+1)^2}$",
          "$y'=\\frac{2x\\cos(x^2)}{1}$",
          "$y'=\\frac{\\sin(x^2)}{(x+1)^2}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses quotient rule but omits the chain-rule factor $2x$.",
          C: "This differentiates only the numerator.",
          D: "This is not the quotient rule.",
        },
        hints: [
          "The outer structure is a quotient.",
          "The numerator also requires chain rule.",
          "Use $u'v-uv'$ over $v^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use quotient rule with chain rule in the numerator derivative.",
            math: "y'=\\frac{(2x\\cos(x^2))(x+1)-\\sin(x^2)}{(x+1)^2}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Let }H(x)=\\frac{f(g(x))}{x}.\\text{ If }g(2)=3,\\ g'(2)=4,\\ f(3)=10,\\text{ and }f'(3)=-1,\\text{ then }H'(2)=",
        difficulty: 4,
        skillTags: ["selecting_derivative_procedures", "chain_rule", "quotient_rule", "table_values"],
        choices: ["$-\\frac92$", "$-2$", "$-7$", "$3$"],
        correctLetter: "A",
        rationales: {
          B: "This finds only the derivative of the numerator.",
          C: "This subtracts values without dividing by $x^2$.",
          D: "This uses $f(3)$ and $g'(2)$ with the wrong quotient-rule structure.",
        },
        hints: [
          "The numerator is a composite function.",
          "Differentiate $f(g(x))$ as $f'(g(x))g'(x)$.",
          "Then use the quotient rule with denominator x.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the numerator value and derivative at x=2.",
            math: "N(2)=f(g(2))=10,\\quad N'(2)=f'(3)g'(2)=(-1)(4)=-4",
          },
          {
            step: 2,
            explanation: "Apply quotient rule to $H=N/x$.",
            math: "H'(2)=\\frac{N'(2)(2)-N(2)}{2^2}=\\frac{-8-10}{4}=-\\frac92",
          },
        ],
      },
      {
        questionLatex:
          "\\frac{d}{dx}\\left[(\\ln x)^3\\right]=",
        difficulty: 2,
        skillTags: ["selecting_derivative_procedures", "chain_rule", "log_derivative"],
        choices: [
          "$\\frac{3(\\ln x)^2}{x}$",
          "$3(\\ln x)^2$",
          "$\\frac{1}{x^3}$",
          "$\\frac{3\\ln x}{x^2}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This omits the derivative of $\\ln x$.",
          C: "This treats $\\ln x$ as if it were x.",
          D: "This applies an incorrect power and log combination.",
        },
        hints: [
          "The outside function is cubing.",
          "The inside function is $\\ln x$.",
          "Apply chain rule.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the outside and multiply by the inside derivative.",
            math: "3(\\ln x)^2\\cdot\\frac1x=\\frac{3(\\ln x)^2}{x}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{To find }\\frac{dy}{dx}\\text{ from }x^2+y^2=\\sin y,\\text{ which procedures are needed?}",
        difficulty: 2,
        skillTags: ["selecting_derivative_procedures", "implicit_differentiation", "chain_rule"],
        choices: [
          "\\text{Implicit differentiation and chain rule}",
          "\\text{Quotient rule only}",
          "\\text{Product rule only}",
          "\\text{Inverse-function derivative formula}",
        ],
        correctLetter: "A",
        rationales: {
          B: "No quotient is present.",
          C: "No product is present, and y is defined implicitly.",
          D: "The equation does not define an inverse function derivative problem.",
        },
        hints: [
          "y is not isolated, so the derivative must be found implicitly.",
          "The term $\\sin y$ is a composite function of x through y.",
          "Differentiating $\\sin y$ gives $\\cos y\\,y'$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the needed procedures.",
            math: "\\frac{d}{dx}(y^2)=2yy',\\quad \\frac{d}{dx}(\\sin y)=\\cos y\\,y'",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }F(x)=\\frac{e^{x^2}\\sin x}{1+x}.",
      difficulty: 4,
      skillTags: ["selecting_derivative_procedures", "product_rule", "quotient_rule", "chain_rule"],
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Name the derivative rules needed to find $F'(x)$ and explain why each is needed.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Find $F'(x)$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown: "Find $F'(0)$.",
          points: 1,
        },
      ],
      hints: [
        "The whole function is a quotient.",
        "The numerator is a product, and $e^{x^2}$ needs chain rule.",
        "At x=0, the numerator is 0, which simplifies the quotient rule.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Identifies quotient rule for the whole expression." },
          { part: "a", points: 1, description: "Identifies product rule and chain rule in the numerator." },
          { part: "b", points: 1, description: "Correctly differentiates the numerator." },
          { part: "b", points: 1, description: "Correctly applies quotient rule." },
          { part: "b", points: 1, description: "Writes a complete expression for $F'(x)$." },
          { part: "c", points: 1, description: "Computes $F'(0)=1$." },
        ],
      },
      commonErrors: [
        "Differentiating the numerator as a single chain-rule expression.",
        "Forgetting the factor $2x$ from $e^{x^2}$.",
        "Forgetting the denominator squared in quotient rule.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Use quotient rule because the expression is divided by $1+x$. Use product rule in the numerator $e^{x^2}\\sin x$. Use chain rule for $e^{x^2}$.",
        },
        {
          part: "b",
          explanation:
            "Let $N=e^{x^2}\\sin x$. Then $N'=2xe^{x^2}\\sin x+e^{x^2}\\cos x$. Thus $F'(x)=\\frac{(2xe^{x^2}\\sin x+e^{x^2}\\cos x)(1+x)-e^{x^2}\\sin x}{(1+x)^2}$.",
        },
        {
          part: "c",
          explanation:
            "At x=0, $N(0)=0$ and $N'(0)=1$, so $F'(0)=\\frac{1(1)-0}{1}=1$.",
        },
      ],
    },
  },
  {
    topicCode: "3.6",
    title: "Calculating Higher-Order Derivatives",
    subtopic:
      "Computing and interpreting second and higher derivatives, including acceleration and implicit second derivatives",
    mc: [
      {
        questionLatex:
          "\\text{If }y=\\sin(3x),\\text{ then }y''\\left(\\frac\\pi6\\right)=",
        difficulty: 2,
        skillTags: ["higher_order_derivatives", "chain_rule", "trig_derivative"],
        choices: ["$-9$", "$9$", "$-3$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "The second derivative has a negative sign at this point.",
          C: "This omits one factor of 3 from differentiating twice.",
          D: "$\\sin(\\pi/2)$ is not 0.",
        },
        hints: [
          "Find $y'$ and then $y''$.",
          "$y'=3\\cos(3x)$.",
          "$y''=-9\\sin(3x)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate twice and evaluate.",
            math: "y''\\left(\\frac\\pi6\\right)=-9\\sin\\left(\\frac\\pi2\\right)=-9",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A particle has position }s(t)=t^4-2t^3.\\text{ What is its acceleration at }t=1?",
        difficulty: 2,
        skillTags: ["higher_order_derivatives", "motion", "acceleration"],
        choices: ["$0$", "$-2$", "$4$", "$12$"],
        correctLetter: "A",
        rationales: {
          B: "This is the position value at t=1, not acceleration.",
          C: "This is related to the first derivative term but not the second derivative value.",
          D: "This differentiates only $t^4$ twice.",
        },
        hints: [
          "Acceleration is the second derivative of position.",
          "$s'(t)=4t^3-6t^2$.",
          "$s''(t)=12t^2-12t$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find and evaluate the second derivative.",
            math: "s''(1)=12(1)^2-12(1)=0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f(x)=e^{2x},\\text{ then }f'''(0)=",
        difficulty: 2,
        skillTags: ["higher_order_derivatives", "exponential_derivative", "chain_rule"],
        choices: ["$8$", "$4$", "$2$", "$1$"],
        correctLetter: "A",
        rationales: {
          B: "This is the second derivative value at 0.",
          C: "This is the first derivative value at 0.",
          D: "This is the original function value at 0.",
        },
        hints: [
          "Each derivative of $e^{2x}$ brings out another factor of 2.",
          "$f'(x)=2e^{2x}$ and $f''(x)=4e^{2x}$.",
          "$f'''(x)=8e^{2x}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate three times and evaluate.",
            math: "f'''(0)=8e^0=8",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }x^2+y^2=25,\\text{ what is }\\frac{d^2y}{dx^2}\\text{ at }(3,4)?",
        difficulty: 4,
        skillTags: ["higher_order_derivatives", "implicit_differentiation"],
        choices: ["$-\\frac{25}{64}$", "$-\\frac34$", "$\\frac{25}{64}$", "$-\\frac{3}{16}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the first derivative at the point.",
          C: "The second derivative has the wrong sign.",
          D: "This does not account for the full circle relation.",
        },
        hints: [
          "First find $y'=-x/y$.",
          "Differentiate $y'=-x/y$ using quotient rule or product rule.",
          "Use $x^2+y^2=25$ to simplify.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the first derivative.",
            math: "y'=-\\frac{x}{y},\\quad y''=\\frac{-y+xy'}{y^2}",
          },
          {
            step: 2,
            explanation: "Substitute $y'=-x/y$ and simplify.",
            math: "y''=\\frac{-y-x^2/y}{y^2}=-\\frac{x^2+y^2}{y^3}=-\\frac{25}{y^3}",
          },
          {
            step: 3,
            explanation: "Evaluate at y=4.",
            math: "y''=-\\frac{25}{64}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f(x)=x^2\\ln x\\text{ for }x>0,\\text{ then }f''(1)=",
        difficulty: 3,
        skillTags: ["higher_order_derivatives", "product_rule", "log_derivative"],
        choices: ["$3$", "$2$", "$1$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "This omits the derivative of the $x$ term after the first derivative.",
          C: "This differentiates $\\ln x$ but omits product-rule contributions.",
          D: "Although $\\ln1=0$, the second derivative is not 0.",
        },
        hints: [
          "Use product rule for the first derivative.",
          "$f'(x)=2x\\ln x+x$.",
          "Differentiate again.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the second derivative.",
            math: "f'(x)=2x\\ln x+x,\\quad f''(x)=2\\ln x+3",
          },
          {
            step: 2,
            explanation: "Evaluate at x=1.",
            math: "f''(1)=2\\ln1+3=3",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A particle moves on a line with position }s(t)=e^{-t}(t^2+1)\\text{ for }t\\ge0.",
      difficulty: 4,
      skillTags: ["higher_order_derivatives", "motion", "product_rule", "chain_rule"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find the velocity $v(t)=s'(t)$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Find the acceleration $a(t)=s''(t)$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "At $t=2$, is the speed of the particle increasing or decreasing? Justify your answer.",
          points: 2,
        },
      ],
      hints: [
        "Use product rule and chain rule for $e^{-t}$.",
        "Velocity and acceleration having the same sign means speed is increasing.",
        "At t=2, compare $v(2)$ and $a(2)$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Uses product rule correctly." },
          { part: "a", points: 1, description: "Finds $v(t)=e^{-t}(-t^2+2t-1)$ or equivalent." },
          { part: "b", points: 1, description: "Differentiates velocity correctly." },
          { part: "b", points: 1, description: "Finds $a(t)=e^{-t}(t-1)(t-3)$ or equivalent." },
          { part: "c", points: 1, description: "Evaluates signs of velocity and acceleration at t=2." },
          { part: "c", points: 1, description: "Correctly concludes speed is increasing because signs match." },
        ],
      },
      commonErrors: [
        "Forgetting the negative derivative of $e^{-t}$.",
        "Using position and velocity signs instead of velocity and acceleration signs for speed.",
        "Concluding speed is decreasing because velocity is negative.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$v(t)=s'(t)=e^{-t}(2t)-e^{-t}(t^2+1)=e^{-t}(-t^2+2t-1)$.",
        },
        {
          part: "b",
          explanation:
            "Since $v(t)=-e^{-t}(t-1)^2$, $a(t)=e^{-t}(t-1)^2-2e^{-t}(t-1)=e^{-t}(t-1)(t-3)$.",
        },
        {
          part: "c",
          explanation:
            "$v(2)=-e^{-2}$ and $a(2)=-e^{-2}$, so velocity and acceleration have the same sign. Therefore the speed is increasing at $t=2$.",
        },
      ],
    },
  },
];

export const compositeImplicitTopics: Topic[] = topicSeeds.map(makeTopic);
