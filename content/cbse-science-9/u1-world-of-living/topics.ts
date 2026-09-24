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
const UNIT = "u1-world-of-living";
const VERSION = "0.1.2";
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
  extraMc?: readonly McSeed[];
  extraConstructed?: readonly ConstructedSeed[];
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

function calibrateScienceDifficulty({
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
  const isRecall =
    /\b(name|identify|which tissue|which organelle|which process|which group|site of|is called)\b/.test(
      text,
    ) && !/\bjustify|explain|case|infer|conclude|reason\b/.test(text);

  if (kind === "mc_single" && difficulty >= 4 && isRecall) {
    return 3;
  }

  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the biological structure, process, or classification clue before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_world_of_living_reasoning"),
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateScienceDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_memorised_term_without_matching_structure_to_function",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateScienceDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_fact_without_linking_the_structure_to_its_function",
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
      ...(seed.extraMc ?? []).map((item, index) =>
        makeMc(meta, item, seed.mc.length + index),
      ),
      ...seed.constructed.map((item, index) =>
        makeConstructed(meta, item, index),
      ),
      ...(seed.extraConstructed ?? []).map((item, index) =>
        makeConstructed(meta, item, seed.constructed.length + index),
      ),
    ],
  };
}

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function rubric(
  criteria: readonly { part: string; points: number; description: string }[],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((sum, item) => sum + item.points, 0),
    criteria: [...criteria],
  };
}

function solution(explanation: string, math: string | null = null): SolutionStep[] {
  return [{ step: 1, explanation, math }];
}

const cellComparisonFigure: ItemFigure = {
  type: "svg",
  title: "Schematic comparison of two cells",
  description:
    "Two simplified cells are shown with visible nucleus, boundary, vacuole and wall features.",
  svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="300" fill="#ffffff"/>
  <text x="155" y="35" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="#0f172a">Cell X</text>
  <rect x="55" y="70" width="200" height="150" rx="8" fill="#dcfce7" stroke="#15803d" stroke-width="4"/>
  <rect x="74" y="89" width="162" height="112" rx="8" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
  <ellipse cx="172" cy="145" rx="50" ry="43" fill="#d9f99d" stroke="#65a30d" stroke-width="2"/>
  <circle cx="94" cy="155" r="12" fill="#93c5fd" stroke="#2563eb" stroke-width="2"/>
  <circle cx="94" cy="155" r="4" fill="#1d4ed8"/>
  <circle cx="91" cy="105" r="6" fill="#22c55e"/>
  <circle cx="221" cy="190" r="6" fill="#22c55e"/>
  <text x="465" y="35" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="#0f172a">Cell Y</text>
  <path d="M383 147 C383 84 436 58 492 83 C557 112 557 199 493 224 C438 245 383 210 383 147 Z" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <circle cx="461" cy="145" r="23" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <circle cx="461" cy="145" r="6" fill="#1d4ed8"/>
  <ellipse cx="505" cy="171" rx="18" ry="9" fill="#fdba74" stroke="#ea580c" stroke-width="1.5"/>
  <ellipse cx="424" cy="116" rx="15" ry="8" fill="#fdba74" stroke="#ea580c" stroke-width="1.5"/>
</svg>`,
};

const osmosisFigure: ItemFigure = {
  type: "svg",
  title: "Cells in dilute and concentrated surroundings",
  description:
    "The same plant cell is shown before and after being placed in a concentrated sugar solution.",
  svg: `<svg viewBox="0 0 620 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="260" fill="#ffffff"/>
  <text x="155" y="35" text-anchor="middle" font-size="17" font-family="Arial, sans-serif" fill="#0f172a">Before</text>
  <rect x="70" y="65" width="170" height="135" rx="8" fill="#dcfce7" stroke="#15803d" stroke-width="4"/>
  <rect x="91" y="86" width="128" height="93" rx="8" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
  <circle cx="118" cy="113" r="14" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <path d="M280 130 H340" stroke="#334155" stroke-width="2"/>
  <path d="M330 121 L342 130 L330 139" fill="none" stroke="#334155" stroke-width="2"/>
  <text x="310" y="110" text-anchor="middle" font-size="13" font-family="Arial, sans-serif" fill="#475569">concentrated solution</text>
  <text x="465" y="35" text-anchor="middle" font-size="17" font-family="Arial, sans-serif" fill="#0f172a">After</text>
  <rect x="380" y="65" width="170" height="135" rx="8" fill="#dcfce7" stroke="#15803d" stroke-width="4"/>
  <rect x="420" y="99" width="90" height="66" rx="8" fill="#bbf7d0" stroke="#16a34a" stroke-width="2"/>
  <circle cx="440" cy="119" r="11" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <path d="M412 95 C397 89 392 82 390 76 M517 167 C534 173 543 184 548 196" stroke="#dc2626" stroke-width="2" fill="none"/>
  <text x="465" y="225" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="#475569">cell contents shrink away from the wall</text>
</svg>`,
};

const meristemFigure: ItemFigure = {
  type: "svg",
  title: "Growth regions in a young plant",
  description:
    "A young plant is shown with three labelled regions P, Q and R where growth may occur.",
  svg: `<svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="360" fill="#ffffff"/>
  <path d="M260 300 C255 240 253 180 260 105" stroke="#15803d" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M260 145 C215 115 170 105 130 125" stroke="#16a34a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M258 175 C305 145 355 130 398 145" stroke="#16a34a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <ellipse cx="126" cy="126" rx="42" ry="18" fill="#bbf7d0" stroke="#15803d" stroke-width="2"/>
  <ellipse cx="402" cy="146" rx="45" ry="18" fill="#bbf7d0" stroke="#15803d" stroke-width="2"/>
  <path d="M260 305 C225 320 190 328 150 332 M260 305 C295 320 330 328 370 332" stroke="#92400e" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="260" cy="96" r="15" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
  <circle cx="260" cy="205" r="15" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
  <circle cx="260" cy="306" r="15" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
  <text x="286" y="101" font-size="18" font-family="Arial, sans-serif" fill="#0f172a">P</text>
  <text x="286" y="211" font-size="18" font-family="Arial, sans-serif" fill="#0f172a">Q</text>
  <text x="286" y="313" font-size="18" font-family="Arial, sans-serif" fill="#0f172a">R</text>
  <line x1="35" y1="306" x2="485" y2="306" stroke="#94a3b8" stroke-width="2"/>
  <text x="260" y="344" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="#475569">P is at the shoot tip, Q is on the stem side, R is at the root tip.</text>
</svg>`,
};

const flowerFigure: ItemFigure = {
  type: "svg",
  title: "Flower parts used in sexual reproduction",
  description:
    "A simplified flower shows four labelled parts without naming them.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <path d="M280 300 C274 250 274 210 280 170" stroke="#15803d" stroke-width="8" fill="none"/>
  <ellipse cx="225" cy="150" rx="70" ry="45" fill="#fecdd3" stroke="#be123c" stroke-width="2" transform="rotate(-25 225 150)"/>
  <ellipse cx="335" cy="150" rx="70" ry="45" fill="#fecdd3" stroke="#be123c" stroke-width="2" transform="rotate(25 335 150)"/>
  <ellipse cx="280" cy="100" rx="48" ry="76" fill="#fee2e2" stroke="#be123c" stroke-width="2"/>
  <ellipse cx="280" cy="185" rx="58" ry="42" fill="#fda4af" stroke="#be123c" stroke-width="2"/>
  <path d="M280 196 C252 175 248 138 280 105 C312 138 308 175 280 196 Z" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <path d="M280 187 C280 145 280 112 280 78" stroke="#92400e" stroke-width="5" fill="none"/>
  <circle cx="280" cy="72" r="10" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
  <path d="M235 185 C225 145 225 120 220 95" stroke="#7c2d12" stroke-width="4" fill="none"/>
  <path d="M325 185 C335 145 335 120 340 95" stroke="#7c2d12" stroke-width="4" fill="none"/>
  <ellipse cx="218" cy="92" rx="15" ry="8" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
  <ellipse cx="342" cy="92" rx="15" ry="8" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
  <line x1="292" y1="72" x2="405" y2="55" stroke="#334155" stroke-width="1.5"/>
  <line x1="344" y1="92" x2="430" y2="105" stroke="#334155" stroke-width="1.5"/>
  <line x1="280" y1="183" x2="425" y2="205" stroke="#334155" stroke-width="1.5"/>
  <line x1="217" y1="150" x2="120" y2="210" stroke="#334155" stroke-width="1.5"/>
  <circle cx="405" cy="55" r="16" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="405" y="61" text-anchor="middle" font-size="18" font-family="Arial, sans-serif">A</text>
  <circle cx="430" cy="105" r="16" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="430" y="111" text-anchor="middle" font-size="18" font-family="Arial, sans-serif">B</text>
  <circle cx="425" cy="205" r="16" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="425" y="211" text-anchor="middle" font-size="18" font-family="Arial, sans-serif">C</text>
  <circle cx="120" cy="210" r="16" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="120" y="216" text-anchor="middle" font-size="18" font-family="Arial, sans-serif">D</text>
</svg>`,
};

