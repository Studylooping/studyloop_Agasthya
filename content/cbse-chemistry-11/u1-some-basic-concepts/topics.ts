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

const COURSE = "cbse-chemistry-11";
const UNIT = "u1-some-basic-concepts";
const VERSION = "0.2.0";
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
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightleftharpoons|ightarrow)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|log|Delta|alpha|circ|rightleftharpoons|rightarrow|approx)\b/g,
        "$1\\$2",
      ),
  );
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
  return `You chose ${choiceText}. Recheck the mole ratio, significant-figure rule, or unit conversion before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : (seed.misconceptionTags?.[seedLetter] ??
          "incorrect_cbse_class11_chemistry_mole_stoichiometry_reasoning"),
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
  const reauthored =
    (meta.topicCode === "1.2" && index === 9) ||
    (meta.topicCode === "1.3" && (index === 5 || index === 6));

  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_numbers_directly_without_checking_moles_units_or_precision",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
    reviewStatus: reauthored ? "ai_reviewed" : REVIEW_STATUS,
    ...(!reauthored && VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeConstructed(
  meta: TopicMeta,
  seed: ConstructedSeed,
  index: number,
): FrqItem {
  const reauthored =
    index === 5 && (meta.topicCode === "1.3" || meta.topicCode === "1.5");
  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_final_answer_without_balanced_equation_or_unit_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
    reviewStatus: reauthored ? "ai_reviewed" : REVIEW_STATUS,
    ...(!reauthored && VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return {
    maxPoints: points,
    criteria: [{ part, points, description }],
  };
}

const graduatedCylinderFigure: ItemFigure = {
  type: "svg",
  title: "Graduated cylinder reading",
  description:
    "A liquid meniscus lies between 24 mL and 25 mL on a cylinder marked in 0.1 mL divisions.",
  svg: `<svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="420" height="360" fill="#ffffff"/>
  <text x="210" y="34" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">Graduated cylinder</text>
  <path d="M145 70 L145 304 Q145 328 210 328 Q275 328 275 304 L275 70" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <ellipse cx="210" cy="70" rx="65" ry="18" fill="#ffffff" stroke="#334155" stroke-width="3"/>
  <path d="M145 188 Q210 196.4 275 188 L275 304 Q275 326 210 326 Q145 326 145 304 Z" fill="#bfdbfe" opacity="0.9"/>
  <path d="M145 188 Q210 196.4 275 188" fill="none" stroke="#2563eb" stroke-width="3"/>
  <line x1="290" y1="286" x2="338" y2="286" stroke="#334155" stroke-width="2"/>
  <line x1="290" y1="230" x2="352" y2="230" stroke="#334155" stroke-width="2"/>
  <line x1="290" y1="174" x2="338" y2="174" stroke="#334155" stroke-width="2"/>
  <line x1="290" y1="118" x2="352" y2="118" stroke="#334155" stroke-width="2"/>
  <text x="360" y="292" font-family="Arial" font-size="15" fill="#111827">23</text>
  <text x="360" y="236" font-family="Arial" font-size="15" fill="#111827">24</text>
  <text x="360" y="180" font-family="Arial" font-size="15" fill="#111827">25</text>
  <text x="360" y="124" font-family="Arial" font-size="15" fill="#111827">26</text>
  ${Array.from({ length: 31 }, (_, i) => {
    const y = 286 - i * 5.6;
    const isWhole = i % 10 === 0;
    const isHalf = i % 5 === 0;
    const x2 = isWhole ? 352 : isHalf ? 344 : 336;
    return `<line x1="290" y1="${y.toFixed(1)}" x2="${x2}" y2="${y.toFixed(1)}" stroke="#64748b" stroke-width="${isWhole ? 2 : 1.2}"/>`;
  }).join("")}
  <text x="210" y="348" text-anchor="middle" font-family="Arial" font-size="14" fill="#475569">Smallest marked division = 0.1 mL</text>
