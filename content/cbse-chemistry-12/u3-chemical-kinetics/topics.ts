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
import { calibrateCbseChemistryDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-chemistry-12";
const UNIT = "u3-chemical-kinetics";
const VERSION = "0.1.4";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const TOPIC_CHOICE_ROTATION_OFFSETS: Record<string, number> = {
  "3.1": 0,
  "3.2": 1,
  "3.3": 2,
  "3.4": 0,
  "3.5": 1,
};
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
  skillTags: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
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
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|lambda|Lambda|times|cdot|approx|rightarrow|le|ge|neq|ln|log)\b/g,
        "$1\\$2",
      ),
  );
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairSolutionStep(step: SolutionStep): SolutionStep {
  return {
    ...step,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function repairPart(part: FrqPart): FrqPart {
  return { ...part, promptMarkdown: repairInlineLatex(part.promptMarkdown) };
}

function repairRubric(rubric: FrqRubric): FrqRubric {
  return {
    maxPoints: rubric.maxPoints,
    criteria: rubric.criteria.map((criterion) => ({
      ...criterion,
      description: repairInlineLatex(criterion.description),
    })),
  };
}

function repairWorkedSolution(part: FrqSolutionPart): FrqSolutionPart {
  return {
    ...part,
    explanation: repairInlineLatex(part.explanation),
    ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the rate expression, order, graph slope, units, and whether the law is zero order or first order.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    const fallbackRationale =
      seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter);
    return {
      text: repairInlineLatex(seed.choices[choiceIndex]),
      isCorrect,
      rationaleIfWrong: isCorrect ? null : repairInlineLatex(fallbackRationale),
      misconceptionTag: isCorrect
        ? null
        : "incorrect_cbse_class12_chemistry_kinetics_reasoning",
    };
  });

  const rotation =
    (index + (TOPIC_CHOICE_ROTATION_OFFSETS[meta.topicCode] ?? 0)) %
    LETTERS.length;
  const orderedChoices = [
    ...unletteredChoices.slice(rotation),
    ...unletteredChoices.slice(0, rotation),
  ];

  const choices = orderedChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];

  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_checking_order_or_units",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_kinetics_answer_without_showing_rate_law_or_units",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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

function parts(items: readonly [string, string, number][]): readonly FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) => ({
    letter,
    promptMarkdown,
    points,
  }));
}

function rubric(items: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: items.reduce((total, item) => total + item.points, 0),
    criteria: items.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Completes part ${item.letter} with correct chemical kinetics reasoning, calculation and units.`,
    })),
  };
}

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hints: readonly [string, string, string],
  solution: readonly SolutionStep[],
  figure?: ItemFigure,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints,
    solution,
    ...(figure ? { figure } : {}),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  questionParts: readonly FrqPart[],
  hintItems: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts: questionParts,
    hints: hintItems,
    rubric: rubric(questionParts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
  };
}

const concentrationTimeFigure: ItemFigure = {
  type: "svg",
  title: "Concentration-time data for reactant A",
  description:
    "A concentration-time graph gives the reactant concentration at 0 s, 10 s and 20 s for average-rate calculation.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Reactant concentration during a run</text>
  <line x1="92" y1="350" x2="650" y2="350" stroke="#334155" stroke-width="3"/>
  <line x1="92" y1="350" x2="92" y2="70" stroke="#334155" stroke-width="3"/>
  <path d="M92 350 H650 M92 280 H650 M92 210 H650 M92 140 H650 M92 70 H650" stroke="#e5e7eb" stroke-width="1"/>
  <path d="M92 350 V70 M231 350 V70 M370 350 V70 M509 350 V70 M648 350 V70" stroke="#e5e7eb" stroke-width="1"/>
  <text x="360" y="402" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">time / s</text>
  <text x="24" y="215" transform="rotate(-90 24 215)" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">[A] / mol L^-1</text>
  <text x="92" y="374" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">0</text>
  <text x="370" y="374" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">10</text>
  <text x="648" y="374" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">20</text>
  <text x="73" y="355" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">0.40</text>
  <text x="73" y="285" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">0.50</text>
  <text x="73" y="215" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">0.60</text>
  <text x="73" y="145" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">0.70</text>
  <text x="73" y="75" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">0.80</text>
  <polyline points="92,70 370,175 648,280" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="92" cy="70" r="6" fill="#2563eb"/>
  <circle cx="370" cy="175" r="6" fill="#2563eb"/>
  <circle cx="648" cy="280" r="6" fill="#2563eb"/>
  <text x="120" y="64" font-family="Arial" font-size="15" fill="#1e3a8a">(0, 0.80)</text>
  <text x="396" y="169" font-family="Arial" font-size="15" fill="#1e3a8a">(10, 0.65)</text>
  <text x="548" y="270" font-family="Arial" font-size="15" fill="#1e3a8a">(20, 0.50)</text>
</svg>`,
};

