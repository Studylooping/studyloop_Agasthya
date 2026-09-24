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
const UNIT = "u5-mensuration";
const VERSION = "0.3.3";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;
const CHOICE_ROTATIONS: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0],
  [2, 3, 3, 3, 3],
  [3, 3, 3, 3, 3],
  [3, 3, 3, 3, 3],
  [3, 3, 3, 3, 3],
];

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type McSolutionSeed = Omit<SolutionStep, "step"> & { step?: number };
type FrqSolutionSeed = FrqSolutionPart & { math?: string };

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
  solution: readonly McSolutionSeed[];
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
  workedSolution: readonly FrqSolutionSeed[];
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
  return `You chose ${choiceText}. Recheck the formula, units, and the measurement that belongs to the question.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_mensuration_formula_or_units"),
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "chooses_a_formula_without_matching_the_given_shape",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      ...step,
      step: step.step ?? stepIndex + 1,
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "does_not_keep_area_volume_and_perimeter_units_separate",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: [...seed.parts],
    hintLadder: hints(seed.hints),
    rubric: seed.rubric,
    commonErrors: [...seed.commonErrors],
    workedSolution: seed.workedSolution.map(({ math, ...part }) => ({
      ...part,
      explanation: math ? `${part.explanation}\n\n$${math}$` : part.explanation,
    })),
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

const areaGridFigure: ItemFigure = {
  type: "svg",
  title: "Rectangle and parallelogram area comparison",
  description:
    "A rectangle and a parallelogram are shown with their bases and perpendicular heights marked.",
  svg: `<svg viewBox="0 0 560 320" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="320" fill="#ffffff"/>
  <defs>
    <pattern id="smallGridU5Area" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" stroke-width="1"/>
    </pattern>
  </defs>
  <rect x="38" y="34" width="484" height="244" fill="url(#smallGridU5Area)" stroke="#cbd5e1" stroke-width="1"/>
  <rect x="82" y="96" width="144" height="96" fill="#dbeafe" stroke="#2563eb" stroke-width="3" rx="3"/>
  <text x="126" y="86" font-size="16" fill="#1e3a8a">rectangle</text>
  <text x="129" y="218" font-size="15" fill="#111827">12 cm</text>
  <text x="42" y="148" font-size="15" fill="#111827">5 cm</text>
  <path d="M326 192 L446 192 L490 96 L370 96 Z" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <line x1="370" y1="96" x2="370" y2="192" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 5"/>
  <path d="M370 176 L386 176 L386 192" fill="none" stroke="#dc2626" stroke-width="2"/>
  <text x="386" y="86" font-size="16" fill="#166534">parallelogram</text>
  <text x="363" y="218" font-size="15" fill="#111827">10 cm</text>
  <text x="382" y="148" font-size="15" fill="#dc2626">6 cm</text>
</svg>`,
};

const sectorFigure: ItemFigure = {
  type: "svg",
  title: "Circular sector with marked radius and angle",
  description:
    "A quarter-sector is drawn inside a circle, with the radius and central angle marked for sector-area and arc-length work.",
  svg: `<svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="360" fill="#ffffff"/>
  <circle cx="245" cy="185" r="110" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <path d="M245 185 L245 75 A110 110 0 0 1 355 185 Z" fill="#fed7aa" stroke="#f97316" stroke-width="3"/>
  <line x1="245" y1="185" x2="245" y2="75" stroke="#2563eb" stroke-width="3"/>
  <line x1="245" y1="185" x2="355" y2="185" stroke="#2563eb" stroke-width="3"/>
  <path d="M245 145 A40 40 0 0 1 285 185" fill="none" stroke="#ea580c" stroke-width="4"/>
  <text x="289" y="158" font-size="18" fill="#ea580c">90&#176;</text>
  <text x="256" y="126" font-size="16" fill="#1d4ed8">r = 14</text>
  <text x="278" y="207" font-size="16" fill="#1d4ed8">r</text>
  <text x="190" y="320" font-size="15" fill="#475569">sector and arc are measured from the centre</text>
</svg>`,
};

const heronTriangleFigure: ItemFigure = {
  type: "svg",
  title: "Triangle with all three side lengths marked",
  description:
    "A scalene triangle is shown with side lengths 13 cm, 14 cm, and 15 cm marked, suitable for Heron's formula.",
  svg: `<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="340" fill="#ffffff"/>
  <path d="M130 250 L390 250 L270 82 Z" fill="#eef2ff" stroke="#4f46e5" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="130" cy="250" r="5" fill="#4f46e5"/>
  <circle cx="390" cy="250" r="5" fill="#4f46e5"/>
  <circle cx="270" cy="82" r="5" fill="#4f46e5"/>
  <text x="252" y="73" font-size="16" fill="#111827">A</text>
  <text x="104" y="274" font-size="16" fill="#111827">B</text>
  <text x="398" y="274" font-size="16" fill="#111827">C</text>
  <text x="232" y="274" font-size="17" fill="#111827">14 cm</text>
  <text x="134" y="160" font-size="17" fill="#111827">13 cm</text>
  <text x="345" y="160" font-size="17" fill="#111827">15 cm</text>
  <text x="164" y="36" font-size="17" fill="#475569">Use all three sides; no height is given.</text>
</svg>`,
};

const boxCylinderFigure: ItemFigure = {
  type: "svg",
  title: "Cuboid and cylinder measurements",
  description:
    "A cuboid and a cylinder are shown with clear dimensions for surface area and volume questions.",
  svg: `<svg viewBox="0 0 580 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="580" height="330" fill="#ffffff"/>
  <path d="M92 112 L232 112 L278 72 L138 72 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <path d="M232 112 L278 72 L278 190 L232 230 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <path d="M92 112 L232 112 L232 230 L92 230 Z" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <text x="130" y="255" font-size="15" fill="#111827">length</text>
  <text x="248" y="214" font-size="15" fill="#111827">height</text>
  <text x="194" y="88" font-size="15" fill="#111827">breadth</text>
  <ellipse cx="432" cy="92" rx="62" ry="20" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <path d="M370 92 L370 226" stroke="#d97706" stroke-width="3"/>
  <path d="M494 92 L494 226" stroke="#d97706" stroke-width="3"/>
  <ellipse cx="432" cy="226" rx="62" ry="20" fill="#fde68a" stroke="#d97706" stroke-width="3"/>
  <line x1="432" y1="92" x2="494" y2="92" stroke="#16a34a" stroke-width="3"/>
  <text x="449" y="83" font-size="15" fill="#166534">r</text>
  <text x="507" y="166" font-size="15" fill="#111827">h</text>
  <text x="394" y="279" font-size="16" fill="#92400e">cylinder</text>
