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
const UNIT = "u1-physical-world-measurement";
const VERSION = "0.1.4";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

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
  return `You chose ${choiceText}. Recheck the unit, uncertainty, significant-figure, or dimensional condition before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_measurement_reasoning"),
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_a_formula_without_checking_units_or_measurement_precision",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_the_answer_without_showing_unit_or_dimension_reasoning",
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

const rulerReadingFigure: ItemFigure = {
  type: "svg",
  title: "Ruler reading for a small rod",
  description:
    "A rod is placed above a centimetre scale with ten equal divisions in each centimetre.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <rect x="136" y="65" width="368" height="28" rx="4" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <text x="279" y="55" text-anchor="middle" font-size="16" fill="#1e3a8a" font-family="Arial, sans-serif">rod</text>
  <line x1="40" y1="150" x2="520" y2="150" stroke="#334155" stroke-width="3"/>
  <path d="M48 150V137 M56 150V137 M64 150V137 M72 150V137 M80 150V130 M88 150V137 M96 150V137 M104 150V137 M112 150V137
           M128 150V137 M136 150V137 M144 150V137 M152 150V137 M160 150V130 M168 150V137 M176 150V137 M184 150V137 M192 150V137
           M208 150V137 M216 150V137 M224 150V137 M232 150V137 M240 150V130 M248 150V137 M256 150V137 M264 150V137 M272 150V137
           M288 150V137 M296 150V137 M304 150V137 M312 150V137 M320 150V130 M328 150V137 M336 150V137 M344 150V137 M352 150V137
           M368 150V137 M376 150V137 M384 150V137 M392 150V137 M400 150V130 M408 150V137 M416 150V137 M424 150V137 M432 150V137
           M448 150V137 M456 150V137 M464 150V137 M472 150V137 M480 150V130 M488 150V137 M496 150V137 M504 150V137 M512 150V137"
        stroke="#64748b" stroke-width="1.2" fill="none"/>
  <g stroke="#334155" stroke-width="2.4" font-family="Arial, sans-serif" fill="#334155" font-size="14">
    <line x1="40" y1="150" x2="40" y2="118"/><text x="40" y="178" text-anchor="middle">0</text>
    <line x1="120" y1="150" x2="120" y2="118"/><text x="120" y="178" text-anchor="middle">1</text>
    <line x1="200" y1="150" x2="200" y2="118"/><text x="200" y="178" text-anchor="middle">2</text>
    <line x1="280" y1="150" x2="280" y2="118"/><text x="280" y="178" text-anchor="middle">3</text>
    <line x1="360" y1="150" x2="360" y2="118"/><text x="360" y="178" text-anchor="middle">4</text>
    <line x1="440" y1="150" x2="440" y2="118"/><text x="440" y="178" text-anchor="middle">5</text>
    <line x1="520" y1="150" x2="520" y2="118"/><text x="520" y="178" text-anchor="middle">6</text>
  </g>
  <g stroke="#64748b" stroke-width="1.5">
    <line x1="136" y1="95" x2="136" y2="208"/>
    <line x1="504" y1="95" x2="504" y2="208"/>
  </g>
</svg>`,
};

