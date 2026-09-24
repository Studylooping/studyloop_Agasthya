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
const UNIT = "u2-world-of-living";
const VERSION = "0.1.2";
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
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body,
  }));
}

function part(
  letter: string,
  promptMarkdown: string,
  points: number,
): FrqPart {
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

function calibrateWorldDifficulty({
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
    /\b(name|identify|which organ|which hormone|which statement|site of|is called)\b/.test(
      text,
    ) && !/\bdata|infer|justify|explain|compare|predict|case|analyse|analyze|evaluate|why\b/.test(
      text,
    );

  if (kind === "mc_single" && difficulty >= 4 && recallOnly) return 3;
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ??
    "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Match the biological structure, process, or data clue before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        "incorrect_cbse_class10_world_of_living_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateWorldDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_memorised_biology_term_without_matching_it_to_the_process",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateWorldDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_function_without_linking_structure_process_and_evidence",
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

const stomataFigure: ItemFigure = {
  type: "svg",
  title: "Stomatal pore and guard cells",
  description:
    "A labelled leaf-peel view showing guard cells around a stomatal pore.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 340" role="img" aria-label="Stomatal pore surrounded by guard cells">
  <rect width="620" height="340" fill="#f8fafc"/>
  <text x="310" y="32" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Leaf peel observation</text>
  <g transform="translate(90 72)">
    <rect x="0" y="0" width="440" height="210" rx="16" fill="#dcfce7" stroke="#166534" stroke-width="3"/>
    <g stroke="#86efac" stroke-width="2">
      <line x1="50" y1="0" x2="50" y2="210"/>
      <line x1="110" y1="0" x2="110" y2="210"/>
      <line x1="170" y1="0" x2="170" y2="210"/>
      <line x1="230" y1="0" x2="230" y2="210"/>
      <line x1="290" y1="0" x2="290" y2="210"/>
      <line x1="350" y1="0" x2="350" y2="210"/>
      <line x1="410" y1="0" x2="410" y2="210"/>
      <line x1="0" y1="55" x2="440" y2="55"/>
      <line x1="0" y1="115" x2="440" y2="115"/>
      <line x1="0" y1="170" x2="440" y2="170"/>
    </g>
    <ellipse cx="207" cy="104" rx="40" ry="82" fill="#86efac" stroke="#15803d" stroke-width="4"/>
    <ellipse cx="263" cy="104" rx="40" ry="82" fill="#86efac" stroke="#15803d" stroke-width="4"/>
    <ellipse cx="235" cy="104" rx="14" ry="64" fill="#f8fafc" stroke="#14532d" stroke-width="2"/>
    <circle cx="199" cy="78" r="5" fill="#166534"/>
    <circle cx="273" cy="131" r="5" fill="#166534"/>
    <text x="235" y="196" text-anchor="middle" font-size="15" fill="#14532d" font-family="Arial">stoma</text>
  </g>
</svg>`,
};

const doubleCirculationFigure: ItemFigure = {
  type: "svg",
  title: "Double circulation path",
  description:
    "A simplified heart-lungs-body circulation model with oxygen-rich and oxygen-poor paths.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" aria-label="Double circulation model showing heart lungs and body">
  <rect width="720" height="380" fill="#f8fafc"/>
  <text x="360" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Double circulation model</text>
  <rect x="285" y="145" width="150" height="110" rx="18" fill="#fee2e2" stroke="#991b1b" stroke-width="3"/>
  <line x1="360" y1="145" x2="360" y2="255" stroke="#991b1b" stroke-width="2"/>
  <text x="360" y="204" text-anchor="middle" font-size="17" fill="#7f1d1d" font-family="Arial">heart</text>
  <rect x="80" y="65" width="150" height="70" rx="16" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/>
  <text x="155" y="106" text-anchor="middle" font-size="17" fill="#1e3a8a" font-family="Arial">lungs</text>
  <rect x="490" y="275" width="150" height="70" rx="16" fill="#dcfce7" stroke="#166534" stroke-width="3"/>
  <text x="565" y="316" text-anchor="middle" font-size="17" fill="#14532d" font-family="Arial">body cells</text>
  <path d="M285 170 C225 155 205 130 230 100" fill="none" stroke="#2563eb" stroke-width="5" marker-end="url(#arrowBlue)"/>
  <path d="M230 115 C285 122 315 142 325 165" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#arrowRed)"/>
  <path d="M405 240 C460 285 500 310 490 310" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#arrowRed)"/>
  <path d="M565 275 C520 230 470 205 435 198" fill="none" stroke="#2563eb" stroke-width="5" marker-end="url(#arrowBlue)"/>
  <defs>
    <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
  <text x="102" y="158" font-size="13" fill="#2563eb" font-family="Arial">oxygen-poor</text>
  <text x="204" y="146" font-size="13" fill="#dc2626" font-family="Arial">oxygen-rich</text>
  <text x="472" y="254" font-size="13" fill="#dc2626" font-family="Arial">to body</text>
  <text x="512" y="218" font-size="13" fill="#2563eb" font-family="Arial">back to heart</text>
</svg>`,
};

const reflexArcFigure: ItemFigure = {
  type: "svg",
  title: "Reflex arc sequence",
  description:
    "A simplified reflex pathway from receptor to spinal cord and effector.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 350" role="img" aria-label="Reflex arc from receptor through spinal cord to effector">
  <rect width="720" height="350" fill="#f8fafc"/>
  <text x="360" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Reflex pathway</text>
  <circle cx="95" cy="170" r="38" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="95" y="175" text-anchor="middle" font-size="14" fill="#7f1d1d" font-family="Arial">skin</text>
  <rect x="285" y="95" width="150" height="150" rx="18" fill="#ede9fe" stroke="#6d28d9" stroke-width="3"/>
  <text x="360" y="175" text-anchor="middle" font-size="15" fill="#4c1d95" font-family="Arial">spinal cord</text>
  <rect x="570" y="140" width="90" height="60" rx="12" fill="#dcfce7" stroke="#15803d" stroke-width="3"/>
  <text x="615" y="175" text-anchor="middle" font-size="14" fill="#14532d" font-family="Arial">muscle</text>
  <path d="M133 160 C190 110 238 108 292 135" fill="none" stroke="#2563eb" stroke-width="5" marker-end="url(#arrowBlueReflex)"/>
  <path d="M428 188 C488 228 535 214 574 184" fill="none" stroke="#f97316" stroke-width="5" marker-end="url(#arrowOrangeReflex)"/>
  <defs>
    <marker id="arrowBlueReflex" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrowOrangeReflex" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#f97316"/>
    </marker>
  </defs>
  <text x="202" y="100" text-anchor="middle" font-size="13" fill="#1d4ed8" font-family="Arial">sensory neuron</text>
  <text x="512" y="242" text-anchor="middle" font-size="13" fill="#c2410c" font-family="Arial">motor neuron</text>
</svg>`,
};

const flowerFigure: ItemFigure = {
  type: "svg",
  title: "Flower reproductive parts",
  description:
    "A simplified flower section showing stamen, stigma, style, ovary and ovules.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 400" role="img" aria-label="Flower reproductive organs">
  <rect width="620" height="400" fill="#f8fafc"/>
  <text x="310" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Flower section</text>
  <ellipse cx="310" cy="190" rx="85" ry="135" fill="#fecdd3" stroke="#be123c" stroke-width="3"/>
  <ellipse cx="238" cy="185" rx="58" ry="118" fill="#fee2e2" stroke="#e11d48" stroke-width="2"/>
  <ellipse cx="382" cy="185" rx="58" ry="118" fill="#fee2e2" stroke="#e11d48" stroke-width="2"/>
  <line x1="310" y1="90" x2="310" y2="268" stroke="#7c2d12" stroke-width="7"/>
  <ellipse cx="310" cy="82" rx="24" ry="14" fill="#facc15" stroke="#92400e" stroke-width="3"/>
  <ellipse cx="310" cy="292" rx="42" ry="36" fill="#bbf7d0" stroke="#166534" stroke-width="3"/>
  <circle cx="296" cy="292" r="8" fill="#22c55e" stroke="#166534"/>
  <circle cx="315" cy="302" r="8" fill="#22c55e" stroke="#166534"/>
  <g stroke="#92400e" stroke-width="5">
    <line x1="215" y1="110" x2="250" y2="252"/>
    <line x1="405" y1="110" x2="370" y2="252"/>
  </g>
  <ellipse cx="212" cy="104" rx="20" ry="10" fill="#f59e0b"/>
  <ellipse cx="408" cy="104" rx="20" ry="10" fill="#f59e0b"/>
  <text x="374" y="86" font-size="13" fill="#92400e" font-family="Arial">anther</text>
  <text x="335" y="159" font-size="13" fill="#7c2d12" font-family="Arial">style</text>
  <text x="335" y="86" font-size="13" fill="#92400e" font-family="Arial">stigma</text>
  <text x="360" y="298" font-size="13" fill="#166534" font-family="Arial">ovary</text>
  <text x="260" y="323" font-size="13" fill="#166534" font-family="Arial">ovules</text>
</svg>`,
};

const mendelFigure: ItemFigure = {
  type: "svg",
  title: "Blank monohybrid cross grid",
  description:
    "A Punnett-square scaffold for a cross between two heterozygous parents, without filled offspring genotypes.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360" role="img" aria-label="Blank Punnett square scaffold for Tt crossed with Tt">
  <rect width="560" height="360" fill="#f8fafc"/>
  <text x="280" y="34" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">Monohybrid cross</text>
  <text x="280" y="65" text-anchor="middle" font-size="15" fill="#475569" font-family="Arial">Parents: Tt x Tt</text>
  <g transform="translate(150 95)" font-family="Arial">
    <rect x="0" y="0" width="260" height="220" fill="#ffffff" stroke="#334155" stroke-width="3"/>
    <line x1="0" y1="60" x2="260" y2="60" stroke="#334155" stroke-width="3"/>
    <line x1="80" y1="0" x2="80" y2="220" stroke="#334155" stroke-width="3"/>
    <line x1="170" y1="0" x2="170" y2="220" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="0" y1="140" x2="260" y2="140" stroke="#cbd5e1" stroke-width="2"/>
    <text x="125" y="38" text-anchor="middle" font-size="22" fill="#1d4ed8">T</text>
    <text x="215" y="38" text-anchor="middle" font-size="22" fill="#1d4ed8">t</text>
    <text x="40" y="105" text-anchor="middle" font-size="22" fill="#be123c">T</text>
    <text x="40" y="185" text-anchor="middle" font-size="22" fill="#be123c">t</text>
    <text x="125" y="105" text-anchor="middle" font-size="20" fill="#94a3b8">?</text>
    <text x="215" y="105" text-anchor="middle" font-size="20" fill="#94a3b8">?</text>
    <text x="125" y="185" text-anchor="middle" font-size="20" fill="#94a3b8">?</text>
    <text x="215" y="185" text-anchor="middle" font-size="20" fill="#94a3b8">?</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Nutrition and Respiration",
    subtopic:
      "Autotrophic nutrition, digestion, enzymes, aerobic and anaerobic respiration, and evidence from experiments.",
    mc: [
      {
        questionLatex:
          "A destarched variegated leaf is exposed to sunlight and then tested with iodine. Only the green region turns blue-black. The best inference is",
        difficulty: 3,
        skillTags: ["photosynthesis", "starch_test", "experimental_inference"],
        choices: [
          wrong("iodine reacts only with green pigment", "Iodine tests for starch, not for chlorophyll itself."),
          correct("chlorophyll-containing regions produced starch in light"),
          wrong("non-green regions respired faster than green regions", "The observation concerns starch formation after photosynthesis."),
          wrong("water was absent from the non-green region", "The setup does not isolate water as the variable."),
        ],
        hints: [
          "Iodine identifies starch.",
          "Green regions contain chlorophyll.",
          "The experiment links chlorophyll to starch formation during photosynthesis.",
        ],
        solution: [
          step(1, "Iodine turning blue-black shows starch is present."),
          step(2, "Only green parts made starch, so chlorophyll-containing regions carried out photosynthesis in light."),
        ],
      },
      {
        questionLatex:
          "A person has the gall bladder removed but the liver is healthy. Digestion of which food component is most likely to be affected immediately after a fatty meal?",
        difficulty: 3,
        skillTags: ["bile", "fat_digestion", "digestion"],
        choices: [
          wrong("starch, because bile digests starch into glucose", "Bile does not digest starch; salivary and pancreatic amylase act on starch."),
          wrong("protein, because bile contains protease", "Bile has no protease enzyme."),
          correct("fat, because bile helps emulsify fats before enzyme action"),
          wrong("cellulose, because bile breaks plant cell walls", "Humans do not digest cellulose using bile."),
        ],
        hints: [
          "Bile is made by the liver and stored in the gall bladder.",
          "It does not contain digestive enzymes.",
          "It emulsifies fats, increasing surface area for lipase.",
        ],
        solution: [
          step(1, "Bile helps emulsify fats into small droplets."),
          step(2, "Without normal bile storage and release, fat digestion after a fatty meal can be affected."),
        ],
      },
      {
        questionLatex:
          "Assertion (A): Chlorophyll is necessary for photosynthesis. Reason (R): Chlorophyll absorbs light energy used to make food from carbon dioxide and water.",
        difficulty: 3,
        skillTags: ["assertion_reason", "photosynthesis"],
        choices: [
          correct("Both A and R are true, and R correctly explains A."),
          wrong("Both A and R are true, but R does not explain A.", "The reason directly explains why chlorophyll is necessary."),
          wrong("A is true, but R is false.", "Chlorophyll does absorb light energy for photosynthesis."),
          wrong("A is false, but R is true.", "A is true for normal green-plant photosynthesis."),
        ],
        hints: [
          "Judge the assertion first.",
          "Then ask whether the reason explains it.",
          "Absorbing light is chlorophyll's role in photosynthesis.",
        ],
        solution: [
          step(1, "A is true: chlorophyll is required for photosynthesis in green leaves."),
          step(2, "R is true and explains A because chlorophyll absorbs the light energy needed for food synthesis."),
        ],
      },
      {
        questionLatex:
          "During vigorous exercise, a student feels muscle cramps even though glucose is still available in muscle cells. The immediate cause is most likely",
        difficulty: 2,
        skillTags: ["anaerobic_respiration", "muscle_cramps"],
        choices: [
          wrong("complete oxidation of glucose to carbon dioxide in all muscle cells", "Complete oxidation is aerobic and normally does not cause lactic acid cramps."),
          wrong("formation of ethanol in muscle cells", "Ethanol fermentation occurs in yeast, not human muscle cells."),
          wrong("storage of excess oxygen in muscle cells", "Oxygen shortage, not excess oxygen, is the issue."),
          correct("temporary anaerobic breakdown of glucose forming lactic acid"),
        ],
        hints: [
          "Think about oxygen supply during intense exercise.",
          "Human muscles can respire anaerobically for a short time.",
          "Lactic acid build-up is linked to cramps.",
        ],
        solution: [
          step(1, "During vigorous exercise, oxygen supply may be insufficient."),
          step(2, "Muscle cells partially break down glucose anaerobically, producing lactic acid."),
        ],
      },
      {
        questionLatex:
          "Which pair correctly matches the digestive juice with its main site of action?",
        difficulty: 2,
        skillTags: ["digestive_juices", "site_of_action"],
        choices: [
          wrong("saliva - large intestine", "Saliva acts first in the mouth."),
          correct("pancreatic juice - small intestine"),
          wrong("bile - stomach", "Bile enters the small intestine."),
          wrong("gastric juice - mouth", "Gastric juice acts in the stomach."),
        ],
        hints: [
          "Track where each secretion enters the digestive tract.",
          "Pancreatic duct opens into the small intestine.",
          "Pancreatic enzymes act on carbohydrates, proteins and fats in the small intestine.",
        ],
        solution: [
          step(1, "Pancreatic juice is secreted by the pancreas and released into the small intestine."),
          step(2, "It acts there on carbohydrates, proteins and fats."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the enzyme in saliva that begins digestion of starch.",
        difficulty: 1,
        skillTags: ["salivary_amylase", "digestion"],
        parts: [part("a", "Name the enzyme.", 1)],
        hints: [
          "It is secreted in the mouth.",
          "It acts on starch.",
          "It is salivary amylase.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names salivary amylase or ptyalin."),
        ]),
        commonErrors: [
          "Writing pepsin, which digests proteins in the stomach.",
          "Writing bile, which is not an enzyme.",
        ],
        workedSolution: [
          solutionPart("a", "The enzyme is salivary amylase, also called ptyalin."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student covers part of a destarched leaf with black paper, keeps the plant in sunlight, and then performs the iodine test. Explain the expected observation and conclusion.",
        difficulty: 3,
        skillTags: ["photosynthesis_experiment", "light_requirement"],
        parts: [
          part("a", "State the expected iodine-test result for the covered and uncovered parts.", 2),
          part("b", "Write the conclusion.", 1),
        ],
        hints: [
          "The plant was destarched first.",
          "Only the uncovered part receives light.",
          "Iodine turns blue-black where starch is formed.",
        ],
        rubric: rubric([
          criterion("a", 1, "States uncovered part turns blue-black."),
          criterion("a", 1, "States covered part remains brown/yellow because starch is absent."),
          criterion("b", 1, "Concludes that light is necessary for photosynthesis."),
        ]),
        commonErrors: [
          "Saying the covered part turns blue-black.",
          "Concluding that oxygen, not light, was the variable tested.",
        ],
        workedSolution: [
          solutionPart("a", "The uncovered part turns blue-black with iodine, while the covered part does not."),
          solutionPart("b", "This shows that light is necessary for starch formation during photosynthesis."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A sprinter runs a short race. Near the end, breathing becomes very fast and leg muscles ache. After resting, the ache reduces.",
        difficulty: 3,
        skillTags: ["respiration_case", "lactic_acid", "oxygen_debt"],
        parts: [
          part("a", "Why does breathing become faster?", 1),
          part("b", "Name the substance linked with muscle ache.", 1),
          part("c", "Explain why resting helps reduce the ache.", 2),
        ],
        hints: [
          "The body needs more oxygen during exercise.",
          "Oxygen shortage in muscles can cause anaerobic respiration.",
          "Extra oxygen after exercise helps oxidise/remove lactic acid.",
        ],
        rubric: rubric([
          criterion("a", 1, "Links faster breathing to greater oxygen demand and carbon dioxide removal."),
          criterion("b", 1, "Names lactic acid."),
          criterion("c", 2, "Explains that rest restores oxygen supply, helping break down or remove lactic acid."),
        ]),
        commonErrors: [
          "Saying ethanol forms in human muscles.",
          "Ignoring oxygen demand during exercise.",
        ],
        workedSolution: [
          solutionPart("a", "Breathing becomes faster to supply more oxygen and remove extra carbon dioxide."),
          solutionPart("b", "The ache is linked with lactic acid."),
          solutionPart("c", "During rest, oxygen supply improves and lactic acid is gradually broken down or removed, so the ache reduces."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Compare aerobic respiration and anaerobic respiration in terms of oxygen use, products, and energy release.",
        difficulty: 3,
        skillTags: ["aerobic_respiration", "anaerobic_respiration", "comparison"],
        parts: [
          part("a", "Write two differences.", 2),
          part("b", "State why aerobic respiration is more efficient.", 1),
        ],
        hints: [
          "Start with oxygen use.",
          "Then compare products and energy.",
          "Complete oxidation releases more energy than partial breakdown.",
        ],
        rubric: rubric([
          criterion("a", 1, "Contrasts oxygen requirement."),
          criterion("a", 1, "Contrasts products or energy release."),
          criterion("b", 1, "Explains that complete oxidation of glucose releases more energy."),
        ]),
        commonErrors: [
          "Writing that anaerobic respiration always produces carbon dioxide and water only.",
          "Writing that both release equal energy.",
        ],
        workedSolution: [
          solutionPart("a", "Aerobic respiration uses oxygen and completely breaks glucose into carbon dioxide and water. Anaerobic respiration occurs without oxygen and produces products such as lactic acid in muscles or ethanol and carbon dioxide in yeast."),
          solutionPart("b", "Aerobic respiration is more efficient because complete oxidation of glucose releases more energy."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Trace the digestion of a meal containing starch, protein and fat from mouth to small intestine. Mention the role of enzymes or secretions at each major step.",
        difficulty: 4,
        skillTags: ["digestion_sequence", "enzymes", "bile", "small_intestine"],
        parts: [
          part("a", "Describe digestion in the mouth and stomach.", 2),
          part("b", "Describe the role of bile and pancreatic juice in the small intestine.", 2),
          part("c", "Explain why the small intestine is suitable for absorption.", 1),
        ],
        hints: [
          "Begin with saliva in the mouth.",
          "The stomach mainly acts on proteins.",
          "Bile emulsifies fats and villi increase absorption surface area.",
        ],
        rubric: rubric([
          criterion("a", 1, "Mentions salivary amylase acting on starch in the mouth."),
          criterion("a", 1, "Mentions gastric juice/pepsin acting on proteins in the stomach."),
          criterion("b", 1, "States bile emulsifies fats and provides alkaline medium."),
          criterion("b", 1, "States pancreatic enzymes act on carbohydrates, proteins and fats."),
          criterion("c", 1, "Links villi/thin wall/rich blood supply to absorption."),
        ]),
        commonErrors: [
          "Calling bile a digestive enzyme.",
          "Placing pancreatic juice in the stomach.",
          "Ignoring absorption after digestion.",
        ],
        workedSolution: [
          solutionPart("a", "In the mouth, salivary amylase begins starch digestion. In the stomach, gastric juice containing acid and pepsin begins protein digestion."),
          solutionPart("b", "In the small intestine, bile emulsifies fats and helps create an alkaline medium. Pancreatic juice supplies enzymes that digest carbohydrates, proteins and fats."),
          solutionPart("c", "The small intestine has many villi with thin walls and rich blood supply, giving a large surface area for absorption."),
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Transport and Excretion",
    subtopic:
      "Transport of water and food in plants, double circulation in humans, and nephron-based excretion.",
    mc: [
      {
        questionLatex:
          "A ring of bark is removed from the stem of a healthy plant, but the xylem remains intact. Which transport is most directly interrupted?",
        difficulty: 3,
        skillTags: ["phloem", "plant_transport", "girdling"],
        choices: [
          correct("movement of prepared food from leaves to other parts"),
          wrong("upward movement of water through xylem", "The xylem is stated to remain intact."),
          wrong("diffusion of oxygen through stomata", "Bark removal does not directly stop stomatal gas exchange."),
          wrong("absorption of minerals by root hairs", "The question asks about transport through the stem."),
        ],
        hints: [
          "Bark contains phloem.",
          "Xylem remains intact in the stem.",
          "Phloem transports food made in leaves.",
        ],
        solution: [
          step(1, "Removing a ring of bark damages phloem."),
          step(2, "Phloem transports prepared food from leaves to storage and growing regions."),
        ],
      },
      {
        questionLatex:
          "In double circulation, blood moves from heart to lungs, back to heart, and then to body cells. This arrangement is important mainly because it",
        difficulty: 3,
        skillTags: ["double_circulation", "heart"],
        choices: [
          wrong("allows oxygen-rich and oxygen-poor blood to mix freely", "Double circulation helps keep the two streams largely separate."),
          correct("maintains efficient oxygen supply by separating pulmonary and systemic circuits"),
          wrong("removes the need for valves in the heart", "Valves are still needed to prevent backflow."),
          wrong("makes blood pass through the lungs only once in a lifetime", "Blood repeatedly passes through lungs during circulation."),
        ],
        hints: [
          "There are two circuits.",
          "Blood passes through the heart twice in one complete round.",
          "Separation supports efficient oxygen delivery.",
        ],
        solution: [
          step(1, "Pulmonary circulation sends blood between heart and lungs."),
          step(2, "Systemic circulation sends oxygen-rich blood from heart to body."),
          step(3, "This separation improves oxygen supply to tissues."),
        ],
      },
      {
        questionLatex:
          "Assertion (A): Transpiration helps in upward movement of water in tall plants. Reason (R): Evaporation of water from leaves creates a pull in xylem.",
        difficulty: 3,
        skillTags: ["assertion_reason", "transpiration_pull"],
        choices: [
          wrong("A is true, but R is false.", "The reason correctly describes transpiration pull."),
          wrong("A is false, but R is true.", "A is true: transpiration contributes to upward water movement."),
          correct("Both A and R are true, and R correctly explains A."),
          wrong("Both A and R are true, but R does not explain A.", "R directly explains the pull responsible for upward movement."),
        ],
        hints: [
          "Water evaporates through stomata.",
          "This evaporation creates tension in xylem.",
          "That tension pulls water upward.",
        ],
        solution: [
          step(1, "A is true because transpiration contributes to the ascent of sap."),
          step(2, "R is true and explains A because evaporation from leaves creates a pull in xylem vessels."),
        ],
      },
      {
        questionLatex:
          "In a nephron, glucose is filtered into the tubule in a healthy person. Why is it usually absent from final urine?",
        difficulty: 3,
        skillTags: ["nephron", "selective_reabsorption"],
        choices: [
          wrong("it is converted into urea in Bowman's capsule", "Urea is formed mainly in the liver, not by converting filtered glucose in the capsule."),
          wrong("it cannot pass through the filtration membrane", "Glucose is small enough to be filtered."),
          wrong("it evaporates from the collecting duct", "Urine components do not evaporate inside the duct."),
          correct("it is selectively reabsorbed back into the blood"),
        ],
        hints: [
          "Small molecules can enter the filtrate.",
          "The body does not normally waste useful glucose.",
          "Selective reabsorption returns glucose to blood.",
        ],
        solution: [
          step(1, "Glucose is filtered into the nephron because it is small."),
          step(2, "In a healthy person, useful glucose is selectively reabsorbed into blood, so final urine lacks glucose."),
        ],
      },
      {
        questionLatex:
          "Which statement correctly compares arteries and veins in human circulation?",
        difficulty: 2,
        skillTags: ["blood_vessels", "circulation"],
        choices: [
          wrong("arteries always carry oxygen-rich blood and veins always carry oxygen-poor blood", "Pulmonary artery and pulmonary vein are exceptions."),
          wrong("arteries have valves throughout their length, but veins do not", "Veins usually have valves to prevent backflow."),
          correct("arteries carry blood away from the heart, while veins carry blood towards the heart"),
          wrong("arteries have thinner walls than veins", "Arteries usually have thicker, elastic walls."),
        ],
        hints: [
          "Avoid memorising only oxygen content.",
          "Use direction relative to the heart.",
          "Arteries go away; veins return.",
        ],
        solution: [
          step(1, "The most reliable distinction is direction of flow relative to the heart."),
          step(2, "Arteries carry blood away from the heart and veins carry blood towards it."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the plant tissue that transports prepared food.",
        difficulty: 1,
        skillTags: ["phloem", "plant_transport"],
        parts: [part("a", "Name the tissue.", 1)],
        hints: [
          "Food is made in leaves.",
          "It is transported to storage and growing parts.",
          "The tissue is phloem.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names phloem."),
        ]),
        commonErrors: [
          "Writing xylem, which mainly transports water and minerals.",
          "Writing stomata, which are pores for gas exchange.",
        ],
        workedSolution: [
          solutionPart("a", "Prepared food is transported by phloem."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A leafy twig is covered with a dry transparent plastic bag. After some time, droplets appear inside the bag. Explain the observation.",
        difficulty: 3,
        skillTags: ["transpiration", "stomata", "plant_transport"],
        figure: stomataFigure,
        parts: [
          part("a", "Name the process responsible.", 1),
          part("b", "Explain how the droplets formed.", 2),
        ],
        hints: [
          "Leaves lose water vapour.",
          "Most water vapour escapes through stomata.",
          "The vapour condenses on the cooler plastic surface.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names transpiration."),
          criterion("b", 1, "Explains water vapour loss from leaves through stomata."),
          criterion("b", 1, "Explains condensation into droplets on the plastic bag."),
        ]),
        commonErrors: [
          "Saying the water came from rain outside the closed bag.",
          "Ignoring stomata or leaf water loss.",
        ],
        workedSolution: [
          solutionPart("a", "The process is transpiration."),
          solutionPart("b", "Leaves lose water vapour mainly through stomata. The vapour is trapped by the plastic bag and condenses as droplets."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A urine test shows high urea but no glucose. Blood entering the kidneys contains both urea and glucose. The person is otherwise healthy.",
        difficulty: 3,
        skillTags: ["kidney_case", "filtration", "selective_reabsorption"],
        parts: [
          part("a", "Why can glucose enter the filtrate initially?", 1),
          part("b", "Why is glucose absent from final urine?", 1),
          part("c", "Why should urea remain in urine?", 2),
        ],
        hints: [
          "Filtration depends partly on molecule size.",
          "Reabsorption is selective.",
          "Urea is a nitrogenous waste.",
        ],
        rubric: rubric([
          criterion("a", 1, "States glucose is small enough to be filtered."),
          criterion("b", 1, "States glucose is selectively reabsorbed into blood."),
          criterion("c", 2, "Explains that urea is a waste product and must be excreted to remove nitrogenous waste."),
        ]),
        commonErrors: [
          "Saying glucose is never filtered.",
          "Calling urea a useful nutrient.",
        ],
        workedSolution: [
          solutionPart("a", "Glucose is small enough to pass into the filtrate during ultrafiltration."),
          solutionPart("b", "Useful glucose is selectively reabsorbed back into blood."),
          solutionPart("c", "Urea is a nitrogenous waste made from protein metabolism. Keeping it in urine removes this waste from the body."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why a four-chambered heart is useful for mammals and birds.",
        difficulty: 3,
        skillTags: ["heart", "double_circulation", "oxygen_demand"],
        figure: doubleCirculationFigure,
        parts: [
          part("a", "State how the four chambers affect mixing of blood.", 1),
          part("b", "Link this to high energy needs.", 2),
        ],
        hints: [
          "Mammals and birds maintain body temperature.",
          "They need efficient oxygen supply.",
          "Complete separation of blood helps meet energy demand.",
        ],
        rubric: rubric([
          criterion("a", 1, "States oxygen-rich and oxygen-poor blood are kept separate."),
          criterion("b", 1, "Links separation to efficient oxygen delivery."),
          criterion("b", 1, "Links efficient delivery to high energy needs/endothermy."),
        ]),
        commonErrors: [
          "Saying four chambers are needed only to make the heart bigger.",
          "Saying mixing of blood is the advantage.",
        ],
        workedSolution: [
          solutionPart("a", "A four-chambered heart keeps oxygen-rich and oxygen-poor blood separate."),
          solutionPart("b", "This allows oxygen-rich blood to reach body tissues efficiently. Mammals and birds need high energy release to maintain body temperature and active life processes."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Compare transport in plants and humans. Use one example each of transported material, transport pathway, and driving force.",
        difficulty: 4,
        skillTags: ["transport_comparison", "xylem_phloem", "blood_circulation"],
        parts: [
          part("a", "Describe transport of water and food in plants.", 2),
          part("b", "Describe transport of respiratory gases and nutrients in humans.", 2),
          part("c", "Give one key difference in driving force.", 1),
        ],
        hints: [
          "Plants use xylem and phloem.",
          "Humans use blood, heart and blood vessels.",
          "Plant transport can depend on transpiration pull; human transport is pumped by the heart.",
        ],
        rubric: rubric([
          criterion("a", 1, "Mentions xylem transporting water/minerals."),
          criterion("a", 1, "Mentions phloem transporting food."),
          criterion("b", 1, "Mentions blood transporting oxygen/carbon dioxide/nutrients."),
          criterion("b", 1, "Mentions heart and blood vessels as the pathway/system."),
          criterion("c", 1, "Contrasts transpiration/root pressure or translocation with heart pumping."),
        ]),
        commonErrors: [
          "Saying plants have a heart-like pump.",
          "Saying phloem transports only water.",
          "Ignoring transport of gases or nutrients in humans.",
        ],
        workedSolution: [
          solutionPart("a", "In plants, xylem transports water and minerals from roots upward, while phloem transports prepared food from leaves to other parts."),
          solutionPart("b", "In humans, blood transports oxygen, carbon dioxide, nutrients and wastes through blood vessels, with the heart acting as a pump."),
          solutionPart("c", "Plant water movement can be driven by transpiration pull and root pressure, whereas human circulation is driven mainly by heart pumping."),
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Control and Coordination",
    subtopic:
      "Nervous system, reflex action, voluntary and involuntary actions, tropic movements, plant hormones and animal hormones.",
    mc: [
      {
        questionLatex:
          "A person withdraws the hand before consciously feeling pain after touching a hot object. Which pathway explains this response?",
        difficulty: 2,
        skillTags: ["reflex_action", "nervous_system"],
        choices: [
          wrong("brain directly sends the first impulse to the skin", "The stimulus starts at receptors in the skin."),
          wrong("hormones travel through blood to contract the muscle instantly", "Reflex withdrawal is nervous, not hormonal."),
          correct("receptor to sensory neuron to spinal cord to motor neuron to muscle"),
          wrong("muscle to spinal cord to receptor to sensory neuron", "The impulse does not begin in the muscle."),
        ],
        hints: [
          "A reflex is rapid and automatic.",
          "The spinal cord can coordinate the immediate response.",
          "The sequence begins at the receptor and ends at the effector muscle.",
        ],
        solution: [
          step(1, "Heat stimulates receptors in the skin."),
          step(2, "Impulse travels through sensory neuron to spinal cord and returns through motor neuron to muscle."),
        ],
      },
      {
        questionLatex:
          "If the thyroid gland secretes too little thyroxine during childhood, which effect is most directly expected?",
        difficulty: 2,
        skillTags: ["thyroxine", "animal_hormones"],
        choices: [
          wrong("instant withdrawal from painful stimulus", "That is a reflex action controlled by nerves."),
          correct("slower body growth and metabolism"),
          wrong("increased production of pollen grains", "This concerns plant reproduction, not thyroid hormone."),
          wrong("conversion of glucose into starch in leaves", "That is not a direct role of thyroxine."),
        ],
        hints: [
          "Thyroxine regulates metabolism.",
          "It also affects growth and development.",
          "Low thyroxine can slow body processes.",
        ],
        solution: [
          step(1, "Thyroxine helps regulate metabolism and growth."),
          step(2, "Low thyroxine in childhood can slow growth and body metabolism."),
        ],
      },
      {
        questionLatex:
          "A plant shoot bends towards light from a window. The most suitable explanation is",
        difficulty: 3,
        skillTags: ["phototropism", "auxin", "plant_hormones"],
        choices: [
          wrong("the lit side grows faster because auxin accumulates there", "In shoots, auxin generally accumulates more on the shaded side."),
          wrong("the root pushes the shoot towards light", "The bending is due to differential growth in the shoot."),
          wrong("stomata on the lit side close permanently", "Stomatal closure does not explain bending of the shoot."),
          correct("auxin causes greater elongation on the shaded side of the shoot"),
        ],
        hints: [
          "This is phototropism.",
          "In shoots, auxin promotes elongation.",
          "More elongation on the shaded side bends the shoot towards light.",
        ],
        solution: [
          step(1, "Light causes unequal distribution of auxin in the shoot."),
          step(2, "The shaded side elongates more, so the shoot bends towards light."),
        ],
      },
      {
        questionLatex:
          "Assertion (A): Hormonal responses are usually slower than nerve impulses. Reason (R): Hormones are chemical messengers commonly transported through blood.",
        difficulty: 3,
        skillTags: ["assertion_reason", "hormones_vs_nerves"],
        choices: [
          wrong("A is false, but R is true.", "A is true: hormonal responses are generally slower."),
          wrong("Both A and R are true, but R does not explain A.", "Transport through blood helps explain slower action compared with nerve impulses."),
          wrong("A is true, but R is false.", "R is true for many animal hormones."),
          correct("Both A and R are true, and R correctly explains A."),
        ],
        hints: [
          "Compare electrical impulses with chemical transport.",
          "Hormones often travel in blood.",
          "Chemical transport and target-cell response take time.",
        ],
        solution: [
          step(1, "A is true because nerve impulses are rapid electrical signals."),
          step(2, "R is true and explains A because hormones are chemicals transported through blood to target organs."),
        ],
      },
      {
        questionLatex:
          "A student damages the synaptic ending of a motor neuron. Which step in coordination is most directly affected?",
        difficulty: 3,
        skillTags: ["synapse", "motor_neuron", "coordination"],
        choices: [
          correct("passing the impulse from the neuron to the next cell or muscle"),
          wrong("absorbing water through xylem", "That is plant transport, not neuron function."),
          wrong("filtering urea in the nephron", "That is excretion, not nervous coordination."),
          wrong("forming gametes by meiosis", "That is reproduction, not synaptic transmission."),
        ],
        hints: [
          "A synapse is a junction.",
          "Chemical signals cross the gap.",
          "Damage affects transfer of impulse to the next cell.",
        ],
        solution: [
          step(1, "The synaptic ending helps transmit the impulse across a junction."),
          step(2, "Damage there affects signal transfer from neuron to another neuron or effector."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the part of a neuron that receives impulses from other neurons or receptors.",
        difficulty: 1,
        skillTags: ["neuron_structure"],
        parts: [part("a", "Name the part.", 1)],
        hints: [
          "It is usually branched.",
          "It receives impulses.",
          "It is the dendrite.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names dendrite or dendrites."),
        ]),
        commonErrors: [
          "Writing axon, which usually carries impulses away from the cell body.",
          "Writing hormone, which is not a neuron part.",
        ],
        workedSolution: [
          solutionPart("a", "Dendrites receive impulses from receptors or other neurons."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why reflex action is useful for survival. Use the example of touching a hot object.",
        difficulty: 3,
        skillTags: ["reflex_action", "survival_response"],
        figure: reflexArcFigure,
        parts: [
          part("a", "Describe the reflex pathway briefly.", 2),
          part("b", "Explain its survival value.", 1),
        ],
        hints: [
          "The spinal cord coordinates the immediate response.",
          "The response happens before detailed conscious processing.",
          "Quick withdrawal reduces injury.",
        ],
        rubric: rubric([
          criterion("a", 2, "Describes receptor, sensory neuron, spinal cord, motor neuron and effector sequence."),
          criterion("b", 1, "Explains that rapid response protects the body from damage."),
        ]),
        commonErrors: [
          "Saying the brain is never informed.",
          "Leaving out the effector muscle.",
        ],
        workedSolution: [
          solutionPart("a", "Heat receptors in the skin send impulses through a sensory neuron to the spinal cord. A motor neuron then carries an impulse to the muscle."),
          solutionPart("b", "The hand withdraws quickly, reducing tissue damage before conscious pain processing is complete."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "Two identical seedlings are kept in boxes. Box P has a side hole for light. Box Q has light from above. After two days, the shoot in P bends, while the shoot in Q remains nearly straight.",
        difficulty: 3,
        skillTags: ["phototropism_case", "auxin", "plant_response"],
        parts: [
          part("a", "Name the response shown by the shoot in P.", 1),
          part("b", "Explain why the shoot bends.", 2),
          part("c", "Why does Q remain nearly straight?", 1),
        ],
        hints: [
          "The stimulus is light direction.",
          "Auxin distribution becomes unequal in side light.",
          "Uniform light produces nearly equal growth on both sides.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names phototropism or positive phototropism."),
          criterion("b", 2, "Explains unequal auxin distribution and faster elongation on shaded side."),
          criterion("c", 1, "Explains that light from above causes more uniform growth."),
        ]),
        commonErrors: [
          "Calling the response geotropism.",
          "Saying the lit side always grows faster in shoots.",
        ],
        workedSolution: [
          solutionPart("a", "The response is positive phototropism."),
          solutionPart("b", "With side light, auxin becomes unevenly distributed. The shaded side elongates more, bending the shoot towards light."),
          solutionPart("c", "In Q, light from above causes nearly uniform growth, so the shoot remains almost straight."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A person with diabetes has high blood glucose because insulin action is insufficient. Explain the role of insulin and why this is a coordination problem.",
        difficulty: 3,
        skillTags: ["insulin", "hormonal_coordination", "homeostasis"],
        parts: [
          part("a", "State the role of insulin.", 1),
          part("b", "Explain why hormone action is part of coordination.", 2),
        ],
        hints: [
          "Insulin is secreted by the pancreas.",
          "It helps regulate blood glucose.",
          "Hormones coordinate body functions by acting on target organs.",
        ],
        rubric: rubric([
          criterion("a", 1, "States insulin lowers/regulates blood glucose by helping cells use/store glucose."),
          criterion("b", 1, "Identifies insulin as a hormone from pancreas."),
          criterion("b", 1, "Explains that hormones carry chemical messages to target tissues to coordinate body functions."),
        ]),
        commonErrors: [
          "Saying insulin digests glucose in the stomach.",
          "Saying only nerves coordinate the body.",
        ],
        workedSolution: [
          solutionPart("a", "Insulin helps lower blood glucose by promoting uptake and storage of glucose."),
          solutionPart("b", "Insulin is a hormone secreted by the pancreas. It travels through blood to target tissues and coordinates their response to blood-glucose level."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Compare nervous coordination and hormonal coordination in animals with respect to signal type, speed, duration and target area.",
        difficulty: 4,
        skillTags: ["nervous_system", "endocrine_system", "comparison"],
        parts: [
          part("a", "Compare signal type and pathway.", 2),
          part("b", "Compare speed and duration.", 2),
          part("c", "Give one example of each type of coordination.", 1),
        ],
        hints: [
          "Nerves use electrical impulses and synapses.",
          "Hormones are chemical messengers in blood.",
          "Reflex action and blood glucose control are useful examples.",
        ],
        rubric: rubric([
          criterion("a", 1, "States nervous coordination uses electrical impulses through neurons."),
          criterion("a", 1, "States hormonal coordination uses chemical messengers carried in blood."),
          criterion("b", 1, "States nervous responses are generally faster and short-lived."),
          criterion("b", 1, "States hormonal responses are generally slower and longer-lasting/widespread."),
          criterion("c", 1, "Gives valid examples such as reflex action and insulin/adrenaline action."),
        ]),
        commonErrors: [
          "Saying hormones move through nerves.",
          "Saying nervous and hormonal responses always have the same speed.",
        ],
        workedSolution: [
          solutionPart("a", "Nervous coordination uses electrical impulses through neurons and chemical transmission at synapses. Hormonal coordination uses chemical messengers released into blood."),
          solutionPart("b", "Nervous responses are usually rapid, specific and short-lived. Hormonal responses are often slower, may affect wider target tissues and can last longer."),
          solutionPart("c", "Withdrawing a hand from heat is nervous coordination; insulin regulating blood glucose is hormonal coordination."),
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Reproduction and Reproductive Health",
    subtopic:
      "Asexual and sexual reproduction in plants and animals, reproductive organs, reproductive health, contraception and safe sex.",
    mc: [
      {
        questionLatex:
          "A slide shows a single-celled organism dividing into two almost equal daughter cells. Which reproduction method is shown?",
        difficulty: 1,
        skillTags: ["binary_fission", "asexual_reproduction"],
        choices: [
          wrong("budding", "Budding forms an outgrowth that may detach later."),
          wrong("fragmentation", "Fragmentation involves body pieces growing into individuals."),
          wrong("pollination", "Pollination is transfer of pollen in flowering plants."),
          correct("binary fission"),
        ],
        hints: [
          "One cell becomes two cells.",
          "The daughter cells are nearly equal.",
          "This is binary fission.",
        ],
        solution: [
          step(1, "Division into two nearly equal daughter cells is binary fission."),
          step(2, "Amoeba and bacteria commonly show this kind of asexual reproduction."),
        ],
      },
      {
        questionLatex:
          "In a flower, fertilisation occurs after pollen tube growth when the male gamete reaches the",
        difficulty: 2,
        skillTags: ["flower_reproduction", "fertilisation"],
        choices: [
          correct("ovule inside the ovary"),
          wrong("sepal outside the flower", "Sepals protect the bud; they are not the site of fertilisation."),
          wrong("petal edge", "Petals attract pollinators but do not contain the egg cell."),
          wrong("anther wall", "Anther produces pollen; fertilisation occurs in the ovule."),
        ],
        hints: [
          "Pollen lands on stigma.",
          "The pollen tube grows down through the style.",
          "The male gamete reaches the ovule in the ovary.",
        ],
        solution: [
          step(1, "After pollination, pollen tube grows from stigma through style."),
          step(2, "The male gamete fuses with the egg in the ovule inside the ovary."),
        ],
      },
      {
        questionLatex:
          "A couple wants to avoid pregnancy and also reduce risk of sexually transmitted infections. Which method best fits both aims?",
        difficulty: 2,
        skillTags: ["contraception", "safe_sex", "reproductive_health"],
        choices: [
          wrong("copper-T only", "Copper-T helps prevent pregnancy but does not protect against infections."),
          wrong("oral contraceptive pills only", "Pills can prevent pregnancy but do not reduce STI transmission."),
          correct("condom used correctly"),
          wrong("surgical method only", "Surgical methods prevent pregnancy but do not protect against STIs."),
        ],
        hints: [
          "Separate pregnancy prevention from infection prevention.",
          "Barrier methods reduce contact with body fluids.",
          "Condoms are barrier methods.",
        ],
        solution: [
          step(1, "Condoms act as a barrier and can prevent sperm from entering the female reproductive tract."),
          step(2, "They also reduce exchange of infected body fluids, lowering STI risk when used correctly."),
        ],
      },
      {
        questionLatex:
          "Assertion (A): Sexual reproduction usually produces more variation than asexual reproduction. Reason (R): Sexual reproduction combines genetic material from two parents.",
        difficulty: 3,
        skillTags: ["assertion_reason", "variation", "sexual_reproduction"],
        choices: [
          wrong("A is true, but R is false.", "R is true: gametes from two parents combine."),
          correct("Both A and R are true, and R correctly explains A."),
          wrong("Both A and R are true, but R does not explain A.", "Combining genetic material explains why variation increases."),
          wrong("A is false, but R is true.", "A is true as a general Class 10 principle."),
        ],
        hints: [
          "Think about one parent versus two parents.",
          "Gametes carry genetic material.",
          "New combinations create variation.",
        ],
        solution: [
          step(1, "A is true because sexual reproduction creates new combinations of traits."),
          step(2, "R is true and explains A because genetic material from two parents combines."),
        ],
      },
      {
        questionLatex:
          "Which statement about reproductive health is scientifically correct?",
        difficulty: 2,
        skillTags: ["reproductive_health", "hiv_aids", "public_health"],
        choices: [
          wrong("HIV spreads by sharing food with an infected person", "HIV is not spread by sharing food."),
          wrong("family planning is only about treating disease", "Family planning includes deciding timing and number of children safely."),
          wrong("adolescents do not need accurate information about reproduction", "Accurate information helps protect health and prevent misinformation."),
          correct("safe sex and informed family planning help protect individual and public health"),
        ],
        hints: [
          "Reproductive health includes prevention and informed decisions.",
          "Safe sex reduces infection risk.",
          "Family planning helps health of parents and children.",
        ],
        solution: [
          step(1, "Reproductive health includes physical, mental and social well-being related to reproduction."),
          step(2, "Safe sex and informed family planning reduce health risks and support responsible decisions."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the process by which pollen grains are transferred from anther to stigma.",
        difficulty: 1,
        skillTags: ["pollination", "flower_reproduction"],
        parts: [part("a", "Name the process.", 1)],
        hints: [
          "It happens before fertilisation.",
          "It involves anther and stigma.",
          "The process is pollination.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names pollination."),
        ]),
        commonErrors: [
          "Writing fertilisation, which is fusion of gametes.",
          "Writing germination, which is seed growth.",
        ],
        workedSolution: [
          solutionPart("a", "The process is pollination."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain how budding in yeast differs from binary fission in Amoeba.",
        difficulty: 3,
        skillTags: ["budding", "binary_fission", "asexual_reproduction"],
        parts: [
          part("a", "Describe budding in yeast.", 1),
          part("b", "Describe binary fission in Amoeba.", 1),
          part("c", "Write one key difference.", 1),
        ],
        hints: [
          "In budding, an outgrowth forms.",
          "In binary fission, one cell divides into two.",
          "Compare equal and unequal division.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that a bud/outgrowth forms and later separates in yeast."),
          criterion("b", 1, "States that Amoeba divides into two daughter cells."),
          criterion("c", 1, "Contrasts unequal budding with near-equal binary fission."),
        ]),
        commonErrors: [
          "Saying both processes always require two parents.",
          "Confusing budding with spore formation.",
        ],
        workedSolution: [
          solutionPart("a", "In yeast, a small bud forms on the parent cell, grows, and may detach."),
          solutionPart("b", "In Amoeba, the cell divides into two daughter cells by binary fission."),
          solutionPart("c", "Budding is unequal outgrowth formation, while binary fission is division into two nearly equal cells."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A health worker explains that a method can prevent fertilisation but may not protect from sexually transmitted infections. Another method acts as a barrier and reduces both pregnancy and infection risk when used correctly.",
        difficulty: 3,
        skillTags: ["reproductive_health_case", "contraception", "sti_prevention"],
        parts: [
          part("a", "Give one example of a method that prevents pregnancy but does not protect from STIs.", 1),
          part("b", "Name the barrier method described.", 1),
          part("c", "Why is reliable reproductive-health information important for adolescents?", 2),
        ],
        hints: [
          "Copper-T and oral pills do not block infection transmission.",
          "Condom is a barrier method.",
          "Accurate information supports safe and responsible decisions.",
        ],
        rubric: rubric([
          criterion("a", 1, "Gives a valid example such as copper-T, oral pills, or surgical method."),
          criterion("b", 1, "Names condom."),
          criterion("c", 2, "Explains prevention of misinformation, unintended pregnancy, STI risk, or unsafe practices."),
        ]),
        commonErrors: [
          "Claiming oral pills prevent HIV transmission.",
          "Treating reproductive health as only disease treatment.",
        ],
        workedSolution: [
          solutionPart("a", "An example is oral contraceptive pills or copper-T."),
          solutionPart("b", "The barrier method is a condom."),
          solutionPart("c", "Reliable information helps adolescents avoid misinformation, understand consent and hygiene, and reduce risks of unintended pregnancy and sexually transmitted infections."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "After fertilisation in a flower, what do the ovule and ovary develop into? Explain why this matters for seed dispersal.",
        difficulty: 3,
        skillTags: ["flower_reproduction", "seed_fruit", "dispersal"],
        figure: flowerFigure,
        parts: [
          part("a", "State what the ovule becomes.", 1),
          part("b", "State what the ovary becomes.", 1),
          part("c", "Link fruit formation to dispersal.", 1),
        ],
        hints: [
          "The fertilised ovule contains the embryo.",
          "The ovary wall grows around the seed.",
          "Fruits can protect and help disperse seeds.",
        ],
        rubric: rubric([
          criterion("a", 1, "States ovule develops into seed."),
          criterion("b", 1, "States ovary develops into fruit."),
          criterion("c", 1, "Explains fruit protects or helps disperse seeds."),
        ]),
        commonErrors: [
          "Saying ovary becomes the seed directly.",
          "Ignoring the role of fruit after fertilisation.",
        ],
        workedSolution: [
          solutionPart("a", "The ovule develops into a seed."),
          solutionPart("b", "The ovary develops into a fruit."),
          solutionPart("c", "Fruit can protect seeds and help in their dispersal by animals, wind, water or splitting mechanisms."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Compare asexual and sexual reproduction in organisms, and explain why sexual reproduction is important for variation.",
        difficulty: 4,
        skillTags: ["asexual_vs_sexual", "variation", "reproductive_success"],
        parts: [
          part("a", "Give two differences between asexual and sexual reproduction.", 2),
          part("b", "Explain how sexual reproduction produces variation.", 2),
          part("c", "Give one example of each type.", 1),
        ],
        hints: [
          "Compare number of parents and gamete fusion.",
          "Sexual reproduction combines genetic material.",
          "Binary fission and flowering-plant reproduction are possible examples.",
        ],
        rubric: rubric([
          criterion("a", 1, "States asexual reproduction usually involves one parent and no gamete fusion."),
          criterion("a", 1, "States sexual reproduction involves gamete formation/fusion and usually two parents."),
          criterion("b", 2, "Explains variation due to mixing/recombination of genetic material from two parents."),
          criterion("c", 1, "Gives valid examples of asexual and sexual reproduction."),
        ]),
        commonErrors: [
          "Saying asexual reproduction always creates high variation.",
          "Saying sexual reproduction does not involve gametes.",
        ],
        workedSolution: [
          solutionPart("a", "Asexual reproduction usually needs one parent and no gamete fusion. Sexual reproduction involves formation and fusion of gametes, usually from two parents."),
          solutionPart("b", "In sexual reproduction, genetic material from two parents combines, producing new trait combinations in offspring."),
          solutionPart("c", "Binary fission in Amoeba is asexual; reproduction in flowering plants or humans is sexual."),
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Heredity and Sex Determination",
    subtopic:
      "Heredity, Mendel's contribution, inheritance of traits, dominant and recessive alleles, and brief sex determination.",
    mc: [
      {
        questionLatex:
          "In a pea plant cross $Tt\\times Tt$, where $T$ is tall and $t$ is dwarf, which phenotypic ratio is expected among many offspring?",
        difficulty: 3,
        skillTags: ["monohybrid_cross", "phenotypic_ratio"],
        choices: [
          wrong("$1:3$ tall:dwarf", "The dominant tall allele appears in three of the four genotype combinations."),
          wrong("$2:2$ tall:dwarf", "Two heterozygous and one homozygous dominant offspring are tall."),
          correct("$3:1$ tall:dwarf"),
          wrong("$0:4$ tall:dwarf", "Dominant tall trait is present in three genotype combinations."),
        ],
        hints: [
          "List the genotypes from the cross.",
          "$TT$ and $Tt$ are tall.",
          "Only $tt$ is dwarf.",
        ],
        solution: [
          step(1, "The cross gives genotypes $TT$, $Tt$, $Tt$ and $tt$.", L`TT:Tt:Tt:tt`),
          step(2, "$TT$ and $Tt$ are tall, while $tt$ is dwarf."),
          step(3, "So the phenotypic ratio is $3:1$ tall:dwarf.", L`3:1`),
        ],
      },
      {
        questionLatex:
          "A plant with genotype $Rr$ is crossed with a plant with genotype $rr$. If $R$ is dominant, what fraction of offspring are expected to show the dominant trait?",
        difficulty: 3,
        skillTags: ["test_cross", "dominant_trait"],
        choices: [
          correct("$\\frac{1}{2}$"),
          wrong("$\\frac{1}{4}$", "There are two possible offspring genotypes, one dominant and one recessive, in equal chance."),
          wrong("$\\frac{3}{4}$", "$3:1$ applies to heterozygous cross $Rr\\times Rr$, not $Rr\\times rr$."),
          wrong("$1$", "The recessive parent can contribute only $r$, so some offspring become $rr$."),
        ],
        hints: [
          "Write gametes from each parent.",
          "$Rr$ gives $R$ or $r$; $rr$ gives only $r$.",
          "Offspring are $Rr$ and $rr$ in equal chance.",
        ],
        solution: [
          step(1, "$Rr$ produces gametes $R$ and $r$; $rr$ produces gamete $r$ only."),
          step(2, "Offspring possibilities are $Rr$ and $rr$ in equal proportions."),
          step(3, "Only $Rr$ shows the dominant trait, so the fraction is $\\frac{1}{2}$.", L`\frac{1}{2}`),
        ],
      },
      {
        questionLatex:
          "Assertion (A): A human father determines the sex chromosome combination of the child. Reason (R): The father's sperm can carry either $X$ or $Y$, while the mother's egg carries $X$.",
        difficulty: 3,
        skillTags: ["assertion_reason", "sex_determination"],
        choices: [
          wrong("A is true, but R is false.", "R correctly describes the usual human sex chromosome contribution."),
          wrong("A is false, but R is true.", "A is true because sperm may carry $X$ or $Y$."),
          wrong("Both A and R are true, but R does not explain A.", "R directly explains why the father's gamete determines the combination."),
          correct("Both A and R are true, and R correctly explains A."),
        ],
        hints: [
          "Human females are $XX$ and males are $XY$.",
          "Eggs carry $X$.",
          "Sperm may carry $X$ or $Y$.",
        ],
        solution: [
          step(1, "The mother contributes an $X$ chromosome through the egg."),
          step(2, "The father contributes either $X$ or $Y$ through sperm."),
          step(3, "Thus the sperm determines whether the child is usually $XX$ or $XY$."),
        ],
      },
      {
        questionLatex:
          "Which statement best represents Mendel's idea of dominant and recessive traits?",
        difficulty: 2,
        skillTags: ["dominance", "mendel"],
        choices: [
          wrong("a recessive allele is always absent from a hybrid", "A hybrid such as $Tt$ carries the recessive allele even if it is not expressed."),
          wrong("dominant traits are always more useful for survival", "Dominance is about expression in a heterozygote, not usefulness."),
          wrong("dominant alleles destroy recessive alleles", "The recessive allele remains and can reappear in later generations."),
          correct("a dominant allele expresses itself in a heterozygote, while a recessive allele is masked"),
        ],
        hints: [
          "Think of $Tt$ pea plants.",
          "The recessive allele is present but hidden.",
          "Dominance concerns expression, not survival value.",
        ],
        solution: [
          step(1, "In a heterozygote, both alleles are present."),
          step(2, "The dominant allele is expressed and the recessive allele is masked."),
        ],
      },
      {
        questionLatex:
          "A child resembles both parents but is not identical to either. The best biological reason is",
        difficulty: 2,
        skillTags: ["heredity", "variation", "sexual_reproduction"],
        choices: [
          wrong("offspring receive all chromosomes only from the mother", "Offspring receive chromosomes from both parents."),
          correct("offspring inherit a combination of genes from both parents"),
          wrong("all traits are copied from the father without change", "Traits are inherited from both parents."),
          wrong("body cells of parents directly fuse to make the child", "Gametes fuse, not ordinary body cells."),
        ],
        hints: [
          "Sexual reproduction involves gametes.",
          "Gametes carry genetic information.",
          "The child receives gene combinations from both parents.",
        ],
        solution: [
          step(1, "Each parent contributes genetic material through gametes."),
          step(2, "The offspring has a new combination of genes, so it may resemble both but is not identical to either."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "What is a gene?",
        difficulty: 1,
        skillTags: ["gene_definition", "heredity"],
        parts: [part("a", "Define gene in one sentence.", 1)],
        hints: [
          "Genes are related to inheritance.",
          "They are located on DNA/chromosomes.",
          "They control traits.",
        ],
        rubric: rubric([
          criterion("a", 1, "Defines a gene as a unit/segment of DNA responsible for a trait."),
        ]),
        commonErrors: [
          "Calling a gene a whole organism.",
          "Confusing gene with gamete.",
        ],
        workedSolution: [
          solutionPart("a", "A gene is a segment of DNA that acts as a unit of inheritance and helps control a trait."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In pea plants, tallness $T$ is dominant over dwarfness $t$. Show the cross between two heterozygous tall plants and write the genotype and phenotype ratios.",
        difficulty: 3,
        skillTags: ["mendel_cross", "punnett_square", "ratios"],
        figure: mendelFigure,
        parts: [
          part("a", "Write the possible offspring genotypes.", 2),
          part("b", "Write genotype and phenotype ratios.", 2),
        ],
        hints: [
          "Each parent is $Tt$.",
          "Each parent produces $T$ and $t$ gametes.",
          "The offspring genotypes are $TT$, $Tt$, $Tt$, $tt$.",
        ],
        rubric: rubric([
          criterion("a", 2, "Shows or lists $TT$, $Tt$, $Tt$, $tt$."),
          criterion("b", 1, "Writes genotype ratio $1:2:1$."),
          criterion("b", 1, "Writes phenotype ratio $3:1$ tall:dwarf."),
        ]),
        commonErrors: [
          "Writing all offspring as $TT$.",
          "Confusing genotype ratio $1:2:1$ with phenotype ratio $3:1$.",
        ],
        workedSolution: [
          solutionPart("a", "The cross $Tt\\times Tt$ gives offspring genotypes $TT$, $Tt$, $Tt$ and $tt$.", L`TT,\ Tt,\ Tt,\ tt`),
          solutionPart("b", "The genotype ratio is $1TT:2Tt:1tt$, and the phenotype ratio is $3:1$ tall:dwarf.", L`1:2:1,\quad 3:1`),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "In a family, attached earlobe is recessive $(e)$ and free earlobe is dominant $(E)$. Two parents with free earlobes have a child with attached earlobes.",
        difficulty: 4,
        skillTags: ["inheritance_case", "dominant_recessive", "genotype_inference"],
        parts: [
          part("a", "What must be the genotype of the child?", 1),
          part("b", "What can be inferred about the genotype of each parent?", 2),
          part("c", "Explain why the parents show free earlobes.", 1),
        ],
        hints: [
          "Attached earlobe is recessive.",
          "A recessive phenotype needs two recessive alleles.",
          "Each parent must have contributed one $e$ allele.",
        ],
        rubric: rubric([
          criterion("a", 1, "States child genotype is $ee$."),
          criterion("b", 2, "Infers both parents must be heterozygous $Ee$."),
          criterion("c", 1, "Explains that dominant $E$ masks recessive $e$ in parents."),
        ]),
        commonErrors: [
          "Saying the child must be $Ee$ despite recessive phenotype.",
          "Saying both parents must be $EE$.",
        ],
        workedSolution: [
          solutionPart("a", "The child must be $ee$ because attached earlobe is recessive.", L`ee`),
          solutionPart("b", "Each parent must have contributed one $e$ allele, so both parents must be $Ee$.", L`Ee\times Ee`),
          solutionPart("c", "The parents show free earlobes because the dominant $E$ allele masks the recessive $e$ allele."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain human sex determination using $XX$ and $XY$ chromosomes.",
        difficulty: 3,
        skillTags: ["sex_determination", "chromosomes"],
        parts: [
          part("a", "State the sex chromosomes in human females and males.", 1),
          part("b", "Explain the role of egg and sperm in determining sex.", 2),
        ],
        hints: [
          "Females are $XX$ and males are $XY$.",
          "Eggs carry only $X$.",
          "Sperm can carry $X$ or $Y$.",
        ],
        rubric: rubric([
          criterion("a", 1, "States females are $XX$ and males are $XY$."),
          criterion("b", 1, "States egg contributes $X$."),
          criterion("b", 1, "States sperm contributes either $X$ or $Y$, producing $XX$ or $XY$."),
        ]),
        commonErrors: [
          "Saying the mother determines sex by giving $X$ or $Y$.",
          "Writing that all sperm carry $Y$.",
        ],
        workedSolution: [
          solutionPart("a", "Human females have $XX$ sex chromosomes, while human males have $XY$.", L`XX,\ XY`),
          solutionPart("b", "The egg always contributes $X$. A sperm may contribute $X$ or $Y$. Fertilisation by an $X$-bearing sperm gives $XX$, while fertilisation by a $Y$-bearing sperm gives $XY$."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Mendel found that a trait hidden in the first generation can reappear in the second generation. Explain this using a monohybrid cross.",
        difficulty: 4,
        skillTags: ["mendel_law", "segregation", "dominance", "monohybrid_cross"],
        parts: [
          part("a", "Use a pure tall and pure dwarf cross to describe the first generation.", 2),
          part("b", "Show how the recessive trait reappears in the second generation.", 3),
          part("c", "State the conclusion about traits or alleles.", 1),
        ],
        hints: [
          "Start with $TT\\times tt$.",
          "All $F_1$ plants are $Tt$ and tall.",
          "Crossing $Tt\\times Tt$ gives one $tt$ combination.",
        ],
        rubric: rubric([
          criterion("a", 2, "Shows $TT\\times tt$ gives all $Tt$ tall offspring."),
          criterion("b", 2, "Shows $Tt\\times Tt$ gives $TT$, $Tt$, $Tt$, $tt$."),
          criterion("b", 1, "States dwarf trait reappears as $tt$ in $F_2$."),
          criterion("c", 1, "Concludes recessive allele is masked, not lost, and segregates into gametes."),
        ]),
        commonErrors: [
          "Saying the recessive allele disappears in $F_1$.",
          "Writing $F_2$ phenotype ratio as $1:2:1$ instead of genotype ratio.",
          "Not distinguishing genotype from phenotype.",
        ],
        workedSolution: [
          solutionPart("a", "A pure tall plant $TT$ crossed with a pure dwarf plant $tt$ produces all $Tt$ offspring. They are tall because $T$ is dominant.", L`TT\times tt\rightarrow \text{all }Tt`),
          solutionPart("b", "When two $F_1$ plants are crossed, $Tt\\times Tt$ gives $TT$, $Tt$, $Tt$ and $tt$. The $tt$ offspring are dwarf, so the hidden recessive trait reappears.", L`Tt\times Tt\rightarrow TT:Tt:Tt:tt`),
          solutionPart("c", "The recessive allele is masked in a heterozygote but is not lost. Alleles separate during gamete formation and recombine at fertilisation."),
        ],
      },
    ],
  },
];

export const worldOfLivingXTopics: Topic[] = topicSeeds.map(makeTopic);
