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

const COURSE = "cbse-science-9";
const UNIT = "u4-earth-as-a-system";
const VERSION = "0.1.2";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

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
  rationale?: string;
  misconceptionTag?: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [ChoiceSeed, ChoiceSeed, ChoiceSeed, ChoiceSeed];
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
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

function rubric(criteria: readonly FrqRubric["criteria"][number][]): FrqRubric {
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

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function correct(text: string): ChoiceSeed {
  return { text, correct: true };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function calibrateEarthSystemDifficulty({
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
    /\b(state|name|identify|which sphere|which cycle|which gas|is called|si unit)\b/.test(text) &&
    !/\bexplain|justify|infer|predict|compare|calculate|data|diagram|case|reason|why\b/.test(text);

  if (kind === "mc_single" && difficulty >= 4 && recallOnly) {
    return 3;
  }

  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ?? "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the Earth-system interaction, direction of energy flow, or cycle step before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        "incorrect_cbse_class9_earth_system_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateEarthSystemDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "treats_one_earth_sphere_or_cycle_step_in_isolation",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateEarthSystemDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "describes_a_process_without_linking_cause_and_effect",
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

const earthSpheresFigure: ItemFigure = {
  type: "svg",
  title: "Earth spheres connected through a wetland",
  description:
    "A wetland scene shows air, water, rock and soil, ice, and living organisms interacting.",
  svg: `<svg viewBox="0 0 660 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="24" y="24" width="612" height="292" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="24" y="24" width="612" height="102" rx="18" fill="#dbeafe"/>
  <rect x="24" y="126" width="612" height="190" rx="18" fill="#e2e8f0"/>
  <rect x="44" y="190" width="572" height="82" rx="12" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <path d="M50 238 C105 214 160 260 220 232 C280 204 350 255 420 226 C500 196 565 240 615 214 L615 272 L50 272 Z" fill="#93c5fd" opacity="0.65"/>
  <path d="M54 292 C120 260 195 275 250 248 C312 218 380 255 445 228 C510 205 560 232 612 220 L612 316 L54 316 Z" fill="#a16207" opacity="0.62"/>
  <polygon points="90,156 132,78 174,156" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
  <polygon points="122,96 132,78 143,96" fill="#f8fafc"/>
  <circle cx="475" cy="170" r="22" fill="#16a34a"/>
  <rect x="469" y="188" width="11" height="48" fill="#854d0e"/>
  <ellipse cx="474" cy="165" rx="40" ry="28" fill="#22c55e" opacity="0.75"/>
  <circle cx="530" cy="236" r="14" fill="#0f766e"/>
  <path d="M515 235 C525 214 540 214 551 235" fill="none" stroke="#0f766e" stroke-width="4"/>
  <text x="80" y="62" font-size="18" fill="#1e3a8a">atmosphere</text>
  <text x="72" y="217" font-size="18" fill="#1d4ed8">hydrosphere</text>
  <text x="94" y="308" font-size="18" fill="#713f12">geosphere</text>
  <text x="438" y="140" font-size="18" fill="#166534">biosphere</text>
  <text x="112" y="116" font-size="18" fill="#475569">cryosphere</text>
</svg>`,
};

const solarSpectrumFigure: ItemFigure = {
  type: "svg",
  title: "Solar radiation and visible light within the electromagnetic spectrum",
  description:
    "A spectrum strip shows increasing frequency from radio waves to gamma rays, with visible light marked as a narrow band.",
  svg: `<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="28" y="28" width="644" height="204" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
  <defs>
    <linearGradient id="visibleBand" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="20%" stop-color="#2563eb"/>
      <stop offset="40%" stop-color="#16a34a"/>
      <stop offset="60%" stop-color="#facc15"/>
      <stop offset="80%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <rect x="74" y="105" width="552" height="38" rx="19" fill="#e2e8f0"/>
  <rect x="320" y="96" width="98" height="56" rx="8" fill="url(#visibleBand)" stroke="#111827" stroke-width="2"/>
  <text x="72" y="88" font-size="16" fill="#334155">lower frequency</text>
  <text x="506" y="88" font-size="16" fill="#334155">higher frequency</text>
  <path d="M74 176 L626 176" stroke="#334155" stroke-width="3"/>
  <path d="M626 176 L610 168 M626 176 L610 184" stroke="#334155" stroke-width="3" fill="none"/>
  <text x="78" y="202" font-size="15" fill="#334155">radio</text>
  <text x="190" y="202" font-size="15" fill="#334155">infrared</text>
  <text x="334" y="202" font-size="15" fill="#111827">visible</text>
  <text x="455" y="202" font-size="15" fill="#334155">ultraviolet</text>
  <text x="570" y="202" font-size="15" fill="#334155">gamma</text>
</svg>`,
};

const differentialHeatingFigure: ItemFigure = {
  type: "svg",
  title: "Heating of two surfaces under the same sunlight",
  description:
    "A simple investigation compares sand and water temperatures after equal sunlight exposure.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="28" y="24" width="604" height="310" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
  <circle cx="330" cy="70" r="30" fill="#facc15" stroke="#eab308" stroke-width="3"/>
  <path d="M330 112 L170 170 M330 112 L490 170" stroke="#f59e0b" stroke-width="4"/>
  <rect x="92" y="178" width="210" height="76" rx="14" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <rect x="358" y="178" width="210" height="76" rx="14" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <text x="194" y="222" text-anchor="middle" font-size="22" fill="#92400e">sand</text>
  <text x="462" y="222" text-anchor="middle" font-size="22" fill="#1d4ed8">water</text>
  <rect x="134" y="278" width="126" height="18" rx="9" fill="#f97316"/>
  <rect x="400" y="278" width="76" height="18" rx="9" fill="#38bdf8"/>
  <text x="196" y="318" text-anchor="middle" font-size="15" fill="#334155">larger rise</text>
  <text x="438" y="318" text-anchor="middle" font-size="15" fill="#334155">smaller rise</text>
</svg>`,
};

const breezeFigure: ItemFigure = {
  type: "svg",
  title: "Sea breeze circulation during daytime",
  description:
    "Daytime heating over land and sea is shown with surface wind from sea to land and return flow aloft.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="28" y="24" width="644" height="312" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="56" y="216" width="280" height="82" rx="10" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <rect x="336" y="216" width="308" height="82" rx="10" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <circle cx="570" cy="82" r="30" fill="#facc15" stroke="#eab308" stroke-width="3"/>
  <text x="190" y="263" text-anchor="middle" font-size="21" fill="#1d4ed8">sea</text>
  <text x="490" y="263" text-anchor="middle" font-size="21" fill="#92400e">land</text>
  <text x="488" y="196" text-anchor="middle" font-size="17" fill="#dc2626">warmer air rises</text>
  <path d="M485 208 C485 176 485 146 485 112" stroke="#dc2626" stroke-width="5" fill="none"/>
  <path d="M485 112 L474 130 M485 112 L497 130" stroke="#dc2626" stroke-width="5" fill="none"/>
  <path d="M266 240 C330 240 386 240 444 240" stroke="#2563eb" stroke-width="6" fill="none"/>
  <path d="M444 240 L424 229 M444 240 L424 251" stroke="#2563eb" stroke-width="6" fill="none"/>
  <text x="352" y="228" text-anchor="middle" font-size="16" fill="#1d4ed8">cool surface wind</text>
  <path d="M482 108 C410 78 315 80 236 122" stroke="#64748b" stroke-width="4" stroke-dasharray="8 8" fill="none"/>
  <path d="M236 122 L255 121 M236 122 L248 107" stroke="#64748b" stroke-width="4" fill="none"/>
  <text x="347" y="82" text-anchor="middle" font-size="16" fill="#475569">return flow aloft</text>
</svg>`,
};

const biogeochemicalCycleFigure: ItemFigure = {
  type: "svg",
  title: "Matter cycling between living and non-living parts",
  description:
    "A cycle diagram connects atmosphere, plants, animals, decomposers, soil and water.",
  svg: `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="28" y="26" width="644" height="366" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
  <circle cx="350" cy="210" r="132" fill="#ecfdf5" stroke="#22c55e" stroke-width="3"/>
  <rect x="286" y="60" width="128" height="38" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="350" y="84" text-anchor="middle" font-size="16" fill="#1e3a8a">atmosphere</text>
  <rect x="498" y="180" width="110" height="42" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <text x="553" y="206" text-anchor="middle" font-size="16" fill="#166534">plants</text>
  <rect x="292" y="318" width="116" height="42" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
  <text x="350" y="344" text-anchor="middle" font-size="16" fill="#991b1b">animals</text>
  <rect x="92" y="178" width="132" height="46" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="158" y="206" text-anchor="middle" font-size="16" fill="#92400e">decomposers</text>
  <rect x="292" y="178" width="116" height="46" rx="8" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
  <text x="350" y="206" text-anchor="middle" font-size="16" fill="#334155">soil/water</text>
  <path d="M414 78 C492 92 552 124 557 177" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M557 177 L545 160 M557 177 L568 160" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M553 224 C524 288 468 330 410 340" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M410 340 L428 331 M410 340 L427 352" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M290 340 C220 318 168 278 158 226" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M158 226 L172 242 M158 226 L147 244" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M224 200 L288 200" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M288 200 L270 190 M288 200 L270 210" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M350 178 L350 100" stroke="#334155" stroke-width="3" fill="none"/>
  <path d="M350 100 L340 118 M350 100 L360 118" stroke="#334155" stroke-width="3" fill="none"/>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Earth as an Interconnected System",
    subtopic:
      "Earth spheres, interactions among atmosphere, hydrosphere, geosphere, cryosphere and biosphere.",
    mc: [
      {
        questionLatex:
          "A mountain glacier melts and adds water to a river used by nearby plants and animals. Which Earth spheres are directly involved in this example?",
        difficulty: 2,
        skillTags: ["earth_spheres", "systems_interaction"],
        choices: [
          wrong("Only atmosphere and geosphere", "Air and rocks may influence the region, but the example directly mentions ice, water and living organisms."),
          correct("Cryosphere, hydrosphere and biosphere"),
          wrong("Only biosphere", "Plants and animals are involved, but the melting glacier and river are non-living parts of the system."),
          wrong("Only hydrosphere and atmosphere", "The glacier belongs to the cryosphere and the organisms belong to the biosphere."),
        ],
        hints: [
          "Match each named part to an Earth sphere.",
          "Ice belongs to the cryosphere.",
          "The river is water, and plants and animals are living organisms.",
        ],
        solution: [
          step(1, "The glacier is frozen water, so it belongs to the cryosphere."),
          step(2, "The river belongs to the hydrosphere and plants/animals belong to the biosphere."),
        ],
      },
      {
        questionLatex:
          "Which statement best shows that Earth should be studied as a system rather than as separate parts?",
        difficulty: 2,
        skillTags: ["earth_as_system", "cause_effect"],
        choices: [
          wrong("Rocks do not affect water or air.", "Weathering and soil formation show that rocks interact with water and air."),
          wrong("Only living organisms change Earth's surface.", "Non-living processes such as wind, rain and temperature also change Earth's surface."),
          correct("A change in one sphere can cause changes in other spheres."),
          wrong("The atmosphere is independent of oceans and land.", "Oceans and land affect heating, evaporation and weather."),
        ],
        hints: [
          "A system has connected parts.",
          "Think about rain, plants, soil and air together.",
          "The best statement must mention interaction.",
        ],
        solution: [
          step(1, "Earth's atmosphere, water, rocks, ice and life interact."),
          step(2, "Therefore a change in one part can affect other parts."),
        ],
      },
      {
        questionLatex:
          "A pond in a wetland mainly belongs to the",
        difficulty: 1,
        skillTags: ["earth_spheres", "hydrosphere"],
        choices: [
          wrong("geosphere", "The geosphere is rock, land and soil."),
          wrong("cryosphere", "The cryosphere is frozen water such as glaciers or ice caps."),
          wrong("atmosphere", "The atmosphere is the layer of air."),
          correct("hydrosphere"),
        ],
        hints: [
          "Hydro means water.",
          "A pond is liquid water.",
          "Liquid water on Earth is part of the hydrosphere.",
        ],
        solution: [
          step(1, "The water body is liquid water."),
          step(2, "Liquid water belongs to the hydrosphere."),
        ],
      },
      {
        questionLatex:
          "A forest fire removes vegetation from a slope. After heavy rain, soil is washed into a stream. Which chain of interactions is most accurate?",
        difficulty: 3,
        skillTags: ["systems_interaction", "soil_erosion"],
        choices: [
          wrong("Atmosphere only, because rain falls from air", "Rain starts in the atmosphere, but soil, stream water and vegetation are also involved."),
          correct("Biosphere changes first, then geosphere and hydrosphere are affected"),
          wrong("Cryosphere changes first, then atmosphere is affected", "No frozen water is central to this example."),
          wrong("Hydrosphere changes first, then biosphere is unaffected", "Vegetation removal is the first change described."),
        ],
        hints: [
          "Identify the first change in the sentence.",
          "Vegetation is living matter.",
          "Soil and stream water are then affected.",
        ],
        solution: [
          step(1, "Vegetation belongs to the biosphere, and it is removed first."),
          step(2, "Soil belongs to the geosphere and the stream belongs to the hydrosphere, so both are affected later."),
        ],
      },
      {
        questionLatex:
          "A student says, \"The cryosphere is not part of the water system because ice is solid.\" Which correction is best?",
        difficulty: 3,
        skillTags: ["cryosphere", "hydrosphere_relation"],
        choices: [
          wrong("The cryosphere contains only rocks, not water.", "Ice is frozen water, not rock."),
          wrong("Only water vapour is part of Earth's water system.", "Liquid water and ice are also part of Earth's water stores."),
          correct("The cryosphere stores water as snow, glaciers and ice caps."),
          wrong("Ice becomes part of Earth only after it melts.", "Frozen water already exists as part of Earth systems."),
        ],
        hints: [
          "Focus on what ice is made of.",
          "The cryosphere is a store of frozen water.",
          "Water can exist as solid, liquid or gas.",
        ],
        solution: [
          step(1, "Ice is solid water."),
          step(2, "The cryosphere stores water in frozen forms such as snow and glaciers."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the Earth sphere that includes all living organisms.",
        difficulty: 1,
        skillTags: ["biosphere"],
        parts: [part("a", "Write the name of the sphere.", 1)],
        hints: [
          "Bio means life.",
          "Plants, animals and microbes are included.",
          "The living sphere is the biosphere.",
        ],
        rubric: rubric([criterion("a", 1, "Names the biosphere.")]),
        commonErrors: ["Writing atmosphere because living organisms breathe air."],
        workedSolution: [
          solutionPart("a", "All living organisms are included in the biosphere."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A lake dries partly during a long dry season. Explain two effects this can have on other Earth spheres.",
        difficulty: 3,
        skillTags: ["earth_spheres", "systems_interaction"],
        parts: [
          part("a", "State one effect on the biosphere.", 1),
          part("b", "State one effect on the atmosphere or geosphere.", 1),
        ],
        hints: [
          "The lake is part of the hydrosphere.",
          "Living organisms depend on water.",
          "Dry exposed lake bed can affect soil, dust or evaporation.",
        ],
        rubric: rubric([
          criterion("a", 1, "Gives a valid biosphere effect, such as less habitat or water for organisms."),
          criterion("b", 1, "Gives a valid atmosphere/geosphere effect, such as less evaporation or exposed dry soil."),
        ]),
        commonErrors: [
          "Writing only that the lake has less water without linking another sphere.",
          "Treating the hydrosphere as isolated from life and land.",
        ],
        workedSolution: [
          solutionPart("a", "Aquatic plants, fish or birds may lose habitat or water supply."),
          solutionPart("b", "Less lake surface can reduce local evaporation, and exposed sediment can become dry soil or dust."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the wetland figure to identify two interactions between living and non-living parts of Earth.",
        difficulty: 2,
        skillTags: ["diagram_interpretation", "biotic_abiotic"],
        figure: earthSpheresFigure,
        parts: [
          part("a", "Write one interaction involving water.", 1),
          part("b", "Write one interaction involving land, air or ice.", 1),
        ],
        hints: [
          "Living parts include plants and animals.",
          "Non-living parts include water, air, soil, rock and ice.",
          "State the interaction, not only the names of two spheres.",
        ],
        rubric: rubric([
          criterion("a", 1, "Gives a valid water interaction, such as plants/animals using water."),
          criterion("b", 1, "Gives another valid interaction with soil, air, rock or ice."),
        ]),
        commonErrors: [
          "Only listing sphere names without an interaction.",
          "Calling water a living component.",
        ],
        workedSolution: [
          solutionPart("a", "Animals and plants use water from the hydrosphere."),
          solutionPart("b", "Plants grow in soil from the geosphere and exchange gases with the atmosphere."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A hillside has trees, thin soil and a stream below it. After many trees are cut, more rainwater runs downhill and the stream becomes muddy.",
        difficulty: 4,
        skillTags: ["systems_reasoning", "erosion", "human_impact"],
        parts: [
          part("a", "Which sphere changed first?", 1),
          part("b", "Which sphere is represented by the muddy stream?", 1),
          part("c", "Why did soil loss increase?", 1),
          part("d", "Suggest one preventive action.", 1),
        ],
        hints: [
          "Trees are living organisms.",
          "Muddy water contains soil carried into water.",
          "Roots help hold soil in place.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies biosphere as the sphere changed first."),
          criterion("b", 1, "Identifies hydrosphere with soil from geosphere mixed in."),
          criterion("c", 1, "Explains that fewer roots reduce soil binding and increase runoff/erosion."),
          criterion("d", 1, "Suggests a valid prevention such as planting trees, contour bunds or reducing cutting."),
        ]),
        commonErrors: [
          "Calling it only a water problem.",
          "Ignoring the role of roots in soil stability.",
        ],
        workedSolution: [
          solutionPart("a", "The biosphere changed first because trees were removed."),
          solutionPart("b", "The stream is part of the hydrosphere, with soil from the geosphere mixed in."),
          solutionPart("c", "Tree roots bind soil. With fewer roots, rainwater can wash more soil downhill."),
          solutionPart("d", "Planting trees or using soil-conservation methods can reduce erosion."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Why is the statement \"Earth's spheres are separate boxes\" scientifically weak?",
        difficulty: 3,
        skillTags: ["earth_as_system", "scientific_explanation"],
        parts: [part("a", "Explain with one example.", 2)],
        hints: [
          "A system has interacting parts.",
          "Use a natural example such as rain, soil, plants or air.",
          "Show how one part affects another.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the spheres interact."),
          criterion("a", 1, "Gives a valid example of interaction."),
        ]),
        commonErrors: [
          "Only naming all spheres without explaining interaction.",
          "Giving an example that has only one sphere.",
        ],
        workedSolution: [
          solutionPart("a", "The statement is weak because water, air, land, ice and life interact. For example, rain from the atmosphere can weather rocks, add water to rivers and support plants."),
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Solar Radiation and the Electromagnetic Spectrum",
    subtopic:
      "Nature of solar energy, electromagnetic waves, visible light, reflection, absorption and heating.",
    mc: [
      {
        questionLatex:
          "Solar radiation reaching Earth is best described as",
        difficulty: 2,
        skillTags: ["solar_radiation", "electromagnetic_waves"],
        choices: [
          correct("electromagnetic waves carrying energy from the Sun"),
          wrong("sound waves travelling through vacuum", "Sound needs a material medium and cannot travel through space."),
          wrong("only visible light and no other radiation", "Sunlight contains visible light and other electromagnetic radiations."),
          wrong("particles of air pushed by the Sun", "Solar radiation is not air moving through space."),
        ],
        hints: [
          "Energy from the Sun crosses space.",
          "Sound cannot travel through vacuum.",
          "Light is part of the electromagnetic spectrum.",
        ],
        solution: [
          step(1, "Solar energy reaches Earth through space."),
          step(2, "It travels as electromagnetic radiation."),
        ],
      },
      {
        questionLatex:
          "Which statement about visible light is best supported by the spectrum figure?",
        difficulty: 1,
        skillTags: ["electromagnetic_spectrum", "diagram_identification"],
        figure: solarSpectrumFigure,
        choices: [
          correct("It lies between infrared and ultraviolet in the electromagnetic spectrum."),
          wrong("It includes the whole strip from radio to gamma rays.", "The figure shows visible light as one region, not the whole spectrum."),
          wrong("It is at the radio-wave end of the spectrum.", "The radio label is at the lower-frequency end, away from the visible band."),
          wrong("It is outside the electromagnetic spectrum.", "The visible band is drawn inside the electromagnetic spectrum strip."),
        ],
        hints: [
          "Read the labels immediately next to the visible band.",
          "Visible light is not the entire strip.",
          "The figure places visible between infrared and ultraviolet.",
        ],
        solution: [
          step(1, "The visible band is drawn inside the electromagnetic spectrum."),
          step(2, "Its neighbouring labels are infrared on one side and ultraviolet on the other."),
        ],
      },
      {
        questionLatex:
          "Two surfaces receive the same sunlight for the same time. Surface P reflects most radiation; surface Q absorbs most radiation. Which conclusion is most reasonable?",
        difficulty: 3,
        skillTags: ["absorption_reflection", "surface_heating"],
        choices: [
          wrong("P will heat more because it reflects more.", "Reflected radiation is not retained as heat by the surface."),
          correct("Q will generally heat more because it absorbs more energy."),
          wrong("Both must heat equally because sunlight is the same.", "Equal incoming sunlight does not mean equal absorption."),
          wrong("Neither can heat because radiation is not matter.", "Radiation can transfer energy and warm surfaces."),
        ],
        hints: [
          "Heating depends on absorbed energy.",
          "Reflection sends energy away from the surface.",
          "The better absorber generally warms more.",
        ],
        solution: [
          step(1, "Absorbed radiation increases the surface's energy."),
          step(2, "Q absorbs more radiation, so it generally heats more."),
        ],
      },
      {
        questionLatex:
          "A black road becomes hotter than a nearby light-coloured pavement on a sunny afternoon mainly because the black road",
        difficulty: 2,
        skillTags: ["albedo", "absorption"],
        choices: [
          wrong("has no contact with air", "Both surfaces are in contact with air."),
          wrong("produces its own solar radiation", "The road does not produce sunlight."),
          wrong("has a lower mass in every case", "The colour effect is about absorption and reflection, not necessarily mass."),
          correct("absorbs more of the incoming solar radiation"),
        ],
        hints: [
          "Dark surfaces usually absorb more light.",
          "Light surfaces usually reflect more light.",
          "More absorption causes stronger heating.",
        ],
        solution: [
          step(1, "A black surface absorbs a larger fraction of incoming radiation."),
          step(2, "Greater absorption causes stronger heating."),
        ],
      },
      {
        questionLatex:
          "Because Earth is curved, sunlight reaches high latitudes at a slant and spreads over a larger area than near the equator. This mainly causes",
        difficulty: 3,
        skillTags: ["differential_heating", "latitude_tilt"],
        choices: [
          wrong("stronger heating at high latitudes because the rays travel farther", "Spreading the same energy over a larger area reduces heating per unit area."),
          wrong("the same heating everywhere because the Sun is the same", "The angle at which sunlight reaches the surface changes the heating per unit area."),
          correct("weaker heating per unit area at high latitudes"),
          wrong("no heating at high latitudes during daytime", "High latitudes still receive sunlight, but it may be less concentrated."),
        ],
        hints: [
          "Think about energy per unit area.",
          "Earth's curved shape makes high-latitude rays more slanting.",
          "Less concentrated solar energy gives weaker heating.",
        ],
        solution: [
          step(1, "Because Earth is nearly spherical, high-latitude sunlight often reaches the surface at a slant."),
          step(2, "The same incoming energy spreads over a larger area, so heating per unit area is weaker."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write the approximate speed of light in vacuum.",
        difficulty: 1,
        skillTags: ["speed_of_light", "electromagnetic_waves"],
        parts: [part("a", "Write the approximate value with unit.", 1)],
        hints: [
          "Use the standard school-level value.",
          "The unit is metre per second.",
          "It is about $3\\times 10^8\\,\\text{m/s}$.",
        ],
        rubric: rubric([criterion("a", 1, "Writes approximately $3\\times 10^8\\,\\text{m/s}$.")]),
        commonErrors: ["Writing the speed of sound instead of the speed of light."],
        workedSolution: [
          solutionPart("a", "The approximate speed of light in vacuum is", "3\\times 10^8\\,\\text{m/s}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the spectrum figure to explain why visible light is not the whole of solar radiation.",
        difficulty: 2,
        skillTags: ["electromagnetic_spectrum", "diagram_interpretation"],
        figure: solarSpectrumFigure,
        parts: [part("a", "Explain using the figure.", 2)],
        hints: [
          "Find the labelled visible region.",
          "Compare it with the full strip.",
          "Solar radiation includes different electromagnetic waves.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that visible light is only a small band of the electromagnetic spectrum."),
          criterion("a", 1, "Mentions at least one non-visible region such as infrared or ultraviolet."),
        ]),
        commonErrors: [
          "Saying visible light is outside the electromagnetic spectrum.",
          "Ignoring the larger strip in the figure.",
        ],
        workedSolution: [
          solutionPart("a", "The figure shows visible light as a narrow band. Regions such as infrared and ultraviolet lie outside this visible band but are still part of the electromagnetic spectrum."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A dark metal plate and a shiny metal plate are placed in sunlight for the same time. Predict which becomes hotter and justify.",
        difficulty: 3,
        skillTags: ["absorption_reflection", "prediction"],
        parts: [
          part("a", "State the hotter plate.", 1),
          part("b", "Give the reason.", 1),
        ],
        hints: [
          "Dark surfaces absorb more radiation.",
          "Shiny surfaces reflect more radiation.",
          "Heating depends on absorbed energy.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies the dark plate as hotter."),
          criterion("b", 1, "Explains greater absorption or lower reflection of solar radiation."),
        ]),
        commonErrors: [
          "Choosing the shiny plate because it looks brighter.",
          "Saying colour affects heating without mentioning absorption/reflection.",
        ],
        workedSolution: [
          solutionPart("a", "The dark plate becomes hotter."),
          solutionPart("b", "It absorbs more incoming solar radiation, while the shiny plate reflects more."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student places equal masses of dry sand and water in identical shallow trays under the same sunlight. After $20$ minutes, the sand shows a larger temperature rise.",
        difficulty: 4,
        skillTags: ["differential_heating", "experiment_reasoning"],
        figure: differentialHeatingFigure,
        parts: [
          part("a", "Which material warmed more?", 1),
          part("b", "What condition was kept the same to make the comparison fair?", 1),
          part("c", "What does this show about Earth's surface materials?", 1),
          part("d", "Name one atmospheric phenomenon this helps explain.", 1),
        ],
        hints: [
          "Read the investigation conditions carefully.",
          "A fair test changes mainly one factor.",
          "Unequal heating of land and water can create air movement.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies sand as warming more."),
          criterion("b", 1, "States a controlled condition such as equal mass, identical trays, same sunlight or same time."),
          criterion("c", 1, "States differential heating of different Earth surfaces."),
          criterion("d", 1, "Names wind, land breeze, sea breeze, evaporation difference or related air movement."),
        ]),
        commonErrors: [
          "Concluding only that sunlight is hot.",
          "Ignoring controlled variables in the comparison.",
        ],
        workedSolution: [
          solutionPart("a", "The sand warmed more."),
          solutionPart("b", "A fair comparison kept conditions such as exposure time, tray type and incoming sunlight the same."),
          solutionPart("c", "The result shows that different Earth materials do not heat equally under the same solar radiation."),
          solutionPart("d", "This helps explain winds such as sea breeze and land breeze."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Why can solar radiation warm Earth's surface even though space between the Sun and Earth is nearly a vacuum?",
        difficulty: 3,
        skillTags: ["radiation_transfer", "electromagnetic_waves"],
        parts: [part("a", "Explain the energy transfer.", 2)],
        hints: [
          "Conduction and sound need matter.",
          "Electromagnetic radiation can travel through vacuum.",
          "The surface warms after absorbing radiation.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that electromagnetic radiation can travel through vacuum."),
          criterion("a", 1, "Explains that Earth's surface warms when it absorbs the radiation."),
        ]),
        commonErrors: [
          "Saying heat reaches Earth by sound waves.",
          "Saying a material medium must fill all of space.",
        ],
        workedSolution: [
          solutionPart("a", "Solar energy travels as electromagnetic radiation, which does not require a material medium. Earth's surface warms when it absorbs part of this radiation."),
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Differential Heating and Winds",
    subtopic:
      "Unequal heating, pressure differences, air movement, land breeze, sea breeze, mountain breeze and valley breeze.",
    mc: [
      {
        questionLatex:
          "During daytime near a coast, land usually heats faster than sea water. The surface wind is most likely to blow",
        difficulty: 3,
        skillTags: ["sea_breeze", "differential_heating"],
        choices: [
          wrong("from land to sea because land is warmer", "Warmer air over land rises, so cooler air from sea moves in near the surface."),
          correct("from sea to land because cooler sea air moves toward the warmer land"),
          wrong("straight upward from the sea only", "The rising air is mainly over the warmer land in daytime."),
          wrong("nowhere because air cannot move horizontally", "Pressure differences can drive horizontal air movement."),
        ],
        hints: [
          "Land heats faster during the day.",
          "Warm air rises over the warmer region.",
          "Cooler air moves in near the surface to replace rising air.",
        ],
        solution: [
          step(1, "Daytime land is warmer, so air over land rises."),
          step(2, "Cooler air from the sea moves toward land at the surface, producing sea breeze."),
        ],
      },
      {
        questionLatex:
          "The daytime breeze figure shows warmer air rising over land. Which statement best explains why the surface wind is from sea to land?",
        difficulty: 3,
        skillTags: ["sea_breeze", "diagram_reasoning"],
        figure: breezeFigure,
        choices: [
          wrong("Water is always hotter than land in daytime.", "The figure shows land warming more strongly."),
          wrong("Air moves from high temperature to low temperature directly without pressure change.", "The surface wind is explained through pressure difference caused by rising warm air."),
          correct("Rising warm air over land creates a lower-pressure region near the surface."),
          wrong("The Sun pulls air from sea to land by gravity.", "Solar heating causes pressure differences; the Sun's gravity is not the explanation here."),
        ],
        hints: [
          "Look at the rising air over land.",
          "When air rises, surface pressure there becomes lower.",
          "Air moves from relatively higher pressure to lower pressure near the surface.",
        ],
        solution: [
          step(1, "Land heats strongly in daytime, so air over land warms and rises."),
          step(2, "This creates lower pressure near land, so cooler sea air moves toward land."),
        ],
      },
      {
        questionLatex:
          "At night near the coast, land cools faster than sea water. Which breeze is expected near the surface?",
        difficulty: 2,
        skillTags: ["land_breeze", "differential_heating"],
        choices: [
          wrong("Sea breeze, from sea to land", "That is the usual daytime pattern."),
          wrong("No breeze, because the Sun is absent", "Unequal cooling can still create pressure differences at night."),
          wrong("Vertical breeze only above the sea", "Surface air can move horizontally."),
          correct("Land breeze, from land to sea"),
        ],
        hints: [
          "At night land cools faster.",
          "The sea remains relatively warmer.",
          "Surface air tends to move from cooler land toward warmer sea.",
        ],
        solution: [
          step(1, "At night, land becomes cooler faster than sea water."),
          step(2, "Surface air moves from land to sea, producing land breeze."),
        ],
      },
      {
        questionLatex:
          "Which pair correctly matches the cause and effect in wind formation?",
        difficulty: 2,
        skillTags: ["wind_formation", "pressure_difference"],
        choices: [
          correct("Unequal heating creates pressure differences; air moves from higher to lower pressure."),
          wrong("Equal heating creates pressure differences; air stops moving.", "Equal heating reduces pressure contrast."),
          wrong("Only Earth's rotation creates all local winds.", "Rotation affects large-scale winds, but local breezes are caused mainly by unequal heating."),
          wrong("Air always moves from lower pressure to higher pressure near the surface.", "Near the surface, air generally moves from higher pressure to lower pressure."),
        ],
        hints: [
          "Wind is moving air.",
          "Unequal heating affects air density and pressure.",
          "Surface wind generally moves from high pressure toward low pressure.",
        ],
        solution: [
          step(1, "Unequal heating makes some air warmer and less dense, so it rises."),
          step(2, "This sets up pressure differences that drive wind."),
        ],
      },
      {
        questionLatex:
          "On a sunny afternoon, mountain slopes heat strongly and the air near the slope moves upward along the slope. This local wind is an example of",
        difficulty: 3,
        skillTags: ["valley_breeze", "local_winds"],
        choices: [
          wrong("land breeze", "Land breeze is a coastal night-time wind from land to sea."),
          wrong("sea breeze", "Sea breeze involves sea and land near a coast."),
          correct("valley breeze"),
          wrong("cyclone formation", "This is a local mountain-valley circulation, not a cyclone."),
        ],
        hints: [
          "The setting is a mountain-valley region.",
          "Daytime warming can drive air upslope.",
          "Upslope daytime flow is valley breeze.",
        ],
        solution: [
          step(1, "The example involves warm air moving upslope during the day."),
          step(2, "This local daytime wind is called a valley breeze."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "A weather report says that wind is strong over an open field. What motion of air is being described?",
        difficulty: 1,
        skillTags: ["wind_definition"],
        parts: [part("a", "Define wind.", 1)],
        hints: [
          "Wind involves air.",
          "It is not just heat.",
          "Wind is air in motion.",
        ],
        rubric: rubric([criterion("a", 1, "Defines wind as moving air or air in motion.")]),
        commonErrors: ["Writing sunlight instead of moving air."],
        workedSolution: [
          solutionPart("a", "Wind is air in motion."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the daytime sea-breeze diagram to explain the direction of surface wind.",
        difficulty: 3,
        skillTags: ["sea_breeze", "diagram_explanation"],
        figure: breezeFigure,
        parts: [
          part("a", "Where does warm air rise?", 1),
          part("b", "What is the direction of surface wind?", 1),
          part("c", "Give the reason.", 1),
        ],
        hints: [
          "The land is warmer in the figure.",
          "Warm air rises over warmer land.",
          "Cooler sea air moves into the lower-pressure region.",
        ],
        rubric: rubric([
          criterion("a", 1, "States warm air rises over land."),
          criterion("b", 1, "States surface wind moves from sea to land."),
          criterion("c", 1, "Explains pressure difference/replacement of rising warm air."),
        ]),
        commonErrors: [
          "Reading the upper return flow as the surface wind.",
          "Saying wind moves only because water is blue in the diagram.",
        ],
        workedSolution: [
          solutionPart("a", "Warm air rises over the land."),
          solutionPart("b", "The surface wind blows from sea to land."),
          solutionPart("c", "Rising warm air lowers pressure near the land surface, so cooler sea air moves in."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why coastal wind direction can reverse between afternoon and late night.",
        difficulty: 3,
        skillTags: ["land_breeze", "sea_breeze", "differential_heating"],
        parts: [
          part("a", "Explain the afternoon direction.", 1),
          part("b", "Explain the late-night direction.", 1),
        ],
        hints: [
          "Land and water heat and cool at different rates.",
          "Afternoon land is usually warmer.",
          "At night land cools faster than sea water.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains sea breeze from sea to land in afternoon."),
          criterion("b", 1, "Explains land breeze from land to sea at night."),
        ]),
        commonErrors: [
          "Using the same wind direction for day and night.",
          "Ignoring unequal cooling at night.",
        ],
        workedSolution: [
          solutionPart("a", "In the afternoon, land is warmer, air over land rises, and cooler sea air moves toward land."),
          solutionPart("b", "Late at night, land cools faster while sea water stays relatively warmer, so surface air moves from land toward sea."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A class measures air temperature at a sandy playground and near a pond at noon. The playground is warmer, and students feel a breeze from the pond toward the playground.",
        difficulty: 4,
        skillTags: ["differential_heating", "wind_prediction", "data_reasoning"],
        parts: [
          part("a", "Which surface heated more?", 1),
          part("b", "Where is air more likely to rise?", 1),
          part("c", "Explain the breeze direction.", 1),
          part("d", "Name the coastal breeze that is similar to this pattern.", 1),
        ],
        hints: [
          "The warmer surface warms the air above it.",
          "Warm air becomes less dense and rises.",
          "Cooler air from the pond can move toward the warmer ground.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies the sandy playground."),
          criterion("b", 1, "States air rises over the warmer playground."),
          criterion("c", 1, "Explains that cooler air moves from pond to playground due to pressure difference/replacement."),
          criterion("d", 1, "Names sea breeze or a sea-breeze-like pattern."),
        ]),
        commonErrors: [
          "Saying air rises over the pond because water is present.",
          "Not linking the breeze to unequal heating.",
        ],
        workedSolution: [
          solutionPart("a", "The sandy playground heated more."),
          solutionPart("b", "Air is more likely to rise over the warmer playground."),
          solutionPart("c", "As warm air rises above the playground, cooler air from near the pond moves toward it near the surface."),
          solutionPart("d", "This resembles a sea breeze."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "At night in a mountain area, slopes cool faster and denser air flows down into the valley. Name this breeze and explain why the air moves downhill.",
        difficulty: 2,
        skillTags: ["mountain_breeze", "local_winds"],
        parts: [
          part("a", "Name the breeze.", 1),
          part("b", "Explain why the air moves downhill.", 1),
        ],
        hints: [
          "This is a night-time mountain-valley wind.",
          "Cooler air is denser than warmer air.",
          "Dense air tends to flow downslope under gravity.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names mountain breeze."),
          criterion("b", 1, "Explains that cooled, denser air flows down the mountain slope into the valley."),
        ]),
        commonErrors: [
          "Calling the night-time downslope wind a valley breeze.",
          "Ignoring that cooled air is denser.",
        ],
        workedSolution: [
          solutionPart("a", "This is a mountain breeze."),
          solutionPart("b", "At night, mountain slopes cool quickly. The air near them becomes cooler and denser, so it flows down the slope into the valley."),
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Biogeochemical Cycles",
    subtopic:
      "Water, carbon, oxygen and nitrogen cycles as matter movement between living and non-living parts.",
    mc: [
      {
        questionLatex:
          "Which pair of processes best shows the oxygen cycle between plants, animals and the atmosphere?",
        difficulty: 2,
        skillTags: ["oxygen_cycle", "photosynthesis_respiration"],
        choices: [
          wrong("evaporation and condensation", "Those processes mainly describe the water cycle."),
          wrong("nitrogen fixation and denitrification", "Those processes belong to the nitrogen cycle."),
          wrong("melting and freezing of glaciers", "Those are changes of state in the water cycle."),
          correct("photosynthesis releases oxygen; respiration uses oxygen"),
        ],
        hints: [
          "Look for a process that adds oxygen to air and one that removes oxygen from air.",
          "Green plants release oxygen during photosynthesis.",
          "Respiration uses oxygen and returns carbon dioxide, linking the oxygen and carbon cycles.",
        ],
        solution: [
          step(1, "Photosynthesis by green plants releases oxygen into the atmosphere."),
          step(2, "Respiration by plants, animals and many microbes uses oxygen."),
        ],
      },
      {
        questionLatex:
          "Which process returns water vapour from plant leaves to the atmosphere?",
        difficulty: 2,
        skillTags: ["water_cycle", "transpiration"],
        choices: [
          correct("transpiration"),
          wrong("combustion", "Combustion burns fuel and is more directly connected with carbon dioxide release."),
          wrong("nitrogen fixation", "Nitrogen fixation converts atmospheric nitrogen into usable nitrogen compounds."),
          wrong("decomposition only", "Decomposition can release substances, but water vapour loss from leaves is transpiration."),
        ],
        hints: [
          "The process is specific to plants.",
          "Water leaves through aerial parts, mainly leaves.",
          "This loss of water vapour is transpiration.",
        ],
        solution: [
          step(1, "Plants lose water vapour mainly through leaves."),
          step(2, "This process is called transpiration."),
        ],
      },
      {
        questionLatex:
          "Which process in the carbon cycle removes carbon dioxide from the atmosphere and stores carbon in food molecules?",
        difficulty: 2,
        skillTags: ["carbon_cycle", "photosynthesis"],
        choices: [
          wrong("respiration", "Respiration usually releases carbon dioxide."),
          correct("photosynthesis"),
          wrong("combustion", "Combustion releases carbon dioxide."),
          wrong("denitrification", "Denitrification belongs to the nitrogen cycle."),
        ],
        hints: [
          "Green plants use carbon dioxide.",
          "The process also uses sunlight.",
          "Photosynthesis makes food and removes carbon dioxide.",
        ],
        solution: [
          step(1, "Photosynthesis uses carbon dioxide from air."),
          step(2, "The carbon becomes part of food molecules in plants."),
        ],
      },
      {
        questionLatex:
          "Atmospheric nitrogen is abundant, but most plants cannot use it directly. The step that makes nitrogen available to plants is mainly",
        difficulty: 3,
        skillTags: ["nitrogen_cycle", "nitrogen_fixation"],
        choices: [
          correct("conversion of nitrogen gas into usable nitrogen compounds"),
          wrong("evaporation of nitrogen", "Evaporation is a water-cycle process and does not make nitrogen plant-available."),
          wrong("condensation of oxygen", "This is not the nitrogen-conversion step."),
          wrong("reflection of nitrogen by clouds", "Reflection is about radiation, not nutrient conversion."),
        ],
        hints: [
          "Plants need nitrogen in usable compounds.",
          "Atmospheric nitrogen gas is not directly usable by most plants.",
          "Nitrogen fixation converts nitrogen gas into useful compounds.",
        ],
        solution: [
          step(1, "Most plants cannot directly use atmospheric nitrogen gas."),
          step(2, "Nitrogen fixation converts nitrogen gas into usable nitrogen compounds."),
        ],
      },
      {
        questionLatex:
          "In the cycle figure, decomposers are important because they",
        difficulty: 3,
        skillTags: ["decomposition", "cycle_diagram"],
        figure: biogeochemicalCycleFigure,
        choices: [
          wrong("stop matter from returning to soil and water", "Decomposers help return matter to non-living stores."),
          wrong("make solar radiation disappear", "They act on dead organic matter, not on sunlight."),
          wrong("convert all oxygen into nitrogen", "That is not their role in the diagram."),
          correct("break down dead matter and return nutrients to the environment"),
        ],
        hints: [
          "Decomposers act on dead plants and animals.",
          "They help recycle matter.",
          "The returned matter can enter soil and water.",
        ],
        solution: [
          step(1, "Decomposers break down dead organic material."),
          step(2, "This returns nutrients to non-living parts such as soil and water."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the process by which water vapour changes into liquid droplets in clouds.",
        difficulty: 1,
        skillTags: ["water_cycle", "condensation"],
        parts: [part("a", "Write the process name.", 1)],
        hints: [
          "Water vapour cools.",
          "Liquid droplets form.",
          "The process is condensation.",
        ],
        rubric: rubric([criterion("a", 1, "Names condensation.")]),
        commonErrors: ["Writing evaporation instead of condensation."],
        workedSolution: [
          solutionPart("a", "Water vapour changes into liquid droplets by condensation."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain how photosynthesis and respiration together help cycle carbon between the atmosphere and living organisms.",
        difficulty: 3,
        skillTags: ["carbon_cycle", "photosynthesis_respiration"],
        parts: [
          part("a", "Explain the role of photosynthesis.", 1),
          part("b", "Explain the role of respiration.", 1),
        ],
        hints: [
          "Photosynthesis uses carbon dioxide.",
          "Respiration releases carbon dioxide.",
          "Together they move carbon between air and organisms.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that photosynthesis removes carbon dioxide and stores carbon in food."),
          criterion("b", 1, "States that respiration releases carbon dioxide back to the atmosphere."),
        ]),
        commonErrors: [
          "Saying both processes remove carbon dioxide.",
          "Ignoring that carbon becomes part of food molecules.",
        ],
        workedSolution: [
          solutionPart("a", "In photosynthesis, plants take carbon dioxide from the atmosphere and make food molecules."),
          solutionPart("b", "During respiration, organisms break down food and release carbon dioxide back to the atmosphere."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A farmer adds compost made from dead leaves to a field. Explain how this connects the biosphere with soil nutrients.",
        difficulty: 3,
        skillTags: ["decomposition", "nutrient_cycle"],
        parts: [part("a", "Explain the connection.", 2)],
        hints: [
          "Dead leaves were once living material.",
          "Decomposers break them down.",
          "Nutrients return to soil.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies dead leaves as organic matter from the biosphere."),
          criterion("a", 1, "Explains decomposition returns nutrients to soil/geosphere for plant use."),
        ]),
        commonErrors: [
          "Saying compost is only a physical support.",
          "Leaving out decomposers or nutrient return.",
        ],
        workedSolution: [
          solutionPart("a", "Dead leaves are organic matter from the biosphere. Decomposers break them down and return nutrients to the soil, where plants can use them again."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "In a school garden, fallen leaves collect under trees. Earthworms and microbes break the leaves down. After some weeks, the soil becomes darker and supports better plant growth.",
        difficulty: 4,
        skillTags: ["decomposition", "cycle_reasoning", "soil_nutrients"],
        parts: [
          part("a", "Name the organisms mainly responsible for breakdown.", 1),
          part("b", "Which non-living store receives nutrients?", 1),
          part("c", "Why can plant growth improve?", 1),
          part("d", "Which broad type of cycle is being illustrated?", 1),
        ],
        hints: [
          "Microbes and earthworms help break down dead matter.",
          "The dark material mixes with soil.",
          "Matter is recycled between living and non-living parts.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names decomposers or microbes/earthworms as decomposer organisms."),
          criterion("b", 1, "Identifies soil as the non-living nutrient store."),
          criterion("c", 1, "Explains that nutrients become available for plants."),
          criterion("d", 1, "Identifies a biogeochemical or nutrient cycle."),
        ]),
        commonErrors: [
          "Calling decomposition a loss of all matter.",
          "Ignoring nutrient availability to plants.",
        ],
        workedSolution: [
          solutionPart("a", "Decomposers such as microbes, along with organisms like earthworms, break down the leaves."),
          solutionPart("b", "The soil receives the returned nutrients."),
          solutionPart("c", "Plant growth can improve because nutrients become available again."),
          solutionPart("d", "This illustrates a biogeochemical or nutrient cycle."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the cycle figure to explain why matter does not move in a one-way path from plants to animals only.",
        difficulty: 3,
        skillTags: ["cycle_diagram", "matter_recycling"],
        figure: biogeochemicalCycleFigure,
        parts: [part("a", "Explain using at least two arrows or boxes from the figure.", 3)],
        hints: [
          "Look for a loop, not a single arrow.",
          "Animals, decomposers and soil/water are connected.",
          "Matter can return to plants through non-living stores.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that matter cycles rather than moves one way."),
          criterion("a", 1, "Uses decomposers and soil/water in the explanation."),
          criterion("a", 1, "Explains that plants can take matter again from non-living stores."),
        ]),
        commonErrors: [
          "Only saying animals eat plants.",
          "Ignoring decomposers in the cycle.",
        ],
        workedSolution: [
          solutionPart("a", "Matter can move from plants to animals, but dead matter and wastes are broken down by decomposers. Nutrients return to soil or water and can be taken up by plants again, so the path is a cycle."),
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Human Impact on Earth Systems",
    subtopic:
      "Human influence on cycles, air and water quality, land use, climate and environmental balance.",
    mc: [
      {
        questionLatex:
          "Large-scale burning of fossil fuels most directly increases the amount of which gas in the atmosphere?",
        difficulty: 2,
        skillTags: ["human_impact", "carbon_cycle"],
        choices: [
          correct("carbon dioxide"),
          wrong("nitrogen gas only", "Nitrogen gas is abundant but burning fossil fuels mainly adds carbon dioxide."),
          wrong("argon", "Argon is not the main product linked with fossil-fuel combustion."),
          wrong("water as ice", "Fossil-fuel burning does not directly add ice to the atmosphere."),
        ],
        hints: [
          "Fossil fuels contain carbon.",
          "Combustion combines carbon with oxygen.",
          "Carbon dioxide is released.",
        ],
        solution: [
          step(1, "Fossil fuels contain carbon."),
          step(2, "Burning them releases carbon dioxide into the atmosphere."),
        ],
      },
      {
        questionLatex:
          "A city replaces many trees with concrete roads and buildings. Which effect is most scientifically reasonable?",
        difficulty: 3,
        skillTags: ["urban_heating", "human_impact"],
        choices: [
          wrong("The area must become colder because concrete is artificial.", "Artificial material does not automatically mean colder."),
          correct("The area may absorb more heat and have less cooling by transpiration."),
          wrong("The water cycle stops globally.", "Local changes do not stop the entire global water cycle."),
          wrong("Photosynthesis increases because there are fewer trees.", "Fewer trees usually means less local photosynthesis."),
        ],
        hints: [
          "Trees provide shade and transpiration.",
          "Concrete surfaces can absorb and store heat.",
          "Think about local heating and water vapour release.",
        ],
        solution: [
          step(1, "Removing trees reduces shade and transpiration."),
          step(2, "Concrete can absorb and store heat, so local warming can increase."),
        ],
      },
      {
        questionLatex:
          "Which action best reduces human disruption of the carbon cycle?",
        difficulty: 2,
        skillTags: ["carbon_cycle", "mitigation"],
        choices: [
          wrong("Burn more coal to remove carbon dioxide", "Burning coal releases more carbon dioxide."),
          wrong("Cut forests faster so more land is exposed", "Deforestation usually reduces carbon uptake and harms soil."),
          correct("Plant and protect trees while reducing fossil-fuel burning"),
          wrong("Cover all soil with plastic sheets permanently", "This can harm soil organisms and water infiltration."),
        ],
        hints: [
          "Trees remove carbon dioxide during photosynthesis.",
          "Fossil-fuel burning adds carbon dioxide.",
          "A good action should reduce addition and support removal.",
        ],
        solution: [
          step(1, "Reducing fossil-fuel burning lowers carbon dioxide release."),
          step(2, "Protecting trees supports photosynthesis and carbon storage."),
        ],
      },
      {
        questionLatex:
          "A lake receives untreated sewage. Which Earth-system effect is most likely?",
        difficulty: 3,
        skillTags: ["water_pollution", "ecosystem_impact"],
        choices: [
          wrong("Only the geosphere changes; organisms are unaffected.", "Water pollution can affect living organisms."),
          wrong("The atmosphere disappears above the lake.", "Pollution does not remove the atmosphere."),
          wrong("The cryosphere expands immediately.", "Untreated sewage does not directly create ice."),
          correct("Water quality decreases and aquatic organisms may be harmed."),
        ],
        hints: [
          "The lake is part of the hydrosphere.",
          "Aquatic organisms are part of the biosphere.",
          "Pollution can connect these two spheres.",
        ],
        solution: [
          step(1, "Untreated sewage pollutes water in the hydrosphere."),
          step(2, "Polluted water can harm organisms in the biosphere."),
        ],
      },
      {
        questionLatex:
          "Which option gives the best systems-based reason for conserving wetlands?",
        difficulty: 4,
        skillTags: ["wetland_conservation", "systems_reasoning"],
        choices: [
          correct("Wetlands store water, support organisms and influence local nutrient cycling."),
          wrong("Wetlands are useful only because they look attractive.", "This ignores their ecological and hydrological roles."),
          wrong("Wetlands separate all Earth spheres from each other.", "Wetlands connect water, soil, air and living organisms."),
          wrong("Wetlands prevent all weather changes everywhere.", "Wetlands can influence local systems but cannot prevent all weather changes globally."),
        ],
        hints: [
          "Wetlands involve water, soil and living organisms.",
          "They can store water and support biodiversity.",
          "A systems reason should mention more than one role.",
        ],
        solution: [
          step(1, "Wetlands are connected parts of the hydrosphere, geosphere and biosphere."),
          step(2, "They can store water, support organisms and help nutrient cycling."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name one human activity that increases carbon dioxide in air.",
        difficulty: 1,
        skillTags: ["human_impact", "carbon_dioxide"],
        parts: [part("a", "Write one activity.", 1)],
        hints: [
          "Think of carbon-containing fuels.",
          "Combustion is a common source.",
          "Vehicles and coal burning are examples.",
        ],
        rubric: rubric([criterion("a", 1, "Names a valid activity such as burning fossil fuels, vehicle emissions, coal burning or deforestation.")]),
        commonErrors: ["Writing breathing only as the main human activity being asked here."],
        workedSolution: [
          solutionPart("a", "Burning fossil fuels in vehicles, factories or power plants increases carbon dioxide in air."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A village protects a patch of forest near a stream. Give two Earth-system benefits of this action.",
        difficulty: 2,
        skillTags: ["forest_conservation", "earth_systems"],
        parts: [
          part("a", "Give one benefit linked with soil or water.", 1),
          part("b", "Give one benefit linked with living organisms or air.", 1),
        ],
        hints: [
          "Tree roots hold soil.",
          "Forests support organisms.",
          "Plants exchange gases with air.",
        ],
        rubric: rubric([
          criterion("a", 1, "Gives a valid soil/water benefit such as reduced erosion or better water retention."),
          criterion("b", 1, "Gives a valid biosphere/atmosphere benefit such as habitat, carbon dioxide uptake or oxygen release."),
        ]),
        commonErrors: [
          "Giving two benefits from only one sphere without explaining.",
          "Saying forests have no effect on streams.",
        ],
        workedSolution: [
          solutionPart("a", "Roots can reduce soil erosion and help keep the stream less muddy."),
          solutionPart("b", "The forest provides habitat and plants take in carbon dioxide during photosynthesis."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain how excessive use of nitrogen fertilisers can disturb an Earth system even though nitrogen is needed by plants.",
        difficulty: 4,
        skillTags: ["nitrogen_cycle", "fertiliser_impact"],
        parts: [part("a", "Give a balanced explanation.", 3)],
        hints: [
          "Nitrogen is useful in proper amounts.",
          "Excess fertiliser can be washed away by rain.",
          "Runoff can affect water bodies and organisms.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that plants need nitrogen compounds for growth."),
          criterion("a", 1, "Explains that excess fertiliser can enter water through runoff/leaching."),
          criterion("a", 1, "States a valid harm such as water pollution or harm to aquatic organisms."),
        ]),
        commonErrors: [
          "Saying all fertiliser use is harmful without qualification.",
          "Ignoring movement from soil to water.",
        ],
        workedSolution: [
          solutionPart("a", "Plants need nitrogen compounds, but too much fertiliser can be washed from soil into ponds, lakes or rivers. This can pollute water and disturb aquatic organisms."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A town observes hotter afternoons after many open grounds are paved and tree cover is reduced. Rainwater also runs off faster and nearby drains overflow more often.",
        difficulty: 5,
        skillTags: ["urban_systems", "human_impact", "synthesis"],
        parts: [
          part("a", "Identify one change in the biosphere.", 1),
          part("b", "Explain one reason for hotter afternoons.", 1),
          part("c", "Explain why runoff increased.", 1),
          part("d", "Suggest one solution that addresses both heating and runoff.", 1),
        ],
        hints: [
          "Tree cover is part of the biosphere.",
          "Paved surfaces absorb heat and reduce infiltration.",
          "A good solution should improve both shade/cooling and water absorption.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies reduced tree cover/vegetation."),
          criterion("b", 1, "Explains hotter afternoons using increased absorption, reduced shade or reduced transpiration."),
          criterion("c", 1, "Explains that paved surfaces reduce infiltration and increase surface runoff."),
          criterion("d", 1, "Suggests a valid combined solution such as planting trees, restoring open soil, rain gardens or permeable paving."),
        ]),
        commonErrors: [
          "Treating heat and runoff as unrelated problems.",
          "Suggesting only taller buildings without addressing surface heating or water flow.",
        ],
        workedSolution: [
          solutionPart("a", "Tree cover has decreased, so the biosphere changed."),
          solutionPart("b", "Paved surfaces can absorb and store heat, while fewer trees mean less shade and transpiration."),
          solutionPart("c", "Paving reduces water infiltration into soil, so more rainwater flows quickly over the surface."),
          solutionPart("d", "Planting trees and using permeable surfaces or rain gardens can reduce heating and allow more water to soak in."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Why is a single action such as planting trees not a complete solution to every environmental problem?",
        difficulty: 3,
        skillTags: ["systems_thinking", "environmental_solutions"],
        parts: [part("a", "Explain using systems thinking.", 2)],
        hints: [
          "Earth systems have many interacting parts.",
          "Planting trees helps several processes.",
          "Some problems also need changes in pollution, water use, waste or fuel use.",
        ],
        rubric: rubric([
          criterion("a", 1, "Recognises that planting trees has real benefits."),
          criterion("a", 1, "Explains that different causes require multiple actions."),
        ]),
        commonErrors: [
          "Saying planting trees is useless.",
          "Claiming one action fixes all air, water, soil and climate problems.",
        ],
        workedSolution: [
          solutionPart("a", "Planting trees can reduce erosion, support habitats and take in carbon dioxide. But Earth systems are complex, so problems caused by sewage, plastic waste, overuse of fertilisers or fossil-fuel burning also need specific actions."),
        ],
      },
    ],
  },
];

export const earthAsSystemTopics: Topic[] = topicSeeds.map(makeTopic);
