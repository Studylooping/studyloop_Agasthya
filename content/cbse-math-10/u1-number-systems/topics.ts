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
const UNIT = "u1-number-systems";
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Use prime factor powers carefully; HCF takes the smaller exponents, LCM takes the larger exponents.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class10_real_numbers_reasoning"),
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
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_rule_without_matching_it_to_the_prime_factorisation",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_answer_without_showing_factor_or_proof_reasoning",
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

const factorisationComparisonFigure: ItemFigure = {
  type: "svg",
  title: "Prime-factor comparison",
  description:
    "Prime factor powers for 84 and 126 are displayed so the student can identify the common prime powers.",
  svg: `<svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="220" fill="#ffffff"/>
  <text x="260" y="34" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">Compare prime powers</text>
  <rect x="60" y="62" width="180" height="105" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <rect x="280" y="62" width="180" height="105" rx="8" fill="#fff7ed" stroke="#f97316" stroke-width="2"/>
  <text x="150" y="96" text-anchor="middle" font-size="22" font-weight="700" fill="#1e3a8a" font-family="Arial, sans-serif">84</text>
  <text x="370" y="96" text-anchor="middle" font-size="22" font-weight="700" fill="#9a3412" font-family="Arial, sans-serif">126</text>
  <text x="150" y="136" text-anchor="middle" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">2^2 x 3 x 7</text>
  <text x="370" y="136" text-anchor="middle" font-size="20" fill="#0f172a" font-family="Arial, sans-serif">2 x 3^2 x 7</text>
  <text x="260" y="195" text-anchor="middle" font-size="15" fill="#475569" font-family="Arial, sans-serif">Common prime powers decide the HCF.</text>
</svg>`,
};

