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
const UNIT = "u4-electromagnetic-induction-alternating-currents";
const VERSION = "0.1.6";
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
  return `You chose ${choiceText}. Recheck whether the situation uses flux change, Lenz's law, inductance, reactance, resonance, power factor, generator action, or transformer ratio.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_emi_ac_reasoning"),
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_formula_without_checking_flux_phase_or_energy_direction",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "mixes_up_induced_emf_direction_ac_phase_or_transformer_ratio",
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

type ReindexKind = "mc" | ResponseType | "frq";

function itemId(topicCode: string, kind: ReindexKind, index: number) {
  return `${COURSE}.u4.t${topicSlug(topicCode)}.${kind}.${String(index + 1).padStart(3, "0")}`;
}

function reindexTopic(topic: Topic): Topic {
  const counters: Partial<Record<ReindexKind, number>> = {};
  return {
    ...topic,
    items: topic.items.map((item) => {
      if (item.kind === "mc_single") {
        const index = counters.mc ?? 0;
        counters.mc = index + 1;
        return {
          ...item,
          topic: topic.topicCode,
          contentId: itemId(topic.topicCode, "mc", index),
        };
      }

      if (item.kind === "frq") {
        const responseType: ReindexKind = item.responseType ?? "frq";
        const index = counters[responseType] ?? 0;
        counters[responseType] = index + 1;
        return {
          ...item,
          topic: topic.topicCode,
          contentId: itemId(topic.topicCode, responseType, index),
        };
      }

      return {
        ...item,
        topic: topic.topicCode,
      };
    }),
  };
}

function relocateEmiAcItems(topics: Topic[]): Topic[] {
  const byCode = new Map(
    topics.map((topic) => [
      topic.topicCode,
      { ...topic, items: [...topic.items] },
    ]),
  );

  const source = byCode.get("4.1");
  const target = byCode.get("4.2");
  const index =
    source?.items.findIndex((item) =>
      item.questionLatex.startsWith(
        "The magnetic flux through a loop directed into the page is increasing.",
      ),
    ) ?? -1;

  if (source && target && index >= 0) {
    const [item] = source.items.splice(index, 1);
    target.items.push(item);
  }

  return topics.map((topic) =>
    reindexTopic(byCode.get(topic.topicCode) ?? topic),
  );
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function rubric(
  criteria: readonly { part: string; points: number; description: string }[],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((total, item) => total + item.points, 0),
    criteria: [...criteria],
  };
}

const fluxTimeFigure: ItemFigure = {
  type: "svg",
  title: "Magnetic flux changing with time",
  description:
    "A flux-time graph with a straight rising section, a flat section, and a straight falling section.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <defs>
    <marker id="flux-axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="95" y1="275" x2="555" y2="275"/>
    <line x1="95" y1="215" x2="555" y2="215"/>
    <line x1="95" y1="155" x2="555" y2="155"/>
    <line x1="95" y1="95" x2="555" y2="95"/>
    <line x1="205" y1="285" x2="205" y2="65"/>
    <line x1="370" y1="285" x2="370" y2="65"/>
    <line x1="535" y1="285" x2="535" y2="65"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#flux-axis-arrow)">
    <line x1="95" y1="285" x2="575" y2="285"/>
    <line x1="95" y1="285" x2="95" y2="50"/>
  </g>
  <path d="M95 285 L205 95 L370 95 L535 214" stroke="#2563eb" stroke-width="4" fill="none"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">
    <text x="585" y="310">t</text>
    <text x="70" y="55">phi</text>
    <text x="205" y="310">20 ms</text>
    <text x="370" y="310">50 ms</text>
    <text x="535" y="310">80 ms</text>
    <text x="57" y="100">4 mWb</text>
    <text x="57" y="220">1.5 mWb</text>
  </g>
</svg>`,
};

const slidingRodFigure: ItemFigure = {
  type: "svg",
  title: "Conducting rod moving on rails in a magnetic field",
  description:
    "A conducting rod slides to the right on parallel rails in a uniform magnetic field directed into the page.",
  svg: `<svg viewBox="0 0 680 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="390" fill="#ffffff"/>
  <defs>
    <marker id="rod-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#16a34a"/>
    </marker>
  </defs>
  <rect x="120" y="70" width="430" height="240" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <g fill="#334155" font-family="Arial, sans-serif" font-size="22" text-anchor="middle">
    <text x="170" y="120">&#215;</text><text x="250" y="120">&#215;</text><text x="330" y="120">&#215;</text><text x="410" y="120">&#215;</text><text x="490" y="120">&#215;</text>
    <text x="170" y="190">&#215;</text><text x="250" y="190">&#215;</text><text x="330" y="190">&#215;</text><text x="410" y="190">&#215;</text><text x="490" y="190">&#215;</text>
    <text x="170" y="260">&#215;</text><text x="250" y="260">&#215;</text><text x="330" y="260">&#215;</text><text x="410" y="260">&#215;</text><text x="490" y="260">&#215;</text>
  </g>
  <line x1="150" y1="120" x2="540" y2="120" stroke="#334155" stroke-width="5"/>
  <line x1="150" y1="260" x2="540" y2="260" stroke="#334155" stroke-width="5"/>
  <line x1="420" y1="115" x2="420" y2="265" stroke="#2563eb" stroke-width="9"/>
  <line x1="450" y1="190" x2="545" y2="190" stroke="#16a34a" stroke-width="4" marker-end="url(#rod-arrow)"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="17" text-anchor="middle">
    <text x="615" y="194">v</text>
    <text x="420" y="95">rod</text>
    <text x="103" y="195">l</text>
    <text x="335" y="340">uniform B into page</text>
  </g>
</svg>`,
};

const coupledCoilsFigure: ItemFigure = {
  type: "svg",
  title: "Mutual induction between two coils",
  description:
    "Two nearby coils are drawn around a common core, with primary and secondary terminals marked.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <rect x="170" y="125" width="360" height="85" rx="10" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
  <path d="M120 120 C155 95 190 95 225 120 C260 145 295 145 330 120" stroke="#2563eb" stroke-width="5" fill="none"/>
  <path d="M370 120 C405 95 440 95 475 120 C510 145 545 145 580 120" stroke="#f97316" stroke-width="5" fill="none"/>
  <path d="M120 240 C155 215 190 215 225 240 C260 265 295 265 330 240" stroke="#2563eb" stroke-width="5" fill="none"/>
  <path d="M370 240 C405 215 440 215 475 240 C510 265 545 265 580 240" stroke="#f97316" stroke-width="5" fill="none"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="225" y="78">primary</text>
    <text x="475" y="78">secondary</text>
    <text x="350" y="182">shared magnetic flux</text>
    <text x="225" y="305">changing current</text>
    <text x="475" y="305">induced emf</text>
  </g>
</svg>`,
};

const primaryCurrentFigure: ItemFigure = {
  type: "svg",
  title: "Primary current graph for mutual induction",
  description:
    "A piecewise current-time graph for a primary coil, rising first, staying constant, then falling.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <defs>
    <marker id="current-axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="95" y1="260" x2="555" y2="260"/>
    <line x1="95" y1="200" x2="555" y2="200"/>
    <line x1="95" y1="140" x2="555" y2="140"/>
    <line x1="95" y1="80" x2="555" y2="80"/>
    <line x1="187" y1="285" x2="187" y2="60"/>
    <line x1="371" y1="285" x2="371" y2="60"/>
    <line x1="555" y1="285" x2="555" y2="60"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#current-axis-arrow)">
    <line x1="95" y1="285" x2="590" y2="285"/>
    <line x1="95" y1="285" x2="95" y2="45"/>
  </g>
  <path d="M95 285 L187 80 L371 80 L555 203" stroke="#2563eb" stroke-width="4" fill="none"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">
    <text x="585" y="310">t</text>
    <text x="65" y="55">I</text>
    <text x="187" y="310">0.10 s</text>
    <text x="371" y="310">0.30 s</text>
    <text x="555" y="310">0.50 s</text>
    <text x="65" y="85">2 A</text>
    <text x="65" y="205">0.8 A</text>
  </g>
</svg>`,
};

