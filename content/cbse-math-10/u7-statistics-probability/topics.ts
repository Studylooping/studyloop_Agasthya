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

const COURSE = "cbse-math-10";
const UNIT = "u7-statistics-probability";
const VERSION = "0.1.0";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type SolutionSeed = Omit<SolutionStep, "step"> &
  Partial<Pick<SolutionStep, "step">>;

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
  solution: readonly SolutionSeed[];
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Check the frequency total, the correct class, or the sample space before finalising the answer.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const topicNumber = Number(meta.topicCode.split(".")[1] ?? "0");
  const rotation = (topicNumber + index) % LETTERS.length;
  const seedLetterOrder = [
    ...LETTERS.slice(rotation),
    ...LETTERS.slice(0, rotation),
  ];
  const unletteredChoices = seedLetterOrder.map((seedLetter) => {
    const choiceIndex = LETTERS.indexOf(seedLetter);
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
          "incorrect_statistics_probability_reasoning"),
    };
  });

  const choices = unletteredChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];

  return {
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_the_right_formula_with_the_wrong_frequency_or_sample_space",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      step: step.step ?? stepIndex + 1,
      explanation: step.explanation,
      ...(step.math ? { math: step.math } : {}),
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
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_an_average_or_probability_without_showing_the_count_used",
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

const meanTableFigure: ItemFigure = {
  type: "svg",
  title: "Grouped marks table for mean",
  description:
    "A frequency table with class intervals 0-10, 10-20, 20-30 and 30-40.",
  svg: `<svg viewBox="0 0 560 320" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="320" fill="#ffffff"/>
  <text x="280" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Marks obtained by students</text>
  <rect x="80" y="65" width="400" height="200" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="115" x2="480" y2="115" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="165" x2="480" y2="165" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="80" y1="215" x2="480" y2="215" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="280" y1="65" x2="280" y2="265" stroke="#334155" stroke-width="2"/>
  <text x="180" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1e293b">Class interval</text>
  <text x="380" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1e293b">Frequency</text>
  <text x="180" y="147" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">0-10</text>
  <text x="180" y="197" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">10-20</text>
  <text x="180" y="247" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">20-30</text>
  <text x="380" y="147" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">2</text>
  <text x="380" y="197" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">3</text>
  <text x="380" y="247" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">5</text>
</svg>`,
};

const medianTableFigure: ItemFigure = {
  type: "svg",
  title: "Less-than cumulative frequency table",
  description:
    "A less-than cumulative frequency table used to identify the median class.",
  svg: `<svg viewBox="0 0 620 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="330" fill="#ffffff"/>
  <text x="310" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Less-than cumulative frequency</text>
  <rect x="75" y="70" width="470" height="210" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <line x1="75" y1="122" x2="545" y2="122" stroke="#334155" stroke-width="2"/>
  <line x1="75" y1="174" x2="545" y2="174" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="75" y1="226" x2="545" y2="226" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="310" y1="70" x2="310" y2="280" stroke="#334155" stroke-width="2"/>
  <text x="192" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#1e293b">Marks less than</text>
  <text x="428" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#1e293b">Cumulative frequency</text>
  <text x="192" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">10</text>
  <text x="192" y="206" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">20</text>
  <text x="192" y="258" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">30</text>
  <text x="428" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">5</text>
  <text x="428" y="206" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">14</text>
  <text x="428" y="258" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">26</text>
  <text x="310" y="305" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569">The full table continues in the question.</text>
</svg>`,
};

const modeTableFigure: ItemFigure = {
  type: "svg",
  title: "Grouped demand table",
  description:
    "A grouped frequency table whose highest frequency determines the modal class.",
  svg: `<svg viewBox="0 0 620 350" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="350" fill="#ffffff"/>
  <text x="310" y="36" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Daily notebook demand</text>
  <rect x="80" y="65" width="460" height="235" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="112" x2="540" y2="112" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="159" x2="540" y2="159" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="80" y1="206" x2="540" y2="206" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="80" y1="253" x2="540" y2="253" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="310" y1="65" x2="310" y2="300" stroke="#334155" stroke-width="2"/>
  <text x="195" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#1e293b">Demand interval</text>
  <text x="425" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#1e293b">Number of days</text>
  <text x="195" y="143" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">0-10</text>
  <text x="195" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">10-20</text>
  <text x="195" y="237" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">20-30</text>
  <text x="195" y="284" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">30-40</text>
  <text x="425" y="143" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">5</text>
  <text x="425" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">12</text>
  <text x="425" y="237" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">20</text>
  <text x="425" y="284" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1e293b">16</text>
</svg>`,
};

const spinnerFigure: ItemFigure = {
  type: "svg",
  title: "Equal-sector spinner",
  description:
    "A spinner divided into eight equal labelled sectors for a probability question.",
  svg: `<svg viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="420" height="420" fill="#ffffff"/>
  <circle cx="210" cy="210" r="150" fill="#f8fafc" stroke="#334155" stroke-width="4"/>
  <path d="M210 210 L210 60 A150 150 0 0 1 316.1 103.9 Z" fill="#bfdbfe" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L316.1 103.9 A150 150 0 0 1 360 210 Z" fill="#bfdbfe" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L360 210 A150 150 0 0 1 316.1 316.1 Z" fill="#bbf7d0" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L316.1 316.1 A150 150 0 0 1 210 360 Z" fill="#bbf7d0" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L210 360 A150 150 0 0 1 103.9 316.1 Z" fill="#fecaca" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L103.9 316.1 A150 150 0 0 1 60 210 Z" fill="#fecaca" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L60 210 A150 150 0 0 1 103.9 103.9 Z" fill="#fde68a" stroke="#ffffff" stroke-width="3"/>
  <path d="M210 210 L103.9 103.9 A150 150 0 0 1 210 60 Z" fill="#fde68a" stroke="#ffffff" stroke-width="3"/>
  <circle cx="210" cy="210" r="8" fill="#334155"/>
  <path d="M210 210 L290 120" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
  <polygon points="295,114 285,126 302,130" fill="#0f172a"/>
  <text x="263" y="94" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1e3a8a">Blue</text>
  <text x="335" y="166" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1e3a8a">Blue</text>
  <text x="334" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#166534">Green</text>
  <text x="263" y="333" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#166534">Green</text>
  <text x="156" y="333" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#991b1b">Red</text>
  <text x="86" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#991b1b">Red</text>
  <text x="86" y="166" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#92400e">Yellow</text>
  <text x="156" y="94" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#92400e">Yellow</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "7.1",
    title: "Mean of Grouped Data",
    subtopic: "Direct, assumed-mean and step-deviation methods",
    mc: [
      {
        questionLatex: L`For the distribution shown, the mean marks are`,
        difficulty: 1,
        figure: meanTableFigure,
        skillTags: ["grouped_mean", "direct_method"],
        choices: [L`$18$`, L`$19$`, L`$20$`, L`$21$`],
        correctLetter: "A",
        rationales: {
          B: L`This is too high because the midpoint $25$ has frequency $5$, but the lower classes still pull the mean down.`,
          C: L`This treats the last class as if it dominates the distribution more than it does.`,
          D: L`This is above the highest weighted middle suggested by the table.`,
        },
        hints: [
          L`Use class marks, not class limits.`,
          L`The class marks are $5,15,25$.`,
          L`Compute $\frac{\sum f_ix_i}{\sum f_i}$.`,
        ],
        solution: [
          { explanation: L`The class marks are $5,15,25$.` },
          { explanation: L`The total frequency is $2+3+5=10$.` },
          {
            explanation: L`The weighted sum is`,
            math: L`2(5)+3(15)+5(25)=180`,
          },
          { explanation: L`Mean $=\frac{180}{10}=18$.` },
        ],
      },
      {
        questionLatex: L`For class intervals $10$-$20$, $20$-$30$, $30$-$40$, $40$-$50$ with frequencies $6,10,12,2$, the assumed-mean method with $A=35$ gives $\sum f_id_i=-200$ and $\sum f_i=30$. The mean is`,
        difficulty: 2,
        skillTags: ["grouped_mean", "assumed_mean_method"],
        choices: [L`$28.33$`, L`$31.67$`, L`$35.00$`, L`$41.67$`],
        correctLetter: "A",
        rationales: {
          B: L`This adds the correction with the wrong sign. Here $\sum f_id_i$ is negative.`,
          C: L`This ignores the correction term and returns the assumed mean.`,
          D: L`This adds $\frac{200}{30}$ instead of subtracting it.`,
        },
        hints: [
          L`Use $\bar{x}=A+\frac{\sum f_id_i}{\sum f_i}$.`,
          L`The correction is negative.`,
          L`Subtract $\frac{200}{30}$ from $35$.`,
        ],
        solution: [
          {
            explanation: L`Using the assumed-mean formula,`,
            math: L`\bar{x}=35+\frac{-200}{30}`,
          },
          { explanation: L`Therefore $\bar{x}=28.33$ approximately.` },
        ],
      },
      {
        questionLatex: L`In the step-deviation method, $A=35$, $h=10$, $\sum f_iu_i=-23$ and $\sum f_i=30$. The mean is approximately`,
        difficulty: 2,
        skillTags: ["grouped_mean", "step_deviation_method"],
        choices: [L`$27.33$`, L`$34.23$`, L`$35.77$`, L`$42.67$`],
        correctLetter: "A",
        rationales: {
          B: L`This divides by $h$ instead of multiplying the average coded deviation by $h$.`,
          C: L`This uses the wrong sign for $\sum f_iu_i$.`,
          D: L`This adds $10\cdot\frac{23}{30}$ instead of subtracting it.`,
        },
        hints: [
          L`Use $\bar{x}=A+h\frac{\sum f_iu_i}{\sum f_i}$.`,
          L`Here the coded-deviation sum is negative.`,
          L`Compute $35+10\left(\frac{-23}{30}\right)$.`,
        ],
        solution: [
          {
            explanation: L`Substitute in the step-deviation formula.`,
            math: L`\bar{x}=35+10\left(\frac{-23}{30}\right)`,
          },
          { explanation: L`So $\bar{x}=35-\frac{23}{3}=27.33$ approximately.` },
        ],
      },
      {
        questionLatex: L`The frequencies of $0$-$10$, $10$-$20$, $20$-$30$, $30$-$40$ are $5,x,10,5$. If the mean is $20$, then $x$ equals`,
        difficulty: 3,
        skillTags: ["grouped_mean", "missing_frequency"],
        choices: [L`$8$`, L`$10$`, L`$12$`, L`$15$`],
        correctLetter: "B",
        rationales: {
          A: L`This makes the weighted sum too large for the stated total frequency.`,
          C: L`This comes from using $20$ as the class mark of the second class instead of $15$.`,
          D: L`This overcounts the missing frequency and raises the denominator too much.`,
        },
        hints: [
          L`Use class marks $5,15,25,35$.`,
          L`Set $\frac{450+15x}{20+x}=20$.`,
          L`Cross-multiply before solving.`,
        ],
        solution: [
          {
            explanation: L`The weighted sum is`,
            math: L`5(5)+15x+10(25)+5(35)=450+15x`,
          },
          {
            explanation: L`The total frequency is $20+x$, so`,
            math: L`\frac{450+15x}{20+x}=20`,
          },
          { explanation: L`Thus $450+15x=400+20x$, giving $x=10$.` },
        ],
      },
      {
        questionLatex: L`Assertion: The step-deviation method is most convenient when all class intervals have the same width. Reason: In this method $u_i=\frac{x_i-A}{h}$ uses a common class width $h$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "step_deviation_method"],
        choices: [
          L`Both Assertion and Reason are true, and Reason correctly explains Assertion.`,
          L`Both Assertion and Reason are true, but Reason does not explain Assertion.`,
          L`Assertion is true, but Reason is false.`,
          L`Assertion is false, but Reason is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains why a common class width makes the coded deviations simple.`,
          C: L`The formula for $u_i$ is correct when a common $h$ is used.`,
          D: L`The assertion is true for equal-width grouped distributions.`,
        },
        hints: [
          L`Check the formula used in step deviation.`,
          L`Ask why a common $h$ is useful.`,
          L`This is not only a true reason; it explains the assertion.`,
        ],
        solution: [
          {
            explanation: L`The formula $u_i=\frac{x_i-A}{h}$ requires the same $h$ to code all class marks consistently.`,
          },
          {
            explanation: L`Therefore both statements are true and the reason explains the assertion.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`For the distribution $0$-$10:2$, $10$-$20:3$, $20$-$30:5$, find the mean.`,
        difficulty: 1,
        figure: meanTableFigure,
        skillTags: ["grouped_mean", "direct_method"],
        parts: singlePart("a", L`Find the mean.`, 1),
        hints: [
          L`Use the midpoints $5,15,25$.`,
          L`Find $\sum f_ix_i$.`,
          L`Divide by the total frequency.`,
        ],
        rubric: singleRubric("a", 1, L`Gets mean $18$.`),
        commonErrors: [
          L`Averaging the class intervals instead of weighting by frequency.`,
          L`Using upper limits as class marks.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Mean $=\frac{2(5)+3(15)+5(25)}{2+3+5}=\frac{180}{10}=18$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The numbers of students scoring $10$-$20$, $20$-$30$, $30$-$40$, $40$-$50$ are $4,8,6,2$ respectively. Find the mean score.`,
        difficulty: 2,
        skillTags: ["grouped_mean", "direct_method"],
        parts: singlePart("a", L`Find the mean score.`, 3),
        hints: [
          L`Write the class marks.`,
          L`Multiply each class mark by its frequency.`,
          L`Divide by $20$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Uses class marks $15,25,35,45$.` },
            { part: "a", points: 1, description: L`Finds $\sum f_ix_i=560$.` },
            { part: "a", points: 1, description: L`Finds mean $28$.` },
          ],
        },
        commonErrors: [
          L`Using frequencies as class marks.`,
          L`Dividing by the number of classes instead of total frequency.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Class marks are $15,25,35,45$. The weighted sum is $4(15)+8(25)+6(35)+2(45)=560$.`,
          },
          { part: "a", explanation: L`Total frequency $=20$, so mean $=\frac{560}{20}=28$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the step-deviation method to find the mean of the following distribution: $20$-$30:4$, $30$-$40:7$, $40$-$50:12$, $50$-$60:7$, $60$-$70:5$.`,
        difficulty: 4,
        skillTags: ["grouped_mean", "step_deviation_method"],
        parts: singlePart("a", L`Find the mean by step deviation.`, 5),
        hints: [
          L`Take $A=45$ and $h=10$.`,
          L`Use coded deviations $-2,-1,0,1,2$.`,
          L`Compute $A+h\frac{\sum f_iu_i}{\sum f_i}$.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Writes class marks and coded deviations correctly.` },
            { part: "a", points: 1, description: L`Computes $\sum f_i=35$.` },
            { part: "a", points: 1, description: L`Computes $\sum f_iu_i=2$.` },
            { part: "a", points: 1, description: L`Substitutes in the step-deviation formula.` },
            { part: "a", points: 1, description: L`Gets $\bar{x}=45+\frac47$.` },
          ],
        },
        commonErrors: [
          L`Forgetting to multiply the coded mean by $h$.`,
          L`Taking $A$ as a class limit instead of a class mark.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Class marks are $25,35,45,55,65$. Take $A=45$ and $h=10$.` },
          { part: "a", explanation: L`Then $u_i=-2,-1,0,1,2$, so $\sum f_iu_i=4(-2)+7(-1)+12(0)+7(1)+5(2)=2$.` },
          { part: "a", explanation: L`Also $\sum f_i=35$. Hence $\bar{x}=45+10\cdot\frac{2}{35}=45+\frac47$.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher groups the time, in minutes, taken by $30$ students to complete a worksheet as follows: $0$-$5:4$, $5$-$10:8$, $10$-$15:12$, $15$-$20:6$.`,
        difficulty: 3,
        skillTags: ["grouped_mean", "interpretation"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the class marks.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the mean completion time.`, points: 3 },
          { letter: "c", promptMarkdown: L`State whether the mean lies in the most frequent class.`, points: 1 },
        ],
        hints: [
          L`Class marks are midpoints.`,
          L`Use $\frac{\sum f_ix_i}{30}$.`,
          L`Compare the mean with the interval $10$-$15$.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Finds class marks $2.5,7.5,12.5,17.5$.` },
            { part: "b", points: 2, description: L`Finds weighted sum $325$.` },
            { part: "b", points: 1, description: L`Finds mean $\frac{65}{6}$ minutes.` },
            { part: "c", points: 1, description: L`Correctly says the mean lies in $10$-$15$.` },
          ],
        },
        commonErrors: [
          L`Using class width $5$ as every class mark.`,
          L`Stating the most frequent class without checking where the mean lies.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The class marks are $2.5,7.5,12.5,17.5$.` },
          { part: "b", explanation: L`Weighted sum $=4(2.5)+8(7.5)+12(12.5)+6(17.5)=325$. Mean $=\frac{325}{30}=\frac{65}{6}$ minutes.` },
          { part: "c", explanation: L`Since $\frac{65}{6}=10.83\ldots$, it lies in the interval $10$-$15$, which is also the most frequent class.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The frequencies of $10$-$20$, $20$-$30$, $30$-$40$, $40$-$50$ are $4,x,10,6$. If the mean is $30$, find $x$.`,
        difficulty: 3,
        skillTags: ["grouped_mean", "missing_frequency"],
        parts: singlePart("a", L`Find the missing frequency.`, 3),
        hints: [
          L`Use class marks $15,25,35,45$.`,
          L`Write the weighted sum in terms of $x$.`,
          L`Set the mean equal to $30$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Forms weighted sum $680+25x$.` },
            { part: "a", points: 1, description: L`Forms total frequency $20+x$.` },
            { part: "a", points: 1, description: L`Solves $x=16$.` },
          ],
        },
        commonErrors: [
          L`Using $20,30,40,50$ as class marks.`,
          L`Forgetting that $x$ changes both numerator and denominator.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The weighted sum is $4(15)+25x+10(35)+6(45)=680+25x$.` },
          { part: "a", explanation: L`Total frequency is $20+x$, so $\frac{680+25x}{20+x}=30$.` },
          { part: "a", explanation: L`Thus $680+25x=600+30x$, giving $x=16$.` },
        ],
      },
    ],
  },
  {
    topicCode: "7.2",
    title: "Median of Grouped Data",
    subtopic: "Median class and grouped-data median formula",
    mc: [
      {
        questionLatex: L`For the distribution $0$-$10:4$, $10$-$20:7$, $20$-$30:12$, $30$-$40:10$, $40$-$50:7$, the median is`,
        difficulty: 2,
        skillTags: ["grouped_median", "median_formula"],
        choices: [L`$27.5$`, L`$25$`, L`$30$`, L`$32.5$`],
        correctLetter: "A",
        rationales: {
          B: L`This is the midpoint of the median class, not the formula value.`,
          C: L`This uses the upper boundary of the median class as the median.`,
          D: L`This treats the previous cumulative frequency incorrectly.`,
        },
        hints: [
          L`Find $N/2$.`,
          L`The median class is $20$-$30$.`,
          L`Use $l+\frac{\frac N2-c_f}{f}h$.`,
        ],
        solution: [
          { explanation: L`Here $N=40$, so $N/2=20$. Cumulative frequency before $20$-$30$ is $11$.` },
          { explanation: L`Using $l=20$, $f=12$, $h=10$,`, math: L`\text{Median}=20+\frac{20-11}{12}\cdot10=27.5` },
        ],
      },
      {
        questionLatex: L`A less-than cumulative frequency table begins as shown. The full cumulative frequencies for marks less than $10,20,30,40,50$ are $5,14,26,35,40$. The median class is`,
        difficulty: 2,
        figure: medianTableFigure,
        skillTags: ["grouped_median", "cumulative_frequency"],
        choices: [L`$10$-$20$`, L`$20$-$30$`, L`$30$-$40$`, L`$40$-$50$`],
        correctLetter: "B",
        rationales: {
          A: L`This class ends before the cumulative frequency reaches $N/2=20$.`,
          C: L`This is the class after the median class.`,
          D: L`This is too far above the $20$th observation.`,
        },
        hints: [
          L`The total frequency is the last cumulative frequency.`,
          L`Compute $N/2$.`,
          L`Find where the cumulative frequency first exceeds $20$.`,
        ],
        solution: [
          { explanation: L`The total frequency is $40$, so $N/2=20$.` },
          { explanation: L`The cumulative frequency changes from $14$ to $26$ in the class $20$-$30$, so that is the median class.` },
        ],
      },
      {
        questionLatex: L`For a grouped distribution, $N=50$ and the cumulative frequencies are $6,18,31,42,50$. The median class is the class corresponding to the cumulative frequency`,
        difficulty: 2,
        skillTags: ["grouped_median", "median_class"],
        choices: [L`$18$`, L`$31$`, L`$42$`, L`$50$`],
        correctLetter: "B",
        rationales: {
          A: L`This is still below $N/2=25$.`,
          C: L`This is after the median class; the first cumulative frequency above $25$ is already $31$.`,
          D: L`This is the total frequency, not the median class.`,
        },
        hints: [
          L`Median position is $N/2$.`,
          L`Here $N/2=25$.`,
          L`Use the first cumulative frequency greater than $25$.`,
        ],
        solution: [
          { explanation: L`Since $N=50$, $N/2=25$.` },
          { explanation: L`The first cumulative frequency greater than $25$ is $31$, so the median class is the class corresponding to $31$.` },
        ],
      },
      {
        questionLatex: L`If $l=30$, $c_f=18$, $f=12$, $h=10$ and $N=50$, the grouped-data median is approximately`,
        difficulty: 2,
        skillTags: ["grouped_median", "median_formula"],
        choices: [L`$35.83$`, L`$34.17$`, L`$40.00$`, L`$45.83$`],
        correctLetter: "A",
        rationales: {
          B: L`This subtracts the fractional part from $l$ instead of adding it.`,
          C: L`This uses the upper limit directly.`,
          D: L`This uses $N$ instead of $N/2$ in the numerator.`,
        },
        hints: [
          L`The median position is $25$.`,
          L`Subtract the previous cumulative frequency $18$.`,
          L`Multiply the fraction by the class width $10$.`,
        ],
        solution: [
          {
            explanation: L`Using the median formula,`,
            math: L`\text{Median}=30+\frac{25-18}{12}\cdot10=35.83\ldots`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: The median class is the class whose cumulative frequency is just greater than $\frac N2$. Reason: The median divides the ordered data into two equal parts.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "grouped_median"],
        choices: [
          L`Both Assertion and Reason are true, and Reason correctly explains Assertion.`,
          L`Both Assertion and Reason are true, but Reason does not explain Assertion.`,
          L`Assertion is true, but Reason is false.`,
          L`Assertion is false, but Reason is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason explains why the $N/2$ position is used to locate the median class.`,
          C: L`The reason is a correct interpretation of the median.`,
          D: L`The assertion is true for grouped data.`,
        },
        hints: [
          L`Think of the median as a position in ordered data.`,
          L`For grouped data, cumulative frequency locates that position.`,
          L`The reason directly supports the assertion.`,
        ],
        solution: [
          { explanation: L`The median is the central position, so in grouped data we locate the class containing the $\frac N2$th observation.` },
          { explanation: L`Therefore both statements are true and the reason explains the assertion.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In a distribution with total frequency $40$, the cumulative frequencies are $4,11,23,36,40$. Which cumulative frequency locates the median class?`,
        difficulty: 1,
        skillTags: ["grouped_median", "median_class"],
        parts: singlePart("a", L`State the cumulative frequency that locates the median class.`, 1),
        hints: [
          L`Find $N/2$.`,
          L`Use the first cumulative frequency greater than $20$.`,
          L`Do not choose the last cumulative frequency unless the median lies there.`,
        ],
        rubric: singleRubric("a", 1, L`Identifies $23$.`),
        commonErrors: [
          L`Choosing $40$ because it is the total frequency.`,
          L`Choosing $11$ because it is just before $20$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Here $N/2=20$. The first cumulative frequency greater than $20$ is $23$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the median for $0$-$10:5$, $10$-$20:8$, $20$-$30:10$, $30$-$40:7$.`,
        difficulty: 2,
        skillTags: ["grouped_median", "median_formula"],
        parts: singlePart("a", L`Find the median.`, 3),
        hints: [
          L`Compute cumulative frequencies.`,
          L`The total frequency is $30$.`,
          L`Use the class containing the $15$th observation.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Identifies median class $20$-$30$.` },
            { part: "a", points: 1, description: L`Substitutes $l=20$, $c_f=13$, $f=10$, $h=10$.` },
            { part: "a", points: 1, description: L`Gets median $22$.` },
          ],
        },
        commonErrors: [
          L`Using $N$ instead of $N/2$.`,
          L`Using the cumulative frequency of the median class as $c_f$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Total frequency $N=30$, so $N/2=15$. Cumulative frequencies are $5,13,23,30$, so the median class is $20$-$30$.` },
          { part: "a", explanation: L`Median $=20+\frac{15-13}{10}\cdot10=22$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`The marks of $40$ students are grouped as $0$-$20:6$, $20$-$40:8$, $40$-$60:14$, $60$-$80:10$, $80$-$100:2$. Find the median marks.`,
        difficulty: 4,
        skillTags: ["grouped_median", "wide_class_intervals"],
        parts: singlePart("a", L`Find the median marks.`, 5),
        hints: [
          L`The class width is $20$.`,
          L`Find the class containing the $20$th observation.`,
          L`Use $l+\frac{\frac N2-c_f}{f}h$.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Computes cumulative frequencies correctly.` },
            { part: "a", points: 1, description: L`Identifies median class $40$-$60$.` },
            { part: "a", points: 1, description: L`Uses $l=40$, $c_f=14$, $f=14$, $h=20$.` },
            { part: "a", points: 1, description: L`Computes the fractional correction $\frac{60}{7}$.` },
            { part: "a", points: 1, description: L`Gets median $\frac{340}{7}$, about $48.57$.` },
          ],
        },
        commonErrors: [
          L`Using class width $10$ even though the intervals have width $20$.`,
          L`Taking $c_f=28$ instead of the cumulative frequency before the median class.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Cumulative frequencies are $6,14,28,38,40$. Since $N/2=20$, the median class is $40$-$60$.` },
          { part: "a", explanation: L`Median $=40+\frac{20-14}{14}\cdot20=40+\frac{60}{7}=\frac{340}{7}=48.57$ approximately.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A clinic records waiting times, in minutes, using a less-than cumulative table: less than $5:3$, less than $10:11$, less than $15:23$, less than $20:34$, less than $25:40$.`,
        difficulty: 3,
        skillTags: ["grouped_median", "cumulative_frequency"],
        parts: [
          { letter: "a", promptMarkdown: L`Convert the cumulative table into class frequencies.`, points: 2 },
          { letter: "b", promptMarkdown: L`Identify the median class.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find the median waiting time.`, points: 2 },
        ],
        hints: [
          L`Subtract consecutive cumulative frequencies to get class frequencies.`,
          L`Use $N/2=20$.`,
          L`The class width is $5$ minutes.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: L`Finds frequencies $3,8,12,11,6$.` },
            { part: "b", points: 1, description: L`Identifies median class $10$-$15$.` },
            { part: "c", points: 2, description: L`Finds median $\frac{55}{4}=13.75$ minutes.` },
          ],
        },
        commonErrors: [
          L`Using cumulative frequencies as class frequencies.`,
          L`Taking the class after the median class because $23$ is already above $20$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Class frequencies are $3$, $11-3=8$, $23-11=12$, $34-23=11$, $40-34=6$.` },
          { part: "b", explanation: L`Here $N=40$, so $N/2=20$. The cumulative frequency first exceeds $20$ in $10$-$15$.` },
          { part: "c", explanation: L`Median $=10+\frac{20-11}{12}\cdot5=10+\frac{15}{4}=13.75$ minutes.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student says, "The median of grouped data is always the midpoint of the median class." Correct the statement using the median formula.`,
        difficulty: 3,
        skillTags: ["grouped_median", "concept_correction"],
        parts: singlePart("a", L`Correct the statement.`, 3),
        hints: [
          L`The midpoint is only sometimes equal to the formula value.`,
          L`Write the grouped median formula.`,
          L`Mention the role of cumulative frequency and frequency of the median class.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Rejects the word "always".` },
            { part: "a", points: 1, description: L`States the grouped median formula.` },
            { part: "a", points: 1, description: L`Explains that $c_f$ and $f$ affect the position inside the class.` },
          ],
        },
        commonErrors: [
          L`Giving only a numerical example without correcting the general statement.`,
          L`Calling the class mark the median for every grouped distribution.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The statement is false. For grouped data, $\text{Median}=l+\frac{\frac N2-c_f}{f}h$.` },
          { part: "a", explanation: L`The median equals the midpoint only in special cases; generally it depends on the previous cumulative frequency and the frequency of the median class.` },
        ],
      },
    ],
  },
  {
    topicCode: "7.3",
    title: "Mode of Grouped Data",
    subtopic: "Modal class, mode formula and representative averages",
    mc: [
      {
        questionLatex: L`In the demand table shown, the modal class is`,
        difficulty: 1,
        figure: modeTableFigure,
        skillTags: ["grouped_mode", "modal_class"],
        choices: [L`$10$-$20$`, L`$20$-$30$`, L`$30$-$40$`, L`$0$-$10$`],
        correctLetter: "B",
        rationales: {
          A: L`This class has frequency $12$, not the highest frequency.`,
          C: L`This class has frequency $16$, which is less than $20$.`,
          D: L`This is the first class, but it is not the most frequent class.`,
        },
        hints: [
          L`Mode is linked to the highest frequency.`,
          L`Compare the frequencies in the table.`,
          L`The class with frequency $20$ is modal.`,
        ],
        solution: [
          { explanation: L`The highest frequency is $20$, and it belongs to the class $20$-$30$.` },
        ],
      },
      {
        questionLatex: L`For $0$-$10:5$, $10$-$20:12$, $20$-$30:20$, $30$-$40:16$, $40$-$50:7$, the mode is approximately`,
        difficulty: 2,
        skillTags: ["grouped_mode", "mode_formula"],
        choices: [L`$26.67$`, L`$25.00$`, L`$28.33$`, L`$30.00$`],
        correctLetter: "A",
        rationales: {
          B: L`This is just the midpoint of the modal class.`,
          C: L`This uses $f_2$ and $f_0$ in the wrong order.`,
          D: L`This is the upper boundary of the modal class, not the mode.`,
        },
        hints: [
          L`The modal class is $20$-$30$.`,
          L`Use $f_1=20$, $f_0=12$, $f_2=16$.`,
          L`Apply $l+\frac{f_1-f_0}{2f_1-f_0-f_2}h$.`,
        ],
        solution: [
          {
            explanation: L`Using $l=20$, $h=10$, $f_1=20$, $f_0=12$, $f_2=16$,`,
            math: L`\text{Mode}=20+\frac{20-12}{40-12-16}\cdot10=26.67`,
          },
        ],
      },
      {
        questionLatex: L`If the preceding and succeeding frequencies of the modal class are equal, then the grouped mode lies`,
        difficulty: 2,
        skillTags: ["grouped_mode", "conceptual_formula"],
        choices: [
          L`at the midpoint of the modal class`,
          L`at the lower limit of the modal class`,
          L`at the upper limit of the modal class`,
          L`outside the modal class`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The numerator is not zero unless the preceding frequency equals the modal frequency.`,
          C: L`The correction is half the class width, not the full width.`,
          D: L`The formula still places the mode inside the modal class.`,
        },
        hints: [
          L`Let $f_0=f_2$.`,
          L`Substitute this into the mode formula.`,
          L`The correction becomes $\frac h2$.`,
        ],
        solution: [
          { explanation: L`If $f_0=f_2$, then $\frac{f_1-f_0}{2f_1-f_0-f_2}=\frac{f_1-f_0}{2(f_1-f_0)}=\frac12$.` },
          { explanation: L`So mode $=l+\frac h2$, the midpoint of the modal class.` },
        ],
      },
      {
        questionLatex: L`For classes $0$-$10$, $10$-$20$, $20$-$30$, $30$-$40$ with frequencies $6,14,18,10$, the mode is approximately`,
        difficulty: 3,
        skillTags: ["grouped_mode", "mode_formula"],
        choices: [L`$23.33$`, L`$22.50$`, L`$25.00$`, L`$26.67$`],
        correctLetter: "A",
        rationales: {
          B: L`This comes from treating the correction as exactly one-fourth of the class width.`,
          C: L`This is the class mark, not the formula value.`,
          D: L`This uses the preceding and succeeding frequencies in the wrong places.`,
        },
        hints: [
          L`The modal class is $20$-$30$.`,
          L`Use $f_1=18$, $f_0=14$, $f_2=10$.`,
          L`The denominator is $2(18)-14-10$.`,
        ],
        solution: [
          { explanation: L`Mode $=20+\frac{18-14}{36-14-10}\cdot10=20+\frac{40}{12}=23.33$ approximately.` },
        ],
      },
      {
        questionLatex: L`Assertion: The class with the greatest frequency is called the modal class. Reason: The mode represents the value or class that occurs most frequently.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "grouped_mode", "interpretation"],
        choices: [
          L`Both Assertion and Reason are true, and Reason correctly explains Assertion.`,
          L`Both Assertion and Reason are true, but Reason does not explain Assertion.`,
          L`Assertion is true, but Reason is false.`,
          L`Assertion is false, but Reason is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains why the greatest-frequency class is called the modal class.`,
          C: L`The reason is true; it states what mode represents.`,
          D: L`The assertion is true for a grouped frequency distribution.`,
        },
        hints: [
          L`Recall the meaning of mode.`,
          L`For grouped data, identify the class with maximum frequency.`,
          L`The reason explains the assertion.`,
        ],
        solution: [
          { explanation: L`The modal class is the class with the maximum frequency because mode represents the most frequently occurring value or class.` },
          { explanation: L`Thus both statements are true and the reason explains the assertion.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`The frequencies of $0$-$10$, $10$-$20$, $20$-$30$, $30$-$40$ are $4,9,15,12$. State the modal class.`,
        difficulty: 1,
        skillTags: ["grouped_mode", "modal_class"],
        parts: singlePart("a", L`State the modal class.`, 1),
        hints: [
          L`Look for the highest frequency.`,
          L`The highest frequency is $15$.`,
          L`Report the class, not the frequency.`,
        ],
        rubric: singleRubric("a", 1, L`Identifies $20$-$30$ as the modal class.`),
        commonErrors: [
          L`Writing $15$ instead of the class interval.`,
          L`Choosing the middle class without checking the frequency.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The highest frequency is $15$, so the modal class is $20$-$30$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the mode of $10$-$20:5$, $20$-$30:9$, $30$-$40:14$, $40$-$50:8$, $50$-$60:4$.`,
        difficulty: 3,
        skillTags: ["grouped_mode", "mode_formula"],
        parts: singlePart("a", L`Find the mode.`, 3),
        hints: [
          L`Identify the modal class first.`,
          L`Use $l=30$, $f_1=14$, $f_0=9$, $f_2=8$, $h=10$.`,
          L`Apply the grouped mode formula.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Identifies modal class $30$-$40$.` },
            { part: "a", points: 1, description: L`Substitutes correctly in the mode formula.` },
            { part: "a", points: 1, description: L`Gets mode $\frac{380}{11}$, about $34.55$.` },
          ],
        },
        commonErrors: [
          L`Using the median formula instead of the mode formula.`,
          L`Using the frequency of the next class as $f_0$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The modal class is $30$-$40$, so $l=30$, $h=10$, $f_1=14$, $f_0=9$, $f_2=8$.` },
          { part: "a", explanation: L`Mode $=30+\frac{14-9}{28-9-8}\cdot10=30+\frac{50}{11}=\frac{380}{11}=34.55$ approximately.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For the distribution $0$-$10:4$, $10$-$20:8$, $20$-$30:18$, $30$-$40:12$, $40$-$50:8$, find both the median and the mode. Which one is smaller?`,
        difficulty: 4,
        skillTags: ["grouped_median", "grouped_mode", "comparison"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the median.`, points: 3 },
          { letter: "b", promptMarkdown: L`Find the mode.`, points: 3 },
          { letter: "c", promptMarkdown: L`State which is smaller.`, points: 1 },
        ],
        hints: [
          L`Total frequency is $50$.`,
          L`Both median and mode use the class $20$-$30$.`,
          L`Use the correct formula for each average.`,
        ],
        rubric: {
          maxPoints: 7,
          criteria: [
            { part: "a", points: 1, description: L`Identifies median class $20$-$30$.` },
            { part: "a", points: 2, description: L`Finds median $\frac{245}{9}$, about $27.22$.` },
            { part: "b", points: 1, description: L`Identifies modal class $20$-$30$.` },
            { part: "b", points: 2, description: L`Finds mode $26.25$.` },
            { part: "c", points: 1, description: L`States that the mode is smaller.` },
          ],
        },
        commonErrors: [
          L`Using one formula for both median and mode.`,
          L`Comparing class intervals instead of the computed averages.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Cumulative frequencies are $4,12,30,42,50$. Since $N/2=25$, the median class is $20$-$30$.` },
          { part: "a", explanation: L`Median $=20+\frac{25-12}{18}\cdot10=20+\frac{65}{9}=\frac{245}{9}=27.22$ approximately.` },
          { part: "b", explanation: L`The modal class is $20$-$30$. Mode $=20+\frac{18-8}{36-8-12}\cdot10=20+\frac{100}{16}=26.25$.` },
          { part: "c", explanation: L`Since $26.25<27.22$, the mode is smaller.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A stationery shop records the number of notebooks sold per day for $60$ days: $0$-$10:5$, $10$-$20:13$, $20$-$30:22$, $30$-$40:15$, $40$-$50:5$.`,
        difficulty: 4,
        skillTags: ["grouped_mean", "grouped_mode", "business_context"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the modal class and explain what it means here.`, points: 2 },
          { letter: "b", promptMarkdown: L`Find the approximate mode.`, points: 3 },
          { letter: "c", promptMarkdown: L`Find the mean number of notebooks sold per day.`, points: 2 },
        ],
        hints: [
          L`The highest frequency is $22$.`,
          L`For mode, use $l=20$, $f_1=22$, $f_0=13$, $f_2=15$.`,
          L`For mean, use class marks $5,15,25,35,45$.`,
        ],
        rubric: {
          maxPoints: 7,
          criteria: [
            { part: "a", points: 2, description: L`Identifies $20$-$30$ and interprets it as the most common daily demand range.` },
            { part: "b", points: 3, description: L`Finds mode $25.625$.` },
            { part: "c", points: 2, description: L`Finds mean $\frac{1520}{60}=\frac{76}{3}$.` },
          ],
        },
        commonErrors: [
          L`Reporting the frequency $22$ as the mode.`,
          L`Using the modal class midpoint for the mode even though the formula is requested.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The modal class is $20$-$30$ because it has the highest frequency, $22$. It means this was the most common daily sales range.` },
          { part: "b", explanation: L`Mode $=20+\frac{22-13}{44-13-15}\cdot10=20+\frac{90}{16}=25.625$.` },
          { part: "c", explanation: L`Mean $=\frac{5(5)+13(15)+22(25)+15(35)+5(45)}{60}=\frac{1520}{60}=\frac{76}{3}$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A distribution has modal class $40$-$50$, with $f_0=12$, $f_1=20$, $f_2=16$ and class width $10$. Find its mode.`,
        difficulty: 2,
        skillTags: ["grouped_mode", "mode_formula"],
        parts: singlePart("a", L`Find the mode.`, 3),
        hints: [
          L`Here $l=40$.`,
          L`Use $f_1-f_0$ in the numerator.`,
          L`The denominator is $2f_1-f_0-f_2$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Uses the mode formula correctly.` },
            { part: "a", points: 1, description: L`Substitutes $40+\frac{8}{12}\cdot10$.` },
            { part: "a", points: 1, description: L`Gets $46.67$ approximately.` },
          ],
        },
        commonErrors: [
          L`Using $f_1+f_0$ in the numerator.`,
          L`Taking $45$ directly as the mode.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Mode $=40+\frac{20-12}{40-12-16}\cdot10=40+\frac{20}{3}=46.67$ approximately.` },
        ],
      },
    ],
  },
  {
    topicCode: "7.4",
    title: "Mixed Statistics Applications",
    subtopic: "Choosing and connecting grouped-data methods",
    mc: [
      {
        questionLatex: L`For equal class intervals with large class marks, the step-deviation method is usually preferred because it`,
        difficulty: 2,
        skillTags: ["method_choice", "grouped_mean"],
        choices: [
          L`reduces the arithmetic by using coded deviations`,
          L`changes the value of the mean`,
          L`does not require frequencies`,
          L`can be used only when the total frequency is $100$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Changing method does not change the correct mean.`,
          C: L`All grouped-mean methods still require frequencies.`,
          D: L`There is no such restriction on total frequency.`,
        },
        hints: [
          L`Think about why $u_i$ is introduced.`,
          L`The method simplifies calculations; it does not alter the average.`,
          L`Frequencies are still used in $\sum f_iu_i$.`,
        ],
        solution: [
          { explanation: L`Step deviation converts class marks into smaller coded values, making arithmetic easier while preserving the same mean.` },
        ],
      },
      {
        questionLatex: L`The frequencies of $0$-$10$, $10$-$20$, $20$-$30$, $30$-$40$ are $4,x,10,6$. If the mean is $20$, then $x$ is`,
        difficulty: 3,
        skillTags: ["missing_frequency", "grouped_mean"],
        choices: [L`$12$`, L`$14$`, L`$16$`, L`$18$`],
        correctLetter: "C",
        rationales: {
          A: L`This gives a mean larger than $20$ because the lower-frequency class is still too small.`,
          B: L`This is close, but substituting it does not make the weighted mean exactly $20$.`,
          D: L`This overweights the $10$-$20$ class.`,
        },
        hints: [
          L`Use class marks $5,15,25,35$.`,
          L`Set $\frac{480+15x}{20+x}=20$.`,
          L`Solve the linear equation after cross-multiplication.`,
        ],
        solution: [
          { explanation: L`The weighted sum is $4(5)+15x+10(25)+6(35)=480+15x$.` },
          { explanation: L`Since total frequency is $20+x$, $\frac{480+15x}{20+x}=20$.` },
          { explanation: L`So $480+15x=400+20x$, giving $x=16$.` },
        ],
      },
      {
        questionLatex: L`A grouped distribution has mean $32$, median $29$ and mode $24$. Which statement is definitely supported by these three summaries?`,
        difficulty: 3,
        skillTags: ["interpretation", "statistics_summary"],
        choices: [
          L`The three measures need not be equal for the same distribution.`,
          L`The total frequency must be $32+29+24$.`,
          L`The modal class must contain $32$.`,
          L`The median class must be the last class.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Averages are not frequencies and cannot be added to get total frequency.`,
          C: L`Mode $24$ does not force the modal class to contain the mean $32$.`,
          D: L`Median $29$ gives no such information about the last class.`,
        },
        hints: [
          L`Mean, median and mode summarize different features.`,
          L`Do not treat average values as counts.`,
          L`Only one option is a general truth.`,
        ],
        solution: [
          { explanation: L`Mean, median and mode can differ because they measure different aspects of the distribution.` },
        ],
      },
      {
        questionLatex: L`In a grouped distribution, the class width is doubled while all frequencies and class marks are still correctly used in the direct method. The direct-method mean calculation`,
        difficulty: 3,
        skillTags: ["grouped_mean", "conceptual_check"],
        choices: [
          L`depends on the class marks actually used, not on class width alone`,
          L`must double automatically`,
          L`must become half automatically`,
          L`is impossible because direct method requires class width $10$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The mean does not double merely because class width is larger.`,
          C: L`There is no automatic halving rule for grouped means.`,
          D: L`The direct method has no class-width-$10$ restriction.`,
        },
        hints: [
          L`Direct method uses $\sum f_ix_i$.`,
          L`Class width helps define class marks, but it is not substituted alone.`,
          L`There is no automatic scaling rule unless every observation is scaled.`,
        ],
        solution: [
          { explanation: L`The direct method is $\bar{x}=\frac{\sum f_ix_i}{\sum f_i}$, so the result depends on the class marks and frequencies used.` },
        ],
      },
      {
        questionLatex: L`Assertion: A table used for median must first be converted into cumulative frequencies. Reason: The median is located by position in the ordered data.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "grouped_median"],
        choices: [
          L`Both Assertion and Reason are true, and Reason correctly explains Assertion.`,
          L`Both Assertion and Reason are true, but Reason does not explain Assertion.`,
          L`Assertion is true, but Reason is false.`,
          L`Assertion is false, but Reason is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason is exactly why cumulative frequencies are useful for the median.`,
          C: L`The reason is true.`,
          D: L`The assertion is true for a frequency table when applying the grouped median formula.`,
        },
        hints: [
          L`Ask how the $N/2$th observation is located.`,
          L`Cumulative frequency tracks positions.`,
          L`The reason explains the need.`,
        ],
        solution: [
          { explanation: L`Cumulative frequency tells how many observations lie below each class, so it locates the $N/2$th observation.` },
          { explanation: L`Therefore both statements are true and the reason explains the assertion.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`A frequency table has class intervals $0$-$10$, $10$-$20$, $20$-$30$ with frequencies $2,5,3$. Find the mean and identify the modal class.`,
        difficulty: 2,
        skillTags: ["grouped_mean", "grouped_mode"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the mean.`, points: 2 },
          { letter: "b", promptMarkdown: L`Identify the modal class.`, points: 1 },
        ],
        hints: [
          L`Use class marks $5,15,25$.`,
          L`The highest frequency identifies the modal class.`,
          L`Keep the two tasks separate.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: L`Finds mean $16$.` },
            { part: "b", points: 1, description: L`Identifies $10$-$20$ as modal class.` },
          ],
        },
        commonErrors: [
          L`Writing the modal class frequency as the mode without naming the class.`,
          L`Using the mode formula when only the modal class is asked.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Mean $=\frac{2(5)+5(15)+3(25)}{10}=\frac{160}{10}=16$.` },
          { part: "b", explanation: L`The highest frequency is $5$, so the modal class is $10$-$20$.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school records daily bicycle arrivals for $50$ days: $0$-$10:6$, $10$-$20:12$, $20$-$30:17$, $30$-$40:10$, $40$-$50:5$.`,
        difficulty: 4,
        skillTags: ["grouped_mean", "grouped_median", "interpretation"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the mean number of bicycle arrivals.`, points: 2 },
          { letter: "b", promptMarkdown: L`Find the median class.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find the median and compare it with the mean.`, points: 3 },
        ],
        hints: [
          L`Use class marks $5,15,25,35,45$ for the mean.`,
          L`For median, $N/2=25$.`,
          L`The median class is $20$-$30$.`,
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            { part: "a", points: 2, description: L`Finds mean $24.2$.` },
            { part: "b", points: 1, description: L`Identifies median class $20$-$30$.` },
            { part: "c", points: 2, description: L`Finds median $\frac{410}{17}$, about $24.12$.` },
            { part: "c", points: 1, description: L`Correctly states mean is slightly greater than median.` },
          ],
        },
        commonErrors: [
          L`Using frequencies as class marks.`,
          L`Comparing the median class with the mean instead of comparing numerical values.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Mean $=\frac{6(5)+12(15)+17(25)+10(35)+5(45)}{50}=\frac{1210}{50}=24.2$.` },
          { part: "b", explanation: L`Cumulative frequencies are $6,18,35,45,50$. Since $N/2=25$, the median class is $20$-$30$.` },
          { part: "c", explanation: L`Median $=20+\frac{25-18}{17}\cdot10=20+\frac{70}{17}=\frac{410}{17}=24.12$ approximately. Hence the mean is slightly greater than the median.` },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A distribution has total frequency $80$. What position is used to locate the median class?`,
        difficulty: 1,
        skillTags: ["grouped_median", "median_position"],
        parts: singlePart("a", L`State the median position.`, 1),
        hints: [
          L`For grouped data, use $N/2$.`,
          L`Here $N=80$.`,
          L`Compute $80/2$.`,
        ],
        rubric: singleRubric("a", 1, L`States the $40$th observation or position $40$.`),
        commonErrors: [
          L`Using $N+1$ by mixing this with ungrouped-data convention.`,
          L`Using $80$ itself as the median position.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The median class is located using $N/2=80/2=40$, so the $40$th observation is used.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A grouped table has class intervals $0$-$10$, $10$-$20$, $20$-$30$, $30$-$40$, $40$-$50$ and frequencies $4,a,12,b,6$. The total frequency is $40$ and the mean is $28$. Find $a$ and $b$, and then find the median.`,
        difficulty: 5,
        skillTags: ["missing_frequency", "grouped_mean", "grouped_median"],
        parts: [
          { letter: "a", promptMarkdown: L`Use the total frequency and mean conditions to find $a$ and $b$.`, points: 3 },
          { letter: "b", promptMarkdown: L`Find the median class.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find the median.`, points: 2 },
        ],
        hints: [
          L`The total frequency gives $a+b=18$.`,
          L`Use class marks $5,15,25,35,45$ to form the mean equation.`,
          L`After finding $a$ and $b$, use cumulative frequencies for the median.`,
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            { part: "a", points: 1, description: L`Forms $a+b=18$.` },
            { part: "a", points: 1, description: L`Forms $15a+35b=530$.` },
            { part: "a", points: 1, description: L`Finds $a=5$ and $b=13$.` },
            { part: "b", points: 1, description: L`Identifies median class $20$-$30$.` },
            { part: "c", points: 1, description: L`Substitutes $l=20$, $c_f=9$, $f=12$, $h=10$.` },
            { part: "c", points: 1, description: L`Finds median $\frac{175}{6}$, about $29.17$.` },
          ],
        },
        commonErrors: [
          L`Using class limits instead of class marks in the mean equation.`,
          L`Finding $a$ and $b$ correctly but using the old cumulative frequency before the median class.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`From total frequency, $4+a+12+b+6=40$, so $a+b=18$.` },
          { part: "a", explanation: L`Using class marks $5,15,25,35,45$, the weighted sum is $4(5)+15a+12(25)+35b+6(45)=590+15a+35b$.` },
          { part: "a", explanation: L`Since mean is $28$ and total frequency is $40$, $590+15a+35b=1120$, so $15a+35b=530$. Solving with $a+b=18$ gives $a=5$, $b=13$.` },
          { part: "b", explanation: L`The frequencies are $4,5,12,13,6$, so cumulative frequencies are $4,9,21,34,40$. Since $N/2=20$, the median class is $20$-$30$.` },
          { part: "c", explanation: L`Median $=20+\frac{20-9}{12}\cdot10=20+\frac{55}{6}=\frac{175}{6}=29.17$ approximately.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why the same grouped distribution can have mean, median and mode that are not equal.`,
        difficulty: 2,
        skillTags: ["interpretation", "statistics_summary"],
        parts: singlePart("a", L`Give a clear explanation.`, 2),
        hints: [
          L`Think about what each average measures.`,
          L`Mean uses every class mark and frequency.`,
          L`Median uses position, while mode uses highest frequency.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`States that the three measures describe different aspects of data.` },
            { part: "a", points: 1, description: L`Correctly distinguishes mean, median and mode.` },
          ],
        },
        commonErrors: [
          L`Claiming they must be equal for every distribution.`,
          L`Defining only one of the three measures.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Mean depends on all class marks and frequencies, median depends on the middle position, and mode depends on the highest frequency. Since these are different features, the three values need not be equal.` },
        ],
      },
    ],
  },
  {
    topicCode: "7.5",
    title: "Classical Probability",
    subtopic: "Simple events, complements and equally likely outcomes",
    mc: [
      {
        questionLatex: L`Two fair coins are tossed together. The probability of getting exactly one head is`,
        difficulty: 1,
        skillTags: ["classical_probability", "coins"],
        choices: [L`$\frac12$`, L`$\frac14$`, L`$\frac34$`, L`$1$`],
        correctLetter: "A",
        rationales: {
          B: L`This counts only one favourable outcome, but $HT$ and $TH$ are both favourable.`,
          C: L`This counts at least one head, not exactly one head.`,
          D: L`Not every outcome has exactly one head.`,
        },
        hints: [
          L`List the four outcomes.`,
          L`Exactly one head means $HT$ or $TH$.`,
          L`Probability is favourable outcomes divided by total outcomes.`,
        ],
        solution: [
          { explanation: L`The sample space is $\{HH,HT,TH,TT\}$.` },
          { explanation: L`Exactly one head occurs in $HT$ and $TH$, so probability $=\frac24=\frac12$.` },
        ],
      },
      {
        questionLatex: L`A fair die is thrown once. The probability of getting a number that is prime or even is`,
        difficulty: 2,
        skillTags: ["classical_probability", "dice", "union_event"],
        choices: [L`$\frac23$`, L`$\frac12$`, L`$\frac56$`, L`$\frac13$`],
        correctLetter: "C",
        rationales: {
          A: L`This misses one favourable outcome. Prime or even includes $2,3,4,5,6$.`,
          B: L`This counts only even numbers or misses prime outcomes.`,
          D: L`This counts only the prime numbers $2,3,5$ incorrectly as two outcomes.`,
        },
        hints: [
          L`Prime outcomes are $2,3,5$.`,
          L`Even outcomes are $2,4,6$.`,
          L`The union is $\{2,3,4,5,6\}$.`,
        ],
        solution: [
          { explanation: L`Prime or even outcomes are $2,3,4,5,6$, giving $5$ favourable outcomes.` },
          { explanation: L`Therefore probability $=\frac56$.` },
        ],
      },
      {
        questionLatex: L`One card is drawn from a standard deck of $52$ cards. The probability that it is a face card is`,
        difficulty: 2,
        skillTags: ["classical_probability", "cards"],
        choices: [L`$\frac3{13}$`, L`$\frac1{13}$`, L`$\frac4{13}$`, L`$\frac{12}{13}$`],
        correctLetter: "A",
        rationales: {
          B: L`This counts only one rank, not jack, queen and king across all suits.`,
          C: L`This counts all cards of one suit or all aces, not face cards.`,
          D: L`This treats non-face cards as favourable.`,
        },
        hints: [
          L`Face cards are jack, queen and king.`,
          L`There are $3$ face cards in each suit.`,
          L`Total face cards $=12$.`,
        ],
        solution: [
          { explanation: L`There are $3$ face cards in each of $4$ suits, so favourable outcomes $=12$.` },
          { explanation: L`Probability $=\frac{12}{52}=\frac3{13}$.` },
        ],
      },
      {
        questionLatex: L`The spinner shown has eight equal sectors. The probability that the pointer stops on a colour that is not red is`,
        difficulty: 2,
        figure: spinnerFigure,
        skillTags: ["classical_probability", "spinner", "complement_probability"],
        choices: [L`$\frac34$`, L`$\frac12$`, L`$\frac14$`, L`$\frac58$`],
        correctLetter: "A",
        rationales: {
          B: L`This counts only blue and green or assumes four non-red sectors.`,
          C: L`This is the probability of red, not not-red.`,
          D: L`This would be correct for five non-red sectors, but the spinner has six non-red sectors.`,
        },
        hints: [
          L`Count the red sectors first.`,
          L`There are $2$ red sectors out of $8$.`,
          L`Not red has $6$ favourable sectors.`,
        ],
        solution: [
          { explanation: L`There are $2$ red sectors, so there are $8-2=6$ non-red sectors.` },
          { explanation: L`Probability of not red $=\frac68=\frac34$.` },
        ],
      },
      {
        questionLatex: L`Assertion: For any event $E$, $P(E)+P(\text{not }E)=1$. Reason: The event $E$ and its complement together cover the whole sample space and do not overlap.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "complement_probability"],
        choices: [
          L`Both Assertion and Reason are true, and Reason correctly explains Assertion.`,
          L`Both Assertion and Reason are true, but Reason does not explain Assertion.`,
          L`Assertion is true, but Reason is false.`,
          L`Assertion is false, but Reason is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains why the two probabilities add to $1$.`,
          C: L`The reason is true for an event and its complement.`,
          D: L`The assertion is true for every event in a sample space.`,
        },
        hints: [
          L`Think of an event and its complement as two disjoint parts of the sample space.`,
          L`Together they account for every outcome.`,
          L`That is exactly why their probabilities add to $1$.`,
        ],
        solution: [
          { explanation: L`An event and its complement are mutually exclusive and exhaustive, so their probabilities add to the probability of the sample space, which is $1$.` },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A card is chosen at random from cards numbered $1$ to $20$. Find the probability that the number is a multiple of $3$.`,
        difficulty: 1,
        skillTags: ["classical_probability", "number_cards"],
        parts: singlePart("a", L`Find the probability.`, 1),
        hints: [
          L`List the multiples of $3$ from $1$ to $20$.`,
          L`There are $6$ favourable outcomes.`,
          L`Divide by $20$.`,
        ],
        rubric: singleRubric("a", 1, L`Gets $\frac3{10}$.`),
        commonErrors: [
          L`Including $21$ even though the cards stop at $20$.`,
          L`Forgetting to reduce the fraction.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Multiples of $3$ are $3,6,9,12,15,18$, so probability $=\frac6{20}=\frac3{10}$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two fair dice are thrown. Find the probability that the sum is $9$.`,
        difficulty: 2,
        skillTags: ["classical_probability", "two_dice"],
        parts: singlePart("a", L`Find the probability.`, 3),
        hints: [
          L`There are $36$ equally likely ordered outcomes.`,
          L`List ordered pairs with sum $9$.`,
          L`Do not treat $(3,6)$ and $(6,3)$ as the same outcome.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`States total outcomes $36$.` },
            { part: "a", points: 1, description: L`Lists $4$ favourable outcomes.` },
            { part: "a", points: 1, description: L`Gets $\frac19$.` },
          ],
        },
        commonErrors: [
          L`Counting unordered pairs only.`,
          L`Counting pairs such as $(2,7)$, which are not possible on dice.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The favourable ordered pairs are $(3,6),(4,5),(5,4),(6,3)$, so there are $4$.` },
          { part: "a", explanation: L`Total ordered outcomes $=36$, so probability $=\frac4{36}=\frac19$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A bag contains $5$ red, $3$ blue and $2$ green balls. One ball is drawn at random.`,
        difficulty: 3,
        skillTags: ["classical_probability", "bag_probability", "complement_probability"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the probability of drawing a red ball.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the probability of not drawing a green ball.`, points: 2 },
          { letter: "c", promptMarkdown: L`Find the probability of drawing a blue or green ball.`, points: 2 },
        ],
        hints: [
          L`First find the total number of balls.`,
          L`Not green means red or blue.`,
          L`Blue or green has $3+2$ favourable outcomes.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: L`Gets $\frac12$.` },
            { part: "b", points: 2, description: L`Gets $\frac45$.` },
            { part: "c", points: 2, description: L`Gets $\frac12$.` },
          ],
        },
        commonErrors: [
          L`Using $5$ as the total number of balls because red is first mentioned.`,
          L`Subtracting numbers of balls after forming probability incorrectly.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Total balls $=5+3+2=10$. Probability of red $=\frac5{10}=\frac12$.` },
          { part: "b", explanation: L`Not green means red or blue, so probability $=\frac{5+3}{10}=\frac45$.` },
          { part: "c", explanation: L`Blue or green probability $=\frac{3+2}{10}=\frac12$.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school fair has $100$ prize coupons numbered $1$ to $100$. A student draws one coupon at random.`,
        difficulty: 4,
        skillTags: ["classical_probability", "number_cards", "complement_probability"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the probability that the number is a perfect square.`, points: 2 },
          { letter: "b", promptMarkdown: L`Find the probability that the number is divisible by $5$.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find the probability that the number is neither a perfect square nor divisible by $5$.`, points: 3 },
        ],
        hints: [
          L`Perfect squares from $1$ to $100$ are $1^2$ through $10^2$.`,
          L`There are $20$ multiples of $5$.`,
          L`Subtract the overlap: squares divisible by $5$.`,
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            { part: "a", points: 2, description: L`Finds $\frac1{10}$.` },
            { part: "b", points: 1, description: L`Finds $\frac15$.` },
            { part: "c", points: 1, description: L`Counts overlap $2$ correctly.` },
            { part: "c", points: 2, description: L`Finds probability $\frac{18}{25}$.` },
          ],
        },
        commonErrors: [
          L`Adding $10$ and $20$ without subtracting the overlap.`,
          L`Treating $25$ and $100$ as the only perfect squares divisible by $5$ but then subtracting them twice from the complement.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`There are $10$ perfect squares from $1$ to $100$, so probability $=\frac{10}{100}=\frac1{10}$.` },
          { part: "b", explanation: L`There are $20$ multiples of $5$, so probability $=\frac{20}{100}=\frac15$.` },
          { part: "c", explanation: L`Squares divisible by $5$ are $25$ and $100$, so the union count is $10+20-2=28$. Neither count $=100-28=72$.` },
          { part: "c", explanation: L`Required probability $=\frac{72}{100}=\frac{18}{25}$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`One card is drawn from a standard deck. Find the probability that the card is either a king or a red card.`,
        difficulty: 4,
        skillTags: ["classical_probability", "cards", "union_event"],
        parts: singlePart("a", L`Find the probability.`, 3),
        hints: [
          L`Count kings and red cards.`,
          L`Red kings are counted in both groups.`,
          L`Use inclusion-exclusion on the counts.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Counts kings $4$ and red cards $26$.` },
            { part: "a", points: 1, description: L`Subtracts overlap $2$.` },
            { part: "a", points: 1, description: L`Gets $\frac7{13}$.` },
          ],
        },
        commonErrors: [
          L`Adding $4$ and $26$ without subtracting the two red kings.`,
          L`Subtracting all four kings as overlap.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`There are $4$ kings and $26$ red cards. The overlap consists of $2$ red kings.` },
          { part: "a", explanation: L`Favourable outcomes $=4+26-2=28$. Probability $=\frac{28}{52}=\frac7{13}$.` },
        ],
      },
    ],
  },
];

export const statisticsProbabilityXTopics: Topic[] = [...topicSeeds].map(makeTopic);
