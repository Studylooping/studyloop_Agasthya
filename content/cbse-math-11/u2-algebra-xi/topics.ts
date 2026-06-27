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
const UNIT = "u2-algebra-xi";
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
  return `You chose ${choiceText}. Revisit the condition and use the named Algebra rule before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_class11_algebra_reasoning",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_checking_syllabus_condition",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_showing_required_algebra",
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

const argandPlaneFigure: ItemFigure = {
  type: "svg",
  title: "Argand plane with labelled points",
  description:
    "Four labelled points around the origin: P(2,3), Q(2,-3), R(-2,3), and S(-2,-3).",
  svg: `<svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="360" fill="#ffffff"/>
  <line x1="50" y1="180" x2="470" y2="180" stroke="#64748b" stroke-width="2"/>
  <line x1="260" y1="30" x2="260" y2="330" stroke="#64748b" stroke-width="2"/>
  <path d="M470 180 L458 174 M470 180 L458 186" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M260 30 L254 42 M260 30 L266 42" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="478" y="185" font-size="15" fill="#475569" font-family="Arial, sans-serif">Re</text>
  <text x="268" y="32" font-size="15" fill="#475569" font-family="Arial, sans-serif">Im</text>
  <circle cx="360" cy="60" r="7" fill="#2563eb"/>
  <circle cx="360" cy="300" r="7" fill="#2563eb"/>
  <circle cx="160" cy="60" r="7" fill="#2563eb"/>
  <circle cx="160" cy="300" r="7" fill="#2563eb"/>
  <text x="372" y="64" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">P(2,3)</text>
  <text x="372" y="304" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">Q(2,-3)</text>
  <text x="82" y="64" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">R(-2,3)</text>
  <text x="78" y="304" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">S(-2,-3)</text>
  <text x="268" y="198" font-size="14" fill="#475569" font-family="Arial, sans-serif">O</text>
</svg>`,
};

const inequalityNumberLineFigure: ItemFigure = {
  type: "svg",
  title: "Number-line solution set",
  description:
    "A shaded interval begins just to the right of -1 and ends at a closed point at 5.",
  svg: `<svg viewBox="0 0 560 150" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="150" fill="#ffffff"/>
  <line x1="60" y1="76" x2="500" y2="76" stroke="#334155" stroke-width="2"/>
  <path d="M500 76 L488 70 M500 76 L488 82" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="130" y1="64" x2="130" y2="88" stroke="#475569" stroke-width="2"/>
  <line x1="230" y1="64" x2="230" y2="88" stroke="#475569" stroke-width="2"/>
  <line x1="330" y1="64" x2="330" y2="88" stroke="#475569" stroke-width="2"/>
  <line x1="430" y1="64" x2="430" y2="88" stroke="#475569" stroke-width="2"/>
  <line x1="230" y1="76" x2="430" y2="76" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <circle cx="230" cy="76" r="9" fill="#ffffff" stroke="#2563eb" stroke-width="3"/>
  <circle cx="430" cy="76" r="9" fill="#2563eb"/>
  <text x="120" y="118" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">-4</text>
  <text x="222" y="118" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">-1</text>
  <text x="326" y="118" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">2</text>
  <text x="426" y="118" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">5</text>
</svg>`,
};

const countingSlotsFigure: ItemFigure = {
  type: "svg",
  title: "Code slots with choices",
  description:
    "A code has one letter slot with 3 choices, then two digit slots with 4 choices and 3 remaining choices.",
  svg: `<svg viewBox="0 0 600 230" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="230" fill="#ffffff"/>
  <rect x="70" y="70" width="130" height="70" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <rect x="235" y="70" width="130" height="70" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <rect x="400" y="70" width="130" height="70" rx="8" fill="#fff7ed" stroke="#f97316" stroke-width="2"/>
  <text x="104" y="100" font-size="17" font-weight="700" fill="#1d4ed8" font-family="Arial, sans-serif">Letter</text>
  <text x="112" y="126" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">3 choices</text>
  <text x="268" y="100" font-size="17" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">Digit 1</text>
  <text x="277" y="126" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">4 choices</text>
  <text x="432" y="100" font-size="17" font-weight="700" fill="#c2410c" font-family="Arial, sans-serif">Digit 2</text>
  <text x="419" y="126" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">3 remaining</text>
  <line x1="205" y1="105" x2="230" y2="105" stroke="#64748b" stroke-width="2"/>
  <line x1="370" y1="105" x2="395" y2="105" stroke="#64748b" stroke-width="2"/>
</svg>`,
};

const pascalTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Pascal triangle rows up to n = 5",
  description: "Rows for n = 0 to n = 5 are displayed.",
  svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="300" fill="#ffffff"/>
  <text x="288" y="42" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="268" y="82" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="308" y="82" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="248" y="122" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="288" y="122" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">2</text>
  <text x="328" y="122" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="228" y="162" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="268" y="162" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">3</text>
  <text x="308" y="162" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">3</text>
  <text x="348" y="162" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="208" y="202" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">1</text>
  <text x="248" y="202" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">4</text>
  <text x="288" y="202" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">6</text>
  <text x="328" y="202" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">4</text>
  <text x="368" y="202" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">1</text>
  <text x="188" y="242" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="228" y="242" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">5</text>
  <text x="264" y="242" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">10</text>
  <text x="304" y="242" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">10</text>
  <text x="348" y="242" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">5</text>
  <text x="388" y="242" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="66" y="202" font-size="14" fill="#475569" font-family="Arial, sans-serif">n = 4 row</text>
</svg>`,
};

