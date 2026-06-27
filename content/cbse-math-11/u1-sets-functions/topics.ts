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
const UNIT = "u1-sets-functions";
const VERSION = "0.2.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

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
  rationales: Record<Exclude<McLetter, "A">, string>;
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, _index: number): Difficulty {
  return seedDifficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, type: ResponseType): Difficulty {
  const floor = type === "laq" || type === "case" ? 3 : type === "saq" ? 2 : 1;
  return Math.max(seedDifficulty, floor) as Difficulty;
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Revisit the defining condition in the question.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[seedLetter as Exclude<McLetter, "A">] ??
          fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_class11_reasoning",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_procedure_without_checking_the_definition",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_using_the_required_definition",
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

const intervalFigure: ItemFigure = {
  type: "svg",
  title: "Interval on the number line",
  description: "Closed dot at -2, open dot at 3, and a shaded segment between them.",
  svg: `<svg viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="420" height="120" fill="#ffffff"/>
  <line x1="40" y1="62" x2="380" y2="62" stroke="#334155" stroke-width="2"/>
  <path d="M370 56 L380 62 L370 68" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="120" y1="52" x2="120" y2="72" stroke="#334155" stroke-width="2"/>
  <line x1="280" y1="52" x2="280" y2="72" stroke="#334155" stroke-width="2"/>
  <line x1="120" y1="62" x2="280" y2="62" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <circle cx="120" cy="62" r="8" fill="#2563eb"/>
  <circle cx="280" cy="62" r="8" fill="#ffffff" stroke="#2563eb" stroke-width="3"/>
  <text x="112" y="96" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">-2</text>
  <text x="275" y="96" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">3</text>
</svg>`,
};

const vennFigure: ItemFigure = {
  type: "svg",
  title: "Two-set Venn diagram",
  description: "Universal set with two overlapping sets A and B labelled by region counts.",
  svg: `<svg viewBox="0 0 460 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="30" y="25" width="400" height="210" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <circle cx="180" cy="130" r="82" fill="#dbeafe" fill-opacity="0.85" stroke="#2563eb" stroke-width="3"/>
  <circle cx="280" cy="130" r="82" fill="#dcfce7" fill-opacity="0.85" stroke="#16a34a" stroke-width="3"/>
  <text x="130" y="72" font-size="18" font-weight="700" fill="#1d4ed8" font-family="Arial, sans-serif">A</text>
  <text x="322" y="72" font-size="18" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">B</text>
  <text x="132" y="136" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">12</text>
  <text x="224" y="136" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">8</text>
  <text x="318" y="136" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">15</text>
  <text x="374" y="214" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">5</text>
  <text x="44" y="50" font-size="16" fill="#475569" font-family="Arial, sans-serif">U</text>
</svg>`,
};

const relationFigure: ItemFigure = {
  type: "svg",
  title: "Relation from A to B",
  description: "Arrow diagram for a relation from A = {1,2,3} to B = {a,b,c}.",
  svg: `<svg viewBox="0 0 460 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="460" height="250" fill="#ffffff"/>
  <ellipse cx="125" cy="125" rx="75" ry="95" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <ellipse cx="335" cy="125" rx="75" ry="95" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="120" y="44" font-size="18" font-weight="700" fill="#1d4ed8" font-family="Arial, sans-serif">A</text>
  <text x="330" y="44" font-size="18" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">B</text>
  <text x="118" y="92" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="118" y="132" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">2</text>
  <text x="118" y="172" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">3</text>
  <text x="330" y="92" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">a</text>
  <text x="330" y="132" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">b</text>
  <text x="330" y="172" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">c</text>
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#334155"/></marker></defs>
  <line x1="135" y1="86" x2="322" y2="86" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="135" y1="126" x2="322" y2="166" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="135" y1="166" x2="322" y2="126" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>
</svg>`,
};

const modulusFigure: ItemFigure = {
  type: "svg",
  title: "V-shaped graph on coordinate axes",
  description: "A V-shaped graph with vertex at the origin and symmetry about the y-axis.",
  svg: `<svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="360" height="260" fill="#ffffff"/>
  <line x1="30" y1="210" x2="330" y2="210" stroke="#64748b" stroke-width="2"/>
  <line x1="180" y1="230" x2="180" y2="30" stroke="#64748b" stroke-width="2"/>
  <path d="M322 204 L330 210 L322 216" fill="none" stroke="#64748b" stroke-width="2"/>
  <path d="M174 38 L180 30 L186 38" fill="none" stroke="#64748b" stroke-width="2"/>
  <polyline points="60,90 180,210 300,90" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="306" y="232" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">x</text>
  <text x="196" y="45" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">y</text>
  <text x="186" y="226" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">0</text>
</svg>`,
};

const unitCircleFigure: ItemFigure = {
  type: "svg",
  title: "Unit-circle reference angle",
  description: "A unit circle with labelled axes, radius 1, reference points, an angle mark, and point P.",
  svg: `<svg viewBox="0 0 430 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="430" height="340" fill="#ffffff"/>
  <line x1="55" y1="180" x2="360" y2="180" stroke="#64748b" stroke-width="2"/>
  <line x1="190" y1="305" x2="190" y2="45" stroke="#64748b" stroke-width="2"/>
  <path d="M352 174 L360 180 L352 186" fill="none" stroke="#64748b" stroke-width="2"/>
  <path d="M184 53 L190 45 L196 53" fill="none" stroke="#64748b" stroke-width="2"/>
  <circle cx="190" cy="180" r="105" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
  <line x1="190" y1="180" x2="264" y2="106" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  <path d="M236 180 A46 46 0 0 0 222 147" fill="none" stroke="#f97316" stroke-width="3.5"/>
  <line x1="264" y1="106" x2="264" y2="180" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5 5"/>
  <line x1="190" y1="106" x2="264" y2="106" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5 5"/>
  <circle cx="264" cy="106" r="6.5" fill="#2563eb"/>
  <circle cx="295" cy="180" r="4" fill="#0f172a"/>
  <circle cx="190" cy="75" r="4" fill="#0f172a"/>
  <text x="273" y="105" font-size="17" font-weight="700" fill="#1d4ed8" font-family="Arial, sans-serif">P</text>
  <text x="242" y="166" font-size="19" fill="#ea580c" font-family="Arial, sans-serif">&#952;</text>
  <text x="221" y="139" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">1</text>
  <text x="344" y="203" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">x</text>
  <text x="205" y="60" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">y</text>
  <text x="198" y="197" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">O</text>
  <text x="303" y="174" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">(1,0)</text>
  <text x="122" y="82" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">(0,1)</text>
</svg>`,
};

const sineCosineGraphFigure: ItemFigure = {
  type: "svg",
  title: "Two basic trigonometric graphs",
  description: "Two smooth periodic graphs on common axes; one starts at the origin and one starts at a maximum.",
  svg: `<svg viewBox="0 0 520 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="260" fill="#ffffff"/>
  <line x1="45" y1="130" x2="480" y2="130" stroke="#64748b" stroke-width="2"/>
  <line x1="80" y1="220" x2="80" y2="35" stroke="#64748b" stroke-width="2"/>
  <path d="M472 124 L480 130 L472 136" fill="none" stroke="#64748b" stroke-width="2"/>
  <path d="M74 43 L80 35 L86 43" fill="none" stroke="#64748b" stroke-width="2"/>
  <line x1="80" y1="70" x2="480" y2="70" stroke="#e2e8f0" stroke-width="1"/>
  <line x1="80" y1="190" x2="480" y2="190" stroke="#e2e8f0" stroke-width="1"/>
  <line x1="180" y1="124" x2="180" y2="136" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="280" y1="124" x2="280" y2="136" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="380" y1="124" x2="380" y2="136" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="480" y1="124" x2="480" y2="136" stroke="#94a3b8" stroke-width="1.5"/>
  <polyline points="80,130 96.7,114.5 113.3,100 130,87.6 146.7,78 163.3,72 180,70 196.7,72 213.3,78 230,87.6 246.7,100 263.3,114.5 280,130 296.7,145.5 313.3,160 330,172.4 346.7,182 363.3,188 380,190 396.7,188 413.3,182 430,172.4 446.7,160 463.3,145.5 480,130" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="80,70 96.7,72 113.3,78 130,87.6 146.7,100 163.3,114.5 180,130 196.7,145.5 213.3,160 230,172.4 246.7,182 263.3,188 280,190 296.7,188 313.3,182 330,172.4 346.7,160 363.3,145.5 380,130 396.7,114.5 413.3,100 430,87.6 446.7,78 463.3,72 480,70" fill="none" stroke="#ea580c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="485" y="150" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">x</text>
  <text x="92" y="48" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">y</text>
  <text x="58" y="75" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">1</text>
  <text x="52" y="195" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">-1</text>
  <text x="88" y="150" font-size="13" fill="#0f172a" font-family="Arial, sans-serif">0</text>
  <text x="280" y="232" font-size="14" fill="#0f172a" font-family="Arial, sans-serif" text-anchor="middle">&#960;</text>
  <text x="480" y="232" font-size="14" fill="#0f172a" font-family="Arial, sans-serif" text-anchor="middle">2&#960;</text>
</svg>`,
};

const tangentGraphFigure: ItemFigure = {
  type: "svg",
  title: "Periodic graph with vertical asymptotes",
  description: "A central branch passes through the origin, with repeated vertical dashed asymptotes.",
  svg: `<svg viewBox="0 0 520 270" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="270" fill="#ffffff"/>
  <line x1="45" y1="135" x2="480" y2="135" stroke="#64748b" stroke-width="2"/>
  <line x1="260" y1="235" x2="260" y2="35" stroke="#64748b" stroke-width="2"/>
  <path d="M472 129 L480 135 L472 141" fill="none" stroke="#64748b" stroke-width="2"/>
  <path d="M254 43 L260 35 L266 43" fill="none" stroke="#64748b" stroke-width="2"/>
  <line x1="140" y1="35" x2="140" y2="235" stroke="#f97316" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="380" y1="35" x2="380" y2="235" stroke="#f97316" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M152 225 C187 180 223 145 260 135 C297 125 333 90 368 45" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
  <path d="M32 225 C67 180 103 145 140 135 C177 125 213 90 248 45" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
  <path d="M272 225 C307 180 343 145 380 135 C417 125 453 90 488 45" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
  <text x="485" y="155" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">x</text>
  <text x="273" y="50" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">y</text>
  <text x="267" y="154" font-size="13" fill="#0f172a" font-family="Arial, sans-serif">0</text>
  <text x="124" y="254" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">-&#960;/2</text>
  <text x="367" y="254" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">&#960;/2</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Sets, Subsets, and Intervals",
    subtopic: "Set representation, empty sets, finite and infinite sets, equal sets, subsets, and intervals",
    mc: [
      {
        questionLatex: "\\text{Let }A=\\{x\\in\\mathbb N:x^2<20\\}.\\text{ Which roster form of }A\\text{ is correct?}",
        difficulty: 2,
        skillTags: ["sets", "roster_form"],
        choices: ["$\\{1,2,3,4\\}$", "$\\{0,1,2,3,4\\}$", "$\\{1,2,3,4,5\\}$", "$\\{x:x<20\\}$"],
        correctLetter: "A",
        rationales: {
          B: "This includes 0, but the usual CBSE convention here uses natural numbers starting at 1 unless 0 is stated.",
          C: "This includes 5 even though $5^2=25$, which is not less than 20.",
          D: "This changes the condition from $x^2<20$ to $x<20$ and is not roster form.",
        },
        hints: ["Test natural numbers one by one.", "Stop when the square is no longer less than 20.", "Remember $5^2=25$."],
        solution: [{ step: 1, explanation: "The natural numbers whose squares are less than 20 are 1, 2, 3, and 4.", math: "A=\\{1,2,3,4\\}" }],
      },
      {
        questionLatex: "\\text{Let }A=\\{x\\in\\mathbb R:x^2+4=0\\}.\\text{ Which set is }A\\text{?}",
        difficulty: 2,
        skillTags: ["sets", "empty_set"],
        choices: ["$\\varnothing$", "$\\{2\\}$", "$\\{-2,2\\}$", "$\\{-4\\}$"],
        correctLetter: "A",
        rationales: {
          B: "This treats $x^2+4=0$ as if $x^2=4$. Actually it gives $x^2=-4$.",
          C: "The numbers $-2$ and 2 solve $x^2-4=0$, not $x^2+4=0$.",
          D: "This substitutes the right-side value as an element, but $(-4)^2+4\\ne0$.",
        },
        hints: ["Move 4 to the other side.", "Can a real square be negative?", "No real number has square $-4$."],
        solution: [{ step: 1, explanation: "The equation gives $x^2=-4$, which has no real solution.", math: "\\{x\\in\\mathbb R:x^2+4=0\\}=\\varnothing" }],
      },
      {
        questionLatex: "\\text{Assertion (A): A set with }4\\text{ elements has }16\\text{ subsets. Reason (R): While forming a subset, each element has two independent choices: in or out. Choose the correct option.}",
        difficulty: 3,
        skillTags: ["sets", "subsets", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not just true; it explains why the count is a power of 2.",
          C: "The reason is true because each element can either be included or excluded.",
          D: "The assertion is true: $2^4=16$ subsets are possible.",
        },
        hints: ["Decide whether the assertion is true.", "Decide whether the reason is true.", "Check whether the reason explains the formula $2^n$."],
        solution: [{ step: 1, explanation: "For each of the 4 elements, there are two choices: include it or leave it out. Hence the number of subsets is $2^4=16$, so the reason correctly explains the assertion.", math: "2^4=16" }],
      },
      {
        questionLatex: "\\text{The shaded part of the number line represents a set of real numbers. Which interval notation represents it?}",
        difficulty: 3,
        skillTags: ["sets", "interval_notation"],
        figure: intervalFigure,
        choices: ["$[-2,3)$", "$(-2,3]$", "$[-2,3]$", "$(-2,3)$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses the endpoint types. The dot at $-2$ is closed and the dot at 3 is open.",
          C: "This includes 3, but the open circle at 3 means 3 is excluded.",
          D: "This excludes both endpoints, but $-2$ is included by the closed dot.",
        },
        hints: ["A closed dot means the endpoint is included.", "An open dot means the endpoint is excluded.", "Write left endpoint first."],
        solution: [{ step: 1, explanation: "The shaded interval includes $-2$ and excludes 3.", math: "[-2,3)" }],
      },
      {
        questionLatex: "\\text{Which of the following represents the set }\\{1,2,3\\}\\text{?}",
        difficulty: 4,
        skillTags: ["sets", "equal_sets"],
        choices: ["$\\{x\\in\\mathbb N:x\\mid 6\\text{ and }x<4\\}$", "$\\{1,1,2,4\\}$", "$\\{0,1,2,3\\}$", "$\\{x\\in\\mathbb N:x<3\\}$"],
        correctLetter: "A",
        rationales: {
          B: "After removing repetition this set is $\\{1,2,4\\}$, so 3 is missing and 4 is extra.",
          C: "This set has the extra element 0, so it is not equal to $\\{1,2,3\\}$.",
          D: "This set is $\\{1,2\\}$ under the usual natural-number convention, so 3 is missing.",
        },
        hints: ["Equal sets have exactly the same elements.", "List the positive divisors of 6 that are less than 4.", "They are 1, 2, and 3."],
        solution: [{ step: 1, explanation: "The natural divisors of 6 less than 4 are exactly 1, 2, and 3.", math: "\\{x\\in\\mathbb N:x\\mid 6\\text{ and }x<4\\}=\\{1,2,3\\}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{A school store uses pack sizes that divide }18\\text{ and are less than }10.\\text{ Let }A\\text{ be the set of possible pack sizes.}",
        difficulty: 2,
        skillTags: ["sets", "roster_form"],
        parts: singlePart("a", "Write the possible pack-size set $A$ in roster form.", 2),
        hints: ["List the positive divisors of 18.", "Keep only those less than 10.", "Use set braces."],
        rubric: singleRubric("a", 2, "Writes $A=\\{1,2,3,6,9\\}$."),
        commonErrors: ["Including 18 even though the condition says $x<10$."],
        workedSolution: [{ part: "a", explanation: "The divisors of 18 less than 10 are $1,2,3,6,9$, so $A=\\{1,2,3,6,9\\}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }B=\\{x\\in\\mathbb R:0<x<1\\}.",
        difficulty: 2,
        skillTags: ["sets", "finite_infinite_sets"],
        parts: singlePart("a", "Decide whether the accepted-reading set $B$ is finite or infinite.", 1),
        hints: ["Think of real numbers between 0 and 1.", "There are decimal values such as $0.1,0.11,0.111$.", "A real interval contains infinitely many elements."],
        rubric: singleRubric("a", 1, "States that $B$ is infinite."),
        commonErrors: ["Thinking only of whole numbers between 0 and 1."],
        workedSolution: [{ part: "a", explanation: "There are infinitely many real numbers between 0 and 1, so $B$ is infinite." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{A learner may subscribe to any collection of three newsletters }p,q,r.",
        difficulty: 3,
        skillTags: ["sets", "subsets"],
        parts: [
          { letter: "a", promptMarkdown: "Find the number of possible subscription sets.", points: 1 },
          { letter: "b", promptMarkdown: "Find the number of possible subscription sets that do not include all three newsletters.", points: 1 },
        ],
        hints: ["Use $2^n$ for all subsets.", "Here $n=3$.", "Proper subsets exclude the whole set."],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds 8 subsets." },
            { part: "b", points: 1, description: "Finds 7 proper subsets." },
          ],
        },
        commonErrors: ["Forgetting that the empty set is a subset.", "Forgetting to exclude the set itself for proper subsets."],
        workedSolution: [
          { part: "a", explanation: "Since $C$ has 3 elements, the number of subsets is $2^3=8$." },
          { part: "b", explanation: "Proper subsets are all subsets except $C$ itself, so the number is $8-1=7$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{Let }D=\\{x\\in\\mathbb R:-3\\le x<2\\}.",
        difficulty: 4,
        skillTags: ["sets", "interval_notation"],
        parts: [
          { letter: "a", promptMarkdown: "Write the accepted set $D$ in interval notation.", points: 1 },
          { letter: "b", promptMarkdown: "Decide whether $-3$, $2$, and $0$ belong to $D$.", points: 3 },
        ],
        hints: ["The symbol $\\le$ includes the endpoint.", "The symbol $<$ excludes the endpoint.", "Check each number against both inequalities."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $[-3,2)$." },
            { part: "b", points: 3, description: "Correctly states $-3\\in D$, $2\\notin D$, and $0\\in D$." },
          ],
        },
        commonErrors: ["Using a closed bracket at 2.", "Testing only one side of the double inequality."],
        workedSolution: [
          { part: "a", explanation: "The left endpoint is included and the right endpoint is excluded, so $D=[-3,2)$." },
          { part: "b", explanation: "$-3$ satisfies $-3\\le x<2$, so $-3\\in D$. The number 2 does not satisfy $x<2$, so $2\\notin D$. Also $0$ lies between $-3$ and 2, so $0\\in D$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Let }E=\\{x\\in\\mathbb Z:-2<x\\le3\\}.",
        difficulty: 4,
        skillTags: ["sets", "integer_sets", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write $E$ in roster form.", points: 1 },
          { letter: "b", promptMarkdown: "Find $n(E)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the number of non-empty subsets of $E$.", points: 1 },
          { letter: "d", promptMarkdown: "A student writes $E=(-2,3]$. Decide whether this is correct, and give one reason.", points: 1 },
        ],
        hints: ["Use integers only.", "List values greater than $-2$ and at most 3.", "Non-empty subsets exclude the empty set."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\{-1,0,1,2,3\\}$." },
            { part: "b", points: 1, description: "Finds $n(E)=5$." },
            { part: "c", points: 1, description: "Finds 31 non-empty subsets." },
            { part: "d", points: 1, description: "Rejects the interval claim because $E$ contains integers only, not all real numbers in the interval." },
          ],
        },
        commonErrors: ["Including $-2$ despite the strict inequality.", "Counting the empty set when non-empty subsets are requested.", "Treating the set as a real interval instead of an integer set."],
        workedSolution: [
          { part: "a", explanation: "The integers satisfying $-2<x\\le3$ are $-1,0,1,2,3$, so $E=\\{-1,0,1,2,3\\}$." },
          { part: "b", explanation: "There are 5 elements, hence $n(E)=5$." },
          { part: "c", explanation: "There are $2^5=32$ subsets in all. Excluding the empty subset gives $32-1=31$ non-empty bundles." },
          { part: "d", explanation: "The claim is not correct. The interval $(-2,3]$ contains all real numbers between $-2$ and $3$, but $E$ contains only the integer levels in that range." },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Set Operations, Complements, and Venn Diagrams",
    subtopic: "Union, intersection, difference, complement, and complement properties",
    mc: [
      {
        questionLatex: "\\text{Let }A=\\{1,2,3,5\\}\\text{ and }B=\\{2,4,5\\}.\\text{ Which set gives all elements that are in }A\\text{ or }B\\text{ or both?}",
        difficulty: 2,
        skillTags: ["set_operations", "union"],
        choices: ["$\\{1,2,3,4,5\\}$", "$\\{2,5\\}$", "$\\{1,3\\}$", "$\\{4\\}$"],
        correctLetter: "A",
        rationales: {
          B: "This is $A\\cap B$, the common elements, not the union.",
          C: "This is $A-B$, not the union.",
          D: "This is $B-A$, not the union.",
        },
        hints: ["Union means elements in $A$ or in $B$ or in both.", "List every distinct element once.", "Do not repeat 2 or 5."],
        solution: [{ step: 1, explanation: "The union contains all elements appearing in either set.", math: "A\\cup B=\\{1,2,3,4,5\\}" }],
      },
      {
        questionLatex: "\\text{Let }A=\\{a,b,c,d\\}\\text{ and }B=\\{b,d,e\\}.\\text{ Which set contains exactly the elements common to both sets?}",
        difficulty: 2,
        skillTags: ["set_operations", "intersection"],
        choices: ["$\\{b,d\\}$", "$\\{a,c,e\\}$", "$\\{a,b,c,d,e\\}$", "$\\{e\\}$"],
        correctLetter: "A",
        rationales: {
          B: "This lists elements not common to both sets. Intersection keeps only shared elements.",
          C: "This is the union, not the intersection.",
          D: "The element $e$ is in $B$ only, so it cannot be in $A\\cap B$.",
        },
        hints: ["Intersection means common elements.", "Check each element of $A$ against $B$.", "Only $b$ and $d$ appear in both."],
        solution: [{ step: 1, explanation: "The common elements of $A$ and $B$ are $b$ and $d$.", math: "A\\cap B=\\{b,d\\}" }],
      },
      {
        questionLatex: "\\text{Let }U=\\{1,2,3,4,5,6,7,8\\}\\text{ and }A=\\{1,3,5\\}.\\text{ Which set is }A'\\text{ relative to }U\\text{?}",
        difficulty: 3,
        skillTags: ["set_operations", "complement"],
        choices: ["$\\{2,4,6,7,8\\}$", "$\\{1,3,5\\}$", "$\\{2,4,6\\}$", "$\\varnothing$"],
        correctLetter: "A",
        rationales: {
          B: "This copies $A$. The complement means elements of the universal set outside $A$.",
          C: "This omits 7 and 8, which are also in $U$ but not in $A$.",
          D: "The complement is not empty because several elements of $U$ are outside $A$.",
        },
        hints: ["Complement is always taken relative to $U$.", "Remove the elements of $A$ from $U$.", "Keep all remaining elements."],
        solution: [{ step: 1, explanation: "Removing $1,3,5$ from $U$ leaves $2,4,6,7,8$.", math: "A'=\\{2,4,6,7,8\\}" }],
      },
      {
        questionLatex: "\\text{The Venn diagram shows a finite universal set }U\\text{ with subsets }A\\text{ and }B.\\text{ How many elements lie in }A\\cup B?",
        difficulty: 3,
        skillTags: ["set_operations", "venn_diagram"],
        figure: vennFigure,
        choices: ["$35$", "$40$", "$23$", "$20$"],
        correctLetter: "A",
        rationales: {
          B: "This includes the 5 elements outside both sets. They are in $U$ but not in $A\\cup B$.",
          C: "This omits the $A$-only region. Union includes all regions inside either circle.",
          D: "This counts only the intersection and one adjacent region, not the whole union.",
        },
        hints: ["Union includes every region inside $A$ or $B$.", "Add $A$ only, overlap, and $B$ only.", "Do not include the region outside both circles."],
        solution: [{ step: 1, explanation: "The union contains the three circle regions: 12, 8, and 15.", math: "n(A\\cup B)=12+8+15=35" }],
      },
      {
        questionLatex: "\\text{Assertion (A): For any subset }A\\text{ of }U,\\ A\\cup A'=U.\\text{ Reason (R): Every element of }U\\text{ is either in }A\\text{ or outside }A.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["set_operations", "properties_of_complement", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why the union with the complement fills the universal set.",
          C: "The reason is true: outside $A$ means belonging to $A'$.",
          D: "The assertion is true because $A$ and $A'$ together exhaust $U$.",
        },
        hints: ["Test the assertion using the meaning of complement.", "Test whether the reason states the same partition of $U$.", "Check whether the reason explains the union identity."],
        solution: [{ step: 1, explanation: "The complement $A'$ contains precisely the elements of $U$ that are not in $A$. Therefore every element of $U$ lies in $A\\cup A'$, so the reason correctly explains the assertion.", math: "A\\cup A'=U" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }A=\\{2,4,6,8\\}\\text{ and }B=\\{1,2,3,4\\}.",
        difficulty: 2,
        skillTags: ["set_operations"],
        parts: singlePart("a", "Find $A-B$.", 1),
        hints: ["Keep elements of $A$ only.", "Remove elements that also appear in $B$.", "Only 6 and 8 remain."],
        rubric: singleRubric("a", 1, "Finds $\\{6,8\\}$."),
        commonErrors: ["Finding $B-A$ instead of $A-B$."],
        workedSolution: [{ part: "a", explanation: "$A-B$ contains elements in $A$ that are not in $B$, so $A-B=\\{6,8\\}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }U=\\{x\\in\\mathbb N:x\\le 10\\}\\text{ and }P=\\{2,4,6,8,10\\}.",
        difficulty: 2,
        skillTags: ["set_operations", "complement"],
        parts: singlePart("a", "Find $P'$ relative to $U$.", 2),
        hints: ["Write $U=\\{1,2,\\ldots,10\\}$.", "Remove the even numbers listed in $P$.", "The complement contains the remaining natural numbers up to 10."],
        rubric: singleRubric("a", 2, "Finds $P'=\\{1,3,5,7,9\\}$."),
        commonErrors: ["Forgetting that complement depends on the universal set."],
        workedSolution: [{ part: "a", explanation: "The elements of $U$ not in $P$ are $1,3,5,7,9$, so $P'=\\{1,3,5,7,9\\}$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{Let }U=\\{1,2,3,4,5,6,7,8,9\\},\\ A=\\{1,3,5,7,9\\}\\text{ and }B=\\{2,3,5,8\\}.",
        difficulty: 3,
        skillTags: ["set_operations", "complement"],
        parts: [
          { letter: "a", promptMarkdown: "Find $A\\cap B$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $(A\\cup B)'$ relative to $U$.", points: 2 },
        ],
        hints: ["Find common elements for part (a).", "First form $A\\cup B$ for part (b).", "Then remove the union from $U$."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\{3,5\\}$." },
            { part: "b", points: 2, description: "Finds $\\{4,6\\}$." },
          ],
        },
        commonErrors: ["Taking complement before forming the union.", "Confusing intersection with union."],
        workedSolution: [
          { part: "a", explanation: "The common elements are $3$ and $5$, so $A\\cap B=\\{3,5\\}$." },
          { part: "b", explanation: "$A\\cup B=\\{1,2,3,5,7,8,9\\}$. The elements of $U$ outside this union are $4$ and $6$, so $(A\\cup B)'=\\{4,6\\}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{For finite sets }A\\text{ and }B,\\ n(A)=18,\\ n(B)=15,\\text{ and }n(A\\cap B)=7.",
        difficulty: 4,
        skillTags: ["set_operations", "venn_diagram", "cardinality"],
        parts: [
          { letter: "a", promptMarkdown: "Find $n(A\\cup B)$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $n(A-B)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $n(B-A)$.", points: 1 },
        ],
        hints: ["Use inclusion-exclusion for the union.", "Subtract the overlap from $A$.", "Subtract the overlap from $B$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds 26." },
            { part: "b", points: 1, description: "Finds 11." },
            { part: "c", points: 1, description: "Finds 8." },
          ],
        },
        commonErrors: ["Adding $n(A)+n(B)$ without subtracting the overlap.", "Using the union count for differences."],
        workedSolution: [
          { part: "a", explanation: "$n(A\\cup B)=n(A)+n(B)-n(A\\cap B)=18+15-7=26$." },
          { part: "b", explanation: "$n(A-B)=18-7=11$." },
          { part: "c", explanation: "$n(B-A)=15-7=8$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Use the shown Venn diagram for finite sets }A\\text{ and }B.",
        difficulty: 4,
        skillTags: ["set_operations", "venn_diagram", "case_based"],
        figure: vennFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find $n(A\\cap B)$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $n(A')$ relative to $U$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $n((A\\cup B)')$.", points: 1 },
          { letter: "d", promptMarkdown: "A learner claims $n(A')=n(B)$. Decide whether the claim is correct, and justify.", points: 1 },
        ],
        hints: ["Read the overlap for part (a).", "$A'$ means everything outside circle $A$.", "Compare $n(A')$ with all regions inside circle $B$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds 8." },
            { part: "b", points: 1, description: "Finds 20." },
            { part: "c", points: 1, description: "Finds 5." },
            { part: "d", points: 1, description: "Rejects the claim because $n(A')=20$ while $n(B)=23$." },
          ],
        },
        commonErrors: ["Including the overlap twice.", "Taking complement relative to a circle instead of the universal set."],
        workedSolution: [
          { part: "a", explanation: "The overlap is labelled 8, so $n(A\\cap B)=8$." },
          { part: "b", explanation: "Outside $A$ are the $B$-only region and outside-both region, so $n(A')=15+5=20$." },
          { part: "c", explanation: "Outside the union is the region outside both circles, so $n((A\\cup B)')=5$." },
          { part: "d", explanation: "The claim is not correct. The diagram gives $n(A')=15+5=20$, while $n(B)=8+15=23$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Cartesian Products and Relations",
    subtopic: "Ordered pairs, Cartesian products, relation diagrams, domain, codomain, and range",
    mc: [
      {
        questionLatex: "\\text{Assertion (A): If }A=\\{1,2\\}\\text{ and }B=\\{a,b,c\\},\\text{ then }n(A\\times B)=6.\\text{ Reason (R): Each ordered pair in }A\\times B\\text{ is formed by choosing one element from }A\\text{ and one from }B.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["relations", "cartesian_product", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the product rule for the number of ordered pairs.",
          C: "The reason is true: each pair uses one first component and one second component.",
          D: "The assertion is true because $2\\times3=6$.",
        },
        hints: ["Check the assertion using the product rule.", "Check the reason against the definition of Cartesian product.", "Decide whether the reason explains the multiplication."],
        solution: [{ step: 1, explanation: "There are 2 choices for the first component and 3 choices for the second component, so the reason correctly explains why $n(A\\times B)=6$.", math: "n(A\\times B)=2\\cdot3=6" }],
      },
      {
        questionLatex: "\\text{If the ordered pairs }(x+1,3)\\text{ and }(4,y-2)\\text{ are equal, what is }(x,y)\\text{?}",
        difficulty: 2,
        skillTags: ["relations", "ordered_pairs"],
        choices: ["$(3,5)$", "$(5,3)$", "$(4,3)$", "$(2,6)$"],
        correctLetter: "A",
        rationales: {
          B: "This swaps the coordinates. Ordered pair equality compares first with first and second with second.",
          C: "This copies the first coordinate 4 as $x$ instead of solving $x+1=4$.",
          D: "This does not satisfy either coordinate equation.",
        },
        hints: ["Equal ordered pairs have equal corresponding components.", "Set $x+1=4$.", "Set $3=y-2$."],
        solution: [{ step: 1, explanation: "Equating corresponding coordinates gives $x+1=4$ and $3=y-2$.", math: "x=3,\\ y=5" }],
      },
      {
        questionLatex: "\\text{For }R=\\{(1,2),(2,3),(3,2),(4,5)\\},\\text{ a learner claims the domain is }\\{2,3,5\\}.\\text{ Which response is correct?}",
        difficulty: 3,
        skillTags: ["relations", "domain_range"],
        choices: [
          "$\\{1,2,3,4\\}$; the claim lists second components, not first components.",
          "$\\{2,3,5\\}$; the domain is the set of second components.",
          "$\\{1,2,3,4,5\\}$; the domain combines both components.",
          "$R$ itself; the domain is the full relation.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The set of second components is the range, not the domain.",
          C: "Combining all components does not follow the definition of domain.",
          D: "The relation is a set of ordered pairs; its domain is extracted from the first components.",
        },
        hints: ["The domain is the set of first components.", "Read the first entry of every ordered pair.", "Do not repeat elements."],
        solution: [{ step: 1, explanation: "The first components are 1, 2, 3, and 4.", math: "\\operatorname{Dom}(R)=\\{1,2,3,4\\}" }],
      },
      {
        questionLatex: "\\text{In the arrow diagram, which set gives the actual targets reached by the arrows?}",
        difficulty: 3,
        skillTags: ["relations", "arrow_diagram", "domain_range"],
        figure: relationFigure,
        choices: ["$\\{a,b,c\\}$", "$\\{1,2,3\\}$", "$\\{a,c\\}$", "$\\{b\\}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the domain set $A$, not the range in $B$.",
          C: "This omits $b$, which receives an arrow from 3.",
          D: "This includes only one image and misses the arrows landing at $a$ and $c$.",
        },
        hints: ["Range means elements in $B$ that receive arrows.", "Read the arrow endpoints.", "All three listed elements in $B$ receive an arrow."],
        solution: [{ step: 1, explanation: "The arrows land at $a$, $c$, and $b$.", math: "\\operatorname{Range}=\\{a,b,c\\}" }],
      },
      {
        questionLatex: "\\text{A tournament records ordered pairs }(x,y)\\text{ from }A=\\{1,2,3\\}\\text{ only when player }x\\text{ has a lower rank number than player }y.\\text{ Which relation is recorded?}",
        difficulty: 4,
        skillTags: ["relations", "set_builder"],
        choices: ["$\\{(1,2),(1,3),(2,3)\\}$", "$\\{(2,1),(3,1),(3,2)\\}$", "$\\{(1,1),(2,2),(3,3)\\}$", "$A\\times A$"],
        correctLetter: "A",
        rationales: {
          B: "These pairs satisfy $x>y$, the reverse inequality.",
          C: "These pairs satisfy $x=y$, not $x<y$.",
          D: "The whole Cartesian product includes pairs that do not satisfy $x<y$.",
        },
        hints: ["List ordered pairs from $A\\times A$.", "Keep only pairs where first component is smaller.", "Check each pair in order."],
        solution: [{ step: 1, explanation: "The ordered pairs from $A$ with first component less than the second are $(1,2),(1,3),(2,3)$.", math: "R=\\{(1,2),(1,3),(2,3)\\}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }A=\\{0,1\\}\\text{ and }B=\\{p,q\\}.",
        difficulty: 2,
        skillTags: ["relations", "cartesian_product"],
        parts: singlePart("a", "Write all ordered pairs in $A\\times B$.", 2),
        hints: ["Pair each element of $A$ with each element of $B$.", "Order matters: first component comes from $A$.", "There should be 4 ordered pairs."],
        rubric: singleRubric("a", 2, "Writes $\\{(0,p),(0,q),(1,p),(1,q)\\}$."),
        commonErrors: ["Writing unordered pairs or reversing the order."],
        workedSolution: [{ part: "a", explanation: "$A\\times B=\\{(0,p),(0,q),(1,p),(1,q)\\}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{A timetable generator pairs each of }5\\text{ teachers in }P\\text{ with each of }7\\text{ rooms in }Q.",
        difficulty: 2,
        skillTags: ["relations", "cartesian_product"],
        parts: singlePart("a", "Find the number of possible ordered teacher-room pairs.", 1),
        hints: ["Use the product rule for Cartesian products.", "Multiply the number of choices for the first and second component.", "Compute $5\\times7$."],
        rubric: singleRubric("a", 1, "Finds 35."),
        commonErrors: ["Adding 5 and 7 instead of multiplying."],
        workedSolution: [{ part: "a", explanation: "$n(P\\times Q)=n(P)n(Q)=5\\times7=35$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{For the relation }R=\\{(2,5),(3,5),(4,6),(2,7)\\},",
        difficulty: 3,
        skillTags: ["relations", "domain_range"],
        parts: [
          { letter: "a", promptMarkdown: "Find the domain of $R$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the range of $R$.", points: 1 },
        ],
        hints: ["Domain uses first components.", "Range uses second components.", "Do not repeat an element."],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\{2,3,4\\}$." },
            { part: "b", points: 1, description: "Finds $\\{5,6,7\\}$." },
          ],
        },
        commonErrors: ["Repeating 2 or 5 in the answer.", "Interchanging domain and range."],
        workedSolution: [
          { part: "a", explanation: "The first components are $2,3,4,2$, so the domain is $\\{2,3,4\\}$." },
          { part: "b", explanation: "The second components are $5,5,6,7$, so the range is $\\{5,6,7\\}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{A puzzle pairs two numbers from }A=\\{1,2,3,4\\}\\text{ when their ordered sum is }5.\\text{ Define }R=\\{(x,y):x,y\\in A\\text{ and }x+y=5\\}.",
        difficulty: 4,
        skillTags: ["relations", "set_builder", "domain_range"],
        parts: [
          { letter: "a", promptMarkdown: "Write all ordered pairs recorded by the puzzle.", points: 2 },
          { letter: "b", promptMarkdown: "Find the set of possible first numbers.", points: 1 },
          { letter: "c", promptMarkdown: "Find the set of possible second numbers.", points: 1 },
        ],
        hints: ["List pairs from $A\\times A$ whose sum is 5.", "Use first components for domain.", "Use second components for range."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Writes $\\{(1,4),(2,3),(3,2),(4,1)\\}$." },
            { part: "b", points: 1, description: "Finds domain $\\{1,2,3,4\\}$." },
            { part: "c", points: 1, description: "Finds range $\\{1,2,3,4\\}$." },
          ],
        },
        commonErrors: ["Listing unordered pairs only.", "Missing the reversed ordered pairs."],
        workedSolution: [
          { part: "a", explanation: "The pairs in $A\\times A$ with sum 5 are $(1,4),(2,3),(3,2),(4,1)$." },
          { part: "b", explanation: "The first components are $1,2,3,4$, so the domain is $\\{1,2,3,4\\}$." },
          { part: "c", explanation: "The second components are $4,3,2,1$, so the range is $\\{1,2,3,4\\}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Use the arrow diagram for a relation from }A\\text{ to }B.",
        difficulty: 4,
        skillTags: ["relations", "arrow_diagram", "case_based"],
        figure: relationFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the assignment relation as a set of ordered pairs.", points: 1 },
          { letter: "b", promptMarkdown: "Find the domain.", points: 1 },
          { letter: "c", promptMarkdown: "Find the range.", points: 1 },
          { letter: "d", promptMarkdown: "Decide whether the assignment is a function from $A$ to $B$, and justify.", points: 1 },
        ],
        hints: ["Each arrow gives one ordered pair.", "The start of each arrow is the first component.", "A function needs exactly one image for each element of $A$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\{(1,a),(2,c),(3,b)\\}$." },
            { part: "b", points: 1, description: "Finds $\\{1,2,3\\}$." },
            { part: "c", points: 1, description: "Finds $\\{a,b,c\\}$." },
            { part: "d", points: 1, description: "States that it is a function because every element of $A$ has exactly one image in $B$." },
          ],
        },
        commonErrors: ["Writing images before preimages in ordered pairs.", "Calling the whole codomain the range without checking arrows.", "Thinking different inputs cannot have different targets in a function."],
        workedSolution: [
          { part: "a", explanation: "The arrows show $(1,a)$, $(2,c)$, and $(3,b)$." },
          { part: "b", explanation: "The domain is the set of first components: $\\{1,2,3\\}$." },
          { part: "c", explanation: "The range is the set of landing points: $\\{a,b,c\\}$." },
          { part: "d", explanation: "It is a function from $A$ to $B$ because every element of $A$ has exactly one outgoing arrow to an element of $B$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Functions, Domains, Ranges, and Algebra",
    subtopic: "Function as a special relation, domain, codomain, range, and sum/product/quotient of functions",
    mc: [
      {
        questionLatex: "\\text{Assertion (A): The relation }\\{(1,a),(1,b),(2,c)\\}\\text{ is not a function from }\\{1,2\\}\\text{ to }\\{a,b,c\\}.\\text{ Reason (R): A function cannot assign two different images to the same input. Choose the correct option.}",
        difficulty: 3,
        skillTags: ["functions", "function_definition", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why this relation fails the function test.",
          C: "The reason is true: a single input cannot have two images in a function.",
          D: "The assertion is true because input 1 is paired with both $a$ and $b$.",
        },
        hints: ["Check whether the assertion is true.", "Check the definition of a function.", "Use input 1 to connect the reason with the assertion."],
        solution: [{ step: 1, explanation: "Input 1 is paired with both $a$ and $b$. Since a function cannot give one input two different images, the reason correctly explains the assertion.", math: "1\\mapsto a\\text{ and }1\\mapsto b" }],
      },
      {
        questionLatex: "\\text{If }f(x)=2x-3,\\text{ then }f(4)\\text{ is}",
        difficulty: 2,
        skillTags: ["functions", "function_value"],
        choices: ["$5$", "$8$", "$-5$", "$11$"],
        correctLetter: "A",
        rationales: {
          B: "This uses only $2x$ and forgets the $-3$.",
          C: "This substitutes incorrectly or reverses the sign after evaluating.",
          D: "This adds 3 instead of subtracting 3.",
        },
        hints: ["Substitute $x=4$.", "Compute $2(4)-3$.", "Finish the arithmetic."],
        solution: [{ step: 1, explanation: "Substitute 4 into the function rule.", math: "f(4)=2(4)-3=5" }],
      },
      {
        questionLatex: "\\text{For the real-valued function }f(x)=\\frac{1}{x-2},\\text{ which set is the domain?}",
        difficulty: 3,
        skillTags: ["functions", "domain"],
        choices: ["$\\mathbb R-\\{2\\}$", "$\\mathbb R-\\{-2\\}$", "$(2,\\infty)$", "$\\mathbb R$"],
        correctLetter: "A",
        rationales: {
          B: "The denominator becomes zero at $x=2$, not at $x=-2$.",
          C: "Values less than 2 are also allowed except the single excluded value $2$.",
          D: "The function is undefined at $x=2$, so the domain cannot be all real numbers.",
        },
        hints: ["A rational function is undefined when its denominator is zero.", "Set $x-2=0$.", "Exclude only that value."],
        solution: [{ step: 1, explanation: "The denominator cannot be zero, so $x\\ne2$.", math: "\\operatorname{Dom}(f)=\\mathbb R-\\{2\\}" }],
      },
      {
        questionLatex: "\\text{For }f:\\mathbb R\\to\\mathbb R\\text{ defined by }f(x)=x^2,\\text{ which set is the range of }f?",
        difficulty: 3,
        skillTags: ["functions", "range"],
        choices: ["$[0,\\infty)$", "$\\mathbb R$", "$(-\\infty,0]$", "$(0,\\infty)$"],
        correctLetter: "A",
        rationales: {
          B: "Squares of real numbers are never negative, so not every real number is attained.",
          C: "This reverses the sign of the range. The square is non-negative.",
          D: "This excludes 0, but $f(0)=0$.",
        },
        hints: ["A square is always non-negative.", "Check whether 0 is possible.", "Every non-negative value has a real square root."],
        solution: [{ step: 1, explanation: "$x^2\\ge0$ for all real $x$, and every non-negative value occurs.", math: "\\operatorname{Range}(f)=[0,\\infty)" }],
      },
      {
        questionLatex: "\\text{Let }f(x)=x^2\\text{ and }g(x)=2x+1.\\text{ A student claims }(f+g)(-1)=2.\\text{ Which correction is valid?}",
        difficulty: 3,
        skillTags: ["functions", "algebra_of_functions"],
        choices: [
          "$0$; because $(f+g)(-1)=f(-1)+g(-1)$.",
          "$2$; because $f$ and $g$ should be added before substituting.",
          "$-2$; because $g(-1)$ alone gives the combined score.",
          "$4$; because the expression should be squared after adding.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Adding before substituting still gives $(-1)^2+2(-1)+1=0$, not 2.",
          C: "This uses only the bonus function value and ignores $f(-1)$.",
          D: "There is no instruction to square the final sum.",
        },
        hints: ["Use $(f+g)(x)=f(x)+g(x)$.", "Evaluate $f(-1)$ and $g(-1)$ separately, or form the sum rule first.", "Check the arithmetic at $x=-1$."],
        solution: [{ step: 1, explanation: "The combined value is the sum of the two function values at the same input.", math: "(f+g)(-1)=(-1)^2+2(-1)+1=0" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }f(x)=3x+2.",
        difficulty: 2,
        skillTags: ["functions", "function_value"],
        parts: singlePart("a", "Find the balance change when $x=-1$.", 1),
        hints: ["Substitute $x=-1$.", "Compute $3(-1)+2$.", "Watch the sign."],
        rubric: singleRubric("a", 1, "Finds $-1$."),
        commonErrors: ["Losing the negative sign in $3(-1)$."],
        workedSolution: [{ part: "a", explanation: "$f(-1)=3(-1)+2=-3+2=-1$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }f(x)=\\frac{x+1}{x+4}\\text{ be a real-valued function.}",
        difficulty: 2,
        skillTags: ["functions", "domain"],
        parts: singlePart("a", "Find the input value that must be excluded, and hence state the real domain.", 2),
        hints: ["The denominator cannot be zero.", "Solve $x+4=0$.", "Exclude that value from $\\mathbb R$."],
        rubric: singleRubric("a", 2, "Finds $\\mathbb R-\\{-4\\}$."),
        commonErrors: ["Excluding $1$ because of the numerator instead of checking the denominator."],
        workedSolution: [{ part: "a", explanation: "The denominator is zero when $x=-4$, so the domain is $\\mathbb R-\\{-4\\}$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{Let }f=\\{(1,4),(2,5),(3,6)\\}\\text{ be a relation from }A=\\{1,2,3\\}\\text{ to }B=\\{4,5,6,7\\}.",
        difficulty: 3,
        skillTags: ["functions", "domain_range"],
        parts: [
          { letter: "a", promptMarkdown: "Explain whether the assignment is a function from $A$ to $B$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the range of $f$.", points: 1 },
        ],
        hints: ["Check whether every element of $A$ has exactly one image.", "Read the second components.", "The codomain may contain unused elements."],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "States it is a function with a valid reason." },
            { part: "b", points: 1, description: "Finds $\\{4,5,6\\}$." },
          ],
        },
        commonErrors: ["Confusing codomain with range.", "Thinking 7 must be an image for the relation to be a function."],
        workedSolution: [
          { part: "a", explanation: "Each element of $A$ appears exactly once as a first component, so $f$ is a function from $A$ to $B$." },
          { part: "b", explanation: "The images are $4,5,6$, so the range is $\\{4,5,6\\}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{Let }f(x)=x^2+1\\text{ and }g(x)=x-2.",
        difficulty: 4,
        skillTags: ["functions", "algebra_of_functions"],
        parts: [
          { letter: "a", promptMarkdown: "Find $(f-g)(x)$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $(fg)(x)$.", points: 2 },
          { letter: "c", promptMarkdown: "Find $\\left(\\frac{f}{g}\\right)(x)$ and state the restriction on $x$.", points: 2 },
        ],
        hints: ["Use the definitions of difference, product, and quotient.", "For a quotient, the denominator cannot be zero.", "Solve $x-2=0$ for the restriction."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $x^2-x+3$." },
            { part: "b", points: 2, description: "Finds $x^3-2x^2+x-2$." },
            { part: "c", points: 2, description: "Finds $(x^2+1)/(x-2)$ with $x\\ne2$." },
          ],
        },
        commonErrors: ["Forgetting the restriction in the quotient.", "Not distributing correctly in the product."],
        workedSolution: [
          { part: "a", explanation: "$(f-g)(x)=x^2+1-(x-2)=x^2-x+3$." },
          { part: "b", explanation: "$(fg)(x)=(x^2+1)(x-2)=x^3-2x^2+x-2$." },
          { part: "c", explanation: "$\\left(\\frac fg\\right)(x)=\\frac{x^2+1}{x-2}$, and $x\\ne2$ because the denominator cannot be zero." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Let }h:\\{-2,-1,0,1,2\\}\\to\\mathbb R\\text{ be defined by }h(x)=x^2-1.",
        difficulty: 4,
        skillTags: ["functions", "range", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find $h(-2)$ and $h(0)$.", points: 1 },
          { letter: "b", promptMarkdown: "Write the range of $h$.", points: 2 },
          { letter: "c", promptMarkdown: "Decide whether the range is equal to the codomain $\\mathbb R$, and justify.", points: 1 },
        ],
        hints: ["Substitute each domain value.", "Collect distinct output values.", "Compare the finite range with the codomain $\\mathbb R$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $h(-2)=3$ and $h(0)=-1$." },
            { part: "b", points: 2, description: "Finds range $\\{-1,0,3\\}$." },
            { part: "c", points: 1, description: "States that the range is not equal to the codomain $\\mathbb R$." },
          ],
        },
        commonErrors: ["Listing repeated output values in the range.", "Confusing the range actually produced with the stated codomain."],
        workedSolution: [
          { part: "a", explanation: "$h(-2)=4-1=3$ and $h(0)=0-1=-1$." },
          { part: "b", explanation: "The outputs for $-2,-1,0,1,2$ are $3,0,-1,0,3$. Thus the range is $\\{-1,0,3\\}$." },
          { part: "c", explanation: "The range is not equal to the codomain $\\mathbb R$ because the range is the finite set $\\{-1,0,3\\}$, while the codomain contains all real numbers." },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Real-Valued Functions and Graphs",
    subtopic: "Constant, identity, polynomial, rational, modulus, signum, exponential, logarithmic, and greatest integer functions",
    mc: [
      {
        questionLatex: "\\text{Which rule is represented by the shown V-shaped graph with vertex at the origin?}",
        difficulty: 2,
        skillTags: ["real_valued_functions", "modulus_function", "graphs"],
        figure: modulusFigure,
        choices: ["$y=|x|$", "$y=x$", "$y=-x$", "$y=x^2-1$"],
        correctLetter: "A",
        rationales: {
          B: "The identity function is a single straight line, not a V-shaped graph.",
          C: "The graph $y=-x$ is also a single straight line.",
          D: "A quadratic graph is a parabola, not a sharp V with vertex at the origin.",
        },
        hints: ["The graph is V-shaped.", "Its vertex is at the origin.", "It reflects negative inputs to positive outputs."],
        solution: [{ step: 1, explanation: "The modulus function has a V-shaped graph with vertex at the origin.", math: "y=|x|" }],
      },
      {
        questionLatex: "\\text{If }\\operatorname{sgn}(x)\\text{ denotes the signum function, then }\\operatorname{sgn}(-7)\\text{ equals}",
        difficulty: 2,
        skillTags: ["real_valued_functions", "signum_function"],
        choices: ["$-1$", "$0$", "$1$", "$7$"],
        correctLetter: "A",
        rationales: {
          B: "The signum function is 0 only at input 0.",
          C: "Positive inputs have signum 1; $-7$ is negative.",
          D: "The signum function returns the sign, not the magnitude.",
        },
        hints: ["Signum records the sign of the input.", "Negative input gives $-1$.", "$-7<0$."],
        solution: [{ step: 1, explanation: "For any negative real number $x$, $\\operatorname{sgn}(x)=-1$.", math: "\\operatorname{sgn}(-7)=-1" }],
      },
      {
        questionLatex: "\\text{The greatest integer not exceeding }2.8\\text{ is}",
        difficulty: 3,
        skillTags: ["real_valued_functions", "greatest_integer_function"],
        choices: ["$2$", "$3$", "$2.8$", "$-2$"],
        correctLetter: "A",
        rationales: {
          B: "This rounds to the nearest integer. The greatest integer function takes the greatest integer less than or equal to the input.",
          C: "The output of the greatest integer function must be an integer.",
          D: "This changes the sign without reason; $2.8$ is positive.",
        },
        hints: ["Find the largest integer not exceeding 2.8.", "2 is less than 2.8, while 3 is greater.", "So the value is 2."],
        solution: [{ step: 1, explanation: "The greatest integer less than or equal to 2.8 is 2.", math: "[2.8]=2" }],
      },
      {
        questionLatex: "\\text{For the real-valued function }f(x)=\\log x,\\text{ which set is the domain?}",
        difficulty: 3,
        skillTags: ["real_valued_functions", "logarithmic_function", "domain"],
        choices: ["$(0,\\infty)$", "$[0,\\infty)$", "$\\mathbb R$", "$(-\\infty,0)$"],
        correctLetter: "A",
        rationales: {
          B: "The logarithm is not defined at 0 in the real number system.",
          C: "The logarithm is not defined for zero or negative real inputs.",
          D: "Negative real inputs are not allowed for the real logarithm.",
        },
        hints: ["The input to a real logarithm must be positive.", "Zero is not included.", "Write the positive real interval."],
        solution: [{ step: 1, explanation: "A real logarithm requires $x>0$.", math: "\\operatorname{Dom}(\\log x)=(0,\\infty)" }],
      },
      {
        questionLatex: "\\text{Assertion (A): The range of }f(x)=e^x\\text{ is }(0,\\infty).\\text{ Reason (R): For every real }x,\\ e^x\\text{ is positive and never equals }0.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["real_valued_functions", "exponential_function", "range", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The positivity of $e^x$ is exactly the reason the range is restricted to positive real values.",
          C: "$e^x$ is positive for every real input and never equals 0.",
          D: "The assertion is true: the exponential function takes positive values only, and all positive values occur.",
        },
        hints: ["Test the assertion by recalling the graph or values of $e^x$.", "Check whether zero or negative outputs can occur.", "Decide whether the reason explains the claimed range."],
        solution: [{ step: 1, explanation: "The exponential function is positive for every real input and never reaches 0, while its values cover all positive real numbers. Hence the reason correctly explains the range.", math: "\\operatorname{Range}(e^x)=(0,\\infty)" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Evaluate }|-5|+|3|.",
        difficulty: 2,
        skillTags: ["real_valued_functions", "modulus_function"],
        parts: singlePart("a", "Find the total absolute error for the two readings.", 1),
        hints: ["Modulus gives distance from 0.", "$|-5|=5$.", "Add the two positive values."],
        rubric: singleRubric("a", 1, "Finds 8."),
        commonErrors: ["Keeping $|-5|$ as $-5$."],
        workedSolution: [{ part: "a", explanation: "$|-5|=5$ and $|3|=3$, so the value is $5+3=8$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{Let }[x]\\text{ denote the greatest integer not exceeding }x.",
        difficulty: 2,
        skillTags: ["real_valued_functions", "greatest_integer_function"],
        parts: singlePart("a", "Find the allocated integer for reading $-1.2$.", 1),
        hints: ["The value is the greatest integer less than or equal to $-1.2$.", "Compare $-1$ and $-2$.", "$-1$ is greater than $-1.2$, so it is not allowed."],
        rubric: singleRubric("a", 1, "Finds $-2$."),
        commonErrors: ["Rounding toward zero and writing $-1$."],
        workedSolution: [{ part: "a", explanation: "The greatest integer not exceeding $-1.2$ is $-2$, so $[-1.2]=-2$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{Let }f(x)=|x|\\text{ with domain }\\{-3,0,4\\}.",
        difficulty: 3,
        skillTags: ["real_valued_functions", "modulus_function", "range"],
        parts: [
          { letter: "a", promptMarkdown: "Find the image of each element of the domain.", points: 1 },
          { letter: "b", promptMarkdown: "Write the set of distinct outputs on the given domain.", points: 1 },
        ],
        hints: ["Apply modulus to each input.", "Collect distinct outputs.", "The range is a set."],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $3,0,4$." },
            { part: "b", points: 1, description: "Writes $\\{0,3,4\\}$." },
          ],
        },
        commonErrors: ["Listing outputs in the same order but with repeats or missing braces."],
        workedSolution: [
          { part: "a", explanation: "$f(-3)=3$, $f(0)=0$, and $f(4)=4$." },
          { part: "b", explanation: "The distinct outputs are $0,3,4$, so the range is $\\{0,3,4\\}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{Let }f(x)=\\frac{1}{x+1}\\text{ and }g(x)=\\log(x-2)\\text{ be real-valued functions.}",
        difficulty: 4,
        skillTags: ["real_valued_functions", "rational_function", "logarithmic_function", "domain"],
        parts: [
          { letter: "a", promptMarkdown: "Find the domain of $f$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the domain of $g$.", points: 2 },
          { letter: "c", promptMarkdown: "Find the common domain of $f$ and $g$.", points: 2 },
        ],
        hints: ["For $f$, the denominator cannot be zero.", "For $g$, the logarithm input must be positive.", "Intersect the two domains."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\mathbb R-\\{-1\\}$." },
            { part: "b", points: 2, description: "Finds $(2,\\infty)$." },
            { part: "c", points: 2, description: "Finds $(2,\\infty)$." },
          ],
        },
        commonErrors: ["Allowing $x=2$ for the logarithm.", "Taking a union instead of intersection for common domain."],
        workedSolution: [
          { part: "a", explanation: "For $f$, $x+1\\ne0$, so $x\\ne-1$. Domain is $\\mathbb R-\\{-1\\}$." },
          { part: "b", explanation: "For $g$, the logarithm input must be positive: $x-2>0\\Rightarrow x>2$. Domain is $(2,\\infty)$." },
          { part: "c", explanation: "The common domain is the intersection of the two domains. Since all $x>2$ also satisfy $x\\ne-1$, the common domain is $(2,\\infty)$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Let }p(x)=x,\\ q(x)=|x|,\\text{ and }r(x)=\\operatorname{sgn}(x)\\text{ on the domain }\\{-2,0,3\\}.",
        difficulty: 4,
        skillTags: ["real_valued_functions", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Compare $p(-2)$, $q(-2)$, and $r(-2)$.", points: 1 },
          { letter: "b", promptMarkdown: "Compare $q(0)$ and $r(0)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the range of $q$.", points: 1 },
          { letter: "d", promptMarkdown: "A learner claims that $p$ and $q$ have the same range on this domain. Decide whether the claim is correct, and justify.", points: 1 },
        ],
        hints: ["Identity returns the input.", "Modulus returns distance from 0.", "Compare the two distinct-output sets before judging the claim."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $-2,2,-1$." },
            { part: "b", points: 1, description: "Finds $0$ and $0$." },
            { part: "c", points: 1, description: "Finds $\\{0,2,3\\}$." },
            { part: "d", points: 1, description: "Rejects the claim because the identity range is $\\{-2,0,3\\}$ while the modulus range is $\\{0,2,3\\}$." },
          ],
        },
        commonErrors: ["Treating signum as modulus.", "Forgetting that $\\operatorname{sgn}(0)=0$.", "Comparing only one input instead of comparing the two ranges."],
        workedSolution: [
          { part: "a", explanation: "$p(-2)=-2$, $q(-2)=2$, and $r(-2)=-1$." },
          { part: "b", explanation: "$q(0)=|0|=0$ and $r(0)=0$." },
          { part: "c", explanation: "The modulus outputs are $2,0,3$, so the range is $\\{0,2,3\\}$." },
          { part: "d", explanation: "The claim is not correct. The identity outputs are $-2,0,3$, so its range is $\\{-2,0,3\\}$, whereas the modulus range is $\\{0,2,3\\}$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.6",
    title: "Trigonometric Functions and Identities",
    subtopic: "Angle measure, unit-circle definitions, signs, domains and ranges, and standard identities",
    mc: [
      {
        questionLatex: "\\text{Assertion (A): }150^\\circ=\\frac{5\\pi}{6}\\text{ radians. Reason (R): To convert degrees to radians, multiply the degree measure by }\\frac{\\pi}{180}.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "angle_measure", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not merely true; it is the conversion rule that proves the assertion.",
          C: "The conversion rule is true.",
          D: "The assertion is true because $150\\cdot\\pi/180=5\\pi/6$.",
        },
        hints: ["Check the assertion numerically.", "Check whether the reason states the correct conversion rule.", "Decide whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "The degree-to-radian conversion rule gives $150\\cdot\\pi/180=5\\pi/6$, so both statements are true and the reason explains the assertion.", math: "150^\\circ=150\\cdot\\frac{\\pi}{180}=\\frac{5\\pi}{6}" }],
      },
      {
        questionLatex: "\\text{The degree measure of }\\frac{7\\pi}{6}\\text{ radians is}",
        difficulty: 2,
        skillTags: ["trigonometric_functions", "angle_measure"],
        choices: ["$210^\\circ$", "$150^\\circ$", "$240^\\circ$", "$330^\\circ$"],
        correctLetter: "A",
        rationales: {
          B: "This is $5\\pi/6$, not $7\\pi/6$.",
          C: "This corresponds to $4\\pi/3$.",
          D: "This corresponds to $11\\pi/6$.",
        },
        hints: ["Use $\\pi$ radians = $180^\\circ$.", "Multiply $7\\pi/6$ by $180^\\circ/\\pi$.", "Compute $7\\times30^\\circ$."],
        solution: [{ step: 1, explanation: "Convert radians to degrees by multiplying by $180^\\circ/\\pi$.", math: "\\frac{7\\pi}{6}=\\frac{7\\pi}{6}\\cdot\\frac{180^\\circ}{\\pi}=210^\\circ" }],
      },
      {
        questionLatex: "\\text{A point moving on a circle is in quadrant III. Which sign pattern must its }(\\sin\\theta,\\cos\\theta,\\tan\\theta)\\text{ values have?}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "signs"],
        choices: ["$(-,-,+)$", "$(+, -, -)$", "$(-,+,-)$", "$(+, +,+)$"],
        correctLetter: "A",
        rationales: {
          B: "Sine is negative in quadrant III, not positive.",
          C: "Cosine is negative in quadrant III, not positive.",
          D: "All three are positive only in quadrant I.",
        },
        hints: ["Quadrant III has negative $x$ and negative $y$.", "$\\sin\\theta$ follows the $y$-coordinate.", "$\\tan\\theta=\\sin\\theta/\\cos\\theta$."],
        solution: [{ step: 1, explanation: "In quadrant III, sine and cosine are both negative, so tangent is positive.", math: "(\\sin\\theta,\\cos\\theta,\\tan\\theta)=(-,-,+)" }],
      },
      {
        questionLatex: "\\text{In the shown unit-circle diagram, point }P\\text{ lies at angle }\\theta\\text{ in standard position. Which coordinate label for }P\\text{ is valid?}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "unit_circle"],
        figure: unitCircleFigure,
        choices: ["$(\\cos\\theta,\\sin\\theta)$", "$(\\sin\\theta,\\cos\\theta)$", "$(\\tan\\theta,\\sec\\theta)$", "$(\\cos\\theta,\\tan\\theta)$"],
        correctLetter: "A",
        rationales: {
          B: "This swaps the unit-circle coordinates. The $x$-coordinate is cosine and the $y$-coordinate is sine.",
          C: "Tangent and secant are not the coordinates of the unit-circle point.",
          D: "The second coordinate is sine, not tangent.",
        },
        hints: ["On the unit circle, horizontal coordinate is cosine.", "Vertical coordinate is sine.", "Write coordinates as $(x,y)$."],
        solution: [{ step: 1, explanation: "The unit-circle definition assigns cosine to the $x$-coordinate and sine to the $y$-coordinate.", math: "(x,y)=(\\cos\\theta,\\sin\\theta)" }],
      },
      {
        questionLatex: "\\text{The exact value of }\\sin75^\\circ\\text{ is}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "sum_formula"],
        choices: ["$\\frac{\\sqrt6+\\sqrt2}{4}$", "$\\frac{\\sqrt6-\\sqrt2}{4}$", "$\\frac{\\sqrt3+1}{2}$", "$\\frac12$"],
        correctLetter: "A",
        rationales: {
          B: "This is the value of $\\sin15^\\circ$, not $\\sin75^\\circ$.",
          C: "This misses the denominators from $\\sin45^\\circ$ and $\\cos45^\\circ$.",
          D: "This is $\\sin30^\\circ$, not $\\sin75^\\circ$.",
        },
        hints: ["Write $75^\\circ=45^\\circ+30^\\circ$.", "Use $\\sin(x+y)=\\sin x\\cos y+\\cos x\\sin y$.", "Substitute standard values."],
        solution: [{ step: 1, explanation: "Use the sum formula with $75^\\circ=45^\\circ+30^\\circ$.", math: "\\sin75^\\circ=\\frac{\\sqrt2}{2}\\cdot\\frac{\\sqrt3}{2}+\\frac{\\sqrt2}{2}\\cdot\\frac12=\\frac{\\sqrt6+\\sqrt2}{4}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Convert }225^\\circ\\text{ into radians.}",
        difficulty: 2,
        skillTags: ["trigonometric_functions", "angle_measure"],
        parts: singlePart("a", "Write the wheel's turn in radians.", 1),
        hints: ["Multiply by $\\pi/180$.", "Simplify $225/180$.", "Divide numerator and denominator by 45."],
        rubric: singleRubric("a", 1, "Finds $5\\pi/4$."),
        commonErrors: ["Writing $4\\pi/5$ by inverting the fraction."],
        workedSolution: [{ part: "a", explanation: "$225^\\circ=225\\cdot\\frac{\\pi}{180}=\\frac{5\\pi}{4}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{For }y=\\sin x,",
        difficulty: 2,
        skillTags: ["trigonometric_functions", "domain_range"],
        parts: singlePart("a", "State the domain and range.", 2),
        hints: ["Sine is defined for every real angle.", "Unit-circle $y$-coordinate stays between $-1$ and 1.", "Include both endpoints."],
        rubric: singleRubric("a", 2, "States domain $\\mathbb R$ and range $[-1,1]$."),
        commonErrors: ["Giving the range as $\\mathbb R$."],
        workedSolution: [{ part: "a", explanation: "The sine function is defined for all real numbers and has values from $-1$ to $1$, so the domain is $\\mathbb R$ and range is $[-1,1]$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{Let }\\theta=\\frac{4\\pi}{3}.",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "unit_circle", "signs"],
        parts: [
          { letter: "a", promptMarkdown: "State the quadrant in which $\\theta$ lies.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\sin\\theta$ and $\\cos\\theta$.", points: 2 },
        ],
        hints: ["Convert $4\\pi/3$ to degrees if helpful.", "It is $240^\\circ$, in quadrant III.", "Use reference angle $60^\\circ$ with quadrant III signs."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "States quadrant III." },
            { part: "b", points: 2, description: "Finds $\\sin\\theta=-\\sqrt3/2$ and $\\cos\\theta=-1/2$." },
          ],
        },
        commonErrors: ["Using quadrant II signs.", "Forgetting the reference angle is $60^\\circ$."],
        workedSolution: [
          { part: "a", explanation: "$\\frac{4\\pi}{3}=240^\\circ$, which lies in quadrant III." },
          { part: "b", explanation: "The reference angle is $60^\\circ$. In quadrant III, sine and cosine are negative, so $\\sin\\theta=-\\frac{\\sqrt3}{2}$ and $\\cos\\theta=-\\frac12$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{Use }15^\\circ=45^\\circ-30^\\circ\\text{ to evaluate }\\cos15^\\circ.",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "difference_formula"],
        parts: [
          { letter: "a", promptMarkdown: "Write the identity needed for $\\cos(x-y)$.", points: 1 },
          { letter: "b", promptMarkdown: "Use the identity to find the exact value of $\\cos15^\\circ$.", points: 3 },
        ],
        hints: ["Use $15^\\circ=45^\\circ-30^\\circ$.", "The cosine difference formula has a plus sign between products.", "Substitute standard values."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\cos(x-y)=\\cos x\\cos y+\\sin x\\sin y$." },
            { part: "b", points: 3, description: "Finds $(\\sqrt6+\\sqrt2)/4$." },
          ],
        },
        commonErrors: ["Using a minus sign in the cosine difference formula.", "Mixing up sine and cosine standard values."],
        workedSolution: [
          { part: "a", explanation: "$\\cos(x-y)=\\cos x\\cos y+\\sin x\\sin y$." },
          { part: "b", explanation: "$\\cos15^\\circ=\\cos(45^\\circ-30^\\circ)=\\frac{\\sqrt2}{2}\\cdot\\frac{\\sqrt3}{2}+\\frac{\\sqrt2}{2}\\cdot\\frac12=\\frac{\\sqrt6+\\sqrt2}{4}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Point }P\\text{ on the unit circle lies in quadrant II with reference angle }30^\\circ.",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "unit_circle", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find the vertical coordinate value $\\sin\\theta$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the horizontal coordinate value $\\cos\\theta$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the ratio $\\tan\\theta$.", points: 1 },
          { letter: "d", promptMarkdown: "Write the coordinates of point $P$.", points: 1 },
        ],
        hints: ["Quadrant II has positive sine and negative cosine.", "Use the $30^\\circ$ reference values.", "Unit-circle coordinates are $(\\cos\\theta,\\sin\\theta)$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $1/2$." },
            { part: "b", points: 1, description: "Finds $-\\sqrt3/2$." },
            { part: "c", points: 1, description: "Finds $-1/\\sqrt3$ or $-\\sqrt3/3$." },
            { part: "d", points: 1, description: "Writes $(-\\sqrt3/2,1/2)$." },
          ],
        },
        commonErrors: ["Using quadrant I signs.", "Writing coordinates as $(\\sin\\theta,\\cos\\theta)$."],
        workedSolution: [
          { part: "a", explanation: "With reference angle $30^\\circ$ in quadrant II, $\\sin\\theta=\\frac12$." },
          { part: "b", explanation: "Cosine is negative in quadrant II, so $\\cos\\theta=-\\frac{\\sqrt3}{2}$." },
          { part: "c", explanation: "$\\tan\\theta=\\frac{\\sin\\theta}{\\cos\\theta}=\\frac{1/2}{-\\sqrt3/2}=-\\frac1{\\sqrt3}=-\\frac{\\sqrt3}{3}$." },
          { part: "d", explanation: "The unit-circle point is $(\\cos\\theta,\\sin\\theta)=\\left(-\\frac{\\sqrt3}{2},\\frac12\\right)$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.7",
    title: "Graphs, Domains, and Ranges of Trigonometric Functions",
    subtopic: "Domain, range, period, and graph features of the six trigonometric functions",
    mc: [
      {
        questionLatex: "\\text{Assertion (A): For every real }x,\\ \\sin^2x+\\cos^2x=1.\\text{ Reason (R): On the unit circle, a point at angle }x\\text{ has coordinates }(\\cos x,\\sin x)\\text{ and lies one unit from the origin. Choose the correct option.}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "pythagorean_identity", "unit_circle", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is exactly the unit-circle proof of the identity.",
          C: "The reason is true: the unit-circle point has distance 1 from the origin.",
          D: "The assertion is true for all real $x$.",
        },
        hints: ["Use the distance of $(\\cos x,\\sin x)$ from the origin.", "The radius of the unit circle is 1.", "Apply $x^2+y^2=1$ to the coordinates."],
        solution: [{ step: 1, explanation: "The unit-circle point satisfies $X^2+Y^2=1$ with $X=\\cos x$ and $Y=\\sin x$.", math: "\\cos^2x+\\sin^2x=1" }],
      },
      {
        questionLatex: "\\text{The shown graph has vertical asymptotes at odd multiples of }\\frac{\\pi}{2}\\text{ and takes every real output value. Which domain-range pair matches the central branch?}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "graphs", "domain_range", "tan_graph"],
        figure: tangentGraphFigure,
        choices: [
          "$\\text{Domain }\\mathbb R-\\{(2k+1)\\pi/2:k\\in\\mathbb Z\\},\\text{ range }\\mathbb R$",
          "$\\text{Domain }\\mathbb R,\\text{ range }[-1,1]$",
          "$\\text{Domain }\\mathbb R-\\{k\\pi:k\\in\\mathbb Z\\},\\text{ range }\\mathbb R$",
          "$\\text{Domain }[-1,1],\\text{ range }\\mathbb R$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the domain-range pattern for sine or cosine, not a graph with vertical asymptotes and unbounded outputs.",
          C: "The excluded values $k\\pi$ belong to cotangent, not the shown central tangent-style branch.",
          D: "Domain is a set of input angles, not the output interval $[-1,1]$.",
        },
        hints: ["Read the dashed vertical lines.", "The curve rises without bound near the asymptotes.", "Tangent is undefined where cosine is zero."],
        solution: [{ step: 1, explanation: "The graph has tangent-style asymptotes at $x=(2k+1)\\pi/2$ and no restriction on output values.", math: "\\operatorname{Dom}(\\tan x)=\\mathbb R-\\{(2k+1)\\pi/2:k\\in\\mathbb Z\\},\\quad \\operatorname{Range}=\\mathbb R" }],
      },
      {
        questionLatex: "\\text{For }y=\\csc x,\\text{ which domain and range are correct?}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "domain_range", "cosecant"],
        choices: [
          "$\\mathbb R-\\{k\\pi:k\\in\\mathbb Z\\}\\text{ and }(-\\infty,-1]\\cup[1,\\infty)$",
          "$\\mathbb R\\text{ and }[-1,1]$",
          "$\\mathbb R-\\{(2k+1)\\pi/2:k\\in\\mathbb Z\\}\\text{ and }(-\\infty,-1]\\cup[1,\\infty)$",
          "$\\mathbb R-\\{k\\pi:k\\in\\mathbb Z\\}\\text{ and }[-1,1]$",
        ],
        correctLetter: "A",
        rationales: {
          B: "That is the sine range, but cosecant is the reciprocal of sine and is undefined when sine is zero.",
          C: "Those excluded angles make cosine zero, so they fit secant, not cosecant.",
          D: "Cosecant values have magnitude at least 1; they do not stay inside $[-1,1]$.",
        },
        hints: ["Use $\\csc x=1/\\sin x$.", "Exclude where $\\sin x=0$.", "The reciprocal of a number in $[-1,1]\\setminus\\{0\\}$ has magnitude at least 1."],
        solution: [{ step: 1, explanation: "Since $\\csc x=1/\\sin x$, it is undefined at $x=k\\pi$. Its values satisfy $y\\le-1$ or $y\\ge1$.", math: "\\operatorname{Dom}(\\csc x)=\\mathbb R-\\{k\\pi:k\\in\\mathbb Z\\},\\quad \\operatorname{Range}=(-\\infty,-1]\\cup[1,\\infty)" }],
      },
      {
        questionLatex: "\\text{In the shown pair of basic graphs, one curve starts at the origin and the other starts at a maximum. Which statement correctly identifies the starting-at-maximum curve?}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "graphs", "sine_cosine"],
        figure: sineCosineGraphFigure,
        choices: [
          "It is the cosine graph, because $\\cos0=1$ while $\\sin0=0$.",
          "It is the sine graph, because $\\sin0=1$ while $\\cos0=0$.",
          "It is the tangent graph, because tangent has range $[-1,1]$.",
          "It is the cosecant graph, because cosecant is defined at $x=0$.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The starting values are reversed: $\\sin0=0$ and $\\cos0=1$.",
          C: "Tangent is not bounded between $-1$ and 1 and has vertical asymptotes.",
          D: "Cosecant is not defined at $x=0$ because $\\sin0=0$.",
        },
        hints: ["Check the values at $x=0$.", "Cosine begins at 1.", "Sine begins at 0."],
        solution: [{ step: 1, explanation: "At $x=0$, the cosine graph has value 1 and the sine graph has value 0.", math: "\\cos0=1,\\quad \\sin0=0" }],
      },
      {
        questionLatex: "\\text{A basic trigonometric graph is undefined at }x=0\\text{ and has period }\\pi.\\text{ Which function fits?}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "graphs", "cotangent"],
        choices: ["$\\cot x$", "$\\tan x$", "$\\sin x$", "$\\sec x$"],
        correctLetter: "A",
        rationales: {
          B: "$\\tan x$ is defined at $x=0$ and has value 0.",
          C: "$\\sin x$ is defined for all real $x$ and has period $2\\pi$.",
          D: "$\\sec x$ is defined at $x=0$ and has period $2\\pi$.",
        },
        hints: ["Cotangent is $\\cos x/\\sin x$.", "It is undefined when $\\sin x=0$.", "It repeats every $\\pi$."],
        solution: [{ step: 1, explanation: "Cotangent is undefined when $\\sin x=0$, including $x=0$, and its period is $\\pi$.", math: "\\cot x=\\frac{\\cos x}{\\sin x}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{For }y=\\sec x,",
        difficulty: 2,
        skillTags: ["trigonometric_functions", "domain_range", "secant"],
        parts: singlePart("a", "State the real domain restriction and the range of $y=\\sec x$.", 2),
        hints: ["Use $\\sec x=1/\\cos x$.", "Exclude where $\\cos x=0$.", "Reciprocal cosine values have magnitude at least 1."],
        rubric: singleRubric("a", 2, "States domain $\\mathbb R-\\{(2k+1)\\pi/2:k\\in\\mathbb Z\\}$ and range $(-\\infty,-1]\\cup[1,\\infty)$."),
        commonErrors: ["Using the sine-zero exclusions instead of cosine-zero exclusions.", "Giving the cosine range $[-1,1]$ for secant."],
        workedSolution: [{ part: "a", explanation: "$\\sec x=1/\\cos x$, so exclude $x=(2k+1)\\pi/2$. The output satisfies $y\\le-1$ or $y\\ge1$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{For }y=\\tan x,",
        difficulty: 2,
        skillTags: ["trigonometric_functions", "period", "domain_range"],
        parts: singlePart("a", "State the period and range of $y=\\tan x$.", 2),
        hints: ["Tangent repeats after $\\pi$.", "Between two asymptotes it takes every real value.", "The range is not bounded."],
        rubric: singleRubric("a", 2, "States period $\\pi$ and range $\\mathbb R$."),
        commonErrors: ["Using period $2\\pi$ for tangent.", "Borrowing the sine range $[-1,1]$."],
        workedSolution: [{ part: "a", explanation: "The tangent graph repeats every $\\pi$ and takes all real output values, so the period is $\\pi$ and the range is $\\mathbb R$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{A student prepares a domain-range summary for }\\sin x,\\ \\cos x,\\text{ and }\\tan x.",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "domain_range", "graphs"],
        parts: [
          { letter: "a", promptMarkdown: "Write the domain and range of $\\sin x$ and $\\cos x$.", points: 2 },
          { letter: "b", promptMarkdown: "Write the domain and range of $\\tan x$.", points: 2 },
        ],
        hints: ["Sine and cosine are defined for every real angle.", "Their values stay between $-1$ and 1.", "Tangent is undefined where cosine is 0."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "States domain $\\mathbb R$ and range $[-1,1]$ for both sine and cosine." },
            { part: "b", points: 2, description: "States domain $\\mathbb R-\\{(2k+1)\\pi/2:k\\in\\mathbb Z\\}$ and range $\\mathbb R$ for tangent." },
          ],
        },
        commonErrors: ["Using the same domain for all six trig functions.", "Writing tangent's range as $[-1,1]$."],
        workedSolution: [
          { part: "a", explanation: "Both $\\sin x$ and $\\cos x$ are defined for all real $x$ and have range $[-1,1]$." },
          { part: "b", explanation: "$\\tan x=\\sin x/\\cos x$, so exclude $x=(2k+1)\\pi/2$. Between asymptotes, tangent takes every real value." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{A reviewer claims that }\\sec x\\text{ and }\\csc x\\text{ have the same domain because both are reciprocal functions.}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "reciprocal_functions", "domain_range", "justification"],
        parts: [
          { letter: "a", promptMarkdown: "State the domain of $\\sec x$.", points: 1 },
          { letter: "b", promptMarkdown: "State the domain of $\\csc x$.", points: 1 },
          { letter: "c", promptMarkdown: "Decide whether the reviewer's claim is correct, and justify.", points: 2 },
        ],
        hints: ["Use the denominator of each reciprocal function.", "$\\sec x=1/\\cos x$.", "$\\csc x=1/\\sin x$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Gives $\\mathbb R-\\{(2k+1)\\pi/2:k\\in\\mathbb Z\\}$." },
            { part: "b", points: 1, description: "Gives $\\mathbb R-\\{k\\pi:k\\in\\mathbb Z\\}$." },
            { part: "c", points: 2, description: "Rejects the claim with a correct denominator-based reason." },
          ],
        },
        commonErrors: ["Excluding the same angles for secant and cosecant.", "Saying reciprocal functions must have identical domains."],
        workedSolution: [
          { part: "a", explanation: "$\\sec x$ is undefined where $\\cos x=0$, so exclude $x=(2k+1)\\pi/2$." },
          { part: "b", explanation: "$\\csc x$ is undefined where $\\sin x=0$, so exclude $x=k\\pi$." },
          { part: "c", explanation: "The claim is false. Reciprocal functions inherit restrictions from different denominators: cosine for secant and sine for cosecant." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Two basic trigonometric graphs are described. Graph A has range }[-1,1]\\text{ and is defined for all real }x.\\text{ Graph B has vertical asymptotes at }x=\\frac{\\pi}{2}+k\\pi\\text{ and takes every real value.}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "graphs", "case_based", "domain_range"],
        parts: [
          { letter: "a", promptMarkdown: "Name one possible function for Graph A.", points: 1 },
          { letter: "b", promptMarkdown: "Name the basic function that fits Graph B.", points: 1 },
          { letter: "c", promptMarkdown: "State the period of Graph B.", points: 1 },
          { letter: "d", promptMarkdown: "Explain why Graph B cannot be $\\sin x$.", points: 1 },
        ],
        hints: ["Sine and cosine have range $[-1,1]$.", "Tangent has asymptotes where cosine is zero.", "Compare bounded and unbounded outputs."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Names $\\sin x$ or $\\cos x$." },
            { part: "b", points: 1, description: "Names $\\tan x$." },
            { part: "c", points: 1, description: "States period $\\pi$." },
            { part: "d", points: 1, description: "Explains that sine is defined for all real $x$ and bounded between $-1$ and 1." },
          ],
        },
        commonErrors: ["Confusing tangent's asymptotes with sine's maximum and minimum values.", "Using period $2\\pi$ for tangent."],
        workedSolution: [
          { part: "a", explanation: "Model A can be $\\sin x$ or $\\cos x$, since both are defined for all real $x$ and have range $[-1,1]$." },
          { part: "b", explanation: "Model B fits $\\tan x$ because tangent is undefined at $x=\\pi/2+k\\pi$ and has range $\\mathbb R$." },
          { part: "c", explanation: "The period of $\\tan x$ is $\\pi$." },
          { part: "d", explanation: "Model B cannot be $\\sin x$ because sine has no vertical asymptotes and its range is only $[-1,1]$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.8",
    title: "Compound-Angle and Product-Sum Identities",
    subtopic: "Using sin(x±y), cos(x±y), tan(x±y), cot(x±y), and sum-to-product identities",
    mc: [
      {
        questionLatex: "\\text{Using }75^\\circ=45^\\circ+30^\\circ,\\text{ the exact value of }\\tan75^\\circ\\text{ is}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "tan_sum_formula", "exact_values"],
        choices: ["$2+\\sqrt3$", "$2-\\sqrt3$", "$\\sqrt3-1$", "$\\frac{1}{2+\\sqrt3}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the value of $\\tan15^\\circ$, not $\\tan75^\\circ$.",
          C: "This misses the denominator $1-\\tan45^\\circ\\tan30^\\circ$.",
          D: "This is the reciprocal of the correct value.",
        },
        hints: ["Use $\\tan(x+y)=\\frac{\\tan x+\\tan y}{1-\\tan x\\tan y}$.", "Substitute $\\tan45^\\circ=1$ and $\\tan30^\\circ=1/\\sqrt3$.", "Rationalize the result."],
        solution: [{ step: 1, explanation: "Apply the tangent sum identity and simplify.", math: "\\tan75^\\circ=\\frac{1+1/\\sqrt3}{1-1/\\sqrt3}=2+\\sqrt3" }],
      },
      {
        questionLatex: "\\text{A solution step changes }\\sin70^\\circ+\\sin10^\\circ\\text{ into one product. Which transformation is valid?}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "sum_to_product"],
        choices: ["$2\\sin40^\\circ\\cos30^\\circ$", "$2\\cos40^\\circ\\sin30^\\circ$", "$2\\sin80^\\circ\\cos60^\\circ$", "$2\\cos80^\\circ\\sin60^\\circ$"],
        correctLetter: "A",
        rationales: {
          B: "This swaps sine and cosine in the sum-to-product identity for $\\sin\\alpha+\\sin\\beta$.",
          C: "This uses the original sum and difference rather than half-sum and half-difference.",
          D: "This uses the cosine-difference pattern, not the sine-sum pattern.",
        },
        hints: ["Use $\\sin\\alpha+\\sin\\beta=2\\sin\\frac{\\alpha+\\beta}{2}\\cos\\frac{\\alpha-\\beta}{2}$.", "Compute the half-sum.", "Compute the half-difference."],
        solution: [{ step: 1, explanation: "For $\\alpha=70^\\circ$ and $\\beta=10^\\circ$, the half-sum is $40^\\circ$ and the half-difference is $30^\\circ$.", math: "\\sin70^\\circ+\\sin10^\\circ=2\\sin40^\\circ\\cos30^\\circ" }],
      },
      {
        questionLatex: "\\text{A learner writes }\\cos75^\\circ=\\cos45^\\circ\\cos30^\\circ+\\sin45^\\circ\\sin30^\\circ.\\text{ Which correction is valid?}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "cos_sum_formula", "error_analysis"],
        choices: [
          "$\\cos75^\\circ=\\frac{\\sqrt6-\\sqrt2}{4}$ because $\\cos(x+y)=\\cos x\\cos y-\\sin x\\sin y$.",
          "$\\cos75^\\circ=\\frac{\\sqrt6+\\sqrt2}{4}$ because the plus sign is correct for $\\cos(x+y)$.",
          "$\\cos75^\\circ=\\frac12$ because $75^\\circ$ is halfway between $45^\\circ$ and $30^\\circ$.",
          "$\\cos75^\\circ=\\sqrt3$ because cosine values add directly.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The plus sign belongs to $\\cos(x-y)$, not $\\cos(x+y)$.",
          C: "Trigonometric values do not average this way.",
          D: "Cosine of a sum is not the sum of the cosines.",
        },
        hints: ["Identify whether the angle is a sum or difference.", "Use the cosine sum identity.", "Substitute standard values carefully."],
        solution: [{ step: 1, explanation: "The cosine sum formula has a minus sign between the products.", math: "\\cos75^\\circ=\\frac{\\sqrt2}{2}\\cdot\\frac{\\sqrt3}{2}-\\frac{\\sqrt2}{2}\\cdot\\frac12=\\frac{\\sqrt6-\\sqrt2}{4}" }],
      },
      {
        questionLatex: "\\text{Which identity should be used to rewrite }\\cot(x+y)\\text{ in terms of }\\cot x\\text{ and }\\cot y?",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "cot_sum_formula"],
        choices: [
          "$\\cot(x+y)=\\frac{\\cot x\\cot y-1}{\\cot x+\\cot y}$",
          "$\\cot(x+y)=\\frac{\\cot x+\\cot y}{\\cot x\\cot y-1}$",
          "$\\cot(x+y)=\\frac{\\cot x-\\cot y}{\\cot x\\cot y+1}$",
          "$\\cot(x+y)=\\cot x+\\cot y$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the reciprocal of the correct expression.",
          C: "The signs correspond to a different expression and still place terms incorrectly.",
          D: "Cotangent of a sum is not the sum of cotangents.",
        },
        hints: ["Start from $\\tan(x+y)$ if needed.", "Cotangent is the reciprocal of tangent.", "Simplify using cotangents."],
        solution: [{ step: 1, explanation: "Taking the reciprocal of the tangent sum formula gives the cotangent sum identity.", math: "\\cot(x+y)=\\frac{\\cot x\\cot y-1}{\\cot x+\\cot y}" }],
      },
      {
        questionLatex: "\\text{Assertion (A): }\\cos\\alpha-\\cos\\beta=-2\\sin\\frac{\\alpha+\\beta}{2}\\sin\\frac{\\alpha-\\beta}{2}.\\text{ Reason (R): The difference of cosines can be deduced from the formulas for }\\cos(x+y)\\text{ and }\\cos(x-y).\\text{ Choose the correct option.}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "sum_to_product", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not separate trivia; it is the standard derivation path for the identity.",
          C: "The reason is true: sum-to-product identities follow from compound-angle formulas.",
          D: "The assertion is the correct cosine-difference product identity.",
        },
        hints: ["Compare the assertion with the standard sum-to-product identity.", "Think about setting $x=(\\alpha+\\beta)/2$ and $y=(\\alpha-\\beta)/2$.", "Use compound-angle formulas to justify it."],
        solution: [{ step: 1, explanation: "The identity is one of the standard sum-to-product results deduced from cosine compound-angle formulas.", math: "\\cos\\alpha-\\cos\\beta=-2\\sin\\frac{\\alpha+\\beta}{2}\\sin\\frac{\\alpha-\\beta}{2}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{Use the tangent difference identity to evaluate }\\tan15^\\circ.",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "tan_difference_formula", "exact_values"],
        parts: singlePart("a", "Find the exact value of $\\tan15^\\circ$.", 2),
        hints: ["Write $15^\\circ=45^\\circ-30^\\circ$.", "Use $\\tan(x-y)=\\frac{\\tan x-\\tan y}{1+\\tan x\\tan y}$.", "Substitute $1$ and $1/\\sqrt3$."],
        rubric: singleRubric("a", 2, "Finds $2-\\sqrt3$."),
        commonErrors: ["Using the sum formula instead of the difference formula.", "Forgetting the plus sign in the denominator of $\\tan(x-y)$."],
        workedSolution: [{ part: "a", explanation: "$\\tan15^\\circ=\\frac{1-1/\\sqrt3}{1+1/\\sqrt3}=2-\\sqrt3$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{Rewrite }\\sin80^\\circ-\\sin20^\\circ\\text{ as one product.}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "sum_to_product"],
        parts: singlePart("a", "Use a sum-to-product identity to rewrite the expression.", 2),
        hints: ["Use $\\sin\\alpha-\\sin\\beta$.", "Find the half-sum and half-difference.", "Keep the expression as a product."],
        rubric: singleRubric("a", 2, "Writes $2\\cos50^\\circ\\sin30^\\circ$."),
        commonErrors: ["Using $80^\\circ-20^\\circ$ directly instead of the half-difference.", "Using the sine-sum formula instead of the sine-difference formula."],
        workedSolution: [{ part: "a", explanation: "$\\sin80^\\circ-\\sin20^\\circ=2\\cos50^\\circ\\sin30^\\circ$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{Starting from }\\sin(x+y)\\text{ and }\\cos(x+y),\\text{ a learner wants a formula for }\\tan(x+y).",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "tan_sum_formula", "derivation"],
        parts: [
          { letter: "a", promptMarkdown: "Write $\\tan(x+y)$ as a quotient involving $\\sin(x+y)$ and $\\cos(x+y)$.", points: 1 },
          { letter: "b", promptMarkdown: "Deduce the formula for $\\tan(x+y)$ in terms of $\\tan x$ and $\\tan y$.", points: 3 },
        ],
        hints: ["Use $\\tan\\theta=\\sin\\theta/\\cos\\theta$.", "Substitute the sine and cosine sum formulas.", "Divide numerator and denominator by $\\cos x\\cos y$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\tan(x+y)=\\sin(x+y)/\\cos(x+y)$." },
            { part: "b", points: 3, description: "Derives $\\frac{\\tan x+\\tan y}{1-\\tan x\\tan y}$." },
          ],
        },
        commonErrors: ["Forgetting the minus sign in the cosine sum denominator.", "Dividing only one term by $\\cos x\\cos y$."],
        workedSolution: [
          { part: "a", explanation: "$\\tan(x+y)=\\frac{\\sin(x+y)}{\\cos(x+y)}$." },
          { part: "b", explanation: "Substitute compound-angle formulas and divide by $\\cos x\\cos y$ to get $\\tan(x+y)=\\frac{\\tan x+\\tan y}{1-\\tan x\\tan y}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{Use product-sum identities to evaluate }\\sin75^\\circ+\\sin15^\\circ\\text{ and }\\cos75^\\circ+\\cos15^\\circ.",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "sum_to_product", "exact_values"],
        parts: [
          { letter: "a", promptMarkdown: "Evaluate $\\sin75^\\circ+\\sin15^\\circ$ exactly.", points: 2 },
          { letter: "b", promptMarkdown: "Evaluate $\\cos75^\\circ+\\cos15^\\circ$ exactly.", points: 2 },
        ],
        hints: ["Use half-sum and half-difference.", "The half-sum is $45^\\circ$.", "The half-difference is $30^\\circ$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $\\sqrt6/2$." },
            { part: "b", points: 2, description: "Finds $\\sqrt6/2$." },
          ],
        },
        commonErrors: ["Using original angles instead of half-angles.", "Mixing the sine-sum and cosine-sum identities."],
        workedSolution: [
          { part: "a", explanation: "$\\sin75^\\circ+\\sin15^\\circ=2\\sin45^\\circ\\cos30^\\circ=2\\cdot\\frac{\\sqrt2}{2}\\cdot\\frac{\\sqrt3}{2}=\\frac{\\sqrt6}{2}$." },
          { part: "b", explanation: "$\\cos75^\\circ+\\cos15^\\circ=2\\cos45^\\circ\\cos30^\\circ=\\frac{\\sqrt6}{2}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Use compound-angle and product-sum identities for the angles }75^\\circ\\text{ and }15^\\circ.",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "case_based", "compound_angles", "sum_to_product"],
        parts: [
          { letter: "a", promptMarkdown: "Evaluate $\\sin75^\\circ$ using a compound-angle identity.", points: 1 },
          { letter: "b", promptMarkdown: "Evaluate $\\cos75^\\circ$ using a compound-angle identity.", points: 1 },
          { letter: "c", promptMarkdown: "Rewrite $\\sin75^\\circ+\\sin15^\\circ$ as a product.", points: 1 },
          { letter: "d", promptMarkdown: "Use part (c) to evaluate $\\sin75^\\circ+\\sin15^\\circ$ exactly.", points: 1 },
        ],
        hints: ["Use $75^\\circ=45^\\circ+30^\\circ$.", "Use the correct sign in the cosine sum formula.", "For the sum of sines, use half-sum and half-difference."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $(\\sqrt6+\\sqrt2)/4$." },
            { part: "b", points: 1, description: "Finds $(\\sqrt6-\\sqrt2)/4$." },
            { part: "c", points: 1, description: "Writes $2\\sin45^\\circ\\cos30^\\circ$." },
            { part: "d", points: 1, description: "Finds $\\sqrt6/2$." },
          ],
        },
        commonErrors: ["Using the cosine difference sign for $\\cos75^\\circ$.", "Assuming $\\sin75^\\circ+\\sin15^\\circ=\\sin90^\\circ$."],
        workedSolution: [
          { part: "a", explanation: "$\\sin75^\\circ=\\sin(45^\\circ+30^\\circ)=\\frac{\\sqrt6+\\sqrt2}{4}$." },
          { part: "b", explanation: "$\\cos75^\\circ=\\cos(45^\\circ+30^\\circ)=\\frac{\\sqrt6-\\sqrt2}{4}$." },
          { part: "c", explanation: "$\\sin75^\\circ+\\sin15^\\circ=2\\sin45^\\circ\\cos30^\\circ$." },
          { part: "d", explanation: "$2\\sin45^\\circ\\cos30^\\circ=2\\cdot\\frac{\\sqrt2}{2}\\cdot\\frac{\\sqrt3}{2}=\\frac{\\sqrt6}{2}$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.9",
    title: "Double- and Triple-Angle Identities",
    subtopic: "Deducing and applying identities for sin 2x, cos 2x, tan 2x, sin 3x, cos 3x, and tan 3x",
    mc: [
      {
        questionLatex: "\\text{Assertion (A): }\\sin3x=3\\sin x-4\\sin^3x.\\text{ Reason (R): The identity can be deduced from }\\sin(2x+x)\\text{ using the compound-angle formulas and }\\sin^2x+\\cos^2x=1.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "triple_angle", "sin3x", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not separate trivia; it describes the standard derivation of the triple-angle identity.",
          C: "The reason is true: expand $\\sin(2x+x)$ and then use double-angle and Pythagorean identities.",
          D: "The assertion is the correct sine triple-angle identity.",
        },
        hints: ["Check the assertion against the standard sine triple-angle formula.", "Expand $\\sin(2x+x)$.", "Use $\\sin2x=2\\sin x\\cos x$ and $\\cos2x=1-2\\sin^2x$."],
        solution: [{ step: 1, explanation: "Expanding $\\sin(2x+x)$ gives $\\sin2x\\cos x+\\cos2x\\sin x$. Substituting the double-angle identities simplifies to $3\\sin x-4\\sin^3x$, so the reason correctly explains the assertion.", math: "\\sin3x=3\\sin x-4\\sin^3x" }],
      },
      {
        questionLatex: "\\text{If }\\sin x=\\frac35\\text{ and }x\\text{ lies in quadrant I, what is }\\sin2x?",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "double_angle", "unit_circle"],
        choices: ["$\\frac{24}{25}$", "$\\frac{7}{25}$", "$\\frac{12}{25}$", "$\\frac65$"],
        correctLetter: "A",
        rationales: {
          B: "This is $\\cos2x$, not $\\sin2x$.",
          C: "This misses the factor of 2 in $\\sin2x=2\\sin x\\cos x$.",
          D: "This exceeds 1, so it cannot be a sine value.",
        },
        hints: ["Find $\\cos x$ using quadrant I.", "Use $\\sin2x=2\\sin x\\cos x$.", "Substitute $3/5$ and $4/5$."],
        solution: [{ step: 1, explanation: "In quadrant I, $\\cos x=4/5$. Thus $\\sin2x=2(3/5)(4/5)=24/25$.", math: "\\sin2x=\\frac{24}{25}" }],
      },
      {
        questionLatex: "\\text{If }\\tan x=\\frac12,\\text{ then }\\tan2x\\text{ equals, provided the expression is defined,}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "tan_double_angle"],
        choices: ["$\\frac43$", "$\\frac34$", "$1$", "$\\frac{2}{5}$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses numerator and denominator after substitution.",
          C: "This adds the two tangent values instead of using the double-angle formula.",
          D: "This uses $2t/(1+t^2)$, which is not the formula for $\\tan2x$.",
        },
        hints: ["Use $\\tan2x=\\frac{2t}{1-t^2}$.", "Substitute $t=1/2$.", "Simplify the complex fraction."],
        solution: [{ step: 1, explanation: "With $t=1/2$, $\\tan2x=\\frac{2t}{1-t^2}=\\frac{1}{1-1/4}=4/3$.", math: "\\tan2x=\\frac43" }],
      },
      {
        questionLatex: "\\text{A student wants to replace }\\cos2x\\text{ using only }\\sin x.\\text{ Which expression is correct?}",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "double_angle", "cos2x"],
        choices: ["$1-2\\sin^2x$", "$2\\sin^2x-1$", "$2\\sin x\\cos x$", "$1+2\\sin^2x$"],
        correctLetter: "A",
        rationales: {
          B: "This is the negative of $\\cos2x$ in sine-only form.",
          C: "This is $\\sin2x$, not $\\cos2x$.",
          D: "The sign before $2\\sin^2x$ should be negative.",
        },
        hints: ["Start from $\\cos2x=\\cos^2x-\\sin^2x$.", "Replace $\\cos^2x$ with $1-\\sin^2x$.", "Simplify."],
        solution: [{ step: 1, explanation: "Using $\\cos^2x=1-\\sin^2x$, we get $\\cos2x=1-2\\sin^2x$.", math: "\\cos2x=1-2\\sin^2x" }],
      },
      {
        questionLatex: "\\text{If }\\cos x=\\frac35\\text{ and }x\\text{ is acute, what is }\\cos3x?",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "triple_angle", "cos3x", "multi_step"],
        choices: ["$-\\frac{117}{125}$", "$\\frac{117}{125}$", "$-\\frac{44}{125}$", "$\\frac{27}{125}$"],
        correctLetter: "A",
        rationales: {
          B: "This loses the negative sign after subtracting $3\\cos x$.",
          C: "This uses an incorrect coefficient in the triple-angle formula.",
          D: "This keeps only $\\cos^3x$ and omits the rest of the identity.",
        },
        hints: ["Use $\\cos3x=4\\cos^3x-3\\cos x$.", "Substitute $\\cos x=3/5$.", "Use a common denominator of 125."],
        solution: [{ step: 1, explanation: "Apply the cosine triple-angle identity.", math: "\\cos3x=4\\left(\\frac35\\right)^3-3\\left(\\frac35\\right)=\\frac{108}{125}-\\frac{225}{125}=-\\frac{117}{125}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "\\text{If }\\sin x=\\frac{5}{13}\\text{ and }x\\text{ is acute, find }\\cos2x.",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "double_angle", "cos2x"],
        parts: singlePart("a", "Find $\\cos2x$.", 2),
        hints: ["Use $\\cos2x=1-2\\sin^2x$.", "Substitute $5/13$.", "Simplify over denominator 169."],
        rubric: singleRubric("a", 2, "Finds $119/169$."),
        commonErrors: ["Using $1-\\sin^2x$ instead of $1-2\\sin^2x$.", "Forgetting to square $5/13$."],
        workedSolution: [{ part: "a", explanation: "$\\cos2x=1-2(5/13)^2=1-50/169=119/169$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: "\\text{Use the triple-angle identity to evaluate }\\sin90^\\circ\\text{ through }\\sin30^\\circ.",
        difficulty: 3,
        skillTags: ["trigonometric_functions", "triple_angle", "sin3x"],
        parts: singlePart("a", "Verify the value of $\\sin90^\\circ$ using $\\sin3x$ with $x=30^\\circ$.", 2),
        hints: ["Use $\\sin3x=3\\sin x-4\\sin^3x$.", "Substitute $\\sin30^\\circ=1/2$.", "Simplify."],
        rubric: singleRubric("a", 2, "Shows $3(1/2)-4(1/2)^3=1$."),
        commonErrors: ["Using the cosine triple-angle identity.", "Forgetting the cube on $\\sin x$."],
        workedSolution: [{ part: "a", explanation: "$\\sin90^\\circ=3\\sin30^\\circ-4\\sin^330^\\circ=3/2-4(1/8)=1$." }],
      },
      {
        responseType: "saq",
        questionLatex: "\\text{Deduce the identity for }\\cos3x\\text{ from }\\cos(2x+x).",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "triple_angle", "derivation"],
        parts: [
          { letter: "a", promptMarkdown: "Write $\\cos(2x+x)$ using the cosine sum formula.", points: 1 },
          { letter: "b", promptMarkdown: "Deduce $\\cos3x=4\\cos^3x-3\\cos x$.", points: 3 },
        ],
        hints: ["Use $\\cos(A+B)=\\cos A\\cos B-\\sin A\\sin B$.", "Substitute $A=2x$ and $B=x$.", "Use $\\cos2x=2\\cos^2x-1$ and $\\sin2x=2\\sin x\\cos x$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\cos2x\\cos x-\\sin2x\\sin x$." },
            { part: "b", points: 3, description: "Simplifies to $4\\cos^3x-3\\cos x$." },
          ],
        },
        commonErrors: ["Using a plus sign in the cosine sum formula.", "Stopping before converting $\\sin^2x$ to $1-\\cos^2x$."],
        workedSolution: [
          { part: "a", explanation: "$\\cos3x=\\cos(2x+x)=\\cos2x\\cos x-\\sin2x\\sin x$." },
          { part: "b", explanation: "Substitute $\\cos2x=2\\cos^2x-1$ and $\\sin2x=2\\sin x\\cos x$, then use $\\sin^2x=1-\\cos^2x$ to get $4\\cos^3x-3\\cos x$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: "\\text{For an angle }x\\text{ with }\\tan x=2,\\text{ the expressions below are defined.}",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "tan_double_angle", "tan_triple_angle"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\tan2x$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $\\tan3x$ using the triple-angle identity.", points: 3 },
        ],
        hints: ["Use $t=\\tan x$.", "$\\tan2x=2t/(1-t^2)$.", "$\\tan3x=(3t-t^3)/(1-3t^2)$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $-4/3$." },
            { part: "b", points: 3, description: "Finds $2/11$." },
          ],
        },
        commonErrors: ["Using $1+t^2$ in the denominator of $\\tan2x$.", "Forgetting the minus sign in $1-3t^2$."],
        workedSolution: [
          { part: "a", explanation: "With $t=2$, $\\tan2x=\\frac{2t}{1-t^2}=\\frac4{1-4}=-\\frac43$." },
          { part: "b", explanation: "$\\tan3x=\\frac{3t-t^3}{1-3t^2}=\\frac{6-8}{1-12}=\\frac{-2}{-11}=\\frac{2}{11}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: "\\text{Let }x\\text{ be acute with }\\sin x=\\frac35\\text{ and }\\cos x=\\frac45.",
        difficulty: 4,
        skillTags: ["trigonometric_functions", "case_based", "double_angle", "triple_angle"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\sin2x$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\cos2x$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $\\sin3x$.", points: 1 },
          { letter: "d", promptMarkdown: "A learner claims $\\sin3x=3\\sin x$. Decide whether the claim is correct, and justify.", points: 1 },
        ],
        hints: ["Use $\\sin2x=2\\sin x\\cos x$.", "Use $\\cos2x=\\cos^2x-\\sin^2x$.", "Use $\\sin3x=3\\sin x-4\\sin^3x$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $24/25$." },
            { part: "b", points: 1, description: "Finds $7/25$." },
            { part: "c", points: 1, description: "Finds $117/125$." },
            { part: "d", points: 1, description: "Rejects the claim because the cubic correction term is missing." },
          ],
        },
        commonErrors: ["Using $\\sin3x=3\\sin x$.", "Forgetting to cube $\\sin x$ in the triple-angle identity."],
        workedSolution: [
          { part: "a", explanation: "$\\sin2x=2\\cdot\\frac35\\cdot\\frac45=\\frac{24}{25}$." },
          { part: "b", explanation: "$\\cos2x=\\left(\\frac45\\right)^2-\\left(\\frac35\\right)^2=\\frac7{25}$." },
          { part: "c", explanation: "$\\sin3x=3\\cdot\\frac35-4\\left(\\frac35\\right)^3=\\frac{117}{125}$." },
          { part: "d", explanation: "The claim is false because the identity is $\\sin3x=3\\sin x-4\\sin^3x$, so the term $-4\\sin^3x$ cannot be dropped." },
        ],
      },
    ],
  },
];

export const setsFunctionsTopics: Topic[] = topicSeeds.map(makeTopic);
