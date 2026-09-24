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

const COURSE = "cbse-physics-12";
const UNIT = "u2-current-electricity";
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
  return `You chose ${choiceText}. Recheck whether the question is about charge flow, resistance, cell terminal voltage, a Kirchhoff equation, or a bridge balance.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_current_electricity_reasoning"),
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_formula_without_checking_circuit_condition_or_units",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "mixes_up_current_voltage_resistance_power_or_cell_internal_resistance",
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
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
    ],
  };
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function rubric(
  criteria: readonly { part: string; points: number; description: string }[],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((total, item) => total + item.points, 0),
    criteria: [...criteria],
  };
}

const ohmicVIFigure: ItemFigure = {
  type: "svg",
  title: "Linear V-I graph",
  description:
    "A straight-line V-I graph for a metallic conductor, passing through the origin and the point I = 3 A, V = 6 V.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-ohmic" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="110" y1="260" x2="530" y2="260"/>
    <line x1="110" y1="200" x2="530" y2="200"/>
    <line x1="110" y1="140" x2="530" y2="140"/>
    <line x1="110" y1="80" x2="530" y2="80"/>
    <line x1="230" y1="280" x2="230" y2="60"/>
    <line x1="350" y1="280" x2="350" y2="60"/>
    <line x1="470" y1="280" x2="470" y2="60"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-ohmic)">
    <line x1="110" y1="280" x2="555" y2="280"/>
    <line x1="110" y1="280" x2="110" y2="45"/>
  </g>
  <line x1="110" y1="280" x2="470" y2="80" stroke="#2563eb" stroke-width="4"/>
  <circle cx="470" cy="80" r="6" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a" text-anchor="middle">
    <text x="470" y="55">(3 A, 6 V)</text>
    <text x="565" y="300">I (A)</text>
    <text x="78" y="45">V (V)</text>
    <text x="108" y="304">0</text>
    <text x="230" y="304">1</text>
    <text x="350" y="304">2</text>
    <text x="470" y="304">3</text>
    <text x="86" y="205">2</text>
    <text x="86" y="145">4</text>
    <text x="86" y="85">6</text>
  </g>
</svg>`,
};

const nonOhmicLampFigure: ItemFigure = {
  type: "svg",
  title: "Filament lamp V-I curve",
  description:
    "A curved V-I characteristic for a filament lamp with marked points at 2 V, 0.50 A and 6 V, 1.0 A.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-lamp" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="105" y1="240" x2="535" y2="240"/>
    <line x1="105" y1="200" x2="535" y2="200"/>
    <line x1="105" y1="160" x2="535" y2="160"/>
    <line x1="105" y1="120" x2="535" y2="120"/>
    <line x1="230" y1="280" x2="230" y2="70"/>
    <line x1="355" y1="280" x2="355" y2="70"/>
    <line x1="480" y1="280" x2="480" y2="70"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-lamp)">
    <line x1="105" y1="280" x2="560" y2="280"/>
    <line x1="105" y1="280" x2="105" y2="45"/>
  </g>
  <path d="M105 280 C 150 246, 185 212, 230 200 C 315 176, 395 138, 480 120" stroke="#f97316" stroke-width="4" fill="none"/>
  <circle cx="230" cy="200" r="6" fill="#2563eb"/>
  <circle cx="480" cy="120" r="6" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a" text-anchor="middle">
    <text x="230" y="184">(2 V, 0.50 A)</text>
    <text x="480" y="100">(6 V, 1.0 A)</text>
    <text x="565" y="300">V (V)</text>
    <text x="75" y="48">I (A)</text>
    <text x="105" y="304">0</text>
    <text x="230" y="304">2</text>
    <text x="355" y="304">4</text>
    <text x="480" y="304">6</text>
    <text x="78" y="205">0.50</text>
    <text x="82" y="125">1.0</text>
  </g>
</svg>`,
};

const cellTerminalFigure: ItemFigure = {
  type: "svg",
  title: "Terminal voltage against current",
  description:
    "A straight-line graph of terminal voltage V against current I for a cell, with intercept 2.0 V and point at I = 2.0 A, V = 1.2 V.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-cell" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="110" y1="237.5" x2="520" y2="237.5"/>
    <line x1="110" y1="185" x2="520" y2="185"/>
    <line x1="110" y1="132.5" x2="520" y2="132.5"/>
    <line x1="110" y1="80" x2="520" y2="80"/>
    <line x1="230" y1="290" x2="230" y2="60"/>
    <line x1="350" y1="290" x2="350" y2="60"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-cell)">
    <line x1="110" y1="290" x2="560" y2="290"/>
    <line x1="110" y1="290" x2="110" y2="45"/>
  </g>
  <line x1="110" y1="80" x2="350" y2="164" stroke="#2563eb" stroke-width="4"/>
  <circle cx="110" cy="80" r="6" fill="#2563eb"/>
  <circle cx="350" cy="164" r="6" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a" text-anchor="middle">
    <text x="167" y="70">2.0 V</text>
    <text x="374" y="154">(2.0 A, 1.2 V)</text>
    <text x="565" y="310">I (A)</text>
    <text x="75" y="48">V (V)</text>
    <text x="110" y="314">0</text>
    <text x="230" y="314">1.0</text>
    <text x="350" y="314">2.0</text>
    <text x="82" y="190">1.0</text>
    <text x="82" y="84">2.0</text>
  </g>
</svg>`,
};

