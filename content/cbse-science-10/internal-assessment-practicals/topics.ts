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

const COURSE = "cbse-science-10";
const UNIT = "internal-assessment-practicals";
const VERSION = "0.1.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface ChoiceSeed {
  text: string;
  correct?: boolean;
  rationale: string;
  misconceptionTag?: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  choices: readonly [ChoiceSeed, ChoiceSeed, ChoiceSeed, ChoiceSeed];
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
  figure?: ItemFigure;
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
  commonMisconceptions?: string[];
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
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

function criterion(
  partLetter: string,
  points: number,
  description: string,
): FrqRubric["criteria"][number] {
  return { part: partLetter, points, description };
}

function rubric(
  criteria: readonly FrqRubric["criteria"][number][],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((sum, item) => sum + item.points, 0),
    criteria: [...criteria],
  };
}

function solutionPart(
  partLetter: string,
  explanation: string,
  math?: string,
): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function correct(text: string): ChoiceSeed {
  return { text, correct: true, rationale: "" };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function calibratePracticalDifficulty({
  difficulty,
  kind,
  responseType,
  questionLatex,
}: {
  difficulty: Difficulty;
  kind: "mc_single" | "frq";
  responseType?: ResponseType;
  questionLatex: string;
}): Difficulty {
  if (responseType === "vsaq") return Math.min(difficulty, 2) as Difficulty;
  if (difficulty <= 2) return difficulty;

  const text = questionLatex.toLowerCase();
  const recallOnly =
    /\b(name|identify|which apparatus|which indicator|which gas|which statement|is called)\b/.test(
      text,
    ) &&
    !/\b(calculate|infer|justify|design|compare|graph|data|case|explain why|plan)\b/.test(
      text,
    );

  if (kind === "mc_single" && difficulty >= 3 && recallOnly) return 2;
  if (kind === "frq" && responseType === "saq" && difficulty >= 4 && recallOnly) return 3;
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ?? "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the practical observation, controlled variable, safety point, graph reading, or inference before deciding.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const correctCount = seed.choices.filter((choice) => choice.correct).length;
  if (correctCount !== 1) {
    throw new Error(`${meta.topicCode} MC ${index + 1} must have exactly one correct choice.`);
  }

  const choices = seed.choices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: Boolean(choice.correct),
    rationaleIfWrong: choice.correct
      ? null
      : (choice.rationale ?? fallbackWrongRationale(seed, choice)),
    misconceptionTag: choice.correct
      ? null
      : (choice.misconceptionTag ??
        "incorrect_cbse_class10_science_practical_reasoning"),
  })) as McChoice[];

  const correctLetter = choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.ia.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibratePracticalDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_a_lab_keyword_without_using_the_observation_or_control",
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
    contentId: `${COURSE}.ia.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibratePracticalDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "writes_a_procedure_without_linking_observation_to_scientific_inference",
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

const phIndicatorFigure: ItemFigure = {
  type: "svg",
  title: "Universal indicator comparison",
  description:
    "A universal-indicator colour strip and an unknown sample spot are shown for pH inference.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <text x="360" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">universal indicator comparison</text>
  <g font-family="Arial" font-size="14" text-anchor="middle">
    <rect x="80" y="92" width="80" height="46" fill="#dc2626"/><text x="120" y="165" fill="#0f172a">1-2</text>
    <rect x="160" y="92" width="80" height="46" fill="#f97316"/><text x="200" y="165" fill="#0f172a">3-4</text>
    <rect x="240" y="92" width="80" height="46" fill="#facc15"/><text x="280" y="165" fill="#0f172a">5-6</text>
    <rect x="320" y="92" width="80" height="46" fill="#22c55e"/><text x="360" y="165" fill="#0f172a">7</text>
    <rect x="400" y="92" width="80" height="46" fill="#06b6d4"/><text x="440" y="165" fill="#0f172a">8-9</text>
    <rect x="480" y="92" width="80" height="46" fill="#2563eb"/><text x="520" y="165" fill="#0f172a">10-11</text>
    <rect x="560" y="92" width="80" height="46" fill="#7c3aed"/><text x="600" y="165" fill="#0f172a">12-14</text>
  </g>
  <rect x="92" y="230" width="216" height="44" rx="8" fill="#f8fafc" stroke="#475569" stroke-width="3"/>
  <circle cx="200" cy="252" r="18" fill="#f97316" stroke="#9a3412" stroke-width="2"/>
  <text x="200" y="315" text-anchor="middle" font-family="Arial" font-size="17" fill="#334155">unknown sample X</text>
</svg>`,
};

const reactionObservationFigure: ItemFigure = {
  type: "svg",
  title: "Reaction observation tubes",
  description:
    "Three test tubes show gas evolution, precipitate formation and colour change observations.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <text x="360" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">reaction observations</text>
  <g font-family="Arial" text-anchor="middle" stroke="#475569" stroke-width="3" fill="none">
    <path d="M120 72 v180 q0 46 46 46 q46 0 46 -46 V72"/>
    <path d="M314 72 v180 q0 46 46 46 q46 0 46 -46 V72"/>
    <path d="M508 72 v180 q0 46 46 46 q46 0 46 -46 V72"/>
  </g>
  <rect x="128" y="164" width="76" height="88" fill="#dbeafe" opacity="0.75"/>
  <g fill="#60a5fa">
    <circle cx="154" cy="146" r="5"/><circle cx="176" cy="130" r="4"/><circle cx="190" cy="108" r="5"/>
  </g>
  <rect x="322" y="164" width="76" height="88" fill="#e0f2fe" opacity="0.75"/>
  <ellipse cx="360" cy="232" rx="34" ry="12" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <rect x="516" y="164" width="76" height="88" fill="#bbf7d0" opacity="0.85"/>
  <path d="M524 238 q30 -22 60 0" stroke="#b45309" stroke-width="5" fill="none"/>
  <g font-family="Arial" font-size="16" fill="#0f172a" text-anchor="middle">
    <text x="166" y="328">A</text><text x="360" y="328">B</text><text x="554" y="328">C</text>
    <text x="166" y="354" font-size="14">gas</text><text x="360" y="354" font-size="14">white solid</text><text x="554" y="354" font-size="14">colour change</text>
  </g>
</svg>`,
};

const metalAcidFigure: ItemFigure = {
  type: "svg",
  title: "Metal reaction with dilute acid",
  description:
    "Three metal strips in dilute acid show different rates of bubble formation.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <text x="360" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">metal strips in dilute acid</text>
  <g stroke="#475569" stroke-width="3" fill="none">
    <path d="M110 82 v190 q0 44 44 44 q44 0 44 -44 V82"/>
    <path d="M316 82 v190 q0 44 44 44 q44 0 44 -44 V82"/>
    <path d="M522 82 v190 q0 44 44 44 q44 0 44 -44 V82"/>
  </g>
  <g fill="#dbeafe" opacity="0.85">
    <rect x="119" y="172" width="70" height="88"/>
    <rect x="325" y="172" width="70" height="88"/>
    <rect x="531" y="172" width="70" height="88"/>
  </g>
  <rect x="148" y="124" width="12" height="142" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
  <rect x="354" y="124" width="12" height="142" fill="#a16207" stroke="#713f12" stroke-width="2"/>
  <rect x="560" y="124" width="12" height="142" fill="#64748b" stroke="#334155" stroke-width="2"/>
  <g fill="#60a5fa">
    <circle cx="132" cy="154" r="5"/><circle cx="178" cy="142" r="4"/><circle cx="150" cy="118" r="5"/><circle cx="170" cy="98" r="4"/><circle cx="138" cy="90" r="4"/>
    <circle cx="548" cy="160" r="4"/><circle cx="584" cy="132" r="4"/>
  </g>
  <g font-family="Arial" font-size="16" text-anchor="middle" fill="#0f172a">
    <text x="154" y="346">strip A</text>
    <text x="360" y="346">strip B</text>
    <text x="566" y="346">strip C</text>
  </g>
</svg>`,
};

const soapHardWaterFigure: ItemFigure = {
  type: "svg",
  title: "Soap lather comparison",
  description:
    "Two measuring cylinders show different foam heights after shaking equal soap solution with two water samples.",
  svg: `<svg viewBox="0 0 680 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="390" fill="#ffffff"/>
  <text x="340" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">soap solution after equal shaking</text>
  <g stroke="#475569" stroke-width="3" fill="none">
    <path d="M170 78 h90 v234 q0 28 -45 28 q-45 0 -45 -28 Z"/>
    <path d="M420 78 h90 v234 q0 28 -45 28 q-45 0 -45 -28 Z"/>
  </g>
  <rect x="178" y="202" width="74" height="104" fill="#bfdbfe" opacity="0.75"/>
  <rect x="428" y="246" width="74" height="60" fill="#bfdbfe" opacity="0.75"/>
  <g fill="#f8fafc" stroke="#94a3b8" stroke-width="1">
    <circle cx="194" cy="138" r="9"/><circle cx="216" cy="124" r="11"/><circle cx="238" cy="140" r="8"/><circle cx="205" cy="158" r="10"/><circle cx="232" cy="164" r="9"/>
    <circle cx="447" cy="224" r="8"/><circle cx="470" cy="218" r="9"/><circle cx="488" cy="230" r="7"/>
  </g>
  <text x="215" y="365" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">sample A</text>
  <text x="465" y="365" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">sample B</text>
</svg>`,
};

