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
const UNIT = "u2-kinematics";
const VERSION = "0.1.9";
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
  return `You chose ${choiceText}. Recheck the graph, vector, or kinematics condition before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_kinematics_reasoning"),
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
      "uses_formula_without_matching_motion_graph_or_vector_direction",
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
      "states_final_value_without_showing_graph_or_vector_reasoning",
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

const positionTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Position-time graph for a cart",
  description:
    "A position-time graph with points (0 s, 0 m), (2 s, 20 m), (5 s, 20 m), and (7 s, 0 m).",
  svg: `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <path d="M90 70H530 M90 120H530 M90 170H530 M90 220H530 M90 270H530"/>
    <path d="M90 270V70 M150 270V70 M210 270V70 M270 270V70 M330 270V70 M390 270V70 M450 270V70 M510 270V70"/>
  </g>
  <line x1="90" y1="270" x2="540" y2="270" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="270" x2="90" y2="55" stroke="#334155" stroke-width="2"/>
  <path d="M540 270 L528 264 M540 270 L528 276" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M90 55 L84 67 M90 55 L96 67" stroke="#334155" stroke-width="2" fill="none"/>
  <polyline points="90,270 210,70 390,70 510,270" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round"/>
  <g fill="#2563eb">
    <circle cx="90" cy="270" r="5"/>
    <circle cx="210" cy="70" r="5"/>
    <circle cx="390" cy="70" r="5"/>
    <circle cx="510" cy="270" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#334155">
    <text x="542" y="292">t (s)</text>
    <text x="42" y="54">x (m)</text>
    <text x="85" y="292">0</text><text x="205" y="292">2</text><text x="385" y="292">5</text><text x="505" y="292">7</text>
    <text x="56" y="75">20</text>
    <text x="152" y="98" fill="#1d4ed8">A</text>
    <text x="296" y="61" fill="#1d4ed8">B</text>
    <text x="452" y="96" fill="#1d4ed8">C</text>
  </g>
</svg>`,
};

const velocityTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Velocity-time graph for a toy car",
  description:
    "A velocity-time graph rises from 0 to 20 m/s in 4 s, remains constant until 8 s, and falls to 0 at 10 s.",
  svg: `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <path d="M90 70H530 M90 120H530 M90 170H530 M90 220H530 M90 270H530"/>
    <path d="M90 270V70 M170 270V70 M250 270V70 M330 270V70 M410 270V70 M490 270V70"/>
  </g>
  <line x1="90" y1="270" x2="540" y2="270" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="270" x2="90" y2="55" stroke="#334155" stroke-width="2"/>
  <path d="M540 270 L528 264 M540 270 L528 276" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M90 55 L84 67 M90 55 L96 67" stroke="#334155" stroke-width="2" fill="none"/>
  <polygon points="90,270 250,70 410,70 490,270" fill="#bfdbfe" opacity="0.45"/>
  <polyline points="90,270 250,70 410,70 490,270" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round"/>
  <g fill="#2563eb">
    <circle cx="90" cy="270" r="5"/>
    <circle cx="250" cy="70" r="5"/>
    <circle cx="410" cy="70" r="5"/>
    <circle cx="490" cy="270" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#334155">
    <text x="542" y="292">t (s)</text>
    <text x="40" y="54">v (m/s)</text>
    <text x="86" y="292">0</text><text x="245" y="292">4</text><text x="405" y="292">8</text><text x="482" y="292">10</text>
    <text x="58" y="75">20</text>
  </g>
</svg>`,
};

const accelerationGraphFigure: ItemFigure = {
  type: "svg",
  title: "Acceleration-time graph",
  description:
    "Acceleration is +2 m/s^2 from 0 to 3 s, zero from 3 to 5 s, and -1 m/s^2 from 5 to 9 s.",
  svg: `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="360" fill="#ffffff"/>
  <line x1="80" y1="180" x2="540" y2="180" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="300" x2="80" y2="60" stroke="#334155" stroke-width="2"/>
  <path d="M540 180 L528 174 M540 180 L528 186" stroke="#334155" stroke-width="2" fill="none"/>
  <path d="M80 60 L74 72 M80 60 L86 72" stroke="#334155" stroke-width="2" fill="none"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="80" y1="100" x2="520" y2="100"/>
    <line x1="80" y1="220" x2="520" y2="220"/>
    <line x1="230" y1="60" x2="230" y2="300"/>
    <line x1="330" y1="60" x2="330" y2="300"/>
    <line x1="530" y1="60" x2="530" y2="300"/>
  </g>
  <path d="M80 100H230 M230 180H330 M330 220H530" stroke="#2563eb" stroke-width="4" fill="none"/>
  <path d="M230 100V180 M330 180V220" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="14" fill="#334155">
    <text x="543" y="202">t (s)</text>
    <text x="28" y="58">a</text>
    <text x="54" y="104">+2</text>
    <text x="55" y="224">-1</text>
    <text x="74" y="202">0</text>
    <text x="224" y="202">3</text>
    <text x="324" y="202">5</text>
    <text x="522" y="202">9</text>
  </g>
</svg>`,
};

const vectorComponentsFigure: ItemFigure = {
  type: "svg",
  title: "Vector resolved into rectangular components",
  description:
    "A vector A makes angle theta with the positive x-axis and is resolved into Ax and Ay.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="90" y1="275" x2="495" y2="275" stroke="#334155" stroke-width="2" marker-end="url(#arrow-gray)"/>
  <line x1="90" y1="275" x2="90" y2="55" stroke="#334155" stroke-width="2" marker-end="url(#arrow-gray)"/>
  <line x1="90" y1="275" x2="390" y2="95" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-blue)"/>
  <line x1="90" y1="275" x2="390" y2="275" stroke="#16a34a" stroke-width="3" marker-end="url(#arrow-gray)"/>
  <line x1="390" y1="275" x2="390" y2="95" stroke="#dc2626" stroke-width="3" marker-end="url(#arrow-gray)"/>
  <path d="M135 275 A48 48 0 0 0 131 250" stroke="#f97316" stroke-width="4" fill="none"/>
  <line x1="390" y1="95" x2="390" y2="275" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="500" y="282">x</text>
    <text x="78" y="52">y</text>
    <text x="255" y="250" fill="#15803d">A cos &#952;</text>
    <text x="405" y="190" fill="#b91c1c">A sin &#952;</text>
    <text x="247" y="147" fill="#1d4ed8">A</text>
    <text x="143" y="255" fill="#ea580c">&#952;</text>
  </g>
</svg>`,
};

const vectorAdditionFigure: ItemFigure = {
  type: "svg",
  title: "Head-to-tail vector addition",
  description:
    "A 5 km east displacement followed by a 12 km north displacement gives a resultant from start to finish.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
    <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
    <marker id="arrow-blue2" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="110" y1="290" x2="235" y2="290" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-green)"/>
  <line x1="235" y1="290" x2="235" y2="50" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-red)"/>
  <line x1="110" y1="290" x2="235" y2="50" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-blue2)"/>
  <path d="M235 290H267 M235 290V258" stroke="#94a3b8" stroke-width="2"/>
  <g font-family="Arial, sans-serif" fill="#334155">
    <text x="135" y="318" font-size="16" fill="#15803d">5 km east</text>
    <text x="250" y="170" font-size="16" fill="#b91c1c">12 km north</text>
    <text x="110" y="166" font-size="16" fill="#1d4ed8">resultant</text>
    <text x="86" y="314" font-size="14">start</text>
    <text x="246" y="48" font-size="14">finish</text>
  </g>
</svg>`,
};

const projectilePathFigure: ItemFigure = {
  type: "svg",
  title: "Projectile path with launch components",
  description:
    "A projectile is launched at speed u and angle theta, showing horizontal and vertical components.",
  svg: `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="380" fill="#ffffff"/>
  <defs>
    <marker id="arrow-proj" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-comp" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="70" y1="305" x2="545" y2="305" stroke="#334155" stroke-width="2" marker-end="url(#arrow-comp)"/>
  <path d="M90 305 C185 160, 350 160, 500 305" stroke="#2563eb" stroke-width="4" fill="none"/>
  <line x1="90" y1="305" x2="210" y2="210" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-proj)"/>
  <line x1="90" y1="305" x2="210" y2="305" stroke="#16a34a" stroke-width="3" marker-end="url(#arrow-comp)"/>
  <line x1="210" y1="305" x2="210" y2="210" stroke="#dc2626" stroke-width="3" marker-end="url(#arrow-comp)"/>
  <path d="M130 305 A48 48 0 0 0 124 278" stroke="#f97316" stroke-width="4" fill="none"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="115" y="277" fill="#ea580c">&#952;</text>
    <text x="162" y="196" fill="#1d4ed8">u</text>
    <text x="125" y="327" fill="#15803d">u cos &#952;</text>
    <text x="222" y="260" fill="#b91c1c">u sin &#952;</text>
    <text x="548" y="328">x</text>
  </g>