</svg>`,
};

const limitingParticleFigure: ItemFigure = {
  type: "svg",
  title: "Particle model for ammonia formation",
  description:
    "A particle diagram shows nitrogen and hydrogen molecules before reaction.",
  svg: `<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="300" fill="#ffffff"/>
  <text x="280" y="34" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">Before reaction</text>
  <rect x="38" y="58" width="484" height="206" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <text x="130" y="86" text-anchor="middle" font-family="Arial" font-size="15" fill="#1e3a8a">N<tspan baseline-shift="sub" font-size="11">2</tspan> molecules</text>
  <text x="402" y="86" text-anchor="middle" font-family="Arial" font-size="15" fill="#7c2d12">H<tspan baseline-shift="sub" font-size="11">2</tspan> molecules</text>
  <g fill="#2563eb" stroke="#1d4ed8" stroke-width="2">
    <circle cx="88" cy="126" r="14"/><circle cx="118" cy="126" r="14"/>
    <circle cx="88" cy="176" r="14"/><circle cx="118" cy="176" r="14"/>
    <circle cx="176" cy="126" r="14"/><circle cx="206" cy="126" r="14"/>
    <circle cx="176" cy="176" r="14"/><circle cx="206" cy="176" r="14"/>
  </g>
  <g fill="#f97316" stroke="#c2410c" stroke-width="2">
    <circle cx="332" cy="120" r="10"/><circle cx="354" cy="120" r="10"/>
    <circle cx="396" cy="120" r="10"/><circle cx="418" cy="120" r="10"/>
    <circle cx="460" cy="120" r="10"/><circle cx="482" cy="120" r="10"/>
    <circle cx="332" cy="164" r="10"/><circle cx="354" cy="164" r="10"/>
    <circle cx="396" cy="164" r="10"/><circle cx="418" cy="164" r="10"/>
    <circle cx="460" cy="164" r="10"/><circle cx="482" cy="164" r="10"/>
    <circle cx="332" cy="208" r="10"/><circle cx="354" cy="208" r="10"/>
    <circle cx="396" cy="208" r="10"/><circle cx="418" cy="208" r="10"/>
    <circle cx="460" cy="208" r="10"/><circle cx="482" cy="208" r="10"/>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Matter, Measurement and Laws",
    subtopic:
      "States and classification of matter, measurement, uncertainty, significant figures, and laws of chemical combination.",
    mc: [
      {
        questionLatex: L`The liquid level in the graduated cylinder is read at the bottom of the meniscus. The best reported volume is`,
        figure: graduatedCylinderFigure,
        difficulty: 2,
        skillTags: ["measurement", "least_count", "significant_figures"],
        choices: [
          L`$24.6\text{ mL}$`,
          L`$24.0\text{ mL}$`,
          L`$25.0\text{ mL}$`,
          L`$24.60\text{ mL}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This reads only the numbered mark and ignores the ten equal subdivisions between 24 and 25 mL.",
          C: "The meniscus is below 25 mL, so rounding to 25.0 mL overstates the reading.",
          D: "The scale is marked to 0.1 mL; writing 24.60 mL claims an extra decimal place not supported by the instrument.",
        },
        hints: [
          "Read the bottom of the meniscus.",
          "Each small division is $0.1\\text{ mL}$.",
          "The bottom of the meniscus lies six small divisions after $24\\text{ mL}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The meniscus is read at the bottom and lies six small divisions past the 24 mL mark.",
            math: L`24.0+0.6=24.6`,
          },
          {
            step: 2,
            explanation:
              "Because the smallest marked division is 0.1 mL, the suitable reported reading is 24.6 mL.",
            math: L`24.6\text{ mL}`,
          },
        ],
      },
      {
        questionLatex: L`Three masses are added: $12.11\text{ g}$, $18.0\text{ g}$ and $1.013\text{ g}$. Which reported sum follows the rule for addition of measured quantities?`,
        difficulty: 2,
        skillTags: ["significant_figures", "addition_rule"],
        choices: [
          L`$31.123\text{ g}$`,
          L`$31.12\text{ g}$`,
          L`$31\text{ g}$`,
          L`$31.1\text{ g}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This keeps all calculator digits and ignores the least precise decimal place.",
          B: "The measurement 18.0 g has only one decimal place, so the final sum cannot be reported to hundredths.",
          C: "This rounds too much; one decimal place is still justified.",
        },
        hints: [
          "For addition and subtraction, compare decimal places, not total significant figures.",
          "$18.0\\text{ g}$ is given to one decimal place.",
          "First add normally, then round to one decimal place.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the masses.",
            math: L`12.11+18.0+1.013=31.123`,
          },
          {
            step: 2,
            explanation:
              "The least precise measurement is given to one decimal place, so round the result to one decimal place.",
            math: L`31.123\text{ g}\approx31.1\text{ g}`,
          },
        ],
      },
      {
        questionLatex: L`A student measures the mass of a liquid as $5.64\text{ g}$ and its volume as $2.3\text{ mL}$. The density should be reported as`,
        difficulty: 2,
        skillTags: ["density", "significant_figures", "division_rule"],
        choices: [
          L`$2.452\text{ g mL}^{-1}$`,
          L`$2.45\text{ g mL}^{-1}$`,
          L`$2.5\text{ g mL}^{-1}$`,
          L`$2\text{ g mL}^{-1}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the unrounded calculator value.",
          B: "The volume has only two significant figures, so three significant figures are not justified.",
          D: "This rounds too much; two significant figures are allowed.",
        },
        hints: [
          "Density is mass divided by volume.",
          "For multiplication and division, the answer has the same number of significant figures as the least precise factor.",
          "$2.3$ has two significant figures.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate density.",
            math: L`\rho=\frac{5.64}{2.3}=2.452\ldots`,
          },
          {
            step: 2,
            explanation:
              "The limiting measurement has two significant figures, so report the density to two significant figures.",
            math: L`\rho=2.5\text{ g mL}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A compound of carbon and oxygen is prepared twice. Sample I has $12\text{ g}$ carbon combined with $32\text{ g}$ oxygen. Sample II has $3\text{ g}$ carbon. According to the law of definite proportions, the mass of oxygen in Sample II is`,
        difficulty: 2,
        skillTags: ["law_of_definite_proportions", "mass_ratio"],
        choices: [
          L`$8\text{ g}$`,
          L`$4\text{ g}$`,
          L`$16\text{ g}$`,
          L`$35\text{ g}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses an oxygen-to-carbon ratio of $4:3$, not the given fixed ratio.",
          C: "This doubles the correct oxygen mass.",
          D: "This adds the masses from Sample I and does not keep the fixed composition ratio.",
        },
        hints: [
          "Keep the oxygen-to-carbon mass ratio constant.",
          "In Sample I, $32\\text{ g}$ oxygen combines with $12\\text{ g}$ carbon.",
          "Scale the oxygen mass in the same ratio as carbon changes from $12\\text{ g}$ to $3\\text{ g}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The oxygen-to-carbon mass ratio is fixed.",
            math: L`\frac{m_O}{m_C}=\frac{32}{12}`,
          },
          {
            step: 2,
            explanation:
              "For 3 g of carbon, multiply by the same oxygen-to-carbon ratio.",
            math: L`m_O=3\times\frac{32}{12}=8\text{ g}`,
          },
        ],
      },
      {
        questionLatex: L`Calcium carbonate is heated in a closed vessel: $\mathrm{CaCO_3(s)\rightarrow CaO(s)+CO_2(g)}$. If the vessel initially contains $10.0\text{ g}$ of pure calcium carbonate, the total mass of products after complete decomposition is`,
        difficulty: 2,
        skillTags: ["law_of_conservation_of_mass", "chemical_change"],
        choices: [
          L`exactly $10.0\text{ g}$ in the closed vessel`,
          L`less than $10.0\text{ g}$ because carbon dioxide is a gas`,
          L`more than $10.0\text{ g}$ because heat is supplied`,
          L`cannot be predicted without the volume of the vessel`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Gas formation does not reduce total mass in a closed vessel.",
          C: "Supplying heat changes energy, not the total mass of matter in this chemical equation.",
          D: "The conservation statement does not require vessel volume.",
        },
        hints: [
          "Ask whether matter can escape.",
          "The vessel is closed.",
          "The law of conservation of mass applies to the total mass of reactants and products.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a closed vessel, carbon dioxide remains inside the system.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "Therefore, the total mass of products equals the original mass of calcium carbonate.",
            math: L`m_{\text{products}}=10.0\text{ g}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A measured length is reported as $4.070\text{ cm}$.`,
        difficulty: 1,
        skillTags: ["significant_figures", "zeros"],
        parts: singlePart("a", "How many significant figures are present?", 1),
        hints: [
          "Zeros between non-zero digits are significant.",
          "Trailing zeros to the right of a decimal point are significant.",
          "Count 4, 0, 7 and the final 0.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Identifies that $4.070$ has four significant figures.",
        ),
        commonErrors: ["Ignoring the final zero after the decimal point."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Both zeros are significant: the captive zero lies between non-zero digits and the final zero is written after the decimal point. Hence $4.070$ has four significant figures.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A sample contains $2.40\text{ g}$ of magnesium and $1.60\text{ g}$ of oxygen.`,
        difficulty: 2,
        skillTags: ["mass_percent", "composition"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the mass percentage of magnesium.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the mass percentage of oxygen.",
            points: 1,
          },
        ],
        hints: [
          "First find the total mass.",
          "Mass percentage is component mass divided by total mass, multiplied by 100.",
          "The percentages should add to $100\\%$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $60.0\\%$ magnesium." },
            { part: "b", points: 1, description: "Finds $40.0\\%$ oxygen." },
          ],
        },
        commonErrors: [
          "Dividing by the mass of the other element instead of total mass.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Total mass $=2.40+1.60=4.00\\text{ g}$. Magnesium percentage $=(2.40/4.00)\\times100=60.0\\%$.",
          },
          {
            part: "b",
            explanation: "Oxygen percentage $=(1.60/4.00)\\times100=40.0\\%$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student records the following data for a reaction in a closed flask: total mass before reaction $=84.37\text{ g}$ and total mass after reaction $=84.32\text{ g}$.`,
        difficulty: 3,
        skillTags: ["conservation_of_mass", "experimental_error"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State whether the data exactly obeys conservation of mass.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Give one reasonable experimental reason for the difference.",
            points: 1,
          },
        ],
        hints: [
          "Compare the two recorded masses directly.",
          "The law is exact for a closed system, but measurements may have error.",
          "Think of balance reading error, transfer loss, or an imperfectly closed flask.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that the recorded values differ by $0.05\\text{ g}$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Gives a plausible measurement or handling error without rejecting the conservation law.",
            },
          ],
        },
        commonErrors: [
          "Claiming that mass is not conserved because the measured values differ slightly.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The recorded masses are not exactly equal; the difference is $84.37-84.32=0.05\\text{ g}$.",
          },
          {
            part: "b",
            explanation:
              "A small difference can come from balance uncertainty, evaporation/leakage if the flask was not perfectly closed, or loss of material on the stopper. This is experimental error, not failure of the conservation law.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two oxides of an element $X$ are analysed. In oxide I, $1.50\text{ g}$ of $X$ combines with $0.40\text{ g}$ oxygen. In oxide II, $1.50\text{ g}$ of $X$ combines with $0.80\text{ g}$ oxygen.`,
        difficulty: 4,
        skillTags: ["law_of_multiple_proportions", "ratio_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the ratio of oxygen masses that combine with the same mass of $X$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Name the law illustrated by this result and justify briefly.",
            points: 2,
          },
        ],
        hints: [
          "The mass of $X$ is already the same in both samples.",
          "Compare only the oxygen masses.",
          "The law requires a simple whole-number ratio.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Obtains $0.40:0.80=1:2$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Names law of multiple proportions and connects it to a simple whole-number ratio for fixed mass of one element.",
            },
          ],
        },
        commonErrors: [
          "Comparing total compound masses instead of masses of oxygen.",
          "Naming law of definite proportions instead of multiple proportions.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For the same $1.50\\text{ g}$ of $X$, the oxygen masses are $0.40\\text{ g}$ and $0.80\\text{ g}$. Their ratio is $0.40:0.80=1:2$.",
          },
          {
            part: "b",
            explanation:
              "This illustrates the law of multiple proportions: when two elements form more than one compound, the masses of one element combining with a fixed mass of the other are in a simple whole-number ratio.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A lab group measures the same liquid sample three times and obtains $19.8\text{ mL}$, $20.1\text{ mL}$ and $20.0\text{ mL}$.`,
        difficulty: 3,
        skillTags: ["mean_measurement", "precision", "significant_figures"],
        parts: [
          { letter: "a", promptMarkdown: "Find the mean volume.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "Report the mean to the appropriate decimal place for these readings.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State whether the readings are reasonably precise or widely scattered.",
            points: 1,
          },
        ],
        hints: [
          "Average the three readings.",
          "The measurements are given to one decimal place.",
          "The readings lie within a range of $0.3\\text{ mL}$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds mean $19.966\\ldots\\text{ mL}$.",
            },
            { part: "b", points: 1, description: "Reports $20.0\\text{ mL}$." },
            {
              part: "c",
              points: 1,
              description:
                "Notes that the values are close and reasonably precise.",
            },
          ],
        },
        commonErrors: [
          "Reporting all calculator digits as the final measured mean.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Mean $=(19.8+20.1+20.0)/3=19.966\\ldots\\text{ mL}$.",
          },
          {
            part: "b",
            explanation:
              "Since the readings are to one decimal place, report the mean as $20.0\\text{ mL}$.",
          },
          {
            part: "c",
            explanation:
              "The readings differ by only $0.3\\text{ mL}$ overall, so they are reasonably close rather than widely scattered.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Atomic Masses and Mole Concept",
    subtopic:
      "Atomic and molecular masses, Avogadro constant, molar mass, and conversions between mass, moles, molecules, and atoms.",
    mc: [
      {
        questionLatex: L`The number of molecules in $4.4\text{ g}$ of carbon dioxide is closest to`,
        difficulty: 2,
        skillTags: ["mole_concept", "molecules", "molar_mass"],
        choices: [
          L`$6.022\times10^{22}$`,
          L`$6.022\times10^{21}$`,
          L`$6.022\times10^{23}$`,
          L`$2.65\times10^{24}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is one tenth of the correct particle count.",
          C: "This treats 4.4 g of carbon dioxide as one mole instead of $0.1$ mole.",
          D: "This multiplies mass directly by Avogadro's number without dividing by molar mass.",
        },
        hints: [
          "Molar mass of $\\mathrm{CO_2}$ is $44\\text{ g mol}^{-1}$.",
          "$4.4\\text{ g}$ is $0.1\\text{ mol}$.",
          "Molecules $=nN_A$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find moles of carbon dioxide.",
            math: L`n=\frac{4.4}{44}=0.10\text{ mol}`,
          },
          {
            step: 2,
            explanation: "Multiply by Avogadro's constant.",
            math: L`N=0.10(6.022\times10^{23})=6.022\times10^{22}`,
          },
        ],
      },
      {
        questionLatex: L`The total number of atoms present in $0.50\text{ mol}$ of $\mathrm{H_2SO_4}$ is`,
        difficulty: 2,
        skillTags: ["mole_concept", "atoms_in_formula_unit"],
        choices: [L`$0.50N_A$`, L`$7.0N_A$`, L`$4.0N_A$`, L`$3.5N_A$`],
        correctLetter: "D",
        rationales: {
          A: "This counts formula units only, not atoms within each formula unit.",
          C: "This miscounts atoms in $\\mathrm{H_2SO_4}$ as 8 atoms per formula unit and then halves incorrectly.",
          B: "This counts atoms in one mole of formula units, but the sample is only $0.50$ mol.",
        },
        hints: [
          "Count atoms in one formula unit of $\\mathrm{H_2SO_4}$.",
          "$2+1+4=7$ atoms per formula unit.",
          "Multiply $0.50N_A$ formula units by 7 atoms per formula unit.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Each formula unit of sulfuric acid contains 7 atoms.",
            math: L`2+1+4=7`,
          },
          {
            step: 2,
            explanation: "For 0.50 mol formula units, total atoms are",
            math: L`0.50N_A\times7=3.5N_A`,
          },
        ],
      },
      {
        questionLatex: L`A sample contains $3.011\times10^{23}$ molecules of water. Its mass is`,
        difficulty: 2,
        skillTags: ["avogadro_constant", "molar_mass", "mass_from_particles"],
        choices: [
          L`$4.5\text{ g}$`,
          L`$36.0\text{ g}$`,
          L`$18.0\text{ g}$`,
          L`$9.0\text{ g}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This uses half of the molar mass again after already converting to half a mole.",
          C: "This treats the sample as one full mole of water.",
          B: "This doubles the molar mass instead of using half a mole.",
        },
        hints: [
          "$3.011\\times10^{23}$ is half of $6.022\\times10^{23}$.",
          "So the sample is $0.50\\text{ mol}$.",
          "Molar mass of water is $18\\text{ g mol}^{-1}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert molecules to moles.",
            math: L`n=\frac{3.011\times10^{23}}{6.022\times10^{23}}=0.50`,
          },
          {
            step: 2,
            explanation: "Use molar mass of water.",
            math: L`m=0.50\times18=9.0\text{ g}`,
          },
        ],
      },
      {
        questionLatex: L`A container has $1.2044\times10^{24}$ oxygen atoms present as $\mathrm{O_2}$ molecules. The mass of $\mathrm{O_2}$ in the container is`,
        difficulty: 3,
        skillTags: ["atoms_to_molecules", "mole_concept", "molar_mass"],
        choices: [
          L`$16\text{ g}$`,
          L`$2\text{ g}$`,
          L`$64\text{ g}$`,
          L`$32\text{ g}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This treats two moles of oxygen atoms as one mole of oxygen atoms, not as one mole of $\\mathrm{O_2}$ molecules.",
          C: "This uses two moles of $\\mathrm{O_2}$ molecules, but the data gives two moles of oxygen atoms.",
          B: "This confuses particle count with molar mass.",
        },
        hints: [
          "$1.2044\\times10^{24}$ oxygen atoms is $2.00$ mol of oxygen atoms.",
          "Each $\\mathrm{O_2}$ molecule contains two oxygen atoms.",
          "$2.00$ mol atoms correspond to $1.00$ mol $\\mathrm{O_2}$ molecules.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert oxygen atoms to moles of atoms.",
            math: L`n(\mathrm{O\ atoms})=2.00\text{ mol}`,
          },
          {
            step: 2,
            explanation:
              "Two oxygen atoms make one oxygen molecule, so moles of oxygen molecules are half.",
            math: L`n(\mathrm{O_2})=1.00\text{ mol}`,
          },
          {
            step: 3,
            explanation: "One mole of oxygen gas has mass 32 g.",
            math: L`m=1.00\times32=32\text{ g}`,
          },
        ],
      },
      {
        questionLatex: L`Equal masses of methane and oxygen gas are taken in two vessels. The ratio of number of molecules of $\mathrm{CH_4}$ to $\mathrm{O_2}$ is`,
        difficulty: 2,
        skillTags: ["molar_mass", "molecules_ratio", "inverse_molar_mass"],
        choices: [L`$1:1$`, L`$1:2$`, L`$2:1$`, L`$4:1$`],
        correctLetter: "C",
        rationales: {
          A: "Equal masses do not imply equal molecules when molar masses differ.",
          B: "This reverses the inverse molar-mass relationship.",
          D: "This uses atomic oxygen mass instead of molar mass of oxygen gas.",
        },
        hints: [
          "For a fixed mass, number of molecules is proportional to moles.",
          "Moles are inversely proportional to molar mass.",
          "Molar masses are $16$ for $\\mathrm{CH_4}$ and $32$ for $\\mathrm{O_2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For equal mass $m$, the mole ratio is inverse to molar masses.",
            math: L`n_{\mathrm{CH_4}}:n_{\mathrm{O_2}}=\frac{m}{16}:\frac{m}{32}`,
          },
          {
            step: 2,
            explanation: "Simplify the ratio.",
            math: L`\frac{1}{16}:\frac{1}{32}=2:1`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`A sample of ammonia, $\mathrm{NH_3}$, has mass $17.0\text{ g}$.`,
        difficulty: 2,
        skillTags: ["moles", "molecules", "atoms"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the number of moles of ammonia.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the number of ammonia molecules.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the total number of atoms present.",
            points: 1,
          },
        ],
        hints: [
          "Molar mass of $\\mathrm{NH_3}$ is $17\\text{ g mol}^{-1}$.",
          "One mole contains $N_A$ molecules.",
          "Each ammonia molecule contains 4 atoms.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $1.00\\text{ mol}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $6.022\\times10^{23}$ molecules.",
            },
            { part: "c", points: 1, description: "Finds $4N_A$ atoms." },
          ],
        },
        commonErrors: [
          "Counting only nitrogen atoms or hydrogen atoms instead of all atoms.",
        ],
        workedSolution: [
          { part: "a", explanation: "$n=17.0/17.0=1.00\\text{ mol}$." },
          {
            part: "b",
            explanation:
              "One mole contains $N_A=6.022\\times10^{23}$ molecules.",
          },
          {
            part: "c",
            explanation:
              "Each $\\mathrm{NH_3}$ molecule has 4 atoms, so total atoms $=4N_A=2.409\\times10^{24}$ atoms.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the mass of $0.25\text{ mol}$ of $\mathrm{CaCO_3}$. Use $\mathrm{Ca}=40$, $\mathrm{C}=12$, $\mathrm{O}=16$.`,
        difficulty: 2,
        skillTags: ["molar_mass", "mass_from_moles"],
        parts: singlePart("a", "Calculate the mass in grams.", 2),
        hints: [
          "First find molar mass of calcium carbonate.",
          "$M(\\mathrm{CaCO_3})=40+12+3(16)$.",
          "Mass $=nM$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds molar mass $100\\text{ g mol}^{-1}$ and mass $25\\text{ g}$.",
        ),
        commonErrors: [
          "Using only the mass of calcium and ignoring carbonate.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$M(\\mathrm{CaCO_3})=40+12+48=100\\text{ g mol}^{-1}$. Therefore mass $=0.25\\times100=25\\text{ g}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A sample contains $0.20\text{ mol}$ of $\mathrm{Al_2(SO_4)_3}$.`,
        difficulty: 3,
        skillTags: ["formula_units", "ions", "atoms_in_formula"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "How many moles of aluminium atoms are present?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "How many moles of oxygen atoms are present?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "How many formula units are present in terms of $N_A$?",
            points: 1,
          },
        ],
        hints: [
          "Read subscripts carefully.",
          "One formula unit contains 2 Al atoms and 12 O atoms.",
          "Formula units $=0.20N_A$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.40\\text{ mol}$ Al atoms.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $2.40\\text{ mol}$ O atoms.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $0.20N_A$ formula units.",
            },
          ],
        },
        commonErrors: [
          "Treating sulfate as one oxygen atom instead of four oxygen atoms.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Each formula unit contains 2 aluminium atoms, so moles of Al atoms $=0.20\\times2=0.40\\text{ mol}$.",
          },
          {
            part: "b",
            explanation:
              "Each formula unit contains $3\\times4=12$ oxygen atoms, so moles of O atoms $=0.20\\times12=2.40\\text{ mol}$.",
          },
          {
            part: "c",
            explanation: "The number of formula units is $0.20N_A$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A sealed bulb contains $8.0\text{ g}$ of $\mathrm{O_2}$ and $14.0\text{ g}$ of $\mathrm{N_2}$.`,
        difficulty: 4,
        skillTags: ["mole_ratio", "molecules_ratio", "mixture"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the moles of each gas.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the ratio of number of molecules of $\\mathrm{O_2}$ to $\\mathrm{N_2}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the ratio of total oxygen atoms to total nitrogen atoms.",
            points: 1,
          },
        ],
        hints: [
          "Use molar masses 32 and 28.",
          "Number of molecules is proportional to moles.",
          "Both gases are diatomic, so atom counts are twice the molecule counts.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Finds $0.25\\text{ mol }\\mathrm{O_2}$ and $0.50\\text{ mol }\\mathrm{N_2}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds molecule ratio $1:2$.",
            },
            { part: "c", points: 1, description: "Finds atom ratio $1:2$." },
          ],
        },
        commonErrors: ["Comparing masses directly instead of moles."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$n(\\mathrm{O_2})=8.0/32=0.25\\text{ mol}$ and $n(\\mathrm{N_2})=14.0/28=0.50\\text{ mol}$.",
          },
          {
            part: "b",
            explanation:
              "Molecules are proportional to moles, so $\\mathrm{O_2}:\\mathrm{N_2}=0.25:0.50=1:2$.",
          },
          {
            part: "c",
            explanation:
              "Both molecules are diatomic, so doubling both sides keeps the atom ratio $1:2$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A medicine tablet contains $0.325\text{ g}$ of aspirin, $\mathrm{C_9H_8O_4}$. Use $\mathrm{C}=12$, $\mathrm{H}=1$, $\mathrm{O}=16$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["molar_mass", "moles", "atoms", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the molar mass of aspirin.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the moles of aspirin in the tablet.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the number of oxygen atoms in the tablet in terms of $N_A$.",
            points: 2,
          },
        ],
        hints: [
          "Find molar mass from the formula.",
          "Moles $=m/M$.",
          "Each aspirin molecule has 4 oxygen atoms.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $180\\text{ g mol}^{-1}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds $1.81\\times10^{-3}\\text{ mol}$ approximately.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds about $7.22\\times10^{-3}N_A$ oxygen atoms.",
            },
          ],
        },
        commonErrors: [
          "Multiplying by 4 before converting tablet mass into moles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$M=9(12)+8(1)+4(16)=108+8+64=180\\text{ g mol}^{-1}$.",
          },
          {
            part: "b",
            explanation: "$n=0.325/180=1.806\\times10^{-3}\\text{ mol}$.",
          },
          {
            part: "c",
            explanation:
              "Oxygen atoms $=4nN_A=4(1.806\\times10^{-3})N_A=7.22\\times10^{-3}N_A$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Percentage Composition and Formulae",
    subtopic:
      "Mass percentage, empirical formula, molecular formula, hydrates, and composition from combustion data.",
    mc: [
      {
        questionLatex: L`The percentage of nitrogen in urea, $\mathrm{CO(NH_2)_2}$, is closest to`,
        difficulty: 2,
        skillTags: ["percentage_composition", "molar_mass"],
        choices: [L`$23.3\%$`, L`$60.0\%$`, L`$53.3\%$`, L`$46.7\%$`],
        correctLetter: "D",
        rationales: {
          A: "This counts only one nitrogen atom, but urea contains two nitrogen atoms.",
          C: "This is close to the non-nitrogen mass percentage.",
          B: "This is the molar mass, not the percentage of nitrogen.",
        },
        hints: [
          "Find molar mass of urea.",
          "Urea contains two nitrogen atoms.",
          "Percentage $=\\frac{\\text{mass of N in one mole}}{\\text{molar mass}}\\times100$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Molar mass of urea is",
            math: L`12+16+2(14)+4(1)=60`,
          },
          {
            step: 2,
            explanation: "Nitrogen contributes 28 g per mole.",
            math: L`\%N=\frac{28}{60}\times100=46.7\%`,
          },
        ],
      },
      {
        questionLatex: L`A compound contains $40.0\%$ carbon, $6.7\%$ hydrogen and $53.3\%$ oxygen by mass. Its empirical formula is`,
        difficulty: 3,
        skillTags: ["empirical_formula", "percentage_to_moles"],
        choices: [
          L`$\mathrm{CH_2O}$`,
          L`$\mathrm{C_2H_6O}$`,
          L`$\mathrm{CHO_2}$`,
          L`$\mathrm{C_6H_{12}O_6}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This does not match the simplest mole ratio from the percentages.",
          C: "This gives too much oxygen for the given oxygen percentage.",
          D: "This is a possible molecular formula for empirical formula $\\mathrm{CH_2O}$, but it is not the empirical formula.",
        },
        hints: [
          "Assume $100\\text{ g}$ of compound.",
          "Convert each mass into moles.",
          "Divide all mole values by the smallest value.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For 100 g compound, moles are",
            math: L`C=\frac{40.0}{12}=3.33,\quad H=\frac{6.7}{1}=6.7,\quad O=\frac{53.3}{16}=3.33`,
          },
          {
            step: 2,
            explanation: "Divide by the smallest mole value.",
            math: L`C:H:O=1:2:1`,
          },
          {
            step: 3,
            explanation: "Therefore empirical formula is",
            math: L`\mathrm{CH_2O}`,
          },
        ],
      },
      {
        questionLatex: L`A compound has empirical formula $\mathrm{CH_2O}$ and molar mass $180\text{ g mol}^{-1}$. Its molecular formula is`,
        difficulty: 2,
        skillTags: ["molecular_formula", "empirical_formula_mass"],
        choices: [
          L`$\mathrm{CH_2O}$`,
          L`$\mathrm{C_3H_6O_3}$`,
          L`$\mathrm{C_6H_{12}O_6}$`,
          L`$\mathrm{C_{12}H_{24}O_{12}}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses only the empirical formula mass, $30\\text{ g mol}^{-1}$.",
          B: "This corresponds to molar mass $90\\text{ g mol}^{-1}$.",
          D: "This doubles the correct molecular formula.",
        },
        hints: [
          "Find empirical formula mass.",
          "$\\mathrm{CH_2O}$ has mass $30\\text{ g mol}^{-1}$.",
          "Molecular formula multiplier $=180/30$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Empirical formula mass is",
            math: L`12+2+16=30`,
          },
          {
            step: 2,
            explanation: "Find multiplier.",
            math: L`\frac{180}{30}=6`,
          },
          {
            step: 3,
            explanation: "Multiply each subscript by 6.",
            math: L`\mathrm{C_6H_{12}O_6}`,
          },
        ],
      },
      {
        questionLatex: L`On heating $2.50\text{ g}$ of hydrated copper(II) sulfate, $1.60\text{ g}$ of anhydrous $\mathrm{CuSO_4}$ remains. If $M(\mathrm{CuSO_4})=160$ and $M(\mathrm{H_2O})=18$, the formula of the hydrate is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["hydrate", "empirical_formula", "mole_ratio"],
        choices: [
          L`$\mathrm{CuSO_4\cdot 2H_2O}$`,
          L`$\mathrm{CuSO_4\cdot 3H_2O}$`,
          L`$\mathrm{CuSO_4\cdot 5H_2O}$`,
          L`$\mathrm{CuSO_4\cdot 10H_2O}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This undercounts water; the mole ratio of water to salt is 5.",
          B: "This is not the mole ratio from $0.90\\text{ g}$ water and $1.60\\text{ g}$ salt.",
          D: "This doubles the correct water-to-salt mole ratio.",
        },
        hints: [
          "Mass of water lost is hydrated mass minus anhydrous mass.",
          "Convert salt and water masses into moles.",
          "Find the ratio $n(\\mathrm{H_2O}):n(\\mathrm{CuSO_4})$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Water lost on heating is",
            math: L`2.50-1.60=0.90\text{ g}`,
          },
          {
            step: 2,
            explanation: "Convert to moles.",
            math: L`n(\mathrm{CuSO_4})=\frac{1.60}{160}=0.010,\quad n(\mathrm{H_2O})=\frac{0.90}{18}=0.050`,
          },
          {
            step: 3,
            explanation: "Water-to-salt ratio is 5:1.",
            math: L`\mathrm{CuSO_4\cdot5H_2O}`,
          },
        ],
      },
      {
        questionLatex: L`A $0.30\text{ g}$ organic compound containing only C, H and O gives $0.44\text{ g } \mathrm{CO_2}$ and $0.18\text{ g } \mathrm{H_2O}$ on complete combustion. Its empirical formula is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["combustion_analysis", "empirical_formula"],
        choices: [
          L`$\mathrm{CH_2O}$`,
          L`$\mathrm{CH_4O}$`,
          L`$\mathrm{C_2H_4O}$`,
          L`$\mathrm{CHO}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This gives too much hydrogen; water data gives H:C ratio 2:1, not 4:1.",
          C: "This is not the simplest whole-number ratio.",
          D: "This ignores the hydrogen count from water.",
        },
        hints: [
          "Carbon mass comes from $\\mathrm{CO_2}$.",
          "Hydrogen mass comes from $\\mathrm{H_2O}$.",
          "Oxygen mass is found by difference from the original sample.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find carbon and hydrogen masses.",
            math: L`m_C=0.44\times\frac{12}{44}=0.12\text{ g},\quad m_H=0.18\times\frac{2}{18}=0.020\text{ g}`,
          },
          {
            step: 2,
            explanation: "Find oxygen by difference.",
            math: L`m_O=0.30-0.12-0.020=0.160\text{ g}`,
          },
          {
            step: 3,
            explanation: "Convert to mole ratio.",
            math: L`C:H:O=\frac{0.12}{12}:\frac{0.020}{1}:\frac{0.160}{16}=0.010:0.020:0.010=1:2:1`,
          },
          {
            step: 4,
            explanation: "Empirical formula is",
            math: L`\mathrm{CH_2O}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`An oxide of iron contains $69.9\%$ iron and $30.1\%$ oxygen by mass. Use $\mathrm{Fe}=55.85$ and $\mathrm{O}=16.00$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["empirical_formula", "percentage_composition"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the mole ratio of Fe to O.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write the empirical formula.",
            points: 1,
          },
        ],
        hints: [
          "Assume $100\\text{ g}$ sample.",
          "Convert masses to moles.",
          "Divide by the smaller mole value.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Obtains Fe:O approximately $2:3$.",
            },
            {
              part: "b",
              points: 1,
              description: "Writes $\\mathrm{Fe_2O_3}$.",
            },
          ],
        },
        commonErrors: [
          "Rounding the mole ratio too early before dividing by the smaller value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In $100\\text{ g}$ sample: $n(\\mathrm{Fe})=69.9/55.85=1.25$, $n(\\mathrm{O})=30.1/16.00=1.88$. Ratio $=1.25:1.88\\approx1:1.5=2:3$.",
          },
          {
            part: "b",
            explanation: "The empirical formula is $\\mathrm{Fe_2O_3}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A compound has empirical formula $\mathrm{NO_2}$ and molecular mass $92\text{ u}$.`,
        difficulty: 2,
        skillTags: ["molecular_formula", "empirical_formula_mass"],
        parts: singlePart("a", "Find the molecular formula.", 2),
        hints: [
          "Find empirical formula mass.",
          "$M(\\mathrm{NO_2})=14+32=46$.",
          "Multiplier $=92/46$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds multiplier 2 and writes $\\mathrm{N_2O_4}$.",
        ),
        commonErrors: [
          "Writing the empirical formula again without checking molecular mass.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Empirical formula mass of $\\mathrm{NO_2}$ is $46$. Multiplier $=92/46=2$, so molecular formula is $\\mathrm{N_2O_4}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A hydrated salt $\mathrm{Na_2CO_3\cdot xH_2O}$ contains $62.94\%$ water by mass. Use $M(\mathrm{Na_2CO_3})=106$ and $M(\mathrm{H_2O})=18$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["hydrate", "percentage_composition"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Assuming $100\\text{ g}$ hydrate, find moles of anhydrous salt and water.",
            points: 3,
          },
          { letter: "b", promptMarkdown: "Find $x$.", points: 2 },
        ],
        hints: [
          "Water mass is $62.94\\text{ g}$.",
          "Anhydrous salt mass is the remaining mass.",
          "Divide moles of water by moles of salt.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 3,
              description:
                "Finds about $0.3496\\text{ mol}$ salt and $3.497\\text{ mol}$ water.",
            },
            { part: "b", points: 2, description: "Finds $x=10$." },
          ],
        },
        commonErrors: [
          "Using 62.94 g as the mass of the entire salt part rather than water.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $100\\text{ g}$ hydrate, water mass $=62.94\\text{ g}$ and salt mass $=37.06\\text{ g}$. Moles salt $=37.06/106=0.3496$, moles water $=62.94/18=3.497$.",
          },
          {
            part: "b",
            explanation:
              "$x=3.497/0.3496\\approx10$, so the hydrate is $\\mathrm{Na_2CO_3\\cdot10H_2O}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A compound contains $52.2\%$ carbon, $13.0\%$ hydrogen and $34.8\%$ oxygen by mass. Its molar mass is $46\text{ g mol}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["empirical_formula", "molecular_formula"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the empirical formula.",
            points: 3,
          },
          {
            letter: "b",
            promptMarkdown: "Find the molecular formula.",
            points: 1,
          },
        ],
        hints: [
          "Assume a $100\\text{ g}$ sample.",
          "Convert percentages to moles: C by 12, H by 1, O by 16.",
          "Compare empirical formula mass with molecular mass.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 3,
              description: "Finds empirical formula $\\mathrm{C_2H_6O}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds molecular formula $\\mathrm{C_2H_6O}$.",
            },
          ],
        },
        commonErrors: [
          "Forgetting that the empirical and molecular formula may be the same.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Moles: C $=52.2/12=4.35$, H $=13.0/1=13.0$, O $=34.8/16=2.175$. Divide by $2.175$: C:H:O $=2:6:1$. Empirical formula is $\\mathrm{C_2H_6O}$.",
          },
          {
            part: "b",
            explanation:
              "Empirical formula mass $=2(12)+6(1)+16=46$, equal to molecular mass. Molecular formula is $\\mathrm{C_2H_6O}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A hydrocarbon sample of mass $0.28\text{ g}$ gives $0.88\text{ g } \mathrm{CO_2}$ and $0.36\text{ g } \mathrm{H_2O}$ on complete combustion.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["combustion_analysis", "hydrocarbon", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the mass of carbon in the sample.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the mass of hydrogen in the sample.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the empirical formula.",
            points: 3,
          },
        ],
        hints: [
          "All carbon in the compound becomes carbon dioxide.",
          "All hydrogen in the compound becomes water.",
          "Convert C and H masses to moles and reduce the ratio.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.24\\text{ g}$ carbon.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $0.04\\text{ g}$ hydrogen.",
            },
            { part: "c", points: 3, description: "Finds $\\mathrm{CH_2}$." },
          ],
        },
        commonErrors: ["Taking $0.88\\text{ g}$ as carbon mass directly."],
        workedSolution: [
          {
            part: "a",
            explanation: "$m_C=0.88\\times(12/44)=0.24\\text{ g}$.",
          },
          {
            part: "b",
            explanation: "$m_H=0.36\\times(2/18)=0.04\\text{ g}$.",
          },
          {
            part: "c",
            explanation:
              "Moles C $=0.24/12=0.020$, moles H $=0.04/1=0.040$. Ratio C:H $=1:2$, so empirical formula is $\\mathrm{CH_2}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Stoichiometry and Limiting Reagent",
    subtopic:
      "Balanced equations, mole ratios, limiting reagent, theoretical yield, percentage yield, and gas volume at STP.",
    mc: [
      {
        questionLatex: L`The particle diagram represents a mixture before reaction according to $\mathrm{N_2+3H_2\rightarrow2NH_3}$. Which reactant is limiting, and how many $\mathrm{NH_3}$ molecules can form?`,
        figure: limitingParticleFigure,
        difficulty: 3,
        skillTags: ["limiting_reagent", "particle_diagram", "stoichiometry"],
        choices: [
          L`$\mathrm{N_2}$ is limiting; $8$ molecules of $\mathrm{NH_3}$ form`,
          L`$\mathrm{N_2}$ is limiting; $4$ molecules of $\mathrm{NH_3}$ form`,
          L`$\mathrm{H_2}$ is limiting; $9$ molecules of $\mathrm{NH_3}$ form`,
          L`$\mathrm{H_2}$ is limiting; $6$ molecules of $\mathrm{NH_3}$ form`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Four nitrogen molecules would need twelve hydrogen molecules, but only nine hydrogen molecules are shown.",
          C: "Nine hydrogen molecules make six ammonia molecules because $3\\mathrm{H_2}$ gives $2\\mathrm{NH_3}$.",
          B: "Nitrogen is in excess, not limiting.",
        },
        hints: [
          "Count the molecules shown: $4\\mathrm{N_2}$ and $9\\mathrm{H_2}$.",
          "Each reaction set needs $1\\mathrm{N_2}$ and $3\\mathrm{H_2}$.",
          "$9\\mathrm{H_2}$ supports exactly 3 reaction sets.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The diagram shows 4 nitrogen molecules and 9 hydrogen molecules.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "The balanced equation needs 3 hydrogen molecules per nitrogen molecule. Nine hydrogen molecules can react with only 3 nitrogen molecules.",
            math: L`9\mathrm{H_2}\rightarrow6\mathrm{NH_3}`,
          },
          {
            step: 3,
            explanation:
              "Hydrogen is limiting and 6 ammonia molecules can form.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`On heating $25.0\text{ g}$ of limestone containing $80.0\%$ pure $\mathrm{CaCO_3}$, the volume of $\mathrm{CO_2}$ evolved at STP is $\mathrm{CaCO_3\rightarrow CaO+CO_2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["purity", "stoichiometry", "gas_volume_stp"],
        choices: [
          L`$2.24\text{ L}$`,
          L`$4.48\text{ L}$`,
          L`$5.60\text{ L}$`,
          L`$22.4\text{ L}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses $0.10$ mol calcium carbonate instead of $0.20$ mol.",
          C: "This uses the whole 25 g as pure calcium carbonate and then rounds incorrectly.",
          D: "This treats the sample as one mole of calcium carbonate.",
        },
        hints: [
          "Only $80\\%$ of the limestone is calcium carbonate.",
          "Molar mass of $\\mathrm{CaCO_3}$ is $100\\text{ g mol}^{-1}$.",
          "At STP, one mole gas occupies $22.4\\text{ L}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find mass of pure calcium carbonate.",
            math: L`25.0\times0.800=20.0\text{ g}`,
          },
          {
            step: 2,
            explanation:
              "One mole calcium carbonate gives one mole carbon dioxide.",
            math: L`n(\mathrm{CO_2})=\frac{20.0}{100}=0.200\text{ mol}`,
          },
          {
            step: 3,
            explanation: "Convert moles of gas to volume at STP.",
            math: L`V=0.200\times22.4=4.48\text{ L}`,
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{2Al+3Cl_2\rightarrow2AlCl_3}$, $5.4\text{ g}$ aluminium reacts with $10.65\text{ g}$ chlorine. The mass of $\mathrm{AlCl_3}$ formed is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["limiting_reagent", "stoichiometry", "mass_product"],
        choices: [
          L`$6.675\text{ g}$`,
          L`$13.35\text{ g}$`,
          L`$26.70\text{ g}$`,
          L`$16.05\text{ g}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This halves the product amount after finding chlorine limiting.",
          C: "This assumes aluminium is limiting and fully converted.",
          D: "This adds reactant masses and ignores leftover aluminium.",
        },
        hints: [
          "Convert both reactants into moles.",
          "Compare the required ratio $2\\mathrm{Al}:3\\mathrm{Cl_2}$.",
          "Use the limiting reactant to find moles of $\\mathrm{AlCl_3}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert masses to moles.",
            math: L`n(\mathrm{Al})=\frac{5.4}{27}=0.20,\quad n(\mathrm{Cl_2})=\frac{10.65}{71}=0.15`,
          },
          {
            step: 2,
            explanation:
              "For 0.15 mol chlorine, aluminium required is 0.10 mol, so chlorine is limiting.",
            math: L`3\mathrm{Cl_2}\rightarrow2\mathrm{AlCl_3}`,
          },
          {
            step: 3,
            explanation: "Find product moles and mass.",
            math: L`n(\mathrm{AlCl_3})=0.15\times\frac{2}{3}=0.10,\quad m=0.10(133.5)=13.35\text{ g}`,
          },
        ],
      },
      {
        questionLatex: L`When $24.5\text{ g}$ of $\mathrm{KClO_3}$ decomposes completely, the mass of oxygen formed is $\mathrm{2KClO_3\rightarrow2KCl+3O_2}$. Use $M(\mathrm{KClO_3})=122.5$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["balanced_equation", "mass_from_stoichiometry"],
        choices: [
          L`$4.8\text{ g}$`,
          L`$6.4\text{ g}$`,
          L`$9.6\text{ g}$`,
          L`$14.4\text{ g}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This misses the $3/2$ mole ratio from chlorate to oxygen.",
          B: "This uses an incorrect mole ratio of $1:1$ and molar mass 32 partially.",
          D: "This treats $0.2$ mol chlorate as producing $0.45$ mol oxygen.",
        },
        hints: [
          "Find moles of potassium chlorate.",
          "Two moles chlorate give three moles oxygen.",
          "Mass oxygen $=n\\times32$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Moles of potassium chlorate are",
            math: L`n=\frac{24.5}{122.5}=0.200`,
          },
          {
            step: 2,
            explanation: "Use the balanced equation.",
            math: L`n(\mathrm{O_2})=0.200\times\frac{3}{2}=0.300`,
          },
          {
            step: 3,
            explanation: "Convert moles oxygen to mass.",
            math: L`m=0.300\times32=9.6\text{ g}`,
          },
        ],
      },
      {
        questionLatex: L`A reaction has theoretical yield $10.0\text{ g}$, but the actual yield is $8.4\text{ g}$. The percentage yield is`,
        difficulty: 2,
        skillTags: ["percentage_yield", "theoretical_yield"],
        choices: [L`$16\%$`, L`$84\%$`, L`$119\%$`, L`$8.4\%$`],
        correctLetter: "B",
        rationales: {
          A: "This gives the percentage loss, not percentage yield.",
          C: "This reverses actual and theoretical yield.",
          D: "This forgets to multiply by 100.",
        },
        hints: [
          "Percentage yield compares actual yield with theoretical yield.",
          "Use actual/theoretical.",
          "Multiply by $100$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the percentage yield formula.",
            math: L`\%\text{ yield}=\frac{8.4}{10.0}\times100=84\%`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`Methane burns according to $\mathrm{CH_4+2O_2\rightarrow CO_2+2H_2O}$. A sample contains $8.0\text{ g}$ methane.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["combustion", "stoichiometry", "mass_product"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the moles of methane.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the moles of oxygen required.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the mass of carbon dioxide formed.",
            points: 2,
          },
        ],
        hints: [
          "Molar mass of methane is $16\\text{ g mol}^{-1}$.",
          "The balanced equation has ratio $1:2:1$ for methane, oxygen and carbon dioxide.",
          "Molar mass of carbon dioxide is $44\\text{ g mol}^{-1}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.50\\text{ mol}$ methane.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $1.00\\text{ mol}$ oxygen.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $22\\text{ g}$ carbon dioxide.",
            },
          ],
        },
        commonErrors: [
          "Using the unbalanced equation or ignoring the coefficient 2 before oxygen.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$n(\\mathrm{CH_4})=8.0/16=0.50\\text{ mol}$.",
          },
          {
            part: "b",
            explanation: "Oxygen required $=2(0.50)=1.00\\text{ mol}$.",
          },
          {
            part: "c",
            explanation:
              "Carbon dioxide formed $=0.50\\text{ mol}$, so mass $=0.50\\times44=22\\text{ g}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Magnesium burns in oxygen: $\mathrm{2Mg+O_2\rightarrow2MgO}$. A mixture contains $4.8\text{ g}$ Mg and $2.4\text{ g } \mathrm{O_2}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["limiting_reagent", "excess_reactant", "mass_product"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify the limiting reagent.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the mass of $\\mathrm{MgO}$ formed.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the mass of excess reactant left.",
            points: 2,
          },
        ],
        hints: [
          "Convert both masses to moles.",
          "The equation needs $2\\text{ mol}$ Mg for $1\\text{ mol}$ oxygen.",
          "Use the limiting reagent for product and leftover calculations.",
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            { part: "a", points: 2, description: "Finds oxygen limiting." },
            {
              part: "b",
              points: 2,
              description: "Finds $6.0\\text{ g}$ magnesium oxide.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $1.2\\text{ g}$ magnesium left.",
            },
          ],
        },
        commonErrors: [
          "Finding the limiting reagent by comparing masses instead of moles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$n(\\mathrm{Mg})=4.8/24=0.20\\text{ mol}$ and $n(\\mathrm{O_2})=2.4/32=0.075\\text{ mol}$. For $0.075\\text{ mol}$ oxygen, Mg required $=0.150\\text{ mol}$, so oxygen is limiting.",
          },
          {
            part: "b",
            explanation:
              "$1\\text{ mol }\\mathrm{O_2}$ gives $2\\text{ mol }\\mathrm{MgO}$, so $n(\\mathrm{MgO})=0.150\\text{ mol}$. Mass $=0.150\\times40=6.0\\text{ g}$.",
          },
          {
            part: "c",
            explanation:
              "Mg used $=0.150\\text{ mol}=3.6\\text{ g}$. Mg left $=4.8-3.6=1.2\\text{ g}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In $\mathrm{2Na+Cl_2\rightarrow2NaCl}$, find the mass of sodium chloride formed from $4.6\text{ g}$ sodium when chlorine is in excess.`,
        difficulty: 2,
        skillTags: ["stoichiometry", "excess_reactant"],
        parts: singlePart("a", "Calculate the product mass.", 2),
        hints: [
          "Moles of sodium $=4.6/23$.",
          "The mole ratio $\\mathrm{Na:NaCl}$ is $1:1$.",
          "Molar mass of sodium chloride is $58.5\\text{ g mol}^{-1}$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $0.20\\text{ mol}$ NaCl and mass $11.7\\text{ g}$.",
        ),
        commonErrors: [
          "Using chlorine as limiting even though it is stated to be in excess.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$n(\\mathrm{Na})=4.6/23=0.20\\text{ mol}$. From the balanced equation, $n(\\mathrm{NaCl})=0.20\\text{ mol}$. Mass $=0.20\\times58.5=11.7\\text{ g}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student expects $5.60\text{ L}$ of oxygen at STP from a decomposition reaction, but collects only $4.90\text{ L}$.`,
        difficulty: 3,
        skillTags: ["percentage_yield", "gas_volume"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the percentage yield.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State one practical reason why the actual gas volume may be lower.",
            points: 1,
          },
        ],
        hints: [
          "Volumes can be compared directly when measured under the same conditions.",
          "Use actual over theoretical.",
          "Think of leakage, incomplete reaction, or gas dissolving in water.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $87.5\\%$." },
            {
              part: "b",
              points: 1,
              description: "Gives a plausible experimental reason.",
            },
          ],
        },
        commonErrors: [
          "Using theoretical over actual and getting a value above 100 percent.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Percentage yield $=(4.90/5.60)\\times100=87.5\\%$.",
          },
          {
            part: "b",
            explanation:
              "The volume may be lower due to leakage, incomplete decomposition, gas dissolving in water, or temperature/pressure not exactly matching STP.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Zinc reacts with hydrochloric acid as $\mathrm{Zn+2HCl\rightarrow ZnCl_2+H_2}$. A student adds $6.5\text{ g}$ zinc to $0.30\text{ mol}$ HCl.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["limiting_reagent", "gas_stoichiometry", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find moles of zinc.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Identify the limiting reagent.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the volume of hydrogen produced at STP.",
            points: 2,
          },
        ],
        hints: [
          "Molar mass of zinc is $65\\text{ g mol}^{-1}$.",
          "One mole zinc needs two moles HCl.",
          "One mole gas at STP occupies $22.4\\text{ L}$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.10\\text{ mol}$ zinc.",
            },
            {
              part: "b",
              points: 2,
              description: "Identifies zinc as limiting.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $2.24\\text{ L}$ hydrogen.",
            },
          ],
        },
        commonErrors: [
          "Using all HCl to calculate hydrogen even when zinc is limiting.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$n(\\mathrm{Zn})=6.5/65=0.10\\text{ mol}$.",
          },
          {
            part: "b",
            explanation:
              "$0.10\\text{ mol}$ zinc needs $0.20\\text{ mol}$ HCl. Since $0.30\\text{ mol}$ HCl is available, HCl is excess and zinc is limiting.",
          },
          {
            part: "c",
            explanation:
              "Moles $\\mathrm{H_2}$ formed $=0.10\\text{ mol}$. Volume at STP $=0.10\\times22.4=2.24\\text{ L}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Concentration and Integrated Mole Calculations",
    subtopic:
      "Molarity, molality, mass percentage, dilution, mixing solutions, and solution stoichiometry.",
    mc: [
      {
        questionLatex: L`A solution is prepared by dissolving $5.85\text{ g } \mathrm{NaCl}$ in water and making the volume $500\text{ mL}$. Its molarity is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["molarity", "solution_concentration"],
        choices: [
          L`$0.10\text{ M}$`,
          L`$0.20\text{ M}$`,
          L`$0.50\text{ M}$`,
          L`$1.00\text{ M}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This finds moles but forgets that the volume is $0.500\\text{ L}$.",
          C: "This uses volume in mL as if it were litres incorrectly.",
          D: "This treats $5.85\\text{ g}$ NaCl as one mole.",
        },
        hints: [
          "Molar mass of sodium chloride is $58.5\\text{ g mol}^{-1}$.",
          "Convert $500\\text{ mL}$ to litres.",
          "$M=n/V$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find moles of sodium chloride.",
            math: L`n=\frac{5.85}{58.5}=0.100\text{ mol}`,
          },
          {
            step: 2,
            explanation: "Convert volume to litres and find molarity.",
            math: L`M=\frac{0.100}{0.500}=0.200\text{ M}`,
          },
        ],
      },
      {
        questionLatex: L`When $50.0\text{ mL}$ of $2.00\text{ M}$ solution is diluted to $250\text{ mL}$, the final molarity is`,
        difficulty: 2,
        skillTags: ["dilution", "molarity"],
        choices: [
          L`$0.20\text{ M}$`,
          L`$0.40\text{ M}$`,
          L`$1.00\text{ M}$`,
          L`$10.0\text{ M}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This dilutes by a factor of 10 instead of 5.",
          C: "This halves the concentration but the volume increases fivefold.",
          D: "Dilution cannot increase molarity.",
        },
        hints: [
          "Moles of solute remain constant during dilution.",
          "Use $M_1V_1=M_2V_2$.",
          "The final volume is five times the initial volume.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use dilution formula.",
            math: L`M_2=\frac{M_1V_1}{V_2}=\frac{2.00\times50.0}{250}=0.400\text{ M}`,
          },
        ],
      },
      {
        questionLatex: L`A solution contains $9.0\text{ g}$ glucose, $\mathrm{C_6H_{12}O_6}$, dissolved in $100\text{ g}$ water. Its molality is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["molality", "solution_concentration"],
        choices: [
          L`$0.050\text{ m}$`,
          L`$0.50\text{ m}$`,
          L`$5.0\text{ m}$`,
          L`$9.0\text{ m}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This divides by 1 kg of solvent instead of $0.100$ kg.",
          C: "This likely uses water mass in grams without converting to kilograms.",
          D: "This uses solute mass directly instead of moles.",
        },
        hints: [
          "Molar mass of glucose is $180\\text{ g mol}^{-1}$.",
          "Molality uses kg of solvent, not litres of solution.",
          "$100\\text{ g}$ water is $0.100\\text{ kg}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find moles of glucose.",
            math: L`n=\frac{9.0}{180}=0.050\text{ mol}`,
          },
          {
            step: 2,
            explanation: "Divide by mass of solvent in kilograms.",
            math: L`m=\frac{0.050}{0.100}=0.50\text{ mol kg}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A solution is made by dissolving $10\text{ g}$ solute in $90\text{ g}$ water. The mass percentage of solute is`,
        difficulty: 2,
        skillTags: ["mass_percentage", "solution_concentration"],
        choices: [L`$9.0\%$`, L`$10\%$`, L`$11.1\%$`, L`$90\%$`],
        correctLetter: "B",
        rationales: {
          A: "This divides solute mass by solvent mass plus an extra rounding error.",
          C: "This divides solute mass by water mass instead of total solution mass.",
          D: "This reports the solvent percentage.",
        },
        hints: [
          "Mass percentage uses total solution mass in the denominator.",
          "Total solution mass is $10+90=100\\text{ g}$.",
          "Mass percent $=(10/100)\\times100$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find total solution mass and percentage.",
            math: L`\%\text{ solute}=\frac{10}{10+90}\times100=10\%`,
          },
        ],
      },
      {
        questionLatex: L`$100\text{ mL}$ of $0.10\text{ M } \mathrm{NaCl}$ is mixed with $200\text{ mL}$ of $0.20\text{ M } \mathrm{NaCl}$. Assuming volumes are additive, the final molarity is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["mixing_solutions", "molarity"],
        choices: [
          L`$0.10\text{ M}$`,
          L`$0.15\text{ M}$`,
          L`$0.167\text{ M}$`,
          L`$0.30\text{ M}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This ignores the second solution.",
          B: "This averages the molarities without weighting by volume.",
          D: "This adds molarities directly.",
        },
        hints: [
          "Add moles, not molarities.",
          "Convert mL to litres.",
          "Final molarity $=\\frac{\\text{total moles}}{\\text{total volume}}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find moles from each solution.",
            math: L`n_1=0.10(0.100)=0.010,\quad n_2=0.20(0.200)=0.040`,
          },
          {
            step: 2,
            explanation: "Total moles and total volume are",
            math: L`n=0.050,\quad V=0.300\text{ L}`,
          },
          {
            step: 3,
            explanation: "Find final molarity.",
            math: L`M=\frac{0.050}{0.300}=0.167\text{ M}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`A student wants to prepare $250\text{ mL}$ of $0.100\text{ M } \mathrm{Na_2CO_3}$ solution. Use $M(\mathrm{Na_2CO_3})=106\text{ g mol}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["solution_preparation", "molarity", "mass_from_moles"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the moles of $\\mathrm{Na_2CO_3}$ required.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the mass required.", points: 2 },
          {
            letter: "c",
            promptMarkdown:
              "State one correct practical step after weighing the solid.",
            points: 1,
          },
        ],
        hints: [
          "Convert $250\\text{ mL}$ to litres.",
          "Use $n=MV$.",
          "The final volume must be made up in a volumetric flask, not measured as water first.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.0250\\text{ mol}$.",
            },
            { part: "b", points: 2, description: "Finds $2.65\\text{ g}$." },
            {
              part: "c",
              points: 1,
              description: "States a valid solution-preparation step.",
            },
          ],
        },
        commonErrors: [
          "Adding $250\\text{ mL}$ water to the solid instead of making the final solution volume $250\\text{ mL}$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$V=250\\text{ mL}=0.250\\text{ L}$, so $n=MV=0.100\\times0.250=0.0250\\text{ mol}$.",
          },
          {
            part: "b",
            explanation: "Mass $=nM=0.0250\\times106=2.65\\text{ g}$.",
          },
          {
            part: "c",
            explanation:
              "Dissolve the weighed solid in some water, transfer quantitatively to a $250\\text{ mL}$ volumetric flask, and make up to the mark.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`How many millilitres of $1.50\text{ M}$ hydrochloric acid are needed to prepare $300\text{ mL}$ of $0.250\text{ M}$ acid?`,
        difficulty: 3,
        skillTags: ["dilution", "molarity"],
        parts: singlePart("a", "Find the required volume of stock acid.", 2),
        hints: [
          "Moles before dilution equal moles after dilution.",
          "Use $M_1V_1=M_2V_2$.",
          "Keep both volumes in the same unit.",
        ],
        rubric: singleRubric("a", 2, "Finds $50.0\\text{ mL}$ of stock acid."),
        commonErrors: [
          "Putting the dilute concentration as $M_1$ and getting a volume larger than final volume.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$V_1=M_2V_2/M_1=(0.250\\times300)/1.50=50.0\\text{ mL}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`$25.0\text{ mL}$ of $0.200\text{ M } \mathrm{BaCl_2}$ is mixed with excess sodium sulfate. The reaction is $\mathrm{BaCl_2+Na_2SO_4\rightarrow BaSO_4(s)+2NaCl}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["solution_stoichiometry", "precipitation", "molarity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find moles of $\\mathrm{BaCl_2}$ used.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find moles of $\\mathrm{BaSO_4}$ formed.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find mass of $\\mathrm{BaSO_4}$ precipitate. Use $M(\\mathrm{BaSO_4})=233\\text{ g mol}^{-1}$.",
            points: 2,
          },
        ],
        hints: [
          "Convert volume to litres.",
          "The mole ratio $\\mathrm{BaCl_2:BaSO_4}$ is $1:1$.",
          "Mass $=nM$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $0.00500\\text{ mol}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $0.00500\\text{ mol }\\mathrm{BaSO_4}$.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Finds $1.165\\text{ g}$, suitably reported as $1.17\\text{ g}$.",
            },
          ],
        },
        commonErrors: [
          "Using the coefficient 2 before NaCl to double the barium sulfate amount.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$n(\\mathrm{BaCl_2})=0.200\\times0.0250=0.00500\\text{ mol}$.",
          },
          {
            part: "b",
            explanation:
              "The equation shows a $1:1$ ratio, so $n(\\mathrm{BaSO_4})=0.00500\\text{ mol}$.",
          },
          {
            part: "c",
            explanation:
              "Mass $=0.00500\\times233=1.165\\text{ g}\\approx1.17\\text{ g}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A bottle label reads: $20\%$ by mass $\mathrm{NaOH}$ solution, density $1.20\text{ g mL}^{-1}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["mass_percent", "density", "molarity"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the mass of $1.00\\text{ L}$ of the solution.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the mass and moles of $\\mathrm{NaOH}$ in $1.00\\text{ L}$ solution.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Find the molarity.", points: 1 },
        ],
        hints: [
          "Use density to convert solution volume to solution mass.",
          "$20\\%$ by mass means $20\\text{ g}$ solute per $100\\text{ g}$ solution.",
          "$M(\\mathrm{NaOH})=40\\text{ g mol}^{-1}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1200\\text{ g}$ solution.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $240\\text{ g}$ NaOH and $6.00\\text{ mol}$.",
            },
            { part: "c", points: 1, description: "Finds $6.00\\text{ M}$." },
          ],
        },
        commonErrors: [
          "Treating 20 percent by mass as 20 g per litre directly.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$1.00\\text{ L}=1000\\text{ mL}$. Mass of solution $=1.20\\times1000=1200\\text{ g}$.",
          },
          {
            part: "b",
            explanation:
              "NaOH mass $=20\\%$ of $1200\\text{ g}=240\\text{ g}$. Moles $=240/40=6.00\\text{ mol}$.",
          },
          {
            part: "c",
            explanation:
              "These moles are in $1.00\\text{ L}$, so molarity $=6.00\\text{ M}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student mixes $50.0\text{ mL}$ of $0.100\text{ M } \mathrm{AgNO_3}$ with $50.0\text{ mL}$ of $0.0800\text{ M } \mathrm{NaCl}$. The reaction is $\mathrm{AgNO_3+NaCl\rightarrow AgCl(s)+NaNO_3}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["solution_stoichiometry", "limiting_reagent", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find moles of each reactant.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the limiting reagent.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the mass of $\\mathrm{AgCl}$ precipitated. Use $M(\\mathrm{AgCl})=143.5\\text{ g mol}^{-1}$.",
            points: 2,
          },
        ],
        hints: [
          "Convert each volume to litres.",
          "The balanced ratio is $1:1$.",
          "Use the smaller mole amount for precipitate.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Finds $0.00500\\text{ mol}$ AgNO3 and $0.00400\\text{ mol}$ NaCl.",
            },
            {
              part: "b",
              points: 1,
              description: "Identifies NaCl as limiting.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $0.574\\text{ g}$ AgCl.",
            },
          ],
        },
        commonErrors: [
          "Averaging the molarities of different solutes instead of calculating moles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$n(\\mathrm{AgNO_3})=0.100\\times0.0500=0.00500\\text{ mol}$. $n(\\mathrm{NaCl})=0.0800\\times0.0500=0.00400\\text{ mol}$.",
          },
          {
            part: "b",
            explanation:
              "The reaction ratio is $1:1$, so the smaller amount, $\\mathrm{NaCl}$, is limiting.",
          },
          {
            part: "c",
            explanation:
              "$n(\\mathrm{AgCl})=0.00400\\text{ mol}$. Mass $=0.00400\\times143.5=0.574\\text{ g}$.",
          },
        ],
      },
    ],
  },
];

