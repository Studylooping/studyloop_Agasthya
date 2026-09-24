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
const UNIT = "u9-hydrocarbons";
const VERSION = "0.1.4";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
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
  skillTags: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
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
  return topicCode.replace(".", "-");
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|rightarrow|rightleftharpoons|approx|cdot|times|sigma|pi|theta|alpha|beta|equiv)\b/g,
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

function repairSolutionStep(step: SolutionStep): SolutionStep {
  return {
    ...step,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function repairPart(part: FrqPart): FrqPart {
  return { ...part, promptMarkdown: repairInlineLatex(part.promptMarkdown) };
}

function repairRubric(rubric: FrqRubric): FrqRubric {
  return {
    maxPoints: rubric.maxPoints,
    criteria: rubric.criteria.map((criterion) => ({
      ...criterion,
      description: repairInlineLatex(criterion.description),
    })),
  };
}

function repairWorkedSolution(part: FrqSolutionPart): FrqSolutionPart {
  return {
    ...part,
    explanation: repairInlineLatex(part.explanation),
    ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the hydrocarbon family, carbon skeleton, reagent condition, or reaction selectivity before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function choiceRotation(meta: TopicMeta, index: number): number {
  const topicNumber = Number(meta.topicCode.split(".")[1]);
  const topicOffset = topicNumber >= 3 ? 2 : 0;
  return (index + topicOffset) % LETTERS.length;
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
        : "incorrect_cbse_class11_chemistry_hydrocarbon_reasoning",
    };
  });

  const rotation = choiceRotation(meta, index);
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
    contentId: `${COURSE}.u9.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_hydrocarbon_reaction_memory_without_checking_structure_or_conditions",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
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
    contentId: `${COURSE}.u9.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_hydrocarbon_answer_without_structural_or_reagent_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
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

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function rubric(parts: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: parts.reduce((total, part) => total + part.points, 0),
    criteria: parts.map((part) => ({
      part: part.letter,
      points: part.points,
      description: `Completes part ${part.letter} with correct hydrocarbon structure, reagent condition and reasoning.`,
    })),
  };
}

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hints: readonly [string, string, string],
  explanation: string,
  figure?: ItemFigure,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints,
    solution: [{ step: 1, explanation: repairInlineLatex(explanation) }],
    ...(figure ? { figure } : {}),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  parts: readonly FrqPart[],
  hints: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts,
    hints,
    rubric: rubric(parts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
  };
}

const familyStructuresFigure: ItemFigure = {
  type: "svg",
  title: "Three hydrocarbon structures",
  description:
    "Three labelled hydrocarbon structures are shown for classification by bonding pattern.",
  svg: `<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="300" fill="#ffffff"/>
  <text x="380" y="32" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Labelled hydrocarbons</text>
  <g transform="translate(82 82)">
    <text x="0" y="-20" font-family="Arial" font-size="18" font-weight="700" fill="#1e3a8a">P</text>
    <text x="0" y="45" font-family="Arial" font-size="24" fill="#0f172a">CH<tspan baseline-shift="sub" font-size="14">3</tspan>-CH<tspan baseline-shift="sub" font-size="14">2</tspan>-CH<tspan baseline-shift="sub" font-size="14">3</tspan></text>
  </g>
  <g transform="translate(292 82)">
    <text x="0" y="-20" font-family="Arial" font-size="18" font-weight="700" fill="#92400e">Q</text>
    <text x="0" y="45" font-family="Arial" font-size="24" fill="#0f172a">CH<tspan baseline-shift="sub" font-size="14">3</tspan>-CH=CH<tspan baseline-shift="sub" font-size="14">2</tspan></text>
  </g>
  <g transform="translate(540 82)">
    <text x="0" y="-20" font-family="Arial" font-size="18" font-weight="700" fill="#166534">R</text>
    <text x="0" y="45" font-family="Arial" font-size="24" fill="#0f172a">HC&#8801;C-CH<tspan baseline-shift="sub" font-size="14">3</tspan></text>
  </g>
  <line x1="52" y1="188" x2="708" y2="188" stroke="#cbd5e1" stroke-width="2"/>
  <text x="380" y="232" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Classify from the bonds present, not from the number of carbon atoms alone.</text>
</svg>`,
};

const ethaneConformationFigure: ItemFigure = {
  type: "svg",
  title: "Two conformations of ethane",
  description:
    "Two Newman-style projections of ethane are labelled X and Y for comparison.",
  svg: `<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="330" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Ethane conformations</text>
  <g transform="translate(220 175)">
    <text x="-115" y="-112" font-family="Arial" font-size="18" font-weight="700" fill="#1d4ed8">X</text>
    <circle cx="0" cy="0" r="52" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
    <circle cx="0" cy="0" r="9" fill="#2563eb"/>
    <line x1="0" y1="0" x2="0" y2="-88" stroke="#0f172a" stroke-width="3"/>
    <line x1="0" y1="0" x2="-76" y2="44" stroke="#0f172a" stroke-width="3"/>
    <line x1="0" y1="0" x2="76" y2="44" stroke="#0f172a" stroke-width="3"/>
    <line x1="0" y1="-52" x2="0" y2="-92" stroke="#64748b" stroke-width="3"/>
    <line x1="-45" y1="26" x2="-80" y2="46" stroke="#64748b" stroke-width="3"/>
    <line x1="45" y1="26" x2="80" y2="46" stroke="#64748b" stroke-width="3"/>
    <text x="0" y="-103" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
    <text x="-92" y="56" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
    <text x="92" y="56" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
  </g>
  <g transform="translate(540 175)">
    <text x="-115" y="-112" font-family="Arial" font-size="18" font-weight="700" fill="#7c2d12">Y</text>
    <circle cx="0" cy="0" r="52" fill="#fff7ed" stroke="#ea580c" stroke-width="4"/>
    <circle cx="0" cy="0" r="9" fill="#ea580c"/>
    <line x1="0" y1="0" x2="0" y2="-88" stroke="#0f172a" stroke-width="3"/>
    <line x1="0" y1="0" x2="-76" y2="44" stroke="#0f172a" stroke-width="3"/>
    <line x1="0" y1="0" x2="76" y2="44" stroke="#0f172a" stroke-width="3"/>
    <line x1="45" y1="-26" x2="80" y2="-46" stroke="#64748b" stroke-width="3"/>
    <line x1="-45" y1="-26" x2="-80" y2="-46" stroke="#64748b" stroke-width="3"/>
    <line x1="0" y1="52" x2="0" y2="92" stroke="#64748b" stroke-width="3"/>
    <text x="0" y="-103" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
    <text x="-92" y="-50" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
    <text x="92" y="-50" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
    <text x="0" y="110" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">H</text>
  </g>
</svg>`,
};

const alkenePathFigure: ItemFigure = {
  type: "svg",
  title: "Two possible addition products",
  description:
    "An alkene addition scheme shows two labelled products for choosing by reagent condition.",
  svg: `<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="330" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Addition to propene</text>
  <text x="78" y="156" font-family="Arial" font-size="23" fill="#0f172a">CH<tspan baseline-shift="sub" font-size="13">3</tspan>-CH=CH<tspan baseline-shift="sub" font-size="13">2</tspan></text>
  <path d="M260 150 H360" stroke="#334155" stroke-width="4"/>
  <path d="M360 150 L344 140 M360 150 L344 160" stroke="#334155" stroke-width="4"/>
  <text x="310" y="126" text-anchor="middle" font-family="Arial" font-size="17" fill="#475569">HBr</text>
  <g transform="translate(425 82)">
    <rect x="0" y="0" width="270" height="64" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
    <text x="18" y="39" font-family="Arial" font-size="21" fill="#0f172a">A: CH<tspan baseline-shift="sub" font-size="12">3</tspan>-CHBr-CH<tspan baseline-shift="sub" font-size="12">3</tspan></text>
  </g>
  <g transform="translate(425 188)">
    <rect x="0" y="0" width="270" height="64" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
    <text x="18" y="39" font-family="Arial" font-size="21" fill="#0f172a">B: CH<tspan baseline-shift="sub" font-size="12">3</tspan>-CH<tspan baseline-shift="sub" font-size="12">2</tspan>-CH<tspan baseline-shift="sub" font-size="12">2</tspan>Br</text>
  </g>
</svg>`,
};

const ozonolysisClueFigure: ItemFigure = {
  type: "svg",
  title: "Ozonolysis products",
  description:
    "Products from oxidative cleavage are shown so the original alkene can be inferred.",
  svg: `<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="300" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Cleavage information</text>
  <rect x="80" y="95" width="190" height="80" rx="8" fill="#f8fafc" stroke="#475569" stroke-width="2"/>
  <text x="175" y="141" text-anchor="middle" font-family="Arial" font-size="22" fill="#0f172a">CH<tspan baseline-shift="sub" font-size="13">3</tspan>CHO</text>
  <text x="175" y="202" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">fragment 1</text>
  <text x="315" y="141" font-family="Arial" font-size="28" fill="#64748b">+</text>
  <rect x="380" y="95" width="210" height="80" rx="8" fill="#f8fafc" stroke="#475569" stroke-width="2"/>
  <text x="485" y="141" text-anchor="middle" font-family="Arial" font-size="22" fill="#0f172a">CH<tspan baseline-shift="sub" font-size="13">3</tspan>CH<tspan baseline-shift="sub" font-size="13">2</tspan>CHO</text>
  <text x="485" y="202" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">fragment 2</text>
  <text x="380" y="250" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Reconnect the two carbonyl carbons to locate the original double bond.</text>
</svg>`,
};

const terminalAlkyneFigure: ItemFigure = {
  type: "svg",
  title: "Terminal carbon comparison",
  description:
    "Three terminal C-H environments are compared without naming their acidity order.",
  svg: `<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="300" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Terminal C-H environments</text>
  <g transform="translate(82 105)">
    <rect x="0" y="0" width="170" height="78" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
    <text x="85" y="48" text-anchor="middle" font-family="Arial" font-size="22" fill="#0f172a">HC&#8801;CH</text>
    <text x="85" y="114" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">P</text>
  </g>
  <g transform="translate(300 105)">
    <rect x="0" y="0" width="170" height="78" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
    <text x="85" y="48" text-anchor="middle" font-family="Arial" font-size="22" fill="#0f172a">H<tspan baseline-shift="sub" font-size="13">2</tspan>C=CH<tspan baseline-shift="sub" font-size="13">2</tspan></text>
    <text x="85" y="114" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">Q</text>
  </g>
  <g transform="translate(518 105)">
    <rect x="0" y="0" width="170" height="78" rx="8" fill="#ecfdf5" stroke="#16a34a" stroke-width="2"/>
    <text x="85" y="48" text-anchor="middle" font-family="Arial" font-size="22" fill="#0f172a">CH<tspan baseline-shift="sub" font-size="13">3</tspan>-CH<tspan baseline-shift="sub" font-size="13">3</tspan></text>
    <text x="85" y="114" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">R</text>
  </g>
</svg>`,
};

