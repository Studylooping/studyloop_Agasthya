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
const UNIT = "u4-work-energy-power";
const VERSION = "0.1.8";
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
  return `You chose ${choiceText}. Recheck the work-energy relation, sign of work, or chosen system before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_work_energy_power_reasoning"),
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_formula_without_checking_force_direction_or_energy_loss",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_energy_change_without_identifying_external_work",
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

const angledForceFigure: ItemFigure = {
  type: "svg",
  title: "Force applied at an angle to displacement",
  description:
    "A block moves horizontally while a force of 20 N is applied at 60 degrees above the horizontal over a displacement of 5 m.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="u4-angle-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="u4-angle-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="70" y1="250" x2="570" y2="250" stroke="#94a3b8" stroke-width="3"/>
  <rect x="220" y="190" width="110" height="58" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="275" y1="219" x2="475" y2="219" stroke="#16a34a" stroke-width="4" marker-end="url(#u4-angle-green)"/>
  <line x1="275" y1="219" x2="375" y2="46" stroke="#2563eb" stroke-width="4" marker-end="url(#u4-angle-blue)"/>
  <path d="M334 219 A60 60 0 0 0 305 167" stroke="#f97316" stroke-width="4" fill="none"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="392" y="57" fill="#1d4ed8">F = 20 N</text>
    <text x="382" y="208" fill="#15803d">s = 5 m</text>
    <text x="321" y="176" fill="#ea580c">60&#176;</text>
    <text x="242" y="225" fill="#1e3a8a">block</text>
  </g>
</svg>`,
};

const forceDisplacementGraphFigure: ItemFigure = {
  type: "svg",
  title: "Force-displacement graph",
  description:
    "Force rises linearly from 0 to 20 N over 0 to 2 m, stays 20 N until 5 m, then falls linearly to zero at 7 m.",
  svg: `<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="400" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <path d="M90 80H550 M90 140H550 M90 200H550 M90 260H550 M90 320H550"/>
    <path d="M90 320V70 M220 320V70 M415 320V70 M545 320V70"/>
  </g>
  <line x1="90" y1="320" x2="570" y2="320" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="320" x2="90" y2="60" stroke="#334155" stroke-width="2"/>
  <path d="M570 320 L558 314 M570 320 L558 326" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M90 60 L84 72 M90 60 L96 72" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M90 320 L220 80 L415 80 L545 320 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <g stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5">
    <path d="M220 80V320 M415 80V320 M545 320V80 M90 80H545"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="15" fill="#334155">
    <text x="575" y="344">x (m)</text>
    <text x="36" y="58">F (N)</text>
    <text x="84" y="344">0</text>
    <text x="214" y="344">2</text>
    <text x="409" y="344">5</text>
    <text x="539" y="344">7</text>
    <text x="58" y="86">20</text>
  </g>
</svg>`,
};

const rampEnergyFigure: ItemFigure = {
  type: "svg",
  title: "Smooth ramp and vertical height",
  description:
    "A small cart starts from rest at a vertical height of 5 m above the bottom of a smooth ramp.",
  svg: `<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="380" fill="#ffffff"/>
  <path d="M120 310 L520 310 L520 110 Z" fill="#f1f5f9" stroke="#64748b" stroke-width="3"/>
  <path d="M520 110 L120 310" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/>
  <rect x="446" y="107" width="58" height="30" rx="5" fill="#dbeafe" stroke="#2563eb" stroke-width="3" transform="rotate(-27 475 122)"/>
  <circle cx="458" cy="144" r="5" fill="#334155"/><circle cx="497" cy="126" r="5" fill="#334155"/>
  <line x1="550" y1="110" x2="550" y2="310" stroke="#dc2626" stroke-width="3"/>
  <path d="M540 110H560 M540 310H560" stroke="#dc2626" stroke-width="3"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="566" y="214" fill="#b91c1c">h = 5 m</text>
    <text x="115" y="334">bottom</text>
    <text x="450" y="88">starts from rest</text>
    <text x="278" y="238" fill="#1d4ed8">smooth track</text>
  </g>
</svg>`,
};