const gpFlowFigure: ItemFigure = {
  type: "svg",
  title: "Geometric progression flow",
  description:
    "The first three boxes show 12, 6, and 3 with the same multiplier between terms.",
  svg: `<svg viewBox="0 0 560 190" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="190" fill="#ffffff"/>
  <rect x="65" y="68" width="88" height="58" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <rect x="215" y="68" width="88" height="58" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <rect x="365" y="68" width="88" height="58" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="98" y="103" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">12</text>
  <text x="252" y="103" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">6</text>
  <text x="402" y="103" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">3</text>
  <text x="166" y="101" font-size="16" fill="#475569" font-family="Arial, sans-serif">same ratio</text>
  <text x="316" y="101" font-size="16" fill="#475569" font-family="Arial, sans-serif">same ratio</text>
  <path d="M154 118 L207 118" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M304 118 L357 118" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="470" y="103" font-size="22" fill="#64748b" font-family="Arial, sans-serif">...</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Complex Numbers and Quadratic Motivation",
    subtopic: "Algebraic form, operations, conjugates, and Argand-plane interpretation",
    mc: [
      {
        questionLatex: L`\text{In the Argand diagram, }P\text{ represents }z=2+3i.\text{ Which labelled point represents }\overline z\text{?}`,
        difficulty: 3,
        skillTags: ["complex_numbers", "argand_plane", "conjugate"],
        figure: argandPlaneFigure,
        choices: ["$Q$", "$R$", "$S$", "$O$"],
        correctLetter: "A",
        rationales: {
          B: "$R$ changes the real part instead of reflecting only the imaginary part.",
          C: "$S$ changes both signs, giving $-z$ rather than $\\overline z$.",
          D: "The origin represents $0$, not the conjugate of $2+3i$.",
        },
        hints: ["Conjugation keeps the real part unchanged.", "It reverses the sign of the imaginary part.", "Reflect the point in the real axis."],
        solution: [{ step: 1, explanation: "The conjugate of $2+3i$ is $2-3i$, which is point $Q$.", math: "\\overline z=2-3i" }],
      },
      {
        questionLatex: L`\text{A calculator-free simplification gives }(3-2i)+(1+5i)-2(2-i)=`,
        difficulty: 2,
        skillTags: ["complex_numbers", "complex_arithmetic"],
        choices: ["$5i$", "$4+5i$", "$-5i$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "This keeps the real parts before subtracting $2(2-i)$; the real parts actually cancel.",
          C: "This reverses the sign of the imaginary part in the last term.",
          D: "Only the real part becomes zero; the imaginary part is still $5i$.",
        },
        hints: ["Distribute the factor $2$ first.", "Combine real parts and imaginary parts separately.", "The real part should cancel."],
        solution: [{ step: 1, explanation: "Expand and combine like terms.", math: "(3-2i)+(1+5i)-4+2i=5i" }],
      },
      {
        questionLatex: L`\text{Assertion (A): If }z=4-7i,\text{ then }z+\overline z=8.\text{ Reason (R): The conjugate changes the sign of the imaginary part but keeps the real part fixed. Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["complex_numbers", "conjugate", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why the imaginary parts cancel in $z+\\overline z$.",
          C: "The reason is true: conjugation changes $-7i$ to $+7i$.",
          D: "The assertion is true because $(4-7i)+(4+7i)=8$.",
        },
        hints: ["Write the conjugate explicitly.", "Add the two complex numbers.", "Check whether the reason explains the cancellation."],
        solution: [{ step: 1, explanation: "Here $\\overline z=4+7i$, so the imaginary parts cancel and the real parts add.", math: "z+\\overline z=(4-7i)+(4+7i)=8" }],
      },
      {
        questionLatex: L`\text{The real equation }x^2+4=0\text{ has no real solution. If }i^2=-1\text{ is introduced, its complex solutions are}`,
        difficulty: 3,
        skillTags: ["complex_numbers", "quadratic_motivation", "imaginary_unit"],
        choices: ["$x=\\pm2i$", "$x=\\pm4i$", "$x=\\pm2$", "$x=-4$"],
        correctLetter: "A",
        rationales: {
          B: "This treats $\\sqrt4$ as $4$; since $x^2=-4$, the magnitude is $2$.",
          C: "Real numbers $\\pm2$ satisfy $x^2=4$, not $x^2=-4$.",
          D: "This gives a single real number and does not satisfy $x^2=-4$.",
        },
        hints: ["Move 4 to the other side.", "Use $-4=4i^2$.", "Both square roots must be included."],
        solution: [{ step: 1, explanation: "The equation becomes $x^2=-4=4i^2$, so $x=\\pm2i$.", math: "x^2=-4\\Rightarrow x=\\pm2i" }],
      },
      {
        questionLatex: L`\text{A map uses the real axis for east-west and the imaginary axis for north-south. A marker }4\text{ units west and }6\text{ units south of the origin is represented by}`,
        difficulty: 2,
        skillTags: ["complex_numbers", "argand_plane", "application"],
        choices: ["$-4-6i$", "$4+6i$", "$-6-4i$", "$4-6i$"],
        correctLetter: "A",
        rationales: {
          B: "This places the marker east and north, the opposite of the given directions.",
          C: "This swaps the real and imaginary coordinates.",
          D: "This uses south correctly but uses east instead of west for the real part.",
        },
        hints: ["West means a negative real coordinate.", "South means a negative imaginary coordinate.", "Write the point as $x+iy$."],
        solution: [{ step: 1, explanation: "The coordinates are $(-4,-6)$ in the Argand plane.", math: "z=-4-6i" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Simplify }(2+i)(3-4i).`,
        difficulty: 2,
        skillTags: ["complex_numbers", "complex_multiplication"],
        parts: singlePart("a", "Write the answer in $a+bi$ form.", 2),
        hints: ["Use distributive multiplication.", "Remember $i^2=-1$.", "Collect real and imaginary parts."],
        rubric: singleRubric("a", 2, "Finds $10-5i$."),
        commonErrors: ["Using $i^2=1$.", "Combining real and imaginary parts as if they were like terms."],
        workedSolution: [{ part: "a", explanation: "$(2+i)(3-4i)=6-8i+3i-4i^2=10-5i$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{For }z=-1+5i,\text{ write }\overline z\text{ and the Argand-plane point for }z.`,
        difficulty: 2,
        skillTags: ["complex_numbers", "conjugate", "argand_plane"],
        parts: singlePart("a", "Give both requested entries.", 2),
        hints: ["The conjugate changes only the sign of $i$.", "The point for $a+bi$ is $(a,b)$.", "Keep the real part $-1$ fixed."],
        rubric: singleRubric("a", 2, "Writes $\\overline z=-1-5i$ and point $(-1,5)$."),
        commonErrors: ["Changing the sign of both real and imaginary parts.", "Writing the point as $(5,-1)$."],
        workedSolution: [{ part: "a", explanation: "The conjugate is $-1-5i$. The Argand-plane point for $z$ is $(-1,5)$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Let }z=2-3i.\text{ Find }z^2+2z+5\text{ in }a+bi\text{ form.}`,
        difficulty: 3,
        skillTags: ["complex_numbers", "complex_polynomial_expression"],
        parts: singlePart("a", "Show the substitution and simplification.", 3),
        hints: ["First compute $z^2$.", "Use $i^2=-1$.", "Then add $2z+5$."],
        rubric: singleRubric("a", 3, "Finds $4-18i$ with correct use of $i^2=-1$."),
        commonErrors: ["Forgetting the cross term in $(2-3i)^2$.", "Using $i^2=1$."],
        workedSolution: [{ part: "a", explanation: "$z^2=(2-3i)^2=4-12i+9i^2=-5-12i$. Hence $z^2+2z+5=(-5-12i)+(4-6i)+5=4-18i$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{Let }z=1+2i\text{ and }w=3-i.`,
        difficulty: 4,
        skillTags: ["complex_numbers", "complex_operations", "conjugate"],
        parts: [
          { letter: "a", promptMarkdown: "Find $z+w$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $zw$.", points: 2 },
          { letter: "c", promptMarkdown: "Show that $z\\overline z$ is real and find its value.", points: 2 },
        ],
        hints: ["Add real and imaginary parts separately.", "Use row-by-row distribution for $zw$.", "$z\\overline z$ cancels the imaginary terms."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $4+i$." },
            { part: "b", points: 2, description: "Finds $5+5i$." },
            { part: "c", points: 2, description: "Finds $z\\overline z=5$ and notes it is real." },
          ],
        },
        commonErrors: ["Changing the sign of the wrong term when forming $\\overline z$.", "Dropping the $i^2$ term in multiplication."],
        workedSolution: [
          { part: "a", explanation: "$z+w=(1+2i)+(3-i)=4+i$." },
          { part: "b", explanation: "$zw=(1+2i)(3-i)=3-i+6i-2i^2=5+5i$." },
          { part: "c", explanation: "$\\overline z=1-2i$, so $z\\overline z=(1+2i)(1-2i)=1-4i^2=5$, which is real." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{In an Argand plane, point }A\text{ represents }2+3i\text{ and point }B\text{ represents }-1+4i.`,
        difficulty: 4,
        skillTags: ["complex_numbers", "argand_plane", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find the complex displacement from $A$ to $B$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the midpoint complex number of segment $AB$.", points: 2 },
          { letter: "c", promptMarkdown: "Reflect $A$ in the real axis and write the resulting complex number.", points: 1 },
        ],
        hints: ["Displacement from $A$ to $B$ is $B-A$.", "Average the real parts and imaginary parts separately.", "Reflection in the real axis gives the conjugate."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $-3+i$." },
            { part: "b", points: 2, description: "Finds $\\frac12+\\frac72 i$." },
            { part: "c", points: 1, description: "Finds $2-3i$." },
          ],
        },
        commonErrors: ["Computing $A-B$ instead of $B-A$.", "Averaging only the real parts for the midpoint."],
        workedSolution: [
          { part: "a", explanation: "$B-A=(-1+4i)-(2+3i)=-3+i$." },
          { part: "b", explanation: "The midpoint is $\\frac{(2+3i)+(-1+4i)}2=\\frac12+\\frac72 i$." },
          { part: "c", explanation: "Reflection in the real axis changes $3i$ to $-3i$, so the image of $A$ is $2-3i$." },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Linear Inequalities in One Variable",
    subtopic: "Algebraic solutions and number-line representation",
    mc: [
      {
        questionLatex: L`\text{A book fair coupon is valid when }3x+40<190,\text{ where }x\text{ is the number of books bought. If }x\text{ is a whole number, the greatest possible }x\text{ is}`,
        difficulty: 3,
        skillTags: ["linear_inequalities", "application", "integer_solution"],
        choices: ["$49$", "$50$", "$51$", "$40$"],
        correctLetter: "A",
        rationales: {
          B: "$x=50$ makes $3x+40=190$, but the inequality is strict.",
          C: "$x=51$ is beyond the upper bound from the inequality.",
          D: "This is a possible value but not the greatest possible whole number.",
        },
        hints: ["Solve the inequality first.", "Pay attention to the strict sign.", "Choose the largest whole number below the bound."],
        solution: [{ step: 1, explanation: "The inequality gives $3x<150$, so $x<50$. The greatest whole number below 50 is 49.", math: "x<50" }],
      },
      {
        questionLatex: L`\text{Which statement matches the solution set shown on the number line?}`,
        difficulty: 2,
        skillTags: ["linear_inequalities", "number_line"],
        figure: inequalityNumberLineFigure,
        choices: ["$-1<x\\le 5$", "$-1\\le x<5$", "$x<-1\\text{ or }x\\ge5$", "$-4<x\\le2$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses the open and closed endpoints shown in the diagram.",
          C: "This describes two outside rays, not the shaded interval between the endpoints.",
          D: "This uses the wrong endpoints from the number line.",
        },
        hints: ["Open circle means the endpoint is not included.", "Closed circle means the endpoint is included.", "Read the shaded segment from left to right."],
        solution: [{ step: 1, explanation: "The open point at $-1$ and closed point at $5$ give $-1<x\\le5$.", math: "-1<x\\le5" }],
      },
      {
        questionLatex: L`\text{Assertion (A): From }-2x<8\text{, we get }x>-4.\text{ Reason (R): An inequality sign reverses when both sides are divided by a negative number. Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["linear_inequalities", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is exactly the rule used to move from $-2x<8$ to $x>-4$.",
          C: "The reason is true; division by a negative reverses the sign.",
          D: "The assertion is true because $-2$ is negative, so the inequality reverses.",
        },
        hints: ["Divide both sides by $-2$.", "Remember the sign reversal rule.", "Check whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "Dividing by $-2$ reverses $<$ to $>$.", math: "-2x<8\\Rightarrow x>-4" }],
      },
      {
        questionLatex: L`\text{The compound conditions }2x-3\le7\text{ and }x+4>1\text{ together give}`,
        difficulty: 3,
        skillTags: ["linear_inequalities", "compound_inequality"],
        choices: ["$-3<x\\le5$", "$x\\le5\\text{ or }x>-3$", "$-3\\le x<5$", "$x<-3\\text{ and }x>5$"],
        correctLetter: "A",
        rationales: {
          B: "The word 'and' means intersection, not union.",
          C: "This changes both endpoint inclusions.",
          D: "This describes an impossible intersection and reverses the intended interval.",
        },
        hints: ["Solve each inequality separately.", "Use intersection because both must hold.", "Watch strict and non-strict endpoints."],
        solution: [{ step: 1, explanation: "The first inequality gives $x\\le5$, and the second gives $x>-3$.", math: "-3<x\\le5" }],
      },
      {
        questionLatex: L`\text{A trip cost is }1500+120n\text{ rupees for }n\text{ students and must not exceed }6300.\text{ Which range is correct?}`,
        difficulty: 3,
        skillTags: ["linear_inequalities", "application"],
        choices: ["$n\\le40$", "$n<40$", "$n\\ge40$", "$n\\le52$"],
        correctLetter: "A",
        rationales: {
          B: "The phrase 'must not exceed' allows equality, so $n=40$ is permitted.",
          C: "This reverses the direction of the allowable values.",
          D: "This forgets to subtract the fixed cost before dividing by 120.",
        },
        hints: ["Translate 'must not exceed' as $\\le$.", "Subtract the fixed cost first.", "Then divide by the positive coefficient."],
        solution: [{ step: 1, explanation: "Solve $1500+120n\\le6300$.", math: "120n\\le4800\\Rightarrow n\\le40" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Solve }5-2x<13.`,
        difficulty: 2,
        skillTags: ["linear_inequalities"],
        parts: singlePart("a", "Write the solution set.", 2),
        hints: ["Subtract 5 from both sides.", "Divide by $-2$.", "Reverse the inequality sign."],
        rubric: singleRubric("a", 2, "Finds $x>-4$."),
        commonErrors: ["Not reversing the inequality after division by a negative number."],
        workedSolution: [{ part: "a", explanation: "$5-2x<13\\Rightarrow -2x<8\\Rightarrow x>-4$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Solve }3(x-2)\le2x+5.`,
        difficulty: 2,
        skillTags: ["linear_inequalities"],
        parts: singlePart("a", "Write the solution set.", 2),
        hints: ["Expand the left side.", "Collect $x$ terms on one side.", "No sign reversal is needed if you do not divide by a negative."],
        rubric: singleRubric("a", 2, "Finds $x\\le11$."),
        commonErrors: ["Expanding $3(x-2)$ as $3x-2$."],
        workedSolution: [{ part: "a", explanation: "$3x-6\\le2x+5\\Rightarrow x\\le11$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Solve the compound inequality }2\le\frac{3x-1}{4}<5.`,
        difficulty: 3,
        skillTags: ["linear_inequalities", "compound_inequality"],
        parts: singlePart("a", "Show the algebra and write the interval.", 3),
        hints: ["Multiply the whole inequality by 4.", "Add 1 throughout.", "Divide throughout by 3."],
        rubric: singleRubric("a", 3, "Finds $3\\le x<7$."),
        commonErrors: ["Solving the two sides separately and then joining them with 'or'.", "Dropping the strict inequality at the upper end."],
        workedSolution: [{ part: "a", explanation: "$2\\le\\frac{3x-1}{4}<5\\Rightarrow 8\\le3x-1<20\\Rightarrow 9\\le3x<21\\Rightarrow 3\\le x<7$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A courier charges }80\text{ rupees plus }12m\text{ rupees for }m\text{ kg. A student can spend at most }260\text{ rupees.}`,
        difficulty: 4,
        skillTags: ["linear_inequalities", "application", "integer_solution"],
        parts: [
          { letter: "a", promptMarkdown: "Form the inequality in $m$.", points: 1 },
          { letter: "b", promptMarkdown: "Solve it for real $m$.", points: 2 },
          { letter: "c", promptMarkdown: "If $m$ must be a positive integer and at least $7$ kg must be sent, list the possible values of $m$.", points: 2 },
        ],
        hints: ["Translate 'at most' as $\\le$.", "Subtract the fixed charge first.", "Use both the budget bound and the minimum weight condition."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Forms $80+12m\\le260$." },
            { part: "b", points: 2, description: "Finds $m\\le15$." },
            { part: "c", points: 2, description: "Lists integers $7,8,\\ldots,15$." },
          ],
        },
        commonErrors: ["Using $<$ instead of $\\le$ for 'at most'.", "Forgetting the positive-integer restriction in part (c)."],
        workedSolution: [
          { part: "a", explanation: "The budget condition is $80+12m\\le260$." },
          { part: "b", explanation: "$12m\\le180$, so $m\\le15$." },
          { part: "c", explanation: "With $m$ a positive integer and $m\\ge7$, the possible values are $7,8,9,10,11,12,13,14,15$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{Let }t\text{ be an integer satisfying }2t+5\le45\text{ and }t-3>-8.`,
        difficulty: 4,
        skillTags: ["linear_inequalities", "case_based", "integer_solution"],
        parts: [
          { letter: "a", promptMarkdown: "Solve $2t+5\\le45$.", points: 1 },
          { letter: "b", promptMarkdown: "Solve $t-3>-8$.", points: 1 },
          { letter: "c", promptMarkdown: "Write the combined real solution interval.", points: 1 },
          { letter: "d", promptMarkdown: "How many integer settings are allowed?", points: 1 },
        ],
        hints: ["Solve each condition independently.", "Both conditions must be true.", "Count integers from the first allowed integer to the last allowed integer."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $t\\le20$." },
            { part: "b", points: 1, description: "Finds $t>-5$." },
            { part: "c", points: 1, description: "Writes $-5<t\\le20$." },
            { part: "d", points: 1, description: "Counts 25 integer settings." },
          ],
        },
        commonErrors: ["Counting $-5$ even though the inequality is strict.", "Using union instead of intersection."],
        workedSolution: [
          { part: "a", explanation: "$2t+5\\le45\\Rightarrow t\\le20$." },
          { part: "b", explanation: "$t-3>-8\\Rightarrow t>-5$." },
          { part: "c", explanation: "Both must hold, so $-5<t\\le20$." },
          { part: "d", explanation: "The integer settings are $-4,-3,\\ldots,20$, which gives $20-(-4)+1=25$ settings." },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Permutations and Combinations",
    subtopic: "Counting principles, factorials, arrangements, selections, and simple applications",
    mc: [
      {
        questionLatex: L`\text{A code has one letter followed by two distinct digits, using the choices shown. How many codes are possible?}`,
        difficulty: 3,
        skillTags: ["counting_principle", "permutations", "application"],
        figure: countingSlotsFigure,
        choices: ["$36$", "$30$", "$24$", "$10$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $3\\cdot5\\cdot2$ or another slot count not shown in the figure.",
          C: "This forgets one of the three letter choices.",
          D: "This adds choices instead of multiplying independent stages.",
        },
        hints: ["Use the multiplication principle.", "The second digit has fewer choices because repetition is not allowed.", "Multiply the numbers on the slots."],
        solution: [{ step: 1, explanation: "There are $3$ choices for the letter, then $4$ for the first digit and $3$ for the second digit.", math: "3\\cdot4\\cdot3=36" }],
      },
      {
        questionLatex: L`\text{From }6\text{ volunteers, a president and a secretary are to be chosen. One person cannot hold both posts. The number of ways is}`,
        difficulty: 2,
        skillTags: ["permutations", "npr", "application"],
        choices: ["$30$", "$15$", "$12$", "$36$"],
        correctLetter: "A",
        rationales: {
          B: "This is $^6C_2$, which ignores the difference between president and secretary.",
          C: "This uses only two choices for each post and not all six volunteers.",
          D: "This allows the same person to hold both posts.",
        },
        hints: ["The two posts are different.", "Choose the president first.", "Then choose the secretary from the remaining volunteers."],
        solution: [{ step: 1, explanation: "There are $6$ choices for president and $5$ for secretary.", math: "{}^6P_2=6\\cdot5=30" }],
      },
      {
        questionLatex: L`\text{Assertion (A): }{}^7P_3=7\cdot{}^6P_2.\text{ Reason (R): After the first position is filled in }7\text{ ways, the remaining two ordered positions can be filled in }{}^6P_2\text{ ways. Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["permutations", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason explains exactly why the product $7\\cdot{}^6P_2$ counts the same ordered arrangements.",
          C: "The reason is true by the multiplication principle for ordered positions.",
          D: "The assertion is true because $^7P_3=7\\cdot6\\cdot5=7\\cdot{}^6P_2$.",
        },
        hints: ["Write $^7P_3$ as a product.", "Write $^6P_2$ as a product.", "Compare the two sides."],
        solution: [{ step: 1, explanation: "Both sides equal $7\\cdot6\\cdot5$, and the reason gives the counting argument.", math: "{}^7P_3=7\\cdot6\\cdot5=7\\cdot{}^6P_2" }],
      },
      {
        questionLatex: L`\text{A debate team of }3\text{ students is selected from }8\text{ students. Since the team positions are not named, the number of teams is}`,
        difficulty: 3,
        skillTags: ["combinations", "ncr", "application"],
        choices: ["$56$", "$336$", "$24$", "$168$"],
        correctLetter: "A",
        rationales: {
          B: "This is $^8P_3$, which counts different orders as different teams.",
          C: "This is $4!$, unrelated to choosing 3 from 8.",
          D: "This divides the permutation count by 2 instead of by $3!$.",
        },
        hints: ["The team has no president/secretary labels.", "Use combinations, not permutations.", "Compute $^8C_3$."],
        solution: [{ step: 1, explanation: "Selecting an unordered team uses combinations.", math: "{}^8C_3=\\frac{8\\cdot7\\cdot6}{3\\cdot2\\cdot1}=56" }],
      },
      {
        questionLatex: L`\text{If }{}^nC_2=21,\text{ then }n\text{ is}`,
        difficulty: 3,
        skillTags: ["combinations", "ncr"],
        choices: ["$7$", "$6$", "$8$", "$21$"],
        correctLetter: "A",
        rationales: {
          B: "$^6C_2=15$, not 21.",
          C: "$^8C_2=28$, which is too large.",
          D: "This treats $n$ as the value of the combination instead of solving for it.",
        },
        hints: ["Use $^nC_2=\\frac{n(n-1)}2$.", "Set it equal to 21.", "Find consecutive integers whose product is 42."],
        solution: [{ step: 1, explanation: "We need $n(n-1)=42$, and $7\\cdot6=42$.", math: "{}^7C_2=21" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Evaluate }{}^6P_2+{}^6C_2.`,
        difficulty: 2,
        skillTags: ["permutations", "combinations"],
        parts: singlePart("a", "Show both values.", 2),
        hints: ["Compute the ordered count first.", "Compute the unordered count next.", "Add the two values."],
        rubric: singleRubric("a", 2, "Finds $45$."),
        commonErrors: ["Treating $^6P_2$ and $^6C_2$ as equal."],
        workedSolution: [{ part: "a", explanation: "$^6P_2=6\\cdot5=30$ and $^6C_2=15$, so the sum is $45$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{How many }3\text{-letter codes can be made from }5\text{ distinct letters if repetition is not allowed?}`,
        difficulty: 2,
        skillTags: ["permutations", "counting_principle"],
        parts: singlePart("a", "Find the number of codes.", 2),
        hints: ["The order of letters in a code matters.", "Use $5$ choices, then $4$, then $3$.", "Multiply the slot counts."],
        rubric: singleRubric("a", 2, "Finds $60$."),
        commonErrors: ["Using combinations even though codes are ordered.", "Allowing repetition."],
        workedSolution: [{ part: "a", explanation: "The number of codes is $5\\cdot4\\cdot3=60$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{A committee of }3\text{ students is selected from }5\text{ boys and }4\text{ girls. Find the number of committees with at least one girl.}`,
        difficulty: 3,
        skillTags: ["combinations", "complement_counting", "application"],
        parts: singlePart("a", "Use a complement count or a case split.", 3),
        hints: ["Count all 3-student committees.", "Subtract committees with no girls.", "No order is involved."],
        rubric: singleRubric("a", 3, "Finds $74$."),
        commonErrors: ["Counting ordered selections.", "Subtracting committees with all girls instead of no girls."],
        workedSolution: [{ part: "a", explanation: "All committees: $^9C_3=84$. Committees with no girl: $^5C_3=10$. Required number $=84-10=74$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A shelf has }5\text{ distinct mathematics books and }3\text{ distinct science books.}`,
        difficulty: 4,
        skillTags: ["permutations", "combinations", "application"],
        parts: [
          { letter: "a", promptMarkdown: "In how many ways can all $8$ books be arranged if the science books must stay together?", points: 2 },
          { letter: "b", promptMarkdown: "In how many ways can $4$ books be selected with exactly $2$ mathematics and $2$ science books?", points: 2 },
          { letter: "c", promptMarkdown: "In how many ways can two distinct books be assigned to first and second display positions?", points: 1 },
        ],
        hints: ["Treat the science books as one block in part (a).", "Selection in part (b) is unordered.", "First and second display positions are ordered."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $6!\\cdot3!$." },
            { part: "b", points: 2, description: "Finds $^5C_2\\cdot{}^3C_2=30$." },
            { part: "c", points: 1, description: "Finds $^8P_2=56$." },
          ],
        },
        commonErrors: ["Forgetting to arrange books within the science block.", "Using permutations for part (b)."],
        workedSolution: [
          { part: "a", explanation: "Treat the 3 science books as one block. Then there are 6 objects to arrange, and the science books can be arranged internally in $3!$ ways. Total $=6!\\cdot3!=4320$." },
          { part: "b", explanation: "Choose 2 mathematics and 2 science books: $^5C_2\\cdot{}^3C_2=10\\cdot3=30$." },
          { part: "c", explanation: "The first display position can be filled in $8$ ways and the second in $7$ ways, so $^8P_2=8\\cdot7=56$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A label is formed using one letter from }A,B,C,D\text{ followed by two distinct digits from }1,2,3,4,5.`,
        difficulty: 4,
        skillTags: ["counting_principle", "permutations", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "How many labels are possible?", points: 1 },
          { letter: "b", promptMarkdown: "How many labels have $5$ as the first digit after the letter?", points: 1 },
          { letter: "c", promptMarkdown: "How many labels use the digits $2$ and $4$ in some order?", points: 2 },
        ],
        hints: ["Multiply the independent slot counts.", "Fixing one slot reduces the choices.", "For part (c), choose the letter and arrange the two fixed digits."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $80$." },
            { part: "b", points: 1, description: "Finds $16$." },
            { part: "c", points: 2, description: "Finds $8$." },
          ],
        },
        commonErrors: ["Allowing repeated digits.", "Treating the digit order as irrelevant in a label."],
        workedSolution: [
          { part: "a", explanation: "There are $4$ letter choices, then $5$ first-digit choices and $4$ second-digit choices, so $4\\cdot5\\cdot4=80$." },
          { part: "b", explanation: "Choose the letter in $4$ ways, fix the first digit as $5$, then choose the second digit in $4$ ways. Total $=16$." },
          { part: "c", explanation: "Choose the letter in $4$ ways and arrange digits $2$ and $4$ in $2!$ ways. Total $=4\\cdot2=8$." },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Binomial Theorem",
    subtopic: "Positive integral powers, Pascal triangle, and simple expansions",
    mc: [
      {
        questionLatex: L`\text{Use the displayed Pascal row for }n=4.\text{ In }(a+2b)^4,\text{ the coefficient of }a^2b^2\text{ is}`,
        difficulty: 3,
        skillTags: ["binomial_theorem", "pascal_triangle", "coefficient"],
        figure: pascalTriangleFigure,
        choices: ["$24$", "$6$", "$12$", "$16$"],
        correctLetter: "A",
        rationales: {
          B: "This uses only the Pascal coefficient and forgets the factor $(2b)^2$.",
          C: "This multiplies the Pascal coefficient by 2 instead of by $2^2$.",
          D: "This uses $2^4$ without the central Pascal coefficient.",
        },
        hints: ["The $a^2b^2$ term comes from the middle coefficient in row 4.", "The Pascal coefficient is 6.", "Do not forget $(2b)^2$."],
        solution: [{ step: 1, explanation: "The required term is $6a^2(2b)^2=24a^2b^2$.", math: "6\\cdot2^2=24" }],
      },
      {
        questionLatex: L`\text{In the expansion of }(1+x)^5,\text{ the coefficient of }x^3\text{ is}`,
        difficulty: 2,
        skillTags: ["binomial_theorem", "pascal_triangle", "coefficient"],
        choices: ["$10$", "$5$", "$20$", "$1$"],
        correctLetter: "A",
        rationales: {
          B: "This is the coefficient of $x$ or $x^4$, not $x^3$.",
          C: "This doubles the Pascal coefficient without a reason.",
          D: "This is the coefficient of the first or last term.",
        },
        hints: ["Use the row for power 5.", "The coefficients are symmetric.", "The coefficient of $x^3$ equals $^5C_3$."],
        solution: [{ step: 1, explanation: "For $(1+x)^5$, the coefficient of $x^3$ is $^5C_3=10$.", math: "{}^5C_3=10" }],
      },
      {
        questionLatex: L`\text{Assertion (A): The sum of coefficients in }(2x-3)^4\text{ is }1.\text{ Reason (R): The sum of coefficients of a polynomial in }x\text{ is found by putting }x=1.\text{ Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["binomial_theorem", "sum_of_coefficients", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason explains exactly why substituting $x=1$ gives the coefficient sum.",
          C: "The reason is true for polynomials written in powers of $x$.",
          D: "The assertion is true because $(2\\cdot1-3)^4=1$.",
        },
        hints: ["Use the standard coefficient-sum test.", "Substitute $x=1$ in the whole expression.", "Check whether the reason justifies the assertion."],
        solution: [{ step: 1, explanation: "The coefficient sum is obtained by substituting $x=1$.", math: "(2\\cdot1-3)^4=(-1)^4=1" }],
      },
      {
        questionLatex: L`\text{The coefficient of }x\text{ in }(1-3x)^3\text{ is}`,
        difficulty: 3,
        skillTags: ["binomial_theorem", "coefficient"],
        choices: ["$-9$", "$9$", "$-3$", "$27$"],
        correctLetter: "A",
        rationales: {
          B: "This misses the negative sign from $-3x$.",
          C: "This forgets the Pascal coefficient 3.",
          D: "This uses the cubic term instead of the linear term.",
        },
        hints: ["Use the $3$ from the row $1,3,3,1$.", "The linear term chooses $-3x$ once.", "Keep the negative sign."],
        solution: [{ step: 1, explanation: "The linear term is $3(1)^2(-3x)=-9x$.", math: "\\text{coefficient of }x=-9" }],
      },
      {
        questionLatex: L`\text{Which Pascal row gives the coefficients of }(p+q)^5\text{?}`,
        difficulty: 2,
        skillTags: ["binomial_theorem", "pascal_triangle"],
        choices: ["$1,5,10,10,5,1$", "$1,4,6,4,1$", "$1,6,15,20,15,6,1$", "$5,10,10,5$"],
        correctLetter: "A",
        rationales: {
          B: "This is the row for power 4, not power 5.",
          C: "This is the row for power 6.",
          D: "This omits the endpoint coefficients 1 and is not a complete Pascal row.",
        },
        hints: ["The row for power $n$ has $n+1$ entries.", "Power 5 needs 6 entries.", "Use Pascal row $n=5$."],
        solution: [{ step: 1, explanation: "The coefficients of $(p+q)^5$ are given by the $n=5$ row.", math: "1,5,10,10,5,1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Expand }(x+2)^3.`,
        difficulty: 2,
        skillTags: ["binomial_theorem", "expansion"],
        parts: singlePart("a", "Write the complete expansion.", 2),
        hints: ["Use coefficients $1,3,3,1$.", "The second term is $3x^2(2)$.", "The last term is $2^3$."],
        rubric: singleRubric("a", 2, "Finds $x^3+6x^2+12x+8$."),
        commonErrors: ["Writing $x^3+8$ only.", "Forgetting the interior terms."],
        workedSolution: [{ part: "a", explanation: "$(x+2)^3=x^3+3x^2(2)+3x(2^2)+2^3=x^3+6x^2+12x+8$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the coefficient of }a^2b\text{ in }(a-b)^3.`,
        difficulty: 2,
        skillTags: ["binomial_theorem", "coefficient"],
        parts: singlePart("a", "Give the coefficient with sign.", 2),
        hints: ["Use the row $1,3,3,1$.", "The $a^2b$ term chooses $-b$ once.", "The sign is negative."],
        rubric: singleRubric("a", 2, "Finds $-3$."),
        commonErrors: ["Ignoring the negative sign in $-b$."],
        workedSolution: [{ part: "a", explanation: "The $a^2b$ term is $3a^2(-b)=-3a^2b$, so the coefficient is $-3$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Expand }(2x-1)^4\text{ using the binomial theorem.}`,
        difficulty: 3,
        skillTags: ["binomial_theorem", "expansion"],
        parts: singlePart("a", "Show the binomial coefficients and simplify.", 3),
        hints: ["Use coefficients $1,4,6,4,1$.", "Keep the signs from $-1$.", "Simplify each term."],
        rubric: singleRubric("a", 3, "Finds $16x^4-32x^3+24x^2-8x+1$."),
        commonErrors: ["Making every term positive.", "Forgetting powers of 2 in $(2x)^k$."],
        workedSolution: [{ part: "a", explanation: "$(2x-1)^4=16x^4-32x^3+24x^2-8x+1$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A model uses the factor }(1+r)^4\text{ for four equal growth steps.}`,
        difficulty: 4,
        skillTags: ["binomial_theorem", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Expand $(1+r)^4$.", points: 2 },
          { letter: "b", promptMarkdown: "Use the expansion to find $(1.1)^4$ exactly as a decimal.", points: 2 },
          { letter: "c", promptMarkdown: "State why all terms after the first are positive when $r>0$.", points: 1 },
        ],
        hints: ["Use the row $1,4,6,4,1$.", "Put $r=0.1$.", "Each power of a positive $r$ is positive."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $1+4r+6r^2+4r^3+r^4$." },
            { part: "b", points: 2, description: "Finds $1.4641$." },
            { part: "c", points: 1, description: "Explains positivity for $r>0$." },
          ],
        },
        commonErrors: ["Using the row for power 3.", "Rounding before completing the exact decimal calculation."],
        workedSolution: [
          { part: "a", explanation: "$(1+r)^4=1+4r+6r^2+4r^3+r^4$." },
          { part: "b", explanation: "For $r=0.1$, $(1.1)^4=1+0.4+0.06+0.004+0.0001=1.4641$." },
          { part: "c", explanation: "When $r>0$, each power $r,r^2,r^3,r^4$ is positive, and all binomial coefficients are positive." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{An art pattern uses Pascal coefficients to form powers of }m+n\text{ and }m-n.`,
        difficulty: 4,
        skillTags: ["binomial_theorem", "pascal_triangle", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write the coefficient row for power $5$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the coefficient of $m^3n^2$ in $(m+n)^5$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the coefficient of $m^2n^3$ in $(m-n)^5$.", points: 2 },
        ],
        hints: ["Use the Pascal row for $n=5$.", "For $(m+n)^5$, signs stay positive.", "For $(m-n)^5$, odd powers of $n$ are negative."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $1,5,10,10,5,1$." },
            { part: "b", points: 1, description: "Finds $10$." },
            { part: "c", points: 2, description: "Finds $-10$." },
          ],
        },
        commonErrors: ["Ignoring the sign change in $(m-n)^5$.", "Using the row for power 4."],
        workedSolution: [
          { part: "a", explanation: "The row for power 5 is $1,5,10,10,5,1$." },
          { part: "b", explanation: "The coefficient of $m^3n^2$ is the middle coefficient $10$." },
          { part: "c", explanation: "The $m^2n^3$ term uses coefficient $10$ and $(-n)^3$, so the coefficient is $-10$." },
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Sequences and Series",
    subtopic: "Sequences, GP terms and sums, infinite GP, AM, GM, and AM-GM relation",
    mc: [
      {
        questionLatex: L`\text{The displayed pattern continues as a geometric progression. The sum of all terms of the infinite GP is}`,
        difficulty: 3,
        skillTags: ["geometric_progression", "infinite_gp", "series"],
        figure: gpFlowFigure,
        choices: ["$24$", "$21$", "$18$", "$12$"],
        correctLetter: "A",
        rationales: {
          B: "This is the sum of only the first three visible terms.",
          C: "This uses an incorrect common ratio.",
          D: "This is just the first term, not the infinite sum.",
        },
        hints: ["Find the common ratio from consecutive terms.", "Use $S_\\infty=\\frac{a}{1-r}$ when $|r|<1$.", "Here the first term is 12."],
        solution: [{ step: 1, explanation: "The common ratio is $\\frac12$.", math: "S_\\infty=\\frac{12}{1-1/2}=24" }],
      },
      {
        questionLatex: L`\text{The fifth term of the GP }3,6,12,\ldots\text{ is}`,
        difficulty: 2,
        skillTags: ["geometric_progression", "nth_term"],
        choices: ["$48$", "$24$", "$96$", "$15$"],
        correctLetter: "A",
        rationales: {
          B: "This is the fourth term, not the fifth.",
          C: "This is the sixth term.",
          D: "This adds 3 repeatedly, treating the sequence as arithmetic.",
        },
        hints: ["Find the common ratio.", "Use $a_n=ar^{n-1}$.", "For the fifth term, use exponent 4."],
        solution: [{ step: 1, explanation: "Here $a=3$ and $r=2$.", math: "a_5=3\\cdot2^4=48" }],
      },
      {
        questionLatex: L`\text{Assertion (A): For positive numbers }a\text{ and }b,\text{ their G.M. is not greater than their A.M. Reason (R): }(\sqrt a-\sqrt b)^2\ge0\text{ gives }a+b\ge2\sqrt{ab}.\text{ Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["am_gm", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is the standard proof that $\\sqrt{ab}\\le\\frac{a+b}{2}$.",
          C: "The reason is true because every square is non-negative.",
          D: "The assertion is true for positive numbers by the AM-GM relation.",
        },
        hints: ["Rewrite A.M. and G.M.", "Use the inequality from the reason.", "Divide by 2 to compare."],
        solution: [{ step: 1, explanation: "From $a+b\\ge2\\sqrt{ab}$, divide by 2 to get $\\frac{a+b}{2}\\ge\\sqrt{ab}$.", math: "\\text{A.M.}\\ge\\text{G.M.}" }],
      },
      {
        questionLatex: L`\text{Three positive numbers are in GP. If the first is }5\text{ and the third is }20,\text{ the middle number is}`,
        difficulty: 3,
        skillTags: ["geometric_progression", "geometric_mean"],
        choices: ["$10$", "$25$", "$12.5$", "$15$"],
        correctLetter: "A",
        rationales: {
          B: "This multiplies the first and third terms without taking the square root.",
          C: "This is the arithmetic mean, not the geometric mean.",
          D: "This is a linear midpoint, not the GP central value.",
        },
        hints: ["For three positive GP entries, the central entry is the G.M. of the outer entries.", "Compute $\\sqrt{5\\cdot20}$.", "Use the positive value."],
        solution: [{ step: 1, explanation: "The central GP entry is the geometric mean of 5 and 20.", math: "\\sqrt{5\\cdot20}=10" }],
      },
      {
        questionLatex: L`\text{The sum of the first four terms of the GP }2,6,18,\ldots\text{ is}`,
        difficulty: 3,
        skillTags: ["geometric_progression", "finite_gp_sum"],
        choices: ["$80$", "$54$", "$64$", "$72$"],
        correctLetter: "A",
        rationales: {
          B: "This is the fourth term only, not the sum of four terms.",
          C: "This uses a common ratio of 2 instead of 3.",
          D: "This omits the first term or adds only part of the series.",
        },
        hints: ["Find the first four terms.", "The common ratio is 3.", "Add $2+6+18+54$."],
        solution: [{ step: 1, explanation: "The first four terms are $2,6,18,54$.", math: "2+6+18+54=80" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the A.M. and G.M. of }18\text{ and }32.`,
        difficulty: 2,
        skillTags: ["arithmetic_mean", "geometric_mean", "am_gm"],
        parts: singlePart("a", "Give both values.", 2),
        hints: ["A.M. is the average.", "G.M. is the square root of the product.", "Simplify $\\sqrt{576}$."],
        rubric: singleRubric("a", 2, "Finds A.M. $25$ and G.M. $24$."),
        commonErrors: ["Using $18+32$ as the A.M. without dividing by 2.", "Leaving $\\sqrt{576}$ unsimplified."],
        workedSolution: [{ part: "a", explanation: "A.M. $=\\frac{18+32}{2}=25$. G.M. $=\\sqrt{18\\cdot32}=\\sqrt{576}=24$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the sixth term of the GP }5,10,20,\ldots`,
        difficulty: 2,
        skillTags: ["geometric_progression", "nth_term"],
        parts: singlePart("a", "Write the sixth term.", 2),
        hints: ["Find the common ratio.", "Use $a_n=ar^{n-1}$.", "Use exponent 5 for the sixth term."],
        rubric: singleRubric("a", 2, "Finds $160$."),
        commonErrors: ["Using exponent 6 instead of 5.", "Treating the sequence as arithmetic."],
        workedSolution: [{ part: "a", explanation: "Here $a=5$ and $r=2$, so $a_6=5\\cdot2^5=160$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{In a GP, the second term is }12\text{ and the third term is }36.\text{ Find the first term and the sum of the first four terms.}`,
        difficulty: 3,
        skillTags: ["geometric_progression", "finite_gp_sum"],
        parts: singlePart("a", "Show how you find the common ratio.", 3),
        hints: ["Divide the third term by the second term.", "Use the common ratio to move backward to the first term.", "Then list the first four terms."],
        rubric: singleRubric("a", 3, "Finds first term $4$ and sum $160$."),
        commonErrors: ["Subtracting terms to find common difference.", "Starting the sum from the second term."],
        workedSolution: [{ part: "a", explanation: "$r=36/12=3$. Hence the first term is $12/3=4$. The first four terms are $4,12,36,108$, and their sum is $160$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{Consider the GP }8,4,2,\ldots`,
        difficulty: 4,
        skillTags: ["geometric_progression", "finite_gp_sum", "infinite_gp"],
        parts: [
          { letter: "a", promptMarkdown: "Find the common ratio.", points: 1 },
          { letter: "b", promptMarkdown: "Find the sum to infinity.", points: 2 },
          { letter: "c", promptMarkdown: "Find the least $n$ for which the sum of the first $n$ terms exceeds $15$.", points: 2 },
        ],
        hints: ["The ratio is less than 1 in magnitude.", "Use $S_\\infty=\\frac{a}{1-r}$.", "Use $S_n=16(1-(1/2)^n)$ for part (c)."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $r=1/2$." },
            { part: "b", points: 2, description: "Finds $16$." },
            { part: "c", points: 2, description: "Finds least $n=5$." },
          ],
        },
        commonErrors: ["Using the infinite sum formula when $|r|\\ge1$ in unrelated problems.", "Testing $n=4$ without checking strict 'exceeds'."],
        workedSolution: [
          { part: "a", explanation: "$r=4/8=1/2$." },
          { part: "b", explanation: "$S_\\infty=\\frac{8}{1-1/2}=16$." },
          { part: "c", explanation: "$S_n=8\\frac{1-(1/2)^n}{1-1/2}=16(1-(1/2)^n)$. We need $16(1-(1/2)^n)>15$, so $(1/2)^n<1/16$. The least such integer is $n=5$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A savings challenge deposits amounts in a GP. The first deposit is }1000\text{ rupees and each next deposit is }\frac32\text{ times the previous one.}`,
        difficulty: 4,
        skillTags: ["geometric_progression", "case_based", "finite_gp_sum"],
        parts: [
          { letter: "a", promptMarkdown: "Find the second and third deposits.", points: 1 },
          { letter: "b", promptMarkdown: "Find the fourth deposit.", points: 1 },
          { letter: "c", promptMarkdown: "Find the total of the first four deposits.", points: 2 },
        ],
        hints: ["Multiply by $3/2$ each time.", "Use either listing or the finite GP sum formula.", "Keep rupee amounts exact."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $1500$ and $2250$." },
            { part: "b", points: 1, description: "Finds $3375$." },
            { part: "c", points: 2, description: "Finds total $8125$." },
          ],
        },
        commonErrors: ["Adding $3/2$ instead of multiplying by $3/2$.", "Using the infinite GP formula even though $r>1$."],
        workedSolution: [
          { part: "a", explanation: "The second deposit is $1000\\cdot\\frac32=1500$, and the third is $1500\\cdot\\frac32=2250$." },
          { part: "b", explanation: "The fourth deposit is $2250\\cdot\\frac32=3375$." },
          { part: "c", explanation: "The total is $1000+1500+2250+3375=8125$ rupees." },
        ],
      },
    ],
  },
];

export const algebraXiTopics: Topic[] = topicSeeds.map(makeTopic);
