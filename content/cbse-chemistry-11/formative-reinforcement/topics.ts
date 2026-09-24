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
const UNIT = "formative-reinforcement";
const VERSION = "0.1.1";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type SolutionStepSeed = Omit<SolutionStep, "step"> & { step?: number };

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
  solution: readonly SolutionStepSeed[];
  figure?: ItemFigure;
  calculatorAllowed?: boolean;
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
  calculatorAllowed?: boolean;
  commonMisconceptions?: string[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function topicNumber(topicCode: string) {
  return Number(topicCode.split(".")[1] ?? 1);
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|le|ge|neq|mu|sqrt|sigma|pi|pm)\b/g,
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

function repairStep(step: SolutionStepSeed, index: number): SolutionStep {
  return {
    step: step.step ?? index + 1,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the gas-law condition, deviation assumption, periodic trend, first-element behaviour, or block-property comparison before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class11_chemistry_formative_reasoning",
    };
  });

  const correctSeedIndex = LETTERS.indexOf(seed.correctLetter);
  const globalMcIndex = (topicNumber(meta.topicCode) - 1) * 5 + index;
  const targetCorrectIndex = (globalMcIndex * 3 + 2) % LETTERS.length;
  const rotation =
    (correctSeedIndex - targetCorrectIndex + LETTERS.length) % LETTERS.length;
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
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "answers_formative_chemistry_item_by_memory_without_checking_condition_or_trend",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairStep),
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
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_final_fact_without_linking_it_to_gas_law_or_periodic_trend",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map((part) => ({
      ...part,
      promptMarkdown: repairInlineLatex(part.promptMarkdown),
    })),
    hintLadder: hints(seed.hints),
    rubric: {
      maxPoints: seed.rubric.maxPoints,
      criteria: seed.rubric.criteria.map((criterion) => ({
        ...criterion,
        description: repairInlineLatex(criterion.description),
      })),
    },
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map((part) => ({
      ...part,
      explanation: repairInlineLatex(part.explanation),
      ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
    })),
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

function parts(items: readonly [string, string, number][]): FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) => ({
    letter,
    promptMarkdown: repairInlineLatex(promptMarkdown),
    points,
  }));
}

function onePart(promptMarkdown: string, marks = 1): FrqPart[] {
  return parts([["a", promptMarkdown, marks]]);
}

function rubric(items: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: items.reduce((total, item) => total + item.points, 0),
    criteria: items.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Completes part ${item.letter} with the required gas-law, real-gas, periodic-trend or block-chemistry reasoning.`,
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
  solution: readonly SolutionStepSeed[],
  figure?: ItemFigure,
  calculatorAllowed?: boolean,
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
    ...(calculatorAllowed === undefined ? {} : { calculatorAllowed }),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  frqParts: readonly FrqPart[],
  promptHints: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
  calculatorAllowed?: boolean,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts: frqParts,
    rubric: rubric(frqParts),
    hints: promptHints,
    workedSolution,
    commonErrors,
    ...(figure ? { figure } : {}),
    ...(calculatorAllowed === undefined ? {} : { calculatorAllowed }),
  };
}

const gasLawFigure: ItemFigure = {
  type: "svg",
  title: "Gas-law data at constant pressure",
  description:
    "A volume-temperature graph for a fixed amount of gas at constant pressure.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 360" role="img" aria-label="Volume versus temperature graph at constant pressure">
  <rect x="0" y="0" width="620" height="360" fill="#ffffff"/>
  <g stroke="#cbd5e1" stroke-width="1">
    <line x1="90" y1="60" x2="560" y2="60"/>
    <line x1="90" y1="110" x2="560" y2="110"/>
    <line x1="90" y1="160" x2="560" y2="160"/>
    <line x1="90" y1="210" x2="560" y2="210"/>
    <line x1="90" y1="260" x2="560" y2="260"/>
    <line x1="180" y1="40" x2="180" y2="285"/>
    <line x1="270" y1="40" x2="270" y2="285"/>
    <line x1="360" y1="40" x2="360" y2="285"/>
    <line x1="450" y1="40" x2="450" y2="285"/>
  </g>
  <g stroke="#334155" stroke-width="2">
    <line x1="90" y1="285" x2="575" y2="285"/>
    <line x1="90" y1="285" x2="90" y2="35"/>
  </g>
  <path d="M90 285 L575 20" fill="none" stroke="#2563eb" stroke-width="4"/>
  <g fill="#2563eb">
    <circle cx="180" cy="235" r="5"/>
    <circle cx="270" cy="185" r="5"/>
    <circle cx="360" cy="135" r="5"/>
    <circle cx="450" cy="85" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="15" fill="#0f172a">
    <text x="382" y="328">Temperature, T (K)</text>
    <text x="18" y="48">Volume, V</text>
    <text x="175" y="306">200</text>
    <text x="265" y="306">300</text>
    <text x="355" y="306">400</text>
    <text x="445" y="306">500</text>
    <text x="96" y="323">0 K</text>
    <text x="118" y="48" fill="#1d4ed8">straight line through origin when pressure is constant</text>
  </g>
</svg>`,
};

