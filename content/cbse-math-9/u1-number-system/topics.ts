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
const UNIT = "u1-number-system";
const VERSION = "0.1.4";
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
  return `You chose ${choiceText}. Recheck the definition of rational or irrational numbers and the representation being used.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_number_system_reasoning"),
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_decimal_or_visual_appearance_without_checking_exact_number_type",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_showing_number_system_reasoning",
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

const rationalNumberLineFigure: ItemFigure = {
  type: "svg",
  title: "Quarter marks on a number line",
  description:
    "A number line from -1 to 1 divided into quarters, with a point P at -3/4.",
  svg: `<svg viewBox="0 0 560 160" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="160" fill="#ffffff"/>
  <line x1="55" y1="82" x2="505" y2="82" stroke="#334155" stroke-width="2"/>
  <path d="M493 75 L505 82 L493 89" fill="none" stroke="#334155" stroke-width="2"/>
  <text x="510" y="87" font-size="14" fill="#334155" font-family="Arial, sans-serif">x</text>
  <g stroke="#64748b" stroke-width="1.5">
    <line x1="80" y1="70" x2="80" y2="94"/>
    <line x1="130" y1="74" x2="130" y2="90"/>
    <line x1="180" y1="74" x2="180" y2="90"/>
    <line x1="230" y1="74" x2="230" y2="90"/>
    <line x1="280" y1="70" x2="280" y2="94"/>
    <line x1="330" y1="74" x2="330" y2="90"/>
    <line x1="380" y1="74" x2="380" y2="90"/>
    <line x1="430" y1="74" x2="430" y2="90"/>
    <line x1="480" y1="70" x2="480" y2="94"/>
  </g>
  <circle cx="130" cy="82" r="7" fill="#2563eb"/>
  <text x="122" y="58" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">P</text>
  <text x="70" y="124" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">-1</text>
  <text x="274" y="124" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">0</text>
  <text x="475" y="124" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">1</text>
</svg>`,
};

const densityMidpointFigure: ItemFigure = {
  type: "svg",
  title: "Zoomed interval between two rational numbers",
  description:
    "A number line segment from 1/3 to 1/2 with an unlabelled midpoint M.",
  svg: `<svg viewBox="0 0 560 150" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="150" fill="#ffffff"/>
  <line x1="90" y1="76" x2="470" y2="76" stroke="#334155" stroke-width="2"/>
  <line x1="130" y1="58" x2="130" y2="94" stroke="#334155" stroke-width="2"/>
  <line x1="430" y1="58" x2="430" y2="94" stroke="#334155" stroke-width="2"/>
  <line x1="280" y1="63" x2="280" y2="89" stroke="#2563eb" stroke-width="3"/>
  <circle cx="280" cy="76" r="6" fill="#2563eb"/>
  <text x="122" y="122" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1/3</text>
  <text x="422" y="122" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1/2</text>
  <text x="271" y="48" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">M</text>
</svg>`,
};

const decimalRemainderFigure: ItemFigure = {
  type: "svg",
  title: "Remainder cycle in decimal division",
  description:
    "A table showing the remainders that occur while finding the decimal expansion of 5/12.",
  svg: `<svg viewBox="0 0 540 230" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="540" height="230" fill="#ffffff"/>
  <text x="270" y="34" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">Decimal division for 5/12</text>
  <rect x="60" y="58" width="420" height="130" rx="6" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
  <line x1="60" y1="94" x2="480" y2="94" stroke="#64748b" stroke-width="1.5"/>
  <line x1="165" y1="58" x2="165" y2="188" stroke="#64748b" stroke-width="1.5"/>
  <line x1="270" y1="58" x2="270" y2="188" stroke="#64748b" stroke-width="1.5"/>
  <line x1="375" y1="58" x2="375" y2="188" stroke="#64748b" stroke-width="1.5"/>
  <text x="112" y="82" text-anchor="middle" font-size="15" fill="#334155" font-family="Arial, sans-serif">step</text>
  <text x="217" y="82" text-anchor="middle" font-size="15" fill="#334155" font-family="Arial, sans-serif">digit</text>
  <text x="322" y="82" text-anchor="middle" font-size="15" fill="#334155" font-family="Arial, sans-serif">remainder</text>
  <text x="427" y="82" text-anchor="middle" font-size="15" fill="#334155" font-family="Arial, sans-serif">next</text>
  <text x="112" y="123" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="217" y="123" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">4</text>
  <text x="322" y="123" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">2</text>
  <text x="427" y="123" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">20</text>
  <text x="112" y="162" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">2</text>
  <text x="217" y="162" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="322" y="162" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">8</text>
  <text x="427" y="162" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">80</text>
</svg>`,
};

const sqrtFiveTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Right-triangle construction on a number line",
  description:
    "A right triangle with horizontal leg 2 units and vertical leg 1 unit, used to transfer the hypotenuse to the number line.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <line x1="60" y1="205" x2="500" y2="205" stroke="#334155" stroke-width="2"/>
  <path d="M488 198 L500 205 L488 212" fill="none" stroke="#334155" stroke-width="2"/>
  <text x="122" y="231" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">0</text>
  <text x="318" y="231" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">2</text>
  <g stroke="#64748b" stroke-width="1.5">
    <line x1="130" y1="194" x2="130" y2="216"/>
    <line x1="230" y1="198" x2="230" y2="212"/>
    <line x1="330" y1="194" x2="330" y2="216"/>
  </g>
  <line x1="130" y1="205" x2="330" y2="205" stroke="#16a34a" stroke-width="4"/>
  <line x1="330" y1="205" x2="330" y2="105" stroke="#f97316" stroke-width="4"/>
  <line x1="130" y1="205" x2="330" y2="105" stroke="#2563eb" stroke-width="4"/>
  <path d="M130 205 A224 224 0 0 1 354 205" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="354" cy="205" r="6" fill="#2563eb"/>
  <text x="360" y="196" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">P</text>
  <text x="220" y="196" font-size="16" fill="#15803d" font-family="Arial, sans-serif">2 units</text>
  <text x="342" y="158" font-size="16" fill="#c2410c" font-family="Arial, sans-serif">1 unit</text>
  <text x="222" y="139" font-size="16" fill="#1d4ed8" font-family="Arial, sans-serif">hypotenuse</text>
</svg>`,
};

