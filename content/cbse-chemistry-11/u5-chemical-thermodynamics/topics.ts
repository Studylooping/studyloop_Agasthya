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
const UNIT = "u5-chemical-thermodynamics";
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
  skillTags: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
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
  return topicCode.replace(".", "-");
}

function hintLadder(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|circ|rightarrow|rightleftharpoons|approx)\b/g,
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
  return `You chose ${choiceText}. Recheck the thermodynamic sign convention, state function, heat-work relation, or spontaneity condition before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class11_chemistry_thermodynamics_reasoning",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_formula_memory_without_checking_system_sign_or_state_function",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hintLadder(seed.hints),
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_final_thermal_quantity_without_sign_units_or_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hintLadder(seed.hints),
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
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const systemBoundaryFigure: ItemFigure = {
  type: "svg",
  title: "System boundary sketch",
  description:
    "A beaker inside a boundary is shown with heat and work interaction arrows crossing the boundary.",
  svg: `<svg viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-system-u5" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <rect x="170" y="68" width="340" height="230" rx="18" fill="#f8fafc" stroke="#64748b" stroke-width="3" stroke-dasharray="8 7"/>
  <text x="340" y="45" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Thermodynamic boundary</text>
  <path d="M270 115 L292 250 H388 L410 115" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <path d="M289 206 C320 194 355 218 391 202 L382 250 H298 Z" fill="#93c5fd" opacity="0.8"/>
  <text x="340" y="185" text-anchor="middle" font-family="Arial" font-size="18" fill="#1e3a8a">system</text>
  <text x="92" y="185" text-anchor="middle" font-family="Arial" font-size="17" fill="#334155">surroundings</text>
  <text x="589" y="185" text-anchor="middle" font-family="Arial" font-size="17" fill="#334155">surroundings</text>
  <path d="M118 132 C160 116 185 116 224 133" fill="none" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-system-u5)"/>
  <text x="130" y="104" font-family="Arial" font-size="16" fill="#991b1b">heat</text>
  <path d="M462 238 C505 252 534 248 568 225" fill="none" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-system-u5)"/>
  <text x="535" y="270" font-family="Arial" font-size="16" fill="#166534">work</text>
</svg>`,
};

const pvWorkFigure: ItemFigure = {
  type: "svg",
  title: "Pressure-volume paths",
  description:
    "A pressure-volume graph shows two paths connecting the same initial and final states.",
  svg: `<svg viewBox="0 0 660 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="430" fill="#ffffff"/>
  <defs>
    <marker id="arrow-pv-u5" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="95" y1="350" x2="560" y2="350" stroke="#334155" stroke-width="2" marker-end="url(#arrow-pv-u5)"/>
  <line x1="95" y1="350" x2="95" y2="70" stroke="#334155" stroke-width="2" marker-end="url(#arrow-pv-u5)"/>
  <text x="550" y="382" font-family="Arial" font-size="16" fill="#111827">V</text>
  <text x="58" y="82" font-family="Arial" font-size="16" fill="#111827">P</text>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="95" y1="290" x2="540" y2="290"/>
    <line x1="95" y1="230" x2="540" y2="230"/>
    <line x1="95" y1="170" x2="540" y2="170"/>
    <line x1="185" y1="350" x2="185" y2="90"/>
    <line x1="275" y1="350" x2="275" y2="90"/>
    <line x1="365" y1="350" x2="365" y2="90"/>
    <line x1="455" y1="350" x2="455" y2="90"/>
  </g>
  <circle cx="185" cy="280" r="6" fill="#111827"/>
  <circle cx="455" cy="160" r="6" fill="#111827"/>
  <text x="168" y="302" font-family="Arial" font-size="16" fill="#111827">A</text>
  <text x="468" y="151" font-family="Arial" font-size="16" fill="#111827">B</text>
  <path d="M185 280 C260 130 360 115 455 160" fill="none" stroke="#2563eb" stroke-width="4"/>
  <path d="M185 280 L185 160 L455 160" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="305" y="114" font-family="Arial" font-size="16" fill="#1d4ed8">path I</text>
  <text x="240" y="152" font-family="Arial" font-size="16" fill="#c2410c">path II</text>
  <text x="330" y="402" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Area under path represents expansion work magnitude</text>
</svg>`,
};

const calorimeterFigure: ItemFigure = {
  type: "svg",
  title: "Constant-pressure calorimeter",
  description:
    "A simple insulated cup calorimeter is shown with solution, thermometer, stirrer and a loosely fitted lid.",
  svg: `<svg viewBox="0 0 620 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="420" fill="#ffffff"/>
  <rect x="185" y="96" width="250" height="42" rx="6" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>
  <path d="M210 132 L240 345 H380 L410 132" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
  <path d="M235 238 C285 218 330 254 386 232 L376 330 H248 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <line x1="310" y1="64" x2="310" y2="255" stroke="#dc2626" stroke-width="6"/>
  <circle cx="310" cy="268" r="13" fill="#dc2626"/>
  <line x1="365" y1="72" x2="338" y2="252" stroke="#334155" stroke-width="4"/>
  <text x="310" y="42" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Calorimeter setup</text>
  <text x="468" y="118" font-family="Arial" font-size="16" fill="#111827">lid</text>
  <text x="420" y="276" font-family="Arial" font-size="16" fill="#1d4ed8">solution</text>
  <text x="110" y="214" font-family="Arial" font-size="16" fill="#991b1b">thermometer</text>
  <text x="385" y="78" font-family="Arial" font-size="16" fill="#334155">stirrer</text>
</svg>`,
};

const hessCycleFigure: ItemFigure = {
  type: "svg",
  title: "Two thermochemical paths",
  description:
    "A Hess-law cycle shows reactants and products connected directly and through an intermediate path.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-hess-u5" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <rect x="76" y="120" width="150" height="70" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="474" y="120" width="150" height="70" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <rect x="278" y="246" width="150" height="70" rx="8" fill="#ffedd5" stroke="#f97316" stroke-width="3"/>
  <text x="151" y="161" text-anchor="middle" font-family="Arial" font-size="18" fill="#1e3a8a">reactants</text>
  <text x="549" y="161" text-anchor="middle" font-family="Arial" font-size="18" fill="#166534">products</text>
  <text x="353" y="287" text-anchor="middle" font-family="Arial" font-size="18" fill="#9a3412">intermediate</text>
  <path d="M226 155 H474" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-hess-u5)"/>
  <path d="M170 190 C205 250 245 278 278 281" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-hess-u5)"/>
  <path d="M428 281 C464 275 506 238 531 190" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-hess-u5)"/>
  <text x="350" y="132" text-anchor="middle" font-family="Arial" font-size="16" fill="#111827">direct enthalpy change</text>
  <text x="204" y="244" font-family="Arial" font-size="15" fill="#111827">step 1</text>
  <text x="494" y="244" font-family="Arial" font-size="15" fill="#111827">step 2</text>
</svg>`,
};