const realGasFigure: ItemFigure = {
  type: "svg",
  title: "Compressibility factor comparison",
  description:
    "A qualitative compressibility-factor graph comparing ideal, attraction-dominated and repulsion-dominated behaviour.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 360" role="img" aria-label="Compressibility factor versus pressure graph">
  <rect x="0" y="0" width="620" height="360" fill="#ffffff"/>
  <g stroke="#cbd5e1" stroke-width="1">
    <line x1="80" y1="80" x2="560" y2="80"/>
    <line x1="80" y1="150" x2="560" y2="150"/>
    <line x1="80" y1="220" x2="560" y2="220"/>
    <line x1="80" y1="290" x2="560" y2="290"/>
    <line x1="170" y1="50" x2="170" y2="300"/>
    <line x1="280" y1="50" x2="280" y2="300"/>
    <line x1="390" y1="50" x2="390" y2="300"/>
    <line x1="500" y1="50" x2="500" y2="300"/>
  </g>
  <g stroke="#334155" stroke-width="2">
    <line x1="80" y1="290" x2="575" y2="290"/>
    <line x1="80" y1="290" x2="80" y2="40"/>
  </g>
  <line x1="80" y1="150" x2="560" y2="150" stroke="#64748b" stroke-width="3"/>
  <path d="M80 150 C170 180, 260 205, 350 176 C430 150, 500 112, 560 78" fill="none" stroke="#ef4444" stroke-width="4"/>
  <path d="M80 150 C190 140, 330 112, 560 55" fill="none" stroke="#16a34a" stroke-width="4"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#0f172a">
    <text x="530" y="318">P</text>
    <text x="30" y="56">Z</text>
    <text x="88" y="145">Z = 1</text>
    <text x="392" y="191" fill="#ef4444">A: attraction first, then repulsion</text>
    <text x="335" y="76" fill="#16a34a">B: repulsion dominated</text>
  </g>
</svg>`,
};

const sBlockTrendFigure: ItemFigure = {
  type: "svg",
  title: "s-block trend organizer",
  description:
    "A trend organizer comparing alkali metals and alkaline earth metals.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="s-block trend organizer">
  <rect x="0" y="0" width="640" height="360" fill="#ffffff"/>
  <g font-family="Arial, sans-serif">
    <text x="70" y="44" font-size="20" font-weight="700" fill="#0f172a">s-block trends</text>
    <rect x="80" y="75" width="190" height="230" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
    <rect x="370" y="75" width="190" height="230" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <text x="138" y="110" font-size="18" fill="#1d4ed8">Group 1</text>
    <text x="416" y="110" font-size="18" fill="#15803d">Group 2</text>
    <text x="112" y="150" font-size="16" fill="#0f172a">outer shell: ns1</text>
    <text x="395" y="150" font-size="16" fill="#0f172a">outer shell: ns2</text>
    <text x="112" y="190" font-size="16" fill="#0f172a">larger radius</text>
    <text x="395" y="190" font-size="16" fill="#0f172a">smaller radius</text>
    <text x="112" y="230" font-size="16" fill="#0f172a">lower first IE</text>
    <text x="395" y="230" font-size="16" fill="#0f172a">higher first IE</text>
    <text x="112" y="270" font-size="16" fill="#0f172a">M+ common</text>
    <text x="395" y="270" font-size="16" fill="#0f172a">M2+ common</text>
    <line x1="305" y1="94" x2="305" y2="300" stroke="#94a3b8" stroke-width="3"/>
    <text x="284" y="324" font-size="15" fill="#475569">compare same period</text>
  </g>
</svg>`,
};

