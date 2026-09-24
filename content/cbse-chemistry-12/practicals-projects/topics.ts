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

const COURSE = "cbse-chemistry-12";
const UNIT = "practicals-projects";
const VERSION = "0.1.3";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
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
  calculatorAllowed?: boolean;
  skillTags: string[];
  figure?: ItemFigure;
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStepSeed[];
  commonMisconceptions?: string[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
  calculatorAllowed?: boolean;
  skillTags: string[];
  figure?: ItemFigure;
  parts: readonly FrqPart[];
  hints: readonly [string, string, string];
  rubric: FrqRubric;
  commonErrors: readonly string[];
  workedSolution: readonly FrqSolutionPart[];
  commonMisconceptions?: string[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|xrightarrow|le|ge|neq|mu|sqrt|sigma|pi)\b/g,
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
  return `You chose ${choiceText}. Recheck the observation, apparatus handling, endpoint, confirmatory test, graph reading, or control variable before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const choices = LETTERS.map((letter, choiceIndex) => {
    const isCorrect = letter === seed.correctLetter;
    return {
      letter,
      text: repairInlineLatex(seed.choices[choiceIndex]),
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : repairInlineLatex(
            seed.rationales[letter] ?? fallbackWrongRationale(seed, letter),
          ),
      misconceptionTag: isCorrect
        ? null
        : "incorrect_cbse_class12_chemistry_practical_reasoning",
    };
  }) as McChoice[];

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
      "answers_practical_viva_by_memory_without_checking_observation_or_precaution",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: seed.correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairStep),
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
      "states_final_result_without_observation_principle_or_precaution",
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

const buretteMeniscusFigure: ItemFigure = {
  type: "svg",
  title: "Burette meniscus reading",
  description:
    "A burette scale between 24 and 25 mL with the lower meniscus at the 24.60 mL mark.",
  svg: `<svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="360" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <rect x="205" y="34" width="110" height="284" rx="14" fill="#f8fbff" stroke="#334155" stroke-width="3"/>
    <rect x="211" y="54" width="98" height="244" fill="#e0f2fe" opacity="0.45"/>
    <path d="M212 190 C235 202 285 202 308 190 L308 245 L212 245 Z" fill="#93c5fd" opacity="0.95"/>
    <path d="M212 190 C235 202 285 202 308 190" fill="none" stroke="#1d4ed8" stroke-width="4"/>
    <line x1="315" y1="56" x2="365" y2="56" stroke="#334155" stroke-width="3"/>
    <line x1="315" y1="80" x2="342" y2="80" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="104" x2="342" y2="104" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="128" x2="342" y2="128" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="152" x2="342" y2="152" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="176" x2="365" y2="176" stroke="#334155" stroke-width="3"/>
    <line x1="315" y1="200" x2="342" y2="200" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="224" x2="342" y2="224" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="248" x2="342" y2="248" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="272" x2="342" y2="272" stroke="#334155" stroke-width="2"/>
    <line x1="315" y1="296" x2="365" y2="296" stroke="#334155" stroke-width="3"/>
    <text x="382" y="62" font-size="22">24.0</text>
    <text x="382" y="182" font-size="22">24.5</text>
    <text x="382" y="302" font-size="22">25.0</text>
    <line x1="130" y1="200" x2="205" y2="200" stroke="#ef4444" stroke-width="3" stroke-dasharray="6 6"/>
    <text x="48" y="206" font-size="18" fill="#b91c1c">read lower meniscus</text>
  </g>
</svg>`,
};

const titrationSetupFigure: ItemFigure = {
  type: "svg",
  title: "Permanganate titration setup",
  description:
    "A labelled titration setup with a burette, conical flask, white tile and clamp stand.",
  svg: `<svg viewBox="0 0 620 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="400" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="150" y1="340" x2="500" y2="340" stroke="#94a3b8" stroke-width="4"/>
    <line x1="210" y1="54" x2="210" y2="340" stroke="#334155" stroke-width="5"/>
    <line x1="210" y1="82" x2="335" y2="82" stroke="#334155" stroke-width="4"/>
    <rect x="332" y="42" width="34" height="205" rx="9" fill="#fdf2f8" stroke="#334155" stroke-width="3"/>
    <rect x="337" y="66" width="24" height="162" fill="#c084fc" opacity="0.75"/>
    <path d="M344 247 L354 247 L349 282 Z" fill="#334155"/>
    <path d="M350 283 C350 301 350 305 350 318" stroke="#9333ea" stroke-width="3" fill="none"/>
    <path d="M290 330 L412 330 L386 252 L316 252 Z" fill="#e0f2fe" stroke="#334155" stroke-width="3"/>
    <path d="M312 302 C330 292 374 292 392 302 L403 330 L301 330 Z" fill="#fce7f3" opacity="0.85"/>
    <rect x="270" y="342" width="165" height="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
    <text x="390" y="90" font-size="17">burette</text>
    <text x="386" y="130" font-size="16">KMnO₄ solution</text>
    <text x="414" y="282" font-size="16">conical flask</text>
    <text x="405" y="315" font-size="16">acidified oxalate</text>
    <text x="285" y="382" font-size="16">white tile</text>
    <text x="96" y="55" font-size="18">clamp stand</text>
  </g>
</svg>`,
};

const saltGasFigure: ItemFigure = {
  type: "svg",
  title: "Gas test during salt analysis",
  description:
    "Dilute acid added to a salt gives effervescence; the gas turns lime water milky.",
  svg: `<svg viewBox="0 0 650 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="650" height="360" fill="#ffffff"/>
  <defs>
    <marker id="chem12-gas-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <path d="M95 75 L155 75 L138 270 L112 270 Z" fill="#eef2ff" stroke="#334155" stroke-width="3"/>
    <path d="M108 218 C118 210 132 210 145 218 L140 270 L112 270 Z" fill="#fde68a" opacity="0.95"/>
    <text x="62" y="48" font-size="17">salt + dilute acid</text>
    <circle cx="126" cy="185" r="5" fill="#60a5fa"/>
    <circle cx="139" cy="165" r="4" fill="#60a5fa"/>
    <circle cx="119" cy="150" r="3.5" fill="#60a5fa"/>
    <path d="M165 178 C250 128 335 128 420 178" fill="none" stroke="#2563eb" stroke-width="4" marker-end="url(#chem12-gas-arrow)"/>
    <path d="M463 92 L550 92 L530 286 L483 286 Z" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
    <path d="M478 220 C490 210 522 210 536 220 L530 286 L483 286 Z" fill="#e2e8f0"/>
    <text x="446" y="55" font-size="17">lime water</text>
    <text x="462" y="324" font-size="17">turns milky</text>
    <text x="246" y="116" font-size="17" fill="#2563eb">gas evolved</text>
  </g>
</svg>`,
};

const chromatographyFigure: ItemFigure = {
  type: "svg",
  title: "Paper chromatography strip",
  description:
    "A chromatography strip with baseline, solvent front at 8.0 cm, and two spots at 3.2 cm and 5.2 cm from the baseline.",
  svg: `<svg viewBox="0 0 620 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <rect x="235" y="42" width="150" height="320" fill="#fff7ed" stroke="#334155" stroke-width="3"/>
    <line x1="220" y1="332" x2="405" y2="332" stroke="#334155" stroke-width="3"/>
    <line x1="220" y1="76" x2="405" y2="76" stroke="#0f766e" stroke-width="3" stroke-dasharray="8 6"/>
    <circle cx="310" cy="230" r="13" fill="#f97316" opacity="0.9"/>
    <circle cx="310" cy="166" r="13" fill="#2563eb" opacity="0.9"/>
    <line x1="430" y1="332" x2="430" y2="76" stroke="#64748b" stroke-width="2"/>
    <line x1="424" y1="332" x2="436" y2="332" stroke="#64748b" stroke-width="2"/>
    <line x1="424" y1="76" x2="436" y2="76" stroke="#64748b" stroke-width="2"/>
    <text x="448" y="209" font-size="18">8.0 cm</text>
    <line x1="160" y1="332" x2="160" y2="166" stroke="#64748b" stroke-width="2"/>
    <line x1="154" y1="332" x2="166" y2="332" stroke="#64748b" stroke-width="2"/>
    <line x1="154" y1="166" x2="166" y2="166" stroke="#64748b" stroke-width="2"/>
    <text x="74" y="254" font-size="18">5.2 cm</text>
    <text x="408" y="70" font-size="17" fill="#0f766e">solvent front</text>
    <text x="407" y="338" font-size="17">baseline</text>
    <text x="327" y="171" font-size="17">B</text>
    <text x="327" y="236" font-size="17">A</text>
  </g>
</svg>`,
};

const dialysisFigure: ItemFigure = {
  type: "svg",
  title: "Dialysis of a sol",
  description:
    "A parchment bag containing ferric hydroxide sol with sodium chloride impurity is suspended in water.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <rect x="128" y="64" width="365" height="260" rx="22" fill="#e0f2fe" stroke="#334155" stroke-width="3"/>
    <text x="272" y="350" font-size="18">water outside bag</text>
    <path d="M275 52 C250 105 248 225 276 286 C294 310 330 310 348 286 C376 225 374 105 349 52 Z" fill="#fff7ed" stroke="#92400e" stroke-width="3"/>
    <path d="M268 188 C286 176 337 176 356 188 L350 286 C329 306 294 306 275 286 Z" fill="#fed7aa" opacity="0.95"/>
    <text x="221" y="38" font-size="17">parchment bag</text>
    <text x="288" y="208" font-size="16">Fe(OH)₃ sol</text>
    <text x="292" y="230" font-size="16">+ NaCl</text>
    <g fill="#2563eb">
      <circle cx="238" cy="148" r="4"/><circle cx="218" cy="222" r="4"/><circle cx="390" cy="170" r="4"/>
      <circle cx="410" cy="248" r="4"/><circle cx="450" cy="126" r="4"/><circle cx="174" cy="270" r="4"/>
    </g>
    <text x="445" y="114" font-size="15" fill="#2563eb">small ions</text>
    <text x="144" y="91" font-size="15">beaker</text>
  </g>
</svg>`,
};

