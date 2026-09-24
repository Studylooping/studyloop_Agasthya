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

const COURSE = "cbse-math-10";
const UNIT = "u3-coordinate-geometry";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type SolutionSeed = Omit<SolutionStep, "step"> &
  Partial<Pick<SolutionStep, "step">>;

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
  solution: readonly SolutionSeed[];
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
  return `You chose ${choiceText}. Match each coordinate to the correct distance or section formula before simplifying.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class10_coordinate_geometry_reasoning"),
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
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_coordinate_formula_without_tracking_signs_or_order",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      step: step.step ?? stepIndex + 1,
      explanation: step.explanation,
      ...(step.math ? { math: step.math } : {}),
    })),
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
      "states_the_coordinate_answer_without_showing_formula_substitution",
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

const twoPointGridFigure: ItemFigure = {
  type: "svg",
  title: "Two plotted points",
  description:
    "A coordinate grid showing points A(1,2) and B(5,5) for applying the distance formula.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="100" y1="300" x2="460" y2="300"/>
    <line x1="100" y1="260" x2="460" y2="260"/>
    <line x1="100" y1="220" x2="460" y2="220"/>
    <line x1="100" y1="180" x2="460" y2="180"/>
    <line x1="100" y1="140" x2="460" y2="140"/>
    <line x1="100" y1="100" x2="460" y2="100"/>
    <line x1="100" y1="60" x2="460" y2="60"/>
    <line x1="120" y1="40" x2="120" y2="310"/>
    <line x1="160" y1="40" x2="160" y2="310"/>
    <line x1="200" y1="40" x2="200" y2="310"/>
    <line x1="240" y1="40" x2="240" y2="310"/>
    <line x1="280" y1="40" x2="280" y2="310"/>
    <line x1="320" y1="40" x2="320" y2="310"/>
    <line x1="360" y1="40" x2="360" y2="310"/>
    <line x1="400" y1="40" x2="400" y2="310"/>
    <line x1="440" y1="40" x2="440" y2="310"/>
  </g>
  <line x1="85" y1="300" x2="480" y2="300" stroke="#334155" stroke-width="2"/>
  <path d="M468 293 L480 300 L468 307" fill="none" stroke="#334155" stroke-width="2"/>
  <line x1="120" y1="320" x2="120" y2="40" stroke="#334155" stroke-width="2"/>
  <path d="M113 52 L120 40 L127 52" fill="none" stroke="#334155" stroke-width="2"/>
  <polyline points="160,220 320,100" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  <circle cx="160" cy="220" r="7" fill="#dc2626"/>
  <circle cx="320" cy="100" r="7" fill="#dc2626"/>
  <text x="137" y="211" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">A(1,2)</text>
  <text x="328" y="94" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">B(5,5)</text>
  <text x="486" y="305" font-family="Arial, sans-serif" font-size="15" fill="#334155">x</text>
  <text x="128" y="52" font-family="Arial, sans-serif" font-size="15" fill="#334155">y</text>
</svg>`,
};

const rectangleGridFigure: ItemFigure = {
  type: "svg",
  title: "Four vertices on a grid",
  description:
    "A coordinate grid showing A(0,0), B(4,0), C(4,3), and D(0,3) for identifying a quadrilateral.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="110" y1="290" x2="460" y2="290"/>
    <line x1="110" y1="250" x2="460" y2="250"/>
    <line x1="110" y1="210" x2="460" y2="210"/>
    <line x1="110" y1="170" x2="460" y2="170"/>
    <line x1="110" y1="130" x2="460" y2="130"/>
    <line x1="110" y1="90" x2="460" y2="90"/>
    <line x1="120" y1="70" x2="120" y2="305"/>
    <line x1="160" y1="70" x2="160" y2="305"/>
    <line x1="200" y1="70" x2="200" y2="305"/>
    <line x1="240" y1="70" x2="240" y2="305"/>
    <line x1="280" y1="70" x2="280" y2="305"/>
    <line x1="320" y1="70" x2="320" y2="305"/>
  </g>
  <line x1="98" y1="290" x2="470" y2="290" stroke="#334155" stroke-width="2"/>
  <line x1="120" y1="306" x2="120" y2="70" stroke="#334155" stroke-width="2"/>
  <polygon points="120,290 280,290 280,170 120,170" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <circle cx="120" cy="290" r="6" fill="#dc2626"/>
  <circle cx="280" cy="290" r="6" fill="#dc2626"/>
  <circle cx="280" cy="170" r="6" fill="#dc2626"/>
  <circle cx="120" cy="170" r="6" fill="#dc2626"/>
  <text x="92" y="316" font-family="Arial, sans-serif" font-size="15" fill="#0f172a">A(0,0)</text>
  <text x="286" y="316" font-family="Arial, sans-serif" font-size="15" fill="#0f172a">B(4,0)</text>
  <text x="286" y="164" font-family="Arial, sans-serif" font-size="15" fill="#0f172a">C(4,3)</text>
  <text x="58" y="164" font-family="Arial, sans-serif" font-size="15" fill="#0f172a">D(0,3)</text>
</svg>`,
};

const sectionSegmentFigure: ItemFigure = {
  type: "svg",
  title: "Internal division of a line segment",
  description:
    "A line segment from A(2,-3) to B(10,5) with point P dividing it internally in the ratio 3:1.",
  svg: `<svg viewBox="0 0 620 280" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="280" fill="#ffffff"/>
  <line x1="90" y1="200" x2="540" y2="70" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/>
  <circle cx="90" cy="200" r="8" fill="#dc2626"/>
  <circle cx="540" cy="70" r="8" fill="#dc2626"/>
  <circle cx="427.5" cy="102.5" r="8" fill="#16a34a"/>
  <text x="58" y="226" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#991b1b">A(2,-3)</text>
  <text x="496" y="56" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#991b1b">B(10,5)</text>
  <text x="438" y="128" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#166534">P</text>
  <text x="230" y="174" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#475569">3 parts</text>
  <text x="492" y="106" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#475569">1 part</text>
</svg>`,
};

const medianTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Triangle with a median",
  description:
    "A coordinate triangle with B(-4,-2), C(8,-2), A(2,4), and a marked midpoint of BC.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="280" x2="520" y2="280"/>
    <line x1="90" y1="255" x2="520" y2="255"/>
    <line x1="90" y1="230" x2="520" y2="230"/>
    <line x1="90" y1="205" x2="520" y2="205"/>
    <line x1="90" y1="180" x2="520" y2="180"/>
    <line x1="90" y1="155" x2="520" y2="155"/>
    <line x1="90" y1="130" x2="520" y2="130"/>
    <line x1="90" y1="105" x2="520" y2="105"/>
    <line x1="100" y1="80" x2="100" y2="300"/>
    <line x1="125" y1="80" x2="125" y2="300"/>
    <line x1="150" y1="80" x2="150" y2="300"/>
    <line x1="175" y1="80" x2="175" y2="300"/>
    <line x1="200" y1="80" x2="200" y2="300"/>
    <line x1="225" y1="80" x2="225" y2="300"/>
    <line x1="250" y1="80" x2="250" y2="300"/>
    <line x1="275" y1="80" x2="275" y2="300"/>
    <line x1="300" y1="80" x2="300" y2="300"/>
    <line x1="325" y1="80" x2="325" y2="300"/>
    <line x1="350" y1="80" x2="350" y2="300"/>
    <line x1="375" y1="80" x2="375" y2="300"/>
    <line x1="400" y1="80" x2="400" y2="300"/>
    <line x1="425" y1="80" x2="425" y2="300"/>
    <line x1="450" y1="80" x2="450" y2="300"/>
    <line x1="475" y1="80" x2="475" y2="300"/>
  </g>
  <polygon points="300,130 150,280 450,280" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <line x1="300" y1="130" x2="300" y2="280" stroke="#16a34a" stroke-width="4"/>
  <circle cx="300" cy="130" r="7" fill="#dc2626"/>
  <circle cx="150" cy="280" r="7" fill="#dc2626"/>
  <circle cx="450" cy="280" r="7" fill="#dc2626"/>
  <circle cx="300" cy="280" r="7" fill="#16a34a"/>
  <text x="308" y="124" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">A(2,4)</text>
  <text x="86" y="274" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">B(-4,-2)</text>
  <text x="458" y="274" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">C(8,-2)</text>
  <text x="308" y="306" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#166534">M</text>
</svg>`,
};

