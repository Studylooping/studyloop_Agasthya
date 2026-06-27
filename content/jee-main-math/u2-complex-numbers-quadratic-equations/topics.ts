import type {
  Hint,
  McChoice,
  McSingleItem,
  NumericItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";

const COURSE = "jee-main-math";
const UNIT = "u2-complex-numbers-quadratic-equations";
const VERSION = "0.1.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

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
  skillTags: string[];
  commonMisconceptions?: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface NumericSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  commonMisconceptions?: string[];
  promptMarkdown: string;
  hints: readonly [string, string, string];
  numericAnswer: number;
  rubric: readonly string[];
  commonErrors: readonly string[];
  solution: string;
}

interface TopicSeed extends TopicMeta {
  mc: readonly McSeed[];
  numeric: readonly NumericSeed[];
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

function solution(explanation: string, math?: string): SolutionStep[] {
  return [{ step: 1, explanation, math: math ?? null }];
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  return `You chose ${choiceText}. This misses a condition in the complex-number or quadratic setup. The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const choices = LETTERS.map((letter, choiceIndex) => {
    const isCorrect = letter === seed.correctLetter;
    return {
      letter,
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales[letter] ?? fallbackWrongRationale(seed, letter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[letter] ?? "jee_unit2_algebra_trap",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "applies_a_standard_formula_without_checking_complex_or_root_conditions",
    ],
    questionLatex: seed.questionLatex,
    choices,
    correctLetter: seed.correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeNumeric(meta: TopicMeta, seed: NumericSeed, index: number): NumericItem {
  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.num.${String(index + 1).padStart(3, "0")}`,
    kind: "numeric",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "counts_values_before_reducing_the_algebraic_condition",
    ],
    questionLatex: seed.questionLatex,
    answer: {
      value: seed.numericAnswer,
      toleranceAbs: 0,
    },
    hintLadder: hints(seed.hints),
    workedSolution: [
      {
        step: 1,
        explanation: seed.solution,
        math: null,
      },
    ],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeTopic(seed: TopicSeed): Topic {
  const meta = {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
  };

  return {
    ...meta,
    items: [
      ...seed.mc.map((item, index) => makeMc(meta, item, index)),
      ...seed.numeric.map((item, index) => makeNumeric(meta, item, index)),
    ],
  };
}

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Complex Algebra, Conjugates, and Modulus",
    subtopic:
      "Algebraic manipulation, conjugate traps, modulus conditions, and Cartesian form.",
    mc: [
      {
        questionLatex: L`If $z=\dfrac{(1+i)^5}{(1-i)^3}$, then $\operatorname{Re}z+\operatorname{Im}z$ equals`,
        difficulty: 4,
        skillTags: ["complex_powers", "cartesian_form"],
        choices: [L`$-2$`, L`$0$`, L`$2$`, L`$4$`],
        correctLetter: "C",
        rationales: {
          A: "This has the sign of the quotient reversed after simplifying both powers.",
          B: "This treats the quotient as purely imaginary, but it is actually real.",
          D: "This doubles the real part after finding $z=2$.",
        },
        misconceptionTags: {
          A: "sign_error_in_complex_power",
          B: "assumes_unjustified_imaginary_quotient",
          D: "adds_real_part_twice",
        },
        hints: [
          "Use polar form or repeated squaring for both powers.",
          "$(1+i)^5=-4-4i$ and $(1-i)^3=-2-2i$.",
          "The quotient is a real number.",
        ],
        solution: solution(
          "Simplifying the powers gives $(1+i)^5=-4-4i$ and $(1-i)^3=-2-2i$, so $z=2$. Hence $\\operatorname{Re}z+\\operatorname{Im}z=2+0=2$.",
          L`z=\frac{-4-4i}{-2-2i}=2`,
        ),
      },
      {
        questionLatex: L`If $|z|=1$ and $z+\dfrac1z=1$, which statement is necessarily true?`,
        difficulty: 4,
        skillTags: ["unit_modulus", "argument_equation"],
        choices: [L`$z^3=1$`, L`$z^3=-1$`, L`$z^4=1$`, L`$z=-1$`],
        correctLetter: "B",
        rationales: {
          A: "This would correspond to angles $0,\\pm 2\\pi/3$, not to $2\\cos\\theta=1$.",
          C: "Fourth roots of unity do not satisfy $z+1/z=1$.",
          D: "For $z=-1$, the left side is $-2$, not $1$.",
        },
        misconceptionTags: {
          A: "uses_wrong_root_of_unity_angles",
          C: "matches_modulus_only",
          D: "substitutes_without_checking_equation",
        },
        hints: [
          "Write $z=\\cos\\theta+i\\sin\\theta$.",
          "Then $z+1/z=2\\cos\\theta$.",
          "$2\\cos\\theta=1$ gives $\\theta=\\pm\\pi/3$ modulo $2\\pi$.",
        ],
        solution: solution(
          "Since $|z|=1$, write $z=e^{i\\theta}$. Then $z+1/z=2\\cos\\theta=1$, so $\\theta=\\pm\\pi/3$ modulo $2\\pi$. Therefore $z^3=e^{\\pm i\\pi}=-1$.",
          L`z^3=-1`,
        ),
      },
      {
        questionLatex: L`For $z=x+iy$, the equation $|z-1|=|z+3|$ represents`,
        difficulty: 3,
        skillTags: ["modulus_locus", "perpendicular_bisector"],
        choices: [L`$x=-1$`, L`$x=1$`, L`$y=-1$`, L`$x^2+y^2=3$`],
        correctLetter: "A",
        rationales: {
          B: "This bisects the wrong pair of real-axis points.",
          C: "The two fixed points lie on the real axis, so the perpendicular bisector is vertical.",
          D: "Equal distances from two fixed points gives a line, not a circle.",
        },
        misconceptionTags: {
          B: "wrong_midpoint",
          C: "swaps_vertical_and_horizontal_bisector",
          D: "confuses_two_point_locus_with_origin_locus",
        },
        hints: [
          "Square both sides.",
          "The fixed points are $1$ and $-3$ on the real axis.",
          "Equal distance from two points is the perpendicular bisector.",
        ],
        solution: solution(
          "Squaring gives $(x-1)^2+y^2=(x+3)^2+y^2$, hence $x=-1$.",
          L`(x-1)^2=(x+3)^2\Rightarrow x=-1`,
        ),
      },
      {
        questionLatex: L`The value of $\dfrac{2-i}{1+2i}$ is`,
        difficulty: 3,
        skillTags: ["complex_division", "conjugate_multiplication"],
        choices: [L`$i$`, L`$-i$`, L`$1$`, L`$\dfrac35-\dfrac45i$`],
        correctLetter: "B",
        rationales: {
          A: "This is the sign error from multiplying by $1+2i$ instead of the conjugate.",
          C: "Equal moduli only show the quotient has modulus $1$; they do not show it is $1$.",
          D: "This is the unit-vector form for $3-4i$, not this quotient.",
        },
        misconceptionTags: {
          A: "wrong_conjugate_sign",
          C: "modulus_does_not_determine_value",
          D: "uses_unrelated_3_4_5_pattern",
        },
        hints: [
          "Multiply numerator and denominator by $1-2i$.",
          "Compute $(2-i)(1-2i)$ carefully.",
          "The real part cancels.",
        ],
        solution: solution(
          "Multiplying by the conjugate gives $(2-i)(1-2i)/5=(-5i)/5=-i$.",
          L`\frac{2-i}{1+2i}=-i`,
        ),
      },
      {
        questionLatex: L`Let $z=x+iy\ne0$. If $z^2$ is purely imaginary, then`,
        difficulty: 3,
        skillTags: ["purely_imaginary_condition", "cartesian_complex_square"],
        choices: [L`$x=0$ only`, L`$y=0$ only`, L`$x=y$ or $x=-y$`, L`$xy=0$`],
        correctLetter: "C",
        rationales: {
          A: "If $x=0$, then $z^2=-y^2$ is real, not purely imaginary unless $z=0$.",
          B: "If $y=0$, then $z^2=x^2$ is real, not purely imaginary unless $z=0$.",
          D: "This makes the imaginary part zero; it is the opposite direction.",
        },
        misconceptionTags: {
          A: "confuses_real_and_imaginary_parts",
          B: "misses_nonzero_condition",
          D: "sets_imaginary_part_zero_instead_of_real_part",
        },
        hints: [
          "Expand $(x+iy)^2$.",
          "Purely imaginary means the real part is zero.",
          "Solve $x^2-y^2=0$.",
        ],
        solution: solution(
          "$z^2=x^2-y^2+2xyi$. For it to be purely imaginary, $x^2-y^2=0$, so $x=y$ or $x=-y$.",
          L`x^2-y^2=0`,
        ),
      },
      {
        questionLatex: L`If $|z|=2$ and $|z-3|=1$, then $|z+3|$ equals`,
        difficulty: 4,
        skillTags: ["circle_intersection", "modulus_geometry"],
        choices: [L`$1$`, L`$3$`, L`$5$`, L`$\sqrt{13}$`],
        correctLetter: "C",
        rationales: {
          A: "This repeats the second given radius instead of locating the point.",
          B: "This uses the distance between the two circle centers.",
          D: "This treats $z$ as $2+i3$ rather than using the tangent circles.",
        },
        misconceptionTags: {
          A: "copies_given_modulus",
          B: "uses_center_distance_as_answer",
          D: "turns_modulus_data_into_coordinates",
        },
        hints: [
          "The circles have centers $0$ and $3$ with radii $2$ and $1$.",
          "The center distance is $3$, equal to the sum of radii.",
          "So the two circles touch externally at one point.",
        ],
        solution: solution(
          "The two circles touch externally because the center distance is $3=2+1$. The common point is $z=2$, so $|z+3|=5$.",
          L`z=2\Rightarrow |z+3|=5`,
        ),
      },
      {
        questionLatex: L`If $z+\bar z=4$ and $z\bar z=13$, the possible values of $|z-2i|^2$ are`,
        difficulty: 4,
        skillTags: ["conjugate_conditions", "possible_values"],
        choices: [L`$5$ only`, L`$29$ only`, L`$5$ and $29$`, L`$13$ and $17$`],
        correctLetter: "C",
        rationales: {
          A: "This keeps only the root with positive imaginary part.",
          B: "This keeps only the root with negative imaginary part.",
          D: "These values come from shifting the real part instead of the imaginary part.",
        },
        misconceptionTags: {
          A: "drops_negative_imaginary_case",
          B: "drops_positive_imaginary_case",
          D: "wrong_distance_shift",
        },
        hints: [
          "Let $z=x+iy$.",
          "$z+\\bar z=4$ fixes $x$.",
          "$z\\bar z=13$ gives two possible imaginary parts.",
        ],
        solution: solution(
          "From $2x=4$, $x=2$. Also $x^2+y^2=13$, so $y=\\pm3$. Hence $|z-2i|^2=4+(y-2)^2$, giving $5$ or $29$.",
          L`4+(3-2)^2=5,\quad 4+(-3-2)^2=29`,
        ),
      },
      {
        questionLatex: L`For $z=x+iy$, the condition $\dfrac{z-2}{z+2}$ is purely imaginary is equivalent to`,
        difficulty: 4,
        skillTags: ["purely_imaginary_quotient", "argand_locus"],
        choices: [L`$x^2+y^2=4$`, L`$x=0$`, L`$y=0$`, L`$(x-2)^2+y^2=4$`],
        correctLetter: "A",
        rationales: {
          B: "That would make the quotient generally real, not purely imaginary.",
          C: "The real axis is not the full angle-$90^\circ$ locus.",
          D: "This centers the circle at $2$ instead of using the segment endpoints $-2$ and $2$.",
        },
        misconceptionTags: {
          B: "assumes_imaginary_axis_locus",
          C: "collapses_locus_to_real_axis",
          D: "wrong_circle_center",
        },
        hints: [
          "Multiply numerator and denominator by $\\bar z+2$.",
          "Set the real part of $(z-2)(\\bar z+2)$ equal to zero.",
          "The endpoint segment is from $-2$ to $2$.",
        ],
        solution: solution(
          "The real part of $(z-2)(\\bar z+2)$ is $x^2+y^2-4$. Setting it to zero gives $x^2+y^2=4$.",
          L`x^2+y^2=4`,
        ),
      },
      {
        questionLatex: L`The number of complex numbers $z$ satisfying $z^2=\dfrac{3+4i}{3-4i}$ is`,
        difficulty: 3,
        skillTags: ["complex_square_roots", "equation_counting"],
        choices: [L`$0$`, L`$1$`, L`$2$`, L`$4$`],
        correctLetter: "C",
        rationales: {
          A: "Every nonzero complex number has two square roots in $\\mathbb C$.",
          B: "This is the real-number square-root habit, but the right side is nonzero complex.",
          D: "A quadratic equation over $\\mathbb C$ has at most two roots.",
        },
        misconceptionTags: {
          A: "denies_complex_square_roots",
          B: "keeps_only_principal_root",
          D: "overcounts_quadratic_roots",
        },
        hints: [
          "First check whether the right side is zero.",
          "A nonzero complex number has exactly two square roots.",
          "This is a quadratic equation in $z$.",
        ],
        solution: solution(
          "The right side is nonzero. Therefore $z^2=w$ with $w\\ne0$ has exactly two complex solutions.",
          L`2`,
        ),
      },
      {
        questionLatex: L`For real $a$, $z=\dfrac{a+i}{1+ai}$ always satisfies`,
        difficulty: 3,
        skillTags: ["unit_modulus", "parameter_complex_number"],
        choices: [L`$|z|=1$`, L`$\operatorname{Re}z=0$`, L`$\operatorname{Im}z=0$`, L`$z=1$`],
        correctLetter: "A",
        rationales: {
          B: "The quotient is not always purely imaginary; for $a=1$ it equals $1$.",
          C: "The quotient is not always real; for $a=0$ it equals $i$.",
          D: "Only special values of $a$ give $z=1$.",
        },
        misconceptionTags: {
          B: "checks_only_one_parameter_value",
          C: "checks_only_one_parameter_value",
          D: "confuses_unit_modulus_with_unit_value",
        },
        hints: [
          "Compare the moduli of numerator and denominator.",
          "$|a+i|^2=a^2+1$.",
          "$|1+ai|^2=1+a^2$.",
        ],
        solution: solution(
          "The numerator and denominator have equal modulus $\\sqrt{a^2+1}$, and the denominator is never zero for real $a$. Hence $|z|=1$.",
          L`|z|=\frac{\sqrt{a^2+1}}{\sqrt{a^2+1}}=1`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`If $z=(1+2i)(3-i)$, find $|z|^2$.`,
        difficulty: 3,
        skillTags: ["modulus_product", "complex_multiplication"],
        promptMarkdown: "Enter the exact value.",
        numericAnswer: 50,
        hints: [
          "Use $|zw|=|z||w|$.",
          "Square the modulus to avoid expanding.",
          "$|1+2i|^2=5$ and $|3-i|^2=10$.",
        ],
        rubric: [
          "Uses multiplicativity of modulus or expands correctly.",
          "Returns the squared modulus, not the modulus.",
        ],
        commonErrors: [
          "Returning $\\sqrt{50}$ instead of $50$.",
          "Multiplying real and imaginary parts separately.",
        ],
        solution:
          "$|z|^2=|1+2i|^2|3-i|^2=(1^2+2^2)(3^2+1^2)=5\\cdot10=50$.",
      },
      {
        questionLatex: L`If $z+\bar z=6$ and $z\bar z=25$, find $(\operatorname{Im}z)^2$.`,
        difficulty: 3,
        skillTags: ["conjugate_conditions", "imaginary_part"],
        promptMarkdown: "Enter the value of the square.",
        numericAnswer: 16,
        hints: [
          "Let $z=x+iy$.",
          "$z+\\bar z=2x$.",
          "$z\\bar z=x^2+y^2$.",
        ],
        rubric: [
          "Finds the real part from the conjugate sum.",
          "Uses the modulus squared condition to find $y^2$.",
        ],
        commonErrors: [
          "Using $x=6$ instead of $x=3$.",
          "Returning $4$ instead of $16$.",
        ],
        solution:
          "Let $z=x+iy$. Then $2x=6$, so $x=3$. Also $x^2+y^2=25$, so $y^2=25-9=16$.",
      },
      {
        questionLatex: L`Find the number of integer pairs $(x,y)$ such that $|x+iy|=5$ and $xy>0$.`,
        difficulty: 4,
        skillTags: ["gaussian_integer_counting", "modulus_condition"],
        promptMarkdown: "Enter the number of ordered pairs.",
        numericAnswer: 4,
        hints: [
          "Convert the modulus condition into $x^2+y^2=25$.",
          "Both coordinates must be nonzero because $xy>0$.",
          "The signs of $x$ and $y$ must match.",
        ],
        rubric: [
          "Lists the integer solutions to $x^2+y^2=25$ with nonzero coordinates.",
          "Applies the sign condition $xy>0$.",
        ],
        commonErrors: [
          "Including axis points such as $(5,0)$.",
          "Counting unordered pairs instead of ordered pairs.",
        ],
        solution:
          "The non-axis integer solutions are $(\\pm3,\\pm4)$ and $(\\pm4,\\pm3)$. The condition $xy>0$ keeps only same-sign pairs: $(3,4),(4,3),(-3,-4),(-4,-3)$, so the answer is $4$.",
      },
      {
        questionLatex: L`Find $\dfrac{1+i}{1-i}+\dfrac{1-i}{1+i}$.`,
        difficulty: 3,
        skillTags: ["complex_division", "conjugate_pair"],
        promptMarkdown: "Enter the real value.",
        numericAnswer: 0,
        hints: [
          "Simplify each quotient separately.",
          "The two quotients are conjugate purely imaginary numbers.",
          "They cancel.",
        ],
        rubric: [
          "Computes both quotients correctly.",
          "Adds them without dropping the sign.",
        ],
        commonErrors: [
          "Writing both quotients as $i$.",
          "Returning $2$ after using only moduli.",
        ],
        solution:
          "$\\frac{1+i}{1-i}=i$ and $\\frac{1-i}{1+i}=-i$, so the sum is $0$.",
      },
      {
        questionLatex: L`Let $k$ be real and $z=2+ki$. If $|z-1|=|z-i|$, find $k$.`,
        difficulty: 4,
        skillTags: ["modulus_equation", "parameter_complex_number"],
        promptMarkdown: "Enter the value of $k$.",
        numericAnswer: 2,
        hints: [
          "Write both squared distances.",
          "$z-1=1+ki$ and $z-i=2+(k-1)i$.",
          "Equate the squared moduli.",
        ],
        rubric: [
          "Forms the two squared modulus equations correctly.",
          "Solves the resulting linear equation in $k$.",
        ],
        commonErrors: [
          "Forgetting the shift in the imaginary part for $z-i$.",
          "Taking square roots too early and creating sign noise.",
        ],
        solution:
          "$|1+ki|^2=1+k^2$ and $|2+(k-1)i|^2=4+(k-1)^2$. Equating gives $1+k^2=4+(k-1)^2$, hence $k=2$.",
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Argand Plane, Argument, Polar Form, and Loci",
    subtopic:
      "Argument constraints, polar conversion, and geometric loci in the complex plane.",
    mc: [
      {
        questionLatex: L`If $z$ satisfies $|z-1|=|z+i|$ and $\operatorname{Re}z>0$, then $\arg z$ is`,
        difficulty: 4,
        skillTags: ["argand_locus", "argument"],
        choices: [L`$\dfrac{\pi}{4}$`, L`$-\dfrac{\pi}{4}$`, L`$\dfrac{3\pi}{4}$`, L`$-\dfrac{3\pi}{4}$`],
        correctLetter: "B",
        rationales: {
          A: "This uses the line $y=x$, but the perpendicular bisector here is $y=-x$.",
          C: "This lies in quadrant II, contradicting $\\operatorname{Re}z>0$.",
          D: "This lies in quadrant III, contradicting $\\operatorname{Re}z>0$.",
        },
        misconceptionTags: {
          A: "wrong_bisector_slope",
          C: "ignores_real_part_condition",
          D: "wrong_quadrant",
        },
        hints: [
          "Let $z=x+iy$ and square both distances.",
          "The condition simplifies to $y=-x$.",
          "Use $\\operatorname{Re}z>0$ to choose the ray.",
        ],
        solution: solution(
          "Squaring gives $(x-1)^2+y^2=x^2+(y+1)^2$, so $y=-x$. With $x>0$, $z$ lies on the fourth-quadrant ray, hence $\\arg z=-\\pi/4$.",
          L`\arg z=-\frac{\pi}{4}`,
        ),
      },
      {
        questionLatex: L`If $\arg(z-1)=\dfrac{\pi}{4}$ and $|z-1|=2\sqrt2$, then $z$ equals`,
        difficulty: 3,
        skillTags: ["polar_to_cartesian", "argument"],
        choices: [L`$3+2i$`, L`$2+3i$`, L`$-1+2i$`, L`$3-2i$`],
        correctLetter: "A",
        rationales: {
          B: "This adds the real shift to the imaginary coordinate instead of the real coordinate.",
          C: "This uses the vector from $z$ to $1$ rather than from $1$ to $z$.",
          D: "This uses angle $-\\pi/4$ instead of $\\pi/4$.",
        },
        misconceptionTags: {
          B: "misplaces_real_shift",
          C: "reverses_vector_direction",
          D: "wrong_argument_sign",
        },
        hints: [
          "Interpret $z-1$ as a vector.",
          "A vector of modulus $2\\sqrt2$ at angle $\\pi/4$ is $2+2i$.",
          "Then add $1$.",
        ],
        solution: solution(
          "$z-1=2\\sqrt2(\\cos\\pi/4+i\\sin\\pi/4)=2+2i$, so $z=3+2i$.",
          L`z=3+2i`,
        ),
      },
      {
        questionLatex: L`The locus $|z-2|+|z+2|=6$ is an ellipse whose eccentricity is`,
        difficulty: 4,
        skillTags: ["ellipse_locus", "complex_geometry"],
        choices: [L`$\dfrac13$`, L`$\dfrac12$`, L`$\dfrac23$`, L`$\dfrac{\sqrt5}{3}$`],
        correctLetter: "C",
        rationales: {
          A: "This uses $c=1$ instead of the focus distance $c=2$.",
          B: "This treats the semi-major axis as $4$ rather than $3$.",
          D: "This is $b/a$, not the eccentricity.",
        },
        misconceptionTags: {
          A: "wrong_focus_distance",
          B: "uses_full_axis_as_semi_axis",
          D: "confuses_minor_ratio_with_eccentricity",
        },
        hints: [
          "The foci are at $-2$ and $2$.",
          "The sum of distances is $2a=6$.",
          "Use $e=c/a$.",
        ],
        solution: solution(
          "The foci are $-2$ and $2$, so $c=2$. Since the distance sum is $6$, $2a=6$ and $a=3$. Thus $e=c/a=2/3$.",
          L`e=\frac{2}{3}`,
        ),
      },
      {
        questionLatex: L`If $|z|=1$ and $z\ne-1$, then $w=\dfrac{1-z}{1+z}$ is always`,
        difficulty: 4,
        skillTags: ["unit_circle_transform", "purely_imaginary"],
        choices: [L`real`, L`purely imaginary`, L`of modulus $1$`, L`equal to $z$`],
        correctLetter: "B",
        rationales: {
          A: "The real part cancels for unit-modulus $z$; it is not generally real.",
          C: "For $z=i$, the value is $-i$, but modulus $1$ is not the invariant reason and fails generally for other angles.",
          D: "Substitution, for example $z=1$, gives $w=0$, not $1$.",
        },
        misconceptionTags: {
          A: "wrong_part_after_conjugation",
          C: "overgeneralizes_single_case",
          D: "does_not_test_simple_value",
        },
        hints: [
          "Use $\\bar z=1/z$ when $|z|=1$.",
          "Compute $\\bar w$.",
          "If $\\bar w=-w$, then $w$ is purely imaginary.",
        ],
        solution: solution(
          "For $|z|=1$, $\\bar z=1/z$. Then $\\bar w=(1-\\bar z)/(1+\\bar z)=(z-1)/(z+1)=-w$, so $w$ is purely imaginary.",
          L`\bar w=-w`,
        ),
      },
      {
        questionLatex: L`The points satisfying $\arg\left(\dfrac{z-1}{z+1}\right)=\dfrac{\pi}{2}$ lie on`,
        difficulty: 5,
        skillTags: ["argument_locus", "circle_with_diameter"],
        choices: [
          L`the upper semicircle of $x^2+y^2=1$`,
          L`the lower semicircle of $x^2+y^2=1$`,
          L`the line $x=0$`,
          L`the circle $(x-1)^2+y^2=1$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The lower semicircle gives argument $-\\pi/2$ for the quotient.",
          C: "The angle condition is a right-angle circle condition, not the imaginary axis.",
          D: "The diameter endpoints are $-1$ and $1$, so the center is the origin.",
        },
        misconceptionTags: {
          B: "wrong_orientation_of_argument",
          C: "collapses_angle_locus_to_axis",
          D: "wrong_diameter_endpoints",
        },
        hints: [
          "The quotient compares the directions of $z-1$ and $z+1$.",
          "The angle subtended by the segment from $-1$ to $1$ is $90^\circ$.",
          "Test $z=i$ to choose the correct semicircle.",
        ],
        solution: solution(
          "The condition says the segment endpoints $-1$ and $1$ subtend a right angle at $z$, so $z$ is on $x^2+y^2=1$. Testing $z=i$ gives quotient $i$, so the upper semicircle is selected.",
          L`x^2+y^2=1,\ y>0`,
        ),
      },
      {
        questionLatex: L`If the principal argument of $z$ is $\dfrac{3\pi}{4}$, then the principal argument of $z^2$ is`,
        difficulty: 3,
        skillTags: ["principal_argument", "powers"],
        choices: [L`$\dfrac{3\pi}{2}$`, L`$-\dfrac{\pi}{2}$`, L`$\dfrac{\pi}{2}$`, L`$-\dfrac{3\pi}{4}$`],
        correctLetter: "B",
        rationales: {
          A: "This is the doubled angle before reducing to the principal range.",
          C: "This uses the wrong coterminal principal value.",
          D: "This negates the original argument instead of doubling it.",
        },
        misconceptionTags: {
          A: "does_not_reduce_principal_argument",
          C: "wrong_coterminal_angle",
          D: "negates_instead_of_doubles",
        },
        hints: [
          "Arguments double under squaring.",
          "Start with $2\\cdot 3\\pi/4=3\\pi/2$.",
          "Reduce to $(-\\pi,\\pi]$.",
        ],
        solution: solution(
          "The argument doubles to $3\\pi/2$, whose principal value is $-\\pi/2$.",
          L`\operatorname{Arg}(z^2)=-\frac{\pi}{2}`,
        ),
      },
      {
        questionLatex: L`If $z$ moves on $|z-1|=1$, the maximum value of $|z+i|$ is`,
        difficulty: 4,
        skillTags: ["circle_distance_extreme", "argand_geometry"],
        choices: [L`$1+\sqrt2$`, L`$2$`, L`$\sqrt5$`, L`$3$`],
        correctLetter: "A",
        rationales: {
          B: "This ignores that the fixed point $-i$ is not the center of the circle.",
          C: "This is a distance from $(1,0)$ to a different point.",
          D: "This adds coordinate distances instead of Euclidean distances.",
        },
        misconceptionTags: {
          B: "uses_radius_only",
          C: "wrong_center_distance",
          D: "uses_manhattan_distance",
        },
        hints: [
          "The circle has center $1$ and radius $1$.",
          "$|z+i|$ is the distance from $z$ to $-i$.",
          "The maximum distance from a fixed point to a circle is center distance plus radius.",
        ],
        solution: solution(
          "The distance from center $1$ to the point $-i$ is $|1+i|=\\sqrt2$. The maximum distance is $\\sqrt2+1$.",
          L`1+\sqrt2`,
        ),
      },
      {
        questionLatex: L`If $z=r(\cos\theta+i\sin\theta)$, $r>0$ and $\dfrac{2\pi}{3}<\theta<\pi$, then the principal argument of $\dfrac{z}{(\bar z)^2}$ is`,
        difficulty: 3,
        skillTags: ["principal_argument", "conjugate_argument", "polar_form"],
        choices: [L`$3\theta-2\pi$`, L`$3\theta$`, L`$2\pi-3\theta$`, L`$\pi-3\theta$`],
        correctLetter: "A",
        rationales: {
          B: "This finds the unreduced argument but does not bring it back to the principal range.",
          C: "This reverses the angle after reducing instead of subtracting $2\\pi$ from $3\\theta$.",
          D: "This subtracts from $\\pi$ as if only one reflection occurred.",
        },
        misconceptionTags: {
          B: "does_not_reduce_principal_argument",
          C: "reverses_reduced_angle",
          D: "uses_single_reflection_only",
        },
        hints: [
          "Write $z=re^{i\\theta}$ and $\\bar z=re^{-i\\theta}$.",
          "The quotient has argument $3\\theta$ before principal reduction.",
          "Use $2\\pi<3\\theta<3\\pi$.",
        ],
        solution: solution(
          "$\\dfrac{z}{(\\bar z)^2}=\\dfrac{re^{i\\theta}}{r^2e^{-2i\\theta}}=\\dfrac1r e^{3i\\theta}$. Since $2\\pi<3\\theta<3\\pi$, the principal argument is $3\\theta-2\\pi$.",
          L`3\theta-2\pi`,
        ),
      },
      {
        questionLatex: L`For $z=x+iy$, the locus $|z-3i|=2|z+i|$ is a circle with centre and radius`,
        difficulty: 3,
        skillTags: ["apollonius_circle", "circle_locus", "argand_plane"],
        choices: [
          L`centre $\left(0,-\dfrac73\right)$, radius $\dfrac83$`,
          L`centre $\left(0,\dfrac73\right)$, radius $\dfrac83$`,
          L`centre $\left(0,-\dfrac73\right)$, radius $\dfrac43$`,
          L`centre $(0,3)$, radius $2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This keeps the sign of the completed-square term reversed.",
          C: "This halves the radius after completing the square.",
          D: "This treats the equation as $|z-3i|=2$ and ignores the second distance.",
        },
        misconceptionTags: {
          B: "sign_error_center",
          C: "radius_after_completing_square_error",
          D: "drops_second_distance",
        },
        hints: [
          "Square both sides before collecting terms.",
          "Use $|z-3i|^2=x^2+(y-3)^2$ and $|z+i|^2=x^2+(y+1)^2$.",
          "Complete the square in $y$.",
        ],
        solution: solution(
          "Squaring gives $x^2+(y-3)^2=4[x^2+(y+1)^2]$, hence $x^2+y^2+\\frac{14}{3}y-\\frac{5}{3}=0$. Completing the square gives $x^2+\\left(y+\\frac73\\right)^2=\\frac{64}{9}$.",
          L`\text{centre }\left(0,-\frac73\right),\ r=\frac83`,
        ),
      },
      {
        questionLatex: L`If $z$ lies in the second quadrant and $|z|=2$, then the principal argument of $-iz$ lies in`,
        difficulty: 4,
        skillTags: ["argument_rotation", "quadrant"],
        choices: [L`first quadrant`, L`second quadrant`, L`third quadrant`, L`fourth quadrant`],
        correctLetter: "A",
        rationales: {
          B: "Multiplication by $-i$ rotates by $-\\pi/2$, so the quadrant changes.",
          C: "This would correspond to multiplication by $i$ from quadrant II.",
          D: "This ignores the starting quadrant and rotates a quadrant I point.",
        },
        misconceptionTags: {
          B: "misses_rotation",
          C: "uses_wrong_rotation_direction",
          D: "starts_from_wrong_quadrant",
        },
        hints: [
          "Multiplication by $-i$ rotates by $-\\pi/2$.",
          "A second-quadrant angle is between $\\pi/2$ and $\\pi$.",
          "Subtract $\\pi/2$ from that interval.",
        ],
        solution: solution(
          "If $\\arg z\\in(\\pi/2,\\pi)$, then $\\arg(-iz)=\\arg z-\\pi/2\\in(0,\\pi/2)$, so it lies in the first quadrant.",
          L`(0,\pi/2)`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`For $z=x+iy$, if $|z-2|=|z+4|$, find $x$.`,
        difficulty: 3,
        skillTags: ["perpendicular_bisector", "modulus_locus"],
        promptMarkdown: "Enter the value of the real part.",
        numericAnswer: -1,
        hints: [
          "Square both sides.",
          "The fixed points are $2$ and $-4$.",
          "The perpendicular bisector is vertical.",
        ],
        rubric: [
          "Sets up the equal-distance equation.",
          "Solves for the constant real part.",
        ],
        commonErrors: [
          "Using the midpoint $1$ instead of $-1$.",
          "Returning a circle equation instead of the value of $x$.",
        ],
        solution:
          "$(x-2)^2+y^2=(x+4)^2+y^2$ gives $x=-1$.",
      },
      {
        questionLatex: L`Find the number of Gaussian integers $z=x+iy$ such that $|z|=\sqrt{13}$ and $0<\arg z<\dfrac{\pi}{2}$.`,
        difficulty: 4,
        skillTags: ["gaussian_integer_counting", "argument_quadrant"],
        promptMarkdown: "Enter the number of such Gaussian integers.",
        numericAnswer: 2,
        hints: [
          "Convert the modulus into $x^2+y^2=13$.",
          "The argument condition puts the point strictly in quadrant I.",
          "List positive integer solutions.",
        ],
        rubric: [
          "Finds the integer solutions to $x^2+y^2=13$.",
          "Applies the strict quadrant condition.",
        ],
        commonErrors: [
          "Including points on the axes.",
          "Counting all four quadrants.",
        ],
        solution:
          "The positive integer solutions are $(x,y)=(2,3)$ and $(3,2)$. Hence there are $2$ Gaussian integers.",
      },
      {
        questionLatex: L`If $z=2\left(\cos\dfrac{2\pi}{3}+i\sin\dfrac{2\pi}{3}\right)$, find $\operatorname{Re}(z^3)$.`,
        difficulty: 3,
        skillTags: ["de_moivre", "polar_power"],
        promptMarkdown: "Enter the real part.",
        numericAnswer: 8,
        hints: [
          "Use De Moivre's theorem.",
          "The modulus becomes $2^3$.",
          "The angle becomes $2\\pi$.",
        ],
        rubric: [
          "Cubes both the modulus and the argument correctly.",
          "Extracts the real part of the final polar form.",
        ],
        commonErrors: [
          "Cubing the angle but not the modulus.",
          "Using $\\cos(2\\pi/3)$ instead of $\\cos(2\\pi)$.",
        ],
        solution:
          "$z^3=8(\\cos2\\pi+i\\sin2\\pi)=8$, so the real part is $8$.",
      },
      {
        questionLatex: L`For the ellipse $|z-1|+|z+1|=4$, find $b^2$, where $b$ is the semi-minor axis.`,
        difficulty: 4,
        skillTags: ["ellipse_locus", "complex_geometry"],
        promptMarkdown: "Enter $b^2$.",
        numericAnswer: 3,
        hints: [
          "The foci are at $-1$ and $1$.",
          "The distance sum is $2a=4$.",
          "Use $b^2=a^2-c^2$.",
        ],
        rubric: [
          "Identifies $a$ and $c$ correctly.",
          "Computes $b^2$ from the ellipse relation.",
        ],
        commonErrors: [
          "Using $a=4$ instead of $a=2$.",
          "Using $c=2$ instead of $c=1$.",
        ],
        solution:
          "Here $2a=4$, so $a=2$. The foci are one unit from the origin, so $c=1$. Thus $b^2=a^2-c^2=4-1=3$.",
      },
      {
        questionLatex: L`If $\arg\left(\dfrac{z-i}{z+i}\right)=\dfrac{\pi}{2}$, the locus is an arc of a circle. Find the radius of that circle.`,
        difficulty: 4,
        skillTags: ["argument_locus", "circle_with_diameter"],
        promptMarkdown: "Enter the radius.",
        numericAnswer: 1,
        hints: [
          "The fixed points are $i$ and $-i$.",
          "The angle subtended by the segment between them is $90^\circ$.",
          "A right angle subtended by a segment lies on the circle with that segment as diameter.",
        ],
        rubric: [
          "Recognizes the right-angle locus.",
          "Uses the diameter length $2$ to get the radius.",
        ],
        commonErrors: [
          "Using radius $2$ instead of diameter $2$.",
          "Taking the center distance from the origin to a focus as the diameter.",
        ],
        solution:
          "The segment between $i$ and $-i$ has length $2$ and is the diameter of the circle, so the radius is $1$.",
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Roots of Unity and De Moivre Powers",
    subtopic:
      "Cyclic powers, roots of unity, equations in complex roots, and symmetric sums.",
    mc: [
      {
        questionLatex: L`If $\omega$ is a non-real cube root of unity, then $(1-\omega+\omega^2)^2$ equals`,
        difficulty: 4,
        skillTags: ["cube_roots_unity", "algebraic_simplification"],
        choices: [L`$4\omega$`, L`$4\omega^2$`, L`$-4\omega$`, L`$-4\omega^2$`],
        correctLetter: "B",
        rationales: {
          A: "This squares $\\omega$ incorrectly after simplifying the bracket.",
          C: "This keeps the sign from $-2\\omega$ but forgets that the square is positive.",
          D: "This combines both sign and power errors.",
        },
        misconceptionTags: {
          A: "wrong_power_of_omega",
          C: "sign_error_after_squaring",
          D: "compound_root_of_unity_error",
        },
        hints: [
          "Use $1+\\omega+\\omega^2=0$.",
          "Replace $1+\\omega^2$ by $-\\omega$.",
          "Then square the simplified expression.",
        ],
        solution: solution(
          "Since $1+\\omega+\\omega^2=0$, $1+\\omega^2=-\\omega$. Hence $1-\\omega+\\omega^2=-2\\omega$, and the square is $4\\omega^2$.",
          L`( -2\omega)^2=4\omega^2`,
        ),
      },
      {
        questionLatex: L`The value of $\sum_{k=0}^{11} i^k$ is`,
        difficulty: 3,
        skillTags: ["cyclic_powers", "geometric_sum"],
        choices: [L`$0$`, L`$1$`, L`$-1$`, L`$4$`],
        correctLetter: "A",
        rationales: {
          B: "This keeps only the first term of each cycle.",
          C: "This stops one term short in the cycle.",
          D: "This counts four full cycles without summing their values.",
        },
        misconceptionTags: {
          B: "partial_cycle_count",
          C: "off_by_one_power_sum",
          D: "counts_cycles_not_sum",
        },
        hints: [
          "The powers of $i$ repeat every $4$.",
          "One full cycle sums to $1+i-1-i=0$.",
          "There are three full cycles from $k=0$ to $11$.",
        ],
        solution: solution(
          "The powers repeat in cycles of $1,i,-1,-i$, whose sum is $0$. There are three complete cycles, so the total is $0$.",
          L`0`,
        ),
      },
      {
        questionLatex: L`The number of roots of $z^6=1$ whose real part is positive is`,
        difficulty: 4,
        skillTags: ["roots_of_unity", "quadrant_counting"],
        choices: [L`$2$`, L`$3$`, L`$4$`, L`$6$`],
        correctLetter: "B",
        rationales: {
          A: "This misses the root $z=1$ on the positive real axis.",
          C: "This includes roots on the left half-plane.",
          D: "This ignores the real-part condition.",
        },
        misconceptionTags: {
          A: "excludes_positive_real_axis",
          C: "counts_wrong_half_plane",
          D: "counts_all_roots",
        },
        hints: [
          "The sixth roots have arguments $0,\\pi/3,2\\pi/3,\\pi,4\\pi/3,5\\pi/3$.",
          "Positive real part means cosine is positive.",
          "Include the angle $0$.",
        ],
        solution: solution(
          "The roots at angles $0,\\pi/3,5\\pi/3$ have positive real part. Hence the count is $3$.",
          L`3`,
        ),
      },
      {
        questionLatex: L`The product of all roots of $z^4=-16$ is`,
        difficulty: 3,
        skillTags: ["complex_polynomial_roots", "product_of_roots"],
        choices: [L`$-16$`, L`$16$`, L`$4$`, L`$-4$`],
        correctLetter: "B",
        rationales: {
          A: "For a monic quartic, the product is the constant term, not its negative.",
          C: "This multiplies only the moduli of one root pair.",
          D: "This uses the square-root scale instead of the fourth-degree product.",
        },
        misconceptionTags: {
          A: "wrong_vieta_sign_even_degree",
          C: "partial_root_product",
          D: "confuses_root_modulus_with_product",
        },
        hints: [
          "Rewrite the equation as $z^4+16=0$.",
          "Use Vieta's product formula for a monic quartic.",
          "For degree $4$, the sign is positive.",
        ],
        solution: solution(
          "The polynomial is $z^4+16=0$. For a monic quartic, the product of roots is the constant term, $16$.",
          L`16`,
        ),
      },
      {
        questionLatex: L`The value of $(1+i\sqrt3)^{10}$ is`,
        difficulty: 4,
        skillTags: ["de_moivre", "polar_power"],
        choices: [
          L`$512+512\sqrt3\,i$`,
          L`$-512+512\sqrt3\,i$`,
          L`$-512-512\sqrt3\,i$`,
          L`$512-512\sqrt3\,i$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses angle $\\pi/3$ after exponentiation instead of reducing $10\\pi/3$.",
          B: "This takes the sine sign from quadrant II instead of quadrant III.",
          D: "This takes the cosine sign from quadrant IV instead of quadrant III.",
        },
        misconceptionTags: {
          A: "does_not_multiply_argument",
          B: "wrong_reduced_quadrant",
          D: "wrong_quadrant_sign",
        },
        hints: [
          "$1+i\\sqrt3=2(\\cos\\pi/3+i\\sin\\pi/3)$.",
          "Raise the modulus to the tenth power.",
          "Reduce $10\\pi/3$ to $4\\pi/3$.",
        ],
        solution: solution(
          "$(1+i\\sqrt3)^{10}=2^{10}(\\cos(10\\pi/3)+i\\sin(10\\pi/3))=1024(\\cos4\\pi/3+i\\sin4\\pi/3)=-512-512\\sqrt3 i$.",
          L`-512-512\sqrt3\,i`,
        ),
      },
      {
        questionLatex: L`If $\alpha_1,\alpha_2,\ldots,\alpha_7$ are all roots of $z^7=1$, then $\sum_{k=1}^{7}|\alpha_k-1|^2$ equals`,
        difficulty: 5,
        skillTags: ["roots_of_unity_sum", "modulus_square"],
        choices: [L`$7$`, L`$12$`, L`$14$`, L`$21$`],
        correctLetter: "C",
        rationales: {
          A: "This treats each distance as $1$.",
          B: "This excludes the zero distance at $\\alpha=1$ but miscounts the conjugate sums.",
          D: "This uses $3$ as an average squared distance instead of $2$.",
        },
        misconceptionTags: {
          A: "assumes_unit_distance",
          B: "drops_root_one_incorrectly",
          D: "wrong_average_distance",
        },
        hints: [
          "Use $|\\alpha-1|^2=(\\alpha-1)(\\bar\\alpha-1)$.",
          "For roots of unity, $\\bar\\alpha=1/\\alpha$.",
          "The sum of all seventh roots is $0$.",
        ],
        solution: solution(
          "For each root, $|\\alpha-1|^2=2-\\alpha-\\bar\\alpha$. Summing over all seventh roots gives $2\\cdot7-0-0=14$.",
          L`14`,
        ),
      },
      {
        questionLatex: L`If $z^2+z+1=0$, then $z^{2026}+z^{2027}$ equals`,
        difficulty: 4,
        skillTags: ["cyclic_powers", "cube_roots_unity"],
        choices: [L`$-1$`, L`$0$`, L`$1$`, L`$z$`],
        correctLetter: "A",
        rationales: {
          B: "The two powers are $z$ and $z^2$, whose sum is not zero.",
          C: "This uses $z^3=1$ but ignores $1+z+z^2=0$.",
          D: "This reduces only one of the two exponents.",
        },
        misconceptionTags: {
          B: "wrong_sum_of_nonreal_cube_roots",
          C: "misses_root_relation",
          D: "partial_exponent_reduction",
        },
        hints: [
          "$z$ is a non-real cube root of unity.",
          "Reduce exponents modulo $3$.",
          "Use $z+z^2=-1$.",
        ],
        solution: solution(
          "Since $z^3=1$, $2026\equiv1$ and $2027\equiv2$ modulo $3$. Thus the expression is $z+z^2=-1$.",
          L`-1`,
        ),
      },
      {
        questionLatex: L`The number of roots of $z^8=1$ with positive imaginary part is`,
        difficulty: 3,
        skillTags: ["roots_of_unity", "upper_half_plane"],
        choices: [L`$3$`, L`$4$`, L`$5$`, L`$8$`],
        correctLetter: "A",
        rationales: {
          B: "This includes the real root $-1$, whose imaginary part is zero.",
          C: "This includes both real-axis roots.",
          D: "This ignores the upper-half-plane condition.",
        },
        misconceptionTags: {
          B: "includes_axis_root",
          C: "includes_real_axis_roots",
          D: "counts_all_roots",
        },
        hints: [
          "The arguments are multiples of $\\pi/4$.",
          "Positive imaginary part means angles strictly between $0$ and $\\pi$.",
          "Do not include $0$ or $\\pi$.",
        ],
        solution: solution(
          "The valid angles are $\\pi/4,\\pi/2,3\\pi/4$, giving $3$ roots.",
          L`3`,
        ),
      },
      {
        questionLatex: L`If $\alpha,\beta$ are roots of $x^2-2x+2=0$, then $\alpha^5+\beta^5$ equals`,
        difficulty: 5,
        skillTags: ["power_sum_roots", "quadratic_recurrence"],
        choices: [L`$-8$`, L`$-4$`, L`$0$`, L`$8$`],
        correctLetter: "A",
        rationales: {
          B: "This stops the recurrence at the third power.",
          C: "This is $\\alpha^2+\\beta^2$, not the fifth-power sum.",
          D: "This loses the quadrant sign of $(1\\pm i)^5$.",
        },
        misconceptionTags: {
          B: "incomplete_power_recurrence",
          C: "uses_wrong_power",
          D: "wrong_complex_power_sign",
        },
        hints: [
          "The roots are $1+i$ and $1-i$.",
          "Use polar form or the recurrence from the quadratic.",
          "$(1+i)^5$ and $(1-i)^5$ are conjugates.",
        ],
        solution: solution(
          "The roots are $1\\pm i=\\sqrt2(\\cos(\\pm\\pi/4)+i\\sin(\\pm\\pi/4))$. The sum of fifth powers is $2(\\sqrt2)^5\\cos(5\\pi/4)=-8$.",
          L`-8`,
        ),
      },
      {
        questionLatex: L`The number of roots of $z^3=8i$ with positive real part is`,
        difficulty: 4,
        skillTags: ["complex_roots", "argument_counting"],
        choices: [L`$1$`, L`$2$`, L`$3$`, L`$0$`],
        correctLetter: "A",
        rationales: {
          B: "This includes the root on the negative-real-side quadrant.",
          C: "This counts all cube roots.",
          D: "There is a root at argument $\\pi/6$, which has positive real part.",
        },
        misconceptionTags: {
          B: "wrong_quadrant_count",
          C: "ignores_real_part_condition",
          D: "misses_first_quadrant_root",
        },
        hints: [
          "Write $8i=8(\\cos\\pi/2+i\\sin\\pi/2)$.",
          "The cube-root arguments are $\\pi/6$, $5\\pi/6$, and $3\\pi/2$.",
          "Only one of those has positive cosine.",
        ],
        solution: solution(
          "The roots have arguments $\\pi/6,5\\pi/6,3\\pi/2$. Only the root at $\\pi/6$ has positive real part.",
          L`1`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`Find the number of roots of $z^5=32$ whose real part is positive.`,
        difficulty: 4,
        skillTags: ["roots_of_unity", "half_plane_counting"],
        promptMarkdown: "Enter the number of roots.",
        numericAnswer: 3,
        hints: [
          "Write the roots as $2$ times fifth roots of unity.",
          "List arguments $0,2\\pi/5,4\\pi/5,6\\pi/5,8\\pi/5$.",
          "Positive real part means cosine is positive.",
        ],
        rubric: [
          "Finds the five arguments correctly.",
          "Counts only roots in the right half-plane.",
        ],
        commonErrors: [
          "Excluding the positive real root.",
          "Counting roots by imaginary part instead of real part.",
        ],
        solution:
          "The arguments are $0,2\\pi/5,4\\pi/5,6\\pi/5,8\\pi/5$. The angles $0,2\\pi/5,8\\pi/5$ have positive real part, so the answer is $3$.",
      },
      {
        questionLatex: L`If $\omega$ is a non-real cube root of unity, find $(1+\omega)^{12}$.`,
        difficulty: 3,
        skillTags: ["cube_roots_unity", "cyclic_power"],
        promptMarkdown: "Enter the real value.",
        numericAnswer: 1,
        hints: [
          "Use $\\omega=-1/2+\\sqrt3 i/2$ for one non-real root.",
          "Then $1+\\omega$ has modulus $1$.",
          "Its argument is $\\pi/3$ or $-\\pi/3$ depending on the chosen root.",
        ],
        rubric: [
          "Identifies $1+\\omega$ as a unit complex number.",
          "Raises the argument through twelve cycles correctly.",
        ],
        commonErrors: [
          "Using $1+\\omega+\\omega^2=0$ to claim $1+\\omega=0$.",
          "Returning $-1$ after reducing the exponent incorrectly.",
        ],
        solution:
          "$1+\\omega$ is a sixth root of unity with argument $\\pm\\pi/3$, so $(1+\\omega)^{12}=1$.",
      },
      {
        questionLatex: L`Find the sum of the moduli of all roots of $z^4=81$.`,
        difficulty: 3,
        skillTags: ["complex_roots", "modulus"],
        promptMarkdown: "Enter the sum.",
        numericAnswer: 12,
        hints: [
          "All fourth roots have the same modulus.",
          "If $|z|^4=81$, then $|z|=3$.",
          "There are four roots.",
        ],
        rubric: [
          "Finds the modulus of each root.",
          "Multiplies by the number of roots.",
        ],
        commonErrors: [
          "Returning the modulus of one root.",
          "Using square roots instead of fourth roots.",
        ],
        solution:
          "Each root has modulus $81^{1/4}=3$, and there are four roots. The sum of moduli is $4\\cdot3=12$.",
      },
      {
        questionLatex: L`Find the number of fourth roots of $16$ whose imaginary part is positive.`,
        difficulty: 3,
        skillTags: ["fourth_roots", "upper_half_plane"],
        promptMarkdown: "Enter the count.",
        numericAnswer: 1,
        hints: [
          "The roots are $2$ times fourth roots of unity.",
          "List $2,2i,-2,-2i$.",
          "Only one has positive imaginary part.",
        ],
        rubric: [
          "Lists or characterizes the four roots.",
          "Applies the strict positive-imaginary condition.",
        ],
        commonErrors: [
          "Including real roots with imaginary part zero.",
          "Counting both $2i$ and $-2i$.",
        ],
        solution:
          "The fourth roots are $2,2i,-2,-2i$. Only $2i$ has positive imaginary part, so the count is $1$.",
      },
      {
        questionLatex: L`If $\alpha_1,\ldots,\alpha_6$ are all roots of $z^6=1$, find $\prod_{k=1}^6|2-\alpha_k|^2$.`,
        difficulty: 4,
        skillTags: ["roots_of_unity", "polynomial_roots_product", "modulus"],
        promptMarkdown: "Enter the product.",
        numericAnswer: 3969,
        hints: [
          "The roots are exactly the roots of $x^6-1=0$.",
          "Use $x^6-1=\\prod_{k=1}^6(x-\\alpha_k)$ and put $x=2$.",
          "The product of squared moduli is the squared modulus of the product.",
        ],
        rubric: [
          "Uses the factorization of $x^6-1$ by its roots.",
          "Converts the product of squared moduli into a squared modulus.",
        ],
        commonErrors: [
          "Using the sum of roots instead of the product.",
          "Forgetting to square the modulus of the product.",
        ],
        solution:
          "Since $x^6-1=\\prod_{k=1}^6(x-\\alpha_k)$, we get $\\prod_{k=1}^6(2-\\alpha_k)=2^6-1=63$. Therefore $\\prod_{k=1}^6|2-\\alpha_k|^2=|63|^2=3969$.",
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Quadratic Equations, Nature of Roots, and Parameters",
    subtopic:
      "Discriminant reasoning, parameter ranges, common roots, and integer-root constraints.",
    mc: [
      {
        questionLatex: L`The quadratic $x^2-(m+2)x+2m=0$ has real and distinct roots for`,
        difficulty: 3,
        skillTags: ["discriminant", "parameter_quadratic"],
        choices: [L`all real $m$`, L`$m=2$ only`, L`$m\ne2$`, L`$m<2$ only`],
        correctLetter: "C",
        rationales: {
          A: "At $m=2$, the discriminant is zero, so the roots are equal.",
          B: "At $m=2$, the roots are not distinct.",
          D: "Values greater than $2$ also give a positive discriminant.",
        },
        misconceptionTags: {
          A: "misses_distinct_condition",
          B: "confuses_equal_with_distinct",
          D: "solves_square_inequality_as_linear",
        },
        hints: [
          "Compute the discriminant.",
          "It simplifies to a perfect square.",
          "Distinct roots require discriminant greater than zero.",
        ],
        solution: solution(
          "The discriminant is $(m+2)^2-8m=(m-2)^2$. It is positive for $m\\ne2$ and zero at $m=2$.",
          L`m\ne2`,
        ),
      },
      {
        questionLatex: L`The equation $x^2+2(a+1)x+9a-5=0$ has equal roots when`,
        difficulty: 4,
        skillTags: ["equal_roots", "parameter_quadratic"],
        choices: [L`$a=1$ only`, L`$a=6$ only`, L`$a=1$ or $6$`, L`$a=-1$ or $5$`],
        correctLetter: "C",
        rationales: {
          A: "This keeps only one zero of the discriminant factorization.",
          B: "This keeps the other zero but drops $a=1$.",
          D: "These values come from setting coefficients separately, not the discriminant.",
        },
        misconceptionTags: {
          A: "drops_one_parameter_solution",
          B: "drops_one_parameter_solution",
          D: "wrong_equal_root_condition",
        },
        hints: [
          "Equal roots means discriminant zero.",
          "Divide the discriminant by $4$ after forming it.",
          "Factor the resulting quadratic in $a$.",
        ],
        solution: solution(
          "The discriminant condition is $4(a+1)^2-4(9a-5)=0$, so $a^2-7a+6=0$. Hence $a=1$ or $a=6$.",
          L`(a-1)(a-6)=0`,
        ),
      },
      {
        questionLatex: L`The equations $x^2+ax+b=0$ and $x^2+bx+a=0$ have a common root, where $a\ne b$. Then the common root is`,
        difficulty: 4,
        skillTags: ["common_root", "quadratic_parameters"],
        choices: [L`$0$`, L`$1$`, L`$-1$`, L`$a+b$`],
        correctLetter: "B",
        rationales: {
          A: "A zero common root would force both constants $a$ and $b$ to be zero, not guaranteed by $a\\ne b$.",
          C: "Substituting $-1$ does not follow from subtracting the equations.",
          D: "The common root is forced before finding a relation between $a$ and $b$.",
        },
        misconceptionTags: {
          A: "checks_constant_term_only",
          C: "sign_error_after_subtraction",
          D: "confuses_root_with_coefficient_sum",
        },
        hints: [
          "Let the common root be $r$.",
          "Subtract the two equations after substituting $r$.",
          "Use $a\\ne b$.",
        ],
        solution: solution(
          "If $r$ is common, subtracting gives $(a-b)r+(b-a)=0$, or $(a-b)(r-1)=0$. Since $a\\ne b$, $r=1$.",
          L`r=1`,
        ),
      },
      {
        questionLatex: L`For real $k$, the equation $(k+1)x^2-2(k-1)x+k+1=0$ has real reciprocal roots when`,
        difficulty: 5,
        skillTags: ["reciprocal_roots", "discriminant_parameter"],
        choices: [L`$k\le0,\ k\ne-1$`, L`$k<0$ only`, L`$k\ge0$`, L`$k=-1$ only`],
        correctLetter: "A",
        rationales: {
          B: "This wrongly excludes $k=0$, which gives real reciprocal roots.",
          C: "For $k>0$, the discriminant is negative.",
          D: "At $k=-1$, the equation is not quadratic.",
        },
        misconceptionTags: {
          B: "excludes_boundary_value",
          C: "wrong_discriminant_sign",
          D: "ignores_quadratic_condition",
        },
        hints: [
          "Reciprocal roots require product $1$.",
          "Here product is already $1$ when $k+1\\ne0$.",
          "Now impose discriminant nonnegative and keep the equation quadratic.",
        ],
        solution: solution(
          "For $k\\ne-1$, product of roots is $(k+1)/(k+1)=1$. The discriminant is $4(k-1)^2-4(k+1)^2=-16k$, so real roots need $k\\le0$. Hence $k\\le0,\ k\\ne-1$.",
          L`k\le0,\ k\ne-1`,
        ),
      },
      {
        questionLatex: L`If the roots of $x^2-5x+p=0$ differ by $1$, then $p$ equals`,
        difficulty: 3,
        skillTags: ["root_difference", "discriminant"],
        choices: [L`$4$`, L`$5$`, L`$6$`, L`$7$`],
        correctLetter: "C",
        rationales: {
          A: "This would make the root difference $3$.",
          B: "This does not make the discriminant a square of the required difference.",
          D: "This gives a negative discriminant.",
        },
        misconceptionTags: {
          A: "wrong_difference_square",
          B: "uses_product_guess",
          D: "ignores_real_root_condition",
        },
        hints: [
          "For a monic quadratic, the square of the root difference is the discriminant.",
          "Set $25-4p=1$.",
          "Solve for $p$.",
        ],
        solution: solution(
          "The square of the difference of roots is the discriminant, so $25-4p=1$. Thus $p=6$.",
          L`p=6`,
        ),
      },
      {
        questionLatex: L`The equation $x^2+|x|-6=0$ has how many real roots?`,
        difficulty: 3,
        skillTags: ["absolute_value_quadratic", "real_roots"],
        choices: [L`$0$`, L`$1$`, L`$2$`, L`$4$`],
        correctLetter: "C",
        rationales: {
          A: "The equation has $|x|=2$ as a valid possibility.",
          B: "The absolute value produces two $x$ values from one positive value.",
          D: "The auxiliary equation has only one nonnegative solution for $|x|$.",
        },
        misconceptionTags: {
          A: "misses_positive_absolute_solution",
          B: "forgets_plus_minus_from_absolute_value",
          D: "counts_rejected_negative_absolute_value",
        },
        hints: [
          "Let $t=|x|$.",
          "Solve $t^2+t-6=0$ with $t\\ge0$.",
          "Convert $|x|=t$ back to $x$ values.",
        ],
        solution: solution(
          "Let $t=|x|$. Then $t^2+t-6=0$, so $t=2$ or $t=-3$. Since $t\\ge0$, $t=2$, giving $x=\\pm2$.",
          L`2`,
        ),
      },
      {
        questionLatex: L`If the positive roots of a quadratic are $t$ and $t^2$ and their sum is $6$, then their product is`,
        difficulty: 4,
        skillTags: ["root_relation", "positive_roots"],
        choices: [L`$8$`, L`$9$`, L`$18$`, L`$27$`],
        correctLetter: "A",
        rationales: {
          B: "This would come from $t=3$, but $3+9\\ne6$.",
          C: "This multiplies the sum by $3$ instead of solving for $t$.",
          D: "This uses the negative solution $t=-3$, which violates positivity.",
        },
        misconceptionTags: {
          B: "guesses_half_sum",
          C: "misuses_sum_product_relation",
          D: "keeps_invalid_negative_parameter",
        },
        hints: [
          "Solve $t+t^2=6$.",
          "Use the positive value of $t$.",
          "The product is $t^3$.",
        ],
        solution: solution(
          "$t^2+t-6=0$ gives $t=2$ or $-3$. Since the roots are positive, $t=2$, and the product is $t^3=8$.",
          L`8`,
        ),
      },
      {
        questionLatex: L`The quadratic $x^2-2(a+1)x+a^2+5=0$ has no real root when`,
        difficulty: 4,
        skillTags: ["discriminant_inequality", "parameter_range"],
        choices: [L`$a<2$`, L`$a>2$`, L`$a\le2$`, L`$a\ge2$`],
        correctLetter: "A",
        rationales: {
          B: "For $a>2$, the discriminant is positive.",
          C: "At $a=2$, the discriminant is zero, so a real repeated root exists.",
          D: "This reverses the inequality.",
        },
        misconceptionTags: {
          B: "reverses_discriminant_condition",
          C: "includes_equal_root_case",
          D: "wrong_inequality_direction",
        },
        hints: [
          "No real root means discriminant less than zero.",
          "Compute $[-2(a+1)]^2-4(a^2+5)$.",
          "Solve the resulting linear inequality.",
        ],
        solution: solution(
          "The discriminant is $4(a+1)^2-4(a^2+5)=8a-16$. No real root means $8a-16<0$, so $a<2$.",
          L`a<2`,
        ),
      },
      {
        questionLatex: L`If $\alpha,\beta$ are roots of $x^2-3x+1=0$, then the equation whose roots are $\alpha/\beta$ and $\beta/\alpha$ is`,
        difficulty: 5,
        skillTags: ["transformed_roots", "vieta"],
        choices: [L`$x^2-7x+1=0$`, L`$x^2+7x+1=0$`, L`$x^2-5x+1=0$`, L`$x^2-7x-1=0$`],
        correctLetter: "A",
        rationales: {
          B: "The transformed-root sum is positive $7$, so the coefficient of $x$ is $-7$.",
          C: "This uses $\\alpha+\\beta+2$ instead of $\\alpha^2+\\beta^2$.",
          D: "The product $(\\alpha/\\beta)(\\beta/\\alpha)$ is $1$, not $-1$.",
        },
        misconceptionTags: {
          B: "wrong_vieta_sign",
          C: "wrong_transformed_sum",
          D: "wrong_transformed_product",
        },
        hints: [
          "Use $\\alpha+\\beta=3$ and $\\alpha\\beta=1$.",
          "$\\alpha/\\beta+\\beta/\\alpha=(\\alpha^2+\\beta^2)/\\alpha\\beta$.",
          "The product of the new roots is $1$.",
        ],
        solution: solution(
          "$\\alpha^2+\\beta^2=(\\alpha+\\beta)^2-2\\alpha\\beta=9-2=7$, and $\\alpha\\beta=1$. The new roots have sum $7$ and product $1$, so the equation is $x^2-7x+1=0$.",
          L`x^2-7x+1=0`,
        ),
      },
      {
        questionLatex: L`For which values of $p$ can $x^2+px+12=0$ have both roots as positive integers?`,
        difficulty: 4,
        skillTags: ["integer_roots", "vieta"],
        choices: [L`$p\in\{-13,-8,-7\}$`, L`$p\in\{7,8,13\}$`, L`$p\in\{-12,-6,-4\}$`, L`$p=-7$ only`],
        correctLetter: "A",
        rationales: {
          B: "If the roots are positive, their sum is positive, so $p=-(\\text{sum})$ is negative.",
          C: "These are based on factor differences or products, not sums.",
          D: "This keeps only the factor pair $3,4$ and misses $1,12$ and $2,6$.",
        },
        misconceptionTags: {
          B: "wrong_sign_of_coefficient",
          C: "uses_wrong_factor_measure",
          D: "incomplete_factor_pairs",
        },
        hints: [
          "Let the positive integer roots be $r$ and $s$.",
          "Then $rs=12$ and $r+s=-p$.",
          "List positive factor pairs of $12$.",
        ],
        solution: solution(
          "The positive factor pairs are $(1,12),(2,6),(3,4)$, giving sums $13,8,7$. Hence $p=-13,-8,-7$.",
          L`\{-13,-8,-7\}`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`If the roots of $x^2-7x+k=0$ differ by $3$, find $k$.`,
        difficulty: 3,
        skillTags: ["root_difference", "discriminant"],
        promptMarkdown: "Enter the value of $k$.",
        numericAnswer: 10,
        hints: [
          "For a monic quadratic, the square of root difference is the discriminant.",
          "Set $49-4k=9$.",
          "Solve for $k$.",
        ],
        rubric: [
          "Uses the discriminant as the square of the root difference.",
          "Solves the resulting linear equation.",
        ],
        commonErrors: [
          "Setting the discriminant equal to $3$ instead of $9$.",
          "Using sum of roots as the difference.",
        ],
        solution:
          "Since the roots differ by $3$, the discriminant is $9$. Thus $49-4k=9$, giving $k=10$.",
      },
      {
        questionLatex: L`Find the number of integers $m$ with $-5\le m\le5$ for which $x^2-2mx+m+6=0$ has real roots.`,
        difficulty: 4,
        skillTags: ["integer_parameter_count", "discriminant_inequality"],
        promptMarkdown: "Enter the count.",
        numericAnswer: 7,
        hints: [
          "Use discriminant nonnegative.",
          "The condition becomes $m^2-m-6\\ge0$.",
          "Intersect the solution set with the integers from $-5$ to $5$.",
        ],
        rubric: [
          "Forms and solves the discriminant inequality.",
          "Counts only integers in the given interval.",
        ],
        commonErrors: [
          "Forgetting the bounded interval.",
          "Including $m=-1,0,1,2$ where the discriminant is negative.",
        ],
        solution:
          "The discriminant condition is $4m^2-4(m+6)\\ge0$, i.e. $(m-3)(m+2)\\ge0$. In $[-5,5]$, this gives $m=-5,-4,-3,-2,3,4,5$, so the count is $7$.",
      },
      {
        questionLatex: L`Find the sum of all possible values of $p$ such that $x^2+px+18=0$ has both roots as positive integers.`,
        difficulty: 3,
        skillTags: ["integer_roots", "vieta"],
        promptMarkdown: "Enter the sum of all possible values of $p$.",
        numericAnswer: -39,
        hints: [
          "Positive integer roots must be factor pairs of $18$.",
          "Use $p=-(\\text{sum of roots})$.",
          "Add the distinct coefficient values, not the roots.",
        ],
        rubric: [
          "Lists all positive factor pairs of $18$.",
          "Converts each pair to the corresponding $p$ value and adds them.",
        ],
        commonErrors: [
          "Returning the number of possible values instead of their sum.",
          "Using $p$ as the positive root sum instead of its negative.",
          "Missing one of the factor pairs of $18$.",
        ],
        solution:
          "The positive factor pairs are $(1,18),(2,9),(3,6)$, giving $p=-19,-11,-9$. Their sum is $-19-11-9=-39$.",
      },
      {
        questionLatex: L`Find the number of integers $a$ with $|a|\le10$ for which $x^2+ax+16=0$ has integer roots.`,
        difficulty: 5,
        skillTags: ["integer_roots", "bounded_parameter_count"],
        promptMarkdown: "Enter the count.",
        numericAnswer: 4,
        hints: [
          "Integer roots must multiply to $16$.",
          "List same-sign factor pairs because the product is positive.",
          "Convert sums into $a=-(r+s)$ and apply $|a|\\le10$.",
        ],
        rubric: [
          "Considers both positive and negative factor pairs.",
          "Applies the bound on $a$ after computing sums.",
        ],
        commonErrors: [
          "Forgetting negative factor pairs.",
          "Including $a=\\pm17$ outside the allowed range.",
        ],
        solution:
          "Positive factor pairs give sums $17,10,8$, hence $a=-17,-10,-8$. Negative pairs give $a=17,10,8$. With $|a|\\le10$, the valid values are $-10,-8,8,10$, so the count is $4$.",
      },
      {
        questionLatex: L`If the roots of $x^2-6x+k=0$ are $\tan A$ and $\cot A$ for an acute angle $A$, find $k$.`,
        difficulty: 4,
        skillTags: ["trigonometric_roots", "product_of_roots"],
        promptMarkdown: "Enter the value of $k$.",
        numericAnswer: 1,
        hints: [
          "Use Vieta's product of roots.",
          "$\\tan A\\cdot\\cot A=1$.",
          "The sum condition only checks consistency.",
        ],
        rubric: [
          "Uses the reciprocal-product relation.",
          "Identifies $k$ as the product of roots.",
        ],
        commonErrors: [
          "Trying to find $A$ first and losing the simple product condition.",
          "Using the sum of roots as $k$.",
        ],
        solution:
          "The product of the roots is $k$. Since $\\tan A\\cdot\\cot A=1$, we get $k=1$.",
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Mixed Complex-Quadratic Reasoning",
    subtopic:
      "Complex roots of quadratics, transformed roots, conjugate pairs, and mixed Vieta problems.",
    mc: [
      {
        questionLatex: L`The distance between the roots of $z^2-2z+5=0$ in the complex plane is`,
        difficulty: 3,
        skillTags: ["complex_roots", "distance_between_roots"],
        choices: [L`$2$`, L`$4$`, L`$\sqrt5$`, L`$2\sqrt5$`],
        correctLetter: "B",
        rationales: {
          A: "This is the imaginary part of one root, not the distance between both roots.",
          C: "This is the modulus of a root, not root separation.",
          D: "This doubles the modulus rather than the imaginary separation.",
        },
        misconceptionTags: {
          A: "uses_one_imaginary_part",
          C: "confuses_modulus_with_distance",
          D: "doubles_root_modulus",
        },
        hints: [
          "Find the roots using the discriminant.",
          "The roots are conjugates.",
          "Their distance is the vertical separation.",
        ],
        solution: solution(
          "The roots are $1\\pm2i$, whose distance is $|4i|=4$.",
          L`4`,
        ),
      },
      {
        questionLatex: L`If $\alpha,\beta$ are roots of $x^2-2x+2=0$, then $\dfrac{\alpha}{\beta}+\dfrac{\beta}{\alpha}$ equals`,
        difficulty: 4,
        skillTags: ["transformed_roots", "vieta_complex_roots"],
        choices: [L`$-2$`, L`$0$`, L`$1$`, L`$2$`],
        correctLetter: "B",
        rationales: {
          A: "This uses $\\alpha+\\beta-4$ rather than $\\alpha^2+\\beta^2$.",
          C: "This is the product of the transformed roots, not their sum.",
          D: "This copies the original root sum.",
        },
        misconceptionTags: {
          A: "wrong_transformed_sum",
          C: "confuses_sum_and_product",
          D: "uses_original_sum",
        },
        hints: [
          "Use $\\alpha+\\beta=2$ and $\\alpha\\beta=2$.",
          "$\\alpha/\\beta+\\beta/\\alpha=(\\alpha^2+\\beta^2)/\\alpha\\beta$.",
          "Compute $\\alpha^2+\\beta^2$ from the sum and product.",
        ],
        solution: solution(
          "$\\alpha^2+\\beta^2=(\\alpha+\\beta)^2-2\\alpha\\beta=4-4=0$, so the required sum is $0/2=0$.",
          L`0`,
        ),
      },
      {
        questionLatex: L`If $2+i$ and its conjugate are roots of $x^2+px+q=0$ with real $p,q$, then $(p,q)$ equals`,
        difficulty: 3,
        skillTags: ["conjugate_roots", "real_quadratic"],
        choices: [L`$(-4,5)$`, L`$(4,5)$`, L`$(-2,5)$`, L`$(-4,-5)$`],
        correctLetter: "A",
        rationales: {
          B: "The coefficient $p$ is the negative of the root sum.",
          C: "This uses only the real part once, not the sum of both conjugates.",
          D: "The product is $|2+i|^2=5$, not $-5$.",
        },
        misconceptionTags: {
          B: "wrong_vieta_sign",
          C: "uses_single_root_real_part",
          D: "wrong_product_sign",
        },
        hints: [
          "The other root is $2-i$.",
          "The sum of roots is $4$.",
          "The product is $5$.",
        ],
        solution: solution(
          "The roots are $2+i$ and $2-i$. Their sum is $4$ and product is $5$, so $p=-4$ and $q=5$.",
          L`(p,q)=(-4,5)`,
        ),
      },
      {
        questionLatex: L`For a complex number $z$, the quadratic $x^2-2\operatorname{Re}(z)x+|z|^2=0$ has equal roots if and only if`,
        difficulty: 5,
        skillTags: ["complex_quadratic_bridge", "discriminant"],
        choices: [L`$z$ is real`, L`$z$ is purely imaginary`, L`$|z|=1$`, L`$\operatorname{Re}(z)=0$`],
        correctLetter: "A",
        rationales: {
          B: "A nonzero purely imaginary $z$ gives negative discriminant, not equal real roots.",
          C: "Unit modulus alone does not force equal roots; for $z=i$, the roots are not equal.",
          D: "This is only true for $z=0$; otherwise the discriminant is negative.",
        },
        misconceptionTags: {
          B: "confuses_imaginary_axis_with_zero_discriminant",
          C: "uses_modulus_condition_only",
          D: "misses_nonzero_imaginary_part",
        },
        hints: [
          "Write $z=a+ib$.",
          "The quadratic is $x^2-2ax+a^2+b^2=0$.",
          "Set its discriminant to zero.",
        ],
        solution: solution(
          "With $z=a+ib$, the discriminant is $4a^2-4(a^2+b^2)=-4b^2$. It is zero exactly when $b=0$, i.e. $z$ is real.",
          L`\operatorname{Im}z=0`,
        ),
      },
      {
        questionLatex: L`If the roots of $x^2+px+q=0$ are $\omega$ and $\omega^2$, where $\omega$ is a non-real cube root of unity, then`,
        difficulty: 4,
        skillTags: ["cube_roots_unity", "quadratic_roots"],
        choices: [L`$p=q=1$`, L`$p=-1,\ q=1$`, L`$p=1,\ q=-1$`, L`$p=q=-1$`],
        correctLetter: "A",
        rationales: {
          B: "The coefficient $p$ is the negative of $\\omega+\\omega^2=-1$.",
          C: "The product $\\omega^3$ is $1$, not $-1$.",
          D: "Both Vieta signs have been reversed.",
        },
        misconceptionTags: {
          B: "wrong_vieta_sign",
          C: "wrong_product_of_cube_roots",
          D: "double_sign_error",
        },
        hints: [
          "Use $\\omega+\\omega^2=-1$.",
          "Use $\\omega\\omega^2=\\omega^3=1$.",
          "Compare with $x^2+px+q$.",
        ],
        solution: solution(
          "The sum of roots is $-1$, so $p=1$. The product is $1$, so $q=1$.",
          L`p=q=1`,
        ),
      },
      {
        questionLatex: L`If $\alpha,\beta$ are roots of $x^2+x+1=0$, then $(\alpha-\beta)^2$ equals`,
        difficulty: 4,
        skillTags: ["root_difference", "complex_roots"],
        choices: [L`$-3$`, L`$3$`, L`$-1$`, L`$1$`],
        correctLetter: "A",
        rationales: {
          B: "This is the square of the magnitude of the difference, not the algebraic square.",
          C: "This uses only $(\\alpha+\\beta)^2$.",
          D: "This ignores the product term in the identity.",
        },
        misconceptionTags: {
          B: "confuses_square_with_modulus_square",
          C: "drops_product_term",
          D: "wrong_difference_identity",
        },
        hints: [
          "Use $(\\alpha-\\beta)^2=(\\alpha+\\beta)^2-4\\alpha\\beta$.",
          "For the quadratic, $\\alpha+\\beta=-1$ and $\\alpha\\beta=1$.",
          "Do not take modulus unless asked.",
        ],
        solution: solution(
          "$(\\alpha-\\beta)^2=(-1)^2-4(1)=-3$.",
          L`-3`,
        ),
      },
      {
        questionLatex: L`The monic quadratic with real coefficients having $3-2i$ as one root is`,
        difficulty: 3,
        skillTags: ["conjugate_roots", "quadratic_formation"],
        choices: [L`$x^2-6x+13=0$`, L`$x^2+6x+13=0$`, L`$x^2-3x+13=0$`, L`$x^2-6x-13=0$`],
        correctLetter: "A",
        rationales: {
          B: "The root sum is $6$, so the coefficient of $x$ is $-6$.",
          C: "This uses only the real part once instead of the sum of conjugates.",
          D: "The product is $3^2+2^2=13$, positive.",
        },
        misconceptionTags: {
          B: "wrong_vieta_sign",
          C: "uses_single_real_part",
          D: "wrong_product_sign",
        },
        hints: [
          "The conjugate root is $3+2i$.",
          "The sum is $6$.",
          "The product is $13$.",
        ],
        solution: solution(
          "The roots are $3-2i$ and $3+2i$. Sum $=6$, product $=13$, so the equation is $x^2-6x+13=0$.",
          L`x^2-6x+13=0`,
        ),
      },
      {
        questionLatex: L`The roots $\dfrac{1+i}{1-i}$ and its conjugate form the quadratic`,
        difficulty: 4,
        skillTags: ["complex_quotient", "quadratic_formation"],
        choices: [L`$x^2+1=0$`, L`$x^2-1=0$`, L`$x^2+x+1=0$`, L`$x^2-x+1=0$`],
        correctLetter: "A",
        rationales: {
          B: "This would have roots $\\pm1$, not $\\pm i$.",
          C: "These are non-real cube roots of unity, not the quotient here.",
          D: "This is the other cube-root quadratic.",
        },
        misconceptionTags: {
          B: "uses_real_unit_roots",
          C: "confuses_with_cube_roots",
          D: "wrong_root_of_unity_family",
        },
        hints: [
          "First simplify the quotient.",
          "$\\frac{1+i}{1-i}=i$.",
          "The conjugate root is $-i$.",
        ],
        solution: solution(
          "$\\frac{1+i}{1-i}=i$, and its conjugate is $-i$. The quadratic with roots $i,-i$ is $x^2+1=0$.",
          L`x^2+1=0`,
        ),
      },
      {
        questionLatex: L`The roots of $z^2+(1-i)z-i=0$ are`,
        difficulty: 4,
        skillTags: ["complex_quadratic_factorization", "complex_roots"],
        choices: [L`$-1,\ i$`, L`$1,\ -i$`, L`$-1,\ -i$`, L`$1,\ i$`],
        correctLetter: "A",
        rationales: {
          B: "The sum of these roots is $1-i$, but the required sum is $-1+i$.",
          C: "The product would be $i$, not $-i$.",
          D: "The product would be $i$, not $-i$.",
        },
        misconceptionTags: {
          B: "wrong_vieta_sum_sign",
          C: "wrong_product",
          D: "wrong_product_and_sum",
        },
        hints: [
          "For $z^2+(1-i)z-i=0$, the root sum is $-1+i$.",
          "The root product is $-i$.",
          "Find the pair matching both.",
        ],
        solution: solution(
          "The pair $-1$ and $i$ has sum $-1+i$ and product $-i$, so these are the roots.",
          L`-1,\ i`,
        ),
      },
      {
        questionLatex: L`If $\alpha,\beta$ are roots of $x^2-4x+8=0$, then $|\alpha|+|\beta|$ equals`,
        difficulty: 4,
        skillTags: ["complex_roots", "modulus_of_roots"],
        choices: [L`$4$`, L`$4\sqrt2$`, L`$8$`, L`$2\sqrt2$`],
        correctLetter: "B",
        rationales: {
          A: "This is the sum of real parts, not the sum of moduli.",
          C: "This is the product of the moduli, not their sum.",
          D: "This is the modulus of one root only.",
        },
        misconceptionTags: {
          A: "uses_real_parts_instead_of_moduli",
          C: "confuses_product_and_sum",
          D: "returns_single_root_modulus",
        },
        hints: [
          "Find the roots or use product.",
          "The roots are conjugates, so their moduli are equal.",
          "For a conjugate pair, each modulus squared equals the product.",
        ],
        solution: solution(
          "The roots are $2\\pm2i$, each with modulus $2\\sqrt2$. Hence the sum of moduli is $4\\sqrt2$.",
          L`4\sqrt2`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`Find the distance between the roots of $x^2-4x+13=0$ in the complex plane.`,
        difficulty: 3,
        skillTags: ["complex_roots", "distance_between_roots"],
        promptMarkdown: "Enter the distance.",
        numericAnswer: 6,
        hints: [
          "Find the conjugate roots.",
          "The roots are $2\\pm3i$.",
          "The distance is the vertical separation.",
        ],
        rubric: [
          "Finds the complex conjugate roots.",
          "Computes the distance between them.",
        ],
        commonErrors: [
          "Returning the imaginary part $3$ instead of the separation $6$.",
          "Returning the modulus of one root.",
        ],
        solution:
          "The roots are $2\\pm3i$. Their distance is $|(2+3i)-(2-3i)|=|6i|=6$.",
      },
      {
        questionLatex: L`If $1+i$ is a root of $x^2+px+q=0$ with real $p,q$, find $p+q$.`,
        difficulty: 3,
        skillTags: ["conjugate_roots", "vieta"],
        promptMarkdown: "Enter $p+q$.",
        numericAnswer: 0,
        hints: [
          "The other root must be $1-i$.",
          "Use sum and product of roots.",
          "Then add $p$ and $q$.",
        ],
        rubric: [
          "Uses conjugate-pair property for real coefficients.",
          "Finds both coefficients and adds them.",
        ],
        commonErrors: [
          "Using only the given root.",
          "Taking $p$ as the root sum instead of its negative.",
        ],
        solution:
          "The roots are $1+i$ and $1-i$. Their sum is $2$, so $p=-2$, and their product is $2$, so $q=2$. Therefore $p+q=0$.",
      },
      {
        questionLatex: L`If $\alpha,\beta$ are roots of $x^2-2x+5=0$, find $\alpha^2+\beta^2$.`,
        difficulty: 4,
        skillTags: ["power_sum_roots", "vieta_complex_roots"],
        promptMarkdown: "Enter the value.",
        numericAnswer: -6,
        hints: [
          "Use $\\alpha+\\beta=2$ and $\\alpha\\beta=5$.",
          "Use $\\alpha^2+\\beta^2=(\\alpha+\\beta)^2-2\\alpha\\beta$.",
          "Do not solve the roots unless necessary.",
        ],
        rubric: [
          "Applies Vieta correctly.",
          "Uses the square-sum identity.",
        ],
        commonErrors: [
          "Using $+2\\alpha\\beta$ instead of $-2\\alpha\\beta$.",
          "Assuming a square sum must be positive over complex roots.",
        ],
        solution:
          "$\\alpha^2+\\beta^2=(\\alpha+\\beta)^2-2\\alpha\\beta=2^2-2\\cdot5=-6$.",
      },
      {
        questionLatex: L`If $1-\omega$ and $1-\omega^2$ are roots of $x^2+px+q=0$, where $\omega$ is a non-real cube root of unity, find $p^2+q$.`,
        difficulty: 3,
        skillTags: ["cube_roots_unity", "vieta"],
        promptMarkdown: "Enter $p^2+q$.",
        numericAnswer: 12,
        hints: [
          "Use $\\omega+\\omega^2=-1$.",
          "Use $\\omega\\omega^2=1$.",
          "First find the sum and product of the shifted roots.",
        ],
        rubric: [
          "Computes the sum and product of $1-\\omega$ and $1-\\omega^2$.",
          "Applies Vieta's signs and evaluates $p^2+q$.",
        ],
        commonErrors: [
          "Using the unshifted roots $\\omega,\\omega^2$ instead of $1-\\omega,1-\\omega^2$.",
          "Taking $p$ as the root sum instead of its negative.",
          "Returning $p+q$ instead of $p^2+q$.",
        ],
        solution:
          "The shifted-root sum is $(1-\\omega)+(1-\\omega^2)=2-(\\omega+\\omega^2)=3$, so $p=-3$. Their product is $(1-\\omega)(1-\\omega^2)=1-(\\omega+\\omega^2)+\\omega^3=3$, so $q=3$. Hence $p^2+q=9+3=12$.",
      },
      {
        questionLatex: L`Find the number of monic quadratics $x^2+bx+c=0$ with integer $b,c$ and $|b|\le5,\ |c|\le5$ whose roots are $i$ and $-i$.`,
        difficulty: 3,
        skillTags: ["quadratic_formation", "integer_coefficients"],
        promptMarkdown: "Enter the number of such quadratics.",
        numericAnswer: 1,
        hints: [
          "A monic quadratic is fixed by its two roots.",
          "The sum of the roots is $0$.",
          "The product of the roots is $1$.",
        ],
        rubric: [
          "Forms the unique monic quadratic from the roots.",
          "Checks the coefficient bounds.",
        ],
        commonErrors: [
          "Counting scalar multiples despite the word monic.",
          "Using $c=-1$ instead of $c=1$.",
        ],
        solution:
          "The roots $i$ and $-i$ give the monic quadratic $x^2+1=0$, so $(b,c)=(0,1)$, which satisfies the bounds. There is exactly $1$ such quadratic.",
      },
    ],
  },
];

export const jeeComplexQuadraticTopics: Topic[] = topicSeeds.map(makeTopic);
