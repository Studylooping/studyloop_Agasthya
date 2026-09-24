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
import { calibrateCbsePhysicsDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-physics-11";
const UNIT = "u9-kinetic-theory";
const VERSION = "0.1.5";
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck whether the question is about state variables, molecular kinetic energy, rms speed, degrees of freedom, or number density.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_kinetic_theory_reasoning"),
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
    contentId: `${COURSE}.u9.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_checking_absolute_temperature_or_molecular_mass",
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
    contentId: `${COURSE}.u9.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "mixes_macroscopic_gas_laws_with_molecular_kinetic_interpretation",
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

const constantPressureCompressionFigure: ItemFigure = {
  type: "svg",
  title: "Constant-pressure compression on a pressure-volume graph",
  description:
    "A P-V graph showing a gas compressed at pressure 2.0 x 10^5 Pa from volume 5.0 x 10^-3 m^3 to 2.0 x 10^-3 m^3.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-pv-u9" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
    <pattern id="shade-pv-u9" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 8 L8 0" stroke="#93c5fd" stroke-width="2"/>
    </pattern>
  </defs>
  <line x1="90" y1="340" x2="590" y2="340" stroke="#334155" stroke-width="2" marker-end="url(#arrow-pv-u9)"/>
  <line x1="90" y1="340" x2="90" y2="65" stroke="#334155" stroke-width="2" marker-end="url(#arrow-pv-u9)"/>
  <text x="300" y="382" font-size="18" fill="#0f172a">V (10^-3 m^3)</text>
  <text x="30" y="210" font-size="18" fill="#0f172a">P (10^5 Pa)</text>
  <line x1="90" y1="180" x2="545" y2="180" stroke="#2563eb" stroke-width="4"/>
  <rect x="238" y="180" width="222" height="160" fill="url(#shade-pv-u9)" opacity="0.9"/>
  <line x1="238" y1="180" x2="238" y2="340" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="460" y1="180" x2="460" y2="340" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="460" cy="180" r="6" fill="#2563eb"/>
  <circle cx="238" cy="180" r="6" fill="#2563eb"/>
  <path d="M442 156 L274 156" stroke="#f97316" stroke-width="4" marker-end="url(#arrow-pv-u9)"/>
  <text x="82" y="184" font-size="16" text-anchor="end" fill="#0f172a">2.0</text>
  <text x="232" y="366" font-size="16" text-anchor="middle" fill="#0f172a">2.0</text>
  <text x="460" y="366" font-size="16" text-anchor="middle" fill="#0f172a">5.0</text>
  <text x="330" y="132" font-size="16" text-anchor="middle" fill="#c2410c">compression</text>
</svg>`,
};

const variablePressureWorkFigure: ItemFigure = {
  type: "svg",
  title: "Work from area under a P-V graph",
  description:
    "A straight-line expansion path from pressure 1.0 x 10^5 Pa at volume 1.0 x 10^-3 m^3 to pressure 3.0 x 10^5 Pa at volume 4.0 x 10^-3 m^3.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-varpv-u9" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="90" y1="340" x2="590" y2="340" stroke="#334155" stroke-width="2" marker-end="url(#arrow-varpv-u9)"/>
  <line x1="90" y1="340" x2="90" y2="55" stroke="#334155" stroke-width="2" marker-end="url(#arrow-varpv-u9)"/>
  <text x="300" y="382" font-size="18" fill="#0f172a">V (10^-3 m^3)</text>
  <text x="30" y="210" font-size="18" fill="#0f172a">P (10^5 Pa)</text>
  <polygon points="170,260 470,100 470,340 170,340" fill="#bfdbfe" opacity="0.65"/>
  <line x1="170" y1="260" x2="470" y2="100" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-varpv-u9)"/>
  <line x1="170" y1="260" x2="170" y2="340" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="470" y1="100" x2="470" y2="340" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="90" y1="260" x2="170" y2="260" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="90" y1="100" x2="470" y2="100" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="170" cy="260" r="6" fill="#2563eb"/>
  <circle cx="470" cy="100" r="6" fill="#2563eb"/>
  <text x="82" y="265" font-size="16" text-anchor="end" fill="#0f172a">1.0</text>
  <text x="82" y="105" font-size="16" text-anchor="end" fill="#0f172a">3.0</text>
  <text x="170" y="366" font-size="16" text-anchor="middle" fill="#0f172a">1.0</text>
  <text x="470" y="366" font-size="16" text-anchor="middle" fill="#0f172a">4.0</text>
</svg>`,
};

const molecularPressureFigure: ItemFigure = {
  type: "svg",
  title: "Molecule colliding with a container wall",
  description:
    "A molecule in a cubic container approaches a wall with horizontal component of velocity vx.",
  svg: `<svg viewBox="0 0 660 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="380" fill="#ffffff"/>
  <defs>
    <marker id="arrow-molecule-u9" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <polygon points="145,105 430,105 520,165 235,165" fill="#eef2ff" stroke="#334155" stroke-width="2"/>
  <polygon points="235,165 520,165 520,300 235,300" fill="#dbeafe" stroke="#334155" stroke-width="2"/>
  <polygon points="145,105 235,165 235,300 145,240" fill="#eff6ff" stroke="#334155" stroke-width="2"/>
  <circle cx="335" cy="230" r="12" fill="#f97316"/>
  <line x1="335" y1="230" x2="500" y2="230" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-molecule-u9)"/>
  <line x1="520" y1="165" x2="520" y2="300" stroke="#ef4444" stroke-width="5"/>
  <text x="402" y="219" font-size="17" fill="#1d4ed8">v_x</text>
  <text x="532" y="238" font-size="17" fill="#b91c1c">wall</text>
</svg>`,
};

const rmsComparisonFigure: ItemFigure = {
  type: "svg",
  title: "Same-temperature gas samples with different molar masses",
  description:
    "Two gas samples X and Y at the same temperature. X has molar mass 4 g per mol and Y has molar mass 16 g per mol.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <rect x="120" y="80" width="160" height="180" rx="12" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="380" y="80" width="160" height="180" rx="12" fill="#fef3c7" stroke="#334155" stroke-width="3"/>
  <text x="200" y="124" font-size="24" text-anchor="middle" fill="#1d4ed8">X</text>
  <text x="460" y="124" font-size="24" text-anchor="middle" fill="#92400e">Y</text>
  <text x="200" y="170" font-size="17" text-anchor="middle" fill="#0f172a">M = 4 g mol^-1</text>
  <text x="460" y="170" font-size="17" text-anchor="middle" fill="#0f172a">M = 16 g mol^-1</text>
  <text x="200" y="215" font-size="17" text-anchor="middle" fill="#0f172a">T = 300 K</text>
  <text x="460" y="215" font-size="17" text-anchor="middle" fill="#0f172a">T = 300 K</text>
  <circle cx="166" cy="245" r="5" fill="#2563eb"/>
  <circle cx="211" cy="235" r="5" fill="#2563eb"/>
  <circle cx="238" cy="250" r="5" fill="#2563eb"/>
  <circle cx="426" cy="245" r="5" fill="#d97706"/>
  <circle cx="471" cy="235" r="5" fill="#d97706"/>
  <circle cx="498" cy="250" r="5" fill="#d97706"/>
</svg>`,
};

const meanFreePathFigure: ItemFigure = {
  type: "svg",
  title: "Gas samples with different number densities",
  description:
    "Two equal-volume gas chambers at the same temperature. Chamber A has fewer molecules drawn than chamber B.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <rect x="70" y="70" width="240" height="220" rx="10" fill="#eff6ff" stroke="#334155" stroke-width="3"/>
  <rect x="390" y="70" width="240" height="220" rx="10" fill="#fff7ed" stroke="#334155" stroke-width="3"/>
  <text x="190" y="55" font-size="21" text-anchor="middle" fill="#0f172a">Chamber A</text>
  <text x="510" y="55" font-size="21" text-anchor="middle" fill="#0f172a">Chamber B</text>
  <text x="190" y="318" font-size="16" text-anchor="middle" fill="#0f172a">same volume and temperature</text>
  <text x="510" y="318" font-size="16" text-anchor="middle" fill="#0f172a">same volume and temperature</text>
  <circle cx="125" cy="125" r="7" fill="#2563eb"/>
  <circle cx="220" cy="165" r="7" fill="#2563eb"/>
  <circle cx="165" cy="235" r="7" fill="#2563eb"/>
  <circle cx="270" cy="245" r="7" fill="#2563eb"/>
  <circle cx="435" cy="112" r="7" fill="#f97316"/>
  <circle cx="488" cy="105" r="7" fill="#f97316"/>
  <circle cx="545" cy="126" r="7" fill="#f97316"/>
  <circle cx="596" cy="116" r="7" fill="#f97316"/>
  <circle cx="425" cy="175" r="7" fill="#f97316"/>
  <circle cx="480" cy="170" r="7" fill="#f97316"/>
  <circle cx="535" cy="182" r="7" fill="#f97316"/>
  <circle cx="590" cy="168" r="7" fill="#f97316"/>
  <circle cx="455" cy="238" r="7" fill="#f97316"/>
  <circle cx="510" cy="230" r="7" fill="#f97316"/>
  <circle cx="570" cy="245" r="7" fill="#f97316"/>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "9.1",
    title: "Perfect Gas Equation and Compression Work",
    subtopic:
      "Equation of state of a perfect gas, gas-law proportional reasoning, P-V graphs, and work done in compression or expansion.",
    mc: [
      {
        questionLatex: L`A vessel contains $2.0\text{ mol}$ of an ideal gas at $300\text{ K}$ in a volume of $5.0\times10^{-2}\text{ m}^3$. Taking $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$, the pressure is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["ideal_gas_equation", "pressure_calculation"],
        choices: [
          L`$1.0\times10^5\text{ Pa}$`,
          L`$2.5\times10^4\text{ Pa}$`,
          L`$5.0\times10^5\text{ Pa}$`,
          L`$1.0\times10^3\text{ Pa}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is too small because the amount of gas and temperature have both not been included correctly.",
          C: "This is what you would get from a much smaller volume.",
          D: "This misses the power of ten in the volume conversion.",
        },
        hints: [
          L`Use $PV=nRT$.`,
          L`Solve $P=nRT/V$.`,
          L`Compute $2(8.3)(300)/(5.0\times10^{-2})$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Using the ideal gas equation,",
            math: L`P=\frac{nRT}{V}=\frac{2(8.3)(300)}{5.0\times10^{-2}}\approx 1.0\times10^5\text{ Pa}`,
          },
        ],
      },
      {
        questionLatex: L`The gas in the figure is compressed at constant pressure from $5.0\times10^{-3}\text{ m}^3$ to $2.0\times10^{-3}\text{ m}^3$. The work done on the gas is`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: constantPressureCompressionFigure,
        skillTags: ["pv_work", "compression_work", "graph_area"],
        choices: [
          L`$-600\text{ J}$`,
          L`$600\text{ J}$`,
          L`$1.0\times10^3\text{ J}$`,
          L`$6.0\times10^{-3}\text{ J}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This is the sign for work done by the gas during compression, not work done on the gas.",
          C: "This uses the final volume instead of the change in volume.",
          D: "This forgets that the pressure scale is in pascal, not just the plotted number 2.",
        },
        hints: [
          L`For constant pressure, work magnitude is $P\Delta V$.`,
          L`Compression means work done on the gas is positive.`,
          L`Use $2.0\times10^5(3.0\times10^{-3})$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The work done on the gas is the area under the P-V curve for the decrease in volume.",
            math: L`W_{\text{on}}=P(V_i-V_f)=2.0\times10^5(3.0\times10^{-3})=600\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`For a fixed mass of ideal gas, the absolute temperature is doubled and the volume is halved. The new pressure is`,
        difficulty: 2,
        skillTags: ["ideal_gas_law", "proportional_reasoning"],
        choices: [
          L`twice the initial pressure`,
          L`unchanged`,
          L`four times the initial pressure`,
          L`one-fourth of the initial pressure`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This accounts for the temperature change but ignores the halving of volume.",
          B: "Both temperature and volume changes affect pressure.",
          D: "This reverses the proportionality with temperature and volume.",
        },
        hints: [
          L`For fixed $n$, $P\propto T/V$.`,
          L`Doubling $T$ doubles $P$ if $V$ is fixed.`,
          L`Halving $V$ doubles $P$ again.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For fixed amount of gas,",
            math: L`\frac{P_2}{P_1}=\frac{T_2}{T_1}\frac{V_1}{V_2}=2\times2=4`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): For a fixed amount of ideal gas, $P$, $V$, and $T$ are thermodynamic state variables. Reason (R): The relation $PV=nRT$ connects equilibrium values of pressure, volume, and absolute temperature.`,
        difficulty: 3,
        skillTags: [
          "assertion_reason",
          "state_variables",
          "ideal_gas_equation",
        ],
        choices: [
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
          L`A is false but R is true`,
          L`Both A and R are true, and R explains A`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The ideal gas equation directly shows how the equilibrium state variables are connected.",
          B: "The reason is a correct statement of the equation of state for an ideal gas.",
          C: "Pressure, volume, and absolute temperature are state variables for a gas in equilibrium.",
        },
        hints: [
          L`A state variable depends only on the state, not the path.`,
          L`The ideal gas equation is an equation of state.`,
          L`The reason links the variables in an equilibrium state.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true. The equation of state connects the equilibrium state variables, so the reason explains the assertion.",
          },
        ],
      },
      {
        questionLatex: L`At constant temperature, the graph of $P$ against $1/V$ for a fixed amount of ideal gas is`,
        difficulty: 2,
        skillTags: ["boyle_law", "graph_interpretation"],
        choices: [
          L`a straight line through the origin`,
          L`a rectangular hyperbola`,
          L`a horizontal straight line`,
          L`a vertical straight line`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The P-V graph is a rectangular hyperbola, but P against 1/V is linear.",
          C: "Pressure is not constant when volume changes at constant temperature.",
          D: "A vertical line would mean one value of 1/V for many pressures.",
        },
        hints: [
          L`At constant $T$, $PV=\text{constant}$.`,
          L`Rewrite it as $P=(nRT)(1/V)$.`,
          L`This is of the form $y=mx$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For fixed amount at constant temperature,",
            math: L`P=nRT\left(\frac{1}{V}\right)`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`For one mole of an ideal gas at $300\text{ K}$, find the value of $PV$. Take $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        difficulty: 1,
        calculatorAllowed: true,
        skillTags: ["ideal_gas_equation"],
        parts: [{ letter: "a", promptMarkdown: "Find $PV$.", points: 1 }],
        hints: [L`Use $PV=nRT$.`, L`Here $n=1$.`, L`Multiply $8.3$ by $300$.`],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $PV=2.49\\times10^3\\text{ J}$.",
            },
          ],
        },
        commonErrors: [L`Using Celsius temperature instead of kelvin.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$PV=nRT=1(8.3)(300)=2.49\times10^3\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A sample of $0.50\text{ mol}$ ideal gas is at $300\text{ K}$ and $1.0\times10^5\text{ Pa}$. Take $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["ideal_gas_equation", "charles_law"],
        parts: [
          { letter: "a", promptMarkdown: "Find its volume.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "If the pressure is kept constant and the temperature is doubled, find the new volume.",
            points: 1,
          },
        ],
        hints: [
          L`Use $V=nRT/P$.`,
          L`At constant pressure, $V\propto T$.`,
          L`Doubling absolute temperature doubles volume.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1.245\\times10^{-2}\\text{ m}^3$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $2.49\\times10^{-2}\\text{ m}^3$.",
            },
          ],
        },
        commonErrors: [
          L`Doubling Celsius temperature instead of absolute temperature.`,
          L`Putting pressure in the numerator.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$V=\frac{nRT}{P}=\frac{0.50(8.3)(300)}{1.0\times10^5}=1.245\times10^{-2}\text{ m}^3$.`,
          },
          {
            part: "b",
            explanation: L`At constant pressure, $V\propto T$, so $V_2=2V_1=2.49\times10^{-2}\text{ m}^3$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas expands along the straight-line path shown in the P-V graph.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: variablePressureWorkFigure,
        skillTags: ["pv_work", "graph_area"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the change in volume.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work done by the gas.",
            points: 1,
          },
        ],
        hints: [
          L`Work done by a gas is the area under the P-V graph.`,
          L`For a straight line, use average pressure times change in volume.`,
          L`Average pressure is $(1.0+3.0)\times10^5/2$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $\Delta V=3.0\times10^{-3}\text{ m}^3$.`,
            },
            {
              part: "b",
              points: 1,
              description: "Finds work done as $600\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Using only final pressure instead of average pressure.`,
          L`Forgetting the $10^{-3}$ volume scale.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\Delta V=(4.0-1.0)\times10^{-3}=3.0\times10^{-3}\text{ m}^3$.`,
          },
          {
            part: "b",
            explanation: L`$W=P_{\text{avg}}\Delta V=\frac{(1.0+3.0)\times10^5}{2}(3.0\times10^{-3})=600\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`One mole of an ideal gas is initially at $300\text{ K}$ and $1.0\times10^5\text{ Pa}$. It is compressed at constant pressure until its volume becomes two-thirds of the initial volume. It is then heated at constant volume until its pressure becomes $2.0\times10^5\text{ Pa}$. Take $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "ideal_gas_equation",
          "compression_work",
          "process_reasoning",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the initial volume.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the temperature after constant-pressure compression.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the final temperature after constant-volume heating.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the work done on the gas during compression.",
            points: 1,
          },
        ],
        hints: [
          L`Use $V=nRT/P$ for the initial state.`,
          L`At constant pressure, $V\propto T$. At constant volume, $P\propto T$.`,
          L`Work done on the gas in constant-pressure compression is $P(V_i-V_f)$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $V_i=2.49\\times10^{-2}\\text{ m}^3$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $T=200\\text{ K}$ after compression.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds final temperature $400\\text{ K}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Finds compression work on gas as about $830\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Assuming temperature remains constant during constant-pressure compression.`,
          L`Giving work done by the gas instead of work done on the gas.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$V_i=\frac{RT}{P}=\frac{8.3(300)}{1.0\times10^5}=2.49\times10^{-2}\text{ m}^3$.`,
          },
          {
            part: "b",
            explanation: L`At constant pressure, $T\propto V$, so $T=300(2/3)=200\text{ K}$.`,
          },
          {
            part: "c",
            explanation: L`At constant volume, $T\propto P$, so $T_f=200(2.0\times10^5/1.0\times10^5)=400\text{ K}$.`,
          },
          {
            part: "d",
            explanation: L`$W_{\text{on}}=P(V_i-V_f)=P(V_i/3)=1.0\times10^5(2.49\times10^{-2}/3)\approx 830\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A gas sample is initially at $1.0\text{ atm}$, $2.0\text{ L}$ and $300\text{ K}$. Step I: it is compressed isothermally to $1.0\text{ L}$. Step II: at this fixed volume, it is heated to $450\text{ K}$.`,
        difficulty: 4,
        skillTags: [
          "combined_gas_law",
          "compression_work",
          "process_identification",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the pressure after Step I.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the pressure after Step II.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the sign of work done by the gas in Step I.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "State the work done by the gas in Step II.",
            points: 1,
          },
        ],
        hints: [
          L`In Step I, $T$ is constant, so $PV$ is constant.`,
          L`In Step II, $V$ is constant, so $P\propto T$.`,
          L`No volume change means no P-V work.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $2.0\\text{ atm}$." },
            { part: "b", points: 1, description: "Finds $3.0\\text{ atm}$." },
            {
              part: "c",
              points: 1,
              description:
                "States work done by gas is negative in compression.",
            },
            {
              part: "d",
              points: 1,
              description:
                "States work done by gas is zero at constant volume.",
            },
          ],
        },
        commonErrors: [
          L`Using Celsius-style temperature ratios.`,
          L`Saying pressure stays $2\text{ atm}$ during constant-volume heating.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Isothermal compression gives $P_1V_1=P_2V_2$, so $P_2=1.0(2.0/1.0)=2.0\text{ atm}$.`,
          },
          {
            part: "b",
            explanation: L`At fixed volume, $P\propto T$, so $P_3=2.0(450/300)=3.0\text{ atm}$.`,
          },
          {
            part: "c",
            explanation:
              "During compression, the gas volume decreases, so work done by the gas is negative.",
          },
          {
            part: "d",
            explanation:
              "Step II has no volume change, so the P-V work done by the gas is zero.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.2",
    title: "Kinetic Theory Assumptions and Pressure",
    subtopic:
      "Ideal-gas assumptions, molecular collisions with container walls, pressure from momentum transfer, and the relation between pressure, density, and rms speed.",
    mc: [
      {
        questionLatex: L`Which statement is an assumption of the kinetic theory of an ideal gas?`,
        difficulty: 1,
        skillTags: ["kinetic_theory_assumptions"],
        choices: [
          L`Molecules attract one another strongly at all separations`,
          L`The volume of the molecules is negligible compared with the volume of the container`,
          L`Collisions between molecules are perfectly inelastic`,
          L`All molecules move with the same velocity at every instant`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Ideal-gas theory neglects intermolecular forces except during collisions.",
          C: "Ideal-gas collisions are assumed elastic.",
          D: "Molecules have a distribution of speeds, not one identical velocity.",
        },
        hints: [
          L`Think of a dilute gas model.`,
          L`The molecules are treated almost like point particles.`,
          L`Elastic collisions and negligible molecular volume are key assumptions.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The ideal-gas model assumes molecular size is negligible compared with the container volume and collisions are elastic.",
          },
        ],
      },
      {
        questionLatex: L`In the kinetic theory explanation of gas pressure, pressure on a wall is produced mainly by`,
        difficulty: 2,
        figure: molecularPressureFigure,
        skillTags: ["gas_pressure", "molecular_collisions"],
        choices: [
          L`weight of the gas molecules pressing downward only`,
          L`attractive force between gas molecules and the wall at rest`,
          L`change in momentum of molecules during elastic collisions with the wall`,
          L`conversion of molecular mass into energy at the wall`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Gas pressure acts on all walls, not only downward due to weight.",
          B: "The ideal-gas pressure explanation uses collisions, not a static attraction.",
          D: "No mass-energy conversion is involved in ordinary gas pressure.",
        },
        hints: [
          L`A molecule rebounds from the wall.`,
          L`A rebound means momentum changes.`,
          L`Force is rate of change of momentum.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Molecules colliding elastically with the wall reverse the normal component of momentum. The rate of momentum transfer gives force, and force per area gives pressure.",
          },
        ],
      },
      {
        questionLatex: L`A gas has density $1.2\text{ kg m}^{-3}$ and rms speed $500\text{ m s}^{-1}$. Using $P=\frac13\rho v_{\text{rms}}^2$, its pressure is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["kinetic_pressure_equation", "rms_speed"],
        choices: [
          L`$3.0\times10^5\text{ Pa}$`,
          L`$2.0\times10^4\text{ Pa}$`,
          L`$6.0\times10^5\text{ Pa}$`,
          L`$1.0\times10^5\text{ Pa}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This omits the factor $1/3$.",
          B: "This uses speed instead of speed squared.",
          C: "This doubles the result after already omitting the factor $1/3$.",
        },
        hints: [
          L`Substitute into $P=\frac13\rho v^2$.`,
          L`Square $500$.`,
          L`Compute $\frac13(1.2)(250000)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Using the kinetic pressure relation,",
            math: L`P=\frac13(1.2)(500)^2=1.0\times10^5\text{ Pa}`,
          },
        ],
      },
      {
        questionLatex: L`If the density of a gas remains the same but its rms speed is doubled, its pressure becomes`,
        difficulty: 2,
        skillTags: ["kinetic_pressure_equation", "proportional_reasoning"],
        choices: [
          L`four times as large`,
          L`twice as large`,
          L`half as large`,
          L`unchanged`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Pressure depends on the square of rms speed, not directly on speed.",
          C: "Increasing molecular speed increases pressure.",
          D: "Pressure changes because momentum transfer per collision and collision rate change.",
        },
        hints: [
          L`Use $P=\frac13\rho v_{\text{rms}}^2$.`,
          L`Density is fixed.`,
          L`Doubling speed makes speed squared four times as large.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "With density fixed,",
            math: L`P\propto v_{\text{rms}}^2\Rightarrow P_2/P_1=2^2=4`,
          },
        ],
      },
      {
        questionLatex: L`An ideal-gas model is least reliable for a real gas when the gas is`,
        difficulty: 3,
        skillTags: ["ideal_gas_limitations", "kinetic_theory_assumptions"],
        choices: [
          L`at low pressure and high temperature`,
          L`at high pressure and low temperature`,
          L`very dilute and far from liquefaction`,
          L`in a large container at ordinary pressure`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Low pressure and high temperature make intermolecular effects less important.",
          C: "A dilute gas far from liquefaction is usually closer to ideal behaviour.",
          D: "A large dilute sample can still behave nearly ideally.",
        },
        hints: [
          L`Ideal theory neglects molecular size and attractive forces.`,
          L`Real molecules matter more when they are close together.`,
          L`Low temperature makes attractions more important.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At high pressure molecules are closer together, and at low temperature intermolecular attractions become more important, so ideal-gas assumptions fail more strongly.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the kinetic-theory relation between pressure $P$, density $\rho$, and rms speed $v_{\text{rms}}$ of gas molecules.`,
        difficulty: 1,
        skillTags: ["kinetic_pressure_equation"],
        parts: [
          { letter: "a", promptMarkdown: "Write the relation.", points: 1 },
        ],
        hints: [
          L`Pressure is proportional to density.`,
          L`Pressure is proportional to mean square speed.`,
          L`The numerical factor is $1/3$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $P=\\frac13\\rho v_{\\text{rms}}^2$.",
            },
          ],
        },
        commonErrors: [
          L`Writing a direct proportionality with $v_{\text{rms}}$ instead of $v_{\text{rms}}^2$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The required relation is $P=\frac13\rho v_{\text{rms}}^2$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Air at a certain condition has pressure $1.0\times10^5\text{ Pa}$ and density $1.2\text{ kg m}^{-3}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["kinetic_pressure_equation", "rms_speed"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the rms speed of the molecules.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State whether the calculated speed is the speed of every molecule.",
            points: 1,
          },
        ],
        hints: [
          L`Use $v_{\text{rms}}=\sqrt{3P/\rho}$.`,
          L`Substitute $P=1.0\times10^5$ and $\rho=1.2$.`,
          L`Rms speed is a statistical measure.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $v_{\\text{rms}}=500\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States it is not the speed of every molecule.",
            },
          ],
        },
        commonErrors: [
          L`Forgetting the square root.`,
          L`Assuming every molecule has the rms speed.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$v_{\text{rms}}=\sqrt{3P/\rho}=\sqrt{3(1.0\times10^5)/1.2}=500\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation:
              "No. Molecules have a range of speeds; rms speed is a statistical measure.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A sealed rigid container of gas is heated. Explain, using molecular motion, why the pressure increases.`,
        difficulty: 3,
        skillTags: [
          "molecular_interpretation",
          "pressure_temperature_relation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State what happens to the average molecular kinetic energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why pressure increases.",
            points: 1,
          },
        ],
        hints: [
          L`Temperature measures average translational kinetic energy.`,
          L`Higher kinetic energy means higher molecular speeds.`,
          L`In a rigid container, faster molecules transfer more momentum to the walls per second.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States average molecular kinetic energy increases.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Connects faster collisions and greater momentum transfer rate to higher pressure.",
            },
          ],
        },
        commonErrors: [
          L`Saying pressure increases because molecules become larger.`,
          L`Ignoring that the container volume is fixed.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The average translational kinetic energy of the molecules increases.",
          },
          {
            part: "b",
            explanation:
              "Molecules strike the walls faster and more effectively, so the rate of momentum transfer to the walls increases. Hence pressure increases.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the kinetic theory model to obtain the pressure relation for an ideal gas in a cube of side $L$. Consider molecules of mass $m$ and use the mean square speed in the final result.`,
        difficulty: 5,
        skillTags: ["pressure_derivation", "kinetic_theory_assumptions"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the change in momentum when a molecule with velocity component $v_x$ elastically hits a wall perpendicular to the x-axis.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the time between two successive hits of that molecule on the same wall.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the force contribution of that molecule on the wall.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Use isotropy to obtain $P=\\frac13\\rho v_{\\text{rms}}^2$.",
            points: 2,
          },
        ],
        hints: [
          L`The x-component reverses in an elastic wall collision.`,
          L`The molecule travels distance $2L$ before hitting the same wall again.`,
          L`Use $v_x^2+v_y^2+v_z^2=v^2$ and isotropy.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes momentum change magnitude $2mv_x$.",
            },
            {
              part: "b",
              points: 1,
              description: "Writes time interval $2L/v_x$.",
            },
            {
              part: "c",
              points: 1,
              description: "Obtains force contribution $mv_x^2/L$.",
            },
            {
              part: "d",
              points: 2,
              description:
                "Sums over molecules and uses isotropy to obtain $P=\\frac13\\rho v_{\\text{rms}}^2$.",
            },
          ],
        },
        commonErrors: [
          L`Using $mv_x$ instead of $2mv_x$ for momentum change.`,
          L`Forgetting to divide force by wall area.`,
          L`Skipping the factor $1/3$ from isotropy.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The x-component changes from $mv_x$ to $-mv_x$, so the magnitude of change is $2mv_x$.`,
          },
          {
            part: "b",
            explanation: L`The molecule travels $2L$ between hits on the same wall, so $\Delta t=2L/v_x$.`,
          },
          {
            part: "c",
            explanation: L`The average force contribution is $F=\frac{2mv_x}{2L/v_x}=\frac{mv_x^2}{L}$.`,
          },
          {
            part: "d",
            explanation: L`Summing gives $F=\frac{m}{L}\sum v_x^2$. Dividing by area $L^2$, $P=\frac{m}{L^3}\sum v_x^2$. By isotropy, $\sum v_x^2=\frac13\sum v^2$, hence $P=\frac13\rho v_{\text{rms}}^2$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two rigid containers have the same gas at the same temperature. Container A has volume $V$ and contains $N$ molecules. Container B has volume $V/2$ and contains the same number $N$ of molecules.`,
        difficulty: 4,
        skillTags: [
          "number_density",
          "pressure_temperature_relation",
          "kinetic_theory",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Compare the number density in B with that in A.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Compare the average molecular kinetic energies in A and B.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Compare the pressures in B and A.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Give the molecular reason for the pressure comparison.",
            points: 1,
          },
        ],
        hints: [
          L`Number density is $N/V$.`,
          L`Same temperature means same average translational kinetic energy.`,
          L`Pressure increases when the same molecular motion occurs in a smaller volume.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States number density in B is twice that in A.",
            },
            {
              part: "b",
              points: 1,
              description: "States average kinetic energies are equal.",
            },
            {
              part: "c",
              points: 1,
              description: "States pressure in B is twice pressure in A.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Explains more frequent wall collisions per unit area due to greater number density.",
            },
          ],
        },
        commonErrors: [
          L`Saying kinetic energy doubles because pressure doubles.`,
          L`Ignoring the volume change in number density.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Number density in B is $N/(V/2)=2N/V$, twice that in A.`,
          },
          {
            part: "b",
            explanation:
              "The temperature is the same, so the average translational kinetic energy is the same.",
          },
          {
            part: "c",
            explanation:
              "At the same temperature with twice the number density, pressure is twice as large.",
          },
          {
            part: "d",
            explanation:
              "The molecules have the same average kinetic energy, but there are more molecules per unit volume, so collisions with the walls are more frequent.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.3",
    title: "Temperature and RMS Speed",
    subtopic:
      "Kinetic interpretation of absolute temperature, average translational kinetic energy, rms speed, and molecular-mass dependence.",
    mc: [
      {
        questionLatex: L`The average translational kinetic energy of one molecule of an ideal gas at absolute temperature $T$ is`,
        difficulty: 1,
        skillTags: ["kinetic_interpretation_temperature"],
        choices: [L`$\frac12 kT$`, L`$\frac32 RT$`, L`$\frac32 kT$`, L`$3kT$`],
        correctLetter: "C",
        rationales: {
          A: "Each translational degree contributes $\\frac12kT$; there are three translational degrees.",
          B: "This is per mole, not per molecule.",
          D: "This doubles the correct value.",
        },
        hints: [
          L`A molecule has three translational degrees of freedom.`,
          L`Each contributes $\frac12kT$.`,
          L`Add three equal contributions.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The average translational kinetic energy per molecule is",
            math: L`\frac12kT+\frac12kT+\frac12kT=\frac32kT`,
          },
        ],
      },
      {
        questionLatex: L`The rms speed of oxygen molecules at $300\text{ K}$ is closest to which value? Use $v_{\text{rms}}=\sqrt{3RT/M}$, $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$ and $M=32\times10^{-3}\text{ kg mol}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["rms_speed", "molar_mass"],
        choices: [
          L`$2.8\times10^2\text{ m s}^{-1}$`,
          L`$8.8\times10^2\text{ m s}^{-1}$`,
          L`$48\text{ m s}^{-1}$`,
          L`$4.8\times10^2\text{ m s}^{-1}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This is too small and often comes from missing the factor 3.",
          B: "This is too large for oxygen at room temperature.",
          C: "This misses a power of ten in molar mass or the square root calculation.",
        },
        hints: [
          L`Convert molar mass to kg per mol.`,
          L`Substitute into $v_{\text{rms}}=\sqrt{3RT/M}$.`,
          L`The quantity under the square root is about $2.3\times10^5$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitution gives",
            math: L`v_{\text{rms}}=\sqrt{\frac{3(8.3)(300)}{0.032}}\approx 4.8\times10^2\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`Samples X and Y in the figure are at the same temperature. The ratio $v_{\text{rms},X}:v_{\text{rms},Y}$ is`,
        difficulty: 3,
        figure: rmsComparisonFigure,
        skillTags: ["rms_speed_ratio", "molar_mass"],
        choices: [L`$2:1$`, L`$1:2$`, L`$4:1$`, L`$1:1$`],
        correctLetter: "A",
        rationales: {
          B: "The lighter gas has the larger rms speed.",
          C: "Rms speed varies as inverse square root of molar mass, not inverse molar mass.",
          D: "Same temperature gives same average kinetic energy, not same rms speed for different molar masses.",
        },
        hints: [
          L`At same $T$, $v_{\text{rms}}\propto 1/\sqrt{M}$.`,
          L`Use $M_X=4$ and $M_Y=16$.`,
          L`Compute $\sqrt{16/4}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "At the same temperature,",
            math: L`\frac{v_X}{v_Y}=\sqrt{\frac{M_Y}{M_X}}=\sqrt{\frac{16}{4}}=2`,
          },
        ],
      },
      {
        questionLatex: L`If the absolute temperature of an ideal gas is made four times while its molecular mass remains the same, its rms speed becomes`,
        difficulty: 2,
        skillTags: ["rms_speed", "temperature_ratio"],
        choices: [
          L`four times the initial value`,
          L`two times the initial value`,
          L`one-half of the initial value`,
          L`unchanged`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Rms speed varies as the square root of absolute temperature.",
          C: "Increasing temperature increases rms speed.",
          D: "Rms speed depends on absolute temperature.",
        },
        hints: [
          L`Use $v_{\text{rms}}\propto\sqrt{T}$.`,
          L`The temperature factor is $4$.`,
          L`The speed factor is $\sqrt4$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For the same gas,",
            math: L`\frac{v_2}{v_1}=\sqrt{\frac{T_2}{T_1}}=\sqrt4=2`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): If the absolute temperature of an ideal gas is doubled, the average translational kinetic energy per molecule is doubled. Reason (R): The average translational kinetic energy per molecule is $\frac32kT$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "kinetic_interpretation_temperature"],
        choices: [
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
          L`Both A and R are true, and R explains A`,
          L`A is false but R is true`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The formula directly shows proportionality to absolute temperature.",
          B: "The reason is the standard kinetic interpretation of temperature.",
          D: "The assertion is true because kinetic energy is proportional to kelvin temperature.",
        },
        hints: [
          L`Look at direct proportionality.`,
          L`Use kelvin temperature, not Celsius.`,
          L`$\frac32kT$ doubles when $T$ doubles.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true, and the formula in the reason directly explains why doubling absolute temperature doubles average translational kinetic energy.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the formula for rms speed of gas molecules in terms of $R$, $T$, and molar mass $M$.`,
        difficulty: 1,
        skillTags: ["rms_speed_formula"],
        parts: [
          { letter: "a", promptMarkdown: "Write the formula.", points: 1 },
        ],
        hints: [
          L`Rms speed increases with temperature.`,
          L`It decreases with molar mass.`,
          L`The numerical factor is $3$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $v_{\\text{rms}}=\\sqrt{3RT/M}$.",
            },
          ],
        },
        commonErrors: [
          L`Using molecular mass in grams per mole without conversion when calculating.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The formula is $v_{\text{rms}}=\sqrt{3RT/M}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A sample of nitrogen gas is heated from $300\text{ K}$ to $1200\text{ K}$.`,
        difficulty: 2,
        skillTags: ["rms_speed_ratio", "temperature_ratio"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the factor by which average translational kinetic energy per molecule changes.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the factor by which rms speed changes.",
            points: 1,
          },
        ],
        hints: [
          L`Average kinetic energy is proportional to $T$.`,
          L`Rms speed is proportional to $\sqrt T$.`,
          L`$1200/300=4$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds kinetic-energy factor $4$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds rms-speed factor $2$.",
            },
          ],
        },
        commonErrors: [
          L`Using the same factor for kinetic energy and rms speed.`,
          L`Using Celsius temperature.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Average translational kinetic energy is proportional to $T$, so it becomes $1200/300=4$ times.`,
          },
          {
            part: "b",
            explanation: L`$v_{\text{rms}}\propto\sqrt T$, so the factor is $\sqrt4=2$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Hydrogen and oxygen gas samples are at the same temperature.`,
        difficulty: 3,
        skillTags: ["same_temperature_gases", "rms_speed", "kinetic_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Compare the average translational kinetic energy per molecule in the two gases.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which gas has greater rms speed? Give the reason.",
            points: 1,
          },
        ],
        hints: [
          L`Average translational kinetic energy depends only on absolute temperature.`,
          L`Rms speed also depends on molar mass.`,
          L`Hydrogen has smaller molar mass than oxygen.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States average translational kinetic energies are equal.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Identifies hydrogen as having greater rms speed because of lower molar mass.",
            },
          ],
        },
        commonErrors: [
          L`Saying oxygen has greater rms speed because it is heavier.`,
          L`Assuming same temperature means same speed for all gases.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The average translational kinetic energy per molecule is the same because both gases have the same temperature.",
          },
          {
            part: "b",
            explanation: L`Hydrogen has greater rms speed because $v_{\text{rms}}\propto1/\sqrt M$ at the same temperature.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For nitrogen gas at $300\text{ K}$, take $M=28\times10^{-3}\text{ kg mol}^{-1}$ and $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["rms_speed", "molar_kinetic_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the average translational kinetic energy of one mole of molecules.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the rms speed.", points: 2 },
          {
            letter: "c",
            promptMarkdown:
              "Explain why this rms speed is not the speed of every molecule.",
            points: 1,
          },
        ],
        hints: [
          L`For one mole, average translational kinetic energy is $\frac32RT$.`,
          L`Use $v_{\text{rms}}=\sqrt{3RT/M}$.`,
          L`Rms speed is a statistical measure over many molecules.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $3.735\\times10^3\\text{ J}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Substitutes correctly and finds about $5.2\\times10^2\\text{ m s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains molecular speeds are distributed.",
            },
          ],
        },
        commonErrors: [
          L`Using $k$ instead of $R$ for one mole.`,
          L`Using molar mass in grams instead of kilograms.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For one mole, $K=\frac32RT=\frac32(8.3)(300)=3.735\times10^3\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`$v_{\text{rms}}=\sqrt{\frac{3RT}{M}}=\sqrt{\frac{3(8.3)(300)}{0.028}}\approx 5.2\times10^2\text{ m s}^{-1}$.`,
          },
          {
            part: "c",
            explanation:
              "Gas molecules have a distribution of speeds; rms speed is a statistical average, not a common speed for all molecules.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sealed rigid cylinder contains oxygen gas at $300\text{ K}$. It is heated uniformly to $1200\text{ K}$ without changing its volume.`,
        difficulty: 4,
        skillTags: [
          "temperature_pressure_relation",
          "rms_speed",
          "kinetic_energy",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "By what factor does average translational kinetic energy per molecule change?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "By what factor does rms speed change?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "By what factor does pressure change?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Give the molecular reason for the pressure change.",
            points: 1,
          },
        ],
        hints: [
          L`Use absolute-temperature ratios.`,
          L`At fixed volume, $P\propto T$.`,
          L`Faster molecules transfer momentum to walls at a greater rate.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds factor $4$." },
            { part: "b", points: 1, description: "Finds factor $2$." },
            { part: "c", points: 1, description: "Finds pressure factor $4$." },
            {
              part: "d",
              points: 1,
              description:
                "Explains faster collisions with walls increase momentum-transfer rate.",
            },
          ],
        },
        commonErrors: [
          L`Saying pressure doubles because rms speed doubles.`,
          L`Ignoring fixed volume.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Average kinetic energy is proportional to $T$, so the factor is $1200/300=4$.`,
          },
          {
            part: "b",
            explanation: L`Rms speed is proportional to $\sqrt T$, so the factor is $\sqrt4=2$.`,
          },
          {
            part: "c",
            explanation: L`At fixed volume for a fixed amount of gas, $P\propto T$, so pressure becomes $4$ times.`,
          },
          {
            part: "d",
            explanation:
              "Molecules move faster and strike the walls with greater momentum transfer per second, so pressure increases.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.4",
    title: "Degrees of Freedom, Equipartition and Specific Heats",
    subtopic:
      "Degrees of freedom, statement of equipartition of energy, and applications to molar heat capacities of ideal gases.",
    mc: [
      {
        questionLatex: L`The number of translational degrees of freedom of a monatomic gas molecule is`,
        difficulty: 1,
        skillTags: ["degrees_of_freedom"],
        choices: [L`$1$`, L`$5$`, L`$6$`, L`$3$`],
        correctLetter: "D",
        rationales: {
          A: "A molecule can translate independently along x, y, and z directions.",
          B: "Five degrees are used for a diatomic molecule at ordinary temperature when rotations are included.",
          C: "Six is not the translational count for a monatomic molecule.",
        },
        hints: [
          L`Translation can occur along three perpendicular axes.`,
          L`Count x, y, and z motion.`,
          L`Only translational degrees are being asked.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A monatomic gas molecule has three translational degrees of freedom: x, y, and z.",
          },
        ],
      },
      {
        questionLatex: L`For a diatomic ideal gas at ordinary temperature, taking vibrational modes as inactive, the molar heat capacity at constant volume is`,
        difficulty: 2,
        skillTags: ["specific_heat_capacity", "diatomic_gas", "equipartition"],
        choices: [L`$\frac52R$`, L`$\frac32R$`, L`$\frac72R$`, L`$R$`],
        correctLetter: "A",
        rationales: {
          B: "This is the monatomic value.",
          C: "This is the corresponding $C_P$ value for a diatomic gas, not $C_V$.",
          D: "This is only $C_P-C_V$ for one mole of ideal gas.",
        },
        hints: [
          L`At ordinary temperature, a diatomic molecule has $5$ active degrees of freedom.`,
          L`For an ideal gas, $C_V=\frac{f}{2}R$.`,
          L`Use $f=5$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a diatomic gas with five active degrees of freedom,",
            math: L`C_V=\frac{f}{2}R=\frac52R`,
          },
        ],
      },
      {
        questionLatex: L`For one mole of an ideal gas, the relation between molar heat capacities is`,
        difficulty: 2,
        skillTags: ["mayer_relation", "specific_heat_capacity"],
        choices: [L`$C_P+C_V=R$`, L`$C_P-C_V=R$`, L`$C_V-C_P=R$`, L`$C_P=C_V$`],
        correctLetter: "B",
        rationales: {
          A: "The difference, not the sum, equals $R$.",
          C: "At constant pressure heat capacity is greater, so $C_P-C_V$ is positive.",
          D: "An ideal gas does extra expansion work at constant pressure, so $C_P$ is greater than $C_V$.",
        },
        hints: [
          L`This is Mayer's relation.`,
          L`Constant-pressure heating includes expansion work.`,
          L`So $C_P$ exceeds $C_V$ by $R$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For one mole of an ideal gas, Mayer's relation is",
            math: L`C_P-C_V=R`,
          },
        ],
      },
      {
        questionLatex: L`For a monatomic ideal gas, the ratio $\gamma=C_P/C_V$ is`,
        difficulty: 2,
        skillTags: ["specific_heat_capacity", "gamma"],
        choices: [L`$\frac75$`, L`$\frac32$`, L`$\frac53$`, L`$\frac25$`],
        correctLetter: "C",
        rationales: {
          A: "This is the diatomic value when vibrational modes are inactive.",
          B: "This is not the ratio after adding $R$ to $C_V$.",
          D: "The ratio $C_P/C_V$ must be greater than 1.",
        },
        hints: [
          L`For monatomic gas, $C_V=\frac32R$.`,
          L`Then $C_P=C_V+R=\frac52R$.`,
          L`Take the ratio.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a monatomic gas,",
            math: L`\gamma=\frac{C_P}{C_V}=\frac{(5/2)R}{(3/2)R}=\frac53`,
          },
        ],
      },
      {
        questionLatex: L`An ideal gas has molar heat capacity at constant volume $C_V=3R$. The number of active degrees of freedom per molecule is`,
        difficulty: 3,
        skillTags: ["equipartition", "degrees_of_freedom"],
        choices: [L`$3$`, L`$5$`, L`$9$`, L`$6$`],
        correctLetter: "D",
        rationales: {
          A: L`Three degrees would give $C_V=\frac32R$.`,
          B: L`Five degrees would give $C_V=\frac52R$.`,
          C: L`Nine degrees would give $C_V=\frac92R$.`,
        },
        hints: [
          L`Use $C_V=\frac{f}{2}R$.`,
          L`Set $\frac{f}{2}R=3R$.`,
          L`Solve for $f$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "From equipartition,",
            math: L`C_V=\frac{f}{2}R=3R\Rightarrow f=6`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the law of equipartition of energy.`,
        difficulty: 1,
        skillTags: ["equipartition_statement"],
        parts: [
          { letter: "a", promptMarkdown: "Write the statement.", points: 1 },
        ],
        hints: [
          L`It assigns equal average energy to each quadratic degree of freedom.`,
          L`The energy per degree of freedom contains $kT$.`,
          L`The factor is $1/2$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that each quadratic degree of freedom contributes average energy $\\frac12kT$ per molecule.",
            },
          ],
        },
        commonErrors: [L`Saying every molecule has exactly the same energy.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`At thermal equilibrium, each quadratic degree of freedom has average energy $\frac12kT$ per molecule.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two moles of a monatomic ideal gas are heated by $10\text{ K}$ at constant volume. Take $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: [
          "monatomic_gas",
          "internal_energy",
          "specific_heat_capacity",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write $C_V$ for a monatomic ideal gas.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the heat supplied.", points: 1 },
        ],
        hints: [
          L`For monatomic ideal gas, $C_V=\frac32R$.`,
          L`At constant volume, $Q=nC_V\Delta T$.`,
          L`Substitute $n=2$ and $\Delta T=10$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Writes $C_V=\\frac32R$." },
            { part: "b", points: 1, description: "Finds $249\\text{ J}$." },
          ],
        },
        commonErrors: [
          L`Using $C_P$ for constant-volume heating.`,
          L`Forgetting the number of moles.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For a monatomic ideal gas, $C_V=\frac32R$.`,
          },
          {
            part: "b",
            explanation: L`$Q=nC_V\Delta T=2\left(\frac32R\right)(10)=30R=249\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A diatomic ideal gas at ordinary temperature has five active degrees of freedom. Ignore vibrational modes.`,
        difficulty: 3,
        skillTags: ["diatomic_gas", "specific_heat_capacity", "gamma"],
        parts: [
          { letter: "a", promptMarkdown: "Find $C_V$.", points: 1 },
          {
            letter: "b",
            promptMarkdown: L`Find $C_P$ and $\gamma$.`,
            points: 2,
          },
        ],
        hints: [
          L`Use $C_V=\frac{f}{2}R$.`,
          L`Use $C_P-C_V=R$.`,
          L`Then take $C_P/C_V$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $C_V=\\frac52R$." },
            {
              part: "b",
              points: 2,
              description: L`Finds $C_P=\frac72R$ and $\gamma=7/5$.`,
            },
          ],
        },
        commonErrors: [
          L`Including vibrational modes despite the instruction.`,
          L`Using $C_P+C_V=R$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$C_V=\frac{f}{2}R=\frac52R$.` },
          {
            part: "b",
            explanation: L`$C_P=C_V+R=\frac72R$, so $\gamma=\frac{C_P}{C_V}=\frac{7/2}{5/2}=\frac75$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`One mole of a monatomic ideal gas and one mole of a diatomic ideal gas at ordinary temperature are separately heated by $20\text{ K}$ at constant volume. Take $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$ and ignore vibrational modes for the diatomic gas.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "equipartition",
          "specific_heat_capacity",
          "comparative_reasoning",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the heat supplied to the monatomic gas.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the heat supplied to the diatomic gas.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the total heat supplied to both gases.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why the diatomic gas needs more heat for the same temperature rise.",
            points: 1,
          },
        ],
        hints: [
          L`Use $C_V=\frac32R$ for monatomic gas.`,
          L`Use $C_V=\frac52R$ for diatomic gas at ordinary temperature.`,
          L`More active degrees of freedom means more energy storage per kelvin.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $249\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $415\\text{ J}$." },
            { part: "c", points: 1, description: "Finds $664\\text{ J}$." },
            {
              part: "d",
              points: 1,
              description:
                "Connects larger heat capacity to more active degrees of freedom.",
            },
          ],
        },
        commonErrors: [
          L`Using the same $C_V$ for both gases.`,
          L`Using $C_P$ although heating is at constant volume.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For monatomic gas, $Q=1\left(\frac32R\right)(20)=30R=249\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`For diatomic gas, $Q=1\left(\frac52R\right)(20)=50R=415\text{ J}$.`,
          },
          {
            part: "c",
            explanation: L`Total heat $=30R+50R=80R=664\text{ J}$.`,
          },
          {
            part: "d",
            explanation:
              "The diatomic molecule has rotational degrees of freedom in addition to translational ones, so more energy is needed for the same temperature rise.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Gas X is monatomic and gas Y is diatomic at ordinary temperature. One mole of each gas is heated by the same temperature rise at constant volume. Vibrational modes of Y are inactive.`,
        difficulty: 4,
        skillTags: ["degrees_of_freedom", "specific_heat_capacity", "gamma"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the active degrees of freedom for X and Y.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which gas has larger $C_V$?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which gas requires more heat at constant volume for the same temperature rise?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Compare $\gamma$ for X and Y.`,
            points: 1,
          },
        ],
        hints: [
          L`Monatomic gas has three translational degrees.`,
          L`Diatomic gas has five active degrees at ordinary temperature.`,
          L`$\gamma$ is $5/3$ for monatomic and $7/5$ for diatomic in this model.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States $f_X=3$, $f_Y=5$." },
            {
              part: "b",
              points: 1,
              description: "Identifies Y as having larger $C_V$.",
            },
            {
              part: "c",
              points: 1,
              description: "Identifies Y as requiring more heat.",
            },
            {
              part: "d",
              points: 1,
              description: L`States $\gamma_X=5/3$ and $\gamma_Y=7/5$, so X has larger $\gamma$.`,
            },
          ],
        },
        commonErrors: [
          L`Assuming greater $C_V$ means greater $\gamma$.`,
          L`Counting vibrational modes despite ordinary-temperature condition.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`X has $3$ active degrees of freedom and Y has $5$.`,
          },
          {
            part: "b",
            explanation: L`Since $C_V=\frac{f}{2}R$, Y has larger $C_V$.`,
          },
          {
            part: "c",
            explanation: L`At constant volume, heat supplied is $nC_V\Delta T$, so Y requires more heat.`,
          },
          {
            part: "d",
            explanation: L`$\gamma_X=5/3$ and $\gamma_Y=7/5$, so $\gamma_X>\gamma_Y$.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "9.5",
    title: "Mean Free Path and Avogadro Number",
    subtopic:
      "Mean free path, number density, pressure-temperature dependence of collision spacing, and Avogadro's number as particles per mole.",
    mc: [
      {
        questionLatex: L`Avogadro's number represents the number of particles in`,
        difficulty: 1,
        skillTags: ["avogadro_number"],
        choices: [
          L`one mole of a substance`,
          L`one gram of any gas`,
          L`one litre of any gas at any temperature`,
          L`one molecule of a gas`,
        ],
        correctLetter: "A",
        rationales: {
          B: "One gram contains different numbers of particles for different molar masses.",
          C: "One litre contains different numbers of particles at different pressure and temperature.",
          D: "One molecule is a single particle, not Avogadro's number of particles.",
        },
        hints: [
          L`A mole is a counting unit.`,
          L`It is independent of the kind of substance.`,
          L`$N_A$ is particles per mole.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Avogadro's number is the number of elementary entities in one mole.",
          },
        ],
      },
      {
        questionLatex: L`The two chambers in the figure contain the same gas at the same temperature and volume. Which chamber has the larger mean free path?`,
        difficulty: 2,
        figure: meanFreePathFigure,
        skillTags: ["mean_free_path", "number_density"],
        choices: [
          L`Chamber B`,
          L`Chamber A`,
          L`Both have the same mean free path`,
          L`It cannot be compared because temperature is the same`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Chamber B has more molecules in the same volume, so collisions occur after shorter distances.",
          C: "Mean free path changes with number density.",
          D: "Same temperature keeps speed scale comparable, but density still affects collision spacing.",
        },
        hints: [
          L`Mean free path is the average distance between collisions.`,
          L`More molecules in the same volume means more frequent collisions.`,
          L`The less dense chamber has larger mean free path.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Chamber A is less dense, so molecules travel farther on average before colliding. Hence A has the larger mean free path.",
          },
        ],
      },
      {
        questionLatex: L`If the number density of a gas is doubled while molecular diameter is unchanged, the mean free path becomes`,
        difficulty: 2,
        skillTags: ["mean_free_path", "proportional_reasoning"],
        choices: [
          L`twice its initial value`,
          L`four times its initial value`,
          L`half its initial value`,
          L`unchanged`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Greater number density causes more frequent collisions, so mean free path decreases.",
          B: "This reverses the dependence and squares it.",
          D: "Mean free path depends on number density.",
        },
        hints: [
          L`For fixed molecular size, $\lambda\propto1/n$.`,
          L`Number density is doubled.`,
          L`An inverse proportionality gives half.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Mean free path varies inversely with number density for the same molecular diameter.",
            math: L`\lambda_2=\lambda_1/2`,
          },
        ],
      },
      {
        questionLatex: L`The number of molecules in $0.50\text{ mol}$ of a gas is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["avogadro_number", "mole_concept"],
        choices: [
          L`$6.0\times10^{23}$`,
          L`$1.2\times10^{24}$`,
          L`$3.0\times10^{22}$`,
          L`$3.0\times10^{23}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This is the number of molecules in one mole.",
          B: "This doubles instead of halves Avogadro's number.",
          C: "This is too small by a factor of 10.",
        },
        hints: [
          L`Use $N=nN_A$.`,
          L`Here $n=0.50$.`,
          L`Half of $6.02\times10^{23}$ is about $3.0\times10^{23}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Number of molecules is",
            math: L`N=0.50(6.02\times10^{23})\approx3.0\times10^{23}`,
          },
        ],
      },
      {
        questionLatex: L`For the same gas at the same temperature, if the pressure is reduced to half its initial value, the mean free path approximately`,
        difficulty: 3,
        skillTags: ["mean_free_path", "pressure_dependence"],
        choices: [
          L`doubles`,
          L`halves`,
          L`becomes four times`,
          L`remains unchanged`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Lower pressure means lower number density, so collisions are less frequent.",
          C: "The dependence is inverse and linear with pressure at fixed temperature, not inverse square.",
          D: "Mean free path depends on number density, which changes with pressure.",
        },
        hints: [
          L`At fixed temperature, number density is proportional to pressure.`,
          L`Mean free path is inversely proportional to number density.`,
          L`Half pressure gives half number density.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`At fixed temperature, $n$ is proportional to $P$ and $\lambda$ is proportional to $1/n$, so halving pressure doubles the mean free path.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define mean free path of a gas molecule.`,
        difficulty: 1,
        skillTags: ["mean_free_path_definition"],
        parts: [
          { letter: "a", promptMarkdown: "Write the definition.", points: 1 },
        ],
        hints: [
          L`It is about distance between collisions.`,
          L`It is an average quantity.`,
          L`Mention successive collisions.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Defines mean free path as the average distance travelled between successive collisions.",
            },
          ],
        },
        commonErrors: [
          L`Defining it as time between collisions instead of distance.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Mean free path is the average distance travelled by a gas molecule between two successive collisions.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas is at pressure $1.0\times10^5\text{ Pa}$ and temperature $300\text{ K}$. Use $P=nkT$ and $k=1.38\times10^{-23}\text{ J K}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["number_density", "ideal_gas_equation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the number density $n$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State what happens to $n$ if the pressure is doubled at the same temperature.",
            points: 1,
          },
        ],
        hints: [
          L`Use $n=P/(kT)$.`,
          L`The denominator is $1.38\times10^{-23}\times300$.`,
          L`At fixed $T$, number density is proportional to pressure.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds about $2.4\\times10^{25}\\text{ m}^{-3}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States number density doubles.",
            },
          ],
        },
        commonErrors: [
          L`Using $R$ instead of $k$ in $P=nkT$ for number density.`,
          L`Forgetting that $n$ here is number density, not moles.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$n=\frac{P}{kT}=\frac{1.0\times10^5}{(1.38\times10^{-23})(300)}\approx2.4\times10^{25}\text{ m}^{-3}$.`,
          },
          {
            part: "b",
            explanation:
              "At the same temperature, number density is directly proportional to pressure, so it doubles.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For a gas, take molecular diameter $d=3.0\times10^{-10}\text{ m}$ and number density $n=2.5\times10^{25}\text{ m}^{-3}$. Use $\lambda=\frac{1}{\sqrt2\pi d^2n}$ and take $\sqrt2\pi\approx4.44$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["mean_free_path_calculation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the approximate mean free path.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State how the answer changes if the molecular diameter is doubled while number density is unchanged.",
            points: 1,
          },
        ],
        hints: [
          L`First compute $d^2$.`,
          L`The denominator is close to $1.0\times10^7$.`,
          L`Mean free path varies as $1/d^2$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds about $1.0\\times10^{-7}\\text{ m}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States it becomes one-fourth.",
            },
          ],
        },
        commonErrors: [
          L`Forgetting to square the molecular diameter.`,
          L`Saying doubled diameter halves the mean free path instead of quartering it.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\lambda=\frac{1}{4.44(3.0\times10^{-10})^2(2.5\times10^{25})}\approx1.0\times10^{-7}\text{ m}$.`,
          },
          {
            part: "b",
            explanation: L`Since $\lambda\propto1/d^2$, doubling $d$ makes $\lambda$ one-fourth of its initial value.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A rigid vessel contains an ideal gas at temperature $T$. Half the molecules are slowly removed while the temperature and vessel volume are kept unchanged.`,
        difficulty: 4,
        skillTags: ["number_density", "pressure_dependence", "mean_free_path"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "How does the number density change?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "How does the pressure change?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "How does rms speed change?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "How does mean free path change? Explain.",
            points: 1,
          },
        ],
        hints: [
          L`Number density is molecules per unit volume.`,
          L`At fixed temperature, pressure is proportional to number density.`,
          L`Rms speed depends on temperature and molecular mass, while mean free path depends inversely on number density.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States number density halves.",
            },
            { part: "b", points: 1, description: "States pressure halves." },
            {
              part: "c",
              points: 1,
              description: "States rms speed is unchanged.",
            },
            {
              part: "d",
              points: 1,
              description:
                "States mean free path doubles with inverse-density reasoning.",
            },
          ],
        },
        commonErrors: [
          L`Saying rms speed decreases because there are fewer molecules.`,
          L`Assuming pressure stays unchanged because volume and temperature are unchanged while molecules are removed.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Removing half the molecules at the same volume halves the number density.",
          },
          {
            part: "b",
            explanation: L`At fixed temperature, $P=nkT$, so pressure also halves.`,
          },
          {
            part: "c",
            explanation:
              "Rms speed is unchanged because temperature and molecular mass are unchanged.",
          },
          {
            part: "d",
            explanation:
              "Mean free path is inversely proportional to number density, so it doubles.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two chambers contain the same gas at the same temperature. Chamber A is at $2.0\text{ atm}$. Chamber B is at $0.50\text{ atm}$ and has volume $2.0\text{ L}$ at $300\text{ K}$. Take $1\text{ atm}=1.0\times10^5\text{ Pa}$, $R=8.3\text{ J mol}^{-1}\text{ K}^{-1}$ and $N_A=6.0\times10^{23}\text{ mol}^{-1}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: [
          "mean_free_path",
          "number_density",
          "avogadro_number",
          "ideal_gas_equation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the ratio of number density in A to that in B.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the ratio of mean free path in B to that in A.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Compare rms speeds in A and B.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the approximate number of molecules in chamber B.",
            points: 2,
          },
        ],
        hints: [
          L`At the same temperature, number density is proportional to pressure.`,
          L`Mean free path is inversely proportional to number density.`,
          L`For chamber B, use $n_{\text{mol}}=PV/RT$, then multiply by $N_A$.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds number-density ratio $4:1$.",
            },
            {
              part: "b",
              points: 1,
              description: L`Finds $\lambda_B/\lambda_A=4$.`,
            },
            {
              part: "c",
              points: 1,
              description: "States rms speeds are equal.",
            },
            {
              part: "d",
              points: 2,
              description:
                "Computes moles in B and obtains about $2.4\\times10^{22}$ molecules.",
            },
          ],
        },
        commonErrors: [
          L`Reversing the mean-free-path ratio.`,
          L`Using litres without converting to cubic metre.`,
          L`Saying lower pressure changes rms speed at the same temperature.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`At same $T$, number density is proportional to pressure. Thus $n_A/n_B=2.0/0.50=4$.`,
          },
          {
            part: "b",
            explanation: L`Mean free path is inversely proportional to number density, so $\lambda_B/\lambda_A=n_A/n_B=4$.`,
          },
          {
            part: "c",
            explanation:
              "The gas and temperature are the same, so rms speeds are equal.",
          },
          {
            part: "d",
            explanation: L`For B, $P=0.50\times10^5\text{ Pa}$ and $V=2.0\times10^{-3}\text{ m}^3$. Moles $=\frac{PV}{RT}=\frac{(5.0\times10^4)(2.0\times10^{-3})}{8.3(300)}\approx4.0\times10^{-2}$. Molecules $\approx4.0\times10^{-2}(6.0\times10^{23})=2.4\times10^{22}$.`,
          },
        ],
      },
    ],
  },
];

export const kineticTheoryTopics: Topic[] = topicSeeds.map(makeTopic);
