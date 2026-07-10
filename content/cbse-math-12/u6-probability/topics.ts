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

const COURSE = "cbse-math-12";
const UNIT = "u6-probability";
const VERSION = "0.2.5";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
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
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales?: Partial<Record<McLetter, string>>;
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
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body,
  }));
}

function calibrateMcDifficulty(seedDifficulty: Difficulty, _index: number): Difficulty {
  return seedDifficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, _type: ResponseType): Difficulty {
  return seedDifficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("conditional_probability")) {
    return "Use the condition as the restricted sample space before forming the fraction.";
  }
  if (tags.has("multiplication_theorem")) {
    return "Multiply the probability of the first event by the correct conditional probability of the next event.";
  }
  if (tags.has("independent_events")) {
    return "For independent events, compare $P(A\\cap B)$ with $P(A)P(B)$ and remember $P(A\\mid B)=P(A)$ when $P(B)>0$.";
  }
  if (tags.has("total_probability")) {
    return "Split the event through all mutually exclusive and exhaustive cases, then add the weighted probabilities.";
  }
  if (tags.has("bayes_theorem")) {
    return "Use Bayes' theorem: numerator is the selected prior times its likelihood; denominator is the total probability of the observed event.";
  }

  return "Use the exact CBSE Probability rule required by the stem.";
}

function specificChoiceRationale(seed: McSeed, seedLetter: McLetter): string {
  const tags = new Set(seed.skillTags);
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];

  if (tags.has("independent_events") && /mutually exclusive/i.test(choiceText)) {
    return "This confuses independence with mutual exclusiveness. Independent events may occur together; mutually exclusive non-impossible events cannot.";
  }
  if (tags.has("conditional_probability") && tags.has("reverse_conditional")) {
    return "This treats the reverse conditional as if it had the same denominator. The condition after the vertical bar decides the sample space.";
  }
  if (tags.has("conditional_probability")) {
    return "This uses the wrong denominator after the condition is given. Restrict the sample space before forming the fraction.";
  }
  if (tags.has("multiplication_theorem") && tags.has("without_replacement")) {
    return "This misses that the second draw is conditional on the first draw, so the total count changes after one item is removed.";
  }
  if (tags.has("multiplication_theorem")) {
    return "This does not multiply the first-stage probability by the correct conditional probability for the next stage.";
  }
  if (tags.has("independent_events") && tags.has("complement_probability")) {
    return "This either uses $P(A)$ instead of $P(A')$ or forgets that complements remain independent of the other event.";
  }
  if (tags.has("independent_events")) {
    return "This fails the product check for independence: compare $P(A\\cap B)$ with $P(A)P(B)$.";
  }
  if (tags.has("total_probability")) {
    return "This skips at least one exhaustive case or fails to weight a conditional probability by its case probability.";
  }
  if (tags.has("bayes_theorem") && tags.has("formula_recognition")) {
    return "This is not Bayes' theorem because the denominator must be the total probability of the observed event.";
  }
  if (tags.has("bayes_theorem")) {
    return "This is a prior, a likelihood, or a path probability, not the posterior after the observed event is known.";
  }

  return feedbackFocus(seed);
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. ${specificChoiceRationale(seed, seedLetter)}${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_probability_reasoning",
    };
  });

  const rotation = index % LETTERS.length;
  const rotatedChoices =
    rotation === 0
      ? unletteredChoices
      : [
          ...unletteredChoices.slice(-rotation),
          ...unletteredChoices.slice(0, -rotation),
        ];
  const choices = rotatedChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];
  const correctLetter = choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_unconditional_probability_when_conditional_probability_is_required",
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

function makeConstructed(meta: TopicMeta, seed: ConstructedSeed, index: number): FrqItem {
  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_probability_without_defining_events_or_sample_space",
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
      ...seed.constructed.map((item, index) => makeConstructed(meta, item, index)),
    ],
  };
}

function singlePart(letter: string, promptMarkdown: string, points: number): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(part: string, points: number, description: string): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const activityVennFigure: ItemFigure = {
  type: "svg",
  title: "Activity survey Venn diagram",
  description: "A 200-student survey with 90 in seminar M, 70 in chess C, 40 in both, and 80 in neither.",
  svg: `
<svg viewBox="0 0 560 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="320" rx="12" fill="#f8fafc"/>
  <rect x="70" y="50" width="420" height="220" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <circle cx="230" cy="160" r="86" fill="#bfdbfe" fill-opacity="0.72" stroke="#2563eb" stroke-width="3"/>
  <circle cx="330" cy="160" r="86" fill="#bbf7d0" fill-opacity="0.72" stroke="#16a34a" stroke-width="3"/>
  <text x="148" y="76" font-size="16" fill="#1e3a8a" font-family="Arial, sans-serif">M</text>
  <text x="398" y="76" font-size="16" fill="#166534" font-family="Arial, sans-serif">C</text>
  <text x="194" y="164" font-size="22" fill="#1e3a8a" font-family="Arial, sans-serif">50</text>
  <text x="270" y="164" font-size="22" fill="#0f172a" font-family="Arial, sans-serif">40</text>
  <text x="344" y="164" font-size="22" fill="#166534" font-family="Arial, sans-serif">30</text>
  <text x="430" y="246" font-size="20" fill="#475569" font-family="Arial, sans-serif">80</text>
  <text x="92" y="292" font-size="14" fill="#475569" font-family="Arial, sans-serif">Total students = 200</text>
</svg>`,
};

const withoutReplacementTreeFigure: ItemFigure = {
  type: "svg",
  title: "Without-replacement draw tree",
  description: "A two-stage draw from a pouch with 5 blue and 4 white slips, showing how counts change after the first draw.",
  svg: `
<svg viewBox="0 0 600 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="600" height="340" rx="12" fill="#f8fafc"/>
  <circle cx="86" cy="170" r="8" fill="#0f172a"/>
  <line x1="94" y1="170" x2="250" y2="92" stroke="#2563eb" stroke-width="3"/>
  <line x1="94" y1="170" x2="250" y2="248" stroke="#16a34a" stroke-width="3"/>
  <text x="128" y="112" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">Blue, 5/9</text>
  <text x="128" y="238" font-size="15" fill="#166534" font-family="Arial, sans-serif">White, 4/9</text>
  <circle cx="262" cy="92" r="7" fill="#1d4ed8"/>
  <circle cx="262" cy="248" r="7" fill="#166534"/>
  <line x1="270" y1="92" x2="456" y2="54" stroke="#64748b" stroke-width="2"/>
  <line x1="270" y1="92" x2="456" y2="130" stroke="#64748b" stroke-width="2"/>
  <line x1="270" y1="248" x2="456" y2="210" stroke="#64748b" stroke-width="2"/>
  <line x1="270" y1="248" x2="456" y2="286" stroke="#64748b" stroke-width="2"/>
  <text x="472" y="60" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">Blue, 4/8</text>
  <text x="472" y="136" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">White, 4/8</text>
  <text x="472" y="216" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">Blue, 5/8</text>
  <text x="472" y="292" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">White, 3/8</text>
</svg>`,
};

const independenceTableFigure: ItemFigure = {
  type: "svg",
  title: "Two-way table for independence",
  description: "A 200-student table with Sports S and Music M counts: 36 both, 44 only Sports, 54 only Music, 66 neither.",
  svg: `
<svg viewBox="0 0 560 270" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="270" rx="12" fill="#f8fafc"/>
  <rect x="76" y="48" width="408" height="160" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="76" y1="88" x2="484" y2="88" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="76" y1="128" x2="484" y2="128" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="76" y1="168" x2="484" y2="168" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="190" y1="48" x2="190" y2="208" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="310" y1="48" x2="310" y2="208" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="410" y1="48" x2="410" y2="208" stroke="#e2e8f0" stroke-width="2"/>
  <text x="214" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">M</text>
  <text x="328" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">not M</text>
  <text x="428" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Total</text>
  <text x="112" y="114" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">S</text>
  <text x="112" y="154" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">not S</text>
  <text x="112" y="194" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Total</text>
  <text x="224" y="114" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">36</text>
  <text x="348" y="114" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">44</text>
  <text x="442" y="114" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">80</text>
  <text x="224" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">54</text>
  <text x="348" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">66</text>
  <text x="438" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">120</text>
  <text x="220" y="194" font-size="15" fill="#475569" font-family="Arial, sans-serif">90</text>
  <text x="344" y="194" font-size="15" fill="#475569" font-family="Arial, sans-serif">110</text>
  <text x="438" y="194" font-size="15" fill="#475569" font-family="Arial, sans-serif">200</text>
</svg>`,
};

