import { answerRubric } from "../../../lib/content/answer-rubric";
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
import { calibrateCbseChemistryDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-chemistry-11";
const UNIT = "practicals-projects";
const VERSION = "0.1.4";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type SolutionStepSeed = Omit<SolutionStep, "step"> & { step?: number };

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStepSeed[];
  figure?: ItemFigure;
  calculatorAllowed?: boolean;
  commonMisconceptions?: string[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  parts: readonly FrqPart[];
  hints: readonly [string, string, string];
  rubric: FrqRubric;
  commonErrors: readonly string[];
  workedSolution: readonly FrqSolutionPart[];
  figure?: ItemFigure;
  calculatorAllowed?: boolean;
  commonMisconceptions?: string[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function topicNumber(topicCode: string) {
  return Number(topicCode.split(".")[1] ?? 1);
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|xrightarrow|le|ge|neq|mu|sqrt|sigma|pi|pm)\b/g,
        "$1\\$2",
      ),
  );
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairStep(step: SolutionStepSeed, index: number): SolutionStep {
  return {
    step: step.step ?? index + 1,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the apparatus, observation, endpoint, confirmatory test, calculation, control variable or safety precaution before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    const fallbackRationale =
      seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter);
    return {
      text: repairInlineLatex(seed.choices[choiceIndex]),
      isCorrect,
      rationaleIfWrong: isCorrect ? null : repairInlineLatex(fallbackRationale),
      misconceptionTag: isCorrect
        ? null
        : "incorrect_cbse_class11_chemistry_practical_reasoning",
    };
  });

  const correctSeedIndex = LETTERS.indexOf(seed.correctLetter);
  const globalMcIndex = (topicNumber(meta.topicCode) - 1) * 5 + index;
  const targetCorrectIndex = (globalMcIndex * 3 + 1) % LETTERS.length;
  const rotation =
    (correctSeedIndex - targetCorrectIndex + LETTERS.length) % LETTERS.length;
  const orderedChoices = [
    ...unletteredChoices.slice(rotation),
    ...unletteredChoices.slice(0, rotation),
  ];

  const choices = orderedChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];

  return {
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "answers_lab_question_from_memory_without_checking_observation_or_precaution",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairStep),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_final_result_without_observation_principle_or_error_source",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map((part) => ({
      ...part,
      promptMarkdown: repairInlineLatex(part.promptMarkdown),
    })),
    hintLadder: hints(seed.hints),
    rubric: {
      maxPoints: seed.rubric.maxPoints,
      criteria: seed.rubric.criteria.map((criterion) => ({
        ...criterion,
        description: repairInlineLatex(criterion.description),
      })),
    },
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map((part) => ({
      ...part,
      explanation: repairInlineLatex(part.explanation),
      ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
    })),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeTopic(seed: TopicSeed): Topic {
  return {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
    items: [
      ...seed.mc.map((item, index) => makeMc(seed, item, index)),
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
    ],
  };
}

function parts(items: readonly [string, string, number][]): FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) => ({
    letter,
    promptMarkdown: repairInlineLatex(promptMarkdown),
    points,
  }));
}

function onePart(promptMarkdown: string, marks = 1): FrqPart[] {
  return parts([["a", promptMarkdown, marks]]);
}

function rubric(items: readonly FrqPart[], solutions: readonly FrqSolutionPart[]): FrqRubric {
  return answerRubric(items, solutions);
}

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hintsInput: readonly [string, string, string],
  solution: readonly SolutionStepSeed[],
  figure?: ItemFigure,
  calculatorAllowed?: boolean,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints: hintsInput,
    solution,
    ...(figure ? { figure } : {}),
    ...(calculatorAllowed === undefined ? {} : { calculatorAllowed }),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  frqParts: readonly FrqPart[],
  hintsInput: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
  calculatorAllowed?: boolean,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts: frqParts,
    hints: hintsInput,
    rubric: rubric(frqParts, workedSolution),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
    ...(calculatorAllowed === undefined ? {} : { calculatorAllowed }),
  };
}

const purificationFigure: ItemFigure = {
  type: "svg",
  title: "Purification and melting-point checks",
  description:
    "A lab sketch connecting hot filtration, crystallisation and melting-point range checks.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="36" y="42" font-size="20">Crystallisation path</text>
    <rect x="38" y="74" width="150" height="58" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="58" y="108" font-size="16">hot solution</text>
    <path d="M198 103 H272" stroke="#334155" stroke-width="3" marker-end="url(#arrow)"/>
    <rect x="282" y="70" width="160" height="66" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    <text x="304" y="98" font-size="16">hot filtration</text>
    <text x="309" y="120" font-size="13">insoluble impurity held back</text>
    <path d="M452 103 H526" stroke="#334155" stroke-width="3" marker-end="url(#arrow)"/>
    <rect x="536" y="74" width="142" height="58" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <text x="558" y="108" font-size="16">cool slowly</text>
    <text x="42" y="190" font-size="20">Melting-point capillary</text>
    <rect x="76" y="242" width="130" height="104" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
    <text x="92" y="235" font-size="14">oil bath</text>
    <line x1="142" y1="182" x2="142" y2="348" stroke="#0f172a" stroke-width="4"/>
    <rect x="210" y="198" width="18" height="145" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>
    <text x="236" y="242" font-size="15">thermometer</text>
    <text x="236" y="267" font-size="14">sample beside bulb</text>
    <rect x="438" y="196" width="214" height="116" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="462" y="226" font-size="16">Pure sample</text>
    <text x="462" y="252" font-size="15">sharp melting range</text>
    <text x="462" y="282" font-size="16">Impure sample</text>
    <text x="462" y="306" font-size="15">lower, broader range</text>
  </g>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0 0 L10 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
</svg>`,
};

const phEquilibriumFigure: ItemFigure = {
  type: "svg",
  title: "pH and equilibrium observations",
  description:
    "Observation cards for pH comparison and Fe3+/SCN- equilibrium shift.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="36" y="42" font-size="20">pH paper observations</text>
    <rect x="38" y="74" width="286" height="164" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="62" y="108" font-size="16">Solution A: red, pH about 1</text>
    <text x="62" y="142" font-size="16">Solution B: orange, pH about 3</text>
    <text x="62" y="176" font-size="16">Solution C: green, pH about 7</text>
    <text x="62" y="210" font-size="16">Solution D: blue, pH about 11</text>
    <text x="398" y="42" font-size="20">Equilibrium shift</text>
    <text x="390" y="82" font-size="15">Fe3+ + SCN- gives a red complex</text>
    <g transform="translate(392 112)">
      <rect x="0" y="0" width="70" height="160" rx="22" fill="#fee2e2" stroke="#334155" stroke-width="2"/>
      <rect x="10" y="72" width="50" height="78" rx="16" fill="#fecaca"/>
      <text x="4" y="184" font-size="13">initial</text>
    </g>
    <g transform="translate(506 112)">
      <rect x="0" y="0" width="70" height="160" rx="22" fill="#fee2e2" stroke="#334155" stroke-width="2"/>
      <rect x="10" y="54" width="50" height="96" rx="16" fill="#f87171"/>
      <text x="-3" y="184" font-size="13">after Fe3+</text>
    </g>
    <g transform="translate(620 112)">
      <rect x="0" y="0" width="70" height="160" rx="22" fill="#fee2e2" stroke="#334155" stroke-width="2"/>
      <rect x="10" y="94" width="50" height="56" rx="16" fill="#fee2e2"/>
      <text x="8" y="184" font-size="13">diluted</text>
    </g>
    <text x="92" y="306" font-size="18">Use colour only after matching with the chart immediately.</text>
    <text x="92" y="334" font-size="16">Old or wet pH paper gives unreliable comparisons.</text>
  </g>
</svg>`,
};