const squareGridFigure: ItemFigure = {
  type: "svg",
  title: "Tilted quadrilateral on the coordinate plane",
  description:
    "A coordinate plane shows A(1,1), B(4,5), C(8,2), and D(5,-2) joined in order.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="80" y1="40" x2="550" y2="40"/>
    <line x1="80" y1="320" x2="550" y2="320"/>
    <line x1="80" y1="280" x2="550" y2="280"/>
    <line x1="80" y1="240" x2="550" y2="240"/>
    <line x1="80" y1="200" x2="550" y2="200"/>
    <line x1="80" y1="160" x2="550" y2="160"/>
    <line x1="80" y1="120" x2="550" y2="120"/>
    <line x1="80" y1="80" x2="550" y2="80"/>
    <line x1="120" y1="40" x2="120" y2="335"/>
    <line x1="160" y1="40" x2="160" y2="335"/>
    <line x1="200" y1="40" x2="200" y2="335"/>
    <line x1="240" y1="40" x2="240" y2="335"/>
    <line x1="280" y1="40" x2="280" y2="335"/>
    <line x1="320" y1="40" x2="320" y2="335"/>
    <line x1="360" y1="40" x2="360" y2="335"/>
    <line x1="400" y1="40" x2="400" y2="335"/>
    <line x1="440" y1="40" x2="440" y2="335"/>
    <line x1="480" y1="40" x2="480" y2="335"/>
  </g>
  <polygon points="160,200 280,40 440,160 320,320" fill="#f0fdf4" stroke="#16a34a" stroke-width="4"/>
  <line x1="160" y1="200" x2="440" y2="160" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
  <line x1="280" y1="40" x2="320" y2="320" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
  <circle cx="160" cy="200" r="7" fill="#dc2626"/>
  <circle cx="280" cy="40" r="7" fill="#dc2626"/>
  <circle cx="440" cy="160" r="7" fill="#dc2626"/>
  <circle cx="320" cy="320" r="7" fill="#dc2626"/>
  <text x="112" y="196" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">A(1,1)</text>
  <text x="288" y="58" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">B(4,5)</text>
  <text x="448" y="156" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">C(8,2)</text>
  <text x="328" y="322" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#991b1b">D(5,-2)</text>
</svg>`,
};

const routeMapFigure: ItemFigure = {
  type: "svg",
  title: "Points on a route map",
  description:
    "A straight route from A(-6,2) to B(6,8) with a midpoint T and another internal point P to be found.",
  svg: `<svg viewBox="0 0 620 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="330" fill="#ffffff"/>
  <line x1="100" y1="230" x2="520" y2="80" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/>
  <circle cx="100" cy="230" r="8" fill="#dc2626"/>
  <circle cx="520" cy="80" r="8" fill="#dc2626"/>
  <circle cx="310" cy="155" r="8" fill="#16a34a"/>
  <circle cx="240" cy="180" r="8" fill="#f97316"/>
  <text x="48" y="256" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#991b1b">A(-6,2)</text>
  <text x="484" y="66" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#991b1b">B(6,8)</text>
  <text x="318" y="150" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#166534">T</text>
  <text x="202" y="174" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#9a3412">P</text>
  <text x="310" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#475569">T is the midpoint. P divides AB in the ratio 1:2 from A to B.</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Distance Formula and Coordinate Shapes",
    subtopic:
      "Distance between two points and use of side lengths to identify coordinate-plane shapes.",
    mc: [
      {
        questionLatex: L`In the figure, the distance between $A(1,2)$ and $B(5,5)$ is`,
        difficulty: 1,
        figure: twoPointGridFigure,
        skillTags: ["distance_formula", "coordinate_reading"],
        choices: [L`$5$`, L`$7$`, L`$\sqrt{17}$`, L`$\sqrt{41}$`],
        correctLetter: "A",
        rationales: {
          B: "This adds the coordinate changes instead of using the square-root formula.",
          C: "This uses only part of the squared difference calculation.",
          D: "This squares one coordinate change incorrectly; the changes are $4$ and $3$.",
        },
        hints: [
          "Find the horizontal and vertical changes first.",
          "Use $d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$.",
          "Here the changes are $4$ and $3$, forming a $3$-$4$-$5$ triangle.",
        ],
        solution: [
          {
            explanation:
              "Apply the distance formula to the two plotted points.",
            math: "AB=\\sqrt{(5-1)^2+(5-2)^2}=\\sqrt{16+9}=5",
          },
        ],
      },
      {
        questionLatex: L`Point $P(3,k)$ is at a distance $5$ units from $A(-1,3)$. The sum of all possible values of $k$ is`,
        difficulty: 3,
        skillTags: ["distance_formula", "unknown_coordinate"],
        choices: [L`$3$`, L`$0$`, L`$6$`, L`$9$`],
        correctLetter: "C",
        rationales: {
          A: "This takes only the middle value $3$ and misses the two possible vertical positions.",
          B: "This is one possible value of $k$, not the sum of all possible values.",
          D: "This adds $3$ to one possible value instead of adding both possible values.",
        },
        hints: [
          "Substitute the coordinates into the distance formula.",
          "After squaring, solve $(k-3)^2=9$.",
          "The two values are symmetric about $k=3$.",
        ],
        solution: [
          {
            explanation: "Use the given distance.",
            math: "(3+1)^2+(k-3)^2=5^2",
          },
          {
            explanation: "Solve for the possible ordinates.",
            math: "16+(k-3)^2=25\\Rightarrow (k-3)^2=9",
          },
          {
            explanation: "Therefore $k=0$ or $k=6$, so their sum is $6$.",
          },
        ],
      },
      {
        questionLatex: L`A circle has centre $C(2,-1)$ and radius $5$. Which point lies on the circle?`,
        difficulty: 2,
        skillTags: ["distance_formula", "locus_check"],
        choices: [L`$(7,1)$`, L`$(-2,2)$`, L`$(2,5)$`, L`$(-3,-5)$`],
        correctLetter: "B",
        rationales: {
          A: "The distance from $(2,-1)$ is $\\sqrt{29}$, not $5$.",
          C: "The vertical distance alone is $6$, so this point is outside the circle.",
          D: "The squared distance is $41$, not $25$.",
        },
        hints: [
          "A point on the circle must be exactly $5$ units from the centre.",
          "Check squared distance to avoid unnecessary square roots.",
          "Look for $(x-2)^2+(y+1)^2=25$.",
        ],
        solution: [
          {
            explanation: "Test $(-2,2)$.",
            math: "(-2-2)^2+(2+1)^2=16+9=25",
          },
          {
            explanation:
              "Hence its distance from $C$ is $5$, so it lies on the circle.",
          },
        ],
      },
      {
        questionLatex: L`Using the figure, quadrilateral $ABCD$ is best described as`,
        difficulty: 2,
        figure: rectangleGridFigure,
        skillTags: ["coordinate_shape", "distance_formula"],
        choices: [
          L`a square`,
          L`a rhombus but not a rectangle`,
          L`a kite`,
          L`a rectangle but not a square`,
        ],
        correctLetter: "D",
        rationales: {
          A: "A square needs equal adjacent sides, but the side lengths here are $4$ and $3$.",
          B: "A rhombus needs all sides equal; these sides are not all equal.",
          C: "The opposite sides are equal in pairs, not adjacent pairs only.",
        },
        hints: [
          "Find the horizontal and vertical side lengths from the coordinates.",
          "$AB=4$ and $BC=3$.",
          "Opposite sides are equal and the sides follow the grid directions.",
        ],
        solution: [
          {
            explanation: "The side lengths are $AB=CD=4$ and $BC=AD=3$.",
          },
          {
            explanation:
              "The figure has unequal adjacent sides, so it is a rectangle but not a square.",
          },
        ],
      },
      {
        questionLatex: L`In a square, the opposite vertices are $A(1,1)$ and $C(7,9)$. The perimeter of the square is`,
        difficulty: 3,
        skillTags: [
          "distance_formula",
          "coordinate_shape",
          "diagonal_reasoning",
        ],
        choices: [L`$10\sqrt2$`, L`$40$`, L`$20\sqrt2$`, L`$50$`],
        correctLetter: "C",
        rationales: {
          A: "This is twice the side length, not the full perimeter.",
          B: "This treats the diagonal as if it were the side length.",
          D: "This squares the side length instead of finding the perimeter.",
        },
        hints: [
          "First find the length of the diagonal $AC$.",
          "In a square, diagonal $=$ side $\\times \\sqrt2$.",
          "After finding the side, multiply by $4$.",
        ],
        solution: [
          {
            explanation: "Find the diagonal.",
            math: "AC=\\sqrt{(7-1)^2+(9-1)^2}=\\sqrt{36+64}=10",
          },
          {
            explanation: "The side length is $10/\\sqrt2=5\\sqrt2$.",
          },
          {
            explanation: "Thus the perimeter is $4(5\\sqrt2)=20\\sqrt2$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the distance between $(-3,4)$ and $(5,-2)$.`,
        difficulty: 1,
        skillTags: ["distance_formula"],
        parts: singlePart("a", "Compute the distance.", 1),
        hints: [
          "Use the distance formula.",
          "The coordinate changes are $8$ and $-6$.",
          "Square the changes before adding.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Correctly obtains the distance as $10$ units.",
        ),
        commonErrors: [
          "Adding signed coordinate changes directly.",
          "Forgetting the square root after adding squares.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$d=\\sqrt{(5+3)^2+(-2-4)^2}=\\sqrt{64+36}=10$ units.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Show that $A(1,2)$, $B(4,6)$ and $C(7,2)$ are the vertices of an isosceles triangle.`,
        difficulty: 2,
        skillTags: ["distance_formula", "triangle_classification"],
        parts: singlePart(
          "a",
          "Use distances to justify the type of triangle.",
          3,
        ),
        hints: [
          "Find $AB$, $BC$ and $AC$.",
          "Two equal side lengths prove an isosceles triangle.",
          "$AB$ and $BC$ come out equal.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Correctly computes at least two relevant side lengths.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Concludes that the triangle is isosceles with a reason.",
            },
          ],
        },
        commonErrors: [
          "Checking only one side length.",
          "Calling the triangle equilateral without comparing all three sides.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$AB=\\sqrt{(4-1)^2+(6-2)^2}=5$ and $BC=\\sqrt{(7-4)^2+(2-6)^2}=5$.",
          },
          {
            part: "a",
            explanation:
              "Also $AC=6$, so two sides are equal. Hence $\\triangle ABC$ is isosceles.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the point on the $x$-axis which is equidistant from $A(2,3)$ and $B(8,1)$.`,
        difficulty: 3,
        skillTags: ["distance_formula", "unknown_coordinate"],
        parts: singlePart("a", "Find the required point.", 3),
        hints: [
          "Let the point on the $x$-axis be $P(x,0)$.",
          "Set $PA^2=PB^2$.",
          "Solve the resulting linear equation in $x$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly represents the point as $(x,0)$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Forms the equation using equality of squared distances.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Solves to get the point $\\left(\\frac{13}{3},0\\right)$.",
            },
          ],
        },
        commonErrors: [
          "Using $(0,y)$ for a point on the $x$-axis.",
          "Dropping signs while expanding the squared terms.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Let $P=(x,0)$. Since $PA=PB$, use squared distances.",
          },
          {
            part: "a",
            explanation: "$(x-2)^2+(0-3)^2=(x-8)^2+(0-1)^2$.",
          },
          {
            part: "a",
            explanation:
              "$x^2-4x+13=x^2-16x+65$, so $12x=52$ and $x=\\frac{13}{3}$.",
          },
          {
            part: "a",
            explanation:
              "The required point is $\\left(\\frac{13}{3},0\\right)$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Using the distance formula, prove that $A(0,0)$, $B(6,0)$, $C(8,4)$ and $D(2,4)$ form a parallelogram.`,
        difficulty: 4,
        skillTags: ["distance_formula", "quadrilateral_classification"],
        parts: singlePart(
          "a",
          "Prove the result by comparing side lengths.",
          4,
        ),
        hints: [
          "Compute all four side lengths.",
          "Compare opposite sides, not just adjacent sides.",
          "A quadrilateral with both pairs of opposite sides equal is a parallelogram.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Computes the two horizontal or slanted opposite side pairs correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Shows $AB=CD$ and $BC=AD$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Uses the equal-opposite-sides criterion to conclude parallelogram.",
            },
          ],
        },
        commonErrors: [
          "Showing only one pair of opposite sides equal.",
          "Assuming the diagram is a parallelogram without calculation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$AB=6$ and $CD=\\sqrt{(8-2)^2+(4-4)^2}=6$.",
          },
          {
            part: "a",
            explanation:
              "$BC=\\sqrt{(8-6)^2+(4-0)^2}=\\sqrt{20}$ and $AD=\\sqrt{(2-0)^2+(4-0)^2}=\\sqrt{20}$.",
          },
          {
            part: "a",
            explanation:
              "Both pairs of opposite sides are equal, so $ABCD$ is a parallelogram.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`On a map, a school is at $S(1,1)$, a library at $L(7,9)$ and a park at $P(1,9)$. A student compares the direct walk from school to library with the walk through the park.`,
        difficulty: 3,
        skillTags: ["distance_formula", "coordinate_application"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the direct distance $SL$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the total distance $SP+PL$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "How much longer is the route through the park?",
            points: 1,
          },
        ],
        hints: [
          "Use the distance formula for $SL$.",
          "$SP$ is vertical and $PL$ is horizontal.",
          "Compare the two route lengths at the end.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $SL=10$ units." },
            {
              part: "b",
              points: 2,
              description: "Finds $SP=8$, $PL=6$, and total route $14$ units.",
            },
            {
              part: "c",
              points: 1,
              description: "States that the park route is $4$ units longer.",
            },
          ],
        },
        commonErrors: [
          "Adding coordinate differences for the direct distance.",
          "Comparing only one part of the route through the park.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$SL=\\sqrt{(7-1)^2+(9-1)^2}=\\sqrt{36+64}=10$ units.",
          },
          {
            part: "b",
            explanation: "$SP=8$ units and $PL=6$ units, so $SP+PL=14$ units.",
          },
          {
            part: "c",
            explanation:
              "The route through the park is $14-10=4$ units longer.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Section Formula and Midpoints",
    subtopic:
      "Internal division of a line segment, midpoint as a special case, and missing-coordinate applications.",
    mc: [
      {
        questionLatex: L`The midpoint of $A(-4,7)$ and $B(6,-1)$ is`,
        difficulty: 1,
        skillTags: ["midpoint_formula"],
        choices: [L`$(2,6)$`, L`$(1,3)$`, L`$(-1,4)$`, L`$(10,-8)$`],
        correctLetter: "B",
        rationales: {
          A: "This averages only one coordinate correctly and copies the other incorrectly.",
          C: "This uses half the coordinate difference, not the midpoint.",
          D: "This subtracts coordinates instead of averaging them.",
        },
        hints: [
          "A midpoint averages the $x$-coordinates and the $y$-coordinates separately.",
          "Compute $\\frac{-4+6}{2}$ and $\\frac{7-1}{2}$.",
          "The midpoint should lie between the two points.",
        ],
        solution: [
          {
            explanation: "Apply the midpoint formula.",
            math: "M=\\left(\\frac{-4+6}{2},\\frac{7+(-1)}{2}\\right)=(1,3)",
          },
        ],
      },
      {
        questionLatex: L`In the figure, $P$ divides $A(2,-3)$ and $B(10,5)$ internally in the ratio $3:1$. The coordinates of $P$ are`,
        difficulty: 2,
        figure: sectionSegmentFigure,
        skillTags: ["section_formula", "internal_division"],
        choices: [L`$(8,3)$`, L`$(4,-1)$`, L`$(6,1)$`, L`$(7,2)$`],
        correctLetter: "A",
        rationales: {
          B: "This uses the ratio as if $P$ were closer to $A$, but $3:1$ makes $P$ closer to $B$.",
          C: "This is the midpoint, not the $3:1$ internal division point.",
          D: "This comes from averaging one coordinate after applying the ratio.",
        },
        hints: [
          "For $AP:PB=m:n$, use $\\left(\\frac{mx_2+nx_1}{m+n},\\frac{my_2+ny_1}{m+n}\\right)$.",
          "Here $m=3$ and $n=1$.",
          "The point should be closer to $B$ than to $A$.",
        ],
        solution: [
          {
            explanation: "Apply the section formula with $m:n=3:1$.",
            math: "P=\\left(\\frac{3(10)+1(2)}{4},\\frac{3(5)+1(-3)}{4}\\right)=(8,3)",
          },
        ],
      },
      {
        questionLatex: L`Point $P(4,1)$ divides $A(-2,-5)$ and $B(x,4)$ internally in the ratio $2:1$. The value of $x$ is`,
        difficulty: 3,
        skillTags: ["section_formula", "missing_coordinate"],
        choices: [L`$5$`, L`$6$`, L`$8$`, L`$7$`],
        correctLetter: "D",
        rationales: {
          A: "This uses the ratio weights in the reverse order.",
          B: "This is obtained by using only the average idea, not the $2:1$ section formula.",
          C: "This ignores the $-2$ coordinate of $A$.",
        },
        hints: [
          "Use only the $x$-coordinate equation first.",
          "For ratio $2:1$, $4=\\frac{2x+1(-2)}{3}$.",
          "Check that the $y$-coordinate matches the same ratio.",
        ],
        solution: [
          {
            explanation: "Use the $x$-coordinate from the section formula.",
            math: "4=\\frac{2x-2}{3}",
          },
          {
            explanation: "Thus $12=2x-2$, so $2x=14$ and $x=7$.",
          },
        ],
      },
      {
        questionLatex: L`Point $P$ divides $A(3,8)$ and $B(11,0)$ internally in the ratio $1:3$. The coordinates of $P$ are`,
        difficulty: 2,
        skillTags: ["section_formula", "internal_division"],
        choices: [L`$(9,2)$`, L`$(7,4)$`, L`$(5,6)$`, L`$(6,5)$`],
        correctLetter: "C",
        rationales: {
          A: "This reverses the ratio and places the point closer to $B$.",
          B: "This is the midpoint, not the $1:3$ division point.",
          D: "This is a partial average and does not satisfy the section formula.",
        },
        hints: [
          "Ratio $1:3$ means the point is closer to $A$.",
          "Use $m=1$ and $n=3$ in the internal section formula.",
          "Compute both coordinates with denominator $4$.",
        ],
        solution: [
          {
            explanation: "Apply the section formula.",
            math: "P=\\left(\\frac{1(11)+3(3)}{4},\\frac{1(0)+3(8)}{4}\\right)=(5,6)",
          },
        ],
      },
      {
        questionLatex: L`In the triangle shown, $M$ is the midpoint of $BC$. The length of the median $AM$ is`,
        difficulty: 3,
        figure: medianTriangleFigure,
        skillTags: ["midpoint_formula", "distance_formula", "median"],
        choices: [L`$6$`, L`$8$`, L`$10$`, L`$12$`],
        correctLetter: "A",
        rationales: {
          B: "This uses the base length from $M$ to $C$ rather than the median $AM$.",
          C: "This is close to the side length $AB$, not the median.",
          D: "This is the full base length $BC$, but the question asks for the median from $A$ to the midpoint.",
        },
        hints: [
          "Find the midpoint of $B(-4,-2)$ and $C(8,-2)$.",
          "The midpoint is directly below $A(2,4)$.",
          "Now use the distance from $A$ to $M$.",
        ],
        solution: [
          {
            explanation: "The midpoint of $BC$ is",
            math: "M=\\left(\\frac{-4+8}{2},\\frac{-2-2}{2}\\right)=(2,-2)",
          },
          {
            explanation: "Thus $AM=|4-(-2)|=6$ units.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the midpoint of $(5,-6)$ and $(-1,8)$.`,
        difficulty: 1,
        skillTags: ["midpoint_formula"],
        parts: singlePart("a", "Write the midpoint.", 1),
        hints: [
          "Average the $x$-coordinates.",
          "Average the $y$-coordinates.",
          "Do not subtract the coordinates.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Correctly writes the midpoint as $(2,1)$.",
        ),
        commonErrors: [
          "Writing coordinate differences instead of averages.",
          "Forgetting the negative sign in $-6$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$M=\\left(\\frac{5+(-1)}{2},\\frac{-6+8}{2}\\right)=(2,1)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the point which divides $A(-1,2)$ and $B(8,5)$ internally in the ratio $2:1$.`,
        difficulty: 2,
        skillTags: ["section_formula", "internal_division"],
        parts: singlePart(
          "a",
          "Find the coordinates of the division point.",
          3,
        ),
        hints: [
          "Use the internal section formula.",
          "The point is closer to $B$ because the ratio is $2:1$.",
          "Use denominator $2+1=3$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Uses the internal section formula with ratio $2:1$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds the correct $x$-coordinate.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds the correct $y$-coordinate.",
            },
          ],
        },
        commonErrors: [
          "Reversing the ratio weights.",
          "Using the midpoint formula instead of the section formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$P=\\left(\\frac{2(8)+1(-1)}{3},\\frac{2(5)+1(2)}{3}\\right)=(5,4)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the ratio in which $P(2,3)$ divides the line segment joining $A(-1,1)$ and $B(8,7)$.`,
        difficulty: 3,
        skillTags: ["section_formula", "ratio_finding"],
        parts: singlePart("a", "Find the ratio $AP:PB$.", 3),
        hints: [
          "Let the ratio be $m:n$.",
          "Use the $x$-coordinate equation first.",
          "Verify with the $y$-coordinate equation.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Sets up the section formula with $m:n$.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses a coordinate equation correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds and verifies the ratio $1:2$.",
            },
          ],
        },
        commonErrors: [
          "Reporting $2:1$ after reversing the endpoint order.",
          "Using only one coordinate without checking consistency.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $AP:PB=m:n$. From the $x$-coordinate, $2=\\frac{8m-n}{m+n}$.",
          },
          {
            part: "a",
            explanation: "$2m+2n=8m-n$, so $6m=3n$ and $m:n=1:2$.",
          },
          {
            part: "a",
            explanation:
              "The $y$-coordinate also gives $3=\\frac{7m+n}{m+n}$, which leads to $m:n=1:2$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`The midpoint of $AB$ is $M(2,-1)$ and one endpoint is $A(-3,4)$. Find the other endpoint $B$ and the length of $AB$.`,
        difficulty: 3,
        skillTags: ["midpoint_formula", "distance_formula", "missing_endpoint"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the coordinates of $B$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the length of $AB$.",
            points: 2,
          },
        ],
        hints: [
          "Let $B=(x,y)$ and apply the midpoint formula.",
          "Solve $\\frac{-3+x}{2}=2$ and $\\frac{4+y}{2}=-1$.",
          "Use the distance formula after finding $B$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Sets up the midpoint equations correctly.",
            },
            { part: "a", points: 1, description: "Finds $B(7,-6)$." },
            {
              part: "b",
              points: 2,
              description: "Uses distance formula to obtain $10\\sqrt2$.",
            },
          ],
        },
        commonErrors: [
          "Taking $B$ as the midpoint reflected incorrectly.",
          "Using the distance from $A$ to $M$ as the full length $AB$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $B=(x,y)$. Then $\\frac{-3+x}{2}=2$ gives $x=7$, and $\\frac{4+y}{2}=-1$ gives $y=-6$.",
          },
          {
            part: "b",
            explanation:
              "$AB=\\sqrt{(7+3)^2+(-6-4)^2}=\\sqrt{100+100}=10\\sqrt2$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A drone moves on a straight line from tower $A(-2,5)$ to tower $B(10,-1)$. Point $D$ is one-third of the way from $A$ to $B$, and $M$ is the midpoint of $AB$.`,
        difficulty: 3,
        skillTags: ["section_formula", "midpoint_formula", "distance_formula"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the coordinates of $D$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the coordinates of $M$.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Find the distance $DM$.", points: 1 },
        ],
        hints: [
          "One-third of the way from $A$ to $B$ means $AD:DB=1:2$.",
          "Use the section formula for $D$ and midpoint formula for $M$.",
          "Then apply the distance formula to $D$ and $M$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Correctly finds $D(2,3)$." },
            { part: "b", points: 1, description: "Correctly finds $M(4,2)$." },
            {
              part: "c",
              points: 1,
              description: "Correctly obtains $DM=\\sqrt5$.",
            },
          ],
        },
        commonErrors: [
          "Using ratio $2:1$ instead of $1:2$ for one-third from $A$.",
          "Treating the midpoint and one-third point as the same point.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$D=\\left(\\frac{1(10)+2(-2)}{3},\\frac{1(-1)+2(5)}{3}\\right)=(2,3)$.",
          },
          {
            part: "b",
            explanation:
              "$M=\\left(\\frac{-2+10}{2},\\frac{5+(-1)}{2}\\right)=(4,2)$.",
          },
          {
            part: "c",
            explanation: "$DM=\\sqrt{(4-2)^2+(2-3)^2}=\\sqrt5$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Mixed Applications in the Coordinate Plane",
    subtopic:
      "Coordinate geometry problems combining distance, midpoint and section formula reasoning in board-style contexts.",
    mc: [
      {
        questionLatex: L`For $A(-1,-1)$, $B(3,-1)$, $C(5,2)$ and $D(1,2)$, distance calculations show that $ABCD$ is`,
        difficulty: 3,
        skillTags: ["distance_formula", "quadrilateral_classification"],
        choices: [
          L`a square`,
          L`a rectangle but not a square`,
          L`a rhombus but not a square`,
          L`a parallelogram but not a rectangle`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Adjacent side lengths are not all equal and the diagonals are not equal.",
          B: "The opposite sides are equal, but the diagonals are not equal.",
          C: "A rhombus needs all four sides equal; here adjacent sides differ.",
        },
        hints: [
          "Find all four side lengths first.",
          "$AB=CD=4$ and $BC=AD=\\sqrt{13}$.",
          "Check whether the diagonals are equal before calling it a rectangle.",
        ],
        solution: [
          {
            explanation:
              "$AB=CD=4$ and $BC=AD=\\sqrt{13}$, so opposite sides are equal.",
          },
          {
            explanation:
              "$AC=\\sqrt{45}$ and $BD=\\sqrt{13}$, so it is not a rectangle.",
          },
          {
            explanation:
              "Therefore $ABCD$ is a parallelogram but not a rectangle.",
          },
        ],
      },
      {
        questionLatex: L`The midpoint of $A(-2,1)$ and $B(6,5)$ is $C$. The coordinates of $C$ are`,
        difficulty: 1,
        skillTags: ["midpoint_formula"],
        choices: [L`$(4,6)$`, L`$(2,3)$`, L`$(8,4)$`, L`$(3,2)$`],
        correctLetter: "B",
        rationales: {
          A: "This adds the coordinates instead of averaging them.",
          C: "This subtracts the coordinates instead of finding the midpoint.",
          D: "This swaps the averaged coordinates.",
        },
        hints: [
          "Use the midpoint formula.",
          "Average $-2$ and $6$.",
          "Average $1$ and $5$.",
        ],
        solution: [
          {
            explanation: "The midpoint is",
            math: "C=\\left(\\frac{-2+6}{2},\\frac{1+5}{2}\\right)=(2,3)",
          },
        ],
      },
      {
        questionLatex: L`A point $P$ on the $x$-axis is equidistant from $A(-2,3)$ and $B(4,5)$. The point $P$ is`,
        difficulty: 3,
        skillTags: ["distance_formula", "unknown_coordinate"],
        choices: [
          L`$\left(\frac37,0\right)$`,
          L`$\left(0,\frac73\right)$`,
          L`$\left(\frac{7}{3},0\right)$`,
          L`$\left(-\frac73,0\right)$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This inverts the fraction after solving for the $x$-coordinate.",
          B: "This places the point on the $y$-axis, not on the $x$-axis.",
          D: "This sign comes from reversing terms while expanding the squared distances.",
        },
        hints: [
          "A point on the $x$-axis has coordinates $(x,0)$.",
          "Set the squared distances from $P$ to $A$ and $B$ equal.",
          "Solve the resulting linear equation.",
        ],
        solution: [
          {
            explanation: "Let $P=(x,0)$. Then",
            math: "(x+2)^2+3^2=(x-4)^2+5^2",
          },
          {
            explanation: "$x^2+4x+13=x^2-8x+41$, so $12x=28$ and $x=\\frac73$.",
          },
          {
            explanation: "Thus $P=\\left(\\frac73,0\\right)$.",
          },
        ],
      },
      {
        questionLatex: L`A point $P$ is two-fifths of the way from $A(1,-2)$ to $B(11,8)$. The coordinates of $P$ are`,
        difficulty: 3,
        skillTags: ["section_formula", "coordinate_application"],
        choices: [L`$(5,2)$`, L`$(7,4)$`, L`$(6,3)$`, L`$(3,0)$`],
        correctLetter: "A",
        rationales: {
          B: "This reverses the ratio and gives a point three-fifths from $A$.",
          C: "This is the midpoint of $AB$, not the two-fifths point.",
          D: "This uses one-fifth of the coordinate change instead of two-fifths.",
        },
        hints: [
          "Two-fifths from $A$ means $AP:PB=2:3$.",
          "Use the internal section formula.",
          "The coordinate changes from $A$ to $B$ are both $10$.",
        ],
        solution: [
          {
            explanation: "Use ratio $2:3$.",
            math: "P=\\left(\\frac{2(11)+3(1)}{5},\\frac{2(8)+3(-2)}{5}\\right)=(5,2)",
          },
        ],
      },
      {
        questionLatex: L`In the figure, distance calculations prove that $ABCD$ is a`,
        difficulty: 3,
        figure: squareGridFigure,
        skillTags: [
          "distance_formula",
          "coordinate_shape",
          "diagonal_reasoning",
        ],
        choices: [
          L`rectangle but not a square`,
          L`rhombus but not a square`,
          L`parallelogram only`,
          L`square`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The sides are all equal, so it is more specific than a rectangle only.",
          B: "The diagonals are also equal, so it is more specific than a rhombus only.",
          C: "It satisfies stronger conditions than merely being a parallelogram.",
        },
        hints: [
          "Find the four side lengths.",
          "Then compare the two diagonals.",
          "All four sides are $5$ and the diagonals are equal.",
        ],
        solution: [
          {
            explanation:
              "$AB=BC=CD=DA=5$, so the quadrilateral has all sides equal.",
          },
          {
            explanation:
              "$AC=BD=5\\sqrt2$, so the diagonals are equal as well.",
          },
          {
            explanation:
              "A quadrilateral with all sides equal and equal diagonals is a square.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In $\\triangle ABC$, $A(2,6)$, $B(-2,0)$ and $C(6,0)$. Find the length of the median from $A$ to $BC$.`,
        difficulty: 2,
        skillTags: ["midpoint_formula", "distance_formula", "median"],
        parts: singlePart("a", "Find the median length.", 2),
        hints: [
          "First find the midpoint of $BC$.",
          "The midpoint has the same $x$-coordinate as $A$.",
          "Then find the distance from $A$ to that midpoint.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds the midpoint of $BC$ as $(2,0)$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds the median length as $6$ units.",
            },
          ],
        },
        commonErrors: [
          "Using $BC$ itself as the median length.",
          "Finding the midpoint of the wrong side.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The midpoint of $BC$ is $M=\\left(\\frac{-2+6}{2},\\frac{0+0}{2}\\right)=(2,0)$.",
          },
          {
            part: "a",
            explanation: "Thus $AM=|6-0|=6$ units.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Point $P$ divides $A(1,2)$ and $B(7,4)$ internally in the ratio $2:1$. Find $P$ and then find $AP$.`,
        difficulty: 3,
        skillTags: ["section_formula", "distance_formula"],
        parts: [
          { letter: "a", promptMarkdown: "Find $P$.", points: 2 },
          { letter: "b", promptMarkdown: "Find the length $AP$.", points: 2 },
        ],
        hints: [
          "Use ratio $2:1$ in the section formula.",
          "After finding $P$, apply the distance formula from $A$ to $P$.",
          "You may also use $AP=\\frac23 AB$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Correctly finds $P\\left(5,\\frac{10}{3}\\right)$.",
            },
            {
              part: "b",
              points: 2,
              description: "Correctly obtains $AP=\\frac{4\\sqrt{10}}{3}$.",
            },
          ],
        },
        commonErrors: [
          "Finding the midpoint instead of the $2:1$ division point.",
          "Using the full length $AB$ for $AP$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$P=\\left(\\frac{2(7)+1(1)}{3},\\frac{2(4)+1(2)}{3}\\right)=\\left(5,\\frac{10}{3}\\right)$.",
          },
          {
            part: "b",
            explanation:
              "$AP=\\sqrt{(5-1)^2+\\left(\\frac{10}{3}-2\\right)^2}=\\sqrt{16+\\frac{16}{9}}=\\frac{4\\sqrt{10}}{3}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Point $P(1,3)$ is the midpoint of $AB$. If $A(-4,5)$ is one endpoint, find $B$ and verify using the midpoint formula.`,
        difficulty: 2,
        skillTags: ["midpoint_formula", "missing_endpoint"],
        parts: singlePart("a", "Find and verify the other endpoint.", 3),
        hints: [
          "Let $B=(x,y)$.",
          "Use $\\frac{-4+x}{2}=1$ and $\\frac{5+y}{2}=3$.",
          "Substitute the value of $B$ back into the midpoint formula.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $B(6,1)$." },
            {
              part: "a",
              points: 1,
              description: "Verifies the midpoint as $(1,3)$.",
            },
          ],
        },
        commonErrors: [
          "Adding $A$ and $P$ instead of reflecting $A$ across $P$.",
          "Finding only one coordinate of $B$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let $B=(x,y)$. From $\\frac{-4+x}{2}=1$, $x=6$. From $\\frac{5+y}{2}=3$, $y=1$.",
          },
          {
            part: "a",
            explanation:
              "So $B=(6,1)$. Its midpoint with $A(-4,5)$ is $\\left(\\frac{-4+6}{2},\\frac{5+1}{2}\\right)=(1,3)$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Find $k$ if $A(k,2)$ is equidistant from $B(3,-4)$ and $C(7,0)$. Also find the common distance.`,
        difficulty: 3,
        skillTags: ["distance_formula", "unknown_coordinate"],
        parts: [
          { letter: "a", promptMarkdown: "Find $k$.", points: 3 },
          {
            letter: "b",
            promptMarkdown: "Find the common distance.",
            points: 1,
          },
        ],
        hints: [
          "Equidistant means $AB=AC$.",
          "Use squared distances to avoid square roots.",
          "Substitute the value of $k$ back into one distance.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correctly forms $AB^2=AC^2$.",
            },
            {
              part: "a",
              points: 2,
              description: "Solves the equation and obtains $k=1$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds the common distance as $2\\sqrt{10}$.",
            },
          ],
        },
        commonErrors: [
          "Equating only the horizontal differences.",
          "Losing signs in $(k-7)^2$ or $(2+4)^2$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$AB^2=(k-3)^2+(2+4)^2$ and $AC^2=(k-7)^2+(2-0)^2$.",
          },
          {
            part: "a",
            explanation: "Equating gives $(k-3)^2+36=(k-7)^2+4$.",
          },
          {
            part: "a",
            explanation: "$k^2-6k+45=k^2-14k+53$, so $8k=8$ and $k=1$.",
          },
          {
            part: "b",
            explanation:
              "The common distance is $AB=\\sqrt{(1-3)^2+(2+4)^2}=\\sqrt{40}=2\\sqrt{10}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A straight service route joins $A(-6,2)$ to $B(6,8)$. The first-aid tent $T$ is at the midpoint of the route. Point $P$ divides $AB$ in the ratio $1:2$ from $A$ to $B$.`,
        difficulty: 3,
        figure: routeMapFigure,
        skillTags: ["midpoint_formula", "section_formula", "distance_formula"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the coordinates of $T$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the coordinates of $P$.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Find the distance $PT$.", points: 1 },
        ],
        hints: [
          "For $T$, average the endpoint coordinates.",
          "For $P$, use $AP:PB=1:2$ in the section formula.",
          "Then use the distance formula between $P$ and $T$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $T(0,5)$." },
            {
              part: "b",
              points: 2,
              description: "Finds $P(-2,4)$ using section formula.",
            },
            { part: "c", points: 1, description: "Finds $PT=\\sqrt5$." },
          ],
        },
        commonErrors: [
          "Using $2:1$ instead of $1:2$ for $P$.",
          "Assuming $P$ is the midpoint because it lies on the same segment.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$T=\\left(\\frac{-6+6}{2},\\frac{2+8}{2}\\right)=(0,5)$.",
          },
          {
            part: "b",
            explanation:
              "$P=\\left(\\frac{1(6)+2(-6)}{3},\\frac{1(8)+2(2)}{3}\\right)=(-2,4)$.",
          },
          {
            part: "c",
            explanation: "$PT=\\sqrt{(0+2)^2+(5-4)^2}=\\sqrt5$.",
          },
        ],
      },
    ],
  },
];

export const coordinateGeometryXTopics: Topic[] = [...topicSeeds].map(
  makeTopic,
);
