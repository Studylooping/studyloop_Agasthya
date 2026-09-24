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

const COURSE = "cbse-physics-12";
const UNIT = "u1-electrostatics";
const VERSION = "0.1.6";
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
  return `You chose ${choiceText}. Recheck the sign, direction, and whether the formula applies to force, field, potential, flux, or capacitance.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_electrostatics_reasoning"),
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
      "uses_magnitude_formula_without_tracking_sign_or_vector_direction",
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
      "mixes_up_force_field_potential_flux_or_capacitance_definitions",
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

const movedMcTargets = new Map<string, string>([
  [
    L`Two point charges $+3\,\mu\text{C}$ and $-12\,\mu\text{C}$ are fixed $0.30\text{ m}$ apart. The point where the net electric field is zero lies`,
    "1.2",
  ],
  [
    L`Two equal positive charges are fixed at the ends of a line segment. At the midpoint of the segment, which statement is correct?`,
    "1.4",
  ],
]);

function relocateMisplacedElectrostaticsItems(topics: Topic[]): Topic[] {
  const relocatedTopics = topics.map((topic) => ({
    ...topic,
    items: [...topic.items],
  }));
  const movedItems: { item: McSingleItem; targetTopicCode: string }[] = [];

  for (const topic of relocatedTopics) {
    topic.items = topic.items.filter((item) => {
      if (item.kind !== "mc_single") return true;
      const targetTopicCode = movedMcTargets.get(item.questionLatex);
      if (!targetTopicCode || topic.topicCode === targetTopicCode) return true;
      movedItems.push({ item, targetTopicCode });
      return false;
    });
  }

  for (const { item, targetTopicCode } of movedItems) {
    const targetTopic = relocatedTopics.find(
      (topic) => topic.topicCode === targetTopicCode,
    );
    if (!targetTopic) continue;
    const insertIndex = targetTopic.items.findIndex(
      (targetItem) => targetItem.kind !== "mc_single",
    );
    targetTopic.items.splice(
      insertIndex === -1 ? targetTopic.items.length : insertIndex,
      0,
      {
        ...item,
        topic: targetTopicCode,
      },
    );
  }

  return relocatedTopics.map((topic) => {
    let mcCount = 0;
    return {
      ...topic,
      items: topic.items.map((item) => {
        if (item.kind !== "mc_single") return item;
        mcCount += 1;
        return {
          ...item,
          topic: topic.topicCode,
          contentId: `${COURSE}.u1.t${topicSlug(topic.topicCode)}.mc.${String(mcCount).padStart(3, "0")}`,
        };
      }),
    };
  });
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function rubric(
  criteria: readonly { part: string; points: number; description: string }[],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((total, item) => total + item.points, 0),
    criteria: [...criteria],
  };
}

const threeChargeLineFigure: ItemFigure = {
  type: "svg",
  title: "Three charges on a straight line",
  description:
    "Three labelled charges A, B, and C placed on a horizontal line with given separations.",
  svg: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="250" fill="#ffffff"/>
  <line x1="90" y1="125" x2="655" y2="125" stroke="#334155" stroke-width="3"/>
  <circle cx="130" cy="125" r="18" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <circle cx="330" cy="125" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="630" cy="125" r="18" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <g stroke="#64748b" stroke-width="2">
    <line x1="130" y1="168" x2="330" y2="168"/>
    <line x1="130" y1="158" x2="130" y2="178"/>
    <line x1="330" y1="158" x2="330" y2="178"/>
    <line x1="330" y1="198" x2="630" y2="198"/>
    <line x1="330" y1="188" x2="330" y2="208"/>
    <line x1="630" y1="188" x2="630" y2="208"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a" text-anchor="middle">
    <text x="130" y="85">A: +4 &#956;C</text>
    <text x="330" y="85">B: +1 &#956;C</text>
    <text x="630" y="85">C: -9 &#956;C</text>
    <text x="230" y="160">0.20 m</text>
    <text x="480" y="190">0.30 m</text>
  </g>
</svg>`,
};

const dipoleAxisFigure: ItemFigure = {
  type: "svg",
  title: "Electric dipole in a uniform field",
  description:
    "An electric dipole at an angle theta to a uniform electric field directed to the right.",
  svg: `<svg viewBox="0 0 640 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="330" fill="#ffffff"/>
  <defs>
    <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-slate" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#2563eb" stroke-width="3" marker-end="url(#arrow-blue)">
    <line x1="70" y1="75" x2="570" y2="75"/>
    <line x1="70" y1="125" x2="570" y2="125"/>
    <line x1="70" y1="175" x2="570" y2="175"/>
    <line x1="70" y1="225" x2="570" y2="225"/>
  </g>
  <line x1="270" y1="205" x2="385" y2="115" stroke="#334155" stroke-width="5" marker-end="url(#arrow-slate)"/>
  <circle cx="270" cy="205" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="385" cy="115" r="18" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <path d="M300 205 A50 50 0 0 1 340 174" fill="none" stroke="#f97316" stroke-width="4"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a">
    <text x="585" y="80">E</text>
    <text x="253" y="211" text-anchor="middle">-q</text>
    <text x="385" y="121" text-anchor="middle">+q</text>
    <text x="345" y="190" fill="#f97316">&#952;</text>
    <text x="325" y="100">p</text>
  </g>
</svg>`,
};

const gaussianSurfaceFigure: ItemFigure = {
  type: "svg",
  title: "Closed surface and nearby charges",
  description:
    "A closed Gaussian surface contains one charge while another charge lies outside it.",
  svg: `<svg viewBox="0 0 620 320" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="320" fill="#ffffff"/>
  <ellipse cx="295" cy="160" rx="160" ry="105" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <circle cx="260" cy="150" r="22" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <circle cx="510" cy="150" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="295" y="55">closed surface S</text>
    <text x="260" y="156">+3 &#956;C</text>
    <text x="510" y="156">-3 &#956;C</text>
    <text x="510" y="195">outside S</text>
  </g>
</svg>`,
};

const equipotentialFigure: ItemFigure = {
  type: "svg",
  title: "Parallel equipotential lines",
  description:
    "Three vertical equipotential lines labelled 100 V, 80 V, and 60 V, each separated by 2 cm.",
  svg: `<svg viewBox="0 0 640 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="340" fill="#ffffff"/>
  <defs>
    <marker id="dim-arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <path d="M0 5 L10 0 L10 10 Z" fill="#64748b"/>
    </marker>
  </defs>
  <line x1="180" y1="70" x2="180" y2="255" stroke="#2563eb" stroke-width="4"/>
  <line x1="320" y1="70" x2="320" y2="255" stroke="#2563eb" stroke-width="4"/>
  <line x1="460" y1="70" x2="460" y2="255" stroke="#2563eb" stroke-width="4"/>
  <path d="M180 280 L320 280" stroke="#64748b" stroke-width="2" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>
  <path d="M320 280 L460 280" stroke="#64748b" stroke-width="2" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="180" y="50">100 V</text>
    <text x="320" y="50">80 V</text>
    <text x="460" y="50">60 V</text>
    <text x="250" y="310">2 cm</text>
    <text x="390" y="310">2 cm</text>
  </g>
</svg>`,
};

