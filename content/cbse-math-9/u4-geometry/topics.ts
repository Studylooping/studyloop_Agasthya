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
const UNIT = "u4-geometry";
const VERSION = "0.3.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;
const CHOICE_ROTATIONS: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0],
  [2, 3, 3, 0, 2],
  [3, 3, 0, 2, 3],
  [3, 0, 2, 3, 3, 0, 3, 1, 2, 0],
  [3, 0, 0, 1, 3],
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
  return `You chose ${choiceText}. Recheck the stated geometric fact, the marked equal parts, or the angle relation used in the question.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class9_geometry_reasoning"),
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_the_diagram_as_a_guess_instead_of_matching_the_geometric_rule",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_result_without_naming_the_geometric_reason",
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

const euclidSquareFigure: ItemFigure = {
  type: "svg",
  title: "Square construction from a given side",
  description:
    "A clean diagram showing a given side AB and a completed square ABCD, with right-angle markers and equal-side tick marks.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <line x1="145" y1="250" x2="365" y2="250" stroke="#2563eb" stroke-width="4"/>
  <line x1="365" y1="250" x2="365" y2="70" stroke="#2563eb" stroke-width="4"/>
  <line x1="365" y1="70" x2="145" y2="70" stroke="#2563eb" stroke-width="4"/>
  <line x1="145" y1="70" x2="145" y2="250" stroke="#2563eb" stroke-width="4"/>
  <path d="M165 250 L165 230 L145 230" fill="none" stroke="#f97316" stroke-width="3"/>
  <path d="M345 250 L345 230 L365 230" fill="none" stroke="#f97316" stroke-width="3"/>
  <path d="M345 70 L345 90 L365 90" fill="none" stroke="#f97316" stroke-width="3"/>
  <path d="M165 70 L165 90 L145 90" fill="none" stroke="#f97316" stroke-width="3"/>
  <g stroke="#0f172a" stroke-width="2">
    <line x1="245" y1="240" x2="265" y2="260"/><line x1="245" y1="60" x2="265" y2="80"/>
    <line x1="135" y1="150" x2="155" y2="170"/><line x1="355" y1="150" x2="375" y2="170"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="132" y="276">A</text><text x="365" y="276">B</text><text x="372" y="68">C</text><text x="126" y="68">D</text>
    <text x="205" y="306">given side AB</text>
    <text x="205" y="38">completed square</text>
  </g>
</svg>`,
};

const linesAnglesFigure: ItemFigure = {
  type: "svg",
  title: "Parallel lines cut by a transversal",
  description:
    "Two parallel lines cut by one transversal, with one given angle and three unknown angle labels.",
  svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="360" fill="#ffffff"/>
  <line x1="80" y1="120" x2="480" y2="120" stroke="#334155" stroke-width="4"/>
  <line x1="80" y1="245" x2="480" y2="245" stroke="#334155" stroke-width="4"/>
  <line x1="230" y1="315" x2="350" y2="55" stroke="#2563eb" stroke-width="4"/>
  <path d="M458 105 L480 120 L458 135" fill="none" stroke="#334155" stroke-width="3"/>
  <path d="M458 230 L480 245 L458 260" fill="none" stroke="#334155" stroke-width="3"/>
  <g font-family="Arial, sans-serif" font-size="18" fill="#0f172a">
    <text x="92" y="108">l</text><text x="92" y="233">m</text>
    <path d="M350 120 Q343 100 330 96" fill="none" stroke="#f97316" stroke-width="3"/>
    <path d="M292 120 Q307 95 330 96" fill="none" stroke="#2563eb" stroke-width="3"/>
    <path d="M294 245 Q287 226 272 222" fill="none" stroke="#16a34a" stroke-width="3"/>
    <text x="356" y="105">65&#176;</text><text x="278" y="105">x</text><text x="288" y="236">y</text><text x="226" y="236">z</text>
    <text x="398" y="74">transversal</text>
  </g>
</svg>`,
};

const triangleCongruenceFigure: ItemFigure = {
  type: "svg",
  title: "Two triangles with matching parts",
  description:
    "Two triangles with two pairs of equal sides and the included angles marked, supporting SAS congruence reasoning.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <polygon points="115,260 245,260 165,95" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <polygon points="395,260 525,260 445,95" fill="#dcfce7" stroke="#16a34a" stroke-width="4"/>
  <path d="M130 260 Q146 238 160 259" fill="none" stroke="#f97316" stroke-width="3"/>
  <path d="M410 260 Q426 238 440 259" fill="none" stroke="#f97316" stroke-width="3"/>
  <g stroke="#0f172a" stroke-width="2">
    <line x1="175" y1="175" x2="190" y2="168"/><line x1="455" y1="175" x2="470" y2="168"/>
    <line x1="175" y1="260" x2="175" y2="246"/><line x1="465" y1="260" x2="465" y2="246"/>
    <line x1="187" y1="260" x2="187" y2="246"/><line x1="477" y1="260" x2="477" y2="246"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="98" y="282">A</text><text x="246" y="282">B</text><text x="156" y="88">C</text>
    <text x="378" y="282">D</text><text x="526" y="282">E</text><text x="436" y="88">F</text>
    <text x="120" y="42">Two sides and the included angle are marked</text>
  </g>
</svg>`,
};

const parallelogramFigure: ItemFigure = {
  type: "svg",
  title: "Parallelogram with diagonals",
  description:
    "A parallelogram ABCD with both diagonals drawn and intersecting at O.",
  svg: `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="360" fill="#ffffff"/>
  <polygon points="150,255 420,255 500,105 230,105" fill="#fef3c7" stroke="#d97706" stroke-width="4"/>
  <line x1="150" y1="255" x2="500" y2="105" stroke="#2563eb" stroke-width="3"/>
  <line x1="420" y1="255" x2="230" y2="105" stroke="#2563eb" stroke-width="3"/>
  <circle cx="325" cy="180" r="6" fill="#dc2626"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a">
    <text x="132" y="280">A</text><text x="424" y="280">B</text><text x="504" y="104">C</text><text x="212" y="104">D</text>
    <text x="335" y="184">O</text>
    <text x="230" y="330">Diagonals meet at O</text>
  </g>
</svg>`,
};