const calorimetryFigure: ItemFigure = {
  type: "svg",
  title: "Temperature rise in neutralization",
  description:
    "A temperature-time graph for a neutralization experiment showing 25.0 degrees C before mixing and 31.0 degrees C after mixing.",
  svg: `<svg viewBox="0 0 640 410" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="410" fill="#ffffff"/>
  <defs>
    <marker id="chem12-cal-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="85" y1="335" x2="555" y2="335" stroke="#334155" stroke-width="3" marker-end="url(#chem12-cal-arrow)"/>
    <line x1="85" y1="335" x2="85" y2="58" stroke="#334155" stroke-width="3" marker-end="url(#chem12-cal-arrow)"/>
    <text x="514" y="368" font-size="17">time</text>
    <text x="16" y="72" font-size="17">temp (°C)</text>
    <g stroke="#dbe4f0" stroke-width="1">
      <line x1="85" y1="285" x2="535" y2="285"/><line x1="85" y1="235" x2="535" y2="235"/>
      <line x1="85" y1="185" x2="535" y2="185"/><line x1="85" y1="135" x2="535" y2="135"/>
      <line x1="85" y1="85" x2="535" y2="85"/>
    </g>
    <text x="55" y="291" font-size="15">25</text><text x="55" y="141" font-size="15">31</text>
    <path d="M105 285 L245 285 L255 135 L405 135 L510 165" fill="none" stroke="#dc2626" stroke-width="4"/>
    <line x1="250" y1="330" x2="250" y2="80" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
    <text x="208" y="356" font-size="15">mixing</text>
    <text x="415" y="131" font-size="15">maximum</text>
  </g>
</svg>`,
};

