import type {
  Hint,
  ItemFigure,
  McChoice,
  McSingleItem,
  NumericItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";

const COURSE = "jee-main-math";
const UNIT = "u1-sets-relations-functions";
const VERSION = "0.3.1";
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

interface NumericSeed {
  questionLatex: string;
  difficulty: Difficulty;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  promptMarkdown: string;
  points?: number;
  hints: readonly [string, string, string];
  numericAnswer?: number;
  rubric: readonly string[];
  commonErrors: readonly string[];
  solution: string;
}

interface TopicSeed extends TopicMeta {
  mcSelection?: readonly number[];
  numericSelection?: readonly number[];
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. This misses one of the defining conditions in the stem.${checkStep} The correct choice is ${correctText}.`;
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
        : seed.misconceptionTags?.[letter] ?? "jee_unit1_distractor_trap",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_checking_the_set_or_function_conditions",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
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
  if (seed.numericAnswer === undefined) {
    throw new Error(`Missing numericAnswer for ${meta.topicCode} numeric item ${index + 1}`);
  }

  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.num.${String(index + 1).padStart(3, "0")}`,
    kind: "numeric",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "jumps_to_counting_without_partitioning_the_cases",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
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
  const mcIndexes = seed.mcSelection ?? seed.mc.map((_, index) => index);
  const numericIndexes =
    seed.numericSelection ?? seed.numeric.map((_, index) => index);
  const mcItems = mcIndexes.map((sourceIndex, index) =>
    makeMc(meta, seed.mc[sourceIndex], index),
  );
  const numericItems = numericIndexes.map((sourceIndex, index) =>
    makeNumeric(meta, seed.numeric[sourceIndex], index),
  );

  return {
    ...meta,
    items: [...mcItems, ...numericItems],
  };
}

const setPartitionFigure: ItemFigure = {
  type: "svg",
  title: "Three-set Venn diagram",
  description:
    "A clean three-set Venn diagram labelled only with the sets in the stem.",
  svg: `<svg viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="8" y="8" width="504" height="284" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <circle cx="220" cy="132" r="92" fill="#bfdbfe" fill-opacity="0.55" stroke="#2563eb" stroke-width="3"/>
  <circle cx="300" cy="132" r="92" fill="#fed7aa" fill-opacity="0.55" stroke="#f97316" stroke-width="3"/>
  <circle cx="260" cy="204" r="92" fill="#bbf7d0" fill-opacity="0.55" stroke="#16a34a" stroke-width="3"/>
  <text x="171" y="78" font-size="22" font-family="Arial, sans-serif" fill="#1e3a8a">A</text>
  <text x="335" y="78" font-size="22" font-family="Arial, sans-serif" fill="#9a3412">B</text>
  <text x="260" y="278" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#166534">C</text>
</svg>`,
};

const powerSetOverlapFigure: ItemFigure = {
  type: "svg",
  title: "Two-set overlap",
  description:
    "Two overlapping sets labelled only with A and B.",
  svg: `<svg viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="500" height="240" fill="#ffffff"/>
  <rect x="24" y="22" width="452" height="196" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <ellipse cx="210" cy="120" rx="120" ry="72" fill="#dbeafe" fill-opacity="0.7" stroke="#2563eb" stroke-width="3"/>
  <ellipse cx="290" cy="120" rx="120" ry="72" fill="#dcfce7" fill-opacity="0.7" stroke="#16a34a" stroke-width="3"/>
  <text x="150" y="78" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#1e40af">A</text>
  <text x="350" y="78" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#166534">B</text>
</svg>`,
};

const relationGraphFigure: ItemFigure = {
  type: "svg",
  title: "Relation graph",
  description:
    "A graph of the relation pairs stated in the question.",
  svg: `<svg viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <marker id="arrowRel" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#475569"/>
    </marker>
  </defs>
  <rect width="420" height="250" fill="#ffffff"/>
  <circle cx="110" cy="125" r="24" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <circle cx="210" cy="70" r="24" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <circle cx="310" cy="125" r="24" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <text x="110" y="132" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">1</text>
  <text x="210" y="77" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">2</text>
  <text x="310" y="132" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">3</text>
  <path d="M132 113 C160 91, 181 80, 188 76" fill="none" stroke="#475569" stroke-width="2.5" marker-end="url(#arrowRel)"/>
  <path d="M188 88 C160 111, 139 121, 132 125" fill="none" stroke="#475569" stroke-width="2.5" marker-end="url(#arrowRel)"/>
  <path d="M232 76 C260 91, 281 111, 288 118" fill="none" stroke="#475569" stroke-width="2.5" marker-end="url(#arrowRel)"/>
  <path d="M288 130 C260 111, 239 91, 232 84" fill="none" stroke="#475569" stroke-width="2.5" marker-end="url(#arrowRel)"/>
  <path d="M95 104 C62 72, 82 45, 112 54 C139 63, 133 94, 119 104" fill="none" stroke="#2563eb" stroke-width="2.4" marker-end="url(#arrowRel)"/>
  <path d="M211 44 C181 20, 208 -5, 235 20 C252 36, 239 55, 226 55" fill="none" stroke="#2563eb" stroke-width="2.4" marker-end="url(#arrowRel)"/>
  <path d="M324 104 C356 72, 338 45, 308 54 C281 63, 286 94, 300 104" fill="none" stroke="#2563eb" stroke-width="2.4" marker-end="url(#arrowRel)"/>
</svg>`,
};

const functionMappingFigure: ItemFigure = {
  type: "svg",
  title: "Function domain and codomain",
  description:
    "Five domain nodes and three codomain nodes without arrows or counting hints.",
  svg: `<svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="480" height="280" fill="#ffffff"/>
  <text x="130" y="34" font-size="18" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">Domain</text>
  <text x="350" y="34" font-size="18" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">Codomain</text>
  <g font-size="17" font-family="Arial, sans-serif" text-anchor="middle" fill="#0f172a">
    <circle cx="130" cy="70" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="130" y="76">1</text>
    <circle cx="130" cy="112" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="130" y="118">2</text>
    <circle cx="130" cy="154" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="130" y="160">3</text>
    <circle cx="130" cy="196" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="130" y="202">4</text>
    <circle cx="130" cy="238" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="130" y="244">5</text>
    <circle cx="350" cy="94" r="18" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><text x="350" y="100">1</text>
    <circle cx="350" cy="154" r="18" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><text x="350" y="160">2</text>
    <circle cx="350" cy="214" r="18" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><text x="350" y="220">3</text>
  </g>
</svg>`,
};

const compositionFlowFigure: ItemFigure = {
  type: "svg",
  title: "Composition flow",
  description:
    "A neutral flow diagram for a composition expression.",
  svg: `<svg viewBox="0 0 520 180" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <marker id="arrowComp" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
      <path d="M0,0 L9,4.5 L0,9 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <rect width="520" height="180" fill="#ffffff"/>
  <rect x="38" y="64" width="86" height="52" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <rect x="216" y="64" width="86" height="52" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <rect x="394" y="64" width="86" height="52" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <text x="81" y="97" font-size="17" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">input</text>
  <text x="259" y="97" font-size="17" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">step</text>
  <text x="437" y="97" font-size="17" text-anchor="middle" font-family="Arial, sans-serif" fill="#0f172a">output</text>
  <path d="M126 90 H210" fill="none" stroke="#2563eb" stroke-width="3" marker-end="url(#arrowComp)"/>
  <path d="M304 90 H388" fill="none" stroke="#2563eb" stroke-width="3" marker-end="url(#arrowComp)"/>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Set Algebra and Power Sets",
    subtopic:
      "Inclusion-exclusion, complements, symmetric difference, and power-set counts with constraints.",
    mc: [
      {
        questionLatex: L`In a universal set of 60 elements, sets A,B,C satisfy |A|=32,\ |B|=28,\ |C|=26,\ |A\cap B|=14,\ |B\cap C|=12,\ |C\cap A|=10. If exactly 29 elements belong to exactly one of A,B,C, then |A\cap B\cap C| is`,
        difficulty: 4,
        skillTags: ["three_set_inclusion_exclusion", "exactly_one_counting"],
        figure: setPartitionFigure,
        choices: [L`$4$`, L`$5$`, L`$6$`, L`$7$`],
        correctLetter: "B",
        rationales: {
          A: "This comes from subtracting the triple intersection only twice; each pair-only region must remove the triple once.",
          C: "This usually happens when the constant exactly-one contribution is read as 11 instead of 14.",
          D: "This treats the three pair intersections as if they were disjoint from the triple intersection.",
        },
        misconceptionTags: {
          A: "under_subtracts_triple_region",
          C: "arithmetic_slip_in_partition_sum",
          D: "confuses_pair_intersections_with_exactly_two",
        },
        hints: [
          "Write the three exactly-one regions separately.",
          "For example, $A$ only is $|A|-|A\\cap B|-|A\\cap C|+|A\\cap B\\cap C|$.",
          "The exactly-one total becomes a linear expression in $t=|A\\cap B\\cap C|$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Let t be the number of elements in all three sets.",
            math: L`t=|A\cap B\cap C|`,
          },
          {
            step: 2,
            explanation:
              "The exactly-one count is the sum of the three only-regions.",
            math: L`(32-14-10+t)+(28-14-12+t)+(26-10-12+t)=14+3t`,
          },
          {
            step: 3,
            explanation: "Set this equal to 29.",
            math: L`14+3t=29\Rightarrow t=5`,
          },
        ],
      },
      {
        questionLatex: L`For finite sets A and B, |{\cal P}(A\cup B)|=512,\ |{\cal P}(A\cap B)|=8, and |{\cal P}(A\setminus B)|=32. Then |B\setminus A| equals`,
        difficulty: 4,
        skillTags: ["power_set_cardinality", "set_partition"],
        figure: powerSetOverlapFigure,
        choices: [L`$1$`, L`$2$`, L`$3$`, L`$4$`],
        correctLetter: "A",
        rationales: {
          B: "You converted one of the powers of 2 correctly but did not subtract all three disjoint regions inside $A\\cup B$.",
          C: "This is $|A\\cap B|$, not $|B\\setminus A|$.",
          D: "This reads $2^5=32$ as the size of $B\\setminus A$ instead of $A\\setminus B$.",
        },
        misconceptionTags: {
          B: "misses_disjoint_union_of_regions",
          C: "returns_intersection_size",
          D: "confuses_region_with_power_set_size",
        },
        hints: [
          "$|{\\cal P}(S)|=2^{|S|}$.",
          "Convert all three power-set sizes into ordinary set sizes first.",
          "$|A\\cup B|=|A\\setminus B|+|A\\cap B|+|B\\setminus A|$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert power-set cardinalities into set cardinalities.",
            math: L`|A\cup B|=9,\quad |A\cap B|=3,\quad |A\setminus B|=5`,
          },
          {
            step: 2,
            explanation: "Use the disjoint partition of the union.",
            math: L`9=5+3+|B\setminus A|`,
          },
          {
            step: 3,
            explanation: "Therefore the missing region has one element.",
            math: L`|B\setminus A|=1`,
          },
        ],
      },
      {
        questionLatex: L`Let X=\{1,2,\ldots,8\}. The number of subsets S of X that contain exactly one element from each of \{1,2\} and \{3,4\}, and do not contain both 5 and 6, is`,
        difficulty: 4,
        skillTags: ["restricted_subsets", "case_counting"],
        choices: [L`$32$`, L`$40$`, L`$48$`, L`$64$`],
        correctLetter: "C",
        rationales: {
          A: "This forgets that 7 and 8 are independent free choices after the first two pair constraints.",
          B: "This subtracts only the subset containing 5 and 6, but 7 and 8 can still vary in four ways.",
          D: "This applies the two exact-one constraints but ignores the condition about 5 and 6.",
        },
        misconceptionTags: {
          A: "drops_free_elements",
          B: "under_subtracts_invalid_cases",
          D: "ignores_exclusion_condition",
        },
        hints: [
          "The pairs $\\{1,2\\}$ and $\\{3,4\\}$ contribute two choices each.",
          "For $\\{5,6,7,8\\}$, count all choices and subtract those with both 5 and 6.",
          "The choices for different blocks multiply.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Choose one from each of the first two pairs.",
            math: L`2\cdot 2=4`,
          },
          {
            step: 2,
            explanation:
              "For the remaining four elements, all subsets are allowed except those containing both 5 and 6.",
            math: L`2^4-2^2=16-4=12`,
          },
          {
            step: 3,
            explanation: "Multiply the independent choices.",
            math: L`4\cdot 12=48`,
          },
        ],
      },
      {
        questionLatex: L`For subsets A and B of a universal set U, which identity is always true?`,
        difficulty: 3,
        skillTags: ["symmetric_difference", "complement_laws"],
        choices: [
          L`$(A\triangle B)'=(A\cap B)\cup(A'\cap B')$`,
          L`$(A\triangle B)'=(A\setminus B)\cup(B\setminus A)$`,
          L`$(A\triangle B)'=(A\cup B)\cap(A'\cup B')$`,
          L`$(A\triangle B)'=(A\cap B')\cup(A'\cap B)$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is $A\\triangle B$ itself, not its complement.",
          C: "This simplifies to the symmetric difference, because it selects elements in exactly one of the two sets.",
          D: "This is another standard form of $A\\triangle B$, so it reverses the complement.",
        },
        misconceptionTags: {
          B: "confuses_symmetric_difference_with_complement",
          C: "misapplies_de_morgan_to_xor",
          D: "selects_exactly_one_instead_of_same_membership",
        },
        hints: [
          "$A\\triangle B$ means the element is in exactly one of the two sets.",
          "Its complement means the element has the same membership status in both sets.",
          "Same status means in both, or in neither.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The symmetric difference contains elements in exactly one of A and B.",
            math: L`A\triangle B=(A\cap B')\cup(A'\cap B)`,
          },
          {
            step: 2,
            explanation:
              "The complement therefore contains elements in both or in neither.",
            math: L`(A\triangle B)'=(A\cap B)\cup(A'\cap B')`,
          },
        ],
      },
      {
        questionLatex: L`Let |U|=n,\ |A|=a,\ |B|=b, where A,B\subseteq U. The maximum possible value of |{\cal P}(A)\setminus{\cal P}(B)| is`,
        difficulty: 5,
        skillTags: ["power_set_difference", "extremal_set_intersection"],
        choices: [
          L`$2^a-2^{\max(0,a+b-n)}$`,
          L`$2^a-2^{\min(a,b)}$`,
          L`$2^a-2^{a+b-n}$`,
          L`$2^a-2^b$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This makes $A\\cap B$ as large as possible; the question asks for the maximum difference, so the overlap should be as small as possible.",
          C: "This misses the case $a+b\\le n$, where the minimum possible intersection is 0, not a negative exponent.",
          D: "Subsets common to both power sets are controlled by $A\\cap B$, not by all of $B$.",
        },
        misconceptionTags: {
          B: "maximizes_intersection_instead_of_minimizing",
          C: "ignores_nonnegative_intersection_bound",
          D: "uses_wrong_common_subset_region",
        },
        hints: [
          "${\\cal P}(A)\\cap{\\cal P}(B)={\\cal P}(A\\cap B)$.",
          "$|{\\cal P}(A)\\setminus{\\cal P}(B)|=2^a-2^{|A\\cap B|}$.",
          "To maximize this expression, minimize $|A\\cap B|$ inside a universe of size $n$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A subset of A is also a subset of B exactly when it is a subset of the intersection.",
            math: L`{\cal P}(A)\cap{\cal P}(B)={\cal P}(A\cap B)`,
          },
          {
            step: 2,
            explanation: "Therefore the desired count is minimized by the smallest possible overlap.",
            math: L`|{\cal P}(A)\setminus{\cal P}(B)|=2^a-2^{|A\cap B|}`,
          },
          {
            step: 3,
            explanation:
              "The minimum possible intersection size is forced only when $a+b>n$.",
            math: L`\min |A\cap B|=\max(0,a+b-n)`,
          },
        ],
      },
      {
        questionLatex: L`For finite sets A,B\subseteq U, suppose |{\cal P}(A)|=4|{\cal P}(B)| and |{\cal P}(A\cup B)|=64|{\cal P}(A\cap B)|. Then |A\setminus B| is`,
        difficulty: 5,
        skillTags: ["power_set_cardinality", "symmetric_difference_counting"],
        choices: [L`$2$`, L`$3$`, L`$4$`, L`$6$`],
        correctLetter: "C",
        rationales: {
          A: "This uses only $|A|-|B|=2$ and forgets the symmetric-difference total forced by the union/intersection condition.",
          B: "This splits the symmetric difference equally, but $A$ is two elements larger than $B$.",
          D: "This is $|A\\triangle B|$, not the one-sided difference $|A\\setminus B|$.",
        },
        misconceptionTags: {
          A: "uses_size_difference_only",
          B: "ignores_one_sided_size_difference",
          D: "returns_symmetric_difference",
        },
        hints: [
          "Convert power-set sizes into ordinary set-size equations.",
          "$|A\\cup B|-|A\\cap B|=|A\\triangle B|$.",
          "Let $x=|A\\setminus B|$ and $y=|B\\setminus A|$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The first equation gives a size difference.",
            math: L`2^{|A|}=4\cdot2^{|B|}\Rightarrow |A|-|B|=2`,
          },
          {
            step: 2,
            explanation: "The second equation gives the symmetric-difference size.",
            math: L`2^{|A\cup B|}=64\cdot2^{|A\cap B|}\Rightarrow |A\triangle B|=6`,
          },
          {
            step: 3,
            explanation: "With $x=|A\\setminus B|$ and $y=|B\\setminus A|$, solve $x-y=2$ and $x+y=6$.",
            math: L`x=4`,
          },
        ],
      },
      {
        questionLatex: L`The number of subsets S of \{1,2,\ldots,10\} having even cardinality and containing at least one of 1,2,3 is`,
        difficulty: 4,
        skillTags: ["restricted_subsets", "parity_counting"],
        choices: [L`$384$`, L`$448$`, L`$496$`, L`$512$`],
        correctLetter: "B",
        rationales: {
          A: "This subtracts too many forbidden subsets; the parity condition on the remaining seven elements gives $2^6$, not $2^7$.",
          C: "This subtracts only the empty subset from the even-cardinality count.",
          D: "This counts all even-cardinality subsets and ignores the condition involving 1,2,3.",
        },
        misconceptionTags: {
          A: "wrong_even_subset_count_after_exclusion",
          C: "under_subtracts_no_special_element_cases",
          D: "ignores_at_least_one_condition",
        },
        hints: [
          "First count all even-cardinality subsets of a 10-element set.",
          "Subtract the even-cardinality subsets that contain none of 1,2,3.",
          "If those three are absent, the subset is chosen from the remaining 7 elements.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Half of all subsets of a nonempty finite set have even size.",
            math: L`2^9=512`,
          },
          {
            step: 2,
            explanation: "With 1,2,3 absent, choose an even subset from the remaining 7 elements.",
            math: L`2^6=64`,
          },
          {
            step: 3,
            explanation: "Subtract.",
            math: L`512-64=448`,
          },
        ],
      },
      {
        questionLatex: L`Let U have 8 elements. The number of ordered pairs (A,B) of subsets of U such that A\cup B=U and A\cap B=\varnothing is`,
        difficulty: 3,
        skillTags: ["set_pair_counting", "partition_counting"],
        choices: [L`$2^8$`, L`$3^8$`, L`$2^8-2$`, L`$\binom82$`],
        correctLetter: "A",
        rationales: {
          B: "Three states would allow an element to be in both sets, but the intersection must be empty.",
          C: "Neither set is required to be nonempty, so the two extreme choices are valid.",
          D: "The elements are not split into two fixed-size blocks; each element independently chooses A or B.",
        },
        misconceptionTags: {
          B: "allows_intersection_elements",
          C: "unnecessarily_excludes_empty_part",
          D: "treats_partition_as_fixed_size_choice",
        },
        hints: [
          "The two conditions say every element lies in exactly one of A or B.",
          "For each element, choose A or B.",
          "The ordered pair matters, so these two choices are distinct.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Each of the 8 elements has exactly two allowed states.",
            math: L`2^8`,
          },
        ],
      },
      {
        questionLatex: L`If A,B,C are subsets of a universal set U, then A\cap(B\triangle C) is always equal to`,
        difficulty: 4,
        skillTags: ["set_identities", "symmetric_difference"],
        choices: [
          L`$(A\cap B)\triangle(A\cap C)$`,
          L`$(A\cup B)\triangle(A\cup C)$`,
          L`$(A\cap B)\cup(A\cap C)$`,
          L`$(A\setminus B)\triangle(A\setminus C)$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Intersection with A distributes over the membership test; union with A changes elements outside A.",
          C: "This selects elements of A that are in B or C, not exactly one of B and C.",
          D: "Using complements inside A reverses the membership test and does not preserve the same expression.",
        },
        misconceptionTags: {
          B: "uses_union_instead_of_intersection_distribution",
          C: "confuses_or_with_exclusive_or",
          D: "incorrect_complement_distribution",
        },
        hints: [
          "Translate $B\\triangle C$ as 'in exactly one of B and C'.",
          "Then also require the element to be in A.",
          "That is exactly the symmetric difference of the two intersections.",
        ],
        solution: [
          {
            step: 1,
            explanation: "An element of the left side is in A and in exactly one of B,C.",
            math: null,
          },
          {
            step: 2,
            explanation: "Equivalently, it is in exactly one of $A\\cap B$ and $A\\cap C$.",
            math: L`A\cap(B\triangle C)=(A\cap B)\triangle(A\cap C)`,
          },
        ],
      },
      {
        questionLatex: L`Let |A|=5,\ |B|=6 and |A\cap B|=2. The number of subsets of A\cup B that are not subsets of A and not subsets of B is`,
        difficulty: 4,
        skillTags: ["power_set_counting", "complement_counting"],
        choices: [L`$384$`, L`$420$`, L`$448$`, L`$512$`],
        correctLetter: "B",
        rationales: {
          A: "This subtracts subsets of A and subsets of B but forgets to add back subsets of $A\\cap B$.",
          C: "This uses an incorrect forbidden-family adjustment after finding the union.",
          D: "This counts all subsets of the union and ignores the two forbidden families.",
        },
        misconceptionTags: {
          A: "inclusion_exclusion_missing_addback",
          C: "incorrect_forbidden_family_adjustment",
          D: "ignores_not_subset_conditions",
        },
        hints: [
          "First find $|A\\cup B|$.",
          "Subtract subsets lying wholly inside A or wholly inside B.",
          "Subsets of $A\\cap B$ were subtracted twice.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The union has 9 elements.",
            math: L`|A\cup B|=5+6-2=9`,
          },
          {
            step: 2,
            explanation: "Use inclusion-exclusion on the forbidden subset families.",
            math: L`2^9-2^5-2^6+2^2=512-32-64+4=420`,
          },
        ],
      },
    ],
    numeric: [
      {
        questionLatex: L`Let U=\{1,2,\ldots,100\}. Let A,B,C be the sets of multiples of 2,3,5 respectively. Find the number of elements of U that belong to exactly two of A,B,C.`,
        difficulty: 4,
        skillTags: ["exactly_two_counting", "multiples_inclusion_exclusion"],
        promptMarkdown: "Enter the number of such elements.",
        numericAnswer: 23,
        hints: [
          "Compute $|A\\cap B|$, $|B\\cap C|$, $|C\\cap A|$, and $|A\\cap B\\cap C|$.",
          "Exactly two from a pair means subtract the triple intersection from that pair.",
          "Add the three pair-only counts.",
        ],
        rubric: [
          "Finds the pairwise and triple multiple counts correctly.",
          "Subtracts the triple intersection from each pair and gives the final count.",
        ],
        commonErrors: [
          "Using $|A\\cap B|+|B\\cap C|+|C\\cap A|-|A\\cap B\\cap C|$, which counts triple elements twice.",
          "Counting multiples of 30 as exactly two-set elements.",
        ],
        solution:
          "The pairwise counts are $\\lfloor100/6\\rfloor=16$, $\\lfloor100/10\\rfloor=10$, and $\\lfloor100/15\\rfloor=6$. The triple count is $\\lfloor100/30\\rfloor=3$. Therefore exactly two equals $(16-3)+(10-3)+(6-3)=23$.",
      },
      {
        questionLatex: L`A set X has 12 elements and T\subset X has 5 elements. How many subsets S of X satisfy |S\cap T|=3 and |S\setminus T|\ge 2?`,
        difficulty: 4,
        skillTags: ["restricted_subsets", "combination_counting"],
        promptMarkdown: "Enter the number of subsets.",
        numericAnswer: 1200,
        hints: [
          "First choose the 3 elements from the fixed 5-element set.",
          "From the remaining 7 elements, choose at least 2.",
          "Use complement counting for the phrase at least 2.",
        ],
        rubric: [
          "Separates the fixed subset part from the remaining seven elements.",
          "Counts the at-least-two condition and multiplies the independent choices.",
        ],
        commonErrors: [
          "Choosing exactly 2 from the remaining 7 instead of at least 2.",
          "Adding the two choices instead of multiplying independent choices.",
        ],
        solution:
          "Choose $3$ from $T$ in $\\binom53=10$ ways. From the other 7 elements, all subsets except sizes 0 and 1 are allowed, giving $2^7-1-7=120$ choices. Hence the answer is $10\\cdot120=1200$.",
      },
      {
        questionLatex: L`For three sets A,B,C, suppose |A\cup B\cup C|=40. Exactly 18 elements belong to exactly one of the sets, and exactly 15 elements belong to exactly two of the sets. Find |A\cap B\cap C|.`,
        difficulty: 3,
        skillTags: ["venn_partition", "three_set_counting"],
        promptMarkdown: "Enter the value of $|A\\cap B\\cap C|$.",
        numericAnswer: 7,
        hints: [
          "Partition the union into exactly-one, exactly-two, and exactly-three regions.",
          "The exactly-three region is $A\\cap B\\cap C$.",
          "The three partition counts must add to $40$.",
        ],
        rubric: [
          "Uses the disjoint partition of the union.",
          "Solves for the triple intersection.",
        ],
        commonErrors: [
          "Applying the inclusion-exclusion formula when the stem already gives partition counts.",
          "Subtracting the exactly-two count twice.",
        ],
        solution:
          "The union is partitioned into exactly one, exactly two, and exactly three. Hence $40=18+15+|A\\cap B\\cap C|$, so $|A\\cap B\\cap C|=7$.",
      },
      {
        questionLatex: L`If |{\cal P}(A\cap B)|=16,\ |{\cal P}(A\cup B)|=1024, and |A\setminus B|=3, find |B\setminus A|.`,
        difficulty: 4,
        skillTags: ["power_set_cardinality", "set_partition"],
        promptMarkdown: "Enter the value of $|B\\setminus A|$.",
        numericAnswer: 3,
        hints: [
          "Convert $16$ and $1024$ into powers of $2$.",
          "Use the three disjoint regions inside $A\\cup B$.",
          "$|A\\cup B|=|A\\setminus B|+|A\\cap B|+|B\\setminus A|$.",
        ],
        rubric: [
          "Converts power-set sizes to ordinary set sizes.",
          "Uses the union partition to get the missing region.",
        ],
        commonErrors: [
          "Using $16$ as $|A\\cap B|$ instead of $4$.",
          "Using the inclusion-exclusion formula without identifying the three disjoint regions.",
        ],
        solution:
          "$|A\\cap B|=4$ and $|A\\cup B|=10$. Since $A\\cup B$ splits as $(A\\setminus B)\\cup(A\\cap B)\\cup(B\\setminus A)$, we get $10=3+4+|B\\setminus A|$. Thus $|B\\setminus A|=3$.",
      },
      {
        questionLatex: L`Let X=\{1,2,\ldots,6\}. Find the number of ordered pairs (A,B) of subsets of X such that A\subseteq B and |B\setminus A|=2.`,
        difficulty: 5,
        skillTags: ["ordered_subset_pairs", "state_counting"],
        promptMarkdown: "Enter the number of ordered pairs.",
        numericAnswer: 240,
        hints: [
          "Each element has a state relative to the ordered pair $(A,B)$.",
          "Exactly two elements must be in $B\\setminus A$.",
          "Every other element is either outside $B$ or in both $A$ and $B$.",
        ],
        rubric: [
          "Chooses the two elements in $B\\setminus A$.",
          "Counts the two possible states for every remaining element.",
        ],
        commonErrors: [
          "Counting unordered pairs of subsets instead of ordered pairs.",
          "Allowing an element to be in $A$ but not in $B$, which violates $A\\subseteq B$.",
        ],
        solution:
          "Choose the two elements in $B\\setminus A$ in $\\binom62=15$ ways. Each of the other four elements has two allowed states: outside $B$, or inside both $A$ and $B$. Hence the count is $\\binom62\\cdot2^4=15\\cdot16=240$.",
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Relations and Equivalence Relations",
    subtopic:
      "Reflexive, symmetric, transitive, anti-symmetric, and equivalence-class reasoning.",
    mc: [
      {
        questionLatex: L`On A=\{1,2,3,4\}, define a relation R by aRb if and only if a divides b or b divides a. Which option correctly describes R?`,
        difficulty: 4,
        skillTags: ["relation_properties", "transitivity_counterexample"],
        choices: [
          "Reflexive and symmetric, but not transitive",
          "Reflexive and transitive, but not symmetric",
          "Symmetric and transitive, but not reflexive",
          "An equivalence relation",
        ],
        correctLetter: "A",
        rationales: {
          B: "The condition is symmetric because it explicitly says 'or' in both divisibility directions.",
          C: "Every element divides itself, so reflexivity is not the issue.",
          D: "Transitivity fails: $2R1$ and $1R3$, but $2$ and $3$ are not related.",
        },
        misconceptionTags: {
          B: "misses_or_symmetry",
          C: "misses_reflexive_self_divisibility",
          D: "assumes_comparability_is_transitive",
        },
        hints: [
          "Test the three properties one at a time.",
          "The word 'or' makes the relation easier to check for symmetry.",
          "For transitivity, try passing through 1.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Reflexivity holds because every element divides itself.",
            math: L`a\mid a`,
          },
          {
            step: 2,
            explanation:
              "Symmetry holds because the definition already allows either divisibility direction.",
            math: null,
          },
          {
            step: 3,
            explanation:
              "Transitivity fails: 2 is related to 1 and 1 is related to 3, but 2 and 3 are not related.",
            math: L`2R1,\ 1R3,\ \text{but }2\not R3`,
          },
        ],
      },
      {
        questionLatex: L`On A=\{1,2,3,4,5\}, define xRy if and only if x+y is even. Then R is`,
        difficulty: 3,
        skillTags: ["equivalence_relation", "parity_classes"],
        choices: [
          "Not reflexive but symmetric",
          "Reflexive and symmetric but not transitive",
          "An equivalence relation with two equivalence classes",
          "An equivalence relation with five equivalence classes",
        ],
        correctLetter: "C",
        rationales: {
          A: "For every $x$, $x+x=2x$ is even, so the relation is reflexive.",
          B: "Same parity is transitive: if $x$ has the same parity as $y$ and $y$ as $z$, then $x$ and $z$ have the same parity.",
          D: "Elements are not isolated; all odd elements form one class and all even elements form another.",
        },
        misconceptionTags: {
          A: "misses_reflexivity_from_even_double",
          B: "does_not_translate_to_same_parity",
          D: "confuses_classes_with_elements",
        },
        hints: [
          "The condition $x+y$ even means $x$ and $y$ have the same parity.",
          "Check whether same parity is reflexive, symmetric, and transitive.",
          "Equivalence classes collect elements of the same parity.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$x+y$ is even exactly when $x$ and $y$ have the same parity.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "Same parity is reflexive, symmetric, and transitive.",
            math: null,
          },
          {
            step: 3,
            explanation: "The equivalence classes are odd and even.",
            math: L`\{1,3,5\},\quad \{2,4\}`,
          },
        ],
      },
      {
        questionLatex: L`Let R be the relation on \{1,2,3,4,5,6\} defined by aRb if and only if \gcd(a,b)>1. Which statement is true?`,
        difficulty: 4,
        skillTags: ["relation_properties", "gcd_relation"],
        choices: [
          "R is reflexive and symmetric but not transitive",
          "R is symmetric but neither reflexive nor transitive",
          "R is symmetric and transitive but not reflexive",
          "R is an equivalence relation",
        ],
        correctLetter: "B",
        rationales: {
          A: "Reflexivity fails at $1$, because $\\gcd(1,1)=1$.",
          C: "Transitivity fails, for example through 6 between 2 and 3.",
          D: "It fails reflexivity and transitivity, so it cannot be an equivalence relation.",
        },
        misconceptionTags: {
          A: "forgets_element_one",
          C: "assumes_common_factor_chains_transitive",
          D: "equivalence_without_checking_all_properties",
        },
        hints: [
          "Symmetry is usually easy for gcd.",
          "Always test reflexivity at every element of the given set.",
          "For transitivity, try $2,6,3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Symmetry holds because gcd is symmetric.",
            math: L`\gcd(a,b)=\gcd(b,a)`,
          },
          {
            step: 2,
            explanation: "Reflexivity fails for 1.",
            math: L`\gcd(1,1)=1`,
          },
          {
            step: 3,
            explanation: "Transitivity also fails.",
            math: L`2R6,\ 6R3,\ \text{but }2\not R3`,
          },
        ],
      },
      {
        questionLatex: L`The number of symmetric relations on a 4-element set that are not reflexive is`,
        difficulty: 5,
        skillTags: ["counting_relations", "symmetric_relations"],
        choices: [L`$64$`, L`$512$`, L`$960$`, L`$1024$`],
        correctLetter: "C",
        rationales: {
          A: "This counts reflexive symmetric relations only, not all symmetric relations that fail reflexivity.",
          B: "This misses one diagonal choice; the diagonal entries are independently optional in a symmetric relation.",
          D: "This counts all symmetric relations, including the reflexive ones.",
        },
        misconceptionTags: {
          A: "counts_reflexive_case",
          B: "drops_diagonal_options",
          D: "does_not_exclude_reflexive_relations",
        },
        hints: [
          "A symmetric relation is determined by diagonal entries and unordered off-diagonal pairs.",
          "For 4 elements there are 4 diagonal choices and $\\binom42=6$ off-diagonal pairs.",
          "Subtract the reflexive symmetric relations.",
        ],
        solution: [
          {
            step: 1,
            explanation: "All symmetric relations on four elements:",
            math: L`2^4\cdot 2^{\binom42}=2^{10}=1024`,
          },
          {
            step: 2,
            explanation:
              "Reflexive symmetric relations have all diagonal entries forced and six off-diagonal pair choices.",
            math: L`2^6=64`,
          },
          {
            step: 3,
            explanation: "Subtract the reflexive ones.",
            math: L`1024-64=960`,
          },
        ],
      },
      {
        questionLatex: L`Let R on integers be defined by aRb if and only if a-b is divisible by 6. Restricted to \{1,2,\ldots,100\}, the number of equivalence classes represented is`,
        difficulty: 3,
        skillTags: ["modular_equivalence", "equivalence_classes"],
        choices: [L`$4$`, L`$5$`, L`$6$`, L`$100$`],
        correctLetter: "C",
        rationales: {
          A: "There are six residue classes modulo 6, not four; divisibility by 6 is the classifier.",
          B: "The set starts at 1, but the residue 0 class is represented by 6,12,18,...",
          D: "Elements with the same remainder modulo 6 are equivalent, so they are not all separate.",
        },
        misconceptionTags: {
          A: "uses_wrong_modulus",
          B: "drops_zero_residue_class",
          D: "confuses_elements_with_classes",
        },
        hints: [
          "$a-b$ divisible by 6 means $a$ and $b$ have the same remainder modulo 6.",
          "Check which remainders appear from 1 to 100.",
          "Every remainder modulo 6 appears.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The relation partitions integers by their remainders modulo 6.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "The set $\\{1,2,\\ldots,100\\}$ contains representatives of all six remainders.",
            math: L`0,1,2,3,4,5 \pmod 6`,
          },
        ],
      },
      {
        questionLatex: L`The number of reflexive and symmetric relations on a 3-element set that are not transitive is`,
        difficulty: 5,
        skillTags: ["relation_counting", "transitivity"],
        choices: [L`$2$`, L`$3$`, L`$4$`, L`$5$`],
        correctLetter: "B",
        rationales: {
          A: "This misses one non-transitive chain among the three possible two-edge symmetric graphs.",
          C: "This subtracts only the universal equivalence relation and forgets the other equivalence partitions.",
          D: "This counts equivalence relations, not the non-transitive cases.",
        },
        misconceptionTags: {
          A: "under_counts_nontransitive_symmetric_graphs",
          C: "subtracts_wrong_transitive_count",
          D: "returns_equivalence_relation_count",
        },
        hints: [
          "A reflexive symmetric relation is determined by the three unordered off-diagonal pairs.",
          "There are $2^3$ such relations.",
          "The transitive ones are exactly the equivalence relations on a 3-element set.",
        ],
        solution: [
          { step: 1, explanation: "All reflexive symmetric relations:", math: L`2^{\binom32}=8` },
          { step: 2, explanation: "The transitive cases are equivalence relations, i.e. partitions of a 3-element set.", math: L`5` },
          { step: 3, explanation: "Subtract transitive cases.", math: L`8-5=3` },
        ],
      },
      {
        questionLatex: L`On X=\{0,1,2,\ldots,9\}, define aRb if and only if a^2\equiv b^2\pmod 5. Then |R| is`,
        difficulty: 5,
        skillTags: ["modular_equivalence", "relation_cardinality"],
        choices: [L`$20$`, L`$28$`, L`$36$`, L`$40$`],
        correctLetter: "C",
        rationales: {
          A: "This counts only equal residues modulo 5, but equal squares also pair opposite residues.",
          B: "This uses incorrect class sizes instead of grouping by square residue modulo 5.",
          D: "This overstates the nonzero square classes.",
        },
        misconceptionTags: {
          A: "confuses_same_residue_with_same_square",
          B: "incorrect_class_sizes",
          D: "overstates_nonzero_square_classes",
        },
        hints: [
          "Group elements by the value of $a^2$ modulo 5.",
          "The classes have residues $0$, $\\pm1$, and $\\pm2$ modulo 5.",
          "For an equivalence relation, $|R|$ is the sum of squares of class sizes.",
        ],
        solution: [
          { step: 1, explanation: "The classes in $X$ have sizes 2, 4, and 4.", math: L`\{0,5\},\ \{1,4,6,9\},\ \{2,3,7,8\}` },
          { step: 2, explanation: "Count ordered pairs inside each class.", math: L`2^2+4^2+4^2=36` },
        ],
      },
      {
        questionLatex: L`Let R=\{(1,1),(2,2),(3,3),(1,2),(2,3)\} on A=\{1,2,3\}. The minimum number of ordered pairs that must be added to make R reflexive and transitive is`,
        difficulty: 4,
        skillTags: ["transitive_closure", "relation_repair"],
        choices: [L`$0$`, L`$1$`, L`$2$`, L`$3$`],
        correctLetter: "B",
        rationales: {
          A: "Transitivity fails because $(1,2)$ and $(2,3)$ force $(1,3)$.",
          C: "Symmetry is not required, so reverse-direction pairs need not be added.",
          D: "The relation is already reflexive, so only the transitive consequence is missing.",
        },
        misconceptionTags: {
          A: "misses_transitive_forcing",
          C: "adds_symmetry_unnecessarily",
          D: "adds_reflexive_pairs_already_present",
        },
        hints: [
          "Check reflexivity first.",
          "Transitivity says $(a,b)$ and $(b,c)$ force $(a,c)$.",
          "The only nontrivial chain is $1R2$ and $2R3$.",
        ],
        solution: [
          { step: 1, explanation: "All diagonal pairs are already present.", math: null },
          { step: 2, explanation: "The chain $(1,2),(2,3)$ forces $(1,3)$.", math: L`(1,3)` },
        ],
      },
      {
        questionLatex: L`On A=\{1,2,3,4\}, define aRb if and only if a=b or a+b=5. Which statement is correct?`,
        difficulty: 4,
        skillTags: ["equivalence_relation", "relation_properties"],
        choices: [
          "R is reflexive and symmetric but not transitive",
          "R is an equivalence relation with two classes",
          "R is symmetric and transitive but not reflexive",
          "R is anti-symmetric but not symmetric",
        ],
        correctLetter: "B",
        rationales: {
          A: "Transitivity holds within the two forced pairs $\\{1,4\\}$ and $\\{2,3\\}$.",
          C: "Every element is related to itself because the definition includes $a=b$.",
          D: "The relation is symmetric: if $a+b=5$, then $b+a=5$.",
        },
        misconceptionTags: {
          A: "misses_two_element_equivalence_classes",
          C: "misses_reflexive_clause",
          D: "confuses_symmetric_with_antisymmetric",
        },
        hints: [
          "List the classes produced by the condition $a+b=5$.",
          "The relation also includes all diagonal pairs.",
          "Check whether any relation ever leaves the pair it starts in.",
        ],
        solution: [
          { step: 1, explanation: "The relation groups 1 with 4 and 2 with 3.", math: L`\{1,4\},\quad \{2,3\}` },
          { step: 2, explanation: "These two blocks define an equivalence relation.", math: null },
        ],
      },
      {
        questionLatex: L`The number of relations on a 2-element set that are both symmetric and anti-symmetric is`,
        difficulty: 4,
        skillTags: ["relation_counting", "symmetric_antisymmetric"],
        choices: [L`$2$`, L`$4$`, L`$6$`, L`$8$`],
        correctLetter: "B",
        rationales: {
          A: "This ties the two diagonal choices together, but they are independent.",
          C: "This allows exactly one off-diagonal direction, which violates symmetry.",
          D: "This counts all symmetric relations, including the one containing both off-diagonal pairs.",
        },
        misconceptionTags: {
          A: "ties_diagonal_choices_together",
          C: "allows_asymmetric_off_diagonal_pair",
          D: "forgets_antisymmetry_restriction",
        },
        hints: [
          "Diagonal pairs never violate either condition.",
          "For distinct elements, symmetry would require both directions together.",
          "Anti-symmetry forbids both directions for distinct elements.",
        ],
        solution: [
          { step: 1, explanation: "No off-diagonal pair can be present.", math: null },
          { step: 2, explanation: "Each of the two diagonal pairs may be chosen independently.", math: L`2^2=4` },
        ],
      },
    ],
    numeric: [
      {
        questionLatex: L`Find the number of equivalence relations on A=\{1,2,3,4\} having exactly two equivalence classes.`,
        difficulty: 4,
        skillTags: ["equivalence_relations", "set_partitions"],
        promptMarkdown: "Enter the number of such equivalence relations.",
        numericAnswer: 7,
        hints: [
          "Equivalence relations on a set are the same as partitions of that set.",
          "Exactly two equivalence classes means a partition into two nonempty blocks.",
          "Count all nonempty proper subsets but remember that a block and its complement define the same partition.",
        ],
        rubric: [
          "Connects equivalence relations to partitions.",
          "Counts two-block partitions without double-counting complementary blocks.",
        ],
        commonErrors: [
          "Counting ordered pairs of classes instead of unordered partitions.",
          "Including the empty block or the whole set as one of the two classes.",
        ],
        solution:
          "A two-class equivalence relation is a partition of the 4-element set into two nonempty blocks. Choose a nonempty proper block in $2^4-2=14$ ways, then divide by 2 because each partition is counted by either block. The answer is $14/2=7$.",
      },
      {
        questionLatex: L`On A=\{1,2,\ldots,9\}, define aRb if and only if |a-b| is divisible by 3. Find the product of the sizes of all equivalence classes.`,
        difficulty: 3,
        skillTags: ["modular_classes", "class_size_counting"],
        promptMarkdown: "Enter the product.",
        numericAnswer: 27,
        hints: [
          "The relation groups numbers by their remainder modulo 3.",
          "List the three residue classes inside $1$ to $9$.",
          "Multiply their sizes.",
        ],
        rubric: [
          "Identifies the modulo 3 equivalence classes.",
          "Computes and multiplies the class sizes.",
        ],
        commonErrors: [
          "Reporting the number of classes instead of the product of their sizes.",
          "Treating 9 as residue 3 instead of residue 0 modulo 3.",
        ],
        solution:
          "The classes are $\\{1,4,7\\}$, $\\{2,5,8\\}$, and $\\{3,6,9\\}$. Each has size 3, so the product is $3\\cdot3\\cdot3=27$.",
      },
      {
        questionLatex: L`On A=\{1,2,3\}, let R=\{(1,1),(2,2),(3,3),(1,2),(2,1),(2,3),(3,2)\}. What is the minimum number of ordered pairs that must be added to make R an equivalence relation?`,
        difficulty: 4,
        skillTags: ["equivalence_closure", "transitive_closure"],
        figure: relationGraphFigure,
        promptMarkdown: "Enter the minimum number of ordered pairs.",
        numericAnswer: 2,
        hints: [
          "The relation is already reflexive and symmetric.",
          "Because $1$ is related to $2$ and $2$ to $3$, transitivity forces $1$ and $3$ to be related.",
          "Symmetry then forces both directions.",
        ],
        rubric: [
          "Recognizes that reflexivity and symmetry are already present.",
          "Adds exactly the missing transitive/symmetric forced pairs.",
        ],
        commonErrors: [
          "Adding only $(1,3)$ and forgetting $(3,1)$.",
          "Adding all nine pairs without noticing only two are missing.",
        ],
        solution:
          "The given relation already contains all three diagonal pairs and is symmetric. Since $(1,2)$ and $(2,3)$ are in $R$, transitivity requires $(1,3)$. By symmetry, $(3,1)$ is also needed. These two additions make the relation universal on $A$, hence an equivalence relation. The answer is $2$.",
      },
      {
        questionLatex: L`Find the number of anti-symmetric relations on a 3-element set.`,
        difficulty: 5,
        skillTags: ["antisymmetric_relation_counting"],
        promptMarkdown: "Enter the number of anti-symmetric relations.",
        numericAnswer: 216,
        hints: [
          "Diagonal ordered pairs never violate anti-symmetry.",
          "For each unordered pair of distinct elements, you may choose neither direction, the first direction, or the reverse direction.",
          "There are $3$ diagonal choices and $\\binom32$ unordered off-diagonal pairs.",
        ],
        rubric: [
          "Counts diagonal choices independently.",
          "Uses three choices for each unordered off-diagonal pair.",
        ],
        commonErrors: [
          "Forcing all diagonal pairs to be present, which is reflexivity, not anti-symmetry.",
          "Allowing both directions for a distinct pair.",
        ],
        solution:
          "Each diagonal pair may be included or not, giving $2^3$ choices. For each of the $\\binom32=3$ unordered distinct pairs, the allowed choices are neither direction, one direction, or the other direction: 3 choices. Total $2^3\\cdot3^3=216$.",
      },
      {
        questionLatex: L`Let A=\{1,2,\ldots,10\}. Define aRb if and only if a+b is even. Find the number of ordered pairs in R.`,
        difficulty: 3,
        skillTags: ["relation_cardinality", "parity_counting"],
        promptMarkdown: "Enter $|R|$.",
        numericAnswer: 50,
        hints: [
          "$a+b$ is even when $a,b$ have the same parity.",
          "Count odd-odd ordered pairs and even-even ordered pairs.",
          "There are five odds and five evens from 1 to 10.",
        ],
        rubric: [
          "Splits the count into odd-odd and even-even ordered pairs.",
          "Adds both ordered-pair counts.",
        ],
        commonErrors: [
          "Counting unordered pairs instead of ordered pairs.",
          "Including odd-even pairs.",
        ],
        solution:
          "There are 5 odd and 5 even numbers. The valid ordered pairs are odd-odd or even-even, so $|R|=5^2+5^2=50$.",
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Functions: Domain, Range, and Injectivity",
    subtopic:
      "Function counts, range restrictions, one-one tests, and domain/range traps.",
    mc: [
      {
        questionLatex: L`Let f:[a,\infty)\to\mathbb R be defined by f(x)=x^2-4x+k. For which values of a is f one-one for every real k?`,
        difficulty: 4,
        skillTags: ["injectivity_on_interval", "quadratic_monotonicity"],
        choices: [L`$a\ge 2$`, L`$a>0$`, L`$a\le 2$`, L`$a\in\mathbb R$`],
        correctLetter: "A",
        rationales: {
          B: "The interval $[a,\\infty)$ can still contain both sides of the vertex if $0<a<2$.",
          C: "For $a<2$, the interval contains points on both sides of the vertex, producing repeated values.",
          D: "A quadratic is not one-one on every right ray; the vertex position matters.",
        },
        misconceptionTags: {
          B: "uses_positive_endpoint_instead_of_vertex",
          C: "reverses_monotonic_interval",
          D: "ignores_quadratic_symmetry",
        },
        hints: [
          "Complete the square.",
          "The graph changes direction at its vertex.",
          "A right ray must start at or to the right of the vertex for the quadratic to be one-one.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Complete the square.",
            math: L`f(x)=(x-2)^2+(k-4)`,
          },
          {
            step: 2,
            explanation:
              "The quadratic is decreasing on $(-\\infty,2]$ and increasing on $[2,\\infty)$.",
            math: null,
          },
          {
            step: 3,
            explanation:
              "The interval $[a,\\infty)$ must not include both sides of the vertex.",
            math: L`a\ge 2`,
          },
        ],
      },
      {
        questionLatex: L`The number of onto functions from a 4-element set to a 3-element set is`,
        difficulty: 4,
        skillTags: ["onto_function_counting", "inclusion_exclusion"],
        choices: [L`$24$`, L`$36$`, L`$48$`, L`$81$`],
        correctLetter: "B",
        rationales: {
          A: "This undercounts by treating the fibre sizes as only $2,1,1$ with a fixed repeated target but missing target choices.",
          C: "This subtracts functions missing one target but does not add back functions missing two targets.",
          D: "This counts all functions, not just onto functions.",
        },
        misconceptionTags: {
          A: "incomplete_fibre_case_count",
          C: "inclusion_exclusion_missing_addback",
          D: "counts_all_functions",
        },
        hints: [
          "Start with all functions from 4 elements to 3 elements.",
          "Subtract functions that miss at least one codomain element.",
          "Use inclusion-exclusion over the missed codomain elements.",
        ],
        solution: [
          {
            step: 1,
            explanation: "All functions:",
            math: L`3^4=81`,
          },
          {
            step: 2,
            explanation: "Subtract those missing a fixed target, and add back those missing two targets.",
            math: L`3^4-\binom31 2^4+\binom32 1^4=81-48+3=36`,
          },
        ],
      },
      {
        questionLatex: L`Let f:\mathbb R\setminus\{1\}\to\mathbb R\setminus\{2\} be defined by f(x)=\dfrac{2x+3}{x-1}. Then f is`,
        difficulty: 4,
        skillTags: ["bijection_test", "rational_function_range"],
        choices: [
          "one-one but not onto",
          "onto but not one-one",
          "both one-one and onto",
          "neither one-one nor onto",
        ],
        correctLetter: "C",
        rationales: {
          A: "Solving $y=f(x)$ gives a valid preimage for every $y\\ne2$, so onto does hold.",
          B: "A nonconstant fractional linear function is one-one on its natural domain; solving $f(x_1)=f(x_2)$ also forces $x_1=x_2$.",
          D: "Both checks pass once the excluded values $x=1$ and $y=2$ are handled.",
        },
        misconceptionTags: {
          A: "misses_surjectivity_after_solving",
          B: "assumes_rational_functions_are_not_injective",
          D: "ignores_domain_codomain_exclusions",
        },
        hints: [
          "Set $y=\\frac{2x+3}{x-1}$ and solve for $x$.",
          "The only forbidden output is already removed from the codomain.",
          "Check that the solved preimage is never the forbidden input $1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Solve for x in terms of y.",
            math: L`y=\frac{2x+3}{x-1}\Rightarrow x=\frac{y+3}{y-2}`,
          },
          {
            step: 2,
            explanation:
              "For every $y\\ne2$, this preimage exists and is not equal to 1.",
            math: L`\frac{y+3}{y-2}\ne 1`,
          },
          {
            step: 3,
            explanation: "The solved preimage is unique, so the function is bijective.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`For f(x)=|x-1|+|x+1| with domain \mathbb R, the range of f is`,
        difficulty: 3,
        skillTags: ["absolute_value_range", "piecewise_functions"],
        choices: [L`$[0,\infty)$`, L`$[1,\infty)$`, L`$[2,\infty)$`, L`$(2,\infty)$`],
        correctLetter: "C",
        rationales: {
          A: "The sum is the distance from $x$ to $1$ plus the distance from $x$ to $-1$; it cannot be below 2.",
          B: "The minimum distance sum between the two fixed points is 2, not 1.",
          D: "The value 2 is attained for every $x\\in[-1,1]$.",
        },
        misconceptionTags: {
          A: "ignores_geometric_distance_minimum",
          B: "misreads_distance_between_endpoints",
          D: "drops_attained_endpoint",
        },
        hints: [
          "Interpret the expression as a sum of distances on the number line.",
          "Between $-1$ and $1$, the two distances add to the distance between the endpoints.",
          "Outside that interval, the sum grows.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For $-1\\le x\\le1$, the sum of distances to $-1$ and $1$ is 2.",
            math: L`|x-1|+|x+1|=2`,
          },
          {
            step: 2,
            explanation: "Outside this interval the sum is larger than 2.",
            math: L`\operatorname{Range}(f)=[2,\infty)`,
          },
        ],
      },
      {
        questionLatex: L`Let f:\{1,2,3,4,5\}\to\{1,2,3\} be onto and suppose |f^{-1}(1)|=3. The number of such functions is`,
        difficulty: 4,
        skillTags: ["onto_function_counting", "preimage_size"],
        figure: functionMappingFigure,
        choices: [L`$10$`, L`$20$`, L`$30$`, L`$60$`],
        correctLetter: "B",
        rationales: {
          A: "This chooses the three elements mapping to 1 but forgets that the remaining two can be assigned to 2 and 3 in two orders.",
          C: "This lets one of the remaining elements still map to 1, contradicting $|f^{-1}(1)|=3$.",
          D: "This counts assignments where the function may fail to hit either 2 or 3.",
        },
        misconceptionTags: {
          A: "misses_ordering_remaining_targets",
          C: "violates_fixed_preimage_size",
          D: "does_not_enforce_onto_after_fixed_fibre",
        },
        hints: [
          "First choose which three domain elements map to 1.",
          "The remaining two domain elements must hit both 2 and 3.",
          "There are exactly two assignments for the last two elements.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Choose the preimage of 1.",
            math: L`\binom53=10`,
          },
          {
            step: 2,
            explanation:
              "The remaining two elements must map to 2 and 3 in either order.",
            math: L`2!=2`,
          },
          {
            step: 3,
            explanation: "Multiply.",
            math: L`10\cdot2=20`,
          },
        ],
      },
      {
        questionLatex: L`The number of functions f:\{1,2,3,4\}\to\{1,2,3,4\} having exactly two fixed points is`,
        difficulty: 4,
        skillTags: ["fixed_points", "function_counting"],
        choices: [L`$36$`, L`$54$`, L`$72$`, L`$81$`],
        correctLetter: "B",
        rationales: {
          A: "This undercounts the images of the two non-fixed elements; each has three choices, not two.",
          C: "This counts some functions with more than two fixed points.",
          D: "This fixes which two points are fixed but forgets to choose the fixed-point set.",
        },
        misconceptionTags: {
          A: "under_counts_nonfixed_images",
          C: "does_not_exclude_extra_fixed_points",
          D: "misses_choice_of_fixed_points",
        },
        hints: [
          "Choose the two elements that are fixed.",
          "Each remaining element can map to any value except itself.",
          "The two remaining choices are independent.",
        ],
        solution: [
          { step: 1, explanation: "Choose the fixed points.", math: L`\binom42=6` },
          { step: 2, explanation: "Each of the other two elements has 3 possible images.", math: L`3^2` },
          { step: 3, explanation: "Multiply.", math: L`6\cdot9=54` },
        ],
      },
      {
        questionLatex: L`Let |A|=4 and |B|=3. The number of functions f:A\to B whose range has exactly two elements is`,
        difficulty: 4,
        skillTags: ["range_size_counting", "onto_to_subset"],
        choices: [L`$36$`, L`$42$`, L`$48$`, L`$54$`],
        correctLetter: "B",
        rationales: {
          A: "This misses the onto count to the chosen two-element range.",
          C: "This counts a fibre pattern as ordered more times than it should.",
          D: "This overcounts by allowing assignments using all three codomain elements.",
        },
        misconceptionTags: {
          A: "incorrect_onto_to_two_count",
          C: "overorders_fibre_pattern",
          D: "does_not_enforce_exact_range_size",
        },
        hints: [
          "Choose the two elements of B that appear.",
          "For a fixed two-element range, count onto functions from 4 elements to 2 elements.",
          "Subtract the two constant functions.",
        ],
        solution: [
          { step: 1, explanation: "Choose the two-element range.", math: L`\binom32=3` },
          { step: 2, explanation: "Onto maps to a fixed two-element set:", math: L`2^4-2=14` },
          { step: 3, explanation: "Multiply.", math: L`3\cdot14=42` },
        ],
      },
      {
        questionLatex: L`Let |A|=3 and |B|=5. The number of functions from A to B that are not one-one is`,
        difficulty: 4,
        skillTags: ["injective_function_counting", "complement_counting"],
        choices: [L`$55$`, L`$60$`, L`$65$`, L`$75$`],
        correctLetter: "C",
        rationales: {
          A: "This subtracts the wrong injective count from $5^3$.",
          B: "This is the number of one-one functions, not the non-one-one functions.",
          D: "This treats all repeated-image choices as if exactly one pair must collide.",
        },
        misconceptionTags: {
          A: "wrong_injective_count",
          B: "returns_complement_count",
          D: "counts_only_one_collision_pattern",
        },
        hints: [
          "Count all functions first.",
          "Subtract the one-one functions.",
          "A one-one function chooses distinct images in order.",
        ],
        solution: [
          { step: 1, explanation: "All functions:", math: L`5^3=125` },
          { step: 2, explanation: "One-one functions:", math: L`{}^5P_3=5\cdot4\cdot3=60` },
          { step: 3, explanation: "Subtract.", math: L`125-60=65` },
        ],
      },
      {
        questionLatex: L`The range of f:[1,\infty)\to\mathbb R defined by f(x)=x^2-2x+3 is`,
        difficulty: 3,
        skillTags: ["quadratic_range", "domain_restriction"],
        choices: [L`$[0,\infty)$`, L`$[1,\infty)$`, L`$[2,\infty)$`, L`$\mathbb R$`],
        correctLetter: "C",
        rationales: {
          A: "The vertex value is 2, not 0.",
          B: "This is the minimum of $(x-1)^2+1$, but the completed square here has constant 2.",
          D: "The restricted quadratic is bounded below.",
        },
        misconceptionTags: {
          A: "incorrect_vertex_value",
          B: "completion_square_constant_error",
          D: "ignores_lower_bound",
        },
        hints: [
          "Complete the square.",
          "The domain starts exactly at the vertex.",
          "Read the least value from the completed square form.",
        ],
        solution: [
          { step: 1, explanation: "Complete the square.", math: L`f(x)=(x-1)^2+2` },
          { step: 2, explanation: "On $[1,\\infty)$ the square term is at least 0.", math: L`\operatorname{Range}(f)=[2,\infty)` },
        ],
      },
      {
        questionLatex: L`Let f:\mathbb R\setminus\{-2\}\to\mathbb R\setminus\{3\} be defined by f(x)=\dfrac{3x+1}{x+2}. Then f is`,
        difficulty: 4,
        skillTags: ["bijection_test", "rational_function_range"],
        choices: [
          "one-one but not onto",
          "onto but not one-one",
          "both one-one and onto",
          "neither one-one nor onto",
        ],
        correctLetter: "C",
        rationales: {
          A: "Solving $y=f(x)$ gives a valid preimage for every $y\\ne3$.",
          B: "The equation $f(x_1)=f(x_2)$ forces $x_1=x_2$ on the domain.",
          D: "Both the excluded input and excluded output have been handled in the domain and codomain.",
        },
        misconceptionTags: {
          A: "misses_surjectivity_after_excluding_output",
          B: "assumes_rational_function_not_injective",
          D: "ignores_domain_codomain_alignment",
        },
        hints: [
          "Set $y=\\frac{3x+1}{x+2}$ and solve for $x$.",
          "The forbidden output is $3$.",
          "Check uniqueness of the preimage.",
        ],
        solution: [
          { step: 1, explanation: "Solve for $x$.", math: L`y=\frac{3x+1}{x+2}\Rightarrow x=\frac{1-2y}{y-3}` },
          { step: 2, explanation: "This exists uniquely for each $y\\ne3$ and never equals $-2$.", math: null },
        ],
      },
    ],
    numeric: [
      {
        questionLatex: L`Find the number of one-one functions from a 5-element set to a 7-element set.`,
        difficulty: 3,
        skillTags: ["injective_function_counting"],
        promptMarkdown: "Enter the number of one-one functions.",
        numericAnswer: 2520,
        hints: [
          "A one-one function assigns distinct codomain elements to the 5 domain elements.",
          "This is a permutation count, not a combination count.",
          "Use $^{7}P_5$.",
        ],
        rubric: [
          "Recognizes that injective assignments are ordered selections.",
          "Computes $7P5$ correctly.",
        ],
        commonErrors: [
          "Using $\\binom75$ instead of $^7P_5$.",
          "Counting all functions as $7^5$.",
        ],
        solution:
          "For the five domain elements, choose distinct images in order: $^7P_5=7\\cdot6\\cdot5\\cdot4\\cdot3=2520$.",
      },
      {
        questionLatex: L`Let A=\{1,2,3,4\}. How many functions f:A\to A satisfy f(f(x))=x for all x\in A and have exactly two fixed points?`,
        difficulty: 5,
        skillTags: ["involutions", "function_counting"],
        promptMarkdown: "Enter the number of functions.",
        numericAnswer: 6,
        hints: [
          "$f(f(x))=x$ means every non-fixed element must be paired in a 2-cycle.",
          "Choose the two fixed points first.",
          "The remaining two elements must swap.",
        ],
        rubric: [
          "Interprets the condition as an involution with fixed points and swaps.",
          "Counts choices of fixed points and the forced swap.",
        ],
        commonErrors: [
          "Treating the remaining two elements as independently mappable.",
          "Counting functions with at least two fixed points instead of exactly two.",
        ],
        solution:
          "Choose the two fixed points in $\\binom42=6$ ways. The two remaining elements cannot be fixed, so they must map to each other. Hence there are $6$ such functions.",
      },
      {
        questionLatex: L`Find the length of the domain interval of f(x)=\sqrt{5-2x}+\sqrt{x+1}.`,
        difficulty: 3,
        skillTags: ["domain_of_radicals"],
        promptMarkdown: "Enter the interval length.",
        numericAnswer: 3.5,
        hints: [
          "Both expressions under the square roots must be nonnegative.",
          "Solve $5-2x\\ge0$ and $x+1\\ge0$.",
          "The domain is the intersection of the two intervals.",
        ],
        rubric: [
          "Finds both radical inequalities.",
          "Intersects the intervals and computes the length.",
        ],
        commonErrors: [
          "Taking the union of the inequalities instead of the intersection.",
          "Forgetting that $5-2x\\ge0$ reverses to $x\\le5/2$.",
        ],
        solution:
          "The conditions are $x\\le5/2$ and $x\\ge-1$. Thus the domain is $[-1,5/2]$, whose length is $5/2-(-1)=7/2$.",
      },
      {
        questionLatex: L`For f:\mathbb R\setminus\{2\}\to\mathbb R defined by f(x)=\dfrac{x^2-5x+6}{x-2}, exactly one real number is missing from the range. Find it.`,
        difficulty: 4,
        skillTags: ["range_with_hole", "rational_function_simplification"],
        promptMarkdown: "Enter the missing value.",
        numericAnswer: -1,
        hints: [
          "Factor the numerator.",
          "The simplified expression is valid only for $x\\ne2$.",
          "Ask which output the line $x-3$ would give at the removed input.",
        ],
        rubric: [
          "Simplifies the expression while preserving the excluded input.",
          "Identifies the output lost because $x=2$ is not in the domain.",
        ],
        commonErrors: [
          "Saying the range is all real numbers after cancellation.",
          "Reporting the excluded input $2$ instead of the missing output.",
        ],
        solution:
          "For $x\\ne2$, $f(x)=\\frac{(x-2)(x-3)}{x-2}=x-3$. The line $y=x-3$ would produce $y=-1$ at $x=2$, but $x=2$ is excluded. Therefore the missing value is $-1$.",
      },
      {
        questionLatex: L`Let f:\{1,2,3,4,5\}\to\{1,2,3\}. Find the number of onto functions f such that |f^{-1}(1)|=2.`,
        difficulty: 4,
        skillTags: ["onto_function_counting", "fixed_fibre_size"],
        promptMarkdown: "Enter the number of functions.",
        numericAnswer: 60,
        hints: [
          "Choose the two elements that map to 1.",
          "The remaining three elements must use both 2 and 3.",
          "Subtract the two assignments where all remaining elements go to the same value.",
        ],
        rubric: [
          "Chooses the fibre over 1.",
          "Counts assignments of the remaining elements that hit both remaining codomain elements.",
        ],
        commonErrors: [
          "Counting all $2^3$ assignments after fixing the fibre, which includes non-onto functions.",
          "Using the old exactly-one-to-each-remaining-value logic from the size-3 fibre case.",
          "Allowing a third element to map to 1.",
        ],
        solution:
          "Choose $f^{-1}(1)$ in $\\binom52=10$ ways. The remaining three domain elements may map only to 2 or 3, and must hit both values for the function to be onto. That gives $2^3-2=6$ assignments. Hence the total is $10\\cdot6=60$.",
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Composition and Inverse Functions",
    subtopic:
      "Order of composition, rational inverse traps, finite bijections, and iterated functions.",
    mc: [
      {
        questionLatex: L`For f(x)=\dfrac{x+1}{x-1}, x\ne1, the expression f(f(x)) equals`,
        difficulty: 4,
        skillTags: ["function_composition", "rational_involution"],
        choices: [L`$x$`, L`$\dfrac{1}{x}$`, L`$\dfrac{x-1}{x+1}$`, L`$\dfrac{x+1}{1-x}$`],
        correctLetter: "A",
        rationales: {
          B: "This is the common result of inverting the input instead of substituting the whole function into itself.",
          C: "This is the reciprocal of $f(x)$, not $f(f(x))$.",
          D: "This is $-f(x)$, so the second application was not actually carried out.",
        },
        misconceptionTags: {
          B: "confuses_composition_with_reciprocal",
          C: "uses_inverse_fraction_not_composition",
          D: "stops_after_one_function_application",
        },
        hints: [
          "Substitute $f(x)$ into every occurrence of $x$ in $f$.",
          "Use a single complex fraction and simplify.",
          "Check that $f(x)\\ne1$, so the second application is admissible.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute $f(x)$ into the same rule.",
            math: L`f(f(x))=\frac{\frac{x+1}{x-1}+1}{\frac{x+1}{x-1}-1}`,
          },
          {
            step: 2,
            explanation: "Simplify the numerator and denominator.",
            math: L`\frac{\frac{2x}{x-1}}{\frac{2}{x-1}}=x`,
          },
        ],
      },
      {
        questionLatex: L`Let f(x)=\dfrac{1}{x-1} and g(x)=\dfrac{1}{x+1}. The domain of f\circ g is`,
        difficulty: 4,
        skillTags: ["composition_domain", "rational_functions"],
        figure: compositionFlowFigure,
        choices: [
          L`$\mathbb R\setminus\{-1\}$`,
          L`$\mathbb R\setminus\{0\}$`,
          L`$\mathbb R\setminus\{-1,0\}$`,
          L`$\mathbb R\setminus\{-1,1\}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This checks only that $g(x)$ exists, but $g(x)$ also has to lie in the domain of $f$.",
          B: "This checks only $g(x)\\ne1$ and forgets that $g$ itself is undefined at $x=-1$.",
          D: "The forbidden value from $g(x)=1$ is $x=0$, not $x=1$.",
        },
        misconceptionTags: {
          A: "checks_inner_domain_only",
          B: "checks_outer_domain_only",
          D: "solves_domain_exclusion_incorrectly",
        },
        hints: [
          "For $f\\circ g$, first require $g(x)$ to exist.",
          "Then require $g(x)\\ne1$, since 1 is not allowed as an input to $f$.",
          "Solve $1/(x+1)=1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$g(x)$ exists only when $x\\ne -1$.",
            math: null,
          },
          {
            step: 2,
            explanation: "Also $f(g(x))$ requires $g(x)\\ne1$.",
            math: L`\frac1{x+1}\ne1\Rightarrow x\ne0`,
          },
          {
            step: 3,
            explanation: "Both exclusions are needed.",
            math: L`\mathbb R\setminus\{-1,0\}`,
          },
        ],
      },
      {
        questionLatex: L`If f(x)=ax+b,\ a>0, and f(f(x))=4x+9 for all real x, then a+b equals`,
        difficulty: 4,
        skillTags: ["linear_function_iteration", "coefficient_comparison"],
        choices: [L`$3$`, L`$4$`, L`$5$`, L`$7$`],
        correctLetter: "C",
        rationales: {
          A: "This uses $b=1$ after finding $a=2$, but the constant term equation is $b(a+1)=9$.",
          B: "This treats $a^2=4$ as $a=1$ after taking the positive condition incorrectly.",
          D: "This comes from setting $2b=9$ instead of $b(a+1)=9$.",
        },
        misconceptionTags: {
          A: "incorrect_constant_comparison",
          B: "incorrect_square_root_condition",
          D: "misses_second_b_term",
        },
        hints: [
          "Compute $f(f(x))$ symbolically.",
          "Compare the coefficient of $x$ and the constant term separately.",
          "Use the condition $a>0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compose the linear function with itself.",
            math: L`f(f(x))=a(ax+b)+b=a^2x+b(a+1)`,
          },
          {
            step: 2,
            explanation: "Compare with $4x+9$.",
            math: L`a^2=4,\quad b(a+1)=9`,
          },
          {
            step: 3,
            explanation: "Since $a>0$, $a=2$, so $b=3$.",
            math: L`a+b=5`,
          },
        ],
      },
      {
        questionLatex: L`Let X be a 5-element set. The number of bijections f:X\to X such that f^{-1}=f and f has exactly one fixed point is`,
        difficulty: 5,
        skillTags: ["inverse_bijections", "finite_function_counting"],
        choices: [L`$10$`, L`$15$`, L`$20$`, L`$30$`],
        correctLetter: "B",
        rationales: {
          A: "This chooses the fixed point but undercounts the pairings of the remaining four elements.",
          C: "This treats the remaining four elements as if each could independently choose a partner.",
          D: "This double-counts the two transpositions by ordering the pair blocks or the elements inside them.",
        },
        misconceptionTags: {
          A: "under_counts_pairings",
          C: "ignores_involution_cycle_structure",
          D: "orders_unordered_transpositions",
        },
        hints: [
          "$f^{-1}=f$ means $f\\circ f$ is the identity.",
          "So every non-fixed element must be paired with exactly one other non-fixed element.",
          "Choose the fixed point, then pair the remaining four elements.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Choose the unique fixed point.",
            math: L`5`,
          },
          {
            step: 2,
            explanation: "Pair the remaining four elements into two transpositions.",
            math: L`\frac{4!}{2^2\cdot2!}=3`,
          },
          {
            step: 3,
            explanation: "Multiply the choices.",
            math: L`5\cdot3=15`,
          },
        ],
      },
      {
        questionLatex: L`If f and g are bijections on a 5-element set and f\circ g is the identity function, then the number of ordered pairs (f,g) is`,
        difficulty: 4,
        skillTags: ["finite_bijections", "inverse_functions"],
        choices: [L`$5$`, L`$25$`, L`$120$`, L`$240$`],
        correctLetter: "C",
        rationales: {
          A: "There are many more than five bijections; one can choose any permutation for $f$.",
          B: "This treats values as independent choices but ignores the bijection condition.",
          D: "Once $f$ is chosen, $g$ is forced as $f^{-1}$, so there is no extra factor of 2.",
        },
        misconceptionTags: {
          A: "under_counts_permutations",
          B: "ignores_bijection_structure",
          D: "double_counts_inverse_pair",
        },
        hints: [
          "$f\\circ g=I$ implies $g=f^{-1}$.",
          "Choose one of the two bijections freely.",
          "Count permutations of a 5-element set.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For every bijection $f$, $g$ is uniquely determined.",
            math: L`g=f^{-1}`,
          },
          {
            step: 2,
            explanation: "There are $5!$ possible bijections $f$.",
            math: L`5!=120`,
          },
        ],
      },
      {
        questionLatex: L`Let f(x)=\dfrac{x+1}{2x-1} and g(x)=\dfrac{x-1}{2x+1}. Then (f\circ g)(x) equals`,
        difficulty: 4,
        skillTags: ["rational_composition", "composition_order"],
        choices: [L`$x$`, L`$-x$`, L`$\dfrac1x$`, L`$\dfrac{x+1}{x-1}$`],
        correctLetter: "B",
        rationales: {
          A: "This would be true for inverse functions, but these two do not compose to the identity.",
          C: "This comes from inverting the input rather than substituting $g(x)$ into $f$.",
          D: "This stops after a partial simplification and does not combine the complex fraction.",
        },
        misconceptionTags: {
          A: "assumes_functions_are_inverses",
          C: "confuses_composition_with_reciprocal",
          D: "incomplete_fraction_simplification",
        },
        hints: [
          "Substitute $g(x)$ into every $x$ in the formula for $f$.",
          "Simplify numerator and denominator separately.",
          "A sign appears from $2g(x)-1$.",
        ],
        solution: [
          { step: 1, explanation: "Substitute.", math: L`f(g(x))=\frac{\frac{x-1}{2x+1}+1}{2\frac{x-1}{2x+1}-1}` },
          { step: 2, explanation: "Simplify the complex fraction.", math: L`\frac{\frac{3x}{2x+1}}{\frac{-3}{2x+1}}=-x` },
        ],
      },
      {
        questionLatex: L`For f(x)=\dfrac{x}{x+1}, the value of f^{5}(x)=\underbrace{f(f(\cdots f(x)))}_{5\text{ times}} is`,
        difficulty: 5,
        skillTags: ["iterated_function", "composition_pattern"],
        choices: [
          L`$\dfrac{x}{5x+1}$`,
          L`$\dfrac{x}{x+5}$`,
          L`$\dfrac{5x}{x+1}$`,
          L`$\dfrac{x^5}{(x+1)^5}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The coefficient grows on the $x$ term in the denominator, not as a constant added after $x$.",
          C: "This multiplies the numerator instead of iterating the transformation.",
          D: "This treats $f^5(x)$ as the fifth power of $f(x)$.",
        },
        misconceptionTags: {
          B: "misreads_iteration_pattern",
          C: "multiplies_output_instead_of_composing",
          D: "confuses_iteration_with_power",
        },
        hints: [
          "Compute $f^2(x)$ and $f^3(x)$ first.",
          "Look for the denominator pattern.",
          "Here $f^n(x)=\\frac{x}{nx+1}$.",
        ],
        solution: [
          { step: 1, explanation: "The first few iterates are:", math: L`f^2(x)=\frac{x}{2x+1},\quad f^3(x)=\frac{x}{3x+1}` },
          { step: 2, explanation: "Thus the fifth iterate is:", math: L`f^5(x)=\frac{x}{5x+1}` },
        ],
      },
      {
        questionLatex: L`Let f(x)=2x-3 and g(x)=\dfrac{x+3}{2}. Which statement is correct?`,
        difficulty: 3,
        skillTags: ["inverse_functions", "composition"],
        choices: [
          "$f\\circ g$ is the identity, but $g\\circ f$ is not",
          "$g\\circ f$ is the identity, but $f\\circ g$ is not",
          "Both $f\\circ g$ and $g\\circ f$ are identity functions",
          "Neither composition is the identity",
        ],
        correctLetter: "C",
        rationales: {
          A: "For functions on real numbers, inverse linear functions compose to identity in both orders.",
          B: "The two functions are inverses, so both orders work.",
          D: "Direct substitution gives $x$ in both compositions.",
        },
        misconceptionTags: {
          A: "checks_only_one_composition",
          B: "checks_only_one_composition",
          D: "does_not_recognize_inverse_pair",
        },
        hints: [
          "Compute both compositions explicitly.",
          "For inverse functions, both orders should return the original input.",
          "Do not assume one order is enough unless domains/codomains differ.",
        ],
        solution: [
          { step: 1, explanation: "Compute one order.", math: L`f(g(x))=2\cdot\frac{x+3}{2}-3=x` },
          { step: 2, explanation: "Compute the other.", math: L`g(f(x))=\frac{(2x-3)+3}{2}=x` },
        ],
      },
      {
        questionLatex: L`Let f:\{1,2,3,4\}\to\{1,2,3,4\} be the cycle f(1)=2,\ f(2)=3,\ f(3)=4,\ f(4)=1. Then f^{2026}(1) equals`,
        difficulty: 4,
        skillTags: ["function_iteration", "finite_cycles"],
        choices: [L`$1$`, L`$2$`, L`$3$`, L`$4$`],
        correctLetter: "C",
        rationales: {
          A: "This would require the exponent to be divisible by 4.",
          B: "This is $f(1)$, but $2026$ leaves remainder 2 modulo the cycle length.",
          D: "This corresponds to remainder 3 modulo 4.",
        },
        misconceptionTags: {
          A: "uses_wrong_modular_remainder",
          B: "treats_large_iteration_as_single_step",
          D: "off_by_one_cycle_position",
        },
        hints: [
          "The function has cycle length 4.",
          "Reduce 2026 modulo 4.",
          "Apply the remaining number of steps from 1.",
        ],
        solution: [
          { step: 1, explanation: "Reduce the exponent.", math: L`2026\equiv2\pmod4` },
          { step: 2, explanation: "Two steps from 1 gives 3.", math: L`f^2(1)=3` },
        ],
      },
      {
        questionLatex: L`If f(x)=ax+b,\ a\ne0, and f^{-1}(x)=f(x) for all real x, then which condition is necessary and sufficient?`,
        difficulty: 5,
        skillTags: ["inverse_function_equation", "linear_functions"],
        choices: [
          L`$a=1,\ b=0$ only`,
          L`$a=-1,\ b\in\mathbb R$`,
          L`$a=1,\ b=0$ or $a=-1,\ b\in\mathbb R$`,
          L`$a=-1,\ b=0$ only`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The identity works, but it is not the only self-inverse linear function.",
          B: "This includes the reflection family but omits the identity function.",
          D: "Every function $f(x)=-x+b$ is self-inverse, not just $b=0$.",
        },
        misconceptionTags: {
          A: "finds_only_identity_case",
          B: "omits_identity_case",
          D: "over_restricts_reflection_case",
        },
        hints: [
          "Find the inverse of $ax+b$.",
          "Set it equal to $ax+b$ as an identity in $x$.",
          "Compare coefficients.",
        ],
        solution: [
          { step: 1, explanation: "The inverse is:", math: L`f^{-1}(x)=\frac{x-b}{a}` },
          { step: 2, explanation: "Equating coefficients with $ax+b$ gives $a^2=1$ and $b(a+1)=0$.", math: null },
          { step: 3, explanation: "Thus either $a=1,b=0$ or $a=-1$ with any real $b$.", math: null },
        ],
      },
    ],
    numeric: [
      {
        questionLatex: L`Let f(x)=\dfrac{3x-2}{x+1}. Find f^{-1}(2).`,
        difficulty: 3,
        skillTags: ["inverse_value", "rational_function"],
        promptMarkdown: "Enter the value of $f^{-1}(2)$.",
        numericAnswer: 4,
        hints: [
          "$f^{-1}(2)$ is the input $t$ for which $f(t)=2$.",
          "Set $\\frac{3t-2}{t+1}=2$.",
          "Solve the resulting linear equation.",
        ],
        rubric: [
          "Translates inverse value into an equation in the original function.",
          "Solves the rational equation correctly.",
        ],
        commonErrors: [
          "Trying to find the full inverse formula and making an algebra slip.",
          "Substituting $x=2$ into $f$ instead of solving $f(x)=2$.",
        ],
        solution:
          "Let $f(t)=2$. Then $\\frac{3t-2}{t+1}=2$, so $3t-2=2t+2$ and $t=4$. Hence $f^{-1}(2)=4$.",
      },
      {
        questionLatex: L`Let f(x)=2x+1 and g(x)=x^2. Find the sum of all real solutions of (f\circ g)(x)=(g\circ f)(x).`,
        difficulty: 4,
        skillTags: ["composition_equation", "quadratic_roots"],
        promptMarkdown: "Enter the sum of the real solutions.",
        numericAnswer: -2,
        hints: [
          "Compute $f(g(x))$ and $g(f(x))$ separately.",
          "Move all terms to one side and factor.",
          "Add the real roots you find.",
        ],
        rubric: [
          "Sets up the correct composition equation.",
          "Solves and sums the real roots.",
        ],
        commonErrors: [
          "Assuming composition is commutative.",
          "Solving only one root after factoring.",
        ],
        solution:
          "$(f\\circ g)(x)=2x^2+1$, while $(g\\circ f)(x)=(2x+1)^2=4x^2+4x+1$. Thus $2x^2+1=4x^2+4x+1$, so $2x(x+2)=0$. The roots are $0$ and $-2$, and their sum is $-2$.",
      },
      {
        questionLatex: L`For f(x)=\dfrac{x}{x+1}, define f^3(x)=f(f(f(x))). If f^3(x)=\dfrac{x}{kx+1}, find k.`,
        difficulty: 5,
        skillTags: ["iterated_function", "rational_composition"],
        promptMarkdown: "Enter the value of $k$.",
        numericAnswer: 3,
        hints: [
          "First compute $f(f(x))$.",
          "Then apply $f$ once more.",
          "Look for the coefficient of $x$ in the final denominator.",
        ],
        rubric: [
          "Computes the second iterate correctly.",
          "Computes the third iterate and identifies $k$.",
        ],
        commonErrors: [
          "Multiplying exponents as if $f^3(x)$ meant $(f(x))^3$.",
          "Dropping domain restrictions while simplifying complex fractions.",
        ],
        solution:
          "$f^2(x)=f(f(x))=\\frac{x}{2x+1}$. Applying $f$ again gives $f^3(x)=\\frac{x/(2x+1)}{x/(2x+1)+1}=\\frac{x}{3x+1}$. Therefore $k=3$.",
      },
      {
        questionLatex: L`Find the number of bijections f on \{1,2,3,4\} such that f\circ f is the identity and f has no fixed point.`,
        difficulty: 5,
        skillTags: ["bijection_involution", "derangement_with_cycles"],
        promptMarkdown: "Enter the number of such bijections.",
        numericAnswer: 3,
        hints: [
          "$f\\circ f=I$ means cycles can only have length 1 or 2.",
          "No fixed point removes all length-1 cycles.",
          "Pair the four elements into two unordered pairs.",
        ],
        rubric: [
          "Interprets the condition in terms of 2-cycles.",
          "Counts pairings of four elements.",
        ],
        commonErrors: [
          "Counting all derangements of 4 elements.",
          "Counting ordered pairs of swaps instead of unordered pairings.",
        ],
        solution:
          "The function must be a product of two disjoint transpositions. The number of ways to pair four labelled elements is $\\frac{4!}{2^2\\cdot2!}=3$.",
      },
      {
        questionLatex: L`Let f(x)=\dfrac{x-1}{x+2}. Find the number of real x for which f^{-1}(x)=f(x).`,
        difficulty: 5,
        skillTags: ["inverse_function_equation", "rational_equation"],
        promptMarkdown: "Enter the number of real solutions.",
        numericAnswer: 0,
        hints: [
          "First solve $y=\\frac{x-1}{x+2}$ for $x$ to get $f^{-1}(y)$.",
          "Then set $f^{-1}(x)=f(x)$.",
          "Check the discriminant of the resulting quadratic.",
        ],
        rubric: [
          "Finds the inverse function correctly.",
          "Solves the comparison equation and counts real solutions.",
        ],
        commonErrors: [
          "Assuming $f^{-1}(x)=f(x)$ means $f(f(x))=x$.",
          "Counting complex roots as real roots.",
        ],
        solution:
          "Solving $y=\\frac{x-1}{x+2}$ gives $f^{-1}(y)=\\frac{1+2y}{1-y}$. Thus $\\frac{1+2x}{1-x}=\\frac{x-1}{x+2}$. Cross-multiplication gives $3x^2+3x+3=0$, whose discriminant is $9-36<0$. Hence there are $0$ real solutions.",
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Mixed JEE Main Set-Function Reasoning",
    subtopic:
      "Parameter-free contest-style counts combining set partitions, relations, functions, and composition.",
    mc: [
      {
        questionLatex: L`On X=\{1,2,3,4,5\}, define xRy if and only if x+2y is divisible by 3. Which statement is true?`,
        difficulty: 4,
        skillTags: ["equivalence_relation", "modular_reasoning"],
        choices: [
          "R is not symmetric",
          "R is an equivalence relation with 2 classes",
          "R is an equivalence relation with 3 classes",
          "R is reflexive but not transitive",
        ],
        correctLetter: "C",
        rationales: {
          A: "Modulo 3, $x+2y\\equiv0$ implies $x\\equiv y$, so symmetry holds.",
          B: "The relation groups elements by residues modulo 3, and all three residues occur in $X$.",
          D: "Same-residue modulo 3 is transitive.",
        },
        misconceptionTags: {
          A: "misses_modular_equivalence_form",
          B: "drops_one_residue_class",
          D: "fails_to_translate_to_same_residue",
        },
        hints: [
          "Work modulo 3.",
          "Since $2\\equiv -1\\pmod3$, the condition is $x-y\\equiv0\\pmod3$.",
          "Now read the relation as same residue modulo 3.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rewrite the condition modulo 3.",
            math: L`x+2y\equiv x-y\pmod3`,
          },
          {
            step: 2,
            explanation:
              "Thus $xRy$ means $x$ and $y$ have the same residue modulo 3.",
            math: null,
          },
          {
            step: 3,
            explanation:
              "This is an equivalence relation, and the residues 0,1,2 all appear in $X$.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`The number of functions f:\{1,2,3,4\}\to\{1,2,3,4\} satisfying f(f(x))=f(x) for every x is`,
        difficulty: 5,
        skillTags: ["idempotent_functions", "image_set_counting"],
        choices: [L`$37$`, L`$40$`, L`$41$`, L`$44$`],
        correctLetter: "C",
        rationales: {
          A: "This misses some image-size 2 or image-size 3 assignments; the image elements must be fixed, but non-image elements can map to any image element.",
          B: "This is close but loses one case, usually the identity map when the image has size 4.",
          D: "This overcounts by choosing an image set but not forcing image elements to be fixed.",
        },
        misconceptionTags: {
          A: "under_counts_idempotent_cases",
          B: "misses_identity_case",
          D: "does_not_force_image_fixed_points",
        },
        hints: [
          "For an idempotent function, every element in the image must be fixed.",
          "If the image has size $k$, choose the image set first.",
          "Then each of the remaining $4-k$ elements can map to any of the $k$ image elements.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If the image has size $k$, choose the image in $\\binom4k$ ways.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "Image elements must be fixed; non-image elements may map to any image element.",
            math: L`\sum_{k=1}^{4}\binom4k k^{4-k}`,
          },
          {
            step: 3,
            explanation: "Evaluate the sum.",
            math: L`4+6\cdot4+4\cdot3+1=41`,
          },
        ],
      },
      {
        questionLatex: L`Let |A|=3 and |B|=4. The number of relations from A to B whose domain is all of A and whose range has exactly two elements is`,
        difficulty: 5,
        skillTags: ["relation_counting", "domain_range_constraints"],
        choices: [L`$108$`, L`$144$`, L`$150$`, L`$216$`],
        correctLetter: "C",
        rationales: {
          A: "This undercounts by forcing each domain element to relate to exactly one of the two range elements.",
          B: "This counts nonempty choices in each row but forgets to ensure both selected range elements are actually used.",
          D: "This allows the range to have at most two elements rather than exactly two.",
        },
        misconceptionTags: {
          A: "treats_relation_as_function",
          B: "does_not_enforce_exact_range",
          D: "counts_at_most_two_range_elements",
        },
        hints: [
          "First choose the two elements of $B$ that form the range.",
          "For each element of $A$, choose a nonempty subset of these two targets.",
          "Subtract the two cases where only one of the selected targets is used globally.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Choose the two-element range.",
            math: L`\binom42=6`,
          },
          {
            step: 2,
            explanation:
              "For each of the three domain elements, choose a nonempty subset of the selected two targets: 3 choices.",
            math: L`3^3`,
          },
          {
            step: 3,
            explanation:
              "Subtract the two global cases where only one of the two selected range elements is used.",
            math: L`\binom42(3^3-2)=6\cdot25=150`,
          },
        ],
      },
      {
        questionLatex: L`Let X be a 5-element set and Y be a 4-element set. The number of functions f:X\to Y whose range has exactly 3 elements is`,
        difficulty: 4,
        skillTags: ["range_size_counting", "onto_to_subset"],
        choices: [L`$240$`, L`$480$`, L`$600$`, L`$720$`],
        correctLetter: "C",
        rationales: {
          A: "This chooses a 3-element range but counts only one fibre pattern.",
          B: "This misses the inclusion-exclusion add-back for onto maps onto the chosen 3-element range.",
          D: "This overcounts by ordering the chosen range elements before assigning functions.",
        },
        misconceptionTags: {
          A: "incomplete_fibre_counting",
          B: "inclusion_exclusion_error",
          D: "orders_range_subset_unnecessarily",
        },
        hints: [
          "Choose which 3 elements of $Y$ appear in the range.",
          "For that chosen 3-element set, count onto functions from a 5-element domain.",
          "Use $3^5-3\\cdot2^5+3\\cdot1^5$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Choose the exact three-element range.",
            math: L`\binom43=4`,
          },
          {
            step: 2,
            explanation:
              "Count onto functions from $X$ to that chosen three-element set.",
            math: L`3^5-\binom31 2^5+\binom32 1^5=243-96+3=150`,
          },
          {
            step: 3,
            explanation: "Multiply.",
            math: L`4\cdot150=600`,
          },
        ],
      },
      {
        questionLatex: L`Let S=\{1,2,\ldots,10\}. Define F:{\cal P}(S)\to{\cal P}(S) by F(A)=A\triangle\{1,2,3\}. Which statement is correct?`,
        difficulty: 4,
        skillTags: ["symmetric_difference_function", "power_set_function"],
        choices: [
          "F has no fixed point and is one-one",
          "F has exactly one fixed point and is one-one",
          "F has no fixed point and is not one-one",
          "F has $2^7$ fixed points",
        ],
        correctLetter: "A",
        rationales: {
          B: "A fixed point would require toggling the three elements to leave the set unchanged, which is impossible.",
          C: "Symmetric difference with a fixed set is reversible by applying the same operation again.",
          D: "The elements outside $\\{1,2,3\\}$ are free only after the toggled part is impossible; no fixed points exist.",
        },
        misconceptionTags: {
          B: "assumes_empty_set_fixed",
          C: "misses_involution_property",
          D: "counts_free_outside_elements_after_impossible_condition",
        },
        hints: [
          "Symmetric difference with a fixed nonempty set toggles membership of its elements.",
          "Apply $F$ twice and see what happens.",
          "A fixed point would need each of 1,2,3 to both change and not change.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Applying symmetric difference with the same set twice returns the original set.",
            math: L`F(F(A))=A`,
          },
          {
            step: 2,
            explanation:
              "So $F$ is one-one. But $F(A)=A$ would require $A\\triangle\\{1,2,3\\}=A$, impossible because $\\{1,2,3\\}$ is nonempty.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`The number of functions f:\{1,2,3\}\to\{1,2,3\} satisfying f(f(x))=f(x) for every x is`,
        difficulty: 5,
        skillTags: ["idempotent_functions", "function_counting"],
        choices: [L`$9$`, L`$10$`, L`$12$`, L`$15$`],
        correctLetter: "B",
        rationales: {
          A: "This misses the identity function or one image-size case.",
          C: "This overcounts by allowing image elements not to be fixed.",
          D: "This counts too many arbitrary maps after choosing an image.",
        },
        misconceptionTags: {
          A: "under_counts_idempotent_functions",
          C: "does_not_force_image_fixed",
          D: "over_counts_nonimage_assignments",
        },
        hints: [
          "For an idempotent function, every element in the image is fixed.",
          "Split by image size $k$.",
          "Choose the image set, then map non-image elements into it.",
        ],
        solution: [
          { step: 1, explanation: "Sum over possible image sizes.", math: L`\sum_{k=1}^{3}\binom3k k^{3-k}` },
          { step: 2, explanation: "Evaluate.", math: L`3+3\cdot2+1=10` },
        ],
      },
      {
        questionLatex: L`Let |A|=2 and |B|=3. The number of relations from A to B whose domain is A and whose range is B is`,
        difficulty: 5,
        skillTags: ["relation_counting", "domain_range_constraints"],
        choices: [L`$18$`, L`$24$`, L`$25$`, L`$27$`],
        correctLetter: "C",
        rationales: {
          A: "This treats the relation too much like a function and misses multi-valued row choices.",
          B: "This is close but misses the inclusion-exclusion adjustment for using all three range elements.",
          D: "This counts all relations with nonempty domain rows but allows a missing range element.",
        },
        misconceptionTags: {
          A: "confuses_relation_with_function",
          B: "inclusion_exclusion_slip",
          D: "does_not_enforce_full_range",
        },
        hints: [
          "Each of the two domain elements must relate to a nonempty subset of B.",
          "That gives $7^2$ relations with full domain.",
          "Subtract relations missing at least one element of B from the range.",
        ],
        solution: [
          { step: 1, explanation: "Full domain gives nonempty subsets in each row.", math: L`7^2=49` },
          { step: 2, explanation: "Subtract missing range elements and add back missing two.", math: L`49-\binom31 3^2+\binom32 1^2=49-27+3=25` },
        ],
      },
      {
        questionLatex: L`Let X be a 4-element set. The number of idempotent functions f:X\to X with |\operatorname{Range}(f)|=2 is`,
        difficulty: 5,
        skillTags: ["idempotent_functions", "range_size_counting"],
        choices: [L`$12$`, L`$18$`, L`$24$`, L`$36$`],
        correctLetter: "C",
        rationales: {
          A: "This lets each non-image element choose only one target pattern instead of either image element.",
          B: "This counts some image choices but undercounts assignments of the two non-image elements.",
          D: "This overcounts by not forcing the two image elements to be fixed.",
        },
        misconceptionTags: {
          A: "under_counts_nonimage_assignments",
          B: "partial_count_only",
          D: "does_not_force_image_fixed",
        },
        hints: [
          "Choose the two elements in the image.",
          "Those image elements must be fixed.",
          "The other two elements may map to either image element.",
        ],
        solution: [
          { step: 1, explanation: "Choose the image.", math: L`\binom42=6` },
          { step: 2, explanation: "The remaining two elements each have 2 image choices.", math: L`2^2` },
          { step: 3, explanation: "Multiply.", math: L`6\cdot4=24` },
        ],
      },
      {
        questionLatex: L`Let U be a 7-element set. The number of ordered pairs (A,B) of subsets of U such that |A\triangle B|=3 is`,
        difficulty: 5,
        skillTags: ["symmetric_difference_counting", "set_pair_counting"],
        choices: [L`$1120$`, L`$2240$`, L`$4480$`, L`$8960$`],
        correctLetter: "C",
        rationales: {
          A: "This chooses the symmetric-difference set but undercounts the membership states.",
          B: "This gives only one exclusive-membership choice for each element in the symmetric difference.",
          D: "This double-counts the ordered-pair choices after the states have already been assigned.",
        },
        misconceptionTags: {
          A: "under_counts_membership_states",
          B: "misses_two_exclusive_states",
          D: "double_counts_ordered_pair_states",
        },
        hints: [
          "Choose the 3 elements where A and B differ.",
          "Each differing element has two states: A only or B only.",
          "Each remaining element has two states: both or neither.",
        ],
        solution: [
          { step: 1, explanation: "Choose the symmetric difference.", math: L`\binom73` },
          { step: 2, explanation: "Assign states for all elements.", math: L`2^3\cdot2^4=2^7` },
          { step: 3, explanation: "Multiply.", math: L`\binom73 2^7=35\cdot128=4480` },
        ],
      },
      {
        questionLatex: L`For a 3-element set A and a 3-element set B, the number of relations from A to B with exactly two elements in the domain and exactly two elements in the range is`,
        difficulty: 5,
        skillTags: ["relation_counting", "exact_domain_range"],
        choices: [L`$54$`, L`$63$`, L`$72$`, L`$81$`],
        correctLetter: "B",
        rationales: {
          A: "This undercounts the valid $2\\times2$ relation patterns with no empty row or column.",
          C: "This counts some relations with a missing row or column.",
          D: "This treats the chosen $2\\times2$ block as arbitrary and allows empty rows or columns.",
        },
        misconceptionTags: {
          A: "under_counts_valid_relation_matrices",
          C: "does_not_enforce_exact_domain_range",
          D: "allows_empty_rows_columns",
        },
        hints: [
          "Choose the two domain elements and two range elements first.",
          "Inside the resulting $2\\times2$ grid, count nonempty rows and nonempty columns.",
          "For two rows and two columns, there are $3^2-2$ valid row-subset choices.",
        ],
        solution: [
          { step: 1, explanation: "Choose the domain and range supports.", math: L`\binom32\binom32=9` },
          { step: 2, explanation: "For the chosen supports, each row has a nonempty subset of two columns, and both columns must appear.", math: L`3^2-2=7` },
          { step: 3, explanation: "Multiply.", math: L`9\cdot7=63` },
        ],
      },
    ],
    numeric: [
      {
        questionLatex: L`For X=\{1,2,\ldots,8\}, find the number of ordered pairs (S,T) of subsets of X such that S\subseteq T and |T|=|S|+3.`,
        difficulty: 5,
        skillTags: ["ordered_subset_pairs", "difference_size"],
        promptMarkdown: "Enter the number of ordered pairs.",
        numericAnswer: 1792,
        hints: [
          "The condition says exactly three elements lie in $T\\setminus S$.",
          "Choose those three elements first.",
          "Every remaining element is either outside $T$ or inside both $S$ and $T$.",
        ],
        rubric: [
          "Chooses the exact difference set.",
          "Counts the two allowed states for every remaining element.",
        ],
        commonErrors: [
          "Choosing $S$ and $T$ independently.",
          "Allowing elements in $S\\setminus T$ despite $S\\subseteq T$.",
        ],
        solution:
          "Choose the three elements of $T\\setminus S$ in $\\binom83=56$ ways. Each of the remaining five elements is either outside $T$ or in both $S$ and $T$, giving $2^5$ choices. Total $56\\cdot32=1792$.",
      },
      {
        questionLatex: L`On X=\{1,2,\ldots,6\}, define xRy if and only if x-y is divisible by 2 or by 3. Find |R|.`,
        difficulty: 5,
        skillTags: ["relation_cardinality", "inclusion_exclusion_on_relations"],
        promptMarkdown: "Enter the number of ordered pairs in $R$.",
        numericAnswer: 24,
        hints: [
          "Count ordered pairs with the same parity.",
          "Count ordered pairs with the same residue modulo 3.",
          "Subtract ordered pairs counted in both groups.",
        ],
        rubric: [
          "Counts same-parity and same-modulo-3 ordered pairs.",
          "Subtracts the intersection of the two conditions.",
        ],
        commonErrors: [
          "Counting unordered pairs instead of ordered pairs.",
          "Forgetting that pairs satisfying both conditions are counted twice.",
        ],
        solution:
          "Same parity gives $3^2+3^2=18$ ordered pairs. Same residue modulo 3 gives $2^2+2^2+2^2=12$ ordered pairs. Both conditions mean same residue modulo 6, giving the six diagonal pairs. Hence $|R|=18+12-6=24$.",
      },
      {
        questionLatex: L`Find the number of functions f:\{1,2,3,4\}\to\{1,2,3,4,5\} whose range has exactly 3 elements.`,
        difficulty: 4,
        skillTags: ["range_size_counting", "onto_to_chosen_subset"],
        promptMarkdown: "Enter the number of functions.",
        numericAnswer: 360,
        hints: [
          "Choose the three elements that appear in the range.",
          "Then count onto functions from 4 domain elements to those 3 selected elements.",
          "Use inclusion-exclusion for onto functions.",
        ],
        rubric: [
          "Chooses the exact range subset.",
          "Counts onto functions onto that selected subset.",
        ],
        commonErrors: [
          "Counting functions with range at most 3.",
          "Ordering the chosen range elements and overcounting.",
        ],
        solution:
          "Choose the range in $\\binom53=10$ ways. For a fixed 3-element range, the number of onto functions from 4 elements is $3^4-3\\cdot2^4+3=81-48+3=36$. Total $10\\cdot36=360$.",
      },
      {
        questionLatex: L`Let f(x)=\dfrac{x-2}{x+1}. Find f(f(0)).`,
        difficulty: 3,
        skillTags: ["composition_evaluation", "rational_function"],
        promptMarkdown: "Enter the value.",
        numericAnswer: 4,
        hints: [
          "Compute $f(0)$ first.",
          "Then apply the same function rule to that output.",
          "Check that the intermediate value is in the domain.",
        ],
        rubric: [
          "Evaluates the inner function first.",
          "Evaluates the outer function correctly.",
        ],
        commonErrors: [
          "Treating $f(f(0))$ as $f(0)^2$.",
          "Applying the operations in the wrong order.",
        ],
        solution:
          "$f(0)=\\frac{-2}{1}=-2$. Then $f(f(0))=f(-2)=\\frac{-2-2}{-2+1}=4$.",
      },
      {
        questionLatex: L`Let |U|=12 and A\cup B=U. Find the number of ordered pairs (A,B) of subsets of U such that |A\cap B|=4.`,
        difficulty: 5,
        skillTags: ["set_pair_counting", "intersection_constraint"],
        promptMarkdown: "Enter the number of ordered pairs.",
        numericAnswer: 126720,
        hints: [
          "Choose the four elements in $A\\cap B$.",
          "Every remaining element must be in exactly one of $A$ or $B$ because $A\\cup B=U$.",
          "The pair $(A,B)$ is ordered, so the two exclusive choices are different.",
        ],
        rubric: [
          "Chooses the intersection.",
          "Assigns every remaining element to exactly one of the ordered sets.",
        ],
        commonErrors: [
          "Allowing elements outside $A\\cup B$.",
          "Dividing by 2 as if $(A,B)$ were unordered.",
        ],
        solution:
          "Choose the intersection in $\\binom{12}{4}=495$ ways. Each of the remaining 8 elements must be assigned to $A\\setminus B$ or $B\\setminus A$, giving $2^8=256$ choices. Total $495\\cdot256=126720$.",
      },
    ],
  },
];

export const jeeSetsRelationsFunctionsTopics: Topic[] = topicSeeds.map(makeTopic);
