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

const COURSE = "calc-ab";
const UNIT = "u8-app-integration";
const VERSION = "0.1.1";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const MC_DIFFICULTY_FLOORS = [2, 2, 3, 3, 4] as const;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;

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
  rationales?: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface FrqSeed {
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
  frq: FrqSeed;
}

interface Point {
  x: number;
  y: number;
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, index: number): Difficulty {
  return Math.max(seedDifficulty, MC_DIFFICULTY_FLOORS[index] ?? 2) as Difficulty;
}

function calibrateFrqDifficulty(seedDifficulty: Difficulty): Difficulty {
  return Math.max(seedDifficulty, 3) as Difficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("average_value")) {
    return "You likely found the total integral but did not divide by the interval length, or you averaged endpoint values instead of area.";
  }
  if (tags.has("motion") || tags.has("accumulation_context")) {
    return "You likely confused a rate value with accumulated change, displacement, or total distance.";
  }
  if (tags.has("area_between_curves")) {
    return "You likely reversed top-minus-bottom or right-minus-left, or missed that the curves switch order.";
  }
  if (tags.has("cross_sections")) {
    return "You likely squared the wrong base length or used the wrong cross-section area formula.";
  }
  if (tags.has("disk_method")) {
    return "You likely measured the radius from the wrong axis or used washers when the cross section is a solid disk.";
  }
  if (tags.has("washer_method")) {
    return "You likely reversed outer and inner radii, measured from the wrong axis, or forgot to square each radius separately.";
  }

  return "Your choice misses the main integration setup in this application problem.";
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck this step: $${keyStep.math}$.` : "";

  return `You chose ${choiceText}. ${feedbackFocus(seed)}${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_application_of_integration_reasoning",
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
    ...choice,
  })) as McChoice[];
  const correctChoice = choices.find((choice) => choice.isCorrect);
  const correctLetter = correctChoice?.letter ?? seed.correctLetter;

  return {
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.mc.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_matching_axis_or_units",
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

function makeFrq(meta: TopicMeta, seed: FrqSeed): FrqItem {
  return {
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFrqDifficulty(seed.difficulty),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "sets_up_integral_without_explaining_measurement",
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
      makeFrq(meta, seed.frq),
    ],
  };
}

function sample(fn: (x: number) => number, xMin: number, xMax: number, n = 60): Point[] {
  return Array.from({ length: n + 1 }, (_, index) => {
    const x = xMin + ((xMax - xMin) * index) / n;
    return { x, y: fn(x) };
  });
}

function svgGraph(config: {
  title: string;
  description: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  curves: Array<{ points: Point[]; color: string; width?: number }>;
  polygons?: Array<{ points: Point[]; color: string; opacity?: number }>;
  segments?: Array<{ from: Point; to: Point; color?: string; dash?: boolean; width?: number }>;
  labels?: Array<{ x: number; y: number; text: string; color?: string }>;
}): ItemFigure {
  const left = 70;
  const right = 650;
  const top = 42;
  const bottom = 370;
  const sx = (x: number) => left + ((x - config.xMin) / (config.xMax - config.xMin)) * (right - left);
  const sy = (y: number) => bottom - ((y - config.yMin) / (config.yMax - config.yMin)) * (bottom - top);
  const pointText = (points: Point[]) => points.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const xAxis = config.yMin <= 0 && config.yMax >= 0 ? sy(0) : bottom;
  const yAxis = config.xMin <= 0 && config.xMax >= 0 ? sx(0) : left;

  const polygons = (config.polygons ?? [])
    .map(
      (polygon) =>
        `<polygon points="${pointText(polygon.points)}" fill="${polygon.color}" opacity="${polygon.opacity ?? 0.18}"/>`,
    )
    .join("\n  ");
  const curves = config.curves
    .map(
      (curve) =>
        `<polyline points="${pointText(curve.points)}" fill="none" stroke="${curve.color}" stroke-width="${curve.width ?? 4}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("\n  ");
  const segments = (config.segments ?? [])
    .map(
      (segment) =>
        `<line x1="${sx(segment.from.x).toFixed(1)}" y1="${sy(segment.from.y).toFixed(1)}" x2="${sx(segment.to.x).toFixed(1)}" y2="${sy(segment.to.y).toFixed(1)}" stroke="${segment.color ?? "#64748b"}" stroke-width="${segment.width ?? 3}" ${segment.dash ? 'stroke-dasharray="7 7"' : ""}/>`,
    )
    .join("\n  ");
  const labels = (config.labels ?? [])
    .map(
      (label) =>
        `<text x="${sx(label.x).toFixed(1)}" y="${sy(label.y).toFixed(1)}" fill="${label.color ?? "#334155"}" font-size="18">${label.text}</text>`,
    )
    .join("\n  ");

  return {
    type: "svg",
    title: config.title,
    description: config.description,
    svg: `<svg viewBox="0 0 720 420" role="img" aria-label="${config.description}">
  <rect width="720" height="420" rx="18" fill="#f8fafc"/>
  <line x1="${left}" y1="${xAxis.toFixed(1)}" x2="${right}" y2="${xAxis.toFixed(1)}" stroke="#64748b" stroke-width="2"/>
  <line x1="${yAxis.toFixed(1)}" y1="${top}" x2="${yAxis.toFixed(1)}" y2="${bottom}" stroke="#64748b" stroke-width="2"/>
  <text x="${right + 10}" y="${(xAxis + 6).toFixed(1)}" fill="#475569" font-size="18">x</text>
  <text x="${(yAxis + 8).toFixed(1)}" y="${top + 5}" fill="#475569" font-size="18">y</text>
  ${polygons}
  ${segments}
  ${curves}
  ${labels}
</svg>`,
  };
}

const averageValueFigure: ItemFigure = svgGraph({
  title: "Area under a rate graph",
  description: "Piecewise linear positive graph with vertices at (0,0), (2,3), (4,3), and (6,0).",
  xMin: -0.5,
  xMax: 6.5,
  yMin: -0.5,
  yMax: 4.5,
  polygons: [
    {
      color: "#2563eb",
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 4, y: 3 },
        { x: 6, y: 0 },
      ],
    },
  ],
  curves: [
    {
      color: "#2563eb",
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 4, y: 3 },
        { x: 6, y: 0 },
      ],
    },
  ],
  segments: [
    { from: { x: 2, y: 0 }, to: { x: 2, y: 3 }, color: "#94a3b8", dash: true, width: 2 },
    { from: { x: 4, y: 0 }, to: { x: 4, y: 3 }, color: "#94a3b8", dash: true, width: 2 },
    { from: { x: 0, y: 3 }, to: { x: 4, y: 3 }, color: "#94a3b8", dash: true, width: 2 },
  ],
  labels: [
    { x: 0, y: -0.15, text: "0" },
    { x: 2, y: -0.15, text: "2" },
    { x: 4, y: -0.15, text: "4" },
    { x: 6, y: -0.15, text: "6" },
    { x: -0.28, y: 3, text: "3" },
    { x: 2.06, y: 3.38, text: "(2,3)", color: "#1d4ed8" },
    { x: 4.06, y: 3.38, text: "(4,3)", color: "#1d4ed8" },
  ],
});

const areaXFigure: ItemFigure = svgGraph({
  title: "Area between curves with vertical slices",
  description: "Region bounded by y equals 4 minus x squared and y equals x plus 2 from x equals negative 2 to x equals 1.",
  xMin: -2.5,
  xMax: 2,
  yMin: -2,
  yMax: 5,
  polygons: [
    {
      color: "#2563eb",
      points: [
        ...sample((x) => 4 - x * x, -2, 1, 40),
        ...sample((x) => x + 2, -2, 1, 40).reverse(),
      ],
    },
  ],
  curves: [
    { color: "#2563eb", points: sample((x) => 4 - x * x, -2.2, 1.7, 70) },
    { color: "#dc2626", points: sample((x) => x + 2, -2.2, 1.7, 20) },
  ],
  segments: [
    { from: { x: -2, y: 0 }, to: { x: -2, y: 0 }, color: "#111827" },
    { from: { x: 1, y: 3 }, to: { x: 1, y: 3 }, color: "#111827" },
  ],
  labels: [
    { x: -2.22, y: -0.35, text: "-2" },
    { x: 1, y: -0.35, text: "1" },
    { x: -0.4, y: 4.35, text: "4-x^2", color: "#1d4ed8" },
    { x: 0.55, y: 2.95, text: "x+2", color: "#dc2626" },
  ],
});

const areaYFigure: ItemFigure = svgGraph({
  title: "Area between curves with horizontal slices",
  description: "Region bounded by x equals 4 minus y squared and x equals y plus 2 from y equals negative 2 to y equals 1.",
  xMin: -1,
  xMax: 5,
  yMin: -2.5,
  yMax: 2,
  polygons: [
    {
      color: "#16a34a",
      points: [
        ...sample((y) => 4 - y * y, -2, 1, 50).map((p) => ({ x: p.y, y: p.x })),
        ...sample((y) => y + 2, -2, 1, 50).map((p) => ({ x: p.y, y: p.x })).reverse(),
      ],
    },
  ],
  curves: [
    { color: "#2563eb", points: sample((y) => 4 - y * y, -2.2, 1.7, 60).map((p) => ({ x: p.y, y: p.x })) },
    { color: "#dc2626", points: sample((y) => y + 2, -2.2, 1.7, 30).map((p) => ({ x: p.y, y: p.x })) },
  ],
  labels: [
    { x: 3.45, y: 1.5, text: "x=4-y^2", color: "#1d4ed8" },
    { x: 0.55, y: -1.35, text: "x=y+2", color: "#dc2626" },
    { x: -0.38, y: -2, text: "-2" },
    { x: -0.28, y: 1, text: "1" },
  ],
});

const multiIntersectionFigure: ItemFigure = svgGraph({
  title: "Curves intersecting three times",
  description: "Curves y equals x cubed minus 3x and y equals x intersect at x equals negative 2, 0, and 2.",
  xMin: -2.5,
  xMax: 2.5,
  yMin: -4,
  yMax: 4,
  polygons: [
    {
      color: "#f59e0b",
      points: [
        ...sample((x) => x ** 3 - 3 * x, -2, 0, 40),
        ...sample((x) => x, -2, 0, 40).reverse(),
      ],
    },
    {
      color: "#f59e0b",
      points: [
        ...sample((x) => x, 0, 2, 40),
        ...sample((x) => x ** 3 - 3 * x, 0, 2, 40).reverse(),
      ],
    },
  ],
  curves: [
    { color: "#2563eb", points: sample((x) => x ** 3 - 3 * x, -2.2, 2.2, 80) },
    { color: "#dc2626", points: sample((x) => x, -2.2, 2.2, 20) },
  ],
  labels: [
    { x: -2.1, y: -2.3, text: "-2" },
    { x: 1.9, y: 2.45, text: "2" },
    { x: -1.4, y: 3.0, text: "f", color: "#2563eb" },
    { x: 1.2, y: 1.75, text: "g", color: "#dc2626" },
  ],
});

const squareCrossSectionFigure: ItemFigure = svgGraph({
  title: "Base region for square cross sections",
  description: "Base region under y equals square root of x from x equals 0 to x equals 4.",
  xMin: -0.5,
  xMax: 4.5,
  yMin: -0.5,
  yMax: 2.8,
  polygons: [
    { color: "#7c3aed", points: [{ x: 0, y: 0 }, ...sample(Math.sqrt, 0, 4, 50), { x: 4, y: 0 }] },
  ],
  curves: [{ color: "#7c3aed", points: sample(Math.sqrt, 0, 4, 50) }],
  labels: [
    { x: 2.2, y: 1.8, text: "base = sqrt(x)", color: "#6d28d9" },
    { x: 2.2, y: 0.55, text: "squares" },
  ],
});

