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
import { calibrateCbsePhysicsDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-physics-12";
const UNIT = "u9-electronic-devices";
const VERSION = "0.1.3";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type McSolutionStep = Omit<SolutionStep, "step"> &
  Partial<Pick<SolutionStep, "step">>;

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
  solution: readonly McSolutionStep[];
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
  return `You chose ${choiceText}. Recheck whether the item is about band gaps, doping, majority carriers, depletion region, diode bias, I-V graph, or rectification.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_electronic_devices_reasoning"),
    };
  });

  const topicNumber = Number(meta.topicCode.split(".")[1] ?? 0);
  const rotation = (topicNumber + 2 * index) % LETTERS.length;
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
  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u9.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_semiconductor_carrier_motion_with_metallic_current",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      ...step,
      step: step.step ?? stepIndex + 1,
    })) as SolutionStep[],
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
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_formula_without_identifying_the_diode_or_semiconductor_state",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
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

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function onePart(promptMarkdown: string, points: number): readonly FrqPart[] {
  return [part("a", promptMarkdown, points)];
}

function rubric(
  criteria: readonly { part: string; points: number; description: string }[],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((total, item) => total + item.points, 0),
    criteria: [...criteria],
  };
}

const bandGapFigure: ItemFigure = {
  type: "svg",
  title: "Energy band sketches",
  description:
    "Three energy-band sketches labelled X, Y and Z. X has two allowed bands drawn with overlap, Y has a short dashed separation between the two bands, and Z has a much longer dashed separation.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <defs>
    <marker id="ed-energy-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="58" y1="330" x2="58" y2="60" stroke="#334155" stroke-width="3" marker-end="url(#ed-energy-arrow)"/>
    <text x="27" y="197" font-size="16" transform="rotate(-90 27 197)">Energy</text>
    <g transform="translate(115 0)">
      <text x="80" y="45" font-size="20" font-weight="700">X</text>
      <rect x="18" y="98" width="150" height="58" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
      <rect x="18" y="142" width="150" height="58" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
      <text x="69" y="132" font-size="14">C.B.</text>
      <text x="69" y="177" font-size="14">V.B.</text>
    </g>
    <g transform="translate(315 0)">
      <text x="80" y="45" font-size="20" font-weight="700">Y</text>
      <rect x="18" y="85" width="150" height="58" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
      <rect x="18" y="190" width="150" height="58" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
      <line x1="93" y1="145" x2="93" y2="188" stroke="#64748b" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="69" y="119" font-size="14">C.B.</text>
      <text x="69" y="225" font-size="14">V.B.</text>
    </g>
    <g transform="translate(515 0)">
      <text x="80" y="45" font-size="20" font-weight="700">Z</text>
      <rect x="18" y="60" width="150" height="58" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
      <rect x="18" y="245" width="150" height="58" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
      <line x1="93" y1="122" x2="93" y2="242" stroke="#64748b" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="69" y="94" font-size="14">C.B.</text>
      <text x="69" y="280" font-size="14">V.B.</text>
    </g>
  </g>
</svg>`,
};

const dopingComparisonFigure: ItemFigure = {
  type: "svg",
  title: "Doped semiconductor comparison",
  description:
    "Two silicon lattice sketches. Sample P has a central atom labelled D with a nearby blue dot. Sample Q has a central atom labelled A with a nearby open circle in one bond.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <defs>
    <marker id="ed-dot-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="164" y="45" font-size="21" font-weight="700">Sample P</text>
    <text x="505" y="45" font-size="21" font-weight="700">Sample Q</text>
    <g transform="translate(75 78)">
      <rect x="0" y="0" width="250" height="240" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <g stroke="#94a3b8" stroke-width="2">
        <line x1="65" y1="60" x2="125" y2="120"/>
        <line x1="185" y1="60" x2="125" y2="120"/>
        <line x1="65" y1="180" x2="125" y2="120"/>
        <line x1="185" y1="180" x2="125" y2="120"/>
      </g>
      <g font-size="16" text-anchor="middle">
        <circle cx="65" cy="60" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="185" cy="60" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="65" cy="180" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="185" cy="180" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="125" cy="120" r="27" fill="#fde68a" stroke="#ca8a04" stroke-width="2"/>
        <text x="65" y="66">Si</text><text x="185" y="66">Si</text>
        <text x="65" y="186">Si</text><text x="185" y="186">Si</text>
        <text x="125" y="126">D</text>
      </g>
      <circle cx="154" cy="102" r="7" fill="#2563eb"/>
      <path d="M154 102 C185 102 197 88 208 76" fill="none" stroke="#2563eb" stroke-width="2.5" marker-end="url(#ed-dot-arrow)"/>
    </g>
    <g transform="translate(395 78)">
      <rect x="0" y="0" width="250" height="240" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <g stroke="#94a3b8" stroke-width="2">
        <line x1="65" y1="60" x2="125" y2="120"/>
        <line x1="185" y1="60" x2="125" y2="120"/>
        <line x1="65" y1="180" x2="125" y2="120"/>
        <line x1="185" y1="180" x2="125" y2="120"/>
      </g>
      <g font-size="16" text-anchor="middle">
        <circle cx="65" cy="60" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="185" cy="60" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="65" cy="180" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="185" cy="180" r="24" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <circle cx="125" cy="120" r="27" fill="#fecdd3" stroke="#e11d48" stroke-width="2"/>
        <text x="65" y="66">Si</text><text x="185" y="66">Si</text>
        <text x="65" y="186">Si</text><text x="185" y="186">Si</text>
        <text x="125" y="126">A</text>
      </g>
      <circle cx="152" cy="98" r="10" fill="#ffffff" stroke="#e11d48" stroke-width="3"/>
    </g>
  </g>
</svg>`,
};

const pnJunctionBiasFigure: ItemFigure = {
  type: "svg",
  title: "Two biased p-n junction circuits",
  description:
    "Two p-n junction circuits labelled Circuit P and Circuit Q. In P the p-side is connected to the positive terminal and the n-side to the negative terminal. In Q the polarity is reversed.",
  svg: `<svg viewBox="0 0 760 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="400" fill="#ffffff"/>
  <defs>
    <marker id="ed-current-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#16a34a"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round" stroke-linejoin="round">
    <g transform="translate(60 55)">
      <text x="135" y="0" font-size="22" font-weight="700">Circuit P</text>
      <rect x="110" y="78" width="70" height="100" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
      <rect x="180" y="78" width="70" height="100" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
      <rect x="167" y="78" width="26" height="100" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
      <text x="138" y="135" font-size="24" text-anchor="middle">p</text>
      <text x="222" y="135" font-size="24" text-anchor="middle">n</text>
      <path d="M110 128 H55 V245 H305 V128 H250" fill="none" stroke="#334155" stroke-width="3"/>
      <line x1="55" y1="218" x2="55" y2="272" stroke="#334155" stroke-width="3"/>
      <line x1="73" y1="232" x2="73" y2="258" stroke="#334155" stroke-width="3"/>
      <text x="45" y="205" font-size="18">+</text>
      <text x="80" y="205" font-size="18">-</text>
      <path d="M80 245 H145" stroke="#16a34a" stroke-width="3" marker-end="url(#ed-current-arrow)"/>
    </g>
    <g transform="translate(420 55)">
      <text x="135" y="0" font-size="22" font-weight="700">Circuit Q</text>
      <rect x="110" y="78" width="70" height="100" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
      <rect x="180" y="78" width="70" height="100" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
      <rect x="167" y="78" width="26" height="100" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
      <text x="138" y="135" font-size="24" text-anchor="middle">p</text>
      <text x="222" y="135" font-size="24" text-anchor="middle">n</text>
      <path d="M110 128 H55 V245 H305 V128 H250" fill="none" stroke="#334155" stroke-width="3"/>
      <line x1="55" y1="232" x2="55" y2="258" stroke="#334155" stroke-width="3"/>
      <line x1="73" y1="218" x2="73" y2="272" stroke="#334155" stroke-width="3"/>
      <text x="45" y="205" font-size="18">-</text>
      <text x="80" y="205" font-size="18">+</text>
      <path d="M250 245 H185" stroke="#16a34a" stroke-width="3" stroke-dasharray="7 5" marker-end="url(#ed-current-arrow)"/>
    </g>
  </g>
</svg>`,
};

const diodeIvFigure: ItemFigure = {
  type: "svg",
  title: "Diode current-voltage characteristic",
  description:
    "A diode I-V graph with small reverse current for negative voltage and a sharp rise after the forward knee.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <defs>
    <marker id="ed-iv-axis-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="100" y1="320" x2="650" y2="320" stroke="#334155" stroke-width="3" marker-end="url(#ed-iv-axis-arrow)"/>
    <line x1="330" y1="370" x2="330" y2="55" stroke="#334155" stroke-width="3" marker-end="url(#ed-iv-axis-arrow)"/>
    <text x="655" y="326" font-size="17">V</text>
    <text x="318" y="48" font-size="17">I</text>
    <text x="260" y="348" font-size="15">reverse bias</text>
    <text x="482" y="348" font-size="15">forward bias</text>
    <g stroke="#e2e8f0" stroke-width="1">
      <line x1="180" y1="80" x2="180" y2="350"/>
      <line x1="250" y1="80" x2="250" y2="350"/>
      <line x1="410" y1="80" x2="410" y2="350"/>
      <line x1="490" y1="80" x2="490" y2="350"/>
      <line x1="570" y1="80" x2="570" y2="350"/>
      <line x1="105" y1="260" x2="635" y2="260"/>
      <line x1="105" y1="200" x2="635" y2="200"/>
      <line x1="105" y1="140" x2="635" y2="140"/>
    </g>
    <path d="M125 328 C205 326 280 323 330 320 C375 318 418 313 454 294 C481 279 502 245 520 198 C538 148 561 104 610 83" fill="none" stroke="#2563eb" stroke-width="4"/>
    <circle cx="455" cy="294" r="5" fill="#f97316"/>
    <line x1="455" y1="320" x2="455" y2="294" stroke="#f97316" stroke-width="2" stroke-dasharray="5 4"/>
    <text x="425" y="338" font-size="15">knee</text>
    <text x="122" y="305" font-size="14">small reverse current</text>
  </g>
</svg>`,
};