const supplierTableFigure: ItemFigure = {
  type: "svg",
  title: "Supplier quality table",
  description: "Three suppliers with prior supply shares and conditional defect rates.",
  svg: `
<svg viewBox="0 0 560 260" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="260" rx="12" fill="#f8fafc"/>
  <rect x="70" y="48" width="420" height="160" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="70" y1="88" x2="490" y2="88" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="70" y1="128" x2="490" y2="128" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="70" y1="168" x2="490" y2="168" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="190" y1="48" x2="190" y2="208" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="330" y1="48" x2="330" y2="208" stroke="#e2e8f0" stroke-width="2"/>
  <text x="98" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Supplier</text>
  <text x="218" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Share</text>
  <text x="352" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Defect rate</text>
  <text x="120" y="114" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">A</text>
  <text x="224" y="114" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">0.50</text>
  <text x="370" y="114" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">0.03</text>
  <text x="120" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">B</text>
  <text x="224" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">0.30</text>
  <text x="370" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">0.04</text>
  <text x="120" y="194" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">C</text>
  <text x="224" y="194" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">0.20</text>
  <text x="370" y="194" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">0.08</text>
</svg>`,
};

const routeTreeFigure: ItemFigure = {
  type: "svg",
  title: "Route and late-arrival tree",
  description: "Three routes with probabilities 1/2, 1/3, and 1/6, followed by late-arrival probabilities 0.10, 0.15, and 0.30.",
  svg: `
<svg viewBox="0 0 600 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="600" height="360" rx="12" fill="#f8fafc"/>
  <circle cx="88" cy="180" r="8" fill="#0f172a"/>
  <line x1="96" y1="180" x2="260" y2="80" stroke="#2563eb" stroke-width="3"/>
  <line x1="96" y1="180" x2="260" y2="180" stroke="#16a34a" stroke-width="3"/>
  <line x1="96" y1="180" x2="260" y2="280" stroke="#dc2626" stroke-width="3"/>
  <text x="150" y="104" font-size="15" fill="#1d4ed8" font-family="Arial, sans-serif">R1, 1/2</text>
  <text x="150" y="168" font-size="15" fill="#166534" font-family="Arial, sans-serif">R2, 1/3</text>
  <text x="150" y="264" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">R3, 1/6</text>
  <circle cx="272" cy="80" r="7" fill="#1d4ed8"/>
  <circle cx="272" cy="180" r="7" fill="#166534"/>
  <circle cx="272" cy="280" r="7" fill="#991b1b"/>
  <line x1="280" y1="80" x2="470" y2="52" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="80" x2="470" y2="108" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="180" x2="470" y2="152" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="180" x2="470" y2="208" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="280" x2="470" y2="252" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="280" x2="470" y2="308" stroke="#64748b" stroke-width="2"/>
  <text x="486" y="58" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">Late 0.10</text>
  <text x="486" y="114" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">On time 0.90</text>
  <text x="486" y="158" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">Late 0.15</text>
  <text x="486" y="214" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">On time 0.85</text>
  <text x="486" y="258" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">Late 0.30</text>
  <text x="486" y="314" font-size="14" fill="#0f172a" font-family="Arial, sans-serif">On time 0.70</text>
</svg>`,
};