const titrationFigure: ItemFigure = {
  type: "svg",
  title: "Acid-base titration apparatus",
  description:
    "Burette, pipette, conical flask and correct meniscus-reading position.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="44" y="42" font-size="20">Titration setup</text>
    <line x1="166" y1="70" x2="166" y2="362" stroke="#475569" stroke-width="6"/>
    <line x1="120" y1="360" x2="214" y2="360" stroke="#475569" stroke-width="6"/>
    <rect x="246" y="56" width="32" height="224" rx="12" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>
    <line x1="262" y1="280" x2="262" y2="328" stroke="#0369a1" stroke-width="3"/>
    <path d="M248 102 H276 M248 132 H276 M248 162 H276 M248 192 H276 M248 222 H276" stroke="#0f172a" stroke-width="1.5"/>
    <text x="292" y="92" font-size="16">burette</text>
    <text x="292" y="116" font-size="14">rinse with titrant</text>
    <path d="M218 350 L308 350 L286 292 L240 292 Z" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    <text x="322" y="330" font-size="16">conical flask</text>
    <text x="322" y="354" font-size="14">analyte + indicator</text>
    <line x1="506" y1="86" x2="506" y2="266" stroke="#2563eb" stroke-width="10" stroke-linecap="round"/>
    <circle cx="506" cy="176" r="18" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
    <text x="532" y="164" font-size="16">pipette</text>
    <text x="532" y="188" font-size="14">rinse with solution</text>
    <rect x="468" y="298" width="178" height="74" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <path d="M492 334 Q548 312 604 334" fill="none" stroke="#2563eb" stroke-width="3"/>
    <line x1="492" y1="334" x2="604" y2="334" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="498" y="350" font-size="14">read lower meniscus</text>
    <text x="498" y="368" font-size="14">at eye level</text>
  </g>
</svg>`,
};

const saltAnalysisFigure: ItemFigure = {
  type: "svg",
  title: "Salt-analysis observation bank",
  description:
    "A compact observation board for common Class XI anion and cation tests.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="36" y="42" font-size="20">Observation board</text>
    <rect x="40" y="70" width="298" height="120" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="60" y="102" font-size="16">dilute acid + salt: gas evolves</text>
    <text x="60" y="132" font-size="16">gas turns lime water milky</text>
    <text x="60" y="162" font-size="15">carbonate is suspected</text>
    <rect x="382" y="70" width="286" height="120" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="402" y="102" font-size="16">NaOH + salt on warming</text>
    <text x="402" y="132" font-size="16">pungent gas turns red litmus blue</text>
    <text x="402" y="162" font-size="15">ammonium ion is suspected</text>
    <rect x="40" y="238" width="298" height="120" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="60" y="270" font-size="16">AgNO3: white precipitate</text>
    <text x="60" y="300" font-size="16">precipitate dissolves in NH4OH</text>
    <text x="60" y="330" font-size="15">chloride is confirmed</text>
    <rect x="382" y="238" width="286" height="120" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="402" y="270" font-size="16">BaCl2: white precipitate</text>
    <text x="402" y="300" font-size="16">insoluble in dilute HCl</text>
    <text x="402" y="330" font-size="15">sulphate is confirmed</text>
  </g>
</svg>`,
};