const semicircleCrossSectionFigure: ItemFigure = svgGraph({
  title: "Base region for semicircle cross sections",
  description: "Base region between y equals four minus x squared and the x-axis from x equals negative 2 to x equals 2.",
  xMin: -2.5,
  xMax: 2.5,
  yMin: -0.5,
  yMax: 4.8,
  polygons: [{ color: "#0f766e", points: [{ x: -2, y: 0 }, ...sample((x) => 4 - x * x, -2, 2, 70), { x: 2, y: 0 }] }],
  curves: [{ color: "#0f766e", points: sample((x) => 4 - x * x, -2, 2, 70) }],
  labels: [{ x: -0.9, y: 3.9, text: "diameter = 4-x^2", color: "#0f766e" }],
});

const diskXAxisFigure: ItemFigure = svgGraph({
  title: "Disk method around the x-axis",
  description: "Region under y equals x plus 1 from x equals 0 to x equals 2 revolved around the x-axis.",
  xMin: -0.5,
  xMax: 2.5,
  yMin: -0.5,
  yMax: 3.8,
  polygons: [{ color: "#2563eb", points: [{ x: 0, y: 0 }, ...sample((x) => x + 1, 0, 2, 30), { x: 2, y: 0 }] }],
  curves: [{ color: "#2563eb", points: sample((x) => x + 1, 0, 2, 30) }],
  segments: [{ from: { x: 0, y: 0 }, to: { x: 2, y: 0 }, color: "#f59e0b", dash: true, width: 4 }],
  labels: [
    { x: 0.8, y: 2.25, text: "y=x+1", color: "#1d4ed8" },
    { x: 0.65, y: -0.22, text: "axis: x-axis", color: "#b45309" },
  ],
});

const diskOtherAxisFigure: ItemFigure = svgGraph({
  title: "Disk method around another horizontal axis",
  description: "Region between y equals one and y equals x plus one from x equals 0 to x equals 2 revolved around y equals one.",
  xMin: -0.5,
  xMax: 2.5,
  yMin: 0,
  yMax: 3.8,
  polygons: [{ color: "#2563eb", points: [{ x: 0, y: 1 }, ...sample((x) => x + 1, 0, 2, 30), { x: 2, y: 1 }] }],
  curves: [{ color: "#2563eb", points: sample((x) => x + 1, 0, 2, 30) }],
  segments: [{ from: { x: -0.4, y: 1 }, to: { x: 2.4, y: 1 }, color: "#f59e0b", dash: true, width: 4 }],
  labels: [
    { x: 0.7, y: 2.35, text: "y=x+1", color: "#1d4ed8" },
    { x: 0.8, y: 0.75, text: "axis: y=1", color: "#b45309" },
  ],
});

const washerXAxisFigure: ItemFigure = svgGraph({
  title: "Washer method around the x-axis",
  description: "Region between y equals square root of x and y equals x over 2 from x equals 0 to x equals 4 revolved around the x-axis.",
  xMin: -0.5,
  xMax: 4.5,
  yMin: -0.5,
  yMax: 2.7,
  polygons: [
    {
      color: "#2563eb",
      points: [
        ...sample(Math.sqrt, 0, 4, 60),
        ...sample((x) => x / 2, 0, 4, 60).reverse(),
      ],
    },
  ],
  curves: [
    { color: "#2563eb", points: sample(Math.sqrt, 0, 4, 60) },
    { color: "#dc2626", points: sample((x) => x / 2, 0, 4, 30) },
  ],
  segments: [{ from: { x: 0, y: 0 }, to: { x: 4, y: 0 }, color: "#f59e0b", dash: true, width: 4 }],
  labels: [
    { x: 1.0, y: 1.7, text: "sqrt(x)", color: "#1d4ed8" },
    { x: 2.5, y: 1.1, text: "x/2", color: "#dc2626" },
    { x: 1.5, y: -0.18, text: "axis: x-axis", color: "#b45309" },
  ],
});

