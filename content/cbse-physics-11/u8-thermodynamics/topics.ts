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
const UNIT = "u8-thermodynamics";
const VERSION = "0.1.7";
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
  mc: readonly [McSeed, McSeed, McSeed, McSeed, McSeed];
  constructed: readonly [
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
  ];
  extraMc?: readonly McSeed[];
  extraConstructed?: readonly ConstructedSeed[];
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
  return `You chose ${choiceText}. Recheck the sign convention, state variable, and whether the process is isochoric, isothermal, adiabatic, or cyclic.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_thermodynamics_reasoning"),
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
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "confuses_heat_with_temperature_or_path_function_with_state_function",
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
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "uses_first_law_with_wrong_sign_or_ignores_process_constraint",
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
  return {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
    items: [
      ...seed.mc.map((item, index) => makeMc(seed, item, index)),
      ...(seed.extraMc ?? []).map((item, index) =>
        makeMc(seed, item, seed.mc.length + index),
      ),
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
      ...(seed.extraConstructed ?? []).map((item, index) =>
        makeConstructed(seed, item, seed.constructed.length + index),
      ),
    ],
  };
}

const zerothLawFigure: ItemFigure = {
  type: "svg",
  title: "Bodies in thermal contact",
  description:
    "Three bodies A, B, and C with a thermometer touching B. Dashed connectors indicate possible thermal contact comparisons.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <rect x="95" y="130" width="120" height="95" rx="8" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="260" y="130" width="120" height="95" rx="8" fill="#fef3c7" stroke="#334155" stroke-width="3"/>
  <rect x="425" y="130" width="120" height="95" rx="8" fill="#dcfce7" stroke="#334155" stroke-width="3"/>
  <text x="145" y="184" font-size="26" fill="#0f172a">A</text>
  <text x="310" y="184" font-size="26" fill="#0f172a">B</text>
  <text x="475" y="184" font-size="26" fill="#0f172a">C</text>
  <line x1="215" y1="178" x2="260" y2="178" stroke="#64748b" stroke-width="3" stroke-dasharray="8 6"/>
  <line x1="380" y1="178" x2="425" y2="178" stroke="#64748b" stroke-width="3" stroke-dasharray="8 6"/>
  <line x1="320" y1="100" x2="320" y2="55" stroke="#2563eb" stroke-width="5"/>
  <circle cx="320" cy="108" r="12" fill="#2563eb"/>
  <text x="288" y="43" font-size="15" fill="#0f172a">thermometer</text>
</svg>`,
};

const pvCycleFigure: ItemFigure = {
  type: "svg",
  title: "Rectangular cycle on a pressure-volume diagram",
  description:
    "A rectangular cycle with points A, B, C, and D on pressure-volume axes. The arrows show the direction A to B to C to D to A.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-cycle-u8" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="90" y1="340" x2="590" y2="340" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="340" x2="90" y2="55" stroke="#334155" stroke-width="2"/>
  <text x="335" y="380" font-size="18" fill="#0f172a">V</text>
  <text x="44" y="204" font-size="18" fill="#0f172a">P</text>
  <line x1="170" y1="275" x2="500" y2="275" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-cycle-u8)"/>
  <line x1="500" y1="275" x2="500" y2="105" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-cycle-u8)"/>
  <line x1="500" y1="105" x2="170" y2="105" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-cycle-u8)"/>
  <line x1="170" y1="105" x2="170" y2="275" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-cycle-u8)"/>
  <circle cx="170" cy="275" r="6" fill="#0f172a"/>
  <circle cx="500" cy="275" r="6" fill="#0f172a"/>
  <circle cx="500" cy="105" r="6" fill="#0f172a"/>
  <circle cx="170" cy="105" r="6" fill="#0f172a"/>
  <text x="146" y="299" font-size="17" fill="#0f172a">A</text>
  <text x="508" y="299" font-size="17" fill="#0f172a">B</text>
  <text x="508" y="96" font-size="17" fill="#0f172a">C</text>
  <text x="146" y="96" font-size="17" fill="#0f172a">D</text>
</svg>`,
};

const pvTwoPathFigure: ItemFigure = {
  type: "svg",
  title: "Two paths between the same thermodynamic states",
  description:
    "Two pressure-volume paths connect state A to state C. One path goes through B, while the other is a direct straight path.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-path-u8" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="90" y1="340" x2="585" y2="340" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="340" x2="90" y2="55" stroke="#334155" stroke-width="2"/>
  <text x="330" y="380" font-size="18" fill="#0f172a">V</text>
  <text x="44" y="204" font-size="18" fill="#0f172a">P</text>
  <line x1="170" y1="270" x2="480" y2="270" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-path-u8)"/>
  <line x1="480" y1="270" x2="480" y2="120" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-path-u8)"/>
  <line x1="170" y1="270" x2="480" y2="120" stroke="#f97316" stroke-width="4" marker-end="url(#arrow-path-u8)"/>
  <circle cx="170" cy="270" r="6" fill="#0f172a"/>
  <circle cx="480" cy="270" r="6" fill="#0f172a"/>
  <circle cx="480" cy="120" r="6" fill="#0f172a"/>
  <text x="146" y="295" font-size="17" fill="#0f172a">A</text>
  <text x="488" y="295" font-size="17" fill="#0f172a">B</text>
  <text x="488" y="112" font-size="17" fill="#0f172a">C</text>
  <text x="298" y="292" font-size="15" fill="#2563eb">I</text>
  <text x="325" y="184" font-size="15" fill="#f97316">II</text>
</svg>`,
};

