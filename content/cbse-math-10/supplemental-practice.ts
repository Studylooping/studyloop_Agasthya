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

const COURSE = "cbse-math-10";
const VERSION = "0.2.0";
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const REVIEW_STATUS = "human_review_required" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

function L(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\\\/g, "\\");
}

type Difficulty = 1 | 2 | 3 | 4 | 5;
type McLetter = (typeof LETTERS)[number];

interface MathBoostSpec {
  unit: string;
  topicCode: string;
  title: string;
  subtopic: string;
  core: string;
  scenario: string;
  bestMove: string;
  trap: string;
  workedPrompt: string;
  workedAnswer: string;
  workedMath?: string;
  difficulty: Difficulty;
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

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function solutionPart(partLetter: string, explanation: string, math?: string): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function rubric(parts: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: parts.reduce((sum, item) => sum + item.points, 0),
    criteria: parts.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Correct mathematical work for part ${item.letter}, with formula/theorem and final conclusion.`,
    })),
  };
}

function choice(
  letter: McLetter,
  text: string,
  correctLetter: McLetter,
  rationale: string,
): McChoice {
  return {
    letter,
    text,
    isCorrect: letter === correctLetter,
    rationaleIfWrong: letter === correctLetter ? null : rationale,
    misconceptionTag:
      letter === correctLetter ? null : "cbse_class10_math_booster_trap",
  };
}

function rotateChoiceTexts(
  choices: readonly [string, string, string, string],
  shift: number,
): { texts: readonly [string, string, string, string]; correctLetter: McLetter } {
  const rotated = [...choices];
  for (let count = 0; count < shift % LETTERS.length; count += 1) {
    const first = rotated.shift();
    if (first) rotated.push(first);
  }

  return {
    texts: rotated as [string, string, string, string],
    correctLetter: LETTERS[(LETTERS.length - (shift % LETTERS.length)) % LETTERS.length],
  };
}

function mc(
  spec: MathBoostSpec,
  localIndex: number,
  difficulty: Difficulty,
  questionLatex: string,
  choices: readonly [string, string, string, string],
  solution: readonly SolutionStep[],
): McSingleItem {
  const rotated = rotateChoiceTexts(
    choices,
    localIndex + Math.round(Number(spec.topicCode.replace(".", ""))),
  );

  return {
    contentId: `${COURSE}.${spec.unit}.t${topicSlug(spec.topicCode)}.mc.${String(200 + localIndex).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: spec.unit,
    topic: spec.topicCode,
    difficulty,
    calculatorAllowed: false,
    skillTags: ["board_booster", "weighted_practice", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "uses_a_formula_or_theorem_without_checking_its_conditions",
    ],
    questionLatex,
    choices: LETTERS.map((letter, index) =>
      choice(
        letter,
        rotated.texts[index],
        rotated.correctLetter,
        `This option misses a condition in ${spec.title} or follows the common trap: ${spec.trap}.`,
      ),
    ),
    correctLetter: rotated.correctLetter,
    hintLadder: hints([
      "Name the formula, theorem or condition before calculating.",
      "Check whether the given information satisfies the condition of that result.",
      "Now substitute carefully and write the final conclusion with units or reasoning where needed.",
    ]),
    workedSolution: [...solution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function frq(
  spec: MathBoostSpec,
  localIndex: number,
  responseType: "vsaq" | "saq" | "case" | "laq",
  difficulty: Difficulty,
  questionLatex: string,
  parts: readonly FrqPart[],
  workedSolution: readonly FrqSolutionPart[],
): FrqItem {
  return {
    contentId: `${COURSE}.${spec.unit}.t${topicSlug(spec.topicCode)}.${responseType}.${String(200 + localIndex).padStart(3, "0")}`,
    kind: "frq",
    responseType,
    course: COURSE,
    unit: spec.unit,
    topic: spec.topicCode,
    difficulty,
    calculatorAllowed: false,
    skillTags: ["board_booster", "weighted_practice", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "states_the_answer_without_showing_the_condition_formula_or_reasoning",
    ],
    questionLatex,
    parts: [...parts],
    hintLadder: hints([
      "Write the known quantities and the result you plan to use.",
      "Do the algebra step-by-step; avoid jumping straight to the answer.",
      "Check whether the final value or proof actually answers the question.",
    ]),
    rubric: rubric(parts),
    commonErrors: [spec.trap],
    workedSolution: [...workedSolution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function weightedSupplementalTarget(spec: MathBoostSpec): number {
  if (spec.unit === "u2-algebra-x") return 20;
  if (spec.unit === "u4-geometry") return 18;
  if (spec.unit === "u5-trigonometry") return 18;
  if (spec.unit === "u6-mensuration") return 16;
  if (spec.unit === "u7-statistics-probability") return 16;
  return 10;
}

function weightedExpansionItems(spec: MathBoostSpec): (McSingleItem | FrqItem)[] {
  const d = spec.difficulty;
  const items: (McSingleItem | FrqItem)[] = [
    mc(
      spec,
      7,
      d,
      L`In a competency-based item from ${spec.title}, which line of reasoning should appear before the final answer?`,
      [
        spec.core,
        `A final number is enough if it appears in the options.`,
        `The common shortcut should be used even when it ${spec.trap}.`,
        `The diagram or data table should be ignored after reading the chapter title.`,
      ],
      [
        step(1, L`CBSE competency items reward method selection before calculation.`),
        step(2, spec.core),
      ],
    ),
    mc(
      spec,
      8,
      Math.min(4, d + 1) as Difficulty,
      L`A student reaches the right-looking answer in ${spec.title}, but the teacher marks the method incomplete. What is the missing check?`,
      [
        `Check whether the situation allows us to ${spec.bestMove}.`,
        `Check whether all options have the same unit.`,
        `Check whether the longest option can be chosen.`,
        `Check whether the same answer appeared earlier in the practice set.`,
      ],
      [
        step(1, L`The missing check is about validity of method, not presentation length.`),
        step(2, `The needed check is whether we can ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      9,
      "vsaq",
      Math.max(2, d - 1) as Difficulty,
      L`In ${spec.title}, explain briefly why this route is risky: ${spec.trap}.`,
      [part("a", "Write the correction.", 2)],
      [
        solutionPart(
          "a",
          `The route is risky because it bypasses the condition of the result. A reliable answer should ${spec.bestMove}.`,
        ),
      ],
    ),
    mc(
      spec,
      10,
      d,
      L`Which response would receive full method credit in ${spec.title}?`,
      [
        `It states the condition, applies the correct calculation, and checks that ${spec.trap} has not occurred.`,
        `It writes only the final value because the method is standard.`,
        `It begins with the trap and changes the final sign if needed.`,
        `It uses a memorised result without connecting it to the given data.`,
      ],
      [
        step(1, L`Full method credit needs condition, calculation and conclusion.`),
        step(2, `The trap to avoid is: ${spec.trap}.`),
      ],
    ),
    frq(
      spec,
      11,
      "saq",
      d,
      L`Use a board-style method for this ${spec.title} prompt: ${spec.workedPrompt}`,
      [
        part("a", "State the governing formula or theorem.", 1),
        part("b", "Complete the calculation and include one check.", 2),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart(
          "b",
          `${spec.workedAnswer} The check is that the solution follows the selected condition instead of the trap: ${spec.trap}.`,
          spec.workedMath,
        ),
      ],
    ),
    frq(
      spec,
      12,
      "case",
      Math.min(4, d + 1) as Difficulty,
      L`A teacher compares two solutions in ${spec.title}. Solution I uses the condition first; Solution II jumps directly to a formula.`,
      [
        part("a", "Which solution is more reliable and why?", 1),
        part("b", "Write the correct first move.", 1),
        part("c", "State the likely error in Solution II.", 2),
      ],
      [
        solutionPart("a", L`Solution I is more reliable because it checks whether the theorem/formula applies.`),
        solutionPart("b", spec.bestMove),
        solutionPart("c", `Solution II may ${spec.trap}.`),
      ],
    ),
    mc(
      spec,
      13,
      Math.min(4, d + 1) as Difficulty,
      spec.scenario,
      [
        `Translate the data, then ${spec.bestMove}.`,
        `Use the answer from the nearest example without checking the condition.`,
        `Use the common wrong route: ${spec.trap}.`,
        `Ignore the words and operate on the first two numbers only.`,
      ],
      [
        step(1, L`The scenario becomes board-level when the data must be translated first.`),
        step(2, `After translation, the correct move is to ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      14,
      "laq",
      Math.min(5, d + 1) as Difficulty,
      L`Prepare a complete solution for ${spec.title}. Core prompt: ${spec.workedPrompt}`,
      [
        part("a", "Write the condition or formula.", 1),
        part("b", "Show the calculation/proof.", 2),
        part("c", "Interpret the answer in the given context.", 1),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart("b", spec.workedAnswer, spec.workedMath),
        solutionPart("c", `The answer is accepted only because the method avoids ${spec.trap}.`),
      ],
    ),
    mc(
      spec,
      15,
      d,
      L`Which revision improves a weak answer in ${spec.title}?`,
      [
        `Add the condition, show the working, and correct the trap: ${spec.trap}.`,
        `Add a longer sentence without changing the calculation.`,
        `Delete the formula and keep only the answer.`,
        `Change the numbers until the arithmetic becomes easier.`,
      ],
      [
        step(1, L`Revision should repair mathematical reasoning.`),
        step(2, `The specific error to repair is: ${spec.trap}.`),
      ],
    ),
    frq(
      spec,
      16,
      "saq",
      Math.min(4, d + 1) as Difficulty,
      L`Write two checks that make a solution to ${spec.title} exam-ready.`,
      [
        part("a", "Write the method check.", 1),
        part("b", "Write the final-answer check.", 2),
      ],
      [
        solutionPart("a", spec.bestMove),
        solutionPart(
          "b",
          `The final answer should be checked against the condition and should not contain the error: ${spec.trap}.`,
        ),
      ],
    ),
    mc(
      spec,
      17,
      Math.min(4, d + 1) as Difficulty,
      L`In a mixed-topic board question, ${spec.title} is the hidden idea. Which clue should be used first?`,
      [
        spec.core,
        `The largest number in the stem must be the answer.`,
        `The topic title alone determines the operation.`,
        `The answer should be guessed from the option with the most symbols.`,
      ],
      [
        step(1, L`Mixed-topic questions hide the topic inside a condition or data pattern.`),
        step(2, spec.core),
      ],
    ),
    frq(
      spec,
      18,
      "case",
      Math.min(5, d + 1) as Difficulty,
      L`A student has to defend a solution from ${spec.title} in an oral board discussion.`,
      [
        part("a", "State the principle used.", 1),
        part("b", "Explain why the common trap is wrong.", 1),
        part("c", "Give the corrected strategy.", 2),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart("b", `The trap is wrong because it ${spec.trap}.`),
        solutionPart("c", `The corrected strategy is to ${spec.bestMove} and then complete the calculation.`),
      ],
    ),
    mc(
      spec,
      19,
      Math.min(4, d + 1) as Difficulty,
      L`Which answer pattern shows above-CBSE rigor in ${spec.title}?`,
      [
        `It justifies the condition, calculates, and then verifies the conclusion.`,
        `It quotes a formula and leaves the substitution to the reader.`,
        `It replaces exact values with decimals before deciding the method.`,
        `It gives two possible answers without selecting the one fitting the data.`,
      ],
      [
        step(1, L`Above-CBSE rigor means the reasoning is defensible, not merely longer.`),
        step(2, `The defensible route starts by ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      20,
      "case",
      Math.min(5, d + 1) as Difficulty,
      L`A marks-scheme note for ${spec.title} gives one mark for method, two for working, and one for interpretation.`,
      [
        part("a", "Write the method mark.", 1),
        part("b", "Write the working mark using the given prompt.", 2),
        part("c", "Write the interpretation mark.", 1),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart("b", spec.workedAnswer, spec.workedMath),
        solutionPart("c", `The interpretation must avoid the common trap: ${spec.trap}.`),
      ],
    ),
  ];

  return items.slice(0, Math.max(0, weightedSupplementalTarget(spec) - 6));
}

function makeTopic(spec: MathBoostSpec): Topic {
  const d = spec.difficulty;
  return {
    topicCode: spec.topicCode,
    title: spec.title,
    subtopic: `${spec.subtopic} Board-weighted supplemental practice.`,
    items: [
      mc(
        spec,
        1,
        Math.max(2, d - 1) as Difficulty,
        L`For ${spec.title}, which statement is mathematically reliable?`,
        [
          spec.core,
          `Always apply the result even when its conditions are not given.`,
          `Use only numerical substitution; the theorem or condition is unnecessary.`,
          `Choose the answer that looks closest before checking the algebra.`,
        ],
        [
          step(1, L`A board-style solution must first match the result with its conditions.`),
          step(2, spec.core),
        ],
      ),
      mc(
        spec,
        2,
        d,
        spec.scenario,
        [
          `Start by ${spec.bestMove}.`,
          `Ignore the condition and use the first formula remembered.`,
          `Round all numbers first and then decide the method.`,
          `Use the diagram or wording as decoration, not as mathematical data.`,
        ],
        [
          step(1, L`The scenario is testing method selection, not just recall.`),
          step(2, `The correct first move is to ${spec.bestMove}.`),
        ],
      ),
      mc(
        spec,
        3,
        d,
        L`A student's solution in ${spec.title} goes wrong because it ${spec.trap}. What is the best correction?`,
        [
          `State the condition clearly, then redo the calculation or proof from that condition.`,
          `Keep the wrong step but change only the final answer.`,
          `Use a more complicated formula even if the simple condition already applies.`,
          `Skip the reasoning because Class 10 marking gives credit only for the final value.`,
        ],
        [
          step(1, `The mistake is: ${spec.trap}.`),
          step(2, L`CBSE marking rewards the condition/formula and the conclusion, so the correction must repair the reasoning.`),
        ],
      ),
      frq(
        spec,
        4,
        "saq",
        d,
        spec.workedPrompt,
        [
          part("a", "Identify the relevant formula/theorem/condition.", 1),
          part("b", "Complete the calculation or reasoning.", 2),
        ],
        [
          solutionPart("a", spec.core),
          solutionPart("b", spec.workedAnswer, spec.workedMath),
        ],
      ),
      frq(
        spec,
        5,
        "case",
        Math.min(4, d + 1) as Difficulty,
        L`A board examiner is checking a solution on ${spec.title}. The student gives the right-looking final value but does not justify the method.`,
        [
          part("a", "Why is naming the condition/formula important?", 1),
          part("b", "Write the method that should be checked in this topic.", 1),
          part("c", "State one common error to avoid.", 1),
        ],
        [
          solutionPart(
            "a",
            L`The method shows that the result is being applied in a valid situation, not guessed from the numbers.`,
          ),
          solutionPart("b", spec.bestMove),
          solutionPart("c", spec.trap),
        ],
      ),
      frq(
        spec,
        6,
        "laq",
        Math.min(4, d + 1) as Difficulty,
        L`Create a clean board-style solution for a problem from ${spec.title}, using the given working prompt.`,
        [
          part("a", spec.workedPrompt, 2),
          part("b", "Add one verification or reason showing that the answer is sensible.", 1),
        ],
        [
          solutionPart("a", spec.workedAnswer, spec.workedMath),
          solutionPart(
            "b",
            L`The answer is sensible because it follows the stated condition/formula rather than the common trap.`,
          ),
        ],
      ),
      ...weightedExpansionItems(spec),
    ],
  };
}

const specs: MathBoostSpec[] = [
  {
    unit: "u1-number-systems",
    topicCode: "1.1",
    title: "Prime Factorisation and HCF-LCM",
    subtopic: "Fundamental theorem, prime factorisation, HCF and LCM.",
    core: "Use prime factorisation; HCF uses the least powers common to all numbers, while LCM uses the greatest powers present.",
    scenario: L`Two bells ring every $18$ minutes and $24$ minutes. For a repeat-together question, what should be found first?`,
    bestMove: "find the LCM of 18 and 24",
    trap: "uses HCF when the event must repeat together",
    workedPrompt: L`Find the HCF and LCM of $84$ and $126$ using prime factorisation.`,
    workedAnswer: L`$84=2^2\\cdot3\\cdot7$ and $126=2\\cdot3^2\\cdot7$. Hence HCF $=2\\cdot3\\cdot7=42$ and LCM $=2^2\\cdot3^2\\cdot7=252$.`,
    workedMath: L`84=2^2\\cdot3\\cdot7,\\quad 126=2\\cdot3^2\\cdot7`,
    difficulty: 3,
  },
  {
    unit: "u1-number-systems",
    topicCode: "1.2",
    title: "Applications of the Fundamental Theorem",
    subtopic: "HCF-LCM relation and contextual number problems.",
    core: "For two positive integers, the product of the numbers equals the product of their HCF and LCM.",
    scenario: L`Two numbers have HCF $12$ and LCM $180$. If one number is $36$, what relation should be used?`,
    bestMove: "use product of numbers = HCF times LCM",
    trap: "adds HCF and LCM instead of using their product relation",
    workedPrompt: L`The HCF and LCM of two numbers are $18$ and $360$. One number is $72$. Find the other number.`,
    workedAnswer: L`Let the other number be $x$. Then $72x=18\\times360$, so $x=90$.`,
    workedMath: L`x=\\frac{18\\times360}{72}=90`,
    difficulty: 3,
  },
  {
    unit: "u1-number-systems",
    topicCode: "1.3",
    title: "Irrationality Proofs",
    subtopic: "Contradiction arguments for surds and expressions involving surds.",
    core: "To prove irrationality, assume the expression is rational and show that it would force a known irrational number to be rational.",
    scenario: L`A proof asks whether $3+2\\sqrt5$ is irrational. What is the safest first step?`,
    bestMove: "assume it is rational and isolate \\sqrt5",
    trap: "uses decimal approximation as proof of irrationality",
    workedPrompt: L`Prove that $3+2\\sqrt5$ is irrational.`,
    workedAnswer: L`Assume $3+2\\sqrt5$ is rational. Then $2\\sqrt5$ and hence $\\sqrt5$ would be rational, contradicting the known irrationality of $\\sqrt5$. Therefore $3+2\\sqrt5$ is irrational.`,
    difficulty: 4,
  },
  {
    unit: "u2-algebra-x",
    topicCode: "2.1",
    title: "Polynomials and Zeroes",
    subtopic: "Zeroes of quadratic polynomials and coefficient relations.",
    core: "For $ax^2+bx+c$, sum of zeroes is $-b/a$ and product of zeroes is $c/a$.",
    scenario: L`A quadratic polynomial has zeroes $2$ and $-5$. What should be used to form a monic polynomial?`,
    bestMove: "use x^2 - (sum of zeroes)x + product of zeroes",
    trap: "uses the product as the coefficient of x and the sum as the constant term",
    workedPrompt: L`Find a monic quadratic polynomial whose zeroes are $3$ and $-4$.`,
    workedAnswer: L`The sum is $-1$ and product is $-12$, so the polynomial is $x^2+x-12$.`,
    workedMath: L`p(x)=x^2-(3-4)x+3(-4)=x^2+x-12`,
    difficulty: 3,
  },
  {
    unit: "u2-algebra-x",
    topicCode: "2.2",
    title: "Pair of Linear Equations",
    subtopic: "Graphical and algebraic solutions of simultaneous equations.",
    core: "Use substitution or elimination after forming two independent linear equations from the situation.",
    scenario: L`A ticket problem gives adult and child ticket costs and the total collection. What is the best first step?`,
    bestMove: "define two variables and form two linear equations",
    trap: "solves one equation and treats one unknown as zero",
    workedPrompt: L`Solve $2x+y=11$ and $x-y=1$ by elimination.`,
    workedAnswer: L`Adding the equations gives $3x=12$, so $x=4$. Then $4-y=1$, so $y=3$.`,
    workedMath: L`(2x+y)+(x-y)=12\\Rightarrow 3x=12\\Rightarrow x=4,\\ y=3`,
    difficulty: 3,
  },
  {
    unit: "u2-algebra-x",
    topicCode: "2.3",
    title: "Quadratic Equations",
    subtopic: "Factorisation, quadratic formula and discriminant.",
    core: "The discriminant $D=b^2-4ac$ decides the nature of real roots.",
    scenario: L`A quadratic equation is given and the question asks only the nature of roots. What should be calculated?`,
    bestMove: "calculate the discriminant before finding roots",
    trap: "finds approximate roots even though only nature of roots is asked",
    workedPrompt: L`Determine the nature of roots of $2x^2-4x+3=0$.`,
    workedAnswer: L`Here $D=(-4)^2-4(2)(3)=16-24=-8<0$, so there are no real roots.`,
    workedMath: L`D=b^2-4ac=-8`,
    difficulty: 3,
  },
  {
    unit: "u2-algebra-x",
    topicCode: "2.4",
    title: "Arithmetic Progressions",
    subtopic: "nth term, sum of n terms and contextual AP problems.",
    core: "For an AP, $a_n=a+(n-1)d$ and $S_n=\\frac n2[2a+(n-1)d]$.",
    scenario: L`A saving plan increases by the same amount every month. Which model should be checked first?`,
    bestMove: "identify the first term and common difference of the AP",
    trap: "treats a constant increase as compound growth",
    workedPrompt: L`Find the sum of the first $20$ terms of the AP $5,8,11,\\ldots$.`,
    workedAnswer: L`Here $a=5$, $d=3$, $n=20$. Thus $S_{20}=10[10+57]=670$.`,
    workedMath: L`S_{20}=\\frac{20}{2}[2(5)+19(3)]=670`,
    difficulty: 3,
  },
  {
    unit: "u3-coordinate-geometry",
    topicCode: "3.1",
    title: "Distance Formula and Coordinate Shapes",
    subtopic: "Distance formula and classification of coordinate figures.",
    core: "Use the distance formula on relevant pairs, then compare side lengths or diagonals.",
    scenario: L`A quadrilateral is given by four coordinates and must be classified. What should be computed first?`,
    bestMove: "find the required side lengths and diagonals using the distance formula",
    trap: "classifies the shape by visual appearance without calculating lengths",
    workedPrompt: L`Find the distance between $A(1,2)$ and $B(7,10)$.`,
    workedAnswer: L`The distance is $\\sqrt{(7-1)^2+(10-2)^2}=\\sqrt{36+64}=10$.`,
    workedMath: L`AB=\\sqrt{6^2+8^2}=10`,
    difficulty: 3,
  },
  {
    unit: "u3-coordinate-geometry",
    topicCode: "3.2",
    title: "Section Formula and Midpoints",
    subtopic: "Internal division and midpoint applications.",
    core: "For internal division in ratio $m:n$, use the weighted average of coordinates.",
    scenario: L`A point divides a line segment in the ratio $2:3$. Which calculation is needed?`,
    bestMove: "apply the section formula with the correct order of m and n",
    trap: "uses a simple midpoint formula even when the ratio is not 1:1",
    workedPrompt: L`Find the midpoint of $A(-2,5)$ and $B(6,-1)$.`,
    workedAnswer: L`The midpoint is $\\left(\\frac{-2+6}{2},\\frac{5-1}{2}\\right)=(2,2)$.`,
    workedMath: L`M=(2,2)`,
    difficulty: 3,
  },
  {
    unit: "u3-coordinate-geometry",
    topicCode: "3.3",
    title: "Mixed Applications in the Coordinate Plane",
    subtopic: "Coordinate geometry in contextual and proof-style settings.",
    core: "Choose distance, midpoint or section formula based on what the geometric claim requires.",
    scenario: L`A coordinate proof asks whether the diagonals of a quadrilateral bisect each other. What should be compared?`,
    bestMove: "compare the midpoints of the two diagonals",
    trap: "checks only one pair of adjacent side lengths",
    workedPrompt: L`Show that the diagonals of the quadrilateral with vertices $A(0,0),B(4,0),C(5,3),D(1,3)$ bisect each other.`,
    workedAnswer: L`Midpoint of $AC$ is $(5/2,3/2)$ and midpoint of $BD$ is also $(5/2,3/2)$, so the diagonals bisect each other.`,
    workedMath: L`M_{AC}=M_{BD}=\\left(\\frac52,\\frac32\\right)`,
    difficulty: 4,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.1",
    title: "Basic Proportionality Theorem and Converse",
    subtopic: "BPT, converse and ratio-based triangle reasoning.",
    core: "If a line is parallel to one side of a triangle, it divides the other two sides in the same ratio.",
    scenario: L`In a triangle, a line intersects two sides and the side ratios are equal. What conclusion does the converse support?`,
    bestMove: "state the converse of BPT and conclude parallelism",
    trap: "uses BPT without first establishing parallelism or equal ratios",
    workedPrompt: L`In $\\triangle ABC$, $D$ lies on $AB$ and $E$ lies on $AC$ with $AD:DB=2:3$ and $AE:EC=2:3$. What can be concluded?`,
    workedAnswer: L`Since the two sides are divided in the same ratio, by the converse of BPT, $DE\\parallel BC$.`,
    workedMath: L`\\frac{AD}{DB}=\\frac{AE}{EC}=\\frac23\\Rightarrow DE\\parallel BC`,
    difficulty: 4,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.2",
    title: "Similarity Criteria and Corresponding Parts",
    subtopic: "AA, SAS and SSS similarity criteria.",
    core: "After proving triangles similar, match corresponding sides in the same order before forming ratios.",
    scenario: L`Two triangles have two equal corresponding angles. What is enough to conclude?`,
    bestMove: "use AA similarity and then write corresponding side ratios",
    trap: "uses congruence language when only similarity is established",
    workedPrompt: L`If $\\triangle ABC\\sim\\triangle PQR$ and $AB:PQ=2:5$, find $BC:QR$.`,
    workedAnswer: L`Corresponding sides of similar triangles are proportional, so $BC:QR=2:5$.`,
    workedMath: L`\\frac{BC}{QR}=\\frac{AB}{PQ}=\\frac25`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.3",
    title: "Areas of Similar Triangles and Pythagoras",
    subtopic: "Area ratios and Pythagoras theorem applications.",
    core: "The ratio of areas of similar triangles equals the square of the ratio of corresponding sides.",
    scenario: L`Two similar triangles have side ratio $3:4$. What should the area ratio be?`,
    bestMove: "square the side ratio to get the area ratio",
    trap: "uses the side ratio directly as the area ratio",
    workedPrompt: L`Two similar triangles have corresponding sides in the ratio $5:7$. Find the ratio of their areas.`,
    workedAnswer: L`The area ratio is $5^2:7^2=25:49$.`,
    workedMath: L`\\text{areas}=25:49`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.4",
    title: "Tangents to a Circle",
    subtopic: "Tangent-radius perpendicularity and equal tangents.",
    core: "The tangent at a point of contact is perpendicular to the radius, and tangents from an external point are equal.",
    scenario: L`Two tangents are drawn from the same external point to a circle. What equality is immediately valid?`,
    bestMove: "equate the two tangent lengths from the external point",
    trap: "equates a tangent length with the radius without a right-triangle reason",
    workedPrompt: L`From point $P$, tangents $PA$ and $PB$ touch a circle at $A$ and $B$. If $PA=9$ cm, find $PB$.`,
    workedAnswer: L`Tangents drawn from the same external point are equal, so $PB=9$ cm.`,
    workedMath: L`PA=PB=9\\text{ cm}`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.5",
    title: "Mixed Geometry Proofs and Applications",
    subtopic: "Integrated similarity, tangent and right-triangle reasoning.",
    core: "Mixed geometry problems require choosing the theorem that matches the given condition before calculating.",
    scenario: L`A diagram contains a tangent and a radius to the point of contact. What angle fact should be marked first?`,
    bestMove: "mark the radius perpendicular to the tangent",
    trap: "assumes a right angle at the centre instead of at the point of contact",
    workedPrompt: L`A tangent $PT$ touches a circle at $T$ and $OT$ is a radius. If $OP=13$ cm and $OT=5$ cm, find $PT$.`,
    workedAnswer: L`Since $OT\\perp PT$, $OPT$ is right-angled at $T$. Thus $PT=\\sqrt{13^2-5^2}=12$ cm.`,
    workedMath: L`PT=\\sqrt{169-25}=12\\text{ cm}`,
    difficulty: 4,
  },
  {
    unit: "u5-trigonometry",
    topicCode: "5.1",
    title: "Trigonometric Ratios in Right Triangles",
    subtopic: "Definitions of sine, cosine, tangent and reciprocal ratios.",
    core: "In a right triangle, choose opposite, adjacent and hypotenuse with respect to the given acute angle.",
    scenario: L`A right triangle has sides $6,8,10$ and the angle is opposite the side $6$. What should be identified first?`,
    bestMove: "mark opposite = 6, adjacent = 8 and hypotenuse = 10",
    trap: "uses the same opposite side for both acute angles",
    workedPrompt: L`In a right triangle, for angle $A$, opposite side is $7$ and hypotenuse is $25$. Find $\\sin A$.`,
    workedAnswer: L`By definition, $\\sin A=\\frac{\\text{opposite}}{\\text{hypotenuse}}=\\frac7{25}$.`,
    workedMath: L`\\sin A=\\frac7{25}`,
    difficulty: 2,
  },
  {
    unit: "u5-trigonometry",
    topicCode: "5.2",
    title: "Standard Angles and Exact Values",
    subtopic: "Exact trigonometric values for 30, 45 and 60 degrees.",
    core: "Use the standard-angle table and keep exact radical values until the final answer.",
    scenario: L`An expression contains $\\sin30^\\circ$ and $\\cos60^\\circ$. What should be noticed?`,
    bestMove: "replace both values by 1/2 before simplifying",
    trap: "treats degrees as side lengths or decimals without need",
    workedPrompt: L`Evaluate $2\\sin30^\\circ+3\\cos60^\\circ$.`,
    workedAnswer: L`Since $\\sin30^\\circ=\\cos60^\\circ=\\frac12$, the value is $2\\cdot\\frac12+3\\cdot\\frac12=\\frac52$.`,
    workedMath: L`2\\sin30^\\circ+3\\cos60^\\circ=\\frac52`,
    difficulty: 2,
  },
  {
    unit: "u5-trigonometry",
    topicCode: "5.3",
    title: "Trigonometric Identities",
    subtopic: "Use of $\\sin^2A+\\cos^2A=1$ and simple identities.",
    core: "Transform one side using standard identities; do not verify an identity by substituting one angle only.",
    scenario: L`A question asks to prove an identity for all acute angles. What is invalid as a proof?`,
    bestMove: "simplify one side algebraically using identities",
    trap: "checks only A = 45 degrees and calls it a proof",
    workedPrompt: L`Simplify $1-\\sin^2A$.`,
    workedAnswer: L`Using $\\sin^2A+\\cos^2A=1$, we get $1-\\sin^2A=\\cos^2A$.`,
    workedMath: L`1-\\sin^2A=\\cos^2A`,
    difficulty: 3,
  },
  {
    unit: "u5-trigonometry",
    topicCode: "5.4",
    title: "Heights and Distances: One Right Triangle",
    subtopic: "Single right-triangle height and distance applications.",
    core: "Draw the right triangle, mark the angle of elevation/depression and choose the ratio involving the unknown.",
    scenario: L`A pole casts a shadow and the angle of elevation is given. What ratio is usually formed with height and shadow?`,
    bestMove: "use tangent as height divided by horizontal distance",
    trap: "uses sine even though the hypotenuse is not given",
    workedPrompt: L`A tower casts a $20$ m shadow when the angle of elevation of the sun is $45^\\circ$. Find the tower's height.`,
    workedAnswer: L`$\\tan45^\\circ=\\frac{h}{20}=1$, so $h=20$ m.`,
    workedMath: L`h=20\\text{ m}`,
    difficulty: 3,
  },
  {
    unit: "u5-trigonometry",
    topicCode: "5.5",
    title: "Heights and Distances: Two Right Triangles",
    subtopic: "Two-observation problems with at most two right triangles.",
    core: "Use one variable for the unknown distance/height and write one trigonometric equation for each observation.",
    scenario: L`Angles of elevation from two points on a straight line are $30^\\circ$ and $60^\\circ$. What should be avoided?`,
    bestMove: "draw both right triangles sharing the same height",
    trap: "uses two unrelated heights for the same object",
    workedPrompt: L`A tower is observed from two points on the same line. Explain the first modelling step for a two-angle problem.`,
    workedAnswer: L`Draw the tower as a vertical segment and the ground as a straight horizontal line. Mark the two right triangles sharing the same tower height, then write tangent equations for the two angles.`,
    difficulty: 4,
  },
  {
    unit: "u6-mensuration",
    topicCode: "6.1",
    title: "Circle Measures",
    subtopic: "Circumference, area and perimeter of circular figures.",
    core: "Use $2\\pi r$ for circumference and $\\pi r^2$ for area; keep units distinct.",
    scenario: L`A circular path question asks for fencing around the boundary. Which measure is needed?`,
    bestMove: "find circumference, not area",
    trap: "uses area when the question asks for boundary length",
    workedPrompt: L`Find the area of a circle of radius $7$ cm using $\\pi=22/7$.`,
    workedAnswer: L`Area $=\\pi r^2=\\frac{22}{7}\\times49=154$ cm$^2$.`,
    workedMath: L`A=154\\text{ cm}^2`,
    difficulty: 2,
  },
  {
    unit: "u6-mensuration",
    topicCode: "6.2",
    title: "Sectors and Arcs",
    subtopic: "Arc length and sector area.",
    core: "A sector with central angle $\\theta$ has area $\\frac{\\theta}{360}\\pi r^2$ and arc length $\\frac{\\theta}{360}2\\pi r$.",
    scenario: L`A pizza slice has central angle $90^\\circ$. What fraction of the full circle is it?`,
    bestMove: "use 90/360 = 1/4 of the circle",
    trap: "uses 90 as a radius or side length",
    workedPrompt: L`Find the area of a sector of radius $14$ cm and angle $90^\\circ$ using $\\pi=22/7$.`,
    workedAnswer: L`The sector is one-fourth of the circle, so area $=\\frac14\\times\\frac{22}{7}\\times196=154$ cm$^2$.`,
    workedMath: L`A=154\\text{ cm}^2`,
    difficulty: 3,
  },
  {
    unit: "u6-mensuration",
    topicCode: "6.3",
    title: "Segments and Composite Plane Figures",
    subtopic: "Segments of circles and composite areas.",
    core: "Area of a segment equals area of sector minus area of the corresponding triangle.",
    scenario: L`A circular segment has central angle $60^\\circ$. What two areas must be compared?`,
    bestMove: "subtract the equilateral triangle area from the sector area",
    trap: "reports the sector area as the segment area",
    workedPrompt: L`State the method to find a minor segment when radius and central angle are known.`,
    workedAnswer: L`Find the sector area for the central angle, find the triangle area formed by the two radii and chord, then subtract triangle area from sector area.`,
    difficulty: 4,
  },
  {
    unit: "u6-mensuration",
    topicCode: "6.4",
    title: "Surface Area of Combined Solids",
    subtopic: "Surface area of combinations of two solids.",
    core: "For combined solids, include only the exposed surfaces; shared joined faces are not counted.",
    scenario: L`A hemisphere is fixed on a cylinder of the same radius. What surface is hidden?`,
    bestMove: "exclude the circular face where the two solids meet",
    trap: "adds total surface areas of both solids without removing the common face",
    workedPrompt: L`A hemisphere is placed on a cylinder of the same radius. State the curved-surface expression to be used if the base is exposed.`,
    workedAnswer: L`Use curved surface area of cylinder plus curved surface area of hemisphere plus the exposed circular base: $2\\pi rh+2\\pi r^2+\\pi r^2$.`,
    workedMath: L`2\\pi rh+3\\pi r^2`,
    difficulty: 4,
  },
  {
    unit: "u6-mensuration",
    topicCode: "6.5",
    title: "Volumes of Combined Solids",
    subtopic: "Volume of combined or converted solids.",
    core: "When a solid is melted and recast, volume is conserved unless material is lost.",
    scenario: L`A metallic sphere is melted into small cones. What equality should be written?`,
    bestMove: "equate original volume to total volume of the cones",
    trap: "equates surface areas instead of volumes during recasting",
    workedPrompt: L`A metal cube is melted and recast into a cuboid. What quantity remains unchanged?`,
    workedAnswer: L`The volume remains unchanged, so volume of cube = volume of cuboid.`,
    difficulty: 3,
  },
  {
    unit: "u7-statistics-probability",
    topicCode: "7.1",
    title: "Mean of Grouped Data",
    subtopic: "Direct, assumed mean and step-deviation methods.",
    core: "For grouped data, use class marks with frequencies; class-mark mean is an estimate based on grouped intervals.",
    scenario: L`A grouped-frequency table has equal class widths and large class marks. Which method can simplify the mean?`,
    bestMove: "use assumed mean or step-deviation method",
    trap: "averages class intervals without using frequencies",
    workedPrompt: L`State the formula for mean by the direct method for grouped data.`,
    workedAnswer: L`Use $\\bar{x}=\\frac{\\sum f_i x_i}{\\sum f_i}$, where $x_i$ are class marks.`,
    workedMath: L`\\bar{x}=\\frac{\\sum f_i x_i}{\\sum f_i}`,
    difficulty: 3,
  },
  {
    unit: "u7-statistics-probability",
    topicCode: "7.2",
    title: "Median of Grouped Data",
    subtopic: "Median class and median formula.",
    core: "Find the median class using cumulative frequency just greater than $N/2$.",
    scenario: L`A table gives cumulative frequencies and asks for the median. What is the first class to locate?`,
    bestMove: "find the class whose cumulative frequency first exceeds N/2",
    trap: "chooses the class with the highest frequency as the median class",
    workedPrompt: L`If $N=60$, what cumulative-frequency position is used to locate the median class?`,
    workedAnswer: L`Use $N/2=30$; the median class is the class whose cumulative frequency first exceeds or reaches this position as per the table convention.`,
    workedMath: L`N/2=30`,
    difficulty: 3,
  },
  {
    unit: "u7-statistics-probability",
    topicCode: "7.3",
    title: "Mode of Grouped Data",
    subtopic: "Modal class and grouped-data mode formula.",
    core: "The modal class is the class with the greatest frequency, then the grouped-data mode formula is applied.",
    scenario: L`A frequency table has one class with the largest frequency. What does that class represent?`,
    bestMove: "identify it as the modal class",
    trap: "uses cumulative frequency to choose the modal class",
    workedPrompt: L`State how to identify the modal class in grouped data.`,
    workedAnswer: L`The modal class is the class interval with the highest frequency, provided the data are not bimodal.`,
    difficulty: 2,
  },
  {
    unit: "u7-statistics-probability",
    topicCode: "7.4",
    title: "Mixed Statistics Applications",
    subtopic: "Choosing mean, median or mode for contextual data.",
    core: "Choose the measure of central tendency that matches the context and the data shape.",
    scenario: L`A shopkeeper wants the most commonly sold shoe size. Which average is most meaningful?`,
    bestMove: "use mode because it gives the most frequent value",
    trap: "uses mean even when the most common category is required",
    workedPrompt: L`Which measure is most suitable for the most common shirt size sold in a shop? Give a reason.`,
    workedAnswer: L`Mode is most suitable because it identifies the value or category with the highest frequency.`,
    difficulty: 3,
  },
  {
    unit: "u7-statistics-probability",
    topicCode: "7.5",
    title: "Classical Probability",
    subtopic: "Simple probability of equally likely outcomes.",
    core: "For equally likely outcomes, probability equals favourable outcomes divided by total outcomes.",
    scenario: L`A fair die is rolled once. What must be checked before using classical probability?`,
    bestMove: "confirm the outcomes are equally likely and count favourable outcomes",
    trap: "counts outcomes that are impossible or repeats the same outcome twice",
    workedPrompt: L`Find the probability of getting a prime number on one roll of a fair die.`,
    workedAnswer: L`Prime outcomes are $2,3,5$, so there are 3 favourable outcomes out of 6. Probability $=\\frac36=\\frac12$.`,
    workedMath: L`P=\\frac12`,
    difficulty: 2,
  },
];

function byUnit(unit: string): Topic[] {
  return specs.filter((spec) => spec.unit === unit).map(makeTopic);
}

export const numberSystemsXSupplementalTopics = byUnit("u1-number-systems");
export const algebraXSupplementalTopics = byUnit("u2-algebra-x");
export const coordinateGeometryXSupplementalTopics = byUnit("u3-coordinate-geometry");
export const geometryXSupplementalTopics = byUnit("u4-geometry");
export const trigonometryXSupplementalTopics = byUnit("u5-trigonometry");
export const mensurationXSupplementalTopics = byUnit("u6-mensuration");
export const statisticsProbabilityXSupplementalTopics = byUnit("u7-statistics-probability");
