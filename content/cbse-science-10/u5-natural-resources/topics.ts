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
const UNIT = "u5-natural-resources";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
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
  return topicCode.replace(".", "-");
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

function calibrateNaturalResourcesDifficulty({
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
  const singleConcept =
    /\b(identify|which statement|which organism|which waste|which gas|is called|best describes)\b/.test(
      text,
    ) &&
    !/\b(case|data|calculate|justify|plan|sequence|compare|predict|explain why)\b/.test(
      text,
    );

  if (kind === "mc_single" && difficulty >= 3 && singleConcept) return 2;
  if (kind === "frq" && responseType === "saq" && difficulty >= 4 && singleConcept) {
    return 3;
  }
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ?? "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the ecosystem role, trophic level, waste property, pollutant path, or ozone clue before deciding.${checkStep} The correct choice is ${correctText}.`;
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
        "incorrect_cbse_class10_science_natural_resources_reasoning"),
  })) as McChoice[];

  const correctLetter = choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateNaturalResourcesDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_an_environment_keyword_without_tracking_matter_energy_or_persistence",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateNaturalResourcesDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_an_environmental_action_without_linking_it_to_ecosystem_evidence",
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

const pondEcosystemFigure: ItemFigure = {
  type: "svg",
  title: "Pond ecosystem components",
  description:
    "A pond scene labels sunlight, water, algae, small fish, large fish and bacteria in bottom mud.",
  svg: `<svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="420" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">pond ecosystem</text>
  <circle cx="92" cy="76" r="28" fill="#fde68a" stroke="#f59e0b" stroke-width="3"/>
  <text x="92" y="126" text-anchor="middle" font-family="Arial" font-size="16" fill="#92400e">sunlight</text>
  <path d="M70 240 C150 205 230 226 308 208 C408 184 504 216 650 194 L650 340 L70 340 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <path d="M70 342 H650" stroke="#92400e" stroke-width="8"/>
  <text x="118" y="292" font-family="Arial" font-size="16" fill="#14532d">algae</text>
  <path d="M126 264 C112 244 128 230 116 210" stroke="#16a34a" stroke-width="5" fill="none"/>
  <path d="M150 264 C164 244 150 232 162 212" stroke="#16a34a" stroke-width="5" fill="none"/>
  <g fill="#60a5fa" stroke="#1d4ed8" stroke-width="2">
    <ellipse cx="324" cy="262" rx="42" ry="18"/>
    <path d="M282 262 L252 244 L252 280 Z"/>
    <circle cx="342" cy="257" r="3" fill="#0f172a"/>
  </g>
  <text x="324" y="232" text-anchor="middle" font-family="Arial" font-size="16" fill="#1e3a8a">small fish</text>
  <g fill="#93c5fd" stroke="#1e40af" stroke-width="3">
    <ellipse cx="520" cy="270" rx="58" ry="24"/>
    <path d="M462 270 L424 246 L424 294 Z"/>
    <circle cx="545" cy="262" r="4" fill="#0f172a"/>
  </g>
  <text x="520" y="230" text-anchor="middle" font-family="Arial" font-size="16" fill="#1e3a8a">large fish</text>
  <g fill="#a16207">
    <circle cx="232" cy="362" r="8"/>
    <circle cx="255" cy="372" r="6"/>
    <circle cx="284" cy="358" r="7"/>
  </g>
  <text x="258" y="394" text-anchor="middle" font-family="Arial" font-size="16" fill="#78350f">bacteria in mud</text>
  <text x="630" y="314" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">water</text>
</svg>`,
};

const energyPyramidFigure: ItemFigure = {
  type: "svg",
  title: "Energy transfer in a food chain",
  description:
    "A four-level trophic pyramid shows producers, primary consumers, secondary consumers and tertiary consumers with decreasing energy.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">energy available at trophic levels</text>
  <polygon points="120,360 600,360 540,292 180,292" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <polygon points="180,290 540,290 480,224 240,224" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <polygon points="240,222 480,222 430,156 290,156" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
  <polygon points="290,154 430,154 390,92 330,92" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2"/>
  <text x="360" y="333" text-anchor="middle" font-family="Arial" font-size="17" fill="#14532d">producers: 10000 J</text>
  <text x="360" y="264" text-anchor="middle" font-family="Arial" font-size="17" fill="#92400e">primary consumers: 1000 J</text>
  <text x="360" y="197" text-anchor="middle" font-family="Arial" font-size="17" fill="#991b1b">secondary consumers: 100 J</text>
  <text x="360" y="129" text-anchor="middle" font-family="Arial" font-size="17" fill="#312e81">tertiary consumers: 10 J</text>
  <text x="86" y="372" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">more energy</text>
  <text x="642" y="105" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">less energy</text>
</svg>`,
};

const wasteSortingFigure: ItemFigure = {
  type: "svg",
  title: "Waste sorting at source",
  description:
    "Three labelled bins collect wet biodegradable waste, dry recyclable waste and hazardous household waste.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">segregation of household waste</text>
  <g font-family="Arial" font-size="16" text-anchor="middle">
    <rect x="82" y="110" width="150" height="170" rx="10" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <rect x="104" y="86" width="106" height="28" rx="8" fill="#bbf7d0" stroke="#16a34a" stroke-width="3"/>
    <text x="157" y="150" fill="#14532d">wet waste</text>
    <text x="157" y="184" fill="#14532d">vegetable peels</text>
    <text x="157" y="214" fill="#14532d">leftover food</text>
    <text x="157" y="320" fill="#14532d">compost</text>
    <rect x="285" y="110" width="150" height="170" rx="10" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
    <rect x="307" y="86" width="106" height="28" rx="8" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
    <text x="360" y="150" fill="#1e3a8a">dry waste</text>
    <text x="360" y="184" fill="#1e3a8a">paper</text>
    <text x="360" y="214" fill="#1e3a8a">metal cans</text>
    <text x="360" y="320" fill="#1e3a8a">recycle</text>
    <rect x="488" y="110" width="150" height="170" rx="10" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
    <rect x="510" y="86" width="106" height="28" rx="8" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
    <text x="563" y="150" fill="#7f1d1d">hazardous</text>
    <text x="563" y="184" fill="#7f1d1d">cells</text>
    <text x="563" y="214" fill="#7f1d1d">paint</text>
    <text x="563" y="320" fill="#7f1d1d">safe disposal</text>
  </g>
</svg>`,
};

const biomagnificationFigure: ItemFigure = {
  type: "svg",
  title: "Increase of pesticide concentration in a food chain",
  description:
    "A water food chain shows pesticide concentration increasing from plankton to fish-eating bird.",
  svg: `<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="360" fill="#ffffff"/>
  <defs>
    <marker id="bio-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#334155"/>
    </marker>
  </defs>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">persistent pesticide in a food chain</text>
  <g font-family="Arial" text-anchor="middle">
    <circle cx="95" cy="170" r="38" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <text x="95" y="162" font-size="16" fill="#14532d">plankton</text>
    <text x="95" y="190" font-size="15" fill="#14532d">0.02 ppm</text>
    <line x1="142" y1="170" x2="218" y2="170" stroke="#334155" stroke-width="3" marker-end="url(#bio-arrow)"/>
    <ellipse cx="275" cy="170" rx="50" ry="25" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
    <path d="M225 170 L190 148 L190 192 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
    <text x="275" y="240" font-size="16" fill="#1e3a8a">small fish</text>
    <text x="275" y="268" font-size="15" fill="#1e3a8a">0.2 ppm</text>
    <line x1="334" y1="170" x2="414" y2="170" stroke="#334155" stroke-width="3" marker-end="url(#bio-arrow)"/>
    <ellipse cx="480" cy="170" rx="64" ry="32" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
    <path d="M416 170 L374 144 L374 196 Z" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
    <text x="480" y="240" font-size="16" fill="#991b1b">large fish</text>
    <text x="480" y="268" font-size="15" fill="#991b1b">2 ppm</text>
    <line x1="554" y1="170" x2="626" y2="170" stroke="#334155" stroke-width="3" marker-end="url(#bio-arrow)"/>
    <path d="M660 128 C690 132 706 152 704 174 C702 204 672 216 642 200 C616 186 612 154 632 138 Z" fill="#e0e7ff" stroke="#4f46e5" stroke-width="3"/>
    <path d="M678 136 L714 118 L700 154 Z" fill="#e0e7ff" stroke="#4f46e5" stroke-width="3"/>
    <text x="666" y="240" font-size="16" fill="#312e81">bird</text>
    <text x="666" y="268" font-size="15" fill="#312e81">20 ppm</text>
  </g>
</svg>`,
};