const repeatedReadingsFigure: ItemFigure = {
  type: "svg",
  title: "Repeated length readings",
  description:
    "Three repeated readings of the same length are plotted as 12.3 cm, 12.4 cm, and 12.5 cm.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <line x1="95" y1="155" x2="465" y2="155" stroke="#334155" stroke-width="2"/>
  <text x="95" y="190" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">12.2</text>
  <text x="218" y="190" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">12.3</text>
  <text x="342" y="190" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">12.4</text>
  <text x="465" y="190" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">12.5</text>
  <line x1="218" y1="155" x2="218" y2="128" stroke="#334155" stroke-width="2"/>
  <line x1="342" y1="155" x2="342" y2="128" stroke="#334155" stroke-width="2"/>
  <line x1="465" y1="155" x2="465" y2="128" stroke="#334155" stroke-width="2"/>
  <circle cx="218" cy="118" r="8" fill="#2563eb"/>
  <circle cx="342" cy="105" r="8" fill="#2563eb"/>
  <circle cx="465" cy="118" r="8" fill="#2563eb"/>
  <text x="280" y="55" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">Length readings in cm</text>
</svg>`,
};

const labNotebookFigure: ItemFigure = {
  type: "svg",
  title: "Lab notebook entries",
  description:
    "A notebook page lists distance as 0.0500 m and time as 4.2 s for a slow trolley.",
  svg: `<svg viewBox="0 0 560 280" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="90" y="35" width="380" height="205" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="120" y1="85" x2="440" y2="85" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="120" y1="130" x2="440" y2="130" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="120" y1="175" x2="440" y2="175" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="280" y="65" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial, sans-serif">Trial note</text>
  <text x="130" y="115" font-size="17" fill="#1e293b" font-family="Arial, sans-serif">distance = 0.0500 m</text>
  <text x="130" y="160" font-size="17" fill="#1e293b" font-family="Arial, sans-serif">time = 4.2 s</text>
  <text x="130" y="205" font-size="17" fill="#1e293b" font-family="Arial, sans-serif">speed = ?</text>
</svg>`,
};

const termDimensionFigure: ItemFigure = {
  type: "svg",
  title: "Terms in a force equation",
  description:
    "A force model is written as F = at + bv, showing that each term must have force dimensions.",
  svg: `<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="260" fill="#ffffff"/>
  <rect x="90" y="70" width="380" height="105" rx="10" fill="#eff6ff" stroke="#93c5fd" stroke-width="2"/>
  <text x="280" y="118" text-anchor="middle" font-size="28" fill="#0f172a" font-family="Arial, sans-serif">F = at + bv</text>
  <text x="280" y="153" text-anchor="middle" font-size="16" fill="#475569" font-family="Arial, sans-serif">t is time, v is speed</text>
  <text x="280" y="215" text-anchor="middle" font-size="15" fill="#64748b" font-family="Arial, sans-serif">Each addable term must have the same dimensions as F.</text>
</svg>`,
};

const dragPowerFigure: ItemFigure = {
  type: "svg",
  title: "Object moving through air",
  description:
    "A body of frontal area A moves with speed v through air of density rho.",
  svg: `<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="300" fill="#ffffff"/>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
  </defs>
  <rect x="230" y="105" width="90" height="90" rx="10" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="90" y1="150" x2="210" y2="150" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow)"/>
  <text x="140" y="132" text-anchor="middle" font-size="18" fill="#1d4ed8" font-family="Arial, sans-serif">v</text>
  <text x="275" y="155" text-anchor="middle" font-size="18" fill="#1e3a8a" font-family="Arial, sans-serif">area A</text>
  <text x="395" y="120" font-size="18" fill="#475569" font-family="Arial, sans-serif">air density</text>
  <text x="420" y="150" font-size="22" fill="#475569" font-family="Arial, sans-serif">&#961;</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "SI Units and Derived Quantities",
    subtopic:
      "Need for measurement, SI base units, derived units, and unit conversions in physical contexts.",
    mc: [
      {
        questionLatex:
          "A sensor plate has area $3.6\\text{ cm}^2$. Its area in SI units is",
        difficulty: 2,
        skillTags: ["si_units", "area_conversion"],
        choices: [
          "$3.6\\times10^{-4}\\text{ m}^2$",
          "$3.6\\times10^{-2}\\text{ m}^2$",
          "$3.6\\times10^{-6}\\text{ m}^2$",
          "$36\\text{ m}^2$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This treats square centimetres like centimetres and converts only one length factor.",
          C: "This uses the cubic conversion scale, not the area scale.",
          D: "This reverses the direction of the conversion.",
        },
        hints: [
          "$1\\text{ cm}=10^{-2}\\text{ m}$.",
          "Area conversion squares the length conversion factor.",
          "$1\\text{ cm}^2=10^{-4}\\text{ m}^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert square centimetres to square metres.",
            math: "3.6\\text{ cm}^2=3.6\\times10^{-4}\\text{ m}^2",
          },
        ],
      },
      {
        questionLatex:
          "A force sensor reads force per unit area. The SI unit of this reading is",
        difficulty: 2,
        skillTags: ["derived_units", "pressure_unit"],
        choices: [
          "$\\text{kg m s}^{-2}$",
          "$\\text{kg m}^{-1}\\text{s}^{-2}$",
          "$\\text{kg m}^{2}\\text{s}^{-2}$",
          "$\\text{kg}^{-1}\\text{m}^{3}\\text{s}^{-2}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This is the SI unit of force, not force per unit area.",
          C: "This is the joule, the unit of work or energy.",
          D: "This is the dimension pattern of gravitational constant, not pressure.",
        },
        hints: [
          "Force per unit area is pressure.",
          "$1\\text{ N}=1\\text{ kg m s}^{-2}$.",
          "Divide newton by $\\text{m}^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write pressure as force divided by area.",
            math: "\\frac{\\text{N}}{\\text{m}^2}=\\frac{\\text{kg m s}^{-2}}{\\text{m}^2}=\\text{kg m}^{-1}\\text{s}^{-2}",
          },
        ],
      },
      {
        questionLatex:
          "A cube of side $2.0\\text{ cm}$ is used in a density experiment. Its volume in $\\text{m}^3$ is",
        difficulty: 2,
        skillTags: ["volume_conversion", "si_units"],
        choices: [
          "$8.0\\times10^{-2}\\text{ m}^3$",
          "$8.0\\times10^{-4}\\text{ m}^3$",
          "$8.0\\times10^{-6}\\text{ m}^3$",
          "$2.0\\times10^{-6}\\text{ m}^3$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This converts length but does not cube the conversion factor.",
          B: "This uses the area conversion factor instead of volume conversion.",
          D: "This converts one side, not the cube's volume.",
        },
        hints: [
          "First find the volume in $\\text{cm}^3$.",
          "$1\\text{ cm}^3=10^{-6}\\text{ m}^3$.",
          "$(2.0)^3=8.0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find and convert the volume.",
            math: "V=(2.0\\text{ cm})^3=8.0\\text{ cm}^3=8.0\\times10^{-6}\\text{ m}^3",
          },
        ],
      },
      {
        questionLatex:
          "A car's speed is $54\\text{ km h}^{-1}$. The same speed in $\\text{m s}^{-1}$ is",
        difficulty: 2,
        skillTags: ["speed_conversion", "si_units"],
        choices: [
          "$54\\text{ m s}^{-1}$",
          "$5.4\\text{ m s}^{-1}$",
          "$19.4\\text{ m s}^{-1}$",
          "$15\\text{ m s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This changes only the unit name and not the size of the unit.",
          B: "This divides by 10 instead of multiplying by $5/18$.",
          C: "This uses an incorrect hour-to-second conversion.",
        },
        hints: [
          "$1\\text{ km}=1000\\text{ m}$ and $1\\text{ h}=3600\\text{ s}$.",
          "Multiply by $1000/3600=5/18$.",
          "$54\\times5/18=15$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert kilometres per hour to metres per second.",
            math: "54\\text{ km h}^{-1}=54\\times\\frac{5}{18}=15\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex:
          "Assertion (A): The SI unit of acceleration is $\\text{m s}^{-2}$. Reason (R): Acceleration is change in velocity per unit time, and velocity has SI unit $\\text{m s}^{-1}$.",
        difficulty: 3,
        skillTags: ["assertion_reason", "acceleration_unit"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why one more division by time gives $\\text{m s}^{-2}$.",
          C: "The reason is true: acceleration is velocity change divided by time.",
          D: "The assertion is also true.",
        },
        hints: [
          "Write acceleration as velocity divided by time.",
          "Velocity has unit $\\text{m s}^{-1}$.",
          "$(\\text{m s}^{-1})/\\text{s}=\\text{m s}^{-2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the definition of acceleration.",
            math: "[a]=\\frac{\\text{m s}^{-1}}{\\text{s}}=\\text{m s}^{-2}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "A micrometer records a thickness of $0.75\\text{ mm}$. Express this thickness in metre.",
        difficulty: 1,
        skillTags: ["unit_conversion", "length_units"],
        parts: singlePart("a", "Convert the thickness into metre.", 1),
        hints: [
          "$1\\text{ mm}=10^{-3}\\text{ m}$.",
          "Multiply $0.75$ by $10^{-3}$.",
          "Write the result in scientific notation.",
        ],
        rubric: singleRubric("a", 1, "Gives $7.5\\times10^{-4}\\text{ m}$."),
        commonErrors: ["Using $10^{-2}$ as the millimetre conversion factor."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$0.75\\text{ mm}=0.75\\times10^{-3}\\text{ m}=7.5\\times10^{-4}\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "A normal force of $40\\text{ N}$ acts on an area of $0.020\\text{ m}^2$. Find the pressure in pascal.",
        difficulty: 2,
        skillTags: ["pressure", "derived_units"],
        parts: singlePart("a", "Calculate the pressure.", 1),
        hints: [
          "Pressure is force divided by area.",
          "Use SI units directly.",
          "$40/0.020=2000$.",
        ],
        rubric: singleRubric("a", 1, "Finds $2.0\\times10^3\\text{ Pa}$."),
        commonErrors: ["Multiplying force and area instead of dividing."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$P=F/A=40/0.020=2000\\text{ Pa}=2.0\\times10^3\\text{ Pa}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A metal piece has mass $54\\text{ g}$ and volume $20\\text{ cm}^3$. Find its density in $\\text{g cm}^{-3}$ and in SI units.",
        difficulty: 3,
        skillTags: ["density", "unit_conversion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find density in $\\text{g cm}^{-3}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Convert it to $\\text{kg m}^{-3}$.",
            points: 1,
          },
        ],
        hints: [
          "Density is mass divided by volume.",
          "$1\\text{ g cm}^{-3}=1000\\text{ kg m}^{-3}$.",
          "Convert after finding the density in cgs units.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2.7\\text{ g cm}^{-3}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Converts to $2700\\text{ kg m}^{-3}$.",
            },
          ],
        },
        commonErrors: ["Using $1\\text{ g cm}^{-3}=1\\text{ kg m}^{-3}$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\rho=m/V=54/20=2.7\\text{ g cm}^{-3}$.",
          },
          {
            part: "b",
            explanation:
              "Since $1\\text{ g cm}^{-3}=1000\\text{ kg m}^{-3}$, the density is $2700\\text{ kg m}^{-3}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A short impulse changes a cart's momentum. Show from units that impulse and momentum can be compared directly.",
        difficulty: 3,
        skillTags: ["derived_units", "impulse", "momentum"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the SI unit of impulse.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the SI unit of momentum.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Show that both units are equivalent.",
            points: 2,
          },
        ],
        hints: [
          "Impulse is force multiplied by time.",
          "Momentum is mass multiplied by velocity.",
          "Use $1\\text{ N}=1\\text{ kg m s}^{-2}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes impulse unit as $\\text{N s}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Writes momentum unit as $\\text{kg m s}^{-1}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Shows $\\text{N s}=\\text{kg m s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Treating newton as a base SI unit."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Impulse has unit $\\text{N s}$ because impulse is force times time.",
          },
          {
            part: "b",
            explanation:
              "Momentum has unit $\\text{kg}\\cdot\\text{m s}^{-1}=\\text{kg m s}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "$\\text{N s}=(\\text{kg m s}^{-2})\\text{s}=\\text{kg m s}^{-1}$, so impulse and momentum have the same unit.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A workshop cuts a steel sheet of length $25\\text{ cm}$, breadth $12\\text{ cm}$, and thickness $0.40\\text{ mm}$. The density of steel is $7.8\\text{ g cm}^{-3}$.",
        difficulty: 4,
        skillTags: ["unit_conversion", "density", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Convert the thickness to centimetre.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the volume in $\\text{cm}^3$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the mass of the sheet in gram.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Express the mass in kilogram.",
            points: 1,
          },
        ],
        hints: [
          "$10\\text{ mm}=1\\text{ cm}$.",
          "Use $V=lbt$ in centimetre units.",
          "Mass is density multiplied by volume.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Converts $0.40\\text{ mm}$ to $0.040\\text{ cm}$.",
            },
            { part: "b", points: 1, description: "Finds $12\\text{ cm}^3$." },
            { part: "c", points: 1, description: "Finds $93.6\\text{ g}$." },
            {
              part: "d",
              points: 1,
              description: "Converts to $0.0936\\text{ kg}$.",
            },
          ],
        },
        commonErrors: ["Using $0.40\\text{ cm}$ as the thickness."],
        workedSolution: [
          { part: "a", explanation: "$0.40\\text{ mm}=0.040\\text{ cm}$." },
          {
            part: "b",
            explanation: "$V=25\\times12\\times0.040=12\\text{ cm}^3$.",
          },
          {
            part: "c",
            explanation: "$m=\\rho V=7.8\\times12=93.6\\text{ g}$.",
          },
          { part: "d", explanation: "$93.6\\text{ g}=0.0936\\text{ kg}$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Uncertainty and Error in Measurement",
    subtopic:
      "Instrument least count, repeated readings, absolute error, percentage error, and uncertainty propagation for simple products and quotients.",
    mc: [
      {
        questionLatex:
          "The rod in the figure is measured with a scale of least count $0.1\\text{ cm}$. The best reported length is",
        figure: rulerReadingFigure,
        difficulty: 3,
        skillTags: [
          "least_count",
          "length_measurement",
          "figure_interpretation",
        ],
        choices: [
          "$(5.8\\pm0.1)\\text{ cm}$",
          "$(4.6\\pm0.1)\\text{ cm}$",
          "$(4.6\\pm0.01)\\text{ cm}$",
          "$(7.0\\pm0.1)\\text{ cm}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This reads the final scale mark but does not subtract the initial reading.",
          C: "The scale least count is $0.1\\text{ cm}$, not $0.01\\text{ cm}$.",
          D: "This adds the two end readings instead of subtracting them.",
        },
        hints: [
          "Length is final reading minus initial reading.",
          "The rod starts at $1.2\\text{ cm}$ and ends at $5.8\\text{ cm}$.",
          "Attach the least count as the reading uncertainty.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Read the two end positions and subtract.",
            math: "5.8-1.2=4.6\\text{ cm}",
          },
          {
            step: 2,
            explanation: "Use the scale least count as the uncertainty.",
            math: "L=(4.6\\pm0.1)\\text{ cm}",
          },
        ],
      },
      {
        questionLatex:
          "A rectangular plate has length uncertainty $2\\%$ and breadth uncertainty $3\\%$. The maximum percentage uncertainty in its area is",
        difficulty: 2,
        skillTags: ["percentage_uncertainty", "area"],
        choices: ["$1\\%$", "$6\\%$", "$5\\%$", "$2.5\\%$"],
        correctLetter: "C",
        rationales: {
          A: "This subtracts uncertainties; maximum uncertainties add for a product.",
          B: "This multiplies the two percentages.",
          D: "This averages the uncertainties instead of adding them.",
        },
        hints: [
          "Area is a product: $A=lb$.",
          "For products, fractional or percentage uncertainties add.",
          "$2\\%+3\\%=5\\%$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add percentage uncertainties for a product.",
            math: "\\frac{\\Delta A}{A}\\times100\\%=2\\%+3\\%=5\\%",
          },
        ],
      },
      {
        questionLatex:
          "Three readings of a length are $2.31\\text{ cm}$, $2.33\\text{ cm}$, and $2.32\\text{ cm}$. The mean reading is",
        difficulty: 2,
        skillTags: ["mean_reading", "repeated_measurements"],
        choices: [
          "$2.31\\text{ cm}$",
          "$2.33\\text{ cm}$",
          "$6.96\\text{ cm}$",
          "$2.32\\text{ cm}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This keeps only the first reading.",
          B: "This keeps only the largest reading.",
          C: "This is the sum, not the mean.",
        },
        hints: [
          "Add the three readings.",
          "Divide by the number of readings.",
          "$(2.31+2.33+2.32)/3=2.32$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Average the repeated readings.",
            math: "\\bar L=\\frac{2.31+2.33+2.32}{3}=2.32\\text{ cm}",
          },
        ],
      },
      {
        questionLatex:
          "A screw gauge gives every reading $0.03\\text{ mm}$ more than the true value before any correction. This is mainly",
        difficulty: 2,
        skillTags: ["systematic_error", "zero_error"],
        choices: [
          "a systematic error",
          "a random error",
          "a percentage error",
          "a significant-figure error",
        ],
        correctLetter: "A",
        rationales: {
          B: "Random errors fluctuate from reading to reading; this offset is fixed.",
          C: "Percentage error is a way of expressing error, not the type of cause.",
          D: "Significant figures describe reporting precision, not a fixed instrument offset.",
        },
        hints: [
          "A fixed offset repeats in the same direction.",
          "Zero error is an instrument bias.",
          "Instrument bias is systematic.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A constant zero offset shifts all readings in one direction.",
            math: "\\text{fixed offset}\\Rightarrow\\text{systematic error}",
          },
        ],
      },
      {
        questionLatex:
          "Assertion (A): For $A=lb$, the maximum percentage uncertainty in $A$ is the sum of the percentage uncertainties in $l$ and $b$. Reason (R): For products of measured quantities, fractional uncertainties add.",
        difficulty: 3,
        skillTags: ["assertion_reason", "uncertainty_propagation"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason is exactly the rule that explains the assertion.",
          C: "The reason is true for products in maximum uncertainty estimates.",
          D: "The assertion is also true.",
        },
        hints: [
          "Area is a product.",
          "Use the product uncertainty rule.",
          "The reason directly states the rule used in the assertion.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the product uncertainty rule.",
            math: "\\frac{\\Delta A}{A}=\\frac{\\Delta l}{l}+\\frac{\\Delta b}{b}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "A $10.0\\text{ cm}$ standard is measured as $9.7\\text{ cm}$. Find the percentage error in the measurement.",
        difficulty: 2,
        skillTags: ["percentage_error"],
        parts: singlePart("a", "Calculate the percentage error.", 1),
        hints: [
          "Absolute error is measured value minus true value in magnitude.",
          "Percentage error is absolute error divided by true value, multiplied by 100.",
          "Use $0.3/10.0\\times100$.",
        ],
        rubric: singleRubric("a", 1, "Finds $3\\%$."),
        commonErrors: [
          "Dividing by the measured value instead of the true value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Absolute error $=|9.7-10.0|=0.3\\text{ cm}$. Percentage error $=(0.3/10.0)\\times100=3\\%$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "Two scale readings are $(8.4\\pm0.1)\\text{ cm}$ and $(2.1\\pm0.1)\\text{ cm}$. Report their difference with uncertainty.",
        difficulty: 3,
        skillTags: ["absolute_uncertainty", "subtraction"],
        parts: singlePart("a", "Find the difference with uncertainty.", 2),
        hints: [
          "Subtract the central values.",
          "For addition or subtraction, absolute uncertainties add.",
          "$0.1+0.1=0.2\\text{ cm}$.",
        ],
        rubric: singleRubric("a", 2, "Finds $(6.3\\pm0.2)\\text{ cm}$."),
        commonErrors: ["Subtracting the uncertainties."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Difference $=8.4-2.1=6.3\\text{ cm}$. Uncertainty $=0.1+0.1=0.2\\text{ cm}$. So the result is $(6.3\\pm0.2)\\text{ cm}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The percentage uncertainties in the length, breadth, and height of a block are $4\\%$, $2\\%$, and $1\\%$ respectively. Find the percentage uncertainty in its volume.",
        difficulty: 3,
        skillTags: ["uncertainty_propagation", "volume"],
        parts: singlePart("a", "Find the percentage uncertainty in volume.", 2),
        hints: [
          "Volume is $V=lbh$.",
          "For products, percentage uncertainties add.",
          "Add $4\\%$, $2\\%$, and $1\\%$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $7\\%$ using product uncertainty rule.",
        ),
        commonErrors: ["Multiplying the percentage uncertainties."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta V/V=\\Delta l/l+\\Delta b/b+\\Delta h/h$, so the percentage uncertainty is $4\\%+2\\%+1\\%=7\\%$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A density experiment gives $m=(50.0\\pm0.1)\\text{ g}$ and $V=(20.0\\pm0.2)\\text{ cm}^3$. Estimate the density with uncertainty.",
        difficulty: 4,
        skillTags: ["density_uncertainty", "quotient_uncertainty"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the central density.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the percentage uncertainty in mass and volume.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Report density with approximate absolute uncertainty.",
            points: 2,
          },
        ],
        hints: [
          "Density is $m/V$.",
          "For a quotient, percentage uncertainties add.",
          "Convert total percentage uncertainty into absolute uncertainty in density.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2.50\\text{ g cm}^{-3}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds mass uncertainty $0.2\\%$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds volume uncertainty $1.0\\%$.",
            },
            {
              part: "c",
              points: 1,
              description: "Adds to total uncertainty $1.2\\%$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Reports approximately $(2.50\\pm0.03)\\text{ g cm}^{-3}$.",
            },
          ],
        },
        commonErrors: ["Subtracting percentage uncertainties for a quotient."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\rho=m/V=50.0/20.0=2.50\\text{ g cm}^{-3}$.",
          },
          {
            part: "b",
            explanation:
              "Mass percentage uncertainty $=(0.1/50.0)\\times100=0.2\\%$. Volume percentage uncertainty $=(0.2/20.0)\\times100=1.0\\%$.",
          },
          {
            part: "c",
            explanation:
              "Total percentage uncertainty $=1.2\\%$. Absolute uncertainty $=0.012\\times2.50=0.03\\text{ g cm}^{-3}$, so $\\rho=(2.50\\pm0.03)\\text{ g cm}^{-3}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student measures the same length three times. The readings shown are in centimetre.",
        figure: repeatedReadingsFigure,
        difficulty: 4,
        skillTags: [
          "repeated_readings",
          "case_based",
          "percentage_uncertainty",
        ],
        parts: [
          { letter: "a", promptMarkdown: "Find the mean reading.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "Estimate the absolute uncertainty using half the range.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the percentage uncertainty to one decimal place.",
            points: 2,
          },
        ],
        hints: [
          "Use the three plotted values.",
          "Half-range uncertainty is $(\\max-\\min)/2$.",
          "Percentage uncertainty is uncertainty divided by mean, times 100.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds mean $12.4\\text{ cm}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds half-range uncertainty $0.1\\text{ cm}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds percentage uncertainty about $0.8\\%$.",
            },
          ],
        },
        commonErrors: ["Using the full range as percentage uncertainty."],
        workedSolution: [
          {
            part: "a",
            explanation: "Mean $=(12.3+12.4+12.5)/3=12.4\\text{ cm}$.",
          },
          {
            part: "b",
            explanation:
              "Half-range uncertainty $=(12.5-12.3)/2=0.1\\text{ cm}$.",
          },
          {
            part: "c",
            explanation:
              "Percentage uncertainty $=(0.1/12.4)\\times100\\approx0.8\\%$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Significant Figures and Scientific Notation",
    subtopic:
      "Meaning of significant figures, rounding rules, and reporting calculated results to the correct precision.",
    mc: [
      {
        questionLatex: "The number of significant figures in $0.004520$ is",
        difficulty: 1,
        skillTags: ["significant_figures"],
        choices: ["$3$", "$6$", "$4$", "$2$"],
        correctLetter: "C",
        rationales: {
          A: "The final zero after the decimal is significant.",
          B: "Leading zeros are not significant.",
          D: "This ignores the digit 2 and the final zero.",
        },
        hints: [
          "Leading zeros before the first non-zero digit are not significant.",
          "Zeros to the right of a decimal after non-zero digits are significant.",
          "Count $4,5,2,0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Ignore leading zeros and count measured digits.",
            math: "0.004520\\Rightarrow 4\\text{ significant figures}",
          },
        ],
      },
      {
        questionLatex:
          "Using the usual rule for addition, $12.11+0.3+4.256$ should be reported as",
        difficulty: 2,
        skillTags: ["rounding", "addition_precision"],
        choices: ["$16.666$", "$16.66$", "$17$", "$16.7$"],
        correctLetter: "D",
        rationales: {
          A: "This keeps all calculator digits and ignores decimal-place precision.",
          B: "The least precise addend has one decimal place, not two.",
          C: "This rounds too coarsely.",
        },
        hints: [
          "For addition, match the least number of decimal places.",
          "$0.3$ has one decimal place.",
          "The exact sum is $16.666$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add first, then round to one decimal place.",
            math: "12.11+0.3+4.256=16.666\\approx16.7",
          },
        ],
      },
      {
        questionLatex:
          "The product $2.5\\times3.42$, reported with the correct number of significant figures, is",
        difficulty: 2,
        skillTags: ["multiplication_precision", "significant_figures"],
        choices: ["$8.6$", "$8.55$", "$8.550$", "$9$"],
        correctLetter: "A",
        rationales: {
          B: "The calculator product is not rounded to two significant figures.",
          C: "This adds unwarranted precision.",
          D: "This rounds to one significant figure.",
        },
        hints: [
          "For multiplication, use the smaller number of significant figures.",
          "$2.5$ has two significant figures.",
          "$2.5\\times3.42=8.55$, then round to two significant figures.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Round the product to two significant figures.",
            math: "2.5\\times3.42=8.55\\approx8.6",
          },
        ],
      },
      {
        questionLatex:
          "A lab report writes a length as $7.00\\times10^3\\text{ m}$. The reported number has",
        difficulty: 2,
        skillTags: ["scientific_notation", "significant_figures"],
        choices: [
          "$1$ significant figure",
          "$3$ significant figures",
          "$2$ significant figures",
          "$4$ significant figures",
        ],
        correctLetter: "B",
        rationales: {
          A: "The zeros after the decimal in $7.00$ are significant.",
          C: "Both zeros after the decimal are significant.",
          D: "The power of ten does not add a significant figure.",
        },
        hints: [
          "Count significant figures in the coefficient.",
          "Zeros after a decimal point are significant when written as measured digits.",
          "$7.00$ has three significant figures.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Scientific notation separates size from precision.",
            math: "7.00\\times10^3\\Rightarrow3\\text{ significant figures}",
          },
        ],
      },
      {
        questionLatex:
          "Assertion (A): The zeros in $3.00\\text{ s}$ are significant. Reason (R): Trailing zeros after a decimal point show the precision of a measurement.",
        difficulty: 3,
        skillTags: ["assertion_reason", "significant_figures"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is false, but R is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason explains exactly why those trailing zeros are significant.",
          B: "The reason is true for decimal measurements.",
          D: "The assertion is also true.",
        },
        hints: [
          "Compare $3\\text{ s}$ and $3.00\\text{ s}$.",
          "The written decimal places indicate measurement precision.",
          "The reason supports the assertion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Trailing decimal zeros are significant in measured values.",
            math: "3.00\\text{ s has }3\\text{ significant figures}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write $0.000560\\text{ kg}$ in scientific notation, preserving its significant figures.",
        difficulty: 1,
        skillTags: ["scientific_notation", "significant_figures"],
        parts: singlePart("a", "Write the value in scientific notation.", 1),
        hints: [
          "Move the decimal until the coefficient is between 1 and 10.",
          "The final zero is significant.",
          "Use three significant figures.",
        ],
        rubric: singleRubric("a", 1, "Writes $5.60\\times10^{-4}\\text{ kg}$."),
        commonErrors: ["Dropping the final significant zero."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$0.000560\\text{ kg}=5.60\\times10^{-4}\\text{ kg}$. The zero in $5.60$ is retained because it is significant.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "Evaluate $15.3/3.0$ and report the answer with correct significant figures.",
        difficulty: 2,
        skillTags: ["division_precision", "significant_figures"],
        parts: singlePart("a", "Calculate and round the result.", 1),
        hints: [
          "For division, use the smaller number of significant figures.",
          "$3.0$ has two significant figures.",
          "$15.3/3.0=5.1$.",
        ],
        rubric: singleRubric("a", 1, "Reports $5.1$."),
        commonErrors: ["Reporting $5.10$ with three significant figures."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$15.3/3.0=5.1$. The answer has two significant figures because $3.0$ has two significant figures.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A cylinder has radius $2.50\\text{ cm}$ and height $10.0\\text{ cm}$. Find its volume using $\\pi=3.1416$ and report with correct significant figures.",
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["significant_figures", "volume"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Compute the unrounded volume.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Report the volume with correct significant figures.",
            points: 1,
          },
        ],
        hints: [
          "Use $V=\\pi r^2h$.",
          "Both measured quantities have three significant figures.",
          "Round the final result to three significant figures.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Computes about $196.35\\text{ cm}^3$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Reports $196\\text{ cm}^3$ or $1.96\\times10^2\\text{ cm}^3$.",
            },
          ],
        },
        commonErrors: [
          "Rounding $\\pi$ as if it limits measurement precision.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$V=3.1416(2.50)^2(10.0)=196.35\\text{ cm}^3$ approximately.",
          },
          {
            part: "b",
            explanation:
              "The measured radius and height each have three significant figures, so $V=196\\text{ cm}^3$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A sample has mass $36.4\\text{ g}$ and volume $12.0\\text{ cm}^3$. Find its density and report it correctly.",
        difficulty: 3,
        skillTags: ["density", "significant_figures"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the density before rounding.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Decide the number of significant figures allowed.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Write the final density.",
            points: 1,
          },
        ],
        hints: [
          "Use $\\rho=m/V$.",
          "Both measurements have three significant figures.",
          "Round the quotient to three significant figures.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Calculates $3.033\\ldots\\text{ g cm}^{-3}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Identifies three significant figures.",
            },
            {
              part: "c",
              points: 1,
              description: "Reports $3.03\\text{ g cm}^{-3}$.",
            },
          ],
        },
        commonErrors: ["Keeping all calculator digits in the final answer."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\rho=36.4/12.0=3.033\\ldots\\text{ g cm}^{-3}$.",
          },
          {
            part: "b",
            explanation:
              "$36.4$ and $12.0$ each have three significant figures, so the density should have three significant figures.",
          },
          {
            part: "c",
            explanation: "The final density is $3.03\\text{ g cm}^{-3}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A lab notebook records distance and time for a slow trolley as shown.",
        figure: labNotebookFigure,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["case_based", "significant_figures", "speed"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State the number of significant figures in the distance.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the number of significant figures in the time.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Calculate the speed and report it with correct significant figures.",
            points: 2,
          },
        ],
        hints: [
          "Leading zeros do not count, but trailing decimal zeros after a non-zero digit do.",
          "For division, the answer follows the smaller significant-figure count.",
          "Speed is distance divided by time.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States $0.0500\\text{ m}$ has three significant figures.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States $4.2\\text{ s}$ has two significant figures.",
            },
            {
              part: "c",
              points: 1,
              description: "Computes about $0.0119\\text{ m s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Reports $0.012\\text{ m s}^{-1}$ or $1.2\\times10^{-2}\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Reporting speed to three significant figures because the distance has three.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$0.0500\\text{ m}$ has three significant figures: $5,0,0$.",
          },
          {
            part: "b",
            explanation: "$4.2\\text{ s}$ has two significant figures.",
          },
          {
            part: "c",
            explanation:
              "$v=0.0500/4.2=0.0119\\ldots\\text{ m s}^{-1}$. The limiting count is two significant figures, so $v=0.012\\text{ m s}^{-1}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Dimensions of Physical Quantities",
    subtopic:
      "Dimensional formulae of common physical quantities and constants.",
    mc: [
      {
        questionLatex: "The dimensional formula of impulse is",
        difficulty: 2,
        skillTags: ["dimensions", "impulse"],
        choices: [
          "$[MLT^{-2}]$",
          "$[ML^2T^{-2}]$",
          "$[M^0L^0T^0]$",
          "$[MLT^{-1}]$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This is the dimension of force.",
          B: "This is the dimension of work or energy.",
          C: "Impulse is not dimensionless.",
        },
        hints: [
          "Impulse is force multiplied by time.",
          "$[F]=[MLT^{-2}]$.",
          "Multiply by $[T]$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use impulse = force $\\times$ time.",
            math: "[J]=[F][t]=[MLT^{-2}][T]=[MLT^{-1}]",
          },
        ],
      },
      {
        questionLatex:
          "From $F=G\\frac{m_1m_2}{r^2}$, the dimensional formula of $G$ is",
        difficulty: 3,
        skillTags: ["dimensions", "gravitational_constant"],
        choices: [
          "$[M^{-1}L^3T^{-2}]$",
          "$[MLT^{-2}]$",
          "$[M^{-2}L^2T^{-2}]$",
          "$[ML^{-1}T^{-2}]$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is force, not the gravitational constant.",
          C: "This does not correctly account for the two masses and $r^2$.",
          D: "This is the dimension of pressure or stress.",
        },
        hints: [
          "Rearrange as $G=Fr^2/(m_1m_2)$.",
          "Use $[F]=[MLT^{-2}]$ and $[r^2]=[L^2]$.",
          "Divide by $[M^2]$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rearrange Newton's gravitation law dimensionally.",
            math: "[G]=\\frac{[F][r]^2}{[m]^2}=\\frac{[MLT^{-2}][L^2]}{[M^2]}=[M^{-1}L^3T^{-2}]",
          },
        ],
      },
      {
        questionLatex:
          "The strain of a stretched wire is dimensionless because it is",
        difficulty: 2,
        skillTags: ["dimensionless_quantities", "strain"],
        choices: [
          "force divided by area",
          "change in length divided by original length",
          "work divided by time",
          "mass divided by volume",
        ],
        correctLetter: "B",
        rationales: {
          A: "Force divided by area is stress, which has dimensions.",
          C: "Work divided by time is power.",
          D: "Mass divided by volume is density.",
        },
        hints: [
          "Strain compares two lengths.",
          "A ratio of like quantities has no dimensions.",
          "$\\Delta L/L$ is dimensionless.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Write strain as a ratio of lengths.",
            math: "\\text{strain}=\\frac{\\Delta L}{L}\\Rightarrow [M^0L^0T^0]",
          },
        ],
      },
      {
        questionLatex:
          "Using Stokes' law $F=6\\pi\\eta rv$, the dimensional formula of coefficient of viscosity $\\eta$ is",
        difficulty: 3,
        skillTags: ["dimensions", "viscosity"],
        choices: [
          "$[MLT^{-1}]$",
          "$[M^{-1}L^3T^{-2}]$",
          "$[ML^{-1}T^{-1}]$",
          "$[ML^2T^{-2}]$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the dimension of momentum, not viscosity.",
          B: "This is the gravitational constant pattern.",
          D: "This is energy.",
        },
        hints: [
          "Ignore the dimensionless constant $6\\pi$.",
          "$[F]=[\\eta][r][v]$.",
          "Use $[r]=[L]$ and $[v]=[LT^{-1}]$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Solve for viscosity dimensions.",
            math: "[\\eta]=\\frac{[F]}{[r][v]}=\\frac{[MLT^{-2}]}{[L][LT^{-1}]}=[ML^{-1}T^{-1}]",
          },
        ],
      },
      {
        questionLatex:
          "Assertion (A): Plane angle is dimensionless. Reason (R): Plane angle is the ratio of arc length to radius.",
        difficulty: 3,
        skillTags: ["assertion_reason", "dimensionless_quantities"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
          "Both A and R are true, and R is the correct explanation of A.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The reason explains why the dimensions cancel.",
          B: "The reason is true.",
          C: "The assertion is also true.",
        },
        hints: [
          "In radians, $\\theta=s/r$.",
          "Both $s$ and $r$ are lengths.",
          "A ratio of lengths is dimensionless.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the radian definition.",
            math: "[\\theta]=\\frac{[L]}{[L]}=[M^0L^0T^0]",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: "Write the dimensional formula of linear momentum.",
        difficulty: 1,
        skillTags: ["dimensions", "momentum"],
        parts: singlePart("a", "State the dimensional formula.", 1),
        hints: [
          "Momentum is mass times velocity.",
          "$[v]=[LT^{-1}]$.",
          "Multiply by $[M]$.",
        ],
        rubric: singleRubric("a", 1, "Writes $[MLT^{-1}]$."),
        commonErrors: [
          "Writing force dimensions instead of momentum dimensions.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$p=mv$, so $[p]=[M][LT^{-1}]=[MLT^{-1}]$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "Why is coefficient of friction treated as a dimensionless quantity?",
        difficulty: 2,
        skillTags: ["dimensionless_quantities", "friction"],
        parts: singlePart("a", "Give the dimensional reason.", 1),
        hints: [
          "Coefficient of friction is frictional force divided by normal reaction.",
          "Both numerator and denominator are forces.",
          "Dimensions cancel.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Explains that it is a ratio of two forces.",
        ),
        commonErrors: [
          "Saying it is dimensionless only because it has no unit name.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mu=F/N$. Since both $F$ and $N$ are forces, $[\\mu]=[F]/[F]=[M^0L^0T^0]$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Derive the dimensional formula of Young's modulus using stress and strain.",
        difficulty: 3,
        skillTags: ["dimensions", "young_modulus"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the dimension of stress.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Use strain to get the dimension of Young's modulus.",
            points: 1,
          },
        ],
        hints: [
          "Young's modulus is stress divided by strain.",
          "Strain is dimensionless.",
          "Stress is force per area.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds stress dimension $[ML^{-1}T^{-2}]$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States Young's modulus has the same dimension as stress.",
            },
          ],
        },
        commonErrors: ["Treating strain as having length dimension."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Stress $=F/A$, so $[\\text{stress}]=[MLT^{-2}]/[L^2]=[ML^{-1}T^{-2}]$.",
          },
          {
            part: "b",
            explanation:
              "Young's modulus $=\\text{stress}/\\text{strain}$. Since strain is dimensionless, $[Y]=[ML^{-1}T^{-2}]$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A spring obeys $F=kx$, where $F$ is force and $x$ is extension. Find the dimensions and SI unit of $k$.",
        difficulty: 3,
        skillTags: ["dimensions", "spring_constant"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Rearrange the equation for $k$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the dimensional formula of $k$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Write the SI unit of $k$.",
            points: 1,
          },
        ],
        hints: [
          "$k=F/x$.",
          "Force has dimensions $[MLT^{-2}]$.",
          "Extension has dimension $[L]$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $k=F/x$." },
            { part: "b", points: 2, description: "Finds $[MT^{-2}]$." },
            {
              part: "c",
              points: 1,
              description:
                "Writes SI unit $\\text{N m}^{-1}$ or $\\text{kg s}^{-2}$.",
            },
          ],
        },
        commonErrors: ["Leaving an extra length dimension in the answer."],
        workedSolution: [
          { part: "a", explanation: "From $F=kx$, $k=F/x$." },
          {
            part: "b",
            explanation: "$[k]=[F]/[x]=[MLT^{-2}]/[L]=[MT^{-2}]$.",
          },
          {
            part: "c",
            explanation:
              "The SI unit is $\\text{N m}^{-1}$, equivalent to $\\text{kg s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A model for a resistive force is written as $F=at+bv$, where $t$ is time and $v$ is speed.",
        difficulty: 4,
        skillTags: ["case_based", "dimensions", "homogeneity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the dimensional formula of $a$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the dimensional formula of $b$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why $a$ and $b$ need not have the same dimensions.",
            points: 1,
          },
        ],
        hints: [
          "Each term added to give $F$ must have the dimensions of force.",
          "For $at$, use $[a][T]=[F]$.",
          "For $bv$, use $[b][LT^{-1}]=[F]$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $[a]=[MLT^{-3}]$." },
            { part: "b", points: 2, description: "Finds $[b]=[MT^{-1}]$." },
            {
              part: "c",
              points: 1,
              description:
                "Explains that $at$ and $bv$ have force dimensions even though $a$ and $b$ differ.",
            },
          ],
        },
        commonErrors: [
          "Assuming constants in the same equation must have the same dimensions.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $at$ has the dimensions of force, $[a]=[F]/[t]=[MLT^{-2}]/[T]=[MLT^{-3}]$.",
          },
          {
            part: "b",
            explanation:
              "Since $bv$ has the dimensions of force, $[b]=[F]/[v]=[MLT^{-2}]/[LT^{-1}]=[MT^{-1}]$.",
          },
          {
            part: "c",
            explanation:
              "$a$ multiplies time and $b$ multiplies speed. The products $at$ and $bv$ must match force, but $a$ and $b$ themselves need not match each other.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Dimensional Analysis and Its Applications",
    subtopic:
      "Checking dimensional consistency, finding dimensions of constants, deriving proportional forms, and understanding limitations.",
    mc: [
      {
        questionLatex:
          "Which expression cannot be dimensionally correct for kinetic energy?",
        difficulty: 2,
        skillTags: ["dimensional_checking", "energy"],
        choices: ["$K=mv$", "$K=\\frac12mv^2$", "$K=3mv^2$", "$K=p^2/(2m)$"],
        correctLetter: "A",
        rationales: {
          B: "This has dimensions $[M][L^2T^{-2}]$, the dimensions of energy.",
          C: "A numerical factor does not affect dimensions.",
          D: "$p^2/m$ has dimensions $[M^2L^2T^{-2}]/[M]=[ML^2T^{-2}]$.",
        },
        hints: [
          "Energy has dimensions $[ML^2T^{-2}]$.",
          "$mv$ has dimensions of momentum.",
          "Numerical constants do not affect dimensions.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Check the dimensions of $mv$.",
            math: "[mv]=[M][LT^{-1}]=[MLT^{-1}]\\ne[ML^2T^{-2}]",
          },
        ],
      },
      {
        questionLatex:
          "The relation $s=ut+\\frac12at^2$ is dimensionally consistent because every term has dimensions of",
        difficulty: 2,
        skillTags: ["dimensional_homogeneity", "kinematics"],
        choices: ["velocity", "length", "acceleration", "time"],
        correctLetter: "B",
        rationales: {
          A: "$ut$ is length, not velocity.",
          C: "$at^2$ is length, not acceleration.",
          D: "The equation gives displacement, not time.",
        },
        hints: [
          "$s$ is displacement.",
          "$[ut]=[LT^{-1}][T]$.",
          "$[at^2]=[LT^{-2}][T^2]$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Check the dimensions of each term.",
            math: "[ut]=[L],\\quad [at^2]=[L]",
          },
        ],
      },
      {
        questionLatex:
          "A formula is derived dimensionally as $x\\propto gt^2$. Dimensional analysis alone cannot decide whether the numerical factor is",
        difficulty: 2,
        skillTags: ["limitations_of_dimensional_analysis"],
        choices: ["$g$", "$t$", "$\\frac12$", "$x$"],
        correctLetter: "C",
        rationales: {
          A: "$g$ is not a dimensionless numerical factor.",
          B: "$t$ is not dimensionless.",
          D: "$x$ is the dependent physical quantity, not a pure number.",
        },
        hints: [
          "Dimensional analysis can find powers of dimensional quantities.",
          "It cannot find pure numerical constants.",
          "$1/2$ has no dimensions.",
        ],
        solution: [
          {
            step: 1,
            explanation: "State the limitation of dimensional analysis.",
            math: "\\text{dimensionless constants such as }\\frac12\\text{ are not determined}",
          },
        ],
      },
      {
        questionLatex:
          "If a resistive force is written as $F=kv^2$, the dimensional formula of $k$ is",
        difficulty: 3,
        skillTags: ["constant_dimensions", "dimensional_analysis"],
        choices: [
          "$[MT^{-1}]$",
          "$[MLT^{-2}]$",
          "$[ML^{-1}T^{-1}]$",
          "$[ML^{-1}]$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This would be correct for $F=kv$, not for $F=kv^2$.",
          B: "This is the dimension of force.",
          C: "This is the dimension of viscosity.",
        },
        hints: [
          "Rearrange as $k=F/v^2$.",
          "$[v^2]=[L^2T^{-2}]$.",
          "Divide force dimensions by speed-squared dimensions.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find $k$ from dimensional homogeneity.",
            math: "[k]=\\frac{[MLT^{-2}]}{[L^2T^{-2}]}=[ML^{-1}]",
          },
        ],
      },
      {
        questionLatex:
          "Assertion (A): A dimensionally correct equation can still be physically wrong. Reason (R): Dimensional analysis cannot determine dimensionless numerical constants.",
        difficulty: 3,
        skillTags: ["assertion_reason", "limitations_of_dimensional_analysis"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The missing numerical factor is one reason dimensional correctness is not sufficient.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Dimensional correctness is a necessary test.",
          "It is not a complete derivation.",
          "Pure numbers like $2$ or $\\pi$ are invisible to dimensional checks.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the limitation.",
            math: "\\text{dimensionally correct}\\not\\Rightarrow\\text{physically complete}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "If a force is modeled as $F=kv$, where $v$ is speed, find the dimensional formula of $k$.",
        difficulty: 2,
        skillTags: ["constant_dimensions"],
        parts: singlePart("a", "Find $[k]$.", 1),
        hints: [
          "Rearrange as $k=F/v$.",
          "Use $[F]=[MLT^{-2}]$.",
          "Use $[v]=[LT^{-1}]$.",
        ],
        rubric: singleRubric("a", 1, "Finds $[MT^{-1}]$."),
        commonErrors: ["Using the result for $F=kv^2$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$[k]=[F]/[v]=[MLT^{-2}]/[LT^{-1}]=[MT^{-1}]$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "A student proposes $x=vt^2$ for displacement $x$, speed $v$, and time $t$. Is the equation dimensionally correct?",
        difficulty: 2,
        skillTags: ["dimensional_checking"],
        parts: singlePart(
          "a",
          "State whether it is dimensionally correct, with reason.",
          1,
        ),
        hints: [
          "Find dimensions of the right side.",
          "$[v]=[LT^{-1}]$.",
          "$[vt^2]=[LT]$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States it is not dimensionally correct because RHS has dimension $[LT]$, not $[L]$.",
        ),
        commonErrors: [
          "Checking only that the variables are kinematics variables.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$[vt^2]=[LT^{-1}][T^2]=[LT]$, but $[x]=[L]$. Hence the equation is not dimensionally correct.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Assume the time period of a simple pendulum depends only on length $l$ and acceleration due to gravity $g$: $T\\propto l^a g^b$. Find $a$ and $b$ using dimensions.",
        difficulty: 4,
        skillTags: ["dimensional_derivation", "pendulum"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the dimensional equation.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $a$ and $b$.", points: 2 },
        ],
        hints: [
          "$[T]=[L]^a[LT^{-2}]^b$.",
          "Compare powers of $L$ and $T$.",
          "Solve $a+b=0$ and $-2b=1$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $[T]=[L]^a[LT^{-2}]^b$.",
            },
            { part: "b", points: 1, description: "Finds $b=-1/2$." },
            { part: "b", points: 1, description: "Finds $a=1/2$." },
          ],
        },
        commonErrors: ["Writing $[g]=[LT^{-1}]$ instead of $[LT^{-2}]$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$[T]=[l]^a[g]^b=[L]^a[LT^{-2}]^b=[L^{a+b}T^{-2b}]$.",
          },
          {
            part: "b",
            explanation:
              "Comparing powers gives $-2b=1$, so $b=-1/2$. Also $a+b=0$, so $a=1/2$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A viscous drag force on a small sphere depends on coefficient of viscosity $\\eta$, radius $r$, and speed $v$. Use dimensional analysis to find the proportional form of $F$.",
        difficulty: 4,
        skillTags: ["dimensional_derivation", "viscous_drag"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Assume $F\\propto \\eta^a r^b v^c$ and write dimensions.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $a$, $b$, and $c$.", points: 3 },
          {
            letter: "c",
            promptMarkdown: "State one limitation of the result.",
            points: 1,
          },
        ],
        hints: [
          "$[\\eta]=[ML^{-1}T^{-1}]$.",
          "Compare powers of $M$, $L$, and $T$ with $[F]=[MLT^{-2}]$.",
          "Dimensional analysis cannot find the numerical coefficient.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes a correct dimensional setup.",
            },
            { part: "b", points: 1, description: "Finds $a=1$." },
            { part: "b", points: 1, description: "Finds $c=1$." },
            { part: "b", points: 1, description: "Finds $b=1$." },
            {
              part: "c",
              points: 1,
              description:
                "States that constants such as $6\\pi$ cannot be found dimensionally.",
            },
          ],
        },
        commonErrors: [
          "Expecting dimensional analysis to produce Stokes' coefficient $6\\pi$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $F\\propto\\eta^a r^b v^c$. Then $[MLT^{-2}]=[ML^{-1}T^{-1}]^a[L]^b[LT^{-1}]^c$.",
          },
          {
            part: "b",
            explanation:
              "Comparing powers: $M$ gives $a=1$; $T$ gives $-a-c=-2$, so $c=1$; $L$ gives $-a+b+c=1$, so $b=1$. Thus $F\\propto\\eta rv$.",
          },
          {
            part: "c",
            explanation:
              "Dimensional analysis cannot determine the numerical coefficient, so it cannot produce the $6\\pi$ factor of Stokes' law.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A designer estimates the power $P$ needed to push an object through air. The power is assumed to depend on air density $\\rho$, frontal area $A$, and speed $v$.",
        difficulty: 5,
        skillTags: ["case_based", "dimensional_derivation", "power"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Assume $P\\propto\\rho^aA^bv^c$ and write the dimensions.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find $a$, $b$, and $c$.", points: 3 },
          {
            letter: "c",
            promptMarkdown: "State the proportional dependence of $P$.",
            points: 1,
          },
        ],
        hints: [
          "$[P]=[ML^2T^{-3}]$.",
          "$[\\rho]=[ML^{-3}]$, $[A]=[L^2]$, and $[v]=[LT^{-1}]$.",
          "Compare powers of $M$, $L$, and $T$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes the correct dimensional setup.",
            },
            { part: "b", points: 1, description: "Finds $a=1$." },
            { part: "b", points: 1, description: "Finds $c=3$." },
            { part: "b", points: 1, description: "Finds $b=1$." },
            {
              part: "c",
              points: 1,
              description: "States $P\\propto\\rho A v^3$.",
            },
          ],
        },
        commonErrors: [
          "Using speed squared because drag force often contains $v^2$, but forgetting power adds one more factor of speed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$[ML^2T^{-3}]=[ML^{-3}]^a[L^2]^b[LT^{-1}]^c$.",
          },
          {
            part: "b",
            explanation:
              "Comparing powers gives $a=1$ from mass and $c=3$ from time. For length, $-3a+2b+c=2$, so $-3+2b+3=2$ and $b=1$.",
          },
          {
            part: "c",
            explanation:
              "Therefore $P\\propto\\rho A v^3$ up to a dimensionless constant.",
          },
        ],
      },
    ],
  },
];

export const physicalWorldMeasurementTopics: Topic[] =
  topicSeeds.map(makeTopic);
