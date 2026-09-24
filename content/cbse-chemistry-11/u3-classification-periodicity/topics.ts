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
const UNIT = "u3-classification-periodicity";
const VERSION = "0.1.4";
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
        /(^|[^\\])\b(mathrm|text|frac|Delta|alpha|circ|rightleftharpoons|rightarrow|approx)\b/g,
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
  return `You chose ${choiceText}. Recheck the periodic-law statement, position, or trend before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_chemistry_periodic_trend_reasoning"),
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_periodic_trend_without_checking_position_or_electronic_configuration",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_trend_without_linking_it_to_nuclear_charge_shells_or_configuration",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
    reviewStatus: REVIEW_STATUS,
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

const periodicBlocksFigure: ItemFigure = {
  type: "svg",
  title: "Block layout of the long-form periodic table",
  description:
    "A simplified periodic table showing the s, d, p and f block regions with period and group labels.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <text x="360" y="32" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Long-form periodic table: block regions</text>
  <text x="92" y="64" font-family="Arial" font-size="13" fill="#374151">Group 1</text>
  <text x="158" y="64" font-family="Arial" font-size="13" fill="#374151">2</text>
  <text x="302" y="64" font-family="Arial" font-size="13" fill="#374151">3-12</text>
  <text x="522" y="64" font-family="Arial" font-size="13" fill="#374151">13-18</text>
  <text x="22" y="112" font-family="Arial" font-size="13" fill="#374151">Period</text>
  <text x="42" y="142" font-family="Arial" font-size="13" fill="#374151">1</text>
  <text x="42" y="182" font-family="Arial" font-size="13" fill="#374151">2</text>
  <text x="42" y="222" font-family="Arial" font-size="13" fill="#374151">3</text>
  <text x="42" y="262" font-family="Arial" font-size="13" fill="#374151">4-7</text>
  <rect x="90" y="100" width="120" height="184" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <rect x="230" y="220" width="260" height="64" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <rect x="510" y="140" width="150" height="144" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <rect x="230" y="298" width="430" height="36" rx="6" fill="#f3e8ff" stroke="#9333ea" stroke-width="2"/>
  <text x="150" y="198" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#1d4ed8">s block</text>
  <text x="360" y="260" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#92400e">d block</text>
  <text x="585" y="220" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#166534">p block</text>
  <text x="445" y="323" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#6b21a8">f block</text>
</svg>`,
};