const kirchhoffMeshFigure: ItemFigure = {
  type: "svg",
  title: "Two-loop circuit",
  description:
    "Two mesh currents I1 and I2 share a 1 ohm resistor; the left loop has a 7 V cell with positive terminal at the top and 2 ohm resistor, and the right loop has a 5 V cell with positive terminal at the bottom and 3 ohm resistor.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <defs>
    <marker id="mesh-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <g stroke="#334155" stroke-width="3" fill="none">
    <path d="M115 85 H315"/>
    <path d="M405 85 H605"/>
    <path d="M115 300 H315"/>
    <path d="M405 300 H605"/>
    <path d="M115 85 V145"/>
    <path d="M115 240 V300"/>
    <path d="M605 85 V145"/>
    <path d="M605 240 V300"/>
    <path d="M360 130 V255"/>
  </g>
  <g stroke="#2563eb" stroke-width="4">
    <line x1="315" y1="60" x2="315" y2="110"/>
    <line x1="405" y1="60" x2="405" y2="110"/>
    <line x1="95" y1="145" x2="135" y2="145"/>
    <line x1="105" y1="240" x2="125" y2="240"/>
    <line x1="595" y1="145" x2="615" y2="145"/>
    <line x1="585" y1="240" x2="625" y2="240"/>
  </g>
  <g stroke="#dc2626" stroke-width="3">
    <path d="M195 300 h12 l8 -18 l12 36 l12 -36 l12 36 l8 -18 h12"/>
    <path d="M455 300 h12 l8 -18 l12 36 l12 -36 l12 36 l8 -18 h12"/>
    <path d="M345 130 h30 l-18 18 l36 12 l-36 12 l36 12 l-36 12 l18 18 h-30"/>
  </g>
  <path d="M205 160 A75 75 0 1 1 205 250" stroke="#2563eb" stroke-width="3" fill="none" marker-end="url(#mesh-arrow)"/>
  <path d="M515 160 A75 75 0 1 1 515 250" stroke="#2563eb" stroke-width="3" fill="none" marker-end="url(#mesh-arrow)"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="360" y="52">shared 1 &#937;</text>
    <text x="230" y="344">2 &#937;</text>
    <text x="490" y="344">3 &#937;</text>
    <text x="80" y="198">7 V</text>
    <text x="650" y="198">5 V</text>
    <text x="145" y="150">+</text>
    <text x="145" y="246">-</text>
    <text x="575" y="150">-</text>
    <text x="575" y="246">+</text>
    <text x="225" y="205">I1</text>
    <text x="495" y="205">I2</text>
  </g>
</svg>`,
};

const wheatstoneBridgeFigure: ItemFigure = {
  type: "svg",
  title: "Balanced Wheatstone bridge",
  description:
    "A Wheatstone bridge with arms AB = 2 ohm, BC = 3 ohm, AD = 4 ohm, DC = 6 ohm, and a 5 ohm galvanometer branch between B and D.",
  svg: `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="420" fill="#ffffff"/>
  <g stroke="#334155" stroke-width="3" fill="none">
    <path d="M350 60 L160 190 L350 330 L540 190 Z"/>
    <path d="M350 60 V168"/>
    <path d="M350 212 V330"/>
  </g>
  <g stroke="#dc2626" stroke-width="3" fill="none">
    <path d="M245 111 h10 l8 -16 l12 32 l12 -32 l12 32 l8 -16 h10"/>
    <path d="M430 111 h10 l8 -16 l12 32 l12 -32 l12 32 l8 -16 h10"/>
    <path d="M245 269 h10 l8 -16 l12 32 l12 -32 l12 32 l8 -16 h10"/>
    <path d="M430 269 h10 l8 -16 l12 32 l12 -32 l12 32 l8 -16 h10"/>
  </g>
  <circle cx="350" cy="190" r="22" fill="#f8fafc" stroke="#2563eb" stroke-width="3"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="350" y="45">B</text>
    <text x="145" y="195">A</text>
    <text x="555" y="195">C</text>
    <text x="350" y="360">D</text>
    <text x="240" y="95">2 &#937;</text>
    <text x="460" y="95">3 &#937;</text>
    <text x="240" y="305">4 &#937;</text>
    <text x="460" y="305">6 &#937;</text>
    <text x="350" y="197">G</text>
    <text x="390" y="197">5 &#937;</text>
  </g>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Electric Current, Drift Velocity, and Mobility",
    subtopic:
      "Current as charge flow, electron drift, current density, and mobility.",
    mc: [
      {
        questionLatex: L`In a wire, $2.5\times10^{19}$ electrons cross a section in $10\text{ s}$. The conventional current is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electric_current", "charge_quantisation"],
        choices: [
          L`$0.25\text{ A}$`,
          L`$0.40\text{ A}$`,
          L`$2.5\text{ A}$`,
          L`$4.0\text{ A}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This divides electron count by time but misses the electron charge.",
          C: "This treats the number of electrons as if it were charge in coulomb.",
          D: "This finds the total charge in coulomb but does not divide by time.",
        },
        hints: [
          L`First find charge magnitude $Q=ne$.`,
          L`Use $e=1.6\times10^{-19}\text{ C}$.`,
          L`Current is $I=Q/t$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert electron count into charge.",
            math: L`Q=(2.5\times10^{19})(1.6\times10^{-19})=4.0\ \mathrm C`,
          },
          {
            step: 2,
            explanation: "Divide by time.",
            math: L`I=\frac{Q}{t}=\frac{4.0}{10}=0.40\ \mathrm A`,
          },
        ],
      },
      {
        questionLatex: L`A metallic wire carries a steady current. If its radius is doubled while current and charge carrier density remain the same, the drift speed becomes`,
        difficulty: 2,
        skillTags: ["drift_velocity", "current_density"],
        choices: [
          "twice the original value",
          "half the original value",
          "one-fourth of the original value",
          "four times the original value",
        ],
        correctLetter: "C",
        rationales: {
          A: "Doubling radius increases area; it does not make carriers drift faster for the same current.",
          B: "Area depends on radius squared, so the factor is not 2.",
          D: "This reverses the dependence: larger area needs smaller drift speed for the same current.",
        },
        hints: [
          L`Use $I=neAv_d$.`,
          "For the same current, drift speed is inversely proportional to area.",
          "Doubling radius makes area four times.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At fixed current and carrier density, drift speed is inversely proportional to cross-sectional area.",
            math: L`v_d\propto \frac{1}{A}`,
          },
          {
            step: 2,
            explanation: "The area becomes four times.",
            math: L`A'=\pi(2r)^2=4A\Rightarrow v_d'=\frac{v_d}{4}`,
          },
        ],
      },
      {
        questionLatex: L`In a conductor, the drift speed is $4.0\times10^{-4}\text{ m s}^{-1}$ when the electric field is $2.0\times10^{-2}\text{ V m}^{-1}$. The mobility of charge carriers is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["mobility", "drift_velocity"],
        choices: [
          L`$2.0\times10^{-2}\text{ m}^2\text{ V}^{-1}\text{ s}^{-1}$`,
          L`$8.0\times10^{-6}\text{ m}^2\text{ V}^{-1}\text{ s}^{-1}$`,
          L`$5.0\times10^1\text{ m}^2\text{ V}^{-1}\text{ s}^{-1}$`,
          L`$2.0\times10^{-6}\text{ m}^2\text{ V}^{-1}\text{ s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This multiplies drift speed by field instead of dividing by field.",
          C: "This inverts the ratio.",
          D: "This is a power-of-ten slip after using the correct ratio.",
        },
        hints: [
          L`Mobility is $\mu=v_d/E$.`,
          "Keep the units as square metre per volt second.",
          L`Compute $(4.0\times10^{-4})/(2.0\times10^{-2})$ directly.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the definition of mobility.",
            math: L`\mu=\frac{v_d}{E}=\frac{4.0\times10^{-4}}{2.0\times10^{-2}}=2.0\times10^{-2}\ \mathrm{m^2\,V^{-1}\,s^{-1}}`,
          },
        ],
      },
      {
        questionLatex: L`A current of $2.0\text{ A}$ flows to the right through a wire of cross-sectional area $4.0\times10^{-6}\text{ m}^2$. The current density is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["current_density", "direction_of_current"],
        choices: [
          L`$8.0\times10^{-6}\text{ A m}^{-2}$ to the right`,
          L`$5.0\times10^5\text{ A m}^{-2}$ to the left`,
          L`$8.0\times10^{-6}\text{ A m}^{-2}$ to the left`,
          L`$5.0\times10^5\text{ A m}^{-2}$ to the right`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This multiplies current by area instead of dividing by area.",
          B: "The magnitude is correct, but current density follows conventional current direction.",
          C: "This has both the wrong operation and the electron-drift direction instead of conventional current direction.",
        },
        hints: [
          L`Current density magnitude is $J=I/A$.`,
          "Its direction is the direction of conventional current.",
          "Divide 2.0 by 4.0 x 10^-6.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the magnitude from current divided by area.",
            math: L`J=\frac{2.0}{4.0\times10^{-6}}=5.0\times10^5\ \mathrm{A\,m^{-2}}`,
          },
          {
            step: 2,
            explanation:
              "Current density points along conventional current, so it is to the right.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: In a metal wire, electron drift velocity is opposite to the conventional current. Reason: Electrons have negative charge, so the electric force on them is opposite to the electric field.`,
        difficulty: 2,
        skillTags: [
          "assertion_reason",
          "drift_velocity",
          "direction_of_current",
        ],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is exactly why electrons drift opposite to the field and hence opposite to conventional current.",
          C: "The reason is true because force on charge is qE and electron charge is negative.",
          D: "The assertion is true; conventional current is defined opposite to electron drift in metals.",
        },
        hints: [
          "Conventional current direction is the direction of positive charge flow.",
          "Electrons are negative charge carriers.",
          "Their drift is opposite to the electric field in a metal.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Electrons experience force opposite to the electric field.",
            math: L`\vec F=q\vec E,\qquad q=-e`,
          },
          {
            step: 2,
            explanation:
              "Conventional current is along the field, so electron drift is opposite to conventional current.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A steady current of $0.80\text{ A}$ flows for $5.0\text{ s}$. Find the number of electrons crossing a section of the conductor.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electric_current", "charge_quantisation"],
        parts: [part("a", "Find the number of electrons.", 2)],
        hints: [
          L`First calculate total charge $Q=It$.`,
          L`Each electron has charge magnitude $e=1.6\times10^{-19}\text{ C}$.`,
          L`Use $n=Q/e$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds charge passed as 4 C." },
          {
            part: "a",
            points: 1,
            description: "Divides by electronic charge to find electron count.",
          },
        ]),
        commonErrors: [
          "Stopping at total charge instead of electron count.",
          "Using the negative sign of electron charge in the count.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The charge crossing the section is current multiplied by time.",
            math: L`Q=It=(0.80)(5.0)=4.0\ \mathrm C`,
          },
          {
            part: "a",
            explanation: "The number of electrons is charge divided by e.",
            math: L`n=\frac{4.0}{1.6\times10^{-19}}=2.5\times10^{19}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A copper wire of area $1.0\times10^{-6}\text{ m}^2$ carries current $3.2\text{ A}$. The free electron density is $8.0\times10^{28}\text{ m}^{-3}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["drift_velocity"],
        parts: [
          part("a", "Find the drift speed of electrons.", 2),
          part(
            "b",
            "State the direction of electron drift if conventional current is east.",
            1,
          ),
        ],
        hints: [
          L`Use $I=neAv_d$.`,
          "Substitute n, e, A and I carefully.",
          "Electron drift is opposite to conventional current.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses drift-current relation with correct powers of ten.",
          },
          {
            part: "b",
            points: 1,
            description:
              "States electron drift opposite to conventional current.",
          },
        ]),
        commonErrors: [
          "Forgetting the cross-sectional area.",
          "Saying electrons drift in the same direction as conventional current.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Rearrange the drift-current relation.",
            math: L`v_d=\frac{I}{neA}=\frac{3.2}{(8.0\times10^{28})(1.6\times10^{-19})(1.0\times10^{-6})}=2.5\times10^{-4}\ \mathrm{m\,s^{-1}}`,
          },
          {
            part: "b",
            explanation:
              "If conventional current is east, electrons drift west.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A wire carries $2.0\text{ A}$ through area $4.0\times10^{-6}\text{ m}^2$. Its resistivity is $2.0\times10^{-8}\ \Omega\text{ m}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["current_density", "resistivity", "microscopic_ohm_law"],
        parts: [
          part("a", "Find the current density.", 1),
          part("b", "Find the electric field inside the wire.", 2),
        ],
        hints: [
          L`First use $J=I/A$.`,
          L`Microscopic Ohm law may be written $E=\rho J$.`,
          "Track powers of ten carefully.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds current density." },
          {
            part: "b",
            points: 2,
            description: "Uses E = rho J with correct units.",
          },
        ]),
        commonErrors: [
          "Using resistance instead of resistivity.",
          "Multiplying by area twice.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Current density is current per unit area.",
            math: L`J=\frac{I}{A}=\frac{2.0}{4.0\times10^{-6}}=5.0\times10^5\ \mathrm{A\,m^{-2}}`,
          },
          {
            part: "b",
            explanation:
              "Use the relation between electric field and current density.",
            math: L`E=\rho J=(2.0\times10^{-8})(5.0\times10^5)=1.0\times10^{-2}\ \mathrm{V\,m^{-1}}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For a metal conductor with electron density $n$, cross-sectional area $A$, and electron drift speed $v_d$, derive the relation between current and drift speed. Hence write the expression for current density.`,
        difficulty: 3,
        skillTags: ["drift_velocity_derivation", "current_density"],
        parts: [
          part("a", "Derive $I=neAv_d$.", 3),
          part("b", "Write the corresponding current density relation.", 2),
        ],
        hints: [
          "In time dt, carriers within a cylinder of length vd dt cross the section.",
          "Number of carriers is density times volume.",
          "Divide charge crossing by dt.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Identifies the volume crossing the section in time dt.",
          },
          {
            part: "a",
            points: 1,
            description: "Finds charge crossing in time dt.",
          },
          {
            part: "a",
            points: 1,
            description: "Divides by dt to get current.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Writes current density and connects it to drift speed.",
          },
        ]),
        commonErrors: [
          "Using length of the whole wire instead of drift distance in time dt.",
          "Omitting cross-sectional area.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In time dt, electrons from a cylinder of volume A vd dt cross the section.",
            math: L`N=nAv_d\,dt`,
          },
          {
            part: "a",
            explanation: "The charge magnitude crossing is Ne.",
            math: L`dQ=neAv_d\,dt`,
          },
          {
            part: "a",
            explanation: "Current is charge crossing per unit time.",
            math: L`I=\frac{dQ}{dt}=neAv_d`,
          },
          {
            part: "b",
            explanation: "Current density is current per unit area.",
            math: L`J=\frac{I}{A}=nev_d`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A long copper wire of area $1.0\times10^{-6}\text{ m}^2$ carries a steady current of $1.6\text{ A}$. The electron density is $8.0\times10^{28}\text{ m}^{-3}$. A classroom discussion compares charge transfer through a section with the slow drift of individual electrons.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["drift_velocity", "charge_flow", "case_based"],
        parts: [
          part("a", "Find the charge crossing any section in 30 s.", 1),
          part("b", "Find the electron drift speed.", 2),
          part(
            "c",
            "Estimate the time an electron takes to drift 2.0 m along the wire.",
            2,
          ),
        ],
        hints: [
          L`Use $Q=It$ for charge transfer.`,
          L`Use $v_d=I/(neA)$ for drift speed.`,
          L`For drift time, use $t=L/v_d$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds charge crossing." },
          {
            part: "b",
            points: 2,
            description: "Computes drift speed with correct powers of ten.",
          },
          {
            part: "c",
            points: 2,
            description: "Uses drift speed to estimate travel time.",
          },
        ]),
        commonErrors: [
          "Confusing signal propagation with electron drift speed.",
          "Using current as if it were speed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Charge transfer through a section is current times time.",
            math: L`Q=It=(1.6)(30)=48\ \mathrm C`,
          },
          {
            part: "b",
            explanation: "Calculate electron drift speed.",
            math: L`v_d=\frac{1.6}{(8.0\times10^{28})(1.6\times10^{-19})(1.0\times10^{-6})}=1.25\times10^{-4}\ \mathrm{m\,s^{-1}}`,
          },
          {
            part: "c",
            explanation: "Use distance divided by drift speed.",
            math: L`t=\frac{2.0}{1.25\times10^{-4}}=1.6\times10^4\ \mathrm s`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Ohm's Law, Resistance, and Electrical Power",
    subtopic:
      "V-I characteristics, resistance and resistivity, temperature dependence, and power.",
    mc: [
      {
        questionLatex: L`Using the V-I graph shown, the resistance of the conductor is`,
        difficulty: 2,
        figure: ohmicVIFigure,
        skillTags: ["ohms_law", "vi_graph"],
        choices: [
          L`$0.50\ \Omega$`,
          L`$1.0\ \Omega$`,
          L`$2.0\ \Omega$`,
          L`$18\ \Omega$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses I/V instead of V/I for resistance.",
          B: "This does not use the labelled point on the graph.",
          D: "This multiplies V and I instead of dividing V by I.",
        },
        hints: [
          "For a V-I graph with V on the vertical axis, slope gives resistance.",
          "Use the labelled point.",
          L`Calculate $R=V/I$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the graph point I = 3 A and V = 6 V.",
            math: L`R=\frac{V}{I}=\frac{6}{3}=2.0\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`A second wire of the same material has twice the length and half the radius of a wire of resistance $R$. Its resistance is`,
        difficulty: 3,
        skillTags: ["resistance_geometry", "resistivity"],
        choices: [L`$2R$`, L`$8R$`, L`$\frac{R}{2}$`, L`$\frac{R}{8}$`],
        correctLetter: "B",
        rationales: {
          A: "This accounts for length change but ignores the radius-squared effect on area.",
          C: "Resistance increases, not decreases, when length increases and area decreases.",
          D: "This reverses both dependences.",
        },
        hints: [
          L`Use $R=\rho L/A$.`,
          "Doubling length doubles resistance if area is unchanged.",
          "Halving radius makes area one-fourth, giving another factor of 4.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Track both length and area changes.",
            math: L`L'=2L,\qquad A'=\frac{A}{4}`,
          },
          {
            step: 2,
            explanation: "Substitute in the resistance formula.",
            math: L`R'=\rho\frac{2L}{A/4}=8R`,
          },
        ],
      },
      {
        questionLatex: L`A metal resistor is $20\ \Omega$ at $20^\circ\text{C}$. If $\alpha=5.0\times10^{-3}\ ^\circ\text{C}^{-1}$, its resistance at $60^\circ\text{C}$ is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["temperature_dependence_resistance"],
        choices: [
          L`$20.4\ \Omega$`,
          L`$21.0\ \Omega$`,
          L`$22.0\ \Omega$`,
          L`$24.0\ \Omega$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This treats the temperature rise as 4 degrees instead of 40 degrees.",
          B: "This uses only alpha times initial resistance, not the full temperature change.",
          C: "This corresponds to half the actual temperature rise contribution.",
        },
        hints: [
          L`Use $R=R_0(1+\alpha\Delta T)$.`,
          L`Here $\Delta T=60-20=40^\circ\text{C}$.`,
          "Compute the multiplying factor first.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the temperature factor.",
            math: L`1+\alpha\Delta T=1+(5.0\times10^{-3})(40)=1.20`,
          },
          {
            step: 2,
            explanation: "Multiply the initial resistance.",
            math: L`R=20(1.20)=24.0\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`The V-I curve of a filament lamp bends as current increases. The best conclusion is`,
        difficulty: 2,
        figure: nonOhmicLampFigure,
        skillTags: ["non_ohmic_vi_characteristic"],
        choices: [
          "its resistance changes with current because temperature changes",
          "it has zero resistance at all voltages",
          "it obeys Ohm's law exactly at all temperatures",
          "its current is independent of voltage",
        ],
        correctLetter: "A",
        rationales: {
          B: "The curve shows finite voltage for finite current, not zero resistance.",
          C: "A straight line through the origin would indicate exact Ohm's law; this graph is curved.",
          D: "The current changes when voltage changes.",
        },
        hints: [
          "An ohmic conductor has a straight-line V-I graph at constant temperature.",
          "A filament heats up as current increases.",
          "Changing temperature changes resistance.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The curved V-I graph shows that V/I is not constant.",
          },
          {
            step: 2,
            explanation:
              "For a filament lamp, heating changes resistance, so it is non-ohmic over this range.",
          },
        ],
      },
      {
        questionLatex: L`A $60\text{ W}$, $120\text{ V}$ lamp is connected to $240\text{ V}$, assuming its resistance remains unchanged. The power dissipated would be`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electrical_power", "resistance"],
        choices: [
          L`$120\text{ W}$`,
          L`$60\text{ W}$`,
          L`$240\text{ W}$`,
          L`$480\text{ W}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Power is proportional to V squared for fixed resistance, not directly to V.",
          B: "The voltage has changed, so power cannot remain the rated value under the stated assumption.",
          D: "Doubling voltage makes power four times, not eight times.",
        },
        hints: [
          L`First find $R=V^2/P$ from the rating.`,
          L`For unchanged resistance, $P'=V'^2/R$.`,
          "Doubling voltage gives four times the power.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the resistance from the rating.",
            math: L`R=\frac{120^2}{60}=240\ \Omega`,
          },
          {
            step: 2,
            explanation: "Use the new voltage with the same resistance.",
            math: L`P'=\frac{240^2}{240}=240\ \mathrm W`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A wire of length $2.0\text{ m}$, area $1.0\times10^{-6}\text{ m}^2$, has resistance $5.0\ \Omega$. Find its resistivity.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["resistivity"],
        parts: [part("a", "Find the resistivity.", 2)],
        hints: [
          L`Use $R=\rho L/A$.`,
          L`Rearrange to $\rho=RA/L$.`,
          "Substitute SI units.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Rearranges and substitutes in the resistivity formula.",
          },
        ]),
        commonErrors: [
          "Using L/A instead of A/L after rearranging.",
          "Dropping the area power of ten.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Rearrange the resistance formula.",
            math: L`\rho=\frac{RA}{L}=\frac{(5.0)(1.0\times10^{-6})}{2.0}=2.5\times10^{-6}\ \Omega\,\mathrm m`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An electric heater draws $2.0\text{ A}$ from a $220\text{ V}$ supply.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["ohms_law", "electrical_power"],
        parts: [
          part("a", "Find the resistance of the heater.", 1),
          part("b", "Find the power consumed.", 2),
        ],
        hints: [
          L`Use $R=V/I$.`,
          L`Use $P=VI$.`,
          "Check units: ohm for resistance and watt for power.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds heater resistance." },
          { part: "b", points: 2, description: "Finds power consumed." },
        ]),
        commonErrors: [
          "Using P = I/V instead of VI.",
          "Forgetting that voltage is already across the heater.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Ohm's law gives the resistance.",
            math: L`R=\frac{V}{I}=\frac{220}{2.0}=110\ \Omega`,
          },
          {
            part: "b",
            explanation: "Electrical power is voltage times current.",
            math: L`P=VI=(220)(2.0)=440\ \mathrm W`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The graph shown is the V-I characteristic of a conductor.`,
        difficulty: 3,
        figure: ohmicVIFigure,
        skillTags: ["vi_graph", "ohms_law"],
        parts: [
          part("a", "Find the resistance of the conductor.", 2),
          part(
            "b",
            "Find the current when 10 V is applied, assuming the same graph remains valid.",
            1,
          ),
        ],
        hints: [
          "The slope of V against I is resistance.",
          "Use the marked point to find R.",
          L`For 10 V, use $I=V/R$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds resistance from graph slope.",
          },
          {
            part: "b",
            points: 1,
            description: "Uses Ohm's law to find current.",
          },
        ]),
        commonErrors: [
          "Taking reciprocal slope because of reading axes wrongly.",
          "Using the product VI as resistance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The graph passes through I = 3 A and V = 6 V.",
            math: L`R=\frac{V}{I}=\frac{6}{3}=2\ \Omega`,
          },
          {
            part: "b",
            explanation: "Apply Ohm's law at 10 V.",
            math: L`I=\frac{10}{2}=5\ \mathrm A`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two wires A and B are made of the same material. Wire A has length $L$ and radius $r$. Wire B has length $2L$ and radius $2r$. The same potential difference is applied separately across each wire.`,
        difficulty: 3,
        skillTags: ["resistance_geometry", "electrical_power"],
        parts: [
          part("a", "Find the ratio $R_B/R_A$.", 2),
          part(
            "b",
            "Find the ratio $I_B/I_A$ for the same applied voltage.",
            2,
          ),
          part(
            "c",
            "Find the ratio $P_B/P_A$ for the same applied voltage.",
            1,
          ),
        ],
        hints: [
          L`Use $R=\rho L/A$ and $A=\pi r^2$.`,
          "Wire B is longer but also much thicker.",
          L`For the same voltage, $I=V/R$ and $P=V^2/R$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Compares length and area correctly.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses same-voltage condition for current ratio.",
          },
          {
            part: "c",
            points: 1,
            description: "Uses power relation for same voltage.",
          },
        ]),
        commonErrors: [
          "Forgetting that radius doubling makes area four times.",
          "Assuming longer wire always has larger resistance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Compare the resistance formulas.",
            math: L`R_A=\rho\frac{L}{\pi r^2},\qquad R_B=\rho\frac{2L}{\pi(2r)^2}=\frac12R_A`,
          },
          {
            part: "b",
            explanation:
              "At the same voltage, current is inversely proportional to resistance.",
            math: L`\frac{I_B}{I_A}=\frac{R_A}{R_B}=2`,
          },
          {
            part: "c",
            explanation:
              "At the same voltage, power is also inversely proportional to resistance.",
            math: L`\frac{P_B}{P_A}=\frac{R_A}{R_B}=2`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows the V-I characteristic of a filament lamp. The marked points are used to compare its resistance at low and higher operating voltage.`,
        difficulty: 4,
        figure: nonOhmicLampFigure,
        skillTags: [
          "non_ohmic_vi_characteristic",
          "resistance_from_graph",
          "case_based",
        ],
        parts: [
          part("a", "Find the resistance at 2 V.", 1),
          part("b", "Find the resistance at 6 V.", 2),
          part(
            "c",
            "Does the lamp obey Ohm's law over this range? Justify.",
            2,
          ),
        ],
        hints: [
          L`Resistance at a point on a V-I curve is $V/I$.`,
          "Use the two labelled points separately.",
          "A constant resistance would give the same V/I ratio at both points.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds resistance at 2 V." },
          { part: "b", points: 2, description: "Finds resistance at 6 V." },
          {
            part: "c",
            points: 2,
            description:
              "Concludes non-ohmic behavior with graph-based reason.",
          },
        ]),
        commonErrors: [
          "Using slope between the two points instead of V/I at each operating point.",
          "Calling any V-I graph ohmic without checking linearity.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "At 2 V, the current is 0.50 A.",
            math: L`R=\frac{2}{0.50}=4\ \Omega`,
          },
          {
            part: "b",
            explanation: "At 6 V, the current is 1.0 A.",
            math: L`R=\frac{6}{1.0}=6\ \Omega`,
          },
          {
            part: "c",
            explanation:
              "The resistance is not constant and the graph is curved, so the lamp does not obey Ohm's law over this range.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Cells, EMF, Internal Resistance, and Cell Combinations",
    subtopic:
      "Terminal voltage, lost volts, internal resistance, and series/parallel cells.",
    mc: [
      {
        questionLatex: L`A cell of emf $1.5\text{ V}$ and internal resistance $0.50\ \Omega$ supplies current $0.60\text{ A}$. Its terminal voltage while discharging is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["terminal_voltage", "internal_resistance"],
        choices: [
          L`$1.2\text{ V}$`,
          L`$1.5\text{ V}$`,
          L`$1.8\text{ V}$`,
          L`$0.30\text{ V}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This ignores the voltage drop across internal resistance.",
          C: "This adds Ir instead of subtracting it for a discharging cell.",
          D: "This is only the lost volts, not the terminal voltage.",
        },
        hints: [
          L`For a discharging cell, $V=E-Ir$.`,
          L`Lost volts are $Ir=(0.60)(0.50)$.`,
          "Subtract lost volts from emf.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the lost volts.",
            math: L`Ir=(0.60)(0.50)=0.30\ \mathrm V`,
          },
          {
            step: 2,
            explanation: "Terminal voltage is emf minus lost volts.",
            math: L`V=1.5-0.30=1.2\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`From the terminal-voltage graph of a cell, the internal resistance is`,
        difficulty: 3,
        figure: cellTerminalFigure,
        skillTags: ["terminal_voltage_graph", "internal_resistance"],
        choices: [
          L`$0.20\ \Omega$`,
          L`$0.30\ \Omega$`,
          L`$0.40\ \Omega$`,
          L`$1.2\ \Omega$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses the voltage drop but not the full current interval correctly.",
          B: "This does not match the slope between the labelled points.",
          D: "This reads the terminal voltage as if it were resistance.",
        },
        hints: [
          L`For a cell, $V=E-Ir$.`,
          "The magnitude of the slope of V against I is internal resistance.",
          "Use the intercept and the marked point.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Read the voltage drop from 2.0 V to 1.2 V when current reaches 2.0 A.",
            math: L`r=\frac{2.0-1.2}{2.0}=0.40\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`Three identical cells, each of emf $1.5\text{ V}$ and internal resistance $0.50\ \Omega$, are connected in series with an external resistor of $3.0\ \Omega$. The circuit current is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["cells_in_series", "internal_resistance"],
        choices: [
          L`$0.50\text{ A}$`,
          L`$1.0\text{ A}$`,
          L`$1.5\text{ A}$`,
          L`$3.0\text{ A}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This adds only emf or only resistance partially; both total emf and total internal resistance must be used.",
          C: "This ignores internal resistance.",
          D: "This uses external resistance alone with the wrong total emf treatment.",
        },
        hints: [
          "For series cells, emfs add and internal resistances add.",
          L`Total emf is $4.5\text{ V}$.`,
          L`Total resistance is $3.0+1.5=4.5\ \Omega$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find equivalent emf and resistance.",
            math: L`E_\text{eq}=3(1.5)=4.5\ \mathrm V,\qquad r_\text{eq}=3(0.50)=1.5\ \Omega`,
          },
          {
            step: 2,
            explanation: "Apply Ohm's law to the whole circuit.",
            math: L`I=\frac{4.5}{3.0+1.5}=1.0\ \mathrm A`,
          },
        ],
      },
      {
        questionLatex: L`Two identical cells of emf $2.0\text{ V}$ and internal resistance $1.0\ \Omega$ each are connected in parallel across a $3.0\ \Omega$ resistor. The current through the resistor is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["cells_in_parallel", "internal_resistance"],
        choices: [
          L`$0.50\text{ A}$`,
          L`$1.0\text{ A}$`,
          L`$2.0\text{ A}$`,
          L`$\frac{4}{7}\text{ A}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This uses the internal resistance as if the cells were in series.",
          B: "This ignores the external resistor.",
          C: "This ignores both external resistance and effective internal resistance.",
        },
        hints: [
          "Identical cells in parallel have the same emf as one cell.",
          "Their effective internal resistance is r/2.",
          "Use total resistance R + r/2.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the equivalent cell combination.",
            math: L`E_\text{eq}=2.0\ \mathrm V,\qquad r_\text{eq}=\frac{1.0}{2}=0.50\ \Omega`,
          },
          {
            step: 2,
            explanation: "Find the current through the external resistor.",
            math: L`I=\frac{2.0}{3.0+0.50}=\frac{4}{7}\ \mathrm A`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: The terminal voltage of a cell is less than its emf when it supplies current to an external resistor. Reason: Part of the emf is spent in overcoming the internal resistance of the cell.`,
        difficulty: 3,
        skillTags: [
          "assertion_reason",
          "terminal_voltage",
          "internal_resistance",
        ],
        choices: [
          "Assertion is true, but Reason is false.",
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason is true; the lost volts are Ir.",
          C: "The reason directly explains why terminal voltage is lower than emf during discharge.",
          D: "The assertion is true for a discharging cell.",
        },
        hints: [
          L`For discharge, $V=E-Ir$.`,
          "The term Ir is called lost volts.",
          "Connect this lost-voltage term to the reason.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The terminal voltage is reduced by the internal drop.",
            math: L`V=E-Ir`,
          },
          {
            step: 2,
            explanation:
              "Therefore both statements are true and the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A cell has emf $2.0\text{ V}$. Its terminal voltage is $1.6\text{ V}$ when current $0.80\text{ A}$ is drawn. Find its internal resistance.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["internal_resistance", "terminal_voltage"],
        parts: [part("a", "Find the internal resistance.", 2)],
        hints: [
          L`Use $V=E-Ir$.`,
          "The lost volts are E - V.",
          L`Then $r=(E-V)/I$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds lost volts." },
          {
            part: "a",
            points: 1,
            description: "Divides by current to find r.",
          },
        ]),
        commonErrors: [
          "Using V/E as resistance.",
          "Forgetting that terminal voltage is lower during discharge.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Internal resistance is lost volts divided by current.",
            math: L`r=\frac{E-V}{I}=\frac{2.0-1.6}{0.80}=0.50\ \Omega`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cell of emf $12\text{ V}$ and internal resistance $1.0\ \Omega$ is connected to an external resistance $5.0\ \Omega$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["terminal_voltage", "internal_resistance"],
        parts: [
          part("a", "Find the circuit current.", 1),
          part("b", "Find the terminal voltage of the cell.", 2),
        ],
        hints: [
          "The total resistance includes internal resistance.",
          L`Use $I=E/(R+r)$.`,
          L`Terminal voltage is $IR$ or $E-Ir$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds circuit current." },
          { part: "b", points: 2, description: "Finds terminal voltage." },
        ]),
        commonErrors: [
          "Using only external resistance for total circuit resistance.",
          "Adding Ir to emf for a discharging cell.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use total resistance of the circuit.",
            math: L`I=\frac{12}{5.0+1.0}=2.0\ \mathrm A`,
          },
          {
            part: "b",
            explanation:
              "Terminal voltage is the voltage across the external resistor.",
            math: L`V=IR=(2.0)(5.0)=10\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two cells of emf $2.0\text{ V}$ and $1.0\text{ V}$, each with internal resistance $0.50\ \Omega$, are connected in opposition with an external resistor $4.0\ \Omega$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["cells_in_series", "opposing_cells"],
        parts: [
          part("a", "Find the net emf of the combination.", 1),
          part("b", "Find the current in the circuit.", 2),
        ],
        hints: [
          "For opposing cells, subtract emfs.",
          "Internal resistances still add in series.",
          "Divide net emf by total resistance.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds net emf." },
          {
            part: "b",
            points: 2,
            description: "Finds current using total resistance.",
          },
        ]),
        commonErrors: [
          "Adding opposing emfs.",
          "Subtracting internal resistances.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The cells oppose each other, so emfs subtract.",
            math: L`E_\text{net}=2.0-1.0=1.0\ \mathrm V`,
          },
          {
            part: "b",
            explanation:
              "The two internal resistances and external resistance are in series.",
            math: L`I=\frac{1.0}{4.0+0.50+0.50}=0.20\ \mathrm A`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Four identical cells, each of emf $1.5\text{ V}$ and internal resistance $0.20\ \Omega$, are connected in series with an external resistor $5.2\ \Omega$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "cells_in_series",
          "terminal_voltage",
          "internal_resistance",
        ],
        parts: [
          part(
            "a",
            "Find the equivalent emf and equivalent internal resistance.",
            2,
          ),
          part("b", "Find the current in the circuit.", 2),
          part("c", "Find the terminal voltage of the battery of cells.", 1),
        ],
        hints: [
          "In series, emfs add and internal resistances add.",
          "Use total resistance including internal resistance.",
          "Terminal voltage of the battery is the external-resistor voltage.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds equivalent emf and internal resistance.",
          },
          {
            part: "b",
            points: 2,
            description: "Finds current through the circuit.",
          },
          { part: "c", points: 1, description: "Finds terminal voltage." },
        ]),
        commonErrors: [
          "Ignoring total internal resistance.",
          "Reporting emf instead of terminal voltage.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For four identical series cells, both emf and internal resistance add.",
            math: L`E_\text{eq}=4(1.5)=6.0\ \mathrm V,\qquad r_\text{eq}=4(0.20)=0.80\ \Omega`,
          },
          {
            part: "b",
            explanation: "Use total circuit resistance.",
            math: L`I=\frac{6.0}{5.2+0.80}=1.0\ \mathrm A`,
          },
          {
            part: "c",
            explanation: "Terminal voltage is the external voltage.",
            math: L`V=IR=(1.0)(5.2)=5.2\ \mathrm V`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The terminal voltage graph of a cell is shown. The same cell is then connected to an external resistor of $3.6\ \Omega$.`,
        difficulty: 4,
        figure: cellTerminalFigure,
        calculatorAllowed: true,
        skillTags: [
          "terminal_voltage_graph",
          "internal_resistance",
          "case_based",
        ],
        parts: [
          part("a", "Find the emf of the cell from the graph.", 1),
          part("b", "Find the internal resistance of the cell.", 2),
          part(
            "c",
            "Find the current and terminal voltage when connected to the 3.6 ohm resistor.",
            2,
          ),
        ],
        hints: [
          "The y-intercept of the graph gives emf.",
          "The magnitude of the slope gives internal resistance.",
          "Use R + r for the full circuit resistance.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Reads emf from graph." },
          {
            part: "b",
            points: 2,
            description: "Finds internal resistance from slope.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Uses external and internal resistance to find current and terminal voltage.",
          },
        ]),
        commonErrors: [
          "Reading terminal voltage at a current as emf.",
          "Using graph slope with the wrong sign instead of magnitude for r.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The intercept at I = 0 is the emf.",
            math: L`E=2.0\ \mathrm V`,
          },
          {
            part: "b",
            explanation: "Use the drop in terminal voltage per ampere.",
            math: L`r=\frac{2.0-1.2}{2.0}=0.40\ \Omega`,
          },
          {
            part: "c",
            explanation: "Use total resistance and then terminal voltage.",
            math: L`I=\frac{2.0}{3.6+0.40}=0.50\ \mathrm A,\qquad V=IR=(0.50)(3.6)=1.8\ \mathrm V`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Kirchhoff's Rules and Circuit Analysis",
    subtopic:
      "Junction rule, loop rule, mixed resistor circuits, and two-loop equations.",
    mc: [
      {
        questionLatex: L`At a junction, currents $4\text{ A}$ and $2\text{ A}$ enter, while $3\text{ A}$ leaves through one branch. The current in the fourth branch is`,
        difficulty: 2,
        skillTags: ["kirchhoff_junction_rule"],
        choices: [
          "$1\\text{ A}$ entering",
          "$1\\text{ A}$ leaving",
          "$3\\text{ A}$ entering",
          "$3\\text{ A}$ leaving",
        ],
        correctLetter: "D",
        rationales: {
          A: "This subtracts only one entering current from the leaving current.",
          B: "The direction is plausible only if total entering were 4 A, but it is 6 A.",
          C: "The magnitude is right but the direction is wrong.",
        },
        hints: [
          "Total current entering must equal total current leaving.",
          "Entering current is 4 A + 2 A.",
          "The remaining leaving current must make the totals equal.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply Kirchhoff's junction rule.",
            math: L`4+2=3+I`,
          },
          {
            step: 2,
            explanation: "Solve for the unknown branch current.",
            math: L`I=3\ \mathrm A\text{ leaving}`,
          },
        ],
      },
      {
        questionLatex: L`A single loop has a $10\text{ V}$ cell and a $2\text{ V}$ cell opposing it. The total resistance in the loop is $4\ \Omega$. The current is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["kirchhoff_loop_rule", "opposing_cells"],
        choices: [
          L`$2.0\text{ A}$`,
          L`$3.0\text{ A}$`,
          L`$0.50\text{ A}$`,
          L`$12\text{ A}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This adds the opposing emfs instead of subtracting them.",
          C: "This uses only the smaller emf.",
          D: "This treats emf as current without dividing by resistance.",
        },
        hints: [
          "Opposing emfs subtract.",
          "Net emf is 10 V - 2 V.",
          "Divide by total resistance.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find net emf around the loop.",
            math: L`E_\text{net}=10-2=8\ \mathrm V`,
          },
          {
            step: 2,
            explanation: "Apply Ohm's law to the loop.",
            math: L`I=\frac{8}{4}=2.0\ \mathrm A`,
          },
        ],
      },
      {
        questionLatex: L`A $2\ \Omega$ resistor is in series with a parallel combination of $3\ \Omega$ and $6\ \Omega$ across a $12\text{ V}$ battery. The current through the $3\ \Omega$ resistor is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["series_parallel_resistors", "current_division"],
        choices: [
          L`$1.0\text{ A}$`,
          L`$1.5\text{ A}$`,
          L`$2.0\text{ A}$`,
          L`$3.0\text{ A}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the current through the 6 ohm branch, not the 3 ohm branch.",
          B: "This is the total current before it splits, not the current through the 3 ohm resistor.",
          D: "This ignores the series 2 ohm resistor and puts the full 12 V across the 3 ohm resistor.",
        },
        hints: [
          "First combine the 3 ohm and 6 ohm parallel branch.",
          "Find voltage across the parallel branch.",
          "Use that branch voltage across 3 ohm.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The parallel combination is 2 ohm, so total resistance is 4 ohm.",
            math: L`R_p=\frac{3\times6}{3+6}=2\ \Omega,\qquad R_\text{total}=4\ \Omega`,
          },
          {
            step: 2,
            explanation:
              "Total current is 3 A, so the parallel branch has 6 V across it.",
            math: L`I_\text{total}=12/4=3\ \mathrm A,\qquad V_p=(3)(2)=6\ \mathrm V`,
          },
          {
            step: 3,
            explanation: "The current through 3 ohm is 6 V divided by 3 ohm.",
            math: L`I_3=\frac{6}{3}=2.0\ \mathrm A`,
          },
        ],
      },
      {
        questionLatex: L`Kirchhoff's loop rule is a statement of`,
        difficulty: 2,
        skillTags: ["kirchhoff_loop_rule", "conceptual_circuit"],
        choices: [
          "conservation of charge at a junction",
          "conservation of energy around a closed loop",
          "conservation of mass in a conductor",
          "quantisation of charge in a circuit",
        ],
        correctLetter: "B",
        rationales: {
          A: "That is Kirchhoff's junction rule, not loop rule.",
          C: "Mass conservation is not the electrical statement used in loop analysis.",
          D: "Charge quantisation is a separate microscopic property.",
        },
        hints: [
          "The loop rule adds potential rises and drops around a closed path.",
          "A charge returning to the same point cannot have net energy change.",
          "This is an energy statement.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Around a closed loop, the algebraic sum of potential changes is zero.",
            math: L`\sum \Delta V=0`,
          },
          {
            step: 2,
            explanation: "This is conservation of energy.",
          },
        ],
      },
      {
        questionLatex: L`For the two-loop circuit shown, mesh equations are $3I_1-I_2=7$ and $-I_1+4I_2=5$. The current through the shared $1\ \Omega$ resistor is`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: kirchhoffMeshFigure,
        skillTags: ["kirchhoff_loop_rule", "mesh_current"],
        choices: [
          L`$5\text{ A}$`,
          L`$3\text{ A}$`,
          L`$2\text{ A}$`,
          L`$1\text{ A}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This adds the mesh currents, but the shared branch carries their difference.",
          B: "This is I1, not the shared-resistor current.",
          C: "This is I2, not the shared-resistor current.",
        },
        hints: [
          "Solve the two simultaneous equations.",
          "The shared branch is traversed in opposite directions by the two mesh currents.",
          "Use the difference of the mesh currents.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Solve the mesh equations.",
            math: L`I_1=3\ \mathrm A,\qquad I_2=2\ \mathrm A`,
          },
          {
            step: 2,
            explanation: "The shared resistor current is the difference.",
            math: L`I_\text{shared}=I_1-I_2=1\ \mathrm A`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`At a junction, currents $1.5\text{ A}$ and $2.5\text{ A}$ enter and one current of $1.0\text{ A}$ leaves. Find the other leaving current.`,
        difficulty: 2,
        skillTags: ["kirchhoff_junction_rule"],
        parts: [part("a", "Find the unknown leaving current.", 2)],
        hints: [
          "Apply current entering = current leaving.",
          "Total entering current is 4.0 A.",
          "Subtract the known leaving current.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Applies junction rule and finds unknown current.",
          },
        ]),
        commonErrors: [
          "Adding all currents without directions.",
          "Writing the current as entering instead of leaving.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Total current entering equals total current leaving.",
            math: L`1.5+2.5=1.0+I\Rightarrow I=3.0\ \mathrm A`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A loop contains a $6\text{ V}$ cell, a $2\text{ V}$ opposing cell, and resistors $1\ \Omega$, $2\ \Omega$, and $5\ \Omega$ in series.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["kirchhoff_loop_rule", "series_resistance"],
        parts: [
          part("a", "Find the current in the loop.", 2),
          part(
            "b",
            "State the direction of current relative to the stronger cell.",
            1,
          ),
        ],
        hints: [
          "Opposing emfs subtract.",
          "Series resistances add.",
          "Current direction is driven by the stronger cell.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds loop current." },
          {
            part: "b",
            points: 1,
            description: "States direction due to stronger cell.",
          },
        ]),
        commonErrors: [
          "Adding opposing emfs.",
          "Forgetting one of the series resistors.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The net emf is 4 V and total resistance is 8 ohm.",
            math: L`I=\frac{6-2}{1+2+5}=\frac{4}{8}=0.50\ \mathrm A`,
          },
          {
            part: "b",
            explanation:
              "The current is in the direction in which the 6 V cell drives positive charge.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $12\text{ V}$ battery is connected to a $4\ \Omega$ resistor in series with a parallel combination of $6\ \Omega$ and $3\ \Omega$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["series_parallel_resistors", "kirchhoff_junction_rule"],
        parts: [
          part("a", "Find the total current drawn from the battery.", 2),
          part("b", "Find the currents in the 6 ohm and 3 ohm branches.", 2),
        ],
        hints: [
          "First reduce the parallel branch.",
          "Find voltage across the parallel branch.",
          "Use that same voltage for both branch currents.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds total current." },
          { part: "b", points: 2, description: "Finds both branch currents." },
        ]),
        commonErrors: [
          "Putting 12 V directly across each parallel resistor before accounting for the series resistor.",
          "Making branch currents equal despite unequal branch resistances.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The parallel branch is 2 ohm, so total resistance is 6 ohm.",
            math: L`R_p=\frac{6\times3}{6+3}=2\ \Omega,\qquad I=\frac{12}{4+2}=2.0\ \mathrm A`,
          },
          {
            part: "b",
            explanation: "Voltage across the parallel branch is 4 V.",
            math: L`V_p=I R_p=(2.0)(2)=4\ \mathrm V`,
          },
          {
            part: "b",
            explanation: "Find each branch current.",
            math: L`I_6=\frac{4}{6}=\frac{2}{3}\ \mathrm A,\qquad I_3=\frac{4}{3}\ \mathrm A`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use Kirchhoff's rules for the two-loop circuit shown. Mesh currents $I_1$ and $I_2$ are taken clockwise as marked.`,
        difficulty: 5,
        calculatorAllowed: true,
        figure: kirchhoffMeshFigure,
        skillTags: ["kirchhoff_loop_rule", "mesh_current"],
        parts: [
          part("a", "Write the two mesh equations.", 2),
          part("b", "Solve for $I_1$ and $I_2$.", 2),
          part(
            "c",
            "Find the magnitude and direction of current through the shared resistor.",
            1,
          ),
        ],
        hints: [
          "The shared 1 ohm resistor has current I1 - I2 in the left-loop direction.",
          "Use voltage rises from the two cells as 7 V and 5 V.",
          "Solve the simultaneous equations.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Writes correct mesh equations.",
          },
          { part: "b", points: 2, description: "Solves currents correctly." },
          {
            part: "c",
            points: 1,
            description: "Finds shared-resistor current and direction.",
          },
        ]),
        commonErrors: [
          "Adding I1 and I2 in the shared branch.",
          "Using the same sign for the shared resistor in both equations.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Writing KVL for the left and right meshes gives:",
            math: L`3I_1-I_2=7,\qquad -I_1+4I_2=5`,
          },
          {
            part: "b",
            explanation: "Solve the equations simultaneously.",
            math: L`I_1=3.0\ \mathrm A,\qquad I_2=2.0\ \mathrm A`,
          },
          {
            part: "c",
            explanation:
              "The shared resistor current is I1 - I2, so it follows the direction of I1 through that branch.",
            math: L`I_\text{shared}=3.0-2.0=1.0\ \mathrm A`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student builds a circuit in which a $10\text{ V}$ supply feeds a $2\ \Omega$ resistor and then reaches a junction. From the junction, one branch has $4\ \Omega$ and the other has $6\ \Omega$, after which the branches rejoin.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "series_parallel_resistors",
          "kirchhoff_junction_rule",
          "electrical_power",
        ],
        parts: [
          part(
            "a",
            "Find the equivalent resistance of the parallel branch.",
            1,
          ),
          part("b", "Find the total current from the supply.", 2),
          part("c", "Find the power dissipated in the 2 ohm resistor.", 2),
        ],
        hints: [
          "Reduce the parallel branch first.",
          "Then add the series 2 ohm resistor.",
          L`Power in the 2 ohm resistor is $I^2R$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds parallel equivalent." },
          { part: "b", points: 2, description: "Finds total current." },
          {
            part: "c",
            points: 2,
            description: "Finds power in series resistor.",
          },
        ]),
        commonErrors: [
          "Adding the 4 ohm and 6 ohm branch resistors directly.",
          "Using branch current instead of total current through the series resistor.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Combine the parallel branch.",
            math: L`R_p=\frac{4\times6}{4+6}=2.4\ \Omega`,
          },
          {
            part: "b",
            explanation: "Add the series resistor and find supply current.",
            math: L`R_\text{total}=2.0+2.4=4.4\ \Omega,\qquad I=\frac{10}{4.4}=2.27\ \mathrm A`,
          },
          {
            part: "c",
            explanation: "The series resistor carries the total current.",
            math: L`P=I^2R=(2.27)^2(2.0)\approx10.3\ \mathrm W`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Wheatstone Bridge and Mixed Current-Electricity Problems",
    subtopic:
      "Balanced bridges, equivalent resistance, and current-electricity synthesis.",
    mc: [
      {
        questionLatex: L`A Wheatstone bridge has arms $P=2\ \Omega$, $Q=3\ \Omega$, and $R=4\ \Omega$. For balance, the fourth arm $S$ must be`,
        difficulty: 2,
        skillTags: ["wheatstone_bridge"],
        choices: [
          L`$4\ \Omega$`,
          L`$6\ \Omega$`,
          L`$8\ \Omega$`,
          L`$12\ \Omega$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This sets S equal to R instead of using the bridge ratio.",
          C: "This uses multiplication without the correct ratio.",
          D: "This doubles the correct value.",
        },
        hints: [
          L`For balance, $P/Q=R/S$.`,
          "Substitute the three known arms.",
          "Solve for S.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the Wheatstone balance condition.",
            math: L`\frac{2}{3}=\frac{4}{S}\Rightarrow S=6\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`In a balanced Wheatstone bridge, the current through the galvanometer is`,
        difficulty: 2,
        skillTags: ["wheatstone_bridge", "conceptual_circuit"],
        choices: [
          "maximum",
          "equal to the main current",
          "half the main current",
          "zero",
        ],
        correctLetter: "D",
        rationales: {
          A: "At balance, the galvanometer branch has no potential difference across it.",
          B: "The main current divides through the arms; it does not flow through the galvanometer at balance.",
          C: "There is no galvanometer current at balance.",
        },
        hints: [
          "Balance means the two galvanometer terminals are at the same potential.",
          "No potential difference means no current through the galvanometer.",
          "This is the null condition.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a balanced bridge, the galvanometer terminals are equipotential.",
            math: L`I_G=0`,
          },
        ],
      },
      {
        questionLatex: L`A balanced Wheatstone bridge has arms $AB=5\ \Omega$, $BC=5\ \Omega$, $AD=10\ \Omega$, and $DC=10\ \Omega$. The supply is connected between $A$ and $C$, and the galvanometer is connected between $B$ and $D$. If the galvanometer resistance is $4\ \Omega$, the equivalent resistance between $A$ and $C$ is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["wheatstone_bridge", "equivalent_resistance"],
        choices: [
          L`$\frac{20}{3}\ \Omega$`,
          L`$4\ \Omega$`,
          L`$10\ \Omega$`,
          L`$30\ \Omega$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The galvanometer branch carries no current at balance, so its resistance is not the equivalent resistance.",
          C: "This keeps only one branch and ignores the other parallel branch.",
          D: "This adds both series branches instead of putting them in parallel.",
        },
        hints: [
          "At balance, ignore the galvanometer branch for equivalent resistance.",
          "The two side branches are 10 ohm and 20 ohm.",
          "Those two branches are in parallel between the supply terminals.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At balance, no current flows through the galvanometer.",
          },
          {
            step: 2,
            explanation: "The side branches are in parallel.",
            math: L`R_\text{eq}=(5+5)\parallel(10+10)=10\parallel20=\frac{20}{3}\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`If all four arms of a balanced Wheatstone bridge are multiplied by the same factor, the bridge`,
        difficulty: 2,
        skillTags: ["wheatstone_bridge", "ratio_reasoning"],
        choices: [
          "always becomes unbalanced",
          "has doubled galvanometer current",
          "remains balanced",
          "has zero equivalent resistance",
        ],
        correctLetter: "C",
        rationales: {
          A: "Multiplying all arms by the same factor does not change the ratios.",
          B: "At balance, galvanometer current remains zero.",
          D: "The equivalent resistance changes, but it does not become zero.",
        },
        hints: [
          "Bridge balance depends on a ratio of arms.",
          "Multiplying numerator and denominator of a ratio by the same factor does not change it.",
          "Therefore the balance condition is unchanged.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The condition P/Q = R/S is ratio-based.",
            math: L`\frac{kP}{kQ}=\frac{P}{Q},\qquad \frac{kR}{kS}=\frac{R}{S}`,
          },
          {
            step: 2,
            explanation: "So a balanced bridge remains balanced.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: In a balanced Wheatstone bridge, changing the galvanometer resistance does not affect the current in the main arms. Reason: The two ends of the galvanometer are at the same potential at balance.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "wheatstone_bridge"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The equipotential condition is exactly why no galvanometer current flows and its resistance becomes irrelevant.",
          C: "The reason is true at bridge balance.",
          D: "The assertion is true for a balanced bridge.",
        },
        hints: [
          "At balance, galvanometer current is zero.",
          "A zero-current branch does not affect current distribution in the arms.",
          "The reason states the equipotential condition.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At balance, the galvanometer branch has zero potential difference.",
            math: L`V_B=V_D\Rightarrow I_G=0`,
          },
          {
            step: 2,
            explanation:
              "Since no current flows through that branch, changing its resistance does not affect the main-arm currents.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A Wheatstone bridge has $P=4\ \Omega$, $Q=6\ \Omega$, and $R=12\ \Omega$. Find $S$ for balance.`,
        difficulty: 2,
        skillTags: ["wheatstone_bridge"],
        parts: [part("a", "Find the fourth arm resistance.", 2)],
        hints: [L`Use $P/Q=R/S$.`, "Substitute P, Q and R.", "Solve for S."],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Applies bridge balance condition.",
          },
        ]),
        commonErrors: [
          "Using P/R = Q/S instead of the stated bridge balance ratio.",
          "Cross-multiplying incorrectly.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the balance condition.",
            math: L`\frac{4}{6}=\frac{12}{S}\Rightarrow S=18\ \Omega`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a Wheatstone bridge, the arms are $AB=10\ \Omega$, $BC=15\ \Omega$, $AD=20\ \Omega$, and $DC=30\ \Omega$. A galvanometer connects $B$ and $D$.`,
        difficulty: 3,
        skillTags: ["wheatstone_bridge"],
        parts: [
          part("a", "Check whether the bridge is balanced.", 2),
          part("b", "State the current through the galvanometer.", 1),
        ],
        hints: [
          "Compare the two ratios of arms.",
          L`Check whether $10/15=20/30$.`,
          "At balance, galvanometer current is zero.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Checks balance condition." },
          { part: "b", points: 1, description: "States galvanometer current." },
        ]),
        commonErrors: [
          "Comparing differences instead of ratios.",
          "Assuming a galvanometer always has current.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Compare the two arm ratios.",
            math: L`\frac{10}{15}=\frac{2}{3},\qquad \frac{20}{30}=\frac{2}{3}`,
          },
          {
            part: "b",
            explanation:
              "The bridge is balanced, so no current flows through the galvanometer.",
            math: L`I_G=0`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For the Wheatstone bridge shown, find the equivalent resistance between A and C.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: wheatstoneBridgeFigure,
        skillTags: ["wheatstone_bridge", "equivalent_resistance"],
        parts: [
          part("a", "Show that the bridge is balanced.", 1),
          part("b", "Find the equivalent resistance between A and C.", 3),
        ],
        hints: [
          "Check the arm ratio condition.",
          "If balanced, the galvanometer branch carries no current.",
          "Then combine the two side branches in parallel.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Verifies bridge balance." },
          {
            part: "b",
            points: 3,
            description: "Finds equivalent resistance correctly.",
          },
        ]),
        commonErrors: [
          "Including the galvanometer resistance even though bridge is balanced.",
          "Adding the two side branches directly instead of putting them in parallel.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The arm ratios are equal.",
            math: L`\frac{2}{3}=\frac{4}{6}`,
          },
          {
            part: "b",
            explanation:
              "The galvanometer branch can be ignored. The two side branches are 5 ohm and 10 ohm.",
            math: L`R_\text{eq}=5\parallel10=\frac{5\times10}{5+10}=\frac{10}{3}\ \Omega`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A resistance thermometer is made one arm of a Wheatstone bridge. At $0^\circ\text{C}$ its resistance is $100\ \Omega$. Its temperature coefficient is $4.0\times10^{-3}\ ^\circ\text{C}^{-1}$. The bridge is balanced at an unknown temperature when the other three arms are $120\ \Omega$, $150\ \Omega$, and $160\ \Omega$ arranged so that $R_T/120=160/150$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["wheatstone_bridge", "temperature_dependence_resistance"],
        parts: [
          part("a", "Find the thermometer resistance at balance.", 2),
          part("b", "Find the temperature.", 3),
        ],
        hints: [
          "Use the given balance ratio first.",
          L`Then use $R_T=R_0(1+\alpha T)$ since the reference is 0 degrees C.`,
          "Solve for T after finding RT.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses bridge balance to find RT.",
          },
          {
            part: "b",
            points: 3,
            description: "Uses temperature dependence to find temperature.",
          },
        ]),
        commonErrors: [
          "Finding temperature before using the bridge balance condition.",
          "Using 120 ohm as the thermometer resistance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the balance condition provided in the stem.",
            math: L`\frac{R_T}{120}=\frac{160}{150}\Rightarrow R_T=128\ \Omega`,
          },
          {
            part: "b",
            explanation:
              "Relate resistance change to temperature rise from 0 degrees C.",
            math: L`128=100(1+4.0\times10^{-3}T)`,
          },
          {
            part: "b",
            explanation: "Solve for temperature.",
            math: L`1+0.004T=1.28\Rightarrow T=70^\circ\mathrm C`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sensor resistance $R_s$ is placed as one arm of a Wheatstone bridge arranged so that $R_s/10=30/15$ at balance. When the sensor is heated, its resistance increases slightly.`,
        difficulty: 3,
        skillTags: [
          "wheatstone_bridge",
          "temperature_dependence_resistance",
          "case_based",
        ],
        parts: [
          part(
            "a",
            "Find the initial sensor resistance if it is opposite the 30 ohm arm and the balance condition is $R_s/10=30/15$.",
            2,
          ),
          part(
            "b",
            "What happens to the galvanometer current after the sensor resistance increases?",
            1,
          ),
          part(
            "c",
            "Name the circuit principle that makes this small resistance change detectable.",
            1,
          ),
        ],
        hints: [
          "Start from the balance equation given.",
          "If the sensor resistance changes, the bridge is no longer balanced.",
          "The detector responds to a non-zero potential difference between the middle junctions.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds initial sensor resistance.",
          },
          {
            part: "b",
            points: 1,
            description:
              "States bridge becomes unbalanced and galvanometer deflects.",
          },
          {
            part: "c",
            points: 1,
            description: "Identifies Wheatstone bridge null/balance principle.",
          },
        ]),
        commonErrors: [
          "Assuming galvanometer current remains zero after sensor resistance changes.",
          "Using additive differences instead of bridge ratios.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the initial balance condition.",
            math: L`\frac{R_s}{10}=\frac{30}{15}=2\Rightarrow R_s=20\ \Omega`,
          },
          {
            part: "b",
            explanation:
              "Once the sensor resistance increases, the bridge is unbalanced and a galvanometer current appears.",
          },
          {
            part: "c",
            explanation:
              "This uses the Wheatstone bridge null condition: at balance the detector current is zero, and a small resistance change creates a detectable deflection.",
          },
        ],
      },
    ],
  },
];

export const currentElectricityTopics: Topic[] = topicSeeds.map(makeTopic);