const benzenePositionsFigure: ItemFigure = {
  type: "svg",
  title: "Numbered substituted benzene ring",
  description:
    "A monosubstituted benzene ring has the remaining ring positions numbered for applying position names.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <text x="310" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Numbered benzene ring</text>
  <polygon points="310,90 392,138 392,234 310,282 228,234 228,138" fill="#f8fafc" stroke="#334155" stroke-width="4"/>
  <circle cx="310" cy="186" r="54" fill="none" stroke="#64748b" stroke-width="3"/>
  <text x="310" y="74" text-anchor="middle" font-family="Arial" font-size="20" fill="#7c2d12">X</text>
  <line x1="310" y1="90" x2="310" y2="66" stroke="#7c2d12" stroke-width="3"/>
  <circle cx="392" cy="138" r="15" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <circle cx="392" cy="234" r="15" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <circle cx="310" cy="282" r="15" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <circle cx="228" cy="234" r="15" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <circle cx="228" cy="138" r="15" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="392" y="144" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#1d4ed8">2</text>
  <text x="392" y="240" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#1d4ed8">3</text>
  <text x="310" y="288" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#1d4ed8">4</text>
  <text x="228" y="240" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#1d4ed8">5</text>
  <text x="228" y="144" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#1d4ed8">6</text>
  <text x="310" y="324" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">Use the numbers to apply ortho, meta and para definitions.</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "9.1",
    title: "Classification, Formulas and Nomenclature",
    subtopic:
      "Alkanes, alkenes, alkynes, aromatic hydrocarbons, homologous series, unsaturation and IUPAC naming.",
    mc: [
      mc(
        L`Which hydrocarbon family has the general formula $\mathrm{C_nH_{2n+2}}$ for open-chain members?`,
        1,
        ["classification", "general_formula"],
        ["alkanes", "alkenes", "alkynes", "arenes"],
        "A",
        {
          B: L`Open-chain alkenes with one double bond follow $\mathrm{C_nH_{2n}}$.`,
          C: L`Open-chain alkynes with one triple bond follow $\mathrm{C_nH_{2n-2}}$.`,
          D: "Arenes do not follow the alkane open-chain formula.",
        },
        [
          "Saturated open-chain hydrocarbons have only single bonds.",
          "Compare methane, ethane and propane.",
          L`Their formulas fit $\mathrm{C_nH_{2n+2}}$.`,
        ],
        L`Open-chain alkanes are saturated hydrocarbons with formula $\mathrm{C_nH_{2n+2}}$.`,
      ),
      mc(
        L`In the figure, the structures P, Q and R are best classified respectively as`,
        3,
        ["classification", "structure_reading"],
        [
          "alkane, alkene, alkyne",
          "alkene, alkane, alkyne",
          "alkyne, alkene, alkane",
          "arene, alkane, alkene",
        ],
        "A",
        {
          B: "P has only single bonds, so it is not an alkene.",
          C: "P is not an alkyne, and R contains a triple bond.",
          D: "No benzene ring is shown in P, Q or R.",
        },
        [
          "Classify by the multiple bond present.",
          "A double bond indicates an alkene.",
          "A triple bond indicates an alkyne.",
        ],
        "P is an alkane, Q is an alkene and R is an alkyne.",
        familyStructuresFigure,
      ),
      mc(
        L`The degree of unsaturation of $\mathrm{C_4H_8}$ relative to the corresponding open-chain alkane is`,
        3,
        ["unsaturation", "formula_comparison"],
        ["0", "1", "2", "4"],
        "B",
        {
          A: L`$\mathrm{C_4H_{10}}$ would be fully saturated for an open chain.`,
          C: "One double bond or one ring removes two hydrogens, not four in this formula.",
          D: "This compares carbon count, not hydrogen deficiency.",
        },
        [
          L`The saturated open-chain formula for four carbons is $\mathrm{C_4H_{10}}$.`,
          L`$\mathrm{C_4H_8}$ has two hydrogens fewer.`,
          "Two hydrogens fewer means one degree of unsaturation.",
        ],
        L`Relative to $\mathrm{C_4H_{10}}$, the formula $\mathrm{C_4H_8}$ has one double-bond equivalent.`,
      ),
      mc(
        L`The IUPAC name of $\mathrm{CH_3CH_2CH=CH_2}$ is`,
        2,
        ["iupac_naming", "alkene_locant"],
        ["but-1-ene", "but-2-ene", "butane", "2-methylpropene"],
        "A",
        {
          B: "Numbering must give the double bond the lowest locant.",
          C: "The compound has a double bond, so it is not an alkane.",
          D: "The written structure is an unbranched four-carbon chain.",
        },
        [
          "Choose the longest chain containing the double bond.",
          "Number from the end nearer the double bond.",
          "The double bond starts at carbon 1.",
        ],
        "The four-carbon chain has a terminal double bond, so the name is but-1-ene.",
      ),
      mc(
        L`How many structural isomers are possible for $\mathrm{C_5H_{12}}$?`,
        3,
        ["alkane_isomerism", "isomer_count"],
        ["2", "3", "4", "5"],
        "B",
        {
          A: "This misses the highly branched 2,2-dimethylpropane skeleton.",
          C: "This overcounts duplicate drawings of the same carbon skeleton.",
          D: "Five is too many because several drawn branches repeat the same pentane skeleton.",
        },
        [
          "Draw the straight chain first.",
          "Then draw one methyl branch on a four-carbon chain.",
          "Then draw the central carbon skeleton with two methyl groups.",
        ],
        "Pentane has n-pentane, 2-methylbutane and 2,2-dimethylpropane: three structural isomers.",
      ),
      mc(
        L`Which compound is aromatic among the following?`,
        2,
        ["aromatic_hydrocarbon", "classification"],
        ["cyclohexane", "benzene", "ethyne", "propene"],
        "B",
        {
          A: "Cyclohexane is cyclic but saturated and non-aromatic.",
          C: "Ethyne is an alkyne, not an arene with a benzene-like delocalised ring.",
          D: "Propene is an alkene with one double bond, not an aromatic ring system.",
        },
        [
          "Aromatic hydrocarbons include benzene and its derivatives.",
          "A benzene ring has delocalised pi electrons.",
          "Cyclohexane lacks that pi system.",
        ],
        "Benzene is the aromatic hydrocarbon in the list.",
      ),
      mc(
        L`The correct IUPAC name of $\mathrm{CH_3C\equiv CCH_3}$ is`,
        2,
        ["iupac_naming", "alkyne_locant"],
        ["but-1-yne", "but-2-yne", "propyne", "2-methylpropyne"],
        "B",
        {
          A: "The triple bond is between the two middle carbons.",
          C: "The parent chain has four carbons, not three.",
          D: "The structure is unbranched, so there is no methyl substituent to name.",
        },
        [
          "The chain has four carbons.",
          "The triple bond lies between carbons 2 and 3.",
          "Use the lower locant 2.",
        ],
        "The correct name is but-2-yne.",
      ),
      mc(
        L`Which pair belongs to the same homologous series?`,
        2,
        ["homologous_series", "classification"],
        [
          L`$\mathrm{C_2H_6}$ and $\mathrm{C_3H_8}$`,
          L`$\mathrm{C_2H_6}$ and $\mathrm{C_2H_4}$`,
          L`$\mathrm{C_2H_2}$ and $\mathrm{C_6H_6}$`,
          L`$\mathrm{CH_4}$ and $\mathrm{C_2H_4}$`,
        ],
        "A",
        {
          B: "One is an alkane and the other is an alkene.",
          C: "Ethyne and benzene are not consecutive members of one homologous series.",
          D: "Methane is an alkane while ethene is an alkene.",
        },
        [
          "Members of one homologous series have the same functional family.",
          "Consecutive members differ by $\\mathrm{CH_2}$.",
          "Ethane and propane are both alkanes.",
        ],
        L`$\mathrm{C_2H_6}$ and $\mathrm{C_3H_8}$ are consecutive alkanes and differ by $\mathrm{CH_2}$.`,
      ),
      mc(
        L`The formula $\mathrm{C_6H_6}$ is highly unsaturated, yet benzene usually undergoes substitution rather than addition because`,
        3,
        ["aromaticity", "reaction_preference"],
        [
          "substitution preserves aromatic stabilisation",
          "benzene has only sigma bonds",
          "addition is impossible for all cyclic compounds",
          "benzene is an alkane",
        ],
        "A",
        {
          B: "Benzene contains a delocalised pi system.",
          C: "Cyclic alkenes can undergo addition; benzene is special because of aromatic stabilisation.",
          D: "Benzene is not an alkane; its ring is unsaturated and aromatic.",
        },
        [
          "Benzene has delocalised pi electrons.",
          "Addition would disturb the aromatic system.",
          "Substitution can retain the ring's aromatic character.",
        ],
        "Benzene prefers substitution because the aromatic pi system is retained after replacing a ring hydrogen.",
      ),
      mc(
        L`A hydrocarbon with molecular formula $\mathrm{C_3H_4}$ could be`,
        3,
        ["formula_interpretation", "alkyne"],
        ["propane", "propene", "propyne", "benzene"],
        "C",
        {
          A: L`Propane is $\mathrm{C_3H_8}$, so it has four extra hydrogens.`,
          B: L`Propene is $\mathrm{C_3H_6}$, so it is less unsaturated than $\mathrm{C_3H_4}$.`,
          D: L`Benzene is $\mathrm{C_6H_6}$ and has six carbons, not three.`,
        },
        [
          "For one open-chain alkyne, use $\\mathrm{C_nH_{2n-2}}$.",
          "For $n=3$, the formula is $\\mathrm{C_3H_4}$.",
          "The three-carbon alkyne is propyne.",
        ],
        L`$\mathrm{C_3H_4}$ fits the open-chain alkyne formula, so propyne is possible.`,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the general formula of open-chain alkenes containing one carbon-carbon double bond.`,
        1,
        ["general_formula", "alkenes"],
        singlePart("a", "State the formula.", 1),
        [
          "Compare ethene and propene.",
          "A double bond reduces the hydrogen count by two relative to alkanes.",
          L`The formula is $\mathrm{C_nH_{2n}}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Open-chain monoalkenes have general formula $\mathrm{C_nH_{2n}}$.`,
          },
        ],
        [L`Writing the alkane formula $\mathrm{C_nH_{2n+2}}$ for an alkene.`],
      ),
      frq(
        "saq",
        L`Classify P, Q and R in the figure and state the bond feature used for each classification.`,
        2,
        ["classification", "structure_reading"],
        [
          { letter: "a", promptMarkdown: "Classify P.", points: 1 },
          { letter: "b", promptMarkdown: "Classify Q.", points: 1 },
          { letter: "c", promptMarkdown: "Classify R.", points: 1 },
          {
            letter: "d",
            promptMarkdown: "State the structural feature used.",
            points: 1,
          },
        ],
        [
          "Look at whether only single bonds, a double bond or a triple bond is present.",
          "A double bond indicates an alkene.",
          "A triple bond indicates an alkyne.",
        ],
        [
          { part: "a", explanation: "P is an alkane." },
          { part: "b", explanation: "Q is an alkene." },
          { part: "c", explanation: "R is an alkyne." },
          {
            part: "d",
            explanation:
              "P has only single bonds, Q has a carbon-carbon double bond and R has a carbon-carbon triple bond.",
          },
        ],
        ["Classifying by carbon number instead of bond type."],
        familyStructuresFigure,
      ),
      frq(
        "saq",
        L`Give IUPAC names for $\mathrm{CH_3CH=CHCH_3}$ and $\mathrm{CH_3CH_2C\equiv CH}$.`,
        2,
        ["iupac_naming", "alkene_alkyne"],
        [
          {
            letter: "a",
            promptMarkdown: "Name $\\mathrm{CH_3CH=CHCH_3}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Name $\\mathrm{CH_3CH_2C\\equiv CH}$.",
            points: 2,
          },
        ],
        [
          "Both parent chains contain four carbons.",
          "Give the multiple bond the lowest possible locant.",
          "Use -ene for double bond and -yne for triple bond.",
        ],
        [
          { part: "a", explanation: "The alkene is but-2-ene." },
          { part: "b", explanation: "The alkyne is but-1-yne." },
        ],
        [
          "Numbering from the written left side without checking the multiple-bond locant.",
        ],
      ),
      frq(
        "saq",
        L`For $\mathrm{C_5H_{12}}$, list the three carbon skeletons by IUPAC name.`,
        3,
        ["alkane_isomerism", "isomer_count"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the straight-chain isomer.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the singly branched isomer.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the highly branched isomer.",
            points: 2,
          },
        ],
        [
          "Start with pentane.",
          "Move one carbon as a methyl branch on butane.",
          "Then place two methyl groups on propane's middle carbon.",
        ],
        [
          { part: "a", explanation: "The straight-chain isomer is pentane." },
          {
            part: "b",
            explanation: "The singly branched isomer is 2-methylbutane.",
          },
          {
            part: "c",
            explanation: "The highly branched isomer is 2,2-dimethylpropane.",
          },
        ],
        ["Counting rotated drawings of the same skeleton as new isomers."],
      ),
      frq(
        "vsaq",
        L`State one reason benzene is not classified as an alkene even though it is unsaturated.`,
        2,
        ["aromaticity", "classification"],
        singlePart("a", "Give the reason.", 2),
        [
          "An alkene has a localised carbon-carbon double bond.",
          "Benzene has a delocalised pi system.",
          "Aromatic stabilisation changes its usual reactions.",
        ],
        [
          {
            part: "a",
            explanation:
              "Benzene is aromatic: its pi electrons are delocalised over the ring, so it is not treated as an ordinary alkene.",
          },
        ],
        [
          "Calling benzene an alkene only because its formula has fewer hydrogens than an alkane.",
        ],
      ),
      frq(
        "case",
        L`A lab note gives four formulas: $\mathrm{C_4H_{10}}$, $\mathrm{C_4H_8}$, $\mathrm{C_4H_6}$ and $\mathrm{C_6H_6}$.`,
        3,
        ["case_based", "formula_classification"],
        [
          {
            letter: "a",
            promptMarkdown: "Which formula matches an open-chain alkane?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which formula matches an open-chain monoalkene?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Which formula matches an open-chain monoalkyne?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Which formula is that of benzene?",
            points: 1,
          },
        ],
        [
          "Use the three open-chain formulas.",
          L`Alkanes: $\mathrm{C_nH_{2n+2}}$, alkenes: $\mathrm{C_nH_{2n}}$, alkynes: $\mathrm{C_nH_{2n-2}}$.`,
          L`Benzene is $\mathrm{C_6H_6}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{C_4H_{10}}$ is the alkane formula.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{C_4H_8}$ is the monoalkene formula.`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{C_4H_6}$ is the monoalkyne formula.`,
          },
          { part: "d", explanation: L`$\mathrm{C_6H_6}$ is benzene.` },
        ],
        ["Using only carbon count without matching hydrogen count."],
      ),
      frq(
        "saq",
        L`Explain why $\mathrm{C_4H_8}$ can represent either an alkene or a cycloalkane.`,
        3,
        ["unsaturation", "ring_double_bond_equivalence"],
        [
          {
            letter: "a",
            promptMarkdown: "Compare it with the corresponding alkane.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State two structural reasons for two hydrogens fewer.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Give one example formula/name for either possibility.",
            points: 1,
          },
        ],
        [
          L`The saturated open-chain formula for four carbons is $\mathrm{C_4H_{10}}$.`,
          "A double bond or a ring each removes two hydrogens.",
          "But-1-ene and cyclobutane are possible examples.",
        ],
        [
          {
            part: "a",
            explanation: L`Compared with $\mathrm{C_4H_{10}}$, $\mathrm{C_4H_8}$ has two fewer hydrogens.`,
          },
          {
            part: "b",
            explanation:
              "Two hydrogens fewer may be due to one carbon-carbon double bond or one ring.",
          },
          {
            part: "c",
            explanation:
              "For example, but-1-ene is an alkene and cyclobutane is a cycloalkane with this formula.",
          },
        ],
        ["Assuming a formula alone always identifies one unique structure."],
      ),
      frq(
        "saq",
        L`A compound is named 3-methylbut-1-ene by a student. Draw the parent-chain logic in words and write its condensed formula.`,
        3,
        ["iupac_to_structure", "alkene_naming"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Identify the parent chain and double-bond position.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Place the methyl group.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Write a condensed structural formula.",
            points: 1,
          },
        ],
        [
          "The parent is but-1-ene.",
          "The branch is on carbon 3.",
          L`A compact formula is $\mathrm{CH_2=CHCH(CH_3)CH_3}$.`,
        ],
        [
          {
            part: "a",
            explanation:
              "The parent chain has four carbons and a double bond starting at carbon 1.",
          },
          { part: "b", explanation: "A methyl group is attached to carbon 3." },
          {
            part: "c",
            explanation: L`One condensed formula is $\mathrm{CH_2=CHCH(CH_3)CH_3}$.`,
          },
        ],
        [
          "Placing the methyl group on carbon 2 because it looks closer in the written formula.",
        ],
      ),
      frq(
        "case",
        L`A teacher asks whether two drawings of but-2-ene, one straight and one bent around single bonds, are different structural isomers.`,
        3,
        ["isomer_counting", "structural_isomerism"],
        [
          {
            letter: "a",
            promptMarkdown: "State whether they are structural isomers.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give the criterion for structural isomerism.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State what must actually change for structural isomerism.",
            points: 1,
          },
        ],
        [
          "Structural isomerism depends on connectivity.",
          "Bending a drawing does not change which atoms are bonded.",
          "Changing the double-bond position or carbon skeleton would be structural change.",
        ],
        [
          {
            part: "a",
            explanation:
              "They are not structural isomers if the connectivity is identical.",
          },
          {
            part: "b",
            explanation:
              "Structural isomers have the same molecular formula but different connectivity.",
          },
          {
            part: "c",
            explanation:
              "The carbon skeleton, position of multiple bond or bonding sequence must change.",
          },
        ],
        [
          "Treating different-looking drawings as different compounds without checking connectivity.",
        ],
      ),
      frq(
        "vsaq",
        L`Name the simplest aromatic hydrocarbon.`,
        1,
        ["aromatic_hydrocarbon"],
        singlePart("a", "Give the name.", 1),
        [
          "It has formula $\\mathrm{C_6H_6}$.",
          "It is the parent arene.",
          "Its common and IUPAC accepted name is benzene.",
        ],
        [
          {
            part: "a",
            explanation: "The simplest aromatic hydrocarbon is benzene.",
          },
        ],
        ["Writing cyclohexane, which is cyclic but not aromatic."],
      ),
    ],
  },
  {
    topicCode: "9.2",
    title: "Alkanes: Preparation, Reactions and Conformations",
    subtopic:
      "Preparation by Wurtz reaction and decarboxylation, combustion, free-radical substitution and ethane conformations.",
    mc: [
      mc(
        L`The Wurtz reaction of methyl bromide with sodium in dry ether mainly gives`,
        2,
        ["wurtz_reaction", "alkane_preparation"],
        ["methane", "ethane", "ethene", "ethyne"],
        "B",
        {
          A: "Wurtz coupling joins two methyl groups rather than replacing bromine by hydrogen.",
          C: "No double bond is formed in the coupling product.",
          D: "No triple bond is formed; Wurtz coupling joins alkyl groups to make an alkane.",
        },
        [
          "Wurtz reaction couples two alkyl groups.",
          L`Two $\mathrm{CH_3}$ groups combine.`,
          L`The product is $\mathrm{CH_3CH_3}$.`,
        ],
        L`$2\mathrm{CH_3Br}+2\mathrm{Na}\rightarrow \mathrm{C_2H_6}+2\mathrm{NaBr}$, so ethane is formed.`,
      ),
      mc(
        L`Soda-lime decarboxylation of sodium propanoate gives mainly`,
        2,
        ["decarboxylation", "alkane_preparation"],
        ["methane", "ethane", "propane", "butane"],
        "B",
        {
          A: "Sodium ethanoate gives methane; sodium propanoate has one extra carbon.",
          C: "Decarboxylation removes the carboxyl carbon.",
          D: "The carbon chain does not lengthen in soda-lime decarboxylation.",
        },
        [
          "Soda-lime removes carbon dioxide/carbonate equivalent.",
          "The alkane has one carbon fewer than the acid salt.",
          "Propanoate has three carbons, so the alkane has two.",
        ],
        "Sodium propanoate loses the carboxyl carbon to give ethane.",
      ),
      mc(
        L`Complete combustion of propane requires how many moles of oxygen per mole of propane?`,
        3,
        ["combustion", "stoichiometry"],
        ["3", "4", "5", "6"],
        "C",
        {
          A: "This is too little oxygen to form both carbon dioxide and water.",
          B: "This misses one mole of oxygen after balancing both carbon dioxide and water.",
          D: "This overestimates the oxygen requirement.",
        },
        [
          L`Write $\mathrm{C_3H_8 + O_2 \rightarrow CO_2 + H_2O}$.`,
          "Balance carbon and hydrogen first.",
          L`Then $\mathrm{3CO_2+4H_2O}$ requires 10 oxygen atoms.`,
        ],
        L`$\mathrm{C_3H_8+5O_2\rightarrow 3CO_2+4H_2O}$, so 5 moles of oxygen are needed.`,
      ),
      mc(
        L`Chlorination of methane in diffused sunlight is best described as`,
        2,
        ["free_radical_substitution", "alkane_reaction"],
        [
          "electrophilic addition",
          "free-radical substitution",
          "nucleophilic substitution",
          "polymerisation",
        ],
        "B",
        {
          A: "Methane has no pi bond for electrophilic addition.",
          C: "The usual school-level mechanism is radical substitution, not nucleophilic substitution.",
          D: "Methane does not polymerise under these conditions.",
        },
        [
          "Light helps split chlorine molecules homolytically.",
          "Chlorine radicals attack methane.",
          "A hydrogen atom is replaced by chlorine.",
        ],
        "Alkanes undergo free-radical substitution with halogens in light.",
      ),
      mc(
        L`Which statement about chlorination of methane is most accurate?`,
        3,
        ["substitution_mixture", "alkane_reaction"],
        [
          "Only chloromethane can form under all conditions",
          "A mixture of substituted products may form",
          "Methane first becomes ethene",
          "No hydrogen chloride is produced",
        ],
        "B",
        {
          A: "Further substitution can give dichloro-, trichloro- and tetrachloromethane.",
          C: "The reaction is substitution, not dehydrogenation to ethene.",
          D: "Each substitution step produces hydrogen chloride.",
        },
        [
          "After one substitution, the product still has C-H bonds.",
          "Further substitution is possible.",
          "So careful control is needed to favour one product.",
        ],
        "Methane chlorination can give a mixture of chloromethane, dichloromethane, chloroform and carbon tetrachloride.",
      ),
      mc(
        L`For preparing a single symmetrical alkane in good yield, Wurtz reaction is best suited to`,
        3,
        ["wurtz_limitation", "preparation_choice"],
        [
          "two different alkyl halides",
          "one alkyl halide with sodium",
          "an alkene with bromine water",
          "an alkyne with ammoniacal silver nitrate",
        ],
        "B",
        {
          A: "Two different alkyl halides usually give a mixture of coupled products.",
          C: "Bromine water tests/attacks unsaturation; it is not Wurtz coupling.",
          D: "This tests terminal alkyne acidity rather than making alkanes.",
        },
        [
          "Wurtz reaction couples alkyl groups.",
          "Mixed alkyl halides can cross-couple in more than one way.",
          "One alkyl halide gives one symmetrical coupling product.",
        ],
        "Using one alkyl halide avoids the mixture problem and gives a symmetrical alkane.",
      ),
      mc(
        L`In the ethane conformation figure, the conformation with lower torsional strain is`,
        3,
        ["conformations", "ethane"],
        ["X", "Y", "both have maximum strain", "neither is a conformation"],
        "B",
        {
          A: "X has front and back C-H bonds aligned, giving greater torsional strain.",
          C: "Only the eclipsed arrangement has maximum torsional strain.",
          D: "Both drawings are conformations produced by rotation about the C-C sigma bond.",
        },
        [
          "Compare whether front and back C-H bonds overlap.",
          "Staggered arrangement keeps bonds farther apart.",
          "Lower repulsion means lower torsional strain.",
        ],
        "Y is staggered, so it has lower torsional strain than eclipsed X.",
        ethaneConformationFigure,
      ),
      mc(
        L`The first step in the free-radical chlorination of methane is usually`,
        2,
        ["radical_mechanism", "initiation"],
        [
          L`$\mathrm{Cl_2\rightarrow 2Cl^\cdot}$`,
          L`$\mathrm{CH_4\rightarrow CH_3^+ + H^-}$`,
          L`$\mathrm{CH_4+Cl^- \rightarrow CH_3Cl+H^-}$`,
          L`$\mathrm{CH_4\rightarrow C+2H_2}$`,
        ],
        "A",
        {
          B: "The radical chain begins with homolysis of chlorine, not ionic cleavage of methane.",
          C: "Chloride ion is not the initiating species in the light-induced radical chain.",
          D: "Methane is not decomposed into carbon and hydrogen in the substitution mechanism.",
        },
        [
          "Light breaks a weak bond homolytically.",
          "The chlorine molecule absorbs light.",
          "Two chlorine radicals are formed.",
        ],
        L`The initiation step is homolytic cleavage: $\mathrm{Cl_2\rightarrow 2Cl^\cdot}$.`,
      ),
      mc(
        L`Which alkane gives only one monochloro product on substitution of one hydrogen?`,
        3,
        ["monochlorination", "symmetry"],
        ["propane", "2-methylpropane", "ethane", "butane"],
        "C",
        {
          A: "Propane has terminal and middle hydrogen environments.",
          B: "2-Methylpropane has tertiary and primary hydrogen environments.",
          D: "Butane has terminal and internal hydrogen environments.",
        },
        [
          "Only one monochloro product forms if all hydrogens are equivalent.",
          "Ethane has equivalent methyl groups.",
          "Replacing any hydrogen gives chloroethane.",
        ],
        "All hydrogens in ethane are equivalent, so only chloroethane is formed on monochlorination.",
      ),
      mc(
        L`The boiling point of straight-chain alkanes generally increases with molecular mass mainly because`,
        2,
        ["physical_properties", "intermolecular_forces"],
        [
          "covalent bonds become ionic",
          "London dispersion forces increase",
          "alkanes become strongly hydrogen bonded",
          "all alkanes become aromatic",
        ],
        "B",
        {
          A: "Alkanes remain covalent and nonpolar.",
          C: "Alkanes do not have the usual hydrogen-bonding groups.",
          D: "Increasing chain length does not make an alkane aromatic.",
        },
        [
          "Alkanes are largely nonpolar.",
          "Larger molecules have greater surface area and polarisability.",
          "That strengthens dispersion forces.",
        ],
        "Higher molecular mass increases London dispersion forces, raising boiling point.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the balanced Wurtz reaction for converting methyl bromide to ethane.`,
        2,
        ["wurtz_reaction"],
        singlePart("a", "Write the equation.", 2),
        [
          "Two methyl bromide molecules are needed.",
          "Sodium removes bromine as sodium bromide.",
          "The methyl groups couple.",
        ],
        [
          {
            part: "a",
            explanation: L`$2\mathrm{CH_3Br}+2\mathrm{Na}\rightarrow \mathrm{CH_3CH_3}+2\mathrm{NaBr}$ in dry ether.`,
          },
        ],
        ["Writing methane as the product instead of the coupled alkane."],
      ),
      frq(
        "saq",
        L`Sodium ethanoate is heated with soda lime.`,
        3,
        ["decarboxylation", "alkane_preparation"],
        [
          { letter: "a", promptMarkdown: "Name the alkane formed.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "State the carbon-count change.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Write the inorganic product containing the removed carbon.",
            points: 1,
          },
        ],
        [
          "Soda lime removes the carboxyl carbon.",
          "Ethanoate has two carbon atoms.",
          "The alkane formed has one carbon atom.",
        ],
        [
          { part: "a", explanation: "Methane is formed." },
          {
            part: "b",
            explanation:
              "The alkane has one carbon fewer than the sodium salt of the acid.",
          },
          {
            part: "c",
            explanation: L`The removed carbon appears as $\mathrm{Na_2CO_3}$.`,
          },
        ],
        ["Keeping the same number of carbon atoms in the alkane product."],
      ),
      frq(
        "saq",
        L`Balance the complete combustion equation for butane, $\mathrm{C_4H_{10}}$.`,
        3,
        ["combustion", "balanced_equation"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the products of complete combustion.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Balance carbon and hydrogen.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Balance oxygen using integer coefficients.",
            points: 2,
          },
        ],
        [
          "Complete combustion forms carbon dioxide and water.",
          L`One $\mathrm{C_4H_{10}}$ gives $4\mathrm{CO_2}$ and $5\mathrm{H_2O}$.`,
          "Double all coefficients to avoid a fractional oxygen coefficient.",
        ],
        [
          {
            part: "a",
            explanation: L`The products are $\mathrm{CO_2}$ and $\mathrm{H_2O}$.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{C_4H_{10}+O_2\rightarrow 4CO_2+5H_2O}$.`,
          },
          {
            part: "c",
            explanation: L`The integer equation is $\mathrm{2C_4H_{10}+13O_2\rightarrow 8CO_2+10H_2O}$.`,
          },
        ],
        [
          "Balancing hydrogen before carbon and then forgetting to rebalance oxygen.",
        ],
      ),
      frq(
        "case",
        L`A student tries to prepare propane by mixing methyl bromide and ethyl bromide with sodium in dry ether.`,
        4,
        ["wurtz_limitation", "case_based"],
        [
          {
            letter: "a",
            promptMarkdown: "State the desired cross-coupled product.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name two other alkane products possible.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why this is a poor preparation of pure propane.",
            points: 1,
          },
        ],
        [
          "Mixed Wurtz reactions can couple like with like and unlike with unlike.",
          "Methyl-methyl coupling gives ethane.",
          "Ethyl-ethyl coupling gives butane.",
        ],
        [
          {
            part: "a",
            explanation: "The desired cross-coupled product is propane.",
          },
          {
            part: "b",
            explanation: "Ethane and butane can also form.",
          },
          {
            part: "c",
            explanation:
              "The reaction gives a mixture of coupling products, so isolation of pure propane is difficult.",
          },
        ],
        [
          "Assuming Wurtz reaction with two different halides gives only the cross product.",
        ],
      ),
      frq(
        "vsaq",
        L`Why are alkanes relatively unreactive toward ionic reagents under ordinary conditions?`,
        2,
        ["alkane_inertness"],
        singlePart("a", "Give the reason.", 2),
        [
          "Alkanes contain only C-C and C-H sigma bonds.",
          "The bonds are fairly strong and nearly nonpolar.",
          "There is no electron-rich pi bond or polar functional group.",
        ],
        [
          {
            part: "a",
            explanation:
              "Alkanes have strong, nearly nonpolar sigma bonds and lack functional groups or pi bonds, so ionic reagents do not attack them readily.",
          },
        ],
        ["Saying alkanes are unreactive because they have no bonds."],
      ),
      frq(
        "saq",
        L`Compare X and Y in the ethane conformation figure.`,
        3,
        ["conformations", "torsional_strain"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Identify the conformation with greater torsional strain.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the more stable conformation.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the stability difference.",
            points: 2,
          },
        ],
        [
          "Check whether front and back C-H bonds overlap.",
          "Eclipsed arrangements have more repulsion.",
          "Staggered arrangements are more stable.",
        ],
        [
          { part: "a", explanation: "X has greater torsional strain." },
          { part: "b", explanation: "Y is more stable." },
          {
            part: "c",
            explanation:
              "In Y the bonds are staggered, reducing electron-pair repulsions compared with eclipsed X.",
          },
        ],
        [
          "Calling the eclipsed form more stable because the drawing looks more symmetrical.",
        ],
        ethaneConformationFigure,
      ),
      frq(
        "saq",
        L`In methane chlorination, explain why monochlorination is difficult to stop at exactly one substitution without careful control.`,
        3,
        ["free_radical_substitution", "product_mixture"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the first organic product.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State why further substitution can occur.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Name one further substituted product.",
            points: 1,
          },
        ],
        [
          "The first substitution replaces one H by Cl.",
          "The product still contains C-H bonds.",
          "Radical substitution can continue.",
        ],
        [
          {
            part: "a",
            explanation: "The first organic product is chloromethane.",
          },
          {
            part: "b",
            explanation:
              "Chloromethane still has C-H bonds, so chlorine radicals can replace more hydrogen atoms.",
          },
          {
            part: "c",
            explanation:
              "One further product is dichloromethane; chloroform or carbon tetrachloride may also form after further substitution.",
          },
        ],
        [
          "Assuming the reaction automatically stops after one chlorine enters.",
        ],
      ),
      frq(
        "laq",
        L`An unknown alkane has molecular formula $\mathrm{C_6H_{14}}$.`,
        4,
        ["alkane_formula", "isomer_reasoning"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Verify that the formula fits an open-chain alkane.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write names of any three structural isomers.",
            points: 3,
          },
          {
            letter: "c",
            promptMarkdown: "Explain why these are isomers, not homologues.",
            points: 1,
          },
        ],
        [
          L`For $n=6$, $\mathrm{C_nH_{2n+2}}$ gives $\mathrm{C_6H_{14}}$.`,
          "Hexane has several carbon skeletons.",
          "Isomers have the same molecular formula but different connectivity.",
        ],
        [
          {
            part: "a",
            explanation: L`For $n=6$, $\mathrm{C_nH_{2n+2}=C_6H_{14}}$, so it fits an open-chain alkane.`,
          },
          {
            part: "b",
            explanation:
              "Examples include hexane, 2-methylpentane and 3-methylpentane. Other valid examples include 2,2-dimethylbutane and 2,3-dimethylbutane.",
          },
          {
            part: "c",
            explanation:
              "They have the same molecular formula but different carbon skeletons, so they are structural isomers.",
          },
        ],
        [
          "Listing methane, ethane and propane as isomers because they are all alkanes.",
        ],
      ),
      frq(
        "case",
        L`A gaseous alkane gives only one monochloro derivative. It contains two carbon atoms.`,
        3,
        ["monochlorination", "symmetry"],
        [
          { letter: "a", promptMarkdown: "Identify the alkane.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Name the monochloro derivative.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State why only one derivative forms.",
            points: 1,
          },
        ],
        [
          "The two-carbon alkane is ethane.",
          "Replacing one hydrogen gives chloroethane.",
          "All hydrogens are equivalent by symmetry.",
        ],
        [
          { part: "a", explanation: "The alkane is ethane." },
          { part: "b", explanation: "The derivative is chloroethane." },
          {
            part: "c",
            explanation:
              "All six hydrogens in ethane are equivalent, so substitution at any one gives the same product.",
          },
        ],
        ["Thinking each hydrogen position gives a different compound."],
      ),
      frq(
        "vsaq",
        L`Name the type of bond rotation responsible for different conformations of ethane.`,
        1,
        ["conformations", "sigma_bond"],
        singlePart("a", "Name the bond.", 1),
        [
          "Conformations interconvert without breaking bonds.",
          "The rotation is about the carbon-carbon bond.",
          "That bond is a sigma bond.",
        ],
        [
          {
            part: "a",
            explanation:
              "Different conformations arise by rotation about the carbon-carbon sigma bond.",
          },
        ],
        ["Saying pi-bond rotation is involved in ethane."],
      ),
    ],
  },
  {
    topicCode: "9.3",
    title: "Alkenes: Preparation and Addition Reactions",
    subtopic:
      "Preparation by elimination and dehydration, electrophilic addition, Markovnikov rule, peroxide effect, oxidation and ozonolysis.",
    mc: [
      mc(
        L`Dehydrohalogenation of 2-bromopropane with alcoholic KOH mainly gives`,
        2,
        ["alkene_preparation", "elimination"],
        ["propane", "propene", "propyne", "2-propanol"],
        "B",
        {
          A: "Elimination removes HBr to form a double bond, not an alkane.",
          C: "One elimination from this haloalkane gives an alkene, not an alkyne.",
          D: "Aqueous KOH favours substitution to alcohol; alcoholic KOH favours elimination.",
        },
        [
          "Alcoholic KOH favours elimination.",
          "Remove H and Br from adjacent carbons.",
          "A C=C bond forms between those carbons.",
        ],
        "2-Bromopropane loses HBr to form propene.",
      ),
      mc(
        L`Dehydration of ethanol with hot concentrated sulfuric acid at about $443\text{ K}$ gives mainly`,
        2,
        ["alkene_preparation", "dehydration"],
        ["ethane", "ethene", "ethyne", "ethanoic acid"],
        "B",
        {
          A: "Dehydration removes water and forms a double bond, not a saturated alkane.",
          C: "Removing one water molecule from ethanol does not create a triple bond.",
          D: "Ethanoic acid would require oxidation.",
        },
        [
          "Dehydration means loss of water.",
          "A molecule of ethanol loses H and OH from adjacent positions.",
          "The two-carbon alkene is ethene.",
        ],
        "Ethanol dehydrates to ethene under these conditions.",
      ),
      mc(
        L`Addition of HBr to propene in the absence of peroxide gives the major product`,
        3,
        ["markovnikov_rule", "addition"],
        ["1-bromopropane", "2-bromopropane", "1,2-dibromopropane", "propane"],
        "B",
        {
          A: "This is the anti-Markovnikov product, favoured for HBr in peroxide conditions.",
          C: "Only HBr is being added, not bromine.",
          D: "Hydrogenation would give propane; HBr addition keeps three carbons and adds bromine.",
        },
        [
          "Apply Markovnikov's rule.",
          "Hydrogen adds to the carbon already bearing more hydrogens.",
          "Bromine goes to the more substituted carbon.",
        ],
        "HBr adds to propene by Markovnikov orientation to give 2-bromopropane.",
        alkenePathFigure,
      ),
      mc(
        L`In the presence of peroxide, HBr adds to propene to give mainly`,
        3,
        ["peroxide_effect", "anti_markovnikov"],
        ["1-bromopropane", "2-bromopropane", "1,2-dibromopropane", "propane"],
        "A",
        {
          B: "That is the usual Markovnikov product without peroxide.",
          C: "Dibromide forms from bromine addition, not one molecule of HBr.",
          D: "No complete hydrogenation is taking place.",
        },
        [
          "The peroxide effect is specific to HBr at this level.",
          "It reverses the usual orientation.",
          "Bromine attaches to the terminal carbon in propene.",
        ],
        "Peroxide conditions give anti-Markovnikov addition of HBr, so 1-bromopropane is major.",
        alkenePathFigure,
      ),
      mc(
        L`Which reagent decolourises rapidly with ethene and is commonly used as a test for unsaturation?`,
        2,
        ["test_for_unsaturation", "alkenes"],
        [
          "bromine water",
          "aqueous sodium chloride",
          "lime water only",
          "ammonium hydroxide",
        ],
        "A",
        {
          B: "Sodium chloride solution is not a test for C=C unsaturation.",
          C: "Lime water detects carbon dioxide, not alkene unsaturation.",
          D: "Ammonium hydroxide does not test alkene unsaturation.",
        },
        [
          "Alkenes add halogens across the double bond.",
          "Bromine is coloured.",
          "Addition removes the colour.",
        ],
        "Bromine water is decolourised by alkenes due to addition across the double bond.",
      ),
      mc(
        L`Cold dilute alkaline $\mathrm{KMnO_4}$ reacts with ethene to form mainly`,
        3,
        ["baeyer_test", "oxidation"],
        ["ethane", "ethyne", "ethane-1,2-diol", "benzene"],
        "C",
        {
          A: "Hydrogenation, not alkaline permanganate oxidation, gives ethane.",
          B: "Oxidation of ethene does not produce ethyne.",
          D: "Benzene is not formed from this two-carbon alkene.",
        },
        [
          "Cold alkaline permanganate adds hydroxyl groups.",
          "Ethene has two double-bond carbons.",
          "A vicinal diol forms.",
        ],
        "Ethene is oxidised to ethane-1,2-diol under Baeyer's reagent conditions.",
      ),
      mc(
        L`Ozonolysis of an alkene gives only ethanal as the carbonyl product. The alkene is most likely`,
        4,
        ["ozonolysis", "structure_inference"],
        ["ethene", "but-2-ene", "propene", "but-1-ene"],
        "B",
        {
          A: "Ethene would cleave to methanal, not ethanal, because each double-bond carbon has only hydrogen attached.",
          C: "Propene gives methanal and ethanal.",
          D: "But-1-ene gives methanal and propanal.",
        },
        [
          "Ozonolysis cleaves the double bond.",
          "A symmetrical internal alkene gives identical carbonyl fragments.",
          "Two ethanal molecules come from but-2-ene.",
        ],
        "But-2-ene cleaves at the double bond to give two molecules of ethanal.",
      ),
      mc(
        L`The alkene whose ozonolysis gives ethanal and propanal is`,
        4,
        ["ozonolysis", "reverse_reasoning"],
        ["pent-1-ene", "pent-2-ene", "2-methylbut-2-ene", "but-2-ene"],
        "B",
        {
          A: "Pent-1-ene would give methanal and butanal.",
          C: "This would give a ketone/aldehyde pattern, not ethanal plus propanal.",
          D: "But-2-ene gives ethanal only because both sides of the double bond are identical.",
        },
        [
          "Reconnect the two carbonyl carbons by a double bond.",
          "Ethanal contributes a methyl-substituted double-bond carbon.",
          "Propanal contributes an ethyl-substituted double-bond carbon.",
        ],
        "Rejoining ethanal and propanal at their carbonyl carbons gives pent-2-ene.",
        ozonolysisClueFigure,
      ),
      mc(
        L`Hydrogenation of ethene in the presence of nickel catalyst gives`,
        1,
        ["hydrogenation", "addition"],
        ["ethane", "ethyne", "ethanol", "benzene"],
        "A",
        {
          B: "Hydrogenation reduces unsaturation; it does not increase it to a triple bond.",
          C: "Water or oxygen is not added; hydrogenation adds hydrogen across the C=C bond.",
          D: "A two-carbon alkene does not become benzene by hydrogenation.",
        },
        [
          "Hydrogen adds across the double bond.",
          "Each double-bond carbon gains hydrogen.",
          "The saturated two-carbon hydrocarbon is ethane.",
        ],
        "Ethene adds hydrogen across the double bond to form ethane.",
      ),
      mc(
        L`Which condition favours elimination over substitution when converting a haloalkane into an alkene?`,
        3,
        ["elimination_condition", "alkene_preparation"],
        [
          "aqueous KOH at room temperature",
          "alcoholic KOH with heating",
          "silver nitrate in water",
          "bromine water in dark",
        ],
        "B",
        {
          A: "Aqueous KOH favours substitution to alcohol.",
          C: "Silver nitrate is not the standard elimination condition.",
          D: "Bromine water is used to test/add to unsaturation.",
        },
        [
          "Alkenes are formed by removing HX.",
          "Alcoholic base and heat favour elimination.",
          "Aqueous base favours substitution.",
        ],
        "Alcoholic KOH with heating favours dehydrohalogenation to an alkene.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the major product formed when ethanol is dehydrated with hot concentrated sulfuric acid.`,
        1,
        ["dehydration", "alkene_preparation"],
        singlePart("a", "Name the product.", 1),
        [
          "The molecule loses water.",
          "A double bond forms between the two carbon atoms.",
          "The two-carbon alkene is ethene.",
        ],
        [{ part: "a", explanation: "The major product is ethene." }],
        ["Writing ethane because the starting compound has two carbon atoms."],
      ),
      frq(
        "saq",
        L`Propene reacts with HBr under two conditions: first without peroxide and then with peroxide.`,
        3,
        ["markovnikov_rule", "peroxide_effect"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the major product without peroxide.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the major product with peroxide.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the selectivity rule used in each case.",
            points: 2,
          },
        ],
        [
          "Without peroxide, use Markovnikov addition.",
          "With peroxide, HBr gives anti-Markovnikov addition.",
          "Compare the two products shown in the figure.",
        ],
        [
          {
            part: "a",
            explanation:
              "Without peroxide, the major product is 2-bromopropane.",
          },
          {
            part: "b",
            explanation: "With peroxide, the major product is 1-bromopropane.",
          },
          {
            part: "c",
            explanation:
              "The first follows Markovnikov's rule; the second follows the peroxide effect, giving anti-Markovnikov addition for HBr.",
          },
        ],
        ["Applying the peroxide effect to both conditions."],
        alkenePathFigure,
      ),
      frq(
        "saq",
        L`Write the equation for addition of bromine to ethene and state one observation.`,
        3,
        ["bromine_addition", "test_for_unsaturation"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the organic product.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State the visible observation.",
            points: 1,
          },
        ],
        [
          "Bromine adds across the C=C bond.",
          "Each carbon receives one bromine atom.",
          "Bromine colour disappears.",
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{CH_2=CH_2+Br_2\rightarrow BrCH_2CH_2Br}$, giving 1,2-dibromoethane.`,
          },
          {
            part: "b",
            explanation: "The reddish-brown colour of bromine is decolourised.",
          },
        ],
        [
          "Replacing only one hydrogen instead of adding bromine across the double bond.",
        ],
      ),
      frq(
        "saq",
        L`Use ozonolysis products in the figure to identify the original alkene.`,
        4,
        ["ozonolysis", "reverse_reasoning"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the two carbonyl fragments.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Reconnect the carbonyl carbons to form the alkene.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Name the alkene.", points: 1 },
        ],
        [
          "Ozonolysis cuts the double bond into carbonyl groups.",
          "The carbonyl carbon in each product was originally a double-bond carbon.",
          "Join those two carbonyl carbons by a double bond.",
        ],
        [
          {
            part: "a",
            explanation: "The fragments are ethanal and propanal.",
          },
          {
            part: "b",
            explanation: L`Reconnecting their carbonyl carbons gives $\mathrm{CH_3CH=CHCH_2CH_3}$.`,
          },
          { part: "c", explanation: "The alkene is pent-2-ene." },
        ],
        [
          "Joining the methyl and ethyl ends instead of reconnecting the carbonyl carbons.",
        ],
        ozonolysisClueFigure,
      ),
      frq(
        "case",
        L`An unknown open-chain hydrocarbon decolourises bromine water and adds one mole of hydrogen per mole on catalytic hydrogenation to give butane.`,
        4,
        ["case_based", "alkene_identification"],
        [
          {
            letter: "a",
            promptMarkdown:
              "What class of hydrocarbon is indicated by bromine-water decolourisation?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State a possible molecular formula of the unknown.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Give one possible structure/name.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Explain why hydrogenation gives butane.",
            points: 1,
          },
        ],
        [
          "Bromine water indicates unsaturation.",
          "One mole of hydrogen per mole means one carbon-carbon double bond is being saturated.",
          "A four-carbon alkene becomes butane.",
        ],
        [
          { part: "a", explanation: "An alkene is indicated." },
          {
            part: "b",
            explanation: L`A possible formula is $\mathrm{C_4H_8}$.`,
          },
          {
            part: "c",
            explanation: "One possible structure is but-1-ene or but-2-ene.",
          },
          {
            part: "d",
            explanation:
              "Hydrogen adds across the C=C bond, saturating the four-carbon chain to butane.",
          },
        ],
        ["Assuming decolourisation proves the exact double-bond position."],
      ),
      frq(
        "vsaq",
        L`What is Markovnikov's rule used to predict in alkene chemistry?`,
        2,
        ["markovnikov_rule"],
        singlePart("a", "State its use.", 2),
        [
          "It applies to addition of unsymmetrical reagents.",
          "It is used for unsymmetrical alkenes.",
          "It predicts which carbon receives hydrogen.",
        ],
        [
          {
            part: "a",
            explanation:
              "It predicts the orientation of addition of an unsymmetrical reagent to an unsymmetrical alkene; hydrogen adds to the double-bond carbon already bearing more hydrogens.",
          },
        ],
        [
          "Using the rule for symmetrical alkenes where no orientation issue exists.",
        ],
      ),
      frq(
        "saq",
        L`Explain why the peroxide effect is not written as a general rule for all hydrogen halides in Class 11 hydrocarbon reactions.`,
        3,
        ["peroxide_effect", "reaction_condition"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the hydrogen halide for which it is used.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the orientation effect.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State why reagent conditions must be mentioned.",
            points: 2,
          },
        ],
        [
          "The school-level peroxide effect is associated with HBr.",
          "It reverses Markovnikov orientation.",
          "Without peroxide, the usual ionic addition is expected.",
        ],
        [
          { part: "a", explanation: "It is used for HBr." },
          {
            part: "b",
            explanation:
              "It gives anti-Markovnikov addition to an unsymmetrical alkene.",
          },
          {
            part: "c",
            explanation:
              "The same alkene and reagent can give different major products depending on peroxide conditions, so the condition is essential.",
          },
        ],
        [
          "Applying anti-Markovnikov orientation to HCl or HI without checking the syllabus condition.",
        ],
      ),
      frq(
        "saq",
        L`A compound $\mathrm{C_3H_6}$ decolourises cold alkaline $\mathrm{KMnO_4}$. Give the likely class and product type formed in this mild oxidation.`,
        3,
        ["baeyer_test", "alkene_oxidation"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the likely class.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Name the type of product formed by mild oxidation.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the visual change.",
            points: 1,
          },
        ],
        [
          "The formula can match an alkene.",
          "Cold alkaline permanganate adds hydroxyl groups across C=C.",
          "The purple colour disappears or changes as permanganate is reduced.",
        ],
        [
          { part: "a", explanation: "The compound is likely an alkene." },
          { part: "b", explanation: "A vicinal diol is formed." },
          {
            part: "c",
            explanation:
              "The purple colour of alkaline permanganate is discharged, often with brown manganese dioxide formation.",
          },
        ],
        ["Treating the test as proof of a specific carbon skeleton."],
      ),
      frq(
        "laq",
        L`An alkene A has formula $\mathrm{C_4H_8}$. Ozonolysis of A gives one molecule of methanal and one molecule of propanal.`,
        4,
        ["ozonolysis", "structure_deduction"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the two fragments formed.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Deduce the position of the double bond.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Name alkene A.", points: 1 },
          {
            letter: "d",
            promptMarkdown: "Explain why but-2-ene is not A.",
            points: 1,
          },
        ],
        [
          "Methanal indicates a terminal =CH2 end.",
          "Propanal indicates the other double-bond carbon was attached to an ethyl group and hydrogen.",
          "Reconnect carbonyl carbons to rebuild the alkene.",
        ],
        [
          {
            part: "a",
            explanation: "The fragments are methanal and propanal.",
          },
          {
            part: "b",
            explanation:
              "Methanal requires a terminal double-bond carbon, so the double bond is at carbon 1.",
          },
          { part: "c", explanation: "A is but-1-ene." },
          {
            part: "d",
            explanation:
              "But-2-ene would cleave to give ethanal fragments, not methanal and propanal.",
          },
        ],
        [
          "Reconstructing the carbon chain without using the carbonyl carbons as the former double-bond carbons.",
        ],
      ),
      frq(
        "vsaq",
        L`Name the catalyst commonly used for hydrogenation of alkenes in school-level equations.`,
        1,
        ["hydrogenation", "catalyst"],
        singlePart("a", "Name one catalyst.", 1),
        [
          "It is a finely divided metal.",
          "Nickel is commonly written in Class 11 equations.",
          "Platinum or palladium may also catalyse hydrogenation.",
        ],
        [{ part: "a", explanation: "Finely divided nickel is commonly used." }],
        ["Writing bromine as the hydrogenation catalyst."],
      ),
    ],
  },
  {
    topicCode: "9.4",
    title: "Alkynes: Acidity, Preparation and Reactions",
    subtopic:
      "Preparation of ethyne, terminal alkyne acidity, addition reactions, hydration and tests using ammoniacal silver or cuprous salts.",
    mc: [
      mc(
        L`The general formula of open-chain alkynes with one triple bond is`,
        1,
        ["general_formula", "alkynes"],
        [
          L`$\mathrm{C_nH_{2n+2}}$`,
          L`$\mathrm{C_nH_{2n}}$`,
          L`$\mathrm{C_nH_{2n-2}}$`,
          L`$\mathrm{C_nH_{2n-6}}$`,
        ],
        "C",
        {
          A: "This is the alkane formula and does not account for the triple bond.",
          B: "This is the open-chain monoalkene formula.",
          D: "This is not the simple open-chain alkyne formula.",
        },
        [
          "A triple bond has two degrees of unsaturation.",
          "Each degree reduces hydrogen count by two relative to alkanes.",
          L`Subtract four from $\mathrm{C_nH_{2n+2}}$.`,
        ],
        L`Open-chain monoalkynes have general formula $\mathrm{C_nH_{2n-2}}$.`,
      ),
      mc(
        L`Ethyne is prepared in the laboratory by adding water to`,
        2,
        ["ethyne_preparation", "calcium_carbide"],
        ["calcium carbide", "sodium ethanoate", "benzene", "ethanol"],
        "A",
        {
          B: "Soda-lime decarboxylation of sodium ethanoate gives methane.",
          C: "Benzene does not give ethyne by simple addition of water.",
          D: "Ethanol dehydration gives ethene, not ethyne prepared from carbide.",
        },
        [
          "The inorganic carbide reacts with water.",
          "The by-product is calcium hydroxide.",
          "The hydrocarbon product is ethyne.",
        ],
        L`$\mathrm{CaC_2+2H_2O\rightarrow C_2H_2+Ca(OH)_2}$, so calcium carbide is used.`,
      ),
      mc(
        L`Among P, Q and R in the figure, the compound with the most acidic terminal hydrogen is`,
        3,
        ["terminal_alkyne_acidity", "hybridisation"],
        ["P", "Q", "R", "all are equally acidic"],
        "A",
        {
          B: "Vinylic C-H bonds of ethene are much less acidic than terminal alkyne C-H bonds.",
          C: "Alkane C-H bonds are the least acidic among these.",
          D: "Hybridisation changes acidity because sp, sp2 and sp3 carbons stabilise the conjugate base differently.",
        },
        [
          "Compare the hybridisation of the carbon bearing H.",
          "Greater s-character holds the conjugate base electrons closer.",
          "sp carbon has greater s-character than sp2 or sp3.",
        ],
        "P is ethyne; a terminal alkyne C-H bond is most acidic because the conjugate base has charge on sp carbon.",
        terminalAlkyneFigure,
      ),
      mc(
        L`A terminal alkyne gives a precipitate with ammoniacal silver nitrate because it forms`,
        3,
        ["terminal_alkyne_test", "acetylide"],
        [
          "silver acetylide",
          "silver chloride",
          "silver oxide only",
          "silver benzene complex",
        ],
        "A",
        {
          B: "Silver chloride indicates chloride ion, not terminal alkyne acidity.",
          C: "The test involves formation of a metal acetylide.",
          D: "Benzene does not form this precipitate in the test.",
        },
        [
          "Terminal alkynes have a weakly acidic hydrogen.",
          "Silver ion can replace that hydrogen.",
          "The insoluble salt is a silver acetylide.",
        ],
        "Terminal alkynes form insoluble silver acetylides with ammoniacal silver nitrate.",
      ),
      mc(
        L`Hydration of ethyne under acidic mercuric-ion conditions finally gives`,
        3,
        ["alkyne_hydration", "tautomerism"],
        ["ethanol", "ethanal", "ethane", "ethanoic acid"],
        "B",
        {
          A: "Hydration of ethyne gives an enol that tautomerises to an aldehyde, not ethanol.",
          C: "Hydrogenation gives ethane; hydration of ethyne gives an enol that tautomerises.",
          D: "Further oxidation would be needed for ethanoic acid.",
        },
        [
          "Water adds to ethyne to form a vinyl alcohol intermediate.",
          "The enol rearranges.",
          "The final stable carbonyl compound is ethanal.",
        ],
        "Ethyne hydration gives vinyl alcohol first, which tautomerises to ethanal.",
      ),
      mc(
        L`One mole of hydrogen added to ethyne in the presence of a suitable catalyst can give`,
        2,
        ["partial_hydrogenation", "addition"],
        ["ethene", "ethane only", "benzene", "methane"],
        "A",
        {
          B: "Excess hydrogen can give ethane, but one mole reduces the triple bond to a double bond.",
          C: "Benzene is not formed by one mole of hydrogen addition to ethyne.",
          D: "The carbon skeleton is not split to methane.",
        },
        [
          "A triple bond can add hydrogen stepwise.",
          "Adding one mole of hydrogen reduces it to a double bond.",
          "The two-carbon alkene is ethene.",
        ],
        "Partial hydrogenation of ethyne gives ethene.",
      ),
      mc(
        L`Which compound will not give a precipitate with ammoniacal silver nitrate?`,
        3,
        ["terminal_alkyne_test", "negative_case"],
        ["ethyne", "propyne", "but-1-yne", "but-2-yne"],
        "D",
        {
          A: "Ethyne has terminal acidic hydrogens, so it does give the silver acetylide precipitate.",
          B: "Propyne is a terminal alkyne and still has the acidic alkyne hydrogen.",
          C: "But-1-yne is a terminal alkyne, so it gives the precipitate test.",
        },
        [
          "The test is for terminal alkynes.",
          "Check whether the triple bond has hydrogen directly attached.",
          "But-2-yne has the triple bond inside the chain.",
        ],
        "But-2-yne is an internal alkyne and lacks terminal acidic alkyne hydrogen.",
      ),
      mc(
        L`The order of acidity of ethane, ethene and ethyne is`,
        3,
        ["acidity_order", "hybridisation"],
        [
          "ethane > ethene > ethyne",
          "ethyne > ethene > ethane",
          "ethene > ethyne > ethane",
          "all are equal",
        ],
        "B",
        {
          A: "sp3 C-H bonds in ethane are least acidic among the three.",
          C: "sp carbon stabilises the conjugate base better than sp2 carbon.",
          D: "Hybridisation makes the acidities different.",
        },
        [
          "Compare s-character: sp, sp2, sp3.",
          "More s-character stabilises the conjugate base.",
          "Ethyne has sp C-H bonds.",
        ],
        "Acidity decreases as s-character decreases: ethyne > ethene > ethane.",
      ),
      mc(
        L`Addition of excess HBr to ethyne gives mainly`,
        3,
        ["alkyne_addition", "hydrogen_halide"],
        ["bromoethene", "1,1-dibromoethane", "1,2-dibromoethane", "ethane"],
        "B",
        {
          A: "One mole of HBr gives bromoethene; excess HBr adds again.",
          C: "Markovnikov addition to vinyl bromide leads to geminal dibromide.",
          D: "No hydrogenation catalyst is present.",
        },
        [
          "HBr can add twice across a triple bond.",
          "The second addition follows the more stable carbocation orientation.",
          "Both bromines end up on the same carbon in the major product.",
        ],
        "Excess HBr adds to ethyne to form mainly 1,1-dibromoethane.",
      ),
      mc(
        L`Alkynes generally burn with a smokier flame than alkanes of similar size because they have`,
        2,
        ["combustion", "carbon_percentage"],
        [
          "a higher carbon percentage",
          "no carbon atoms",
          "only ionic bonds",
          "more oxygen in the molecule",
        ],
        "A",
        {
          B: "Alkynes are hydrocarbons and contain carbon.",
          C: "Alkynes have covalent carbon-carbon and carbon-hydrogen bonds; ionic bonding is not the reason for a smoky flame.",
          D: "Hydrocarbons contain only carbon and hydrogen.",
        },
        [
          "Compare hydrogen deficiency.",
          "Alkynes have fewer hydrogens per carbon than alkanes.",
          "Higher carbon content promotes soot if oxygen is limited.",
        ],
        "The higher carbon percentage of alkynes makes their flame more smoky under ordinary conditions.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the equation for preparation of ethyne from calcium carbide.`,
        2,
        ["ethyne_preparation", "calcium_carbide"],
        singlePart("a", "Write the balanced equation.", 2),
        [
          "Calcium carbide reacts with water.",
          "The organic product is ethyne.",
          "The inorganic product is calcium hydroxide.",
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{CaC_2+2H_2O\rightarrow C_2H_2+Ca(OH)_2}$.`,
          },
        ],
        ["Writing ethene instead of ethyne as the product."],
      ),
      frq(
        "saq",
        L`Explain why ethyne is more acidic than ethene and ethane.`,
        3,
        ["terminal_alkyne_acidity", "hybridisation"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State the hybridisation of the carbon bonded to acidic H in ethyne.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Compare s-character with ethene and ethane.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the stability of the conjugate base.",
            points: 2,
          },
        ],
        [
          "The terminal alkyne carbon is sp hybridised.",
          "sp has 50 percent s-character.",
          "Greater s-character holds negative charge closer to the nucleus.",
        ],
        [
          { part: "a", explanation: "The carbon is sp hybridised." },
          {
            part: "b",
            explanation:
              "sp carbon has greater s-character than sp2 carbon in ethene and sp3 carbon in ethane.",
          },
          {
            part: "c",
            explanation:
              "The acetylide conjugate base is stabilised better because the negative charge is on an sp carbon closer to the nucleus.",
          },
        ],
        ["Explaining acidity only by molecular mass."],
        terminalAlkyneFigure,
      ),
      frq(
        "saq",
        L`A hydrocarbon gives a white precipitate with ammoniacal silver nitrate. It has formula $\mathrm{C_3H_4}$.`,
        3,
        ["terminal_alkyne_test", "case_based"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the likely compound.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the class of compound.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the precipitate formation.",
            points: 2,
          },
        ],
        [
          L`$\mathrm{C_3H_4}$ can be propyne.`,
          "A silver nitrate precipitate indicates terminal alkyne hydrogen.",
          "Silver acetylide formation is the key.",
        ],
        [
          { part: "a", explanation: "The likely compound is propyne." },
          { part: "b", explanation: "It is a terminal alkyne." },
          {
            part: "c",
            explanation:
              "The acidic terminal alkyne hydrogen is replaced by silver ion, forming an insoluble silver acetylide.",
          },
        ],
        [
          "Assuming every alkyne gives the silver precipitate, including internal alkynes.",
        ],
      ),
      frq(
        "saq",
        L`Predict the products when ethyne is treated first with one mole of hydrogen and then with excess hydrogen over a metal catalyst.`,
        3,
        ["hydrogenation", "alkyne_reactions"],
        [
          {
            letter: "a",
            promptMarkdown: "Product with one mole of hydrogen.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Product with excess hydrogen.",
            points: 2,
          },
        ],
        [
          "A triple bond can be reduced stepwise.",
          "One mole of hydrogen gives a double bond.",
          "Excess hydrogen gives a single bond.",
        ],
        [
          { part: "a", explanation: "One mole of hydrogen gives ethene." },
          { part: "b", explanation: "Excess hydrogen gives ethane." },
        ],
        ["Jumping to ethane even when only one mole of hydrogen is specified."],
      ),
      frq(
        "vsaq",
        L`Name the final product obtained by hydration of ethyne in the presence of $\mathrm{Hg^{2+}}/\mathrm{H_2SO_4}$.`,
        2,
        ["alkyne_hydration"],
        singlePart("a", "Name the product.", 2),
        [
          "Water adds first to form an enol.",
          "The enol is unstable.",
          "It tautomerises to ethanal.",
        ],
        [{ part: "a", explanation: "The final product is ethanal." }],
        ["Stopping at vinyl alcohol as if it were the final product."],
      ),
      frq(
        "case",
        L`Three compounds P, Q and R are shown in the terminal C-H comparison figure.`,
        4,
        ["case_based", "acidity_order"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Which compound has the most acidic terminal hydrogen?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the hybridisation reason.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Which of Q and R is less acidic?",
            points: 1,
          },
        ],
        [
          "P is the alkyne environment.",
          "sp carbon has the greatest s-character.",
          "sp3 C-H in an alkane is less acidic than sp2 C-H in an alkene.",
        ],
        [
          {
            part: "a",
            explanation: "P has the most acidic terminal hydrogen.",
          },
          {
            part: "b",
            explanation:
              "The acidic hydrogen is attached to sp carbon; greater s-character stabilises the conjugate base.",
          },
          { part: "c", explanation: "R is less acidic than Q." },
        ],
        ["Thinking acidity increases simply with the number of hydrogens."],
        terminalAlkyneFigure,
      ),
      frq(
        "saq",
        L`Distinguish between but-1-yne and but-2-yne using one chemical test.`,
        3,
        ["terminal_alkyne_test", "distinguish_test"],
        [
          { letter: "a", promptMarkdown: "Name the reagent.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "State the observation for but-1-yne.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the observation for but-2-yne.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Explain the structural reason.",
            points: 1,
          },
        ],
        [
          "Use ammoniacal silver nitrate or ammoniacal cuprous chloride.",
          "Only terminal alkynes have acidic alkyne hydrogen.",
          "But-2-yne is internal.",
        ],
        [
          { part: "a", explanation: "Use ammoniacal silver nitrate." },
          {
            part: "b",
            explanation: "But-1-yne gives a precipitate of silver acetylide.",
          },
          {
            part: "c",
            explanation: "But-2-yne gives no such precipitate.",
          },
          {
            part: "d",
            explanation:
              "But-1-yne is terminal and has acidic alkyne hydrogen; but-2-yne is internal.",
          },
        ],
        ["Using bromine water, which both alkynes can decolourise."],
      ),
      frq(
        "laq",
        L`A hydrocarbon A has formula $\mathrm{C_2H_2}$. It is converted into B by adding one mole of hydrogen, and B decolourises bromine water.`,
        4,
        ["alkyne_to_alkene", "reaction_sequence"],
        [
          { letter: "a", promptMarkdown: "Identify A.", points: 1 },
          { letter: "b", promptMarkdown: "Identify B.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Explain why B decolourises bromine water.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "Name the product if B is fully hydrogenated.",
            points: 1,
          },
        ],
        [
          L`$\mathrm{C_2H_2}$ is ethyne.`,
          "One mole of hydrogen changes a triple bond to a double bond.",
          "Alkenes decolourise bromine water by addition.",
        ],
        [
          { part: "a", explanation: "A is ethyne." },
          { part: "b", explanation: "B is ethene." },
          {
            part: "c",
            explanation:
              "Ethene has a carbon-carbon double bond, so bromine adds across it and the bromine colour disappears.",
          },
          { part: "d", explanation: "Full hydrogenation gives ethane." },
        ],
        [
          "Identifying B as ethane even though it still decolourises bromine water.",
        ],
      ),
      frq(
        "saq",
        L`Explain why but-2-yne is less suitable than ethyne for demonstrating acidic hydrogen replacement by sodium metal.`,
        3,
        ["terminal_alkyne_acidity", "negative_case"],
        [
          {
            letter: "a",
            promptMarkdown: "State whether but-2-yne is terminal or internal.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State what hydrogen is absent.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Give the consequence for the test.",
            points: 1,
          },
        ],
        [
          "Look at the position of the triple bond.",
          "A terminal alkyne has H attached directly to a triple-bond carbon.",
          "But-2-yne has methyl groups on both sides.",
        ],
        [
          { part: "a", explanation: "But-2-yne is an internal alkyne." },
          {
            part: "b",
            explanation: "It lacks terminal acidic alkyne hydrogen.",
          },
          {
            part: "c",
            explanation:
              "Therefore it does not form the same sodium acetylide by replacement of terminal hydrogen.",
          },
        ],
        [
          "Assuming every compound with a triple bond has terminal acidic hydrogen.",
        ],
      ),
      frq(
        "vsaq",
        L`Which has higher carbon percentage: ethane or ethyne?`,
        2,
        ["carbon_percentage", "combustion"],
        singlePart("a", "Name the compound and give the reason.", 2),
        [
          "Both have two carbon atoms.",
          "Ethyne has fewer hydrogens.",
          "Less hydrogen for the same carbon count means higher carbon percentage.",
        ],
        [
          {
            part: "a",
            explanation:
              "Ethyne has the higher carbon percentage because it has the same number of carbon atoms as ethane but fewer hydrogen atoms.",
          },
        ],
        ["Choosing ethane because it has more total hydrogen atoms."],
      ),
    ],
  },
  {
    topicCode: "9.5",
    title: "Aromatic Hydrocarbons and Toxicity",
    subtopic:
      "benzene stability, electrophilic substitution, directing effects and hazardous hydrocarbons",
    mc: [
      mc(
        L`Benzene usually undergoes substitution rather than addition under ordinary conditions mainly because addition would`,
        3,
        ["benzene_aromaticity", "reaction_type"],
        [
          "destroy the aromatic stabilisation of the ring",
          "increase the number of sigma bonds beyond six",
          "make benzene more volatile than before",
          "convert every carbon from $sp^2$ to $sp$",
        ],
        "A",
        {
          B: "The number of sigma bonds is not the controlling reason; loss of aromatic stabilisation is.",
          C: "Volatility is not why benzene resists addition.",
          D: "Addition would tend towards $sp^3$ carbons, not $sp$ carbons.",
        },
        [
          "Recall what makes benzene unusually stable.",
          "An addition reaction would remove part of the delocalised pi system.",
          "Substitution can restore aromaticity after the electrophile enters.",
        ],
        "Benzene is aromatic because its pi electrons are delocalised around the ring. Addition disrupts this delocalisation, whereas electrophilic substitution replaces a hydrogen and restores the aromatic ring.",
      ),
      mc(
        L`The usual reagent mixture for nitration of benzene is`,
        2,
        ["nitration", "reagent_choice"],
        [
          L`$\mathrm{Br_2/CCl_4}$`,
          L`$\mathrm{conc.\ HNO_3/conc.\ H_2SO_4}$`,
          L`$\mathrm{HBr}$ in peroxide`,
          L`$\mathrm{KMnO_4/OH^-}$, cold`,
        ],
        "B",
        {
          A: "Bromine in carbon tetrachloride is an alkene unsaturation test, not benzene nitration.",
          C: "HBr/peroxide is for anti-Markovnikov addition to suitable alkenes.",
          D: "Cold alkaline permanganate oxidises alkenes; it is not the nitrating mixture.",
        },
        [
          "Nitration introduces $\\mathrm{-NO_2}$.",
          "The electrophile is generated by a strong acid mixture.",
          "Concentrated nitric acid with concentrated sulphuric acid generates $\\mathrm{NO_2^+}$.",
        ],
        L`The nitrating mixture is concentrated $\mathrm{HNO_3}$ and concentrated $\mathrm{H_2SO_4}$, which generates the nitronium ion, $\mathrm{NO_2^+}$.`,
      ),
      mc(
        L`When benzene reacts with $\mathrm{Cl_2}$ in the presence of anhydrous $\mathrm{FeCl_3}$, the main organic product is`,
        2,
        ["halogenation", "benzene_reactions"],
        [
          "chlorobenzene",
          "cyclohexyl chloride",
          "hexachlorocyclohexane",
          "benzyl chloride",
        ],
        "A",
        {
          B: "Cyclohexyl chloride would require a saturated cyclohexane ring, not electrophilic substitution in benzene.",
          C: "Extensive addition is not the normal product under ferric chloride catalysed halogenation.",
          D: "Benzyl chloride is obtained from side-chain chlorination of toluene, not chlorination of benzene itself.",
        },
        [
          "Anhydrous $\\mathrm{FeCl_3}$ helps generate an electrophile.",
          "The ring substitutes one hydrogen.",
          "One chlorine atom enters the benzene ring.",
        ],
        L`Benzene undergoes electrophilic substitution with $\mathrm{Cl_2/FeCl_3}$ to give chlorobenzene and $\mathrm{HCl}$.`,
      ),
      mc(
        L`In benzene nitration, the attacking electrophile is`,
        3,
        ["electrophile", "nitration_mechanism"],
        [
          L`$\mathrm{NO_2^+}$`,
          L`$\mathrm{NO_3^-}$`,
          L`$\mathrm{NH_4^+}$`,
          L`$\mathrm{NO}$`,
        ],
        "A",
        {
          B: "Nitrate ion is not the electron-seeking species that attacks the benzene ring.",
          C: "Ammonium ion is unrelated to nitration of benzene.",
          D: "Nitric oxide is not the nitrating electrophile.",
        },
        [
          "Electrophilic substitution needs an electron-seeking species.",
          "Sulphuric acid protonates nitric acid.",
          "The active species is the nitronium ion.",
        ],
        L`The nitrating mixture produces the nitronium ion, $\mathrm{NO_2^+}$, which attacks the electron-rich benzene ring.`,
      ),
      mc(
        L`Benzene treated with $\mathrm{CH_3Cl}$ and anhydrous $\mathrm{AlCl_3}$ gives`,
        3,
        ["friedel_crafts", "alkylation"],
        ["toluene", "chlorobenzene", "nitrobenzene", "cyclohexane"],
        "A",
        {
          B: "Chlorobenzene forms from halogenation with chlorine and ferric chloride.",
          C: "Nitrobenzene requires nitrating mixture.",
          D: "Cyclohexane is the hydrogenation product, not a Friedel-Crafts product.",
        },
        [
          "This is a Friedel-Crafts alkylation.",
          "$\\mathrm{CH_3Cl/AlCl_3}$ supplies a methyl electrophile.",
          "A methyl group enters the benzene ring.",
        ],
        L`Friedel-Crafts methylation introduces $\mathrm{-CH_3}$ on benzene, forming toluene.`,
      ),
      mc(
        L`On nitration, toluene gives mainly ortho- and para-nitrotoluene because the methyl group is`,
        4,
        ["directing_effect", "toluene"],
        [
          "deactivating and meta-directing",
          "activating and ortho-para directing",
          "deactivating and ortho-para directing",
          "activating and meta-directing",
        ],
        "B",
        {
          A: "That describes groups such as $\\mathrm{-NO_2}$, not methyl.",
          C: "Methyl is not deactivating; it donates electron density to the ring.",
          D: "Methyl activates the ring but directs mainly to ortho and para positions.",
        },
        [
          "Compare the effect of an alkyl group on benzene.",
          "Alkyl groups donate electron density through hyperconjugation and inductive effect.",
          "A methyl group activates the ring and directs electrophiles to ortho and para positions.",
        ],
        "The methyl group increases electron density on the ring and stabilises the intermediate better for ortho and para attack, so toluene mainly gives ortho- and para-nitrotoluene.",
      ),
      mc(
        L`Further nitration of nitrobenzene gives mainly`,
        4,
        ["directing_effect", "nitrobenzene"],
        [
          "o-dinitrobenzene",
          "m-dinitrobenzene",
          "p-dinitrobenzene",
          "1,3,5-trinitrobenzene only",
        ],
        "B",
        {
          A: "The nitro group is meta-directing, so ortho is not the main product.",
          C: "The nitro group is meta-directing, so para is not the main product.",
          D: "A single further nitration gives a dinitrobenzene, not only the trinitro compound.",
        },
        [
          "Think about whether $\\mathrm{-NO_2}$ donates or withdraws electron density.",
          "A nitro group is strongly deactivating.",
          "Strongly deactivating groups such as $\\mathrm{-NO_2}$ direct mainly meta.",
        ],
        L`The $\mathrm{-NO_2}$ group withdraws electron density and is meta-directing, so nitration of nitrobenzene gives mainly m-dinitrobenzene.`,
      ),
      mc(
        L`Which statement about chlorobenzene in electrophilic substitution is correct?`,
        4,
        ["halobenzene_directing", "substituent_effect"],
        [
          "It is activating and meta-directing.",
          "It is deactivating and meta-directing.",
          "It is activating and ortho-para directing.",
          "It is deactivating but ortho-para directing.",
        ],
        "D",
        {
          A: "Chlorine withdraws electron density by inductive effect, so the ring is not activated.",
          B: "Halogens are unusual: they deactivate but direct mainly ortho and para.",
          C: "The ortho-para direction is right, but chlorobenzene is not activated overall.",
        },
        [
          "Halogens have two competing effects.",
          "The inductive effect withdraws electron density and slows substitution.",
          "The resonance effect favours ortho and para positions.",
        ],
        "Chlorine deactivates the ring overall by its inductive effect, but its lone-pair resonance donation makes ortho and para positions favoured in substitution.",
      ),
      mc(
        L`A hydrocarbon decolourises bromine water rapidly in the dark, while benzene does not under the same condition. The hydrocarbon is most likely`,
        3,
        ["bromine_water", "aromatic_vs_alkene"],
        ["cyclohexane", "cyclohexene", "benzene", "toluene"],
        "B",
        {
          A: "Cyclohexane is saturated and does not rapidly decolourise bromine water in the dark.",
          C: "The stem states that benzene does not decolourise bromine water under the same condition.",
          D: "Toluene is aromatic and does not behave like an alkene in this simple test.",
        },
        [
          "Bromine water is rapidly decolourised by a carbon-carbon double bond.",
          "Benzene has delocalised aromatic pi electrons, not an isolated alkene double bond.",
          "Cyclohexene is the unsaturated non-aromatic option.",
        ],
        "Cyclohexene contains a reactive carbon-carbon double bond and decolourises bromine water by addition; benzene does not do this readily without suitable substitution conditions.",
      ),
      mc(
        L`Which safety statement is scientifically most appropriate for benzene and many polynuclear aromatic hydrocarbons?`,
        3,
        ["toxicity", "carcinogenicity"],
        [
          "They are harmless because they contain only carbon and hydrogen.",
          "Benzene should be handled as toxic and carcinogenic; many PAHs are also carcinogenic.",
          "Aromatic hydrocarbons are safe if they burn with a smoky flame.",
          "Only unsaturated alkenes can be toxic hydrocarbons.",
        ],
        "B",
        {
          A: "Being a hydrocarbon does not make a compound harmless.",
          C: "A smoky flame is not a safety guarantee; incomplete combustion products may be hazardous.",
          D: "Toxicity is not limited to alkenes.",
        },
        [
          "The syllabus explicitly includes toxicity and carcinogenicity.",
          "Benzene exposure is a serious health risk.",
          "Many PAHs from incomplete combustion are hazardous.",
        ],
        "Benzene is toxic and carcinogenic, and many polynuclear aromatic hydrocarbons are carcinogenic; they must not be treated as harmless solvents.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the electrophile formed during nitration of benzene and write its formula.`,
        2,
        ["nitration", "electrophile"],
        singlePart("a", "Name the electrophile and write its formula.", 2),
        [
          "The electrophile comes from nitric acid in the presence of sulphuric acid.",
          "It contains nitrogen and two oxygen atoms.",
          "It is the nitronium ion.",
        ],
        [
          {
            part: "a",
            explanation: L`The electrophile is the nitronium ion, $\mathrm{NO_2^+}$.`,
          },
        ],
        ["Writing nitrate ion instead of nitronium ion."],
      ),
      frq(
        "saq",
        L`Benzene is chlorinated in the presence of anhydrous $\mathrm{FeCl_3}$.`,
        3,
        ["halogenation", "catalyst_role"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the main organic product.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the inorganic by-product.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the role of anhydrous $\\mathrm{FeCl_3}$.",
            points: 1,
          },
        ],
        [
          "This is electrophilic substitution, not addition.",
          "One ring hydrogen is replaced by chlorine.",
          "$\\mathrm{FeCl_3}$ helps polarise chlorine and generate the attacking electrophile.",
        ],
        [
          {
            part: "a",
            explanation: "The main organic product is chlorobenzene.",
          },
          {
            part: "b",
            explanation: L`The inorganic by-product is $\mathrm{HCl}$.`,
          },
          {
            part: "c",
            explanation: L`Anhydrous $\mathrm{FeCl_3}$ acts as a Lewis acid catalyst and helps generate the electrophile for substitution.`,
          },
        ],
        ["Writing an addition product across the benzene ring."],
      ),
      frq(
        "saq",
        L`Explain why benzene generally favours electrophilic substitution over addition.`,
        3,
        ["benzene_aromaticity", "conceptual_reasoning"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State the structural feature responsible for benzene stability.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain what addition would do to this feature.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain why substitution is preferred.",
            points: 1,
          },
        ],
        [
          "Think of the delocalised pi cloud.",
          "Addition changes the pi system permanently.",
          "Substitution replaces hydrogen while restoring the aromatic ring.",
        ],
        [
          {
            part: "a",
            explanation:
              "Benzene is stabilised by a delocalised aromatic pi-electron system.",
          },
          {
            part: "b",
            explanation:
              "Addition would break the continuous delocalisation and reduce aromatic stability.",
          },
          {
            part: "c",
            explanation:
              "Substitution replaces a hydrogen and restores aromaticity, so the stable ring is retained.",
          },
        ],
        ["Saying benzene has no pi electrons because it resists addition."],
      ),
      frq(
        "laq",
        L`Two colourless hydrocarbons A and B are tested with bromine water in the dark. A rapidly decolourises bromine water, but B does not. B undergoes nitration with concentrated $\mathrm{HNO_3/H_2SO_4}$.`,
        4,
        ["aromatic_vs_alkene", "chemical_tests"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Identify the type of hydrocarbon A is likely to be.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Identify the type of hydrocarbon B is likely to be.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the bromine-water observation for A.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Explain why B can still undergo nitration.",
            points: 2,
          },
        ],
        [
          "Rapid bromine-water decolourisation suggests a normal carbon-carbon multiple bond.",
          "Nitration with acid mixture is a characteristic benzene-ring substitution.",
          "Aromatic compounds react differently from ordinary alkenes.",
        ],
        [
          {
            part: "a",
            explanation:
              "A is likely to be an alkene or another non-aromatic unsaturated hydrocarbon.",
          },
          {
            part: "b",
            explanation:
              "B is likely to be an aromatic hydrocarbon such as benzene.",
          },
          {
            part: "c",
            explanation:
              "A decolourises bromine water because bromine adds across its carbon-carbon multiple bond.",
          },
          {
            part: "d",
            explanation:
              "B does not behave like an ordinary alkene because its pi electrons are delocalised, but it can undergo electrophilic substitution in nitration while retaining aromaticity.",
          },
        ],
        [
          "Using bromine-water behaviour alone to conclude that benzene has no unsaturation.",
        ],
      ),
      frq(
        "case",
        L`The figure shows numbered positions around a substituted benzene ring. Use the numbering to apply ortho, meta and para definitions; decide the directing effect from the substituent.`,
        4,
        ["directing_effect", "position_map"],
        [
          {
            letter: "a",
            promptMarkdown:
              "How many ortho positions are available relative to X?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "How many meta positions are available relative to X?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If X is $\\mathrm{CH_3}$, which numbered positions and position types are favoured in nitration?",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown:
              "If X is $\\mathrm{NO_2}$, which numbered positions and position type are favoured in further nitration?",
            points: 1,
          },
        ],
        [
          "The figure gives position numbers, not substituent effects.",
          "Methyl and nitro groups direct differently.",
          "$\\mathrm{CH_3}$ is ortho-para directing; $\\mathrm{NO_2}$ is meta-directing.",
        ],
        [
          { part: "a", explanation: "There are two ortho positions." },
          { part: "b", explanation: "There are two meta positions." },
          {
            part: "c",
            explanation: L`A methyl group is activating and ortho-para directing, so nitration favours positions 2 and 6 (ortho) and position 4 (para).`,
          },
          {
            part: "d",
            explanation: L`A nitro group is deactivating and meta-directing, so further nitration favours positions 3 and 5 (meta).`,
          },
        ],
        [
          "Reading position labels correctly but applying the wrong substituent effect.",
        ],
        benzenePositionsFigure,
      ),
      frq(
        "laq",
        L`A student has to prepare nitrobenzene and benzenesulphonic acid from benzene in two separate reactions.`,
        4,
        ["benzene_reactions", "reagents_products"],
        [
          {
            letter: "a",
            promptMarkdown: "Give the reagent mixture for nitration.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the nitration product.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Give the reagent used for sulphonation.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Name the sulphonation product and state the reaction type common to both reactions.",
            points: 2,
          },
        ],
        [
          "Nitration and sulphonation are benzene-ring substitution reactions.",
          "Nitration uses nitric acid plus sulphuric acid.",
          "Sulphonation uses fuming sulphuric acid.",
        ],
        [
          {
            part: "a",
            explanation: L`Nitration uses concentrated $\mathrm{HNO_3}$ with concentrated $\mathrm{H_2SO_4}$.`,
          },
          { part: "b", explanation: "The product is nitrobenzene." },
          {
            part: "c",
            explanation: L`Sulphonation uses fuming sulphuric acid or oleum.`,
          },
          {
            part: "d",
            explanation:
              "The product is benzenesulphonic acid, and both reactions are electrophilic substitution reactions.",
          },
        ],
        ["Treating sulphonation as addition to the ring."],
      ),
      frq(
        "saq",
        L`Write the Friedel-Crafts methylation reaction of benzene using $\mathrm{CH_3Cl}$ and anhydrous $\mathrm{AlCl_3}$.`,
        3,
        ["friedel_crafts", "reaction_equation"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the organic product.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "State the catalyst.", points: 1 },
          { letter: "c", promptMarkdown: "Write the by-product.", points: 1 },
        ],
        [
          "A methyl group enters the ring.",
          "Anhydrous aluminium chloride is used.",
          "One hydrogen of benzene is substituted and leaves as hydrogen chloride.",
        ],
        [
          { part: "a", explanation: "The organic product is toluene." },
          {
            part: "b",
            explanation: L`The catalyst is anhydrous $\mathrm{AlCl_3}$.`,
          },
          { part: "c", explanation: L`The by-product is $\mathrm{HCl}$.` },
        ],
        [
          "Calling the product chlorobenzene because the reagent contains chlorine.",
        ],
      ),
      frq(
        "laq",
        L`A monosubstituted benzene compound A gives mainly ortho and para products on nitration, whereas compound B gives mainly a meta product.`,
        4,
        ["directing_effect", "substituent_comparison"],
        [
          {
            letter: "a",
            promptMarkdown: "Suggest one possible substituent in A.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Suggest one possible substituent in B.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the directing behaviour of A.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Explain the directing behaviour of B.",
            points: 2,
          },
        ],
        [
          "Think of common examples from toluene and nitrobenzene.",
          "Alkyl groups are ortho-para directing.",
          "Strong electron-withdrawing groups such as nitro are meta-directing.",
        ],
        [
          {
            part: "a",
            explanation: L`A could contain $\mathrm{-CH_3}$, as in toluene.`,
          },
          {
            part: "b",
            explanation: L`B could contain $\mathrm{-NO_2}$, as in nitrobenzene.`,
          },
          {
            part: "c",
            explanation:
              "An alkyl group activates the ring and favours ortho and para attack.",
          },
          {
            part: "d",
            explanation:
              "A nitro group withdraws electron density strongly, deactivates the ring and makes the meta sigma-complex relatively more favourable than ortho or para attack.",
          },
        ],
        ["Assuming all substituents direct new groups to the same positions."],
      ),
      frq(
        "saq",
        L`All carbon-carbon bonds in benzene have the same length, intermediate between a single and a double bond. Explain this observation.`,
        3,
        ["benzene_structure", "resonance"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State the electron feature of benzene responsible for this.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why fixed alternating single and double bonds are inadequate.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Relate this to equal bond lengths.",
            points: 1,
          },
        ],
        [
          "Benzene is not best represented by one Kekule structure alone.",
          "The pi electrons are delocalised around all six carbons.",
          "Delocalisation gives all C-C bonds the same average bond order.",
        ],
        [
          {
            part: "a",
            explanation:
              "Benzene has a delocalised pi-electron system spread over the six carbon atoms.",
          },
          {
            part: "b",
            explanation:
              "A fixed alternating-bond structure would predict three shorter double bonds and three longer single bonds.",
          },
          {
            part: "c",
            explanation:
              "Because the pi electrons are delocalised, all C-C bonds have the same average bond order and equal intermediate length.",
          },
        ],
        [
          "Drawing one Kekule structure and claiming benzene has three ordinary isolated double bonds.",
        ],
      ),
      frq(
        "vsaq",
        L`State one health reason why benzene should not be casually used as a laboratory solvent.`,
        2,
        ["toxicity", "lab_safety"],
        singlePart("a", "Give one scientifically valid health reason.", 2),
        [
          "This is not about flammability only.",
          "The syllabus includes carcinogenicity and toxicity.",
          "Benzene exposure is linked with serious health hazards.",
        ],
        [
          {
            part: "a",
            explanation:
              "Benzene is toxic and carcinogenic, so inhalation or skin exposure must be avoided and it should not be used casually as a solvent.",
          },
        ],
        ["Saying benzene is safe because it is a simple hydrocarbon."],
      ),
    ],
  },
];

export const hydrocarbonsTopics: Topic[] = topicSeeds.map(makeTopic);