const capacitorNetworkFigure: ItemFigure = {
  type: "svg",
  title: "Capacitor network",
  description:
    "A 2 microfarad capacitor is in series with a parallel combination of 3 microfarad and 6 microfarad capacitors across a 12 volt battery.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <g stroke="#334155" stroke-width="3" fill="none">
    <path d="M95 180 H170"/>
    <path d="M230 180 H320"/>
    <path d="M320 180 V95 H430"/>
    <path d="M490 95 H590 V265 H490"/>
    <path d="M430 265 H320 V180"/>
    <path d="M590 180 H630"/>
    <path d="M95 140 V220"/>
    <path d="M75 155 V205"/>
    <path d="M75 180 H35"/>
    <path d="M630 180 H665"/>
  </g>
  <g stroke="#2563eb" stroke-width="4">
    <line x1="170" y1="145" x2="170" y2="215"/>
    <line x1="230" y1="145" x2="230" y2="215"/>
    <line x1="430" y1="65" x2="430" y2="125"/>
    <line x1="490" y1="65" x2="490" y2="125"/>
    <line x1="430" y1="235" x2="430" y2="295"/>
    <line x1="490" y1="235" x2="490" y2="295"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="200" y="135">2 &#956;F</text>
    <text x="460" y="55">3 &#956;F</text>
    <text x="460" y="325">6 &#956;F</text>
    <text x="85" y="118">12 V</text>
    <text x="60" y="170">+</text>
    <text x="60" y="205">-</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Electric Charge, Charge Conservation and Coulomb's Law",
    subtopic:
      "Law of charges, charge quantisation, conservation, inverse-square force, and superposition of forces",
    mc: [
      {
        questionLatex: L`Two point charges $+3\,\mu\text{C}$ and $-12\,\mu\text{C}$ are fixed $0.30\text{ m}$ apart. The point where the net electric field is zero lies`,
        difficulty: 4,
        skillTags: [
          "coulomb_law",
          "electric_field_zero_point",
          "sign_reasoning",
        ],
        commonMisconceptions: [
          "assumes_zero_field_must_lie_between_opposite_charges",
        ],
        choices: [
          L`$0.10\text{ m}$ from $+3\,\mu\text{C}$, between the charges`,
          L`$0.30\text{ m}$ outside the $+3\,\mu\text{C}$ charge`,
          L`$0.30\text{ m}$ outside the $-12\,\mu\text{C}$ charge`,
          L`at the midpoint of the two charges`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Between opposite charges, the two fields point in the same direction, so cancellation cannot occur there.",
          C: "Outside the larger-magnitude charge, the larger charge is also closer, so its field cannot be balanced.",
          D: "At the midpoint the fields due to unlike charges reinforce, they do not cancel.",
        },
        hints: [
          "First decide the possible region from field directions, not from algebra.",
          L`For unlike charges, cancellation must be outside the smaller-magnitude charge.`,
          L`Set $3/x^2=12/(x+0.30)^2$ for a point to the left of $+3\,\mu\text{C}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Between unlike charges, both fields point toward the negative charge, so the zero point is not between them.",
          },
          {
            step: 2,
            explanation:
              "Let the point be at distance x outside the smaller charge. Its distance from the larger charge is x + 0.30.",
            math: L`\frac{3}{x^2}=\frac{12}{(x+0.30)^2}`,
          },
          {
            step: 3,
            explanation: "Solving gives x = 0.30 m.",
            math: L`x+0.30=2x\Rightarrow x=0.30\ \mathrm{m}`,
          },
        ],
      },
      {
        questionLatex: L`Two charges $q$ and $4q$ exert force $F$ on each other at separation $r$. If both charges are doubled and the separation becomes $3r$, the new force is`,
        difficulty: 2,
        skillTags: ["coulomb_law_scaling"],
        choices: [
          L`$\frac{2F}{9}$`,
          L`$\frac{16F}{9}$`,
          L`$\frac{8F}{9}$`,
          L`$\frac{4F}{9}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Both charges are doubled, so the charge product becomes four times, not two times.",
          B: "This includes the charge-product increase but forgets the distance is tripled.",
          C: "This treats only one charge or distance factor incorrectly.",
        },
        hints: [
          L`Coulomb force is proportional to $q_1q_2/r^2$.`,
          "Track the charge product and distance factors separately.",
          L`The charge factor is $4$ and the distance factor is $1/9$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Doubling both charges makes the product four times.",
            math: L`q_1q_2\to 4q_1q_2`,
          },
          {
            step: 2,
            explanation: "Tripling the separation divides the force by 9.",
            math: L`F' = F\times 4\times \frac{1}{9}=\frac{4F}{9}`,
          },
        ],
      },
      {
        questionLatex: L`Two equal positive charges are fixed at the ends of a line segment. At the midpoint of the segment, which statement is correct?`,
        difficulty: 2,
        skillTags: ["electric_field", "electric_potential", "superposition"],
        choices: [
          L`Electric field is zero and electric potential is zero.`,
          L`Electric field is non-zero and electric potential is zero.`,
          L`Electric field is non-zero and electric potential is positive.`,
          L`Electric field is zero and electric potential is positive.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The field cancels, but potential is scalar and adds.",
          B: "The equal and opposite field vectors cancel at the midpoint.",
          C: "This treats potential correctly but misses vector cancellation of the field.",
        },
        hints: [
          "Separate vector addition from scalar addition.",
          "The two electric fields have equal magnitudes but opposite directions.",
          "The two potentials have the same positive sign.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The fields due to equal positive charges at the midpoint are equal and opposite.",
            math: L`\vec E_\text{net}=0`,
          },
          {
            step: 2,
            explanation:
              "Potential is a scalar, so the two positive contributions add.",
            math: L`V_\text{net}=\frac{kq}{r}+\frac{kq}{r}>0`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: The force exerted by charge $q_1$ on charge $q_2$ is unchanged by the presence of a third charge. Reason: The net force on a charge is the vector sum of forces due to all other charges.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "superposition_principle"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason is exactly the superposition idea: pairwise forces are calculated separately and then added.",
          C: "The reason is true; electrostatic forces obey vector superposition.",
          D: "The assertion is true in electrostatics: a third charge changes the net force, not the pairwise force between two given charges.",
        },
        hints: [
          "Distinguish a pairwise force from the net force.",
          "A third charge contributes an additional force term.",
          "Superposition means calculate separately, then add vectors.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The force of q1 on q2 is computed from their charges and separation.",
            math: L`\vec F_\text{net on 2}=\vec F_{12}+\vec F_{32}+\cdots`,
          },
          {
            step: 2,
            explanation:
              "The third charge adds another vector force but does not alter the pairwise Coulomb force.",
          },
        ],
      },
      {
        questionLatex: L`Charges $+2\,\mu\text{C}$ and $+8\,\mu\text{C}$ are fixed $0.60\text{ m}$ apart. A small positive test charge is placed on the line joining them. The point of zero net force on the test charge is`,
        difficulty: 3,
        skillTags: ["coulomb_law", "zero_force_point", "ratio_reasoning"],
        choices: [
          L`$0.20\text{ m}$ from the $+2\,\mu\text{C}$ charge, between the charges`,
          L`$0.40\text{ m}$ from the $+2\,\mu\text{C}$ charge, between the charges`,
          L`$0.20\text{ m}$ outside the $+2\,\mu\text{C}$ charge`,
          L`$0.40\text{ m}$ outside the $+8\,\mu\text{C}$ charge`,
        ],
        correctLetter: "A",
        rationales: {
          B: "At 0.40 m from the smaller charge, the test charge is too close to the larger charge.",
          C: "For like charges, the fields oppose only between the two charges.",
          D: "Outside the larger charge, both fields point in the same direction.",
        },
        hints: [
          "For like charges, cancellation can occur between them.",
          L`Let the distance from $+2\,\mu\text{C}$ be $x$.`,
          L`Use $2/x^2=8/(0.60-x)^2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Between like charges the forces on a positive test charge are opposite.",
            math: L`\frac{2}{x^2}=\frac{8}{(0.60-x)^2}`,
          },
          {
            step: 2,
            explanation: "The distance from the larger charge is twice x.",
            math: L`0.60-x=2x\Rightarrow x=0.20\ \mathrm{m}`,
          },
        ],
      },
      {
        questionLatex: L`Two small charged balls are brought near each other and repel. Which conclusion is necessarily correct?`,
        difficulty: 2,
        skillTags: ["law_of_charges", "charge_sign_reasoning"],
        commonMisconceptions: [
          "assumes_repulsion_means_both_charges_are_positive",
        ],
        choices: [
          "Both balls must be positively charged.",
          "Both balls must carry charges of the same sign.",
          "One ball must be charged and the other must be neutral.",
          "The balls must carry charges of opposite signs.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Repulsion proves same sign, but the common sign could be positive or negative.",
          C: "A charged and neutral conductor can attract by induction; repulsion requires like charges.",
          D: "Opposite charges attract, not repel.",
        },
        hints: [
          "Recall the law of charges.",
          "Like charges repel and unlike charges attract.",
          "Repulsion is the stronger evidence than attraction for identifying charge state.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "By the law of charges, repulsion occurs between like charges.",
          },
          {
            step: 2,
            explanation:
              "Therefore the balls have the same sign; the observation alone does not say whether both are positive or both are negative.",
          },
        ],
      },
      {
        questionLatex: L`A glass rod rubbed with silk becomes positively charged. This means that during rubbing`,
        difficulty: 2,
        skillTags: ["charging_by_friction", "charge_conservation"],
        commonMisconceptions: [
          "thinks_positive_charge_is_created_during_rubbing",
        ],
        choices: [
          "protons are transferred from glass to silk",
          "electrons are transferred from glass to silk",
          "positive charge is created on the glass rod",
          "equal amounts of positive and negative charge disappear",
        ],
        correctLetter: "B",
        rationales: {
          A: "Protons remain bound in nuclei during ordinary rubbing.",
          C: "Net positive charge appears because electrons are lost, not because positive charge is created.",
          D: "Charge is conserved; it is transferred, not destroyed.",
        },
        hints: [
          "In ordinary electrostatic charging, electrons move.",
          "A body becomes positive when it loses electrons.",
          "Total charge of the glass-silk system is conserved.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The glass rod becomes positively charged because it loses electrons.",
          },
          {
            step: 2,
            explanation:
              "Those electrons are transferred to silk, so total charge is conserved.",
          },
        ],
      },
      {
        questionLatex: L`A charge of $7.2\times10^{-19}\text{ C}$ is proposed for an isolated small body. Taking $e=1.6\times10^{-19}\text{ C}$, this value is`,
        difficulty: 3,
        skillTags: ["charge_quantisation", "electron_charge"],
        choices: [
          "possible, because it is less than $10^{-18}\text{ C}$",
          "possible, because any small decimal charge can occur",
          "not possible, because it is not an integral multiple of $e$",
          "not possible, because charge must always be positive",
        ],
        correctLetter: "C",
        rationales: {
          A: "Smallness is not the condition for possible isolated charge.",
          B: "Charge on an isolated body is quantised, not continuous.",
          D: "Bodies can carry negative charge as well as positive charge.",
        },
        hints: [
          L`Check whether $q/e$ is an integer.`,
          L`Compute $7.2/1.6$.`,
          "A fractional number of electrons is not possible for an isolated body.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For an isolated body, charge must be an integral multiple of e.",
            math: L`\frac{q}{e}=\frac{7.2\times10^{-19}}{1.6\times10^{-19}}=4.5`,
          },
          {
            step: 2,
            explanation:
              "Since 4.5 is not an integer, this proposed charge is not possible.",
          },
        ],
      },
      {
        questionLatex: L`Two identical conducting spheres carry charges $+10\,\mu\text{C}$ and $-4\,\mu\text{C}$. They are touched and separated. The charge on each sphere after separation is`,
        difficulty: 3,
        skillTags: ["charge_conservation", "identical_conductors"],
        choices: [
          L`$+3\,\mu\text{C}$`,
          L`$+6\,\mu\text{C}$`,
          L`$-3\,\mu\text{C}$`,
          L`$+7\,\mu\text{C}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the total charge, not the charge on each identical sphere.",
          C: "The algebraic total charge is positive, not negative.",
          D: "This averages magnitudes 10 and 4 instead of algebraic charges.",
        },
        hints: [
          "Use algebraic charge, not magnitudes.",
          "Identical conducting spheres share total charge equally.",
          L`Total charge $=+10-4=+6\,\mu\text{C}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Total charge is conserved.",
            math: L`Q_\text{total}=+10\,\mu\mathrm C-4\,\mu\mathrm C=+6\,\mu\mathrm C`,
          },
          {
            step: 2,
            explanation:
              "The spheres are identical, so the final charge is shared equally.",
            math: L`q'=\frac{+6\,\mu\mathrm C}{2}=+3\,\mu\mathrm C`,
          },
        ],
      },
      {
        questionLatex: L`Two charges exert an electrostatic force of magnitude $F$ at separation $r$. If the separation is reduced to $r/2$ without changing the charges, the force magnitude becomes`,
        difficulty: 2,
        skillTags: ["coulomb_law_scaling", "inverse_square_law"],
        choices: [L`$F/4$`, L`$F/2$`, L`$2F$`, L`$4F$`],
        correctLetter: "D",
        rationales: {
          A: "This reverses the inverse-square dependence.",
          B: "This treats force as inversely proportional to distance, not distance squared.",
          C: "This misses the square in the inverse-square law.",
        },
        hints: [
          L`Coulomb force varies as $1/r^2$.`,
          L`Replacing $r$ by $r/2$ makes the denominator $(r/2)^2$.`,
          "Halving distance makes inverse-square force four times.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the inverse-square dependence of Coulomb's law.",
            math: L`F'\propto \frac{1}{(r/2)^2}=\frac{4}{r^2}`,
          },
          {
            step: 2,
            explanation: "Therefore the force magnitude becomes four times.",
            math: L`F'=4F`,
          },
        ],
      },
      {
        questionLatex: L`Three charges lie on a straight line as $+q$, $+2q$, and $-q$ from left to right at equal separations $a$. The net force on the middle charge is`,
        difficulty: 4,
        skillTags: [
          "coulomb_law",
          "superposition_principle",
          "force_direction",
        ],
        commonMisconceptions: [
          "subtracts_force_magnitudes_without_checking_directions",
        ],
        choices: [
          L`zero`,
          L`$\frac{2kq^2}{a^2}$ to the right`,
          L`$\frac{4kq^2}{a^2}$ to the right`,
          L`$\frac{2kq^2}{a^2}$ to the left`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The left charge repels the middle charge to the right and the right charge attracts it to the right, so they add.",
          B: "This includes only one of the two equal force contributions.",
          D: "Both forces on the middle charge point to the right.",
        },
        hints: [
          "Draw the direction of force on the middle charge due to each outer charge.",
          "The left positive charge repels the middle positive charge.",
          "The right negative charge attracts the middle positive charge.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The force due to the left charge is repulsive and points right.",
            math: L`F_L=\frac{k(q)(2q)}{a^2}=\frac{2kq^2}{a^2}`,
          },
          {
            step: 2,
            explanation:
              "The force due to the right charge is attractive and also points right.",
            math: L`F_R=\frac{k(q)(2q)}{a^2}=\frac{2kq^2}{a^2}`,
          },
          {
            step: 3,
            explanation: "The two contributions add.",
            math: L`F_\text{net}=\frac{4kq^2}{a^2}\ \text{to the right}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A small body has charge $-9.6\times 10^{-19}\text{ C}$. Find the number of excess electrons on it. Take $e=1.6\times 10^{-19}\text{ C}$.`,
        difficulty: 1,
        skillTags: ["charge_quantisation"],
        parts: [part("a", "Find the number of excess electrons.", 1)],
        hints: [
          L`Charge is quantised in units of $e$.`,
          L`For excess electrons, use the magnitude of the charge.`,
          L`Compute $n=|q|/e$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Uses charge quantisation and obtains 6 excess electrons.",
          },
        ]),
        commonErrors: [
          "Keeping the negative sign as a negative number of electrons.",
          "Dividing by 10 instead of by the electronic charge.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The negative sign shows the charge is due to excess electrons. The number is found from the magnitude.",
            math: L`n=\frac{9.6\times 10^{-19}}{1.6\times 10^{-19}}=6`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two point charges $+5\,\mu\text{C}$ and $-2\,\mu\text{C}$ are separated by $0.30\text{ m}$ in air. Take $k=9.0\times 10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["coulomb_law", "force_direction"],
        parts: [
          part("a", "Find the magnitude of the electrostatic force.", 2),
          part("b", "State whether the force is attractive or repulsive.", 1),
        ],
        hints: [
          L`Use $F=k|q_1q_2|/r^2$.`,
          "Unlike charges attract.",
          L`Convert microcoulomb to coulomb before substitution.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Substitutes converted charges correctly and obtains 1 N.",
          },
          {
            part: "b",
            points: 1,
            description: "Identifies that unlike charges attract.",
          },
        ]),
        commonErrors: [
          "Forgetting the square on separation.",
          "Reporting a negative force magnitude.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Use magnitudes in Coulomb's law to find the force magnitude.",
            math: L`F=\frac{(9.0\times10^9)(5\times10^{-6})(2\times10^{-6})}{(0.30)^2}=1.0\ \mathrm{N}`,
          },
          {
            part: "b",
            explanation:
              "Since the charges are unlike, each charge pulls the other toward itself.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For the three charges shown, find the net electrostatic force on charge B. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "superposition_principle",
          "force_direction",
          "line_charges",
        ],
        figure: threeChargeLineFigure,
        parts: [
          part(
            "a",
            "Find the magnitude and direction of the net force on B.",
            3,
          ),
        ],
        hints: [
          "Find the force on B due to A and due to C separately.",
          "A repels B to the right; C attracts B to the right.",
          L`Add the magnitudes because both forces on B point in the same direction.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description:
              "Computes both force contributions and adds them with correct direction.",
          },
        ]),
        commonErrors: [
          "Subtracting the forces because one source charge is negative.",
          "Using 0.50 m for both separations.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Force on B due to A is repulsive and points right.",
            math: L`F_{BA}=\frac{k(4\times10^{-6})(1\times10^{-6})}{(0.20)^2}=0.90\ \mathrm{N}`,
          },
          {
            part: "a",
            explanation:
              "Force on B due to C is attractive and also points right.",
            math: L`F_{BC}=\frac{k(9\times10^{-6})(1\times10^{-6})}{(0.30)^2}=0.90\ \mathrm{N}`,
          },
          {
            part: "a",
            explanation:
              "Both forces act to the right, so the net force is 1.8 N to the right.",
            math: L`F_\text{net}=0.90+0.90=1.80\ \mathrm{N}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Four identical positive charges $Q$ are fixed at the corners of a square of side $a$. Find the magnitude and direction of the net force on the charge at one corner due to the other three charges.`,
        difficulty: 5,
        skillTags: [
          "superposition_principle",
          "vector_addition",
          "square_geometry",
        ],
        parts: [
          part(
            "a",
            "Resolve the forces due to the two adjacent corner charges.",
            2,
          ),
          part(
            "b",
            "Include the force due to the diagonally opposite charge.",
            2,
          ),
          part("c", "Write the final magnitude and direction.", 1),
        ],
        hints: [
          L`Each adjacent charge exerts force $F=kQ^2/a^2$.`,
          "The two adjacent forces are perpendicular.",
          L`The diagonal charge is at distance $\sqrt2a$, so its force is $F/2$ along the same diagonal direction as the resultant of the adjacent forces.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Finds the two perpendicular adjacent forces and their resultant.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Finds the diagonal force as half the adjacent-force magnitude and aligns it correctly.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Combines the contributions and states the diagonal outward direction.",
          },
        ]),
        commonErrors: [
          "Using distance a for the diagonal charge.",
          "Adding all three force magnitudes directly.",
          "Missing the direction of the net force.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Let the force due to each adjacent charge be F. Their resultant is along the diagonal through the corner.",
            math: L`F=\frac{kQ^2}{a^2},\qquad F_\text{adj}=\sqrt2F`,
          },
          {
            part: "b",
            explanation:
              "The diagonally opposite charge is at distance sqrt(2)a, so its force is F/2 and it acts along the same diagonal.",
            math: L`F_\text{diag}=\frac{kQ^2}{(\sqrt2a)^2}=\frac{F}{2}`,
          },
          {
            part: "c",
            explanation:
              "The net force is along the diagonal away from the centre of the square.",
            math: L`F_\text{net}=\left(\sqrt2+\frac12\right)\frac{kQ^2}{a^2}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two identical conducting spheres A and B carry charges $+6\,\mu\text{C}$ and $-2\,\mu\text{C}$ respectively. They are touched together and then separated by $0.20\text{ m}$ in air. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["charge_conservation", "conducting_spheres", "coulomb_law"],
        parts: [
          part("a", "Find the charge on each sphere after contact.", 2),
          part(
            "b",
            "State whether the force after separation is attractive or repulsive.",
            1,
          ),
          part("c", "Find the magnitude of that force.", 2),
        ],
        hints: [
          "Identical conductors share the total charge equally.",
          "After contact, both charges have the same sign.",
          L`Use $F=kq^2/r^2$ after separation.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Applies charge conservation and equal sharing.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Identifies repulsion after both spheres become positive.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Substitutes the final charge and separation into Coulomb's law.",
          },
        ]),
        commonErrors: [
          "Averaging magnitudes instead of algebraic charges.",
          "Using the original charges after contact.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The total charge is conserved and is shared equally because the spheres are identical.",
            math: L`q'=\frac{(+6-2)\,\mu\mathrm C}{2}=+2\,\mu\mathrm C`,
          },
          {
            part: "b",
            explanation:
              "Both final charges are positive, so the force is repulsive.",
          },
          {
            part: "c",
            explanation: "Use the final charge on each sphere.",
            math: L`F=\frac{(9.0\times10^9)(2\times10^{-6})^2}{(0.20)^2}=0.90\ \mathrm N`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Electric Field and Electric Dipole",
    subtopic:
      "Field due to point charges, field-line reasoning, dipole field, torque, and energy",
    mc: [
      {
        questionLatex: L`At a point on the perpendicular bisector of an electric dipole, the electric field due to the dipole is directed`,
        difficulty: 2,
        skillTags: ["electric_dipole", "field_direction"],
        choices: [
          "along the dipole moment",
          "radially away from the midpoint",
          "perpendicular to the dipole moment",
          "opposite to the dipole moment",
        ],
        correctLetter: "D",
        rationales: {
          A: "Along the axial line outside the positive end the field is along the dipole moment, but the perpendicular bisector is different.",
          B: "A dipole field is not radial from the midpoint like a single point charge.",
          C: "The perpendicular components cancel; the components along the dipole axis add opposite to the dipole moment.",
        },
        hints: [
          "Draw the field contribution of +q and -q at an equatorial point.",
          "The perpendicular components cancel.",
          "The remaining components point from +q toward -q.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At an equatorial point, the components perpendicular to the dipole axis cancel.",
          },
          {
            step: 2,
            explanation:
              "The components along the dipole axis point opposite to the dipole moment.",
          },
        ],
      },
      {
        questionLatex: L`A point charge produces an electric field of $1.8\times10^5\text{ N C}^{-1}$ at a distance $0.30\text{ m}$ in air. The magnitude of the charge is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electric_field_point_charge"],
        choices: [
          L`$6.0\times10^{-7}\text{ C}$`,
          L`$1.8\times10^{-6}\text{ C}$`,
          L`$5.4\times10^{-6}\text{ C}$`,
          L`$1.8\times10^{-5}\text{ C}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses r instead of r squared.",
          C: "This multiplies by distance instead of using $r^2$ correctly.",
          D: "This is a power-of-ten slip after rearranging the field formula.",
        },
        hints: [
          L`For a point charge, $E=k|q|/r^2$.`,
          L`Rearrange to $|q|=Er^2/k$.`,
          L`Use $k=9.0\times10^9$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Rearrange the field formula.",
            math: L`|q|=\frac{Er^2}{k}`,
          },
          {
            step: 2,
            explanation: "Substitute the given values.",
            math: L`|q|=\frac{(1.8\times10^5)(0.30)^2}{9.0\times10^9}=1.8\times10^{-6}\ \mathrm C`,
          },
        ],
      },
      {
        questionLatex: L`An electric dipole of moment $4.0\times10^{-8}\text{ C m}$ is placed in a uniform field $2.0\times10^5\text{ N C}^{-1}$ at $30^\circ$ to the field. The torque magnitude is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["dipole_torque"],
        figure: dipoleAxisFigure,
        choices: [
          L`$2.0\times10^{-3}\text{ N m}$`,
          L`$4.0\times10^{-3}\text{ N m}$`,
          L`$8.0\times10^{-3}\text{ N m}$`,
          L`$1.6\times10^{-2}\text{ N m}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This effectively uses $\sin 15^\circ$ or halves the result twice.`,
          C: L`This omits the $\sin 30^\circ$ factor.`,
          D: "This doubles instead of applying the sine factor.",
        },
        hints: [
          L`Use $\tau=pE\sin\theta$.`,
          L`Here $\sin30^\circ=1/2$.`,
          L`First find $pE$, then halve it.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The torque on a dipole in a uniform field is pE sin theta.",
            math: L`\tau=pE\sin\theta`,
          },
          {
            step: 2,
            explanation: "Substitute the values.",
            math: L`\tau=(4.0\times10^{-8})(2.0\times10^5)\sin30^\circ=4.0\times10^{-3}\ \mathrm{N\,m}`,
          },
        ],
      },
      {
        questionLatex: L`Two electric field lines cannot intersect because at an intersection point`,
        difficulty: 2,
        skillTags: ["electric_field_lines"],
        choices: [
          "the electric potential would become zero",
          "the charge placed there would become neutral",
          "the electric field would have two directions",
          "the electric flux would become infinite",
        ],
        correctLetter: "C",
        rationales: {
          A: "Potential can be zero at a point without causing intersecting field lines.",
          B: "A test charge does not lose its charge because of field-line geometry.",
          D: "Flux depends on field and area; intersection is a direction issue.",
        },
        hints: [
          "A field line's tangent gives the direction of the electric field.",
          "At a single point, the field vector has one definite direction.",
          "Intersection would imply two tangents at the same point.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The tangent to a field line gives the direction of the electric field.",
          },
          {
            step: 2,
            explanation:
              "If two lines intersected, the field at one point would need two directions, which is impossible.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: An electric dipole placed in a uniform electric field may experience torque but has zero net force. Reason: The two charges of the dipole experience equal and opposite forces in a uniform field.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "dipole_in_uniform_field"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The equal and opposite forces explain zero net force; their different lines of action can still produce torque.",
          C: "The reason is true in a uniform field.",
          D: "The assertion is also true for a dipole in a uniform field.",
        },
        hints: [
          "Compare force balance with rotational effect.",
          "Uniform field means the magnitudes of the two forces are equal.",
          "A couple can have zero resultant force and non-zero torque.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The forces on +q and -q have equal magnitudes and opposite directions in a uniform field.",
          },
          {
            step: 2,
            explanation:
              "Their resultant force is zero, but if the dipole is not aligned with the field, the forces form a couple and rotate it.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the electric field magnitude at $0.30\text{ m}$ from a point charge $+2.0\,\mu\text{C}$. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electric_field_point_charge"],
        parts: [part("a", "Find the field magnitude.", 1)],
        hints: [
          L`Use $E=kq/r^2$.`,
          L`Convert $2.0\,\mu\text{C}$ to coulomb.`,
          L`The direction would be away from the positive charge.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Correctly computes the field magnitude.",
          },
        ]),
        commonErrors: [
          "Using r instead of r squared.",
          "Forgetting the microcoulomb conversion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Substitute in the point-charge field formula.",
            math: L`E=\frac{(9.0\times10^9)(2.0\times10^{-6})}{(0.30)^2}=2.0\times10^5\ \mathrm{N\,C^{-1}}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`At a point, two perpendicular electric fields have magnitudes $3.0\times10^4\text{ N C}^{-1}$ east and $4.0\times10^4\text{ N C}^{-1}$ north.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["electric_field_vector_addition"],
        parts: [
          part("a", "Find the resultant field magnitude.", 1),
          part("b", "Find its direction with respect to east.", 1),
        ],
        hints: [
          "The two field vectors are perpendicular.",
          "Use Pythagoras for the magnitude.",
          L`Use $\tan\theta=E_y/E_x$ for direction.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Obtains resultant magnitude using vector addition.",
          },
          {
            part: "b",
            points: 1,
            description: "Gives the correct angle north of east.",
          },
        ]),
        commonErrors: [
          "Adding magnitudes directly.",
          "Measuring the angle from north instead of east.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The fields are perpendicular.",
            math: L`E=\sqrt{(3.0\times10^4)^2+(4.0\times10^4)^2}=5.0\times10^4\ \mathrm{N\,C^{-1}}`,
          },
          {
            part: "b",
            explanation: "The direction is measured from east toward north.",
            math: L`\tan\theta=\frac{4}{3}\Rightarrow \theta\approx 53^\circ`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An electric dipole is placed in a uniform electric field.`,
        difficulty: 3,
        skillTags: ["dipole_energy", "stable_equilibrium"],
        parts: [
          part("a", "State the orientation for stable equilibrium.", 1),
          part("b", "Use potential energy to justify your answer.", 2),
        ],
        hints: [
          L`Dipole potential energy is $U=-pE\cos\theta$.`,
          "Stable equilibrium corresponds to minimum potential energy.",
          "Minimum U occurs when cos theta is maximum.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States alignment of dipole moment with the field.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Uses potential energy expression and minimum-energy condition.",
          },
        ]),
        commonErrors: [
          "Confusing stable and unstable equilibrium.",
          "Taking the minimum of cos theta instead of U.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The dipole is in stable equilibrium when its dipole moment is parallel to the field.",
            math: L`\theta=0^\circ`,
          },
          {
            part: "b",
            explanation:
              "The potential energy is minimum when cos theta is maximum.",
            math: L`U=-pE\cos\theta,\qquad U_\text{min}=-pE`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Charges $+5\,\mu\text{C}$ and $-5\,\mu\text{C}$ are separated by $20\text{ cm}$. Find the electric field and electric potential at the midpoint of the line joining them. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["dipole_midpoint", "electric_field", "electric_potential"],
        parts: [
          part(
            "a",
            "Find the electric field magnitude and direction at the midpoint.",
            3,
          ),
          part("b", "Find the electric potential at the midpoint.", 2),
        ],
        hints: [
          "The midpoint is 0.10 m from each charge.",
          "At the midpoint, both field contributions point from + charge toward - charge.",
          "Potential is scalar and the two contributions have opposite signs.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description:
              "Adds field contributions with correct direction and magnitude.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Adds scalar potentials and obtains zero at the midpoint.",
          },
        ]),
        commonErrors: [
          "Cancelling fields because the charges have equal magnitude.",
          "Adding potential magnitudes without signs.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The field due to the positive charge points away from it; the field due to the negative charge points toward it. Both are in the same direction at the midpoint.",
            math: L`E=2\frac{kq}{r^2}=2\frac{(9.0\times10^9)(5\times10^{-6})}{(0.10)^2}=9.0\times10^6\ \mathrm{N\,C^{-1}}`,
          },
          {
            part: "b",
            explanation:
              "Potential is scalar, so the equal positive and negative terms cancel.",
            math: L`V=\frac{kq}{r}+\frac{k(-q)}{r}=0`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A dipole of moment $6.0\times10^{-8}\text{ C m}$ is placed in a uniform electric field of magnitude $5.0\times10^4\text{ N C}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["dipole_torque", "dipole_potential_energy", "work_done"],
        parts: [
          part("a", "Find the maximum torque on the dipole.", 1),
          part(
            "b",
            "Find its potential energy when aligned with the field.",
            2,
          ),
          part(
            "c",
            "Find the work required by an external agent to rotate it slowly from aligned to anti-aligned position.",
            2,
          ),
        ],
        hints: [
          "Maximum torque occurs at 90 degrees.",
          L`Use $U=-pE\cos\theta$.`,
          "Work by an external agent in slow rotation equals the increase in potential energy.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes maximum torque as pE.",
          },
          {
            part: "b",
            points: 2,
            description: "Finds potential energy at theta = 0.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Finds the change in potential energy from theta = 0 to 180 degrees.",
          },
        ]),
        commonErrors: [
          "Using sine instead of cosine for potential energy.",
          "Forgetting that the work from aligned to anti-aligned is 2pE.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The maximum value of pE sin theta is pE.",
            math: L`\tau_\text{max}=pE=(6.0\times10^{-8})(5.0\times10^4)=3.0\times10^{-3}\ \mathrm{N\,m}`,
          },
          {
            part: "b",
            explanation: "For alignment with the field, theta is 0 degrees.",
            math: L`U_0=-pE=-3.0\times10^{-3}\ \mathrm J`,
          },
          {
            part: "c",
            explanation:
              "Anti-aligned position has U = +pE, so the increase is 2pE.",
            math: L`W_\text{ext}=\Delta U=+pE-(-pE)=2pE=6.0\times10^{-3}\ \mathrm J`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Electric Flux and Gauss's Law",
    subtopic:
      "Flux, closed surfaces, symmetry arguments, and fields due to standard charge distributions",
    mc: [
      {
        questionLatex: L`A closed surface encloses a net charge $+2.0\,\mu\text{C}$. The total electric flux through the surface is`,
        difficulty: 2,
        skillTags: ["gauss_law", "electric_flux"],
        choices: [
          L`$2.0\times10^{-6}\varepsilon_0$`,
          L`$\frac{2.0\times10^{-6}}{\varepsilon_0}$`,
          L`$2.0\times10^{-6}k$`,
          L`zero, because the surface is closed`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Gauss law divides enclosed charge by epsilon naught, not multiplies by it.",
          C: "Coulomb's constant is not the direct constant in Gauss law.",
          D: "A closed surface can have non-zero flux if it encloses net charge.",
        },
        hints: [
          L`Gauss law: $\Phi_E=q_\text{enc}/\varepsilon_0$.`,
          "Only enclosed net charge matters.",
          "Do not use the surface area unless field is being derived.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply Gauss law directly.",
            math: L`\Phi_E=\frac{q_\text{enc}}{\varepsilon_0}=\frac{2.0\times10^{-6}}{\varepsilon_0}`,
          },
        ],
      },
      {
        questionLatex: L`In the figure, what is the net electric flux through the closed surface S?`,
        difficulty: 3,
        skillTags: ["gauss_law", "enclosed_charge"],
        figure: gaussianSurfaceFigure,
        choices: [
          L`zero, because the outside charge cancels the inside charge`,
          L`$\frac{3.0\times10^{-6}}{\varepsilon_0}$`,
          L`$-\frac{3.0\times10^{-6}}{\varepsilon_0}$`,
          L`$\frac{6.0\times10^{-6}}{\varepsilon_0}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Only charge enclosed by S contributes to net flux. The outside charge does not cancel it.",
          C: "The enclosed charge is positive, so outward flux is positive.",
          D: "This incorrectly includes the charge outside the closed surface.",
        },
        hints: [
          "Circle the charges inside S only.",
          "External charges can affect field at points on S but not net flux through S.",
          L`Use $\Phi_E=q_\text{inside}/\varepsilon_0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The surface encloses only the +3 microcoulomb charge.",
            math: L`q_\text{enc}=+3.0\times10^{-6}\ \mathrm C`,
          },
          {
            step: 2,
            explanation: "Gauss law gives the net outward flux.",
            math: L`\Phi_E=\frac{3.0\times10^{-6}}{\varepsilon_0}`,
          },
        ],
      },
      {
        questionLatex: L`Two large parallel sheets carry surface charge densities $+\sigma$ and $-\sigma$. Ignoring edge effects, the electric field in the region between the sheets has magnitude`,
        difficulty: 3,
        skillTags: ["infinite_sheet_field", "superposition"],
        choices: [
          L`zero`,
          L`$\frac{\sigma}{2\varepsilon_0}$`,
          L`$\frac{\sigma}{\varepsilon_0}$`,
          L`$\frac{2\sigma}{\varepsilon_0}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Between oppositely charged sheets the fields point in the same direction.",
          B: "This is the field of one isolated infinite sheet, not the combined field between two oppositely charged sheets.",
          D: "Each sheet contributes sigma over two epsilon naught, so the sum is sigma over epsilon naught.",
        },
        hints: [
          L`One infinite sheet gives $E=\sigma/(2\varepsilon_0)$.`,
          "Check field directions between the sheets.",
          "The two fields add between oppositely charged sheets.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Each sheet produces field magnitude sigma over 2 epsilon naught.",
            math: L`E_1=E_2=\frac{\sigma}{2\varepsilon_0}`,
          },
          {
            step: 2,
            explanation:
              "Between the sheets, the two fields have the same direction.",
            math: L`E=\frac{\sigma}{2\varepsilon_0}+\frac{\sigma}{2\varepsilon_0}=\frac{\sigma}{\varepsilon_0}`,
          },
        ],
      },
      {
        questionLatex: L`A uniformly charged thin spherical shell has charge $Q$ and radius $R$. The electric field at a point $R/2$ from its centre is`,
        difficulty: 2,
        skillTags: ["spherical_shell", "gauss_law"],
        choices: [
          L`zero`,
          L`$\frac{kQ}{R^2}$`,
          L`$\frac{4kQ}{R^2}$`,
          L`$\frac{kQ}{2R^2}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the field just outside a charged shell, not inside it.",
          C: "This incorrectly treats the shell charge as a point charge at the centre for an inside point.",
          D: "Inside a uniformly charged shell, the Gaussian surface encloses no charge.",
        },
        hints: [
          "Use a spherical Gaussian surface of radius less than R.",
          "How much charge lies inside that Gaussian sphere?",
          "For a charged shell, field inside is zero.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A Gaussian sphere of radius R/2 lies inside the charged shell and encloses no charge.",
            math: L`q_\text{enc}=0`,
          },
          {
            step: 2,
            explanation: "By Gauss law, the electric field inside is zero.",
            math: L`E=0`,
          },
        ],
      },
      {
        questionLatex: L`Which statement best captures the role of symmetry in using Gauss's law to find electric field?`,
        difficulty: 3,
        skillTags: ["gauss_law", "symmetry"],
        choices: [
          "Gauss's law is valid only for spherical charge distributions.",
          "Gauss's law is valid only when the electric field is uniform.",
          "Gauss's law is always valid, but direct field calculation is simple only for suitable symmetry.",
          "Gauss's law cannot be applied to continuous charge distributions.",
        ],
        correctLetter: "C",
        rationales: {
          A: "Gauss law is not limited to spherical symmetry.",
          B: "The law is valid even when the field varies over the surface.",
          D: "Gauss law is especially useful for continuous distributions with high symmetry.",
        },
        hints: [
          "Validity of the law and ease of calculation are different ideas.",
          "Gauss law uses total flux over a closed surface.",
          "Symmetry lets E come outside the integral.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Gauss law is a general law for closed surfaces.",
            math: L`\oint \vec E\cdot d\vec A=\frac{q_\text{enc}}{\varepsilon_0}`,
          },
          {
            step: 2,
            explanation:
              "To solve for E directly, symmetry must make the field magnitude constant or zero over chosen parts of the surface.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A closed surface encloses charges $+3.0\,\mu\text{C}$ and $-1.0\,\mu\text{C}$. Find the net electric flux through it.`,
        difficulty: 2,
        skillTags: ["gauss_law", "net_enclosed_charge"],
        parts: [part("a", "Find the net flux.", 1)],
        hints: [
          "Add enclosed charges algebraically.",
          L`Use $\Phi_E=q_\text{enc}/\varepsilon_0$.`,
          "Charges outside the surface, if any, would not matter.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds the net enclosed charge and applies Gauss law.",
          },
        ]),
        commonErrors: [
          "Adding magnitudes instead of algebraic charges.",
          "Multiplying by epsilon naught instead of dividing.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The net enclosed charge is +2 microcoulomb.",
            math: L`\Phi_E=\frac{(3.0-1.0)\times10^{-6}}{\varepsilon_0}=\frac{2.0\times10^{-6}}{\varepsilon_0}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An infinitely long straight wire has uniform line charge density $4.0\times10^{-8}\text{ C m}^{-1}$. Find the electric field at a distance $0.20\text{ m}$ from the wire. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["gauss_law", "line_charge_field"],
        parts: [part("a", "Find the field magnitude and direction.", 2)],
        hints: [
          L`For a long charged wire, $E=\lambda/(2\pi\varepsilon_0r)$.`,
          L`Since $1/(4\pi\varepsilon_0)=k$, this may be written as $E=2k\lambda/r$.`,
          "For positive line charge, the field is radially outward.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses the line-charge field expression and states outward direction.",
          },
        ]),
        commonErrors: [
          "Using the point-charge formula.",
          "Missing the factor of 2 when using k.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the field of a long charged wire.",
            math: L`E=\frac{2k\lambda}{r}=\frac{2(9.0\times10^9)(4.0\times10^{-8})}{0.20}=3.6\times10^3\ \mathrm{N\,C^{-1}}`,
          },
          {
            part: "a",
            explanation:
              "The charge density is positive, so the field is radially outward from the wire.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An infinite non-conducting plane sheet has surface charge density $8.85\times10^{-8}\text{ C m}^{-2}$. Find the electric field on either side of the sheet. Take $\varepsilon_0=8.85\times10^{-12}\text{ C}^2\text{ N}^{-1}\text{ m}^{-2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["plane_sheet_field", "gauss_law"],
        parts: [part("a", "Find the field magnitude and direction.", 2)],
        hints: [
          L`For one infinite sheet, $E=\sigma/(2\varepsilon_0)$.`,
          "Substitute the given sigma and epsilon naught.",
          "For positive sigma, the field points away from the sheet on both sides.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses sheet field expression and identifies direction away from positive sheet.",
          },
        ]),
        commonErrors: [
          "Using sigma over epsilon naught for a single sheet.",
          "Making the field zero on one side.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The field of one infinite sheet is sigma over 2 epsilon naught.",
            math: L`E=\frac{8.85\times10^{-8}}{2(8.85\times10^{-12})}=5.0\times10^3\ \mathrm{N\,C^{-1}}`,
          },
          {
            part: "a",
            explanation:
              "Since the sheet is positively charged, the field is away from the sheet on both sides.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A thin conducting spherical shell of radius $0.10\text{ m}$ carries charge $+6.0\,\mu\text{C}$. Find the electric field at distances $0.05\text{ m}$ and $0.20\text{ m}$ from its centre. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["conducting_shell", "gauss_law", "field_inside_outside"],
        parts: [
          part("a", "Find the field at 0.05 m.", 2),
          part("b", "Find the field at 0.20 m.", 2),
          part("c", "State the direction of the outside field.", 1),
        ],
        hints: [
          "Inside a conducting shell, the electrostatic field in the cavity is zero if no charge is placed inside.",
          "Outside the shell, it behaves like a point charge at the centre.",
          "The charge is positive, so the outside field is radially outward.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses Gauss law to identify zero field inside.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses point-charge field outside the spherical shell.",
          },
          {
            part: "c",
            points: 1,
            description: "States radially outward direction.",
          },
        ]),
        commonErrors: [
          "Using the point-charge formula at 0.05 m.",
          "Using shell radius instead of the outside point distance.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The point 0.05 m from the centre lies inside the conducting shell, where the electrostatic field is zero.",
            math: L`E=0`,
          },
          {
            part: "b",
            explanation:
              "Outside a charged spherical shell, field is as if the charge were concentrated at the centre.",
            math: L`E=\frac{kQ}{r^2}=\frac{(9.0\times10^9)(6.0\times10^{-6})}{(0.20)^2}=1.35\times10^6\ \mathrm{N\,C^{-1}}`,
          },
          {
            part: "c",
            explanation:
              "The shell is positively charged, so the outside field is radially outward.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A small Gaussian pillbox of flat face area $0.020\text{ m}^2$ is chosen across a uniformly charged large plane sheet with $\sigma=5.0\,\mu\text{C m}^{-2}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["gaussian_pillbox", "plane_sheet_field", "flux"],
        parts: [
          part("a", "Find the charge enclosed by the pillbox.", 1),
          part("b", "Write the net flux through the pillbox.", 2),
          part(
            "c",
            "Find the electric field magnitude on either side of the sheet.",
            2,
          ),
        ],
        hints: [
          L`The enclosed charge is $\sigma A$.`,
          L`Use Gauss law: $\Phi_E=q_\text{enc}/\varepsilon_0$.`,
          L`Flux passes through two flat faces, so $2EA=\sigma A/\varepsilon_0$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds enclosed charge as sigma times area.",
          },
          {
            part: "b",
            points: 2,
            description: "Applies Gauss law to net flux.",
          },
          {
            part: "c",
            points: 2,
            description: "Uses pillbox symmetry to derive field magnitude.",
          },
        ]),
        commonErrors: [
          "Using total pillbox surface area instead of face area for enclosed charge.",
          "Forgetting flux exits through both flat faces.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The sheet area cut by the pillbox is the flat face area.",
            math: L`q_\text{enc}=\sigma A=(5.0\times10^{-6})(0.020)=1.0\times10^{-7}\ \mathrm C`,
          },
          {
            part: "b",
            explanation: "Net flux is enclosed charge over epsilon naught.",
            math: L`\Phi_E=\frac{1.0\times10^{-7}}{\varepsilon_0}`,
          },
          {
            part: "c",
            explanation:
              "The field has equal magnitude through the two flat faces and no flux through the curved side.",
            math: L`2EA=\frac{\sigma A}{\varepsilon_0}\Rightarrow E=\frac{\sigma}{2\varepsilon_0}`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Electric Potential and Equipotential Surfaces",
    subtopic:
      "Potential, potential difference, work, energy of charge systems, conductors, and equipotentials",
    mc: [
      {
        questionLatex: L`An external agent moves a charge $+2.0\,\mu\text{C}$ slowly from a point at $10\text{ V}$ to a point at $60\text{ V}$. The work done by the external agent is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["potential_difference", "work_done"],
        choices: [
          L`$-1.0\times10^{-4}\text{ J}$`,
          L`$2.0\times10^{-4}\text{ J}$`,
          L`$1.0\times10^{-5}\text{ J}$`,
          L`$1.0\times10^{-4}\text{ J}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "For slow movement by an external agent, the work equals the increase in potential energy.",
          B: "This uses the final potential instead of the potential difference.",
          C: "This is a power-of-ten conversion error.",
        },
        hints: [
          L`Use $W_\text{ext}=q\Delta V$ for slow movement.`,
          L`Here $\Delta V=60-10=50\text{ V}$.`,
          L`Convert microcoulomb to coulomb.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the potential difference.",
            math: L`\Delta V=60-10=50\ \mathrm V`,
          },
          {
            step: 2,
            explanation:
              "Work done slowly by the external agent equals q delta V.",
            math: L`W_\text{ext}=q\Delta V=(2.0\times10^{-6})(50)=1.0\times10^{-4}\ \mathrm J`,
          },
        ],
      },
      {
        questionLatex: L`In a region, electric potential varies as $V(x)=100-20x$ in SI units. The electric field along the x-axis is`,
        difficulty: 3,
        skillTags: ["electric_field_from_potential"],
        choices: [
          L`$20\text{ N C}^{-1}$ along $+x$`,
          L`$20\text{ N C}^{-1}$ along $-x$`,
          L`$120\text{ N C}^{-1}$ along $+x$`,
          L`zero because potential is linear`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The electric field is the negative potential gradient, so the sign reverses.",
          C: "The constant 100 does not affect the field.",
          D: "A linear potential gives a constant field, not zero field.",
        },
        hints: [
          L`Use $E_x=-dV/dx$.`,
          "The derivative of the constant term is zero.",
          L`If $dV/dx=-20$, then $E_x=+20$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the potential with respect to x.",
            math: L`\frac{dV}{dx}=-20`,
          },
          {
            step: 2,
            explanation:
              "Electric field is the negative gradient of potential.",
            math: L`E_x=-\frac{dV}{dx}=+20\ \mathrm{N\,C^{-1}}`,
          },
        ],
      },
      {
        questionLatex: L`Which statement about equipotential surfaces is correct?`,
        difficulty: 2,
        skillTags: ["equipotential_surface"],
        choices: [
          "Electric field is always tangential to an equipotential surface.",
          "Work done in moving a charge along an equipotential surface is zero.",
          "Equipotential surfaces always intersect at right angles.",
          "Closer equipotential surfaces always mean weaker electric field.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Electric field is perpendicular to an equipotential surface.",
          C: "Equipotential surfaces of different potentials cannot intersect.",
          D: "Closer spacing means a larger potential gradient and hence stronger field.",
        },
        hints: [
          "Equipotential means the potential difference along the surface is zero.",
          L`Work is $q\Delta V$.`,
          "The field is normal to the surface, not tangential.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Along an equipotential surface, the change in potential is zero.",
            math: L`W=q\Delta V=0`,
          },
          {
            step: 2,
            explanation:
              "The electric field is perpendicular to equipotential surfaces.",
          },
        ],
      },
      {
        questionLatex: L`At a point P, a charge $+3.0\,\mu\text{C}$ is $0.30\text{ m}$ away and a charge $-3.0\,\mu\text{C}$ is $0.60\text{ m}$ away. The electric potential at P is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["electric_potential", "scalar_addition"],
        choices: [
          L`$0\text{ V}$`,
          L`$2.25\times10^4\text{ V}$`,
          L`$4.5\times10^4\text{ V}$`,
          L`$9.0\times10^4\text{ V}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The charges are equal and opposite, but their distances from P are not equal.",
          B: "This halves the net contribution.",
          D: "This adds magnitudes instead of using signs.",
        },
        hints: [
          L`Potential is scalar: $V=k\sum q_i/r_i$.`,
          "Keep the sign of each charge.",
          "The positive charge is closer, so the net potential is positive.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the scalar potentials with signs.",
            math: L`V=k\left(\frac{3.0\times10^{-6}}{0.30}-\frac{3.0\times10^{-6}}{0.60}\right)`,
          },
          {
            step: 2,
            explanation: "Evaluate the expression.",
            math: L`V=(9.0\times10^9)(5.0\times10^{-6})=4.5\times10^4\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: In electrostatic equilibrium, a conductor is an equipotential body. Reason: If an electric field existed inside the conducting material, free charges would move.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "conductors", "equipotential"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The absence of internal field is exactly why there is no potential difference within the conductor.",
          C: "The reason is true for conductors in electrostatic equilibrium.",
          D: "The assertion is true: a conductor in electrostatic equilibrium is equipotential.",
        },
        hints: [
          "In electrostatic equilibrium, charges are at rest.",
          "A non-zero internal field would exert force on free charges.",
          "Zero field inside implies no potential gradient inside.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If a field existed inside the conducting material, free charges would continue to move.",
          },
          {
            step: 2,
            explanation:
              "At equilibrium the internal field is zero, so there is no potential gradient and the conductor is equipotential.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An electron is accelerated through a potential difference of $10\text{ V}$ from rest. Find the kinetic energy gained in joule. Take $e=1.6\times10^{-19}\text{ C}$.`,
        difficulty: 2,
        skillTags: ["potential_difference", "electron_energy"],
        parts: [part("a", "Find the kinetic energy gained.", 1)],
        hints: [
          "Energy gained by a charge accelerated through V is eV for an electron.",
          L`Use $K=e\Delta V$.`,
          "Convert electron-volt result to joule using e.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Obtains 1.6e-18 J.",
          },
        ]),
        commonErrors: [
          "Reporting 10 J instead of 10 eV in joule.",
          "Using the electron mass unnecessarily.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The kinetic energy gained equals the magnitude of charge times potential difference.",
            math: L`K=eV=(1.6\times10^{-19})(10)=1.6\times10^{-18}\ \mathrm J`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Charges $+4.0\,\mu\text{C}$ and $-2.0\,\mu\text{C}$ are separated by $0.40\text{ m}$ in air. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["potential_energy_two_charges"],
        parts: [
          part("a", "Find the electrostatic potential energy of the pair.", 2),
          part(
            "b",
            "Find the external work required to separate the charges slowly to infinity.",
            1,
          ),
        ],
        hints: [
          L`Use $U=kq_1q_2/r$ with signs.`,
          "Unlike charges have negative potential energy.",
          "External work for slow separation equals the increase in potential energy.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Substitutes signed charges and obtains negative potential energy.",
          },
          {
            part: "b",
            points: 1,
            description: "Finds work needed to take the system from U to zero.",
          },
        ]),
        commonErrors: [
          "Using magnitudes and losing the negative sign.",
          "Using r squared as in Coulomb force.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Use signed charges in the potential energy expression.",
            math: L`U=\frac{kq_1q_2}{r}=\frac{(9.0\times10^9)(4.0\times10^{-6})(-2.0\times10^{-6})}{0.40}=-0.18\ \mathrm J`,
          },
          {
            part: "b",
            explanation:
              "At infinite separation, potential energy is zero, so external work is +0.18 J.",
            math: L`W_\text{ext}=0-(-0.18)=+0.18\ \mathrm J`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The figure shows equally spaced parallel equipotential lines. Find the electric field magnitude and direction in this region.`,
        difficulty: 3,
        figure: equipotentialFigure,
        skillTags: ["equipotential_surface", "electric_field_from_potential"],
        parts: [
          part("a", "Find the magnitude of the electric field.", 2),
          part("b", "State its direction.", 1),
        ],
        hints: [
          "Electric field magnitude is potential gradient.",
          "Potential changes by 20 V over 2 cm between adjacent lines.",
          "Electric field points from higher potential to lower potential.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses potential difference over perpendicular distance.",
          },
          {
            part: "b",
            points: 1,
            description: "States direction from 100 V line toward 60 V line.",
          },
        ]),
        commonErrors: [
          "Using 4 cm for adjacent lines but 20 V for the potential difference.",
          "Pointing the field from low potential to high potential.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Adjacent equipotential lines differ by 20 V and are separated by 0.02 m.",
            math: L`E=\frac{\Delta V}{\Delta x}=\frac{20}{0.020}=1.0\times10^3\ \mathrm{V\,m^{-1}}`,
          },
          {
            part: "b",
            explanation:
              "Electric field points in the direction of decreasing potential, from the 100 V line toward the 60 V line.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A charge $+2.0\,\mu\text{C}$ is fixed at A and a charge $-4.0\,\mu\text{C}$ is fixed at B. A point P is $0.20\text{ m}$ from A and $0.40\text{ m}$ from B. Take $k=9.0\times10^9\text{ N m}^2\text{ C}^{-2}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["electric_potential", "work_done", "scalar_addition"],
        parts: [
          part("a", "Find the electric potential at P.", 3),
          part(
            "b",
            L`Find the work required to bring a $+1.0\,\mu\text{C}$ charge from infinity to P.`,
            2,
          ),
        ],
        hints: [
          L`Use $V=k(q_A/r_A+q_B/r_B)$.`,
          "Potential is scalar, so keep signs but do not resolve directions.",
          L`Work for slow bringing from infinity is $q_0V_P$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description: "Adds signed potential contributions correctly.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Uses test-charge potential energy change from infinity.",
          },
        ]),
        commonErrors: [
          "Using electric field vector addition instead of potential addition.",
          "Ignoring the negative charge contribution.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Add potential contributions algebraically.",
            math: L`V_P=9.0\times10^9\left(\frac{2.0\times10^{-6}}{0.20}-\frac{4.0\times10^{-6}}{0.40}\right)=0`,
          },
          {
            part: "b",
            explanation:
              "Since the potential at P is zero, the work to bring the test charge slowly from infinity is zero.",
            math: L`W_\text{ext}=q_0V_P=0`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two large parallel plates are separated by $4.0\text{ cm}$ and maintain a uniform electric field $5.0\times10^3\text{ N C}^{-1}$ between them. A proton is released from rest near the positive plate and moves to the negative plate. Take $e=1.6\times10^{-19}\text{ C}$ and $m_p=1.67\times10^{-27}\text{ kg}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "uniform_field",
          "potential_difference",
          "energy_conservation",
        ],
        parts: [
          part("a", "Find the potential difference between the plates.", 1),
          part("b", "Find the kinetic energy gained by the proton.", 2),
          part(
            "c",
            "Estimate the speed of the proton when it reaches the negative plate.",
            2,
          ),
        ],
        hints: [
          L`For a uniform field, $\Delta V=Ed$ in magnitude.`,
          L`$K=q\Delta V$ for the proton released from rest.`,
          L`Use $K=\frac12mv^2$ for speed.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes plate potential difference.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses electrical potential energy conversion.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Uses kinetic energy expression to estimate proton speed.",
          },
        ]),
        commonErrors: [
          "Using d = 4 m instead of 0.04 m.",
          "Using electron mass for the proton.",
          "Forgetting the square root when solving for speed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The magnitude of potential difference is field times separation.",
            math: L`\Delta V=Ed=(5.0\times10^3)(0.040)=200\ \mathrm V`,
          },
          {
            part: "b",
            explanation: "The proton gains kinetic energy equal to e delta V.",
            math: L`K=e\Delta V=(1.6\times10^{-19})(200)=3.2\times10^{-17}\ \mathrm J`,
          },
          {
            part: "c",
            explanation: "Use K = one-half mv squared.",
            math: L`v=\sqrt{\frac{2K}{m_p}}=\sqrt{\frac{2(3.2\times10^{-17})}{1.67\times10^{-27}}}\approx1.96\times10^5\ \mathrm{m\,s^{-1}}`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Capacitance, Dielectrics, and Energy",
    subtopic:
      "Conductors, dielectric effects, capacitor combinations, charge sharing, and stored energy",
    mc: [
      {
        questionLatex: L`A parallel plate capacitor has capacitance $C$. Its plate area is doubled, the separation is doubled, and a dielectric of constant $K=3$ completely fills the space between the plates. The new capacitance is`,
        difficulty: 3,
        skillTags: ["parallel_plate_capacitor", "dielectric_scaling"],
        choices: [L`$C$`, L`$\frac{3C}{2}$`, L`$2C$`, L`$3C$`],
        correctLetter: "D",
        rationales: {
          A: "Area and separation changes cancel, but the dielectric still multiplies capacitance by 3.",
          B: "This applies the dielectric and separation changes but misses the doubled area.",
          C: "This accounts for area only and misses the dielectric effect.",
        },
        hints: [
          L`For a filled parallel plate capacitor, $C=K\varepsilon_0A/d$.`,
          "Area doubling gives factor 2; separation doubling gives factor 1/2.",
          "The dielectric gives factor 3.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Combine the area, separation, and dielectric factors.",
            math: L`C'=3\varepsilon_0\frac{2A}{2d}=3C`,
          },
        ],
      },
      {
        questionLatex: L`Capacitors $3\,\mu\text{F}$ and $6\,\mu\text{F}$ are connected in series across a $12\text{ V}$ battery. The potential difference across the $3\,\mu\text{F}$ capacitor is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["series_capacitors", "charge_same_in_series"],
        choices: [
          L`$4\text{ V}$`,
          L`$6\text{ V}$`,
          L`$8\text{ V}$`,
          L`$12\text{ V}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the voltage across the 6 microfarad capacitor, not the 3 microfarad capacitor.",
          B: "Series capacitors do not split voltage equally unless capacitances are equal.",
          D: "The total voltage is 12 V, shared between the two capacitors.",
        },
        hints: [
          "In series, charge is the same on both capacitors.",
          "First find equivalent capacitance and charge.",
          L`Voltage on a capacitor is $V=Q/C$, so the smaller capacitance gets larger voltage.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The series equivalent capacitance is 2 microfarad.",
            math: L`C_\text{eq}=\frac{3\times6}{3+6}=2\,\mu\mathrm F`,
          },
          {
            step: 2,
            explanation:
              "The series charge is C equivalent times total voltage.",
            math: L`Q=C_\text{eq}V=(2\,\mu\mathrm F)(12\mathrm V)=24\,\mu\mathrm C`,
          },
          {
            step: 3,
            explanation: "Voltage across the 3 microfarad capacitor is Q/C.",
            math: L`V_3=\frac{24\,\mu\mathrm C}{3\,\mu\mathrm F}=8\ \mathrm V`,
          },
        ],
      },
      {
        questionLatex: L`A $4.0\,\mu\text{F}$ capacitor charged to $100\text{ V}$ stores energy`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["capacitor_energy"],
        choices: [
          L`$2.0\times10^{-3}\text{ J}$`,
          L`$2.0\times10^{-2}\text{ J}$`,
          L`$4.0\times10^{-2}\text{ J}$`,
          L`$4.0\times10^{-1}\text{ J}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This is a power-of-ten error in converting microfarad.",
          C: "This omits the factor one-half.",
          D: "This treats microfarad as millifarad or misses unit conversion.",
        },
        hints: [
          L`Use $U=\frac12CV^2$.`,
          L`$4.0\,\mu\text{F}=4.0\times10^{-6}\text{ F}$.`,
          L`$100^2=10^4$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute in the capacitor energy formula.",
            math: L`U=\frac12(4.0\times10^{-6})(100)^2=2.0\times10^{-2}\ \mathrm J`,
          },
        ],
      },
      {
        questionLatex: L`A hollow conductor carries excess charge in electrostatic equilibrium. If no charge is placed inside the cavity, the excess charge resides`,
        difficulty: 2,
        skillTags: ["conductors", "electrostatic_equilibrium"],
        choices: [
          "uniformly throughout the conducting material",
          "only on the inner surface of the cavity",
          "only on the outer surface of the conductor",
          "half on the inner surface and half on the outer surface",
        ],
        correctLetter: "C",
        rationales: {
          A: "Excess charge does not remain in the conducting material at electrostatic equilibrium.",
          B: "With no charge inside the cavity, there is no induced net charge on the inner surface.",
          D: "There is no equal split rule for a hollow conductor with an empty cavity.",
        },
        hints: [
          "Inside conducting material, electrostatic field must be zero.",
          "Excess charge of an isolated conductor moves to the surface.",
          "If the cavity is empty, the excess charge is on the outer surface.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Free charges rearrange until the electric field inside the conducting material becomes zero.",
          },
          {
            step: 2,
            explanation:
              "For an empty cavity, the conductor's excess charge is on the outer surface.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: If a dielectric is inserted fully into an isolated charged capacitor, its potential difference decreases. Reason: Inserting the dielectric increases the capacitance while the free charge on the isolated capacitor remains constant.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "dielectric", "isolated_capacitor"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the assertion through V = Q/C.",
          C: "The reason is true: an isolated capacitor cannot exchange free charge with a battery.",
          D: "The assertion is true because capacitance increases while charge stays fixed.",
        },
        hints: [
          "Isolated means disconnected from a battery.",
          "Charge stays constant but capacitance changes.",
          L`Use $V=Q/C$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "When the dielectric is inserted, capacitance increases.",
          },
          {
            step: 2,
            explanation:
              "For an isolated capacitor Q is constant, so increasing C decreases V.",
            math: L`V'=\frac{Q}{C'}<\frac{Q}{C}=V`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Two capacitors of $10\,\mu\text{F}$ each are connected in parallel. Find their equivalent capacitance.`,
        difficulty: 1,
        skillTags: ["parallel_capacitors"],
        parts: [part("a", "Find the equivalent capacitance.", 1)],
        hints: [
          "In parallel, capacitances add directly.",
          L`Use $C_\text{eq}=C_1+C_2$.`,
          "Both capacitors have the same capacitance.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Adds parallel capacitances correctly.",
          },
        ]),
        commonErrors: ["Using the series formula for a parallel combination."],
        workedSolution: [
          {
            part: "a",
            explanation: "Parallel capacitances add.",
            math: L`C_\text{eq}=10+10=20\,\mu\mathrm F`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For the capacitor network shown, find the equivalent capacitance and the charge drawn from the $12\text{ V}$ battery.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["capacitor_network", "series_parallel_capacitors"],
        figure: capacitorNetworkFigure,
        parts: [
          part("a", "Find the equivalent capacitance.", 3),
          part("b", "Find the charge drawn from the battery.", 2),
        ],
        hints: [
          "First combine the 3 microfarad and 6 microfarad capacitors.",
          "The result is in series with the 2 microfarad capacitor.",
          L`Finally use $Q=C_\text{eq}V$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description:
              "Combines parallel branch and then series combination correctly.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses equivalent capacitance to find battery charge.",
          },
        ]),
        commonErrors: [
          "Treating all three capacitors as parallel.",
          "Treating the 3 microfarad and 6 microfarad branch as series.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The upper and lower branch capacitors are in parallel.",
            math: L`C_p=3+6=9\,\mu\mathrm F`,
          },
          {
            part: "a",
            explanation:
              "This 9 microfarad equivalent is in series with the 2 microfarad capacitor.",
            math: L`C_\text{eq}=\frac{(2)(9)}{2+9}=\frac{18}{11}\,\mu\mathrm F`,
          },
          {
            part: "b",
            explanation:
              "The charge drawn from the battery is C equivalent times V.",
            math: L`Q=C_\text{eq}V=\frac{18}{11}\times12=\frac{216}{11}\,\mu\mathrm C\approx19.6\,\mu\mathrm C`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A parallel plate capacitor has plate area $0.020\text{ m}^2$, separation $1.0\text{ mm}$, and is completely filled with dielectric of constant $K=4$. Find its capacitance. Take $\varepsilon_0=8.85\times10^{-12}\text{ F m}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["parallel_plate_capacitor", "dielectric"],
        parts: [part("a", "Find the capacitance.", 2)],
        hints: [
          L`Use $C=K\varepsilon_0A/d$.`,
          L`Convert $1.0\text{ mm}$ to $1.0\times10^{-3}\text{ m}$.`,
          "Keep the final answer in farad or picofarad.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses dielectric-filled parallel plate formula with correct unit conversion.",
          },
        ]),
        commonErrors: [
          "Not converting millimetre to metre.",
          "Forgetting the dielectric factor K.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Substitute in the dielectric-filled capacitor formula.",
            math: L`C=\frac{K\varepsilon_0A}{d}=\frac{4(8.85\times10^{-12})(0.020)}{1.0\times10^{-3}}=7.08\times10^{-10}\ \mathrm F`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $6.0\,\mu\text{F}$ capacitor is charged to $12\text{ V}$ and then disconnected from the battery. It is connected in parallel, with like plates together, to an uncharged $3.0\,\mu\text{F}$ capacitor.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["charge_sharing", "capacitor_energy", "energy_loss"],
        parts: [
          part("a", "Find the final common potential difference.", 2),
          part("b", "Find the initial and final stored energies.", 2),
          part("c", "Find the energy lost in the process.", 1),
        ],
        hints: [
          "Total charge is conserved after the charged capacitor is disconnected from the battery.",
          "Final capacitance is the parallel sum.",
          L`Use $U=\frac12CV^2$ before and after sharing.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses charge conservation to find final common voltage.",
          },
          {
            part: "b",
            points: 2,
            description: "Calculates initial and final energies correctly.",
          },
          {
            part: "c",
            points: 1,
            description: "Finds energy lost as the decrease in stored energy.",
          },
        ]),
        commonErrors: [
          "Assuming voltage remains 12 V after disconnecting the battery.",
          "Thinking energy must be conserved in the capacitors alone.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Initial charge on the 6 microfarad capacitor is conserved.",
            math: L`Q_i=C_1V_1=(6.0\,\mu\mathrm F)(12\mathrm V)=72\,\mu\mathrm C`,
          },
          {
            part: "a",
            explanation:
              "Final capacitance is 9 microfarad, so final voltage is 8 V.",
            math: L`V_f=\frac{Q_i}{C_1+C_2}=\frac{72\,\mu\mathrm C}{9.0\,\mu\mathrm F}=8.0\ \mathrm V`,
          },
          {
            part: "b",
            explanation: "Calculate stored energy before and after connection.",
            math: L`U_i=\frac12(6.0\times10^{-6})(12)^2=432\,\mu\mathrm J,\quad U_f=\frac12(9.0\times10^{-6})(8)^2=288\,\mu\mathrm J`,
          },
          {
            part: "c",
            explanation:
              "The difference is lost as heat/radiation during redistribution.",
            math: L`\Delta U_\text{lost}=432-288=144\,\mu\mathrm J`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`An isolated capacitor of capacitance $5.0\,\mu\text{F}$ is charged to $100\text{ V}$ and then disconnected. A dielectric slab of constant $K=4$ is inserted fully between its plates.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["isolated_capacitor", "dielectric", "energy_change"],
        parts: [
          part("a", "Find the charge on the capacitor before insertion.", 1),
          part(
            "b",
            "Find the new capacitance and new potential difference.",
            2,
          ),
          part("c", "Find the initial and final stored energies.", 2),
        ],
        hints: [
          "Disconnected means charge remains constant.",
          "A full dielectric multiplies capacitance by K.",
          L`For constant charge, use $U=Q^2/(2C)$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds initial charge as CV.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Applies dielectric capacitance increase and constant-charge voltage change.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Computes initial and final energy and shows the decrease.",
          },
        ]),
        commonErrors: [
          "Keeping voltage constant after disconnection.",
          "Using final capacitance but initial voltage for final energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Initial charge is capacitance times voltage.",
            math: L`Q=CV=(5.0\,\mu\mathrm F)(100\mathrm V)=500\,\mu\mathrm C`,
          },
          {
            part: "b",
            explanation:
              "The dielectric increases capacitance by K while charge remains constant.",
            math: L`C'=KC=20\,\mu\mathrm F,\qquad V'=\frac{Q}{C'}=\frac{500\,\mu\mathrm C}{20\,\mu\mathrm F}=25\ \mathrm V`,
          },
          {
            part: "c",
            explanation: "Find energy before and after insertion.",
            math: L`U_i=\frac12CV^2=2.5\times10^{-2}\ \mathrm J,\qquad U_f=\frac{Q^2}{2C'}=6.25\times10^{-3}\ \mathrm J`,
          },
        ],
      },
    ],
  },
];

export const electrostaticsTopics: Topic[] =
  relocateMisplacedElectrostaticsItems(topicSeeds.map(makeTopic));