const rectifierFigure: ItemFigure = {
  type: "svg",
  title: "Rectifier waveforms",
  description:
    "Three voltage-time waveforms. The input is sinusoidal, output P keeps only positive half-cycles, and output Q makes both half-cycles positive.",
  svg: `<svg viewBox="0 0 760 500" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="500" fill="#ffffff"/>
  <defs>
    <marker id="ed-wave-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round">
    <g transform="translate(70 50)">
      <text x="0" y="0" font-size="19" font-weight="700">Input</text>
      <line x1="0" y1="75" x2="620" y2="75" stroke="#334155" stroke-width="2" marker-end="url(#ed-wave-arrow)"/>
      <line x1="0" y1="135" x2="0" y2="15" stroke="#334155" stroke-width="2"/>
      <path d="M0 75 C45 5 95 5 140 75 C185 145 235 145 280 75 C325 5 375 5 420 75 C465 145 515 145 560 75" fill="none" stroke="#2563eb" stroke-width="4"/>
      <text x="630" y="80" font-size="16">t</text>
    </g>
    <g transform="translate(70 205)">
      <text x="0" y="0" font-size="19" font-weight="700">Output P</text>
      <line x1="0" y1="75" x2="620" y2="75" stroke="#334155" stroke-width="2" marker-end="url(#ed-wave-arrow)"/>
      <line x1="0" y1="135" x2="0" y2="15" stroke="#334155" stroke-width="2"/>
      <path d="M0 75 C45 5 95 5 140 75 M140 75 H280 M280 75 C325 5 375 5 420 75 M420 75 H560" fill="none" stroke="#16a34a" stroke-width="4"/>
      <text x="630" y="80" font-size="16">t</text>
    </g>
    <g transform="translate(70 360)">
      <text x="0" y="0" font-size="19" font-weight="700">Output Q</text>
      <line x1="0" y1="75" x2="620" y2="75" stroke="#334155" stroke-width="2" marker-end="url(#ed-wave-arrow)"/>
      <line x1="0" y1="135" x2="0" y2="15" stroke="#334155" stroke-width="2"/>
      <path d="M0 75 C45 5 95 5 140 75 C185 5 235 5 280 75 C325 5 375 5 420 75 C465 5 515 5 560 75" fill="none" stroke="#f97316" stroke-width="4"/>
      <text x="630" y="80" font-size="16">t</text>
    </g>
  </g>
</svg>`,
};