const springGraphFigure: ItemFigure = {
  type: "svg",
  title: "Force-extension graph of a spring",
  description:
    "A straight-line spring graph rises from zero to 40 N at extension 0.40 m.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <path d="M95 80H535 M95 140H535 M95 200H535 M95 260H535 M95 320H535"/>
    <path d="M95 320V70 M205 320V70 M315 320V70 M425 320V70 M535 320V70"/>
  </g>
  <line x1="95" y1="320" x2="555" y2="320" stroke="#334155" stroke-width="2"/>
  <line x1="95" y1="320" x2="95" y2="60" stroke="#334155" stroke-width="2"/>
  <path d="M555 320 L543 314 M555 320 L543 326" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M95 60 L89 72 M95 60 L101 72" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M95 320 L535 80 L535 320 Z" fill="#dcfce7" stroke="#16a34a" stroke-width="4"/>
  <path d="M535 80V320 M95 80H535" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#334155">
    <text x="558" y="344">x (m)</text>
    <text x="38" y="58">F (N)</text>
    <text x="88" y="344">0</text>
    <text x="517" y="344">0.40</text>
    <text x="58" y="86">40</text>
  </g>
</svg>`,
};

const springRoughRampFigure: ItemFigure = {
  type: "svg",
  title: "Spring launch, rough strip and smooth ramp",
  description:
    "A block is launched by a compressed spring, crosses a rough horizontal strip, and then climbs a smooth ramp.",
  svg: `<svg viewBox="0 0 660 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="390" fill="#ffffff"/>
  <defs>
    <marker id="u4-spring-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
  <line x1="65" y1="292" x2="610" y2="292" stroke="#334155" stroke-width="3"/>
  <path d="M82 292 c10 -24 20 24 30 0 c10 -24 20 24 30 0 c10 -24 20 24 30 0 c10 -24 20 24 30 0" fill="none" stroke="#2563eb" stroke-width="4"/>
  <rect x="210" y="248" width="58" height="44" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="300" y="278" width="150" height="14" fill="#fed7aa" stroke="#f97316" stroke-width="2"/>
  <path d="M450 292 L610 178" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
  <line x1="365" y1="245" x2="315" y2="245" stroke="#dc2626" stroke-width="4" marker-end="url(#u4-spring-arrow)"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#334155">
    <text x="112" y="248" fill="#2563eb">compressed spring</text>
    <text x="324" y="319" fill="#c2410c">rough strip</text>
    <text x="505" y="211">smooth ramp</text>
    <text x="286" y="239" fill="#dc2626">friction</text>
    <text x="214" y="242">block</text>
  </g>
</svg>`,
};

const verticalCircleFigure: ItemFigure = {
  type: "svg",
  title: "Body moving in a vertical circle",
  description:
    "A body tied to a light string moves in a vertical circle; top, bottom, radius, tension direction, and weight direction are shown.",
  svg: `<svg viewBox="0 0 560 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="430" fill="#ffffff"/>
  <defs>
    <marker id="u4-vc-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="u4-vc-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
  <circle cx="280" cy="220" r="140" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <circle cx="280" cy="220" r="5" fill="#334155"/>
  <line x1="280" y1="220" x2="280" y2="80" stroke="#64748b" stroke-width="2" stroke-dasharray="5 5"/>
  <circle cx="280" cy="80" r="12" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="280" cy="360" r="12" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="268" y1="84" x2="268" y2="148" stroke="#2563eb" stroke-width="4" marker-end="url(#u4-vc-blue)"/>
  <line x1="292" y1="84" x2="292" y2="168" stroke="#dc2626" stroke-width="4" marker-end="url(#u4-vc-red)"/>
  <line x1="268" y1="356" x2="268" y2="292" stroke="#2563eb" stroke-width="4" marker-end="url(#u4-vc-blue)"/>
  <line x1="292" y1="356" x2="292" y2="410" stroke="#dc2626" stroke-width="4" marker-end="url(#u4-vc-red)"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="316" y="76">top</text>
    <text x="302" y="366">bottom</text>
    <text x="244" y="150" fill="#1d4ed8">T</text>
    <text x="304" y="180" fill="#b91c1c">mg</text>
    <text x="244" y="296" fill="#1d4ed8">T</text>
    <text x="304" y="404" fill="#b91c1c">mg</text>
    <text x="162" y="214">radius r</text>
  </g>
</svg>`,
};

const collisionTrackFigure: ItemFigure = {
  type: "svg",
  title: "Two carts stick together after collision",
  description:
    "A 1 kg cart moving at 6 m/s collides with a stationary 2 kg cart; after collision they stick together.",
  svg: `<svg viewBox="0 0 660 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="380" fill="#ffffff"/>
  <defs>
    <marker id="u4-cart-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="70" y1="170" x2="590" y2="170" stroke="#94a3b8" stroke-width="4"/>
  <line x1="70" y1="310" x2="590" y2="310" stroke="#94a3b8" stroke-width="4"/>
  <rect x="110" y="108" width="90" height="48" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="130" cy="162" r="8" fill="#334155"/><circle cx="180" cy="162" r="8" fill="#334155"/>
  <rect x="385" y="108" width="110" height="48" rx="6" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <circle cx="410" cy="162" r="8" fill="#334155"/><circle cx="470" cy="162" r="8" fill="#334155"/>
  <line x1="205" y1="132" x2="310" y2="132" stroke="#16a34a" stroke-width="4" marker-end="url(#u4-cart-arrow)"/>
  <rect x="265" y="248" width="190" height="48" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <circle cx="295" cy="302" r="8" fill="#334155"/><circle cx="425" cy="302" r="8" fill="#334155"/>
  <line x1="465" y1="272" x2="565" y2="272" stroke="#16a34a" stroke-width="4" marker-end="url(#u4-cart-arrow)"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#334155">
    <text x="82" y="72">Before</text>
    <text x="84" y="226">After sticking</text>
    <text x="124" y="99">1 kg</text>
    <text x="220" y="120">6 m/s</text>
    <text x="397" y="99">2 kg at rest</text>
    <text x="297" y="240">combined mass 3 kg</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Work by Constant and Variable Forces",
    subtopic:
      "Positive, negative, and zero work; work as scalar product; area under force-displacement graphs; variable force work.",
    mc: [
      {
        questionLatex: L`A $20\text{ N}$ force pulls a block through $5\text{ m}$ while making $60^\circ$ with the displacement. The work done by the force is`,
        difficulty: 2,
        skillTags: ["work", "dot_product", "angle_between_force_displacement"],
        choices: [
          "$50\\text{ J}$",
          "$100\\text{ J}$",
          "$0$",
          "$-50\\text{ J}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses $Fs$ and ignores the angle with displacement.",
          C: "The force is not perpendicular to the displacement.",
          D: "The force has a component along the displacement, so the work is positive.",
        },
        hints: [
          "Work by a constant force is a dot product.",
          "Use only the component of force along displacement.",
          "$W=Fs\\cos\\theta$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the scalar product form of work.",
            math: "W=20(5)\\cos60^\\circ=50\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`The work done by the variable force represented in the force-displacement graph is`,
        figure: forceDisplacementGraphFigure,
        difficulty: 3,
        skillTags: ["force_displacement_graph", "variable_force_work"],
        choices: [
          "$140\\text{ J}$",
          "$100\\text{ J}$",
          "$70\\text{ J}$",
          "$20\\text{ J}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This treats the whole interval as a rectangle of height $20\\text{ N}$.",
          C: "This averages the displacement values instead of finding area.",
          D: "This reads only the maximum force.",
        },
        hints: [
          "Work equals area under the $F$-$x$ graph.",
          "Split the shape into two triangles and one rectangle.",
          "$\\frac12(2)(20)+(3)(20)+\\frac12(2)(20)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the three areas under the graph.",
            math: "W=20+60+20=100\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`A porter carries a suitcase horizontally at constant speed while the force exerted by his hand on the suitcase is vertically upward. The work done by this upward force is`,
        difficulty: 2,
        skillTags: ["zero_work", "perpendicular_force"],
        choices: [
          "positive",
          "negative",
          "$0$",
          "equal to the weight times distance",
        ],
        correctLetter: "C",
        rationales: {
          A: "Positive work needs a component of force along displacement.",
          B: "Negative work needs a component opposite to displacement.",
          D: "Weight times horizontal distance is not work here because the force is perpendicular to displacement.",
        },
        hints: [
          "Compare direction of force and displacement.",
          "The angle between them is $90^\\circ$.",
          "$\\cos90^\\circ=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The upward force is perpendicular to horizontal displacement.",
            math: "W=Fs\\cos90^\\circ=0",
          },
        ],
      },
      {
        questionLatex: L`A particle moves along the $x$-axis from $x=0$ to $x=3\text{ m}$ under a force $F=4x\text{ N}$. The work done is`,
        difficulty: 4,
        skillTags: ["variable_force_work", "integration"],
        choices: [
          "$12\\text{ J}$",
          "$36\\text{ J}$",
          "$6\\text{ J}$",
          "$18\\text{ J}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This uses only the force at $x=3$ and misses the changing force over the path.",
          B: "This doubles the correct integral.",
          C: "This uses the average position without multiplying by displacement correctly.",
        },
        hints: [
          "For a variable force, integrate over displacement.",
          "$W=\\int_0^3 4x\\,dx$.",
          "Use $\\int x\\,dx=x^2/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Integrate the force with respect to displacement.",
            math: "W=\\int_0^3 4x\\,dx=2x^2\\big|_0^3=18\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Work is a scalar quantity. Reason (R): Work is the scalar product of force and displacement.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "work", "scalar_product"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The scalar-product definition directly explains why work is scalar.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Recall the mathematical definition of work.",
          "A dot product gives a scalar.",
          "Decide whether the reason explains the assertion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $W=\\vec F\\cdot\\vec s$, work is a scalar product and hence a scalar quantity.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A constant horizontal force of $15\text{ N}$ moves a box through $8\text{ m}$ in the direction of the force. Find the work done.`,
        difficulty: 1,
        skillTags: ["work", "constant_force"],
        parts: singlePart("a", "Find the work done.", 1),
        hints: [
          "Use $W=Fs$.",
          "The force and displacement are in the same direction.",
          "$15\\times8=120$.",
        ],
        rubric: singleRubric("a", 1, "Finds $120\\text{ J}$."),
        commonErrors: ["Writing force alone as work."],
        workedSolution: [
          { part: "a", explanation: "$W=Fs=15(8)=120\\text{ J}$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $30\text{ N}$ force makes an angle of $120^\circ$ with a displacement of $4\text{ m}$. Find the work done by the force.`,
        difficulty: 2,
        skillTags: ["negative_work", "dot_product"],
        parts: singlePart("a", "Find the work done.", 1),
        hints: [
          "Use $W=Fs\\cos\\theta$.",
          "$\\cos120^\\circ=-1/2$.",
          "A force with an obtuse angle to displacement does negative work.",
        ],
        rubric: singleRubric("a", 1, "Finds $-60\\text{ J}$."),
        commonErrors: ["Dropping the negative sign from $\\cos120^\\circ$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$W=30(4)\\cos120^\\circ=120(-1/2)=-60\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the force-displacement graph shown.`,
        figure: forceDisplacementGraphFigure,
        difficulty: 4,
        skillTags: ["force_displacement_graph", "average_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the total work done.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the average force over $0$ to $7\\text{ m}$.",
            points: 1,
          },
        ],
        hints: [
          "Work is the area under the graph.",
          "Average force equals total work divided by total displacement.",
          "Use the whole $7\\text{ m}$ interval for the average.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $100\\text{ J}$." },
            {
              part: "b",
              points: 1,
              description:
                "Finds $100/7\\text{ N}$ or $14.3\\text{ N}$ approximately.",
            },
          ],
        },
        commonErrors: ["Using maximum force as average force."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Area $=\\frac12(2)(20)+(3)(20)+\\frac12(2)(20)=100\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "$F_{\\text{avg}}=W/s=100/7\\text{ N}\\approx14.3\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A crate is pulled $10\text{ m}$ on a horizontal floor by a $50\text{ N}$ force making $37^\circ$ above the horizontal. Friction on the crate is $20\text{ N}$. Take $\cos37^\circ=0.8$.`,
        difficulty: 4,
        skillTags: ["work_by_multiple_forces", "net_work"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the work done by the pulling force.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work done by friction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the net work done on the crate.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "State the change in kinetic energy.",
            points: 1,
          },
        ],
        hints: [
          "Only the horizontal component of the pull does work.",
          "Friction acts opposite to displacement.",
          "Net work equals change in kinetic energy.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $400\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $-200\\text{ J}$." },
            { part: "c", points: 1, description: "Finds $200\\text{ J}$." },
            {
              part: "d",
              points: 1,
              description:
                "States kinetic energy increases by $200\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          "Using the full $50\\text{ N}$ pull instead of its horizontal component.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$W_P=50(10)\\cos37^\\circ=50(10)(0.8)=400\\text{ J}$.",
          },
          { part: "b", explanation: "$W_f=-20(10)=-200\\text{ J}$." },
          {
            part: "c",
            explanation: "$W_{\\text{net}}=400-200=200\\text{ J}$.",
          },
          {
            part: "d",
            explanation:
              "By the work-energy theorem, $\\Delta K=W_{\\text{net}}=200\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A particle moves from $x=0$ to $x=4\text{ m}$ under a variable force $F=(5+2x)\text{ N}$ along the positive $x$-direction.`,
        difficulty: 5,
        skillTags: ["case_based", "variable_force_work", "average_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the work due to the constant $5\\text{ N}$ part.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work due to the $2x$ part.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the total work done.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the average force over the interval.",
            points: 1,
          },
        ],
        hints: [
          "Separate the constant and variable parts of the force.",
          "Integrate $2x$ from $0$ to $4$.",
          "Average force is total work divided by displacement.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $20\\text{ J}$." },
            { part: "b", points: 2, description: "Finds $16\\text{ J}$." },
            { part: "c", points: 1, description: "Finds $36\\text{ J}$." },
            { part: "d", points: 1, description: "Finds $9\\text{ N}$." },
          ],
        },
        commonErrors: [
          "Using only the force value at $x=4\\text{ m}$ for the whole interval.",
        ],
        workedSolution: [
          { part: "a", explanation: "$W_1=5(4)=20\\text{ J}$." },
          {
            part: "b",
            explanation: "$W_2=\\int_0^4 2x\\,dx=x^2\\big|_0^4=16\\text{ J}$.",
          },
          { part: "c", explanation: "$W=20+16=36\\text{ J}$." },
          {
            part: "d",
            explanation: "$F_{\\text{avg}}=W/\\Delta x=36/4=9\\text{ N}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Kinetic Energy and Work-Energy Theorem",
    subtopic:
      "Kinetic energy, change in kinetic energy, retarding work, and applications of the work-energy theorem.",
    mc: [
      {
        questionLatex: L`A $2\text{ kg}$ body changes speed from $3\text{ m s}^{-1}$ to $7\text{ m s}^{-1}$. The net work done on it is`,
        difficulty: 2,
        skillTags: ["work_energy_theorem", "kinetic_energy_change"],
        choices: [
          "$20\\text{ J}$",
          "$40\\text{ J}$",
          "$49\\text{ J}$",
          "$80\\text{ J}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This omits part of the change in $v^2$.",
          C: "This uses final speed squared without mass and initial kinetic energy.",
          D: "This doubles the correct kinetic energy change.",
        },
        hints: [
          "Net work equals change in kinetic energy.",
          "$\\Delta K=\\frac12m(v^2-u^2)$.",
          "Here $m=2$, so the factor $\\frac12m$ is $1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the work-energy theorem.",
            math: "W_{\\text{net}}=\\frac12(2)(7^2-3^2)=40\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`If the net work done on a body is positive, then its kinetic energy`,
        difficulty: 2,
        skillTags: ["work_energy_theorem", "conceptual"],
        choices: [
          "decreases",
          "must become zero",
          "increases",
          "remains constant",
        ],
        correctLetter: "C",
        rationales: {
          A: "Negative net work decreases kinetic energy.",
          B: "Zero kinetic energy is not implied by positive net work.",
          D: "Constant kinetic energy requires zero net work.",
        },
        hints: [
          "Use $W_{\\text{net}}=\\Delta K$.",
          "Positive net work means positive change in kinetic energy.",
          "It says kinetic energy increases, not necessarily by what speed.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $W_{\\text{net}}=\\Delta K$, positive net work means $\\Delta K>0$.",
          },
        ],
      },
      {
        questionLatex: L`A cart on a smooth ramp starts from rest at height $5\text{ m}$. Taking $g=10\text{ m s}^{-2}$, its speed at the bottom is`,
        difficulty: 3,
        skillTags: ["mechanical_energy_conservation", "ramp"],
        choices: [
          "$5\\text{ m s}^{-1}$",
          "$20\\text{ m s}^{-1}$",
          "$\\sqrt{5}\\text{ m s}^{-1}$",
          "$10\\text{ m s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This treats height directly as speed.",
          B: "This misses the factor $1/2$ in kinetic energy.",
          C: "This omits $2g$.",
        },
        hints: [
          "The ramp is smooth, so mechanical energy is conserved.",
          "$mgh=\\frac12mv^2$.",
          "Mass cancels.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert potential energy into kinetic energy.",
            math: "mgh=\\frac12mv^2\\Rightarrow v=\\sqrt{2gh}=10\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`A retarding force of $20\text{ N}$ stops a $5\text{ kg}$ body moving at $10\text{ m s}^{-1}$. The stopping distance is`,
        difficulty: 3,
        skillTags: ["retarding_work", "stopping_distance"],
        choices: [
          "$12.5\\text{ m}$",
          "$25\\text{ m}$",
          "$5\\text{ m}$",
          "$50\\text{ m}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This misses the factor $1/2$ in kinetic energy.",
          C: "This divides speed by force without energy units.",
          D: "This uses $mv^2/F$ instead of $\\frac12mv^2/F$.",
        },
        hints: [
          "Retarding work removes the initial kinetic energy.",
          "$Fs=\\frac12mv^2$ in magnitude.",
          "$\\frac12(5)(10^2)/20$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Set work done against motion equal to the initial kinetic energy.",
            math: "20s=\\frac12(5)(10^2)\\Rightarrow s=12.5\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): The work-energy theorem can be applied even when friction acts. Reason (R): The theorem uses net work done by all forces.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "work_energy_theorem", "friction"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The use of net work is precisely why friction can be included.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "The theorem is not limited to conservative forces.",
          "Include work by friction with its sign.",
          "Net work equals change in kinetic energy.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The work-energy theorem states $W_{\\text{net}}=\\Delta K$, where net work includes friction and all other forces.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the kinetic energy of a $4\text{ kg}$ body moving at $5\text{ m s}^{-1}$.`,
        difficulty: 1,
        skillTags: ["kinetic_energy"],
        parts: singlePart("a", "Find the kinetic energy.", 1),
        hints: [
          "Use $K=\\frac12mv^2$.",
          "Square the speed first.",
          "$\\frac12(4)(25)=50$.",
        ],
        rubric: singleRubric("a", 1, "Finds $50\\text{ J}$."),
        commonErrors: ["Using $mv$ instead of $\\frac12mv^2$."],
        workedSolution: [
          { part: "a", explanation: "$K=\\frac12(4)(5^2)=50\\text{ J}$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $4\text{ kg}$ body starts from rest. Net work of $72\text{ J}$ is done on it. Find its final speed.`,
        difficulty: 2,
        skillTags: ["work_energy_theorem"],
        parts: singlePart("a", "Find the final speed.", 1),
        hints: [
          "Initial kinetic energy is zero.",
          "$W=\\frac12mv^2$.",
          "$72=2v^2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $6\\text{ m s}^{-1}$."),
        commonErrors: [
          "Forgetting that work changes kinetic energy, not speed directly.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$72=\\frac12(4)v^2=2v^2$, so $v=6\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cyclist and bicycle of total mass $60\text{ kg}$ increase speed from $2\text{ m s}^{-1}$ to $6\text{ m s}^{-1}$ over a distance of $80\text{ m}$.`,
        difficulty: 3,
        skillTags: ["kinetic_energy_change", "average_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the increase in kinetic energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the average net force.",
            points: 1,
          },
        ],
        hints: [
          "Use change in kinetic energy.",
          "Average net force times distance equals net work.",
          "Use $80\\text{ m}$ only after finding work.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $960\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $12\\text{ N}$." },
          ],
        },
        commonErrors: [
          "Using final kinetic energy only and ignoring initial kinetic energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta K=\\frac12(60)(6^2-2^2)=960\\text{ J}$.",
          },
          {
            part: "b",
            explanation: "$F_{\\text{avg}}=W/s=960/80=12\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $3\text{ kg}$ block moving at $8\text{ m s}^{-1}$ enters a rough horizontal patch. A constant frictional force of $12\text{ N}$ acts over $5\text{ m}$.`,
        difficulty: 4,
        skillTags: ["friction_work", "work_energy_theorem"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the initial kinetic energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the work done by friction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the final kinetic energy.",
            points: 1,
          },
          { letter: "d", promptMarkdown: "Find the final speed.", points: 2 },
        ],
        hints: [
          "Friction does negative work.",
          "Final kinetic energy equals initial kinetic energy plus friction work.",
          "Use $K_f=\\frac12mv^2$ at the end.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $96\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $-60\\text{ J}$." },
            { part: "c", points: 1, description: "Finds $36\\text{ J}$." },
            {
              part: "d",
              points: 2,
              description:
                "Finds $v=\\sqrt{24}\\text{ m s}^{-1}$ or about $4.9\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Adding friction work as positive work."],
        workedSolution: [
          { part: "a", explanation: "$K_i=\\frac12(3)(8^2)=96\\text{ J}$." },
          { part: "b", explanation: "$W_f=-12(5)=-60\\text{ J}$." },
          { part: "c", explanation: "$K_f=96-60=36\\text{ J}$." },
          {
            part: "d",
            explanation:
              "$36=\\frac12(3)v^2$, so $v^2=24$ and $v=\\sqrt{24}\\text{ m s}^{-1}\\approx4.9\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A $2\text{ kg}$ toy car moves up a rough track with initial speed $12\text{ m s}^{-1}$. It reaches a point $5\text{ m}$ higher. Work done by friction during the motion is $-30\text{ J}$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: [
          "case_based",
          "work_energy_theorem",
          "non_conservative_work",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the initial kinetic energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the gain in gravitational potential energy.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the final kinetic energy.",
            points: 2,
          },
          { letter: "d", promptMarkdown: "Find the final speed.", points: 1 },
        ],
        hints: [
          "Initial kinetic energy is $\\frac12mu^2$.",
          "Use $K_i+W_f=K_f+mgh$.",
          "Friction work is already negative.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $144\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $100\\text{ J}$." },
            { part: "c", points: 2, description: "Finds $14\\text{ J}$." },
            {
              part: "d",
              points: 1,
              description: "Finds $\\sqrt{14}\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Subtracting the negative friction work incorrectly."],
        workedSolution: [
          { part: "a", explanation: "$K_i=\\frac12(2)(12^2)=144\\text{ J}$." },
          { part: "b", explanation: "$\\Delta U=mgh=2(10)(5)=100\\text{ J}$." },
          {
            part: "c",
            explanation:
              "$K_i+W_f=K_f+\\Delta U$, so $144-30=K_f+100$ and $K_f=14\\text{ J}$.",
          },
          {
            part: "d",
            explanation:
              "$14=\\frac12(2)v^2$, so $v=\\sqrt{14}\\text{ m s}^{-1}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Power and Energy Transfer",
    subtopic:
      "Average power, instantaneous power, engine power, lifting power, and efficiency in energy transfer.",
    mc: [
      {
        questionLatex: L`A machine lifts a $20\text{ kg}$ load through $3\text{ m}$ in $6\text{ s}$. Taking $g=10\text{ m s}^{-2}$, its useful power output is`,
        difficulty: 2,
        skillTags: ["power", "lifting_work"],
        choices: [
          "$60\\text{ W}$",
          "$600\\text{ W}$",
          "$100\\text{ W}$",
          "$20\\text{ W}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This omits the gravitational force factor.",
          B: "This is the work done, not power.",
          D: "This uses mass divided by time.",
        },
        hints: [
          "First find useful work against gravity.",
          "$W=mgh$.",
          "Power is work divided by time.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute work and divide by time.",
            math: "P=\\frac{mgh}{t}=\\frac{20(10)(3)}{6}=100\\text{ W}",
          },
        ],
      },
      {
        questionLatex: L`An engine exerts a forward force of $5000\text{ N}$ on a vehicle moving at $20\text{ m s}^{-1}$. The instantaneous power is`,
        difficulty: 2,
        skillTags: ["instantaneous_power", "force_velocity"],
        choices: [
          "$25\\text{ kW}$",
          "$250\\text{ W}$",
          "$10\\text{ kW}$",
          "$100\\text{ kW}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This divides force by speed.",
          B: "This is dimensionally not force times velocity in SI units.",
          C: "This misses a factor of $10$.",
        },
        hints: [
          "For force along velocity, $P=Fv$.",
          "Multiply $5000$ by $20$.",
          "Convert watts to kilowatts.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Use instantaneous power for force parallel to velocity.",
            math: "P=Fv=5000(20)=100000\\text{ W}=100\\text{ kW}",
          },
        ],
      },
      {
        questionLatex: L`A water pump lifts $600\text{ kg}$ of water every minute through a height of $10\text{ m}$. Taking $g=10\text{ m s}^{-2}$, the useful power is`,
        difficulty: 3,
        skillTags: ["power", "mass_flow_rate"],
        choices: [
          "$1000\\text{ W}$",
          "$60000\\text{ W}$",
          "$100\\text{ W}$",
          "$600\\text{ W}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the work done per minute, not per second.",
          C: "This divides by an extra factor of $10$.",
          D: "This omits height or gravity.",
        },
        hints: [
          "Find work done in one minute.",
          "Then divide by $60\\text{ s}$.",
          "$600(10)(10)/60$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate rate of doing work.",
            math: "P=\\frac{600(10)(10)}{60}=1000\\text{ W}",
          },
        ],
      },
      {
        questionLatex: L`Two motors do the same amount of work. Motor A takes half the time taken by motor B. The power of motor A is`,
        difficulty: 2,
        skillTags: ["power_ratio"],
        choices: [
          "half the power of motor B",
          "twice the power of motor B",
          "equal to the power of motor B",
          "four times the power of motor B",
        ],
        correctLetter: "B",
        rationales: {
          A: "Power is inversely proportional to time for the same work.",
          C: "Same work does not imply same power unless time is also the same.",
          D: "Halving time doubles power, not quadruples it.",
        },
        hints: [
          "Use $P=W/t$.",
          "The work is the same.",
          "Reducing time increases power.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For the same work, $P\\propto1/t$, so half the time gives double the power.",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A machine of higher power can do the same work in less time. Reason (R): Power is the rate of doing work.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "power"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is false, but R is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The rate definition directly explains why less time means higher power for the same work.",
          B: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Recall the definition of power.",
          "$P=W/t$.",
          "For fixed $W$, larger $P$ means smaller $t$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Power is work per unit time; hence a higher-power machine can complete the same work faster.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A device does $200\text{ J}$ of work in $5\text{ s}$. Find its average power.`,
        difficulty: 1,
        skillTags: ["average_power"],
        parts: singlePart("a", "Find the average power.", 1),
        hints: [
          "Use $P=W/t$.",
          "Divide $200$ by $5$.",
          "Power is measured in watts.",
        ],
        rubric: singleRubric("a", 1, "Finds $40\\text{ W}$."),
        commonErrors: ["Multiplying work and time instead of dividing."],
        workedSolution: [
          { part: "a", explanation: "$P=W/t=200/5=40\\text{ W}$." },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $15\text{ N}$ force acts in the direction of motion of a body moving at $4\text{ m s}^{-1}$. Find the instantaneous power.`,
        difficulty: 2,
        skillTags: ["instantaneous_power"],
        parts: singlePart("a", "Find the instantaneous power.", 1),
        hints: [
          "Use $P=Fv$ for force along velocity.",
          "Multiply $15$ and $4$.",
          "The SI unit is watt.",
        ],
        rubric: singleRubric("a", 1, "Finds $60\\text{ W}$."),
        commonErrors: ["Using $F/v$ instead of $Fv$."],
        workedSolution: [
          { part: "a", explanation: "$P=Fv=15(4)=60\\text{ W}$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $2\text{ kW}$ motor runs for $3\text{ min}$ and lifts water through a height of $12\text{ m}$. Take $g=10\text{ m s}^{-2}$ and assume no losses.`,
        difficulty: 3,
        skillTags: ["power", "lifting_work"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the work done by the motor.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the mass of water lifted.",
            points: 1,
          },
        ],
        hints: [
          "Convert minutes to seconds.",
          "Work equals power times time.",
          "Set motor work equal to $mgh$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $3.6\\times10^5\\text{ J}$.",
            },
            { part: "b", points: 1, description: "Finds $3000\\text{ kg}$." },
          ],
        },
        commonErrors: ["Using $3\\text{ min}$ as $3\\text{ s}$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$W=Pt=2000(180)=3.6\\times10^5\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "$m=W/(gh)=3.6\\times10^5/(10\\times12)=3000\\text{ kg}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $1000\text{ kg}$ car starts from rest and reaches $20\text{ m s}^{-1}$ in $10\text{ s}$ on a level road. Neglect resistive forces.`,
        difficulty: 4,
        skillTags: ["average_power", "kinetic_energy", "net_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the increase in kinetic energy.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the average power delivered.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the average acceleration.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the average net force.",
            points: 1,
          },
        ],
        hints: [
          "Neglecting losses means engine work becomes kinetic energy.",
          "Average power is energy change divided by time.",
          "Use $F=ma$ for the average net force.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2.0\\times10^5\\text{ J}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $2.0\\times10^4\\text{ W}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $2\\text{ m s}^{-2}$.",
            },
            { part: "d", points: 1, description: "Finds $2000\\text{ N}$." },
          ],
        },
        commonErrors: [
          "Using final power $Fv$ without first finding force or energy change.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\Delta K=\\frac12(1000)(20^2)=2.0\\times10^5\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "$P_{\\text{avg}}=\\Delta K/t=2.0\\times10^5/10=2.0\\times10^4\\text{ W}$.",
          },
          { part: "c", explanation: "$a=(20-0)/10=2\\text{ m s}^{-2}$." },
          { part: "d", explanation: "$F=ma=1000(2)=2000\\text{ N}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A crane lifts a $500\text{ kg}$ load through $8\text{ m}$ in $20\text{ s}$. Its efficiency is $80\%$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["case_based", "power", "efficiency"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the useful work done on the load.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the useful output power.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Find the input power.", points: 2 },
          {
            letter: "d",
            promptMarkdown: "Find the energy lost during the lift.",
            points: 1,
          },
        ],
        hints: [
          "Useful work is the gain in gravitational potential energy.",
          "Efficiency equals useful output divided by input.",
          "Energy lost is input energy minus useful energy.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $40000\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $2000\\text{ W}$." },
            { part: "c", points: 2, description: "Finds $2500\\text{ W}$." },
            { part: "d", points: 1, description: "Finds $10000\\text{ J}$." },
          ],
        },
        commonErrors: [
          "Multiplying by $80\\%$ when input energy should be larger than useful energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$W_{\\text{useful}}=mgh=500(10)(8)=40000\\text{ J}$.",
          },
          {
            part: "b",
            explanation: "$P_{\\text{out}}=40000/20=2000\\text{ W}$.",
          },
          {
            part: "c",
            explanation:
              "$0.80=P_{\\text{out}}/P_{\\text{in}}$, so $P_{\\text{in}}=2000/0.80=2500\\text{ W}$.",
          },
          {
            part: "d",
            explanation:
              "Input energy $=P_{\\text{in}}t=2500(20)=50000\\text{ J}$, so energy lost $=50000-40000=10000\\text{ J}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Potential Energy, Springs and Conservation",
    subtopic:
      "Gravitational potential energy, spring potential energy, conservative and non-conservative forces, and conservation of mechanical energy.",
    mc: [
      {
        questionLatex: L`The gravitational potential energy gained by a $3\text{ kg}$ mass raised through $4\text{ m}$ is, taking $g=10\text{ m s}^{-2}$,`,
        difficulty: 1,
        skillTags: ["gravitational_potential_energy"],
        choices: [
          "$12\\text{ J}$",
          "$30\\text{ J}$",
          "$40\\text{ J}$",
          "$120\\text{ J}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This misses the factor $g$.",
          B: "This uses $mg$ but omits height.",
          C: "This uses height and $g$ but omits mass.",
        },
        hints: [
          "Use $U=mgh$.",
          "Substitute $m=3$, $g=10$, $h=4$.",
          "Multiply the three values.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute gravitational potential energy.",
            math: "U=mgh=3(10)(4)=120\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`The elastic potential energy stored in the spring represented by the graph is`,
        figure: springGraphFigure,
        difficulty: 3,
        skillTags: ["spring_potential_energy", "force_extension_graph"],
        choices: [
          "$8\\text{ J}$",
          "$16\\text{ J}$",
          "$40\\text{ J}$",
          "$4\\text{ J}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This treats the area as a rectangle instead of a triangle.",
          C: "This reads only the maximum force.",
          D: "This halves the triangular area again.",
        },
        hints: [
          "Energy stored equals area under the force-extension graph.",
          "The area is triangular.",
          "$\\frac12(0.40)(40)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the triangular area under the graph.",
            math: "U=\\frac12(0.40)(40)=8\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`For a conservative force, the work done between two points`,
        difficulty: 2,
        skillTags: ["conservative_force"],
        choices: [
          "always depends on the path length",
          "depends only on the initial and final positions",
          "is always zero",
          "is always positive",
        ],
        correctLetter: "B",
        rationales: {
          A: "Path dependence is a feature of non-conservative forces such as friction.",
          C: "Conservative-force work over a closed path is zero, not necessarily between two different points.",
          D: "The sign can be positive or negative depending on direction.",
        },
        hints: [
          "Think about gravity or spring force.",
          "A conservative force has a potential energy function.",
          "Closed-path work is zero.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Work by a conservative force is path independent and depends only on the end points.",
          },
        ],
      },
      {
        questionLatex: L`A spring of force constant $200\text{ N m}^{-1}$ is compressed by $0.10\text{ m}$. The energy stored is`,
        difficulty: 3,
        skillTags: ["spring_energy"],
        choices: [
          "$2\\text{ J}$",
          "$10\\text{ J}$",
          "$1\\text{ J}$",
          "$20\\text{ J}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This omits the factor $1/2$.",
          B: "This uses $kx/2$ instead of $kx^2/2$.",
          D: "This uses $kx$ and ignores both square and half factor.",
        },
        hints: [
          "Spring energy is $\\frac12kx^2$.",
          "The compression must be squared.",
          "$0.10^2=0.01$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate spring potential energy.",
            math: "U=\\frac12(200)(0.10)^2=1\\text{ J}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Friction is a non-conservative force. Reason (R): Work done by friction generally depends on the path length.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "non_conservative_force", "friction"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
          "Both A and R are true, and R is the correct explanation of A.",
        ],
        correctLetter: "D",
        rationales: {
          A: "Path dependence is exactly why friction is non-conservative.",
          B: "The reason is true.",
          C: "The assertion is also true.",
        },
        hints: [
          "Compare friction with gravity.",
          "Friction converts mechanical energy into thermal energy.",
          "A longer path generally means more work against friction.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Friction is non-conservative because its work depends on the path, not just the end points.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $0.5\text{ kg}$ object is raised vertically by $2\text{ m}$. Taking $g=10\text{ m s}^{-2}$, find the increase in gravitational potential energy.`,
        difficulty: 1,
        skillTags: ["gravitational_potential_energy"],
        parts: singlePart("a", "Find the increase in potential energy.", 1),
        hints: [
          "Use $mgh$.",
          "Mass is $0.5\\text{ kg}$.",
          "$0.5\\times10\\times2=10$.",
        ],
        rubric: singleRubric("a", 1, "Finds $10\\text{ J}$."),
        commonErrors: ["Using height alone as potential energy."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta U=mgh=0.5(10)(2)=10\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A spring of force constant $50\text{ N m}^{-1}$ is stretched by $0.20\text{ m}$. Find the energy stored.`,
        difficulty: 2,
        skillTags: ["spring_energy"],
        parts: singlePart("a", "Find the spring energy.", 1),
        hints: [
          "Use $U=\\frac12kx^2$.",
          "Square $0.20$.",
          "$\\frac12(50)(0.04)=1$.",
        ],
        rubric: singleRubric("a", 1, "Finds $1\\text{ J}$."),
        commonErrors: ["Using $kx$ instead of $\\frac12kx^2$."],
        workedSolution: [
          { part: "a", explanation: "$U=\\frac12(50)(0.20)^2=1\\text{ J}$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the spring force-extension graph shown.`,
        figure: springGraphFigure,
        difficulty: 4,
        skillTags: ["spring_constant", "spring_energy_graph"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the spring constant.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the energy stored at $0.40\\text{ m}$ extension.",
            points: 1,
          },
        ],
        hints: [
          "The slope of the graph gives $k$.",
          "Energy is area under the graph.",
          "The shaded area is a triangle.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $100\\text{ N m}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $8\\text{ J}$." },
          ],
        },
        commonErrors: ["Reading the maximum force as the spring constant."],
        workedSolution: [
          { part: "a", explanation: "$k=F/x=40/0.40=100\\text{ N m}^{-1}$." },
          { part: "b", explanation: "$U=\\frac12(0.40)(40)=8\\text{ J}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A small ball starts from rest at a height of $5\text{ m}$ on a smooth track. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        skillTags: ["mechanical_energy_conservation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find its speed at the bottom.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find its speed when it is at height $1.8\\text{ m}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State the assumption needed for using mechanical energy conservation.",
            points: 1,
          },
        ],
        hints: [
          "The track is smooth.",
          "Use loss of potential energy equals gain in kinetic energy.",
          "At height $1.8\\text{ m}$, the fall in height is $3.2\\text{ m}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $10\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $8\\text{ m s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "States that non-conservative losses such as friction are negligible.",
            },
          ],
        },
        commonErrors: [
          "Using total height instead of loss of height for part (b).",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$mgh=\\frac12mv^2$, so $v=\\sqrt{2(10)(5)}=10\\text{ m s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "The loss in height is $5-1.8=3.2\\text{ m}$, so $v=\\sqrt{2(10)(3.2)}=8\\text{ m s}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "Mechanical energy conservation requires negligible non-conservative work, such as friction or air resistance.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A $1\text{ kg}$ block is pressed against a horizontal spring of force constant $400\text{ N m}^{-1}$, compressing it by $0.20\text{ m}$. When released, the block crosses a rough horizontal strip of length $1.0\text{ m}$ where friction is $4\text{ N}$, and then climbs a smooth ramp. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 5,
        skillTags: [
          "case_based",
          "spring_energy",
          "friction_work",
          "energy_conservation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the initial elastic potential energy stored in the spring.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the speed of the block just after the spring returns to its natural length.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the work done by friction on the rough strip.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the kinetic energy of the block at the foot of the ramp.",
            points: 1,
          },
          {
            letter: "e",
            promptMarkdown:
              "Find the maximum vertical height reached on the smooth ramp.",
            points: 1,
          },
        ],
        hints: [
          "Start with elastic potential energy $\\frac12kx^2$.",
          "Friction removes energy before the ramp.",
          "At the highest point on the smooth ramp, the remaining kinetic energy has become gravitational potential energy.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $8\\text{ J}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $4\\text{ m s}^{-1}$.",
            },
            { part: "c", points: 1, description: "Finds $-4\\text{ J}$." },
            { part: "d", points: 1, description: "Finds $4\\text{ J}$." },
            { part: "e", points: 1, description: "Finds $0.40\\text{ m}$." },
          ],
        },
        commonErrors: [
          "Treating spring energy, friction work, and gravitational potential energy as separate unrelated formulas instead of one energy account.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Initial spring energy $=\\frac12kx^2=\\frac12(400)(0.20)^2=8\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "Just after leaving the spring, $\\frac12mv^2=8$, so $v^2=16$ and $v=4\\text{ m s}^{-1}$.",
          },
          {
            part: "c",
            explanation: "Friction work $W_f=-fd=-4(1.0)=-4\\text{ J}$.",
          },
          {
            part: "d",
            explanation:
              "Kinetic energy at the foot of the ramp is $8-4=4\\text{ J}$.",
          },
          {
            part: "e",
            explanation:
              "On the smooth ramp, $mgh=4$, so $h=4/(1\\times10)=0.40\\text{ m}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Vertical Circular Motion and Collisions",
    subtopic:
      "Energy and force conditions in vertical circular motion; elastic and inelastic collisions in one and two dimensions.",
    mc: [
      {
        questionLatex: L`For a body tied to a string and moving in a vertical circle of radius $2\text{ m}$, the minimum speed at the top for the string just to remain taut is, taking $g=10\text{ m s}^{-2}$,`,
        difficulty: 3,
        skillTags: ["vertical_circle", "minimum_top_speed"],
        choices: [
          "$\\sqrt{20}\\text{ m s}^{-1}$",
          "$10\\text{ m s}^{-1}$",
          "$20\\text{ m s}^{-1}$",
          "$\\sqrt{40}\\text{ m s}^{-1}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the minimum bottom speed for this radius, not the top speed.",
          C: "This treats $gr$ as a speed instead of speed squared.",
          D: "This includes an extra factor of $2$.",
        },
        hints: [
          "At the top in the limiting case, tension is zero.",
          "Then weight alone provides centripetal force.",
          "$mg=mv^2/r$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the top-point limiting condition.",
            math: "v_{\\text{top,min}}=\\sqrt{gr}=\\sqrt{20}\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`For a body tied to a string and moving in a vertical circle of radius $2\text{ m}$, the minimum speed at the bottom for completing the circle is`,
        difficulty: 3,
        skillTags: ["vertical_circle", "minimum_bottom_speed"],
        choices: [
          "$\\sqrt{20}\\text{ m s}^{-1}$",
          "$10\\text{ m s}^{-1}$",
          "$5\\text{ m s}^{-1}$",
          "$20\\text{ m s}^{-1}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This is the limiting top speed, not the required bottom speed.",
          C: "This uses $\\sqrt{gr/2}$, which has no role here.",
          D: "This doubles the correct speed.",
        },
        hints: [
          "Use energy between bottom and top.",
          "The height difference is $2r$.",
          "For a string, $v_{\\text{bottom,min}}=\\sqrt{5gr}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The top speed must satisfy $v_t^2=gr$, and energy from bottom to top gives $v_b^2=v_t^2+4gr=5gr$.",
            math: "v_b=\\sqrt{5(10)(2)}=10\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`In a one-dimensional elastic collision between two equal masses, one mass moving at $4\text{ m s}^{-1}$ strikes the other initially at rest. After collision, the first mass`,
        difficulty: 2,
        skillTags: ["elastic_collision", "equal_masses"],
        choices: [
          "continues at $4\\text{ m s}^{-1}$",
          "moves backward at $4\\text{ m s}^{-1}$",
          "comes to rest",
          "moves at $2\\text{ m s}^{-1}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "If it continued unchanged, momentum and kinetic energy would not both match with the second body initially at rest.",
          B: "Equal masses in a head-on elastic collision exchange velocities, not reverse both speeds.",
          D: "This is not the equal-mass elastic result.",
        },
        hints: [
          "For equal masses in a head-on elastic collision, velocities are exchanged.",
          "The second mass was initially at rest.",
          "So the first takes the second mass's initial velocity.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a head-on elastic collision of equal masses, the moving mass transfers its velocity to the initially stationary mass.",
          },
        ],
      },
      {
        questionLatex: L`A $3\text{ kg}$ cart moving at $4\text{ m s}^{-1}$ collides with a stationary $1\text{ kg}$ cart and they stick together. Their common speed is`,
        difficulty: 2,
        skillTags: ["perfectly_inelastic_collision", "momentum_conservation"],
        choices: [
          "$4\\text{ m s}^{-1}$",
          "$1\\text{ m s}^{-1}$",
          "$12\\text{ m s}^{-1}$",
          "$3\\text{ m s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This ignores the extra mass after sticking.",
          B: "This divides by the moving mass instead of total mass.",
          C: "This is the initial momentum value, not speed.",
        },
        hints: [
          "Momentum is conserved during the short collision.",
          "The final mass is $4\\text{ kg}$.",
          "$3(4)=4v$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use conservation of momentum.",
            math: "3(4)+1(0)=4v\\Rightarrow v=3\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`A collision is perfectly inelastic when`,
        difficulty: 2,
        skillTags: ["perfectly_inelastic_collision", "conceptual"],
        choices: [
          "the bodies stick together after collision",
          "kinetic energy is conserved",
          "the bodies must move apart with unchanged speeds",
          "momentum is not conserved even when external force is negligible",
        ],
        correctLetter: "A",
        rationales: {
          B: "Kinetic energy is generally not conserved in a perfectly inelastic collision.",
          C: "Moving apart with unchanged speeds describes neither sticking nor maximum kinetic-energy loss.",
          D: "Momentum is still conserved for the system when external impulse is negligible.",
        },
        hints: [
          "Use the defining feature of a perfectly inelastic collision.",
          "The bodies have a common final velocity.",
          "Momentum may be conserved, but kinetic energy is not.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a perfectly inelastic collision, the colliding bodies stick together and move with a common final velocity.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`At the top of a vertical circle of radius $r$, a particle of mass $m$ has speed $\sqrt{2gr}$. The tension in the string at that instant is`,
        difficulty: 3,
        skillTags: ["vertical_circle", "centripetal_force"],
        choices: [L`$mg$`, L`$0$`, L`$2mg$`, L`$3mg$`],
        correctLetter: "A",
        rationales: {
          B: L`Zero tension occurs at the limiting top speed $\sqrt{gr}$, not at $\sqrt{2gr}$.`,
          C: L`This gives the required centripetal force, but weight already supplies $mg$ of it.`,
          D: L`This adds weight instead of subtracting it from $mv^2/r$.`,
        },
        hints: [
          L`At the top, both weight and tension act toward the centre.`,
          L`Use $T+mg=mv^2/r$.`,
          L`Here $mv^2/r=2mg$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the radial equation at the top.",
            math: L`T+mg=\frac{mv^2}{r}`,
          },
          {
            step: 2,
            explanation: "Substitute the speed.",
            math: L`T+mg=\frac{m(2gr)}{r}=2mg\Rightarrow T=mg`,
          },
        ],
      },
      {
        questionLatex: L`A bead just completes a smooth vertical circular track of radius $r$. Its speed at a point level with the centre is`,
        difficulty: 4,
        skillTags: ["vertical_circle", "energy_conservation"],
        choices: [
          L`$\sqrt{3gr}$`,
          L`$\sqrt{gr}$`,
          L`$\sqrt{2gr}$`,
          L`$\sqrt{5gr}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`$\sqrt{gr}$ is the limiting speed at the top, not at the side.`,
          C: L`This loses one $gr$ term in the energy balance.`,
          D: L`$\sqrt{5gr}$ is the minimum bottom speed.`,
        },
        hints: [
          L`For just completing the loop, $v_{\text{top}}^2=gr$.`,
          L`The side point is lower than the top by height $r$.`,
          L`Use energy between the top and the side.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use energy from top to side.",
            math: L`\frac12mv_s^2=\frac12m(gr)+mgr`,
          },
          {
            step: 2,
            explanation: "Solve for side speed.",
            math: L`v_s^2=3gr\Rightarrow v_s=\sqrt{3gr}`,
          },
        ],
      },
      {
        questionLatex: L`Two equal masses move with speeds $3\text{ m s}^{-1}$ east and $4\text{ m s}^{-1}$ north. They collide and stick together. The speed of the combined body is`,
        difficulty: 4,
        skillTags: ["inelastic_collision", "vector_momentum"],
        choices: [
          L`$2.5\text{ m s}^{-1}$`,
          L`$3.5\text{ m s}^{-1}$`,
          L`$5.0\text{ m s}^{-1}$`,
          L`$7.0\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This averages the speeds without using vector momentum.`,
          C: L`This is the magnitude of total momentum divided by one mass, not by $2m$.`,
          D: L`This adds speeds directly, which ignores perpendicular directions and total mass.`,
        },
        hints: [
          L`Momentum is a vector.`,
          L`The total momentum magnitude is $m\sqrt{3^2+4^2}$.`,
          L`The combined mass is $2m$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the resultant momentum.",
            math: L`p=m\sqrt{3^2+4^2}=5m`,
          },
          {
            step: 2,
            explanation: "Divide by the combined mass.",
            math: L`v=\frac{5m}{2m}=2.5\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A mass $m$ moving with speed $u$ collides elastically in one dimension with a stationary mass $2m$. The speed of the $2m$ mass after collision is`,
        difficulty: 4,
        skillTags: ["elastic_collision", "momentum_energy"],
        choices: [
          L`$\frac{2u}{3}$`,
          L`$\frac{u}{3}$`,
          L`$u$`,
          L`$\frac{4u}{3}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is the magnitude of the lighter mass's rebound speed.`,
          C: L`The target is heavier, so it does not leave with the full initial speed.`,
          D: L`This would violate the energy balance.`,
        },
        hints: [
          L`Use the standard 1-D elastic collision result for a target initially at rest.`,
          L`$v_2=\frac{2m_1}{m_1+m_2}u$.`,
          L`Here $m_1=m$ and $m_2=2m$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For the initially stationary target,",
            math: L`v_2=\frac{2m_1}{m_1+m_2}u`,
          },
          {
            step: 2,
            explanation: "Substitute masses.",
            math: L`v_2=\frac{2m}{3m}u=\frac{2u}{3}`,
          },
        ],
      },
      {
        questionLatex: L`A bullet of mass $m$ and speed $u$ embeds in a wooden block of mass $3m$ resting on a smooth table. The combined block-bullet system then rises vertically like a pendulum. The maximum rise is`,
        difficulty: 5,
        skillTags: [
          "inelastic_collision",
          "energy_conservation",
          "ballistic_pendulum",
        ],
        choices: [
          L`$\frac{u^2}{32g}$`,
          L`$\frac{u^2}{8g}$`,
          L`$\frac{u^2}{16g}$`,
          L`$\frac{u^2}{2g}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This treats the common speed as $u/2$ instead of $u/4$.`,
          C: L`This misses the factor $2$ in $v^2=2gh$.`,
          D: L`This incorrectly assumes the bullet's initial kinetic energy is conserved through impact.`,
        },
        hints: [
          L`The collision is perfectly inelastic, so use momentum first.`,
          L`Common speed just after impact is $u/4$.`,
          L`After impact, mechanical energy converts to gravitational potential energy.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Conserve momentum during impact.",
            math: L`mu=(4m)V\Rightarrow V=\frac{u}{4}`,
          },
          {
            step: 2,
            explanation: "After impact, use energy.",
            math: L`\frac12(4m)V^2=(4m)gh`,
          },
          {
            step: 3,
            explanation: "Substitute $V=u/4$.",
            math: L`h=\frac{V^2}{2g}=\frac{u^2}{32g}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A stone tied to a string moves in a vertical circle of radius $1.6\text{ m}$. Find the minimum speed at the top for the string just to remain taut. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        skillTags: ["vertical_circle", "minimum_top_speed"],
        parts: singlePart("a", "Find the minimum top speed.", 1),
        hints: [
          "At the limiting top position, tension is zero.",
          "Use $mg=mv^2/r$.",
          "$v=\\sqrt{gr}$.",
        ],
        rubric: singleRubric("a", 1, "Finds $4\\text{ m s}^{-1}$."),
        commonErrors: ["Using $\\sqrt{5gr}$, which is the bottom condition."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v_{\\text{top,min}}=\\sqrt{gr}=\\sqrt{10(1.6)}=4\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A $2\text{ kg}$ cart moving at $3\text{ m s}^{-1}$ sticks to a stationary $1\text{ kg}$ cart. Find their common speed.`,
        difficulty: 2,
        skillTags: ["inelastic_collision", "momentum_conservation"],
        parts: singlePart("a", "Find the common speed.", 1),
        hints: [
          "Use momentum conservation.",
          "The final mass is $3\\text{ kg}$.",
          "$2(3)=3v$.",
        ],
        rubric: singleRubric("a", 1, "Finds $2\\text{ m s}^{-1}$."),
        commonErrors: [
          "Using conservation of kinetic energy for a sticking collision.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$2(3)+1(0)=3v$, so $v=2\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $0.5\text{ kg}$ body tied to a string moves in a vertical circle of radius $2\text{ m}$. Its speed at the bottom is $12\text{ m s}^{-1}$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["vertical_circle", "energy_conservation", "tension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find its speed at the top.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the string tension at the top.",
            points: 2,
          },
        ],
        hints: [
          "Use energy conservation from bottom to top.",
          "The rise in height is $2r$.",
          "At the top, $T+mg=mv^2/r$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $8\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 2, description: "Finds $11\\text{ N}$." },
          ],
        },
        commonErrors: ["Using the bottom-force equation at the top."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$v_b^2=v_t^2+4gr$, so $v_t^2=12^2-4(10)(2)=64$ and $v_t=8\\text{ m s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "At the top, $T+mg=mv_t^2/r$. Thus $T=0.5(64)/2-0.5(10)=16-5=11\\text{ N}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the cart collision diagram in which the carts stick together after collision.`,
        figure: collisionTrackFigure,
        difficulty: 4,
        skillTags: ["perfectly_inelastic_collision", "kinetic_energy_loss"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the common speed after collision.",
            points: 1,
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
          "The carts stick together.",
          "Compute kinetic energy before and after separately.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $18\\text{ J}$." },
            { part: "c", points: 1, description: "Finds $6\\text{ J}$." },
            { part: "d", points: 1, description: "Finds $12\\text{ J}$ lost." },
          ],
        },
        commonErrors: [
          "Assuming kinetic energy is conserved in a sticking collision.",
        ],
        workedSolution: [
          { part: "a", explanation: "$1(6)=3v$, so $v=2\\text{ m s}^{-1}$." },
          { part: "b", explanation: "$K_i=\\frac12(1)(6^2)=18\\text{ J}$." },
          { part: "c", explanation: "$K_f=\\frac12(3)(2^2)=6\\text{ J}$." },
          {
            part: "d",
            explanation: "Kinetic energy lost $=18-6=12\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two carts collide at right angles on a smooth floor and stick together. Cart A of mass $2\text{ kg}$ moves east at $3\text{ m s}^{-1}$; cart B of mass $1\text{ kg}$ moves north at $6\text{ m s}^{-1}$.`,
        difficulty: 5,
        skillTags: [
          "case_based",
          "two_dimensional_collision",
          "momentum_conservation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the total eastward momentum before collision.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the total northward momentum before collision.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the east and north components of the common final velocity.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "Find the magnitude of the common final velocity.",
            points: 1,
          },
        ],
        hints: [
          "Momentum is conserved separately in perpendicular directions.",
          "The combined mass after collision is $3\\text{ kg}$.",
          "Divide each momentum component by the combined mass.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $6\\text{ kg m s}^{-1}$ east.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $6\\text{ kg m s}^{-1}$ north.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Finds velocity components $2\\text{ m s}^{-1}$ east and $2\\text{ m s}^{-1}$ north.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds $2\\sqrt2\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Adding speeds directly instead of conserving vector momentum.",
        ],
        workedSolution: [
          { part: "a", explanation: "$p_x=2(3)=6\\text{ kg m s}^{-1}$ east." },
          { part: "b", explanation: "$p_y=1(6)=6\\text{ kg m s}^{-1}$ north." },
          {
            part: "c",
            explanation:
              "The final mass is $3\\text{ kg}$, so $v_x=6/3=2\\text{ m s}^{-1}$ and $v_y=6/3=2\\text{ m s}^{-1}$.",
          },
          {
            part: "d",
            explanation: "$v=\\sqrt{2^2+2^2}=2\\sqrt2\\text{ m s}^{-1}$.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $0.20\text{ kg}$ stone is tied to a string and moves at the lowest point of a vertical circle of radius $0.50\text{ m}$ with speed $5.0\text{ m s}^{-1}$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        skillTags: ["vertical_circle", "tension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the string tension at the lowest point.`,
            points: 1,
          },
        ],
        hints: [
          L`At the lowest point, $T-mg=mv^2/r$.`,
          L`The centre is upward.`,
          L`Add weight to the centripetal term.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: L`Finds $12\text{ N}$.` },
          ],
        },
        commonErrors: [
          L`Using $T+mg=mv^2/r$, which is the top-point equation.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$T-mg=mv^2/r=0.20(25)/0.50=10\text{ N}$, so $T=10+2=12\text{ N}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $2\text{ kg}$ block moving at $6\text{ m s}^{-1}$ collides head-on and sticks to a $4\text{ kg}$ block initially at rest on a smooth horizontal surface.`,
        difficulty: 3,
        skillTags: ["inelastic_collision", "energy_loss"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the common speed just after collision.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the kinetic energy lost in the collision.`,
            points: 2,
          },
        ],
        hints: [
          L`Use momentum conservation for the collision.`,
          L`Initial kinetic energy belongs only to the $2\text{ kg}$ block.`,
          L`Energy is not conserved during a perfectly inelastic collision.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $2\text{ m s}^{-1}$.`,
            },
            {
              part: "b",
              points: 2,
              description: L`Finds kinetic energy loss $24\text{ J}$.`,
            },
          ],
        },
        commonErrors: [
          L`Equating initial and final kinetic energies in an inelastic collision.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$2(6)=(2+4)V$, so $V=2\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$K_i=\frac12(2)(6^2)=36\text{ J}$ and $K_f=\frac12(6)(2^2)=12\text{ J}$. Loss $=24\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A small body is released from rest at a height $3R$ above the bottom of a smooth vertical circular track of radius $R$.`,
        difficulty: 4,
        skillTags: [
          "vertical_circle",
          "energy_conservation",
          "contact_condition",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find its speed at the top of the track.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`State whether it can maintain contact at the top.`,
            points: 1,
          },
        ],
        hints: [
          L`The top of the loop is at height $2R$ above the bottom.`,
          L`Use energy between release point and top.`,
          L`Contact at the top requires $v^2\ge gR$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $v=\sqrt{2gR}$.` },
            {
              part: "b",
              points: 1,
              description: L`Concludes contact is maintained because $2gR>gR$.`,
            },
          ],
        },
        commonErrors: [
          L`Comparing the release height directly with $R$ instead of using speed at the top.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Loss of potential energy from $3R$ to $2R$ is $mgR$, so $\frac12mv^2=mgR$ and $v=\sqrt{2gR}$.`,
          },
          {
            part: "b",
            explanation: L`At the top, contact requires $v^2\ge gR$. Here $v^2=2gR$, so contact is maintained.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $1\text{ kg}$ cart moving at $8\text{ m s}^{-1}$ collides and sticks to a $3\text{ kg}$ cart at rest. The combined carts then move up a smooth incline. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 5,
        skillTags: [
          "inelastic_collision",
          "energy_conservation",
          "two_stage_problem",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the speed just after collision.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the maximum vertical height reached on the incline.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Find the kinetic energy lost during collision.`,
            points: 2,
          },
        ],
        hints: [
          L`Momentum is conserved only during the short collision.`,
          L`After collision, use mechanical energy on the smooth incline.`,
          L`Compare kinetic energy before and after impact.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $2\text{ m s}^{-1}$.`,
            },
            { part: "b", points: 1, description: L`Finds $0.20\text{ m}$.` },
            {
              part: "c",
              points: 2,
              description: L`Finds kinetic energy lost $24\text{ J}$.`,
            },
          ],
        },
        commonErrors: [
          L`Using energy conservation through the collision itself.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$1(8)=(1+3)V$, so $V=2\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$\frac12(4)(2^2)=4(10)h$, giving $h=0.20\text{ m}$.`,
          },
          {
            part: "c",
            explanation: L`Before impact $K_i=\frac12(1)(8^2)=32\text{ J}$. Just after impact $K_f=\frac12(4)(2^2)=8\text{ J}$. Loss $=24\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A ball of mass $m$ is attached to a light string and moves in a vertical circle of radius $r$. At the lowest point its speed is $\sqrt{6gr}$.`,
        difficulty: 5,
        skillTags: ["vertical_circle", "energy_conservation", "tension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the speed at the top of the circle.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the tension at the top.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Find the tension at the bottom.`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Is the motion safely above the just-complete condition?`,
            points: 1,
          },
        ],
        hints: [
          L`The top is $2r$ higher than the bottom.`,
          L`At the top, $T+mg=mv^2/r$.`,
          L`At the bottom, $T-mg=mv_b^2/r$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds $v_t=\sqrt{2gr}$.` },
            { part: "b", points: 1, description: L`Finds top tension $mg$.` },
            {
              part: "c",
              points: 1,
              description: L`Finds bottom tension $7mg$.`,
            },
            {
              part: "d",
              points: 1,
              description: L`States yes, because top speed exceeds $\sqrt{gr}$.`,
            },
          ],
        },
        commonErrors: [L`Using the same speed at top and bottom.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`Energy gives $\frac12m(6gr)=\frac12mv_t^2+2mgr$, so $v_t^2=2gr$.`,
          },
          {
            part: "b",
            explanation: L`At the top, $T+mg=m(2gr)/r=2mg$, hence $T=mg$.`,
          },
          {
            part: "c",
            explanation: L`At the bottom, $T-mg=m(6gr)/r=6mg$, hence $T=7mg$.`,
          },
          {
            part: "d",
            explanation: L`The limiting top speed is $\sqrt{gr}$. Since $\sqrt{2gr}>\sqrt{gr}$, the motion is safely above the limiting condition.`,
          },
        ],
      },
    ],
  },
];

export const workEnergyPowerTopics: Topic[] = topicSeeds.map(makeTopic);