const squareRootSpiralFigure: ItemFigure = {
  type: "svg",
  title: "Square root spiral",
  description:
    "A spiral of right triangles beginning with unit segments, with radii OP1, OP2, OP3 and OP4.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <line x1="70" y1="260" x2="505" y2="260" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="180" y1="320" x2="180" y2="70" stroke="#cbd5e1" stroke-width="1.5"/>
  <circle cx="180" cy="260" r="5" fill="#0f172a"/>
  <text x="166" y="284" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">O</text>
  <polyline points="180,260 250,260 250,190 180,260" fill="#dbeafe" fill-opacity="0.55" stroke="#2563eb" stroke-width="3" stroke-linejoin="round"/>
  <polyline points="180,260 250,190 200.5,140.5 180,260" fill="#dcfce7" fill-opacity="0.55" stroke="#16a34a" stroke-width="3" stroke-linejoin="round"/>
  <polyline points="180,260 200.5,140.5 131.5,128.7 180,260" fill="#ffedd5" fill-opacity="0.55" stroke="#f97316" stroke-width="3" stroke-linejoin="round"/>
  <line x1="180" y1="260" x2="250" y2="260" stroke="#2563eb" stroke-width="3"/>
  <line x1="180" y1="260" x2="250" y2="190" stroke="#16a34a" stroke-width="3"/>
  <line x1="180" y1="260" x2="200.5" y2="140.5" stroke="#f97316" stroke-width="3"/>
  <line x1="180" y1="260" x2="131.5" y2="128.7" stroke="#db2777" stroke-width="3"/>
  <text x="244" y="281" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">P1</text>
  <text x="258" y="193" font-size="15" fill="#15803d" font-family="Arial, sans-serif">P2</text>
  <text x="205" y="134" font-size="15" fill="#c2410c" font-family="Arial, sans-serif">P3</text>
  <text x="101" y="124" font-size="15" fill="#be185d" font-family="Arial, sans-serif">P4</text>
  <text x="212" y="252" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="255" y="229" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="224" y="158" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="159" y="128" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Rational Numbers and Decimal Representation",
    subtopic:
      "Recognising rational numbers, simplifying them, and interpreting terminating and recurring decimals.",
    mc: [
      {
        questionLatex: L`A temperature sensor records a change of $-\frac{18}{24}$ degrees Celsius. Which pair gives the simplified rational number and its decimal form?`,
        difficulty: 2,
        skillTags: ["simplify_rational_number", "decimal_form"],
        choices: [
          L`$-\frac34,\ -0.75$`,
          L`$-\frac43,\ -1.33\ldots$`,
          L`$\frac34,\ 0.75$`,
          L`$-\frac{9}{12},\ -0.9$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This inverts the fraction after simplifying.",
          C: "This loses the negative sign from the recorded change.",
          D: "This stops simplifying but also changes the decimal incorrectly.",
        },
        hints: [
          "Divide numerator and denominator by their highest common factor.",
          "Keep the sign with the simplified fraction.",
          "Then divide $3$ by $4$ to get the decimal.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Simplify by dividing numerator and denominator by 6.",
            math: "-\\frac{18}{24}=-\\frac34",
          },
          {
            step: 2,
            explanation: "Convert to decimal.",
            math: "-\\frac34=-0.75",
          },
        ],
      },
      {
        questionLatex: L`A rational number $\frac pq$ is in lowest terms. Which condition on $q$ guarantees that its decimal expansion terminates?`,
        difficulty: 2,
        skillTags: ["terminating_decimal_test", "prime_factorisation"],
        choices: [
          L`$q$ is an even number.`,
          L`$q$ has only $2$ and $5$ as prime factors.`,
          L`$q$ is not divisible by $3$.`,
          L`$q$ is larger than $p$.`,
        ],
        correctLetter: "B",
        rationales: {
          A: "An even denominator like 6 still has a factor 3, so the decimal need not terminate.",
          C: "A denominator like 7 is not divisible by 3, but $1/7$ is recurring.",
          D: "The size comparison affects whether the fraction is proper, not whether the decimal terminates.",
        },
        hints: [
          "Reduce the fraction first.",
          "Think about denominators that can become powers of 10.",
          "A power of 10 uses only prime factors $2$ and $5$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A terminating decimal can be written with denominator $10^n$.",
            math: "10^n=2^n5^n",
          },
          {
            step: 2,
            explanation:
              "So the reduced denominator must have no prime factors except $2$ and $5$.",
            math: "q=2^a5^b",
          },
        ],
      },
      {
        questionLatex: L`Assertion: $0.272727\ldots$ is a rational number. Reason: Every recurring decimal can be expressed in the form $\frac pq$, where $p,q$ are integers and $q\ne0$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "recurring_decimal"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The Reason gives exactly the criterion used to classify the recurring decimal as rational.",
          B: "The Reason is true: recurring decimals represent rational numbers.",
          D: "The Assertion is true because the block 27 repeats forever.",
        },
        hints: [
          "Identify whether the decimal terminates, recurs, or is non-recurring.",
          "Recall the definition of a rational number.",
          "Check whether the reason supplies the definition-based explanation.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The decimal has a repeating block.",
            math: "0.272727\\ldots=0.\\overline{27}",
          },
          {
            step: 2,
            explanation:
              "A recurring decimal is rational, so the reason explains the assertion.",
            math: "0.\\overline{27}=\\frac{27}{99}=\\frac{3}{11}",
          },
        ],
      },
      {
        questionLatex: L`Which number in the list is not rational? $0.125,\quad 0.02002000200002\ldots,\quad -7,\quad \frac{22}{7}$`,
        difficulty: 2,
        skillTags: ["identify_irrational_decimal", "classify_real_numbers"],
        choices: [
          L`$0.125$`,
          L`$-7$`,
          L`$\frac{22}{7}$`,
          L`$0.02002000200002\ldots$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "$0.125$ terminates, so it is rational.",
          B: "Every integer is rational because it can be written with denominator 1.",
          C: "$22/7$ is already written as a ratio of integers, so it is rational.",
        },
        hints: [
          "A rational decimal either terminates or eventually repeats.",
          "Look for a decimal whose pattern keeps changing.",
          "Integers and fractions of integers are rational.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The zero blocks keep increasing, so the decimal neither terminates nor repeats periodically.",
            math: "0.02002000200002\\ldots",
          },
          {
            step: 2,
            explanation: "Therefore it is not rational.",
            math: "\\text{non-terminating, non-recurring}",
          },
        ],
      },
      {
        questionLatex: L`Let $A=0.\overline{36}$ and $B=\frac4{11}$. Which comparison is correct?`,
        difficulty: 2,
        skillTags: ["compare_rational_decimal", "recurring_decimal_fraction"],
        choices: [L`$A=B$`, L`$A<B$`, L`$A>B$`, L`$A+B=1$`],
        correctLetter: "A",
        rationales: {
          B: "This treats $0.\\overline{36}$ as if it were less than $0.36$, but the recurring decimal is slightly larger than $0.36$.",
          C: "$4/11$ also equals $0.363636\\ldots$.",
          D: "Their sum is $8/11$, not 1.",
        },
        hints: [
          "Convert $0.\\overline{36}$ to a fraction.",
          "A two-digit repeating block over 99 gives the fraction.",
          "Simplify $36/99$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the recurring-decimal conversion.",
            math: "0.\\overline{36}=\\frac{36}{99}=\\frac4{11}",
          },
          {
            step: 2,
            explanation: "So the two numbers are equal.",
            math: "A=B",
          },
        ],
      },
      {
        questionLatex: L`Which of the following is already written in the form $\frac pq$, where $p,q$ are integers and $q\ne0$?`,
        difficulty: 1,
        skillTags: ["recognise_rational_form"],
        choices: [
          L`$\sqrt5$`,
          L`$-\frac57$`,
          L`$0.1010010001\ldots$`,
          L`$\pi$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "$\\sqrt5$ is irrational, so it cannot be written as a ratio of integers.",
          C: "This decimal is non-terminating and non-recurring, so it is not rational.",
          D: "$\\pi$ is not a rational number.",
        },
        hints: [
          "A rational number can be written as a ratio of integers.",
          "The denominator cannot be zero.",
          "Look for the option already in fraction form.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The number $-5/7$ is a ratio of two integers with non-zero denominator.",
            math: "-\\frac57\\in\\mathbb Q",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write $0.48$ as a rational number in lowest terms.`,
        difficulty: 1,
        skillTags: ["terminating_decimal_to_fraction"],
        parts: singlePart("a", "Give the fraction in lowest terms.", 1),
        hints: [
          "Write the decimal over a power of 10.",
          "$0.48$ has two decimal places.",
          "Reduce $48/100$.",
        ],
        rubric: singleRubric("a", 1, "Writes $12/25$ with correct reduction."),
        commonErrors: [
          "Writing $48/10$ instead of $48/100$.",
          "Leaving the fraction unreduced when lowest terms are requested.",
        ],
        workedSolution: [
          { part: "a", explanation: "$0.48=\\frac{48}{100}=\\frac{12}{25}$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Without performing long division, decide whether $\frac{13}{40}$ and $\frac{17}{45}$ have terminating decimal expansions. Justify both decisions.`,
        difficulty: 2,
        skillTags: ["terminating_decimal_test", "prime_factorisation"],
        parts: singlePart(
          "a",
          "Classify both decimal expansions with reasons.",
          2,
        ),
        hints: [
          "The fractions are already in lowest terms.",
          "Factor each denominator.",
          "Only factors $2$ and $5$ are allowed for a terminating decimal.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly classifies $13/40$ as terminating.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Correctly classifies $17/45$ as non-terminating recurring, with denominator-factor reason.",
            },
          ],
        },
        commonErrors: [
          "Checking whether the numerator is prime.",
          "Saying every fraction with a two-digit denominator terminates.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$40=2^3\\cdot5$, so $\\frac{13}{40}$ terminates. But $45=3^2\\cdot5$ has a factor $3$, so $\\frac{17}{45}$ is non-terminating recurring.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Convert $0.1\overline{6}$ into the form $\frac pq$, where $p,q$ are integers and $q\ne0$.`,
        difficulty: 3,
        skillTags: ["mixed_recurring_decimal_to_fraction"],
        parts: singlePart("a", "Show the algebraic conversion.", 3),
        hints: [
          "Let $x=0.1666\\ldots$.",
          "Use $10x$ and $100x$ so the recurring tails align.",
          "Subtract the equations.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Introduces a variable for the decimal.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses two aligned multiples correctly.",
            },
            { part: "a", points: 1, description: "Obtains $1/6$." },
          ],
        },
        commonErrors: [
          "Treating $0.1\\overline6$ as $0.\\overline{16}$.",
          "Subtracting $x$ from $10x$ before aligning the repeat.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $x=0.1666\\ldots$. Then $10x=1.6666\\ldots$ and $100x=16.6666\\ldots$. Subtracting gives $90x=15$, so $x=\\frac{15}{90}=\\frac16$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A craft teacher has $2\frac34\text{ kg}$ of clay. Each small model needs $\frac16\text{ kg}$ of clay. How many complete small models can be made, and how much clay remains?`,
        difficulty: 3,
        skillTags: ["rational_number_operations", "contextual_division"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the maximum number of complete models.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Find the leftover clay.", points: 1 },
        ],
        hints: [
          "Convert the mixed number to an improper fraction.",
          "Divide total clay by clay per model.",
          "Use the integer part for complete models, then subtract the clay used.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Converts total clay to $11/4$ kg and sets up division by $1/6$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds $16$ complete models.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds leftover clay $1/12$ kg.",
            },
          ],
        },
        commonErrors: [
          "Rounding $16.5$ up to 17 complete models.",
          "Reporting $0.5$ kg as the leftover instead of half of one model's clay.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$2\\frac34=\\frac{11}{4}$. The number of model portions is $\\frac{11}{4}\\div\\frac16=\\frac{33}{2}=16.5$, so only $16$ complete models can be made.",
          },
          {
            part: "b",
            explanation:
              "Clay used for $16$ models is $16\\cdot\\frac16=\\frac83$ kg. The leftover is $\\frac{11}{4}-\\frac83=\\frac{33-32}{12}=\\frac1{12}$ kg.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A mathematics club records the repeating decimal shown by a calculator as $0.416666\ldots$ while estimating a share of a fund.`,
        difficulty: 3,
        skillTags: [
          "recurring_decimal_modelling",
          "rational_number_interpretation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the decimal using bar notation.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Convert it into a rational number in lowest terms.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why a displayed approximation such as $0.4167$ is not the exact value.",
            points: 1,
          },
        ],
        hints: [
          "Only the digit 6 repeats.",
          "Let $x=0.41666\\ldots$ and align the repeating part.",
          "A rounded decimal may be close without being equal.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $0.41\\overline6$." },
            {
              part: "b",
              points: 2,
              description: "Correctly converts to $5/12$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Distinguishes exact recurring value from rounded approximation.",
            },
          ],
        },
        commonErrors: [
          "Writing $0.\\overline{416}$.",
          "Treating $0.4167$ as exact because it has four decimal places.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The non-repeating part is $41$ and the repeating digit is $6$, so the number is $0.41\\overline6$.",
          },
          {
            part: "b",
            explanation:
              "Let $x=0.41666\\ldots$. Then $100x=41.666\\ldots$ and $1000x=416.666\\ldots$. Subtracting gives $900x=375$, so $x=\\frac{375}{900}=\\frac5{12}$.",
          },
          {
            part: "c",
            explanation:
              "$0.4167$ is a rounded terminating decimal. The exact value has infinitely many recurring 6s.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Is $-9$ a rational number? Give one reason.`,
        difficulty: 1,
        skillTags: ["integer_as_rational"],
        parts: singlePart("a", "Answer yes or no with one reason.", 1),
        hints: [
          "Every integer can be written with denominator 1.",
          "Try writing $-9$ as a fraction.",
          "$-9=-9/1$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States yes and writes or explains $-9=-9/1$.",
        ),
        commonErrors: ["Thinking negative integers are not rational."],
        workedSolution: [
          {
            part: "a",
            explanation: "Yes. Since $-9=\\frac{-9}{1}$, it is rational.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Number-Line Representation and Density",
    subtopic:
      "Representing rational numbers and finding rational numbers between two given rational numbers.",
    mc: [
      {
        questionLatex: L`In the number-line figure, the interval from $-1$ to $0$ is divided into four equal parts. Which number is represented by $P$?`,
        difficulty: 2,
        figure: rationalNumberLineFigure,
        skillTags: ["number_line_rational", "fraction_position"],
        choices: [L`$-\frac14$`, L`$\frac34$`, L`$-\frac34$`, L`$-\frac43$`],
        correctLetter: "C",
        rationales: {
          A: "This counts one quarter left of 0, but $P$ is one quarter right of $-1$.",
          B: "The point is on the negative side of the number line.",
          D: "This places the number beyond $-1$, but $P$ lies between $-1$ and $0$.",
        },
        hints: [
          "The distance from $-1$ to $0$ is split into four equal parts.",
          "Each small step is $1/4$.",
          "Move one step right from $-1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "One step to the right of $-1$ is $-1+1/4$.",
            math: "-1+\\frac14=-\\frac34",
          },
        ],
      },
      {
        questionLatex: L`For two distinct rational numbers $a$ and $b$, which expression always gives a rational number strictly between them?`,
        difficulty: 2,
        skillTags: ["density_of_rationals", "average_between_two_numbers"],
        choices: [L`$a+b$`, L`$ab$`, L`$\frac ab$`, L`$\frac{a+b}{2}$`],
        correctLetter: "D",
        rationales: {
          A: "The sum need not lie between the two numbers.",
          B: "The product can be outside the interval or even equal to an endpoint in special cases.",
          C: "The quotient may fail to be defined when $b=0$ and need not lie between $a$ and $b$.",
        },
        hints: [
          "The midpoint of a segment lies between its endpoints.",
          "The sum of rational numbers is rational.",
          "Dividing a rational number by 2 keeps it rational.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The arithmetic mean lies between two distinct numbers.",
            math: "\\min(a,b)<\\frac{a+b}{2}<\\max(a,b)",
          },
          {
            step: 2,
            explanation:
              "Since rationals are closed under addition and division by non-zero integers, the mean is rational.",
            math: "\\frac{a+b}{2}\\in\\mathbb Q",
          },
        ],
      },
      {
        questionLatex: L`The point $M$ is the midpoint of $\frac13$ and $\frac12$ in the figure. Which value is $M$?`,
        difficulty: 2,
        figure: densityMidpointFigure,
        skillTags: ["midpoint_of_rationals", "density_visual"],
        choices: [L`$\frac5{12}$`, L`$\frac25$`, L`$\frac7{12}$`, L`$\frac16$`],
        correctLetter: "A",
        rationales: {
          B: "This is between the numbers, but it is not exactly the midpoint.",
          C: "This is greater than $1/2$, so it cannot be between the endpoints.",
          D: "This is the difference, not the midpoint.",
        },
        hints: [
          "The midpoint is the average.",
          "Use a common denominator for $1/3$ and $1/2$.",
          "Compute $(1/3+1/2)/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Average the endpoints.",
            math: "\\frac{\\frac13+\\frac12}{2}=\\frac{\\frac56}{2}=\\frac5{12}",
          },
        ],
      },
      {
        questionLatex: L`Assertion: Between any two distinct rational numbers there are infinitely many rational numbers. Reason: Repeatedly taking midpoints produces new rational numbers inside the interval.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "density_proof"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The midpoint process is exactly a constructive proof of density.",
          C: "The reason is true because the midpoint of two rational numbers is rational.",
          D: "The assertion is true; rational numbers are dense on the number line.",
        },
        hints: [
          "Check whether the midpoint of rationals is rational.",
          "After finding one midpoint, apply the same idea again to a smaller interval.",
          "A repeatable construction gives infinitely many examples.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If $a,b$ are rational and $a<b$, then the midpoint is rational and lies between them.",
            math: "a<\\frac{a+b}{2}<b",
          },
          {
            step: 2,
            explanation:
              "The process can be repeated without ending, so there are infinitely many rational numbers between $a$ and $b$.",
          },
        ],
      },
      {
        questionLatex: L`How many fractions with denominator $70$ lie strictly between $\frac17$ and $\frac27$?`,
        difficulty: 3,
        skillTags: ["find_rationals_between", "common_denominator"],
        choices: [L`$8$`, L`$10$`, L`$9$`, L`$11$`],
        correctLetter: "C",
        rationales: {
          A: "This misses one of the interior numerators.",
          B: "This includes one endpoint.",
          D: "This includes both endpoints.",
        },
        hints: [
          "Rewrite both endpoints with denominator 70.",
          "Strictly between means the endpoints are not counted.",
          "Count the integer numerators between 10 and 20.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert endpoints to denominator 70.",
            math: "\\frac17=\\frac{10}{70},\\quad \\frac27=\\frac{20}{70}",
          },
          {
            step: 2,
            explanation: "The numerator can be $11,12,\\ldots,19$.",
            math: "9\\text{ fractions}",
          },
        ],
      },
      {
        questionLatex: L`On a number line, which rational number is exactly halfway between $0$ and $1$?`,
        difficulty: 1,
        skillTags: ["basic_number_line_midpoint"],
        choices: [L`$1$`, L`$0$`, L`$2$`, L`$\frac12$`],
        correctLetter: "D",
        rationales: {
          A: "This is the right endpoint, not the midpoint.",
          B: "This is the left endpoint, not the midpoint.",
          C: "This is outside the interval from 0 to 1.",
        },
        hints: [
          "Halfway means equal distance from both endpoints.",
          "The interval from 0 to 1 has length 1.",
          "Half of 1 is $1/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The midpoint of 0 and 1 is",
            math: "\\frac{0+1}{2}=\\frac12",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name the rational number exactly halfway between $-\frac23$ and $-\frac13$.`,
        difficulty: 2,
        skillTags: ["midpoint_of_rationals"],
        parts: singlePart("a", "Give the rational number.", 1),
        hints: [
          "Halfway means average.",
          "Add the two fractions first.",
          "Then divide by 2.",
        ],
        rubric: singleRubric("a", 1, "Finds $-1/2$."),
        commonErrors: [
          "Choosing $-1/3$ because it is closer to zero.",
          "Subtracting instead of averaging.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The midpoint is $\\frac{-\\frac23-\\frac13}{2}=\\frac{-1}{2}=-\\frac12$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find three rational numbers strictly between $-\frac23$ and $-\frac12$.`,
        difficulty: 3,
        skillTags: ["find_rationals_between", "common_denominator"],
        parts: singlePart(
          "a",
          "Show a denominator choice and list three numbers.",
          2,
        ),
        hints: [
          "Use a larger common denominator.",
          "$-2/3$ and $-1/2$ can both be written with denominator 60.",
          "Remember the order of negative fractions.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Uses a valid common denominator or equivalent method.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Lists three rational numbers strictly inside the interval.",
            },
          ],
        },
        commonErrors: [
          "Listing numbers outside the interval because negative-ordering is reversed.",
          "Including an endpoint.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Write $-\\frac23=-\\frac{40}{60}$ and $-\\frac12=-\\frac{30}{60}$. Three possible numbers are $-\\frac{39}{60},-\\frac{38}{60},-\\frac{37}{60}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the midpoint idea to prove that at least five rational numbers lie between any two distinct rational numbers $a$ and $b$.`,
        difficulty: 3,
        skillTags: ["density_proof", "constructive_reasoning"],
        parts: singlePart("a", "Give a short general argument.", 3),
        hints: [
          "Assume $a<b$.",
          "Divide the interval from $a$ to $b$ into equal parts.",
          "Use expressions of the form $a+k(b-a)/6$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Sets up an ordered interval $a<b$.",
            },
            {
              part: "a",
              points: 1,
              description: "Gives five valid expressions inside the interval.",
            },
            {
              part: "a",
              points: 1,
              description: "Explains why each expression is rational.",
            },
          ],
        },
        commonErrors: [
          "Only giving numerical examples.",
          "Forgetting to justify rationality of the constructed numbers.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Assume $a<b$. The five numbers $a+\\frac{b-a}{6}, a+\\frac{2(b-a)}{6},\\ldots,a+\\frac{5(b-a)}{6}$ all lie strictly between $a$ and $b$. Since $a,b$ are rational and rational numbers are closed under subtraction, multiplication by rational numbers, and addition, all five numbers are rational.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher asks students to place fractions on a number line from $0$ to $1$. Four cards are labelled $\frac18,\frac14,\frac38,\frac58$.`,
        difficulty: 3,
        skillTags: ["order_rationals", "number_line_context"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Arrange the four cards in increasing order.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find a rational number exactly between $\\frac38$ and $\\frac58$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find one rational number between $\\frac18$ and $\\frac14$ using denominator $32$.",
            points: 1,
          },
        ],
        hints: [
          "Use a common denominator.",
          "A midpoint is found by averaging.",
          "Convert $1/8$ and $1/4$ to denominator 32.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Correct increasing order." },
            { part: "b", points: 1, description: "Finds $1/2$." },
            {
              part: "c",
              points: 1,
              description:
                "Gives a valid fraction such as $5/32,6/32,$ or $7/32$.",
            },
          ],
        },
        commonErrors: [
          "Ordering by numerator only when denominators differ in other problems.",
          "Including an endpoint in part (c).",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The order is $\\frac18<\\frac14<\\frac38<\\frac58$.",
          },
          {
            part: "b",
            explanation:
              "The midpoint is $\\frac{\\frac38+\\frac58}{2}=\\frac{1}{2}$.",
          },
          {
            part: "c",
            explanation:
              "$\\frac18=\\frac4{32}$ and $\\frac14=\\frac8{32}$. One valid answer is $\\frac5{32}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two rational numbers are $r=\frac{5}{12}$ and $s=\frac{7}{18}$. Decide which is greater, and then find two rational numbers between them.`,
        difficulty: 3,
        skillTags: ["compare_rationals", "find_rationals_between"],
        parts: [
          { letter: "a", promptMarkdown: "Compare $r$ and $s$.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find two rational numbers strictly between them.",
            points: 2,
          },
        ],
        hints: [
          "Use common denominator 36 to compare.",
          "To create space, use a larger common denominator.",
          "Denominator 108 gives several fractions between them.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Correctly finds $r>s$." },
            {
              part: "b",
              points: 2,
              description:
                "Lists two valid rational numbers strictly between $7/18$ and $5/12$.",
            },
          ],
        },
        commonErrors: [
          "Comparing by denominators only.",
          "Giving only one number between them.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\frac5{12}=\\frac{15}{36}$ and $\\frac7{18}=\\frac{14}{36}$, so $r>s$.",
          },
          {
            part: "b",
            explanation:
              "Use denominator $108$: $\\frac7{18}=\\frac{42}{108}$ and $\\frac5{12}=\\frac{45}{108}$. Two numbers between them are $\\frac{43}{108}$ and $\\frac{44}{108}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Write one rational number between $0$ and $\frac12$.`,
        difficulty: 1,
        skillTags: ["simple_rational_between"],
        parts: singlePart("a", "Give any one valid rational number.", 1),
        hints: [
          "Choose a smaller positive fraction.",
          "$1/4$ lies between 0 and $1/2$.",
          "Many answers are possible.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Gives a rational number strictly between 0 and $1/2$, such as $1/4$.",
        ),
        commonErrors: ["Giving an endpoint such as 0 or $1/2$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "One possible answer is $\\frac14$, since $0<\\frac14<\\frac12$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Irrational Numbers and Real Numbers",
    subtopic:
      "Identifying irrational numbers and explaining how rational and irrational numbers sit inside the real number system.",
    mc: [
      {
        questionLatex: L`Which of the following is irrational?`,
        difficulty: 2,
        skillTags: ["identify_irrational_number", "simplify_surds"],
        choices: [
          L`$\frac{\sqrt{18}}{3}$`,
          L`$\frac{\sqrt9}{2}$`,
          L`$0.\overline3$`,
          L`$\frac{\sqrt{12}}{\sqrt3}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "$\\sqrt9=3$, so this is $3/2$, a rational number.",
          C: "$0.\\overline3=1/3$, which is rational.",
          D: "$\\sqrt{12}/\\sqrt3=\\sqrt4=2$, which is rational.",
        },
        hints: [
          "Simplify each expression before classifying it.",
          "Perfect square roots are rational.",
          "$\\sqrt{18}=3\\sqrt2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Simplify the first expression.",
            math: "\\frac{\\sqrt{18}}{3}=\\frac{3\\sqrt2}{3}=\\sqrt2",
          },
          {
            step: 2,
            explanation: "$\\sqrt2$ is irrational.",
            math: "\\frac{\\sqrt{18}}{3}\\notin\\mathbb Q",
          },
        ],
      },
      {
        questionLatex: L`A square tile has side length $3\text{ cm}$. Which statement about its diagonal is correct?`,
        difficulty: 2,
        skillTags: ["irrational_measurement", "pythagorean_length"],
        choices: [
          L`The diagonal is $6\text{ cm}$ and is rational.`,
          L`The diagonal is $3\sqrt2\text{ cm}$ and is irrational.`,
          L`The diagonal is $\sqrt6\text{ cm}$ and is irrational.`,
          L`The diagonal is $9\sqrt2\text{ cm}$ and is irrational.`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The diagonal is not the sum of the two equal sides.",
          C: "The diagonal uses $3^2+3^2=18$, not $3+3=6$.",
          D: "This squares the side length incorrectly before taking the final root.",
        },
        hints: [
          "Use Pythagoras' theorem.",
          "The diagonal squared is $3^2+3^2$.",
          "Simplify $\\sqrt{18}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the diagonal.",
            math: "d=\\sqrt{3^2+3^2}=\\sqrt{18}=3\\sqrt2",
          },
          {
            step: 2,
            explanation:
              "Since $\\sqrt2$ is irrational, $3\\sqrt2$ is irrational.",
          },
        ],
      },
      {
        questionLatex: L`Which chain correctly shows the inclusion of number sets used in Class 9?`,
        difficulty: 2,
        skillTags: ["number_set_inclusion", "real_number_system"],
        choices: [
          L`$\mathbb Q\subset \mathbb Z\subset \mathbb R$`,
          L`$\mathbb R\subset \mathbb Q\subset \mathbb Z$`,
          L`$\mathbb Z\subset \mathbb Q\subset \mathbb R$`,
          L`$\mathbb Z\subset \mathbb R\subset \mathbb Q$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Not every rational number is an integer; for example, $1/2$ is rational but not an integer.",
          B: "The real numbers include irrational numbers, so they cannot all be rational.",
          D: "The rational numbers are part of the real numbers, not the other way around.",
        },
        hints: [
          "Every integer can be written with denominator 1.",
          "Every rational number is a real number.",
          "Irrational numbers are real but not rational.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Integers are rational because $n=n/1$.",
            math: "\\mathbb Z\\subset\\mathbb Q",
          },
          {
            step: 2,
            explanation:
              "Rational and irrational numbers together make the real numbers.",
            math: "\\mathbb Q\\subset\\mathbb R",
          },
        ],
      },
      {
        questionLatex: L`A student says: "The number $2+\sqrt3$ is irrational only because it contains a square-root sign." Which correction is best?`,
        difficulty: 3,
        skillTags: [
          "justify_irrationality",
          "misconception_square_root_symbol",
        ],
        choices: [
          L`It is rational because adding $2$ removes the irrational part.`,
          L`It is irrational because every expression with a radical sign is irrational.`,
          L`It is rational because $3$ is rational.`,
          L`It is irrational because if $2+\sqrt3$ were rational, then subtracting $2$ would make $\sqrt3$ rational, which is impossible.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Adding a rational number does not cancel an irrational term unless there is an opposite irrational term.",
          B: "A radical sign alone is not enough; for example, $\\sqrt4=2$ is rational.",
          C: "The radicand being rational does not make its square root rational.",
        },
        hints: [
          "Avoid judging only by the symbol.",
          "Use contradiction and isolate $\\sqrt3$.",
          "Rational minus rational remains rational.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Assume $2+\\sqrt3$ is rational.",
            math: "2+\\sqrt3\\in\\mathbb Q",
          },
          {
            step: 2,
            explanation:
              "Subtracting 2 would make $\\sqrt3$ rational, a contradiction.",
            math: "\\sqrt3=(2+\\sqrt3)-2",
          },
        ],
      },
      {
        questionLatex: L`Assertion: $\sqrt2+\sqrt8$ is irrational. Reason: $\sqrt2+\sqrt8=3\sqrt2$, and every non-zero rational multiple of $\sqrt2$ is irrational.`,
        difficulty: 3,
        skillTags: [
          "assertion_reason",
          "simplify_surds",
          "irrationality_argument",
        ],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason both simplifies the expression and gives the irrationality principle.",
          C: "The reason is true: $3\\sqrt2$ cannot be rational unless $\\sqrt2$ is rational.",
          D: "The assertion is true because $\\sqrt2+\\sqrt8=3\\sqrt2$.",
        },
        hints: [
          "Simplify $\\sqrt8$ first.",
          "Factor out $\\sqrt2$.",
          "Use the known irrationality of $\\sqrt2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Simplify the expression.",
            math: "\\sqrt2+\\sqrt8=\\sqrt2+2\\sqrt2=3\\sqrt2",
          },
          {
            step: 2,
            explanation:
              "$3\\sqrt2$ is irrational, so the reason correctly explains the assertion.",
          },
        ],
      },
      {
        questionLatex: L`Which number is rational?`,
        difficulty: 1,
        skillTags: ["identify_rational_number"],
        choices: [
          L`$\sqrt2$`,
          L`$\sqrt{36}$`,
          L`$\sqrt3$`,
          L`$0.1010010001\ldots$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "$\\sqrt2$ is irrational.",
          C: "$\\sqrt3$ is irrational.",
          D: "This decimal is non-terminating and non-recurring.",
        },
        hints: [
          "A perfect-square root is an integer.",
          "$36=6^2$.",
          "Integers are rational.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Since $36$ is a perfect square,",
            math: "\\sqrt{36}=6=\\frac61",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Classify $\sqrt{49}$ as rational or irrational, with one reason.`,
        difficulty: 1,
        skillTags: ["classify_square_root"],
        parts: singlePart("a", "Give the classification and reason.", 1),
        hints: [
          "Check whether 49 is a perfect square.",
          "$7^2=49$.",
          "An integer is rational.",
        ],
        rubric: singleRubric("a", 1, "States that $\\sqrt{49}=7$ is rational."),
        commonErrors: [
          "Calling it irrational only because it has a radical sign.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\sqrt{49}=7$, and $7=7/1$, so it is rational.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Classify each number as rational or irrational: $\sqrt{20},\ 0.12122122212222\ldots,\ -\frac{15}{4},\ \sqrt{81}-10$.`,
        difficulty: 3,
        skillTags: ["classify_real_numbers", "non_recurring_decimal"],
        parts: singlePart(
          "a",
          "Classify all four numbers with brief reasons.",
          4,
        ),
        hints: [
          "Simplify square roots when possible.",
          "A non-terminating decimal is rational only if it eventually repeats.",
          "A difference of integers is rational.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Classifies $\\sqrt{20}$ as irrational.",
            },
            {
              part: "a",
              points: 1,
              description: "Classifies the changing decimal as irrational.",
            },
            {
              part: "a",
              points: 1,
              description: "Classifies $-15/4$ as rational.",
            },
            {
              part: "a",
              points: 1,
              description: "Classifies $\\sqrt{81}-10$ as rational.",
            },
          ],
        },
        commonErrors: [
          "Saying every non-terminating decimal is irrational.",
          "Not simplifying $\\sqrt{81}$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\sqrt{20}=2\\sqrt5$ is irrational. The decimal $0.12122122212222\\ldots$ is non-terminating and non-recurring, so it is irrational. $-\\frac{15}{4}$ is rational. $\\sqrt{81}-10=9-10=-1$ is rational.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Give one rational number and one irrational number between $1$ and $2$. Justify both choices.`,
        difficulty: 3,
        skillTags: ["numbers_between_reals", "rational_irrational_examples"],
        parts: singlePart("a", "Give two examples with reasons.", 2),
        hints: [
          "For a rational example, choose a simple fraction.",
          "For an irrational example, use a square root between 1 and 2.",
          "Since $1<2<4$, $1<\\sqrt2<2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Provides a valid rational number between 1 and 2.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Provides a valid irrational number between 1 and 2 with justification.",
            },
          ],
        },
        commonErrors: [
          "Giving $\\sqrt4$ as the irrational example.",
          "Forgetting to show that the examples lie between 1 and 2.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "One rational number is $\\frac32$. One irrational number is $\\sqrt2$ because $1<2<4$, so $1<\\sqrt2<2$, and $\\sqrt2$ is irrational.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Prove that $5-\sqrt3$ is irrational.`,
        difficulty: 4,
        skillTags: ["prove_irrational_by_contradiction"],
        parts: singlePart("a", "Write a contradiction proof.", 3),
        hints: [
          "Assume the number is rational.",
          "Rearrange to isolate $\\sqrt3$.",
          "Use the known irrationality of $\\sqrt3$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Assumes $5-\\sqrt3$ is rational.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Correctly isolates $\\sqrt3$ as a rational expression.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Identifies the contradiction and concludes irrationality.",
            },
          ],
        },
        commonErrors: [
          "Saying rational minus irrational is irrational without proof when a proof is asked.",
          "Writing $5-\\sqrt3=\\sqrt2$ or another unrelated value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Suppose $5-\\sqrt3$ is rational. Let $5-\\sqrt3=r$, where $r\\in\\mathbb Q$. Then $\\sqrt3=5-r$. Since $5$ and $r$ are rational, $5-r$ is rational. This would make $\\sqrt3$ rational, contradicting its known irrationality. Hence $5-\\sqrt3$ is irrational.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A rectangular art card has sides $6\text{ cm}$ and $2\text{ cm}$. A student wants to know whether the diagonal length can be written exactly as a rational number.`,
        difficulty: 3,
        skillTags: ["pythagorean_irrationality", "real_life_length"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the diagonal length in simplest radical form.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State whether the exact diagonal is rational or irrational.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why a decimal approximation does not replace the exact value.",
            points: 1,
          },
        ],
        hints: [
          "Use Pythagoras' theorem.",
          "Simplify $\\sqrt{40}$.",
          "A rounded decimal is not the same as an exact radical.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $2\\sqrt{10}$ cm." },
            {
              part: "b",
              points: 1,
              description: "Classifies it as irrational.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains exact-vs-approximate distinction.",
            },
          ],
        },
        commonErrors: [
          "Adding side lengths to get 8 cm.",
          "Calling the diagonal rational because a calculator gives a decimal.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$d=\\sqrt{6^2+2^2}=\\sqrt{40}=2\\sqrt{10}$ cm.",
          },
          {
            part: "b",
            explanation:
              "Since $10$ is not a perfect square, $\\sqrt{10}$ is irrational. Therefore $2\\sqrt{10}$ is irrational.",
          },
          {
            part: "c",
            explanation:
              "A calculator decimal is rounded or truncated; $2\\sqrt{10}$ is the exact length.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Is $\sqrt{25}$ rational or irrational?`,
        difficulty: 1,
        skillTags: ["perfect_square_root"],
        parts: singlePart("a", "Classify the number.", 1),
        hints: [
          "Check whether 25 is a perfect square.",
          "$5^2=25$.",
          "An integer is rational.",
        ],
        rubric: singleRubric("a", 1, "States rational because $\\sqrt{25}=5$."),
        commonErrors: ["Calling every square root irrational."],
        workedSolution: [
          { part: "a", explanation: "$\\sqrt{25}=5$, and $5$ is rational." },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Proofs of Irrationality",
    subtopic:
      "Understanding and writing contradiction proofs for the irrationality of square roots.",
    mc: [
      {
        questionLatex: L`In the standard proof that $\sqrt2$ is irrational, we assume $\sqrt2=\frac ab$ in lowest terms. From $a^2=2b^2$, which conclusion is used next?`,
        difficulty: 3,
        skillTags: ["sqrt2_irrational_proof", "even_square_reasoning"],
        choices: [
          L`$b$ is odd.`,
          L`$a$ and $b$ are both odd.`,
          L`$a$ is even.`,
          L`$a=2b$ necessarily.`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The equation first shows that $a^2$ is even, hence $a$ is even; it does not directly show $b$ is odd.",
          B: "If $a^2$ is even, $a$ cannot be odd.",
          D: "$a^2=2b^2$ does not imply $a=2b$.",
        },
        hints: [
          "Look at the parity of $a^2$.",
          "If a square is even, the original integer is even.",
          "Use this before substituting $a=2k$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "From $a^2=2b^2$, $a^2$ is even.",
            math: "2\\mid a^2",
          },
          { step: 2, explanation: "Therefore $a$ is even.", math: "2\\mid a" },
        ],
      },
      {
        questionLatex: L`Which line is not a valid step in a proof of irrationality?`,
        difficulty: 3,
        skillTags: ["proof_error_detection", "divisibility_reasoning"],
        choices: [
          L`From $a^2$ even, conclude $a$ is even.`,
          L`From $a=2k$, conclude $a^2=4k^2$.`,
          L`From both $a$ and $b$ even, conclude $\frac ab$ was not in lowest terms.`,
          L`From $a^2$ divisible by $3$, conclude $a$ is divisible by $6$.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This is valid: an odd integer has an odd square, so an even square must come from an even integer.",
          B: "This is valid algebraic substitution.",
          C: "This is exactly the contradiction used when a fraction was assumed in lowest terms.",
        },
        hints: [
          "Divisibility by 3 does not automatically give divisibility by 2.",
          "Check what each conclusion actually follows from.",
          "One option adds an extra factor without justification.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If $a^2$ is divisible by 3, then $a$ is divisible by 3, not necessarily by 6.",
            math: "3\\mid a^2\\Rightarrow 3\\mid a",
          },
        ],
      },
      {
        questionLatex: L`In a proof that $\sqrt3$ is irrational, after obtaining $a^2=3b^2$, what contradiction is eventually reached?`,
        difficulty: 3,
        skillTags: ["sqrt3_irrational_proof", "contradiction_structure"],
        choices: [
          L`Both $a$ and $b$ are divisible by $3$, contradicting that $\frac ab$ is in lowest terms.`,
          L`Neither $a$ nor $b$ is divisible by $3$.`,
          L`The number $b$ must be $0$.`,
          L`The fraction $\frac ab$ is greater than $3$.`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The equation forces $a$ and then $b$ to be divisible by 3.",
          C: "The denominator is assumed non-zero; the proof does not force $b=0$.",
          D: "The size of $a/b$ is not the contradiction.",
        },
        hints: [
          "Use the rule: if $3$ divides $a^2$, then $3$ divides $a$.",
          "Write $a=3k$ and substitute.",
          "Then show $3$ divides $b$ too.",
        ],
        solution: [
          {
            step: 1,
            explanation: "From $a^2=3b^2$, $3\\mid a$, so $a=3k$.",
            math: "9k^2=3b^2",
          },
          {
            step: 2,
            explanation: "Then $b^2=3k^2$, so $3\\mid b$.",
            math: "3\\mid a\\text{ and }3\\mid b",
          },
          {
            step: 3,
            explanation:
              "This contradicts the assumption that $a/b$ is in lowest terms.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: If $p$ is prime and $p$ divides $n^2$, then $p$ divides $n$. Reason: In the prime factorisation of $n^2$, every prime exponent is twice the exponent in $n$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "prime_factorisation_proof"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason explains why a prime appearing in the square must already appear in the original number.",
          C: "The reason is true by prime factorisation.",
          D: "The assertion is true and is used in the $\\sqrt2$ and $\\sqrt3$ proofs.",
        },
        hints: [
          "Think in terms of prime factors.",
          "Squaring doubles exponents.",
          "A prime cannot appear in $n^2$ from nowhere.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If $p$ divides $n^2$, then $p$ appears in the prime factorisation of $n^2$.",
          },
          {
            step: 2,
            explanation:
              "Since exponents in $n^2$ are doubled from those in $n$, $p$ must appear in $n$.",
          },
        ],
      },
      {
        questionLatex: L`Which statement can be proved using the same contradiction idea as the proof of irrationality of $\sqrt2$?`,
        difficulty: 3,
        skillTags: ["extend_irrationality_proof", "non_perfect_square_root"],
        choices: [
          L`$\sqrt{16}$ is irrational.`,
          L`$\sqrt{25}-5$ is irrational.`,
          L`$\sqrt{12}$ is irrational.`,
          L`$\sqrt{81}/9$ is irrational.`,
        ],
        correctLetter: "C",
        rationales: {
          A: "$\\sqrt{16}=4$, which is rational.",
          B: "$\\sqrt{25}-5=0$, which is rational.",
          D: "$\\sqrt{81}/9=1$, which is rational.",
        },
        hints: [
          "Simplify each expression.",
          "Perfect square roots are rational.",
          "$\\sqrt{12}=2\\sqrt3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Simplify the non-perfect-square option.",
            math: "\\sqrt{12}=2\\sqrt3",
          },
          {
            step: 2,
            explanation:
              "Since $\\sqrt3$ is irrational, $2\\sqrt3$ is irrational.",
          },
        ],
      },
      {
        questionLatex: L`In a contradiction proof, what does "assume $\sqrt2$ is rational" mean?`,
        difficulty: 2,
        skillTags: ["proof_assumption_meaning"],
        choices: [
          L`Assume $\sqrt2=2$.`,
          L`Assume $\sqrt2$ has no place on the number line.`,
          L`Assume $\sqrt2$ is negative.`,
          L`Assume $\sqrt2=\frac ab$ for integers $a,b$ with $b\ne0$.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Rational does not mean equal to the number under the radical.",
          B: "Irrational numbers are also real numbers and have number-line positions.",
          C: "$\\sqrt2$ is positive.",
        },
        hints: [
          "Use the definition of rational number.",
          "A rational number is a ratio of integers.",
          "The denominator cannot be zero.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rational means expressible as a ratio of integers.",
            math: "\\sqrt2=\\frac ab,\\quad a,b\\in\\mathbb Z,\\ b\\ne0",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "laq",
        questionLatex: L`Prove that $\sqrt2$ is irrational.`,
        difficulty: 4,
        skillTags: ["sqrt2_irrational_proof"],
        parts: singlePart("a", "Write the full contradiction proof.", 4),
        hints: [
          "Assume $\\sqrt2=a/b$ in lowest terms.",
          "Square both sides.",
          "Show both $a$ and $b$ are even.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Assumes $\\sqrt2=a/b$ in lowest terms with integers and non-zero denominator.",
            },
            {
              part: "a",
              points: 1,
              description: "Derives $a^2=2b^2$ and concludes $a$ is even.",
            },
            {
              part: "a",
              points: 1,
              description: "Substitutes $a=2k$ and concludes $b$ is even.",
            },
            {
              part: "a",
              points: 1,
              description: "States the contradiction and conclusion.",
            },
          ],
        },
        commonErrors: [
          "Not requiring $a/b$ to be in lowest terms.",
          "Stopping after proving only that $a$ is even.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Suppose $\\sqrt2=\\frac ab$, where $a,b$ are integers, $b\\ne0$, and $a,b$ have no common factor. Squaring gives $2=\\frac{a^2}{b^2}$, so $a^2=2b^2$. Hence $a^2$ is even, so $a$ is even. Let $a=2k$. Then $4k^2=2b^2$, so $b^2=2k^2$, hence $b$ is even. Thus both $a$ and $b$ are even, contradicting that $a/b$ was in lowest terms. Therefore $\\sqrt2$ is irrational.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Complete the key missing steps in a proof of irrationality of $\sqrt3$: assume $\sqrt3=\frac ab$ in lowest terms. Then $a^2=3b^2$.`,
        difficulty: 4,
        skillTags: ["sqrt3_irrational_proof", "complete_proof_steps"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Explain why $3$ divides $a$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Use $a=3k$ to show $3$ divides $b$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the contradiction.",
            points: 1,
          },
        ],
        hints: [
          "Use the prime-factor property for squares.",
          "Substitute $a=3k$ into $a^2=3b^2$.",
          "Lowest terms means the numerator and denominator cannot share a factor.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly infers $3\\mid a$.",
            },
            {
              part: "b",
              points: 2,
              description: "Substitutes and derives $3\\mid b$.",
            },
            {
              part: "c",
              points: 1,
              description: "States common-factor contradiction.",
            },
          ],
        },
        commonErrors: [
          "Claiming $3\\mid a^2$ implies $9\\mid a$.",
          "Not completing the step for $b$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $a^2=3b^2$, $3$ divides $a^2$. Because $3$ is prime, $3$ divides $a$.",
          },
          {
            part: "b",
            explanation:
              "Let $a=3k$. Then $9k^2=3b^2$, so $b^2=3k^2$. Hence $3$ divides $b^2$, and therefore $3$ divides $b$.",
          },
          {
            part: "c",
            explanation:
              "Now $a$ and $b$ both have factor $3$, contradicting the assumption that $a/b$ was in lowest terms.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student writes: "$\sqrt2=1.414$, so $\sqrt2$ is irrational because the decimal stops at three places." Identify the error and give a correct reason.`,
        difficulty: 3,
        skillTags: ["critique_invalid_proof", "exact_vs_approximation"],
        parts: singlePart("a", "Explain the flaw and correct it.", 2),
        hints: [
          "$1.414$ is not the exact value of $\\sqrt2$.",
          "A terminating decimal is rational.",
          "Use the contradiction proof or the known theorem.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies that $1.414$ is only an approximation and is rational.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Gives a correct irrationality reason for $\\sqrt2$.",
            },
          ],
        },
        commonErrors: [
          "Accepting the rounded decimal as exact.",
          "Saying all decimals are irrational.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The error is that $1.414$ is a rounded approximation, not the exact value. Also, $1.414=1414/1000$ is rational. A correct reason is the contradiction proof showing that no fraction in lowest terms can have square equal to $2$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`If $\sqrt3=\frac ab$ in lowest terms is assumed for contradiction, what common factor is eventually shown to divide both $a$ and $b$?`,
        difficulty: 2,
        skillTags: ["sqrt3_proof_key_contradiction"],
        parts: singlePart("a", "Name the common factor.", 1),
        hints: [
          "The proof uses divisibility by the prime under the square root.",
          "For $\\sqrt3$, the prime is 3.",
          "Both numerator and denominator are forced to share that factor.",
        ],
        rubric: singleRubric("a", 1, "Identifies common factor 3."),
        commonErrors: [
          "Answering 2 by copying the $\\sqrt2$ proof without adapting it.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The contradiction is that both $a$ and $b$ are divisible by $3$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Prove that $4+\sqrt2$ is irrational.`,
        difficulty: 4,
        skillTags: ["irrational_expression_proof", "contradiction"],
        parts: singlePart("a", "Write a contradiction proof.", 3),
        hints: [
          "Assume $4+\\sqrt2$ is rational.",
          "Subtract 4 from both sides.",
          "Use closure of rational numbers under subtraction.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Assumes $4+\\sqrt2$ rational.",
            },
            {
              part: "a",
              points: 1,
              description: "Isolates $\\sqrt2$ as a rational number.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Uses contradiction with irrationality of $\\sqrt2$.",
            },
          ],
        },
        commonErrors: [
          "Only stating the result without contradiction.",
          "Saying a rational plus irrational is always rational.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Suppose $4+\\sqrt2=r$ for some rational number $r$. Then $\\sqrt2=r-4$. Since $r$ and $4$ are rational, $r-4$ is rational. This contradicts the irrationality of $\\sqrt2$. Hence $4+\\sqrt2$ is irrational.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`If an integer $a$ is even, write $a$ in the form used in the proof of irrationality of $\sqrt2$.`,
        difficulty: 1,
        skillTags: ["even_integer_form"],
        parts: singlePart("a", "Write the algebraic form.", 1),
        hints: [
          "Even means divisible by 2.",
          "Use an integer parameter.",
          "Write $a=2k$.",
        ],
        rubric: singleRubric("a", 1, "Writes $a=2k$ for some integer $k$."),
        commonErrors: ["Writing $a=k/2$ instead of showing divisibility by 2."],
        workedSolution: [
          {
            part: "a",
            explanation: "If $a$ is even, then $a=2k$ for some integer $k$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Square Root Spiral and Exact Representation",
    subtopic:
      "Constructing and interpreting exact square-root lengths on the number line.",
    mc: [
      {
        questionLatex: L`In the square-root spiral shown, if $OP_1=1$, which length is represented by $OP_4$?`,
        difficulty: 2,
        figure: squareRootSpiralFigure,
        skillTags: ["square_root_spiral", "pythagorean_iteration"],
        choices: [L`$\sqrt4$`, L`$\sqrt5$`, L`$4$`, L`$2\sqrt2$`],
        correctLetter: "A",
        rationales: {
          B: "The next radius after $OP_4$ would be $\\sqrt5$.",
          C: "$OP_4=\\sqrt4=2$, not 4 units.",
          D: "$2\\sqrt2=\\sqrt8$, which is not the fourth radius.",
        },
        hints: [
          "Each new right triangle adds a unit leg.",
          "The squared length increases by 1 at each step.",
          "The fourth radius has square 4.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The spiral gives $OP_n=\\sqrt n$.",
            math: "OP_4=\\sqrt4=2",
          },
        ],
      },
      {
        questionLatex: L`In the construction shown, the horizontal leg is $2$ units and the vertical leg is $1$ unit. Which number is marked by point $P$ on the number line?`,
        difficulty: 2,
        figure: sqrtFiveTriangleFigure,
        skillTags: ["pythagorean_construction", "represent_square_root"],
        choices: [L`$\sqrt3$`, L`$\sqrt5$`, L`$3$`, L`$\frac52$`],
        correctLetter: "B",
        rationales: {
          A: "The squared length is $2^2+1^2=5$, not 3.",
          C: "The hypotenuse is not the sum of the two legs.",
          D: "This averages the leg lengths; it does not use Pythagoras' theorem.",
        },
        hints: [
          "Use Pythagoras' theorem.",
          "The hypotenuse is transferred to the number line.",
          "Compute $\\sqrt{2^2+1^2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The hypotenuse length is",
            math: "\\sqrt{2^2+1^2}=\\sqrt5",
          },
          {
            step: 2,
            explanation: "The arc transfers that length from 0 to point $P$.",
          },
        ],
      },
      {
        questionLatex: L`After constructing a radius of length $\sqrt9$ in the square-root spiral, what is added to construct the next radius?`,
        difficulty: 2,
        skillTags: ["square_root_spiral_steps"],
        choices: [
          "A segment of length 9 on the same line.",
          "A segment of length 2 perpendicular to the current radius.",
          "A unit segment perpendicular to the current radius.",
          "A circle with radius 9.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The spiral grows by adding unit perpendicular segments, not by adding the current number.",
          B: "The added perpendicular segment has length 1 at each step.",
          D: "The final transfer may use an arc, but the next triangle is made by a unit perpendicular segment.",
        },
        hints: [
          "Each step forms a new right triangle.",
          "The new short leg is always 1 unit.",
          "Pythagoras then increases the square of the radius by 1.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If the current radius is $\\sqrt9$, adding a perpendicular unit segment gives the next radius.",
            math: "(\\sqrt9)^2+1^2=10",
          },
          { step: 2, explanation: "So the next radius is $\\sqrt{10}$." },
        ],
      },
      {
        questionLatex: L`Which statement correctly explains why the square-root spiral gives exact points for irrational numbers on the number line?`,
        difficulty: 3,
        skillTags: [
          "exact_geometric_representation",
          "irrational_on_number_line",
        ],
        choices: [
          "The spiral turns irrational numbers into rational numbers.",
          "The construction works only for perfect squares.",
          "The marked points are approximate because all drawings are approximate.",
          "The lengths are constructed by right triangles and transferred by arcs, so no decimal approximation is needed.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The numbers remain irrational; the construction represents their exact lengths geometrically.",
          B: "The point of the spiral is to represent square roots such as $\\sqrt2,\\sqrt3,\\sqrt5$ exactly.",
          C: "A physical drawing has limitations, but the mathematical construction defines the exact point.",
        },
        hints: [
          "Distinguish a mathematical construction from a rough sketch.",
          "Pythagoras gives exact lengths.",
          "An arc can transfer a length exactly in Euclidean construction.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Right-triangle construction gives exact radical lengths.",
            math: "OP_n=\\sqrt n",
          },
          {
            step: 2,
            explanation:
              "The arc transfers that length to the number line without converting it to a decimal.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: The square-root spiral can be used to locate $\sqrt7$ on the number line. Reason: Its seventh radius has length $\sqrt7$ by repeated use of Pythagoras' theorem.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "square_root_spiral_reasoning"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason explains exactly why the construction gives the required length.",
          C: "The reason is true: each new unit perpendicular increases the squared radius by 1.",
          D: "The assertion is true; $\\sqrt7$ is one of the spiral radii.",
        },
        hints: [
          "Track the square of each radius.",
          "Each added unit leg contributes $1^2$.",
          "The $n$th radius has length $\\sqrt n$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The repeated right-triangle construction gives",
            math: "OP_n^2=n",
          },
          {
            step: 2,
            explanation:
              "Therefore $OP_7=\\sqrt7$, so the reason explains the assertion.",
          },
        ],
      },
      {
        questionLatex: L`A right triangle has perpendicular sides $1$ unit and $1$ unit. What is the length of its hypotenuse?`,
        difficulty: 1,
        skillTags: ["pythagorean_basic_sqrt2"],
        choices: [L`$2$`, L`$\sqrt2$`, L`$1$`, L`$\sqrt3$`],
        correctLetter: "B",
        rationales: {
          A: "This adds the two legs instead of using Pythagoras' theorem.",
          C: "The hypotenuse is longer than either leg.",
          D: "$\\sqrt3$ would come from a sum of squares equal to 3.",
        },
        hints: [
          "Use Pythagoras' theorem.",
          "Square each leg and add.",
          "The hypotenuse is $\\sqrt{1^2+1^2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "By Pythagoras' theorem,",
            math: "h=\\sqrt{1^2+1^2}=\\sqrt2",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`Describe a construction to mark $\sqrt5$ on the number line using a right triangle.`,
        difficulty: 3,
        figure: sqrtFiveTriangleFigure,
        skillTags: ["construct_sqrt5", "geometric_representation"],
        parts: singlePart(
          "a",
          "Write the construction steps and justify the length.",
          3,
        ),
        hints: [
          "Start with a segment of 2 units on the number line.",
          "Erect a perpendicular of 1 unit at the end.",
          "Transfer the hypotenuse length to the number line.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Describes the 2-unit base and 1-unit perpendicular.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses Pythagoras to get $\\sqrt5$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Explains transfer of hypotenuse to the number line.",
            },
          ],
        },
        commonErrors: [
          "Using a 5-unit segment directly instead of constructing $\\sqrt5$.",
          "Forgetting to justify by Pythagoras' theorem.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Mark $OA=2$ units on the number line. At $A$, draw $AB=1$ unit perpendicular to $OA$. Join $OB$. Then $OB=\\sqrt{2^2+1^2}=\\sqrt5$. With centre $O$ and radius $OB$, cut the number line at $P$. Then $OP=\\sqrt5$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In a square-root spiral, what is the exact length of the sixth radius $OP_6$?`,
        difficulty: 2,
        skillTags: ["square_root_spiral_pattern"],
        parts: singlePart("a", "Give the length.", 1),
        hints: [
          "The $n$th radius has length $\\sqrt n$.",
          "The sixth such radius corresponds to $n=6$.",
          "Do not round the square root.",
        ],
        rubric: singleRubric("a", 1, "Answers $\\sqrt6$."),
        commonErrors: [
          "Answering 6 instead of $\\sqrt6$.",
          "Rounding to a decimal when exact form is requested.",
        ],
        workedSolution: [
          { part: "a", explanation: "The sixth radius has length $\\sqrt6$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A designer draws a right triangle on a grid with perpendicular sides $3$ units and $2$ units, then transfers its diagonal to a number line.`,
        difficulty: 3,
        skillTags: ["pythagorean_radical", "exact_number_line_point"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the exact length transferred.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State whether the point represents a rational or irrational number.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why the exact label is better than a decimal approximation here.",
            points: 1,
          },
        ],
        hints: [
          "Use $3^2+2^2$.",
          "Check whether 13 is a perfect square.",
          "Exact radicals keep the construction value unchanged.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\sqrt{13}$." },
            {
              part: "b",
              points: 1,
              description: "Classifies $\\sqrt{13}$ as irrational.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains exact radical vs decimal approximation.",
            },
          ],
        },
        commonErrors: [
          "Using $3+2=5$ as the diagonal.",
          "Calling $\\sqrt{13}$ rational because it is a point on the number line.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The diagonal is $\\sqrt{3^2+2^2}=\\sqrt{13}$.",
          },
          {
            part: "b",
            explanation:
              "$13$ is not a perfect square, so $\\sqrt{13}$ is irrational.",
          },
          {
            part: "c",
            explanation:
              "The decimal value is non-terminating and non-recurring, so an exact radical label preserves the true length.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why the exact point for $\sqrt7$ can be constructed on a number line even though its decimal expansion does not terminate or repeat.`,
        difficulty: 3,
        skillTags: [
          "irrational_number_line_representation",
          "exact_construction",
        ],
        parts: singlePart("a", "Give a conceptual explanation.", 2),
        hints: [
          "A number-line point is not limited to terminating decimals.",
          "Geometric construction can represent exact lengths.",
          "Use the square-root spiral idea.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that irrational numbers are real numbers and have number-line positions.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Explains exact construction through right triangles/square-root spiral.",
            },
          ],
        },
        commonErrors: [
          "Saying irrational numbers cannot be placed on a number line.",
          "Confusing exact construction with decimal rounding.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\sqrt7$ is irrational but still real, so it has a definite point on the number line. A square-root spiral constructs a radius whose square is $7$, so the radius length is exactly $\\sqrt7$; transferring that length marks the exact point without using a terminating decimal.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Using the square-root spiral idea, show why the first four radii have lengths $1,\sqrt2,\sqrt3,\sqrt4$.`,
        difficulty: 4,
        figure: squareRootSpiralFigure,
        skillTags: ["square_root_spiral_proof", "pythagorean_iteration"],
        parts: [
          { letter: "a", promptMarkdown: "Find $OP_1$ and $OP_2$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $OP_3$ and $OP_4$.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "State the pattern for $OP_n$.",
            points: 1,
          },
        ],
        hints: [
          "Each triangle is right-angled.",
          "At each step, the new short leg is 1 unit.",
          "Use Pythagoras repeatedly.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Correctly finds $OP_1=1$ and $OP_2=\\sqrt2$.",
            },
            {
              part: "b",
              points: 2,
              description: "Correctly finds $OP_3=\\sqrt3$ and $OP_4=\\sqrt4$.",
            },
            { part: "c", points: 1, description: "States $OP_n=\\sqrt n$." },
          ],
        },
        commonErrors: [
          "Adding 1 to the length instead of adding 1 to the square of the length.",
          "Writing $OP_4=4$ instead of $\\sqrt4=2$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$OP_1=1$. The next triangle has legs $OP_1=1$ and $1$, so $OP_2=\\sqrt{1^2+1^2}=\\sqrt2$.",
          },
          {
            part: "b",
            explanation:
              "$OP_3=\\sqrt{(\\sqrt2)^2+1^2}=\\sqrt3$. Similarly, $OP_4=\\sqrt{(\\sqrt3)^2+1^2}=\\sqrt4$.",
          },
          {
            part: "c",
            explanation:
              "The pattern is $OP_n=\\sqrt n$, because each added unit perpendicular increases the square of the radius by $1$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In the square-root spiral, what is the length of $OP_2$?`,
        difficulty: 1,
        skillTags: ["square_root_spiral_first_steps"],
        parts: singlePart("a", "Give the exact length.", 1),
        hints: [
          "$OP_1=1$.",
          "The next triangle adds another unit side.",
          "Use $\\sqrt{1^2+1^2}$.",
        ],
        rubric: singleRubric("a", 1, "Answers $\\sqrt2$."),
        commonErrors: ["Answering 2 by adding the two unit sides."],
        workedSolution: [
          { part: "a", explanation: "$OP_2=\\sqrt{1^2+1^2}=\\sqrt2$." },
        ],
      },
    ],
  },
];

export const numberSystemTopics: Topic[] = [...topicSeeds]
  .sort((left, right) => left.topicCode.localeCompare(right.topicCode))
  .map(makeTopic);
