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
const UNIT = "u3-laws-of-motion";
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
  return `You chose ${choiceText}. Recheck the free-body diagram, force balance, or momentum condition before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_laws_of_motion_reasoning"),
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
      "uses_formula_without_identifying_the_external_force_or_system",
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
      "states_final_value_without_a_force_or_momentum_argument",
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

const blockForceFigure: ItemFigure = {
  type: "svg",
  title: "Free-body diagram of a block on a horizontal surface",
  description:
    "A 3 kg block has an 18 N applied force to the right, 6 N friction to the left, normal reaction upward, and weight downward.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <defs>
    <marker id="u3-arrow-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="u3-arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
    <marker id="u3-arrow-gray" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#475569"/>
    </marker>
  </defs>
  <line x1="90" y1="280" x2="540" y2="280" stroke="#94a3b8" stroke-width="3"/>
  <rect x="250" y="205" width="120" height="75" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="284" y="249" font-family="Arial, sans-serif" font-size="18" fill="#1e3a8a">3 kg</text>
  <line x1="370" y1="242" x2="505" y2="242" stroke="#2563eb" stroke-width="4" marker-end="url(#u3-arrow-blue)"/>
  <line x1="250" y1="242" x2="150" y2="242" stroke="#dc2626" stroke-width="4" marker-end="url(#u3-arrow-red)"/>
  <line x1="310" y1="205" x2="310" y2="90" stroke="#475569" stroke-width="4" marker-end="url(#u3-arrow-gray)"/>
  <line x1="310" y1="280" x2="310" y2="350" stroke="#475569" stroke-width="4" marker-end="url(#u3-arrow-gray)"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="430" y="224" fill="#1d4ed8">18 N</text>
    <text x="170" y="224" fill="#b91c1c">6 N</text>
    <text x="322" y="116">N</text>
    <text x="322" y="340">mg</text>
  </g>
</svg>`,
};

const forceTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Force-time graph for an impulse",
  description:
    "Force rises linearly from 0 to 20 N in 2 s, stays at 20 N until 5 s, then falls to zero at 7 s.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <path d="M90 80H540 M90 130H540 M90 180H540 M90 230H540 M90 280H540"/>
    <path d="M90 280V70 M190 280V70 M340 280V70 M440 280V70 M540 280V70"/>
  </g>
  <line x1="90" y1="280" x2="560" y2="280" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="280" x2="90" y2="60" stroke="#334155" stroke-width="2"/>
  <path d="M560 280 L548 274 M560 280 L548 286" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M90 60 L84 72 M90 60 L96 72" stroke="#334155" stroke-width="2" fill="none"/>
  <polygon points="90,280 190,80 340,80 440,280" fill="#bfdbfe" opacity="0.45"/>
  <polyline points="90,280 190,80 340,80 440,280" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round"/>
  <g fill="#2563eb">
    <circle cx="90" cy="280" r="5"/>
    <circle cx="190" cy="80" r="5"/>
    <circle cx="340" cy="80" r="5"/>
    <circle cx="440" cy="280" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#334155">
    <text x="563" y="302">t (s)</text>
    <text x="36" y="58">F (N)</text>
    <text x="84" y="302">0</text><text x="184" y="302">2</text><text x="334" y="302">5</text><text x="434" y="302">7</text>
    <text x="56" y="85">20</text>
  </g>
</svg>`,
};

const collisionCartsFigure: ItemFigure = {
  type: "svg",
  title: "Two carts stick together after collision",
  description:
    "Before collision, a 2 kg cart moves right at 4 m/s toward a 3 kg cart at rest. After collision, they move together.",
  svg: `<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="380" fill="#ffffff"/>
  <defs>
    <marker id="u3-cart-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="70" y1="165" x2="570" y2="165" stroke="#94a3b8" stroke-width="2"/>
  <line x1="70" y1="315" x2="570" y2="315" stroke="#94a3b8" stroke-width="2"/>
  <rect x="110" y="110" width="100" height="50" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="345" y="110" width="120" height="50" rx="6" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <circle cx="135" cy="170" r="9" fill="#334155"/><circle cx="185" cy="170" r="9" fill="#334155"/>
  <circle cx="375" cy="170" r="9" fill="#334155"/><circle cx="435" cy="170" r="9" fill="#334155"/>
  <line x1="215" y1="135" x2="310" y2="135" stroke="#2563eb" stroke-width="4" marker-end="url(#u3-cart-arrow)"/>
  <rect x="245" y="260" width="165" height="50" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <circle cx="280" cy="320" r="9" fill="#334155"/><circle cx="375" cy="320" r="9" fill="#334155"/>
  <line x1="415" y1="285" x2="510" y2="285" stroke="#16a34a" stroke-width="4" marker-end="url(#u3-cart-arrow)"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#334155">
    <text x="78" y="82">Before</text>
    <text x="78" y="235">After sticking</text>
    <text x="122" y="103">2 kg</text>
    <text x="222" y="124">4 m/s</text>
    <text x="368" y="103">3 kg at rest</text>
    <text x="278" y="253">combined mass 5 kg</text>
  </g>
</svg>`,
};

const concurrentForcesFigure: ItemFigure = {
  type: "svg",
  title: "Concurrent forces at a point",
  description:
    "Two perpendicular forces of 30 N east and 40 N north act at a point; the equilibrant is opposite to their resultant.",
  svg: `<svg viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="380" fill="#ffffff"/>
  <defs>
    <marker id="u3-force-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
    <marker id="u3-force-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="u3-force-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
  <circle cx="270" cy="180" r="7" fill="#334155"/>
  <line x1="270" y1="180" x2="390" y2="180" stroke="#16a34a" stroke-width="4" marker-end="url(#u3-force-green)"/>
  <line x1="270" y1="180" x2="270" y2="20" stroke="#2563eb" stroke-width="4" marker-end="url(#u3-force-blue)"/>
  <line x1="270" y1="180" x2="150" y2="340" stroke="#dc2626" stroke-width="4" marker-end="url(#u3-force-red)"/>
  <path d="M390 180V20 M270 20H390" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="400" y="185" fill="#15803d">30 N east</text>
    <text x="282" y="80" fill="#1d4ed8">40 N north</text>
    <text x="56" y="344" fill="#b91c1c">equilibrant</text>
  </g>
</svg>`,
};

const frictionGraphFigure: ItemFigure = {
  type: "svg",
  title: "Friction versus applied force",
  description:
    "Static friction matches the applied force up to 12 N, then kinetic friction is 9 N during sliding.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <path d="M90 80H540 M90 130H540 M90 180H540 M90 230H540 M90 280H540"/>
    <path d="M90 280V70 M190 280V70 M290 280V70 M390 280V70 M490 280V70"/>
  </g>
  <line x1="90" y1="280" x2="560" y2="280" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="280" x2="90" y2="60" stroke="#334155" stroke-width="2"/>
  <path d="M560 280 L548 274 M560 280 L548 286" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M90 60 L84 72 M90 60 L96 72" stroke="#334155" stroke-width="2" fill="none"/>
  <polyline points="90,280 330,100" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="330" cy="100" r="6" fill="#2563eb"/>
  <line x1="330" y1="145" x2="520" y2="145" stroke="#dc2626" stroke-width="4"/>
  <path d="M330 100V280" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <g font-family="Arial, sans-serif" font-size="14" fill="#334155">
    <text x="563" y="302">applied force (N)</text>
    <text x="24" y="58">friction (N)</text>
    <text x="84" y="302">0</text><text x="322" y="302">12</text>
    <text x="55" y="105">12</text><text x="62" y="150">9</text>
    <text x="165" y="190" fill="#1d4ed8">static</text>
    <text x="410" y="132" fill="#b91c1c">kinetic</text>
  </g>
</svg>`,
};

