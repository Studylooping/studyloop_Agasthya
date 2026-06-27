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

const COURSE = "cbse-math-11";
const UNIT = "u5-statistics-probability";
const VERSION = "0.1.2";
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the dispersion or event-probability rule before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_class11_statistics_probability_reasoning",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_formula_without_matching_the_data_or_event_condition",
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

function makeConstructed(meta: TopicMeta, seed: ConstructedSeed, index: number): FrqItem {
  return {
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_final_value_without_showing_the_required_statistical_or_probability_work",
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

function singlePart(letter: string, promptMarkdown: string, points: number): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(part: string, points: number, description: string): FrqRubric {
  return {
    maxPoints: points,
    criteria: [{ part, points, description }],
  };
}

function makeTopic(seed: TopicSeed): Topic {
  return {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
    items: [
      ...seed.mc.map((item, index) => makeMc(seed, item, index)),
      ...seed.constructed.map((item, index) => makeConstructed(seed, item, index)),
    ],
  };
}

const dispersionDotPlotFigure: ItemFigure = {
  type: "svg",
  title: "Two data sets with the same centre",
  description: "Two dot plots show one data set clustered near the centre and another spread farther away.",
  svg: `<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="300" fill="#ffffff"/>
  <line x1="90" y1="115" x2="500" y2="115" stroke="#64748b" stroke-width="2"/>
  <line x1="90" y1="220" x2="500" y2="220" stroke="#64748b" stroke-width="2"/>
  <text x="48" y="120" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">A</text>
  <text x="48" y="225" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">B</text>
  <text x="271" y="263" font-size="15" fill="#475569" font-family="Arial, sans-serif">centre</text>
  <line x1="285" y1="80" x2="285" y2="238" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <circle cx="250" cy="115" r="8" fill="#2563eb"/>
  <circle cx="285" cy="115" r="8" fill="#2563eb"/>
  <circle cx="320" cy="115" r="8" fill="#2563eb"/>
  <circle cx="180" cy="220" r="8" fill="#f97316"/>
  <circle cx="285" cy="220" r="8" fill="#f97316"/>
  <circle cx="390" cy="220" r="8" fill="#f97316"/>
  <text x="95" y="52" font-size="17" fill="#334155" font-family="Arial, sans-serif">same centre, different spread</text>
</svg>`,
};

const varianceBalanceFigure: ItemFigure = {
  type: "svg",
  title: "Distances from the mean",
  description: "A number-line sketch marks four observations and their common mean for variance reasoning.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <line x1="90" y1="150" x2="490" y2="150" stroke="#64748b" stroke-width="2"/>
  <path d="M490 150 L478 144 M490 150 L478 156" stroke="#64748b" stroke-width="2" fill="none"/>
  <line x1="150" y1="135" x2="150" y2="165" stroke="#64748b" stroke-width="2"/>
  <line x1="240" y1="135" x2="240" y2="165" stroke="#64748b" stroke-width="2"/>
  <line x1="330" y1="135" x2="330" y2="165" stroke="#64748b" stroke-width="2"/>
  <line x1="420" y1="135" x2="420" y2="165" stroke="#64748b" stroke-width="2"/>
  <circle cx="150" cy="150" r="8" fill="#2563eb"/>
  <circle cx="240" cy="150" r="8" fill="#2563eb"/>
  <circle cx="330" cy="150" r="8" fill="#2563eb"/>
  <circle cx="420" cy="150" r="8" fill="#2563eb"/>
  <line x1="285" y1="80" x2="285" y2="190" stroke="#f97316" stroke-width="3"/>
  <text x="268" y="75" font-size="16" fill="#9a3412" font-family="Arial, sans-serif">mean</text>
  <text x="143" y="192" font-size="15" fill="#475569" font-family="Arial, sans-serif">1</text>
  <text x="233" y="192" font-size="15" fill="#475569" font-family="Arial, sans-serif">3</text>
  <text x="323" y="192" font-size="15" fill="#475569" font-family="Arial, sans-serif">5</text>
  <text x="413" y="192" font-size="15" fill="#475569" font-family="Arial, sans-serif">7</text>
</svg>`,
};

const groupedHistogramFigure: ItemFigure = {
  type: "svg",
  title: "Grouped frequency distribution",
  description: "A simple grouped-frequency sketch shows three adjacent class intervals with the middle interval having twice the frequency of each side interval.",
  svg: `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="340" fill="#ffffff"/>
  <line x1="80" y1="280" x2="505" y2="280" stroke="#64748b" stroke-width="2"/>
  <line x1="80" y1="60" x2="80" y2="300" stroke="#64748b" stroke-width="2"/>
  <rect x="130" y="200" width="90" height="80" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <rect x="220" y="120" width="90" height="160" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <rect x="310" y="200" width="90" height="80" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="119" y="305" font-size="14" fill="#475569" font-family="Arial, sans-serif">0-10</text>
  <text x="225" y="305" font-size="14" fill="#475569" font-family="Arial, sans-serif">10-20</text>
  <text x="314" y="305" font-size="14" fill="#475569" font-family="Arial, sans-serif">20-30</text>
  <text x="438" y="322" font-size="15" fill="#475569" font-family="Arial, sans-serif">class</text>
  <text x="38" y="68" font-size="15" fill="#475569" font-family="Arial, sans-serif">freq.</text>
</svg>`,
};

const eventVennFigure: ItemFigure = {
  type: "svg",
  title: "Regions for two events",
  description: "A Venn diagram labels the regions for two overlapping events without giving numerical counts.",
  svg: `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="340" fill="#ffffff"/>
  <rect x="75" y="55" width="410" height="230" rx="6" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <circle cx="235" cy="170" r="82" fill="#dbeafe" stroke="#2563eb" stroke-width="3" fill-opacity="0.75"/>
  <circle cx="325" cy="170" r="82" fill="#dcfce7" stroke="#16a34a" stroke-width="3" fill-opacity="0.75"/>
  <text x="180" y="93" font-size="17" fill="#1d4ed8" font-family="Arial, sans-serif">A</text>
  <text x="370" y="93" font-size="17" fill="#15803d" font-family="Arial, sans-serif">B</text>
  <text x="174" y="176" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">A only</text>
  <text x="253" y="176" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">A and B</text>
  <text x="350" y="176" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">B only</text>
  <text x="414" y="256" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">neither</text>
</svg>`,
};

const partitionProbabilityFigure: ItemFigure = {
  type: "svg",
  title: "Exhaustive partition with probabilities",
  description: "Four mutually exclusive categories form the whole set, with probabilities labelled using p.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <rect x="78" y="70" width="404" height="110" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <line x1="179" y1="70" x2="179" y2="180" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="70" x2="280" y2="180" stroke="#64748b" stroke-width="2"/>
  <line x1="381" y1="70" x2="381" y2="180" stroke="#64748b" stroke-width="2"/>
  <text x="110" y="114" font-size="17" fill="#1d4ed8" font-family="Arial, sans-serif">R</text>
  <text x="207" y="114" font-size="17" fill="#15803d" font-family="Arial, sans-serif">S</text>
  <text x="309" y="114" font-size="17" fill="#9a3412" font-family="Arial, sans-serif">T</text>
  <text x="410" y="114" font-size="17" fill="#334155" font-family="Arial, sans-serif">U</text>
  <text x="104" y="150" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">p</text>
  <text x="202" y="150" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">2p</text>
  <text x="294" y="150" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">p+0.1</text>
  <text x="404" y="150" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">0.2</text>
  <text x="150" y="210" font-size="16" fill="#475569" font-family="Arial, sans-serif">mutually exclusive and exhaustive</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Range and Mean Deviation",
    subtopic: "Dispersion using range and mean deviation for ungrouped and discrete-frequency data",
    mc: [
      {
        questionLatex: L`\text{The daily temperatures }21,22,22,24,26\text{ have range}`,
        difficulty: 2,
        skillTags: ["statistics", "range", "ungrouped_data"],
        choices: ["$5$", "$26$", "$21$", "$4$"],
        correctLetter: "A",
        rationales: {
          B: "This is the largest value, not largest minus smallest.",
          C: "This is the smallest value, not the spread.",
          D: "This counts the number of gaps between five observations, not the numerical range.",
        },
        hints: ["Range means largest value minus smallest value.", "Identify 26 and 21.", "Subtract 21 from 26."],
        solution: [{ step: 1, explanation: "The range is highest observation minus lowest observation.", math: "26-21=5" }],
      },
      {
        questionLatex: L`\text{For }2,4,6,8,\text{ the mean deviation about the mean is}`,
        difficulty: 3,
        skillTags: ["statistics", "mean_deviation", "ungrouped_data"],
        choices: ["$2$", "$5$", "$8$", "$1$"],
        correctLetter: "A",
        rationales: {
          B: "This is the mean, not the mean deviation.",
          C: "This is the sum of absolute deviations, before dividing by the number of observations.",
          D: "This averages only the two smaller deviations and ignores the larger ones.",
        },
        hints: ["First find the mean.", "Use absolute deviations from the mean.", "Average those absolute deviations."],
        solution: [{ step: 1, explanation: "The mean is 5 and the absolute deviations are 3, 1, 1, 3.", math: "\\text{M.D.}=\\frac{3+1+1+3}{4}=2" }],
      },
      {
        questionLatex: L`\text{If all observations are }5,5,5,5,\text{ then the range and mean deviation are respectively}`,
        difficulty: 2,
        skillTags: ["statistics", "zero_dispersion", "mean_deviation"],
        choices: ["$0,0$", "$5,0$", "$0,5$", "$5,5$"],
        correctLetter: "A",
        rationales: {
          B: "The common observation is 5, but the spread is zero.",
          C: "Mean deviation is not the mean; every deviation from the mean is zero.",
          D: "This confuses the data value with dispersion.",
        },
        hints: ["All observations are identical.", "The highest and lowest observations are equal.", "Every deviation from the mean is zero."],
        solution: [{ step: 1, explanation: "There is no spread because every observation equals the mean.", math: "\\text{range}=0,\\quad \\text{M.D.}=0" }],
      },
      {
        questionLatex: L`\text{Assertion (A): Mean deviation cannot be negative. Reason (R): It is the average of absolute deviations.}`,
        difficulty: 3,
        skillTags: ["statistics", "assertion_reason", "mean_deviation"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The use of absolute deviations is exactly why the value cannot be negative.",
          C: "The reason is true: absolute deviations are non-negative.",
          D: "The assertion is true because an average of non-negative values is non-negative.",
        },
        hints: ["Recall the formula for mean deviation.", "Absolute values are never negative.", "Check whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "Mean deviation is computed from absolute deviations, so it is non-negative.", math: "\\text{M.D.}=\\frac{\\sum |x_i-\\bar{x}|}{n}\\ge0" }],
      },
      {
        questionLatex: L`\text{In the dot plots, which statement best compares the spread of the two data sets?}`,
        difficulty: 3,
        skillTags: ["statistics", "comparison", "dispersion"],
        figure: dispersionDotPlotFigure,
        choices: [
          "Data set B is more dispersed than data set A.",
          "Data set A is more dispersed than data set B.",
          "Both data sets must have zero dispersion.",
          "The graph gives no information about spread.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Data set A is clustered nearer the centre.",
          C: "Zero dispersion would mean all observations coincide.",
          D: "The horizontal spread of dots directly represents dispersion.",
        },
        hints: ["Compare distances from the centre line.", "A clustered set has smaller spread.", "The row with farther points is more dispersed."],
        solution: [{ step: 1, explanation: "The orange dots in B lie farther from the centre than the blue dots in A.", math: "\\text{spread of B} > \\text{spread of A}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the range of }9,14,11,17,13.`,
        difficulty: 2,
        skillTags: ["statistics", "range"],
        parts: singlePart("a", "Give the range.", 2),
        hints: ["Identify the largest observation.", "Identify the smallest observation.", "Subtract smallest from largest."],
        rubric: singleRubric("a", 2, "Finds the range $8$."),
        commonErrors: ["Subtracting adjacent values after sorting instead of using extremes."],
        workedSolution: [{ part: "a", explanation: "The largest observation is 17 and the smallest is 9, so the range is $17-9=8$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the mean deviation about the mean for }3,7,11.`,
        difficulty: 2,
        skillTags: ["statistics", "mean_deviation"],
        parts: singlePart("a", "Compute the mean deviation.", 2),
        hints: ["Find the mean first.", "Take absolute deviations.", "Average those deviations."],
        rubric: singleRubric("a", 2, "Finds mean deviation $\\frac83$."),
        commonErrors: ["Averaging signed deviations, which always sum to zero."],
        workedSolution: [{ part: "a", explanation: "The mean is 7. Absolute deviations are 4, 0, 4, so mean deviation is $\\frac{8}{3}$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Find the mean deviation about the mean for }4,6,8,10,12.`,
        difficulty: 3,
        skillTags: ["statistics", "mean_deviation", "ungrouped_data"],
        parts: singlePart("a", "Show the mean and absolute deviations.", 3),
        hints: ["The data are symmetric.", "Find the mean.", "Add absolute deviations and divide by 5."],
        rubric: singleRubric("a", 3, "Finds mean $8$ and mean deviation $\\frac{12}{5}$."),
        commonErrors: ["Dividing by 4 instead of 5.", "Using squared deviations instead of absolute deviations."],
        workedSolution: [{ part: "a", explanation: "Mean is 8. Absolute deviations are 4, 2, 0, 2, 4; hence mean deviation is $\\frac{12}{5}$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A small quality check records values }5,10,15\text{ with frequencies }2,2,2\text{ respectively.}`,
        difficulty: 4,
        skillTags: ["statistics", "mean_deviation", "frequency_distribution"],
        parts: [
          { letter: "a", promptMarkdown: "Find the mean of the distribution.", points: 2 },
          { letter: "b", promptMarkdown: "Find the mean deviation about the mean.", points: 2 },
          { letter: "c", promptMarkdown: "State what a mean deviation of zero would mean for a data set.", points: 1 },
        ],
        hints: ["Use $\\bar{x}=\\frac{\\sum f_ix_i}{\\sum f_i}$.", "Use $\\frac{\\sum f_i|x_i-\\bar{x}|}{\\sum f_i}$.", "Zero spread means every observation equals the centre."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds mean $10$." },
            { part: "b", points: 2, description: "Finds mean deviation $\\frac{10}{3}$." },
            { part: "c", points: 1, description: "States all observations would be equal to the mean." },
          ],
        },
        commonErrors: ["Ignoring frequencies.", "Using $\\sum |x_i-\\bar{x}|$ instead of $\\sum f_i|x_i-\\bar{x}|$."],
        workedSolution: [
          { part: "a", explanation: "$\\bar{x}=\\frac{2(5)+2(10)+2(15)}{6}=10$." },
          { part: "b", explanation: "Mean deviation is $\\frac{2|5-10|+2|10-10|+2|15-10|}{6}=\\frac{20}{6}=\\frac{10}{3}$." },
          { part: "c", explanation: "A zero mean deviation would mean every observation has zero distance from the mean." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A delivery office records five delivery times in minutes: }18,20,20,22,25.`,
        difficulty: 4,
        skillTags: ["statistics", "case_based", "mean_deviation"],
        parts: [
          { letter: "a", promptMarkdown: "Find the range of the delivery times.", points: 1 },
          { letter: "b", promptMarkdown: "Find the mean delivery time.", points: 1 },
          { letter: "c", promptMarkdown: "Find the mean deviation about the mean and interpret it briefly.", points: 2 },
        ],
        hints: ["Range uses only the two extreme observations.", "Mean uses all five times.", "Use absolute deviations from the mean."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds range $7$ minutes." },
            { part: "b", points: 1, description: "Finds mean $21$ minutes." },
            { part: "c", points: 2, description: "Finds mean deviation $2$ minutes and interprets average absolute departure from 21 minutes." },
          ],
        },
        commonErrors: ["Using signed deviations.", "Calling the range the mean deviation."],
        workedSolution: [
          { part: "a", explanation: "Range is $25-18=7$ minutes." },
          { part: "b", explanation: "Mean is $\\frac{18+20+20+22+25}{5}=21$ minutes." },
          { part: "c", explanation: "Absolute deviations from 21 are 3, 1, 1, 1, 4, so mean deviation is $\\frac{10}{5}=2$ minutes." },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Variance and Standard Deviation for Ungrouped Data",
    subtopic: "Variance, standard deviation, and consistency for finite ungrouped observations",
    mc: [
      {
        questionLatex: L`\text{For }2,4,6,\text{ the variance is}`,
        difficulty: 3,
        skillTags: ["statistics", "variance", "ungrouped_data"],
        choices: ["$\\frac83$", "$2$", "$\\sqrt{\\frac83}$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "This is not the average of squared deviations from the mean.",
          C: "This is the standard deviation, not the variance.",
          D: "The observations are not all equal, so variance is not zero.",
        },
        hints: ["Find the mean first.", "Square the deviations.", "Average the squared deviations."],
        solution: [{ step: 1, explanation: "The mean is 4 and squared deviations are 4, 0, 4.", math: "\\sigma^2=\\frac{4+0+4}{3}=\\frac83" }],
      },
      {
        questionLatex: L`\text{The standard deviation of }3,3,3,3\text{ is}`,
        difficulty: 2,
        skillTags: ["statistics", "standard_deviation", "zero_dispersion"],
        choices: ["$0$", "$3$", "$9$", "$1$"],
        correctLetter: "A",
        rationales: {
          B: "This is the common data value, not the spread.",
          C: "This is the square of the common data value, not variance.",
          D: "There is no departure from the mean, so spread is zero.",
        },
        hints: ["All observations are identical.", "Each deviation from the mean is zero.", "The square root of zero is zero."],
        solution: [{ step: 1, explanation: "All deviations from the mean are zero.", math: "\\sigma=0" }],
      },
      {
        questionLatex: L`\text{For }1,3,5,7,\text{ the standard deviation is}`,
        difficulty: 3,
        skillTags: ["statistics", "standard_deviation", "ungrouped_data"],
        figure: varianceBalanceFigure,
        choices: ["$\\sqrt5$", "$5$", "$4$", "$\\sqrt{20}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the variance, not the standard deviation.",
          C: "This is the mean, not the spread.",
          D: "This uses the sum of squared deviations without dividing by 4.",
        },
        hints: ["Find the mean.", "Average the squared deviations.", "Take the square root for standard deviation."],
        solution: [{ step: 1, explanation: "Mean is 4; squared deviations are 9, 1, 1, 9.", math: "\\sigma^2=\\frac{20}{4}=5,\\quad \\sigma=\\sqrt5" }],
      },
      {
        questionLatex: L`\text{Using }\sigma^2=\frac{\sum x_i^2}{n}-\bar{x}^2,\text{ the variance of }2,3,5\text{ is}`,
        difficulty: 3,
        skillTags: ["statistics", "variance", "shortcut_formula"],
        choices: ["$\\frac{14}{9}$", "$\\frac{10}{3}$", "$\\frac{38}{3}$", "$\\frac{14}{3}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the mean, not the variance.",
          C: "This is the mean of squares before subtracting $\\bar{x}^2$.",
          D: "This subtracts or divides incorrectly after using the shortcut formula.",
        },
        hints: ["Find $\\bar{x}$.", "Find the mean of $x_i^2$.", "Subtract $\\bar{x}^2$."],
        solution: [{ step: 1, explanation: "Here $\\bar{x}=\\frac{10}{3}$ and $\\frac{\\sum x_i^2}{n}=\\frac{38}{3}$.", math: "\\sigma^2=\\frac{38}{3}-\\frac{100}{9}=\\frac{14}{9}" }],
      },
      {
        questionLatex: L`\text{Assertion (A): Adding }5\text{ to every observation does not change the standard deviation. Reason (R): Every deviation from the new mean remains the same as before.}`,
        difficulty: 3,
        skillTags: ["statistics", "assertion_reason", "standard_deviation"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The unchanged deviations are exactly why variance and standard deviation remain unchanged.",
          C: "If each observation and the mean both increase by 5, each deviation is unchanged.",
          D: "The assertion is true for adding a common constant.",
        },
        hints: ["Track what happens to the mean.", "Compare $x_i-\\bar{x}$ before and after adding 5.", "Standard deviation depends on deviations from the mean."],
        solution: [{ step: 1, explanation: "If $y_i=x_i+5$, then $\\bar{y}=\\bar{x}+5$ and $y_i-\\bar{y}=x_i-\\bar{x}$.", math: "\\sigma_y=\\sigma_x" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the variance of }4,4,4.`,
        difficulty: 2,
        skillTags: ["statistics", "variance"],
        parts: singlePart("a", "Give the variance.", 2),
        hints: ["Find the mean.", "Find each deviation.", "Square and average the deviations."],
        rubric: singleRubric("a", 2, "Finds variance $0$."),
        commonErrors: ["Writing the variance as 4 because the observations are 4."],
        workedSolution: [{ part: "a", explanation: "The mean is 4 and every deviation is 0, so the variance is 0." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the standard deviation of }3,5.`,
        difficulty: 2,
        skillTags: ["statistics", "standard_deviation"],
        parts: singlePart("a", "Give the standard deviation.", 2),
        hints: ["Find the mean.", "Find squared deviations.", "Take the square root of variance."],
        rubric: singleRubric("a", 2, "Finds standard deviation $1$."),
        commonErrors: ["Leaving the answer as the variance without square-rooting."],
        workedSolution: [{ part: "a", explanation: "Mean is 4. Squared deviations are 1 and 1, so variance is 1 and standard deviation is 1." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Find the variance and standard deviation of }6,8,10.`,
        difficulty: 3,
        skillTags: ["statistics", "variance", "standard_deviation"],
        parts: singlePart("a", "Show the mean, variance, and standard deviation.", 3),
        hints: ["The mean is the middle value.", "Use squared deviations from the mean.", "Standard deviation is the square root of variance."],
        rubric: singleRubric("a", 3, "Finds variance $\\frac83$ and standard deviation $\\sqrt{\\frac83}$."),
        commonErrors: ["Using absolute deviations instead of squared deviations.", "Forgetting to divide by 3."],
        workedSolution: [{ part: "a", explanation: "Mean is 8. Squared deviations are 4, 0, 4. Hence variance is $\\frac83$ and standard deviation is $\\sqrt{\\frac83}$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{Two machines produce sample lengths. Machine A gives }9,10,11\text{ cm and Machine B gives }7,10,13\text{ cm.}`,
        difficulty: 4,
        skillTags: ["statistics", "variance", "comparison"],
        parts: [
          { letter: "a", promptMarkdown: "Find the mean length for each machine.", points: 1 },
          { letter: "b", promptMarkdown: "Find the variance for each machine.", points: 2 },
          { letter: "c", promptMarkdown: "Which machine is more consistent? Give a reason.", points: 2 },
        ],
        hints: ["Both samples are centred at 10.", "Compare squared deviations from 10.", "Smaller variance means more consistency."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds both means as $10$ cm." },
            { part: "b", points: 2, description: "Finds variances $\\frac23$ and $6$." },
            { part: "c", points: 2, description: "Chooses Machine A because its variance is smaller." },
          ],
        },
        commonErrors: ["Choosing the machine with larger variance as more consistent.", "Comparing only one extreme observation."],
        workedSolution: [
          { part: "a", explanation: "Both means are $10$ cm." },
          { part: "b", explanation: "Machine A variance is $\\frac{1+0+1}{3}=\\frac23$. Machine B variance is $\\frac{9+0+9}{3}=6$." },
          { part: "c", explanation: "Machine A is more consistent because its observations are less spread out around the same mean." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{The observations }12,14,16,18\text{ are each increased by }10.`,
        difficulty: 4,
        skillTags: ["statistics", "case_based", "standard_deviation", "shift"],
        parts: [
          { letter: "a", promptMarkdown: "Find the mean of the original readings.", points: 1 },
          { letter: "b", promptMarkdown: "Find the variance of the original readings.", points: 2 },
          { letter: "c", promptMarkdown: "State the variance of the recalibrated readings and justify it.", points: 1 },
        ],
        hints: ["Find deviations from the original mean.", "Average squared deviations.", "Adding a constant shifts the mean but not deviations."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds mean $15$." },
            { part: "b", points: 2, description: "Finds variance $5$." },
            { part: "c", points: 1, description: "States recalibrated variance is also $5$ with correct reason." },
          ],
        },
        commonErrors: ["Adding 10 to the variance.", "Using the new mean with old observations."],
        workedSolution: [
          { part: "a", explanation: "Mean is $\\frac{12+14+16+18}{4}=15$." },
          { part: "b", explanation: "Squared deviations are 9, 1, 1, 9, so variance is $\\frac{20}{4}=5$." },
          { part: "c", explanation: "The recalibrated variance is also 5 because adding 10 to every reading does not change deviations from the mean." },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Grouped Data and Comparing Dispersion",
    subtopic: "Frequency distributions, class marks, and spread comparisons",
    mc: [
      {
        questionLatex: L`\text{For the distribution }x_i:10,20,30\text{ with frequencies }1,2,1,\text{ the variance is}`,
        difficulty: 3,
        skillTags: ["statistics", "grouped_data", "variance"],
        choices: ["$50$", "$20$", "$5\\sqrt2$", "$100$"],
        correctLetter: "A",
        rationales: {
          B: "This is the mean, not the variance.",
          C: "This is the standard deviation, not the variance.",
          D: "This is the sum of squared deviations before dividing by total frequency.",
        },
        hints: ["Find the weighted mean.", "Use frequencies with squared deviations.", "Divide by total frequency."],
        solution: [{ step: 1, explanation: "The mean is 20. Weighted squared deviations are $1(100)+2(0)+1(100)=200$ and total frequency is 4.", math: "\\sigma^2=\\frac{200}{4}=50" }],
      },
      {
        questionLatex: L`\text{For the class interval }20\text{-}30,\text{ the class mark is}`,
        difficulty: 2,
        skillTags: ["statistics", "grouped_data", "class_mark"],
        choices: ["$25$", "$20$", "$30$", "$10$"],
        correctLetter: "A",
        rationales: {
          B: "This is the lower limit, not the midpoint.",
          C: "This is the upper limit, not the midpoint.",
          D: "This is the class width, not the class mark.",
        },
        hints: ["Class mark is the midpoint of the interval.", "Average the two limits.", "Compute $\\frac{20+30}{2}$."],
        solution: [{ step: 1, explanation: "Class mark is the midpoint.", math: "\\frac{20+30}{2}=25" }],
      },
      {
        questionLatex: L`\text{Using class marks, the grouped distribution }0\text{-}10,10\text{-}20,20\text{-}30\text{ with frequencies }1,2,1\text{ has approximate variance}`,
        difficulty: 4,
        skillTags: ["statistics", "grouped_data", "variance"],
        figure: groupedHistogramFigure,
        choices: ["$50$", "$15$", "$25$", "$\\sqrt{50}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the mean based on class marks, not the approximate variance.",
          C: "This uses half the correct squared spread.",
          D: "This is the standard deviation, not the variance.",
        },
        hints: ["Use class marks 5, 15, 25 as representatives of the classes.", "The weighted mean is 15.", "Average weighted squared deviations from 15."],
        solution: [{ step: 1, explanation: "Using class marks as representative values, the class marks are 5, 15, 25 and the mean is 15.", math: "\\sigma^2\\approx\\frac{1(100)+2(0)+1(100)}{4}=50" }],
      },
      {
        questionLatex: L`\text{Assertion (A): If two distributions have the same mean, the one with smaller standard deviation is more consistent. Reason (R): Standard deviation measures spread about the mean.}`,
        difficulty: 3,
        skillTags: ["statistics", "assertion_reason", "comparison"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The measure of spread about the mean is exactly why smaller standard deviation means greater consistency.",
          C: "The reason correctly describes standard deviation.",
          D: "The assertion is true when consistency is judged by smaller spread.",
        },
        hints: ["Consistency means less variation around the centre.", "Standard deviation is a spread measure.", "Check whether the reason supports the assertion."],
        solution: [{ step: 1, explanation: "For equal means, the distribution with smaller spread around the mean is more consistent.", math: "\\sigma_{\\text{smaller}}\\Rightarrow \\text{more consistent}" }],
      },
      {
        questionLatex: L`\text{Two sections have equal mean marks. Section P has variance }9\text{ and Section Q has variance }16.\text{ Which statement is correct?}`,
        difficulty: 3,
        skillTags: ["statistics", "variance", "comparison"],
        choices: [
          "Section P is more consistent.",
          "Section Q is more consistent.",
          "Both sections have equal spread because their means are equal.",
          "Variance cannot be used to compare spread.",
        ],
        correctLetter: "A",
        rationales: {
          B: "A larger variance means greater spread, not greater consistency.",
          C: "Equal means do not imply equal dispersion.",
          D: "Variance is specifically a measure of dispersion.",
        },
        hints: ["Compare the variances.", "Smaller variance means observations are closer to the mean.", "The means being equal makes the spread comparison direct."],
        solution: [{ step: 1, explanation: "Section P has the smaller variance.", math: "9<16" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the class mark of }40\text{-}50.`,
        difficulty: 2,
        skillTags: ["statistics", "class_mark", "grouped_data"],
        parts: singlePart("a", "Give the class mark.", 2),
        hints: ["Use the midpoint of the interval.", "Add the two limits.", "Divide by 2."],
        rubric: singleRubric("a", 2, "Finds class mark $45$."),
        commonErrors: ["Writing the class width $10$ instead of the class mark."],
        workedSolution: [{ part: "a", explanation: "Class mark is $\\frac{40+50}{2}=45$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{For frequencies }3,5,4,2,\text{ find the total frequency.}`,
        difficulty: 2,
        skillTags: ["statistics", "frequency_distribution"],
        parts: singlePart("a", "Give the total frequency.", 2),
        hints: ["Total frequency is the sum of all frequencies.", "Add the four given numbers.", "Do not average them."],
        rubric: singleRubric("a", 2, "Finds total frequency $14$."),
        commonErrors: ["Dividing by the number of classes."],
        workedSolution: [{ part: "a", explanation: "Total frequency is $3+5+4+2=14$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{For }x_i:2,4,6\text{ with frequencies }1,2,1,\text{ find the mean and variance.}`,
        difficulty: 3,
        skillTags: ["statistics", "frequency_distribution", "variance"],
        parts: singlePart("a", "Compute the weighted mean and variance.", 3),
        hints: ["Use frequencies in the mean.", "Find deviations from the weighted mean.", "Use frequencies again in variance."],
        rubric: singleRubric("a", 3, "Finds mean $4$ and variance $2$."),
        commonErrors: ["Ignoring frequencies and treating the three values equally.", "Forgetting to divide by total frequency."],
        workedSolution: [{ part: "a", explanation: "Mean is $\\frac{1(2)+2(4)+1(6)}{4}=4$. Variance is $\\frac{1(4)+2(0)+1(4)}{4}=2$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A grouped table has class intervals }0\text{-}10,10\text{-}20,20\text{-}30\text{ with frequencies }1,2,1.`,
        difficulty: 4,
        skillTags: ["statistics", "grouped_data", "standard_deviation"],
        parts: [
          { letter: "a", promptMarkdown: "Write the class marks.", points: 1 },
          { letter: "b", promptMarkdown: "Find the mean using class marks.", points: 1 },
          { letter: "c", promptMarkdown: "Find the approximate variance and standard deviation using class marks.", points: 3 },
        ],
        hints: ["Use midpoints of classes.", "Apply the weighted mean formula.", "Use weighted squared deviations."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds class marks $5,15,25$." },
            { part: "b", points: 1, description: "Finds mean $15$." },
            { part: "c", points: 3, description: "Finds approximate variance $50$ and approximate standard deviation $5\\sqrt2$ using class marks." },
          ],
        },
        commonErrors: ["Using class limits instead of class marks.", "Using simple average instead of weighted average."],
        workedSolution: [
          { part: "a", explanation: "Class marks are 5, 15, and 25." },
          { part: "b", explanation: "Mean is $\\frac{1(5)+2(15)+1(25)}{4}=15$." },
          { part: "c", explanation: "Using class marks as representative values, approximate variance is $\\frac{1(100)+2(0)+1(100)}{4}=50$, so approximate standard deviation is $\\sqrt{50}=5\\sqrt2$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{Two sections have marks distributed around }50.\text{ Section A has scores }40,50,60\text{ with frequencies }5,10,5.\text{ Section B has scores }30,50,70\text{ with frequencies }5,10,5.`,
        difficulty: 4,
        skillTags: ["statistics", "case_based", "comparison", "variance"],
        parts: [
          { letter: "a", promptMarkdown: "Show that both sections have mean $50$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the variance of each section.", points: 2 },
          { letter: "c", promptMarkdown: "Which section has marks more concentrated near the mean?", points: 1 },
        ],
        hints: ["Use weighted means.", "The deviations in Section B are twice as large at the extremes.", "Compare variances."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Shows both means are $50$." },
            { part: "b", points: 2, description: "Finds variances $50$ and $200$." },
            { part: "c", points: 1, description: "Chooses Section A." },
          ],
        },
        commonErrors: ["Saying equal means imply equal consistency.", "Ignoring frequencies of the middle score."],
        workedSolution: [
          { part: "a", explanation: "Both distributions are symmetric around 50 with total frequency 20, so both means are 50." },
          { part: "b", explanation: "Section A variance is $\\frac{5(100)+10(0)+5(100)}{20}=50$. Section B variance is $\\frac{5(400)+10(0)+5(400)}{20}=200$." },
          { part: "c", explanation: "Section A is more concentrated near the mean because it has smaller variance." },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Events and Set Operations in Probability",
    subtopic: "Not, and, or, exhaustive and mutually exclusive events using given finite sets",
    mc: [
      {
        questionLatex: L`\text{If }P(A)=0.35,\text{ then }P(\text{not }A)\text{ is}`,
        difficulty: 2,
        skillTags: ["probability", "complement", "event_operations"],
        choices: ["$0.65$", "$0.35$", "$1.35$", "$0$"],
        correctLetter: "A",
        rationales: {
          B: "An event and its complement do not generally have equal probability.",
          C: "Complement probability is subtracted from 1, not added to 1.",
          D: "The complement is not impossible unless $P(A)=1$.",
        },
        hints: ["Use the complement rule.", "The probabilities of an event and its complement sum to 1.", "Compute $1-0.35$."],
        solution: [{ step: 1, explanation: "Use $P(A')=1-P(A)$.", math: "P(A')=1-0.35=0.65" }],
      },
      {
        questionLatex: L`\text{If }P(A)=0.6,\ P(B)=0.5,\ P(A\cap B)=0.2,\text{ then }P(A\cup B)\text{ is}`,
        difficulty: 3,
        skillTags: ["probability", "union", "intersection"],
        choices: ["$0.9$", "$1.1$", "$0.3$", "$0.2$"],
        correctLetter: "A",
        rationales: {
          B: "This adds $P(A)$ and $P(B)$ but double-counts their overlap.",
          C: "This subtracts the overlap from only one event probability.",
          D: "This is the probability of both events, not at least one event.",
        },
        hints: ["Use the addition rule for two events.", "Subtract the intersection once.", "Compute $0.6+0.5-0.2$."],
        solution: [{ step: 1, explanation: "Use $P(A\\cup B)=P(A)+P(B)-P(A\\cap B)$.", math: "0.6+0.5-0.2=0.9" }],
      },
      {
        questionLatex: L`\text{Two events }A\text{ and }B\text{ are mutually exclusive when}`,
        difficulty: 2,
        skillTags: ["probability", "mutually_exclusive_events", "event_operations"],
        choices: ["$A\\cap B=\\varnothing$", "$A\\cup B=\\varnothing$", "$A=B$", "$A'=B$"],
        correctLetter: "A",
        rationales: {
          B: "The union being empty would mean both events are empty, which is stronger than mutual exclusiveness.",
          C: "Equal non-empty events overlap completely, so they are not mutually exclusive.",
          D: "Complements can be related without the events being mutually exclusive in this definition.",
        },
        hints: ["Mutually exclusive events cannot occur together.", "Translate 'together' into intersection.", "The common part must be empty."],
        solution: [{ step: 1, explanation: "Mutually exclusive events have no common elements.", math: "A\\cap B=\\varnothing" }],
      },
      {
        questionLatex: L`\text{Events }A\text{ and }B\text{ are exhaustive in a given finite set }U\text{ when}`,
        difficulty: 3,
        skillTags: ["probability", "exhaustive_events", "event_operations"],
        choices: ["$A\\cup B=U$", "$A\\cap B=U$", "$A\\cap B=\\varnothing$", "$A=B'=U$"],
        correctLetter: "A",
        rationales: {
          B: "Intersection equal to $U$ would require both events to contain every element of $U$.",
          C: "Empty intersection describes mutual exclusiveness, not exhaustiveness.",
          D: "This is not the definition of exhaustive events.",
        },
        hints: ["Exhaustive events cover every element in the given set.", "Coverage is represented by union.", "Set the union equal to the whole set $U$."],
        solution: [{ step: 1, explanation: "Exhaustive events cover the whole given set.", math: "A\\cup B=U" }],
      },
      {
        questionLatex: L`\text{Assertion (A): If }A\text{ and }B\text{ are mutually exclusive, then }P(A\cap B)=0.\text{ Reason (R): Mutually exclusive events have no common elements.}`,
        difficulty: 3,
        skillTags: ["probability", "assertion_reason", "mutually_exclusive_events"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Having no common elements is exactly why the intersection has probability zero.",
          C: "The reason is the definition of mutually exclusive events.",
          D: "The assertion follows directly from the definition.",
        },
        hints: ["Mutually exclusive means no overlap.", "The intersection contains common elements.", "An empty event has probability zero."],
        solution: [{ step: 1, explanation: "Since $A\\cap B$ is empty, its probability is zero.", math: "P(A\\cap B)=0" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{If }P(A)=0.72,\text{ find }P(\text{not }A).`,
        difficulty: 2,
        skillTags: ["probability", "complement"],
        parts: singlePart("a", "Find the complement probability.", 2),
        hints: ["Use $P(A')=1-P(A)$.", "Substitute 0.72.", "Subtract from 1."],
        rubric: singleRubric("a", 2, "Finds $0.28$."),
        commonErrors: ["Adding to 1 instead of subtracting from 1."],
        workedSolution: [{ part: "a", explanation: "$P(A')=1-0.72=0.28$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Events }A\text{ and }B\text{ are mutually exclusive with }P(A)=\frac14\text{ and }P(B)=\frac13.\text{ Find }P(A\cup B).`,
        difficulty: 2,
        skillTags: ["probability", "mutually_exclusive_events", "union"],
        parts: singlePart("a", "Find the union probability.", 2),
        hints: ["For mutually exclusive events, the intersection probability is zero.", "Add the event probabilities.", "Find a common denominator."],
        rubric: singleRubric("a", 2, "Finds $\\frac{7}{12}$."),
        commonErrors: ["Multiplying the probabilities.", "Subtracting one probability from the other."],
        workedSolution: [{ part: "a", explanation: "Since the events are mutually exclusive, $P(A\\cup B)=P(A)+P(B)=\\frac14+\\frac13=\\frac{7}{12}$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{In the equally likely set }U=\{1,2,\dots,10\},\ A\text{ is the event of an even number and }B\text{ is the event of a multiple of }3.`,
        difficulty: 3,
        skillTags: ["probability", "event_operations", "finite_set"],
        parts: [
          { letter: "a", promptMarkdown: "List $A\\cap B$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $P(A\\cup B)$.", points: 2 },
        ],
        hints: ["List even numbers and multiples of 3 inside $U$.", "The intersection has numbers satisfying both conditions.", "Use the number of elements in the union over 10."],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $A\\cap B=\\{6\\}$." },
            { part: "b", points: 2, description: "Finds $P(A\\cup B)=\\frac{7}{10}$." },
          ],
        },
        commonErrors: ["Counting 12 as a multiple of 3 even though it is outside $U$.", "Double-counting 6 in the union."],
        workedSolution: [
          { part: "a", explanation: "$A=\\{2,4,6,8,10\\}$ and $B=\\{3,6,9\\}$, so $A\\cap B=\\{6\\}$." },
          { part: "b", explanation: "$A\\cup B=\\{2,3,4,6,8,9,10\\}$, so $P(A\\cup B)=\\frac{7}{10}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{In a group of }50\text{ students, }28\text{ study Hindi, }18\text{ study French, and }10\text{ study both.}`,
        difficulty: 4,
        skillTags: ["probability", "union", "complement", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Find the number of students studying at least one of the two languages.", points: 2 },
          { letter: "b", promptMarkdown: "Find the probability that a randomly selected student studies neither language.", points: 2 },
          { letter: "c", promptMarkdown: "Find the probability that a randomly selected student studies exactly one of the two languages.", points: 1 },
        ],
        hints: ["Use inclusion-exclusion for at least one.", "Neither is the complement of at least one.", "Exactly one excludes the overlap from both language counts."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $36$ students." },
            { part: "b", points: 2, description: "Finds $\\frac{14}{50}=\\frac{7}{25}$." },
            { part: "c", points: 1, description: "Finds $\\frac{26}{50}=\\frac{13}{25}$." },
          ],
        },
        commonErrors: ["Adding 28 and 18 without subtracting the 10 who study both.", "Using both as exactly one."],
        workedSolution: [
          { part: "a", explanation: "At least one language: $28+18-10=36$." },
          { part: "b", explanation: "Neither language: $50-36=14$, so the probability is $\\frac{14}{50}=\\frac{7}{25}$." },
          { part: "c", explanation: "Exactly one language: $(28-10)+(18-10)=26$, so the probability is $\\frac{13}{25}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{Numbers from }1\text{ to }30\text{ are equally likely. Let }A\text{ be the event of a multiple of }2\text{ and }B\text{ the event of a multiple of }5.`,
        difficulty: 4,
        skillTags: ["probability", "case_based", "union", "intersection"],
        figure: eventVennFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the number of elements in $A\\cap B$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $P(A\\cup B)$.", points: 2 },
          { letter: "c", promptMarkdown: "Are $A$ and $B$ mutually exclusive? Justify.", points: 1 },
        ],
        hints: ["A number in both events is a multiple of 10.", "Count multiples of 2 and 5, then subtract the overlap.", "Mutually exclusive events have empty intersection."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $3$ common elements: $10,20,30$." },
            { part: "b", points: 2, description: "Finds $P(A\\cup B)=\\frac{18}{30}=\\frac35$." },
            { part: "c", points: 1, description: "States not mutually exclusive because common elements exist." },
          ],
        },
        commonErrors: ["Adding counts without subtracting multiples of 10.", "Saying events are mutually exclusive because 2 and 5 are different numbers."],
        workedSolution: [
          { part: "a", explanation: "Common elements are multiples of 10: $10,20,30$, so there are 3." },
          { part: "b", explanation: "There are 15 multiples of 2 and 6 multiples of 5. Union count is $15+6-3=18$, so $P(A\\cup B)=\\frac{18}{30}=\\frac35$." },
          { part: "c", explanation: "They are not mutually exclusive because $A\\cap B$ is not empty." },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Axiomatic Probability and Event Bounds",
    subtopic: "Valid probability assignments, event containment, bounds, and exhaustive partitions",
    mc: [
      {
        questionLatex: L`\text{If }A\subseteq B\text{ and }P(A)=0.42,\text{ which value is impossible for }P(B)?`,
        difficulty: 3,
        skillTags: ["probability", "axiomatic_probability", "event_containment"],
        choices: ["$0.30$", "$0.42$", "$0.60$", "$1$"],
        correctLetter: "A",
        rationales: {
          B: "If $A\\subseteq B$, equal probability is possible when the extra part of $B$ has probability zero.",
          C: "A larger containing event probability is possible.",
          D: "A containing event may be the whole set, with probability 1.",
        },
        hints: ["Containment means every element of $A$ is already in $B$.", "A containing event cannot be less likely than the contained event.", "Compare each option with $0.42$."],
        solution: [{ step: 1, explanation: "Probability is monotonic: if $A\\subseteq B$, then $P(A)\\le P(B)$.", math: "P(B)\\ge0.42" }],
      },
      {
        questionLatex: L`\text{If }P(A\cup B)=0.8,\ P(A)=0.5,\ P(B)=0.45,\text{ then }P(A\cap B)=`,
        difficulty: 3,
        skillTags: ["probability", "addition_rule", "intersection"],
        choices: ["$0.15$", "$0.95$", "$0.25$", "$0.35$"],
        correctLetter: "A",
        rationales: {
          B: "This adds $P(A)$ and $P(B)$ without using the union value.",
          C: "This subtracts $P(A)$ from the union only.",
          D: "This subtracts $P(B)$ from the union only.",
        },
        hints: ["Start from the addition rule.", "Rearrange to solve for the intersection.", "Compute $0.5+0.45-0.8$."],
        solution: [{ step: 1, explanation: "From $P(A\\cup B)=P(A)+P(B)-P(A\\cap B)$.", math: "P(A\\cap B)=0.5+0.45-0.8=0.15" }],
      },
      {
        questionLatex: L`\text{Three mutually exclusive and exhaustive events have probabilities }p,2p,3p.\text{ Then }p=`,
        difficulty: 3,
        skillTags: ["probability", "exhaustive_events", "axiomatic_probability"],
        choices: ["$\\frac16$", "$\\frac13$", "$1$", "$\\frac12$"],
        correctLetter: "A",
        rationales: {
          B: "This ignores that the three probabilities add to $6p$, not $3p$.",
          C: "A probability of $p=1$ would make the total probability exceed 1.",
          D: "This makes the total $3$, not $1$.",
        },
        hints: ["Exhaustive mutually exclusive event probabilities add to 1.", "Add $p+2p+3p$.", "Solve $6p=1$."],
        solution: [{ step: 1, explanation: "The probabilities must sum to 1.", math: "p+2p+3p=1\\Rightarrow p=\\frac16" }],
      },
      {
        questionLatex: L`\text{Which assignment cannot be probabilities of three mutually exclusive exhaustive events?}`,
        difficulty: 3,
        skillTags: ["probability", "axioms", "exhaustive_events"],
        choices: ["$0.4,0.4,0.3$", "$0.2,0.3,0.5$", "$0,0.6,0.4$", "$\\frac14,\\frac14,\\frac12$"],
        correctLetter: "A",
        rationales: {
          B: "These values are each in $[0,1]$ and sum to 1.",
          C: "An event may have probability 0, and the total here is 1.",
          D: "These fractions are non-negative and sum to 1.",
        },
        hints: ["A probability must lie between 0 and 1.", "For exhaustive mutually exclusive events, probabilities must sum to 1.", "Check the totals."],
        solution: [{ step: 1, explanation: "The first assignment sums to $1.1$, which violates total probability 1 for exhaustive mutually exclusive events.", math: "0.4+0.4+0.3=1.1" }],
      },
      {
        questionLatex: L`\text{Assertion (A): For any two events }A,B,\ P(A\cup B)=P(A)+P(B).\text{ Reason (R): In general, elements in }A\cap B\text{ are counted twice when }P(A)\text{ and }P(B)\text{ are added.}`,
        difficulty: 4,
        skillTags: ["probability", "assertion_reason", "addition_rule"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The assertion is not true for overlapping events; the intersection must be subtracted.",
          B: "The assertion is false, so this option cannot be correct.",
          C: "The reason is true: overlap is double-counted in the sum.",
        },
        hints: ["Recall the general addition rule.", "Check whether the assertion says 'any' events.", "Think about overlapping events."],
        solution: [{ step: 1, explanation: "The general rule is $P(A\\cup B)=P(A)+P(B)-P(A\\cap B)$, so the assertion is false unless the events are mutually exclusive. The reason is true.", math: "\\text{A false, R true}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{If }P(A)=0.46\text{ and }P(B)=0.38,\text{ what is the greatest possible value of }P(A\cap B)?`,
        difficulty: 2,
        skillTags: ["probability", "event_bounds", "intersection"],
        parts: singlePart("a", "Give the greatest possible value.", 2),
        hints: ["An intersection is contained in each event.", "So $P(A\\cap B)$ cannot exceed either $P(A)$ or $P(B)$.", "Use the smaller of the two event probabilities."],
        rubric: singleRubric("a", 2, "Finds greatest possible value $0.38$."),
        commonErrors: ["Adding the two probabilities even though an intersection cannot exceed either event."],
        workedSolution: [{ part: "a", explanation: "Since $A\\cap B\\subseteq A$ and $A\\cap B\\subseteq B$, the intersection probability is at most the smaller event probability. The greatest possible value is $0.38$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Three mutually exclusive exhaustive events have probabilities }0.2,0.3\text{ and }p.\text{ Find }p.`,
        difficulty: 2,
        skillTags: ["probability", "exhaustive_events"],
        parts: singlePart("a", "Find the missing probability.", 2),
        hints: ["For exhaustive mutually exclusive events, probabilities add to 1.", "Add the two known probabilities.", "Subtract from 1."],
        rubric: singleRubric("a", 2, "Finds $p=0.5$."),
        commonErrors: ["Adding all probabilities to get more than 1."],
        workedSolution: [{ part: "a", explanation: "$0.2+0.3+p=1$, so $p=0.5$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{If }P(A)=0.55,\ P(B)=0.48,\text{ and }P(A\cup B)=0.73,\text{ find }P(A\cap B)\text{ and }P(A\setminus B).`,
        difficulty: 3,
        skillTags: ["probability", "addition_rule", "intersection", "difference_of_events"],
        parts: singlePart("a", "Compute both probabilities.", 3),
        hints: ["Rearrange the addition rule to find the intersection.", "$A\\setminus B$ means elements in $A$ but not in $B$.", "Subtract the intersection from $P(A)$."],
        rubric: singleRubric("a", 3, "Finds $P(A\\cap B)=0.30$ and $P(A\\setminus B)=0.25$."),
        commonErrors: ["Using $P(A\\cup B)$ as the intersection.", "Forgetting to remove the overlap when finding $A\\setminus B$."],
        workedSolution: [{ part: "a", explanation: "From $P(A\\cup B)=P(A)+P(B)-P(A\\cap B)$, $P(A\\cap B)=0.55+0.48-0.73=0.30$. Hence $P(A\\setminus B)=0.55-0.30=0.25$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{Two events }A\text{ and }B\text{ have }P(A)=0.70\text{ and }P(B)=0.60.`,
        difficulty: 4,
        skillTags: ["probability", "event_bounds", "addition_rule", "axiomatic_probability"],
        parts: [
          { letter: "a", promptMarkdown: "Explain why $A$ and $B$ cannot be mutually exclusive.", points: 1 },
          { letter: "b", promptMarkdown: "Find the least possible value of $P(A\\cap B)$.", points: 2 },
          { letter: "c", promptMarkdown: "Find the greatest possible value of $P(A\\cap B)$.", points: 2 },
        ],
        hints: ["If they were mutually exclusive, $P(A\\cup B)$ would be $P(A)+P(B)$.", "A union probability cannot exceed 1.", "An intersection cannot exceed the smaller event probability."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Explains that $0.70+0.60>1$, so zero overlap is impossible." },
            { part: "b", points: 2, description: "Finds least possible intersection $0.30$." },
            { part: "c", points: 2, description: "Finds greatest possible intersection $0.60$." },
          ],
        },
        commonErrors: ["Assuming the least possible intersection is always zero.", "Letting the intersection exceed the probability of one of the events."],
        workedSolution: [
          { part: "a", explanation: "If $A$ and $B$ were mutually exclusive, $P(A\\cup B)=0.70+0.60=1.30$, impossible because probabilities cannot exceed 1." },
          { part: "b", explanation: "Since $P(A\\cup B)\\le1$, $P(A\\cap B)=P(A)+P(B)-P(A\\cup B)\\ge1.30-1=0.30$." },
          { part: "c", explanation: "The intersection cannot be larger than either event, so its greatest possible value is $\\min(0.70,0.60)=0.60$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A system status is always exactly one of four states }R,S,T,U.\text{ The diagram gives their probabilities.}`,
        difficulty: 4,
        skillTags: ["probability", "case_based", "exhaustive_events", "axiomatic_probability"],
        figure: partitionProbabilityFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find $p$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $P(S\\cup T)$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the probability that the state is not $U$ and justify using the partition.", points: 2 },
        ],
        hints: ["The four regions are mutually exclusive and exhaustive.", "Add the four probabilities and set the sum to 1.", "Not $U$ means the union of the other three regions."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $p=0.175$ or $\\frac{7}{40}$." },
            { part: "b", points: 1, description: "Finds $P(S\\cup T)=0.625$ or $\\frac58$." },
            { part: "c", points: 2, description: "Finds $0.8$ and explains it as the complement of $U$ or as $R\\cup S\\cup T$." },
          ],
        },
        commonErrors: ["Forgetting the fixed $0.2$ region when solving for $p$.", "Adding $S$ and $T$ without substituting the value of $p$."],
        workedSolution: [
          { part: "a", explanation: "Since the four states are mutually exclusive and exhaustive, $p+2p+(p+0.1)+0.2=1$. Thus $4p=0.7$ and $p=0.175=\\frac{7}{40}$." },
          { part: "b", explanation: "$P(S\\cup T)=2p+(p+0.1)=3p+0.1=0.625=\\frac58$." },
          { part: "c", explanation: "Not $U$ has probability $1-0.2=0.8$. Equivalently, it is $R\\cup S\\cup T$ in the partition." },
        ],
      },
    ],
  },
];

export const statisticsProbabilityTopics: Topic[] = topicSeeds.map(makeTopic);
