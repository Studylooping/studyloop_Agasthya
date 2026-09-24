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

const COURSE = "cbse-science-10";
const UNIT = "u4-effects-of-current";
const VERSION = "0.1.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface ChoiceSeed {
  text: string;
  correct?: boolean;
  rationale: string;
  misconceptionTag?: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [ChoiceSeed, ChoiceSeed, ChoiceSeed, ChoiceSeed];
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
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
    body,
  }));
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function criterion(
  partLetter: string,
  points: number,
  description: string,
): FrqRubric["criteria"][number] {
  return { part: partLetter, points, description };
}

function rubric(
  criteria: readonly FrqRubric["criteria"][number][],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((sum, item) => sum + item.points, 0),
    criteria: [...criteria],
  };
}

function solutionPart(
  partLetter: string,
  explanation: string,
  math?: string,
): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function correct(text: string): ChoiceSeed {
  return { text, correct: true, rationale: "" };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function calibrateEffectsDifficulty({
  difficulty,
  kind,
  responseType,
  questionLatex,
}: {
  difficulty: Difficulty;
  kind: "mc_single" | "frq";
  responseType?: ResponseType;
  questionLatex: string;
}): Difficulty {
  if (responseType === "vsaq") return Math.min(difficulty, 2) as Difficulty;
  if (difficulty <= 2) return difficulty;

  const text = questionLatex.toLowerCase();
  const recallOnly =
    /\b(name|state|which wire|which rule|which statement|is called|unit of)\b/.test(
      text,
    ) && !/\b(calculate|justify|explain|compare|predict|case|data|infer|why|shown)\b/.test(
      text,
    );

  if (kind === "mc_single" && difficulty >= 4 && recallOnly) return 3;
  if (kind === "frq" && responseType === "saq" && difficulty >= 4 && recallOnly) return 3;
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ??
    "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Check the circuit connection, unit conversion, or field direction before deciding.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const correctCount = seed.choices.filter((choice) => choice.correct).length;
  if (correctCount !== 1) {
    throw new Error(`${meta.topicCode} MC ${index + 1} must have exactly one correct choice.`);
  }

  const choices = seed.choices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: Boolean(choice.correct),
    rationaleIfWrong: choice.correct
      ? null
      : (choice.rationale ?? fallbackWrongRationale(seed, choice)),
    misconceptionTag: choice.correct
      ? null
      : (choice.misconceptionTag ??
        "incorrect_cbse_class10_effects_of_current_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateEffectsDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_formula_without_checking_units_circuit_connection_or_direction",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateEffectsDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_rule_without_linking_it_to_current_voltage_resistance_or_field_direction",
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

const ohmLawGraphFigure: ItemFigure = {
  type: "svg",
  title: "Voltage-current graph",
  description:
    "A straight V-I graph through the origin with labelled points for an ohmic resistor.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" aria-label="Voltage current graph for an ohmic resistor">
  <rect width="720" height="380" fill="#f8fafc"/>
  <line x1="90" y1="310" x2="650" y2="310" stroke="#334155" stroke-width="3" marker-end="url(#axisArrowOhm)"/>
  <line x1="90" y1="310" x2="90" y2="50" stroke="#334155" stroke-width="3" marker-end="url(#axisArrowOhm)"/>
  <g stroke="#dbe3ee" stroke-width="1">
    <line x1="190" y1="310" x2="190" y2="70"/>
    <line x1="290" y1="310" x2="290" y2="70"/>
    <line x1="390" y1="310" x2="390" y2="70"/>
    <line x1="490" y1="310" x2="490" y2="70"/>
    <line x1="590" y1="310" x2="590" y2="70"/>
    <line x1="90" y1="260" x2="620" y2="260"/>
    <line x1="90" y1="210" x2="620" y2="210"/>
    <line x1="90" y1="160" x2="620" y2="160"/>
    <line x1="90" y1="110" x2="620" y2="110"/>
  </g>
  <line x1="90" y1="310" x2="490" y2="110" stroke="#2563eb" stroke-width="5"/>
  <circle cx="190" cy="260" r="6" fill="#2563eb"/>
  <circle cx="290" cy="210" r="6" fill="#2563eb"/>
  <circle cx="390" cy="160" r="6" fill="#2563eb"/>
  <text x="660" y="314" font-size="16" fill="#0f172a" font-family="Arial">I (A)</text>
  <text x="62" y="55" font-size="16" fill="#0f172a" font-family="Arial">V (V)</text>
  <text x="85" y="332" font-size="14" fill="#0f172a" font-family="Arial">0</text>
  <text x="185" y="332" font-size="14" fill="#0f172a" font-family="Arial">1</text>
  <text x="285" y="332" font-size="14" fill="#0f172a" font-family="Arial">2</text>
  <text x="385" y="332" font-size="14" fill="#0f172a" font-family="Arial">3</text>
  <text x="64" y="264" font-size="14" fill="#0f172a" font-family="Arial">3</text>
  <text x="64" y="214" font-size="14" fill="#0f172a" font-family="Arial">6</text>
  <text x="64" y="164" font-size="14" fill="#0f172a" font-family="Arial">9</text>
  <text x="58" y="114" font-size="14" fill="#0f172a" font-family="Arial">12</text>
  <defs>
    <marker id="axisArrowOhm" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155"/>
    </marker>
  </defs>
</svg>`,
};

const resistorNetworkFigure: ItemFigure = {
  type: "svg",
  title: "Mixed resistor network",
  description:
    "A 12 V source connected to a 4 ohm resistor in series with parallel 6 ohm and 3 ohm resistors.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" aria-label="Mixed series parallel resistor network">
  <rect width="760" height="360" fill="#f8fafc"/>
  <line x1="110" y1="190" x2="180" y2="190" stroke="#334155" stroke-width="4"/>
  <line x1="180" y1="150" x2="180" y2="230" stroke="#334155" stroke-width="4"/>
  <line x1="180" y1="150" x2="470" y2="150" stroke="#334155" stroke-width="4"/>
  <line x1="180" y1="230" x2="470" y2="230" stroke="#334155" stroke-width="4"/>
  <line x1="470" y1="150" x2="470" y2="230" stroke="#334155" stroke-width="4"/>
  <line x1="470" y1="190" x2="640" y2="190" stroke="#334155" stroke-width="4"/>
  <rect x="242" y="130" width="96" height="40" rx="4" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="290" y="156" text-anchor="middle" font-size="16" fill="#991b1b" font-family="Arial">6 ohm</text>
  <rect x="242" y="210" width="96" height="40" rx="4" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <text x="290" y="236" text-anchor="middle" font-size="16" fill="#166534" font-family="Arial">3 ohm</text>
  <rect x="520" y="170" width="96" height="40" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="568" y="196" text-anchor="middle" font-size="16" fill="#1d4ed8" font-family="Arial">4 ohm</text>
  <line x1="92" y1="160" x2="92" y2="220" stroke="#0f172a" stroke-width="3"/>
  <line x1="72" y1="172" x2="72" y2="208" stroke="#0f172a" stroke-width="3"/>
  <line x1="72" y1="190" x2="110" y2="190" stroke="#334155" stroke-width="4"/>
  <line x1="640" y1="190" x2="640" y2="70" stroke="#334155" stroke-width="4"/>
  <line x1="640" y1="70" x2="92" y2="70" stroke="#334155" stroke-width="4"/>
  <line x1="92" y1="70" x2="92" y2="160" stroke="#334155" stroke-width="4"/>
  <text x="52" y="246" font-size="16" fill="#0f172a" font-family="Arial">12 V</text>
</svg>`,
};

const straightWireFieldFigure: ItemFigure = {
  type: "svg",
  title: "Magnetic field around a straight conductor",
  description:
    "A vertical current-carrying wire with concentric magnetic field lines around it.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 360" role="img" aria-label="Magnetic field lines around a straight current carrying wire">
  <rect width="680" height="360" fill="#f8fafc"/>
  <ellipse cx="340" cy="185" rx="95" ry="38" fill="none" stroke="#2563eb" stroke-width="3"/>
  <ellipse cx="340" cy="185" rx="160" ry="66" fill="none" stroke="#2563eb" stroke-width="3"/>
  <ellipse cx="340" cy="185" rx="225" ry="94" fill="none" stroke="#2563eb" stroke-width="3"/>
  <line x1="340" y1="300" x2="340" y2="70" stroke="#dc2626" stroke-width="8" marker-end="url(#wireArrow)"/>
  <text x="355" y="75" font-size="16" fill="#991b1b" font-family="Arial">current</text>
  <text x="420" y="312" font-size="16" fill="#1d4ed8" font-family="Arial">concentric field lines</text>
  <defs>
    <marker id="wireArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
</svg>`,
};

const solenoidFieldFigure: ItemFigure = {
  type: "svg",
  title: "Solenoid field pattern",
  description:
    "A current-carrying solenoid with nearly parallel field lines inside and bar-magnet-like field outside.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" aria-label="Magnetic field pattern of a solenoid">
  <rect width="760" height="360" fill="#f8fafc"/>
  <path d="M160 185 C170 110 205 110 215 185 C225 260 260 260 270 185 C280 110 315 110 325 185 C335 260 370 260 380 185 C390 110 425 110 435 185 C445 260 480 260 490 185 C500 110 535 110 545 185 C555 260 590 260 600 185" fill="none" stroke="#334155" stroke-width="4"/>
  <line x1="190" y1="185" x2="570" y2="185" stroke="#2563eb" stroke-width="4" marker-end="url(#solenoidArrow)"/>
  <line x1="190" y1="155" x2="570" y2="155" stroke="#2563eb" stroke-width="3" marker-end="url(#solenoidArrow)"/>
  <line x1="190" y1="215" x2="570" y2="215" stroke="#2563eb" stroke-width="3" marker-end="url(#solenoidArrow)"/>
  <path d="M600 185 C680 130 680 240 600 185" fill="none" stroke="#2563eb" stroke-width="3" marker-end="url(#solenoidArrow)"/>
  <path d="M160 185 C80 240 80 130 160 185" fill="none" stroke="#2563eb" stroke-width="3" marker-end="url(#solenoidArrow)"/>
  <text x="145" y="290" font-size="15" fill="#0f172a" font-family="Arial">coil turns</text>
  <defs>
    <marker id="solenoidArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
  </defs>
</svg>`,
};

const domesticCircuitFigure: ItemFigure = {
  type: "svg",
  title: "Domestic wiring safety layout",
  description:
    "A simplified domestic circuit showing live, neutral and earth paths with a fuse and switch in the live line.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 390" role="img" aria-label="Domestic circuit with live neutral earth fuse and switch">
  <rect width="760" height="390" fill="#f8fafc"/>
  <line x1="80" y1="95" x2="680" y2="95" stroke="#dc2626" stroke-width="5"/>
  <line x1="80" y1="180" x2="680" y2="180" stroke="#2563eb" stroke-width="5"/>
  <line x1="80" y1="265" x2="680" y2="265" stroke="#16a34a" stroke-width="5"/>
  <text x="88" y="78" font-size="16" fill="#991b1b" font-family="Arial">live</text>
  <text x="88" y="164" font-size="16" fill="#1d4ed8" font-family="Arial">neutral</text>
  <text x="88" y="249" font-size="16" fill="#166534" font-family="Arial">earth</text>
  <rect x="205" y="72" width="68" height="46" rx="4" fill="#fee2e2" stroke="#991b1b" stroke-width="3"/>
  <text x="239" y="101" text-anchor="middle" font-size="15" fill="#991b1b" font-family="Arial">fuse</text>
  <rect x="330" y="72" width="82" height="46" rx="4" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>
  <text x="371" y="101" text-anchor="middle" font-size="15" fill="#92400e" font-family="Arial">switch</text>
  <rect x="535" y="120" width="82" height="102" rx="10" fill="#e0f2fe" stroke="#0f172a" stroke-width="3"/>
  <circle cx="576" cy="152" r="16" fill="none" stroke="#0f172a" stroke-width="3"/>
  <line x1="576" y1="168" x2="576" y2="205" stroke="#0f172a" stroke-width="3"/>
  <text x="576" y="242" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">appliance</text>
  <line x1="535" y1="146" x2="470" y2="95" stroke="#dc2626" stroke-width="4"/>
  <line x1="535" y1="190" x2="470" y2="180" stroke="#2563eb" stroke-width="4"/>
  <line x1="576" y1="222" x2="576" y2="265" stroke="#16a34a" stroke-width="4"/>
  <line x1="558" y1="300" x2="594" y2="300" stroke="#166534" stroke-width="4"/>
  <line x1="565" y1="314" x2="587" y2="314" stroke="#166534" stroke-width="4"/>
  <line x1="572" y1="328" x2="580" y2="328" stroke="#166534" stroke-width="4"/>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Current, Potential Difference and Ohm's Law",
    subtopic:
      "Electric charge flow, current, potential difference, resistance and V-I graphs for ohmic conductors.",
    mc: [
      {
        questionLatex:
          "A charge of $24$ C passes through a wire in $6$ s. The current in the wire is",
        difficulty: 2,
        skillTags: ["current", "charge_time_relation"],
        choices: [
          wrong("$0.25$ A", "This divides time by charge; current is charge per unit time, not its reciprocal."),
          correct("$4$ A"),
          wrong("$18$ A", "This subtracts the values instead of using the rate relation $I=Q/t$."),
          wrong("$144$ A", "This multiplies charge and time, but current is found by division."),
        ],
        hints: [
          "Current is the rate of flow of charge.",
          "Use $I=Q/t$.",
          "Divide $24$ by $6$.",
        ],
        solution: [
          step(1, "Use the definition of current.", L`I=\frac Qt`),
          step(2, "Substitute $Q=24$ C and $t=6$ s.", L`I=\frac{24}{6}=4\text{ A}`),
        ],
      },
      {
        questionLatex:
          "When $30$ J of work is done to move $5$ C of charge between two points, the potential difference is",
        difficulty: 2,
        skillTags: ["potential_difference", "work_charge_relation"],
        choices: [
          wrong("$150$ V", "This multiplies work and charge; potential difference is work done per unit charge."),
          wrong("$25$ V", "This subtracts the values instead of applying the definition $V=W/Q$."),
          wrong("$0.17$ V", "This uses $Q/W$, the reciprocal of the required work-per-charge ratio."),
          correct("$6$ V"),
        ],
        hints: [
          "Potential difference is work done per unit charge.",
          "Use $V=W/Q$.",
          "Divide $30$ by $5$.",
        ],
        solution: [
          step(1, "Use the definition of potential difference.", L`V=\frac WQ`),
          step(2, "Substitute the values.", L`V=\frac{30}{5}=6\text{ V}`),
        ],
      },
      {
        questionLatex:
          "The V-I graph shown is for a resistor. Its resistance is",
        difficulty: 3,
        skillTags: ["ohms_law_graph", "resistance"],
        figure: ohmLawGraphFigure,
        choices: [
          wrong("$1/3\\ \\Omega$", "This uses $I/V$; resistance is $V/I$, the slope of the V-I graph."),
          wrong("$2\\ \\Omega$", "This does not match the $V/I$ ratio at any labelled point on the graph."),
          correct("$3\\ \\Omega$"),
          wrong("$6\\ \\Omega$", "At $I=2$ A, $V=6$ V, so the resistance is $6/2$, not the voltage value alone."),
        ],
        hints: [
          "For a V-I graph, resistance is $V/I$.",
          "Use any marked point on the straight line.",
          "For example, at $I=2$ A, $V=6$ V.",
        ],
        solution: [
          step(1, "For an ohmic resistor, use $R=V/I$.", L`R=\frac VI`),
          step(2, "Using the marked point $(2\\text{ A},6\\text{ V})$ gives $R=3\\ \\Omega$.", L`R=\frac62=3\ \Omega`),
        ],
      },
      {
        questionLatex:
          "For an ohmic conductor kept at constant temperature, if the potential difference is doubled, the current",
        difficulty: 2,
        skillTags: ["ohms_law", "proportional_reasoning"],
        choices: [
          correct("doubles"),
          wrong("becomes half", "That would happen if current were inversely proportional to voltage, but Ohm's law gives direct proportionality."),
          wrong("becomes zero", "A non-zero potential difference across an ohmic conductor produces current."),
          wrong("remains unchanged", "If resistance and temperature are constant, changing voltage changes current."),
        ],
        hints: [
          "Ohm's law is valid at constant temperature.",
          "$V=IR$ means $I=V/R$.",
          "If $R$ is constant, $I$ changes in the same ratio as $V$.",
        ],
        solution: [
          step(1, "Use Ohm's law.", L`V=IR`),
          step(2, "With $R$ constant, current is directly proportional to voltage.", L`I\propto V`),
          step(3, "Doubling $V$ doubles $I$."),
        ],
      },
      {
        questionLatex:
          "A resistor draws $0.40$ A from a $12$ V battery. Its resistance is",
        difficulty: 3,
        skillTags: ["ohms_law", "resistance_calculation"],
        choices: [
          wrong("$4.8\\ \\Omega$", "This multiplies voltage and current, which gives power, not resistance."),
          wrong("$12.4\\ \\Omega$", "Adding voltage and current has no physical meaning for resistance."),
          correct("$30\\ \\Omega$"),
          wrong("$0.033\\ \\Omega$", "This uses $I/V$, the reciprocal of resistance; Ohm's law gives $R=V/I$."),
        ],
        hints: [
          "Use Ohm's law.",
          "Resistance is $V/I$.",
          "Divide $12$ by $0.40$.",
        ],
        solution: [
          step(1, "Use $R=V/I$.", L`R=\frac VI`),
          step(2, "Substitute the readings.", L`R=\frac{12}{0.40}=30\ \Omega`),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Define one ampere of electric current.",
        difficulty: 1,
        skillTags: ["current_definition"],
        parts: [part("a", "Give the definition in terms of charge and time.", 1)],
        hints: [
          "Current is charge per unit time.",
          "Use the charge crossing a section in one second.",
          "$1$ A means $1$ C every second.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that one ampere is the current when one coulomb of charge flows per second."),
        ]),
        commonErrors: [
          "Defining ampere as one volt per second.",
          "Omitting the time interval.",
        ],
        workedSolution: [
          solutionPart("a", "One ampere is the current when $1$ C of charge flows through a cross-section in $1$ s.", L`1\text{ A}=1\text{ C s}^{-1}`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "State Ohm's law and describe the V-I graph expected for a metallic conductor at constant temperature.",
        difficulty: 3,
        skillTags: ["ohms_law", "graph_interpretation"],
        parts: [
          part("a", "State Ohm's law.", 1),
          part("b", "Describe the graph and what its slope represents.", 2),
        ],
        hints: [
          "Mention constant temperature.",
          "The graph is a straight line through the origin.",
          "For a V-I graph, slope gives resistance.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that current is directly proportional to potential difference at constant temperature."),
          criterion("b", 1, "Says the V-I graph is a straight line through the origin."),
          criterion("b", 1, "Links slope $V/I$ to resistance."),
        ]),
        commonErrors: [
          "Forgetting the constant-temperature condition.",
          "Calling the graph curved for an ohmic conductor.",
        ],
        workedSolution: [
          solutionPart("a", "At constant temperature, the current through a conductor is directly proportional to the potential difference across it.", L`V=IR`),
          solutionPart("b", "The V-I graph is a straight line through the origin. Its slope $V/I$ gives the resistance of the conductor.", L`R=\frac VI`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student records the following readings for a resistor: $V=2,4,6$ V and $I=0.4,0.8,1.2$ A respectively. Show whether the resistor obeys Ohm's law and find its resistance.",
        difficulty: 3,
        skillTags: ["ohms_law_data", "resistance"],
        parts: [
          part("a", "Calculate $V/I$ for the three readings.", 2),
          part("b", "State the conclusion and resistance.", 1),
        ],
        hints: [
          "For an ohmic resistor, $V/I$ remains constant.",
          "Find $2/0.4$, $4/0.8$ and $6/1.2$.",
          "The common value is the resistance.",
        ],
        rubric: rubric([
          criterion("a", 2, "Computes all three ratios as $5\\ \\Omega$."),
          criterion("b", 1, "Concludes that the resistor obeys Ohm's law and has resistance $5\\ \\Omega$."),
        ]),
        commonErrors: [
          "Using $I/V$ instead of $V/I$.",
          "Saying only that current increases without checking proportionality.",
        ],
        workedSolution: [
          solutionPart("a", "The ratios are constant: $2/0.4=5$, $4/0.8=5$, and $6/1.2=5$.", L`\frac VI=5\ \Omega`),
          solutionPart("b", "Since $V/I$ is constant, the resistor obeys Ohm's law. Its resistance is $5\\ \\Omega$.", L`R=5\ \Omega`),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "In an Ohm's law experiment, a group obtains these readings: $(V,I)=(1.5,0.30),(3.0,0.60),(4.5,0.90),(6.0,1.10)$ in SI units.",
        difficulty: 4,
        skillTags: ["ohms_law_case", "data_error"],
        parts: [
          part("a", "Find the resistance using the first three readings.", 2),
          part("b", "Identify the reading that does not fit the pattern.", 1),
          part("c", "Give one likely experimental reason for such a reading.", 1),
        ],
        hints: [
          "Check whether $V/I$ is constant.",
          "The first three readings give the same ratio.",
          "A loose connection or reading error can disturb one value.",
        ],
        rubric: rubric([
          criterion("a", 2, "Finds $R=5\\ \\Omega$ from the first three readings."),
          criterion("b", 1, "Identifies $(6.0,1.10)$ as inconsistent."),
          criterion("c", 1, "Gives a plausible experimental reason such as loose connection, heating, or parallax/readout error."),
        ]),
        commonErrors: [
          "Averaging all readings without checking the outlier.",
          "Calling the resistor non-ohmic from one suspicious reading.",
        ],
        workedSolution: [
          solutionPart("a", "For the first three readings, $V/I=1.5/0.30=3.0/0.60=4.5/0.90=5\\ \\Omega$.", L`R=5\ \Omega`),
          solutionPart("b", "For the last reading, $6.0/1.10\\approx5.45\\ \\Omega$, so it does not fit the earlier pattern."),
          solutionPart("c", "A loose connection, heating of the resistor, or reading error could make one observation depart from the straight-line pattern."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Design the circuit arrangement for verifying Ohm's law and explain how the resistance is obtained from readings.",
        difficulty: 4,
        skillTags: ["ohms_law_practical", "circuit_connections", "graph"],
        parts: [
          part("a", "State how the ammeter and voltmeter should be connected.", 2),
          part("b", "Explain how several readings are obtained safely.", 2),
          part("c", "Explain how resistance is found from a V-I graph.", 2),
        ],
        hints: [
          "Ammeter measures current through the resistor.",
          "Voltmeter measures potential difference across the resistor.",
          "The slope of the V-I graph is resistance.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that ammeter is connected in series."),
          criterion("a", 1, "States that voltmeter is connected in parallel across the resistor."),
          criterion("b", 1, "Mentions varying voltage/current using cells or a rheostat."),
          criterion("b", 1, "Mentions avoiding excessive current/heating or taking steady readings."),
          criterion("c", 2, "Explains plotting $V$ against $I$ and using slope $V/I$ as resistance."),
        ]),
        commonErrors: [
          "Connecting the voltmeter in series.",
          "Ignoring heating when large current flows.",
          "Using the reciprocal slope without noting the graph axes.",
        ],
        workedSolution: [
          solutionPart("a", "The ammeter is connected in series with the resistor, while the voltmeter is connected in parallel across it."),
          solutionPart("b", "Several readings are taken by changing the applied potential difference gradually and keeping the current small enough to avoid heating."),
          solutionPart("c", "Plot $V$ on the vertical axis and $I$ on the horizontal axis. The resistance is the slope of the straight line.", L`R=\frac{\Delta V}{\Delta I}`),
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Resistance, Resistivity and Resistor Combinations",
    subtopic:
      "Dependence of resistance on length and area, resistivity, series and parallel combinations.",
    mc: [
      {
        questionLatex:
          "A wire is replaced by another wire of the same material and same area of cross-section but twice the length. Its resistance becomes",
        difficulty: 2,
        skillTags: ["resistance_factors", "length"],
        choices: [
          correct("twice"),
          wrong("half", "Resistance is directly proportional to length when material and area are unchanged."),
          wrong("four times", "That would require the area to change as well; here only length is doubled."),
          wrong("unchanged", "The length has changed, and resistance depends on length."),
        ],
        hints: [
          "Use $R=\\rho L/A$.",
          "Material and area are unchanged.",
          "Resistance is directly proportional to length.",
        ],
        solution: [
          step(1, "Use the dependence of resistance on length.", L`R=\rho\frac LA`),
          step(2, "If $L$ is doubled while $A$ is unchanged, $R$ is doubled."),
        ],
      },
      {
        questionLatex:
          "A second wire of the same material has twice the length and twice the area of cross-section of a first wire. Compared with the first wire, the second wire has resistance",
        difficulty: 3,
        skillTags: ["resistance_factors", "resistivity"],
        choices: [
          wrong("twice as much", "This considers the doubled length but ignores the doubled area."),
          wrong("half as much", "This considers the doubled area but ignores the doubled length."),
          wrong("four times as much", "Both length and area changed; their effects cancel here."),
          correct("the same"),
        ],
        hints: [
          "Use $R=\\rho L/A$.",
          "The material is the same, so $\\rho$ is the same.",
          "Both numerator and denominator are doubled.",
        ],
        solution: [
          step(1, "Write resistance in terms of dimensions.", L`R=\rho\frac LA`),
          step(2, "For the second wire, $R'=\\rho(2L)/(2A)=R$.", L`R'=R`),
        ],
      },
      {
        questionLatex:
          "Two resistors of $6\\ \\Omega$ and $3\\ \\Omega$ are connected in parallel. Their equivalent resistance is",
        difficulty: 2,
        skillTags: ["parallel_resistors", "equivalent_resistance"],
        choices: [
          wrong("$9\\ \\Omega$", "This is the series value, not the parallel equivalent; parallel resistance must be below $3\\ \\Omega$."),
          wrong("$3\\ \\Omega$", "The equivalent resistance in parallel is less than the smallest branch resistance."),
          correct("$2\\ \\Omega$"),
          wrong("$18\\ \\Omega$", "This multiplies the resistances without dividing by their sum."),
        ],
        hints: [
          "For two resistors in parallel, use $R_p=R_1R_2/(R_1+R_2)$.",
          "The equivalent must be less than $3\\ \\Omega$.",
          "Compute $18/9$.",
        ],
        solution: [
          step(1, "Use the two-resistor parallel formula.", L`R_p=\frac{R_1R_2}{R_1+R_2}`),
          step(2, "Substitute $6\\ \\Omega$ and $3\\ \\Omega$.", L`R_p=\frac{6\times3}{6+3}=2\ \Omega`),
        ],
      },
      {
        questionLatex:
          "Resistors of $4\\ \\Omega$, $6\\ \\Omega$ and $10\\ \\Omega$ are connected in series. The equivalent resistance is",
        difficulty: 2,
        skillTags: ["series_resistors"],
        choices: [
          wrong("$2\\ \\Omega$", "That is smaller than every resistor, which cannot happen in series."),
          correct("$20\\ \\Omega$"),
          wrong("$10\\ \\Omega$", "This ignores two of the resistors; in series all three resistances must be added."),
          wrong("$24\\ \\Omega$", "This is not the sum of the given resistances; check $4+6+10$."),
        ],
        hints: [
          "In series, resistances add.",
          "Add all three values.",
          "$4+6+10=20$.",
        ],
        solution: [
          step(1, "For series combination, add the resistances.", L`R_s=R_1+R_2+R_3`),
          step(2, "So $R_s=4+6+10=20\\ \\Omega$.", L`R_s=20\ \Omega`),
        ],
      },
      {
        questionLatex:
          "A student wants an equivalent resistance of $4\\ \\Omega$ using only $6\\ \\Omega$ and $12\\ \\Omega$ resistors once each. The correct arrangement is",
        difficulty: 3,
        skillTags: ["parallel_resistors", "circuit_choice"],
        choices: [
          wrong("series connection", "Series connection gives $18\\ \\Omega$, not $4\\ \\Omega$; the required value is smaller than both resistors."),
          wrong("use only the $6\\ \\Omega$ resistor", "That gives $6\\ \\Omega$ and does not use both resistors."),
          wrong("use only the $12\\ \\Omega$ resistor", "That gives $12\\ \\Omega$ and does not use both resistors."),
          correct("parallel connection"),
        ],
        hints: [
          "Find series value first.",
          "For parallel, use product divided by sum.",
          "$6$ and $12$ in parallel give $72/18$.",
        ],
        solution: [
          step(1, "Series gives $6+12=18\\ \\Omega$, so not correct."),
          step(2, "Parallel gives $R=72/18=4\\ \\Omega$.", L`R_p=\frac{6\times12}{6+12}=4\ \Omega`),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write the SI unit of resistivity.",
        difficulty: 1,
        skillTags: ["resistivity_unit"],
        parts: [part("a", "Name the unit.", 1)],
        hints: [
          "Use the formula $R=\\rho L/A$.",
          "The symbol is often written using ohm and metre.",
          "It is not simply ohm.",
        ],
        rubric: rubric([
          criterion("a", 1, "States ohm metre or $\\Omega\\,\\text{m}$."),
        ]),
        commonErrors: [
          "Writing ohm, which is the unit of resistance.",
          "Writing metre per ohm.",
        ],
        workedSolution: [
          solutionPart("a", "The SI unit of resistivity is ohm metre.", L`\Omega\,\text{m}`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Wire A and wire B are made of the same material. Wire A has twice the length and half the area of cross-section of wire B. Compare their resistances.",
        difficulty: 3,
        skillTags: ["resistance_factors", "comparison"],
        parts: [
          part("a", "Write the proportionality used.", 1),
          part("b", "Find $R_A/R_B$.", 2),
        ],
        hints: [
          "Same material means same resistivity.",
          "Resistance is proportional to length and inversely proportional to area.",
          "Both changes make wire A more resistive.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $R\\propto L/A$ for the same material."),
          criterion("b", 2, "Finds $R_A=4R_B$."),
        ]),
        commonErrors: [
          "Ignoring the area change.",
          "Thinking half area halves the resistance.",
        ],
        workedSolution: [
          solutionPart("a", "For the same material, $R\\propto L/A$.", L`R\propto\frac LA`),
          solutionPart("b", "For A, the length factor is $2$ and the area factor is $1/(1/2)=2$, so $R_A=4R_B$.", L`\frac{R_A}{R_B}=2\times2=4`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Find the equivalent resistance of $2\\ \\Omega$, $3\\ \\Omega$ and $6\\ \\Omega$ connected in parallel.",
        difficulty: 3,
        skillTags: ["parallel_resistors"],
        parts: [
          part("a", "Write the reciprocal relation.", 1),
          part("b", "Calculate the equivalent resistance.", 2),
        ],
        hints: [
          "In parallel, reciprocals add.",
          "Use $1/2+1/3+1/6$.",
          "The sum of reciprocals is $1$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes the reciprocal formula for parallel resistors."),
          criterion("b", 2, "Finds equivalent resistance $1\\ \\Omega$."),
        ]),
        commonErrors: [
          "Adding the resistances directly.",
          "Forgetting to invert the final reciprocal.",
        ],
        workedSolution: [
          solutionPart("a", "For parallel resistors, $\\frac1R=\\frac1{R_1}+\\frac1{R_2}+\\frac1{R_3}$.", L`\frac1R=\frac12+\frac13+\frac16`),
          solutionPart("b", "The sum is $1$, so the equivalent resistance is $1\\ \\Omega$.", L`R=1\ \Omega`),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A circuit uses a $4\\ \\Omega$ resistor in series with a parallel combination of $6\\ \\Omega$ and $3\\ \\Omega$, connected to a $12$ V source.",
        difficulty: 4,
        skillTags: ["mixed_resistor_network", "current_voltage"],
        figure: resistorNetworkFigure,
        parts: [
          part("a", "Find the equivalent resistance of the parallel part.", 1),
          part("b", "Find the total resistance and total current.", 2),
          part("c", "Find the potential difference across the $4\\ \\Omega$ resistor.", 1),
        ],
        hints: [
          "$6\\ \\Omega$ and $3\\ \\Omega$ are in parallel.",
          "The parallel equivalent is in series with $4\\ \\Omega$.",
          "Use $V=IR$ for the $4\\ \\Omega$ resistor.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds parallel equivalent $2\\ \\Omega$."),
          criterion("b", 1, "Finds total resistance $6\\ \\Omega$."),
          criterion("b", 1, "Finds total current $2$ A."),
          criterion("c", 1, "Finds voltage across $4\\ \\Omega$ as $8$ V."),
        ]),
        commonErrors: [
          "Adding all three resistors directly.",
          "Using branch current as the total current without finding the equivalent resistance.",
        ],
        workedSolution: [
          solutionPart("a", "$6\\ \\Omega$ and $3\\ \\Omega$ in parallel give $2\\ \\Omega$.", L`R_p=\frac{6\times3}{6+3}=2\ \Omega`),
          solutionPart("b", "Total resistance is $4+2=6\\ \\Omega$, so total current is $12/6=2$ A.", L`I=\frac{12}{6}=2\text{ A}`),
          solutionPart("c", "The $4\\ \\Omega$ resistor carries the total current, so $V=IR=2\\times4=8$ V.", L`V=8\text{ V}`),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A student says, 'Parallel connection is always used in household wiring only because it reduces the total resistance.' Evaluate the statement.",
        difficulty: 4,
        skillTags: ["parallel_connection", "household_circuits", "reasoning"],
        parts: [
          part("a", "State whether the statement is complete.", 1),
          part("b", "Give two important reasons for parallel household wiring.", 3),
          part("c", "Mention one possible disadvantage of adding too many appliances.", 1),
        ],
        hints: [
          "Think about voltage across each appliance.",
          "Think about independent switching.",
          "Too many branches can draw too much current.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the statement is incomplete."),
          criterion("b", 1, "Mentions each appliance gets the full mains voltage."),
          criterion("b", 1, "Mentions independent operation/switching."),
          criterion("b", 1, "Mentions that a fault in one branch need not stop all appliances."),
          criterion("c", 1, "Mentions overloading or excessive current if too many appliances are connected."),
        ]),
        commonErrors: [
          "Saying household appliances are connected in series.",
          "Ignoring safety and current rating.",
        ],
        workedSolution: [
          solutionPart("a", "The statement is incomplete. Reduced equivalent resistance is not the main practical reason."),
          solutionPart("b", "Parallel wiring gives each appliance the full supply voltage and allows appliances to be switched independently. A fault in one branch also need not stop all branches."),
          solutionPart("c", "If too many appliances are connected, the total current may become too high, causing overloading."),
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Heating Effect and Electric Power",
    subtopic:
      "Joule heating, power, commercial unit of energy, fuse action and appliance ratings.",
    mc: [
      {
        questionLatex:
          "A current of $2$ A flows through a $5\\ \\Omega$ resistor for $10$ s. The heat produced is",
        difficulty: 2,
        skillTags: ["joule_heating"],
        choices: [
          wrong("$50$ J", "This omits the square on current in $H=I^2Rt$, so it underestimates the heating."),
          wrong("$100$ J", "This uses only $IRt$ or misses one factor of current in Joule's law."),
          correct("$200$ J"),
          wrong("$400$ J", "This doubles the correct heat; check the substitution in $I^2Rt$."),
        ],
        hints: [
          "Use Joule's law of heating.",
          "$H=I^2Rt$.",
          "$2^2\\times5\\times10=200$.",
        ],
        solution: [
          step(1, "Use Joule's law.", L`H=I^2Rt`),
          step(2, "Substitute the values.", L`H=2^2\times5\times10=200\text{ J}`),
        ],
      },
      {
        questionLatex:
          "An electric heater connected to $220$ V draws $5$ A. Its power is",
        difficulty: 2,
        skillTags: ["electric_power"],
        choices: [
          correct("$1100$ W"),
          wrong("$44$ W", "This divides voltage by current, giving resistance, not power."),
          wrong("$225$ W", "Adding voltage and current does not give electrical power."),
          wrong("$0.023$ W", "This uses a reciprocal ratio, but electrical power from voltage and current is $P=VI$."),
        ],
        hints: [
          "Power in an electrical device can be found from voltage and current.",
          "Use $P=VI$.",
          "Multiply $220$ by $5$.",
        ],
        solution: [
          step(1, "Use electric power formula.", L`P=VI`),
          step(2, "Substitute the values.", L`P=220\times5=1100\text{ W}`),
        ],
      },
      {
        questionLatex:
          "A $60$ W bulb is used for $5$ hours. The electrical energy consumed is",
        difficulty: 3,
        skillTags: ["electrical_energy", "commercial_unit"],
        choices: [
          wrong("$300$ kWh", "This forgets to convert watts into kilowatts before multiplying by hours."),
          wrong("$12$ kWh", "This divides time by power and uses the wrong unit relation."),
          wrong("$0.012$ kWh", "This divides by too large a factor; $60$ W is $0.06$ kW."),
          correct("$0.30$ kWh"),
        ],
        hints: [
          "Convert watts to kilowatts.",
          "$60$ W is $0.06$ kW.",
          "Energy in kWh is power in kW times time in hours.",
        ],
        solution: [
          step(1, "Convert power to kilowatts.", L`60\text{ W}=0.06\text{ kW}`),
          step(2, "Multiply by time.", L`E=0.06\times5=0.30\text{ kWh}`),
        ],
      },
      {
        questionLatex:
          "A fuse wire used in a household circuit should have",
        difficulty: 2,
        skillTags: ["fuse", "safety"],
        choices: [
          wrong("very high melting point and very high current rating", "Such a fuse may not melt during an unsafe current, so it would fail to protect the circuit."),
          correct("low melting point and suitable current rating"),
          wrong("zero resistance and no current rating", "A fuse must heat and melt when current exceeds the safe limit."),
          wrong("very thick wire for every circuit", "A thicker wire may allow excessive current before melting."),
        ],
        hints: [
          "A fuse protects by melting.",
          "It should melt before the appliance wiring overheats.",
          "Its rating must match the safe current of the circuit.",
        ],
        solution: [
          step(1, "A fuse works by heating and melting when current exceeds the safe value."),
          step(2, "So it must have a low melting point and a suitable current rating for the circuit."),
        ],
      },
      {
        questionLatex:
          "Two identical resistors are connected first in series and then in parallel across the same battery. The heat produced in the parallel combination in the same time is",
        difficulty: 4,
        skillTags: ["joule_heating", "series_parallel_power"],
        choices: [
          wrong("one-fourth of the series value", "This reverses the comparison; parallel draws more current from the same battery."),
          wrong("equal to the series value", "The equivalent resistance is different, so the power is not equal."),
          correct("four times the series value"),
          wrong("twice the series value", "For two identical resistors, the resistance changes by a factor of $4$ between series and parallel."),
        ],
        hints: [
          "For a fixed battery voltage, use $P=V^2/R_{eq}$.",
          "For two equal resistors, series equivalent is $2R$.",
          "Parallel equivalent is $R/2$.",
        ],
        solution: [
          step(1, "For two equal resistors, $R_s=2R$ and $R_p=R/2$."),
          step(2, "At the same voltage, heat in the same time is proportional to power $V^2/R_{eq}$.", L`H\propto\frac1{R_{eq}}`),
          step(3, "Therefore $H_p/H_s=(2R)/(R/2)=4$.", L`\frac{H_p}{H_s}=4`),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the commercial unit of electrical energy.",
        difficulty: 1,
        skillTags: ["commercial_unit_energy"],
        parts: [part("a", "Write the unit name.", 1)],
        hints: [
          "Electricity bills usually use this unit.",
          "It combines kilowatt and hour.",
          "It is also called one unit of electricity.",
        ],
        rubric: rubric([
          criterion("a", 1, "States kilowatt-hour or kWh."),
        ]),
        commonErrors: [
          "Writing watt, which is a unit of power.",
          "Writing volt, which is potential difference.",
        ],
        workedSolution: [
          solutionPart("a", "The commercial unit of electrical energy is kilowatt-hour.", L`\text{kWh}`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A current of $0.5$ A flows through a $20\\ \\Omega$ resistor for $60$ s. Calculate the heat produced.",
        difficulty: 3,
        skillTags: ["joule_heating"],
        parts: [
          part("a", "Write the formula used.", 1),
          part("b", "Calculate the heat.", 2),
        ],
        hints: [
          "Use Joule's law of heating.",
          "Remember the current is squared.",
          "$0.5^2=0.25$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $H=I^2Rt$."),
          criterion("b", 2, "Calculates $H=300$ J."),
        ]),
        commonErrors: [
          "Forgetting to square current.",
          "Using time in minutes without converting to seconds.",
        ],
        workedSolution: [
          solutionPart("a", "Joule's law of heating is $H=I^2Rt$.", L`H=I^2Rt`),
          solutionPart("b", "Substitute $I=0.5$ A, $R=20\\ \\Omega$ and $t=60$ s.", L`H=(0.5)^2\times20\times60=300\text{ J}`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "An appliance is rated $1000$ W, $250$ V. Find the current it draws and its resistance when used at the rated voltage.",
        difficulty: 3,
        skillTags: ["power_rating", "resistance"],
        parts: [
          part("a", "Find the current.", 1),
          part("b", "Find the resistance.", 2),
        ],
        hints: [
          "Use $P=VI$ for current.",
          "Then use $R=V/I$ or $R=V^2/P$.",
          "$250/4=62.5$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds current $4$ A."),
          criterion("b", 2, "Finds resistance $62.5\\ \\Omega$."),
        ]),
        commonErrors: [
          "Using $P/V$ as resistance.",
          "Not distinguishing watt from volt.",
        ],
        workedSolution: [
          solutionPart("a", "From $P=VI$, $I=P/V=1000/250=4$ A.", L`I=4\text{ A}`),
          solutionPart("b", "Resistance is $R=V/I=250/4=62.5\\ \\Omega$.", L`R=62.5\ \Omega`),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A room uses two $40$ W lamps for $5$ h, one $80$ W fan for $5$ h and a $1.0$ kW heater for $1$ h in a day. Electricity costs Rs $6$ per kWh.",
        difficulty: 4,
        skillTags: ["energy_bill", "power_time"],
        parts: [
          part("a", "Find the energy used by the two lamps.", 1),
          part("b", "Find the total energy used in the day.", 2),
          part("c", "Find the cost for the day.", 1),
        ],
        hints: [
          "Convert watts to kilowatts.",
          "Energy in kWh is power in kW times hours.",
          "Cost is energy times rate.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds lamp energy $0.40$ kWh."),
          criterion("b", 2, "Finds total energy $1.80$ kWh."),
          criterion("c", 1, "Finds cost Rs $10.80$."),
        ]),
        commonErrors: [
          "Forgetting that there are two lamps.",
          "Adding watt ratings without multiplying by time.",
        ],
        workedSolution: [
          solutionPart("a", "Two lamps use $2\\times40\\text{ W}=80\\text{ W}=0.08\\text{ kW}$, so energy is $0.08\\times5=0.40$ kWh.", L`E_{\text{lamps}}=0.40\text{ kWh}`),
          solutionPart("b", "Fan energy is $0.08\\times5=0.40$ kWh and heater energy is $1.0\\times1=1.0$ kWh. Total is $0.40+0.40+1.0=1.80$ kWh.", L`E=1.80\text{ kWh}`),
          solutionPart("c", "Cost is $1.80\\times6=10.80$ rupees.", L`\text{cost}=\text{Rs }10.80`),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Two resistors of $3\\ \\Omega$ and $6\\ \\Omega$ are connected in series with a battery so that the current is $2$ A for $5$ min.",
        difficulty: 4,
        skillTags: ["joule_heating", "series_circuit"],
        parts: [
          part("a", "Find the heat produced in each resistor.", 3),
          part("b", "Find the total heat produced.", 1),
          part("c", "Explain why one resistor produces more heat.", 1),
        ],
        hints: [
          "In series, the same current flows through both resistors.",
          "Convert $5$ min to seconds.",
          "Use $H=I^2Rt$ for each resistor.",
        ],
        rubric: rubric([
          criterion("a", 1, "Converts time to $300$ s."),
          criterion("a", 1, "Finds heat in $3\\ \\Omega$ resistor as $3600$ J."),
          criterion("a", 1, "Finds heat in $6\\ \\Omega$ resistor as $7200$ J."),
          criterion("b", 1, "Finds total heat $10800$ J."),
          criterion("c", 1, "Explains that with the same current and time, heat is proportional to resistance."),
        ]),
        commonErrors: [
          "Using different currents in series resistors.",
          "Keeping time as $5$ instead of $300$ s.",
        ],
        workedSolution: [
          solutionPart("a", "Time is $5\\times60=300$ s. For $3\\ \\Omega$, $H=2^2\\times3\\times300=3600$ J. For $6\\ \\Omega$, $H=2^2\\times6\\times300=7200$ J.", L`H_3=3600\text{ J},\quad H_6=7200\text{ J}`),
          solutionPart("b", "Total heat is $3600+7200=10800$ J.", L`H_{\text{total}}=10800\text{ J}`),
          solutionPart("c", "The same current flows through series resistors, so for the same time $H\\propto R$. The $6\\ \\Omega$ resistor produces more heat."),
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Magnetic Effects of Electric Current",
    subtopic:
      "Magnetic field lines, fields due to conductors and solenoids, and force on a current-carrying conductor.",
    mc: [
      {
        questionLatex:
          "Magnetic field lines around a straight current-carrying conductor are",
        difficulty: 2,
        skillTags: ["magnetic_field_straight_wire"],
        choices: [
          wrong("straight lines parallel to the conductor", "That is not the field pattern around a straight current-carrying wire."),
          wrong("straight lines perpendicular to the conductor", "The field direction changes around the wire, so the lines are not straight."),
          wrong("radial lines going away from the conductor", "Radial lines would suggest source-like behaviour, not the field around a current."),
          correct("concentric circles centred on the conductor"),
        ],
        hints: [
          "Recall the field pattern observed with iron filings or compasses.",
          "Use the right-hand thumb rule.",
          "The field circles the wire.",
        ],
        solution: [
          step(1, "A current in a straight conductor produces circular magnetic field lines around it."),
          step(2, "The direction is found using the right-hand thumb rule."),
        ],
      },
      {
        questionLatex:
          "If the current in a straight conductor is reversed, the magnetic field direction around it",
        difficulty: 2,
        skillTags: ["right_hand_thumb_rule"],
        choices: [
          wrong("becomes zero immediately", "Reversing current changes direction; it does not remove the current."),
          correct("reverses"),
          wrong("remains unchanged", "The field direction depends on the direction of current."),
          wrong("becomes parallel to the wire", "The field lines remain circular around the wire; only their direction reverses."),
        ],
        hints: [
          "Use the right-hand thumb rule.",
          "The thumb points in the direction of current.",
          "Changing thumb direction changes the curl of the fingers.",
        ],
        solution: [
          step(1, "The magnetic field direction follows the current direction by the right-hand thumb rule."),
          step(2, "When current is reversed, the field direction is also reversed."),
        ],
      },
      {
        questionLatex:
          "Inside a long current-carrying solenoid, the magnetic field is nearly",
        difficulty: 2,
        skillTags: ["solenoid_field"],
        choices: [
          correct("uniform and along the axis"),
          wrong("zero everywhere", "A current-carrying solenoid produces a magnetic field inside it."),
          wrong("radial and outward", "The field inside a solenoid is mainly axial, not radial."),
          wrong("random and changing direction at every point", "The closely spaced turns produce a nearly uniform pattern inside."),
        ],
        hints: [
          "Compare a solenoid with a bar magnet.",
          "Look at the field lines inside the coil.",
          "Parallel, equally spaced lines indicate uniform field.",
        ],
        solution: [
          step(1, "The field lines inside a long solenoid are nearly parallel and equally spaced."),
          step(2, "So the field is nearly uniform and directed along the axis."),
        ],
      },
      {
        questionLatex:
          "The force on a current-carrying conductor placed in a magnetic field is maximum when the conductor is",
        difficulty: 3,
        skillTags: ["magnetic_force", "field_current_angle"],
        choices: [
          wrong("parallel to the magnetic field", "A conductor parallel to the field experiences no magnetic force."),
          wrong("outside the magnetic field", "There is no magnetic force if the conductor is not in the field region."),
          correct("perpendicular to the magnetic field"),
          wrong("made of an insulating material", "The effect is for a current-carrying conductor, so an insulator is not the required condition."),
        ],
        hints: [
          "The force depends on the angle between current and magnetic field.",
          "It is zero when current is parallel to field.",
          "It is maximum at $90^\\circ$.",
        ],
        solution: [
          step(1, "Magnetic force on a current-carrying conductor depends on the angle between current and field."),
          step(2, "The force is maximum when the conductor is perpendicular to the magnetic field."),
        ],
      },
      {
        questionLatex:
          "In Fleming's left-hand rule, the thumb gives the direction of",
        difficulty: 2,
        skillTags: ["fleming_left_hand_rule"],
        choices: [
          correct("force or motion of the conductor"),
          wrong("magnetic field", "The forefinger represents the magnetic field direction."),
          wrong("current", "The middle finger represents current direction; the thumb is reserved for force or motion."),
          wrong("resistance", "The rule relates field, current and force, not resistance."),
        ],
        hints: [
          "The three mutually perpendicular fingers represent three directions.",
          "Forefinger is field.",
          "Middle finger is current.",
        ],
        solution: [
          step(1, "In Fleming's left-hand rule, forefinger represents field and middle finger represents current."),
          step(2, "The thumb gives the force or motion direction."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the rule used to find the direction of magnetic field around a straight current-carrying conductor.",
        difficulty: 1,
        skillTags: ["right_hand_thumb_rule"],
        parts: [part("a", "Name the rule.", 1)],
        hints: [
          "The thumb is aligned with current.",
          "The curled fingers show field direction.",
          "It is a right-hand rule.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names the right-hand thumb rule."),
        ]),
        commonErrors: [
          "Writing Fleming's left-hand rule, which gives force direction.",
          "Writing Ohm's law.",
        ],
        workedSolution: [
          solutionPart("a", "The rule is the right-hand thumb rule."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The figure shows magnetic field lines around a straight current-carrying conductor. Explain how the direction of the field is determined and what happens when current is increased.",
        difficulty: 3,
        skillTags: ["magnetic_field_straight_wire", "current_effect"],
        figure: straightWireFieldFigure,
        parts: [
          part("a", "State the rule for direction.", 1),
          part("b", "Explain the effect of increasing current on field strength.", 2),
        ],
        hints: [
          "Use the right-hand thumb rule.",
          "Thumb points along current.",
          "Larger current gives stronger magnetic field.",
        ],
        rubric: rubric([
          criterion("a", 1, "States the right-hand thumb rule correctly."),
          criterion("b", 1, "Says increasing current increases magnetic field strength."),
          criterion("b", 1, "Links stronger field to closer/more effective field pattern near the conductor."),
        ]),
        commonErrors: [
          "Using Fleming's left-hand rule for field direction.",
          "Saying field strength is independent of current.",
        ],
        workedSolution: [
          solutionPart("a", "Point the right-hand thumb in the direction of current; the curled fingers give the magnetic field direction."),
          solutionPart("b", "When current is increased, the magnetic field becomes stronger around the conductor."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why a current-carrying solenoid behaves like a bar magnet.",
        difficulty: 3,
        skillTags: ["solenoid", "magnetic_field_lines"],
        figure: solenoidFieldFigure,
        parts: [
          part("a", "Describe the field inside a solenoid.", 1),
          part("b", "Explain the similarity with a bar magnet.", 2),
        ],
        hints: [
          "Inside the solenoid, field lines are nearly parallel.",
          "The outside pattern resembles that around a bar magnet.",
          "The solenoid has two magnetic poles.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the field inside a solenoid is nearly uniform along its axis."),
          criterion("b", 1, "Mentions two poles at the ends."),
          criterion("b", 1, "Mentions field-line pattern similar to a bar magnet."),
        ]),
        commonErrors: [
          "Saying only permanent magnets have field lines.",
          "Calling the field inside a solenoid circular like a straight wire.",
        ],
        workedSolution: [
          solutionPart("a", "Inside a long solenoid, the magnetic field is nearly uniform and directed along the axis."),
          solutionPart("b", "The field outside and the two ends resemble the pattern of a bar magnet, so a current-carrying solenoid behaves like a magnet with north and south poles."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A straight conductor is placed east-west in a magnetic field directed towards north. Current flows from west to east.",
        difficulty: 4,
        skillTags: ["fleming_left_hand_rule", "magnetic_force_case"],
        parts: [
          part("a", "Use Fleming's left-hand rule to state the force direction.", 1),
          part("b", "State what happens to the force direction if the current is reversed.", 1),
          part("c", "State the conductor orientation for which the force would be zero.", 2),
        ],
        hints: [
          "Take current east and field north.",
          "The three directions in Fleming's rule are mutually perpendicular.",
          "Force is zero when current is parallel to the field.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the force is vertically upward."),
          criterion("b", 1, "States that force reverses, becoming downward."),
          criterion("c", 2, "Explains that force is zero when the conductor/current is parallel to the magnetic field."),
        ]),
        commonErrors: [
          "Using right-hand thumb rule instead of Fleming's left-hand rule.",
          "Saying reversing current does not change force direction.",
          "Saying maximum force occurs when current is parallel to field.",
        ],
        workedSolution: [
          solutionPart("a", "With current east and magnetic field north, Fleming's left-hand rule gives force vertically upward."),
          solutionPart("b", "Reversing the current reverses the force direction, so the force becomes vertically downward."),
          solutionPart("c", "The force is zero when the current direction is parallel to the magnetic field, because the conductor is then not cutting across the field direction."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Compare the magnetic field patterns due to a straight current-carrying conductor, a circular loop and a solenoid.",
        difficulty: 4,
        skillTags: ["magnetic_field_comparison"],
        parts: [
          part("a", "Describe the field around a straight conductor.", 1),
          part("b", "Describe how the field near a circular loop differs.", 2),
          part("c", "Describe the field inside a solenoid and how it can be strengthened.", 2),
        ],
        hints: [
          "For a straight conductor, the field lines are circular.",
          "At the centre of a circular loop, field lines are nearly straight and perpendicular to the plane.",
          "A solenoid strengthens the field by using many turns and larger current.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that field lines around a straight conductor are concentric circles."),
          criterion("b", 1, "Describes the circular-loop field as stronger near the centre/axis."),
          criterion("b", 1, "States that field at the centre is nearly along the axis of the loop."),
          criterion("c", 1, "States that the solenoid has a nearly uniform field inside."),
          criterion("c", 1, "Mentions strengthening by increasing current, number of turns, or inserting a soft iron core."),
        ]),
        commonErrors: [
          "Using the same field pattern for all three cases.",
          "Saying a solenoid has no field outside.",
        ],
        workedSolution: [
          solutionPart("a", "Around a straight current-carrying conductor, magnetic field lines are concentric circles."),
          solutionPart("b", "For a circular loop, the field lines combine so that the field near the centre is stronger and nearly along the axis of the loop."),
          solutionPart("c", "Inside a solenoid, the field is nearly uniform and along its axis. It can be strengthened by increasing current, increasing turns per unit length, or using a soft iron core."),
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "AC, DC and Domestic Electric Circuits",
    subtopic:
      "Direct and alternating current, household supply, live-neutral-earth wiring, fuse action and circuit safety.",
    mc: [
      {
        questionLatex:
          "The frequency of domestic alternating current supply in India is",
        difficulty: 1,
        skillTags: ["ac_frequency"],
        choices: [
          wrong("$5$ Hz", "This is too low for the standard domestic AC supply used in India."),
          correct("$50$ Hz"),
          wrong("$100$ Hz", "This is twice the standard Indian domestic supply frequency."),
          wrong("$220$ Hz", "$220$ is commonly the supply voltage value, not frequency."),
        ],
        hints: [
          "Recall the standard Indian mains supply.",
          "The voltage is about $220$ V.",
          "The frequency is $50$ cycles per second.",
        ],
        solution: [
          step(1, "Domestic AC supply in India has frequency $50$ Hz."),
        ],
      },
      {
        questionLatex:
          "In a domestic circuit, the fuse should be connected in the",
        difficulty: 2,
        skillTags: ["domestic_circuit", "fuse"],
        choices: [
          wrong("neutral wire only after the appliance", "A fuse in neutral may leave the appliance connected to the live wire even after melting."),
          wrong("earth wire", "The earth wire is a safety path and is not where the fuse should be placed."),
          correct("live wire before the appliance"),
          wrong("insulation outside the cable", "The fuse must be part of the conducting path to interrupt unsafe current."),
        ],
        hints: [
          "The fuse must disconnect the appliance from high potential.",
          "The live wire is at high potential.",
          "The fuse should be in series with the live wire.",
        ],
        solution: [
          step(1, "The fuse is connected in series with the live wire."),
          step(2, "When excessive current flows, it melts and disconnects the appliance from the live supply."),
        ],
      },
      {
        questionLatex:
          "Earthing of a metal-bodied appliance protects the user mainly because it",
        difficulty: 2,
        skillTags: ["earthing", "electrical_safety"],
        choices: [
          wrong("increases the resistance of the live wire", "Earthing does not work by increasing live-wire resistance."),
          wrong("reduces the mains voltage for the appliance", "The appliance still receives the normal supply voltage."),
          wrong("stores excess charge permanently in the appliance body", "The point is to provide a path away from the metal body, not store charge."),
          correct("provides a low-resistance path for fault current to the ground"),
        ],
        hints: [
          "Think about a fault that connects live wire to the metal body.",
          "The earth wire should carry current away safely.",
          "A large fault current can also melt the fuse.",
        ],
        solution: [
          step(1, "Earthing connects the metal body to the ground through a low-resistance path."),
          step(2, "If the live wire touches the body, fault current flows to earth and helps operate the fuse/MCB, reducing shock risk."),
        ],
      },
      {
        questionLatex:
          "Household appliances are connected in parallel mainly so that",
        difficulty: 3,
        skillTags: ["parallel_household_wiring"],
        choices: [
          correct("each appliance gets the same mains voltage and works independently"),
          wrong("the same current must flow through every appliance", "Same current is a feature of series circuits, not household parallel wiring."),
          wrong("switching off one appliance switches off all others", "Household wiring is chosen to avoid this series-circuit problem."),
          wrong("the total current is always zero", "Parallel branches draw current according to appliance resistance and power."),
        ],
        hints: [
          "Think about independent switches.",
          "Each appliance is rated for the mains voltage.",
          "Parallel branches share the same potential difference.",
        ],
        solution: [
          step(1, "In parallel, each branch gets the same supply voltage."),
          step(2, "Each appliance can therefore be switched independently without stopping the others."),
        ],
      },
      {
        questionLatex:
          "One advantage of AC over DC for large-scale power transmission is that AC",
        difficulty: 3,
        skillTags: ["ac_dc", "power_transmission"],
        choices: [
          wrong("cannot produce heating in wires", "AC also produces heating; transmission aims to reduce losses, not remove heating completely."),
          correct("can be transmitted over long distances with comparatively less energy loss"),
          wrong("has no direction of current at any instant", "AC has a direction at an instant, but it reverses periodically."),
          wrong("does not require insulation", "High-voltage AC requires careful insulation and safety precautions."),
        ],
        hints: [
          "Recall the NCERT advantage stated for AC supply.",
          "The comparison is about large-scale transmission.",
          "AC is preferred because energy loss during long-distance transmission can be reduced.",
        ],
        solution: [
          step(1, "An important advantage of AC over DC is that electric power can be transmitted over long distances with comparatively less energy loss."),
          step(2, "That is why AC is generally used for large-scale distribution of electric power."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the wire in a domestic circuit that is at high potential.",
        difficulty: 1,
        skillTags: ["domestic_wiring"],
        parts: [part("a", "Write the wire name.", 1)],
        hints: [
          "Domestic wiring has live, neutral and earth wires.",
          "Neutral is close to zero potential.",
          "The high-potential wire is live.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names the live wire."),
        ]),
        commonErrors: [
          "Writing earth wire.",
          "Writing neutral wire.",
        ],
        workedSolution: [
          solutionPart("a", "The live wire is at high potential in a domestic circuit."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why a switch and fuse are connected in the live wire rather than the neutral wire.",
        difficulty: 3,
        skillTags: ["domestic_safety", "fuse_switch"],
        parts: [
          part("a", "Explain the role of the live wire.", 1),
          part("b", "Explain the safety reason for putting switch and fuse in it.", 2),
        ],
        hints: [
          "The live wire is at high potential.",
          "The switch should disconnect the appliance from live supply.",
          "A fuse should break the live connection during excess current.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that live wire is at high potential."),
          criterion("b", 1, "Explains that switching/fusing live disconnects the appliance from high potential."),
          criterion("b", 1, "Explains the shock risk if only neutral is broken."),
        ]),
        commonErrors: [
          "Saying fuse can be placed anywhere with equal safety.",
          "Confusing neutral and earth wires.",
        ],
        workedSolution: [
          solutionPart("a", "The live wire is at high potential relative to earth and neutral."),
          solutionPart("b", "Putting the switch and fuse in the live wire disconnects the appliance from the high-potential supply. If only neutral were broken, parts of the appliance could still remain live and dangerous."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Distinguish between overloading and short circuiting in a domestic circuit.",
        difficulty: 3,
        skillTags: ["overloading", "short_circuit"],
        parts: [
          part("a", "Explain overloading.", 1),
          part("b", "Explain short circuiting.", 1),
          part("c", "State one protective device used.", 1),
        ],
        hints: [
          "Overloading is connected with too much current demand.",
          "Short circuiting often occurs when live and neutral wires touch.",
          "Fuse or MCB protects the circuit.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains overloading as excessive current due to too many/high-power appliances or current beyond rating."),
          criterion("b", 1, "Explains short circuiting as direct contact between live and neutral leading to very large current."),
          criterion("c", 1, "Names fuse or MCB."),
        ]),
        commonErrors: [
          "Using overloading and short circuiting as identical terms.",
          "Saying earthing alone replaces the need for a fuse/MCB.",
        ],
        workedSolution: [
          solutionPart("a", "Overloading occurs when a circuit draws more current than its safe rating, often because too many appliances are used together."),
          solutionPart("b", "Short circuiting occurs when live and neutral wires come into direct contact, making resistance very small and current very large."),
          solutionPart("c", "A fuse or MCB is used to break the circuit during unsafe current."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student wants to use a $2.0$ kW electric heater on a $220$ V supply through a $5$ A socket.",
        difficulty: 4,
        skillTags: ["domestic_safety_case", "power_current"],
        parts: [
          part("a", "Calculate the current drawn by the heater.", 1),
          part("b", "Decide whether a $5$ A socket is safe for it.", 1),
          part("c", "State the safer rating of socket/fuse and explain why.", 2),
        ],
        hints: [
          "Use $P=VI$.",
          "$2.0$ kW is $2000$ W.",
          "Compare the current with $5$ A.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds current about $9.1$ A."),
          criterion("b", 1, "States that a $5$ A socket is not safe."),
          criterion("c", 1, "Suggests a higher-rated socket/fuse such as $15$ A."),
          criterion("c", 1, "Explains that the rating must exceed normal operating current but protect against excessive current."),
        ]),
        commonErrors: [
          "Comparing $2000$ W directly with $5$ A.",
          "Thinking a fuse rating below normal current is safer.",
        ],
        workedSolution: [
          solutionPart("a", "The heater current is $I=P/V=2000/220\\approx9.1$ A.", L`I\approx9.1\text{ A}`),
          solutionPart("b", "A $5$ A socket is not safe because the heater normally needs more than $5$ A."),
          solutionPart("c", "A suitable higher-rated socket and fuse, commonly around $15$ A for such loads, should be used. The rating should allow normal current but break the circuit if current becomes unsafe."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Explain the safety features of a domestic electric circuit using live, neutral, earth wire, fuse and parallel connection.",
        difficulty: 4,
        skillTags: ["domestic_circuit", "electrical_safety", "parallel_wiring"],
        figure: domesticCircuitFigure,
        parts: [
          part("a", "Describe the function of live and neutral wires.", 2),
          part("b", "Explain the role of earth wire and fuse.", 2),
          part("c", "Explain why appliances are connected in parallel.", 2),
        ],
        hints: [
          "Live and neutral provide the potential difference.",
          "Earth and fuse protect against faults.",
          "Parallel wiring gives full voltage and independent operation.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that live wire is at high potential."),
          criterion("a", 1, "States that neutral wire completes the circuit and is near zero potential."),
          criterion("b", 1, "Explains earth wire as a low-resistance safety path."),
          criterion("b", 1, "Explains fuse/MCB breaks circuit during excessive current."),
          criterion("c", 1, "Mentions full mains voltage across each appliance."),
          criterion("c", 1, "Mentions independent switching or operation."),
        ]),
        commonErrors: [
          "Treating earth and neutral as the same wire.",
          "Putting the fuse in parallel with the appliance.",
          "Saying household appliances are connected in series.",
        ],
        workedSolution: [
          solutionPart("a", "The live wire is at high potential and the neutral wire is near zero potential, so together they provide the supply across an appliance."),
          solutionPart("b", "The earth wire gives fault current a low-resistance path to ground. A fuse or MCB breaks the live circuit when excessive current flows."),
          solutionPart("c", "Appliances are connected in parallel so each gets the full supply voltage and can be switched independently."),
        ],
      },
    ],
  },
];

export const effectsOfCurrentXTopics: Topic[] = topicSeeds.map(makeTopic);
