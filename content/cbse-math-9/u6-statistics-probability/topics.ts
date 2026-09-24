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

const COURSE = "cbse-math-9";
const UNIT = "u6-statistics-probability";
const VERSION = "0.1.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type McSolutionSeed = Omit<SolutionStep, "step"> & { step?: number };
type FrqSolutionSeed = FrqSolutionPart & { math?: string };

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
  solution: readonly McSolutionSeed[];
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
  workedSolution: readonly FrqSolutionSeed[];
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the data total, graph scale, average definition, or sample-space count before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_statistics_probability_reasoning"),
    };
  });

  const topicIndex = Number(meta.topicCode.split(".")[1]) - 1;
  const topicOffsets: readonly number[] = [2, 0, 3, 2, 0];
  const rotation = (index + (topicOffsets[topicIndex] ?? 0)) % LETTERS.length;
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
  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "reads_a_graph_or_probability_statement_without_checking_the_total",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      ...step,
      step: step.step ?? stepIndex + 1,
    })),
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
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_numerical_answer_without_explaining_the_data_or_sample_space",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: [...seed.parts],
    hintLadder: hints(seed.hints),
    rubric: seed.rubric,
    commonErrors: [...seed.commonErrors],
    workedSolution: seed.workedSolution.map(({ math, ...part }) => ({
      ...part,
      explanation: math ? `${part.explanation}\n\n$${math}$` : part.explanation,
    })),
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

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const stackedBarFigure: ItemFigure = {
  type: "svg",
  title: "Club participation by section",
  description:
    "A stacked bar graph compares club choices in Sections A and B: sports, arts, and science.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="180" y="36" font-size="18" font-weight="700">Club choices by section</text>
    <text x="70" y="324" font-size="14">Section A</text>
    <text x="70" y="364" font-size="14">Section B</text>
  </g>
  <g stroke="#cbd5e1" stroke-width="1">
    <line x1="150" y1="300" x2="550" y2="300"/>
    <line x1="150" y1="340" x2="550" y2="340"/>
    <line x1="150" y1="285" x2="150" y2="355"/>
    <line x1="250" y1="285" x2="250" y2="355"/>
    <line x1="350" y1="285" x2="350" y2="355"/>
    <line x1="450" y1="285" x2="450" y2="355"/>
    <line x1="550" y1="285" x2="550" y2="355"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="13" fill="#475569">
    <text x="146" y="378">0</text><text x="242" y="378">10</text><text x="342" y="378">20</text><text x="442" y="378">30</text><text x="542" y="378">40</text>
    <text x="321" y="386">students</text>
  </g>
  <rect x="150" y="294" width="140" height="26" fill="#2563eb"/>
  <rect x="290" y="294" width="90" height="26" fill="#f97316"/>
  <rect x="380" y="294" width="120" height="26" fill="#16a34a"/>
  <rect x="150" y="334" width="90" height="26" fill="#2563eb"/>
  <rect x="240" y="334" width="150" height="26" fill="#f97316"/>
  <rect x="390" y="334" width="80" height="26" fill="#16a34a"/>
  <g font-family="Arial, sans-serif" font-size="14" fill="#ffffff" font-weight="700">
    <text x="205" y="313">14</text><text x="325" y="313">9</text><text x="432" y="313">12</text>
    <text x="185" y="353">9</text><text x="306" y="353">15</text><text x="424" y="353">8</text>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#0f172a">
    <rect x="165" y="70" width="18" height="18" fill="#2563eb"/><text x="190" y="84">Sports</text>
    <rect x="265" y="70" width="18" height="18" fill="#f97316"/><text x="290" y="84">Arts</text>
    <rect x="345" y="70" width="18" height="18" fill="#16a34a"/><text x="370" y="84">Science</text>
  </g>
</svg>`,
};

const histogramFigure: ItemFigure = {
  type: "svg",
  title: "Commute-time histogram",
  description:
    "A histogram shows commute times in minutes for 35 students, grouped into equal 10-minute intervals.",
  svg: `<svg viewBox="0 0 620 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="420" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="330" x2="550" y2="330"/><line x1="90" y1="290" x2="550" y2="290"/><line x1="90" y1="250" x2="550" y2="250"/><line x1="90" y1="210" x2="550" y2="210"/><line x1="90" y1="170" x2="550" y2="170"/><line x1="90" y1="130" x2="550" y2="130"/><line x1="90" y1="90" x2="550" y2="90"/>
  </g>
  <line x1="90" y1="330" x2="560" y2="330" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="340" x2="90" y2="70" stroke="#334155" stroke-width="2"/>
  <rect x="110" y="250" width="78" height="80" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <rect x="188" y="190" width="78" height="140" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <rect x="266" y="90" width="78" height="240" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <rect x="344" y="150" width="78" height="180" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <rect x="422" y="270" width="78" height="60" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <g font-family="Arial, sans-serif" font-size="13" fill="#0f172a">
    <text x="78" y="334">0</text><text x="78" y="294">2</text><text x="78" y="254">4</text><text x="78" y="214">6</text><text x="78" y="174">8</text><text x="72" y="134">10</text><text x="72" y="94">12</text>
    <text x="111" y="354">0-10</text><text x="185" y="354">10-20</text><text x="264" y="354">20-30</text><text x="342" y="354">30-40</text><text x="420" y="354">40-50</text>
    <text x="244" y="386">commute time (minutes)</text>
    <text x="25" y="205" transform="rotate(-90 25 205)">frequency</text>
    <text x="263" y="42" font-size="18" font-weight="700">Commute times</text>
  </g>
</svg>`,
};

const scoreTableFigure: ItemFigure = {
  type: "svg",
  title: "Quiz score frequency table",
  description:
    "A frequency table gives quiz scores and the number of students earning each score.",
  svg: `<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="300" fill="#ffffff"/>
  <text x="150" y="42" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">Quiz scores of 20 students</text>
  <g stroke="#334155" stroke-width="2" fill="none">
    <rect x="90" y="75" width="380" height="150"/>
    <line x1="90" y1="125" x2="470" y2="125"/><line x1="90" y1="175" x2="470" y2="175"/>
    <line x1="160" y1="75" x2="160" y2="225"/><line x1="230" y1="75" x2="230" y2="225"/><line x1="300" y1="75" x2="300" y2="225"/><line x1="370" y1="75" x2="370" y2="225"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="16" text-anchor="middle">
    <text x="125" y="106">Score</text><text x="195" y="106">4</text><text x="265" y="106">5</text><text x="335" y="106">6</text><text x="420" y="106">7</text>
    <text x="125" y="157">Frequency</text><text x="195" y="157">2</text><text x="265" y="157">5</text><text x="335" y="157">8</text><text x="420" y="157">5</text>
  </g>
  <text x="128" y="258" font-size="14" fill="#475569" font-family="Arial, sans-serif">Each student scored 4, 5, 6 or 7 marks.</text>
</svg>`,
};

const boxPlotLineFigure: ItemFigure = {
  type: "svg",
  title: "Ordered rainfall data on a line",
  description:
    "Seven ordered rainfall values are marked to support median and outlier reasoning.",
  svg: `<svg viewBox="0 0 620 240" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="240" fill="#ffffff"/>
  <text x="164" y="44" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">Ordered rainfall values (mm)</text>
  <line x1="90" y1="140" x2="550" y2="140" stroke="#334155" stroke-width="2"/>
  <g stroke="#334155" stroke-width="2">
    <line x1="110" y1="130" x2="110" y2="150"/><line x1="170" y1="130" x2="170" y2="150"/><line x1="230" y1="130" x2="230" y2="150"/><line x1="290" y1="130" x2="290" y2="150"/><line x1="350" y1="130" x2="350" y2="150"/><line x1="410" y1="130" x2="410" y2="150"/><line x1="520" y1="130" x2="520" y2="150"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="15" fill="#0f172a" text-anchor="middle">
    <text x="110" y="178">2</text><text x="170" y="178">4</text><text x="230" y="178">5</text><text x="290" y="178">6</text><text x="350" y="178">7</text><text x="410" y="178">8</text><text x="520" y="178">20</text>
  </g>
</svg>`,
};

const empiricalSpinnerFigure: ItemFigure = {
  type: "svg",
  title: "Spinner trial results",
  description:
    "A table records observed outcomes from 80 spins of a four-colour spinner.",
  svg: `<svg viewBox="0 0 600 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="330" fill="#ffffff"/>
  <text x="185" y="42" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">80 spinner trials</text>
  <circle cx="145" cy="170" r="72" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <path d="M145 170 L145 98 A72 72 0 0 1 217 170 Z" fill="#2563eb"/>
  <path d="M145 170 L217 170 A72 72 0 0 1 145 242 Z" fill="#f97316"/>
  <path d="M145 170 L145 242 A72 72 0 0 1 73 170 Z" fill="#16a34a"/>
  <path d="M145 170 L73 170 A72 72 0 0 1 145 98 Z" fill="#ef4444"/>
  <line x1="145" y1="170" x2="203" y2="126" stroke="#0f172a" stroke-width="3"/>
  <circle cx="145" cy="170" r="5" fill="#0f172a"/>
  <g stroke="#334155" stroke-width="2" fill="none">
    <rect x="290" y="95" width="220" height="150"/>
    <line x1="290" y1="145" x2="510" y2="145"/><line x1="290" y1="195" x2="510" y2="195"/>
    <line x1="400" y1="95" x2="400" y2="245"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="16" text-anchor="middle">
    <text x="345" y="126">Colour</text><text x="455" y="126">Frequency</text>
    <text x="345" y="176">Blue</text><text x="455" y="176">22</text>
    <text x="345" y="226">Not blue</text><text x="455" y="226">58</text>
  </g>
</svg>`,
};

const twoCoinTreeFigure: ItemFigure = {
  type: "svg",
  title: "Two-coin tree diagram",
  description:
    "A complete tree diagram shows the four equally likely outcomes when two fair coins are tossed.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <g stroke="#334155" stroke-width="3" fill="none">
    <line x1="90" y1="180" x2="230" y2="105"/><line x1="90" y1="180" x2="230" y2="255"/>
    <line x1="230" y1="105" x2="400" y2="70"/><line x1="230" y1="105" x2="400" y2="140"/>
    <line x1="230" y1="255" x2="400" y2="220"/><line x1="230" y1="255" x2="400" y2="290"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="16">
    <text x="70" y="184">Start</text>
    <text x="205" y="95">H</text><text x="205" y="275">T</text>
    <text x="410" y="74">HH</text><text x="410" y="144">HT</text><text x="410" y="224">TH</text><text x="410" y="294">TT</text>
    <text x="140" y="120">1/2</text><text x="140" y="250">1/2</text>
    <text x="315" y="76">1/2</text><text x="315" y="142">1/2</text><text x="315" y="222">1/2</text><text x="315" y="292">1/2</text>
  </g>
</svg>`,
};

