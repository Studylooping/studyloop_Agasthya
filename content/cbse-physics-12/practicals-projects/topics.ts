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
const UNIT = "practicals-projects";
const VERSION = "0.2.2";
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
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
  return `You chose ${choiceText}. In a practical viva, check the circuit connection, graph slope, balance condition, least count, or main source of error before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_practical_viva_reasoning"),
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
    contentId: `${COURSE}.lab.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "answers_viva_by_formula_memory_without_checking_observation_or_precaution",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
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
    contentId: `${COURSE}.lab.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_final_result_without_unit_precaution_or_graph_reasoning",
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

const viGraphFigure: ItemFigure = {
  type: "svg",
  title: "Potential difference-current graph",
  description:
    "A straight-line V-I graph through the origin with current on the x-axis and potential difference on the y-axis.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="p12lab-vi-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="78" y1="315" x2="548" y2="315" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-vi-arrow)"/>
    <line x1="78" y1="315" x2="78" y2="55" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-vi-arrow)"/>
    <text x="540" y="348" font-size="17">I (A)</text>
    <text x="25" y="72" font-size="17">V (V)</text>
    <g stroke="#dbe4f0" stroke-width="1">
      <line x1="170" y1="315" x2="170" y2="70"/><line x1="262" y1="315" x2="262" y2="70"/>
      <line x1="354" y1="315" x2="354" y2="70"/><line x1="446" y1="315" x2="446" y2="70"/>
      <line x1="78" y1="254" x2="535" y2="254"/><line x1="78" y1="193" x2="535" y2="193"/>
      <line x1="78" y1="132" x2="535" y2="132"/><line x1="78" y1="71" x2="535" y2="71"/>
    </g>
    <g font-size="14" text-anchor="middle">
      <text x="78" y="339">0</text><text x="170" y="339">0.2</text><text x="262" y="339">0.4</text>
      <text x="354" y="339">0.6</text><text x="446" y="339">0.8</text>
    </g>
    <g font-size="14" text-anchor="end">
      <text x="66" y="258">1</text><text x="66" y="197">2</text><text x="66" y="136">3</text><text x="66" y="75">4</text>
    </g>
    <path d="M78 315 L446 71" fill="none" stroke="#2563eb" stroke-width="4"/>
    <circle cx="262" cy="193" r="5" fill="#2563eb"/>
    <circle cx="446" cy="71" r="5" fill="#2563eb"/>
  </g>
</svg>`,
};

const meterBridgeFigure: ItemFigure = {
  type: "svg",
  title: "Meter bridge balance",
  description:
    "A meter bridge wire with a balance point marked at 40 cm from the left end.",
  svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="340" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round">
    <line x1="95" y1="210" x2="605" y2="210" stroke="#334155" stroke-width="5"/>
    <g stroke="#64748b" stroke-width="2">
      <line x1="95" y1="195" x2="95" y2="225"/><line x1="197" y1="198" x2="197" y2="222"/>
      <line x1="299" y1="198" x2="299" y2="222"/><line x1="401" y1="198" x2="401" y2="222"/>
      <line x1="503" y1="198" x2="503" y2="222"/><line x1="605" y1="195" x2="605" y2="225"/>
    </g>
    <text x="95" y="250" font-size="15" text-anchor="middle">0</text>
    <text x="299" y="250" font-size="15" text-anchor="middle">40 cm</text>
    <text x="605" y="250" font-size="15" text-anchor="middle">100 cm</text>
    <rect x="130" y="80" width="115" height="52" rx="5" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
    <rect x="455" y="80" width="115" height="52" rx="5" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
    <text x="188" y="113" font-size="18" text-anchor="middle">X</text>
    <text x="512" y="113" font-size="18" text-anchor="middle">R</text>
    <line x1="188" y1="132" x2="188" y2="210" stroke="#2563eb" stroke-width="3"/>
    <line x1="512" y1="132" x2="512" y2="210" stroke="#dc2626" stroke-width="3"/>
    <line x1="299" y1="170" x2="299" y2="210" stroke="#16a34a" stroke-width="3"/>
    <circle cx="299" cy="210" r="7" fill="#16a34a"/>
    <text x="350" y="167" font-size="16" text-anchor="middle">null point</text>
    <text x="350" y="302" font-size="16" text-anchor="middle">uniform bridge wire</text>
  </g>
</svg>`,
};

const halfDeflectionFigure: ItemFigure = {
  type: "svg",
  title: "Half-deflection arrangement",
  description:
    "A battery, key, galvanometer, series resistance and shunt resistance in the half-deflection method.",
  svg: `<svg viewBox="0 0 690 350" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="690" height="350" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <line x1="95" y1="210" x2="170" y2="210"/>
    <line x1="170" y1="190" x2="170" y2="230"/>
    <line x1="185" y1="180" x2="185" y2="240"/>
    <text x="177" y="270" font-size="16" stroke="none" text-anchor="middle">cell</text>
    <line x1="185" y1="210" x2="250" y2="210"/>
    <rect x="250" y="184" width="90" height="52" fill="#e2e8f0"/>
    <text x="295" y="216" font-size="17" stroke="none" text-anchor="middle">R</text>
    <line x1="340" y1="210" x2="420" y2="210"/>
    <circle cx="455" cy="210" r="35" fill="#f8fafc"/>
    <text x="455" y="217" font-size="20" stroke="none" text-anchor="middle">G</text>
    <line x1="490" y1="210" x2="595" y2="210"/>
    <line x1="595" y1="210" x2="595" y2="115"/>
    <line x1="595" y1="115" x2="455" y2="115"/>
    <rect x="395" y="92" width="120" height="46" fill="#dcfce7"/>
    <text x="455" y="121" font-size="17" stroke="none" text-anchor="middle">S</text>
    <line x1="455" y1="115" x2="455" y2="175"/>
    <line x1="95" y1="210" x2="95" y2="115"/>
    <line x1="95" y1="115" x2="250" y2="115"/>
    <line x1="250" y1="115" x2="250" y2="210"/>
  </g>
</svg>`,
};

const uvGraphFigure: ItemFigure = {
  type: "svg",
  title: "Lens graph",
  description:
    "A decreasing straight-line graph of 1/v against 1/u, using measured magnitudes, for a convex lens experiment.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="p12lab-lens-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="90" y1="315" x2="540" y2="315" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-lens-arrow)"/>
    <line x1="90" y1="315" x2="90" y2="60" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-lens-arrow)"/>
    <text x="500" y="348" font-size="17">1/u (m^-1)</text>
    <text x="20" y="75" font-size="17">1/v (m^-1)</text>
    <g stroke="#dbe4f0" stroke-width="1">
      <line x1="170" y1="315" x2="170" y2="70"/><line x1="250" y1="315" x2="250" y2="70"/>
      <line x1="330" y1="315" x2="330" y2="70"/><line x1="410" y1="315" x2="410" y2="70"/>
      <line x1="90" y1="267" x2="525" y2="267"/><line x1="90" y1="219" x2="525" y2="219"/>
      <line x1="90" y1="171" x2="525" y2="171"/><line x1="90" y1="123" x2="525" y2="123"/>
    </g>
    <g font-size="14">
      <text x="90" y="338" text-anchor="middle">0</text><text x="170" y="338" text-anchor="middle">0.5</text>
      <text x="250" y="338" text-anchor="middle">1.0</text><text x="330" y="338" text-anchor="middle">1.5</text>
      <text x="410" y="338" text-anchor="middle">2.0</text>
      <text x="77" y="320" text-anchor="end">0</text><text x="77" y="272" text-anchor="end">0.5</text>
      <text x="77" y="224" text-anchor="end">1.0</text><text x="77" y="176" text-anchor="end">1.5</text>
      <text x="77" y="128" text-anchor="end">2.0</text>
    </g>
    <path d="M90 123 L410 315" stroke="#2563eb" stroke-width="4" fill="none"/>
    <circle cx="170" cy="171" r="5" fill="#2563eb"/>
    <circle cx="250" cy="219" r="5" fill="#2563eb"/>
    <circle cx="330" cy="267" r="5" fill="#2563eb"/>
  </g>
</svg>`,
};

const diodeCurveFigure: ItemFigure = {
  type: "svg",
  title: "Diode characteristic curve",
  description:
    "An I-V characteristic with a steep first-quadrant branch and a small third-quadrant reverse current.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="p12lab-diode-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="80" y1="205" x2="545" y2="205" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-diode-arrow)"/>
    <line x1="300" y1="325" x2="300" y2="55" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-diode-arrow)"/>
    <text x="535" y="235" font-size="17">V</text>
    <text x="315" y="70" font-size="17">I</text>
    <path d="M300 205 C350 205, 380 203, 410 196 C445 187, 468 155, 490 88" fill="none" stroke="#2563eb" stroke-width="4"/>
    <path d="M300 205 C240 208, 190 215, 125 225" fill="none" stroke="#dc2626" stroke-width="4"/>
    <circle cx="410" cy="196" r="5" fill="#2563eb"/>
    <circle cx="155" cy="221" r="5" fill="#dc2626"/>
    <text x="430" y="222" font-size="16">P</text>
    <text x="135" y="247" font-size="16">Q</text>
  </g>
</svg>`,
};

const transformerFigure: ItemFigure = {
  type: "svg",
  title: "Transformer coil arrangement",
  description:
    "A transformer core with a primary coil on one side and a secondary coil on the other side.",
  svg: `<svg viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="360" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round" stroke-linejoin="round">
    <rect x="220" y="70" width="240" height="220" rx="10" fill="none" stroke="#334155" stroke-width="16"/>
    <rect x="285" y="130" width="110" height="100" fill="#ffffff"/>
    <path d="M160 100 C130 120, 130 150, 160 170 C190 190, 190 220, 160 240" fill="none" stroke="#2563eb" stroke-width="4"/>
    <path d="M520 80 C555 95, 555 115, 520 130 C485 145, 485 165, 520 180 C555 195, 555 215, 520 230 C485 245, 485 265, 520 280" fill="none" stroke="#dc2626" stroke-width="4"/>
    <text x="160" y="300" font-size="18" text-anchor="middle" stroke="none">P</text>
    <text x="520" y="300" font-size="18" text-anchor="middle" stroke="none">S</text>
    <line x1="95" y1="100" x2="160" y2="100" stroke="#2563eb" stroke-width="3"/>
    <line x1="95" y1="240" x2="160" y2="240" stroke="#2563eb" stroke-width="3"/>
    <line x1="520" y1="80" x2="590" y2="80" stroke="#dc2626" stroke-width="3"/>
    <line x1="520" y1="280" x2="590" y2="280" stroke="#dc2626" stroke-width="3"/>
  </g>
</svg>`,
};

const openCircuitFigure: ItemFigure = {
  type: "svg",
  title: "Open circuit to be corrected",
  description:
    "A simple circuit diagram with a cell, key, ammeter, resistor and voltmeter, where the meter connections must be judged.",
  svg: `<svg viewBox="0 0 700 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="390" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <line x1="95" y1="220" x2="170" y2="220"/>
    <line x1="170" y1="180" x2="170" y2="260"/>
    <line x1="190" y1="195" x2="190" y2="245"/>
    <text x="180" y="155" font-size="17" text-anchor="middle" stroke="none">cell</text>
    <line x1="190" y1="220" x2="255" y2="220"/>
    <line x1="255" y1="220" x2="295" y2="195"/>
    <line x1="310" y1="220" x2="375" y2="220"/>
    <text x="285" y="180" font-size="17" text-anchor="middle" stroke="none">K</text>
    <circle cx="420" cy="220" r="33" fill="#f8fafc"/>
    <text x="420" y="227" font-size="22" text-anchor="middle" stroke="none">A</text>
    <line x1="453" y1="220" x2="515" y2="220"/>
    <rect x="515" y="195" width="88" height="50" fill="#f8fafc"/>
    <text x="559" y="227" font-size="22" text-anchor="middle" stroke="none">R</text>
    <line x1="603" y1="220" x2="630" y2="220"/>
    <line x1="630" y1="220" x2="630" y2="300"/>
    <line x1="630" y1="300" x2="95" y2="300"/>
    <line x1="95" y1="300" x2="95" y2="220"/>
    <line x1="375" y1="220" x2="375" y2="135"/>
    <circle cx="420" cy="135" r="32" fill="#f8fafc"/>
    <text x="420" y="142" font-size="22" text-anchor="middle" stroke="none">V</text>
    <line x1="452" y1="135" x2="520" y2="135"/>
    <line x1="520" y1="135" x2="520" y2="195"/>
  </g>
</svg>`,
};

const potentialDropLengthFigure: ItemFigure = {
  type: "svg",
  title: "Potential drop along a uniform wire",
  description:
    "A straight-line graph of potential drop against length along a uniform wire carrying steady current.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="p12lab-vl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="80" y1="315" x2="548" y2="315" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-vl-arrow)"/>
    <line x1="80" y1="315" x2="80" y2="55" stroke="#334155" stroke-width="3" marker-end="url(#p12lab-vl-arrow)"/>
    <text x="512" y="350" font-size="17">length (cm)</text>
    <text x="24" y="68" font-size="17">V (V)</text>
    <g stroke="#e2e8f0" stroke-width="1">
      <line x1="160" y1="315" x2="160" y2="75"/>
      <line x1="240" y1="315" x2="240" y2="75"/>
      <line x1="320" y1="315" x2="320" y2="75"/>
      <line x1="400" y1="315" x2="400" y2="75"/>
      <line x1="480" y1="315" x2="480" y2="75"/>
      <line x1="80" y1="255" x2="520" y2="255"/>
      <line x1="80" y1="195" x2="520" y2="195"/>
      <line x1="80" y1="135" x2="520" y2="135"/>
      <line x1="80" y1="75" x2="520" y2="75"/>
    </g>
    <path d="M80 315 L480 75" fill="none" stroke="#2563eb" stroke-width="4"/>
    <circle cx="160" cy="267" r="5" fill="#2563eb"/>
    <circle cx="240" cy="219" r="5" fill="#2563eb"/>
    <circle cx="320" cy="171" r="5" fill="#2563eb"/>
    <circle cx="400" cy="123" r="5" fill="#2563eb"/>
    <text x="75" y="338" font-size="14" text-anchor="middle">0</text>
    <text x="160" y="338" font-size="14" text-anchor="middle">20</text>
    <text x="240" y="338" font-size="14" text-anchor="middle">40</text>
    <text x="320" y="338" font-size="14" text-anchor="middle">60</text>
    <text x="400" y="338" font-size="14" text-anchor="middle">80</text>
    <text x="480" y="338" font-size="14" text-anchor="middle">100</text>
    <text x="56" y="260" font-size="14" text-anchor="end">0.4</text>
    <text x="56" y="200" font-size="14" text-anchor="end">0.8</text>
    <text x="56" y="140" font-size="14" text-anchor="end">1.2</text>
    <text x="56" y="80" font-size="14" text-anchor="end">1.6</text>
  </g>
</svg>`,
};