const gibbsTemperatureFigure: ItemFigure = {
  type: "svg",
  title: "Gibbs energy trend with temperature",
  description:
    "A graph of Gibbs energy change against temperature shows a sloping line crossing the zero line.",
  svg: `<svg viewBox="0 0 660 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="430" fill="#ffffff"/>
  <defs>
    <marker id="arrow-gibbs-u5" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="95" y1="340" x2="565" y2="340" stroke="#334155" stroke-width="2" marker-end="url(#arrow-gibbs-u5)"/>
  <line x1="95" y1="340" x2="95" y2="70" stroke="#334155" stroke-width="2" marker-end="url(#arrow-gibbs-u5)"/>
  <line x1="95" y1="210" x2="540" y2="210" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 6"/>
  <text x="552" y="374" font-family="Arial" font-size="16" fill="#111827">T</text>
  <text x="46" y="84" font-family="Arial" font-size="16" fill="#111827">&#916;G</text>
  <text x="62" y="215" font-family="Arial" font-size="14" fill="#475569">0</text>
  <path d="M135 105 L520 315" stroke="#2563eb" stroke-width="4" fill="none"/>
  <circle cx="328" cy="210" r="6" fill="#dc2626"/>
  <text x="337" y="197" font-family="Arial" font-size="15" fill="#991b1b">crossing</text>
  <text x="328" y="393" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Use sign of &#916;G to discuss spontaneity</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Thermodynamic Terms and State Functions",
    subtopic:
      "System, surroundings, boundary, open/closed/isolated systems, heat, work, energy, extensive and intensive properties, and state functions",
    mc: [
      {
        questionLatex: L`A sealed steel cylinder contains a fixed amount of gas and can exchange heat with the room. Which classification is most appropriate for the gas as system?`,
        difficulty: 2,
        skillTags: ["system_types", "closed_system"],
        choices: [
          "open system",
          "closed system",
          "isolated system",
          "adiabatic system with no energy exchange",
        ],
        correctLetter: "B",
        rationales: {
          A: "An open system exchanges matter as well as energy; the sealed cylinder does not exchange matter.",
          C: "An isolated system exchanges neither matter nor energy, but heat can cross the cylinder wall.",
          D: "Adiabatic means no heat transfer; the stem says heat exchange is possible.",
        },
        hints: [
          "Ask whether matter can cross the boundary.",
          "Then ask whether energy can cross the boundary.",
          "Fixed matter but heat exchange is the definition of a closed system.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The amount of gas is fixed, so matter does not cross the boundary.",
          },
          {
            step: 2,
            explanation:
              "Heat can cross the boundary, so energy exchange is possible. The gas is a closed system.",
          },
        ],
      },
      {
        questionLatex: L`In the boundary sketch, the most useful reason for drawing the dotted boundary is to decide`,
        figure: systemBoundaryFigure,
        difficulty: 2,
        skillTags: ["system_boundary", "heat_work"],
        choices: [
          "which chemical formula is balanced",
          "which quantities cross between system and surroundings",
          "whether the solution is acidic or basic",
          "the exact molecular shape of the dissolved substance",
        ],
        correctLetter: "B",
        rationales: {
          A: "A thermodynamic boundary does not balance a chemical equation.",
          C: "Acid-base character is not decided just by a system boundary.",
          D: "Molecular shape is a bonding question, not a boundary question.",
        },
        hints: [
          "The boundary separates system from surroundings.",
          "Thermodynamics tracks heat, work and matter crossing boundaries.",
          "The figure shows interaction arrows crossing the boundary.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A boundary defines what belongs to the system and what belongs to the surroundings.",
          },
          {
            step: 2,
            explanation:
              "Once the boundary is fixed, heat, work and matter transfer can be discussed clearly.",
          },
        ],
      },
      {
        questionLatex: L`Which pair contains only state functions?`,
        difficulty: 3,
        skillTags: ["state_functions", "path_functions"],
        choices: [
          "heat and work",
          "work and enthalpy",
          "internal energy and enthalpy",
          "heat and internal energy",
        ],
        correctLetter: "C",
        rationales: {
          A: "Heat and work depend on the path of the process.",
          B: "Work is path dependent even though enthalpy is a state function.",
          D: "Heat is path dependent even though internal energy is a state function.",
        },
        hints: [
          "A state function depends only on the initial and final states.",
          "Heat and work are modes of energy transfer, not properties of a state.",
          "Internal energy and enthalpy are both properties of the system.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Internal energy and enthalpy depend only on the state of the system.",
          },
          {
            step: 2,
            explanation:
              "Heat and work depend on the path, so the only pair of state functions is internal energy and enthalpy.",
          },
        ],
      },
      {
        questionLatex: L`A student doubles the amount of a gas sample at the same temperature and pressure. Which property must double?`,
        difficulty: 3,
        skillTags: ["extensive_intensive", "amount_dependence"],
        choices: ["density", "molar heat capacity", "volume", "temperature"],
        correctLetter: "C",
        rationales: {
          A: "Density is intensive and does not double merely because the amount is doubled at the same state.",
          B: "Molar heat capacity is per mole, so it is intensive for a given substance and condition.",
          D: "The temperature is stated to remain the same.",
        },
        hints: [
          "Extensive properties depend on amount.",
          "At the same temperature and pressure, volume is proportional to amount.",
          "Intensive properties such as temperature do not scale with sample size.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Volume is an extensive property, so it depends on the amount of substance.",
          },
          {
            step: 2,
            explanation:
              "Doubling the gas amount at the same temperature and pressure doubles the volume.",
          },
        ],
      },
      {
        questionLatex: L`Two different paths connect the same initial and final states on a pressure-volume graph. Which statement is correct?`,
        figure: pvWorkFigure,
        difficulty: 4,
        skillTags: ["state_function", "path_function", "pv_work"],
        choices: [
          L`$\Delta U$ can be different for the two paths because the areas are different.`,
          "Work can be different for the two paths, but the change in internal energy is the same.",
          "Both work and internal-energy change must be zero for any closed path segment.",
          "Heat must be the same for the two paths because the endpoints are the same.",
        ],
        correctLetter: "B",
        rationales: {
          A: "$\\Delta U$ is a state function, so it is fixed by endpoints.",
          C: "A path between two different states need not have zero work or zero energy change.",
          D: "Heat is path dependent; it need not be the same for two paths.",
        },
        hints: [
          "Area under a P-V path is related to work.",
          "Internal energy is a state function.",
          "Path functions can differ even when endpoints are the same.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Work depends on the path taken on a pressure-volume diagram.",
          },
          {
            step: 2,
            explanation:
              "Internal energy depends only on the initial and final states, so $\\Delta U$ is the same for both paths.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State one difference between an open system and a closed system.`,
        difficulty: 1,
        skillTags: ["system_types"],
        parts: singlePart("a", "Give one clear difference.", 2),
        hints: [
          "Think about transfer across the boundary.",
          "Matter transfer is the key difference.",
          "Both may exchange energy, but only one exchanges matter.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that an open system can exchange matter with surroundings, whereas a closed system cannot exchange matter but may exchange energy.",
        ),
        commonErrors: ["Saying a closed system cannot exchange heat."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "An open system can exchange both matter and energy with surroundings. A closed system cannot exchange matter, though it may exchange energy.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Classify heat, work, internal energy and enthalpy as path functions or state functions.`,
        difficulty: 3,
        skillTags: ["state_functions", "path_functions"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify the path functions.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the state functions.",
            points: 2,
          },
        ],
        hints: [
          "Path functions depend on how the process occurs.",
          "State functions depend only on initial and final states.",
          "Heat/work are transfers; internal energy/enthalpy are system properties.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Gives heat and work." },
            {
              part: "b",
              points: 2,
              description: "Gives internal energy and enthalpy.",
            },
          ],
        },
        commonErrors: ["Calling heat stored energy of the system."],
        workedSolution: [
          {
            part: "a",
            explanation: "Heat and work are path functions.",
          },
          {
            part: "b",
            explanation:
              "Internal energy and enthalpy are state functions because their changes depend only on initial and final states.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A process is carried out in a thermos flask that is idealised as perfectly insulated and sealed. Classify the system and justify the classification.`,
        difficulty: 3,
        skillTags: ["isolated_system", "boundary"],
        parts: [
          { letter: "a", promptMarkdown: "Name the system type.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Justify using matter and energy transfer.",
            points: 3,
          },
        ],
        hints: [
          "Sealed means no matter exchange.",
          "Perfect insulation means no heat exchange.",
          "If no matter or energy crosses the boundary, it is isolated.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies isolated system.",
            },
            {
              part: "b",
              points: 3,
              description:
                "Explains no matter exchange and no energy exchange in the idealised model.",
            },
          ],
        },
        commonErrors: [
          "Calling it closed only because it is sealed and ignoring insulation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "It is an isolated system in the idealised model.",
          },
          {
            part: "b",
            explanation:
              "The flask is sealed, so matter cannot cross the boundary. It is perfectly insulated, so heat transfer is neglected. With no matter or energy exchange, the system is isolated.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A gas changes from state A to state B by two different pressure-volume paths shown in the figure.`,
        figure: pvWorkFigure,
        difficulty: 5,
        skillTags: ["pv_work", "state_function", "path_function"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which quantity is represented by area under a P-V path?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Can work be different for the two paths? Give a reason.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Can $\\Delta U$ be different for the two paths? Give a reason.",
            points: 2,
          },
        ],
        hints: [
          "On a P-V diagram, area is connected with expansion/compression work.",
          "Work is not fixed by endpoints alone.",
          "$\\Delta U$ is fixed by the initial and final states.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies work magnitude." },
            {
              part: "b",
              points: 2,
              description:
                "Explains work can differ because path areas differ.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains $\\Delta U$ cannot differ because internal energy is a state function.",
            },
          ],
        },
        commonErrors: [
          "Assuming all thermodynamic quantities are fixed by endpoints.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The area under a pressure-volume path gives the magnitude of pressure-volume work.",
          },
          {
            part: "b",
            explanation:
              "Yes. The two paths enclose different areas under the curve, so the work can be different.",
          },
          {
            part: "c",
            explanation:
              "No. Internal energy is a state function, so $\\Delta U$ depends only on states A and B, not on the path.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A chemistry group studies three systems: P is an open beaker of hot water, Q is gas in a sealed movable piston, and R is a sealed insulated flask.`,
        difficulty: 4,
        skillTags: ["case_based", "system_types", "state_function"],
        parts: [
          { letter: "a", promptMarkdown: "Classify P.", points: 1 },
          { letter: "b", promptMarkdown: "Classify Q.", points: 1 },
          { letter: "c", promptMarkdown: "Classify R.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "Name one state function relevant to comparing initial and final states of Q.",
            points: 2,
          },
        ],
        hints: [
          "An open beaker exchanges vapour and heat.",
          "A sealed movable piston can exchange energy but not matter.",
          "An ideal sealed insulated flask is isolated.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "P is open." },
            { part: "b", points: 1, description: "Q is closed." },
            { part: "c", points: 1, description: "R is isolated." },
            {
              part: "d",
              points: 2,
              description:
                "Names a valid state function such as internal energy or enthalpy with context.",
            },
          ],
        },
        commonErrors: ["Classifying Q as open because the piston moves."],
        workedSolution: [
          { part: "a", explanation: "P is an open system." },
          {
            part: "b",
            explanation:
              "Q is closed: no matter escapes, but heat or work exchange can occur.",
          },
          {
            part: "c",
            explanation:
              "R is isolated in the idealised description because neither matter nor energy crosses the boundary.",
          },
          {
            part: "d",
            explanation:
              "Internal energy is a valid state function for Q because $\\Delta U$ depends only on initial and final states.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "First Law, Heat, Work, Internal Energy and Enthalpy",
    subtopic:
      "First law of thermodynamics, sign convention, expansion work, pressure-volume work, internal energy and enthalpy relation",
    mc: [
      {
        questionLatex: L`A system absorbs $120\text{ J}$ of heat and does $45\text{ J}$ of work on the surroundings. Using the chemistry convention $\Delta U=q+w$, the change in internal energy is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["first_law", "sign_convention"],
        choices: [
          L`$+165\text{ J}$`,
          L`$+75\text{ J}$`,
          L`$-75\text{ J}$`,
          L`$-165\text{ J}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This adds the magnitude of work, but work done by the system is negative in the chemistry convention.",
          C: "The system absorbs heat, so $q$ is positive.",
          D: "Both signs have been reversed.",
        },
        hints: [
          "Heat absorbed by the system has positive sign.",
          "Work done by the system on surroundings has negative sign.",
          "Use $\\Delta U=q+w$.",
        ],
        solution: [
          {
            step: 1,
            explanation: L`Here $q=+120\text{ J}$ and $w=-45\text{ J}$.`,
          },
          {
            step: 2,
            explanation: "Apply the first law.",
            math: L`\Delta U=q+w=120-45=75\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`For expansion of an ideal gas against a constant external pressure, the pressure-volume work in chemistry sign convention is`,
        difficulty: 2,
        skillTags: ["pv_work", "sign_convention"],
        choices: [
          L`$w=+P_{\text{ext}}\Delta V$`,
          L`$w=-P_{\text{ext}}\Delta V$`,
          L`$w=\Delta U+q$`,
          L`$w=0$ for every expansion`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Expansion means the system does work on surroundings, so the chemistry sign of work is negative.",
          C: "This rearranges the first law incorrectly.",
          D: "Expansion work is zero only for free expansion against zero external pressure.",
        },
        hints: [
          "Expansion means $\\Delta V$ is positive.",
          "Work done by the system has negative sign in chemistry.",
          "Use the constant external pressure expression.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For pressure-volume work against constant external pressure, chemistry uses $w=-P_{\\text{ext}}\\Delta V$.",
          },
        ],
      },
      {
        questionLatex: L`A gas expands from $2.0\text{ L}$ to $5.0\text{ L}$ against $1.5\text{ atm}$ external pressure. Using $1\text{ L atm}=101.3\text{ J}$, the work is closest to`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["pv_work", "unit_conversion"],
        choices: [
          L`$-456\text{ J}$`,
          L`$+456\text{ J}$`,
          L`$-203\text{ J}$`,
          L`$+203\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The magnitude is right, but expansion work is negative in the chemistry convention.",
          C: "This uses only part of the volume change or pressure-volume product.",
          D: "Both the sign and magnitude are not consistent with the data.",
        },
        hints: [
          "Find $\\Delta V=V_2-V_1$.",
          "Use $w=-P_{\\text{ext}}\\Delta V$ in L atm.",
          "Convert L atm to J.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The volume change is $3.0\\text{ L}$.",
            math: L`\Delta V=5.0-2.0=3.0\text{ L}`,
          },
          {
            step: 2,
            explanation: "Compute work and convert.",
            math: L`w=-(1.5)(3.0)=-4.5\text{ L atm}\approx -456\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`For a reaction involving ideal gases at the same temperature, which relation is used to connect enthalpy change and internal-energy change?`,
        difficulty: 3,
        skillTags: ["enthalpy_internal_energy", "gas_moles"],
        choices: [
          L`$\Delta H=\Delta U+\Delta n_gRT$`,
          L`$\Delta H=\Delta U-\Delta n_gRT$`,
          L`$\Delta H=q_v$`,
          L`$\Delta U=q_p$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The gas mole correction is added to $\\Delta U$, not subtracted in this relation.",
          C: "$q_v$ equals $\\Delta U$ for constant-volume heat exchange, not generally $\\Delta H$.",
          D: "$q_p$ equals $\\Delta H$ for constant-pressure heat exchange, not generally $\\Delta U$.",
        },
        hints: [
          "The correction depends on the change in moles of gaseous species.",
          "Remember the ideal-gas relation for PV.",
          "The standard form is $\\Delta H=\\Delta U+\\Delta n_gRT$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For reactions involving gases, the pressure-volume term gives the correction $\\Delta n_gRT$.",
          },
          {
            step: 2,
            explanation: "Therefore $\\Delta H=\\Delta U+\\Delta n_gRT$.",
          },
        ],
      },
      {
        questionLatex: L`For the reaction $\mathrm{N_2(g)+3H_2(g)\rightarrow 2NH_3(g)}$, the value of $\Delta n_g$ is`,
        difficulty: 3,
        skillTags: ["gas_moles", "enthalpy_internal_energy"],
        choices: [L`$+2$`, L`$-2$`, L`$+4$`, L`$-4$`],
        correctLetter: "B",
        rationales: {
          A: "The product moles are fewer, so the change is negative.",
          C: "Four is the reactant gas mole count, not the change.",
          D: "The change is products minus reactants: $2-4=-2$, not $-4$.",
        },
        hints: [
          "Count gaseous moles on each side.",
          "$\\Delta n_g$ means gaseous product moles minus gaseous reactant moles.",
          "Reactants have $1+3=4$ gaseous moles; products have 2.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Count gaseous moles.",
            math: L`n_g(\text{products})=2,\quad n_g(\text{reactants})=4`,
          },
          {
            step: 2,
            explanation: "Subtract reactants from products.",
            math: L`\Delta n_g=2-4=-2`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the mathematical statement of the first law of thermodynamics using the chemistry sign convention.`,
        difficulty: 1,
        skillTags: ["first_law"],
        parts: singlePart("a", "Write the relation and name the terms.", 2),
        hints: [
          "Internal energy change equals heat plus work.",
          "Use the symbol $q$ for heat and $w$ for work.",
          "The chemistry convention writes $\\Delta U=q+w$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Writes $\\Delta U=q+w$ and identifies heat and work correctly.",
        ),
        commonErrors: [
          "Writing $\\Delta U=q-w$ without stating a different convention.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In the chemistry sign convention, the first law is $\\Delta U=q+w$, where $q$ is heat supplied to the system and $w$ is work done on the system.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A system loses $80\text{ J}$ of heat and has $30\text{ J}$ of work done on it.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["first_law", "sign_convention"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Assign signs to $q$ and $w$.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Calculate $\\Delta U$.", points: 2 },
        ],
        hints: [
          "Heat lost by the system is negative.",
          "Work done on the system is positive.",
          "Use $\\Delta U=q+w$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Gives $q=-80\\text{ J}$ and $w=+30\\text{ J}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Computes $\\Delta U=-50\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          "Making work negative even though work is done on the system.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$q=-80\\text{ J}$ and $w=+30\\text{ J}$.",
          },
          {
            part: "b",
            explanation: "$\\Delta U=q+w=-80+30=-50\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why enthalpy is useful for reactions carried out at constant pressure.`,
        difficulty: 3,
        skillTags: ["enthalpy", "constant_pressure"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the relation between $q_p$ and $\\Delta H$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain the practical significance.",
            points: 3,
          },
        ],
        hints: [
          "Most laboratory reactions occur under atmospheric pressure.",
          "At constant pressure, heat exchanged equals enthalpy change if only P-V work is involved.",
          "This makes measured heat directly useful for reaction enthalpy.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States $q_p=\\Delta H$." },
            {
              part: "b",
              points: 3,
              description:
                "Connects constant-pressure heat measurement with reaction enthalpy.",
            },
          ],
        },
        commonErrors: ["Saying $q_v=\\Delta H$."],
        workedSolution: [
          {
            part: "a",
            explanation: "At constant pressure, $q_p=\\Delta H$.",
          },
          {
            part: "b",
            explanation:
              "Many chemical reactions are studied in open vessels at atmospheric pressure. Under constant-pressure conditions, the heat exchanged gives the enthalpy change, so enthalpy is convenient for thermochemistry.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A gas expands from $1.0\text{ L}$ to $4.0\text{ L}$ against a constant external pressure of $2.0\text{ atm}$. During the process it absorbs $950\text{ J}$ of heat. Use $1\text{ L atm}=101.3\text{ J}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["pv_work", "first_law", "unit_conversion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the work in joule.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Calculate $\\Delta U$.", points: 2 },
          {
            letter: "c",
            promptMarkdown:
              "State whether internal energy increases or decreases.",
            points: 1,
          },
        ],
        hints: [
          "Find the volume change first.",
          "Expansion work is negative in the chemistry convention.",
          "Then use $\\Delta U=q+w$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $w\\approx -608\\text{ J}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $\\Delta U\\approx +342\\text{ J}$.",
            },
            {
              part: "c",
              points: 1,
              description: "States internal energy increases.",
            },
          ],
        },
        commonErrors: [
          "Using positive expansion work in the chemistry convention.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta V=4.0-1.0=3.0\\text{ L}$, so $w=-P_{\\text{ext}}\\Delta V=-(2.0)(3.0)=-6.0\\text{ L atm}\\approx -608\\text{ J}$.",
          },
          {
            part: "b",
            explanation: "$\\Delta U=q+w=950-608=342\\text{ J}$ approximately.",
          },
          {
            part: "c",
            explanation:
              "Since $\\Delta U$ is positive, internal energy increases.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares two gas reactions at $298\text{ K}$. Reaction P has $\Delta U=-90.0\text{ kJ mol}^{-1}$ and $\Delta n_g=+1$. Reaction Q has $\Delta U=-90.0\text{ kJ mol}^{-1}$ and $\Delta n_g=-1$. Use $R=8.314\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["enthalpy_internal_energy", "case_based", "gas_moles"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the relation between $\\Delta H$ and $\\Delta U$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Estimate $\\Delta H$ for reaction P in kJ mol$^{-1}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Estimate $\\Delta H$ for reaction Q in kJ mol$^{-1}$.",
            points: 2,
          },
        ],
        hints: [
          "Use the gas mole correction.",
          "$RT$ at 298 K is about $2.48\\text{ kJ mol}^{-1}$.",
          "The sign of $\\Delta n_g$ decides whether the correction is added or subtracted.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States $\\Delta H=\\Delta U+\\Delta n_gRT$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds about $-87.5\\text{ kJ mol}^{-1}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds about $-92.5\\text{ kJ mol}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Using $RT$ in joule but adding it directly to kJ without conversion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta H=\\Delta U+\\Delta n_gRT$.",
          },
          {
            part: "b",
            explanation:
              "At 298 K, $RT=8.314\\times298=2478\\text{ J mol}^{-1}=2.48\\text{ kJ mol}^{-1}$. For P, $\\Delta H=-90.0+2.48=-87.5\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "For Q, $\\Delta n_g=-1$, so $\\Delta H=-90.0-2.48=-92.5\\text{ kJ mol}^{-1}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Calorimetry, Heat Capacity and Specific Heat",
    subtopic:
      "Heat capacity, specific heat, calorimetry at constant volume and constant pressure, and measurement of internal-energy and enthalpy changes",
    mc: [
      {
        questionLatex: L`A $50.0\text{ g}$ water sample is heated from $25.0^\circ\text{C}$ to $31.0^\circ\text{C}$. Taking $c=4.18\text{ J g}^{-1}\text{ K}^{-1}$, heat absorbed by water is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["specific_heat", "calorimetry"],
        choices: [
          L`$1.25\text{ kJ}$`,
          L`$7.52\text{ kJ}$`,
          L`$0.80\text{ kJ}$`,
          L`$12.5\text{ kJ}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This overestimates by treating the temperature change incorrectly.",
          C: "This does not use the full mass-specific heat product.",
          D: "This is too large by about a factor of ten.",
        },
        hints: [
          "Use $q=mc\\Delta T$.",
          "The temperature change is $6.0\\text{ K}$.",
          "Convert joule to kilojoule at the end.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute heat absorbed.",
            math: L`q=50.0\times4.18\times6.0=1254\text{ J}=1.25\text{ kJ}`,
          },
        ],
      },
      {
        questionLatex: L`The figure shows a simple calorimeter used for a reaction in solution. If the solution temperature rises, the reaction is best described as`,
        figure: calorimeterFigure,
        difficulty: 2,
        skillTags: ["calorimetry", "exothermic_endothermic"],
        choices: [
          "endothermic, because the solution gains heat from the reaction",
          "exothermic, because the reaction releases heat to the solution",
          "neither, because temperature change is not related to heat",
          "endothermic, because all reactions in water absorb heat",
        ],
        correctLetter: "B",
        rationales: {
          A: "The solution gains heat, but that heat is released by the reaction, so the reaction is exothermic.",
          C: "Calorimetry uses temperature change to infer heat transfer.",
          D: "Reactions in water can be exothermic or endothermic.",
        },
        hints: [
          "The surroundings of the reacting species include the solution.",
          "A temperature rise means the solution absorbed heat.",
          "If the solution absorbed heat, the reaction released it.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The solution temperature rises, so the solution has gained heat.",
          },
          {
            step: 2,
            explanation:
              "That heat came from the reaction, so the reaction is exothermic.",
          },
        ],
      },
      {
        questionLatex: L`At constant volume, the heat measured for a reaction is equal to`,
        difficulty: 2,
        skillTags: ["constant_volume", "internal_energy"],
        choices: [
          L`$\Delta H$`,
          L`$\Delta U$`,
          L`$P\Delta V$`,
          L`$\Delta n_gRT$ only`,
        ],
        correctLetter: "B",
        rationales: {
          A: "At constant pressure, heat equals enthalpy change under usual conditions.",
          C: "At constant volume, $\\Delta V=0$, so pressure-volume work is zero.",
          D: "The gas mole correction connects $\\Delta H$ and $\\Delta U$, not the measured heat alone.",
        },
        hints: [
          "At constant volume, expansion work is absent.",
          "Then the first law reduces to heat changing internal energy.",
          "Bomb calorimetry measures $\\Delta U$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At constant volume, $\\Delta V=0$ and pressure-volume work is zero.",
          },
          {
            step: 2,
            explanation: "Therefore $q_v=\\Delta U$.",
          },
        ],
      },
      {
        questionLatex: L`A calorimeter has heat capacity $420\text{ J K}^{-1}$. If its temperature rises by $3.5\text{ K}$, the heat absorbed by the calorimeter is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["heat_capacity", "calorimeter_constant"],
        choices: [
          L`$120\text{ J}$`,
          L`$1470\text{ J}$`,
          L`$416.5\text{ J}$`,
          L`$1.47\text{ J}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This divides by the temperature change instead of multiplying.",
          C: "This subtracts temperature change from heat capacity, which is not the relation.",
          D: "This has a unit conversion error.",
        },
        hints: [
          "Heat capacity means heat required per kelvin.",
          "Use $q=C\\Delta T$.",
          "Multiply $420$ by $3.5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use heat capacity times temperature change.",
            math: L`q=C\Delta T=420\times3.5=1470\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`A $0.100\text{ mol}$ reaction in a coffee-cup calorimeter releases $5.60\text{ kJ}$ of heat to the solution at constant pressure. The molar enthalpy change of reaction is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["molar_enthalpy", "constant_pressure_calorimetry"],
        choices: [
          L`$+56.0\text{ kJ mol}^{-1}$`,
          L`$-56.0\text{ kJ mol}^{-1}$`,
          L`$-0.560\text{ kJ mol}^{-1}$`,
          L`$+0.560\text{ kJ mol}^{-1}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The reaction releases heat, so the reaction enthalpy is negative.",
          C: "This divides in the wrong direction or misses the mole scaling.",
          D: "Both the sign and scale are wrong for heat released per mole.",
        },
        hints: [
          "Heat released by the reaction has negative sign for the reaction.",
          "Divide by the amount of reaction.",
          "At constant pressure, reaction heat equals enthalpy change.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The reaction releases heat, so $q_{\\text{rxn}}=-5.60\\text{ kJ}$ for $0.100\\text{ mol}$.",
          },
          {
            step: 2,
            explanation: "Calculate per mole.",
            math: L`\Delta H=\frac{-5.60}{0.100}=-56.0\text{ kJ mol}^{-1}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define specific heat capacity.`,
        difficulty: 1,
        skillTags: ["specific_heat"],
        parts: singlePart("a", "Give the definition with units.", 2),
        hints: [
          "It is heat required for unit mass.",
          "The temperature rise is one kelvin.",
          "Common units are $\\text{J g}^{-1}\\text{ K}^{-1}$ or $\\text{J kg}^{-1}\\text{ K}^{-1}$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Defines heat required to raise unit mass by one kelvin and gives a valid unit.",
        ),
        commonErrors: ["Defining heat capacity without saying per unit mass."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Specific heat capacity is the heat required to raise the temperature of unit mass of a substance by one kelvin. A common unit is $\\text{J g}^{-1}\\text{ K}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $100\text{ g}$ solution in a calorimeter rises from $22.0^\circ\text{C}$ to $27.5^\circ\text{C}$. Take the solution specific heat as $4.2\text{ J g}^{-1}\text{ K}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["calorimetry", "specific_heat"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find heat gained by the solution.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the sign of heat for the reaction if this heat came from the reaction.",
            points: 2,
          },
        ],
        hints: [
          "Use $q=mc\\Delta T$.",
          "A temperature rise means the solution gained heat.",
          "The reaction loses the heat gained by solution.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $2310\\text{ J}$." },
            {
              part: "b",
              points: 2,
              description:
                "States reaction heat is negative, about $-2.31\\text{ kJ}$.",
            },
          ],
        },
        commonErrors: [
          "Assigning the same positive sign to the reaction heat.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$q_{\\text{solution}}=100\\times4.2\\times5.5=2310\\text{ J}=2.31\\text{ kJ}$.",
          },
          {
            part: "b",
            explanation:
              "The solution gained heat from the reaction, so $q_{\\text{reaction}}=-2.31\\text{ kJ}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Distinguish between heat capacity and molar heat capacity.`,
        difficulty: 3,
        skillTags: ["heat_capacity", "molar_heat_capacity"],
        parts: [
          { letter: "a", promptMarkdown: "Define heat capacity.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Define molar heat capacity.",
            points: 2,
          },
        ],
        hints: [
          "Heat capacity is for the given sample.",
          "Molar heat capacity is per mole.",
          "Watch the units.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Defines heat capacity of a sample.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Defines heat capacity per mole and gives suitable unit.",
            },
          ],
        },
        commonErrors: ["Treating both as identical numerical quantities."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Heat capacity is the heat needed to raise the temperature of the given sample by one kelvin.",
          },
          {
            part: "b",
            explanation:
              "Molar heat capacity is the heat needed to raise the temperature of one mole of a substance by one kelvin, commonly in $\\text{J mol}^{-1}\\text{ K}^{-1}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A constant-volume calorimeter has heat capacity $8.50\text{ kJ K}^{-1}$. Burning $0.0200\text{ mol}$ of a compound raises the calorimeter temperature by $1.80\text{ K}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["bomb_calorimetry", "internal_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find heat absorbed by the calorimeter.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find heat released by the reaction for the sample.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find molar $\\Delta U$ for combustion.",
            points: 2,
          },
        ],
        hints: [
          "At constant volume, measured heat corresponds to $\\Delta U$ for the reaction.",
          "The calorimeter absorbs heat; the reaction releases it.",
          "Divide sample heat by moles burned.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $15.3\\text{ kJ}$ absorbed.",
            },
            {
              part: "b",
              points: 1,
              description: "Gives $-15.3\\text{ kJ}$ for reaction sample.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $-765\\text{ kJ mol}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Forgetting the negative sign for combustion heat of reaction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$q_{\\text{cal}}=C\\Delta T=8.50\\times1.80=15.3\\text{ kJ}$.",
          },
          {
            part: "b",
            explanation:
              "The calorimeter gains this heat, so the reaction sample releases $-15.3\\text{ kJ}$.",
          },
          {
            part: "c",
            explanation:
              "$\\Delta U_{\\text{molar}}=(-15.3\\text{ kJ})/(0.0200\\text{ mol})=-765\\text{ kJ mol}^{-1}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A class compares two calorimetry experiments. In experiment A, a solution warms by $4.0\text{ K}$ in a coffee-cup calorimeter. In experiment B, a bomb calorimeter warms by $2.0\text{ K}$ after combustion.`,
        figure: calorimeterFigure,
        difficulty: 4,
        skillTags: ["case_based", "constant_pressure", "constant_volume"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which experiment is closer to constant-pressure calorimetry?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which experiment measures heat at constant volume?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State whether $q_p$ or $q_v$ is directly connected with $\\Delta H$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State whether $q_p$ or $q_v$ is directly connected with $\\Delta U$.",
            points: 2,
          },
        ],
        hints: [
          "Coffee-cup calorimetry is usually at atmospheric pressure.",
          "Bomb calorimetry is constant volume.",
          "Recall $q_p=\\Delta H$ and $q_v=\\Delta U$ under usual conditions.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies A." },
            { part: "b", points: 1, description: "Identifies B." },
            {
              part: "c",
              points: 1,
              description: "States $q_p$ connects with $\\Delta H$.",
            },
            {
              part: "d",
              points: 2,
              description:
                "States $q_v$ connects with $\\Delta U$ and explains constant volume.",
            },
          ],
        },
        commonErrors: ["Mixing up bomb calorimetry with constant pressure."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Experiment A is closer to constant-pressure calorimetry.",
          },
          {
            part: "b",
            explanation: "Experiment B is constant-volume calorimetry.",
          },
          {
            part: "c",
            explanation: "$q_p$ is directly connected with $\\Delta H$.",
          },
          {
            part: "d",
            explanation:
              "$q_v$ is directly connected with $\\Delta U$ because no pressure-volume work is done at constant volume.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Hess Law and Reaction Enthalpies",
    subtopic:
      "Hess law, thermochemical equations, enthalpy of formation, combustion, atomization, sublimation, phase transition, bond dissociation and lattice-related reasoning",
    mc: [
      {
        questionLatex: L`Hess's law is a consequence of the fact that enthalpy is`,
        difficulty: 2,
        skillTags: ["hess_law", "state_function"],
        choices: [
          "a path function",
          "a state function",
          "always zero",
          "always positive",
        ],
        correctLetter: "B",
        rationales: {
          A: "If enthalpy were path dependent, Hess's law would not hold.",
          C: "Reaction enthalpy can be positive or negative, not always zero.",
          D: "Enthalpy changes can be exothermic or endothermic.",
        },
        hints: [
          "Hess's law says total enthalpy change is independent of route.",
          "A quantity independent of route is a state function.",
          "Enthalpy change depends only on initial and final states.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Hess's law works because enthalpy change is independent of the path between reactants and products.",
          },
          {
            step: 2,
            explanation: "Therefore enthalpy is a state function.",
          },
        ],
      },
      {
        questionLatex: L`For $\frac{1}{2}\mathrm{N_2(g)}+\frac{3}{2}\mathrm{H_2(g)}\rightarrow \mathrm{NH_3(g)}$, $\Delta H=-46\text{ kJ mol}^{-1}$. This value is best described as enthalpy of`,
        difficulty: 2,
        skillTags: ["enthalpy_of_formation", "thermochemical_equation"],
        choices: [
          "formation of ammonia",
          "atomization of ammonia",
          "sublimation of ammonia",
          "neutralisation of ammonia",
        ],
        correctLetter: "A",
        rationales: {
          B: "Atomization forms gaseous atoms, not one mole of compound from elements.",
          C: "Sublimation is solid to gas phase change.",
          D: "Neutralisation involves acid-base reaction.",
        },
        hints: [
          "Formation enthalpy forms one mole of a compound.",
          "Reactants must be elements in their standard states.",
          "Nitrogen gas and hydrogen gas are elemental forms.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "One mole of $\\mathrm{NH_3}$ is formed from nitrogen and hydrogen in their elemental forms.",
          },
          {
            step: 2,
            explanation: "So this is the enthalpy of formation of ammonia.",
          },
        ],
      },
      {
        questionLatex: L`Using the Hess cycle in the figure, if the direct change from reactants to products is unknown but step 1 and step 2 are known, the direct enthalpy change is`,
        figure: hessCycleFigure,
        difficulty: 3,
        skillTags: ["hess_law", "cycle"],
        choices: [
          "step 1 plus step 2",
          "step 1 minus step 2 always",
          "step 2 minus step 1 always",
          "zero because a cycle is drawn",
        ],
        correctLetter: "A",
        rationales: {
          B: "Subtraction is needed only if a step is reversed; the figure shows both steps going from reactants to products via the intermediate.",
          C: "The order does not create a subtraction unless a reaction is reversed.",
          D: "A complete closed cycle sums to zero, but the direct path need not be zero.",
        },
        hints: [
          "Follow the arrows from reactants to intermediate to products.",
          "Add enthalpy changes for consecutive steps.",
          "Only reverse a sign when the chemical equation is reversed.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The indirect route has two consecutive steps from reactants to products.",
          },
          {
            step: 2,
            explanation:
              "By Hess's law, the direct enthalpy change equals the sum of those two step changes.",
          },
        ],
      },
      {
        questionLatex: L`Given $\Delta_fH^\circ(\mathrm{CO_2})=-394\text{ kJ mol}^{-1}$, $\Delta_fH^\circ(\mathrm{H_2O(l)})=-286\text{ kJ mol}^{-1}$ and $\Delta_fH^\circ(\mathrm{CH_4})=-75\text{ kJ mol}^{-1}$, the enthalpy change for $\mathrm{CH_4+2O_2\rightarrow CO_2+2H_2O(l)}$ is`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["formation_enthalpy", "combustion_enthalpy"],
        choices: [
          L`$-891\text{ kJ mol}^{-1}$`,
          L`$+891\text{ kJ mol}^{-1}$`,
          L`$-605\text{ kJ mol}^{-1}$`,
          L`$-253\text{ kJ mol}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Combustion is exothermic here; the sign has been reversed.",
          C: "This omits one mole of water or subtracts incorrectly.",
          D: "This does not apply products minus reactants.",
        },
        hints: [
          "Use products minus reactants.",
          "The formation enthalpy of elemental oxygen is zero.",
          "Include the coefficient 2 for water.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply formation enthalpies.",
            math: L`\Delta H=\sum \nu\Delta_fH^\circ(\text{products})-\sum \nu\Delta_fH^\circ(\text{reactants})`,
          },
          {
            step: 2,
            explanation: "Substitute values.",
            math: L`\Delta H=[-394+2(-286)]-[-75]=-891\text{ kJ mol}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`Using average bond enthalpies, the approximate enthalpy change for a reaction is calculated as`,
        difficulty: 3,
        skillTags: ["bond_enthalpy", "reaction_enthalpy"],
        choices: [
          "sum of bonds formed minus sum of bonds broken",
          "sum of bonds broken minus sum of bonds formed",
          "sum of all product bond enthalpies only",
          "sum of all reactant bond enthalpies only",
        ],
        correctLetter: "B",
        rationales: {
          A: "Bond breaking absorbs energy and bond formation releases energy, so this sign order is reversed.",
          C: "Reactant bonds broken must also be counted.",
          D: "Product bonds formed must also be counted.",
        },
        hints: [
          "Breaking bonds requires energy.",
          "Forming bonds releases energy.",
          "Approximate $\\Delta H$ equals energy absorbed minus energy released.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Bond breaking is endothermic; bond formation is exothermic.",
          },
          {
            step: 2,
            explanation:
              "Thus $\\Delta H\\approx$ sum of bonds broken minus sum of bonds formed.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State Hess's law of constant heat summation.`,
        difficulty: 2,
        skillTags: ["hess_law"],
        parts: singlePart("a", "State the law clearly.", 2),
        hints: [
          "Think of direct and indirect routes.",
          "The total enthalpy change is independent of path.",
          "It depends only on initial and final states.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that the enthalpy change for a reaction is the same whether it occurs in one step or several steps, provided initial and final states are the same.",
        ),
        commonErrors: [
          "Saying heat is always conserved without referring to state conditions.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Hess's law states that the enthalpy change of a reaction is the same whether the reaction occurs in one step or through several steps, provided the initial and final states are the same.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The enthalpy of formation of $\mathrm{CO_2(g)}$ is $-394\text{ kJ mol}^{-1}$. Write the corresponding thermochemical equation and interpret the sign.`,
        difficulty: 3,
        skillTags: ["formation_enthalpy", "thermochemical_equation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the thermochemical equation.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Interpret the negative sign.",
            points: 2,
          },
        ],
        hints: [
          "Formation means one mole of compound from elements.",
          "Use carbon as graphite and oxygen gas.",
          "Negative enthalpy means heat is released.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Writes $\\mathrm{C(graphite)+O_2(g)\\rightarrow CO_2(g)}$ with enthalpy.",
            },
            {
              part: "b",
              points: 2,
              description: "Explains exothermic heat release.",
            },
          ],
        },
        commonErrors: ["Writing formation of two moles of carbon dioxide."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{C(graphite)+O_2(g)\\rightarrow CO_2(g)}$, $\\Delta_fH^\\circ=-394\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "The negative sign means heat is released when one mole of carbon dioxide forms from its elements in their standard states.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{H_2(g)+Cl_2(g)\rightarrow 2HCl(g)}$, use bond enthalpies $D(\mathrm{H-H})=436$, $D(\mathrm{Cl-Cl})=242$, and $D(\mathrm{H-Cl})=431\text{ kJ mol}^{-1}$ to estimate $\Delta H$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["bond_enthalpy", "reaction_enthalpy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify bonds broken and bonds formed.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Estimate $\\Delta H$.", points: 2 },
        ],
        hints: [
          "Break one H-H bond and one Cl-Cl bond.",
          "Form two H-Cl bonds.",
          "Use broken minus formed.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Identifies one H-H and one Cl-Cl broken, two H-Cl formed.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds $-184\\text{ kJ}$ for the reaction as written.",
            },
          ],
        },
        commonErrors: ["Forgetting that two H-Cl bonds are formed."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Bonds broken: one H-H and one Cl-Cl. Bonds formed: two H-Cl bonds.",
          },
          {
            part: "b",
            explanation:
              "$\\Delta H\\approx(436+242)-2(431)=678-862=-184\\text{ kJ}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the following equations: (i) $\mathrm{A\rightarrow B}$, $\Delta H=+35\text{ kJ}$; (ii) $\mathrm{B\rightarrow C}$, $\Delta H=-80\text{ kJ}$; (iii) $\mathrm{C\rightarrow D}$, $\Delta H=+25\text{ kJ}$.`,
        figure: hessCycleFigure,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["hess_law", "thermochemical_steps"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $\\Delta H$ for $\\mathrm{A\\rightarrow C}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find $\\Delta H$ for $\\mathrm{A\\rightarrow D}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find $\\Delta H$ for $\\mathrm{D\\rightarrow A}$.",
            points: 1,
          },
        ],
        hints: [
          "Add steps in the direction used.",
          "Reverse the sign when reversing the overall reaction.",
          "Check whether the intermediate cancels.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $-45\\text{ kJ}$." },
            { part: "b", points: 2, description: "Finds $-20\\text{ kJ}$." },
            { part: "c", points: 1, description: "Finds $+20\\text{ kJ}$." },
          ],
        },
        commonErrors: ["Not changing sign when reversing the reaction."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta H(A\\rightarrow C)=35-80=-45\\text{ kJ}$.",
          },
          {
            part: "b",
            explanation:
              "$\\Delta H(A\\rightarrow D)=35-80+25=-20\\text{ kJ}$.",
          },
          {
            part: "c",
            explanation:
              "The reverse reaction $D\\rightarrow A$ has $\\Delta H=+20\\text{ kJ}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A fuel-analysis lab compares two fuels. Fuel X has combustion enthalpy $-520\text{ kJ mol}^{-1}$ and molar mass $40\text{ g mol}^{-1}$. Fuel Y has combustion enthalpy $-780\text{ kJ mol}^{-1}$ and molar mass $60\text{ g mol}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["combustion_enthalpy", "energy_per_mass", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which fuel releases more heat per mole?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find heat released per gram for X.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find heat released per gram for Y.",
            points: 2,
          },
        ],
        hints: [
          "Compare magnitudes for heat released.",
          "Per gram means divide kJ per mole by g per mole.",
          "Keep the sign convention clear.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies Y per mole." },
            {
              part: "b",
              points: 2,
              description: "Finds $13.0\\text{ kJ g}^{-1}$ released for X.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $13.0\\text{ kJ g}^{-1}$ released for Y.",
            },
          ],
        },
        commonErrors: [
          "Comparing only molar values when the question asks per gram.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Fuel Y releases more heat per mole because $780\\text{ kJ}$ has greater magnitude than $520\\text{ kJ}$.",
          },
          {
            part: "b",
            explanation:
              "For X, heat released per gram $=520/40=13.0\\text{ kJ g}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "For Y, heat released per gram $=780/60=13.0\\text{ kJ g}^{-1}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Entropy, Spontaneity and Gibbs Energy",
    subtopic:
      "Entropy change, spontaneity, Gibbs energy change, relation between enthalpy, entropy and temperature, and qualitative equilibrium connection",
    mc: [
      {
        questionLatex: L`For a process at constant temperature and pressure, the criterion for spontaneity is`,
        difficulty: 2,
        skillTags: ["gibbs_energy", "spontaneity"],
        choices: [
          L`$\Delta G<0$`,
          L`$\Delta G>0$`,
          L`$\Delta H=0$`,
          L`$\Delta S=0$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Positive $\\Delta G$ indicates non-spontaneity in the forward direction under the stated conditions.",
          C: "A zero enthalpy change alone does not decide spontaneity.",
          D: "A zero entropy change alone does not decide spontaneity.",
        },
        hints: [
          "Gibbs energy combines enthalpy and entropy effects.",
          "At constant temperature and pressure, negative $\\Delta G$ drives spontaneity.",
          "Zero $\\Delta G$ corresponds to equilibrium.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At constant temperature and pressure, a spontaneous process has $\\Delta G<0$.",
          },
        ],
      },
      {
        questionLatex: L`For a process with $\Delta H=+40\text{ kJ mol}^{-1}$ and $\Delta S=+120\text{ J mol}^{-1}\text{ K}^{-1}$, the process becomes spontaneous at temperatures`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["gibbs_energy", "temperature_threshold"],
        choices: [
          L`$T>333\text{ K}$`,
          L`$T<333\text{ K}$`,
          L`$T>3.0\text{ K}$`,
          "all temperatures",
        ],
        correctLetter: "A",
        rationales: {
          B: "For positive $\\Delta H$ and positive $\\Delta S$, the entropy term must dominate at high temperature.",
          C: "This uses kJ and J together without unit conversion.",
          D: "At low temperature the positive enthalpy term can keep $\\Delta G$ positive.",
        },
        hints: [
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "Convert $\\Delta H$ to joule or $\\Delta S$ to kJ.",
          "Set $\\Delta G<0$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At the threshold, $\\Delta G=0$, so $T=\\Delta H/\\Delta S$.",
            math: L`T=\frac{40000}{120}=333\text{ K}`,
          },
          {
            step: 2,
            explanation:
              "Because both $\\Delta H$ and $\\Delta S$ are positive, the process is spontaneous above this temperature.",
          },
        ],
      },
      {
        questionLatex: L`Which process is expected to have a positive entropy change?`,
        difficulty: 2,
        skillTags: ["entropy", "phase_change"],
        choices: [
          L`$\mathrm{H_2O(g)\rightarrow H_2O(l)}$`,
          L`$\mathrm{Na^+(aq)+Cl^-(aq)\rightarrow NaCl(s)}$`,
          L`$\mathrm{CO_2(s)\rightarrow CO_2(g)}$`,
          L`$\mathrm{N_2(g)+3H_2(g)\rightarrow 2NH_3(g)}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Condensation decreases disorder, so entropy decreases.",
          B: "Formation of a solid from aqueous ions generally reduces freedom of motion.",
          D: "Gas moles decrease from 4 to 2, so entropy tends to decrease.",
        },
        hints: [
          "Entropy usually increases when particles gain freedom of motion.",
          "Solid to gas is a large increase in dispersal.",
          "Gas mole decrease often lowers entropy.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Sublimation changes solid carbon dioxide to gas, greatly increasing molecular freedom.",
          },
          {
            step: 2,
            explanation:
              "Therefore $\\mathrm{CO_2(s)\\rightarrow CO_2(g)}$ has positive entropy change.",
          },
        ],
      },
      {
        questionLatex: L`The graph shows $\Delta G$ becoming negative only after the line crosses the zero level. Which interpretation is most reasonable?`,
        figure: gibbsTemperatureFigure,
        difficulty: 4,
        skillTags: ["gibbs_graph", "spontaneity"],
        choices: [
          "The process is spontaneous only in the lower-temperature region shown.",
          "The process is spontaneous only in the higher-temperature region shown.",
          "The process is spontaneous at every temperature because a line is drawn.",
          "The process cannot reach equilibrium because the line crosses zero.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The high-temperature side is below the zero $\\Delta G$ line in the graph.",
          C: "Only regions with negative $\\Delta G$ are spontaneous in the forward direction.",
          D: "The crossing point represents $\\Delta G=0$, the equilibrium condition under the stated setup.",
        },
        hints: [
          "Use the sign of $\\Delta G$.",
          "Above the zero line is positive; below it is negative.",
          "Spontaneity corresponds to the negative region.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The graph crosses from positive $\\Delta G$ to negative $\\Delta G$ as temperature increases.",
          },
          {
            step: 2,
            explanation:
              "The process is spontaneous only in the higher-temperature region where $\\Delta G<0$.",
          },
        ],
      },
      {
        questionLatex: L`A reaction has $\Delta H<0$ and $\Delta S>0$. What can be concluded about spontaneity at all positive temperatures?`,
        difficulty: 3,
        skillTags: ["enthalpy_entropy_signs", "gibbs_energy"],
        choices: [
          "It is spontaneous at all temperatures.",
          "It is non-spontaneous at all temperatures.",
          "It is spontaneous only at high temperature.",
          "It is spontaneous only at low temperature.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Both terms favour negative $\\Delta G$ here.",
          C: "High temperature is not required because $\\Delta H$ is already favourable and entropy is favourable.",
          D: "Low temperature is not the only favourable range.",
        },
        hints: [
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "If $\\Delta H$ is negative, the first term is favourable.",
          "If $\\Delta S$ is positive, $-T\\Delta S$ is also negative.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For $T>0$, $-T\\Delta S$ is negative when $\\Delta S>0$.",
          },
          {
            step: 2,
            explanation:
              "With $\\Delta H<0$ also, $\\Delta G$ remains negative at all positive temperatures.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the Gibbs energy equation used to discuss spontaneity at constant temperature and pressure.`,
        difficulty: 1,
        skillTags: ["gibbs_energy"],
        parts: singlePart(
          "a",
          "Write the equation and spontaneity condition.",
          2,
        ),
        hints: [
          "Gibbs energy combines enthalpy and entropy.",
          "The temperature must be in kelvin.",
          "Negative $\\Delta G$ means spontaneous.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Writes $\\Delta G=\\Delta H-T\\Delta S$ and states $\\Delta G<0$ for spontaneity.",
        ),
        commonErrors: ["Writing $\\Delta G=\\Delta H+T\\Delta S$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta G=\\Delta H-T\\Delta S$. At constant temperature and pressure, the forward process is spontaneous when $\\Delta G<0$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For a reaction, $\Delta H=-25.0\text{ kJ mol}^{-1}$ and $\Delta S=-50.0\text{ J mol}^{-1}\text{ K}^{-1}$. Calculate $\Delta G$ at $300\text{ K}$ and comment on spontaneity.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["gibbs_energy", "unit_conversion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate $\\Delta G$ in kJ mol$^{-1}$.",
            points: 3,
          },
          { letter: "b", promptMarkdown: "Comment on spontaneity.", points: 1 },
        ],
        hints: [
          "Convert entropy to kJ per kelvin per mole.",
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "Negative $\\Delta G$ means spontaneous.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 3,
              description: "Finds $-10.0\\text{ kJ mol}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States spontaneous at 300 K.",
            },
          ],
        },
        commonErrors: ["Not converting joule to kilojoule before subtracting."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta S=-50.0\\text{ J mol}^{-1}\\text{ K}^{-1}=-0.0500\\text{ kJ mol}^{-1}\\text{ K}^{-1}$. Thus $\\Delta G=-25.0-300(-0.0500)=-10.0\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "Since $\\Delta G<0$, the reaction is spontaneous at 300 K.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain qualitatively why melting of ice has $\Delta S>0$ but is not spontaneous at all temperatures.`,
        difficulty: 4,
        skillTags: ["entropy", "phase_change", "temperature_effect"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Explain why $\\Delta S$ is positive.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why temperature still matters.",
            points: 2,
          },
        ],
        hints: [
          "Liquid water has more molecular freedom than ice.",
          "Melting is endothermic.",
          "The $T\\Delta S$ term must overcome $\\Delta H$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Connects liquid phase with greater molecular freedom.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Uses $\\Delta G=\\Delta H-T\\Delta S$ and explains high-temperature favourability.",
            },
          ],
        },
        commonErrors: [
          "Assuming positive entropy change alone guarantees spontaneity.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Melting changes an ordered solid into a liquid with greater molecular freedom, so entropy increases.",
          },
          {
            part: "b",
            explanation:
              "Melting is endothermic, so $\\Delta H>0$. It becomes spontaneous only when the favourable $T\\Delta S$ term is large enough to make $\\Delta G=\\Delta H-T\\Delta S$ negative.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A reaction has $\Delta H=+72\text{ kJ mol}^{-1}$ and $\Delta S=+240\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        figure: gibbsTemperatureFigure,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["gibbs_energy", "temperature_threshold", "spontaneity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the temperature at which $\\Delta G=0$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State the temperature range for spontaneity.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain the result using signs of $\\Delta H$ and $\\Delta S$.",
            points: 1,
          },
        ],
        hints: [
          "Convert entropy to kJ per kelvin or enthalpy to joule.",
          "At the threshold, $\\Delta G=0$.",
          "Both enthalpy and entropy are positive, so high temperature is favoured.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $300\\text{ K}$." },
            {
              part: "b",
              points: 2,
              description: "States spontaneous for $T>300\\text{ K}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains entropy term dominates at high T.",
            },
          ],
        },
        commonErrors: [
          "Reversing the inequality after finding threshold temperature.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta S=240\\text{ J mol}^{-1}\\text{ K}^{-1}=0.240\\text{ kJ mol}^{-1}\\text{ K}^{-1}$. At $\\Delta G=0$, $T=\\Delta H/\\Delta S=72/0.240=300\\text{ K}$.",
          },
          {
            part: "b",
            explanation:
              "Since $\\Delta H>0$ and $\\Delta S>0$, the reaction is spontaneous when $T\\Delta S$ exceeds $\\Delta H$, so $T>300\\text{ K}$.",
          },
          {
            part: "c",
            explanation:
              "The positive enthalpy opposes spontaneity, but the positive entropy term favours spontaneity increasingly at high temperature.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A researcher compares four processes at constant temperature and pressure: P has $\Delta H<0,\Delta S>0$; Q has $\Delta H>0,\Delta S<0$; R has $\Delta H<0,\Delta S<0$; S has $\Delta H>0,\Delta S>0$.`,
        difficulty: 5,
        skillTags: ["case_based", "enthalpy_entropy_signs", "spontaneity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which process is spontaneous at all temperatures?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which process is non-spontaneous at all temperatures?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Which process is favoured at low temperature?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Which process is favoured at high temperature?",
            points: 2,
          },
        ],
        hints: [
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "Negative enthalpy and positive entropy both favour spontaneity.",
          "Positive enthalpy and positive entropy becomes favourable at high temperature.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies P." },
            { part: "b", points: 1, description: "Identifies Q." },
            { part: "c", points: 1, description: "Identifies R." },
            {
              part: "d",
              points: 2,
              description:
                "Identifies S and explains high-temperature entropy dominance.",
            },
          ],
        },
        commonErrors: [
          "Saying every exothermic process is spontaneous at all temperatures.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P is spontaneous at all temperatures because $\\Delta H<0$ and $\\Delta S>0$ both make $\\Delta G$ negative.",
          },
          {
            part: "b",
            explanation:
              "Q is non-spontaneous at all temperatures because $\\Delta H>0$ and $\\Delta S<0$ both make $\\Delta G$ positive.",
          },
          {
            part: "c",
            explanation:
              "R is favoured at low temperature: exothermic enthalpy helps, but negative entropy becomes more unfavourable as temperature rises.",
          },
          {
            part: "d",
            explanation:
              "S is favoured at high temperature because the positive entropy term can dominate the positive enthalpy term.",
          },
        ],
      },
    ],
  },
];