const firstOrderPlotFigure: ItemFigure = {
  type: "svg",
  title: "First-order diagnostic plot",
  description:
    "A straight-line plot of ln[A] against time is shown with two labelled points for slope calculation.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Integrated-rate plot</text>
  <line x1="92" y1="350" x2="650" y2="350" stroke="#334155" stroke-width="3"/>
  <line x1="92" y1="350" x2="92" y2="70" stroke="#334155" stroke-width="3"/>
  <path d="M92 350 H650 M92 280 H650 M92 210 H650 M92 140 H650 M92 70 H650" stroke="#e5e7eb" stroke-width="1"/>
  <path d="M92 350 V70 M231 350 V70 M370 350 V70 M509 350 V70 M648 350 V70" stroke="#e5e7eb" stroke-width="1"/>
  <text x="360" y="402" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">time / min</text>
  <text x="28" y="215" transform="rotate(-90 28 215)" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">ln[A]</text>
  <text x="92" y="374" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">0</text>
  <text x="370" y="374" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">10</text>
  <text x="648" y="374" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">20</text>
  <text x="75" y="84" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">-1.0</text>
  <text x="75" y="224" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">-3.0</text>
  <text x="75" y="364" text-anchor="end" font-family="Arial" font-size="14" fill="#111827">-5.0</text>
  <line x1="92" y1="70" x2="648" y2="350" stroke="#dc2626" stroke-width="4"/>
  <circle cx="92" cy="70" r="6" fill="#dc2626"/>
  <circle cx="370" cy="210" r="6" fill="#dc2626"/>
  <text x="118" y="64" font-family="Arial" font-size="15" fill="#991b1b">(0, -1.0)</text>
  <text x="396" y="204" font-family="Arial" font-size="15" fill="#991b1b">(10, -3.0)</text>
</svg>`,
};

const arrheniusPlotFigure: ItemFigure = {
  type: "svg",
  title: "Arrhenius plot for a reaction",
  description:
    "A straight-line plot of ln k against reciprocal temperature is shown with the line slope labelled for activation-energy reasoning.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Arrhenius plot</text>
  <line x1="92" y1="350" x2="650" y2="350" stroke="#334155" stroke-width="3"/>
  <line x1="92" y1="350" x2="92" y2="70" stroke="#334155" stroke-width="3"/>
  <path d="M92 350 H650 M92 280 H650 M92 210 H650 M92 140 H650 M92 70 H650" stroke="#e5e7eb" stroke-width="1"/>
  <path d="M92 350 V70 M231 350 V70 M370 350 V70 M509 350 V70 M648 350 V70" stroke="#e5e7eb" stroke-width="1"/>
  <text x="360" y="402" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">1/T</text>
  <text x="28" y="215" transform="rotate(-90 28 215)" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">ln k</text>
  <line x1="120" y1="110" x2="610" y2="320" stroke="#7c3aed" stroke-width="4"/>
  <text x="370" y="205" text-anchor="middle" font-family="Arial" font-size="17" fill="#5b21b6">slope = -6000 K</text>
  <circle cx="120" cy="110" r="6" fill="#7c3aed"/>
  <circle cx="610" cy="320" r="6" fill="#7c3aed"/>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Rate of Reaction and Rate Law",
    subtopic:
      "Average rate, instantaneous rate, stoichiometric rate expressions and rate law from data.",
    mc: [
      mc(
        L`For the graph shown, the average rate of disappearance of $\mathrm{A}$ from $0$ to $20\,\mathrm{s}$ is`,
        2,
        ["average_rate", "graph_reading", "concentration_time"],
        [
          L`$1.5\times10^{-2}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$3.0\times10^{-2}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$6.5\times10^{-2}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$1.5\times10^{-3}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
        ],
        "A",
        {
          B: L`This doubles the concentration change; the change is $0.30\,\mathrm{mol\,L^{-1}}$, not $0.60$.`,
          C: L`This uses the concentration near the middle instead of the change in concentration.`,
          D: L`This divides by $200\,\mathrm{s}$ instead of $20\,\mathrm{s}$.`,
        },
        [
          L`Average disappearance rate uses $-\Delta[A]/\Delta t$.`,
          L`Read $[A]$ as $0.80$ at $0\,\mathrm{s}$ and $0.50$ at $20\,\mathrm{s}$.`,
          L`The concentration falls by $0.30\,\mathrm{mol\,L^{-1}}$ in $20\,\mathrm{s}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Average rate of disappearance is positive for a reactant.`,
            math: L`-\frac{\Delta[A]}{\Delta t}=\frac{0.80-0.50}{20}=1.5\times10^{-2}\,\mathrm{mol\,L^{-1}\,s^{-1}}`,
          },
        ],
        concentrationTimeFigure,
      ),
      mc(
        L`For the reaction $\mathrm{2A\rightarrow B}$, if $\mathrm{B}$ is formed at $3.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}$, the rate of disappearance of $\mathrm{A}$ is`,
        2,
        ["stoichiometric_rate", "reaction_rate", "rate_expression"],
        [
          L`$1.5\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$3.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$6.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$9.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}$`,
        ],
        "C",
        {
          A: L`This divides by $2$ instead of multiplying the product-formation rate by $2$.`,
          B: L`This ignores the coefficient $2$ of $\mathrm{A}$.`,
          D: L`This uses a coefficient sum rather than the stoichiometric ratio.`,
        },
        [
          L`Use the balanced equation coefficients.`,
          L`For every $1$ mole of $\mathrm{B}$ formed, $2$ moles of $\mathrm{A}$ disappear.`,
          L`Therefore $-\frac{d[A]}{dt}=2\frac{d[B]}{dt}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The disappearance rate of $\mathrm{A}$ is twice the formation rate of $\mathrm{B}$.`,
            math: L`-\frac{d[A]}{dt}=2(3.0\times10^{-4})=6.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}`,
          },
        ],
      ),
      mc(
        L`For a reaction with rate law $r=k[A]^2[B]$, doubling $[A]$ and halving $[B]$ changes the rate by a factor of`,
        2,
        ["rate_law", "concentration_dependence", "order"],
        [L`$1$`, L`$2$`, L`$4$`, L`$8$`],
        "B",
        {
          A: L`This cancels the concentration changes linearly and ignores the square on $[A]$.`,
          C: L`This includes doubling $[A]$ squared but forgets that $[B]$ is halved.`,
          D: L`This treats $[B]$ as doubled instead of halved.`,
        },
        [
          L`Apply each concentration change to the rate law.`,
          L`Doubling $[A]$ multiplies rate by $2^2=4$.`,
          L`Halving $[B]$ multiplies rate by $1/2$, so the total factor is $2$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The total concentration factor is`,
            math: L`(2)^2\left(\frac{1}{2}\right)=2`,
          },
        ],
      ),
      mc(
        L`For the reaction $\mathrm{A+B\rightarrow products}$, the data are: Exp. 1, $[A]=0.10$, $[B]=0.10$, rate $=2.0\times10^{-3}$; Exp. 2, $[A]=0.20$, $[B]=0.10$, rate $=8.0\times10^{-3}$; Exp. 3, $[A]=0.10$, $[B]=0.20$, rate $=4.0\times10^{-3}$. The rate law is`,
        3,
        ["initial_rate_method", "rate_law", "experimental_data"],
        [
          L`$r=k[A][B]$`,
          L`$r=k[A]^2[B]$`,
          L`$r=k[A][B]^2$`,
          L`$r=k[A]^2[B]^2$`,
        ],
        "B",
        {
          A: L`Doubling $[A]$ makes rate four times, so the order in $A$ is not one.`,
          C: L`Doubling $[B]$ only doubles rate, so the order in $B$ is not two.`,
          D: L`This makes both concentration effects too large.`,
        },
        [
          L`Compare Exp. 1 and 2 to find order in $A$.`,
          L`Compare Exp. 1 and 3 to find order in $B$.`,
          L`Rate becomes four times when $[A]$ doubles, and two times when $[B]$ doubles.`,
        ],
        [
          {
            step: 1,
            explanation: L`The order in $A$ is $2$ and the order in $B$ is $1$.`,
            math: L`r=k[A]^2[B]`,
          },
        ],
      ),
      mc(
        L`Assertion (A): The instantaneous rate of disappearance of a reactant is obtained from the slope of the tangent to its concentration-time curve. Reason (R): A tangent gives the limiting value of $\Delta[A]/\Delta t$ at that instant.`,
        2,
        ["assertion_reason", "instantaneous_rate", "graph_slope"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains why the tangent is used for instantaneous rate.`,
          C: L`The tangent slope does give the limiting rate at a particular instant.`,
          D: L`The assertion is true for a concentration-time graph.`,
        },
        [
          L`Average rate uses a chord over a time interval.`,
          L`Instantaneous rate uses the limiting slope at one time.`,
          L`For disappearance, the reported rate is usually the negative of the reactant slope.`,
        ],
        [
          {
            step: 1,
            explanation: L`The tangent gives the limiting slope at one instant; for a reactant, the disappearance rate is the negative of that slope.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define average rate of disappearance of a reactant $\mathrm{A}$ over a time interval.`,
        1,
        ["definition", "average_rate", "reactant_disappearance"],
        parts([["a", L`Give the expression and unit.`, 1]]),
        [
          L`A reactant concentration decreases with time.`,
          L`Use a negative sign so the disappearance rate is positive.`,
          L`The usual unit is concentration per time.`,
        ],
        [
          {
            part: "a",
            explanation: L`Average rate of disappearance of $\mathrm{A}$ is`,
            math: L`-\frac{\Delta[A]}{\Delta t}`,
          },
        ],
        [
          L`Omitting the negative sign for a reactant.`,
          L`Writing only concentration change without dividing by time.`,
        ],
      ),
      frq(
        "saq",
        L`In a reaction $\mathrm{N_2O_5}$ decomposes as $\mathrm{2N_2O_5\rightarrow 4NO_2+O_2}$. If $\mathrm{N_2O_5}$ disappears at $1.20\times10^{-3}\,\mathrm{mol\,L^{-1}\,s^{-1}}$, calculate the reaction rate and the rate of formation of $\mathrm{O_2}$.`,
        3,
        ["stoichiometric_rate", "decomposition", "rate_expression"],
        parts([
          ["a", L`Calculate the reaction rate.`, 1],
          ["b", L`Calculate the rate of formation of $\mathrm{O_2}$.`, 1],
        ]),
        [
          L`Divide the disappearance rate of $\mathrm{N_2O_5}$ by its coefficient.`,
          L`The coefficient of $\mathrm{O_2}$ is $1$.`,
          L`Reaction rate equals the formation rate of $\mathrm{O_2}$ here.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reaction rate is one-half of the disappearance rate of $\mathrm{N_2O_5}$.`,
            math: L`r=\frac{1}{2}(1.20\times10^{-3})=6.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}`,
          },
          {
            part: "b",
            explanation: L`Since the coefficient of $\mathrm{O_2}$ is $1$, its formation rate equals the reaction rate.`,
            math: L`\frac{d[O_2]}{dt}=6.0\times10^{-4}\,\mathrm{mol\,L^{-1}\,s^{-1}}`,
          },
        ],
        [
          L`Forgetting the coefficient $2$ before $\mathrm{N_2O_5}$.`,
          L`Making $\mathrm{O_2}$ formation four times the reaction rate.`,
        ],
      ),
      frq(
        "saq",
        L`For a reaction, the rate law is $r=k[A]^2[B]$. In one experiment $[A]=0.20\,\mathrm{mol\,L^{-1}}$, $[B]=0.10\,\mathrm{mol\,L^{-1}}$ and $r=1.6\times10^{-2}\,\mathrm{mol\,L^{-1}\,s^{-1}}$. Find $k$ and its units.`,
        3,
        ["rate_constant", "rate_law_units", "order"],
        parts([
          ["a", L`Calculate $k$.`, 1],
          ["b", L`Write the units of $k$.`, 1],
        ]),
        [
          L`Substitute concentrations into $r=k[A]^2[B]$.`,
          L`The overall order is $3$.`,
          L`For third order, $k$ has units $\mathrm{L^2\,mol^{-2}\,s^{-1}}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Substitute the data into the rate law.`,
            math: L`k=\frac{1.6\times10^{-2}}{(0.20)^2(0.10)}=4.0`,
          },
          {
            part: "b",
            explanation: L`For overall order $3$, the units are`,
            math: L`\mathrm{L^2\,mol^{-2}\,s^{-1}}`,
          },
        ],
        [
          L`Using $[A]$ instead of $[A]^2$.`,
          L`Writing first-order units for a third-order rate constant.`,
        ],
      ),
      frq(
        "laq",
        L`The following initial-rate data are obtained for $\mathrm{A+B\rightarrow products}$: Exp. 1, $[A]=0.10$, $[B]=0.10$, rate $=2.0\times10^{-3}$; Exp. 2, $[A]=0.20$, $[B]=0.10$, rate $=8.0\times10^{-3}$; Exp. 3, $[A]=0.10$, $[B]=0.20$, rate $=4.0\times10^{-3}$. Concentrations are in $\mathrm{mol\,L^{-1}}$ and rates in $\mathrm{mol\,L^{-1}\,s^{-1}}$.`,
        4,
        ["initial_rate_method", "rate_law", "rate_constant"],
        parts([
          ["a", L`Find the order with respect to $\mathrm{A}$.`, 1],
          ["b", L`Find the order with respect to $\mathrm{B}$.`, 1],
          ["c", L`Write the rate law.`, 1],
          ["d", L`Calculate $k$ using Exp. 1.`, 1],
        ]),
        [
          L`Compare experiments where only one concentration changes.`,
          L`When $[A]$ doubles, the rate becomes four times.`,
          L`When $[B]$ doubles, the rate becomes two times.`,
        ],
        [
          {
            part: "a",
            explanation: L`Comparing Exp. 1 and 2, doubling $[A]$ makes the rate four times. Order in $\mathrm{A}$ is $2$.`,
          },
          {
            part: "b",
            explanation: L`Comparing Exp. 1 and 3, doubling $[B]$ doubles the rate. Order in $\mathrm{B}$ is $1$.`,
          },
          {
            part: "c",
            explanation: L`The rate law is`,
            math: L`r=k[A]^2[B]`,
          },
          {
            part: "d",
            explanation: L`Using Exp. 1,`,
            math: L`k=\frac{2.0\times10^{-3}}{(0.10)^2(0.10)}=2.0\,\mathrm{L^2\,mol^{-2}\,s^{-1}}`,
          },
        ],
        [
          L`Comparing experiments in which both concentrations change.`,
          L`Forgetting that $0.10^2\times0.10=0.0010$.`,
        ],
      ),
      frq(
        "case",
        L`A colourless reactant $\mathrm{A}$ is converted into a coloured product in solution. In separate initial-rate trials, a student observes that doubling $[A]$ at fixed $[B]$ doubles the initial rate, while doubling $[B]$ at fixed $[A]$ makes the initial rate four times.`,
        3,
        ["case_based", "initial_rate_method", "rate_prediction"],
        parts([
          ["a", L`Find the order with respect to $\mathrm{A}$.`, 1],
          ["b", L`Find the order with respect to $\mathrm{B}$.`, 1],
          ["c", L`Write a possible rate law.`, 1],
          [
            "d",
            L`If both $[A]$ and $[B]$ are doubled together, by what factor does the initial rate change?`,
            1,
          ],
        ]),
        [
          L`Use the effect of doubling each reactant separately.`,
          L`A doubling causing a two-fold rate change means first order.`,
          L`A doubling causing a four-fold rate change means second order.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reaction is first order with respect to $\mathrm{A}$.`,
          },
          {
            part: "b",
            explanation: L`The reaction is second order with respect to $\mathrm{B}$.`,
          },
          {
            part: "c",
            explanation: L`A possible rate law is`,
            math: L`r=k[A][B]^2`,
          },
          {
            part: "d",
            explanation: L`Doubling both concentrations gives a factor $2\times2^2=8$.`,
          },
        ],
        [
          L`Adding concentration changes instead of multiplying rate factors.`,
          L`Assuming the stoichiometric coefficients must be the orders.`,
        ],
      ),
    ],
  },
  {
    topicCode: "3.2",
    title: "Factors Affecting Rate, Order and Molecularity",
    subtopic:
      "Effect of concentration, catalyst and temperature; order, molecularity and pseudo-first-order conditions.",
    mc: [
      mc(
        L`In hydrolysis of an ester, water is taken in large excess. The reaction appears first order mainly because`,
        2,
        ["pseudo_first_order", "concentration_effect", "rate_law"],
        [
          L`the concentration of water remains practically constant`,
          L`water has zero molecular mass in the rate law`,
          L`ester concentration is always constant`,
          L`the reaction has no activated complex`,
        ],
        "A",
        {
          B: L`Molecular mass is not the reason for pseudo-first-order behaviour.`,
          C: L`The ester concentration changes and controls the observed rate.`,
          D: L`The reaction still proceeds through activated states; that does not define pseudo-first order.`,
        },
        [
          L`Pseudo-first-order conditions usually involve one reactant in large excess.`,
          L`The excess reactant concentration changes negligibly.`,
          L`Its concentration is absorbed into the observed rate constant.`,
        ],
        [
          {
            step: 1,
            explanation: L`Water is present in such large excess that its concentration is effectively constant, so the observed rate depends mainly on ester concentration.`,
          },
        ],
      ),
      mc(
        L`The unit of rate constant for a first-order reaction is`,
        1,
        ["rate_constant_units", "first_order", "order"],
        [
          L`$\mathrm{s^{-1}}$`,
          L`$\mathrm{mol\,L^{-1}\,s^{-1}}$`,
          L`$\mathrm{L\,mol^{-1}\,s^{-1}}$`,
          L`$\mathrm{L^2\,mol^{-2}\,s^{-1}}$`,
        ],
        "A",
        {
          B: L`These are the units of rate, not a first-order rate constant.`,
          C: L`These are typical units for a second-order rate constant.`,
          D: L`These are typical units for a third-order rate constant.`,
        },
        [
          L`For first order, $r=k[A]$.`,
          L`Divide rate units by concentration units.`,
          L`The concentration units cancel.`,
        ],
        [
          {
            step: 1,
            explanation: L`For $r=k[A]$,`,
            math: L`[k]=\frac{\mathrm{mol\,L^{-1}\,s^{-1}}}{\mathrm{mol\,L^{-1}}}=\mathrm{s^{-1}}`,
          },
        ],
      ),
      mc(
        L`Which statement about order and molecularity is correct?`,
        2,
        ["order", "molecularity", "conceptual"],
        [
          L`Order is always equal to molecularity.`,
          L`Molecularity may be zero for a slow elementary step.`,
          L`Order can be fractional, but molecularity is a whole number for an elementary step.`,
          L`Molecularity is found only from initial-rate data.`,
        ],
        "C",
        {
          A: L`They may be equal for an elementary step, but not necessarily for an overall complex reaction.`,
          B: L`Molecularity cannot be zero because an elementary step must involve reacting species.`,
          D: L`Order is found experimentally; molecularity is read from an elementary step.`,
        },
        [
          L`Order belongs to the experimentally determined rate law.`,
          L`Molecularity belongs to an elementary step.`,
          L`Only order can be zero or fractional.`,
        ],
        [
          {
            step: 1,
            explanation: L`Order may be zero, fractional or integral, whereas molecularity of an elementary step is a positive whole number.`,
          },
        ],
      ),
      mc(
        L`For a reaction, increasing $[B]$ from $0.10$ to $0.30\,\mathrm{mol\,L^{-1}}$ at fixed $[A]$ leaves the initial rate unchanged. The order with respect to $\mathrm{B}$ is`,
        2,
        ["zero_order", "initial_rate_method", "concentration_effect"],
        [L`$0$`, L`$1$`, L`$2$`, L`$3$`],
        "A",
        {
          B: L`First order would make the rate three times when $[B]$ is tripled.`,
          C: L`Second order would make the rate nine times.`,
          D: L`Third order would make the rate twenty-seven times.`,
        },
        [
          L`Ask how rate changes when only $[B]$ changes.`,
          L`The rate is unchanged.`,
          L`No dependence on $[B]$ means zero order in $\mathrm{B}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The rate does not change when $[B]$ changes, so the exponent of $[B]$ in the rate law is zero.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): A catalyst changes the rate of a reaction by providing a path of lower activation energy. Reason (R): A catalyst changes the equilibrium constant of the reaction.`,
        2,
        ["assertion_reason", "catalyst", "activation_energy"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "C",
        {
          A: L`The reason is false; a catalyst does not change the equilibrium constant.`,
          B: L`The assertion is true, but the reason is not true.`,
          D: L`The assertion is true because catalysts lower activation energy.`,
        },
        [
          L`A catalyst affects the path, not the thermodynamic position of equilibrium.`,
          L`It lowers activation energy for forward and reverse reactions.`,
          L`It does not change $\Delta G^\circ$ or $K$.`,
        ],
        [
          {
            step: 1,
            explanation: L`A catalyst provides an alternate lower-energy path, but it does not change the equilibrium constant.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State one difference between order of reaction and molecularity of a reaction step.`,
        1,
        ["order", "molecularity", "conceptual_definition"],
        parts([["a", L`Give one valid difference.`, 1]]),
        [
          L`Order comes from the rate law.`,
          L`Molecularity comes from an elementary step.`,
          L`Order may be fractional or zero; molecularity cannot.`,
        ],
        [
          {
            part: "a",
            explanation: L`Order is experimentally determined from the rate law and may be zero or fractional; molecularity is the number of reacting species in an elementary step and is a positive whole number.`,
          },
        ],
        [
          L`Saying both are always equal.`,
          L`Calling molecularity a fractional quantity.`,
        ],
      ),
      frq(
        "saq",
        L`A reaction has rate law $r=k[A]^0[B]^2$. Explain what happens to the rate when $[A]$ is doubled and $[B]$ is halved.`,
        2,
        ["rate_law", "zero_order", "concentration_effect"],
        parts([
          ["a", L`State the effect of doubling $[A]$.`, 1],
          ["b", L`State the overall effect when $[B]$ is halved also.`, 1],
        ]),
        [
          L`The exponent of $[A]$ is zero.`,
          L`Halving $[B]$ affects the rate by the square of $1/2$.`,
          L`Combine both effects multiplicatively.`,
        ],
        [
          {
            part: "a",
            explanation: L`Doubling $[A]$ has no effect because the reaction is zero order in $\mathrm{A}$.`,
          },
          {
            part: "b",
            explanation: L`Halving $[B]$ gives a factor`,
            math: L`\left(\frac{1}{2}\right)^2=\frac{1}{4}`,
          },
        ],
        [
          L`Treating $[A]^0$ as $[A]$.`,
          L`Halving the rate instead of making it one-fourth.`,
        ],
      ),
      frq(
        "saq",
        L`In an elementary reaction step $\mathrm{NO+O_3\rightarrow NO_2+O_2}$, identify the molecularity and write the rate law expected for this elementary step.`,
        2,
        ["molecularity", "elementary_step", "rate_law"],
        parts([
          ["a", L`Identify the molecularity.`, 1],
          ["b", L`Write the rate law for this elementary step.`, 1],
        ]),
        [
          L`Count the reacting species in the elementary step.`,
          L`For an elementary step, the rate law follows the step stoichiometry.`,
          L`One $\mathrm{NO}$ and one $\mathrm{O_3}$ collide.`,
        ],
        [
          {
            part: "a",
            explanation: L`Two reacting species are involved, so the step is bimolecular.`,
          },
          {
            part: "b",
            explanation: L`For the elementary step,`,
            math: L`r=k[\mathrm{NO}][\mathrm{O_3}]`,
          },
        ],
        [
          L`Using product species in the rate law.`,
          L`Calling the step termolecular because there are four species in the equation.`,
        ],
      ),
      frq(
        "laq",
        L`A reaction is studied by the initial-rate method. At fixed $[B]$, increasing $[A]$ from $0.10$ to $0.30\,\mathrm{mol\,L^{-1}}$ makes the rate three times. At fixed $[A]$, increasing $[B]$ from $0.20$ to $0.40\,\mathrm{mol\,L^{-1}}$ makes the rate four times.`,
        3,
        ["initial_rate_method", "order", "rate_prediction"],
        parts([
          ["a", L`Find the order with respect to $\mathrm{A}$.`, 1],
          ["b", L`Find the order with respect to $\mathrm{B}$.`, 1],
          ["c", L`Write the rate law.`, 1],
          [
            "d",
            L`If both $[A]$ and $[B]$ are doubled, by what factor does the rate change?`,
            1,
          ],
        ]),
        [
          L`A three-fold concentration change causing a three-fold rate change means first order.`,
          L`A two-fold concentration change causing a four-fold rate change means second order.`,
          L`Use the exponents to predict the combined effect.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reaction is first order in $\mathrm{A}$.`,
          },
          {
            part: "b",
            explanation: L`The reaction is second order in $\mathrm{B}$.`,
          },
          {
            part: "c",
            explanation: L`The rate law is`,
            math: L`r=k[A][B]^2`,
          },
          {
            part: "d",
            explanation: L`Doubling both concentrations changes rate by`,
            math: L`2\times2^2=8`,
          },
        ],
        [
          L`Using the overall balanced equation instead of initial-rate evidence.`,
          L`Adding the factors $2$ and $4$ instead of multiplying them.`,
        ],
      ),
      frq(
        "case",
        L`A food preservative slows an oxidation reaction in a packaged sample. In the uncatalysed path, the activation energy is high. With a small amount of inhibitor, fewer effective collisions lead to product formation per second, though the overall reaction remains thermodynamically possible.`,
        3,
        ["case_based", "catalyst", "activation_energy", "collision_theory"],
        parts([
          ["a", L`Name the kinetic factor mainly changed by the inhibitor.`, 1],
          ["b", L`Does this necessarily change the equilibrium constant?`, 1],
          [
            "c",
            L`State what happens to the number of effective collisions per second.`,
            1,
          ],
          [
            "d",
            L`Give one reason why concentration must be controlled while comparing rates.`,
            1,
          ],
        ]),
        [
          L`A catalyst or inhibitor changes the pathway or effective collision count.`,
          L`Equilibrium constant is a thermodynamic quantity.`,
          L`Rate comparisons require all other factors to be fixed.`,
        ],
        [
          {
            part: "a",
            explanation: L`The inhibitor changes the effective activation barrier or pathway for product-forming collisions.`,
          },
          {
            part: "b",
            explanation: L`No. A kinetic inhibitor changes rate but does not necessarily change the equilibrium constant.`,
          },
          {
            part: "c",
            explanation: L`The number of effective collisions per second decreases.`,
          },
          {
            part: "d",
            explanation: L`Concentration affects collision frequency, so it must be fixed to isolate the inhibitor's effect.`,
          },
        ],
        [
          L`Claiming any rate change must change equilibrium constant.`,
          L`Ignoring concentration as a factor affecting collision frequency.`,
        ],
      ),
    ],
  },
  {
    topicCode: "3.3",
    title: "Integrated Rate Equations and Half-Life",
    subtopic:
      "Zero-order and first-order integrated equations, diagnostic plots and half-life.",
    mc: [
      mc(
        L`The graph shown is a straight line for $\ln[A]$ versus time. The rate constant for the reaction is`,
        2,
        ["first_order", "integrated_rate_equation", "graph_slope"],
        [
          L`$0.10\,\mathrm{min^{-1}}$`,
          L`$0.20\,\mathrm{min^{-1}}$`,
          L`$2.0\,\mathrm{min^{-1}}$`,
          L`$5.0\,\mathrm{min^{-1}}$`,
        ],
        "B",
        {
          A: L`This uses only half of the slope magnitude.`,
          C: L`This uses the change in $\ln[A]$ without dividing by time.`,
          D: L`This inverts the rate constant.`,
        },
        [
          L`For first order, $\ln[A]=\ln[A]_0-kt$.`,
          L`The slope of $\ln[A]$ versus time is $-k$.`,
          L`From the graph, slope $=(-3.0+1.0)/10=-0.20\,\mathrm{min^{-1}}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For a first-order plot, the rate constant is the magnitude of the slope.`,
            math: L`k=-\mathrm{slope}=0.20\,\mathrm{min^{-1}}`,
          },
        ],
        firstOrderPlotFigure,
      ),
      mc(
        L`For a first-order reaction with $k=0.0693\,\mathrm{min^{-1}}$, the half-life is`,
        2,
        ["first_order", "half_life", "rate_constant"],
        [
          L`$5\,\mathrm{min}$`,
          L`$10\,\mathrm{min}$`,
          L`$20\,\mathrm{min}$`,
          L`$69.3\,\mathrm{min}$`,
        ],
        "B",
        {
          A: L`This would correspond to $k=0.1386\,\mathrm{min^{-1}}$.`,
          C: L`This halves the rate constant in the denominator incorrectly.`,
          D: L`This uses $1/k$ and forgets the factor $0.693$.`,
        },
        [
          L`First-order half-life is $0.693/k$.`,
          L`Substitute $k=0.0693\,\mathrm{min^{-1}}$.`,
          L`The powers of ten are chosen to give an exact-looking value.`,
        ],
        [
          {
            step: 1,
            explanation: L`For a first-order reaction,`,
            math: L`t_{1/2}=\frac{0.693}{0.0693}=10\,\mathrm{min}`,
          },
        ],
      ),
      mc(
        L`A zero-order reaction has $[A]_0=0.40\,\mathrm{mol\,L^{-1}}$ and $k=0.020\,\mathrm{mol\,L^{-1}\,min^{-1}}$. The time required for $[A]$ to become $0.10\,\mathrm{mol\,L^{-1}}$ is`,
        2,
        ["zero_order", "integrated_rate_equation", "time_calculation"],
        [
          L`$5\,\mathrm{min}$`,
          L`$10\,\mathrm{min}$`,
          L`$15\,\mathrm{min}$`,
          L`$20\,\mathrm{min}$`,
        ],
        "C",
        {
          A: L`This uses only the final concentration divided by $k$.`,
          B: L`This uses a concentration change of $0.20$ instead of $0.30$.`,
          D: L`This uses the initial concentration divided by $k$.`,
        },
        [
          L`For zero order, $[A]=[A]_0-kt$.`,
          L`The concentration change is $0.40-0.10=0.30$.`,
          L`Divide by $0.020\,\mathrm{mol\,L^{-1}\,min^{-1}}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For zero order,`,
            math: L`t=\frac{0.40-0.10}{0.020}=15\,\mathrm{min}`,
          },
        ],
      ),
      mc(
        L`In a first-order reaction, the fraction of reactant remaining after three half-lives is`,
        2,
        ["first_order", "half_life", "fraction_remaining"],
        [
          L`$\frac{1}{3}$`,
          L`$\frac{1}{6}$`,
          L`$\frac{1}{8}$`,
          L`$\frac{1}{9}$`,
        ],
        "C",
        {
          A: L`Each half-life halves the amount; it is not divided by the number of half-lives.`,
          B: L`This does not follow repeated halving.`,
          D: L`This squares the number of half-lives rather than halving repeatedly.`,
        },
        [
          L`After one half-life, half remains.`,
          L`After two half-lives, one-fourth remains.`,
          L`After three half-lives, one-eighth remains.`,
        ],
        [
          {
            step: 1,
            explanation: L`The remaining fraction is`,
            math: L`\left(\frac{1}{2}\right)^3=\frac{1}{8}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): The half-life of a first-order reaction is independent of initial concentration. Reason (R): For a first-order reaction, $t_{1/2}=0.693/k$.`,
        2,
        ["assertion_reason", "first_order", "half_life"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The formula explains independence from initial concentration because $[A]_0$ is absent.`,
          C: L`The half-life expression is correct for first order.`,
          D: L`The assertion is also true for first-order kinetics.`,
        },
        [
          L`Recall the first-order half-life expression.`,
          L`Look for any dependence on $[A]_0$.`,
          L`There is no initial-concentration term in $0.693/k$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The reason correctly explains the assertion because $t_{1/2}=0.693/k$ contains no initial concentration term.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the integrated rate equation for a first-order reaction in terms of $[A]_0$, $[A]$ and $t$.`,
        1,
        ["first_order", "integrated_rate_equation", "recall"],
        parts([["a", L`Write one correct form.`, 1]]),
        [
          L`First order means rate is proportional to $[A]$.`,
          L`The logarithmic form is used.`,
          L`Either natural logarithm or common logarithm form is acceptable if constants match.`,
        ],
        [
          {
            part: "a",
            explanation: L`One correct form is`,
            math: L`k=\frac{2.303}{t}\log\frac{[A]_0}{[A]}`,
          },
        ],
        [
          L`Writing the zero-order equation.`,
          L`Putting $[A]/[A]_0$ inside the logarithm without changing the sign.`,
        ],
      ),
      frq(
        "saq",
        L`A first-order reaction falls from $0.100\,\mathrm{mol\,L^{-1}}$ to $0.025\,\mathrm{mol\,L^{-1}}$ in $20\,\mathrm{min}$. Calculate $k$. Given $\log 4=0.6021$.`,
        2,
        ["first_order", "rate_constant", "integrated_rate_equation"],
        parts([["a", L`Calculate $k$ in $\mathrm{min^{-1}}$.`, 2]]),
        [
          L`Use the first-order integrated equation.`,
          L`The concentration ratio is $0.100/0.025=4$.`,
          L`Substitute $\log 4=0.6021$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using the first-order expression,`,
            math: L`k=\frac{2.303}{20}\log4=\frac{2.303}{20}(0.6021)=0.0693\,\mathrm{min^{-1}}`,
          },
        ],
        [
          L`Using $0.025/0.100$ inside the logarithm and reporting a negative $k$.`,
          L`Forgetting the factor $2.303$ when using common logarithm.`,
        ],
      ),
      frq(
        "saq",
        L`For a zero-order reaction, $[A]_0=0.50\,\mathrm{mol\,L^{-1}}$ and $k=0.025\,\mathrm{mol\,L^{-1}\,min^{-1}}$. Calculate the half-life.`,
        2,
        ["zero_order", "half_life", "rate_constant"],
        parts([["a", L`Calculate $t_{1/2}$.`, 2]]),
        [
          L`For zero order, $t_{1/2}=[A]_0/(2k)$.`,
          L`Substitute $[A]_0=0.50$.`,
          L`The denominator is $2\times0.025$.`,
        ],
        [
          {
            part: "a",
            explanation: L`For a zero-order reaction,`,
            math: L`t_{1/2}=\frac{0.50}{2(0.025)}=10\,\mathrm{min}`,
          },
        ],
        [
          L`Using the first-order half-life formula.`,
          L`Forgetting the factor $2$ in the denominator.`,
        ],
      ),
      frq(
        "laq",
        L`For a reaction, the half-life is $20\,\mathrm{min}$ when $[A]_0=0.80\,\mathrm{mol\,L^{-1}}$ and $10\,\mathrm{min}$ when $[A]_0=0.40\,\mathrm{mol\,L^{-1}}$.`,
        3,
        ["zero_order", "half_life_data", "order_identification"],
        parts([
          ["a", L`Identify the order of the reaction.`, 1],
          ["b", L`Justify using half-life dependence.`, 1],
          ["c", L`Calculate $k$.`, 2],
        ]),
        [
          L`For first order, half-life does not change with initial concentration.`,
          L`For zero order, half-life is proportional to initial concentration.`,
          L`Use $t_{1/2}=[A]_0/(2k)$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reaction is zero order.`,
          },
          {
            part: "b",
            explanation: L`When $[A]_0$ is halved, the half-life is also halved; this matches zero-order kinetics.`,
          },
          {
            part: "c",
            explanation: L`Using the first data pair,`,
            math: L`k=\frac{[A]_0}{2t_{1/2}}=\frac{0.80}{2(20)}=0.020\,\mathrm{mol\,L^{-1}\,min^{-1}}`,
          },
        ],
        [
          L`Calling it first order because half-life is mentioned.`,
          L`Using $0.693/t_{1/2}$ for zero-order data.`,
        ],
      ),
      frq(
        "case",
        L`A disinfectant decomposes approximately by first-order kinetics in a closed bottle. Its concentration drops from $100$ units to $80$ units in $10$ days at room temperature. Use $\log(100/80)=0.0969$.`,
        3,
        ["case_based", "first_order", "shelf_life"],
        parts([
          ["a", L`Calculate $k$ in $\mathrm{day^{-1}}$.`, 2],
          ["b", L`Estimate the half-life.`, 1],
          [
            "c",
            L`State why first-order half-life is useful for storage prediction.`,
            1,
          ],
        ]),
        [
          L`Use $k=\frac{2.303}{t}\log\frac{[A]_0}{[A]}$.`,
          L`Then use $t_{1/2}=0.693/k$.`,
          L`For first order, the half-life does not depend on the starting amount.`,
        ],
        [
          {
            part: "a",
            explanation: L`The first-order rate constant is`,
            math: L`k=\frac{2.303}{10}(0.0969)=0.0223\,\mathrm{day^{-1}}`,
          },
          {
            part: "b",
            explanation: L`The half-life is approximately`,
            math: L`t_{1/2}=\frac{0.693}{0.0223}\approx31\,\mathrm{days}`,
          },
          {
            part: "c",
            explanation: L`It is useful because equal time intervals reduce the remaining amount by the same fraction.`,
          },
        ],
        [
          L`Using $80/100$ inside the logarithm and getting a negative rate constant.`,
          L`Using zero-order half-life for a first-order process.`,
        ],
      ),
    ],
  },
  {
    topicCode: "3.4",
    title: "Temperature Dependence and Arrhenius Equation",
    subtopic:
      "Arrhenius equation, activation energy, temperature coefficient and catalyst effect on activation energy.",
    mc: [
      mc(
        L`In the Arrhenius plot shown, the slope is $-6000\,\mathrm{K}$. The activation energy is closest to $(R=8.314\,\mathrm{J\,mol^{-1}\,K^{-1}})$`,
        3,
        ["arrhenius_plot", "activation_energy", "graph_slope"],
        [
          L`$25\,\mathrm{kJ\,mol^{-1}}$`,
          L`$50\,\mathrm{kJ\,mol^{-1}}$`,
          L`$72\,\mathrm{kJ\,mol^{-1}}$`,
          L`$6000\,\mathrm{kJ\,mol^{-1}}$`,
        ],
        "B",
        {
          A: L`This is about half of $6000R$ and comes from an arithmetic slip.`,
          C: L`This does not match the slope relation $slope=-E_a/R$.`,
          D: L`The slope is not directly the activation energy in kilojoules.`,
        },
        [
          L`For a plot of $\ln k$ versus $1/T$, slope $=-E_a/R$.`,
          L`So $E_a=6000R$.`,
          L`Convert joules to kilojoules.`,
        ],
        [
          {
            step: 1,
            explanation: L`The slope magnitude is $E_a/R$.`,
            math: L`E_a=6000(8.314)=4.99\times10^4\,\mathrm{J\,mol^{-1}}\approx50\,\mathrm{kJ\,mol^{-1}}`,
          },
        ],
        arrheniusPlotFigure,
      ),
      mc(
        L`If the rate of a reaction doubles for every $10\,\mathrm{K}$ rise, then increasing temperature from $300\,\mathrm{K}$ to $320\,\mathrm{K}$ changes the rate by a factor of`,
        2,
        ["temperature_coefficient", "rate_factor", "temperature_dependence"],
        [L`$2$`, L`$3$`, L`$4$`, L`$8$`],
        "C",
        {
          A: L`This accounts for only one $10\,\mathrm{K}$ interval.`,
          B: L`The factor is multiplicative, not additive.`,
          D: L`This counts three $10\,\mathrm{K}$ intervals instead of two.`,
        },
        [
          L`The temperature rise is $20\,\mathrm{K}$.`,
          L`That is two intervals of $10\,\mathrm{K}$.`,
          L`Each interval doubles the rate.`,
        ],
        [
          {
            step: 1,
            explanation: L`Two successive doublings give`,
            math: L`2^2=4`,
          },
        ],
      ),
      mc(
        L`For an Arrhenius plot of $\ln k$ versus $1/T$, the intercept is`,
        2,
        ["arrhenius_equation", "graph_intercept", "pre_exponential_factor"],
        [L`$E_a/R$`, L`$-E_a/R$`, L`$\ln A$`, L`$-\ln A$`],
        "C",
        {
          A: L`$E_a/R$ is related to the magnitude of the slope, not the intercept.`,
          B: L`$-E_a/R$ is the slope.`,
          D: L`The intercept is positive $\ln A$ in the standard form.`,
        },
        [
          L`Write the Arrhenius equation in straight-line form.`,
          L`$\ln k=\ln A-\frac{E_a}{R}\frac{1}{T}$.`,
          L`Compare with $y=c+mx$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The straight-line form is`,
            math: L`\ln k=\ln A-\frac{E_a}{R}\left(\frac{1}{T}\right)`,
          },
        ],
      ),
      mc(
        L`A catalyst increases the rate of a reaction primarily by`,
        2,
        ["catalyst", "activation_energy", "temperature_dependence"],
        [
          L`increasing the enthalpy change of the reaction`,
          L`lowering the activation energy of the path`,
          L`increasing the equilibrium constant permanently`,
          L`making all collisions effective`,
        ],
        "B",
        {
          A: L`A catalyst does not increase the reaction enthalpy.`,
          C: L`A catalyst does not change the equilibrium constant.`,
          D: L`A catalyst increases the fraction of effective collisions, but not every collision becomes effective.`,
        },
        [
          L`Catalysts provide an alternate pathway.`,
          L`The alternate pathway has lower activation energy.`,
          L`Thermodynamic quantities such as equilibrium constant are not changed.`,
        ],
        [
          {
            step: 1,
            explanation: L`A catalyst provides a lower-activation-energy pathway, increasing the rate.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Increasing temperature usually increases the rate constant. Reason (R): A larger fraction of molecules have energy equal to or greater than activation energy at higher temperature.`,
        2,
        ["assertion_reason", "temperature_effect", "activation_energy"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains the increase in rate constant.`,
          C: L`The reason is true under collision-theory interpretation.`,
          D: L`The assertion is true for most reactions.`,
        },
        [
          L`Rate constant depends on temperature through Arrhenius equation.`,
          L`Higher temperature increases the high-energy tail of molecular energies.`,
          L`More molecules can cross the activation barrier.`,
        ],
        [
          {
            step: 1,
            explanation: L`A higher temperature increases the fraction of molecules with sufficient energy for effective collisions, so $k$ generally increases.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is activation energy of a chemical reaction?`,
        1,
        ["activation_energy", "definition", "arrhenius_equation"],
        parts([["a", L`Give a concise definition.`, 1]]),
        [
          L`Activation energy is an energy barrier.`,
          L`Reactant molecules must cross it to form products.`,
          L`It is related to the slope of an Arrhenius plot.`,
        ],
        [
          {
            part: "a",
            explanation: L`Activation energy is the minimum extra energy that reacting species must possess for a collision to lead to products.`,
          },
        ],
        [
          L`Calling it the heat released by the reaction.`,
          L`Saying it is required only for endothermic reactions.`,
        ],
      ),
      frq(
        "saq",
        L`For a reaction, $k_1=2.0\times10^{-3}\,\mathrm{s^{-1}}$ at $300\,\mathrm{K}$ and $k_2=8.0\times10^{-3}\,\mathrm{s^{-1}}$ at $330\,\mathrm{K}$. Calculate $E_a$. Use $\log4=0.6021$ and $R=8.314\,\mathrm{J\,mol^{-1}\,K^{-1}}$.`,
        4,
        ["arrhenius_equation", "activation_energy", "two_temperature_data"],
        parts([["a", L`Calculate $E_a$ in $\mathrm{kJ\,mol^{-1}}$.`, 4]]),
        [
          L`Use the two-temperature Arrhenius equation.`,
          L`Here $k_2/k_1=4$.`,
          L`Solve for $E_a$ and convert to kilojoules.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using the two-temperature form,`,
            math: L`E_a=\frac{2.303R\log(k_2/k_1)T_1T_2}{T_2-T_1}`,
          },
          {
            part: "a",
            explanation: L`Substitution gives`,
            math: L`E_a=\frac{2.303(8.314)(0.6021)(300)(330)}{30}=3.8\times10^4\,\mathrm{J\,mol^{-1}}=38\,\mathrm{kJ\,mol^{-1}}`,
          },
        ],
        [
          L`Using $T_2+T_1$ in the denominator.`,
          L`Forgetting to convert joules to kilojoules.`,
        ],
      ),
      frq(
        "saq",
        L`An Arrhenius plot of $\ln k$ against $1/T$ has slope $-5000\,\mathrm{K}$. Calculate the activation energy. Use $R=8.314\,\mathrm{J\,mol^{-1}\,K^{-1}}$.`,
        2,
        ["arrhenius_plot", "activation_energy", "slope"],
        parts([["a", L`Calculate $E_a$.`, 2]]),
        [
          L`For $\ln k$ versus $1/T$, slope $=-E_a/R$.`,
          L`So $E_a$ equals slope magnitude times $R$.`,
          L`Convert to kilojoules per mole.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using the slope relation,`,
            math: L`E_a=5000(8.314)=4.16\times10^4\,\mathrm{J\,mol^{-1}}=41.6\,\mathrm{kJ\,mol^{-1}}`,
          },
        ],
        [
          L`Reporting $5000\,\mathrm{kJ\,mol^{-1}}$ directly.`,
          L`Keeping the negative sign for activation energy.`,
        ],
      ),
      frq(
        "laq",
        L`For a reaction, $k_1=1.0\times10^{-4}\,\mathrm{s^{-1}}$ at $300\,\mathrm{K}$ and $E_a=57.5\,\mathrm{kJ\,mol^{-1}}$. Estimate $k_2$ at $310\,\mathrm{K}$. Use $R=8.314\,\mathrm{J\,mol^{-1}\,K^{-1}}$ and take $\log(k_2/k_1)\approx0.323$.`,
        4,
        ["arrhenius_equation", "temperature_prediction", "rate_constant"],
        parts([
          ["a", L`Write the two-temperature Arrhenius expression.`, 1],
          ["b", L`Find $k_2/k_1$.`, 2],
          ["c", L`Calculate $k_2$.`, 1],
        ]),
        [
          L`Use the supplied logarithm value for the ratio.`,
          L`Convert from logarithm to ratio.`,
          L`Multiply by $k_1$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The two-temperature expression is`,
            math: L`\log\frac{k_2}{k_1}=\frac{E_a}{2.303R}\frac{T_2-T_1}{T_1T_2}`,
          },
          {
            part: "b",
            explanation: L`The problem gives $\log(k_2/k_1)\approx0.323$, so`,
            math: L`\frac{k_2}{k_1}\approx10^{0.323}\approx2.1`,
          },
          {
            part: "c",
            explanation: L`Therefore,`,
            math: L`k_2\approx2.1\times10^{-4}\,\mathrm{s^{-1}}`,
          },
        ],
        [
          L`Using Celsius temperatures instead of kelvin.`,
          L`Dividing $k_1$ by the ratio even though temperature increases.`,
        ],
      ),
      frq(
        "case",
        L`A medicine decomposes approximately by first-order kinetics. At $298\,\mathrm{K}$, $k=0.010\,\mathrm{day^{-1}}$. Its activation energy is about $48\,\mathrm{kJ\,mol^{-1}}$. When stored at $308\,\mathrm{K}$, the rate constant becomes about $1.9$ times larger.`,
        3,
        ["case_based", "arrhenius_equation", "storage_stability"],
        parts([
          ["a", L`Calculate the half-life at $298\,\mathrm{K}$.`, 1],
          ["b", L`Estimate $k$ at $308\,\mathrm{K}$.`, 1],
          ["c", L`Estimate the half-life at $308\,\mathrm{K}$.`, 1],
          ["d", L`State why warmer storage shortens shelf life.`, 1],
        ]),
        [
          L`Use first-order half-life at each temperature.`,
          L`At $308\,\mathrm{K}$, multiply the rate constant by $1.9$.`,
          L`Larger $k$ means shorter half-life.`,
        ],
        [
          {
            part: "a",
            explanation: L`At $298\,\mathrm{K}$,`,
            math: L`t_{1/2}=\frac{0.693}{0.010}=69.3\,\mathrm{days}`,
          },
          {
            part: "b",
            explanation: L`At $308\,\mathrm{K}$,`,
            math: L`k\approx1.9(0.010)=0.019\,\mathrm{day^{-1}}`,
          },
          {
            part: "c",
            explanation: L`The new half-life is`,
            math: L`t_{1/2}=\frac{0.693}{0.019}\approx36\,\mathrm{days}`,
          },
          {
            part: "d",
            explanation: L`At higher temperature, more molecules cross the activation-energy barrier, increasing $k$.`,
          },
        ],
        [
          L`Assuming $k$ decreases with temperature.`,
          L`Using the same half-life at both temperatures despite different $k$.`,
        ],
      ),
    ],
  },
  {
    topicCode: "3.5",
    title: "Collision Theory and Mechanism-Based Reasoning",
    subtopic:
      "Effective collisions, orientation, activation energy, slow step and qualitative mechanism reasoning.",
    mc: [
      mc(
        L`According to collision theory, a collision between reactant molecules is effective only if the molecules`,
        1,
        ["collision_theory", "effective_collision", "activation_energy"],
        [
          L`collide with sufficient energy and proper orientation`,
          L`collide with any energy if concentration is high`,
          L`move slowly enough to remain together`,
          L`are products rather than reactants`,
        ],
        "A",
        {
          B: L`High concentration increases collision frequency, but each collision still needs sufficient energy and orientation.`,
          C: L`Slow movement alone does not ensure product formation.`,
          D: L`Effective collisions occur between reactant species.`,
        },
        [
          L`Not every collision forms products.`,
          L`Energy must overcome the activation barrier.`,
          L`Orientation must permit bond breaking and formation.`,
        ],
        [
          {
            step: 1,
            explanation: L`An effective collision requires both energy at least equal to activation energy and a favourable orientation.`,
          },
        ],
      ),
      mc(
        L`For the elementary step $\mathrm{NO+O_3\rightarrow NO_2+O_2}$, the molecularity is`,
        1,
        ["molecularity", "elementary_step", "collision_theory"],
        [L`$1$`, L`$2$`, L`$3$`, L`$4$`],
        "B",
        {
          A: L`One molecule alone is not reacting in this step.`,
          C: L`There are two reactant species, not three.`,
          D: L`Products are not counted while assigning molecularity.`,
        },
        [
          L`Molecularity counts reacting species in an elementary step.`,
          L`Count only reactants, not products.`,
          L`The reactants are $\mathrm{NO}$ and $\mathrm{O_3}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Two reactant species collide in the elementary step, so molecularity is $2$.`,
          },
        ],
      ),
      mc(
        L`For a two-step mechanism, Step 1: $\mathrm{A+B\rightarrow I}$ slow; Step 2: $\mathrm{I+C\rightarrow P}$ fast. The expected rate law is`,
        2,
        ["mechanism", "slow_step", "rate_law"],
        [L`$r=k[A][B]$`, L`$r=k[I][C]$`, L`$r=k[A][B][C]$`, L`$r=k[P]$`],
        "A",
        {
          B: L`This uses the fast step and includes an intermediate as if it controlled the rate directly.`,
          C: L`The reactant $\mathrm{C}$ appears only after the slow step.`,
          D: L`Product concentration does not define the forward rate law here.`,
        },
        [
          L`The slow step controls the rate.`,
          L`Use reactants of the slow elementary step.`,
          L`Step 1 contains $\mathrm{A}$ and $\mathrm{B}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The slow elementary step is rate-determining, so`,
            math: L`r=k[A][B]`,
          },
        ],
      ),
      mc(
        L`A catalyst changes the rate but does not change $\Delta H$ of the overall reaction because it`,
        2,
        ["catalyst", "enthalpy", "activation_energy"],
        [
          L`changes only the path between the same reactants and products`,
          L`changes the products into different substances`,
          L`raises the activation energy of both directions`,
          L`stops the reverse reaction completely`,
        ],
        "A",
        {
          B: L`A catalyst does not define a different overall reaction.`,
          C: L`A catalyst lowers the activation-energy path rather than raising it.`,
          D: L`A catalyst affects both forward and reverse paths; it does not stop the reverse reaction.`,
        },
        [
          L`Enthalpy change depends on initial and final states.`,
          L`Catalysts provide an alternate pathway.`,
          L`The same reactants and products mean the same $\Delta H$.`,
        ],
        [
          {
            step: 1,
            explanation: L`A catalyst changes the pathway and activation energy, not the enthalpy difference between reactants and products.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): An overall reaction may have fractional order. Reason (R): In a complex reaction, the observed rate law can include intermediate or equilibrium terms after the rate-determining step is analysed.`,
        3,
        ["assertion_reason", "order", "mechanism"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The mechanism-based rate law is the reason fractional order can arise.`,
          C: L`The reason is true and explains how fractional powers may enter an observed rate law.`,
          D: L`The assertion is true; experimental order can be fractional.`,
        },
        [
          L`Order is determined experimentally for the overall reaction.`,
          L`Molecularity belongs to elementary steps.`,
          L`Complex mechanisms can produce non-integral overall orders.`,
        ],
        [
          {
            step: 1,
            explanation: L`Fractional overall orders can arise when the observed rate law is obtained from a complex mechanism, especially after intermediate concentrations or equilibrium relations are substituted into the slow-step rate expression.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is an effective collision in collision theory?`,
        1,
        ["collision_theory", "effective_collision", "definition"],
        parts([["a", L`Define briefly.`, 1]]),
        [
          L`A collision alone is not enough.`,
          L`Energy and orientation both matter.`,
          L`The collision must lead to product formation.`,
        ],
        [
          {
            part: "a",
            explanation: L`An effective collision is a collision in which reacting species have sufficient energy and proper orientation to form products.`,
          },
        ],
        [
          L`Calling every collision effective.`,
          L`Mentioning energy but ignoring orientation.`,
        ],
      ),
      frq(
        "saq",
        L`For the mechanism Step 1: $\mathrm{A+B\rightarrow I}$ slow; Step 2: $\mathrm{I+C\rightarrow D}$ fast, write the rate law and explain why $\mathrm{C}$ does not appear in it.`,
        2,
        ["mechanism", "slow_step", "rate_law"],
        parts([
          ["a", L`Write the rate law.`, 1],
          ["b", L`Explain the absence of $\mathrm{C}$.`, 1],
        ]),
        [
          L`The slow step controls the observed rate.`,
          L`Use reactants in the slow step.`,
          L`$\mathrm{C}$ reacts only after the slow step has produced intermediate $\mathrm{I}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The rate law from the slow elementary step is`,
            math: L`r=k[A][B]`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{C}$ is not in the slow step, so it does not control the rate in this simple mechanism.`,
          },
        ],
        [
          L`Including all reactants from the overall reaction in the rate law.`,
          L`Using the intermediate concentration directly in the final answer.`,
        ],
      ),
      frq(
        "saq",
        L`Explain qualitatively why increasing temperature increases the number of effective collisions even if total concentration is unchanged.`,
        2,
        ["collision_theory", "temperature_effect", "activation_energy"],
        parts([["a", L`Give the explanation.`, 2]]),
        [
          L`Total concentration controls collision frequency partly.`,
          L`Temperature changes molecular energy distribution.`,
          L`More molecules exceed activation energy at higher temperature.`,
        ],
        [
          {
            part: "a",
            explanation: L`At higher temperature, the molecular energy distribution shifts so that a larger fraction of molecules have energy at least equal to activation energy. Hence a greater fraction of collisions are effective, even at the same concentration.`,
          },
        ],
        [
          L`Saying temperature changes only concentration.`,
          L`Ignoring activation energy and discussing only speed.`,
        ],
      ),
      frq(
        "laq",
        L`A reaction is slow at room temperature but becomes much faster when a catalyst is added. The same products are formed, and the heat of reaction is unchanged.`,
        3,
        ["catalyst", "collision_theory", "activation_energy"],
        parts([
          ["a", L`Explain how the catalyst increases the rate.`, 1],
          ["b", L`State whether activation energy increases or decreases.`, 1],
          ["c", L`State whether $\Delta H$ changes.`, 1],
          ["d", L`Explain the answer to part (c).`, 1],
        ]),
        [
          L`A catalyst provides an alternate pathway.`,
          L`The pathway has a lower activation barrier.`,
          L`$\Delta H$ depends only on reactants and products.`,
        ],
        [
          {
            part: "a",
            explanation: L`The catalyst provides an alternate pathway with a larger fraction of effective collisions.`,
          },
          {
            part: "b",
            explanation: L`The activation energy decreases.`,
          },
          {
            part: "c",
            explanation: L`$\Delta H$ does not change.`,
          },
          {
            part: "d",
            explanation: L`The same reactants and products are involved, so the enthalpy difference between initial and final states is unchanged.`,
          },
        ],
        [
          L`Claiming a catalyst changes the heat of reaction.`,
          L`Saying the catalyst is consumed as a reactant.`,
        ],
      ),
      frq(
        "case",
        L`In an atmospheric reaction, a trace species $\mathrm{X}$ reacts with ozone in an elementary step: $\mathrm{X+O_3\rightarrow XO+O_2}$. The step is followed by fast reactions that regenerate $\mathrm{X}$, so a small amount of $\mathrm{X}$ can influence many ozone molecules.`,
        3,
        ["case_based", "elementary_step", "catalyst", "collision_theory"],
        parts([
          ["a", L`State the molecularity of the elementary step.`, 1],
          ["b", L`Write the rate law for the elementary step.`, 1],
          [
            "c",
            L`Why can a trace amount of $\mathrm{X}$ influence many molecules?`,
            1,
          ],
          [
            "d",
            L`What collision condition, besides sufficient energy, is required for the step to be effective?`,
            1,
          ],
        ]),
        [
          L`Count reactants in the elementary step.`,
          L`For an elementary step, use the reactants in the rate law.`,
          L`Regeneration is a sign of catalytic behaviour.`,
        ],
        [
          {
            part: "a",
            explanation: L`The step is bimolecular.`,
          },
          {
            part: "b",
            explanation: L`For the elementary step,`,
            math: L`r=k[\mathrm{X}][\mathrm{O_3}]`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{X}$ is regenerated, so it can participate repeatedly instead of being consumed stoichiometrically.`,
          },
          {
            part: "d",
            explanation: L`The reacting species must collide with proper orientation.`,
          },
        ],
        [
          L`Counting product molecules while finding molecularity.`,
          L`Forgetting orientation as a requirement for effective collision.`,
        ],
      ),
    ],
  },
];

export const chemicalKineticsTopics: Topic[] = topicSeeds.map(makeTopic);