</svg>`,
};

const riverVelocityFigure: ItemFigure = {
  type: "svg",
  title: "Boat velocity in a river",
  description:
    "A boat aims straight across a river while the river current carries it downstream.",
  svg: `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="380" fill="#ffffff"/>
  <rect x="90" y="55" width="420" height="260" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/>
  <defs>
    <marker id="arrow-river" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-boat" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
    <marker id="arrow-ground" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="170" y1="260" x2="170" y2="95" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-boat)"/>
  <line x1="170" y1="260" x2="285" y2="260" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-river)"/>
  <line x1="170" y1="260" x2="285" y2="95" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-ground)"/>
  <path d="M285 260V95 M170 95H285" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="180" y="162" fill="#b91c1c">boat wrt water</text>
    <text x="206" y="284" fill="#1d4ed8">current</text>
    <text x="295" y="178" fill="#15803d">boat wrt ground</text>
    <text x="408" y="90">far bank</text>
    <text x="405" y="303">near bank</text>
  </g>
</svg>`,
};

const upstreamBoatFigure: ItemFigure = {
  type: "svg",
  title: "Boat aimed upstream to cancel river drift",
  description:
    "A vector diagram shows river current downstream, boat velocity relative to water aimed upstream, and resultant ground velocity straight across the river.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <rect x="80" y="55" width="460" height="270" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/>
  <defs>
    <marker id="arrow-upstream-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-upstream-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
    <marker id="arrow-upstream-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
  </defs>
  <line x1="305" y1="275" x2="425" y2="275" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-upstream-blue)"/>
  <line x1="305" y1="275" x2="185" y2="115" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-upstream-red)"/>
  <line x1="305" y1="275" x2="305" y2="115" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-upstream-green)"/>
  <path d="M185 115H305 M185 115V275" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="200" y="118" fill="#b91c1c">boat wrt water</text>
    <text x="344" y="300" fill="#1d4ed8">current</text>
    <text x="318" y="188" fill="#15803d">boat wrt ground</text>
    <text x="432" y="88">far bank</text>
    <text x="428" y="310">near bank</text>
    <text x="130" y="256" fill="#b91c1c">upstream component</text>
  </g>
</svg>`,
};