function extraMc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hints: readonly [string, string, string],
  solutionText: string,
  solutionMath?: string,
  calculatorAllowed = false,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints,
    solution: [
      {
        step: 1,
        explanation: solutionText,
        ...(solutionMath ? { math: solutionMath } : {}),
      },
    ],
    calculatorAllowed,
  };
}

function extraFrq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  parts: readonly FrqPart[],
  hints: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  calculatorAllowed = false,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts,
    hints,
    rubric: {
      maxPoints: parts.reduce((total, part) => total + part.points, 0),
      criteria: parts.map((part) => ({
        part: part.letter,
        points: part.points,
        description: `Completes part ${part.letter} with correct thermodynamic reasoning, sign and units.`,
      })),
    },
    commonErrors,
    workedSolution,
    calculatorAllowed,
  };
}

const largeTopicExpansions: Record<
  string,
  { mc: readonly McSeed[]; constructed: readonly ConstructedSeed[] }
> = {
  "5.1": {
    mc: [
      extraMc(
        L`A closed thermodynamic system can exchange`,
        1,
        ["system_types", "closed_system"],
        [
          "neither matter nor energy",
          "matter but not energy",
          "both matter and energy freely",
          "energy but not matter",
        ],
        "D",
        {
          A: "That describes an ideal isolated system.",
          B: "A closed system does not exchange matter.",
          C: "Exchange of matter is not allowed in a closed system.",
        },
        [
          "Classify by matter exchange first.",
          "Closed means no matter crosses the boundary.",
          "Energy may cross as heat or work.",
        ],
        "A closed system exchanges energy with surroundings but does not exchange matter.",
      ),
      extraMc(
        L`Which quantity is a state function?`,
        2,
        ["state_function", "path_function"],
        ["heat", "work", "internal energy", "frictional loss"],
        "C",
        {
          A: "Heat depends on the process path.",
          B: "Work depends on the process path.",
          D: "Frictional loss is process-dependent.",
        },
        [
          "A state function depends only on state.",
          "Heat and work describe modes of energy transfer.",
          "Internal energy is a property of the state.",
        ],
        "Internal energy is a state function; heat and work are path functions.",
      ),
      extraMc(
        L`An ideal gas expands freely into vacuum. The work done against external pressure is`,
        2,
        ["free_expansion", "work"],
        [L`positive`, L`negative`, L`zero`, L`equal to $\Delta H$ always`],
        "C",
        {
          A: "No external pressure is opposed.",
          B: "Work in expansion is negative only when expansion occurs against nonzero external pressure under the chemistry sign convention.",
          D: "Work is not generally equal to enthalpy change.",
        },
        [
          "Use $w=-P_{ext}\\Delta V$.",
          "For vacuum, $P_{ext}=0$.",
          "Therefore $w=0$.",
        ],
        L`For free expansion into vacuum, $P_{ext}=0$, so $w=-P_{ext}\Delta V=0$.`,
      ),
      extraMc(
        L`Which pair contains one intensive and one extensive property respectively?`,
        3,
        ["intensive_extensive"],
        [
          "temperature and internal energy",
          "mass and volume",
          "enthalpy and entropy",
          "heat and work",
        ],
        "A",
        {
          B: "Both mass and volume are extensive.",
          C: "Enthalpy and entropy are extensive for a given amount of substance.",
          D: "Heat and work are path quantities rather than state properties.",
        },
        [
          "Intensive properties do not depend on amount.",
          "Extensive properties depend on amount.",
          "Temperature is intensive; internal energy depends on amount.",
        ],
        "Temperature is intensive, while internal energy is extensive.",
      ),
      extraMc(
        L`If a system releases $25\text{ kJ}$ of heat to the surroundings, the sign of $q$ for the system is`,
        2,
        ["heat_sign", "system_convention"],
        [L`$+25\text{ kJ}$`, L`$-25\text{ kJ}$`, L`$0$`, L`$+50\text{ kJ}$`],
        "B",
        {
          A: "Positive q means heat absorbed by the system.",
          C: "Heat transfer has occurred.",
          D: "The magnitude is not doubled.",
        },
        [
          "Sign is assigned for the system.",
          "Heat released by the system is negative.",
          "Use the given magnitude.",
        ],
        L`For heat released by the system, $q=-25\text{ kJ}$.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Distinguish between open, closed and isolated systems using matter and energy exchange.`,
        3,
        ["system_types"],
        [
          {
            letter: "a",
            promptMarkdown: "Describe an open system.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Describe a closed system.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Describe an isolated system.",
            points: 2,
          },
        ],
        [
          "Open allows matter exchange.",
          "Closed blocks matter but can exchange energy.",
          "Isolated ideally exchanges neither.",
        ],
        [
          {
            part: "a",
            explanation:
              "An open system can exchange both matter and energy with surroundings.",
          },
          {
            part: "b",
            explanation: "A closed system can exchange energy but not matter.",
          },
          {
            part: "c",
            explanation:
              "An isolated system exchanges neither matter nor energy with surroundings in the ideal sense.",
          },
        ],
        ["Confusing closed and isolated systems."],
      ),
      extraFrq(
        "vsaq",
        L`Give two examples of state functions.`,
        1,
        ["state_function"],
        singlePart("a", "Name any two valid state functions.", 2),
        [
          "A state function depends only on initial and final states.",
          "Internal energy is one example.",
          "Enthalpy is another example.",
        ],
        [
          {
            part: "a",
            explanation:
              "Internal energy and enthalpy are state functions. Entropy and Gibbs energy are also valid examples.",
          },
        ],
        ["Listing heat and work as state functions."],
      ),
      extraFrq(
        "saq",
        L`Classify $q$, $w$, $\Delta U$ and $\Delta H$ as path functions or state functions.`,
        3,
        ["state_path_function"],
        [
          { letter: "a", promptMarkdown: "Classify $q$ and $w$.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Classify $\\Delta U$ and $\\Delta H$.",
            points: 2,
          },
        ],
        [
          "Heat and work are modes of energy transfer.",
          "They depend on process path.",
          "Internal energy and enthalpy are state functions.",
        ],
        [
          { part: "a", explanation: "$q$ and $w$ are path functions." },
          {
            part: "b",
            explanation:
              "$\\Delta U$ and $\\Delta H$ are changes in state functions.",
          },
        ],
        ["Treating heat stored in a body as a state function."],
      ),
      extraFrq(
        "laq",
        L`A gas in a cylinder is compressed by a movable piston while heat is removed through the wall.`,
        4,
        ["thermodynamic_terms", "sign_convention"],
        [
          { letter: "a", promptMarkdown: "Identify the system.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "State the sign of work $w$ for the gas.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the sign of heat $q$ for the gas.",
            points: 2,
          },
        ],
        [
          "Choose the gas as the system.",
          "Compression means work is done on the system.",
          "Heat removed means the system loses heat.",
        ],
        [
          { part: "a", explanation: "The gas is the system." },
          {
            part: "b",
            explanation:
              "For compression, work is done on the gas, so $w$ is positive in the chemistry convention.",
          },
          {
            part: "c",
            explanation: "Heat is removed from the gas, so $q$ is negative.",
          },
        ],
        [
          "Using the physics convention for work without noticing the chemistry sign convention.",
        ],
      ),
      extraFrq(
        "case",
        L`A cup of hot tea is left open on a table. Heat escapes and water vapour also leaves the cup.`,
        3,
        ["case_based", "system_classification"],
        [
          {
            letter: "a",
            promptMarkdown:
              "If the tea is the system, is it open, closed or isolated?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which kind of exchange proves your answer?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Is heat a state function here?",
            points: 1,
          },
        ],
        [
          "Water vapour leaving is matter exchange.",
          "Heat escaping is energy exchange.",
          "Heat is a path function.",
        ],
        [
          { part: "a", explanation: "It is an open system." },
          {
            part: "b",
            explanation:
              "Both matter and energy are exchanged with surroundings.",
          },
          {
            part: "c",
            explanation: "No. Heat is a path function, not a state function.",
          },
        ],
        ["Calling it closed because the cup walls are visible."],
      ),
    ],
  },
  "5.2": {
    mc: [
      extraMc(
        L`For a process, $q=+50\text{ kJ}$ and $w=-20\text{ kJ}$. The change in internal energy is`,
        2,
        ["first_law", "sign_convention"],
        [
          L`$+70\text{ kJ}$`,
          L`$+30\text{ kJ}$`,
          L`$-30\text{ kJ}$`,
          L`$-70\text{ kJ}$`,
        ],
        "B",
        {
          A: "This adds magnitudes and ignores the negative work sign.",
          C: "The system gains more heat than work it does.",
          D: "Both signs have not been handled correctly.",
        },
        ["Use $\\Delta U=q+w$.", "Substitute signs as given.", "$50-20=30$."],
        L`$\Delta U=q+w=50+(-20)=+30\text{ kJ}$.`,
      ),
      extraMc(
        L`At constant pressure, the heat absorbed by a system is equal to`,
        2,
        ["enthalpy", "constant_pressure"],
        [L`$\Delta U$`, L`$\Delta H$`, L`$-\Delta H$`, L`$w$ only`],
        "B",
        {
          A: "At constant volume, heat is related to $\\Delta U$.",
          C: "The sign is not reversed by the statement.",
          D: "Heat is not equal only to work.",
        },
        [
          "Recall the condition for enthalpy.",
          "Pressure is constant.",
          "$q_p=\\Delta H$.",
        ],
        L`At constant pressure, $q_p=\Delta H$.`,
      ),
      extraMc(
        L`A gas expands against a constant external pressure of $2\text{ bar}$ by $3\text{ L}$. Using $1\text{ L bar}=100\text{ J}$, work $w$ is`,
        3,
        ["pressure_volume_work", "unit_conversion"],
        [
          L`$+600\text{ J}$`,
          L`$-600\text{ J}$`,
          L`$+6\text{ J}$`,
          L`$-60\text{ J}$`,
        ],
        "B",
        {
          A: "Expansion work is negative for the system.",
          C: "The unit conversion is off by a factor of 100.",
          D: "The multiplication is incomplete.",
        },
        [
          "Use $w=-P_{ext}\\Delta V$.",
          "$P\\Delta V=2\\times3=6\\text{ L bar}$.",
          "Convert $6\\text{ L bar}$ to $600\\text{ J}$.",
        ],
        L`w=-2\times3\times100=-600\text{ J}.`,
      ),
      extraMc(
        L`For a reaction with $\Delta n_g=0$, the relation between $\Delta H$ and $\Delta U$ for ideal gases is`,
        3,
        ["enthalpy_internal_energy", "delta_ng"],
        [
          L`$\Delta H=\Delta U$`,
          L`$\Delta H=\Delta U+RT$`,
          L`$\Delta H=\Delta U-RT$`,
          L`$\Delta H=0$ always`,
        ],
        "A",
        {
          B: "The $\\Delta n_gRT$ term vanishes when $\\Delta n_g=0$.",
          C: "There is no negative RT correction when $\\Delta n_g=0$.",
          D: "The enthalpy change need not be zero.",
        },
        [
          "Use $\\Delta H=\\Delta U+\\Delta n_gRT$.",
          "Here $\\Delta n_g=0$.",
          "So the correction term is zero.",
        ],
        L`$\Delta H=\Delta U+0\cdot RT=\Delta U$.`,
      ),
      extraMc(
        L`In a bomb calorimeter, the heat change measured corresponds most directly to`,
        3,
        ["calorimetry", "constant_volume"],
        [
          L`$\Delta H$ at constant pressure`,
          L`$\Delta U$ at constant volume`,
          L`$P\Delta V$ only`,
          L`zero heat always`,
        ],
        "B",
        {
          A: "Bomb calorimetry is constant volume, not constant pressure.",
          C: "At constant volume, expansion work is zero, but heat is not just $P\\Delta V$.",
          D: "Heat is measured by temperature change.",
        },
        [
          "A bomb calorimeter has fixed volume.",
          "At constant volume, $q_v=\\Delta U$.",
          "This differs from coffee-cup constant pressure calorimetry.",
        ],
        L`At constant volume, $q_v=\Delta U$.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`A system absorbs $120\text{ J}$ of heat and does $45\text{ J}$ of work on the surroundings.`,
        3,
        ["first_law", "sign_convention"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the signs of $q$ and $w$.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Find $\\Delta U$.", points: 2 },
        ],
        [
          "Heat absorbed is positive.",
          "Work done by the system is negative.",
          "Use $\\Delta U=q+w$.",
        ],
        [
          {
            part: "a",
            explanation: "$q=+120\\text{ J}$ and $w=-45\\text{ J}$.",
          },
          { part: "b", explanation: "$\\Delta U=120-45=75\\text{ J}$." },
        ],
        ["Making work positive when the system does the work."],
      ),
      extraFrq(
        "vsaq",
        L`At constant volume, what thermodynamic quantity is equal to the heat absorbed $q_v$?`,
        1,
        ["constant_volume", "internal_energy"],
        singlePart("a", "State the equality.", 1),
        [
          "At constant volume, pressure-volume work is zero.",
          "The first law then connects heat directly to internal energy.",
          "Use $q_v$ notation.",
        ],
        [{ part: "a", explanation: "$q_v=\\Delta U$." }],
        ["Writing $q_v=\\Delta H$, which applies at constant pressure."],
      ),
      extraFrq(
        "saq",
        L`A gas expands by $5\text{ L}$ against $1.2\text{ bar}$. Use $1\text{ L bar}=100\text{ J}$.`,
        3,
        ["pressure_volume_work"],
        [
          {
            letter: "a",
            promptMarkdown: "Calculate the work done on the system.",
            points: 3,
          },
          { letter: "b", promptMarkdown: "Explain the sign.", points: 1 },
        ],
        [
          "Use $w=-P_{ext}\\Delta V$.",
          "Multiply pressure and volume change.",
          "Expansion gives negative work for the system.",
        ],
        [
          {
            part: "a",
            explanation: "$w=-1.2\\times5\\times100=-600\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "The sign is negative because the gas expands and does work on the surroundings.",
          },
        ],
        ["Forgetting the negative sign in expansion work."],
        true,
      ),
      extraFrq(
        "laq",
        L`For $\mathrm{N_2(g)+3H_2(g)\rightarrow2NH_3(g)}$, relate $\Delta H$ and $\Delta U$ at temperature $T$.`,
        4,
        ["enthalpy_internal_energy", "gas_moles"],
        [
          { letter: "a", promptMarkdown: "Find $\\Delta n_g$.", points: 2 },
          {
            letter: "b",
            promptMarkdown:
              "Write $\\Delta H$ in terms of $\\Delta U$, $R$ and $T$.",
            points: 3,
          },
        ],
        [
          "Count gaseous product moles.",
          "Count gaseous reactant moles.",
          "Use $\\Delta H=\\Delta U+\\Delta n_gRT$.",
        ],
        [
          { part: "a", explanation: "$\\Delta n_g=2-(1+3)=-2$." },
          { part: "b", explanation: "$\\Delta H=\\Delta U-2RT$." },
        ],
        [
          "Using total stoichiometric coefficients without products minus reactants.",
        ],
      ),
      extraFrq(
        "case",
        L`Two calorimeters are used. A works at constant volume and B works at constant pressure.`,
        3,
        ["case_based", "qv_qp"],
        [
          {
            letter: "a",
            promptMarkdown: "Which calorimeter gives $q_v$?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "What thermodynamic change equals $q_v$?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "What thermodynamic change equals $q_p$?",
            points: 2,
          },
        ],
        [
          "Constant volume corresponds to $q_v$.",
          "At constant volume, heat equals change in internal energy.",
          "At constant pressure, heat equals enthalpy change.",
        ],
        [
          { part: "a", explanation: "Calorimeter A gives $q_v$." },
          { part: "b", explanation: "$q_v=\\Delta U$." },
          { part: "c", explanation: "$q_p=\\Delta H$." },
        ],
        ["Interchanging constant-volume and constant-pressure results."],
      ),
    ],
  },
  "5.3": {
    mc: [
      extraMc(
        L`The heat needed to raise the temperature of $50\text{ g}$ of water by $10\text{ K}$ is closest to $(c=4.2\text{ J g}^{-1}\text{ K}^{-1})$`,
        2,
        ["calorimetry", "specific_heat"],
        [
          L`$210\text{ J}$`,
          L`$500\text{ J}$`,
          L`$2100\text{ J}$`,
          L`$4200\text{ J}$`,
        ],
        "C",
        {
          A: "This misses the mass factor.",
          B: "This uses only mass times temperature change.",
          D: "This doubles the correct value.",
        },
        [
          "Use $q=mc\\Delta T$.",
          "Substitute $m=50$, $c=4.2$, $\\Delta T=10$.",
          "$50\\times4.2\\times10=2100$.",
        ],
        L`q=50\times4.2\times10=2100\text{ J}.`,
        undefined,
        true,
      ),
      extraMc(
        L`Heat capacity of a body differs from specific heat capacity because heat capacity`,
        2,
        ["heat_capacity", "specific_heat"],
        [
          "is per unit mass",
          "depends on the amount of substance",
          "is always zero",
          "has no unit",
        ],
        "B",
        {
          A: "Specific heat capacity is heat capacity per unit mass.",
          C: "Heat capacity is not always zero.",
          D: "Heat capacity has units such as $\\mathrm{J\\,K^{-1}}$.",
        },
        [
          "Specific heat is an intensive-like per-mass quantity.",
          "Heat capacity belongs to the whole body/sample.",
          "It changes with amount.",
        ],
        "Heat capacity is the heat required to raise the temperature of the whole body by one kelvin, so it depends on amount.",
      ),
      extraMc(
        L`Equal masses of water at $20^\circ\mathrm{C}$ and $60^\circ\mathrm{C}$ are mixed with no heat loss. The final temperature is`,
        2,
        ["calorimetry", "thermal_equilibrium"],
        [
          L`$20^\circ\mathrm{C}$`,
          L`$30^\circ\mathrm{C}$`,
          L`$40^\circ\mathrm{C}$`,
          L`$60^\circ\mathrm{C}$`,
        ],
        "C",
        {
          A: "The hot water transfers heat, so the final temperature rises above 20.",
          B: "Equal masses give the average, not 30 here.",
          D: "The cold water absorbs heat, so the final temperature falls below 60.",
        },
        [
          "Same substance and equal masses.",
          "No heat loss.",
          "Final temperature is the average.",
        ],
        L`T_f=(20+60)/2=40^\circ\mathrm{C}.`,
      ),
      extraMc(
        L`A coffee-cup calorimeter is generally used for processes occurring at approximately`,
        2,
        ["calorimetry", "constant_pressure"],
        [
          "constant volume",
          "constant pressure",
          "zero temperature",
          "zero heat capacity",
        ],
        "B",
        {
          A: "A bomb calorimeter is used for constant-volume measurements.",
          C: "Temperature changes are measured.",
          D: "The calorimeter can have a heat capacity correction.",
        },
        [
          "A coffee cup is open to atmospheric pressure.",
          "Pressure remains nearly constant.",
          "So it measures constant-pressure heat.",
        ],
        "Coffee-cup calorimetry approximates constant-pressure conditions.",
      ),
      extraMc(
        L`If a calorimeter absorbs $150\text{ J}$ while the solution absorbs $850\text{ J}$, the heat released by the reaction is`,
        3,
        ["calorimetry", "heat_balance"],
        [
          L`$-700\text{ J}$`,
          L`$-1000\text{ J}$`,
          L`$+1000\text{ J}$`,
          L`$+700\text{ J}$`,
        ],
        "B",
        {
          A: "The heat absorbed by solution and calorimeter should be added.",
          C: "The reaction released heat, so its sign is negative.",
          D: "Both magnitude and sign are wrong.",
        },
        [
          "Surroundings include solution plus calorimeter.",
          "Total heat absorbed outside reaction is $150+850$ J.",
          "Reaction heat is the negative of that.",
        ],
        L`q_{rxn}=-(150+850)=-1000\text{ J}.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`A $200\text{ g}$ sample of water is heated from $25^\circ\mathrm{C}$ to $35^\circ\mathrm{C}$. Take $c=4.2\text{ J g}^{-1}\text{ K}^{-1}$.`,
        3,
        ["calorimetry", "specific_heat"],
        [
          { letter: "a", promptMarkdown: "Find $\\Delta T$.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Calculate heat absorbed.",
            points: 3,
          },
        ],
        [
          "Temperature change in Celsius degree equals kelvin change.",
          "Use $q=mc\\Delta T$.",
          "Keep units in joule.",
        ],
        [
          { part: "a", explanation: "$\\Delta T=10\\text{ K}$." },
          {
            part: "b",
            explanation: "$q=200\\times4.2\\times10=8400\\text{ J}$.",
          },
        ],
        ["Using final temperature instead of temperature change."],
        true,
      ),
      extraFrq(
        "vsaq",
        L`A small copper block and a large copper block need different amounts of heat for the same $1\text{ K}$ rise. Which sample property explains this? Define it.`,
        1,
        ["heat_capacity"],
        singlePart("a", "Name the property and give its definition.", 2),
        [
          "It is for a body or sample.",
          "It is heat per unit temperature rise.",
          "Do not confuse with specific heat capacity.",
        ],
        [
          {
            part: "a",
            explanation:
              "Heat capacity is the amount of heat required to raise the temperature of a body by one kelvin.",
          },
        ],
        ["Defining specific heat capacity instead."],
      ),
      extraFrq(
        "saq",
        L`In a calorimetry experiment, the solution absorbs $2.4\text{ kJ}$ and the calorimeter absorbs $0.3\text{ kJ}$.`,
        3,
        ["calorimetry", "heat_balance"],
        [
          {
            letter: "a",
            promptMarkdown: "Find total heat absorbed by surroundings.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find heat change of the reaction.",
            points: 2,
          },
        ],
        [
          "Add solution and calorimeter heat.",
          "Energy is conserved.",
          "Reaction heat is opposite in sign.",
        ],
        [
          {
            part: "a",
            explanation: "Surroundings absorb $2.4+0.3=2.7\\text{ kJ}$.",
          },
          { part: "b", explanation: "The reaction heat is $-2.7\\text{ kJ}$." },
        ],
        [
          "Reporting the surroundings heat as the reaction heat without changing sign.",
        ],
        true,
      ),
      extraFrq(
        "laq",
        L`A hot metal of mass $100\text{ g}$ at $90^\circ\mathrm{C}$ is placed in $100\text{ g}$ water at $30^\circ\mathrm{C}$. The final temperature is $35^\circ\mathrm{C}$. Take water specific heat as $4.2\text{ J g}^{-1}\text{ K}^{-1}$ and ignore calorimeter heat.`,
        5,
        ["calorimetry", "specific_heat_metal"],
        [
          {
            letter: "a",
            promptMarkdown: "Calculate heat gained by water.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate specific heat of the metal.",
            points: 3,
          },
        ],
        [
          "Heat gained by water equals heat lost by metal.",
          "Water temperature rises by $5\\text{ K}$.",
          "Metal temperature falls by $55\\text{ K}$.",
        ],
        [
          {
            part: "a",
            explanation: "$q_{water}=100\\times4.2\\times5=2100\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "$100\\times c\\times55=2100$, so $c=2100/5500=0.382\\text{ J g}^{-1}\\text{ K}^{-1}$ approximately.",
          },
        ],
        ["Using $90-30$ instead of $90-35$ for the metal temperature fall."],
        true,
      ),
      extraFrq(
        "case",
        L`A reaction is performed in an insulated cup containing water. The water temperature rises from $28^\circ\mathrm{C}$ to $33^\circ\mathrm{C}$.`,
        3,
        ["case_based", "calorimetry_sign"],
        [
          {
            letter: "a",
            promptMarkdown: "Did the water absorb or release heat?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Is the reaction exothermic or endothermic?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "What is the sign of $q$ for the reaction?",
            points: 1,
          },
        ],
        [
          "Temperature rise means water gained heat.",
          "That heat came from the reaction.",
          "Heat released by reaction is negative for the reaction system.",
        ],
        [
          { part: "a", explanation: "The water absorbed heat." },
          {
            part: "b",
            explanation:
              "The reaction is exothermic because it released heat to the water.",
          },
          { part: "c", explanation: "$q$ for the reaction is negative." },
        ],
        [
          "Calling the reaction endothermic just because the temperature increases.",
        ],
      ),
    ],
  },
  "5.4": {
    mc: [
      extraMc(
        L`If the enthalpy change for $\mathrm{A\rightarrow B}$ is $-40\text{ kJ}$, then for $\mathrm{B\rightarrow A}$ it is`,
        2,
        ["thermochemical_equation", "reverse_reaction"],
        [L`$-40\text{ kJ}$`, L`$+40\text{ kJ}$`, L`$-80\text{ kJ}$`, L`$0$`],
        "B",
        {
          A: "Reversing a reaction reverses the sign of enthalpy change.",
          C: "The equation is reversed, not doubled.",
          D: "The reverse still has an enthalpy change.",
        },
        [
          "Reverse reaction changes sign.",
          "Magnitude remains same.",
          "So negative becomes positive.",
        ],
        L`For the reverse reaction, $\Delta H=+40\text{ kJ}$.`,
      ),
      extraMc(
        L`When a thermochemical equation is multiplied by $3$, its enthalpy change is`,
        2,
        ["thermochemical_equation", "stoichiometry"],
        [
          "unchanged",
          "divided by 3",
          "multiplied by 3",
          "changed only in sign",
        ],
        "C",
        {
          A: "Enthalpy change is extensive for the reaction as written.",
          B: "Division would apply if the equation were divided.",
          D: "Sign changes only when the reaction is reversed.",
        },
        [
          "Reaction enthalpy depends on stoichiometric amount.",
          "Multiplying coefficients scales the reaction.",
          "So enthalpy change scales too.",
        ],
        "Multiplying the thermochemical equation by 3 multiplies the enthalpy change by 3.",
      ),
      extraMc(
        L`Standard enthalpy of formation of $\mathrm{O_2(g)}$ in its standard state is`,
        2,
        ["enthalpy_of_formation", "standard_state"],
        [
          L`$0$`,
          L`$+1\text{ kJ mol}^{-1}$`,
          L`$-1\text{ kJ mol}^{-1}$`,
          "equal to bond enthalpy of O=O",
        ],
        "A",
        {
          B: "Elements in standard states have zero standard enthalpy of formation.",
          C: "It is exactly assigned as zero.",
          D: "Formation enthalpy of an element in its standard state is not its bond enthalpy.",
        },
        [
          "Formation enthalpy is measured from elements in standard states.",
          "An element already in its standard state is the reference.",
          "Reference value is zero.",
        ],
        L`$\Delta_fH^\circ[\mathrm{O_2(g)}]=0$.`,
      ),
      extraMc(
        L`Using average bond enthalpies, $\Delta H$ for a reaction is estimated as`,
        3,
        ["bond_enthalpy", "enthalpy_estimation"],
        [
          "bonds formed minus bonds broken",
          "bonds broken minus bonds formed",
          "sum of all bond enthalpies only in products",
          "zero for every covalent reaction",
        ],
        "B",
        {
          A: "The sign is reversed.",
          C: "Reactant bond breaking must also be counted.",
          D: "Covalent reactions can have nonzero enthalpy changes.",
        },
        [
          "Breaking bonds requires energy.",
          "Forming bonds releases energy.",
          "So estimate is broken minus formed.",
        ],
        L`$\Delta H\approx\sum D(\text{bonds broken})-\sum D(\text{bonds formed})$.`,
      ),
      extraMc(
        L`If combustion of one mole of methane releases $890\text{ kJ}$, the standard enthalpy of combustion is written as`,
        2,
        ["combustion_enthalpy", "sign"],
        [
          L`$+890\text{ kJ mol}^{-1}$`,
          L`$-890\text{ kJ mol}^{-1}$`,
          L`$0$`,
          L`$+445\text{ kJ mol}^{-1}$`,
        ],
        "B",
        {
          A: "Released heat corresponds to negative enthalpy change for the system.",
          C: "Combustion is not thermoneutral here.",
          D: "The value is given per mole already.",
        },
        [
          "Combustion releases heat.",
          "Exothermic enthalpy changes are negative.",
          "Use per mole value.",
        ],
        L`$\Delta_cH^\circ=-890\text{ kJ mol}^{-1}$.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`For $\mathrm{C(graphite)+O_2(g)\rightarrow CO_2(g)}$, $\Delta H=-394\text{ kJ mol}^{-1}$.`,
        3,
        ["thermochemical_equation", "reverse_scale"],
        [
          {
            letter: "a",
            promptMarkdown: "Write $\\Delta H$ for the reverse reaction.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write $\\Delta H$ when the original equation is doubled.",
            points: 2,
          },
        ],
        [
          "Reverse changes sign.",
          "Doubling scales enthalpy.",
          "Keep units per equation as written.",
        ],
        [
          {
            part: "a",
            explanation:
              "For $\\mathrm{CO_2(g)\\rightarrow C(graphite)+O_2(g)}$, $\\Delta H=+394\\text{ kJ}$.",
          },
          {
            part: "b",
            explanation:
              "For the doubled original reaction, $\\Delta H=-788\\text{ kJ}$.",
          },
        ],
        ["Changing sign when multiplying instead of only when reversing."],
      ),
      extraFrq(
        "vsaq",
        L`What is meant by standard enthalpy of formation of a compound?`,
        2,
        ["enthalpy_of_formation", "standard_state"],
        singlePart("a", "Define the term.", 2),
        [
          "It is for one mole of compound.",
          "Reactants are elements.",
          "All substances are in their standard states.",
        ],
        [
          {
            part: "a",
            explanation:
              "Standard enthalpy of formation is the enthalpy change when one mole of a compound is formed from its constituent elements in their standard states.",
          },
        ],
        [
          "Forgetting the condition that exactly one mole of compound is formed.",
        ],
      ),
      extraFrq(
        "saq",
        L`Use bond enthalpies to estimate $\Delta H$ for $\mathrm{H_2+Cl_2\rightarrow2HCl}$. Given $D(\mathrm{H-H})=436$, $D(\mathrm{Cl-Cl})=242$, $D(\mathrm{H-Cl})=431\text{ kJ mol}^{-1}$.`,
        4,
        ["bond_enthalpy", "enthalpy_estimation"],
        [
          {
            letter: "a",
            promptMarkdown: "Calculate energy for bonds broken.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate energy for bonds formed.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Estimate $\\Delta H$.", points: 2 },
        ],
        [
          "Break one H-H and one Cl-Cl bond.",
          "Form two H-Cl bonds.",
          "Use broken minus formed.",
        ],
        [
          {
            part: "a",
            explanation: "Bonds broken: $436+242=678\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "b",
            explanation: "Bonds formed: $2\\times431=862\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "c",
            explanation: "$\\Delta H=678-862=-184\\text{ kJ mol}^{-1}$.",
          },
        ],
        ["Using formed minus broken and reversing the sign."],
        true,
      ),
      extraFrq(
        "laq",
        L`Given $\Delta_fH^\circ(\mathrm{CO_2})=-394\text{ kJ mol}^{-1}$, $\Delta_fH^\circ(\mathrm{H_2O(l)})=-286\text{ kJ mol}^{-1}$ and $\Delta_fH^\circ(\mathrm{CH_4})=-75\text{ kJ mol}^{-1}$, find $\Delta H^\circ$ for $\mathrm{CH_4+2O_2\rightarrow CO_2+2H_2O(l)}$.`,
        5,
        ["formation_enthalpy", "combustion"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the products-minus-reactants expression.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate the reaction enthalpy.",
            points: 3,
          },
        ],
        [
          "Use formation enthalpies.",
          "$\\Delta_fH^\\circ(\\mathrm{O_2})=0$.",
          "Include coefficient 2 for water.",
        ],
        [
          {
            part: "a",
            explanation: "$\\Delta H^\\circ=[-394+2(-286)]-[(-75)+2(0)]$.",
          },
          {
            part: "b",
            explanation:
              "$\\Delta H^\\circ=(-966)-(-75)=-891\\text{ kJ mol}^{-1}$.",
          },
        ],
        [
          "Forgetting that oxygen in its standard state has zero formation enthalpy.",
        ],
        true,
      ),
      extraFrq(
        "case",
        L`A student has two equations: I: $\mathrm{X\rightarrow Y}$, $\Delta H=-120\text{ kJ}$; II: $\mathrm{Y\rightarrow Z}$, $\Delta H=+40\text{ kJ}$.`,
        4,
        ["case_based", "hess_law"],
        [
          {
            letter: "a",
            promptMarkdown: "Add I and II to obtain the net reaction.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find net $\\Delta H$.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "State why this addition is allowed.",
            points: 2,
          },
        ],
        [
          "Intermediate Y cancels.",
          "Add enthalpy changes algebraically.",
          "This is Hess's law.",
        ],
        [
          {
            part: "a",
            explanation: "The net reaction is $\\mathrm{X\\rightarrow Z}$.",
          },
          { part: "b", explanation: "Net $\\Delta H=-120+40=-80\\text{ kJ}$." },
          {
            part: "c",
            explanation:
              "Enthalpy is a state function, so enthalpy changes for steps can be added when equations are added.",
          },
        ],
        ["Adding magnitudes and ignoring signs."],
      ),
    ],
  },
  "5.5": {
    mc: [
      extraMc(
        L`A process with $\Delta H<0$ and $\Delta S>0$ is`,
        2,
        ["gibbs_energy", "spontaneity"],
        [
          "spontaneous at all temperatures",
          "spontaneous only at high temperature",
          "spontaneous only at low temperature",
          "never spontaneous",
        ],
        "A",
        {
          B: "High temperature is needed when both $\\Delta H$ and $\\Delta S$ are positive.",
          C: "Low temperature is the condition when both are negative and enthalpy dominates.",
          D: "Both terms favour negative $\\Delta G$.",
        },
        [
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "Negative enthalpy favours spontaneity.",
          "Positive entropy also favours spontaneity.",
        ],
        L`With $\Delta H<0$ and $\Delta S>0$, $\Delta G$ is negative at all temperatures.`,
      ),
      extraMc(
        L`For $\Delta H=+30\text{ kJ mol}^{-1}$ and $\Delta S=+100\text{ J mol}^{-1}\text{ K}^{-1}$, the minimum temperature for spontaneity is approximately`,
        4,
        ["gibbs_energy", "temperature_threshold"],
        [
          L`$100\text{ K}$`,
          L`$200\text{ K}$`,
          L`$300\text{ K}$`,
          L`$3000\text{ K}$`,
        ],
        "C",
        {
          A: "This does not handle kJ/J units correctly.",
          B: "The threshold is higher.",
          D: "This forgets to convert entropy to kJ per kelvin.",
        },
        [
          "Convert entropy to kJ: $100\\text{ J}=0.100\\text{ kJ}$.",
          "At threshold, $\\Delta G=0$.",
          "$T=\\Delta H/\\Delta S=30/0.100$.",
        ],
        L`T=30/0.100=300\text{ K}; spontaneity requires $T>300\text{ K}$.`,
        undefined,
        true,
      ),
      extraMc(
        L`The entropy change is expected to be positive for`,
        2,
        ["entropy", "qualitative_entropy"],
        [
          "freezing of water",
          "condensation of steam",
          "sublimation of iodine",
          "crystallisation from solution",
        ],
        "C",
        {
          A: "Freezing decreases disorder.",
          B: "Condensation changes gas to liquid and decreases entropy.",
          D: "Crystallisation generally decreases disorder.",
        },
        [
          "Entropy usually increases from solid to liquid to gas.",
          "Sublimation changes solid directly to gas.",
          "Gas has much higher disorder.",
        ],
        "Sublimation gives a large positive entropy change because a solid becomes a gas.",
      ),
      extraMc(
        L`A reaction is non-spontaneous at all temperatures when`,
        3,
        ["gibbs_energy", "sign_analysis"],
        [
          L`$\Delta H<0,\Delta S>0$`,
          L`$\Delta H>0,\Delta S<0$`,
          L`$\Delta H<0,\Delta S<0$`,
          L`$\Delta H>0,\Delta S>0$`,
        ],
        "B",
        {
          A: "Both signs favour spontaneity.",
          C: "This can be spontaneous at low temperature.",
          D: "This can be spontaneous at high temperature.",
        },
        [
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "Positive enthalpy opposes spontaneity.",
          "Negative entropy also makes $-T\\Delta S$ positive.",
        ],
        L`If $\Delta H>0$ and $\Delta S<0$, both terms make $\Delta G$ positive at every temperature.`,
      ),
      extraMc(
        L`For a spontaneous process at constant temperature and pressure, the sign of $\Delta G$ is`,
        1,
        ["gibbs_energy", "spontaneity_condition"],
        ["negative", "positive", "zero only", "unrelated to spontaneity"],
        "A",
        {
          B: "Positive $\\Delta G$ indicates non-spontaneity in the forward direction.",
          C: "Zero corresponds to equilibrium.",
          D: "$\\Delta G$ is the criterion under these conditions.",
        },
        [
          "The Gibbs criterion applies at constant T and P.",
          "Forward spontaneity needs a driving force.",
          "That means $\\Delta G<0$.",
        ],
        L`At constant temperature and pressure, a spontaneous process has $\Delta G<0$.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`For a reaction, $\Delta H=+45\text{ kJ mol}^{-1}$ and $\Delta S=+150\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        4,
        ["gibbs_energy", "temperature_threshold"],
        [
          {
            letter: "a",
            promptMarkdown: "Find the temperature at which $\\Delta G=0$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State the temperature condition for spontaneity.",
            points: 2,
          },
        ],
        [
          "Convert entropy to kJ per kelvin.",
          "At equilibrium threshold, $\\Delta G=0$.",
          "Positive enthalpy and positive entropy favour high temperature.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\Delta S=0.150\\text{ kJ mol}^{-1}\\text{ K}^{-1}$, so $T=45/0.150=300\\text{ K}$.",
          },
          {
            part: "b",
            explanation: "The reaction is spontaneous for $T>300\\text{ K}$.",
          },
        ],
        ["Forgetting to convert joule to kilojoule."],
        true,
      ),
      extraFrq(
        "vsaq",
        L`What is the Gibbs energy criterion for equilibrium at constant temperature and pressure?`,
        2,
        ["gibbs_energy", "equilibrium"],
        singlePart("a", "State the criterion.", 2),
        [
          "Negative means spontaneous forward.",
          "Positive means non-spontaneous forward.",
          "At equilibrium, the driving force is zero.",
        ],
        [
          {
            part: "a",
            explanation:
              "At equilibrium under constant temperature and pressure, $\\Delta G=0$.",
          },
        ],
        ["Writing $\\Delta G<0$ for equilibrium."],
      ),
      extraFrq(
        "saq",
        L`Predict whether $\Delta S$ is positive or negative for $\mathrm{CaCO_3(s)\rightarrow CaO(s)+CO_2(g)}$ and justify.`,
        3,
        ["entropy", "gas_formation"],
        [
          {
            letter: "a",
            promptMarkdown: "State the sign of $\\Delta S$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Give the reason.", points: 3 },
        ],
        [
          "Compare gas moles.",
          "A gas is produced from solids.",
          "Gas formation increases disorder.",
        ],
        [
          { part: "a", explanation: "$\\Delta S$ is positive." },
          {
            part: "b",
            explanation:
              "A gaseous product, $\\mathrm{CO_2}$, is formed from solid reactant, so randomness/disorder increases.",
          },
        ],
        ["Judging entropy only from number of solid formula units."],
      ),
      extraFrq(
        "laq",
        L`Classify spontaneity for four sign combinations of $\Delta H$ and $\Delta S$.`,
        4,
        ["gibbs_energy", "sign_combinations"],
        [
          {
            letter: "a",
            promptMarkdown: "$\\Delta H<0,\\Delta S>0$",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "$\\Delta H>0,\\Delta S<0$",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "$\\Delta H<0,\\Delta S<0$",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "$\\Delta H>0,\\Delta S>0$",
            points: 2,
          },
        ],
        [
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
          "Check which term is favourable.",
          "Temperature matters when signs compete.",
        ],
        [
          { part: "a", explanation: "Spontaneous at all temperatures." },
          { part: "b", explanation: "Non-spontaneous at all temperatures." },
          {
            part: "c",
            explanation:
              "Spontaneous at low temperature, where favourable enthalpy dominates.",
          },
          {
            part: "d",
            explanation:
              "Spontaneous at high temperature, where favourable entropy dominates.",
          },
        ],
        [
          "Saying every exothermic process is spontaneous at every temperature.",
        ],
      ),
      extraFrq(
        "case",
        L`Process P has $\Delta H=-20\text{ kJ mol}^{-1}$ and $\Delta S=-50\text{ J mol}^{-1}\text{ K}^{-1}$.`,
        5,
        ["case_based", "gibbs_energy"],
        [
          {
            letter: "a",
            promptMarkdown: "Calculate $\\Delta G$ at $200\\text{ K}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate $\\Delta G$ at $600\\text{ K}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State the temperature region where the process is spontaneous.",
            points: 1,
          },
        ],
        [
          "Convert entropy to kJ per kelvin.",
          "$\\Delta S=-0.050\\text{ kJ mol}^{-1}\\text{ K}^{-1}$.",
          "Use $\\Delta G=\\Delta H-T\\Delta S$.",
        ],
        [
          {
            part: "a",
            explanation:
              "At $200\\text{ K}$, $\\Delta G=-20-200(-0.050)=-10\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "At $600\\text{ K}$, $\\Delta G=-20-600(-0.050)=+10\\text{ kJ mol}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "It is spontaneous at low temperature, below $400\\text{ K}$.",
          },
        ],
        ["Dropping the negative sign of entropy in $-T\\Delta S$."],
        true,
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

export const chemicalThermodynamicsTopics: Topic[] =
  expandedTopicSeeds.map(makeTopic);