const auxiliaryLensFigure: ItemFigure = {
  type: "svg",
  title: "Auxiliary lens optical bench setup",
  description:
    "An optical bench setup showing an object needle, a convex lens, an auxiliary optical element and a screen/image needle.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round" stroke-linejoin="round">
    <line x1="70" y1="285" x2="660" y2="285" stroke="#64748b" stroke-width="5"/>
    <g stroke="#94a3b8" stroke-width="2">
      <line x1="120" y1="275" x2="120" y2="295"/>
      <line x1="240" y1="275" x2="240" y2="295"/>
      <line x1="360" y1="275" x2="360" y2="295"/>
      <line x1="480" y1="275" x2="480" y2="295"/>
      <line x1="600" y1="275" x2="600" y2="295"/>
    </g>
    <line x1="130" y1="250" x2="130" y2="112" stroke="#dc2626" stroke-width="4"/>
    <path d="M130 112 L119 135 L141 135 Z" fill="#dc2626" stroke="none"/>
    <text x="130" y="90" font-size="17" text-anchor="middle" stroke="none">object needle</text>
    <path d="M292 82 C250 135, 250 220, 292 270 C334 220, 334 135, 292 82 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
    <text x="292" y="62" font-size="17" text-anchor="middle" stroke="none">convex lens</text>
    <line x1="460" y1="92" x2="460" y2="270" stroke="#0f172a" stroke-width="5"/>
    <text x="460" y="72" font-size="17" text-anchor="middle" stroke="none">mirror/lens</text>
    <line x1="575" y1="250" x2="575" y2="126" stroke="#16a34a" stroke-width="4"/>
    <path d="M575 126 L564 149 L586 149 Z" fill="#16a34a" stroke="none"/>
    <text x="575" y="104" font-size="17" text-anchor="middle" stroke="none">image needle</text>
    <line x1="130" y1="150" x2="292" y2="165" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
    <line x1="292" y1="165" x2="575" y2="145" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  </g>
</svg>`,
};

const glassSlabFigure: ItemFigure = {
  type: "svg",
  title: "Refraction through a rectangular glass slab",
  description:
    "A ray enters and emerges from a rectangular slab, with the emergent ray parallel to the incident ray and laterally shifted.",
  svg: `<svg viewBox="0 0 650 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="650" height="390" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round" stroke-linejoin="round">
    <rect x="245" y="70" width="170" height="245" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="4"/>
    <line x1="300" y1="70" x2="300" y2="315" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 7"/>
    <line x1="360" y1="70" x2="360" y2="315" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 7"/>
    <path d="M110 95 L300 165" stroke="#2563eb" stroke-width="4" fill="none"/>
    <path d="M300 165 L360 232" stroke="#2563eb" stroke-width="4" fill="none"/>
    <path d="M360 232 L540 300" stroke="#2563eb" stroke-width="4" fill="none"/>
    <path d="M110 160 L540 320" stroke="#dc2626" stroke-width="2" fill="none" stroke-dasharray="7 7"/>
    <line x1="432" y1="274" x2="463" y2="244" stroke="#16a34a" stroke-width="3"/>
    <line x1="463" y1="244" x2="490" y2="255" stroke="#16a34a" stroke-width="3"/>
    <text x="490" y="238" font-size="17" stroke="none">lateral shift</text>
    <text x="330" y="345" font-size="18" text-anchor="middle" stroke="none">glass slab</text>
  </g>
</svg>`,
};

const diffractionSlitFigure: ItemFigure = {
  type: "svg",
  title: "Single-slit diffraction comparison",
  description:
    "Two slit-screen sketches comparing a narrower slit with a wider slit and their central diffraction maxima.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" stroke-linecap="round" stroke-linejoin="round">
    <text x="145" y="48" font-size="18" text-anchor="middle" stroke="none">Setup A</text>
    <text x="505" y="48" font-size="18" text-anchor="middle" stroke="none">Setup B</text>
    <line x1="95" y1="85" x2="95" y2="305" stroke="#334155" stroke-width="7"/>
    <line x1="455" y1="85" x2="455" y2="305" stroke="#334155" stroke-width="7"/>
    <line x1="95" y1="178" x2="95" y2="212" stroke="#ffffff" stroke-width="9"/>
    <line x1="455" y1="164" x2="455" y2="226" stroke="#ffffff" stroke-width="14"/>
    <line x1="290" y1="85" x2="290" y2="305" stroke="#64748b" stroke-width="4"/>
    <line x1="650" y1="85" x2="650" y2="305" stroke="#64748b" stroke-width="4"/>
    <path d="M116 195 C155 145, 210 125, 290 118" stroke="#2563eb" stroke-width="2" fill="none"/>
    <path d="M116 195 C155 245, 210 265, 290 272" stroke="#2563eb" stroke-width="2" fill="none"/>
    <path d="M476 195 C520 165, 580 158, 650 155" stroke="#dc2626" stroke-width="2" fill="none"/>
    <path d="M476 195 C520 225, 580 232, 650 235" stroke="#dc2626" stroke-width="2" fill="none"/>
    <rect x="281" y="118" width="18" height="154" fill="#bfdbfe" stroke="none" opacity="0.95"/>
    <rect x="641" y="155" width="18" height="80" fill="#fecaca" stroke="none" opacity="0.95"/>
    <text x="290" y="328" font-size="16" text-anchor="middle" stroke="none">screen</text>
    <text x="650" y="328" font-size="16" text-anchor="middle" stroke="none">screen</text>
  </g>
</svg>`,
};