const circularMotionFigure: ItemFigure = {
  type: "svg",
  title: "Velocity and acceleration in uniform circular motion",
  description:
    "A particle on a circular path has velocity tangent to the circle and acceleration directed toward the centre.",
  svg: `<svg viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="380" fill="#ffffff"/>
  <defs>
    <marker id="arrow-tan" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-centre" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
  <circle cx="280" cy="190" r="120" fill="none" stroke="#334155" stroke-width="3"/>
  <circle cx="280" cy="190" r="5" fill="#334155"/>
  <circle cx="380" cy="124" r="8" fill="#2563eb"/>
  <line x1="380" y1="124" x2="438" y2="212" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-tan)"/>
  <line x1="380" y1="124" x2="287" y2="185" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow-centre)"/>
  <line x1="280" y1="190" x2="380" y2="124" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#334155">
    <text x="264" y="214">O</text>
    <text x="392" y="114">P</text>
    <text x="438" y="226" fill="#1d4ed8">v</text>
    <text x="326" y="170" fill="#b91c1c">a_c</text>
    <text x="322" y="142" fill="#64748b">r</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Motion in a Straight Line and Graphs",
    subtopic:
      "Position, path length, displacement, average speed, average velocity, and interpretation of position-time graphs.",
    mc: [
      {
        questionLatex: L`The cart shown in the position-time graph is at rest during`,
        figure: positionTimeGraphFigure,
        difficulty: 2,
        skillTags: ["position_time_graph", "rest_interval"],
        choices: [
          "$2\\text{ s}$ to $5\\text{ s}$",
          "$0\\text{ s}$ to $2\\text{ s}$",
          "$5\\text{ s}$ to $7\\text{ s}$",
          "$0\\text{ s}$ to $7\\text{ s}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "A rising position-time graph means position is changing, so the cart is moving.",
          C: "A falling position-time graph still means position is changing, so the cart is moving.",
          D: "The cart is not at rest for the whole time; only the horizontal segment shows rest.",
        },
        hints: [
          "On a position-time graph, rest means position is constant.",
          "A constant position appears as a horizontal graph segment.",
          "Find the horizontal part of the graph.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The graph is horizontal from $2\\text{ s}$ to $5\\text{ s}$.",
            math: "\\Delta x=0\\Rightarrow v=0",
          },
        ],
      },
      {
        questionLatex: L`For the full motion shown in the position-time graph, the average velocity from $0\text{ s}$ to $7\text{ s}$ is`,
        figure: positionTimeGraphFigure,
        difficulty: 2,
        skillTags: ["average_velocity", "position_time_graph"],
        choices: [
          "$\\frac{40}{7}\\text{ m s}^{-1}$",
          "$0\\text{ m s}^{-1}$",
          "$10\\text{ m s}^{-1}$",
          "$-\\frac{20}{7}\\text{ m s}^{-1}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses total distance instead of displacement.",
          C: "This is the slope of only the first segment.",
          D: "The final and initial positions are both zero, so displacement is not negative.",
        },
        hints: [
          "Average velocity is displacement divided by total time.",
          "Use final position minus initial position.",
          "The graph starts and ends at $x=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find total displacement.",
            math: "\\Delta x=0-0=0",
          },
          {
            step: 2,
            explanation: "Divide by total time.",
            math: "v_{\\text{avg}}=\\frac{0}{7}=0\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`For the full motion shown in the position-time graph, the average speed is`,
        figure: positionTimeGraphFigure,
        difficulty: 3,
        skillTags: ["average_speed", "position_time_graph"],
        choices: [
          "$0\\text{ m s}^{-1}$",
          "$\\frac{20}{7}\\text{ m s}^{-1}$",
          "$\\frac{40}{7}\\text{ m s}^{-1}$",
          "$10\\text{ m s}^{-1}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This is average velocity, not average speed.",
          B: "This counts only one part of the journey.",
          D: "This is the speed during the first segment only.",
        },
        hints: [
          "Average speed uses total path length.",
          "The cart moves from $0$ to $20\\text{ m}$ and later back from $20\\text{ m}$ to $0$.",
          "Total distance is $40\\text{ m}$ in $7\\text{ s}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find total distance travelled.",
            math: "s=20+20=40\\text{ m}",
          },
          {
            step: 2,
            explanation: "Divide by total time.",
            math: "v_{\\text{speed,avg}}=\\frac{40}{7}\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`On a position-time graph, the slope at an instant represents`,
        difficulty: 1,
        skillTags: ["position_time_graph", "instantaneous_velocity"],
        choices: [
          "instantaneous acceleration",
          "total distance travelled",
          "average speed only",
          "instantaneous velocity",
        ],
        correctLetter: "D",
        rationales: {
          A: "Acceleration is related to the slope of a velocity-time graph, not directly a position-time graph.",
          B: "Distance is not read from a single tangent slope.",
          C: "Average speed needs total path length divided by total time.",
        },
        hints: [
          "Slope means change in vertical variable per change in horizontal variable.",
          "Here the vertical variable is position and the horizontal variable is time.",
          "$dx/dt$ is velocity.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Use the definition of velocity as rate of change of position.",
            math: "\\text{slope of }x-t\\text{ graph}=\\frac{dx}{dt}=v",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Average speed can be greater than the magnitude of average velocity. Reason (R): Average speed uses total path length, while average velocity uses displacement.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "speed_velocity_difference"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why speed and velocity averages can differ.",
          C: "The reason is true.",
          D: "The assertion is also true; path length can exceed displacement.",
        },
        hints: [
          "Compare distance travelled with displacement.",
          "Path length is never less than displacement magnitude.",
          "The definitions explain the assertion.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the two definitions.",
            math: "\\text{average speed}=\\frac{\\text{path length}}{\\Delta t},\\quad |\\vec v_{\\text{avg}}|=\\frac{|\\Delta \\vec r|}{\\Delta t}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A student walks $3\text{ m}$ east and then $4\text{ m}$ west in $7\text{ s}$. Find the average velocity, taking east as positive.`,
        difficulty: 2,
        skillTags: ["average_velocity", "displacement"],
        parts: singlePart("a", "Find the average velocity.", 1),
        hints: [
          "Average velocity uses displacement, not distance.",
          "East is positive, so west is negative.",
          "Displacement is $3-4=-1\\text{ m}$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Finds $-1/7\\text{ m s}^{-1}$ or $0.143\\text{ m s}^{-1}$ west.",
        ),
        commonErrors: [
          "Using total distance $7\\text{ m}$ instead of displacement.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Displacement $=3-4=-1\\text{ m}$. Hence average velocity $=-1/7\\text{ m s}^{-1}$, i.e. $0.143\\text{ m s}^{-1}$ west.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A cyclist covers $120\text{ m}$ in $20\text{ s}$ along a straight road without changing direction. Find the average speed.`,
        difficulty: 1,
        skillTags: ["average_speed"],
        parts: singlePart("a", "Calculate average speed.", 1),
        hints: [
          "Average speed is total distance divided by total time.",
          "Use $120\\text{ m}$ and $20\\text{ s}$.",
          "$120/20=6$.",
        ],
        rubric: singleRubric("a", 1, "Finds $6\\text{ m s}^{-1}$."),
        commonErrors: ["Confusing speed with acceleration."],
        workedSolution: [
          {
            part: "a",
            explanation: "Average speed $=120/20=6\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A particle moves along the $x$-axis. Its position changes from $x=-5\text{ m}$ at $t=0$ to $x=15\text{ m}$ at $t=4\text{ s}$.`,
        difficulty: 2,
        skillTags: ["displacement", "average_velocity"],
        parts: [
          { letter: "a", promptMarkdown: "Find the displacement.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the average velocity.",
            points: 1,
          },
        ],
        hints: [
          "Displacement is final position minus initial position.",
          "Average velocity is displacement divided by elapsed time.",
          "Use $15-(-5)$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds displacement $20\\text{ m}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds average velocity $5\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: ["Subtracting positions in the wrong order."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta x=15-(-5)=20\\text{ m}$.",
          },
          {
            part: "b",
            explanation:
              "$v_{\\text{avg}}=\\Delta x/\\Delta t=20/4=5\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the position-time graph shown for the cart.`,
        figure: positionTimeGraphFigure,
        difficulty: 4,
        skillTags: ["position_time_graph", "speed_velocity_difference"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the velocity during segment A.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the velocity during segment C.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the average speed for the whole trip.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "Find the average velocity for the whole trip.",
            points: 1,
          },
        ],
        hints: [
          "Velocity on each straight segment is the slope of the position-time graph.",
          "Average speed uses total distance.",
          "Average velocity uses net displacement.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $+10\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $-10\\text{ m s}^{-1}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds average speed $40/7\\text{ m s}^{-1}$.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds average velocity $0$.",
            },
          ],
        },
        commonErrors: ["Using distance in the average velocity calculation."],
        workedSolution: [
          {
            part: "a",
            explanation: "Segment A slope $=(20-0)/(2-0)=10\\text{ m s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "Segment C slope $=(0-20)/(7-5)=-10\\text{ m s}^{-1}$.",
          },
          {
            part: "c",
            explanation:
              "The cart travels $20\\text{ m}$ outward and $20\\text{ m}$ back, so distance $=40\\text{ m}$. Average speed $=40/7\\text{ m s}^{-1}$.",
          },
          {
            part: "d",
            explanation:
              "Initial and final positions are both $0\\text{ m}$, so displacement is zero and average velocity is $0$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A delivery robot moves along a straight corridor. Its trip is represented by the position-time graph.`,
        figure: positionTimeGraphFigure,
        difficulty: 4,
        skillTags: [
          "case_based",
          "graph_interpretation",
          "straight_line_motion",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "During which time interval is the robot waiting?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the distance travelled by the robot.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the magnitude of displacement after $7\\text{ s}$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why average speed and average velocity are different here.",
            points: 2,
          },
        ],
        hints: [
          "Waiting corresponds to constant position.",
          "Distance counts the path travelled in both directions.",
          "Displacement depends only on initial and final positions.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies $2\\text{ s}$ to $5\\text{ s}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds distance $40\\text{ m}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds displacement magnitude $0$.",
            },
            {
              part: "d",
              points: 2,
              description: "Explains path length versus displacement.",
            },
          ],
        },
        commonErrors: [
          "Calling the horizontal segment zero distance for the whole trip.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The robot waits from $2\\text{ s}$ to $5\\text{ s}$, where the graph is horizontal.",
          },
          {
            part: "b",
            explanation:
              "It travels $20\\text{ m}$ away and $20\\text{ m}$ back, so distance is $40\\text{ m}$.",
          },
          {
            part: "c",
            explanation:
              "Final position equals initial position, so displacement magnitude is $0$.",
          },
          {
            part: "d",
            explanation:
              "Average speed uses $40\\text{ m}$ path length, while average velocity uses zero displacement, so they differ.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Uniform Acceleration and Velocity-Time Graphs",
    subtopic:
      "Equations of uniformly accelerated motion, slope and area of velocity-time graphs, and piecewise acceleration graphs.",
    mc: [
      {
        questionLatex: L`In the velocity-time graph shown, the acceleration during the first $4\text{ s}$ is`,
        figure: velocityTimeGraphFigure,
        difficulty: 2,
        skillTags: ["velocity_time_graph", "acceleration"],
        choices: [
          "$20\\text{ m s}^{-2}$",
          "$5\\text{ m s}^{-2}$",
          "$2.5\\text{ m s}^{-2}$",
          "$0\\text{ m s}^{-2}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses the final velocity but does not divide by time.",
          C: "This uses the total time of $8\\text{ s}$ instead of the first $4\\text{ s}$.",
          D: "The velocity is changing during the first segment, so acceleration is not zero.",
        },
        hints: [
          "Acceleration is slope of a velocity-time graph.",
          "Use $\\Delta v/\\Delta t$ for the first segment.",
          "$(20-0)/(4-0)=5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the slope of the first segment.",
            math: "a=\\frac{20-0}{4-0}=5\\text{ m s}^{-2}",
          },
        ],
      },
      {
        questionLatex: L`The displacement from $0\text{ s}$ to $10\text{ s}$ in the velocity-time graph is`,
        figure: velocityTimeGraphFigure,
        difficulty: 3,
        skillTags: ["velocity_time_graph", "displacement_area"],
        choices: [
          "$80\\text{ m}$",
          "$200\\text{ m}$",
          "$140\\text{ m}$",
          "$100\\text{ m}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This omits one triangular part of the graph.",
          B: "This multiplies maximum velocity by total time and ignores the graph shape.",
          D: "This counts only the first triangle and rectangle incorrectly.",
        },
        hints: [
          "Displacement is area under the velocity-time graph.",
          "Split the region into triangle, rectangle, and triangle.",
          "$\\frac12(4)(20)+(4)(20)+\\frac12(2)(20)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the three areas under the graph.",
            math: "s=40+80+20=140\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`A body starts from rest and moves with constant acceleration $3\text{ m s}^{-2}$ for $5\text{ s}$. Its final velocity is`,
        difficulty: 2,
        skillTags: ["uniform_acceleration", "equations_of_motion"],
        choices: [
          "$8\\text{ m s}^{-1}$",
          "$45\\text{ m s}^{-1}$",
          "$7.5\\text{ m s}^{-1}$",
          "$15\\text{ m s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This adds acceleration and time as if they had the same unit.",
          B: "This uses $at^2$ instead of $at$ for velocity.",
          C: "This is half of $at$, which belongs to displacement from rest.",
        },
        hints: [
          "Use $v=u+at$.",
          "Starting from rest means $u=0$.",
          "$v=0+3\\times5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the first equation of motion.",
            math: "v=0+3(5)=15\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`An object moving with $u=10\text{ m s}^{-1}$ has acceleration $-2\text{ m s}^{-2}$. The time taken to stop is`,
        difficulty: 2,
        skillTags: ["retardation", "equations_of_motion"],
        choices: [
          "$5\\text{ s}$",
          "$20\\text{ s}$",
          "$8\\text{ s}$",
          "$2\\text{ s}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This multiplies speed and acceleration instead of solving $v=u+at$.",
          C: "This adds $10$ and $-2$.",
          D: "This divides acceleration by speed.",
        },
        hints: [
          "Stopping means final velocity $v=0$.",
          "Use $v=u+at$.",
          "$0=10-2t$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set final velocity to zero.",
            math: "0=10-2t\\Rightarrow t=5\\text{ s}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Area under a velocity-time graph gives displacement. Reason (R): Velocity has units of displacement per unit time.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "velocity_time_graph"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "Both A and R are true, and R is the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason explains why multiplying velocity by time gives displacement.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Area on a $v-t$ graph has units of velocity times time.",
          "$(\\text{m s}^{-1})(\\text{s})=\\text{m}$.",
          "That is displacement for signed velocity.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use units and graph area.",
            math: "\\text{area}=v\\Delta t\\Rightarrow (\\text{m s}^{-1})\\text{s}=\\text{m}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A stone is dropped from rest. Taking $g=10\text{ m s}^{-2}$, find its speed after $3\text{ s}$.`,
        difficulty: 1,
        skillTags: ["free_fall", "uniform_acceleration"],
        parts: singlePart("a", "Find the speed after $3\\text{ s}$.", 1),
        hints: [
          "Dropped from rest means $u=0$.",
          "Use $v=u+gt$.",
          "$v=10\\times3$.",
        ],
        rubric: singleRubric("a", 1, "Finds $30\\text{ m s}^{-1}$."),
        commonErrors: ["Using $s=\\frac12gt^2$ when speed is asked."],
        workedSolution: [
          {
            part: "a",
            explanation: "$v=u+gt=0+10(3)=30\\text{ m s}^{-1}$ downward.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A train accelerates uniformly from $12\text{ m s}^{-1}$ to $24\text{ m s}^{-1}$ in $6\text{ s}$. Find its acceleration.`,
        difficulty: 2,
        skillTags: ["uniform_acceleration"],
        parts: singlePart("a", "Calculate the acceleration.", 1),
        hints: [
          "Acceleration is change in velocity divided by time.",
          "Use $v-u$.",
          "$(24-12)/6=2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $2\\text{ m s}^{-2}$."),
        commonErrors: ["Using final velocity divided by time."],
        workedSolution: [
          {
            part: "a",
            explanation: "$a=(v-u)/t=(24-12)/6=2\\text{ m s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A scooter starts from rest and has uniform acceleration $2\text{ m s}^{-2}$ for $8\text{ s}$.`,
        difficulty: 2,
        skillTags: ["equations_of_motion", "uniform_acceleration"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the final velocity.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the displacement.", points: 1 },
        ],
        hints: [
          "Use $v=u+at$ for velocity.",
          "Use $s=ut+\\frac12at^2$ for displacement.",
          "Here $u=0$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $16\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $64\\text{ m}$." },
          ],
        },
        commonErrors: ["Using $s=at$ instead of $s=\\frac12at^2$ from rest."],
        workedSolution: [
          { part: "a", explanation: "$v=0+2(8)=16\\text{ m s}^{-1}$." },
          { part: "b", explanation: "$s=0+\\frac12(2)(8^2)=64\\text{ m}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the velocity-time graph shown for the toy car.`,
        figure: velocityTimeGraphFigure,
        difficulty: 4,
        skillTags: ["velocity_time_graph", "acceleration", "displacement_area"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the acceleration from $0$ to $4\\text{ s}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the acceleration from $8\\text{ s}$ to $10\\text{ s}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the total displacement from $0$ to $10\\text{ s}$.",
            points: 2,
          },
        ],
        hints: [
          "Acceleration is slope of the $v-t$ graph.",
          "Displacement is area under the graph.",
          "Use two triangles and one rectangle.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $5\\text{ m s}^{-2}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $-10\\text{ m s}^{-2}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds total displacement $140\\text{ m}$.",
            },
          ],
        },
        commonErrors: ["Forgetting the final triangular area."],
        workedSolution: [
          { part: "a", explanation: "$a=(20-0)/(4-0)=5\\text{ m s}^{-2}$." },
          { part: "b", explanation: "$a=(0-20)/(10-8)=-10\\text{ m s}^{-2}$." },
          {
            part: "c",
            explanation:
              "Area $=\\frac12(4)(20)+(4)(20)+\\frac12(2)(20)=40+80+20=140\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A particle has the acceleration-time graph shown. It starts from rest at $t=0$.`,
        figure: accelerationGraphFigure,
        difficulty: 4,
        skillTags: ["case_based", "acceleration_time_graph", "velocity_change"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the change in velocity from $0$ to $3\\text{ s}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the change in velocity from $3\\text{ s}$ to $5\\text{ s}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the change in velocity from $5\\text{ s}$ to $9\\text{ s}$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the velocity at $9\\text{ s}$.",
            points: 2,
          },
        ],
        hints: [
          "Area under an acceleration-time graph gives change in velocity.",
          "Take areas above the time axis as positive and below as negative.",
          "The object starts from rest.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $+6\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $0$." },
            {
              part: "c",
              points: 1,
              description: "Finds $-4\\text{ m s}^{-1}$.",
            },
            {
              part: "d",
              points: 2,
              description: "Finds final velocity $2\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Treating all areas as positive even below the time axis.",
        ],
        workedSolution: [
          { part: "a", explanation: "$\\Delta v=(2)(3)=6\\text{ m s}^{-1}$." },
          { part: "b", explanation: "Acceleration is zero, so $\\Delta v=0$." },
          {
            part: "c",
            explanation: "$\\Delta v=(-1)(4)=-4\\text{ m s}^{-1}$.",
          },
          {
            part: "d",
            explanation:
              "Starting from rest, $v(9)=0+6+0-4=2\\text{ m s}^{-1}$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Vectors and Components",
    subtopic:
      "Vector notation, equality, addition, subtraction, unit vectors, rectangular components, and scalar and vector products.",
    mc: [
      {
        questionLatex: L`A vector of magnitude $10$ makes an angle $37^\circ$ with the positive $x$-axis. Taking $\cos37^\circ=4/5$ and $\sin37^\circ=3/5$, its rectangular components are`,
        difficulty: 2,
        skillTags: ["vector_components", "rectangular_resolution"],
        choices: [
          "$6\\hat i+8\\hat j$",
          "$10\\hat i+10\\hat j$",
          "$8\\hat i+6\\hat j$",
          "$8\\hat i-6\\hat j$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This interchanges the cosine and sine components.",
          B: "This uses the magnitude itself for both components.",
          D: "The vector is above the positive $x$-axis, so the $y$-component is positive.",
        },
        hints: [
          "For an angle measured from the positive $x$-axis, use $A_x=A\\cos\\theta$.",
          "Use $A_y=A\\sin\\theta$.",
          "$10(4/5)=8$ and $10(3/5)=6$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Resolve the vector along the axes.",
            math: "A_x=10\\cos37^\\circ=8,\\quad A_y=10\\sin37^\\circ=6",
          },
          {
            step: 2,
            explanation: "Write the vector in unit-vector form.",
            math: "\\vec A=8\\hat i+6\\hat j",
          },
        ],
      },
      {
        questionLatex: L`A displacement of $5\text{ km}$ east is followed by a displacement of $12\text{ km}$ north. The magnitude of the resultant displacement is`,
        difficulty: 2,
        skillTags: ["vector_addition", "resultant_displacement"],
        choices: [
          "$17\\text{ km}$",
          "$7\\text{ km}$",
          "$60\\text{ km}$",
          "$13\\text{ km}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This is the path length, not the resultant displacement.",
          B: "This subtracts the two perpendicular displacements.",
          C: "This multiplies the perpendicular components.",
        },
        hints: [
          "The two displacements are perpendicular.",
          "Use the right triangle shown by the head-to-tail diagram.",
          "$R=\\sqrt{5^2+12^2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use Pythagoras for perpendicular components.",
            math: "R=\\sqrt{5^2+12^2}=13\\text{ km}",
          },
        ],
      },
      {
        questionLatex: L`For $\vec A=2\hat i+3\hat j$ and $\vec B=4\hat i-\hat j$, the value of $\vec A\cdot\vec B$ is`,
        difficulty: 2,
        skillTags: ["scalar_product", "unit_vectors"],
        choices: ["$5$", "$11$", "$-5$", "$8\\hat i-3\\hat j$"],
        correctLetter: "A",
        rationales: {
          B: "This adds $8$ and $3$ instead of using the negative $y$-component of $\\vec B$.",
          C: "This reverses the sign of the $x$ contribution.",
          D: "A scalar product gives a scalar, not a vector.",
        },
        hints: [
          "Multiply like components and add.",
          "$\\hat i\\cdot\\hat i=1$ and $\\hat j\\cdot\\hat j=1$.",
          "$2(4)+3(-1)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the scalar product.",
            math: "\\vec A\\cdot\\vec B=2(4)+3(-1)=5",
          },
        ],
      },
      {
        questionLatex: L`Two vectors of magnitudes $6$ and $4$ have an angle $30^\circ$ between them. The magnitude of their vector product is`,
        difficulty: 3,
        skillTags: ["vector_product", "angle_between_vectors"],
        choices: ["$24$", "$12$", "$12\\sqrt3$", "$6\\sqrt3$"],
        correctLetter: "B",
        rationales: {
          A: "This uses $AB$ and omits the factor $\\sin30^\\circ$.",
          C: "This uses $\\cos30^\\circ$ instead of $\\sin30^\\circ$.",
          D: "This halves the wrong expression.",
        },
        hints: [
          "Magnitude of vector product is $AB\\sin\\theta$.",
          "Here $\\theta=30^\\circ$.",
          "$\\sin30^\\circ=1/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the magnitude formula for cross product.",
            math: "|\\vec A\\times\\vec B|=6\\times4\\times\\frac12=12",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A unit vector has magnitude $1$. Reason (R): A unit vector is used to specify direction without changing the physical dimension of the vector being represented.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "unit_vector"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "A is true, but R is false.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is false, but R is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason is true, but it describes the use of a unit vector; the defining reason for A is its definition.",
          B: "The reason is also true.",
          D: "The assertion is true by definition.",
        },
        hints: [
          "Check whether each statement is true separately.",
          "Then decide whether the reason explains the assertion.",
          "A unit vector is defined to have unit magnitude.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true, but R is a use of unit vectors rather than the definition that proves A.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Resolve a vector of magnitude $20$ making $60^\circ$ with the positive $x$-axis into rectangular components.`,
        difficulty: 2,
        skillTags: ["vector_components"],
        parts: singlePart("a", "Find $A_x$ and $A_y$.", 1),
        hints: [
          "Use $A_x=A\\cos60^\\circ$.",
          "Use $A_y=A\\sin60^\\circ$.",
          "$\\cos60^\\circ=1/2$ and $\\sin60^\\circ=\\sqrt3/2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $A_x=10$ and $A_y=10\\sqrt3$."),
        commonErrors: ["Interchanging sine and cosine components."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$A_x=20\\cos60^\\circ=10$ and $A_y=20\\sin60^\\circ=10\\sqrt3$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`If $\vec A=3\hat i-4\hat j$ and $\vec B=4\hat i+3\hat j$, find $\vec A\cdot\vec B$.`,
        difficulty: 2,
        skillTags: ["scalar_product", "perpendicular_vectors"],
        parts: singlePart("a", "Calculate the scalar product.", 1),
        hints: [
          "Multiply corresponding components.",
          "Add the products.",
          "$3(4)+(-4)(3)$.",
        ],
        rubric: singleRubric("a", 1, "Finds $0$."),
        commonErrors: ["Ignoring the negative sign in $-4\\hat j$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\vec A\\cdot\\vec B=3(4)+(-4)(3)=12-12=0$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two displacements are $6\text{ m}$ east and $8\text{ m}$ north.`,
        difficulty: 3,
        skillTags: ["vector_addition", "direction_of_resultant"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the magnitude of the resultant.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find its direction measured north of east.",
            points: 1,
          },
        ],
        hints: [
          "Draw a right triangle with components $6$ and $8$.",
          "Use Pythagoras for magnitude.",
          "Use $\\tan\\theta=8/6$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $10\\text{ m}$." },
            {
              part: "b",
              points: 1,
              description:
                "Finds $\\tan^{-1}(4/3)$ north of east, about $53^\\circ$.",
            },
          ],
        },
        commonErrors: ["Reporting path length $14\\text{ m}$ as displacement."],
        workedSolution: [
          { part: "a", explanation: "$R=\\sqrt{6^2+8^2}=10\\text{ m}$." },
          {
            part: "b",
            explanation:
              "$\\tan\\theta=8/6=4/3$, so $\\theta\\approx53^\\circ$ north of east.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A force vector of magnitude $50\text{ N}$ acts at an angle $53^\circ$ above the positive $x$-axis. Take $\cos53^\circ=0.6$ and $\sin53^\circ=0.8$.`,
        difficulty: 3,
        skillTags: ["rectangular_components", "component_reconstruction"],
        parts: [
          { letter: "a", promptMarkdown: "Find the $x$-component.", points: 1 },
          { letter: "b", promptMarkdown: "Find the $y$-component.", points: 1 },
          {
            letter: "c",
            promptMarkdown:
              "Verify the original magnitude using the two components.",
            points: 2,
          },
        ],
        hints: [
          "The horizontal component is adjacent to the angle.",
          "The vertical component is opposite to the angle.",
          "Use $\\sqrt{F_x^2+F_y^2}$ to check the magnitude.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $F_x=30\\text{ N}$." },
            { part: "b", points: 1, description: "Finds $F_y=40\\text{ N}$." },
            {
              part: "c",
              points: 2,
              description: "Verifies $\\sqrt{30^2+40^2}=50\\text{ N}$.",
            },
          ],
        },
        commonErrors: [
          "Using sine for the horizontal component when the angle is measured from the $x$-axis.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$F_x=50\\cos53^\\circ=50(0.6)=30\\text{ N}$.",
          },
          {
            part: "b",
            explanation: "$F_y=50\\sin53^\\circ=50(0.8)=40\\text{ N}$.",
          },
          {
            part: "c",
            explanation:
              "$\\sqrt{30^2+40^2}=\\sqrt{2500}=50\\text{ N}$, so the components match the original vector.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A drone moves $50\text{ m}$ east, then $120\text{ m}$ north, and finally $10\text{ m}$ west while surveying a field.`,
        difficulty: 3,
        skillTags: ["case_based", "resultant_displacement", "path_length"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the total path length.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the net eastward component of displacement.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the magnitude of resultant displacement.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why the answer in part (a) is not the displacement.",
            points: 1,
          },
        ],
        hints: [
          "Path length adds every part of the route.",
          "East and west components oppose each other.",
          "The final displacement has components $40\\text{ m}$ east and $120\\text{ m}$ north.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds path length $180\\text{ m}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds net eastward component $40\\text{ m}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds resultant $40\\sqrt{10}\\text{ m}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Explains path length versus straight-line displacement.",
            },
          ],
        },
        commonErrors: [
          "Adding all distances and calling the result displacement.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Path length $=50+120+10=180\\text{ m}$.",
          },
          {
            part: "b",
            explanation: "Net eastward component $=50-10=40\\text{ m}$.",
          },
          {
            part: "c",
            explanation:
              "Resultant $=\\sqrt{40^2+120^2}=40\\sqrt{10}\\text{ m}$.",
          },
          {
            part: "d",
            explanation:
              "Displacement is the straight vector from start to finish, while path length follows the actual route.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Motion in a Plane: Projectile and Relative Motion",
    subtopic:
      "Independent horizontal and vertical motions, projectile time of flight, range, maximum height, and relative velocity in two dimensions.",
    mc: [
      {
        questionLatex: L`In ideal projectile motion near the earth's surface, neglecting air resistance, the horizontal acceleration is`,
        difficulty: 1,
        skillTags: ["projectile_motion", "horizontal_acceleration"],
        choices: ["$g$", "$u\\cos\\theta$", "$u\\sin\\theta$", "$0$"],
        correctLetter: "D",
        rationales: {
          A: "Gravity acts vertically downward, not horizontally.",
          B: "This is the initial horizontal velocity component, not acceleration.",
          C: "This is the initial vertical velocity component, not acceleration.",
        },
        hints: [
          "Only gravity acts after projection when air resistance is neglected.",
          "Gravity is vertical.",
          "Therefore horizontal velocity remains constant.",
        ],
        solution: [
          {
            step: 1,
            explanation: "There is no horizontal force in the ideal model.",
            math: "a_x=0",
          },
        ],
      },
      {
        questionLatex: L`A projectile is fired with speed $30\text{ m s}^{-1}$ at $30^\circ$ above the horizontal. Taking $g=10\text{ m s}^{-2}$, its time of flight is`,
        difficulty: 3,
        skillTags: ["projectile_motion", "time_of_flight"],
        choices: [
          "$3\\text{ s}$",
          "$1.5\\text{ s}$",
          "$6\\text{ s}$",
          "$3\\sqrt3\\text{ s}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the time to reach maximum height, not the full time of flight.",
          C: "This doubles the speed without taking the sine component.",
          D: "This uses the horizontal component instead of the vertical component.",
        },
        hints: [
          "Use only the vertical component for time of flight.",
          "$u_y=u\\sin30^\\circ=15\\text{ m s}^{-1}$.",
          "$T=2u_y/g$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Find the vertical component and apply the time-of-flight formula.",
            math: "T=\\frac{2u\\sin30^\\circ}{g}=\\frac{2(30)(1/2)}{10}=3\\text{ s}",
          },
        ],
      },
      {
        questionLatex: L`A projectile is launched with speed $20\text{ m s}^{-1}$ at $45^\circ$. With $g=10\text{ m s}^{-2}$, the horizontal range is`,
        difficulty: 3,
        skillTags: ["projectile_range", "projectile_motion"],
        choices: [
          "$20\\text{ m}$",
          "$40\\text{ m}$",
          "$80\\text{ m}$",
          "$20\\sqrt2\\text{ m}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This is what you get by omitting the factor $\\sin2\\theta$ at $45^\\circ$ incorrectly.",
          C: "This doubles the correct range.",
          D: "This mixes component speed with range.",
        },
        hints: [
          "For same launch and landing level, $R=u^2\\sin2\\theta/g$.",
          "Here $2\\theta=90^\\circ$.",
          "$\\sin90^\\circ=1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the range formula.",
            math: "R=\\frac{20^2\\sin90^\\circ}{10}=40\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`A boat is aimed straight across a river with speed $12\text{ m s}^{-1}$ relative to water. The river current is $5\text{ m s}^{-1}$ downstream. The boat's speed relative to the ground is`,
        difficulty: 3,
        skillTags: ["relative_velocity", "vector_addition"],
        choices: [
          "$17\\text{ m s}^{-1}$",
          "$7\\text{ m s}^{-1}$",
          "$13\\text{ m s}^{-1}$",
          "$60\\text{ m s}^{-1}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This adds perpendicular velocities as scalars.",
          B: "This subtracts perpendicular velocities.",
          D: "This multiplies the component speeds.",
        },
        hints: [
          "The across-river velocity and current are perpendicular.",
          "Use vector addition, not scalar addition.",
          "$v=\\sqrt{12^2+5^2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Combine perpendicular velocity components.",
            math: "v_{\\text{ground}}=\\sqrt{12^2+5^2}=13\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): In projectile motion without air resistance, the horizontal component of velocity remains constant. Reason (R): The horizontal acceleration is zero in this model.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "projectile_motion"],
        choices: [
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
          "Both A and R are true, and R is the correct explanation of A.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The reason directly explains the constant horizontal velocity.",
          B: "The reason is true in ideal projectile motion.",
          C: "The assertion is also true.",
        },
        hints: [
          "Check horizontal and vertical motions separately.",
          "Velocity changes only when acceleration exists along that direction.",
          "No horizontal acceleration means no horizontal velocity change.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The model has $a_x=0$, so $v_x$ is constant.",
            math: "v_x=u\\cos\\theta",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`A projectile is projected horizontally from a height. After leaving the table, which statement is correct before it hits the ground?`,
        difficulty: 2,
        skillTags: ["horizontal_projectile", "independent_motion"],
        choices: [
          "Its horizontal velocity remains constant while vertical velocity changes.",
          "Both horizontal and vertical velocities remain constant.",
          "Its vertical acceleration becomes zero after projection.",
          "Its horizontal acceleration equals $g$.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The vertical velocity changes due to gravity.",
          C: "The vertical acceleration is $g$ downward throughout the flight.",
          D: "Gravity has no horizontal component in the ideal model.",
        },
        hints: [
          "Separate horizontal and vertical motions.",
          "Only gravity acts after the projectile leaves the table.",
          "Gravity acts vertically downward.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In ideal projectile motion, $a_x=0$ and $a_y=-g$, so horizontal velocity is constant while vertical velocity changes.",
          },
        ],
      },
      {
        questionLatex: L`A ball is thrown horizontally at $8\text{ m s}^{-1}$ from a height of $20\text{ m}$. Taking $g=10\text{ m s}^{-2}$, its horizontal range is`,
        difficulty: 3,
        skillTags: ["horizontal_projectile", "time_of_fall", "range"],
        choices: [
          "$8\\text{ m}$",
          "$16\\text{ m}$",
          "$20\\text{ m}$",
          "$32\\text{ m}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses $1\\text{ s}$ without finding the fall time.",
          C: "This confuses height with horizontal range.",
          D: "This doubles the correct fall time.",
        },
        hints: [
          "Find the time of fall from vertical motion.",
          "$h=\\frac12gt^2$.",
          "Horizontal range is $u_xt$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "First find the time of fall.",
            math: "20=\\frac12(10)t^2\\Rightarrow t=2\\text{ s}",
          },
          {
            step: 2,
            explanation: "Use horizontal motion with constant velocity.",
            math: "R=8(2)=16\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`For a projectile landing at the same level, the range is maximum when the angle of projection is`,
        difficulty: 2,
        skillTags: ["projectile_range", "maximum_range"],
        choices: ["$30^\circ$", "$60^\circ$", "$45^\circ$", "$90^\circ$"],
        correctLetter: "C",
        rationales: {
          A: "At $30^\\circ$, $\\sin 2\\theta=\\sin60^\\circ<1$.",
          B: "$60^\\circ$ gives the same range as $30^\\circ$, not the maximum.",
          D: "At $90^\\circ$, horizontal range is zero.",
        },
        hints: [
          "Use $R=u^2\\sin2\\theta/g$ for same-level landing.",
          "Range is maximum when $\\sin2\\theta$ is maximum.",
          "$\\sin2\\theta=1$ when $2\\theta=90^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$R$ is maximum when $\\sin2\\theta=1$, so $2\\theta=90^\\circ$ and $\\theta=45^\\circ$.",
          },
        ],
      },
      {
        questionLatex: L`Rain falls vertically at $6\text{ m s}^{-1}$ with respect to the ground. A cyclist moves east at $8\text{ m s}^{-1}$. The speed of rain relative to the cyclist is`,
        difficulty: 3,
        skillTags: ["relative_velocity", "rain_person"],
        choices: [
          "$2\\text{ m s}^{-1}$",
          "$14\\text{ m s}^{-1}$",
          "$48\\text{ m s}^{-1}$",
          "$10\\text{ m s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "The velocities are perpendicular, so they should not be subtracted as scalars.",
          B: "The velocities are perpendicular, so they should not be added as scalars.",
          C: "This multiplies the component speeds.",
        },
        hints: [
          "Relative velocity is a vector difference.",
          "The horizontal and vertical components are perpendicular.",
          "Use $\\sqrt{6^2+8^2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The relative velocity components are $8$ horizontally and $6$ vertically.",
            math: "v=\\sqrt{8^2+6^2}=10\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`Two projectiles are launched from the same point with the same speed at angles $30^\circ$ and $60^\circ$ to the horizontal. Neglect air resistance. Which quantity is the same for both?`,
        difficulty: 4,
        skillTags: ["projectile_motion", "complementary_angles"],
        choices: [
          "Maximum height",
          "Time of flight",
          "Horizontal range",
          "Initial vertical component",
        ],
        correctLetter: "C",
        rationales: {
          A: "Maximum height depends on $\\sin^2\\theta$, so it differs.",
          B: "Time of flight depends on $\\sin\\theta$, so it differs.",
          D: "The vertical components are $u/2$ and $u\\sqrt3/2$.",
        },
        hints: [
          "Compare formula dependence on $\\theta$.",
          "Range contains $\\sin2\\theta$.",
          "$\\sin60^\\circ=\\sin120^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For complementary angles, $2\\theta$ becomes $60^\\circ$ and $120^\\circ$, and their sines are equal. Hence the ranges are equal.",
            math: "R=\\frac{u^2\\sin2\\theta}{g}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A ball rolls horizontally off a table with speed $5\text{ m s}^{-1}$. It is in air for $0.8\text{ s}$. Find its horizontal range.`,
        difficulty: 2,
        skillTags: ["horizontal_projectile", "range"],
        parts: singlePart("a", "Find the horizontal distance travelled.", 1),
        hints: [
          "Horizontal velocity remains constant.",
          "Horizontal distance is $v_x t$.",
          "$5\\times0.8=4$.",
        ],
        rubric: singleRubric("a", 1, "Finds $4\\text{ m}$."),
        commonErrors: ["Using $\\frac12gt^2$ for horizontal displacement."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "With no horizontal acceleration, horizontal range $=v_x t=5(0.8)=4\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Two cars move east along the same straight road. Car A has speed $22\text{ m s}^{-1}$ and car B has speed $15\text{ m s}^{-1}$. Find the velocity of A relative to B.`,
        difficulty: 2,
        skillTags: ["relative_velocity", "one_dimensional_relative_motion"],
        parts: singlePart("a", "Find $v_{A/B}$.", 1),
        hints: [
          "Relative velocity $v_{A/B}=v_A-v_B$.",
          "Both velocities have the same direction.",
          "$22-15=7$.",
        ],
        rubric: singleRubric("a", 1, "Finds $7\\text{ m s}^{-1}$ east."),
        commonErrors: [
          "Adding speeds when the cars move in the same direction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$v_{A/B}=22-15=7\\text{ m s}^{-1}$ east.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A projectile is launched at $25\text{ m s}^{-1}$ such that $\sin\theta=3/5$ and $\cos\theta=4/5$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        skillTags: ["projectile_components", "time_to_highest_point"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the horizontal and vertical components of initial velocity.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the time taken to reach the highest point.",
            points: 1,
          },
        ],
        hints: [
          "Use $u_x=u\\cos\\theta$ and $u_y=u\\sin\\theta$.",
          "At the highest point, vertical velocity becomes zero.",
          "Use $0=u_y-gt$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Finds $u_x=20\\text{ m s}^{-1}$ and $u_y=15\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $t=1.5\\text{ s}$." },
          ],
        },
        commonErrors: [
          "Using horizontal velocity to find time to maximum height.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$u_x=25(4/5)=20\\text{ m s}^{-1}$ and $u_y=25(3/5)=15\\text{ m s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "At the highest point, $v_y=0$. So $0=15-10t$, giving $t=1.5\\text{ s}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A projectile is fired with speed $20\text{ m s}^{-1}$ at $30^\circ$ above the horizontal. Take $g=10\text{ m s}^{-2}$, $\sin30^\circ=1/2$, and $\cos30^\circ=\sqrt3/2$.`,
        difficulty: 4,
        skillTags: [
          "projectile_motion",
          "time_of_flight",
          "maximum_height",
          "range",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the horizontal and vertical components of initial velocity.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the time of flight.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the maximum height.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the horizontal range.",
            points: 2,
          },
        ],
        hints: [
          "Resolve the launch velocity first.",
          "Vertical motion decides time of flight and maximum height.",
          "Horizontal motion with constant speed decides range.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Finds $u_x=10\\sqrt3\\text{ m s}^{-1}$ and $u_y=10\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $T=2\\text{ s}$." },
            { part: "c", points: 1, description: "Finds $H=5\\text{ m}$." },
            {
              part: "d",
              points: 2,
              description: "Finds $R=20\\sqrt3\\text{ m}$.",
            },
          ],
        },
        commonErrors: ["Using $u$ instead of $u_y$ for vertical motion."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$u_x=20(\\sqrt3/2)=10\\sqrt3\\text{ m s}^{-1}$ and $u_y=20(1/2)=10\\text{ m s}^{-1}$.",
          },
          { part: "b", explanation: "$T=2u_y/g=2(10)/10=2\\text{ s}$." },
          { part: "c", explanation: "$H=u_y^2/(2g)=10^2/(20)=5\\text{ m}$." },
          {
            part: "d",
            explanation: "$R=u_xT=(10\\sqrt3)(2)=20\\sqrt3\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A boat must cross a $160\text{ m}$ wide river and reach the point directly opposite its start. The river current is $6\text{ m s}^{-1}$ downstream, and the boat's speed relative to water is $10\text{ m s}^{-1}$. The boat is aimed upstream at a fixed angle to the straight-across direction.`,
        difficulty: 5,
        skillTags: ["case_based", "relative_velocity", "river_boat"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the upstream component of the boat's velocity relative to water.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the component of the boat's velocity straight across the river.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the crossing time.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the angle between the boat's heading and the straight-across direction.",
            points: 1,
          },
        ],
        hints: [
          "For no drift, the upstream component must cancel the current.",
          "The boat's speed relative to water is the hypotenuse of a right triangle.",
          "Only the straight-across component decides the crossing time.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds upstream component $6\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds straight-across component $8\\text{ m s}^{-1}$.",
            },
            { part: "c", points: 1, description: "Finds $20\\text{ s}$." },
            {
              part: "d",
              points: 1,
              description:
                "Finds $\\tan\\theta=3/4$, so $\\theta\\approx37^\\circ$ upstream.",
            },
          ],
        },
        commonErrors: [
          "Using the full $10\\text{ m s}^{-1}$ as the crossing speed after cancelling current.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "To arrive directly opposite, the upstream component must cancel the current, so it is $6\\text{ m s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "The $10\\text{ m s}^{-1}$ boat speed relative to water is split into perpendicular components. The across component is $\\sqrt{10^2-6^2}=8\\text{ m s}^{-1}$.",
          },
          {
            part: "c",
            explanation: "Crossing time $=160/8=20\\text{ s}$.",
          },
          {
            part: "d",
            explanation:
              "If $\\theta$ is measured from the straight-across direction, $\\tan\\theta=6/8=3/4$, so $\\theta\\approx37^\\circ$ upstream.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A stone is projected horizontally at $12\text{ m s}^{-1}$ and remains in air for $1.5\text{ s}$.`,
        difficulty: 2,
        skillTags: ["horizontal_projectile", "range"],
        parts: singlePart("a", "Find the horizontal range.", 1),
        hints: [
          "Horizontal velocity is constant.",
          "Use $x=u_xt$.",
          "$12\\times1.5=18$.",
        ],
        rubric: singleRubric("a", 1, "Finds $18\\text{ m}$."),
        commonErrors: [
          "Using vertical acceleration for horizontal displacement.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Range $=u_xt=12(1.5)=18\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A swimmer can swim at $5\text{ m s}^{-1}$ in still water and aims directly across a river flowing at $12\text{ m s}^{-1}$.`,
        difficulty: 2,
        skillTags: ["relative_velocity", "river_swimmer"],
        parts: singlePart(
          "a",
          "Find the swimmer's speed relative to the ground.",
          1,
        ),
        hints: [
          "Across-river and downstream velocities are perpendicular.",
          "Use Pythagoras.",
          "$5,12,13$ form a right triangle.",
        ],
        rubric: singleRubric("a", 1, "Finds $13\\text{ m s}^{-1}$."),
        commonErrors: [
          "Adding perpendicular velocities as $17\\text{ m s}^{-1}$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$v=\\sqrt{5^2+12^2}=13\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A projectile is fired with speed $40\text{ m s}^{-1}$ at $30^\circ$ above the horizontal. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        skillTags: ["projectile_motion", "maximum_height", "time_of_flight"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the vertical component of initial velocity.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the maximum height.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the time of flight.",
            points: 1,
          },
        ],
        hints: [
          "$u_y=u\\sin30^\\circ$.",
          "Use $H=u_y^2/(2g)$.",
          "Use $T=2u_y/g$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $u_y=20\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $H=20\\text{ m}$." },
            { part: "c", points: 1, description: "Finds $T=4\\text{ s}$." },
          ],
        },
        commonErrors: [
          "Using the full launch speed instead of the vertical component.",
        ],
        workedSolution: [
          { part: "a", explanation: "$u_y=40(1/2)=20\\text{ m s}^{-1}$." },
          { part: "b", explanation: "$H=u_y^2/(2g)=20^2/20=20\\text{ m}$." },
          { part: "c", explanation: "$T=2u_y/g=2(20)/10=4\\text{ s}$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A projectile has initial components $u_x=24\text{ m s}^{-1}$ and $u_y=18\text{ m s}^{-1}$. It lands at the same level from which it was projected. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: [
          "projectile_components",
          "time_of_flight",
          "range",
          "maximum_height",
        ],
        parts: [
          { letter: "a", promptMarkdown: "Find the initial speed.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the time of flight.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the horizontal range.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the maximum height.",
            points: 1,
          },
        ],
        hints: [
          "Use components as perpendicular sides.",
          "Vertical component decides time and height.",
          "Horizontal component decides range.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $30\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $3.6\\text{ s}$." },
            { part: "c", points: 1, description: "Finds $86.4\\text{ m}$." },
            { part: "d", points: 1, description: "Finds $16.2\\text{ m}$." },
          ],
        },
        commonErrors: ["Using $u_x$ in the vertical motion equation."],
        workedSolution: [
          {
            part: "a",
            explanation: "$u=\\sqrt{24^2+18^2}=30\\text{ m s}^{-1}$.",
          },
          { part: "b", explanation: "$T=2u_y/g=2(18)/10=3.6\\text{ s}$." },
          { part: "c", explanation: "$R=u_xT=24(3.6)=86.4\\text{ m}$." },
          { part: "d", explanation: "$H=u_y^2/(2g)=18^2/20=16.2\\text{ m}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A rescue package is released from an aircraft flying horizontally at $90\text{ m s}^{-1}$ at a height of $320\text{ m}$. Ignore air resistance and take $g=10\text{ m s}^{-2}$.`,
        difficulty: 5,
        skillTags: ["case_based", "horizontal_projectile", "aircraft_drop"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the time taken by the package to reach the ground.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the horizontal distance covered before landing.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the vertical component of velocity just before impact.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why the package remains below the aircraft if the aircraft continues with the same horizontal velocity.",
            points: 2,
          },
        ],
        hints: [
          "Vertical motion decides fall time.",
          "Horizontal velocity remains $90\\text{ m s}^{-1}$.",
          "Both aircraft and package have the same horizontal velocity after release.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $8\\text{ s}$." },
            { part: "b", points: 1, description: "Finds $720\\text{ m}$." },
            {
              part: "c",
              points: 1,
              description: "Finds $80\\text{ m s}^{-1}$ downward.",
            },
            {
              part: "d",
              points: 2,
              description:
                "Explains equal horizontal velocity and vertical acceleration of package.",
            },
          ],
        },
        commonErrors: [
          "Treating the package as if it loses horizontal velocity when released.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$320=\\frac12(10)t^2$, so $t=8\\text{ s}$.",
          },
          { part: "b", explanation: "$x=90(8)=720\\text{ m}$." },
          {
            part: "c",
            explanation: "$v_y=gt=10(8)=80\\text{ m s}^{-1}$ downward.",
          },
          {
            part: "d",
            explanation:
              "The package keeps the aircraft's horizontal velocity at release. Since both have the same horizontal motion, the package stays vertically below the aircraft while falling.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Uniform Circular Motion",
    subtopic:
      "Angular speed, period, frequency, tangent velocity, and centripetal acceleration in uniform circular motion.",
    mc: [
      {
        questionLatex: L`At any instant in uniform circular motion, the velocity of the particle is directed`,
        difficulty: 1,
        skillTags: ["uniform_circular_motion", "tangent_velocity"],
        choices: [
          "along the tangent to the circle",
          "towards the centre of the circle",
          "away from the centre of the circle",
          "opposite to the centripetal acceleration only when speed increases",
        ],
        correctLetter: "A",
        rationales: {
          B: "The acceleration is towards the centre; velocity is tangent.",
          C: "A radial outward direction is not the instantaneous velocity in circular motion.",
          D: "Uniform circular motion has constant speed; the velocity direction is tangent at every point.",
        },
        hints: [
          "Velocity points along the direction of instantaneous motion.",
          "A particle on a circle moves along the curve.",
          "The tangent gives the direction of motion at that point.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Instantaneous velocity is tangent to the circular path.",
          },
        ],
      },
      {
        questionLatex: L`A particle moves in a circle of radius $5\text{ m}$ with speed $10\text{ m s}^{-1}$. Its centripetal acceleration is`,
        difficulty: 2,
        skillTags: ["centripetal_acceleration"],
        choices: [
          "$2\\text{ m s}^{-2}$",
          "$20\\text{ m s}^{-2}$",
          "$50\\text{ m s}^{-2}$",
          "$10\\text{ m s}^{-2}$",
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses $v/r$ instead of $v^2/r$.",
          C: "This multiplies $v$ and $r$.",
          D: "This ignores the radius.",
        },
        hints: [
          "Centripetal acceleration has magnitude $v^2/r$.",
          "Square the speed first.",
          "$10^2/5=20$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use centripetal acceleration.",
            math: "a_c=\\frac{v^2}{r}=\\frac{10^2}{5}=20\\text{ m s}^{-2}",
          },
        ],
      },
      {
        questionLatex: L`A particle completes $2$ revolutions each second in a circle of radius $0.5\text{ m}$. Its speed is`,
        difficulty: 3,
        skillTags: ["frequency", "speed_in_circular_motion"],
        choices: [
          "$\\pi\\text{ m s}^{-1}$",
          "$4\\pi\\text{ m s}^{-1}$",
          "$2\\pi\\text{ m s}^{-1}$",
          "$1\\text{ m s}^{-1}$",
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses one revolution per second instead of two.",
          B: "This doubles the circumference factor.",
          D: "This omits the factor $2\\pi$.",
        },
        hints: [
          "Speed in circular motion is circumference times frequency.",
          "$v=2\\pi r f$.",
          "Use $r=0.5$ and $f=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate circular speed.",
            math: "v=2\\pi(0.5)(2)=2\\pi\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`A wheel rotates at $120$ revolutions per minute. Its angular speed is`,
        difficulty: 3,
        skillTags: ["angular_speed", "rpm_conversion"],
        choices: [
          "$2\\pi\\text{ rad s}^{-1}$",
          "$120\\pi\\text{ rad s}^{-1}$",
          "$240\\pi\\text{ rad s}^{-1}$",
          "$4\\pi\\text{ rad s}^{-1}$",
        ],
        correctLetter: "D",
        rationales: {
          A: "This corresponds to one revolution per second, not two.",
          B: "This forgets to convert minutes to seconds.",
          C: "This also forgets the minute-to-second conversion.",
        },
        hints: [
          "Convert revolutions per minute to revolutions per second.",
          "$120\\text{ rpm}=2\\text{ rev s}^{-1}$.",
          "One revolution is $2\\pi$ radians.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert to radians per second.",
            math: "\\omega=2(2\\pi)=4\\pi\\text{ rad s}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): In uniform circular motion, acceleration is non-zero even though speed is constant. Reason (R): The direction of velocity changes continuously.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "uniform_circular_motion"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The changing direction of velocity is exactly why acceleration exists.",
          C: "The reason is true.",
          D: "The assertion is also true.",
        },
        hints: [
          "Acceleration measures change in velocity, not only change in speed.",
          "Velocity is a vector.",
          "In circular motion, the velocity direction keeps changing.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Velocity changes because its direction changes, so centripetal acceleration is present.",
            math: "a_c=\\frac{v^2}{r}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A body moves in a circle of radius $2\text{ m}$ with speed $6\text{ m s}^{-1}$. Find its centripetal acceleration.`,
        difficulty: 2,
        skillTags: ["centripetal_acceleration"],
        parts: singlePart("a", "Find $a_c$.", 1),
        hints: ["Use $a_c=v^2/r$.", "Square the speed.", "$36/2=18$."],
        rubric: singleRubric("a", 1, "Finds $18\\text{ m s}^{-2}$."),
        commonErrors: ["Using $v/r$ instead of $v^2/r$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$a_c=v^2/r=6^2/2=18\\text{ m s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A rotating fan has frequency $5\text{ Hz}$. Find its time period.`,
        difficulty: 1,
        skillTags: ["period_frequency"],
        parts: singlePart("a", "Find $T$.", 1),
        hints: [
          "Frequency and time period are reciprocals.",
          "$T=1/f$.",
          "$1/5=0.2$.",
        ],
        rubric: singleRubric("a", 1, "Finds $0.2\\text{ s}$."),
        commonErrors: [
          "Multiplying by frequency instead of taking reciprocal.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$T=1/f=1/5=0.2\\text{ s}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A point on the rim of a wheel of radius $0.25\text{ m}$ completes $4$ revolutions per second.`,
        difficulty: 3,
        skillTags: ["frequency", "circular_speed", "centripetal_acceleration"],
        parts: [
          { letter: "a", promptMarkdown: "Find its speed.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find its centripetal acceleration.",
            points: 1,
          },
        ],
        hints: [
          "Use $v=2\\pi r f$.",
          "Then use $a_c=v^2/r$.",
          "Keep the answer in terms of $\\pi$ if needed.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $2\\pi\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $16\\pi^2\\text{ m s}^{-2}$.",
            },
          ],
        },
        commonErrors: ["Using angular speed as linear speed."],
        workedSolution: [
          {
            part: "a",
            explanation: "$v=2\\pi(0.25)(4)=2\\pi\\text{ m s}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "$a_c=v^2/r=(2\\pi)^2/0.25=16\\pi^2\\text{ m s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A cyclist moves with constant speed $10\text{ m s}^{-1}$ on a circular track of radius $50\text{ m}$.`,
        difficulty: 4,
        skillTags: [
          "uniform_circular_motion",
          "period",
          "angular_speed",
          "centripetal_acceleration",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the time period of one complete revolution.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the angular speed.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Find the centripetal acceleration.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State the direction of acceleration at any instant.",
            points: 1,
          },
        ],
        hints: [
          "One revolution covers the circumference $2\\pi r$.",
          "Use $\\omega=v/r$.",
          "Centripetal acceleration always points toward the centre.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $10\\pi\\text{ s}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $0.2\\text{ rad s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $2\\text{ m s}^{-2}$.",
            },
            {
              part: "d",
              points: 1,
              description: "States acceleration is directed toward the centre.",
            },
          ],
        },
        commonErrors: [
          "Saying acceleration is zero because speed is constant.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$T=2\\pi r/v=2\\pi(50)/10=10\\pi\\text{ s}$.",
          },
          {
            part: "b",
            explanation: "$\\omega=v/r=10/50=0.2\\text{ rad s}^{-1}$.",
          },
          { part: "c", explanation: "$a_c=v^2/r=100/50=2\\text{ m s}^{-2}$." },
          {
            part: "d",
            explanation:
              "The acceleration is centripetal, so it is directed toward the centre of the circular path.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A stone tied to a string moves uniformly in a horizontal circle of radius $0.8\text{ m}$ and completes one revolution in $2\text{ s}$.`,
        difficulty: 4,
        skillTags: [
          "case_based",
          "period_frequency",
          "angular_speed",
          "circular_speed",
        ],
        parts: [
          { letter: "a", promptMarkdown: "Find the frequency.", points: 1 },
          { letter: "b", promptMarkdown: "Find the angular speed.", points: 1 },
          { letter: "c", promptMarkdown: "Find the linear speed.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "Find the centripetal acceleration and state its direction.",
            points: 2,
          },
        ],
        hints: [
          "Frequency is reciprocal of period.",
          "Angular speed is $2\\pi/T$.",
          "Linear speed is $\\omega r$ and acceleration is $v^2/r$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $0.5\\text{ Hz}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $\\pi\\text{ rad s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $0.8\\pi\\text{ m s}^{-1}$.",
            },
            {
              part: "d",
              points: 2,
              description:
                "Finds $0.8\\pi^2\\text{ m s}^{-2}$ toward the centre.",
            },
          ],
        },
        commonErrors: ["Giving tangential direction for acceleration."],
        workedSolution: [
          { part: "a", explanation: "$f=1/T=1/2=0.5\\text{ Hz}$." },
          {
            part: "b",
            explanation: "$\\omega=2\\pi/T=2\\pi/2=\\pi\\text{ rad s}^{-1}$.",
          },
          {
            part: "c",
            explanation: "$v=\\omega r=\\pi(0.8)=0.8\\pi\\text{ m s}^{-1}$.",
          },
          {
            part: "d",
            explanation:
              "$a_c=v^2/r=(0.8\\pi)^2/0.8=0.8\\pi^2\\text{ m s}^{-2}$, directed toward the centre.",
          },
        ],
      },
    ],
  },
];

export const kinematicsTopics: Topic[] = topicSeeds.map(makeTopic);