const acWaveFigure: ItemFigure = {
  type: "svg",
  title: "Sinusoidal alternating voltage",
  description:
    "A sinusoidal voltage-time graph with peak value V0 and one period T marked.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <defs>
    <marker id="ac-axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="90" y1="80" x2="610" y2="80"/>
    <line x1="90" y1="180" x2="610" y2="180"/>
    <line x1="90" y1="280" x2="610" y2="280"/>
    <line x1="220" y1="55" x2="220" y2="305"/>
    <line x1="350" y1="55" x2="350" y2="305"/>
    <line x1="480" y1="55" x2="480" y2="305"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#ac-axis-arrow)">
    <line x1="90" y1="180" x2="630" y2="180"/>
    <line x1="90" y1="305" x2="90" y2="45"/>
  </g>
  <path d="M90 180.0 L103 149.1 L116 121.2 L129 99.1 L142 84.9 L155 80.0 L168 84.9 L181 99.1 L194 121.2 L207 149.1 L220 180.0 L233 210.9 L246 238.8 L259 260.9 L272 275.1 L285 280.0 L298 275.1 L311 260.9 L324 238.8 L337 210.9 L350 180.0 L363 149.1 L376 121.2 L389 99.1 L402 84.9 L415 80.0 L428 84.9 L441 99.1 L454 121.2 L467 149.1 L480 180.0 L493 210.9 L506 238.8 L519 260.9 L532 275.1 L545 280.0 L558 275.1 L571 260.9 L584 238.8 L597 210.9 L610 180.0" stroke="#2563eb" stroke-width="4" fill="none"/>
  <line x1="90" y1="80" x2="220" y2="80" stroke="#f97316" stroke-width="2" stroke-dasharray="7 6"/>
  <line x1="90" y1="280" x2="220" y2="280" stroke="#f97316" stroke-width="2" stroke-dasharray="7 6"/>
  <line x1="90" y1="325" x2="350" y2="325" stroke="#16a34a" stroke-width="3"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="17" text-anchor="middle">
    <text x="640" y="204">t</text>
    <text x="70" y="50">v</text>
    <text x="58" y="85">V0</text>
    <text x="58" y="285">-V0</text>
    <text x="220" y="345">T</text>
  </g>
</svg>`,
};

const lcrCircuitFigure: ItemFigure = {
  type: "svg",
  title: "Series LCR circuit",
  description:
    "A resistor, inductor and capacitor connected in series to an AC source.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <g stroke="#334155" stroke-width="3" fill="none">
    <path d="M95 180 H145"/>
    <path d="M145 180 h18 l9 -18 l18 36 l18 -36 l18 36 l18 -36 l9 18 h18"/>
    <path d="M300 180 h18 c10 -25 32 -25 42 0 c10 25 32 25 42 0 c10 -25 32 -25 42 0 h18"/>
    <path d="M495 145 V215"/>
    <path d="M520 145 V215"/>
    <path d="M520 180 H610 V250 H95 V180"/>
  </g>
  <circle cx="95" cy="215" r="34" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <path d="M75 215 C83 195 91 195 99 215 C107 235 115 235 123 215" stroke="#2563eb" stroke-width="3" fill="none"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="210" y="135">R</text>
    <text x="383" y="135">L</text>
    <text x="507" y="135">C</text>
    <text x="95" y="278">AC source</text>
  </g>
</svg>`,
};

const resonanceCurveFigure: ItemFigure = {
  type: "svg",
  title: "Current variation near resonance",
  description:
    "A current-frequency graph for a series LCR circuit with a marked peak frequency.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <defs>
    <marker id="res-axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="100" y1="260" x2="555" y2="260"/>
    <line x1="100" y1="200" x2="555" y2="200"/>
    <line x1="100" y1="140" x2="555" y2="140"/>
    <line x1="100" y1="80" x2="555" y2="80"/>
    <line x1="250" y1="285" x2="250" y2="60"/>
    <line x1="375" y1="285" x2="375" y2="60"/>
    <line x1="500" y1="285" x2="500" y2="60"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#res-axis-arrow)">
    <line x1="100" y1="285" x2="575" y2="285"/>
    <line x1="100" y1="285" x2="100" y2="45"/>
  </g>
  <path d="M105 272 C180 255 240 202 305 85 C365 200 430 255 555 272" stroke="#2563eb" stroke-width="4" fill="none"/>
  <line x1="305" y1="285" x2="305" y2="86" stroke="#f97316" stroke-width="2.5" stroke-dasharray="8 7"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="17" text-anchor="middle">
    <text x="590" y="310">frequency</text>
    <text x="75" y="52">current</text>
    <text x="305" y="310">f0</text>
  </g>
</svg>`,
};

const transformerFigure: ItemFigure = {
  type: "svg",
  title: "Transformer with primary and secondary coils",
  description:
    "A laminated core carries a primary coil on one side and a secondary coil on the other side.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <rect x="230" y="70" width="260" height="230" rx="18" fill="#f8fafc" stroke="#64748b" stroke-width="8"/>
  <rect x="285" y="125" width="150" height="120" fill="#ffffff"/>
  <path d="M130 105 C165 80 200 80 235 105 C270 130 305 130 340 105" stroke="#2563eb" stroke-width="5" fill="none"/>
  <path d="M380 105 C415 80 450 80 485 105 C520 130 555 130 590 105" stroke="#f97316" stroke-width="5" fill="none"/>
  <path d="M130 255 C165 230 200 230 235 255 C270 280 305 280 340 255" stroke="#2563eb" stroke-width="5" fill="none"/>
  <path d="M380 255 C415 230 450 230 485 255 C520 280 555 280 590 255" stroke="#f97316" stroke-width="5" fill="none"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="235" y="45">primary</text>
    <text x="485" y="45">secondary</text>
    <text x="360" y="335">laminated iron core</text>
  </g>
</svg>`,
};