const topics: readonly TopicSeed[] = [
  {
    topicCode: "Lab.1",
    title: "Electrical Measurements and Meter Bridge",
    subtopic:
      "V-I graphs, resistance per unit length, Ohm's law verification, series-parallel combinations, and meter bridge balance.",
    mc: [
      {
        questionLatex: L`In the V-I graph shown for a wire, the resistance of the wire is closest to`,
        figure: viGraphFigure,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["v-i-graph", "slope-resistance"],
        choices: [L`$2.0\,\Omega$`, L`$5.0\,\Omega$`, L`$0.20\,\Omega$`, L`$0.50\,\Omega$`],
        correctLetter: "B",
        rationales: {
          A: L`This takes only one grid step rather than the ratio $V/I$ from the plotted line.`,
          C: L`This is the conductance-like inverse value, not resistance from a V-I graph.`,
          D: L`This again inverts the slope; resistance is potential difference per unit current.`,
        },
        hints: [
          "For a graph of V against I, resistance is the slope.",
          "Use a clear plotted point such as I = 0.8 A, V = 4 V.",
          "Compute R = V/I.",
        ],
        solution: [
          { step: 1, explanation: L`On a V-I graph, the slope gives resistance.`, math: L`R=\frac{V}{I}` },
          { step: 2, explanation: L`Using the plotted point $(0.8\,\text{A},4.0\,\text{V})$,`, math: L`R=\frac{4.0}{0.8}=5.0\,\Omega` },
        ],
      },
      {
        questionLatex: L`In a meter bridge experiment, the unknown resistance $X$ is in the left gap and $R=6\,\Omega$ is in the right gap. The balance point is $40\,\text{cm}$ from the left end. The value of $X$ is`,
        figure: meterBridgeFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["meter-bridge", "balance-condition"],
        choices: [L`$4\,\Omega$`, L`$9\,\Omega$`, L`$2.4\,\Omega$`, L`$6\,\Omega$`],
        correctLetter: "A",
        rationales: {
          B: L`This reverses the bridge ratio and uses $60/40$ instead of $40/60$.`,
          C: L`This multiplies $6$ by $40/100$, which is not the meter bridge balance condition.`,
          D: L`Equal resistances would balance at $50\,\text{cm}$, not at $40\,\text{cm}$.`,
        },
        hints: [
          "At balance, the ratio of resistances equals the ratio of wire lengths.",
          "The right-side length is 60 cm.",
          "Use X/R = 40/60.",
        ],
        solution: [
          { step: 1, explanation: L`At the null point of a meter bridge,`, math: L`\frac{X}{R}=\frac{l}{100-l}` },
          { step: 2, explanation: L`Here $l=40\,\text{cm}$ and $R=6\,\Omega$.`, math: L`X=6\left(\frac{40}{60}\right)=4\,\Omega` },
        ],
      },
      {
        questionLatex: L`While verifying series combination of resistances by Ohm's law, the ammeter must be connected`,
        difficulty: 1,
        skillTags: ["ammeter-connection", "circuit-practical"],
        choices: [
          L`in series with the circuit`,
          L`in parallel with each resistor`,
          L`across the voltmeter terminals`,
          L`only across the key`,
        ],
        correctLetter: "A",
        rationales: {
          B: "That is how a voltmeter is connected; an ammeter in parallel may damage the instrument.",
          C: "Putting the ammeter across the voltmeter does not measure circuit current correctly.",
          D: "The current through the circuit, not just across the key, has to be measured.",
        },
        hints: [
          "An ammeter measures current through the branch.",
          "The same current should pass through the ammeter and the resistor combination.",
          "So it must be inserted in series.",
        ],
        solution: [
          { step: 1, explanation: "An ammeter has very low resistance and is designed to carry the circuit current." },
          { step: 2, explanation: "Therefore it is connected in series with the resistor combination." },
        ],
      },
      {
        questionLatex: L`In plotting $V$ versus $I$ for a metallic wire, a student joins every observation point by a zig-zag line. The best correction is to`,
        difficulty: 2,
        skillTags: ["best-fit-line", "graph-precaution"],
        choices: [
          L`draw a smooth best-fit straight line through the trend of the points`,
          L`erase all points except the largest current reading`,
          L`force the line to pass through every point even if scattered`,
          L`plot $I$ on both axes to avoid slope calculation`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Using only one point throws away the repeated observations needed for a reliable slope.",
          C: "A best-fit graph should represent the trend, not random observational scatter.",
          D: "Putting the same quantity on both axes destroys the physical meaning of the graph.",
        },
        hints: [
          "Practical graphs reduce random error by showing a trend.",
          "A wire obeying Ohm's law gives a straight-line V-I relation.",
          "Use a best-fit straight line.",
        ],
        solution: [
          { step: 1, explanation: "Experimental points may not fall exactly on one line because of small observational errors." },
          { step: 2, explanation: "The resistance is obtained from the slope of a best-fit straight line, not from a zig-zag joining of raw points." },
        ],
      },
      {
        questionLatex: L`A meter bridge balance point is very close to $5\,\text{cm}$. The most appropriate practical action is to`,
        difficulty: 2,
        skillTags: ["meter-bridge", "sensitivity", "precaution"],
        choices: [
          L`interchange the two gap resistances and repeat the observation`,
          L`press the jockey harder to force a sharper null point`,
          L`ignore end corrections because the bridge is balanced`,
          L`replace the galvanometer by a voltmeter in series`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Pressing the jockey hard can damage the wire and introduces contact errors.",
          C: "End effects matter most when the balance point is near an end.",
          D: "A voltmeter in series is not the null detector for a meter bridge.",
        },
        hints: [
          "Best meter bridge readings lie near the middle of the wire.",
          "Near-end readings are more affected by end resistance.",
          "Interchanging gaps can move the balance point away from the end.",
        ],
        solution: [
          { step: 1, explanation: "A balance point near an end is less reliable because end corrections become significant." },
          { step: 2, explanation: "Interchanging the gap resistances gives a complementary balance length and helps obtain a more reliable mean." },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A wire gives $V=2.4\,\text{V}$ when $I=0.30\,\text{A}$.`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["ohms-law", "viva-calculation"],
        parts: onePart("Find the resistance of the wire and include the unit.", 1),
        hints: ["Use Ohm's law.", "Resistance is potential difference divided by current.", "Compute $2.4/0.30$."],
        rubric: rubric([{ part: "a", points: 1, description: "Calculates $R=8\\,\\Omega$ with correct unit." }]),
        commonErrors: ["Writing conductance instead of resistance.", "Omitting the ohm unit."],
        workedSolution: [{ part: "a", explanation: L`By Ohm's law, $R=V/I=2.4/0.30=8\,\Omega$.` }],
      },
      {
        responseType: "saq",
        questionLatex: L`In a meter bridge experiment, a student obtains balance lengths $39.8\,\text{cm}$ and $60.1\,\text{cm}$ after interchanging the gap resistances.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["meter-bridge", "end-correction", "viva-reasoning"],
        parts: [
          part("a", "Why are two readings taken after interchanging the gaps?", 1),
          part("b", "What does the closeness of the two lengths to complementary values indicate?", 1),
        ],
        hints: [
          "Think about end resistance and contact resistance.",
          "Interchanging gives a check on systematic error.",
          "Complementary balance lengths support consistency.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Explains reduction/checking of end correction or systematic error." },
          { part: "b", points: 1, description: "Interprets complementary lengths as a consistency check." },
        ]),
        commonErrors: ["Saying interchange is only to save time.", "Treating the two readings as unrelated experiments."],
        workedSolution: [
          { part: "a", explanation: "Interchanging the gaps helps reduce the effect of end resistance and checks whether the bridge balance is reliable." },
          { part: "b", explanation: "The lengths are nearly complementary, so the balance condition is consistent within ordinary observational error." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student verifies the parallel combination of two resistors by plotting a V-I graph for the equivalent combination.`,
        difficulty: 3,
        skillTags: ["parallel-resistance", "graph-slope", "practical-viva"],
        parts: [
          part("a", "Which physical quantity is obtained from the slope of the V-I graph?", 1),
          part("b", "Should this equivalent resistance be greater or smaller than each individual resistance? Give the reason.", 1),
        ],
        hints: [
          "For V on y-axis and I on x-axis, slope is V/I.",
          "Parallel connection provides extra paths for current.",
          "Extra paths reduce equivalent resistance.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States that slope gives equivalent resistance." },
          { part: "b", points: 1, description: "States it is smaller than each branch resistance with correct reasoning." },
        ]),
        commonErrors: ["Calling the slope conductance.", "Saying parallel resistance is the sum of resistances."],
        workedSolution: [
          { part: "a", explanation: L`The slope of a $V$ versus $I$ graph gives $R_{\text{eq}}=V/I$.` },
          { part: "b", explanation: "The equivalent resistance is smaller than each branch resistance because current has more than one path." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A meter bridge has an unknown resistance $X$ in the left gap and a known resistance $R$ in the right gap. The balance point is at length $l$ from the left end.`,
        difficulty: 3,
        skillTags: ["meter-bridge", "derivation", "precaution"],
        parts: [
          part("a", "Write the balance relation for $X/R$.", 1),
          part("b", "If $R=12\\,\\Omega$ and $l=75\\,\\text{cm}$, find $X$.", 1),
          part("c", "State one precaution about using the jockey.", 1),
        ],
        hints: [
          "At balance, resistance ratio equals wire-length ratio.",
          "The right length is $100-l$.",
          "The jockey should touch lightly and momentarily.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Writes $X/R=l/(100-l)$." },
          { part: "b", points: 1, description: "Calculates $X=36\\,\\Omega$." },
          { part: "c", points: 1, description: "States a valid jockey/contact precaution." },
        ]),
        commonErrors: ["Using $100/l$ instead of $l/(100-l)$.", "Pressing the jockey hard.", "Missing the unit."],
        workedSolution: [
          { part: "a", explanation: L`At balance, $\dfrac{X}{R}=\dfrac{l}{100-l}$.` },
          { part: "b", explanation: L`Here $X=12\times 75/25=36\,\Omega$.` },
          { part: "c", explanation: "The jockey should be touched lightly and only momentarily so that the bridge wire is not heated or damaged." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student records current and potential difference for a wire: $(I,V)=(0.20,1.0),(0.40,2.1),(0.60,2.9),(0.80,4.0)$ in SI units.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["data-analysis", "best-fit-line", "resistance-practical"],
        parts: [
          part("a", "Why should a best-fit line be used instead of joining the points one by one?", 1),
          part("b", "Estimate the resistance from the first and last readings.", 1),
          part("c", "Name one likely source of scatter in these observations.", 1),
          part("d", "State whether the data roughly supports Ohm's law.", 1),
        ],
        hints: [
          "The readings are close to a straight-line trend but not exact.",
          "Use the slope estimate from endpoints.",
          "Ohm's law requires approximately constant V/I.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Explains best-fit line reduces random scatter." },
          { part: "b", points: 1, description: "Estimates resistance near $5\\,\\Omega$." },
          { part: "c", points: 1, description: "Names a valid source such as parallax, contact resistance or heating." },
          { part: "d", points: 1, description: "Correctly says the data approximately supports Ohm's law." },
        ]),
        commonErrors: ["Declaring the data invalid because points are not exact.", "Using only the most convenient reading without trend reasoning."],
        workedSolution: [
          { part: "a", explanation: "A best-fit line represents the experimental trend while reducing random reading errors." },
          { part: "b", explanation: L`Using endpoints, $R\approx(4.0-1.0)/(0.80-0.20)=3.0/0.60=5\,\Omega$.` },
          { part: "c", explanation: "Possible scatter sources include parallax in meters, loose contacts, heating of the wire, or reading fluctuations." },
          { part: "d", explanation: "Since $V$ is nearly proportional to $I$, the observations roughly support Ohm's law." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.2",
    title: "Galvanometer, Sonometer and Transformer Activities",
    subtopic:
      "Half-deflection method, galvanometer conversion, AC mains frequency with sonometer, inductor core effect, and transformer turns ratio.",
    mc: [
      {
        questionLatex: L`In the half-deflection method for finding galvanometer resistance, the shunt is adjusted so that the galvanometer deflection becomes`,
        figure: halfDeflectionFigure,
        difficulty: 2,
        skillTags: ["half-deflection-method", "galvanometer"],
        choices: [L`half of the initial deflection`, L`twice the initial deflection`, L`zero for all currents`, L`independent of the cell emf`],
        correctLetter: "A",
        rationales: {
          B: "The name of the method refers to reducing the deflection to half, not doubling it.",
          C: "Zero deflection is the null condition of a bridge, not the half-deflection method.",
          D: "Cell emf affects the initial current; the method compares two deflections.",
        },
        hints: ["Use the name of the method carefully.", "The shunt bypasses some current.", "The galvanometer current is made half of the original value."],
        solution: [
          { step: 1, explanation: "After taking the initial deflection, a shunt is connected across the galvanometer." },
          { step: 2, explanation: "The shunt is adjusted until the galvanometer deflection is half the initial value." },
        ],
      },
      {
        questionLatex: L`To convert a galvanometer of resistance $G$ into an ammeter of range $I$, the required shunt resistance is connected`,
        difficulty: 2,
        skillTags: ["galvanometer-conversion", "ammeter"],
        choices: [
          L`in parallel with the galvanometer`,
          L`in series with the galvanometer`,
          L`in series with the voltmeter only`,
          L`across the cell terminals only`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Series resistance converts a galvanometer into a voltmeter, not an ammeter.",
          C: "The conversion is about the galvanometer branch, not a separate voltmeter.",
          D: "A shunt must bypass current around the galvanometer, so it is connected across it.",
        },
        hints: [
          "An ammeter must have low effective resistance.",
          "A shunt diverts most of the current.",
          "Therefore it is connected parallel to the galvanometer.",
        ],
        solution: [
          { step: 1, explanation: "An ammeter should allow most of the circuit current to pass with little voltage drop." },
          { step: 2, explanation: "A low shunt resistance is connected in parallel with the galvanometer to carry most of the current." },
        ],
      },
      {
        questionLatex: L`In a sonometer experiment to find AC mains frequency, resonance is detected by`,
        difficulty: 2,
        skillTags: ["sonometer", "resonance-detection"],
        choices: [
          L`maximum vibration of the paper rider`,
          L`minimum reading of the ammeter`,
          L`zero extension of the wire`,
          L`complete disappearance of magnetic field`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The rider response, not a minimum ammeter reading, is the direct resonance indicator.",
          C: "The wire must be stretched under tension; zero extension is not the resonance condition.",
          D: "The magnetic field is not expected to disappear during the experiment.",
        },
        hints: [
          "At resonance the wire segment vibrates strongly.",
          "A light rider shows the vibration visibly.",
          "Maximum rider motion indicates resonance.",
        ],
        solution: [
          { step: 1, explanation: "The sonometer wire vibrates with large amplitude at resonance." },
          { step: 2, explanation: "A small paper rider responds visibly, so maximum vibration of the rider indicates resonance." },
        ],
      },
      {
        questionLatex: L`In the transformer activity shown, if the secondary coil has more turns than the primary coil, the arrangement is used as a`,
        figure: transformerFigure,
        difficulty: 2,
        skillTags: ["transformer", "turns-ratio"],
        choices: [L`step-up transformer`, L`step-down transformer`, L`DC amplifier`, L`rectifier`],
        correctLetter: "A",
        rationales: {
          B: "A step-down transformer has fewer secondary turns than primary turns.",
          C: "A transformer changes AC voltage by mutual induction; it is not a DC amplifier.",
          D: "A rectifier uses a diode to convert AC to pulsating DC.",
        },
        hints: [
          "Compare secondary turns with primary turns.",
          "More secondary turns gives greater secondary voltage.",
          "That is step-up action.",
        ],
        solution: [
          { step: 1, explanation: L`For an ideal transformer, $V_s/V_p=N_s/N_p$.` },
          { step: 2, explanation: L`If $N_s>N_p$, then $V_s>V_p$, so it is a step-up transformer.` },
        ],
      },
      {
        questionLatex: L`When a soft iron core is introduced into an inductor coil connected to an AC circuit, its inductance generally`,
        difficulty: 3,
        skillTags: ["inductor-activity", "core-effect"],
        choices: [L`increases`, L`decreases to zero`, L`becomes independent of turns`, L`changes only if DC is used`],
        correctLetter: "A",
        rationales: {
          B: "A ferromagnetic core increases magnetic flux linkage; it does not make inductance zero.",
          C: "The number of turns remains a major factor in inductance.",
          D: "The core effect is relevant in AC circuits too; that is why the activity is listed.",
        },
        hints: [
          "Inductance depends on magnetic flux linkage.",
          "A soft iron core increases permeability.",
          "Greater permeability increases inductance.",
        ],
        solution: [
          { step: 1, explanation: "A soft iron core has high magnetic permeability." },
          { step: 2, explanation: "It increases flux linkage for the same current, so the inductance increases." },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A galvanometer is to be converted into a voltmeter.`,
        difficulty: 2,
        skillTags: ["galvanometer-conversion", "voltmeter"],
        parts: onePart("Should a high resistance be connected in series or in parallel with the galvanometer?", 1),
        hints: ["A voltmeter should draw very little current.", "Large resistance limits current.", "For a voltmeter, the resistance is in series."],
        rubric: rubric([{ part: "a", points: 1, description: "States high resistance in series." }]),
        commonErrors: ["Confusing voltmeter conversion with ammeter conversion."],
        workedSolution: [{ part: "a", explanation: "A high resistance is connected in series with the galvanometer so that the instrument draws very small current." }],
      },
      {
        responseType: "saq",
        questionLatex: L`In a half-deflection experiment, the initial galvanometer deflection is 28 divisions. After connecting the shunt, the deflection is adjusted to 14 divisions.`,
        difficulty: 3,
        skillTags: ["half-deflection-method", "observation"],
        parts: [
          part("a", "Why is the second deflection acceptable?", 1),
          part("b", "Name one source of error in this method.", 1),
        ],
        hints: [
          "Compare the second deflection with the initial one.",
          "Half of 28 is 14.",
          "Think about cell resistance, shunt contact or scale reading.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies that 14 is half of 28." },
          { part: "b", points: 1, description: "Gives a valid source of error." },
        ]),
        commonErrors: ["Calling 14 a null deflection.", "Not naming a practical source of error."],
        workedSolution: [
          { part: "a", explanation: "The method requires the deflection after shunting to be half the initial deflection, and half of 28 is 14." },
          { part: "b", explanation: "Possible errors include contact resistance, change in cell emf, parallax in reading deflection, or inaccurate shunt resistance." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a sonometer, the resonating length is adjusted while the tension and linear mass density of the wire are known.`,
        difficulty: 3,
        skillTags: ["sonometer", "frequency-formula"],
        parts: [
          part("a", "Write the formula for the fundamental frequency of the wire.", 1),
          part("b", "If the resonating length decreases while tension is unchanged, what happens to the frequency?", 1),
        ],
        hints: [
          "Use the stretched string formula.",
          "Frequency is inversely proportional to length.",
          "Shorter length means higher frequency.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Writes $f=\\frac{1}{2l}\\sqrt{T/m}$ or equivalent." },
          { part: "b", points: 1, description: "States frequency increases." },
        ]),
        commonErrors: ["Writing frequency proportional to length.", "Mixing mass of hanger with linear mass density."],
        workedSolution: [
          { part: "a", explanation: L`For the fundamental mode, $f=\dfrac{1}{2l}\sqrt{\dfrac{T}{m}}$, where $m$ is mass per unit length.` },
          { part: "b", explanation: L`For fixed $T$ and $m$, $f\propto 1/l$, so decreasing $l$ increases the frequency.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A transformer activity uses $N_p=200$ turns and $N_s=800$ turns. The primary is connected to $6\,\text{V}$ AC.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["transformer", "turns-ratio", "viva-calculation"],
        parts: [
          part("a", "Find the expected secondary voltage for an ideal transformer.", 1),
          part("b", "Name the type of transformer.", 1),
          part("c", "State why the input should be AC and not DC.", 1),
        ],
        hints: [
          "Use $V_s/V_p=N_s/N_p$.",
          "The secondary has four times as many turns.",
          "Mutual induction requires changing flux.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Calculates $V_s=24\\,\\text{V}$." },
          { part: "b", points: 1, description: "Identifies step-up transformer." },
          { part: "c", points: 1, description: "Explains changing flux requirement." },
        ]),
        commonErrors: ["Using inverse turns ratio.", "Calling it step-down.", "Saying DC works equally well in steady state."],
        workedSolution: [
          { part: "a", explanation: L`$V_s=V_p(N_s/N_p)=6(800/200)=24\,\text{V}$.` },
          { part: "b", explanation: "Since the secondary voltage is greater than the primary voltage, it is a step-up transformer." },
          { part: "c", explanation: "A transformer works by mutual induction, which needs changing magnetic flux; steady DC does not provide this after switching transients." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student is asked to convert a galvanometer into an ammeter and then verify the conversion experimentally.`,
        difficulty: 4,
        skillTags: ["galvanometer-conversion", "experimental-verification", "case-viva"],
        parts: [
          part("a", "What type of resistance is connected to the galvanometer?", 1),
          part("b", "How is it connected?", 1),
          part("c", "Why should its resistance be low?", 1),
          part("d", "Name one check used during verification.", 1),
        ],
        hints: [
          "An ammeter should not appreciably change circuit current.",
          "Most current must bypass the galvanometer coil.",
          "Verification compares readings with a standard ammeter or expected range.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Names shunt resistance." },
          { part: "b", points: 1, description: "States parallel connection." },
          { part: "c", points: 1, description: "Explains current bypass/low effective resistance." },
          { part: "d", points: 1, description: "Gives a valid verification check." },
        ]),
        commonErrors: ["Using high series resistance.", "Forgetting verification after conversion.", "Saying all current should pass through the galvanometer coil."],
        workedSolution: [
          { part: "a", explanation: "A low shunt resistance is used." },
          { part: "b", explanation: "It is connected in parallel with the galvanometer." },
          { part: "c", explanation: "The low shunt carries most of the current, making the effective resistance of the ammeter small." },
          { part: "d", explanation: "The converted ammeter can be compared with a standard ammeter or checked against expected readings in a simple circuit." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.3",
    title: "Optics Experiments",
    subtopic:
      "Concave mirror and convex lens focal length, lens combinations, glass slab, prism minimum deviation, travelling microscope, and refractive index methods.",
    mc: [
      {
        questionLatex: L`In a convex lens experiment, a graph of $1/v$ against $1/u$ is plotted using measured magnitudes. From the figure, the focal length is closest to`,
        figure: uvGraphFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["convex-lens", "uv-graph", "focal-length"],
        choices: [L`$0.50\,\text{m}$`, L`$2.0\,\text{m}$`, L`$4.0\,\text{m}$`, L`$0.25\,\text{m}$`],
        correctLetter: "A",
        rationales: {
          B: "This treats the intercept as focal length instead of reciprocal focal length.",
          C: "This uses the upper grid value directly and ignores the reciprocal relation.",
          D: "This uses the other marked grid value rather than the intercept relation.",
        },
        hints: [
          "For a $1/v$ versus $1/u$ graph, the intercept is related to $1/f$.",
          L`The y-intercept is about $2\,\text{m}^{-1}$.`,
          "So $f=1/2$ m.",
        ],
        solution: [
          { step: 1, explanation: L`For a convex lens, the straight-line graph has intercept equal to $1/f$ in magnitude.` },
          { step: 2, explanation: L`The intercept is about $2\,\text{m}^{-1}$, hence $f\approx 0.50\,\text{m}$.` },
        ],
      },
      {
        questionLatex: L`While finding the focal length of a concave mirror by the $u$-$v$ method, the image used for accurate measurement should be`,
        difficulty: 2,
        skillTags: ["concave-mirror", "screen-image"],
        choices: [L`real and sharp on the screen`, L`virtual and erect behind the mirror`, L`blurred but magnified`, L`formed without a screen`],
        correctLetter: "A",
        rationales: {
          B: "A virtual image behind the mirror cannot be caught on a screen for this measurement.",
          C: "A blurred image increases uncertainty in image distance.",
          D: "The screen position is required to measure a real image distance accurately.",
        },
        hints: [
          "The experiment uses a screen to locate the image.",
          "Only real images can be obtained on a screen.",
          "The image should be sharp to reduce error.",
        ],
        solution: [
          { step: 1, explanation: "The image distance is measured when the image is caught on a screen." },
          { step: 2, explanation: "Therefore the image should be real and sharply focused." },
        ],
      },
      {
        questionLatex: L`In the prism minimum-deviation experiment, the angle of minimum deviation is found from`,
        difficulty: 2,
        skillTags: ["prism", "minimum-deviation"],
        choices: [
          L`the lowest point of the $\delta$ versus $i$ curve`,
          L`the largest angle of incidence used`,
          L`the first reading before rotation of the prism`,
          L`the angle between the telescope and collimator axes only`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The minimum deviation is not necessarily at the largest incidence angle.",
          C: "A single initial reading does not establish a minimum.",
          D: "The deviation angle is obtained from the observed ray positions, not just the instrument axes.",
        },
        hints: [
          "The graph is deviation against incidence angle.",
          "Minimum deviation is a minimum on this curve.",
          "Look for the lowest point.",
        ],
        solution: [
          { step: 1, explanation: "As the angle of incidence changes, the deviation first decreases and then increases." },
          { step: 2, explanation: "The minimum deviation is read from the lowest point of the deviation-incidence graph." },
        ],
      },
      {
        questionLatex: L`In finding refractive index of a glass slab using a travelling microscope, the microscope is used mainly to measure`,
        difficulty: 2,
        skillTags: ["travelling-microscope", "refractive-index"],
        choices: [L`real and apparent depths`, L`mass and volume of the slab`, L`angle of minimum deviation`, L`focal length of the eyepiece`],
        correctLetter: "A",
        rationales: {
          B: "Mass and volume are not used for optical refractive index in this experiment.",
          C: "Minimum deviation belongs to the prism experiment.",
          D: "The eyepiece focal length is not the measured quantity for slab refractive index.",
        },
        hints: [
          "A travelling microscope measures vertical positions accurately.",
          "The apparent position changes because of refraction.",
          "Use real depth and apparent depth.",
        ],
        solution: [
          { step: 1, explanation: "The microscope readings locate the actual and apparent positions of the mark." },
          { step: 2, explanation: L`The refractive index is found using $\mu=\text{real depth}/\text{apparent depth}$.` },
        ],
      },
      {
        questionLatex: L`A convex lens of focal length $20\,\text{cm}$ is combined in contact with another convex lens of focal length $30\,\text{cm}$. The equivalent power is`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["lens-combination", "power"],
        choices: [L`$8.33\,\text{D}$`, L`$5.0\,\text{D}$`, L`$1.67\,\text{D}$`, L`$50\,\text{D}$`],
        correctLetter: "A",
        rationales: {
          B: "This uses only the 20 cm lens and ignores the second lens.",
          C: "This subtracts powers instead of adding powers for two convex lenses in contact.",
          D: "This forgets to convert centimetres into metres before finding power.",
        },
        hints: [
          "Power is reciprocal of focal length in metres.",
          "For lenses in contact, powers add.",
          "Use 0.20 m and 0.30 m.",
        ],
        solution: [
          { step: 1, explanation: L`The powers are $P_1=1/0.20=5\,\text{D}$ and $P_2=1/0.30=3.33\,\text{D}$.` },
          { step: 2, explanation: L`Equivalent power $P=P_1+P_2=8.33\,\text{D}$.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In a concave mirror experiment, the object distance and image distance are measured from the pole of the mirror.`,
        difficulty: 2,
        skillTags: ["concave-mirror", "sign-convention", "viva"],
        parts: onePart("Why should all distances be measured from the pole and not from the stand?", 1),
        hints: ["The mirror formula uses distances from a reference point on the mirror.", "That reference point is the pole.", "The stand position is not part of the optical formula."],
        rubric: rubric([{ part: "a", points: 1, description: "Explains that mirror formula distances are measured from the pole." }]),
        commonErrors: ["Using the stand as origin.", "Not mentioning the pole as optical reference."],
        workedSolution: [{ part: "a", explanation: "The mirror formula is written for object and image distances measured from the pole, so using the stand would introduce a systematic error." }],
      },
      {
        responseType: "saq",
        questionLatex: L`A convex lens forms a sharp image on a screen. A student records $u=30\,\text{cm}$ and $v=60\,\text{cm}$.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["convex-lens", "lens-formula"],
        parts: [
          part("a", "Find the focal length using $1/f=1/v+1/u$ for magnitudes.", 1),
          part("b", "State one precaution for obtaining a sharp image.", 1),
        ],
        hints: [
          "Use reciprocal distances.",
          "$1/f=1/60+1/30=3/60$.",
          "Move the screen gently until the image is sharp.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Calculates $f=20\\,\\text{cm}$." },
          { part: "b", points: 1, description: "States a valid focusing/alignment precaution." },
        ]),
        commonErrors: ["Adding distances directly.", "Accepting a blurred image."],
        workedSolution: [
          { part: "a", explanation: L`$1/f=1/60+1/30=3/60=1/20$, so $f=20\,\text{cm}$.` },
          { part: "b", explanation: "The lens and screen should be vertical and coaxial, and the image should be focused sharply before recording distance." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In the glass slab experiment using a travelling microscope, the real thickness is $3.0\,\text{cm}$ and the apparent thickness is $2.0\,\text{cm}$.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["travelling-microscope", "refractive-index"],
        parts: [
          part("a", "Find the refractive index.", 1),
          part("b", "Why is a travelling microscope suitable here?", 1),
        ],
        hints: [
          "Use real depth divided by apparent depth.",
          "The reading must be along the vertical scale.",
          "A travelling microscope measures small vertical displacements accurately.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Calculates refractive index 1.5." },
          { part: "b", points: 1, description: "Mentions accurate focusing/vertical position measurement." },
        ]),
        commonErrors: ["Using apparent/real instead of real/apparent.", "Giving refractive index with a unit."],
        workedSolution: [
          { part: "a", explanation: L`$\mu=\text{real thickness}/\text{apparent thickness}=3.0/2.0=1.5$.` },
          { part: "b", explanation: "It can focus on marks at different apparent depths and measure the corresponding vertical displacement accurately." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A student is finding the angle of minimum deviation of a prism by plotting $\delta$ against $i$.`,
        difficulty: 3,
        skillTags: ["prism", "minimum-deviation", "graph"],
        parts: [
          part("a", L`What shape is expected for the $\delta$-$i$ graph near the minimum?`, 1),
          part("b", "Why are readings taken on both sides of the minimum?", 1),
          part("c", "How is $D_m$ obtained from the graph?", 1),
        ],
        hints: [
          "Deviation decreases and then increases.",
          "Both sides help locate the turning point.",
          "Read the lowest value of deviation.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Describes a smooth curve with a minimum." },
          { part: "b", points: 1, description: "Explains better location of minimum/reduction of error." },
          { part: "c", points: 1, description: "States $D_m$ is the lowest deviation value." },
        ]),
        commonErrors: ["Using only one reading.", "Taking largest deviation as minimum deviation.", "Drawing a zig-zag graph."],
        workedSolution: [
          { part: "a", explanation: "The graph is a smooth curve with a clear lowest point." },
          { part: "b", explanation: "Readings on both sides confirm the turn of the curve and make the minimum easier to locate." },
          { part: "c", explanation: "The angle of minimum deviation is read as the lowest value of deviation on the graph." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In an optics practical, a student gets a sharp image for a convex lens at several object distances, but two points on the $1/v$ versus $1/u$ graph are visibly off the straight-line trend.`,
        difficulty: 3,
        skillTags: ["optics-graph", "error-analysis", "case-viva"],
        parts: [
          part("a", "Should the student draw a best-fit straight line or a zig-zag line through all points?", 1),
          part("b", "Name one possible cause of the two off-trend points.", 1),
          part("c", "Which graph feature is used to obtain focal length?", 1),
          part("d", "Why is a sharp image essential before noting $v$?", 1),
        ],
        hints: [
          "A graph should show the relation, not every random error.",
          "Think of parallax, misalignment or a blurred image.",
          "The intercept gives reciprocal focal length.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Chooses best-fit straight line." },
          { part: "b", points: 1, description: "Names valid observation/alignment error." },
          { part: "c", points: 1, description: "Mentions intercept/reciprocal focal length." },
          { part: "d", points: 1, description: "Explains sharp image fixes image position accurately." },
        ]),
        commonErrors: ["Forcing graph through every point.", "Using the off-trend point alone for focal length.", "Recording image distance before focusing."],
        workedSolution: [
          { part: "a", explanation: "A best-fit straight line should be drawn." },
          { part: "b", explanation: "Possible causes include parallax, misalignment of lens and screen, inaccurate distance reading, or accepting a blurred image." },
          { part: "c", explanation: L`The intercept gives $1/f$ in magnitude, so the focal length is found from its reciprocal.` },
          { part: "d", explanation: "A sharp image gives a well-defined screen position, reducing uncertainty in $v$." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.4",
    title: "Diode, Components, Multimeter and LDR Activities",
    subtopic:
      "p-n junction diode I-V curve, component identification, multimeter continuity checks, unidirectional conduction, LED/diode activity, and LDR current variation.",
    mc: [
      {
        questionLatex: L`In the diode I-V curve shown, the branch labelled P corresponds to`,
        figure: diodeCurveFigure,
        difficulty: 2,
        skillTags: ["diode-characteristic", "forward-bias"],
        choices: [L`forward-bias conduction`, L`reverse-bias leakage only`, L`ohmic resistor behaviour`, L`open-circuit voltage measurement`],
        correctLetter: "A",
        rationales: {
          B: "The reverse branch has small current and lies on the opposite side of the graph.",
          C: "The diode curve is non-linear, unlike an ohmic resistor's straight V-I graph.",
          D: "The graph is a current-voltage characteristic, not just a voltage reading.",
        },
        hints: [
          "Look at the first-quadrant branch.",
          "Current rises sharply after the knee region.",
          "That is forward-bias behaviour.",
        ],
        solution: [
          { step: 1, explanation: "In forward bias, diode current rises rapidly after the threshold region." },
          { step: 2, explanation: "Branch P shows this steep rise, so it corresponds to forward-bias conduction." },
        ],
      },
      {
        questionLatex: L`In drawing the I-V characteristic of a p-n junction diode, the voltmeter is connected`,
        difficulty: 1,
        skillTags: ["diode-circuit", "voltmeter-connection"],
        choices: [L`in parallel with the diode`, L`in series with the diode`, L`only across the key`, L`in parallel with the ammeter`],
        correctLetter: "A",
        rationales: {
          B: "A voltmeter measures potential difference across a component and is not connected in series.",
          C: "The key is not the component whose voltage is being plotted.",
          D: "The voltage needed is across the diode, not across the ammeter.",
        },
        hints: [
          "A voltmeter measures potential difference.",
          "Potential difference is measured across a component.",
          "So it is parallel to the diode.",
        ],
        solution: [
          { step: 1, explanation: "The I-V graph needs voltage across the diode and current through it." },
          { step: 2, explanation: "Therefore the voltmeter is connected in parallel with the diode." },
        ],
      },
      {
        questionLatex: L`When a multimeter is used to check an ideal diode, a good diode should show`,
        difficulty: 2,
        skillTags: ["multimeter", "diode-test"],
        choices: [
          L`low resistance in one direction and high resistance in the reverse direction`,
          L`the same low resistance in both directions`,
          L`the same high resistance in both directions`,
          L`zero resistance only when no leads are connected`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Low resistance both ways suggests a shorted component, not proper diode action.",
          C: "High resistance both ways suggests an open component.",
          D: "With no leads connected, the meter is not checking the diode.",
        },
        hints: [
          "A diode conducts mainly in one direction.",
          "Forward direction gives low resistance.",
          "Reverse direction gives high resistance.",
        ],
        solution: [
          { step: 1, explanation: "A working diode conducts in forward bias and blocks in reverse bias." },
          { step: 2, explanation: "So a multimeter shows low resistance one way and high resistance the other way." },
        ],
      },
      {
        questionLatex: L`In the CBSE activity on an LDR, moving the lamp farther from the LDR generally makes the current in the circuit`,
        difficulty: 2,
        skillTags: ["ldr", "light-intensity"],
        choices: [L`decrease`, L`increase without limit`, L`remain exactly constant`, L`reverse direction automatically`],
        correctLetter: "A",
        rationales: {
          B: "Greater distance reduces intensity at the LDR, so current does not increase.",
          C: "The purpose of the activity is to observe current variation with illumination.",
          D: "Changing light intensity does not automatically reverse current direction.",
        },
        hints: [
          "Light intensity decreases with distance.",
          "An LDR has lower resistance in stronger light.",
          "Less light increases resistance, reducing current.",
        ],
        solution: [
          { step: 1, explanation: "As the lamp is moved away, less light reaches the LDR." },
          { step: 2, explanation: "The LDR resistance increases, so the circuit current decreases." },
        ],
      },
      {
        questionLatex: L`In identifying a resistor, capacitor, inductor and diode from a mixed collection, the component that allows current mainly in one direction is the`,
        difficulty: 1,
        skillTags: ["component-identification", "diode"],
        choices: [L`diode`, L`resistor`, L`capacitor`, L`inductor`],
        correctLetter: "A",
        rationales: {
          B: "A resistor opposes current but does not conduct only in one direction.",
          C: "A capacitor stores charge and blocks steady DC after charging.",
          D: "An inductor opposes changes in current; it is not a one-way conductor.",
        },
        hints: [
          "The component is non-ohmic and has polarity-sensitive conduction.",
          "It is tested by reversing multimeter leads.",
          "That component is a diode.",
        ],
        solution: [
          { step: 1, explanation: "A p-n junction diode conducts easily in forward bias and poorly in reverse bias." },
          { step: 2, explanation: "So the one-way conducting component is the diode." },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In a p-n junction diode I-V practical, the reverse-bias current is very small for ordinary reverse voltages.`,
        difficulty: 2,
        skillTags: ["diode-characteristic", "reverse-bias"],
        parts: onePart("What name is commonly given to this small current?", 1),
        hints: ["It appears even when the diode is reverse biased.", "It is due to minority carriers.", "It is called reverse saturation current."],
        rubric: rubric([{ part: "a", points: 1, description: "Names reverse saturation current or reverse leakage current." }]),
        commonErrors: ["Calling it forward current.", "Saying it must be exactly zero in a real diode."],
        workedSolution: [{ part: "a", explanation: "It is called reverse saturation current, often loosely described as reverse leakage current." }],
      },
      {
        responseType: "saq",
        questionLatex: L`A student obtains a nearly straight V-I graph for a resistor but a curved V-I graph for a diode.`,
        difficulty: 3,
        skillTags: ["ohmic-nonohmic", "diode-characteristic"],
        parts: [
          part("a", "Which component obeys Ohm's law over the observed range?", 1),
          part("b", "Why is the diode graph not a straight line?", 1),
        ],
        hints: [
          "Ohmic behaviour gives a straight V-I graph.",
          "A diode has a p-n junction barrier.",
          "Its current changes non-linearly with voltage.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies resistor as ohmic." },
          { part: "b", points: 1, description: "Explains diode has non-linear junction behaviour." },
        ]),
        commonErrors: ["Calling every V-I graph ohmic.", "Ignoring the p-n junction barrier."],
        workedSolution: [
          { part: "a", explanation: "The resistor obeys Ohm's law because its V-I graph is nearly a straight line." },
          { part: "b", explanation: "The diode current depends non-linearly on applied bias because of the p-n junction barrier and carrier injection." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`During a multimeter activity, a component shows continuity for both lead directions with almost zero resistance.`,
        difficulty: 3,
        skillTags: ["multimeter", "component-fault", "diode-test"],
        parts: [
          part("a", "If the component is supposed to be a diode, what fault is suggested?", 1),
          part("b", "What observation would suggest an open diode instead?", 1),
        ],
        hints: [
          "A good diode conducts mainly one way.",
          "Both-way low resistance means a short.",
          "Both-way high resistance means open circuit.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies shorted diode." },
          { part: "b", points: 1, description: "States high resistance/no continuity in both directions." },
        ]),
        commonErrors: ["Calling both-way conduction normal.", "Confusing short and open faults."],
        workedSolution: [
          { part: "a", explanation: "Almost zero resistance in both directions suggests the diode is shorted." },
          { part: "b", explanation: "An open diode would show no continuity or very high resistance in both directions." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A student studies the effect of lamp distance on current through an LDR circuit.`,
        difficulty: 3,
        skillTags: ["ldr", "variables", "project-method"],
        parts: [
          part("a", "Name the independent variable.", 1),
          part("b", "Name the dependent variable.", 1),
          part("c", "State one controlled variable.", 1),
        ],
        hints: [
          "The independent variable is deliberately changed.",
          "The measured response is the dependent variable.",
          "Keep lamp power or supply voltage fixed.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies lamp distance or illumination as independent variable." },
          { part: "b", points: 1, description: "Identifies current as dependent variable." },
          { part: "c", points: 1, description: "States a valid controlled variable." },
        ]),
        commonErrors: ["Calling current the independent variable.", "Changing lamp power and distance together."],
        workedSolution: [
          { part: "a", explanation: "The independent variable is the distance of the lamp from the LDR, or equivalently the illumination reaching the LDR." },
          { part: "b", explanation: "The dependent variable is the current measured in the circuit." },
          { part: "c", explanation: "A controlled variable can be lamp power, supply voltage, ambient light, or the same LDR used throughout." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A diode I-V experiment is performed. The student records forward voltage and current, then reverses the supply terminals for reverse bias.`,
        figure: diodeCurveFigure,
        difficulty: 4,
        skillTags: ["diode-practical", "biasing", "case-viva"],
        parts: [
          part("a", "Which branch of the graph should be used for forward-bias readings?", 1),
          part("b", "Why should a current-limiting resistance be used in forward bias?", 1),
          part("c", "Why is the reverse current scale usually smaller?", 1),
          part("d", "State one precaution before reversing the supply terminals.", 1),
        ],
        hints: [
          "Forward current rises sharply.",
          "The diode can be damaged by excessive current.",
          "Reverse current is usually very small at ordinary reverse bias.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies the steep first-quadrant branch." },
          { part: "b", points: 1, description: "Explains protection against excessive current." },
          { part: "c", points: 1, description: "Explains reverse current is very small." },
          { part: "d", points: 1, description: "States a valid supply/current-range precaution." },
        ]),
        commonErrors: ["Using same current scale without considering reverse leakage.", "Removing series resistance.", "Reversing terminals while supply is on."],
        workedSolution: [
          { part: "a", explanation: "The steep first-quadrant branch is used for forward-bias readings." },
          { part: "b", explanation: "A current-limiting resistance protects the diode from excessive forward current." },
          { part: "c", explanation: "At ordinary reverse bias the diode current is only a small leakage or reverse saturation current, so a smaller current scale is needed." },
          { part: "d", explanation: "Switch off the supply and set suitable meter ranges before reversing the terminals." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.5",
    title: "Practical Record, Project Work and Viva Skills",
    subtopic:
      "Official record requirements, activities, apparatus familiarity, graph scale choice, error analysis, project variables, precautions, and viva communication.",
    mc: [
      {
        questionLatex: L`According to the CBSE Class XII Physics practical evaluation scheme, viva on experiments, activities and project carries`,
        difficulty: 1,
        skillTags: ["official-practical-scheme", "viva-marks"],
        choices: [L`$5$ marks`, L`$3$ marks`, L`$7$ marks`, L`$30$ marks`],
        correctLetter: "A",
        rationales: {
          B: "Three marks are allotted to the investigatory project, not viva.",
          C: "Seven marks correspond to one experiment component.",
          D: "Thirty marks is the total practical examination, not viva alone.",
        },
        hints: [
          "The practical examination is 30 marks.",
          "Viva is a separate component.",
          "It carries 5 marks.",
        ],
        solution: [
          { step: 1, explanation: "The CBSE scheme lists viva on experiments, activities and project separately." },
          { step: 2, explanation: "That viva component carries 5 marks." },
        ],
      },
      {
        questionLatex: L`A practical record entry should normally include`,
        difficulty: 1,
        skillTags: ["practical-record", "format"],
        choices: [
          L`aim, apparatus, theory, procedure, observations, calculations, result and precautions`,
          L`only the final numerical answer`,
          L`only a copied diagram without observations`,
          L`only the examiner's signature`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A practical record must show method and observations, not just the final answer.",
          C: "A diagram without observations cannot support the result.",
          D: "Signature is part of checking, not the scientific record itself.",
        },
        hints: [
          "A record must let someone understand and verify the experiment.",
          "It should include both method and data.",
          "It also includes result and precautions.",
        ],
        solution: [
          { step: 1, explanation: "A good record documents what was done, what was measured, how it was calculated, and how errors were controlled." },
          { step: 2, explanation: "So it includes aim, apparatus, theory, procedure, observations, calculations, result and precautions." },
        ],
      },
      {
        questionLatex: L`In choosing a graph scale for practical work, the best choice is the scale that`,
        difficulty: 2,
        skillTags: ["graph-scale", "practical-skill"],
        choices: [
          L`uses most of the graph paper and is easy to read`,
          L`puts all points in one small corner`,
          L`changes scale halfway along an axis without noting it`,
          L`avoids plotting units on the axes`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Crowding points in one corner increases percentage reading error.",
          C: "Changing scale midway without clear indication makes slope and readings invalid.",
          D: "Axes must show quantities and units.",
        },
        hints: [
          "Good graphing reduces reading error.",
          "The plotted points should occupy a large part of the sheet.",
          "Scales must be convenient and labelled.",
        ],
        solution: [
          { step: 1, explanation: "A suitable scale spreads the points over the graph paper and makes readings easy." },
          { step: 2, explanation: "Axes must be labelled with quantities and units." },
        ],
      },
      {
        questionLatex: L`In an investigatory project viva, the strongest answer defends`,
        difficulty: 2,
        skillTags: ["investigatory-project", "viva"],
        choices: [
          L`the aim, variables, method, data, limitations and conclusion`,
          L`only the decorative title page`,
          L`only the number of pages in the file`,
          L`only a memorised definition unrelated to the project`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Presentation matters, but viva tests understanding of the investigation.",
          C: "Page count does not establish scientific quality.",
          D: "A viva answer must connect to the actual project method and conclusion.",
        },
        hints: [
          "Project viva tests whether the student understands the investigation.",
          "Think of variables, controls, observations and conclusion.",
          "Also mention limitations.",
        ],
        solution: [
          { step: 1, explanation: "A good project viva answer explains the purpose and design of the investigation." },
          { step: 2, explanation: "It should defend aim, variables, method, observations, limitations and conclusion." },
        ],
      },
      {
        questionLatex: L`A common precaution while taking readings with an analog meter is to`,
        difficulty: 1,
        skillTags: ["analog-meter", "parallax"],
        choices: [
          L`view the pointer normally to the scale to avoid parallax`,
          L`read the scale from the side for convenience`,
          L`tap the pointer hard before every reading`,
          L`ignore zero error if the reading is large`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Side viewing produces parallax error.",
          C: "Hard tapping can damage the instrument.",
          D: "Zero error should be checked and corrected where applicable.",
        },
        hints: [
          "The pointer and scale must be aligned with the eye.",
          "Mirror scales help remove parallax.",
          "Read normally to the scale.",
        ],
        solution: [
          { step: 1, explanation: "Analog meter readings can suffer from parallax if viewed obliquely." },
          { step: 2, explanation: "The pointer should be viewed normally to the scale, often with its reflection hidden in a mirror scale." },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`CBSE Class XII practical work includes record, activities, project and viva.`,
        difficulty: 1,
        skillTags: ["official-practical-scheme", "viva"],
        parts: onePart("How many marks are allotted to viva on experiments, activities and project?", 1),
        hints: ["Recall the official 30-mark practical scheme.", "Viva is a separate component.", "It carries 5 marks."],
        rubric: rubric([{ part: "a", points: 1, description: "States 5 marks." }]),
        commonErrors: ["Confusing viva marks with project marks.", "Stating the total practical marks."],
        workedSolution: [{ part: "a", explanation: "The viva on experiments, activities and project carries 5 marks." }],
      },
      {
        responseType: "saq",
        questionLatex: L`A student writes the result of a focal-length experiment but leaves the observation table blank.`,
        difficulty: 2,
        skillTags: ["practical-record", "data-integrity"],
        parts: [
          part("a", "Why is this record scientifically incomplete?", 1),
          part("b", "Name two entries that should appear in the observation table.", 1),
        ],
        hints: [
          "A result must be supported by measured data.",
          "For optical experiments, object and image distances are typical observations.",
          "Repeated readings improve reliability.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Explains result lacks supporting observations." },
          { part: "b", points: 1, description: "Names two suitable observation-table entries." },
        ]),
        commonErrors: ["Saying final answer alone is enough.", "Listing apparatus instead of observations."],
        workedSolution: [
          { part: "a", explanation: "A result without observations cannot be checked or reproduced, so the record is incomplete." },
          { part: "b", explanation: "For a focal-length experiment, entries may include object distance, image distance, trial number and calculated focal length." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A graph in a practical file has no units written on either axis.`,
        difficulty: 2,
        skillTags: ["graph-work", "units"],
        parts: [
          part("a", "Why is this a serious graphing error?", 1),
          part("b", "Give an example of a correct axis label for a V-I graph.", 1),
        ],
        hints: [
          "A graph value is meaningless without quantity and unit.",
          "For a V-I graph, one axis can be current.",
          "Write quantity followed by unit.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Explains that numerical readings and slope lack physical meaning without units." },
          { part: "b", points: 1, description: "Gives a correct label such as $I$ (A) or $V$ (V)." },
        ]),
        commonErrors: ["Writing only x and y.", "Writing units without physical quantity."],
        workedSolution: [
          { part: "a", explanation: "Without units, the plotted values and the slope cannot be interpreted physically." },
          { part: "b", explanation: "A correct label could be $I$ (A) on the x-axis and $V$ (V) on the y-axis." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An investigatory project studies how current through an LDR circuit changes with distance of the lamp.`,
        difficulty: 3,
        skillTags: ["project-work", "variables", "methodology"],
        parts: [
          part("a", "State the aim in one sentence.", 1),
          part("b", "Identify the independent and dependent variables.", 1),
          part("c", "State two controls or precautions.", 2),
        ],
        hints: [
          "The aim should connect lamp distance and current.",
          "Distance is changed; current is measured.",
          "Keep supply voltage and lamp power fixed; reduce ambient light changes.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States a clear aim." },
          { part: "b", points: 1, description: "Correctly identifies independent and dependent variables." },
          { part: "c", points: 2, description: "States two valid controls or precautions." },
        ]),
        commonErrors: ["Changing two variables together.", "Not measuring current quantitatively.", "Ignoring ambient light."],
        workedSolution: [
          { part: "a", explanation: "Aim: To study how the current through an LDR circuit changes with the distance of the lamp from the LDR." },
          { part: "b", explanation: "The independent variable is lamp distance; the dependent variable is circuit current." },
          { part: "c", explanation: "Keep supply voltage and lamp power fixed, use the same LDR, avoid ambient light changes, and take readings after the meter becomes steady." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`During practical viva, an examiner asks a student to defend a graph-based experiment, identify a possible source of error, and explain why repeated readings were taken.`,
        difficulty: 4,
        skillTags: ["viva-voce", "error-analysis", "graph-practical"],
        parts: [
          part("a", "What should the student say about repeated readings?", 1),
          part("b", "How should the slope be reported from a best-fit graph?", 1),
          part("c", "Give one source of random error and one source of systematic error.", 2),
          part("d", "Why is a memorised final answer alone weak in viva?", 1),
        ],
        hints: [
          "Repeated readings reduce random error.",
          "Slope should come from two well-separated points on the best-fit line.",
          "Viva tests method and reasoning, not just the result.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Explains repeated readings improve reliability/reduce random error." },
          { part: "b", points: 1, description: "States slope from two well-separated points on the best-fit line." },
          { part: "c", points: 2, description: "Gives one valid random and one valid systematic error." },
          { part: "d", points: 1, description: "Explains viva assesses understanding of procedure and evidence." },
        ]),
        commonErrors: ["Taking slope from adjacent raw points.", "Confusing random and systematic error.", "Answering only with a memorised formula."],
        workedSolution: [
          { part: "a", explanation: "Repeated readings help average out random errors and reveal inconsistent observations." },
          { part: "b", explanation: "The slope should be calculated using two well-separated points on the best-fit line, not two scattered raw points." },
          { part: "c", explanation: "A random error may be fluctuation of pointer reading; a systematic error may be zero error or calibration error." },
          { part: "d", explanation: "A memorised final answer is weak because viva checks whether the student understands the apparatus, method, observations, limitations and conclusion." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.6",
    title: "Resistivity, Figure of Merit and Circuit Activities",
    subtopic:
      "Resistivity from V-I graphs, figure of merit, potential drop along a wire, household-circuit assembly, multimeter use, and open-circuit correction.",
    mc: [
      {
        questionLatex: L`A wire of length $0.80\,\text{m}$ and diameter $0.40\,\text{mm}$ gives a V-I graph of slope $4.0\,\Omega$. Its resistivity is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["resistivity", "v-i-graph", "screw-gauge-link"],
        choices: [L`$6.3\times10^{-7}\,\Omega\text{m}$`, L`$2.0\times10^{-6}\,\Omega\text{m}$`, L`$5.0\times10^{-8}\,\Omega\text{m}$`, L`$1.3\times10^{-7}\,\Omega\text{m}$`],
        correctLetter: "A",
        rationales: {
          B: L`This is too large; it usually comes from using diameter as radius.`,
          C: L`This is too small; it misses the cross-sectional area factor in $\rho=RA/l$.`,
          D: L`This is close to using only half the correct area calculation.`,
        },
        hints: [
          "Slope of a V-I graph gives R.",
          L`Use radius, not diameter, in $A=\pi r^2$.`,
          L`Use $\rho=RA/l$ in SI units.`,
        ],
        solution: [
          { step: 1, explanation: L`The slope gives resistance.`, math: L`R=4.0\,\Omega` },
          { step: 2, explanation: L`The radius is $0.20\,\text{mm}=2.0\times10^{-4}\,\text{m}$.`, math: L`A=\pi r^2\approx 1.26\times10^{-7}\,\text{m}^2` },
          { step: 3, explanation: L`Therefore`, math: L`\rho=\frac{RA}{l}=\frac{4.0(1.26\times10^{-7})}{0.80}\approx6.3\times10^{-7}\,\Omega\text{m}` },
        ],
      },
      {
        questionLatex: L`In a galvanometer experiment, a current of $72\,\mu\text{A}$ gives a deflection of $24$ divisions. The figure of merit is`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["figure-of-merit", "galvanometer"],
        choices: [L`$3\,\mu\text{A/division}$`, L`$96\,\mu\text{A/division}$`, L`$0.33\,\mu\text{A/division}$`, L`$48\,\mu\text{A/division}$`],
        correctLetter: "A",
        rationales: {
          B: L`This adds current and deflection instead of dividing current by deflection.`,
          C: L`This takes divisions per microampere, the reciprocal of the required quantity.`,
          D: L`This uses half the deflection without a half-deflection condition.`,
        },
        hints: [
          "Figure of merit is current per division.",
          "Divide the current through the galvanometer by the deflection.",
          "Keep the unit as microampere per division.",
        ],
        solution: [
          { step: 1, explanation: L`Figure of merit is the current required for one division deflection.`, math: L`k=\frac{I}{\theta}` },
          { step: 2, explanation: L`Substitute the observations.`, math: L`k=\frac{72\,\mu\text{A}}{24}=3\,\mu\text{A/division}` },
        ],
      },
      {
        questionLatex: L`In the potential-drop experiment shown, the potential drop across $75\,\text{cm}$ of the uniform wire is closest to`,
        figure: potentialDropLengthFigure,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["potential-drop-length", "graph-slope"],
        choices: [L`$1.2\,\text{V}$`, L`$0.75\,\text{V}$`, L`$1.6\,\text{V}$`, L`$0.4\,\text{V}$`],
        correctLetter: "A",
        rationales: {
          B: L`This treats centimetres directly as volts without using the graph scale.`,
          C: L`This is the drop over $100\,\text{cm}$, not $75\,\text{cm}$.`,
          D: L`This is the value near $25\,\text{cm}$, not $75\,\text{cm}$.`,
        },
        hints: [
          "Read the straight line as proportional variation.",
          "The graph gives about 1.6 V for 100 cm.",
          "Use three-fourths of the 100 cm value.",
        ],
        solution: [
          { step: 1, explanation: L`The line shows $V=1.6\,\text{V}$ at $100\,\text{cm}$.` },
          { step: 2, explanation: L`For $75\,\text{cm}$ of a uniform wire,`, math: L`V=1.6\times\frac{75}{100}=1.2\,\text{V}` },
        ],
      },
      {
        questionLatex: L`In assembling a household circuit with three bulbs, three switches and a fuse, the safest correct connection is`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["household-circuit", "safety", "parallel-connection"],
        choices: [
          L`bulbs in parallel, each switch in the live wire, and the fuse in the live wire`,
          L`bulbs in series, one common switch in neutral, and fuse in neutral`,
          L`bulbs in parallel, but the fuse bypassed by a separate wire`,
          L`bulbs in series so that the same current protects all bulbs`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Bulbs should not be in series for household wiring, and switching/fusing neutral is unsafe.`,
          C: L`Bypassing the fuse removes the protection.`,
          D: L`Series connection makes appliances dependent on each other and is not the household arrangement.`,
        },
        hints: [
          "Household appliances are normally connected in parallel.",
          "A switch should disconnect the live conductor.",
          "The fuse must melt before the appliance remains live in a fault.",
        ],
        solution: [
          { step: 1, explanation: L`Household loads are connected in parallel so each gets rated voltage.` },
          { step: 2, explanation: L`Switches and fuse should be on the live wire so the appliance is disconnected from the live supply during switching or a fault.` },
        ],
      },
      {
        questionLatex: L`In the open-circuit diagram, the best correction for measuring the potential difference across $R$ is to`,
        figure: openCircuitFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["open-circuit-correction", "voltmeter-connection"],
        choices: [
          L`connect the voltmeter directly across the two terminals of $R$`,
          L`connect the voltmeter in series with the ammeter`,
          L`place the ammeter across $R$ and the voltmeter in series`,
          L`remove the key so that only the voltmeter remains in the circuit`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`A voltmeter is not a series instrument for measuring potential difference across a component.`,
          C: L`An ammeter across a resistor can short the circuit and is not the correct connection.`,
          D: L`Removing the key does not connect the voltmeter across the required component.`,
        },
        hints: [
          "A voltmeter measures potential difference between two points.",
          "Those two points must be the terminals of R.",
          "Ammeter remains in series with the main current path.",
        ],
        solution: [
          { step: 1, explanation: L`The ammeter should be in series with the circuit current.` },
          { step: 2, explanation: L`The voltmeter must be connected in parallel with $R$, across its two terminals.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "laq",
        questionLatex: L`A student determines the resistivity of a wire. The V-I best-fit line has slope $3.5\,\Omega$, the wire length is $90\,\text{cm}$, and the measured diameter is $0.50\,\text{mm}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["resistivity", "best-fit-line", "units"],
        parts: [
          part("a", "State what the graph slope represents.", 1),
          part("b", "Calculate the cross-sectional area of the wire.", 1),
          part("c", "Find the resistivity of the wire.", 2),
          part("d", "Give one reason for using a best-fit line instead of joining adjacent points.", 1),
        ],
        hints: [
          "The graph is V against I.",
          "Convert cm and mm to metre before substitution.",
          L`Use $\rho=RA/l$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies slope as resistance." },
          { part: "b", points: 1, description: "Computes area using radius in metre." },
          { part: "c", points: 2, description: "Calculates resistivity with correct unit." },
          { part: "d", points: 1, description: "Explains best-fit line reduces random scatter." },
        ]),
        commonErrors: ["Using diameter as radius.", "Leaving length in centimetre.", "Taking reciprocal of slope."],
        workedSolution: [
          { part: "a", explanation: "For a V-I graph, slope equals resistance, so $R=3.5\\,\\Omega$." },
          { part: "b", explanation: "Radius $r=0.25\\,\\text{mm}=2.5\\times10^{-4}\\,\\text{m}$, so $A=\\pi r^2\\approx1.96\\times10^{-7}\\,\\text{m}^2$." },
          { part: "c", explanation: "$\\rho=RA/l=3.5(1.96\\times10^{-7})/0.90\\approx7.6\\times10^{-7}\\,\\Omega\\text{m}$." },
          { part: "d", explanation: "A best-fit line averages out random observation scatter and gives a more reliable slope." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a galvanometer figure-of-merit experiment, a current of $50\,\mu\text{A}$ gives a deflection of $20$ divisions.`,
        difficulty: 2,
        skillTags: ["figure-of-merit", "viva-calculation"],
        parts: [
          part("a", "Find the figure of merit.", 1),
          part("b", "What does this value physically mean?", 1),
        ],
        hints: [
          "Use current per division.",
          "Divide 50 microampere by 20.",
          "Interpret the answer for one division.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Calculates current per division." },
          { part: "b", points: 1, description: "States the current required for one division deflection." },
        ]),
        commonErrors: ["Writing division per current.", "Ignoring the unit microampere per division."],
        workedSolution: [
          { part: "a", explanation: "$k=I/\\theta=50/20=2.5\\,\\mu\\text{A per division}$." },
          { part: "b", explanation: "It means $2.5\\,\\mu\\text{A}$ of galvanometer current produces one division deflection." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student draws the open circuit shown before assembling it on the board.`,
        figure: openCircuitFigure,
        difficulty: 3,
        skillTags: ["open-circuit-correction", "circuit-diagram"],
        parts: [
          part("a", "Which meter should remain in series in the main circuit?", 1),
          part("b", "Across which two points should the voltmeter be connected?", 1),
          part("c", "Why should the key be kept open while changing connections?", 1),
        ],
        hints: [
          "Current-measuring and voltage-measuring meters have different connections.",
          "Potential difference across R means the two terminals of R.",
          "Changing a live circuit can damage meters or components.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies ammeter in series." },
          { part: "b", points: 1, description: "Identifies voltmeter across resistor terminals." },
          { part: "c", points: 1, description: "States safety/protection reason for open key." },
        ]),
        commonErrors: ["Putting voltmeter in series.", "Putting ammeter across R.", "Changing connections with key closed."],
        workedSolution: [
          { part: "a", explanation: "The ammeter should remain in series with the main current path." },
          { part: "b", explanation: "The voltmeter should be connected across the two terminals of resistor $R$." },
          { part: "c", explanation: "The key is kept open to avoid accidental short circuits and meter damage while rewiring." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In the household-circuit activity, three identical bulbs are connected to a $220\,\text{V}$ supply.`,
        difficulty: 2,
        skillTags: ["household-circuit", "parallel-connection"],
        parts: [
          part("a", "Should the bulbs be connected in series or parallel?", 1),
          part("b", "Give one practical reason for this choice.", 1),
        ],
        hints: [
          "Each bulb should get the supply voltage.",
          "One faulty bulb should not switch off the others.",
          "Think of ordinary house wiring.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States parallel connection." },
          { part: "b", points: 1, description: "Gives a valid voltage/independence reason." },
        ]),
        commonErrors: ["Choosing series because the same current flows.", "Ignoring independent switching."],
        workedSolution: [
          { part: "a", explanation: "The bulbs should be connected in parallel." },
          { part: "b", explanation: "Then each bulb receives $220\\,\\text{V}$ and can be switched independently." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The graph shows potential drop along a uniform wire for a steady current.`,
        figure: potentialDropLengthFigure,
        difficulty: 3,
        skillTags: ["potential-drop-length", "graph-interpretation"],
        parts: [
          part("a", "Find the potential gradient in V/cm.", 1),
          part("b", "Find the potential drop across $50\\,\\text{cm}$.", 1),
          part("c", "What does the straight-line nature of the graph indicate?", 1),
        ],
        hints: [
          "Use the line's value at 100 cm.",
          "Potential gradient is potential drop per unit length.",
          "Uniform wire and steady current give proportionality.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds potential gradient." },
          { part: "b", points: 1, description: "Uses proportionality for 50 cm." },
          { part: "c", points: 1, description: "Connects straight line to uniform resistance per unit length/steady current." },
        ]),
        commonErrors: ["Using centimetre value directly as voltage.", "Ignoring the origin.", "Calling the graph non-linear."],
        workedSolution: [
          { part: "a", explanation: "The graph gives $1.6\\,\\text{V}$ for $100\\,\\text{cm}$, so the potential gradient is $0.016\\,\\text{V/cm}$." },
          { part: "b", explanation: "For $50\\,\\text{cm}$, $V=0.016\\times50=0.80\\,\\text{V}$." },
          { part: "c", explanation: "The straight line through the origin shows that potential drop is proportional to length for a uniform wire carrying steady current." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.7",
    title: "Auxiliary-Lens, Liquid and Wave-Optics Activities",
    subtopic:
      "Convex mirror and concave lens experiments using a convex lens, liquid refractive-index methods, glass-slab lateral deviation, thin-slit diffraction, and lens combinations.",
    mc: [
      {
        questionLatex: L`In finding the focal length of a convex mirror using a convex lens, the original real image formed by the lens is $30\,\text{cm}$ behind the mirror. At no parallax, this distance represents the mirror's radius of curvature. The focal length of the convex mirror is`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["convex-mirror", "auxiliary-convex-lens", "no-parallax"],
        choices: [L`$15\,\text{cm}$`, L`$30\,\text{cm}$`, L`$60\,\text{cm}$`, L`$7.5\,\text{cm}$`],
        correctLetter: "A",
        rationales: {
          B: L`This reports the radius of curvature, not the focal length.`,
          C: L`This doubles the radius instead of halving it.`,
          D: L`This halves twice.`,
        },
        hints: [
          "In this method, the distance from mirror to the lens image gives R.",
          "For a spherical mirror, R = 2f.",
          "Halve 30 cm.",
        ],
        solution: [
          { step: 1, explanation: L`The no-parallax condition identifies the centre of curvature position for the convex mirror.`, math: L`R=30\,\text{cm}` },
          { step: 2, explanation: L`The focal length is half the radius of curvature.`, math: L`f=\frac{R}{2}=15\,\text{cm}` },
        ],
      },
      {
        questionLatex: L`In finding the focal length of a concave lens using a convex lens, the concave lens has a virtual object $20\,\text{cm}$ to its right and forms the final real image $40\,\text{cm}$ to its right. Using Cartesian signs for the concave lens, its focal length is`,
        difficulty: 4,
        calculatorAllowed: false,
        skillTags: ["concave-lens", "auxiliary-convex-lens", "sign-convention"],
        choices: [L`$-40\,\text{cm}$`, L`$+40\,\text{cm}$`, L`$-13.3\,\text{cm}$`, L`$+13.3\,\text{cm}$`],
        correctLetter: "A",
        rationales: {
          B: L`A concave lens has negative focal length in Cartesian sign convention.`,
          C: L`This adds reciprocals instead of using $1/f=1/v-1/u$ with a virtual object.`,
          D: L`This also gives the wrong sign for a concave lens.`,
        },
        hints: [
          "For the concave lens, both u and v are on the right in this setup.",
          "Use 1/f = 1/v - 1/u.",
          "A concave lens should give negative f.",
        ],
        solution: [
          { step: 1, explanation: L`Here $u=+20\,\text{cm}$ and $v=+40\,\text{cm}$ for the concave lens.`, math: L`\frac{1}{f}=\frac{1}{v}-\frac{1}{u}` },
          { step: 2, explanation: L`Substitute the distances.`, math: L`\frac{1}{f}=\frac{1}{40}-\frac{1}{20}=-\frac{1}{40}` },
          { step: 3, explanation: L`Thus`, math: L`f=-40\,\text{cm}` },
        ],
      },
      {
        questionLatex: L`In the liquid refractive-index method using a convex lens and plane mirror, the no-parallax position of the object needle corresponds to the`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["liquid-refractive-index", "no-parallax", "autocollimation"],
        choices: [
          L`focus of the lens-liquid combination`,
          L`centre of curvature of the plane mirror`,
          L`principal axis of the lens only`,
          L`point where the mirror absorbs the ray`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`A plane mirror has infinite radius of curvature; the observed condition is not its centre of curvature.`,
          C: L`The principal axis is a line, not the no-parallax object position.`,
          D: L`The mirror reflects the light; absorption is not the basis of the method.`,
        },
        hints: [
          "No parallax means the image returns to the object position.",
          "That happens when rays incident on the plane mirror are normal/parallel after the lens system.",
          "The object must be at the focus of the combination.",
        ],
        solution: [
          { step: 1, explanation: L`At no parallax, the reflected image coincides with the object needle.` },
          { step: 2, explanation: L`This happens when the object is at the focus of the lens-liquid combination, so emergent rays strike the plane mirror normally and retrace their path.` },
        ],
      },
      {
        questionLatex: L`The glass-slab activity shown is performed correctly. The emergent ray is expected to be`,
        figure: glassSlabFigure,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["glass-slab", "lateral-deviation"],
        choices: [
          L`parallel to the incident ray but laterally shifted`,
          L`perpendicular to the incident ray`,
          L`bent towards the normal without emerging`,
          L`exactly along the original undeviated path`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The two refractions at parallel faces do not make the emergent ray perpendicular.`,
          C: L`The ray emerges from the second face in the activity.`,
          D: L`It is parallel to the original direction but displaced sideways.`,
        },
        hints: [
          "The slab faces are parallel.",
          "The deviation at the first face is compensated in direction at the second face.",
          "A finite thickness still causes lateral shift.",
        ],
        solution: [
          { step: 1, explanation: L`For a rectangular slab, the two refracting faces are parallel.` },
          { step: 2, explanation: L`So the emergent ray is parallel to the incident ray, but it is laterally displaced.` },
        ],
      },
      {
        questionLatex: L`In the thin-slit diffraction comparison shown, Setup A has the narrower slit. Compared with Setup B, the central maximum in Setup A is`,
        figure: diffractionSlitFigure,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["single-slit-diffraction", "qualitative-wave-optics"],
        choices: [L`wider`, L`narrower`, L`unchanged in width`, L`absent`],
        correctLetter: "A",
        rationales: {
          B: L`A narrower slit increases diffraction spread; it does not make the central maximum narrower.`,
          C: L`The width depends on slit width for the same wavelength and screen distance.`,
          D: L`A central maximum is observed in single-slit diffraction.`,
        },
        hints: [
          "Diffraction is more pronounced for a smaller aperture.",
          "Central maximum width is inversely related to slit width.",
          "Narrower slit gives larger angular spread.",
        ],
        solution: [
          { step: 1, explanation: L`Single-slit diffraction spread increases when slit width decreases.` },
          { step: 2, explanation: L`Therefore the narrower slit in Setup A gives a wider central maximum.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "case",
        questionLatex: L`A convex lens first forms a sharp image of an object needle on a screen. A convex mirror is then placed between the lens and that image, and the mirror is adjusted until the reflected image has no parallax with the object needle. The distance between the mirror and the first lens-image position is $24\,\text{cm}$.`,
        figure: auxiliaryLensFigure,
        difficulty: 3,
        skillTags: ["convex-mirror", "auxiliary-convex-lens", "viva"],
        parts: [
          part("a", "What does the no-parallax condition show in this method?", 1),
          part("b", "Find the radius of curvature of the convex mirror.", 1),
          part("c", "Find its focal length.", 1),
        ],
        hints: [
          "The first image position acts as the centre of curvature condition.",
          "The given 24 cm is R.",
          "Use f = R/2.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Explains that the first image is at the centre of curvature position for the mirror." },
          { part: "b", points: 1, description: "Identifies radius of curvature as 24 cm." },
          { part: "c", points: 1, description: "Calculates focal length as 12 cm." },
        ]),
        commonErrors: ["Calling 24 cm the focal length directly.", "Ignoring no-parallax meaning.", "Using a concave-mirror sign convention unnecessarily."],
        workedSolution: [
          { part: "a", explanation: "At no parallax, the reflected rays retrace their path; the original lens-image position is the centre of curvature position for the convex mirror." },
          { part: "b", explanation: "Hence $R=24\\,\\text{cm}$." },
          { part: "c", explanation: "$f=R/2=12\\,\\text{cm}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In a concave-lens experiment using an auxiliary convex lens, the point where rays would have met without the concave lens is $15\,\text{cm}$ to the right of the concave lens. After the concave lens is introduced, the final real image is $30\,\text{cm}$ to its right.`,
        difficulty: 4,
        calculatorAllowed: false,
        skillTags: ["concave-lens", "lens-formula", "sign-convention"],
        parts: [
          part("a", "State the sign of object distance for the concave lens in this setup.", 1),
          part("b", "Use the lens formula to find the focal length.", 2),
          part("c", "Why is the sign of focal length physically reasonable?", 1),
        ],
        hints: [
          "The object for the concave lens is virtual and lies to the right.",
          "Use 1/f = 1/v - 1/u.",
          "A diverging lens has negative focal length.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Recognises positive object distance for a virtual object on the right." },
          { part: "b", points: 2, description: "Substitutes correctly and obtains $-30\\,\\text{cm}$." },
          { part: "c", points: 1, description: "Connects negative focal length with concave/diverging lens." },
        ]),
        commonErrors: ["Using u as negative for the virtual object.", "Adding reciprocals.", "Reporting a positive focal length for a concave lens."],
        workedSolution: [
          { part: "a", explanation: "For the concave lens, the virtual object is on the right, so $u=+15\\,\\text{cm}$." },
          { part: "b", explanation: "The final real image is on the right, so $v=+30\\,\\text{cm}$. Hence $1/f=1/30-1/15=-1/30$, so $f=-30\\,\\text{cm}$." },
          { part: "c", explanation: "The negative sign is expected because a concave lens is a diverging lens." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student traces a ray through a rectangular glass slab and observes the emergent ray.`,
        figure: glassSlabFigure,
        difficulty: 2,
        skillTags: ["glass-slab", "ray-tracing", "lateral-deviation"],
        parts: [
          part("a", "State the relation between the directions of incident and emergent rays.", 1),
          part("b", "Name the sideways displacement observed.", 1),
        ],
        hints: [
          "The opposite faces of a rectangular slab are parallel.",
          "The ray direction is restored after the second refraction.",
          "The path is shifted sideways.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States emergent ray is parallel to incident ray." },
          { part: "b", points: 1, description: "Names lateral displacement/deviation." },
        ]),
        commonErrors: ["Saying the ray bends only towards the normal.", "Calling lateral shift an angle of minimum deviation."],
        workedSolution: [
          { part: "a", explanation: "The emergent ray is parallel to the incident ray for a rectangular glass slab." },
          { part: "b", explanation: "The sideways shift is called lateral displacement or lateral deviation." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student observes diffraction due to a thin slit. The slit width is then reduced while the same light and screen distance are kept fixed.`,
        figure: diffractionSlitFigure,
        difficulty: 3,
        skillTags: ["single-slit-diffraction", "experimental-observation"],
        parts: [
          part("a", "What happens to the width of the central maximum?", 1),
          part("b", "Why should the same light source be used while comparing the two observations?", 1),
          part("c", "State one practical condition needed to observe a clear diffraction pattern.", 1),
        ],
        hints: [
          "Central maximum width is inversely related to slit width.",
          "Changing colour changes wavelength.",
          "The slit should be narrow and the screen suitably placed.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States central maximum becomes wider." },
          { part: "b", points: 1, description: "Explains same wavelength is needed for fair comparison." },
          { part: "c", points: 1, description: "States a valid condition such as narrow slit/dark room/sufficient screen distance." },
        ]),
        commonErrors: ["Saying narrower slit gives narrower central maximum.", "Changing source colour during comparison.", "Confusing diffraction with refraction."],
        workedSolution: [
          { part: "a", explanation: "The central maximum becomes wider when the slit is made narrower." },
          { part: "b", explanation: "The same light source keeps wavelength constant, so the change can be attributed to slit width." },
          { part: "c", explanation: "Use a narrow slit, a steady monochromatic or nearly monochromatic source, a suitable screen distance and preferably a dim room." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In a liquid refractive-index practical using a convex lens and plane mirror, a student obtains no parallax at a different needle position after placing liquid between the lens and mirror.`,
        difficulty: 3,
        skillTags: ["liquid-refractive-index", "no-parallax", "precautions"],
        parts: [
          part("a", "What does the no-parallax position represent?", 1),
          part("b", "Why does adding the liquid change the position?", 1),
          part("c", "State two precautions for reliable observation.", 2),
        ],
        hints: [
          "No parallax identifies the focus of the optical combination.",
          "The liquid acts like an additional lens between the convex lens and mirror.",
          "Avoid air bubbles and align the needle, lens and mirror.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Connects no parallax to focal position of the combination." },
          { part: "b", points: 1, description: "Explains liquid changes optical power/focal length." },
          { part: "c", points: 2, description: "States two valid precautions." },
        ]),
        commonErrors: ["Treating no parallax as the mirror surface position.", "Ignoring liquid as an optical element.", "Allowing air bubbles or misalignment."],
        workedSolution: [
          { part: "a", explanation: "The no-parallax position gives the focus of the lens-liquid combination with the plane mirror arrangement." },
          { part: "b", explanation: "The liquid layer has refractive power, so it changes the effective focal length of the combination." },
          { part: "c", explanation: "Keep the needle, lens and mirror coaxial; avoid air bubbles; keep the lens and mirror clean; and judge no parallax by moving the eye sideways." },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.8",
    title: "Official File Completion, Projects and Inclusive Viva",
    subtopic:
      "Practical-file completeness, official evaluation expectations, suggested investigatory projects, variable control, transformer and LDR project graphs, and apparatus familiarity.",
    mc: [
      {
        questionLatex: L`Which practical-file plan satisfies the CBSE Class XII Physics record requirement most directly?`,
        difficulty: 1,
        calculatorAllowed: false,
        skillTags: ["official-practical-record", "cbse-scheme"],
        choices: [
          L`8 experiments with 4 from each section, 6 activities with 3 from each section, and one project report`,
          L`8 experiments all from Section A, 6 activities from any one section, and no project report`,
          L`6 experiments total, 8 activities total, and no section requirement`,
          L`Only the project report if the viva is strong`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The record must include work from both sections and a project report.`,
          C: L`The minimum experiment/activity counts and section split are not satisfied.`,
          D: L`A project does not replace experiment and activity records.`,
        },
        hints: [
          "The official record has experiments, activities and project.",
          "Experiments are split equally between the two sections.",
          "Activities are also split equally between the two sections.",
        ],
        solution: [
          { step: 1, explanation: L`The record requires at least 8 experiments with 4 from each section.` },
          { step: 2, explanation: L`It also requires at least 6 activities with 3 from each section and the project report.` },
        ],
      },
      {
        questionLatex: L`For visually impaired students, the practical written test described in the CBSE guidelines contains 15 practical-skill based VSA questions, out of which the student answers`,
        difficulty: 1,
        calculatorAllowed: false,
        skillTags: ["inclusive-practical-exam", "official-guidelines"],
        choices: [L`any 10`, L`all 15`, L`any 5`, L`exactly 12`],
        correctLetter: "A",
        rationales: {
          B: L`The guideline says the student answers any 10, not all 15.`,
          C: L`Five is the practical-record marks in the inclusive scheme, not the number attempted.`,
          D: L`Twelve is not the stated number of questions to be answered.`,
        },
        hints: [
          "This is an official format detail.",
          "The question paper contains more questions than the student must answer.",
          "The required attempt count is ten.",
        ],
        solution: [
          { step: 1, explanation: L`The practical written test contains 15 skill-based VSA questions.` },
          { step: 2, explanation: L`The student is required to answer any 10 of them.` },
        ],
      },
      {
        questionLatex: L`In an investigatory project on factors affecting the internal resistance of a cell, the scientifically strongest plan is to`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["investigatory-project", "variables", "cell-internal-resistance"],
        choices: [
          L`change one factor at a time and keep the other conditions fixed`,
          L`change electrode separation, electrolyte concentration and temperature together`,
          L`take only one reading because a graph is not required`,
          L`choose the conclusion before collecting observations`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Changing several factors together prevents a valid conclusion about one factor.`,
          C: L`Repeated readings and a clear observation table are needed for reliability.`,
          D: L`The conclusion must follow from the observations, not precede them.`,
        },
        hints: [
          "A project must identify variables.",
          "Only the independent variable should be deliberately changed.",
          "Other conditions should be controlled.",
        ],
        solution: [
          { step: 1, explanation: L`A valid project changes one independent variable at a time.` },
          { step: 2, explanation: L`Other factors are controlled so the observed change can be linked to that one variable.` },
        ],
      },
      {
        questionLatex: L`In a transformer project, an ideal transformer gives $V_s/V_p$ plotted against $N_s/N_p$. The expected graph is closest to`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["transformer-project", "graph-interpretation"],
        choices: [
          L`a straight line through the origin with slope about $1$`,
          L`a horizontal line because voltage ratio is independent of turns ratio`,
          L`a parabola because induced emf varies as turns squared`,
          L`a vertical line because primary voltage is fixed`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The voltage ratio changes with turns ratio.`,
          C: L`For an ideal transformer, the relation is linear, not quadratic.`,
          D: L`A fixed primary voltage does not make the ratio graph vertical.`,
        },
        hints: [
          "Use the ideal transformer relation.",
          "Voltage ratio equals turns ratio.",
          "Plot y = x.",
        ],
        solution: [
          { step: 1, explanation: L`For an ideal transformer,`, math: L`\frac{V_s}{V_p}=\frac{N_s}{N_p}` },
          { step: 2, explanation: L`So plotting $V_s/V_p$ against $N_s/N_p$ gives a straight line through the origin with slope about $1$.` },
        ],
      },
      {
        questionLatex: L`In a project on deviation through a hollow prism filled with different transparent liquids, the dependent variable should be`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["hollow-prism-project", "variables", "angle-of-deviation"],
        choices: [
          L`angle of deviation`,
          L`name of the liquid`,
          L`same prism angle`,
          L`fixed source-to-prism distance`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The liquid is the condition being changed, not the measured response.`,
          C: L`The prism angle should be a control variable.`,
          D: L`The source distance is also a control, not the measured dependent variable.`,
        },
        hints: [
          "The dependent variable is the measured response.",
          "Different liquids are introduced one by one.",
          "The project studies how deviation changes.",
        ],
        solution: [
          { step: 1, explanation: L`The liquid is changed as the independent variable.` },
          { step: 2, explanation: L`The angle of deviation is measured as the dependent variable.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "case",
        questionLatex: L`A student's Class XII Physics practical file contains $4$ Section A experiments, $3$ Section B experiments, $3$ Section A activities, $3$ Section B activities and a project report.`,
        difficulty: 2,
        skillTags: ["official-practical-record", "file-completeness"],
        parts: [
          part("a", "Is the activity-record requirement satisfied?", 1),
          part("b", "Which experiment-record requirement is not yet satisfied?", 1),
          part("c", "What should be added to make the file complete?", 1),
        ],
        hints: [
          "Check experiments and activities separately.",
          "Experiments require 4 from each section.",
          "Activities already have 3 from each section.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States activities are complete." },
          { part: "b", points: 1, description: "Identifies missing one Section B experiment." },
          { part: "c", points: 1, description: "Adds one Section B experiment record." },
        ]),
        commonErrors: ["Counting total experiments only.", "Ignoring the section split.", "Replacing an experiment with an activity."],
        workedSolution: [
          { part: "a", explanation: "Yes. The activity requirement is satisfied because there are 3 activities from each section." },
          { part: "b", explanation: "The experiment record is short of one Section B experiment; it has only 3 instead of 4." },
          { part: "c", explanation: "The student should add one more completed Section B experiment record." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A student chooses the project: studying factors on which the internal resistance of a cell depends.`,
        difficulty: 3,
        skillTags: ["cell-internal-resistance", "project-design", "variables"],
        parts: [
          part("a", "Name one independent variable that can be studied.", 1),
          part("b", "State two control variables.", 2),
          part("c", "Why are repeated readings useful in this project?", 1),
        ],
        hints: [
          "Possible factors include electrolyte concentration, electrode separation, temperature or area.",
          "Keep all non-tested factors unchanged.",
          "Repeated readings reduce random uncertainty.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Names a valid independent variable." },
          { part: "b", points: 2, description: "States two valid controls." },
          { part: "c", points: 1, description: "Explains reliability/random error reduction." },
        ]),
        commonErrors: ["Changing all factors at once.", "Not specifying measurable variables.", "Skipping repeated readings."],
        workedSolution: [
          { part: "a", explanation: "One independent variable may be electrolyte concentration." },
          { part: "b", explanation: "Controls may include electrode material, electrode area, electrode separation, temperature and the same measuring circuit." },
          { part: "c", explanation: "Repeated readings improve reliability and help identify inconsistent observations." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A transformer project records the following observations: $N_p=200$, $V_p=4.0\,\text{V}$ AC. Trial 1 uses $N_s=400$ and gives $V_s=7.8\,\text{V}$; Trial 2 uses $N_s=600$ and gives $V_s=11.7\,\text{V}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["transformer-project", "turns-ratio", "data-interpretation"],
        parts: [
          part("a", "Find the ideal secondary voltage for Trial 1.", 1),
          part("b", "Find the ideal secondary voltage for Trial 2.", 1),
          part("c", "Give one reason why observed voltages may be slightly less than ideal values.", 1),
        ],
        hints: [
          "Use Vs/Vp = Ns/Np.",
          "Trial 1 has double the turns.",
          "Real transformers have losses.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Calculates 8.0 V." },
          { part: "b", points: 1, description: "Calculates 12.0 V." },
          { part: "c", points: 1, description: "States a valid loss reason." },
        ]),
        commonErrors: ["Inverting turns ratio.", "Using DC relation for transformer action.", "Assuming observed values must be exactly ideal."],
        workedSolution: [
          { part: "a", explanation: "$V_s=V_p(N_s/N_p)=4.0(400/200)=8.0\\,\\text{V}$." },
          { part: "b", explanation: "$V_s=4.0(600/200)=12.0\\,\\text{V}$." },
          { part: "c", explanation: "Observed voltages may be slightly lower because of coil resistance, flux leakage, heating and core losses." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A hollow prism is filled one by one with water, oil and another transparent liquid to study how deviation changes.`,
        difficulty: 2,
        skillTags: ["hollow-prism-project", "experimental-controls"],
        parts: [
          part("a", "Identify the independent variable.", 1),
          part("b", "Identify the dependent variable.", 1),
          part("c", "State one control variable.", 1),
        ],
        hints: [
          "The liquid is deliberately changed.",
          "Deviation angle is measured.",
          "Keep geometry and incident direction fixed.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies liquid/refractive index as independent variable." },
          { part: "b", points: 1, description: "Identifies angle of deviation." },
          { part: "c", points: 1, description: "States a valid control variable." },
        ]),
        commonErrors: ["Calling the prism angle dependent.", "Changing incidence angle for every liquid.", "Not cleaning the prism between liquids."],
        workedSolution: [
          { part: "a", explanation: "The independent variable is the liquid used, or equivalently its refractive index." },
          { part: "b", explanation: "The dependent variable is the angle of deviation." },
          { part: "c", explanation: "Controls include the same hollow prism, same prism angle, same angle of incidence and same source arrangement." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`For an inclusive practical viva, a student is asked to identify a resistor, capacitor, inductor and diode by touch, terminals, markings and simple multimeter behaviour.`,
        difficulty: 3,
        skillTags: ["inclusive-practical-exam", "apparatus-familiarity", "component-identification"],
        parts: [
          part("a", "Which component mainly conducts in one direction?", 1),
          part("b", "Which component is usually associated with storing charge?", 1),
          part("c", "Why is apparatus familiarity included in practical assessment?", 1),
        ],
        hints: [
          "A diode has directional conduction.",
          "A capacitor stores charge between plates.",
          "Practical assessment includes identification and safe handling, not only calculation.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies diode." },
          { part: "b", points: 1, description: "Identifies capacitor." },
          { part: "c", points: 1, description: "Explains practical skill/safe handling/familiarity." },
        ]),
        commonErrors: ["Calling an inductor a one-way conductor.", "Confusing capacitor and resistor by shape only.", "Reducing practical work to formula recall."],
        workedSolution: [
          { part: "a", explanation: "A diode mainly conducts current in one direction." },
          { part: "b", explanation: "A capacitor is associated with storing charge." },
          { part: "c", explanation: "Apparatus familiarity checks whether the student can recognise, handle and use laboratory components safely and meaningfully." },
        ],
      },
    ],
  },
];

export const physics12PracticalsProjectsTopics: Topic[] = topics.map(makeTopic);