const kitInventoryFigure: ItemFigure = {
  type: "svg",
  title: "Kit-making inventory",
  description:
    "A table of pencils, erasers, and stickers to be split into the greatest possible number of identical kits.",
  svg: `<svg viewBox="0 0 560 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="250" fill="#ffffff"/>
  <text x="280" y="36" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">School kit inventory</text>
  <rect x="70" y="58" width="420" height="136" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
  <line x1="70" y1="98" x2="490" y2="98" stroke="#64748b" stroke-width="1.5"/>
  <line x1="210" y1="58" x2="210" y2="194" stroke="#64748b" stroke-width="1.5"/>
  <line x1="350" y1="58" x2="350" y2="194" stroke="#64748b" stroke-width="1.5"/>
  <text x="140" y="84" text-anchor="middle" font-size="16" font-weight="700" fill="#1e3a8a" font-family="Arial, sans-serif">Pencils</text>
  <text x="280" y="84" text-anchor="middle" font-size="16" font-weight="700" fill="#7c2d12" font-family="Arial, sans-serif">Erasers</text>
  <text x="420" y="84" text-anchor="middle" font-size="16" font-weight="700" fill="#166534" font-family="Arial, sans-serif">Stickers</text>
  <text x="140" y="146" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">144</text>
  <text x="280" y="146" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">180</text>
  <text x="420" y="146" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif">252</text>
  <text x="280" y="224" text-anchor="middle" font-size="15" fill="#475569" font-family="Arial, sans-serif">Make identical kits with no item left over.</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Prime Factorisation and HCF-LCM",
    subtopic:
      "Fundamental Theorem of Arithmetic, prime powers, HCF and LCM by factorisation.",
    mc: [
      {
        questionLatex: L`From the prime-factor comparison shown, the HCF of $84$ and $126$ is`,
        difficulty: 1,
        figure: factorisationComparisonFigure,
        skillTags: ["fundamental_theorem_arithmetic", "hcf_by_prime_powers"],
        choices: [L`$14$`, L`$21$`, L`$42$`, L`$84$`],
        correctLetter: "C",
        rationales: {
          A: "This misses the common factor $3$ along with $2$ and $7$.",
          B: "This uses $3\\cdot 7$ but misses the common factor $2$.",
          D: "The HCF cannot be the larger number unless it divides the other number.",
        },
        hints: [
          "Write the common prime factors only.",
          "Take the smaller exponent of each common prime.",
          "$84=2^2\\cdot3\\cdot7$ and $126=2\\cdot3^2\\cdot7$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For HCF, take common primes with the smaller exponent.",
            math: L`2^1\cdot 3^1\cdot 7^1=42`,
          },
        ],
      },
      {
        questionLatex: L`If $a=2^3\cdot3^2\cdot5$ and $b=2^2\cdot3\cdot5^2$, then $\operatorname{LCM}(a,b)$ is`,
        difficulty: 2,
        skillTags: ["lcm_by_prime_powers", "prime_exponent_reasoning"],
        choices: [L`$900$`, L`$1800$`, L`$2700$`, L`$3600$`],
        correctLetter: "B",
        rationales: {
          A: "This keeps $5^1$ instead of the larger exponent $5^2$.",
          C: "This changes the power of $2$ incorrectly; the maximum power of $2$ is $2^3$.",
          D: "This doubles the correct LCM without a prime-power reason.",
        },
        hints: [
          "LCM uses every prime that occurs.",
          "Use the larger exponent of each prime.",
          "The largest powers are $2^3,3^2,5^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The LCM uses the largest exponent of each prime.",
            math: L`\operatorname{LCM}=2^3\cdot3^2\cdot5^2=1800`,
          },
        ],
      },
      {
        questionLatex: L`The HCF and LCM of two positive integers are $12$ and $360$ respectively. If one integer is $72$, the other integer is`,
        difficulty: 2,
        skillTags: ["hcf_lcm_product_relation"],
        choices: [L`$48$`, L`$54$`, L`$90$`, L`$60$`],
        correctLetter: "D",
        rationales: {
          A: "This would make the product too small; use $ab=\\operatorname{HCF}\\cdot\\operatorname{LCM}$.",
          B: "This uses a nearby multiple but does not satisfy the product relation.",
          C: "This gives product $6480$, not $4320$.",
        },
        hints: [
          "For two positive integers, product of numbers equals product of HCF and LCM.",
          "Let the other integer be $x$.",
          "$72x=12\\times360$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the HCF-LCM product relation.",
            math: L`72x=12\cdot360`,
          },
          {
            step: 2,
            explanation: "Solve for the other integer.",
            math: L`x=\frac{4320}{72}=60`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Every composite number has a prime factorisation that is unique apart from the order of factors. Reason (R): This uniqueness is exactly the Fundamental Theorem of Arithmetic. Choose the correct option.`,
        difficulty: 3,
        skillTags: [
          "assertion_reason",
          "fundamental_theorem_arithmetic_statement",
        ],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The Reason is not merely related; it is the theorem that explains the assertion.",
          C: "The Reason is true: uniqueness of prime factorisation is the Fundamental Theorem of Arithmetic.",
          D: "The Assertion is true for every composite number.",
        },
        hints: [
          "Recall the exact statement of the Fundamental Theorem of Arithmetic.",
          "The phrase 'apart from order' is important.",
          "The Reason gives the named theorem behind the Assertion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The Fundamental Theorem of Arithmetic says every composite number can be expressed as a product of primes uniquely apart from the order of factors.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`How many positive divisors of $1080$ are multiples of $12$?`,
        difficulty: 3,
        skillTags: ["divisor_counting", "prime_factorisation_application"],
        choices: [L`$8$`, L`$12$`, L`$16$`, L`$24$`],
        correctLetter: "B",
        rationales: {
          A: "This undercounts by excluding one available exponent choice for $3$ or $5$.",
          C: "This allows an exponent pattern that does not divide $1080$.",
          D: "This counts all divisors of a related number, not only multiples of $12$.",
        },
        hints: [
          "First factorise $1080$.",
          "A multiple of $12=2^2\\cdot3$ must include at least $2^2$ and $3^1$.",
          "Count the allowed exponent choices.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Factorise the number and impose the multiple-of-12 condition.",
            math: L`1080=2^3\cdot3^3\cdot5`,
          },
          {
            step: 2,
            explanation:
              "For a divisor multiple of $12$, exponent choices are $2^2$ or $2^3$, $3^1,3^2,$ or $3^3$, and $5^0$ or $5^1$.",
            math: L`2\cdot3\cdot2=12`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`If $p=2^4\cdot3^2\cdot5$ and $q=2^2\cdot3^3\cdot7$, find $\operatorname{HCF}(p,q)$.`,
        difficulty: 1,
        skillTags: ["hcf_by_prime_powers"],
        parts: singlePart("a", "Give the HCF.", 1),
        hints: [
          "Use only the common primes.",
          "Take the smaller exponent of each common prime.",
          "Common prime powers are $2^2$ and $3^2$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Answers $36$ with correct prime-power reasoning.",
        ),
        commonErrors: [
          "Taking larger exponents as if finding LCM.",
          "Including $5$ or $7$, which are not common primes.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The common primes are $2$ and $3$. Taking smaller exponents gives $2^2\\cdot3^2=4\\cdot9=36$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the smallest positive integer by which $150$ must be multiplied so that the product is a perfect square.`,
        difficulty: 2,
        skillTags: ["prime_factorisation", "perfect_square_condition"],
        parts: singlePart("a", "Give the required multiplier.", 1),
        hints: [
          "A perfect square has even exponents in its prime factorisation.",
          "Factorise $150$ first.",
          "$150=2\\cdot3\\cdot5^2$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Answers $6$ and identifies the odd prime exponents.",
        ),
        commonErrors: [
          "Multiplying by $5$ even though the power of $5$ is already even.",
          "Making the number a cube instead of a square.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$150=2^1\\cdot3^1\\cdot5^2$. To make all exponents even, multiply by $2\\cdot3=6$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Using prime factorisation, verify the relation between HCF and LCM for $96$ and $180$.`,
        difficulty: 3,
        skillTags: ["hcf_lcm_product_relation", "prime_factorisation"],
        parts: singlePart(
          "a",
          "Find the HCF and LCM, then verify the product relation.",
          3,
        ),
        hints: [
          "Write both numbers as products of prime powers.",
          "Use smaller exponents for HCF and larger exponents for LCM.",
          "Check whether $96\\times180=\\operatorname{HCF}\\times\\operatorname{LCM}$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Correct prime factorisations of $96$ and $180$.",
            },
            {
              part: "a",
              points: 1,
              description: "Correct HCF $12$ and LCM $1440$.",
            },
            {
              part: "a",
              points: 1,
              description: "Correct verification of the product relation.",
            },
          ],
        },
        commonErrors: [
          "Using larger exponents for HCF.",
          "Forgetting to include prime $5$ in the LCM.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$96=2^5\\cdot3$ and $180=2^2\\cdot3^2\\cdot5$. Hence $\\operatorname{HCF}=2^2\\cdot3=12$ and $\\operatorname{LCM}=2^5\\cdot3^2\\cdot5=1440$. Also $96\\times180=17280$ and $12\\times1440=17280$, so the relation is verified.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Three warning lights blink every $18$ s, $24$ s, and $40$ s respectively. If they blink together at $9{:}00{:}00$, when will they next blink together?`,
        difficulty: 3,
        skillTags: ["lcm_application", "real_life_context"],
        parts: singlePart("a", "Find the next common blinking time.", 3),
        hints: [
          "The next common blink occurs after the LCM of the three intervals.",
          "Prime-factorise $18$, $24$, and $40$.",
          "Convert the LCM from seconds to minutes.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Uses LCM, not HCF." },
            {
              part: "a",
              points: 1,
              description: "Finds LCM as $360$ seconds.",
            },
            {
              part: "a",
              points: 1,
              description: "States the next time as $9{:}06{:}00$.",
            },
          ],
        },
        commonErrors: [
          "Using HCF and getting an earlier repeated interval.",
          "Leaving the answer as $360$ without converting the clock time.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$18=2\\cdot3^2$, $24=2^3\\cdot3$, and $40=2^3\\cdot5$. Their LCM is $2^3\\cdot3^2\\cdot5=360$ seconds, which is $6$ minutes. The lights next blink together at $9{:}06{:}00$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school has the inventory shown and wants to prepare the greatest possible number of identical kits with no item left over.`,
        difficulty: 3,
        figure: kitInventoryFigure,
        skillTags: ["hcf_application", "case_based_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the greatest possible number of identical kits.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find how many pencils, erasers, and stickers each kit contains.",
            points: 2,
          },
        ],
        hints: [
          "Identical kits with no leftovers means each count must be divided by the same largest number.",
          "Find the HCF of $144$, $180$, and $252$.",
          "$144=2^4\\cdot3^2$, $180=2^2\\cdot3^2\\cdot5$, $252=2^2\\cdot3^2\\cdot7$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds HCF as $36$." },
            {
              part: "b",
              points: 2,
              description:
                "Correctly divides all three item counts by $36$ to get $4,5,7$.",
            },
          ],
        },
        commonErrors: [
          "Using LCM instead of HCF.",
          "Finding the number of kits but not the contents of each kit.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The number of identical kits must divide $144$, $180$, and $252$. The greatest possible number is their HCF: $2^2\\cdot3^2=36$.",
          },
          {
            part: "b",
            explanation:
              "Each kit contains $144/36=4$ pencils, $180/36=5$ erasers, and $252/36=7$ stickers.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Applications of the Fundamental Theorem",
    subtopic:
      "Least common multiples, greatest common factors, square conditions, and divisibility arguments.",
    mc: [
      {
        questionLatex: L`The least perfect square that is a multiple of $180$ is`,
        difficulty: 2,
        skillTags: ["perfect_square_condition", "lcm_application"],
        choices: [L`$360$`, L`$540$`, L`$900$`, L`$1800$`],
        correctLetter: "C",
        rationales: {
          A: "This is a multiple of $180$, but $360=2^3\\cdot3^2\\cdot5$ is not a perfect square.",
          B: "This is not a perfect square.",
          D: "This is a multiple of $180$, but not the least perfect square multiple.",
        },
        hints: [
          "Factorise $180$.",
          "A perfect square must have even powers of every prime.",
          "$180=2^2\\cdot3^2\\cdot5$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Only the exponent of $5$ is odd, so multiply by another $5$.",
            math: L`180\cdot5=900`,
          },
        ],
      },
      {
        questionLatex: L`The smallest positive integer which is divisible by $16$, $24$, and $45$ and is also a perfect square is`,
        difficulty: 3,
        skillTags: ["lcm_application", "perfect_square_condition"],
        choices: [L`$3600$`, L`$1440$`, L`$7200$`, L`$1800$`],
        correctLetter: "A",
        rationales: {
          B: "This is divisible by the three given numbers, but it is not a perfect square.",
          C: "This is a square multiple condition overcount; $3600$ already works.",
          D: "This is not divisible by $16$.",
        },
        hints: [
          "First find the LCM of the three numbers.",
          "Then adjust its prime exponents to make a square.",
          "$\\operatorname{LCM}(16,24,45)=2^4\\cdot3^2\\cdot5$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The LCM is the smallest number divisible by all three.",
            math: L`\operatorname{LCM}=2^4\cdot3^2\cdot5=720`,
          },
          {
            step: 2,
            explanation: "To make it a perfect square, multiply by $5$.",
            math: L`720\cdot5=3600`,
          },
        ],
      },
      {
        questionLatex: L`Two positive integers have HCF $18$ and LCM $630$. If one of them is $90$, the other is`,
        difficulty: 2,
        skillTags: ["hcf_lcm_product_relation"],
        choices: [L`$108$`, L`$144$`, L`$126$`, L`$180$`],
        correctLetter: "C",
        rationales: {
          A: "This gives product $9720$, not $18\\cdot630$.",
          B: "This gives HCF $18$ with $90$, but the LCM would not be $630$.",
          D: "This has HCF $90$ with $90$, not $18$.",
        },
        hints: [
          "Use the product relation for two positive integers.",
          "Let the other number be $x$.",
          "$90x=18\\times630$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the HCF-LCM product relation.",
            math: L`90x=18\cdot630`,
          },
          {
            step: 2,
            explanation: "Solve for $x$.",
            math: L`x=126`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): If $3$ divides $n^2$, then $3$ divides $n$. Reason (R): In the prime factorisation of $n^2$, every exponent is twice the corresponding exponent in $n$. Choose the correct option.`,
        difficulty: 3,
        skillTags: [
          "assertion_reason",
          "prime_divisibility",
          "proof_preparation",
        ],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The doubled-exponent fact is exactly the prime-factor reason behind the assertion.",
          C: "The Reason is true for every positive integer $n$.",
          D: "The Assertion is true; it is a standard consequence of unique prime factorisation.",
        },
        hints: [
          "Think in terms of prime exponents.",
          "If $3$ is absent from $n$, it is absent from $n^2$.",
          "If $3$ appears in $n^2$, it must have appeared in $n$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since prime exponents in $n^2$ are twice those in $n$, a prime appearing in $n^2$ must already appear in $n$. Thus both statements are true and the Reason explains the Assertion.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`A rectangular notice board is to be tiled by identical square tiles of largest possible side. The board measures $210$ cm by $126$ cm. The side of each square tile is`,
        difficulty: 3,
        skillTags: ["hcf_application", "geometry_context"],
        choices: [L`$14$ cm`, L`$21$ cm`, L`$42$ cm`, L`$63$ cm`],
        correctLetter: "C",
        rationales: {
          A: "This square size works, but it is not the largest possible side.",
          B: "This divides both dimensions, but a larger common divisor exists.",
          D: "This does not divide $210$ exactly.",
        },
        hints: [
          "The square side must divide both board dimensions.",
          "Largest possible side means HCF.",
          "Find $\\operatorname{HCF}(210,126)$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The tile side is the greatest common divisor of the board dimensions.",
            math: L`\operatorname{HCF}(210,126)=42`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State whether $2^3\cdot3^2\cdot7$ is divisible by $72$. Give a reason.`,
        difficulty: 1,
        skillTags: ["divisibility_by_prime_powers"],
        parts: singlePart("a", "Answer yes or no with one reason.", 1),
        hints: [
          "Write $72$ as a product of prime powers.",
          "Compare the exponents needed with the exponents available.",
          "$72=2^3\\cdot3^2$.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "Answers yes and compares prime powers correctly.",
        ),
        commonErrors: [
          "Checking divisibility using only the final digit.",
          "Forgetting the factor $3^2$ in $72$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Yes. Since $72=2^3\\cdot3^2$, all prime powers required for $72$ are present in $2^3\\cdot3^2\\cdot7$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Find the least positive number greater than $20$ which leaves remainder $7$ when divided by $12$, $16$, and $20$.`,
        difficulty: 2,
        skillTags: ["lcm_application", "remainder_condition"],
        parts: singlePart("a", "Give the least positive number.", 1),
        hints: [
          "Subtracting $7$ from the number must make it divisible by all three divisors.",
          "Find $\\operatorname{LCM}(12,16,20)$.",
          "Add $7$ to the LCM.",
        ],
        rubric: singleRubric("a", 1, "Answers $247$."),
        commonErrors: [
          "Adding $7$ to the HCF instead of the LCM.",
          "Giving $240$ and ignoring the remainder.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\operatorname{LCM}(12,16,20)=240$. The least number leaving remainder $7$ is $240+7=247$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A shopkeeper has ribbons of lengths $84$ cm, $126$ cm, and $210$ cm. He cuts them into equal pieces of the greatest possible length with no leftover. Find the length of each piece and the total number of pieces.`,
        difficulty: 3,
        skillTags: ["hcf_application", "real_life_context"],
        parts: singlePart(
          "a",
          "Find the piece length and total number of pieces.",
          3,
        ),
        hints: [
          "The piece length must divide all three ribbon lengths.",
          "Greatest possible length means HCF.",
          "After finding the length, divide each ribbon length by it.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies HCF as the required length.",
            },
            { part: "a", points: 1, description: "Finds HCF $42$ cm." },
            {
              part: "a",
              points: 1,
              description: "Finds total pieces $2+3+5=10$.",
            },
          ],
        },
        commonErrors: [
          "Using LCM as the cut length.",
          "Stopping after finding the length and not counting the pieces.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The greatest equal piece length is $\\operatorname{HCF}(84,126,210)=42$ cm. The pieces are $84/42=2$, $126/42=3$, and $210/42=5$, so the total number of pieces is $10$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Find the smallest number which is divisible by $30$, $42$, and $70$, and then find the smallest square number divisible by all three.`,
        difficulty: 4,
        skillTags: ["lcm_application", "perfect_square_condition"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the smallest common multiple.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the smallest square common multiple.",
            points: 2,
          },
        ],
        hints: [
          "Use LCM for the first part.",
          "Then inspect the prime powers in that LCM.",
          "$30=2\\cdot3\\cdot5$, $42=2\\cdot3\\cdot7$, $70=2\\cdot5\\cdot7$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds LCM as $210$." },
            {
              part: "b",
              points: 2,
              description:
                "Recognises $210=2\\cdot3\\cdot5\\cdot7$ and finds square multiple $44100$.",
            },
          ],
        },
        commonErrors: [
          "Leaving $210$ as the answer for the square condition.",
          "Squaring each original number instead of making the common multiple a square.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The smallest number divisible by all three is $\\operatorname{LCM}(30,42,70)=2\\cdot3\\cdot5\\cdot7=210$.",
          },
          {
            part: "b",
            explanation:
              "For a perfect square, every prime exponent must be even. Since $210=2\\cdot3\\cdot5\\cdot7$, multiply by $2\\cdot3\\cdot5\\cdot7=210$. The smallest square common multiple is $210\\times210=44100$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A stadium entrance has three automatic counters. One flashes after every $48$ visitors, another after every $60$ visitors, and the third after every $72$ visitors. All three flash together when counting starts.`,
        difficulty: 3,
        skillTags: ["lcm_application", "case_based_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "After how many visitors will all three counters next flash together?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "At that instant, how many times has the $48$-visitor counter flashed after the start?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "A student says the answer to part (a) should be the HCF. Explain why that is wrong.",
            points: 1,
          },
        ],
        hints: [
          "A common flash must be a common multiple of all three visitor counts.",
          "Find the least common multiple.",
          "HCF gives a common divisor, not a repeated meeting count.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds LCM $720$ visitors." },
            { part: "b", points: 1, description: "Finds $720/48=15$ flashes." },
            {
              part: "c",
              points: 1,
              description:
                "Explains that repeated simultaneous events require common multiples, not common divisors.",
            },
          ],
        },
        commonErrors: [
          "Using HCF $12$ as the next common flash count.",
          "Counting the starting flash as one of the flashes after the start.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$48=2^4\\cdot3$, $60=2^2\\cdot3\\cdot5$, and $72=2^3\\cdot3^2$. The LCM is $2^4\\cdot3^2\\cdot5=720$, so all three next flash together after $720$ visitors.",
          },
          {
            part: "b",
            explanation:
              "The $48$-visitor counter flashes $720/48=15$ times after the start by then.",
          },
          {
            part: "c",
            explanation:
              "The HCF is a common divisor and would describe equal grouping, not the next count reached by all periodic counters. For simultaneous repetition, we need the least common multiple.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Irrationality Proofs",
    subtopic:
      "Algebraic proofs of irrationality for square roots and related surd expressions.",
    mc: [
      {
        questionLatex: L`In a proof that $\sqrt5$ is irrational, after assuming $\sqrt5=\frac{p}{q}$ in lowest terms, which conclusion follows from $p^2=5q^2$?`,
        difficulty: 3,
        skillTags: ["irrationality_proof", "prime_divisibility"],
        choices: [
          L`$5$ divides $q$ only`,
          L`$p$ and $q$ are both odd`,
          L`$p^2$ is not divisible by $5$`,
          L`$5$ divides $p$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The immediate conclusion from $p^2=5q^2$ is that $5$ divides $p^2$, hence $5$ divides $p$.",
          B: "Odd/even reasoning is useful for $\\sqrt2$, not for the prime $5$ here.",
          C: "The equation directly shows that $p^2$ is divisible by $5$.",
        },
        hints: [
          "Look at divisibility by the prime $5$.",
          "If a prime divides $p^2$, it divides $p$.",
          "$p^2=5q^2$ makes $p^2$ a multiple of $5$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$p^2=5q^2$ implies $5$ divides $p^2$. Since $5$ is prime, $5$ divides $p$.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`Which of the following is irrational?`,
        difficulty: 2,
        skillTags: ["surd_expression_classification"],
        choices: [
          L`$\sqrt{25}+2$`,
          L`$3+\sqrt5$`,
          L`$\sqrt{16}-7$`,
          L`$2\sqrt{9}-1$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "$\\sqrt{25}=5$, so this equals $7$, a rational number.",
          C: "$\\sqrt{16}=4$, so this equals $-3$, a rational number.",
          D: "$\\sqrt{9}=3$, so this equals $5$, a rational number.",
        },
        hints: [
          "Simplify square roots of perfect squares first.",
          "A rational number plus an irrational number is irrational.",
          "$\\sqrt5$ is irrational.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\sqrt5$ is irrational, so $3+\\sqrt5$ is irrational. The other options simplify to integers.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): $3+2\sqrt5$ is irrational. Reason (R): A non-zero rational multiple of an irrational number is irrational, and adding a rational number to it remains irrational. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "irrationality_of_surd_expression"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The Reason gives the exact closure argument needed to explain why $3+2\\sqrt5$ is irrational.",
          C: "The Reason is true for a non-zero rational multiplier and rational shift.",
          D: "The Assertion is true because $2\\sqrt5$ is irrational and adding $3$ cannot make it rational.",
        },
        hints: [
          "$\\sqrt5$ is irrational.",
          "Multiplying by $2$ does not remove irrationality.",
          "Adding $3$ would make $2\\sqrt5$ rational if the whole expression were rational.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Because $\\sqrt5$ is irrational, $2\\sqrt5$ is irrational. Adding the rational number $3$ keeps the expression irrational, so both A and R are true and R explains A.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`A student writes: "Since $\sqrt2$ and $\sqrt8$ are irrational, their sum must also be irrational." Which response is the most precise?`,
        difficulty: 3,
        skillTags: ["surd_simplification", "proof_quality"],
        choices: [
          "The conclusion is false because any two irrational numbers have rational sum.",
          "The conclusion is true, but the reason is incomplete because sums of irrational numbers are not always irrational.",
          "The conclusion is false because $\\sqrt2+\\sqrt8=4$.",
          "The conclusion is true because every irrational number is a square root.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Some irrational sums are rational, but not all; for example $\\sqrt2+\\sqrt8$ is irrational.",
          C: "$\\sqrt8=2\\sqrt2$, so the sum is $3\\sqrt2$, not $4$.",
          D: "Not every irrational number is a square root, and this does not justify the sum.",
        },
        hints: [
          "Simplify $\\sqrt8$ first.",
          "Check whether the conclusion and the given reason are both valid.",
          "$\\sqrt2+\\sqrt8=3\\sqrt2$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\sqrt8=2\\sqrt2$, so $\\sqrt2+\\sqrt8=3\\sqrt2$, which is irrational. However, the stated reason is incomplete because two irrational numbers can have a rational sum, such as $\\sqrt2+(-\\sqrt2)=0$.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`If $7-4\sqrt3$ were rational, which statement would immediately lead to a contradiction?`,
        difficulty: 3,
        skillTags: ["irrationality_of_surd_expression", "contradiction_proof"],
        choices: [
          L`$7$ would be irrational.`,
          L`$4\sqrt3$ would be an integer.`,
          L`$\sqrt3$ would equal $7$ minus an irrational number.`,
          L`$4\sqrt3$ would be rational, so $\sqrt3$ would be rational.`,
        ],
        correctLetter: "D",
        rationales: {
          A: "$7$ is rational, not irrational.",
          B: "Rationality of the expression would imply rationality of $4\\sqrt3$, not necessarily integrality.",
          C: "This does not isolate $\\sqrt3$ as rational, so it does not give the contradiction.",
        },
        hints: [
          "Assume $7-4\\sqrt3$ is rational.",
          "Move the rational terms to one side.",
          "Divide by the non-zero rational number $4$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "If $7-4\\sqrt3$ is rational, then $4\\sqrt3=7-(7-4\\sqrt3)$ is rational. Dividing by $4$ gives $\\sqrt3$ rational, a contradiction.",
            math: null,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Is $4\sqrt3$ rational or irrational? Give one reason.`,
        difficulty: 1,
        skillTags: ["irrationality_of_surd_expression"],
        parts: singlePart("a", "Classify the number and justify briefly.", 1),
        hints: [
          "$\\sqrt3$ is irrational.",
          "$4$ is a non-zero rational number.",
          "A non-zero rational multiple of an irrational number remains irrational.",
        ],
        rubric: singleRubric("a", 1, "States irrational with a valid reason."),
        commonErrors: [
          "Saying $4\\sqrt3$ is rational because $4$ is rational.",
          "Trying to replace $\\sqrt3$ by a rounded decimal.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$4\\sqrt3$ is irrational because $\\sqrt3$ is irrational and multiplying it by the non-zero rational number $4$ cannot make it rational.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Prove that $\sqrt3$ is irrational.`,
        difficulty: 3,
        skillTags: ["irrationality_proof", "contradiction_proof"],
        parts: singlePart("a", "Write a contradiction proof.", 3),
        hints: [
          "Assume $\\sqrt3=p/q$ in lowest terms.",
          "Square both sides.",
          "Use: if a prime divides $p^2$, then it divides $p$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Assumes $\\sqrt3=p/q$ in lowest terms.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Shows $3$ divides both $p$ and $q$ using prime divisibility.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Concludes this contradicts $p$ and $q$ being coprime.",
            },
          ],
        },
        commonErrors: [
          "Stopping after showing $3$ divides $p$.",
          "Not mentioning the contradiction with lowest terms.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Assume $\\sqrt3=p/q$, where $p$ and $q$ are coprime positive integers. Then $p^2=3q^2$, so $3$ divides $p^2$, hence $3$ divides $p$. Let $p=3k$. Then $9k^2=3q^2$, so $q^2=3k^2$ and $3$ divides $q$. This contradicts $p$ and $q$ being coprime. Therefore $\\sqrt3$ is irrational.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Prove that $2+\sqrt3$ is irrational.`,
        difficulty: 3,
        skillTags: ["irrationality_of_surd_expression", "contradiction_proof"],
        parts: singlePart("a", "Write a proof by contradiction.", 3),
        hints: [
          "Assume the whole expression is rational.",
          "Subtract $2$ from both sides.",
          "A rational minus a rational is rational.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Assumes $2+\\sqrt3$ rational.",
            },
            {
              part: "a",
              points: 1,
              description: "Correctly isolates $\\sqrt3$ as a rational number.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Uses contradiction with irrationality of $\\sqrt3$.",
            },
          ],
        },
        commonErrors: [
          "Only saying irrational plus rational is irrational without explaining.",
          "Using a rounded value of $\\sqrt3$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Suppose $2+\\sqrt3$ is rational. Since $2$ is rational, $(2+\\sqrt3)-2=\\sqrt3$ would be rational. This contradicts the known irrationality of $\\sqrt3$. Hence $2+\\sqrt3$ is irrational.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Prove that $\dfrac{\sqrt5+\sqrt3}{\sqrt5-\sqrt3}$ is irrational.`,
        difficulty: 5,
        skillTags: ["irrationality_of_surd_expression", "contradiction_proof"],
        parts: singlePart("a", "Give a complete proof.", 5),
        hints: [
          "First rationalise the denominator.",
          "The expression simplifies to $4+\\sqrt{15}$.",
          "Now justify why $\\sqrt{15}$ is irrational.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Rationalises the denominator correctly.",
            },
            {
              part: "a",
              points: 1,
              description: "Simplifies the expression to $4+\\sqrt{15}$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Shows or states with proof that $\\sqrt{15}$ is irrational.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Uses rational-irrational reasoning to classify $4+\\sqrt{15}$.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Concludes that the original expression is irrational.",
            },
          ],
        },
        commonErrors: [
          "Assuming every quotient of two irrational numbers is irrational without proof.",
          "Rationalising the denominator but dropping the $2\\sqrt{15}$ term.",
          "Using decimal approximations instead of a contradiction proof.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Rationalising gives $\\dfrac{\\sqrt5+\\sqrt3}{\\sqrt5-\\sqrt3}\\cdot\\dfrac{\\sqrt5+\\sqrt3}{\\sqrt5+\\sqrt3}=\\dfrac{8+2\\sqrt{15}}{2}=4+\\sqrt{15}$. If $\\sqrt{15}$ were rational, say $\\sqrt{15}=p/q$ in lowest terms, then $p^2=15q^2$. Since $3$ divides $p^2$, $3$ divides $p$; writing $p=3r$ gives $3r^2=5q^2$. Now $3$ divides $5q^2$ and $3$ does not divide $5$, so $3$ divides $q^2$ and hence $q$, a contradiction. Thus $\\sqrt{15}$ is irrational, and $4+\\sqrt{15}$ is irrational. Therefore the original expression is irrational.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two students discuss the expression $\sqrt2+\sqrt8$. Student A says it is rational because it is a sum of two similar-looking square roots. Student B says it is irrational but gives no proof.`,
        difficulty: 3,
        skillTags: ["surd_simplification", "case_based_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Simplify $\\sqrt2+\\sqrt8$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Decide whether Student A's conclusion is correct.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Give a proof-level reason for the classification.",
            points: 2,
          },
        ],
        hints: [
          "Write $\\sqrt8$ as $\\sqrt{4\\cdot2}$.",
          "The expression becomes a rational multiple of $\\sqrt2$.",
          "Use the fact that $\\sqrt2$ is irrational.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Simplifies to $3\\sqrt2$." },
            {
              part: "b",
              points: 1,
              description: "States Student A is incorrect.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains that $3\\sqrt2$ is irrational since $3$ is non-zero rational and $\\sqrt2$ is irrational.",
            },
          ],
        },
        commonErrors: [
          "Writing $\\sqrt2+\\sqrt8=\\sqrt{10}$.",
          "Saying any sum of irrational numbers must be irrational without simplification.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\sqrt8=\\sqrt{4\\cdot2}=2\\sqrt2$, so $\\sqrt2+\\sqrt8=3\\sqrt2$.",
          },
          {
            part: "b",
            explanation:
              "Student A is incorrect; the expression is not rational.",
          },
          {
            part: "c",
            explanation:
              "Since $\\sqrt2$ is irrational and $3$ is a non-zero rational number, $3\\sqrt2$ is irrational. Therefore $\\sqrt2+\\sqrt8$ is irrational.",
          },
        ],
      },
    ],
  },
];

export const numberSystemsXTopics: Topic[] = [...topicSeeds].map(makeTopic);