function extraMc(
  questionLatex: string,
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hintsList: readonly [string, string, string],
  explanation: string,
  skillTags: string[],
  difficulty: Difficulty = 3,
  calculatorAllowed = false,
): McSeed {
  return {
    questionLatex,
    choices,
    correctLetter,
    rationales,
    hints: hintsList,
    solution: [{ step: 1, explanation }],
    skillTags,
    difficulty,
    calculatorAllowed,
  };
}

function extraFrq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  parts: readonly FrqPart[],
  hintsList: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts,
    hints: hintsList,
    rubric: {
      maxPoints: parts.reduce((sum, part) => sum + part.points, 0),
      criteria: parts.map((part) => ({
        part: part.letter,
        points: part.points,
        description: `Correctly completes part ${part.letter} with calculation, unit, or reason as required.`,
      })),
    },
    commonErrors,
    workedSolution,
  };
}

const largeTopicExpansions: Record<
  string,
  { mc: readonly McSeed[]; constructed: readonly ConstructedSeed[] }
> = {
  "1.1": {
    mc: [
      extraMc(
        L`A balance has least count $0.01\text{ g}$. A sample reading lies between $12.34\text{ g}$ and $12.35\text{ g}$, closer to $12.35\text{ g}$. The best report is`,
        [
          L`$12.3\text{ g}$`,
          L`$12.35\text{ g}$`,
          L`$12.350\text{ g}$`,
          L`$13\text{ g}$`,
        ],
        "B",
        {
          A: "This loses a digit supported by the balance.",
          C: "This claims precision beyond the least count.",
          D: "This is excessive rounding.",
        },
        [
          "Report to the instrument's least count.",
          "The least count is two decimal places in grams.",
          "Do not add an unsupported extra zero.",
        ],
        "A least count of $0.01\\text{ g}$ supports reporting to two decimal places, so $12.35\\text{ g}$ is appropriate.",
        ["least_count", "measurement_precision"],
        2,
      ),
      extraMc(
        L`A liquid sample has mass $50.0\text{ g}$ and volume $20.0\text{ mL}$. Its density is`,
        [
          L`$0.400\text{ g mL}^{-1}$`,
          L`$2.50\text{ g mL}^{-1}$`,
          L`$70.0\text{ g mL}^{-1}$`,
          L`$1000\text{ g mL}^{-1}$`,
        ],
        "B",
        {
          A: "This divides volume by mass instead of mass by volume.",
          C: "This adds mass and volume.",
          D: "This multiplies mass and volume.",
        },
        [
          "Density is mass per unit volume.",
          "Use $d=m/V$.",
          "Compute $50.0/20.0$.",
        ],
        "$d=50.0/20.0=2.50\\text{ g mL}^{-1}$.",
        ["density", "unit_calculation"],
        2,
        true,
      ),
      extraMc(
        L`A student heats $4.00\text{ g}$ magnesium in a closed vessel with oxygen. The total mass before heating is $28.00\text{ g}$. If no matter escapes, the total mass after reaction is`,
        [
          L`$4.00\text{ g}$`,
          L`$24.00\text{ g}$`,
          L`$28.00\text{ g}$`,
          "cannot be predicted in a closed system",
        ],
        "C",
        {
          A: "This counts only magnesium, not the whole closed system.",
          B: "This subtracts magnesium without reason.",
          D: "Mass conservation applies in a closed system.",
        },
        [
          "The vessel is closed.",
          "No matter escapes or enters.",
          "Apply conservation of mass to the whole system.",
        ],
        "By the law of conservation of mass, the total mass remains $28.00\\text{ g}$.",
        ["law_conservation_mass"],
        2,
      ),
      extraMc(
        L`The product of $2.50$ and $3.0$ should be reported as`,
        [L`$7.5$`, L`$7.50$`, L`$7.500$`, L`$8$`],
        "A",
        {
          B: "$7.50$ has three significant figures, but $3.0$ has only two.",
          C: "This claims four significant figures.",
          D: "This rounds too severely.",
        },
        [
          "For multiplication, use the least number of significant figures.",
          "$2.50$ has three significant figures.",
          "$3.0$ has two significant figures.",
        ],
        "The product is $7.50$, but it must be rounded to two significant figures: $7.5$.",
        ["significant_figures"],
        2,
      ),
      extraMc(
        L`Which sample is best classified as a homogeneous mixture?`,
        [
          "muddy water",
          "oil and water after shaking and standing",
          "aqueous sugar solution",
          "granite",
        ],
        "C",
        {
          A: "Muddy water is not uniform throughout.",
          B: "Oil and water form separate layers.",
          D: "Granite has visibly different mineral regions.",
        },
        [
          "Homogeneous means uniform composition throughout.",
          "A dissolved solute in water can form a uniform solution.",
          "Sugar solution is uniform at the macroscopic level.",
        ],
        "An aqueous sugar solution has uniform composition throughout, so it is homogeneous.",
        ["classification_matter"],
        1,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`A metal piece has mass $13.5\text{ g}$ and displaces water from $18.0\text{ mL}$ to $23.0\text{ mL}$ in a measuring cylinder.`,
        3,
        ["density", "measurement"],
        [
          {
            letter: "a",
            promptMarkdown: "Find the volume of the metal.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate its density with a suitable unit.",
            points: 3,
          },
        ],
        [
          "Displaced volume equals object volume.",
          "Subtract the two cylinder readings.",
          "Density is mass divided by volume.",
        ],
        [
          { part: "a", explanation: "Volume $=23.0-18.0=5.0\\text{ mL}$." },
          {
            part: "b",
            explanation:
              "Density $=13.5/5.0=2.7\\text{ g mL}^{-1}$ to two significant figures.",
          },
        ],
        ["Using final cylinder reading as the object volume."],
      ),
      extraFrq(
        "vsaq",
        L`Why must a chemical-combination mass test be done in a closed system?`,
        2,
        ["law_conservation_mass"],
        singlePart("a", "Give the reason.", 2),
        [
          "Think of gases during reaction.",
          "Mass appears lost if products escape.",
          "A closed system lets conservation of mass be tested.",
        ],
        [
          {
            part: "a",
            explanation:
              "The system must be closed so that no reactant or product escapes or enters. Then any measured mass change cannot be due to loss or gain of matter.",
          },
        ],
        ["Ignoring gaseous products or reactants."],
      ),
      extraFrq(
        "saq",
        L`Two students report the same measured length as $25.4\text{ cm}$ and $25.40\text{ cm}$.`,
        2,
        ["precision", "significant_figures"],
        [
          {
            letter: "a",
            promptMarkdown: "Which report indicates greater precision?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain what the final zero means.",
            points: 3,
          },
        ],
        [
          "Zeros after a decimal can be significant.",
          "Compare tenths and hundredths places.",
          "The final zero can show measurement to $0.01\\text{ cm}$.",
        ],
        [
          {
            part: "a",
            explanation: "$25.40\\text{ cm}$ indicates greater precision.",
          },
          {
            part: "b",
            explanation:
              "The final zero is significant; it says the measurement was recorded to the nearest $0.01\\text{ cm}$, not just $0.1\\text{ cm}$.",
          },
        ],
        ["Treating every zero as insignificant."],
      ),
      extraFrq(
        "laq",
        L`A sample is made by mixing iron filings, sulphur powder, and common salt. Water is added and the mixture is filtered.`,
        4,
        ["mixtures", "separation", "classification_matter"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State whether the original sample is homogeneous or heterogeneous.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which component dissolves in water?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Name one physical method to separate iron filings before adding water.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why no new compound is necessarily formed by mixing.",
            points: 2,
          },
        ],
        [
          "The components remain visibly and chemically distinct.",
          "Common salt dissolves in water.",
          "Iron can be separated magnetically.",
        ],
        [
          { part: "a", explanation: "The original sample is heterogeneous." },
          { part: "b", explanation: "Common salt dissolves in water." },
          { part: "c", explanation: "A magnet can separate iron filings." },
          {
            part: "d",
            explanation:
              "Simple mixing does not require a fixed composition or new chemical bonds, so it is a mixture unless a chemical reaction is carried out.",
          },
        ],
        ["Calling every mixture a compound because solids were mixed."],
      ),
      extraFrq(
        "case",
        L`A lab group records three observations: sample P has uniform composition, sample Q settles into two layers, and sample R gives the same mass before and after a reaction in a sealed flask.`,
        4,
        ["case_based", "classification_matter", "law_conservation_mass"],
        [
          {
            letter: "a",
            promptMarkdown: "Classify P as homogeneous or heterogeneous.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Classify Q as homogeneous or heterogeneous.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the law supported by observation R.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Explain why the sealed flask condition matters.",
            points: 2,
          },
        ],
        [
          "Uniform composition indicates homogeneous.",
          "Two layers indicate non-uniform composition.",
          "A sealed flask prevents matter exchange.",
        ],
        [
          { part: "a", explanation: "P is homogeneous." },
          { part: "b", explanation: "Q is heterogeneous." },
          {
            part: "c",
            explanation: "R supports the law of conservation of mass.",
          },
          {
            part: "d",
            explanation:
              "The sealed flask prevents loss or entry of matter, so total mass can be compared fairly.",
          },
        ],
        ["Using appearance alone without considering uniformity."],
      ),
    ],
  },
  "1.2": {
    mc: [
      extraMc(
        L`The number of molecules in $0.500\text{ mol}$ of $\mathrm{CO_2}$ is closest to`,
        [
          L`$3.01\times10^{23}$`,
          L`$6.02\times10^{23}$`,
          L`$1.20\times10^{24}$`,
          L`$0.500\times10^{-23}$`,
        ],
        "A",
        {
          B: "This is the number in one mole.",
          C: "This doubles instead of halves Avogadro's number.",
          D: "This inverts the scale.",
        },
        [
          "Use Avogadro's number.",
          "Half a mole has half Avogadro's number.",
          "$0.500\\times6.022\\times10^{23}$.",
        ],
        "Number of molecules $=0.500N_A=3.01\\times10^{23}$.",
        ["avogadro_number"],
        2,
      ),
      extraMc(
        L`The amount of $\mathrm{CO_2}$ in $22.0\text{ g}$ of $\mathrm{CO_2}$ is`,
        [
          L`$0.250\text{ mol}$`,
          L`$0.500\text{ mol}$`,
          L`$1.00\text{ mol}$`,
          L`$44.0\text{ mol}$`,
        ],
        "B",
        {
          A: "This would correspond to $11\\text{ g}$.",
          C: "One mole of carbon dioxide has mass $44\\text{ g}$.",
          D: "This uses molar mass as moles.",
        },
        [
          "Find molar mass of carbon dioxide.",
          "$M=44\\text{ g mol}^{-1}$.",
          "Moles are mass divided by molar mass.",
        ],
        "$n=22.0/44.0=0.500\\text{ mol}$.",
        ["mole_concept", "molar_mass"],
        2,
      ),
      extraMc(
        L`A $4.00\text{ g}$ helium sample contains approximately how many atoms?`,
        [
          L`$6.02\times10^{23}$`,
          L`$3.01\times10^{23}$`,
          L`$2.41\times10^{24}$`,
          L`$4.00$`,
        ],
        "A",
        {
          B: "This is half a mole, but helium's molar mass is $4.00\\text{ g mol}^{-1}$.",
          C: "This treats $4\\text{ g}$ as four moles.",
          D: "Mass in grams is not atom count.",
        },
        [
          "Helium atoms are monoatomic.",
          "$4.00\\text{ g}$ helium is one mole.",
          "One mole contains Avogadro's number of atoms.",
        ],
        "$4.00\\text{ g}$ of helium is $1.00\\text{ mol}$, so it contains $6.02\\times10^{23}$ atoms.",
        ["mole_concept", "atoms_count"],
        2,
      ),
      extraMc(
        L`An element has two isotopes of mass numbers $20$ and $22$ present in equal abundance. Its average atomic mass is`,
        [
          L`$20.0\text{ u}$`,
          L`$21.0\text{ u}$`,
          L`$22.0\text{ u}$`,
          L`$42.0\text{ u}$`,
        ],
        "B",
        {
          A: "This ignores the heavier isotope.",
          C: "This ignores the lighter isotope.",
          D: "This adds instead of averaging.",
        },
        [
          "Equal abundance means simple average.",
          "Add the two masses.",
          "Divide by two.",
        ],
        "Average atomic mass $=(20+22)/2=21.0\\text{ u}$.",
        ["average_atomic_mass", "isotopes"],
        2,
      ),
      extraMc(
        L`A mixture contains $0.10\,\mathrm{mol}\ \mathrm{CaCO_3}$ and $0.20\,\mathrm{mol}\ \mathrm{MgCO_3}$. Using molar masses 100 and 84, the total mixture mass is`,
        [
          L`$26.8\,\mathrm{g}$`,
          L`$18.4\,\mathrm{g}$`,
          L`$55.2\,\mathrm{g}$`,
          L`$10.0\,\mathrm{g}$`,
        ],
        "A",
        {
          B: "This uses 0.10 mol of both salts.",
          C: "Do not multiply the total mole amount by the sum of both molar masses.",
          D: "This omits magnesium carbonate.",
        },
        [
          "Find each component mass separately.",
          "Use 100 and 84 g/mol for the respective salts.",
          "Add the masses, not the molar masses.",
        ],
        L`Calcium carbonate contributes $0.10(100)=10.0\,\mathrm{g}$ and magnesium carbonate contributes $0.20(84)=16.8\,\mathrm{g}$. Total mass $=26.8\,\mathrm{g}$.`,
        ["mixture_mass", "mole_calculation"],
        3,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`A sample contains $2.30\text{ g}$ of sodium atoms. Take atomic mass of sodium as $23.0\text{ u}$.`,
        3,
        ["moles", "atom_count"],
        [
          { letter: "a", promptMarkdown: "Find moles of sodium.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Find number of sodium atoms.",
            points: 2,
          },
        ],
        [
          "Use $n=m/M$.",
          "Then multiply by Avogadro's number.",
          "$2.30/23.0=0.100$.",
        ],
        [
          { part: "a", explanation: "$n=2.30/23.0=0.100\\text{ mol}$." },
          {
            part: "b",
            explanation:
              "Atoms $=0.100\\times6.022\\times10^{23}=6.02\\times10^{22}$.",
          },
        ],
        ["Using atomic mass directly as number of atoms."],
      ),
      extraFrq(
        "saq",
        L`Calculate the mass of $3.01\times10^{22}$ molecules of water. Take $M(\mathrm{H_2O})=18.0\text{ g mol}^{-1}$.`,
        4,
        ["molecules_to_mass"],
        [
          {
            letter: "a",
            promptMarkdown: "Convert molecules to moles.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Find mass of water.", points: 2 },
        ],
        [
          "Divide by Avogadro's number.",
          "$3.01\\times10^{22}$ is $0.0500$ mole.",
          "Multiply by molar mass.",
        ],
        [
          {
            part: "a",
            explanation:
              "$n=(3.01\\times10^{22})/(6.022\\times10^{23})=0.0500\\text{ mol}$.",
          },
          {
            part: "b",
            explanation: "Mass $=0.0500\\times18.0=0.900\\text{ g}$.",
          },
        ],
        ["Multiplying by Avogadro's number instead of dividing."],
      ),
      extraFrq(
        "vsaq",
        L`Define one atomic mass unit in terms of carbon-12.`,
        2,
        ["atomic_mass_unit"],
        singlePart("a", "Give the definition.", 2),
        [
          "Use the carbon-12 standard.",
          "The isotope is assigned mass 12 u.",
          "One u is one-twelfth of that atom's mass.",
        ],
        [
          {
            part: "a",
            explanation:
              "One atomic mass unit is one-twelfth of the mass of one atom of carbon-12.",
          },
        ],
        ["Defining it as the mass of one carbon atom."],
      ),
      extraFrq(
        "laq",
        L`An element X has isotopes $^{35}\mathrm{X}$ and $^{37}\mathrm{X}$ with abundances $75\%$ and $25\%$ respectively.`,
        3,
        ["isotopes", "average_atomic_mass"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the weighted-average expression.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate average atomic mass.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why the answer is closer to $35$ than to $37$.",
            points: 1,
          },
        ],
        [
          "Convert percentages to fractions.",
          "Multiply each mass by its fractional abundance.",
          "The more abundant isotope pulls the average closer to itself.",
        ],
        [
          { part: "a", explanation: "Average mass $=35(0.75)+37(0.25)$." },
          {
            part: "b",
            explanation: "Average mass $=26.25+9.25=35.5\\text{ u}$.",
          },
          {
            part: "c",
            explanation:
              "$^{35}\\mathrm{X}$ is more abundant, so the weighted average lies closer to $35$.",
          },
        ],
        ["Taking a simple average despite unequal abundances."],
      ),
      extraFrq(
        "case",
        L`A bottle contains $0.200\text{ mol}$ of ammonia, $\mathrm{NH_3}$. Take $N_A=6.022\times10^{23}$ and $M(\mathrm{NH_3})=17.0\text{ g mol}^{-1}$.`,
        4,
        ["case_based", "moles", "particles"],
        [
          {
            letter: "a",
            promptMarkdown: "Find the number of ammonia molecules.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the mass of ammonia.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the total moles of hydrogen atoms present.",
            points: 1,
          },
        ],
        [
          "Molecules are moles times Avogadro's number.",
          "Mass is moles times molar mass.",
          "Each ammonia molecule has three hydrogen atoms.",
        ],
        [
          {
            part: "a",
            explanation:
              "Molecules $=0.200\\times6.022\\times10^{23}=1.20\\times10^{23}$.",
          },
          {
            part: "b",
            explanation: "Mass $=0.200\\times17.0=3.40\\text{ g}$.",
          },
          {
            part: "c",
            explanation: "Moles of H atoms $=3\\times0.200=0.600\\text{ mol}$.",
          },
        ],
        ["Forgetting the subscript 3 in ammonia."],
      ),
    ],
  },
  "1.3": {
    mc: [
      extraMc(
        L`A compound contains $72.0\%$ C, $12.0\%$ H and $16.0\%$ O by mass. Use C = 12, H = 1 and O = 16. Its empirical formula is`,
        [
          L`$\mathrm{C_6H_{12}O}$`,
          L`$\mathrm{C_3H_6O}$`,
          L`$\mathrm{C_6HO_{16}}$`,
          L`$\mathrm{C_{12}H_{24}O_2}$`,
        ],
        "A",
        {
          B: "Dividing only the carbon and hydrogen subscripts changes the oxygen ratio.",
          C: "Mass percentages must first be divided by atomic masses.",
          D: "This ratio can still be divided by two, so it is not the empirical formula.",
        },
        [
          "Use a 100 g basis.",
          "Convert all three masses to moles.",
          "Use the simplest whole-number mole ratio.",
        ],
        L`For 100 g, the amounts are $72/12:12/1:16/16=6:12:1$. Thus the empirical formula is $\mathrm{C_6H_{12}O}$.`,
        ["empirical_formula"],
        3,
      ),
      extraMc(
        L`A compound has empirical formula $\mathrm{CH_2}$ and molecular molar mass $56\,\mathrm{g\,mol^{-1}}$. Using C = 12 and H = 1, how many hydrogen atoms are present in each molecule?`,
        ["8", "2", "4", "16"],
        "A",
        {
          B: "Two is the empirical hydrogen subscript, before applying the molecular multiplier.",
          C: "Four is the number of empirical units, not hydrogen atoms.",
          D: "The multiplier is four, not eight.",
        },
        [
          "Find the empirical formula mass.",
          "Divide 56 by 14.",
          "Apply that multiplier to the hydrogen subscript.",
        ],
        L`The multiplier is $56/14=4$, giving molecular formula $\mathrm{C_4H_8}$. Each molecule contains eight hydrogen atoms.`,
        ["molecular_formula", "atom_count"],
        2,
      ),
      extraMc(
        L`The percentage by mass of nitrogen in $\mathrm{NH_4NO_3}$ is approximately`,
        [L`$17.5\%$`, L`$28.0\%$`, L`$35.0\%$`, L`$70.0\%$`],
        "C",
        {
          A: "This counts only one nitrogen atom.",
          B: "This uses an incorrect molar mass.",
          D: "This doubles the correct percentage.",
        },
        [
          "Find molar mass.",
          "There are two nitrogen atoms.",
          "Nitrogen mass is $28$ out of total $80$.",
        ],
        "Percentage nitrogen $=(28/80)\\times100=35.0\\%$.",
        ["percentage_composition"],
        2,
        true,
      ),
      extraMc(
        L`The simplest formula corresponding to molecular formula $\mathrm{C_2H_4O_2}$ is`,
        [
          L`$\mathrm{C_2H_4O_2}$`,
          L`$\mathrm{CH_2O}$`,
          L`$\mathrm{CHO}$`,
          L`$\mathrm{C_4H_8O_4}$`,
        ],
        "B",
        {
          A: "This is not reduced to simplest whole-number ratio.",
          C: "Hydrogen would be undercounted.",
          D: "This is a multiple, not simplest form.",
        },
        [
          "Find common factor in subscripts.",
          "The subscripts $2,4,2$ share factor $2$.",
          "Divide all by $2$.",
        ],
        "Dividing subscripts by $2$ gives $\\mathrm{CH_2O}$.",
        ["empirical_formula"],
        2,
      ),
      extraMc(
        L`In $\mathrm{CuSO_4\cdot5H_2O}$, approximate percentage of water by mass is $(\mathrm{CuSO_4}=160,\ 5H_2O=90)$`,
        [L`$18\%$`, L`$36\%$`, L`$56\%$`, L`$90\%$`],
        "B",
        {
          A: "This divides by hydrate mass incorrectly.",
          C: "This is the anhydrous salt fraction.",
          D: "This uses water mass as percentage directly.",
        },
        [
          "Total hydrate mass is $160+90$.",
          "Water mass is $90$.",
          "Use water mass divided by total mass.",
        ],
        "Water percentage $=90/250\\times100=36\\%$.",
        ["hydrate_composition"],
        2,
        true,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`A $4.40\,\mathrm{g}$ compound containing only C, H and O has $2.40\,\mathrm{g}$ carbon and $0.40\,\mathrm{g}$ hydrogen. Use C = 12, H = 1, O = 16. Determine its empirical formula.`,
        3,
        ["empirical_formula", "oxygen_by_difference"],
        [
          { letter: "a", promptMarkdown: "Find the oxygen mass.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the mole ratio and empirical formula.",
            points: 2,
          },
        ],
        [
          "Subtract carbon and hydrogen masses from the sample mass.",
          "Convert all three element masses to moles.",
          "Divide by the smallest amount.",
        ],
        [
          {
            part: "a",
            explanation: L`Oxygen mass $=4.40-2.40-0.40=1.60\,\mathrm{g}$.`,
          },
          {
            part: "b",
            explanation: L`Amounts are $2.40/12=0.20$, $0.40/1=0.40$ and $1.60/16=0.10\,\mathrm{mol}$. The ratio $2:4:1$ gives $\mathrm{C_2H_4O}$.`,
          },
        ],
        ["Using total compound mass as the oxygen mass."],
      ),
      extraFrq(
        "vsaq",
        L`What is the empirical formula of benzene, $\mathrm{C_6H_6}$?`,
        2,
        ["empirical_formula"],
        singlePart("a", "Write the simplest whole-number ratio formula.", 2),
        [
          "Reduce the subscripts.",
          "Both subscripts share factor $6$.",
          "Divide by $6$.",
        ],
        [
          {
            part: "a",
            explanation:
              "The ratio $6:6$ reduces to $1:1$, so the empirical formula is $\\mathrm{CH}$.",
          },
        ],
        ["Copying the molecular formula without reducing it."],
      ),
      extraFrq(
        "saq",
        L`A compound has empirical formula $\mathrm{CH_2}$ and molar mass $42\text{ g mol}^{-1}$.`,
        3,
        ["molecular_formula"],
        [
          {
            letter: "a",
            promptMarkdown: "Find empirical formula mass.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find molecular formula.", points: 3 },
        ],
        [
          "Find mass of $\\mathrm{CH_2}$.",
          "Compare molar mass with empirical formula mass.",
          "Multiply all subscripts by the multiplier.",
        ],
        [
          { part: "a", explanation: "Empirical formula mass $=12+2=14$." },
          {
            part: "b",
            explanation:
              "Multiplier $=42/14=3$, so molecular formula is $\\mathrm{C_3H_6}$.",
          },
        ],
        ["Multiplying only one subscript by the multiplier."],
      ),
      extraFrq(
        "laq",
        L`A hydrated salt is $\mathrm{MgSO_4\cdot xH_2O}$. Its molar mass without water is about $120\text{ g mol}^{-1}$, and water is $51.2\%$ by mass.`,
        5,
        ["hydrate_formula"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the mass of water in one mole as $18x$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Set up the percentage equation.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Find $x$.", points: 2 },
        ],
        [
          "Total molar mass is $120+18x$.",
          "Water fraction is $18x/(120+18x)$.",
          "Set this equal to $0.512$.",
        ],
        [
          {
            part: "a",
            explanation: "Water mass per mole of hydrate is $18x$.",
          },
          { part: "b", explanation: "$18x/(120+18x)=0.512$." },
          {
            part: "c",
            explanation: "Solving gives $18x=0.512(120+18x)$, so $x\\approx7$.",
          },
        ],
        ["Using $51.2$ instead of $0.512$ in the fraction."],
      ),
      extraFrq(
        "case",
        L`Two compounds have the same empirical formula $\mathrm{CH_2O}$. Compound P has molar mass $60\text{ g mol}^{-1}$ and compound Q has molar mass $120\text{ g mol}^{-1}$.`,
        3,
        ["case_based", "molecular_formula"],
        [
          {
            letter: "a",
            promptMarkdown: "Find empirical formula mass.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find molecular formula of P.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find molecular formula of Q.",
            points: 2,
          },
        ],
        [
          "Empirical formula mass of $\\mathrm{CH_2O}$ is $30$.",
          "Find each multiplier.",
          "Multiply all subscripts.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{CH_2O}$ has mass $12+2+16=30$.",
          },
          {
            part: "b",
            explanation:
              "P multiplier $=60/30=2$, so P is $\\mathrm{C_2H_4O_2}$.",
          },
          {
            part: "c",
            explanation:
              "Q multiplier $=120/30=4$, so Q is $\\mathrm{C_4H_8O_4}$.",
          },
        ],
        ["Assuming same empirical formula means same molecular formula."],
      ),
    ],
  },
  "1.4": {
    mc: [
      extraMc(
        L`For $\mathrm{2H_2+O_2\rightarrow2H_2O}$, $5.0\text{ mol }\mathrm{H_2}$ reacts with $2.0\text{ mol }\mathrm{O_2}$. The limiting reagent is`,
        [L`$\mathrm{H_2}$`, L`$\mathrm{O_2}$`, "both exactly", "water"],
        "B",
        {
          A: "Two moles of oxygen need four moles of hydrogen, so hydrogen is excess.",
          C: "One mole hydrogen remains excess.",
          D: "Water is product, not reagent.",
        },
        [
          "Use the balanced ratio $2:1$.",
          "$2.0$ mol oxygen needs $4.0$ mol hydrogen.",
          "There are $5.0$ mol hydrogen available.",
        ],
        "$\\mathrm{O_2}$ is limiting because it is consumed first.",
        ["limiting_reagent"],
        2,
      ),
      extraMc(
        L`On heating $\mathrm{CaCO_3\rightarrow CaO+CO_2}$, $10.0\text{ g}$ of pure $\mathrm{CaCO_3}$ gives theoretical mass of $\mathrm{CaO}$ approximately`,
        [
          L`$2.8\text{ g}$`,
          L`$5.6\text{ g}$`,
          L`$10.0\text{ g}$`,
          L`$56\text{ g}$`,
        ],
        "B",
        {
          A: "This halves the product mass again.",
          C: "Mass is not unchanged for one product.",
          D: "This is the molar mass, not product mass from $10\\text{ g}$.",
        },
        [
          "Molar mass $\\mathrm{CaCO_3}=100$.",
          "Molar mass $\\mathrm{CaO}=56$.",
          "$10.0\\text{ g}$ is $0.100$ mol.",
        ],
        "Moles $\\mathrm{CaCO_3}=0.100$, so mass $\\mathrm{CaO}=0.100\\times56=5.6\\text{ g}$.",
        ["stoichiometry", "mass_mass"],
        2,
      ),
      extraMc(
        L`If theoretical yield is $12.5\text{ g}$ and actual yield is $10.0\text{ g}$, percentage yield is`,
        [L`$80.0\%$`, L`$125\%$`, L`$22.5\%$`, L`$2.50\%$`],
        "A",
        {
          B: "This reverses actual and theoretical yield.",
          C: "This subtracts instead of dividing.",
          D: "This divides by the wrong scale.",
        },
        [
          "Percent yield is actual divided by theoretical times $100$.",
          "Use $10.0/12.5$.",
          "Convert to percent.",
        ],
        "Percentage yield $=(10.0/12.5)\\times100=80.0\\%$.",
        ["percentage_yield"],
        2,
        true,
      ),
      extraMc(
        L`For $\mathrm{N_2+3H_2\rightarrow2NH_3}$, $2.0\text{ mol }\mathrm{N_2}$ and $3.0\text{ mol }\mathrm{H_2}$ can form at most`,
        [
          L`$1.0\text{ mol }\mathrm{NH_3}$`,
          L`$2.0\text{ mol }\mathrm{NH_3}$`,
          L`$3.0\text{ mol }\mathrm{NH_3}$`,
          L`$4.0\text{ mol }\mathrm{NH_3}$`,
        ],
        "B",
        {
          A: "This uses the nitrogen ratio instead of the limiting hydrogen ratio.",
          C: "This copies moles of hydrogen.",
          D: "This assumes nitrogen is limiting.",
        },
        [
          "Check limiting reagent.",
          "$3$ mol hydrogen gives $2$ mol ammonia.",
          "Hydrogen is limiting.",
        ],
        "Hydrogen is limiting, and $3.0\\text{ mol }\\mathrm{H_2}$ forms $2.0\\text{ mol }\\mathrm{NH_3}$.",
        ["limiting_reagent", "stoichiometry"],
        3,
      ),
      extraMc(
        L`In $\mathrm{CH_4+2O_2\rightarrow CO_2+2H_2O}$, complete combustion of $0.50\text{ mol}$ methane requires oxygen`,
        [
          L`$0.25\text{ mol}$`,
          L`$0.50\text{ mol}$`,
          L`$1.00\text{ mol}$`,
          L`$2.00\text{ mol}$`,
        ],
        "C",
        {
          A: "This inverts the stoichiometric ratio.",
          B: "This ignores the coefficient $2$ on oxygen.",
          D: "This is oxygen needed for one mole methane.",
        },
        [
          "The methane-to-oxygen ratio is $1:2$.",
          "Multiply methane moles by $2$.",
          "$0.50\\times2=1.00$.",
        ],
        "$0.50\\text{ mol}$ methane requires $1.00\\text{ mol}$ oxygen.",
        ["combustion_stoichiometry"],
        2,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Hydrogen and oxygen react as $\mathrm{2H_2+O_2\rightarrow2H_2O}$. A vessel has $4.0\text{ mol }\mathrm{H_2}$ and $3.0\text{ mol }\mathrm{O_2}$.`,
        4,
        ["limiting_reagent"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the limiting reagent.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find moles of water formed.",
            points: 2,
          },
        ],
        [
          "Use the $2:1$ ratio.",
          "$4.0$ mol hydrogen needs $2.0$ mol oxygen.",
          "Oxygen is excess.",
        ],
        [
          {
            part: "a",
            explanation:
              "$4.0$ mol hydrogen needs only $2.0$ mol oxygen, so hydrogen is limiting.",
          },
          {
            part: "b",
            explanation:
              "The ratio $2\\mathrm{H_2}:2\\mathrm{H_2O}$ is $1:1$, so $4.0$ mol water forms.",
          },
        ],
        [
          "Choosing the reagent present in smaller numerical moles without ratio check.",
        ],
      ),
      extraFrq(
        "saq",
        L`In $\mathrm{2Mg+O_2\rightarrow2MgO}$, $4.8\text{ g}$ magnesium burns completely. Take $\mathrm{Mg}=24$ and $\mathrm{MgO}=40$.`,
        3,
        ["mass_mass_stoichiometry"],
        [
          { letter: "a", promptMarkdown: "Find moles of Mg.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Find mass of MgO formed.",
            points: 2,
          },
        ],
        [
          "Convert magnesium mass to moles.",
          "Mole ratio Mg to MgO is $1:1$.",
          "Multiply moles by molar mass of MgO.",
        ],
        [
          {
            part: "a",
            explanation: "$n(\\mathrm{Mg})=4.8/24=0.20\\text{ mol}$.",
          },
          {
            part: "b",
            explanation:
              "$n(\\mathrm{MgO})=0.20\\text{ mol}$, so mass $=0.20\\times40=8.0\\text{ g}$.",
          },
        ],
        ["Using oxygen's coefficient to halve the magnesium oxide moles."],
      ),
      extraFrq(
        "vsaq",
        L`What does limiting reagent mean?`,
        1,
        ["limiting_reagent"],
        singlePart("a", "Define the term.", 2),
        [
          "It is consumed first.",
          "It limits product amount.",
          "Excess reactants remain after it is used up.",
        ],
        [
          {
            part: "a",
            explanation:
              "The limiting reagent is the reactant that is completely consumed first and therefore determines the maximum amount of product formed.",
          },
        ],
        ["Defining it as the reactant with smallest mass only."],
      ),
      extraFrq(
        "laq",
        L`$\mathrm{AgNO_3(aq)+NaCl(aq)\rightarrow AgCl(s)+NaNO_3(aq)}$. Mix $25.0\text{ mL}$ of $0.200\text{ M }\mathrm{AgNO_3}$ with $50.0\text{ mL}$ of $0.0500\text{ M }\mathrm{NaCl}$.`,
        5,
        ["limiting_reagent", "precipitation_stoichiometry"],
        [
          {
            letter: "a",
            promptMarkdown: "Find moles of each reactant.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Identify limiting reagent.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find mass of $\\mathrm{AgCl}$ formed. Take $M=143.5\\text{ g mol}^{-1}$.",
            points: 2,
          },
        ],
        [
          "Convert millilitres to litres.",
          "The reaction ratio is $1:1$.",
          "Moles of precipitate equal limiting moles.",
        ],
        [
          {
            part: "a",
            explanation:
              "$n(\\mathrm{AgNO_3})=0.0250\\times0.200=0.00500$ mol; $n(\\mathrm{NaCl})=0.0500\\times0.0500=0.00250$ mol.",
          },
          { part: "b", explanation: "$\\mathrm{NaCl}$ is limiting." },
          {
            part: "c",
            explanation:
              "Mass $\\mathrm{AgCl}=0.00250\\times143.5=0.359\\text{ g}$.",
          },
        ],
        ["Forgetting to convert mL to L."],
      ),
      extraFrq(
        "case",
        L`An experiment should produce $5.00\text{ g}$ of a salt according to stoichiometry, but only $4.20\text{ g}$ is collected after filtration and drying.`,
        3,
        ["case_based", "percentage_yield"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify theoretical yield.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Identify actual yield.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Calculate percentage yield.",
            points: 3,
          },
        ],
        [
          "Theoretical yield comes from calculation.",
          "Actual yield is what is collected.",
          "Use actual/theoretical times $100$.",
        ],
        [
          {
            part: "a",
            explanation: "The theoretical yield is $5.00\\text{ g}$.",
          },
          { part: "b", explanation: "The actual yield is $4.20\\text{ g}$." },
          {
            part: "c",
            explanation: "Percentage yield $=(4.20/5.00)\\times100=84.0\\%$.",
          },
        ],
        ["Using theoretical divided by actual."],
      ),
    ],
  },
  "1.5": {
    mc: [
      extraMc(
        L`A solution contains $0.500\text{ mol}$ solute in $250\text{ mL}$ solution. Its molarity is`,
        [
          L`$0.125\text{ M}$`,
          L`$0.500\text{ M}$`,
          L`$2.00\text{ M}$`,
          L`$250\text{ M}$`,
        ],
        "C",
        {
          A: "This multiplies moles by litres.",
          B: "This forgets to divide by volume in litres.",
          D: "This uses millilitres as litres.",
        },
        [
          "Convert $250\\text{ mL}$ to $0.250\\text{ L}$.",
          "Molarity is moles per litre.",
          "Compute $0.500/0.250$.",
        ],
        "$M=0.500/0.250=2.00\\text{ M}$.",
        ["molarity"],
        2,
        true,
      ),
      extraMc(
        L`Volume of $2.0\text{ M}$ stock solution required to prepare $100\text{ mL}$ of $0.50\text{ M}$ solution is`,
        [
          L`$10\text{ mL}$`,
          L`$25\text{ mL}$`,
          L`$50\text{ mL}$`,
          L`$400\text{ mL}$`,
        ],
        "B",
        {
          A: "This would give too few moles.",
          C: "This would give $1.0\\text{ M}$ final solution.",
          D: "This reverses dilution.",
        },
        [
          "Use $M_1V_1=M_2V_2$.",
          "$2.0V_1=0.50\\times100$.",
          "Solve for $V_1$.",
        ],
        "$V_1=25\\text{ mL}$.",
        ["dilution"],
        2,
        true,
      ),
      extraMc(
        L`Molality of a solution containing $0.200\text{ mol}$ solute in $0.500\text{ kg}$ solvent is`,
        [
          L`$0.100\text{ m}$`,
          L`$0.400\text{ m}$`,
          L`$2.50\text{ m}$`,
          L`$0.700\text{ m}$`,
        ],
        "B",
        {
          A: "This multiplies instead of divides.",
          C: "This divides solvent by solute.",
          D: "This adds the two numbers.",
        },
        [
          "Molality is moles of solute per kg solvent.",
          "Use $0.200/0.500$.",
          "Keep the unit mol kg$^{-1}$.",
        ],
        "Molality $=0.200/0.500=0.400\\text{ m}$.",
        ["molality"],
        2,
        true,
      ),
      extraMc(
        L`Mole fraction of ethanol in a mixture containing $1.0\text{ mol}$ ethanol and $9.0\text{ mol}$ water is`,
        [L`$0.10$`, L`$0.11$`, L`$0.90$`, L`$9.0$`],
        "A",
        {
          B: "This divides by water moles only.",
          C: "This is the water mole fraction.",
          D: "This is a mole ratio, not mole fraction.",
        },
        [
          "Mole fraction uses total moles in denominator.",
          "Total moles are $10.0$.",
          "Ethanol fraction is $1.0/10.0$.",
        ],
        "$x_{ethanol}=1.0/(1.0+9.0)=0.10$.",
        ["mole_fraction"],
        2,
      ),
      extraMc(
        L`A $5.0\text{ g}$ solute sample is dissolved to make $100\text{ g}$ solution. Mass percentage of solute is`,
        [L`$5.0\%$`, L`$5.3\%$`, L`$20\%$`, L`$95\%$`],
        "A",
        {
          B: "This divides by solvent mass $95\\text{ g}$, not solution mass.",
          C: "This inverts the fraction.",
          D: "This is the solvent percentage.",
        },
        [
          "Mass percent uses mass of solution.",
          "Solution mass is given as $100\\text{ g}$.",
          "Use $5.0/100\\times100$.",
        ],
        "Mass percentage $=(5.0/100)\\times100=5.0\\%$.",
        ["mass_percent"],
        2,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`A student weighs $4.00\,\mathrm{g}$ NaOH to prepare $500\,\mathrm{mL}$ of $0.200\,\mathrm{M}$ solution, but accidentally makes the final volume $400\,\mathrm{mL}$. Use molar mass $40.0\,\mathrm{g\,mol^{-1}}$.`,
        3,
        ["solution_preparation", "correcting_dilution"],
        [
          {
            letter: "a",
            promptMarkdown: "Calculate the actual molarity.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State how to correct the solution without discarding solute.",
            points: 1,
          },
        ],
        [
          "The amount of solute is unchanged by the volume error.",
          "Calculate moles and divide by the actual volume.",
          "Determine the final volume needed for the target molarity.",
        ],
        [
          {
            part: "a",
            explanation: L`$n=4.00/40.0=0.100\,\mathrm{mol}$. Actual molarity $=0.100/0.400=0.250\,\mathrm{M}$.`,
          },
          {
            part: "b",
            explanation: L`Dilute to a final solution volume of $0.100/0.200=0.500\,\mathrm{L}=500\,\mathrm{mL}$ at the preparation temperature.`,
          },
        ],
        [
          "Removing a portion of uniform solution does not reduce its molarity.",
        ],
      ),
      extraFrq(
        "saq",
        L`A student dilutes $20.0\text{ mL}$ of $1.50\text{ M}$ acid to $250\text{ mL}$.`,
        3,
        ["dilution"],
        [
          {
            letter: "a",
            promptMarkdown: "Find moles of acid before dilution.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Find final molarity.", points: 2 },
        ],
        [
          "Dilution does not change moles of solute.",
          "Use $n=MV$ for the stock volume in litres.",
          "Divide by final volume in litres.",
        ],
        [
          {
            part: "a",
            explanation: "$n=1.50\\times0.0200=0.0300\\text{ mol}$.",
          },
          {
            part: "b",
            explanation: "Final molarity $=0.0300/0.250=0.120\\text{ M}$.",
          },
        ],
        ["Using initial volume as final volume."],
      ),
      extraFrq(
        "vsaq",
        L`State the difference between molarity and molality in terms of denominator used.`,
        2,
        ["molarity", "molality"],
        singlePart("a", "State both denominators.", 2),
        [
          "Molarity is concentration per volume of solution.",
          "Molality is concentration per mass of solvent.",
          "Mention litre and kilogram.",
        ],
        [
          {
            part: "a",
            explanation:
              "Molarity is moles of solute per litre of solution, while molality is moles of solute per kilogram of solvent.",
          },
        ],
        ["Saying both use volume of solution."],
      ),
      extraFrq(
        "laq",
        L`A solution is prepared by dissolving $9.0\text{ g}$ glucose, $\mathrm{C_6H_{12}O_6}$, in $90.0\text{ g}$ water. Take molar mass of glucose as $180\text{ g mol}^{-1}$.`,
        3,
        ["molality", "mass_percent"],
        [
          { letter: "a", promptMarkdown: "Find moles of glucose.", points: 1 },
          { letter: "b", promptMarkdown: "Find molality.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "Find mass percent of glucose.",
            points: 2,
          },
        ],
        [
          "Convert glucose mass to moles.",
          "Convert water mass to kg.",
          "Mass percent uses total solution mass.",
        ],
        [
          { part: "a", explanation: "$n=9.0/180=0.050\\text{ mol}$." },
          {
            part: "b",
            explanation:
              "Water mass $=0.0900\\text{ kg}$, so molality $=0.050/0.0900=0.56\\text{ m}$.",
          },
          {
            part: "c",
            explanation: "Mass percent $=9.0/(9.0+90.0)\\times100=9.1\\%$.",
          },
        ],
        ["Using water mass instead of solution mass for mass percentage."],
      ),
      extraFrq(
        "case",
        L`A pharmacy label says a bottle contains $500\text{ mL}$ of $0.200\text{ M}$ saline-equivalent solution. A technician needs $100\text{ mL}$ of $0.0500\text{ M}$ solution from it.`,
        3,
        ["case_based", "dilution", "molarity"],
        [
          {
            letter: "a",
            promptMarkdown: "Find stock volume needed.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find volume of water added approximately.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the dilution principle used.",
            points: 1,
          },
        ],
        [
          "Use $M_1V_1=M_2V_2$.",
          "Solve for $V_1$.",
          "Water added is final volume minus stock volume.",
        ],
        [
          {
            part: "a",
            explanation:
              "$0.200V_1=0.0500\\times100$, so $V_1=25.0\\text{ mL}$.",
          },
          {
            part: "b",
            explanation:
              "Water added approximately $=100-25.0=75.0\\text{ mL}$.",
          },
          {
            part: "c",
            explanation:
              "Dilution keeps moles of solute constant: $M_1V_1=M_2V_2$.",
          },
        ],
        ["Adding volumes before finding stock volume."],
      ),
    ],
  },
};

const expandedTopicSeeds: readonly TopicSeed[] = topicSeeds.map((seed) => {
  const extra = largeTopicExpansions[seed.topicCode];
  if (!extra) return seed;

  return {
    ...seed,
    mc: [...seed.mc, ...extra.mc],
    constructed: [...seed.constructed, ...extra.constructed],
  };
});

export const someBasicConceptsTopics: Topic[] =
  expandedTopicSeeds.map(makeTopic);