const diagnosticTableFigure: ItemFigure = {
  type: "svg",
  title: "Diagnostic screening data",
  description: "Disease prevalence 0.05, sensitivity 0.92, and false-positive probability 0.06.",
  svg: `
<svg viewBox="0 0 560 250" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="250" rx="12" fill="#f8fafc"/>
  <rect x="74" y="48" width="412" height="136" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="74" y1="88" x2="486" y2="88" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="74" y1="128" x2="486" y2="128" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="230" y1="48" x2="230" y2="184" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="365" y1="48" x2="365" y2="184" stroke="#e2e8f0" stroke-width="2"/>
  <text x="100" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Condition</text>
  <text x="252" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Prior</text>
  <text x="386" y="74" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">Positive</text>
  <text x="98" y="114" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">Disease</text>
  <text x="260" y="114" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">0.05</text>
  <text x="406" y="114" font-size="15" fill="#991b1b" font-family="Arial, sans-serif">0.92</text>
  <text x="98" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">No disease</text>
  <text x="260" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">0.95</text>
  <text x="406" y="154" font-size="15" fill="#166534" font-family="Arial, sans-serif">0.06</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Conditional Probability",
    subtopic: "Finding probabilities after a condition restricts the sample space",
    mc: [
      {
        questionLatex:
          "\\text{In a class of }80\\text{ students, }30\\text{ play chess, }22\\text{ debate, and }12\\text{ do both. If a debating student is selected, the probability that the student plays chess is}",
        difficulty: 2,
        skillTags: ["conditional_probability", "set_probability"],
        choices: ["$\\frac{6}{11}$", "$\\frac{3}{20}$", "$\\frac{2}{5}$", "$\\frac{11}{40}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses the total class strength as the denominator. Once a debating student is selected, the sample space is the 22 debaters.",
          C: "This reverses the condition by using chess players as the denominator, effectively finding $P(D\\mid C)$ instead of $P(C\\mid D)$.",
          D: "This gives the unconditional probability of selecting a debater, not the probability of chess among debaters.",
        },
        hints: ["The condition is that the student debates.", "Restrict the denominator to the 22 debating students.", "Use the 12 students who do both."],
        solution: [{ step: 1, explanation: "Given debate, only 22 students remain in the sample space. Of these, 12 also play chess.", math: "P(C\\mid D)=\\frac{12}{22}=\\frac{6}{11}" }],
      },
      {
        questionLatex:
          "\\text{Assertion (A): If }P(A\\cap B)=0.18\\text{ and }P(B)=0.45,\\text{ then }P(A\\mid B)=\\frac25.\\text{ Reason (R): For }P(B)>0,\\ P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["conditional_probability", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not merely true; it is exactly the formula used to compute the assertion.",
          C: "The reason is true because conditional probability divides the joint probability by the probability of the condition.",
          D: "The assertion is true: $0.18/0.45=2/5$.",
        },
        hints: ["Check whether the assertion is numerically true.", "Check whether the reason states the conditional-probability formula.", "Decide whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "The stated formula gives $P(A\\mid B)=0.18/0.45=2/5$, so both statements are true and the reason explains the assertion.", math: "P(A\\mid B)=\\frac{0.18}{0.45}=\\frac25" }],
      },
      {
        questionLatex:
          "\\text{In the shown survey, if a student is selected from those not in chess }C,\\text{ the probability that the student is in seminar }M\\text{ is}",
        difficulty: 3,
        skillTags: ["conditional_probability", "venn_diagram"],
        figure: activityVennFigure,
        choices: ["$\\frac{5}{13}$", "$\\frac{2}{7}$", "$\\frac{9}{20}$", "$\\frac{1}{4}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses counts from the wrong region of the Venn diagram. The condition is $C'$, so chess students must be excluded.",
          C: "This is the unconditional probability of being in seminar $M$ among all 200 students, not among students outside coding.",
          D: "This uses the correct $M\\cap C'$ numerator but keeps the total survey size as the denominator.",
        },
        hints: ["Students not in $C$ are outside the chess circle.", "Count $M\\cap C'$ from the diagram.", "Use $P(M\\mid C')=\\frac{n(M\\cap C')}{n(C')}$."],
        solution: [{ step: 1, explanation: "From the diagram, $n(M\\cap C')=50$ and $n(C')=50+80=130$.", math: "P(M\\mid C')=\\frac{50}{130}=\\frac{5}{13}" }],
      },
      {
        questionLatex:
          "\\text{If }P(A)=\\frac35,\\ P(B)=\\frac12,\\text{ and }P(A\\mid B)=\\frac25,\\text{ then }P(B\\mid A)\\text{ equals}",
        difficulty: 3,
        skillTags: ["conditional_probability", "reverse_conditional"],
        choices: ["$\\frac13$", "$\\frac25$", "$\\frac15$", "$\\frac23$"],
        correctLetter: "A",
        rationales: {
          B: "This copies the given $P(A\\mid B)$. Reverse conditional probabilities usually have different denominators.",
          C: "This stops after finding $P(A\\cap B)$. To get $P(B\\mid A)$, divide that intersection by $P(A)$.",
          D: "This divides $P(A\\mid B)$ by $P(A)$ directly and misses the required factor $P(B)$ used to find the intersection first.",
        },
        hints: ["First find $P(A\\cap B)$ from $P(A\\mid B)$.", "Then divide by $P(A)$.", "Do not assume $P(A\\mid B)=P(B\\mid A)$."],
        solution: [{ step: 1, explanation: "$P(A\\cap B)=P(A\\mid B)P(B)=\\frac25\\cdot\\frac12=\\frac15$. Hence $P(B\\mid A)=\\frac{P(A\\cap B)}{P(A)}$.", math: "P(B\\mid A)=\\frac{1/5}{3/5}=\\frac13" }],
      },
      {
        questionLatex:
          "\\text{If }P(A)=\\frac12,\\ P(B)=\\frac25,\\text{ and }P(A\\cup B)=\\frac7{10},\\text{ then }P(A\\mid B)\\text{ is}",
        difficulty: 4,
        skillTags: ["conditional_probability", "addition_theorem"],
        choices: ["$\\frac12$", "$\\frac15$", "$\\frac25$", "$\\frac34$"],
        correctLetter: "A",
        rationales: {
          B: "This is only $P(A\\cap B)$. The question asks for $P(A\\mid B)$, so the intersection must be divided by $P(B)$.",
          C: "This copies the probability of the conditioning event $B$, not the probability of $A$ after $B$ is known.",
          D: "This uses the wrong denominator after applying the union formula. Conditional probability must divide by $P(B)$.",
        },
        hints: ["Use $P(A\\cap B)=P(A)+P(B)-P(A\\cup B)$.", "Then divide by $P(B)$.", "The condition is $B$, not $A\\cup B$."],
        solution: [{ step: 1, explanation: "$P(A\\cap B)=\\frac12+\\frac25-\\frac7{10}=\\frac15$. Therefore $P(A\\mid B)=\\frac{1/5}{2/5}$.", math: "P(A\\mid B)=\\frac12" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{In a group of }80\\text{ students, }28\\text{ joined debate, }32\\text{ joined art, and }12\\text{ joined both.}",
        difficulty: 2,
        skillTags: ["conditional_probability", "set_probability"],
        parts: singlePart("a", "Find the probability that a student joined debate, given that the student joined art.", 2),
        hints: ["The condition is art.", "Use 32 as the denominator.", "The overlap is 12."],
        rubric: singleRubric("a", 2, "Finds $P(R\\mid A)=3/8$."),
        commonErrors: ["Using 80 as the denominator after the condition is given."],
        workedSolution: [{ part: "a", explanation: "$P(R\\mid A)=\\frac{n(R\\cap A)}{n(A)}=\\frac{12}{32}=\\frac38$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{For events }E\\text{ and }F,\\ P(E)=0.62,\\ P(F)=0.50,\\text{ and }P(E\\cup F)=0.82.",
        difficulty: 2,
        skillTags: ["conditional_probability", "addition_theorem"],
        parts: singlePart("a", "Find $P(E\\mid F)$.", 2),
        hints: ["First find $P(E\\cap F)$.", "Use $P(E)+P(F)-P(E\\cup F)$.", "Then divide by $P(F)$."],
        rubric: singleRubric("a", 2, "Finds $P(E\\mid F)=3/5$."),
        commonErrors: ["Dividing by $P(E\\cup F)$ instead of $P(F)$."],
        workedSolution: [{ part: "a", explanation: "$P(E\\cap F)=0.62+0.50-0.82=0.30$, so $P(E\\mid F)=\\frac{0.30}{0.50}=\\frac35$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{In a survey of }120\\text{ students, }54\\text{ read Hindi news, }48\\text{ read English news, and }18\\text{ read both.}",
        difficulty: 3,
        skillTags: ["conditional_probability", "set_probability"],
        parts: [
          { letter: "a", promptMarkdown: "If an English-news reader is selected, find the probability that the student also reads Hindi news.", points: 2 },
          { letter: "b", promptMarkdown: "If an English-news reader is selected, find the probability that the student does not read Hindi news.", points: 1 },
        ],
        hints: ["The denominator is 48 in both parts.", "Use the overlap for part (a).", "Use English-only students for part (b)."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $18/48=3/8$." },
            { part: "b", points: 1, description: "Finds $30/48=5/8$." },
          ],
        },
        commonErrors: ["Using the total survey size as denominator after conditioning on English-news readers."],
        workedSolution: [
          { part: "a", explanation: "$P(H\\mid E)=\\frac{18}{48}=\\frac38$." },
          { part: "b", explanation: "English-only students are $48-18=30$, so $P(H'\\mid E)=\\frac{30}{48}=\\frac58$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{In a batch of }150\\text{ students, }80\\text{ attend Mathematics club }M,\\ 65\\text{ attend Art club }A,\\text{ and }35\\text{ attend both.}",
        difficulty: 4,
        skillTags: ["conditional_probability", "set_probability", "reverse_conditional"],
        parts: [
          { letter: "a", promptMarkdown: "Find $P(M\\mid A)$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $P(A\\mid M)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $P(M\\cup A)$.", points: 1 },
          { letter: "d", promptMarkdown: "Explain why the answers in parts (a) and (b) need not be equal.", points: 1 },
        ],
        hints: ["Use the same overlap in parts (a) and (b).", "The denominator changes with the condition.", "For the union, add and subtract the overlap."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $35/65=7/13$." },
            { part: "b", points: 1, description: "Finds $35/80=7/16$." },
            { part: "c", points: 1, description: "Finds $110/150=11/15$." },
            { part: "d", points: 1, description: "Explains that conditional probabilities use different restricted sample spaces." },
          ],
        },
        commonErrors: ["Assuming reverse conditional probabilities are automatically equal.", "Forgetting to subtract the overlap in the union."],
        workedSolution: [
          { part: "a", explanation: "$P(M\\mid A)=\\frac{35}{65}=\\frac7{13}$." },
          { part: "b", explanation: "$P(A\\mid M)=\\frac{35}{80}=\\frac7{16}$." },
          { part: "c", explanation: "$n(M\\cup A)=80+65-35=110$, so $P(M\\cup A)=\\frac{110}{150}=\\frac{11}{15}$." },
          { part: "d", explanation: "$P(M\\mid A)$ uses Art club as the sample space, while $P(A\\mid M)$ uses Mathematics club as the sample space, so the denominators are different." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{In a group of }200\\text{ learners, }110\\text{ watched a revision video }V,\\ 90\\text{ attempted a quiz }Q,\\text{ and }60\\text{ did both.}",
        difficulty: 4,
        skillTags: ["conditional_probability", "case_based", "set_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find $P(Q\\mid V)$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $P(V\\mid Q)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the probability that a learner did neither activity.", points: 2 },
        ],
        hints: ["For part (a), condition on video watchers.", "For part (b), condition on quiz attempters.", "Use inclusion-exclusion for neither."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $60/110=6/11$." },
            { part: "b", points: 1, description: "Finds $60/90=2/3$." },
            { part: "c", points: 2, description: "Finds union $140$ and neither probability $3/10$." },
          ],
        },
        commonErrors: ["Treating $P(Q\\mid V)$ and $P(V\\mid Q)$ as the same.", "Adding 110 and 90 without subtracting the 60 learners counted twice."],
        workedSolution: [
          { part: "a", explanation: "$P(Q\\mid V)=\\frac{60}{110}=\\frac6{11}$." },
          { part: "b", explanation: "$P(V\\mid Q)=\\frac{60}{90}=\\frac23$." },
          { part: "c", explanation: "$n(V\\cup Q)=110+90-60=140$, so $200-140=60$ learners did neither. Required probability is $\\frac{60}{200}=\\frac3{10}$." },
        ],
      },
    ],
  },
  {
    topicCode: "6.2",
    title: "Multiplication Theorem on Probability",
    subtopic: "Using chained conditional probabilities for two or more events",
    mc: [
      {
        questionLatex:
          "\\text{Assertion (A): If }P(A)=\\frac58\\text{ and }P(B\\mid A)=\\frac35,\\text{ then }P(A\\cap B)=\\frac38.\\text{ Reason (R): }P(A\\cap B)=P(A)P(B\\mid A)\\text{ whenever }P(A)>0.\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["multiplication_theorem", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the multiplication used in the assertion.",
          C: "The reason is true; it is the multiplication theorem on probability.",
          D: "The assertion is true because $\\frac58\\cdot\\frac35=\\frac38$.",
        },
        hints: ["Check the assertion by multiplying the two given fractions.", "Check whether the reason states the multiplication theorem.", "The reason should justify the exact computation."],
        solution: [{ step: 1, explanation: "By the multiplication theorem, $P(A\\cap B)=P(A)P(B\\mid A)=\\frac58\\cdot\\frac35=\\frac38$, so the reason correctly explains the assertion.", math: "P(A\\cap B)=\\frac58\\cdot\\frac35=\\frac38" }],
      },
      {
        questionLatex:
          "\\text{A box has }5\\text{ blue and }4\\text{ white slips. Two slips are drawn without replacement. The probability that both are blue is}",
        difficulty: 2,
        skillTags: ["multiplication_theorem", "without_replacement"],
        figure: withoutReplacementTreeFigure,
        choices: ["$\\frac{5}{18}$", "$\\frac{25}{81}$", "$\\frac{1}{4}$", "$\\frac{4}{17}$"],
        correctLetter: "A",
        rationales: {
          B: "This treats the second draw as if the first slip were replaced, using $5/9$ twice.",
          C: "This treats both draws as equally likely blue-or-white events and ignores the actual counts in the box.",
          D: "This uses changed counts incorrectly. After one blue is drawn, the second blue probability is $4/8$, not a fraction with denominator 17.",
        },
        hints: ["First blue has probability $5/9$.", "After one blue is removed, 4 blue slips remain out of 8.", "Multiply the two stage probabilities."],
        solution: [{ step: 1, explanation: "The draw is without replacement, so the second probability changes after the first blue slip is drawn.", math: "\\frac59\\cdot\\frac48=\\frac5{18}" }],
      },
      {
        questionLatex:
          "\\text{A student submits a project on time with probability }0.7.\\text{ Given that it is on time, the probability it is complete is }0.8.\\text{ The probability that it is both on time and complete is}",
        difficulty: 3,
        skillTags: ["multiplication_theorem", "context_probability"],
        choices: ["$\\frac{14}{25}$", "$\\frac{3}{5}$", "$\\frac{7}{25}$", "$\\frac{4}{5}$"],
        correctLetter: "A",
        rationales: {
          B: "This is a numerical blend of the two probabilities. For 'both', multiply $P(T)$ by $P(C\\mid T)$.",
          C: "This uses an incorrect second factor. The given conditional probability of complete after on-time is $0.8$, not $0.4$.",
          D: "This copies $P(C\\mid T)$ only. The question asks for both on time and complete, so include $P(T)$ also.",
        },
        hints: ["Let $T$ be on time and $C$ be complete.", "Use $P(T\\cap C)=P(T)P(C\\mid T)$.", "Multiply $0.7$ and $0.8$."],
        solution: [{ step: 1, explanation: "The word 'given' supplies the conditional probability.", math: "P(T\\cap C)=0.7\\times0.8=0.56=\\frac{14}{25}" }],
      },
      {
        questionLatex:
          "\\text{If }P(A\\cap B)=0.24\\text{ and }P(A)=0.60,\\text{ then }P(B\\mid A)\\text{ equals}",
        difficulty: 3,
        skillTags: ["multiplication_theorem", "conditional_probability"],
        choices: ["$0.40$", "$0.144$", "$0.84$", "$0.36$"],
        correctLetter: "A",
        rationales: {
          B: "This multiplies $P(A\\cap B)$ by $P(A)$. To recover the conditional probability, divide by $P(A)$.",
          C: "This adds the two given probabilities. Addition does not isolate $P(B\\mid A)$ from the product formula.",
          D: "This subtracts the joint probability from $P(A)$. The remaining part of $A$ is not $P(B\\mid A)$.",
        },
        hints: ["Rearrange $P(A\\cap B)=P(A)P(B\\mid A)$.", "Divide $0.24$ by $0.60$.", "The result is a conditional probability."],
        solution: [{ step: 1, explanation: "Divide the joint probability by the probability of the first event.", math: "P(B\\mid A)=\\frac{0.24}{0.60}=0.40" }],
      },
      {
        questionLatex:
          "\\text{If }P(A)=\\frac23,\\ P(B\\mid A)=\\frac34,\\text{ and }P(C\\mid A\\cap B)=\\frac45,\\text{ then }P(A\\cap B\\cap C)\\text{ is}",
        difficulty: 4,
        skillTags: ["multiplication_theorem", "three_stage_probability"],
        choices: ["$\\frac25$", "$\\frac{3}{10}$", "$\\frac45$", "$\\frac{29}{60}$"],
        correctLetter: "A",
        rationales: {
          B: "This drops or misuses one stage of the chain. The probability of all three events must include all three given factors.",
          C: "This copies only the final conditional probability $P(C\\mid A\\cap B)$, not the probability of the full intersection.",
          D: "This comes from combining the given fractions arithmetically instead of multiplying along the conditional chain.",
        },
        hints: ["Use the chain rule for three events.", "Multiply all three stage probabilities.", "Cancel before multiplying if possible."],
        solution: [{ step: 1, explanation: "For three events, multiply the first probability by the next conditional probabilities.", math: "P(A\\cap B\\cap C)=\\frac23\\cdot\\frac34\\cdot\\frac45=\\frac25" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{A pouch has }6\\text{ red and }5\\text{ black tokens. Two tokens are drawn without replacement.}",
        difficulty: 2,
        skillTags: ["multiplication_theorem", "without_replacement"],
        parts: singlePart("a", "Find the probability of drawing a red token first and a black token second.", 2),
        hints: ["First red is $6/11$.", "After red is removed, 5 black tokens remain out of 10.", "Multiply."],
        rubric: singleRubric("a", 2, "Finds $3/11$."),
        commonErrors: ["Using $5/11$ for the second draw even though one token has been removed."],
        workedSolution: [{ part: "a", explanation: "$P(R\\text{ then }B)=\\frac6{11}\\cdot\\frac5{10}=\\frac3{11}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{For events }A\\text{ and }B,\\ P(A)=0.45\\text{ and }P(B\\mid A)=0.20.",
        difficulty: 2,
        skillTags: ["multiplication_theorem"],
        parts: singlePart("a", "Find $P(A\\cap B)$.", 2),
        hints: ["Use the multiplication theorem.", "Multiply $0.45$ and $0.20$.", "Write the answer as a decimal or fraction."],
        rubric: singleRubric("a", 2, "Finds $P(A\\cap B)=0.09$."),
        commonErrors: ["Adding the probabilities instead of multiplying them."],
        workedSolution: [{ part: "a", explanation: "$P(A\\cap B)=P(A)P(B\\mid A)=0.45\\times0.20=0.09$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{A candidate clears Round I with probability }\\frac34.\\text{ Given Round I is cleared, Round II is cleared with probability }\\frac23.",
        difficulty: 3,
        skillTags: ["multiplication_theorem", "context_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that both rounds are cleared.", points: 2 },
          { letter: "b", promptMarkdown: "Find the probability that Round I is cleared but Round II is not cleared.", points: 1 },
        ],
        hints: ["Round II probability is conditional on Round I.", "For not clearing Round II after Round I, use $1-2/3$.", "Multiply along the path."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $1/2$." },
            { part: "b", points: 1, description: "Finds $1/4$." },
          ],
        },
        commonErrors: ["Treating Round II as independent without using the given conditional probability."],
        workedSolution: [
          { part: "a", explanation: "$P(\\text{both})=\\frac34\\cdot\\frac23=\\frac12$." },
          { part: "b", explanation: "$P(\\text{Round I only})=\\frac34\\cdot\\left(1-\\frac23\\right)=\\frac34\\cdot\\frac13=\\frac14$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A box contains }4\\text{ green, }3\\text{ orange, and }2\\text{ purple cards. Three cards are drawn one after another without replacement.}",
        difficulty: 4,
        skillTags: ["multiplication_theorem", "without_replacement", "three_stage_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find the probability of drawing green first and orange second.", points: 1 },
          { letter: "b", promptMarkdown: "Find the probability of drawing green, then orange, then purple in this order.", points: 2 },
          { letter: "c", promptMarkdown: "Find the probability that all three cards are green.", points: 2 },
        ],
        hints: ["Track the denominator after each draw.", "For a specific order, multiply the conditional probabilities in that order.", "For all green, the number of green cards also decreases."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $1/6$." },
            { part: "b", points: 2, description: "Finds $1/21$ for green-orange-purple." },
            { part: "c", points: 2, description: "Finds $1/21$ for all green." },
          ],
        },
        commonErrors: ["Keeping denominator 9 for every draw.", "Ignoring that a specific order is being asked."],
        workedSolution: [
          { part: "a", explanation: "$P(G\\text{ then }O)=\\frac49\\cdot\\frac38=\\frac16$." },
          { part: "b", explanation: "$P(G,O,P)=\\frac49\\cdot\\frac38\\cdot\\frac27=\\frac1{21}$." },
          { part: "c", explanation: "$P(G,G,G)=\\frac49\\cdot\\frac38\\cdot\\frac27=\\frac1{21}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{For a scholarship selection process, a student is eligible with probability }\\frac56.\\text{ Given eligibility, the documents are complete with probability }\\frac9{10}.\\text{ Given both, final selection has probability }\\frac25.",
        difficulty: 4,
        skillTags: ["multiplication_theorem", "case_based", "three_stage_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that the student is eligible and uploads documents.", points: 1 },
          { letter: "b", promptMarkdown: "Find the probability that all three stages occur.", points: 2 },
          { letter: "c", promptMarkdown: "State the conditional probability of final selection, given eligibility and document upload.", points: 1 },
        ],
        hints: ["Multiply along the first two branches for part (a).", "Multiply all three probabilities for part (b).", "Part (c) is already the last conditional probability stated in the question."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $3/4$." },
            { part: "b", points: 2, description: "Finds $3/10$." },
            { part: "c", points: 1, description: "States $2/5$." },
          ],
        },
        commonErrors: ["Adding the staged probabilities.", "Using final selection probability as an unconditional probability."],
        workedSolution: [
          { part: "a", explanation: "$P(E\\cap U)=\\frac56\\cdot\\frac9{10}=\\frac34$." },
          { part: "b", explanation: "$P(E\\cap U\\cap S)=\\frac56\\cdot\\frac9{10}\\cdot\\frac25=\\frac3{10}$." },
          { part: "c", explanation: "The given conditional probability is $P(S\\mid E\\cap U)=\\frac25$." },
        ],
      },
    ],
  },
  {
    topicCode: "6.3",
    title: "Independent Events",
    subtopic: "Testing and using independence through products and conditional probabilities",
    mc: [
      {
        questionLatex:
          "\\text{Assertion (A): If }P(A)=0.4,\\ P(B)=0.25,\\text{ and }P(A\\cap B)=0.10,\\text{ then }A\\text{ and }B\\text{ are independent. Reason (R): Events }A\\text{ and }B\\text{ are independent when }P(A\\cap B)=P(A)P(B).\\text{ Choose the correct option.}",
        difficulty: 3,
        skillTags: ["independent_events", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not just true; it is exactly the product test that proves the assertion.",
          C: "The reason is true: it is the defining product check for independence.",
          D: "The assertion is true because $0.4\\times0.25=0.10$.",
        },
        hints: ["Compute $P(A)P(B)$.", "Compare the product with $P(A\\cap B)$.", "Check whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "$P(A)P(B)=0.4\\times0.25=0.10$, which equals $P(A\\cap B)$. Hence the reason correctly explains why the events are independent.", math: "P(A\\cap B)=P(A)P(B)" }],
      },
      {
        questionLatex:
          "\\text{If }A\\text{ and }B\\text{ are independent, }P(A)=\\frac35\\text{ and }P(B)=\\frac23,\\text{ then }P(A\\cup B)\\text{ is}",
        difficulty: 2,
        skillTags: ["independent_events", "addition_theorem"],
        choices: ["$\\frac{13}{15}$", "$\\frac25$", "$\\frac{19}{15}$", "$\\frac{4}{15}$"],
        correctLetter: "A",
        rationales: {
          B: "This is only $P(A\\cap B)=P(A)P(B)$. The question asks for the union, so use addition and subtract the overlap once.",
          C: "This adds $P(A)$ and $P(B)$ but forgets to subtract $P(A\\cap B)$, causing the overlap to be counted twice.",
          D: "This is not the union formula; it loses one or more of the cases where exactly one event occurs.",
        },
        hints: ["For independent events, $P(A\\cap B)=P(A)P(B)$.", "Use the union formula.", "Subtract the intersection once."],
        solution: [{ step: 1, explanation: "$P(A\\cap B)=\\frac35\\cdot\\frac23=\\frac25$. Hence $P(A\\cup B)=\\frac35+\\frac23-\\frac25$.", math: "P(A\\cup B)=\\frac{13}{15}" }],
      },
      {
        questionLatex:
          "\\text{Using the shown table, the events }S\\text{ and }M\\text{ are}",
        difficulty: 3,
        skillTags: ["independent_events", "two_way_table"],
        figure: independenceTableFigure,
        choices: ["independent", "mutually exclusive", "equal events", "neither possible nor impossible"],
        correctLetter: "A",
        rationales: {
          B: "This ignores the 36 students in both categories. Mutually exclusive events would have no overlap.",
          C: "Equal events would require the same membership, but the table has different Sports and Music totals.",
          D: "This skips the product check. The table gives enough information to verify $P(S\\cap M)=P(S)P(M)$.",
        },
        hints: ["Find $P(S)$, $P(M)$, and $P(S\\cap M)$.", "Compare $P(S)P(M)$ with $P(S\\cap M)$.", "The table total is 200."],
        solution: [{ step: 1, explanation: "$P(S)=\\frac{80}{200}=0.4$, $P(M)=\\frac{90}{200}=0.45$, and $P(S\\cap M)=\\frac{36}{200}=0.18$. Since $0.4\\times0.45=0.18$, the events are independent.", math: "P(S\\cap M)=P(S)P(M)" }],
      },
      {
        questionLatex:
          "\\text{If }A\\text{ and }B\\text{ are independent and }P(A)=0.35,\\text{ then }P(A\\mid B)\\text{ equals}",
        difficulty: 3,
        skillTags: ["independent_events", "conditional_probability"],
        choices: ["$0.35$", "$P(B)$", "$0$", "$0.65$"],
        correctLetter: "A",
        rationales: {
          B: "This switches the event being asked about. Independence keeps $P(A\\mid B)$ equal to $P(A)$, not $P(B)$.",
          C: "This treats independent events as mutually exclusive. Knowing $B$ does not make $A$ impossible.",
          D: "This takes the complement of $A$. The condition $B$ does not change $P(A)$ under independence.",
        },
        hints: ["Independence means knowing $B$ does not change the probability of $A$.", "Use $P(A\\mid B)=P(A)$ when $P(B)>0$.", "Do not take the complement."],
        solution: [{ step: 1, explanation: "For independent events, the conditional probability of $A$ given $B$ remains the same as $P(A)$.", math: "P(A\\mid B)=0.35" }],
      },
      {
        questionLatex:
          "\\text{If }A\\text{ and }B\\text{ are independent with }P(A)=0.30\\text{ and }P(B)=0.60,\\text{ then }P(A'\\cap B)\\text{ is}",
        difficulty: 4,
        skillTags: ["independent_events", "complement_probability"],
        choices: ["$0.42$", "$0.18$", "$0.90$", "$0.30$"],
        correctLetter: "A",
        rationales: {
          B: "This finds $P(A\\cap B)$ instead of $P(A'\\cap B)$. The complement of $A$ must be used.",
          C: "This adds $P(A)$ and $P(B)$. An intersection of independent events is found by multiplication, not addition.",
          D: "This copies $P(A)$ even though the event is $A'$ together with $B$.",
        },
        hints: ["First find $P(A')$.", "If $A$ and $B$ are independent, then $A'$ and $B$ are also independent.", "Multiply $P(A')$ and $P(B)$."],
        solution: [{ step: 1, explanation: "$P(A')=0.70$. Since $A'$ and $B$ are independent, $P(A'\\cap B)=P(A')P(B)$.", math: "P(A'\\cap B)=0.70\\times0.60=0.42" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Events }A\\text{ and }B\\text{ are independent with }P(A)=\\frac7{20}\\text{ and }P(B)=\\frac3{10}.",
        difficulty: 2,
        skillTags: ["independent_events"],
        parts: singlePart("a", "Find $P(A\\cap B)$.", 2),
        hints: ["Use the product rule for independent events.", "Multiply $7/20$ and $3/10$.", "Simplify if possible."],
        rubric: singleRubric("a", 2, "Finds $21/200$."),
        commonErrors: ["Adding the probabilities instead of multiplying."],
        workedSolution: [{ part: "a", explanation: "$P(A\\cap B)=P(A)P(B)=\\frac7{20}\\cdot\\frac3{10}=\\frac{21}{200}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{For two events }A\\text{ and }B,\\ P(A)=0.45,\\ P(B)=0.40,\\text{ and }P(A\\cap B)=0.18.",
        difficulty: 2,
        skillTags: ["independent_events"],
        parts: singlePart("a", "Check whether $A$ and $B$ are independent.", 2),
        hints: ["Compute $P(A)P(B)$.", "Compare with $P(A\\cap B)$.", "Equal values mean independence."],
        rubric: singleRubric("a", 2, "Shows $0.45\\times0.40=0.18$ and concludes independent."),
        commonErrors: ["Checking whether $P(A)+P(B)=1$ instead of checking the product condition."],
        workedSolution: [{ part: "a", explanation: "$P(A)P(B)=0.45\\times0.40=0.18=P(A\\cap B)$, so $A$ and $B$ are independent." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Events }A\\text{ and }B\\text{ are independent. }P(A)=\\frac25\\text{ and }P(B')=\\frac34.",
        difficulty: 3,
        skillTags: ["independent_events", "complement_probability", "addition_theorem"],
        parts: [
          { letter: "a", promptMarkdown: "Find $P(A\\cap B)$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $P(A\\cup B)$.", points: 2 },
        ],
        hints: ["First find $P(B)$.", "Use independence for the intersection.", "Use the union formula."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $1/10$." },
            { part: "b", points: 2, description: "Finds $11/20$." },
          ],
        },
        commonErrors: ["Using $P(B')$ directly as $P(B)$.", "Forgetting to subtract the intersection in the union formula."],
        workedSolution: [
          { part: "a", explanation: "$P(B)=1-\\frac34=\\frac14$. Since independent, $P(A\\cap B)=\\frac25\\cdot\\frac14=\\frac1{10}$." },
          { part: "b", explanation: "$P(A\\cup B)=\\frac25+\\frac14-\\frac1{10}=\\frac{11}{20}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Three warning systems }A,B,C\\text{ work independently during a drill. Their working probabilities are }0.90,\\ 0.80,\\text{ and }0.75\\text{ respectively.}",
        difficulty: 4,
        skillTags: ["independent_events", "complement_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that all three systems work.", points: 2 },
          { letter: "b", promptMarkdown: "Find the probability that at least one system fails.", points: 2 },
          { letter: "c", promptMarkdown: "Find the probability that only system $A$ works.", points: 1 },
        ],
        hints: ["Independence lets you multiply stage probabilities.", "At least one fails is the complement of all three work.", "Only $A$ works means $A$ works and both $B,C$ fail."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $0.54$." },
            { part: "b", points: 2, description: "Finds $0.46$." },
            { part: "c", points: 1, description: "Finds $0.045$." },
          ],
        },
        commonErrors: ["Adding independent probabilities.", "Treating 'at least one fails' as exactly one fails."],
        workedSolution: [
          { part: "a", explanation: "$P(A\\cap B\\cap C)=0.90\\times0.80\\times0.75=0.54$." },
          { part: "b", explanation: "$P(\\text{at least one fails})=1-0.54=0.46$." },
          { part: "c", explanation: "$P(A\\cap B'\\cap C')=0.90\\times0.20\\times0.25=0.045$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{The shown table classifies }200\\text{ students by sports participation }S\\text{ and music participation }M.",
        difficulty: 4,
        skillTags: ["independent_events", "case_based", "two_way_table"],
        figure: independenceTableFigure,
        parts: [
          { letter: "a", promptMarkdown: "Verify whether $S$ and $M$ are independent.", points: 2 },
          { letter: "b", promptMarkdown: "Find $P(S'\\cap M)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $P(S\\cup M)$.", points: 1 },
        ],
        hints: ["Use the row and column totals.", "Compare $P(S\\cap M)$ with $P(S)P(M)$.", "For the union, add totals and subtract overlap."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Shows $36/200=(80/200)(90/200)$ and concludes independent." },
            { part: "b", points: 1, description: "Finds $54/200=27/100$." },
            { part: "c", points: 1, description: "Finds $134/200=67/100$." },
          ],
        },
        commonErrors: ["Using counts without dividing by the same total.", "Calling independent events mutually exclusive."],
        workedSolution: [
          { part: "a", explanation: "$P(S)=\\frac{80}{200}$, $P(M)=\\frac{90}{200}$, and $P(S\\cap M)=\\frac{36}{200}$. Since $\\frac{80}{200}\\cdot\\frac{90}{200}=\\frac{36}{200}$, the events are independent." },
          { part: "b", explanation: "$P(S'\\cap M)=\\frac{54}{200}=\\frac{27}{100}$." },
          { part: "c", explanation: "$P(S\\cup M)=\\frac{80+90-36}{200}=\\frac{67}{100}$." },
        ],
      },
    ],
  },
  {
    topicCode: "6.4",
    title: "Total Probability",
    subtopic: "Combining conditional probabilities over exhaustive cases",
    mc: [
      {
        questionLatex:
          "\\text{A component comes from plant }A\\text{ with probability }0.6\\text{ and plant }B\\text{ with probability }0.4.\\text{ Defect rates are }0.02\\text{ and }0.05.\\text{ The probability of a defect is}",
        difficulty: 2,
        skillTags: ["total_probability"],
        choices: ["$\\frac4{125}$", "$\\frac7{100}$", "$\\frac3{100}$", "$\\frac1{50}$"],
        correctLetter: "A",
        rationales: {
          B: "This adds the two defect rates directly. Total probability must weight each defect rate by the plant's share.",
          C: "This uses an unweighted or incomplete combination of defect rates. The plant probabilities $0.6$ and $0.4$ are essential.",
          D: "This uses only plant $A$'s defect rate and ignores defects from plant $B$.",
        },
        hints: ["Split by the plant source.", "Use $P(D)=P(A)P(D\\mid A)+P(B)P(D\\mid B)$.", "Add the two weighted defect probabilities."],
        solution: [{ step: 1, explanation: "Use total probability across the two mutually exclusive plant sources.", math: "P(D)=0.6(0.02)+0.4(0.05)=0.032=\\frac4{125}" }],
      },
      {
        questionLatex:
          "\\text{Trainees are in batches }I,II,III\\text{ with probabilities }0.20,0.50,0.30.\\text{ Their pass probabilities are }0.90,0.80,0.70.\\text{ The overall pass probability is}",
        difficulty: 2,
        skillTags: ["total_probability"],
        choices: ["$0.79$", "$0.80$", "$0.24$", "$0.63$"],
        correctLetter: "A",
        rationales: {
          B: "This is the simple average or the middle pass rate. The batches are not equally likely, so use weighted probabilities.",
          C: "This uses only one weighted path and misses the other two batches.",
          D: "This combines the probabilities without correctly summing all weighted pass paths.",
        },
        hints: ["Weight each batch pass probability by the chance of being in that batch.", "Add all three terms.", "Do not average the three pass probabilities directly."],
        solution: [{ step: 1, explanation: "The batch groups are exhaustive and mutually exclusive.", math: "0.20(0.90)+0.50(0.80)+0.30(0.70)=0.79" }],
      },
      {
        questionLatex:
          "\\text{In the tree diagram, the probability that the student arrives late is}",
        difficulty: 3,
        skillTags: ["total_probability", "tree_diagram"],
        figure: routeTreeFigure,
        choices: ["$\\frac3{20}$", "$\\frac1{10}$", "$\\frac7{20}$", "$\\frac1{6}$"],
        correctLetter: "A",
        rationales: {
          B: "This copies the late probability on route $R1$ only. Total late probability must include all route branches.",
          C: "This combines route information incorrectly instead of adding the three late-path products.",
          D: "This copies the prior probability of route $R3$, not the probability of arriving late.",
        },
        hints: ["Follow each route branch to the late branch.", "Multiply along each path.", "Add the three late-path probabilities."],
        solution: [{ step: 1, explanation: "Late arrival can occur through any one of the three routes.", math: "\\frac12(0.10)+\\frac13(0.15)+\\frac16(0.30)=0.15=\\frac3{20}" }],
      },
      {
        questionLatex:
          "\\text{Assertion (A): If }H_1,H_2,H_3\\text{ are mutually exclusive and exhaustive, then }P(E)=\\sum_{i=1}^{3}P(H_i)P(E\\mid H_i).\\text{ Reason (R): The event }E\\text{ can be split into disjoint paths }E\\cap H_i\\text{ and these path probabilities add. Choose the correct option.}",
        difficulty: 3,
        skillTags: ["total_probability", "formula_recognition", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the weighted-sum formula in the assertion.",
          C: "The reason is true because mutually exclusive cases create disjoint paths to $E$.",
          D: "The assertion is the theorem of total probability.",
        },
        hints: ["Think of $H_1,H_2,H_3$ as exhaustive cases.", "The paths $E\\cap H_i$ are disjoint.", "Use $P(E\\cap H_i)=P(H_i)P(E\\mid H_i)$."],
        solution: [{ step: 1, explanation: "Since the hypotheses are mutually exclusive and exhaustive, $E$ is the disjoint union of the paths $E\\cap H_i$. Each path has probability $P(H_i)P(E\\mid H_i)$.", math: "P(E)=\\sum_{i=1}^{3}P(H_i)P(E\\mid H_i)" }],
      },
      {
        questionLatex:
          "\\text{Using the shown supplier table, the probability that a randomly selected item is defective is}",
        difficulty: 4,
        skillTags: ["total_probability", "table_probability"],
        figure: supplierTableFigure,
        choices: ["$\\frac{43}{1000}$", "$\\frac{15}{1000}$", "$\\frac{3}{20}$", "$\\frac{1}{25}$"],
        correctLetter: "A",
        rationales: {
          B: "This is only the supplier $A$ defect path. Total defect probability must include suppliers $B$ and $C$ too.",
          C: "This is not a weighted sum of defect paths; it overstates the defect probability by mixing table entries incorrectly.",
          D: "This copies supplier $B$'s defect rate. A randomly selected item may come from any supplier.",
        },
        hints: ["Use all three supplier rows.", "Multiply share by defect rate in each row.", "Add the three products."],
        solution: [{ step: 1, explanation: "The total defect probability is the weighted sum across suppliers.", math: "0.50(0.03)+0.30(0.04)+0.20(0.08)=0.043=\\frac{43}{1000}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Box }A\\text{ is chosen with probability }\\frac35\\text{ and has red probability }\\frac25.\\text{ Box }B\\text{ is chosen with probability }\\frac25\\text{ and has red probability }\\frac34.",
        difficulty: 2,
        skillTags: ["total_probability"],
        parts: singlePart("a", "Find the probability of drawing a red ball.", 2),
        hints: ["Split by the chosen box.", "Multiply box probability by red probability for each box.", "Add the two paths."],
        rubric: singleRubric("a", 2, "Finds $27/50$."),
        commonErrors: ["Adding the red probabilities without weighting by box choice."],
        workedSolution: [{ part: "a", explanation: "$P(R)=\\frac35\\cdot\\frac25+\\frac25\\cdot\\frac34=\\frac{12}{50}+\\frac{15}{50}=\\frac{27}{50}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{A team is junior with probability }0.6\\text{ and senior with probability }0.4.\\text{ Qualification probabilities are }0.5\\text{ and }0.7\\text{ respectively.}",
        difficulty: 2,
        skillTags: ["total_probability"],
        parts: singlePart("a", "Find the overall probability of qualification.", 2),
        hints: ["Use junior and senior as exhaustive cases.", "Weight each qualification probability.", "Add both contributions."],
        rubric: singleRubric("a", 2, "Finds $0.58=29/50$."),
        commonErrors: ["Taking the simple average of $0.5$ and $0.7$."],
        workedSolution: [{ part: "a", explanation: "$P(Q)=0.6(0.5)+0.4(0.7)=0.30+0.28=0.58=\\frac{29}{50}$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Students come by bus, cycle, and walking with probabilities }0.5,\\ 0.3,\\ 0.2.\\text{ Their on-time probabilities are }0.8,\\ 0.7,\\ 0.6.",
        difficulty: 3,
        skillTags: ["total_probability", "context_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that a randomly selected student is on time.", points: 2 },
          { letter: "b", promptMarkdown: "Find the probability that the student is late.", points: 1 },
        ],
        hints: ["Use the three transport modes as cases.", "On-time probability is a weighted sum.", "Late is the complement of on-time."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $0.73$." },
            { part: "b", points: 1, description: "Finds $0.27$." },
          ],
        },
        commonErrors: ["Using only the largest transport group.", "Not taking the complement for late."],
        workedSolution: [
          { part: "a", explanation: "$P(\\text{on time})=0.5(0.8)+0.3(0.7)+0.2(0.6)=0.73$." },
          { part: "b", explanation: "$P(\\text{late})=1-0.73=0.27$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{A shop receives items from suppliers }A,B,C\\text{ as shown in the table.}",
        difficulty: 4,
        skillTags: ["total_probability", "table_probability"],
        figure: supplierTableFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that a randomly selected item is defective.", points: 2 },
          { letter: "b", promptMarkdown: "Find the probability that the item is not defective.", points: 1 },
          { letter: "c", promptMarkdown: "Find the probability that the item came from supplier $C$ and is defective.", points: 1 },
        ],
        hints: ["Multiply share by defect rate in every row.", "Non-defective is the complement.", "For supplier $C$ and defective, use only the $C$ row."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $43/1000$." },
            { part: "b", points: 1, description: "Finds $957/1000$." },
            { part: "c", points: 1, description: "Finds $16/1000=2/125$." },
          ],
        },
        commonErrors: ["Averaging the three defect rates equally.", "Forgetting that shares must add to 1."],
        workedSolution: [
          { part: "a", explanation: "$P(D)=0.50(0.03)+0.30(0.04)+0.20(0.08)=0.043=\\frac{43}{1000}$." },
          { part: "b", explanation: "$P(D')=1-\\frac{43}{1000}=\\frac{957}{1000}$." },
          { part: "c", explanation: "$P(C\\cap D)=0.20(0.08)=0.016=\\frac2{125}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A mock test is selected from Set I, Set II, or Set III with probabilities }\\frac25,\\frac13,\\frac4{15}.\\text{ The probabilities of scoring above the cut-off in these sets are }\\frac34,\\frac35,\\frac12.",
        difficulty: 4,
        skillTags: ["total_probability", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Check that the three set-selection probabilities are exhaustive.", points: 1 },
          { letter: "b", promptMarkdown: "Find the probability of scoring above the cut-off.", points: 2 },
          { letter: "c", promptMarkdown: "Find the probability of not scoring above the cut-off.", points: 1 },
        ],
        hints: ["Add the three prior probabilities first.", "Use total probability for scoring above cut-off.", "Use complement for not scoring above cut-off."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Shows $2/5+1/3+4/15=1$." },
            { part: "b", points: 2, description: "Finds $19/30$." },
            { part: "c", points: 1, description: "Finds $11/30$." },
          ],
        },
        commonErrors: ["Not checking that the cases are exhaustive.", "Averaging the three success probabilities."],
        workedSolution: [
          { part: "a", explanation: "$\\frac25+\\frac13+\\frac4{15}=\\frac6{15}+\\frac5{15}+\\frac4{15}=1$." },
          { part: "b", explanation: "$P(S)=\\frac25\\cdot\\frac34+\\frac13\\cdot\\frac35+\\frac4{15}\\cdot\\frac12=\\frac3{10}+\\frac15+\\frac2{15}=\\frac{19}{30}$." },
          { part: "c", explanation: "$P(S')=1-\\frac{19}{30}=\\frac{11}{30}$." },
        ],
      },
    ],
  },
  {
    topicCode: "6.5",
    title: "Bayes' Theorem",
    subtopic: "Finding posterior probabilities after an observed event",
    mc: [
      {
        questionLatex:
          "\\text{Using the shown supplier table, if a randomly selected item is defective, the probability that it came from supplier }A\\text{ is}",
        difficulty: 2,
        skillTags: ["bayes_theorem", "table_probability"],
        figure: supplierTableFigure,
        choices: ["$\\frac{15}{43}$", "$\\frac12$", "$\\frac{3}{100}$", "$\\frac{43}{1000}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the prior probability that an item came from supplier $A$. After a defect is observed, the probability must be updated.",
          C: "This is supplier $A$'s defect rate, a likelihood, not the posterior probability that the defective item came from $A$.",
          D: "This is the total probability of a defect. In Bayes' theorem it belongs in the denominator, not as the final answer.",
        },
        hints: ["Use supplier $A$ and defective in the numerator.", "Use total defect probability in the denominator.", "The total defect probability from the table is $43/1000$."],
        solution: [{ step: 1, explanation: "The numerator is $P(A\\cap D)=0.50(0.03)=0.015$. The denominator is $P(D)=0.043$.", math: "P(A\\mid D)=\\frac{0.015}{0.043}=\\frac{15}{43}" }],
      },
      {
        questionLatex:
          "\\text{A condition has probability }0.04.\\text{ A test is positive with probability }0.90\\text{ when the condition is present and }0.08\\text{ when it is absent. Given a positive test, the probability that the condition is present is}",
        difficulty: 2,
        skillTags: ["bayes_theorem", "diagnostic_probability"],
        choices: ["$\\frac{15}{47}$", "$\\frac{9}{10}$", "$\\frac{1}{25}$", "$\\frac{2}{25}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the sensitivity $P(+\\mid D)$. It is not the same as $P(D\\mid +)$ because false positives also occur.",
          C: "This is the prior probability of the condition before the positive test result is known.",
          D: "This is the false-positive probability $P(+\\mid D')$, not the posterior probability after a positive result.",
        },
        hints: ["Compute disease-and-positive for the numerator.", "Compute total positive probability for the denominator.", "Include false positives in the denominator."],
        solution: [{ step: 1, explanation: "Numerator $=0.04(0.90)=0.036$. Denominator $=0.04(0.90)+0.96(0.08)=0.1128$.", math: "P(D\\mid +)=\\frac{0.036}{0.1128}=\\frac{15}{47}" }],
      },
      {
        questionLatex:
          "\\text{Using the tree diagram, if the student is late, the probability that route }R3\\text{ was used is}",
        difficulty: 3,
        skillTags: ["bayes_theorem", "tree_diagram"],
        figure: routeTreeFigure,
        choices: ["$\\frac13$", "$\\frac16$", "$\\frac3{20}$", "$\\frac12$"],
        correctLetter: "A",
        rationales: {
          B: "This is the prior probability of route $R3$. The information that the student is late changes the sample space.",
          C: "This is the total probability of being late. Bayes' theorem uses it as the denominator, not the posterior.",
          D: "This is the prior probability of route $R1$, so it answers a different route question and ignores the late condition.",
        },
        hints: ["Find $P(R3\\cap L)$.", "Find total $P(L)$.", "Use $P(R3\\mid L)=\\frac{P(R3\\cap L)}{P(L)}$."],
        solution: [{ step: 1, explanation: "$P(R3\\cap L)=\\frac16(0.30)=0.05$, and $P(L)=0.15$.", math: "P(R3\\mid L)=\\frac{0.05}{0.15}=\\frac13" }],
      },
      {
        questionLatex:
          "\\text{Box }A\\text{ is chosen with probability }\\frac35\\text{ and gives a red ball with probability }\\frac25.\\text{ Box }B\\text{ is chosen with probability }\\frac25\\text{ and gives a red ball with probability }\\frac34.\\text{ If a red ball is drawn, }P(A\\mid R)\\text{ is}",
        difficulty: 3,
        skillTags: ["bayes_theorem", "total_probability"],
        choices: ["$\\frac49$", "$\\frac35$", "$\\frac{27}{50}$", "$\\frac25$"],
        correctLetter: "A",
        rationales: {
          B: "This is the prior probability of choosing box $A$. It must be updated after seeing that the drawn ball is red.",
          C: "This is the total probability of drawing a red ball. It is the Bayes denominator, not the posterior.",
          D: "This is the likelihood of red from box $A$, $P(R\\mid A)$, not the probability that box $A$ was chosen after red is observed.",
        },
        hints: ["Use the red-from-$A$ path for the numerator.", "Use total red probability for the denominator.", "The total red probability is $27/50$."],
        solution: [{ step: 1, explanation: "$P(A\\cap R)=\\frac35\\cdot\\frac25=\\frac{12}{50}$ and $P(R)=\\frac{27}{50}$.", math: "P(A\\mid R)=\\frac{12/50}{27/50}=\\frac49" }],
      },
      {
        questionLatex:
          "\\text{Assertion (A): For mutually exclusive and exhaustive hypotheses }H_1,H_2,H_3,\\ P(H_2\\mid E)=\\frac{P(H_2)P(E\\mid H_2)}{\\sum_{i=1}^{3}P(H_i)P(E\\mid H_i)}.\\text{ Reason (R): Bayes' theorem divides the desired path probability by the total probability of the observed event. Choose the correct option.}",
        difficulty: 4,
        skillTags: ["bayes_theorem", "formula_recognition", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not merely true; it explains why the denominator must be the total probability of $E$.",
          C: "The reason is true: the posterior is the desired path over all paths that produce the observation.",
          D: "The assertion is Bayes' theorem for the hypothesis $H_2$.",
        },
        hints: ["Identify the desired path $H_2\\cap E$.", "The denominator must include every exhaustive path to $E$.", "Check whether the reason explains the formula."],
        solution: [{ step: 1, explanation: "The numerator is the probability that $H_2$ occurs and then $E$ occurs. The denominator is total probability of the observed event $E$ across all hypotheses.", math: "P(H_2\\mid E)=\\frac{P(H_2)P(E\\mid H_2)}{\\sum_{i=1}^{3}P(H_i)P(E\\mid H_i)}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Machine }A\\text{ makes }70\\%\\text{ of parts with defect rate }2\\%.\\text{ Machine }B\\text{ makes }30\\%\\text{ with defect rate }5\\%.",
        difficulty: 2,
        skillTags: ["bayes_theorem", "total_probability"],
        parts: singlePart("a", "If a part is defective, find the probability that it came from machine $B$.", 2),
        hints: ["Find the $B$ and defective path.", "Find total defective probability.", "Divide the first by the second."],
        rubric: singleRubric("a", 2, "Finds $15/29$."),
        commonErrors: ["Using $0.05$ directly as the posterior probability."],
        workedSolution: [{ part: "a", explanation: "$P(B\\cap D)=0.30(0.05)=0.015$. Also $P(D)=0.70(0.02)+0.30(0.05)=0.029$. Hence $P(B\\mid D)=\\frac{0.015}{0.029}=\\frac{15}{29}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{A card is drawn from box }A\\text{ with probability }\\frac14\\text{ or box }B\\text{ with probability }\\frac34.\\text{ Event }E\\text{ has probabilities }\\frac25\\text{ and }\\frac15\\text{ in boxes }A\\text{ and }B.",
        difficulty: 2,
        skillTags: ["bayes_theorem"],
        parts: singlePart("a", "Given that $E$ occurred, find the probability that box $A$ was chosen.", 2),
        hints: ["Find $P(A\\cap E)$.", "Find total $P(E)$.", "Use Bayes' theorem."],
        rubric: singleRubric("a", 2, "Finds $2/5$."),
        commonErrors: ["Forgetting the prior probabilities of the boxes."],
        workedSolution: [{ part: "a", explanation: "$P(A\\cap E)=\\frac14\\cdot\\frac25=\\frac1{10}$ and $P(E)=\\frac14\\cdot\\frac25+\\frac34\\cdot\\frac15=\\frac14$. Thus $P(A\\mid E)=\\frac{1/10}{1/4}=\\frac25$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Use the tree diagram.}",
        difficulty: 3,
        skillTags: ["bayes_theorem", "tree_diagram"],
        figure: routeTreeFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the total probability of being late.", points: 1 },
          { letter: "b", promptMarkdown: "Given that the student is late, find the probability that route $R1$ was used.", points: 2 },
        ],
        hints: ["Add the three late-path probabilities.", "Use the $R1$ late-path in the numerator.", "Divide by total late probability."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $3/20$." },
            { part: "b", points: 2, description: "Finds $1/3$." },
          ],
        },
        commonErrors: ["Using the prior route probability after late arrival is known."],
        workedSolution: [
          { part: "a", explanation: "$P(L)=\\frac12(0.10)+\\frac13(0.15)+\\frac16(0.30)=0.15=\\frac3{20}$." },
          { part: "b", explanation: "$P(R1\\cap L)=\\frac12(0.10)=0.05$. Hence $P(R1\\mid L)=\\frac{0.05}{0.15}=\\frac13$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Seeds come from nurseries }A,B,C\\text{ in proportions }0.40,0.35,0.25.\\text{ Their germination probabilities are }0.90,0.80,0.60\\text{ respectively.}",
        difficulty: 4,
        skillTags: ["bayes_theorem", "total_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that a randomly selected seed germinates.", points: 2 },
          { letter: "b", promptMarkdown: "Given that the seed germinated, find the probability it came from nursery $B$.", points: 2 },
          { letter: "c", promptMarkdown: "Given that the seed did not germinate, find the probability it came from nursery $C$.", points: 1 },
        ],
        hints: ["Use total probability for germination.", "For part (b), numerator is $B$ and germinated.", "For part (c), use non-germination probabilities."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $0.79$." },
            { part: "b", points: 2, description: "Finds $28/79$." },
            { part: "c", points: 1, description: "Finds $10/21$." },
          ],
        },
        commonErrors: ["Using germination probability alone as a posterior.", "For part (c), forgetting to switch to non-germination rates."],
        workedSolution: [
          { part: "a", explanation: "$P(G)=0.40(0.90)+0.35(0.80)+0.25(0.60)=0.36+0.28+0.15=0.79$." },
          { part: "b", explanation: "$P(B\\mid G)=\\frac{0.35(0.80)}{0.79}=\\frac{0.28}{0.79}=\\frac{28}{79}$." },
          { part: "c", explanation: "$P(G')=0.21$ and $P(C\\cap G')=0.25(0.40)=0.10$. Hence $P(C\\mid G')=\\frac{0.10}{0.21}=\\frac{10}{21}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A clinic uses the screening data shown in the table.}",
        difficulty: 4,
        skillTags: ["bayes_theorem", "diagnostic_probability", "case_based"],
        figure: diagnosticTableFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the probability that a randomly selected person tests positive.", points: 2 },
          { letter: "b", promptMarkdown: "Given a positive result, find the probability that the person has the disease.", points: 1 },
          { letter: "c", promptMarkdown: "Given a positive result, find the probability that the person does not have the disease.", points: 1 },
          { letter: "d", promptMarkdown: "Given a negative result, find the probability that the person has the disease.", points: 1 },
        ],
        hints: ["Positive results come from true positives and false positives.", "For part (b), divide true positives by total positives.", "For part (d), use disease-and-negative over total negative."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $103/1000$." },
            { part: "b", points: 1, description: "Finds $46/103$." },
            { part: "c", points: 1, description: "Finds $57/103$." },
            { part: "d", points: 1, description: "Finds $4/897$." },
          ],
        },
        commonErrors: ["Ignoring false positives.", "Treating sensitivity as the posterior probability.", "For a negative result, forgetting the false-negative path."],
        workedSolution: [
          { part: "a", explanation: "$P(+)=0.05(0.92)+0.95(0.06)=0.046+0.057=0.103=\\frac{103}{1000}$." },
          { part: "b", explanation: "$P(D\\mid +)=\\frac{0.05(0.92)}{0.103}=\\frac{46}{103}$." },
          { part: "c", explanation: "$P(D'\\mid +)=\\frac{0.95(0.06)}{0.103}=\\frac{57}{103}$." },
          { part: "d", explanation: "$P(D\\cap -)=0.05(0.08)=0.004$ and $P(-)=1-0.103=0.897$, so $P(D\\mid -)=\\frac{0.004}{0.897}=\\frac4{897}$." },
        ],
      },
    ],
  },
];

export const probabilityTopics: Topic[] = topicSeeds.map(makeTopic);
