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
const UNIT = "u2-differentiation";
const VERSION = "0.3.3";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
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
          "This answer comes from applying an incorrect derivative definition, rule, or point value.",
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[letter] ?? "incorrect_derivative_reasoning",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(
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
      "uses_derivative_rule_without_checking_the_definition",
    ],
    questionLatex: seed.questionLatex,
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_derivative_rule_without_checking_the_definition",
    ],
    questionLatex: seed.questionLatex,
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

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Defining Average and Instantaneous Rates of Change at a Point",
    subtopic:
      "Interpreting secant slopes and instantaneous rates through limiting average rates",
    mc: [
      {
        questionLatex:
          "\\text{For } f(t)=t^2+3t,\\ \\text{the average rate of change on }[2,2+h]\\text{ is}",
        difficulty: 2,
        skillTags: ["average_rate_of_change", "difference_quotient"],
        choices: ["$h$", "$7$", "$7+h$", "$10+h$"],
        correctLetter: "C",
        rationales: {
          B: "This is the limiting instantaneous rate as h approaches 0, not the average rate over [2,2+h].",
          D: "This includes f(2), but average rate divides the change in output by the change in input.",
        },
        hints: [
          "Use $\\frac{f(2+h)-f(2)}{h}$.",
          "Compute $f(2+h)$ before subtracting $f(2)$.",
          "The numerator simplifies to $7h+h^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write the average rate over the interval.",
            math: "\\frac{f(2+h)-f(2)}{h}",
          },
          {
            step: 2,
            explanation: "Evaluate and simplify.",
            math: "\\frac{(2+h)^2+3(2+h)-10}{h}=\\frac{7h+h^2}{h}=7+h",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A particle has position }s(t)=t^3-2t.\\ \\text{What is its average velocity on }[1,3]?",
        difficulty: 2,
        skillTags: ["average_velocity", "secant_slope"],
        choices: ["$9$", "$10$", "$11$", "$13$"],
        correctLetter: "C",
        rationales: {
          A: "This uses the change in t incorrectly.",
          B: "This is close, but the position at t=1 is negative.",
          D: "This does not divide the change in position by the full time interval.",
        },
        hints: [
          "Average velocity is $\\frac{s(3)-s(1)}{3-1}$.",
          "Compute $s(3)=21$ and $s(1)=-1$.",
          "Divide the change in position, 22, by 2.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the endpoint positions.",
            math: "s(3)=27-6=21,\\quad s(1)=1-2=-1",
          },
          {
            step: 2,
            explanation: "Divide the change in position by the elapsed time.",
            math: "\\frac{21-(-1)}{3-1}=11",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccccc}h&-0.5&-0.1&-0.01&0.01&0.1\\\\\\hline \\frac{s(4+h)-s(4)}{h}&-3.50&-3.10&-3.01&-2.99&-2.90\\end{array}\\quad \\text{Which statement is best supported?}",
        difficulty: 3,
        skillTags: ["instantaneous_rate", "limit_interpretation", "table_reasoning"],
        choices: [
          "$s'(4)\\approx -3\\text{, so position is decreasing at }t=4$",
          "$s'(4)\\approx 3\\text{, so position is increasing at }t=4$",
          "$s(4)\\approx -3$",
          "\\text{The average velocity is exactly }-3\\text{ on every interval}",
        ],
        correctLetter: "A",
        rationales: {
          B: "The signs of the nearby average velocities are negative, not positive.",
          C: "The table gives average rates of change, not the position value.",
          D: "The displayed average velocities are near -3 but not exactly equal to -3.",
        },
        hints: [
          "The table entries are average velocities on intervals ending near t=4.",
          "Look at the entries closest to h=0 from both sides.",
          "The values approach -3, and a negative velocity means the position is decreasing.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the limiting value of the average velocities.",
            math: "s'(4)=\\lim_{h\\to0}\\frac{s(4+h)-s(4)}{h}\\approx -3",
          },
          {
            step: 2,
            explanation: "Interpret the sign of the derivative.",
            math: "s'(4)<0\\Rightarrow s(t)\\text{ is decreasing at }t=4",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cc}x&2&5\\\\\\hline f(x)&10&19\\end{array}\\quad \\text{The average rate of change of }f\\text{ on }[2,5]\\text{ is}",
        difficulty: 2,
        skillTags: ["table_average_rate", "secant_slope"],
        choices: ["$\\frac{3}{9}$", "$3$", "$9$", "$29$"],
        correctLetter: "B",
        rationales: {
          A: "This reverses the change in x and the change in f.",
          C: "This is the change in output only.",
          D: "This adds the outputs instead of finding a rate of change.",
        },
        hints: [
          "Use the two table points as endpoints of a secant line.",
          "The change in output is $19-10$.",
          "The change in input is $5-2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the secant slope.",
            math: "\\frac{19-10}{5-2}=3",
          },
        ],
      },
      {
        questionLatex:
          "\\lim_{x\\to a}\\frac{f(x)-f(a)}{x-a}\\text{ represents which quantity, when the limit exists?}",
        difficulty: 2,
        skillTags: ["derivative_as_limit", "instantaneous_rate"],
        choices: [
          "\\text{The average rate of change on }[0,a]",
          "\\text{The instantaneous rate of change of }f\\text{ at }a",
          "\\text{The value }f(a)",
          "\\text{The total change in }f\\text{ from }0\\text{ to }a",
        ],
        correctLetter: "B",
        rationales: {
          A: "The interval endpoint x moves toward a, so this is not a fixed average rate.",
          C: "The expression compares nearby output changes, not the output itself.",
          D: "Total change is a difference in outputs, not a ratio with a limiting process.",
        },
        hints: [
          "The expression is a limit of secant slopes.",
          "As x approaches a, the secant line approaches a tangent line.",
          "A tangent slope is the derivative at the point.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Recognize the alternate definition of derivative.",
            math: "f'(a)=\\lim_{x\\to a}\\frac{f(x)-f(a)}{x-a}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A particle moving on a line has position }p(t)=t^3-6t^2+12t+5\\text{ meters at time }t\\text{ seconds.}",
      difficulty: 3,
      skillTags: ["average_rate_of_change", "instantaneous_rate", "interpretation"],
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Find the average velocity of the particle on the interval $1\\le t\\le 3$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Use the limit definition at $t=2$ to find the instantaneous velocity $p'(2)$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown:
            "Explain, using units, why your answers to parts (a) and (b) can be different.",
          points: 1,
        },
      ],
      hints: [
        "Part (a) is a secant slope. Part (b) is a tangent slope.",
        "For part (b), simplify $\\frac{p(2+h)-p(2)}{h}$ before taking the limit.",
        "$p(2+h)-p(2)$ collapses to $h^3$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Computes $p(1)$ and $p(3)$ correctly." },
          { part: "a", points: 1, description: "Finds the average velocity as $1$ meter per second." },
          { part: "b", points: 1, description: "Sets up the correct difference quotient at $t=2$." },
          { part: "b", points: 1, description: "Simplifies the quotient to $h^2$." },
          { part: "b", points: 1, description: "Takes the limit and obtains $p'(2)=0$." },
          { part: "c", points: 1, description: "Interprets average and instantaneous velocity with correct units." },
        ],
      },
      commonErrors: [
        "Using $p(3)-p(1)$ without dividing by $3-1$.",
        "Substituting $h=0$ before simplifying the difference quotient.",
        "Forgetting that both answers are velocities with units of meters per second.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$p(1)=12$ and $p(3)=14$, so the average velocity is $\\frac{14-12}{3-1}=1$ meter per second.",
        },
        {
          part: "b",
          explanation:
            "$p(2)=13$ and $p(2+h)=13+h^3$, so $\\frac{p(2+h)-p(2)}{h}=h^2$. Therefore $p'(2)=\\lim_{h\\to0}h^2=0$ meters per second.",
        },
        {
          part: "c",
          explanation:
            "The average velocity describes the whole interval from $t=1$ to $t=3$, while $p'(2)$ describes the velocity at the instant $t=2$.",
        },
      ],
    },
  },
  {
    topicCode: "2.2",
    title: "Defining the Derivative of a Function and Using Derivative Notation",
    subtopic:
      "Connecting derivative notation with the limit definition of the derivative",
    mc: [
      {
        questionLatex:
          "\\text{A student writes }f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(h)}{h}.\\ \\text{Which revision fixes the definition?}",
        difficulty: 2,
        skillTags: ["derivative_definition", "error_analysis"],
        choices: [
          "\\text{Replace }f(h)\\text{ with }f(a)",
          "\\text{Replace the denominator }h\\text{ with }a+h",
          "\\text{Remove the limit because the quotient already gives }f'(a)",
          "\\text{Change the numerator to }f(a+h)+f(a)",
        ],
        correctLetter: "A",
        rationales: {
          B: "The denominator should measure the input change, which is h.",
          C: "The limiting process is what turns a secant slope into the derivative.",
          D: "The numerator must be a change in output, so the values are subtracted.",
        },
        hints: [
          "The two function values should be taken at inputs a+h and a.",
          "The denominator h is the input change from a to a+h.",
          "The correct numerator is $f(a+h)-f(a)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Correct the base point in the difference quotient.",
            math: "f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Use the derivative definition to find }f'(3)\\text{ for }f(x)=x^2-1.",
        difficulty: 3,
        skillTags: ["derivative_definition", "quadratic_derivative"],
        choices: ["$5$", "$6$", "$8$", "$9$"],
        correctLetter: "B",
        rationales: {
          A: "This is $f(3)$, not the derivative.",
          C: "This is $f(3)+1$, not the limiting slope.",
          D: "This keeps the square of the input instead of finding the slope.",
        },
        hints: [
          "Use $\\frac{f(3+h)-f(3)}{h}$.",
          "$f(3+h)=(3+h)^2-1=8+6h+h^2$.",
          "After subtracting $f(3)=8$, divide by h and let h approach 0.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Build the difference quotient.",
            math: "\\frac{f(3+h)-f(3)}{h}=\\frac{8+6h+h^2-8}{h}=6+h",
          },
          {
            step: 2,
            explanation: "Take the limit.",
            math: "\\lim_{h\\to0}(6+h)=6",
          },
        ],
      },
      {
        questionLatex:
          "\\lim_{x\\to4}\\frac{\\sqrt{x}-2}{x-4}\\text{ is equal to}",
        difficulty: 3,
        skillTags: ["alternate_derivative_definition", "radical"],
        choices: ["$\\frac14$", "$\\frac12$", "$1$", "\\text{Does not exist}"],
        correctLetter: "A",
        rationales: {
          B: "This is the derivative of $x$ at 4, not $\\sqrt{x}$.",
          C: "This treats the numerator and denominator as changing at the same rate.",
          D: "The expression is a derivative limit and does exist.",
        },
        hints: [
          "Recognize $\\frac{f(x)-f(4)}{x-4}$ for $f(x)=\\sqrt{x}$.",
          "The limit equals $f'(4)$.",
          "$\\frac{d}{dx}\\sqrt{x}=\\frac{1}{2\\sqrt{x}}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the derivative limit.",
            math: "\\lim_{x\\to4}\\frac{\\sqrt{x}-2}{x-4}=f'(4),\\quad f(x)=\\sqrt{x}",
          },
          {
            step: 2,
            explanation: "Evaluate the derivative at 4.",
            math: "f'(4)=\\frac{1}{2\\sqrt{4}}=\\frac14",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The tangent line to }y=f(x)\\text{ at }x=2\\text{ is }y-5=-3(x-2).\\ \\text{Which statement must be true?}",
        difficulty: 2,
        skillTags: ["derivative_notation", "tangent_line_interpretation"],
        choices: [
          "$f(2)=5\\text{ and }f'(2)=-3$",
          "$f(2)=-3\\text{ and }f'(2)=5$",
          "$f'(5)=-3$",
          "$f(2)=5\\text{ and }f'(2)=2$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The point on the tangent line is $(2,5)$, and the slope is -3.",
          C: "The tangent information is given at x=2, not x=5.",
          D: "The derivative is the tangent slope, which is -3.",
        },
        hints: [
          "Point-slope form is $y-y_1=m(x-x_1)$.",
          "The tangent line touches the curve at $(2,5)$.",
          "The slope of that tangent line is $f'(2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Read the point and slope from point-slope form.",
            math: "y-5=-3(x-2)\\Rightarrow f(2)=5,\\quad f'(2)=-3",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }f(x)=|x-1|,\\text{ what is }f'(1)?",
        difficulty: 3,
        skillTags: ["derivative_definition", "one_sided_limits"],
        choices: ["$-1$", "$0$", "$1$", "\\text{Does not exist}"],
        correctLetter: "D",
        rationales: {
          A: "This is the left-hand slope only.",
          B: "The function value has a minimum at x=1, but the derivative is not automatically 0.",
          C: "This is the right-hand slope only.",
        },
        hints: [
          "Check the left-hand and right-hand difference quotients.",
          "For x<1 the slope is -1; for x>1 the slope is 1.",
          "A derivative exists only if the two one-sided limits agree.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compare the one-sided slopes at the corner.",
            math: "\\lim_{x\\to1^-}\\frac{|x-1|-0}{x-1}=-1,\\quad \\lim_{x\\to1^+}\\frac{|x-1|-0}{x-1}=1",
          },
          {
            step: 2,
            explanation: "The one-sided limits differ, so the derivative does not exist.",
            math: "f'(1)\\text{ does not exist}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=x^2+4x.\\text{ Use derivative notation and the limit definition.}",
      difficulty: 3,
      skillTags: ["derivative_definition", "notation", "tangent_line"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Write a limit expression for $f'(a)$.",
          points: 1,
        },
        {
          letter: "b",
          promptMarkdown: "Use your expression to find a formula for $f'(a)$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown: "Find an equation of the tangent line to $y=f(x)$ at $x=1$.",
          points: 2,
        },
      ],
      hints: [
        "Use $\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}$.",
        "Expand $(a+h)^2+4(a+h)$ and subtract $a^2+4a$.",
        "The tangent line uses point $(1,f(1))$ and slope $f'(1)$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Writes the correct h-form derivative definition for $f'(a)$." },
          { part: "b", points: 1, description: "Correctly expands $f(a+h)$." },
          { part: "b", points: 1, description: "Simplifies the difference quotient to $2a+h+4$." },
          { part: "b", points: 1, description: "Takes the limit to obtain $f'(a)=2a+4$." },
          { part: "c", points: 1, description: "Finds $f(1)=5$ and $f'(1)=6$." },
          { part: "c", points: 1, description: "Writes a correct tangent line equation." },
        ],
      },
      commonErrors: [
        "Leaving h in the final derivative formula.",
        "Using $f(a+h)-f(h)$ instead of $f(a+h)-f(a)$.",
        "Using $f(1)$ as the tangent slope.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}$.",
        },
        {
          part: "b",
          explanation:
            "$f(a+h)=a^2+2ah+h^2+4a+4h$, so the quotient becomes $\\frac{2ah+h^2+4h}{h}=2a+h+4$. Thus $f'(a)=2a+4$.",
        },
        {
          part: "c",
          explanation:
            "$f(1)=5$ and $f'(1)=6$, so one tangent line equation is $y-5=6(x-1)$.",
        },
      ],
    },
  },
  {
    topicCode: "2.3",
    title: "Estimating Derivatives of a Function at a Point",
    subtopic:
      "Estimating tangent slopes from tables, graphs, and nearby average rates",
    mc: [
      {
        questionLatex:
          "\\begin{array}{c|ccc}x&1&2&3\\\\\\hline f(x)&5&8&13\\end{array}\\quad \\text{Using a symmetric difference, }f'(2)\\text{ is best estimated by}",
        difficulty: 2,
        skillTags: ["table_estimate", "symmetric_difference"],
        choices: ["$3$", "$4$", "$5$", "$8$"],
        correctLetter: "B",
        rationales: {
          A: "This uses only the left interval.",
          C: "This uses only the right interval.",
          D: "This is the function value at x=2.",
        },
        hints: [
          "A symmetric estimate uses points equally spaced around x=2.",
          "Use x=1 and x=3.",
          "Compute $\\frac{13-5}{3-1}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the average rate over [1,3].",
            math: "\\frac{13-5}{3-1}=4",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A tangent line to }y=f(x)\\text{ at }x=2\\text{ passes through }(2,5)\\text{ and }(5,11).\\text{ Estimate }f'(2).",
        difficulty: 2,
        skillTags: ["tangent_slope", "rate_from_line"],
        choices: ["$\\frac12$", "$2$", "$3$", "$6$"],
        correctLetter: "B",
        rationales: {
          A: "This reverses run and rise.",
          C: "This is the run only.",
          D: "This is the rise only.",
        },
        hints: [
          "The derivative is the slope of the tangent line.",
          "Use rise over run between the two points on that line.",
          "$\\frac{11-5}{5-2}=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the slope of the tangent line.",
            math: "\\frac{11-5}{5-2}=2",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccc}x&-0.1&0&0.1\\\\\\hline g(x)&2.81&3&3.21\\end{array}\\quad \\text{A symmetric estimate for }g'(0)\\text{ is}",
        difficulty: 2,
        skillTags: ["table_estimate", "symmetric_difference"],
        choices: ["$0.2$", "$1.9$", "$2$", "$4$"],
        correctLetter: "C",
        rationales: {
          A: "This is the input interval width, not the slope.",
          B: "This uses the left interval only.",
          D: "This doubles the symmetric slope.",
        },
        hints: [
          "Use the outputs at $x=-0.1$ and $x=0.1$.",
          "The numerator is $3.21-2.81$.",
          "The denominator is $0.1-(-0.1)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the closest symmetric points.",
            math: "\\frac{3.21-2.81}{0.1-(-0.1)}=\\frac{0.40}{0.20}=2",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccc}x&1.9&2&2.1\\\\\\hline f(x)&4.61&5.00&5.41\\end{array}\\quad \\text{Which estimate uses the closest points around }x=2?",
        difficulty: 2,
        skillTags: ["table_estimate", "closest_points"],
        choices: [
          "$\\frac{5.00-4.61}{2-1.9}$",
          "$\\frac{5.41-5.00}{2.1-2}$",
          "$\\frac{5.41-4.61}{2.1-1.9}$",
          "$\\frac{5.41+4.61}{2}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This is one-sided, not symmetric around x=2.",
          B: "This is one-sided, not symmetric around x=2.",
          D: "This averages output values instead of estimating a slope.",
        },
        hints: [
          "For a derivative at x=2, use points around x=2 when possible.",
          "The points x=1.9 and x=2.1 are equally spaced from 2.",
          "A slope must be change in output divided by change in input.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Choose the symmetric secant slope around x=2.",
            math: "\\frac{f(2.1)-f(1.9)}{2.1-1.9}=\\frac{5.41-4.61}{0.2}",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccc}x&3.8&4&4.2\\\\\\hline f(x)&6.3&7.0&7.9\\end{array}\\quad \\text{Using the closest right-hand interval, estimate }f'(4).",
        difficulty: 2,
        skillTags: ["one_sided_estimate", "table_estimate"],
        choices: ["$3.5$", "$4$", "$4.5$", "$7.9$"],
        correctLetter: "C",
        rationales: {
          A: "This is the closest left-hand estimate.",
          B: "This is a rough average of nearby estimates, not the requested right-hand interval.",
          D: "This is an output value, not a slope.",
        },
        hints: [
          "A right-hand estimate uses x=4 and the point just to the right.",
          "Use $\\frac{f(4.2)-f(4)}{4.2-4}$.",
          "The change in output is $0.9$ over $0.2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the closest right-hand secant slope.",
            math: "\\frac{7.9-7.0}{4.2-4}=4.5",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\begin{array}{c|ccccc}x&1.8&1.9&2.0&2.1&2.2\\\\\\hline f(x)&4.24&4.61&5.00&5.41&5.84\\end{array}",
      difficulty: 3,
      skillTags: ["table_estimate", "symmetric_difference", "reasoning_from_data"],
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Use the closest symmetric data to estimate $f'(2)$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Compute the average rate of change of $f$ on $[1.8,2.2]$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "The one-step slopes on the table are increasing. Explain what that suggests about the estimate in part (a).",
          points: 2,
        },
      ],
      hints: [
        "For part (a), use x=1.9 and x=2.1.",
        "For part (b), use the endpoints x=1.8 and x=2.2.",
        "Compare slopes over adjacent intervals to discuss whether the derivative appears to be increasing.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Uses the symmetric difference quotient with x=1.9 and x=2.1." },
          { part: "a", points: 1, description: "Obtains the estimate $4$." },
          { part: "b", points: 1, description: "Uses the endpoint average rate over [1.8,2.2]." },
          { part: "b", points: 1, description: "Obtains the average rate $4$." },
          { part: "c", points: 1, description: "Computes or references increasing adjacent slopes." },
          { part: "c", points: 1, description: "Gives a reasonable interpretation of what the trend suggests about local slope near x=2." },
        ],
      },
      commonErrors: [
        "Using $f(2)$ as the derivative estimate.",
        "Using output differences without dividing by input differences.",
        "Claiming table estimates are exact without an explicit formula for f.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(2)\\approx \\frac{f(2.1)-f(1.9)}{2.1-1.9}=\\frac{5.41-4.61}{0.2}=4$.",
        },
        {
          part: "b",
          explanation:
            "The average rate on $[1.8,2.2]$ is $\\frac{5.84-4.24}{2.2-1.8}=4$.",
        },
        {
          part: "c",
          explanation:
            "The adjacent slopes are $3.7, 3.9, 4.1,$ and $4.3$, so the local slope appears to be increasing. The estimate $4$ is a balanced estimate around x=2, not a guaranteed exact value.",
        },
      ],
    },
  },
  {
    topicCode: "2.4",
    title:
      "Connecting Differentiability and Continuity: Determining When Derivatives Do and Do Not Exist",
    subtopic:
      "Recognizing corners, jumps, cusps, vertical tangents, and slope mismatches",
    mc: [
      {
        questionLatex:
          "\\text{If }f\\text{ is differentiable at }x=a\\text{, }f(a)=5\\text{, and }f'(a)=-2,\\text{ which conclusion must follow?}",
        difficulty: 2,
        skillTags: ["differentiability_implies_continuity", "conceptual_reasoning"],
        choices: [
          "$\\lim_{x\\to a}f(x)=5$",
          "$f\\text{ has a local maximum at }a$",
          "$f\\text{ is decreasing on an open interval around }a$",
          "$f\\text{ is linear on an open interval around }a$",
        ],
        correctLetter: "A",
        rationales: {
          B: "A negative derivative at one point does not guarantee a local maximum.",
          C: "The derivative at one point does not by itself guarantee behavior on an entire interval.",
          D: "Differentiability does not require the function to be linear near the point.",
        },
        hints: [
          "Differentiability at a point implies continuity at that point.",
          "Continuity at a means $\\lim_{x\\to a}f(x)=f(a)$.",
          "Use the given value $f(a)=5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use differentiability to infer continuity at the same point.",
            math: "f\\text{ differentiable at }a\\Rightarrow \\lim_{x\\to a}f(x)=f(a)=5",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }f(x)=|x-3|,\\text{ why does }f'(3)\\text{ not exist?}",
        difficulty: 2,
        skillTags: ["corners", "one_sided_derivatives"],
        choices: [
          "\\text{The function is not continuous at }x=3",
          "\\text{The graph has a corner at }x=3",
          "\\text{The function value }f(3)\\text{ is undefined}",
          "\\text{The slope is vertical at }x=3",
        ],
        correctLetter: "B",
        rationales: {
          A: "$|x-3|$ is continuous at x=3.",
          C: "$f(3)=0$ is defined.",
          D: "The one-sided slopes are finite, but unequal.",
        },
        hints: [
          "Check the slope to the left and right of x=3.",
          "The left slope is -1 and the right slope is 1.",
          "Unequal one-sided derivatives create a corner.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compare one-sided slopes.",
            math: "f'_-(3)=-1,\\quad f'_+(3)=1",
          },
          {
            step: 2,
            explanation: "Because they are unequal, the derivative does not exist.",
            math: "f'(3)\\text{ does not exist}",
          },
        ],
      },
      {
        questionLatex:
          "f(x)=\\begin{cases}x^2,&x<1\\\\mx+b,&x\\ge1\\end{cases}\\quad \\text{For }f\\text{ to be differentiable at }x=1,\\text{ which pair works?}",
        difficulty: 3,
        skillTags: ["piecewise_differentiability", "continuity"],
        choices: ["$m=1,\\ b=0$", "$m=2,\\ b=-1$", "$m=2,\\ b=1$", "$m=0,\\ b=1$"],
        correctLetter: "B",
        rationales: {
          A: "This makes the function continuous, but the slopes do not match.",
          C: "The slopes match, but the function is not continuous at x=1.",
          D: "This makes the function continuous, but the slopes do not match.",
        },
        hints: [
          "Differentiability requires continuity and equal one-sided derivatives.",
          "Continuity at x=1 gives $m+b=1$.",
          "Matching derivatives gives $m=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Match the left and right derivatives.",
            math: "2(1)=m\\Rightarrow m=2",
          },
          {
            step: 2,
            explanation: "Use continuity.",
            math: "1=m+b=2+b\\Rightarrow b=-1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The function }g(x)=\\sqrt[3]{x}\\text{ is continuous at }0.\\text{ What is true about }g'(0)?",
        difficulty: 3,
        skillTags: ["vertical_tangent", "continuity_vs_differentiability"],
        choices: ["$g'(0)=0$", "$g'(0)=1$", "$g'(0)\\text{ does not exist as a finite derivative}$", "$g\\text{ is not continuous at }0$"],
        correctLetter: "C",
        rationales: {
          A: "A horizontal tangent would have finite slope 0, but the slope becomes unbounded.",
          B: "This treats the cube root like a line.",
          D: "The cube root function is continuous at 0.",
        },
        hints: [
          "Use the difference quotient at 0.",
          "$\\frac{g(h)-g(0)}{h}=\\frac{\\sqrt[3]{h}}{h}$.",
          "This is $\\frac{1}{h^{2/3}}$, which becomes unbounded as h approaches 0.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the difference quotient.",
            math: "\\frac{\\sqrt[3]{h}-0}{h}=\\frac{1}{h^{2/3}}",
          },
          {
            step: 2,
            explanation: "The quotient is unbounded near 0, so there is no finite derivative.",
            math: "g'(0)\\text{ does not exist as a finite derivative}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which feature prevents differentiability but not necessarily continuity?}",
        difficulty: 2,
        skillTags: ["non_differentiability_features"],
        choices: [
          "\\text{A removable hole with no defined value}",
          "\\text{A jump discontinuity}",
          "\\text{A corner}",
          "\\text{A vertical asymptote}",
        ],
        correctLetter: "C",
        rationales: {
          A: "A missing value prevents continuity.",
          B: "A jump prevents continuity.",
          D: "A vertical asymptote prevents continuity at the point.",
        },
        hints: [
          "A function can be continuous but not differentiable.",
          "Absolute value graphs give a common example.",
          "A corner has unequal one-sided slopes but can still be connected.",
        ],
        solution: [
          {
            step: 1,
            explanation: "A corner can occur on a continuous graph but has no single tangent slope.",
            math: "f'_-(a)\\ne f'_+(a)",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "f(x)=\\begin{cases}x^2+k,&x<1\\\\mx+2,&x\\ge1\\end{cases}",
      difficulty: 4,
      skillTags: ["piecewise_continuity", "piecewise_differentiability", "justification"],
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Find a relationship between $k$ and $m$ that makes $f$ continuous at $x=1$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Find the values of $k$ and $m$ that make $f$ differentiable at $x=1$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown:
            "Explain why continuity alone is not enough to guarantee differentiability at $x=1$.",
          points: 1,
        },
      ],
      hints: [
        "Continuity means the two pieces have the same value at x=1.",
        "Differentiability also requires the left and right derivatives to match.",
        "The left derivative of $x^2+k$ at x=1 is 2.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly evaluates the left and right values at x=1." },
          { part: "a", points: 1, description: "Obtains $m=k-1$ or an equivalent relationship." },
          { part: "b", points: 1, description: "Finds the left derivative at x=1 as 2." },
          { part: "b", points: 1, description: "Sets $m=2$ from derivative matching." },
          { part: "b", points: 1, description: "Uses continuity to find $k=3$." },
          { part: "c", points: 1, description: "Explains that equal function values do not force equal one-sided slopes." },
        ],
      },
      commonErrors: [
        "Checking only continuity and stopping.",
        "Using $k$ as a slope even though it is added as a constant.",
        "Forgetting that the right derivative of $mx+2$ is $m$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "Continuity at x=1 requires $1+k=m+2$, so $m=k-1$.",
        },
        {
          part: "b",
          explanation:
            "The left derivative at x=1 is $2$, and the right derivative is $m$, so $m=2$. From continuity, $2=k-1$, so $k=3$.",
        },
        {
          part: "c",
          explanation:
            "Continuity only makes the pieces meet. Differentiability also requires the left and right slopes to match, so a continuous corner is still not differentiable.",
        },
      ],
    },
  },
  {
    topicCode: "2.5",
    title: "Applying the Power Rule",
    subtopic:
      "Differentiating powers, including negative and fractional exponents",
    mc: [
      {
        questionLatex:
          "\\text{Which equation gives the tangent line to }y=x^7\\text{ at }x=1?",
        difficulty: 2,
        skillTags: ["power_rule", "tangent_line"],
        choices: [
          "$y-1=7(x-1)$",
          "$y-1=x-1$",
          "$y-7=1(x-1)$",
          "$y=7x^6$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses the point correctly but misses the tangent slope of 7.",
          C: "This swaps the function value and slope information.",
          D: "This is the derivative formula, not a tangent line through $(1,1)$.",
        },
        hints: [
          "A tangent line needs a point and a slope.",
          "$y'=7x^6$, so the tangent slope at x=1 is 7.",
          "The point on the graph is $(1,1)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the tangent line data at x=1.",
            math: "f(1)=1,\\quad f'(1)=7",
          },
          {
            step: 2,
            explanation: "Write the tangent line in point-slope form.",
            math: "y-1=7(x-1)",
          },
        ],
      },
      {
        questionLatex: "\\frac{d}{dx}\\left(5x^{-2}\\right)=",
        difficulty: 2,
        skillTags: ["power_rule", "negative_exponents"],
        choices: ["$-10x^{-3}$", "$10x^{-1}$", "$5x^{-3}$", "$-2x^{-3}$"],
        correctLetter: "A",
        rationales: {
          B: "The exponent should decrease from -2 to -3.",
          C: "The coefficient must be multiplied by -2.",
          D: "The original coefficient 5 is missing.",
        },
        hints: [
          "Keep the coefficient 5.",
          "Multiply by the old exponent -2.",
          "Subtract 1 from -2 to get -3.",
        ],
        solution: [
          { step: 1, explanation: "Apply the power rule with a negative exponent.", math: "5(-2)x^{-3}=-10x^{-3}" },
        ],
      },
      {
        questionLatex: "\\frac{d}{dx}\\left(\\sqrt{x}\\right)=",
        difficulty: 2,
        skillTags: ["power_rule", "fractional_exponents"],
        choices: ["$\\sqrt{x}$", "$\\frac{1}{2\\sqrt{x}}$", "$2\\sqrt{x}$", "$\\frac{1}{x^2}$"],
        correctLetter: "B",
        rationales: {
          A: "This leaves the function unchanged.",
          C: "This multiplies by 2 instead of using exponent 1/2.",
          D: "This is not the result of differentiating $x^{1/2}$.",
        },
        hints: [
          "Rewrite $\\sqrt{x}$ as $x^{1/2}$.",
          "Apply the power rule.",
          "$\\frac12 x^{-1/2}=\\frac{1}{2\\sqrt{x}}$.",
        ],
        solution: [
          { step: 1, explanation: "Rewrite and differentiate.", math: "\\frac{d}{dx}x^{1/2}=\\frac12x^{-1/2}=\\frac{1}{2\\sqrt{x}}" },
        ],
      },
      {
        questionLatex:
          "\\text{If }f(x)=x^{3/2},\\text{ then }f'(4)=",
        difficulty: 2,
        skillTags: ["power_rule", "evaluate_derivative"],
        choices: ["$2$", "$3$", "$6$", "$8$"],
        correctLetter: "B",
        rationales: {
          A: "This is $\\sqrt{4}$, not the derivative value.",
          C: "This treats the derivative as $3\\sqrt{x}$.",
          D: "This is the original function value at 4.",
        },
        hints: [
          "First find $f'(x)$.",
          "$f'(x)=\\frac32x^{1/2}$.",
          "Evaluate at x=4.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "f'(4)=\\frac32\\sqrt{4}=3" },
        ],
      },
      {
        questionLatex: "\\frac{d}{dx}\\left(\\frac{4}{x^3}\\right)=",
        difficulty: 2,
        skillTags: ["power_rule", "negative_exponents"],
        choices: ["$\\frac{12}{x^2}$", "$-\\frac{12}{x^4}$", "$\\frac{4}{3x^2}$", "$-\\frac{4}{x^4}$"],
        correctLetter: "B",
        rationales: {
          A: "The sign should be negative and the exponent should increase in the denominator.",
          C: "The power rule multiplies by the exponent; it does not divide by it.",
          D: "The factor of 3 from the exponent is missing.",
        },
        hints: [
          "Rewrite $\\frac4{x^3}$ as $4x^{-3}$.",
          "Apply the power rule.",
          "$4(-3)x^{-4}=-12x^{-4}$.",
        ],
        solution: [
          { step: 1, explanation: "Use a negative exponent.", math: "\\frac{d}{dx}(4x^{-3})=-12x^{-4}=-\\frac{12}{x^4}" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{For }x>0,\\text{ let }p(x)=2x^5-3x^3+4\\sqrt{x}-\\frac6x.",
      difficulty: 3,
      skillTags: ["power_rule", "fractional_exponents", "tangent_line"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Rewrite $p(x)$ using only powers of $x$.",
          points: 1,
        },
        {
          letter: "b",
          promptMarkdown: "Find $p'(x)$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown: "Find an equation of the tangent line to $y=p(x)$ at $x=1$.",
          points: 2,
        },
      ],
      hints: [
        "Use $\\sqrt{x}=x^{1/2}$ and $\\frac1x=x^{-1}$.",
        "Apply the power rule to each term.",
        "The tangent line needs $p(1)$ and $p'(1)$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Rewrites radical and reciprocal terms as powers." },
          { part: "b", points: 1, description: "Correctly differentiates polynomial terms." },
          { part: "b", points: 1, description: "Correctly differentiates $4x^{1/2}$." },
          { part: "b", points: 1, description: "Correctly differentiates $-6x^{-1}$." },
          { part: "c", points: 1, description: "Finds $p(1)=-3$ and $p'(1)=9$." },
          { part: "c", points: 1, description: "Writes a correct tangent line equation." },
        ],
      },
      commonErrors: [
        "Differentiating $\\sqrt{x}$ as $\\frac1{\\sqrt{x}}$ instead of $\\frac1{2\\sqrt{x}}$.",
        "Losing the negative sign in $-6x^{-1}$.",
        "Using $p(1)$ as the slope.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$p(x)=2x^5-3x^3+4x^{1/2}-6x^{-1}$.",
        },
        {
          part: "b",
          explanation:
            "$p'(x)=10x^4-9x^2+2x^{-1/2}+6x^{-2}=10x^4-9x^2+\\frac{2}{\\sqrt{x}}+\\frac6{x^2}$.",
        },
        {
          part: "c",
          explanation:
            "$p(1)=-3$ and $p'(1)=10-9+2+6=9$, so $y+3=9(x-1)$.",
        },
      ],
    },
  },
  {
    topicCode: "2.6",
    title: "Derivative Rules: Constant, Sum, Difference, and Constant Multiple",
    subtopic:
      "Combining basic derivative rules and interpreting derivatives of linear combinations",
    mc: [
      {
        questionLatex:
          "\\text{If }h(x)=3f(x)-7\\text{ and }f'(2)=-4,\\text{ what is }h'(2)?",
        difficulty: 2,
        skillTags: ["constant_rule", "constant_multiple_rule", "derivative_values"],
        choices: ["$-19$", "$-12$", "$5$", "$0$"],
        correctLetter: "B",
        rationales: {
          A: "This incorrectly includes the constant -7 in the derivative value.",
          C: "This combines the coefficient and derivative with the wrong operation.",
          D: "The constant differentiates to 0, but the $3f(x)$ term still contributes.",
        },
        hints: [
          "Differentiate $h(x)=3f(x)-7$ term by term.",
          "The derivative of the constant -7 is 0.",
          "$h'(x)=3f'(x)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the constant multiple and constant rules.",
            math: "h'(2)=3f'(2)=3(-4)=-12",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Which equation gives the tangent line to }y=3x^4-5x+8\\text{ at }x=1?",
        difficulty: 3,
        skillTags: ["sum_rule", "constant_multiple_rule", "tangent_line"],
        choices: [
          "$y-6=7(x-1)$",
          "$y-6=6(x-1)$",
          "$y-7=6(x-1)$",
          "$y=7x+8$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses the function value as the slope.",
          C: "This swaps the point value and slope information.",
          D: "This has slope 7 but does not pass through $(1,6)$.",
        },
        hints: [
          "The tangent line needs both $y(1)$ and $y'(1)$.",
          "$y(1)=3-5+8=6$.",
          "$y'=12x^3-5$, so $y'(1)=7$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the point and tangent slope.",
            math: "y(1)=6,\\quad y'(1)=12(1)^3-5=7",
          },
          {
            step: 2,
            explanation: "Write the tangent line in point-slope form.",
            math: "y-6=7(x-1)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f'(2)=3\\text{ and }g'(2)=-4,\\text{ find }\\frac{d}{dx}\\left(5f(x)-2g(x)\\right)\\bigg|_{x=2}.",
        difficulty: 2,
        skillTags: ["linear_combination", "derivative_values"],
        choices: ["$7$", "$11$", "$15$", "$23$"],
        correctLetter: "D",
        rationales: {
          A: "This adds the original derivative values without coefficients.",
          B: "This treats the second coefficient sign incorrectly.",
          C: "This ignores the contribution from g.",
        },
        hints: [
          "Differentiate the linear combination.",
          "The derivative is $5f'(x)-2g'(x)$.",
          "Substitute $f'(2)=3$ and $g'(2)=-4$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the linearity rules.", math: "5f'(2)-2g'(2)=5(3)-2(-4)=23" },
        ],
      },
      {
        questionLatex:
          "\\frac{d}{dx}\\left[(x^3-2x^2+x)-(4x^2-1)\\right]=",
        difficulty: 3,
        skillTags: ["difference_rule", "polynomial_derivative"],
        choices: ["$3x^2-12x+1$", "$3x^2+4x+1$", "$3x^2-4x+1$", "$x^3-6x^2+x-1$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative of the subtracted $4x^2$ term should subtract $8x$.",
          C: "This forgets to differentiate and subtract $4x^2-1$.",
          D: "This simplifies the original expression but does not differentiate.",
        },
        hints: [
          "You may simplify first or differentiate term by term.",
          "The derivative of the first group is $3x^2-4x+1$.",
          "Then subtract the derivative $8x$.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate both groups.", math: "(3x^2-4x+1)-8x=3x^2-12x+1" },
        ],
      },
      {
        questionLatex:
          "\\text{The slope of the tangent line to }y=2x^3-3x+4\\text{ at }x=-1\\text{ is}",
        difficulty: 2,
        skillTags: ["tangent_slope", "polynomial_derivative"],
        choices: ["$-5$", "$0$", "$3$", "$9$"],
        correctLetter: "C",
        rationales: {
          A: "This is the function value at x=-1, not the derivative.",
          B: "The derivative is not zero at x=-1.",
          D: "This forgets the -3 term in the derivative.",
        },
        hints: [
          "The tangent slope is y' at the given x-value.",
          "Differentiate: $y'=6x^2-3$.",
          "Evaluate at x=-1.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "y'(-1)=6(-1)^2-3=3" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }h(x)=4f(x)-3g(x)+7.\\text{ Suppose }f(1)=2,\\ g(1)=-1,\\ f'(1)=5,\\text{ and }g'(1)=-2.",
      difficulty: 3,
      skillTags: ["linear_combination", "tangent_line", "derivative_interpretation"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $h(1)$.",
          points: 1,
        },
        {
          letter: "b",
          promptMarkdown: "Find $h'(1)$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown: "Find the tangent line to $y=h(x)$ at $x=1$.",
          points: 2,
        },
        {
          letter: "d",
          promptMarkdown:
            "Let $k(x)=h(x)-26x$. Explain what is true about the tangent line to $k$ at $x=1$.",
          points: 1,
        },
      ],
      hints: [
        "Use function values for part (a) and derivative values for part (b).",
        "The derivative of $4f(x)-3g(x)+7$ is $4f'(x)-3g'(x)$.",
        "For part (d), compute $k'(1)$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Computes $h(1)=18$." },
          { part: "b", points: 1, description: "Differentiates the linear combination correctly." },
          { part: "b", points: 1, description: "Computes $h'(1)=26$." },
          { part: "c", points: 1, description: "Uses point $(1,18)$ and slope 26." },
          { part: "c", points: 1, description: "Writes a correct tangent line equation." },
          { part: "d", points: 1, description: "Explains that $k'(1)=0$, so the tangent line is horizontal." },
        ],
      },
      commonErrors: [
        "Using $f'(1)$ and $g'(1)$ to compute $h(1)$.",
        "Dropping the negative sign in $-3g(x)$.",
        "Forgetting that the derivative of 7 is 0.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$h(1)=4(2)-3(-1)+7=18$.",
        },
        {
          part: "b",
          explanation:
            "$h'(x)=4f'(x)-3g'(x)$, so $h'(1)=4(5)-3(-2)=26$.",
        },
        {
          part: "c",
          explanation:
            "The tangent line uses point $(1,18)$ and slope 26: $y-18=26(x-1)$.",
        },
        {
          part: "d",
          explanation:
            "$k'(1)=h'(1)-26=0$, so the tangent line to $k$ at x=1 is horizontal.",
        },
      ],
    },
  },
  {
    topicCode: "2.7",
    title: "Derivatives of cos x, sin x, e^x, and ln x",
    subtopic:
      "Using core transcendental derivative rules without chain rule",
    mc: [
      {
        questionLatex:
          "\\text{Which equation is the tangent line to }y=\\sin x+\\cos x\\text{ at }x=0?",
        difficulty: 2,
        skillTags: ["trig_derivatives", "sum_rule", "tangent_line"],
        choices: ["$y-1=x$", "$y=x$", "$y-1=-x$", "$y=1$"],
        correctLetter: "A",
        rationales: {
          B: "This uses the slope but misses the point $(0,1)$.",
          C: "This uses the wrong sign for the tangent slope.",
          D: "This uses the function value but ignores the nonzero slope.",
        },
        hints: [
          "Find the function value and derivative value at x=0.",
          "$f(0)=\\sin0+\\cos0=1$.",
          "$f'(x)=\\cos x-\\sin x$, so $f'(0)=1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the point and slope.",
            math: "f(0)=1,\\quad f'(0)=\\cos0-\\sin0=1",
          },
          {
            step: 2,
            explanation: "Write the tangent line.",
            math: "y-1=1(x-0)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The slope of the tangent line to }y=e^x-\\ln x\\text{ at }x=1\\text{ is}",
        difficulty: 2,
        skillTags: ["exponential_log_derivatives", "difference_rule", "tangent_slope"],
        choices: ["$e-1$", "$e+1$", "$1-e$", "$e$"],
        correctLetter: "A",
        rationales: {
          B: "This does not keep the negative sign on the derivative of $\\ln x$.",
          C: "This reverses the order of the derivative terms.",
          D: "This ignores the derivative of $-\\ln x$.",
        },
        hints: [
          "The tangent slope is the derivative at x=1.",
          "$\\frac{d}{dx}(e^x-\\ln x)=e^x-\\frac1x$.",
          "Evaluate $e^x-\\frac1x$ at x=1.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate and evaluate at x=1.",
            math: "y'(1)=e^1-\\frac11=e-1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f(x)=\\sin x+e^x,\\text{ then }f'\\left(\\frac\\pi2\\right)=",
        difficulty: 2,
        skillTags: ["trig_derivatives", "evaluate_derivative"],
        choices: ["$1+e^{\\pi/2}$", "$e^{\\pi/2}$", "$-1+e^{\\pi/2}$", "$0$"],
        correctLetter: "B",
        rationales: {
          A: "This uses $\\sin(\\pi/2)$ instead of differentiating sin x.",
          C: "The derivative of sin x is cos x, and $\\cos(\\pi/2)=0$.",
          D: "The exponential term contributes $e^{\\pi/2}$.",
        },
        hints: [
          "First find $f'(x)$.",
          "$f'(x)=\\cos x+e^x$.",
          "$\\cos(\\pi/2)=0$.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "f'\\left(\\frac\\pi2\\right)=\\cos\\left(\\frac\\pi2\\right)+e^{\\pi/2}=e^{\\pi/2}" },
        ],
      },
      {
        questionLatex:
          "\\text{The slope of the tangent line to }y=\\ln x+x\\text{ at }x=1\\text{ is}",
        difficulty: 2,
        skillTags: ["log_derivative", "tangent_slope"],
        choices: ["$0$", "$1$", "$2$", "$e$"],
        correctLetter: "C",
        rationales: {
          A: "This is $\\ln 1$, not the derivative.",
          B: "This ignores the derivative of x.",
          D: "No $e^x$ term appears in the function.",
        },
        hints: [
          "Differentiate $\\ln x+x$.",
          "$\\frac{d}{dx}\\ln x=\\frac1x$ and $\\frac{d}{dx}x=1$.",
          "Evaluate $\\frac1x+1$ at x=1.",
        ],
        solution: [
          { step: 1, explanation: "Find the derivative and evaluate.", math: "y'=\\frac1x+1,\\quad y'(1)=2" },
        ],
      },
      {
        questionLatex:
          "\\frac{d}{dx}\\left(\\cos x-3\\sin x+2e^x+\\ln x\\right)=",
        difficulty: 3,
        skillTags: ["trig_derivatives", "exponential_log_derivatives", "linear_combination"],
        choices: [
          "$-\\sin x-3\\cos x+2e^x+\\frac1x$",
          "$\\sin x-3\\cos x+2e^x+\\frac1x$",
          "$-\\sin x+3\\cos x+2e^x+\\ln x$",
          "$-\\cos x-3\\sin x+2e^x+x$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The derivative of cos x is negative sin x.",
          C: "The sign on the derivative of -3sin x is negative, and ln x must be differentiated.",
          D: "This does not use the correct trig or log derivative rules.",
        },
        hints: [
          "Differentiate each term independently.",
          "Remember the signs for sine and cosine.",
          "The derivative of $\\ln x$ is $1/x$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the basic derivative rules.", math: "-\\sin x-3\\cos x+2e^x+\\frac1x" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=\\sin x+\\cos x+e^x.",
      difficulty: 3,
      skillTags: ["trig_derivatives", "exponential_derivative", "tangent_line"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $f'(x)$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Find the tangent line to $y=f(x)$ at $x=0$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown:
            "Evaluate $f'\\left(\\frac\\pi2\\right)$ and interpret it as a tangent slope.",
          points: 1,
        },
      ],
      hints: [
        "Differentiate sine, cosine, and exponential terms separately.",
        "At x=0, use $\\sin0=0$, $\\cos0=1$, and $e^0=1$.",
        "At $\\pi/2$, use $\\cos(\\pi/2)=0$ and $\\sin(\\pi/2)=1$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly differentiates sine and cosine terms." },
          { part: "a", points: 1, description: "Correctly differentiates $e^x$." },
          { part: "b", points: 1, description: "Finds $f(0)=2$." },
          { part: "b", points: 1, description: "Finds $f'(0)=2$." },
          { part: "b", points: 1, description: "Writes a correct tangent line equation." },
          { part: "c", points: 1, description: "Finds $f'(\\pi/2)=e^{\\pi/2}-1$ and interprets it as slope." },
        ],
      },
      commonErrors: [
        "Writing the derivative of cos x as sin x.",
        "Using function values instead of derivative values for the slope.",
        "Dropping the $e^x$ term from the derivative.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f'(x)=\\cos x-\\sin x+e^x$.",
        },
        {
          part: "b",
          explanation:
            "$f(0)=2$ and $f'(0)=2$, so the tangent line is $y-2=2x$.",
        },
        {
          part: "c",
          explanation:
            "$f'(\\pi/2)=0-1+e^{\\pi/2}=e^{\\pi/2}-1$, which is the slope of the tangent line at $x=\\pi/2$.",
        },
      ],
    },
  },
  {
    topicCode: "2.8",
    title: "The Product Rule",
    subtopic:
      "Differentiating products of functions and avoiding the common false rule $(fg)'=f'g'$",
    mc: [
      {
        questionLatex: "\\frac{d}{dx}\\left(x^2e^x\\right)=",
        difficulty: 3,
        skillTags: ["product_rule", "exponential_derivative"],
        choices: ["$2xe^x$", "$x^2e^x$", "$e^x(x^2+2x)$", "$2x^3e^x$"],
        correctLetter: "C",
        rationales: {
          A: "This differentiates only $x^2$.",
          B: "This differentiates only $e^x$.",
          D: "This multiplies the separate derivatives incorrectly.",
        },
        hints: [
          "Use $(uv)'=u'v+uv'$.",
          "Let $u=x^2$ and $v=e^x$.",
          "The two terms are $2xe^x+x^2e^x$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the product rule.", math: "2xe^x+x^2e^x=e^x(x^2+2x)" },
        ],
      },
      {
        questionLatex:
          "\\frac{d}{dx}\\left[(x^2+1)(x^3-2)\\right]=",
        difficulty: 3,
        skillTags: ["product_rule", "polynomial_derivative"],
        choices: [
          "$2x(x^3-2)+3x^2(x^2+1)$",
          "$(2x)(3x^2)$",
          "$5x^4-4x$",
          "$(x^2+1)+(x^3-2)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The product rule is not just the product of the derivatives.",
          C: "This is not the derivative of the expanded product.",
          D: "This adds the factors instead of differentiating the product.",
        },
        hints: [
          "Let one factor be $u$ and the other be $v$.",
          "Use $u'v+uv'$.",
          "$u'=2x$ and $v'=3x^2$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the product rule.", math: "2x(x^3-2)+(x^2+1)(3x^2)" },
        ],
      },
      {
        questionLatex:
          "\\text{If }f(x)=x\\sin x,\\text{ then }f'(0)=",
        difficulty: 2,
        skillTags: ["product_rule", "trig_derivative", "evaluate_derivative"],
        choices: ["$0$", "$1$", "$-1$", "\\text{Does not exist}"],
        correctLetter: "A",
        rationales: {
          B: "This would be the derivative of x alone at 0.",
          C: "This uses the wrong trig value or sign.",
          D: "Both x and sin x are differentiable at 0.",
        },
        hints: [
          "Use the product rule.",
          "$f'(x)=\\sin x+x\\cos x$.",
          "Evaluate at x=0.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "f'(0)=\\sin0+0\\cos0=0" },
        ],
      },
      {
        questionLatex:
          "\\text{A student differentiates }F(x)=(x^2+1)e^x\\text{ and writes }F'(x)=2xe^x.\\ \\text{Which term is missing?}",
        difficulty: 3,
        skillTags: ["product_rule", "error_analysis"],
        choices: [
          "$(x^2+1)e^x$",
          "$2x$",
          "$e^x$",
          "$2x(x^2+1)$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The missing term must include the unchanged first factor and the derivative of $e^x$.",
          C: "The missing product-rule term is not just the derivative of $e^x$.",
          D: "This multiplies the derivative of the first factor by the first factor.",
        },
        hints: [
          "The student's answer is the $u'v$ term.",
          "The product rule also needs the $uv'$ term.",
          "Here $u=x^2+1$ and $v'=e^x$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the product rule and identify the missing term.",
            math: "F'(x)=2xe^x+(x^2+1)e^x",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }F(x)=(x^2+3)\\ln x,\\text{ then }F'(1)=",
        difficulty: 3,
        skillTags: ["product_rule", "log_derivative", "evaluate_derivative"],
        choices: ["$0$", "$2$", "$4$", "$6$"],
        correctLetter: "C",
        rationales: {
          A: "Although $\\ln1=0$, the second product-rule term remains.",
          B: "This differentiates only the first factor.",
          D: "This adds function values instead of applying the product rule.",
        },
        hints: [
          "Use $u=x^2+3$ and $v=\\ln x$.",
          "$F'(x)=2x\\ln x+(x^2+3)\\frac1x$.",
          "Evaluate using $\\ln1=0$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the product rule and evaluate.", math: "F'(1)=2(1)\\ln1+\\frac{1^2+3}{1}=4" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }H(x)=(x^2+1)(\\sin x+e^x).",
      difficulty: 4,
      skillTags: ["product_rule", "trig_derivative", "exponential_derivative", "error_analysis"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $H'(x)$.",
          points: 3,
        },
        {
          letter: "b",
          promptMarkdown: "Find the tangent line to $y=H(x)$ at $x=0$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "A student says $H'(x)=2x(\\cos x+e^x)$. Explain the error.",
          points: 1,
        },
      ],
      hints: [
        "The second factor is a sum, but the whole expression is a product.",
        "Use $u'v+uv'$.",
        "At x=0, $H(0)=1$ and the first product-rule term is 0.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Identifies the product rule structure." },
          { part: "a", points: 1, description: "Correctly differentiates each factor." },
          { part: "a", points: 1, description: "Writes $H'(x)=2x(\\sin x+e^x)+(x^2+1)(\\cos x+e^x)$ or equivalent." },
          { part: "b", points: 1, description: "Finds $H(0)=1$ and $H'(0)=2$." },
          { part: "b", points: 1, description: "Writes a correct tangent line equation." },
          { part: "c", points: 1, description: "Explains that the student multiplied derivatives instead of using two product-rule terms." },
        ],
      },
      commonErrors: [
        "Using the false rule $(uv)'=u'v'$.",
        "Forgetting the derivative of $e^x$ is $e^x$.",
        "Losing the entire first factor in the second product-rule term.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$H'(x)=2x(\\sin x+e^x)+(x^2+1)(\\cos x+e^x)$.",
        },
        {
          part: "b",
          explanation:
            "$H(0)=1(0+1)=1$ and $H'(0)=0+1(1+1)=2$, so $y-1=2x$.",
        },
        {
          part: "c",
          explanation:
            "The student differentiated both factors and multiplied the derivatives. The product rule requires $u'v+uv'$, so each term keeps one original factor.",
        },
      ],
    },
  },
  {
    topicCode: "2.9",
    title: "The Quotient Rule",
    subtopic:
      "Differentiating ratios of functions and reasoning about tangent slopes",
    mc: [
      {
        questionLatex:
          "\\frac{d}{dx}\\left(\\frac{x^2+1}{x-1}\\right)=",
        difficulty: 3,
        skillTags: ["quotient_rule", "polynomial_derivative"],
        choices: [
          "$\\frac{x^2-2x-1}{(x-1)^2}$",
          "$\\frac{2x}{1}$",
          "$\\frac{2x(x-1)+(x^2+1)}{(x-1)^2}$",
          "$\\frac{x^2+1}{1}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This differentiates numerator and denominator separately as a ratio.",
          C: "The quotient rule subtracts the numerator times the derivative of the denominator.",
          D: "This is not a derivative.",
        },
        hints: [
          "Use $\\frac{u'v-uv'}{v^2}$.",
          "Let $u=x^2+1$ and $v=x-1$.",
          "Simplify $2x(x-1)-(x^2+1)$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the quotient rule.", math: "\\frac{2x(x-1)-(x^2+1)}{(x-1)^2}=\\frac{x^2-2x-1}{(x-1)^2}" },
        ],
      },
      {
        questionLatex: "\\frac{d}{dx}\\left(\\frac{x}{e^x}\\right)=",
        difficulty: 3,
        skillTags: ["quotient_rule", "exponential_derivative"],
        choices: ["$\\frac{1-x}{e^x}$", "$\\frac{x-1}{e^x}$", "$\\frac{1}{e^x}$", "$\\frac{x}{e^x}$"],
        correctLetter: "A",
        rationales: {
          B: "The subtraction order in the quotient rule is reversed.",
          C: "This ignores the derivative of the denominator.",
          D: "This leaves the original function unchanged.",
        },
        hints: [
          "Use $u=x$ and $v=e^x$.",
          "$u'=1$ and $v'=e^x$.",
          "The numerator is $e^x-xe^x$.",
        ],
        solution: [
          { step: 1, explanation: "Apply and simplify.", math: "\\frac{e^x-xe^x}{e^{2x}}=\\frac{1-x}{e^x}" },
        ],
      },
      {
        questionLatex: "\\frac{d}{dx}\\left(\\frac{\\sin x}{x}\\right)=",
        difficulty: 3,
        skillTags: ["quotient_rule", "trig_derivative"],
        choices: [
          "$\\frac{x\\cos x-\\sin x}{x^2}$",
          "$\\frac{\\cos x}{1}$",
          "$\\frac{x\\sin x-\\cos x}{x^2}$",
          "$\\frac{\\sin x-x\\cos x}{x^2}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This differentiates numerator and denominator separately as a ratio.",
          C: "This differentiates sine incorrectly in the first term.",
          D: "This reverses the subtraction order.",
        },
        hints: [
          "Let $u=\\sin x$ and $v=x$.",
          "Use $u'v-uv'$ over $v^2$.",
          "$u'=\\cos x$ and $v'=1$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the quotient rule.", math: "\\frac{x\\cos x-\\sin x}{x^2}" },
        ],
      },
      {
        questionLatex: "\\frac{d}{dx}\\left(\\frac{\\ln x}{x^2}\\right)=",
        difficulty: 4,
        skillTags: ["quotient_rule", "log_derivative", "simplification"],
        choices: [
          "$\\frac{1-2\\ln x}{x^3}$",
          "$\\frac{1+2\\ln x}{x^3}$",
          "$\\frac{\\ln x}{2x}$",
          "$\\frac{x^2-\\ln x}{x^4}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The quotient rule subtracts the numerator times the derivative of the denominator.",
          C: "This divides derivatives incorrectly.",
          D: "The derivative of $\\ln x$ is $1/x$, not 1.",
        },
        hints: [
          "Use $u=\\ln x$ and $v=x^2$.",
          "The quotient-rule numerator is $\\frac1x x^2-(\\ln x)2x$.",
          "Factor x in the numerator and simplify with $x^4$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the quotient rule.", math: "\\frac{x-2x\\ln x}{x^4}=\\frac{1-2\\ln x}{x^3}" },
        ],
      },
      {
        questionLatex:
          "\\text{If }q(x)=\\frac{x^2+1}{x+1},\\text{ then }q'(1)=",
        difficulty: 3,
        skillTags: ["quotient_rule", "evaluate_derivative"],
        choices: ["$\\frac12$", "$1$", "$2$", "$4$"],
        correctLetter: "A",
        rationales: {
          B: "This is the function value $q(1)$, not the derivative.",
          C: "This is the numerator value at x=1.",
          D: "This is the denominator squared at x=1.",
        },
        hints: [
          "Use the quotient rule first.",
          "$q'(x)=\\frac{2x(x+1)-(x^2+1)}{(x+1)^2}$.",
          "Evaluate the numerator and denominator at x=1.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "q'(1)=\\frac{2(1)(2)-(2)}{2^2}=\\frac12" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }q(x)=\\frac{x^2+1}{x+1},\\quad x\\ne -1.",
      difficulty: 4,
      skillTags: ["quotient_rule", "tangent_line", "horizontal_tangent"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $q'(x)$ and simplify the numerator.",
          points: 3,
        },
        {
          letter: "b",
          promptMarkdown: "Find the tangent line to $y=q(x)$ at $x=1$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown: "Find all x-values where $q$ has a horizontal tangent.",
          points: 1,
        },
      ],
      hints: [
        "Use the quotient rule with $u=x^2+1$ and $v=x+1$.",
        "Horizontal tangents occur where $q'(x)=0$ and the function is defined.",
        "Solve $x^2+2x-1=0$.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Applies the quotient rule with correct subtraction order." },
          { part: "a", points: 1, description: "Obtains denominator $(x+1)^2$." },
          { part: "a", points: 1, description: "Simplifies numerator to $x^2+2x-1$." },
          { part: "b", points: 1, description: "Finds $q(1)=1$ and $q'(1)=1/2$." },
          { part: "b", points: 1, description: "Writes a correct tangent line equation." },
          { part: "c", points: 1, description: "Solves $x^2+2x-1=0$ to get $x=-1\\pm\\sqrt2$." },
        ],
      },
      commonErrors: [
        "Reversing $u'v-uv'$.",
        "Setting the denominator equal to zero to find horizontal tangents.",
        "Forgetting to check the domain $x\\ne -1$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$q'(x)=\\frac{2x(x+1)-(x^2+1)}{(x+1)^2}=\\frac{x^2+2x-1}{(x+1)^2}$.",
        },
        {
          part: "b",
          explanation:
            "$q(1)=1$ and $q'(1)=\\frac12$, so the tangent line is $y-1=\\frac12(x-1)$.",
        },
        {
          part: "c",
          explanation:
            "Horizontal tangents occur when $x^2+2x-1=0$, so $x=-1\\pm\\sqrt2$. Both are in the domain.",
        },
      ],
    },
  },
  {
    topicCode: "2.10",
    title:
      "Finding the Derivatives of Tangent, Cotangent, Secant, and/or Cosecant Functions",
    subtopic:
      "Using the remaining trigonometric derivative rules in direct and combined forms",
    mc: [
      {
        questionLatex:
          "\\text{The slope of the tangent line to }y=\\tan x\\text{ at }x=\\frac\\pi4\\text{ is}",
        difficulty: 2,
        skillTags: ["trig_derivatives", "tan_derivative", "tangent_slope"],
        choices: ["$1$", "$\\sqrt2$", "$2$", "$4$"],
        correctLetter: "C",
        rationales: {
          A: "This is $\\tan(\\pi/4)$, not the tangent slope.",
          B: "This is $\\sec(\\pi/4)$, not $\\sec^2(\\pi/4)$.",
          D: "This squares the final value incorrectly.",
        },
        hints: [
          "The tangent slope is the derivative value at the point.",
          "$\\frac{d}{dx}\\tan x=\\sec^2x$.",
          "$\\sec(\\pi/4)=\\sqrt2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the derivative at the point.",
            math: "\\left.\\frac{d}{dx}\\tan x\\right|_{x=\\pi/4}=\\sec^2\\left(\\frac\\pi4\\right)=2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A tangent line is drawn to }y=\\cot x\\text{ at }x=\\frac\\pi4.\\text{ What is its slope?}",
        difficulty: 2,
        skillTags: ["trig_derivatives", "cot_derivative", "tangent_slope"],
        choices: ["$-2$", "$-\\sqrt2$", "$2$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $-\\csc(\\pi/4)$ instead of $-\\csc^2(\\pi/4)$.",
          C: "The derivative of cotangent is negative.",
          D: "The cotangent function is changing at $\\pi/4$.",
        },
        hints: [
          "The derivative of cotangent is negative.",
          "$\\frac{d}{dx}\\cot x=-\\csc^2x$.",
          "$\\csc(\\pi/4)=\\sqrt2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the derivative at $\\pi/4$.",
            math: "-\\csc^2\\left(\\frac\\pi4\\right)=-(\\sqrt2)^2=-2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }h(x)=\\sec x,\\text{ then }h'\\left(\\frac\\pi3\\right)=",
        difficulty: 3,
        skillTags: ["trig_derivatives", "sec_derivative", "evaluate_derivative"],
        choices: ["$2\\sqrt3$", "$\\sqrt3$", "$4$", "$-2\\sqrt3$"],
        correctLetter: "A",
        rationales: {
          B: "This is $\\tan(\\pi/3)$, but the derivative also includes $\\sec(\\pi/3)$.",
          C: "This uses $\\sec^2(\\pi/3)$, the derivative of tangent, not secant.",
          D: "The derivative of secant is positive where both secant and tangent are positive.",
        },
        hints: [
          "Use the secant derivative rule.",
          "$h'(x)=\\sec x\\tan x$.",
          "At $\\pi/3$, $\\sec x=2$ and $\\tan x=\\sqrt3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Evaluate the derivative.",
            math: "h'\\left(\\frac\\pi3\\right)=\\sec\\left(\\frac\\pi3\\right)\\tan\\left(\\frac\\pi3\\right)=2\\sqrt3",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }r(x)=\\csc x-\\cot x,\\text{ then }r'\\left(\\frac\\pi2\\right)=",
        difficulty: 3,
        skillTags: ["trig_derivatives", "evaluate_derivative"],
        choices: ["$-1$", "$0$", "$1$", "$2$"],
        correctLetter: "C",
        rationales: {
          A: "This reverses the sign from differentiating $-\\cot x$.",
          B: "The derivative of $-\\cot x$ contributes $+\\csc^2x$.",
          D: "This overcounts the csc term.",
        },
        hints: [
          "$\\frac{d}{dx}\\csc x=-\\csc x\\cot x$.",
          "$\\frac{d}{dx}(-\\cot x)=+\\csc^2x$.",
          "At $\\pi/2$, $\\csc x=1$ and $\\cot x=0$.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "r'(x)=-\\csc x\\cot x+\\csc^2x,\\quad r'\\left(\\frac\\pi2\\right)=0+1=1" },
        ],
      },
      {
        questionLatex:
          "\\text{If }s(x)=\\tan x+\\sec x,\\text{ then }s'\\left(\\frac\\pi4\\right)=",
        difficulty: 3,
        skillTags: ["trig_derivatives", "evaluate_derivative"],
        choices: ["$2$", "$\\sqrt2$", "$2+\\sqrt2$", "$4$"],
        correctLetter: "C",
        rationales: {
          A: "This includes only the derivative of tan x at pi/4.",
          B: "This includes only the derivative of sec x at pi/4.",
          D: "This treats both contributions as 2.",
        },
        hints: [
          "$s'(x)=\\sec^2x+\\sec x\\tan x$.",
          "At $\\pi/4$, $\\sec x=\\sqrt2$ and $\\tan x=1$.",
          "Add the two derivative contributions.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate and evaluate.", math: "s'\\left(\\frac\\pi4\\right)=2+\\sqrt2" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }s(x)=\\tan x+\\sec x\\text{ for }-\\frac\\pi2<x<\\frac\\pi2.",
      difficulty: 4,
      skillTags: ["trig_derivatives", "tangent_line", "domain_reasoning"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find $s'(x)$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Find the tangent line to $y=s(x)$ at $x=\\frac\\pi4$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown:
            "For $r(x)=\\csc x-\\cot x$, find $r'\\left(\\frac\\pi2\\right)$.",
          points: 1,
        },
      ],
      hints: [
        "Use $\\frac{d}{dx}\\tan x=\\sec^2x$ and $\\frac{d}{dx}\\sec x=\\sec x\\tan x$.",
        "At $\\pi/4$, $\\tan x=1$ and $\\sec x=\\sqrt2$.",
        "For part (c), remember both csc and cot derivatives have signs.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Correctly differentiates tan x." },
          { part: "a", points: 1, description: "Correctly differentiates sec x." },
          { part: "b", points: 1, description: "Finds $s(\\pi/4)=1+\\sqrt2$." },
          { part: "b", points: 1, description: "Finds $s'(\\pi/4)=2+\\sqrt2$." },
          { part: "b", points: 1, description: "Writes a correct tangent line equation." },
          { part: "c", points: 1, description: "Finds $r'(\\pi/2)=1$." },
        ],
      },
      commonErrors: [
        "Confusing the derivative of sec x with sec squared x.",
        "Forgetting that cot x differentiates to a negative expression.",
        "Using degree-mode values for $\\pi/4$ and $\\pi/2$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$s'(x)=\\sec^2x+\\sec x\\tan x$.",
        },
        {
          part: "b",
          explanation:
            "$s(\\pi/4)=1+\\sqrt2$ and $s'(\\pi/4)=2+\\sqrt2$, so $y-(1+\\sqrt2)=(2+\\sqrt2)(x-\\frac\\pi4)$.",
        },
        {
          part: "c",
          explanation:
            "$r'(x)=-\\csc x\\cot x+\\csc^2x$, so $r'(\\pi/2)=0+1=1$.",
        },
      ],
    },
  },
];

export const differentiationTopics: Topic[] = topicSeeds.map(makeTopic);