const classificationCluesFigure: ItemFigure = {
  type: "svg",
  title: "Classification clues for four organisms",
  description:
    "Four organisms are described using cell type, nutrition and body organisation clues.",
  svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="320" fill="#ffffff"/>
  <rect x="36" y="38" width="628" height="244" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="36" y1="92" x2="664" y2="92" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="190" y1="38" x2="190" y2="282" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="355" y1="38" x2="355" y2="282" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="515" y1="38" x2="515" y2="282" stroke="#cbd5e1" stroke-width="2"/>
  <text x="112" y="72" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">Organism</text>
  <text x="272" y="72" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">Cell type</text>
  <text x="435" y="72" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">Nutrition</text>
  <text x="590" y="72" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">Body</text>
  <g font-size="15" font-family="Arial, sans-serif" fill="#334155">
    <text x="112" y="125" text-anchor="middle">P</text><text x="272" y="125" text-anchor="middle">no true nucleus</text><text x="435" y="125" text-anchor="middle">varied</text><text x="590" y="125" text-anchor="middle">unicellular</text>
    <text x="112" y="170" text-anchor="middle">Q</text><text x="272" y="170" text-anchor="middle">eukaryotic</text><text x="435" y="170" text-anchor="middle">absorptive</text><text x="590" y="170" text-anchor="middle">hyphae</text>
    <text x="112" y="215" text-anchor="middle">R</text><text x="272" y="215" text-anchor="middle">eukaryotic</text><text x="435" y="215" text-anchor="middle">photosynthetic</text><text x="590" y="215" text-anchor="middle">multicellular</text>
    <text x="112" y="260" text-anchor="middle">S</text><text x="272" y="260" text-anchor="middle">eukaryotic</text><text x="435" y="260" text-anchor="middle">ingestive</text><text x="590" y="260" text-anchor="middle">multicellular</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Cell Structure and Cell Processes",
    subtopic:
      "Plant and animal cells, prokaryotic and eukaryotic cells, organelles, permeability, osmosis and cell division.",
    mc: [
      {
        questionLatex:
          "A student observes an onion peel cell and does not see chloroplasts. Which conclusion is most scientific?",
        difficulty: 2,
        skillTags: ["cell_observation", "plant_cell_features"],
        choices: [
          "It cannot be a plant cell because all plant cells must contain chloroplasts.",
          "It can still be a plant cell because non-green plant cells may lack chloroplasts.",
          "It must be an animal cell because only animal cells have a nucleus.",
          "It must be a bacterial cell because onion peel cells do not move.",
        ],
        correctLetter: "B",
        rationales: {
          A: "This overgeneralises from green leaf cells. Many plant cells, such as onion epidermal cells, do not have chloroplasts.",
          C: "Both plant and animal eukaryotic cells have a nucleus.",
          D: "Lack of movement does not make a cell bacterial; onion peel cells are eukaryotic plant cells.",
        },
        hints: [
          "Ask whether every plant cell performs photosynthesis.",
          "Think of underground or non-green plant parts.",
          "A plant cell can show a cell wall and nucleus even if chloroplasts are absent.",
        ],
        solution: solution(
          "Onion peel is a non-green plant tissue. Its cells have plant-cell features such as a cell wall, but they do not normally show chloroplasts.",
        ),
      },
      {
        questionLatex:
          "A cell has genetic material not enclosed inside a nuclear membrane. It also has ribosomes and a cell wall. The cell is best described as",
        difficulty: 2,
        skillTags: ["prokaryote_eukaryote", "cell_organisation"],
        choices: [
          "a eukaryotic plant cell",
          "an animal cell",
          "a mature red blood cell",
          "a prokaryotic cell",
        ],
        correctLetter: "D",
        rationales: {
          A: "Plant cells are eukaryotic and have a membrane-bound nucleus.",
          B: "Animal cells are eukaryotic and do not have a cell wall.",
          C: "This option does not match the general description of genetic material without a nuclear membrane plus cell wall.",
        },
        hints: [
          "The main clue is the absence of a nuclear membrane.",
          "Prokaryotes can still have ribosomes.",
          "Bacterial cells are common examples of prokaryotic cells.",
        ],
        solution: solution(
          "In prokaryotic cells, the genetic material is not enclosed by a nuclear membrane. They may still have ribosomes and a cell wall.",
        ),
      },
      {
        questionLatex:
          "Mitochondria supply ATP for energy-requiring cell processes. Which of these processes directly requires a supply of cellular energy?",
        difficulty: 2,
        skillTags: ["mitochondria", "structure_function"],
        choices: [
          "active transport across the plasma membrane",
          "diffusion of oxygen down its concentration gradient",
          "osmosis of water across a selectively permeable membrane",
          "absorption of light by chlorophyll",
        ],
        correctLetter: "A",
        rationales: {
          B: "Diffusion down a concentration gradient is passive and does not directly use cellular ATP.",
          C: "Osmosis is passive water movement and does not directly require cellular ATP.",
          D: "Absorbing light uses incoming light energy, not a direct supply of cellular ATP.",
        },
        hints: [
          "Distinguish active processes from passive movement down a concentration gradient.",
          "Diffusion and osmosis are passive processes.",
          "Transport against a concentration gradient requires cellular energy.",
        ],
        solution: solution(
          "Active transport requires cellular energy, commonly supplied by ATP. Diffusion and osmosis are passive, while absorption of light draws on incoming light energy.",
        ),
      },
      {
        questionLatex:
          "A plant cell placed in pure water swells but usually does not burst. The best explanation is that",
        difficulty: 2,
        skillTags: ["osmosis", "cell_wall"],
        choices: [
          "water leaves faster than it enters in pure water",
          "the cell wall prevents water from entering the cell",
          "the rigid cell wall resists excessive expansion",
          "the plasma membrane becomes completely impermeable",
        ],
        correctLetter: "C",
        rationales: {
          A: "Net water entry, not net loss, causes the initial swelling in pure water.",
          B: "The cell wall is permeable to water. It limits expansion mechanically rather than blocking water entry.",
          D: "The plasma membrane remains selectively permeable; it does not become completely impermeable.",
        },
        hints: [
          "Water enters by osmosis.",
          "Compare plant and animal cell boundaries.",
          "The cell wall gives mechanical support.",
        ],
        solution: solution(
          "Water enters the plant cell by osmosis, but the rigid cell wall develops wall pressure and prevents bursting under normal conditions.",
        ),
      },
      {
        questionLatex:
          "Which pair is correctly matched with the main function?",
        difficulty: 1,
        skillTags: ["organelle_function", "cell_structure"],
        choices: [
          "Vacuole - controls heredity",
          "Ribosome - protein synthesis",
          "Cell wall - controls entry and exit selectively",
          "Nucleus - produces food by photosynthesis",
        ],
        correctLetter: "B",
        rationales: {
          A: "The nucleus, not the vacuole, carries hereditary material.",
          C: "The plasma membrane is selectively permeable. The cell wall mainly gives support and protection.",
          D: "Chloroplasts carry out photosynthesis in green plant cells.",
        },
        hints: [
          "Match each structure to its most direct role.",
          "Protein-making sites are tiny particles in the cytoplasm or on rough ER.",
          "Ribosomes are the sites of protein synthesis.",
        ],
        solution: solution(
          "Ribosomes are correctly matched with protein synthesis. The other options swap functions of nucleus, chloroplasts and plasma membrane.",
        ),
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "State one difference between a selectively permeable plasma membrane and a freely permeable cell wall.",
        difficulty: 2,
        skillTags: ["plasma_membrane", "cell_wall"],
        parts: singlePart(
          "a",
          "Write one clear difference in terms of movement of substances.",
          1,
        ),
        hints: [
          "Think about which boundary decides entry and exit.",
          "The cell wall allows most dissolved substances to pass.",
          "Use the words selectively permeable and freely permeable correctly.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that the plasma membrane permits selected substances while the cell wall allows most substances to pass.",
          },
        ]),
        commonErrors: [
          "Writing that both boundaries are equally selective.",
          "Calling the cell wall the living boundary of the cell.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The plasma membrane is selectively permeable because it controls entry and exit of substances. The cell wall is generally freely permeable and mainly provides support and protection.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The figure shows schematic drawings of two cells. Use the visible features to identify which is more likely to be a plant cell and give two reasons.",
        difficulty: 2,
        skillTags: ["plant_animal_cell_comparison", "diagram_reasoning"],
        figure: cellComparisonFigure,
        parts: singlePart(
          "a",
          "Identify the plant cell and support your answer with two visible features.",
          3,
        ),
        hints: [
          "Look for a rigid outer boundary.",
          "Compare the size of the central space inside each cell.",
          "Plant cells usually have a cell wall and a large vacuole.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies Cell X as the plant cell.",
          },
          {
            part: "a",
            points: 1,
            description: "Identifies a rigid outer wall supporting the box-like outline. Do not count the wall and shape as two separate reasons.",
          },
          {
            part: "a",
            points: 1,
            description: "Identifies the large central vacuole/space as the second structural feature.",
          },
        ]),
        commonErrors: [
          "Using only colour as evidence.",
          "Saying Cell X is plant only because it is drawn on the left.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Cell X is more likely to be a plant cell. It has a rigid, box-like outer boundary and a large central space resembling a vacuole. Cell Y has a flexible outline, which is more typical of an animal cell.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A raisin kept in water swells, but the same raisin kept in concentrated sugar solution shrinks. Explain both observations using osmosis.",
        difficulty: 3,
        skillTags: ["osmosis", "water_movement"],
        parts: singlePart(
          "a",
          "Explain the direction of water movement in both cases.",
          3,
        ),
        hints: [
          "Water moves through a selectively permeable membrane.",
          "Compare water concentration inside and outside the raisin.",
          "Water enters from dilute surroundings and leaves into concentrated surroundings.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States that water enters the raisin in water.",
          },
          {
            part: "a",
            points: 1,
            description:
              "States that water leaves the raisin in concentrated sugar solution.",
          },
          {
            part: "a",
            points: 1,
            description: "Correctly names or explains osmosis.",
          },
        ]),
        commonErrors: [
          "Saying sugar enters the raisin as the main reason.",
          "Describing diffusion without mentioning water movement through a membrane.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In water, the outside solution is more dilute, so water enters the raisin by osmosis and it swells. In concentrated sugar solution, the outside has lower water concentration, so water moves out of the raisin and it shrinks.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A laboratory model uses a membrane that allows water to pass but not starch molecules. Starch solution is placed inside the membrane bag and the bag is kept in water.",
        difficulty: 3,
        skillTags: ["semipermeable_membrane", "osmosis_experiment"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "What type of membrane is being modelled in this experiment?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "In which direction will water move initially, and why?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "What will happen to the volume inside the bag after some time?",
            points: 1,
          },
        ],
        hints: [
          "The membrane allows only some substances to pass.",
          "Water moves from dilute side to the side with more solute.",
          "If water enters the bag, its volume increases.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names a selectively permeable or semipermeable membrane.",
          },
          {
            part: "b",
            points: 1,
            description: "States that the initial net water movement is into the bag.",
          },
          {
            part: "b",
            points: 1,
            description: "Explains that the starch solution inside has lower water concentration than the surrounding water and the membrane allows water to pass.",
          },
          {
            part: "c",
            points: 1,
            description: "States that the volume inside the bag increases.",
          },
        ]),
        commonErrors: [
          "Assuming starch moves out through the membrane.",
          "Reversing the direction of osmosis.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The membrane represents a selectively permeable membrane.",
          },
          {
            part: "b",
            explanation:
              "Water will initially move into the bag because the starch solution has a higher solute concentration and lower water concentration than the water outside.",
          },
          {
            part: "c",
            explanation:
              "The volume inside the bag will increase as water enters by osmosis.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In humans, explain why cell division is necessary for both wound healing and sexual reproduction, but the type of division differs in these two cases.",
        difficulty: 3,
        skillTags: ["cell_division", "mitosis_meiosis", "application"],
        parts: singlePart(
          "a",
          "Give a reasoned answer mentioning growth/repair and gamete formation.",
          3,
        ),
        hints: [
          "Wound healing replaces body cells.",
          "Sexual reproduction uses gametes.",
          "Mitosis keeps chromosome number the same; meiosis reduces it in gametes.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Links wound healing to production of new body cells.",
          },
          {
            part: "a",
            points: 1,
            description: "Links reproduction to formation of gametes or new individuals.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Distinguishes mitosis for repair/growth from meiosis for gamete formation.",
          },
        ]),
        commonErrors: [
          "Writing that all cell division is identical.",
          "Ignoring chromosome number in gamete formation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Wound healing requires mitosis because new body cells must replace damaged cells while keeping the same chromosome number. Sexual reproduction requires gametes; these are formed by meiosis, which reduces chromosome number and helps create variation.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Plant and Animal Tissues",
    subtopic:
      "Meristematic and permanent tissues, simple and complex tissues, animal tissues, joints and care of the musculoskeletal system.",
    mc: [
      {
        questionLatex:
          "A gardener cuts off the extreme tip of a young shoot. The immediate reduction in lengthwise growth is mainly because which tissue was removed?",
        difficulty: 3,
        skillTags: ["meristematic_tissue", "apical_meristem"],
        choices: [
          "Sclerenchyma",
          "Xylem",
          "Apical meristem",
          "Epidermis",
        ],
        correctLetter: "C",
        rationales: {
          A: "Sclerenchyma mainly gives mechanical strength and is not the main growing tissue at the shoot tip.",
          B: "Xylem conducts water and minerals; it is not the primary tissue causing tip growth.",
          D: "Epidermis protects the surface but does not cause active lengthwise growth.",
        },
        hints: [
          "Lengthwise growth occurs at tips.",
          "Tip regions contain actively dividing cells.",
          "The apical meristem is at root and shoot tips.",
        ],
        solution: solution(
          "The shoot tip contains apical meristem, whose cells divide actively and cause increase in length.",
        ),
      },
      {
        questionLatex:
          "Aquatic plants often have large air spaces in their simple permanent tissue. This adaptation is best linked to",
        difficulty: 2,
        skillTags: ["parenchyma", "aerenchyma", "adaptation"],
        choices: [
          "buoyancy and gaseous exchange",
          "transport of food from leaves to roots",
          "contraction and relaxation",
          "transmission of nerve impulses",
        ],
        correctLetter: "A",
        rationales: {
          B: "Food transport is the function of phloem, not air-space parenchyma.",
          C: "Contraction is a function of muscle tissue.",
          D: "Nerve impulse transmission is a function of nervous tissue.",
        },
        hints: [
          "Air spaces make the plant lighter.",
          "This tissue is a modified parenchyma.",
          "Aerenchyma helps aquatic plants float and exchange gases.",
        ],
        solution: solution(
          "Aerenchyma is parenchyma with large air spaces. It helps aquatic plants float and supports gaseous exchange.",
        ),
      },
      {
        questionLatex:
          "The tough fibres in coconut husk are mainly formed by thick-walled dead cells. Which tissue best fits this description?",
        difficulty: 2,
        skillTags: ["sclerenchyma", "plant_tissue_identification"],
        choices: [
          "Parenchyma",
          "Collenchyma",
          "Phloem parenchyma",
          "Sclerenchyma",
        ],
        correctLetter: "D",
        rationales: {
          A: "Parenchyma cells are usually living and thin-walled.",
          B: "Collenchyma cells are living and provide flexible support, not hard dead fibres.",
          C: "Phloem parenchyma is living storage/conducting tissue, not the main hard fibre tissue in husk.",
        },
        hints: [
          "The clue says thick-walled and dead.",
          "This tissue gives mechanical strength.",
          "Sclerenchyma forms hard fibres.",
        ],
        solution: solution(
          "Sclerenchyma consists of thick-walled dead cells and gives mechanical strength, as seen in coconut husk fibres.",
        ),
      },
      {
        questionLatex:
          "Which statement correctly compares xylem and phloem?",
        difficulty: 3,
        skillTags: ["xylem_phloem", "complex_tissues"],
        choices: [
          "Both transport only water and minerals upward.",
          "Xylem mainly transports water and minerals, while phloem transports food.",
          "Xylem transports food, while phloem transports oxygen.",
          "Both are simple tissues made of only one type of cell.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Phloem does not transport only water and minerals.",
          C: "This reverses xylem and phloem functions and adds oxygen transport incorrectly.",
          D: "Xylem and phloem are complex tissues, not simple tissues.",
        },
        hints: [
          "Xylem is linked with roots and water.",
          "Phloem is linked with leaves and prepared food.",
          "Both are complex conducting tissues.",
        ],
        solution: solution(
          "Xylem conducts water and minerals, mostly from roots to other parts. Phloem conducts prepared food from leaves to other parts of the plant.",
        ),
      },
      {
        questionLatex:
          "A tissue contracts rhythmically without conscious control and is found only in the heart. It is",
        difficulty: 1,
        skillTags: ["cardiac_muscle", "animal_tissues"],
        choices: [
          "striated skeletal muscle",
          "smooth muscle",
          "cardiac muscle",
          "nervous tissue",
        ],
        correctLetter: "C",
        rationales: {
          A: "Skeletal muscle is usually voluntary and attached to bones.",
          B: "Smooth muscle is involuntary but is found in organs such as intestine and blood vessels, not only heart.",
          D: "Nervous tissue conducts impulses; it does not contract rhythmically.",
        },
        hints: [
          "The clue says only in the heart.",
          "The tissue is involuntary and rhythmic.",
          "Cardiac muscle forms the heart wall.",
        ],
        solution: solution(
          "Cardiac muscle is involuntary, rhythmic and found in the heart.",
        ),
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Give one difference between meristematic tissue and permanent tissue.",
        difficulty: 2,
        skillTags: ["meristematic_permanent_tissue"],
        parts: singlePart("a", "State one clear difference.", 1),
        hints: [
          "Think about ability to divide.",
          "Meristematic cells are active in growth regions.",
          "Permanent tissues are differentiated for particular functions.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that meristematic tissue divides actively while permanent tissue is differentiated and usually does not divide.",
          },
        ]),
        commonErrors: [
          "Saying permanent tissue is dead in all cases.",
          "Mixing up meristematic tissue with only root tissue.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Meristematic tissue has actively dividing cells, whereas permanent tissue has differentiated cells that perform specific functions and usually do not divide.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A young stem bends in the wind but does not break easily. Name the tissue mainly responsible and explain how its structure helps.",
        difficulty: 3,
        skillTags: ["collenchyma", "structure_function"],
        parts: singlePart(
          "a",
          "Name the tissue and connect its structure to flexible support.",
          3,
        ),
        hints: [
          "The stem is young and flexible.",
          "Look for a living tissue with uneven thickening at cell corners.",
          "Collenchyma gives flexibility with support.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names collenchyma.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Mentions living elongated cells with unevenly thickened corners.",
          },
          {
            part: "a",
            points: 1,
            description: "Links the tissue to flexible mechanical support.",
          },
        ]),
        commonErrors: [
          "Choosing sclerenchyma for a flexible young stem.",
          "Giving function without structural reason.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The tissue is collenchyma. Its living elongated cells have uneven thickening at the corners, so it gives support while allowing the young stem to bend without breaking.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the figure to name the type of meristem expected at P and R, and state the kind of growth it causes.",
        difficulty: 3,
        skillTags: ["apical_meristem", "diagram_reasoning"],
        figure: meristemFigure,
        parts: singlePart(
          "a",
          "Identify the meristem at P and R and state its role.",
          3,
        ),
        hints: [
          "P and R are at the tips.",
          "Tip meristems increase length.",
          "The same type of meristem is present at shoot and root tips.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names apical meristem at P and R.",
          },
          {
            part: "a",
            points: 1,
            description: "States that it causes increase in length.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Correctly relates P to shoot tip and R to root tip without confusing Q.",
          },
        ]),
        commonErrors: [
          "Calling Q apical meristem.",
          "Writing increase in girth for P and R.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P and R are tip regions, so they contain apical meristem. Apical meristem causes primary growth, which increases the length of the shoot and root.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Compare striated muscle, smooth muscle and cardiac muscle on the basis of location, control and one structural feature.",
        difficulty: 4,
        skillTags: ["muscle_tissues", "comparison"],
        parts: singlePart(
          "a",
          "Write a structured comparison using location, control and one feature.",
          5,
        ),
        hints: [
          "Use three rows: striated, smooth and cardiac.",
          "Control means voluntary or involuntary.",
          "Structural features include striations, spindle shape and branching.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Correctly describes striated muscle.",
          },
          {
            part: "a",
            points: 1,
            description: "Correctly describes smooth muscle.",
          },
          {
            part: "a",
            points: 1,
            description: "Correctly describes cardiac muscle.",
          },
          {
            part: "a",
            points: 2,
            description:
              "Uses all three bases of comparison clearly and avoids mixing voluntary/involuntary control.",
          },
        ]),
        commonErrors: [
          "Calling cardiac muscle voluntary.",
          "Writing location only without structure.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Striated muscle is attached to bones, is voluntary and has long cylindrical striped fibres. Smooth muscle is found in organs such as intestine and blood vessels, is involuntary and has spindle-shaped non-striated cells. Cardiac muscle is found in the heart, is involuntary and has branched striated fibres that contract rhythmically.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "During sports practice, a student twists his ankle. The doctor says a ligament has been stretched, not a tendon.",
        difficulty: 3,
        skillTags: ["joints", "musculoskeletal_care", "connective_tissue"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "What does a ligament connect?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "What does a tendon connect?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Write two care measures that reduce risk of such injuries.",
            points: 2,
          },
        ],
        hints: [
          "Both are connective tissues, but their attachments are different.",
          "Ligaments stabilise joints.",
          "Warm-up, posture, nutrition and safe exercise habits matter.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States ligament connects bone to bone.",
          },
          {
            part: "b",
            points: 1,
            description: "States tendon connects muscle to bone.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Gives two valid care measures such as warm-up, correct posture, suitable footwear, balanced diet, avoiding overstrain or safe exercise.",
          },
        ]),
        commonErrors: [
          "Interchanging ligament and tendon.",
          "Writing treatment advice without prevention/care measures.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "A ligament connects one bone to another bone at a joint.",
          },
          {
            part: "b",
            explanation: "A tendon connects muscle to bone.",
          },
          {
            part: "c",
            explanation:
              "Risk can be reduced by warming up before exercise, using correct posture and footwear, avoiding sudden overstrain, and maintaining good nutrition for bones and muscles.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Reproduction in Plants and Animals",
    subtopic:
      "Asexual and sexual reproduction, flowering plants, human reproductive systems, fertilisation, embryo development and reproductive health.",
    mc: [
      {
        questionLatex:
          "A new individual grows out as a small projection from the parent body and later separates. This method of reproduction is",
        difficulty: 1,
        skillTags: ["asexual_reproduction", "budding"],
        choices: ["fragmentation", "spore formation", "binary fission", "budding"],
        correctLetter: "D",
        rationales: {
          A: "Fragmentation involves the parent body breaking into pieces, not a bud growing out.",
          B: "Spore formation involves spores, not a small outgrowth on the parent body.",
          C: "Binary fission involves splitting into two nearly equal cells.",
        },
        hints: [
          "The clue is a small projection.",
          "Hydra and yeast are common examples.",
          "The process is budding.",
        ],
        solution: solution(
          "A small outgrowth that develops on the parent and later separates is a bud, so the method is budding.",
        ),
      },
      {
        questionLatex:
          "In a flower, pollination is complete when pollen grains are transferred from",
        difficulty: 2,
        skillTags: ["pollination", "flower_parts"],
        choices: [
          "ovary to stigma",
          "anther to stigma",
          "stigma to ovule",
          "petal to sepal",
        ],
        correctLetter: "B",
        rationales: {
          A: "The ovary contains ovules; it is not the pollen-producing part.",
          C: "Movement from stigma to ovule is related to events after pollination, not pollination itself.",
          D: "Petals and sepals are not the pollen-transfer parts.",
        },
        hints: [
          "Pollen is produced in the male part.",
          "Pollen lands on the receptive female surface.",
          "Pollination is transfer from anther to stigma.",
        ],
        solution: solution(
          "Pollination is the transfer of pollen grains from the anther to the stigma.",
        ),
      },
      {
        questionLatex:
          "A plant produces light seeds with wing-like extensions. The most likely advantage is",
        difficulty: 2,
        skillTags: ["seed_dispersal", "adaptation"],
        choices: [
          "dispersal by wind away from the parent plant",
          "direct fertilisation inside the ovary",
          "prevention of embryo formation",
          "conversion of ovules into pollen grains",
        ],
        correctLetter: "A",
        rationales: {
          B: "Wing-like seeds are related to dispersal, not fertilisation.",
          C: "Seed structures support embryo dispersal; they do not prevent embryo formation.",
          D: "Ovules do not convert into pollen grains.",
        },
        hints: [
          "Wings increase surface area.",
          "Light structures are carried by air.",
          "The adaptation helps seed dispersal.",
        ],
        solution: solution(
          "Light seeds with wings can be carried by wind, helping the plant disperse seeds away from the parent.",
        ),
      },
      {
        questionLatex:
          "In humans, fertilisation normally takes place in the",
        difficulty: 2,
        skillTags: ["human_reproduction", "fertilisation_site"],
        choices: ["uterus", "vagina", "oviduct", "ovary"],
        correctLetter: "C",
        rationales: {
          A: "The uterus is the main site of embryo implantation and development, not the usual site of fertilisation.",
          B: "The vagina receives sperm but is not the usual site of fertilisation.",
          D: "The ovary produces ova; fertilisation usually occurs after ovulation in the oviduct.",
        },
        hints: [
          "The ovum moves from ovary toward uterus.",
          "Fertilisation usually happens before implantation.",
          "The oviduct is the usual site.",
        ],
        solution: solution(
          "In humans, fertilisation usually occurs in the oviduct, also called the fallopian tube.",
        ),
      },
      {
        questionLatex:
          "If fertilisation does not occur during a menstrual cycle, the immediate result is usually",
        difficulty: 3,
        skillTags: ["menstrual_cycle", "reproductive_health"],
        choices: [
          "formation of a seed",
          "growth of pollen tube",
          "implantation of embryo",
          "breakdown of the thickened uterine lining",
        ],
        correctLetter: "D",
        rationales: {
          A: "Seed formation occurs in flowering plants after fertilisation, not in the human menstrual cycle.",
          B: "Pollen tube growth is a plant reproduction event.",
          C: "Implantation needs an embryo, which forms only after fertilisation.",
        },
        hints: [
          "The uterus prepares for possible pregnancy.",
          "Without fertilisation, there is no embryo to implant.",
          "The uterine lining breaks down and menstruation occurs.",
        ],
        solution: solution(
          "If fertilisation does not occur, the thickened uterine lining is shed during menstruation.",
        ),
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write one difference between sexual reproduction and asexual reproduction.",
        difficulty: 2,
        skillTags: ["sexual_asexual_reproduction"],
        parts: singlePart("a", "State one valid difference.", 1),
        hints: [
          "Think about gametes.",
          "Think about number of parents.",
          "Sexual reproduction usually involves fusion of gametes.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States a valid difference, such as gamete fusion/two parents in sexual reproduction and no gamete fusion/one parent in asexual reproduction.",
          },
        ]),
        commonErrors: [
          "Writing that asexual reproduction always produces weak offspring.",
          "Ignoring gamete fusion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Sexual reproduction involves fusion of male and female gametes, while asexual reproduction occurs without fusion of gametes and usually involves a single parent.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the flower figure. Identify the labelled parts that produce pollen and receive pollen, and state the event that connects these two parts.",
        difficulty: 3,
        skillTags: ["flower_diagram", "pollination"],
        figure: flowerFigure,
        parts: singlePart(
          "a",
          "Identify the pollen-producing and pollen-receiving labelled parts and name the event.",
          3,
        ),
        hints: [
          "Pollen is produced in anthers.",
          "Pollen lands on the stigma.",
          "Transfer of pollen from anther to stigma is pollination.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies B as the pollen-producing anther.",
          },
          {
            part: "a",
            points: 1,
            description: "Identifies A as the pollen-receiving stigma.",
          },
          {
            part: "a",
            points: 1,
            description: "Names the event as pollination.",
          },
        ]),
        commonErrors: [
          "Confusing stigma and ovary.",
          "Calling pollination fertilisation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "B points to an anther, which produces pollen. A points to the stigma, which receives pollen. The transfer of pollen from anther to stigma is pollination.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Why does sexual reproduction usually produce more variation among offspring than asexual reproduction?",
        difficulty: 3,
        skillTags: ["variation", "sexual_reproduction"],
        parts: singlePart(
          "a",
          "Give a reason based on gametes and parents.",
          2,
        ),
        hints: [
          "Sexual reproduction involves two gametes.",
          "Each gamete carries hereditary information.",
          "Mixing genetic material creates new combinations.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Mentions fusion of gametes or two parents.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Links fusion/mixing of hereditary material to variation.",
          },
        ]),
        commonErrors: [
          "Writing that asexual reproduction never has any variation under any condition.",
          "Saying variation is caused by food habits only.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Sexual reproduction involves fusion of male and female gametes, often from two parents. This combines hereditary material in new ways, so offspring usually show more variation.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Trace the events in a flowering plant from pollination up to seed formation.",
        difficulty: 4,
        skillTags: ["flowering_plant_reproduction", "sequence_reasoning"],
        parts: singlePart(
          "a",
          "Write the sequence with the main structures involved.",
          5,
        ),
        hints: [
          "Start with pollen reaching stigma.",
          "Then think of pollen tube and ovule.",
          "After fertilisation, the ovule becomes seed.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Begins with pollination at the stigma.",
          },
          {
            part: "a",
            points: 1,
            description: "Mentions pollen tube growth through style.",
          },
          {
            part: "a",
            points: 1,
            description: "Mentions male gamete reaching ovule.",
          },
          {
            part: "a",
            points: 1,
            description: "Mentions fertilisation.",
          },
          {
            part: "a",
            points: 1,
            description: "States that ovule develops into seed.",
          },
        ]),
        commonErrors: [
          "Treating pollination and fertilisation as the same event.",
          "Writing that pollen directly becomes seed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Pollen grains are transferred from anther to stigma during pollination. A pollen tube grows through the style and carries the male gamete to the ovule. The male gamete fuses with the egg cell in the ovule; this is fertilisation. After fertilisation, the ovule develops into a seed.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A school health club prepares a display on adolescence, menstrual hygiene and reproductive health. Some students suggest hiding the topic because it is embarrassing.",
        difficulty: 3,
        skillTags: ["reproductive_health", "menstrual_hygiene", "scientific_temper"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Give one scientific reason why menstrual hygiene should be discussed openly and respectfully.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write two hygienic practices related to menstruation.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why should myths or shame not replace scientific information?",
            points: 1,
          },
        ],
        hints: [
          "Health topics should be handled with dignity.",
          "Think of cleanliness, safe disposal and access to correct information.",
          "Scientific information helps prevent infection and fear.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Gives a valid reason such as health, hygiene, prevention of infection or reducing misinformation.",
          },
          {
            part: "b",
            points: 2,
            description:
              "States two valid hygienic practices, such as using clean absorbents, changing them regularly, washing hands, and safe disposal.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Explains that myths/shame can cause misinformation and unsafe practices.",
          },
        ]),
        commonErrors: [
          "Using disrespectful language.",
          "Giving moral judgement instead of scientific health reasoning.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Menstrual hygiene should be discussed openly because correct information helps maintain health and prevent infections.",
          },
          {
            part: "b",
            explanation:
              "Examples include using clean menstrual absorbents, changing them regularly, washing hands, and disposing used materials safely.",
          },
          {
            part: "c",
            explanation:
              "Myths and shame can stop students from seeking correct information and can lead to unsafe hygiene practices. Science-based discussion promotes health and dignity.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex:
          "A doctor recommends a barrier contraceptive method because it can reduce the chance of fertilisation and also lower the risk of some sexually transmitted infections. Which method best fits this description?",
        difficulty: 3,
        skillTags: ["reproductive_health", "birth_control_methods"],
        choices: ["Condom", "Ovulation", "Menstruation", "Seed dispersal"],
        correctLetter: "A",
        rationales: {
          B: "Ovulation is the release of an ovum; it is not a contraceptive method.",
          C: "Menstruation is part of the menstrual cycle, not a method to prevent fertilisation.",
          D: "Seed dispersal is a plant process and is unrelated to human reproductive health.",
        },
        hints: [
          "A barrier method physically blocks sperm from reaching the ovum.",
          "The clue also mentions lowering the risk of some infections.",
          "Condoms are barrier contraceptives.",
        ],
        solution: solution(
          "A condom is a barrier contraceptive. It helps prevent sperm from reaching the ovum and can reduce the risk of some sexually transmitted infections.",
        ),
      },
      {
        questionLatex:
          "After fertilisation in a flower, which pair of changes is correctly stated?",
        difficulty: 3,
        skillTags: ["flowering_plant_reproduction", "ovule_seed_ovary_fruit"],
        choices: [
          "Ovule becomes fruit and ovary becomes seed.",
          "Pollen becomes fruit and stigma becomes seed.",
          "Ovule becomes seed and ovary becomes fruit.",
          "Anther becomes seed and filament becomes fruit.",
        ],
        correctLetter: "C",
        rationales: {
          A: "This reverses the correct changes: the ovule becomes seed and the ovary becomes fruit.",
          B: "Pollen delivers male gametes; it does not become fruit.",
          D: "Anther and filament are parts of the stamen; they do not become seed and fruit.",
        },
        hints: [
          "The ovule contains the egg cell.",
          "The ovary encloses ovules.",
          "After fertilisation, ovule develops into seed and ovary develops into fruit.",
        ],
        solution: solution(
          "After fertilisation, the ovule develops into a seed and the ovary develops into a fruit.",
        ),
      },
    ],
    extraConstructed: [
      {
        responseType: "saq",
        questionLatex:
          "A farmer notices that flowers are present but very few fruits form. Give two possible biological reasons linked to reproduction in flowering plants.",
        difficulty: 4,
        skillTags: ["pollination_fertilisation", "flowering_plant_application"],
        parts: singlePart(
          "a",
          "Give two reasons linked to pollination, fertilisation or reproductive structures.",
          3,
        ),
        hints: [
          "Fruit formation depends on events after flowering.",
          "Pollination must happen before fertilisation.",
          "Problems with pollen transfer, ovules or fertilisation can reduce fruit formation.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Gives two valid reasons such as poor pollination, lack of pollinators, pollen not reaching stigma, failure of fertilisation, damaged ovules or unsuitable conditions.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Links the reasons to fruit formation through fertilisation/ovary development.",
          },
        ]),
        commonErrors: [
          "Saying flowers automatically become fruits without pollination or fertilisation.",
          "Giving only water/fertiliser reasons without any reproduction link.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "One reason may be poor pollination, so pollen does not reach the stigma. Another may be failure of fertilisation or damaged ovules. Since the ovary develops into fruit after fertilisation, failure in these steps can reduce fruit formation.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "Name the human organ where an ovum is produced, and name the organ where fertilisation usually occurs.",
        difficulty: 2,
        skillTags: ["human_reproductive_system", "fertilisation_site"],
        parts: singlePart("a", "Write both organ names.", 2),
        hints: [
          "The ovum is the female gamete.",
          "Fertilisation usually occurs between ovary and uterus.",
          "The ovum is produced in the ovary; fertilisation usually occurs in the oviduct.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names ovary as the site of ovum production.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Names oviduct/fallopian tube as the usual site of fertilisation.",
          },
        ]),
        commonErrors: [
          "Writing uterus as the site of fertilisation.",
          "Confusing ovary and oviduct.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The ovum is produced in the ovary. Fertilisation usually occurs in the oviduct, also called the fallopian tube.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Diversity and Classification",
    subtopic:
      "Need for classification, five-kingdom approach, levels of organisation, body plans and scientific naming.",
    mc: [
      {
        questionLatex:
          "An organism is eukaryotic, absorbs food from dead organic matter and has a cell wall made mainly of chitin. It is most likely placed in",
        difficulty: 3,
        skillTags: ["five_kingdom_classification", "fungi"],
        choices: ["Fungi", "Plantae", "Animalia", "Monera"],
        correctLetter: "A",
        rationales: {
          B: "Plants are mainly photosynthetic and have cellulose-rich cell walls.",
          C: "Animals are ingestive heterotrophs and lack a cell wall.",
          D: "Monera are prokaryotic, while the organism here is eukaryotic.",
        },
        hints: [
          "The clue says absorptive nutrition.",
          "Chitin is a key clue.",
          "Fungi have chitinous cell walls and absorb food.",
        ],
        solution: solution(
          "Chitin cell wall and absorptive nutrition are characteristic features of fungi.",
        ),
      },
      {
        questionLatex:
          "Which criterion directly separates prokaryotes from eukaryotes?",
        difficulty: 2,
        skillTags: ["classification_criteria", "cell_type"],
        choices: [
          "method of movement",
          "colour of the organism",
          "presence or absence of a membrane-bound nucleus",
          "size of the habitat",
        ],
        correctLetter: "C",
        rationales: {
          A: "Movement can vary within both prokaryotes and eukaryotes.",
          B: "Colour is not the direct criterion for this separation.",
          D: "Habitat size is not a cellular classification criterion.",
        },
        hints: [
          "The distinction is based on cell organisation.",
          "Look at the nucleus.",
          "Eukaryotic cells have a membrane-bound nucleus.",
        ],
        solution: solution(
          "Prokaryotes lack a membrane-bound nucleus; eukaryotes possess one.",
        ),
      },
      {
        questionLatex:
          "Which scientific name is written in the correct binomial form?",
        difficulty: 2,
        skillTags: ["binomial_nomenclature", "scientific_naming"],
        choices: [
          "$\\textit{mangifera Indica}$",
          "$\\textit{MANGIFERA INDICA}$",
          "$\\textit{Mangifera}$",
          "$\\textit{Mangifera indica}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "The genus name should begin with a capital letter and the species name should be lowercase.",
          B: "Both words should not be written fully in capitals.",
          C: "A binomial name has two words: genus and species.",
        },
        hints: [
          "Binomial means two names.",
          "Genus begins with a capital letter.",
          "The species name begins with a lowercase letter.",
        ],
        solution: solution(
          "In binomial nomenclature, the genus begins with a capital letter and the species begins with a lowercase letter. Therefore, Mangifera indica is correctly written.",
        ),
      },
      {
        questionLatex:
          "Two organisms belong to the same genus but different species. Compared with organisms belonging only to the same family, these two are expected to be",
        difficulty: 3,
        skillTags: ["taxonomy_hierarchy", "classification_reasoning"],
        choices: [
          "less closely related",
          "more closely related",
          "unrelated because species are different",
          "identical in all characters",
        ],
        correctLetter: "B",
        rationales: {
          A: "Genus is a lower and more specific rank than family, so same genus usually means closer relation.",
          C: "Different species can still be closely related if they share the same genus.",
          D: "Different species are not identical in all characters.",
        },
        hints: [
          "Lower ranks are more specific.",
          "Genus is below family.",
          "Same genus indicates closer relationship than only same family.",
        ],
        solution: solution(
          "Organisms in the same genus share more characters than organisms grouped only at family level, so they are more closely related.",
        ),
      },
      {
        questionLatex:
          "A unicellular organism has a true nucleus and carries out photosynthesis. It is not a bacterium mainly because",
        difficulty: 3,
        skillTags: ["protist_clues", "prokaryote_eukaryote"],
        choices: [
          "bacteria never live alone",
          "bacteria do not have a true membrane-bound nucleus",
          "all photosynthetic organisms are plants",
          "unicellular organisms cannot be eukaryotic",
        ],
        correctLetter: "B",
        rationales: {
          A: "Many bacteria may occur singly; this is not the main distinction.",
          C: "Some photosynthetic organisms are not plants.",
          D: "Many unicellular organisms, such as some protists, are eukaryotic.",
        },
        hints: [
          "The question asks why it is not a bacterium.",
          "Bacteria are prokaryotic.",
          "A true nucleus points to eukaryotic organisation.",
        ],
        solution: solution(
          "Bacteria are prokaryotes and do not possess a true membrane-bound nucleus. The given organism has one, so it is not a bacterium.",
        ),
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Why is classification useful when studying a large number of living organisms?",
        difficulty: 2,
        skillTags: ["need_for_classification"],
        parts: singlePart("a", "Give one clear reason.", 1),
        hints: [
          "Think about organising diversity.",
          "Classification groups organisms with similar features.",
          "It makes study and comparison easier.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that classification makes study/comparison/identification of organisms easier by grouping them.",
          },
        ]),
        commonErrors: [
          "Writing that classification removes diversity.",
          "Saying it is only for naming animals.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Classification organises organisms into groups based on similarities and differences, making their study, identification and comparison easier.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "List any three criteria that can be used to classify organisms into broad groups.",
        difficulty: 2,
        skillTags: ["classification_criteria"],
        parts: singlePart("a", "Write three suitable criteria.", 3),
        hints: [
          "Start with cell type.",
          "Think about body organisation.",
          "Mode of nutrition is also a major criterion.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description:
              "Awards one mark each for valid criteria such as cell type, cellularity, body organisation, mode of nutrition or reproduction.",
          },
        ]),
        commonErrors: [
          "Using habitat alone as the only criterion.",
          "Giving three examples instead of criteria.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Three useful criteria are cell type (prokaryotic/eukaryotic), number of cells (unicellular/multicellular), and mode of nutrition (autotrophic/heterotrophic).",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Differentiate between Monera and Protista using two features.",
        difficulty: 3,
        skillTags: ["monera_protista", "classification_comparison"],
        parts: singlePart("a", "Give two clear differences.", 2),
        hints: [
          "Compare cell organisation.",
          "Both may be unicellular, so do not use only that.",
          "Monera are prokaryotic; Protista are eukaryotic.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Correctly compares nucleus/cell organisation.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Gives another valid difference or example without contradiction.",
          },
        ]),
        commonErrors: [
          "Writing that all protists are multicellular.",
          "Ignoring the true nucleus criterion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Monera are prokaryotic and lack a true nucleus; bacteria are examples. Protista are eukaryotic and have a true nucleus; Amoeba, Paramecium or unicellular algae are examples.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Four organisms P, Q, R and S are described in the figure. Place each in the most suitable broad kingdom and justify each placement.",
        difficulty: 4,
        skillTags: ["classification_case", "five_kingdom_reasoning"],
        figure: classificationCluesFigure,
        parts: singlePart(
          "a",
          "Classify P, Q, R and S and give one reason for each.",
          5,
        ),
        hints: [
          "Start by separating prokaryotic and eukaryotic organisms.",
          "Use nutrition and body organisation next.",
          "Absorptive hyphae suggest fungi; ingestive multicellular organisation suggests animals.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Classifies P as Monera with reason.",
          },
          {
            part: "a",
            points: 1,
            description: "Classifies Q as Fungi with reason.",
          },
          {
            part: "a",
            points: 1,
            description: "Classifies R as Plantae with reason.",
          },
          {
            part: "a",
            points: 1,
            description: "Classifies S as Animalia with reason.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Uses a consistent classification criterion rather than guessing names.",
          },
        ]),
        commonErrors: [
          "Putting every photosynthetic organism into Monera.",
          "Confusing fungi with plants because both may have cell walls.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P belongs to Monera because it has no true nucleus. Q belongs to Fungi because it is eukaryotic, has absorptive nutrition and hyphae. R belongs to Plantae because it is multicellular, eukaryotic and photosynthetic. S belongs to Animalia because it is multicellular, eukaryotic and ingestive.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A field survey records three specimens: a mushroom growing on a dead log, a green multicellular plant with roots and leaves, and a unicellular organism seen in pond water with a true nucleus.",
        difficulty: 3,
        skillTags: ["field_classification", "kingdoms"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Classify the mushroom into a broad kingdom.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Give one reason for placing the green multicellular plant in Plantae.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why should the pond-water organism not be called Monera if it has a true nucleus?",
            points: 2,
          },
        ],
        hints: [
          "Use nutrition for the mushroom.",
          "Use photosynthesis and multicellularity for the plant.",
          "A true nucleus means eukaryotic.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Classifies mushroom as Fungi.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Gives a valid reason such as chlorophyll/photosynthesis, multicellularity or plant body organisation.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains that Monera are prokaryotic and lack a true nucleus, while the pond organism is eukaryotic.",
          },
        ]),
        commonErrors: [
          "Calling mushroom a plant only because it is fixed.",
          "Classifying a true-nucleus organism as Monera.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The mushroom belongs to Fungi.",
          },
          {
            part: "b",
            explanation:
              "The green plant can be placed in Plantae because it is multicellular and photosynthetic.",
          },
          {
            part: "c",
            explanation:
              "Monera are prokaryotic and do not have a membrane-bound true nucleus. A unicellular organism with a true nucleus is eukaryotic, so it should not be placed in Monera.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex:
          "Which statement best explains why viruses are described as acellular entities?",
        difficulty: 2,
        skillTags: ["viruses", "acellular_entities"],
        choices: [
          "They are always photosynthetic.",
          "They have many specialised tissues.",
          "They have a true nucleus and organelles.",
          "They do not have cellular organisation and multiply only inside host cells.",
        ],
        correctLetter: "D",
        rationales: {
          A: "Viruses are not photosynthetic organisms.",
          B: "Viruses do not have tissues.",
          C: "Viruses do not have a true nucleus or membrane-bound organelles.",
        },
        hints: [
          "Acellular means not made of cells.",
          "Viruses show life-like activity only inside living host cells.",
          "They lack cellular organisation.",
        ],
        solution: solution(
          "Viruses are called acellular because they do not have cellular organisation. They multiply only inside living host cells.",
        ),
      },
      {
        questionLatex:
          "A plant has vascular tissue and reproduces by spores, but it does not produce seeds. It is best placed among",
        difficulty: 3,
        skillTags: ["plant_divisions", "pteridophytes"],
        choices: ["Bryophytes", "Pteridophytes", "Gymnosperms", "Angiosperms"],
        correctLetter: "B",
        rationales: {
          A: "Bryophytes lack well-developed vascular tissue.",
          C: "Gymnosperms produce naked seeds.",
          D: "Angiosperms produce seeds enclosed in fruits.",
        },
        hints: [
          "The plant has vascular tissue.",
          "It does not produce seeds.",
          "Seedless vascular plants are pteridophytes.",
        ],
        solution: solution(
          "Pteridophytes are seedless vascular plants. They reproduce by spores and have vascular tissue.",
        ),
      },
      {
        questionLatex:
          "While sorting animal specimens, a student separates fish, frog, lizard and bird from earthworm, snail and butterfly. The most useful criterion used here is",
        difficulty: 3,
        skillTags: ["animal_divisions", "vertebrates_invertebrates"],
        choices: [
          "mode of seed dispersal",
          "presence of chlorophyll",
          "presence of backbone",
          "type of root system",
        ],
        correctLetter: "C",
        rationales: {
          A: "Seed dispersal applies to plants, not animal grouping.",
          B: "Chlorophyll is not the criterion for grouping these animals.",
          D: "Root system is a plant feature.",
        },
        hints: [
          "Fish, frog, lizard and bird share an internal skeletal feature.",
          "Earthworm, snail and butterfly do not have that feature.",
          "The criterion is presence or absence of backbone.",
        ],
        solution: solution(
          "Fish, frog, lizard and bird are vertebrates; earthworm, snail and butterfly are invertebrates. The separating criterion is the presence of a backbone.",
        ),
      },
    ],
    extraConstructed: [
      {
        responseType: "saq",
        questionLatex:
          "Classify the following plant specimens into major plant divisions: Spirogyra, moss, fern and pine.",
        difficulty: 3,
        skillTags: ["plant_divisions", "specimen_classification"],
        parts: singlePart("a", "Write the division for each specimen.", 4),
        hints: [
          "Spirogyra is an alga.",
          "Moss is a non-vascular land plant; fern is seedless and vascular.",
          "Pine bears naked seeds.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 4,
            description:
              "Awards one mark each: Spirogyra-Algae/Thallophyta, moss-Bryophyta, fern-Pteridophyta, pine-Gymnosperms.",
          },
        ]),
        commonErrors: [
          "Putting fern and moss in the same group.",
          "Calling pine an angiosperm because it is a large plant.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Spirogyra is placed in Algae or Thallophyta. Moss is a bryophyte. Fern is a pteridophyte. Pine is a gymnosperm because it bears naked seeds.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Name the three domains used in a molecular-basis classification of organisms.",
        difficulty: 2,
        skillTags: ["three_domain_classification"],
        parts: singlePart("a", "Write the three domain names.", 3),
        hints: [
          "Two domains contain prokaryotic organisms.",
          "One domain contains eukaryotic organisms.",
          "The domains are Bacteria, Archaea and Eukarya.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description:
              "Awards one mark each for Bacteria, Archaea and Eukarya/Eukaryota.",
          },
        ]),
        commonErrors: [
          "Writing five kingdoms instead of three domains.",
          "Omitting Archaea.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The three domains are Bacteria, Archaea and Eukarya.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A lichen is observed growing on a rock. It contains a fungus and an alga living together.",
        difficulty: 4,
        skillTags: ["lichens", "organism_interactions", "ecological_role"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which two groups of organisms are involved in a lichen?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why lichen is an example of interaction between different groups of organisms.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State one ecological importance of lichens.",
            points: 1,
          },
        ],
        hints: [
          "A lichen is not a single independent plant.",
          "The algal partner can make food; the fungal partner provides support/protection and absorbs water.",
          "Lichens can help in soil formation and may act as pollution indicators.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names fungus and alga/cyanobacterium.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Explains the association using roles of the partners, such as food production by alga and shelter/water absorption by fungus.",
          },
          {
            part: "c",
            points: 1,
            description:
              "States a valid ecological importance such as soil formation or pollution indication.",
          },
        ]),
        commonErrors: [
          "Calling lichen only a moss.",
          "Ignoring the role of one partner in the association.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A lichen usually involves a fungus and an alga or cyanobacterium.",
          },
          {
            part: "b",
            explanation:
              "It shows interaction because two different groups live together. The algal partner prepares food, while the fungal partner gives support, protection and helps absorb water and minerals.",
          },
          {
            part: "c",
            explanation:
              "Lichens help in soil formation on bare rocks and can also indicate air pollution because many lichens are sensitive to polluted air.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Integrated Biology and Practical Reasoning",
    subtopic:
      "Observation skills, experiments, cell health, tissue repair and mixed application across Unit I.",
    mc: [
      {
        questionLatex:
          "While preparing a temporary mount of onion peel, which step most directly helps the nucleus become clearly visible?",
        difficulty: 2,
        skillTags: ["temporary_mount", "microscopy"],
        choices: [
          "adding a suitable stain",
          "using the thickest peel possible",
          "placing two cover slips one above another",
          "drying the peel completely before mounting",
        ],
        correctLetter: "A",
        rationales: {
          B: "A thick peel makes observation difficult because cells overlap.",
          C: "Two cover slips can distort or break the mount.",
          D: "The peel should not be completely dried; drying can damage the specimen.",
        },
        hints: [
          "The nucleus is almost transparent in an unstained cell.",
          "A stain increases contrast.",
          "Iodine or safranin can make cell parts clearer.",
        ],
        solution: solution(
          "A suitable stain increases contrast and makes structures such as the nucleus more clearly visible.",
        ),
      },
      {
        questionLatex:
          "A plant cell placed in concentrated salt solution shows the cell contents pulling away from the cell wall. This observation is called",
        difficulty: 2,
        skillTags: ["plasmolysis", "osmosis"],
        choices: ["endocytosis", "photosynthesis", "transpiration", "plasmolysis"],
        correctLetter: "D",
        rationales: {
          A: "Endocytosis is intake of material by folding of the plasma membrane, not shrinkage due to water loss.",
          B: "Photosynthesis is food production using light.",
          C: "Transpiration is loss of water vapour from aerial plant parts.",
        },
        hints: [
          "Concentrated salt solution draws water out.",
          "The protoplast shrinks away from the wall.",
          "This is plasmolysis.",
        ],
        solution: solution(
          "In a concentrated solution, water leaves the plant cell by osmosis. The cell contents shrink away from the wall; this is plasmolysis.",
        ),
      },
      {
        questionLatex:
          "A microscope slide shows cells with thin walls, dense cytoplasm and large nuclei near a root tip. The best inference is that these cells are",
        difficulty: 3,
        skillTags: ["meristematic_cells", "microscope_inference"],
        choices: [
          "dead sclerenchyma fibres",
          "actively dividing meristematic cells",
          "mature xylem vessels only",
          "cardiac muscle cells",
        ],
        correctLetter: "B",
        rationales: {
          A: "Sclerenchyma cells are thick-walled and dead, not thin-walled with dense cytoplasm.",
          C: "Mature xylem vessels are not described by dense cytoplasm and large nuclei.",
          D: "Cardiac muscle is an animal tissue, not root-tip tissue.",
        },
        hints: [
          "Root tips are growth regions.",
          "Actively dividing cells have dense cytoplasm and prominent nuclei.",
          "These are meristematic cells.",
        ],
        solution: solution(
          "Cells near the root tip with thin walls, dense cytoplasm and large nuclei are typical meristematic cells, which divide actively.",
        ),
      },
      {
        questionLatex:
          "A cut on the skin closes gradually over a few days. Which pair of processes and tissues best explains this healing?",
        difficulty: 3,
        skillTags: ["tissue_repair", "cell_division", "epithelial_tissue"],
        choices: [
          "mitosis producing new epithelial cells",
          "meiosis producing pollen grains",
          "osmosis forming xylem vessels",
          "pollination producing a protective layer",
        ],
        correctLetter: "A",
        rationales: {
          B: "Meiosis is linked to gamete formation, not skin repair.",
          C: "Osmosis and xylem vessels do not explain skin wound closure.",
          D: "Pollination is a plant reproductive event.",
        },
        hints: [
          "Skin is covered by epithelial tissue.",
          "Repair needs new body cells.",
          "Body-cell production for repair occurs by mitosis.",
        ],
        solution: solution(
          "Skin repair involves mitosis, which produces new body cells. Epithelial cells cover and protect the wound surface as healing proceeds.",
        ),
      },
      {
        questionLatex:
          "A student claims, 'Fungi are plants because they do not move from place to place.' Which correction is most accurate?",
        difficulty: 3,
        skillTags: ["classification_misconception", "fungi_plants"],
        choices: [
          "Fungi are plants because all non-moving organisms are plants.",
          "Fungi are animals because they are heterotrophic.",
          "Fungi are bacteria because they grow on dead matter.",
          "Fungi form a separate kingdom because they absorb food and lack chlorophyll.",
        ],
        correctLetter: "D",
        rationales: {
          A: "Movement alone is not enough for classification; many non-moving organisms are not plants.",
          B: "Animals ingest food and lack cell walls; fungi are not animals.",
          C: "Bacteria are prokaryotic; fungi are eukaryotic.",
        },
        hints: [
          "Do not classify using only movement.",
          "Think about mode of nutrition and chlorophyll.",
          "Fungi absorb food and lack chlorophyll, so they are separate from plants.",
        ],
        solution: solution(
          "Fungi are not plants merely because they are fixed. They lack chlorophyll and absorb food from organic matter, so they are placed in a separate kingdom.",
        ),
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write one precaution while preparing a temporary mount of onion peel.",
        difficulty: 1,
        skillTags: ["temporary_mount", "lab_precaution"],
        parts: singlePart("a", "State one valid precaution.", 1),
        hints: [
          "Think about thickness of peel.",
          "Think about air bubbles under the cover slip.",
          "A thin peel and careful cover-slip placement improve observation.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Gives one valid precaution such as using a thin peel, avoiding folds, adding stain properly or avoiding air bubbles.",
          },
        ]),
        commonErrors: [
          "Writing an aim instead of a precaution.",
          "Saying to use a very thick peel.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "One precaution is to place the cover slip gently so that air bubbles are not trapped over the onion peel.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the osmosis figure to explain why the cell contents shrink in the second diagram.",
        difficulty: 3,
        skillTags: ["osmosis_diagram", "plasmolysis"],
        figure: osmosisFigure,
        parts: singlePart(
          "a",
          "Explain the direction of water movement and name the result.",
          3,
        ),
        hints: [
          "The outside solution is concentrated.",
          "Water moves from higher water concentration to lower water concentration.",
          "Loss of water causes plasmolysis.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States that water moves out of the cell.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Explains that the outside solution is concentrated/lower in water concentration.",
          },
          {
            part: "a",
            points: 1,
            description: "Names or correctly describes plasmolysis.",
          },
        ]),
        commonErrors: [
          "Saying water enters the cell in concentrated solution.",
          "Calling the cell wall shrinkage the main event.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In the concentrated solution, water moves out of the cell by osmosis. The protoplast shrinks away from the cell wall, which is called plasmolysis.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A doctor explains that cancer begins when cell division becomes uncontrolled. Why is the word uncontrolled important in this statement?",
        difficulty: 3,
        skillTags: ["cell_division", "cancer_awareness"],
        parts: singlePart(
          "a",
          "Explain why normal cell division is useful but uncontrolled division is harmful.",
          3,
        ),
        hints: [
          "Normal division supports growth and repair.",
          "The body regulates when cells divide.",
          "Uncontrolled division can form abnormal masses and disturb tissue function.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States that normal cell division is needed.",
          },
          {
            part: "a",
            points: 1,
            description:
              "States that uncontrolled division produces too many abnormal cells.",
          },
          {
            part: "a",
            points: 1,
            description: "Links uncontrolled growth to tissue damage or cancer.",
          },
        ]),
        commonErrors: [
          "Writing that all cell division is harmful.",
          "Giving fear-based statements without biological reasoning.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Normal cell division is essential for growth, replacement and repair. It becomes harmful when regulation fails and cells divide uncontrollably, producing abnormal cell masses that can interfere with tissue function.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A student studies a pond-water organism. It is unicellular, has a true nucleus, moves using hair-like structures and feeds on smaller particles.",
        difficulty: 4,
        skillTags: ["classification_application", "protista"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Should the organism be placed in Monera, Protista, Plantae or Animalia? Justify.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Give one reason why it is not a plant and one reason why it is not a bacterium.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Name one classification criterion used in your answer.",
            points: 1,
          },
        ],
        hints: [
          "A true nucleus means eukaryotic.",
          "Unicellular eukaryotes commonly fall under Protista.",
          "Use cell type and nutrition as criteria.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Places it in Protista and justifies using unicellular eukaryotic organisation.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Explains it is not a plant because it does not photosynthesise/feeds on particles, and not a bacterium because it has a true nucleus.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Names a valid criterion such as cell type, cellularity, nutrition or movement.",
          },
        ]),
        commonErrors: [
          "Putting every unicellular organism in Monera.",
          "Calling it Animalia only because it moves.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "It should be placed in Protista because it is unicellular and eukaryotic, as shown by the true nucleus.",
          },
          {
            part: "b",
            explanation:
              "It is not a plant because it feeds on particles instead of making food by photosynthesis. It is not a bacterium because bacteria lack a true membrane-bound nucleus.",
          },
          {
            part: "c",
            explanation:
              "The answer uses criteria such as cell type, cellularity and mode of nutrition.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "In a school garden investigation, Group A seedlings have their root tips damaged during transplanting, while Group B seedlings remain undamaged. Later, some flowers form but pollinators are absent for several days, and most mature seeds fall close to the parent plant.",
        difficulty: 5,
        skillTags: [
          "integrated_unit_case",
          "plant_tissues",
          "reproduction",
          "seed_dispersal",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Predict which group will show poorer root elongation and identify the tissue directly affected.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "A young stem bends in the wind but does not break easily. Name the tissue responsible and explain the structural reason.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why fruit formation may be poor when pollinators are absent. Use both pollination and fertilisation in your answer.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain one population-level consequence if most seeds fall close to the parent plant.",
            points: 1,
          },
        ],
        hints: [
          "Each part asks for a prediction plus a biological reason.",
          "Root tips contain actively dividing cells; fruit formation needs events after pollen transfer.",
          "Close seed fall increases competition near the parent plant.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Predicts poorer root elongation in Group A and identifies apical meristem/root-tip meristem as the affected tissue.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Names collenchyma and explains flexible support using living elongated cells with unevenly thickened corners.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains that lack of pollinators reduces pollination, so fertilisation may not occur and the ovary may not develop into fruit.",
          },
          {
            part: "d",
            points: 1,
            description:
              "Explains increased competition/crowding near the parent or reduced spread to new habitats, with a population-level consequence.",
          },
        ]),
        commonErrors: [
          "Giving one memorised term for every part without making the required prediction.",
          "Treating pollination, fertilisation and seed dispersal as the same event.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Group A will show poorer root elongation because the damaged root tips contain apical meristem. Apical meristem is responsible for primary growth in length.",
          },
          {
            part: "b",
            explanation:
              "Collenchyma gives flexible support to young stems. Its living elongated cells have uneven thickening at the corners, so the stem can bend without breaking easily.",
          },
          {
            part: "c",
            explanation:
              "Pollinators help transfer pollen from anther to stigma. If pollination is reduced, fertilisation may not occur; without fertilisation, the ovary may not develop properly into fruit.",
          },
          {
            part: "d",
            explanation:
              "If most seeds fall close to the parent plant, many seedlings compete for the same light, water, minerals and space. The population also spreads less effectively to new habitats.",
          },
        ],
      },
    ],
  },
];

export const worldOfLivingTopics: Topic[] = topicSeeds.map(makeTopic);