const ozoneLayerFigure: ItemFigure = {
  type: "svg",
  title: "Ozone layer and ultraviolet radiation",
  description:
    "Sunlight, an ozone layer, a CFC source and ultraviolet rays are shown above Earth's surface.",
  svg: `<svg viewBox="0 0 760 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="420" fill="#ffffff"/>
  <defs>
    <marker id="uv-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#7c3aed"/>
    </marker>
    <marker id="cfc-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#dc2626"/>
    </marker>
  </defs>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" fill="#0f172a">ozone layer protects living organisms</text>
  <circle cx="100" cy="88" r="34" fill="#fde68a" stroke="#f59e0b" stroke-width="3"/>
  <text x="100" y="142" text-anchor="middle" font-family="Arial" font-size="16" fill="#92400e">sun</text>
  <path d="M82 246 C210 210 330 250 456 216 C574 186 668 210 726 186" fill="none" stroke="#38bdf8" stroke-width="18" opacity="0.75"/>
  <text x="420" y="196" text-anchor="middle" font-family="Arial" font-size="17" fill="#075985">stratospheric ozone layer</text>
  <line x1="144" y1="100" x2="280" y2="210" stroke="#7c3aed" stroke-width="4" marker-end="url(#uv-arrow)"/>
  <line x1="120" y1="122" x2="220" y2="236" stroke="#7c3aed" stroke-width="4" marker-end="url(#uv-arrow)"/>
  <text x="228" y="116" font-family="Arial" font-size="16" fill="#5b21b6">ultraviolet rays</text>
  <rect x="88" y="318" width="92" height="52" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
  <rect x="112" y="286" width="40" height="32" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
  <text x="134" y="390" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">CFC source</text>
  <path d="M180 320 C272 276 334 246 370 216" fill="none" stroke="#dc2626" stroke-width="4" stroke-dasharray="8 8" marker-end="url(#cfc-arrow)"/>
  <path d="M0 372 C170 332 296 384 438 344 C562 310 672 344 760 310 L760 420 L0 420 Z" fill="#bbf7d0"/>
  <text x="628" y="382" text-anchor="middle" font-family="Arial" font-size="16" fill="#14532d">Earth's surface</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Ecosystems and Their Components",
    subtopic: "biotic factors, abiotic factors, producers, consumers and decomposers",
    mc: [
      {
        questionLatex: L`In a sealed terrarium, plants, insects, moist soil, air and bacteria are present. Which part is an abiotic component?`,
        difficulty: 2,
        skillTags: ["ecosystem_components", "biotic_abiotic"],
        choices: [
          wrong("plants", "Plants are living producers, so they are biotic components."),
          wrong("insects", "Insects are living organisms and are therefore biotic components."),
          correct("moist soil"),
          wrong("bacteria", "Bacteria are living decomposers, not abiotic components."),
        ],
        hints: [
          "Biotic means living or once-living.",
          "Abiotic means non-living physical or chemical factor.",
          "Soil moisture is a non-living condition in the ecosystem.",
        ],
        solution: [
          step(1, "Plants, insects and bacteria are living components."),
          step(2, "Moist soil is a non-living environmental condition."),
          step(3, "Therefore moist soil is an abiotic component."),
        ],
      },
      {
        questionLatex: L`A pond has algae, small fish, large fish and bacteria in the bottom mud. Which group mainly returns nutrients to the pond water and soil?`,
        difficulty: 2,
        skillTags: ["decomposers", "nutrient_cycling"],
        figure: pondEcosystemFigure,
        choices: [
          wrong("algae", "Algae are producers; they prepare food but do not mainly decompose dead matter."),
          correct("bacteria in the bottom mud"),
          wrong("small fish", "Small fish are consumers and depend on food made by producers."),
          wrong("large fish", "Large fish are higher consumers, not the main recyclers of nutrients."),
        ],
        hints: [
          "Look for organisms that act on dead organic matter.",
          "Decomposers break complex remains into simpler substances.",
          "Bacteria in mud carry out much of this decomposition.",
        ],
        solution: [
          step(1, "Dead plants and animals enter the mud or soil."),
          step(2, "Bacteria and fungi decompose this material."),
          step(3, "This returns simpler nutrients to the ecosystem."),
        ],
      },
      {
        questionLatex: L`Which statement best describes why green plants are called producers in an ecosystem?`,
        difficulty: 2,
        skillTags: ["producers", "photosynthesis"],
        choices: [
          correct("They convert solar energy into chemical energy in food."),
          wrong("They eat herbivores and transfer energy to the soil.", "Plants do not eat herbivores; herbivores feed on plants."),
          wrong("They decompose waste into simple minerals.", "Decomposition is mainly the role of decomposers such as bacteria and fungi."),
          wrong("They remove all consumers from the ecosystem.", "Consumers remain part of a balanced ecosystem."),
        ],
        hints: [
          "Producers are the entry point of energy into most ecosystems.",
          "Think of photosynthesis.",
          "Food made by producers stores chemical energy.",
        ],
        solution: [
          step(1, "Green plants capture sunlight during photosynthesis."),
          step(2, "They use it to make food from carbon dioxide and water."),
          step(3, "Therefore they produce chemical energy for other organisms."),
        ],
      },
      {
        questionLatex: L`Assertion (A): Decomposers are essential for the long-term stability of an ecosystem. Reason (R): Decomposers break down dead remains and recycle nutrients.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "decomposers", "ecosystem_stability"],
        choices: [
          wrong("Both A and R are true, but R does not explain A.", "The reason directly explains why decomposers help ecosystem stability."),
          correct("Both A and R are true, and R correctly explains A."),
          wrong("A is true, but R is false.", "The reason is true: decomposers recycle nutrients from dead organic matter."),
          wrong("A is false, but R is true.", "The assertion is true because nutrient cycling supports continuing growth."),
        ],
        hints: [
          "Judge the assertion first.",
          "Judge the reason separately.",
          "Then ask whether nutrient recycling explains stability.",
        ],
        solution: [
          step(1, "The assertion is true because ecosystems need nutrient cycling."),
          step(2, "The reason is true because decomposers break down dead organic matter."),
          step(3, "The reason explains the assertion, so both are true and R explains A."),
        ],
      },
      {
        questionLatex: L`A gardener removes all fungi and bacteria from a compost pit but keeps fallen leaves, moisture and air unchanged. The most likely immediate effect is`,
        difficulty: 3,
        skillTags: ["decomposition", "prediction"],
        choices: [
          wrong("leaves will decompose faster", "Removing decomposers reduces the organisms that break leaves down."),
          wrong("new leaves will photosynthesise in the pit", "Fallen leaves do not begin photosynthesis just because moisture and air remain."),
          wrong("the pit will become a complete food chain", "A food chain needs feeding relationships, not just dead leaves and air."),
          correct("dead leaves will accumulate because decomposition slows"),
        ],
        hints: [
          "Identify what fungi and bacteria do in a compost pit.",
          "Ask what happens when decomposers are removed.",
          "Dead organic matter will persist longer.",
        ],
        solution: [
          step(1, "Fungi and bacteria are major decomposers."),
          step(2, "They break fallen leaves into simpler substances."),
          step(3, "Without them, decomposition slows and dead leaves accumulate."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define an ecosystem in one sentence.`,
        difficulty: 1,
        skillTags: ["ecosystem_definition"],
        parts: [part("a", "Give a definition of ecosystem.", 1)],
        hints: [
          "Include living organisms.",
          "Include the physical environment.",
          "Mention interaction between the two.",
        ],
        rubric: rubric([criterion("a", 1, "Defines ecosystem as living organisms interacting with one another and with the physical environment.")]),
        commonErrors: [
          "Listing only animals and plants without abiotic factors.",
          "Calling an ecosystem only a place, without interactions.",
        ],
        workedSolution: [
          solutionPart("a", "An ecosystem is a system in which living organisms interact with one another and with non-living physical factors such as air, water, soil and light."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A classroom aquarium contains water, light, aquatic plants, snails, fish and microorganisms.`,
        difficulty: 3,
        skillTags: ["biotic_abiotic", "ecosystem_roles"],
        parts: [
          part("a", "Classify any two components as biotic and any two as abiotic.", 2),
          part("b", "Identify one producer and one decomposer-type component.", 2),
        ],
        hints: [
          "Biotic components are living.",
          "Abiotic components are non-living conditions.",
          "Plants produce food; microorganisms can decompose waste.",
        ],
        rubric: rubric([
          criterion("a", 2, "Correctly classifies two biotic and two abiotic components."),
          criterion("b", 2, "Identifies aquatic plants as producers and microorganisms as decomposers or decomposer-type organisms."),
        ]),
        commonErrors: [
          "Treating water as biotic because organisms live in it.",
          "Calling fish producers because they are visible in the aquarium.",
        ],
        workedSolution: [
          solutionPart("a", "Biotic examples: aquatic plants, snails, fish and microorganisms. Abiotic examples: water and light."),
          solutionPart("b", "Aquatic plants are producers because they photosynthesise. Microorganisms can act as decomposers by breaking down waste and dead matter."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why an ecosystem cannot remain stable for long if decomposers are removed.`,
        difficulty: 3,
        skillTags: ["decomposers", "nutrient_cycling"],
        parts: [
          part("a", "State what decomposers do to dead organic matter.", 1),
          part("b", "Explain how their removal affects nutrient cycling and producers.", 2),
        ],
        hints: [
          "Start from dead plants and animals.",
          "Think of nutrients locked inside dead matter.",
          "Producers need mineral nutrients for growth.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that decomposers break down dead organic matter."),
          criterion("b", 2, "Explains that nutrients stop returning to soil/water, reducing producer growth and ecosystem stability."),
        ]),
        commonErrors: [
          "Saying decomposers only clean the ecosystem, without nutrient cycling.",
          "Claiming producers can make minerals by photosynthesis.",
        ],
        workedSolution: [
          solutionPart("a", "Decomposers break down dead plants, dead animals and organic wastes into simpler substances."),
          solutionPart("b", "If decomposers are removed, nutrients remain locked in dead matter. Producers then receive fewer mineral nutrients, so the food supply and stability of the ecosystem are affected."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A survey of the pond shown in the figure records algae, small fish, large fish, bacteria in bottom mud, sunlight and water.`,
        difficulty: 3,
        skillTags: ["figure_interpretation", "ecosystem_roles", "food_chain"],
        figure: pondEcosystemFigure,
        parts: [
          part("a", "Name one producer in the pond.", 1),
          part("b", "Name one abiotic factor shown.", 1),
          part("c", "Write a possible food chain using three living components from the figure.", 2),
          part("d", "Explain why bacteria in the mud are important for the pond.", 2),
        ],
        hints: [
          "Use only living components for the food chain.",
          "Abiotic factors are non-living.",
          "Bacteria are linked with decomposition and nutrient recycling.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies algae as a producer."),
          criterion("b", 1, "Identifies water or sunlight as an abiotic factor."),
          criterion("c", 2, "Writes a correct food chain such as algae -> small fish -> large fish."),
          criterion("d", 2, "Explains decomposition and nutrient recycling by bacteria."),
        ]),
        commonErrors: [
          "Including sunlight as a living trophic level in the food chain.",
          "Calling bacteria consumers only, without mentioning decomposition.",
        ],
        workedSolution: [
          solutionPart("a", "Algae are producers because they can photosynthesise."),
          solutionPart("b", "Water or sunlight is an abiotic factor."),
          solutionPart("c", "A possible food chain is algae -> small fish -> large fish."),
          solutionPart("d", "Bacteria in the mud decompose dead matter and wastes, returning simpler nutrients to the pond ecosystem."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In a school garden, students observe grass, aphids, ladybirds, sparrows, soil, air, water and fungal growth on fallen leaves.`,
        difficulty: 2,
        skillTags: ["ecosystem_case", "classification", "decomposition"],
        parts: [
          part("a", "Identify two biotic components.", 1),
          part("b", "Identify two abiotic components.", 1),
          part("c", "Which observed component is evidence of decomposition?", 1),
          part("d", "Write one food chain possible in this garden.", 2),
        ],
        hints: [
          "Separate living organisms from non-living conditions.",
          "Fungi often grow on dead organic matter.",
          "Start the food chain from grass.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names any two living components."),
          criterion("b", 1, "Names any two non-living components."),
          criterion("c", 1, "Identifies fungal growth as evidence of decomposition."),
          criterion("d", 2, "Writes a valid chain such as grass -> aphids -> ladybirds -> sparrows."),
        ]),
        commonErrors: [
          "Calling soil biotic just because it contains organisms.",
          "Starting the food chain from a consumer instead of a producer.",
        ],
        workedSolution: [
          solutionPart("a", "Examples of biotic components are grass, aphids, ladybirds, sparrows and fungi."),
          solutionPart("b", "Examples of abiotic components are soil, air and water."),
          solutionPart("c", "Fungal growth on fallen leaves shows decomposition."),
          solutionPart("d", "One possible food chain is grass -> aphids -> ladybirds -> sparrows."),
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Food Chains and Energy Flow",
    subtopic: "trophic levels, energy transfer, food webs and ecosystem balance",
    mc: [
      {
        questionLatex: L`In the food chain grass $\rightarrow$ deer $\rightarrow$ tiger, the deer is best described as`,
        difficulty: 2,
        skillTags: ["trophic_levels", "consumer_types"],
        choices: [
          wrong("producer", "Grass is the producer because it makes food by photosynthesis."),
          correct("primary consumer"),
          wrong("secondary consumer", "A secondary consumer feeds on primary consumers; the deer feeds on grass."),
          wrong("decomposer", "A decomposer breaks down dead matter; the deer is a herbivore."),
        ],
        hints: [
          "Find what the deer eats.",
          "A herbivore that eats producers is a primary consumer.",
          "Grass is the first trophic level.",
        ],
        solution: [
          step(1, "Grass is the producer."),
          step(2, "The deer feeds directly on grass."),
          step(3, "Therefore the deer is a primary consumer."),
        ],
      },
      {
        questionLatex: L`According to the energy pyramid shown, about how much energy is available to secondary consumers?`,
        difficulty: 2,
        skillTags: ["energy_pyramid", "data_interpretation"],
        figure: energyPyramidFigure,
        choices: [
          wrong("10000 J", "That is the energy shown at the producer level."),
          wrong("1000 J", "That is the energy shown for primary consumers."),
          correct("100 J"),
          wrong("10 J", "That is the energy shown for tertiary consumers."),
        ],
        hints: [
          "Locate the label for secondary consumers.",
          "Read the energy value printed on that layer.",
          "Do not read the producer or tertiary consumer layer instead.",
        ],
        solution: [
          step(1, "The diagram labels each trophic level."),
          step(2, "The secondary consumer layer is labelled 100 J."),
          step(3, "So about 100 J is available to secondary consumers."),
        ],
      },
      {
        questionLatex: L`Long food chains are uncommon in nature mainly because`,
        difficulty: 3,
        skillTags: ["energy_loss", "food_chain_length"],
        choices: [
          wrong("producers do not contain any energy", "Producers contain the largest energy store in the chain."),
          wrong("all consumers become decomposers after one meal", "Consumers may die and decompose later, but that does not explain food-chain length."),
          wrong("energy increases at each trophic level", "Energy decreases, not increases, at each transfer."),
          correct("large amounts of energy are lost at each trophic transfer"),
        ],
        hints: [
          "Recall the 10 percent transfer idea.",
          "Most energy is lost as heat and in life processes.",
          "After several levels, too little energy remains.",
        ],
        solution: [
          step(1, "Only a small fraction of energy passes to the next trophic level."),
          step(2, "Much energy is used in life processes or lost as heat."),
          step(3, "Therefore long food chains have too little energy at higher levels."),
        ],
      },
      {
        questionLatex: L`Which statement about energy flow in an ecosystem is correct?`,
        difficulty: 2,
        skillTags: ["energy_flow", "conceptual"],
        choices: [
          correct("Energy flow is mainly unidirectional from producers to consumers."),
          wrong("Energy is recycled in the same way as minerals.", "Mineral nutrients can cycle, but energy does not cycle back in the same way."),
          wrong("Energy always increases at higher trophic levels.", "Available energy decreases at higher trophic levels."),
          wrong("Decomposers create sunlight for producers.", "Sunlight enters the ecosystem from the Sun, not from decomposers."),
        ],
        hints: [
          "Follow energy from sunlight to producers.",
          "Then follow it through consumers.",
          "Energy does not return to the Sun or producer level as usable ecosystem energy.",
        ],
        solution: [
          step(1, "Solar energy is captured by producers."),
          step(2, "It passes to consumers through feeding relationships."),
          step(3, "The flow is mainly one-way and energy is lost at each step."),
        ],
      },
      {
        questionLatex: L`A field food web has crops, insects, frogs and snakes. If most frogs are removed, the most likely short-term effect is`,
        difficulty: 3,
        skillTags: ["food_web", "prediction", "ecosystem_balance"],
        choices: [
          wrong("the insect population will immediately become zero", "Removing frogs reduces predation on insects, so insects are unlikely to become zero immediately."),
          wrong("crops will no longer need sunlight", "Crop photosynthesis still requires sunlight."),
          correct("insects may increase and cause more crop damage"),
          wrong("snakes will become producers", "Snakes remain consumers even if their prey changes in number."),
        ],
        hints: [
          "Frogs feed on insects.",
          "Removing a predator often allows prey to increase.",
          "More insects can damage crops.",
        ],
        solution: [
          step(1, "Frogs act as predators of many insects."),
          step(2, "If frogs are removed, fewer insects are eaten."),
          step(3, "So insects may increase and damage crops more."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is the first trophic level in most terrestrial food chains?`,
        difficulty: 1,
        skillTags: ["trophic_levels"],
        parts: [part("a", "Name the first trophic level.", 1)],
        hints: [
          "The first level captures sunlight.",
          "It is made of organisms that prepare food.",
          "Use the trophic-level term.",
        ],
        rubric: rubric([criterion("a", 1, "States producers or green plants as the first trophic level.")]),
        commonErrors: [
          "Writing herbivores as the first level.",
          "Writing sunlight instead of producers.",
        ],
        workedSolution: [
          solutionPart("a", "The first trophic level is formed by producers, usually green plants in a terrestrial food chain."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A food chain is: phytoplankton $\rightarrow$ zooplankton $\rightarrow$ small fish $\rightarrow$ large fish.`,
        difficulty: 3,
        skillTags: ["food_chain", "trophic_levels"],
        parts: [
          part("a", "Identify the producer and the secondary consumer.", 2),
          part("b", "Why is the large fish expected to receive less energy than the small fish?", 2),
        ],
        hints: [
          "The producer starts the chain.",
          "Count consumers after the producer.",
          "Energy decreases at each transfer.",
        ],
        rubric: rubric([
          criterion("a", 2, "Identifies phytoplankton as producer and small fish as secondary consumer."),
          criterion("b", 2, "Explains that energy is lost at each trophic transfer, so higher levels receive less energy."),
        ]),
        commonErrors: [
          "Calling zooplankton the producer because it is small.",
          "Saying the large fish gets more energy because it is larger.",
        ],
        workedSolution: [
          solutionPart("a", "Phytoplankton are producers. Zooplankton are primary consumers, so small fish are secondary consumers."),
          solutionPart("b", "At each trophic transfer, much energy is used or lost as heat. Therefore the large fish receives less available energy than the small fish."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A grassland has 50000 J of energy stored at the producer level. Assume about 10 percent of energy passes to the next trophic level.`,
        difficulty: 4,
        skillTags: ["ten_percent_law", "energy_calculation", "explanation"],
        parts: [
          part("a", "Estimate the energy available to herbivores.", 1),
          part("b", "Estimate the energy available to secondary consumers.", 1),
          part("c", "Explain why only a small part of producer energy reaches higher consumers.", 3),
        ],
        hints: [
          "Use 10 percent for each transfer.",
          "Apply it once for herbivores and again for secondary consumers.",
          "Explain loss through respiration, movement, heat and unconsumed parts.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates 5000 J for herbivores."),
          criterion("b", 1, "Calculates 500 J for secondary consumers."),
          criterion("c", 3, "Explains energy loss through life processes, heat, waste and incomplete consumption/digestion."),
        ]),
        commonErrors: [
          "Adding 10 percent instead of taking 10 percent.",
          "Applying 10 percent only once for both consumer levels.",
        ],
        workedSolution: [
          solutionPart("a", "Energy to herbivores is 10 percent of 50000 J.", "0.10 \\times 50000 = 5000\\,J"),
          solutionPart("b", "Energy to secondary consumers is 10 percent of 5000 J.", "0.10 \\times 5000 = 500\\,J"),
          solutionPart("c", "Most energy is used by organisms for respiration, movement, growth and maintenance or is lost as heat and waste. Some biomass is not eaten or not digested, so only a small fraction reaches higher trophic levels."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows energy available at four trophic levels in a food chain.`,
        difficulty: 3,
        skillTags: ["energy_pyramid", "case_data"],
        figure: energyPyramidFigure,
        parts: [
          part("a", "Which level has the maximum energy?", 1),
          part("b", "What percentage of producer energy reaches primary consumers in the figure?", 1),
          part("c", "Name the trophic level that receives 10 J.", 1),
          part("d", "Give one reason for decrease in energy at successive levels.", 2),
        ],
        hints: [
          "Read the labels on the pyramid.",
          "Compare 1000 J with 10000 J.",
          "Energy is lost during life processes.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies producers as having maximum energy."),
          criterion("b", 1, "States 10 percent."),
          criterion("c", 1, "Identifies tertiary consumers."),
          criterion("d", 2, "Gives a valid reason such as heat loss, respiration, waste or incomplete transfer."),
        ]),
        commonErrors: [
          "Reading 10 J as secondary consumer energy.",
          "Saying energy disappears rather than being transformed/lost as heat or waste.",
        ],
        workedSolution: [
          solutionPart("a", "The producer level has the maximum energy, 10000 J."),
          solutionPart("b", "Primary consumers receive 1000 J out of 10000 J, which is 10 percent."),
          solutionPart("c", "The 10 J level is the tertiary consumer level."),
          solutionPart("d", "Energy decreases because organisms use energy for life processes and much is lost as heat and waste before the next level feeds."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A village pond food web contains algae, mosquito larvae, small fish, frogs, snakes and birds. Pesticide spraying near the pond reduces mosquito larvae but also kills many small fish.`,
        difficulty: 4,
        skillTags: ["food_web", "environmental_prediction", "ecosystem_balance"],
        parts: [
          part("a", "Name the producer in this food web.", 1),
          part("b", "Predict one possible effect on fish-eating birds if small fish die in large numbers.", 1),
          part("c", "Why can pesticide use disturb more than one population?", 2),
          part("d", "Suggest one safer control idea that reduces mosquito breeding without poisoning the pond food web.", 2),
        ],
        hints: [
          "Start from the organism that photosynthesises.",
          "Small fish can be food for higher consumers such as fish-eating birds.",
          "A local action can spread through feeding relationships.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies algae as producer."),
          criterion("b", 1, "Predicts a valid effect such as fish-eating birds getting less food, moving away or declining."),
          criterion("c", 2, "Explains that organisms are linked in a food web, so killing one group affects predators/prey and may introduce toxins."),
          criterion("d", 2, "Suggests a safer method such as removing stagnant water, covering water storage or biological control without broad poisoning."),
        ]),
        commonErrors: [
          "Assuming pesticide affects only mosquitoes.",
          "Suggesting more pesticide as the only solution.",
        ],
        workedSolution: [
          solutionPart("a", "Algae are the producers."),
          solutionPart("b", "If many small fish die, fish-eating birds may get less food, move away from the pond or decline in number."),
          solutionPart("c", "Food-web organisms are connected. A pesticide can kill non-target organisms and changes in one population can affect predators and prey at other levels."),
          solutionPart("d", "A safer idea is to remove stagnant water, cover stored water, clean drains or use carefully managed biological control rather than poisoning the pond."),
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Biodegradable and Non-biodegradable Waste",
    subtopic: "waste properties, segregation, composting, recycling and safe disposal",
    mc: [
      {
        questionLatex: L`Which item is biodegradable under ordinary composting conditions?`,
        difficulty: 2,
        skillTags: ["biodegradable_waste"],
        choices: [
          correct("vegetable peels"),
          wrong("aluminium foil", "Aluminium foil does not decompose by microbial action under ordinary composting conditions."),
          wrong("plastic bottle", "Most plastic bottles persist for a long time and are not compostable."),
          wrong("button cell", "A button cell is hazardous waste and must not be composted."),
        ],
        hints: [
          "Biodegradable matter is broken down by organisms.",
          "Kitchen plant waste is usually compostable.",
          "Metals, plastics and cells are not composted.",
        ],
        solution: [
          step(1, "Vegetable peels are organic plant matter."),
          step(2, "Microorganisms can break them down."),
          step(3, "So vegetable peels are biodegradable."),
        ],
      },
      {
        questionLatex: L`The figure shows three bins for waste segregation. A used button cell should be put in the hazardous bin mainly because it`,
        difficulty: 2,
        skillTags: ["waste_segregation", "hazardous_waste"],
        figure: wasteSortingFigure,
        choices: [
          wrong("becomes manure quickly", "A cell does not compost into manure."),
          wrong("is eaten by decomposers as food", "Decomposers do not safely use cells as food."),
          wrong("is a wet biodegradable waste", "A button cell is not wet biodegradable waste."),
          correct("may release harmful chemicals if mixed with ordinary waste"),
        ],
        hints: [
          "Look at why hazardous waste is separated.",
          "Cells contain chemicals that should not enter compost or mixed waste.",
          "Safe disposal prevents contamination.",
        ],
        solution: [
          step(1, "A button cell is not biodegradable kitchen waste."),
          step(2, "It may contain harmful substances."),
          step(3, "It should be kept in hazardous waste for safe disposal."),
        ],
      },
      {
        questionLatex: L`Why is kitchen wet waste separated from dry recyclable waste at source?`,
        difficulty: 3,
        skillTags: ["segregation", "waste_management"],
        choices: [
          wrong("so that all waste can be burnt together", "Segregation is meant to improve treatment, not to mix waste for burning."),
          correct("so biodegradable waste can be composted and recyclables kept clean"),
          wrong("because dry waste decomposes faster than food waste", "Dry recyclables such as metal and plastic generally do not decompose faster."),
          wrong("because composting requires plastic wrappers", "Plastic wrappers contaminate compost rather than helping it."),
        ],
        hints: [
          "Ask what happens to wet organic waste.",
          "Ask what recyclers need from dry waste.",
          "Mixing food with recyclables reduces recovery quality.",
        ],
        solution: [
          step(1, "Kitchen wet waste is mainly biodegradable."),
          step(2, "It can be composted if separated."),
          step(3, "Dry recyclable waste should remain clean so paper, metal or plastic can be recycled."),
        ],
      },
      {
        questionLatex: L`Which plan is most suitable for managing electronic waste such as old mobile phones?`,
        difficulty: 2,
        skillTags: ["e_waste", "safe_disposal"],
        choices: [
          wrong("bury them in a vegetable garden", "Burying e-waste can contaminate soil with harmful substances."),
          wrong("burn them with dry leaves", "Burning e-waste can release toxic fumes."),
          correct("send them to an authorised e-waste collection or recycling centre"),
          wrong("put them in the compost pit", "E-waste is not biodegradable and can contaminate compost."),
        ],
        hints: [
          "Electronic waste can contain harmful metals and chemicals.",
          "It needs specialised recovery and disposal.",
          "Use an authorised collection or recycling route.",
        ],
        solution: [
          step(1, "Electronic waste is not ordinary biodegradable waste."),
          step(2, "It can contain hazardous materials."),
          step(3, "An authorised e-waste collection or recycling centre is the safest option listed."),
        ],
      },
      {
        questionLatex: L`Which pair contains only non-biodegradable items?`,
        difficulty: 2,
        skillTags: ["waste_classification"],
        choices: [
          wrong("grass clippings and fruit peels", "Both are biodegradable plant wastes."),
          wrong("paper napkin and leftover rice", "These are biodegradable under suitable conditions."),
          wrong("cotton cloth and tea leaves", "Tea leaves are biodegradable, and cotton is natural fibre that can decompose slowly."),
          correct("glass bottle and plastic wrapper"),
        ],
        hints: [
          "Non-biodegradable items resist microbial breakdown.",
          "Plant or food waste is generally biodegradable.",
          "Glass and plastic persist for long periods.",
        ],
        solution: [
          step(1, "Glass does not decompose by microbial action."),
          step(2, "Plastic wrappers also persist for a long time."),
          step(3, "So glass bottle and plastic wrapper are both non-biodegradable."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is meant by biodegradable waste?`,
        difficulty: 1,
        skillTags: ["biodegradable_definition"],
        parts: [part("a", "Define biodegradable waste.", 1)],
        hints: [
          "Mention breakdown.",
          "Mention living organisms or microorganisms.",
          "Keep the definition general.",
        ],
        rubric: rubric([criterion("a", 1, "Defines biodegradable waste as waste that can be broken down by organisms/microorganisms into simpler substances.")]),
        commonErrors: [
          "Defining it as any waste that is wet.",
          "Saying it disappears without mentioning biological action.",
        ],
        workedSolution: [
          solutionPart("a", "Biodegradable waste is waste that can be broken down by microorganisms or other living organisms into simpler substances."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A dustbin contains banana peels, newspaper, a plastic spoon, glass pieces and used dry cells.`,
        difficulty: 3,
        skillTags: ["waste_classification", "safe_disposal"],
        parts: [
          part("a", "Classify any two items as biodegradable and any two as non-biodegradable.", 2),
          part("b", "Which item needs special care during disposal? Give one reason.", 2),
        ],
        hints: [
          "Food and paper can decompose under suitable conditions.",
          "Plastic and glass persist.",
          "Cells can contain harmful chemicals.",
        ],
        rubric: rubric([
          criterion("a", 2, "Correctly classifies two biodegradable and two non-biodegradable items."),
          criterion("b", 2, "Identifies dry cells and gives a valid reason related to harmful chemicals/safe disposal."),
        ]),
        commonErrors: [
          "Putting dry cells into compost because they are small.",
          "Calling glass biodegradable because it can break into pieces.",
        ],
        workedSolution: [
          solutionPart("a", "Banana peels and newspaper are biodegradable. Plastic spoon and glass pieces are non-biodegradable."),
          solutionPart("b", "Used dry cells need special care because they may release harmful chemicals and should go to safe collection/disposal."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Why can a thin plastic carry bag remain an environmental problem even if it breaks into smaller pieces?`,
        difficulty: 3,
        skillTags: ["plastic_waste", "non_biodegradable"],
        parts: [
          part("a", "State why breaking into smaller pieces is not the same as biodegradation.", 2),
          part("b", "Give one possible harm caused by such persistent plastic pieces.", 1),
        ],
        hints: [
          "Fragmentation is physical breaking.",
          "Biodegradation requires biological breakdown into simpler substances.",
          "Small plastic pieces can still enter soil, drains or food chains.",
        ],
        rubric: rubric([
          criterion("a", 2, "Explains that plastic fragments may persist chemically and are not necessarily decomposed by microorganisms."),
          criterion("b", 1, "Gives a valid harm such as drain blockage, ingestion by animals, soil/water contamination or food-chain entry."),
        ]),
        commonErrors: [
          "Assuming smaller pieces are harmless.",
          "Treating physical tearing as microbial decomposition.",
        ],
        workedSolution: [
          solutionPart("a", "Breaking a plastic bag into smaller pieces is only fragmentation. The plastic material may still resist microbial breakdown and remain in the environment."),
          solutionPart("b", "Such pieces may block drains, be eaten by animals, contaminate soil or water, or enter food chains."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A housing society uses the three-bin system shown in the figure.`,
        difficulty: 3,
        skillTags: ["figure_interpretation", "waste_management"],
        figure: wasteSortingFigure,
        parts: [
          part("a", "Which bin should receive vegetable peels?", 1),
          part("b", "Which bin should receive metal cans?", 1),
          part("c", "Why should button cells not be mixed with wet waste?", 2),
          part("d", "Give one benefit of keeping dry recyclable waste clean.", 1),
        ],
        hints: [
          "Read the labels on the three bins.",
          "Wet organic waste can be composted.",
          "Hazardous waste should not contaminate compost.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies wet waste/compost bin."),
          criterion("b", 1, "Identifies dry waste/recycle bin."),
          criterion("c", 2, "Explains that cells may release harmful chemicals and contaminate compost/soil."),
          criterion("d", 1, "States that clean dry waste is easier or safer to recycle."),
        ]),
        commonErrors: [
          "Putting all small waste into the wet bin.",
          "Saying recyclables should be dirty because they will be washed later.",
        ],
        workedSolution: [
          solutionPart("a", "Vegetable peels should go into the wet waste bin for composting."),
          solutionPart("b", "Metal cans should go into the dry recyclable waste bin."),
          solutionPart("c", "Button cells may release harmful chemicals, so mixing them with wet waste can contaminate compost and soil."),
          solutionPart("d", "Clean dry waste is easier to recover and recycle."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A school wants to reduce the environmental impact of daily lunch waste. Students generate food scraps, paper, plastic wrappers and a few used pen refills.`,
        difficulty: 4,
        skillTags: ["waste_solution_plan", "application"],
        parts: [
          part("a", "Propose a segregation plan using at least three categories.", 3),
          part("b", "State one treatment or disposal method for each category.", 3),
          part("c", "Explain why reducing waste at source is better than only disposing of it later.", 2),
        ],
        hints: [
          "Separate wet, recyclable and non-recyclable/hazardous waste.",
          "Match each category with composting, recycling or safe disposal.",
          "Prevention reduces material and energy use before waste forms.",
        ],
        rubric: rubric([
          criterion("a", 3, "Gives sensible categories such as wet biodegradable, dry recyclable and reject/special waste."),
          criterion("b", 3, "Matches categories to composting, recycling and safe disposal/reduced use."),
          criterion("c", 2, "Explains that reducing at source lowers resource use, pollution, transport and disposal burden."),
        ]),
        commonErrors: [
          "Suggesting a single mixed dustbin.",
          "Burning plastic wrappers as a routine solution.",
        ],
        workedSolution: [
          solutionPart("a", "Use separate bins for wet food scraps, dry recyclables such as paper, and reject/special waste such as used pen refills and contaminated wrappers."),
          solutionPart("b", "Food scraps can be composted, clean paper can be recycled, and reject/special waste should be minimised and sent for safe disposal."),
          solutionPart("c", "Reducing waste at source is better because less material is produced, transported and treated. It saves resources and reduces pollution before the waste problem becomes larger."),
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Environmental Problems and Biomagnification",
    subtopic: "persistent pollutants, food-chain accumulation and local environmental decisions",
    mc: [
      {
        questionLatex: L`In the food chain shown, which organism is expected to have the highest concentration of the persistent pesticide?`,
        difficulty: 2,
        skillTags: ["biomagnification", "figure_interpretation"],
        figure: biomagnificationFigure,
        choices: [
          wrong("plankton", "Plankton are at the lower trophic level and show the smallest concentration in the figure."),
          wrong("small fish", "Small fish have more than plankton but less than higher consumers."),
          correct("bird"),
          wrong("large fish", "Large fish have high concentration, but the bird at the top has the highest in the figure."),
        ],
        hints: [
          "Trace the food chain from left to right.",
          "Persistent pesticide concentration increases at higher levels.",
          "Read the ppm values in the figure.",
        ],
        solution: [
          step(1, "The pesticide is persistent and moves through the food chain."),
          step(2, "The figure shows increasing concentration at higher trophic levels."),
          step(3, "The bird has the highest shown concentration, 20 ppm."),
        ],
      },
      {
        questionLatex: L`Biological magnification happens mainly because some harmful chemicals are`,
        difficulty: 2,
        skillTags: ["biomagnification_cause"],
        choices: [
          correct("non-biodegradable and accumulate in organisms"),
          wrong("always converted into oxygen by plants", "Plants do not convert persistent toxic chemicals into oxygen."),
          wrong("used completely as food energy", "Persistent toxins are not used completely as food energy."),
          wrong("destroyed fully at every trophic level", "If they were destroyed fully, they would not magnify in the food chain."),
        ],
        hints: [
          "Focus on persistence.",
          "The substance is not easily broken down.",
          "It accumulates and passes to the next consumer.",
        ],
        solution: [
          step(1, "Some pesticides and toxic chemicals do not break down easily."),
          step(2, "They accumulate in the bodies of organisms."),
          step(3, "Their concentration can increase at successive trophic levels."),
        ],
      },
      {
        questionLatex: L`Which farming decision is most likely to reduce the risk of biomagnification in a nearby pond?`,
        difficulty: 3,
        skillTags: ["biomagnification_prevention", "application"],
        choices: [
          wrong("spray extra persistent pesticide before every rainfall", "Rainfall can carry persistent pesticide into water bodies, increasing risk."),
          correct("avoid persistent pesticides and use safer targeted pest-control methods"),
          wrong("release pesticide containers into the pond after use", "This directly pollutes the pond and can add persistent chemicals to the food chain."),
          wrong("increase pesticide concentration so pests die faster", "Higher persistent chemical load increases risk to food chains."),
        ],
        hints: [
          "Ask what enters the pond food chain.",
          "Persistent chemicals are the problem.",
          "Targeted, safer control reduces spread into the ecosystem.",
        ],
        solution: [
          step(1, "Biomagnification risk rises when persistent pesticides enter food chains."),
          step(2, "Avoiding such pesticides reduces the pollutant entering the pond."),
          step(3, "Safer targeted control methods therefore reduce the risk."),
        ],
      },
      {
        questionLatex: L`A lake receives excess nutrient-rich waste water. Soon, thick algal growth covers the surface and fish begin to die. The safest conclusion is that`,
        difficulty: 3,
        skillTags: ["water_pollution", "environmental_problem"],
        choices: [
          wrong("the lake has become healthier because more algae always means more oxygen", "Excess algal growth can reduce light and oxygen after decay."),
          wrong("fish died because sunlight became too strong", "The observation points to pollution and oxygen imbalance, not stronger sunlight."),
          wrong("all decomposers have disappeared permanently", "Decomposers may actually increase while breaking down dead algae."),
          correct("pollution has disturbed the aquatic ecosystem and oxygen balance"),
        ],
        hints: [
          "Excess nutrients can trigger rapid algal growth.",
          "Decay of organic matter can use dissolved oxygen.",
          "Fish deaths indicate ecosystem imbalance.",
        ],
        solution: [
          step(1, "Nutrient-rich waste water can cause excessive algal growth."),
          step(2, "When algae die and decompose, oxygen in water may decrease."),
          step(3, "Fish deaths suggest pollution has disturbed the oxygen balance."),
        ],
      },
      {
        questionLatex: L`A fish-eating bird lays eggs with unusually thin shells after a persistent pesticide enters the pond food chain. The best explanation is`,
        difficulty: 3,
        skillTags: ["biomagnification_effect", "top_consumer"],
        choices: [
          wrong("the bird is at the first trophic level", "A fish-eating bird is a higher consumer, not the first trophic level."),
          wrong("pesticide concentration becomes zero in top consumers", "Persistent pesticide concentration can be highest in top consumers."),
          correct("the pesticide has biomagnified to a high concentration in the bird"),
          wrong("all pesticides are biodegradable nutrients for eggshells", "Persistent pesticides are pollutants, not eggshell nutrients."),
        ],
        hints: [
          "Locate the bird in the food chain.",
          "Persistent pesticide concentration increases at higher trophic levels.",
          "Top consumers often face the strongest effect.",
        ],
        solution: [
          step(1, "The bird eats fish and is at a high trophic level."),
          step(2, "Persistent pesticide accumulates through the food chain."),
          step(3, "A high concentration in the bird can harm reproduction, such as by thinning eggshells."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is biological magnification?`,
        difficulty: 1,
        skillTags: ["biomagnification_definition"],
        parts: [part("a", "Define biological magnification.", 1)],
        hints: [
          "Mention food chains.",
          "Mention increase in concentration.",
          "Mention persistent harmful substances.",
        ],
        rubric: rubric([criterion("a", 1, "Defines biological magnification as increase in concentration of persistent toxic substances at successive trophic levels.")]),
        commonErrors: [
          "Defining it as increase in body size.",
          "Forgetting that the increase occurs along trophic levels.",
        ],
        workedSolution: [
          solutionPart("a", "Biological magnification is the increase in concentration of persistent toxic substances at successive trophic levels of a food chain."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A pesticide sprayed on crops is washed into a pond. Explain why fish-eating birds may be affected more severely than algae.`,
        difficulty: 3,
        skillTags: ["biomagnification", "food_chain_reasoning"],
        parts: [
          part("a", "State the property of the pesticide that allows it to persist.", 1),
          part("b", "Explain why concentration is higher in fish-eating birds.", 2),
        ],
        hints: [
          "Persistent pesticides do not break down quickly.",
          "They pass from one trophic level to the next.",
          "Top consumers eat many contaminated organisms.",
        ],
        rubric: rubric([
          criterion("a", 1, "States non-biodegradable/persistent nature."),
          criterion("b", 2, "Explains accumulation through food chain and higher concentration in top consumers."),
        ]),
        commonErrors: [
          "Saying birds are affected more only because they are larger.",
          "Claiming the pesticide disappears after algae absorb it.",
        ],
        workedSolution: [
          solutionPart("a", "The pesticide is persistent or non-biodegradable, so it is not broken down quickly."),
          solutionPart("b", "It accumulates in organisms and passes along the food chain. Fish-eating birds consume many contaminated fish, so the concentration can become much higher in their bodies."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A riverbank community notices plastic waste, dead fish and foul smell after untreated waste is released into the river.`,
        difficulty: 3,
        skillTags: ["environmental_problem", "waste_pollution"],
        parts: [
          part("a", "State two environmental problems shown by the observation.", 2),
          part("b", "Suggest two immediate corrective actions.", 2),
        ],
        hints: [
          "Separate solid waste from water-quality problems.",
          "Dead fish suggest water pollution or low oxygen.",
          "Corrective action should stop the source and remove waste safely.",
        ],
        rubric: rubric([
          criterion("a", 2, "States two valid problems such as plastic pollution, water pollution, death of aquatic organisms or foul smell from decomposition."),
          criterion("b", 2, "Suggests two valid actions such as stopping untreated discharge, cleaning plastic waste, treating sewage/wastewater or monitoring water quality."),
        ]),
        commonErrors: [
          "Suggesting burning plastic on the riverbank.",
          "Treating dead fish as a normal seasonal event without linking pollution.",
        ],
        workedSolution: [
          solutionPart("a", "The observations show plastic pollution and water pollution that is harming aquatic organisms. Foul smell also suggests decomposition of organic waste."),
          solutionPart("b", "The community should stop untreated discharge, collect plastic safely, and ensure sewage or wastewater is treated before release."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows concentration of a persistent pesticide in a pond food chain.`,
        difficulty: 3,
        skillTags: ["figure_interpretation", "biomagnification"],
        figure: biomagnificationFigure,
        parts: [
          part("a", "Which organism has the lowest pesticide concentration?", 1),
          part("b", "Calculate how many times higher the concentration is in the bird than in the large fish.", 1),
          part("c", "Name the process shown.", 1),
          part("d", "Why does this process threaten top consumers?", 2),
        ],
        hints: [
          "Read the ppm values.",
          "Compare 20 ppm with 2 ppm.",
          "The process is linked with persistent chemicals in food chains.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies plankton."),
          criterion("b", 1, "Calculates 10 times."),
          criterion("c", 1, "Names biological magnification/biomagnification."),
          criterion("d", 2, "Explains that top consumers receive accumulated persistent chemicals from many prey and may suffer toxic effects."),
        ]),
        commonErrors: [
          "Comparing bird concentration with small fish instead of large fish for part (b).",
          "Calling the process energy transfer instead of biomagnification.",
        ],
        workedSolution: [
          solutionPart("a", "Plankton have the lowest concentration, 0.02 ppm."),
          solutionPart("b", "The bird has 20 ppm and the large fish has 2 ppm.", "20 \\div 2 = 10"),
          solutionPart("c", "The process is biological magnification."),
          solutionPart("d", "Top consumers eat many contaminated organisms. Persistent chemicals are not easily broken down, so they can reach harmful concentrations in top consumers."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A town uses a persistent pesticide near a lake to control insects. After months, tests show pesticide traces in plankton, fish and fish-eating birds.`,
        difficulty: 4,
        skillTags: ["biomagnification", "environmental_decision", "solution_design"],
        parts: [
          part("a", "Explain how the pesticide can reach fish-eating birds.", 2),
          part("b", "Why may birds show a greater effect than plankton?", 2),
          part("c", "Suggest two changes in pest-control practice that reduce this risk.", 2),
        ],
        hints: [
          "Follow the pesticide through runoff and feeding relationships.",
          "Top consumers receive pollutants from many organisms below them.",
          "Solutions should reduce persistent chemical entry into the lake.",
        ],
        rubric: rubric([
          criterion("a", 2, "Explains runoff into lake and transfer through food chain."),
          criterion("b", 2, "Explains biomagnification in higher trophic levels."),
          criterion("c", 2, "Suggests two valid alternatives such as avoiding persistent pesticides, targeted use, biological control, buffer zones or safer pest management."),
        ]),
        commonErrors: [
          "Saying only organisms directly sprayed can be affected.",
          "Suggesting stronger persistent pesticide as a solution.",
        ],
        workedSolution: [
          solutionPart("a", "Rainwater can wash pesticide from land into the lake. Plankton absorb it, fish eat plankton or smaller fish, and fish-eating birds eat contaminated fish."),
          solutionPart("b", "The pesticide is persistent, so it accumulates and its concentration increases at higher trophic levels. Birds may therefore receive a higher dose than plankton."),
          solutionPart("c", "The town can avoid persistent pesticides, use targeted pest control, create buffer zones to reduce runoff, and use safer biological or integrated pest-management methods."),
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Ozone Depletion and Waste Solutions",
    subtopic: "ozone layer, CFCs, ultraviolet radiation and sustainable choices",
    mc: [
      {
        questionLatex: L`The ozone layer is important for living organisms because it mainly absorbs`,
        difficulty: 2,
        skillTags: ["ozone_layer", "uv_radiation"],
        choices: [
          correct("harmful ultraviolet radiation"),
          wrong("all oxygen required for respiration", "Ozone does not supply all oxygen for respiration."),
          wrong("all carbon dioxide used in photosynthesis", "Carbon dioxide for photosynthesis is not supplied by the ozone layer."),
          wrong("sound waves from thunderstorms", "The ozone layer is linked with ultraviolet radiation, not sound waves."),
        ],
        hints: [
          "Recall what reaches Earth from the Sun.",
          "The harmful radiation is shortened as UV.",
          "Ozone in the stratosphere absorbs much of it.",
        ],
        solution: [
          step(1, "The stratospheric ozone layer absorbs much harmful ultraviolet radiation."),
          step(2, "This reduces UV reaching Earth's surface."),
          step(3, "So it protects living organisms."),
        ],
      },
      {
        questionLatex: L`The figure shows CFCs reaching the upper atmosphere. Their danger to the ozone layer is mainly that they can release`,
        difficulty: 2,
        skillTags: ["cfc", "ozone_depletion"],
        figure: ozoneLayerFigure,
        choices: [
          wrong("oxygen molecules that thicken ozone without limit", "CFCs are linked with ozone depletion, not unlimited ozone formation."),
          correct("chlorine radicals that catalyse ozone breakdown"),
          wrong("nitrogen gas that directly becomes ozone", "Nitrogen gas is not the main ozone-depleting species from CFCs."),
          wrong("water droplets that turn all UV into visible light", "Water droplets do not describe the CFC-ozone mechanism."),
        ],
        hints: [
          "CFCs are stable in lower air but break down in upper air.",
          "The harmful species contains chlorine.",
          "It can destroy many ozone molecules by a catalytic process.",
        ],
        solution: [
          step(1, "CFCs can reach the upper atmosphere."),
          step(2, "UV radiation can release chlorine radicals from them."),
          step(3, "Chlorine radicals catalyse ozone breakdown."),
        ],
      },
      {
        questionLatex: L`Which health or ecological effect is most directly linked with thinning of the ozone layer?`,
        difficulty: 2,
        skillTags: ["ozone_depletion_effects"],
        choices: [
          wrong("less ultraviolet radiation reaches Earth", "Ozone thinning allows more harmful UV to reach Earth, not less."),
          wrong("all biodegradable waste stops decomposing", "Ozone thinning is not the direct cause of all decomposition stopping."),
          correct("higher risk of skin cancer and cataract due to increased UV exposure"),
          wrong("all food chains receive more chemical energy", "Ozone thinning does not increase food-chain energy transfer."),
        ],
        hints: [
          "Ozone absorbs UV.",
          "Thinning means more UV reaches living organisms.",
          "UV can harm skin and eyes.",
        ],
        solution: [
          step(1, "Ozone thinning reduces UV absorption in the stratosphere."),
          step(2, "More harmful UV can reach Earth's surface."),
          step(3, "This increases risks such as skin cancer and cataract."),
        ],
      },
      {
        questionLatex: L`A shop replaces disposable plastic cups with a deposit-return steel cup system. Which waste-management principle is most strongly shown?`,
        difficulty: 3,
        skillTags: ["reduce_reuse", "waste_solution"],
        choices: [
          wrong("burning waste to reduce volume", "The plan avoids disposable waste rather than burning it."),
          wrong("mixing all waste for faster collection", "The plan reduces disposable waste and encourages reuse, not mixing."),
          wrong("using non-biodegradable waste as compost", "Steel cups are reused; they are not composted."),
          correct("reuse and reduction at source"),
        ],
        hints: [
          "The cup is used again and again.",
          "Fewer disposable cups are produced.",
          "This acts before waste is generated.",
        ],
        solution: [
          step(1, "A deposit-return steel cup is used repeatedly."),
          step(2, "This reduces the number of disposable cups generated."),
          step(3, "The principle is reuse and reduction at source."),
        ],
      },
      {
        questionLatex: L`Assertion (A): Restricting CFC use helps protect the ozone layer. Reason (R): CFCs can release chlorine radicals that break down ozone molecules in the upper atmosphere.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "ozone_depletion"],
        choices: [
          wrong("Both A and R are true, but R does not explain A.", "The reason directly explains why restricting CFCs helps protect ozone."),
          correct("Both A and R are true, and R correctly explains A."),
          wrong("A is true, but R is false.", "The reason is true: CFCs can lead to chlorine radicals that destroy ozone."),
          wrong("A is false, but R is true.", "The assertion is true because reducing CFCs reduces an ozone-depleting source."),
        ],
        hints: [
          "Judge whether CFC restriction helps ozone.",
          "Judge the chlorine-radical reason.",
          "Ask whether the reason explains the assertion.",
        ],
        solution: [
          step(1, "The assertion is true because CFCs are linked with ozone depletion."),
          step(2, "The reason is true because CFCs can release chlorine radicals in the upper atmosphere."),
          step(3, "The reason explains why restricting CFCs protects ozone."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the chemical formula of ozone.`,
        difficulty: 1,
        skillTags: ["ozone_formula"],
        parts: [part("a", "Write the formula.", 1)],
        hints: [
          "Ozone is a molecule of oxygen.",
          "It has three oxygen atoms.",
          "Use the symbol for oxygen with subscript 3.",
        ],
        rubric: rubric([criterion("a", 1, "Writes $\\mathrm{O_3}$.")]),
        commonErrors: [
          "Writing $\\mathrm{O_2}$, which is ordinary oxygen gas.",
          "Writing only O without the subscript.",
        ],
        workedSolution: [
          solutionPart("a", "Ozone contains three oxygen atoms per molecule.", "\\mathrm{O_3}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain how CFCs can cause depletion of ozone in the upper atmosphere.`,
        difficulty: 3,
        skillTags: ["cfc", "ozone_depletion_mechanism"],
        parts: [
          part("a", "State why CFCs can reach the upper atmosphere.", 1),
          part("b", "Explain how they damage ozone there.", 2),
        ],
        hints: [
          "CFCs are stable in the lower atmosphere.",
          "Strong UV acts on them higher up.",
          "Chlorine radicals break down ozone repeatedly.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that CFCs are stable/persistent enough to reach the upper atmosphere."),
          criterion("b", 2, "Explains release of chlorine radicals and catalytic breakdown of ozone."),
        ]),
        commonErrors: [
          "Saying CFCs are beneficial because they contain chlorine.",
          "Saying ozone depletion happens only because oxygen is absent.",
        ],
        workedSolution: [
          solutionPart("a", "CFCs are stable in the lower atmosphere, so they can persist and reach the upper atmosphere."),
          solutionPart("b", "There, ultraviolet radiation can release chlorine radicals from CFCs. These radicals catalyse the breakdown of ozone molecules, thinning the ozone layer."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A family says, "Recycling is useful, so reducing waste is unnecessary." Give two reasons why this view is incomplete.`,
        difficulty: 3,
        skillTags: ["reduce_reuse_recycle", "waste_solution_reasoning"],
        parts: [
          part("a", "State one limitation of relying only on recycling.", 1),
          part("b", "State one advantage of reducing or reusing before recycling.", 2),
        ],
        hints: [
          "Recycling also uses energy and collection systems.",
          "Not all materials are recyclable indefinitely.",
          "Reduction prevents waste from forming.",
        ],
        rubric: rubric([
          criterion("a", 1, "States a valid limitation such as energy use, contamination, cost, downcycling or non-recyclable items."),
          criterion("b", 2, "Explains that reducing/reusing saves resources and prevents pollution before waste is generated."),
        ]),
        commonErrors: [
          "Claiming recycling is always harmful.",
          "Ignoring that reduction and recycling can both be useful.",
        ],
        workedSolution: [
          solutionPart("a", "Recycling needs collection, sorting and energy, and some waste is contaminated or not recyclable."),
          solutionPart("b", "Reducing and reusing prevent waste from being produced in the first place. This saves raw materials, energy and disposal effort."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows the ozone layer between incoming ultraviolet rays and Earth's surface.`,
        difficulty: 3,
        skillTags: ["figure_interpretation", "ozone_layer"],
        figure: ozoneLayerFigure,
        parts: [
          part("a", "Name the harmful radiation shown from the Sun.", 1),
          part("b", "What is the role of the ozone layer with respect to this radiation?", 1),
          part("c", "Why are CFC sources shown as a concern in the figure?", 2),
          part("d", "State one possible effect of increased UV exposure on humans.", 1),
        ],
        hints: [
          "Read the ray label in the figure.",
          "Ozone absorbs much of this radiation.",
          "CFCs can damage ozone in upper air.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names ultraviolet/UV radiation."),
          criterion("b", 1, "States that ozone absorbs much of the harmful UV."),
          criterion("c", 2, "Explains that CFCs can release chlorine radicals in upper atmosphere, causing ozone breakdown."),
          criterion("d", 1, "States a valid effect such as skin cancer, cataract or harm to living tissues."),
        ]),
        commonErrors: [
          "Saying ozone blocks all sunlight.",
          "Saying CFCs are dangerous only because they smell bad.",
        ],
        workedSolution: [
          solutionPart("a", "The harmful radiation is ultraviolet or UV radiation."),
          solutionPart("b", "The ozone layer absorbs much of the harmful UV radiation before it reaches Earth's surface."),
          solutionPart("c", "CFCs can reach the upper atmosphere and release chlorine radicals, which catalyse ozone breakdown."),
          solutionPart("d", "One possible effect is increased risk of skin cancer or cataract."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A town fair expects 20000 visitors in one day. The organisers must choose between single-use plastic plates, paper plates, or a washable steel-plate deposit system.`,
        difficulty: 4,
        skillTags: ["waste_solution_decision", "application", "evaluation"],
        parts: [
          part("a", "Which option best reduces waste at source? Justify briefly.", 2),
          part("b", "Give one condition needed to make that option work safely.", 1),
          part("c", "Why is merely switching from plastic plates to disposable paper plates not a complete solution?", 2),
          part("d", "Suggest one supporting action for visitors that improves waste handling.", 1),
        ],
        hints: [
          "Compare one-time use with repeated use.",
          "Reusable items need washing and collection.",
          "Disposable paper still uses resources and creates waste.",
        ],
        rubric: rubric([
          criterion("a", 2, "Chooses washable steel-plate deposit system and justifies reuse/reduced waste."),
          criterion("b", 1, "States a practical condition such as hygienic washing, collection counter, deposit return or sufficient plates."),
          criterion("c", 2, "Explains that paper plates still consume resources and generate waste, especially if contaminated."),
          criterion("d", 1, "Suggests segregation bins, signage, volunteer guidance, deposit counters or awareness messages."),
        ]),
        commonErrors: [
          "Assuming biodegradable-looking disposable items create no waste problem.",
          "Ignoring hygiene and collection needs for reusable systems.",
        ],
        workedSolution: [
          solutionPart("a", "The washable steel-plate deposit system best reduces waste at source because the same plates are reused many times instead of becoming waste after one meal."),
          solutionPart("b", "It must have hygienic washing, proper collection and a deposit-return system so plates come back for reuse."),
          solutionPart("c", "Paper plates still require raw material and energy, and contaminated paper may not be easily recycled or composted. So paper disposables reduce some plastic but do not remove the waste problem."),
          solutionPart("d", "The fair can provide clearly labelled segregation bins and visitor guidance near food stalls."),
        ],
      },
    ],
  },
];

export const naturalResourcesXTopics: Topic[] = topicSeeds.map(makeTopic);