const viGraphFigure: ItemFigure = {
  type: "svg",
  title: "Potential difference-current graph",
  description:
    "A straight-line V-I graph through the origin, with potential difference on the vertical axis and current on the horizontal axis.",
  svg: `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="420" fill="#ffffff"/>
  <defs>
    <marker id="xlab-vi-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="90" y1="330" x2="620" y2="330" stroke="#334155" stroke-width="3" marker-end="url(#xlab-vi-arrow)"/>
  <line x1="90" y1="330" x2="90" y2="60" stroke="#334155" stroke-width="3" marker-end="url(#xlab-vi-arrow)"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="190" y1="330" x2="190" y2="78"/><line x1="290" y1="330" x2="290" y2="78"/><line x1="390" y1="330" x2="390" y2="78"/><line x1="490" y1="330" x2="490" y2="78"/>
    <line x1="90" y1="270" x2="606" y2="270"/><line x1="90" y1="210" x2="606" y2="210"/><line x1="90" y1="150" x2="606" y2="150"/><line x1="90" y1="90" x2="606" y2="90"/>
  </g>
  <path d="M90 330 L490 90" stroke="#2563eb" stroke-width="4" fill="none"/>
  <g fill="#2563eb">
    <circle cx="190" cy="270" r="5"/><circle cx="290" cy="210" r="5"/><circle cx="390" cy="150" r="5"/><circle cx="490" cy="90" r="5"/>
  </g>
  <g font-family="Arial" font-size="14" fill="#0f172a" text-anchor="middle">
    <text x="90" y="354">0</text><text x="190" y="354">0.2</text><text x="290" y="354">0.4</text><text x="390" y="354">0.6</text><text x="490" y="354">0.8</text>
    <text x="646" y="335">I (A)</text>
  </g>
  <g font-family="Arial" font-size="14" fill="#0f172a" text-anchor="end">
    <text x="76" y="274">1</text><text x="76" y="214">2</text><text x="76" y="154">3</text><text x="76" y="94">4</text>
  </g>
  <text x="40" y="72" font-family="Arial" font-size="15" fill="#0f172a">V (V)</text>
</svg>`,
};