const washerOtherAxisFigure: ItemFigure = svgGraph({
  title: "Washer method around y equals 2",
  description: "Region between y equals x and y equals x squared from x equals 0 to x equals 1 revolved around y equals 2.",
  xMin: -0.2,
  xMax: 1.4,
  yMin: -0.2,
  yMax: 2.4,
  polygons: [
    {
      color: "#2563eb",
      points: [
        ...sample((x) => x, 0, 1, 40),
        ...sample((x) => x * x, 0, 1, 40).reverse(),
      ],
    },
  ],
  curves: [
    { color: "#2563eb", points: sample((x) => x, 0, 1, 30) },
    { color: "#dc2626", points: sample((x) => x * x, 0, 1, 40) },
  ],
  segments: [{ from: { x: -0.1, y: 2 }, to: { x: 1.25, y: 2 }, color: "#f59e0b", dash: true, width: 4 }],
  labels: [
    { x: 0.7, y: 1.16, text: "y=x", color: "#1d4ed8" },
    { x: 0.7, y: 0.35, text: "y=x^2", color: "#dc2626" },
    { x: 0.28, y: 2.18, text: "axis: y=2", color: "#b45309" },
  ],
});

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "8.1",
    title: "Finding the Average Value of a Function on an Interval",
    subtopic: "Using definite integrals to find and interpret average value",
    mc: [
      {
        questionLatex:
          "\\text{What is the average value of }f(x)=3x^2+2\\text{ on }[0,2]?",
        difficulty: 2,
        skillTags: ["average_value", "definite_integral"],
        choices: ["$6$", "$12$", "$5$", "$8$"],
        correctLetter: "A",
        hints: [
          "Average value is not just the integral.",
          "Use $\\frac1{b-a}\\int_a^b f(x)\\,dx$.",
          "$\\int_0^2(3x^2+2)\\,dx=12$ and the interval length is $2$.",
        ],
        solution: [
          { step: 1, explanation: "Compute the integral.", math: "\\int_0^2(3x^2+2)\\,dx=12" },
          { step: 2, explanation: "Divide by interval length.", math: "\\frac{12}{2}=6" },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\int_1^5 g(x)\\,dx=20,\\text{ what is the average value of }g\\text{ on }[1,5]?",
        difficulty: 2,
        skillTags: ["average_value"],
        choices: ["$5$", "$20$", "$4$", "$80$"],
        correctLetter: "A",
        rationales: {
          B: "That is the accumulated area, not the average value.",
          C: "This is the interval length, not the average height.",
          D: "This multiplies by the interval length instead of dividing.",
        },
        hints: [
          "The interval length is $5-1=4$.",
          "Average value equals total integral divided by interval length.",
          "Compute $20/4$.",
        ],
        solution: [{ step: 1, explanation: "Use the average value formula.", math: "\\frac{1}{4}\\cdot20=5" }],
      },
      {
        questionLatex:
          "\\text{The graph of }f\\text{ is shown. What is the average value of }f\\text{ on }[0,6]?",
        difficulty: 3,
        skillTags: ["average_value", "graph_interpretation"],
        figure: averageValueFigure,
        choices: ["$2$", "$12$", "$6$", "$72$"],
        correctLetter: "A",
        rationales: {
          B: "This is the total signed area under the graph, not the average value.",
          C: "This is the interval length, not the average height of the graph.",
          D: "This multiplies area by interval length instead of dividing.",
        },
        hints: [
          "Break the region into two triangles and one rectangle.",
          "Compute the total signed area from the coordinates shown.",
          "Then divide by the interval length, $6$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the geometric area under the graph.",
            math: "\\frac12(2)(3)+(2)(3)+\\frac12(2)(3)=12",
          },
          {
            step: 2,
            explanation: "Divide by the interval length.",
            math: "\\frac{12}{6}=2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The average value of }f(x)=x^2+c\\text{ on }[0,3]\\text{ is }7.\\text{ Find }c.",
        difficulty: 3,
        skillTags: ["average_value", "parameter"],
        choices: ["$4$", "$7$", "$3$", "$\\frac{16}{3}$"],
        correctLetter: "A",
        hints: [
          "Write the average value equation.",
          "$\\frac13\\int_0^3(x^2+c)\\,dx=7$.",
          "The average value of $x^2$ on $[0,3]$ is $3$.",
        ],
        solution: [
          { step: 1, explanation: "Compute the average value.", math: "\\frac13(9+3c)=3+c" },
          { step: 2, explanation: "Set equal to 7.", math: "3+c=7\\Rightarrow c=4" },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|cccc}x&0&2&4&6\\\\\\hline h(x)&2&5&9&8\\end{array}\\quad \\text{Using trapezoids on the listed subintervals, estimate the average value of }h\\text{ on }[0,6].",
        difficulty: 4,
        skillTags: ["average_value", "trapezoidal_sum", "table_values"],
        choices: ["$\\frac{19}{3}$", "$38$", "$\\frac{17}{3}$", "$6$"],
        correctLetter: "A",
        rationales: {
          B: "This is the trapezoidal estimate of the integral, not the average value.",
          C: "This misses one of the trapezoid areas.",
          D: "This averages the interval endpoints instead of estimating the integral.",
        },
        hints: [
          "First estimate the integral using trapezoids.",
          "Then divide by the interval length $6$.",
          "The trapezoid estimate is $7+14+17=38$.",
        ],
        solution: [
          { step: 1, explanation: "Estimate the integral.", math: "2\\frac{2+5}{2}+2\\frac{5+9}{2}+2\\frac{9+8}{2}=38" },
          { step: 2, explanation: "Divide by interval length.", math: "\\frac{38}{6}=\\frac{19}{3}" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=x^2-2x+5\\text{ on }[1,4].",
      difficulty: 4,
      skillTags: ["average_value", "mean_value_theorem_for_integrals"],
      parts: [
        { letter: "a", promptMarkdown: "Find the average value of $f$ on $[1,4]$.", points: 2 },
        { letter: "b", promptMarkdown: "Find a value $c$ in $[1,4]$ for which $f(c)$ equals the average value.", points: 2 },
        { letter: "c", promptMarkdown: "Explain why such a value $c$ is guaranteed to exist.", points: 1 },
      ],
      hints: [
        "Use the average value formula first.",
        "Set $f(c)$ equal to the average value.",
        "Use continuity on the closed interval.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Computes $\\int_1^4 f(x)\\,dx=21$." },
          { part: "a", points: 1, description: "Divides by $3$ to get average value $7$." },
          { part: "b", points: 1, description: "Sets $c^2-2c+5=7$." },
          { part: "b", points: 1, description: "Finds $c=1+\\sqrt3$ in the interval." },
          { part: "c", points: 1, description: "Cites continuity and the Mean Value Theorem for Integrals." },
        ],
      },
      commonErrors: [
        "Reporting the integral as the average value.",
        "Keeping both quadratic roots even though only one lies in the interval.",
        "Citing the derivative Mean Value Theorem instead of the integral average value guarantee.",
      ],
      workedSolution: [
        { part: "a", explanation: "$\\int_1^4(x^2-2x+5)\\,dx=21$, so the average value is $21/(4-1)=7$." },
        { part: "b", explanation: "Solve $c^2-2c+5=7$, so $c=1\\pm\\sqrt3$. Only $1+\\sqrt3$ lies in $[1,4]$." },
        { part: "c", explanation: "Because $f$ is continuous on $[1,4]$, the Mean Value Theorem for Integrals guarantees at least one such $c$." },
      ],
    },
  },
  {
    topicCode: "8.2",
    title: "Connecting Position, Velocity, and Acceleration Using Integrals",
    subtopic: "Recovering change in position and velocity from rates",
    mc: [
      {
        questionLatex:
          "\\text{A particle has velocity }v(t)=3t^2+2\\text{ and }s(0)=1.\\text{ What is }s(2)?",
        difficulty: 2,
        skillTags: ["motion", "position_from_velocity"],
        choices: ["$13$", "$12$", "$9$", "$15$"],
        correctLetter: "A",
        hints: [
          "Position changes by the integral of velocity.",
          "$s(2)=s(0)+\\int_0^2v(t)\\,dt$.",
          "$\\int_0^2(3t^2+2)\\,dt=12$.",
        ],
        solution: [{ step: 1, explanation: "Add displacement to initial position.", math: "s(2)=1+12=13" }],
      },
      {
        questionLatex:
          "\\text{For }v(t)=t-2\\text{ on }[0,4],\\text{ what is the total distance traveled?}",
        difficulty: 2,
        skillTags: ["motion", "total_distance"],
        choices: ["$4$", "$0$", "$8$", "$2$"],
        correctLetter: "A",
        rationales: {
          B: "That is displacement; total distance uses $|v(t)|$.",
          C: "This doubles the correct distance.",
          D: "This includes only one side of the sign change.",
        },
        hints: [
          "Velocity changes sign at $t=2$.",
          "Total distance is $\\int_0^4|t-2|\\,dt$.",
          "The two triangular areas each equal $2$.",
        ],
        solution: [{ step: 1, explanation: "Add absolute areas.", math: "2+2=4" }],
      },
      {
        questionLatex:
          "\\text{A particle has acceleration }a(t)=6t\\text{ and }v(1)=4.\\text{ Find }v(3).",
        difficulty: 3,
        skillTags: ["motion", "velocity_from_acceleration"],
        choices: ["$28$", "$24$", "$22$", "$18$"],
        correctLetter: "A",
        hints: [
          "Velocity changes by the integral of acceleration.",
          "$v(3)=v(1)+\\int_1^3 6t\\,dt$.",
          "$\\int_1^3 6t\\,dt=24$.",
        ],
        solution: [{ step: 1, explanation: "Add velocity change.", math: "v(3)=4+24=28" }],
      },
      {
        questionLatex:
          "\\text{A particle moves from }s(0)=7\\text{ to }s(3)=19.\\text{ What is its average velocity on }[0,3]?",
        difficulty: 3,
        skillTags: ["motion", "average_velocity"],
        choices: ["$4$", "$12$", "$\\frac{19}{3}$", "$3$"],
        correctLetter: "A",
        hints: [
          "Average velocity is displacement divided by time.",
          "The displacement is $19-7$.",
          "Divide by $3$.",
        ],
        solution: [{ step: 1, explanation: "Compute average velocity.", math: "\\frac{19-7}{3}=4" }],
      },
      {
        questionLatex:
          "\\text{A particle has velocity }v(t)=t^2-6t+8\\text{ on }[0,5].\\text{ On which intervals does it move to the left?}",
        difficulty: 4,
        skillTags: ["motion", "sign_analysis"],
        choices: ["$(2,4)$", "$(0,2)$", "$(4,5)$", "$(0,2)\\cup(4,5)$"],
        correctLetter: "A",
        hints: [
          "Moving left means velocity is negative.",
          "Factor $v(t)=(t-2)(t-4)$.",
          "The quadratic is negative between its roots.",
        ],
        solution: [{ step: 1, explanation: "Analyze the sign of velocity.", math: "v(t)<0\\text{ on }(2,4)" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A particle moves along a line with velocity }v(t)=t^2-6t+8\\text{ for }0\\le t\\le5\\text{ and }s(0)=3.",
      difficulty: 4,
      skillTags: ["motion", "total_distance", "accumulation"],
      parts: [
        { letter: "a", promptMarkdown: "Find the times when the particle is at rest.", points: 1 },
        { letter: "b", promptMarkdown: "Find the displacement of the particle on $[0,5]$.", points: 1 },
        { letter: "c", promptMarkdown: "Find the total distance traveled on $[0,5]$.", points: 2 },
        { letter: "d", promptMarkdown: "At $t=1$, is the speed increasing or decreasing? Justify your answer.", points: 2 },
      ],
      hints: [
        "Rest occurs where $v(t)=0$.",
        "Displacement uses signed integral; total distance uses absolute value.",
        "Speed behavior depends on signs of velocity and acceleration.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Finds $t=2$ and $t=4$." },
          { part: "b", points: 1, description: "Computes displacement $20/3$." },
          { part: "c", points: 1, description: "Splits at velocity sign changes." },
          { part: "c", points: 1, description: "Computes total distance $28/3$." },
          { part: "d", points: 1, description: "Computes or states $v(1)>0$ and $a(1)<0$." },
          { part: "d", points: 1, description: "Concludes speed is decreasing." },
        ],
      },
      commonErrors: [
        "Using displacement as total distance.",
        "Ignoring velocity sign changes at $t=2$ and $t=4$.",
        "Using acceleration sign alone to determine speed behavior.",
      ],
      workedSolution: [
        { part: "a", explanation: "$v(t)=(t-2)(t-4)$, so the particle is at rest at $t=2$ and $t=4$." },
        { part: "b", explanation: "With antiderivative $F(t)=t^3/3-3t^2+8t$, displacement is $F(5)-F(0)=20/3$." },
        { part: "c", explanation: "$v>0$ on $(0,2)$ and $(4,5)$, and $v<0$ on $(2,4)$. The total distance is $20/3+4/3+4/3=28/3$." },
        { part: "d", explanation: "$v(1)=3>0$ and $a(t)=2t-6$, so $a(1)=-4<0$. Opposite signs mean speed is decreasing." },
      ],
    },
  },
  {
    topicCode: "8.3",
    title: "Using Accumulation Functions and Definite Integrals in Context",
    subtopic: "Interpreting integrals as net change in applied settings",
    mc: [
      {
        questionLatex:
          "\\text{Water enters a tank at rate }R(t)\\text{ liters per minute. What does }\\int_0^{10}R(t)\\,dt\\text{ represent?}",
        difficulty: 2,
        skillTags: ["accumulation_context", "units"],
        choices: [
          "$\\text{The amount of water that entered during the first 10 minutes.}$",
          "$\\text{The rate of water entering at }t=10.$",
          "$\\text{The average rate of water entering.}$",
          "$\\text{The derivative of the inflow rate.}$",
        ],
        correctLetter: "A",
        hints: [
          "Integrating a rate gives accumulated amount.",
          "The units are liters.",
          "The bounds show the first 10 minutes.",
        ],
        solution: [{ step: 1, explanation: "Interpret rate times time.", math: "\\text{liters accumulated}" }],
      },
      {
        questionLatex:
          "\\text{A reservoir contains }500\\text{ m}^3\\text{ of water at }t=0.\\text{ If net inflow is }r(t)\\text{ m}^3/\\text{hr},\\text{ which expression gives the amount at }t=6?",
        difficulty: 2,
        skillTags: ["accumulation_context"],
        choices: ["$500+\\int_0^6 r(t)\\,dt$", "$\\int_0^6 500r(t)\\,dt$", "$500+r(6)$", "$500-r(6)$"],
        correctLetter: "A",
        hints: [
          "Amount later equals amount now plus net change.",
          "Net change comes from integrating the rate.",
          "Use bounds from $0$ to $6$.",
        ],
        solution: [{ step: 1, explanation: "Initial amount plus accumulated change.", math: "500+\\int_0^6 r(t)\\,dt" }],
      },
      {
        questionLatex:
          "\\text{If }A(x)=4+\\int_1^x f(t)\\,dt,\\text{ then }A'(x)=",
        difficulty: 3,
        skillTags: ["accumulation_context", "ftc_accumulation"],
        choices: ["$f(x)$", "$f(t)$", "$4+f(x)$", "$\\int_1^x f(t)\\,dt$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative is a function of $x$, so the dummy variable becomes $x$.",
          C: "The constant $4$ has derivative zero.",
          D: "This leaves the accumulation function undifferentiated.",
        },
        hints: [
          "Use the Fundamental Theorem of Calculus.",
          "The derivative of the constant is zero.",
          "Replace the dummy variable with the upper limit.",
        ],
        solution: [{ step: 1, explanation: "Apply FTC.", math: "A'(x)=f(x)" }],
      },
      {
        questionLatex:
          "\\text{A machine's cost rate is }C'(q)=0.02q+5\\text{ dollars per item. Approximate the additional cost from }q=100\\text{ to }q=120.",
        difficulty: 3,
        skillTags: ["accumulation_context", "cost"],
        choices: ["$\\int_{100}^{120}(0.02q+5)\\,dq$", "$C'(120)-C'(100)$", "$20C'(100)$ only", "$C(120)+C(100)$"],
        correctLetter: "A",
        hints: [
          "Additional cost is accumulated marginal cost.",
          "Use the rate from 100 to 120 items.",
          "Set up a definite integral of $C'(q)$.",
        ],
        solution: [{ step: 1, explanation: "Use marginal cost accumulation.", math: "\\int_{100}^{120}C'(q)\\,dq" }],
      },
      {
        questionLatex:
          "\\text{Let }B(x)=10+\\int_0^x b(t)\\,dt.\\text{ If }b\\text{ changes from positive to negative at }x=3,\\text{ what happens to }B\\text{ at }x=3?",
        difficulty: 4,
        skillTags: ["accumulation_context", "local_extrema"],
        choices: ["$B$ has a local maximum.", "$B$ has a local minimum.", "$B(3)=0$.", "$B$ is concave up."],
        correctLetter: "A",
        hints: [
          "By FTC, $B'(x)=b(x)$.",
          "Use the sign change of $B'$.",
          "Positive to negative derivative gives a local maximum.",
        ],
        solution: [{ step: 1, explanation: "Translate sign change through FTC.", math: "B':+\\to-\\Rightarrow \\text{local maximum}" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A pond initially contains }1800\\text{ fish. Fish enter the pond at rate }E(t)=30+4t\\text{ fish/day and leave at rate }L(t)=12+2t\\text{ fish/day for }0\\le t\\le10.",
      difficulty: 4,
      skillTags: ["accumulation_context", "net_change", "interpretation"],
      parts: [
        { letter: "a", promptMarkdown: "Write an expression for the number of fish in the pond at time $t$.", points: 2 },
        { letter: "b", promptMarkdown: "Find the number of fish in the pond at $t=10$.", points: 1 },
        { letter: "c", promptMarkdown: "Find the average net rate of change of the fish population on $[0,10]$.", points: 1 },
        { letter: "d", promptMarkdown: "Is the number of fish increasing throughout the interval? Justify your answer.", points: 1 },
      ],
      hints: [
        "Net rate is entering rate minus leaving rate.",
        "Population equals initial amount plus integral of net rate.",
        "Increasing requires positive net rate.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Uses net rate $E(t)-L(t)$." },
          { part: "a", points: 1, description: "Writes $1800+\\int_0^t(E(s)-L(s))\\,ds$ or equivalent." },
          { part: "b", points: 1, description: "Computes $2080$ fish." },
          { part: "c", points: 1, description: "Computes average net rate $28$ fish/day." },
          { part: "d", points: 1, description: "Justifies net rate $18+2t>0$." },
        ],
      },
      commonErrors: [
        "Adding entering and leaving rates instead of subtracting.",
        "Using the rate at $t=10$ as the total change.",
        "Forgetting the initial amount.",
      ],
      workedSolution: [
        { part: "a", explanation: "$P(t)=1800+\\int_0^t[(30+4s)-(12+2s)]\\,ds$." },
        { part: "b", explanation: "$P(10)=1800+\\int_0^{10}(18+2t)\\,dt=1800+280=2080$ fish." },
        { part: "c", explanation: "Average net rate is $\\frac1{10}\\int_0^{10}(18+2t)\\,dt=28$ fish/day." },
        { part: "d", explanation: "Since $18+2t>0$ for $0\\le t\\le10$, the number of fish is increasing throughout." },
      ],
    },
  },
  {
    topicCode: "8.4",
    title: "Finding Area Between Curves Expressed as Functions of x",
    subtopic: "Using vertical slices and top-minus-bottom integrals",
    mc: [
      {
        questionLatex:
          "\\text{The region shown is bounded by }y=4-x^2\\text{ and }y=x+2.\\text{ Which integral gives its area?}",
        difficulty: 2,
        skillTags: ["area_between_curves", "vertical_slices"],
        figure: areaXFigure,
        choices: [
          "$\\int_{-2}^{1}\\big((4-x^2)-(x+2)\\big)\\,dx$",
          "$\\int_{-2}^{1}\\big((x+2)-(4-x^2)\\big)\\,dx$",
          "$\\int_{0}^{1}\\big((4-x^2)-(x+2)\\big)\\,dx$",
          "$\\pi\\int_{-2}^{1}\\big((4-x^2)^2-(x+2)^2\\big)\\,dx$",
        ],
        correctLetter: "A",
        hints: [
          "Area with vertical slices is top minus bottom.",
          "The curves meet at $x=-2$ and $x=1$.",
          "The parabola is above the line on this interval.",
        ],
        solution: [{ step: 1, explanation: "Set up top minus bottom.", math: "\\int_{-2}^{1}[(4-x^2)-(x+2)]\\,dx" }],
      },
      {
        questionLatex:
          "\\text{Find the area bounded by }y=4-x^2\\text{ and }y=x+2.",
        difficulty: 2,
        skillTags: ["area_between_curves", "vertical_slices"],
        figure: areaXFigure,
        choices: ["$\\frac92$", "$\\frac32$", "$3$", "$\\frac83$"],
        correctLetter: "A",
        hints: [
          "First find the intersections.",
          "Use top minus bottom from $-2$ to $1$.",
          "Integrate $2-x-x^2$.",
        ],
        solution: [
          { step: 1, explanation: "Set up area.", math: "\\int_{-2}^{1}(2-x-x^2)\\,dx" },
          { step: 2, explanation: "Evaluate.", math: "\\left[2x-\\frac{x^2}{2}-\\frac{x^3}{3}\\right]_{-2}^{1}=\\frac92" },
        ],
      },
      {
        questionLatex:
          "\\text{For }0\\le x\\le1,\\text{ the area between }y=x\\text{ and }y=x^2\\text{ is}",
        difficulty: 3,
        skillTags: ["area_between_curves", "vertical_slices"],
        choices: ["$\\frac16$", "$\\frac13$", "$\\frac12$", "$0$"],
        correctLetter: "A",
        hints: [
          "On $[0,1]$, $x$ is above $x^2$.",
          "Set up $\\int_0^1(x-x^2)\\,dx$.",
          "Evaluate using powers.",
        ],
        solution: [{ step: 1, explanation: "Compute area.", math: "\\int_0^1(x-x^2)\\,dx=\\frac12-\\frac13=\\frac16" }],
      },
      {
        questionLatex:
          "\\text{Which equation finds the intersection points of }y=4-x^2\\text{ and }y=x+2?",
        difficulty: 3,
        skillTags: ["area_between_curves", "intersection"],
        choices: ["$4-x^2=x+2$", "$4-x^2=0$", "$x+2=0$", "$(4-x^2)(x+2)=0$"],
        correctLetter: "A",
        hints: [
          "Intersections occur where the y-values are equal.",
          "Set the two formulas equal.",
          "Do not set each curve equal to the axis unless the axis is a boundary.",
        ],
        solution: [{ step: 1, explanation: "Set curves equal.", math: "4-x^2=x+2" }],
      },
      {
        questionLatex:
          "\\text{If }f(x)\\ge g(x)\\text{ on }[a,b],\\text{ but a student computes }\\int_a^b(g(x)-f(x))\\,dx,\\text{ what is the result?}",
        difficulty: 4,
        skillTags: ["area_between_curves", "error_analysis"],
        choices: ["$\\text{The negative of the area.}$", "$\\text{The correct area.}$", "$\\text{The square of the area.}$", "$\\text{The volume of revolution.}$"],
        correctLetter: "A",
        hints: [
          "Area must be nonnegative.",
          "If $f\\ge g$, then $g-f\\le0$.",
          "The integral has the opposite sign.",
        ],
        solution: [{ step: 1, explanation: "Reverse order reverses sign.", math: "\\int_a^b(g-f)\\,dx=-\\int_a^b(f-g)\\,dx" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }R\\text{ be the region bounded by }y=4-x^2\\text{ and }y=x+2.",
      difficulty: 4,
      skillTags: ["area_between_curves", "intersection", "graph_interpretation"],
      figure: areaXFigure,
      parts: [
        { letter: "a", promptMarkdown: "Find the points of intersection of the two curves.", points: 1 },
        { letter: "b", promptMarkdown: "Set up, but do not evaluate, an integral for the area of $R$ using vertical slices.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the area of $R$.", points: 1 },
      ],
      hints: [
        "Set the two y-values equal.",
        "Use top minus bottom.",
        "The top curve is the parabola on the whole interval.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Finds $x=-2$ and $x=1$." },
          { part: "b", points: 1, description: "Uses bounds $-2$ and $1$." },
          { part: "b", points: 1, description: "Uses integrand $(4-x^2)-(x+2)$." },
          { part: "c", points: 1, description: "Evaluates the area as $9/2$." },
        ],
      },
      commonErrors: [
        "Reversing top and bottom.",
        "Using only one intersection.",
        "Squaring the functions as if finding volume.",
      ],
      workedSolution: [
        { part: "a", explanation: "$4-x^2=x+2$ gives $x^2+x-2=(x+2)(x-1)=0$, so $x=-2,1$." },
        { part: "b", explanation: "The area is $\\int_{-2}^{1}[(4-x^2)-(x+2)]\\,dx$." },
        { part: "c", explanation: "This integral equals $\\int_{-2}^{1}(2-x-x^2)\\,dx=9/2$." },
      ],
    },
  },
  {
    topicCode: "8.5",
    title: "Finding Area Between Curves Expressed as Functions of y",
    subtopic: "Using horizontal slices and right-minus-left integrals",
    mc: [
      {
        questionLatex:
          "\\text{The region shown is bounded by }x=4-y^2\\text{ and }x=y+2.\\text{ Which integral gives its area?}",
        difficulty: 2,
        skillTags: ["area_between_curves", "horizontal_slices"],
        figure: areaYFigure,
        choices: [
          "$\\int_{-2}^{1}\\big((4-y^2)-(y+2)\\big)\\,dy$",
          "$\\int_{-2}^{1}\\big((y+2)-(4-y^2)\\big)\\,dy$",
          "$\\int_0^1\\big((4-y^2)-(y+2)\\big)\\,dy$",
          "$\\pi\\int_{-2}^{1}\\big((4-y^2)^2-(y+2)^2\\big)\\,dy$",
        ],
        correctLetter: "A",
        hints: [
          "For horizontal slices, use right minus left.",
          "The bounds are y-values.",
          "$4-y^2$ is to the right of $y+2$ on this interval.",
        ],
        solution: [{ step: 1, explanation: "Set up right minus left.", math: "\\int_{-2}^{1}[(4-y^2)-(y+2)]\\,dy" }],
      },
      {
        questionLatex:
          "\\text{For }0\\le y\\le1,\\text{ the area between }x=\\sqrt y\\text{ and }x=y\\text{ is}",
        difficulty: 2,
        skillTags: ["area_between_curves", "horizontal_slices"],
        choices: ["$\\frac16$", "$\\frac13$", "$\\frac12$", "$\\frac23$"],
        correctLetter: "A",
        hints: [
          "On $0<y<1$, $\\sqrt y$ is to the right of $y$.",
          "Use $\\int_0^1(\\sqrt y-y)\\,dy$.",
          "Evaluate $2/3-1/2$.",
        ],
        solution: [{ step: 1, explanation: "Compute horizontal-slice area.", math: "\\int_0^1(y^{1/2}-y)\\,dy=\\frac23-\\frac12=\\frac16" }],
      },
      {
        questionLatex:
          "\\text{A horizontal slice of a region runs from }x=\\ln y\\text{ to }x=1\\text{ for }1\\le y\\le e.\\text{ Which integral gives the area?}",
        difficulty: 3,
        skillTags: ["area_between_curves", "horizontal_slices", "logarithms"],
        choices: ["$\\int_1^e(1-\\ln y)\\,dy$", "$\\int_1^e(\\ln y-1)\\,dy$", "$\\int_0^1(e^x-1)\\,dx$", "$\\pi\\int_1^e(1-\\ln y)^2\\,dy$"],
        correctLetter: "A",
        hints: [
          "Horizontal slice length is right minus left.",
          "Right endpoint is $x=1$.",
          "Left endpoint is $x=\\ln y$.",
        ],
        solution: [{ step: 1, explanation: "Set up right minus left.", math: "\\int_1^e(1-\\ln y)\\,dy" }],
      },
      {
        questionLatex:
          "\\text{When is integrating with respect to }y\\text{ usually more efficient for area?}",
        difficulty: 3,
        skillTags: ["area_between_curves", "technique_selection"],
        choices: [
          "$\\text{When horizontal slices have a single right-minus-left description.}$",
          "$\\text{Only when rotating around the y-axis.}$",
          "$\\text{Only when both curves are lines.}$",
          "$\\text{Never; AP area must use }dx.$",
        ],
        correctLetter: "A",
        hints: [
          "Area can use vertical or horizontal slices.",
          "Choose the variable that avoids splitting or solving awkwardly.",
          "Horizontal slices naturally use $dy$.",
        ],
        solution: [{ step: 1, explanation: "State the slice principle.", math: "\\text{area}=\\int(\\text{right}-\\text{left})\\,dy" }],
      },
      {
        questionLatex:
          "\\text{A student sets }\\int_a^b(\\text{top}-\\text{bottom})\\,dy\\text{ for a horizontal-slice area problem. What is the issue?}",
        difficulty: 4,
        skillTags: ["area_between_curves", "error_analysis"],
        choices: [
          "$\\text{With }dy\\text{, slice length should be right minus left.}$",
          "$\\text{The bounds must always be x-values.}$",
          "$\\text{The integrand must be squared.}$",
          "$\\text{There is no issue.}$",
        ],
        correctLetter: "A",
        hints: [
          "The differential tells the slice direction.",
          "A $dy$ slice is horizontal.",
          "Horizontal length is right endpoint minus left endpoint.",
        ],
        solution: [{ step: 1, explanation: "Use the correct orientation.", math: "\\int(\\text{right}-\\text{left})\\,dy" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }S\\text{ be the region bounded by }x=4-y^2\\text{ and }x=y+2.",
      difficulty: 4,
      skillTags: ["area_between_curves", "horizontal_slices", "graph_interpretation"],
      figure: areaYFigure,
      parts: [
        { letter: "a", promptMarkdown: "Find the $y$-values where the curves intersect.", points: 1 },
        { letter: "b", promptMarkdown: "Set up an integral with respect to $y$ for the area of $S$.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the area.", points: 1 },
      ],
      hints: [
        "Set the x-values equal.",
        "Use right minus left.",
        "The setup mirrors a vertical-slice problem, but with $y$ as the variable.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Finds $y=-2$ and $y=1$." },
          { part: "b", points: 1, description: "Uses bounds $-2$ and $1$." },
          { part: "b", points: 1, description: "Uses integrand $(4-y^2)-(y+2)$." },
          { part: "c", points: 1, description: "Evaluates area as $9/2$." },
        ],
      },
      commonErrors: [
        "Using top minus bottom with $dy$.",
        "Using x-bounds for a y-integral.",
        "Reversing right and left.",
      ],
      workedSolution: [
        { part: "a", explanation: "$4-y^2=y+2$ gives $y^2+y-2=(y+2)(y-1)=0$, so $y=-2$ and $y=1$." },
        { part: "b", explanation: "Area is $\\int_{-2}^{1}[(4-y^2)-(y+2)]\\,dy$." },
        { part: "c", explanation: "The integral is $\\int_{-2}^{1}(2-y-y^2)\\,dy=9/2$." },
      ],
    },
  },
  {
    topicCode: "8.6",
    title: "Finding Area Between Curves That Intersect at More Than Two Points",
    subtopic: "Splitting intervals when curve order changes",
    mc: [
      {
        questionLatex:
          "\\text{The curves }f(x)=x^3-3x\\text{ and }g(x)=x\\text{ intersect at }x=-2,0,2.\\text{ Which expression gives the total area between them?}",
        difficulty: 2,
        skillTags: ["area_between_curves", "multiple_intersections"],
        figure: multiIntersectionFigure,
        choices: [
          "$\\int_{-2}^{0}(f-g)\\,dx+\\int_0^2(g-f)\\,dx$",
          "$\\int_{-2}^{2}(f-g)\\,dx$",
          "$\\int_{-2}^{2}(g-f)\\,dx$",
          "$\\int_{0}^{2}(f-g)\\,dx$",
        ],
        correctLetter: "A",
        hints: [
          "The curves switch order at $x=0$.",
          "Use upper minus lower on each interval.",
          "Do not let positive and negative areas cancel.",
        ],
        solution: [{ step: 1, explanation: "Split at the middle intersection.", math: "\\int_{-2}^{0}(f-g)\\,dx+\\int_0^2(g-f)\\,dx" }],
      },
      {
        questionLatex:
          "\\text{Find the total area between }f(x)=x^3-3x\\text{ and }g(x)=x\\text{ on }[-2,2].",
        difficulty: 2,
        skillTags: ["area_between_curves", "multiple_intersections"],
        figure: multiIntersectionFigure,
        choices: ["$8$", "$0$", "$4$", "$16$"],
        correctLetter: "A",
        rationales: {
          B: "That is the signed integral over the symmetric interval, not the total area.",
          C: "This counts only one of the two lobes.",
          D: "This doubles the total area.",
        },
        hints: [
          "Compute one lobe and double it, or split at $0$.",
          "On $[0,2]$, $g-f=4x-x^3$.",
          "$\\int_0^2(4x-x^3)\\,dx=4$.",
        ],
        solution: [{ step: 1, explanation: "Add both equal lobes.", math: "4+4=8" }],
      },
      {
        questionLatex:
          "\\text{Why is }\\int_{-2}^{2}(f(x)-g(x))\\,dx\\text{ not the area between the curves in the shown problem?}",
        difficulty: 3,
        skillTags: ["area_between_curves", "signed_area", "error_analysis"],
        figure: multiIntersectionFigure,
        choices: [
          "$\\text{The signed areas cancel because the curves switch order.}$",
          "$\\text{The functions are not continuous.}$",
          "$\\text{Area between curves must use }dy.$",
          "$\\text{The intersections are not included.}$",
        ],
        correctLetter: "A",
        hints: [
          "Area must be nonnegative.",
          "The upper curve changes at $x=0$.",
          "A single signed integral can cancel regions.",
        ],
        solution: [{ step: 1, explanation: "Explain cancellation.", math: "\\int_{-2}^{2}(f-g)\\,dx=0\\text{ but area}=8" }],
      },
      {
        questionLatex:
          "\\text{If }f-g\\text{ changes sign at }x=c\\text{ inside }[a,b],\\text{ an area setup should usually}",
        difficulty: 3,
        skillTags: ["area_between_curves", "technique_selection"],
        choices: ["$\\text{split the integral at }c$", "$\\text{ignore }c$", "$\\text{square }f-g$", "$\\text{differentiate }f-g$"],
        correctLetter: "A",
        hints: [
          "Changing sign means the top curve changed.",
          "Area uses absolute vertical distance.",
          "Splitting lets each integrand stay nonnegative.",
        ],
        solution: [{ step: 1, explanation: "State the area strategy.", math: "\\int_a^c|f-g|\\,dx+\\int_c^b|f-g|\\,dx" }],
      },
      {
        questionLatex:
          "\\text{Which expression is equivalent to the total area between }f\\text{ and }g\\text{ on }[a,b]?",
        difficulty: 4,
        skillTags: ["area_between_curves", "absolute_value"],
        choices: ["$\\int_a^b |f(x)-g(x)|\\,dx$", "$\\left|\\int_a^b(f(x)-g(x))\\,dx\\right|$", "$\\int_a^b(f(x)+g(x))\\,dx$", "$\\int_a^b(f'(x)-g'(x))\\,dx$"],
        correctLetter: "A",
        rationales: {
          B: "Taking absolute value after integrating can still lose area when cancellation occurs.",
          C: "Area between curves depends on their difference, not their sum.",
          D: "Derivatives do not give vertical distance between the original curves.",
        },
        hints: [
          "Area adds vertical distances.",
          "Distance is absolute value of the difference.",
          "The absolute value must be inside the integral unless you split intervals.",
        ],
        solution: [{ step: 1, explanation: "Use distance between curves.", math: "\\int_a^b|f-g|\\,dx" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=x^3-3x\\text{ and }g(x)=x.\\text{ The curves intersect at }x=-2,0,2.",
      difficulty: 4,
      skillTags: ["area_between_curves", "multiple_intersections", "signed_area"],
      figure: multiIntersectionFigure,
      parts: [
        { letter: "a", promptMarkdown: "Determine which function is greater on $(-2,0)$ and on $(0,2)$.", points: 2 },
        { letter: "b", promptMarkdown: "Set up an expression for the total area between the curves.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the total area.", points: 1 },
      ],
      hints: [
        "Test a point in each interval.",
        "Split at $x=0$.",
        "Each lobe has the same area by symmetry.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Identifies $f>g$ on $(-2,0)$." },
          { part: "a", points: 1, description: "Identifies $g>f$ on $(0,2)$." },
          { part: "b", points: 1, description: "Splits at $0$." },
          { part: "b", points: 1, description: "Uses correct upper-minus-lower integrands." },
          { part: "c", points: 1, description: "Evaluates total area as $8$." },
        ],
      },
      commonErrors: [
        "Using one signed integral over $[-2,2]$.",
        "Failing to switch top and bottom at $x=0$.",
        "Counting one lobe only.",
      ],
      workedSolution: [
        { part: "a", explanation: "$f-g=x^3-4x$. This is positive on $(-2,0)$ and negative on $(0,2)$." },
        { part: "b", explanation: "Area is $\\int_{-2}^{0}(f-g)\\,dx+\\int_0^2(g-f)\\,dx$." },
        { part: "c", explanation: "The right lobe is $\\int_0^2(4x-x^3)\\,dx=4$, so total area is $8$." },
      ],
    },
  },
  {
    topicCode: "8.7",
    title: "Volumes with Cross Sections: Squares and Rectangles",
    subtopic: "Building volume integrals from cross-section area formulas",
    mc: [
      {
        questionLatex:
          "\\text{The base of a solid is the region under }y=\\sqrt x\\text{ from }x=0\\text{ to }x=4.\\text{ Cross sections perpendicular to the x-axis are squares. Which integral gives the volume?}",
        difficulty: 2,
        skillTags: ["cross_sections", "squares"],
        figure: squareCrossSectionFigure,
        choices: ["$\\int_0^4 x\\,dx$", "$\\int_0^4\\sqrt x\\,dx$", "$\\pi\\int_0^4x\\,dx$", "$\\int_0^4\\frac12x\\,dx$"],
        correctLetter: "A",
        hints: [
          "The side length of each square is the base length.",
          "Here side length is $\\sqrt x$.",
          "Square area is side squared.",
        ],
        solution: [{ step: 1, explanation: "Use square area.", math: "A(x)=(\\sqrt x)^2=x" }],
      },
      {
        questionLatex:
          "\\text{For the solid in the figure with square cross sections, what is the volume?}",
        difficulty: 2,
        skillTags: ["cross_sections", "squares"],
        figure: squareCrossSectionFigure,
        choices: ["$8$", "$\\frac{16}{3}$", "$4\\pi$", "$4$"],
        correctLetter: "A",
        hints: [
          "Use the integral from the previous setup.",
          "$V=\\int_0^4x\\,dx$.",
          "Evaluate $x^2/2$ from $0$ to $4$.",
        ],
        solution: [{ step: 1, explanation: "Evaluate volume integral.", math: "\\int_0^4x\\,dx=8" }],
      },
      {
        questionLatex:
          "\\text{A base region has vertical slice length }L(x)=3-x\\text{ for }0\\le x\\le3.\\text{ Cross sections perpendicular to the x-axis are rectangles with height twice the base length. Which integral gives volume?}",
        difficulty: 3,
        skillTags: ["cross_sections", "rectangles"],
        choices: ["$\\int_0^3 2(3-x)^2\\,dx$", "$\\int_0^3(3-x)^2\\,dx$", "$\\int_0^3 2(3-x)\\,dx$", "$\\pi\\int_0^3(3-x)^2\\,dx$"],
        correctLetter: "A",
        hints: [
          "Rectangle area is base times height.",
          "Height is twice the base length.",
          "So area is $L(x)\\cdot2L(x)$.",
        ],
        solution: [{ step: 1, explanation: "Build cross-section area.", math: "A(x)=L(x)\\cdot2L(x)=2(3-x)^2" }],
      },
      {
        questionLatex:
          "\\text{A solid has square cross sections perpendicular to the y-axis. If horizontal base length is }4-y^2\\text{ for }0\\le y\\le2,\\text{ which integral gives volume?}",
        difficulty: 3,
        skillTags: ["cross_sections", "squares", "horizontal_slices"],
        choices: ["$\\int_0^2(4-y^2)^2\\,dy$", "$\\int_0^2(4-y^2)\\,dy$", "$\\pi\\int_0^2(4-y^2)^2\\,dy$", "$\\int_0^4(4-y^2)^2\\,dy$"],
        correctLetter: "A",
        hints: [
          "Perpendicular to the y-axis means integrate with respect to $y$.",
          "The square side length is the horizontal base length.",
          "Square the side length.",
        ],
        solution: [{ step: 1, explanation: "Set up y-integral.", math: "\\int_0^2(4-y^2)^2\\,dy" }],
      },
      {
        questionLatex:
          "\\text{Why is }\\pi\\int_a^b[L(x)]^2\\,dx\\text{ usually wrong for square cross sections?}",
        difficulty: 4,
        skillTags: ["cross_sections", "error_analysis"],
        choices: [
          "$\\text{The factor }\\pi\\text{ belongs to circular cross sections, not squares.}$",
          "$\\text{The base length should never be squared.}$",
          "$\\text{Squares require washer subtraction.}$",
          "$\\text{Cross-section volume never uses integrals.}$",
        ],
        correctLetter: "A",
        hints: [
          "Square cross-section area is $s^2$.",
          "Circle area is $\\pi r^2$.",
          "Match the geometric formula to the cross-section shape.",
        ],
        solution: [{ step: 1, explanation: "Identify the shape formula.", math: "A_{\\text{square}}=s^2\\text{, not }\\pi s^2" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The base of a solid is the region bounded by }y=\\sqrt x,\\ y=0,\\ x=0,\\text{ and }x=4.\\text{ Cross sections perpendicular to the x-axis are squares.}",
      difficulty: 4,
      skillTags: ["cross_sections", "squares", "graph_interpretation"],
      figure: squareCrossSectionFigure,
      parts: [
        { letter: "a", promptMarkdown: "Write an expression for the side length of a square cross section at position $x$.", points: 1 },
        { letter: "b", promptMarkdown: "Set up an integral for the volume.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the volume.", points: 1 },
      ],
      hints: [
        "The vertical slice length is the side of the square.",
        "Area of each cross section is side squared.",
        "Integrate cross-section area from $0$ to $4$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "States side length $\\sqrt x$." },
          { part: "b", points: 1, description: "Uses square area $(\\sqrt x)^2$." },
          { part: "b", points: 1, description: "Uses bounds $0$ to $4$." },
          { part: "c", points: 1, description: "Evaluates volume as $8$." },
        ],
      },
      commonErrors: [
        "Using area under the base instead of cross-section area.",
        "Adding a factor of $\\pi$.",
        "Forgetting to square the side length.",
      ],
      workedSolution: [
        { part: "a", explanation: "At position $x$, the vertical base length is $\\sqrt x-0=\\sqrt x$." },
        { part: "b", explanation: "Each cross section has area $(\\sqrt x)^2=x$, so $V=\\int_0^4x\\,dx$." },
        { part: "c", explanation: "$V=\\int_0^4x\\,dx=8$ cubic units." },
      ],
    },
  },
  {
    topicCode: "8.8",
    title: "Volumes with Cross Sections: Triangles and Semicircles",
    subtopic: "Using non-rectangular cross-section area formulas",
    mc: [
      {
        questionLatex:
          "\\text{The base shown has vertical length }4-x^2\\text{ for }-2\\le x\\le2.\\text{ Cross sections perpendicular to the x-axis are semicircles with diameter in the base. Which integral gives volume?}",
        difficulty: 2,
        skillTags: ["cross_sections", "semicircles"],
        figure: semicircleCrossSectionFigure,
        choices: ["$\\int_{-2}^{2}\\frac{\\pi}{8}(4-x^2)^2\\,dx$", "$\\int_{-2}^{2}\\frac{\\pi}{2}(4-x^2)^2\\,dx$", "$\\int_{-2}^{2}(4-x^2)^2\\,dx$", "$\\int_{-2}^{2}\\pi(4-x^2)^2\\,dx$"],
        correctLetter: "A",
        hints: [
          "A semicircle with diameter $d$ has radius $d/2$.",
          "Area is half of $\\pi r^2$.",
          "So area is $\\frac12\\pi(d/2)^2=\\frac{\\pi}{8}d^2$.",
        ],
        solution: [{ step: 1, explanation: "Use semicircle area with diameter $4-x^2$.", math: "A(x)=\\frac{\\pi}{8}(4-x^2)^2" }],
      },
      {
        questionLatex:
          "\\text{A base has slice length }L(x).\\text{ Cross sections perpendicular to the x-axis are equilateral triangles. What is the cross-section area?}",
        difficulty: 2,
        skillTags: ["cross_sections", "triangles"],
        choices: ["$\\frac{\\sqrt3}{4}[L(x)]^2$", "$\\frac12[L(x)]^2$", "$\\pi[L(x)]^2$", "$\\frac{\\pi}{8}[L(x)]^2$"],
        correctLetter: "A",
        hints: [
          "Use the area formula for an equilateral triangle.",
          "The side length is $L(x)$.",
          "Area is $\\frac{\\sqrt3}{4}s^2$.",
        ],
        solution: [{ step: 1, explanation: "Apply equilateral triangle area.", math: "A(x)=\\frac{\\sqrt3}{4}L(x)^2" }],
      },
      {
        questionLatex:
          "\\text{A base has slice length }2x\\text{ for }0\\le x\\le3.\\text{ Cross sections are right isosceles triangles with leg in the base. Which integral gives volume?}",
        difficulty: 3,
        skillTags: ["cross_sections", "triangles"],
        choices: ["$\\int_0^3\\frac12(2x)^2\\,dx$", "$\\int_0^3(2x)^2\\,dx$", "$\\int_0^3\\frac{\\sqrt3}{4}(2x)^2\\,dx$", "$\\pi\\int_0^3(2x)^2\\,dx$"],
        correctLetter: "A",
        hints: [
          "A right isosceles triangle with leg $L$ has area $\\frac12L^2$.",
          "Here $L=2x$.",
          "Integrate from $0$ to $3$.",
        ],
        solution: [{ step: 1, explanation: "Build the area function.", math: "A(x)=\\frac12(2x)^2" }],
      },
      {
        questionLatex:
          "\\text{If semicircular cross sections have diameter }d(x)=6-2x\\text{ on }[0,3],\\text{ which expression is the volume?}",
        difficulty: 3,
        skillTags: ["cross_sections", "semicircles"],
        choices: ["$\\int_0^3\\frac{\\pi}{8}(6-2x)^2\\,dx$", "$\\int_0^3\\frac{\\pi}{2}(6-2x)^2\\,dx$", "$\\int_0^3\\pi(6-2x)^2\\,dx$", "$\\int_0^3(6-2x)\\,dx$"],
        correctLetter: "A",
        hints: [
          "Convert diameter to radius.",
          "Semicircle area is $\\frac12\\pi r^2$.",
          "With radius $d/2$, the factor is $\\pi/8$.",
        ],
        solution: [{ step: 1, explanation: "Use diameter form.", math: "A(x)=\\frac{\\pi}{8}d(x)^2" }],
      },
      {
        questionLatex:
          "\\text{A student uses }\\frac12L(x)^2\\text{ for equilateral-triangle cross sections. What error did the student make?}",
        difficulty: 4,
        skillTags: ["cross_sections", "error_analysis"],
        choices: [
          "$\\text{They used the area formula for a right isosceles triangle, not an equilateral triangle.}$",
          "$\\text{They forgot that volume uses an integral.}$",
          "$\\text{They should have used }\\pi L(x)^2.$",
          "$\\text{They should not square }L(x).$",
        ],
        correctLetter: "A",
        hints: [
          "The shape determines the constant multiplier.",
          "Equilateral triangle area is not $\\frac12s^2$.",
          "Use $\\frac{\\sqrt3}{4}s^2$ for equilateral triangles.",
        ],
        solution: [{ step: 1, explanation: "Compare triangle area formulas.", math: "A_{\\text{equilateral}}=\\frac{\\sqrt3}{4}L^2" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The base of a solid is bounded by }y=4-x^2\\text{ and the x-axis for }-2\\le x\\le2.\\text{ Cross sections perpendicular to the x-axis are semicircles with diameter in the base.}",
      difficulty: 4,
      skillTags: ["cross_sections", "semicircles", "graph_interpretation"],
      figure: semicircleCrossSectionFigure,
      parts: [
        { letter: "a", promptMarkdown: "Write the diameter of a typical cross section.", points: 1 },
        { letter: "b", promptMarkdown: "Set up an integral for the volume.", points: 2 },
        { letter: "c", promptMarkdown: "Explain why the coefficient is $\\pi/8$, not $\\pi/2$.", points: 1 },
      ],
      hints: [
        "The diameter is the vertical base length.",
        "A semicircle has half the area of a circle.",
        "Radius is half the diameter.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "States diameter $4-x^2$." },
          { part: "b", points: 1, description: "Uses area $\\frac{\\pi}{8}(4-x^2)^2$." },
          { part: "b", points: 1, description: "Uses bounds $-2$ to $2$." },
          { part: "c", points: 1, description: "Explains radius is half the diameter and the cross section is half a circle." },
        ],
      },
      commonErrors: [
        "Using the diameter as the radius.",
        "Using full circles instead of semicircles.",
        "Finding area of the base instead of volume.",
      ],
      workedSolution: [
        { part: "a", explanation: "The vertical length in the base is $(4-x^2)-0=4-x^2$." },
        { part: "b", explanation: "The cross-section area is $\\frac12\\pi\\left(\\frac{4-x^2}{2}\\right)^2=\\frac{\\pi}{8}(4-x^2)^2$, so $V=\\int_{-2}^{2}\\frac{\\pi}{8}(4-x^2)^2\\,dx$." },
        { part: "c", explanation: "The diameter must be divided by $2$ to get the radius, and then the circle area must be halved." },
      ],
    },
  },
  {
    topicCode: "8.9",
    title: "Volume with the Disk Method: Revolving Around the x- or y-Axis",
    subtopic: "Using disks when the region touches the axis of rotation",
    mc: [
      {
        questionLatex:
          "\\text{The shaded region under }y=x+1\\text{ from }x=0\\text{ to }x=2\\text{ is revolved about the x-axis. Which integral gives the volume?}",
        difficulty: 2,
        skillTags: ["disk_method", "x_axis"],
        figure: diskXAxisFigure,
        choices: ["$\\pi\\int_0^2(x+1)^2\\,dx$", "$\\int_0^2(x+1)^2\\,dx$", "$\\pi\\int_0^2(x+1)\\,dx$", "$\\pi\\int_0^2x^2\\,dx$"],
        correctLetter: "A",
        hints: [
          "A disk radius is the distance from the axis to the curve.",
          "Around the x-axis, radius is $x+1$.",
          "Disk area is $\\pi r^2$.",
        ],
        solution: [{ step: 1, explanation: "Use disk method.", math: "V=\\pi\\int_0^2(x+1)^2\\,dx" }],
      },
      {
        questionLatex:
          "\\text{For the solid in the figure, what is the volume?}",
        difficulty: 2,
        skillTags: ["disk_method", "x_axis"],
        figure: diskXAxisFigure,
        choices: ["$\\frac{26\\pi}{3}$", "$8\\pi$", "$\\frac{8\\pi}{3}$", "$6\\pi$"],
        correctLetter: "A",
        hints: [
          "Use $\\pi\\int_0^2(x+1)^2\\,dx$.",
          "Antiderivative of $(x+1)^2$ is $(x+1)^3/3$.",
          "Evaluate from $0$ to $2$.",
        ],
        solution: [{ step: 1, explanation: "Evaluate disk volume.", math: "\\pi\\left[\\frac{(x+1)^3}{3}\\right]_0^2=\\frac{26\\pi}{3}" }],
      },
      {
        questionLatex:
          "\\text{The region between }x=0\\text{ and }x=y^2\\text{ for }0\\le y\\le3\\text{ is revolved about the y-axis. Which integral gives volume?}",
        difficulty: 3,
        skillTags: ["disk_method", "y_axis"],
        choices: ["$\\pi\\int_0^3 y^4\\,dy$", "$\\pi\\int_0^3 y^2\\,dy$", "$\\int_0^3 y^4\\,dy$", "$\\pi\\int_0^9 y^4\\,dy$"],
        correctLetter: "A",
        hints: [
          "Around the y-axis, use horizontal slices.",
          "The radius is the x-distance from $0$ to $y^2$.",
          "Square the radius.",
        ],
        solution: [{ step: 1, explanation: "Use y-axis disk radius.", math: "V=\\pi\\int_0^3(y^2)^2\\,dy" }],
      },
      {
        questionLatex:
          "\\text{A region touching the axis of rotation creates which cross sections when revolved?}",
        difficulty: 3,
        skillTags: ["disk_method", "conceptual"],
        choices: ["$\\text{Disks}$", "$\\text{Washers}$", "$\\text{Rectangles}$", "$\\text{Semicircles}$"],
        correctLetter: "A",
        hints: [
          "If the slice reaches the axis, there is no hole.",
          "A solid circular cross section is a disk.",
          "Washers occur when there is an inner radius.",
        ],
        solution: [{ step: 1, explanation: "No gap from axis means disk.", math: "A=\\pi r^2" }],
      },
      {
        questionLatex:
          "\\text{The region under }y=f(x)\\ge0\\text{ on }[a,b]\\text{ is revolved about the x-axis. Which expression is the disk-method volume?}",
        difficulty: 4,
        skillTags: ["disk_method", "general_setup"],
        choices: ["$\\pi\\int_a^b[f(x)]^2\\,dx$", "$\\int_a^b f(x)\\,dx$", "$2\\pi\\int_a^b f(x)\\,dx$", "$\\pi\\int_a^b f'(x)\\,dx$"],
        correctLetter: "A",
        hints: [
          "Radius is the y-value.",
          "Disk area is $\\pi r^2$.",
          "Integrate disk area along the x-axis.",
        ],
        solution: [{ step: 1, explanation: "State disk method.", math: "V=\\pi\\int_a^b[f(x)]^2\\,dx" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }R\\text{ be the region bounded by }y=x+1,\\ y=0,\\ x=0,\\text{ and }x=2.\\text{ The region is revolved about the x-axis.}",
      difficulty: 4,
      skillTags: ["disk_method", "x_axis", "graph_interpretation"],
      figure: diskXAxisFigure,
      parts: [
        { letter: "a", promptMarkdown: "Identify the radius of a typical disk.", points: 1 },
        { letter: "b", promptMarkdown: "Set up an integral for the volume.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the volume.", points: 1 },
      ],
      hints: [
        "Measure radius from the x-axis to the curve.",
        "Disk area is $\\pi r^2$.",
        "Use bounds $0$ and $2$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Identifies radius $x+1$." },
          { part: "b", points: 1, description: "Uses disk area $\\pi(x+1)^2$." },
          { part: "b", points: 1, description: "Uses bounds $0$ to $2$." },
          { part: "c", points: 1, description: "Evaluates volume as $26\\pi/3$." },
        ],
      },
      commonErrors: [
        "Using circumference instead of disk area.",
        "Forgetting to square the radius.",
        "Adding a nonexistent inner radius.",
      ],
      workedSolution: [
        { part: "a", explanation: "The radius is the distance from $y=0$ to $y=x+1$, so $r=x+1$." },
        { part: "b", explanation: "$V=\\pi\\int_0^2(x+1)^2\\,dx$." },
        { part: "c", explanation: "$V=\\pi[(x+1)^3/3]_0^2=26\\pi/3$." },
      ],
    },
  },
  {
    topicCode: "8.10",
    title: "Volume with the Disk Method: Revolving Around Other Axes",
    subtopic: "Measuring disk radii from non-coordinate axes",
    mc: [
      {
        questionLatex:
          "\\text{The region between }y=1\\text{ and }y=x+1\\text{ for }0\\le x\\le2\\text{ is revolved about }y=1.\\text{ Which integral gives volume?}",
        difficulty: 2,
        skillTags: ["disk_method", "other_axes"],
        figure: diskOtherAxisFigure,
        choices: ["$\\pi\\int_0^2x^2\\,dx$", "$\\pi\\int_0^2(x+1)^2\\,dx$", "$\\int_0^2x^2\\,dx$", "$\\pi\\int_0^2(1-x)^2\\,dx$"],
        correctLetter: "A",
        hints: [
          "Measure radius from the axis $y=1$ to the curve $y=x+1$.",
          "The radius is $(x+1)-1=x$.",
          "Use disk area $\\pi r^2$.",
        ],
        solution: [{ step: 1, explanation: "Measure from $y=1$.", math: "r=x\\Rightarrow V=\\pi\\int_0^2x^2\\,dx" }],
      },
      {
        questionLatex:
          "\\text{For the solid in the figure, what is the volume?}",
        difficulty: 2,
        skillTags: ["disk_method", "other_axes"],
        figure: diskOtherAxisFigure,
        choices: ["$\\frac{8\\pi}{3}$", "$\\frac{26\\pi}{3}$", "$4\\pi$", "$2\\pi$"],
        correctLetter: "A",
        hints: [
          "The radius is $x$.",
          "Use $\\pi\\int_0^2x^2\\,dx$.",
          "Evaluate $x^3/3$ from $0$ to $2$.",
        ],
        solution: [{ step: 1, explanation: "Evaluate disk volume.", math: "\\pi\\int_0^2x^2\\,dx=\\frac{8\\pi}{3}" }],
      },
      {
        questionLatex:
          "\\text{The region between }x=-1\\text{ and }x=y-1\\text{ for }1\\le y\\le4\\text{ is revolved about }x=-1.\\text{ Which radius is used?}",
        difficulty: 3,
        skillTags: ["disk_method", "other_axes", "y_axis"],
        choices: ["$y$", "$y-1$", "$y+1$", "$1-y$"],
        correctLetter: "A",
        hints: [
          "Radius is horizontal distance from $x=-1$ to $x=y-1$.",
          "Subtract left coordinate from right coordinate.",
          "$(y-1)-(-1)=y$.",
        ],
        solution: [{ step: 1, explanation: "Measure horizontal radius.", math: "r=(y-1)-(-1)=y" }],
      },
      {
        questionLatex:
          "\\text{A vertical strip from }y=2\\text{ to }y=5-x\\text{ is revolved about }y=2.\\text{ What is the disk radius?}",
        difficulty: 3,
        skillTags: ["disk_method", "other_axes"],
        choices: ["$3-x$", "$5-x$", "$x+3$", "$2$"],
        correctLetter: "A",
        hints: [
          "Measure from the axis $y=2$ to the upper curve.",
          "Radius is $(5-x)-2$.",
          "Simplify.",
        ],
        solution: [{ step: 1, explanation: "Measure vertical radius.", math: "r=5-x-2=3-x" }],
      },
      {
        questionLatex:
          "\\text{Why is }\\pi\\int_0^2(x+1)^2\\,dx\\text{ wrong for rotating the shown region about }y=1?",
        difficulty: 4,
        skillTags: ["disk_method", "other_axes", "error_analysis"],
        figure: diskOtherAxisFigure,
        choices: [
          "$\\text{It measures radius from the x-axis instead of from }y=1.$",
          "$\\text{It forgets the factor }\\pi.$",
          "$\\text{It should use washers.}$",
          "$\\text{It integrates over the wrong interval.}$",
        ],
        correctLetter: "A",
        hints: [
          "The axis of rotation is not the x-axis.",
          "Radius is always distance to the axis of rotation.",
          "From $y=1$ to $y=x+1$ is distance $x$.",
        ],
        solution: [{ step: 1, explanation: "Identify incorrect radius.", math: "(x+1)-1=x\\ne x+1" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }R\\text{ be the region bounded by }y=1,\\ y=x+1,\\ x=0,\\text{ and }x=2.\\text{ The region is revolved about }y=1.",
      difficulty: 4,
      skillTags: ["disk_method", "other_axes", "graph_interpretation"],
      figure: diskOtherAxisFigure,
      parts: [
        { letter: "a", promptMarkdown: "Explain why the cross sections are disks rather than washers.", points: 1 },
        { letter: "b", promptMarkdown: "Find the radius of a typical disk.", points: 1 },
        { letter: "c", promptMarkdown: "Set up and evaluate the volume.", points: 2 },
      ],
      hints: [
        "The region touches the rotation axis.",
        "Measure from $y=1$.",
        "Use $\\pi r^2$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Explains the slice touches the axis, so there is no hole." },
          { part: "b", points: 1, description: "Finds radius $x$." },
          { part: "c", points: 1, description: "Sets up $\\pi\\int_0^2x^2\\,dx$." },
          { part: "c", points: 1, description: "Evaluates $8\\pi/3$." },
        ],
      },
      commonErrors: [
        "Measuring from the x-axis instead of $y=1$.",
        "Using washer subtraction when the region touches the axis.",
        "Forgetting to square the radius.",
      ],
      workedSolution: [
        { part: "a", explanation: "Each vertical slice touches $y=1$, the axis of rotation, so revolving creates a solid disk with no hole." },
        { part: "b", explanation: "Radius is $(x+1)-1=x$." },
        { part: "c", explanation: "$V=\\pi\\int_0^2x^2\\,dx=8\\pi/3$." },
      ],
    },
  },
  {
    topicCode: "8.11",
    title: "Volume with the Washer Method: Revolving Around the x- or y-Axis",
    subtopic: "Using outer-radius squared minus inner-radius squared",
    mc: [
      {
        questionLatex:
          "\\text{The region between }y=\\sqrt x\\text{ and }y=\\frac{x}{2}\\text{ for }0\\le x\\le4\\text{ is revolved about the x-axis. Which integral gives volume?}",
        difficulty: 2,
        skillTags: ["washer_method", "x_axis"],
        figure: washerXAxisFigure,
        choices: [
          "$\\pi\\int_0^4\\left(x-\\frac{x^2}{4}\\right)\\,dx$",
          "$\\pi\\int_0^4\\left(\\sqrt x-\\frac{x}{2}\\right)^2\\,dx$",
          "$\\pi\\int_0^4\\left(\\frac{x^2}{4}-x\\right)\\,dx$",
          "$\\int_0^4\\left(x-\\frac{x^2}{4}\\right)\\,dx$",
        ],
        correctLetter: "A",
        hints: [
          "Outer radius is $\\sqrt x$.",
          "Inner radius is $x/2$.",
          "Washer area is $\\pi(R^2-r^2)$.",
        ],
        solution: [{ step: 1, explanation: "Set up washer area.", math: "\\pi\\int_0^4[(\\sqrt x)^2-(x/2)^2]\\,dx" }],
      },
      {
        questionLatex:
          "\\text{For the washer solid shown, what is the volume?}",
        difficulty: 2,
        skillTags: ["washer_method", "x_axis"],
        figure: washerXAxisFigure,
        choices: ["$\\frac{8\\pi}{3}$", "$\\frac{16\\pi}{3}$", "$8$", "$\\frac{4\\pi}{3}$"],
        correctLetter: "A",
        hints: [
          "Use $\\pi\\int_0^4(x-x^2/4)\\,dx$.",
          "Antiderivative is $x^2/2-x^3/12$.",
          "Evaluate at $4$.",
        ],
        solution: [{ step: 1, explanation: "Evaluate the washer integral.", math: "\\pi\\left[\\frac{x^2}{2}-\\frac{x^3}{12}\\right]_0^4=\\frac{8\\pi}{3}" }],
      },
      {
        questionLatex:
          "\\text{The region between }x=\\sqrt y\\text{ and }x=y\\text{ for }0\\le y\\le1\\text{ is revolved about the y-axis. Which integral gives volume?}",
        difficulty: 3,
        skillTags: ["washer_method", "y_axis"],
        choices: ["$\\pi\\int_0^1(y-y^2)\\,dy$", "$\\pi\\int_0^1(\\sqrt y-y)^2\\,dy$", "$\\pi\\int_0^1(y^2-y)\\,dy$", "$\\int_0^1(y-y^2)\\,dy$"],
        correctLetter: "A",
        hints: [
          "Around the y-axis, use horizontal slices.",
          "Outer radius is $\\sqrt y$ and inner radius is $y$.",
          "Square each radius separately.",
        ],
        solution: [{ step: 1, explanation: "Set up washer integral.", math: "\\pi\\int_0^1[(\\sqrt y)^2-y^2]\\,dy=\\pi\\int_0^1(y-y^2)\\,dy" }],
      },
      {
        questionLatex:
          "\\text{A washer has outer radius }R(x)\\text{ and inner radius }r(x).\\text{ What is its cross-section area?}",
        difficulty: 3,
        skillTags: ["washer_method", "conceptual"],
        choices: ["$\\pi(R(x)^2-r(x)^2)$", "$\\pi(R(x)-r(x))^2$", "$2\\pi(R(x)-r(x))$", "$R(x)^2-r(x)^2$"],
        correctLetter: "A",
        rationales: {
          B: "The radii are squared separately; washer area is big disk minus small disk.",
          C: "This resembles circumference, not area.",
          D: "This omits the factor $\\pi$.",
        },
        hints: [
          "A washer is a large disk with a smaller disk removed.",
          "Area of the outer disk is $\\pi R^2$.",
          "Area of the inner disk is $\\pi r^2$.",
        ],
        solution: [{ step: 1, explanation: "Subtract disk areas.", math: "\\pi R^2-\\pi r^2=\\pi(R^2-r^2)" }],
      },
      {
        questionLatex:
          "\\text{Why is }\\pi\\int_0^4(\\sqrt x-x/2)^2\\,dx\\text{ wrong for the washer figure about the x-axis?}",
        difficulty: 4,
        skillTags: ["washer_method", "error_analysis"],
        figure: washerXAxisFigure,
        choices: [
          "$\\text{It squares the thickness instead of subtracting squared radii.}$",
          "$\\text{It uses the wrong interval.}$",
          "$\\text{It forgets the factor }\\pi.$",
          "$\\text{It should integrate with respect to }y.$",
        ],
        correctLetter: "A",
        hints: [
          "Washer area is outer disk minus inner disk.",
          "The thickness is not the radius of a disk.",
          "Use $R^2-r^2$, not $(R-r)^2$.",
        ],
        solution: [{ step: 1, explanation: "Compare formulas.", math: "R^2-r^2\\ne(R-r)^2" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }R\\text{ be the region bounded by }y=\\sqrt x\\text{ and }y=\\frac{x}{2}\\text{ for }0\\le x\\le4.\\text{ The region is revolved about the x-axis.}",
      difficulty: 4,
      skillTags: ["washer_method", "x_axis", "graph_interpretation"],
      figure: washerXAxisFigure,
      parts: [
        { letter: "a", promptMarkdown: "Identify the outer and inner radii for a typical washer.", points: 2 },
        { letter: "b", promptMarkdown: "Set up an integral for the volume.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the volume.", points: 1 },
      ],
      hints: [
        "Measure both radii from the x-axis.",
        "The upper curve gives the outer radius.",
        "Use $\\pi(R^2-r^2)$.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Identifies outer radius $\\sqrt x$." },
          { part: "a", points: 1, description: "Identifies inner radius $x/2$." },
          { part: "b", points: 1, description: "Uses $\\pi(R^2-r^2)$." },
          { part: "b", points: 1, description: "Uses bounds $0$ to $4$." },
          { part: "c", points: 1, description: "Evaluates $8\\pi/3$." },
        ],
      },
      commonErrors: [
        "Using $(R-r)^2$.",
        "Reversing outer and inner radii.",
        "Forgetting the hole in the washer.",
      ],
      workedSolution: [
        { part: "a", explanation: "The outer radius is $\\sqrt x$ and the inner radius is $x/2$." },
        { part: "b", explanation: "$V=\\pi\\int_0^4[(\\sqrt x)^2-(x/2)^2]\\,dx=\\pi\\int_0^4(x-x^2/4)\\,dx$." },
        { part: "c", explanation: "$V=\\pi[x^2/2-x^3/12]_0^4=8\\pi/3$." },
      ],
    },
  },
  {
    topicCode: "8.12",
    title: "Volume with the Washer Method: Revolving Around Other Axes",
    subtopic: "Measuring outer and inner radii from shifted axes",
    mc: [
      {
        questionLatex:
          "\\text{The region between }y=x\\text{ and }y=x^2\\text{ for }0\\le x\\le1\\text{ is revolved about }y=2.\\text{ Which integral gives volume?}",
        difficulty: 2,
        skillTags: ["washer_method", "other_axes"],
        figure: washerOtherAxisFigure,
        choices: [
          "$\\pi\\int_0^1\\left((2-x^2)^2-(2-x)^2\\right)\\,dx$",
          "$\\pi\\int_0^1\\left((2-x)^2-(2-x^2)^2\\right)\\,dx$",
          "$\\pi\\int_0^1(x-x^2)^2\\,dx$",
          "$\\pi\\int_0^1(x^2-x)\\,dx$",
        ],
        correctLetter: "A",
        hints: [
          "The axis $y=2$ is above both curves.",
          "Outer radius reaches the lower curve $y=x^2$.",
          "Inner radius reaches the upper curve $y=x$.",
        ],
        solution: [{ step: 1, explanation: "Measure radii from $y=2$.", math: "R=2-x^2,\\quad r=2-x" }],
      },
      {
        questionLatex:
          "\\text{For the washer solid shown around }y=2,\\text{ what is the volume?}",
        difficulty: 2,
        skillTags: ["washer_method", "other_axes"],
        figure: washerOtherAxisFigure,
        choices: ["$\\frac{8\\pi}{15}$", "$\\frac{\\pi}{30}$", "$\\frac{\\pi}{6}$", "$\\frac{8}{15}$"],
        correctLetter: "A",
        hints: [
          "Use the washer setup from the figure.",
          "Simplify $(2-x^2)^2-(2-x)^2$.",
          "Integrate $4x-5x^2+x^4$ from $0$ to $1$.",
        ],
        solution: [{ step: 1, explanation: "Evaluate the washer integral.", math: "\\pi\\int_0^1(4x-5x^2+x^4)\\,dx=\\frac{8\\pi}{15}" }],
      },
      {
        questionLatex:
          "\\text{The region between }x=y\\text{ and }x=y^2\\text{ for }0\\le y\\le1\\text{ is revolved about }x=-1.\\text{ Which are the outer and inner radii?}",
        difficulty: 3,
        skillTags: ["washer_method", "other_axes", "y_axis"],
        choices: ["$R=y+1,\\ r=y^2+1$", "$R=y^2+1,\\ r=y+1$", "$R=y-y^2,\\ r=1$", "$R=y,\\ r=y^2$"],
        correctLetter: "A",
        hints: [
          "The axis is left of the region.",
          "On $0<y<1$, $x=y$ is to the right of $x=y^2$.",
          "Measure distance from $x=-1$ to each curve.",
        ],
        solution: [{ step: 1, explanation: "Measure horizontal radii.", math: "R=y-(-1)=y+1,\\quad r=y^2-(-1)=y^2+1" }],
      },
      {
        questionLatex:
          "\\text{A region between }y=0\\text{ and }y=f(x)\\text{ is revolved about }y=-3.\\text{ Which radius is farther from the axis?}",
        difficulty: 3,
        skillTags: ["washer_method", "other_axes", "conceptual"],
        choices: ["$f(x)+3$", "$3$", "$f(x)$", "$f(x)-3$"],
        correctLetter: "A",
        hints: [
          "The axis is below the region.",
          "The upper curve is farther from $y=-3$ than the x-axis is.",
          "Distance from $y=-3$ to $y=f(x)$ is $f(x)+3$.",
        ],
        solution: [{ step: 1, explanation: "Measure from shifted axis.", math: "R=f(x)-(-3)=f(x)+3" }],
      },
      {
        questionLatex:
          "\\text{For rotation about }y=2\\text{ in the shown figure, why is the lower curve }y=x^2\\text{ used for the outer radius?}",
        difficulty: 4,
        skillTags: ["washer_method", "other_axes", "graph_interpretation"],
        figure: washerOtherAxisFigure,
        choices: [
          "$\\text{It is farther from the axis }y=2\\text{ than }y=x\\text{ is.}$",
          "$\\text{It is closer to the axis }y=2\\text{ than }y=x\\text{ is.}$",
          "$\\text{It has the larger y-value on }(0,1).$",
          "$\\text{Outer radius always comes from the top curve.}$",
        ],
        correctLetter: "A",
        hints: [
          "Outer means farther from the axis, not necessarily top curve.",
          "The axis is above both curves.",
          "The lower curve is farther below $y=2$.",
        ],
        solution: [{ step: 1, explanation: "Measure distances to axis.", math: "2-x^2>2-x\\text{ on }(0,1)" }],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }R\\text{ be the region between }y=x\\text{ and }y=x^2\\text{ for }0\\le x\\le1.\\text{ The region is revolved about }y=2.",
      difficulty: 5,
      skillTags: ["washer_method", "other_axes", "graph_interpretation", "error_analysis"],
      figure: washerOtherAxisFigure,
      parts: [
        { letter: "a", promptMarkdown: "Identify the outer radius and inner radius of a typical washer.", points: 2 },
        { letter: "b", promptMarkdown: "Set up an integral for the volume.", points: 2 },
        { letter: "c", promptMarkdown: "Evaluate the volume.", points: 1 },
        { letter: "d", promptMarkdown: "A student writes $\\pi\\int_0^1(x-x^2)^2\\,dx$. Explain the student's error.", points: 1 },
      ],
      hints: [
        "The axis of rotation is above the region.",
        "Outer radius is the larger distance to $y=2$.",
        "Do not square the thickness between curves.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Identifies outer radius $2-x^2$." },
          { part: "a", points: 1, description: "Identifies inner radius $2-x$." },
          { part: "b", points: 1, description: "Uses washer area $\\pi(R^2-r^2)$." },
          { part: "b", points: 1, description: "Uses bounds $0$ to $1$." },
          { part: "c", points: 1, description: "Evaluates volume $8\\pi/15$." },
          { part: "d", points: 1, description: "Explains the student squared the vertical thickness instead of subtracting squared radii measured from $y=2$." },
        ],
      },
      commonErrors: [
        "Using top minus bottom as a disk radius.",
        "Reversing outer and inner radii because the axis is above the region.",
        "Squaring the thickness instead of each radius.",
      ],
      workedSolution: [
        { part: "a", explanation: "Since the axis $y=2$ is above the region, the lower curve $y=x^2$ is farther from the axis. Thus $R=2-x^2$ and $r=2-x$." },
        { part: "b", explanation: "$V=\\pi\\int_0^1[(2-x^2)^2-(2-x)^2]\\,dx$." },
        { part: "c", explanation: "The integrand simplifies to $4x-5x^2+x^4$, so $V=\\pi[2x^2-5x^3/3+x^5/5]_0^1=8\\pi/15$." },
        { part: "d", explanation: "The expression $(x-x^2)^2$ is the square of the region's thickness. A washer around $y=2$ requires subtracting the squares of distances from the axis: $(2-x^2)^2-(2-x)^2$." },
      ],
    },
  },
];

export const applicationIntegrationTopics: Topic[] = topicSeeds.map(makeTopic);