const isoAdiFigure: ItemFigure = {
  type: "svg",
  title: "Two expansion curves from the same initial state",
  description:
    "A pressure-volume graph with two expansion curves from the same initial state A toward larger volume.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-curve-u8" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="90" y1="340" x2="590" y2="340" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="340" x2="90" y2="55" stroke="#334155" stroke-width="2"/>
  <text x="335" y="380" font-size="18" fill="#0f172a">V</text>
  <text x="44" y="204" font-size="18" fill="#0f172a">P</text>
  <path d="M175 105 C255 155 345 205 500 245" fill="none" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-curve-u8)"/>
  <path d="M175 105 C238 178 310 258 500 310" fill="none" stroke="#f97316" stroke-width="4" marker-end="url(#arrow-curve-u8)"/>
  <circle cx="175" cy="105" r="7" fill="#0f172a"/>
  <text x="151" y="94" font-size="17" fill="#0f172a">A</text>
  <text x="506" y="242" font-size="17" fill="#2563eb">I</text>
  <text x="506" y="313" font-size="17" fill="#f97316">II</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "8.1",
    title: "Thermal Equilibrium and State Variables",
    subtopic:
      "Thermal equilibrium, zeroth law, temperature, thermodynamic state variables, and the equation of state of an ideal gas.",
    mc: [
      {
        questionLatex: L`Two bodies are in thermal equilibrium when they are placed in thermal contact and`,
        difficulty: 1,
        skillTags: ["thermal_equilibrium", "temperature"],
        choices: [
          L`there is no net heat flow between them`,
          L`their masses are equal`,
          L`their internal energies are equal`,
          L`their volumes are equal`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Equal mass is not the condition for thermal equilibrium.",
          C: "Different bodies can have different internal energies at the same temperature.",
          D: "Equal volume does not decide heat flow.",
        },
        hints: [
          "Thermal equilibrium is tested by heat flow.",
          "Temperature decides the direction of heat flow.",
          "At equal temperature, there is no net heat flow.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Thermal equilibrium means no net heat is exchanged when bodies are in thermal contact.",
          },
        ],
      },
      {
        questionLatex: L`Bodies A and B are separately in thermal equilibrium with body C. According to the zeroth law,`,
        difficulty: 2,
        figure: zerothLawFigure,
        skillTags: ["zeroth_law", "thermal_equilibrium"],
        choices: [
          L`A and B must have equal masses`,
          L`A and B are in thermal equilibrium with each other`,
          L`A must contain the same heat as B`,
          L`A and B must be made of the same material`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Mass is not part of the zeroth law.",
          C: "Heat is energy in transfer, not something a body permanently contains.",
          D: "The zeroth law applies across different materials.",
        },
        hints: [
          "The zeroth law is the basis of temperature measurement.",
          "If two bodies match a third thermometer body, compare them with each other.",
          "Thermal equilibrium is transitive.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If A is in thermal equilibrium with C and B is in thermal equilibrium with C, then A and B are in thermal equilibrium with each other.",
          },
        ],
      },
      {
        questionLatex: L`For a fixed amount of ideal gas, pressure is doubled and volume is halved. The absolute temperature`,
        difficulty: 2,
        skillTags: ["ideal_gas_equation", "state_variables"],
        choices: [
          L`doubles`,
          L`becomes half`,
          L`remains unchanged`,
          L`becomes four times`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This notices the pressure change but ignores the volume change.",
          B: "This notices the volume change but ignores the pressure change.",
          D: "This multiplies both factors in the wrong direction.",
        },
        hints: [
          L`For fixed $n$, $PV/T$ is constant.`,
          L`Check the product $PV$.`,
          L`New product is $(2P)(V/2)=PV$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For fixed amount of ideal gas,",
            math: L`PV=nRT`,
          },
          {
            step: 2,
            explanation: "The product $PV$ is unchanged.",
            math: L`P'V'=(2P)(V/2)=PV`,
          },
          {
            step: 3,
            explanation:
              "Therefore the absolute temperature remains unchanged.",
          },
        ],
      },
      {
        questionLatex: L`Which one of the following is a state variable?`,
        difficulty: 2,
        skillTags: ["state_variable", "path_function"],
        choices: [
          L`heat supplied`,
          L`work done`,
          L`path length on a $P$-$V$ diagram`,
          L`temperature`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Heat depends on the process by which the state changes.",
          B: "Work also depends on the thermodynamic path.",
          C: "A path length is not a property of the thermodynamic state.",
        },
        hints: [
          "A state variable depends only on the state of the system.",
          "Heat and work are modes of energy transfer.",
          "Pressure, volume, temperature, and internal energy are state variables.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Temperature describes the thermodynamic state, whereas heat and work depend on the path.",
          },
        ],
      },
      {
        questionLatex: L`Two moles of an ideal gas occupy $0.0249\text{ m}^3$ at $300\text{ K}$. Taking $R=8.3\text{ J mol}^{-1}\text{K}^{-1}$, the pressure is closest to`,
        difficulty: 3,
        skillTags: ["ideal_gas_equation", "pressure_calculation"],
        choices: [
          L`$2.0\times10^5\text{ Pa}$`,
          L`$1.0\times10^5\text{ Pa}$`,
          L`$2.0\times10^4\text{ Pa}$`,
          L`$4.0\times10^5\text{ Pa}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the pressure for about one mole at the same volume and temperature.",
          C: "This has a power-of-ten error.",
          D: "This doubles the correct pressure.",
        },
        hints: [
          L`Use $PV=nRT$.`,
          L`Solve $P=nRT/V$.`,
          L`Compute $2(8.3)(300)/0.0249$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the ideal gas equation.",
            math: L`P=\frac{nRT}{V}`,
          },
          {
            step: 2,
            explanation: "Substitute the data.",
            math: L`P=\frac{2(8.3)(300)}{0.0249}=2.0\times10^5\text{ Pa}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Convert $27^\circ\text{C}$ to kelvin.`,
        difficulty: 1,
        skillTags: ["temperature_scale", "kelvin"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Give the temperature in kelvin.",
            points: 1,
          },
        ],
        hints: [
          L`Kelvin temperature is Celsius temperature plus $273$.`,
          L`Use $T_K=T_C+273$.`,
          L`Add $27$ and $273$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: "Finds $300\\text{ K}$." },
          ],
        },
        commonErrors: [L`Writing $27\text{ K}$ without conversion.`],
        workedSolution: [
          { part: "a", explanation: L`$T=27+273=300\text{ K}$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A fixed amount of ideal gas changes from state 1 to state 2. Initially $P_1=1.0\times10^5\text{ Pa}$, $V_1=4.0\text{ L}$, and $T_1=300\text{ K}$. Finally $P_2=2.0\times10^5\text{ Pa}$ and $V_2=3.0\text{ L}$.`,
        difficulty: 3,
        skillTags: ["ideal_gas_equation", "temperature_ratio"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the relation connecting the two states.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $T_2$.", points: 2 },
        ],
        hints: [
          L`For fixed gas, $PV/T$ is constant.`,
          L`Use litres in both volumes; the ratio is enough.`,
          L`$T_2=T_1(P_2V_2)/(P_1V_1)$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $P_1V_1/T_1=P_2V_2/T_2$.",
            },
            { part: "b", points: 2, description: "Finds $T_2=450\\text{ K}$." },
          ],
        },
        commonErrors: [
          L`Using Celsius temperature in a gas-law ratio.`,
          L`Converting one volume but not the other.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For a fixed amount of ideal gas, $\frac{P_1V_1}{T_1}=\frac{P_2V_2}{T_2}$.`,
          },
          {
            part: "b",
            explanation: L`$T_2=300[(2.0\times10^5)(3.0)]/[(1.0\times10^5)(4.0)]=450\text{ K}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A thermometer is separately placed in contact with bodies A and B and gives the same steady reading in both cases.`,
        difficulty: 2,
        figure: zerothLawFigure,
        skillTags: ["zeroth_law", "thermometer"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "What can be concluded about A and B?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the law that supports this conclusion.",
            points: 1,
          },
        ],
        hints: [
          L`A thermometer reaches thermal equilibrium with the body it measures.`,
          L`The same steady reading means the same temperature.`,
          L`Use the transitive property of thermal equilibrium.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States A and B are in thermal equilibrium or have the same temperature.",
            },
            {
              part: "b",
              points: 1,
              description: "Names the zeroth law of thermodynamics.",
            },
          ],
        },
        commonErrors: [L`Claiming the bodies must have equal heat content.`],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A and B have the same temperature and would be in thermal equilibrium with each other.",
          },
          {
            part: "b",
            explanation: "This follows from the zeroth law of thermodynamics.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A cylinder contains $0.50\text{ mol}$ of an ideal gas in volume $1.0\times10^{-2}\text{ m}^3$ at $300\text{ K}$. Take $R=8.3\text{ J mol}^{-1}\text{K}^{-1}$. The volume is then kept constant and the gas is heated to $450\text{ K}$.`,
        difficulty: 4,
        skillTags: ["ideal_gas_equation", "constant_volume", "state_variables"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the initial pressure.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the final pressure.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State which thermodynamic variable remains fixed.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State why absolute temperature, not Celsius temperature, is used.",
            points: 1,
          },
        ],
        hints: [
          L`Use $PV=nRT$.`,
          L`At constant volume and fixed $n$, $P/T$ is constant.`,
          L`Gas laws use absolute temperature.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Finds $1.245\\times10^5\\text{ Pa}$ or about $1.25\\times10^5\\text{ Pa}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds about $1.87\\times10^5\\text{ Pa}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Identifies volume as constant.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Explains gas-law proportionality uses kelvin/absolute temperature.",
            },
          ],
        },
        commonErrors: [
          L`Using $300^\circ\text{C}$ instead of $300\text{ K}$.`,
          L`Assuming pressure stays constant because the gas amount is fixed.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$P_1=nRT_1/V=0.50(8.3)(300)/(1.0\times10^{-2})=1.245\times10^5\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`At constant volume, $P_2/P_1=T_2/T_1=450/300=1.5$, so $P_2=1.87\times10^5\text{ Pa}$.`,
          },
          { part: "c", explanation: "The volume remains fixed." },
          {
            part: "d",
            explanation:
              "The ideal gas equation uses absolute temperature because pressure or volume is proportional to temperature measured from absolute zero.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In an experiment with a fixed mass of ideal gas, three states are recorded: state A has $P=1.0\times10^5\text{ Pa}$, $V=2.0\text{ L}$; state B has $P=2.0\times10^5\text{ Pa}$, $V=1.0\text{ L}$; state C has $P=1.5\times10^5\text{ Pa}$, $V=2.0\text{ L}$.`,
        difficulty: 4,
        skillTags: ["ideal_gas_state", "temperature_ratio", "state_variables"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Compare the absolute temperatures of A and B.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $T_C/T_A$.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Which pair of states has the same value of $PV$?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Why is heat supplied not enough information to identify the state?",
            points: 1,
          },
        ],
        hints: [
          L`For fixed gas, $T\propto PV$.`,
          L`Use pressure-volume products, keeping units consistent.`,
          L`Heat is a path quantity, not a state coordinate.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States $T_A=T_B$." },
            { part: "b", points: 1, description: "Finds $T_C/T_A=1.5$." },
            { part: "c", points: 1, description: "Identifies A and B." },
            {
              part: "d",
              points: 1,
              description:
                "Explains heat depends on path and is not a state variable.",
            },
          ],
        },
        commonErrors: [
          L`Comparing pressure alone instead of $PV$.`,
          L`Treating heat as stored inside the gas.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$P_AV_A=(1.0)(2.0)$ and $P_BV_B=(2.0)(1.0)$ in common units, so $T_A=T_B$.`,
          },
          {
            part: "b",
            explanation: L`$T_C/T_A=(P_CV_C)/(P_AV_A)=(1.5\times2.0)/(1.0\times2.0)=1.5$.`,
          },
          { part: "c", explanation: "States A and B have the same $PV$." },
          {
            part: "d",
            explanation:
              "Heat supplied depends on the path taken, so it does not by itself specify a thermodynamic state.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.2",
    title: "First Law of Thermodynamics",
    subtopic:
      "Heat, work, internal energy, sign convention, and applications of the first law to simple processes.",
    mc: [
      {
        questionLatex: L`A gas absorbs $500\text{ J}$ of heat and does $200\text{ J}$ of work on the surroundings. The change in internal energy is`,
        difficulty: 2,
        skillTags: ["first_law", "internal_energy", "work_by_gas"],
        choices: [
          L`$+700\text{ J}$`,
          L`$+300\text{ J}$`,
          L`$-300\text{ J}$`,
          L`$-700\text{ J}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This adds heat and work, as if work done by the gas also increases internal energy.",
          C: "This has the sign of the answer reversed.",
          D: "This combines both the wrong operation and wrong sign.",
        },
        hints: [
          L`Use $\Delta U=Q-W$ where $W$ is work done by the gas.`,
          L`Here $Q=+500\text{ J}$ and $W=+200\text{ J}$.`,
          L`Subtract the work done by the gas.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Using the first law with work done by the gas positive,",
            math: L`\Delta U=Q-W=500-200=300\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`In an adiabatic compression of a gas, $150\text{ J}$ of work is done on the gas. The change in internal energy is`,
        difficulty: 3,
        skillTags: ["adiabatic_process", "first_law", "work_on_gas"],
        choices: [
          L`$-150\text{ J}$`,
          L`$0$`,
          L`$+150\text{ J}$`,
          L`$+300\text{ J}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Work done on the gas increases its internal energy in an adiabatic compression.",
          B: "Adiabatic means $Q=0$, not necessarily $\\Delta U=0$.",
          D: "There is no doubling of the work value.",
        },
        hints: [
          L`Adiabatic means $Q=0$.`,
          L`Work done on the gas means work done by the gas is negative.`,
          L`Use $\Delta U=Q-W_{\text{by gas}}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Since work is done on the gas,",
            math: L`W_{\text{by gas}}=-150\text{ J}`,
          },
          {
            step: 2,
            explanation: "For an adiabatic process,",
            math: L`\Delta U=0-(-150)=+150\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`A gas is heated at constant volume and receives $400\text{ J}$ of heat. The work done by the gas is`,
        difficulty: 2,
        skillTags: ["isochoric_process", "first_law"],
        choices: [
          L`$400\text{ J}$`,
          L`$-400\text{ J}$`,
          L`cannot be determined without pressure`,
          L`$0$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Heat received is not automatically work done.",
          B: "No volume change means no boundary work at all.",
          C: "Pressure is not needed because $\\Delta V=0$.",
        },
        hints: [
          L`Boundary work is $W=\int P\,dV$.`,
          L`At constant volume, $dV=0$.`,
          L`So work done by the gas is zero.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "At constant volume,",
            math: L`W=\int P\,dV=0`,
          },
        ],
      },
      {
        questionLatex: L`For a complete thermodynamic cycle, the change in internal energy is`,
        difficulty: 2,
        skillTags: ["cyclic_process", "internal_energy"],
        choices: [
          L`zero`,
          L`equal to the heat absorbed`,
          L`equal to the work done`,
          L`always negative`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Over a cycle, net heat equals net work, but internal energy change is zero.",
          C: "Internal energy returns to its initial value.",
          D: "There is no rule that it must be negative; it is exactly zero.",
        },
        hints: [
          L`A cycle ends at the initial state.`,
          L`Internal energy is a state function.`,
          L`Same initial and final state means no change in internal energy.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Because internal energy is a state function, returning to the initial state gives",
            math: L`\Delta U_{\text{cycle}}=0`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Heat and work are not state functions. Reason (R): Heat and work depend on the path followed between two thermodynamic states.`,
        difficulty: 4,
        skillTags: ["assertion_reason", "path_function", "state_function"],
        choices: [
          L`Both A and R are true, but R does not explain A`,
          L`Both A and R are true, and R explains A`,
          L`A is true but R is false`,
          L`A is false but R is true`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason directly explains why heat and work are not state functions.",
          C: "The reason is true: heat and work are path dependent.",
          D: "The assertion is also true.",
        },
        hints: [
          L`Compare heat/work with pressure, volume, temperature, and internal energy.`,
          L`Ask whether the value depends only on endpoints.`,
          L`Path dependence is exactly why they are not state functions.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Heat and work are modes of energy transfer and depend on the process path.",
          },
          {
            step: 2,
            explanation:
              "Therefore both statements are true, and the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the first law of thermodynamics using the convention that $W$ is work done by the system.`,
        difficulty: 1,
        skillTags: ["first_law", "sign_convention"],
        parts: [
          { letter: "a", promptMarkdown: "Write the equation.", points: 1 },
        ],
        hints: [
          L`Heat supplied increases internal energy and can also become work.`,
          L`Use $Q$, $\Delta U$, and $W$.`,
          L`With work done by system positive, $Q=\Delta U+W$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Writes $Q=\\Delta U+W$ or $\\Delta U=Q-W$ with convention stated.",
            },
          ],
        },
        commonErrors: [
          L`Writing the opposite sign convention without stating it.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`With $W$ as work done by the system, $Q=\Delta U+W$, or equivalently $\Delta U=Q-W$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas absorbs $700\text{ J}$ of heat and expands, doing $250\text{ J}$ of work.`,
        difficulty: 2,
        skillTags: ["first_law", "internal_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the change in internal energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State whether the internal energy increases or decreases.",
            points: 1,
          },
        ],
        hints: [
          L`Use $\Delta U=Q-W$.`,
          L`Heat absorbed is positive.`,
          L`Expansion work done by the gas is positive.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $450\\text{ J}$." },
            {
              part: "b",
              points: 1,
              description: "States internal energy increases.",
            },
          ],
        },
        commonErrors: [
          L`Adding $700$ and $250$ instead of subtracting work done by the gas.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$\Delta U=Q-W=700-250=450\text{ J}$.` },
          {
            part: "b",
            explanation: "The positive value means internal energy increases.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`During compression, $120\text{ J}$ of work is done on a gas and the gas loses $50\text{ J}$ of heat to the surroundings.`,
        difficulty: 3,
        skillTags: ["first_law", "compression", "sign_convention"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write $Q$ and $W$ where $W$ is work done by the gas.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $\\Delta U$.", points: 2 },
        ],
        hints: [
          L`Heat lost means $Q$ is negative.`,
          L`Work done on the gas means work done by the gas is negative.`,
          L`Use $\Delta U=Q-W$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $Q=-50\\text{ J}$ and $W=-120\\text{ J}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $\\Delta U=+70\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Using $W=+120\text{ J}$ even though the gas is compressed.`,
          L`Treating heat lost as positive.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$Q=-50\text{ J}$ and $W_{\text{by gas}}=-120\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`$\Delta U=Q-W=-50-(-120)=+70\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A gas goes from A to B and then from B to C. In A to B, it absorbs $500\text{ J}$ of heat and does $200\text{ J}$ of work. In B to C, it loses $100\text{ J}$ of heat and $250\text{ J}$ of work is done on it.`,
        difficulty: 4,
        skillTags: ["first_law", "multi_step_process", "sign_convention"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $\\Delta U$ for A to B.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find $\\Delta U$ for B to C.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the total change in internal energy from A to C.",
            points: 1,
          },
        ],
        hints: [
          L`Use the same sign convention throughout.`,
          L`Work done on the gas means $W_{\text{by gas}}$ is negative.`,
          L`Add the two internal-energy changes.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $300\\text{ J}$." },
            {
              part: "b",
              points: 2,
              description:
                "Uses $Q=-100\\text{ J}$, $W=-250\\text{ J}$ and gets $150\\text{ J}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds total $\\Delta U=450\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Changing sign convention between the two stages.`,
          L`Writing heat lost as positive.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For A to B, $\Delta U=500-200=300\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`For B to C, $Q=-100\text{ J}$ and $W=-250\text{ J}$, so $\Delta U=-100-(-250)=150\text{ J}$.`,
          },
          { part: "c", explanation: L`Total change $=300+150=450\text{ J}$.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A paddle wheel stirs water in an insulated vessel. The shaft does $900\text{ J}$ of work on the water and no heat is exchanged with the surroundings.`,
        difficulty: 3,
        skillTags: ["adiabatic_process", "work_on_system", "internal_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "What is $Q$ for the water?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "What is the work done by the water?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the change in internal energy of the water.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State what should happen to the temperature of the water.",
            points: 1,
          },
        ],
        hints: [
          L`Insulated means no heat exchange.`,
          L`Work is done on the water, not by the water.`,
          L`Use $\Delta U=Q-W_{\text{by system}}$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States $Q=0$." },
            {
              part: "b",
              points: 1,
              description: "Writes work done by water as $-900\\text{ J}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $\\Delta U=+900\\text{ J}$.",
            },
            { part: "d", points: 1, description: "States temperature rises." },
          ],
        },
        commonErrors: [
          L`Saying no heat exchange means no energy change.`,
          L`Using $+900\text{ J}$ as work done by the water.`,
        ],
        workedSolution: [
          { part: "a", explanation: "Since the vessel is insulated, $Q=0$." },
          {
            part: "b",
            explanation: L`Work done by the water is $W=-900\text{ J}$ because work is done on it.`,
          },
          { part: "c", explanation: L`$\Delta U=0-(-900)=+900\text{ J}$.` },
          { part: "d", explanation: "The water's temperature should rise." },
        ],
      },
    ],
  },
  {
    topicCode: "8.3",
    title: "Work and P-V Diagrams",
    subtopic:
      "Work done by a gas, isobaric and isochoric processes, area under a P-V graph, and cyclic work.",
    mc: [
      {
        questionLatex: L`A gas expands at constant pressure $2.0\times10^5\text{ Pa}$ from $1.0\text{ L}$ to $3.0\text{ L}$. The work done by the gas is`,
        difficulty: 2,
        skillTags: ["isobaric_work", "pv_work"],
        choices: [
          L`$4.0\times10^5\text{ J}$`,
          L`$200\text{ J}$`,
          L`$400\text{ J}$`,
          L`$0$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This forgets to convert litres to cubic metres.",
          B: "This uses the initial volume instead of the volume change.",
          D: "Work is zero only if volume is constant.",
        },
        hints: [
          L`For constant pressure, $W=P\Delta V$.`,
          L`$2.0\text{ L}=2.0\times10^{-3}\text{ m}^3$.`,
          L`Multiply by $2.0\times10^5\text{ Pa}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The volume change is",
            math: L`\Delta V=2.0\text{ L}=2.0\times10^{-3}\text{ m}^3`,
          },
          {
            step: 2,
            explanation: "Work done is",
            math: L`W=P\Delta V=(2.0\times10^5)(2.0\times10^{-3})=400\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`The work done by a gas in an isochoric process is`,
        difficulty: 1,
        skillTags: ["isochoric_process", "pv_work"],
        choices: [L`positive`, L`negative`, L`equal to heat supplied`, L`zero`],
        correctLetter: "D",
        rationales: {
          A: "Positive work requires expansion.",
          B: "Negative work requires compression.",
          C: "At constant volume, heat changes internal energy, not work.",
        },
        hints: [
          L`Isochoric means constant volume.`,
          L`Work is area under a P-V curve.`,
          L`No change in volume gives zero area.`,
        ],
        solution: [
          { step: 1, explanation: "Since $dV=0$,", math: L`W=\int P\,dV=0` },
        ],
      },
      {
        questionLatex: L`A rectangular cycle on a $P$-$V$ diagram has pressure levels $1.0\times10^5\text{ Pa}$ and $3.0\times10^5\text{ Pa}$, and volume levels $1.0\times10^{-3}\text{ m}^3$ and $4.0\times10^{-3}\text{ m}^3$. The magnitude of net work in one cycle is`,
        difficulty: 3,
        figure: pvCycleFigure,
        skillTags: ["cyclic_process", "pv_area", "net_work"],
        choices: [
          L`$600\text{ J}$`,
          L`$300\text{ J}$`,
          L`$900\text{ J}$`,
          L`$1200\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses only half the rectangle area.",
          C: "This adds the pressure levels instead of using their difference.",
          D: "This doubles the rectangle area.",
        },
        hints: [
          L`Net cyclic work is the area enclosed on the P-V graph.`,
          L`Area $=\Delta P\,\Delta V$.`,
          L`Use $2.0\times10^5$ and $3.0\times10^{-3}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The enclosed area is",
            math: L`(3.0-1.0)\times10^5(4.0-1.0)\times10^{-3}=600\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`On a $P$-$V$ diagram, the work done by a gas during expansion is represented by`,
        difficulty: 2,
        skillTags: ["pv_graph", "work_area"],
        choices: [
          L`slope of the curve`,
          L`area under the curve`,
          L`area left of the curve on the pressure axis`,
          L`change in pressure only`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The slope of a P-V graph does not directly give work.",
          C: "Work is the integral of pressure with respect to volume.",
          D: "Pressure change alone is insufficient.",
        },
        hints: [
          L`Work is $\int P\,dV$.`,
          L`On a P-V graph, pressure is vertical and volume is horizontal.`,
          L`The integral is an area under the curve.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a quasistatic process,",
            math: L`W=\int P\,dV`,
          },
        ],
      },
      {
        questionLatex: L`A gas is taken from state A to state C by two different paths as shown. Which statement is correct?`,
        difficulty: 4,
        figure: pvTwoPathFigure,
        skillTags: ["path_dependence", "pv_work", "state_function"],
        choices: [
          L`Change in internal energy must be different along the two paths`,
          L`Work done must be zero along both paths`,
          L`Work done can be different along the two paths`,
          L`Heat supplied must be the same along both paths`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Internal energy is a state function, so its change depends only on A and C.",
          B: "Both paths involve volume change, so work need not be zero.",
          D: "Heat is also path dependent, because $Q=\\Delta U+W$.",
        },
        hints: [
          L`Compare state functions and path functions.`,
          L`The endpoints are the same for both paths.`,
          L`Work is area under the path on a P-V graph.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Work is area under the P-V path, so different paths can give different work.",
          },
          {
            step: 2,
            explanation:
              "The internal energy change is the same because the endpoints are the same.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`A gas expands at constant pressure $2.0\times10^5\text{ Pa}$ from $0.020\text{ m}^3$ to $0.050\text{ m}^3$. The work done by the gas is`,
        difficulty: 2,
        skillTags: ["pv_work", "isobaric_process"],
        choices: [
          L`$6.0\times10^3\text{ J}$`,
          L`$1.0\times10^4\text{ J}$`,
          L`$4.0\times10^3\text{ J}$`,
          L`$1.4\times10^4\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This uses final volume instead of change in volume.`,
          C: L`This uses initial volume instead of change in volume.`,
          D: L`This adds volumes instead of subtracting them.`,
        },
        hints: [
          L`For constant pressure, $W=P\Delta V$.`,
          L`The change in volume is $0.030\text{ m}^3$.`,
          L`Expansion means work done by the gas is positive.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Work done is",
            math: L`W=P\Delta V=(2.0\times10^5)(0.030)=6.0\times10^3\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`In a straight-line $P-V$ process, pressure changes from $1.0\times10^5\text{ Pa}$ to $3.0\times10^5\text{ Pa}$ while volume increases by $0.020\text{ m}^3$. The work done by the gas is`,
        difficulty: 4,
        skillTags: ["pv_work", "linear_pv_path"],
        choices: [
          L`$4.0\times10^3\text{ J}$`,
          L`$2.0\times10^3\text{ J}$`,
          L`$6.0\times10^3\text{ J}$`,
          L`$8.0\times10^3\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This uses only the initial pressure.`,
          C: L`This uses only the final pressure.`,
          D: L`This adds initial and final pressures without averaging.`,
        },
        hints: [
          L`Work is area under the $P-V$ graph.`,
          L`For a straight line, use average pressure.`,
          L`Average pressure is $2.0\times10^5\text{ Pa}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Area under the straight line is",
            math: L`W=\frac{P_1+P_2}{2}\Delta V=(2.0\times10^5)(0.020)=4.0\times10^3\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`A rectangular clockwise cycle on a $P-V$ diagram has pressure difference $2.0\times10^5\text{ Pa}$ and volume difference $0.010\text{ m}^3$. The net work done by the gas per cycle is`,
        difficulty: 3,
        skillTags: ["cyclic_process", "pv_diagram_area"],
        choices: [
          L`$2.0\times10^3\text{ J}$`,
          L`$2.0\times10^5\text{ J}$`,
          L`$2.0\times10^{-3}\text{ J}$`,
          L`$0$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This omits the volume difference factor.`,
          C: L`This has an incorrect power of ten.`,
          D: L`A cycle can have non-zero net work if it encloses area.`,
        },
        hints: [
          L`Net work over a cycle is the enclosed area.`,
          L`Clockwise cycle means positive work by the gas.`,
          L`Multiply $\Delta P$ and $\Delta V$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The enclosed area is",
            math: L`W=(2.0\times10^5)(0.010)=2.0\times10^3\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`For an isochoric process of a gas, the work done by the gas is`,
        difficulty: 1,
        skillTags: ["isochoric_process", "pv_work"],
        choices: [L`zero`, L`positive`, L`negative`, L`equal to pressure`],
        correctLetter: "A",
        rationales: {
          B: L`Work requires change in volume.`,
          C: L`Compression work would be negative, but volume is fixed here.`,
          D: L`Pressure is not work; work is area under a $P-V$ curve.`,
        },
        hints: [
          L`Isochoric means constant volume.`,
          L`$W=\int P\,dV$.`,
          L`Here $dV=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Since volume does not change,",
            math: L`W=\int P\,dV=0`,
          },
        ],
      },
      {
        questionLatex: L`A gas is compressed at constant external pressure $1.0\times10^5\text{ Pa}$ from $0.050\text{ m}^3$ to $0.020\text{ m}^3$. The work done by the gas is`,
        difficulty: 3,
        skillTags: ["compression_work", "sign_convention"],
        choices: [
          L`$-3.0\times10^3\text{ J}$`,
          L`$+3.0\times10^3\text{ J}$`,
          L`$-7.0\times10^3\text{ J}$`,
          L`$+7.0\times10^3\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Compression gives negative work done by the gas.`,
          C: L`This uses the sum of volumes instead of the change.`,
          D: L`This uses the sum and also gives the wrong sign.`,
        },
        hints: [
          L`Work done by gas is $P(V_f-V_i)$.`,
          L`Here $V_f<V_i$.`,
          L`The sign should be negative.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the signed work.",
            math: L`W=P(V_f-V_i)=10^5(0.020-0.050)=-3.0\times10^3\text{ J}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A gas expands at constant pressure $1.5\times10^5\text{ Pa}$ through a volume change $4.0\times10^{-3}\text{ m}^3$. Find the work done by the gas.`,
        difficulty: 1,
        skillTags: ["isobaric_work"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the work done.",
            points: 1,
          },
        ],
        hints: [
          L`Use $W=P\Delta V$.`,
          L`The volume change is already in SI units.`,
          L`Multiply $1.5\times10^5$ by $4.0\times10^{-3}$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: "Finds $600\\text{ J}$." },
          ],
        },
        commonErrors: [L`Using $P/\Delta V$ instead of $P\Delta V$.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$W=P\Delta V=(1.5\times10^5)(4.0\times10^{-3})=600\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas follows the path A to B to C on the diagram. Along A to B, volume increases at pressure $1.0\times10^5\text{ Pa}$ from $1.0\text{ L}$ to $4.0\text{ L}$. Along B to C, volume is constant.`,
        difficulty: 3,
        figure: pvTwoPathFigure,
        skillTags: ["pv_work", "isobaric_process", "isochoric_process"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the work done along A to B.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work done along B to C.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find total work along A to B to C.",
            points: 1,
          },
        ],
        hints: [
          L`Only volume-changing parts contribute work.`,
          L`Convert litres to cubic metres.`,
          L`A vertical line on a P-V graph has zero work.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $300\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $0$." },
            {
              part: "c",
              points: 1,
              description: "Finds total work $300\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Assigning work to the constant-volume segment.`,
          L`Forgetting litre-to-cubic-metre conversion.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$W_{AB}=P\Delta V=(1.0\times10^5)(3.0\times10^{-3})=300\text{ J}$.`,
          },
          { part: "b", explanation: L`B to C is isochoric, so $W_{BC}=0$.` },
          { part: "c", explanation: L`Total work $=300+0=300\text{ J}$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A gas goes around a rectangular cycle A-B-C-D-A on a $P$-$V$ diagram. The lower pressure is $1.0\times10^5\text{ Pa}$, upper pressure is $4.0\times10^5\text{ Pa}$, lower volume is $2.0\times10^{-3}\text{ m}^3$, and upper volume is $5.0\times10^{-3}\text{ m}^3$. The direction is A to B to C to D to A as shown.`,
        difficulty: 4,
        figure: pvCycleFigure,
        skillTags: ["cyclic_process", "pv_work", "first_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the magnitude of net work in one cycle.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State whether the sign of work done by the gas is positive or negative for the shown direction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the net heat exchanged by the gas in one cycle, with sign.",
            points: 1,
          },
        ],
        hints: [
          L`The magnitude of cyclic work equals the enclosed area.`,
          L`Expansion occurs on the lower-pressure branch, while compression occurs on the higher-pressure branch.`,
          L`For a complete cycle, $\Delta U=0$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds area $900\\text{ J}$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States work is negative for the shown counterclockwise direction.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Uses $\\Delta U=0$ to find net heat $-900\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Using the sum of pressure levels instead of pressure difference.`,
          L`Assuming the shown cycle is clockwise.`,
          L`Forgetting that cyclic $\Delta U$ is zero.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Area $=\Delta P\Delta V=(3.0\times10^5)(3.0\times10^{-3})=900\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`Along A-B the gas expands at lower pressure, while along C-D it is compressed at higher pressure. Hence the shown A-B-C-D-A cycle has negative net work by the gas: $W_{\text{net}}=-900\text{ J}$.`,
          },
          {
            part: "c",
            explanation: L`For a cycle $\Delta U=0$, so $Q_{\text{net}}=W_{\text{net}}=-900\text{ J}$. The gas rejects $900\text{ J}$ of heat overall.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`During a quasistatic expansion, pressure changes linearly from $1.0\times10^5\text{ Pa}$ to $3.0\times10^5\text{ Pa}$ while volume changes from $1.0\text{ L}$ to $3.0\text{ L}$.`,
        difficulty: 4,
        skillTags: ["pv_work", "linear_process", "area_under_graph"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the average pressure during the linear process.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work done by the gas.",
            points: 2,
          },
        ],
        hints: [
          L`For a straight line on a P-V graph, use trapezium area.`,
          L`Average pressure is the mean of endpoint pressures.`,
          L`Convert litre change to cubic metres.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2.0\\times10^5\\text{ Pa}$.",
            },
            { part: "b", points: 2, description: "Finds $400\\text{ J}$." },
          ],
        },
        commonErrors: [
          L`Using only final pressure.`,
          L`Not converting $2.0\text{ L}$ to $2.0\times10^{-3}\text{ m}^3$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Average pressure $=(1.0+3.0)\times10^5/2=2.0\times10^5\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`$W=P_{\text{avg}}\Delta V=(2.0\times10^5)(2.0\times10^{-3})=400\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A gas is taken from state A to state C by either path I through B or by direct path II, as shown. The endpoints A and C are the same in both cases.`,
        difficulty: 4,
        figure: pvTwoPathFigure,
        skillTags: ["path_dependence", "pv_work", "first_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which quantity is represented by the area under each path?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Can the work done be different for paths I and II?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Is the change in internal energy different for the two paths?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "What does the first law imply about heat supplied along the two paths if work differs?",
            points: 1,
          },
        ],
        hints: [
          L`Work is area under a P-V path.`,
          L`Internal energy depends only on state.`,
          L`Use $Q=\Delta U+W$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies work done by the gas.",
            },
            {
              part: "b",
              points: 1,
              description: "States yes, work can differ.",
            },
            {
              part: "c",
              points: 1,
              description: "States no, $\\Delta U$ is the same.",
            },
            {
              part: "d",
              points: 1,
              description:
                "States heat supplied must differ if work differs for the same $\\Delta U$.",
            },
          ],
        },
        commonErrors: [
          L`Assuming all quantities must be the same because endpoints are the same.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Area under a path on a P-V graph gives work done by the gas.",
          },
          {
            part: "b",
            explanation:
              "Yes. Different paths can enclose different areas under the curve.",
          },
          {
            part: "c",
            explanation:
              "No. Internal energy is a state function, so the change from A to C is fixed.",
          },
          {
            part: "d",
            explanation: L`Since $Q=\Delta U+W$, different $W$ with the same $\Delta U$ means different heat supplied.`,
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A gas expands at constant pressure $1.5\times10^5\text{ Pa}$ by $0.040\text{ m}^3$.`,
        difficulty: 2,
        skillTags: ["pv_work", "isobaric_process"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the work done by the gas.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $W=P\Delta V$.`,
          L`The process is an expansion.`,
          L`Multiply pressure by volume change.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $6.0\times10^3\text{ J}$.`,
            },
          ],
        },
        commonErrors: [L`Using volume instead of change in volume.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`W=P\Delta V=(1.5\times10^5)(0.040)=6.0\times10^3\text{ J}.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas goes from state A to state B along a straight line on a $P-V$ graph. At A, $P=1.0\times10^5\text{ Pa}$; at B, $P=2.0\times10^5\text{ Pa}$. The volume increases from $0.010\text{ m}^3$ to $0.030\text{ m}^3$.`,
        difficulty: 4,
        skillTags: ["pv_work", "linear_pv_path"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the average pressure along the straight path.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the work done by the gas.`,
            points: 2,
          },
        ],
        hints: [
          L`For a straight line, the area is a trapezium.`,
          L`Average pressure is $(P_A+P_B)/2$.`,
          L`Multiply average pressure by volume change.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $1.5\times10^5\text{ Pa}$.`,
            },
            {
              part: "b",
              points: 2,
              description: L`Finds $3.0\times10^3\text{ J}$.`,
            },
          ],
        },
        commonErrors: [L`Using only the final pressure for the whole path.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$P_{\text{avg}}=(1.0+2.0)\times10^5/2=1.5\times10^5\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`$\Delta V=0.020\text{ m}^3$, so $W=P_{\text{avg}}\Delta V=3.0\times10^3\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas undergoes a rectangular clockwise cycle on a $P-V$ diagram. The higher pressure is $4.0\times10^5\text{ Pa}$, the lower pressure is $1.0\times10^5\text{ Pa}$, and the volume changes between $0.010\text{ m}^3$ and $0.030\text{ m}^3$.`,
        difficulty: 4,
        skillTags: ["cyclic_process", "pv_diagram_area"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the area enclosed by the cycle.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`State the sign of work done by the gas.`,
            points: 1,
          },
        ],
        hints: [
          L`Area of the rectangle is $\Delta P\Delta V$.`,
          L`Clockwise cycles give positive work by the gas.`,
          L`The net work is the enclosed area with sign.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $6.0\times10^3\text{ J}$.`,
            },
            { part: "b", points: 1, description: "States positive." },
          ],
        },
        commonErrors: [
          L`Saying every cycle has zero work because it returns to the same state.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\Delta P=3.0\times10^5\text{ Pa}$ and $\Delta V=0.020\text{ m}^3$, so area is $6.0\times10^3\text{ J}$.`,
          },
          {
            part: "b",
            explanation:
              "The cycle is clockwise, so net work done by the gas is positive.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A gas can go from the same initial state to the same final state by two paths. Path 1 is an isobaric expansion at $2.0\times10^5\text{ Pa}$ from $0.010\text{ m}^3$ to $0.040\text{ m}^3$. Path 2 first changes pressure at constant volume and then expands at $1.0\times10^5\text{ Pa}$ to the same final volume.`,
        difficulty: 5,
        skillTags: ["path_dependence", "pv_work", "isochoric_process"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the work done along path 1.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the work done along path 2.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Explain what this shows about work in thermodynamics.`,
            points: 2,
          },
        ],
        hints: [
          L`Work in the constant-volume step is zero.`,
          L`Use $P\Delta V$ for each horizontal step.`,
          L`Compare two paths with the same end states.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $6.0\times10^3\text{ J}$.`,
            },
            {
              part: "b",
              points: 1,
              description: L`Finds $3.0\times10^3\text{ J}$.`,
            },
            {
              part: "c",
              points: 2,
              description:
                "States work is path dependent, not a state function.",
            },
          ],
        },
        commonErrors: [
          L`Assuming same initial and final states force the same work.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`W_1=(2.0\times10^5)(0.030)=6.0\times10^3\text{ J}.`,
          },
          {
            part: "b",
            explanation: L`The constant-volume step has zero work. The expansion work is $(1.0\times10^5)(0.030)=3.0\times10^3\text{ J}$.`,
          },
          {
            part: "c",
            explanation:
              "The two paths have the same end states but different work, so thermodynamic work is path dependent.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A fixed mass of gas undergoes three processes: A is constant volume, B is constant pressure expansion, and C is constant pressure compression.`,
        difficulty: 4,
        skillTags: ["pv_work", "sign_convention", "process_identification"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Which process has zero work?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Which process has positive work done by the gas?`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Which process has negative work done by the gas?`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Name the graph quantity whose area gives work.`,
            points: 1,
          },
        ],
        hints: [
          L`Work is $\int P\,dV$.`,
          L`Expansion means $dV>0$.`,
          L`Compression means $dV<0$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies A." },
            { part: "b", points: 1, description: "Identifies B." },
            { part: "c", points: 1, description: "Identifies C." },
            {
              part: "d",
              points: 1,
              description: "States area under the P-V graph.",
            },
          ],
        },
        commonErrors: [L`Ignoring the sign of volume change.`],
        workedSolution: [
          {
            part: "a",
            explanation: "A has zero work because volume is constant.",
          },
          {
            part: "b",
            explanation:
              "B is an expansion, so work done by the gas is positive.",
          },
          {
            part: "c",
            explanation:
              "C is compression, so work done by the gas is negative.",
          },
          {
            part: "d",
            explanation: "The area under the pressure-volume graph gives work.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.4",
    title: "Isothermal and Adiabatic Processes",
    subtopic:
      "Isothermal and adiabatic changes of ideal gases, internal energy, heat exchange, and P-V curve comparison.",
    mc: [
      {
        questionLatex: L`For an ideal gas undergoing an isothermal process, the change in internal energy is`,
        difficulty: 2,
        skillTags: ["isothermal_process", "internal_energy"],
        choices: [
          L`positive for expansion`,
          L`negative for expansion`,
          L`equal to work done`,
          L`zero`,
        ],
        correctLetter: "D",
        rationales: {
          A: "For an ideal gas, internal energy depends only on temperature.",
          B: "Expansion alone does not fix internal-energy change; temperature does.",
          C: "In isothermal expansion, heat supplied equals work done, while internal-energy change is zero.",
        },
        hints: [
          L`Internal energy of an ideal gas depends only on temperature.`,
          L`Isothermal means constant temperature.`,
          L`Therefore $\Delta U=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For an ideal gas in an isothermal process,",
            math: L`\Delta T=0\Rightarrow \Delta U=0`,
          },
        ],
      },
      {
        questionLatex: L`In an adiabatic process,`,
        difficulty: 1,
        skillTags: ["adiabatic_process"],
        choices: [
          L`no heat is exchanged with the surroundings`,
          L`temperature is always constant`,
          L`pressure is always constant`,
          L`work done is always zero`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Temperature can change in an adiabatic process.",
          C: "Pressure need not remain constant.",
          D: "Adiabatic processes can involve work and internal-energy change.",
        },
        hints: [
          L`Adiabatic refers to heat exchange.`,
          L`It does not mean no work.`,
          L`The condition is $Q=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "By definition, an adiabatic process has no heat exchange.",
            math: L`Q=0`,
          },
        ],
      },
      {
        questionLatex: L`A fixed amount of ideal gas is compressed isothermally from volume $V$ to $V/2$. Its pressure becomes`,
        difficulty: 2,
        skillTags: ["isothermal_process", "boyle_law"],
        choices: [L`half`, L`twice`, L`four times`, L`unchanged`],
        correctLetter: "B",
        rationales: {
          A: "In isothermal compression, pressure increases as volume decreases.",
          C: "Pressure is inversely proportional to volume, not to volume squared.",
          D: "Pressure changes because volume changes.",
        },
        hints: [
          L`For isothermal ideal gas, $PV$ is constant.`,
          L`If volume is halved, pressure must compensate.`,
          L`$P'=2P$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "At constant temperature,",
            math: L`PV=P'(V/2)\Rightarrow P'=2P`,
          },
        ],
      },
      {
        questionLatex: L`For an adiabatic expansion of an ideal gas, which statement is correct?`,
        difficulty: 3,
        skillTags: ["adiabatic_expansion", "first_law"],
        choices: [
          L`The gas temperature remains constant`,
          L`Heat supplied equals work done`,
          L`The gas cools because it does work without heat input`,
          L`Internal energy necessarily increases`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Constant temperature is the isothermal condition.",
          B: "Adiabatic means no heat is supplied.",
          D: "During adiabatic expansion, internal energy decreases for an ideal gas.",
        },
        hints: [
          L`For adiabatic expansion, $Q=0$ and $W>0$.`,
          L`Use $\Delta U=Q-W$.`,
          L`The internal energy decreases, so temperature decreases for an ideal gas.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For adiabatic expansion,",
            math: L`\Delta U=0-W<0`,
          },
          {
            step: 2,
            explanation:
              "For an ideal gas, lower internal energy means lower temperature.",
          },
        ],
      },
      {
        questionLatex: L`From the same initial state A, two expansion curves I and II are shown. Curve II is steeper and falls to lower pressure for the same final volume. For an ideal gas, curve II represents`,
        difficulty: 4,
        figure: isoAdiFigure,
        skillTags: ["isothermal_adiabatic_graph", "pv_curve"],
        choices: [
          L`an isothermal expansion`,
          L`an isobaric expansion`,
          L`an isochoric process`,
          L`an adiabatic expansion`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The isothermal curve is less steep than the adiabatic curve from the same initial state.",
          B: "An isobaric process would be a horizontal line.",
          C: "An isochoric process would be a vertical line.",
        },
        hints: [
          L`For expansion from the same state, an adiabatic curve is steeper than an isothermal curve.`,
          L`Adiabatic expansion cools the gas.`,
          L`At the same larger volume, the adiabatic pressure is lower.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For an ideal gas, an adiabatic expansion falls more steeply than an isothermal expansion from the same initial state.",
          },
          {
            step: 2,
            explanation:
              "Thus the steeper lower-pressure curve II is adiabatic.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`For an ideal gas undergoing an isothermal process, the change in internal energy is`,
        difficulty: 2,
        skillTags: ["isothermal_process", "internal_energy"],
        choices: [
          L`zero`,
          L`equal to work done`,
          L`equal to heat rejected`,
          L`always negative`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`For an ideal gas, internal energy depends only on temperature.`,
          C: L`Heat may be exchanged, but $\Delta U$ is zero if temperature is constant.`,
          D: L`The sign is not always negative; it is zero.`,
        },
        hints: [
          L`Internal energy of an ideal gas depends on temperature.`,
          L`Isothermal means constant temperature.`,
          L`Therefore $\Delta U=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For an ideal gas in an isothermal process, temperature is unchanged, so internal energy is unchanged.",
          },
        ],
      },
      {
        questionLatex: L`An ideal gas expands adiabatically and does $300\text{ J}$ of work. The change in internal energy of the gas is`,
        difficulty: 3,
        skillTags: ["adiabatic_process", "first_law"],
        choices: [
          L`$-300\text{ J}$`,
          L`$+300\text{ J}$`,
          L`$0$`,
          L`$+600\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Expansion work done by the gas decreases internal energy when $Q=0$.`,
          C: L`Zero change applies to isothermal ideal-gas processes, not generally to adiabatic expansion.`,
          D: L`This adds instead of using $\Delta U=Q-W$.`,
        },
        hints: [
          L`Adiabatic means $Q=0$.`,
          L`Use $\Delta U=Q-W$ with $W$ done by the gas.`,
          L`Here $W=+300\text{ J}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the first law.",
            math: L`\Delta U=Q-W=0-300=-300\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`During isothermal compression of an ideal gas, work done by the gas is`,
        difficulty: 2,
        skillTags: ["isothermal_process", "compression_work"],
        choices: [L`negative`, L`positive`, L`zero`, L`equal to pressure`],
        correctLetter: "A",
        rationales: {
          B: L`Compression means volume decreases, so work done by the gas is negative.`,
          C: L`Isothermal does not mean zero work; it means constant temperature.`,
          D: L`Pressure alone is not work.`,
        },
        hints: [
          L`Work done by gas is $\int P\,dV$.`,
          L`For compression, $dV<0$.`,
          L`So the work done by gas is negative.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In compression, volume decreases; hence $dV$ is negative and the work done by the gas is negative.",
          },
        ],
      },
      {
        questionLatex: L`In a reversible adiabatic process of an ideal gas, if volume doubles from $V$ to $2V$, the pressure changes from $P$ to`,
        difficulty: 4,
        skillTags: ["adiabatic_relation", "pressure_volume_relation"],
        choices: [
          L`$\frac{P}{2^\gamma}$`,
          L`$\frac P2$`,
          L`$2^\gamma P$`,
          L`$2P$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This would be the isothermal relation $PV=$ constant, not adiabatic.`,
          C: L`Pressure decreases during expansion.`,
          D: L`This is the opposite of expansion behaviour.`,
        },
        hints: [
          L`For reversible adiabatic change, $PV^\gamma=$ constant.`,
          L`Set $P V^\gamma=P'(2V)^\gamma$.`,
          L`Solve for $P'$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the adiabatic relation.",
            math: L`P V^\gamma=P'(2V)^\gamma\Rightarrow P'=\frac{P}{2^\gamma}`,
          },
        ],
      },
      {
        questionLatex: L`For an ideal gas expanding isothermally, the heat absorbed by the gas is`,
        difficulty: 3,
        skillTags: ["isothermal_process", "first_law"],
        choices: [
          L`equal to the work done by the gas`,
          L`zero`,
          L`equal to the decrease in internal energy`,
          L`always negative`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Heat must enter to keep temperature constant while the gas does work.`,
          C: L`For an ideal gas isothermal process, internal energy does not decrease.`,
          D: L`Expansion work is positive, so heat absorbed is positive.`,
        },
        hints: [
          L`For isothermal ideal gas, $\Delta U=0$.`,
          L`Use $\Delta U=Q-W$.`,
          L`Therefore $Q=W$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $\\Delta U=0$, the first law gives $Q=W$ for work done by the gas.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An ideal gas expands isothermally and does $600\text{ J}$ of work. Find the heat supplied to the gas.`,
        difficulty: 2,
        skillTags: ["isothermal_process", "first_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the heat supplied.",
            points: 1,
          },
        ],
        hints: [
          L`For ideal gas isothermal process, $\Delta U=0$.`,
          L`Use $Q=\Delta U+W$.`,
          L`So $Q=W$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: "Finds $600\\text{ J}$." },
          ],
        },
        commonErrors: [
          L`Setting heat to zero, confusing isothermal with adiabatic.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For isothermal ideal gas, $\Delta U=0$, so $Q=W=600\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An ideal gas is compressed adiabatically. $300\text{ J}$ of work is done on the gas.`,
        difficulty: 3,
        skillTags: ["adiabatic_compression", "first_law"],
        parts: [
          { letter: "a", promptMarkdown: "Find $Q$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\Delta U$.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "State whether temperature rises or falls.",
            points: 1,
          },
        ],
        hints: [
          L`Adiabatic means no heat exchange.`,
          L`Work done on the gas increases internal energy.`,
          L`For ideal gas, internal energy follows temperature.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $Q=0$." },
            {
              part: "b",
              points: 1,
              description: "Finds $\\Delta U=+300\\text{ J}$.",
            },
            { part: "c", points: 1, description: "States temperature rises." },
          ],
        },
        commonErrors: [L`Using $\Delta U=0$ because no heat is exchanged.`],
        workedSolution: [
          { part: "a", explanation: L`For an adiabatic process, $Q=0$.` },
          {
            part: "b",
            explanation: L`Work done by the gas is $-300\text{ J}$, so $\Delta U=0-(-300)=+300\text{ J}$.`,
          },
          {
            part: "c",
            explanation:
              "For an ideal gas, the temperature rises because internal energy increases.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`One mole of ideal gas at pressure $P$ and volume $V$ is expanded isothermally until the volume becomes $2V$.`,
        difficulty: 3,
        skillTags: ["isothermal_process", "boyle_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the final pressure in terms of $P$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "What is the change in internal energy?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If the gas does work during expansion, what can you say about heat supplied?",
            points: 1,
          },
        ],
        hints: [
          L`In an isothermal ideal-gas process, $PV$ is constant.`,
          L`Internal energy depends only on temperature.`,
          L`Use the first law after setting $\Delta U=0$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $P/2$." },
            { part: "b", points: 1, description: "States $\\Delta U=0$." },
            {
              part: "c",
              points: 1,
              description: "States heat supplied equals work done.",
            },
          ],
        },
        commonErrors: [
          L`Saying pressure remains $P$ because temperature is constant.`,
          L`Setting heat supplied to zero.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$PV=P_f(2V)$, so $P_f=P/2$.` },
          {
            part: "b",
            explanation:
              "For an ideal gas at constant temperature, internal-energy change is zero.",
          },
          {
            part: "c",
            explanation: L`Since $\Delta U=0$, the first law gives $Q=W$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An ideal gas starts from state A. It may expand either isothermally or adiabatically to the same final volume. The two curves are shown as I and II, with II steeper.`,
        difficulty: 4,
        figure: isoAdiFigure,
        skillTags: ["isothermal_adiabatic_graph", "first_law", "pv_curve"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify which curve is adiabatic.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "For the adiabatic expansion, state the sign of $Q$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "For the adiabatic expansion, state the sign of $\\Delta U$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why the adiabatic curve lies below the isothermal curve at the same larger volume.",
            points: 1,
          },
        ],
        hints: [
          L`Adiabatic expansion is steeper than isothermal expansion.`,
          L`Use $Q=0$ for adiabatic change.`,
          L`If the gas does work with no heat input, its internal energy decreases.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies curve II as adiabatic.",
            },
            { part: "b", points: 1, description: "States $Q=0$." },
            { part: "c", points: 1, description: "States $\\Delta U<0$." },
            {
              part: "d",
              points: 1,
              description:
                "Explains cooling reduces pressure compared with isothermal expansion.",
            },
          ],
        },
        commonErrors: [
          L`Identifying the upper curve as adiabatic because it has higher pressure.`,
          L`Confusing adiabatic with isothermal.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Curve II is adiabatic because it is steeper and lies below the isothermal curve during expansion.",
          },
          { part: "b", explanation: L`For an adiabatic process, $Q=0$.` },
          {
            part: "c",
            explanation: L`The gas does positive work, so $\Delta U=0-W<0$.`,
          },
          {
            part: "d",
            explanation:
              "In adiabatic expansion the gas cools, so at the same larger volume its pressure is lower than in isothermal expansion.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A well-insulated bicycle pump is quickly compressed. A similar slow compression is performed while the pump is in good thermal contact with the surroundings.`,
        difficulty: 4,
        skillTags: ["adiabatic_process", "isothermal_process", "real_context"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which compression is closer to adiabatic?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which compression is closer to isothermal?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "In the quick insulated compression, what happens to gas temperature?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Give the thermodynamic reason for the temperature change.",
            points: 1,
          },
        ],
        hints: [
          L`Adiabatic behaviour occurs when heat exchange is negligible.`,
          L`Slow contact with surroundings allows heat exchange.`,
          L`Compression means work is done on the gas.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies quick insulated compression as closer to adiabatic.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Identifies slow thermal-contact compression as closer to isothermal.",
            },
            { part: "c", points: 1, description: "States temperature rises." },
            {
              part: "d",
              points: 1,
              description:
                "Explains work done on gas increases internal energy when heat exchange is negligible.",
            },
          ],
        },
        commonErrors: [
          L`Assuming all compressions are isothermal.`,
          L`Saying insulation prevents work from changing internal energy.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The quick insulated compression is closer to adiabatic.",
          },
          {
            part: "b",
            explanation:
              "The slow compression in thermal contact is closer to isothermal.",
          },
          { part: "c", explanation: "The gas temperature rises." },
          {
            part: "d",
            explanation:
              "Work is done on the gas and little heat escapes, so internal energy and temperature increase.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An ideal gas is compressed adiabatically. Work done on the gas is $200\text{ J}$.`,
        difficulty: 2,
        skillTags: ["adiabatic_process", "first_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the change in internal energy.`,
            points: 1,
          },
        ],
        hints: [
          L`Adiabatic means $Q=0$.`,
          L`Work done on the gas increases its internal energy.`,
          L`Using $W$ as work done by the gas, $W=-200\text{ J}$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: L`Finds $+200\text{ J}$.` },
          ],
        },
        commonErrors: [
          L`Giving a negative answer because the process is compression.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For adiabatic compression, $Q=0$ and work done by the gas is $-200\text{ J}$. Thus $\Delta U=0-(-200)=+200\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`One mole of an ideal gas expands isothermally at temperature such that $nRT=500\text{ J}$. Its volume doubles. Take $\ln2=0.69$.`,
        difficulty: 4,
        skillTags: ["isothermal_process", "work_heat_relation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the work done by the gas.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the heat absorbed by the gas.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Find the change in internal energy.`,
            points: 1,
          },
        ],
        hints: [
          L`For isothermal ideal gas expansion, $W=nRT\ln(V_f/V_i)$.`,
          L`For an ideal gas, $\Delta U=0$ in isothermal change.`,
          L`Then use the first law.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Finds $345\text{ J}$.` },
            { part: "b", points: 1, description: L`Finds $345\text{ J}$.` },
            { part: "c", points: 1, description: L`Finds $0$.` },
          ],
        },
        commonErrors: [L`Treating isothermal as no heat exchange.`],
        workedSolution: [
          { part: "a", explanation: L`W=nRT\ln2=500(0.69)=345\text{ J}.` },
          {
            part: "b",
            explanation: L`For isothermal ideal gas, $\Delta U=0$, so $Q=W=345\text{ J}$.`,
          },
          {
            part: "c",
            explanation: L`Because temperature is constant, $\Delta U=0$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An ideal gas goes through two different expansions from the same initial state. Process A is isothermal; process B is adiabatic. Both reach the same final volume.`,
        difficulty: 4,
        skillTags: [
          "isothermal_process",
          "adiabatic_process",
          "process_comparison",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Which process has no heat exchange?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`In which process does the gas cool?`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Which process has zero change in internal energy for an ideal gas?`,
            points: 1,
          },
        ],
        hints: [
          L`Adiabatic means no heat transfer.`,
          L`During adiabatic expansion, work is done at the cost of internal energy.`,
          L`Ideal-gas internal energy depends only on temperature.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies B." },
            { part: "b", points: 1, description: "Identifies B." },
            { part: "c", points: 1, description: "Identifies A." },
          ],
        },
        commonErrors: [L`Thinking isothermal means no heat is exchanged.`],
        workedSolution: [
          {
            part: "a",
            explanation: "The adiabatic process B has no heat exchange.",
          },
          {
            part: "b",
            explanation:
              "In adiabatic expansion, the gas does work without heat input, so its internal energy and temperature fall.",
          },
          {
            part: "c",
            explanation:
              "For an ideal gas, isothermal process A has no change in internal energy.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An ideal gas initially at pressure $P$ and volume $V$ expands reversibly and adiabatically to volume $2V$. Its adiabatic index is $\gamma$.`,
        difficulty: 5,
        skillTags: ["adiabatic_relation", "ideal_gas", "process_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the final pressure in terms of $P$.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`State whether the temperature increases, decreases, or remains constant.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Explain the temperature change using the first law.`,
            points: 2,
          },
        ],
        hints: [
          L`Use $PV^\gamma=$ constant.`,
          L`Adiabatic expansion has $Q=0$ and $W>0$.`,
          L`For an ideal gas, temperature follows internal energy.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds $P/2^\gamma$.` },
            {
              part: "b",
              points: 1,
              description: "States temperature decreases.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Uses $Q=0$ and work done by gas to show internal energy falls.",
            },
          ],
        },
        commonErrors: [L`Using the isothermal relation $PV=$ constant.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$PV^\gamma=P'(2V)^\gamma$, so $P'=P/2^\gamma$.`,
          },
          { part: "b", explanation: "The temperature decreases." },
          {
            part: "c",
            explanation: L`Since $Q=0$ and the gas does positive work, $\Delta U=Q-W<0$. For an ideal gas, lower internal energy means lower temperature.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher compares three processes for the same ideal gas: P is isothermal expansion, Q is adiabatic expansion, and R is isochoric heating.`,
        difficulty: 4,
        skillTags: ["thermodynamic_processes", "first_law", "ideal_gas"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Which process has $\Delta U=0$?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Which process has $Q=0$?`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Which process has $W=0$?`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`In which process does supplied heat only increase internal energy?`,
            points: 1,
          },
        ],
        hints: [
          L`For ideal gas, $\Delta U$ depends on temperature.`,
          L`Adiabatic means no heat transfer.`,
          L`Isochoric means no volume change.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies P." },
            { part: "b", points: 1, description: "Identifies Q." },
            { part: "c", points: 1, description: "Identifies R." },
            { part: "d", points: 1, description: "Identifies R." },
          ],
        },
        commonErrors: [L`Confusing isothermal with adiabatic.`],
        workedSolution: [
          {
            part: "a",
            explanation: "P is isothermal, so an ideal gas has $\\Delta U=0$.",
          },
          { part: "b", explanation: "Q is adiabatic, so $Q=0$." },
          { part: "c", explanation: "R is isochoric, so $W=0$." },
          {
            part: "d",
            explanation:
              "In R, volume is constant, so heat supplied increases internal energy only.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.5",
    title: "Second Law and Cyclic Processes",
    subtopic:
      "Second law statements, spontaneous direction of heat flow, reversible and irreversible processes, and energy accounting over cyclic processes.",
    mc: [
      {
        questionLatex: L`A cold metal spoon is placed in hot water. Without external work, the second law predicts that`,
        difficulty: 2,
        skillTags: ["second_law", "direction_of_heat_flow"],
        choices: [
          L`heat flows from the hot water to the colder spoon until thermal equilibrium is approached`,
          L`heat flows spontaneously from the colder spoon to the hotter water`,
          L`no heat flows because both objects contain internal energy`,
          L`the entire internal energy of the water is converted into work`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Spontaneous heat flow from cold to hot would violate the Clausius form of the second law.",
          C: "A temperature difference causes heat transfer; internal energy alone does not prevent it.",
          D: "The second law does not allow complete conversion of a body's internal energy into work in this situation.",
        },
        hints: [
          L`Heat flows naturally because the bodies are at different temperatures.`,
          L`The spontaneous direction is from higher temperature to lower temperature.`,
          L`The process approaches thermal equilibrium.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The second law fixes the spontaneous direction of heat transfer: heat flows from the hotter body to the colder body until equilibrium is approached.",
          },
        ],
      },
      {
        questionLatex: L`The Kelvin-Planck statement of the second law rules out`,
        difficulty: 3,
        skillTags: ["second_law", "kelvin_planck_statement"],
        choices: [
          L`a cyclic process for which the net change in internal energy is zero`,
          L`a cyclic device that converts all heat taken from a single reservoir into work with no other effect`,
          L`an adiabatic compression that requires work to be done on the gas`,
          L`conversion of mechanical work entirely into heat`,
        ],
        correctLetter: "B",
        rationales: {
          A: "A complete cycle returning to the initial state has zero net internal-energy change; that is allowed.",
          C: "Adiabatic compression with work input is allowed and commonly raises the gas temperature.",
          D: "Work can be fully converted into heat, for example by friction.",
        },
        hints: [
          L`Kelvin-Planck is a statement about cyclic operation.`,
          L`It forbids complete heat-to-work conversion from one reservoir with no other effect.`,
          L`Mechanical work can become heat, but the reverse is restricted.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The Kelvin-Planck statement says that no cyclic device can take heat from only one reservoir and convert it completely into work with no other effect.",
          },
        ],
      },
      {
        questionLatex: L`Which process is necessarily irreversible?`,
        difficulty: 3,
        skillTags: ["irreversible_process", "free_expansion"],
        choices: [
          L`very slow frictionless compression through equilibrium states`,
          L`infinitesimal isothermal expansion through equilibrium states`,
          L`free expansion of a gas into vacuum`,
          L`quasistatic adiabatic compression without friction`,
        ],
        correctLetter: "C",
        rationales: {
          A: "A quasistatic frictionless process is the ideal model for reversibility.",
          B: "An infinitesimal quasistatic isothermal change can be reversed by an infinitesimal change in conditions.",
          D: "A quasistatic frictionless adiabatic process is reversible in the ideal limit.",
        },
        hints: [
          L`Reversibility requires a sequence of equilibrium states.`,
          L`Free expansion has no opposing pressure and is not quasistatic.`,
          L`Free expansion cannot be undone without producing changes elsewhere.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Free expansion into vacuum is irreversible because the gas does not pass through equilibrium states and cannot retrace the path by a small reversal of external conditions.",
          },
        ],
      },
      {
        questionLatex: L`For any complete thermodynamic cycle of a fixed gas,`,
        difficulty: 2,
        skillTags: ["cyclic_process", "state_function"],
        choices: [
          L`the net heat exchanged must be zero`,
          L`the net work done must be zero`,
          L`the final pressure must be zero`,
          L`the net change in internal energy is zero`,
        ],
        correctLetter: "D",
        rationales: {
          A: "A cyclic process may have non-zero net heat; it equals the net work done.",
          B: "A cycle may enclose area on a P-V graph, giving non-zero net work.",
          C: "The final state equals the initial state, not necessarily zero pressure.",
        },
        hints: [
          L`A cycle returns to the initial thermodynamic state.`,
          L`Internal energy is a state function.`,
          L`Same initial and final state means $\Delta U_{\text{cycle}}=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a complete cycle,",
            math: L`\Delta U_{\text{cycle}}=0`,
          },
        ],
      },
      {
        questionLatex: L`Which one is closest to a reversible process?`,
        difficulty: 3,
        skillTags: ["reversible_process", "irreversible_process"],
        choices: [
          L`a very slow frictionless compression through equilibrium states`,
          L`rapid free expansion of a gas into vacuum`,
          L`stirring water with a paddle wheel`,
          L`heat flow across a large temperature difference`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Free expansion is highly irreversible.",
          C: "Dissipative stirring is irreversible.",
          D: "Heat flow through a finite temperature difference is irreversible.",
        },
        hints: [
          L`Reversibility requires quasistatic change and no dissipative effects.`,
          L`Friction, turbulence, and finite temperature differences cause irreversibility.`,
          L`Choose the slow frictionless process.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A reversible process is idealized as quasistatic and free of dissipative effects such as friction.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the Clausius form of the second law of thermodynamics in words.`,
        difficulty: 1,
        skillTags: ["second_law", "clausius_statement"],
        parts: [
          { letter: "a", promptMarkdown: "Write the statement.", points: 1 },
        ],
        hints: [
          L`It is about the spontaneous direction of heat flow.`,
          L`Think of heat flow between colder and hotter bodies.`,
          L`Cold-to-hot transfer requires external work or another effect.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that heat does not spontaneously flow from cold to hot without external work or another effect.",
            },
          ],
        },
        commonErrors: [
          L`Saying heat never flows from cold to hot, even with external work.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Heat does not spontaneously flow from a colder body to a hotter body without external work or another accompanying effect.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A fixed mass of gas completes a cycle. During the cycle it absorbs $700\text{ J}$ of heat and rejects $450\text{ J}$ of heat.`,
        difficulty: 2,
        skillTags: ["cyclic_process", "first_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the net heat absorbed in one complete cycle.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the net work done by the gas in one complete cycle.",
            points: 1,
          },
        ],
        hints: [
          L`Net heat absorbed means heat absorbed minus heat rejected.`,
          L`For a complete cycle, $\Delta U=0$.`,
          L`Use $\Delta U=Q-W$ with $W$ as work done by the gas.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds net heat absorbed as $250\\text{ J}$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Uses cyclic condition to find net work done as $250\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Forgetting that heat rejected is negative in the net heat balance.`,
          L`Assuming a cyclic process must have zero net heat.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$Q_{\text{net}}=700-450=250\text{ J}$.` },
          {
            part: "b",
            explanation: L`For a cycle, $\Delta U=0$, so $Q_{\text{net}}=W_{\text{net}}=250\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A gas is first compressed very slowly with negligible friction. Another sample of the same gas is allowed to expand freely into vacuum.`,
        difficulty: 3,
        skillTags: [
          "reversible_process",
          "irreversible_process",
          "free_expansion",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which process can be idealized as reversible?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which process is irreversible? Give one reason.",
            points: 1,
          },
        ],
        hints: [
          L`A reversible process is quasistatic and free from dissipative effects.`,
          L`Free expansion is sudden and not a sequence of equilibrium states.`,
          L`Think about which path can be retraced by a tiny change in conditions.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies slow frictionless compression as reversible in the ideal limit.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Identifies free expansion as irreversible and gives a valid reason.",
            },
          ],
        },
        commonErrors: [
          L`Calling every slow process reversible even if friction is present.`,
          L`Calling free expansion reversible because no heat is exchanged.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The very slow frictionless compression can be idealized as reversible because it remains close to equilibrium and has negligible dissipation.",
          },
          {
            part: "b",
            explanation:
              "Free expansion into vacuum is irreversible because it is not quasistatic and cannot be retraced without producing changes elsewhere.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A gas passes through a complete cycle $A\to B\to C\to A$. In $A\to B$, it absorbs $500\text{ J}$ of heat and does $200\text{ J}$ of work. In $B\to C$, it rejects $100\text{ J}$ of heat and $150\text{ J}$ of work is done on it. In $C\to A$, it rejects $250\text{ J}$ of heat.`,
        difficulty: 4,
        skillTags: ["cyclic_process", "first_law", "sign_convention"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $\\Delta U$ for $A\\to B$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find $\\Delta U$ for $B\\to C$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Use the cyclic condition to find $\\Delta U$ for $C\\to A$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the work done by the gas in $C\\to A$.",
            points: 1,
          },
        ],
        hints: [
          L`Use $\Delta U=Q-W$ where $W$ is work done by the gas.`,
          L`Work done on the gas is negative work done by the gas.`,
          L`For the full cycle, $\Delta U_{AB}+\Delta U_{BC}+\Delta U_{CA}=0$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $\\Delta U_{AB}=300\\text{ J}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $\\Delta U_{BC}=50\\text{ J}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $\\Delta U_{CA}=-350\\text{ J}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Finds work done by the gas in $C\\to A$ as $100\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Treating work done on the gas as positive work done by the gas.`,
          L`Forgetting that total $\Delta U$ over a cycle is zero.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For $A\to B$, $\Delta U=Q-W=500-200=300\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`For $B\to C$, $Q=-100\text{ J}$ and $W=-150\text{ J}$, so $\Delta U=-100-(-150)=50\text{ J}$.`,
          },
          {
            part: "c",
            explanation: L`For a cycle, total $\Delta U=0$, so $\Delta U_{CA}=-(300+50)=-350\text{ J}$.`,
          },
          {
            part: "d",
            explanation: L`For $C\to A$, $-350=-250-W$, so $W=100\text{ J}$ by the gas.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher describes four processes. Process P: a gas expands very slowly through equilibrium states with negligible friction. Process Q: a gas expands suddenly into an evacuated chamber. Process R: two bodies at different temperatures are placed in contact. Process S: a gas returns to its initial state after a closed $P-V$ path.`,
        difficulty: 4,
        skillTags: [
          "second_law",
          "reversible_process",
          "irreversible_process",
          "cyclic_process",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which process is closest to reversible?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which process is an example of free expansion?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "What is the net change in internal energy for process S?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Which process shows spontaneous heat flow toward thermal equilibrium?",
            points: 1,
          },
        ],
        hints: [
          L`Reversibility needs quasistatic motion and negligible dissipation.`,
          L`A cyclic process returns to its initial state.`,
          L`Second-law heat flow is from higher temperature to lower temperature.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies P as closest to reversible.",
            },
            {
              part: "b",
              points: 1,
              description: "Identifies Q as free expansion.",
            },
            {
              part: "c",
              points: 1,
              description: "States net internal-energy change is zero.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Identifies R as spontaneous heat flow toward equilibrium.",
            },
          ],
        },
        commonErrors: [
          L`Calling sudden expansion reversible because no external work is done.`,
          L`Forgetting internal energy is a state function in a cycle.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Process P is closest to reversible because it is very slow, passes through equilibrium states, and has negligible friction.",
          },
          {
            part: "b",
            explanation:
              "Process Q is free expansion into an evacuated chamber.",
          },
          {
            part: "c",
            explanation: L`For process S, the gas returns to its initial state, so $\Delta U_{\text{net}}=0$.`,
          },
          {
            part: "d",
            explanation:
              "Process R shows heat flowing spontaneously from the hotter body to the colder body until thermal equilibrium is approached.",
          },
        ],
      },
    ],
  },
];

export const thermodynamicsTopics: Topic[] = topicSeeds.map(makeTopic);