const sampleSpaceTableFigure: ItemFigure = {
  type: "svg",
  title: "Coin and die sample space table",
  description:
    "A table lists the 12 equally likely outcomes from tossing a coin and rolling a die.",
  svg: `<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="380" fill="#ffffff"/>
  <text x="185" y="42" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">Coin and die outcomes</text>
  <g stroke="#334155" stroke-width="2" fill="none">
    <rect x="95" y="75" width="455" height="180"/>
    <line x1="95" y1="135" x2="550" y2="135"/><line x1="95" y1="195" x2="550" y2="195"/>
    <line x1="160" y1="75" x2="160" y2="255"/><line x1="225" y1="75" x2="225" y2="255"/><line x1="290" y1="75" x2="290" y2="255"/><line x1="355" y1="75" x2="355" y2="255"/><line x1="420" y1="75" x2="420" y2="255"/><line x1="485" y1="75" x2="485" y2="255"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="15" text-anchor="middle">
    <text x="127" y="109">coin</text><text x="193" y="109">1</text><text x="258" y="109">2</text><text x="323" y="109">3</text><text x="388" y="109">4</text><text x="453" y="109">5</text><text x="518" y="109">6</text>
    <text x="127" y="170">H</text><text x="193" y="170">H1</text><text x="258" y="170">H2</text><text x="323" y="170">H3</text><text x="388" y="170">H4</text><text x="453" y="170">H5</text><text x="518" y="170">H6</text>
    <text x="127" y="230">T</text><text x="193" y="230">T1</text><text x="258" y="230">T2</text><text x="323" y="230">T3</text><text x="388" y="230">T4</text><text x="453" y="230">T5</text><text x="518" y="230">T6</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Data Organisation and Graphs",
    subtopic:
      "Collecting, organising, visualising and interpreting data using tables, histograms, stacked bars and 100% stacked bars.",
    mc: [
      {
        questionLatex: L`In the stacked bar graph, which section has the larger fraction of students choosing Arts?`,
        difficulty: 3,
        figure: stackedBarFigure,
        skillTags: ["stacked_bar_graph", "compare_fractions"],
        choices: [
          "Section A, because 9 students chose Arts.",
          "Section A, because its total is larger.",
          "Section B, because $15$ out of $32$ chose Arts.",
          "Both sections, because Arts is shown in both bars.",
        ],
        correctLetter: "C",
        rationales: {
          A: "You compared only the Arts counts. Fractions must use each section's total.",
          B: "A larger total does not automatically mean a larger fraction for one category.",
          D: "The graph shows Arts in both sections, but the proportions are different.",
        },
        hints: [
          "Find the total students in each section.",
          "Compare $9/35$ with $15/32$.",
          "$15/32$ is the larger fraction.",
        ],
        solution: [
          {
            explanation: "The Arts fractions are",
            math: L`\frac{9}{35}\quad\text{and}\quad\frac{15}{32}`,
          },
          {
            explanation:
              "Since $15/32$ is greater than $9/35$, Section B has the larger fraction choosing Arts.",
          },
        ],
      },
      {
        questionLatex: L`From the commute-time histogram, the number of students whose commute is at least $20$ minutes but less than $40$ minutes is`,
        difficulty: 2,
        figure: histogramFigure,
        skillTags: ["histogram_interpretation", "grouped_data"],
        choices: [L`$12$`, L`$21$`, L`$16$`, L`$35$`],
        correctLetter: "B",
        rationales: {
          A: "This counts only the $20$-$30$ interval and misses $30$-$40$.",
          C: "This adds the first and last bars, not the required middle intervals.",
          D: "This is the total number of students in all intervals.",
        },
        hints: [
          "At least $20$ but less than $40$ includes two bars.",
          "Read the frequencies for $20$-$30$ and $30$-$40$.",
          "Add $12$ and $9$.",
        ],
        solution: [
          {
            explanation: "The required intervals are $20$-$30$ and $30$-$40$.",
            math: L`12+9=21`,
          },
        ],
      },
      {
        questionLatex: L`A survey has categories with frequencies $6,14,20$ and $10$. Which statement must be true before drawing a percentage stacked bar?`,
        difficulty: 3,
        skillTags: ["percentage_stacked_bar", "data_total"],
        choices: [
          "The largest category must be drawn first.",
          "All categories must have the same frequency.",
          "The total frequency must be ignored.",
          "The categories must be converted to percentages of the total.",
        ],
        correctLetter: "D",
        rationales: {
          A: "Ordering can help readability, but it is not the defining requirement of a percentage stacked bar.",
          B: "A percentage stacked bar often shows unequal categories.",
          C: "The total is essential because each category is converted to a share of the total.",
        },
        hints: [
          "A 100% stacked bar always has fixed total length.",
          "Each part represents a percentage.",
          "Percentages are found using the total.",
        ],
        solution: [
          {
            explanation:
              "A percentage stacked bar represents each category as a percentage of the total.",
            math: L`\text{percentage}=\frac{\text{category frequency}}{\text{total frequency}}\times100`,
          },
        ],
      },
      {
        questionLatex: L`A newspaper graph uses bars of different widths but compares the heights as if all widths are equal. Which graph type is most at risk of being misread this way?`,
        difficulty: 3,
        skillTags: ["histogram_reasoning", "graph_validity"],
        choices: [
          "A pie chart",
          "A histogram with unequal class widths",
          "A line segment diagram",
          "A simple tally table",
        ],
        correctLetter: "B",
        rationales: {
          A: "Pie charts use sector angles or areas, not bar widths.",
          C: "A line segment diagram does not compare bar areas.",
          D: "A tally table has no drawn bar width.",
        },
        hints: [
          "Histograms use rectangles for grouped continuous data.",
          "When widths differ, area matters.",
          "Comparing only heights can mislead.",
        ],
        solution: [
          {
            explanation:
              "For unequal class widths, histogram rectangle areas represent frequencies, so using height alone can distort the interpretation.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: A stacked bar graph can show both total participation and category-wise break-up. Reason: Each bar is divided into parts representing subcategories. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "stacked_bar_graph"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The division into subcategory parts is exactly why both total and break-up are visible.",
          B: "The reason is true for stacked bars.",
          C: "The assertion is also true.",
        },
        hints: [
          "Think about the full length of one stacked bar.",
          "Then think about its coloured parts.",
          "The reason directly explains the assertion.",
        ],
        solution: [
          {
            explanation:
              "The total bar length gives the total, while the internal segments show the subcategory break-up.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In the stacked bar graph, find the total number of students represented by Section A and Section B together.`,
        difficulty: 2,
        figure: stackedBarFigure,
        skillTags: ["stacked_bar_graph", "data_total"],
        parts: singlePart("a", "Find the combined total.", 2),
        hints: [
          "Add the three parts of Section A.",
          "Add the three parts of Section B.",
          "Then add the two section totals.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds Section A total $35$, Section B total $32$, and combined total $67$.",
        ),
        commonErrors: ["Adding only one category across the two sections."],
        workedSolution: [
          {
            part: "a",
            explanation: "Section A has $14+9+12=35$ students.",
          },
          {
            part: "a",
            explanation: "Section B has $9+15+8=32$ students.",
            math: L`35+32=67`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Using the histogram, state the modal class of commute time and explain briefly.`,
        difficulty: 2,
        figure: histogramFigure,
        skillTags: ["histogram_interpretation", "modal_class"],
        parts: singlePart("a", "State the modal class with reason.", 2),
        hints: [
          "The modal class is the interval with the highest frequency.",
          "Find the tallest rectangle.",
          "Read its class interval.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States $20$-$30$ minutes and explains it has the highest frequency.",
        ),
        commonErrors: ["Writing the frequency $12$ as the class interval."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The tallest bar is for the interval $20$-$30$ minutes, with frequency $12$. Hence the modal class is $20$-$30$ minutes.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The table below gives the number of books read by $40$ students in a month: $0$ books: $5$, $1$ book: $14$, $2$ books: $13$, $3$ books: $8$. Convert the data into percentages for a $100\%$ stacked bar.`,
        difficulty: 3,
        skillTags: ["percentage_stacked_bar", "frequency_to_percentage"],
        parts: singlePart("a", "Find all four percentages.", 4),
        hints: [
          "Each percentage uses total $40$.",
          "Use frequency divided by total, times $100$.",
          "Check that the percentages add to $100\\%$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $12.5\\%$." },
            { part: "a", points: 1, description: "Finds $35\\%$." },
            { part: "a", points: 1, description: "Finds $32.5\\%$." },
            { part: "a", points: 1, description: "Finds $20\\%$." },
          ],
        },
        commonErrors: [
          "Using $100$ as the total frequency.",
          "Leaving answers as frequencies instead of percentages.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Divide each frequency by $40$ and multiply by $100$.",
            math: L`\frac5{40}=12.5\%,\quad \frac{14}{40}=35\%,\quad \frac{13}{40}=32.5\%,\quad \frac8{40}=20\%`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Using the stacked bar graph, compare Sports and Arts. Which club shows the larger proportional gap between Section A and Section B? Justify using percentages or fractions.`,
        difficulty: 4,
        figure: stackedBarFigure,
        skillTags: ["evaluate_data_claim", "proportional_reasoning"],
        parts: singlePart("a", "Compare the proportional gaps.", 4),
        hints: [
          "Use each section's total as the denominator.",
          "Compare Sports: $14/35$ and $9/32$.",
          "Compare Arts: $9/35$ and $15/32$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds or correctly sets up the Sports proportions.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds or correctly sets up the Arts proportions.",
            },
            {
              part: "a",
              points: 1,
              description: "Compares the two proportional gaps.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes that Arts has the larger gap.",
            },
          ],
        },
        commonErrors: [
          "Comparing only raw counts instead of proportions.",
          "Using the same denominator for both sections even though the section totals differ.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Sports proportions are $14/35=40\\%$ for Section A and $9/32=28.125\\%$ for Section B, so the gap is about $11.875$ percentage points.",
          },
          {
            part: "a",
            explanation:
              "Arts proportions are $9/35\\approx25.7\\%$ for Section A and $15/32=46.875\\%$ for Section B, so the gap is about $21.2$ percentage points. Therefore Arts shows the larger proportional gap.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school analyses commute times of $35$ students using the histogram shown.`,
        difficulty: 3,
        figure: histogramFigure,
        skillTags: ["histogram_interpretation", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "How many students commute for less than $20$ minutes?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "How many students commute for $30$ minutes or more?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "What fraction of students commute for at least $20$ minutes?",
            points: 2,
          },
        ],
        hints: [
          "Read each class interval carefully.",
          "Less than $20$ uses the first two bars.",
          "At least $20$ uses the last three bars.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $11$." },
            { part: "b", points: 1, description: "Finds $12$." },
            {
              part: "c",
              points: 2,
              description: "Finds $24/35$ for at least $20$ minutes.",
            },
          ],
        },
        commonErrors: [
          "Including the wrong endpoint interval.",
          "Using the number of intervals as the denominator.",
        ],
        workedSolution: [
          { part: "a", explanation: "Less than $20$ minutes: $4+7=11$." },
          { part: "b", explanation: "$30$ minutes or more: $9+3=12$." },
          {
            part: "c",
            explanation:
              "At least $20$ minutes: $12+9+3=24$ out of $35$ students.",
            math: L`\frac{24}{35}`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.2",
    title: "Mean and Weighted Average",
    subtopic:
      "Mean from raw and frequency data, weighted average, combined mean, and interpreting the effect of changes in data.",
    mc: [
      {
        questionLatex: L`Using the score table, the mean quiz score is`,
        difficulty: 2,
        figure: scoreTableFigure,
        skillTags: ["mean_from_frequency_table"],
        choices: [L`$6$`, L`$5.5$`, L`$7$`, L`$5.8$`],
        correctLetter: "D",
        rationales: {
          A: "This is close, but the weighted total is $116$, not $120$.",
          B: "This treats the score values as if all occurred equally often.",
          C: "This chooses the maximum score instead of the mean.",
        },
        hints: [
          "Multiply each score by its frequency.",
          "Divide by the total frequency.",
          "The total score is $116$ for $20$ students.",
        ],
        solution: [
          {
            explanation: "Use the weighted sum of scores.",
            math: L`\bar x=\frac{4\cdot2+5\cdot5+6\cdot8+7\cdot5}{20}=\frac{116}{20}=5.8`,
          },
        ],
      },
      {
        questionLatex: L`A project grade is calculated with weights $20\%$ for notebook, $30\%$ for oral work and $50\%$ for written test. A student scores $8,6,7$ respectively. The weighted average is`,
        difficulty: 3,
        skillTags: ["weighted_average"],
        choices: [L`$7.0$`, L`$7.1$`, L`$21$`, L`$6.9$`],
        correctLetter: "D",
        rationales: {
          A: "This is the ordinary average of $8,6,7$, not the weighted average.",
          B: "This misplaces at least one weight.",
          C: "This adds the scores without using weights.",
        },
        hints: [
          "Convert percentages to decimals or use weights out of $100$.",
          "Compute $20\\%$ of $8$, $30\\%$ of $6$, and $50\\%$ of $7$.",
          "Add the weighted contributions.",
        ],
        solution: [
          {
            explanation: "Use each score with its weight.",
            math: L`0.2(8)+0.3(6)+0.5(7)=1.6+1.8+3.5=6.9`,
          },
        ],
      },
      {
        questionLatex: L`The mean of $8$ observations is $15$. If one more observation $23$ is added, the new mean is`,
        difficulty: 3,
        skillTags: ["combined_mean", "mean_update"],
        choices: [L`$19$`, L`$15.5$`, L`$38$`, L`$15\frac89$`],
        correctLetter: "D",
        rationales: {
          A: "This averages only $15$ and $23$, ignoring that $15$ was the mean of $8$ observations.",
          B: "This does not add the new observation correctly to the old total.",
          C: "This adds $15+23$ instead of averaging all observations.",
        },
        hints: [
          "Recover the old total first.",
          "Old total is $8\\times15$.",
          "Add $23$ and divide by $9$.",
        ],
        solution: [
          {
            explanation: "The old total is $8\\times15=120$.",
            math: L`\frac{120+23}{9}=\frac{143}{9}=15\frac89`,
          },
        ],
      },
      {
        questionLatex: L`A class has mean height $150$ cm for $18$ students. Another group has mean height $156$ cm for $12$ students. The combined mean height is`,
        difficulty: 3,
        skillTags: ["combined_mean", "weighted_average"],
        choices: [L`$153$ cm`, L`$306$ cm`, L`$152.4$ cm`, L`$151.8$ cm`],
        correctLetter: "C",
        rationales: {
          A: "This is the ordinary average of the two means, but the group sizes differ.",
          B: "This adds the two means.",
          D: "This uses the group sizes incorrectly.",
        },
        hints: [
          "Find total height of each group.",
          "Add the totals.",
          "Divide by total number of students, $30$.",
        ],
        solution: [
          {
            explanation: "Compute the weighted mean.",
            math: L`\frac{18(150)+12(156)}{18+12}=\frac{4572}{30}=152.4\text{ cm}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: Adding $5$ to every observation increases the mean by $5$. Reason: The total increases by $5n$ for $n$ observations. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "mean_transformation"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The increase of the total by $5n$ directly explains why the mean rises by $5$.",
          C: "The reason is true for $n$ observations.",
          D: "The assertion is also true.",
        },
        hints: [
          "Mean is total divided by number of observations.",
          "Adding $5$ to each value adds $5n$ to the total.",
          "Divide the extra total by $n$.",
        ],
        solution: [
          {
            explanation:
              "If the old mean is $T/n$, the new mean is $(T+5n)/n=T/n+5$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`The mean of five numbers is $18$. Four of the numbers are $12,16,20$ and $25$. Find the fifth number.`,
        difficulty: 2,
        skillTags: ["mean_missing_value"],
        parts: singlePart("a", "Find the missing number.", 2),
        hints: [
          "Mean times number of observations gives total.",
          "Find the total of five numbers.",
          "Subtract the four known numbers.",
        ],
        rubric: singleRubric("a", 2, "Finds the missing number $17$."),
        commonErrors: [
          "Averaging the four known numbers instead of using the given mean.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The total of five numbers is $5\\times18=90$.",
          },
          {
            part: "a",
            explanation: "The known total is $12+16+20+25=73$.",
            math: L`90-73=17`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Using the score table, find the number of students who scored more than the mean score.`,
        difficulty: 3,
        figure: scoreTableFigure,
        skillTags: ["mean_from_frequency_table", "interpret_mean"],
        parts: singlePart("a", "Find the number of students.", 2),
        hints: [
          "Find or use the mean score from the table.",
          "The mean is $5.8$.",
          "Scores greater than $5.8$ are $6$ and $7$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds mean $5.8$ and counts $8+5=13$ students above it.",
        ),
        commonErrors: [
          "Counting only students who scored above $6$ instead of above $5.8$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The mean is $5.8$.",
          },
          {
            part: "a",
            explanation:
              "Scores greater than $5.8$ are $6$ and $7$, with frequencies $8$ and $5$.",
            math: L`8+5=13`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student's term score is weighted as follows: tests $40\%$, notebook $25\%$, project $20\%$, oral $15\%$. The scores are $72,80,90,60$ respectively. Find the weighted average.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["weighted_average"],
        parts: singlePart("a", "Find the weighted average.", 3),
        hints: [
          "Convert percentages to weights out of $100$.",
          "Multiply each score by its weight.",
          "Add and divide by $100$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses all four weights correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Forms the correct weighted sum.",
            },
            { part: "a", points: 1, description: "Obtains $75.8$." },
          ],
        },
        commonErrors: [
          "Taking the ordinary mean of the four scores.",
          "Forgetting that the weights sum to $100\\%$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the given weights.",
            math: L`\frac{40(72)+25(80)+20(90)+15(60)}{100}=75.8`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The mean of $10$ observations is $24$. One observation was wrongly recorded as $42$ instead of $24$. Find the correct mean.`,
        difficulty: 3,
        skillTags: ["corrected_mean", "data_error"],
        parts: singlePart("a", "Find the corrected mean.", 3),
        hints: [
          "First find the incorrect total.",
          "Remove the wrong value and add the correct value.",
          "Divide the corrected total by $10$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds wrong total $240$." },
            { part: "a", points: 1, description: "Corrects total to $222$." },
            { part: "a", points: 1, description: "Finds mean $22.2$." },
          ],
        },
        commonErrors: [
          "Subtracting the whole wrong value but not adding the correct one.",
        ],
        workedSolution: [
          { part: "a", explanation: "Incorrect total $=10\\times24=240$." },
          {
            part: "a",
            explanation: "Correct total $=240-42+24=222$.",
            math: L`\text{correct mean}=\frac{222}{10}=22.2`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher compares two batches. Batch A has $25$ students with mean score $62$. Batch B has $15$ students with mean score $70$.`,
        difficulty: 3,
        skillTags: ["combined_mean", "case_based", "weighted_average"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the total score of Batch A.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the total score of Batch B.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the combined mean score.",
            points: 2,
          },
        ],
        hints: [
          "Mean times number of students gives total score.",
          "Find both totals before combining.",
          "Divide the combined total by $40$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $1550$." },
            { part: "b", points: 1, description: "Finds $1050$." },
            { part: "c", points: 1, description: "Adds totals to get $2600$." },
            { part: "c", points: 1, description: "Finds combined mean $65$." },
          ],
        },
        commonErrors: [
          "Averaging $62$ and $70$ directly without considering batch sizes.",
        ],
        workedSolution: [
          { part: "a", explanation: "Batch A total $=25\\times62=1550$." },
          { part: "b", explanation: "Batch B total $=15\\times70=1050$." },
          {
            part: "c",
            explanation:
              "Combined mean uses the combined total and $40$ students.",
            math: L`\frac{1550+1050}{25+15}=\frac{2600}{40}=65`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.3",
    title: "Median, Mode and Choice of Average",
    subtopic:
      "Median, mode, effect of extreme values, and deciding which measure of central tendency is most appropriate.",
    mc: [
      {
        questionLatex: L`For the ordered rainfall data in the figure, the median is`,
        difficulty: 2,
        figure: boxPlotLineFigure,
        skillTags: ["median_ordered_data"],
        choices: [L`$5$ mm`, L`$6$ mm`, L`$7$ mm`, L`$20$ mm`],
        correctLetter: "B",
        rationales: {
          A: "This is just before the middle value.",
          C: "This is just after the middle value.",
          D: "This is an extreme value, not the middle value.",
        },
        hints: [
          "There are $7$ observations.",
          "The median is the $4$th observation.",
          "Read the fourth value from the ordered line.",
        ],
        solution: [
          {
            explanation: "The fourth value is $6$ mm, so the median is $6$ mm.",
          },
        ],
      },
      {
        questionLatex: L`The data set $4,5,5,6,7,8,20$ has a mean larger than its median mainly because`,
        difficulty: 3,
        skillTags: ["mean_vs_median", "outlier_effect"],
        choices: [
          "the value $4$ pulls the median upward",
          "mode is always larger than mean",
          "median uses all values equally",
          "the value $20$ pulls the mean upward",
        ],
        correctLetter: "D",
        rationales: {
          A: "The small value $4$ does not explain why the mean is larger.",
          B: "There is no rule that mode is always larger than mean.",
          C: "Median depends on position after ordering, not equally on all values.",
        },
        hints: [
          "Mean uses every value in the total.",
          "Median uses the middle position.",
          "Extreme high values affect the mean strongly.",
        ],
        solution: [
          {
            explanation:
              "The value $20$ is much larger than the rest, so it increases the total and pulls the mean above the median.",
          },
        ],
      },
      {
        questionLatex: L`In a shoe shop, the owner wants to know which shoe size to stock most. The most useful measure is`,
        difficulty: 2,
        skillTags: ["mode_application", "choose_average"],
        choices: ["mean", "median", "mode", "range"],
        correctLetter: "C",
        rationales: {
          A: "The mean shoe size may not even be an actual popular size.",
          B: "The median gives a middle size, not necessarily the most demanded size.",
          D: "Range shows spread, not the most common size.",
        },
        hints: [
          "The owner needs the most frequent size.",
          "The average is not always the best summary.",
          "Most frequent value means mode.",
        ],
        solution: [
          {
            explanation:
              "The mode is the most frequent value, so it is best for stock planning.",
          },
        ],
      },
      {
        questionLatex: L`For the values $3,4,4,5,9,11$, the median is`,
        difficulty: 2,
        skillTags: ["median_even_number_data"],
        choices: [L`$4$`, L`$4.5$`, L`$5$`, L`$6$`],
        correctLetter: "B",
        rationales: {
          A: "For an even number of observations, do not choose only the third value.",
          C: "For an even number of observations, do not choose only the fourth value.",
          D: "This is the mean of $3$ and $9$, not the two middle values.",
        },
        hints: [
          "There are $6$ observations.",
          "Use the average of the $3$rd and $4$th values.",
          "Average $4$ and $5$.",
        ],
        solution: [
          {
            explanation: "The middle two values are $4$ and $5$.",
            math: L`\text{median}=\frac{4+5}{2}=4.5`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: The median of an ordered data set is unchanged if the largest value is made even larger. Reason: The median depends on position, not the size of an extreme value. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "median_outlier"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why changing only an extreme value leaves the middle position unchanged.",
          C: "The reason is true for median.",
          D: "The assertion is also true when the order position of the largest value stays last.",
        },
        hints: [
          "Median is based on the middle position after ordering.",
          "Changing the largest value does not move the middle position.",
          "The reason explains the assertion.",
        ],
        solution: [
          {
            explanation:
              "If only the largest value increases, the ordered positions of the middle values are unchanged, so the median is unchanged.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the mode of the data $2,3,5,3,4,3,5,6$.`,
        difficulty: 1,
        skillTags: ["mode_raw_data"],
        parts: singlePart("a", "Find the mode.", 1),
        hints: [
          "Count how many times each value appears.",
          "The mode is the most frequent value.",
          "$3$ appears three times.",
        ],
        rubric: singleRubric("a", 1, "Finds mode $3$."),
        commonErrors: [
          "Writing the largest value instead of the most frequent value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$3$ occurs most often, so the mode is $3$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`For $10,12,13,15,40$, find the median and state whether the value $40$ affects the median strongly.`,
        difficulty: 2,
        skillTags: ["median_ordered_data", "outlier_effect"],
        parts: singlePart("a", "Find the median and comment.", 2),
        hints: [
          "The data is already ordered.",
          "There are $5$ values, so use the third one.",
          "The extreme value is not the middle value.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds median $13$ and states that $40$ does not strongly affect it.",
        ),
        commonErrors: ["Calculating the mean when median is asked."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The middle value is $13$, so the median is $13$. The extreme value $40$ does not strongly affect the median because it is not in the middle position.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A housing society records monthly water use in kilolitres: $18,19,20,20,21,22,60$. Find the mean and median, then say which better represents a usual month.`,
        difficulty: 3,
        skillTags: ["mean_median_comparison", "choose_average"],
        parts: singlePart("a", "Find both measures and choose.", 4),
        hints: [
          "The data is already ordered.",
          "Mean uses the total divided by $7$.",
          "The value $60$ is unusually large.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds mean about $25.7$." },
            { part: "a", points: 1, description: "Finds median $20$." },
            {
              part: "a",
              points: 1,
              description: "Identifies $60$ as an extreme value.",
            },
            {
              part: "a",
              points: 1,
              description: "Chooses median as better for usual month.",
            },
          ],
        },
        commonErrors: [
          "Choosing mean only because it uses all data, without considering the extreme value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The mean is",
            math: L`\frac{18+19+20+20+21+22+60}{7}=\frac{180}{7}\approx25.7`,
          },
          {
            part: "a",
            explanation:
              "The median is the fourth value, $20$. Since $60$ is unusually high, the median better represents a usual month.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The mean of $6$ observations is $11$, and their median is $10$. If each observation is multiplied by $3$, find the new mean and new median.`,
        difficulty: 3,
        skillTags: ["mean_transformation", "median_transformation"],
        parts: singlePart("a", "Find both new measures.", 2),
        hints: [
          "Multiplying every value by $3$ scales the total.",
          "It also scales the middle value.",
          "Apply the same factor to mean and median.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds new mean $33$." },
            { part: "a", points: 1, description: "Finds new median $30$." },
          ],
        },
        commonErrors: ["Adding $3$ instead of multiplying by $3$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Multiplying every observation by $3$ multiplies both mean and median by $3$.",
            math: L`\text{new mean}=33,\quad \text{new median}=30`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A shop records the number of notebooks sold over $9$ days: $8,9,9,10,10,10,11,12,29$.`,
        difficulty: 3,
        skillTags: ["mean_median_mode", "case_based", "outlier_effect"],
        parts: [
          { letter: "a", promptMarkdown: "Find the median.", points: 1 },
          { letter: "b", promptMarkdown: "Find the mode.", points: 1 },
          {
            letter: "c",
            promptMarkdown:
              "Explain why the mean will be higher than a typical daily sale.",
            points: 2,
          },
        ],
        hints: [
          "The data is already ordered.",
          "The fifth value is the median.",
          "The last value is much larger than the others.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds median $10$." },
            { part: "b", points: 1, description: "Finds mode $10$." },
            {
              part: "c",
              points: 1,
              description: "Identifies $29$ as an extreme value.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Explains that the extreme value pulls the mean upward.",
            },
          ],
        },
        commonErrors: [
          "Calling $29$ the mode because it is the largest value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "There are $9$ values, so the median is the fifth value, $10$.",
          },
          {
            part: "b",
            explanation:
              "$10$ occurs three times, more than any other value, so the mode is $10$.",
          },
          {
            part: "c",
            explanation:
              "The value $29$ is much larger than the other days. Since the mean uses the total, this extreme day pulls the mean above a typical daily sale.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.4",
    title: "Empirical Probability and Randomness",
    subtopic:
      "Probability scale, randomness, empirical probability from observed data, repeated trials, and judging simulation claims.",
    mc: [
      {
        questionLatex: L`From the spinner trial results, the empirical probability of getting Blue is`,
        difficulty: 2,
        figure: empiricalSpinnerFigure,
        skillTags: ["empirical_probability"],
        choices: [
          L`$\frac{22}{80}$`,
          L`$\frac{58}{80}$`,
          L`$\frac{22}{58}$`,
          L`$\frac14$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the empirical probability of not getting Blue.",
          C: "The denominator should be total trials, not not-blue trials.",
          D: "This assumes theoretical equal sectors instead of using observed trial data.",
        },
        hints: [
          "Empirical probability uses observed frequency.",
          "Blue occurred $22$ times.",
          "There were $80$ total trials.",
        ],
        solution: [
          {
            explanation: "Use observed frequency divided by total trials.",
            math: L`P(\text{Blue})\approx\frac{22}{80}=\frac{11}{40}`,
          },
        ],
      },
      {
        questionLatex: L`Which value cannot be a probability?`,
        difficulty: 1,
        skillTags: ["probability_scale"],
        choices: [L`$0$`, L`$\frac78$`, L`$1.2$`, L`$1$`],
        correctLetter: "C",
        rationales: {
          A: "$0$ represents an impossible event, so it can be a probability.",
          B: "$7/8$ lies between $0$ and $1$.",
          D: "$1$ represents a certain event, so it can be a probability.",
        },
        hints: [
          "Probabilities lie from $0$ to $1$ inclusive.",
          "$0$ and $1$ are allowed.",
          "Look for the value greater than $1$.",
        ],
        solution: [
          {
            explanation:
              "A probability cannot be less than $0$ or greater than $1$, so $1.2$ is impossible.",
          },
        ],
      },
      {
        questionLatex: L`A coin is tossed $20$ times and heads appears $16$ times. Which conclusion is best?`,
        difficulty: 3,
        skillTags: ["randomness", "empirical_probability_interpretation"],
        choices: [
          "The coin must be unfair.",
          "The theoretical probability of heads has changed to $16/20$.",
          "The observed proportion is $16/20$, but more trials are needed before judging fairness.",
          "The next toss must be tails.",
        ],
        correctLetter: "C",
        rationales: {
          A: "A small number of trials can show imbalance by chance.",
          B: "Theoretical probability for a fair coin is based on the model, not this short-run result.",
          D: "Random trials do not force the next outcome to compensate.",
        },
        hints: [
          "Separate observed data from theoretical model.",
          "Small samples can fluctuate.",
          "Do not predict the next toss from a short-run imbalance.",
        ],
        solution: [
          {
            explanation:
              "The empirical probability in these $20$ tosses is $16/20$, but that alone is not enough to prove unfairness.",
          },
        ],
      },
      {
        questionLatex: L`An event is described as "likely but not certain". On the probability scale, its probability should be`,
        difficulty: 2,
        skillTags: ["probability_scale", "likelihood_language"],
        choices: [
          L`exactly $0$`,
          L`between $\frac12$ and $1$, but not equal to $1$`,
          L`exactly $1$`,
          L`less than $0$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "$0$ means impossible, not likely.",
          C: "$1$ means certain, but the event is not certain.",
          D: "Probabilities cannot be negative.",
        },
        hints: [
          "Likely means more than an even chance.",
          "Not certain means less than $1$.",
          "Combine the two conditions.",
        ],
        solution: [
          {
            explanation:
              "Likely but not certain means the probability is high but still below $1$.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: Empirical probability may change when the experiment is repeated with more trials. Reason: Empirical probability is based on observed outcomes. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "empirical_probability"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The fact that it is observation-based directly explains why it can change with new trials.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Empirical probability comes from data.",
          "More trials can change the observed frequency.",
          "The reason explains the assertion.",
        ],
        solution: [
          {
            explanation:
              "Empirical probability equals observed frequency divided by total trials, so new observations can change it.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A seed germination experiment is repeated $120$ times. Seeds germinate in $96$ trials. Find the empirical probability of germination.`,
        difficulty: 2,
        skillTags: ["empirical_probability"],
        parts: singlePart("a", "Find the empirical probability.", 1),
        hints: [
          "Use successful trials over total trials.",
          "Successful germinations are $96$.",
          "Total trials are $120$.",
        ],
        rubric: singleRubric("a", 1, "Finds $96/120=4/5$."),
        commonErrors: ["Using failures as the numerator."],
        workedSolution: [
          {
            part: "a",
            explanation: "Empirical probability is",
            math: L`\frac{96}{120}=\frac45`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In $200$ quality checks, $12$ bulbs are found defective. Estimate the empirical probability that a randomly checked bulb is not defective.`,
        difficulty: 2,
        skillTags: ["empirical_probability", "complement"],
        parts: singlePart("a", "Find the empirical probability.", 2),
        hints: [
          "First find non-defective bulbs.",
          "Use non-defective over total checks.",
          "$200-12=188$.",
        ],
        rubric: singleRubric("a", 2, "Finds $188/200=47/50$."),
        commonErrors: ["Reporting the probability of defective bulbs."],
        workedSolution: [
          {
            part: "a",
            explanation: "There are $200-12=188$ non-defective bulbs.",
            math: L`P(\text{not defective})\approx\frac{188}{200}=\frac{47}{50}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student simulates a die by using slips numbered $1$ to $6$. In $90$ draws with replacement, the number $6$ appears $11$ times. Compare the empirical probability of getting $6$ with the theoretical probability for a fair die.`,
        difficulty: 3,
        skillTags: ["empirical_vs_theoretical_probability"],
        parts: singlePart("a", "Compare both probabilities.", 3),
        hints: [
          "Empirical probability uses $11$ out of $90$.",
          "Theoretical probability for one face of a fair die is $1/6$.",
          "Compare the two fractions or decimals.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds empirical probability $11/90$.",
            },
            {
              part: "a",
              points: 1,
              description: "States theoretical probability $1/6$.",
            },
            {
              part: "a",
              points: 1,
              description: "Correctly notes empirical is smaller.",
            },
          ],
        },
        commonErrors: [
          "Treating $11/90$ as the theoretical probability of a fair die.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The empirical probability is $11/90$. The theoretical probability for a fair die is $1/6=15/90$. Hence the empirical probability is smaller in this trial set.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A weather app says the chance of rain is $0.65$. Place this event on the probability scale using words: impossible, unlikely, equally likely, likely, or certain. Justify.`,
        difficulty: 3,
        skillTags: ["probability_scale", "interpret_probability"],
        parts: singlePart("a", "Classify and justify.", 2),
        hints: [
          "$0.65$ is greater than $0.5$.",
          "It is less than $1$.",
          "So it is likely but not certain.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Classifies as likely." },
            {
              part: "a",
              points: 1,
              description: "Justifies using $0.5<0.65<1$.",
            },
          ],
        },
        commonErrors: ["Calling it certain because it is more than half."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$0.65$ is greater than $0.5$, so rain is more likely than not. It is less than $1$, so it is not certain.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A spinner is spun $80$ times and the results are shown in the figure.`,
        difficulty: 3,
        figure: empiricalSpinnerFigure,
        skillTags: ["empirical_probability", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the empirical probability of Blue.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the empirical probability of not Blue.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Can these $80$ trials alone prove that the spinner is unfair? Give a reason.",
            points: 2,
          },
        ],
        hints: [
          "Use frequency divided by total trials.",
          "Blue occurred $22$ times.",
          "A finite trial result estimates probability; it does not prove the spinner model alone.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $22/80=11/40$." },
            { part: "b", points: 1, description: "Finds $58/80=29/40$." },
            {
              part: "c",
              points: 2,
              description:
                "Explains that trial data suggests but does not prove unfairness without further model/context.",
            },
          ],
        },
        commonErrors: [
          "Assuming an observed frequency is automatically the exact theoretical probability.",
        ],
        workedSolution: [
          { part: "a", explanation: "$P(\\text{Blue})\\approx22/80=11/40$." },
          {
            part: "b",
            explanation: "$P(\\text{not Blue})\\approx58/80=29/40$.",
          },
          {
            part: "c",
            explanation:
              "No. These trials give empirical evidence, but a finite sample can vary by chance. More trials or knowledge of the spinner design is needed to judge fairness strongly.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.5",
    title: "Theoretical Probability, Tables and Trees",
    subtopic:
      "Sample spaces, events, theoretical probability, complements, tree diagrams and two-stage tables.",
    mc: [
      {
        questionLatex: L`Using the two-coin tree diagram, the probability of getting exactly one head is`,
        difficulty: 2,
        figure: twoCoinTreeFigure,
        skillTags: ["tree_diagram", "theoretical_probability"],
        choices: [L`$\frac14$`, L`$\frac34$`, L`$\frac12$`, L`$1$`],
        correctLetter: "C",
        rationales: {
          A: "This counts only one of HT or TH.",
          B: "This counts all outcomes except TT, not exactly one head.",
          D: "Exactly one head is not certain.",
        },
        hints: [
          "List the outcomes with exactly one head.",
          "They are HT and TH.",
          "There are $4$ equally likely outcomes.",
        ],
        solution: [
          {
            explanation: "Exactly one head occurs in HT and TH.",
            math: L`P=\frac{2}{4}=\frac12`,
          },
        ],
      },
      {
        questionLatex: L`From the coin-and-die table, the probability of getting a tail and an even number is`,
        difficulty: 3,
        figure: sampleSpaceTableFigure,
        skillTags: ["sample_space_table", "compound_event"],
        choices: [
          L`$\frac{3}{12}$`,
          L`$\frac{6}{12}$`,
          L`$\frac{2}{12}$`,
          L`$\frac{1}{12}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This counts all tails, not only tails with an even die number.",
          C: "There are three even die numbers, not two.",
          D: "This counts only one favourable outcome.",
        },
        hints: [
          "Tail fixes the row.",
          "Even die numbers are $2,4,6$.",
          "There are $12$ total outcomes.",
        ],
        solution: [
          {
            explanation: "Favourable outcomes are T2, T4 and T6.",
            math: L`P=\frac3{12}=\frac14`,
          },
        ],
      },
      {
        questionLatex: L`A bag contains $5$ red, $3$ blue and $2$ green balls. One ball is drawn at random. The probability that it is not blue is`,
        difficulty: 2,
        skillTags: ["theoretical_probability", "complement"],
        choices: [
          L`$\frac3{10}$`,
          L`$\frac7{10}$`,
          L`$\frac5{10}$`,
          L`$\frac2{10}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This is the probability of blue, not not-blue.",
          C: "This counts only red balls.",
          D: "This counts only green balls.",
        },
        hints: [
          "Total balls are $10$.",
          "Not blue means red or green.",
          "Use $5+2$ favourable balls.",
        ],
        solution: [
          {
            explanation: "There are $5+2=7$ not-blue balls out of $10$.",
            math: L`P(\text{not blue})=\frac7{10}`,
          },
        ],
      },
      {
        questionLatex: L`Two fair coins are tossed. Which event has probability $\frac34$?`,
        difficulty: 3,
        skillTags: ["sample_space", "event_probability"],
        choices: [
          "getting no heads",
          "getting exactly one tail",
          "getting at least one head",
          "getting two heads",
        ],
        correctLetter: "C",
        rationales: {
          A: "No heads is only TT, probability $1/4$.",
          B: "Exactly one tail is HT or TH, probability $1/2$.",
          D: "Two heads is HH, probability $1/4$.",
        },
        hints: [
          "The sample space is HH, HT, TH, TT.",
          "A probability of $3/4$ needs three favourable outcomes.",
          "At least one head excludes only TT.",
        ],
        solution: [
          {
            explanation: "At least one head occurs in HH, HT and TH.",
            math: L`P=\frac34`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: In a fair die roll, $P(\text{prime number})=\frac12$. Reason: The prime numbers on a die are $2,3,5$. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "die_probability"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason gives the favourable outcomes, which directly explains the probability.",
          C: "The reason is true: $2,3,5$ are the prime faces.",
          D: "The assertion is also true because there are $3$ favourable outcomes out of $6$.",
        },
        hints: [
          "List prime numbers from $1$ to $6$.",
          "There are three favourable faces.",
          "Divide by six total faces.",
        ],
        solution: [
          {
            explanation:
              "The prime faces are $2,3,5$, so the probability is $3/6=1/2$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A die is rolled once. Find the probability of getting a multiple of $3$.`,
        difficulty: 2,
        skillTags: ["die_probability", "theoretical_probability"],
        parts: singlePart("a", "Find the probability.", 1),
        hints: [
          "List multiples of $3$ on a die.",
          "They are $3$ and $6$.",
          "There are $6$ equally likely outcomes.",
        ],
        rubric: singleRubric("a", 1, "Finds $2/6=1/3$."),
        commonErrors: ["Counting $0$ as a die outcome."],
        workedSolution: [
          {
            part: "a",
            explanation: "The favourable outcomes are $3$ and $6$.",
            math: L`P=\frac26=\frac13`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A card is chosen at random from cards numbered $1$ to $20$. Find the probability that the number is a square number.`,
        difficulty: 2,
        skillTags: ["sample_space", "square_numbers_probability"],
        parts: singlePart("a", "Find the probability.", 2),
        hints: [
          "List square numbers from $1$ to $20$.",
          "They are $1,4,9,16$.",
          "There are $20$ possible cards.",
        ],
        rubric: singleRubric("a", 2, "Finds $4/20=1/5$."),
        commonErrors: ["Forgetting that $1$ is a square number."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The square numbers are $1,4,9,16$, so there are $4$ favourable cards out of $20$.",
            math: L`P=\frac4{20}=\frac15`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A fair coin is tossed and a fair die is rolled. Use a table or list to find the probability of getting a head and a number greater than $4$.`,
        difficulty: 3,
        figure: sampleSpaceTableFigure,
        skillTags: ["sample_space_table", "compound_event"],
        parts: singlePart("a", "Find the probability.", 3),
        hints: [
          "There are $2\\times6=12$ equally likely outcomes.",
          "Head fixes the coin outcome.",
          "Numbers greater than $4$ are $5$ and $6$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States total outcomes $12$.",
            },
            {
              part: "a",
              points: 1,
              description: "Identifies favourable outcomes H5 and H6.",
            },
            { part: "a", points: 1, description: "Finds $2/12=1/6$." },
          ],
        },
        commonErrors: [
          "Adding $2+6$ for total outcomes instead of multiplying.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "There are $12$ equally likely outcomes. Favourable outcomes are H5 and H6.",
            math: L`P=\frac2{12}=\frac16`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A bag has $4$ red and $6$ black balls. One ball is drawn and not replaced, and then another ball is drawn. Use a tree idea to find the probability of getting exactly one red ball.`,
        difficulty: 4,
        skillTags: ["tree_diagram", "without_replacement_probability"],
        parts: singlePart("a", "Find the probability.", 4),
        hints: [
          "Exactly one red can happen in two orders: red then black, or black then red.",
          "Because there is no replacement, the second denominator is $9$.",
          "Add the probabilities of the two branches.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Sets up the red-then-black branch correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Sets up the black-then-red branch correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Adds the two mutually exclusive branches.",
            },
            { part: "a", points: 1, description: "Finds $8/15$." },
          ],
        },
        commonErrors: [
          "Using the same denominator $10$ on the second draw despite no replacement.",
          "Counting only one order, such as red then black.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Exactly one red occurs as $RB$ or $BR$. Since there is no replacement, the denominator becomes $9$ on the second draw.",
            math: L`P(RB)=\frac4{10}\cdot\frac6{9}=\frac4{15}`,
          },
          {
            part: "a",
            explanation: "Now add the other order.",
            math: L`P(BR)=\frac6{10}\cdot\frac4{9}=\frac4{15},\quad P(\text{exactly one red})=\frac4{15}+\frac4{15}=\frac8{15}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A game uses the coin-and-die experiment shown in the table. A player wins if the coin shows Head and the die number is odd, or if the coin shows Tail and the die number is $6$.`,
        difficulty: 3,
        figure: sampleSpaceTableFigure,
        skillTags: ["sample_space_table", "compound_event", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "How many equally likely outcomes are in the sample space?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "List the winning outcomes.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the probability of winning.",
            points: 1,
          },
        ],
        hints: [
          "Use the table rows and columns.",
          "Head and odd gives H1, H3, H5.",
          "Tail and six gives T6.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $12$ outcomes." },
            { part: "b", points: 2, description: "Lists H1, H3, H5 and T6." },
            { part: "c", points: 1, description: "Finds $4/12=1/3$." },
          ],
        },
        commonErrors: [
          "Counting H6 as winning because 6 appears in the second condition without checking Tail.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "There are $2\\times6=12$ equally likely outcomes.",
          },
          {
            part: "b",
            explanation: "Winning outcomes are H1, H3, H5 and T6.",
          },
          {
            part: "c",
            explanation: "There are $4$ winning outcomes out of $12$.",
            math: L`P(\text{win})=\frac4{12}=\frac13`,
          },
        ],
      },
    ],
  },
];

export const statisticsProbabilityIxTopics: Topic[] = topicSeeds.map(makeTopic);