const lassaigneProjectFigure: ItemFigure = {
  type: "svg",
  title: "Organic element test and project controls",
  description:
    "Flow chart linking sodium fusion extract with fair-test planning for projects.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="36" y="42" font-size="20">Lassaigne extract path</text>
    <rect x="42" y="80" width="160" height="60" rx="8" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
    <text x="62" y="116" font-size="16">organic compound</text>
    <path d="M212 110 H292" stroke="#334155" stroke-width="3" marker-end="url(#arrow)"/>
    <rect x="304" y="80" width="150" height="60" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    <text x="329" y="106" font-size="16">sodium fusion</text>
    <text x="333" y="128" font-size="13">dry test tube</text>
    <path d="M464 110 H544" stroke="#334155" stroke-width="3" marker-end="url(#arrow)"/>
    <rect x="554" y="80" width="128" height="60" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <text x="574" y="106" font-size="16">aqueous</text>
    <text x="574" y="128" font-size="16">extract</text>
    <rect x="54" y="212" width="604" height="150" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <text x="76" y="246" font-size="18">Project fair-test checklist</text>
    <text x="92" y="282" font-size="16">Change one factor at a time.</text>
    <text x="92" y="314" font-size="16">Keep volume, time, temperature and sample mass controlled.</text>
    <text x="92" y="346" font-size="16">Record repeated observations before drawing conclusion.</text>
  </g>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0 0 L10 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "Lab.1",
    title: "Laboratory Techniques and Purification",
    subtopic:
      "Glass working, cork boring, melting point, boiling point and crystallisation.",
    mc: [
      mc(
        L`While bending a glass tube in the laboratory, the most important reason for rotating the tube continuously in the flame is to`,
        2,
        ["glass_working", "heating_precaution"],
        [
          L`heat the tube uniformly before bending`,
          L`increase the temperature above the glass softening range as fast as possible`,
          L`keep the tube in contact with the luminous zone of the flame`,
          L`make the tube thinner at the bending point`,
        ],
        "A",
        {
          B: L`Fast local heating can crack or collapse the tube instead of giving a smooth bend.`,
          C: L`The luminous zone is cooler and sooty; uniform softening is the key point.`,
          D: L`Thinning is not the aim in bending; uniform softening is.`,
        },
        [
          L`Think about what happens if only one side becomes soft.`,
          L`Uniform heating prevents local stress.`,
          L`A smooth bend is obtained only after the glass softens evenly.`,
        ],
        [
          {
            explanation: L`Continuous rotation exposes all sides of the tube to heat, so the glass softens uniformly and bends smoothly without cracking or flattening.`,
          },
        ],
      ),
      mc(
        L`A student records melting ranges for four recrystallised benzoic acid samples. Which record most strongly suggests the purest sample?`,
        2,
        ["melting_point", "purity_check"],
        [
          L`$119-123^\circ\mathrm{C}$`,
          L`$121-122^\circ\mathrm{C}$`,
          L`$115-122^\circ\mathrm{C}$`,
          L`$108-116^\circ\mathrm{C}$`,
        ],
        "B",
        {
          A: L`A four-degree range is broader than expected for a purer sample.`,
          C: L`This is broad and begins too low, suggesting impurity.`,
          D: L`This is both low and broad, so it indicates significant impurity.`,
        },
        [
          L`Impurity usually lowers and broadens the melting range.`,
          L`A pure crystalline substance melts sharply.`,
          L`Choose the narrow range closest to the accepted melting point.`,
        ],
        [
          {
            explanation: L`A purer sample gives a sharper melting range. The range $121-122^\circ\mathrm{C}$ is the narrowest and close to benzoic acid's expected melting point.`,
          },
        ],
      ),
      mc(
        L`During crystallisation of impure copper sulphate, the correct reason for filtering the hot saturated solution before cooling is that`,
        3,
        ["crystallisation", "hot_filtration"],
        [
          L`cooling before filtration increases crystal size`,
          L`hot filtration removes insoluble impurity before crystals separate`,
          L`filtration converts copper sulphate into anhydrous salt`,
          L`cooling first removes soluble impurity more completely`,
        ],
        "B",
        {
          A: L`Crystal size is not the reason for hot filtration; removing insoluble matter before crystallisation is.`,
          C: L`Filtration does not dehydrate copper sulphate.`,
          D: L`Cooling first would allow desired crystals to form along with trapped impurities on the filter.`,
        },
        [
          L`Ask which impurity can be removed by a filter paper.`,
          L`The desired solute should still be dissolved during filtration.`,
          L`Hot filtration is done before the crystals appear.`,
        ],
        [
          {
            explanation: L`Insoluble impurities are removed while the desired compound remains dissolved in the hot saturated solution. On cooling, purer crystals separate.`,
          },
        ],
      ),
      mc(
        L`In determining boiling point by distillation, the thermometer bulb should be placed`,
        2,
        ["boiling_point", "apparatus_position"],
        [
          L`deep inside the boiling liquid`,
          L`near the side arm where vapour passes into the condenser`,
          L`outside the flask to avoid contamination`,
          L`touching the bottom of the flask`,
        ],
        "B",
        {
          A: L`The boiling-point reading should be the vapour temperature, not a locally superheated liquid temperature.`,
          C: L`Outside the flask does not measure the vapour temperature.`,
          D: L`Touching glass can give an erroneous temperature.`,
        },
        [
          L`Boiling point is read from the vapour, not the glass wall.`,
          L`The thermometer must sense vapours leaving the flask.`,
          L`Place the bulb at the level of the side arm.`,
        ],
        [
          {
            explanation: L`The bulb is placed near the side arm so that vapours condensing into the side arm are at the measured boiling temperature.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): A cork borer is often lubricated before boring a cork. Reason (R): Lubrication reduces friction and helps obtain a smoother hole without tearing the cork.`,
        3,
        ["assertion_reason", "cork_boring"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains why lubrication is useful during cork boring.`,
          C: L`Lubrication does reduce friction and tearing.`,
          D: L`The assertion is true in standard cork-boring practice.`,
        },
        [
          L`Judge the practical step first.`,
          L`Think about friction between borer and cork.`,
          L`A smooth hole is needed for air-tight fitting.`,
        ],
        [
          {
            explanation: L`Both statements are true. Lubrication reduces friction, so the borer cuts more smoothly and the cork is less likely to tear.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why is a freshly cut end of a glass tube rounded in a flame before use?`,
        1,
        ["glass_working", "safety"],
        onePart(L`Give the reason.`, 1),
        [
          L`Think about the edge after cutting.`,
          L`Sharp glass can injure the hand or damage rubber tubing.`,
          L`Fire-polishing rounds the sharp edge.`,
        ],
        [
          {
            part: "a",
            explanation: L`The cut end is sharp, so it is rounded or fire-polished to prevent injury and to avoid tearing rubber tubing or cork fittings.`,
          },
        ],
        [L`Saying it is done only to make the tube look neat.`],
      ),
      frq(
        "saq",
        L`A crude organic solid melts over $96-104^\circ\mathrm{C}$. After crystallisation it melts over $101-102^\circ\mathrm{C}$. What does this change show?`,
        2,
        ["melting_point", "purity_inference"],
        onePart(L`Infer the change in purity and justify from melting range.`, 2),
        [
          L`Compare width of the ranges.`,
          L`Impurity lowers and broadens melting range.`,
          L`A sharper, higher range after crystallisation indicates improved purity.`,
        ],
        [
          {
            part: "a",
            explanation: L`The sample has become purer. The melting range changes from broad and lower to narrow and higher, which is the expected effect of removing impurities by crystallisation.`,
            markingPoints: [
              L`Infers that the sample has become purer after crystallisation.`,
              L`Justifies this with the narrower, higher melting range: $101-102^\circ\mathrm{C}$ instead of $96-104^\circ\mathrm{C}$.`,
            ],
          },
        ],
        [L`Only comparing the final temperature without discussing range width.`],
      ),
      frq(
        "saq",
        L`In crystallising alum, a student evaporates the solution to complete dryness before cooling. State the mistake and its likely effect.`,
        2,
        ["crystallisation", "source_of_error"],
        parts([
          ["a", L`Identify the procedural mistake.`, 1],
          ["b", L`State one likely effect on the product.`, 1],
        ]),
        [
          L`Crystallisation needs a hot saturated solution, not dry residue.`,
          L`Overheating can trap impurities or decompose/harden the residue.`,
          L`Controlled cooling gives better crystals.`,
        ],
        [
          {
            part: "a",
            explanation: L`The solution should be concentrated to near saturation, not evaporated to complete dryness.`,
          },
          {
            part: "b",
            explanation: L`The residue may contain trapped impurities and may not form well-shaped crystals; overheating can also spoil the product quality.`,
          },
        ],
        [L`Treating crystallisation as simple evaporation to dryness.`],
      ),
      frq(
        "laq",
        L`Use the purification figure to write a short practical plan for obtaining purer crystals from an impure soluble solid.`,
        3,
        ["crystallisation_plan", "figure_reasoning"],
        parts([
          ["a", L`Mention the role of hot solvent and hot filtration.`, 1],
          ["b", L`Explain why cooling is done after filtration.`, 1],
          ["c", L`State how melting point can be used to judge improvement in purity.`, 1],
        ]),
        [
          L`The desired compound should dissolve hot.`,
          L`Insoluble impurity is removed before crystals appear.`,
          L`A pure substance has a sharp melting range.`,
        ],
        [
          {
            part: "a",
            explanation: L`Dissolve the impure solid in minimum hot solvent and filter hot to remove insoluble impurity while the desired solid is still dissolved.`,
          },
          {
            part: "b",
            explanation: L`Cooling after filtration lets the desired compound crystallise from the clear solution, reducing impurity trapped in crystals.`,
          },
          {
            part: "c",
            explanation: L`A sharper and less depressed melting range after crystallisation indicates higher purity.`,
          },
        ],
        [
          L`Cooling before filtration so that desired crystals are caught with insoluble impurity.`,
          L`Using melting point as a mass-yield test instead of a purity test.`,
        ],
        purificationFigure,
      ),
      frq(
        "case",
        L`A student recrystallises benzoic acid. The hot solution is filtered, then cooled slowly. Crystals form, but the student washes them with a large volume of hot water.`,
        3,
        ["crystallisation_case", "washing_precaution"],
        parts([
          ["a", L`Why was the solution filtered while hot?`, 1],
          ["b", L`Why is slow cooling preferred?`, 1],
          ["c", L`Why is washing with a large volume of hot water a poor choice?`, 1],
        ]),
        [
          L`Filter before crystals separate.`,
          L`Slow cooling favours better crystal growth.`,
          L`Benzoic acid has greater solubility in hot water than in cold water.`,
        ],
        [
          {
            part: "a",
            explanation: L`Hot filtration removes insoluble impurities while benzoic acid remains dissolved.`,
          },
          {
            part: "b",
            explanation: L`Slow cooling helps form better crystals and reduces trapping of impurities.`,
          },
          {
            part: "c",
            explanation: L`A large volume of hot water can dissolve appreciable benzoic acid, lowering the yield of crystals.`,
          },
        ],
        [L`Assuming more hot washing always improves purity without considering solubility loss.`],
      ),
    ],
  },
  {
    topicCode: "Lab.2",
    title: "pH and Equilibrium Experiments",
    subtopic:
      "pH paper, universal indicator, strong/weak acid comparison, common-ion effect and equilibrium shift.",
    mc: [
      mc(
        L`Two acids of the same concentration are tested with pH paper. Acid X gives pH about $1$ and acid Y gives pH about $3$. The better inference is that`,
        2,
        ["ph_comparison", "strong_weak_acids"],
        [
          L`Y is stronger because its pH is higher`,
          L`X is stronger because it gives the lower pH at the same concentration`,
          L`both acids must be equally strong because concentration is same`,
          L`pH paper cannot compare acidic solutions at all`,
        ],
        "B",
        {
          A: L`Lower pH means higher hydrogen-ion concentration, so X is stronger here.`,
          C: L`Same analytical concentration does not mean same ionisation.`,
          D: L`pH paper can give a useful approximate comparison when used correctly.`,
        },
        [
          L`Compare hydrogen-ion concentration, not total acid concentration alone.`,
          L`Lower pH means more acidic solution.`,
          L`At the same concentration, a stronger acid gives lower pH.`,
        ],
        [
          {
            explanation: L`At the same concentration, the acid with lower pH is more ionised and produces more hydrogen ions. Therefore X is stronger than Y.`,
          },
        ],
      ),
      mc(
        L`In the common-ion experiment with acetic acid, adding sodium acetate generally causes the pH to`,
        3,
        ["common_ion_effect", "weak_acid"],
        [
          L`decrease sharply because acetate is a strong acid`,
          L`increase because acetate ion suppresses ionisation of acetic acid`,
          L`remain exactly unchanged because the acid concentration is unchanged`,
          L`become $7$ because every salt solution is neutral`,
        ],
        "B",
        {
          A: L`Acetate ion is the conjugate base/common ion, not a strong acid.`,
          C: L`The degree of ionisation changes even if the formal acid concentration is not changed.`,
          D: L`Salt solutions are not automatically neutral, especially with weak-acid/conjugate-base systems.`,
        },
        [
          L`Write the weak-acid equilibrium.`,
          L`Sodium acetate supplies $\mathrm{CH_3COO^-}$.`,
          L`The common ion shifts the equilibrium left, lowering $\mathrm{H^+}$.`,
        ],
        [
          {
            explanation: L`Acetate ion is a common ion for acetic acid. It suppresses ionisation of acetic acid, decreases hydrogen-ion concentration, and hence raises the pH.`,
          },
        ],
      ),
      mc(
        L`In a strong acid-strong base titration followed with universal indicator, the sharpest colour change is expected`,
        2,
        ["universal_indicator", "titration_curve"],
        [
          L`near the equivalence point`,
          L`at the very beginning only`,
          L`only after adding a large excess of acid`,
          L`only if the solutions are weak electrolytes`,
        ],
        "A",
        {
          B: L`At the beginning, pH changes slowly compared with the equivalence region.`,
          C: L`Large excess gives a stable acidic colour, not the sharpest transition.`,
          D: L`Strong acid-strong base titrations themselves show a sharp pH jump.`,
        },
        [
          L`Think about where pH changes most rapidly.`,
          L`Strong acid and strong base neutralise almost completely.`,
          L`Indicator colour changes rapidly near equivalence.`,
        ],
        [
          {
            explanation: L`Near the equivalence point, a small added volume causes a large pH change, so the universal indicator shows the sharpest colour transition.`,
          },
        ],
      ),
      mc(
        L`In the equilibrium $\mathrm{Fe^{3+}+SCN^- \rightleftharpoons [FeSCN]^{2+}}$, adding a few drops of $\mathrm{FeCl_3}$ makes the red colour deeper. This shows that`,
        3,
        ["le_chatelier", "ferric_thiocyanate"],
        [
          L`the equilibrium shifts backward to consume $\mathrm{Fe^{3+}}$`,
          L`the equilibrium shifts forward to consume added $\mathrm{Fe^{3+}}$`,
          L`the complex is destroyed by chloride ion`,
          L`the equilibrium constant becomes zero`,
        ],
        "B",
        {
          A: L`A deeper red colour means more complex, so the forward direction is favoured.`,
          C: L`The observed deeper red colour contradicts destruction of the red complex.`,
          D: L`Changing concentration shifts position; it does not make the equilibrium constant zero.`,
        },
        [
          L`Identify which species is red.`,
          L`Adding a reactant should oppose the change by consuming it.`,
          L`More red complex means forward shift.`,
        ],
        [
          {
            explanation: L`Adding $\mathrm{Fe^{3+}}$ increases a reactant concentration. The equilibrium shifts forward, forming more red $\mathrm{[FeSCN]^{2+}}$ complex.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): A single glass rod may be used to test several solutions with pH paper without cleaning it between tests. Reason (R): Carry-over of solution from one sample can change the colour response of the next pH paper strip.`,
        3,
        ["assertion_reason", "ph_paper_precaution"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "D",
        {
          A: L`The assertion is false: reusing an unclean rod can contaminate the next sample or pH paper strip.`,
          B: L`The assertion is not true, so the issue is not merely whether the reason explains it.`,
          C: L`The reason is true because carry-over contamination can change the observed colour.`,
        },
        [
          L`Ask whether any solution from the first test can reach the second strip.`,
          L`Carry-over between samples is contamination.`,
          L`Use separate clean glass rods, or clean and dry the rod between tests.`,
        ],
        [
          {
            explanation: L`The assertion is false because a glass rod must be cleaned and dried, or a separate clean rod used, between solutions. The reason is true: carry-over solution can change the colour response and make the pH reading unreliable.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why should pH paper not be dipped directly into the stock solution bottle?`,
        1,
        ["ph_paper", "contamination"],
        onePart(L`Give one reason.`, 1),
        [
          L`Think about contamination of the whole bottle.`,
          L`A glass rod can transfer a small drop instead.`,
          L`The stock solution must remain unchanged for other tests.`,
        ],
        [
          {
            part: "a",
            explanation: L`Dipping pH paper directly can contaminate the stock solution. A drop should be taken with a clean glass rod or dropper instead.`,
          },
        ],
        [L`Saying direct dipping is avoided only because pH paper is expensive.`],
      ),
      frq(
        "saq",
        L`Using the pH observation card, identify which solution is most acidic and which is basic. Give the reason from pH values.`,
        2,
        ["ph_scale", "figure_interpretation"],
        parts([
          ["a", L`Identify the most acidic solution.`, 1],
          ["b", L`Identify the basic solution and justify.`, 1],
        ]),
        [
          L`pH below $7$ is acidic; pH above $7$ is basic.`,
          L`The lowest pH is most acidic.`,
          L`The card shows solution D with pH about $11$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Solution A is most acidic because it has the lowest pH, about $1$.`,
          },
          {
            part: "b",
            explanation: L`Solution D is basic because its pH is about $11$, which is greater than $7$.`,
          },
        ],
        [L`Calling green pH $7$ basic instead of neutral.`],
        phEquilibriumFigure,
      ),
      frq(
        "saq",
        L`In an acetic acid-sodium acetate common-ion experiment, explain why the smell of acetic acid alone is not a reliable measure of pH change.`,
        2,
        ["common_ion_effect", "observation_quality"],
        onePart(L`Give a chemistry reason and a practical reason.`, 2),
        [
          L`pH depends on hydrogen-ion concentration.`,
          L`Smell depends on volatility and human perception.`,
          L`Use indicator or pH paper for the experiment.`,
        ],
        [
          {
            part: "a",
            explanation: L`The common-ion effect changes ionisation and hence $\mathrm{H^+}$ concentration, which should be tested with indicator or pH paper. Smell is subjective and depends on vapour reaching the nose, so it is not a reliable pH measure.`,
            markingPoints: [
              L`Explains that the common-ion effect changes ionisation and $\mathrm{H^+}$ concentration, which an indicator or pH measurement can test.`,
              L`Explains that odour is subjective and depends on vapour exposure, so it does not reliably measure pH.`,
            ],
          },
        ],
        [L`Using odour intensity as if it were a quantitative pH reading.`],
      ),
      frq(
        "laq",
        L`A student studies the ferric ion-thiocyanate equilibrium. Write what happens to the red colour when $\mathrm{Fe^{3+}}$ is added and when the mixture is diluted. Explain both observations.`,
        3,
        ["equilibrium_shift", "le_chatelier"],
        parts([
          ["a", L`State the effect of adding $\mathrm{Fe^{3+}}$.`, 1],
          ["b", L`State the effect of dilution.`, 1],
          ["c", L`Explain using Le Chatelier's principle.`, 1],
        ]),
        [
          L`The red species is $\mathrm{[FeSCN]^{2+}}$.`,
          L`Adding a reactant favours product formation.`,
          L`Dilution favours the side with more dissolved particles.`,
        ],
        [
          {
            part: "a",
            explanation: L`On adding $\mathrm{Fe^{3+}}$, the red colour becomes deeper because more $\mathrm{[FeSCN]^{2+}}$ forms.`,
          },
          {
            part: "b",
            explanation: L`On dilution, the red colour becomes lighter.`,
          },
          {
            part: "c",
            explanation: L`Adding a reactant shifts equilibrium forward. Dilution favours the side with more particles, here the separated ions, so the complex concentration decreases.`,
          },
        ],
        [L`Explaining colour change as permanent reaction completion rather than equilibrium shift.`],
        phEquilibriumFigure,
      ),
      frq(
        "case",
        L`A group compares $0.1\,\mathrm{M}$ hydrochloric acid and $0.1\,\mathrm{M}$ acetic acid using pH paper. They use separate clean glass rods and match colours immediately.`,
        3,
        ["strong_weak_acid_case", "fair_test"],
        parts([
          ["a", L`Which acid should show the lower pH?`, 1],
          ["b", L`Why is same concentration important in this comparison?`, 1],
          ["c", L`Why should separate clean glass rods be used?`, 1],
        ]),
        [
          L`Hydrochloric acid is a strong acid.`,
          L`Same concentration isolates the effect of degree of ionisation.`,
          L`A contaminated rod can transfer acid or base between samples.`,
        ],
        [
          {
            part: "a",
            explanation: L`Hydrochloric acid should show the lower pH because it ionises almost completely.`,
          },
          {
            part: "b",
            explanation: L`Using the same concentration makes the comparison depend mainly on ionisation strength, not on unequal amount of acid taken.`,
          },
          {
            part: "c",
            explanation: L`Separate clean rods prevent cross-contamination, which would change pH and colour readings.`,
          },
        ],
        [L`Comparing strong and weak acids at different concentrations and calling it a strength comparison.`],
      ),
    ],
  },
  {
    topicCode: "Lab.3",
    title: "Quantitative Estimation and Titration",
    subtopic:
      "Balance use, standard solutions, pipette-burette technique, endpoints and titration calculations.",
    mc: [
      mc(
        L`Before titrating sodium hydroxide against standard oxalic acid, the burette should be rinsed finally with`,
        2,
        ["titration_apparatus", "rinsing"],
        [
          L`distilled water only`,
          L`the sodium hydroxide solution to be filled in it`,
          L`standard oxalic acid because it is the known solution`,
          L`phenolphthalein solution`,
        ],
        "B",
        {
          A: L`Water left in the burette dilutes the titrant and changes the titre value.`,
          C: L`The burette must be rinsed with the solution it will deliver, not automatically with the standard solution.`,
          D: L`Indicator is added to the conical flask, not used to rinse the burette.`,
        },
        [
          L`Ask which solution remains inside the burette during titration.`,
          L`Any water left in the burette would dilute that solution.`,
          L`Final rinse is done with the solution to be used in that apparatus.`,
        ],
        [
          {
            explanation: L`The burette is finally rinsed with the solution it will contain, here sodium hydroxide, so that no remaining water dilutes it.`,
          },
        ],
      ),
      mc(
        L`The mass of hydrated oxalic acid, $\mathrm{H_2C_2O_4\cdot 2H_2O}$, needed to prepare $250\,\mathrm{mL}$ of $0.100\,\mathrm{M}$ solution is closest to`,
        3,
        ["standard_solution", "molarity_calculation"],
        [
          L`$1.26\,\mathrm{g}$`,
          L`$2.52\,\mathrm{g}$`,
          L`$3.15\,\mathrm{g}$`,
          L`$12.6\,\mathrm{g}$`,
        ],
        "C",
        {
          A: L`This corresponds to $0.010$ mol, not $0.025$ mol.`,
          B: L`This is low; it corresponds to using $0.020$ mol.`,
          D: L`This would be for $0.100$ mol, not $250\,\mathrm{mL}$ of $0.100\,\mathrm{M}$.`,
        },
        [
          L`Use $n=MV$ with $V$ in litres.`,
          L`Molar mass of hydrated oxalic acid is $126\,\mathrm{g\,mol^{-1}}$ approximately.`,
          L`Mass $=0.100\times0.250\times126$.`,
        ],
        [
          {
            explanation: L`The required moles are $0.100\times0.250=0.0250$ mol.`,
            math: L`m=0.0250\times126=3.15\,\mathrm{g}`,
          },
        ],
        undefined,
        true,
      ),
      mc(
        L`For oxalic acid in the flask and sodium hydroxide in the burette with phenolphthalein, the endpoint is the first appearance of`,
        2,
        ["acid_base_titration", "endpoint"],
        [
          L`a permanent pale pink colour`,
          L`a permanent deep red colour`,
          L`a white precipitate`,
          L`blue litmus colour`,
        ],
        "A",
        {
          B: L`Deep red means excess base has been added; endpoint should be faint permanent pink.`,
          C: L`No precipitate marks this acid-base endpoint.`,
          D: L`Litmus is not the specified endpoint indicator here.`,
        },
        [
          L`Phenolphthalein is colourless in acid and pink in base.`,
          L`The flask initially contains acid.`,
          L`At endpoint, a faint pink persists after swirling.`,
        ],
        [
          {
            explanation: L`Phenolphthalein is colourless in acidic solution and turns pink in slightly basic solution. The correct endpoint is a faint permanent pale pink.`,
          },
        ],
      ),
      mc(
        L`Four titre values are $18.6$, $18.7$, $19.4$ and $18.7\,\mathrm{mL}$. Which set should be used for the mean titre?`,
        3,
        ["concordant_readings", "data_handling"],
        [
          L`all four values`,
          L`$18.6$, $18.7$ and $18.7\,\mathrm{mL}$`,
          L`only $19.4\,\mathrm{mL}$`,
          L`$18.6$ and $19.4\,\mathrm{mL}$`,
        ],
        "B",
        {
          A: L`Including the rough/outlier value can bias the mean.`,
          C: L`A single high value is not a concordant titre set.`,
          D: L`These two are far apart and not concordant.`,
        },
        [
          L`Concordant readings are close to one another.`,
          L`Ignore the isolated reading that differs strongly.`,
          L`Use the cluster around $18.6-18.7\,\mathrm{mL}$.`,
        ],
        [
          {
            explanation: L`The readings $18.6$, $18.7$ and $18.7\,\mathrm{mL}$ are close and concordant; $19.4\,\mathrm{mL}$ is an outlier and should not be included in the final mean.`,
          },
        ],
        undefined,
        true,
      ),
      mc(
        L`Assertion (A): The funnel should be removed from the burette before the final burette reading is taken. Reason (R): Phenolphthalein is colourless in acidic solution and pink in slightly basic solution.`,
        3,
        ["assertion_reason", "burette_precaution"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "B",
        {
          A: L`The reason is true, but it explains the endpoint colour, not the removal of the funnel.`,
          C: L`The reason is true; phenolphthalein does change from colourless to pink in this acid-base titration.`,
          D: L`The assertion is true: a funnel left in the burette can allow an extra drop to enter and disturb the reading.`,
        },
        [
          L`Check whether the reason talks about the same precaution as the assertion.`,
          L`The assertion is about burette reading accuracy.`,
          L`The reason is about indicator colour, so it is true but unrelated.`,
        ],
        [
          {
            explanation: L`Both statements are true, but the reason does not explain the assertion. The funnel is removed so that no extra drop enters the burette and changes the reading; phenolphthalein colour explains endpoint detection instead.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why is a pipette not blown out after delivering a fixed volume in volumetric analysis?`,
        1,
        ["pipette", "volumetric_precaution"],
        onePart(L`Give the reason.`, 1),
        [
          L`A volumetric pipette is calibrated for drainage.`,
          L`A small liquid film remains by design.`,
          L`Blowing out adds extra solution.`,
        ],
        [
          {
            part: "a",
            explanation: L`A volumetric pipette is calibrated to deliver its marked volume after normal drainage. Blowing out the remaining drop would deliver extra liquid and cause error.`,
          },
        ],
        [L`Assuming every visible drop must always be blown out.`],
      ),
      frq(
        "saq",
        L`Calculate the molarity of sodium hydroxide if $20.0\,\mathrm{mL}$ of oxalic acid of molarity $0.0500\,\mathrm{M}$ requires $25.0\,\mathrm{mL}$ of sodium hydroxide. Reaction: $\mathrm{H_2C_2O_4+2NaOH\rightarrow Na_2C_2O_4+2H_2O}$.`,
        3,
        ["titration_calculation", "stoichiometry"],
        onePart(L`Find molarity of sodium hydroxide.`, 3),
        [
          L`Find moles of oxalic acid first.`,
          L`Each mole of oxalic acid reacts with two moles of sodium hydroxide.`,
          L`Divide moles of sodium hydroxide by $0.0250\,\mathrm{L}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Moles of oxalic acid $=0.0500\times0.0200=0.00100$ mol. Moles of sodium hydroxide $=2\times0.00100=0.00200$ mol. Therefore molarity of sodium hydroxide is`,
            math: L`M_{\mathrm{NaOH}}=\frac{0.00200}{0.0250}=0.0800\,\mathrm{M}`,
            markingPoints: [
              L`Finds oxalic acid amount: $0.0500\times0.0200=0.00100\,\mathrm{mol}$.`,
              L`Uses the $1:2$ acid-to-base mole ratio to obtain $0.00200\,\mathrm{mol}$ NaOH. Accept correct use of a carried-forward acid amount.`,
              L`Divides NaOH amount by $0.0250\,\mathrm{L}$ to obtain $0.0800\,\mathrm{mol\,L^{-1}}$. Accept a correct carried-forward calculation with units.`,
            ],
          },
        ],
        [L`Forgetting the $1:2$ acid-base stoichiometric ratio.`],
        undefined,
        true,
      ),
      frq(
        "saq",
        L`A student notices an air bubble below the burette jet at the start of titration, but it disappears during titration. How does this affect the titre?`,
        2,
        ["burette_error", "air_bubble"],
        parts([
          ["a", L`State whether the recorded titre is too high or too low.`, 1],
          ["b", L`Explain why.`, 1],
        ]),
        [
          L`Some delivered volume first fills the jet space.`,
          L`That volume is included in the burette reading change.`,
          L`But it did not enter the conical flask.`,
        ],
        [
          {
            part: "a",
            explanation: L`The recorded titre becomes too high.`,
          },
          {
            part: "b",
            explanation: L`Part of the liquid leaving the burette is used to fill the air bubble in the jet rather than entering the flask, but the burette reading still counts it as delivered.`,
          },
        ],
        [L`Thinking the titre is too low simply because less solution initially came out.`],
      ),
      frq(
        "laq",
        L`Use the titration figure to list three apparatus-handling precautions that directly affect titre accuracy.`,
        3,
        ["titration_apparatus", "figure_reasoning"],
        parts([
          ["a", L`Give one burette-related precaution.`, 1],
          ["b", L`Give one pipette-related precaution.`, 1],
          ["c", L`Give one reading or endpoint-related precaution.`, 1],
        ]),
        [
          L`Look at which solution remains in each apparatus.`,
          L`Read the meniscus at eye level.`,
          L`Endpoint should be just permanent, not strongly coloured.`,
        ],
        [
          {
            part: "a",
            explanation: L`Rinse the burette with the titrant and remove air bubbles from the jet before titration.`,
          },
          {
            part: "b",
            explanation: L`Rinse the pipette with the solution to be pipetted and allow normal drainage without blowing out.`,
          },
          {
            part: "c",
            explanation: L`Read the lower meniscus at eye level and stop at the first permanent faint endpoint colour.`,
          },
        ],
        [L`Listing general cleanliness without connecting it to titre accuracy.`],
        titrationFigure,
      ),
      frq(
        "case",
        L`A student prepares $250\,\mathrm{mL}$ standard sodium carbonate solution and titrates it against hydrochloric acid using methyl orange. The endpoint is overshot to a deep red colour in the first trial.`,
        3,
        ["standard_solution_case", "endpoint_error"],
        parts([
          ["a", L`Why should the first overshot trial not be used as the final titre?`, 1],
          ["b", L`What colour change should be approached carefully with methyl orange for acid in burette and carbonate in flask?`, 1],
          ["c", L`Why is a standard flask used in preparing the sodium carbonate solution?`, 1],
        ]),
        [
          L`Overshooting means excess acid has been added.`,
          L`Methyl orange changes from yellow/orange toward red in acidic medium.`,
          L`A standard flask gives an accurate fixed volume.`,
        ],
        [
          {
            part: "a",
            explanation: L`The overshot trial contains excess acid beyond the endpoint, so its titre is not reliable as a concordant final value.`,
          },
          {
            part: "b",
            explanation: L`The endpoint is approached as the yellow solution changes to orange, not a deep red excess-acid colour.`,
          },
          {
            part: "c",
            explanation: L`A standard flask is calibrated to contain an accurate fixed volume, so it is used to prepare a solution of known concentration.`,
          },
        ],
        [L`Using the deepest colour as the endpoint instead of the first suitable colour change.`],
        undefined,
        true,
      ),
    ],
  },
  {
    topicCode: "Lab.4",
    title: "Qualitative Salt Analysis",
    subtopic:
      "Systematic anion and cation tests, confirmatory observations and interference-aware inference.",
    mc: [
      mc(
        L`A salt gives brisk effervescence with dilute hydrochloric acid. The gas turns lime water milky. The anion indicated is`,
        2,
        ["anion_test", "carbonate"],
        [
          L`$\mathrm{SO_4^{2-}}$`,
          L`$\mathrm{CO_3^{2-}}$`,
          L`$\mathrm{Cl^-}$`,
          L`$\mathrm{NO_3^-}$`,
        ],
        "B",
        {
          A: L`Sulphate is confirmed by barium chloride, not by carbon dioxide turning lime water milky.`,
          C: L`Chloride gives a white precipitate with silver nitrate after acidification.`,
          D: L`Nitrate is not identified by lime-water milkiness in this test.`,
        },
        [
          L`Identify the gas that turns lime water milky.`,
          L`Carbon dioxide is released from carbonates by dilute acids.`,
          L`Carbon dioxide gives calcium carbonate in lime water.`,
        ],
        [
          {
            explanation: L`Carbonates react with dilute acid to release carbon dioxide. Carbon dioxide turns lime water milky due to formation of calcium carbonate.`,
            math: L`\mathrm{CO_3^{2-}+2H^+\rightarrow CO_2+H_2O}`,
          },
        ],
      ),
      mc(
        L`A salt warmed with sodium hydroxide gives a pungent gas that turns moist red litmus blue. The cation indicated is`,
        2,
        ["cation_test", "ammonium"],
        [
          L`$\mathrm{NH_4^+}$`,
          L`$\mathrm{Cu^{2+}}$`,
          L`$\mathrm{Ba^{2+}}$`,
          L`$\mathrm{Al^{3+}}$`,
        ],
        "A",
        {
          B: L`Copper(II) gives a blue precipitate with sodium hydroxide, not ammonia gas from warming with alkali.`,
          C: L`Barium(II) does not give ammonia on warming with sodium hydroxide.`,
          D: L`Aluminium(III) gives a gelatinous hydroxide precipitate, not pungent ammonia gas.`,
        },
        [
          L`The gas is basic and pungent.`,
          L`Ammonium salts release ammonia with strong alkali.`,
          L`Ammonia turns moist red litmus blue.`,
        ],
        [
          {
            explanation: L`Ammonium ions react with sodium hydroxide on warming to release ammonia gas, which turns moist red litmus blue.`,
            math: L`\mathrm{NH_4^+ + OH^- \rightarrow NH_3 + H_2O}`,
          },
        ],
      ),
      mc(
        L`A solution gives a white precipitate with silver nitrate after acidification with dilute nitric acid. The precipitate dissolves in ammonium hydroxide. The anion is most likely`,
        3,
        ["anion_test", "chloride"],
        [
          L`$\mathrm{Cl^-}$`,
          L`$\mathrm{SO_4^{2-}}$`,
          L`$\mathrm{CO_3^{2-}}$`,
          L`$\mathrm{CH_3COO^-}$`,
        ],
        "A",
        {
          B: L`Sulphate gives a barium sulphate precipitate insoluble in dilute acid, not this silver nitrate confirmation.`,
          C: L`Carbonate would effervesce with acid and can interfere if not removed.`,
          D: L`Acetate is identified differently, often by vinegar-like smell after acidification or ester test.`,
        },
        [
          L`Acidification removes carbonate-type interference.`,
          L`Silver chloride is white.`,
          L`Silver chloride dissolves in ammonium hydroxide.`,
        ],
        [
          {
            explanation: L`The observations match chloride: $\mathrm{AgCl}$ is a white precipitate and dissolves in ammonium hydroxide due to complex formation.`,
            math: L`\mathrm{Ag^+ + Cl^- \rightarrow AgCl(s)}`,
          },
        ],
      ),
      mc(
        L`A white precipitate with barium chloride remains insoluble in dilute hydrochloric acid. This is the confirmatory observation for`,
        2,
        ["anion_test", "sulphate"],
        [
          L`$\mathrm{SO_4^{2-}}$`,
          L`$\mathrm{CO_3^{2-}}$`,
          L`$\mathrm{S^{2-}}$`,
          L`$\mathrm{NO_2^-}$`,
        ],
        "A",
        {
          B: L`Barium carbonate dissolves in dilute acid with effervescence, unlike barium sulphate.`,
          C: L`Sulphide gives different observations such as lead sulphide formation.`,
          D: L`Nitrite is not confirmed by acid-insoluble barium sulphate.`,
        },
        [
          L`Barium sulphate is very insoluble.`,
          L`Dilute acid helps distinguish sulphate from carbonate.`,
          L`The persistent white precipitate points to sulphate.`,
        ],
        [
          {
            explanation: L`Sulphate ions form white barium sulphate with barium chloride, and $\mathrm{BaSO_4}$ remains insoluble in dilute hydrochloric acid.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Confirmatory tests should be performed after preliminary tests in salt analysis. Reason (R): Preliminary tests alone can be misleading because different ions may give similar early observations.`,
        3,
        ["assertion_reason", "salt_analysis_method"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains why confirmatory tests are necessary.`,
          C: L`Preliminary observations can indeed overlap, so the reason is true.`,
          D: L`The assertion is standard practical method.`,
        },
        [
          L`Preliminary tests narrow possibilities.`,
          L`Confirmatory tests establish identity more securely.`,
          L`Similar gases or precipitates can appear in early tests.`,
        ],
        [
          {
            explanation: L`Both statements are true. Preliminary tests suggest possible ions, but confirmatory tests are needed because similar early observations can occur for different ions.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why are insoluble salts excluded from the prescribed Class XI qualitative salt-analysis list?`,
        1,
        ["salt_analysis_scope", "solubility"],
        onePart(L`Give the practical reason.`, 1),
        [
          L`Most confirmatory tests use aqueous solution of the salt.`,
          L`Insoluble salts are harder to bring into solution.`,
          L`The prescribed school exercise focuses on soluble salts.`,
        ],
        [
          {
            part: "a",
            explanation: L`The prescribed tests usually require ions to be present in solution. Insoluble salts need extra treatment and are therefore excluded from the school-level list.`,
          },
        ],
        [L`Saying insoluble salts do not contain ions.`],
      ),
      frq(
        "saq",
        L`A salt gives a gas with dilute acid. The gas smells like rotten eggs and blackens lead acetate paper. Identify the anion and write the confirmatory product.`,
        2,
        ["sulphide_test", "observation_inference"],
        parts([
          ["a", L`Identify the anion.`, 1],
          ["b", L`Name or formula of the black product.`, 1],
        ]),
        [
          L`Rotten-egg smell indicates hydrogen sulphide.`,
          L`Lead acetate paper blackens due to lead sulphide.`,
          L`The anion is sulphide.`,
        ],
        [
          {
            part: "a",
            explanation: L`The anion is sulphide, $\mathrm{S^{2-}}$.`,
          },
          {
            part: "b",
            explanation: L`The black product is lead sulphide, $\mathrm{PbS}$.`,
          },
        ],
        [L`Confusing hydrogen sulphide smell with carbon dioxide, which is odourless.`],
      ),
      frq(
        "saq",
        L`A solution gives a white precipitate with sodium hydroxide. The precipitate dissolves in excess sodium hydroxide. Name one possible cation and the property shown by its hydroxide.`,
        2,
        ["cation_test", "amphoteric_hydroxide"],
        parts([
          ["a", L`Name one possible cation.`, 1],
          ["b", L`State the property of the hydroxide.`, 1],
        ]),
        [
          L`Think of amphoteric hydroxides in the Class XI list.`,
          L`Aluminium and zinc hydroxides dissolve in excess alkali.`,
          L`State amphoteric behaviour, not just solubility.`,
        ],
        [
          {
            part: "a",
            explanation: L`One possible cation is $\mathrm{Al^{3+}}$ or $\mathrm{Zn^{2+}}$.`,
          },
          {
            part: "b",
            explanation: L`Its hydroxide is amphoteric, so it dissolves in excess sodium hydroxide.`,
          },
        ],
        [L`Naming calcium or barium only because they form white precipitates, without checking excess alkali behaviour.`],
      ),
      frq(
        "laq",
        L`Use the salt-analysis observation board to distinguish carbonate, ammonium, chloride and sulphate using one key observation each.`,
        4,
        ["salt_analysis_table", "figure_reasoning"],
        parts([
          ["a", L`State the carbonate observation.`, 1],
          ["b", L`State the ammonium observation.`, 1],
          ["c", L`State the chloride observation.`, 1],
          ["d", L`State the sulphate observation.`, 1],
        ]),
        [
          L`Carbonate gives carbon dioxide with acid.`,
          L`Ammonium gives ammonia with alkali on warming.`,
          L`Chloride and sulphate are distinguished by silver nitrate and barium chloride tests.`,
        ],
        [
          {
            part: "a",
            explanation: L`Carbonate gives effervescence with dilute acid and the gas turns lime water milky.`,
          },
          {
            part: "b",
            explanation: L`Ammonium gives ammonia on warming with sodium hydroxide; the gas turns moist red litmus blue.`,
          },
          {
            part: "c",
            explanation: L`Chloride gives a white precipitate with silver nitrate after acidification, soluble in ammonium hydroxide.`,
          },
          {
            part: "d",
            explanation: L`Sulphate gives a white precipitate with barium chloride that is insoluble in dilute hydrochloric acid.`,
          },
        ],
        [L`Using one white precipitate observation for all anions without confirmatory difference.`],
        saltAnalysisFigure,
      ),
      frq(
        "case",
        L`A salt solution is tested. With dilute acid it gives no effervescence. With barium chloride it gives a white precipitate that remains after adding dilute hydrochloric acid. With sodium hydroxide it gives no pungent gas on warming.`,
        3,
        ["salt_analysis_case", "sequential_inference"],
        parts([
          ["a", L`Which anion is indicated?`, 1],
          ["b", L`Which common anion is ruled out by no effervescence with dilute acid?`, 1],
          ["c", L`Which cation is ruled out by no pungent gas with sodium hydroxide?`, 1],
        ]),
        [
          L`Persistent barium chloride precipitate points to sulphate.`,
          L`No effervescence makes carbonate unlikely.`,
          L`No ammonia gas rules out ammonium ion in this simple test.`,
        ],
        [
          {
            part: "a",
            explanation: L`The anion indicated is sulphate, $\mathrm{SO_4^{2-}}$.`,
          },
          {
            part: "b",
            explanation: L`Carbonate is ruled out because carbonate would effervesce with dilute acid.`,
          },
          {
            part: "c",
            explanation: L`Ammonium ion is ruled out because ammonium salts give pungent ammonia with sodium hydroxide on warming.`,
          },
        ],
        [L`Ignoring negative tests even when they rule out common ions.`],
      ),
    ],
  },
  {
    topicCode: "Lab.5",
    title: "Organic Element Detection and Project Work",
    subtopic:
      "Detection of nitrogen, sulphur and chlorine in organic compounds, and investigatory-project design.",
    mc: [
      mc(
        L`In Lassaigne's test, sodium fusion is done mainly to`,
        2,
        ["lassaigne_test", "principle"],
        [
          L`convert covalently bonded elements into water-soluble ionic salts`,
          L`burn the organic compound completely to carbon dioxide`,
          L`remove all carbon from the compound before testing`,
          L`measure the molecular mass of the compound`,
        ],
        "A",
        {
          B: L`Complete combustion is not the aim; the elements are converted into ionic sodium salts.`,
          C: L`Carbon is not simply removed; hetero elements are converted to testable ions.`,
          D: L`Lassaigne's test is qualitative, not a molecular-mass method.`,
        },
        [
          L`Organic compounds often have covalent bonds.`,
          L`The later tests are done in aqueous solution.`,
          L`Sodium converts N, S and halogens into ionic sodium salts.`,
        ],
        [
          {
            explanation: L`Sodium fusion converts covalently bonded nitrogen, sulphur or halogen into water-soluble ionic sodium salts such as sodium cyanide, sodium sulphide or sodium halide.`,
          },
        ],
      ),
      mc(
        L`The Prussian-blue test for nitrogen in an organic compound depends on formation of`,
        2,
        ["nitrogen_detection", "lassaigne_extract"],
        [
          L`ferric ferrocyanide complex`,
          L`silver chloride`,
          L`lead sulphide`,
          L`barium sulphate`,
        ],
        "A",
        {
          B: L`Silver chloride is used for chloride, not nitrogen.`,
          C: L`Lead sulphide indicates sulphur.`,
          D: L`Barium sulphate is related to sulphate testing, not Lassaigne nitrogen detection.`,
        },
        [
          L`Nitrogen is converted to cyanide in sodium fusion extract.`,
          L`Cyanide forms ferrocyanide complex with iron salts.`,
          L`The final blue colour is ferric ferrocyanide.`,
        ],
        [
          {
            explanation: L`Nitrogen in the sodium fusion extract forms cyanide, which with iron salts and acidification ultimately gives Prussian blue ferric ferrocyanide.`,
          },
        ],
      ),
      mc(
        L`If sodium fusion extract gives a black precipitate with lead acetate solution, the element indicated is`,
        2,
        ["sulphur_detection", "lead_acetate"],
        [
          L`chlorine`,
          L`sulphur`,
          L`nitrogen only`,
          L`oxygen`,
        ],
        "B",
        {
          A: L`Chlorine is detected by silver nitrate after acidification, not by black lead sulphide.`,
          C: L`Nitrogen gives Prussian blue in its specific test.`,
          D: L`Oxygen is not detected by this lead acetate test.`,
        },
        [
          L`Lead ions form a black precipitate with sulphide ions.`,
          L`Sodium fusion converts sulphur to sulphide.`,
          L`The precipitate is $\mathrm{PbS}$.`,
        ],
        [
          {
            explanation: L`Sulphur is converted to sulphide ion in sodium fusion extract. Sulphide ion gives black lead sulphide with lead acetate.`,
            math: L`\mathrm{Pb^{2+}+S^{2-}\rightarrow PbS(s)}`,
          },
        ],
      ),
      mc(
        L`Before adding silver nitrate in the Lassaigne test for chlorine, the extract is boiled with dilute nitric acid mainly to`,
        3,
        ["chlorine_detection", "interference"],
        [
          L`remove interfering cyanide or sulphide ions`,
          L`convert silver nitrate into silver metal`,
          L`make chlorine gas escape before testing`,
          L`neutralise all chloride ions`,
        ],
        "A",
        {
          B: L`Silver nitrate is not reduced deliberately in the chloride test.`,
          C: L`The aim is not to lose chlorine; chloride should remain for precipitation as silver chloride.`,
          D: L`Neutralising chloride would destroy the test; chloride must remain available.`,
        },
        [
          L`Other ions in the extract can also precipitate with silver ion.`,
          L`Nitric acid destroys/removes cyanide and sulphide interference.`,
          L`Then silver nitrate tests chloride more reliably.`,
        ],
        [
          {
            explanation: L`Cyanide and sulphide ions may interfere with silver nitrate. Boiling with dilute nitric acid removes these interferences before chloride is precipitated as silver chloride.`,
          },
        ],
      ),
      mc(
        L`A project compares the foaming capacity of soaps in water samples. Which design is most valid?`,
        3,
        ["project_design", "control_variables"],
        [
          L`Use different soap masses and different water volumes for each sample`,
          L`Keep soap mass, water volume, shaking time and temperature the same`,
          L`Change temperature and soap brand together to see a larger effect`,
          L`Record only the sample with the maximum foam height`,
        ],
        "B",
        {
          A: L`Changing many variables makes the comparison unfair.`,
          C: L`Changing two variables together prevents attributing the effect to one factor.`,
          D: L`Ignoring other samples prevents a comparative conclusion.`,
        },
        [
          L`A fair test changes one factor at a time.`,
          L`Foam height depends on many conditions.`,
          L`Control volume, mass, time and temperature.`,
        ],
        [
          {
            explanation: L`A valid project design keeps all important conditions constant except the water sample, so differences in foam height can be linked to the sample being tested.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why must sodium used in Lassaigne's test be dry?`,
        1,
        ["lassaigne_test", "safety"],
        onePart(L`Give the reason.`, 1),
        [
          L`Sodium reacts vigorously with water.`,
          L`Moist sodium creates safety risk.`,
          L`Dry sodium also improves fusion efficiency.`,
        ],
        [
          {
            part: "a",
            explanation: L`Sodium reacts vigorously with water, so it must be dry to avoid violent reaction and to ensure proper fusion with the organic compound.`,
          },
        ],
        [L`Saying dryness matters only for weighing accuracy.`],
      ),
      frq(
        "saq",
        L`A sodium fusion extract gives Prussian blue in the nitrogen test and black precipitate with lead acetate. What elements are present?`,
        2,
        ["lassaigne_observation", "dual_inference"],
        parts([
          ["a", L`Identify the element indicated by Prussian blue.`, 1],
          ["b", L`Identify the element indicated by black lead acetate precipitate.`, 1],
        ]),
        [
          L`Prussian blue is the nitrogen test.`,
          L`Lead acetate blackening is due to lead sulphide.`,
          L`Report elements, not salts only.`,
        ],
        [
          {
            part: "a",
            explanation: L`Prussian blue indicates nitrogen.`,
          },
          {
            part: "b",
            explanation: L`A black precipitate with lead acetate indicates sulphur.`,
          },
        ],
        [L`Writing cyanide and sulphide as the original elements instead of nitrogen and sulphur.`],
      ),
      frq(
        "saq",
        L`In a water-purification project, a student compares filtered water and unfiltered muddy water. Give two measurements or observations that would make the comparison more scientific than just saying 'looks clean'.`,
        2,
        ["project_work", "water_purification"],
        onePart(L`Give two measurable observations.`, 2),
        [
          L`Think of measurable or repeatable observations.`,
          L`Turbidity, pH, residue on evaporation and ion tests can be compared.`,
          L`Avoid purely subjective language.`,
        ],
        [
          {
            part: "a",
            explanation: L`Suitable observations include turbidity/clarity using the same depth of water, pH, mass of residue after evaporating a fixed volume, or specific ion tests such as chloride or hardness tests.`,
            markingPoints: [
              L`Gives one measurable comparison: pH, turbidity at equal depth, residue mass from equal volumes, or a specified ion/hardness test.`,
              L`Gives a second distinct measurable comparison from these examples or another valid measurement; repeating the first does not earn this mark.`,
            ],
          },
        ],
        [L`Using only visual judgement without a fixed sample volume or repeatable criterion.`],
      ),
      frq(
        "laq",
        L`A group wants to study how temperature affects evaporation rate. They will test one liquid at a time and repeat the same temperature plan for three liquids. Design a fair project plan.`,
        4,
        ["project_design", "evaporation_rate"],
        parts([
          ["a", L`State the independent variable for each liquid's run.`, 1],
          ["b", L`State two control variables.`, 1],
          ["c", L`State what measurement will be recorded.`, 1],
          ["d", L`State one safety or reliability precaution.`, 1],
        ]),
        [
          L`For a fair test, change temperature while keeping the liquid identity fixed within one run.`,
          L`Surface area and initial volume strongly affect evaporation.`,
          L`Measure mass or volume loss after a fixed time.`,
        ],
        [
          {
            part: "a",
            explanation: L`For each liquid's run, the independent variable is temperature. The three liquids should be tested through the same temperature schedule separately.`,
          },
          {
            part: "b",
            explanation: L`Control variables can include initial volume, exposed surface area, container type, air flow and time interval. The identity of the liquid is kept fixed within one temperature run and changed only when repeating the full plan for another liquid.`,
          },
          {
            part: "c",
            explanation: L`Record mass loss or volume loss after the same fixed time at each temperature.`,
          },
          {
            part: "d",
            explanation: L`Use small quantities away from flame for volatile liquids, and repeat trials to reduce random error.`,
          },
        ],
        [
          L`Changing temperature, container and surface area together.`,
          L`Using open flame with flammable liquids.`,
        ],
        lassaigneProjectFigure,
      ),
      frq(
        "case",
        L`A student compares the acidity of three fruit juices. Equal volumes of each juice are diluted with the same volume of distilled water, the same number of universal-indicator drops is added, and colours are matched after the same time.`,
        3,
        ["fruit_juice_acidity_project", "fair_test"],
        parts([
          ["a", L`Why should equal volumes of juices be used?`, 1],
          ["b", L`Why should the same number of indicator drops be used?`, 1],
          ["c", L`Why should colour matching be done after the same time?`, 1],
        ]),
        [
          L`All three are control variables.`,
          L`Unequal sample volume, dilution or indicator amount can change the observed colour.`,
          L`Indicator colours should be compared under the same timing and lighting conditions.`,
        ],
        [
          {
            part: "a",
            explanation: L`Equal volumes make the juice samples comparable, so the colour difference is not simply due to using more of one juice.`,
          },
          {
            part: "b",
            explanation: L`The same number of indicator drops keeps the indicator amount comparable across samples.`,
          },
          {
            part: "c",
            explanation: L`Keeping the observation time fixed prevents one sample from appearing different simply because its colour was read earlier or later.`,
          },
        ],
        [L`Changing sample volume, dilution, indicator amount or timing and then treating colour as a fair comparison.`],
      ),
    ],
  },
];

export const chemistry11PracticalsProjectsTopics: Topic[] =
  topicSeeds.map(makeTopic);
