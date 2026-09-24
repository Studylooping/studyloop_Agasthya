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
const UNIT = "u3-magnetic-effects-current-magnetism";
const VERSION = "0.1.9";
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
  return `You chose ${choiceText}. Recheck the direction rule, the relevant magnetic-field formula, and whether the problem is about a charge, a wire, a coil, or a magnetic material.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_magnetism_reasoning"),
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
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_magnetic_formula_without_checking_geometry_direction_or_scope",
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "mixes_up_magnetic_force_field_torque_or_material_properties",
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

const circularLoopFieldFigure: ItemFigure = {
  type: "svg",
  title: "Magnetic field on the axis of a circular coil",
  description:
    "A circular coil is drawn in perspective with current direction marked and an axial field point P at the centre-side axis.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-loop" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
    <marker id="current-arrow-loop" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <ellipse cx="245" cy="180" rx="96" ry="142" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <path d="M245 322 C200 296 162 240 151 190" stroke="#2563eb" stroke-width="4" fill="none" marker-end="url(#current-arrow-loop)"/>
  <line x1="245" y1="180" x2="535" y2="180" stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-loop)"/>
  <line x1="245" y1="180" x2="340" y2="180" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
  <circle cx="245" cy="180" r="5" fill="#0f172a"/>
  <circle cx="450" cy="180" r="7" fill="#f97316"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="245" y="158">O</text>
    <text x="450" y="158">P</text>
    <text x="535" y="205">axis</text>
    <text x="205" y="52">current loop</text>
    <text x="296" y="171">R</text>
    <text x="350" y="205">x</text>
  </g>
</svg>`,
};

const velocitySelectorFigure: ItemFigure = {
  type: "svg",
  title: "Crossed electric and magnetic fields",
  description:
    "A positive ion enters crossed fields with velocity to the right, electric field downward, and magnetic field into the page.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <defs>
    <marker id="vel-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
    <marker id="efield-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#dc2626"/>
    </marker>
  </defs>
  <rect x="205" y="70" width="250" height="220" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <g stroke="#64748b" stroke-width="2">
    <line x1="205" y1="105" x2="455" y2="105"/>
    <line x1="205" y1="255" x2="455" y2="255"/>
  </g>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="18" text-anchor="middle">
    <text x="330" y="55">field region</text>
    <text x="328" y="187">B into page</text>
    <text x="330" y="214">&#215; &#215; &#215; &#215;</text>
  </g>
  <line x1="65" y1="180" x2="185" y2="180" stroke="#2563eb" stroke-width="4" marker-end="url(#vel-arrow)"/>
  <line x1="495" y1="105" x2="495" y2="255" stroke="#dc2626" stroke-width="4" marker-end="url(#efield-arrow)"/>
  <circle cx="112" cy="180" r="14" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="112" y="187" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#2563eb">+</text>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="125" y="158">v</text>
    <text x="520" y="188">E</text>
  </g>
</svg>`,
};

const parallelWiresFigure: ItemFigure = {
  type: "svg",
  title: "Parallel current-carrying wires",
  description:
    "Two long parallel wires carry currents in the same direction, separated by distance d.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="wire-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="210" y1="285" x2="210" y2="60" stroke="#2563eb" stroke-width="7" marker-end="url(#wire-arrow)"/>
  <line x1="430" y1="285" x2="430" y2="60" stroke="#2563eb" stroke-width="7" marker-end="url(#wire-arrow)"/>
  <line x1="210" y1="180" x2="430" y2="180" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="185" y="53">I<tspan baseline-shift="sub" font-size="12">1</tspan></text>
    <text x="455" y="53">I<tspan baseline-shift="sub" font-size="12">2</tspan></text>
    <text x="320" y="170">d</text>
  </g>
</svg>`,
};