const rectifierCircuitFigure: ItemFigure = {
  type: "svg",
  title: "Half-wave rectifier circuit",
  description:
    "A simple half-wave rectifier circuit with an AC source, one diode and a load resistor. Output is taken across the load resistor.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <defs>
    <marker id="ed-circuit-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="110" cy="180" r="40" fill="#f8fafc"/>
    <path d="M86 180 C96 150 124 150 134 180 C144 210 172 210 182 180" fill="none" stroke="#2563eb" stroke-width="3"/>
    <text x="74" y="248" font-size="17" stroke="none">AC input</text>
    <path d="M150 180 H270"/>
    <path d="M270 145 L270 215 L330 180 Z" fill="#dbeafe" stroke="#2563eb"/>
    <line x1="337" y1="145" x2="337" y2="215" stroke="#2563eb" stroke-width="4"/>
    <text x="284" y="132" font-size="17" stroke="none">diode</text>
    <path d="M337 180 H455"/>
    <polyline points="455,180 470,155 485,205 500,155 515,205 530,155 545,205 560,180" fill="none"/>
    <text x="479" y="132" font-size="17" stroke="none">load</text>
    <path d="M560 180 H625 V280 H110 V220"/>
    <path d="M455 230 H560" stroke="#16a34a" marker-end="url(#ed-circuit-arrow)"/>
    <text x="470" y="260" font-size="16" stroke="none">output across load</text>
  </g>
</svg>`,
};

const topics: readonly TopicSeed[] = [
  {
    topicCode: "9.1",
    title: "Energy Bands in Solids",
    subtopic:
      "Qualitative band-gap model for conductors, semiconductors and insulators",
    mc: [
      {
        questionLatex: L`The figure shows three simplified energy-band sketches. Which sketch represents a semiconductor at room temperature?`,
        difficulty: 2,
        figure: bandGapFigure,
        skillTags: ["energy_bands", "semiconductor_identification"],
        choices: [
          L`X, because the bands overlap`,
          L`Y, because the forbidden gap is small`,
          L`Z, because the forbidden gap is large`,
          L`None, because band gaps do not decide conductivity`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Overlapping bands correspond to a conductor, not a semiconductor.`,
          C: L`A large forbidden gap makes thermal excitation difficult, so the material behaves as an insulator.`,
          D: L`Band gap is the key qualitative idea used in the CBSE syllabus for classifying these solids.`,
        },
        hints: [
          L`Compare the size of the forbidden energy gap.`,
          L`A semiconductor has a gap small enough for some thermal excitation.`,
          L`The small-gap sketch is Y.`,
        ],
        solution: [
          {
            explanation: L`A semiconductor has a small forbidden gap between the valence and conduction bands.`,
          },
          {
            explanation: L`In the figure, Y shows this small gap.`,
          },
        ],
      },
      {
        questionLatex: L`A pure solid has very few charge carriers at low temperature, but its conductivity increases appreciably when temperature is raised. The solid is most likely a`,
        difficulty: 2,
        skillTags: ["temperature_effect", "semiconductor_conductivity"],
        choices: [
          L`metal`,
          L`semiconductor`,
          L`perfect insulator`,
          L`superconductor at all temperatures`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`For a metal, resistance usually increases with temperature because lattice scattering increases.`,
          C: L`A perfect insulator would not gain appreciable conductivity in this simple school-level model.`,
          D: L`Superconductivity is not described by ordinary thermal generation of carriers.`,
        },
        hints: [
          L`Think about thermal generation of electron-hole pairs.`,
          L`A small band gap allows more carriers when temperature increases.`,
          L`That behaviour is characteristic of a semiconductor.`,
        ],
        solution: [
          {
            explanation: L`In a semiconductor, increasing temperature can excite more electrons across the small energy gap.`,
          },
          {
            explanation: L`This creates more electron-hole pairs, increasing conductivity.`,
          },
        ],
      },
      {
        questionLatex: L`The band gaps of three solids are approximately $0\,\text{eV}$, $1.1\,\text{eV}$ and $6\,\text{eV}$. In the same order, they are best classified as`,
        difficulty: 2,
        skillTags: ["band_gap_classification"],
        choices: [
          L`conductor, semiconductor, insulator`,
          L`semiconductor, conductor, insulator`,
          L`insulator, semiconductor, conductor`,
          L`conductor, insulator, semiconductor`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`A zero or overlapping gap is conductor-like, not semiconductor-like.`,
          C: L`The largest gap corresponds to an insulator, not a conductor.`,
          D: L`A gap near $1\,\text{eV}$ is the semiconductor case, not the insulator case.`,
        },
        hints: [
          L`Start with the material having almost no forbidden gap.`,
          L`A small gap of about $1\,\text{eV}$ is typical of a semiconductor.`,
          L`A very large gap makes the material insulating.`,
        ],
        solution: [
          {
            explanation: L`A zero gap or band overlap is conductor-like; a small gap is semiconductor-like; a large gap is insulator-like.`,
          },
          {
            explanation: L`The three gaps therefore match the three material classes in order.`,
            math: L`0\,\text{eV}\to\text{conductor},\quad 1.1\,\text{eV}\to\text{semiconductor},\quad 6\,\text{eV}\to\text{insulator}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A semiconductor has lower conductivity than a metal but higher conductivity than an insulator at ordinary temperature. Reason (R): Its forbidden energy gap is small compared with that of an insulator. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "band_gap_reasoning"],
        choices: [
          L`Both A and R are true, and R explains A`,
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
          L`A is false but R is true`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The smaller gap is exactly why more carriers can be thermally generated than in an insulator.`,
          C: L`The reason is true for semiconductors in the qualitative band model.`,
          D: L`The assertion is also true for ordinary semiconductors.`,
        },
        hints: [
          L`Judge the assertion first.`,
          L`Then ask whether the band-gap statement explains it.`,
          L`A small band gap allows limited but non-zero carrier generation.`,
        ],
        solution: [
          {
            explanation: L`The assertion is true because semiconductors conduct, but not as strongly as metals.`,
          },
          {
            explanation: L`The reason is true and explains the assertion: a small energy gap permits some thermal excitation, unlike a large-gap insulator.`,
          },
        ],
      },
      {
        questionLatex: L`A student claims, "If a material has a filled valence band, it must be an insulator." Which correction is most accurate?`,
        difficulty: 3,
        skillTags: ["band_gap_reasoning", "claim_correction"],
        choices: [
          L`The claim is correct for every solid.`,
          L`A filled valence band gives no information unless the forbidden gap is also considered.`,
          L`A filled valence band always means metallic conduction.`,
          L`Only the number of atoms decides whether a solid conducts.`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`A semiconductor can have a filled valence band at low temperature but a small gap that permits conduction at ordinary temperature.`,
          C: L`Metallic conduction is associated with partially filled or overlapping bands, not simply a filled valence band.`,
          D: L`Band structure, especially the gap, is the relevant model here.`,
        },
        hints: [
          L`A filled valence band by itself is not enough.`,
          L`Compare the gap to the conduction band.`,
          L`A small gap gives semiconductor behaviour; a large gap gives insulator behaviour.`,
        ],
        solution: [
          {
            explanation: L`The key missing detail is the forbidden gap between the valence and conduction bands.`,
          },
          {
            explanation: L`A filled valence band with a small gap can describe a semiconductor; with a large gap it describes an insulator.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is meant by the forbidden energy gap in a solid?`,
        difficulty: 1,
        skillTags: ["forbidden_gap_definition"],
        parts: onePart("Define the forbidden energy gap.", 1),
        hints: [
          L`It lies between two allowed bands.`,
          L`No electron can have an energy value inside this gap in the ideal band model.`,
          L`Name the two bands around it.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that the forbidden gap is the energy interval between valence and conduction bands where electron states are not allowed.",
          },
        ]),
        commonErrors: [
          "Calling it a physical gap between atoms.",
          "Saying it is the same as resistance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The forbidden energy gap is the energy interval between the valence band and the conduction band in which no allowed electron energy states exist.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Three solids have band gaps $0\,\text{eV}$, $0.7\,\text{eV}$ and $5.4\,\text{eV}$.`,
        difficulty: 2,
        skillTags: ["band_gap_classification"],
        parts: [
          part("a", "Classify each as conductor, semiconductor or insulator.", 2),
          part("b", "Which one will show the strongest increase in conductivity on moderate heating?", 1),
        ],
        hints: [
          L`Zero gap means no effective forbidden gap for conduction.`,
          L`The smallest non-zero gap is the semiconductor.`,
          L`Thermal generation matters most for the semiconductor.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Correctly classifies all three gaps.",
          },
          {
            part: "b",
            points: 1,
            description: "Identifies the semiconductor.",
          },
        ]),
        commonErrors: [
          "Treating the largest band gap as the best conductor.",
          "Forgetting that a zero gap corresponds to conductor-like behaviour.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The classifications are`,
            math: L`0\,\text{eV}:\text{ conductor},\quad 0.7\,\text{eV}:\text{ semiconductor},\quad 5.4\,\text{eV}:\text{ insulator}`,
          },
          {
            part: "b",
            explanation: L`The $0.7\,\text{eV}$ solid is the semiconductor, so moderate heating can create many more electron-hole pairs.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A pure semiconductor is kept first in a cold room and then near a warm lamp, without changing the applied voltage.`,
        difficulty: 2,
        skillTags: ["temperature_effect", "carrier_generation"],
        parts: onePart(
          "Explain qualitatively how its current changes and why.",
          3,
        ),
        hints: [
          L`The applied voltage is unchanged, so focus on carriers.`,
          L`Higher temperature can excite more electrons to the conduction band.`,
          L`Each excited electron leaves a hole behind.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States that current increases on warming.",
          },
          {
            part: "a",
            points: 2,
            description:
              "Explains the increase using thermal generation of electron-hole pairs across the small band gap.",
          },
        ]),
        commonErrors: [
          "Using metallic resistance-temperature reasoning without noting carrier generation.",
          "Saying holes are physical empty bubbles moving through the material.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`On warming, more electrons gain enough energy to cross the small forbidden gap into the conduction band.`,
          },
          {
            part: "a",
            explanation: L`This creates more electron-hole pairs, so the number of charge carriers increases and the current increases for the same applied voltage.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the energy-band sketches X, Y and Z in the figure.`,
        difficulty: 3,
        figure: bandGapFigure,
        skillTags: ["band_diagram_interpretation"],
        parts: [
          part("a", "Identify the conductor-like sketch.", 1),
          part("b", "Identify the semiconductor-like sketch.", 1),
          part("c", "Identify the insulator-like sketch.", 1),
          part("d", "Explain the classification using the forbidden gap.", 2),
        ],
        hints: [
          L`Look for overlap first.`,
          L`Then compare small and large forbidden gaps.`,
          L`The explanation must connect gap size to carrier availability.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies X." },
          { part: "b", points: 1, description: "Identifies Y." },
          { part: "c", points: 1, description: "Identifies Z." },
          {
            part: "d",
            points: 2,
            description:
              "Explains overlap, small gap and large gap in terms of availability of conduction-band carriers.",
          },
        ]),
        commonErrors: [
          "Naming Y as an insulator simply because the valence band is filled.",
          "Ignoring the overlap in X.",
          "Writing labels without giving the band-gap reason.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`X is conductor-like because the allowed bands overlap.`,
          },
          {
            part: "b",
            explanation: L`Y is semiconductor-like because the forbidden gap is small.`,
          },
          {
            part: "c",
            explanation: L`Z is insulator-like because the forbidden gap is large.`,
          },
          {
            part: "d",
            explanation: L`In X, electrons can enter available conduction states easily. In Y, thermal energy can excite some electrons across the small gap. In Z, the large gap prevents ordinary thermal excitation, so conduction is very poor.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school sensor team compares three materials. Material A has overlapping bands, material B has a small forbidden gap, and material C has a large forbidden gap. The team needs a material whose conductivity changes appreciably with temperature but which is not metallic.`,
        difficulty: 3,
        skillTags: ["application_band_gap", "sensor_material_choice"],
        parts: [
          part("a", "Which material should be chosen?", 1),
          part("b", "Why is material A unsuitable for this requirement?", 1),
          part("c", "Why is material C unsuitable for this requirement?", 1),
          part("d", "Explain why the chosen material responds to temperature.", 2),
        ],
        hints: [
          L`The requirement says not metallic.`,
          L`A large gap prevents appreciable thermal carrier generation.`,
          L`A small gap gives temperature-sensitive carrier generation.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Chooses material B." },
          {
            part: "b",
            points: 1,
            description: "States that A is conductor-like or metallic.",
          },
          {
            part: "c",
            points: 1,
            description: "States that C has too large a gap and is insulator-like.",
          },
          {
            part: "d",
            points: 2,
            description:
              "Links the small forbidden gap to increased electron-hole pair generation on heating.",
          },
        ]),
        commonErrors: [
          "Choosing the conductor because it already has high conductivity.",
          "Choosing the insulator because it has the largest gap.",
          "Forgetting the phrase 'not metallic'.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Material B should be chosen.`,
          },
          {
            part: "b",
            explanation: L`Material A has overlapping bands, so it behaves like a conductor or metal rather than a semiconductor sensor material.`,
          },
          {
            part: "c",
            explanation: L`Material C has a large forbidden gap, so ordinary thermal energy cannot create many carriers.`,
          },
          {
            part: "d",
            explanation: L`Material B has a small forbidden gap. When temperature rises, more electrons cross to the conduction band and leave holes behind, so its conductivity changes appreciably.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.2",
    title: "Intrinsic and Extrinsic Semiconductors",
    subtopic:
      "Electron-hole pairs, doping, donor and acceptor impurities, p-type and n-type materials",
    mc: [
      {
        questionLatex: L`In an intrinsic semiconductor at thermal equilibrium, the number of free electrons is`,
        difficulty: 1,
        skillTags: ["intrinsic_semiconductor", "carrier_concentration"],
        choices: [
          L`equal to the number of holes`,
          L`always zero`,
          L`much greater than the number of holes`,
          L`much smaller than the number of holes`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Thermal generation creates electron-hole pairs even in a pure semiconductor.`,
          C: L`In an intrinsic semiconductor, carriers are generated in pairs, so electrons and holes are equal in number.`,
          D: L`There is no acceptor doping in an intrinsic semiconductor to create hole majority carriers.`,
        },
        hints: [
          L`Intrinsic means pure.`,
          L`Thermal generation creates an electron and a hole together.`,
          L`Therefore electron concentration equals hole concentration.`,
        ],
        solution: [
          {
            explanation: L`In an intrinsic semiconductor, every thermally generated free electron leaves one hole.`,
          },
          {
            explanation: L`Thus the free-electron concentration equals the hole concentration.`,
            math: L`n_e=n_h`,
          },
        ],
      },
      {
        questionLatex: L`Pure silicon is doped with a pentavalent impurity such as phosphorus. The resulting semiconductor is`,
        difficulty: 2,
        skillTags: ["n_type", "donor_impurity"],
        choices: [
          L`p-type, with holes as majority carriers`,
          L`n-type, with electrons as majority carriers`,
          L`intrinsic, with equal electrons and holes`,
          L`an insulator, because impurity atoms block conduction`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Pentavalent atoms donate extra electrons; trivalent atoms create p-type material.`,
          C: L`Doping makes the semiconductor extrinsic, not intrinsic.`,
          D: L`Small controlled doping increases conductivity rather than making silicon an insulator.`,
        },
        hints: [
          L`Pentavalent means five valence electrons.`,
          L`Only four electrons form covalent bonds in silicon.`,
          L`The fifth electron becomes a mobile majority carrier.`,
        ],
        solution: [
          {
            explanation: L`A pentavalent impurity donates an extra electron to the semiconductor.`,
          },
          {
            explanation: L`Thus the doped material is n-type and electrons are the majority carriers.`,
          },
        ],
      },
      {
        questionLatex: L`In the figure, Sample Q has an acceptor atom in a silicon lattice. Sample Q is best described as`,
        difficulty: 2,
        figure: dopingComparisonFigure,
        skillTags: ["p_type", "acceptor_impurity", "figure_interpretation"],
        choices: [
          L`n-type, because the acceptor atom adds a free electron`,
          L`p-type, because holes are the majority carriers`,
          L`intrinsic, because every atom shown is neutral`,
          L`a metal, because it has a lattice`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`An acceptor impurity creates a hole; donor impurities provide extra electrons.`,
          C: L`The sample is deliberately doped, so it is extrinsic, not intrinsic.`,
          D: L`A silicon lattice with acceptor doping is still a semiconductor, not a metal.`,
        },
        hints: [
          L`An acceptor atom accepts an electron from a bond.`,
          L`This leaves a hole.`,
          L`Holes as majority carriers mean p-type.`,
        ],
        solution: [
          {
            explanation: L`An acceptor impurity in silicon creates holes.`,
          },
          {
            explanation: L`When holes are majority carriers, the material is p-type.`,
          },
        ],
      },
      {
        questionLatex: L`A doped semiconductor remains electrically neutral as a whole. In an n-type sample this is because`,
        difficulty: 3,
        skillTags: ["electrical_neutrality", "n_type"],
        choices: [
          L`the extra electrons are balanced by fixed positive donor ions`,
          L`all donor atoms become negative ions`,
          L`holes and electrons are still exactly equal in number`,
          L`the material has no mobile charge carriers`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`After donating an electron, donor atoms are fixed positive ions, not negative ions.`,
          C: L`An n-type material has electrons as majority carriers, so electrons and holes are not equal in number.`,
          D: L`An n-type semiconductor conducts because it has mobile majority electrons.`,
        },
        hints: [
          L`Doping does not create net charge in the full crystal.`,
          L`Ask what remains after a donor atom gives one electron.`,
          L`The fixed donor ion balances the mobile electron.`,
        ],
        solution: [
          {
            explanation: L`A donor atom supplies an electron for conduction and becomes a fixed positive ion in the lattice.`,
          },
          {
            explanation: L`The mobile electron and fixed ion charges balance, so the whole sample is electrically neutral.`,
          },
        ],
      },
      {
        questionLatex: L`A semiconductor sample has electron concentration much larger than hole concentration after doping. Which statement is correct?`,
        difficulty: 2,
        skillTags: ["majority_carriers", "n_type_identification"],
        choices: [
          L`It is p-type and electrons are minority carriers.`,
          L`It is n-type and electrons are majority carriers.`,
          L`It is intrinsic and holes are absent.`,
          L`It must be an insulator because holes are fewer.`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`If electrons are much more numerous, they are majority carriers, not minority carriers.`,
          C: L`Unequal carrier concentrations indicate extrinsic doping, not an intrinsic semiconductor.`,
          D: L`Fewer holes do not make it an insulator; electrons can carry current.`,
        },
        hints: [
          L`Majority carrier means the carrier present in larger concentration.`,
          L`If electrons dominate, use the name beginning with n.`,
          L`The sample is n-type.`,
        ],
        solution: [
          {
            explanation: L`Since electrons are much more numerous than holes, electrons are majority carriers.`,
          },
          {
            explanation: L`A semiconductor with electron majority carriers is n-type.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is an extrinsic semiconductor?`,
        difficulty: 1,
        skillTags: ["extrinsic_semiconductor_definition"],
        parts: onePart("Give the meaning of an extrinsic semiconductor.", 1),
        hints: [
          L`Compare it with a pure semiconductor.`,
          L`A small controlled amount of impurity is added.`,
          L`The purpose is to change carrier concentration.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Defines an extrinsic semiconductor as a doped semiconductor with controlled impurity added to increase conductivity.",
          },
        ]),
        commonErrors: [
          "Saying any dirty semiconductor is extrinsic.",
          "Forgetting controlled impurity/doping.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`An extrinsic semiconductor is a pure semiconductor doped with a small controlled amount of impurity to increase the number of charge carriers and hence its conductivity.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A silicon crystal is doped separately with aluminium and phosphorus.`,
        difficulty: 2,
        skillTags: ["p_type", "n_type", "dopants"],
        parts: [
          part("a", "Which doped crystal is p-type?", 1),
          part("b", "Which doped crystal is n-type?", 1),
          part("c", "Name the majority carriers in each case.", 2),
        ],
        hints: [
          L`Aluminium is trivalent.`,
          L`Phosphorus is pentavalent.`,
          L`Trivalent doping gives holes; pentavalent doping gives electrons.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies aluminium-doped silicon as p-type." },
          { part: "b", points: 1, description: "Identifies phosphorus-doped silicon as n-type." },
          {
            part: "c",
            points: 2,
            description: "States holes for p-type and electrons for n-type.",
          },
        ]),
        commonErrors: [
          "Reversing trivalent and pentavalent dopants.",
          "Calling ions the majority carriers instead of electrons/holes.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Aluminium is trivalent, so aluminium-doped silicon is p-type.`,
          },
          {
            part: "b",
            explanation: L`Phosphorus is pentavalent, so phosphorus-doped silicon is n-type.`,
          },
          {
            part: "c",
            explanation: L`The majority carriers are holes in p-type material and electrons in n-type material.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A doped germanium sample has $n_e=5.0\times10^{16}\,\text{m}^{-3}$ and $n_h=2.0\times10^{10}\,\text{m}^{-3}$.`,
        difficulty: 2,
        skillTags: ["majority_carriers", "n_type_identification"],
        parts: [
          part("a", "Identify whether the sample is p-type or n-type.", 1),
          part("b", "Name the majority and minority carriers.", 2),
        ],
        hints: [
          L`Compare $n_e$ and $n_h$.`,
          L`The much larger concentration gives the majority carrier.`,
          L`Electron majority means n-type.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies n-type." },
          {
            part: "b",
            points: 2,
            description:
              "Names electrons as majority carriers and holes as minority carriers.",
          },
        ]),
        commonErrors: [
          "Thinking n-type means negatively charged overall.",
          "Calling holes absent instead of minority carriers.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Since electron concentration is much greater than hole concentration, the sample is n-type.`,
          },
          {
            part: "b",
            explanation: L`Electrons are majority carriers and holes are minority carriers.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare intrinsic, n-type and p-type semiconductors in terms of purity, doping and majority carriers.`,
        difficulty: 3,
        skillTags: ["intrinsic_extrinsic_comparison"],
        parts: [
          part("a", "State the carrier relation in an intrinsic semiconductor.", 1),
          part("b", "Explain how n-type material is formed and name its majority carrier.", 2),
          part("c", "Explain how p-type material is formed and name its majority carrier.", 2),
        ],
        hints: [
          L`Intrinsic means no intentional doping.`,
          L`Pentavalent impurity donates electrons.`,
          L`Trivalent impurity creates holes.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States electron and hole concentrations are equal.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Mentions pentavalent donor impurity and electrons as majority carriers.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Mentions trivalent acceptor impurity and holes as majority carriers.",
          },
        ]),
        commonErrors: [
          "Saying n-type is negatively charged overall.",
          "Saying p-type current is carried by protons.",
          "Missing the donor/acceptor distinction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`In an intrinsic semiconductor, electrons and holes are thermally generated in pairs, so $n_e=n_h$.`,
          },
          {
            part: "b",
            explanation: L`n-type material is formed by doping with a pentavalent donor impurity. The extra electrons become majority carriers.`,
          },
          {
            part: "c",
            explanation: L`p-type material is formed by doping with a trivalent acceptor impurity. Holes become majority carriers.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher labels three wafers: A is pure silicon, B is silicon doped with phosphorus, and C is silicon doped with boron. The class must identify which wafers are suitable for making the two sides of a p-n junction.`,
        difficulty: 3,
        skillTags: ["application_doping", "pn_junction_preparation"],
        parts: [
          part("a", "Which wafer is intrinsic?", 1),
          part("b", "Which wafer is n-type?", 1),
          part("c", "Which wafer is p-type?", 1),
          part("d", "Which two wafers should be joined to form a p-n junction?", 1),
          part("e", "Name the majority carriers in those two wafers.", 2),
        ],
        hints: [
          L`Pure silicon is intrinsic.`,
          L`Phosphorus is pentavalent and boron is trivalent.`,
          L`A p-n junction needs one p-type and one n-type region.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies A." },
          { part: "b", points: 1, description: "Identifies B." },
          { part: "c", points: 1, description: "Identifies C." },
          { part: "d", points: 1, description: "Chooses B and C." },
          {
            part: "e",
            points: 2,
            description: "States electrons in B and holes in C.",
          },
        ]),
        commonErrors: [
          "Using pure silicon as one side of the junction.",
          "Reversing boron and phosphorus roles.",
          "Calling the fixed ions majority carriers.",
        ],
        workedSolution: [
          { part: "a", explanation: L`A is intrinsic because it is pure silicon.` },
          {
            part: "b",
            explanation: L`B is n-type because phosphorus is pentavalent and donates electrons.`,
          },
          {
            part: "c",
            explanation: L`C is p-type because boron is trivalent and creates holes.`,
          },
          {
            part: "d",
            explanation: L`The p-n junction should be made by joining B and C.`,
          },
          {
            part: "e",
            explanation: L`B has electrons as majority carriers; C has holes as majority carriers.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.3",
    title: "p-n Junction and Biasing",
    subtopic:
      "Diffusion, depletion region, potential barrier, forward bias and reverse bias",
    mc: [
      {
        questionLatex: L`When a p-type and an n-type semiconductor are first joined to form a p-n junction, electrons initially diffuse mainly`,
        difficulty: 2,
        skillTags: ["pn_junction_formation", "diffusion"],
        choices: [
          L`from the n-side to the p-side`,
          L`from the p-side to the n-side`,
          L`from the positive terminal of a battery to the p-side`,
          L`only inside the depletion region without crossing the junction`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Holes diffuse from p to n; electrons diffuse from n to p.`,
          C: L`The question is about junction formation before an external battery is applied.`,
          D: L`The depletion region forms because carriers diffuse across the junction and recombine.`,
        },
        hints: [
          L`The n-side has electron majority carriers.`,
          L`Diffusion occurs from higher concentration to lower concentration.`,
          L`Electrons diffuse from n to p.`,
        ],
        solution: [
          {
            explanation: L`The n-region has a high concentration of electrons, while the p-region has very few electrons.`,
          },
          {
            explanation: L`Therefore electrons initially diffuse from the n-side to the p-side.`,
          },
        ],
      },
      {
        questionLatex: L`The depletion region of an unbiased p-n junction mainly contains`,
        difficulty: 2,
        skillTags: ["depletion_region"],
        choices: [
          L`only mobile electrons`,
          L`only mobile holes`,
          L`immobile ionised donor and acceptor atoms with very few mobile carriers`,
          L`neutral silicon atoms with no electric field`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`Mobile electrons are depleted near the junction after recombination.`,
          B: L`Mobile holes are also depleted near the junction after recombination.`,
          D: L`The fixed ions create an electric field and potential barrier.`,
        },
        hints: [
          L`The name depletion region tells you what is depleted.`,
          L`Mobile carriers recombine near the junction.`,
          L`Fixed ionised impurity atoms remain behind.`,
        ],
        solution: [
          {
            explanation: L`Electrons and holes recombine near the junction, leaving fixed ionised donor and acceptor atoms.`,
          },
          {
            explanation: L`Thus the depletion region has very few mobile charge carriers but has immobile ions.`,
          },
        ],
      },
      {
        questionLatex: L`The potential barrier in a p-n junction is important because it`,
        difficulty: 2,
        skillTags: ["potential_barrier", "pn_junction"],
        choices: [
          L`aids unlimited diffusion of majority carriers`,
          L`opposes further diffusion of majority carriers across the junction`,
          L`removes all minority carriers from the semiconductor`,
          L`turns the semiconductor into a metal`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The barrier builds up because diffusion cannot continue without limit.`,
          C: L`Minority carriers are not removed completely in the ordinary junction model.`,
          D: L`A junction remains a semiconductor device, not a metal.`,
        },
        hints: [
          L`The barrier is due to the electric field of fixed ions.`,
          L`This electric field acts against further majority-carrier diffusion.`,
          L`It limits diffusion across the junction.`,
        ],
        solution: [
          {
            explanation: L`The ionised atoms in the depletion region set up an electric field and potential barrier.`,
          },
          {
            explanation: L`This barrier opposes further diffusion of majority carriers.`,
          },
        ],
      },
      {
        questionLatex: L`In the figure, which circuit shows the p-n junction in forward bias?`,
        difficulty: 2,
        figure: pnJunctionBiasFigure,
        skillTags: ["forward_bias", "circuit_interpretation"],
        choices: [
          L`Circuit P`,
          L`Circuit Q`,
          L`Both P and Q`,
          L`Neither P nor Q`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`In Q, the p-side is connected to the negative terminal and the n-side to the positive terminal, so it is reverse biased.`,
          C: L`Only one polarity makes the junction forward biased.`,
          D: L`Circuit P has the p-side to positive and n-side to negative, which is forward bias.`,
        },
        hints: [
          L`Forward bias means p-side to positive terminal.`,
          L`Forward bias also means n-side to negative terminal.`,
          L`Circuit P has that polarity.`,
        ],
        solution: [
          {
            explanation: L`A p-n junction is forward biased when the p-side is connected to the positive terminal and the n-side to the negative terminal.`,
          },
          {
            explanation: L`Circuit P shows this connection.`,
          },
        ],
      },
      {
        questionLatex: L`When a p-n junction diode is reverse biased, the depletion layer generally`,
        difficulty: 2,
        skillTags: ["reverse_bias", "depletion_width"],
        choices: [
          L`widens and the current is very small`,
          L`narrows and the current becomes large`,
          L`disappears completely`,
          L`turns into a conducting metallic wire`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Narrowing of depletion layer and large current are features of forward bias.`,
          C: L`Reverse bias strengthens the barrier; it does not remove the depletion layer.`,
          D: L`The junction remains a semiconductor junction.`,
        },
        hints: [
          L`Reverse bias applies polarity opposite to forward conduction.`,
          L`It pulls majority carriers away from the junction.`,
          L`The depletion layer becomes wider and only a tiny current flows.`,
        ],
        solution: [
          {
            explanation: L`In reverse bias, majority carriers are pulled away from the junction.`,
          },
          {
            explanation: L`So the depletion layer widens and only a very small reverse current flows.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is the depletion region of a p-n junction?`,
        difficulty: 1,
        skillTags: ["depletion_region_definition"],
        parts: onePart("Define the depletion region.", 1),
        hints: [
          L`It forms near the junction.`,
          L`Mobile carriers are absent or very few there.`,
          L`Fixed ionised impurity atoms remain.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Defines the depletion region as the junction region depleted of mobile carriers and containing fixed ions.",
          },
        ]),
        commonErrors: [
          "Calling it an empty physical gap.",
          "Saying it contains only free electrons.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The depletion region is the region near a p-n junction where mobile electrons and holes have recombined, leaving mainly immobile ionised donor and acceptor atoms.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain the formation of the potential barrier in an unbiased p-n junction.`,
        difficulty: 3,
        skillTags: ["potential_barrier", "pn_junction_formation"],
        parts: onePart("Write the explanation in two or three connected steps.", 3),
        hints: [
          L`Start with diffusion of majority carriers.`,
          L`Then describe recombination near the junction.`,
          L`Finally mention the field of fixed ions.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Mentions diffusion of electrons and holes across the junction.",
          },
          {
            part: "a",
            points: 1,
            description: "Mentions recombination and fixed ionised atoms.",
          },
          {
            part: "a",
            points: 1,
            description: "Links fixed ions to electric field/potential barrier.",
          },
        ]),
        commonErrors: [
          "Saying the barrier is due to the external battery.",
          "Forgetting recombination.",
          "Saying the depletion region has many free carriers.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Electrons diffuse from the n-side to the p-side and holes diffuse from the p-side to the n-side because of concentration difference.`,
          },
          {
            part: "a",
            explanation: L`Near the junction, electrons and holes recombine. This leaves fixed positive donor ions on the n-side and fixed negative acceptor ions on the p-side.`,
          },
          {
            part: "a",
            explanation: L`These fixed ions set up an electric field and a potential barrier that opposes further diffusion of majority carriers.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The figure shows two biased p-n junction circuits.`,
        difficulty: 2,
        figure: pnJunctionBiasFigure,
        skillTags: ["forward_reverse_bias", "figure_interpretation"],
        parts: [
          part("a", "Identify the forward-biased circuit.", 1),
          part("b", "Identify the reverse-biased circuit.", 1),
          part("c", "State which circuit has larger current through the diode.", 1),
        ],
        hints: [
          L`Check which side of the diode is connected to the positive terminal.`,
          L`p to positive is forward bias.`,
          L`Forward bias gives larger current.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies Circuit P." },
          { part: "b", points: 1, description: "Identifies Circuit Q." },
          {
            part: "c",
            points: 1,
            description: "States Circuit P has larger current.",
          },
        ]),
        commonErrors: [
          "Reading diode current direction instead of terminal polarity.",
          "Assuming both circuits conduct equally.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Circuit P is forward biased because p is connected to positive and n to negative.`,
          },
          {
            part: "b",
            explanation: L`Circuit Q is reverse biased because p is connected to negative and n to positive.`,
          },
          {
            part: "c",
            explanation: L`Circuit P has the larger current because forward bias reduces the effective barrier and narrows the depletion region.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare the behaviour of a p-n junction diode in forward bias and reverse bias.`,
        difficulty: 3,
        skillTags: ["forward_reverse_bias", "diode_comparison"],
        parts: [
          part("a", "State the terminal connection for forward bias.", 1),
          part("b", "State the terminal connection for reverse bias.", 1),
          part("c", "Compare the depletion layer in the two cases.", 2),
          part("d", "Compare the current in the two cases.", 1),
        ],
        hints: [
          L`Use p-side and n-side terminal polarities.`,
          L`Forward bias reduces the barrier; reverse bias increases it.`,
          L`Current follows from the barrier change.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "p-side to positive, n-side to negative.",
          },
          {
            part: "b",
            points: 1,
            description: "p-side to negative, n-side to positive.",
          },
          {
            part: "c",
            points: 2,
            description: "Forward bias narrows depletion layer; reverse bias widens it.",
          },
          {
            part: "d",
            points: 1,
            description:
              "Forward current is large after threshold; reverse current is very small.",
          },
        ]),
        commonErrors: [
          "Swapping forward and reverse bias connections.",
          "Saying reverse bias increases majority-carrier current.",
          "Ignoring the depletion layer.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Forward bias: p-side connected to the positive terminal and n-side to the negative terminal.`,
          },
          {
            part: "b",
            explanation: L`Reverse bias: p-side connected to the negative terminal and n-side to the positive terminal.`,
          },
          {
            part: "c",
            explanation: L`Forward bias reduces the potential barrier and narrows the depletion layer. Reverse bias increases the barrier and widens the depletion layer.`,
          },
          {
            part: "d",
            explanation: L`Hence forward bias allows a comparatively large current, while reverse bias gives only a very small current in ordinary operation.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A diode is used to protect a sensitive circuit by allowing current only when its p-side is at a higher potential than its n-side. In one test, the p-side is connected to $+5\,\text{V}$ through a resistor and the n-side is connected to the negative terminal. In another test the battery is reversed.`,
        difficulty: 3,
        skillTags: ["applied_biasing", "diode_current"],
        parts: [
          part("a", "Name the biasing in the first test.", 1),
          part("b", "Name the biasing in the second test.", 1),
          part("c", "In which test is the diode current larger?", 1),
          part("d", "Explain using depletion layer/barrier language.", 2),
        ],
        hints: [
          L`p-side at higher potential means forward bias.`,
          L`Reversing the battery gives reverse bias.`,
          L`Connect the current to the width of depletion layer.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States forward bias." },
          { part: "b", points: 1, description: "States reverse bias." },
          { part: "c", points: 1, description: "States first test." },
          {
            part: "d",
            points: 2,
            description:
              "Explains that forward bias reduces barrier/narrows depletion layer while reverse bias widens it.",
          },
        ]),
        commonErrors: [
          "Thinking current is decided only by battery magnitude.",
          "Ignoring diode polarity.",
          "Calling reverse current zero in all circumstances without qualification.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The first test is forward bias because the p-side is connected to the positive terminal.`,
          },
          {
            part: "b",
            explanation: L`The second test is reverse bias because the p-side is connected to the negative terminal.`,
          },
          {
            part: "c",
            explanation: L`The current is larger in the first test.`,
          },
          {
            part: "d",
            explanation: L`Forward bias reduces the effective barrier and narrows the depletion region, so majority carriers cross the junction. Reverse bias widens the depletion region and only a very small current flows.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.4",
    title: "Diode I-V Characteristics",
    subtopic:
      "Forward and reverse characteristics of a semiconductor diode and graphical interpretation",
    mc: [
      {
        questionLatex: L`The diode I-V graph in the figure shows a sharp rise in current after the knee in the forward-bias region. This means that`,
        difficulty: 2,
        figure: diodeIvFigure,
        skillTags: ["iv_characteristic", "forward_bias"],
        choices: [
          L`the diode begins to conduct appreciably only after the forward voltage exceeds a certain value`,
          L`the diode obeys Ohm's law over the entire graph`,
          L`the reverse current is larger than the forward current`,
          L`the diode conducts equally in both directions`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The graph is non-linear and asymmetric, unlike an ohmic resistor.`,
          C: L`The reverse current shown is very small compared with the forward current after the knee.`,
          D: L`The graph clearly shows different forward and reverse behaviour.`,
        },
        hints: [
          L`Focus on the forward-bias side of the graph.`,
          L`Before the knee, current is small.`,
          L`After the knee, current rises rapidly.`,
        ],
        solution: [
          {
            explanation: L`In forward bias, the diode current remains small initially and then increases rapidly after the knee voltage.`,
          },
        ],
      },
      {
        questionLatex: L`In the reverse-bias part of an ordinary diode I-V characteristic, the current is usually`,
        difficulty: 2,
        skillTags: ["reverse_characteristic", "diode_current"],
        choices: [
          L`very small over the normal reverse-bias range`,
          L`large and proportional to voltage from the start`,
          L`exactly the same as the forward current`,
          L`zero because minority carriers do not exist`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`A large proportional current describes an ohmic conductor, not the reverse region of a diode.`,
          C: L`A diode has asymmetric forward and reverse characteristics.`,
          D: L`Minority carriers exist, so a very small reverse current can flow.`,
        },
        hints: [
          L`Reverse bias widens the depletion layer.`,
          L`Majority-carrier current is blocked.`,
          L`Only a very small reverse current remains in normal operation.`,
        ],
        solution: [
          {
            explanation: L`In reverse bias, the depletion region widens and majority carriers are blocked.`,
          },
          {
            explanation: L`Only a very small reverse current flows in the normal reverse-bias range.`,
          },
        ],
      },
      {
        questionLatex: L`A diode I-V graph is not symmetric about the origin. The best conclusion is that the diode is`,
        difficulty: 2,
        skillTags: ["non_ohmic_device", "iv_graph"],
        choices: [
          L`a bidirectional ohmic resistor`,
          L`a non-ohmic device with direction-dependent conduction`,
          L`an open circuit for every applied voltage`,
          L`a metallic wire at low temperature`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`An ohmic resistor has a straight, symmetric V-I characteristic through the origin.`,
          C: L`A forward-biased diode conducts appreciably after the knee.`,
          D: L`A diode is a p-n junction device, not a metallic wire.`,
        },
        hints: [
          L`Compare with an ohmic resistor graph.`,
          L`A diode conducts much more in one direction.`,
          L`That is non-ohmic and direction-dependent.`,
        ],
        solution: [
          {
            explanation: L`The I-V graph of a diode is non-linear and different in forward and reverse bias.`,
          },
          {
            explanation: L`Therefore it is a non-ohmic, direction-dependent device.`,
          },
        ],
      },
      {
        questionLatex: L`In an experiment, the diode current changes from $2\,\text{mA}$ to $18\,\text{mA}$ when the forward voltage is increased slightly after the knee. This observation is consistent with`,
        difficulty: 3,
        skillTags: ["iv_experiment", "forward_knee"],
        choices: [
          L`a rapid rise of forward current after the knee`,
          L`constant reverse saturation current`,
          L`zero current in forward bias`,
          L`Ohm's law with constant resistance over all voltages`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The observation is in forward bias after the knee, not in the reverse-bias region.`,
          C: L`The current is clearly not zero; it rises from $2\,\text{mA}$ to $18\,\text{mA}$.`,
          D: L`A diode's forward characteristic after the knee is strongly non-linear, not constant-resistance over all voltages.`,
        },
        hints: [
          L`The change happens after the knee.`,
          L`Forward current then grows sharply for a small voltage increase.`,
          L`This is the forward characteristic of a diode.`,
        ],
        solution: [
          {
            explanation: L`After the knee voltage, a small increase in forward voltage can produce a large increase in diode current.`,
          },
          {
            explanation: L`So the observation matches the rapid-rise part of the forward I-V characteristic.`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A p-n junction diode can be used as a rectifier. Reason (R): Its I-V characteristic shows much larger current in one bias direction than in the other. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "iv_rectifier_link"],
        choices: [
          L`Both A and R are true, and R explains A`,
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
          L`A is false but R is true`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The direction-dependent conduction is precisely why a diode can rectify AC.`,
          C: L`The reason is true: diode conduction is much stronger in forward bias.`,
          D: L`The assertion is also true; a junction diode is used as a rectifier.`,
        },
        hints: [
          L`Rectification needs current to pass mainly one way.`,
          L`A diode's I-V graph is asymmetric.`,
          L`That asymmetry explains rectifier action.`,
        ],
        solution: [
          {
            explanation: L`A diode conducts strongly in forward bias and very weakly in reverse bias.`,
          },
          {
            explanation: L`This one-way conduction allows it to convert AC into pulsating DC, so both statements are true and R explains A.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What does the forward-bias knee in a diode I-V characteristic indicate?`,
        difficulty: 1,
        skillTags: ["knee_voltage_concept"],
        parts: onePart("State the meaning of the knee region.", 1),
        hints: [
          L`Look at where current begins to rise rapidly.`,
          L`Before this region, current is small.`,
          L`After it, conduction becomes appreciable.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that the knee indicates the forward voltage beyond which current rises rapidly/appreciably.",
          },
        ]),
        commonErrors: [
          "Calling the knee a reverse-bias point.",
          "Saying it is where current becomes zero.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The knee region indicates the forward voltage beyond which the diode current begins to increase rapidly and conduction becomes appreciable.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The figure shows the I-V characteristic of a p-n junction diode.`,
        difficulty: 2,
        figure: diodeIvFigure,
        skillTags: ["iv_graph_interpretation"],
        parts: [
          part("a", "Which side of the graph represents forward bias?", 1),
          part("b", "Which side represents reverse bias?", 1),
          part("c", "State one difference between currents in the two regions.", 1),
        ],
        hints: [
          L`Positive voltage is the forward-bias side in the graph.`,
          L`Negative voltage is the reverse-bias side.`,
          L`Compare the size of current in the two parts.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies positive-voltage/right side." },
          { part: "b", points: 1, description: "Identifies negative-voltage/left side." },
          {
            part: "c",
            points: 1,
            description:
              "States forward current rises rapidly while reverse current remains very small.",
          },
        ]),
        commonErrors: [
          "Treating the graph like a resistor graph.",
          "Calling both sides forward bias.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The positive-voltage side is the forward-bias region.`,
          },
          {
            part: "b",
            explanation: L`The negative-voltage side is the reverse-bias region.`,
          },
          {
            part: "c",
            explanation: L`The forward current rises rapidly after the knee, whereas the reverse current is very small in normal operation.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student plots current through a diode for both battery polarities and obtains an asymmetric graph.`,
        difficulty: 2,
        skillTags: ["diode_experiment", "non_ohmic"],
        parts: onePart(
          "Why is the graph not a straight line through the origin like an ohmic resistor?",
          3,
        ),
        hints: [
          L`A diode is a p-n junction, not a uniform metallic conductor.`,
          L`Its depletion layer changes differently in the two bias directions.`,
          L`Therefore current is direction-dependent.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States that a diode is non-ohmic/asymmetric.",
          },
          {
            part: "a",
            points: 2,
            description:
              "Explains using forward bias and reverse bias effects on barrier/depletion layer.",
          },
        ]),
        commonErrors: [
          "Saying the graph is wrong because all electrical devices must be ohmic.",
          "Ignoring reverse-bias behaviour.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`A diode is a p-n junction device whose depletion layer and potential barrier depend strongly on bias direction.`,
          },
          {
            part: "a",
            explanation: L`Forward bias narrows the depletion layer and allows appreciable current after the knee, while reverse bias widens it and gives only a small current. Hence the graph is non-linear and asymmetric, unlike an ohmic resistor.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Describe how the forward and reverse I-V characteristics of a p-n junction diode are obtained in a school experiment and what features are expected in the graph.`,
        difficulty: 3,
        skillTags: ["iv_characteristic_experiment", "graph_features"],
        parts: [
          part("a", "State the main circuit elements needed.", 1),
          part("b", "Explain what is varied and what is measured.", 2),
          part("c", "Describe the forward-bias part of the graph.", 1),
          part("d", "Describe the reverse-bias part of the graph.", 1),
        ],
        hints: [
          L`The experiment needs a diode, source, resistor/rheostat and meters.`,
          L`Voltage across the diode and current through it are measured.`,
          L`The key result is asymmetric I-V behaviour.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Names diode, DC source, series resistor/rheostat, ammeter and voltmeter.",
          },
          {
            part: "b",
            points: 2,
            description:
              "States varying applied voltage/polarity and measuring diode voltage and current.",
          },
          {
            part: "c",
            points: 1,
            description: "Describes small initial current then rapid rise after knee.",
          },
          {
            part: "d",
            points: 1,
            description: "Describes very small reverse current in normal reverse bias.",
          },
        ]),
        commonErrors: [
          "Connecting the voltmeter in series.",
          "Forgetting to reverse the diode/battery polarity for reverse characteristic.",
          "Describing a straight-line resistor graph.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The circuit uses a p-n junction diode, DC source, key, current-limiting resistor or rheostat, ammeter in series and voltmeter across the diode.`,
          },
          {
            part: "b",
            explanation: L`The applied voltage is varied in small steps. For each step, the voltage across the diode and current through it are recorded. The polarity is then reversed for reverse-bias readings.`,
          },
          {
            part: "c",
            explanation: L`In forward bias, current is small at first and then rises sharply after the knee region.`,
          },
          {
            part: "d",
            explanation: L`In reverse bias, only a very small current flows in the normal reverse-voltage range.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A lab group records these diode readings. In forward bias, current is nearly zero up to about $0.5\,\text{V}$ and then rises quickly. In reverse bias, current remains very small for the voltages used.`,
        difficulty: 3,
        skillTags: ["iv_data_interpretation", "diode_lab"],
        parts: [
          part("a", "What feature of the forward characteristic is near $0.5\,\text{V}$?", 1),
          part("b", "What does the small reverse current show about the diode?", 1),
          part("c", "Is the diode ohmic? Give a reason.", 2),
          part("d", "Name one application that follows from this behaviour.", 1),
        ],
        hints: [
          L`The forward current begins rapid growth near the knee.`,
          L`Reverse current being small shows one-way conduction.`,
          L`One-way conduction leads to rectification.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies knee/threshold region." },
          {
            part: "b",
            points: 1,
            description: "States the diode blocks current strongly in reverse bias.",
          },
          {
            part: "c",
            points: 2,
            description:
              "States non-ohmic and gives non-linear/asymmetric graph as reason.",
          },
          {
            part: "d",
            points: 1,
            description: "Names rectifier/AC to pulsating DC conversion.",
          },
        ]),
        commonErrors: [
          "Calling the $0.5\,\text{V}$ point a reverse-bias feature.",
          "Saying the diode is ohmic because it conducts in forward bias.",
          "Missing the rectifier application.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The region near $0.5\,\text{V}$ is the knee or threshold region where forward current begins to rise rapidly.`,
          },
          {
            part: "b",
            explanation: L`The small reverse current shows that the diode strongly opposes current in reverse bias.`,
          },
          {
            part: "c",
            explanation: L`The diode is non-ohmic because its I-V characteristic is non-linear and different for the two polarities.`,
          },
          {
            part: "d",
            explanation: L`This one-way conduction is used in a rectifier.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.5",
    title: "Diode as a Rectifier",
    subtopic:
      "Half-wave and full-wave rectifier action using the unidirectional conduction of a diode",
    mc: [
      {
        questionLatex: L`In a half-wave rectifier using a single diode, the output across the load is obtained mainly because the diode`,
        difficulty: 2,
        skillTags: ["half_wave_rectifier", "diode_action"],
        choices: [
          L`conducts during one half-cycle and blocks during the other half-cycle`,
          L`stores charge like a capacitor`,
          L`amplifies the input voltage`,
          L`changes the frequency of the AC source before conduction`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Capacitor filtering is a different idea; rectification here follows from diode conduction direction.`,
          C: L`A simple diode rectifier does not amplify voltage.`,
          D: L`The diode first selects half-cycles; it does not change source frequency before conduction.`,
        },
        hints: [
          L`A diode conducts mainly in forward bias.`,
          L`During the opposite half-cycle it is reverse biased.`,
          L`So only one half of AC appears across the load.`,
        ],
        solution: [
          {
            explanation: L`In one half-cycle, the diode is forward biased and conducts. In the other half-cycle, it is reverse biased and blocks current.`,
          },
          {
            explanation: L`Thus the load receives a pulsating output of one polarity.`,
          },
        ],
      },
      {
        questionLatex: L`In the waveform figure, which output corresponds to half-wave rectification?`,
        difficulty: 2,
        figure: rectifierFigure,
        skillTags: ["waveform_identification", "half_wave_rectifier"],
        choices: [
          L`Output P`,
          L`Output Q`,
          L`Both P and Q equally`,
          L`The input waveform itself`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Output Q has both half-cycles made positive, which is full-wave rectification.`,
          C: L`P and Q have different numbers of pulses per cycle.`,
          D: L`The input still has positive and negative halves, so it is not rectified output.`,
        },
        hints: [
          L`Half-wave means only alternate half-cycles appear.`,
          L`Look for gaps where the negative half-cycle would have been.`,
          L`That is Output P.`,
        ],
        solution: [
          {
            explanation: L`A half-wave rectifier passes only one half-cycle of the AC input and blocks the other.`,
          },
          {
            explanation: L`Output P shows positive pulses separated by zero-output intervals, so it is half-wave rectification.`,
          },
        ],
      },
      {
        questionLatex: L`In the waveform figure, Output Q is best described as`,
        difficulty: 2,
        figure: rectifierFigure,
        skillTags: ["full_wave_rectifier", "waveform_interpretation"],
        choices: [
          L`unrectified AC`,
          L`half-wave rectified output`,
          L`full-wave rectified pulsating DC`,
          L`constant DC with no ripple`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`Output Q does not go negative; it is rectified.`,
          B: L`Output Q has a pulse in every half-cycle, not alternate half-cycles only.`,
          D: L`The output still varies with time, so it is pulsating rather than constant.`,
        },
        hints: [
          L`Check whether negative halves remain negative.`,
          L`Check whether both halves of the input appear as same-polarity pulses.`,
          L`That is full-wave rectified pulsating DC.`,
        ],
        solution: [
          {
            explanation: L`Output Q has both half-cycles converted to the same polarity.`,
          },
          {
            explanation: L`Therefore it is full-wave rectified pulsating DC, not steady DC.`,
          },
        ],
      },
      {
        questionLatex: L`A $50\,\text{Hz}$ AC supply is given to an ideal full-wave rectifier. The number of output pulses per second is`,
        difficulty: 3,
        skillTags: ["full_wave_rectifier", "frequency_reasoning"],
        choices: [
          L`25`,
          L`50`,
          L`100`,
          L`200`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`Full-wave rectification does not halve the number of half-cycle pulses.`,
          B: L`That would be the pulse count for half-wave rectification of a $50\,\text{Hz}$ input.`,
          D: L`Each AC cycle has two half-cycles, not four.`,
        },
        hints: [
          L`One AC cycle has two half-cycles.`,
          L`Full-wave rectification gives an output pulse for each half-cycle.`,
          L`So the pulse rate is twice $50\,\text{Hz}$.`,
        ],
        solution: [
          {
            explanation: L`A $50\,\text{Hz}$ AC supply has $50$ cycles per second.`,
          },
          {
            explanation: L`A full-wave rectifier gives two output pulses per input cycle.`,
            math: L`2\times50=100`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A rectifier output is called pulsating DC rather than pure DC. Reason (R): The output has one polarity but its magnitude still changes with time. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "pulsating_dc"],
        choices: [
          L`Both A and R are true, and R explains A`,
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
          L`A is false but R is true`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The changing magnitude is exactly why the rectified output is pulsating rather than pure steady DC.`,
          C: L`The reason is true for an unfiltered rectifier output.`,
          D: L`The assertion is true: an ordinary diode rectifier output is pulsating DC.`,
        },
        hints: [
          L`Rectified output has one polarity.`,
          L`But it is not constant with time.`,
          L`That is why it is called pulsating DC.`,
        ],
        solution: [
          {
            explanation: L`A rectifier makes the output one-directional, but the output voltage still rises and falls with time.`,
          },
          {
            explanation: L`Therefore both statements are true and the reason explains the assertion.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In a diode power-supply circuit, what does rectification mean?`,
        difficulty: 1,
        skillTags: ["rectification_definition"],
        parts: onePart("State the conversion achieved by rectification.", 1),
        hints: [
          L`Think of what happens to AC.`,
          L`A diode allows mainly one direction of current.`,
          L`The output is one-directional but usually pulsating.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Defines rectification as conversion of AC into unidirectional/pulsating DC.",
          },
        ]),
        commonErrors: [
          "Calling rectification amplification.",
          "Saying it always produces perfectly steady DC.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Rectification is the process of converting alternating current into unidirectional, usually pulsating, direct current using a device such as a diode.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The figure shows a simple half-wave rectifier circuit.`,
        difficulty: 2,
        figure: rectifierCircuitFigure,
        skillTags: ["half_wave_rectifier_circuit"],
        parts: [
          part("a", "During which input half-cycle does the diode conduct?", 1),
          part("b", "What appears across the load during the opposite half-cycle?", 1),
          part("c", "Name the type of output obtained.", 1),
        ],
        hints: [
          L`The diode conducts when it is forward biased.`,
          L`In the opposite half-cycle it is reverse biased.`,
          L`The output has only one set of half-cycles.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States the half-cycle that forward biases the diode, with polarity language accepted.",
          },
          {
            part: "b",
            points: 1,
            description: "States nearly zero/no output for the blocked half-cycle.",
          },
          {
            part: "c",
            points: 1,
            description: "Names half-wave rectified/pulsating DC output.",
          },
        ]),
        commonErrors: [
          "Saying both half-cycles pass through a single diode in this circuit.",
          "Calling the output pure DC.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The diode conducts during the half-cycle in which it is forward biased.`,
          },
          {
            part: "b",
            explanation: L`During the opposite half-cycle, the diode is reverse biased, so the output across the load is nearly zero for an ideal diode.`,
          },
          {
            part: "c",
            explanation: L`The output is half-wave rectified pulsating DC.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $60\,\text{Hz}$ AC input is applied first to a half-wave rectifier and then to a full-wave rectifier.`,
        difficulty: 3,
        skillTags: ["rectifier_frequency", "waveform_reasoning"],
        parts: [
          part("a", "How many output pulses per second are obtained in the half-wave rectifier?", 1),
          part("b", "How many output pulses per second are obtained in the full-wave rectifier?", 1),
          part("c", "Which output has smaller gaps between pulses?", 1),
        ],
        hints: [
          L`Half-wave gives one output pulse per AC cycle.`,
          L`Full-wave gives two output pulses per AC cycle.`,
          L`More pulses per second means smaller gaps.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds 60 pulses per second." },
          { part: "b", points: 1, description: "Finds 120 pulses per second." },
          { part: "c", points: 1, description: "Identifies full-wave output." },
        ]),
        commonErrors: [
          "Doubling the half-wave pulse rate.",
          "Forgetting that full-wave rectification uses both half-cycles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`A half-wave rectifier gives one output pulse per input cycle.`,
            math: L`60\,\text{pulses s}^{-1}`,
          },
          {
            part: "b",
            explanation: L`A full-wave rectifier gives two output pulses per input cycle.`,
            math: L`2\times60=120\,\text{pulses s}^{-1}`,
          },
          {
            part: "c",
            explanation: L`The full-wave output has smaller gaps because it uses both halves of every input cycle.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Explain the working of a half-wave rectifier using a p-n junction diode.`,
        difficulty: 3,
        skillTags: ["half_wave_rectifier_working"],
        parts: [
          part("a", "State the property of the diode used.", 1),
          part("b", "Explain the conducting half-cycle.", 2),
          part("c", "Explain the blocked half-cycle.", 2),
          part("d", "Describe the nature of the output.", 1),
        ],
        hints: [
          L`Start with unidirectional conduction.`,
          L`Use forward bias for one half-cycle.`,
          L`Use reverse bias for the other half-cycle.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States unidirectional conduction of diode.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Explains forward bias and current through load in one half-cycle.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains reverse bias and no/negligible current in the other half-cycle.",
          },
          {
            part: "d",
            points: 1,
            description: "Describes half-wave pulsating DC output.",
          },
        ]),
        commonErrors: [
          "Saying AC becomes constant DC without further filtering.",
          "Not linking conduction to diode bias.",
          "Saying current flows equally in both half-cycles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`A diode conducts appreciably in forward bias and almost blocks current in reverse bias.`,
          },
          {
            part: "b",
            explanation: L`During the half-cycle that makes the diode forward biased, current flows through the diode and load resistor, so a voltage appears across the load.`,
          },
          {
            part: "c",
            explanation: L`During the opposite half-cycle, the diode is reverse biased, so current through the load is negligible.`,
          },
          {
            part: "d",
            explanation: L`The load therefore receives pulses of one polarity only. The output is half-wave rectified pulsating DC.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows an AC input and two possible outputs P and Q from diode rectifier circuits. A $50\,\text{Hz}$ source feeds an ideal full-wave rectifier whose secondary peak voltage is $6.0\,\text{V}$ across a $2.0\,\text{k}\Omega$ load. The observation window is $0.10\,\text{s}$.`,
        difficulty: 4,
        figure: rectifierFigure,
        skillTags: ["rectifier_waveform_case", "application_reasoning"],
        parts: [
          part("a", "Which output is half-wave rectified?", 1),
          part("b", "Which output is full-wave rectified?", 1),
          part("c", "How many full-wave output pulses appear in $0.10\,\\text{s}$?", 1),
          part("d", "Find the peak current through the load.", 1),
          part("e", "Explain why output Q is still not pure steady DC.", 2),
        ],
        hints: [
          L`Half-wave keeps only alternate half-cycles.`,
          L`A full-wave rectifier gives two output pulses per input cycle.`,
          L`Use $I_{\max}=V_{\max}/R$ for the ideal load-current peak, then comment on the changing waveform.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies P." },
          { part: "b", points: 1, description: "Identifies Q." },
          { part: "c", points: 1, description: "Finds 10 pulses in 0.10 s." },
          {
            part: "d",
            points: 1,
            description: "Finds peak current $3.0\,\\text{mA}$.",
          },
          {
            part: "e",
            points: 2,
            description:
              "Explains output has one polarity but changing magnitude/ripple.",
          },
        ]),
        commonErrors: [
          "Calling Q pure DC because it never goes negative.",
          "Using 50 pulses per second for full-wave output instead of doubling it.",
          "Using $2.0\,\\text{k}\\Omega$ as $2.0\,\\Omega$.",
          "Calling P and Q the same output.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Output P is half-wave rectified because only alternate half-cycles appear.`,
          },
          {
            part: "b",
            explanation: L`Output Q is full-wave rectified because both half-cycles appear as same-polarity pulses.`,
          },
          {
            part: "c",
            explanation: L`A full-wave rectifier gives two pulses per input cycle, so the pulse rate is`,
            math: L`2\times50=100\,\text{pulses s}^{-1}`,
          },
          {
            part: "c",
            explanation: L`In $0.10\,\text{s}$, the number of pulses is`,
            math: L`100\times0.10=10`,
          },
          {
            part: "d",
            explanation: L`For an ideal rectifier, the peak load current is`,
            math: L`I_{\max}=\frac{V_{\max}}{R}=\frac{6.0}{2.0\times10^3}=3.0\times10^{-3}\,\text{A}`,
          },
          {
            part: "e",
            explanation: L`Output Q remains pulsating: it has one polarity, but its magnitude repeatedly rises and falls. Pure steady DC would have constant magnitude.`,
          },
        ],
      },
    ],
  },
];

export const electronicDevicesTopics: Topic[] = topics.map(makeTopic);
