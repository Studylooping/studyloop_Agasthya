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

const COURSE = "cbse-math-11";
const UNIT = "u3-coordinate-geometry";
const VERSION = "0.1.1";
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, _index: number): Difficulty {
  return seedDifficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, _type: ResponseType): Difficulty {
  return seedDifficulty;
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the coordinate-geometry condition before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_class11_coordinate_reasoning",
    };
  });

  const rotation = index % LETTERS.length;
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
  const correctLetter = choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_matching_the_coordinate_data",
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

function makeConstructed(meta: TopicMeta, seed: ConstructedSeed, index: number): FrqItem {
  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_result_without_coordinate_work",
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
      ...seed.constructed.map((item, index) => makeConstructed(meta, item, index)),
    ],
  };
}

function singlePart(letter: string, promptMarkdown: string, points: number): FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(part: string, points: number, description: string): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const linePointsFigure: ItemFigure = {
  type: "svg",
  title: "Coordinate grid with three labelled points",
  description: "A coordinate grid shows A(1,2), B(5,4), and C(5,-1).",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <line x1="70" y1="250" x2="500" y2="250" stroke="#64748b" stroke-width="2"/>
  <line x1="150" y1="40" x2="150" y2="320" stroke="#64748b" stroke-width="2"/>
  <path d="M500 250 L488 244 M500 250 L488 256" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M150 40 L144 52 M150 40 L156 52" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="506" y="255" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="158" y="38" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <circle cx="200" cy="170" r="7" fill="#2563eb"/>
  <circle cx="400" cy="90" r="7" fill="#2563eb"/>
  <circle cx="400" cy="290" r="7" fill="#2563eb"/>
  <text x="210" y="164" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">A(1,2)</text>
  <text x="410" y="84" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">B(5,4)</text>
  <text x="410" y="296" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">C(5,-1)</text>
</svg>`,
};

const pointLineDistanceFigure: ItemFigure = {
  type: "svg",
  title: "Point and line for distance",
  description: "A point P(1,2) is shown near the line labelled 3x + 4y = 12.",
  svg: `<svg viewBox="0 0 560 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="330" fill="#ffffff"/>
  <line x1="70" y1="250" x2="500" y2="250" stroke="#64748b" stroke-width="2"/>
  <line x1="150" y1="40" x2="150" y2="300" stroke="#64748b" stroke-width="2"/>
  <path d="M500 250 L488 244 M500 250 L488 256" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M150 40 L144 52 M150 40 L156 52" stroke="#64748b" stroke-width="2" fill="none"/>
  <line x1="150" y1="130" x2="350" y2="250" stroke="#2563eb" stroke-width="3"/>
  <circle cx="200" cy="190" r="7" fill="#f97316"/>
  <text x="210" y="184" font-size="16" fill="#9a3412" font-family="Arial, sans-serif">P(1,2)</text>
  <text x="282" y="166" font-size="16" fill="#1d4ed8" font-family="Arial, sans-serif">3x + 4y = 12</text>
</svg>`,
};

const circleParabolaFigure: ItemFigure = {
  type: "svg",
  title: "Circle data on coordinate axes",
  description: "A circle has centre C(1,-2) and a point R(4,-2) on the circle.",
  svg: `<svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="400" fill="#ffffff"/>
  <line x1="70" y1="180" x2="500" y2="180" stroke="#64748b" stroke-width="2"/>
  <line x1="230" y1="40" x2="230" y2="380" stroke="#64748b" stroke-width="2"/>
  <circle cx="270" cy="260" r="120" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <circle cx="270" cy="260" r="6" fill="#1d4ed8"/>
  <circle cx="390" cy="260" r="7" fill="#f97316"/>
  <text x="280" y="254" font-size="16" fill="#1d4ed8" font-family="Arial, sans-serif">C(1,-2)</text>
  <text x="400" y="254" font-size="16" fill="#9a3412" font-family="Arial, sans-serif">R(4,-2)</text>
  <text x="506" y="185" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="238" y="38" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
</svg>`,
};

const ellipseHyperbolaFigure: ItemFigure = {
  type: "svg",
  title: "Ellipse with labelled vertices",
  description: "An ellipse centred at the origin has vertices at (-5,0) and (5,0), and co-vertices at (0,-3) and (0,3).",
  svg: `<svg viewBox="0 0 580 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="580" height="360" fill="#ffffff"/>
  <line x1="70" y1="180" x2="510" y2="180" stroke="#64748b" stroke-width="2"/>
  <line x1="290" y1="40" x2="290" y2="320" stroke="#64748b" stroke-width="2"/>
  <ellipse cx="290" cy="180" rx="170" ry="102" fill="#f0fdf4" stroke="#16a34a" stroke-width="3"/>
  <circle cx="120" cy="180" r="6" fill="#15803d"/>
  <circle cx="460" cy="180" r="6" fill="#15803d"/>
  <circle cx="290" cy="78" r="6" fill="#15803d"/>
  <circle cx="290" cy="282" r="6" fill="#15803d"/>
  <text x="82" y="170" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">(-5,0)</text>
  <text x="468" y="170" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">(5,0)</text>
  <text x="304" y="84" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">(0,3)</text>
  <text x="304" y="288" font-size="15" fill="#0f172a" font-family="Arial, sans-serif">(0,-3)</text>
</svg>`,
};

const spacePointFigure: ItemFigure = {
  type: "svg",
  title: "Point in three-dimensional coordinates",
  description: "A 3D coordinate sketch shows point P(2,3,4) from the origin.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <line x1="180" y1="260" x2="465" y2="260" stroke="#64748b" stroke-width="2"/>
  <line x1="180" y1="260" x2="180" y2="60" stroke="#64748b" stroke-width="2"/>
  <line x1="180" y1="260" x2="80" y2="320" stroke="#64748b" stroke-width="2"/>
  <path d="M465 260 L453 254 M465 260 L453 266" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M180 60 L174 72 M180 60 L186 72" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M80 320 L92 318 M80 320 L88 310" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="472" y="265" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="188" y="60" font-size="15" fill="#475569" font-family="Arial, sans-serif">z</text>
  <text x="62" y="334" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <path d="M180 260 L290 294 L405 294 L405 134" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 5"/>
  <circle cx="405" cy="134" r="7" fill="#2563eb"/>
  <text x="414" y="130" font-size="16" fill="#0f172a" font-family="Arial, sans-serif">P(2,3,4)</text>
  <text x="188" y="278" font-size="14" fill="#475569" font-family="Arial, sans-serif">O</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Straight Lines: Slopes and Equations",
    subtopic: "Slope, angle between lines, and standard line forms in two dimensions",
    mc: [
      {
        questionLatex: L`\text{Using the shown points, the slope of }AB\text{ is}`,
        difficulty: 2,
        skillTags: ["straight_lines", "slope", "coordinate_grid"],
        figure: linePointsFigure,
        choices: ["$\\frac12$", "$2$", "$-\\frac12$", "$\\frac52$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses rise and run.",
          C: "The slope is positive because both $x$ and $y$ increase from $A$ to $B$.",
          D: "This adds coordinate differences instead of forming rise over run.",
        },
        hints: ["Use $m=\\frac{y_2-y_1}{x_2-x_1}$.", "From $A$ to $B$, the rise is $2$.", "The run is $4$."],
        solution: [{ step: 1, explanation: "For $A(1,2)$ and $B(5,4)$, the slope is rise over run.", math: "m=\\frac{4-2}{5-1}=\\frac12" }],
      },
      {
        questionLatex: L`\text{The equation of the line through }(2,-1)\text{ with slope }3\text{ is}`,
        difficulty: 2,
        skillTags: ["straight_lines", "point_slope_form"],
        choices: ["$y+1=3(x-2)$", "$y-1=3(x+2)$", "$y+1=2(x-3)$", "$y=3x+1$"],
        correctLetter: "A",
        rationales: {
          B: "This changes the signs in the point coordinates.",
          C: "This swaps the point coordinates with the slope.",
          D: "This has slope 3 but does not pass through $(2,-1)$.",
        },
        hints: ["Use point-slope form.", "The point is $(2,-1)$.", "Substitute $x_1=2$, $y_1=-1$, and $m=3$."],
        solution: [{ step: 1, explanation: "Point-slope form is $y-y_1=m(x-x_1)$.", math: "y+1=3(x-2)" }],
      },
      {
        questionLatex: L`\text{Assertion (A): The line }y=2x+3\text{ is parallel to the line through }(1,0)\text{ and }(3,4).\text{ Reason (R): Two non-vertical lines are parallel when their slopes are equal. Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["straight_lines", "parallel_lines", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why equal slopes imply the stated parallelism.",
          C: "The reason is true for non-vertical lines.",
          D: "The assertion is true because both slopes are 2.",
        },
        hints: ["Find the slope of $y=2x+3$.", "Find the slope through the two given points.", "Compare the slopes."],
        solution: [{ step: 1, explanation: "The first line has slope 2. The line through the two points has slope $\\frac{4-0}{3-1}=2$.", math: "m_1=m_2=2" }],
      },
      {
        questionLatex: L`\text{If two lines have slopes }1\text{ and }-1,\text{ then the angle between them is}`,
        difficulty: 3,
        skillTags: ["straight_lines", "angle_between_lines"],
        choices: ["$90^\\circ$", "$45^\\circ$", "$0^\\circ$", "$60^\\circ$"],
        correctLetter: "A",
        rationales: {
          B: "A slope pair of $1$ and $0$ would give $45^\\circ$, not this pair.",
          C: "Equal slopes give $0^\\circ$, but these slopes are not equal.",
          D: "This is not obtained from the slope-angle relation for $1$ and $-1$.",
        },
        hints: ["Use the angle formula for two slopes.", "The denominator $1+m_1m_2$ becomes zero.", "A zero denominator indicates perpendicular lines."],
        solution: [{ step: 1, explanation: "Since $m_1m_2=-1$, the lines are perpendicular.", math: "\\theta=90^\\circ" }],
      },
      {
        questionLatex: L`\text{A line cuts the }x\text{-axis at }4\text{ and the }y\text{-axis at }3.\text{ Its intercept form is}`,
        difficulty: 2,
        skillTags: ["straight_lines", "intercept_form"],
        choices: ["$\\frac{x}{4}+\\frac{y}{3}=1$", "$\\frac{x}{3}+\\frac{y}{4}=1$", "$4x+3y=1$", "$x+y=7$"],
        correctLetter: "A",
        rationales: {
          B: "This swaps the $x$- and $y$-intercepts.",
          C: "This treats intercepts as coefficients rather than denominators.",
          D: "This passes through $(4,3)$, not through the intercepts $(4,0)$ and $(0,3)$.",
        },
        hints: ["Use $\\frac{x}{a}+\\frac{y}{b}=1$.", "Here $a=4$ and $b=3$.", "The intercepts go in the denominators."],
        solution: [{ step: 1, explanation: "The intercept form with intercepts $a$ and $b$ is $\\frac xa+\\frac yb=1$.", math: "\\frac{x}{4}+\\frac{y}{3}=1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the slope of the line through }(-2,5)\text{ and }(4,-1).`,
        difficulty: 2,
        skillTags: ["straight_lines", "slope"],
        parts: singlePart("a", "Compute the slope.", 2),
        hints: ["Use $m=(y_2-y_1)/(x_2-x_1)$.", "Subtract the $y$-coordinates carefully.", "Then divide by the $x$ difference."],
        rubric: singleRubric("a", 2, "Finds $-1$."),
        commonErrors: ["Reversing only one coordinate difference.", "Using distance instead of slope."],
        workedSolution: [{ part: "a", explanation: "$m=\\frac{-1-5}{4-(-2)}=\\frac{-6}{6}=-1$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Write the slope-intercept form of the line with slope }-\frac23\text{ and }y\text{-intercept }5.`,
        difficulty: 2,
        skillTags: ["straight_lines", "slope_intercept_form"],
        parts: singlePart("a", "Write the equation.", 2),
        hints: ["Use $y=mx+c$.", "Substitute the slope.", "Use the given $y$-intercept as $c$."],
        rubric: singleRubric("a", 2, "Writes $y=-\\frac23x+5$."),
        commonErrors: ["Putting the intercept as an $x$-intercept.", "Dropping the negative sign in the slope."],
        workedSolution: [{ part: "a", explanation: "In $y=mx+c$, $m=-\\frac23$ and $c=5$, so $y=-\\frac23x+5$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{Find the equation of the line through }(-1,2)\text{ and }(3,10)\text{ in slope-intercept form.}`,
        difficulty: 3,
        skillTags: ["straight_lines", "two_point_form", "slope_intercept_form"],
        parts: singlePart("a", "Show the slope and final equation.", 3),
        hints: ["Find the slope from the two points.", "Use one point in point-slope form.", "Convert to $y=mx+c$."],
        rubric: singleRubric("a", 3, "Finds $y=2x+4$."),
        commonErrors: ["Using $10+2$ instead of $10-2$ for the rise.", "Solving for the intercept incorrectly."],
        workedSolution: [{ part: "a", explanation: "$m=\\frac{10-2}{3-(-1)}=2$. Using $(-1,2)$, $y-2=2(x+1)$, so $y=2x+4$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A straight walkway passes through }A(1,3)\text{ and }B(5,11).\text{ A second walkway passes through }C(2,1)\text{ and }D(6,9).`,
        difficulty: 4,
        skillTags: ["straight_lines", "parallel_lines", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Find the slope of walkway $AB$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the slope of walkway $CD$.", points: 1 },
          { letter: "c", promptMarkdown: "Decide whether the walkways are parallel, and justify.", points: 1 },
          { letter: "d", promptMarkdown: "Write the equation of walkway $AB$ in slope-intercept form.", points: 2 },
        ],
        hints: ["Compute each slope separately.", "Parallel non-vertical lines have equal slopes.", "Use one point on $AB$ to find the intercept."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds slope $2$." },
            { part: "b", points: 1, description: "Finds slope $2$." },
            { part: "c", points: 1, description: "States they are parallel because slopes are equal." },
            { part: "d", points: 2, description: "Finds $y=2x+1$." },
          ],
        },
        commonErrors: ["Comparing distances instead of slopes.", "Using point $C$ to find the equation of $AB$."],
        workedSolution: [
          { part: "a", explanation: "$m_{AB}=\\frac{11-3}{5-1}=2$." },
          { part: "b", explanation: "$m_{CD}=\\frac{9-1}{6-2}=2$." },
          { part: "c", explanation: "The slopes are equal, so the walkways are parallel." },
          { part: "d", explanation: "For $AB$, $y=2x+c$. Using $(1,3)$ gives $3=2+c$, so $c=1$. Thus $y=2x+1$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A map uses coordinates in kilometres. A road segment joins }M(0,6)\text{ to }N(8,0).`,
        difficulty: 4,
        skillTags: ["straight_lines", "intercept_form", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write the intercept form of the road line.", points: 1 },
          { letter: "b", promptMarkdown: "Find its slope.", points: 1 },
          { letter: "c", promptMarkdown: "Check whether the point $(4,3)$ lies on the road line.", points: 1 },
          { letter: "d", promptMarkdown: "Find the $y$-coordinate on the road when $x=2$.", points: 1 },
        ],
        hints: ["The intercepts are visible from the given endpoints.", "Use the two-point slope formula.", "Substitute the point into the line equation."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $\\frac{x}{8}+\\frac{y}{6}=1$." },
            { part: "b", points: 1, description: "Finds slope $-3/4$." },
            { part: "c", points: 1, description: "Shows $(4,3)$ lies on the line." },
            { part: "d", points: 1, description: "Finds $y=\\frac92$." },
          ],
        },
        commonErrors: ["Swapping the intercepts.", "Assuming the midpoint is the only point to test."],
        workedSolution: [
          { part: "a", explanation: "The intercepts are $8$ on the $x$-axis and $6$ on the $y$-axis, so $\\frac{x}{8}+\\frac{y}{6}=1$." },
          { part: "b", explanation: "$m=\\frac{0-6}{8-0}=-\\frac34$." },
          { part: "c", explanation: "For $(4,3)$, $\\frac48+\\frac36=\\frac12+\\frac12=1$, so it lies on the road." },
          { part: "d", explanation: "$\\frac28+\\frac y6=1$, so $\\frac y6=\\frac34$ and $y=\\frac92$." },
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Straight Lines: Point-Line Distance",
    subtopic: "Distance of a point from a line and coordinate checks",
    mc: [
      {
        questionLatex: L`\text{The distance of }P(2,3)\text{ from the horizontal line }y=-1\text{ is}`,
        difficulty: 2,
        skillTags: ["straight_lines", "point_line_distance"],
        choices: ["$4$", "$2$", "$3$", "$1$"],
        correctLetter: "A",
        rationales: {
          B: "This uses the $x$-coordinate instead of vertical distance.",
          C: "This gives the distance from the $x$-axis, not from $y=-1$.",
          D: "This subtracts in the wrong direction and ignores absolute distance.",
        },
        hints: ["A horizontal line has constant $y$.", "Use the difference between the point's $y$-coordinate and $-1$.", "Distance is non-negative."],
        solution: [{ step: 1, explanation: "The vertical distance is $|3-(-1)|$.", math: "|3+1|=4" }],
      },
      {
        questionLatex: L`\text{In the figure, the distance of }P(1,2)\text{ from the line }3x+4y=12\text{ is}`,
        difficulty: 3,
        skillTags: ["straight_lines", "point_line_distance", "coordinate_grid"],
        figure: pointLineDistanceFigure,
        choices: ["$\\frac15$", "$1$", "$5$", "$\\frac75$"],
        correctLetter: "A",
        rationales: {
          B: "This misses the denominator $\\sqrt{3^2+4^2}=5$.",
          C: "This uses only the denominator, not the signed expression at the point.",
          D: "This substitutes the point incorrectly into $3x+4y-12$.",
        },
        hints: ["Rewrite the line as $3x+4y-12=0$ for the distance formula.", "Substitute $(1,2)$.", "Divide by $\\sqrt{3^2+4^2}$."],
        solution: [{ step: 1, explanation: "The absolute numerator is $|3(1)+4(2)-12|=1$ and the denominator is $5$.", math: "d=\\frac{1}{5}" }],
      },
      {
        questionLatex: L`\text{Assertion (A): The distance of }(1,1)\text{ from }6x+8y-15=0\text{ is }\frac1{10}.\text{ Reason (R): The distance of }(x_1,y_1)\text{ from }Ax+By+C=0\text{ is }\frac{|Ax_1+By_1+C|}{\sqrt{A^2+B^2}}.\text{ Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["straight_lines", "point_line_distance", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is exactly the formula used to compute the assertion.",
          C: "The reason is the standard point-line distance formula.",
          D: "The assertion is true because the numerator is $1$ and the denominator is $10$.",
        },
        hints: ["Substitute the point in the numerator.", "Compute $\\sqrt{6^2+8^2}$.", "Check whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "The numerator is $|6+8-15|=1$, and the denominator is $\\sqrt{100}=10$.", math: "d=\\frac1{10}" }],
      },
      {
        questionLatex: L`\text{The point }(3,k)\text{ is equidistant from the two coordinate axes. The possible values of }k\text{ are}`,
        difficulty: 3,
        skillTags: ["coordinate_geometry", "distance_from_axes"],
        choices: ["$\\pm3$", "$3\\text{ only}$", "$0,3$", "$\\pm9$"],
        correctLetter: "A",
        rationales: {
          B: "The distance from the $x$-axis uses $|k|$, so both signs are possible.",
          C: "$k=0$ gives distance 0 from the $x$-axis but distance 3 from the $y$-axis.",
          D: "This squares the distance unnecessarily.",
        },
        hints: ["Distance from the $y$-axis is $|x|$.", "Distance from the $x$-axis is $|y|$.", "Set $|k|=3$."],
        solution: [{ step: 1, explanation: "The distances are $3$ and $|k|$.", math: "|k|=3\\Rightarrow k=\\pm3" }],
      },
      {
        questionLatex: L`\text{The line cuts the axes at }(6,0)\text{ and }(0,4).\text{ The distance of the origin from this line is}`,
        difficulty: 4,
        skillTags: ["straight_lines", "intercept_form", "point_line_distance"],
        choices: ["$\\frac{12}{\\sqrt{13}}$", "$\\frac{6}{\\sqrt{13}}$", "$\\frac{24}{5}$", "$\\sqrt{13}$"],
        correctLetter: "A",
        rationales: {
          B: "This halves the numerator after clearing the intercept form.",
          C: "This uses the intercept lengths directly instead of the line distance formula.",
          D: "This is related to the coefficient denominator only, not the full distance.",
        },
        hints: ["Write the intercept form first.", "Clear denominators to get a usable line equation.", "Apply the distance formula from $(0,0)$."],
        solution: [{ step: 1, explanation: "The line is $\\frac{x}{6}+\\frac{y}{4}=1$, or $2x+3y-12=0$.", math: "d=\\frac{| -12|}{\\sqrt{2^2+3^2}}=\\frac{12}{\\sqrt{13}}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the distance of }(2,1)\text{ from }5x-12y+26=0.`,
        difficulty: 2,
        skillTags: ["straight_lines", "point_line_distance"],
        parts: singlePart("a", "Use the point-line distance formula.", 2),
        hints: ["Substitute the point into the numerator.", "Compute $\\sqrt{5^2+(-12)^2}$.", "Use absolute value."],
        rubric: singleRubric("a", 2, "Finds $24/13$."),
        commonErrors: ["Forgetting the absolute value.", "Using $5^2-12^2$ in the denominator."],
        workedSolution: [{ part: "a", explanation: "$d=\\frac{|5(2)-12(1)+26|}{\\sqrt{25+144}}=\\frac{24}{13}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the distance of }(-2,3)\text{ from the vertical line }x=5.`,
        difficulty: 2,
        skillTags: ["straight_lines", "point_line_distance", "vertical_line"],
        parts: singlePart("a", "Give the shortest distance.", 2),
        hints: ["For a vertical line, compare $x$-coordinates.", "Use absolute value.", "The $y$-coordinate does not affect this distance."],
        rubric: singleRubric("a", 2, "Finds $7$."),
        commonErrors: ["Using the $y$-coordinates.", "Writing a signed distance."],
        workedSolution: [{ part: "a", explanation: "The distance from $x=5$ is $|-2-5|=7$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{A boundary line has intercepts }3\text{ and }6\text{ on the coordinate axes. Find the distance of }(3,3)\text{ from this boundary.}`,
        difficulty: 3,
        skillTags: ["straight_lines", "intercept_form", "point_line_distance"],
        parts: singlePart("a", "Write the line from intercepts and then compute the distance.", 3),
        hints: ["Use intercept form.", "Clear denominators.", "Apply the distance formula."],
        rubric: singleRubric("a", 3, "Finds $3/\\sqrt5$."),
        commonErrors: ["Treating the intercepts as a point $(3,6)$.", "Forgetting to divide by the coefficient length."],
        workedSolution: [{ part: "a", explanation: "The line is $\\frac{x}{3}+\\frac{y}{6}=1$, or $2x+y-6=0$. Distance from $(3,3)$ is $\\frac{|6+3-6|}{\\sqrt5}=\\frac3{\\sqrt5}$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A point }P(5,5)\text{ and a straight line }3x-4y+8=0\text{ are given.}`,
        difficulty: 4,
        skillTags: ["straight_lines", "point_line_distance", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Find the distance of $P$ from the line.", points: 2 },
          { letter: "b", promptMarkdown: "If a safety rule requires distance at least $3$ units, decide whether $P$ is safe.", points: 1 },
          { letter: "c", promptMarkdown: "Find the distance of $Q(0,0)$ from the same boundary.", points: 2 },
        ],
        hints: ["Use the absolute value expression for the numerator.", "Compare the result in part (a) with 3.", "Repeat the same formula for $Q$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $3/5$." },
            { part: "b", points: 1, description: "States $P$ is not safe because $3/5<3$." },
            { part: "c", points: 2, description: "Finds $8/5$." },
          ],
        },
        commonErrors: ["Comparing the numerator with 3 before dividing by 5.", "Not substituting each point separately."],
        workedSolution: [
          { part: "a", explanation: "$d_P=\\frac{|3(5)-4(5)+8|}{\\sqrt{3^2+(-4)^2}}=\\frac3{5}$." },
          { part: "b", explanation: "Since $\\frac35<3$, the point is not safe under the rule." },
          { part: "c", explanation: "$d_Q=\\frac{|3(0)-4(0)+8|}{5}=\\frac85$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A school marks a straight no-parking boundary by }4x+3y-24=0.\text{ A vehicle is at }A(2,4)\text{ and a signboard is at }B(6,0).`,
        difficulty: 4,
        skillTags: ["straight_lines", "point_line_distance", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find the distance of $A$ from the boundary.", points: 2 },
          { letter: "b", promptMarkdown: "Check whether $B$ lies on the boundary.", points: 1 },
          { letter: "c", promptMarkdown: "If the minimum allowed distance is $1$ unit, decide whether $A$ is allowed.", points: 1 },
        ],
        hints: ["Use $\\sqrt{4^2+3^2}=5$.", "A point on the boundary gives numerator zero.", "Compare part (a) with the threshold."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $4/5$." },
            { part: "b", points: 1, description: "Shows $B$ lies on the boundary." },
            { part: "c", points: 1, description: "States $A$ is not allowed." },
          ],
        },
        commonErrors: ["Using the distance between $A$ and $B$ instead of point-line distance.", "Ignoring the absolute value."],
        workedSolution: [
          { part: "a", explanation: "$d_A=\\frac{|4(2)+3(4)-24|}{5}=\\frac45$." },
          { part: "b", explanation: "For $B(6,0)$, $4(6)+3(0)-24=0$, so $B$ lies on the boundary." },
          { part: "c", explanation: "The distance of $A$ is $\\frac45$, which is less than $1$ unit, so it is not allowed." },
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Conic Sections: Circle and Parabola",
    subtopic: "Standard equations and simple properties of circles and parabolas",
    mc: [
      {
        questionLatex: L`\text{The equation of the circle with centre }(2,-3)\text{ and radius }5\text{ is}`,
        difficulty: 2,
        skillTags: ["conic_sections", "circle", "standard_equation"],
        choices: ["$(x-2)^2+(y+3)^2=25$", "$(x+2)^2+(y-3)^2=25$", "$(x-2)^2+(y+3)^2=5$", "$x^2+y^2=25$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses the signs of the centre coordinates.",
          C: "The right side should be $r^2=25$, not $r=5$.",
          D: "This would have centre at the origin, not $(2,-3)$.",
        },
        hints: ["Use $(x-h)^2+(y-k)^2=r^2$.", "Here $h=2$ and $k=-3$.", "Square the radius."],
        solution: [{ step: 1, explanation: "Substitute the centre and radius into the standard circle equation.", math: "(x-2)^2+(y+3)^2=25" }],
      },
      {
        questionLatex: L`\text{Using the shown circle data, the standard equation of the circle is}`,
        difficulty: 3,
        skillTags: ["conic_sections", "circle", "coordinate_grid"],
        figure: circleParabolaFigure,
        choices: ["$(x-1)^2+(y+2)^2=9$", "$(x+1)^2+(y-2)^2=9$", "$(x-1)^2+(y+2)^2=3$", "$(x-4)^2+(y+2)^2=9$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses the signs of the centre coordinates.",
          C: "This uses the radius instead of the square of the radius.",
          D: "This incorrectly uses the point on the circle as the centre.",
        },
        hints: ["Read the centre from the figure.", "The radius is the distance from $C$ to $R$.", "Use $r^2$ on the right side."],
        solution: [{ step: 1, explanation: "The centre is $(1,-2)$ and the radius is $3$.", math: "(x-1)^2+(y+2)^2=9" }],
      },
      {
        questionLatex: L`\text{Assertion (A): The focus of }y^2=8x\text{ is }(2,0).\text{ Reason (R): For }y^2=4ax,\text{ the focus is }(a,0).\text{ Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["conic_sections", "parabola", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the assertion by identifying $4a=8$.",
          C: "The reason is the standard focus property for $y^2=4ax$.",
          D: "The assertion is true because $a=2$.",
        },
        hints: ["Compare $y^2=8x$ with $y^2=4ax$.", "Find $a$.", "Check whether the reason gives the focus rule."],
        solution: [{ step: 1, explanation: "Since $4a=8$, $a=2$, and the focus is $(a,0)$.", math: "(2,0)" }],
      },
      {
        questionLatex: L`\text{The directrix of }x^2=12y\text{ is}`,
        difficulty: 3,
        skillTags: ["conic_sections", "parabola", "directrix"],
        choices: ["$y=-3$", "$x=-3$", "$y=3$", "$x=3$"],
        correctLetter: "A",
        rationales: {
          B: "This would match a sideways parabola, not $x^2=4ay$.",
          C: "This is the focus line direction, not the directrix.",
          D: "This has the wrong variable and direction.",
        },
        hints: ["Compare with $x^2=4ay$.", "Find $a$.", "The directrix is $y=-a$."],
        solution: [{ step: 1, explanation: "Here $4a=12$, so $a=3$.", math: "y=-3" }],
      },
      {
        questionLatex: L`\text{If }(3,k)\text{ lies on the circle }x^2+y^2=16,\text{ then }k\text{ equals}`,
        difficulty: 3,
        skillTags: ["conic_sections", "circle", "point_on_circle"],
        choices: ["$\\pm\\sqrt7$", "$7$", "$\\pm7$", "$\\sqrt{13}$"],
        correctLetter: "A",
        rationales: {
          B: "This gives $k^2$ incorrectly as a value of $k$.",
          C: "This forgets the square root after finding $k^2=7$.",
          D: "This subtracts in the wrong direction from 16.",
        },
        hints: ["Substitute $x=3$.", "Solve for $k^2$.", "Remember both signs for $k$."],
        solution: [{ step: 1, explanation: "Substituting gives $9+k^2=16$.", math: "k^2=7\\Rightarrow k=\\pm\\sqrt7" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the centre and radius of }(x+4)^2+(y-1)^2=36.`,
        difficulty: 2,
        skillTags: ["conic_sections", "circle"],
        parts: singlePart("a", "Give the centre and radius.", 2),
        hints: ["Compare with $(x-h)^2+(y-k)^2=r^2$.", "Watch the signs inside the brackets.", "Take the square root of 36 for the radius."],
        rubric: singleRubric("a", 2, "Finds centre $(-4,1)$ and radius $6$."),
        commonErrors: ["Writing the centre as $(4,-1)$.", "Giving radius $36$."],
        workedSolution: [{ part: "a", explanation: "The centre is $(-4,1)$ and the radius is $\\sqrt{36}=6$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{For the parabola }y^2=20x,\text{ find the focus.}`,
        difficulty: 2,
        skillTags: ["conic_sections", "parabola", "focus"],
        parts: singlePart("a", "Write the focus.", 2),
        hints: ["Compare with $y^2=4ax$.", "Find $a$.", "The focus is $(a,0)$."],
        rubric: singleRubric("a", 2, "Finds focus $(5,0)$."),
        commonErrors: ["Taking $a=20$ instead of $a=5$."],
        workedSolution: [{ part: "a", explanation: "$4a=20$, so $a=5$. The focus is $(5,0)$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{A circle has centre }(-2,3)\text{ and passes through }(1,7).\text{ Find its equation.}`,
        difficulty: 3,
        skillTags: ["conic_sections", "circle", "standard_equation"],
        parts: singlePart("a", "Find the radius first, then write the equation.", 3),
        hints: ["Use the distance between the centre and the point.", "Square the radius for the equation.", "Use the centre signs carefully."],
        rubric: singleRubric("a", 3, "Finds $(x+2)^2+(y-3)^2=25$."),
        commonErrors: ["Using the point on the circle as the centre.", "Forgetting to square the radius."],
        workedSolution: [{ part: "a", explanation: "$r^2=(1+2)^2+(7-3)^2=9+16=25$. Therefore the equation is $(x+2)^2+(y-3)^2=25$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A reflector cross-section is modelled by a parabola with vertex at the origin and axis along the positive }x\text{-axis. Its focus is }6\text{ cm from the vertex.}`,
        difficulty: 4,
        skillTags: ["conic_sections", "parabola", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Write the standard equation of the parabola.", points: 2 },
          { letter: "b", promptMarkdown: "Find the length of the latus rectum.", points: 1 },
          { letter: "c", promptMarkdown: "Find the $x$-coordinate when $y=12$.", points: 2 },
        ],
        hints: ["Use $y^2=4ax$ for a parabola opening right.", "The focus distance from the vertex is $a$.", "Substitute $y=12$ into the equation."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $y^2=24x$." },
            { part: "b", points: 1, description: "Finds latus rectum length $24$ cm." },
            { part: "c", points: 2, description: "Finds $x=6$." },
          ],
        },
        commonErrors: ["Using $x^2=4ay$ for a right-opening parabola.", "Using $a=24$ instead of $a=6$."],
        workedSolution: [
          { part: "a", explanation: "Since $a=6$ and the parabola opens right, $y^2=4ax=24x$." },
          { part: "b", explanation: "The latus rectum length is $4a=24$ cm." },
          { part: "c", explanation: "Put $y=12$: $144=24x$, so $x=6$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A circular garden has centre }C(2,-1)\text{ and radius }5.\text{ A straight path meets the boundary at }T(2,4).`,
        difficulty: 4,
        skillTags: ["conic_sections", "circle", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write the equation of the circular boundary.", points: 1 },
          { letter: "b", promptMarkdown: "Verify that $T$ lies on the circle.", points: 1 },
          { letter: "c", promptMarkdown: "Find the other point on the circle with the same $x$-coordinate as $T$.", points: 2 },
        ],
        hints: ["Use the centre-radius form.", "Substitute $T$ into the equation.", "Set $x=2$ and solve for $y$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $(x-2)^2+(y+1)^2=25$." },
            { part: "b", points: 1, description: "Shows $T(2,4)$ satisfies the equation." },
            { part: "c", points: 2, description: "Finds $(2,-6)$." },
          ],
        },
        commonErrors: ["Changing the sign of the centre coordinates.", "Finding the same point again and missing the second solution."],
        workedSolution: [
          { part: "a", explanation: "The boundary is $(x-2)^2+(y+1)^2=25$." },
          { part: "b", explanation: "At $T(2,4)$, $(2-2)^2+(4+1)^2=25$, so $T$ lies on the circle." },
          { part: "c", explanation: "With $x=2$, $(y+1)^2=25$, so $y+1=\\pm5$. The points are $(2,4)$ and $(2,-6)$; the other point is $(2,-6)$." },
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Conic Sections: Ellipse and Hyperbola",
    subtopic: "Standard equations and simple properties of ellipses and hyperbolas",
    mc: [
      {
        questionLatex: L`\text{For the ellipse }\frac{x^2}{25}+\frac{y^2}{9}=1,\text{ the length of the major axis is}`,
        difficulty: 2,
        skillTags: ["conic_sections", "ellipse", "major_axis"],
        choices: ["$10$", "$5$", "$6$", "$18$"],
        correctLetter: "A",
        rationales: {
          B: "This gives the semi-major axis, not the full major axis length.",
          C: "This gives the minor axis length.",
          D: "This doubles the smaller denominator instead of using the larger semi-axis.",
        },
        hints: ["Identify the larger denominator.", "The semi-major axis is its square root.", "The major axis length is $2a$."],
        solution: [{ step: 1, explanation: "Here $a^2=25$, so $a=5$ and the major axis length is $10$.", math: "2a=10" }],
      },
      {
        questionLatex: L`\text{For }\frac{x^2}{16}+\frac{y^2}{25}=1,\text{ the foci are}`,
        difficulty: 3,
        skillTags: ["conic_sections", "ellipse", "foci"],
        choices: ["$(0,\\pm3)$", "$(\\pm3,0)$", "$(0,\\pm5)$", "$(\\pm4,0)$"],
        correctLetter: "A",
        rationales: {
          B: "The larger denominator is under $y^2$, so the major axis is vertical.",
          C: "These are vertices, not foci.",
          D: "These are co-vertices, not foci.",
        },
        hints: ["The larger denominator is 25.", "Use $c^2=a^2-b^2$.", "Place foci along the major axis."],
        solution: [{ step: 1, explanation: "Here $a^2=25$, $b^2=16$, so $c^2=9$ and $c=3$ along the $y$-axis.", math: "(0,\\pm3)" }],
      },
      {
        questionLatex: L`\text{Assertion (A): The transverse axis length of }\frac{x^2}{9}-\frac{y^2}{16}=1\text{ is }6.\text{ Reason (R): For }\frac{x^2}{a^2}-\frac{y^2}{b^2}=1,\text{ the transverse axis length is }2a.\text{ Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["conic_sections", "hyperbola", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why $a=3$ gives length $6$.",
          C: "The reason is the standard property for this horizontal hyperbola.",
          D: "The assertion is true because $a^2=9$.",
        },
        hints: ["Identify $a^2$.", "Find $a$.", "Check the stated hyperbola property."],
        solution: [{ step: 1, explanation: "For the given hyperbola, $a^2=9$, so $a=3$ and the transverse axis length is $2a=6$.", math: "2a=6" }],
      },
      {
        questionLatex: L`\text{For the ellipse }\frac{x^2}{36}+\frac{y^2}{20}=1,\text{ the eccentricity is}`,
        difficulty: 4,
        skillTags: ["conic_sections", "ellipse", "eccentricity"],
        choices: ["$\\frac23$", "$\\frac{\\sqrt{20}}6$", "$\\frac{\\sqrt{56}}6$", "$\\frac43$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $b/a$ instead of $c/a$.",
          C: "This adds the denominators instead of subtracting for $c^2$.",
          D: "Ellipse eccentricity must be less than 1.",
        },
        hints: ["Use $c^2=a^2-b^2$.", "Here $a^2=36$ and $b^2=20$.", "Then $e=c/a$."],
        solution: [{ step: 1, explanation: "$c^2=36-20=16$, so $c=4$ and $a=6$.", math: "e=\\frac{4}{6}=\\frac23" }],
      },
      {
        questionLatex: L`\text{Using the displayed ellipse data, its standard equation is}`,
        difficulty: 3,
        skillTags: ["conic_sections", "ellipse", "standard_equation"],
        figure: ellipseHyperbolaFigure,
        choices: ["$\\frac{x^2}{25}+\\frac{y^2}{9}=1$", "$\\frac{x^2}{9}+\\frac{y^2}{25}=1$", "$\\frac{x^2}{5}+\\frac{y^2}{3}=1$", "$\\frac{x^2}{25}-\\frac{y^2}{9}=1$"],
        correctLetter: "A",
        rationales: {
          B: "This swaps the semi-major and semi-minor axes.",
          C: "The denominators should be squares of the semi-axis lengths.",
          D: "A minus sign gives a hyperbola, not the displayed ellipse.",
        },
        hints: ["Read semi-axis lengths from the labelled vertices.", "Square each semi-axis length.", "Use plus between the two squared terms for an ellipse."],
        solution: [{ step: 1, explanation: "The semi-major axis is $5$ and the semi-minor axis is $3$.", math: "\\frac{x^2}{25}+\\frac{y^2}{9}=1" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the vertices of }\frac{x^2}{49}+\frac{y^2}{16}=1.`,
        difficulty: 2,
        skillTags: ["conic_sections", "ellipse", "vertices"],
        parts: singlePart("a", "Write the vertices.", 2),
        hints: ["The larger denominator is under $x^2$.", "Find $a=7$.", "Vertices lie on the major axis."],
        rubric: singleRubric("a", 2, "Finds $(\\pm7,0)$."),
        commonErrors: ["Using the smaller denominator for vertices.", "Writing co-vertices instead."],
        workedSolution: [{ part: "a", explanation: "Since $a^2=49$, $a=7$, and the major axis is the $x$-axis. The vertices are $(\\pm7,0)$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the foci of }\frac{x^2}{9}-\frac{y^2}{16}=1.`,
        difficulty: 3,
        skillTags: ["conic_sections", "hyperbola", "foci"],
        parts: singlePart("a", "Write the foci.", 2),
        hints: ["For this hyperbola, use $c^2=a^2+b^2$.", "Find $c$.", "Place foci on the $x$-axis."],
        rubric: singleRubric("a", 2, "Finds $(\\pm5,0)$."),
        commonErrors: ["Using $c^2=a^2-b^2$, which is for ellipses.", "Placing foci on the $y$-axis."],
        workedSolution: [{ part: "a", explanation: "$a^2=9$, $b^2=16$, so $c^2=25$ and $c=5$. The foci are $(\\pm5,0)$." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{For }\frac{y^2}{36}-\frac{x^2}{28}=1,\text{ identify the conic and find its vertices.}`,
        difficulty: 3,
        skillTags: ["conic_sections", "hyperbola", "vertices"],
        parts: singlePart("a", "Name the conic and write the vertices.", 3),
        hints: ["A difference of squared terms indicates a hyperbola.", "The positive term is under $y^2$.", "Use $a^2=36$."],
        rubric: singleRubric("a", 3, "Identifies a vertical hyperbola with vertices $(0,\\pm6)$."),
        commonErrors: ["Calling it an ellipse because both variables are squared.", "Putting vertices on the $x$-axis."],
        workedSolution: [{ part: "a", explanation: "It is a hyperbola with transverse axis along the $y$-axis. Since $a^2=36$, $a=6$, so vertices are $(0,\\pm6)$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{An arch is modelled by the upper half of the ellipse }\frac{x^2}{64}+\frac{y^2}{25}=1.`,
        difficulty: 4,
        skillTags: ["conic_sections", "ellipse", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Find the total width of the arch at ground level.", points: 1 },
          { letter: "b", promptMarkdown: "Find the maximum height.", points: 1 },
          { letter: "c", promptMarkdown: "Find the height when $x=4$.", points: 3 },
        ],
        hints: ["Ground level corresponds to $y=0$.", "Maximum height is the positive $y$-semi-axis.", "Substitute $x=4$ and solve for positive $y$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds width $16$." },
            { part: "b", points: 1, description: "Finds height $5$." },
            { part: "c", points: 3, description: "Finds $y=\\frac{5\\sqrt3}{2}$." },
          ],
        },
        commonErrors: ["Using semi-width instead of total width.", "Taking the negative height in part (c)."],
        workedSolution: [
          { part: "a", explanation: "At $y=0$, $x=\\pm8$, so the total width is $16$." },
          { part: "b", explanation: "The maximum height is the positive semi-axis value $5$." },
          { part: "c", explanation: "Substitute $x=4$: $\\frac{16}{64}+\\frac{y^2}{25}=1$, so $\\frac{y^2}{25}=\\frac34$. Thus $y=\\frac{5\\sqrt3}{2}$ for the upper half." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A navigation screen shows two standard conics: }E:\frac{x^2}{16}+\frac{y^2}{9}=1\text{ and }H:\frac{x^2}{16}-\frac{y^2}{9}=1.`,
        difficulty: 4,
        skillTags: ["conic_sections", "ellipse", "hyperbola", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find the vertices of $E$.", points: 1 },
          { letter: "b", promptMarkdown: "Find the vertices of $H$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the foci of $H$.", points: 2 },
        ],
        hints: ["Both conics have the positive $x^2$ term with denominator 16.", "For the hyperbola, use $c^2=a^2+b^2$.", "Use $a=4$ and $b=3$ for $H$."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $(\\pm4,0)$." },
            { part: "b", points: 1, description: "Finds $(\\pm4,0)$." },
            { part: "c", points: 2, description: "Finds $(\\pm5,0)$." },
          ],
        },
        commonErrors: ["Using ellipse focus relation for the hyperbola.", "Confusing vertices with foci."],
        workedSolution: [
          { part: "a", explanation: "For $E$, $a=4$ along the $x$-axis, so vertices are $(\\pm4,0)$." },
          { part: "b", explanation: "For $H$, $a=4$, so vertices are $(\\pm4,0)$." },
          { part: "c", explanation: "For $H$, $c^2=a^2+b^2=16+9=25$, so $c=5$. The foci are $(\\pm5,0)$." },
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Introduction to Three-Dimensional Geometry",
    subtopic: "Coordinate axes, coordinate planes, point coordinates, and distance in space",
    mc: [
      {
        questionLatex: L`\text{The point }4\text{ units along the positive }x\text{-axis in three-dimensional coordinates is}`,
        difficulty: 2,
        skillTags: ["three_dimensional_geometry", "coordinate_axes"],
        choices: ["$(4,0,0)$", "$(0,4,0)$", "$(0,0,4)$", "$(4,4,4)$"],
        correctLetter: "A",
        rationales: {
          B: "This places the point on the $y$-axis.",
          C: "This places the point on the $z$-axis.",
          D: "This moves equally along all three axes.",
        },
        hints: ["On the $x$-axis, only the $x$-coordinate is non-zero.", "The movement is positive.", "Use ordered triple form."],
        solution: [{ step: 1, explanation: "On the positive $x$-axis, $y=z=0$.", math: "(4,0,0)" }],
      },
      {
        questionLatex: L`\text{The distance between }(1,2,3)\text{ and }(4,6,3)\text{ is}`,
        difficulty: 2,
        skillTags: ["three_dimensional_geometry", "distance_formula_3d"],
        choices: ["$5$", "$7$", "$\\sqrt{34}$", "$4$"],
        correctLetter: "A",
        rationales: {
          B: "This adds the coordinate differences instead of using squares and a square root.",
          C: "This includes an extra non-zero $z$ difference, but the $z$-coordinates are equal.",
          D: "This uses only the $y$-difference.",
        },
        hints: ["Use the 3D distance formula.", "The $z$ difference is zero.", "Compute $\\sqrt{3^2+4^2}$."],
        solution: [{ step: 1, explanation: "The differences are $3,4,0$.", math: "d=\\sqrt{3^2+4^2+0^2}=5" }],
      },
      {
        questionLatex: L`\text{Assertion (A): A point in the }yz\text{-plane has }x\text{-coordinate }0.\text{ Reason (R): The }yz\text{-plane is formed by the }y\text{- and }z\text{-axes, so there is no displacement along the }x\text{-axis. Choose the correct option.}`,
        difficulty: 3,
        skillTags: ["three_dimensional_geometry", "coordinate_planes", "assertion_reason"],
        choices: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why the $x$-coordinate must be zero.",
          C: "The reason is true by the definition of the $yz$-plane.",
          D: "The assertion is true for every point on the $yz$-plane.",
        },
        hints: ["Think about which axes lie in the $yz$-plane.", "A coordinate outside that plane's directions is zero.", "Check whether the reason explains the assertion."],
        solution: [{ step: 1, explanation: "In the $yz$-plane, movement occurs only along $y$ and $z$ directions.", math: "x=0" }],
      },
      {
        questionLatex: L`\text{Which point lies on the }xy\text{-plane?}`,
        difficulty: 2,
        skillTags: ["three_dimensional_geometry", "coordinate_planes"],
        choices: ["$(3,-2,0)$", "$(0,3,-2)$", "$(3,0,-2)$", "$(0,0,-2)$"],
        correctLetter: "A",
        rationales: {
          B: "This has $x=0$, so it lies in the $yz$-plane, not necessarily the $xy$-plane.",
          C: "This has $y=0$, so it lies in the $xz$-plane.",
          D: "This lies on the $z$-axis, not the $xy$-plane.",
        },
        hints: ["Points on the $xy$-plane have no $z$ displacement.", "So $z=0$.", "Check the third coordinate."],
        solution: [{ step: 1, explanation: "The $xy$-plane is described by $z=0$.", math: "(3,-2,0)" }],
      },
      {
        questionLatex: L`\text{Using the shown point }P(2,3,4),\text{ its distance from the origin is}`,
        difficulty: 3,
        skillTags: ["three_dimensional_geometry", "distance_formula_3d"],
        figure: spacePointFigure,
        choices: ["$\\sqrt{29}$", "$9$", "$5$", "$\\sqrt{13}$"],
        correctLetter: "A",
        rationales: {
          B: "This adds the coordinates instead of using the distance formula.",
          C: "This uses only the $3$ and $4$ components.",
          D: "This omits the $z$-coordinate contribution.",
        },
        hints: ["Distance from origin uses all three coordinates.", "Square each coordinate.", "Add and take the square root."],
        solution: [{ step: 1, explanation: "Distance from the origin to $(2,3,4)$ is $\\sqrt{2^2+3^2+4^2}$.", math: "\\sqrt{29}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`\text{Find the distance between }A(2,-1,4)\text{ and }B(2,3,1).`,
        difficulty: 2,
        skillTags: ["three_dimensional_geometry", "distance_formula_3d"],
        parts: singlePart("a", "Compute the distance.", 2),
        hints: ["Use the 3D distance formula.", "The $x$ difference is zero.", "Square the $y$ and $z$ differences."],
        rubric: singleRubric("a", 2, "Finds $5$."),
        commonErrors: ["Adding signed differences.", "Forgetting the $z$ coordinate."],
        workedSolution: [{ part: "a", explanation: "$AB=\\sqrt{(2-2)^2+(3+1)^2+(1-4)^2}=\\sqrt{0+16+9}=5$." }],
      },
      {
        responseType: "vsaq",
        questionLatex: L`\text{State the coordinate plane on which }(0,-5,7)\text{ lies.}`,
        difficulty: 2,
        skillTags: ["three_dimensional_geometry", "coordinate_planes"],
        parts: singlePart("a", "Name the plane.", 2),
        hints: ["Look for the coordinate that is zero.", "If $x=0$, the point is in a plane containing the $y$- and $z$-axes.", "Name that plane."],
        rubric: singleRubric("a", 2, "States the $yz$-plane."),
        commonErrors: ["Naming the zero coordinate as the plane name.", "Ignoring the non-zero coordinates."],
        workedSolution: [{ part: "a", explanation: "Since the $x$-coordinate is $0$, the point lies on the $yz$-plane." }],
      },
      {
        responseType: "saq",
        questionLatex: L`\text{A point }P(2,-1,k)\text{ lies on the positive side of the }z\text{-axis direction and is }3\text{ units from the origin. Find }k.`,
        difficulty: 3,
        skillTags: ["three_dimensional_geometry", "distance_formula_3d"],
        parts: singlePart("a", "Use the distance from origin.", 3),
        hints: ["Use $OP=\\sqrt{x^2+y^2+z^2}$.", "Set the distance equal to 3.", "Use the positive side condition."],
        rubric: singleRubric("a", 3, "Finds $k=2$."),
        commonErrors: ["Forgetting the positive side condition and giving both signs.", "Using $2-1+k=3$."],
        workedSolution: [{ part: "a", explanation: "$\\sqrt{2^2+(-1)^2+k^2}=3$, so $5+k^2=9$ and $k^2=4$. Since the point is on the positive side in the $z$ direction, $k=2$." }],
      },
      {
        responseType: "laq",
        questionLatex: L`\text{A drone moves from }A(1,2,3)\text{ to }B(5,2,6)\text{ and then to }C(5,6,6).`,
        difficulty: 4,
        skillTags: ["three_dimensional_geometry", "distance_formula_3d", "application"],
        parts: [
          { letter: "a", promptMarkdown: "Find the distance $AB$.", points: 2 },
          { letter: "b", promptMarkdown: "Find the distance $BC$.", points: 1 },
          { letter: "c", promptMarkdown: "Find the total distance travelled.", points: 1 },
          { letter: "d", promptMarkdown: "Find the direct distance $AC$.", points: 1 },
        ],
        hints: ["Use the 3D distance formula for each segment.", "For $BC$, only the $y$-coordinate changes.", "For direct distance, use $A$ and $C$."],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $5$." },
            { part: "b", points: 1, description: "Finds $4$." },
            { part: "c", points: 1, description: "Finds $9$." },
            { part: "d", points: 1, description: "Finds $\\sqrt{41}$." },
          ],
        },
        commonErrors: ["Using 2D distance and ignoring height.", "Assuming total travelled distance equals direct distance."],
        workedSolution: [
          { part: "a", explanation: "$AB=\\sqrt{(5-1)^2+(2-2)^2+(6-3)^2}=\\sqrt{16+9}=5$." },
          { part: "b", explanation: "$BC=\\sqrt{0^2+4^2+0^2}=4$." },
          { part: "c", explanation: "Total distance travelled is $5+4=9$." },
          { part: "d", explanation: "$AC=\\sqrt{(5-1)^2+(6-2)^2+(6-3)^2}=\\sqrt{16+16+9}=\\sqrt{41}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`\text{A storage room uses three coordinate directions: east }x,\text{ north }y,\text{ and height }z.\text{ Two boxes are at }A(3,4,0)\text{ and }B(3,4,12).`,
        difficulty: 4,
        skillTags: ["three_dimensional_geometry", "coordinate_axes", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Which coordinate changes from $A$ to $B$?", points: 1 },
          { letter: "b", promptMarkdown: "Find the distance between the two boxes.", points: 1 },
          { letter: "c", promptMarkdown: "State which coordinate plane contains $A$.", points: 1 },
          { letter: "d", promptMarkdown: "Find the distance of $A$ from the origin.", points: 1 },
        ],
        hints: ["Compare coordinates position by position.", "Only one coordinate changes between $A$ and $B$.", "A point with $z=0$ lies in the $xy$-plane."],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies the $z$-coordinate." },
            { part: "b", points: 1, description: "Finds $12$." },
            { part: "c", points: 1, description: "States the $xy$-plane." },
            { part: "d", points: 1, description: "Finds $5$." },
          ],
        },
        commonErrors: ["Adding all coordinates to find distance.", "Naming the $z$-axis instead of the $xy$-plane for $A$."],
        workedSolution: [
          { part: "a", explanation: "Only the $z$-coordinate changes from $0$ to $12$." },
          { part: "b", explanation: "$AB=\\sqrt{0^2+0^2+12^2}=12$." },
          { part: "c", explanation: "Since $A$ has $z=0$, it lies on the $xy$-plane." },
          { part: "d", explanation: "$OA=\\sqrt{3^2+4^2+0^2}=5$." },
        ],
      },
    ],
  },
];

export const coordinateGeometryTopics: Topic[] = topicSeeds.map(makeTopic);