const resistorCombinationFigure: ItemFigure = {
  type: "svg",
  title: "Two resistor combinations",
  description:
    "Two circuits compare the same two resistors connected in series and in parallel.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <g font-family="Arial" fill="#0f172a" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <text x="185" y="44" text-anchor="middle" font-size="18" stroke="none">circuit A</text>
    <line x1="70" y1="170" x2="120" y2="170"/>
    <rect x="120" y="145" width="70" height="50" fill="#dbeafe"/><text x="155" y="176" text-anchor="middle" font-size="16" stroke="none">2 ohm</text>
    <line x1="190" y1="170" x2="230" y2="170"/>
    <rect x="230" y="145" width="70" height="50" fill="#fee2e2"/><text x="265" y="176" text-anchor="middle" font-size="16" stroke="none">3 ohm</text>
    <line x1="300" y1="170" x2="340" y2="170"/>
    <line x1="70" y1="170" x2="70" y2="270"/><line x1="340" y1="170" x2="340" y2="270"/><line x1="70" y1="270" x2="340" y2="270"/>
    <line x1="185" y1="250" x2="185" y2="290"/><line x1="202" y1="238" x2="202" y2="302"/>
    <text x="545" y="44" text-anchor="middle" font-size="18" stroke="none">circuit B</text>
    <line x1="430" y1="170" x2="470" y2="170"/>
    <line x1="470" y1="120" x2="470" y2="220"/><line x1="620" y1="120" x2="620" y2="220"/>
    <rect x="490" y="95" width="90" height="50" fill="#dbeafe"/><text x="535" y="126" text-anchor="middle" font-size="16" stroke="none">2 ohm</text>
    <rect x="490" y="195" width="90" height="50" fill="#fee2e2"/><text x="535" y="226" text-anchor="middle" font-size="16" stroke="none">3 ohm</text>
    <line x1="470" y1="120" x2="490" y2="120"/><line x1="580" y1="120" x2="620" y2="120"/>
    <line x1="470" y1="220" x2="490" y2="220"/><line x1="580" y1="220" x2="620" y2="220"/>
    <line x1="620" y1="170" x2="660" y2="170"/><line x1="430" y1="170" x2="430" y2="270"/><line x1="660" y1="170" x2="660" y2="270"/><line x1="430" y1="270" x2="660" y2="270"/>
    <line x1="545" y1="250" x2="545" y2="290"/><line x1="562" y1="238" x2="562" y2="302"/>
  </g>
</svg>`,
};

const biologySlidesFigure: ItemFigure = {
  type: "svg",
  title: "Biology practical slide observations",
  description:
    "Three microscope views show stomata, budding in yeast and binary fission-like cell division.",
  svg: `<svg viewBox="0 0 760 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="390" fill="#ffffff"/>
  <text x="380" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">microscope observations</text>
  <g transform="translate(58 76)">
    <circle cx="90" cy="90" r="78" fill="#dcfce7" stroke="#334155" stroke-width="3"/>
    <ellipse cx="80" cy="90" rx="22" ry="42" fill="#86efac" stroke="#16a34a" stroke-width="3"/>
    <ellipse cx="112" cy="90" rx="22" ry="42" fill="#86efac" stroke="#16a34a" stroke-width="3"/>
    <ellipse cx="96" cy="90" rx="10" ry="28" fill="#ffffff" stroke="#64748b" stroke-width="2"/>
    <text x="90" y="196" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">slide A</text>
  </g>
  <g transform="translate(290 76)">
    <circle cx="90" cy="90" r="78" fill="#fef3c7" stroke="#334155" stroke-width="3"/>
    <ellipse cx="82" cy="96" rx="34" ry="30" fill="#fde68a" stroke="#d97706" stroke-width="3"/>
    <ellipse cx="125" cy="70" rx="18" ry="16" fill="#fde68a" stroke="#d97706" stroke-width="3"/>
    <text x="90" y="196" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">slide B</text>
  </g>
  <g transform="translate(522 76)">
    <circle cx="90" cy="90" r="78" fill="#e0f2fe" stroke="#334155" stroke-width="3"/>
    <ellipse cx="90" cy="90" rx="54" ry="32" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
    <path d="M90 58 C78 78 78 102 90 122" fill="none" stroke="#1d4ed8" stroke-width="4"/>
    <circle cx="66" cy="90" r="7" fill="#7c3aed"/><circle cx="114" cy="90" r="7" fill="#7c3aed"/>
    <text x="90" y="196" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">slide C</text>
  </g>
</svg>`,
};

const respirationSetupFigure: ItemFigure = {
  type: "svg",
  title: "Respiration carbon dioxide test",
  description:
    "A flask with germinating seeds is connected by a delivery tube to lime water in a test tube.",
  svg: `<svg viewBox="0 0 760 410" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="410" fill="#ffffff"/>
  <text x="380" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">respiration gas test setup</text>
  <g font-family="Arial" fill="#0f172a" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M180 112 h74 v60 q72 28 72 98 q0 76 -109 76 q-109 0 -109 -76 q0 -70 72 -98 Z" fill="#f8fafc"/>
    <rect x="188" y="86" width="58" height="34" fill="#cbd5e1"/>
    <g fill="#a16207" stroke="none">
      <ellipse cx="178" cy="260" rx="14" ry="8"/><ellipse cx="220" cy="244" rx="14" ry="8"/><ellipse cx="252" cy="272" rx="14" ry="8"/><ellipse cx="206" cy="292" rx="14" ry="8"/>
    </g>
    <text x="217" y="374" text-anchor="middle" font-size="16" stroke="none">germinating seeds</text>
    <path d="M246 100 C382 88 455 112 500 176" fill="none"/>
    <path d="M500 176 v126" fill="none"/>
    <path d="M474 152 h86 v162 q0 38 -43 38 q-43 0 -43 -38 Z" fill="#f8fafc"/>
    <rect x="483" y="246" width="68" height="68" fill="#dbeafe" opacity="0.85"/>
    <text x="517" y="374" text-anchor="middle" font-size="16" stroke="none">lime water</text>
  </g>
</svg>`,
};

const opticsBenchFigure: ItemFigure = {
  type: "svg",
  title: "Concave mirror focal length setup",
  description:
    "A concave mirror faces a distant object, and a screen is placed in front of it to catch the sharp real image near the focus.",
  svg: `<svg viewBox="0 0 760 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="390" fill="#ffffff"/>
  <defs>
    <marker id="xlab-focus-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <text x="380" y="36" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">distant-object image on screen</text>
  <line x1="84" y1="306" x2="676" y2="306" stroke="#475569" stroke-width="5"/>
  <g font-family="Arial" fill="#0f172a" stroke="#334155" stroke-width="3">
    <rect x="300" y="92" width="18" height="214" fill="#f1f5f9"/>
    <rect x="220" y="126" width="80" height="146" fill="#f8fafc"/>
    <circle cx="260" cy="199" r="18" fill="#fde68a" stroke="#f59e0b"/>
    <rect x="560" y="112" width="24" height="194" fill="#e2e8f0"/>
    <path d="M560 126 C514 172 514 234 560 280" fill="none" stroke="#2563eb" stroke-width="5"/>
    <line x1="92" y1="164" x2="544" y2="164" stroke="#94a3b8" stroke-width="2" marker-end="url(#xlab-focus-arrow)"/>
    <line x1="92" y1="234" x2="544" y2="234" stroke="#94a3b8" stroke-width="2" marker-end="url(#xlab-focus-arrow)"/>
    <line x1="544" y1="164" x2="260" y2="199" stroke="#2563eb" stroke-width="4" marker-end="url(#xlab-focus-arrow)"/>
    <line x1="544" y1="234" x2="260" y2="199" stroke="#2563eb" stroke-width="4" marker-end="url(#xlab-focus-arrow)"/>
    <text x="260" y="338" text-anchor="middle" font-size="15" stroke="none">screen</text>
    <text x="572" y="338" text-anchor="middle" font-size="15" stroke="none">concave mirror</text>
    <line x1="260" y1="282" x2="560" y2="282" stroke="#16a34a" stroke-width="3"/>
    <path d="M260 282 l10 -6 v12z" fill="#16a34a" stroke="none"/><path d="M560 282 l-10 -6 v12z" fill="#16a34a" stroke="none"/>
    <text x="410" y="272" text-anchor="middle" font-size="15" fill="#14532d" stroke="none">distance measured</text>
  </g>
</svg>`,
};

const rayTracingFigure: ItemFigure = {
  type: "svg",
  title: "Ray tracing through glass slab and prism",
  description:
    "A rectangular glass slab path and a triangular prism path show incident and emergent rays for tracing questions.",
  svg: `<svg viewBox="0 0 780 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="780" height="420" fill="#ffffff"/>
  <defs>
    <marker id="xlab-ray-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <g font-family="Arial" fill="#0f172a" stroke-linecap="round" stroke-linejoin="round">
    <text x="196" y="42" text-anchor="middle" font-size="18">glass slab tracing</text>
    <rect x="120" y="100" width="150" height="190" fill="#dbeafe" opacity="0.65" stroke="#334155" stroke-width="3"/>
    <path d="M52 145 L120 180 L270 226 L348 266" stroke="#2563eb" stroke-width="4" fill="none" marker-end="url(#xlab-ray-arrow)"/>
    <path d="M52 105 L348 226" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 8"/>
    <line x1="120" y1="82" x2="120" y2="306" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
    <line x1="270" y1="82" x2="270" y2="306" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
    <text x="196" y="336" text-anchor="middle" font-size="15">parallel faces</text>
    <text x="590" y="42" text-anchor="middle" font-size="18">prism tracing</text>
    <polygon points="510,285 610,100 710,285" fill="#fee2e2" opacity="0.7" stroke="#334155" stroke-width="3"/>
    <path d="M450 188 L546 218 L636 218 L738 170" stroke="#2563eb" stroke-width="4" fill="none" marker-end="url(#xlab-ray-arrow)"/>
    <path d="M450 150 L738 248" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 8"/>
    <text x="610" y="336" text-anchor="middle" font-size="15">emergent ray deviates</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "Lab.1",
    title: "pH, Indicators and Reaction Observations",
    subtopic:
      "pH testing, acid-base behaviour, gases, precipitates, displacement and decomposition observations.",
    mc: [
      {
        questionLatex: L`The universal-indicator spot for sample X matches the orange part of the chart in the figure. The best inference is that sample X is`,
        difficulty: 2,
        skillTags: ["ph_testing", "indicator_observation"],
        figure: phIndicatorFigure,
        choices: [
          wrong("strongly basic", "Strong bases match blue to purple regions, not orange."),
          correct("acidic, with pH around 3 to 4"),
          wrong("neutral", "Neutral solution matches the green region around pH 7."),
          wrong("a salt that cannot be tested by indicator", "Many salt solutions can be tested; the observation here is acidic colour."),
        ],
        hints: [
          "Compare the unknown spot with the colour strip.",
          "Orange lies on the low-pH side.",
          "Low pH means acidic.",
        ],
        solution: [
          step(1, "The orange spot matches the pH 3 to 4 region in the chart."),
          step(2, "A pH below 7 indicates an acidic solution."),
          step(3, "So sample X is acidic, about pH 3 to 4."),
        ],
      },
      {
        questionLatex: L`In the acid-metal experiment, a gas burns with a pop sound when a burning splint is brought near the mouth of the test tube. The gas is`,
        difficulty: 2,
        skillTags: ["acid_metal_reaction", "gas_test"],
        choices: [
          wrong("oxygen", "Oxygen supports burning but does not give the characteristic pop sound."),
          wrong("carbon dioxide", "Carbon dioxide extinguishes a flame and turns lime water milky."),
          correct("hydrogen"),
          wrong("nitrogen", "Nitrogen is not identified by a pop test in this experiment."),
        ],
        hints: [
          "Recall the gas evolved when acids react with reactive metals.",
          "The pop sound is the confirmatory test.",
          "The gas is combustible.",
        ],
        solution: [
          step(1, "Reactive metals react with dilute acids to form salt and hydrogen gas."),
          step(2, "Hydrogen burns with a characteristic pop sound."),
          step(3, "Therefore the gas is hydrogen."),
        ],
      },
      {
        questionLatex: L`A student dips an iron nail in copper sulphate solution. The blue colour fades and a reddish-brown layer appears on the nail. This observation mainly shows`,
        difficulty: 2,
        skillTags: ["displacement_reaction", "reactivity_series"],
        choices: [
          wrong("thermal decomposition", "No heating or breaking of one compound by heat is involved."),
          correct("iron displaces copper from copper sulphate solution"),
          wrong("copper displaces iron from iron sulphate solution", "The coating is copper deposited because iron is more reactive."),
          wrong("neutralisation between acid and base", "No acid-base neutralisation is described."),
        ],
        hints: [
          "A metal can displace a less reactive metal from its salt solution.",
          "The reddish-brown layer is copper.",
          "Iron is more reactive than copper.",
        ],
        solution: [
          step(1, "Iron is more reactive than copper."),
          step(2, "Iron displaces copper from copper sulphate solution."),
          step(3, "The reddish-brown coating is deposited copper."),
        ],
      },
      {
        questionLatex: L`When aqueous barium chloride is mixed with aqueous sodium sulphate, a white insoluble solid forms. The reaction is best classified as`,
        difficulty: 2,
        skillTags: ["precipitation_reaction", "double_displacement"],
        choices: [
          wrong("combination reaction", "Two soluble salts exchange ions rather than combining into a single product."),
          wrong("decomposition reaction", "No single compound is breaking into simpler substances."),
          wrong("single displacement reaction", "No metal displaces another metal here."),
          correct("double displacement precipitation reaction"),
        ],
        hints: [
          "Two ionic solutions are mixed.",
          "Their ions exchange partners.",
          "One product is insoluble, so it appears as a precipitate.",
        ],
        solution: [
          step(1, "Barium chloride and sodium sulphate exchange ions in solution."),
          step(2, "Insoluble barium sulphate forms as a white precipitate."),
          step(3, "So the reaction is a double displacement precipitation reaction."),
        ],
      },
      {
        questionLatex: L`On heating ferrous sulphate crystals strongly, brown residue is obtained and gases with a burning sulphur smell are evolved. The main reaction type is`,
        difficulty: 2,
        skillTags: ["decomposition_reaction", "lab_observation"],
        choices: [
          wrong("neutralisation", "Neutralisation needs acid and base reacting to form salt and water."),
          wrong("precipitation", "No two aqueous solutions are being mixed to form an insoluble solid."),
          correct("thermal decomposition"),
          wrong("sublimation", "The compound chemically decomposes; it is not simply changing state and depositing."),
        ],
        hints: [
          "The substance is heated strongly.",
          "One compound gives more than one product.",
          "Heat causing breakdown is thermal decomposition.",
        ],
        solution: [
          step(1, "Ferrous sulphate crystals break down on strong heating."),
          step(2, "A brown residue and sulphur oxide gases are formed."),
          step(3, "This is thermal decomposition."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A solution turns blue litmus red. What is the nature of the solution?`,
        difficulty: 1,
        skillTags: ["litmus_test", "acid_base"],
        parts: [part("a", "State whether the solution is acidic, basic or neutral.", 1)],
        hints: [
          "Litmus colour change is an acid-base test.",
          "Acids turn blue litmus red.",
          "Bases turn red litmus blue.",
        ],
        rubric: rubric([criterion("a", 1, "States that the solution is acidic.")]),
        commonErrors: [
          "Calling it basic because the starting litmus was blue.",
          "Saying neutral because only one litmus paper was used.",
        ],
        workedSolution: [
          solutionPart("a", "The solution is acidic because acids turn blue litmus red."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Three samples give approximate pH values: lemon juice $2$, water $7$, and soap solution $10$.`,
        difficulty: 2,
        skillTags: ["ph_scale", "data_interpretation"],
        parts: [
          part("a", "Identify the acidic sample.", 1),
          part("b", "Identify the basic sample.", 1),
          part("c", "Which sample is closest to neutral?", 1),
        ],
        hints: [
          "pH below 7 is acidic.",
          "pH above 7 is basic.",
          "pH 7 is neutral.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies lemon juice."),
          criterion("b", 1, "Identifies soap solution."),
          criterion("c", 1, "Identifies water."),
        ]),
        commonErrors: [
          "Treating larger pH as stronger acid.",
          "Calling pH 7 weakly acidic.",
        ],
        workedSolution: [
          solutionPart("a", "Lemon juice has pH $2$, below $7$, so it is acidic."),
          solutionPart("b", "Soap solution has pH $10$, above $7$, so it is basic."),
          solutionPart("c", "Water has pH $7$, so it is closest to neutral."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student records the observations shown in the figure while performing reaction-type tests.`,
        difficulty: 3,
        skillTags: ["reaction_classification", "figure_interpretation"],
        figure: reactionObservationFigure,
        parts: [
          part("a", "Which tube could show an acid-metal reaction? Give one reason.", 2),
          part("b", "Which tube suggests a precipitation reaction?", 1),
          part("c", "For tube C, state one additional observation needed before calling it a displacement reaction.", 1),
        ],
        hints: [
          "Acid-metal reactions evolve a gas.",
          "Precipitation gives an insoluble solid.",
          "Displacement often involves a metal coating or a salt-solution colour change.",
        ],
        rubric: rubric([
          criterion("a", 2, "Identifies tube A and links it to gas evolution."),
          criterion("b", 1, "Identifies tube B."),
          criterion("c", 1, "States a valid observation such as metal deposit, fading blue solution or a more reactive metal present."),
        ]),
        commonErrors: [
          "Calling every gas evolution a precipitation reaction.",
          "Classifying tube C as displacement using colour alone without the reactants or deposit.",
        ],
        workedSolution: [
          solutionPart("a", "Tube A could show an acid-metal reaction because it shows gas evolution."),
          solutionPart("b", "Tube B suggests precipitation because a white insoluble solid is shown."),
          solutionPart("c", "A metal deposit on another metal, such as reddish-brown copper on iron, or a known salt-solution colour change would support a displacement reaction."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student tests the gas from zinc and dilute hydrochloric acid using a burning splint.`,
        difficulty: 2,
        skillTags: ["hydrogen_test", "precautions"],
        parts: [
          part("a", "Name the gas evolved.", 1),
          part("b", "State the observation with the burning splint.", 1),
          part("c", "Give one safety precaution for this test.", 1),
        ],
        hints: [
          "Zinc reacts with dilute acid.",
          "The evolved gas is combustible.",
          "Use a small quantity and keep the test-tube mouth away from the face.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names hydrogen."),
          criterion("b", 1, "States that it burns with a pop sound."),
          criterion("c", 1, "States a valid safety precaution."),
        ]),
        commonErrors: [
          "Testing with glowing splint as if the gas were oxygen.",
          "Pointing the test tube toward the face.",
        ],
        workedSolution: [
          solutionPart("a", "The gas evolved is hydrogen."),
          solutionPart("b", "A burning splint gives a pop sound near hydrogen."),
          solutionPart("c", "Use a small amount of reactants, do not point the tube at anyone, and keep flames controlled."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Design a practical procedure to show that a reactive metal and dilute acid produce hydrogen gas.`,
        difficulty: 4,
        skillTags: ["experimental_design", "acid_metal_reaction", "gas_test"],
        parts: [
          part("a", "Name suitable chemicals and apparatus.", 2),
          part("b", "Describe the procedure and observation.", 3),
          part("c", "State the inference and one precaution.", 2),
        ],
        hints: [
          "Use a reactive metal such as zinc and a dilute acid.",
          "Collect or test the gas near the tube mouth.",
          "Hydrogen gives a pop sound.",
        ],
        rubric: rubric([
          criterion("a", 2, "Names suitable reactants and apparatus."),
          criterion("b", 3, "Describes adding dilute acid to metal and testing gas with a burning splint."),
          criterion("c", 2, "Gives hydrogen inference and one valid safety/handling precaution."),
        ]),
        commonErrors: [
          "Using copper with dilute acid as the main test metal.",
          "Inferring oxygen from a pop sound.",
          "Forgetting safety while using flame near gas.",
        ],
        workedSolution: [
          solutionPart("a", "Use zinc granules, dilute hydrochloric acid, a test tube, dropper and a burning splint."),
          solutionPart("b", "Place zinc in the test tube and add dilute acid. Bubbles are evolved. Bring a burning splint near the mouth of the tube."),
          solutionPart("c", "A pop sound shows hydrogen gas. Use small quantities and keep the test tube mouth away from the face."),
        ],
      },
    ],
  },
  {
    topicCode: "Lab.2",
    title: "Metals, Acetic Acid and Soap Tests",
    subtopic:
      "Metal reactivity, properties of acetic acid, and comparative lather formation in hard and soft water.",
    mc: [
      {
        questionLatex: L`In the figure, strip A gives many bubbles with dilute acid, strip C gives a few bubbles, and strip B gives no visible bubbles. The most reasonable reactivity order is`,
        difficulty: 3,
        skillTags: ["metal_reactivity", "observation_order"],
        figure: metalAcidFigure,
        choices: [
          wrong("B greater than C greater than A", "Strip B shows no visible gas, so it is not the most reactive in this acid test."),
          wrong("C greater than A greater than B", "Strip A shows more vigorous bubbling than C."),
          correct("A greater than C greater than B"),
          wrong("A, B and C have equal reactivity", "The different bubble rates show different reactivities."),
        ],
        hints: [
          "More bubbles mean faster hydrogen evolution.",
          "Faster hydrogen evolution indicates greater reactivity with dilute acid.",
          "Rank the strips by bubble formation.",
        ],
        solution: [
          step(1, "Strip A shows the most bubbles, strip C shows fewer, and strip B shows none."),
          step(2, "Bubble formation in dilute acid indicates reaction rate with acid."),
          step(3, "The order is A greater than C greater than B."),
        ],
      },
      {
        questionLatex: L`A student adds sodium hydrogen carbonate to acetic acid. The gas evolved turns lime water milky. The gas is`,
        difficulty: 2,
        skillTags: ["acetic_acid_properties", "gas_test"],
        choices: [
          correct("carbon dioxide"),
          wrong("hydrogen", "Hydrogen gives a pop sound; it does not turn lime water milky."),
          wrong("oxygen", "Oxygen supports burning and is not the expected gas from acid-carbonate reaction."),
          wrong("chlorine", "Chlorine is not produced in this acetic acid-carbonate test."),
        ],
        hints: [
          "Acids react with carbonates and hydrogen carbonates.",
          "The gas turns lime water milky.",
          "This is the standard test for carbon dioxide.",
        ],
        solution: [
          step(1, "Acetic acid reacts with sodium hydrogen carbonate to release carbon dioxide."),
          step(2, "Carbon dioxide turns lime water milky."),
          step(3, "Therefore the gas is carbon dioxide."),
        ],
      },
      {
        questionLatex: L`Which set of observations is expected for dilute acetic acid in the laboratory?`,
        difficulty: 2,
        skillTags: ["acetic_acid_litmus"],
        choices: [
          wrong("soapy touch, turns red litmus blue and gives no gas with sodium hydrogen carbonate", "Those are basic-solution clues, not acetic-acid observations."),
          wrong("insoluble in water, no smell and turns blue litmus green", "Acetic acid mixes with water and does not turn blue litmus green."),
          wrong("vinegar-like smell, turns red litmus blue and releases hydrogen with sodium hydrogen carbonate", "Acetic acid turns blue litmus red and releases carbon dioxide with sodium hydrogen carbonate."),
          correct("vinegar-like smell, mixes with water, turns blue litmus red and gives carbon dioxide with sodium hydrogen carbonate"),
        ],
        hints: [
          "Recall the practical properties of ethanoic acid.",
          "It is the acid present in vinegar and mixes with water.",
          "With sodium hydrogen carbonate, acids release carbon dioxide.",
        ],
        solution: [
          step(1, "Acetic acid has a vinegar-like smell and is miscible with water."),
          step(2, "Being acidic, it turns blue litmus red."),
          step(3, "It reacts with sodium hydrogen carbonate to release carbon dioxide."),
        ],
      },
      {
        questionLatex: L`In the soap-lather figure, equal soap solution was shaken equally with samples A and B. Sample B is more likely to be hard water because it`,
        difficulty: 2,
        skillTags: ["hard_water", "soap_lather", "figure_interpretation"],
        figure: soapHardWaterFigure,
        choices: [
          wrong("forms more foam than sample A", "Sample B shows less foam, not more."),
          correct("forms less lather due to calcium or magnesium ions"),
          wrong("contains no dissolved salts at all", "Hardness is due to dissolved calcium or magnesium salts."),
          wrong("converts soap into sugar", "Soap reacts with hardness ions to form scum, not sugar."),
        ],
        hints: [
          "Compare the foam heights.",
          "Hard water reduces lather with soap.",
          "Calcium and magnesium ions form scum with soap.",
        ],
        solution: [
          step(1, "Sample B shows less foam after equal shaking."),
          step(2, "Hard water contains calcium or magnesium ions that react with soap."),
          step(3, "So B is more likely to be hard water."),
        ],
      },
      {
        questionLatex: L`A clean iron nail is placed in copper sulphate solution. Which extra step improves the reliability of the observation?`,
        difficulty: 2,
        skillTags: ["displacement_reaction", "experimental_control"],
        choices: [
          wrong("use a rusty nail without cleaning", "Rust can interfere with the surface reaction and observation."),
          wrong("shake different tubes for different times", "Unequal handling makes comparison unreliable."),
          correct("clean the nail surface before dipping it"),
          wrong("add soap solution to the copper sulphate tube", "Soap is unrelated and may introduce contamination."),
        ],
        hints: [
          "The reaction happens at the metal surface.",
          "A coating on the nail can block contact with solution.",
          "A clean surface gives a clearer displacement observation.",
        ],
        solution: [
          step(1, "Displacement occurs when iron contacts copper sulphate solution."),
          step(2, "Rust or grease on the nail can reduce contact and confuse the result."),
          step(3, "Cleaning the nail improves reliability."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name the acid present in vinegar.`,
        difficulty: 1,
        skillTags: ["acetic_acid"],
        parts: [part("a", "Write the name of the acid.", 1)],
        hints: [
          "Vinegar is a dilute solution of this organic acid.",
          "Its common name is acetic acid.",
          "Its IUPAC name is ethanoic acid.",
        ],
        rubric: rubric([criterion("a", 1, "Names acetic acid/ethanoic acid.")]),
        commonErrors: [
          "Writing hydrochloric acid.",
          "Writing only vinegar without naming the acid.",
        ],
        workedSolution: [
          solutionPart("a", "The acid present in vinegar is acetic acid, also called ethanoic acid."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Acetic acid is tested with blue litmus and sodium hydrogen carbonate.`,
        difficulty: 2,
        skillTags: ["acetic_acid_properties", "test_observations"],
        parts: [
          part("a", "State the litmus observation.", 1),
          part("b", "State the gas evolved with sodium hydrogen carbonate.", 1),
          part("c", "Give the confirmatory test for this gas.", 1),
        ],
        hints: [
          "Acetic acid behaves as an acid.",
          "Acids react with hydrogen carbonates to evolve a gas.",
          "The gas makes lime water milky.",
        ],
        rubric: rubric([
          criterion("a", 1, "States blue litmus turns red."),
          criterion("b", 1, "Names carbon dioxide."),
          criterion("c", 1, "States that carbon dioxide turns lime water milky."),
        ]),
        commonErrors: [
          "Testing carbon dioxide with a pop sound.",
          "Saying acetic acid has no effect on litmus because it is weak.",
        ],
        workedSolution: [
          solutionPart("a", "Blue litmus turns red in acetic acid."),
          solutionPart("b", "The gas evolved is carbon dioxide."),
          solutionPart("c", "Pass the gas through lime water; it turns milky."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Three metal strips A, B and C are tested with equal volumes of the same dilute acid, as shown in the figure.`,
        difficulty: 3,
        skillTags: ["metal_reactivity", "figure_interpretation", "fair_test"],
        figure: metalAcidFigure,
        parts: [
          part("a", "Which strip is most reactive in this test?", 1),
          part("b", "Which strip may be copper-like in behaviour?", 1),
          part("c", "State two conditions that must be kept the same for a fair comparison.", 2),
        ],
        hints: [
          "Use bubble formation as the visible sign of reaction.",
          "Copper does not normally react with dilute hydrochloric acid.",
          "A fair test keeps acid volume/concentration and metal size similar.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies strip A."),
          criterion("b", 1, "Identifies strip B."),
          criterion("c", 2, "States two valid controls such as acid volume, acid concentration, strip size/surface area, temperature or time."),
        ]),
        commonErrors: [
          "Ranking by strip colour instead of bubble formation.",
          "Changing acid concentration for different metals.",
        ],
        workedSolution: [
          solutionPart("a", "Strip A is most reactive because it shows the most vigorous gas evolution."),
          solutionPart("b", "Strip B may be copper-like because it shows no visible reaction with dilute acid."),
          solutionPart("c", "Use equal acid volume and concentration, similar strip size/surface area, same temperature and the same observation time."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a soap test, sample P gives little lather and scum while sample Q gives a thick lather with the same soap solution.`,
        difficulty: 3,
        skillTags: ["hard_water", "soap_test"],
        parts: [
          part("a", "Which sample is harder?", 1),
          part("b", "Why does it form less lather?", 2),
        ],
        hints: [
          "Hard water wastes soap before lather forms.",
          "Calcium and magnesium ions form insoluble scum.",
          "Less lather means harder water.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies sample P."),
          criterion("b", 2, "Explains reaction of soap with calcium/magnesium ions to form scum, reducing lather."),
        ]),
        commonErrors: [
          "Assuming more scum means softer water.",
          "Blaming the result only on less shaking without comparing equal conditions.",
        ],
        workedSolution: [
          solutionPart("a", "Sample P is harder."),
          solutionPart("b", "Hard water contains calcium or magnesium ions. These form insoluble scum with soap, so less soap remains to produce lather."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Plan a practical to compare the foaming capacity of soap in distilled water and hard water.`,
        difficulty: 3,
        skillTags: ["experimental_design", "soap_lather", "fair_test"],
        parts: [
          part("a", "List the materials and controlled conditions.", 2),
          part("b", "Describe the procedure.", 3),
          part("c", "State the expected observation and inference.", 2),
        ],
        hints: [
          "Use equal volumes and equal soap solution.",
          "Shake both samples in the same way.",
          "Compare lather height and scum.",
        ],
        rubric: rubric([
          criterion("a", 2, "Lists suitable materials and at least two controls."),
          criterion("b", 3, "Describes adding equal soap solution, equal shaking and observing lather/scum."),
          criterion("c", 2, "States soft/distilled water gives more lather and hard water gives less lather/scum."),
        ]),
        commonErrors: [
          "Using different soap quantities in the two samples.",
          "Calling distilled water hard because it has no visible salts.",
          "Ignoring the need for equal shaking time.",
        ],
        workedSolution: [
          solutionPart("a", "Use two stoppered test tubes, distilled water, hard water and the same soap solution. Keep water volume, soap volume, tube size and shaking time the same."),
          solutionPart("b", "Add equal water samples to separate tubes, add equal soap solution, stopper and shake each tube equally. Let foam settle briefly and compare lather height and scum."),
          solutionPart("c", "Distilled water gives more lather and little scum. Hard water gives less lather and scum due to calcium or magnesium ions."),
        ],
      },
    ],
  },
  {
    topicCode: "Lab.3",
    title: "Ohm's Law and Resistor Combinations",
    subtopic:
      "V-I graph, correct meter connections, resistance from graph, and equivalent resistance in series and parallel.",
    mc: [
      {
        questionLatex: L`From the V-I graph in the figure, the resistance of the conductor is`,
        difficulty: 3,
        skillTags: ["ohms_law", "graph_slope"],
        figure: viGraphFigure,
        choices: [
          wrong("$0.2\\,\\Omega$", "This inverts the ratio. Resistance is $V/I$, not $I/V$."),
          wrong("$2\\,\\Omega$", "Using only one axis value without the ratio gives the wrong resistance."),
          correct("$5\\,\\Omega$"),
          wrong("$10\\,\\Omega$", "At $0.4\\,\\text{A}$, the graph gives about $2\\,\\text{V}$, so $R=2/0.4=5\\,\\Omega$."),
        ],
        hints: [
          "Resistance is the slope of a V-I graph when V is on the vertical axis.",
          "Use a clear point such as $I=0.4\\,\\text{A}$, $V=2\\,\\text{V}$.",
          "Calculate $V/I$.",
        ],
        solution: [
          step(1, "For a V-I graph, resistance is $R=V/I$."),
          step(2, "From the graph, one point is $I=0.4\\,\\text{A}$ and $V=2\\,\\text{V}$.", L`R=\frac{2}{0.4}`),
          step(3, "Therefore the resistance is $5\\,\\Omega$.", L`R=5\,\Omega`),
        ],
      },
      {
        questionLatex: L`For verifying Ohm's law, the ammeter and voltmeter should be connected respectively`,
        difficulty: 2,
        skillTags: ["circuit_connections", "ohms_law"],
        choices: [
          wrong("voltmeter in series and ammeter in parallel", "This reverses the correct meter connections."),
          correct("ammeter in series and voltmeter in parallel across the resistor"),
          wrong("both in series with the resistor", "A voltmeter must measure potential difference across the resistor."),
          wrong("both in parallel across the cell", "An ammeter should not be connected in parallel across a source."),
        ],
        hints: [
          "An ammeter measures current through the component.",
          "A voltmeter measures potential difference across the component.",
          "So ammeter is series, voltmeter is parallel.",
        ],
        solution: [
          step(1, "Current through the resistor is measured by an ammeter in series."),
          step(2, "Potential difference across the resistor is measured by a voltmeter in parallel."),
          step(3, "Thus the correct connection is ammeter series, voltmeter parallel."),
        ],
      },
      {
        questionLatex: L`In the two circuits shown, circuit A has $2\,\Omega$ and $3\,\Omega$ in series while circuit B has the same resistors in parallel. Which statement is correct?`,
        difficulty: 3,
        skillTags: ["resistor_combination", "figure_interpretation"],
        figure: resistorCombinationFigure,
        choices: [
          wrong("Circuit A has lower equivalent resistance than circuit B", "Series resistance is $5\\,\\Omega$, while the parallel value is smaller than either resistor."),
          wrong("Both circuits have the same equivalent resistance", "Series and parallel connections do not give the same equivalent resistance for these values."),
          wrong("Circuit B has equivalent resistance $5\\,\\Omega$", "$5\\,\\Omega$ is the series value, not the parallel value."),
          correct("Circuit B has lower equivalent resistance than circuit A"),
        ],
        hints: [
          "Series resistances add directly.",
          "Parallel equivalent is less than the smallest branch resistance.",
          "Compare $5\\,\\Omega$ with a value less than $2\\,\\Omega$.",
        ],
        solution: [
          step(1, "For circuit A, series resistance is $2+3=5\\,\\Omega$."),
          step(2, "For circuit B, the parallel equivalent is less than $2\\,\\Omega$."),
          step(3, "So circuit B has lower equivalent resistance."),
        ],
      },
      {
        questionLatex: L`During an Ohm's law practical, readings are taken quickly and current is kept low mainly to`,
        difficulty: 2,
        skillTags: ["ohms_law_precaution", "heating_effect"],
        choices: [
          correct("avoid heating the resistor enough to change its resistance"),
          wrong("make the voltmeter read zero", "A non-zero potential difference is needed for the graph."),
          wrong("increase contact resistance deliberately", "Contact resistance should be minimised."),
          wrong("make current independent of voltage", "Ohm's law checks proportionality between current and voltage at constant temperature."),
        ],
        hints: [
          "Ohm's law assumes constant physical conditions.",
          "Temperature affects resistance.",
          "Excess current heats the resistor.",
        ],
        solution: [
          step(1, "Resistance of a conductor can change with temperature."),
          step(2, "Large current for a long time heats the resistor."),
          step(3, "Taking readings quickly at low current helps keep resistance nearly constant."),
        ],
      },
      {
        questionLatex: L`A student obtains a V-I graph that is a straight line through the origin. The conclusion is that`,
        difficulty: 2,
        skillTags: ["ohms_law_graph", "inference"],
        choices: [
          wrong("resistance is zero for all readings", "A sloping line through origin indicates finite constant resistance."),
          wrong("current is inversely proportional to voltage", "A straight line through origin shows direct proportionality."),
          correct("potential difference is directly proportional to current"),
          wrong("the conductor must be a perfect insulator", "Current is flowing, so it is not a perfect insulator."),
        ],
        hints: [
          "A straight line through origin represents proportionality.",
          "The vertical quantity is V and the horizontal quantity is I.",
          "So V is directly proportional to I.",
        ],
        solution: [
          step(1, "The graph is a straight line through the origin."),
          step(2, "This means $V/I$ is constant."),
          step(3, "Therefore potential difference is directly proportional to current."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is the SI unit of resistance?`,
        difficulty: 1,
        skillTags: ["resistance_unit"],
        parts: [part("a", "Write the SI unit.", 1)],
        hints: [
          "Resistance is measured by $R=V/I$.",
          "The SI unit is named after Georg Ohm.",
          "Its symbol is $\\Omega$.",
        ],
        rubric: rubric([criterion("a", 1, "Writes ohm or $\\Omega$.")]),
        commonErrors: [
          "Writing ampere, which is the unit of current.",
          "Writing volt, which is the unit of potential difference.",
        ],
        workedSolution: [
          solutionPart("a", "The SI unit of resistance is ohm.", L`\Omega`),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In an Ohm's law experiment, a resistor gives $V=1.5\,\text{V}$ when $I=0.30\,\text{A}$.`,
        difficulty: 2,
        skillTags: ["ohms_law_calculation"],
        parts: [
          part("a", "Calculate the resistance.", 2),
          part("b", "State one reason for taking several readings.", 1),
        ],
        hints: [
          "Use $R=V/I$.",
          "Substitute $1.5/0.30$.",
          "Several readings help check consistency and graph linearity.",
        ],
        rubric: rubric([
          criterion("a", 2, "Calculates $5\\,\\Omega$ with correct method/unit."),
          criterion("b", 1, "States a valid reason such as reliability, averaging or plotting a graph."),
        ]),
        commonErrors: [
          "Using $I/V$ instead of $V/I$.",
          "Giving the answer without unit.",
        ],
        workedSolution: [
          solutionPart("a", "Resistance is potential difference divided by current.", L`R=\frac{1.5}{0.30}=5\,\Omega`),
          solutionPart("b", "Several readings make the result more reliable and allow a V-I graph to test proportionality."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows a V-I graph obtained for a resistor in the laboratory.`,
        difficulty: 3,
        skillTags: ["graph_interpretation", "ohms_law"],
        figure: viGraphFigure,
        parts: [
          part("a", "Find the resistance using the point $I=0.6\\,\\text{A}$.", 2),
          part("b", "Predict the current when $V=3\\,\\text{V}$.", 1),
          part("c", "Why should the key be opened between readings?", 1),
        ],
        hints: [
          "At $0.6\\,\\text{A}$, the graph shows $3\\,\\text{V}$.",
          "Use $I=V/R$ after finding resistance.",
          "Opening the key reduces heating.",
        ],
        rubric: rubric([
          criterion("a", 2, "Calculates $R=5\\,\\Omega$."),
          criterion("b", 1, "Calculates $I=0.6\\,\\text{A}$."),
          criterion("c", 1, "Explains reducing heating/keeping resistance constant."),
        ]),
        commonErrors: [
          "Reading the axes in reverse.",
          "Using graph intercept instead of slope.",
          "Ignoring heating of the resistor.",
        ],
        workedSolution: [
          solutionPart("a", "From the graph, $V=3\\,\\text{V}$ at $I=0.6\\,\\text{A}$.", L`R=\frac{3}{0.6}=5\,\Omega`),
          solutionPart("b", "For $V=3\\,\\text{V}$ and $R=5\\,\\Omega$, the current is $0.6\\,\\text{A}$.", L`I=\frac{3}{5}=0.6\,\text{A}`),
          solutionPart("c", "The key is opened between readings to reduce heating and keep resistance nearly constant."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two resistors $4\,\Omega$ and $6\,\Omega$ are connected first in series and then in parallel.`,
        difficulty: 3,
        skillTags: ["equivalent_resistance", "series_parallel"],
        parts: [
          part("a", "Find the series equivalent resistance.", 1),
          part("b", "Find the parallel equivalent resistance.", 2),
        ],
        hints: [
          "Series resistances add.",
          "For two resistors in parallel, use $R_p=R_1R_2/(R_1+R_2)$.",
          "Compare the answer with the smaller resistor.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates $10\\,\\Omega$."),
          criterion("b", 2, "Calculates $2.4\\,\\Omega$ using correct parallel formula."),
        ]),
        commonErrors: [
          "Adding resistances for the parallel case.",
          "Reporting parallel resistance greater than both resistors.",
        ],
        workedSolution: [
          solutionPart("a", "In series, equivalent resistance is $4+6=10\\,\\Omega$.", L`R_s=10\,\Omega`),
          solutionPart("b", "In parallel,", L`R_p=\frac{4\times 6}{4+6}=2.4\,\Omega`),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Describe how to verify Ohm's law experimentally and use the graph to obtain resistance.`,
        difficulty: 4,
        skillTags: ["experimental_design", "ohms_law", "graphing"],
        parts: [
          part("a", "Draw or describe the correct circuit connections.", 2),
          part("b", "Describe how readings are taken.", 2),
          part("c", "Explain the graph and inference.", 3),
        ],
        hints: [
          "Ammeter is series and voltmeter is parallel.",
          "Rheostat changes current.",
          "Plot V against I; slope gives resistance.",
        ],
        rubric: rubric([
          criterion("a", 2, "Describes cell, key, rheostat, ammeter in series and voltmeter across resistor."),
          criterion("b", 2, "Explains taking several V-I readings by changing rheostat/current safely."),
          criterion("c", 3, "Explains straight-line graph through origin, $V\\propto I$, and resistance from slope."),
        ]),
        commonErrors: [
          "Connecting the ammeter in parallel.",
          "Using only one reading as proof.",
          "Forgetting that temperature should remain nearly constant.",
        ],
        workedSolution: [
          solutionPart("a", "Connect cell, key, rheostat, resistor and ammeter in series. Connect the voltmeter in parallel across the resistor."),
          solutionPart("b", "Close the key briefly, note current and voltage, then vary the rheostat and record several pairs of readings. Open the key between readings to avoid heating."),
          solutionPart("c", "Plot V on the vertical axis and I on the horizontal axis. A straight line through the origin shows $V\\propto I$. The slope $V/I$ gives the resistance."),
        ],
      },
    ],
  },
  {
    topicCode: "Lab.4",
    title: "Biology Slides, Respiration and Dicot Embryo",
    subtopic:
      "Stomata temporary mount, carbon dioxide during respiration, binary fission, budding and dicot seed embryo parts.",
    mc: [
      {
        questionLatex: L`In the biology-slide figure, slide A shows two kidney-shaped cells around a pore. This slide is most likely used to observe`,
        difficulty: 2,
        skillTags: ["stomata_mount", "figure_interpretation"],
        figure: biologySlidesFigure,
        choices: [
          wrong("budding in yeast", "Budding is shown by a small outgrowth from a parent cell, like slide B."),
          correct("stomata in a leaf peel"),
          wrong("binary fission in Amoeba", "Binary fission is represented by one cell dividing into two, like slide C."),
          wrong("a dicot seed embryo", "A dicot seed embryo is observed from a seed, not as guard cells around a pore."),
        ],
        hints: [
          "Look for guard-cell shape.",
          "A pore between guard cells is a stomatal opening.",
          "This is seen in a leaf epidermal peel.",
        ],
        solution: [
          step(1, "Slide A shows guard cells around a pore."),
          step(2, "This structure is a stoma."),
          step(3, "So the slide is used to observe stomata in a leaf peel."),
        ],
      },
      {
        questionLatex: L`In the respiration setup, lime water turns milky because the germinating seeds release`,
        difficulty: 2,
        skillTags: ["respiration", "carbon_dioxide_test"],
        figure: respirationSetupFigure,
        choices: [
          wrong("oxygen only", "Oxygen does not turn lime water milky."),
          wrong("hydrogen", "Hydrogen is identified by the pop test, not by lime water."),
          correct("carbon dioxide"),
          wrong("nitrogen dioxide", "This is not the gas expected from seed respiration in this setup."),
        ],
        hints: [
          "Germinating seeds respire.",
          "Respiration releases a gas that affects lime water.",
          "Lime water turns milky with carbon dioxide.",
        ],
        solution: [
          step(1, "Germinating seeds carry out respiration."),
          step(2, "Respiration releases carbon dioxide."),
          step(3, "Carbon dioxide turns lime water milky."),
        ],
      },
      {
        questionLatex: L`Slide B in the figure shows a small outgrowth attached to a larger cell. This observation is typical of`,
        difficulty: 2,
        skillTags: ["budding", "slide_identification"],
        figure: biologySlidesFigure,
        choices: [
          wrong("stomata", "Stomata show guard cells around a pore, not a bud from one cell."),
          wrong("binary fission", "Binary fission shows one cell dividing into two nearly equal parts."),
          wrong("dicot embryo", "A dicot embryo has cotyledons, plumule and radicle, not budding cells."),
          correct("budding in yeast"),
        ],
        hints: [
          "A bud is a small outgrowth from the parent cell.",
          "Yeast reproduces by budding.",
          "Slide B shows this pattern.",
        ],
        solution: [
          step(1, "Slide B shows a small cell-like outgrowth from a larger cell."),
          step(2, "This is a bud."),
          step(3, "The observation is budding in yeast."),
        ],
      },
      {
        questionLatex: L`A prepared slide shows one Amoeba-like cell constricting into two nearly equal parts. The process is`,
        difficulty: 2,
        skillTags: ["binary_fission", "slide_observation"],
        choices: [
          correct("binary fission"),
          wrong("budding", "Budding produces a smaller outgrowth from the parent, not two nearly equal parts."),
          wrong("pollination", "Pollination is transfer of pollen, not cell division in Amoeba."),
          wrong("transpiration", "Transpiration is water loss from leaves."),
        ],
        hints: [
          "The cell divides into two.",
          "The parts are nearly equal.",
          "Amoeba reproduces asexually by binary fission.",
        ],
        solution: [
          step(1, "The observation shows one cell splitting into two nearly equal cells."),
          step(2, "This is binary fission."),
          step(3, "Amoeba commonly shows binary fission."),
        ],
      },
      {
        questionLatex: L`While preparing a temporary mount of leaf peel to observe stomata, glycerine is added mainly to`,
        difficulty: 2,
        skillTags: ["stomata_mount", "slide_preparation"],
        choices: [
          wrong("make the leaf peel opaque", "The peel should remain clear enough for microscopic observation."),
          wrong("produce carbon dioxide", "Glycerine is not added to generate carbon dioxide."),
          correct("prevent the peel from drying quickly"),
          wrong("dissolve the guard cells", "The cells must remain visible, not be dissolved."),
        ],
        hints: [
          "The mount should remain moist during observation.",
          "Drying distorts the peel.",
          "Glycerine helps retain moisture.",
        ],
        solution: [
          step(1, "A temporary mount can dry during observation."),
          step(2, "Glycerine helps keep the peel moist."),
          step(3, "So it prevents quick drying and distortion."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name the gas that turns lime water milky during the germinating-seed respiration test.`,
        difficulty: 1,
        skillTags: ["carbon_dioxide_test"],
        parts: [part("a", "Name the gas.", 1)],
        hints: [
          "The gas is released in respiration.",
          "It reacts with lime water.",
          "It is carbon dioxide.",
        ],
        rubric: rubric([criterion("a", 1, "Names carbon dioxide/CO2.")]),
        commonErrors: [
          "Writing oxygen.",
          "Writing hydrogen because bubbles are seen in other experiments.",
        ],
        workedSolution: [
          solutionPart("a", "The gas is carbon dioxide.", L`\mathrm{CO_2}`),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student prepares a temporary mount of leaf peel for observing stomata.`,
        difficulty: 3,
        skillTags: ["stomata_mount", "procedure_precautions"],
        parts: [
          part("a", "State why a thin peel is used.", 1),
          part("b", "State the role of stain.", 1),
          part("c", "State one precaution while placing the cover slip.", 1),
        ],
        hints: [
          "A microscope needs light to pass through the specimen.",
          "Stain improves contrast.",
          "Avoid trapping air bubbles under the cover slip.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains that a thin peel allows clear microscopic observation."),
          criterion("b", 1, "States that stain makes cells/guard cells more visible."),
          criterion("c", 1, "States a valid cover-slip precaution such as avoiding air bubbles/folds."),
        ]),
        commonErrors: [
          "Using a thick folded peel.",
          "Pressing the cover slip hard enough to crush the specimen.",
        ],
        workedSolution: [
          solutionPart("a", "A thin peel lets light pass through and keeps the cells in one layer for clearer observation."),
          solutionPart("b", "A stain such as safranin increases contrast so the cells are easier to see."),
          solutionPart("c", "Lower the cover slip gently at an angle to avoid air bubbles and folds."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows a germinating-seed setup connected to lime water.`,
        difficulty: 3,
        skillTags: ["respiration_setup", "figure_interpretation", "control"],
        figure: respirationSetupFigure,
        parts: [
          part("a", "What change is expected in the lime water?", 1),
          part("b", "What does this change prove about the seeds?", 1),
          part("c", "Suggest one control setup.", 2),
        ],
        hints: [
          "Carbon dioxide changes lime water.",
          "Germinating seeds respire actively.",
          "A control should lack active respiration while other conditions stay similar.",
        ],
        rubric: rubric([
          criterion("a", 1, "States lime water turns milky."),
          criterion("b", 1, "Links the change to carbon dioxide released during respiration."),
          criterion("c", 2, "Suggests a valid control such as boiled/dead seeds or no seeds with otherwise similar setup."),
        ]),
        commonErrors: [
          "Saying lime water turns red.",
          "Using a control with a different lime-water amount and calling it fair.",
        ],
        workedSolution: [
          solutionPart("a", "The lime water turns milky."),
          solutionPart("b", "This shows that germinating seeds release carbon dioxide during respiration."),
          solutionPart("c", "A control can use boiled seeds or no seeds while keeping the lime-water amount and apparatus similar."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A slide shows a parent yeast cell with a small attached cell, while another slide shows an Amoeba dividing into two nearly equal cells.`,
        difficulty: 3,
        skillTags: ["budding", "binary_fission", "comparison"],
        parts: [
          part("a", "Identify the process in yeast.", 1),
          part("b", "Identify the process in Amoeba.", 1),
          part("c", "Give one visible difference between the two processes.", 1),
        ],
        hints: [
          "Yeast forms a small bud.",
          "Amoeba divides into two nearly equal parts.",
          "Compare unequal outgrowth with equal division.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies budding."),
          criterion("b", 1, "Identifies binary fission."),
          criterion("c", 1, "States a valid visible difference."),
        ]),
        commonErrors: [
          "Calling both processes mitosis without describing the observation.",
          "Confusing budding with binary fission because both are asexual reproduction.",
        ],
        workedSolution: [
          solutionPart("a", "The process in yeast is budding."),
          solutionPart("b", "The process in Amoeba is binary fission."),
          solutionPart("c", "In budding, a small outgrowth forms on the parent. In binary fission, the parent cell divides into two nearly equal cells."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A soaked gram seed is opened to identify the parts of a dicot embryo.`,
        difficulty: 3,
        skillTags: ["dicot_embryo", "observation", "function"],
        parts: [
          part("a", "Name the two large seed leaves and state their function.", 2),
          part("b", "Identify the plumule and radicle by their future growth.", 2),
          part("c", "State two precautions while dissecting the seed.", 2),
        ],
        hints: [
          "Dicot means two cotyledons.",
          "Plumule forms shoot; radicle forms root.",
          "The embryo should not be torn while removing the seed coat.",
        ],
        rubric: rubric([
          criterion("a", 2, "Names cotyledons and links them with stored food/nourishment."),
          criterion("b", 2, "Identifies plumule as future shoot and radicle as future root."),
          criterion("c", 2, "States two valid precautions."),
        ]),
        commonErrors: [
          "Calling cotyledons petals.",
          "Interchanging plumule and radicle.",
          "Using a dry seed that cannot be opened cleanly.",
        ],
        workedSolution: [
          solutionPart("a", "The two large seed leaves are cotyledons. They store food for the embryo."),
          solutionPart("b", "The plumule grows into the shoot system, while the radicle grows into the root system."),
          solutionPart("c", "Use a well-soaked seed, remove the seed coat gently, open the cotyledons carefully and avoid damaging the embryo axis."),
        ],
      },
    ],
  },
  {
    topicCode: "Lab.5",
    title: "Focal Length, Glass Slab and Prism Tracing",
    subtopic:
      "Focal length of mirror/lens, rectangular glass slab refraction, prism tracing, ray diagrams and precautions.",
    mc: [
      {
        questionLatex: L`In the distant-object method shown, a sharp image is obtained on the screen. For a concave mirror, the measured distance between mirror and screen is approximately`,
        difficulty: 2,
        skillTags: ["concave_mirror_focal_length", "figure_interpretation"],
        figure: opticsBenchFigure,
        choices: [
          wrong("twice the focal length for every distant object", "A distant object forms image near the focus, not always at twice the focal length."),
          correct("the focal length of the mirror"),
          wrong("zero because the object is very far away", "The image forms at the focus, a finite distance from the mirror."),
          wrong("the lateral displacement", "Lateral displacement belongs to glass slab refraction."),
        ],
        hints: [
          "Parallel rays from a distant object meet near the focus.",
          "The screen is moved until the image is sharp.",
          "Mirror-to-screen distance is then approximately focal length.",
        ],
        solution: [
          step(1, "A distant object sends nearly parallel rays to the concave mirror."),
          step(2, "The mirror forms a real image near its focus."),
          step(3, "So mirror-screen distance is approximately focal length."),
        ],
      },
      {
        questionLatex: L`For finding the focal length of a convex lens using a distant object, the image on the screen should be`,
        difficulty: 2,
        skillTags: ["convex_lens_focal_length", "image_quality"],
        choices: [
          wrong("blurred but large", "The screen position must be adjusted for a sharp image."),
          wrong("virtual and seen only through the lens", "The distant-object method uses a real image on a screen."),
          correct("sharp and inverted"),
          wrong("formed on the same side as the distant object", "A convex lens forms the real image on the opposite side for this setup."),
        ],
        hints: [
          "The screen can catch only a real image.",
          "A convex lens forms an inverted real image of a distant object near its focus.",
          "Sharpness tells the screen is at the image position.",
        ],
        solution: [
          step(1, "A distant object sends nearly parallel rays to the convex lens."),
          step(2, "The lens forms a real inverted image near the focus."),
          step(3, "The image should be sharp and inverted on the screen."),
        ],
      },
      {
        questionLatex: L`In the glass slab tracing shown, the emergent ray is parallel to the incident ray but shifted sideways. This sideways shift is called`,
        difficulty: 2,
        skillTags: ["glass_slab", "lateral_displacement"],
        figure: rayTracingFigure,
        choices: [
          wrong("angle of prism", "Angle of prism belongs to prism geometry, not sideways shift through a slab."),
          wrong("focal length", "Focal length belongs to mirror/lens focusing."),
          wrong("dispersion", "Dispersion is splitting of white light into colours."),
          correct("lateral displacement"),
        ],
        hints: [
          "The slab has parallel faces.",
          "The emergent ray is parallel but not along the original line.",
          "The shift is lateral displacement.",
        ],
        solution: [
          step(1, "In a rectangular glass slab, emergent ray is parallel to incident ray."),
          step(2, "The emergent ray is shifted sideways."),
          step(3, "This shift is called lateral displacement."),
        ],
      },
      {
        questionLatex: L`In prism ray tracing, the angle of deviation is measured between the directions of`,
        difficulty: 2,
        skillTags: ["prism_tracing", "angle_of_deviation"],
        choices: [
          correct("incident ray produced and emergent ray"),
          wrong("normal and refracted ray only", "That gives an angle of refraction, not total deviation."),
          wrong("two faces of the prism", "The angle between prism faces is the angle of prism."),
          wrong("screen and principal axis", "This is not part of prism tracing."),
        ],
        hints: [
          "Deviation means change in ray direction through the prism.",
          "Compare the original direction with the final direction.",
          "Use incident ray produced and emergent ray.",
        ],
        solution: [
          step(1, "The incident ray gives the original direction."),
          step(2, "The emergent ray gives the final direction after the prism."),
          step(3, "The angle between incident ray produced and emergent ray is the angle of deviation."),
        ],
      },
      {
        questionLatex: L`While tracing rays with pins through a glass slab or prism, the pins should be fixed vertically mainly to`,
        difficulty: 2,
        skillTags: ["ray_tracing_precaution", "pin_alignment"],
        choices: [
          wrong("make the glass opaque", "The glass must remain transparent for tracing."),
          correct("reduce alignment error while sighting their images"),
          wrong("change the refractive index of glass", "Pin orientation does not change refractive index."),
          wrong("make the emergent ray disappear", "The aim is to trace the emergent ray clearly."),
        ],
        hints: [
          "Pins are used for alignment by sighting.",
          "Tilted pins create parallax and position errors.",
          "Vertical pins make alignment more reliable.",
        ],
        solution: [
          step(1, "Ray tracing depends on accurate alignment of pins and their images."),
          step(2, "Tilted pins can introduce parallax or position error."),
          step(3, "Keeping pins vertical reduces alignment error."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In ray optics, what is meant by focal length?`,
        difficulty: 1,
        skillTags: ["focal_length_definition"],
        parts: [part("a", "Define focal length briefly.", 1)],
        hints: [
          "It is a distance.",
          "It is measured from the pole/optical centre to the focus.",
          "Use the word principal focus.",
        ],
        rubric: rubric([
          criterion("a", 1, "Defines focal length as distance from pole/optical centre to principal focus."),
        ]),
        commonErrors: [
          "Calling focal length the size of the image.",
          "Confusing focal length with object distance.",
        ],
        workedSolution: [
          solutionPart("a", "Focal length is the distance between the pole of a mirror or optical centre of a lens and its principal focus."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A concave mirror forms a sharp distant-object image on a screen when the mirror-screen distance is $24\,\text{cm}$.`,
        difficulty: 2,
        skillTags: ["concave_mirror_focal_length", "measurement"],
        parts: [
          part("a", "Estimate the focal length of the mirror.", 1),
          part("b", "State why a distant object is used.", 2),
        ],
        hints: [
          "For a distant object, rays reaching the mirror are nearly parallel.",
          "Parallel rays meet at focus after reflection.",
          "The sharp image forms near the focus.",
        ],
        rubric: rubric([
          criterion("a", 1, "States $24\\,\\text{cm}$."),
          criterion("b", 2, "Explains nearly parallel rays and image near focus."),
        ]),
        commonErrors: [
          "Doubling the measured distance to get focal length.",
          "Using a nearby object without adjusting formula.",
        ],
        workedSolution: [
          solutionPart("a", "The focal length is approximately $24\\,\\text{cm}$.", L`f\approx 24\,\text{cm}`),
          solutionPart("b", "A distant object sends nearly parallel rays to the mirror. A concave mirror focuses these rays near its principal focus."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows ray paths traced through a rectangular glass slab and a triangular prism.`,
        difficulty: 3,
        skillTags: ["ray_tracing", "figure_interpretation", "comparison"],
        figure: rayTracingFigure,
        parts: [
          part("a", "For the glass slab, state the relation between incident and emergent rays.", 1),
          part("b", "Name the sideways shift in the glass slab path.", 1),
          part("c", "For the prism, name the angle between incident ray produced and emergent ray.", 1),
          part("d", "Why should pins be placed well apart while tracing?", 1),
        ],
        hints: [
          "A slab has parallel refracting faces.",
          "A prism produces a net deviation.",
          "Greater pin separation improves direction accuracy.",
        ],
        rubric: rubric([
          criterion("a", 1, "States incident and emergent rays are parallel."),
          criterion("b", 1, "Names lateral displacement."),
          criterion("c", 1, "Names angle of deviation."),
          criterion("d", 1, "Explains reduced alignment/angular error."),
        ]),
        commonErrors: [
          "Saying the slab emergent ray always meets the incident ray.",
          "Calling prism deviation lateral displacement.",
          "Putting pins too close together.",
        ],
        workedSolution: [
          solutionPart("a", "For a rectangular glass slab, the emergent ray is parallel to the incident ray."),
          solutionPart("b", "The sideways shift is called lateral displacement."),
          solutionPart("c", "The angle is called the angle of deviation."),
          solutionPart("d", "Pins placed well apart define the ray direction more accurately and reduce angular error."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a prism tracing practical, a student uses two pins for the incident ray and two pins for the emergent ray.`,
        difficulty: 3,
        skillTags: ["prism_tracing", "precautions"],
        parts: [
          part("a", "Why are two pins used for each ray instead of one?", 1),
          part("b", "State two precautions while placing and sighting the pins.", 2),
        ],
        hints: [
          "One point does not define a direction.",
          "Two well-separated points define a straight line.",
          "Avoid parallax and keep pins vertical.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains that two points are needed to define a ray direction."),
          criterion("b", 2, "States two valid precautions."),
        ]),
        commonErrors: [
          "Using one pin and guessing the ray direction.",
          "Keeping pins very close together.",
          "Looking from above instead of aligning images at eye level.",
        ],
        workedSolution: [
          solutionPart("a", "Two pins give two points, which define the direction of a straight ray."),
          solutionPart("b", "Keep pins vertical, place them well apart, avoid parallax by aligning images carefully, and do not disturb the prism while marking points."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare the practical methods for finding focal length of a concave mirror and a convex lens using a distant object.`,
        difficulty: 4,
        skillTags: ["focal_length", "comparison", "experimental_precautions"],
        parts: [
          part("a", "State the common principle used in both methods.", 2),
          part("b", "State one difference in the arrangement.", 2),
          part("c", "Give two precautions common to both methods.", 2),
        ],
        hints: [
          "A distant object gives nearly parallel rays.",
          "The mirror reflects; the lens transmits.",
          "A sharp image and accurate distance measurement are essential.",
        ],
        rubric: rubric([
          criterion("a", 2, "Explains nearly parallel rays forming image at focus."),
          criterion("b", 2, "States a valid mirror/lens arrangement difference."),
          criterion("c", 2, "States two valid precautions."),
        ]),
        commonErrors: [
          "Treating concave mirror and convex lens as identical apparatus.",
          "Measuring before the image is sharp.",
          "Using a nearby object as if it were at infinity.",
        ],
        workedSolution: [
          solutionPart("a", "Both methods use a distant object so that rays reaching the mirror or lens are nearly parallel. A sharp real image forms close to the principal focus."),
          solutionPart("b", "For a concave mirror, the image forms on a screen on the same side as the object after reflection. For a convex lens, the screen is placed on the other side of the lens after refraction."),
          solutionPart("c", "Use a distant bright object, adjust the screen for the sharpest image, keep the mirror/lens and screen vertical, and measure distance carefully without parallax."),
        ],
      },
    ],
  },
];

export const science10PracticalsTopics: Topic[] = topicSeeds.map(makeTopic);