const pBlockTrendFigure: ItemFigure = {
  type: "svg",
  title: "p-block first-element behaviour",
  description:
    "A comparison board for first-element behaviour in p-block groups.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" role="img" aria-label="p-block first element behaviour organizer">
  <rect x="0" y="0" width="640" height="380" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="60" y="42" font-size="20" font-weight="700">Why first p-block elements behave differently</text>
    <rect x="70" y="70" width="500" height="58" rx="8" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
    <text x="96" y="106" font-size="17">small size and high electronegativity</text>
    <rect x="70" y="145" width="500" height="58" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
    <text x="96" y="181" font-size="17">absence of low-lying d orbitals in period 2</text>
    <rect x="70" y="220" width="500" height="58" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <text x="96" y="256" font-size="17">strong p&#960;-p&#960; multiple bonding tendency</text>
    <rect x="70" y="295" width="500" height="45" rx="8" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
    <text x="96" y="324" font-size="16">example: carbon forms stable multiple bonds more readily than silicon</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "F.1",
    title: "The Gaseous State: Gas Laws",
    subtopic:
      "Qualitative treatment of Boyle's law, Charles' law, Avogadro relation and the ideal gas equation.",
    mc: [
      mc(
        L`A syringe contains air and is sealed at constant temperature. The piston is pushed so that the volume becomes half. The pressure is expected to`,
        2,
        ["boyles_law", "constant_temperature"],
        [
          L`become half`,
          L`remain unchanged`,
          L`become double`,
          L`become four times`,
        ],
        "C",
        {
          A: L`Boyle's law is inverse, so lowering volume raises pressure.`,
          B: L`Pressure changes because the same gas particles occupy a smaller volume.`,
          D: L`Four times would require volume to become one-fourth at constant temperature.`,
        },
        [
          L`Identify the constant condition first.`,
          L`For a fixed amount of gas at constant temperature, $PV$ is constant.`,
          L`If $V$ becomes $V/2$, then $P$ becomes $2P$.`,
        ],
        [
          {
            explanation: L`At constant temperature for a fixed amount of gas, Boyle's law gives $P_1V_1=P_2V_2$. Halving volume doubles pressure.`,
          },
        ],
      ),
      mc(
        L`A fixed amount of gas is heated from $300\,\mathrm{K}$ to $450\,\mathrm{K}$ at constant pressure. Its volume changes from $2.0\,\mathrm{L}$ to`,
        3,
        ["charles_law", "volume_temperature"],
        [
          L`$1.33\,\mathrm{L}$`,
          L`$2.0\,\mathrm{L}$`,
          L`$3.0\,\mathrm{L}$`,
          L`$4.5\,\mathrm{L}$`,
        ],
        "C",
        {
          A: L`This uses inverse proportionality; at constant pressure volume is directly proportional to Kelvin temperature.`,
          B: L`The temperature has changed, so the volume cannot remain the same at constant pressure.`,
          D: L`This treats $450$ as a multiplier instead of using the ratio $450/300$.`,
        },
        [
          L`Use Kelvin temperature, not Celsius.`,
          L`At constant pressure, $V/T$ is constant.`,
          L`Compute $2.0\times 450/300$.`,
        ],
        [
          {
            explanation: L`Charles' law gives $V_2=V_1T_2/T_1$.`,
            math: L`V_2=2.0\times \frac{450}{300}=3.0\,\mathrm{L}`,
          },
        ],
        undefined,
        true,
      ),
      mc(
        L`Two balloons at the same temperature and pressure contain ideal gases. Balloon A has $0.20$ mol and Balloon B has $0.50$ mol. The correct comparison is`,
        2,
        ["avogadro_law", "mole_volume"],
        [
          L`B has $2.5$ times the volume of A`,
          L`A has $2.5$ times the volume of B`,
          L`both must have the same volume because pressure is same`,
          L`volume cannot be compared without molar mass`,
        ],
        "A",
        {
          B: L`The larger number of moles gives the larger volume at the same temperature and pressure.`,
          C: L`Same pressure alone is not enough; amount of gas also matters.`,
          D: L`For ideal gases, volume at the same $T$ and $P$ depends on moles, not molar mass.`,
        },
        [
          L`Use the condition same $T$ and $P$.`,
          L`Avogadro's law says $V\propto n$.`,
          L`Compare $0.50/0.20$.`,
        ],
        [
          {
            explanation: L`At the same temperature and pressure, volume is directly proportional to moles. The ratio is $0.50/0.20=2.5$.`,
          },
        ],
        undefined,
        true,
      ),
      mc(
        L`A student writes $PV=nRT$ for a gas sample, but uses temperature in degree Celsius. The most direct error is that`,
        2,
        ["ideal_gas_equation", "kelvin_temperature"],
        [
          L`pressure must be in pascal only`,
          L`temperature must be on the Kelvin scale`,
          L`volume must always be in millilitre`,
          L`the equation applies only to liquids`,
        ],
        "B",
        {
          A: L`Consistent units are required, but the specific conceptual error stated is Celsius temperature.`,
          C: L`Volume may be in any consistent unit system with the chosen value of $R$.`,
          D: L`The ideal gas equation is for gases, not liquids.`,
        },
        [
          L`Absolute temperature appears in gas laws.`,
          L`Celsius zero is not zero kinetic energy.`,
          L`Convert by $T(\mathrm{K})=t(^\circ\mathrm{C})+273.15$.`,
        ],
        [
          {
            explanation: L`The ideal gas equation requires absolute temperature. Celsius values must be converted to Kelvin before substitution.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): For a fixed mass of gas at constant pressure, a graph of $V$ against $T$ in kelvin is a straight line. Reason (R): At constant pressure, $V/T$ is constant.`,
        3,
        ["assertion_reason", "charles_law_graph"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains the straight-line proportionality.`,
          C: L`The ratio $V/T$ is constant at constant pressure for a fixed amount of gas.`,
          D: L`The assertion is true when temperature is in kelvin.`,
        },
        [
          L`A graph is straight when the variables are directly proportional.`,
          L`Use Kelvin temperature.`,
          L`$V/T=\text{constant}$ means $V\propto T$.`,
        ],
        [
          {
            explanation: L`Both statements are true, and the reason correctly explains the assertion because $V/T$ constant implies a straight-line $V$-$T$ graph through the origin for Kelvin temperature.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why must temperature be converted to kelvin before applying Charles' law?`,
        1,
        ["charles_law", "absolute_temperature"],
        onePart(L`Give the reason.`, 1),
        [
          L`Charles' law uses proportionality with temperature.`,
          L`Direct proportionality needs absolute temperature.`,
          L`Celsius has an arbitrary zero.`,
        ],
        [
          {
            part: "a",
            explanation: L`Charles' law uses absolute temperature because gas volume is proportional to temperature measured from absolute zero, not from the arbitrary Celsius zero.`,
          },
        ],
        [L`Using Celsius values directly in gas-law ratios.`],
      ),
      frq(
        "saq",
        L`A gas occupies $600\,\mathrm{mL}$ at $27^\circ\mathrm{C}$ and constant pressure. Find its volume at $127^\circ\mathrm{C}$.`,
        3,
        ["charles_law", "temperature_conversion"],
        onePart(L`Calculate the new volume.`, 3),
        [
          L`Convert both temperatures to kelvin.`,
          L`Use $V_1/T_1=V_2/T_2$.`,
          L`$27^\circ\mathrm{C}=300\,\mathrm{K}$ and $127^\circ\mathrm{C}=400\,\mathrm{K}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`At constant pressure, volume is directly proportional to Kelvin temperature.`,
            math: L`V_2=600\times \frac{400}{300}=800\,\mathrm{mL}`,
          },
        ],
        [L`Using $27$ and $127$ directly instead of converting to kelvin.`],
        undefined,
        true,
      ),
      frq(
        "saq",
        L`Use the gas-law graph to explain why the line is drawn through the origin when temperature is in kelvin.`,
        2,
        ["gas_law_graph", "direct_proportion"],
        parts([
          ["a", L`State the relation shown by the graph.`, 1],
          ["b", L`Explain the meaning of passing through the origin.`, 1],
        ]),
        [
          L`The graph is volume against Kelvin temperature.`,
          L`A straight line through origin indicates direct proportion.`,
          L`At constant pressure, $V/T$ is constant.`,
        ],
        [
          {
            part: "a",
            explanation: L`The graph shows $V\propto T$ for a fixed amount of gas at constant pressure.`,
          },
          {
            part: "b",
            explanation: L`A line through the origin means the ratio $V/T$ is constant. It represents the ideal extrapolation that volume approaches zero as absolute temperature approaches zero.`,
          },
        ],
        [L`Treating the Celsius graph and Kelvin graph as identical.`],
        gasLawFigure,
      ),
      frq(
        "laq",
        L`A sealed flexible container has $1.5$ mol of gas at $300\,\mathrm{K}$ and $2.0\,\mathrm{bar}$. The volume is $18.7\,\mathrm{L}$. The gas is warmed to $360\,\mathrm{K}$ while pressure is kept $2.0\,\mathrm{bar}$.`,
        4,
        ["combined_gas_law", "ideal_gas_context"],
        parts([
          ["a", L`State which gas-law relation is enough for the volume change.`, 1],
          ["b", L`Find the new volume.`, 2],
          ["c", L`Explain why moles and pressure need not be recalculated here.`, 1],
        ]),
        [
          L`Pressure and moles are fixed.`,
          L`Use $V/T=\text{constant}$.`,
          L`Multiply $18.7$ by $360/300$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Charles' law is enough because pressure and amount of gas are constant.`,
          },
          {
            part: "b",
            explanation: L`The new volume is`,
            math: L`V_2=18.7\times \frac{360}{300}=22.44\,\mathrm{L}\approx22.4\,\mathrm{L}`,
          },
          {
            part: "c",
            explanation: L`The sample remains sealed and the pressure is controlled, so $n$ and $P$ are unchanged. Only temperature changes the volume.`,
          },
        ],
        [L`Substituting into $PV=nRT$ again but accidentally changing $n$ or pressure.`],
        undefined,
        true,
      ),
      frq(
        "case",
        L`A student fills two identical balloons with helium at the same temperature and pressure. Balloon X contains $0.040$ mol helium and Balloon Y contains $0.060$ mol helium.`,
        3,
        ["avogadro_law", "case_reasoning"],
        parts([
          ["a", L`Which balloon has the greater volume?`, 1],
          ["b", L`Find the ratio $V_Y:V_X$.`, 1],
          ["c", L`State the gas law used.`, 1],
        ]),
        [
          L`Same temperature and pressure are important.`,
          L`Volume is proportional to moles.`,
          L`Compare $0.060$ and $0.040$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Balloon Y has the greater volume because it contains more moles at the same temperature and pressure.`,
          },
          {
            part: "b",
            explanation: L`The volume ratio is $0.060:0.040=3:2$.`,
          },
          {
            part: "c",
            explanation: L`The law used is Avogadro's law: at the same temperature and pressure, gas volume is proportional to amount of gas.`,
          },
        ],
        [L`Comparing masses or molar masses instead of moles under the same $T$ and $P$.`],
        undefined,
        true,
      ),
    ],
  },
  {
    topicCode: "F.2",
    title: "Ideal Gas Equation and Real-Gas Deviations",
    subtopic:
      "Ideal gas assumptions, qualitative deviations, compressibility factor and conditions for near-ideal behaviour.",
    mc: [
      mc(
        L`For a gas sample with $P=1.00\,\mathrm{bar}$, $V=24.9\,\mathrm{L}$, $n=1.00$ mol and $T=300\,\mathrm{K}$, using $R=0.0831\,\mathrm{L\,bar\,mol^{-1}\,K^{-1}}$, the compressibility factor $Z$ is closest to`,
        3,
        ["compressibility_factor", "ideal_gas_equation"],
        [L`$0.50$`, L`$1.00$`, L`$1.50$`, L`$2.00$`],
        "B",
        {
          A: L`This would mean the measured $PV$ is only half of $nRT$, which it is not.`,
          C: L`This overestimates $PV/nRT$ for the given numbers.`,
          D: L`This treats $24.9$ as roughly twice $nRT/P$, but $nRT$ is about $24.9$.`,
        },
        [
          L`Use $Z=PV/(nRT)$.`,
          L`Compute $nRT=1.00\times0.0831\times300$.`,
          L`$nRT\approx24.9\,\mathrm{L\,bar}$.`,
        ],
        [
          {
            explanation: L`The compressibility factor is`,
            math: L`Z=\frac{PV}{nRT}=\frac{1.00\times24.9}{1.00\times0.0831\times300}\approx1.00`,
          },
        ],
        undefined,
        true,
      ),
      mc(
        L`A real gas behaves most nearly ideally under which condition?`,
        2,
        ["ideal_behaviour", "real_gas_conditions"],
        [
          L`high pressure and low temperature`,
          L`low pressure and high temperature`,
          L`high pressure and high density`,
          L`low temperature close to liquefaction`,
        ],
        "B",
        {
          A: L`High pressure and low temperature make molecular volume and attractions more important.`,
          C: L`High density increases the importance of molecular size and interactions.`,
          D: L`Near liquefaction, attractions dominate and ideal behaviour fails.`,
        },
        [
          L`Ideal gas assumptions neglect attractions and molecular volume.`,
          L`Interactions matter less when molecules are far apart and energetic.`,
          L`That means low pressure and high temperature.`,
        ],
        [
          {
            explanation: L`At low pressure molecules are far apart, and at high temperature their kinetic energy is high. Intermolecular attractions and finite molecular volume then have smaller effects.`,
          },
        ],
      ),
      mc(
        L`When $Z<1$ for a real gas, the main qualitative reason is usually that`,
        2,
        ["compressibility_factor", "intermolecular_attraction"],
        [
          L`attractions make the observed pressure lower than the ideal value`,
          L`repulsions make the observed pressure lower than the ideal value`,
          L`molecules have no volume at all`,
          L`the gas has become an ideal gas exactly`,
        ],
        "A",
        {
          B: L`Repulsions tend to make $Z>1$, especially at high pressure.`,
          C: L`No molecular volume is an ideal-gas assumption, not an explanation for $Z<1$.`,
          D: L`An exact ideal gas has $Z=1$, not $Z<1$.`,
        },
        [
          L`$Z<1$ means $PV$ is smaller than ideal.`,
          L`Attractions pull molecules back from the wall.`,
          L`Lower wall impact pressure lowers $PV$.`,
        ],
        [
          {
            explanation: L`Attractive forces reduce the effective pressure exerted on the container wall. This can make $PV$ smaller than $nRT$, giving $Z<1$.`,
          },
        ],
      ),
      mc(
        L`A gas has $Z>1$ at very high pressure. The most suitable interpretation is that`,
        3,
        ["real_gas_deviation", "molecular_volume"],
        [
          L`the gas is more compressible than ideal because attractions dominate`,
          L`the gas is less compressible than ideal because finite molecular volume and repulsions dominate`,
          L`the gas must have zero molecular size`,
          L`the gas must obey Boyle's law exactly at all pressures`,
        ],
        "B",
        {
          A: L`Attraction-dominated behaviour usually gives $Z<1$, not $Z>1$.`,
          C: L`Finite size is the reason for deviation, not zero size.`,
          D: L`A real gas with $Z>1$ is not obeying ideal behaviour exactly.`,
        },
        [
          L`$Z>1$ means $PV$ is larger than $nRT$.`,
          L`At high pressure, molecules are close together.`,
          L`Repulsions and excluded volume become important.`,
        ],
        [
          {
            explanation: L`At high pressure, molecules occupy a significant fraction of the container volume and short-range repulsions become important. The gas becomes less compressible than an ideal gas, so $Z>1$.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): The ideal gas equation is a limiting law. Reason (R): Real gases approach ideal behaviour when pressure is high and temperature is low.`,
        3,
        ["assertion_reason", "limiting_law"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "C",
        {
          A: L`The reason is false: high pressure and low temperature increase real-gas deviations.`,
          B: L`The reason is not true, so both statements cannot be true.`,
          D: L`The assertion is true because ideal behaviour is approached only as a limiting case.`,
        },
        [
          L`A limiting law is approached under special limiting conditions.`,
          L`High pressure increases crowding.`,
          L`Low temperature makes attractions more important, so the reason is false.`,
        ],
        [
          {
            explanation: L`The assertion is true, but the reason is false. Real gases approach ideal behaviour at low pressure and high temperature, not at high pressure and low temperature.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the physical meaning of $Z=1$ for a gas sample.`,
        1,
        ["compressibility_factor", "ideal_behaviour"],
        onePart(L`Give the meaning.`, 1),
        [
          L`Recall $Z=PV/(nRT)$.`,
          L`Compare observed $PV$ with ideal $nRT$.`,
          L`$Z=1$ means ideal-gas prediction matches.`,
        ],
        [
          {
            part: "a",
            explanation: L`$Z=1$ means the gas sample behaves ideally under the given conditions, so its measured $PV$ equals $nRT$.`,
          },
        ],
        [L`Saying $Z=1$ means one mole of gas only.`],
      ),
      frq(
        "saq",
        L`A gas has $Z=0.82$ at moderate pressure. Is it more or less compressible than an ideal gas? Give the molecular reason.`,
        2,
        ["real_gas_deviation", "attraction_reasoning"],
        parts([
          ["a", L`State whether it is more or less compressible than ideal.`, 1],
          ["b", L`Give the molecular reason.`, 1],
        ]),
        [
          L`Compare $Z$ with $1$.`,
          L`$Z<1$ corresponds to attraction-dominated deviation.`,
          L`Attractions lower pressure and allow easier compression.`,
        ],
        [
          {
            part: "a",
            explanation: L`It is more compressible than an ideal gas.`,
          },
          {
            part: "b",
            explanation: L`Attractive forces between molecules reduce the effective pressure and pull molecules closer, giving $Z<1$.`,
          },
        ],
        [L`Treating every deviation as repulsion-dominated.`],
      ),
      frq(
        "saq",
        L`Use the compressibility-factor figure. Curve A first dips below $Z=1$ and later rises above it. Explain the two regions qualitatively.`,
        2,
        ["figure_reasoning", "compressibility_factor"],
        parts([
          ["a", L`Explain the part below $Z=1$.`, 1],
          ["b", L`Explain the later rise above $Z=1$.`, 1],
        ]),
        [
          L`Below $Z=1$ points to attractions.`,
          L`At higher pressure, molecules come very close.`,
          L`Repulsions and finite volume can dominate later.`,
        ],
        [
          {
            part: "a",
            explanation: L`The dip below $Z=1$ occurs when attractive forces dominate, making the gas more compressible than ideal.`,
          },
          {
            part: "b",
            explanation: L`At higher pressure, finite molecular volume and repulsions dominate, so the gas becomes less compressible and $Z$ rises above $1$.`,
          },
        ],
        [L`Explaining both regions using only attraction or only repulsion.`],
        realGasFigure,
      ),
      frq(
        "laq",
        L`For $0.50$ mol of a gas at $300\,\mathrm{K}$, the measured value of $PV$ is $11.0\,\mathrm{L\,bar}$. Use $R=0.0831\,\mathrm{L\,bar\,mol^{-1}\,K^{-1}}$.`,
        4,
        ["compressibility_factor", "calculation_interpretation"],
        parts([
          ["a", L`Calculate $nRT$.`, 1],
          ["b", L`Calculate $Z$.`, 1],
          ["c", L`State whether attraction or repulsion is dominant.`, 1],
          ["d", L`State whether the gas is more or less compressible than ideal.`, 1],
        ]),
        [
          L`Use $nRT=0.50\times0.0831\times300$.`,
          L`Then $Z=PV/(nRT)$.`,
          L`If $Z<1$, attraction is dominant.`,
        ],
        [
          {
            part: "a",
            explanation: L`The ideal value is`,
            math: L`nRT=0.50\times0.0831\times300=12.465\,\mathrm{L\,bar}`,
          },
          {
            part: "b",
            explanation: L`The compressibility factor is $Z=11.0/12.465\approx0.88$.`,
          },
          {
            part: "c",
            explanation: L`Since $Z<1$, attractive forces are dominant under these conditions.`,
          },
          {
            part: "d",
            explanation: L`The gas is more compressible than an ideal gas.`,
          },
        ],
        [L`Calculating $Z$ but failing to interpret whether it is above or below $1$.`],
        undefined,
        true,
      ),
      frq(
        "case",
        L`A teacher compares two gas samples. Sample X is at low pressure and high temperature. Sample Y is at high pressure and near its liquefaction temperature.`,
        3,
        ["ideal_vs_real", "case_reasoning"],
        parts([
          ["a", L`Which sample behaves more nearly ideally?`, 1],
          ["b", L`Which sample shows stronger intermolecular effects?`, 1],
          ["c", L`Give one reason for each choice.`, 1],
        ]),
        [
          L`Ideal behaviour improves when particles are far apart.`,
          L`Near liquefaction, attractions are strong.`,
          L`High pressure increases crowding.`,
        ],
        [
          {
            part: "a",
            explanation: L`Sample X behaves more nearly ideally.`,
          },
          {
            part: "b",
            explanation: L`Sample Y shows stronger intermolecular effects.`,
          },
          {
            part: "c",
            explanation: L`Low pressure and high temperature reduce the relative effect of molecular attractions and volume in X. High pressure and low temperature near liquefaction make attractions and molecular volume important in Y.`,
          },
        ],
        [L`Thinking low temperature always means ideal because gas particles move more slowly.`],
      ),
    ],
  },
  {
    topicCode: "F.3",
    title: "s-Block Elements: Trends and First-Element Behaviour",
    subtopic:
      "Electronic configuration, radius, ionization enthalpy, hydration enthalpy and general trends in s-block elements.",
    mc: [
      mc(
        L`The general outer electronic configuration of an alkaline earth metal is`,
        2,
        ["s_block_configuration", "group_2"],
        [L`$ns^1$`, L`$ns^2$`, L`$np^1$`, L`$(n-1)d^1ns^2$`],
        "B",
        {
          A: L`$ns^1$ is the general outer configuration of alkali metals.`,
          C: L`$np^1$ belongs to the p-block, not alkaline earth metals.`,
          D: L`This is a transition-metal type pattern, not group 2.`,
        },
        [
          L`Alkaline earth metals are group 2 elements.`,
          L`Group number reflects two valence electrons for main-group metals.`,
          L`Their outer shell has two $s$ electrons.`,
        ],
        [
          {
            explanation: L`Alkaline earth metals are group 2 s-block elements, so their outer electronic configuration is $ns^2$.`,
          },
        ],
      ),
      mc(
        L`Across the same period, a group 2 element generally has a smaller atomic radius than the neighbouring group 1 element because`,
        3,
        ["atomic_radius", "effective_nuclear_charge"],
        [
          L`it has fewer protons`,
          L`it has a greater effective nuclear charge acting on the same shell`,
          L`it has one less electron shell`,
          L`it is always a gas`,
        ],
        "B",
        {
          A: L`The group 2 element has more protons, not fewer.`,
          C: L`Neighbouring group 1 and group 2 elements in the same period have the same number of shells.`,
          D: L`s-block metals are not gases under ordinary conditions.`,
        },
        [
          L`Compare elements in the same period.`,
          L`The number of shells is the same.`,
          L`Greater nuclear pull draws the valence shell closer.`,
        ],
        [
          {
            explanation: L`Across a period, nuclear charge increases while the added electron enters the same shell. The stronger effective nuclear pull makes the group 2 atom smaller than the neighbouring group 1 atom.`,
          },
        ],
      ),
      mc(
        L`Lithium shows comparatively high hydration enthalpy among alkali-metal ions mainly because $\mathrm{Li^+}$`,
        2,
        ["hydration_enthalpy", "lithium"],
        [
          L`has the largest ionic radius in group 1`,
          L`has the smallest size and highest charge density in group 1`,
          L`has a negative charge`,
          L`has two valence electrons`,
        ],
        "B",
        {
          A: L`Lithium ion is the smallest alkali-metal ion, not the largest.`,
          C: L`$\mathrm{Li^+}$ is positively charged.`,
          D: L`Lithium loses one valence electron to form $\mathrm{Li^+}$.`,
        },
        [
          L`Hydration is stronger for smaller, more charge-dense ions.`,
          L`Compare $\mathrm{Li^+}$ with larger group 1 ions.`,
          L`Small size gives strong ion-dipole attraction with water.`,
        ],
        [
          {
            explanation: L`$\mathrm{Li^+}$ is very small, so its charge density is high. Water molecules are attracted strongly, giving high hydration enthalpy.`,
          },
        ],
      ),
      mc(
        L`Compared with sodium, magnesium has a higher first ionization enthalpy mainly because`,
        3,
        ["ionization_enthalpy", "periodic_trend"],
        [
          L`magnesium has a larger atomic radius`,
          L`magnesium is in the p-block`,
          L`magnesium has greater nuclear charge and smaller size in the same period`,
          L`sodium has a completely filled outer shell`,
        ],
        "C",
        {
          A: L`Magnesium is smaller than sodium across the same period.`,
          B: L`Magnesium is an s-block element.`,
          D: L`Sodium has one outer $3s$ electron, not a filled octet in the atom.`,
        },
        [
          L`Both are in period 3.`,
          L`Moving from Na to Mg increases nuclear charge.`,
          L`The outer electron in Mg is held more strongly.`,
        ],
        [
          {
            explanation: L`Magnesium lies to the right of sodium in the same period. Its greater nuclear charge and smaller atomic radius hold the outer electron more strongly, so first ionization enthalpy is higher.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Beryllium shows some diagonal similarity with aluminium. Reason (R): Beryllium and aluminium are placed in the same group of the periodic table.`,
        3,
        ["assertion_reason", "diagonal_relationship"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "C",
        {
          A: L`The reason is false: beryllium and aluminium are diagonally placed, not in the same group.`,
          B: L`The reason is not true, so both statements cannot be true.`,
          D: L`The assertion is true for the Be-Al diagonal relationship.`,
        },
        [
          L`Diagonal relationship occurs between period 2 and period 3 elements.`,
          L`Beryllium is in group 2; aluminium is in group 13.`,
          L`The same-group claim is false even though the diagonal relationship is real.`,
        ],
        [
          {
            explanation: L`The assertion is true, but the reason is false. Beryllium and aluminium show diagonal similarity, but they are not in the same group; beryllium is group 2 and aluminium is group 13.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the common oxidation state of alkali metals and give the reason from electronic configuration.`,
        1,
        ["alkali_metals", "oxidation_state"],
        onePart(L`Give oxidation state and reason.`, 1),
        [
          L`Alkali metals are group 1 elements.`,
          L`Their outer configuration is $ns^1$.`,
          L`They lose one electron to form $\mathrm{M^+}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Alkali metals commonly show $+1$ oxidation state because their outer configuration is $ns^1$ and they readily lose one valence electron.`,
          },
        ],
        [L`Writing $+2$ because they are metals without checking group number.`],
      ),
      frq(
        "saq",
        L`Explain why the atomic radius increases down group 1 even though nuclear charge also increases.`,
        2,
        ["atomic_radius", "group_trend"],
        onePart(L`Give the trend and reason.`, 2),
        [
          L`Down a group, a new shell is added.`,
          L`Inner shells shield the outer electron.`,
          L`The added shell effect outweighs increased nuclear charge.`,
        ],
        [
          {
            part: "a",
            explanation: L`Atomic radius increases down group 1 because each successive element has an additional electron shell. Increased shielding and distance of the valence electron from the nucleus outweigh the increased nuclear charge.`,
          },
        ],
        [L`Using only nuclear charge and predicting a decrease down the group.`],
      ),
      frq(
        "saq",
        L`Use the s-block trend organizer to compare group 1 and group 2 elements in the same period.`,
        2,
        ["figure_reasoning", "s_block_trends"],
        parts([
          ["a", L`Which generally has the smaller radius?`, 1],
          ["b", L`Which generally has the higher first ionization enthalpy?`, 1],
        ]),
        [
          L`Compare same-period neighbours.`,
          L`Group 2 has greater nuclear charge with the same number of shells.`,
          L`Smaller size usually means stronger hold on outer electrons.`,
        ],
        [
          {
            part: "a",
            explanation: L`The group 2 element generally has the smaller radius.`,
          },
          {
            part: "b",
            explanation: L`The group 2 element generally has the higher first ionization enthalpy because its valence electrons are held more strongly.`,
          },
        ],
        [L`Comparing down different groups instead of across the same period.`],
        sBlockTrendFigure,
      ),
      frq(
        "laq",
        L`Lithium differs from the rest of group 1 in several properties. Use size, polarising power and hydration to explain two such differences qualitatively.`,
        4,
        ["unique_first_element", "lithium"],
        parts([
          ["a", L`State why $\mathrm{Li^+}$ has high hydration enthalpy.`, 1],
          ["b", L`State why lithium compounds can show more covalent character.`, 1],
          ["c", L`Connect both features to the small size of lithium ion.`, 1],
          ["d", L`Name the general idea illustrated by lithium's unusual behaviour.`, 1],
        ]),
        [
          L`Lithium ion is the smallest group 1 ion.`,
          L`Small, highly charge-dense ions hydrate strongly and polarise anions.`,
          L`The first element of a group often behaves anomalously.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{Li^+}$ has high hydration enthalpy because its small size gives high charge density and strong ion-dipole attraction with water.`,
          },
          {
            part: "b",
            explanation: L`Lithium compounds can show more covalent character because the small $\mathrm{Li^+}$ ion has strong polarising power.`,
          },
          {
            part: "c",
            explanation: L`Both high hydration enthalpy and polarising power arise from the small ionic radius of $\mathrm{Li^+}$.`,
          },
          {
            part: "d",
            explanation: L`This illustrates the unique or anomalous behaviour of the first element in a group.`,
          },
        ],
        [L`Saying lithium is unusual only because it has the lowest atomic number, without linking to size or charge density.`],
      ),
      frq(
        "case",
        L`A teacher compares sodium and magnesium for a same-period trend demonstration. Both lose electrons to form cations, but magnesium forms $\mathrm{Mg^{2+}}$ more commonly and has a higher first ionization enthalpy than sodium.`,
        3,
        ["s_block_case", "periodic_comparison"],
        parts([
          ["a", L`Write the common cation of sodium.`, 1],
          ["b", L`Write the common cation of magnesium.`, 1],
          ["c", L`Give the reason magnesium has higher first ionization enthalpy.`, 1],
        ]),
        [
          L`Sodium is group 1.`,
          L`Magnesium is group 2.`,
          L`Across a period, nuclear charge increases and radius decreases.`,
        ],
        [
          {
            part: "a",
            explanation: L`Sodium commonly forms $\mathrm{Na^+}$.`,
          },
          {
            part: "b",
            explanation: L`Magnesium commonly forms $\mathrm{Mg^{2+}}$.`,
          },
          {
            part: "c",
            explanation: L`Magnesium has greater nuclear charge and smaller atomic radius than sodium in the same period, so its outer electron is held more strongly.`,
          },
        ],
        [L`Using only metallic character and ignoring same-period effective nuclear charge.`],
      ),
    ],
  },
  {
    topicCode: "F.4",
    title: "p-Block Elements: Trends and Unique First Elements",
    subtopic:
      "p-block configurations, first-element behaviour, periodic trends and qualitative properties across periods and down groups.",
    mc: [
      mc(
        L`The general valence-shell configuration of p-block elements is`,
        2,
        ["p_block_configuration", "valence_shell"],
        [L`$ns^1$`, L`$ns^2np^{1-6}$`, L`$(n-1)d^{1-10}ns^{1-2}$`, L`$nf^{1-14}$`],
        "B",
        {
          A: L`$ns^1$ is characteristic of group 1 s-block elements.`,
          C: L`This is a transition-metal type configuration.`,
          D: L`This is an f-block pattern, not p-block.`,
        },
        [
          L`p-block elements have their differentiating electron in a $p$ subshell.`,
          L`The valence shell includes $s$ and $p$ orbitals.`,
          L`The $p$ subshell can hold $1$ to $6$ electrons in p-block groups.`,
        ],
        [
          {
            explanation: L`p-block elements have general valence-shell configuration $ns^2np^{1-6}$, except helium which is usually placed with noble gases because of its properties.`,
          },
        ],
      ),
      mc(
        L`The first element of a p-block group often differs from the heavier members mainly because it has`,
        2,
        ["first_element_behaviour", "p_block"],
        [
          L`larger size and lower electronegativity`,
          L`small size, high electronegativity and no low-lying d orbitals`,
          L`a filled d subshell`,
          L`metallic character greater than all heavier group members`,
        ],
        "B",
        {
          A: L`First p-block elements are generally smaller and more electronegative than heavier congeners.`,
          C: L`Period 2 elements do not have available low-lying d orbitals.`,
          D: L`First p-block elements are often less metallic, not more metallic.`,
        },
        [
          L`Think of period 2 elements such as B, C, N, O and F.`,
          L`They are small and electronegative.`,
          L`They cannot expand the valence shell using d orbitals.`,
        ],
        [
          {
            explanation: L`First p-block elements are small, have relatively high electronegativity, and lack low-lying d orbitals. These features make them differ from heavier members of their groups.`,
          },
        ],
      ),
      mc(
        L`Carbon forms stable multiple bonds with itself and with oxygen more readily than silicon mainly because carbon`,
        3,
        ["multiple_bonding", "carbon_silicon"],
        [
          L`has a much larger atomic radius than silicon`,
          L`has effective $p\pi-p\pi$ overlap due to small size`,
          L`cannot form covalent bonds`,
          L`has vacant d orbitals for all bonding`,
        ],
        "B",
        {
          A: L`Carbon is smaller than silicon, and that small size improves sideways $p$ orbital overlap.`,
          C: L`Carbon is strongly covalent.`,
          D: L`Carbon does not use vacant d orbitals for its common multiple bonding.`,
        },
        [
          L`Multiple bonding requires effective sideways overlap.`,
          L`Small $2p$ orbitals overlap efficiently.`,
          L`This is a first-element feature of carbon.`,
        ],
        [
          {
            explanation: L`Carbon's small size allows effective $p\pi-p\pi$ overlap, so it forms stable multiple bonds such as $\mathrm{C=C}$ and $\mathrm{C=O}$ more readily than silicon.`,
          },
        ],
      ),
      mc(
        L`Down a p-block group, metallic character generally`,
        2,
        ["metallic_character", "group_trend"],
        [
          L`increases because atomic size increases and ionization enthalpy generally decreases`,
          L`decreases because atomic size increases`,
          L`remains exactly constant because valence configuration is similar`,
          L`becomes zero for all heavier elements`,
        ],
        "A",
        {
          B: L`Increasing size and lower ionization enthalpy favour loss of electrons, so metallic character increases.`,
          C: L`Similar valence configuration does not prevent gradual trend changes down a group.`,
          D: L`Several heavier p-block elements are metals or metalloids.`,
        },
        [
          L`Metallic character is linked to ease of electron loss.`,
          L`Down a group, radius increases.`,
          L`Ionization enthalpy generally decreases down a group.`,
        ],
        [
          {
            explanation: L`Down a p-block group, larger atomic size and lower ionization enthalpy generally make electron loss easier, so metallic character increases.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Nitrogen does not form $\mathrm{NCl_5}$ under ordinary conditions. Reason (R): Nitrogen has high electronegativity compared with heavier group 15 elements.`,
        3,
        ["assertion_reason", "octet_expansion"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "B",
        {
          A: L`The reason is true, but the direct explanation here is absence of vacant low-lying d orbitals and inability to expand the octet.`,
          C: L`The reason is true for nitrogen compared with heavier congeners.`,
          D: L`The assertion is also true under ordinary conditions.`,
        },
        [
          L`Compare nitrogen with heavier group 15 elements.`,
          L`The reason is a true first-element feature.`,
          L`But the direct reason for no $\mathrm{NCl_5}$ is the octet limitation.`,
        ],
        [
          {
            explanation: L`Both statements are true, but the reason does not directly explain the assertion. Nitrogen does have relatively high electronegativity, but $\mathrm{NCl_5}$ is not formed because nitrogen cannot expand its octet due to absence of vacant low-lying d orbitals.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why is helium placed with noble gases although its electronic configuration is $1s^2$?`,
        1,
        ["helium_placement", "noble_gases"],
        onePart(L`Give the reason based on properties.`, 1),
        [
          L`Helium has a completely filled shell.`,
          L`Noble gases are chemically inert.`,
          L`Classification also considers properties, not only block label.`,
        ],
        [
          {
            part: "a",
            explanation: L`Helium has a completely filled valence shell and shows noble-gas inertness, so it is placed with noble gases despite having an $s^2$ configuration.`,
          },
        ],
        [L`Classifying helium only from the subshell label and ignoring chemical behaviour.`],
      ),
      frq(
        "saq",
        L`Use the p-block first-element behaviour board to explain why carbon differs from silicon in multiple bonding.`,
        2,
        ["figure_reasoning", "multiple_bonding"],
        parts([
          ["a", L`State the size-related reason.`, 1],
          ["b", L`State the bonding consequence.`, 1],
        ]),
        [
          L`Carbon is the first element of group 14.`,
          L`Small $2p$ orbitals overlap sidewise effectively.`,
          L`This supports stable multiple bonds.`,
        ],
        [
          {
            part: "a",
            explanation: L`Carbon is smaller than silicon, so its $2p$ orbitals overlap more effectively sidewise.`,
          },
          {
            part: "b",
            explanation: L`Effective $p\pi-p\pi$ overlap makes carbon form stable multiple bonds such as $\mathrm{C=C}$ and $\mathrm{C=O}$ more readily.`,
          },
        ],
        [L`Saying silicon cannot form bonds, instead of comparing the effectiveness of multiple bonding.`],
        pBlockTrendFigure,
      ),
      frq(
        "saq",
        L`Explain why metallic character increases down group 13 from boron to thallium in a qualitative sense.`,
        2,
        ["metallic_character", "group_13"],
        onePart(L`Give the trend and reason.`, 2),
        [
          L`Down a group, atomic size increases.`,
          L`Ionization enthalpy generally decreases.`,
          L`Losing electrons becomes easier, so metallic character increases.`,
        ],
        [
          {
            part: "a",
            explanation: L`Metallic character increases down group 13 because atomic size increases and ionization enthalpy generally decreases. The outer electrons are less strongly held, so electron loss and metallic behaviour become more favourable.`,
          },
        ],
        [L`Using the same valence configuration to claim no trend down the group.`],
      ),
      frq(
        "laq",
        L`The first element of a p-block group often shows anomalous behaviour. Explain this using nitrogen or oxygen as an example.`,
        4,
        ["first_element_behaviour", "p_block_application"],
        parts([
          ["a", L`State two general causes of anomalous first-element behaviour.`, 2],
          ["b", L`Apply one cause to nitrogen or oxygen.`, 1],
          ["c", L`State one chemical consequence.`, 1],
        ]),
        [
          L`Use small size and high electronegativity.`,
          L`Also use absence of low-lying d orbitals.`,
          L`Connect the cause to a real bonding consequence.`,
        ],
        [
          {
            part: "a",
            explanation: L`The first p-block element is small, has high electronegativity and lacks vacant low-lying d orbitals.`,
          },
          {
            part: "b",
            explanation: L`For nitrogen, absence of available d orbitals means it cannot expand its octet.`,
          },
          {
            part: "c",
            explanation: L`Therefore nitrogen does not form $\mathrm{NCl_5}$ under ordinary conditions, unlike heavier group 15 elements that can show expanded valence in suitable compounds.`,
          },
        ],
        [L`Listing properties without connecting them to an example or consequence.`],
      ),
      frq(
        "case",
        L`A student compares period 2 and period 3 p-block elements. Carbon forms stable $\mathrm{C=C}$ bonds, while silicon more commonly forms strong $\mathrm{Si-O-Si}$ networks rather than stable $\mathrm{Si=Si}$ chains under ordinary school-level examples.`,
        3,
        ["p_block_case", "periodic_comparison"],
        parts([
          ["a", L`Name the type of orbital overlap responsible for stable carbon multiple bonds.`, 1],
          ["b", L`Why is this overlap less effective for silicon?`, 1],
          ["c", L`State the broader trend idea illustrated.`, 1],
        ]),
        [
          L`Multiple bonds involve pi overlap.`,
          L`Larger atoms have poorer sideways overlap of p orbitals.`,
          L`This is a first-element difference in a p-block group.`,
        ],
        [
          {
            part: "a",
            explanation: L`Stable carbon multiple bonds involve effective $p\pi-p\pi$ overlap.`,
          },
          {
            part: "b",
            explanation: L`Silicon atoms are larger, so sideways overlap of $3p$ orbitals is less effective than overlap of carbon $2p$ orbitals.`,
          },
          {
            part: "c",
            explanation: L`The example illustrates unique first-element behaviour in p-block groups.`,
          },
        ],
        [L`Explaining the difference only by saying carbon is non-metal and silicon is metalloid.`],
      ),
    ],
  },
];

export const chemistry11FormativeReinforcementTopics: Topic[] =
  topicSeeds.map(makeTopic);