const ionizationJumpFigure: ItemFigure = {
  type: "svg",
  title: "Successive ionisation enthalpies",
  description:
    "A bar chart showing six successive ionisation enthalpies for one main-group element.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <text x="310" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Successive ionisation enthalpies</text>
  <line x1="80" y1="300" x2="570" y2="300" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="60" x2="80" y2="300" stroke="#334155" stroke-width="2"/>
  <text x="40" y="70" font-family="Arial" font-size="12" fill="#475569">high</text>
  <text x="46" y="304" font-family="Arial" font-size="12" fill="#475569">low</text>
  <rect x="110" y="266" width="48" height="34" fill="#93c5fd" stroke="#2563eb" stroke-width="2"/>
  <rect x="185" y="250" width="48" height="50" fill="#93c5fd" stroke="#2563eb" stroke-width="2"/>
  <rect x="260" y="96" width="48" height="204" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <rect x="335" y="78" width="48" height="222" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <rect x="410" y="62" width="48" height="238" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <rect x="485" y="50" width="48" height="250" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <text x="134" y="322" text-anchor="middle" font-family="Arial" font-size="13" fill="#111827">IE1</text>
  <text x="209" y="322" text-anchor="middle" font-family="Arial" font-size="13" fill="#111827">IE2</text>
  <text x="284" y="322" text-anchor="middle" font-family="Arial" font-size="13" fill="#111827">IE3</text>
  <text x="359" y="322" text-anchor="middle" font-family="Arial" font-size="13" fill="#111827">IE4</text>
  <text x="434" y="322" text-anchor="middle" font-family="Arial" font-size="13" fill="#111827">IE5</text>
  <text x="509" y="322" text-anchor="middle" font-family="Arial" font-size="13" fill="#111827">IE6</text>
</svg>`,
};

const periodicPositionsFigure: ItemFigure = {
  type: "svg",
  title: "Relative positions in the periodic table",
  description:
    "A simplified grid marking four elements A, B, C and D in different groups and periods.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <text x="320" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Positions of four elements</text>
  <text x="108" y="72" text-anchor="middle" font-family="Arial" font-size="13" fill="#374151">Group 1</text>
  <text x="218" y="72" text-anchor="middle" font-family="Arial" font-size="13" fill="#374151">Group 2</text>
  <text x="428" y="72" text-anchor="middle" font-family="Arial" font-size="13" fill="#374151">Group 17</text>
  <text x="538" y="72" text-anchor="middle" font-family="Arial" font-size="13" fill="#374151">Group 18</text>
  <text x="32" y="126" font-family="Arial" font-size="13" fill="#374151">Period 2</text>
  <text x="32" y="196" font-family="Arial" font-size="13" fill="#374151">Period 3</text>
  <text x="32" y="266" font-family="Arial" font-size="13" fill="#374151">Period 4</text>
  <g stroke="#cbd5e1" stroke-width="2" fill="#f8fafc">
    <rect x="80" y="90" width="86" height="54"/>
    <rect x="190" y="90" width="86" height="54"/>
    <rect x="400" y="90" width="86" height="54"/>
    <rect x="510" y="90" width="86" height="54"/>
    <rect x="80" y="160" width="86" height="54"/>
    <rect x="190" y="160" width="86" height="54"/>
    <rect x="400" y="160" width="86" height="54"/>
    <rect x="510" y="160" width="86" height="54"/>
    <rect x="80" y="230" width="86" height="54"/>
    <rect x="190" y="230" width="86" height="54"/>
    <rect x="400" y="230" width="86" height="54"/>
    <rect x="510" y="230" width="86" height="54"/>
  </g>
  <circle cx="123" cy="117" r="19" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="123" y="123" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#1d4ed8">A</text>
  <circle cx="443" cy="117" r="19" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <text x="443" y="123" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#166534">B</text>
  <circle cx="123" cy="257" r="19" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
  <text x="123" y="263" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#991b1b">C</text>
  <circle cx="443" cy="257" r="19" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="443" y="263" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#92400e">D</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Need, Genesis and Modern Periodic Law",
    subtopic:
      "Why classification is needed, early classification, Mendeleev, Moseley and modern periodic law",
    mc: [
      {
        questionLatex: L`Dobereiner's triad idea is tested for chlorine, bromine and iodine. If the atomic masses of chlorine and iodine are about $35.5$ and $127$, the predicted atomic mass of the middle element is closest to`,
        difficulty: 2,
        skillTags: ["dobereiner_triad", "classification_history"],
        choices: [L`$46$`, L`$127$`, L`$81$`, L`$162.5$`],
        correctLetter: "C",
        rationales: {
          A: "This is not the average of the first and third masses.",
          B: "This repeats iodine's mass instead of finding the middle member.",
          D: "This adds the two masses instead of averaging them.",
        },
        hints: [
          "In a triad, the middle mass is approximately the average of the other two.",
          "Add $35.5$ and $127$.",
          "Divide the sum by 2.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Use the average of the first and third members of the triad.",
            math: L`\frac{35.5+127}{2}=81.25`,
          },
          {
            step: 2,
            explanation: "The closest option is 81.",
            math: L`81.25\approx81`,
          },
        ],
      },
      {
        questionLatex: L`Mendeleev left gaps in his periodic table for elements that had not yet been discovered. Which statement best explains why this was scientifically useful?`,
        difficulty: 3,
        skillTags: ["mendeleev_periodic_table", "prediction"],
        choices: [
          "It allowed him to predict properties of undiscovered elements from surrounding elements.",
          "It removed all exceptions from arrangement by atomic mass.",
          "It proved that isotopes have identical masses.",
          "It showed that noble gases must be placed in group 1.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Mendeleev still had some anomalous pairs; the gaps were mainly predictive.",
          C: "Isotopes were not the reason for the predictive gaps in Mendeleev's table.",
          D: "Noble gases were discovered later and form group 18, not group 1.",
        },
        hints: [
          "Think about what a gap can tell you if a pattern is trusted.",
          "Mendeleev compared properties in rows and columns.",
          "A missing position can carry predicted mass and properties.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The table grouped similar elements, so a blank place had a predictable neighbourhood.",
          },
          {
            step: 2,
            explanation:
              "This let Mendeleev predict properties of elements such as eka-aluminium before discovery.",
          },
        ],
      },
      {
        questionLatex: L`The modern periodic law states that the physical and chemical properties of elements are periodic functions of their`,
        difficulty: 1,
        skillTags: ["modern_periodic_law"],
        choices: [
          "atomic masses",
          "mass numbers",
          "atomic numbers",
          "neutron numbers",
        ],
        correctLetter: "C",
        rationales: {
          A: "Atomic mass was used in Mendeleev's law, not the modern periodic law.",
          B: "Mass number varies among isotopes and does not define periodic position.",
          D: "Neutron number can change for isotopes without changing chemical identity.",
        },
        hints: [
          "Modern periodic law follows Moseley's work.",
          "The ordering property also equals the number of protons.",
          "It is not atomic mass.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Modern periodic classification is based on increasing atomic number.",
          },
        ],
      },
      {
        questionLatex: L`Argon is placed before potassium in the modern periodic table, even though argon's atomic mass is slightly greater. The best reason is that`,
        difficulty: 3,
        skillTags: ["atomic_number_order", "moseley"],
        choices: [
          "argon is a metal and potassium is a non-metal",
          "potassium has a filled valence shell",
          "argon has atomic number $18$ and potassium has atomic number $19$",
          "argon and potassium are isotopes",
        ],
        correctLetter: "C",
        rationales: {
          A: "Argon is a noble gas and potassium is a metal; this does not explain the ordering rule.",
          B: "Potassium has one valence electron, not a filled valence shell.",
          D: "They have different atomic numbers, so they are different elements, not isotopes.",
        },
        hints: [
          "Modern order is not by atomic mass.",
          "Compare the number of protons.",
          "Atomic numbers decide the position.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Modern periodic position is governed by atomic number.",
          },
          {
            step: 2,
            explanation:
              "Argon has $Z=18$ and potassium has $Z=19$, so argon comes first.",
          },
        ],
      },
      {
        questionLatex: L`A newly measured element was once suspected, from mass-based comparison, to belong near tellurium. Later measurements show that its atomic number is one greater than tellurium. In the modern periodic table, its position should primarily be decided by`,
        difficulty: 4,
        skillTags: ["modern_law_application", "atomic_number"],
        choices: [
          "atomic mass alone",
          "only the density of the element",
          "the alphabetical order of element names",
          "atomic number and electronic configuration",
        ],
        correctLetter: "D",
        rationales: {
          A: "Atomic mass alone led to anomalous pairs; modern classification uses atomic number.",
          C: "Names do not determine periodic position.",
          B: "Density is a property, not the basis of modern periodic order.",
        },
        hints: [
          "The word modern is doing work here.",
          "Atomic number fixes the nuclear charge and electron count of a neutral atom.",
          "Electronic configuration explains recurring chemical similarity.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Modern periodic position is determined by increasing atomic number.",
          },
          {
            step: 2,
            explanation:
              "Electronic configuration then explains why properties repeat periodically.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the modern periodic law in one sentence.`,
        difficulty: 1,
        skillTags: ["modern_periodic_law", "definition"],
        parts: singlePart("a", "Write the law.", 1),
        hints: [
          "Mention properties of elements.",
          "Mention periodic function.",
          "Use atomic number, not atomic mass.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States that properties are periodic functions of atomic number.",
        ),
        commonErrors: ["Using atomic mass instead of atomic number."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The physical and chemical properties of elements are periodic functions of their atomic numbers.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student says: "Mendeleev's table failed because it had gaps." Correct the statement using one strength and one limitation of Mendeleev's classification.`,
        difficulty: 3,
        skillTags: ["mendeleev_periodic_table", "claim_correction"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Give one strength of leaving gaps.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Give one real limitation of Mendeleev's table.",
            points: 2,
          },
        ],
        hints: [
          "Gaps can be useful if they predict something.",
          "Think of eka-elements.",
          "A limitation involved atomic-mass order and isotopes/anomalous pairs.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Explains that gaps helped predict undiscovered elements and their properties.",
            },
            {
              part: "b",
              points: 2,
              description:
                "States a genuine limitation such as anomalous pairs or no proper place for isotopes.",
            },
          ],
        },
        commonErrors: [
          "Calling gaps a defect without explaining their predictive value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The gaps were a strength because Mendeleev used periodic patterns to predict undiscovered elements and their properties.",
          },
          {
            part: "b",
            explanation:
              "A real limitation was that arrangement by atomic mass led to anomalous pairs and did not give a proper explanation for isotopes.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The elements X, Y and Z form a Dobereiner-type triad. Their atomic masses are $23$, $m$ and $39$.`,
        difficulty: 3,
        skillTags: ["dobereiner_triad", "calculation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the expected value of $m$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State why this calculation alone is not enough for modern periodic classification.",
            points: 2,
          },
        ],
        hints: [
          "Use the average of the first and third masses.",
          "Modern classification does not use atomic mass as the fundamental basis.",
          "Mention atomic number.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $m=31$." },
            {
              part: "b",
              points: 2,
              description:
                "Explains that modern classification depends on atomic number/electronic configuration.",
            },
          ],
        },
        commonErrors: ["Adding the two masses and giving 62."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For a triad, the middle mass is approximately the average of the other two: $m=(23+39)/2=31$.",
          },
          {
            part: "b",
            explanation:
              "Modern classification is based on atomic number, and electronic configuration explains periodicity. Atomic-mass averaging is only a historical pattern.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare Mendeleev's periodic law with the modern periodic law. Use the comparison to explain why the modern table handles anomalous mass pairs better.`,
        difficulty: 4,
        skillTags: ["periodic_law_comparison", "moseley"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State Mendeleev's periodic law.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the modern periodic law.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain the argon-potassium type anomaly using atomic number.",
            points: 3,
          },
        ],
        hints: [
          "The two laws differ in the property used for ordering.",
          "Mendeleev used atomic mass; the modern law uses atomic number.",
          "For Ar and K, compare $Z=18$ and $Z=19$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that properties are periodic functions of atomic masses.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States that properties are periodic functions of atomic numbers.",
            },
            {
              part: "c",
              points: 3,
              description:
                "Uses atomic number order to explain why Ar precedes K despite the mass anomaly.",
            },
          ],
        },
        commonErrors: [
          "Saying modern table ignores chemical properties entirely.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Mendeleev's law: properties of elements are periodic functions of their atomic masses.",
          },
          {
            part: "b",
            explanation:
              "Modern law: properties of elements are periodic functions of their atomic numbers.",
          },
          {
            part: "c",
            explanation:
              "Argon has a slightly greater atomic mass than potassium, but argon has $Z=18$ and potassium has $Z=19$. The modern table follows increasing atomic number, so Ar correctly comes before K.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A museum display compares three stages in periodic classification: Newlands arranged elements by increasing atomic mass and noticed repetition after every eighth element; Mendeleev arranged elements by atomic mass but left gaps; Moseley's work led to ordering by atomic number.`,
        difficulty: 4,
        skillTags: ["case_based", "history_to_modern_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which stage explains the modern basis of the periodic table?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Why were Mendeleev's gaps not merely empty spaces?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why was Newlands' octave pattern not sufficient as a final classification?",
            points: 2,
          },
        ],
        hints: [
          "Modern periodic law uses atomic number.",
          "Mendeleev used gaps predictively.",
          "A pattern that works only for some light elements cannot classify all elements.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies Moseley's stage.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains that gaps allowed prediction of undiscovered elements.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains limitation of Newlands' law of octaves for heavier/more numerous elements.",
            },
          ],
        },
        commonErrors: [
          "Treating every historical classification as equally modern.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Moseley's work led to the atomic-number basis of the modern periodic table.",
          },
          {
            part: "b",
            explanation:
              "Mendeleev left gaps where the pattern suggested an undiscovered element and predicted properties for such elements.",
          },
          {
            part: "c",
            explanation:
              "Newlands' octave pattern was a limited regularity and did not accommodate the growing number of elements, especially heavier elements, satisfactorily.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Present Periodic Table and IUPAC Nomenclature",
    subtopic:
      "Long-form table, periods, groups, blocks and temporary systematic names for elements with atomic number greater than 100",
    mc: [
      {
        questionLatex: L`In the long-form periodic table, the period number of an element is most directly related to`,
        difficulty: 2,
        skillTags: ["period_number", "electronic_configuration"],
        choices: [
          "the total number of neutrons",
          "the atomic mass rounded to the nearest integer",
          "the number of unpaired electrons only",
          "the highest principal quantum number occupied in its ground-state configuration",
        ],
        correctLetter: "D",
        rationales: {
          A: "Neutron number varies among isotopes and does not decide the period.",
          C: "Unpaired electrons may affect magnetism, not period number.",
          B: "Atomic mass does not directly fix period placement.",
        },
        hints: [
          "Period is connected with shells.",
          "Look for the highest occupied shell number.",
          "For sodium, $3s^1$ places it in period 3.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The period number equals the highest occupied principal shell in the ground-state configuration.",
          },
        ],
      },
      {
        questionLatex: L`The temporary IUPAC name for the element with atomic number $118$ is formed from the roots $1=$ un, $1=$ un and $8=$ oct. The temporary name is`,
        difficulty: 2,
        skillTags: ["iupac_temporary_nomenclature"],
        choices: ["ununquadium", "ununseptium", "ununoctium", "unbinoctium"],
        correctLetter: "C",
        rationales: {
          A: "Quad corresponds to 4, not 8.",
          B: "Sept corresponds to 7, not 8.",
          D: "Bi corresponds to 2, but the second digit is 1.",
        },
        hints: [
          "Write roots for digits 1, 1 and 8.",
          "Join the roots in order.",
          "Add the ending -ium.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The roots for 1, 1 and 8 are un, un and oct.",
            math: L`118\Rightarrow\text{un}+\text{un}+\text{oct}+\text{ium}`,
          },
          {
            step: 2,
            explanation: "The temporary name is ununoctium.",
          },
        ],
      },
      {
        questionLatex: L`Using the block layout shown, an element whose differentiating electron enters a $p$ orbital belongs to which region?`,
        difficulty: 2,
        skillTags: ["block_identification", "periodic_table_layout"],
        figure: periodicBlocksFigure,
        choices: ["s block", "f block", "d block", "p block"],
        correctLetter: "D",
        rationales: {
          A: "The s block is for elements whose differentiating electron enters an s orbital.",
          C: "The d block is for differentiating electrons entering d orbitals.",
          B: "The f block is for differentiating electrons entering f orbitals.",
        },
        hints: [
          "Block names come from the subshell receiving the differentiating electron.",
          "A p orbital corresponds to the p block.",
          "Use the right-hand block of the long-form table.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If the differentiating electron enters a p subshell, the element is a p-block element.",
          },
        ],
      },
      {
        questionLatex: L`The element with atomic number $115$ has the temporary systematic symbol`,
        difficulty: 3,
        skillTags: ["iupac_symbol", "nomenclature_digits"],
        choices: ["Uup", "Uuo", "Uus", "Ubp"],
        correctLetter: "A",
        rationales: {
          B: "Uuo corresponds to 118, not 115.",
          C: "The digit 5 uses pent, giving p, not sept.",
          D: "Bi corresponds to digit 2, not the second digit 1.",
        },
        hints: [
          "Use roots for 1, 1 and 5.",
          "The roots are un, un and pent.",
          "The symbol uses the first letters with the first capitalised.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For 115, the roots are un, un and pent.",
            math: L`115\Rightarrow\mathrm{Uup}`,
          },
          {
            step: 2,
            explanation: "The temporary systematic symbol is Uup.",
          },
        ],
      },
      {
        questionLatex: L`An element has outer electronic configuration $4s^2\,4p^5$. Its position is best described as`,
        difficulty: 3,
        skillTags: ["period_group_from_configuration", "p_block"],
        choices: [
          "period 4, group 17, p block",
          "period 5, group 4, d block",
          "period 4, group 2, s block",
          "period 3, group 17, p block",
        ],
        correctLetter: "A",
        rationales: {
          B: "The highest shell is 4, not period 5, and the differentiating subshell is p.",
          C: "The $p^5$ part is essential; it is not an s-block group 2 element.",
          D: "The highest principal quantum number is 4, not 3.",
        },
        hints: [
          "The highest principal quantum number gives the period.",
          "$p^5$ in the valence shell indicates group 17 for a p-block main-group element.",
          "The differentiating electron is in p.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The highest occupied shell is $n=4$, so the element is in period 4.",
          },
          {
            step: 2,
            explanation:
              "A valence configuration $ns^2np^5$ belongs to group 17 and p block.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`How many groups and periods are present in the modern long-form periodic table?`,
        difficulty: 1,
        skillTags: ["periodic_table_layout", "groups_periods"],
        parts: singlePart("a", "State the number of groups and periods.", 1),
        hints: [
          "Groups are vertical columns.",
          "Periods are horizontal rows.",
          "Use the long-form table numbering.",
        ],
        rubric: singleRubric("a", 1, "States 18 groups and 7 periods."),
        commonErrors: [
          "Counting only the main groups and ignoring d-block groups.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The modern long-form periodic table has 18 groups and 7 periods.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use temporary IUPAC nomenclature for elements with atomic number greater than $100$.`,
        difficulty: 3,
        skillTags: ["iupac_temporary_nomenclature"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the temporary name and symbol for atomic number $104$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the temporary name and symbol for atomic number $112$.",
            points: 2,
          },
        ],
        hints: [
          "Use digit roots: 0 nil, 1 un, 2 bi, 4 quad.",
          "Add -ium to the joined roots.",
          "The symbol uses the first letters, with only the first letter capitalised.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Gives unnilquadium, Unq.",
            },
            {
              part: "b",
              points: 2,
              description: "Gives ununbium, Uub.",
            },
          ],
        },
        commonErrors: [
          "Using modern permanent names instead of temporary systematic names.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$104$ gives roots un, nil, quad; the temporary name is unnilquadium and the symbol is Unq.",
          },
          {
            part: "b",
            explanation:
              "$112$ gives roots un, un, bi; the temporary name is ununbium and the symbol is Uub.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An element has electronic configuration $1s^2\,2s^2\,2p^6\,3s^2\,3p^3$.`,
        difficulty: 3,
        skillTags: ["period_group_from_configuration", "p_block"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find its period.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find its group and block.",
            points: 3,
          },
        ],
        hints: [
          "Look at the highest value of $n$.",
          "The valence shell is $3s^2 3p^3$.",
          "$ns^2np^3$ corresponds to group 15.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies period 3." },
            {
              part: "b",
              points: 3,
              description: "Identifies group 15 and p block with reasoning.",
            },
          ],
        },
        commonErrors: [
          "Counting all electrons in the configuration as the group number.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The highest principal quantum number is 3, so the element is in period 3.",
          },
          {
            part: "b",
            explanation:
              "The valence configuration is $3s^2 3p^3$, of the type $ns^2np^3$. Hence it is a p-block element in group 15.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A student has to place four elements in the long-form table: $Z=12$, $Z=17$, $Z=26$ and $Z=58$.`,
        difficulty: 4,
        skillTags: ["block_classification", "configuration_to_block"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Classify each element as s-, p-, d- or f-block.",
            points: 4,
          },
          {
            letter: "b",
            promptMarkdown:
              "Give the configuration feature used for the classification.",
            points: 1,
          },
        ],
        hints: [
          "Find where the differentiating electron enters.",
          "$Z=12$ ends in $s$, $Z=17$ ends in $p$, $Z=26$ involves $3d$, and $Z=58$ begins filling $4f$.",
          "The block name comes from the subshell receiving the differentiating electron.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 4,
              description:
                "Correctly classifies 12 as s, 17 as p, 26 as d and 58 as f.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States that block depends on the subshell into which the differentiating electron enters.",
            },
          ],
        },
        commonErrors: [
          "Classifying all transition-series elements only by outermost $s$ electrons.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$Z=12$ has outer configuration $3s^2$, so it is s block. $Z=17$ has $3s^2 3p^5$, so it is p block. $Z=26$ has differentiating electron in $3d$, so it is d block. $Z=58$ enters the $4f$ series, so it is f block.",
          },
          {
            part: "b",
            explanation:
              "The block is decided by the subshell into which the differentiating electron enters.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A worksheet lists these outer configurations: P: $5s^1$, Q: $4s^2\,4p^4$, R: $(n-1)d^5ns^1$, and S: $(n-2)f^1(n-1)d^1ns^2$.`,
        difficulty: 4,
        skillTags: ["case_based", "blocks_from_outer_configurations"],
        figure: periodicBlocksFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify the block for P and Q.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the block for R and S.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which one is a p-block element and what is its period?",
            points: 1,
          },
        ],
        hints: [
          "Use the subshell receiving the differentiating electron.",
          "$s^1$ is s block; $p^4$ is p block.",
          "The highest $n$ value gives the period for Q.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "P is s block and Q is p block.",
            },
            {
              part: "b",
              points: 2,
              description: "R is d block and S is f block.",
            },
            {
              part: "c",
              points: 1,
              description: "Q is p block and belongs to period 4.",
            },
          ],
        },
        commonErrors: [
          "Using only the last written subshell instead of the differentiating subshell pattern.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P ends in $5s^1$, so it is s block. Q has valence $4p^4$, so it is p block.",
          },
          {
            part: "b",
            explanation:
              "R has differentiating electron in d, so it is d block. S shows f-series filling, so it is f block.",
          },
          {
            part: "c",
            explanation:
              "Q is the p-block element. Its highest principal quantum number is 4, so it is in period 4.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Electronic Configuration and Types of Elements",
    subtopic:
      "Configuration-based placement, representative, transition, inner-transition and noble-gas elements",
    mc: [
      {
        questionLatex: L`An element has electronic configuration $[\mathrm{Ne}]\,3s^2\,3p^1$. It belongs to`,
        difficulty: 2,
        skillTags: ["configuration_to_group", "representative_elements"],
        choices: [
          "period 2, group 13",
          "period 4, group 3",
          "period 3, group 1",
          "period 3, group 13",
        ],
        correctLetter: "D",
        rationales: {
          A: "The highest occupied shell is $n=3$, not period 2.",
          C: "The valence configuration is $ns^2np^1$, not $ns^1$.",
          B: "There is no differentiating d electron here.",
        },
        hints: [
          "Find the highest occupied shell.",
          "Use the valence pattern $ns^2np^1$.",
          "For p-block elements, $ns^2np^1$ corresponds to group 13.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The highest principal quantum number is 3, so the period is 3.",
          },
          {
            step: 2,
            explanation: "$ns^2np^1$ is a group 13 p-block pattern.",
          },
        ],
      },
      {
        questionLatex: L`Which outer electronic configuration represents an alkaline earth metal?`,
        difficulty: 2,
        skillTags: ["s_block", "alkaline_earth_metals"],
        choices: [L`$ns^1$`, L`$(n-1)d^1ns^2$`, L`$ns^2np^5$`, L`$ns^2$`],
        correctLetter: "D",
        rationales: {
          A: "$ns^1$ represents alkali metals.",
          C: "$ns^2np^5$ represents halogens.",
          B: "This is a d-block transition pattern, not group 2.",
        },
        hints: [
          "Alkaline earth metals are group 2 elements.",
          "Group 2 has two valence s electrons.",
          "The general valence configuration is $ns^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Alkaline earth metals belong to group 2 and have valence configuration $ns^2$.",
          },
        ],
      },
      {
        questionLatex: L`The fourth period contains $18$ elements because, after $4s$ filling begins, electrons also enter`,
        difficulty: 3,
        skillTags: ["period_length", "subshell_filling"],
        choices: [
          "$4p$ before $3d$",
          "$5s$ before $3d$",
          "$4f$ before $4p$",
          "$3d$ before completion of $4p$",
        ],
        correctLetter: "D",
        rationales: {
          A: "$3d$ filling occurs before the period is completed by $4p$.",
          C: "$4f$ filling is not part of the fourth period.",
          B: "$5s$ starts the next period.",
        },
        hints: [
          "Period 4 includes K to Kr.",
          "After $4s$, the $3d$ subshell fills.",
          "Then $4p$ completes the period.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The fourth period includes filling of $4s$, $3d$ and $4p$ subshells.",
          },
          {
            step: 2,
            explanation: "This gives $2+10+6=18$ elements.",
            math: L`4s(2)+3d(10)+4p(6)=18`,
          },
        ],
      },
      {
        questionLatex: L`An element has configuration $[\mathrm{Ar}]\,3d^{10}\,4s^2\,4p^6$. It is best classified as`,
        difficulty: 3,
        skillTags: ["noble_gas_configuration", "p_block"],
        choices: [
          "a transition element",
          "a noble gas",
          "an alkali metal",
          "an inner-transition element",
        ],
        correctLetter: "B",
        rationales: {
          A: "Although $3d$ is filled, the outer shell is closed as $4s^24p^6$.",
          C: "Alkali metals have $ns^1$ valence configuration.",
          D: "Inner-transition elements involve f-subshell filling.",
        },
        hints: [
          "Look at the outermost shell.",
          "The valence shell is $4s^2 4p^6$.",
          "A filled valence shell indicates a noble gas.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The outer shell has $4s^2 4p^6$, a complete octet.",
          },
          {
            step: 2,
            explanation: "This is the configuration of a noble gas.",
          },
        ],
      },
      {
        questionLatex: L`A neutral atom has $Z=35$. Without writing the full configuration, its group and block are`,
        difficulty: 4,
        skillTags: ["configuration_inference", "halogen"],
        choices: [
          "group 2, s block",
          "group 17, p block",
          "group 18, p block",
          "group 7, d block",
        ],
        correctLetter: "B",
        rationales: {
          A: "Group 2 would have $ns^2$, but $Z=35$ is near the end of period 4.",
          C: "A noble gas in period 4 is $Z=36$, not 35.",
          D: "$Z=35$ is not a d-block group 7 element.",
        },
        hints: [
          "Locate $Z=35$ relative to krypton, $Z=36$.",
          "One electron short of a noble gas is a halogen pattern.",
          "Halogens are group 17 p-block elements.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$Z=35$ is one electron before krypton, so the valence pattern is $4s^2 4p^5$.",
          },
          {
            step: 2,
            explanation: "$ns^2np^5$ corresponds to group 17 and p block.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is meant by the differentiating electron in periodic classification?`,
        difficulty: 2,
        skillTags: ["differentiating_electron", "block_classification"],
        parts: singlePart("a", "Define differentiating electron.", 2),
        hints: [
          "Compare an element with the previous element.",
          "One electron is newly added.",
          "Its subshell helps decide the block.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Defines it as the electron added to distinguish an element from the preceding element, and links it to subshell/block.",
        ),
        commonErrors: [
          "Calling every valence electron a differentiating electron.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The differentiating electron is the electron added to the configuration of the preceding element. The subshell into which it enters helps decide the block of the element.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why $Z=19$ and $Z=20$ are placed in the s block although their differentiating electrons enter the fourth shell.`,
        difficulty: 3,
        skillTags: ["s_block", "configuration_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the outer configurations of $Z=19$ and $Z=20$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain their block placement.",
            points: 2,
          },
        ],
        hints: [
          "These elements start period 4.",
          "Their outer configurations are $4s^1$ and $4s^2$.",
          "Block is named from the subshell being filled.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Writes $4s^1$ and $4s^2$ outer configurations.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains that differentiating electrons enter an s subshell.",
            },
          ],
        },
        commonErrors: [
          "Assuming period 4 means d block for every element in period 4.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$Z=19$ has outer configuration $4s^1$ and $Z=20$ has outer configuration $4s^2$.",
          },
          {
            part: "b",
            explanation:
              "In both cases the differentiating electron enters the s subshell, so both elements are placed in the s block.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The outer configuration of an element is $3s^2\,3p^5$.`,
        difficulty: 3,
        skillTags: ["halogen_configuration", "period_group_block"],
        parts: [
          { letter: "a", promptMarkdown: "Find its period.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find its group and block.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State whether it is likely to be metallic or non-metallic.",
            points: 1,
          },
        ],
        hints: [
          "Highest $n$ gives period.",
          "$ns^2np^5$ is the halogen pattern.",
          "Halogens are non-metals.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Period 3." },
            { part: "b", points: 2, description: "Group 17 and p block." },
            { part: "c", points: 1, description: "Non-metallic." },
          ],
        },
        commonErrors: ["Calling it group 7 by counting only p electrons."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The highest principal quantum number is 3, so it belongs to period 3.",
          },
          {
            part: "b",
            explanation:
              "$3s^2 3p^5$ has the general form $ns^2np^5$, so it belongs to group 17 and p block.",
          },
          {
            part: "c",
            explanation: "Group 17 elements are halogens and are non-metallic.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`The elements of period 3 have atomic numbers $11$ to $18$. Show how their configurations explain the length of the period and the change from metallic to non-metallic character.`,
        difficulty: 5,
        skillTags: [
          "period_length",
          "configuration_trend",
          "metallic_character",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Explain why period 3 has eight elements.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the subshells filled across this period.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain the broad change in metallic character across the period.",
            points: 2,
          },
        ],
        hints: [
          "Period 3 fills $3s$ and $3p$ subshells.",
          "$3s$ holds 2 electrons and $3p$ holds 6 electrons.",
          "Across a period, effective nuclear charge increases.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Uses $2+6=8$ capacity." },
            { part: "b", points: 1, description: "Identifies $3s$ and $3p$." },
            {
              part: "c",
              points: 2,
              description:
                "Explains decreasing metallic character due to increased effective nuclear charge and reduced tendency to lose electrons.",
            },
          ],
        },
        commonErrors: ["Including $3d$ filling in period 3."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Period 3 has filling of $3s$ and $3p$ only. The $3s$ subshell holds 2 electrons and $3p$ holds 6, so the period has $2+6=8$ elements.",
          },
          {
            part: "b",
            explanation: "The subshells filled are $3s$ followed by $3p$.",
          },
          {
            part: "c",
            explanation:
              "From left to right, effective nuclear charge increases and atomic size generally decreases. Atoms hold valence electrons more strongly, so tendency to lose electrons decreases and metallic character decreases.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher gives four configurations: A: $2s^2\,2p^6$, B: $3s^1$, C: $3s^2\,3p^5$, and D: $3d^5\,4s^1$ as the characteristic outer parts of four elements.`,
        difficulty: 4,
        skillTags: ["case_based", "configuration_classification"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which configuration represents a noble gas?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which configurations represent s-block and p-block elements?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which configuration represents a d-block element and why?",
            points: 2,
          },
        ],
        hints: [
          "A noble gas has a filled valence shell.",
          "$3s^1$ is s block; $3p^5$ is p block.",
          "$3d^5 4s^1$ includes differentiating d-subshell filling.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "A is noble gas." },
            {
              part: "b",
              points: 2,
              description: "B is s block and C is p block.",
            },
            {
              part: "c",
              points: 2,
              description:
                "D is d block because the differentiating electron enters/fills d subshell.",
            },
          ],
        },
        commonErrors: [
          "Classifying D as s block only because $4s^1$ is written last.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A has a filled $2s^2 2p^6$ shell, so it represents a noble gas.",
          },
          {
            part: "b",
            explanation:
              "B with $3s^1$ is an s-block element. C with $3s^2 3p^5$ is a p-block element.",
          },
          {
            part: "c",
            explanation:
              "D represents a d-block element because the configuration involves occupancy of the d subshell, characteristic of transition elements.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Atomic and Ionic Radii",
    subtopic:
      "Atomic radius, covalent and van der Waals ideas, ionic radius, cation/anion size and isoelectronic series",
    mc: [
      {
        questionLatex: L`Among $\mathrm{Na}$, $\mathrm{Mg}$ and $\mathrm{Al}$, the largest atomic radius is expected for`,
        difficulty: 2,
        skillTags: ["atomic_radius_trend", "periodic_trends"],
        choices: [
          L`$\mathrm{Na}$`,
          L`$\mathrm{Mg}$`,
          L`$\mathrm{Al}$`,
          "all are equal",
        ],
        correctLetter: "A",
        rationales: {
          B: "Across a period, radius generally decreases from left to right.",
          C: "Aluminium is farther right in period 3, so it is smaller than sodium.",
          D: "Atomic radii are not equal across a period.",
        },
        hints: [
          "All three are in period 3.",
          "Across a period, effective nuclear charge increases.",
          "Atomic radius decreases from left to right.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Na, Mg and Al are in the same period and radius decreases across the period.",
          },
          {
            step: 2,
            explanation:
              "Sodium is farthest left, so it has the largest radius.",
          },
        ],
      },
      {
        questionLatex: L`In the isoelectronic series $\mathrm{O^{2-}}$, $\mathrm{F^-}$, $\mathrm{Na^+}$, $\mathrm{Mg^{2+}}$, the largest ion is`,
        difficulty: 3,
        skillTags: ["isoelectronic_series", "ionic_radius"],
        choices: [
          L`$\mathrm{O^{2-}}$`,
          L`$\mathrm{F^-}$`,
          L`$\mathrm{Na^+}$`,
          L`$\mathrm{Mg^{2+}}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "$\\mathrm{F^-}$ has more protons than $\\mathrm{O^{2-}}$ for the same 10 electrons, so it is smaller.",
          C: "$\\mathrm{Na^+}$ has still greater nuclear charge for 10 electrons.",
          D: "$\\mathrm{Mg^{2+}}$ has the greatest nuclear charge among these 10-electron ions, so it is smallest.",
        },
        hints: [
          "All four ions have 10 electrons.",
          "In an isoelectronic series, greater nuclear charge pulls electrons closer.",
          "The ion with the smallest atomic number is largest.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "All the ions have 10 electrons, so compare nuclear charge.",
          },
          {
            step: 2,
            explanation:
              "Oxygen has the smallest nuclear charge among the series, so $\\mathrm{O^{2-}}$ is largest.",
          },
        ],
      },
      {
        questionLatex: L`A cation is smaller than its parent atom mainly because`,
        difficulty: 2,
        skillTags: ["cation_radius", "ionic_radius"],
        choices: [
          "it has gained electrons into a new shell",
          "it has fewer electrons and often loses the outermost shell",
          "its number of protons decreases",
          "its nucleus becomes neutral",
        ],
        correctLetter: "B",
        rationales: {
          A: "Gaining electrons describes anion formation, not cation formation.",
          C: "Ion formation does not change the number of protons.",
          D: "The nucleus remains positively charged.",
        },
        hints: [
          "A cation is formed by loss of electrons.",
          "Loss can reduce repulsion and sometimes remove the valence shell.",
          "Proton number remains unchanged.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Cations are formed by electron loss. Fewer electrons experience attraction from the same nuclear charge.",
          },
          {
            step: 2,
            explanation:
              "For many main-group cations, the outermost shell is also lost, making the ion much smaller.",
          },
        ],
      },
      {
        questionLatex: L`Using the positions in the figure, which comparison of atomic radius is most reasonable?`,
        difficulty: 3,
        skillTags: ["atomic_radius_from_position", "periodic_table_position"],
        figure: periodicPositionsFigure,
        choices: [
          "$C>A$ because radius increases down a group",
          "$B>A$ because radius increases across a period",
          "$D<C$ because radius always decreases down a group",
          "$B>D$ because radius increases upward in a group",
        ],
        correctLetter: "A",
        rationales: {
          B: "Across a period, atomic radius generally decreases from left to right.",
          C: "Down a group, atomic radius increases, not decreases.",
          D: "Up a group, radius decreases; $D$ is below $B$ and should be larger than $B$ within that group trend.",
        },
        hints: [
          "A and C are in the same group.",
          "C is below A.",
          "Atomic radius increases down a group.",
        ],
        solution: [
          {
            step: 1,
            explanation: "A and C lie in the same group, with C below A.",
          },
          {
            step: 2,
            explanation: "Atomic radius increases down a group, so $C>A$.",
          },
        ],
      },
      {
        questionLatex: L`Which radius is generally measured for noble gases in simple periodic-trend comparisons?`,
        difficulty: 3,
        skillTags: ["noble_gas_radius", "van_der_waals_radius"],
        choices: [
          "covalent radius",
          "metallic radius",
          "van der Waals radius",
          "ionic radius of the common cation",
        ],
        correctLetter: "C",
        rationales: {
          A: "Noble gases rarely form ordinary covalent bonds, so covalent radius is not generally used.",
          B: "Noble gases are not metals.",
          D: "Noble gases do not commonly form simple cations for routine trend comparison.",
        },
        hints: [
          "Noble gases are monoatomic and generally non-bonding.",
          "The relevant distance is between non-bonded atoms.",
          "That radius is van der Waals radius.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For noble gases, van der Waals radius is generally used because they do not ordinarily form covalent bonds.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Arrange $\mathrm{Be}$, $\mathrm{Mg}$ and $\mathrm{Ca}$ in increasing order of atomic radius.`,
        difficulty: 2,
        skillTags: ["atomic_radius_down_group"],
        parts: singlePart("a", "Write the increasing order.", 2),
        hints: [
          "All three are in group 2.",
          "Atomic radius increases down a group.",
          "Smallest first means top to bottom.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Gives $\\mathrm{Be}<\\mathrm{Mg}<\\mathrm{Ca}$.",
        ),
        commonErrors: [
          "Reversing the order by thinking nuclear charge alone decides size.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Down group 2, new shells are added and atomic radius increases. Hence the increasing order is $\\mathrm{Be}<\\mathrm{Mg}<\\mathrm{Ca}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Compare the sizes of $\mathrm{Na}$, $\mathrm{Na^+}$ and $\mathrm{Cl^-}$.`,
        difficulty: 3,
        skillTags: ["ionic_radius", "cation_anion_radius"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Explain why $\\mathrm{Na^+}$ is smaller than $\\mathrm{Na}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why $\\mathrm{Cl^-}$ is larger than $\\mathrm{Cl}$.",
            points: 2,
          },
        ],
        hints: [
          "Cations form by losing electrons.",
          "Anions form by gaining electrons.",
          "Think about electron-electron repulsion and shell occupancy.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Explains electron loss/shell loss and stronger pull per electron for sodium cation.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains electron gain and increased repulsion for chloride ion.",
            },
          ],
        },
        commonErrors: [
          "Saying ion size changes because protons are gained or lost.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{Na^+}$ is formed by loss of the $3s$ electron, so the ion has the neon shell as its outer shell. It is therefore much smaller than neutral sodium.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{Cl^-}$ is formed by adding an electron to chlorine. Increased electron-electron repulsion makes the anion larger than the neutral atom.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Arrange $\mathrm{N^{3-}}$, $\mathrm{O^{2-}}$, $\mathrm{F^-}$, $\mathrm{Na^+}$ and $\mathrm{Mg^{2+}}$ in decreasing order of ionic radius.`,
        difficulty: 4,
        skillTags: ["isoelectronic_series", "ionic_radius_order"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Show that the species are isoelectronic.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write the decreasing radius order.",
            points: 3,
          },
        ],
        hints: [
          "Count electrons in each ion.",
          "All have 10 electrons.",
          "For the same electron count, smaller nuclear charge gives larger radius.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Shows each species has 10 electrons.",
            },
            {
              part: "b",
              points: 3,
              description:
                "Gives $\\mathrm{N^{3-}}>\\mathrm{O^{2-}}>\\mathrm{F^-}>\\mathrm{Na^+}>\\mathrm{Mg^{2+}}$.",
            },
          ],
        },
        commonErrors: [
          "Putting cations first because their positive charge looks larger.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{N^{3-}}$, $\\mathrm{O^{2-}}$, $\\mathrm{F^-}$, $\\mathrm{Na^+}$ and $\\mathrm{Mg^{2+}}$ each have 10 electrons.",
          },
          {
            part: "b",
            explanation:
              "In an isoelectronic series, radius decreases as nuclear charge increases. The decreasing order is $\\mathrm{N^{3-}}>\\mathrm{O^{2-}}>\\mathrm{F^-}>\\mathrm{Na^+}>\\mathrm{Mg^{2+}}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use periodic trends to compare the atomic radii of elements A, B, C and D in the figure.`,
        difficulty: 4,
        skillTags: ["figure_based_trend", "atomic_radius"],
        figure: periodicPositionsFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Compare A and B with reason.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Compare A and C with reason.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Between C and D, which is expected to have smaller atomic radius?",
            points: 1,
          },
        ],
        hints: [
          "Across a period, radius decreases from left to right.",
          "Down a group, radius increases.",
          "C and D are in the same period.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "States $A>B$ with across-period reason.",
            },
            {
              part: "b",
              points: 2,
              description: "States $C>A$ with down-group reason.",
            },
            { part: "c", points: 1, description: "D is smaller than C." },
          ],
        },
        commonErrors: [
          "Using only atomic number without considering shells and position.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A and B are in the same period, with B to the right. Atomic radius decreases from left to right, so $A>B$.",
          },
          {
            part: "b",
            explanation:
              "A and C are in the same group, with C below A. Atomic radius increases down a group, so $C>A$.",
          },
          {
            part: "c",
            explanation:
              "C and D are in the same period, and D is to the right, so D has the smaller atomic radius.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares the radii of three species of the same element: $X$, $X^+$ and $X^-$. The student claims that the order must be $X^+>X>X^-$ because positive charge means bigger size.`,
        difficulty: 4,
        skillTags: ["case_based", "ionic_radius_misconception"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Correct the order of size.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain the small size of $X^+$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the large size of $X^-$.",
            points: 1,
          },
        ],
        hints: [
          "Cation means electron loss.",
          "Anion means electron gain.",
          "Compare repulsion and effective pull per electron.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Gives $X^- > X > X^+$." },
            {
              part: "b",
              points: 2,
              description:
                "Explains electron loss and stronger nuclear attraction per electron.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains increased repulsion after electron gain.",
            },
          ],
        },
        commonErrors: [
          "Interpreting plus and minus signs as direct size signs.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For the same element, the usual size order is $X^- > X > X^+$.",
          },
          {
            part: "b",
            explanation:
              "$X^+$ has lost an electron, so electron-electron repulsion decreases and the remaining electrons are pulled more strongly by the same nucleus. It may also lose the outer shell.",
          },
          {
            part: "c",
            explanation:
              "$X^-$ has gained an electron, so repulsion among electrons increases and the anion becomes larger.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Ionisation, Electron Gain and Electronegativity Trends",
    subtopic:
      "Ionisation enthalpy, electron gain enthalpy, electronegativity, valency, metallic character and oxide character",
    mc: [
      {
        questionLatex: L`Among $\mathrm{B}$, $\mathrm{C}$, $\mathrm{N}$ and $\mathrm{O}$, the element with unusually high first ionisation enthalpy due to a half-filled $2p$ subshell is`,
        difficulty: 4,
        skillTags: ["ionisation_enthalpy_exception", "half_filled_subshell"],
        choices: [
          L`$\mathrm{B}$`,
          L`$\mathrm{C}$`,
          L`$\mathrm{N}$`,
          L`$\mathrm{O}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Boron has $2p^1$, not a half-filled $2p$ subshell.",
          B: "Carbon has $2p^2$, not half-filled $2p^3$.",
          D: "Oxygen has paired electrons in $2p$, making removal easier than from nitrogen.",
        },
        hints: [
          "A p subshell has three orbitals.",
          "Half-filled p means $p^3$.",
          "Nitrogen has $2p^3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "A half-filled $2p$ subshell is $2p^3$.",
          },
          {
            step: 2,
            explanation:
              "Nitrogen has $1s^2 2s^2 2p^3$, so it has unusually high first ionisation enthalpy.",
          },
        ],
      },
      {
        questionLatex: L`The large jump in the ionisation enthalpy chart shown suggests that the element most likely belongs to`,
        difficulty: 4,
        skillTags: ["successive_ionisation_enthalpy", "valence_electrons"],
        figure: ionizationJumpFigure,
        choices: ["group 1", "group 2", "group 13", "group 17"],
        correctLetter: "B",
        rationales: {
          A: "A group 1 element would show a large jump after the first ionisation enthalpy.",
          C: "A group 13 element would show the large jump after removal of three valence electrons.",
          D: "A group 17 element would not show a large jump after only two electrons.",
        },
        hints: [
          "Find after how many electrons the large jump appears.",
          "The first two removals are relatively low; the third is much higher.",
          "The number before the jump gives the number of valence electrons.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The large jump occurs after the second ionisation enthalpy.",
          },
          {
            step: 2,
            explanation:
              "This means two valence electrons were removed before reaching an inner shell, so the element is likely in group 2.",
          },
        ],
      },
      {
        questionLatex: L`Which statement about electron gain enthalpy is most accurate for halogens?`,
        difficulty: 3,
        skillTags: ["electron_gain_enthalpy", "halogen_trend"],
        choices: [
          "Fluorine has the most negative electron gain enthalpy because it is smallest.",
          "Chlorine is more negative than fluorine because the incoming electron suffers less repulsion in the larger $3p$ shell.",
          "All halogens have positive electron gain enthalpy.",
          "Electron gain enthalpy is unrelated to atomic size.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Fluorine is very small, but the incoming electron experiences greater repulsion in compact $2p$ orbitals.",
          C: "Halogens generally release energy on gaining an electron.",
          D: "Size and electron-electron repulsion strongly affect electron gain enthalpy.",
        },
        hints: [
          "The trend has an important F vs Cl exception.",
          "Very small size can increase electron-electron repulsion.",
          "Chlorine's $3p$ shell accommodates the incoming electron with less repulsion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Fluorine is very small, so an incoming electron enters a compact shell with strong repulsion.",
          },
          {
            step: 2,
            explanation:
              "Chlorine has a larger $3p$ shell, so electron gain is more exothermic than for fluorine.",
          },
        ],
      },
      {
        questionLatex: L`Across period 3 from $\mathrm{Na}$ to $\mathrm{Cl}$, the general change in oxide character is`,
        difficulty: 3,
        skillTags: ["oxide_character", "metallic_nonmetallic_trend"],
        choices: [
          "strongly acidic to strongly basic",
          "basic to amphoteric/weakly acidic to acidic",
          "neutral to metallic only",
          "no systematic change",
        ],
        correctLetter: "B",
        rationales: {
          A: "The left side of period 3 contains metals whose oxides are basic.",
          C: "Oxides across the period show a range from basic through amphoteric/acidic, not only neutral or metallic.",
          D: "There is a systematic trend as metallic character decreases.",
        },
        hints: [
          "Metallic character decreases across a period.",
          "Metal oxides tend to be basic.",
          "Non-metal oxides tend to be acidic.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Across period 3, metallic character decreases and non-metallic character increases.",
          },
          {
            step: 2,
            explanation:
              "Therefore oxide character changes from basic to amphoteric/weakly acidic and then acidic.",
          },
        ],
      },
      {
        questionLatex: L`Using the positions in the figure, which element is expected to have the highest electronegativity?`,
        difficulty: 3,
        skillTags: ["electronegativity_trend", "figure_based_trend"],
        figure: periodicPositionsFigure,
        choices: ["A", "B", "C", "D"],
        correctLetter: "B",
        rationales: {
          A: "A is farther left; electronegativity generally increases across a period.",
          C: "C is down and left, where metallic character is greater.",
          D: "D is below B in the same group, and electronegativity decreases down a group.",
        },
        hints: [
          "Electronegativity increases from left to right across a period.",
          "It decreases down a group.",
          "Top-right non-noble-gas positions are highest.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Electronegativity increases across a period and decreases down a group.",
          },
          {
            step: 2,
            explanation:
              "B is above D and to the right of A, so B is expected to be highest among the labelled elements.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Why is the first ionisation enthalpy of $\mathrm{Be}$ greater than that of $\mathrm{B}$ even though B comes after Be in the same period?`,
        difficulty: 3,
        skillTags: ["ionisation_exception", "subshell_stability"],
        parts: singlePart("a", "Give the reason.", 2),
        hints: [
          "Write the outer configurations.",
          "Be has $2s^2$; B has $2s^2 2p^1$.",
          "Removing a $2p$ electron is easier than removing a paired $2s$ electron from a filled s subshell.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Explains filled $2s^2$ stability in Be and easier removal of B's $2p$ electron.",
        ),
        commonErrors: [
          "Applying only the left-to-right increase without checking subshells.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Be has the stable outer configuration $2s^2$, while B has $2s^2 2p^1$. The first electron removed from B is a $2p$ electron, which is easier to remove than a $2s$ electron from Be's filled s subshell.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The successive ionisation enthalpies of an element show the pattern in the figure.`,
        difficulty: 4,
        skillTags: ["successive_ionisation_enthalpy", "group_inference"],
        figure: ionizationJumpFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "How many valence electrons does the element most probably have?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Predict its group in the main-group table.",
            points: 2,
          },
        ],
        hints: [
          "Look for the first large jump.",
          "The large jump means the next electron is from an inner shell.",
          "The number of electrons removed before the jump is the valence count.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Identifies two valence electrons from the jump after IE2.",
            },
            { part: "b", points: 2, description: "Predicts group 2." },
          ],
        },
        commonErrors: [
          "Counting the tall bar itself as a valence electron removed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The first very large increase is from IE2 to IE3. That means two electrons can be removed before reaching an inner shell, so the element has 2 valence electrons.",
          },
          {
            part: "b",
            explanation:
              "A main-group element with 2 valence electrons belongs to group 2.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Arrange $\mathrm{F}$, $\mathrm{Cl}$, $\mathrm{Br}$ and $\mathrm{I}$ in decreasing order of electronegativity. Give the reason.`,
        difficulty: 3,
        skillTags: ["electronegativity_down_group", "halogens"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the order.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Give the reason.",
            points: 2,
          },
        ],
        hints: [
          "These are group 17 elements.",
          "Electronegativity decreases down a group.",
          "Fluorine is the most electronegative.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Gives $\\mathrm{F}>\\mathrm{Cl}>\\mathrm{Br}>\\mathrm{I}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains increasing size and decreasing effective attraction for bonding electrons down the group.",
            },
          ],
        },
        commonErrors: [
          "Reversing the order because atomic radius increases down the group.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The decreasing electronegativity order is $\\mathrm{F}>\\mathrm{Cl}>\\mathrm{Br}>\\mathrm{I}$.",
          },
          {
            part: "b",
            explanation:
              "Down a group, atomic size increases and attraction for a shared electron pair decreases, so electronegativity decreases.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Explain the following periodic trends across period 3 from sodium to chlorine.`,
        difficulty: 5,
        skillTags: ["periodic_trends_synthesis", "period_3"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Atomic radius generally decreases.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "First ionisation enthalpy generally increases.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Metallic character decreases.",
            points: 1,
          },
        ],
        hints: [
          "Across a period, electrons enter the same shell.",
          "Nuclear charge increases.",
          "Greater effective nuclear charge affects size, electron removal and metallic character.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Explains increased effective nuclear charge pulling same-shell electrons closer.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains stronger attraction makes electron removal harder, with general trend language.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Links decreasing tendency to lose electrons with lower metallic character.",
            },
          ],
        },
        commonErrors: [
          "Using atomic number alone without mentioning same shell/effective nuclear charge.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Across period 3, electrons are added to the same shell while nuclear charge increases. The effective pull on valence electrons increases, so atomic radius generally decreases.",
          },
          {
            part: "b",
            explanation:
              "Because valence electrons are held more strongly, more energy is generally needed to remove the first electron, so first ionisation enthalpy generally increases.",
          },
          {
            part: "c",
            explanation:
              "Metallic character depends on ease of losing electrons. Since electron loss becomes harder across the period, metallic character decreases.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares three period-3 oxides: $\mathrm{Na_2O}$, $\mathrm{Al_2O_3}$ and $\mathrm{SO_3}$. The student says all oxides in a period must have the same acid-base character because they are in the same row.`,
        difficulty: 4,
        skillTags: ["case_based", "oxide_character", "periodic_trends"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Classify $\\mathrm{Na_2O}$ as basic, acidic or amphoteric.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Classify $\\mathrm{Al_2O_3}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Classify $\\mathrm{SO_3}$ and correct the student's reasoning.",
            points: 3,
          },
        ],
        hints: [
          "Metal oxides are generally basic.",
          "Aluminium oxide is amphoteric.",
          "Non-metal oxides are generally acidic; oxide character changes across a period.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "$\\mathrm{Na_2O}$ is basic.",
            },
            {
              part: "b",
              points: 1,
              description: "$\\mathrm{Al_2O_3}$ is amphoteric.",
            },
            {
              part: "c",
              points: 3,
              description:
                "States $\\mathrm{SO_3}$ is acidic and explains oxide character changes as metallic character decreases across the period.",
            },
          ],
        },
        commonErrors: [
          "Assuming same period means identical chemical character.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\mathrm{Na_2O}$ is a metal oxide and is basic.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{Al_2O_3}$ is amphoteric.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{SO_3}$ is a non-metal oxide and is acidic. The student's reasoning is wrong because properties change systematically across a period: metallic character decreases and non-metallic character increases.",
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
        description: `Correctly completes part ${part.letter} using periodic position, configuration, or trend reasoning.`,
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
  "3.1": {
    mc: [
      extraMc(
        L`Modern periodic law arranges elements primarily according to`,
        ["atomic mass", "atomic number", "neutron number", "physical state"],
        "B",
        {
          A: "Mendeleev used atomic mass, but modern periodic law uses atomic number.",
          C: "Neutron number can vary among isotopes.",
          D: "Physical state is not the basis of periodicity.",
        },
        [
          "Recall Moseley's contribution.",
          "Atomic number equals nuclear charge.",
          "Properties are periodic functions of atomic number.",
        ],
        "Modern periodic law states that properties of elements are periodic functions of their atomic numbers.",
        ["modern_periodic_law"],
      ),
      extraMc(
        L`The main reason Newlands' law of octaves failed for heavier elements was that`,
        [
          "all elements were gases",
          "the periodic repetition did not continue reliably beyond calcium",
          "atomic numbers were already known",
          "noble gases had full octets",
        ],
        "B",
        {
          A: "The elements were not all gases.",
          C: "Atomic number was not the basis of Newlands' arrangement.",
          D: "Noble gases were not the reason for the failure.",
        },
        [
          "Newlands arranged by increasing atomic mass.",
          "The octave pattern worked only for lighter elements.",
          "It broke down for heavier elements.",
        ],
        "Newlands' octave relation was too simple and did not hold properly for elements beyond calcium.",
        ["newlands_law"],
      ),
      extraMc(
        L`Mendeleev left gaps in his periodic table mainly because he`,
        [
          "forgot to list known elements",
          "predicted undiscovered elements with suitable properties",
          "arranged elements alphabetically",
          "used only physical state",
        ],
        "B",
        {
          A: "The gaps were intentional.",
          C: "Alphabetical order was not used.",
          D: "Chemical properties and masses guided the table.",
        },
        [
          "Mendeleev compared properties.",
          "He prioritized similar elements in groups.",
          "Gaps allowed undiscovered elements.",
        ],
        "Mendeleev left gaps for elements not yet discovered and predicted their properties.",
        ["mendeleev_table"],
      ),
      extraMc(
        L`The pair Ar and K was difficult for atomic-mass ordering because`,
        [
          "argon has lower atomic mass than potassium",
          "argon has greater atomic mass but comes before potassium by atomic number",
          "both have the same atomic number",
          "potassium is a noble gas",
        ],
        "B",
        {
          A: "Argon's atomic mass is slightly greater than potassium's.",
          C: "They have different atomic numbers.",
          D: "Potassium is an alkali metal.",
        },
        [
          "Compare the historical mass anomaly.",
          "Modern order uses atomic number.",
          "Ar has $Z=18$ and K has $Z=19$.",
        ],
        "Argon's mass is greater, but its atomic number is lower, so modern ordering places Ar before K.",
        ["atomic_number_basis"],
      ),
      extraMc(
        L`The most important improvement of the modern periodic table over Mendeleev's table is that it`,
        [
          "uses increasing atomic number",
          "ignores electronic configuration",
          "places all isotopes in separate groups",
          "has no relation to chemical properties",
        ],
        "A",
        {
          B: "Electronic configuration explains periodicity in the modern table.",
          C: "Isotopes occupy the same position because they have same atomic number.",
          D: "The table is built to reflect recurring properties.",
        },
        [
          "Modern table uses nuclear charge.",
          "Isotopes have same atomic number.",
          "Electronic configuration repeats periodically.",
        ],
        "Using atomic number resolves isotope placement and several mass-order anomalies.",
        ["modern_table"],
      ),
    ],
    constructed: [
      extraFrq(
        "vsaq",
        L`State modern periodic law.`,
        1,
        ["modern_periodic_law"],
        singlePart("a", "Write the law.", 2),
        [
          "Use atomic number.",
          "Mention periodic function.",
          "Refer to properties of elements.",
        ],
        [
          {
            part: "a",
            explanation:
              "Modern periodic law states that the physical and chemical properties of elements are periodic functions of their atomic numbers.",
          },
        ],
        ["Writing atomic mass instead of atomic number."],
      ),
      extraFrq(
        "saq",
        L`Explain why isotopes of chlorine occupy the same position in the modern periodic table.`,
        3,
        ["isotopes", "modern_periodic_law"],
        [
          {
            letter: "a",
            promptMarkdown: "State what is same for isotopes.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Connect this to modern periodic law.",
            points: 2,
          },
        ],
        [
          "Isotopes differ in mass number.",
          "They have the same atomic number.",
          "Modern table is based on atomic number.",
        ],
        [
          {
            part: "a",
            explanation:
              "Chlorine isotopes have the same number of protons and hence the same atomic number.",
          },
          {
            part: "b",
            explanation:
              "Since modern periodic table is arranged by atomic number, they occupy the same position.",
          },
        ],
        ["Using mass number as the modern-table basis."],
      ),
      extraFrq(
        "saq",
        L`Give two merits of Mendeleev's periodic table.`,
        2,
        ["mendeleev_table"],
        [
          { letter: "a", promptMarkdown: "State one merit.", points: 2 },
          { letter: "b", promptMarkdown: "State another merit.", points: 2 },
        ],
        [
          "Think about gaps.",
          "Think about prediction of properties.",
          "Think about correction of atomic masses.",
        ],
        [
          {
            part: "a",
            explanation:
              "Mendeleev left gaps and predicted properties of undiscovered elements.",
          },
          {
            part: "b",
            explanation:
              "His table helped correct atomic masses of some elements by comparing group properties.",
          },
        ],
        ["Only giving limitations when merits are asked."],
      ),
      extraFrq(
        "laq",
        L`Compare Newlands' law of octaves and modern periodic law.`,
        4,
        ["periodic_law_comparison"],
        [
          {
            letter: "a",
            promptMarkdown: "State the basis of Newlands' arrangement.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State its major limitation.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the basis of modern periodic law.",
            points: 2,
          },
        ],
        [
          "Newlands used increasing atomic mass.",
          "The octave pattern failed for heavier elements.",
          "Modern law uses atomic number.",
        ],
        [
          {
            part: "a",
            explanation:
              "Newlands arranged elements in increasing atomic mass.",
          },
          {
            part: "b",
            explanation:
              "The repetition of properties after every eighth element worked only for lighter elements and failed for many heavier ones.",
          },
          {
            part: "c",
            explanation:
              "Modern periodic law uses atomic number as the fundamental basis.",
          },
        ],
        ["Saying both laws use the same basis."],
      ),
      extraFrq(
        "case",
        L`A student arranges elements strictly by atomic mass and places K before Ar. Another student arranges by atomic number and places Ar before K.`,
        4,
        ["case_based", "atomic_number_basis"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Which arrangement agrees with the modern periodic table?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give atomic-number reason.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Why can atomic mass order mislead here?",
            points: 2,
          },
        ],
        [
          "Modern periodic table uses atomic number.",
          "Ar has $Z=18$ and K has $Z=19$.",
          "Atomic masses do not perfectly increase in this pair.",
        ],
        [
          {
            part: "a",
            explanation:
              "The second arrangement agrees with the modern periodic table.",
          },
          {
            part: "b",
            explanation:
              "Argon has atomic number $18$ and potassium has atomic number $19$, so Ar comes first.",
          },
          {
            part: "c",
            explanation:
              "Argon's relative atomic mass is slightly greater than potassium's, so strict mass order gives the wrong chemical placement.",
          },
        ],
        ["Choosing order only from approximate atomic masses."],
      ),
    ],
  },
  "3.2": {
    mc: [
      extraMc(
        L`An element with valence configuration $ns^2np^5$ belongs to`,
        ["group 1", "group 2", "group 17", "group 18"],
        "C",
        {
          A: "Group 1 has $ns^1$.",
          B: "Group 2 has $ns^2$ only.",
          D: "Group 18 usually has $ns^2np^6$ except helium.",
        },
        [
          "Count valence electrons.",
          "$ns^2np^5$ has seven valence electrons.",
          "Halogens are group 17.",
        ],
        "The configuration $ns^2np^5$ corresponds to group 17.",
        ["group_number", "p_block"],
      ),
      extraMc(
        L`The element with outer configuration $4s^2$ is in`,
        ["period 2", "period 3", "period 4", "period 18"],
        "C",
        {
          A: "The highest principal quantum number is not 2.",
          B: "The highest principal quantum number is not 3.",
          D: "18 is a group number, not period here.",
        },
        [
          "Period number equals highest occupied shell number for main-group elements.",
          "The outer shell is $n=4$.",
          "So the period is 4.",
        ],
        "Highest occupied shell is $n=4$, so the element is in period 4.",
        ["period_number"],
      ),
      extraMc(
        L`The $d$-block elements are mainly found in groups`,
        ["1 and 2", "3 to 12", "13 to 18", "only 18"],
        "B",
        {
          A: "Groups 1 and 2 are $s$-block.",
          C: "Groups 13 to 18 are mostly $p$-block.",
          D: "Group 18 contains noble gases.",
        },
        [
          "Locate transition elements.",
          "They involve filling of $(n-1)d$ subshell.",
          "These occupy groups 3 to 12.",
        ],
        "$d$-block elements occupy the central groups 3 to 12.",
        ["blocks_periodic_table"],
      ),
      extraMc(
        L`In long-form periodic table, the period number is most directly related to`,
        [
          "number of valence electrons only",
          "highest principal quantum number occupied",
          "number of neutrons",
          "atomic mass rounded off",
        ],
        "B",
        {
          A: "Valence electron count helps group placement for main-group elements.",
          C: "Neutron number is not the period basis.",
          D: "Atomic mass is not the modern period basis.",
        },
        [
          "Electronic configuration explains placement.",
          "Period tells outermost shell.",
          "Highest $n$ gives period.",
        ],
        "Period number corresponds to the highest occupied principal shell.",
        ["periodic_table_position"],
      ),
      extraMc(
        L`The general valence-shell configuration of group 2 elements is`,
        [L`$ns^1$`, L`$ns^2$`, L`$ns^2np^1$`, L`$ns^2np^6$`],
        "B",
        {
          A: "This is group 1.",
          C: "This is group 13.",
          D: "This is group 18 except helium.",
        },
        [
          "Group 2 elements are alkaline earth metals.",
          "They have two $s$ electrons in the valence shell.",
          "Use $ns^2$.",
        ],
        "Group 2 elements have valence-shell configuration $ns^2$.",
        ["group_configuration"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Two elements X and Y have valence-shell configurations $3s^2 3p^2$ and $3s^2 3p^6$ respectively.`,
        3,
        ["periodic_position"],
        [
          {
            letter: "a",
            promptMarkdown: "State the common period of X and Y.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the groups of X and Y.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which of the two is a noble gas type element? Give the reason.",
            points: 1,
          },
        ],
        [
          "The highest principal quantum number is 3 for both.",
          "$ns^2np^2$ and $ns^2np^6$ represent different p-block groups.",
          "A filled p subshell gives a noble gas type configuration.",
        ],
        [
          {
            part: "a",
            explanation:
              "Both configurations have highest occupied shell $n=3$, so both are in period 3.",
          },
          {
            part: "b",
            explanation:
              "X has four valence electrons, so it is in group 14. Y has eight valence electrons, so it is in group 18.",
          },
          {
            part: "c",
            explanation:
              "Y is noble-gas type because $3s^2 3p^6$ is a complete valence shell.",
          },
        ],
        [
          "Treating both p-block configurations as belonging to the same group.",
        ],
      ),
      extraFrq(
        "vsaq",
        L`Which block contains elements in which the differentiating electron enters an $f$ orbital?`,
        1,
        ["blocks_periodic_table"],
        singlePart("a", "Name the block.", 2),
        [
          "Block name follows the subshell being filled.",
          "The differentiating electron enters $f$.",
          "So it is the $f$-block.",
        ],
        [{ part: "a", explanation: "They belong to the $f$-block." }],
        ["Calling them $d$-block only because they are transition-like."],
      ),
      extraFrq(
        "saq",
        L`Explain why noble gases are placed in group 18.`,
        3,
        ["noble_gases", "group_configuration"],
        [
          {
            letter: "a",
            promptMarkdown: "State their general valence configuration.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Connect this to low reactivity.",
            points: 2,
          },
        ],
        [
          "Most noble gases have $ns^2np^6$.",
          "This is a complete valence shell.",
          "Complete shell gives high stability.",
        ],
        [
          {
            part: "a",
            explanation:
              "Except helium, noble gases have valence configuration $ns^2np^6$.",
          },
          {
            part: "b",
            explanation:
              "A complete valence shell makes them very stable and generally unreactive, so they form group 18.",
          },
        ],
        ["Ignoring helium's special $1s^2$ case."],
      ),
      extraFrq(
        "laq",
        L`For elements A, B and C with valence configurations $3s^1$, $3s^2$ and $3s^2 3p^5$ respectively:`,
        4,
        ["periodic_position", "group_configuration"],
        [
          {
            letter: "a",
            promptMarkdown: "State the period common to all three.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find group of A.", points: 1 },
          { letter: "c", promptMarkdown: "Find group of B.", points: 1 },
          {
            letter: "d",
            promptMarkdown: "Find group of C and name the family.",
            points: 2,
          },
        ],
        [
          "Highest $n$ is 3 for all.",
          "$3s^1$ is group 1.",
          "$3s^2 3p^5$ is group 17 halogen.",
        ],
        [
          { part: "a", explanation: "All are in period 3." },
          { part: "b", explanation: "A is in group 1." },
          { part: "c", explanation: "B is in group 2." },
          { part: "d", explanation: "C is in group 17, the halogen family." },
        ],
        ["Counting inner-shell electrons as valence electrons."],
      ),
      extraFrq(
        "case",
        L`A simplified table has four regions: left two columns, central ten columns, right six columns and two separated rows below.`,
        3,
        ["case_based", "blocks_periodic_table"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the left two-column block.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the central ten-column block.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the right six-column block.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Name the separated lower rows block.",
            points: 2,
          },
        ],
        [
          "The left side fills $s$ orbitals.",
          "The centre fills $d$ orbitals.",
          "The lower separated rows are $f$-block.",
        ],
        [
          { part: "a", explanation: "$s$-block." },
          { part: "b", explanation: "$d$-block." },
          { part: "c", explanation: "$p$-block." },
          { part: "d", explanation: "$f$-block." },
        ],
        [
          "Calling the separated rows a separate period rather than a block display.",
        ],
      ),
    ],
  },
  "3.3": {
    mc: [
      extraMc(
        L`An element with configuration $[\mathrm{Ne}]3s^2 3p^1$ belongs to`,
        ["s-block", "p-block", "d-block", "f-block"],
        "B",
        {
          A: "The differentiating electron is in $p$, not $s$.",
          C: "No $d$ subshell is being filled.",
          D: "No $f$ subshell is being filled.",
        },
        [
          "Look at the last electron.",
          "It enters a $p$ subshell.",
          "Block is named by the differentiating subshell.",
        ],
        "The last electron enters $3p$, so the element is in the $p$-block.",
        ["electronic_configuration", "blocks"],
      ),
      extraMc(
        L`The element with configuration $[\mathrm{Ar}]3d^{10}4s^2 4p^3$ is a`,
        [
          "group 3 transition element",
          "group 15 p-block element",
          "group 2 s-block element",
          "noble gas",
        ],
        "B",
        {
          A: "The differentiating electron is in $p$, not partially filled $d$.",
          C: "It has $p^3$ valence electrons too.",
          D: "Valence shell is not complete $p^6$.",
        },
        [
          "Identify valence shell $4s^2 4p^3$.",
          "There are five valence electrons.",
          "For p-block, group is $10+$ valence electrons.",
        ],
        "The valence shell $4s^2 4p^3$ gives group 15 and the last electron is in $p$-block.",
        ["p_block", "group_number"],
      ),
      extraMc(
        L`The differentiating electron of potassium enters`,
        [L`$3p$`, L`$3d$`, L`$4s$`, L`$4p$`],
        "C",
        {
          A: "Argon already completes $3p$.",
          B: "$3d$ fills after $4s$.",
          D: "$4p$ fills later.",
        },
        [
          "Potassium has $Z=19$.",
          "After argon, the next electron enters $4s$.",
          "Configuration is $[\\mathrm{Ar}]4s^1$.",
        ],
        "Potassium's differentiating electron enters the $4s$ orbital.",
        ["aufbau", "differentiating_electron"],
      ),
      extraMc(
        L`A transition element generally has`,
        [
          "completely filled valence $p$ subshell only",
          "partly filled $d$ subshell in atom or common ion",
          "no electrons in inner shells",
          "only one electron shell",
        ],
        "B",
        {
          A: "That describes noble gases more closely.",
          C: "All heavier atoms have inner electrons.",
          D: "Transition elements have several shells.",
        },
        [
          "Transition elements belong mainly to $d$-block.",
          "Their characteristic chemistry involves $d$ electrons.",
          "Use partly filled $d$ subshell criterion.",
        ],
        "Transition elements have partly filled $d$ subshells in atoms or common oxidation states.",
        ["transition_elements"],
      ),
      extraMc(
        L`The period of an element with valence shell $5s^2 5p^2$ is`,
        ["2", "4", "5", "14"],
        "C",
        {
          A: "The number of valence electrons is not the period.",
          B: "There is no highest $n=4$ here.",
          D: "This resembles a group number idea, not period.",
        },
        [
          "Period is highest principal quantum number.",
          "The valence shell has $n=5$.",
          "Thus period is 5.",
        ],
        "The highest occupied shell is $n=5$, so the element is in period 5.",
        ["period_number"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Use the configuration $[\mathrm{Ar}]3d^5 4s^1$ to identify block and period of the element.`,
        3,
        ["configuration_position"],
        [
          { letter: "a", promptMarkdown: "State the block.", points: 2 },
          { letter: "b", promptMarkdown: "State the period.", points: 2 },
        ],
        [
          "The differentiating electron is in $d$.",
          "Period follows highest $n$.",
          "The highest shell here is $4s$.",
        ],
        [
          { part: "a", explanation: "It is a $d$-block element." },
          {
            part: "b",
            explanation:
              "The highest occupied shell has $n=4$, so it is in period 4.",
          },
        ],
        ["Using $3d$ to call it period 3."],
      ),
      extraFrq(
        "vsaq",
        L`What is meant by differentiating electron?`,
        2,
        ["differentiating_electron"],
        singlePart("a", "Define the term.", 2),
        [
          "Compare an element with the preceding element.",
          "The newly added electron matters.",
          "It helps decide block.",
        ],
        [
          {
            part: "a",
            explanation:
              "The differentiating electron is the electron added to an atom that differentiates it from the preceding element in the periodic table.",
          },
        ],
        ["Defining it as all valence electrons."],
      ),
      extraFrq(
        "saq",
        L`An element has outer configuration $ns^2np^2$.`,
        3,
        ["group_configuration", "p_block"],
        [
          { letter: "a", promptMarkdown: "State its block.", points: 1 },
          { letter: "b", promptMarkdown: "State its group.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "Give one example from period 2.",
            points: 1,
          },
        ],
        [
          "Last electron is in $p$.",
          "There are four valence electrons.",
          "Period 2 example is carbon.",
        ],
        [
          { part: "a", explanation: "It is a $p$-block element." },
          {
            part: "b",
            explanation:
              "For $p$-block, four valence electrons correspond to group 14.",
          },
          {
            part: "c",
            explanation: "Carbon has outer configuration $2s^2 2p^2$.",
          },
        ],
        ["Calling it group 4 instead of group 14 in modern numbering."],
      ),
      extraFrq(
        "laq",
        L`Classify the elements with differentiating electrons in $s$, $p$, $d$ and $f$ orbitals.`,
        4,
        ["element_types", "blocks"],
        [
          { letter: "a", promptMarkdown: "Name the four blocks.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "State which block contains transition elements.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State which block contains inner transition elements.",
            points: 2,
          },
        ],
        [
          "Block name follows differentiating orbital.",
          "$d$-block contains transition elements.",
          "$f$-block contains inner transition elements.",
        ],
        [
          {
            part: "a",
            explanation: "The four blocks are $s$, $p$, $d$ and $f$ blocks.",
          },
          {
            part: "b",
            explanation: "The $d$-block contains transition elements.",
          },
          {
            part: "c",
            explanation:
              "The $f$-block contains inner transition elements such as lanthanoids and actinoids.",
          },
        ],
        ["Using group names instead of block classification."],
      ),
      extraFrq(
        "case",
        L`A, B and C have differentiating electrons in $3s$, $3p$ and $3d$ orbitals respectively.`,
        4,
        ["case_based", "blocks", "period"],
        [
          { letter: "a", promptMarkdown: "State block of A.", points: 1 },
          { letter: "b", promptMarkdown: "State block of B.", points: 1 },
          { letter: "c", promptMarkdown: "State block of C.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "Which one is not in period 3 in the actual long-form table? Explain.",
            points: 2,
          },
        ],
        [
          "Block follows differentiating orbital.",
          "Remember $3d$ fills after $4s$.",
          "$3d$ elements are in period 4.",
        ],
        [
          { part: "a", explanation: "A is $s$-block." },
          { part: "b", explanation: "B is $p$-block." },
          { part: "c", explanation: "C is $d$-block." },
          {
            part: "d",
            explanation:
              "C is not period 3 in the actual table; $3d$ subshell filling begins after $4s$, so $3d$ transition elements are in period 4.",
          },
        ],
        ["Assuming orbital number always equals period for $d$ elements."],
      ),
    ],
  },
  "3.4": {
    mc: [
      extraMc(
        L`Across a period from left to right, atomic radius generally decreases because`,
        [
          "new shells are added",
          "effective nuclear charge increases",
          "nuclear charge decreases",
          "electrons leave the atom",
        ],
        "B",
        {
          A: "New shells are added down a group, not across a period.",
          C: "Nuclear charge increases across a period.",
          D: "Neutral atoms do not simply lose electrons across a period.",
        },
        [
          "Across a period, electrons enter the same shell.",
          "Proton number increases.",
          "Effective pull on electrons increases.",
        ],
        "Increasing effective nuclear charge pulls the same-shell electrons closer, decreasing radius.",
        ["atomic_radius_trend"],
      ),
      extraMc(
        L`Among $\mathrm{Na^+}$, $\mathrm{Mg^{2+}}$ and $\mathrm{Al^{3+}}$, the smallest ion is`,
        [
          L`$\mathrm{Na^+}$`,
          L`$\mathrm{Mg^{2+}}$`,
          L`$\mathrm{Al^{3+}}$`,
          "all equal",
        ],
        "C",
        {
          A: "All are isoelectronic, but sodium has the smallest nuclear charge.",
          B: "Magnesium has less nuclear charge than aluminium.",
          D: "Isoelectronic ions are not equal in size.",
        },
        [
          "These ions have 10 electrons each.",
          "For isoelectronic species, higher nuclear charge means smaller radius.",
          "Aluminium has $Z=13$.",
        ],
        "$\\mathrm{Al^{3+}}$ has the greatest nuclear charge for the same electron count, so it is smallest.",
        ["isoelectronic_radius"],
      ),
      extraMc(
        L`An anion is larger than its parent atom mainly because`,
        [
          "it has gained electron(s), increasing electron-electron repulsion",
          "it has lost its outermost shell",
          "its proton number increases",
          "its nucleus becomes neutral",
        ],
        "A",
        {
          B: "Losing the outermost shell is typical for some cations, not anions.",
          C: "Ion formation by electron gain does not change proton number.",
          D: "The nucleus remains positively charged.",
        },
        [
          "Anions form by electron gain.",
          "Nuclear charge remains the same.",
          "Added electrons increase repulsion and make the electron cloud larger.",
        ],
        "An anion has more electrons than the parent atom but the same nuclear charge, so electron-electron repulsion increases and the radius becomes larger.",
        ["ionic_radius"],
      ),
      extraMc(
        L`Down a group, atomic radius generally increases due to`,
        [
          "increase in number of shells",
          "decrease in nuclear charge",
          "loss of all valence electrons",
          "constant shielding",
        ],
        "A",
        {
          B: "Nuclear charge increases down a group.",
          C: "Atoms do not lose all valence electrons down a group.",
          D: "Shielding generally increases.",
        },
        [
          "Going down adds a shell.",
          "Added shells increase distance from nucleus.",
          "Shielding also increases.",
        ],
        "Additional electron shells dominate, so atomic radius increases down a group.",
        ["atomic_radius_trend"],
      ),
      extraMc(
        L`The largest species among $\mathrm{F^-}$, $\mathrm{Ne}$ and $\mathrm{Na^+}$ is`,
        [
          L`$\mathrm{F^-}$`,
          L`$\mathrm{Ne}$`,
          L`$\mathrm{Na^+}$`,
          "all have equal radius",
        ],
        "A",
        {
          B: "Neon has greater nuclear charge than fluoride for the same electron count.",
          C: "Sodium ion has the greatest nuclear charge among these isoelectronic species.",
          D: "Isoelectronic species have different radii due to different nuclear charge.",
        },
        [
          "All have 10 electrons.",
          "Lower nuclear charge gives larger size in isoelectronic series.",
          "Fluorine has $Z=9$.",
        ],
        "$\\mathrm{F^-}$ is largest because it has the lowest nuclear charge among the 10-electron species.",
        ["isoelectronic_radius"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Arrange $\mathrm{Na}$, $\mathrm{Mg}$ and $\mathrm{Al}$ in decreasing atomic radius and justify.`,
        3,
        ["atomic_radius_trend"],
        [
          { letter: "a", promptMarkdown: "Give the order.", points: 2 },
          { letter: "b", promptMarkdown: "Give the reason.", points: 2 },
        ],
        [
          "They are in the same period.",
          "Radius decreases left to right.",
          "Effective nuclear charge increases.",
        ],
        [
          {
            part: "a",
            explanation: "Decreasing radius: $\\mathrm{Na>Mg>Al}$.",
          },
          {
            part: "b",
            explanation:
              "Across a period, effective nuclear charge increases while electrons enter the same shell, so radius decreases.",
          },
        ],
        ["Using group trend for same-period elements."],
      ),
      extraFrq(
        "vsaq",
        L`Why is $\mathrm{Cl^-}$ larger than $\mathrm{Cl}$?`,
        2,
        ["ionic_radius"],
        singlePart("a", "Give the reason.", 2),
        [
          "An anion forms by gaining an electron.",
          "More electron-electron repulsion results.",
          "Nuclear charge is unchanged.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{Cl^-}$ has one extra electron but the same nuclear charge as chlorine atom, so electron-electron repulsion increases and the ion is larger.",
          },
        ],
        ["Saying the nucleus becomes weaker."],
      ),
      extraFrq(
        "saq",
        L`Arrange $\mathrm{O^{2-}}$, $\mathrm{F^-}$ and $\mathrm{Na^+}$ in increasing ionic radius.`,
        4,
        ["isoelectronic_radius"],
        [
          {
            letter: "a",
            promptMarkdown: "State why they are comparable.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give increasing-radius order.",
            points: 3,
          },
        ],
        [
          "Count electrons.",
          "All have 10 electrons.",
          "Higher nuclear charge gives smaller radius.",
        ],
        [
          {
            part: "a",
            explanation: "They are isoelectronic; each has 10 electrons.",
          },
          {
            part: "b",
            explanation: "Increasing radius: $\\mathrm{Na^+<F^-<O^{2-}}$.",
          },
        ],
        ["Ordering only by charge magnitude without nuclear charge."],
      ),
      extraFrq(
        "laq",
        L`Explain the variation of atomic radius from lithium to fluorine and from lithium to caesium.`,
        4,
        ["atomic_radius_trends"],
        [
          { letter: "a", promptMarkdown: "Trend from Li to F.", points: 2 },
          { letter: "b", promptMarkdown: "Trend from Li to Cs.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "Name the factors responsible.",
            points: 1,
          },
        ],
        [
          "Li to F is across a period.",
          "Li to Cs is down a group.",
          "Use effective nuclear charge and number of shells.",
        ],
        [
          {
            part: "a",
            explanation:
              "From Li to F, radius decreases because effective nuclear charge increases in the same shell.",
          },
          {
            part: "b",
            explanation:
              "From Li to Cs, radius increases because new shells are added down the group.",
          },
          {
            part: "c",
            explanation:
              "The key factors are effective nuclear charge, shielding and number of shells.",
          },
        ],
        ["Applying one trend universally in both directions."],
      ),
      extraFrq(
        "case",
        L`Species P, Q and R are isoelectronic with $10$ electrons. Their nuclear charges are $+8$, $+10$ and $+12$ respectively.`,
        4,
        ["case_based", "isoelectronic_radius"],
        [
          {
            letter: "a",
            promptMarkdown: "Which species is largest?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which species is smallest?",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Explain the trend.", points: 3 },
        ],
        [
          "Same electron count means compare nuclear charge.",
          "Lower nuclear charge pulls less strongly.",
          "Higher nuclear charge pulls more strongly.",
        ],
        [
          { part: "a", explanation: "P is largest." },
          { part: "b", explanation: "R is smallest." },
          {
            part: "c",
            explanation:
              "For isoelectronic species, electron count is constant; increasing nuclear charge pulls the electron cloud closer and decreases radius.",
          },
        ],
        ["Assuming same electron count means same size."],
      ),
    ],
  },
  "3.5": {
    mc: [
      extraMc(
        L`First ionisation enthalpy generally increases across a period because`,
        [
          "atomic size increases",
          "effective nuclear charge increases",
          "shielding becomes dominant over nuclear charge",
          "atoms become heavier only",
        ],
        "B",
        {
          A: "Atomic size generally decreases across a period.",
          C: "Shielding changes only slightly across a period.",
          D: "Mass alone is not the main reason.",
        },
        [
          "Electron removal becomes harder across a period.",
          "Nuclear pull increases.",
          "Radius decreases.",
        ],
        "Increasing effective nuclear charge holds valence electrons more tightly, so ionisation enthalpy increases.",
        ["ionisation_enthalpy"],
      ),
      extraMc(
        L`The first ionisation enthalpy of oxygen is lower than nitrogen mainly because oxygen has`,
        [
          "larger nuclear charge only",
          "one paired electron in a $2p$ orbital causing extra repulsion",
          "a completely filled $p$ subshell",
          "no valence electrons",
        ],
        "B",
        {
          A: "Larger nuclear charge alone would suggest higher value.",
          C: "Oxygen has $2p^4$, not filled $p^6$.",
          D: "Oxygen has six valence electrons.",
        },
        [
          "Compare $2p^3$ and $2p^4$.",
          "Nitrogen has half-filled $p$ subshell.",
          "Oxygen has one paired $p$ electron.",
        ],
        "Electron-electron repulsion in paired $2p$ orbital makes removal from oxygen easier than from nitrogen.",
        ["ionisation_exception"],
      ),
      extraMc(
        L`Electron gain enthalpy is generally most negative for`,
        ["alkali metals", "halogens", "noble gases", "alkaline earth metals"],
        "B",
        {
          A: "Alkali metals more readily lose electrons.",
          C: "Noble gases resist electron gain due to stable shells.",
          D: "Group 2 elements have filled $s$ subshells.",
        },
        [
          "Halogens need one electron for noble-gas configuration.",
          "Electron gain releases significant energy.",
          "They have high tendency to gain electrons.",
        ],
        "Halogens have very negative electron gain enthalpies because gaining one electron completes their valence shell.",
        ["electron_gain_enthalpy"],
      ),
      extraMc(
        L`Electronegativity in a period generally`,
        [
          "decreases from left to right",
          "increases from left to right",
          "is zero for all elements",
          "depends only on atomic mass",
        ],
        "B",
        {
          A: "Across a period, nuclear attraction for bonding electrons generally increases.",
          C: "Electronegativity is not zero for all elements.",
          D: "It depends on attraction for shared electrons, not only mass.",
        },
        [
          "Across a period, atomic radius decreases.",
          "Effective nuclear charge increases.",
          "Attraction for shared pair increases.",
        ],
        "Electronegativity generally increases from left to right across a period.",
        ["electronegativity"],
      ),
      extraMc(
        L`The second ionisation enthalpy of sodium is much larger than the first because after first ionisation sodium has`,
        [
          "a noble-gas configuration",
          "more shells than before",
          "become a neutron",
          "lost its nucleus",
        ],
        "A",
        {
          B: "It loses the valence shell, not gains shells.",
          C: "Ionisation does not change protons into neutrons.",
          D: "The nucleus remains.",
        },
        [
          "Sodium loses its $3s^1$ electron first.",
          "$\\mathrm{Na^+}$ has neon configuration.",
          "Removing another electron breaks a stable core.",
        ],
        "After losing one electron, $\\mathrm{Na^+}$ has a stable noble-gas configuration, so the second ionisation is very difficult.",
        ["successive_ionisation"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Explain why first ionisation enthalpy of magnesium is greater than that of aluminium.`,
        4,
        ["ionisation_exception"],
        [
          {
            letter: "a",
            promptMarkdown: "Write relevant outer configurations.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Give the reason for the exception.",
            points: 2,
          },
        ],
        [
          "Magnesium ends with $3s^2$.",
          "Aluminium begins $3p^1$.",
          "A $3p$ electron is easier to remove than a filled $3s$ electron.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{Mg}:3s^2$ and $\\mathrm{Al}:3s^2 3p^1$.",
          },
          {
            part: "b",
            explanation:
              "The electron removed from aluminium is a higher-energy, more shielded $3p$ electron, so it is easier to remove than magnesium's $3s$ electron.",
          },
        ],
        ["Using only increasing nuclear charge across period."],
      ),
      extraFrq(
        "vsaq",
        L`In a polar covalent bond, one atom attracts the shared electron pair more strongly. Name this tendency and define it.`,
        1,
        ["electronegativity"],
        singlePart("a", "Name the tendency and give its meaning.", 2),
        [
          "It applies in a chemical bond.",
          "It is about attracting shared electrons.",
          "It is a relative tendency.",
        ],
        [
          {
            part: "a",
            explanation:
              "Electronegativity is the tendency of an atom in a chemical bond to attract the shared pair of electrons towards itself.",
          },
        ],
        ["Defining it as electron gain enthalpy."],
      ),
      extraFrq(
        "saq",
        L`Arrange $\mathrm{F}$, $\mathrm{O}$ and $\mathrm{N}$ in decreasing electronegativity and justify.`,
        3,
        ["electronegativity_trend"],
        [
          { letter: "a", promptMarkdown: "Give the order.", points: 2 },
          { letter: "b", promptMarkdown: "Give the trend reason.", points: 2 },
        ],
        [
          "They are in period 2.",
          "Electronegativity increases left to right.",
          "Fluorine is highest.",
        ],
        [
          {
            part: "a",
            explanation: "Decreasing electronegativity: $\\mathrm{F>O>N}$.",
          },
          {
            part: "b",
            explanation:
              "Across a period, effective nuclear charge increases and size decreases, so attraction for bonding electrons increases.",
          },
        ],
        ["Using atomic size trend in the wrong direction."],
      ),
      extraFrq(
        "laq",
        L`Successive ionisation enthalpies of an element are $520$, $7300$ and $11800\text{ kJ mol}^{-1}$.`,
        4,
        ["successive_ionisation", "group_prediction"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the likely group.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Explain the large jump.", points: 3 },
        ],
        [
          "Look for where the large jump occurs.",
          "The jump after first ionisation means one valence electron.",
          "That suggests group 1.",
        ],
        [
          { part: "a", explanation: "The element is likely in group 1." },
          {
            part: "b",
            explanation:
              "After removal of one valence electron, the ion reaches a stable noble-gas configuration. The second electron must be removed from an inner shell, causing a large jump.",
          },
        ],
        ["Choosing group 2 just because there are three values."],
      ),
      extraFrq(
        "case",
        L`Elements A, B and C are in the same period from left to right. Their atomic radii decrease in the order A > B > C.`,
        4,
        ["case_based", "periodic_trends"],
        [
          {
            letter: "a",
            promptMarkdown: "Which has highest ionisation enthalpy?",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Which is most metallic?", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Which is most electronegative?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Give the common reason behind these trends.",
            points: 2,
          },
        ],
        [
          "Across a period, radius decreases.",
          "Ionisation enthalpy and electronegativity generally increase.",
          "Metallic character decreases.",
        ],
        [
          { part: "a", explanation: "C has the highest ionisation enthalpy." },
          { part: "b", explanation: "A is most metallic." },
          { part: "c", explanation: "C is most electronegative." },
          {
            part: "d",
            explanation:
              "Effective nuclear charge increases across the period, pulling valence electrons more strongly.",
          },
        ],
        [
          "Treating all periodic properties as increasing in the same direction.",
        ],
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

export const classificationPeriodicityTopics: Topic[] =
  expandedTopicSeeds.map(makeTopic);