const electrochemicalCellFigure: ItemFigure = {
  type: "svg",
  title: "Daniell cell with unequal ion concentrations",
  description:
    "A Daniell cell represented as Zn in 0.10 M zinc sulfate connected by a salt bridge to copper in 1.00 M copper sulfate.",
  svg: `<svg viewBox="0 0 700 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="390" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <rect x="74" y="140" width="205" height="175" rx="18" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
    <rect x="421" y="140" width="205" height="175" rx="18" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
    <path d="M88 236 C128 218 225 218 265 236 L265 315 L88 315 Z" fill="#dbeafe"/>
    <path d="M435 236 C475 218 572 218 612 236 L612 315 L435 315 Z" fill="#dcfce7"/>
    <rect x="157" y="84" width="28" height="190" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
    <rect x="508" y="84" width="28" height="190" fill="#f97316" stroke="#7c2d12" stroke-width="2"/>
    <path d="M185 84 C245 42 450 42 508 84" fill="none" stroke="#334155" stroke-width="4"/>
    <rect x="300" y="52" width="95" height="46" rx="10" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
    <text x="323" y="82" font-size="19">V</text>
    <path d="M250 176 C310 122 390 122 451 176" fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round"/>
    <text x="122" y="342" font-size="17">0.10 M ZnSO₄</text>
    <text x="468" y="342" font-size="17">1.00 M CuSO₄</text>
    <text x="154" y="76" font-size="17">Zn</text>
    <text x="504" y="76" font-size="17">Cu</text>
    <text x="314" y="142" font-size="16">salt bridge</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "Lab.1",
    title: "Volumetric Analysis",
    subtopic:
      "Standard solutions, KMnO4 titration, burette readings, endpoints and error reasoning.",
    mc: [
      mc(
        L`In the $\mathrm{KMnO_4}$ versus oxalic acid titration, the endpoint is best described as`,
        2,
        ["kmno4_titration", "endpoint"],
        [
          L`a permanent faint pink colour in the conical flask`,
          L`a permanent deep blue colour in the conical flask`,
          L`the disappearance of every trace of pink from the burette`,
          L`a white precipitate appearing in the flask`,
        ],
        "A",
        {
          B: L`Deep blue is not the permanganate endpoint; excess $\mathrm{KMnO_4}$ gives faint pink.`,
          C: L`The endpoint is judged in the flask, not by the colour left in the burette.`,
          D: L`This titration is a redox titration, not a precipitation endpoint.`,
        },
        [
          L`$\mathrm{KMnO_4}$ is intensely purple and acts as its own indicator.`,
          L`At the endpoint, a slight excess of permanganate remains.`,
          L`That slight excess gives a faint permanent pink colour.`,
        ],
        [{ explanation: L`In acidified oxalate titration, the first permanent faint pink colour marks a slight excess of $\mathrm{KMnO_4}$ and hence the endpoint.` }],
      ),
      mc(
        L`The lower meniscus in the burette shown should be recorded as`,
        2,
        ["burette_reading", "least_count"],
        [
          L`24.50 mL`,
          L`24.60 mL`,
          L`24.90 mL`,
          L`25.40 mL`,
        ],
        "B",
        {
          A: L`The meniscus is one small division below the 24.5 mark on a downward-increasing burette scale.`,
          C: L`24.90 mL is much closer to the 25.0 mark than the shown lower meniscus.`,
          D: L`25.40 mL is outside the marked 24.0 to 25.0 interval shown.`,
        },
        [
          L`Burette readings increase downward.`,
          L`Read the bottom of the meniscus for a colourless solution.`,
          L`The meniscus bottom is one 0.1 mL division below 24.5 mL.`,
        ],
        [
          { explanation: L`The scale increases downward and the lower meniscus lies at the first small division after 24.5 mL.` },
          { explanation: L`Therefore the reading is $24.60\,\mathrm{mL}$.` },
        ],
        buretteMeniscusFigure,
      ),
      mc(
        L`For titrating oxalic acid with $\mathrm{KMnO_4}$, dilute $\mathrm{H_2SO_4}$ is used instead of dilute $\mathrm{HCl}$ mainly because`,
        3,
        ["acid_medium", "redox_titration"],
        [
          L`$\mathrm{HCl}$ can be oxidised by $\mathrm{KMnO_4}$ and disturb the titre`,
          L`$\mathrm{H_2SO_4}$ is a weak acid and slows the reaction completely`,
          L`$\mathrm{HCl}$ gives a blue endpoint with oxalic acid`,
          L`$\mathrm{H_2SO_4}$ reacts stoichiometrically with oxalic acid as the analyte`,
        ],
        "A",
        {
          B: L`Sulphuric acid supplies the acidic medium; it is not chosen to stop the reaction.`,
          C: L`There is no blue endpoint in this titration.`,
          D: L`Oxalic acid is the reductant being estimated; sulphuric acid is the medium.`,
        },
        [
          L`The acid should not itself undergo oxidation by permanganate.`,
          L`Chloride ion can interfere in strong oxidising conditions.`,
          L`Sulphuric acid provides acid without that chloride interference.`,
        ],
        [
          { explanation: L`Acidified $\mathrm{KMnO_4}$ is a strong oxidising agent.` },
          { explanation: L`Dilute $\mathrm{HCl}$ introduces chloride ions that may be oxidised, so dilute $\mathrm{H_2SO_4}$ is preferred.` },
        ],
      ),
      mc(
        L`During a titration, an air bubble is present in the burette jet at the initial reading but disappears before the endpoint. The recorded titre will be`,
        3,
        ["burette_error", "titration_error"],
        [
          L`unaffected because the bubble is outside the scale`,
          L`lower than the true volume delivered to the flask`,
          L`higher than the true volume delivered to the flask`,
          L`exactly double the true volume delivered`,
        ],
        "C",
        {
          A: L`The bubble volume is filled by solution during titration and affects the reading difference.`,
          B: L`The recorded fall includes solution used to fill the jet, not only solution entering the flask.`,
          D: L`The error is systematic but not a fixed doubling.`,
        },
        [
          L`Ask where the solution goes when the bubble disappears.`,
          L`Some solution fills the jet instead of reaching the flask.`,
          L`The burette reading still counts that volume as used.`,
        ],
        [
          { explanation: L`When the bubble disappears, solution fills the jet volume before entering the conical flask.` },
          { explanation: L`The burette reading change includes this extra volume, so the recorded titre is higher than the true volume delivered to the flask.` },
        ],
      ),
      mc(
        L`In the titration setup shown, the white tile is placed below the conical flask mainly to`,
        2,
        ["titration_setup", "endpoint_detection"],
        [
          L`increase the reaction temperature`,
          L`prevent $\mathrm{KMnO_4}$ from leaving the burette`,
          L`neutralise excess acid in the flask`,
          L`make the faint endpoint colour easier to see`,
        ],
        "D",
        {
          A: L`The tile is not a heater.`,
          B: L`Flow from the burette is controlled by the stopcock, not by the tile.`,
          C: L`The tile does not react with the solution.`,
        },
        [
          L`The endpoint colour can be very faint.`,
          L`A white background improves contrast.`,
          L`This helps avoid overshooting the endpoint.`,
        ],
        [{ explanation: L`The white tile provides a clear background so the first permanent faint pink endpoint is visible.` }],
        titrationSetupFigure,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why is no external indicator required in the $\mathrm{KMnO_4}$ titration?`,
        1,
        ["self_indicator", "kmno4_titration"],
        onePart(L`Give the practical reason.`, 1),
        [
          L`Think about the colour of $\mathrm{KMnO_4}$.`,
          L`The endpoint is shown by a slight excess of permanganate.`,
          L`The first permanent faint pink colour is visible without another indicator.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{KMnO_4}$ acts as a self-indicator because a slight excess gives a permanent faint pink colour at the endpoint.`,
          },
        ],
        [L`Saying no indicator is needed because the reaction is slow.`],
      ),
      frq(
        "saq",
        L`A student has to prepare $250\,\mathrm{mL}$ of $0.050\,\mathrm{M}$ oxalic acid solution using crystalline oxalic acid, $\mathrm{H_2C_2O_4\cdot 2H_2O}$, molar mass $126\,\mathrm{g\,mol^{-1}}$.`,
        2,
        ["standard_solution", "molarity_calculation"],
        parts([
          ["a", L`Calculate the mass required.`, 1],
          ["b", L`State one step that ensures the final volume is accurate.`, 1],
        ]),
        [
          L`Use $m=M V M_r$ with volume in litre.`,
          L`$250\,\mathrm{mL}=0.250\,\mathrm{L}$.`,
          L`Make up to the calibration mark in a standard flask.`,
        ],
        [
          {
            part: "a",
            explanation: L`The required mass is`,
            math: L`0.050\times 0.250\times 126=1.575\,\mathrm{g}`,
          },
          {
            part: "b",
            explanation: L`Transfer quantitatively to a $250\,\mathrm{mL}$ standard flask and make up to the mark with distilled water, reading the meniscus at eye level.`,
          },
        ],
        [L`Using $250$ instead of $0.250\,\mathrm{L}$ in the molarity formula.`],
        undefined,
        true,
      ),
      frq(
        "saq",
        L`$20.0\,\mathrm{mL}$ of $0.050\,\mathrm{M}$ oxalic acid requires $16.0\,\mathrm{mL}$ of acidified $\mathrm{KMnO_4}$ for complete oxidation. For the reaction, $2\mathrm{MnO_4^-}$ react with $5\mathrm{C_2O_4^{2-}}$. Find the molarity of $\mathrm{KMnO_4}$.`,
        3,
        ["redox_stoichiometry", "titre_calculation"],
        parts([
          ["a", L`Find moles of oxalate used.`, 1],
          ["b", L`Find moles of permanganate used.`, 1],
          ["c", L`Calculate molarity of $\mathrm{KMnO_4}$.`, 1],
        ]),
        [
          L`First find moles of oxalic acid/oxalate.`,
          L`Use the ratio $2:5$ for permanganate to oxalate.`,
          L`Divide moles of permanganate by $0.0160\,\mathrm{L}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Moles of oxalate are`,
            math: L`0.050\times 0.0200=1.00\times 10^{-3}\,\mathrm{mol}`,
          },
          {
            part: "b",
            explanation: L`Moles of permanganate are`,
            math: L`\frac{2}{5}\times 1.00\times 10^{-3}=4.00\times 10^{-4}\,\mathrm{mol}`,
          },
          {
            part: "c",
            explanation: L`The molarity of $\mathrm{KMnO_4}$ is`,
            math: L`\frac{4.00\times 10^{-4}}{0.0160}=0.0250\,\mathrm{M}`,
          },
        ],
        [L`Using a $5:2$ ratio instead of $2:5$ for permanganate to oxalate.`],
        undefined,
        true,
      ),
      frq(
        "laq",
        L`In a $\mathrm{KMnO_4}$ titration, the titres obtained after the rough trial are $15.8\,\mathrm{mL}$, $15.7\,\mathrm{mL}$ and $15.7\,\mathrm{mL}$.`,
        4,
        ["concordant_readings", "titration_record"],
        parts([
          ["a", L`Which readings should be used for the mean titre?`, 1],
          ["b", L`Find the mean titre.`, 1],
          ["c", L`State the endpoint colour.`, 1],
          ["d", L`Give one precaution while taking burette readings.`, 1],
        ]),
        [
          L`Use concordant readings, not the rough trial.`,
          L`The two identical readings are the best pair.`,
          L`Endpoint and reading precautions are practical-viva points.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use the two concordant readings $15.7\,\mathrm{mL}$ and $15.7\,\mathrm{mL}$.`,
          },
          {
            part: "b",
            explanation: L`The mean titre is $15.7\,\mathrm{mL}$.`,
          },
          {
            part: "c",
            explanation: L`The endpoint is a permanent faint pink colour.`,
          },
          {
            part: "d",
            explanation: L`Read the upper meniscus of the dark permanganate solution at eye level, using the same convention for initial and final readings. Accept ensuring that the jet is filled and free of air bubbles as another valid precaution.`,
          },
        ],
        [L`Averaging the rough reading together with the concordant readings.`],
      ),
      frq(
        "case",
        L`During a practical exam, a student prepares a standard oxalic acid solution, fills the burette with $\mathrm{KMnO_4}$ and titrates it against the oxalic acid in a conical flask. The student leaves the funnel on the burette, notices an air bubble in the burette jet after taking the initial reading, and uses a wet conical flask.`,
        4,
        ["titration_case", "error_analysis"],
        parts([
          ["a", L`Why should the funnel be removed before titration?`, 1],
          ["b", L`What should be done about the air bubble before taking the initial reading?`, 1],
          ["c", L`Does a wet conical flask necessarily change the moles of oxalic acid pipetted into it?`, 1],
          ["d", L`Name the self-indicator in this titration.`, 1],
        ]),
        [
          L`Think about solution drops entering after the initial reading.`,
          L`The burette jet must be filled with solution before the reading is taken.`,
          L`Water in the conical flask dilutes, but does not change the pipetted moles.`,
        ],
        [
          {
            part: "a",
            explanation: L`The funnel may add extra drops to the burette after the initial reading, changing the titre.`,
          },
          {
            part: "b",
            explanation: L`Run solution through the jet to remove the air bubble, then take the initial reading.`,
          },
          {
            part: "c",
            explanation: L`No. A wet conical flask dilutes the solution but does not change the number of moles delivered by the pipette.`,
          },
          {
            part: "d",
            explanation: L`$\mathrm{KMnO_4}$ is the self-indicator.`,
          },
        ],
        [L`Saying a wet conical flask always changes the amount of solute pipetted.`],
      ),
    ],
  },
  {
    topicCode: "Lab.2",
    title: "Salt Analysis and Functional Group Tests",
    subtopic:
      "Systematic observations, confirmatory tests for ions, and organic functional-group tests.",
    mc: [
      mc(
        L`In the salt-analysis observation shown, the anion is most likely`,
        2,
        ["carbonate_test", "salt_analysis_observation"],
        [
          L`$\mathrm{SO_4^{2-}}$`,
          L`$\mathrm{Cl^-}$`,
          L`$\mathrm{NO_3^-}$`,
          L`$\mathrm{CO_3^{2-}}$`,
        ],
        "D",
        {
          A: L`Sulphate does not give effervescence with dilute acid and lime-water milkiness.`,
          B: L`Chloride is confirmed by silver nitrate after acidification, not by lime-water milkiness.`,
          C: L`Nitrate is not inferred from carbon dioxide turning lime water milky.`,
        },
        [
          L`Effervescence with dilute acid suggests a gas is evolved.`,
          L`A gas that turns lime water milky is carbon dioxide.`,
          L`Carbon dioxide from dilute acid points to carbonate.`,
        ],
        [
          { explanation: L`Carbonates react with dilute acid to release $\mathrm{CO_2}$.` },
          { explanation: L`$\mathrm{CO_2}$ turns lime water milky, so the anion is $\mathrm{CO_3^{2-}}$.` },
        ],
        saltGasFigure,
      ),
      mc(
        L`A salt warmed with aqueous $\mathrm{NaOH}$ gives a gas that turns moist red litmus blue. This is a confirmatory clue for`,
        2,
        ["ammonium_test", "salt_analysis"],
        [
          L`$\mathrm{NH_4^+}$`,
          L`$\mathrm{Cu^{2+}}$`,
          L`$\mathrm{Ba^{2+}}$`,
          L`$\mathrm{Al^{3+}}$`,
        ],
        "A",
        {
          B: L`Copper(II) gives blue precipitates/complexes, not ammonia gas on warming with sodium hydroxide.`,
          C: L`Barium ion is not detected by ammonia evolution with sodium hydroxide.`,
          D: L`Aluminium ion gives a gelatinous white precipitate soluble in excess sodium hydroxide.`,
        },
        [
          L`A basic gas turns moist red litmus blue.`,
          L`The gas is ammonia.`,
          L`Ammonia on warming with sodium hydroxide indicates ammonium ion.`,
        ],
        [
          { explanation: L`$\mathrm{NH_4^+}$ reacts with hydroxide on warming to liberate $\mathrm{NH_3}$.` },
          { explanation: L`Ammonia turns moist red litmus blue, confirming ammonium ion.` },
        ],
      ),
      mc(
        L`A salt solution acidified with dilute $\mathrm{HNO_3}$ gives a curdy white precipitate with $\mathrm{AgNO_3}$, soluble in aqueous ammonia. The anion is`,
        3,
        ["chloride_test", "confirmatory_test"],
        [
          L`$\mathrm{SO_4^{2-}}$`,
          L`$\mathrm{CO_3^{2-}}$`,
          L`$\mathrm{Cl^-}$`,
          L`$\mathrm{CH_3COO^-}$`,
        ],
        "C",
        {
          A: L`Sulphate is confirmed by barium chloride giving a white precipitate insoluble in acid.`,
          B: L`Carbonate would effervesce with dilute acid.`,
          D: L`Acetate is not confirmed by curdy white silver chloride soluble in ammonia.`,
        },
        [
          L`Silver nitrate forms precipitates with halides.`,
          L`Curdy white silver halide soluble in ammonia is characteristic.`,
          L`This points to silver chloride and chloride ion.`,
        ],
        [
          { explanation: L`Acidification removes interfering carbonate/sulphite ions.` },
          { explanation: L`Curdy white $\mathrm{AgCl}$ soluble in aqueous ammonia confirms $\mathrm{Cl^-}$.` },
        ],
      ),
      mc(
        L`A blue precipitate with $\mathrm{NaOH}$, insoluble in excess, and a deep-blue solution with excess aqueous ammonia is characteristic of`,
        3,
        ["cupric_ion_test", "salt_analysis"],
        [
          L`$\mathrm{Zn^{2+}}$`,
          L`$\mathrm{Al^{3+}}$`,
          L`$\mathrm{Cu^{2+}}$`,
          L`$\mathrm{NH_4^+}$`,
        ],
        "C",
        {
          A: L`Zinc hydroxide is white and dissolves in excess sodium hydroxide and ammonia.`,
          B: L`Aluminium hydroxide is white and soluble in excess sodium hydroxide, not deep blue with ammonia.`,
          D: L`Ammonium ion is detected by ammonia gas on warming with base.`,
        },
        [
          L`The precipitate colour is important.`,
          L`Copper(II) hydroxide is blue.`,
          L`The deep-blue ammoniacal complex is a strong copper(II) clue.`,
        ],
        [
          { explanation: L`$\mathrm{Cu^{2+}}$ gives blue $\mathrm{Cu(OH)_2}$ with sodium hydroxide.` },
          { explanation: L`With excess ammonia it forms a deep-blue ammine complex, confirming copper(II).` },
        ],
      ),
      mc(
        L`Which test best distinguishes an aldehyde from a simple ketone in the functional-group practical?`,
        2,
        ["aldehyde_test", "functional_group_test"],
        [
          L`Tollens' reagent giving a silver mirror with the aldehyde`,
          L`Iodine solution giving a blue-black colour with the aldehyde`,
          L`Litmus paper turning blue with the ketone`,
          L`Barium chloride giving a white precipitate with the ketone`,
        ],
        "A",
        {
          B: L`Blue-black iodine test is for starch, not aldehyde versus ketone.`,
          C: L`Ketones are not identified by turning litmus blue.`,
          D: L`Barium chloride is used in inorganic anion tests such as sulphate.`,
        },
        [
          L`Aldehydes are more readily oxidised than simple ketones.`,
          L`Tollens' reagent is an oxidising reagent.`,
          L`Aldehydes reduce it to metallic silver.`,
        ],
        [{ explanation: L`Aldehydes reduce Tollens' reagent to metallic silver, giving a silver mirror; simple ketones generally do not.` }],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why should the original salt sample be used in small quantities during preliminary tests?`,
        1,
        ["salt_analysis_precaution"],
        onePart(L`Give one practical reason.`, 1),
        [
          L`A salt-analysis sample may be limited.`,
          L`Many confirmatory tests are still needed after preliminary tests.`,
          L`Using small quantities also reduces waste and risk.`,
        ],
        [
          {
            part: "a",
            explanation: L`Small quantities are used so enough sample remains for confirmatory tests and to reduce wastage and risk during heating or acid tests.`,
          },
        ],
        [L`Using the whole sample in the first test and leaving none for confirmation.`],
      ),
      frq(
        "saq",
        L`A salt gives no gas with dilute acid. Its aqueous solution gives a white precipitate with $\mathrm{BaCl_2}$ after acidification with dilute $\mathrm{HCl}$; the precipitate is insoluble in dilute acid.`,
        2,
        ["sulphate_test", "anion_confirmation"],
        parts([
          ["a", L`Identify the anion.`, 1],
          ["b", L`Write the confirmatory observation.`, 1],
        ]),
        [
          L`Barium chloride is a standard test for one anion.`,
          L`The acid-insoluble white precipitate matters.`,
          L`Think of barium sulphate.`,
        ],
        [
          {
            part: "a",
            explanation: L`The anion is sulphate, $\mathrm{SO_4^{2-}}$.`,
          },
          {
            part: "b",
            explanation: L`A white precipitate of $\mathrm{BaSO_4}$ forms with $\mathrm{BaCl_2}$ and remains insoluble in dilute acid.`,
          },
        ],
        [L`Calling the anion carbonate just because a white precipitate is seen.`],
      ),
      frq(
        "saq",
        L`Suggest one test each to distinguish a carboxylic acid and a phenol in an organic functional-group practical.`,
        2,
        ["organic_functional_group_tests", "carboxylic_acid_phenol"],
        parts([
          ["a", L`Give one test for carboxylic acid.`, 1],
          ["b", L`Give one test for phenol.`, 1],
        ]),
        [
          L`Carboxylic acids react with bicarbonate.`,
          L`Phenols give a characteristic ferric chloride colour.`,
          L`Use observations, not only reagent names.`,
        ],
        [
          {
            part: "a",
            explanation: L`A carboxylic acid gives brisk effervescence of $\mathrm{CO_2}$ with sodium bicarbonate solution.`,
          },
          {
            part: "b",
            explanation: L`A phenol gives a violet or coloured complex with neutral ferric chloride solution.`,
          },
        ],
        [L`Using litmus alone as the only distinction, which is too weak for confirmation.`],
      ),
      frq(
        "laq",
        L`A salt gives ammonia on warming with $\mathrm{NaOH}$. A separate portion gives a curdy white precipitate with acidified $\mathrm{AgNO_3}$, soluble in aqueous ammonia.`,
        4,
        ["salt_analysis_case", "cation_anion_confirmation"],
        parts([
          ["a", L`Identify the cation.`, 1],
          ["b", L`Identify the anion.`, 1],
          ["c", L`Name the gas evolved with $\mathrm{NaOH}$.`, 1],
          ["d", L`Why is dilute $\mathrm{HNO_3}$ used before adding $\mathrm{AgNO_3}$?`, 1],
        ]),
        [
          L`Ammonia on warming with sodium hydroxide points to ammonium ion.`,
          L`Curdy white precipitate soluble in ammonia points to chloride.`,
          L`Acidification removes interfering anions before the silver nitrate test.`,
        ],
        [
          {
            part: "a",
            explanation: L`The cation is $\mathrm{NH_4^+}$.`,
          },
          {
            part: "b",
            explanation: L`The anion is $\mathrm{Cl^-}$.`,
          },
          {
            part: "c",
            explanation: L`The gas is ammonia, $\mathrm{NH_3}$.`,
          },
          {
            part: "d",
            explanation: L`Dilute nitric acid removes interfering carbonate or sulphite ions before chloride is tested with silver nitrate.`,
          },
        ],
        [L`Identifying silver ion as the cation because silver nitrate was used as a reagent.`],
      ),
      frq(
        "case",
        L`An unknown organic compound gives an orange precipitate with $2,4$-DNP reagent. It does not give Tollens' silver mirror, but it gives a yellow precipitate in the iodoform test.`,
        4,
        ["organic_test_case", "ketone_identification"],
        parts([
          ["a", L`Which broad functional group is indicated by the $2,4$-DNP test?`, 1],
          ["b", L`What does the negative Tollens' test rule out?`, 1],
          ["c", L`What group is suggested by the positive iodoform test?`, 1],
          ["d", L`Give a suitable classification of the compound.`, 1],
        ]),
        [
          L`$2,4$-DNP detects carbonyl compounds.`,
          L`Tollens' test separates aldehydes from most ketones.`,
          L`Iodoform test is positive for methyl ketones and a few related alcohols.`,
        ],
        [
          {
            part: "a",
            explanation: L`The compound contains a carbonyl group, so it is an aldehyde or ketone.`,
          },
          {
            part: "b",
            explanation: L`The negative Tollens' test rules out an aldehyde under the usual school-lab interpretation.`,
          },
          {
            part: "c",
            explanation: L`The positive iodoform test suggests a $\mathrm{CH_3CO-}$ group.`,
          },
          {
            part: "d",
            explanation: L`The compound is best classified as a methyl ketone.`,
          },
        ],
        [L`Concluding aldehyde from the $2,4$-DNP test alone.`],
      ),
    ],
  },
  {
    topicCode: "Lab.3",
    title: "Content-Based Experiments",
    subtopic:
      "Surface chemistry, kinetics, thermochemistry, electrochemistry and chromatography observations.",
    mc: [
      mc(
        L`In the dialysis setup shown, the outside water will test positive for chloride ions after some time because`,
        3,
        ["dialysis", "colloids"],
        [
          L`colloidal particles pass rapidly through parchment paper`,
          L`the parchment bag converts ferric hydroxide into silver chloride`,
          L`dialysis changes every lyophobic sol into a true solution`,
          L`small ions diffuse through the membrane but colloidal particles are retained`,
        ],
        "D",
        {
          A: L`Dialysis works because colloidal particles are retained by the membrane.`,
          B: L`Silver chloride forms only if silver nitrate is later added to chloride-containing liquid; the bag does not create it.`,
          C: L`Dialysis removes small ionic impurities; it does not convert every sol into a true solution.`,
        },
        [
          L`Compare particle sizes.`,
          L`Small ions can move through the membrane.`,
          L`Colloidal particles remain inside the bag.`,
        ],
        [
          { explanation: L`Dialysis separates small ionic impurities from colloidal particles through a semipermeable membrane.` },
          { explanation: L`Thus chloride ions can pass into the outside water while $\mathrm{Fe(OH)_3}$ sol particles remain mostly inside.` },
        ],
        dialysisFigure,
      ),
      mc(
        L`In the sodium thiosulphate and hydrochloric acid rate experiment, the cross below the flask disappears because`,
        2,
        ["chemical_kinetics_practical", "sulphur_precipitate"],
        [
          L`a soluble sodium chloride layer magnifies the cross`,
          L`insoluble sulphur forms and makes the mixture cloudy`,
          L`hydrogen gas burns above the flask`,
          L`the acid neutralises the ink of the cross`,
        ],
        "B",
        {
          A: L`The cross becomes less visible because the mixture becomes cloudy, not because it is magnified.`,
          C: L`The observation is due to turbidity from sulphur, not burning hydrogen.`,
          D: L`The cross is outside the flask and is not chemically neutralised.`,
        },
        [
          L`The reaction produces a solid in fine form.`,
          L`A fine suspension scatters light.`,
          L`The solid is sulphur.`,
        ],
        [
          { explanation: L`The reaction produces colloidal/finely divided sulphur.` },
          { explanation: L`The sulphur makes the solution turbid, so the cross becomes invisible.` },
        ],
      ),
      mc(
        L`From the chromatography figure, the $R_f$ value of spot B is`,
        3,
        ["chromatography", "rf_calculation"],
        [
          L`0.40`,
          L`1.54`,
          L`5.20`,
          L`0.65`,
        ],
        "D",
        {
          A: L`0.40 corresponds to the lower spot at $3.2\,\mathrm{cm}$, not spot B.`,
          B: L`$R_f$ is spot distance divided by solvent-front distance, so it should not exceed 1 here.`,
          C: L`$5.20$ is the distance travelled by spot B in cm, not the ratio.`,
        },
        [
          L`Use $R_f=\frac{\text{distance travelled by spot}}{\text{distance travelled by solvent front}}$.`,
          L`For spot B, use $5.2\,\mathrm{cm}$ and $8.0\,\mathrm{cm}$.`,
          L`$5.2/8.0=0.65$.`,
        ],
        [
          { explanation: L`For spot B, the distance travelled by the spot is $5.2\,\mathrm{cm}$ and the solvent front is $8.0\,\mathrm{cm}$.` },
          { explanation: L`Therefore`, math: L`R_f=\frac{5.2}{8.0}=0.65` },
        ],
        chromatographyFigure,
        true,
      ),
      mc(
        L`For the Daniell cell shown, diluting the $\mathrm{CuSO_4}$ solution while keeping the zinc half-cell unchanged will generally`,
        3,
        ["electrochemistry_practical", "nernst_observation"],
        [
          L`increase the cell potential because copper becomes more concentrated`,
          L`decrease the cell potential because $\mathrm{Cu^{2+}}$ concentration decreases`,
          L`make the cell potential exactly zero immediately`,
          L`reverse the electrodes without any concentration change in zinc solution`,
        ],
        "B",
        {
          A: L`Dilution decreases, not increases, $\mathrm{Cu^{2+}}$ concentration.`,
          C: L`The potential changes with concentration but does not automatically become zero.`,
          D: L`Reversal is not the direct result described by this simple dilution step.`,
        },
        [
          L`The cell reaction consumes $\mathrm{Cu^{2+}}$.`,
          L`Lower product-side reduction tendency lowers the cell emf.`,
          L`Use the Nernst idea qualitatively.`,
        ],
        [
          { explanation: L`For the Daniell cell, reducing $\mathrm{Cu^{2+}}$ concentration lowers the tendency of copper ions to get reduced.` },
          { explanation: L`Therefore the measured cell potential decreases.` },
        ],
        electrochemicalCellFigure,
      ),
      mc(
        L`In an emulsion-stability experiment, soap solution helps oil and water remain mixed for longer mainly because it`,
        2,
        ["emulsion", "emulsifying_agent"],
        [
          L`freezes the oil droplets into crystals`,
          L`converts water into a non-polar solvent`,
          L`acts as an emulsifying agent around small oil droplets`,
          L`removes all oil from the mixture by evaporation`,
        ],
        "C",
        {
          A: L`Soap stabilises droplets; it does not freeze them into crystals.`,
          B: L`Water is not converted into a non-polar solvent.`,
          D: L`The oil is dispersed and stabilised, not evaporated away.`,
        },
        [
          L`Oil and water are immiscible.`,
          L`An emulsifier stabilises one liquid dispersed in another.`,
          L`Soap molecules can surround oil droplets and reduce coalescence.`,
        ],
        [
          { explanation: L`Soap acts as an emulsifying agent by stabilising small oil droplets in water, so the emulsion separates more slowly.` },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define $R_f$ value in paper chromatography.`,
        1,
        ["rf_definition", "chromatography"],
        onePart(L`State the ratio.`, 1),
        [
          L`It is a ratio of two distances measured from the baseline.`,
          L`The numerator is the distance travelled by the component.`,
          L`The denominator is the distance travelled by the solvent front.`,
        ],
        [
          {
            part: "a",
            explanation: L`$R_f$ is the ratio of the distance travelled by the solute spot to the distance travelled by the solvent front, both measured from the baseline.`,
            math: L`R_f=\frac{\text{distance travelled by solute}}{\text{distance travelled by solvent front}}`,
          },
        ],
        [L`Using final height from the bottom of the paper instead of distance from the baseline.`],
      ),
      frq(
        "saq",
        L`In the sodium thiosulphate and hydrochloric acid experiment, explain why $1/t$ is used as a comparative measure of rate and state one way to increase the rate.`,
        2,
        ["rate_measurement", "kinetics_practical"],
        parts([
          ["a", L`Explain the use of $1/t$.`, 1],
          ["b", L`State one change that increases the rate.`, 1],
        ]),
        [
          L`The endpoint is fixed: disappearance of the same cross.`,
          L`For the same extent of turbidity, shorter time means faster reaction.`,
          L`Increasing temperature or concentration increases rate.`,
        ],
        [
          {
            part: "a",
            explanation: L`The same visible endpoint is used each time, so a smaller time means a faster reaction; hence rate is compared using $1/t$.`,
          },
          {
            part: "b",
            explanation: L`The rate can be increased by increasing the concentration of sodium thiosulphate or hydrochloric acid, or by increasing temperature.`,
          },
        ],
        [L`Treating $t$ itself as directly proportional to rate.`],
      ),
      frq(
        "saq",
        L`The temperature-time graph shown is obtained when $50\,\mathrm{mL}$ of $1.0\,\mathrm{M}\ \mathrm{HCl}$ is mixed with $50\,\mathrm{mL}$ of $1.0\,\mathrm{M}\ \mathrm{NaOH}$. Take density as $1\,\mathrm{g\,mL^{-1}}$ and specific heat as $4.2\,\mathrm{J\,g^{-1}\,K^{-1}}$.`,
        3,
        ["thermochemistry", "calorimetry"],
        parts([
          ["a", L`Find the temperature rise from the graph.`, 1],
          ["b", L`Calculate the heat released to the solution.`, 1],
          ["c", L`State whether the reaction is exothermic or endothermic.`, 1],
        ]),
        [
          L`Read initial and maximum temperatures from the graph.`,
          L`Use $q=mc\Delta T$ with total mass about $100\,\mathrm{g}$.`,
          L`A temperature rise means heat is released by the reaction.`,
        ],
        [
          {
            part: "a",
            explanation: L`The graph shows a rise from $25.0^\circ\mathrm{C}$ to $31.0^\circ\mathrm{C}$, so $\Delta T=6.0\,\mathrm{K}$.`,
          },
          {
            part: "b",
            explanation: L`The heat gained by the solution is`,
            math: L`q=100\times 4.2\times 6.0=2520\,\mathrm{J}`,
          },
          {
            part: "c",
            explanation: L`Since the solution temperature rises, the neutralization reaction is exothermic.`,
          },
        ],
        [L`Using only $50\,\mathrm{g}$ instead of the total mixed solution mass.`],
        calorimetryFigure,
        true,
      ),
      frq(
        "laq",
        L`A student studies the variation of cell potential in $\mathrm{Zn/Zn^{2+}||Cu^{2+}/Cu}$ by changing electrolyte concentrations.`,
        4,
        ["electrochemistry_practical", "experimental_design"],
        parts([
          ["a", L`Write the cell reaction.`, 1],
          ["b", L`State the role of the salt bridge.`, 1],
          ["c", L`Predict the effect of decreasing $\mathrm{Cu^{2+}}$ concentration on cell potential.`, 1],
          ["d", L`State one variable that should be kept constant for fair comparison.`, 1],
        ]),
        [
          L`Zinc is oxidised and copper ion is reduced.`,
          L`The salt bridge completes the circuit and maintains charge balance.`,
          L`Changing concentration changes potential, so other conditions must be controlled.`,
        ],
        [
          {
            part: "a",
            explanation: L`The cell reaction is $\mathrm{Zn(s)+Cu^{2+}(aq)\rightarrow Zn^{2+}(aq)+Cu(s)}$.`,
          },
          {
            part: "b",
            explanation: L`The salt bridge allows ion movement to maintain electrical neutrality and complete the internal circuit.`,
          },
          {
            part: "c",
            explanation: L`Decreasing $\mathrm{Cu^{2+}}$ concentration decreases the cell potential for the Daniell cell.`,
          },
          {
            part: "d",
            explanation: L`Temperature, electrode surface condition, volume of solutions and the other ion concentration should be kept constant.`,
          },
        ],
        [L`Treating concentration change as irrelevant because the metals are unchanged.`],
      ),
      frq(
        "case",
        L`A school laboratory prepares a starch sol, a ferric hydroxide sol and an oil-water emulsion. The teacher then asks students to compare sol stability, dialysis and the role of soap in the emulsion.`,
        4,
        ["surface_chemistry_case", "colloids"],
        parts([
          ["a", L`Which sol is lyophilic: starch sol or ferric hydroxide sol?`, 1],
          ["b", L`What is removed during dialysis of a sol?`, 1],
          ["c", L`What is the role of soap in the emulsion?`, 1],
          ["d", L`Which is generally more easily coagulated: lyophilic or lyophobic sol?`, 1],
        ]),
        [
          L`Starch interacts strongly with water.`,
          L`Dialysis removes small ions and molecules, not colloidal particles.`,
          L`Lyophobic sols are less stable than lyophilic sols.`,
        ],
        [
          {
            part: "a",
            explanation: L`Starch sol is lyophilic.`,
          },
          {
            part: "b",
            explanation: L`Dialysis removes small ionic or molecular impurities from the sol.`,
          },
          {
            part: "c",
            explanation: L`Soap acts as an emulsifying agent and stabilises dispersed oil droplets.`,
          },
          {
            part: "d",
            explanation: L`Lyophobic sols are generally more easily coagulated.`,
          },
        ],
        [L`Saying dialysis removes colloidal particles themselves.`],
      ),
    ],
  },
  {
    topicCode: "Lab.4",
    title: "Preparations and Food Tests",
    subtopic:
      "Inorganic/organic preparations, crystallisation precautions, and characteristic tests of biomolecules in food.",
    mc: [
      mc(
        L`In preparing potash alum crystals, the concentrated solution should be cooled slowly mainly to`,
        2,
        ["potash_alum_preparation", "crystallisation"],
        [
          L`obtain better crystals rather than a dry powdery residue`,
          L`decompose alum into potassium metal`,
          L`remove all water of crystallisation permanently`,
          L`turn alum into a colloidal sol`,
        ],
        "A",
        {
          B: L`Potassium metal is not formed in this preparation.`,
          C: L`The aim is crystallisation, not permanent dehydration.`,
          D: L`Potash alum preparation is not conversion into a sol.`,
        },
        [
          L`Crystallisation needs a hot saturated solution.`,
          L`Slow cooling favours crystal growth.`,
          L`Evaporating to dryness usually spoils the crystals.`,
        ],
        [{ explanation: L`Slow cooling of a concentrated solution allows orderly crystal formation and avoids powdery residue from evaporation to dryness.` }],
      ),
      mc(
        L`The preparation of acetanilide from aniline is an example of`,
        2,
        ["organic_preparation", "acetanilide"],
        [
          L`diazotisation`,
          L`esterification of a carboxylic acid`,
          L`acetylation of an amine`,
          L`oxidation of an alcohol`,
        ],
        "C",
        {
          A: L`Diazotisation forms diazonium salts from aromatic primary amines under cold acidic nitrite conditions.`,
          B: L`Acetanilide is an amide, not an ester.`,
          D: L`No alcohol oxidation is involved in forming acetanilide from aniline.`,
        },
        [
          L`Aniline contains an amino group.`,
          L`Acetanilide contains an acyl group attached to nitrogen.`,
          L`Introducing an acetyl group is acetylation.`,
        ],
        [{ explanation: L`Aniline is acetylated to form acetanilide, an amide derivative.` }],
      ),
      mc(
        L`A food sample gives a violet colour with the biuret test. The observation indicates the presence of`,
        2,
        ["protein_test", "biuret_test"],
        [
          L`starch`,
          L`glucose`,
          L`protein`,
          L`unsaturated fat`,
        ],
        "C",
        {
          A: L`Starch is tested with iodine solution, giving blue-black colour.`,
          B: L`Glucose is a reducing sugar and is tested with Fehling's or Benedict's reagent.`,
          D: L`Unsaturation is tested by bromine water or alkaline permanganate decolourisation.`,
        },
        [
          L`Biuret test responds to peptide linkages.`,
          L`Peptide linkages are present in proteins.`,
          L`The violet colour is the positive observation.`,
        ],
        [{ explanation: L`A positive biuret test gives violet colour due to peptide linkages, indicating proteins.` }],
      ),
      mc(
        L`A blue-black colour with iodine solution in a food test indicates`,
        1,
        ["starch_test", "food_test"],
        [
          L`starch`,
          L`protein`,
          L`carboxylic acid`,
          L`amino group`,
        ],
        "A",
        {
          B: L`Protein is indicated by biuret or related protein tests, not iodine blue-black colour.`,
          C: L`Carboxylic acids are tested by reactions such as sodium bicarbonate effervescence.`,
          D: L`Amino groups require different organic functional-group tests.`,
        },
        [
          L`This is a characteristic food-test observation.`,
          L`Iodine forms a coloured complex with helical starch chains.`,
          L`The colour is blue-black.`,
        ],
        [{ explanation: L`Iodine gives a blue-black colour with starch, so the food sample contains starch.` }],
      ),
      mc(
        L`A liquid organic compound decolourises bromine water without heating. This is a practical indication of`,
        2,
        ["unsaturation_test", "organic_functional_group_test"],
        [
          L`ionic chloride`,
          L`unsaturation in the compound`,
          L`a saturated alkane only`,
          L`a metal carbonate`,
        ],
        "B",
        {
          A: L`Ionic chloride is tested using acidified silver nitrate, not bromine decolourisation.`,
          C: L`Saturated alkanes do not normally decolourise bromine water without special conditions.`,
          D: L`Carbonates are tested by acid effervescence and lime water.`,
        },
        [
          L`Bromine water is coloured.`,
          L`Unsaturated bonds add bromine and remove the colour.`,
          L`This is a standard test for unsaturation.`,
        ],
        [{ explanation: L`Decolourisation of bromine water indicates the presence of carbon-carbon unsaturation.` }],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why are crystals often washed with a small amount of cold solvent after crystallisation?`,
        1,
        ["crystal_washing", "preparation_precaution"],
        onePart(L`State the reason.`, 1),
        [
          L`The wash should remove mother liquor.`,
          L`The product should not dissolve much during washing.`,
          L`Cold solvent minimises loss of crystals.`,
        ],
        [
          {
            part: "a",
            explanation: L`A small amount of cold solvent removes adhering mother liquor while minimising dissolution and loss of the crystals.`,
          },
        ],
        [L`Using a large amount of hot solvent and dissolving much of the product.`],
      ),
      frq(
        "saq",
        L`A student evaporates a potash alum solution to complete dryness and obtains a crust instead of good crystals. Correct the procedure.`,
        2,
        ["potash_alum_preparation", "claim_correction"],
        parts([
          ["a", L`State what should be done instead of evaporating to dryness.`, 1],
          ["b", L`State why this gives better crystals.`, 1],
        ]),
        [
          L`Crystals form from a hot saturated solution on cooling.`,
          L`Do not drive off all solvent.`,
          L`Slow cooling helps crystal growth.`,
        ],
        [
          {
            part: "a",
            explanation: L`Evaporate only to near saturation or crystallisation point, then allow the solution to cool slowly.`,
          },
          {
            part: "b",
            explanation: L`Slow cooling lets solute particles arrange into crystals instead of forming a dry crust or powdery residue.`,
          },
        ],
        [L`Continuing heating until all liquid has evaporated.`],
      ),
      frq(
        "saq",
        L`A food extract gives a blue-black colour with iodine solution but no violet colour with the biuret test.`,
        2,
        ["food_tests", "starch_protein"],
        parts([
          ["a", L`Which food component is indicated?`, 1],
          ["b", L`Which component is not indicated by the biuret result?`, 1],
        ]),
        [
          L`Iodine blue-black is the starch clue.`,
          L`Biuret violet is the protein clue.`,
          L`Use both observations together.`,
        ],
        [
          {
            part: "a",
            explanation: L`Starch is indicated by the blue-black iodine test.`,
          },
          {
            part: "b",
            explanation: L`Protein is not indicated because the biuret test is negative.`,
          },
        ],
        [L`Calling the sample protein-rich from the iodine test alone.`],
      ),
      frq(
        "laq",
        L`In an organic preparation practical, a student obtains crude acetanilide after acetylating aniline.`,
        4,
        ["organic_preparation", "purification"],
        parts([
          ["a", L`Name the type of reaction used to form acetanilide from aniline.`, 1],
          ["b", L`Why is recrystallisation used after preparation?`, 1],
          ["c", L`Why should the product not be dried by strong direct heating?`, 1],
          ["d", L`State one observation that suggests a crystalline product has formed.`, 1],
        ]),
        [
          L`Acetanilide is formed by introducing an acetyl group.`,
          L`Crude products contain impurities.`,
          L`Strong heating can melt, decompose or char organic solids.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reaction is acetylation of aniline.`,
          },
          {
            part: "b",
            explanation: L`Recrystallisation removes soluble impurities and gives purer crystals.`,
          },
          {
            part: "c",
            explanation: L`Strong direct heating can melt, decompose or char the organic product, so gentle drying is preferred.`,
          },
          {
            part: "d",
            explanation: L`Formation of well-defined solid crystals on cooling indicates crystallisation of the product.`,
          },
        ],
        [L`Treating the crude precipitate as pure without purification.`],
      ),
      frq(
        "case",
        L`A teacher gives three food samples. Sample P gives blue-black colour with iodine. Sample Q gives violet colour with biuret reagent. Sample R reduces Fehling's solution on heating.`,
        4,
        ["food_test_case", "biomolecule_identification"],
        parts([
          ["a", L`Identify the main component indicated in P.`, 1],
          ["b", L`Identify the main component indicated in Q.`, 1],
          ["c", L`What type of carbohydrate is indicated in R?`, 1],
          ["d", L`Why should separate portions of the sample be used for different tests?`, 1],
        ]),
        [
          L`Match each reagent with its positive observation.`,
          L`Iodine: starch; biuret: protein; Fehling's: reducing sugar.`,
          L`Separate portions avoid one reagent interfering with the next test.`,
        ],
        [
          {
            part: "a",
            explanation: L`P contains starch.`,
          },
          {
            part: "b",
            explanation: L`Q contains protein.`,
          },
          {
            part: "c",
            explanation: L`R contains a reducing sugar.`,
          },
          {
            part: "d",
            explanation: L`Separate portions prevent reagents or heating from one test interfering with later observations.`,
          },
        ],
        [L`Using the same treated portion for every test and mixing up observations.`],
      ),
    ],
  },
  {
    topicCode: "Lab.5",
    title: "Projects, Record and Viva",
    subtopic:
      "Investigatory-project design, controls, variables, observations, practical record format and viva reasoning.",
    mc: [
      mc(
        L`In a project on oxalate ions in guava fruit at different stages of ripening, the stage of ripening is the`,
        2,
        ["project_design", "variables"],
        [
          L`dependent variable`,
          L`independent variable`,
          L`blank reading only`,
          L`fixed laboratory constant that must never change`,
        ],
        "B",
        {
          A: L`The measured oxalate content is the dependent variable.`,
          C: L`A blank may be used for correction, but ripening stage is not the blank reading.`,
          D: L`The whole project changes ripening stage deliberately.`,
        },
        [
          L`Ask what the investigator deliberately changes.`,
          L`The measured response is oxalate content.`,
          L`The changed condition is the independent variable.`,
        ],
        [{ explanation: L`The stage of ripening is deliberately varied, so it is the independent variable.` }],
      ),
      mc(
        L`In comparing the quantity of casein in different milk samples, the fairest practice is to`,
        2,
        ["casein_project", "fair_test"],
        [
          L`use different volumes of milk for every sample without recording them`,
          L`heat only the sample expected to give the highest mass`,
          L`ignore drying before comparing precipitate masses`,
          L`keep sample volume and precipitation conditions the same as far as possible`,
        ],
        "D",
        {
          A: L`Different unrecorded volumes make the comparison unfair.`,
          B: L`Selective heating creates bias.`,
          C: L`Different water content in precipitates makes mass comparison unreliable.`,
        },
        [
          L`A comparison needs fair conditions.`,
          L`Keep all variables except milk type constant.`,
          L`Drying affects measured mass.`,
        ],
        [{ explanation: L`To compare casein content fairly, use equal milk volumes and similar precipitation, filtration, washing and drying conditions.` }],
      ),
      mc(
        L`In studying potassium bisulphite as a food preservative, the most important control sample is`,
        3,
        ["food_preservative_project", "control_sample"],
        [
          L`food kept with the highest preservative concentration only`,
          L`a completely different food kept in another room`,
          L`only the preservative solution without food`,
          L`food kept without preservative under the same conditions`,
        ],
        "D",
        {
          A: L`The highest concentration is a treatment, not the no-preservative control.`,
          B: L`Changing the food and room changes too many variables.`,
          C: L`Preservative alone does not show spoilage of food without preservative.`,
        },
        [
          L`A control shows what happens without the tested factor.`,
          L`Only preservative should differ between control and treated sample.`,
          L`Temperature, time and food amount should be the same.`,
        ],
        [{ explanation: L`The control is the same food kept under the same conditions but without potassium bisulphite.` }],
      ),
      mc(
        L`In a project on digestion of starch by salivary amylase, disappearance of blue-black colour with iodine indicates that`,
        2,
        ["amylase_project", "starch_digestion"],
        [
          L`starch has been broken down sufficiently that iodine no longer gives the starch colour`,
          L`protein has formed a violet biuret complex`,
          L`the saliva has become a strong acid automatically`,
          L`iodine has detected chloride ions`,
        ],
        "A",
        {
          B: L`Violet biuret colour is a protein test, not iodine starch disappearance.`,
          C: L`The observation does not by itself prove saliva became strongly acidic.`,
          D: L`Chloride ions are not detected by iodine blue-black colour.`,
        },
        [
          L`Iodine tests for starch.`,
          L`Amylase digests starch.`,
          L`No blue-black colour means starch is no longer present in detectable amount.`,
        ],
        [{ explanation: L`Iodine gives blue-black colour with starch; loss of this colour shows that amylase has digested starch sufficiently.` }],
      ),
      mc(
        L`A good practical record for a CBSE chemistry experiment should include`,
        1,
        ["practical_record", "viva_preparation"],
        [
          L`only the final answer without aim or precautions`,
          L`aim, apparatus, theory, procedure, observations, result and precautions as relevant`,
          L`only decorative drawings of apparatus`,
          L`only the teacher's signature and no experimental details`,
        ],
        "B",
        {
          A: L`A record must show method and observations, not only the final answer.`,
          C: L`Diagrams help only when they are relevant and labelled; they cannot replace the record.`,
          D: L`A signature is not a substitute for experiment details.`,
        },
        [
          L`The record should let the examiner understand what was done.`,
          L`Include method, data and safety/accuracy precautions.`,
          L`This also prepares for viva questions.`,
        ],
        [{ explanation: L`A practical record should include the aim, apparatus, theory, procedure, observations, result and precautions where relevant.` }],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State any two headings that should normally appear in a chemistry practical record.`,
        1,
        ["practical_record_format"],
        onePart(L`Name two suitable headings.`, 1),
        [
          L`Think of the format used to record an experiment.`,
          L`The examiner should see what was done and why.`,
          L`Aim, apparatus, theory, procedure, observations, result and precautions are typical headings.`,
        ],
        [
          {
            part: "a",
            explanation: L`Any two valid headings include aim, apparatus required, theory, procedure, observations, result, calculations and precautions.`,
          },
        ],
        [L`Writing only the project title and no experiment structure.`],
      ),
      frq(
        "saq",
        L`A student compares fermentation rates of wheat flour, gram flour and potato juice by measuring gas production. State two variables that should be controlled.`,
        2,
        ["fermentation_project", "controlled_variables"],
        parts([
          ["a", L`Give one controlled variable.`, 1],
          ["b", L`Give another controlled variable.`, 1],
        ]),
        [
          L`Only the food material should change deliberately.`,
          L`Temperature strongly affects fermentation rate.`,
          L`Amount of sample, yeast and time should be comparable.`,
        ],
        [
          {
            part: "a",
            explanation: L`The temperature should be kept the same for all samples.`,
          },
          {
            part: "b",
            explanation: L`The mass/volume of sample, amount of yeast, water volume and observation time should also be kept the same; any one such variable earns credit.`,
          },
        ],
        [L`Changing both food material and temperature, then claiming the difference is due only to food material.`],
      ),
      frq(
        "saq",
        L`In a food-adulterant project, why should a student perform a blank/control test and repeat each test at least once?`,
        2,
        ["food_adulterant_project", "data_reliability"],
        parts([
          ["a", L`Explain the purpose of a blank/control.`, 1],
          ["b", L`Explain the purpose of repetition.`, 1],
        ]),
        [
          L`A blank shows what the reagents do without the suspected adulterant.`,
          L`Repetition checks whether the observation is reproducible.`,
          L`Both improve reliability.`,
        ],
        [
          {
            part: "a",
            explanation: L`A blank/control helps separate a true positive observation from colour or precipitate caused by reagents or the food matrix itself.`,
          },
          {
            part: "b",
            explanation: L`Repeating the test checks reproducibility and reduces the chance of recording an accidental observation.`,
          },
        ],
        [L`Treating one dramatic colour change as conclusive without any control.`],
      ),
      frq(
        "laq",
        L`Plan a project to compare the acidity of three fruit-juice samples using a simple titration method available in a school laboratory.`,
        4,
        ["project_planning", "acidity_project"],
        parts([
          ["a", L`State the dependent variable to be measured.`, 1],
          ["b", L`State two conditions to keep the comparison fair.`, 1],
          ["c", L`State one safety or accuracy precaution.`, 1],
          ["d", L`Suggest one table heading pair for recording data.`, 1],
        ]),
        [
          L`The dependent variable is the measured acidity or titre related to acidity.`,
          L`Keep sample volume, indicator and titrant concentration constant.`,
          L`A good project plan includes data recording, not just a conclusion.`,
        ],
        [
          {
            part: "a",
            explanation: L`The dependent variable may be acidity expressed through titre value or calculated acid concentration of each juice.`,
          },
          {
            part: "b",
            explanation: L`Use the same volume of juice, same indicator, same titrant concentration and same endpoint criterion for all samples; any two are acceptable.`,
          },
          {
            part: "c",
            explanation: L`Rinse burette/pipette with the solution they contain, read the meniscus at eye level, and handle acids/bases carefully; any one suitable precaution is acceptable.`,
          },
          {
            part: "d",
            explanation: L`A suitable table can include "juice sample" and "mean titre in mL" or "juice sample" and "calculated acidity".`,
          },
        ],
        [L`Comparing juices by taste instead of a measured variable.`],
      ),
      frq(
        "case",
        L`A student investigates soap foaming. Four equal soap solutions are prepared. Sodium carbonate added is $0.0\,\mathrm{g}$, $0.5\,\mathrm{g}$, $1.0\,\mathrm{g}$ and $1.5\,\mathrm{g}$. Foam heights recorded are $2.1\,\mathrm{cm}$, $3.0\,\mathrm{cm}$, $3.6\,\mathrm{cm}$ and $3.7\,\mathrm{cm}$.`,
        4,
        ["project_data_interpretation", "soap_foaming"],
        parts([
          ["a", L`Identify the independent variable.`, 1],
          ["b", L`Identify the dependent variable.`, 1],
          ["c", L`What trend is shown by the data?`, 1],
          ["d", L`Why is the increase from $1.0\,\mathrm{g}$ to $1.5\,\mathrm{g}$ not strong evidence for a large extra effect?`, 1],
        ]),
        [
          L`The independent variable is deliberately changed.`,
          L`The dependent variable is measured.`,
          L`Compare the change in foam height between successive additions.`,
        ],
        [
          {
            part: "a",
            explanation: L`The independent variable is the mass of sodium carbonate added.`,
          },
          {
            part: "b",
            explanation: L`The dependent variable is foam height.`,
          },
          {
            part: "c",
            explanation: L`Foam height increases as sodium carbonate is added, but the increase levels off at the highest addition.`,
          },
          {
            part: "d",
            explanation: L`The foam height changes only from $3.6\,\mathrm{cm}$ to $3.7\,\mathrm{cm}$, a small difference that may be within experimental uncertainty unless repeated trials confirm it.`,
          },
        ],
        [L`Claiming the last addition has a large effect just because more sodium carbonate was added.`],
        undefined,
        true,
      ),
    ],
  },
];

export const chemistry12PracticalsProjectsTopics: Topic[] =
  topicSeeds.map(makeTopic);
