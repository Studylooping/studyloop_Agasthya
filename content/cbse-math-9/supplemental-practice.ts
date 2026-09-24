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

const COURSE = "cbse-math-9";
const VERSION = "0.2.0";
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const REVIEW_STATUS = "human_review_required" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

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
      description: `Correct Class 9 mathematical work for part ${item.letter}, with method and final conclusion.`,
    })),
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
      letter === correctLetter ? null : "cbse_class9_math_booster_trap",
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
    skillTags: ["board_booster", "class9_bridge", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "uses_a_formula_or_theorem_without_matching_the_given_condition",
    ],
    questionLatex,
    choices: LETTERS.map((letter, index) =>
      choice(
        letter,
        rotated.texts[index],
        rotated.correctLetter,
        `This follows the common trap in ${spec.title}: ${spec.trap}.`,
      ),
    ),
    correctLetter: rotated.correctLetter,
    hintLadder: hints([
      "Name the idea being tested before doing arithmetic.",
      "Check the condition, graph, pattern or shape carefully.",
      "Now complete the calculation or proof step-by-step.",
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
    skillTags: ["board_booster", "class9_bridge", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "states_the_final_answer_without_showing_the_method_or_reason",
    ],
    questionLatex,
    parts: [...parts],
    hintLadder: hints([
      "Write the formula, theorem, rule or graph feature first.",
      "Substitute the given numbers only after the method is clear.",
      "Check whether the final answer answers all parts of the question.",
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
  if (spec.unit === "u4-geometry") return 18;
  if (spec.unit === "u2-algebra-ix") return 16;
  if (spec.unit === "u5-mensuration") return 16;
  if (spec.unit === "u6-statistics-probability") return 14;
  return 10;
}

function weightedExpansionItems(spec: MathBoostSpec): (McSingleItem | FrqItem)[] {
  const d = spec.difficulty;
  const items: (McSingleItem | FrqItem)[] = [
    mc(
      spec,
      7,
      d,
      L`In a longer board problem from ${spec.title}, which line of working is most likely to earn the method mark?`,
      [
        spec.core,
        `The final answer is written first and the method is added only if asked.`,
        `The common trap is used because it gives a shorter calculation: ${spec.trap}.`,
        `The condition is ignored whenever the numbers look familiar.`,
      ],
      [
        step(1, L`Method marks come from the rule, theorem or condition that justifies the calculation.`),
        step(2, spec.core),
      ],
    ),
    mc(
      spec,
      8,
      Math.min(4, d + 1) as Difficulty,
      L`A student uses a familiar formula in ${spec.title} but forgets the condition. What should be checked before accepting the answer?`,
      [
        `Whether the problem allows us to ${spec.bestMove}.`,
        `Whether the final number is the largest among the options.`,
        `Whether the same formula appeared in the previous question.`,
        `Whether the diagram can be ignored because the answer is numerical.`,
      ],
      [
        step(1, L`A formula is valid only in the situation for which its condition holds.`),
        step(2, `Here the essential check is whether we can ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      9,
      "vsaq",
      Math.max(2, d - 1) as Difficulty,
      L`State one reason why the following approach is not reliable in ${spec.title}: ${spec.trap}.`,
      [part("a", "Give the correction in one or two sentences.", 2)],
      [
        solutionPart(
          "a",
          `The approach is unreliable because it ignores the needed condition. A correct solution should ${spec.bestMove} and then apply the result.`,
        ),
      ],
    ),
    mc(
      spec,
      10,
      d,
      L`Which conclusion is strongest after completing the calculation in ${spec.title}?`,
      [
        `The result is acceptable because it follows the stated condition and avoids ${spec.trap}.`,
        `The result is acceptable only because it is a whole number.`,
        `The result is acceptable even if the theorem condition was not checked.`,
        `The result is acceptable because it uses more symbols than the alternative solution.`,
      ],
      [
        step(1, L`A strong conclusion ties the answer back to the condition used.`),
        step(2, `The common incorrect route to avoid is: ${spec.trap}.`),
      ],
    ),
    frq(
      spec,
      11,
      "saq",
      d,
      L`A solution to ${spec.title} has this prompt: ${spec.workedPrompt}`,
      [
        part("a", "Write the first mathematical step clearly.", 1),
        part("b", "Complete the answer and add a one-line check.", 2),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart(
          "b",
          `${spec.workedAnswer} A quick check is that the method directly uses the given condition and does not ${spec.trap}.`,
          spec.workedMath,
        ),
      ],
    ),
    frq(
      spec,
      12,
      "case",
      Math.min(4, d + 1) as Difficulty,
      L`A peer-review card for ${spec.title} says: "The answer may be right, but the reasoning is incomplete."`,
      [
        part("a", "Name the missing mathematical idea.", 1),
        part("b", "Write the correct first move.", 1),
        part("c", "Explain why the common trap would lose marks.", 2),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart("b", spec.bestMove),
        solutionPart("c", `The trap loses marks because it ${spec.trap}, so the solution is not justified.`),
      ],
    ),
    mc(
      spec,
      13,
      Math.min(4, d + 1) as Difficulty,
      spec.scenario,
      [
        `Use the data to ${spec.bestMove}, then complete the calculation.`,
        `Write the definition of the chapter title and stop.`,
        `Use ${spec.trap} because it is faster.`,
        `Choose a formula by matching only one symbol in the question.`,
      ],
      [
        step(1, L`The same scenario can be harder when it asks for the full decision path.`),
        step(2, `The decision path is to ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      14,
      "laq",
      Math.min(5, d + 1) as Difficulty,
      L`Write a complete board-style answer for ${spec.title}. Use this prompt as the core of your answer: ${spec.workedPrompt}`,
      [
        part("a", "Identify the condition/formula/theorem.", 1),
        part("b", "Show the calculation or proof.", 2),
        part("c", "Add a final check or interpretation.", 1),
      ],
      [
        solutionPart("a", spec.core),
        solutionPart("b", spec.workedAnswer, spec.workedMath),
        solutionPart(
          "c",
          `The answer is interpreted through the original condition; it does not rely on the invalid shortcut "${spec.trap}".`,
        ),
      ],
    ),
    mc(
      spec,
      15,
      d,
      L`Which examiner comment best explains the most common error in ${spec.title}?`,
      [
        `The solution needs the condition first; otherwise it may ${spec.trap}.`,
        `The solution is wrong only because the handwriting is unclear.`,
        `The solution should avoid all formulae and use only intuition.`,
        `The solution should change the given data to make the arithmetic easier.`,
      ],
      [
        step(1, L`The useful examiner comment identifies a mathematical weakness, not a presentation issue alone.`),
        step(2, `The weakness here is: ${spec.trap}.`),
      ],
    ),
    frq(
      spec,
      16,
      "saq",
      Math.min(4, d + 1) as Difficulty,
      L`Design a two-step solution strategy for a new problem from ${spec.title}.`,
      [
        part("a", "Write the first step.", 1),
        part("b", "Write the second step and name the error to avoid.", 2),
      ],
      [
        solutionPart("a", spec.bestMove),
        solutionPart(
          "b",
          `Apply the relevant calculation or theorem after that step. Avoid the error: ${spec.trap}.`,
        ),
      ],
    ),
    mc(
      spec,
      17,
      Math.min(4, d + 1) as Difficulty,
      L`A board question combines ${spec.title} with a word problem. What makes the solution complete?`,
      [
        `It translates the words into the correct condition, applies the method, and checks the conclusion.`,
        `It writes only the formula name because calculations are optional.`,
        `It copies all numbers from the stem without deciding what they mean.`,
        `It uses the quickest-looking shortcut even if it is the common trap.`,
      ],
      [
        step(1, L`Application problems reward translation, method and conclusion.`),
        step(2, `The translation step is connected to: ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      18,
      "case",
      Math.min(5, d + 1) as Difficulty,
      L`A student submits two answers to ${spec.title}: one follows the correct method and one follows the trap "${spec.trap}".`,
      [
        part("a", "Identify the correct method.", 1),
        part("b", "Explain why the trap is invalid.", 1),
        part("c", "Write the final correct reasoning in full sentences.", 2),
      ],
      [
        solutionPart("a", spec.bestMove),
        solutionPart("b", `The trap is invalid because it does not satisfy the needed condition in ${spec.title}.`),
        solutionPart("c", `${spec.core} Therefore the solution should proceed by ${spec.bestMove}.`),
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
    subtopic: `${spec.subtopic} Extra practice for the heavier Class 9 exam areas.`,
    items: [
      mc(
        spec,
        1,
        Math.max(2, d - 1) as Difficulty,
        L`Which statement is the safest first principle in ${spec.title}?`,
        [
          spec.core,
          `Use the nearest-looking formula before checking the given condition.`,
          `Skip the method because only the final number matters.`,
          `Change the data into a harder form even when the direct method works.`,
        ],
        [step(1, L`The first mark in a board answer usually comes from the correct method or theorem.`), step(2, spec.core)],
      ),
      mc(
        spec,
        2,
        d,
        spec.scenario,
        [
          `Start by ${spec.bestMove}.`,
          `Guess from the diagram or numbers without writing the rule.`,
          `Use the previous chapter's formula because it has similar symbols.`,
          `Ignore the condition and choose the largest numerical answer.`,
        ],
        [step(1, L`This asks for method selection.`), step(2, `The best start is to ${spec.bestMove}.`)],
      ),
      mc(
        spec,
        3,
        Math.min(4, d + 1) as Difficulty,
        L`A student's solution in ${spec.title} is wrong because it ${spec.trap}. Which correction is best?`,
        [
          `Return to the condition, then redo the calculation or proof.`,
          `Keep the same steps and change only the final answer.`,
          `Use a longer formula even when the required condition is simpler.`,
          `Do not write a reason because the answer is visually obvious.`,
        ],
        [step(1, `The error is: ${spec.trap}.`), step(2, L`The correction must repair the reasoning, not only the final value.`)],
      ),
      frq(
        spec,
        4,
        "saq",
        d,
        spec.workedPrompt,
        [
          part("a", "State the formula, theorem or rule used.", 1),
          part("b", "Complete the calculation or reasoning.", 2),
        ],
        [solutionPart("a", spec.core), solutionPart("b", spec.workedAnswer, spec.workedMath)],
      ),
      frq(
        spec,
        5,
        "case",
        Math.min(4, d + 1) as Difficulty,
        L`A teacher is checking a board solution on ${spec.title}. The answer has the right-looking final result but does not show why the method applies.`,
        [
          part("a", "Write the condition or key observation that must be checked.", 1),
          part("b", "State the correct method.", 1),
          part("c", "State the common error to avoid.", 1),
        ],
        [
          solutionPart("a", spec.bestMove),
          solutionPart("b", spec.core),
          solutionPart("c", spec.trap),
        ],
      ),
      frq(
        spec,
        6,
        "laq",
        Math.min(5, d + 1) as Difficulty,
        L`Solve this extended ${spec.title} problem and justify the method: ${spec.workedPrompt}`,
        [
          part("a", "Identify the method.", 1),
          part("b", "Show the working.", 2),
          part("c", "Write one check or conclusion.", 1),
        ],
        [
          solutionPart("a", spec.core),
          solutionPart("b", spec.workedAnswer, spec.workedMath),
          solutionPart("c", `Avoid the error of ${spec.trap}.`),
        ],
      ),
      ...weightedExpansionItems(spec),
    ],
  };
}

const specs: MathBoostSpec[] = [
  {
    unit: "u2-algebra-ix",
    topicCode: "2.1",
    title: "Introduction to Polynomials",
    subtopic: "degree, coefficients and linear modelling",
    core: "A polynomial is classified by its degree after like terms are combined.",
    scenario: L`A taxi fare is modelled by $F(x)=30+12x$, where $x$ is the number of kilometres. Which feature tells the fixed charge?`,
    bestMove: "read the constant term as the fixed charge and the coefficient of $x$ as the per-kilometre rate",
    trap: "uses the coefficient as the fixed charge",
    workedPrompt: L`For $P(x)=4x^2-7x+3$, identify the degree and find $P(2)$.`,
    workedAnswer: L`The degree is $2$. Also, $P(2)=4(2)^2-7(2)+3=16-14+3=5$.`,
    workedMath: L`\deg P=2,\quad P(2)=5`,
    difficulty: 2,
  },
  {
    unit: "u2-algebra-ix",
    topicCode: "2.2",
    title: "Sequences and Progressions",
    subtopic: "explicit rules, recursive rules, AP, GP and patterns",
    core: "A sequence rule must match every given term, not only the first difference seen once.",
    scenario: L`The sequence $3,6,12,24,\ldots$ models the number of moves in a doubling puzzle. What should be checked before calling it an AP?`,
    bestMove: "compare ratios as well as differences",
    trap: "calls a GP an AP after seeing that terms increase",
    workedPrompt: L`Find the $12$th term of the AP $7,11,15,\ldots$.`,
    workedAnswer: L`Here $a=7$ and $d=4$, so $a_{12}=7+(12-1)4=51$.`,
    workedMath: L`a_{12}=51`,
    difficulty: 3,
  },
  {
    unit: "u2-algebra-ix",
    topicCode: "2.3",
    title: "Algebraic Identities and Factorisation",
    subtopic: "identities, algebra tiles and rational-expression simplification",
    core: "Factorisation should preserve the original expression when the factors are multiplied back.",
    scenario: L`A rectangle model has area $x^2+9x+20$. Which check confirms the factorisation?`,
    bestMove: "find two numbers with product $20$ and sum $9$",
    trap: "matches the product but not the middle term",
    workedPrompt: L`Factorise $x^2+9x+20$ and verify by multiplication.`,
    workedAnswer: L`Since $4\cdot5=20$ and $4+5=9$, $x^2+9x+20=(x+4)(x+5)$. Multiplying gives $x^2+9x+20$.`,
    workedMath: L`x^2+9x+20=(x+4)(x+5)`,
    difficulty: 3,
  },
  {
    unit: "u2-algebra-ix",
    topicCode: "2.4",
    title: "Linear Equations in Two Variables",
    subtopic: "slope-intercept form, tables and graphs",
    core: "A point is a solution of a linear equation only if its coordinates satisfy the equation.",
    scenario: L`A line is given by $y=2x+3$. Which feature is read directly from this form?`,
    bestMove: "read slope $2$ and y-intercept $3$ from $y=mx+c$",
    trap: "swaps the slope and the y-intercept",
    workedPrompt: L`Check whether $(4,11)$ lies on the line $y=2x+3$.`,
    workedAnswer: L`For $x=4$, $2x+3=8+3=11$, so $(4,11)$ lies on the line.`,
    workedMath: L`11=2(4)+3`,
    difficulty: 2,
  },
  {
    unit: "u2-algebra-ix",
    topicCode: "2.5",
    title: "Pairs of Linear Equations",
    subtopic: "graphical solution, substitution, elimination and consistency",
    core: "The solution of a pair of linear equations is the common point that satisfies both equations.",
    scenario: L`Two ticket types cost Rs. $x$ and Rs. $y$. The equations are $2x+y=140$ and $x+y=90$. What should be eliminated first?`,
    bestMove: "subtract the second equation from the first to find $x$",
    trap: "solves only one equation and guesses the second variable",
    workedPrompt: L`Solve $2x+y=140$ and $x+y=90$.`,
    workedAnswer: L`Subtracting gives $x=50$. Then $50+y=90$, so $y=40$.`,
    workedMath: L`x=50,\quad y=40`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.1",
    title: "Euclid's Geometry",
    subtopic: "axioms, postulates and construction reasoning",
    core: "A proof step must follow from a definition, axiom, postulate or already proved result.",
    scenario: L`Two line segments are each equal to the same third segment. Which Euclidean idea justifies that the two segments are equal?`,
    bestMove: "use the axiom that things equal to the same thing are equal to one another",
    trap: "uses a diagram measurement instead of an axiom",
    workedPrompt: L`State the Euclidean axiom used: if $AB=CD$ and $CD=EF$, then $AB=EF$.`,
    workedAnswer: L`The axiom is: things which are equal to the same thing are equal to one another.`,
    difficulty: 2,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.2",
    title: "Lines and Angles",
    subtopic: "linear pairs, vertically opposite angles and parallel lines",
    core: "Angle chasing should begin with the angle relation: linear pair, vertically opposite angles, or parallel-line angles.",
    scenario: L`Two parallel lines are cut by a transversal. An alternate interior angle is $68^\circ$. What should be concluded about its pair?`,
    bestMove: "use equality of alternate interior angles",
    trap: "treats alternate interior angles as supplementary",
    workedPrompt: L`If two parallel lines are cut by a transversal and one corresponding angle is $112^\circ$, find its corresponding angle and adjacent linear-pair angle.`,
    workedAnswer: L`The corresponding angle is $112^\circ$. The adjacent linear-pair angle is $180^\circ-112^\circ=68^\circ$.`,
    workedMath: L`112^\circ,\quad 68^\circ`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.3",
    title: "Triangles and Congruence",
    subtopic: "SAS, SSS, ASA, AAS, RHS and proof writing",
    core: "A congruence proof must match corresponding sides and angles in the correct order.",
    scenario: L`Two right triangles have equal hypotenuses and one equal leg. Which congruence condition should be used?`,
    bestMove: "use RHS after confirming both triangles are right triangles",
    trap: "uses SSA as a general congruence test",
    workedPrompt: L`In two right triangles, the hypotenuse and one corresponding side are equal. Name the congruence condition and state the conclusion.`,
    workedAnswer: L`By RHS congruence, the two right triangles are congruent, so their corresponding parts are equal.`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.4",
    title: "Quadrilaterals",
    subtopic: "parallelogram theorems, midpoint theorem and symmetry",
    core: "A quadrilateral proof should use a characterisation such as opposite sides parallel/equal or diagonals bisecting each other.",
    scenario: L`In quadrilateral $ABCD$, the diagonals bisect each other. Which conclusion follows?`,
    bestMove: "use the converse of the parallelogram diagonal theorem",
    trap: "concludes rectangle without proving right angles",
    workedPrompt: L`In $\triangle ABC$, $D$ and $E$ are midpoints of $AB$ and $AC$. If $BC=18$ cm, find $DE$ and name the theorem.`,
    workedAnswer: L`By the midpoint theorem, $DE\parallel BC$ and $DE=\frac12BC=9$ cm.`,
    workedMath: L`DE=9\text{ cm}`,
    difficulty: 3,
  },
  {
    unit: "u4-geometry",
    topicCode: "4.5",
    title: "Circles",
    subtopic: "chords, angles, cyclic quadrilaterals and circle theorems",
    core: "Circle-theorem questions require identifying the chord, arc or cyclic quadrilateral relation first.",
    scenario: L`A quadrilateral has opposite angles $104^\circ$ and $76^\circ$. What should be checked before calling it cyclic?`,
    bestMove: "check whether each pair of opposite angles is supplementary",
    trap: "checks adjacent angles instead of opposite angles",
    workedPrompt: L`In a cyclic quadrilateral, one angle is $72^\circ$. Find the opposite angle.`,
    workedAnswer: L`Opposite angles of a cyclic quadrilateral are supplementary, so the opposite angle is $180^\circ-72^\circ=108^\circ$.`,
    workedMath: L`108^\circ`,
    difficulty: 3,
  },
  {
    unit: "u5-mensuration",
    topicCode: "5.1",
    title: "Perimeter, Area and Units",
    subtopic: "area-perimeter modelling and unit conversion",
    core: "Area and perimeter measure different quantities, so units and dimensions must be checked before calculating.",
    scenario: L`A rectangular plot has length $18$ m and breadth $11$ m. A path runs along its boundary. What measurement is needed for fencing?`,
    bestMove: "use perimeter, not area",
    trap: "uses area when boundary length is asked",
    workedPrompt: L`A rectangle has length $18$ m and breadth $11$ m. Find its perimeter and area.`,
    workedAnswer: L`Perimeter $=2(18+11)=58$ m. Area $=18\times11=198$ m$^2$.`,
    workedMath: L`P=58\text{ m},\quad A=198\text{ m}^2`,
    difficulty: 2,
  },
  {
    unit: "u5-mensuration",
    topicCode: "5.2",
    title: "Circles, Arcs and Sectors",
    subtopic: "circumference, arc length, circle area and sector area",
    core: "Arc length and sector area use the same angle fraction but different full-circle formulae.",
    scenario: L`A $60^\circ$ sector of radius $21$ cm is cut from a circular sheet. What fraction of the circle is used?`,
    bestMove: "use the fraction $60/360$",
    trap: "uses the sector angle as if it were the radius",
    workedPrompt: L`Find the area of a $60^\circ$ sector of radius $21$ cm using $\pi=\frac{22}{7}$.`,
    workedAnswer: L`Area $=\frac{60}{360}\pi r^2=\frac16\cdot\frac{22}{7}\cdot21^2=231$ cm$^2$.`,
    workedMath: L`231\text{ cm}^2`,
    difficulty: 3,
  },
  {
    unit: "u5-mensuration",
    topicCode: "5.3",
    title: "Heron's Formula and Quadrilateral Area",
    subtopic: "Heron, Brahmagupta and special-case reasoning",
    core: "Heron's formula uses the semiperimeter; Brahmagupta's formula applies to cyclic quadrilaterals.",
    scenario: L`A triangle has sides $13$ cm, $14$ cm and $15$ cm. What should be found before applying Heron's formula?`,
    bestMove: "find the semiperimeter first",
    trap: "uses perimeter in place of semiperimeter",
    workedPrompt: L`Use Heron's formula to find the area of a triangle with sides $13$ cm, $14$ cm and $15$ cm.`,
    workedAnswer: L`Here $s=21$. Area $=\sqrt{21(8)(7)(6)}=\sqrt{7056}=84$ cm$^2$.`,
    workedMath: L`84\text{ cm}^2`,
    difficulty: 4,
  },
  {
    unit: "u5-mensuration",
    topicCode: "5.4",
    title: "Cuboids, Cubes and Cylinders",
    subtopic: "surface area, volume and unit reasoning",
    core: "A solid-shape problem must distinguish total surface area, curved surface area and volume.",
    scenario: L`A cylindrical water tank is open at the top. Which surface area should be painted on the outside?`,
    bestMove: "add curved surface area and one circular base",
    trap: "uses total surface area of a closed cylinder",
    workedPrompt: L`Find the volume of a cylinder of radius $7$ cm and height $10$ cm using $\pi=\frac{22}{7}$.`,
    workedAnswer: L`Volume $=\pi r^2h=\frac{22}{7}\cdot49\cdot10=1540$ cm$^3$.`,
    workedMath: L`1540\text{ cm}^3`,
    difficulty: 3,
  },
  {
    unit: "u5-mensuration",
    topicCode: "5.5",
    title: "Cones, Spheres, Hemispheres and Pyramids",
    subtopic: "surface area and volume of non-prismatic solids",
    core: "Cone, sphere, hemisphere and pyramid formulae must be matched to the shape and the requested measure.",
    scenario: L`A hemisphere is joined to a cylinder with the same radius. What should be excluded from the outside surface area?`,
    bestMove: "exclude the common circular face where the solids are joined",
    trap: "counts the hidden common circular face twice",
    workedPrompt: L`Find the volume of a cone with radius $3$ cm and height $8$ cm.`,
    workedAnswer: L`Volume $=\frac13\pi r^2h=\frac13\pi(3)^2(8)=24\pi$ cm$^3$.`,
    workedMath: L`24\pi\text{ cm}^3`,
    difficulty: 3,
  },
  {
    unit: "u6-statistics-probability",
    topicCode: "6.1",
    title: "Data Organisation and Graphs",
    subtopic: "tables, histograms, stacked bars and interpretation",
    core: "Graph choice depends on whether the data are categorical, discrete or grouped continuous data.",
    scenario: L`A survey records favourite activities and separates each class by gender. Which graph can show totals and category break-up together?`,
    bestMove: "choose a stacked bar graph",
    trap: "uses a histogram for categorical data",
    workedPrompt: L`A stacked bar has parts $12,8,10$ students. Find the total represented by that bar.`,
    workedAnswer: L`The total is $12+8+10=30$ students.`,
    workedMath: L`30`,
    difficulty: 2,
  },
  {
    unit: "u6-statistics-probability",
    topicCode: "6.2",
    title: "Mean and Weighted Average",
    subtopic: "ordinary mean, frequency mean and weighted average",
    core: "A weighted average multiplies each value by its weight before dividing by the total weight.",
    scenario: L`A final score uses $40\%$ test, $30\%$ project and $30\%$ notebook marks. What should not be done?`,
    bestMove: "multiply each score by its percentage weight",
    trap: "takes an ordinary mean even when weights are unequal",
    workedPrompt: L`Find the weighted average of scores $80,70,90$ with weights $40\%,30\%,30\%$.`,
    workedAnswer: L`Weighted average $=0.4(80)+0.3(70)+0.3(90)=32+21+27=80$.`,
    workedMath: L`80`,
    difficulty: 3,
  },
  {
    unit: "u6-statistics-probability",
    topicCode: "6.3",
    title: "Median, Mode and Choice of Average",
    subtopic: "choosing and interpreting averages",
    core: "Median needs ordered data, while mode is the most frequent value.",
    scenario: L`A shoe shop wants to stock the most commonly sold size. Which measure should be chosen?`,
    bestMove: "use mode because it gives the most frequent value",
    trap: "uses mean for a categorical-size decision",
    workedPrompt: L`Find the median and mode of $3,5,5,7,9$.`,
    workedAnswer: L`The data are ordered. Median is $5$ and mode is $5$.`,
    workedMath: L`\text{median}=5,\quad \text{mode}=5`,
    difficulty: 2,
  },
  {
    unit: "u6-statistics-probability",
    topicCode: "6.4",
    title: "Empirical Probability and Randomness",
    subtopic: "experimental probability and interpretation",
    core: "Empirical probability is based on observed frequency over the total number of trials.",
    scenario: L`A spinner lands on blue $38$ times in $100$ spins. Which probability is being estimated?`,
    bestMove: "divide observed favourable trials by total trials",
    trap: "assumes all colours are equally likely without using trial data",
    workedPrompt: L`A coin gives heads $46$ times in $100$ tosses. Find the empirical probability of heads.`,
    workedAnswer: L`Empirical probability $=46/100=0.46$.`,
    workedMath: L`0.46`,
    difficulty: 2,
  },
  {
    unit: "u6-statistics-probability",
    topicCode: "6.5",
    title: "Theoretical Probability, Tables and Trees",
    subtopic: "sample space, events and tree/table representation",
    core: "Theoretical probability needs equally likely outcomes and a complete sample space.",
    scenario: L`A fair coin and a fair die are tossed together. What should be listed before finding probabilities?`,
    bestMove: "write the complete sample space of $2\times6=12$ outcomes",
    trap: "counts only die outcomes and forgets the coin",
    workedPrompt: L`A fair coin and a fair die are tossed. Find the probability of getting heads and an even number.`,
    workedAnswer: L`There are $12$ equally likely outcomes. Favourable outcomes are $H2,H4,H6$, so probability $=3/12=1/4$.`,
    workedMath: L`\frac14`,
    difficulty: 3,
  },
];

function byUnit(unit: string): Topic[] {
  return specs.filter((spec) => spec.unit === unit).map(makeTopic);
}

export const algebraIxSupplementalTopics = byUnit("u2-algebra-ix");
export const geometryIxSupplementalTopics = byUnit("u4-geometry");
export const mensurationIxSupplementalTopics = byUnit("u5-mensuration");
export const statisticsProbabilityIxSupplementalTopics = byUnit(
  "u6-statistics-probability",
);
