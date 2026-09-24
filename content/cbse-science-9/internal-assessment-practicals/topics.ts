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
const UNIT = "internal-assessment-practicals";
const VERSION = "0.1.1";
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
  return topicCode.toLowerCase().replace(".", "-");
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
  return { text, correct: true, rationale: "" };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function calibrateIaDifficulty({
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
    /\b(name|identify|which apparatus|which method|which slide|which statement|is called)\b/.test(
      text,
    ) && !/\bdata|infer|justify|design|compare|calculate|graph|case|why|explain|evaluate\b/.test(
      text,
    );

  if (kind === "mc_single" && difficulty >= 4 && recallOnly) return 3;
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ?? "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the apparatus, controlled variable, observation, or calculation before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        "incorrect_cbse_class9_practical_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.ia.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateIaDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_a_practical_term_without_checking_the_observation_or_variable",
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
    difficulty: calibrateIaDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "records_steps_without_linking_observation_to_inference",
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

const solutionColloidFigure: ItemFigure = {
  type: "svg",
  title: "Solution, suspension, and colloid observations",
  description:
    "Three test tubes shown with different transparency, settling, and light-scattering observations.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 330" role="img" aria-label="Three test tubes comparing solution, suspension and colloid observations">
  <rect width="680" height="330" fill="#f8fafc"/>
  <text x="340" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Mixture observations</text>
  <g stroke="#475569" stroke-width="3" fill="none">
    <path d="M105 72 v160 q0 38 38 38 q38 0 38 -38 V72"/>
    <path d="M302 72 v160 q0 38 38 38 q38 0 38 -38 V72"/>
    <path d="M499 72 v160 q0 38 38 38 q38 0 38 -38 V72"/>
  </g>
  <rect x="112" y="122" width="62" height="112" fill="#bae6fd" opacity="0.45"/>
  <rect x="309" y="122" width="62" height="92" fill="#fde68a" opacity="0.75"/>
  <rect x="309" y="214" width="62" height="28" fill="#a16207" opacity="0.55"/>
  <rect x="506" y="122" width="62" height="112" fill="#fef3c7" opacity="0.7"/>
  <line x1="480" y1="174" x2="595" y2="174" stroke="#2563eb" stroke-width="5" opacity="0.85"/>
  <circle cx="535" cy="174" r="5" fill="#2563eb"/>
  <circle cx="555" cy="174" r="4" fill="#2563eb"/>
  <text x="143" y="296" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">A</text>
  <text x="340" y="296" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">B</text>
  <text x="537" y="296" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">C</text>
  <text x="143" y="316" text-anchor="middle" font-size="13" fill="#475569" font-family="Arial">clear</text>
  <text x="340" y="316" text-anchor="middle" font-size="13" fill="#475569" font-family="Arial">settling</text>
  <text x="537" y="316" text-anchor="middle" font-size="13" fill="#475569" font-family="Arial">scatters light</text>
</svg>`,
};

const chromatographyFigure: ItemFigure = {
  type: "svg",
  title: "Paper chromatography strip",
  description:
    "A chromatography strip with pencil baseline, solvent level below the ink spot, and separated colour bands.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" role="img" aria-label="Paper chromatography strip with solvent below pencil baseline">
  <rect width="600" height="360" fill="#f8fafc"/>
  <text x="300" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Chromatography setup</text>
  <rect x="150" y="56" width="300" height="250" rx="12" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="175" y="210" width="250" height="72" fill="#93c5fd" opacity="0.75"/>
  <line x1="180" y1="210" x2="420" y2="210" stroke="#1d4ed8" stroke-width="3"/>
  <text x="435" y="215" font-size="13" fill="#1d4ed8" font-family="Arial">solvent level</text>
  <rect x="282" y="74" width="36" height="196" fill="#ffffff" stroke="#64748b" stroke-width="2"/>
  <line x1="282" y1="190" x2="318" y2="190" stroke="#475569" stroke-width="2" stroke-dasharray="4 3"/>
  <text x="220" y="194" font-size="13" fill="#475569" font-family="Arial">pencil line</text>
  <circle cx="300" cy="188" r="6" fill="#111827"/>
  <ellipse cx="300" cy="146" rx="10" ry="7" fill="#f97316"/>
  <ellipse cx="300" cy="124" rx="10" ry="7" fill="#22c55e"/>
  <ellipse cx="300" cy="102" rx="10" ry="7" fill="#a855f7"/>
</svg>`,
};

const conservationMassFigure: ItemFigure = {
  type: "svg",
  title: "Closed-flask conservation of mass setup",
  description:
    "A sealed reaction flask on a balance, shown before and after mixing reactants.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 340" role="img" aria-label="Closed flasks on balances before and after a reaction">
  <rect width="700" height="340" fill="#f8fafc"/>
  <text x="350" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Closed-system mass check</text>
  <g transform="translate(80 70)">
    <rect x="0" y="170" width="210" height="50" rx="8" fill="#e2e8f0" stroke="#475569" stroke-width="3"/>
    <rect x="52" y="186" width="106" height="20" rx="4" fill="#f8fafc" stroke="#64748b"/>
    <text x="105" y="201" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">182.6 g</text>
    <path d="M94 55 h22 v36 q33 12 33 53 q0 42 -44 42 q-44 0 -44 -42 q0 -41 33 -53z" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
    <circle cx="105" cy="55" r="8" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
    <path d="M74 145 q32 -20 64 0" fill="none" stroke="#f97316" stroke-width="4"/>
    <text x="105" y="25" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial">before</text>
  </g>
  <g transform="translate(410 70)">
    <rect x="0" y="170" width="210" height="50" rx="8" fill="#e2e8f0" stroke="#475569" stroke-width="3"/>
    <rect x="52" y="186" width="106" height="20" rx="4" fill="#f8fafc" stroke="#64748b"/>
    <text x="105" y="201" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">182.6 g</text>
    <path d="M94 55 h22 v36 q33 12 33 53 q0 42 -44 42 q-44 0 -44 -42 q0 -41 33 -53z" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
    <circle cx="105" cy="55" r="8" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
    <path d="M75 137 q31 22 62 0" fill="none" stroke="#7c3aed" stroke-width="4"/>
    <text x="105" y="25" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial">after</text>
  </g>
</svg>`,
};

const microscopeFigure: ItemFigure = {
  type: "svg",
  title: "Microscope slide observations",
  description:
    "Two labelled microscope fields showing rectangular plant cells and irregular animal cells.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 340" role="img" aria-label="Microscope fields for onion peel and cheek cells">
  <rect width="680" height="340" fill="#f8fafc"/>
  <text x="340" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Temporary mount observations</text>
  <g transform="translate(95 70)">
    <circle cx="105" cy="105" r="95" fill="#eef2ff" stroke="#334155" stroke-width="3"/>
    <g stroke="#2563eb" stroke-width="2" fill="none">
      <rect x="55" y="58" width="36" height="30"/>
      <rect x="91" y="58" width="36" height="30"/>
      <rect x="127" y="58" width="36" height="30"/>
      <rect x="55" y="88" width="36" height="30"/>
      <rect x="91" y="88" width="36" height="30"/>
      <rect x="127" y="88" width="36" height="30"/>
      <rect x="55" y="118" width="36" height="30"/>
      <rect x="91" y="118" width="36" height="30"/>
      <rect x="127" y="118" width="36" height="30"/>
    </g>
    <circle cx="109" cy="103" r="5" fill="#7c3aed"/>
    <text x="105" y="226" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">Slide A</text>
  </g>
  <g transform="translate(390 70)">
    <circle cx="105" cy="105" r="95" fill="#fef3c7" stroke="#334155" stroke-width="3"/>
    <g fill="#fecaca" stroke="#dc2626" stroke-width="2">
      <ellipse cx="75" cy="85" rx="28" ry="17"/>
      <ellipse cx="125" cy="105" rx="30" ry="18"/>
      <ellipse cx="92" cy="140" rx="32" ry="19"/>
    </g>
    <circle cx="76" cy="84" r="5" fill="#7c3aed"/>
    <circle cx="125" cy="105" r="5" fill="#7c3aed"/>
    <circle cx="92" cy="140" r="5" fill="#7c3aed"/>
    <text x="105" y="226" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">Slide B</text>
  </g>
</svg>`,
};

const pendulumFigure: ItemFigure = {
  type: "svg",
  title: "Simple pendulum energy positions",
  description:
    "A pendulum at left extreme, mean position, and right extreme with height marked.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 340" role="img" aria-label="Simple pendulum positions for energy conversion">
  <rect width="640" height="340" fill="#f8fafc"/>
  <text x="320" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Simple pendulum</text>
  <line x1="320" y1="58" x2="320" y2="250" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="320" y1="58" x2="208" y2="220" stroke="#2563eb" stroke-width="4"/>
  <line x1="320" y1="58" x2="320" y2="250" stroke="#16a34a" stroke-width="4"/>
  <line x1="320" y1="58" x2="432" y2="220" stroke="#2563eb" stroke-width="4"/>
  <circle cx="320" cy="58" r="8" fill="#334155"/>
  <circle cx="208" cy="220" r="18" fill="#60a5fa" stroke="#1d4ed8" stroke-width="3"/>
  <circle cx="320" cy="250" r="18" fill="#86efac" stroke="#16a34a" stroke-width="3"/>
  <circle cx="432" cy="220" r="18" fill="#60a5fa" stroke="#1d4ed8" stroke-width="3"/>
  <line x1="470" y1="220" x2="470" y2="250" stroke="#f97316" stroke-width="3"/>
  <path d="M463 220 h14 M463 250 h14" stroke="#f97316" stroke-width="3"/>
  <text x="486" y="240" font-size="14" fill="#c2410c" font-family="Arial">height</text>
  <text x="320" y="294" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial">mean position</text>
</svg>`,
};

const motionGraphFigure: ItemFigure = {
  type: "svg",
  title: "Inclined-plane motion graph data",
  description:
    "A distance-time graph from trolley motion on an inclined plane.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 360" role="img" aria-label="Distance time graph for inclined plane motion">
  <rect width="680" height="360" fill="#f8fafc"/>
  <text x="340" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Inclined-plane graph</text>
  <line x1="90" y1="300" x2="600" y2="300" stroke="#334155" stroke-width="3"/>
  <line x1="90" y1="300" x2="90" y2="70" stroke="#334155" stroke-width="3"/>
  <path d="M600 300 l-12 -7 v14z" fill="#334155"/>
  <path d="M90 70 l-7 12 h14z" fill="#334155"/>
  <text x="610" y="304" font-size="14" fill="#334155" font-family="Arial">time</text>
  <text x="48" y="74" font-size="14" fill="#334155" font-family="Arial">distance</text>
  <g stroke="#cbd5e1" stroke-width="1">
    <line x1="190" y1="300" x2="190" y2="80"/>
    <line x1="290" y1="300" x2="290" y2="80"/>
    <line x1="390" y1="300" x2="390" y2="80"/>
    <line x1="490" y1="300" x2="490" y2="80"/>
    <line x1="90" y1="250" x2="600" y2="250"/>
    <line x1="90" y1="200" x2="600" y2="200"/>
    <line x1="90" y1="150" x2="600" y2="150"/>
    <line x1="90" y1="100" x2="600" y2="100"/>
  </g>
  <polyline points="90,300 190,285 290,250 390,190 490,105" fill="none" stroke="#2563eb" stroke-width="4"/>
  <g fill="#2563eb">
    <circle cx="90" cy="300" r="5"/>
    <circle cx="190" cy="285" r="5"/>
    <circle cx="290" cy="250" r="5"/>
    <circle cx="390" cy="190" r="5"/>
    <circle cx="490" cy="105" r="5"/>
  </g>
  <text x="190" y="322" text-anchor="middle" font-size="12" fill="#475569" font-family="Arial">1</text>
  <text x="290" y="322" text-anchor="middle" font-size="12" fill="#475569" font-family="Arial">2</text>
  <text x="390" y="322" text-anchor="middle" font-size="12" fill="#475569" font-family="Arial">3</text>
  <text x="490" y="322" text-anchor="middle" font-size="12" fill="#475569" font-family="Arial">4</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "IA.1",
    title: "Solutions, Suspensions, Colloids and Separation",
    subtopic:
      "Preparation and comparison of true solutions, suspensions, colloids, and separation by funnel, chromatography, sublimation, and coagulation.",
    mc: [
      {
        questionLatex:
          "A student prepares three mixtures in water: common salt, chalk powder, and starch. Which observation best identifies the true solution?",
        difficulty: 2,
        skillTags: ["true_solution", "mixture_observation"],
        choices: [
          wrong("it settles on standing", "Settling is typical of a suspension, not a true solution."),
          correct("it is transparent and passes through filter paper"),
          wrong("it scatters a beam of light strongly", "Tyndall effect points to a colloid."),
          wrong("it can be separated by ordinary filtration", "A true solution passes through ordinary filter paper."),
        ],
        hints: [
          "Think about particle size.",
          "A true solution is homogeneous.",
          "The solute particles do not settle and pass through filter paper.",
        ],
        solution: [
          step(1, "Common salt in water forms a true solution."),
          step(2, "It is transparent, stable, and passes through ordinary filter paper."),
        ],
      },
      {
        questionLatex:
          "In the figure, tube C scatters the light beam but does not settle quickly. The mixture in tube C is most likely",
        difficulty: 2,
        skillTags: ["colloid", "tyndall_effect"],
        figure: solutionColloidFigure,
        choices: [
          wrong("a suspension of soil", "A suspension usually settles on standing."),
          wrong("a true solution of sugar", "A true solution does not show a visible Tyndall effect."),
          correct("a colloidal solution such as starch in water"),
          wrong("pure distilled water", "Pure water is not the prepared mixture and does not match the light scattering shown."),
        ],
        hints: [
          "Use the light beam observation.",
          "Tyndall effect is shown by colloids.",
          "Starch in water is a standard school-level colloid example.",
        ],
        solution: [
          step(1, "Tube C shows scattering of light."),
          step(2, "Scattering without quick settling is the key observation for a colloid."),
        ],
      },
      {
        questionLatex:
          "For separating oil and water in the Class 9 practical, the correct apparatus is",
        difficulty: 1,
        skillTags: ["separating_funnel", "immiscible_liquids"],
        choices: [
          wrong("filter funnel", "Filtration separates an insoluble solid from a liquid, not two immiscible liquids."),
          wrong("china dish", "Evaporation in a china dish does not separate oil and water cleanly."),
          wrong("sublimation tube", "Sublimation is for substances that directly change from solid to vapour."),
          correct("separating funnel"),
        ],
        hints: [
          "Oil and water form two layers.",
          "The lower layer can be drained first.",
          "The apparatus has a stopcock.",
        ],
        solution: [
          step(1, "Oil and water are immiscible liquids."),
          step(2, "A separating funnel separates immiscible liquids by density difference."),
        ],
      },
      {
        questionLatex:
          "In paper chromatography of black ink, the ink spot should be placed",
        difficulty: 2,
        skillTags: ["paper_chromatography", "baseline"],
        choices: [
          correct("on a pencil baseline above the solvent level"),
          wrong("below the solvent level so it dissolves immediately", "If the spot is below the solvent, it may dissolve directly into the solvent instead of travelling with the solvent front."),
          wrong("on an ink baseline so the starting line is visible", "Ink from the baseline can also separate and spoil the result."),
          wrong("at the top edge of the paper", "The solvent must first pass through the sample spot."),
        ],
        hints: [
          "The baseline should not itself dissolve.",
          "The solvent should rise through the spot.",
          "So the spot is above the solvent level, on a pencil line.",
        ],
        solution: [
          step(1, "The baseline is drawn with pencil because graphite does not dissolve in the solvent used."),
          step(2, "The ink spot is above the solvent level so colours move upward with the solvent front."),
        ],
      },
      {
        questionLatex:
          "A mixture contains ammonium chloride and common salt. Which property makes sublimation useful here?",
        difficulty: 2,
        skillTags: ["sublimation", "ammonium_chloride"],
        choices: [
          wrong("common salt sublimes on heating", "Common salt does not sublime in this practical."),
          correct("ammonium chloride changes directly from solid to vapour on heating"),
          wrong("both solids dissolve equally in oil", "Oil solubility is not the basis of this separation."),
          wrong("common salt is magnetic", "Common salt is not separated magnetically."),
        ],
        hints: [
          "Sublimation is a solid-to-vapour change.",
          "Only one component must sublime.",
          "Ammonium chloride sublimes; common salt remains.",
        ],
        solution: [
          step(1, "On heating, ammonium chloride sublimes."),
          step(2, "Common salt remains in the dish, so the components separate."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write one observation that distinguishes a suspension of chalk powder in water from a true solution of common salt in water.",
        difficulty: 1,
        skillTags: ["suspension", "true_solution"],
        parts: [part("a", "State one clear distinguishing observation.", 1)],
        hints: [
          "Think about stability.",
          "A suspension has larger particles.",
          "Chalk particles settle on standing or are retained by filter paper.",
        ],
        rubric: rubric([
          criterion("a", 1, "States a correct distinction such as settling, opacity, or filtration."),
        ]),
        commonErrors: [
          "Saying both mixtures are equally transparent.",
          "Using a chemical test instead of a physical observation.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "A suspension of chalk powder settles on standing, whereas a true solution of common salt remains clear and stable.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student is given a mixture of ammonium chloride and common salt. Describe how both components can be separated in the sublimation practical.",
        difficulty: 3,
        skillTags: ["sublimation", "separation_sequence", "ammonium_chloride"],
        parts: [
          part("a", "State which component sublimes and which remains behind.", 1),
          part("b", "Describe the main steps used to collect both components.", 2),
        ],
        hints: [
          "Only one component changes directly from solid to vapour.",
          "The vapour should be cooled so it deposits again.",
          "Common salt remains in the dish; ammonium chloride deposits on the cooler surface.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that ammonium chloride sublimes and common salt remains behind."),
          criterion("b", 1, "Describes heating the mixture in a china dish with an inverted funnel/cotton plug arrangement."),
          criterion("b", 1, "Explains that ammonium chloride deposits on the cooler funnel and salt remains in the dish."),
        ]),
        commonErrors: [
          "Saying common salt sublimes.",
          "Leaving the funnel open so vapours escape.",
          "Collecting only one component and not mentioning the residue.",
        ],
        workedSolution: [
          solutionPart("a", "Ammonium chloride sublimes on heating; common salt does not and remains in the china dish."),
          solutionPart(
            "b",
            "Heat the mixture gently in a china dish covered by an inverted funnel with a cotton plug at the stem. Ammonium chloride vapour deposits as solid on the cooler funnel, while common salt is left behind in the dish.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A group records observations for three water mixtures: M1 is clear and stable, M2 is cloudy and settles, and M3 is translucent, stable, and scatters light.",
        difficulty: 3,
        skillTags: ["mixture_classification", "observation_table"],
        parts: [
          part("a", "Classify M1, M2 and M3.", 3),
          part("b", "Name the effect shown by M3.", 1),
        ],
        hints: [
          "Match each observation to the particle size.",
          "Cloudy and settling means suspension.",
          "Scattering of light in a stable mixture is the Tyndall effect.",
        ],
        rubric: rubric([
          criterion("a", 1, "Classifies M1 as true solution."),
          criterion("a", 1, "Classifies M2 as suspension."),
          criterion("a", 1, "Classifies M3 as colloid."),
          criterion("b", 1, "Names the Tyndall effect."),
        ]),
        commonErrors: [
          "Calling every cloudy mixture a colloid.",
          "Ignoring the settling observation.",
        ],
        workedSolution: [
          solutionPart("a", "M1 is a true solution, M2 is a suspension, and M3 is a colloid."),
          solutionPart("b", "M3 shows the Tyndall effect because it scatters light."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Why is alum added while cleaning muddy water in the coagulation practical?",
        difficulty: 2,
        skillTags: ["coagulation", "muddy_water"],
        parts: [
          part("a", "Explain the role of alum.", 2),
          part("b", "State the next separation step after floc formation.", 1),
        ],
        hints: [
          "Alum helps fine suspended particles come together.",
          "Larger clumps settle more easily.",
          "The clear water can then be decanted or filtered.",
        ],
        rubric: rubric([
          criterion("a", 2, "Explains that alum coagulates fine suspended particles into heavier flocs."),
          criterion("b", 1, "States decantation or filtration after settling."),
        ]),
        commonErrors: [
          "Saying alum dissolves mud chemically.",
          "Skipping settling or filtration after adding alum.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Alum causes fine mud particles to clump together into heavier flocs, so they settle faster.",
          ),
          solutionPart("b", "After settling, the clearer upper water is decanted or filtered."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Plan a paper chromatography practical to show that black ink contains more than one colour.",
        difficulty: 4,
        skillTags: ["paper_chromatography", "experimental_plan"],
        figure: chromatographyFigure,
        parts: [
          part("a", "Describe the setup and starting position of the ink spot.", 2),
          part("b", "State two observations that would support the conclusion.", 2),
          part("c", "Give one precaution.", 1),
        ],
        hints: [
          "Use a paper strip and solvent.",
          "The spot begins above the solvent level.",
          "Different colours travel different distances.",
        ],
        rubric: rubric([
          criterion("a", 1, "Mentions paper strip with pencil baseline and ink spot."),
          criterion("a", 1, "Places the solvent level below the ink spot."),
          criterion("b", 2, "States separation into two or more coloured bands at different heights."),
          criterion("c", 1, "Gives a valid precaution such as using pencil baseline or not immersing the spot."),
        ]),
        commonErrors: [
          "Putting the ink spot inside the solvent.",
          "Drawing the baseline with ink.",
          "Claiming one colour band proves a mixture.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Draw a pencil baseline near one end of a chromatography paper strip. Put a small black ink spot on the baseline and suspend the strip so the solvent level is below the spot.",
          ),
          solutionPart(
            "b",
            "As the solvent rises, different coloured bands appear at different heights. More than one band shows that black ink contains more than one colour.",
          ),
          solutionPart("c", "Use a pencil baseline and keep the ink spot above the solvent level."),
        ],
      },
    ],
  },
  {
    topicCode: "IA.2",
    title: "Conservation of Mass and Chemical Lab Practice",
    subtopic:
      "Verification of conservation of mass, safe handling of chemicals, and evidence-based reaction records.",
    mc: [
      {
        questionLatex:
          "In a closed-flask reaction, the balance reads $182.6\\,\\text{g}$ before mixing and $182.6\\,\\text{g}$ after mixing. The best inference is",
        difficulty: 2,
        skillTags: ["conservation_of_mass", "closed_system"],
        figure: conservationMassFigure,
        choices: [
          wrong("mass was lost because a reaction occurred", "The balance reading did not decrease."),
          wrong("the law is disproved because new substances formed", "New substances may form while total mass remains conserved."),
          correct("total mass remained constant in the closed system"),
          wrong("the reactants and products must have the same colour", "Mass conservation does not require the same colour."),
        ],
        hints: [
          "Compare the balance readings.",
          "The flask is closed.",
          "No material escapes, so total mass stays the same.",
        ],
        solution: [
          step(1, "Before and after readings are equal."),
          step(2, "In a closed system, this supports the law of conservation of mass."),
        ],
      },
      {
        questionLatex:
          "A student verifies conservation of mass in an open beaker and notices a lower final mass because gas escapes. The main flaw in the setup is",
        difficulty: 3,
        skillTags: ["experimental_error", "open_system"],
        choices: [
          wrong("the student used a balance", "A balance is needed for this practical."),
          wrong("the reactants were mixed", "Mixing is part of the reaction demonstration."),
          wrong("the reaction mixture changed colour", "Colour change is evidence of reaction, not a flaw in testing mass."),
          correct("the system was not closed, so escaping gas was not weighed"),
        ],
        hints: [
          "The law concerns total mass of all matter involved.",
          "Escaped gas is still matter.",
          "A closed system prevents loss of material from the balance pan.",
        ],
        solution: [
          step(1, "If gas escapes, the balance no longer weighs all products."),
          step(2, "The experiment should be done in a closed system."),
        ],
      },
      {
        questionLatex:
          "Which equation is correctly balanced for magnesium burning in oxygen?",
        difficulty: 2,
        skillTags: ["balanced_equation", "chemical_symbols"],
        choices: [
          correct("$2\\text{Mg}+\\text{O}_2\\rightarrow2\\text{MgO}$"),
          wrong("$\\text{Mg}+\\text{O}_2\\rightarrow\\text{MgO}$", "Oxygen atoms are not balanced."),
          wrong("$\\text{Mg}+2\\text{O}_2\\rightarrow\\text{MgO}$", "This creates four oxygen atoms on the reactant side but only one on the product side."),
          wrong("$2\\text{Mg}+\\text{O}_2\\rightarrow\\text{Mg}_2\\text{O}$", "The product formula is not magnesium oxide."),
        ],
        hints: [
          "Use formula $\\text{MgO}$.",
          "Oxygen molecule is $\\text{O}_2$.",
          "Balance Mg and O atoms on both sides.",
        ],
        solution: [
          step(1, "Magnesium oxide is $\\text{MgO}$ and oxygen gas is $\\text{O}_2$."),
          step(2, "Two Mg atoms and two O atoms are balanced in $2\\text{Mg}+\\text{O}_2\\rightarrow2\\text{MgO}$."),
        ],
      },
      {
        questionLatex:
          "While heating a test tube, the safest practice is to",
        difficulty: 1,
        skillTags: ["lab_safety", "heating_precaution"],
        choices: [
          wrong("point the mouth of the tube towards a nearby wall mirror", "The tube mouth should be kept away from people and unnecessary surfaces."),
          correct("keep the mouth of the test tube away from yourself and others"),
          wrong("hold the hot tube directly with fingers", "Use a holder; never hold hot glassware directly."),
          wrong("stopper the tube tightly while heating any mixture", "Heating a tightly stoppered tube can be dangerous."),
        ],
        hints: [
          "Heating can cause splashing or sudden boiling.",
          "Protect the face and others nearby.",
          "Always keep the mouth away from people.",
        ],
        solution: [
          step(1, "A heated tube may eject hot liquid or vapour."),
          step(2, "The mouth must point away from yourself and others."),
        ],
      },
      {
        questionLatex:
          "A balance reads $0.8\\,\\text{g}$ even when the pan is empty. Which error will affect all mass readings if not corrected?",
        difficulty: 3,
        skillTags: ["zero_error", "measurement_error"],
        choices: [
          wrong("random error from repeating trials", "A fixed empty-pan reading is systematic, not random."),
          wrong("parallax error while reading a metre scale", "This is a balance reading, not a scale reading."),
          correct("zero error of the balance"),
          wrong("Tyndall effect", "Tyndall effect concerns light scattering by colloids."),
        ],
        hints: [
          "The instrument is not reading zero when nothing is on it.",
          "That offset affects every measurement.",
          "This is called zero error.",
        ],
        solution: [
          step(1, "The balance should read $0\\,\\text{g}$ when empty."),
          step(2, "A fixed non-zero empty reading is zero error."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "State the law of conservation of mass in one sentence.",
        difficulty: 1,
        skillTags: ["conservation_of_mass"],
        parts: [part("a", "State the law.", 1)],
        hints: [
          "Think of a chemical reaction in a closed system.",
          "Matter is neither created nor destroyed.",
          "Total mass of reactants equals total mass of products.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that total mass remains constant in a chemical reaction or closed system."),
        ]),
        commonErrors: [
          "Saying mass always increases after reaction.",
          "Ignoring the closed-system condition.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "In a chemical reaction carried out in a closed system, the total mass of reactants equals the total mass of products.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In a closed reaction vessel, $7.2\\,\\text{g}$ of reactant A reacts completely with $4.8\\,\\text{g}$ of reactant B. Find the total mass of products and justify.",
        difficulty: 2,
        skillTags: ["conservation_calculation"],
        parts: [
          part("a", "Calculate the total product mass.", 1),
          part("b", "State the principle used.", 1),
        ],
        hints: [
          "Add the masses of the reactants.",
          "The vessel is closed.",
          "Use conservation of mass.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates $12.0\\,\\text{g}$."),
          criterion("b", 1, "Names or explains conservation of mass."),
        ]),
        commonErrors: [
          "Subtracting the two reactant masses.",
          "Saying product mass is unknown despite complete reaction in a closed system.",
        ],
        workedSolution: [
          solutionPart("a", "The total product mass is $7.2+4.8=12.0\\,\\text{g}$.", L`12.0\,\text{g}`),
          solutionPart("b", "This follows from the law of conservation of mass in a closed system."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student records only colour change in the conservation-of-mass practical and omits mass readings. Why is this record incomplete?",
        difficulty: 3,
        skillTags: ["lab_record", "evidence_quality"],
        parts: [
          part("a", "Explain why colour change alone is insufficient.", 1),
          part("b", "State two readings that should be recorded.", 2),
        ],
        hints: [
          "The aim is about mass.",
          "Colour change may show reaction but not mass conservation.",
          "Record mass before and after the reaction.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains that colour change does not test mass conservation."),
          criterion("b", 1, "States mass before reaction."),
          criterion("b", 1, "States mass after reaction."),
        ]),
        commonErrors: [
          "Treating any visible change as proof of conservation of mass.",
          "Recording only names of chemicals.",
        ],
        workedSolution: [
          solutionPart("a", "Colour change may indicate a reaction, but it does not show whether total mass remained constant."),
          solutionPart("b", "The mass of the closed setup before mixing and the mass of the same closed setup after reaction should be recorded."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A sealed flask containing two solutions has mass $156.40\\,\\text{g}$. After mixing, a precipitate forms and the sealed flask reads $156.38\\,\\text{g}$.",
        difficulty: 4,
        skillTags: ["data_evaluation", "conservation_of_mass", "measurement_uncertainty"],
        parts: [
          part("a", "Is the small change enough to reject conservation of mass? Give a reason.", 2),
          part("b", "Name one source of experimental error that could produce the difference.", 1),
          part("c", "State one way to improve the reliability of the result.", 1),
        ],
        hints: [
          "Compare the change with likely balance uncertainty.",
          "The flask was sealed.",
          "Repeating trials and checking zero error improves reliability.",
        ],
        rubric: rubric([
          criterion("a", 2, "States that the small difference is likely experimental error, not rejection of the law, because the system is sealed."),
          criterion("b", 1, "Names a valid error such as zero error, spillage on the outside, or balance sensitivity."),
          criterion("c", 1, "Suggests repeated trials, averaging, checking zero, or using a more sensitive balance."),
        ]),
        commonErrors: [
          "Claiming the law is false from a $0.02\\,\\text{g}$ difference without considering error.",
          "Ignoring whether the system is sealed.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "No. Since the flask is sealed, a very small difference such as $0.02\\,\\text{g}$ is more reasonably treated as experimental uncertainty unless repeated accurate trials confirm it.",
          ),
          solutionPart("b", "Possible sources include balance zero error, sensitivity limit, or material sticking outside the flask."),
          solutionPart("c", "Check the balance zero, repeat the trial, and use the average of consistent readings."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Describe a safe school-lab procedure to verify conservation of mass in a chemical reaction using a closed system.",
        difficulty: 4,
        skillTags: ["experimental_procedure", "closed_system", "lab_safety"],
        figure: conservationMassFigure,
        parts: [
          part("a", "Describe the setup before reaction.", 2),
          part("b", "Explain what is measured before and after reaction.", 2),
          part("c", "State one safety precaution.", 1),
        ],
        hints: [
          "Use a closed container.",
          "Weigh the entire setup before and after reaction.",
          "Mention safe handling of chemicals and glassware.",
        ],
        rubric: rubric([
          criterion("a", 2, "Uses a closed flask/container with reactants arranged so they can be mixed without loss."),
          criterion("b", 2, "States that mass of the complete closed setup is measured before and after reaction and compared."),
          criterion("c", 1, "Gives a valid safety precaution."),
        ]),
        commonErrors: [
          "Weighing only one reactant.",
          "Opening the container before final weighing.",
          "Ignoring safety while mixing chemicals.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Place the reactants in a sealed arrangement, for example one solution in a small tube inside a closed flask containing the other solution.",
          ),
          solutionPart(
            "b",
            "Weigh the complete closed setup before mixing. Tilt the flask to mix the reactants without opening it, then weigh the same closed setup again. Equal masses verify conservation of mass within experimental error.",
          ),
          solutionPart("c", "Wear eye protection and keep the container closed while mixing to avoid spillage or splashing."),
        ],
      },
    ],
  },
  {
    topicCode: "IA.3",
    title: "Microscopy, Cells, Tissues and Specimens",
    subtopic:
      "Temporary mounts, prepared slides, budding, spore formation, flowers, and biological specimen identification.",
    mc: [
      {
        questionLatex:
          "In the microscope figure, Slide A shows regular brick-like cells with clear boundaries. Slide A is most likely",
        difficulty: 2,
        skillTags: ["onion_peel", "microscopy_observation"],
        figure: microscopeFigure,
        choices: [
          wrong("human cheek cells", "Cheek cells are usually irregular and lack a cell wall."),
          wrong("cardiac muscle fibres", "Cardiac muscle fibres have striations and branching, not brick-like plant cells."),
          wrong("Amoeba", "Amoeba is irregular and not arranged as brick-like cells."),
          correct("onion peel or Rhoeo leaf epidermal cells"),
        ],
        hints: [
          "Look for a cell wall.",
          "Plant epidermal cells often appear rectangular.",
          "Onion peel/Rhoeo leaf temporary mounts show regular plant cells.",
        ],
        solution: [
          step(1, "Slide A shows regular cells with clear cell walls."),
          step(2, "That matches onion peel or Rhoeo leaf epidermal cells."),
        ],
      },
      {
        questionLatex:
          "While preparing a human cheek-cell temporary mount, the stain is mainly used to",
        difficulty: 2,
        skillTags: ["cheek_cell_mount", "staining"],
        choices: [
          correct("make the nucleus and cell boundaries easier to observe"),
          wrong("make the cells divide immediately", "Stain improves visibility; it does not cause division."),
          wrong("convert animal cells into plant cells", "Stain does not add a cell wall or chloroplasts."),
          wrong("dissolve the plasma membrane completely", "The membrane should remain observable, not be dissolved."),
        ],
        hints: [
          "Unstained cells can be transparent.",
          "Stain increases contrast.",
          "It helps observe nucleus and boundary clearly.",
        ],
        solution: [
          step(1, "Cheek cells are nearly transparent under a microscope."),
          step(2, "Staining increases contrast so nucleus and cell boundary can be seen."),
        ],
      },
      {
        questionLatex:
          "Which observation best identifies a parenchyma tissue slide?",
        difficulty: 3,
        skillTags: ["plant_tissues", "parenchyma"],
        choices: [
          wrong("long dead cells with very thick lignified walls", "That points more towards sclerenchyma."),
          correct("living cells with thin walls and noticeable intercellular spaces"),
          wrong("branched striated fibres with intercalated discs", "That describes cardiac muscle."),
          wrong("spindle-shaped fibres without striations", "That describes smooth muscle."),
        ],
        hints: [
          "Parenchyma is a simple permanent plant tissue.",
          "Its cells are living and thin-walled.",
          "Intercellular spaces are common.",
        ],
        solution: [
          step(1, "Parenchyma cells are living and thin-walled."),
          step(2, "They often show intercellular spaces."),
        ],
      },
      {
        questionLatex:
          "A prepared slide shows a small outgrowth on a yeast cell that remains attached for some time. The process observed is",
        difficulty: 2,
        skillTags: ["budding", "yeast"],
        choices: [
          wrong("spore formation", "Spore formation involves spores, not a bud growing from the parent cell."),
          wrong("binary fission in Amoeba", "Amoeba divides into two daughter cells; yeast commonly buds."),
          correct("budding"),
          wrong("pollination", "Pollination is transfer of pollen in flowers."),
        ],
        hints: [
          "The clue is a small outgrowth.",
          "Yeast commonly reproduces this way.",
          "The process is budding.",
        ],
        solution: [
          step(1, "A bud appears as a small outgrowth from the parent yeast cell."),
          step(2, "This is budding, an asexual reproduction method."),
        ],
      },
      {
        questionLatex:
          "A typical bisexual flower must have",
        difficulty: 2,
        skillTags: ["flower_parts", "bisexual_flower"],
        choices: [
          wrong("only sepals and petals", "Sepals and petals are accessory parts, not the reproductive condition."),
          wrong("only stamens and no pistil", "That would not be bisexual."),
          wrong("only pistil and no stamens", "That would not be bisexual."),
          correct("both stamens and pistil"),
        ],
        hints: [
          "Bi means two.",
          "In flowers, the reproductive whorls are androecium and gynoecium.",
          "A bisexual flower has both male and female reproductive parts.",
        ],
        solution: [
          step(1, "Stamen is the male reproductive part."),
          step(2, "Pistil is the female reproductive part, and both are present in a bisexual flower."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Give one visible difference between an onion-peel cell and a human cheek cell under a microscope.",
        difficulty: 1,
        skillTags: ["cell_comparison", "microscopy"],
        parts: [part("a", "State one visible difference.", 1)],
        hints: [
          "Compare plant and animal cell boundaries.",
          "Onion peel has cell wall.",
          "Cheek cells are more irregular and lack a cell wall.",
        ],
        rubric: rubric([
          criterion("a", 1, "States a correct visible difference such as cell wall or regular shape."),
        ]),
        commonErrors: [
          "Saying cheek cells have chloroplasts.",
          "Saying onion cells have no boundary.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Onion-peel cells have a clear cell wall and regular shape, while human cheek cells are irregular and lack a cell wall.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Write the correct order of steps for preparing a temporary mount of onion peel.",
        difficulty: 3,
        skillTags: ["temporary_mount", "onion_peel"],
        parts: [
          part("a", "List the main preparation steps in order.", 3),
          part("b", "State one precaution while placing the cover slip.", 1),
        ],
        hints: [
          "Start with a thin peel on a slide.",
          "Use stain and a cover slip.",
          "Avoid air bubbles.",
        ],
        rubric: rubric([
          criterion("a", 1, "Places thin peel in water/glycerine on slide."),
          criterion("a", 1, "Adds suitable stain."),
          criterion("a", 1, "Places cover slip and observes under microscope."),
          criterion("b", 1, "Mentions lowering cover slip gently to avoid air bubbles."),
        ]),
        commonErrors: [
          "Using a thick peel.",
          "Dropping the cover slip flat and trapping air bubbles.",
          "Skipping staining completely.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Take a thin onion peel, place it in a drop of water or glycerine on a clean slide, add stain, gently place a cover slip, and observe first under low power.",
          ),
          solutionPart("b", "Lower the cover slip slowly with a needle to avoid air bubbles."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student observes five prepared slides: P has living thin-walled plant cells with spaces, Q has uneven thickening at cell corners, R has thick dead plant cells, S has spindle-shaped unstriated fibres, and T has branched striated fibres.",
        difficulty: 4,
        skillTags: ["tissue_identification", "prepared_slides"],
        parts: [
          part("a", "Identify P, Q, R, S and T.", 5),
          part("b", "Give one reason for identifying T.", 1),
        ],
        hints: [
          "Thin walls and spaces suggest parenchyma; corner thickening suggests collenchyma.",
          "Thick dead plant cells suggest sclerenchyma.",
          "Spindle-shaped unstriated fibres are smooth muscle; branched striated fibres are cardiac muscle.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies P as parenchyma."),
          criterion("a", 1, "Identifies Q as collenchyma."),
          criterion("a", 1, "Identifies R as sclerenchyma."),
          criterion("a", 1, "Identifies S as smooth muscle."),
          criterion("a", 1, "Identifies T as cardiac muscle."),
          criterion("b", 1, "Mentions branching, striations, or intercalated discs for cardiac muscle."),
        ]),
        commonErrors: [
          "Confusing smooth muscle with cardiac muscle.",
          "Calling all plant tissues parenchyma without checking wall thickness.",
          "Ignoring corner thickening as a key sign of collenchyma.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "P is parenchyma, Q is collenchyma, R is sclerenchyma, S is smooth muscle, and T is cardiac muscle.",
          ),
          solutionPart("b", "T is cardiac muscle because the fibres are branched and striated."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A bread mould slide shows round sporangia at the tips of hyphae. Explain what is being observed and why it helps reproduction.",
        difficulty: 3,
        skillTags: ["spore_formation", "bread_mould"],
        parts: [
          part("a", "Name the reproductive method.", 1),
          part("b", "Explain the role of spores.", 2),
        ],
        hints: [
          "Bread mould reproduces by spores.",
          "Sporangia contain spores.",
          "Spores disperse and grow under suitable conditions.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names spore formation."),
          criterion("b", 1, "States that sporangia contain spores."),
          criterion("b", 1, "Explains that spores disperse and germinate in suitable conditions."),
        ]),
        commonErrors: [
          "Calling sporangia flower parts.",
          "Saying spores are seeds.",
        ],
        workedSolution: [
          solutionPart("a", "The method is spore formation."),
          solutionPart(
            "b",
            "The round sporangia contain many spores. When released, spores can disperse and grow into new bread mould under suitable conditions.",
          ),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "During the specimen practical, students study Spirogyra, mushroom, moss, fern, pine cone, Amoeba, Hydra, tapeworm, Ascaris, earthworm, butterfly, snail and starfish from specimens or models. How should the observation record be made useful?",
        difficulty: 3,
        skillTags: ["specimen_identification", "record_quality", "classification"],
        parts: [
          part("a", "State three useful columns for the observation table.", 3),
          part("b", "Explain why only writing the name of each specimen is weak evidence.", 2),
        ],
        hints: [
          "Identification should be based on visible characters.",
          "A good table records features and group.",
          "Names alone do not show how the identification was made.",
        ],
        rubric: rubric([
          criterion("a", 1, "Includes specimen name or code."),
          criterion("a", 1, "Includes identifying characters."),
          criterion("a", 1, "Includes group/classification or habitat/feature-based inference."),
          criterion("b", 2, "Explains that evidence-based identification needs observable features, not memorised labels only."),
        ]),
        commonErrors: [
          "Copying names without features.",
          "Mixing plant and animal specimens in one group without criteria.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Useful columns include specimen name/code, visible identifying characters, and group or classification reason.",
          ),
          solutionPart(
            "b",
            "Only writing names does not prove that the student observed the specimen. The record should show the characters used for identification, such as body segments, shell, cone, hyphae, or filamentous structure.",
          ),
        ],
      },
    ],
  },
  {
    topicCode: "IA.4",
    title: "Energy, Pulse Speed and Mechanical Advantage",
    subtopic:
      "Simple pendulum energy conservation, pulse speed in a stretched string or slinky, and mechanical advantage of levers.",
    mc: [
      {
        questionLatex:
          "In the simple pendulum practical, the bob has maximum speed at the",
        difficulty: 2,
        skillTags: ["simple_pendulum", "energy_conversion"],
        choices: [
          correct("mean position"),
          wrong("left extreme only", "At an extreme position the bob momentarily stops before reversing direction."),
          wrong("right extreme only", "At an extreme position the bob has maximum height, not maximum speed."),
          wrong("support point", "The bob does not reach the support point."),
        ],
        hints: [
          "Think about potential and kinetic energy.",
          "At the lowest point, height is minimum.",
          "Kinetic energy and speed are maximum at the mean position.",
        ],
        solution: [
          step(1, "At the mean position, potential energy is minimum."),
          step(2, "By energy conservation, kinetic energy and speed are maximum there."),
        ],
      },
      {
        questionLatex:
          "A student times $20$ complete oscillations of a pendulum and records $32\\,\\text{s}$. The time period is",
        difficulty: 2,
        skillTags: ["time_period", "pendulum_measurement"],
        choices: [
          wrong("$32\\,\\text{s}$", "That is the time for 20 oscillations, not one oscillation."),
          correct("$1.6\\,\\text{s}$"),
          wrong("$0.625\\,\\text{s}$", "This divides in the wrong direction."),
          wrong("$20\\,\\text{s}$", "The number of oscillations is not the time period."),
        ],
        hints: [
          "Time period is time for one oscillation.",
          "Divide total time by number of oscillations.",
          "$T=32/20$.",
        ],
        solution: [
          step(1, "The time for 20 oscillations is $32\\,\\text{s}$."),
          step(2, "Time period is $T=32/20=1.6\\,\\text{s}$.", L`T=1.6\,\text{s}`),
        ],
      },
      {
        questionLatex:
          "A pulse on a stretched string travels $3.0\\,\\text{m}$ in $1.5\\,\\text{s}$. Its speed is",
        difficulty: 2,
        skillTags: ["pulse_speed", "speed_calculation"],
        choices: [
          wrong("$4.5\\,\\text{m/s}$", "This multiplies distance and time instead of dividing."),
          wrong("$0.5\\,\\text{m/s}$", "This divides time by distance."),
          correct("$2.0\\,\\text{m/s}$"),
          wrong("$3.0\\,\\text{m/s}$", "This ignores the time taken."),
        ],
        hints: [
          "Use $v=d/t$.",
          "Distance is $3.0\\,\\text{m}$ and time is $1.5\\,\\text{s}$.",
          "$3.0/1.5=2.0$.",
        ],
        solution: [
          step(1, "Speed of pulse is distance travelled divided by time taken."),
          step(2, "$v=3.0/1.5=2.0\\,\\text{m/s}$.", L`v=2.0\,\text{m/s}`),
        ],
      },
      {
        questionLatex:
          "In a lever practical, if the load is $60\\,\\text{N}$ and the effort is $20\\,\\text{N}$, the mechanical advantage is",
        difficulty: 2,
        skillTags: ["mechanical_advantage", "lever"],
        choices: [
          wrong("$0.33$", "This uses effort divided by load."),
          wrong("$20$", "This is the effort, not the ratio."),
          wrong("$80$", "Mechanical advantage is not the sum of load and effort."),
          correct("$3$"),
        ],
        hints: [
          "Use $M.A.=\\text{Load}/\\text{Effort}$.",
          "Substitute $60$ and $20$.",
          "$60/20=3$.",
        ],
        solution: [
          step(1, "Mechanical advantage is $M.A.=\\text{Load}/\\text{Effort}$."),
          step(2, "$M.A.=60/20=3$.", L`M.A.=3`),
        ],
      },
      {
        questionLatex:
          "For a pulse-speed practical, which change most directly reduces random error?",
        difficulty: 3,
        skillTags: ["reliability", "pulse_speed"],
        choices: [
          correct("repeat the timing several times and use the average"),
          wrong("record only the fastest trial", "Choosing only one favourable trial increases bias."),
          wrong("change the string length every trial without recording it", "Changing the setup without record weakens the experiment."),
          wrong("avoid measuring distance", "Speed cannot be calculated reliably without distance."),
        ],
        hints: [
          "Random errors vary from trial to trial.",
          "Repeated trials make the estimate more reliable.",
          "Average consistent readings.",
        ],
        solution: [
          step(1, "Timing a pulse may involve reaction-time variation."),
          step(2, "Repeating and averaging reduces the effect of random error."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "In a simple pendulum, what is meant by one complete oscillation?",
        difficulty: 1,
        skillTags: ["oscillation_definition"],
        parts: [part("a", "Define one complete oscillation.", 1)],
        hints: [
          "Start from one extreme position.",
          "The bob must return to the same state of motion.",
          "One to-and-fro motion is one oscillation.",
        ],
        rubric: rubric([
          criterion("a", 1, "Defines one complete to-and-fro motion returning to the starting position/state."),
        ]),
        commonErrors: [
          "Calling half swing one complete oscillation.",
          "Ignoring return to the starting position.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "One complete oscillation is one full to-and-fro motion of the pendulum bob, returning to its starting position and direction of motion.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A pendulum gives trial times of $15.8\\,\\text{s}$, $16.2\\,\\text{s}$ and $16.0\\,\\text{s}$ for $10$ oscillations. Find the average time period.",
        difficulty: 3,
        skillTags: ["averaging", "time_period"],
        parts: [
          part("a", "Find the average time for 10 oscillations.", 1),
          part("b", "Find the time period.", 1),
        ],
        hints: [
          "Average the three trial times first.",
          "Then divide by 10.",
          "Use seconds as the unit.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates average time $16.0\\,\\text{s}$."),
          criterion("b", 1, "Calculates time period $1.6\\,\\text{s}$."),
        ]),
        commonErrors: [
          "Dividing each trial by 3 instead of averaging.",
          "Forgetting to divide by 10 oscillations.",
        ],
        workedSolution: [
          solutionPart("a", "Average time for $10$ oscillations is $(15.8+16.2+16.0)/3=16.0\\,\\text{s}$.", L`16.0\,\text{s}`),
          solutionPart("b", "Time period is $16.0/10=1.6\\,\\text{s}$.", L`1.6\,\text{s}`),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "In a slinky experiment, a pulse travels from one end to the other and back. The end-to-end length is $2.5\\,\\text{m}$ and the round-trip time is $2.0\\,\\text{s}$.",
        difficulty: 3,
        skillTags: ["pulse_speed", "round_trip_distance"],
        parts: [
          part("a", "Find the total distance travelled by the pulse.", 1),
          part("b", "Calculate the pulse speed.", 2),
        ],
        hints: [
          "The pulse goes to the other end and returns.",
          "Round-trip distance is twice the length.",
          "Speed is total distance divided by time.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates total distance $5.0\\,\\text{m}$."),
          criterion("b", 2, "Calculates speed $2.5\\,\\text{m/s}$ with unit."),
        ]),
        commonErrors: [
          "Using only $2.5\\,\\text{m}$ as distance for a round trip.",
          "Multiplying distance and time.",
        ],
        workedSolution: [
          solutionPart("a", "The pulse covers $2.5+2.5=5.0\\,\\text{m}$.", L`5.0\,\text{m}`),
          solutionPart("b", "Speed is $v=5.0/2.0=2.5\\,\\text{m/s}$.", L`2.5\,\text{m/s}`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In a lever practical, a load of $80\\,\\text{N}$ is lifted using an effort of $25\\,\\text{N}$. Calculate the mechanical advantage and state what the value means.",
        difficulty: 3,
        skillTags: ["mechanical_advantage", "interpretation"],
        parts: [
          part("a", "Calculate $M.A.$", 1),
          part("b", "Interpret the value.", 1),
        ],
        hints: [
          "$M.A.=\\text{Load}/\\text{Effort}$.",
          "Use $80/25$.",
          "A value greater than 1 means the machine multiplies effort.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates $M.A.=3.2$."),
          criterion("b", 1, "Interprets that the lever lifts a load 3.2 times the effort, ignoring losses."),
        ]),
        commonErrors: [
          "Using effort divided by load.",
          "Calling $M.A.$ a force instead of a ratio.",
        ],
        workedSolution: [
          solutionPart("a", "$M.A.=80/25=3.2$.", L`M.A.=3.2`),
          solutionPart("b", "The lever lifts a load 3.2 times the applied effort under the measured conditions."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Explain how the simple pendulum practical verifies conservation of mechanical energy qualitatively.",
        difficulty: 4,
        skillTags: ["energy_conservation", "pendulum_explanation"],
        figure: pendulumFigure,
        parts: [
          part("a", "State where potential energy is maximum and where kinetic energy is maximum.", 2),
          part("b", "Explain the energy conversion during motion.", 2),
          part("c", "State one reason why the pendulum eventually slows down in a real setup.", 1),
        ],
        hints: [
          "At extremes, height is maximum.",
          "At mean position, speed is maximum.",
          "Air resistance and friction dissipate energy.",
        ],
        rubric: rubric([
          criterion("a", 1, "States PE maximum at extreme positions."),
          criterion("a", 1, "States KE maximum at mean position."),
          criterion("b", 2, "Explains conversion between PE and KE as the bob moves."),
          criterion("c", 1, "Mentions air resistance or friction at support."),
        ]),
        commonErrors: [
          "Saying both PE and KE are maximum at the same point.",
          "Ignoring losses in a real pendulum.",
        ],
        workedSolution: [
          solutionPart("a", "Potential energy is maximum at the extreme positions. Kinetic energy is maximum at the mean position."),
          solutionPart("b", "As the bob moves down, potential energy changes into kinetic energy. As it rises, kinetic energy changes back into potential energy."),
          solutionPart("c", "The pendulum slows because air resistance and friction at the support convert some mechanical energy into heat and sound."),
        ],
      },
    ],
  },
  {
    topicCode: "IA.5",
    title: "Newton's Second Law, Motion Graphs and IA Records",
    subtopic:
      "Trolley-pulley investigation, inclined-plane motion graphs, variables, graphing, portfolio and internal-assessment records.",
    mc: [
      {
        questionLatex:
          "In a trolley-pulley experiment to verify Newton's second law, if the trolley mass is kept constant and the hanging mass is increased, the expected change is",
        difficulty: 3,
        skillTags: ["newtons_second_law", "variables"],
        choices: [
          wrong("acceleration decreases because force increases", "For constant mass, increasing net force increases acceleration."),
          correct("acceleration increases because net pulling force increases"),
          wrong("acceleration becomes zero", "A non-zero unbalanced pull causes acceleration."),
          wrong("mass becomes independent of force", "The experiment is about relation between force, mass and acceleration."),
        ],
        hints: [
          "Use $F=ma$.",
          "Mass is kept constant.",
          "Acceleration is directly proportional to force.",
        ],
        solution: [
          step(1, "Newton's second law gives $F=ma$."),
          step(2, "For constant mass, greater force gives greater acceleration."),
        ],
      },
      {
        questionLatex:
          "In an inclined-plane distance-time graph, the slope at any point represents",
        difficulty: 2,
        skillTags: ["distance_time_graph", "graph_slope"],
        figure: motionGraphFigure,
        choices: [
          wrong("mass of the trolley", "Mass is not obtained from the slope of a distance-time graph."),
          wrong("force of gravity only", "The graph gives motion information, not force directly."),
          correct("speed at that instant or over that interval"),
          wrong("total time squared", "Time squared is not the physical meaning of slope here."),
        ],
        hints: [
          "Slope means vertical change divided by horizontal change.",
          "Here vertical axis is distance and horizontal axis is time.",
          "Distance divided by time is speed.",
        ],
        solution: [
          step(1, "Slope of distance-time graph is change in distance divided by change in time."),
          step(2, "So the slope represents speed."),
        ],
      },
      {
        questionLatex:
          "Which graph shape best supports the claim that a trolley on an inclined plane is speeding up?",
        difficulty: 3,
        skillTags: ["accelerated_motion", "graph_interpretation"],
        choices: [
          wrong("a horizontal distance-time graph", "Horizontal distance-time graph means no change in distance."),
          wrong("a straight distance-time graph with constant slope", "Constant slope means constant speed."),
          wrong("a graph whose slope decreases with time", "Decreasing slope means slowing down."),
          correct("a distance-time graph whose slope increases with time"),
        ],
        hints: [
          "Speed is the slope of a distance-time graph.",
          "Speeding up means slope grows.",
          "The curve gets steeper with time.",
        ],
        solution: [
          step(1, "Slope on a distance-time graph represents speed."),
          step(2, "If the trolley speeds up, the slope increases with time."),
        ],
      },
      {
        questionLatex:
          "For a fair Newton's second law investigation, which set of variables is most appropriate when testing how acceleration depends on force?",
        difficulty: 3,
        skillTags: ["fair_test", "newtons_second_law"],
        choices: [
          correct("change the pulling force, keep total mass nearly constant, and measure acceleration"),
          wrong("change force and total mass together, then measure only distance", "Changing two main variables together makes the relation unclear."),
          wrong("change the track angle randomly and ignore acceleration", "The investigation must measure acceleration and control conditions."),
          wrong("change the stopwatch for every trial but keep no record", "Changing instruments without record does not test the law."),
        ],
        hints: [
          "Only one independent variable should change.",
          "The dependent variable is acceleration.",
          "Mass should be controlled when testing force dependence.",
        ],
        solution: [
          step(1, "To test force dependence, force is the independent variable."),
          step(2, "Acceleration is measured while total mass and setup conditions are kept controlled."),
        ],
      },
      {
        questionLatex:
          "Which portfolio entry is strongest evidence of practical learning?",
        difficulty: 2,
        skillTags: ["portfolio", "internal_assessment"],
        choices: [
          wrong("only a copied aim with no observations", "A copied aim does not show observation or analysis."),
          wrong("only a decorative cover page", "Decoration alone is not evidence of scientific work."),
          correct("dated observation table, graph, conclusion and correction of one error"),
          wrong("a list of apparatus names without result", "Apparatus alone does not show data collection or inference."),
        ],
        hints: [
          "Portfolio should show work over time.",
          "Evidence includes data and reflection.",
          "A corrected error shows learning from feedback.",
        ],
        solution: [
          step(1, "Strong portfolio evidence includes data, representation, conclusion, and reflection."),
          step(2, "A dated table, graph, conclusion, and corrected error best shows practical learning."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the independent variable when testing how acceleration changes with pulling force in a trolley experiment.",
        difficulty: 1,
        skillTags: ["independent_variable", "newtons_second_law"],
        parts: [part("a", "Name the independent variable.", 1)],
        hints: [
          "The independent variable is the one deliberately changed.",
          "The investigation asks about pulling force.",
          "So the pulling force or hanging mass is changed.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names pulling force or hanging mass as the independent variable."),
        ]),
        commonErrors: [
          "Naming acceleration as the independent variable.",
          "Naming time only, without linking it to force.",
        ],
        workedSolution: [
          solutionPart("a", "The independent variable is the pulling force, usually changed by changing the hanging mass."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The inclined-plane data are: time $0,1,2,3\\,\\text{s}$ and distance $0,4,16,36\\,\\text{cm}$. What does the pattern suggest about the motion?",
        difficulty: 3,
        skillTags: ["motion_data", "graph_inference"],
        parts: [
          part("a", "State whether the trolley is moving with constant speed or speeding up.", 1),
          part("b", "Give evidence from the data.", 2),
        ],
        hints: [
          "Compare distance covered in each one-second interval.",
          "The intervals are $4$, $12$, and $20\\,\\text{cm}$.",
          "Increasing interval distances show increasing speed.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the trolley is speeding up."),
          criterion("b", 2, "Uses increasing distances in equal time intervals as evidence."),
        ]),
        commonErrors: [
          "Saying speed is constant because time intervals are equal.",
          "Looking only at total distance.",
        ],
        workedSolution: [
          solutionPart("a", "The trolley is speeding up."),
          solutionPart(
            "b",
            "In equal $1\\,\\text{s}$ intervals, it covers $4\\,\\text{cm}$, then $12\\,\\text{cm}$, then $20\\,\\text{cm}$. Larger distances in equal times mean speed is increasing.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A trolley experiment gives the following acceleration readings for the same trolley: pulling force $0.5,1.0,1.5\\,\\text{N}$ gives acceleration $0.20,0.40,0.61\\,\\text{m/s}^2$.",
        difficulty: 4,
        skillTags: ["newtons_second_law", "data_analysis"],
        parts: [
          part("a", "Describe the relationship suggested by the data.", 2),
          part("b", "Identify one reading that may contain small experimental error.", 1),
          part("c", "Suggest one improvement to the experiment.", 1),
        ],
        hints: [
          "Compare acceleration when force doubles.",
          "Expected trend is direct proportionality for constant mass.",
          "The third reading is close to, but not exactly, the simple pattern.",
        ],
        rubric: rubric([
          criterion("a", 2, "States that acceleration is approximately directly proportional to force."),
          criterion("b", 1, "Identifies $0.61\\,\\text{m/s}^2$ or the third reading as slightly off the ideal pattern."),
          criterion("c", 1, "Suggests repeats, averaging, reducing friction, or improving timing measurement."),
        ]),
        commonErrors: [
          "Treating small experimental variation as proof that Newton's law is false.",
          "Ignoring controlled mass.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "The data suggest that acceleration is approximately directly proportional to pulling force for the same trolley.",
          ),
          solutionPart(
            "b",
            "For $1.5\\,\\text{N}$, the ideal value from the pattern would be about $0.60\\,\\text{m/s}^2$, so $0.61\\,\\text{m/s}^2$ is a small experimental variation.",
          ),
          solutionPart("c", "Repeat each force setting, average readings, and reduce friction in the trolley-track setup."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student draws a velocity-time graph from inclined-plane data but forgets to write units on the axes. Why is this a serious record error?",
        difficulty: 3,
        skillTags: ["graphing", "units", "record_quality"],
        parts: [
          part("a", "Explain why axis units matter.", 2),
          part("b", "Write suitable axis labels for a velocity-time graph.", 1),
        ],
        hints: [
          "A graph should communicate measured quantities.",
          "Without units, slope and values are ambiguous.",
          "Velocity-time graph uses time and velocity axes.",
        ],
        rubric: rubric([
          criterion("a", 2, "Explains that units make values and interpretation meaningful and reproducible."),
          criterion("b", 1, "Gives labels such as time (s) and velocity (m/s or cm/s)."),
        ]),
        commonErrors: [
          "Writing only x-axis and y-axis.",
          "Using distance unit on the velocity axis.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Axis units are essential because they tell the reader what was measured and make slopes, values, and comparisons meaningful.",
          ),
          solutionPart("b", "Suitable labels are time (s) on the horizontal axis and velocity (m/s) or velocity (cm/s) on the vertical axis."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Design a fair investigation to verify Newton's second law using a trolley, pulley and hanging masses.",
        difficulty: 5,
        skillTags: ["experimental_design", "newtons_second_law", "variables", "graphing"],
        parts: [
          part("a", "State the hypothesis and variables.", 3),
          part("b", "Describe the procedure and measurements.", 3),
          part("c", "Explain how the graph should be used to support the law.", 2),
        ],
        hints: [
          "For constant mass, acceleration should increase with force.",
          "Change one variable while controlling the others.",
          "Plot acceleration against force.",
        ],
        rubric: rubric([
          criterion("a", 1, "States a hypothesis consistent with $a\\propto F$ for constant mass."),
          criterion("a", 1, "Identifies pulling force as independent variable."),
          criterion("a", 1, "Identifies acceleration as dependent variable and mass/setup conditions as controlled variables."),
          criterion("b", 2, "Describes trolley, pulley and hanging mass setup with repeated measurements of motion."),
          criterion("b", 1, "Mentions reducing friction or using the same track and trolley conditions."),
          criterion("c", 2, "Explains that an acceleration-force graph should be approximately a straight line through/near the origin."),
        ]),
        commonErrors: [
          "Changing force and total mass without control.",
          "Plotting distance against force and calling it proof of $F=ma$.",
          "Using one trial only.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Hypothesis: for a constant trolley mass, acceleration is directly proportional to pulling force. The independent variable is pulling force, the dependent variable is acceleration, and controlled variables include trolley mass, track surface and measurement method.",
          ),
          solutionPart(
            "b",
            "Attach the trolley to a string over a pulley with a hanging mass. Use different hanging masses to change the pulling force while keeping the trolley and track conditions fixed. Measure acceleration from motion data for each force and repeat trials.",
          ),
          solutionPart(
            "c",
            "Plot acceleration on the vertical axis against pulling force on the horizontal axis. An approximately straight line through or near the origin supports $F=ma$ for constant mass.",
          ),
        ],
      },
    ],
  },
];

export const scienceIaTopics: Topic[] = topicSeeds.map(makeTopic);