const acGeneratorFigure: ItemFigure = {
  type: "svg",
  title: "Simple AC generator",
  description:
    "A rectangular coil rotates between magnetic poles and is connected to slip rings and brushes.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <rect x="115" y="95" width="90" height="190" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="515" y="95" width="90" height="190" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <rect x="290" y="115" width="140" height="120" transform="rotate(18 360 175)" fill="#f8fafc" stroke="#0f172a" stroke-width="4"/>
  <line x1="360" y1="175" x2="360" y2="295" stroke="#0f172a" stroke-width="3"/>
  <circle cx="335" cy="300" r="18" fill="none" stroke="#f97316" stroke-width="4"/>
  <circle cx="385" cy="300" r="18" fill="none" stroke="#f97316" stroke-width="4"/>
  <line x1="302" y1="300" x2="260" y2="300" stroke="#334155" stroke-width="4"/>
  <line x1="418" y1="300" x2="460" y2="300" stroke="#334155" stroke-width="4"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="160" y="195">N</text>
    <text x="560" y="195">S</text>
    <text x="360" y="95">rotating coil</text>
    <text x="360" y="348">slip rings</text>
  </g>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Faraday's Law and Magnetic Flux",
    subtopic:
      "Magnetic flux, Faraday's law, induced emf and current, and interpreting flux-time graphs.",
    mc: [
      {
        questionLatex: L`A coil of area $2.0\times10^{-2}\text{ m}^2$ is placed in a uniform magnetic field $0.50\text{ T}$. The normal to the coil makes $60^\circ$ with the field. The magnetic flux through the coil is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["magnetic_flux", "angle_with_normal"],
        choices: [
          L`$1.0\times10^{-2}\text{ Wb}$`,
          L`$5.0\times10^{-3}\text{ Wb}$`,
          L`$1.7\times10^{-2}\text{ Wb}$`,
          L`$2.0\times10^{-2}\text{ Wb}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses $BA$ as if the field were along the area vector, but the coil normal is at $60^\\circ$ to the field.",
          C: "This uses sine instead of cosine for the angle with the normal.",
          D: "This treats magnetic field strength as if it were flux.",
        },
        hints: [
          L`Magnetic flux is $\Phi=BA\cos\theta$.`,
          L`The angle is given with the normal to the coil.`,
          L`Use $\cos60^\circ=1/2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Use the flux expression with the angle to the normal.",
            math: L`\Phi=BA\cos60^\circ=(0.50)(2.0\times10^{-2})(0.5)`,
          },
          {
            step: 2,
            explanation: "Evaluate the flux.",
            math: L`\Phi=5.0\times10^{-3}\ \mathrm{Wb}`,
          },
        ],
      },
      {
        questionLatex: L`In a $50$-turn coil, the flux linked with each turn changes from $3.0\times10^{-3}\text{ Wb}$ to $0.50\times10^{-3}\text{ Wb}$ in $0.010\text{ s}$. The average induced emf magnitude is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["faraday_law", "average_induced_emf"],
        choices: [
          L`$2.5\text{ V}$`,
          L`$5.0\text{ V}$`,
          L`$12.5\text{ V}$`,
          L`$25\text{ V}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This ignores the 50 turns and uses only the flux change per turn.",
          B: "This treats the flux change as $1.0\\times10^{-3}\\text{ Wb}$ instead of subtracting the two given flux values.",
          D: "This doubles the correct value, usually from using $5.0\\times10^{-3}\\text{ Wb}$ as the flux change.",
        },
        hints: [
          L`Use $|\mathcal E|=N|\Delta\Phi|/\Delta t$.`,
          L`The flux change per turn is $2.5\times10^{-3}\text{ Wb}$.`,
          "Multiply by the number of turns.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the flux change per turn.",
            math: L`|\Delta\Phi|=(3.0-0.50)\times10^{-3}=2.5\times10^{-3}\ \mathrm{Wb}`,
          },
          {
            step: 2,
            explanation: "Apply Faraday's law.",
            math: L`|\mathcal E|=\frac{50(2.5\times10^{-3})}{0.010}=12.5\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`The magnetic flux through a loop directed into the page is increasing. The induced current must produce a magnetic field`,
        difficulty: 2,
        skillTags: ["lenz_law", "induced_current_direction"],
        choices: [
          "out of the page",
          "into the page",
          "zero at every point in the loop",
          "parallel to the plane of the loop",
        ],
        correctLetter: "A",
        rationales: {
          B: "That would assist the increasing into-page flux instead of opposing the change.",
          C: "A changing flux induces an emf and, in a closed loop, a current.",
          D: "The induced field through the loop is normal to its plane.",
        },
        hints: [
          "Lenz's law opposes the change in flux.",
          "The existing into-page flux is increasing.",
          "The induced field must oppose that increase.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since into-page flux is increasing, the induced field is out of the page to oppose the increase.",
          },
        ],
      },
      {
        questionLatex: L`For a single-turn loop, the magnetic flux varies as $\Phi=(2.0\times10^{-3})t+1.0\times10^{-3}$ in SI units. The magnitude of induced emf is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["faraday_law", "flux_rate"],
        choices: [
          L`$1.0\times10^{-3}\text{ V}$`,
          L`$2.0\times10^{-3}\text{ V}$`,
          L`$3.0\times10^{-3}\text{ V}$`,
          L`zero, because the flux is positive`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This uses the constant part of the flux instead of its rate of change.`,
          C: L`This adds the initial flux to the rate; only $d\Phi/dt$ determines emf.`,
          D: L`A positive flux can still induce emf if it is changing with time.`,
        },
        hints: [
          L`Use $|\mathcal E|=|d\Phi/dt|$ for one turn.`,
          L`The constant term in $\Phi(t)$ does not affect the derivative.`,
          L`Differentiate the given flux with respect to time.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the flux function.",
            math: L`\frac{d\Phi}{dt}=2.0\times10^{-3}\ \mathrm{Wb\,s^{-1}}`,
          },
          {
            step: 2,
            explanation:
              "For one turn, the emf magnitude equals the flux-change rate.",
            math: L`|\mathcal E|=2.0\times10^{-3}\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`For the single-turn loop represented by the graph, the magnitude of induced emf during the first $20\text{ ms}$ is`,
        difficulty: 2,
        calculatorAllowed: true,
        figure: fluxTimeFigure,
        skillTags: ["flux_time_graph", "faraday_law"],
        choices: [
          L`$0.020\text{ V}$`,
          L`$0.050\text{ V}$`,
          L`$0.10\text{ V}$`,
          L`$0.20\text{ V}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This uses $20\\text{ ms}$ as $20\\text{ s}$, making the flux-change rate far too small.",
          B: "This reads only $1.0\\text{ mWb}$ as the flux change instead of the full rise to $4.0\\text{ mWb}$.",
          C: "This effectively halves the slope of the first straight segment of the graph.",
        },
        hints: [
          "Induced emf magnitude is the slope of the flux-time graph for one turn.",
          L`In the first interval, $\Delta\Phi=4\text{ mWb}$.`,
          L`Use $20\text{ ms}=0.020\text{ s}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Read the flux change from the graph.",
            math: L`\Delta\Phi=4.0\times10^{-3}\ \mathrm{Wb}`,
          },
          {
            step: 2,
            explanation: "Divide by the time interval.",
            math: L`|\mathcal E|=\frac{4.0\times10^{-3}}{0.020}=0.20\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: A non-zero magnetic flux through a closed loop does not by itself guarantee an induced emf. Reason: Induced emf depends on the rate of change of magnetic flux.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "faraday_law", "flux_change"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why constant non-zero flux gives no induced emf.",
          C: "Faraday's law uses rate of change of flux, so the reason is true.",
          D: "The assertion is true for a constant magnetic flux.",
        },
        hints: [
          "Check whether flux value or flux change matters.",
          L`Faraday's law has $d\Phi/dt$, not only $\Phi$.`,
          "A constant non-zero flux has zero rate of change.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Faraday's law is about changing flux.",
            math: L`\mathcal E=-N\frac{d\Phi}{dt}`,
          },
          {
            step: 2,
            explanation:
              "Both statements are true and the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $40$-turn coil of area $3.0\times10^{-3}\text{ m}^2$ is kept with its plane perpendicular to a magnetic field. The field changes uniformly from $0.20\text{ T}$ to $0.50\text{ T}$ in $0.10\text{ s}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["faraday_law", "average_induced_emf"],
        parts: [part("a", "Find the average induced emf magnitude.", 2)],
        hints: [
          "Plane perpendicular to field means the coil normal is along the field.",
          L`Use $|\mathcal E|=NA|\Delta B|/\Delta t$.`,
          "Use SI units throughout.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses the correct flux-change relation.",
          },
          {
            part: "a",
            points: 1,
            description: "Substitutes values and obtains the emf.",
          },
        ]),
        commonErrors: [
          "Using the initial field instead of the change in field.",
          "Forgetting the number of turns.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The flux through each turn changes by A times the field change.",
            math: L`|\mathcal E|=\frac{NA|\Delta B|}{\Delta t}=\frac{40(3.0\times10^{-3})(0.30)}{0.10}=0.36\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $20$-turn coil has its flux per turn decreased uniformly from $6.0\times10^{-3}\text{ Wb}$ to $2.0\times10^{-3}\text{ Wb}$ in $0.040\text{ s}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["faraday_law", "lenz_law"],
        parts: [
          part("a", "Find the average induced emf magnitude.", 2),
          part(
            "b",
            "State what the direction of induced current must oppose.",
            1,
          ),
        ],
        hints: [
          L`Use $|\mathcal E|=N|\Delta\Phi|/\Delta t$.`,
          "The flux is decreasing, not increasing.",
          "Use Lenz's law for the direction statement.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes the average emf correctly.",
          },
          {
            part: "b",
            points: 1,
            description:
              "States that the induced current opposes the decrease in flux.",
          },
        ]),
        commonErrors: [
          "Using only one turn instead of 20 turns.",
          "Saying the induced current opposes the magnetic field itself in all cases.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The flux change per turn is:",
            math: L`|\Delta\Phi|=4.0\times10^{-3}\ \mathrm{Wb}`,
          },
          {
            part: "a",
            explanation: "Apply Faraday's law.",
            math: L`|\mathcal E|=\frac{20(4.0\times10^{-3})}{0.040}=2.0\ \mathrm V`,
          },
          {
            part: "b",
            explanation:
              "The induced current must produce a field that opposes the decrease of magnetic flux through the coil.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $100$-turn coil of area $2.0\times10^{-2}\text{ m}^2$ is in a uniform field $0.10\text{ T}$. Its normal is initially parallel to the field and becomes perpendicular to the field in $0.020\text{ s}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["flux_change_due_to_rotation", "faraday_law"],
        parts: [
          part("a", "Find the initial flux linkage.", 2),
          part(
            "b",
            "Find the average induced emf magnitude during the turn.",
            2,
          ),
        ],
        hints: [
          L`Flux linkage is $N\Phi=NBA\cos\theta$.`,
          "Final flux is zero when the normal is perpendicular to the field.",
          "Average emf is change in flux linkage divided by time.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds initial flux linkage correctly.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses flux linkage change to find emf.",
          },
        ]),
        commonErrors: [
          "Using coil area as if it were flux.",
          "Forgetting that the final flux is zero in the given orientation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Initially the normal is parallel to the field.",
            math: L`N\Phi_i=NBA=(100)(0.10)(2.0\times10^{-2})=0.20\ \mathrm{Wb}`,
          },
          {
            part: "b",
            explanation: "The final flux linkage is zero.",
            math: L`|\mathcal E|=\frac{0.20}{0.020}=10\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Explain Faraday's law of electromagnetic induction and the meaning of the negative sign in $\mathcal E=-N\,d\Phi/dt$. Then apply it to a coil for which flux is constant for some interval.`,
        difficulty: 3,
        skillTags: ["faraday_law", "lenz_law", "conceptual_reasoning"],
        parts: [
          part("a", "State Faraday's law in words and equation form.", 2),
          part("b", "Explain the negative sign.", 2),
          part("c", "State the induced emf when flux is constant.", 1),
        ],
        hints: [
          "Faraday's law connects emf with rate of flux change.",
          "The negative sign is not a calculation decoration; it is Lenz's law.",
          "Constant flux means zero derivative.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "States induced emf is proportional to rate of change of flux linkage.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Connects the negative sign to opposition to change in flux.",
          },
          {
            part: "c",
            points: 1,
            description: "States zero induced emf for constant flux.",
          },
        ]),
        commonErrors: [
          "Saying emf depends only on the amount of flux.",
          "Explaining the negative sign as merely meaning a negative numerical answer.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Faraday's law states that the induced emf in a circuit equals the negative rate of change of magnetic flux linkage.",
            math: L`\mathcal E=-N\frac{d\Phi}{dt}`,
          },
          {
            part: "b",
            explanation:
              "The negative sign represents Lenz's law: the induced current is in such a direction that its magnetic effect opposes the change producing it.",
          },
          {
            part: "c",
            explanation: "For constant flux, the rate of change is zero.",
            math: L`\frac{d\Phi}{dt}=0\Rightarrow \mathcal E=0`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A search coil is connected to a meter and moved through a non-uniform magnetic field. The graph shows the flux through one turn of the coil at different times. The coil has $25$ turns.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: fluxTimeFigure,
        skillTags: ["case_based", "flux_time_graph", "faraday_law"],
        parts: [
          part("a", "Find the emf magnitude from 0 to 20 ms.", 2),
          part("b", "State the emf from 20 ms to 50 ms.", 1),
          part(
            "c",
            "Compare the sign of emf in the first and last sloping intervals.",
            2,
          ),
        ],
        hints: [
          "Graph slope gives rate of flux change.",
          "A flat graph section has zero slope.",
          "Opposite slopes give opposite signs of induced emf.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses the graph slope and 25 turns.",
          },
          {
            part: "b",
            points: 1,
            description: "Identifies zero emf on the flat section.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Recognises opposite signs for rising and falling flux.",
          },
        ]),
        commonErrors: [
          "Using flux value instead of graph slope.",
          "Forgetting the number of turns.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For the first interval:",
            math: L`|\mathcal E|=N\frac{|\Delta\Phi|}{\Delta t}=25\frac{4.0\times10^{-3}}{0.020}=5.0\ \mathrm V`,
          },
          {
            part: "b",
            explanation:
              "From 20 ms to 50 ms, flux is constant, so emf is zero.",
          },
          {
            part: "c",
            explanation:
              "The first interval has positive flux slope while the last sloping interval has negative flux slope, so the induced emf signs are opposite.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Lenz's Law, Motional Emf, and Eddy Currents",
    subtopic:
      "Direction of induced current, motional emf in conductors, energy opposition, and eddy-current effects.",
    mc: [
      {
        questionLatex: L`A conducting rod of length $0.40\text{ m}$ moves at $5.0\text{ m s}^{-1}$ perpendicular to a uniform magnetic field $0.25\text{ T}$. The motional emf is`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: slidingRodFigure,
        skillTags: ["motional_emf", "moving_conductor"],
        choices: [
          L`$0.20\text{ V}$`,
          L`$0.40\text{ V}$`,
          L`$0.50\text{ V}$`,
          L`$5.0\text{ V}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This misses the speed factor in $Blv$ and uses only the magnetic field and rod length.",
          B: "This uses only length and speed or drops the field factor.",
          D: "This is ten times too large from a decimal-place slip.",
        },
        hints: [
          L`Use $\mathcal E=Blv$ for perpendicular motion.`,
          "All quantities are already in SI units.",
          "Multiply B, l, and v.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use motional emf for a rod cutting field lines.",
            math: L`\mathcal E=Blv=(0.25)(0.40)(5.0)=0.50\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`A conducting loop is pulled out of a region where the magnetic field is into the page. As the loop leaves the field, the induced current is such that its magnetic field is`,
        difficulty: 3,
        skillTags: ["lenz_law", "loop_leaving_field"],
        choices: [
          "into the page",
          "out of the page",
          "zero because the original field is uniform",
          "along the direction of motion of the loop",
        ],
        correctLetter: "A",
        rationales: {
          B: "Out-of-page induced field would oppose an increasing into-page flux, not a decreasing one.",
          C: "Flux changes because the area still inside the field changes.",
          D: "The induced field through the loop is normal to the loop, not along its motion.",
        },
        hints: [
          "The loop is losing into-page flux.",
          "The induced effect opposes that loss.",
          "So the induced field tries to keep into-page flux from decreasing.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "As the loop is pulled out, into-page flux decreases. The induced field is into the page to oppose the decrease.",
          },
        ],
      },
      {
        questionLatex: L`Eddy-current loss in transformer cores is reduced mainly by using`,
        difficulty: 2,
        skillTags: ["eddy_currents", "transformer_core"],
        choices: [
          "a solid copper core",
          "a single thick iron block",
          "a plastic core only",
          "thin insulated laminations of soft iron",
        ],
        correctLetter: "D",
        rationales: {
          A: "Copper would allow large circulating eddy currents.",
          B: "A thick conducting block gives low-resistance paths for eddy currents.",
          C: "Plastic does not provide the magnetic core needed for a transformer.",
        },
        hints: [
          "Eddy currents are circulating currents in bulk conductors.",
          "Reducing loop area and increasing path resistance reduces them.",
          "Transformer cores are laminated.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Thin insulated laminations break up large eddy-current loops and reduce heating losses.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, the rod moves to the right and the magnetic field is into the page. For positive charges in the rod, the magnetic force is toward`,
        difficulty: 3,
        figure: slidingRodFigure,
        skillTags: ["motional_emf_direction", "right_hand_rule"],
        choices: [
          "the lower end",
          "the upper end",
          "the left rail",
          "the right rail",
        ],
        correctLetter: "B",
        rationales: {
          A: "That would be the force direction for negative charges.",
          C: "The magnetic force is along the rod, not backward along the rail.",
          D: "The velocity is to the right, but the magnetic force is perpendicular to velocity.",
        },
        hints: [
          L`Use $\vec F=q(\vec v\times\vec B)$ for positive charges.`,
          "Right is positive x and into the page is negative z.",
          "The cross product points upward.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For positive charges:",
            math: L`\vec v\times\vec B=\hat i\times(-\hat k)=+\hat j`,
          },
          {
            step: 2,
            explanation: "The upper end becomes positive.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: The direction of induced current given by Lenz's law is consistent with conservation of energy. Reason: The induced current opposes the change in magnetic flux that produces it.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "lenz_law", "energy_conservation"],
        choices: [
          "Assertion is true, but Reason is false.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason is the statement of Lenz's law and is true.",
          B: "The opposition to flux change is exactly what prevents energy from being created without work.",
          D: "The assertion is true because Lenz's law requires external work in induction situations.",
        },
        hints: [
          "Imagine a magnet approaching a coil.",
          "The induced current resists the approach, so work must be done.",
          "That work becomes electrical/thermal energy.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true. The opposition to the flux change ensures external work is needed, consistent with conservation of energy.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An aircraft with wingspan $30\text{ m}$ flies horizontally at $250\text{ m s}^{-1}$ through a vertical component of Earth's magnetic field $4.0\times10^{-5}\text{ T}$. Estimate the emf between its wingtips.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["motional_emf", "application"],
        parts: [part("a", "Find the motional emf.", 2)],
        hints: [
          "Treat the wings as a conductor cutting magnetic field lines.",
          L`Use $\mathcal E=Blv$.`,
          "The magnetic field component perpendicular to the motion is already given.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses motional emf expression.",
          },
          { part: "a", points: 1, description: "Computes the emf correctly." },
        ]),
        commonErrors: [
          "Using the full Earth field without considering the perpendicular component.",
          "Forgetting the wingspan as the conductor length.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use motional emf.",
            math: L`\mathcal E=Blv=(4.0\times10^{-5})(30)(250)=0.30\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A conducting rod of length $0.50\text{ m}$ slides on rails in a field $0.40\text{ T}$ into the page with speed $3.0\text{ m s}^{-1}$. The total circuit resistance is $2.0\ \Omega$.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: slidingRodFigure,
        skillTags: ["motional_emf", "induced_current", "magnetic_drag"],
        parts: [
          part("a", "Find the induced emf.", 1),
          part("b", "Find the induced current.", 1),
          part("c", "Find the magnetic force opposing the motion.", 2),
        ],
        hints: [
          L`Use $\mathcal E=Blv$.`,
          L`Then use $I=\mathcal E/R$.`,
          L`The magnetic drag magnitude on the rod is $BIl$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds motional emf." },
          { part: "b", points: 1, description: "Finds induced current." },
          {
            part: "c",
            points: 2,
            description: "Finds magnetic force and notes it opposes motion.",
          },
        ]),
        commonErrors: [
          "Using resistance in the emf formula.",
          "Putting the magnetic force in the direction of motion instead of opposing it.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The motional emf is:",
            math: L`\mathcal E=Blv=(0.40)(0.50)(3.0)=0.60\ \mathrm V`,
          },
          {
            part: "b",
            explanation: "Use Ohm's law for the closed circuit.",
            math: L`I=\frac{0.60}{2.0}=0.30\ \mathrm A`,
          },
          {
            part: "c",
            explanation: "The magnetic force magnitude is:",
            math: L`F=BIl=(0.40)(0.30)(0.50)=0.060\ \mathrm N`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A metal disc rotates between the poles of a strong magnet and becomes warm. A transformer core is made from thin insulated sheets instead of one solid block.`,
        difficulty: 3,
        skillTags: ["eddy_currents", "applications_and_losses"],
        parts: [
          part(
            "a",
            "Name the currents responsible for heating of the disc.",
            1,
          ),
          part(
            "b",
            "Explain why laminating the transformer core reduces heating.",
            2,
          ),
        ],
        hints: [
          "Changing flux through conducting paths induces circulating currents.",
          "Those currents dissipate heat in resistance.",
          "Laminations break large conducting loops.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Names eddy currents." },
          {
            part: "b",
            points: 2,
            description:
              "Explains increased resistance and reduced loop area for eddy currents.",
          },
        ]),
        commonErrors: [
          "Calling the heating electrostatic charging.",
          "Saying laminations increase eddy currents.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The heating is due to eddy currents induced in the conducting disc.",
          },
          {
            part: "b",
            explanation:
              "Thin insulated laminations interrupt large circular current paths and increase their effective resistance, so eddy-current heating is reduced.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A bar magnet is pushed toward a conducting coil connected to a galvanometer. Explain the direction of induced current using Lenz's law and why work must be done to push the magnet.`,
        difficulty: 3,
        skillTags: ["lenz_law", "energy_conservation", "conceptual_reasoning"],
        parts: [
          part("a", "State Lenz's law.", 1),
          part(
            "b",
            "Explain how the coil responds to the approaching magnet.",
            2,
          ),
          part("c", "Explain the energy conversion involved.", 2),
        ],
        hints: [
          "The induced current opposes the change producing it.",
          "An approaching pole increases magnetic flux through the coil.",
          "Opposition implies an external agent must do work.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States Lenz's law correctly." },
          {
            part: "b",
            points: 2,
            description: "Explains induced polarity/current opposes approach.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Connects external work to electrical energy and heat.",
          },
        ]),
        commonErrors: [
          "Saying the induced current helps the magnet move in.",
          "Ignoring energy conservation and treating induced current as free energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Lenz's law states that induced current is directed so that its magnetic effect opposes the change in flux producing it.",
          },
          {
            part: "b",
            explanation:
              "As the magnet approaches, flux through the coil increases. The coil develops a current whose magnetic field opposes that increase, so the face near the magnet acts to oppose the approaching pole.",
          },
          {
            part: "c",
            explanation:
              "Because of this opposition, an external force must do work. That work appears as electrical energy in the circuit and eventually as thermal energy in its resistance.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`An aluminium plate swings between the poles of a magnet and slows down rapidly. When slots are cut in the plate, the damping becomes much weaker.`,
        difficulty: 3,
        skillTags: ["case_based", "eddy_current_braking", "lenz_law"],
        parts: [
          part("a", "Name the phenomenon responsible for the damping.", 1),
          part("b", "State why the induced effect opposes the motion.", 2),
          part("c", "Explain why slots reduce the damping.", 2),
        ],
        hints: [
          "A moving conductor in a magnetic field has changing flux through conducting loops.",
          "Use Lenz's law for the force direction.",
          "Slots interrupt circulating paths.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies eddy-current damping.",
          },
          {
            part: "b",
            points: 2,
            description: "Applies Lenz's law to oppose motion.",
          },
          {
            part: "c",
            points: 2,
            description: "Explains reduced eddy-current paths due to slots.",
          },
        ]),
        commonErrors: [
          "Saying the magnet simply attracts aluminium strongly like iron.",
          "Ignoring the need for closed conducting paths.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The damping is due to eddy currents.",
          },
          {
            part: "b",
            explanation:
              "The motion changes magnetic flux through conducting paths in the plate. The induced currents produce magnetic effects opposing the change, so the magnetic force opposes the motion.",
          },
          {
            part: "c",
            explanation:
              "Slots break up large closed paths for eddy currents, reducing their magnitude and hence reducing the damping force.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Self and Mutual Induction",
    subtopic:
      "Self-induced emf, mutual induction, flux linkage, inductance, and energy stored in an inductor.",
    mc: [
      {
        questionLatex: L`An inductor of self-inductance $0.20\text{ H}$ carries a current changing at $5.0\text{ A s}^{-1}$. The magnitude of self-induced emf is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["self_induction", "induced_emf"],
        choices: [
          L`$0.040\text{ V}$`,
          L`$0.20\text{ V}$`,
          L`$5.0\text{ V}$`,
          L`$1.0\text{ V}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This divides the rate by the inductance instead of multiplying.",
          B: "This uses only the inductance and ignores current-change rate.",
          C: "This uses only the rate of current change and forgets to multiply by the inductance.",
        },
        hints: [
          L`For self-induction, $|\mathcal E|=L|dI/dt|$.`,
          "Multiply inductance by rate of change of current.",
          "The sign only gives opposition direction.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the self-induced emf magnitude.",
            math: L`|\mathcal E|=L\left|\frac{dI}{dt}\right|=(0.20)(5.0)=1.0\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`The current in a coil changes uniformly from $2.0\text{ A}$ to $8.0\text{ A}$ in $0.030\text{ s}$. If the induced emf magnitude is $20\text{ V}$, the self-inductance is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["self_induction", "inductance_from_data"],
        choices: [
          L`$0.050\text{ H}$`,
          L`$0.10\text{ H}$`,
          L`$1.0\text{ H}$`,
          L`$10\text{ H}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This doubles the current change, so the calculated inductance becomes half the correct value.",
          C: "This misses a factor of 10 in the time interval.",
          D: "This is a two-power error from using milliseconds incorrectly.",
        },
        hints: [
          L`Use $|\mathcal E|=L|\Delta I|/\Delta t$.`,
          L`Here $\Delta I=6.0\text{ A}$.`,
          "Solve for L.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rearrange the self-induced emf formula.",
            math: L`L=\frac{|\mathcal E|\Delta t}{|\Delta I|}=\frac{(20)(0.030)}{6.0}=0.10\ \mathrm H`,
          },
        ],
      },
      {
        questionLatex: L`Two coils have mutual inductance $0.040\text{ H}$. The current in the primary changes from $5.0\text{ A}$ to $1.0\text{ A}$ in $0.020\text{ s}$. The emf induced in the secondary has magnitude`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: coupledCoilsFigure,
        skillTags: ["mutual_induction", "induced_emf"],
        choices: [
          L`$8.0\text{ V}$`,
          L`$4.0\text{ V}$`,
          L`$0.80\text{ V}$`,
          L`$0.20\text{ V}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses only half the current change, so the induced emf is also halved.",
          C: "This loses a factor of 10 in the current-change rate.",
          D: "This multiplies mutual inductance by current change but not by rate.",
        },
        hints: [
          L`Use $|\mathcal E_2|=M|\Delta I_1|/\Delta t$.`,
          L`The primary current change has magnitude $4.0\text{ A}$.`,
          "Use the rate of change, not just the change.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use mutual induction.",
            math: L`|\mathcal E_2|=M\frac{|\Delta I_1|}{\Delta t}=0.040\frac{4.0}{0.020}=8.0\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`The energy stored in an inductor of inductance $0.50\text{ H}$ carrying current $2.0\text{ A}$ is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["energy_in_inductor", "self_induction"],
        choices: [
          L`$0.50\text{ J}$`,
          L`$2.0\text{ J}$`,
          L`$1.0\text{ J}$`,
          L`$4.0\text{ J}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses $LI/2$ instead of $LI^2/2$, so the current is not squared.",
          B: "This misses the factor of one-half in the stored-energy expression.",
          D: "This uses I squared but misses both L and the half factor.",
        },
        hints: [
          L`Use $U=\frac12LI^2$.`,
          "Current is squared.",
          "Do not use emf in this energy expression.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute in the inductor energy expression.",
            math: L`U=\frac12(0.50)(2.0)^2=1.0\ \mathrm J`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: After a steady direct current has become constant in an ideal inductor, the self-induced emf is zero. Reason: Self-induced emf is proportional to the rate of change of current.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "self_induction"],
        choices: [
          "Assertion is true, but Reason is false.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is false, but Reason is true.",
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The reason is true because self-induced emf depends on dI/dt.",
          B: "The reason directly explains zero emf for constant current.",
          C: "The assertion is true after current has become steady.",
        },
        hints: [
          L`Self-induced emf contains $dI/dt$.`,
          "A steady current has no current-change rate.",
          "Zero rate of change means zero self-induced emf.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For a steady current:",
            math: L`\frac{dI}{dt}=0\Rightarrow \mathcal E_L=-L\frac{dI}{dt}=0`,
          },
          {
            step: 2,
            explanation:
              "Both statements are true and the reason correctly explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`The current in a $0.60\text{ H}$ inductor falls uniformly from $3.0\text{ A}$ to zero in $0.15\text{ s}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["self_induction", "induced_emf"],
        parts: [part("a", "Find the magnitude of induced emf.", 2)],
        hints: [
          L`Use $|\mathcal E|=L|\Delta I|/\Delta t$.`,
          "The current change has magnitude 3.0 A.",
          "The sign would show opposition to the fall.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses self-induced emf formula.",
          },
          {
            part: "a",
            points: 1,
            description: "Computes induced emf correctly.",
          },
        ]),
        commonErrors: [
          "Using final current zero as if it makes emf zero.",
          "Ignoring the time interval.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The magnitude is:",
            math: L`|\mathcal E|=0.60\frac{3.0}{0.15}=12\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two nearby coils have mutual inductance $0.080\text{ H}$. The primary current increases uniformly from zero to $4.0\text{ A}$ in $0.20\text{ s}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: coupledCoilsFigure,
        skillTags: ["mutual_induction", "emf_from_current_change"],
        parts: [
          part("a", "Find the emf induced in the secondary.", 2),
          part("b", "State one way to increase mutual inductance.", 1),
        ],
        hints: [
          L`Use $|\mathcal E_2|=M|\Delta I_1|/\Delta t$.`,
          "Mutual inductance depends on coupling between coils.",
          "A common soft iron core increases flux linkage.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds induced secondary emf." },
          {
            part: "b",
            points: 1,
            description:
              "States a valid method such as adding an iron core or closer coupling.",
          },
        ]),
        commonErrors: [
          "Using self-inductance notation without identifying the other coil.",
          "Saying mutual inductance increases when coils are moved far apart.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The current-change rate is:",
            math: L`\frac{\Delta I_1}{\Delta t}=\frac{4.0}{0.20}=20\ \mathrm{A\,s^{-1}}`,
          },
          {
            part: "a",
            explanation: "Use mutual induction.",
            math: L`|\mathcal E_2|=M\frac{\Delta I_1}{\Delta t}=(0.080)(20)=1.6\ \mathrm V`,
          },
          {
            part: "b",
            explanation:
              "Mutual inductance can be increased by using a common soft iron core or by placing the coils closer with better flux linkage.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An inductor of inductance $0.25\text{ H}$ carries a current $4.0\text{ A}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["energy_in_inductor", "self_induction"],
        parts: [
          part("a", "Find the magnetic energy stored.", 2),
          part("b", "What is the energy if the current is doubled?", 1),
        ],
        hints: [
          L`Use $U=\frac12LI^2$.`,
          "Energy depends on square of current.",
          "Doubling current makes the energy four times.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds stored magnetic energy.",
          },
          {
            part: "b",
            points: 1,
            description: "Uses square dependence on current.",
          },
        ]),
        commonErrors: [
          "Using U = LI instead of one-half LI squared.",
          "Doubling the energy instead of quadrupling it.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use magnetic energy stored in an inductor.",
            math: L`U=\frac12(0.25)(4.0)^2=2.0\ \mathrm J`,
          },
          {
            part: "b",
            explanation: "If current doubles, energy becomes four times.",
            math: L`U'=8.0\ \mathrm J`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Define self-induction and mutual induction. State their SI unit and explain why inserting a soft iron core generally increases inductance.`,
        difficulty: 3,
        skillTags: [
          "self_induction",
          "mutual_induction",
          "conceptual_comparison",
        ],
        parts: [
          part("a", "Define self-induction.", 2),
          part("b", "Define mutual induction.", 2),
          part(
            "c",
            "State the SI unit and explain the effect of a soft iron core.",
            2,
          ),
        ],
        hints: [
          "Self-induction involves a coil's own changing current.",
          "Mutual induction involves another nearby coil.",
          "A soft iron core increases magnetic flux linkage.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Defines self-induced emf due to change of current in the same circuit.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Defines induced emf in one coil due to changing current in another.",
          },
          {
            part: "c",
            points: 2,
            description:
              "States henry and explains increased flux linkage with core.",
          },
        ]),
        commonErrors: [
          "Calling every induction effect mutual induction.",
          "Saying iron core increases resistance rather than magnetic flux linkage.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Self-induction is the production of emf in a circuit due to change of current in the same circuit.",
          },
          {
            part: "b",
            explanation:
              "Mutual induction is the production of emf in one coil due to change of current in a nearby coil.",
          },
          {
            part: "c",
            explanation:
              "The SI unit of inductance is henry. A soft iron core increases magnetic flux linkage for the same current, so inductance increases.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The graph shows current in the primary coil of a pair of coils. The mutual inductance is $0.050\text{ H}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: primaryCurrentFigure,
        skillTags: ["case_based", "mutual_induction", "current_time_graph"],
        parts: [
          part("a", "Find the induced emf magnitude from 0 to 0.10 s.", 2),
          part("b", "Find the induced emf from 0.10 s to 0.30 s.", 1),
          part(
            "c",
            "Compare the signs of emf in the first and last sloping intervals.",
            2,
          ),
        ],
        hints: [
          "Mutual induction depends on slope of primary current graph.",
          "A flat current graph gives zero induced emf.",
          "Opposite current slopes give opposite emf signs.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Uses current slope and M." },
          {
            part: "b",
            points: 1,
            description: "Identifies zero emf for constant current.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Recognises opposite signs for rising and falling current.",
          },
        ]),
        commonErrors: [
          "Using current value instead of rate of change of current.",
          "Forgetting that sign reverses when slope reverses.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "From 0 to 0.10 s, current rises from 0 to 2 A.",
            math: L`|\mathcal E_2|=M\frac{\Delta I_1}{\Delta t}=0.050\frac{2.0}{0.10}=1.0\ \mathrm V`,
          },
          {
            part: "b",
            explanation:
              "From 0.10 s to 0.30 s, current is constant, so induced emf is zero.",
          },
          {
            part: "c",
            explanation:
              "The first sloping interval has positive current slope, while the final sloping interval has negative current slope, so the induced emf signs are opposite.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Alternating Current, Reactance, and Impedance",
    subtopic:
      "Peak and RMS values, frequency, capacitive and inductive reactance, impedance and phase in AC circuits.",
    mc: [
      {
        questionLatex: L`An alternating voltage is $v=200\sin(100\pi t)$ volt. Its rms value is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: acWaveFigure,
        skillTags: ["ac_rms_value", "sinusoidal_voltage"],
        choices: [
          L`$141\text{ V}$`,
          L`$200\text{ V}$`,
          L`$100\text{ V}$`,
          L`$314\text{ V}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the peak value $V_0$, but an rms value for a sine wave is smaller by a factor $\\sqrt2$.",
          C: "This divides by 2 instead of square root of 2.",
          D: "This confuses angular frequency with voltage.",
        },
        hints: [
          "Read the coefficient of sine as the peak voltage.",
          L`For a sinusoid, $V_{\mathrm{rms}}=V_0/\sqrt2$.`,
          L`Use $200/\sqrt2\approx141$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The peak voltage is 200 V.",
            math: L`V_{\mathrm{rms}}=\frac{V_0}{\sqrt2}=\frac{200}{\sqrt2}\approx141\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`A capacitor of capacitance $100\,\mu\text{F}$ is connected to a $50\text{ Hz}$ AC source. Its capacitive reactance is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["capacitive_reactance", "ac_circuit"],
        choices: [
          L`$0.032\ \Omega$`,
          L`$3.2\ \Omega$`,
          L`$318\ \Omega$`,
          L`$31.8\ \Omega$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This uses $100\\,\\mu\\text{F}$ as $100\\text{ F}$ instead of $1.0\\times10^{-4}\\text{ F}$.",
          B: "This is a factor of 10 too small, usually from a power-of-ten slip in capacitance.",
          C: "This is a factor of 10 too large, usually from shifting the microfarad conversion the wrong way.",
        },
        hints: [
          L`Use $X_C=1/(2\pi fC)$.`,
          L`$100\,\mu\text{F}=1.0\times10^{-4}\text{ F}$.`,
          "Keep frequency in hertz.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute in capacitive reactance.",
            math: L`X_C=\frac{1}{2\pi(50)(1.0\times10^{-4})}\approx31.8\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`An inductor of inductance $0.20\text{ H}$ is connected to a $50\text{ Hz}$ AC source. The inductive reactance is approximately`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["inductive_reactance", "ac_circuit"],
        choices: [
          L`$6.3\ \Omega$`,
          L`$62.8\ \Omega$`,
          L`$15.9\ \Omega$`,
          L`$0.063\ \Omega$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This is ten times too small, so one power of 10 has been lost in $2\\pi fL$.",
          C: "This uses the capacitive-reactance pattern instead of $X_L=2\\pi fL$.",
          D: "This treats hertz or henry with the wrong power.",
        },
        hints: [
          L`Use $X_L=2\pi fL$.`,
          "Reactance of an inductor increases with frequency.",
          "Substitute f = 50 Hz and L = 0.20 H.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate inductive reactance.",
            math: L`X_L=2\pi(50)(0.20)\approx62.8\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`A series circuit has $R=30\ \Omega$ and net reactance $40\ \Omega$. If it is connected to a $100\text{ V}$ rms AC source, the rms current is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["impedance", "rms_current", "series_ac_circuit"],
        choices: [
          L`$1.0\text{ A}$`,
          L`$1.5\text{ A}$`,
          L`$2.0\text{ A}$`,
          L`$3.3\text{ A}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This adds R and reactance arithmetically to get 100 ohm.",
          B: "This comes from an incorrect impedance rather than the vector sum $\\sqrt{R^2+X^2}$.",
          D: "This ignores reactance and uses only $R$, which is valid only for a purely resistive circuit.",
        },
        hints: [
          L`Use $Z=\sqrt{R^2+X^2}$.`,
          "Here R and net reactance form a 3-4-5 triangle.",
          L`Then use $I_{\mathrm{rms}}=V_{\mathrm{rms}}/Z$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find impedance.",
            math: L`Z=\sqrt{30^2+40^2}=50\ \Omega`,
          },
          {
            step: 2,
            explanation: "Find current.",
            math: L`I_{\mathrm{rms}}=\frac{100}{50}=2.0\ \mathrm A`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: In a purely capacitive AC circuit, current leads voltage by $90^\circ$. Reason: Capacitive reactance decreases when frequency is increased.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "capacitor_ac_phase", "reactance"],
        choices: [
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is true but it explains frequency dependence of reactance, not the 90-degree phase relation.",
          C: "The reason is also true for a capacitor because $X_C$ is inversely proportional to frequency.",
          D: "The assertion is true for a pure capacitor; current leads voltage by $90^\\circ$.",
        },
        hints: [
          "Check the truth of each statement separately.",
          "Phase relation and frequency dependence are different ideas.",
          L`For a capacitor, $X_C=1/(2\pi fC)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true. However, decreasing reactance with frequency does not explain the exact 90-degree lead of current over voltage.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An alternating current is $i=5.0\sin(314t)$ ampere.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["ac_rms_value", "frequency_from_omega"],
        parts: [
          part("a", "Find the rms current.", 1),
          part("b", "Find the frequency.", 1),
        ],
        hints: [
          "The coefficient of sine is the peak current.",
          L`Use $I_{\mathrm{rms}}=I_0/\sqrt2$.`,
          L`Angular frequency $\omega=2\pi f$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds rms current." },
          { part: "b", points: 1, description: "Finds frequency." },
        ]),
        commonErrors: [
          "Taking the peak current as rms current.",
          "Confusing angular frequency with frequency.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The peak current is 5.0 A.",
            math: L`I_{\mathrm{rms}}=\frac{5.0}{\sqrt2}=3.54\ \mathrm A`,
          },
          {
            part: "b",
            explanation: "Use omega = 2 pi f.",
            math: L`f=\frac{314}{2\pi}\approx50\ \mathrm{Hz}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A series AC circuit has $R=60\ \Omega$ and inductive reactance $X_L=80\ \Omega$. It is connected to a $200\text{ V}$ rms source.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["impedance", "inductive_circuit", "phase_lag"],
        parts: [
          part("a", "Find the impedance.", 1),
          part("b", "Find the rms current.", 1),
          part("c", "State whether current leads or lags voltage.", 1),
        ],
        hints: [
          L`Use $Z=\sqrt{R^2+X_L^2}$.`,
          L`Use $I=V/Z$.`,
          "In an inductive circuit, current lags voltage.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds impedance." },
          { part: "b", points: 1, description: "Finds current." },
          { part: "c", points: 1, description: "States current lags voltage." },
        ]),
        commonErrors: [
          "Adding R and XL directly.",
          "Saying current leads in an inductive circuit.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Find the impedance.",
            math: L`Z=\sqrt{60^2+80^2}=100\ \Omega`,
          },
          {
            part: "b",
            explanation: "Use rms Ohm's law for AC.",
            math: L`I_{\mathrm{rms}}=\frac{200}{100}=2.0\ \mathrm A`,
          },
          {
            part: "c",
            explanation:
              "Because the circuit is inductive, current lags voltage.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $50\,\mu\text{F}$ capacitor is connected to a $220\text{ V}$, $50\text{ Hz}$ AC source.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["capacitive_reactance", "capacitor_ac_current"],
        parts: [
          part("a", "Find the capacitive reactance.", 2),
          part("b", "Find the rms current.", 1),
          part(
            "c",
            "State what happens to current if frequency is doubled, voltage unchanged.",
            1,
          ),
        ],
        hints: [
          L`Use $X_C=1/(2\pi fC)$.`,
          L`Use $I_{\mathrm{rms}}=V_{\mathrm{rms}}/X_C$.`,
          "Capacitive reactance is inversely proportional to frequency.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds capacitive reactance." },
          { part: "b", points: 1, description: "Finds rms current." },
          {
            part: "c",
            points: 1,
            description: "States current doubles when frequency is doubled.",
          },
        ]),
        commonErrors: [
          "Using microfarad as farad.",
          "Saying current decreases when frequency increases in a capacitor.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Convert capacitance and calculate reactance.",
            math: L`X_C=\frac{1}{2\pi(50)(50\times10^{-6})}\approx63.7\ \Omega`,
          },
          {
            part: "b",
            explanation: "Find rms current.",
            math: L`I_{\mathrm{rms}}=\frac{220}{63.7}\approx3.45\ \mathrm A`,
          },
          {
            part: "c",
            explanation:
              "If frequency doubles, capacitive reactance halves, so current doubles for the same rms voltage.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Derive the rms value of a sinusoidal current $i=I_0\sin\omega t$ over one complete cycle.`,
        difficulty: 4,
        skillTags: ["rms_derivation", "sinusoidal_ac"],
        parts: [
          part("a", "State the meaning of rms current.", 1),
          part("b", "Use the mean-square value over one cycle.", 3),
          part(
            "c",
            "Write the final relation between rms and peak current.",
            1,
          ),
        ],
        hints: [
          "RMS is the square root of the mean of the square.",
          L`The average value of $\sin^2\omega t$ over one cycle is $1/2$.`,
          "Take the square root at the end.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Defines rms current physically.",
          },
          {
            part: "b",
            points: 3,
            description: "Uses mean square over a complete cycle correctly.",
          },
          {
            part: "c",
            points: 1,
            description: "Obtains I0 divided by square root of 2.",
          },
        ]),
        commonErrors: [
          "Averaging current instead of current squared.",
          "Using peak current directly as rms current.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "RMS current is the steady current that produces the same heating effect in a resistor as the AC over one cycle.",
          },
          {
            part: "b",
            explanation: "Square the current and average it over one cycle.",
            math: L`\langle i^2\rangle=I_0^2\langle\sin^2\omega t\rangle=\frac{I_0^2}{2}`,
          },
          {
            part: "c",
            explanation: "Take the square root.",
            math: L`I_{\mathrm{rms}}=\sqrt{\langle i^2\rangle}=\frac{I_0}{\sqrt2}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A series AC circuit contains $R=40\ \Omega$, $X_L=90\ \Omega$ and $X_C=60\ \Omega$. It is connected to a $200\text{ V}$ rms source.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: lcrCircuitFigure,
        skillTags: ["case_based", "lcr_impedance", "power_factor"],
        parts: [
          part("a", "Find the net reactance.", 1),
          part("b", "Find the impedance.", 2),
          part("c", "Find the rms current and power factor.", 2),
        ],
        hints: [
          L`Net reactance is $X_L-X_C$.`,
          L`Use $Z=\sqrt{R^2+(X_L-X_C)^2}$.`,
          L`Power factor is $R/Z$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds net reactance." },
          { part: "b", points: 2, description: "Finds impedance." },
          {
            part: "c",
            points: 2,
            description: "Finds current and power factor.",
          },
        ]),
        commonErrors: [
          "Adding XL and XC instead of taking their difference.",
          "Using resistance alone as impedance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The circuit is net inductive.",
            math: L`X=X_L-X_C=90-60=30\ \Omega`,
          },
          {
            part: "b",
            explanation: "Find impedance.",
            math: L`Z=\sqrt{40^2+30^2}=50\ \Omega`,
          },
          {
            part: "c",
            explanation: "Find current and power factor.",
            math: L`I_{\mathrm{rms}}=\frac{200}{50}=4.0\ \mathrm A,\qquad \cos\phi=\frac{R}{Z}=\frac{40}{50}=0.80`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "LCR Resonance, AC Power, Generator, and Transformer",
    subtopic:
      "Series LCR resonance, power factor, wattless current, AC generator, transformer ratios and power transfer.",
    mc: [
      {
        questionLatex: L`A series LCR circuit has $L=0.10\text{ H}$ and $C=100\,\mu\text{F}$. Its resonant frequency is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: resonanceCurveFigure,
        skillTags: ["lcr_resonance", "resonant_frequency"],
        choices: [
          L`$16\text{ Hz}$`,
          L`$50\text{ Hz}$`,
          L`$160\text{ Hz}$`,
          L`$500\text{ Hz}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This misses the square root in $f_0=1/(2\\pi\\sqrt{LC})$, making the frequency too small.",
          C: "This omits the factor 2 pi in the denominator.",
          D: "This treats microfarad incorrectly and makes $C$ much smaller than its SI value.",
        },
        hints: [
          L`Use $f_0=1/(2\pi\sqrt{LC})$.`,
          L`$100\,\mu\text{F}=1.0\times10^{-4}\text{ F}$.`,
          "Calculate LC before taking the square root.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find resonance frequency.",
            math: L`f_0=\frac{1}{2\pi\sqrt{(0.10)(1.0\times10^{-4})}}\approx50\ \mathrm{Hz}`,
          },
        ],
      },
      {
        questionLatex: L`An ideal transformer has $500$ turns in the primary and $100$ turns in the secondary. If the primary voltage is $220\text{ V}$, the secondary voltage is`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: transformerFigure,
        skillTags: ["transformer_ratio", "ideal_transformer"],
        choices: [
          L`$44\text{ V}$`,
          L`$110\text{ V}$`,
          L`$220\text{ V}$`,
          L`$1100\text{ V}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses an incorrect turn ratio; the secondary has one-fifth as many turns, not one-half.",
          C: "This ignores the turns ratio and assumes primary and secondary voltages are equal.",
          D: "This inverts the ratio and treats the transformer as step-up.",
        },
        hints: [
          L`Use $V_s/V_p=N_s/N_p$.`,
          "The secondary has fewer turns than the primary.",
          "This is a step-down transformer.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the ideal transformer ratio.",
            math: L`V_s=V_p\frac{N_s}{N_p}=220\frac{100}{500}=44\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`An AC circuit draws $5.0\text{ A}$ rms from a $200\text{ V}$ rms source and consumes average power $600\text{ W}$. Its power factor is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["ac_power", "power_factor"],
        choices: [L`$0.30$`, L`$0.50$`, L`$0.60$`, L`$0.90$`],
        correctLetter: "C",
        rationales: {
          A: "This divides power by twice $VI$, but the power-factor formula uses $P/(VI)$.",
          B: "This uses a wrong current or voltage product.",
          D: "This is too high for the given real power; $600\\text{ W}$ is only $60\\%$ of the apparent power.",
        },
        hints: [
          L`Average power is $P=V_{\mathrm{rms}}I_{\mathrm{rms}}\cos\phi$.`,
          "Compute VI first.",
          "Power factor is real power divided by apparent power.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the AC power expression.",
            math: L`\cos\phi=\frac{P}{VI}=\frac{600}{(200)(5.0)}=0.60`,
          },
        ],
      },
      {
        questionLatex: L`Wattless current is most directly associated with an AC circuit in which`,
        difficulty: 3,
        skillTags: ["wattless_current", "ac_power"],
        choices: [
          "voltage and current are in phase",
          "the resistance is the only circuit element",
          "average power is maximum",
          "average power over a cycle is zero though current flows",
        ],
        correctLetter: "D",
        rationales: {
          A: "In-phase current gives non-zero average power in a resistor.",
          B: "A pure resistor consumes real power because voltage and current are in phase.",
          C: "Wattless current corresponds to zero average power, not maximum power.",
        },
        hints: [
          "Wattless means no net real power over a cycle.",
          "Pure inductive and pure capacitive circuits are examples.",
          "Current can flow even when average power is zero.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a purely reactive circuit, current flows but voltage and current are 90 degrees out of phase, so average power over a cycle is zero.",
          },
        ],
      },
      {
        questionLatex: L`The working of a simple AC generator is based mainly on`,
        difficulty: 2,
        figure: acGeneratorFigure,
        skillTags: ["ac_generator", "electromagnetic_induction"],
        choices: [
          "Coulomb's law",
          "electromagnetic induction",
          "heating effect of current only",
          "photoelectric emission",
        ],
        correctLetter: "B",
        rationales: {
          A: "Coulomb's law concerns electrostatic force, not generator emf.",
          C: "Heating may be a loss, not the generating principle.",
          D: "Photoelectric emission is unrelated to mechanical rotation in a generator.",
        },
        hints: [
          "A rotating coil has changing magnetic flux.",
          "Changing flux induces emf.",
          "This is Faraday's law in action.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "An AC generator converts mechanical energy into electrical energy using electromagnetic induction.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An ideal transformer has turn ratio $N_s:N_p=1:12$ and is connected to a $240\text{ V}$ primary supply.`,
        difficulty: 2,
        calculatorAllowed: true,
        figure: transformerFigure,
        skillTags: ["transformer_ratio"],
        parts: [part("a", "Find the secondary voltage.", 2)],
        hints: [
          L`Use $V_s/V_p=N_s/N_p$.`,
          "The secondary has fewer turns.",
          "This is a step-down transformer.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds secondary voltage." },
        ]),
        commonErrors: [
          "Inverting the turns ratio.",
          "Assuming every transformer increases voltage.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the transformer voltage ratio.",
            math: L`V_s=240\left(\frac{1}{12}\right)=20\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A series LCR circuit is at resonance. Its resistance is $50\ \Omega$ and it is connected to a $100\text{ V}$ rms source.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: lcrCircuitFigure,
        skillTags: ["lcr_resonance", "ac_power"],
        parts: [
          part("a", "Find the impedance at resonance.", 1),
          part("b", "Find the rms current.", 1),
          part("c", "Find the average power consumed.", 2),
        ],
        hints: [
          "At series resonance, XL and XC cancel.",
          "Impedance is then just R.",
          L`Use $P=I^2R$ or $VI$ at power factor 1.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States Z = R at resonance." },
          { part: "b", points: 1, description: "Finds current." },
          { part: "c", points: 2, description: "Finds average power." },
        ]),
        commonErrors: [
          "Adding XL and XC at resonance instead of cancelling them.",
          "Using zero impedance at resonance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "At resonance:",
            math: L`X_L=X_C,\qquad Z=R=50\ \Omega`,
          },
          {
            part: "b",
            explanation: "Find rms current.",
            math: L`I=\frac{100}{50}=2.0\ \mathrm A`,
          },
          {
            part: "c",
            explanation: "At resonance power factor is 1.",
            math: L`P=VI=(100)(2.0)=200\ \mathrm W`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A transformer is $90\%$ efficient. It receives $500\text{ W}$ input power and delivers output at $100\text{ V}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: transformerFigure,
        skillTags: ["transformer_efficiency", "power_transfer"],
        parts: [
          part("a", "Find the output power.", 1),
          part("b", "Find the output current.", 2),
        ],
        hints: [
          "Efficiency equals output power divided by input power.",
          "Output power is 90 percent of input power.",
          L`Use $P_s=V_sI_s$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds output power." },
          { part: "b", points: 2, description: "Finds output current." },
        ]),
        commonErrors: [
          "Using 90 percent as output current directly.",
          "Treating output power as greater than input power.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Output power is 90 percent of input power.",
            math: L`P_s=0.90(500)=450\ \mathrm W`,
          },
          {
            part: "b",
            explanation: "Use output voltage.",
            math: L`I_s=\frac{P_s}{V_s}=\frac{450}{100}=4.5\ \mathrm A`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Explain the construction and working principle of a simple AC generator. State why the emf produced is alternating.`,
        difficulty: 3,
        figure: acGeneratorFigure,
        skillTags: ["ac_generator", "faraday_law", "conceptual_explanation"],
        parts: [
          part("a", "Name the main parts shown in a simple AC generator.", 2),
          part("b", "Explain how emf is induced.", 2),
          part("c", "Explain why the emf changes direction periodically.", 2),
        ],
        hints: [
          "The coil rotates in a magnetic field.",
          "Flux through the coil changes continuously.",
          "After each half rotation, the sense of flux change reverses.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Names coil, magnetic field/poles, slip rings and brushes.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Connects rotating coil to changing flux and induced emf.",
          },
          {
            part: "c",
            points: 2,
            description: "Explains reversal of emf every half turn.",
          },
        ]),
        commonErrors: [
          "Calling slip rings a commutator for DC output.",
          "Saying emf is produced without changing flux.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A simple AC generator has a rotating coil, magnetic poles, slip rings and brushes connected to an external circuit.",
          },
          {
            part: "b",
            explanation:
              "As the coil rotates, magnetic flux linked with it changes. By Faraday's law, an emf is induced.",
          },
          {
            part: "c",
            explanation:
              "The direction of flux change reverses after every half rotation, so the induced emf reverses periodically and becomes alternating.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A small power station has to transmit $10\text{ kW}$ of power. It can transmit at $250\text{ V}$ directly or use a step-up transformer to transmit at $5000\text{ V}$ before stepping down near homes.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: transformerFigure,
        skillTags: ["case_based", "transformer_transmission", "power_loss"],
        parts: [
          part("a", "Find the line current if transmission is at 250 V.", 1),
          part("b", "Find the line current if transmission is at 5000 V.", 1),
          part(
            "c",
            "Find the ratio of resistive line losses in the two cases, assuming the same line resistance.",
            2,
          ),
          part(
            "d",
            "State why transformers are used in power transmission.",
            1,
          ),
        ],
        hints: [
          L`Use $P=VI$ for the same transmitted power.`,
          L`Line loss is proportional to $I^2R$.`,
          "Lower current greatly reduces loss.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds current at 250 V." },
          { part: "b", points: 1, description: "Finds current at 5000 V." },
          {
            part: "c",
            points: 2,
            description: "Uses square of current ratio for loss ratio.",
          },
          {
            part: "d",
            points: 1,
            description: "Explains high-voltage low-current transmission.",
          },
        ]),
        commonErrors: [
          "Assuming higher voltage means higher line current for fixed power.",
          "Using current ratio instead of square of current ratio for losses.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For 250 V transmission:",
            math: L`I_1=\frac{10000}{250}=40\ \mathrm A`,
          },
          {
            part: "b",
            explanation: "For 5000 V transmission:",
            math: L`I_2=\frac{10000}{5000}=2.0\ \mathrm A`,
          },
          {
            part: "c",
            explanation:
              "For the same line resistance, loss is proportional to current squared.",
            math: L`\frac{P_{\mathrm{loss},250}}{P_{\mathrm{loss},5000}}=\left(\frac{40}{2.0}\right)^2=400`,
          },
          {
            part: "d",
            explanation:
              "Transformers allow transmission at high voltage and low current, greatly reducing resistive line loss, followed by stepping down for safe use.",
          },
        ],
      },
    ],
  },
];

export const electromagneticInductionAlternatingCurrentsTopics: Topic[] =
  relocateEmiAcItems(topicSeeds.map(makeTopic));