const galvanometerConversionFigure: ItemFigure = {
  type: "svg",
  title: "Galvanometer conversion",
  description:
    "A moving-coil galvanometer is shown with either a small parallel shunt for an ammeter or a large series resistance for a voltmeter.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <g stroke="#334155" stroke-width="3" fill="none">
    <path d="M70 125 H180"/>
    <rect x="180" y="90" width="100" height="70" rx="8"/>
    <path d="M280 125 H385"/>
    <path d="M180 125 V210 H280 V125"/>
    <path d="M430 125 H500"/>
    <rect x="500" y="90" width="100" height="70" rx="8"/>
    <path d="M600 125 H670"/>
    <path d="M430 125 h20 l8 -16 l12 32 l12 -32 l12 32 l8 -16 h20"/>
  </g>
  <g stroke="#dc2626" stroke-width="3" fill="none">
    <path d="M205 210 h12 l8 -15 l12 30 l12 -30 l12 30 l8 -15 h12"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="230" y="132">G</text>
    <text x="230" y="238">small shunt S</text>
    <text x="230" y="70">ammeter conversion</text>
    <text x="550" y="132">G</text>
    <text x="480" y="102">large series R</text>
    <text x="550" y="70">voltmeter conversion</text>
  </g>
</svg>`,
};

const materialTemperatureFigure: ItemFigure = {
  type: "svg",
  title: "Magnetisation near Curie temperature",
  description:
    "A graph of magnetisation against temperature for a ferromagnetic material, dropping sharply near the Curie temperature.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="mat-axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="110" y1="260" x2="540" y2="260"/>
    <line x1="110" y1="200" x2="540" y2="200"/>
    <line x1="110" y1="140" x2="540" y2="140"/>
    <line x1="110" y1="80" x2="540" y2="80"/>
    <line x1="250" y1="285" x2="250" y2="60"/>
    <line x1="390" y1="285" x2="390" y2="60"/>
    <line x1="470" y1="285" x2="470" y2="60"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#mat-axis-arrow)">
    <line x1="110" y1="285" x2="560" y2="285"/>
    <line x1="110" y1="285" x2="110" y2="45"/>
  </g>
  <path d="M110 78 C190 82 270 88 345 115 C405 138 443 194 470 280" stroke="#2563eb" stroke-width="4" fill="none"/>
  <line x1="470" y1="285" x2="470" y2="70" stroke="#f97316" stroke-width="2.5" stroke-dasharray="8 7"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="570" y="308">T</text>
    <text x="80" y="50">M</text>
    <text x="470" y="310">T<tspan baseline-shift="sub" font-size="12">c</tspan></text>
  </g>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Magnetic Field Due to Currents",
    subtopic:
      "Oersted's experiment, Biot-Savart law, circular coils, Ampere's law, long straight conductors, and solenoids.",
    mc: [
      {
        questionLatex: L`A long straight wire carries $10\text{ A}$. The magnetic field at a point $5.0\text{ cm}$ from the wire is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["long_straight_wire_field", "ampere_law"],
        choices: [
          L`$8.0\times10^{-6}\text{ T}$`,
          L`$4.0\times10^{-5}\text{ T}$`,
          L`$2.0\times10^{-5}\text{ T}$`,
          L`$4.0\times10^{-4}\text{ T}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This misses the factor of current in the numerator.",
          C: L`This is half the correct value, usually from using $4\pi$ instead of $2\pi$ in the denominator.`,
          D: "This treats 5.0 cm as 0.005 m instead of 0.050 m.",
        },
        hints: [
          L`Use $B=\mu_0 I/(2\pi r)$ for a long straight conductor.`,
          L`Convert $5.0\text{ cm}$ to $0.050\text{ m}$.`,
          L`Use $\mu_0=4\pi\times10^{-7}\text{ T m A}^{-1}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute in the long-wire expression.",
            math: L`B=\frac{(4\pi\times10^{-7})(10)}{2\pi(0.050)}`,
          },
          {
            step: 2,
            explanation: "Simplify after cancelling pi.",
            math: L`B=4.0\times10^{-5}\ \mathrm T`,
          },
        ],
      },
      {
        questionLatex: L`A circular coil has $20$ turns, radius $0.10\text{ m}$, and current $5.0\text{ A}$. The magnetic field at its centre is approximately`,
        difficulty: 2,
        calculatorAllowed: true,
        figure: circularLoopFieldFigure,
        skillTags: ["biot_savart_law", "circular_loop_field"],
        choices: [
          L`$3.1\times10^{-4}\text{ T}$`,
          L`$1.3\times10^{-3}\text{ T}$`,
          L`$6.3\times10^{-4}\text{ T}$`,
          L`$6.3\times10^{-5}\text{ T}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the one-turn value multiplied by only half the required turns.",
          B: "This doubles the correct result, usually from using R instead of 2R incorrectly.",
          D: "This misses the factor of 20 turns.",
        },
        hints: [
          L`For $N$ turns, $B=N\mu_0 I/(2R)$ at the centre.`,
          "The turns multiply the field because the fields superpose.",
          "Keep the radius in metres.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the field at the centre of a circular coil.",
            math: L`B=\frac{N\mu_0 I}{2R}=\frac{20(4\pi\times10^{-7})(5.0)}{2(0.10)}`,
          },
          {
            step: 2,
            explanation: "Evaluate the result.",
            math: L`B=2\pi\times10^{-4}\ \mathrm T\approx6.3\times10^{-4}\ \mathrm T`,
          },
        ],
      },
      {
        questionLatex: L`An Amperian loop encloses three long wires carrying currents $4\text{ A}$ out of the page, $2\text{ A}$ into the page, and $5\text{ A}$ out of the page. Taking out of the page as positive, $\oint \vec B\cdot d\vec l$ equals`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["ampere_circuital_law", "enclosed_current"],
        choices: [L`$7\mu_0$`, L`$11\mu_0$`, L`$3\mu_0$`, L`$\mu_0/7$`],
        correctLetter: "A",
        rationales: {
          B: "This adds magnitudes and ignores the current directed into the page.",
          C: "This subtracts both outward currents from the inward current.",
          D: L`Ampere's law multiplies enclosed current by $\mu_0$; it does not divide by current.`,
        },
        hints: [
          L`Ampere's law gives $\oint \vec B\cdot d\vec l=\mu_0 I_\text{enclosed}$.`,
          "Use signs for currents through the loop.",
          "Add 4 A and 5 A, then subtract 2 A.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the signed enclosed current.",
            math: L`I_\text{enc}=4-2+5=7\ \mathrm A`,
          },
          {
            step: 2,
            explanation: "Apply Ampere's law.",
            math: L`\oint \vec B\cdot d\vec l=\mu_0(7)=7\mu_0`,
          },
        ],
      },
      {
        questionLatex: L`Inside a long straight solenoid carrying steady current, the magnetic field is best described as`,
        difficulty: 2,
        skillTags: ["solenoid_field", "qualitative_magnetism"],
        choices: [
          "zero everywhere inside the solenoid",
          "radially outward from the axis",
          "strong only at the centre and exactly zero near the ends",
          "nearly uniform and directed along the axis away from edge regions",
        ],
        correctLetter: "D",
        rationales: {
          A: "The field outside an ideal long solenoid is small; inside it is not zero.",
          B: "The field lines inside a solenoid are along the axis, not radially outward.",
          C: "A long solenoid has an approximately uniform interior field, not only a central spike.",
        },
        hints: [
          "Recall the field pattern of a current-carrying solenoid.",
          "Away from the ends, the field lines are nearly parallel.",
          "This topic is qualitative in the CBSE solenoid scope.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A long solenoid behaves like a nearly uniform magnetic-field region inside.",
          },
          {
            step: 2,
            explanation:
              "The field is directed along the solenoid axis; edge effects are ignored for a long solenoid.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: The magnetic field at the centre of a circular coil increases when the number of turns is increased, keeping current and radius fixed. Reason: The magnetic fields due to individual turns add by superposition.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "circular_loop_field"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the N factor in the coil field.",
          C: "Superposition is valid for the fields produced by different turns.",
          D: "The assertion is true because B is proportional to N for fixed I and R.",
        },
        hints: [
          L`For a coil, $B=N\mu_0I/(2R)$ at the centre.`,
          "Ask what the factor N represents physically.",
          "Fields from identical turns point in the same direction at the centre.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The field is proportional to the number of turns.",
            math: L`B\propto N\quad (I,R\text{ fixed})`,
          },
          {
            step: 2,
            explanation:
              "The proportionality arises because magnetic fields due to the turns superpose.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A long straight wire carries $8.0\text{ A}$. Find the magnetic field at a point $4.0\text{ cm}$ from the wire.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["long_straight_wire_field"],
        parts: [part("a", "Find the magnetic field magnitude.", 2)],
        hints: [
          L`Use $B=\mu_0I/(2\pi r)$.`,
          L`$4.0\text{ cm}=0.040\text{ m}$.`,
          "Cancel pi before calculating.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Uses the correct formula." },
          {
            part: "a",
            points: 1,
            description: "Substitutes SI units and obtains the field.",
          },
        ]),
        commonErrors: [
          "Using centimetres directly in the denominator.",
          "Using the circular-loop formula instead of the straight-wire formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For a long straight wire:",
            math: L`B=\frac{\mu_0I}{2\pi r}=\frac{(4\pi\times10^{-7})(8.0)}{2\pi(0.040)}=4.0\times10^{-5}\ \mathrm T`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A circular coil has $50$ turns, radius $0.20\text{ m}$, and current $0.40\text{ A}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: circularLoopFieldFigure,
        skillTags: ["biot_savart_law", "circular_loop_field"],
        parts: [
          part("a", "Find the magnetic field at the centre of the coil.", 2),
          part("b", "State the new field if the current is doubled.", 1),
        ],
        hints: [
          L`Use $B=N\mu_0I/(2R)$.`,
          "Doubling current doubles the field.",
          "The turns and radius remain unchanged.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes the centre field correctly.",
          },
          {
            part: "b",
            points: 1,
            description: "Uses proportionality to current.",
          },
        ]),
        commonErrors: [
          "Forgetting the number of turns.",
          "Doubling the radius instead of the current in part b.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "At the centre of an N-turn coil:",
            math: L`B=\frac{50(4\pi\times10^{-7})(0.40)}{2(0.20)}=2\pi\times10^{-5}\ \mathrm T\approx6.3\times10^{-5}\ \mathrm T`,
          },
          {
            part: "b",
            explanation: "Since B is proportional to I, the field doubles.",
            math: L`B'=1.26\times10^{-4}\ \mathrm T`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student sketches field lines for a long straight solenoid carrying steady current.`,
        difficulty: 3,
        skillTags: ["solenoid_field", "qualitative_magnetism"],
        parts: [
          part(
            "a",
            "Describe the magnetic field inside the solenoid, away from the ends.",
            1,
          ),
          part(
            "b",
            "What happens to the direction of the field if the current is reversed?",
            1,
          ),
          part(
            "c",
            "Why is the field outside a long solenoid comparatively weak?",
            1,
          ),
        ],
        hints: [
          "Use the field-line pattern of a long current-carrying solenoid.",
          "Reversing current reverses the magnetic polarity.",
          "Think about cancellation of field contributions outside the solenoid.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that the field inside is nearly uniform and along the axis.",
          },
          {
            part: "b",
            points: 1,
            description: "States that the magnetic field direction reverses.",
          },
          {
            part: "c",
            points: 1,
            description: "Gives a field-line or superposition reason.",
          },
        ]),
        commonErrors: [
          "Drawing radial field lines inside the solenoid.",
          "Saying reversing current changes only the strength, not the direction.",
          "Treating the outside field as exactly the same as the inside field.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Inside a long solenoid and away from its ends, the magnetic field is nearly uniform and directed along the solenoid axis.",
          },
          {
            part: "b",
            explanation:
              "If the current is reversed, the direction of the magnetic field also reverses.",
          },
          {
            part: "c",
            explanation:
              "Outside a long solenoid, fields from different turns nearly cancel, so the external field is small compared with the nearly uniform interior field.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use Ampere's circuital law to obtain the magnetic field at distance $r$ from a very long straight wire carrying current $I$. Then use the result to compare fields at $r$ and $2r$.`,
        difficulty: 4,
        skillTags: ["ampere_circuital_law", "derivation"],
        parts: [
          part(
            "a",
            "Choose a suitable Amperian loop and write Ampere's law.",
            2,
          ),
          part("b", "Derive the expression for B at distance r.", 2),
          part("c", "Find the ratio B(r) : B(2r).", 1),
        ],
        hints: [
          "Use a circular Amperian loop centred on the wire.",
          "By symmetry, B is constant on the loop and tangential to it.",
          L`The circumference of the loop is $2\pi r$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Chooses circular loop and writes Ampere's law.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Uses symmetry to derive the long-wire field expression.",
          },
          {
            part: "c",
            points: 1,
            description: "Uses inverse proportionality with distance.",
          },
        ]),
        commonErrors: [
          "Using a loop that does not exploit symmetry.",
          "Treating B as radial instead of tangential.",
          "Forgetting that B varies inversely with r.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Take a circular Amperian loop of radius r around the wire.",
            math: L`\oint \vec B\cdot d\vec l=\mu_0 I`,
          },
          {
            part: "b",
            explanation: "On this loop, B is constant and tangential.",
            math: L`B(2\pi r)=\mu_0I\Rightarrow B=\frac{\mu_0I}{2\pi r}`,
          },
          {
            part: "c",
            explanation: "Because B is inversely proportional to r:",
            math: L`B(r):B(2r)=2:1`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A physics group studies the magnetic field around a long vertical wire carrying current upward. A small compass is placed at different distances from the wire.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["oersted_experiment", "right_hand_rule", "field_variation"],
        parts: [
          part(
            "a",
            "State the shape of magnetic field lines around the wire.",
            1,
          ),
          part(
            "b",
            "If the current is doubled, how does the magnetic field at a fixed point change?",
            1,
          ),
          part(
            "c",
            "If the distance from the wire is doubled at fixed current, how does the field change?",
            1,
          ),
          part(
            "d",
            "For current upward, state the rule used to find the direction of the compass deflection.",
            2,
          ),
        ],
        hints: [
          "Recall Oersted's observation around a current-carrying wire.",
          L`For a long straight wire, $B\propto I/r$.`,
          "Use the right-hand thumb rule for direction.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States concentric circular field lines.",
          },
          { part: "b", points: 1, description: "States field doubles." },
          { part: "c", points: 1, description: "States field halves." },
          {
            part: "d",
            points: 2,
            description: "Names and applies the right-hand thumb rule.",
          },
        ]),
        commonErrors: [
          "Drawing straight radial magnetic field lines around the wire.",
          "Using left-hand rule instead of right-hand thumb rule for field direction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The magnetic field lines around a long straight current-carrying wire are concentric circles centred on the wire.",
          },
          {
            part: "b",
            explanation: "The field is directly proportional to current.",
            math: L`B\propto I\Rightarrow B' = 2B`,
          },
          {
            part: "c",
            explanation: "The field is inversely proportional to distance.",
            math: L`B\propto \frac1r\Rightarrow B'=\frac{B}{2}`,
          },
          {
            part: "d",
            explanation:
              "Use the right-hand thumb rule: point the right thumb along the current; curled fingers give the magnetic-field direction.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Motion of Charges in Magnetic and Electric Fields",
    subtopic:
      "Lorentz force, circular motion in magnetic fields, crossed fields, and velocity selection.",
    mc: [
      {
        questionLatex: L`A positive charge moves to the right in a uniform magnetic field directed into the page. The magnetic force on it is`,
        difficulty: 3,
        skillTags: ["lorentz_force_direction", "right_hand_rule"],
        choices: ["to the left", "downward", "upward", "zero"],
        correctLetter: "C",
        rationales: {
          A: "The magnetic force is perpendicular to velocity, not opposite to velocity.",
          B: "This is the force direction for a negative charge in the same situation.",
          D: "The velocity is perpendicular to the field, so the magnetic force is not zero.",
        },
        hints: [
          L`Use $\vec F=q(\vec v\times\vec B)$ for a positive charge.`,
          "Right is +x and into the page is -z.",
          "Use the right-hand cross product.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For a positive charge, the direction is v cross B.",
            math: L`\hat i\times(-\hat k)=+\hat j`,
          },
          {
            step: 2,
            explanation: "The force is upward.",
          },
        ],
      },
      {
        questionLatex: L`A proton of speed $3.0\times10^6\text{ m s}^{-1}$ enters a uniform magnetic field of $0.50\text{ T}$ perpendicular to its velocity. Taking $m_p=1.67\times10^{-27}\text{ kg}$, the radius of its path is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["charged_particle_circular_motion", "lorentz_force"],
        choices: [
          L`$6.3\text{ cm}$`,
          L`$1.6\text{ cm}$`,
          L`$63\text{ cm}$`,
          L`$0.63\text{ mm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This overuses the magnetic field factor and makes the radius too small.",
          C: "This is a factor of 10 too large, usually from a power-of-ten slip.",
          D: "This treats the proton mass or charge power incorrectly.",
        },
        hints: [
          "Magnetic force supplies centripetal force.",
          L`Set $qvB=mv^2/r$.`,
          L`Use $q=1.6\times10^{-19}\text{ C}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Equate magnetic and centripetal force.",
            math: L`r=\frac{mv}{qB}`,
          },
          {
            step: 2,
            explanation: "Substitute the values.",
            math: L`r=\frac{(1.67\times10^{-27})(3.0\times10^6)}{(1.6\times10^{-19})(0.50)}=6.26\times10^{-2}\ \mathrm m`,
          },
          {
            step: 3,
            explanation: "Convert to centimetres.",
            math: L`r\approx6.3\text{ cm}`,
          },
        ],
      },
      {
        questionLatex: L`In a velocity selector, $E=3.0\times10^4\text{ V m}^{-1}$ and $B=2.0\times10^{-2}\text{ T}$. The undeflected speed is`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: velocitySelectorFigure,
        skillTags: ["velocity_selector", "crossed_fields"],
        choices: [
          L`$6.0\times10^2\text{ m s}^{-1}$`,
          L`$1.5\times10^3\text{ m s}^{-1}$`,
          L`$6.0\times10^5\text{ m s}^{-1}$`,
          L`$1.5\times10^6\text{ m s}^{-1}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This multiplies neither fields nor ratios correctly; the unit scale is far too small.",
          B: "This divides by B but loses a factor of 1000.",
          C: "This uses B/E or a partly inverted ratio.",
        },
        hints: [
          "For no deflection, electric and magnetic forces balance.",
          L`Use $qE=qvB$.`,
          L`So $v=E/B$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Balance the forces for an undeflected particle.",
            math: L`qE=qvB\Rightarrow v=\frac{E}{B}`,
          },
          {
            step: 2,
            explanation: "Substitute the fields.",
            math: L`v=\frac{3.0\times10^4}{2.0\times10^{-2}}=1.5\times10^6\ \mathrm{m\,s^{-1}}`,
          },
        ],
      },
      {
        questionLatex: L`The work done by a uniform magnetic field on a charged particle moving in it is zero because the magnetic force is`,
        difficulty: 2,
        skillTags: ["magnetic_force_work", "conceptual_lorentz_force"],
        choices: [
          "always parallel to displacement",
          "always perpendicular to instantaneous velocity",
          "always equal to the electric force",
          "independent of charge",
        ],
        correctLetter: "B",
        rationales: {
          A: "A force parallel to displacement would generally do non-zero work.",
          C: "There need not be any electric force in this situation.",
          D: "Magnetic force is proportional to charge magnitude.",
        },
        hints: [
          L`Magnetic force is $q\vec v\times\vec B$.`,
          "A cross product is perpendicular to the velocity.",
          "Power is force dot velocity.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The magnetic force is perpendicular to velocity.",
            math: L`\vec F_B\cdot\vec v=0`,
          },
          {
            step: 2,
            explanation:
              "Therefore magnetic force changes direction of motion but not kinetic energy.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: A charged particle moving exactly parallel to a uniform magnetic field is not deflected by the magnetic field. Reason: The magnetic force contains the factor $\sin\theta$, where $\theta$ is the angle between velocity and magnetic field.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "lorentz_force"],
        choices: [
          "Assertion is true, but Reason is false.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: L`The reason is true because magnetic force magnitude is $qvB\sin\theta$.`,
          B: L`The reason directly explains the zero force for $\theta=0^\circ$.`,
          D: "The assertion is true for exactly parallel motion.",
        },
        hints: [
          L`Use $F=qvB\sin\theta$.`,
          L`For parallel motion, $\theta=0^\circ$.`,
          "A zero magnetic force means no magnetic deflection.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For parallel motion:",
            math: L`\theta=0^\circ,\qquad F=qvB\sin0^\circ=0`,
          },
          {
            step: 2,
            explanation:
              "Both statements are true and the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An alpha particle of charge $3.2\times10^{-19}\text{ C}$ moves with speed $2.0\times10^6\text{ m s}^{-1}$ perpendicular to a $0.25\text{ T}$ magnetic field. Find the magnetic force on it.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["lorentz_force_magnitude"],
        parts: [part("a", "Find the force magnitude.", 2)],
        hints: [
          L`Use $F=qvB\sin\theta$.`,
          "The velocity is perpendicular to the field.",
          L`So $\sin\theta=1$.`,
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Uses magnetic-force formula." },
          {
            part: "a",
            points: 1,
            description: "Substitutes and calculates force correctly.",
          },
        ]),
        commonErrors: [
          "Using electron charge instead of alpha-particle charge.",
          "Forgetting the perpendicular condition.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The particle moves perpendicular to the magnetic field.",
            math: L`F=qvB=(3.2\times10^{-19})(2.0\times10^6)(0.25)=1.6\times10^{-13}\ \mathrm N`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A proton enters a uniform magnetic field of $0.20\text{ T}$ at right angles with speed $4.8\times10^5\text{ m s}^{-1}$. Use $m_p=1.67\times10^{-27}\text{ kg}$ and $q=1.6\times10^{-19}\text{ C}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "charged_particle_circular_motion",
          "period_in_magnetic_field",
        ],
        parts: [
          part("a", "Find the radius of the circular path.", 2),
          part("b", "Find the time period of revolution.", 2),
        ],
        hints: [
          L`Use $r=mv/(qB)$.`,
          L`Use $T=2\pi m/(qB)$.`,
          "The time period is independent of speed in this ideal case.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds radius correctly." },
          { part: "b", points: 2, description: "Finds time period correctly." },
        ]),
        commonErrors: [
          "Using qvB as centripetal force but not solving for r correctly.",
          "Including speed in the final time-period expression.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The magnetic force provides centripetal force.",
            math: L`r=\frac{mv}{qB}=\frac{(1.67\times10^{-27})(4.8\times10^5)}{(1.6\times10^{-19})(0.20)}\approx2.5\times10^{-2}\ \mathrm m`,
          },
          {
            part: "b",
            explanation: "Use the cyclotron-period expression.",
            math: L`T=\frac{2\pi m}{qB}=\frac{2\pi(1.67\times10^{-27})}{(1.6\times10^{-19})(0.20)}\approx3.3\times10^{-7}\ \mathrm s`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A beam of positive ions passes undeflected through crossed fields. The electric field is $6.0\times10^3\text{ V m}^{-1}$ and the magnetic field is $2.0\times10^{-2}\text{ T}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: velocitySelectorFigure,
        skillTags: ["velocity_selector", "crossed_fields"],
        parts: [
          part("a", "Find the speed of ions that pass undeflected.", 2),
          part(
            "b",
            "If an ion has lower speed, which force is larger in magnitude?",
            1,
          ),
        ],
        hints: [
          "For no deflection, electric force equals magnetic force.",
          L`Use $v=E/B$.`,
          L`Magnetic force $qvB$ decreases when speed is lower.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds velocity selector speed correctly.",
          },
          {
            part: "b",
            points: 1,
            description: "Compares electric and magnetic force magnitudes.",
          },
        ]),
        commonErrors: [
          "Using v = B/E instead of E/B.",
          "Assuming electric force depends on speed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For an undeflected path:",
            math: L`qE=qvB\Rightarrow v=\frac{E}{B}=\frac{6.0\times10^3}{2.0\times10^{-2}}=3.0\times10^5\ \mathrm{m\,s^{-1}}`,
          },
          {
            part: "b",
            explanation:
              "At lower speed, qvB is smaller while qE is unchanged, so the electric force is larger.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A charged particle of mass $m$ and charge $q$ enters a uniform magnetic field $B$ perpendicular to its velocity $v$. Derive the radius and time period of the path. Then state what changes when speed is doubled.`,
        difficulty: 5,
        skillTags: ["charged_particle_circular_motion", "derivation"],
        parts: [
          part("a", "Derive the radius of the path.", 2),
          part("b", "Derive the time period.", 2),
          part(
            "c",
            "State the effect of doubling speed on radius and period.",
            1,
          ),
        ],
        hints: [
          "The magnetic force is perpendicular and acts as centripetal force.",
          L`Set $qvB=mv^2/r$.`,
          L`Use $T=2\pi r/v$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Derives r = mv/(qB).",
          },
          {
            part: "b",
            points: 2,
            description: "Derives the magnetic-period expression.",
          },
          {
            part: "c",
            points: 1,
            description: "States radius doubles and period is unchanged.",
          },
        ]),
        commonErrors: [
          "Using electric force instead of magnetic force.",
          "Leaving speed in the time-period expression.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Equate magnetic force and centripetal force.",
            math: L`qvB=\frac{mv^2}{r}\Rightarrow r=\frac{mv}{qB}`,
          },
          {
            part: "b",
            explanation: "Use circumference divided by speed.",
            math: L`T=\frac{2\pi r}{v}=\frac{2\pi}{v}\cdot\frac{mv}{qB}=\frac{2\pi m}{qB}`,
          },
          {
            part: "c",
            explanation:
              "When speed is doubled, radius doubles, but the time period remains unchanged.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In a mass-filter experiment, positive ions enter a region with velocity to the right. The electric field is downward and the magnetic field is into the page, as shown. The fields have magnitudes $E=4.0\times10^4\text{ V m}^{-1}$ and $B=5.0\times10^{-2}\text{ T}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: velocitySelectorFigure,
        skillTags: [
          "velocity_selector",
          "lorentz_force_direction",
          "case_based",
        ],
        parts: [
          part("a", "Find the speed for which the ion passes undeflected.", 2),
          part(
            "b",
            "For a faster positive ion, compare the magnetic and electric force magnitudes.",
            1,
          ),
          part(
            "c",
            "For a faster positive ion, state the direction of deflection.",
            2,
          ),
        ],
        hints: [
          "For the shown directions, magnetic force on a positive ion is upward.",
          "Undeflected motion requires qE = qvB.",
          "For a faster ion, qvB becomes larger while qE stays fixed.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Finds undeflected speed." },
          {
            part: "b",
            points: 1,
            description:
              "Identifies magnetic force as larger for higher speed.",
          },
          {
            part: "c",
            points: 2,
            description: "States upward deflection with correct reasoning.",
          },
        ]),
        commonErrors: [
          "Forgetting the sign of the positive ion.",
          "Saying faster ions have larger electric force.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Balance electric and magnetic forces.",
            math: L`v=\frac{E}{B}=\frac{4.0\times10^4}{5.0\times10^{-2}}=8.0\times10^5\ \mathrm{m\,s^{-1}}`,
          },
          {
            part: "b",
            explanation:
              "For higher speed, qvB is greater than qE, so the magnetic force is larger.",
          },
          {
            part: "c",
            explanation:
              "For a positive ion moving right with B into the page, magnetic force is upward. Since it is larger for a faster ion, the ion deflects upward.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Force on Current-Carrying Conductors",
    subtopic:
      "Magnetic force on a conductor, Fleming's left-hand rule, force between parallel currents, and the ampere.",
    mc: [
      {
        questionLatex: L`A straight wire of length $0.50\text{ m}$ carries $5.0\text{ A}$ perpendicular to a $0.40\text{ T}$ magnetic field. The force on the wire is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["force_on_current_carrying_conductor"],
        choices: [
          L`$0.10\text{ N}$`,
          L`$0.40\text{ N}$`,
          L`$2.5\text{ N}$`,
          L`$1.0\text{ N}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This drops either current or length from the product.",
          B: "This uses only B as if it were force.",
          C: "This omits the magnetic field factor.",
        },
        hints: [
          L`Use $F=BIL\sin\theta$.`,
          "The wire is perpendicular to the field.",
          L`So $\sin\theta=1$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the force formula for a straight conductor.",
            math: L`F=BIL=(0.40)(5.0)(0.50)=1.0\ \mathrm N`,
          },
        ],
      },
      {
        questionLatex: L`A current-carrying wire is placed exactly parallel to a uniform magnetic field. The magnetic force on the wire is`,
        difficulty: 2,
        skillTags: ["force_on_current_carrying_conductor", "angle_dependence"],
        choices: [L`$BIL$`, "zero", L`$BI/L$`, L`$BL/I$`],
        correctLetter: "B",
        rationales: {
          A: "BIL is the maximum force for a perpendicular wire.",
          C: "This expression is dimensionally wrong and ignores the angle.",
          D: "This is not the magnetic-force formula.",
        },
        hints: [
          L`Use $F=BIL\sin\theta$.`,
          L`Parallel means $\theta=0^\circ$.`,
          L`$\sin0^\circ=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a wire parallel to the field:",
            math: L`F=BIL\sin0^\circ=0`,
          },
        ],
      },
      {
        questionLatex: L`Two long parallel wires carry currents in the same direction. The wires`,
        difficulty: 3,
        figure: parallelWiresFigure,
        skillTags: ["parallel_current_force", "direction_rule"],
        choices: [
          "attract each other",
          "repel each other",
          "exert no force because both currents are steady",
          "rotate about their midpoints",
        ],
        correctLetter: "A",
        rationales: {
          B: "Parallel currents in opposite directions repel; same-direction currents attract.",
          C: "Steady currents still produce magnetic fields and magnetic forces.",
          D: "The standard interaction is a mutual lateral force, not a torque about midpoints.",
        },
        hints: [
          "Recall the force rule for parallel currents.",
          "Same direction and opposite direction give different interactions.",
          "This result is used in the definition of ampere.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Two long parallel conductors carrying currents in the same direction attract each other.",
          },
        ],
      },
      {
        questionLatex: L`Two long parallel wires $2.0\text{ cm}$ apart carry currents $10\text{ A}$ and $5.0\text{ A}$ in the same direction. The force per unit length between them is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["parallel_current_force", "ampere_definition"],
        choices: [
          L`$5.0\times10^{-6}\text{ N m}^{-1}$`,
          L`$2.5\times10^{-4}\text{ N m}^{-1}$`,
          L`$5.0\times10^{-4}\text{ N m}^{-1}$`,
          L`$5.0\times10^{-3}\text{ N m}^{-1}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses centimetres as metres and makes the force too small.",
          B: L`This is half the correct result from a $4\pi/2\pi$ slip.`,
          D: "This treats 2.0 cm as 0.002 m instead of 0.020 m.",
        },
        hints: [
          L`Use $F/L=\mu_0I_1I_2/(2\pi d)$.`,
          L`$2.0\text{ cm}=0.020\text{ m}$.`,
          "Same direction tells attraction, not the magnitude sign.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the force per length between parallel currents.",
            math: L`\frac{F}{L}=\frac{(4\pi\times10^{-7})(10)(5.0)}{2\pi(0.020)}`,
          },
          {
            step: 2,
            explanation: "Evaluate the expression.",
            math: L`\frac{F}{L}=5.0\times10^{-4}\ \mathrm{N\,m^{-1}}`,
          },
        ],
      },
      {
        questionLatex: L`The SI ampere can be defined using the force between two long parallel conductors. For currents of $1\text{ A}$ in each conductor separated by $1\text{ m}$ in vacuum, the force per metre is`,
        difficulty: 3,
        skillTags: ["ampere_definition", "parallel_current_force"],
        choices: [
          L`$2\times10^{-5}\text{ N m}^{-1}$`,
          L`$4\pi\times10^{-7}\text{ N m}^{-1}$`,
          L`$1\text{ N m}^{-1}$`,
          L`$2\times10^{-7}\text{ N m}^{-1}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This is 100 times too large.",
          B: L`This is $\mu_0$, not $\mu_0/(2\pi)$ for this force per length.`,
          C: "The defining force is very small, not 1 N per metre.",
        },
        hints: [
          L`Use $F/L=\mu_0I_1I_2/(2\pi d)$.`,
          "Put both currents as 1 A and d = 1 m.",
          L`$\mu_0/(2\pi)=2\times10^{-7}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute the definition conditions.",
            math: L`\frac{F}{L}=\frac{4\pi\times10^{-7}}{2\pi}=2\times10^{-7}\ \mathrm{N\,m^{-1}}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A wire of length $0.40\text{ m}$ carrying $3.0\text{ A}$ is placed perpendicular to a $0.50\text{ T}$ magnetic field. Find the force on it.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["force_on_current_carrying_conductor"],
        parts: [part("a", "Find the force magnitude.", 2)],
        hints: [
          L`Use $F=BIL\sin\theta$.`,
          "The wire is perpendicular to the field.",
          "Multiply B, I, and L.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Uses correct force formula." },
          { part: "a", points: 1, description: "Calculates the force." },
        ]),
        commonErrors: [
          "Using velocity instead of current.",
          "Forgetting the length of the conductor.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For perpendicular arrangement:",
            math: L`F=BIL=(0.50)(3.0)(0.40)=0.60\ \mathrm N`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A straight conductor of length $0.50\text{ m}$ carries $2.0\text{ A}$ in a uniform magnetic field of $0.30\text{ T}$. The conductor makes an angle of $30^\circ$ with the field.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["force_on_current_carrying_conductor", "angle_dependence"],
        parts: [
          part("a", "Find the magnetic force on the conductor.", 2),
          part(
            "b",
            "What would the force be if the conductor were parallel to the field?",
            1,
          ),
        ],
        hints: [
          L`Use $F=BIL\sin\theta$.`,
          L`$\sin30^\circ=1/2$.`,
          L`Parallel means $\theta=0^\circ$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses angle correctly to find force.",
          },
          {
            part: "b",
            points: 1,
            description: "Recognises zero force for parallel placement.",
          },
        ]),
        commonErrors: [
          "Using cosine instead of sine of the angle.",
          "Calling the parallel force maximum.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Include the angle between conductor and field.",
            math: L`F=BIL\sin30^\circ=(0.30)(2.0)(0.50)(0.5)=0.15\ \mathrm N`,
          },
          {
            part: "b",
            explanation: "When the conductor is parallel to B:",
            math: L`F=BIL\sin0^\circ=0`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two long parallel wires carry $2.0\text{ A}$ and $5.0\text{ A}$ in the same direction. They are separated by $0.10\text{ m}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: parallelWiresFigure,
        skillTags: ["parallel_current_force"],
        parts: [
          part("a", "Find the force per unit length between the wires.", 2),
          part("b", "State whether the force is attractive or repulsive.", 1),
        ],
        hints: [
          L`Use $F/L=\mu_0I_1I_2/(2\pi d)$.`,
          "Same-direction currents attract.",
          "Keep distance in metres.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Calculates force per unit length.",
          },
          {
            part: "b",
            points: 1,
            description: "States attraction for same-direction currents.",
          },
        ]),
        commonErrors: [
          "Multiplying by total length even though force per unit length is asked.",
          "Saying same-direction currents repel.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the force per metre between parallel wires.",
            math: L`\frac{F}{L}=\frac{(4\pi\times10^{-7})(2.0)(5.0)}{2\pi(0.10)}=2.0\times10^{-5}\ \mathrm{N\,m^{-1}}`,
          },
          {
            part: "b",
            explanation: "Same-direction parallel currents attract.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A straight conductor of length $0.30\text{ m}$ carries current $4.0\text{ A}$ in a uniform magnetic field of $0.50\text{ T}$. The conductor is at $60^\circ$ to the field.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "force_on_current_carrying_conductor",
          "fleming_left_hand_rule",
        ],
        parts: [
          part("a", "Find the magnitude of the magnetic force.", 2),
          part(
            "b",
            "State when the force would be maximum and when it would be zero.",
            2,
          ),
          part(
            "c",
            "Name the rule used to determine the direction of force.",
            1,
          ),
        ],
        hints: [
          L`Use $F=BIL\sin\theta$.`,
          "The sine factor decides maximum and zero force.",
          "For direction of force on a current-carrying conductor, recall Fleming's rule.",
        ],
        rubric: rubric([
          { part: "a", points: 2, description: "Calculates force magnitude." },
          {
            part: "b",
            points: 2,
            description:
              "States maximum for perpendicular placement and zero for parallel or antiparallel placement.",
          },
          {
            part: "c",
            points: 1,
            description: "Names Fleming's left-hand rule.",
          },
        ]),
        commonErrors: [
          L`Using $\cos60^\circ$ instead of $\sin60^\circ$.`,
          "Confusing left-hand force rule with right-hand field rule.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the force expression with the angle.",
            math: L`F=(0.50)(4.0)(0.30)\sin60^\circ=0.60\cdot0.866\approx0.52\ \mathrm N`,
          },
          {
            part: "b",
            explanation:
              "Force is maximum when the conductor is perpendicular to the field and zero when it is parallel or antiparallel.",
          },
          {
            part: "c",
            explanation:
              "Fleming's left-hand rule gives the direction of force on a current-carrying conductor.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two straight bus-bars in a laboratory supply carry equal currents in the same direction. The separation is $5.0\text{ cm}$ and the measured force per metre is $3.2\times10^{-4}\text{ N m}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: parallelWiresFigure,
        skillTags: ["parallel_current_force", "case_based"],
        parts: [
          part("a", "State whether the bus-bars attract or repel.", 1),
          part("b", "Find the current in each bus-bar.", 3),
          part(
            "c",
            "What happens to the force per metre if the separation is doubled?",
            1,
          ),
        ],
        hints: [
          "Same-direction currents attract.",
          L`For equal currents, $F/L=\mu_0I^2/(2\pi d)$.`,
          "At fixed current, force per metre is inversely proportional to separation.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "States attraction." },
          {
            part: "b",
            points: 3,
            description:
              "Solves for current using parallel-wire force formula.",
          },
          {
            part: "c",
            points: 1,
            description: "States force per metre halves.",
          },
        ]),
        commonErrors: [
          "Forgetting to square the equal current.",
          "Using d = 5 m instead of 0.050 m.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Currents in the same direction attract.",
          },
          {
            part: "b",
            explanation: "Use the equal-current form of the force formula.",
            math: L`3.2\times10^{-4}=\frac{(4\pi\times10^{-7})I^2}{2\pi(0.050)}=4.0\times10^{-6}I^2`,
          },
          {
            part: "b",
            explanation: "Solve for I.",
            math: L`I^2=80\Rightarrow I\approx8.9\ \mathrm A`,
          },
          {
            part: "c",
            explanation:
              "Since force per metre is inversely proportional to separation, doubling separation halves the force per metre.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Current Loop, Magnetic Dipole, and Galvanometer",
    subtopic:
      "Torque on current loops, magnetic dipole moment, moving-coil galvanometer, current sensitivity, and ammeter/voltmeter conversion.",
    mc: [
      {
        questionLatex: L`A coil of $100$ turns, area $2.0\times10^{-4}\text{ m}^2$, and current $0.020\text{ A}$ is placed with its plane parallel to a $0.50\text{ T}$ magnetic field. The torque is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["torque_on_current_loop", "magnetic_dipole_moment"],
        choices: [
          L`$2.0\times10^{-4}\text{ N m}$`,
          L`$2.0\times10^{-5}\text{ N m}$`,
          L`$4.0\times10^{-4}\text{ N m}$`,
          L`$1.0\times10^{-3}\text{ N m}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This misses a factor of 10 from the number of turns or current.",
          C: "This omits the magnetic field factor 0.50.",
          D: "This multiplies by an extra factor, often from misreading area.",
        },
        hints: [
          L`Use $\tau=NIAB\sin\theta$, where $\theta$ is between the magnetic moment and $\vec B$.`,
          "If the plane of the coil is parallel to B, the normal to the coil is perpendicular to B.",
          L`So $\sin\theta=1$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The torque is maximum in this orientation.",
            math: L`\tau=NIAB=(100)(0.020)(2.0\times10^{-4})(0.50)`,
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: L`\tau=2.0\times10^{-4}\ \mathrm{N\,m}`,
          },
        ],
      },
      {
        questionLatex: L`A coil has $50$ turns, current $0.10\text{ A}$, and area $4.0\times10^{-4}\text{ m}^2$. Its magnetic dipole moment is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["magnetic_dipole_moment", "current_loop"],
        choices: [
          L`$2.0\times10^{-4}\text{ A m}^2$`,
          L`$5.0\times10^{-3}\text{ A m}^2$`,
          L`$2.0\times10^{-2}\text{ A m}^2$`,
          L`$2.0\times10^{-3}\text{ A m}^2$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This misses the factor of 10 from the current or turns.",
          B: "This uses area and turns but not current correctly.",
          C: "This is ten times too large.",
        },
        hints: [
          L`For an N-turn current loop, $M=NIA$.`,
          L`Magnetic moment is not torque unless multiplied by $B\sin\theta$.`,
          "Substitute the three factors carefully.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute magnetic dipole moment.",
            math: L`M=NIA=(50)(0.10)(4.0\times10^{-4})=2.0\times10^{-3}\ \mathrm{A\,m^2}`,
          },
        ],
      },
      {
        questionLatex: L`For a moving-coil galvanometer, current sensitivity is directly proportional to`,
        difficulty: 3,
        skillTags: ["moving_coil_galvanometer", "current_sensitivity"],
        choices: [
          "torsional constant of the spring only",
          L`$NAB/k$`,
          L`$k/(NAB)$`,
          "galvanometer resistance only",
        ],
        correctLetter: "B",
        rationales: {
          A: "A larger torsional constant reduces sensitivity; it is in the denominator.",
          C: "This is the reciprocal of the sensitivity dependence.",
          D: "Resistance matters in conversions, but current sensitivity depends on coil and spring parameters.",
        },
        hints: [
          "At equilibrium, deflecting torque equals restoring torque.",
          L`Use $NIAB=k\theta$.`,
          L`Current sensitivity is $\theta/I$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Balance magnetic and restoring torques.",
            math: L`NIAB=k\theta`,
          },
          {
            step: 2,
            explanation: "Rearrange for current sensitivity.",
            math: L`\frac{\theta}{I}=\frac{NAB}{k}`,
          },
        ],
      },
      {
        questionLatex: L`A galvanometer of resistance $99\ \Omega$ gives full-scale deflection at $1.0\text{ mA}$. To convert it into a $1.0\text{ A}$ ammeter, the required shunt is approximately`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: galvanometerConversionFigure,
        skillTags: ["ammeter_conversion", "galvanometer"],
        choices: [
          L`$99\ \Omega$`,
          L`$9.9\ \Omega$`,
          L`$0.10\ \Omega$`,
          L`$990\ \Omega$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The shunt must be much smaller than the galvanometer resistance for an ammeter.",
          B: "This still leaves too much current through the galvanometer branch.",
          D: "A large series-like resistance would make a voltmeter, not an ammeter.",
        },
        hints: [
          L`For ammeter conversion, $I_gG=(I-I_g)S$.`,
          L`Use $I_g=0.001\text{ A}$.`,
          "The shunt should be small.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Voltage across galvanometer equals voltage across shunt.",
            math: L`S=\frac{I_gG}{I-I_g}=\frac{(0.001)(99)}{1.0-0.001}`,
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: L`S\approx0.099\ \Omega\approx0.10\ \Omega`,
          },
        ],
      },
      {
        questionLatex: L`A galvanometer of resistance $100\ \Omega$ has full-scale current $1.0\text{ mA}$. The series resistance needed to convert it into a $5.0\text{ V}$ voltmeter is`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: galvanometerConversionFigure,
        skillTags: ["voltmeter_conversion", "galvanometer"],
        choices: [
          L`$4.9\text{ k}\Omega$`,
          L`$5.0\text{ k}\Omega$`,
          L`$100\ \Omega$`,
          L`$0.10\ \Omega$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the total voltmeter resistance; the galvanometer's own 100 ohm must be subtracted.",
          C: "This is only the galvanometer resistance, not the added series resistance.",
          D: "A very small shunt is used for an ammeter, not a voltmeter.",
        },
        hints: [
          "For voltmeter conversion, add a large resistance in series.",
          L`Total resistance required is $V/I_g$.`,
          "Subtract the galvanometer resistance to get the added resistance.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find total resistance for full-scale voltage.",
            math: L`R_\text{total}=\frac{5.0}{1.0\times10^{-3}}=5000\ \Omega`,
          },
          {
            step: 2,
            explanation: "Subtract galvanometer resistance.",
            math: L`R_s=5000-100=4900\ \Omega=4.9\text{ k}\Omega`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A coil has $20$ turns, area $5.0\times10^{-3}\text{ m}^2$, and current $0.50\text{ A}$. It is placed in a $0.20\text{ T}$ magnetic field with the magnetic moment making $30^\circ$ with the field. Find the torque.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["torque_on_current_loop"],
        parts: [part("a", "Find the torque on the coil.", 2)],
        hints: [
          L`Use $\tau=NIAB\sin\theta$.`,
          L`Here $\sin30^\circ=1/2$.`,
          "Multiply all factors once.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Uses correct torque formula." },
          { part: "a", points: 1, description: "Calculates torque correctly." },
        ]),
        commonErrors: [
          "Using the angle between plane and field instead of magnetic moment and field.",
          "Forgetting the number of turns.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Substitute in the torque expression.",
            math: L`\tau=NIAB\sin30^\circ=(20)(0.50)(5.0\times10^{-3})(0.20)(0.5)=5.0\times10^{-3}\ \mathrm{N\,m}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A galvanometer has resistance $50\ \Omega$ and full-scale current $2.0\text{ mA}$. It is to be converted into a $1.0\text{ A}$ ammeter.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: galvanometerConversionFigure,
        skillTags: ["ammeter_conversion", "galvanometer"],
        parts: [
          part("a", "Find the shunt resistance required.", 3),
          part("b", "Should the shunt be connected in series or parallel?", 1),
        ],
        hints: [
          L`Use $I_gG=(I-I_g)S$.`,
          "Most current must bypass the galvanometer.",
          "A bypass branch is a parallel connection.",
        ],
        rubric: rubric([
          { part: "a", points: 3, description: "Calculates shunt resistance." },
          {
            part: "b",
            points: 1,
            description: "States parallel connection.",
          },
        ]),
        commonErrors: [
          "Using 2 mA as 2 A.",
          "Adding the shunt in series instead of parallel.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Equal voltages across galvanometer and shunt give:",
            math: L`S=\frac{I_gG}{I-I_g}=\frac{(0.002)(50)}{1.0-0.002}\approx0.100\ \Omega`,
          },
          {
            part: "b",
            explanation:
              "The shunt is connected in parallel so that most current bypasses the galvanometer.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A galvanometer has resistance $200\ \Omega$ and full-scale deflection current $1.0\text{ mA}$. It is to be converted into a voltmeter of range $10\text{ V}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: galvanometerConversionFigure,
        skillTags: ["voltmeter_conversion", "galvanometer"],
        parts: [
          part("a", "Find the series resistance required.", 2),
          part("b", "Why must this resistance be connected in series?", 1),
        ],
        hints: [
          L`Total resistance at full scale is $V/I_g$.`,
          "Subtract galvanometer resistance.",
          "A voltmeter should draw a small current.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds required series resistance.",
          },
          {
            part: "b",
            points: 1,
            description: "Explains high resistance/small current need.",
          },
        ]),
        commonErrors: [
          "Using a parallel shunt formula.",
          "Forgetting to subtract galvanometer resistance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Find total resistance and subtract G.",
            math: L`R_s=\frac{10}{1.0\times10^{-3}}-200=9800\ \Omega`,
          },
          {
            part: "b",
            explanation:
              "A voltmeter must have high resistance and is connected in series with the galvanometer coil to limit current through it.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Explain the principle of a moving-coil galvanometer and obtain the expression for current sensitivity. Also state two ways to increase current sensitivity.`,
        difficulty: 4,
        skillTags: [
          "moving_coil_galvanometer",
          "current_sensitivity",
          "derivation",
        ],
        parts: [
          part("a", "State the principle of a moving-coil galvanometer.", 1),
          part("b", "Derive the expression for current sensitivity.", 3),
          part("c", "State two ways to increase current sensitivity.", 2),
        ],
        hints: [
          "A current loop in a magnetic field experiences torque.",
          "At equilibrium, magnetic torque equals restoring torque.",
          L`Current sensitivity means $\theta/I$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States torque on current loop principle.",
          },
          {
            part: "b",
            points: 3,
            description: "Derives the current-sensitivity expression.",
          },
          {
            part: "c",
            points: 2,
            description:
              "States valid methods such as increasing N, A, B or decreasing k.",
          },
        ]),
        commonErrors: [
          "Writing voltage sensitivity instead of current sensitivity.",
          "Putting torsional constant in the numerator.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A current-carrying coil placed in a magnetic field experiences a torque, producing deflection.",
          },
          {
            part: "b",
            explanation: "At equilibrium:",
            math: L`NIAB=k\theta`,
          },
          {
            part: "b",
            explanation: "Rearrange for current sensitivity.",
            math: L`\frac{\theta}{I}=\frac{NAB}{k}`,
          },
          {
            part: "c",
            explanation:
              "Sensitivity can be increased by increasing number of turns, coil area, or magnetic field, or by reducing the torsional constant of the suspension.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school laboratory has a galvanometer of resistance $30\ \Omega$ and full-scale current $2.0\text{ mA}$. It must be used once as a $3.0\text{ A}$ ammeter and once as a $6.0\text{ V}$ voltmeter.`,
        difficulty: 5,
        calculatorAllowed: true,
        figure: galvanometerConversionFigure,
        skillTags: ["galvanometer_conversion", "case_based"],
        parts: [
          part("a", "Find the shunt resistance for the 3.0 A ammeter.", 3),
          part("b", "Find the series resistance for the 6.0 V voltmeter.", 2),
          part(
            "c",
            "Explain why the two added resistances are very different.",
            1,
          ),
        ],
        hints: [
          "For ammeter conversion, the added resistance is a small parallel shunt.",
          "For voltmeter conversion, the added resistance is a large series resistance.",
          "Use the same galvanometer full-scale current in both cases.",
        ],
        rubric: rubric([
          { part: "a", points: 3, description: "Finds ammeter shunt." },
          {
            part: "b",
            points: 2,
            description: "Finds voltmeter series resistance.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Explains low-resistance ammeter and high-resistance voltmeter requirement.",
          },
        ]),
        commonErrors: [
          "Using the same added resistance for both conversions.",
          "Not subtracting galvanometer current from total ammeter current.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The shunt shares the same voltage as the galvanometer.",
            math: L`S=\frac{I_gG}{I-I_g}=\frac{(0.002)(30)}{3.0-0.002}\approx2.0\times10^{-2}\ \Omega`,
          },
          {
            part: "b",
            explanation: "The voltmeter requires total resistance V/Ig.",
            math: L`R_s=\frac{6.0}{0.002}-30=2970\ \Omega`,
          },
          {
            part: "c",
            explanation:
              "An ammeter must have very low resistance to avoid changing circuit current, while a voltmeter must have very high resistance to draw negligible current.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Magnetism and Matter",
    subtopic:
      "Bar magnets, magnetic field lines, magnetic materials, magnetisation, and temperature effects.",
    mc: [
      {
        questionLatex: L`A bar magnet is broken into two equal pieces perpendicular to its length. Each piece will have`,
        difficulty: 2,
        skillTags: ["bar_magnet", "magnetic_poles"],
        choices: [
          "only a north pole",
          "both a north pole and a south pole",
          "only a south pole",
          "no magnetic poles",
        ],
        correctLetter: "B",
        rationales: {
          A: "Magnetic monopoles are not obtained by cutting a bar magnet.",
          C: "Each piece is itself a smaller magnet, not a single-pole object.",
          D: "Cutting does not destroy all magnetism in an ordinary bar magnet.",
        },
        hints: [
          "Think of a bar magnet as made of many aligned magnetic dipoles.",
          "Cutting separates groups of dipoles, not isolated poles.",
          "Each part behaves like a smaller magnet.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A broken magnet produces smaller magnets; each part has both north and south poles.",
          },
        ],
      },
      {
        questionLatex: L`Outside a bar magnet, magnetic field lines are conventionally drawn`,
        difficulty: 2,
        skillTags: ["magnetic_field_lines", "bar_magnet"],
        choices: [
          "from south pole to north pole",
          "only as straight lines through the magnet",
          "from north pole to south pole",
          "as open lines ending in empty space",
        ],
        correctLetter: "C",
        rationales: {
          A: "Inside the magnet the direction is south to north; outside it is north to south.",
          B: "Field lines curve around the magnet outside it.",
          D: "Magnetic field lines form closed loops; they do not end in empty space.",
        },
        hints: [
          "Use the conventional direction of magnetic field lines outside a magnet.",
          "Magnetic field lines form closed loops.",
          "Compare outside and inside the magnet.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Outside a bar magnet, magnetic field lines emerge from the north pole and enter the south pole.",
          },
        ],
      },
      {
        questionLatex: L`A material that is weakly repelled by a strong magnet and has small negative magnetic susceptibility is`,
        difficulty: 3,
        skillTags: ["diamagnetism", "magnetic_materials"],
        choices: [
          "ferromagnetic",
          "paramagnetic",
          "a permanent magnet",
          "diamagnetic",
        ],
        correctLetter: "D",
        rationales: {
          A: "Ferromagnetic materials are strongly attracted and can retain magnetisation.",
          B: "Paramagnetic materials are weakly attracted and have positive susceptibility.",
          C: "A permanent magnet is not identified by small negative susceptibility.",
        },
        hints: [
          "Negative susceptibility means induced magnetisation opposes the applied field.",
          "Weak repulsion is the key observation.",
          "Examples include bismuth, copper, and water.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A diamagnetic material is weakly repelled and has small negative susceptibility.",
          },
        ],
      },
      {
        questionLatex: L`When a ferromagnetic substance is heated above its Curie temperature, it behaves approximately as`,
        difficulty: 3,
        figure: materialTemperatureFigure,
        skillTags: ["curie_temperature", "ferromagnetism"],
        choices: [
          "a paramagnetic substance",
          "a perfect diamagnet",
          "a superconductor",
          "an isolated magnetic monopole",
        ],
        correctLetter: "A",
        rationales: {
          B: "Heating above Curie temperature destroys ferromagnetic order; it does not make the material perfectly diamagnetic.",
          C: "Curie temperature in ferromagnetism is not a superconducting transition.",
          D: "Magnetic monopoles are not produced by heating a ferromagnet.",
        },
        hints: [
          "Curie temperature marks loss of ferromagnetic ordering.",
          "Above this temperature, domain alignment is thermally disturbed.",
          "The material becomes only weakly attracted.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Above Curie temperature, a ferromagnetic material loses spontaneous domain alignment and behaves approximately as a paramagnet.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: Soft iron is preferred as the core of an electromagnet. Reason: It can be magnetised strongly and demagnetised easily.`,
        difficulty: 2,
        skillTags: [
          "assertion_reason",
          "magnetic_materials",
          "electromagnet_core",
        ],
        choices: [
          "Assertion is true, but Reason is false.",
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not explain Assertion.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason is true for soft iron.",
          C: "The reason directly explains why soft iron suits electromagnets.",
          D: "The assertion is true; soft iron is commonly used for electromagnet cores.",
        },
        hints: [
          "An electromagnet should respond strongly while current is present.",
          "It should lose magnetism quickly when current is switched off.",
          "Soft magnetic materials have low retentivity compared with hard magnetic materials.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Soft iron has high permeability and low retentivity, so it is easily magnetised and demagnetised.",
          },
          {
            step: 2,
            explanation:
              "Both statements are true and the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A bar magnet is treated qualitatively as a magnetic dipole with magnetic moment $\vec M$ directed from its south pole to its north pole.`,
        difficulty: 3,
        skillTags: [
          "bar_magnet",
          "magnetic_dipole_field",
          "equivalent_solenoid",
        ],
        parts: [
          part(
            "a",
            "On the axial line outside the magnet, is the magnetic field along or opposite to $\\vec M$?",
            1,
          ),
          part(
            "b",
            "On the equatorial line, is the magnetic field along or opposite to $\\vec M$?",
            1,
          ),
          part(
            "c",
            "Which current-carrying device gives a similar field pattern to a bar magnet?",
            1,
          ),
        ],
        hints: [
          "Compare the outside field pattern of a bar magnet with a dipole.",
          "Axial and equatorial points have different field directions.",
          "A long current-carrying coil has north and south ends.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that the axial field is along the magnetic moment.",
          },
          {
            part: "b",
            points: 1,
            description:
              "States that the equatorial field is opposite to the magnetic moment.",
          },
          {
            part: "c",
            points: 1,
            description: "Identifies a current-carrying solenoid.",
          },
        ]),
        commonErrors: [
          "Assuming axial and equatorial field directions are the same.",
          "Treating a bar magnet as a magnetic monopole instead of a dipole.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "On the axial line of a bar magnet, the magnetic field is along the magnetic moment.",
          },
          {
            part: "b",
            explanation:
              "On the equatorial line, the magnetic field is opposite to the magnetic moment.",
          },
          {
            part: "c",
            explanation:
              "A current-carrying solenoid has a similar field pattern and behaves qualitatively like a bar magnet.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two magnetic field lines around a bar magnet are drawn so that they intersect at a point. A student says this is possible because the field is stronger there.`,
        difficulty: 3,
        skillTags: ["magnetic_field_lines", "conceptual_reasoning"],
        parts: [
          part("a", "Is the student's statement correct?", 1),
          part("b", "Give the reason.", 2),
        ],
        hints: [
          "A field line's tangent gives the direction of magnetic field at that point.",
          "A point cannot have two different field directions at once.",
          "Strength is shown by crowding of lines, not crossing.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Rejects the statement." },
          {
            part: "b",
            points: 2,
            description:
              "Explains uniqueness of field direction and line density.",
          },
        ]),
        commonErrors: [
          "Saying field lines intersect where the field is strong.",
          "Treating field lines as physical wires.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "No, the statement is not correct.",
          },
          {
            part: "b",
            explanation:
              "If two field lines intersected, the magnetic field at the intersection would have two directions. That is impossible; stronger field is represented by closer spacing of lines.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A small bar magnet of magnetic moment $\vec M$ is placed in a uniform magnetic field $\vec B$. Consider the cases where $\vec M$ is parallel, antiparallel, and perpendicular to $\vec B$.`,
        difficulty: 3,
        skillTags: ["bar_magnet_torque", "qualitative_magnetism"],
        parts: [
          part("a", "In which orientations is the torque zero?", 1),
          part("b", "In which orientation is the torque maximum?", 1),
          part(
            "c",
            "At an intermediate angle, what is the physical effect of the torque?",
            2,
          ),
        ],
        hints: [
          "Compare the direction of the magnetic moment with the magnetic field.",
          "Torque is zero when the magnet is already along the field line or exactly opposite to it.",
          "The torque tends to rotate the magnet, not translate it in a uniform field.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States zero torque for parallel and antiparallel orientations.",
          },
          {
            part: "b",
            points: 1,
            description: "States maximum torque for perpendicular orientation.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains that the torque tends to align the magnetic moment with the field.",
          },
        ]),
        commonErrors: [
          "Saying the torque is maximum when the magnet is already aligned.",
          "Confusing torque in a uniform field with net translational force.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Torque is zero when the magnetic moment is parallel or antiparallel to the magnetic field.",
          },
          {
            part: "b",
            explanation:
              "Torque is maximum when the magnetic moment is perpendicular to the magnetic field.",
          },
          {
            part: "c",
            explanation:
              "At an intermediate angle, the torque tends to rotate the magnet so that its magnetic moment aligns with the external field.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare diamagnetic, paramagnetic, and ferromagnetic substances in terms of response to an external magnetic field, susceptibility, and temperature effect.`,
        difficulty: 3,
        skillTags: ["magnetic_materials", "comparison", "temperature_effect"],
        parts: [
          part("a", "Compare their response to an external field.", 3),
          part("b", "Compare the sign and relative size of susceptibility.", 3),
          part(
            "c",
            "State the effect of temperature on ferromagnetic behaviour.",
            2,
          ),
        ],
        hints: [
          "Separate weak repulsion, weak attraction, and strong attraction.",
          "Think of susceptibility as negative, small positive, or very large positive.",
          "Mention Curie temperature for ferromagnets.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description: "Correctly compares field response of all three.",
          },
          {
            part: "b",
            points: 3,
            description: "Correctly compares susceptibility sign and size.",
          },
          {
            part: "c",
            points: 2,
            description:
              "States loss of ferromagnetism above Curie temperature.",
          },
        ]),
        commonErrors: [
          "Saying paramagnetic substances are repelled.",
          "Ignoring the Curie temperature transition.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Diamagnetic substances are weakly repelled, paramagnetic substances are weakly attracted, and ferromagnetic substances are strongly attracted by an external magnetic field.",
          },
          {
            part: "b",
            explanation:
              "Diamagnetic susceptibility is small and negative; paramagnetic susceptibility is small and positive; ferromagnetic susceptibility is large and positive.",
          },
          {
            part: "c",
            explanation:
              "A ferromagnetic material loses ferromagnetic ordering above its Curie temperature and behaves approximately like a paramagnetic material.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The graph shows how magnetisation of a ferromagnetic sample changes as temperature is raised. The dashed line marks the Curie temperature $T_c$.`,
        difficulty: 3,
        figure: materialTemperatureFigure,
        skillTags: ["curie_temperature", "magnetisation", "case_based"],
        parts: [
          part(
            "a",
            "What happens to magnetisation as temperature approaches $T_c$?",
            1,
          ),
          part("b", "What is the magnetic behaviour above $T_c$?", 2),
          part(
            "c",
            "Why is this effect important while choosing a permanent magnet for high-temperature use?",
            2,
          ),
        ],
        hints: [
          "Read the trend of M as T increases.",
          L`$T_c$ marks loss of ferromagnetic order.`,
          "A permanent magnet should retain magnetisation under working conditions.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States magnetisation falls sharply near Curie temperature.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Identifies paramagnetic-like behaviour above Curie temperature.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Connects operating temperature to loss of magnetisation.",
          },
        ]),
        commonErrors: [
          "Assuming a permanent magnet always remains equally magnetised at any temperature.",
          "Calling the post-Curie material diamagnetic.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The magnetisation decreases and drops sharply as temperature approaches the Curie temperature.",
          },
          {
            part: "b",
            explanation:
              "Above the Curie temperature, ferromagnetic domain order is lost and the material behaves approximately as a paramagnet.",
          },
          {
            part: "c",
            explanation:
              "A permanent magnet used at high temperature must have a Curie temperature well above its operating temperature; otherwise it may lose its magnetisation.",
          },
        ],
      },
    ],
  },
];

export const magneticEffectsCurrentMagnetismTopics: Topic[] =
  topicSeeds.map(makeTopic);