</svg>`,
};

const solidComparisonFigure: ItemFigure = {
  type: "svg",
  title: "Cone, sphere, hemisphere and square pyramid",
  description:
    "Four common solids are labelled without answer-giving measurements.",
  svg: `<svg viewBox="0 0 620 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="330" fill="#ffffff"/>
  <path d="M98 70 L38 230 L158 230 Z" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <ellipse cx="98" cy="230" rx="60" ry="18" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
  <line x1="98" y1="70" x2="98" y2="230" stroke="#991b1b" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="70" y="276" font-size="16" fill="#7f1d1d">cone</text>
  <circle cx="266" cy="158" r="72" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <path d="M194 158 A72 72 0 0 0 338 158" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="5 5"/>
  <text x="238" y="276" font-size="16" fill="#14532d">sphere</text>
  <path d="M404 178 A64 64 0 0 1 532 178 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/>
  <ellipse cx="468" cy="178" rx="64" ry="16" fill="#bae6fd" stroke="#0284c7" stroke-width="3"/>
  <text x="427" y="276" font-size="16" fill="#0c4a6e">hemisphere</text>
  <path d="M548 222 L590 190 L576 240 L530 256 Z" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/>
  <path d="M560 92 L548 222 L590 190 Z" fill="#f5f3ff" stroke="#7c3aed" stroke-width="3"/>
  <path d="M560 92 L576 240 L590 190" fill="none" stroke="#7c3aed" stroke-width="3"/>
  <text x="523" y="276" font-size="16" fill="#4c1d95">pyramid</text>
