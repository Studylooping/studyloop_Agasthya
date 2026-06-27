import type {
  Hint,
  McChoice,
  McSingleItem,
  NumericItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";

const COURSE = "jee-main-math";
const UNIT = "u3-matrices-determinants";
const VERSION = "0.1.1";
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
  return `You chose ${choiceText}. This misses a matrix condition, determinant property, or consistency check in the stem. The correct choice is ${correctText}.`;
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
        : seed.misconceptionTags?.[letter] ?? "jee_unit3_matrix_trap",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_matrix_formula_without_checking_order_or_invertibility",
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.num.${String(index + 1).padStart(3, "0")}`,
    kind: "numeric",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "computes_before_checking_matrix_order_or_parameter_case",
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
    topicCode: "3.1",
    title: "Matrix Algebra, Types, and Powers",
    subtopic:
      "Products, transpose structure, trace-det identities, special matrices, and powers.",
    mc: [
      {
        questionLatex: L`For $A=\begin{pmatrix}1&2\\3&4\end{pmatrix}$ and $B=\begin{pmatrix}0&1\\1&0\end{pmatrix}$, $AB-BA$ equals`,
        difficulty: 3,
        skillTags: ["matrix_multiplication", "non_commutativity"],
        choices: [
          L`$\begin{pmatrix}-1&-3\\3&1\end{pmatrix}$`,
          L`$\begin{pmatrix}1&3\\-3&-1\end{pmatrix}$`,
          L`$\begin{pmatrix}0&0\\0&0\end{pmatrix}$`,
          L`$\begin{pmatrix}-1&3\\-3&1\end{pmatrix}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This reverses the order and computes $BA-AB$.",
          C: "This assumes matrices commute, which is false here.",
          D: "This has the off-diagonal signs from one product but not the other.",
        },
        misconceptionTags: {
          B: "subtracts_in_wrong_order",
          C: "assumes_matrix_multiplication_commutes",
          D: "off_diagonal_sign_error",
        },
        hints: [
          "Compute $AB$ and $BA$ separately.",
          "The swap matrix exchanges columns on the right and rows on the left.",
          "Subtract corresponding entries only after both products are done.",
        ],
        solution: solution(
          L`$AB=\begin{pmatrix}2&1\\4&3\end{pmatrix}$ and $BA=\begin{pmatrix}3&4\\1&2\end{pmatrix}$, so $AB-BA=\begin{pmatrix}-1&-3\\3&1\end{pmatrix}$.`,
          L`\begin{pmatrix}-1&-3\\3&1\end{pmatrix}`,
        ),
      },
      {
        questionLatex: L`If $A=\begin{pmatrix}1&2\\0&1\end{pmatrix}$, then the $(1,2)$ entry of $A^6$ is`,
        difficulty: 3,
        skillTags: ["matrix_powers", "nilpotent_part"],
        choices: [L`$6$`, L`$10$`, L`$12$`, L`$64$`],
        correctLetter: "C",
        rationales: {
          A: "This uses $A=I+N$ but forgets that the off-diagonal entry of $N$ is $2$.",
          B: "This treats the power as an arithmetic sum of first five integers.",
          D: "This incorrectly raises the off-diagonal entry itself to a power.",
        },
        misconceptionTags: {
          A: "drops_off_diagonal_factor",
          B: "uses_wrong_power_pattern",
          D: "raises_entry_independently",
        },
        hints: [
          "Write $A=I+N$ where $N^2=0$.",
          "$(I+N)^6=I+6N$ when $N^2=0$.",
          "The $(1,2)$ entry of $N$ is $2$.",
        ],
        solution: solution(
          L`With $N=\begin{pmatrix}0&2\\0&0\end{pmatrix}$, $N^2=0$. Hence $A^6=(I+N)^6=I+6N$, whose $(1,2)$ entry is $12$.`,
          L`12`,
        ),
      },
      {
        questionLatex: L`Let $A=\begin{pmatrix}2&-1\\3&4\end{pmatrix}=S+K$, where $S$ is symmetric and $K$ is skew-symmetric. The value of $2S_{12}+K_{21}$ is`,
        difficulty: 3,
        skillTags: ["symmetric_skew_decomposition", "transpose"],
        choices: [L`$0$`, L`$2$`, L`$4$`, L`$6$`],
        correctLetter: "C",
        rationales: {
          A: "This cancels the off-diagonal entries instead of averaging them.",
          B: "This uses only $K_{21}$ and ignores $2S_{12}$.",
          D: "This adds the original off-diagonal entries directly.",
        },
        misconceptionTags: {
          A: "wrong_symmetric_part",
          B: "drops_symmetric_contribution",
          D: "uses_original_entries_directly",
        },
        hints: [
          "Use $S=(A+A^T)/2$ and $K=(A-A^T)/2$.",
          "$S_{12}=(-1+3)/2$.",
          "$K_{21}=(3-(-1))/2$.",
        ],
        solution: solution(
          L`$S_{12}=1$ and $K_{21}=2$, so $2S_{12}+K_{21}=2(1)+2=4$.`,
          L`4`,
        ),
      },
      {
        questionLatex: L`A real matrix $X=\begin{pmatrix}a&b\\c&d\end{pmatrix}$ commutes with $\begin{pmatrix}1&0\\0&2\end{pmatrix}$. If $\operatorname{tr}X=5$, $\det X=6$, and $a<d$, then $X$ is`,
        difficulty: 4,
        skillTags: ["commuting_matrices", "trace_determinant"],
        choices: [
          L`$\begin{pmatrix}2&0\\0&3\end{pmatrix}$`,
          L`$\begin{pmatrix}3&0\\0&2\end{pmatrix}$`,
          L`$\begin{pmatrix}2&1\\0&3\end{pmatrix}$`,
          L`$\begin{pmatrix}2&0\\1&3\end{pmatrix}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This satisfies trace and determinant but violates $a<d$.",
          C: "A nonzero upper off-diagonal entry does not commute with the diagonal matrix with distinct diagonal entries.",
          D: "A nonzero lower off-diagonal entry also fails the commuting condition.",
        },
        misconceptionTags: {
          B: "ignores_order_condition",
          C: "keeps_forbidden_upper_entry",
          D: "keeps_forbidden_lower_entry",
        },
        hints: [
          "Commuting with a diagonal matrix with distinct diagonal entries forces $b=c=0$.",
          "Then $a+d=5$ and $ad=6$.",
          "Use $a<d$ to choose the order.",
        ],
        solution: solution(
          L`The commuting condition gives $b=c=0$. Thus $a,d$ are roots of $t^2-5t+6=0$, so they are $2,3$. Since $a<d$, $X=\begin{pmatrix}2&0\\0&3\end{pmatrix}$.`,
          L`\begin{pmatrix}2&0\\0&3\end{pmatrix}`,
        ),
      },
      {
        questionLatex: L`If a $2\times2$ matrix $A$ satisfies $A^2=A$ and $\operatorname{tr}A=1$, then $\det(2A-I)$ is`,
        difficulty: 4,
        skillTags: ["idempotent_matrix", "trace_determinant"],
        choices: [L`$-1$`, L`$0$`, L`$1$`, L`$2$`],
        correctLetter: "A",
        rationales: {
          B: "This would require $2A-I$ to be singular, but the eigenvalues are $1$ and $-1$.",
          C: "This misses the negative eigenvalue coming from the zero eigenvalue of $A$.",
          D: "This treats determinant as if it were trace.",
        },
        misconceptionTags: {
          B: "assumes_idempotent_is_singular_after_shift",
          C: "drops_negative_eigenvalue",
          D: "confuses_trace_and_determinant",
        },
        hints: [
          "An idempotent matrix has possible eigenvalues $0$ and $1$.",
          "The trace is the sum of eigenvalues.",
          "Apply the transformation $\\lambda\\mapsto2\\lambda-1$.",
        ],
        solution: solution(
          L`The eigenvalues of $A$ must be $1$ and $0$ because $A^2=A$ and the trace is $1$. Hence $2A-I$ has eigenvalues $1$ and $-1$, so its determinant is $-1$.`,
          L`-1`,
        ),
      },
      {
        questionLatex: L`For $A=\begin{pmatrix}0&1\\-1&0\end{pmatrix}$, $A^{2026}$ equals`,
        difficulty: 3,
        skillTags: ["matrix_powers", "periodicity"],
        choices: [
          L`$I$`,
          L`$-I$`,
          L`$A$`,
          L`$-A$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses the period but reduces $2026$ as $0$ modulo $4$ instead of $2$.",
          C: "This corresponds to exponent $1$ modulo $4$.",
          D: "This corresponds to exponent $3$ modulo $4$.",
        },
        misconceptionTags: {
          A: "wrong_modulo_reduction",
          C: "uses_first_power_case",
          D: "uses_third_power_case",
        },
        hints: [
          "First compute $A^2$.",
          "$A^2=-I$, so powers repeat with period $4$.",
          "Reduce $2026$ modulo $4$.",
        ],
        solution: solution(
          L`Since $A^2=-I$ and $2026\equiv2\pmod4$, $A^{2026}=A^2=-I$.`,
          L`-I`,
        ),
      },
      {
        questionLatex: L`If an invertible matrix $A$ satisfies $A^2-3A+2I=0$, then $A^{-1}$ equals`,
        difficulty: 4,
        skillTags: ["matrix_polynomial", "inverse_from_polynomial"],
        choices: [
          L`$\dfrac{3I-A}{2}$`,
          L`$\dfrac{A-3I}{2}$`,
          L`$\dfrac{2I-A}{3}$`,
          L`$3I-2A$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This has the sign reversed after multiplying by $A^{-1}$.",
          C: "This divides by the coefficient of $A$ instead of the constant term.",
          D: "This skips the division by $2$.",
        },
        misconceptionTags: {
          B: "sign_error_in_inverse_polynomial",
          C: "uses_wrong_coefficient",
          D: "misses_scalar_division",
        },
        hints: [
          "Multiply the equation by $A^{-1}$.",
          "Use $A^2A^{-1}=A$ and $IA^{-1}=A^{-1}$.",
          "Solve the resulting linear equation for $A^{-1}$.",
        ],
        solution: solution(
          L`Multiplying by $A^{-1}$ gives $A-3I+2A^{-1}=0$, so $A^{-1}=(3I-A)/2$.`,
          L`\frac{3I-A}{2}`,
        ),
      },
      {
        questionLatex: L`For a $2\times2$ matrix $A$, if $\operatorname{tr}A=5$ and $\det A=6$, then $\operatorname{tr}(A^2)$ is`,
        difficulty: 4,
        skillTags: ["cayley_hamilton_trace", "trace_determinant"],
        choices: [L`$7$`, L`$13$`, L`$19$`, L`$25$`],
        correctLetter: "B",
        rationales: {
          A: "This subtracts $3\\det A$ instead of $2\\det A$.",
          C: "This subtracts only one determinant from $(\\operatorname{tr}A)^2$.",
          D: "This squares the trace but ignores the determinant correction.",
        },
        misconceptionTags: {
          A: "wrong_trace_identity_coefficient",
          C: "subtracts_one_determinant",
          D: "confuses_trace_square_with_trace_of_square",
        },
        hints: [
          "For a $2\\times2$ matrix, use the characteristic relation.",
          "$A^2-(\\operatorname{tr}A)A+(\\det A)I=0$.",
          "Take trace on both sides.",
        ],
        solution: solution(
          L`Taking trace in $A^2-5A+6I=0$ gives $\operatorname{tr}(A^2)-25+12=0$, so $\operatorname{tr}(A^2)=13$.`,
          L`13`,
        ),
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $A^2=0$, then $\det(I+A)$ is`,
        difficulty: 4,
        skillTags: ["nilpotent_matrix", "determinant_of_shift"],
        choices: [L`$0$`, L`$1$`, L`$2$`, L`$8$`],
        correctLetter: "B",
        rationales: {
          A: "Nilpotent $A$ is singular, but $I+A$ need not be singular.",
          C: "This treats $I+A$ as if its determinant were $1+\\operatorname{tr}A$ without justification.",
          D: "This assumes all diagonal entries of $I+A$ are $2$.",
        },
        misconceptionTags: {
          A: "transfers_singularity_to_shift",
          C: "uses_trace_as_determinant",
          D: "adds_entries_to_identity_diagonal",
        },
        hints: [
          "If $A^2=0$, every eigenvalue of $A$ is $0$.",
          "Then every eigenvalue of $I+A$ is $1$.",
          "The determinant is the product of eigenvalues.",
        ],
        solution: solution(
          L`Since $A^2=0$, the eigenvalues of $A$ are all $0$. Thus the eigenvalues of $I+A$ are all $1$, and $\det(I+A)=1$.`,
          L`1`,
        ),
      },
      {
        questionLatex: L`Let $A$ be $2\times3$ and $B$ be $3\times2$. If $AB=\begin{pmatrix}2&1\\0&3\end{pmatrix}$, then $\operatorname{tr}(BA)$ is`,
        difficulty: 3,
        skillTags: ["rectangular_matrix_product", "trace_cyclic_property"],
        choices: [L`$2$`, L`$3$`, L`$5$`, L`$\text{not defined}$`],
        correctLetter: "C",
        rationales: {
          A: "This keeps only the first diagonal entry of $AB$.",
          B: "This keeps only the second diagonal entry of $AB$.",
          D: "$BA$ is a $3\\times3$ matrix, so its trace is defined.",
        },
        misconceptionTags: {
          A: "partial_trace",
          B: "partial_trace",
          D: "misreads_product_order",
        },
        hints: [
          "The product $BA$ is $3\\times3$.",
          "For compatible rectangular products, $\\operatorname{tr}(AB)=\\operatorname{tr}(BA)$.",
          "Find the trace of the given $AB$.",
        ],
        solution: solution(
          L`Here $\operatorname{tr}(BA)=\operatorname{tr}(AB)=2+3=5$.`,
          L`5`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`For $A=\begin{pmatrix}1&2\\0&1\end{pmatrix}$, find the sum of all entries of $A^8$.`,
        difficulty: 3,
        skillTags: ["matrix_powers", "nilpotent_part"],
        promptMarkdown: "Enter the sum of entries.",
        numericAnswer: 18,
        hints: [
          "Write $A=I+N$.",
          "Use $N^2=0$.",
          "The upper-right entry of $A^8$ is $16$.",
        ],
        rubric: [
          "Uses the nilpotent split $A=I+N$.",
          "Computes all entries of $A^8$ before summing.",
        ],
        commonErrors: [
          "Using upper-right entry $8$ instead of $16$.",
          "Raising each entry independently.",
        ],
        solution:
          L`Since $A=I+N$ with $N^2=0$, $A^8=I+8N=\begin{pmatrix}1&16\\0&1\end{pmatrix}$. The sum of entries is $18$.`,
      },
      {
        questionLatex: L`Find the number of $2\times2$ matrices with entries from $\{0,1\}$ that are symmetric and have trace $1$.`,
        difficulty: 3,
        skillTags: ["symmetric_matrix_counting", "trace"],
        promptMarkdown: "Enter the number of matrices.",
        numericAnswer: 4,
        hints: [
          "A symmetric $2\\times2$ zero-one matrix has one free off-diagonal value.",
          "Trace $1$ means exactly one diagonal entry is $1$.",
          "Multiply the diagonal choices by the off-diagonal choices.",
        ],
        rubric: [
          "Counts diagonal configurations satisfying trace $1$.",
          "Accounts for the shared off-diagonal entry.",
        ],
        commonErrors: [
          "Choosing both off-diagonal entries independently.",
          "Forgetting one diagonal can be the $1$.",
        ],
        solution:
          L`The diagonal can be $(1,0)$ or $(0,1)$, and the common off-diagonal entry can be $0$ or $1$. Hence the count is $2\cdot2=4$.`,
      },
      {
        questionLatex: L`For $A=\begin{pmatrix}2&1\\0&2\end{pmatrix}$, find the $(1,2)$ entry of $A^5$.`,
        difficulty: 4,
        skillTags: ["jordan_block_power", "matrix_powers"],
        promptMarkdown: "Enter the $(1,2)$ entry.",
        numericAnswer: 80,
        hints: [
          "Write $A=2I+N$ where $N^2=0$.",
          "$(2I+N)^5=2^5I+5\\cdot2^4N$.",
          "The $(1,2)$ entry of $N$ is $1$.",
        ],
        rubric: [
          "Uses binomial expansion for a nilpotent perturbation.",
          "Keeps the scalar factor $2^4$ in the linear term.",
        ],
        commonErrors: [
          "Returning $5$ from only the binomial coefficient.",
          "Using $2^5$ instead of $5\\cdot2^4$ for the off-diagonal entry.",
        ],
        solution:
          L`With $N=\begin{pmatrix}0&1\\0&0\end{pmatrix}$, $A=2I+N$ and $N^2=0$. Thus $A^5=32I+80N$, so the required entry is $80$.`,
      },
      {
        questionLatex: L`A real $2\times2$ skew-symmetric matrix $K$ has integer entries and is not the zero matrix. If $\det K\le25$, find the number of possible matrices.`,
        difficulty: 3,
        skillTags: ["skew_symmetric_matrix", "integer_parameter_count"],
        promptMarkdown: "Enter the count.",
        numericAnswer: 10,
        hints: [
          "Every real $2\\times2$ skew-symmetric matrix has the form $\\begin{pmatrix}0&t\\\\-t&0\\end{pmatrix}$.",
          "Its determinant is $t^2$.",
          "Count nonzero integers $t$ with $t^2\\le25$.",
        ],
        rubric: [
          "Writes the correct one-parameter form.",
          "Counts both positive and negative nonzero values.",
        ],
        commonErrors: [
          "Including the zero matrix.",
          "Counting only positive $t$.",
        ],
        solution:
          L`The matrix is $\begin{pmatrix}0&t\\-t&0\end{pmatrix}$ with $t\in\mathbb Z\setminus\{0\}$ and $t^2\le25$. Thus $t=\pm1,\pm2,\pm3,\pm4,\pm5$, giving $10$ matrices.`,
      },
      {
        questionLatex: L`If $A^2=3A-2I$, and $A^5=mA+nI$, find $m+n$.`,
        difficulty: 4,
        skillTags: ["matrix_polynomial", "power_reduction"],
        promptMarkdown: "Enter $m+n$.",
        numericAnswer: 1,
        hints: [
          "Reduce higher powers using $A^2=3A-2I$.",
          "The same recurrence is satisfied by powers of roots $1$ and $2$.",
          "A compact form is $A^k=(2^k-1)A+(2-2^k)I$.",
        ],
        rubric: [
          "Reduces $A^5$ using the quadratic relation.",
          "Identifies both coefficients before adding.",
        ],
        commonErrors: [
          "Substituting scalar roots directly for $A$.",
          "Stopping at $A^3$ and extrapolating linearly.",
        ],
        solution:
          L`Using $A^k=(2^k-1)A+(2-2^k)I$, we get $A^5=31A-30I$. Hence $m+n=31-30=1$.`,
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Determinant Properties and Evaluation",
    subtopic:
      "Order two and three determinants, row-column operations, adjoint determinant identities, and parameter tests.",
    mc: [
      {
        questionLatex: L`The determinant $\begin{vmatrix}1&1&1\\a&b&c\\a^2&b^2&c^2\end{vmatrix}$ equals`,
        difficulty: 4,
        skillTags: ["vandermonde_determinant", "determinant_formula"],
        choices: [
          L`$(b-a)(c-a)(c-b)$`,
          L`$(a-b)(b-c)(c-a)$`,
          L`$(a+b+c)(ab+bc+ca)$`,
          L`$(a-b)^2+(b-c)^2+(c-a)^2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This has the sign/order wrong for the column-wise Vandermonde determinant.",
          C: "This is a symmetric expression, but the determinant must change sign when two columns are exchanged.",
          D: "This cannot be correct because it does not vanish with the required multiplicity and is not alternating.",
        },
        misconceptionTags: {
          B: "vandermonde_sign_error",
          C: "uses_symmetric_expression_for_alternating_determinant",
          D: "uses_non_factorized_difference_expression",
        },
        hints: [
          "This is a Vandermonde determinant in the columns $a,b,c$.",
          "It must vanish when any two of $a,b,c$ are equal.",
          "Check the sign using a simple substitution like $(a,b,c)=(1,2,3)$.",
        ],
        solution: solution(
          L`The column-wise Vandermonde determinant is $(b-a)(c-a)(c-b)$.`,
          L`(b-a)(c-a)(c-b)`,
        ),
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $\det A=3$, then $\det(2A^{-1})$ is`,
        difficulty: 3,
        skillTags: ["determinant_of_inverse", "scalar_multiple_determinant"],
        choices: [L`$\dfrac{2}{3}$`, L`$\dfrac{8}{3}$`, L`$6$`, L`$24$`],
        correctLetter: "B",
        rationales: {
          A: "This multiplies by $2$ instead of $2^3$ for a $3\\times3$ matrix.",
          C: "This multiplies $\\det A$ by $2$ instead of using $A^{-1}$.",
          D: "This multiplies $\\det A$ by $2^3$ instead of dividing by $\\det A$.",
        },
        misconceptionTags: {
          A: "forgets_order_in_scalar_multiple",
          C: "ignores_inverse",
          D: "uses_det_A_instead_of_inverse",
        },
        hints: [
          "$\\det(A^{-1})=1/\\det A$.",
          "For a $3\\times3$ matrix, $\\det(2M)=2^3\\det M$.",
          "Combine both facts.",
        ],
        solution: solution(
          L`$\det(2A^{-1})=2^3\det(A^{-1})=8/3$.`,
          L`\frac83`,
        ),
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $\det A=2$, then $\det(A\,\operatorname{adj}A)$ is`,
        difficulty: 4,
        skillTags: ["adjoint_identity", "determinant"],
        choices: [L`$4$`, L`$8$`, L`$16$`, L`$32$`],
        correctLetter: "B",
        rationales: {
          A: "This computes $\\det(\\operatorname{adj}A)$ only.",
          C: "This squares the determinant of $A\\operatorname{adj}A$ one extra time.",
          D: "This uses $2^5$ without using the matrix order correctly.",
        },
        misconceptionTags: {
          A: "stops_at_adjoint_determinant",
          C: "extra_power_of_determinant",
          D: "wrong_order_power",
        },
        hints: [
          "Use $A\\operatorname{adj}A=(\\det A)I$.",
          "Here this becomes $2I_3$.",
          "Take determinant of $2I_3$.",
        ],
        solution: solution(
          L`$A\operatorname{adj}A=(\det A)I=2I_3$, so $\det(A\operatorname{adj}A)=\det(2I_3)=2^3=8$.`,
          L`8`,
        ),
      },
      {
        questionLatex: L`The determinant of $\begin{pmatrix}1&2&3\\3&1&2\\2&3&1\end{pmatrix}$ is`,
        difficulty: 3,
        skillTags: ["circulant_determinant", "determinant_evaluation"],
        choices: [L`$0$`, L`$12$`, L`$18$`, L`$36$`],
        correctLetter: "C",
        rationales: {
          A: "The row sums are equal, but that does not make the determinant zero.",
          B: "This misses one of the cyclic products in the expansion.",
          D: "This computes $a^3+b^3+c^3$ but forgets the $-3abc$ term.",
        },
        misconceptionTags: {
          A: "misuses_equal_row_sum",
          B: "minor_expansion_omission",
          D: "forgets_circulant_subtraction",
        },
        hints: [
          "Use the formula $a^3+b^3+c^3-3abc$ for this cyclic form.",
          "Here $(a,b,c)=(1,2,3)$.",
          "Compute $1+8+27-18$.",
        ],
        solution: solution(
          L`For the cyclic determinant, the value is $1^3+2^3+3^3-3(1)(2)(3)=36-18=18$.`,
          L`18`,
        ),
      },
      {
        questionLatex: L`For which value of $k$ is $\begin{vmatrix}1&1&1\\1&2&3\\1&4&k\end{vmatrix}=0$?`,
        difficulty: 3,
        skillTags: ["determinant_parameter", "row_reduction"],
        choices: [L`$5$`, L`$6$`, L`$7$`, L`$8$`],
        correctLetter: "C",
        rationales: {
          A: "This comes from subtracting the wrong multiple in the last row.",
          B: "This misses the constant shift after $R_3-R_1$.",
          D: "This has the final sign shifted by one.",
        },
        misconceptionTags: {
          A: "row_operation_arithmetic_error",
          B: "constant_term_error",
          D: "parameter_shift_error",
        },
        hints: [
          "Replace $R_2$ and $R_3$ by their difference with $R_1$.",
          "The determinant becomes $\\begin{vmatrix}1&1&1\\\\0&1&2\\\\0&3&k-1\\end{vmatrix}$.",
          "Now use the lower $2\\times2$ determinant.",
        ],
        solution: solution(
          L`After row reduction the determinant is $(k-1)-6=k-7$. Setting it to zero gives $k=7$.`,
          L`7`,
        ),
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $\det A=-3$, then the determinant of the matrix obtained by multiplying every entry of $A$ by $2$ is`,
        difficulty: 3,
        skillTags: ["scalar_multiple_determinant", "matrix_order"],
        choices: [L`$-6$`, L`$-12$`, L`$-24$`, L`$24$`],
        correctLetter: "C",
        rationales: {
          A: "This multiplies the determinant by $2$ instead of $2^3$.",
          B: "This uses $2^2$ as if the matrix were order $2$.",
          D: "This loses the negative sign of $\\det A$.",
        },
        misconceptionTags: {
          A: "forgets_order_power",
          B: "uses_wrong_matrix_order",
          D: "sign_error",
        },
        hints: [
          "Multiplying every entry by $2$ gives the matrix $2A$.",
          "For order $3$, $\\det(2A)=2^3\\det A$.",
          "Keep the sign of $\\det A$.",
        ],
        solution: solution(
          L`$\det(2A)=2^3\det A=8(-3)=-24$.`,
          L`-24`,
        ),
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $\det A=5$, then $\det(\operatorname{adj}(\operatorname{adj}A))$ is`,
        difficulty: 5,
        skillTags: ["iterated_adjoint", "determinant_identity"],
        choices: [L`$25$`, L`$125$`, L`$625$`, L`$3125$`],
        correctLetter: "C",
        rationales: {
          A: "This is only $\\det(\\operatorname{adj}A)$ for a $2\\times2$-style mistake.",
          B: "This uses $5^3$ but not the adjoint determinant rule twice.",
          D: "This adds one extra power of $5$.",
        },
        misconceptionTags: {
          A: "wrong_adjoint_power",
          B: "incomplete_iterated_adjoint",
          D: "extra_power",
        },
        hints: [
          "For order $3$, $\\det(\\operatorname{adj}A)=(\\det A)^2$.",
          "Apply the same rule to $\\operatorname{adj}A$.",
          "Square $25$.",
        ],
        solution: solution(
          L`$\det(\operatorname{adj}A)=5^2=25$. Therefore $\det(\operatorname{adj}(\operatorname{adj}A))=25^2=625$.`,
          L`625`,
        ),
      },
      {
        questionLatex: L`Let $u=\begin{pmatrix}1\\2\\3\end{pmatrix}$ and $v=\begin{pmatrix}2\\-1\\1\end{pmatrix}$. The value of $\det(I_3+uv^T)$ is`,
        difficulty: 5,
        skillTags: ["rank_one_update", "determinant_property"],
        choices: [L`$1$`, L`$3$`, L`$4$`, L`$6$`],
        correctLetter: "C",
        rationales: {
          A: "This assumes adding a rank-one matrix leaves the determinant unchanged.",
          B: "This computes $v^Tu$ but forgets the additional $1$.",
          D: "This adds the entries of $u$ instead of using $v^Tu$.",
        },
        misconceptionTags: {
          A: "ignores_rank_one_update",
          B: "misses_identity_term",
          D: "uses_wrong_dot_product",
        },
        hints: [
          "Use $\\det(I+uv^T)=1+v^Tu$ for a column $u$ and row $v^T$.",
          "Compute $v^Tu=2(1)-1(2)+1(3)$.",
          "Add $1$ to the dot product.",
        ],
        solution: solution(
          L`Here $v^Tu=2-2+3=3$, so $\det(I_3+uv^T)=1+3=4$.`,
          L`4`,
        ),
      },
      {
        questionLatex: L`A determinant $D$ changes by replacing $R_2$ with $R_2+2R_3$ and then interchanging $R_1$ and $R_3$. If the original determinant is $-4$, the final determinant is`,
        difficulty: 3,
        skillTags: ["row_operations", "determinant_sign"],
        choices: [L`$-8$`, L`$-4$`, L`$4$`, L`$8$`],
        correctLetter: "C",
        rationales: {
          A: "This incorrectly multiplies the determinant by the coefficient $2$.",
          B: "This accounts for the replacement but misses the row interchange.",
          D: "This both multiplies by $2$ and changes the sign.",
        },
        misconceptionTags: {
          A: "misuses_row_replacement",
          B: "misses_row_swap_sign",
          D: "double_row_operation_error",
        },
        hints: [
          "Adding a multiple of one row to another does not change a determinant.",
          "Interchanging two rows changes the sign.",
          "Apply these effects in order.",
        ],
        solution: solution(
          L`The row replacement leaves the determinant $-4$. The row interchange changes its sign, so the final determinant is $4$.`,
          L`4`,
        ),
      },
      {
        questionLatex: L`If $A$ is a real $3\times3$ skew-symmetric matrix, then $\det A$ is necessarily`,
        difficulty: 4,
        skillTags: ["skew_symmetric_matrix", "determinant_transpose"],
        choices: [L`$-1$`, L`$0$`, L`$1$`, L`$\operatorname{tr}A$ only when $A$ is diagonal`],
        correctLetter: "B",
        rationales: {
          A: "The determinant is forced to be zero, not a fixed negative number.",
          C: "Odd-order skew-symmetric matrices are singular.",
          D: "The trace statement is irrelevant; skew-symmetry already forces singularity in odd order.",
        },
        misconceptionTags: {
          A: "assumes_fixed_nonzero_determinant",
          C: "misses_odd_order_singularity",
          D: "uses_trace_irrelevantly",
        },
        hints: [
          "For skew-symmetric $A$, $A^T=-A$.",
          "Take determinants on both sides.",
          "Use order $3$.",
        ],
        solution: solution(
          L`Since $A^T=-A$, $\det A=\det(A^T)=\det(-A)=(-1)^3\det A=-\det A$. Hence $2\det A=0$ and $\det A=0$.`,
          L`0`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`Find $\begin{vmatrix}1&1&1\\1&3&4\\1&9&16\end{vmatrix}$.`,
        difficulty: 3,
        skillTags: ["vandermonde_determinant", "determinant_evaluation"],
        promptMarkdown: "Enter the determinant.",
        numericAnswer: 6,
        hints: [
          "Recognize a Vandermonde determinant with $a=1,b=3,c=4$.",
          "Use $(b-a)(c-a)(c-b)$.",
          "Compute $2\\cdot3\\cdot1$.",
        ],
        rubric: [
          "Identifies the Vandermonde structure.",
          "Keeps the correct sign/order.",
        ],
        commonErrors: [
          "Using the negative Vandermonde order.",
          "Squaring the differences.",
        ],
        solution:
          L`The determinant is $(3-1)(4-1)(4-3)=2\cdot3\cdot1=6$.`,
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $\det A=-2$, find $\det(3\operatorname{adj}A)$.`,
        difficulty: 4,
        skillTags: ["adjoint_determinant", "scalar_multiple_determinant"],
        promptMarkdown: "Enter the determinant.",
        numericAnswer: 108,
        hints: [
          "For order $3$, $\\det(\\operatorname{adj}A)=(\\det A)^2$.",
          "Multiplying a $3\\times3$ matrix by $3$ multiplies determinant by $27$.",
          "Use $(-2)^2=4$.",
        ],
        rubric: [
          "Computes determinant of the adjoint correctly.",
          "Applies the scalar multiple factor for order $3$.",
        ],
        commonErrors: [
          "Keeping the negative sign after squaring $\\det A$.",
          "Multiplying by $3$ instead of $27$.",
        ],
        solution:
          L`$\det(\operatorname{adj}A)=(-2)^2=4$, so $\det(3\operatorname{adj}A)=3^3\cdot4=108$.`,
      },
      {
        questionLatex: L`Find the number of integer values of $x$ for which $\begin{vmatrix}x&1&1\\1&x&1\\1&1&x\end{vmatrix}=0$.`,
        difficulty: 4,
        skillTags: ["symmetric_determinant", "integer_parameter_count"],
        promptMarkdown: "Enter the number of integer values.",
        numericAnswer: 2,
        hints: [
          "This determinant has diagonal $x$ and off-diagonal $1$.",
          "Its value is $(x-1)^2(x+2)$.",
          "Count distinct integer roots.",
        ],
        rubric: [
          "Uses or derives the determinant factorization.",
          "Counts distinct integer parameter values.",
        ],
        commonErrors: [
          "Counting $x=1$ twice because it is a repeated root.",
          "Missing $x=-2$.",
        ],
        solution:
          L`The determinant is $(x-1)^2(x+2)$. Thus $x=1$ or $x=-2$, giving $2$ integer values.`,
      },
      {
        questionLatex: L`Find the sum of all real values of $k$ for which $\begin{vmatrix}k&1&0\\1&k&1\\0&1&k\end{vmatrix}=0$.`,
        difficulty: 4,
        skillTags: ["determinant_parameter", "root_sum"],
        promptMarkdown: "Enter the sum of distinct values.",
        numericAnswer: 0,
        hints: [
          "Expand along the first row.",
          "The determinant is $k(k^2-1)-k$.",
          "Solve $k(k^2-2)=0$ and add the real roots.",
        ],
        rubric: [
          "Finds the determinant roots.",
          "Adds all real parameter values, including irrational roots.",
        ],
        commonErrors: [
          "Missing the root $k=0$.",
          "Dropping one of the two irrational roots.",
        ],
        solution:
          L`The determinant is $k(k^2-1)-k=k(k^2-2)$. The real roots are $0,\sqrt2,-\sqrt2$, whose sum is $0$.`,
      },
      {
        questionLatex: L`Find $\begin{vmatrix}2&1&3\\0&-1&4\\1&2&0\end{vmatrix}$.`,
        difficulty: 3,
        skillTags: ["determinant_evaluation", "minor_expansion"],
        promptMarkdown: "Enter the determinant.",
        numericAnswer: -9,
        hints: [
          "Expand along the first row.",
          "Keep the signs $+,-,+$.",
          "The three contributions are $-16$, $4$, and $3$.",
        ],
        rubric: [
          "Uses a valid determinant expansion or row reduction.",
          "Keeps cofactor signs correctly.",
        ],
        commonErrors: [
          "Using all positive signs in the expansion.",
          "Dropping the contribution from the third entry.",
        ],
        solution:
          L`Expanding along the first row gives $2(-8)-1(-4)+3(1)=-16+4+3=-9$.`,
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Adjoint, Inverse, and Matrix Equations",
    subtopic:
      "Inverse computation, adjoint identities, invertibility parameters, and algebraic matrix equations.",
    mc: [
      {
        questionLatex: L`The inverse of $\begin{pmatrix}1&2\\3&7\end{pmatrix}$ is`,
        difficulty: 3,
        skillTags: ["two_by_two_inverse", "adjoint"],
        choices: [
          L`$\begin{pmatrix}7&-2\\-3&1\end{pmatrix}$`,
          L`$\begin{pmatrix}7&2\\3&1\end{pmatrix}$`,
          L`$\begin{pmatrix}1&-2\\-3&7\end{pmatrix}$`,
          L`$\dfrac{1}{13}\begin{pmatrix}7&-2\\-3&1\end{pmatrix}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This does not change signs of the off-diagonal entries in the adjoint.",
          C: "This keeps the diagonal entries in place instead of swapping them.",
          D: "The determinant is $1$, not $13$.",
        },
        misconceptionTags: {
          B: "off_diagonal_sign_error",
          C: "does_not_swap_diagonal_entries",
          D: "wrong_determinant",
        },
        hints: [
          "For $\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$, use $\\dfrac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}$.",
          "Here the determinant is $7-6$.",
          "So no scalar denominator remains.",
        ],
        solution: solution(
          L`The determinant is $1\cdot7-2\cdot3=1$, so the inverse is $\begin{pmatrix}7&-2\\-3&1\end{pmatrix}$.`,
          L`\begin{pmatrix}7&-2\\-3&1\end{pmatrix}`,
        ),
      },
      {
        questionLatex: L`If $\begin{pmatrix}1&2\\2&5\end{pmatrix}\begin{pmatrix}x\\y\end{pmatrix}=\begin{pmatrix}3\\7\end{pmatrix}$, then $(x,y)$ is`,
        difficulty: 3,
        skillTags: ["matrix_equation", "linear_system"],
        choices: [
          L`$(1,1)$`,
          L`$(2,1)$`,
          L`$(1,2)$`,
          L`$(-1,2)$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This satisfies the second equation incorrectly: $4+5\\ne7$.",
          C: "This satisfies the first equation incorrectly: $1+4\\ne3$.",
          D: "This comes from a sign error in the inverse matrix.",
        },
        misconceptionTags: {
          B: "substitution_check_failure",
          C: "substitution_check_failure",
          D: "inverse_sign_error",
        },
        hints: [
          "The determinant of the coefficient matrix is $1$.",
          "Its inverse is $\\begin{pmatrix}5&-2\\\\-2&1\\end{pmatrix}$.",
          "Multiply this inverse by the right-hand column.",
        ],
        solution: solution(
          L`$\begin{pmatrix}5&-2\\-2&1\end{pmatrix}\begin{pmatrix}3\\7\end{pmatrix}=\begin{pmatrix}1\\1\end{pmatrix}$, so $(x,y)=(1,1)$.`,
          L`(1,1)`,
        ),
      },
      {
        questionLatex: L`If an invertible matrix $A$ satisfies $A^2=2A+3I$, then $A^{-1}$ is`,
        difficulty: 4,
        skillTags: ["matrix_polynomial", "inverse_from_polynomial"],
        choices: [
          L`$\dfrac{A-2I}{3}$`,
          L`$\dfrac{2I-A}{3}$`,
          L`$\dfrac{A+2I}{3}$`,
          L`$3A-2I$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This has the sign reversed after factoring $A(A-2I)$.",
          C: "This changes the sign of the $2I$ term.",
          D: "This misses the division by $3$ and the placement of $A$.",
        },
        misconceptionTags: {
          B: "inverse_polynomial_sign_error",
          C: "wrong_constant_sign",
          D: "scalar_factor_error",
        },
        hints: [
          "Rewrite as $A^2-2A=3I$.",
          "Factor the left side as $A(A-2I)$.",
          "Compare with $AA^{-1}=I$.",
        ],
        solution: solution(
          L`$A^2-2A=3I$ gives $A(A-2I)=3I$, hence $A^{-1}=(A-2I)/3$.`,
          L`\frac{A-2I}{3}`,
        ),
      },
      {
        questionLatex: L`If $A$ is an invertible $3\times3$ matrix and $\operatorname{adj}A=A^T$, then $\det A$ is`,
        difficulty: 4,
        skillTags: ["adjoint_identity", "determinant_transpose"],
        choices: [L`$-1$`, L`$0$`, L`$1$`, L`$3$`],
        correctLetter: "C",
        rationales: {
          A: "Taking determinants gives $\\det A=1$, not merely $|\\det A|=1$.",
          B: "The matrix is stated to be invertible, so its determinant is nonzero.",
          D: "The order of the matrix is not itself the determinant.",
        },
        misconceptionTags: {
          A: "loses_sign_constraint",
          B: "ignores_invertibility",
          D: "confuses_order_with_determinant",
        },
        hints: [
          "Take determinants on both sides of $\\operatorname{adj}A=A^T$.",
          "For order $3$, $\\det(\\operatorname{adj}A)=(\\det A)^2$.",
          "Also $\\det(A^T)=\\det A$.",
        ],
        solution: solution(
          L`Taking determinants gives $(\det A)^2=\det A$. Since $A$ is invertible, $\det A\ne0$, so $\det A=1$.`,
          L`1`,
        ),
      },
      {
        questionLatex: L`If $A$ is a $2\times2$ invertible matrix with $\det A=3$, then $\det(\operatorname{adj}(A^{-1}))$ is`,
        difficulty: 4,
        skillTags: ["adjoint_of_inverse", "determinant_identity"],
        choices: [L`$\dfrac{1}{3}$`, L`$3$`, L`$\dfrac{1}{9}$`, L`$9$`],
        correctLetter: "A",
        rationales: {
          B: "This uses $\\det A$ instead of $\\det(A^{-1})$.",
          C: "For a $2\\times2$ matrix, $\\det(\\operatorname{adj}M)=\\det M$, not $(\\det M)^2$.",
          D: "This squares $\\det A$ in the wrong direction.",
        },
        misconceptionTags: {
          B: "uses_det_A_not_inverse",
          C: "uses_order_three_adjoint_rule",
          D: "squares_wrong_determinant",
        },
        hints: [
          "$\\det(A^{-1})=1/3$.",
          "For order $2$, $\\det(\\operatorname{adj}M)=(\\det M)^{1}$.",
          "Apply this to $M=A^{-1}$.",
        ],
        solution: solution(
          L`Since $A^{-1}$ is $2\times2$, $\det(\operatorname{adj}(A^{-1}))=\det(A^{-1})=1/3$.`,
          L`\frac13`,
        ),
      },
      {
        questionLatex: L`If $A=\begin{pmatrix}1&t\\0&1\end{pmatrix}$ and the sum of all entries of $A^{-1}$ is $5$, then $t$ equals`,
        difficulty: 3,
        skillTags: ["inverse_matrix", "parameter"],
        choices: [L`$-3$`, L`$-1$`, L`$1$`, L`$3$`],
        correctLetter: "A",
        rationales: {
          B: "This gives entry-sum $3$, not $5$.",
          C: "This gives entry-sum $1$, because the inverse has $-t$.",
          D: "This ignores the sign change in the inverse.",
        },
        misconceptionTags: {
          B: "arithmetic_check_failure",
          C: "misses_inverse_sign",
          D: "uses_A_not_inverse",
        },
        hints: [
          "Find $A^{-1}$ for an upper triangular matrix.",
          "$A^{-1}=\\begin{pmatrix}1&-t\\\\0&1\\end{pmatrix}$.",
          "The entry sum is $2-t$.",
        ],
        solution: solution(
          L`$A^{-1}=\begin{pmatrix}1&-t\\0&1\end{pmatrix}$, so the sum is $2-t=5$. Hence $t=-3$.`,
          L`-3`,
        ),
      },
      {
        questionLatex: L`For invertible square matrices $A$ and $B$ of the same order, $(ABA^{-1})^{-1}$ equals`,
        difficulty: 3,
        skillTags: ["inverse_of_product", "matrix_order"],
        choices: [
          L`$AB^{-1}A^{-1}$`,
          L`$A^{-1}B^{-1}A$`,
          L`$A^{-1}BA$`,
          L`$ABA$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This reverses all three factors without respecting that the first factor is $A$ and the last is $A^{-1}$.",
          C: "This inverts the outside factors incorrectly and leaves $B$ uninverted.",
          D: "This does not invert $B$ and drops $A^{-1}$.",
        },
        misconceptionTags: {
          B: "wrong_product_inverse_order",
          C: "does_not_invert_middle_factor",
          D: "drops_inverse_factors",
        },
        hints: [
          "Use $(PQR)^{-1}=R^{-1}Q^{-1}P^{-1}$.",
          "Here $P=A$, $Q=B$, $R=A^{-1}$.",
          "The inverse of $A^{-1}$ is $A$.",
        ],
        solution: solution(
          L`$(ABA^{-1})^{-1}=(A^{-1})^{-1}B^{-1}A^{-1}=AB^{-1}A^{-1}$.`,
          L`AB^{-1}A^{-1}`,
        ),
      },
      {
        questionLatex: L`If $A$ is an invertible $3\times3$ matrix, then $\operatorname{adj}(5A)$ equals`,
        difficulty: 4,
        skillTags: ["adjoint_scalar_multiple", "matrix_order"],
        choices: [
          L`$5\operatorname{adj}A$`,
          L`$25\operatorname{adj}A$`,
          L`$125\operatorname{adj}A$`,
          L`$\dfrac{1}{5}\operatorname{adj}A$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses the scalar power for order $2$, not order $3$.",
          C: "This uses the determinant scaling power instead of adjoint scaling.",
          D: "This treats the scalar multiple like an inverse scaling.",
        },
        misconceptionTags: {
          A: "wrong_adjoint_scalar_power",
          C: "uses_determinant_scaling",
          D: "inverse_scaling_error",
        },
        hints: [
          "For order $n$, $\\operatorname{adj}(cA)=c^{n-1}\\operatorname{adj}A$.",
          "Here $n=3$.",
          "So the scalar power is $5^2$.",
        ],
        solution: solution(
          L`For a $3\times3$ matrix, $\operatorname{adj}(5A)=5^{2}\operatorname{adj}A=25\operatorname{adj}A$.`,
          L`25\operatorname{adj}A`,
        ),
      },
      {
        questionLatex: L`If $A=\begin{pmatrix}2&1\\1&1\end{pmatrix}$, then the sum of all entries of $A^{-1}+A$ is`,
        difficulty: 3,
        skillTags: ["inverse_matrix", "entry_sum"],
        choices: [L`$4$`, L`$5$`, L`$6$`, L`$7$`],
        correctLetter: "C",
        rationales: {
          A: "This uses only the sum of entries of $A^{-1}$.",
          B: "This drops one entry when summing $A$.",
          D: "This has the sign of an off-diagonal entry in $A^{-1}$ wrong.",
        },
        misconceptionTags: {
          A: "forgets_add_original_matrix",
          B: "entry_sum_omission",
          D: "inverse_sign_error",
        },
        hints: [
          "First compute $A^{-1}$; the determinant is $1$.",
          "$A^{-1}=\\begin{pmatrix}1&-1\\\\-1&2\\end{pmatrix}$.",
          "Add entry sums rather than matrices entry by entry if quicker.",
        ],
        solution: solution(
          L`The inverse is $\begin{pmatrix}1&-1\\-1&2\end{pmatrix}$, whose entry sum is $1$. The entry sum of $A$ is $5$, so the required sum is $6$.`,
          L`6`,
        ),
      },
      {
        questionLatex: L`For $A=\begin{pmatrix}1&2\\2&5\end{pmatrix}$, the matrix $X$ satisfying $AX=I$ is`,
        difficulty: 3,
        skillTags: ["matrix_equation", "inverse_matrix"],
        choices: [
          L`$\begin{pmatrix}5&-2\\-2&1\end{pmatrix}$`,
          L`$\begin{pmatrix}5&2\\2&1\end{pmatrix}$`,
          L`$\begin{pmatrix}1&-2\\-2&5\end{pmatrix}$`,
          L`$\dfrac{1}{9}\begin{pmatrix}5&-2\\-2&1\end{pmatrix}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This misses the negative signs in the adjoint.",
          C: "This does not swap the diagonal entries.",
          D: "The determinant is $1$, not $9$.",
        },
        misconceptionTags: {
          B: "off_diagonal_sign_error",
          C: "does_not_swap_diagonal_entries",
          D: "wrong_determinant",
        },
        hints: [
          "$AX=I$ means $X=A^{-1}$.",
          "The determinant of $A$ is $5-4=1$.",
          "Use the $2\\times2$ inverse formula.",
        ],
        solution: solution(
          L`Since $\det A=1$, $A^{-1}=\begin{pmatrix}5&-2\\-2&1\end{pmatrix}$, and this is $X$.`,
          L`\begin{pmatrix}5&-2\\-2&1\end{pmatrix}`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`For $A=\begin{pmatrix}2&1\\1&1\end{pmatrix}$, find the sum of all entries of $A^{-1}$.`,
        difficulty: 3,
        skillTags: ["inverse_matrix", "entry_sum"],
        promptMarkdown: "Enter the sum.",
        numericAnswer: 1,
        hints: [
          "The determinant is $1$.",
          "Use the $2\\times2$ inverse formula.",
          "Then add all four entries.",
        ],
        rubric: [
          "Computes the inverse matrix correctly.",
          "Sums all entries including negative entries.",
        ],
        commonErrors: [
          "Forgetting the negative signs.",
          "Summing entries of $A$ instead of $A^{-1}$.",
        ],
        solution:
          L`$A^{-1}=\begin{pmatrix}1&-1\\-1&2\end{pmatrix}$, so the sum of entries is $1-1-1+2=1$.`,
      },
      {
        questionLatex: L`Let $A=\begin{pmatrix}1&1\\0&1\end{pmatrix}$. If $AX=I+A$, find the sum of all entries of $X$.`,
        difficulty: 4,
        skillTags: ["matrix_equation", "inverse_matrix"],
        promptMarkdown: "Enter the sum of entries.",
        numericAnswer: 3,
        hints: [
          "Multiply on the left by $A^{-1}$.",
          "$A^{-1}=\\begin{pmatrix}1&-1\\\\0&1\\end{pmatrix}$.",
          "Compute $A^{-1}(I+A)$.",
        ],
        rubric: [
          "Solves the matrix equation by left multiplication.",
          "Adds all entries of the resulting matrix.",
        ],
        commonErrors: [
          "Multiplying on the wrong side.",
          "Using $A^{-1}+A$ instead of $A^{-1}(I+A)$.",
        ],
        solution:
          L`$X=A^{-1}(I+A)=\begin{pmatrix}1&-1\\0&1\end{pmatrix}\begin{pmatrix}2&1\\0&2\end{pmatrix}=\begin{pmatrix}2&-1\\0&2\end{pmatrix}$. The entry sum is $3$.`,
      },
      {
        questionLatex: L`If $A^2-5A+6I=0$ and $A^{-1}=pA+qI$, find $6(p+q)$.`,
        difficulty: 4,
        skillTags: ["matrix_polynomial", "inverse_from_polynomial"],
        promptMarkdown: "Enter $6(p+q)$.",
        numericAnswer: 4,
        hints: [
          "Multiply the polynomial equation by $A^{-1}$.",
          "Solve for $A^{-1}$ in terms of $A$ and $I$.",
          "Then identify $p$ and $q$.",
        ],
        rubric: [
          "Finds the inverse expression correctly.",
          "Evaluates the requested scaled sum.",
        ],
        commonErrors: [
          "Returning $p+q$ instead of $6(p+q)$.",
          "Reversing the signs of $p$ and $q$.",
        ],
        solution:
          L`Multiplying by $A^{-1}$ gives $A-5I+6A^{-1}=0$, so $A^{-1}=(-A+5I)/6$. Thus $p=-1/6$, $q=5/6$, and $6(p+q)=4$.`,
      },
      {
        questionLatex: L`Find the number of integers $k$ with $-5\le k\le5$ for which $\begin{pmatrix}k&1\\1&k\end{pmatrix}$ is invertible.`,
        difficulty: 3,
        skillTags: ["invertibility_parameter", "integer_count"],
        promptMarkdown: "Enter the count.",
        numericAnswer: 9,
        hints: [
          "A $2\\times2$ matrix is invertible iff its determinant is nonzero.",
          "The determinant is $k^2-1$.",
          "Exclude $k=1$ and $k=-1$ from the eleven integers.",
        ],
        rubric: [
          "Finds the determinant condition.",
          "Counts the allowed integer values in the interval.",
        ],
        commonErrors: [
          "Forgetting one of $\\pm1$.",
          "Counting only positive integers.",
        ],
        solution:
          L`The determinant is $k^2-1$, so the matrix is singular only for $k=\pm1$. From $11$ integers in $[-5,5]$, exclude $2$, giving $9$.`,
      },
      {
        questionLatex: L`If $A$ is a $3\times3$ matrix with $\det A=2$, find $\det(\operatorname{adj}(2A))$.`,
        difficulty: 5,
        skillTags: ["adjoint_determinant", "scalar_multiple_determinant"],
        promptMarkdown: "Enter the determinant.",
        numericAnswer: 256,
        hints: [
          "First find $\\det(2A)$.",
          "For order $3$, $\\det(2A)=2^3\\det A$.",
          "Then use $\\det(\\operatorname{adj}M)=(\\det M)^2$.",
        ],
        rubric: [
          "Applies scalar determinant scaling correctly.",
          "Applies the adjoint determinant rule to the scaled matrix.",
        ],
        commonErrors: [
          "Using $\\det(2A)=4$ instead of $16$.",
          "Using $\\det(\\operatorname{adj}M)=\\det M$ as if order were $2$.",
        ],
        solution:
          L`$\det(2A)=2^3\cdot2=16$. Therefore $\det(\operatorname{adj}(2A))=16^2=256$.`,
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Consistency and Linear Systems",
    subtopic:
      "Unique solution, no solution, infinitely many solutions, homogeneous systems, and Cramer's-rule style reasoning.",
    mc: [
      {
        questionLatex: L`For the system $x+y+z=3,\ x+2y+3z=6,\ x+4y+7z=10$, the system has`,
        difficulty: 4,
        skillTags: ["linear_system_consistency", "row_combination"],
        choices: [
          L`a unique solution`,
          L`no solution`,
          L`infinitely many solutions`,
          L`exactly two solutions`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The coefficient determinant is zero, so a unique solution is impossible.",
          C: "The dependent coefficient rows do not have matching constants.",
          D: "A linear system over real numbers cannot have exactly two solutions.",
        },
        misconceptionTags: {
          A: "ignores_zero_coefficient_determinant",
          C: "misses_augmented_inconsistency",
          D: "nonlinear_solution_count_assumption",
        },
        hints: [
          "Subtract the first equation from the second and third.",
          "You get $y+2z=3$ and $3y+6z=7$.",
          "Compare the second new equation with three times the first.",
        ],
        solution: solution(
          L`The first two equations give $y+2z=3$. The third minus the first gives $3y+6z=7$, but three times $y+2z=3$ gives $3y+6z=9$. Hence the system is inconsistent.`,
          L`\text{no solution}`,
        ),
      },
      {
        questionLatex: L`The system $x+y+z=1,\ 2x+3y+4z=5,\ 3x+4y+kz=6$ has infinitely many solutions when`,
        difficulty: 4,
        skillTags: ["infinite_solutions", "row_dependency"],
        choices: [L`$k=4$`, L`$k=5$`, L`$k=6$`, L`$k=7$`],
        correctLetter: "B",
        rationales: {
          A: "This makes only the coefficient determinant condition fail incorrectly.",
          C: "This matches the constant term but not the coefficient row dependency.",
          D: "This keeps the coefficient rows independent.",
        },
        misconceptionTags: {
          A: "wrong_dependent_row",
          C: "matches_rhs_only",
          D: "misses_determinant_condition",
        },
        hints: [
          "For infinitely many solutions, the third equation should be a dependent combination of the first two.",
          "Add the first two equations.",
          "Compare coefficients and constants.",
        ],
        solution: solution(
          L`Adding the first two equations gives $3x+4y+5z=6$. Therefore the third equation matches this exactly when $k=5$, giving infinitely many solutions.`,
          L`5`,
        ),
      },
      {
        questionLatex: L`If $(x,y,z)$ solves $x+y+z=6,\ x+2y+3z=14,\ 2x-y+z=3$, then $xy+z$ equals`,
        difficulty: 4,
        skillTags: ["linear_system_solution", "substitution"],
        choices: [L`$3$`, L`$5$`, L`$7$`, L`$9$`],
        correctLetter: "B",
        rationales: {
          A: "This uses $xy-z$ after solving.",
          C: "This comes from taking $y=3,z=1$ instead of solving both reduced equations.",
          D: "This uses $x+y+z$ partly instead of $xy+z$.",
        },
        misconceptionTags: {
          A: "wrong_final_expression",
          C: "reduced_system_solution_error",
          D: "uses_given_sum_in_expression",
        },
        hints: [
          "Use the first equation to remove $x$ from the other two.",
          "You get $y+2z=8$ and $3y+z=9$.",
          "Then compute $xy+z$, not just $x+y+z$.",
        ],
        solution: solution(
          L`Solving $y+2z=8$ and $3y+z=9$ gives $y=2,z=3$, and then $x=1$. Hence $xy+z=1\cdot2+3=5$.`,
          L`5`,
        ),
      },
      {
        questionLatex: L`The system $x+ay=1,\ ax+y=1$ has a unique solution if and only if`,
        difficulty: 3,
        skillTags: ["two_variable_system", "determinant_condition"],
        choices: [
          L`$a\ne1$`,
          L`$a\ne-1$`,
          L`$a\ne\pm1$`,
          L`$a=0$ only`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This misses singularity at $a=-1$.",
          B: "This misses singularity at $a=1$.",
          D: "There are many unique-solution values besides $a=0$.",
        },
        misconceptionTags: {
          A: "misses_negative_singular_value",
          B: "misses_positive_singular_value",
          D: "overrestricts_parameter",
        },
        hints: [
          "Write the coefficient determinant.",
          "The determinant is $1-a^2$.",
          "A unique solution needs nonzero determinant.",
        ],
        solution: solution(
          L`The coefficient determinant is $1-a^2$. It must be nonzero, so $a\ne\pm1$.`,
          L`a\ne\pm1`,
        ),
      },
      {
        questionLatex: L`The homogeneous system with coefficient matrix $\begin{pmatrix}1&2&3\\2&5&7\\1&3&k\end{pmatrix}$ has a non-trivial solution when`,
        difficulty: 4,
        skillTags: ["homogeneous_system", "determinant_parameter"],
        choices: [L`$k=2$`, L`$k=3$`, L`$k=4$`, L`$k=5$`],
        correctLetter: "C",
        rationales: {
          A: "This comes from setting the wrong minor to zero.",
          B: "This is a one-step arithmetic slip in the determinant.",
          D: "This shifts the determinant root by one.",
        },
        misconceptionTags: {
          A: "wrong_minor_condition",
          B: "determinant_arithmetic_error",
          D: "parameter_shift_error",
        },
        hints: [
          "A homogeneous system has non-trivial solutions exactly when the determinant is zero.",
          "Expand the determinant along the first row.",
          "The determinant simplifies to $k-4$.",
        ],
        solution: solution(
          L`The determinant is $k-4$. Setting it equal to zero gives $k=4$.`,
          L`4`,
        ),
      },
      {
        questionLatex: L`For the system $x+y+z=5,\ 2x-y+z=9,\ x+3y+2z=7$, the value of $z$ is`,
        difficulty: 4,
        skillTags: ["linear_system_solution", "elimination"],
        choices: [L`$1$`, L`$2$`, L`$3$`, L`$4$`],
        correctLetter: "D",
        rationales: {
          A: "This comes from using the second reduced equation as $2y+z=1$ instead of $2y+z=2$.",
          B: "This is obtained if $x-2y=4$ is used but the first equation is not checked.",
          C: "This is the old repeated-system value; it does not satisfy the first equation here.",
        },
        misconceptionTags: {
          A: "reduced_equation_constant_error",
          B: "partial_elimination_only",
          C: "uses_recalled_duplicate_system",
        },
        hints: [
          "Subtract the first equation from the second.",
          "Subtract the first equation from the third.",
          "Use $x-2y=4$ and $2y+z=2$ in the first equation.",
        ],
        solution: solution(
          L`Subtracting gives $x-2y=4$ and $2y+z=2$. Thus $x=4+2y$ and $z=2-2y$. Substitution in $x+y+z=5$ gives $y=-1$, so $z=4$.`,
          L`4`,
        ),
      },
      {
        questionLatex: L`If the coefficient determinant of a $3$-variable linear system is nonzero, then the system`,
        difficulty: 3,
        skillTags: ["consistency_test", "determinant_condition"],
        choices: [
          L`has no solution`,
          L`has a unique solution`,
          L`has infinitely many solutions`,
          L`may have no solution or infinitely many solutions`,
        ],
        correctLetter: "B",
        rationales: {
          A: "A nonzero coefficient determinant makes the coefficient matrix invertible.",
          C: "Infinitely many solutions require a singular coefficient matrix.",
          D: "The ambiguity only occurs when the determinant is zero.",
        },
        misconceptionTags: {
          A: "reverses_invertibility_condition",
          C: "confuses_singular_and_invertible_cases",
          D: "overgeneralizes_zero_determinant_case",
        },
        hints: [
          "Nonzero determinant means the coefficient matrix is invertible.",
          "Then $AX=B$ has solution $X=A^{-1}B$.",
          "That solution is unique.",
        ],
        solution: solution(
          L`If $\det A\ne0$, then $A^{-1}$ exists and $AX=B$ has the unique solution $X=A^{-1}B$.`,
          L`\text{unique solution}`,
        ),
      },
      {
        questionLatex: L`For $x+y+z=1,\ x+2y+3z=4,\ x+4y+pz=10$, the system has a unique solution when`,
        difficulty: 4,
        skillTags: ["linear_system_parameter", "unique_solution"],
        choices: [
          L`$p\ne7$`,
          L`$p=7$`,
          L`$p\ne6$`,
          L`$p=6$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "At $p=7$, the coefficient determinant is zero.",
          C: "The determinant is controlled by $p-7$, not $p-6$.",
          D: "This is one allowed value, but not the full condition.",
        },
        misconceptionTags: {
          B: "chooses_singular_parameter",
          C: "parameter_arithmetic_error",
          D: "confuses_example_with_condition",
        },
        hints: [
          "Use the same coefficient matrix pattern as the determinant in Topic 3.2.",
          "The determinant is $p-7$.",
          "A unique solution needs nonzero determinant.",
        ],
        solution: solution(
          L`The coefficient determinant equals $p-7$. Therefore the system has a unique solution exactly when $p\ne7$.`,
          L`p\ne7`,
        ),
      },
      {
        questionLatex: L`The equations $x+y+z=2,\ 2x+2y+2z=5,\ 3x+3y+3z=6$ are`,
        difficulty: 3,
        skillTags: ["linear_system_consistency", "dependent_equations"],
        choices: [
          L`consistent with a unique solution`,
          L`consistent with infinitely many solutions`,
          L`inconsistent`,
          L`homogeneous`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The coefficient rows are dependent, so uniqueness is impossible.",
          B: "The second equation contradicts twice the first.",
          D: "The right-hand sides are not all zero.",
        },
        misconceptionTags: {
          A: "ignores_dependent_rows",
          B: "misses_rhs_contradiction",
          D: "misidentifies_homogeneous_system",
        },
        hints: [
          "Compare the second equation with twice the first.",
          "Twice the first equation would have right side $4$.",
          "The second equation has right side $5$.",
        ],
        solution: solution(
          L`Twice the first equation gives $2x+2y+2z=4$, but the second equation says $2x+2y+2z=5$. The system is inconsistent.`,
          L`\text{inconsistent}`,
        ),
      },
      {
        questionLatex: L`If $AX=B$ represents three linear equations in three unknowns and $A^{-1}$ exists, then $X$ equals`,
        difficulty: 3,
        skillTags: ["matrix_solution", "inverse_method"],
        choices: [
          L`$A^{-1}B$`,
          L`$BA^{-1}$`,
          L`$AB^{-1}$`,
          L`$A^{-1}B^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The multiplication order is wrong; $B$ is a column matrix in this setup.",
          C: "The right-hand side matrix $B$ need not be square or invertible.",
          D: "There is no need to invert $B$.",
        },
        misconceptionTags: {
          B: "wrong_left_multiplication_order",
          C: "tries_to_invert_rhs",
          D: "inverts_rhs_unnecessarily",
        },
        hints: [
          "Multiply $AX=B$ on the left by $A^{-1}$.",
          "Use $A^{-1}A=I$.",
          "Do not change the order of multiplication.",
        ],
        solution: solution(
          L`Left-multiplying by $A^{-1}$ gives $X=A^{-1}B$.`,
          L`A^{-1}B`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`Find $a$ if $x+y+z=4,\ x+2y+3z=9,\ 2x+3y+az=13$ has infinitely many solutions.`,
        difficulty: 4,
        skillTags: ["infinite_solutions", "row_dependency"],
        promptMarkdown: "Enter $a$.",
        numericAnswer: 4,
        hints: [
          "For infinitely many solutions, the third equation should match a dependent combination of the first two.",
          "Add the first two equations.",
          "Compare the coefficient of $z$.",
        ],
        rubric: [
          "Identifies the row dependency.",
          "Checks the right-hand side as well as coefficients.",
        ],
        commonErrors: [
          "Using only determinant zero without checking constants.",
          "Adding constants incorrectly.",
        ],
        solution:
          L`Adding the first two equations gives $2x+3y+4z=13$. Thus the third equation matches when $a=4$.`,
      },
      {
        questionLatex: L`If $(x,y,z)$ solves $2x+y-z=6,\ x-y+2z=1,\ 3x+2y+z=13$, find $x+y-z$.`,
        difficulty: 4,
        skillTags: ["linear_system_solution", "final_expression"],
        promptMarkdown: "Enter $x+y-z$.",
        numericAnswer: 4,
        hints: [
          "The intended elimination gives a clean integer triple.",
          "Solving the first two equations with the third gives $(x,y,z)=(2,3,1)$.",
          "Evaluate the expression only after finding all three variables.",
        ],
        rubric: [
          "Solves the system correctly.",
          "Evaluates the requested expression, not a single variable.",
        ],
        commonErrors: [
          "Returning $z$ only.",
          "Using a reused $(1,2,3)$ system from another item.",
        ],
        solution:
          L`Solving the system gives $(x,y,z)=(2,3,1)$. Hence $x+y-z=2+3-1=4$.`,
      },
      {
        questionLatex: L`Find the number of integers $a$ with $-3\le a\le3$ for which $x+y=1,\ ax+y=2$ has a unique solution.`,
        difficulty: 3,
        skillTags: ["two_variable_system", "integer_count"],
        promptMarkdown: "Enter the count.",
        numericAnswer: 6,
        hints: [
          "The coefficient determinant is $1-a$.",
          "A unique solution needs nonzero determinant.",
          "Exclude $a=1$ from the seven integers.",
        ],
        rubric: [
          "Finds the determinant condition.",
          "Counts allowed integer parameters in the interval.",
        ],
        commonErrors: [
          "Excluding $a=-1$ unnecessarily.",
          "Counting only nonnegative values.",
        ],
        solution:
          L`The determinant is $1-a$, so uniqueness fails only at $a=1$. There are $7$ integers from $-3$ to $3$, so the count is $6$.`,
      },
      {
        questionLatex: L`For the homogeneous system with coefficient matrix $\begin{pmatrix}1&1&1\\2&3&5\\1&4&k\end{pmatrix}$, find $k$ for which a non-trivial solution exists.`,
        difficulty: 4,
        skillTags: ["homogeneous_system", "determinant_parameter"],
        promptMarkdown: "Enter $k$.",
        numericAnswer: 10,
        hints: [
          "Non-trivial homogeneous solutions require determinant zero.",
          "Expand the determinant.",
          "The determinant simplifies to $k-10$.",
        ],
        rubric: [
          "Uses determinant-zero condition for homogeneous systems.",
          "Computes the parameter from the determinant.",
        ],
        commonErrors: [
          "Solving the system as non-homogeneous.",
          "Using determinant nonzero as the condition.",
        ],
        solution:
          L`The determinant is $(3k-20)-(2k-5)+(8-3)=k-10$. Setting it to zero gives $k=10$.`,
      },
      {
        questionLatex: L`If $(x,y,z)$ solves $x+2y+z=8,\ 2x+y-z=7,\ x-y+3z=9$, find $100x+10y+z$.`,
        difficulty: 4,
        skillTags: ["linear_system_solution", "encoded_answer"],
        promptMarkdown: "Enter $100x+10y+z$.",
        numericAnswer: 412,
        hints: [
          "This system has a unique integer solution.",
          "Eliminate $x$ to get two equations in $y$ and $z$.",
          "Use the requested encoding only after finding $(x,y,z)$.",
        ],
        rubric: [
          "Solves the three-variable system.",
          "Computes the encoded expression in the requested order.",
        ],
        commonErrors: [
          "Reusing the older $(1,2,3)$ solution.",
          "Encoding the variables in the wrong order.",
        ],
        solution:
          L`Solving gives $x=4$, $y=1$, and $z=2$. Therefore $100x+10y+z=412$.`,
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Determinant Applications and Mixed Parameters",
    subtopic:
      "Triangle area, collinearity, transformation area scale, and mixed matrix-determinant parameter reasoning.",
    mc: [
      {
        questionLatex: L`The area of the triangle with vertices $(1,2)$, $(3,4)$, and $(5,k)$ is $6$. The possible values of $k$ are`,
        difficulty: 4,
        skillTags: ["area_by_determinant", "absolute_value_parameter"],
        choices: [
          L`$0,12$`,
          L`$-6,6$`,
          L`$6,12$`,
          L`$0,6$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This centers the absolute value at $0$ instead of at $6$.",
          C: "This includes the value that gives zero area.",
          D: "This includes the collinear value $k=6$.",
        },
        misconceptionTags: {
          B: "absolute_value_center_error",
          C: "includes_zero_area_value",
          D: "collinearity_value_misread",
        },
        hints: [
          "Use $\\frac12|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)|$.",
          "The area simplifies to $|k-6|$.",
          "Solve $|k-6|=6$.",
        ],
        solution: solution(
          L`The area is $\frac12|4-k+3k-6-10|=|k-6|$. Thus $|k-6|=6$, so $k=0$ or $12$.`,
          L`0,12`,
        ),
      },
      {
        questionLatex: L`The points $(1,2)$, $(3,6)$, and $(a,10)$ are collinear when`,
        difficulty: 3,
        skillTags: ["collinearity_determinant", "coordinate_geometry"],
        choices: [L`$a=4$`, L`$a=5$`, L`$a=6$`, L`$a=7$`],
        correctLetter: "B",
        rationales: {
          A: "This uses slope $4$ from the y-difference directly as an x-coordinate.",
          C: "This shifts one unit too far along the same line.",
          D: "This ignores the slope determined by the first two points.",
        },
        misconceptionTags: {
          A: "slope_coordinate_confusion",
          C: "linear_extension_error",
          D: "does_not_use_collinearity_condition",
        },
        hints: [
          "The first two points lie on $y=2x$.",
          "For the third point, set $10=2a$.",
          "Equivalently, use the zero-area determinant.",
        ],
        solution: solution(
          L`The line through $(1,2)$ and $(3,6)$ has slope $2$ and equation $y=2x$. Thus $10=2a$, giving $a=5$.`,
          L`5`,
        ),
      },
      {
        questionLatex: L`If the points $(0,0)$, $(a,2)$, and $(3,5)$ form a triangle of area $\dfrac{7}{2}$, then $a$ can be`,
        difficulty: 4,
        skillTags: ["area_by_determinant", "absolute_value_parameter"],
        choices: [
          L`$\dfrac{13}{5}$ or $-\dfrac{1}{5}$`,
          L`$\dfrac{7}{5}$ or $-\dfrac{7}{5}$`,
          L`$5$ or $-5$`,
          L`$\dfrac{1}{5}$ or $-\dfrac{13}{5}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This puts the constant $6$ on the wrong side before solving the absolute value.",
          C: "This treats the determinant as $a$ alone.",
          D: "This reverses the signs after solving $|5a-6|=7$.",
        },
        misconceptionTags: {
          B: "absolute_value_algebra_error",
          C: "drops_constant_term",
          D: "sign_error_after_absolute_value",
        },
        hints: [
          "The doubled area is $|a\\cdot5-2\\cdot3|$.",
          "So $|5a-6|=7$.",
          "Solve the two linear equations.",
        ],
        solution: solution(
          L`The area is $\frac12|5a-6|$. Setting it equal to $7/2$ gives $|5a-6|=7$, so $a=13/5$ or $a=-1/5$.`,
          L`\frac{13}{5},-\frac15`,
        ),
      },
      {
        questionLatex: L`A linear transformation represented by a $2\times2$ matrix $A$ maps a triangle of area $3$ to a triangle of area $12$. Then $|\det A|$ is`,
        difficulty: 3,
        skillTags: ["area_scale_factor", "determinant_application"],
        choices: [L`$2$`, L`$3$`, L`$4$`, L`$9$`],
        correctLetter: "C",
        rationales: {
          A: "This takes the square root of the area scale factor without reason.",
          B: "This returns the original area instead of the scale factor.",
          D: "This squares the original area.",
        },
        misconceptionTags: {
          A: "takes_square_root_of_scale",
          B: "uses_original_area",
          D: "squares_area",
        },
        hints: [
          "A $2\\times2$ determinant scales areas by $|\\det A|$.",
          "The area scale is image area divided by original area.",
          "Compute $12/3$.",
        ],
        solution: solution(
          L`The area scale factor is $12/3=4$, so $|\det A|=4$.`,
          L`4`,
        ),
      },
      {
        questionLatex: L`The points $(k,0)$, $(0,k)$, and $(1,1)$ are collinear for`,
        difficulty: 4,
        skillTags: ["collinearity_determinant", "parameter_values"],
        choices: [
          L`$k=0$ or $2$`,
          L`$k=1$ only`,
          L`$k=-2$ or $0$`,
          L`$k=2$ only`,
        ],
        correctLetter: "A",
        rationales: {
          B: "At $k=1$ the first two points are distinct from neither enough to make the determinant zero in the required way.",
          C: "This has the wrong sign for the nonzero root.",
          D: "This misses the degenerate collinearity when $k=0$.",
        },
        misconceptionTags: {
          B: "tests_midpoint_instead_of_determinant",
          C: "sign_error_root",
          D: "misses_zero_parameter_case",
        },
        hints: [
          "Use the determinant $\\begin{vmatrix}k&0&1\\\\0&k&1\\\\1&1&1\\end{vmatrix}$.",
          "It simplifies to $k^2-2k$.",
          "Set $k(k-2)=0$.",
        ],
        solution: solution(
          L`The collinearity determinant is $k^2-2k=k(k-2)$. Hence $k=0$ or $k=2$.`,
          L`0,2`,
        ),
      },
      {
        questionLatex: L`If $\begin{vmatrix}x&y&1\\2&3&1\\4&7&1\end{vmatrix}=0$, then the point $(x,y)$ lies on`,
        difficulty: 4,
        skillTags: ["collinearity_determinant", "line_equation"],
        choices: [
          L`$y=2x-1$`,
          L`$y=x+1$`,
          L`$y=3x-3$`,
          L`$x+2y=8$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This fits $(2,3)$ but not $(4,7)$.",
          C: "This fits $(2,3)$ but not the slope between the fixed points.",
          D: "This does not pass through both fixed points.",
        },
        misconceptionTags: {
          B: "uses_one_point_only",
          C: "wrong_slope",
          D: "wrong_line_form",
        },
        hints: [
          "The determinant zero condition means the three points are collinear.",
          "Find the line through $(2,3)$ and $(4,7)$.",
          "Its slope is $2$.",
        ],
        solution: solution(
          L`The fixed points have slope $(7-3)/(4-2)=2$, so the line through $(2,3)$ is $y-3=2(x-2)$, or $y=2x-1$.`,
          L`y=2x-1`,
        ),
      },
      {
        questionLatex: L`The area of the triangle with vertices $(1,1)$, $(4,2)$, and $(2,5)$ is`,
        difficulty: 3,
        skillTags: ["area_by_determinant", "determinant_evaluation"],
        choices: [L`$\dfrac{9}{2}$`, L`$\dfrac{11}{2}$`, L`$6$`, L`$11$`],
        correctLetter: "B",
        rationales: {
          A: "This is a cofactor arithmetic error in the determinant.",
          C: "This rounds the half-area expression incorrectly.",
          D: "This gives the doubled area, not the area.",
        },
        misconceptionTags: {
          A: "determinant_arithmetic_error",
          C: "half_factor_error",
          D: "forgets_half_factor",
        },
        hints: [
          "Use the determinant area formula.",
          "The doubled area is $|-3+16-2|$.",
          "Remember the factor $1/2$.",
        ],
        solution: solution(
          L`Twice the area is $|1(2-5)+4(5-1)+2(1-2)|=|-3+16-2|=11$. Hence the area is $11/2$.`,
          L`\frac{11}{2}`,
        ),
      },
      {
        questionLatex: L`If $A=\begin{pmatrix}2&1\\1&3\end{pmatrix}$, then the area of the image of the unit square under $A$ is`,
        difficulty: 3,
        skillTags: ["determinant_area_scale", "two_by_two_determinant"],
        choices: [L`$3$`, L`$4$`, L`$5$`, L`$7$`],
        correctLetter: "C",
        rationales: {
          A: "This uses the smaller diagonal entry only.",
          B: "This subtracts the off-diagonal entries instead of their product.",
          D: "This adds diagonal entries and off-diagonal entries.",
        },
        misconceptionTags: {
          A: "uses_single_entry_as_area",
          B: "wrong_two_by_two_formula",
          D: "adds_entries_instead_of_determinant",
        },
        hints: [
          "The area scale is $|\\det A|$.",
          "Compute $2\\cdot3-1\\cdot1$.",
          "The original unit square has area $1$.",
        ],
        solution: solution(
          L`$\det A=6-1=5$, so the image of the unit square has area $5$.`,
          L`5`,
        ),
      },
      {
        questionLatex: L`If the determinant $\begin{vmatrix}x_1&y_1&1\\x_2&y_2&1\\x_3&y_3&1\end{vmatrix}$ is $-18$, then the area of the triangle formed by the three points is`,
        difficulty: 3,
        skillTags: ["area_by_determinant", "signed_area"],
        choices: [L`$-18$`, L`$-9$`, L`$9$`, L`$18$`],
        correctLetter: "C",
        rationales: {
          A: "Area cannot be negative; this is the signed doubled area.",
          B: "This keeps the negative sign after taking absolute value.",
          D: "This forgets the factor $1/2$.",
        },
        misconceptionTags: {
          A: "uses_signed_doubled_area",
          B: "keeps_negative_area",
          D: "forgets_half_factor",
        },
        hints: [
          "The determinant gives signed twice-area.",
          "Area uses absolute value.",
          "Then divide by $2$.",
        ],
        solution: solution(
          L`Area $=\frac12|-18|=9$.`,
          L`9`,
        ),
      },
      {
        questionLatex: L`If $P(0,0)$, $Q(a,3)$, and $R(4,1)$ form a triangle of area $5$, then the sum of all possible values of $a$ is`,
        difficulty: 4,
        skillTags: ["area_by_determinant", "parameter_sum"],
        choices: [L`$12$`, L`$20$`, L`$24$`, L`$26$`],
        correctLetter: "C",
        rationales: {
          A: "This is the center value before applying the absolute value condition.",
          B: "This misses one of the two possible parameter values.",
          D: "This shifts both roots by one.",
        },
        misconceptionTags: {
          A: "absolute_value_center_only",
          B: "single_root_only",
          D: "root_shift_error",
        },
        hints: [
          "Twice the area is $|a-12|$.",
          "Set $|a-12|=10$.",
          "Add both solutions.",
        ],
        solution: solution(
          L`The area is $\frac12|a\cdot1-3\cdot4|=\frac12|a-12|$. Since the area is $5$, $|a-12|=10$, so $a=2$ or $22$. The sum is $24$.`,
          L`24`,
        ),
      },
    ],
    numeric: [
      {
        questionLatex: L`Find twice the area of the triangle with vertices $(-1,2)$, $(3,0)$, and $(4,5)$.`,
        difficulty: 3,
        skillTags: ["area_by_determinant", "determinant_evaluation"],
        promptMarkdown: "Enter twice the area.",
        numericAnswer: 22,
        hints: [
          "Use the determinant area formula.",
          "Twice area is the absolute value of the $3\\times3$ determinant.",
          "The determinant value is $22$.",
        ],
        rubric: [
          "Sets up the determinant with a final column of ones.",
          "Returns twice the area as requested.",
        ],
        commonErrors: [
          "Returning the area instead of twice the area.",
          "Keeping the signed determinant without absolute value.",
        ],
        solution:
          L`Twice the area is $|-1(0-5)+3(5-2)+4(2-0)|=|5+9+8|=22$.`,
      },
      {
        questionLatex: L`Find $a$ if $(a,1)$, $(2,3)$, and $(4,7)$ are collinear.`,
        difficulty: 3,
        skillTags: ["collinearity_determinant", "parameter"],
        promptMarkdown: "Enter $a$.",
        numericAnswer: 1,
        hints: [
          "Find the line through $(2,3)$ and $(4,7)$.",
          "The slope is $2$.",
          "Put $y=1$ in the line equation.",
        ],
        rubric: [
          "Uses collinearity or line equation correctly.",
          "Solves for the missing coordinate.",
        ],
        commonErrors: [
          "Using reciprocal slope.",
          "Substituting the x-coordinate as the y-coordinate.",
        ],
        solution:
          L`The line through $(2,3)$ and $(4,7)$ is $y-3=2(x-2)$. For $y=1$, $1-3=2(a-2)$, so $a=1$.`,
      },
      {
        questionLatex: L`If $(0,0)$, $(a,4)$, and $(5,1)$ form a triangle of area $6$, find the sum of all possible values of $a$.`,
        difficulty: 4,
        skillTags: ["area_by_determinant", "absolute_value_parameter"],
        promptMarkdown: "Enter the sum.",
        numericAnswer: 40,
        hints: [
          "Twice the area is $|a-20|$.",
          "Set it equal to $12$.",
          "Add the two possible values.",
        ],
        rubric: [
          "Solves the absolute-value area equation.",
          "Adds all possible parameter values.",
        ],
        commonErrors: [
          "Taking only the positive branch.",
          "Returning one value instead of the sum.",
        ],
        solution:
          L`Area $=\frac12|a-20|=6$, so $|a-20|=12$. Thus $a=8$ or $32$, and the sum is $40$.`,
      },
      {
        questionLatex: L`Find the area of the image of the unit square under the matrix $\begin{pmatrix}3&1\\2&4\end{pmatrix}$.`,
        difficulty: 3,
        skillTags: ["determinant_area_scale", "linear_transformation"],
        promptMarkdown: "Enter the area.",
        numericAnswer: 10,
        hints: [
          "A $2\\times2$ matrix scales area by the absolute determinant.",
          "Compute $3\\cdot4-1\\cdot2$.",
          "The original area is $1$.",
        ],
        rubric: [
          "Computes determinant correctly.",
          "Uses determinant as area scale factor.",
        ],
        commonErrors: [
          "Adding entries instead of computing determinant.",
          "Using the trace as the area scale.",
        ],
        solution:
          L`The determinant is $3\cdot4-1\cdot2=10$, so the image area is $10$.`,
      },
      {
        questionLatex: L`A triangle of area $7$ is mapped by the matrix $\begin{pmatrix}2&-1\\1&3\end{pmatrix}$. Find the area of its image.`,
        difficulty: 3,
        skillTags: ["determinant_area_scale", "linear_transformation"],
        promptMarkdown: "Enter the area.",
        numericAnswer: 49,
        hints: [
          "A $2\\times2$ matrix scales area by the absolute determinant.",
          "The determinant of the matrix is $7$.",
          "Multiply the original area by $7$.",
        ],
        rubric: [
          "Computes the determinant scale factor.",
          "Multiplies the original area by the absolute determinant.",
        ],
        commonErrors: [
          "Using the trace as the scale factor.",
          "Forgetting the original area is already $7$.",
        ],
        solution:
          L`The determinant is $2\cdot3-(-1)(1)=7$, so the image area is $7\cdot7=49$.`,
      },
    ],
  },
];

export const jeeMatricesDeterminantsTopics: Topic[] = topicSeeds.map(makeTopic);
