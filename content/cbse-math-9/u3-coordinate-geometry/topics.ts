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

const COURSE = "cbse-math-9";
const UNIT = "u3-coordinate-geometry-ix";
const VERSION = "0.2.2";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;
const CHOICE_ROTATIONS: readonly (readonly number[])[] = [
  [0, 2, 0, 0, 0],
  [3, 3, 2, 3, 3],
  [3, 3, 3, 3, 3],
  [3, 3, 3, 3, 3],
  [3, 3, 3, 3, 3],
];

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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the coordinate order, sign, distance, midpoint, or graph reading used in the question.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_coordinate_geometry_reasoning"),
    };
  });

  const topicIndex = Number(meta.topicCode.split(".")[1]) - 1;
  const rotation =
    CHOICE_ROTATIONS[topicIndex]?.[index] ?? index % LETTERS.length;
  const rotatedChoices =
    rotation === 0
      ? unletteredChoices
      : [
          ...unletteredChoices.slice(-rotation),
          ...unletteredChoices.slice(0, -rotation),
        ];
  const choices = rotatedChoices.map((choice, choiceIndex) => ({
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
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "reads_coordinates_without_checking_axis_direction_or_order",
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
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_coordinate_answer_without_showing_axis_or_formula_reasoning",
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

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const quadrantGridFigure: ItemFigure = {
  type: "svg",
  title: "Coordinate plane with labelled points",
  description:
    "A Cartesian plane from -4 to 4 on both axes with labelled points A, B, C and D in the four quadrants.",
  svg: `<svg viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="420" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="80" y1="50" x2="80" y2="390"/><line x1="120" y1="50" x2="120" y2="390"/><line x1="160" y1="50" x2="160" y2="390"/><line x1="200" y1="50" x2="200" y2="390"/><line x1="240" y1="50" x2="240" y2="390"/><line x1="280" y1="50" x2="280" y2="390"/><line x1="320" y1="50" x2="320" y2="390"/><line x1="360" y1="50" x2="360" y2="390"/><line x1="400" y1="50" x2="400" y2="390"/>
    <line x1="70" y1="60" x2="410" y2="60"/><line x1="70" y1="100" x2="410" y2="100"/><line x1="70" y1="140" x2="410" y2="140"/><line x1="70" y1="180" x2="410" y2="180"/><line x1="70" y1="220" x2="410" y2="220"/><line x1="70" y1="260" x2="410" y2="260"/><line x1="70" y1="300" x2="410" y2="300"/><line x1="70" y1="340" x2="410" y2="340"/><line x1="70" y1="380" x2="410" y2="380"/>
  </g>
  <line x1="70" y1="220" x2="430" y2="220" stroke="#334155" stroke-width="2"/>
  <line x1="240" y1="395" x2="240" y2="35" stroke="#334155" stroke-width="2"/>
  <path d="M420 213 L430 220 L420 227" fill="none" stroke="#334155" stroke-width="2"/>
  <path d="M233 45 L240 35 L247 45" fill="none" stroke="#334155" stroke-width="2"/>
  <g fill="#2563eb" font-family="Arial, sans-serif">
    <circle cx="360" cy="140" r="6"/><text x="370" y="136" font-size="15">A(3,2)</text>
    <circle cx="160" cy="100" r="6"/><text x="85" y="96" font-size="15">B(-2,3)</text>
    <circle cx="120" cy="300" r="6"/><text x="60" y="326" font-size="15">C(-3,-2)</text>
    <circle cx="320" cy="340" r="6"/><text x="330" y="346" font-size="15">D(2,-3)</text>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="13">
    <text x="232" y="237">0</text><text x="435" y="225">x</text><text x="232" y="28">y</text>
    <text x="395" y="237">4</text><text x="44" y="237">-4</text><text x="220" y="64">4</text><text x="215" y="384">-4</text>
  </g>
</svg>`,
};

const floorPlanFigure: ItemFigure = {
  type: "svg",
  title: "School floor plan on a coordinate grid",
  description:
    "A first-quadrant grid showing four labelled locations: Gate G(1,1), Class C(2,4), Library L(5,1), and Park P(5,4).",
  svg: `<svg viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="420" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="340" x2="490" y2="340"/><line x1="90" y1="290" x2="490" y2="290"/><line x1="90" y1="240" x2="490" y2="240"/><line x1="90" y1="190" x2="490" y2="190"/><line x1="90" y1="140" x2="490" y2="140"/><line x1="90" y1="90" x2="490" y2="90"/>
    <line x1="100" y1="70" x2="100" y2="350"/><line x1="150" y1="70" x2="150" y2="350"/><line x1="200" y1="70" x2="200" y2="350"/><line x1="250" y1="70" x2="250" y2="350"/><line x1="300" y1="70" x2="300" y2="350"/><line x1="350" y1="70" x2="350" y2="350"/><line x1="400" y1="70" x2="400" y2="350"/><line x1="450" y1="70" x2="450" y2="350"/>
  </g>
  <line x1="95" y1="340" x2="500" y2="340" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="350" x2="100" y2="60" stroke="#334155" stroke-width="2"/>
  <path d="M490 333 L500 340 L490 347" fill="none" stroke="#334155" stroke-width="2"/>
  <path d="M93 70 L100 60 L107 70" fill="none" stroke="#334155" stroke-width="2"/>
  <g font-family="Arial, sans-serif" font-size="14" fill="#0f172a">
    <text x="96" y="362">0</text><text x="146" y="362">1</text><text x="196" y="362">2</text><text x="346" y="362">5</text>
    <text x="78" y="344">0</text><text x="78" y="294">1</text><text x="78" y="144">4</text>
    <text x="506" y="344">x</text><text x="91" y="52">y</text>
  </g>
  <g font-family="Arial, sans-serif">
    <circle cx="150" cy="290" r="7" fill="#2563eb"/><text x="160" y="294" font-size="15" fill="#1d4ed8">G(1,1)</text>
    <circle cx="200" cy="140" r="7" fill="#16a34a"/><text x="210" y="134" font-size="15" fill="#15803d">C(2,4)</text>
    <circle cx="350" cy="290" r="7" fill="#f97316"/><text x="360" y="294" font-size="15" fill="#c2410c">L(5,1)</text>
    <circle cx="350" cy="140" r="7" fill="#db2777"/><text x="360" y="134" font-size="15" fill="#be185d">P(5,4)</text>
  </g>
</svg>`,
};

const distanceSegmentFigure: ItemFigure = {
  type: "svg",
  title: "Distance between two plotted points",
  description:
    "A coordinate grid with points A(1,1) and B(5,4), joined by a segment and supported by a right-triangle guide.",
  svg: `<svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="400" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="330" x2="500" y2="330"/><line x1="90" y1="280" x2="500" y2="280"/><line x1="90" y1="230" x2="500" y2="230"/><line x1="90" y1="180" x2="500" y2="180"/><line x1="90" y1="130" x2="500" y2="130"/><line x1="90" y1="80" x2="500" y2="80"/>
    <line x1="100" y1="60" x2="100" y2="340"/><line x1="150" y1="60" x2="150" y2="340"/><line x1="200" y1="60" x2="200" y2="340"/><line x1="250" y1="60" x2="250" y2="340"/><line x1="300" y1="60" x2="300" y2="340"/><line x1="350" y1="60" x2="350" y2="340"/>
  </g>
  <line x1="100" y1="330" x2="510" y2="330" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="340" x2="100" y2="50" stroke="#334155" stroke-width="2"/>
  <line x1="150" y1="280" x2="350" y2="130" stroke="#2563eb" stroke-width="4"/>
  <line x1="150" y1="280" x2="350" y2="280" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <line x1="350" y1="280" x2="350" y2="130" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <circle cx="150" cy="280" r="6" fill="#1d4ed8"/><circle cx="350" cy="130" r="6" fill="#1d4ed8"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="14">
    <text x="120" y="272">A(1,1)</text><text x="360" y="126">B(5,4)</text>
    <text x="98" y="352">0</text><text x="146" y="352">1</text><text x="346" y="352">5</text>
    <text x="76" y="284">1</text><text x="76" y="134">4</text><text x="515" y="334">x</text><text x="90" y="43">y</text>
  </g>
</svg>`,
};

const midpointFigure: ItemFigure = {
  type: "svg",
  title: "Midpoint of a segment",
  description:
    "A grid showing A(2,2), B(8,6), and midpoint M(5,4) on the same segment.",
  svg: `<svg viewBox="0 0 560 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="390" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="80" y1="330" x2="500" y2="330"/><line x1="80" y1="290" x2="500" y2="290"/><line x1="80" y1="250" x2="500" y2="250"/><line x1="80" y1="210" x2="500" y2="210"/><line x1="80" y1="170" x2="500" y2="170"/><line x1="80" y1="130" x2="500" y2="130"/><line x1="80" y1="90" x2="500" y2="90"/>
    <line x1="100" y1="60" x2="100" y2="340"/><line x1="140" y1="60" x2="140" y2="340"/><line x1="180" y1="60" x2="180" y2="340"/><line x1="220" y1="60" x2="220" y2="340"/><line x1="260" y1="60" x2="260" y2="340"/><line x1="300" y1="60" x2="300" y2="340"/><line x1="340" y1="60" x2="340" y2="340"/><line x1="380" y1="60" x2="380" y2="340"/><line x1="420" y1="60" x2="420" y2="340"/>
  </g>
  <line x1="95" y1="330" x2="510" y2="330" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="340" x2="100" y2="50" stroke="#334155" stroke-width="2"/>
  <line x1="180" y1="250" x2="420" y2="90" stroke="#2563eb" stroke-width="4"/>
  <circle cx="180" cy="250" r="6" fill="#1d4ed8"/><circle cx="420" cy="90" r="6" fill="#1d4ed8"/><circle cx="300" cy="170" r="7" fill="#f97316"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="14">
    <text x="146" y="246">A(2,2)</text><text x="428" y="92">B(8,6)</text><text x="312" y="174" fill="#c2410c">M</text>
    <text x="96" y="352">0</text><text x="176" y="352">2</text><text x="296" y="352">5</text><text x="416" y="352">8</text>
    <text x="78" y="254">2</text><text x="78" y="174">4</text><text x="78" y="94">6</text>
    <text x="515" y="334">x</text><text x="90" y="43">y</text>
  </g>
</svg>`,
};

const rightTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Triangle on a coordinate grid",
  description: "A coordinate grid with triangle A(0,0), B(4,0), and C(4,3).",
  svg: `<svg viewBox="0 0 560 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="390" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="320" x2="500" y2="320"/><line x1="90" y1="270" x2="500" y2="270"/><line x1="90" y1="220" x2="500" y2="220"/><line x1="90" y1="170" x2="500" y2="170"/><line x1="90" y1="120" x2="500" y2="120"/>
    <line x1="100" y1="80" x2="100" y2="330"/><line x1="150" y1="80" x2="150" y2="330"/><line x1="200" y1="80" x2="200" y2="330"/><line x1="250" y1="80" x2="250" y2="330"/><line x1="300" y1="80" x2="300" y2="330"/>
  </g>
  <line x1="95" y1="320" x2="510" y2="320" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="330" x2="100" y2="70" stroke="#334155" stroke-width="2"/>
  <polygon points="100,320 300,320 300,170" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <circle cx="100" cy="320" r="6" fill="#1d4ed8"/><circle cx="300" cy="320" r="6" fill="#1d4ed8"/><circle cx="300" cy="170" r="6" fill="#1d4ed8"/>
  <path d="M282 320 L282 302 L300 302" fill="none" stroke="#f97316" stroke-width="3"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="14">
    <text x="108" y="315">A(0,0)</text><text x="310" y="318">B(4,0)</text><text x="310" y="170">C(4,3)</text>
    <text x="96" y="342">0</text><text x="296" y="342">4</text><text x="78" y="174">3</text>
    <text x="515" y="324">x</text><text x="90" y="63">y</text>
  </g>
</svg>`,
};

const walkingPathTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Walking path on a coordinate grid",
  description: "A coordinate grid with triangle A(0,0), B(8,0), and C(8,6).",
  svg: `<svg viewBox="0 0 600 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="600" height="430" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="350" x2="530" y2="350"/><line x1="90" y1="310" x2="530" y2="310"/><line x1="90" y1="270" x2="530" y2="270"/><line x1="90" y1="230" x2="530" y2="230"/><line x1="90" y1="190" x2="530" y2="190"/><line x1="90" y1="150" x2="530" y2="150"/><line x1="90" y1="110" x2="530" y2="110"/>
    <line x1="100" y1="80" x2="100" y2="360"/><line x1="150" y1="80" x2="150" y2="360"/><line x1="200" y1="80" x2="200" y2="360"/><line x1="250" y1="80" x2="250" y2="360"/><line x1="300" y1="80" x2="300" y2="360"/><line x1="350" y1="80" x2="350" y2="360"/><line x1="400" y1="80" x2="400" y2="360"/><line x1="450" y1="80" x2="450" y2="360"/><line x1="500" y1="80" x2="500" y2="360"/>
  </g>
  <line x1="95" y1="350" x2="540" y2="350" stroke="#334155" stroke-width="2"/>
  <line x1="100" y1="365" x2="100" y2="70" stroke="#334155" stroke-width="2"/>
  <path d="M530 343 L540 350 L530 357" fill="none" stroke="#334155" stroke-width="2"/>
  <path d="M93 80 L100 70 L107 80" fill="none" stroke="#334155" stroke-width="2"/>
  <polygon points="100,350 500,350 500,110" fill="#ecfeff" stroke="#0891b2" stroke-width="4"/>
  <line x1="100" y1="350" x2="500" y2="110" stroke="#2563eb" stroke-width="4"/>
  <path d="M478 350 L478 328 L500 328" fill="none" stroke="#f97316" stroke-width="3"/>
  <circle cx="100" cy="350" r="6" fill="#0e7490"/><circle cx="500" cy="350" r="6" fill="#0e7490"/><circle cx="500" cy="110" r="6" fill="#0e7490"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="14">
    <text x="110" y="344">A(0,0)</text><text x="508" y="346">B(8,0)</text><text x="508" y="112">C(8,6)</text>
    <text x="94" y="374">0</text><text x="496" y="374">8</text><text x="78" y="114">6</text>
    <text x="546" y="354">x</text><text x="88" y="64">y</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Cartesian Plane Basics",
    subtopic:
      "Axes, origin, ordered pairs, signs of coordinates, quadrants, and points on the axes.",
    mc: [
      {
        questionLatex: L`A point is $3$ units left of the $y$-axis and $2$ units above the $x$-axis. Its coordinates are`,
        difficulty: 2,
        skillTags: ["coordinate_movement", "coordinate_signs"],
        choices: [L`$(-3,2)$`, L`$(3,-2)$`, L`$(2,-3)$`, L`$(-2,3)$`],
        correctLetter: "A",
        rationales: {
          B: "This reverses the signs: right would be positive and below would be negative.",
          C: "This reverses the coordinate order and signs.",
          D: "This reverses the horizontal and vertical distances.",
        },
        hints: [
          "Left of the $y$-axis means negative $x$.",
          "Above the $x$-axis means positive $y$.",
          "Write the horizontal coordinate first.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The horizontal displacement is $-3$ and the vertical displacement is $2$.",
            math: "(-3,2)",
          },
        ],
      },
      {
        questionLatex: L`The mirror image of $(3,-2)$ in the $y$-axis lies in`,
        difficulty: 2,
        skillTags: ["quadrants", "coordinate_signs", "reflection_in_axis"],
        choices: ["Quadrant I", "Quadrant IV", "Quadrant II", "Quadrant III"],
        correctLetter: "D",
        rationales: {
          A: "Reflection in the $y$-axis changes the sign of $x$, so both coordinates do not become positive.",
          B: "That is the original point's quadrant, before reflection.",
          C: "The reflected point has negative $x$ and negative $y$, not positive $y$.",
        },
        hints: [
          "Reflection in the $y$-axis changes only the $x$-coordinate.",
          "$(3,-2)$ becomes $(-3,-2)$.",
          "Both coordinates negative means Quadrant III.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The reflected point is $(-3,-2)$, which lies in Quadrant III.",
          },
        ],
      },
      {
        questionLatex: L`Point $A$ lies on the $x$-axis and is $5$ units to the left of the origin. Then $A$ is`,
        difficulty: 2,
        skillTags: ["axis_points", "coordinate_movement"],
        choices: [L`$(0,-5)$`, L`$(5,0)$`, L`$(-5,0)$`, L`$(0,5)$`],
        correctLetter: "C",
        rationales: {
          A: "This is below the origin on the $y$-axis, not left on the $x$-axis.",
          B: "This is to the right of the origin.",
          D: "This is above the origin on the $y$-axis.",
        },
        hints: [
          "On the $x$-axis, the $y$-coordinate is $0$.",
          "Left of the origin means a negative $x$-coordinate.",
          "The distance from the origin is $5$ units.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A point $5$ units left on the $x$-axis has coordinates $(-5,0)$.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, point $B$ is in`,
        difficulty: 2,
        figure: quadrantGridFigure,
        skillTags: ["read_quadrant_from_graph"],
        choices: ["Quadrant I", "Quadrant III", "Quadrant IV", "Quadrant II"],
        correctLetter: "D",
        rationales: {
          A: "Quadrant I is to the right and above the origin.",
          B: "Quadrant III is left and below the origin.",
          C: "Quadrant IV is right and below the origin.",
        },
        hints: [
          "Locate point $B$ relative to the origin.",
          "It is left of the $y$-axis and above the $x$-axis.",
          "That means negative $x$ and positive $y$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Point $B$ has coordinates $(-2,3)$, so it lies in Quadrant II.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: Every point on the $y$-axis has $x$-coordinate $0$. Reason: The $y$-axis is the vertical line passing through the origin.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "axis_points"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason explains why there is no left-right displacement on the $y$-axis.",
          C: "The reason is true: the $y$-axis is vertical through the origin.",
          D: "The assertion is true for every point on the $y$-axis.",
        },
        hints: [
          "Think about movement along the $y$-axis.",
          "There is vertical movement but no horizontal movement.",
          "No horizontal movement means $x=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "All points on the $y$-axis have zero horizontal displacement.",
            math: "x=0",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Point $P(-4,5)$ is reflected in the $x$-axis. State the coordinates of its image and the quadrant of the image.`,
        difficulty: 2,
        skillTags: ["quadrants", "coordinate_signs", "reflection_in_axis"],
        parts: singlePart("a", "Give the image and its quadrant.", 2),
        hints: [
          "Reflection in the $x$-axis changes only the $y$-coordinate.",
          "$(-4,5)$ becomes $(-4,-5)$.",
          "Both coordinates negative means Quadrant III.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Writes the image as $(-4,-5)$ and states Quadrant III.",
        ),
        commonErrors: [
          "Changing the $x$-coordinate instead of the $y$-coordinate.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Reflection in the $x$-axis keeps $x$ the same and changes the sign of $y$, so the image is $(-4,-5)$ in Quadrant III.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`The word Cartesian in Cartesian coordinate system is associated with which mathematician?`,
        difficulty: 1,
        skillTags: ["coordinate_geometry_history", "cartesian_plane"],
        parts: singlePart("a", "Name the mathematician.", 1),
        hints: [
          "Think of the word Cartesian.",
          "It comes from the Latin form of Descartes.",
          "The mathematician is Rene Descartes.",
        ],
        rubric: singleRubric("a", 1, "Names Rene Descartes."),
        commonErrors: [
          "Naming Euclid, who is associated with classical geometry but not the Cartesian coordinate system.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Cartesian coordinates are associated with Rene Descartes.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Classify the points $P(2,3)$, $Q(-1,-4)$, and $R(0,5)$ as quadrant points or axis points.`,
        difficulty: 2,
        skillTags: ["quadrants", "axis_points"],
        parts: singlePart("a", "Classify all three points.", 3),
        hints: [
          "Use signs for quadrant points.",
          "A zero coordinate may place a point on an axis.",
          "Check one point at a time.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Classifies $P$ as Quadrant I.",
            },
            {
              part: "a",
              points: 1,
              description: "Classifies $Q$ as Quadrant III.",
            },
            {
              part: "a",
              points: 1,
              description: "Classifies $R$ as a point on the $y$-axis.",
            },
          ],
        },
        commonErrors: ["Calling points on axes as quadrant points."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$P(2,3)$ is in Quadrant I, $Q(-1,-4)$ is in Quadrant III, and $R(0,5)$ is on the $y$-axis.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Starting from the origin, a point is moved $3$ units left and $2$ units up. Write its coordinates and quadrant.`,
        difficulty: 2,
        skillTags: ["coordinate_movement", "quadrants"],
        parts: [
          { letter: "a", promptMarkdown: "Write the coordinates.", points: 1 },
          { letter: "b", promptMarkdown: "State the quadrant.", points: 1 },
        ],
        hints: [
          "Left means negative $x$.",
          "Up means positive $y$.",
          "Use the sign pattern to name the quadrant.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Writes $(-3,2)$." },
            { part: "b", points: 1, description: "States Quadrant II." },
          ],
        },
        commonErrors: ["Writing $(3,-2)$ by reversing directions."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Moving left $3$ units gives $x=-3$, and moving up $2$ units gives $y=2$, so the coordinates are $(-3,2)$.",
          },
          {
            part: "b",
            explanation: "Negative $x$ and positive $y$ means Quadrant II.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher marks four points on a coordinate plane: $A(3,2)$, $B(-2,3)$, $C(-3,-2)$, and $D(2,-3)$.`,
        difficulty: 3,
        figure: quadrantGridFigure,
        skillTags: ["coordinate_plane_context", "quadrants"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which point is in Quadrant I?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which point has both coordinates negative?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Which point has positive $x$ and negative $y$?",
            points: 1,
          },
        ],
        hints: [
          "Quadrant I has positive $x$ and positive $y$.",
          "Both negative means Quadrant III.",
          "Positive $x$ and negative $y$ means Quadrant IV.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies $A$." },
            { part: "b", points: 1, description: "Identifies $C$." },
            { part: "c", points: 1, description: "Identifies $D$." },
          ],
        },
        commonErrors: [
          "Reading the second coordinate first.",
          "Mixing up Quadrants II and IV.",
        ],
        workedSolution: [
          { part: "a", explanation: "$A(3,2)$ is in Quadrant I." },
          {
            part: "b",
            explanation: "$C(-3,-2)$ has both coordinates negative.",
          },
          {
            part: "c",
            explanation: "$D(2,-3)$ has positive $x$ and negative $y$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Plotting Locations and Floor Plans",
    subtopic:
      "Using coordinates to specify locations, compare positions, and model floor plans on a grid.",
    mc: [
      {
        questionLatex: L`In the floor-plan figure, a student walks from Library $L$ to Park $P$ without changing the $x$-coordinate. Which statement is correct?`,
        difficulty: 2,
        figure: floorPlanFigure,
        skillTags: ["read_coordinates_from_grid", "same_x_coordinate"],
        choices: [
          "$L$ and $P$ both have $x=5$",
          "$L$ and $P$ both have $y=5$",
          "$L$ is $(1,5)$ and $P$ is $(4,5)$",
          "The walk from $L$ to $P$ is horizontal",
        ],
        correctLetter: "A",
        rationales: {
          B: "They share the first coordinate, not the second coordinate.",
          C: "This reverses the coordinate order.",
          D: "Same $x$-coordinate gives a vertical movement, not a horizontal one.",
        },
        hints: [
          "Read $L$ and $P$ as ordered pairs.",
          "$L=(5,1)$ and $P=(5,4)$.",
          "The first coordinate is the same.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$L=(5,1)$ and $P=(5,4)$, so both points have $x=5$ and are vertically aligned.",
          },
        ],
      },
      {
        questionLatex: L`Which two locations in the floor plan have the same $x$-coordinate?`,
        difficulty: 2,
        figure: floorPlanFigure,
        skillTags: ["same_x_coordinate", "vertical_alignment"],
        choices: [
          "Gate and Library",
          "Gate and Class",
          "Library and Park",
          "Class and Park",
        ],
        correctLetter: "C",
        rationales: {
          A: "Gate has $x=1$ and Library has $x=5$.",
          B: "Gate has $x=1$ and Class has $x=2$.",
          D: "Class has $x=2$ and Park has $x=5$.",
        },
        hints: [
          "Same $x$-coordinate means vertical alignment.",
          "Check the first coordinate of each point.",
          "Both Library and Park have $x=5$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Library is $(5,1)$ and Park is $(5,4)$, so both have $x=5$.",
          },
        ],
      },
      {
        questionLatex: L`A point moves from $(1,-2)$ by $4$ units right and $3$ units up. Its new coordinates are`,
        difficulty: 2,
        skillTags: ["coordinate_movement"],
        choices: [L`$(5,1)$`, L`$(-3,1)$`, L`$(5,-5)$`, L`$(4,3)$`],
        correctLetter: "A",
        rationales: {
          B: "Moving right increases the $x$-coordinate, not decreases it.",
          C: "Moving up increases the $y$-coordinate, not decreases it.",
          D: "This uses only the movement and ignores the starting point.",
        },
        hints: [
          "Add $4$ to the $x$-coordinate.",
          "Add $3$ to the $y$-coordinate.",
          "Start from $(1,-2)$, not from the origin.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The new point is $(1+4,-2+3)=(5,1)$.",
          },
        ],
      },
      {
        questionLatex: L`From $G(1,1)$ to $P(5,4)$ in the floor plan, the horizontal change and vertical change are respectively`,
        difficulty: 2,
        figure: floorPlanFigure,
        skillTags: ["coordinate_change", "floor_plan"],
        choices: [
          L`$4$ right, $3$ up`,
          L`$3$ right, $4$ up`,
          L`$4$ left, $3$ up`,
          L`$5$ right, $4$ up`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This swaps the changes in $x$ and $y$.",
          C: "The $x$-coordinate increases from $1$ to $5$, so the movement is right.",
          D: "This uses the final coordinates instead of the change.",
        },
        hints: [
          "Subtract starting coordinates from final coordinates.",
          "$5-1=4$ horizontally.",
          "$4-1=3$ vertically.",
        ],
        solution: [
          { step: 1, explanation: "The change is", math: "(5-1,\\ 4-1)=(4,3)" },
        ],
      },
      {
        questionLatex: L`Assertion: If two points have the same $y$-coordinate, the segment joining them is horizontal. Reason: Their vertical levels are the same.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "same_y_coordinate"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason directly explains why no vertical change occurs.",
          C: "The reason is true: equal $y$-coordinates mean equal vertical level.",
          D: "The assertion is true for points with the same $y$-coordinate.",
        },
        hints: [
          "Same $y$ means same height on the grid.",
          "A horizontal segment has no vertical change.",
          "Check whether the reason explains the assertion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If $y_1=y_2$, there is no vertical change, so the segment is horizontal.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In the floor plan, write the coordinates of the Class $C$ and explain why it is horizontally aligned with Park $P$.`,
        difficulty: 2,
        figure: floorPlanFigure,
        skillTags: ["read_coordinates_from_grid", "same_y_coordinate"],
        parts: singlePart("a", "Give the ordered pair and reason.", 2),
        hints: [
          "Read $x$ first.",
          "Then read $y$.",
          "Class and Park have the same $y$-coordinate.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Writes $(2,4)$ and explains that $C$ and $P$ both have $y=4$.",
        ),
        commonErrors: ["Writing $(4,2)$ by reversing the coordinate order."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The Class point is $(2,4)$. Park is $(5,4)$, so both points have $y=4$ and are horizontally aligned.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Which location is directly above the Library $L(5,1)$ in the floor plan?`,
        difficulty: 2,
        figure: floorPlanFigure,
        skillTags: ["same_x_coordinate", "floor_plan"],
        parts: singlePart("a", "Name the location.", 1),
        hints: [
          "Directly above means same $x$-coordinate.",
          "Library has $x=5$.",
          "Look for the other point with $x=5$.",
        ],
        rubric: singleRubric("a", 1, "Identifies Park $P$."),
        commonErrors: [
          "Choosing a point with the same $y$-coordinate instead.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Park $P(5,4)$ has the same $x$-coordinate as Library $L(5,1)$, so it is directly above it.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A point moves from $(2,1)$ to $(6,5)$. Describe the horizontal and vertical changes.`,
        difficulty: 2,
        skillTags: ["coordinate_change"],
        parts: singlePart("a", "Give the change in words.", 2),
        hints: [
          "Compare the $x$-coordinates.",
          "Compare the $y$-coordinates.",
          "Increasing $x$ means right; increasing $y$ means up.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "States $4$ units right." },
            { part: "a", points: 1, description: "States $4$ units up." },
          ],
        },
        commonErrors: [
          "Using final coordinates as movements without subtracting.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The $x$-change is $6-2=4$, so the point moves $4$ units right. The $y$-change is $5-1=4$, so it moves $4$ units up.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Three counters are placed at $A(1,2)$, $B(4,2)$, and $C(4,5)$. Which pair is horizontally aligned and which pair is vertically aligned?`,
        difficulty: 2,
        skillTags: ["same_x_coordinate", "same_y_coordinate"],
        parts: singlePart("a", "Name both pairs with reasons.", 2),
        hints: [
          "Horizontal alignment means same $y$.",
          "Vertical alignment means same $x$.",
          "Compare coordinates pairwise.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies $A$ and $B$ as horizontally aligned.",
            },
            {
              part: "a",
              points: 1,
              description: "Identifies $B$ and $C$ as vertically aligned.",
            },
          ],
        },
        commonErrors: ["Confusing same $x$ with horizontal alignment."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$A(1,2)$ and $B(4,2)$ have the same $y$-coordinate, so they are horizontally aligned. $B(4,2)$ and $C(4,5)$ have the same $x$-coordinate, so they are vertically aligned.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school map uses the grid shown. A student starts at Gate $G(1,1)$, visits Class $C(2,4)$, and then goes to Park $P(5,4)$.`,
        difficulty: 3,
        figure: floorPlanFigure,
        skillTags: ["floor_plan", "coordinate_change", "same_y_coordinate"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the movement from $G$ to $C$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the movement from $C$ to $P$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain why $C$ to $P$ is horizontal.",
            points: 1,
          },
        ],
        hints: [
          "Subtract starting coordinates from ending coordinates.",
          "Use right/left and up/down language.",
          "Horizontal movement has the same $y$-coordinate.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States $1$ right and $3$ up.",
            },
            {
              part: "b",
              points: 1,
              description: "States $3$ right and no vertical movement.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains that $C$ and $P$ both have $y=4$.",
            },
          ],
        },
        commonErrors: ["Using absolute coordinates instead of changes."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "From $G(1,1)$ to $C(2,4)$, the movement is $1$ right and $3$ up.",
          },
          {
            part: "b",
            explanation:
              "From $C(2,4)$ to $P(5,4)$, the movement is $3$ right and $0$ up.",
          },
          {
            part: "c",
            explanation:
              "Both points have $y=4$, so the segment from $C$ to $P$ is horizontal.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Distance Between Two Points",
    subtopic:
      "Horizontal and vertical distances, the distance formula, and distance in coordinate-grid contexts.",
    mc: [
      {
        questionLatex: L`On a map, $1$ coordinate unit represents $10\text{ m}$. The points $(2,3)$ and $(6,3)$ mark two stalls. The actual distance between the stalls is`,
        difficulty: 2,
        skillTags: ["horizontal_distance", "scale_on_grid"],
        choices: [
          L`$30\text{ m}$`,
          L`$80\text{ m}$`,
          L`$40\text{ m}$`,
          L`$90\text{ m}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses the common $y$-coordinate instead of the coordinate distance.",
          B: "This adds the $x$-coordinates instead of subtracting them.",
          D: "This mixes coordinates and scale incorrectly.",
        },
        hints: [
          "The $y$-coordinates are equal.",
          "Use the difference in $x$-coordinates.",
          "Convert $4$ coordinate units using $10\\text{ m}$ per unit.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a horizontal segment, distance is the difference in $x$-coordinates, then multiplied by the scale.",
            math: "(6-2)\\times10=40\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`The distance between $(1,2)$ and $(4,6)$ is`,
        difficulty: 2,
        skillTags: ["distance_formula"],
        choices: [L`$7$`, L`$\sqrt7$`, L`$25$`, L`$5$`],
        correctLetter: "D",
        rationales: {
          A: "This adds the changes $3$ and $4$ instead of using Pythagoras.",
          B: "This adds the changes before squaring.",
          C: "This is the square of the distance, not the distance.",
        },
        hints: [
          "Find the changes in $x$ and $y$.",
          "The changes are $3$ and $4$.",
          "Use a $3$-$4$-$5$ right triangle.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the distance formula.",
            math: "d=\\sqrt{(4-1)^2+(6-2)^2}=\\sqrt{3^2+4^2}=5",
          },
        ],
      },
      {
        questionLatex: L`Which expression gives the distance between $(x_1,y_1)$ and $(x_2,y_2)$?`,
        difficulty: 2,
        skillTags: ["distance_formula"],
        choices: [
          L`$\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$`,
          L`$(x_2-x_1)+(y_2-y_1)$`,
          L`$\sqrt{x_1^2+y_1^2}$`,
          L`$(x_1+x_2)(y_1+y_2)$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This adds directed changes and can even become negative.",
          C: "This measures distance from the origin to the first point only.",
          D: "This product has no distance meaning.",
        },
        hints: [
          "Distance comes from a right triangle.",
          "Square the horizontal and vertical changes.",
          "Then take the square root.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The horizontal and vertical changes are squared and added.",
            math: "d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}",
          },
        ],
      },
      {
        questionLatex: L`In the figure, the distance $AB$ is`,
        difficulty: 2,
        figure: distanceSegmentFigure,
        skillTags: ["distance_from_graph", "distance_formula"],
        choices: [L`$7$`, L`$5$`, L`$4$`, L`$3$`],
        correctLetter: "B",
        rationales: {
          A: "This adds the horizontal and vertical changes.",
          C: "This is only the horizontal change.",
          D: "This is only the vertical change.",
        },
        hints: [
          "Read $A(1,1)$ and $B(5,4)$.",
          "The changes are $4$ and $3$.",
          "Use Pythagoras.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The distance is",
            math: "AB=\\sqrt{(5-1)^2+(4-1)^2}=\\sqrt{16+9}=5",
          },
        ],
      },
      {
        questionLatex: L`Assertion: The distance between $(-2,1)$ and $(3,1)$ is $5$. Reason: The points have the same $y$-coordinate, so the distance is the difference of their $x$-coordinates.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "horizontal_distance"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason directly explains why the distance is horizontal.",
          B: "The reason is true for points with the same $y$-coordinate.",
          D: "The assertion is true because $3-(-2)=5$.",
        },
        hints: [
          "The points are on the same horizontal line.",
          "Subtract the $x$-coordinates.",
          "Be careful with subtracting a negative number.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The distance is horizontal.",
            math: "3-(-2)=5",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`On a vertical grid road, two gates are at $(0,0)$ and $(0,7)$. If each coordinate unit is $5\text{ m}$, find the road distance between the gates.`,
        difficulty: 2,
        skillTags: ["vertical_distance", "scale_on_grid"],
        parts: singlePart("a", "Give the actual distance.", 2),
        hints: [
          "The $x$-coordinates are the same.",
          "Use the difference in $y$-coordinates.",
          "Convert $7$ coordinate units using $5\\text{ m}$ per unit.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $7$ coordinate units and converts it to $35\\text{ m}$.",
        ),
        commonErrors: [
          "Adding coordinates instead of comparing vertical positions.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The points are vertically aligned, so the coordinate distance is $7-0=7$ units. At $5\\text{ m}$ per unit, the actual distance is $7\\times5=35\\text{ m}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Two points $(2,1)$ and $(2,-4)$ lie on the same vertical line. Find their distance and explain why it is not negative.`,
        difficulty: 2,
        skillTags: ["vertical_distance", "absolute_difference"],
        parts: singlePart("a", "Give the distance with a reason.", 2),
        hints: [
          "The $x$-coordinates match.",
          "Use the absolute difference of $y$-coordinates.",
          "Distance is never negative.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $5$ units and explains that distance is an absolute length.",
        ),
        commonErrors: ["Writing $-5$ as a distance."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The vertical distance is $|1-(-4)|=5$ units. A distance is an absolute length, so it is not written as negative.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the distance between $A(-1,2)$ and $B(2,6)$.`,
        difficulty: 2,
        skillTags: ["distance_formula"],
        parts: singlePart("a", "Show the distance-formula calculation.", 2),
        hints: [
          "Find the change in $x$.",
          "Find the change in $y$.",
          "Use $d=\\sqrt{(\\Delta x)^2+(\\Delta y)^2}$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Uses changes $3$ and $4$." },
            { part: "a", points: 1, description: "Finds distance $5$." },
          ],
        },
        commonErrors: ["Adding coordinate differences without squaring."],
        workedSolution: [
          {
            part: "a",
            explanation: "$AB=\\sqrt{(2-(-1))^2+(6-2)^2}=\\sqrt{3^2+4^2}=5$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two points on a map are $P(1,1)$ and $Q(7,9)$. Find the distance $PQ$.`,
        difficulty: 3,
        skillTags: ["distance_formula", "map_context"],
        parts: singlePart("a", "Find the distance in grid units.", 2),
        hints: [
          "Find the horizontal and vertical changes.",
          "They are $6$ and $8$.",
          "Use Pythagoras.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Sets up $\\sqrt{6^2+8^2}$." },
            { part: "a", points: 1, description: "Finds $10$ units." },
          ],
        },
        commonErrors: ["Reporting $14$ by adding $6$ and $8$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$PQ=\\sqrt{(7-1)^2+(9-1)^2}=\\sqrt{6^2+8^2}=10$ units.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A small garden grid has two water taps at $A(1,1)$ and $B(5,4)$, as shown.`,
        difficulty: 3,
        figure: distanceSegmentFigure,
        skillTags: ["distance_from_graph", "distance_formula", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the horizontal change from $A$ to $B$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the vertical change from $A$ to $B$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the straight-line distance $AB$.",
            points: 1,
          },
        ],
        hints: [
          "Read the two coordinates.",
          "Use differences in coordinates.",
          "Use Pythagoras for the straight-line distance.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds horizontal change $4$.",
            },
            { part: "b", points: 1, description: "Finds vertical change $3$." },
            { part: "c", points: 1, description: "Finds distance $5$." },
          ],
        },
        commonErrors: [
          "Using walking distance $4+3=7$ instead of straight-line distance.",
        ],
        workedSolution: [
          { part: "a", explanation: "Horizontal change is $5-1=4$ units." },
          { part: "b", explanation: "Vertical change is $4-1=3$ units." },
          {
            part: "c",
            explanation:
              "The straight-line distance is $\\sqrt{4^2+3^2}=5$ units.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Midpoint and Collinearity",
    subtopic:
      "Finding midpoints of line segments and checking whether points lie on one straight line.",
    mc: [
      {
        questionLatex: L`A circular park has a diameter with endpoints $(2,4)$ and $(6,8)$ on a map. The centre of the park is`,
        difficulty: 2,
        skillTags: ["midpoint_formula", "coordinate_application"],
        choices: [L`$(8,12)$`, L`$(2,2)$`, L`$(6,4)$`, L`$(4,6)$`],
        correctLetter: "D",
        rationales: {
          A: "This adds the coordinates but does not divide by 2.",
          B: "This subtracts the coordinates.",
          C: "This swaps the midpoint coordinates.",
        },
        hints: [
          "Average the $x$-coordinates.",
          "Average the $y$-coordinates.",
          "Use $((x_1+x_2)/2,(y_1+y_2)/2)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The centre is the midpoint of the diameter, so average each coordinate.",
            math: "\\left(\\frac{2+6}{2},\\frac{4+8}{2}\\right)=(4,6)",
          },
        ],
      },
      {
        questionLatex: L`In the figure, the midpoint $M$ of $AB$ is`,
        difficulty: 2,
        figure: midpointFigure,
        skillTags: ["midpoint_from_graph", "midpoint_formula"],
        choices: [L`$(5,4)$`, L`$(4,5)$`, L`$(6,4)$`, L`$(5,6)$`],
        correctLetter: "A",
        rationales: {
          B: "This reverses the coordinate order.",
          C: "This is not halfway between the $x$-coordinates.",
          D: "This uses the midpoint $x$ correctly but not the midpoint $y$.",
        },
        hints: [
          "Read $A(2,2)$ and $B(8,6)$.",
          "Average the $x$-coordinates.",
          "Average the $y$-coordinates.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The midpoint is",
            math: "M=\\left(\\frac{2+8}{2},\\frac{2+6}{2}\\right)=(5,4)",
          },
        ],
      },
      {
        questionLatex: L`Which three points are clearly collinear?`,
        difficulty: 2,
        skillTags: ["collinearity_same_y"],
        choices: [
          L`$(1,2),(2,4),(3,7)$`,
          L`$(-2,3),(0,3),(5,3)$`,
          L`$(0,0),(1,2),(2,5)$`,
          L`$(2,1),(2,4),(3,4)$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The change in $y$ is not constant for equal change in $x$.",
          C: "The first two changes do not keep the same slope.",
          D: "The first two points are vertical, but the third has a different $x$-coordinate.",
        },
        hints: [
          "A horizontal line has the same $y$-coordinate.",
          "Check the coordinates in each option.",
          "Look for the three points whose $y$-coordinate is $3$ each time.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The points $(-2,3),(0,3),(5,3)$ all have $y=3$, so they lie on the horizontal line $y=3$.",
          },
        ],
      },
      {
        questionLatex: L`The midpoint of $(-2,5)$ and $(4,1)$ is`,
        difficulty: 2,
        skillTags: ["midpoint_formula"],
        choices: [L`$(2,6)$`, L`$(-3,1)$`, L`$(1,3)$`, L`$(3,1)$`],
        correctLetter: "C",
        rationales: {
          A: "This adds coordinates without averaging correctly.",
          B: "This subtracts in the wrong direction.",
          D: "This swaps and misaverages the coordinates.",
        },
        hints: [
          "Average the $x$-coordinates.",
          "Average the $y$-coordinates.",
          "Be careful with the negative coordinate.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the midpoint formula.",
            math: "\\left(\\frac{-2+4}{2},\\frac{5+1}{2}\\right)=(1,3)",
          },
        ],
      },
      {
        questionLatex: L`Assertion: $A(1,2)$, $B(3,4)$, and $C(5,6)$ are collinear. Reason: Moving from $A$ to $B$ and from $B$ to $C$ changes $x$ by $2$ and $y$ by $2$ each time.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "collinearity_coordinate_change"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The repeated equal coordinate change is exactly why the points stay on the same straight line.",
          B: "The reason is true: both steps have change $(2,2)$.",
          C: "The assertion is true because the same direction is repeated.",
        },
        hints: [
          "Compare changes from $A$ to $B$.",
          "Compare changes from $B$ to $C$.",
          "Same direction repeated gives a straight line.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The change from $A$ to $B$ is $(2,2)$ and from $B$ to $C$ is also $(2,2)$, so the points are collinear.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A straight path has endpoints $(0,0)$ and $(6,4)$. A lamp is to be placed exactly halfway along the path. Find the lamp's coordinates.`,
        difficulty: 2,
        skillTags: ["midpoint_formula", "coordinate_application"],
        parts: singlePart("a", "Give the midpoint coordinates.", 2),
        hints: [
          "Average the $x$-coordinates.",
          "Average the $y$-coordinates.",
          "The midpoint is halfway between both coordinates.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Uses the midpoint formula and finds $(3,2)$.",
        ),
        commonErrors: ["Adding coordinates and not dividing by 2."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The midpoint is $\\left(\\frac{0+6}{2},\\frac{0+4}{2}\\right)=(3,2)$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Three exits in a corridor are marked $(-1,4)$, $(2,4)$, and $(7,4)$ on a grid map. Are they on one straight corridor? Give one coordinate reason.`,
        difficulty: 2,
        skillTags: ["collinearity_same_y", "coordinate_application"],
        parts: singlePart("a", "Answer yes or no with a reason.", 2),
        hints: [
          "Compare the $y$-coordinates.",
          "All three have the same $y$-coordinate.",
          "They lie on the horizontal line $y=4$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States yes and explains that all three points have $y=4$.",
        ),
        commonErrors: ["Looking only at the $x$-coordinates and saying no."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Yes. All three points have $y=4$, so they lie on the same horizontal line.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the midpoint of $A(3,-1)$ and $B(7,5)$.`,
        difficulty: 2,
        skillTags: ["midpoint_formula"],
        parts: singlePart("a", "Show the midpoint formula.", 2),
        hints: [
          "Average $3$ and $7$.",
          "Average $-1$ and $5$.",
          "Write the answer as an ordered pair.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly averages the $x$-coordinates.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Correctly averages the $y$-coordinates and writes $(5,2)$.",
            },
          ],
        },
        commonErrors: ["Forgetting that $-1+5=4$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$M=\\left(\\frac{3+7}{2},\\frac{-1+5}{2}\\right)=(5,2)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Check whether $A(0,1)$, $B(2,3)$, and $C(4,5)$ are collinear by comparing coordinate changes.`,
        difficulty: 2,
        skillTags: ["collinearity_coordinate_change"],
        parts: singlePart("a", "Give a short check.", 2),
        hints: [
          "Find the change from $A$ to $B$.",
          "Find the change from $B$ to $C$.",
          "Compare the two changes.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds both changes as $(2,2)$.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes that the points are collinear.",
            },
          ],
        },
        commonErrors: ["Checking only one pair of points."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "From $A$ to $B$, the change is $(2,2)$. From $B$ to $C$, the change is also $(2,2)$. Hence the three points are collinear.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A designer marks a segment from $A(2,2)$ to $B(8,6)$ on a grid, with point $M$ marked halfway on the segment.`,
        difficulty: 3,
        figure: midpointFigure,
        skillTags: ["midpoint_from_graph", "collinearity", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the coordinates of $M$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why $A$, $M$, and $B$ are collinear.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the horizontal and vertical changes from $A$ to $M$.",
            points: 1,
          },
        ],
        hints: [
          "Use the midpoint formula.",
          "A midpoint lies on the segment joining the endpoints.",
          "Compare coordinates from $A$ to $M$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $M=(5,4)$." },
            {
              part: "b",
              points: 1,
              description: "Explains that $M$ lies on segment $AB$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds changes $3$ right and $2$ up.",
            },
          ],
        },
        commonErrors: [
          "Finding the midpoint but not linking it to collinearity.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$M=\\left(\\frac{2+8}{2},\\frac{2+6}{2}\\right)=(5,4)$.",
          },
          {
            part: "b",
            explanation:
              "Since $M$ is the midpoint of segment $AB$, it lies on the same straight segment as $A$ and $B$.",
          },
          {
            part: "c",
            explanation:
              "From $A(2,2)$ to $M(5,4)$, the changes are $3$ right and $2$ up.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Coordinate Geometry Applications",
    subtopic:
      "Using distance and midpoint to check right triangles and solve simple coordinate-grid problems.",
    mc: [
      {
        questionLatex: L`In the triangle shown, which coordinate reason proves that the right angle is at $B$?`,
        difficulty: 2,
        figure: rightTriangleFigure,
        skillTags: ["right_triangle_from_grid"],
        choices: [
          "$AB$ is horizontal and $BC$ is vertical",
          "$AB$ and $AC$ have equal lengths",
          "$A$, $B$, and $C$ have the same $y$-coordinate",
          "$AC$ is vertical",
        ],
        correctLetter: "A",
        rationales: {
          B: "Equal lengths are not the reason for perpendicular sides here.",
          C: "Only $A$ and $B$ share the same $y$-coordinate.",
          D: "$AC$ is the slant side, not a vertical side.",
        },
        hints: [
          "Look for one horizontal side and one vertical side meeting.",
          "The horizontal and vertical sides meet at $B$.",
          "That angle is $90^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Side $AB$ is horizontal and side $BC$ is vertical, so they are perpendicular at $B$.",
          },
        ],
      },
      {
        questionLatex: L`For $A(0,0)$, $B(4,0)$, and $C(4,3)$, the lengths $AB$, $BC$, and $AC$ are respectively`,
        difficulty: 2,
        skillTags: ["right_triangle_distances"],
        choices: [L`$3,4,7$`, L`$4,3,5$`, L`$4,4,3$`, L`$5,3,4$`],
        correctLetter: "B",
        rationales: {
          A: "This adds the shorter sides for the third length instead of using distance.",
          C: "This misreads the vertical side.",
          D: "This puts the hypotenuse first, but $AB$ is the horizontal side of length 4.",
        },
        hints: [
          "Use horizontal and vertical distances first.",
          "$AB=4$ and $BC=3$.",
          "Then use the $3$-$4$-$5$ triangle.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The side lengths are",
            math: "AB=4,\\quad BC=3,\\quad AC=\\sqrt{4^2+3^2}=5",
          },
        ],
      },
      {
        questionLatex: L`Which set of points forms a right triangle?`,
        difficulty: 2,
        skillTags: ["right_triangle_from_coordinates"],
        choices: [
          L`$(0,0),(2,3),(5,4)$`,
          L`$(1,1),(2,3),(4,4)$`,
          L`$(0,0),(6,0),(6,8)$`,
          L`$(0,2),(3,5),(6,7)$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "No pair of sides is clearly horizontal and vertical at the same vertex.",
          B: "The coordinate changes do not make perpendicular grid sides.",
          D: "These points do not form a right angle from horizontal and vertical grid sides.",
        },
        hints: [
          "Look for one horizontal and one vertical side meeting at a point.",
          "Look for two points sharing $y=0$ and two points sharing $x=6$.",
          "Those sides meet at $(6,0)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For $(0,0),(6,0),(6,8)$, the side from $(0,0)$ to $(6,0)$ is horizontal and the side from $(6,0)$ to $(6,8)$ is vertical, so the triangle is right-angled.",
          },
        ],
      },
      {
        questionLatex: L`The midpoint of the hypotenuse joining $(0,0)$ and $(4,3)$ is`,
        difficulty: 2,
        skillTags: ["midpoint_formula", "right_triangle_context"],
        choices: [L`$(4,3)$`, L`$(2,3)$`, L`$(\frac32,2)$`, L`$(2,\frac32)$`],
        correctLetter: "D",
        rationales: {
          A: "This is one endpoint, not the midpoint.",
          B: "This averages only the $x$-coordinates correctly.",
          C: "This swaps the two midpoint coordinates.",
        },
        hints: [
          "Average the $x$-coordinates.",
          "Average the $y$-coordinates.",
          "The average of $0$ and $3$ is $3/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The midpoint is",
            math: "\\left(\\frac{0+4}{2},\\frac{0+3}{2}\\right)=\\left(2,\\frac32\\right)",
          },
        ],
      },
      {
        questionLatex: L`Assertion: The triangle with vertices $(0,0)$, $(4,0)$, and $(4,3)$ is right-angled. Reason: Two of its sides are along a horizontal and a vertical grid line meeting at $(4,0)$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "right_triangle_from_grid"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the right angle.",
          C: "The reason is true because horizontal and vertical grid lines are perpendicular.",
          D: "The assertion is true for the given triangle.",
        },
        hints: [
          "Identify the horizontal side.",
          "Identify the vertical side.",
          "Horizontal and vertical lines are perpendicular.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The horizontal side and vertical side meet at $(4,0)$, so the angle there is $90^\\circ$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`For $A(0,0)$, $B(4,0)$, and $C(4,3)$, find $AB$ and say why it is a horizontal distance.`,
        difficulty: 2,
        figure: rightTriangleFigure,
        skillTags: ["horizontal_distance", "right_triangle_from_grid"],
        parts: singlePart("a", "Give the length and reason.", 2),
        hints: [
          "$A$ and $B$ have the same $y$-coordinate.",
          "Use the difference in $x$-coordinates.",
          "$4-0=4$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $AB=4$ and explains that $A$ and $B$ have the same $y$-coordinate.",
        ),
        commonErrors: ["Using the slant side instead of the horizontal side."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$A$ and $B$ have the same $y$-coordinate, so $AB$ is horizontal and $AB=4-0=4$ units.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the distance from $(0,0)$ to $(4,3)$.`,
        difficulty: 2,
        skillTags: ["distance_formula", "right_triangle_context"],
        parts: singlePart("a", "Give the distance.", 1),
        hints: [
          "Use the distance formula.",
          "The coordinate changes are $4$ and $3$.",
          "Recognise the $3$-$4$-$5$ triangle.",
        ],
        rubric: singleRubric("a", 1, "Finds $5$."),
        commonErrors: ["Adding $4+3$ and writing $7$."],
        workedSolution: [
          { part: "a", explanation: "Distance $=\\sqrt{4^2+3^2}=5$ units." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Show that $A(1,1)$, $B(5,1)$, and $C(5,4)$ form a right-angled triangle.`,
        difficulty: 2,
        skillTags: ["right_triangle_from_coordinates"],
        parts: singlePart("a", "Give a coordinate-grid reason.", 2),
        hints: [
          "Compare $A$ and $B$.",
          "Compare $B$ and $C$.",
          "A horizontal side and vertical side meet at $B$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies $AB$ as horizontal and $BC$ as vertical.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes the triangle is right-angled at $B$.",
            },
          ],
        },
        commonErrors: [
          "Finding side lengths but not identifying the right angle.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$A(1,1)$ and $B(5,1)$ have the same $y$-coordinate, so $AB$ is horizontal. $B(5,1)$ and $C(5,4)$ have the same $x$-coordinate, so $BC$ is vertical. Therefore the triangle is right-angled at $B$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A rectangle on a grid has opposite corners $(1,2)$ and $(7,6)$. Find the midpoint of its diagonal.`,
        difficulty: 2,
        skillTags: ["midpoint_formula", "grid_context"],
        parts: singlePart("a", "Find the midpoint.", 2),
        hints: [
          "The midpoint of a diagonal is found by averaging coordinates.",
          "Average $1$ and $7$.",
          "Average $2$ and $6$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly averages the $x$-coordinates.",
            },
            { part: "a", points: 1, description: "Finds midpoint $(4,4)$." },
          ],
        },
        commonErrors: ["Using distance formula instead of midpoint formula."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The midpoint is $\\left(\\frac{1+7}{2},\\frac{2+6}{2}\\right)=(4,4)$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A triangular walking path on a grid has vertices $A(0,0)$, $B(8,0)$, and $C(8,6)$. A bench is to be placed at the midpoint of the direct path from $A$ to $C$.`,
        difficulty: 4,
        figure: walkingPathTriangleFigure,
        skillTags: [
          "right_triangle_from_grid",
          "distance_formula",
          "midpoint_formula",
          "case_based",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $AB$, $BC$, and $AC$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why the angle at $B$ is a right angle.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the coordinates of the bench.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "How much longer is the route $A\\to B\\to C$ than the direct route $A\\to C$?",
            points: 1,
          },
        ],
        hints: [
          "Use horizontal and vertical distances first.",
          "Use Pythagoras for the direct route.",
          "The bench is at the midpoint of $AC$, and then compare $AB+BC$ with $AC$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $AB=8$, $BC=6$, and $AC=10$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Explains that $AB$ is horizontal and $BC$ is vertical.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds midpoint $(4,3)$.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds the extra distance as $4$ units.",
            },
          ],
        },
        commonErrors: [
          "Calling $AC$ equal to $14$ by adding the two legs.",
          "Finding the midpoint of $AB$ or $BC$ instead of $AC$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$AB=8$ units and $BC=6$ units. The direct distance is $AC=\\sqrt{8^2+6^2}=10$ units.",
          },
          {
            part: "b",
            explanation:
              "$AB$ is horizontal and $BC$ is vertical, so they are perpendicular at $B$.",
          },
          {
            part: "c",
            explanation:
              "The midpoint of $A(0,0)$ and $C(8,6)$ is $\\left(\\frac{0+8}{2},\\frac{0+6}{2}\\right)=(4,3)$.",
          },
          {
            part: "d",
            explanation:
              "The route $A\\to B\\to C$ is $8+6=14$ units, so it is $14-10=4$ units longer than the direct route.",
          },
        ],
      },
    ],
  },
];

export const coordinateGeometryIxTopics: Topic[] = topicSeeds.map(makeTopic);