const bankedRoadFigure: ItemFigure = {
  type: "svg",
  title: "Vehicle on a banked circular road",
  description:
    "A car on a banked road has weight vertically downward and normal reaction perpendicular to the road; the horizontal component of normal reaction points toward the centre.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="u3-bank-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="u3-bank-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
    <marker id="u3-bank-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
  </defs>
  <path d="M120 285 L500 170" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
  <path d="M120 285 L500 285" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="284" y="190" width="92" height="44" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3" transform="rotate(-16 330 212)"/>
  <circle cx="305" cy="235" r="8" fill="#334155"/><circle cx="364" cy="218" r="8" fill="#334155"/>
  <line x1="330" y1="212" x2="277" y2="55" stroke="#2563eb" stroke-width="4" marker-end="url(#u3-bank-blue)"/>
  <line x1="330" y1="212" x2="330" y2="345" stroke="#dc2626" stroke-width="4" marker-end="url(#u3-bank-red)"/>
  <line x1="330" y1="212" x2="205" y2="212" stroke="#16a34a" stroke-width="4" marker-end="url(#u3-bank-green)"/>
  <path d="M385 270 A58 58 0 0 0 371 232" stroke="#f97316" stroke-width="4" fill="none"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="244" y="61" fill="#1d4ed8">N</text>
    <text x="342" y="332" fill="#b91c1c">mg</text>
    <text x="128" y="206" fill="#15803d">toward centre</text>
    <text x="386" y="258" fill="#ea580c">&#952;</text>
  </g>
</svg>`,
};

const levelCurveFrictionFigure: ItemFigure = {
  type: "svg",
  title: "Static friction on a level circular track",
  description:
    "A top-view diagram shows static friction split into radial and tangential components while a car speeds up on a level curve.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="u3-level-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="u3-level-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
    <marker id="u3-level-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
  </defs>
  <circle cx="310" cy="205" r="130" fill="none" stroke="#cbd5e1" stroke-width="18"/>
  <circle cx="310" cy="205" r="4" fill="#64748b"/>
  <rect x="410" y="160" width="72" height="38" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3" transform="rotate(50 446 179)"/>
  <line x1="446" y1="179" x2="338" y2="202" stroke="#2563eb" stroke-width="4" marker-end="url(#u3-level-blue)"/>
  <line x1="446" y1="179" x2="475" y2="106" stroke="#dc2626" stroke-width="4" marker-end="url(#u3-level-red)"/>
  <line x1="446" y1="179" x2="374" y2="126" stroke="#16a34a" stroke-width="4" marker-end="url(#u3-level-green)"/>
  <path d="M374 126 L338 202 M374 126 L475 106" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#334155">
    <text x="295" y="225">centre</text>
    <text x="272" y="195" fill="#2563eb">radial part</text>
    <text x="482" y="104" fill="#dc2626">tangential part</text>
    <text x="370" y="118" fill="#15803d">resultant friction</text>
    <text x="415" y="238">top view</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Force, Inertia and Newton's Laws",
    subtopic:
      "Intuitive concept of force, inertia, Newton's first law, second law, third law, and free-body diagrams.",
    mc: [
      {
        questionLatex: L`A passenger in a bus tends to fall forward when the bus suddenly stops. This is best explained by`,
        difficulty: 1,
        skillTags: ["inertia", "newtons_first_law"],
        choices: [
          "inertia of motion",
          "inertia of rest",
          "Newton's third law alone",
          "absence of gravity",
        ],
        correctLetter: "A",
        rationales: {
          B: "The passenger's upper body was already moving with the bus, so the relevant inertia is inertia of motion.",
          C: "Action-reaction pairs are not the main explanation for the forward tendency.",
          D: "Gravity is still present.",
        },
        hints: [
          "Ask what state of motion the passenger's body had just before stopping.",
          "Newton's first law says a body resists change in its state of motion.",
          "The upper body tends to continue moving forward.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The passenger's body tends to continue its forward motion, so the effect is due to inertia of motion.",
          },
        ],
      },
      {
        questionLatex: L`In the free-body diagram, the acceleration of the $3\text{ kg}$ block is`,
        figure: blockForceFigure,
        difficulty: 2,
        skillTags: ["free_body_diagram", "newtons_second_law"],
        choices: [
          "$6\\text{ m s}^{-2}$ to the right",
          "$4\\text{ m s}^{-2}$ to the right",
          "$8\\text{ m s}^{-2}$ to the left",
          "$0$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses the applied force alone and ignores friction.",
          C: "The larger horizontal force is to the right, not left.",
          D: "The horizontal forces are not balanced.",
        },
        hints: [
          "Only horizontal unbalanced force causes horizontal acceleration.",
          "Net horizontal force is applied force minus friction.",
          "Use $a=F_{\\text{net}}/m$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the horizontal net force.",
            math: "F_{\\text{net}}=18-6=12\\text{ N}",
          },
          {
            step: 2,
            explanation: "Apply Newton's second law.",
            math: "a=\\frac{12}{3}=4\\text{ m s}^{-2}",
          },
        ],
      },
      {
        questionLatex: L`If the net external force on a body is zero, then the body`,
        difficulty: 2,
        skillTags: ["newtons_first_law", "balanced_forces"],
        choices: [
          "must come to rest immediately",
          "must move with increasing speed",
          "may remain at rest or move with constant velocity",
          "must have zero velocity",
        ],
        correctLetter: "C",
        rationales: {
          A: "Zero net force means zero acceleration, not instant stopping.",
          B: "Increasing speed requires acceleration and hence non-zero net force.",
          D: "A body can have constant non-zero velocity with zero net force.",
        },
        hints: [
          "Newton's first law is about acceleration, not only rest.",
          "Zero net force means no change in velocity.",
          "Constant velocity includes rest as a special case.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use Newton's first law.",
            math: "F_{\\text{net}}=0\\Rightarrow a=0\\Rightarrow v=\\text{constant}",
          },
        ],
      },
      {
        questionLatex: L`A book rests on a table. The action-reaction pair to the force exerted by the table on the book is`,
        difficulty: 3,
        skillTags: ["newtons_third_law", "action_reaction_pairs"],
        choices: [
          "the weight of the book",
          "the force exerted by the earth on the book",
          "the force exerted by the table on the floor",
          "the force exerted by the book on the table",
        ],
        correctLetter: "D",
        rationales: {
          A: "Weight and normal reaction act on the same body, so they are not a Newton-third-law pair.",
          B: "This is another force on the book, not the reaction to the table's force.",
          C: "This force is on the floor, not the reaction exerted by the book on the table.",
        },
        hints: [
          "Action-reaction forces act on two different bodies.",
          "They are equal in magnitude and opposite in direction.",
          "If the table acts on the book, the book acts on the table.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The table pushes the book upward; the book pushes the table downward with equal magnitude.",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A seat belt helps reduce injury when a car stops suddenly. Reason (R): The belt provides an external force that changes the passenger's forward motion more safely.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "inertia", "newtons_laws"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the protective role of the seat belt.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Without a belt, the passenger tends to continue moving forward.",
          "Stopping the passenger requires an external force.",
          "The belt supplies that force over the body in a controlled way.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The seat belt exerts a force on the passenger and changes the passenger's motion, reducing the chance of impact with the car interior.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A net force of $8\text{ N}$ acts on a body of mass $2\text{ kg}$. Find its acceleration.`,
        difficulty: 1,
        skillTags: ["newtons_second_law"],
        parts: singlePart("a", "Find the acceleration.", 1),
        hints: ["Use Newton's second law.", "$a=F/m$.", "$8/2=4$."],
        rubric: singleRubric("a", 1, "Finds $4\\text{ m s}^{-2}$."),
        commonErrors: ["Multiplying mass and force instead of dividing."],
        workedSolution: [
          {
            part: "a",
            explanation: "$a=F/m=8/2=4\\text{ m s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Name the property of a body because of which it resists a change in its state of rest or uniform motion.`,
        difficulty: 1,
        skillTags: ["inertia"],
        parts: singlePart("a", "Name the property.", 1),
        hints: [
          "This property appears in Newton's first law.",
          "It is related to mass.",
          "It is called inertia.",
        ],
        rubric: singleRubric("a", 1, "States inertia."),
        commonErrors: [
          "Writing force; force causes change, it is not the resisting property.",
        ],
        workedSolution: [
          { part: "a", explanation: "The property is inertia." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $5\text{ kg}$ box on a smooth horizontal surface is pulled by a horizontal force of $15\text{ N}$.`,
        difficulty: 2,
        skillTags: ["newtons_second_law", "free_body_diagram"],
        parts: [
          { letter: "a", promptMarkdown: "Find the acceleration.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "State the vertical force balance.",
            points: 1,
          },
        ],
        hints: [
          "The surface is smooth, so ignore friction.",
          "Horizontal acceleration comes from $F=ma$.",
          "Vertically, the box does not accelerate.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $3\\text{ m s}^{-2}$.",
            },
            { part: "b", points: 1, description: "States $N=mg$." },
          ],
        },
        commonErrors: ["Adding weight into the horizontal net force."],
        workedSolution: [
          { part: "a", explanation: "$a=15/5=3\\text{ m s}^{-2}$." },
          {
            part: "b",
            explanation:
              "There is no vertical acceleration, so normal reaction balances weight: $N=mg$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the free-body diagram of the block.`,
        figure: blockForceFigure,
        difficulty: 4,
        skillTags: ["free_body_diagram", "newtons_laws", "net_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the horizontal net force.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the acceleration.", points: 1 },
          {
            letter: "c",
            promptMarkdown:
              "State why the vertical forces do not affect the horizontal acceleration.",
            points: 2,
          },
        ],
        hints: [
          "Resolve forces by direction.",
          "Only unbalanced horizontal force changes horizontal motion.",
          "The vertical acceleration is zero on the horizontal surface.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $12\\text{ N}$ to the right.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $4\\text{ m s}^{-2}$ to the right.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains that $N$ and $mg$ balance vertically, so horizontal acceleration is governed by horizontal net force.",
            },
          ],
        },
        commonErrors: [
          "Treating all four arrows as forces along the same line.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$F_{\\text{net},x}=18-6=12\\text{ N}$ to the right.",
          },
          {
            part: "b",
            explanation: "$a=F/m=12/3=4\\text{ m s}^{-2}$ to the right.",
          },
          {
            part: "c",
            explanation:
              "$N$ and $mg$ are vertical and balance because the block has no vertical acceleration. They do not contribute to horizontal acceleration.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school van moves uniformly on a straight road. It then brakes suddenly at a traffic signal. A student wearing a seat belt remains held to the seat, while a loose bag slides forward.`,
        difficulty: 3,
        skillTags: ["case_based", "inertia", "newtons_first_law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which law explains the bag's forward motion?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Why does the bag slide forward?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "What role does the seat belt play for the student?",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown:
              "Name the physical property involved in this situation.",
            points: 1,
          },
        ],
        hints: [
          "Think about what continues in motion when the van stops.",
          "The force from a belt can change a passenger's motion.",
          "The resisting property is inertia.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies Newton's first law.",
            },
            {
              part: "b",
              points: 1,
              description: "Explains inertia of motion.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains that the belt supplies an external restraining force to reduce forward motion safely.",
            },
            { part: "d", points: 1, description: "Names inertia." },
          ],
        },
        commonErrors: [
          "Saying the bag moves forward because a forward force acts on it after braking.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Newton's first law explains the bag's tendency to continue moving.",
          },
          {
            part: "b",
            explanation:
              "The bag had forward velocity and tends to continue in that state when the van stops.",
          },
          {
            part: "c",
            explanation:
              "The seat belt exerts a force on the student and changes the student's motion more safely than an abrupt collision with the dashboard.",
          },
          { part: "d", explanation: "The property involved is inertia." },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Momentum, Impulse and Newton's Second Law",
    subtopic:
      "Linear momentum, impulse, force as rate of change of momentum, and force-time graphs.",
    mc: [
      {
        questionLatex: L`A $2\text{ kg}$ body moving with speed $3\text{ m s}^{-1}$ has momentum`,
        difficulty: 1,
        skillTags: ["momentum"],
        choices: [
          "$1.5\\text{ kg m s}^{-1}$",
          "$6\\text{ kg m s}^{-1}$",
          "$5\\text{ kg m s}^{-1}$",
          "$9\\text{ kg m s}^{-1}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This divides speed by mass instead of multiplying.",
          C: "This adds mass and speed.",
          D: "This squares the speed unnecessarily.",
        },
        hints: [
          "Momentum is mass times velocity.",
          "Use $p=mv$.",
          "$2\\times3=6$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute momentum.",
            math: "p=mv=2(3)=6\\text{ kg m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`The impulse delivered by the force-time graph is`,
        figure: forceTimeGraphFigure,
        difficulty: 3,
        skillTags: ["impulse", "force_time_graph"],
        choices: [
          "$40\\text{ N s}$",
          "$140\\text{ N s}$",
          "$100\\text{ N s}$",
          "$20\\text{ N s}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This counts only the first triangular part twice or omits the rectangle.",
          B: "This treats the whole interval as a rectangle of height $20\\text{ N}$.",
          D: "This reads only the maximum force, not impulse.",
        },
        hints: [
          "Impulse is area under the force-time graph.",
          "Split the graph into two triangles and one rectangle.",
          "$\\frac12(2)(20)+(3)(20)+\\frac12(2)(20)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add areas under the graph.",
            math: "J=20+60+20=100\\text{ N s}",
          },
        ],
      },
      {
        questionLatex: L`A force of $12\text{ N}$ acts on a $3\text{ kg}$ body for $4\text{ s}$ from rest. The final speed is`,
        difficulty: 2,
        skillTags: ["impulse", "newtons_second_law"],
        choices: [
          "$4\\text{ m s}^{-1}$",
          "$48\\text{ m s}^{-1}$",
          "$9\\text{ m s}^{-1}$",
          "$16\\text{ m s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This is acceleration only, not final speed after $4\\text{ s}$.",
          B: "This is impulse in newton-second, not speed.",
          C: "This adds mass, force, and time without using units.",
        },
        hints: [
          "First find acceleration using $F=ma$.",
          "$a=12/3=4\\text{ m s}^{-2}$.",
          "Starting from rest, $v=at$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find acceleration and final speed.",
            math: "a=\\frac{12}{3}=4\\text{ m s}^{-2},\\quad v=0+4(4)=16\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`A ball of mass $0.2\text{ kg}$ changes velocity from $10\text{ m s}^{-1}$ east to $5\text{ m s}^{-1}$ west. Taking east as positive, the impulse on the ball is`,
        difficulty: 3,
        skillTags: ["impulse", "momentum_change", "sign_convention"],
        choices: [
          "$-3\\text{ N s}$",
          "$+3\\text{ N s}$",
          "$+1\\text{ N s}$",
          "$-1\\text{ N s}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The impulse is westward, so it is negative when east is positive.",
          C: "This uses only the final speed.",
          D: "This subtracts speeds without accounting for direction correctly.",
        },
        hints: [
          "Impulse equals change in momentum.",
          "Use signs: east positive, west negative.",
          "$\\Delta p=m(v-u)=0.2(-5-10)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute change in momentum.",
            math: "J=\\Delta p=0.2(-5-10)=-3\\text{ N s}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Impulse has the same SI unit as momentum. Reason (R): Impulse is equal to change in momentum.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "impulse_momentum_theorem"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The equality of impulse and change in momentum directly explains the unit match.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Write the impulse-momentum theorem.",
          "Impulse $J=F\\Delta t$.",
          "$J=\\Delta p$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Impulse equals change in momentum.",
            math: "J=\\Delta p",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the momentum of a $5\text{ kg}$ object moving at $4\text{ m s}^{-1}$.`,
        difficulty: 1,
        skillTags: ["momentum"],
        parts: singlePart("a", "Find the momentum.", 1),
        hints: [
          "Use $p=mv$.",
          "Multiply mass and velocity.",
          "$5\\times4=20$.",
        ],
        rubric: singleRubric("a", 1, "Finds $20\\text{ kg m s}^{-1}$."),
        commonErrors: ["Writing only the speed without multiplying by mass."],
        workedSolution: [
          {
            part: "a",
            explanation: "$p=mv=5(4)=20\\text{ kg m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A constant force of $15\text{ N}$ acts for $0.4\text{ s}$. Find the impulse.`,
        difficulty: 1,
        skillTags: ["impulse"],
        parts: singlePart("a", "Find the impulse.", 1),
        hints: [
          "Use $J=F\\Delta t$.",
          "Multiply force by time.",
          "$15\\times0.4=6$.",
        ],
        rubric: singleRubric("a", 1, "Finds $6\\text{ N s}$."),
        commonErrors: ["Dividing by time instead of multiplying."],
        workedSolution: [
          { part: "a", explanation: "$J=F\\Delta t=15(0.4)=6\\text{ N s}$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $5\text{ kg}$ trolley starts from rest and experiences the force shown in the force-time graph.`,
        figure: forceTimeGraphFigure,
        difficulty: 4,
        skillTags: ["force_time_graph", "impulse_momentum_theorem"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the impulse delivered.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the final speed of the trolley.",
            points: 1,
          },
        ],
        hints: [
          "Area under the graph gives impulse.",
          "Impulse equals change in momentum.",
          "Starting from rest, $J=mv$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $100\\text{ N s}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $20\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Using maximum force times total time as impulse."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Impulse $=\\frac12(2)(20)+(3)(20)+\\frac12(2)(20)=100\\text{ N s}$.",
          },
          {
            part: "b",
            explanation:
              "$J=\\Delta p=mv$, so $100=5v$ and $v=20\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A cricket ball of mass $0.15\text{ kg}$ moving at $15\text{ m s}^{-1}$ towards a bat rebounds at $25\text{ m s}^{-1}$ in the opposite direction. The contact time is $0.02\text{ s}$.`,
        difficulty: 4,
        skillTags: ["impulse", "average_force", "sign_convention"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Taking the rebound direction as positive, find the change in momentum.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the average force on the ball.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the direction of the force.",
            points: 1,
          },
        ],
        hints: [
          "Choose one direction as positive and keep signs consistent.",
          "Initial velocity is opposite to the rebound direction.",
          "Average force is impulse divided by contact time.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $6\\text{ N s}$." },
            { part: "b", points: 2, description: "Finds $300\\text{ N}$." },
            {
              part: "c",
              points: 1,
              description: "States force is in the rebound direction.",
            },
          ],
        },
        commonErrors: [
          "Subtracting speeds as $25-15$ instead of using opposite directions.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Take rebound direction positive. Then $u=-15\\text{ m s}^{-1}$ and $v=+25\\text{ m s}^{-1}$. Hence $\\Delta p=m(v-u)=0.15(25-(-15))=6\\text{ N s}$.",
          },
          {
            part: "b",
            explanation:
              "$F_{\\text{avg}}=\\Delta p/\\Delta t=6/0.02=300\\text{ N}$.",
          },
          {
            part: "c",
            explanation:
              "The force is in the direction of the rebound, because the impulse is positive in that direction.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A car safety design increases the stopping time of a passenger from $0.02\text{ s}$ to $0.20\text{ s}$ for the same change in momentum during a collision.`,
        difficulty: 3,
        skillTags: ["case_based", "impulse", "average_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "What happens to the impulse?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "By what factor does the average force change?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Explain why this reduces injury risk.",
            points: 2,
          },
        ],
        hints: [
          "The change in momentum is the same in both cases.",
          "Average force is impulse divided by time.",
          "Increasing time reduces force for the same impulse.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States impulse is unchanged.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds force becomes one-tenth of the original.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains that lower average force on the body reduces injury risk.",
            },
          ],
        },
        commonErrors: [
          "Saying impulse becomes smaller because force becomes smaller.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The impulse is unchanged because the change in momentum is the same.",
          },
          {
            part: "b",
            explanation:
              "The time increases by a factor of $0.20/0.02=10$, so average force becomes one-tenth.",
          },
          {
            part: "c",
            explanation:
              "A smaller average force over a longer time is less damaging to the passenger's body.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Conservation of Linear Momentum",
    subtopic:
      "Isolated systems, recoil, explosions, and one-dimensional collision applications.",
    mc: [
      {
        questionLatex: L`For the carts shown, if they stick together after collision, their common speed is`,
        figure: collisionCartsFigure,
        difficulty: 3,
        skillTags: ["momentum_conservation", "perfectly_inelastic_collision"],
        choices: [
          "$4\\text{ m s}^{-1}$",
          "$0.8\\text{ m s}^{-1}$",
          "$1.6\\text{ m s}^{-1}$",
          "$2.4\\text{ m s}^{-1}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This ignores the extra mass after the carts stick together.",
          B: "This divides by the wrong total mass.",
          D: "This adds masses incorrectly in the momentum equation.",
        },
        hints: [
          "Use momentum conservation for the two-cart system.",
          "Initial momentum is from the moving cart only.",
          "$(2)(4)=(2+3)v$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply conservation of linear momentum.",
            math: "2(4)+3(0)=5v\\Rightarrow v=1.6\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`A gun of mass $4\text{ kg}$ fires a bullet of mass $0.02\text{ kg}$ with speed $400\text{ m s}^{-1}$. The recoil speed of the gun is`,
        difficulty: 3,
        skillTags: ["recoil", "momentum_conservation"],
        choices: [
          "$2\\text{ m s}^{-1}$ along the bullet",
          "$8\\text{ m s}^{-1}$ opposite to the bullet",
          "$0.5\\text{ m s}^{-1}$ opposite to the bullet",
          "$2\\text{ m s}^{-1}$ opposite to the bullet",
        ],
        correctLetter: "D",
        rationales: {
          A: "The gun recoils opposite to the bullet so total momentum remains zero.",
          B: "This omits division by the gun mass.",
          C: "This divides by bullet speed instead of gun mass.",
        },
        hints: [
          "Initial momentum is zero.",
          "Final bullet momentum and gun momentum must cancel.",
          "$0.02(400)=4v$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use conservation of momentum.",
            math: "0=0.02(400)-4v\\Rightarrow v=2\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`Linear momentum of a system is conserved when`,
        difficulty: 2,
        skillTags: ["momentum_conservation", "isolated_system"],
        choices: [
          "net external force on the system is zero",
          "internal forces are absent",
          "kinetic energy is always conserved",
          "all bodies in the system are at rest",
        ],
        correctLetter: "A",
        rationales: {
          B: "Internal forces may exist; they cancel in equal and opposite pairs within the system.",
          C: "Momentum can be conserved even when kinetic energy is not conserved.",
          D: "Moving systems can also have conserved momentum.",
        },
        hints: [
          "Momentum conservation is a system statement.",
          "External forces can change total momentum.",
          "Internal action-reaction forces cancel in total momentum accounting.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Total linear momentum remains constant when the net external force on the system is zero.",
          },
        ],
      },
      {
        questionLatex: L`An object at rest explodes into two parts of masses $1\text{ kg}$ and $3\text{ kg}$. The $1\text{ kg}$ part moves at $12\text{ m s}^{-1}$ east. The velocity of the $3\text{ kg}$ part is`,
        difficulty: 3,
        skillTags: ["explosion", "momentum_conservation"],
        choices: [
          "$4\\text{ m s}^{-1}$ east",
          "$4\\text{ m s}^{-1}$ west",
          "$12\\text{ m s}^{-1}$ west",
          "$36\\text{ m s}^{-1}$ west",
        ],
        correctLetter: "B",
        rationales: {
          A: "The second part must move opposite to keep total momentum zero.",
          C: "This ignores the mass ratio.",
          D: "This multiplies by mass instead of dividing by $3$.",
        },
        hints: [
          "The initial momentum is zero.",
          "Final momenta must add to zero.",
          "$1(12)+3v=0$ if east is positive.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set total final momentum to zero.",
            math: "12+3v=0\\Rightarrow v=-4\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): During a collision of two carts on a smooth horizontal track, total momentum of the two-cart system can remain conserved. Reason (R): The forces exerted by the carts on each other are internal to the chosen system.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "momentum_conservation"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is false, but R is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The internal nature of the collision forces is exactly why they do not change total system momentum.",
          B: "The reason is true.",
          D: "The assertion is true for negligible external horizontal force.",
        },
        hints: [
          "Choose the system as both carts together.",
          "Forces between the carts are equal and opposite internal forces.",
          "On a smooth horizontal track, external horizontal force is negligible.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The carts exert internal forces on each other. With negligible external horizontal force, total momentum is conserved.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $1\text{ kg}$ cart moving at $6\text{ m s}^{-1}$ sticks to a stationary $2\text{ kg}$ cart. Find their common speed.`,
        difficulty: 2,
        skillTags: ["momentum_conservation"],
        parts: singlePart("a", "Find the common speed.", 1),
        hints: [
          "Use conservation of momentum.",
          "Initial momentum is $1\\times6$.",
          "Final mass is $3\\text{ kg}$.",
        ],
        rubric: singleRubric("a", 1, "Finds $2\\text{ m s}^{-1}$."),
        commonErrors: [
          "Using conservation of kinetic energy for a sticking collision.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$1(6)+2(0)=3v$, so $v=2\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $3\text{ kg}$ gun fires a $0.02\text{ kg}$ bullet at $300\text{ m s}^{-1}$. Find the recoil speed of the gun.`,
        difficulty: 2,
        skillTags: ["recoil"],
        parts: singlePart("a", "Find the recoil speed.", 1),
        hints: [
          "Initial momentum is zero.",
          "Gun momentum is opposite to bullet momentum.",
          "$0.02(300)=3v$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Finds $2\\text{ m s}^{-1}$ opposite to bullet motion.",
        ),
        commonErrors: ["Giving the recoil direction the same as the bullet."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Bullet momentum $=0.02(300)=6\\text{ kg m s}^{-1}$. The gun has equal opposite momentum, so speed $=6/3=2\\text{ m s}^{-1}$ opposite to the bullet.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two skaters on a frictionless surface are initially at rest. Skater A of mass $40\text{ kg}$ pushes skater B of mass $60\text{ kg}$. After the push, A moves west at $3\text{ m s}^{-1}$.`,
        difficulty: 3,
        skillTags: ["momentum_conservation", "recoil"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the speed of skater B.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the direction of skater B's motion.",
            points: 1,
          },
        ],
        hints: [
          "Total initial momentum is zero.",
          "Take east as positive.",
          "The skaters move in opposite directions.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "States east." },
          ],
        },
        commonErrors: ["Putting both final momenta in the same direction."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Take east as positive, so A has velocity $-3\\text{ m s}^{-1}$. $0=40(-3)+60v_B$, hence $v_B=2\\text{ m s}^{-1}$.",
          },
          { part: "b", explanation: "The positive sign means B moves east." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the collision diagram of the two carts that stick together.`,
        figure: collisionCartsFigure,
        difficulty: 4,
        skillTags: [
          "momentum_conservation",
          "inelastic_collision",
          "kinetic_energy_loss",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the common speed after collision.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the initial kinetic energy.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the final kinetic energy.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the kinetic energy lost.",
            points: 1,
          },
        ],
        hints: [
          "Momentum is conserved, but kinetic energy need not be.",
          "The carts stick, so they share a common final speed.",
          "Compute kinetic energy before and after separately.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $1.6\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $16\\text{ J}$." },
            { part: "c", points: 1, description: "Finds $6.4\\text{ J}$." },
            {
              part: "d",
              points: 1,
              description: "Finds $9.6\\text{ J}$ lost.",
            },
          ],
        },
        commonErrors: [
          "Assuming kinetic energy is conserved in a sticking collision.",
        ],
        workedSolution: [
          { part: "a", explanation: "$2(4)=5v$, so $v=1.6\\text{ m s}^{-1}$." },
          { part: "b", explanation: "$K_i=\\frac12(2)(4^2)=16\\text{ J}$." },
          { part: "c", explanation: "$K_f=\\frac12(5)(1.6^2)=6.4\\text{ J}$." },
          {
            part: "d",
            explanation: "Kinetic energy lost $=16-6.4=9.6\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A firecracker initially at rest bursts into two fragments. Fragment A has mass $0.2\text{ kg}$ and moves east at $30\text{ m s}^{-1}$. Fragment B has mass $0.3\text{ kg}$. External forces during the short burst are negligible.`,
        difficulty: 4,
        skillTags: ["case_based", "explosion", "momentum_conservation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the total initial momentum.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the momentum of fragment A.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the velocity of fragment B.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "State why momentum conservation can be used.",
            points: 1,
          },
        ],
        hints: [
          "The firecracker starts from rest.",
          "Final momenta must add to zero.",
          "Use east as positive.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "States zero." },
            {
              part: "b",
              points: 1,
              description: "Finds $6\\text{ kg m s}^{-1}$ east.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds $20\\text{ m s}^{-1}$ west.",
            },
            {
              part: "d",
              points: 1,
              description: "Mentions negligible external force during burst.",
            },
          ],
        },
        commonErrors: ["Making both fragments move in the same direction."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Initial momentum is zero because the firecracker is at rest.",
          },
          {
            part: "b",
            explanation: "$p_A=0.2(30)=6\\text{ kg m s}^{-1}$ east.",
          },
          {
            part: "c",
            explanation:
              "Total final momentum is zero, so $p_B=-6\\text{ kg m s}^{-1}$. Thus $v_B=-6/0.3=-20\\text{ m s}^{-1}$, i.e. $20\\text{ m s}^{-1}$ west.",
          },
          {
            part: "d",
            explanation:
              "Momentum conservation applies because external forces are negligible over the short burst.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Equilibrium and Friction",
    subtopic:
      "Equilibrium of concurrent forces, static and kinetic friction, laws of friction, rolling friction, and lubrication.",
    mc: [
      {
        questionLatex: L`For the two perpendicular forces shown, the magnitude of the equilibrant is`,
        figure: concurrentForcesFigure,
        difficulty: 3,
        skillTags: ["concurrent_forces", "equilibrant"],
        choices: [
          "$70\\text{ N}$",
          "$10\\text{ N}$",
          "$120\\text{ N}$",
          "$50\\text{ N}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This is the scalar sum, not the vector resultant.",
          B: "This subtracts perpendicular forces.",
          C: "This multiplies the force magnitudes.",
        },
        hints: [
          "The equilibrant has the same magnitude as the resultant and opposite direction.",
          "The shown forces are perpendicular.",
          "$R=\\sqrt{30^2+40^2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the resultant magnitude.",
            math: "R=\\sqrt{30^2+40^2}=50\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`From the friction graph, the limiting static friction is`,
        figure: frictionGraphFigure,
        difficulty: 2,
        skillTags: ["static_friction", "friction_graph"],
        choices: [
          "$12\\text{ N}$",
          "$9\\text{ N}$",
          "$21\\text{ N}$",
          "$3\\text{ N}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the kinetic friction during sliding.",
          C: "This adds limiting and kinetic friction.",
          D: "This is the difference between limiting and kinetic friction.",
        },
        hints: [
          "Limiting static friction is the maximum static friction just before sliding.",
          "On the graph, it is the peak of the static part.",
          "Read the top of the rising line.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The static friction reaches a maximum at $12\\text{ N}$.",
            math: "f_{s,\\max}=12\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`A $10\text{ kg}$ block rests on a horizontal surface. If $\mu_s=0.25$ and $g=10\text{ m s}^{-2}$, the limiting static friction is`,
        difficulty: 2,
        skillTags: ["limiting_friction", "normal_reaction"],
        choices: [
          "$250\\text{ N}$",
          "$25\\text{ N}$",
          "$40\\text{ N}$",
          "$10\\text{ N}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This multiplies by $g$ twice or misreads the coefficient.",
          C: "This uses the mass but not the coefficient correctly.",
          D: "This gives the mass value as force.",
        },
        hints: [
          "On a horizontal surface, $N=mg$.",
          "Limiting friction is $\\mu_sN$.",
          "$N=100\\text{ N}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute limiting friction.",
            math: "f_{s,\\max}=\\mu_sN=0.25(100)=25\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`A horizontal force of $8\text{ N}$ is applied to a block, but the limiting static friction is $12\text{ N}$. If the block remains at rest, the friction force is`,
        difficulty: 3,
        skillTags: ["static_friction", "friction_adjusts"],
        choices: [
          "$12\\text{ N}$",
          "$4\\text{ N}$",
          "$8\\text{ N}$",
          "$20\\text{ N}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "Static friction takes the value needed up to the limiting value; it is not always maximum.",
          B: "This subtracts instead of balancing the applied force.",
          D: "This adds applied force and limiting friction.",
        },
        hints: [
          "Static friction is self-adjusting.",
          "Since the block is at rest, horizontal forces balance.",
          "The needed friction is less than the limiting value.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Static friction balances the applied force while possible.",
            math: "f_s=8\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Lubrication can reduce friction between two surfaces. Reason (R): A lubricant forms a thin layer that reduces direct contact between surface irregularities.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "lubrication", "friction"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
          "Both A and R are true, and R is the correct explanation of A.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The reason directly explains how lubrication reduces friction.",
          B: "The reason is true.",
          C: "The assertion is also true.",
        },
        hints: [
          "Friction is affected by contact between surfaces.",
          "Lubricants separate the surfaces slightly.",
          "This reduces interlocking of irregularities.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Lubrication reduces direct contact between irregularities, reducing friction.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A block has normal reaction $80\text{ N}$ and coefficient of limiting friction $0.3$. Find the limiting friction.`,
        difficulty: 1,
        skillTags: ["limiting_friction"],
        parts: singlePart("a", "Find limiting friction.", 1),
        hints: [
          "Use $f_{\\max}=\\mu_sN$.",
          "Multiply $0.3$ by $80$.",
          "$0.3\\times80=24$.",
        ],
        rubric: singleRubric("a", 1, "Finds $24\\text{ N}$."),
        commonErrors: ["Using mass instead of normal reaction."],
        workedSolution: [
          {
            part: "a",
            explanation: "$f_{\\max}=\\mu_sN=0.3(80)=24\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A block is at rest under a horizontal pull of $6\text{ N}$. The limiting static friction is $10\text{ N}$. Find the static friction acting on the block.`,
        difficulty: 2,
        skillTags: ["static_friction_adjusts"],
        parts: singlePart("a", "Find the static friction.", 1),
        hints: [
          "The block is at rest.",
          "Static friction balances the applied force if it is below the limiting value.",
          "$6\\text{ N}<10\\text{ N}$.",
        ],
        rubric: singleRubric("a", 1, "Finds $6\\text{ N}$ opposite the pull."),
        commonErrors: [
          "Writing limiting friction even when the block has not started moving.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $6\\text{ N}$ is less than limiting friction, static friction adjusts to $6\\text{ N}$ opposite the pull.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two concurrent forces of $30\text{ N}$ east and $40\text{ N}$ north act on a ring.`,
        difficulty: 3,
        skillTags: ["concurrent_forces", "equilibrant"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the resultant force.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the magnitude and direction of the equilibrant.",
            points: 1,
          },
        ],
        hints: [
          "The forces are perpendicular.",
          "The equilibrant is opposite to the resultant.",
          "Use the $3$-$4$-$5$ triangle.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $50\\text{ N}$ resultant.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States $50\\text{ N}$ opposite to the resultant, southwest.",
            },
          ],
        },
        commonErrors: ["Adding $30$ and $40$ directly as scalars."],
        workedSolution: [
          { part: "a", explanation: "$R=\\sqrt{30^2+40^2}=50\\text{ N}$." },
          {
            part: "b",
            explanation:
              "The equilibrant has magnitude $50\\text{ N}$ and acts opposite to the resultant, toward the southwest.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the friction graph shown.`,
        figure: frictionGraphFigure,
        difficulty: 4,
        skillTags: ["friction_graph", "static_friction", "kinetic_friction"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the friction force when the applied force is $8\\text{ N}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the limiting static friction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the friction force when the body is sliding.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why part (a) is not equal to the limiting friction.",
            points: 2,
          },
        ],
        hints: [
          "Read the rising part for static friction.",
          "Static friction adjusts until the limiting value.",
          "The flat lower line represents kinetic friction.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $8\\text{ N}$." },
            { part: "b", points: 1, description: "Finds $12\\text{ N}$." },
            { part: "c", points: 1, description: "Finds $9\\text{ N}$." },
            {
              part: "d",
              points: 2,
              description:
                "Explains static friction is self-adjusting and reaches maximum only at impending motion.",
            },
          ],
        },
        commonErrors: [
          "Treating static friction as always equal to its limiting value.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "At $8\\text{ N}$ applied force, static friction is $8\\text{ N}$.",
          },
          {
            part: "b",
            explanation: "The peak of the static part is $12\\text{ N}$.",
          },
          {
            part: "c",
            explanation:
              "The sliding part of the graph gives kinetic friction $9\\text{ N}$.",
          },
          {
            part: "d",
            explanation:
              "Static friction adjusts to balance the applied force while the body remains at rest. It becomes $12\\text{ N}$ only at the limiting condition.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A $20\text{ kg}$ crate is on a rough horizontal floor. Take $g=10\text{ m s}^{-2}$, $\mu_s=0.4$, and $\mu_k=0.3$.`,
        difficulty: 4,
        skillTags: [
          "case_based",
          "static_friction",
          "kinetic_friction",
          "newtons_second_law",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the normal reaction.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the limiting static friction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If a $60\\text{ N}$ horizontal pull is applied, find the friction force.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "If a $100\\text{ N}$ horizontal pull is applied after motion starts, find the acceleration.",
            points: 2,
          },
        ],
        hints: [
          "On a horizontal floor, $N=mg$.",
          "Compare the applied force with limiting static friction.",
          "When sliding, use kinetic friction for net force.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $200\\text{ N}$." },
            { part: "b", points: 1, description: "Finds $80\\text{ N}$." },
            {
              part: "c",
              points: 1,
              description: "Finds static friction $60\\text{ N}$.",
            },
            {
              part: "d",
              points: 2,
              description: "Finds acceleration $2\\text{ m s}^{-2}$.",
            },
          ],
        },
        commonErrors: [
          "Using kinetic friction even when the crate is still at rest.",
        ],
        workedSolution: [
          { part: "a", explanation: "$N=mg=20(10)=200\\text{ N}$." },
          { part: "b", explanation: "$f_{s,\\max}=0.4(200)=80\\text{ N}$." },
          {
            part: "c",
            explanation:
              "Since $60\\text{ N}<80\\text{ N}$, the crate remains at rest and static friction is $60\\text{ N}$.",
          },
          {
            part: "d",
            explanation:
              "During sliding, $f_k=0.3(200)=60\\text{ N}$. Net force $=100-60=40\\text{ N}$, so $a=40/20=2\\text{ m s}^{-2}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Dynamics of Uniform Circular Motion",
    subtopic:
      "Centripetal force, level circular roads, banked roads, and examples of circular motion.",
    mc: [
      {
        questionLatex: L`A $2\text{ kg}$ body moves in a circle of radius $5\text{ m}$ with speed $10\text{ m s}^{-1}$. The required centripetal force is`,
        difficulty: 2,
        skillTags: ["centripetal_force"],
        choices: [
          "$40\\text{ N}$",
          "$20\\text{ N}$",
          "$100\\text{ N}$",
          "$4\\text{ N}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is $v^2/r$ without multiplying by mass.",
          C: "This uses $mv^2$ and omits division by radius.",
          D: "This uses $mv/r$ instead of $mv^2/r$.",
        },
        hints: [
          "Centripetal force is $mv^2/r$.",
          "Square the speed first.",
          "$2(10^2)/5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute centripetal force.",
            math: "F_c=\\frac{mv^2}{r}=\\frac{2(10^2)}{5}=40\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`For a car moving uniformly on a level circular road, the centripetal force is mainly provided by`,
        difficulty: 2,
        skillTags: ["level_circular_road", "friction"],
        choices: [
          "weight of the car",
          "static friction between tyres and road",
          "normal reaction alone",
          "kinetic friction only",
        ],
        correctLetter: "B",
        rationales: {
          A: "Weight acts vertically and does not point toward the horizontal centre of the circular path.",
          C: "On a level road, normal reaction is vertical.",
          D: "The tyres need static friction when rolling without slipping.",
        },
        hints: [
          "The centripetal force is horizontal toward the centre.",
          "On a level road, $N$ and $mg$ are vertical.",
          "The horizontal road force is static friction.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Static friction acts sideways toward the centre and provides the centripetal force.",
          },
        ],
      },
      {
        questionLatex: L`A car of mass $1000\text{ kg}$ turns on a level circular road of radius $50\text{ m}$ at $10\text{ m s}^{-1}$. The required frictional force is`,
        difficulty: 3,
        skillTags: ["level_circular_road", "centripetal_force"],
        choices: [
          "$10000\\text{ N}$",
          "$500\\text{ N}$",
          "$2000\\text{ N}$",
          "$200\\text{ N}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This multiplies mass and speed but does not use $v^2/r$.",
          B: "This misses a factor in $mv^2/r$.",
          D: "This uses $v^2/r$ without multiplying by mass.",
        },
        hints: [
          "On a level road, friction supplies centripetal force.",
          "Use $F=mv^2/r$.",
          "$1000(10^2)/50$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the required centripetal force.",
            math: "F=\\frac{1000(10^2)}{50}=2000\\text{ N}",
          },
        ],
      },
      {
        questionLatex: L`A frictionless banked road is designed for a vehicle moving at $10\text{ m s}^{-1}$ on a curve of radius $20\text{ m}$. Taking $g=10\text{ m s}^{-2}$, the value of $\tan\theta$ for safe banking is`,
        difficulty: 3,
        skillTags: ["banked_road", "centripetal_force"],
        choices: ["$2$", "$1$", "$0.25$", "$0.5$"],
        correctLetter: "D",
        rationales: {
          A: "This inverts the ratio.",
          B: "This ignores the radius.",
          C: "This divides by an extra factor of $2$.",
        },
        hints: [
          "For a frictionless banked road, resolve the normal reaction.",
          "Use $N\\cos\\theta=mg$ and $N\\sin\\theta=mv^2/r$.",
          "Dividing gives $\\tan\\theta=v^2/(rg)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For safe banking without friction, divide $N\\sin\\theta=mv^2/r$ by $N\\cos\\theta=mg$.",
            math: "\\tan\\theta=\\frac{v^2}{rg}",
          },
          {
            step: 2,
            explanation: "Substitute the values.",
            math: "\\tan\\theta=\\frac{10^2}{20(10)}=0.5",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A body moving with uniform speed in a circle has a net force. Reason (R): Its velocity changes continuously because the direction changes.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "centripetal_force"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The changing velocity direction directly explains why acceleration and net force exist.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Velocity is a vector.",
          "Changing direction means changing velocity.",
          "A change in velocity needs acceleration and net force.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Uniform circular motion has centripetal acceleration, so a net force toward the centre is required.",
            math: "F_c=\\frac{mv^2}{r}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $1\text{ kg}$ stone moves in a circle of radius $3\text{ m}$ with speed $6\text{ m s}^{-1}$. Find the centripetal force.`,
        difficulty: 2,
        skillTags: ["centripetal_force"],
        parts: singlePart("a", "Find the centripetal force.", 1),
        hints: ["Use $F=mv^2/r$.", "Square the speed.", "$1(6^2)/3=12$."],
        rubric: singleRubric("a", 1, "Finds $12\\text{ N}$."),
        commonErrors: ["Using $mv/r$ instead of $mv^2/r$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$F=mv^2/r=1(36)/3=12\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A car moves on a level circular road of radius $40\text{ m}$. If $\mu_s=0.25$ and $g=10\text{ m s}^{-2}$, find the maximum speed without skidding.`,
        difficulty: 3,
        skillTags: ["level_circular_road", "maximum_speed"],
        parts: singlePart("a", "Find the maximum speed.", 1),
        hints: [
          "Maximum static friction provides centripetal force.",
          "$\\mu_smg=mv^2/r$.",
          "$v=\\sqrt{\\mu_srg}$.",
        ],
        rubric: singleRubric("a", 1, "Finds $10\\text{ m s}^{-1}$."),
        commonErrors: [
          "Including mass in the final expression for maximum speed on a level road.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v_{\\max}=\\sqrt{\\mu_srg}=\\sqrt{0.25(40)(10)}=10\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A frictionless banked road is designed for speed $15\text{ m s}^{-1}$ and radius $50\text{ m}$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["banked_road", "circular_motion_dynamics"],
        parts: [
          { letter: "a", promptMarkdown: "Find $\\tan\\theta$.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "State which component of normal reaction provides centripetal force.",
            points: 1,
          },
        ],
        hints: [
          "Use $\\tan\\theta=v^2/(rg)$.",
          "The vertical component balances weight.",
          "The horizontal component points toward the centre.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $0.45$." },
            {
              part: "b",
              points: 1,
              description:
                "States the horizontal component of normal reaction.",
            },
          ],
        },
        commonErrors: [
          "Saying weight provides the horizontal centripetal force.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\tan\\theta=15^2/(50\\times10)=225/500=0.45$.",
          },
          {
            part: "b",
            explanation:
              "The horizontal component of the normal reaction provides the centripetal force.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An $800\text{ kg}$ car moves at $5\text{ m s}^{-1}$ on a level circular road of radius $25\text{ m}$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["level_circular_road", "centripetal_force", "friction"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the required centripetal force.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the force that provides it.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the minimum coefficient of static friction needed.",
            points: 2,
          },
        ],
        hints: [
          "Use $F=mv^2/r$.",
          "On a level road, friction is horizontal.",
          "At the limiting condition, $f_s=\\mu_smg$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $800\\text{ N}$." },
            {
              part: "b",
              points: 1,
              description: "Identifies static friction.",
            },
            { part: "c", points: 2, description: "Finds $\\mu_s=0.1$." },
          ],
        },
        commonErrors: [
          "Using normal reaction as the centripetal force on a level road.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$F_c=mv^2/r=800(5^2)/25=800\\text{ N}$.",
          },
          {
            part: "b",
            explanation:
              "Static friction between tyres and road provides the centripetal force.",
          },
          {
            part: "c",
            explanation: "$\\mu_smg=800$, so $\\mu_s=800/(800\\times10)=0.1$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A $1000\text{ kg}$ car moves on a level circular test track of radius $50\text{ m}$. At one instant its speed is $10\text{ m s}^{-1}$ and it is speeding up with tangential acceleration $2\text{ m s}^{-2}$. The coefficient of static friction is $0.30$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 5,
        skillTags: [
          "case_based",
          "level_circular_road",
          "friction",
          "resultant_force",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the maximum available static friction.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the radial force needed for circular motion at this instant.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the tangential force needed to produce the given tangential acceleration.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the resultant static friction required.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Decide whether the car can move this way without skidding.",
            points: 1,
          },
        ],
        hints: [
          "On a level road, static friction must supply horizontal acceleration.",
          "The radial and tangential force requirements are perpendicular.",
          "Compare the vector resultant with $\\mu_s mg$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $3000\\text{ N}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds radial force $2000\\text{ N}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds tangential force $2000\\text{ N}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Finds resultant required friction $2000\\sqrt2\\text{ N}$ or about $2828\\text{ N}$.",
            },
            {
              part: "e",
              points: 1,
              description:
                "Concludes the car does not skid because $2828<3000$.",
            },
          ],
        },
        commonErrors: [
          "Comparing only the radial force with limiting friction and ignoring the tangential component.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "On a level road, $N=mg=10000\\text{ N}$, so $f_{s,\\max}=\\mu_sN=0.30(10000)=3000\\text{ N}$.",
          },
          {
            part: "b",
            explanation:
              "The radial force required is $mv^2/r=1000(10^2)/50=2000\\text{ N}$.",
          },
          {
            part: "c",
            explanation:
              "The tangential force required is $ma_t=1000(2)=2000\\text{ N}$.",
          },
          {
            part: "d",
            explanation:
              "These two force requirements are perpendicular, so $f_s=\\sqrt{2000^2+2000^2}=2000\\sqrt2\\text{ N}\\approx2828\\text{ N}$.",
          },
          {
            part: "e",
            explanation:
              "Since $2828\\text{ N}<3000\\text{ N}$, available static friction is enough and the car can move this way without skidding.",
          },
        ],
      },
    ],
  },
];

export const lawsOfMotionTopics: Topic[] = topicSeeds.map(makeTopic);