</svg>`,
};

const iceCreamModelFigure: ItemFigure = {
  type: "svg",
  title: "Cone and hemisphere model",
  description:
    "A hemisphere joined to a cone, with radius and vertical height marked.",
  svg: `<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="20" y="20" width="480" height="300" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M190 150 A70 70 0 0 1 330 150 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <ellipse cx="260" cy="150" rx="70" ry="18" fill="#bfdbfe" stroke="#2563eb" stroke-width="3" stroke-dasharray="7 5"/>
  <path d="M190 150 L260 260 L330 150 Z" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <line x1="260" y1="150" x2="260" y2="260" stroke="#92400e" stroke-width="2" stroke-dasharray="6 5"/>
  <line x1="260" y1="150" x2="330" y2="150" stroke="#1d4ed8" stroke-width="2"/>
  <text x="284" y="140" font-size="16" fill="#1d4ed8">r = 3 cm</text>
  <text x="270" y="214" font-size="16" fill="#92400e">h = 4 cm</text>
  <text x="160" y="82" font-size="17" fill="#1e3a8a">hemisphere</text>
  <text x="226" y="292" font-size="17" fill="#92400e">cone</text>
  <text x="138" y="122" font-size="14" fill="#475569">common circular face is not exposed</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Perimeter, Area and Units",
    subtopic:
      "Dimensions, unit conversion, perimeter, and area of rectangles, squares, parallelograms, and triangles.",
    mc: [
      {
        questionLatex: L`A rectangular courtyard has perimeter $34\text{ m}$. Its length is $3\text{ m}$ more than its breadth. Its area is`,
        difficulty: 2,
        skillTags: ["rectangle_area", "area_units"],
        choices: [
          L`$70\text{ m}^2$`,
          L`$34\text{ m}^2$`,
          L`$77\text{ m}^2$`,
          L`$140\text{ m}^2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "That reuses the perimeter data instead of finding the two dimensions.",
          C: "That uses $11\\times7$ even though the perimeter condition gives $10$ m and $7$ m.",
          D: "That doubles the actual rectangular area.",
        },
        hints: [
          "Let the breadth be $x$ metres.",
          "Then length is $x+3$ and $2(l+b)=34$.",
          "After finding the two dimensions, multiply them for area.",
        ],
        solution: [
          {
            explanation:
              "Let breadth be $x$ metres, so length is $x+3$ metres.",
            math: L`2(x+x+3)=34\Rightarrow 4x+6=34\Rightarrow x=7`,
          },
          {
            explanation: "So the dimensions are $7$ m and $10$ m.",
            math: L`A=10\times7=70\text{ m}^2`,
          },
        ],
      },
      {
        questionLatex: L`A square and a rectangle have the same perimeter, $36\text{ cm}$. The rectangle is $11\text{ cm}$ by $7\text{ cm}$. How much greater is the area of the square?`,
        difficulty: 3,
        skillTags: ["square_perimeter", "square_area"],
        choices: [
          L`$36\text{ cm}^2$`,
          L`$4\text{ cm}^2$`,
          L`$81\text{ cm}^2$`,
          L`$77\text{ cm}^2$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "That is the common perimeter, not an area difference.",
          C: "That is the square's area before comparing it with the rectangle.",
          D: "That is the rectangle's area before subtracting.",
        },
        hints: [
          "A square has four equal sides.",
          "Find the square's area and the rectangle's area separately.",
          "Subtract the rectangle area from the square area.",
        ],
        solution: [
          {
            explanation:
              "The square side is one-fourth of the common perimeter.",
          },
          {
            explanation: "Compare the two areas.",
            math: L`s=36/4=9,\quad A_{\text{square}}=81,\quad A_{\text{rectangle}}=11\times7=77`,
          },
          {
            explanation: "The square is larger by",
            math: L`81-77=4\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A triangle and a parallelogram stand on the same base and between the same parallels. If the triangle has area $36\text{ cm}^2$, the area of the parallelogram is`,
        difficulty: 3,
        skillTags: [
          "parallelogram_area",
          "triangle_area",
          "same_base_same_parallels",
        ],
        choices: [
          L`$36\text{ cm}^2$`,
          L`$144\text{ cm}^2$`,
          L`$72\text{ cm}^2$`,
          L`$18\text{ cm}^2$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The triangle is half the parallelogram on the same base and height.",
          B: "This doubles twice.",
          D: "This halves the triangle again.",
        },
        hints: [
          "Same base and same parallels means the same perpendicular height.",
          "A triangle is half of the parallelogram on the same base and height.",
          "Double $36\\text{ cm}^2$.",
        ],
        solution: [
          {
            explanation:
              "With the same base and height, the parallelogram has twice the triangle's area.",
            math: L`A_{\text{parallelogram}}=2\times36=72\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A triangular field has area $63\text{ m}^2$ and base $14\text{ m}$. Its perpendicular height is`,
        difficulty: 2,
        skillTags: ["triangle_area", "height_from_area"],
        choices: [
          L`$18\text{ m}$`,
          L`$4.5\text{ m}$`,
          L`$63\text{ m}$`,
          L`$9\text{ m}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "That forgets the factor $\\frac12$ in the triangle area formula.",
          B: "That divides by the full base after already halving.",
          C: "That repeats the area value as a length.",
        },
        hints: [
          "Use the triangle area formula in reverse.",
          "$63=\\frac12\\times14\\times h$.",
          "So $7h=63$.",
        ],
        solution: [
          {
            explanation:
              "Substitute the given area and base into the triangle area formula.",
            math: L`63=\frac12\times14\times h=7h\Rightarrow h=9\text{ m}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: A median of a triangle divides the triangle into two equal areas. Reason: The two smaller triangles have equal bases on the same height. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["median_equal_area", "assertion_reason"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is not merely true; it is exactly why the two areas are equal.",
          C: "The bases are equal because a median bisects the opposite side, and the height is common.",
          D: "The assertion is a standard area result for medians.",
        },
        hints: [
          "A median bisects the opposite side.",
          "The two triangles share the same altitude from the opposite vertex.",
          "Equal bases with the same height give equal areas.",
        ],
        solution: [
          {
            explanation:
              "A median creates two triangles with equal bases and a common height, so their areas are equal.",
            math: L`\frac12\cdot b_1\cdot h=\frac12\cdot b_2\cdot h\quad\text{when }b_1=b_2`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $3\text{ m}$ ribbon exactly goes around the boundary of a rectangular notice board. If the board is $80\text{ cm}$ long, find its breadth.`,
        difficulty: 2,
        skillTags: ["unit_conversion", "rectangle_perimeter"],
        parts: singlePart("a", "Find the breadth in centimetres.", 2),
        hints: [
          "First convert $3\\text{ m}$ into centimetres.",
          "The ribbon length is the rectangle's perimeter.",
          "Use $2(l+b)=300$ with $l=80$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Converts $3\\text{ m}$ to $300\\text{ cm}$ and finds breadth $70\\text{ cm}$.",
        ),
        commonErrors: [
          "Using $3$ directly with centimetre dimensions.",
          "Forgetting that perimeter is twice the sum of length and breadth.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Convert the ribbon length to centimetres.",
            math: L`3\text{ m}=300\text{ cm}`,
          },
          {
            part: "a",
            explanation: "Use the rectangle perimeter formula.",
            math: L`2(80+b)=300\Rightarrow 80+b=150\Rightarrow b=70\text{ cm}`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A parallelogram has area $84\text{ cm}^2$ and base $12\text{ cm}$. Find its perpendicular height.`,
        difficulty: 2,
        skillTags: ["parallelogram_area", "height_from_area"],
        parts: singlePart("a", "Find the perpendicular height.", 1),
        hints: [
          "Area of a parallelogram is base times perpendicular height.",
          "Write $84=12h$.",
          "Divide by $12$.",
        ],
        rubric: singleRubric("a", 1, "Finds the perpendicular height as 7 cm."),
        commonErrors: [
          "Using the slant side idea instead of perpendicular height.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use $A=bh$.",
            math: L`84=12h\Rightarrow h=7\text{ cm}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A classroom floor is $8\text{ m}$ long and $6\text{ m}$ wide. How many $1\text{ m}^2$ tiles are needed to cover it without gaps?`,
        difficulty: 2,
        skillTags: ["rectangle_area", "area_application"],
        parts: singlePart("a", "Find the number of tiles.", 2),
        hints: [
          "First find the area of the floor.",
          "Each tile covers $1\\text{ m}^2$.",
          "Number of tiles equals total area divided by tile area.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds floor area as 48 square metres.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes that 48 tiles are needed.",
            },
          ],
        },
        commonErrors: [
          "Using perimeter instead of area.",
          "Writing square metres but not converting it into number of tiles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The floor area is length times breadth.",
            math: L`8\times6=48\text{ m}^2`,
          },
          {
            part: "a",
            explanation:
              "Each tile covers $1\\text{ m}^2$, so 48 such tiles are required.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A triangle has area $54\text{ cm}^2$. A median is drawn from one vertex. Find the area of each of the two smaller triangles and give the reason.`,
        difficulty: 2,
        skillTags: ["median_equal_area", "area_reasoning"],
        parts: singlePart("a", "Find both areas and justify.", 2),
        hints: [
          "A median divides the opposite side into two equal parts.",
          "The two smaller triangles have the same height.",
          "So the two areas are equal and add to $54\\text{ cm}^2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds each area as 27 square centimetres.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Explains using equal bases and the same height, or the median area theorem.",
            },
          ],
        },
        commonErrors: [
          "Dividing the side lengths instead of the area.",
          "Giving 27 without any reason.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The median divides the triangle into two equal-area triangles.",
            math: L`\frac{54}{2}=27`,
          },
          {
            part: "a",
            explanation:
              "Each smaller triangle has area $27\\text{ cm}^2$ because their bases are equal and their height is common.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A rectangular garden is $18\text{ m}$ long and $12\text{ m}$ wide. Inside it, a triangular flower bed has base $8\text{ m}$ and height $5\text{ m}$.`,
        difficulty: 3,
        skillTags: ["rectangle_area", "triangle_area", "composite_area"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the perimeter of the garden.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the area of the triangular flower bed.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the remaining garden area outside the flower bed.",
            points: 2,
          },
        ],
        hints: [
          "Use perimeter for the outer boundary.",
          "Use half base times height for the flower bed.",
          "Subtract the triangular area from the rectangular area.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds perimeter as 60 m.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds triangular area as 20 square metres.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds rectangle area as 216 square metres.",
            },
            {
              part: "c",
              points: 1,
              description: "Subtracts correctly to get 196 square metres.",
            },
          ],
        },
        commonErrors: [
          "Subtracting perimeters instead of areas.",
          "Forgetting the half in triangle area.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The perimeter of the rectangle is twice the sum of length and breadth.",
            math: L`2(18+12)=60\text{ m}`,
          },
          {
            part: "b",
            explanation: "The flower bed is triangular.",
            math: L`\frac12\times8\times5=20\text{ m}^2`,
          },
          {
            part: "c",
            explanation:
              "The rectangular garden area is $18\\times12=216\\text{ m}^2$. Subtract the flower bed area.",
            math: L`216-20=196\text{ m}^2`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Circles, Arcs and Sectors",
    subtopic:
      "Circumference, area of circle, arc length, sector area, and simple applications.",
    mc: [
      {
        questionLatex: L`A wire of length $44\text{ cm}$ is bent into a circle. The area enclosed by the circle, using $\pi=\frac{22}{7}$, is`,
        difficulty: 2,
        skillTags: ["circle_area"],
        choices: [
          L`$44\text{ cm}^2$`,
          L`$154\text{ cm}^2$`,
          L`$49\text{ cm}^2$`,
          L`$308\text{ cm}^2$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "That repeats the wire length as an area.",
          C: "That is only $r^2$ after finding the radius; multiply by $\\pi$ also.",
          D: "That doubles the correct area.",
        },
        hints: [
          "The wire length becomes the circumference.",
          "First solve $2\\pi r=44$.",
          "Then use $A=\\pi r^2$.",
        ],
        solution: [
          {
            explanation:
              "The circumference is $44\\text{ cm}$, so find the radius first.",
            math: L`2\times\frac{22}{7}\times r=44\Rightarrow r=7`,
          },
          {
            explanation: "Use the circle area formula.",
            math: L`A=\frac{22}{7}\times7^2=154\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A garden gate is shaped like a semicircle of radius $14\text{ cm}$. The metal strip runs around the curved edge and the diameter. Its total length is`,
        difficulty: 2,
        skillTags: ["semicircle_perimeter", "circle_arc"],
        choices: [
          L`$44\text{ cm}$`,
          L`$88\text{ cm}$`,
          L`$72\text{ cm}$`,
          L`$58\text{ cm}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "That counts only the curved part of the semicircle.",
          B: "That is the full circumference of the circle.",
          D: "This adds only one radius instead of the diameter.",
        },
        hints: [
          "A semicircle boundary has a curved part and a straight diameter.",
          "Curved part is half the circumference.",
          "Add $2r$ to the semicircular arc.",
        ],
        solution: [
          {
            explanation:
              "The semicircular arc is $\\pi r=44\\text{ cm}$, and the diameter is $28\\text{ cm}$.",
            math: L`44+28=72\text{ cm}`,
          },
        ],
      },
      {
        questionLatex: L`In a circle of radius $21\text{ cm}$, the length of an arc subtending $60^\circ$ at the centre is`,
        difficulty: 2,
        skillTags: ["arc_length", "central_angle"],
        choices: [
          L`$44\text{ cm}$`,
          L`$66\text{ cm}$`,
          L`$11\text{ cm}$`,
          L`$22\text{ cm}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "That uses one-third of the circumference; $60^\\circ$ is one-sixth of a full circle.",
          B: "That is half the circumference.",
          C: "That uses half of the required arc.",
        },
        hints: [
          "A full circle is $360^\\circ$.",
          "The arc is $60/360$ of the circumference.",
          "The circumference is $2\\pi\\times21=132\\text{ cm}$.",
        ],
        solution: [
          {
            explanation:
              "The required arc is one-sixth of the full circumference.",
            math: L`\frac{60}{360}\times2\times\frac{22}{7}\times21=22\text{ cm}`,
          },
        ],
      },
      {
        questionLatex: L`The area of a $90^\circ$ sector of a circle of radius $14\text{ cm}$ is`,
        difficulty: 2,
        skillTags: ["sector_area"],
        figure: sectorFigure,
        choices: [
          L`$154\text{ cm}^2$`,
          L`$616\text{ cm}^2$`,
          L`$44\text{ cm}^2$`,
          L`$308\text{ cm}^2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "That is the area of the whole circle.",
          C: "That is a length, not an area.",
          D: "That is half of the circle, but $90^\\circ$ is one-quarter.",
        },
        hints: [
          "$90^\\circ$ is one-fourth of $360^\\circ$.",
          "Find the full circle area first.",
          "Take one-fourth of $\\pi r^2$.",
        ],
        solution: [
          {
            explanation: "A $90^\\circ$ sector is one-fourth of the circle.",
            math: L`\frac{90}{360}\times\frac{22}{7}\times14^2=154\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: For the same circle, sector area is proportional to the central angle. Reason: A sector of angle $\theta^\circ$ has area $\frac{\theta}{360}\pi r^2$. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["sector_area", "assertion_reason"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The formula directly explains the proportionality when $r$ is fixed.",
          C: "The reason states the standard sector-area formula.",
          D: "The assertion is true for a fixed circle.",
        },
        hints: [
          "For the same circle, $r$ does not change.",
          "Only the fraction $\\theta/360$ changes.",
          "So a larger central angle gives a proportionally larger sector.",
        ],
        solution: [
          {
            explanation:
              "With the same radius, $\\pi r^2$ is constant, so sector area varies directly with $\\theta$.",
            math: L`A_{\text{sector}}=\frac{\theta}{360}\pi r^2`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A wheel of diameter $20\text{ cm}$ makes $15$ complete rotations without slipping. Find the distance covered in terms of $\pi$.`,
        difficulty: 2,
        skillTags: ["circle_circumference", "diameter_radius", "rotations"],
        parts: singlePart("a", "Find the distance covered.", 2),
        hints: [
          "One rotation covers one circumference.",
          "Use $C=\\pi d$ for one rotation.",
          "Multiply the one-rotation distance by $15$.",
        ],
        rubric: singleRubric("a", 2, "Finds the distance as $300\\pi$ cm."),
        commonErrors: [
          "Finding only one circumference.",
          "Using $2\\pi d$ instead of $\\pi d$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "One complete rotation covers one circumference.",
            math: L`C=\pi d=20\pi\text{ cm}`,
          },
          {
            part: "a",
            explanation: "For $15$ rotations, multiply by $15$.",
            math: L`15\times20\pi=300\pi\text{ cm}`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Two identical quadrant-shaped paper pieces of radius $8\text{ cm}$ are cut from a circular sheet. Find their total area in terms of $\pi$.`,
        difficulty: 2,
        skillTags: ["quadrant_area", "sector_area"],
        parts: singlePart("a", "Find the total area.", 2),
        hints: [
          "One quadrant is one-fourth of a circle.",
          "Circle area is $\\pi r^2$.",
          "Find one quadrant, then double it.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds the total area as $32\\pi$ square centimetres.",
        ),
        commonErrors: [
          "Finding only one quadrant.",
          "Finding arc length instead of area.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "One quadrant is one-fourth of the circle.",
            math: L`\frac14\pi(8)^2=16\pi\text{ cm}^2`,
          },
          {
            part: "a",
            explanation: "There are two such quadrants.",
            math: L`2\times16\pi=32\pi\text{ cm}^2`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A circular walking track has radius $35\text{ m}$. A student walks two complete rounds. How much distance does the student cover? Use $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        skillTags: ["circumference_application"],
        parts: singlePart("a", "Find the total distance.", 2),
        hints: [
          "One round is the circumference.",
          "Find $2\\pi r$ for one round.",
          "Multiply the one-round distance by 2.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds one circumference as 220 m.",
            },
            {
              part: "a",
              points: 1,
              description: "Multiplies by 2 to get 440 m.",
            },
          ],
        },
        commonErrors: [
          "Using area of the circle as the walking distance.",
          "Forgetting that two rounds are walked.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "One round is one circumference.",
            math: L`2\times\frac{22}{7}\times35=220\text{ m}`,
          },
          {
            part: "a",
            explanation: "For two rounds, double this distance.",
            math: L`2\times220=440\text{ m}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A sector has radius $12\text{ cm}$ and central angle $120^\circ$. Find its area in terms of $\pi$.`,
        difficulty: 2,
        skillTags: ["sector_area", "fraction_of_circle"],
        parts: singlePart("a", "Find the sector area.", 2),
        hints: [
          "The sector is $120/360$ of the circle.",
          "The full circle area is $\\pi(12)^2$.",
          "Take one-third of $144\\pi$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses the correct sector fraction $120/360$.",
            },
            {
              part: "a",
              points: 1,
              description: "Obtains $48\\pi$ square centimetres.",
            },
          ],
        },
        commonErrors: [
          "Using arc-length formula instead of sector-area formula.",
          "Treating $120^\\circ$ as half the circle instead of one-third.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the sector-area formula.",
            math: L`A=\frac{120}{360}\pi(12)^2=48\pi\text{ cm}^2`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sprinkler waters a $90^\circ$ sector of a circular lawn of radius $14\text{ m}$. Use $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["sector_area", "arc_length", "circle_application"],
        figure: sectorFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the area watered by the sprinkler.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the curved boundary length of the watered part.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If the sprinkler were turned through a full circle, find the total area watered.",
            points: 2,
          },
        ],
        hints: [
          "A $90^\\circ$ sector is one-fourth of a circle.",
          "Arc length is the same fraction of the circumference.",
          "The full circle is four times the $90^\\circ$ sector.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds sector area as 154 square metres.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds arc length as 22 m.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds full circle area using $\\pi r^2$.",
            },
            {
              part: "c",
              points: 1,
              description: "Obtains 616 square metres.",
            },
          ],
        },
        commonErrors: [
          "Adding the two radii when only the curved boundary is asked.",
          "Using circumference for area.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The watered region is one-fourth of the circle.",
            math: L`\frac14\times\frac{22}{7}\times14^2=154\text{ m}^2`,
          },
          {
            part: "b",
            explanation:
              "The curved boundary is one-fourth of the circumference.",
            math: L`\frac14\times2\times\frac{22}{7}\times14=22\text{ m}`,
          },
          {
            part: "c",
            explanation: "For a full circle, use the whole circle area.",
            math: L`\frac{22}{7}\times14^2=616\text{ m}^2`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Heron's Formula and Quadrilateral Area",
    subtopic:
      "Area from three sides, semiperimeter, and Brahmagupta's formula for cyclic quadrilaterals.",
    mc: [
      {
        questionLatex: L`A scale drawing of a triangular plot has side lengths $13\text{ cm}$, $14\text{ cm}$ and $15\text{ cm}$. Its area on the drawing is`,
        difficulty: 3,
        skillTags: ["herons_formula", "triangle_area_from_sides"],
        figure: heronTriangleFigure,
        choices: [
          L`$42\text{ cm}^2$`,
          L`$168\text{ cm}^2$`,
          L`$84\text{ cm}^2$`,
          L`$21\text{ cm}^2$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is half of the correct Heron's formula result.",
          B: "This doubles the area.",
          D: "That is only the semiperimeter.",
        },
        hints: [
          "Use Heron's formula because all three sides are given.",
          "First find $s=(13+14+15)/2$.",
          "Then compute $\\sqrt{s(s-a)(s-b)(s-c)}$.",
        ],
        solution: [
          {
            explanation: "The semiperimeter is",
            math: L`s=\frac{13+14+15}{2}=21`,
          },
          {
            explanation: "Apply Heron's formula.",
            math: L`\Delta=\sqrt{21\cdot8\cdot7\cdot6}=84\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`An equilateral warning sign has side $6\text{ cm}$. The painted area of the sign is`,
        difficulty: 2,
        skillTags: ["equilateral_triangle_area", "herons_formula"],
        choices: [
          L`$18\sqrt3\text{ cm}^2$`,
          L`$36\sqrt3\text{ cm}^2$`,
          L`$12\sqrt3\text{ cm}^2$`,
          L`$9\sqrt3\text{ cm}^2$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This misses the factor $1/4$ in the equilateral area formula.",
          B: "This uses $a^2\\sqrt3$ instead of $\\frac{\\sqrt3}{4}a^2$.",
          C: "This is not the value from the standard formula.",
        },
        hints: [
          "Use the standard area formula for an equilateral triangle.",
          "$A=\\frac{\\sqrt3}{4}a^2$.",
          "Here $a=6$.",
        ],
        solution: [
          {
            explanation:
              "Substitute the side in the equilateral triangle area formula.",
            math: L`A=\frac{\sqrt3}{4}\times6^2=9\sqrt3\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A triangle has sides $5\text{ cm}$, $5\text{ cm}$ and $6\text{ cm}$. Using Heron's formula, its area is`,
        difficulty: 3,
        skillTags: ["herons_formula", "isosceles_triangle_area"],
        choices: [
          L`$12\text{ cm}^2$`,
          L`$16\text{ cm}^2$`,
          L`$30\text{ cm}^2$`,
          L`$8\text{ cm}^2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the semiperimeter squared pattern, not Heron's product.",
          C: "That comes from multiplying $5\\times6$ without the right height or formula.",
          D: "That is only the semiperimeter.",
        },
        hints: [
          "Find $s$ first.",
          "$s=(5+5+6)/2=8$.",
          "Use $\\sqrt{8\\cdot3\\cdot3\\cdot2}$.",
        ],
        solution: [
          {
            explanation: "The semiperimeter is $8\\text{ cm}$.",
            math: L`\Delta=\sqrt{8\cdot3\cdot3\cdot2}=12\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A cyclic quadrilateral has sides $5\text{ cm}$, $5\text{ cm}$, $6\text{ cm}$ and $6\text{ cm}$. Its area by Brahmagupta's formula is`,
        difficulty: 3,
        skillTags: ["brahmagupta_formula", "cyclic_quadrilateral_area"],
        choices: [
          L`$22\text{ cm}^2$`,
          L`$30\text{ cm}^2$`,
          L`$60\text{ cm}^2$`,
          L`$11\text{ cm}^2$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "That is the perimeter, not the area.",
          C: "This doubles the correct square-root result.",
          D: "That is only the semiperimeter.",
        },
        hints: [
          "For a cyclic quadrilateral, use Brahmagupta's formula.",
          "The semiperimeter is $s=11$.",
          "Compute $\\sqrt{6\\cdot6\\cdot5\\cdot5}$.",
        ],
        solution: [
          {
            explanation:
              "Brahmagupta's formula uses the semiperimeter just like Heron's formula.",
            math: L`s=\frac{5+5+6+6}{2}=11`,
          },
          {
            explanation: "Substitute the four side lengths.",
            math: L`K=\sqrt{(11-5)(11-5)(11-6)(11-6)}=30\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: If two triangles have the same base and lie between the same parallels, their areas are equal. Reason: Their perpendicular heights are equal. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["equal_area_triangles", "assertion_reason"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The common base and equal height directly explain equal areas.",
          B: "The heights are equal because the triangles lie between the same parallels.",
          D: "The assertion is a standard area theorem.",
        },
        hints: [
          "Area of a triangle is $\\frac12\\times$ base $\\times$ height.",
          "The base is the same.",
          "Between the same parallels means the perpendicular heights are equal.",
        ],
        solution: [
          {
            explanation:
              "The base is the same and the heights are equal, so the two areas are equal.",
            math: L`\frac12 bh=\frac12 bh`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A triangle has sides $8\text{ cm}$, $15\text{ cm}$ and $17\text{ cm}$. Write its semiperimeter and the three factors $s-a$, $s-b$, $s-c$ needed for Heron's formula.`,
        difficulty: 2,
        skillTags: ["semiperimeter", "herons_formula"],
        parts: singlePart("a", "Find $s$, $s-a$, $s-b$, and $s-c$.", 2),
        hints: [
          "Semiperimeter means half the perimeter.",
          "After finding $s$, subtract each side from it.",
          "These four values are the quantities used inside Heron's formula.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $s=20$ cm and factors $12$, $5$, and $3$.",
        ),
        commonErrors: [
          "Giving only the full perimeter.",
          "Stopping at $s$ and not forming the Heron factors.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Add the sides and divide by 2.",
            math: L`s=\frac{8+15+17}{2}=20\text{ cm}`,
          },
          {
            part: "a",
            explanation: "Now subtract each side from $s$.",
            math: L`s-a=12,\quad s-b=5,\quad s-c=3`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A student uses Heron's formula for a triangle with sides $3\text{ cm}$, $4\text{ cm}$ and $5\text{ cm}$. Find its area and state why this agrees with the right-triangle formula.`,
        difficulty: 2,
        skillTags: ["herons_formula", "right_triangle_area"],
        parts: singlePart("a", "Find the area and compare the formulas.", 2),
        hints: [
          "This is also a right triangle, but Heron's formula works.",
          "The semiperimeter is $6$.",
          "Compare the result with $\\frac12\\times3\\times4$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds area $6\\text{ cm}^2$ and notes it matches $\\frac12\\times3\\times4$.",
        ),
        commonErrors: ["Stopping at semiperimeter $6$ and calling it area."],
        workedSolution: [
          {
            part: "a",
            explanation: "Use Heron's formula.",
            math: L`s=6,\quad \Delta=\sqrt{6\cdot3\cdot2\cdot1}=6\text{ cm}^2`,
          },
          {
            part: "a",
            explanation:
              "Since the triangle is right-angled, its area is also $\\frac12\\times3\\times4=6\\text{ cm}^2$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A triangular park has side lengths $10\text{ m}$, $10\text{ m}$ and $12\text{ m}$. Find its area using Heron's formula.`,
        difficulty: 2,
        skillTags: ["herons_formula", "application"],
        parts: singlePart("a", "Find the area.", 2),
        hints: [
          "First find the semiperimeter.",
          "$s=(10+10+12)/2=16$.",
          "Use $\\sqrt{s(s-a)(s-b)(s-c)}$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $s=16$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds area as 48 square metres.",
            },
          ],
        },
        commonErrors: [
          "Using $10\\times12$ as if base and height are directly given.",
          "Forgetting one of the factors in Heron's formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The semiperimeter is",
            math: L`s=\frac{10+10+12}{2}=16`,
          },
          {
            part: "a",
            explanation: "Now substitute in Heron's formula.",
            math: L`\Delta=\sqrt{16\cdot6\cdot6\cdot4}=48\text{ m}^2`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A quadrilateral is divided by a diagonal into two triangles of areas $24\text{ cm}^2$ and $30\text{ cm}^2$. Find the area of the quadrilateral.`,
        difficulty: 2,
        skillTags: ["composite_area", "quadrilateral_area"],
        parts: singlePart("a", "Find the total area.", 2),
        hints: [
          "A diagonal splits the quadrilateral into two non-overlapping triangles.",
          "The quadrilateral area is the sum of the two triangle areas.",
          "Add $24$ and $30$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Recognises that the two triangular areas are added.",
            },
            {
              part: "a",
              points: 1,
              description: "Obtains 54 square centimetres.",
            },
          ],
        },
        commonErrors: ["Averaging the two areas instead of adding them."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The two triangles exactly make the quadrilateral, so add their areas.",
            math: L`24+30=54\text{ cm}^2`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A craft design uses a cyclic quadrilateral with side lengths $5\text{ cm}$, $5\text{ cm}$, $6\text{ cm}$ and $6\text{ cm}$.`,
        difficulty: 3,
        skillTags: ["brahmagupta_formula", "cyclic_quadrilateral_area"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the semiperimeter of the quadrilateral.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the Brahmagupta expression for its area.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the area.",
            points: 2,
          },
        ],
        hints: [
          "Brahmagupta's formula works for cyclic quadrilaterals.",
          "Here $s=(5+5+6+6)/2$.",
          "The product inside the square root becomes $6\\cdot6\\cdot5\\cdot5$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $s=11$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Writes the correct Brahmagupta substitution under the square root.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Simplifies the square root to get 30 square centimetres.",
            },
          ],
        },
        commonErrors: [
          "Using Heron's three-side formula directly on four sides.",
          "Forgetting that the quadrilateral must be cyclic.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The semiperimeter is half the perimeter.",
            math: L`s=\frac{5+5+6+6}{2}=11`,
          },
          {
            part: "b",
            explanation:
              "Substitute the four side lengths into Brahmagupta's formula.",
            math: L`K=\sqrt{(11-5)(11-5)(11-6)(11-6)}`,
          },
          {
            part: "c",
            explanation: "Simplify the product under the square root.",
            math: L`K=\sqrt{6\cdot6\cdot5\cdot5}=30\text{ cm}^2`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Cuboids, Cubes and Cylinders",
    subtopic:
      "Curved surface area, total surface area, and volume of cuboids, cubes, and cylinders.",
    mc: [
      {
        questionLatex: L`A small rectangular box is $8\text{ cm}$ long, $5\text{ cm}$ broad and $3\text{ cm}$ high. The space inside the box is`,
        difficulty: 2,
        skillTags: ["cuboid_volume"],
        choices: [
          L`$80\text{ cm}^3$`,
          L`$48\text{ cm}^3$`,
          L`$16\text{ cm}^3$`,
          L`$120\text{ cm}^3$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This multiplies only two of the dimensions.",
          B: "This uses a partial product and misses one length.",
          C: "This adds the dimensions instead of multiplying them.",
        },
        hints: [
          "Volume of a cuboid uses all three dimensions.",
          "Use $V=lbh$.",
          "Compute $8\\times5\\times3$.",
        ],
        solution: [
          {
            explanation: "Multiply length, breadth and height.",
            math: L`V=8\times5\times3=120\text{ cm}^3`,
          },
        ],
      },
      {
        questionLatex: L`Two solid cubes of side $4\text{ cm}$ are joined face to face to make a cuboid. The exposed surface area of the new solid is`,
        difficulty: 3,
        skillTags: ["cube_surface_area"],
        choices: [
          L`$160\text{ cm}^2$`,
          L`$192\text{ cm}^2$`,
          L`$128\text{ cm}^2$`,
          L`$96\text{ cm}^2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "That counts both original cube surface areas without removing the two glued faces.",
          C: "This removes too many faces.",
          D: "This is the surface area of only one separate cube.",
        },
        hints: [
          "Two separate cubes have $12$ square faces.",
          "The two faces that are glued together are not exposed.",
          "So $10$ square faces remain exposed.",
        ],
        solution: [
          {
            explanation:
              "The two joined cubes form a cuboid of dimensions $8\\text{ cm}\\times4\\text{ cm}\\times4\\text{ cm}$.",
            math: L`2(lb+bh+hl)=2(8\cdot4+4\cdot4+8\cdot4)=160\text{ cm}^2`,
          },
          {
            explanation:
              "Equivalently, $10$ exposed square faces each have area $4^2=16\\text{ cm}^2$.",
            math: L`10\times16=160\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`The curved surface area of a cylinder of radius $7\text{ cm}$ and height $10\text{ cm}$ is`,
        difficulty: 2,
        skillTags: ["cylinder_curved_surface_area"],
        figure: boxCylinderFigure,
        choices: [
          L`$154\text{ cm}^2$`,
          L`$440\text{ cm}^2$`,
          L`$594\text{ cm}^2$`,
          L`$1540\text{ cm}^3$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "That is the area of one circular base.",
          C: "That is the total surface area, not just curved surface area.",
          D: "That is a volume-style result and has cubic units.",
        },
        hints: [
          "Curved surface area does not include the circular top and bottom.",
          "Use $2\\pi rh$.",
          "Substitute $r=7$ and $h=10$.",
        ],
        solution: [
          {
            explanation: "For the curved side of a cylinder, use $2\\pi rh$.",
            math: L`2\times\frac{22}{7}\times7\times10=440\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`The volume of a cylinder of radius $7\text{ cm}$ and height $3\text{ cm}$ is`,
        difficulty: 2,
        skillTags: ["cylinder_volume"],
        choices: [
          L`$154\text{ cm}^3$`,
          L`$132\text{ cm}^3$`,
          L`$462\text{ cm}^3$`,
          L`$924\text{ cm}^3$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "That is only the base area; volume also multiplies by height.",
          B: "That uses circumference times height, which gives curved surface area.",
          D: "This doubles the correct volume.",
        },
        hints: [
          "Volume of a cylinder is base area times height.",
          "Base area is $\\pi r^2$.",
          "Multiply by $h=3$.",
        ],
        solution: [
          {
            explanation: "Use $V=\\pi r^2h$.",
            math: L`V=\frac{22}{7}\times7^2\times3=462\text{ cm}^3`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: If the side of a cube is doubled, its volume becomes eight times. Reason: The volume of a cube is proportional to the cube of its side. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["cube_volume", "assertion_reason"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The cubing relation directly explains why doubling gives a factor of $2^3$.",
          B: "The reason is true: cube volume is $a^3$.",
          C: "The assertion is also true because $(2a)^3=8a^3$.",
        },
        hints: [
          "Let the original side be $a$.",
          "Original volume is $a^3$.",
          "New volume is $(2a)^3$.",
        ],
        solution: [
          {
            explanation: "Doubling the side multiplies volume by $2^3$.",
            math: L`(2a)^3=8a^3`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A tank stores $2.5\text{ m}^3$ of water. How many litres of water does it store?`,
        difficulty: 1,
        skillTags: ["volume_units", "litres_cubic_metres"],
        parts: singlePart("a", "Write the volume in litres.", 1),
        hints: [
          "Use the standard volume conversion.",
          "$1\\text{ litre}=1000\\text{ cm}^3$.",
          "$1\\text{ m}^3=1000\\text{ litres}$, then scale it by $2.5$.",
        ],
        rubric: singleRubric("a", 1, "Writes 2500 litres."),
        commonErrors: ["Writing 250 litres or 25000 litres."],
        workedSolution: [
          {
            part: "a",
            explanation: "A cubic metre contains $1000$ litres.",
            math: L`2.5\text{ m}^3=2.5\times1000=2500\text{ L}`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`An open rectangular tray has length $4\text{ cm}$, breadth $3\text{ cm}$ and height $2\text{ cm}$. Find the area of sheet needed, ignoring thickness.`,
        difficulty: 2,
        skillTags: ["cuboid_surface_area"],
        parts: singlePart("a", "Find the area of sheet needed.", 2),
        hints: [
          "An open tray has no top face.",
          "Add the base and four side faces.",
          "Use $lb+2lh+2bh$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds the sheet area as 40 square centimetres.",
        ),
        commonErrors: [
          "Using total surface area of a closed cuboid.",
          "Finding volume instead of surface area.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The tray uses one base and four side faces; there is no top.",
            math: L`lb+2lh+2bh=4\cdot3+2(4\cdot2)+2(3\cdot2)=40\text{ cm}^2`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A rectangular water tank is $2\text{ m}$ long, $1.5\text{ m}$ wide and $1\text{ m}$ high. Find its capacity in litres.`,
        difficulty: 2,
        skillTags: ["cuboid_volume", "capacity"],
        parts: singlePart("a", "Find the capacity.", 2),
        hints: [
          "Capacity is found from volume.",
          "Find the volume in cubic metres first.",
          "Convert cubic metres into litres.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds volume as 3 cubic metres.",
            },
            {
              part: "a",
              points: 1,
              description: "Converts to 3000 litres.",
            },
          ],
        },
        commonErrors: [
          "Stopping at $3\\text{ m}^3$ without converting to litres.",
          "Using total surface area instead of volume.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The tank is a cuboid.",
            math: L`V=2\times1.5\times1=3\text{ m}^3`,
          },
          {
            part: "a",
            explanation: "Convert cubic metres into litres.",
            math: L`3\text{ m}^3=3\times1000=3000\text{ L}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An open cubical box has side $10\text{ cm}$ and no top cover. Find the surface area of material used.`,
        difficulty: 2,
        skillTags: ["cube_surface_area", "open_box"],
        parts: singlePart("a", "Find the area of material used.", 2),
        hints: [
          "A closed cube has 6 faces.",
          "This open box has only 5 square faces.",
          "One face area is $10^2$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Recognises that 5 faces are used.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds surface area as 500 square centimetres.",
            },
          ],
        },
        commonErrors: [
          "Using $6a^2$ for a closed cube.",
          "Finding volume instead of material area.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Only five square faces are present.",
            math: L`5\times10^2=500\text{ cm}^2`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A cylindrical water container has radius $7\text{ cm}$ and height $20\text{ cm}$. Use $\pi=\frac{22}{7}$.`,
        difficulty: 3,
        skillTags: ["cylinder_volume", "cylinder_surface_area"],
        figure: boxCylinderFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the area of the circular base.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the curved surface area.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the volume of the container.",
            points: 2,
          },
        ],
        hints: [
          "Use $\\pi r^2$ for the base.",
          "Use $2\\pi rh$ for the curved surface.",
          "Use $\\pi r^2h$ for volume.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds base area as 154 square centimetres.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Finds curved surface area as 880 square centimetres.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds volume as 3080 cubic centimetres.",
            },
          ],
        },
        commonErrors: [
          "Mixing curved surface area and volume formulas.",
          "Using $r=14$ instead of $r=7$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The circular base area is",
            math: L`\frac{22}{7}\times7^2=154\text{ cm}^2`,
          },
          {
            part: "b",
            explanation: "The curved side area is",
            math: L`2\times\frac{22}{7}\times7\times20=880\text{ cm}^2`,
          },
          {
            part: "c",
            explanation: "The volume is base area times height.",
            math: L`154\times20=3080\text{ cm}^3`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Cones, Spheres, Hemispheres and Pyramids",
    subtopic:
      "Surface area and volume of cones, spheres, hemispheres, pyramids, and simple combinations.",
    mc: [
      {
        questionLatex: L`A party hat is an open cone of radius $7\text{ cm}$ and slant height $10\text{ cm}$. The paper needed for its curved surface is`,
        difficulty: 2,
        skillTags: ["cone_curved_surface_area"],
        figure: iceCreamModelFigure,
        choices: [
          L`$220\text{ cm}^2$`,
          L`$154\text{ cm}^2$`,
          L`$770\text{ cm}^2$`,
          L`$70\text{ cm}^2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "That is the area of the circular base.",
          C: "This uses an extra factor and is not $\\pi rl$.",
          D: "This is only $rl$ without multiplying by $\\pi$.",
        },
        hints: [
          "Curved surface area of a cone uses slant height.",
          "Use $\\pi rl$.",
          "Substitute $r=7$ and $l=10$.",
        ],
        solution: [
          {
            explanation: "Use the cone curved surface area formula.",
            math: L`\pi rl=\frac{22}{7}\times7\times10=220\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A cone and a cylinder have the same radius $3\text{ cm}$ and height $7\text{ cm}$. If the cylinder volume is $63\pi\text{ cm}^3$, the cone volume is`,
        difficulty: 2,
        skillTags: ["cone_volume"],
        choices: [
          L`$63\pi\text{ cm}^3$`,
          L`$21\pi\text{ cm}^3$`,
          L`$42\pi\text{ cm}^3$`,
          L`$10\pi\text{ cm}^3$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "That is the cylinder volume with the same base and height.",
          C: "This uses $2/3$ instead of $1/3$.",
          D: "This adds dimensions instead of using the volume formula.",
        },
        hints: [
          "A cone has one-third of the cylinder volume with the same base and height.",
          "Use $V=\\frac13\\pi r^2h$.",
          "Compute $\\frac13\\pi\\cdot9\\cdot7$.",
        ],
        solution: [
          {
            explanation: "Substitute in the cone volume formula.",
            math: L`V=\frac13\pi(3)^2(7)=21\pi\text{ cm}^3`,
          },
        ],
      },
      {
        questionLatex: L`The surface area of a sphere of radius $7\text{ cm}$ is`,
        difficulty: 2,
        skillTags: ["sphere_surface_area"],
        choices: [
          L`$308\text{ cm}^2$`,
          L`$154\text{ cm}^2$`,
          L`$616\text{ cm}^2$`,
          L`$1437\frac{1}{3}\text{ cm}^3$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "That is the curved surface area of a hemisphere, not the sphere.",
          B: "That is the area of a circle of radius $7$.",
          D: "That is a volume, not a surface area.",
        },
        hints: [
          "A sphere has no flat circular face.",
          "Surface area of a sphere is $4\\pi r^2$.",
          "Substitute $r=7$.",
        ],
        solution: [
          {
            explanation: "Use $4\\pi r^2$.",
            math: L`4\times\frac{22}{7}\times7^2=616\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`The total surface area of a hemisphere of radius $7\text{ cm}$ is`,
        difficulty: 2,
        skillTags: ["hemisphere_surface_area"],
        choices: [
          L`$308\text{ cm}^2$`,
          L`$616\text{ cm}^2$`,
          L`$154\text{ cm}^2$`,
          L`$462\text{ cm}^2$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "That is only the curved surface area of the hemisphere.",
          B: "That is the surface area of the full sphere.",
          C: "That is only the circular base area.",
        },
        hints: [
          "Total surface area of a hemisphere includes the circular base.",
          "Use $3\\pi r^2$.",
          "Substitute $r=7$.",
        ],
        solution: [
          {
            explanation: "Total surface area of a hemisphere is $3\\pi r^2$.",
            math: L`3\times\frac{22}{7}\times7^2=462\text{ cm}^2`,
          },
        ],
      },
      {
        questionLatex: L`A square pyramid has base side $6\text{ cm}$ and vertical height $10\text{ cm}$. Its volume is`,
        difficulty: 3,
        skillTags: ["pyramid_volume", "square_base"],
        choices: [
          L`$120\text{ cm}^3$`,
          L`$360\text{ cm}^3$`,
          L`$60\text{ cm}^3$`,
          L`$216\text{ cm}^3$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "That is base area times height; a pyramid volume is one-third of that.",
          C: "This halves after multiplying, but the correct factor is one-third.",
          D: "That cubes the side and ignores the height relation.",
        },
        hints: [
          "First find the square base area.",
          "A pyramid volume is one-third of base area times height.",
          "Use $\\frac13\\times6^2\\times10$.",
        ],
        solution: [
          {
            explanation:
              "The base area is $6^2=36\\text{ cm}^2$. A pyramid volume is one-third of base area times height.",
            math: L`V=\frac13\times36\times10=120\text{ cm}^3`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Two identical spherical marbles each have radius $3\text{ cm}$. Find their combined volume in terms of $\pi$.`,
        difficulty: 2,
        skillTags: ["sphere_volume"],
        parts: singlePart("a", "Find the combined volume.", 2),
        hints: [
          "Find the volume of one sphere first.",
          "$V=\\frac43\\pi r^3$.",
          "Then double it because there are two marbles.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds the combined volume as $72\\pi$ cubic centimetres.",
        ),
        commonErrors: [
          "Finding only one marble's volume.",
          "Using surface area formula instead of volume.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Substitute $r=3$ in the sphere volume formula.",
            math: L`V=\frac43\pi(3)^3=36\pi\text{ cm}^3`,
          },
          {
            part: "a",
            explanation: "There are two identical marbles.",
            math: L`2\times36\pi=72\pi\text{ cm}^3`,
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A conical tent has radius $5\text{ m}$ and vertical height $12\text{ m}$. Find its slant height and name the theorem used.`,
        difficulty: 2,
        skillTags: ["cone_slant_height", "pythagoras_in_mensuration"],
        parts: singlePart("a", "Find the slant height and theorem.", 2),
        hints: [
          "Radius, height and slant height form a right triangle.",
          "Use $l^2=r^2+h^2$.",
          "Use $5^2+12^2=13^2$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds the slant height as 13 m and names Pythagoras' theorem.",
        ),
        commonErrors: ["Adding radius and height directly."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Use Pythagoras' theorem in the right triangle formed by radius, height and slant height.",
            math: L`l=\sqrt{5^2+12^2}=\sqrt{169}=13\text{ m}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A hemispherical bowl has inner radius $14\text{ cm}$. Find the inner curved surface area. Use $\pi=\frac{22}{7}$.`,
        difficulty: 2,
        skillTags: ["hemisphere_curved_surface_area"],
        parts: singlePart("a", "Find the curved surface area.", 2),
        hints: [
          "A bowl has only curved inner surface here.",
          "Curved surface area of a hemisphere is $2\\pi r^2$.",
          "Substitute $r=14$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses $2\\pi r^2$ for curved surface area.",
            },
            {
              part: "a",
              points: 1,
              description: "Obtains 1232 square centimetres.",
            },
          ],
        },
        commonErrors: [
          "Using total surface area $3\\pi r^2$ even though the inner curved surface is asked.",
          "Using volume formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Only the curved inner surface is required.",
            math: L`2\times\frac{22}{7}\times14^2=1232\text{ cm}^2`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cone and a cylinder have the same base radius and the same height. If the cylinder volume is $90\text{ cm}^3$, find the cone volume.`,
        difficulty: 2,
        skillTags: ["cone_cylinder_volume_relation"],
        parts: singlePart("a", "Find the cone volume.", 2),
        hints: [
          "Compare the formulas.",
          "Cylinder volume is $\\pi r^2h$.",
          "Cone volume is one-third of that.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that cone volume is one-third of cylinder volume.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds cone volume as 30 cubic centimetres.",
            },
          ],
        },
        commonErrors: [
          "Multiplying by 3 instead of dividing by 3.",
          "Trying to find radius and height even though they are unnecessary.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For the same base and height, cone volume is one-third of cylinder volume.",
            math: L`V_{\text{cone}}=\frac13\times90=30\text{ cm}^3`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`An ice-cream model is made from a cone of radius $3\text{ cm}$ and height $4\text{ cm}$, topped by a hemisphere of the same radius. The circular face where the cone and hemisphere touch is not exposed.`,
        difficulty: 4,
        skillTags: [
          "combined_solids",
          "cone_volume",
          "hemisphere_volume",
          "exposed_surface_area",
        ],
        figure: solidComparisonFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the slant height of the cone.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the volume of the cone in terms of $\\pi$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the total volume of the cone and hemisphere.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Find the exposed outer surface area of the model in terms of $\\pi$.",
            points: 2,
          },
        ],
        hints: [
          "The cone radius, height and slant height form a right triangle.",
          "For volume, add cone volume and hemisphere volume.",
          "For exposed area, add cone curved surface area and hemisphere curved surface area only.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds slant height $5$ cm.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds cone volume as $12\\pi$ cubic centimetres.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds total volume as $30\\pi$ cubic centimetres.",
            },
            {
              part: "d",
              points: 2,
              description:
                "Adds exposed curved areas $15\\pi+18\\pi$ to obtain $33\\pi$ square centimetres.",
            },
          ],
        },
        commonErrors: [
          "Including the common circular face in exposed surface area.",
          "Using vertical height instead of slant height for cone curved surface area.",
          "Using sphere volume instead of hemisphere volume.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The slant height of the cone is",
            math: L`l=\sqrt{3^2+4^2}=5\text{ cm}`,
          },
          {
            part: "b",
            explanation: "The cone volume is",
            math: L`\frac13\pi(3)^2(4)=12\pi\text{ cm}^3`,
          },
          {
            part: "c",
            explanation:
              "The hemisphere volume is $\\frac12\\cdot\\frac43\\pi(3)^3=18\\pi\\text{ cm}^3$, so the total volume is",
            math: L`12\pi+18\pi=30\pi\text{ cm}^3`,
          },
          {
            part: "d",
            explanation:
              "The exposed area is the cone curved surface plus the hemisphere curved surface; the common circular face is hidden.",
            math: L`\pi rl+2\pi r^2=\pi(3)(5)+2\pi(3)^2=15\pi+18\pi=33\pi\text{ cm}^2`,
          },
        ],
      },
    ],
  },
];

export const mensurationIxTopics: Topic[] = topicSeeds.map(makeTopic);