const circleFigure: ItemFigure = {
  type: "svg",
  title: "Circle with diameter and chord",
  description:
    "A circle with centre O, diameter AB, chord CD, and a perpendicular from the centre to the chord at M.",
  svg: `<svg viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="380" fill="#ffffff"/>
  <circle cx="280" cy="190" r="125" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>
  <line x1="155" y1="190" x2="405" y2="190" stroke="#334155" stroke-width="4"/>
  <line x1="205" y1="120" x2="355" y2="120" stroke="#16a34a" stroke-width="4"/>
  <line x1="280" y1="190" x2="280" y2="120" stroke="#f97316" stroke-width="3"/>
  <path d="M280 120 L300 120 L300 140 L280 140" fill="none" stroke="#f97316" stroke-width="3"/>
  <circle cx="280" cy="190" r="6" fill="#dc2626"/><circle cx="280" cy="120" r="5" fill="#dc2626"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="142" y="212">A</text><text x="410" y="212">B</text><text x="192" y="112">C</text><text x="360" y="112">D</text>
    <text x="290" y="207">O</text><text x="288" y="116">M</text>
    <text x="218" y="338">AB is a diameter; CD is a chord</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Euclid's Geometry",
    subtopic:
      "History of geometry, undefined terms, axioms, postulates, and simple construction reasoning.",
    mc: [
      {
        questionLatex: L`A teacher begins a proof with the statement "equals added to equals are equal" and does not prove it inside the proof. In Euclidean geometry, this statement is being used as an`,
        difficulty: 2,
        skillTags: ["axioms_postulates"],
        choices: ["axiom", "theorem", "construction", "converse"],
        correctLetter: "A",
        rationales: {
          B: "A theorem needs proof from earlier accepted facts.",
          C: "A construction is a drawing made using allowed steps.",
          D: "A converse reverses the if-then direction of a statement.",
        },
        hints: [
          "The statement is not being proved inside the argument.",
          "It is a starting rule used to prove other results.",
          "The word is axiom.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "An axiom is a statement accepted without proof and used as a starting point.",
          },
        ],
      },
      {
        questionLatex: L`In a construction, only two fixed points $A$ and $B$ are given. The Euclidean postulate about joining two points allows the student to draw`,
        difficulty: 2,
        skillTags: ["euclid_postulates", "line_through_two_points"],
        choices: [
          "a circle",
          "a straight line segment",
          "two perpendiculars",
          "a square",
        ],
        correctLetter: "B",
        rationales: {
          A: "A circle needs a centre and radius, not just two endpoints.",
          C: "Perpendicular lines need an extra condition.",
          D: "A square needs a side and right-angle construction.",
        },
        hints: [
          "Start with two points.",
          "Join them directly.",
          "The result is a straight segment.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The postulate permits drawing the straight segment joining two points.",
          },
        ],
      },
      {
        questionLatex: L`A student describes a geometric object as having length but no breadth. In Euclid's terminology, the object being described is`,
        difficulty: 2,
        skillTags: ["euclid_definitions"],
        choices: ["A surface", "A solid", "A line", "An angle"],
        correctLetter: "C",
        rationales: {
          A: "A surface has length and breadth.",
          B: "A solid has length, breadth, and height.",
          D: "An angle is formed by two rays with a common endpoint.",
        },
        hints: [
          "Compare point, line, surface, and solid.",
          "A line is one-dimensional.",
          "It has length only.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A line is understood as having length but no breadth.",
          },
        ],
      },
      {
        questionLatex: L`In the square construction shown, the four right-angle marks support the conclusion that each angle of the completed figure is`,
        difficulty: 2,
        figure: euclidSquareFigure,
        skillTags: ["square_construction", "right_angles"],
        choices: [L`$45^\circ$`, L`$180^\circ$`, L`$360^\circ$`, L`$90^\circ$`],
        correctLetter: "D",
        rationales: {
          A: "A $45^\\circ$ angle is half a right angle, not the marked corner angle.",
          B: "$180^\\circ$ is a straight angle.",
          C: "$360^\\circ$ is a full turn around a point.",
        },
        hints: [
          "Look at the small square markers.",
          "Each marker represents a right angle.",
          "A right angle measures $90^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The small square markers denote right angles.",
            math: "\\text{each marked angle}=90^\\circ",
          },
        ],
      },
      {
        questionLatex: L`Assertion: If $AB=CD$, then $AB+5=CD+5$. Reason: Equals added to equals are equal.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "axioms_of_equality"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is exactly the equality axiom used in the assertion.",
          C: "The reason is a true axiom of equality.",
          D: "The assertion is true because the same number is added to equal quantities.",
        },
        hints: [
          "The same number is added on both sides.",
          "This keeps equality unchanged.",
          "That is precisely the stated reason.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Adding the same length to equal lengths gives equal totals.",
            math: "AB+5=CD+5",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Give one ancient civilisation connected with the practical development of geometry and mention one practical need behind it.`,
        difficulty: 2,
        skillTags: ["history_of_geometry"],
        parts: singlePart(
          "a",
          "Give one valid civilisation and practical need.",
          2,
        ),
        hints: [
          "Think of land measurement and building.",
          "The syllabus mentions ancient civilisations.",
          "India, Egypt, or Greece is acceptable if a relevant practical need is mentioned.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Names a relevant civilisation such as India, Egypt, or Greece and links it to measurement, construction, or surveying.",
        ),
        commonErrors: [
          "Giving a modern country with no link to the historical discussion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "One valid answer is India; ancient Indian Sulbasutra geometry is connected with constructions and measurement.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`A student uses a postulate as the first step of a proof. Explain in one sentence why this is allowed.`,
        difficulty: 1,
        skillTags: ["axioms_postulates"],
        parts: singlePart("a", "Give a short explanation.", 1),
        hints: [
          "A postulate is not proved inside the system.",
          "It is accepted as a starting rule.",
          "Use the words accepted without proof.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Says that a postulate is a statement accepted without proof in geometry.",
        ),
        commonErrors: ["Calling it a result that must first be proved."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "This is allowed because a postulate is accepted without proof and is used as a starting rule for proving other results.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student says, "A theorem and an axiom are the same because both are true." Correct the statement.`,
        difficulty: 2,
        skillTags: ["axioms_vs_theorems", "claim_correction"],
        parts: singlePart("a", "Write the corrected distinction.", 2),
        hints: [
          "Both may be true, but they enter geometry differently.",
          "An axiom is accepted first.",
          "A theorem is proved.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States that an axiom is accepted without proof.",
            },
            {
              part: "a",
              points: 1,
              description:
                "States that a theorem is proved using accepted facts.",
            },
          ],
        },
        commonErrors: [
          "Only saying both are true without distinguishing their roles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "An axiom is accepted without proof as a starting rule. A theorem is a statement proved using definitions, axioms, postulates, and earlier results.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In constructing a square on a given side $AB$, why is it not enough to draw any two segments from $A$ and $B$?`,
        difficulty: 2,
        skillTags: ["square_construction", "right_angles"],
        parts: singlePart("a", "Give a geometric reason.", 2),
        hints: [
          "A square has strict conditions.",
          "The new sides must make right angles with $AB$.",
          "They must also match the side length.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Mentions that square corners must be right angles.",
            },
            {
              part: "a",
              points: 1,
              description: "Mentions that the side lengths must be equal.",
            },
          ],
        },
        commonErrors: ["Thinking any four-sided closed figure is a square."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A square needs all sides equal and all angles right angles. So the segments from $A$ and $B$ must be drawn with those conditions, not chosen freely.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A craft activity asks students to construct a square on a given side $AB$, as shown in the figure.`,
        difficulty: 3,
        figure: euclidSquareFigure,
        skillTags: ["square_construction", "euclid_postulates", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Name the given side.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "State one property that must hold at each corner of the square.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why should the construction steps be justified by accepted geometric rules?",
            points: 1,
          },
        ],
        hints: [
          "Read the labelled side.",
          "Use the definition of a square.",
          "Construction is not only drawing; each step needs a reason.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies $AB$ as the given side.",
            },
            {
              part: "b",
              points: 1,
              description:
                "States that each angle is a right angle or each side is equal.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Explains that accepted rules make the construction valid, not just visually neat.",
            },
          ],
        },
        commonErrors: [
          "Judging the construction only by appearance without naming a geometric property.",
        ],
        workedSolution: [
          { part: "a", explanation: "The given side is $AB$." },
          {
            part: "b",
            explanation: "Each corner of a square is a right angle.",
          },
          {
            part: "c",
            explanation:
              "Accepted rules such as definitions, axioms, and postulates justify why the constructed figure really has the required square properties.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Lines and Angles",
    subtopic:
      "Rays, angle types, intersecting lines, linear pairs, vertically opposite angles, and angles with parallel lines.",
    mc: [
      {
        questionLatex: L`A straight road is split by a divider ray into two adjacent angles. If one angle is $65^\circ$, the other angle is`,
        difficulty: 2,
        skillTags: ["linear_pair"],
        choices: [L`$65^\circ$`, L`$115^\circ$`, L`$25^\circ$`, L`$180^\circ$`],
        correctLetter: "B",
        rationales: {
          A: "Equal angles are not guaranteed in a linear pair.",
          C: "This subtracts from $90^\\circ$, not from $180^\\circ$.",
          D: "This is the total, not the missing angle.",
        },
        hints: [
          "A linear pair sums to $180^\\circ$.",
          "Subtract the given angle.",
          "$180-65=115$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Linear-pair angles are supplementary.",
            math: "180^\\circ-65^\\circ=115^\\circ",
          },
        ],
      },
      {
        questionLatex: L`Two straight lines intersect. A student measures one angle as $42^\circ$. Without using a protractor again, the vertically opposite angle must be`,
        difficulty: 2,
        skillTags: ["vertically_opposite_angles"],
        choices: [L`$48^\circ$`, L`$138^\circ$`, L`$42^\circ$`, L`$180^\circ$`],
        correctLetter: "C",
        rationales: {
          A: "This has no standard relation to the given angle.",
          B: "This is the adjacent supplementary angle, not the vertically opposite angle.",
          D: "This is the straight angle total.",
        },
        hints: [
          "Vertically opposite angles are equal.",
          "Do not subtract from $180^\\circ$ here.",
          "The answer remains $42^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Vertically opposite angles are equal.",
            math: "42^\\circ",
          },
        ],
      },
      {
        questionLatex: L`In the figure, lines $l$ and $m$ are parallel. The angle marked $x$ is`,
        difficulty: 2,
        figure: linesAnglesFigure,
        skillTags: ["parallel_lines", "linear_pair"],
        choices: [L`$65^\circ$`, L`$25^\circ$`, L`$130^\circ$`, L`$115^\circ$`],
        correctLetter: "D",
        rationales: {
          A: "$65^\\circ$ is adjacent to $x$ on a straight line, so it is not equal to $x$.",
          B: "This subtracts from $90^\\circ$ instead of $180^\\circ$.",
          C: "This doubles the given angle instead of using a linear pair.",
        },
        hints: [
          "Look at $x$ and the given $65^\\circ$ angle on the upper line.",
          "They form a straight angle together.",
          "So $x=180^\\circ-65^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$x$ and $65^\\circ$ form a linear pair.",
            math: "x=180^\\circ-65^\\circ=115^\\circ",
          },
        ],
      },
      {
        questionLatex: L`A triangle cannot have two obtuse angles because`,
        difficulty: 2,
        skillTags: ["triangle_angle_sum", "angle_classification"],
        choices: [
          "two obtuse angles already have sum greater than $180^\\circ$",
          "every triangle has exactly one right angle",
          "all obtuse angles are equal",
          "the largest angle must be $60^\\circ$",
        ],
        correctLetter: "A",
        rationales: {
          B: "Only right triangles have one right angle.",
          C: "Obtuse angles can have different measures.",
          D: "$60^\\circ$ is the angle of an equilateral triangle, not every triangle.",
        },
        hints: [
          "An obtuse angle is greater than $90^\\circ$.",
          "Two such angles exceed $180^\\circ$.",
          "A triangle's angles sum to $180^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Two obtuse angles would have sum greater than $90^\\circ+90^\\circ=180^\\circ$, leaving no room for the third angle.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: If two adjacent angles have sum $180^\circ$, they form a linear pair. Reason: The non-common arms of a linear pair are opposite rays.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "linear_pair_converse"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reason gives the geometric meaning behind the $180^\\circ$ sum for adjacent angles.",
          C: "The reason is true: opposite rays make a straight line.",
          D: "The assertion is the converse form of the linear-pair theorem for adjacent angles.",
        },
        hints: [
          "Adjacent angles share one arm.",
          "A sum of $180^\\circ$ makes the outside arms form a straight line.",
          "That is the definition of a linear pair.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For adjacent angles, a $180^\\circ$ sum means the non-common arms form a straight line, so the angles form a linear pair.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A drawing has an angle marked $132^\circ$. Classify the angle and give the comparison that justifies your answer.`,
        difficulty: 2,
        skillTags: ["angle_classification"],
        parts: singlePart("a", "Give the type and comparison.", 2),
        hints: [
          "Compare $132^\\circ$ with $90^\\circ$ and $180^\\circ$.",
          "It is bigger than a right angle.",
          "It is less than a straight angle.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Classifies it as obtuse and compares it with $90^\\circ$ and $180^\\circ$.",
        ),
        commonErrors: [
          "Calling it reflex because it is more than $90^\\circ$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$132^\\circ$ is greater than $90^\\circ$ and less than $180^\\circ$, so it is obtuse.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In a triangle, an exterior angle is $120^\circ$. One opposite interior angle is $50^\circ$. Find the other opposite interior angle.`,
        difficulty: 2,
        skillTags: ["exterior_angle_theorem", "triangle_angle_sum"],
        parts: singlePart("a", "Give the angle.", 1),
        hints: [
          "Use the exterior-angle theorem.",
          "An exterior angle equals the sum of the two opposite interior angles.",
          "$120^\\circ-50^\\circ=70^\\circ$.",
        ],
        rubric: singleRubric("a", 1, "Finds $70^\\circ$."),
        commonErrors: [
          "Subtracting from $180^\\circ$ instead of using the exterior angle.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "By the exterior-angle theorem, the two opposite interior angles add to $120^\\circ$. Therefore the missing angle is $120^\\circ-50^\\circ=70^\\circ$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two straight lines intersect. If one angle is $110^\circ$, find the other three angles.`,
        difficulty: 2,
        skillTags: ["vertically_opposite_angles", "linear_pair"],
        parts: singlePart("a", "Show the angle relations.", 3),
        hints: [
          "The vertically opposite angle is equal.",
          "Adjacent angles form linear pairs.",
          "Subtract $110^\\circ$ from $180^\\circ$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Uses vertically opposite angles to get another $110^\\circ$ angle.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses a linear pair to find $70^\\circ$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "States both remaining adjacent angles are $70^\\circ$.",
            },
          ],
        },
        commonErrors: ["Writing all angles as $110^\\circ$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The vertically opposite angle is $110^\\circ$. Each adjacent angle is $180^\\circ-110^\\circ=70^\\circ$. So the other three angles are $110^\\circ,70^\\circ,70^\\circ$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In the figure, $l\parallel m$. Find $x$ and $y$.`,
        difficulty: 2,
        figure: linesAnglesFigure,
        skillTags: ["parallel_lines", "linear_pair", "corresponding_angles"],
        parts: singlePart("a", "Find both angles with reasons.", 3),
        hints: [
          "Find $x$ using the straight line at the top.",
          "Compare the given $65^\\circ$ angle with $y$.",
          "Corresponding angles are equal when lines are parallel.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $x=115^\\circ$." },
            { part: "a", points: 1, description: "Finds $y=65^\\circ$." },
            {
              part: "a",
              points: 1,
              description:
                "Gives valid reasons such as linear pair and corresponding angles.",
            },
          ],
        },
        commonErrors: [
          "Making both angles $65^\\circ$ without checking the linear pair.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$x=180^\\circ-65^\\circ=115^\\circ$ by the linear-pair rule. Since $l\\parallel m$, the angle corresponding to the given $65^\\circ$ angle is $y=65^\\circ$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A carpenter draws two parallel guide lines and a slanting cut line, as shown. The marked angle is $65^\circ$.`,
        difficulty: 3,
        figure: linesAnglesFigure,
        skillTags: ["parallel_lines", "angle_chasing", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Find $x$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $y$.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Explain why $z=115^\\circ$.",
            points: 1,
          },
        ],
        hints: [
          "Use a linear pair at the top for $x$.",
          "Use corresponding angles for $y$.",
          "$z$ is supplementary to $y$ on the lower line.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $x=115^\\circ$." },
            { part: "b", points: 1, description: "Finds $y=65^\\circ$." },
            {
              part: "c",
              points: 1,
              description: "Explains $z=180^\\circ-65^\\circ=115^\\circ$.",
            },
          ],
        },
        commonErrors: ["Using only visual size instead of angle-pair rules."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$x$ is a linear-pair angle with $65^\\circ$, so $x=115^\\circ$.",
          },
          {
            part: "b",
            explanation:
              "$y$ corresponds to the given angle, so $y=65^\\circ$.",
          },
          {
            part: "c",
            explanation:
              "$y$ and $z$ form a linear pair on line $m$, hence $z=180^\\circ-65^\\circ=115^\\circ$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "Triangles and Congruence",
    subtopic:
      "Triangle rigidity, congruence, correspondence, SAS, SSS, ASA, RHS, isosceles triangles, converse statements, and triangle inequalities.",
    mc: [
      {
        questionLatex: L`In two triangular frames, two corresponding sides and the angle included between them are equal. The congruence rule that can certify the frames are identical is`,
        difficulty: 2,
        skillTags: ["triangle_congruence", "sas"],
        choices: ["SSS", "ASA", "SAS", "RHS"],
        correctLetter: "C",
        rationales: {
          A: "SSS uses three sides, not two sides and an included angle.",
          B: "ASA uses two angles and the included side.",
          D: "RHS is for right triangles.",
        },
        hints: [
          "Read the order: side, angle, side.",
          "The angle is included between the two sides.",
          "That is SAS.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Two sides and the included angle give the SAS congruence rule.",
          },
        ],
      },
      {
        questionLatex: L`Two right triangular supports have equal hypotenuse and one equal side. The special congruence rule that applies is`,
        difficulty: 2,
        skillTags: ["triangle_congruence", "rhs"],
        choices: ["SSA", "AAA", "SSS", "RHS"],
        correctLetter: "D",
        rationales: {
          A: "SSA is not generally a valid congruence condition.",
          B: "AAA gives similarity, not congruence.",
          C: "SSS is a valid general congruence rule, but it is not the special right-triangle rule.",
        },
        hints: [
          "It uses a right angle.",
          "It also uses the hypotenuse and one side.",
          "The abbreviation is RHS.",
        ],
        solution: [
          {
            step: 1,
            explanation: "RHS means Right angle, Hypotenuse, and one Side.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, the marked information is enough to prove the two triangles congruent by`,
        difficulty: 2,
        figure: triangleCongruenceFigure,
        skillTags: ["triangle_congruence", "sas_from_diagram"],
        choices: ["SAS", "SSS", "ASA", "RHS"],
        correctLetter: "A",
        rationales: {
          B: "Only two pairs of sides are marked, not three.",
          C: "Only one pair of angles is marked.",
          D: "No right angle and hypotenuse information is marked.",
        },
        hints: [
          "Count the marked equal parts.",
          "There are two side pairs and the angle between them.",
          "That is SAS.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The diagram marks two corresponding sides and the included angle, so SAS applies.",
          },
        ],
      },
      {
        questionLatex: L`Which set of lengths can form the sides of a triangle?`,
        difficulty: 2,
        skillTags: ["triangle_inequality"],
        choices: [
          L`$2$ cm, $3$ cm, $5$ cm`,
          L`$4$ cm, $5$ cm, $8$ cm`,
          L`$1$ cm, $4$ cm, $7$ cm`,
          L`$3$ cm, $3$ cm, $7$ cm`,
        ],
        correctLetter: "B",
        rationales: {
          A: "$2+3=5$, so the segments lie flat and do not form a triangle.",
          C: "$1+4<7$, so the shorter sides cannot meet.",
          D: "$3+3<7$, so the shorter sides cannot meet.",
        },
        hints: [
          "Use the triangle inequality.",
          "The sum of any two sides must be greater than the third side.",
          "Check the two shorter sides against the longest side.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Only $4+5>8$ satisfies the triangle inequality. The other choices have the sum of the two shorter lengths less than or equal to the longest length.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: In an isosceles triangle, angles opposite the equal sides are equal. Reason: Equal sides force the opposite angles to correspond in congruent triangles formed by a suitable construction.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "isosceles_triangle"],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason explains the standard congruence proof idea.",
          B: "The proof idea using congruent triangles is valid.",
          D: "The assertion is a standard isosceles-triangle property.",
        },
        hints: [
          "Recall the base-angle theorem.",
          "The equal sides face equal angles.",
          "The reason refers to a congruence proof.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The base angles of an isosceles triangle are equal, and congruent triangles can justify the result.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Two triangular tiles are said to be congruent. State what this means for their shape and size.`,
        difficulty: 2,
        skillTags: ["meaning_of_congruence"],
        parts: singlePart("a", "Give the meaning.", 1),
        hints: [
          "Think about shape and size.",
          "Matching sides and matching angles are equal.",
          "The triangles fit exactly on each other.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States that congruent triangles have the same shape and size or coincide exactly.",
        ),
        commonErrors: ["Saying only that the triangles look similar."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Two triangles are congruent if they have the same shape and size, so corresponding sides and angles match exactly.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Two triangles have two equal angles, and the side included between those angles is also equal. Name the congruence rule being used.`,
        difficulty: 2,
        skillTags: ["triangle_congruence", "asa"],
        parts: singlePart("a", "Write the rule.", 1),
        hints: [
          "Read the order carefully.",
          "Angle, side, angle.",
          "The rule is ASA.",
        ],
        rubric: singleRubric("a", 1, "States ASA."),
        commonErrors: ["Writing SAS because a side is mentioned."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Two angles and the included side give the ASA congruence rule.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In $\triangle ABC$ and $\triangle DEF$, $AB=DE$, $AC=DF$, and $\angle A=\angle D$. State the congruence rule and one pair of corresponding angles that must be equal.`,
        difficulty: 2,
        skillTags: ["triangle_congruence", "cpoct"],
        parts: singlePart("a", "Give the rule and one angle pair.", 2),
        hints: [
          "The equal angle is between the two equal sides.",
          "Use SAS.",
          "After congruence, corresponding parts are equal.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Identifies SAS." },
            {
              part: "a",
              points: 1,
              description:
                "States a correct corresponding angle pair such as $\\angle B=\\angle E$ or $\\angle C=\\angle F$.",
            },
          ],
        },
        commonErrors: ["Using SSS even though only two side pairs are given."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The rule is SAS because the included angles are equal between two equal side pairs. Therefore corresponding angles such as $\\angle B$ and $\\angle E$ are equal.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A triangle has sides $5$ cm, $5$ cm, and $8$ cm. What can you say about the two base angles? Give the reason.`,
        difficulty: 2,
        skillTags: ["isosceles_triangle", "base_angles"],
        parts: singlePart("a", "State the angle relation with reason.", 2),
        hints: [
          "Two sides are equal.",
          "This makes the triangle isosceles.",
          "Angles opposite equal sides are equal.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States that the two base angles are equal.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses the isosceles-triangle theorem as the reason.",
            },
          ],
        },
        commonErrors: [
          "Trying to compute exact angle measures when only equality is needed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The two sides of length $5$ cm are equal, so the angles opposite them are equal. Hence the two base angles are equal.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two triangular braces in a shelf are made as shown. The marked parts of the two triangles match.`,
        difficulty: 3,
        figure: triangleCongruenceFigure,
        skillTags: ["triangle_congruence", "triangle_rigidity", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Name the congruence rule suggested by the markings.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State one pair of corresponding vertices.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Why are triangles often used in rigid braces?",
            points: 1,
          },
        ],
        hints: [
          "Read the side and angle markings.",
          "Match the labelled corners in the two triangles.",
          "A triangle is rigid when its side lengths are fixed.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies SAS." },
            {
              part: "b",
              points: 1,
              description:
                "States a valid correspondence such as $A\\leftrightarrow D$, $B\\leftrightarrow E$, $C\\leftrightarrow F$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Explains that triangles are rigid and resist shape change.",
            },
          ],
        },
        commonErrors: [
          "Naming the rule from appearance instead of the marked equal parts.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The markings show two corresponding sides and the included angle, so the rule is SAS.",
          },
          {
            part: "b",
            explanation: "One valid correspondence is $A\\leftrightarrow D$.",
          },
          {
            part: "c",
            explanation:
              "Triangles are used in braces because a triangle with fixed side lengths cannot change shape easily, unlike a general quadrilateral.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Quadrilaterals",
    subtopic:
      "4-gons, parallelogram properties, midpoint theorem, central symmetry, and simple coordinate applications.",
    mc: [
      {
        questionLatex: L`A quadrilateral is claimed to be a parallelogram. Which property must its opposite sides have?`,
        difficulty: 2,
        skillTags: ["parallelogram_properties"],
        choices: [
          "always perpendicular",
          "always unequal",
          "curved",
          "equal and parallel",
        ],
        correctLetter: "D",
        rationales: {
          A: "A rectangle has perpendicular adjacent sides, but a parallelogram need not.",
          B: "Opposite sides of a parallelogram are equal.",
          C: "A parallelogram is made of straight line segments.",
        },
        hints: [
          "Recall the basic definition and property.",
          "Opposite sides do not meet.",
          "They are also equal in length.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Opposite sides of a parallelogram are parallel and equal.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, if $AO=OC$ and $BO=OD$, then $ABCD$ is a parallelogram because`,
        difficulty: 2,
        figure: parallelogramFigure,
        skillTags: ["parallelogram_diagonals"],
        choices: [
          "diagonals bisect each other",
          "all angles are right angles",
          "all four sides are marked equal",
          "one diagonal is a diameter",
        ],
        correctLetter: "A",
        rationales: {
          B: "A parallelogram need not have all right angles.",
          C: "The given condition is about diagonals, not all sides.",
          D: "Diameter is a circle term, not a parallelogram condition.",
        },
        hints: [
          "Look at the intersection point of the diagonals.",
          "Each diagonal is split into equal halves.",
          "This is a parallelogram test.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A quadrilateral whose diagonals bisect each other is a parallelogram.",
          },
        ],
      },
      {
        questionLatex: L`In $\triangle ABC$, $M$ and $N$ are the midpoints of $AB$ and $AC$. If $BC=12$ cm, then $MN=$`,
        difficulty: 2,
        skillTags: ["midpoint_theorem"],
        choices: [L`$12$ cm`, L`$6$ cm`, L`$24$ cm`, L`$3$ cm`],
        correctLetter: "B",
        rationales: {
          A: "The midpoint segment is half of the third side, not equal to it.",
          C: "This doubles the third side.",
          D: "This takes one-fourth of the third side.",
        },
        hints: [
          "Use the midpoint theorem.",
          "$MN$ is parallel to $BC$.",
          "$MN$ is half of $BC$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "By the midpoint theorem,",
            math: "MN=\\frac12 BC=6\\text{ cm}",
          },
        ],
      },
      {
        questionLatex: L`In $\triangle ABC$, $D$ is the midpoint of $AB$. A line through $D$ parallel to $BC$ meets $AC$ at $E$. Then $E$ is the`,
        difficulty: 2,
        skillTags: ["midpoint_theorem_converse"],
        choices: [
          "midpoint of $BC$",
          "vertex opposite $A$",
          "midpoint of $AC$",
          "centre of the triangle",
        ],
        correctLetter: "C",
        rationales: {
          A: "$E$ lies on $AC$, not on $BC$.",
          B: "$E$ is on a side, not the opposite vertex.",
          D: "A triangle does not have a single centre defined by this condition.",
        },
        hints: [
          "Use the converse of the midpoint theorem.",
          "A line through the midpoint of one side and parallel to another side bisects the third side.",
          "So $E$ splits $AC$ equally.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "By the converse of the midpoint theorem, the line through midpoint $D$ parallel to $BC$ bisects the third side $AC$. Hence $E$ is the midpoint of $AC$.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: A parallelogram has central symmetry about the point where its diagonals meet. Reason: The diagonals of a parallelogram bisect each other.`,
        difficulty: 3,
        skillTags: [
          "assertion_reason",
          "central_symmetry",
          "parallelogram_diagonals",
        ],
        choices: [
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
        ],
        correctLetter: "D",
        rationales: {
          A: "The bisection of both diagonals is what makes opposite vertices pair up through the centre.",
          B: "The reason is a standard parallelogram property.",
          C: "The assertion is true for every parallelogram.",
        },
        hints: [
          "Central symmetry pairs opposite vertices.",
          "The centre must be halfway along both diagonals.",
          "Diagonals of a parallelogram do bisect each other.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since the diagonals bisect each other, their intersection is the midpoint of both pairs of opposite vertices, giving central symmetry.",
          },
        ],
      },
      {
        questionLatex: L`In quadrilateral $ABCD$, $AB\parallel CD$ and $AB=CD$. Which conclusion follows?`,
        difficulty: 3,
        skillTags: ["parallelogram_characterisation", "proof_reasoning"],
        choices: [
          "$ABCD$ is a parallelogram",
          "$ABCD$ must be a square",
          "$ABCD$ must be a rhombus",
          "$ABCD$ is cyclic",
        ],
        correctLetter: "A",
        rationales: {
          B: "A square needs right angles and all sides equal; those are not given.",
          C: "A rhombus needs all four sides equal; only one pair of opposite sides is given equal.",
          D: "A cyclic quadrilateral is not forced by one pair of equal parallel sides.",
        },
        hints: [
          "This is a standard parallelogram test.",
          "One pair of opposite sides is both equal and parallel.",
          "That condition is enough to prove a parallelogram.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If one pair of opposite sides of a quadrilateral is equal and parallel, the quadrilateral is a parallelogram.",
          },
        ],
      },
      {
        questionLatex: L`In parallelogram $ABCD$, if $AB=BC$, then $ABCD$ is necessarily a`,
        difficulty: 3,
        skillTags: ["special_parallelograms", "rhombus_test"],
        choices: ["rhombus", "rectangle", "square", "trapezium only"],
        correctLetter: "A",
        rationales: {
          B: "Equal adjacent sides do not force right angles.",
          C: "A square would also need right angles.",
          D: "A parallelogram with all sides equal is more specifically a rhombus.",
        },
        hints: [
          "Opposite sides of a parallelogram are equal.",
          "Given one adjacent pair is also equal.",
          "So all four sides are equal.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $AB=CD$ and $BC=AD$ in a parallelogram, the extra condition $AB=BC$ makes all four sides equal. Hence it is a rhombus.",
          },
        ],
      },
      {
        questionLatex: L`If $P,Q,R,S$ are the midpoints of the sides of any quadrilateral $ABCD$, then $PQRS$ is always a`,
        difficulty: 3,
        skillTags: ["midpoint_theorem", "varignon_parallelogram"],
        choices: ["parallelogram", "rectangle", "rhombus", "square"],
        correctLetter: "A",
        rationales: {
          B: "The midpoint quadrilateral need not have right angles.",
          C: "The midpoint quadrilateral need not have all sides equal.",
          D: "A square is possible only in special quadrilaterals, not always.",
        },
        hints: [
          "Join a diagonal of $ABCD$.",
          "Use the midpoint theorem in two triangles.",
          "Opposite sides of $PQRS$ come out parallel and equal.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "By the midpoint theorem, $PQ\parallel AC$ and $RS\parallel AC$, so $PQ\parallel RS$. Similarly, $QR\parallel PS$. Hence $PQRS$ is a parallelogram.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: If both pairs of opposite angles of a quadrilateral are equal, the quadrilateral is a parallelogram. Reason: The adjacent angles then become supplementary, forcing both pairs of opposite sides to be parallel.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "parallelogram_characterisation"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The supplementary-adjacent-angle argument is exactly what proves the parallel sides.",
          C: "The reason is true: equal opposite angles make adjacent angles supplementary.",
          D: "The assertion is also true.",
        },
        hints: [
          "Use the angle sum of a quadrilateral.",
          "If $A=C$ and $B=D$, then $A+B=180^\\circ$.",
          "Co-interior angles summing to $180^\\circ$ give parallel lines.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Let opposite angles be equal: $A=C$ and $B=D$. Since $A+B+C+D=360^\\circ$, we get $2(A+B)=360^\\circ$, so $A+B=180^\\circ$. This gives one pair of opposite sides parallel; similarly the other pair is parallel.",
          },
        ],
      },
      {
        questionLatex: L`In quadrilateral $ABCD$, diagonals $AC$ and $BD$ bisect each other at $O$. Which triangle congruence most directly proves $AB\parallel CD$?`,
        difficulty: 4,
        skillTags: ["diagonal_bisection_proof", "triangle_congruence"],
        choices: [
          L`$\triangle AOB\cong\triangle COD$ by SAS`,
          L`$\triangle AOB\cong\triangle COD$ by RHS`,
          L`$\triangle ABC\cong\triangle CDA$ by SSS`,
          L`$\triangle AOD\cong\triangle BOC$ by ASA only`,
        ],
        correctLetter: "A",
        rationales: {
          B: "No right angle is given, so RHS cannot be used.",
          C: "The three sides of the large triangles are not given equal.",
          D: "ASA is not the most direct given-data proof here; the bisected diagonals give two side pairs and vertical angles.",
        },
        hints: [
          "Use the equal halves of the diagonals.",
          "Vertical angles at $O$ are equal.",
          "That gives side-angle-side congruence.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $AO=OC$, $BO=OD$, and $\angle AOB=\angle COD$ as vertical angles, $\triangle AOB\cong\triangle COD$ by SAS. Corresponding angles then show $AB\parallel CD$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In $\triangle ABC$, $D$ and $E$ are midpoints of $AB$ and $AC$. If $BC=10$ cm, find $DE$ and name the theorem used.`,
        difficulty: 2,
        skillTags: ["midpoint_theorem"],
        parts: singlePart("a", "Give the length and theorem.", 2),
        hints: [
          "Use the midpoint theorem.",
          "$DE$ is half of $BC$.",
          "Half of $10$ is $5$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Finds $DE=5$ cm and names the midpoint theorem.",
        ),
        commonErrors: ["Writing $10$ cm instead of half the third side."],
        workedSolution: [
          {
            part: "a",
            explanation: "By the midpoint theorem, $DE=\\frac12 BC=5$ cm.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`In a parallelogram-shaped tile, one angle is $70^\circ$. What is the measure of each adjacent angle?`,
        difficulty: 2,
        skillTags: ["parallelogram_angles"],
        parts: singlePart("a", "Give the adjacent angle.", 1),
        hints: [
          "Adjacent angles in a parallelogram are supplementary.",
          "Subtract from $180^\\circ$.",
          "$180-70=110$.",
        ],
        rubric: singleRubric("a", 1, "Finds $110^\\circ$."),
        commonErrors: [
          "Writing $70^\\circ$ for an adjacent angle instead of an opposite angle.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Adjacent angles in a parallelogram sum to $180^\\circ$, so the adjacent angle is $110^\\circ$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A parallelogram has vertices $A(0,0)$, $B(4,0)$, and $D(1,3)$. Find the fourth vertex $C$.`,
        difficulty: 2,
        skillTags: ["parallelogram_coordinates", "coordinate_application"],
        parts: singlePart("a", "Find $C$ and show the coordinate change.", 2),
        hints: [
          "Move from $A$ to $B$.",
          "Apply the same movement from $D$ to $C$.",
          "Add $(4,0)$ to $D(1,3)$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses the translation from $A$ to $B$ as $(4,0)$.",
            },
            { part: "a", points: 1, description: "Finds $C=(5,3)$." },
          ],
        },
        commonErrors: [
          "Adding all three coordinates together without using the parallelogram structure.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "From $A$ to $B$ the change is $(4,0)$. Apply this to $D(1,3)$ to get $C(1+4,3+0)=(5,3)$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In parallelogram $ABCD$, $\angle A=80^\circ$. Find $\angle B$, $\angle C$, and $\angle D$.`,
        difficulty: 2,
        skillTags: ["parallelogram_angles"],
        parts: singlePart("a", "Find all three angles with reasons.", 3),
        hints: [
          "Opposite angles are equal.",
          "Adjacent angles are supplementary.",
          "Use $180^\\circ-80^\\circ$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $\\angle C=80^\\circ$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds $\\angle B=100^\\circ$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Finds $\\angle D=100^\\circ$ with suitable reasons.",
            },
          ],
        },
        commonErrors: ["Making all four angles equal to $80^\\circ$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Opposite angles are equal, so $\\angle C=80^\\circ$. Adjacent angles are supplementary, so $\\angle B=180^\\circ-80^\\circ=100^\\circ$ and $\\angle D=100^\\circ$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A designer draws parallelogram $ABCD$ and its diagonals, as shown.`,
        difficulty: 3,
        figure: parallelogramFigure,
        skillTags: [
          "parallelogram_diagonals",
          "central_symmetry",
          "case_based",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "If $AO=7$ cm, find $OC$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "If $BO=5$ cm, find $BD$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the point of central symmetry.",
            points: 1,
          },
        ],
        hints: [
          "Diagonals of a parallelogram bisect each other.",
          "$O$ is halfway along $AC$ and $BD$.",
          "The intersection point is the symmetry centre.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $OC=7$ cm." },
            { part: "b", points: 1, description: "Finds $BD=10$ cm." },
            { part: "c", points: 1, description: "Names $O$." },
          ],
        },
        commonErrors: ["Forgetting that $BO$ is only half of diagonal $BD$."],
        workedSolution: [
          {
            part: "a",
            explanation: "Since diagonals bisect each other, $AO=OC=7$ cm.",
          },
          { part: "b", explanation: "$BO=OD=5$ cm, so $BD=5+5=10$ cm." },
          {
            part: "c",
            explanation:
              "The point of central symmetry is $O$, the intersection of the diagonals.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In quadrilateral $ABCD$, $AB\parallel CD$ and $AB=CD$. Prove that $ABCD$ is a parallelogram.`,
        difficulty: 4,
        skillTags: ["parallelogram_characterisation", "proof_writing"],
        parts: singlePart("a", "Write a proof using a diagonal.", 3),
        hints: [
          "Draw diagonal $AC$.",
          "Use $AB\\parallel CD$ to get a pair of alternate interior angles.",
          "Use SAS congruence and then show the second pair of opposite sides is parallel.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Draws or refers to diagonal $AC$ and uses $AB\\parallel CD$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Proves $\\triangle BAC\\cong\\triangle DCA$ using $AB=CD$, common $AC$, and included alternate angles.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Concludes $BC\\parallel AD$ and hence $ABCD$ is a parallelogram.",
            },
          ],
        },
        commonErrors: [
          "Assuming both pairs of opposite sides are parallel without proof.",
          "Using equal side lengths alone to conclude parallelogram.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Draw $AC$. Since $AB\\parallel CD$, $\\angle BAC=\\angle DCA$ (alternate interior angles). Also $AB=CD$ and $AC$ is common.",
          },
          {
            part: "a",
            explanation:
              "Thus $\\triangle BAC\\cong\\triangle DCA$ by SAS. Hence corresponding angles $\\angle BCA$ and $\\angle DAC$ are equal, so $BC\\parallel AD$.",
          },
          {
            part: "a",
            explanation:
              "Now both pairs of opposite sides are parallel: $AB\\parallel CD$ and $BC\\parallel AD$. Therefore $ABCD$ is a parallelogram.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The diagonals of quadrilateral $ABCD$ meet at $O$ and bisect each other. Prove that $AB\parallel CD$.`,
        difficulty: 4,
        skillTags: ["diagonal_bisection_proof", "triangle_congruence"],
        parts: singlePart(
          "a",
          "Prove one pair of opposite sides is parallel.",
          3,
        ),
        hints: [
          "Use $AO=OC$ and $BO=OD$.",
          "Vertical angles at $O$ are equal.",
          "Congruent triangles give equal alternate interior angles.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies $AO=OC$, $BO=OD$, and equal vertical angles.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Proves $\\triangle AOB\\cong\\triangle COD$ by SAS.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Uses corresponding angles to conclude $AB\\parallel CD$.",
            },
          ],
        },
        commonErrors: [
          "Saying diagonals are equal; the given condition is that they bisect each other.",
          "Stopping at triangle congruence without stating the parallel-line conclusion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since the diagonals bisect each other, $AO=OC$ and $BO=OD$. Also, $\\angle AOB=\\angle COD$ because they are vertically opposite angles.",
          },
          {
            part: "a",
            explanation:
              "Therefore $\\triangle AOB\\cong\\triangle COD$ by SAS.",
          },
          {
            part: "a",
            explanation:
              "So $\\angle ABO=\\angle CDO$. These are alternate interior angles for lines $AB$ and $CD$, hence $AB\\parallel CD$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In quadrilateral $ABCD$, points $P,Q,R,S$ are the midpoints of $AB,BC,CD,DA$ respectively. Prove that $PQRS$ is a parallelogram.`,
        difficulty: 4,
        skillTags: [
          "midpoint_theorem",
          "varignon_parallelogram",
          "proof_writing",
        ],
        parts: singlePart(
          "a",
          "Write the proof using the midpoint theorem.",
          4,
        ),
        hints: [
          "Draw diagonal $AC$.",
          "Apply the midpoint theorem in triangles $ABC$ and $ADC$.",
          "Show one pair of opposite sides of $PQRS$ is equal and parallel.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Draws or uses diagonal $AC$.",
            },
            {
              part: "a",
              points: 1,
              description: "Shows $PQ\\parallel AC$ and $PQ=\\frac12 AC$.",
            },
            {
              part: "a",
              points: 1,
              description: "Shows $SR\\parallel AC$ and $SR=\\frac12 AC$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Concludes $PQ\\parallel SR$ and $PQ=SR$, so $PQRS$ is a parallelogram.",
            },
          ],
        },
        commonErrors: [
          "Claiming $PQRS$ is a rectangle for every quadrilateral.",
          "Using midpoint theorem in only one triangle and not completing the opposite-side argument.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Draw diagonal $AC$. In $\\triangle ABC$, $P$ and $Q$ are midpoints, so by the midpoint theorem $PQ\\parallel AC$ and $PQ=\\frac12 AC$.",
          },
          {
            part: "a",
            explanation:
              "In $\\triangle ADC$, $S$ and $R$ are midpoints, so $SR\\parallel AC$ and $SR=\\frac12 AC$.",
          },
          {
            part: "a",
            explanation:
              "Thus $PQ\\parallel SR$ and $PQ=SR$. A quadrilateral with one pair of opposite sides equal and parallel is a parallelogram. Hence $PQRS$ is a parallelogram.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In parallelogram $ABCD$, the bisectors of $\angle A$ and $\angle B$ meet at $P$. Prove that $\angle APB=90^\circ$.`,
        difficulty: 4,
        skillTags: ["parallelogram_angles", "angle_bisectors", "proof_writing"],
        parts: singlePart(
          "a",
          "Give a proof using adjacent angles of a parallelogram.",
          3,
        ),
        hints: [
          "Adjacent angles of a parallelogram are supplementary.",
          "The bisectors halve those two angles.",
          "Half of $180^\\circ$ is $90^\\circ$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States $\\angle A+\\angle B=180^\\circ$.",
            },
            {
              part: "a",
              points: 1,
              description: "Uses angle bisectors to write half-angles.",
            },
            {
              part: "a",
              points: 1,
              description: "Concludes $\\angle APB=90^\\circ$.",
            },
          ],
        },
        commonErrors: [
          "Assuming all angles of a parallelogram are $90^\\circ$.",
          "Forgetting to use the angle bisectors.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In a parallelogram, adjacent angles are supplementary, so $\\angle A+\\angle B=180^\\circ$.",
          },
          {
            part: "a",
            explanation:
              "The two bisectors make angles $\\frac12\\angle A$ and $\\frac12\\angle B$ with side $AB$.",
          },
          {
            part: "a",
            explanation:
              "Therefore the angle between the two bisectors is $\\frac12(\\angle A+\\angle B)=90^\\circ$, so $\\angle APB=90^\\circ$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A quadrilateral has vertices $A(1,2)$, $B(5,2)$, $C(7,5)$ and $D(3,5)$.`,
        difficulty: 3,
        skillTags: [
          "coordinate_application",
          "parallelogram_characterisation",
          "central_symmetry",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Compare the coordinate changes $\\overrightarrow{AB}$ and $\\overrightarrow{DC}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Compare the midpoints of diagonals $AC$ and $BD$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State whether $ABCD$ is a parallelogram, with a reason.",
            points: 1,
          },
        ],
        hints: [
          "Find coordinate changes, not only side lengths.",
          "Diagonals of a parallelogram bisect each other.",
          "The midpoint of $(x_1,y_1)$ and $(x_2,y_2)$ is found by averaging coordinates.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds both changes as $(4,0)$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds midpoint of $AC$ as $(4,\\frac72)$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds midpoint of $BD$ as $(4,\\frac72)$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Concludes parallelogram because diagonals bisect each other or opposite sides are parallel and equal.",
            },
          ],
        },
        commonErrors: [
          "Using distance formula only and not checking direction.",
          "Averaging all four vertices together instead of finding diagonal midpoints.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\overrightarrow{AB}=(5-1,2-2)=(4,0)$ and $\\overrightarrow{DC}=(7-3,5-5)=(4,0)$.",
          },
          {
            part: "b",
            explanation:
              "Midpoint of $AC$ is $\\left(\\frac{1+7}{2},\\frac{2+5}{2}\\right)=(4,\\frac72)$. Midpoint of $BD$ is $\\left(\\frac{5+3}{2},\\frac{2+5}{2}\\right)=(4,\\frac72)$.",
          },
          {
            part: "c",
            explanation:
              "The diagonals have the same midpoint, so they bisect each other. Therefore $ABCD$ is a parallelogram.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Circles",
    subtopic:
      "Circle terminology, chords, diameter, distance of chords from the centre, subtended angles, angles in the same segment, semicircles, and cyclic quadrilaterals.",
    mc: [
      {
        questionLatex: L`Through three non-collinear points, the number of circles that can be drawn is`,
        difficulty: 2,
        skillTags: ["circle_through_three_points", "non_collinear_points"],
        choices: ["one", "two", "infinitely many", "none"],
        correctLetter: "A",
        rationales: {
          B: "Two distinct circles cannot pass through the same three non-collinear points.",
          C: "Infinitely many circles can pass through one or two points, not through three non-collinear points.",
          D: "Three non-collinear points determine a circle.",
        },
        hints: [
          "The points must not lie on one straight line.",
          "Three non-collinear points determine a unique circle.",
          "So the number is one.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Exactly one circle can be drawn through three non-collinear points.",
          },
        ],
      },
      {
        questionLatex: L`In a circular rangoli, two chords are equal in length. At the centre, these two chords must subtend`,
        difficulty: 2,
        skillTags: ["equal_chords", "subtended_angles"],
        choices: [
          "unequal angles at the centre",
          "equal angles at the centre",
          "right angles only",
          "straight angles only",
        ],
        correctLetter: "B",
        rationales: {
          A: "Equal chords subtend equal central angles.",
          C: "The angle need not be $90^\\circ$.",
          D: "A straight angle occurs for a diameter, not every equal chord.",
        },
        hints: [
          "Recall the chord theorem.",
          "Equal chord lengths match equal central spreads.",
          "So the central angles are equal.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Equal chords of a circle subtend equal angles at the centre.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, $OM\perp CD$. If $CD=12$ cm, then $CM=$`,
        difficulty: 2,
        figure: circleFigure,
        skillTags: ["perpendicular_to_chord", "chord_bisection"],
        choices: [L`$12$ cm`, L`$24$ cm`, L`$6$ cm`, L`$3$ cm`],
        correctLetter: "C",
        rationales: {
          A: "This is the full chord, not half of it.",
          B: "This doubles the chord.",
          D: "This takes one-fourth of the chord.",
        },
        hints: [
          "A perpendicular from the centre to a chord bisects the chord.",
          "$M$ is the midpoint of $CD$.",
          "Half of $12$ is $6$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The perpendicular from the centre bisects the chord.",
            math: "CM=\\frac{12}{2}=6\\text{ cm}",
          },
        ],
      },
      {
        questionLatex: L`The angle in a semicircle is always`,
        difficulty: 2,
        skillTags: ["angle_in_semicircle"],
        choices: [L`$45^\circ$`, L`$60^\circ$`, L`$180^\circ$`, L`$90^\circ$`],
        correctLetter: "D",
        rationales: {
          A: "A semicircle angle is not half a right angle.",
          B: "$60^\\circ$ occurs in equilateral-triangle contexts, not this theorem.",
          C: "$180^\\circ$ is the angle at the centre along the diameter, not at the circumference.",
        },
        hints: [
          "The diameter subtends a semicircle.",
          "The angle at the circumference is half the central angle.",
          "Half of $180^\\circ$ is $90^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "An angle in a semicircle is a right angle.",
            math: "90^\\circ",
          },
        ],
      },
      {
        questionLatex: L`Assertion: Opposite angles of a cyclic quadrilateral are supplementary. Reason: The angles stand on arcs that together make a full circle.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "cyclic_quadrilateral"],
        choices: [
          "Both Assertion and Reason are true, and the Reason correctly explains the Assertion.",
          "Both Assertion and Reason are true, but the Reason does not explain the Assertion.",
          "The Assertion is true, but the Reason is false.",
          "The Assertion is false, but the Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The arc idea explains why the two opposite angles add to $180^\\circ$.",
          C: "The reason correctly connects opposite angles with arcs of the same circle.",
          D: "The assertion is a standard cyclic-quadrilateral theorem.",
        },
        hints: [
          "Cyclic means all vertices lie on a circle.",
          "Opposite angles intercept arcs that complete the circle.",
          "Their sum is $180^\\circ$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a cyclic quadrilateral, opposite angles are supplementary, so their sum is $180^\\circ$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A straight strip is stretched across a circular frame and passes through the centre. Explain why this strip is the longest possible chord.`,
        difficulty: 2,
        skillTags: ["circle_terms", "diameter"],
        parts: singlePart("a", "Give the term and reason.", 2),
        hints: [
          "A chord joins two points of the circle.",
          "The longest one passes through the centre.",
          "That chord is the diameter.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States diameter and explains that a chord through the centre is longest.",
        ),
        commonErrors: ["Writing radius, which is not a chord."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The strip is a diameter because it is a chord passing through the centre. A diameter is the longest chord of a circle.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Two angles in the same segment of a circle stand on the same chord. If one angle is $48^\circ$, find the other.`,
        difficulty: 2,
        skillTags: ["angles_same_segment"],
        parts: singlePart("a", "Give the angle.", 1),
        hints: [
          "Recall the same-segment theorem.",
          "Angles in the same segment of a circle are equal.",
          "So the other angle is also $48^\\circ$.",
        ],
        rubric: singleRubric("a", 1, "Finds $48^\\circ$."),
        commonErrors: [
          "Doubling or halving the angle instead of using the same-segment theorem.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Angles in the same segment of a circle are equal, so the other angle is $48^\\circ$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two chords of a circle are equal. What can you say about their distances from the centre? Give the theorem used.`,
        difficulty: 2,
        skillTags: ["equal_chords", "distance_from_centre"],
        parts: singlePart("a", "State the relation and reason.", 2),
        hints: [
          "Recall the equal-chord distance theorem.",
          "Equal chords sit symmetrically in the circle.",
          "They are equidistant from the centre.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that the distances from the centre are equal.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Names or clearly states the equal chords are equidistant from the centre theorem.",
            },
          ],
        },
        commonErrors: ["Saying the chords must pass through the centre."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Equal chords of a circle are equidistant from the centre. Hence their perpendicular distances from the centre are equal.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In cyclic quadrilateral $ABCD$, $\angle A=110^\circ$. Find $\angle C$ with reason.`,
        difficulty: 2,
        skillTags: ["cyclic_quadrilateral"],
        parts: singlePart("a", "Find the angle and give the theorem.", 2),
        hints: [
          "Opposite angles of a cyclic quadrilateral are supplementary.",
          "$A$ and $C$ are opposite.",
          "Subtract from $180^\\circ$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses $\\angle A+\\angle C=180^\\circ$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds $\\angle C=70^\\circ$.",
            },
          ],
        },
        commonErrors: [
          "Making $\\angle C=110^\\circ$ by confusing it with opposite angles of a parallelogram.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Opposite angles of a cyclic quadrilateral are supplementary, so $\\angle C=180^\\circ-110^\\circ=70^\\circ$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A circular badge is drawn with centre $O$, diameter $AB$, and chord $CD$, as shown.`,
        difficulty: 3,
        figure: circleFigure,
        skillTags: ["circle_terms", "perpendicular_to_chord", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "If $OA=4$ cm, find $AB$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "If $CD=10$ cm and $OM\\perp CD$, find $CM$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the theorem used in part (b).",
            points: 1,
          },
        ],
        hints: [
          "A diameter is twice the radius.",
          "A perpendicular from the centre to a chord bisects it.",
          "The theorem names the bisection of a chord.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $AB=8$ cm." },
            { part: "b", points: 1, description: "Finds $CM=5$ cm." },
            {
              part: "c",
              points: 1,
              description:
                "States that the perpendicular from the centre to a chord bisects the chord.",
            },
          ],
        },
        commonErrors: [
          "Using the radius as the diameter or forgetting to halve the chord.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$AB$ is a diameter, so $AB=2\\times OA=8$ cm.",
          },
          {
            part: "b",
            explanation:
              "Since $OM\\perp CD$, $M$ bisects chord $CD$. Therefore $CM=10/2=5$ cm.",
          },
          {
            part: "c",
            explanation:
              "The theorem is: the perpendicular from the centre of a circle to a chord bisects the chord.",
          },
        ],
      },
    ],
  },
];

export const geometryIxTopics: Topic[] = topicSeeds.map(makeTopic);
