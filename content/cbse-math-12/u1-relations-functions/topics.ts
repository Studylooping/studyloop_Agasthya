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

const COURSE = "cbse-math-12";
const UNIT = "u1-relations-functions";
const VERSION = "0.2.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const MC_DIFFICULTY_FLOORS = [2, 2, 3, 3, 4] as const;

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
  rationales?: Partial<Record<McLetter, string>>;
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, index: number): Difficulty {
  return Math.max(seedDifficulty, MC_DIFFICULTY_FLOORS[index] ?? 2) as Difficulty;
}

function calibrateConstructedDifficulty(seedDifficulty: Difficulty, type: ResponseType): Difficulty {
  const floor = type === "laq" || type === "case" ? 4 : type === "saq" ? 3 : 2;
  return Math.max(seedDifficulty, floor) as Difficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("relation_properties")) {
    return "Check reflexive, symmetric, and transitive separately; one satisfied property does not imply the others.";
  }
  if (tags.has("equivalence_classes") || tags.has("partition")) {
    return "Find all elements related to the chosen element, not just one example from the class.";
  }
  if (tags.has("one_one") || tags.has("onto")) {
    return "Use the stated domain and codomain; changing either one can change one-one or onto status.";
  }
  if (tags.has("inverse_trig_principal_value") || tags.has("inverse_trig_graph")) {
    return "Use the principal range of the inverse trigonometric function, not any coterminal angle.";
  }
  if (tags.has("inverse_trig_identity") || tags.has("inverse_trig_equation")) {
    return "Convert the inverse-trig statement to the principal angle before applying an identity.";
  }

  return "Use the exact definition required by this CBSE Class 12 topic.";
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
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
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_cbse_functions_reasoning",
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(
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
      "uses_definition_without_checking_conditions",
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

function makeConstructed(meta: TopicMeta, seed: ConstructedSeed, index: number): FrqItem {
  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateConstructedDifficulty(seed.difficulty, seed.responseType),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_answer_without_showing_required_work",
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

function svgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mappingDiagramFigure(config: {
  title: string;
  description: string;
  domainTitle: string;
  codomainTitle: string;
  domain: string[];
  codomain: string[];
  arrows: Array<[string, string]>;
  missed?: string[];
}): ItemFigure {
  const yFor = (items: string[], value: string) => {
    const index = items.indexOf(value);
    const count = Math.max(items.length - 1, 1);
    return 82 + (index < 0 ? 0 : index) * (210 / count);
  };

  const domainNodes = config.domain
    .map((value) => {
      const y = yFor(config.domain, value);
      return `
  <circle cx="165" cy="${y.toFixed(1)}" r="19" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="165" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="15" fill="#1e3a8a" font-family="Arial, sans-serif">${svgText(value)}</text>`;
    })
    .join("");

  const codomainNodes = config.codomain
    .map((value) => {
      const y = yFor(config.codomain, value);
      const isMissed = config.missed?.includes(value);
      return `
  <circle cx="475" cy="${y.toFixed(1)}" r="19" fill="${isMissed ? "#fee2e2" : "#dcfce7"}" stroke="${isMissed ? "#dc2626" : "#16a34a"}" stroke-width="2"/>
  <text x="475" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="15" fill="${isMissed ? "#991b1b" : "#14532d"}" font-family="Arial, sans-serif">${svgText(value)}</text>`;
    })
    .join("");

  const arrows = config.arrows
    .map(([from, to]) => {
      const y1 = yFor(config.domain, from);
      const y2 = yFor(config.codomain, to);
      return `<line x1="188" y1="${y1.toFixed(1)}" x2="448" y2="${y2.toFixed(1)}" stroke="#64748b" stroke-width="2.2" marker-end="url(#arrowhead)"/>`;
    })
    .join("\n  ");

  return {
    type: "svg",
    title: config.title,
    description: config.description,
    svg: `
<svg viewBox="0 0 640 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M 0 0 L 10 4 L 0 8 z" fill="#64748b"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="640" height="360" rx="12" fill="#f8fafc"/>
  <ellipse cx="165" cy="185" rx="86" ry="145" fill="#eff6ff" stroke="#93c5fd" stroke-width="2"/>
  <ellipse cx="475" cy="185" rx="86" ry="145" fill="#f0fdf4" stroke="#86efac" stroke-width="2"/>
  <text x="165" y="42" text-anchor="middle" font-size="17" font-weight="700" fill="#334155" font-family="Arial, sans-serif">${svgText(config.domainTitle)}</text>
  <text x="475" y="42" text-anchor="middle" font-size="17" font-weight="700" fill="#334155" font-family="Arial, sans-serif">${svgText(config.codomainTitle)}</text>
  ${arrows}
  ${domainNodes}
  ${codomainNodes}
</svg>`,
  };
}

function partitionDiagramFigure(config: {
  title: string;
  description: string;
  setTitle: string;
  blocks: Array<{ label: string; items: string[]; color: string }>;
}): ItemFigure {
  const blockWidth = 520 / config.blocks.length;
  const blocks = config.blocks
    .map((block, index) => {
      const x = 40 + index * blockWidth;
      const items = block.items
        .map(
          (item, itemIndex) =>
            `<text x="${(x + blockWidth / 2).toFixed(1)}" y="${(116 + itemIndex * 28).toFixed(1)}" text-anchor="middle" font-size="18" fill="#334155" font-family="Arial, sans-serif">${svgText(item)}</text>`,
        )
        .join("\n  ");
      return `
  <rect x="${x.toFixed(1)}" y="72" width="${(blockWidth - 20).toFixed(1)}" height="176" rx="18" fill="${block.color}" stroke="#64748b" stroke-width="2"/>
  <text x="${(x + blockWidth / 2).toFixed(1)}" y="96" text-anchor="middle" font-size="15" font-weight="700" fill="#334155" font-family="Arial, sans-serif">${svgText(block.label)}</text>
  ${items}`;
    })
    .join("");

  return {
    type: "svg",
    title: config.title,
    description: config.description,
    svg: `
<svg viewBox="0 0 600 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="600" height="300" rx="12" fill="#f8fafc"/>
  <text x="300" y="38" text-anchor="middle" font-size="18" font-weight="700" fill="#334155" font-family="Arial, sans-serif">${svgText(config.setTitle)}</text>
  ${blocks}
</svg>`,
  };
}

const sameHouseRelationFigure = partitionDiagramFigure({
  title: "Same-house relation",
  description:
    "Students 1, 3, and 5 are in one block, while students 2 and 4 are in another block.",
  setTitle: "A = {1, 2, 3, 4, 5}",
  blocks: [
    { label: "House I", items: ["1", "3", "5"], color: "#dbeafe" },
    { label: "House II", items: ["2", "4"], color: "#dcfce7" },
  ],
});

const moduloFourPartitionFigure = partitionDiagramFigure({
  title: "Remainder classes modulo 4",
  description:
    "The set is divided into blocks according to the same remainder when divided by 4.",
  setTitle: "A = {10, 11, 12, 13, 14, 15}",
  blocks: [
    { label: "Remainder 2", items: ["10", "14"], color: "#dbeafe" },
    { label: "Remainder 3", items: ["11", "15"], color: "#dcfce7" },
    { label: "Remainder 0", items: ["12"], color: "#fef3c7" },
    { label: "Remainder 1", items: ["13"], color: "#fce7f3" },
  ],
});

const repeatedImageFunctionFigure = mappingDiagramFigure({
  title: "Finite function with a repeated image",
  description:
    "A mapping from {1,2,3,4} to {a,b,c,d}; inputs 2 and 3 both map to c, and b is missed.",
  domainTitle: "A",
  codomainTitle: "B",
  domain: ["1", "2", "3", "4"],
  codomain: ["a", "b", "c", "d"],
  arrows: [
    ["1", "a"],
    ["2", "c"],
    ["3", "c"],
    ["4", "d"],
  ],
  missed: ["b"],
});

const repeatedImageThreeFunctionFigure = mappingDiagramFigure({
  title: "Finite function that misses one codomain value",
  description:
    "A mapping from {1,2,3} to {a,b,c}; inputs 1 and 2 both map to a, and b is missed.",
  domainTitle: "A",
  codomainTitle: "B",
  domain: ["1", "2", "3"],
  codomain: ["a", "b", "c"],
  arrows: [
    ["1", "a"],
    ["2", "a"],
    ["3", "c"],
  ],
  missed: ["b"],
});

const linearFiniteFunctionFigure = mappingDiagramFigure({
  title: "Finite function",
  description:
    "The function f from A = {1, 2, 3, 4} to B = {3, 5, 7, 9}.",
  domainTitle: "A",
  codomainTitle: "B",
  domain: ["1", "2", "3", "4"],
  codomain: ["3", "5", "7", "9"],
  arrows: [
    ["1", "3"],
    ["2", "5"],
    ["3", "7"],
    ["4", "9"],
  ],
});

const badgeFunctionFigure = mappingDiagramFigure({
  title: "Badge-number function",
  description:
    "The function f from members 1 through 5 to badge numbers 10 through 60; badge 60 is not assigned.",
  domainTitle: "Members",
  codomainTitle: "Badges",
  domain: ["1", "2", "3", "4", "5"],
  codomain: ["10", "20", "30", "40", "50", "60"],
  arrows: [
    ["1", "10"],
    ["2", "20"],
    ["3", "30"],
    ["4", "40"],
    ["5", "50"],
  ],
  missed: ["60"],
});

const arcsinFigure: ItemFigure = {
  type: "svg",
  title: "Graph of inverse sine",
  description:
    "The graph of y equals inverse sine x on the principal branch from x equals negative 1 to x equals 1.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <line x1="64" y1="170" x2="500" y2="170" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="42" x2="280" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 500 170 L 490 164 M 500 170 L 490 176" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 280 42 L 274 54 M 280 42 L 286 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="508" y="175" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="288" y="40" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <line x1="90" y1="86" x2="280" y2="86" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="90" y1="254" x2="280" y2="254" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="90" y1="86" x2="90" y2="170" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="470" y1="170" x2="470" y2="86" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <text x="78" y="188" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <text x="464" y="188" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="236" y="91" font-size="14" fill="#334155" font-family="Arial, sans-serif">pi/2</text>
  <text x="228" y="260" font-size="14" fill="#334155" font-family="Arial, sans-serif">-pi/2</text>
  <path d="M 90 254 C 154 238, 223 205, 280 170 C 337 135, 406 102, 470 86" stroke="#2563eb" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="90" cy="254" r="5" fill="#2563eb"/>
  <circle cx="280" cy="170" r="5" fill="#2563eb"/>
  <circle cx="470" cy="86" r="5" fill="#2563eb"/>
  <text x="320" y="132" font-size="17" fill="#1d4ed8" font-family="Arial, sans-serif">y = sin^-1 x</text>
</svg>`,
};

const arccosFigure: ItemFigure = {
  type: "svg",
  title: "Graph of inverse cosine",
  description:
    "The graph of y equals inverse cosine x on the principal branch from x equals negative 1 to x equals 1.",
  svg: `
<svg viewBox="0 0 560 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc"/>
  <line x1="64" y1="254" x2="500" y2="254" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="42" x2="280" y2="292" stroke="#64748b" stroke-width="2"/>
  <path d="M 500 254 L 490 248 M 500 254 L 490 260" stroke="#64748b" stroke-width="2" fill="none"/>
  <path d="M 280 42 L 274 54 M 280 42 L 286 54" stroke="#64748b" stroke-width="2" fill="none"/>
  <text x="508" y="259" font-size="15" fill="#475569" font-family="Arial, sans-serif">x</text>
  <text x="288" y="40" font-size="15" fill="#475569" font-family="Arial, sans-serif">y</text>
  <line x1="90" y1="86" x2="280" y2="86" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="280" y1="170" x2="470" y2="170" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="90" y1="86" x2="90" y2="254" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <line x1="470" y1="170" x2="470" y2="254" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <text x="78" y="272" font-size="14" fill="#334155" font-family="Arial, sans-serif">-1</text>
  <text x="464" y="272" font-size="14" fill="#334155" font-family="Arial, sans-serif">1</text>
  <text x="250" y="91" font-size="14" fill="#334155" font-family="Arial, sans-serif">pi</text>
  <text x="245" y="175" font-size="14" fill="#334155" font-family="Arial, sans-serif">pi/2</text>
  <path d="M 90 86 C 154 102, 223 135, 280 170 C 337 205, 406 238, 470 254" stroke="#7c3aed" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="90" cy="86" r="5" fill="#7c3aed"/>
  <circle cx="280" cy="170" r="5" fill="#7c3aed"/>
  <circle cx="470" cy="254" r="5" fill="#7c3aed"/>
  <text x="316" y="210" font-size="17" fill="#6d28d9" font-family="Arial, sans-serif">y = cos^-1 x</text>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Relations and Their Properties",
    subtopic:
      "CBSE-style checks of reflexive, symmetric, and transitive properties.",
    mc: [
      {
        questionLatex:
          "\\text{Let }A=\\{1,2,3\\}\\text{ and }R=\\{(1,1),(2,2),(3,3),(1,2),(2,1)\\}.\\text{ Which is true?}",
        difficulty: 2,
        skillTags: ["relation_properties"],
        choices: [
          "$R\\text{ is reflexive and symmetric but not transitive.}$",
          "$R\\text{ is reflexive but not symmetric.}$",
          "$R\\text{ is symmetric but not reflexive.}$",
          "$R\\text{ is an equivalence relation.}$",
        ],
        correctLetter: "D",
        hints: [
          "All diagonal pairs are present.",
          "$(1,2)$ and $(2,1)$ are both present.",
          "$(1,2)$ and $(2,1)$ would require $(1,1)$, which is present; check no missing transitive case carefully.",
        ],
        solution: [
          { step: 1, explanation: "The relation is reflexive and symmetric.", math: "(1,1),(2,2),(3,3)\\in R" },
          { step: 2, explanation: "It is also transitive, so the correct statement is that it is an equivalence relation.", math: "R\\text{ is an equivalence relation}" },
        ],
        rationales: {
          A: "The wording seems plausible, but transitivity does not fail here; all required chains stay within existing pairs.",
          B: "Symmetry holds because $(1,2)$ and $(2,1)$ are both present.",
          C: "Reflexivity holds because all diagonal pairs are present.",
        },
      },
      {
        questionLatex:
          "\\text{On }\\mathbb Z,\\text{ define }aRb\\text{ if }a-b\\text{ is divisible by }4.\\text{ The relation is}",
        difficulty: 2,
        skillTags: ["relation_properties", "equivalence_relation"],
        choices: [
          "$\\text{reflexive, symmetric, and transitive}$",
          "$\\text{reflexive only}$",
          "$\\text{symmetric only}$",
          "$\\text{not reflexive}$",
        ],
        correctLetter: "A",
        hints: [
          "$a-a=0$ is divisible by $4$.",
          "If $a-b$ is divisible by $4$, then so is $b-a$.",
          "Add two differences to prove transitivity.",
        ],
        solution: [
          { step: 1, explanation: "All three properties hold.", math: "a-c=(a-b)+(b-c)" },
        ],
      },
      {
        questionLatex:
          "\\text{On }\\mathbb R,\\text{ define }xRy\\text{ if }x<y.\\text{ Which property is satisfied?}",
        difficulty: 3,
        skillTags: ["relation_properties"],
        choices: [
          "$\\text{Transitive only}$",
          "$\\text{Reflexive only}$",
          "$\\text{Symmetric only}$",
          "$\\text{Reflexive and symmetric}$",
        ],
        correctLetter: "A",
        hints: [
          "$x<x$ is false.",
          "$x<y$ does not imply $y<x$.",
          "If $x<y$ and $y<z$, then $x<z$.",
        ],
        solution: [
          { step: 1, explanation: "The strict less-than relation is transitive, but not reflexive or symmetric.", math: "x<y<z\\Rightarrow x<z" },
        ],
      },
      {
        questionLatex:
          "\\text{Let }A=\\{1,2,3,4\\}\\text{ and }aRb\\text{ if }a+b\\text{ is odd. Which property fails immediately?}",
        difficulty: 3,
        skillTags: ["relation_properties"],
        choices: [
          "$\\text{Reflexive}$",
          "$\\text{Symmetric}$",
          "$\\text{Neither reflexive nor symmetric}$",
          "$\\text{Both reflexive and symmetric hold}$",
        ],
        correctLetter: "A",
        hints: [
          "For reflexivity, check whether $a+a$ is odd.",
          "$2a$ is always even.",
          "So no element is related to itself.",
        ],
        solution: [
          { step: 1, explanation: "Reflexivity fails because $aRa$ would need $2a$ to be odd.", math: "a+a=2a\\text{ is even}" },
        ],
      },
      {
        questionLatex:
          "\\text{Assertion (A): The relation }aRb\\iff a-b\\in\\mathbb Z\\text{ on }\\mathbb R\\text{ is an equivalence relation. Reason (R): The sum of two integers is an integer.}",
        difficulty: 4,
        skillTags: ["relation_properties", "assertion_reason"],
        choices: [
          "$\\text{Both A and R are true, and R explains transitivity in A.}$",
          "$\\text{Both A and R are true, but R is unrelated to A.}$",
          "$\\text{A is true, but R is false.}$",
          "$\\text{A is false, but R is true.}$",
        ],
        correctLetter: "A",
        hints: [
          "The relation groups real numbers with the same fractional part.",
          "Transitivity uses $(a-b)+(b-c)=a-c$.",
          "The reason explains why the sum remains an integer.",
        ],
        solution: [
          { step: 1, explanation: "The assertion is true, and the reason supports the transitivity part.", math: "a-c=(a-b)+(b-c)\\in\\mathbb Z" },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Let }A=\\{1,2\\}\\text{ and }R=\\{(1,1),(2,2),(1,2)\\}.",
        difficulty: 2,
        skillTags: ["relation_properties"],
        parts: singlePart("a", "Is $R$ reflexive? Give one line.", 2),
        hints: [
          "Reflexive means every element is related to itself.",
          "Check $(1,1)$ and $(2,2)$.",
          "Both diagonal pairs are present.",
        ],
        rubric: singleRubric("a", 2, "States that $R$ is reflexive and identifies both diagonal pairs."),
        commonErrors: ["Checking only $(1,1)$ and forgetting $(2,2)$."],
        workedSolution: [{ part: "a", explanation: "Yes. Since $(1,1)$ and $(2,2)$ are both in $R$, every element of $A$ is related to itself." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{On }\\mathbb R,\\text{ define }xRy\\text{ if }x-y=0.\\text{ Name the relation in familiar terms.}",
        difficulty: 2,
        skillTags: ["relation_properties"],
        parts: singlePart("a", "Write the familiar relation represented by $R$.", 2),
        hints: [
          "$x-y=0$ means $x=y$.",
          "So related elements are equal.",
          "This is the equality relation.",
        ],
        rubric: singleRubric("a", 2, "Recognizes the relation as equality and writes $x=y$."),
        commonErrors: ["Calling it less-than or divisibility instead of equality."],
        workedSolution: [{ part: "a", explanation: "$x-y=0$ gives $x=y$. Hence $R$ is the equality relation on $\\mathbb R$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Let }A=\\{1,2,3\\}\\text{ and }R=\\{(1,1),(2,2),(3,3),(1,2),(2,3),(1,3)\\}.",
        difficulty: 3,
        skillTags: ["relation_properties"],
        parts: singlePart("a", "Check whether $R$ is symmetric and transitive.", 3),
        hints: [
          "Symmetry requires reverse pairs.",
          "Transitivity requires pair chaining.",
          "$(1,2)$ is present but $(2,1)$ is not.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "States that symmetry fails." },
            { part: "a", points: 1, description: "Gives a correct counterexample for symmetry." },
            { part: "a", points: 1, description: "Correctly states that transitivity holds." },
          ],
        },
        commonErrors: ["Assuming every relation with diagonal pairs is symmetric.", "Missing the transitivity chain $(1,2),(2,3)\\Rightarrow(1,3)$."],
        workedSolution: [{ part: "a", explanation: "The relation is not symmetric because $(1,2)\\in R$ but $(2,1)\\notin R$. It is transitive: the only nontrivial chain $(1,2)$ and $(2,3)$ requires $(1,3)$, which is present; all chains with diagonal pairs also work." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{On }A=\\{1,2,3,4,5,6\\},\\text{ define }aRb\\text{ if }a-b\\text{ is divisible by }3.",
        difficulty: 4,
        skillTags: ["equivalence_relation", "equivalence_classes"],
        parts: [
          { letter: "a", promptMarkdown: "Show that $R$ is reflexive, symmetric, and transitive.", points: 3 },
          { letter: "b", promptMarkdown: "Find all distinct equivalence classes.", points: 2 },
        ],
        hints: [
          "Use divisibility of $0$, negatives, and sums.",
          "Group numbers by the same remainder on division by $3$.",
          "The classes are remainder $0$, remainder $1$, and remainder $2$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Proves reflexivity." },
            { part: "a", points: 1, description: "Proves symmetry." },
            { part: "a", points: 1, description: "Proves transitivity." },
            { part: "b", points: 1, description: "Finds two correct classes." },
            { part: "b", points: 1, description: "Finds all three distinct classes." },
          ],
        },
        commonErrors: ["Grouping by quotient instead of remainder.", "Writing repeated classes such as $[1]$ and $[4]$ as different classes."],
        workedSolution: [
          { part: "a", explanation: "For any $a$, $a-a=0$ is divisible by $3$, so $R$ is reflexive. If $a-b$ is divisible by $3$, then $b-a=-(a-b)$ is divisible by $3$, so $R$ is symmetric. If $a-b$ and $b-c$ are divisible by $3$, then $a-c=(a-b)+(b-c)$ is divisible by $3$, so $R$ is transitive." },
          { part: "b", explanation: "The classes are $\\{1,4\\}$, $\\{2,5\\}$, and $\\{3,6\\}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{In a school activity, }A=\\{1,2,3,4,5\\}\\text{ represents five students. Students }1,3,5\\text{ are in one house and students }2,4\\text{ are in another house. Define }aRb\\text{ if students }a\\text{ and }b\\text{ are in the same house.}",
        difficulty: 4,
        skillTags: ["relation_properties", "equivalence_relation", "case_based"],
        figure: sameHouseRelationFigure,
        parts: [
          { letter: "a", promptMarkdown: "State whether $1R3$ and $1R2$ are true.", points: 1 },
          { letter: "b", promptMarkdown: "Find the equivalence class $[4]$.", points: 1 },
          { letter: "c", promptMarkdown: "Check whether $R$ is reflexive, symmetric, and transitive.", points: 2 },
        ],
        hints: [
          "Same house is the rule for relatedness.",
          "The class $[4]$ contains all students in the same house as student $4$.",
          "A same-group relation is usually an equivalence relation.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Correctly states $1R3$ is true and $1R2$ is false." },
            { part: "b", points: 1, description: "Finds $[4]=\\{2,4\\}$." },
            { part: "c", points: 1, description: "Correctly states and justifies reflexive and symmetric." },
            { part: "c", points: 1, description: "Correctly states and justifies transitive." },
          ],
        },
        commonErrors: [
          "Treating students in different houses as related.",
          "Writing only $\\{4\\}$ for $[4]$.",
          "Checking one property and calling it an equivalence relation.",
        ],
        workedSolution: [
          { part: "a", explanation: "$1R3$ is true because $1$ and $3$ are in the same house. $1R2$ is false because $1$ and $2$ are in different houses." },
          { part: "b", explanation: "Student $4$ is in the house $\\{2,4\\}$, so $[4]=\\{2,4\\}$." },
          { part: "c", explanation: "Every student is in the same house as itself, so $R$ is reflexive. If $a$ is in the same house as $b$, then $b$ is in the same house as $a$, so $R$ is symmetric. If $a$ is in the same house as $b$ and $b$ is in the same house as $c$, then all three are in the same house, so $aRc$; hence $R$ is transitive." },
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Equivalence Classes and Partitions",
    subtopic:
      "Finding classes and partitions from a finite set or a modular rule.",
    mc: [
      {
        questionLatex:
          "\\text{On }\\mathbb Z,\\text{ define }aRb\\text{ if }a-b\\text{ is even. Which is }[4]?",
        difficulty: 2,
        skillTags: ["equivalence_classes"],
        choices: [
          "$\\{\\ldots,-2,0,2,4,6,\\ldots\\}$",
          "$\\{\\ldots,-3,-1,1,3,5,\\ldots\\}$",
          "$\\{4\\}$",
          "$\\mathbb Z$",
        ],
        correctLetter: "A",
        hints: [
          "The class of $4$ contains integers with the same parity as $4$.",
          "$4-b$ is even when $b$ is even.",
          "So $[4]$ is the set of all even integers.",
        ],
        solution: [{ step: 1, explanation: "All integers related to $4$ are even.", math: "[4]=\\{b\\in\\mathbb Z:4-b\\text{ is even}\\}" }],
      },
      {
        questionLatex:
          "\\text{A partition of }A=\\{1,2,3,4,5\\}\\text{ is }\\{\\{1,5\\},\\{2,3,4\\}\\}.\\text{ Number of ordered pairs in the induced relation is}",
        difficulty: 2,
        skillTags: ["partition", "equivalence_classes"],
        choices: ["$13$", "$10$", "$25$", "$5$"],
        correctLetter: "A",
        hints: [
          "A block with $n$ elements contributes $n^2$ ordered pairs.",
          "The block sizes are $2$ and $3$.",
          "$2^2+3^2=13$.",
        ],
        solution: [{ step: 1, explanation: "Count pairs within each block.", math: "2^2+3^2=13" }],
      },
      {
        questionLatex:
          "\\text{Let }A=\\{1,2,3,4\\}\\text{ and }R=\\{(1,1),(2,2),(3,3),(4,4),(1,4),(4,1)\\}.\\text{ Distinct classes are}",
        difficulty: 3,
        skillTags: ["equivalence_classes"],
        choices: [
          "$\\{1,4\\},\\{2\\},\\{3\\}$",
          "$\\{1\\},\\{2\\},\\{3\\},\\{4\\}$",
          "$\\{1,2,4\\},\\{3\\}$",
          "$\\{1,4\\},\\{2,3\\}$",
        ],
        correctLetter: "A",
        hints: [
          "$1$ and $4$ are related to each other.",
          "$2$ has only its diagonal pair.",
          "$3$ has only its diagonal pair.",
        ],
        solution: [{ step: 1, explanation: "Read the connected blocks from the ordered pairs.", math: "\\{1,4\\},\\{2\\},\\{3\\}" }],
      },
      {
        questionLatex:
          "\\text{If }[a]\\cap[b]\\ne\\varnothing\\text{ for an equivalence relation, then}",
        difficulty: 3,
        skillTags: ["equivalence_classes", "partition"],
        choices: ["$[a]=[b]$", "$[a]\\subset[b]\\text{ always}$", "$[a]\\cap[b]=\\{a,b\\}$", "$a=b\\text{ necessarily}$"],
        correctLetter: "A",
        hints: [
          "Equivalence classes form partition blocks.",
          "Two partition blocks cannot partially overlap.",
          "If two classes overlap, they are identical.",
        ],
        solution: [{ step: 1, explanation: "Equivalence classes are either disjoint or equal.", math: "[a]\\cap[b]\\ne\\varnothing\\Rightarrow [a]=[b]" }],
      },
      {
        questionLatex:
          "\\text{On }\\mathbb N,\\text{ define }aRb\\text{ if }\\gcd(a,6)=\\gcd(b,6).\\text{ Which describes }[2]?",
        difficulty: 4,
        skillTags: ["equivalence_classes"],
        choices: [
          "$\\{n\\in\\mathbb N:\\gcd(n,6)=2\\}$",
          "$\\{2,4\\}$",
          "$\\{n\\in\\mathbb N:n\\text{ is even}\\}$",
          "$\\{n\\in\\mathbb N:n\\text{ is not divisible by }3\\}$",
        ],
        correctLetter: "A",
        hints: [
          "First compute $\\gcd(2,6)$.",
          "The class of $2$ contains all natural numbers with the same gcd with $6$.",
          "That gcd must be exactly $2$.",
        ],
        solution: [{ step: 1, explanation: "Use the defining rule.", math: "[2]=\\{n\\in\\mathbb N:\\gcd(n,6)=2\\}" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{On }\\mathbb Z,\\text{ define }aRb\\text{ if }a-b\\text{ is divisible by }5.",
        difficulty: 2,
        skillTags: ["equivalence_classes"],
        parts: singlePart("a", "Write the equivalence class $[2]$.", 2),
        hints: [
          "$[2]$ means all integers congruent to $2$ modulo $5$.",
          "Write the class in set-builder form.",
          "Use $2+5k$.",
        ],
        rubric: singleRubric("a", 2, "Writes $[2]=\\{2+5k:k\\in\\mathbb Z\\}$ or an equivalent description."),
        commonErrors: ["Writing only a finite list instead of the full infinite class."],
        workedSolution: [{ part: "a", explanation: "$[2]=\\{x\\in\\mathbb Z:x-2\\text{ is divisible by }5\\}=\\{2+5k:k\\in\\mathbb Z\\}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{A partition of }A\\text{ has block sizes }1,2,4.",
        difficulty: 2,
        skillTags: ["partition"],
        parts: singlePart("a", "Find the number of ordered pairs in the corresponding equivalence relation.", 2),
        hints: [
          "Each block contributes ordered pairs within itself.",
          "Use $1^2+2^2+4^2$.",
          "Add the values.",
        ],
        rubric: singleRubric("a", 2, "Computes $1^2+2^2+4^2=21$."),
        commonErrors: ["Adding block sizes instead of squares of block sizes."],
        workedSolution: [{ part: "a", explanation: "The number of ordered pairs is $1^2+2^2+4^2=1+4+16=21$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Let }A=\\{1,2,3,4,5,6\\}\\text{ and }aRb\\text{ if }a\\text{ and }b\\text{ have the same parity.}",
        difficulty: 3,
        skillTags: ["equivalence_classes", "partition"],
        parts: singlePart("a", "Find all equivalence classes and the partition of $A$.", 3),
        hints: [
          "Same parity means both odd or both even.",
          "Group odd elements together.",
          "Group even elements together.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds the odd class $\\{1,3,5\\}$." },
            { part: "a", points: 1, description: "Finds the even class $\\{2,4,6\\}$." },
            { part: "a", points: 1, description: "Writes the partition correctly." },
          ],
        },
        commonErrors: ["Writing six singleton classes.", "Putting one odd and one even element in the same class."],
        workedSolution: [{ part: "a", explanation: "The odd elements form one class $\\{1,3,5\\}$ and the even elements form another class $\\{2,4,6\\}$. Hence the partition is $\\{\\{1,3,5\\},\\{2,4,6\\}\\}$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Let }R\\text{ be the relation on }\\mathbb Z\\text{ defined by }aRb\\iff a\\equiv b\\pmod 4.",
        difficulty: 4,
        skillTags: ["equivalence_relation", "equivalence_classes"],
        parts: [
          { letter: "a", promptMarkdown: "Show that $R$ is an equivalence relation.", points: 3 },
          { letter: "b", promptMarkdown: "Write the four distinct equivalence classes.", points: 2 },
        ],
        hints: [
          "Use divisibility of $a-b$ by $4$.",
          "Possible remainders modulo $4$ are $0,1,2,3$.",
          "Write each class as $r+4k$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Proves reflexivity." },
            { part: "a", points: 1, description: "Proves symmetry." },
            { part: "a", points: 1, description: "Proves transitivity." },
            { part: "b", points: 1, description: "Writes at least two correct classes." },
            { part: "b", points: 1, description: "Writes all four classes." },
          ],
        },
        commonErrors: ["Forgetting the class with remainder $0$.", "Listing only positive integers."],
        workedSolution: [
          { part: "a", explanation: "Since $a-a=0$, reflexivity holds. If $a-b$ is divisible by $4$, then $b-a=-(a-b)$ is divisible by $4$, so symmetry holds. If $a-b$ and $b-c$ are divisible by $4$, then $a-c=(a-b)+(b-c)$ is divisible by $4$, so transitivity holds." },
          { part: "b", explanation: "The four classes are $[0]=\\{4k:k\\in\\mathbb Z\\}$, $[1]=\\{1+4k:k\\in\\mathbb Z\\}$, $[2]=\\{2+4k:k\\in\\mathbb Z\\}$, and $[3]=\\{3+4k:k\\in\\mathbb Z\\}$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Let }A=\\{10,11,12,13,14,15\\}.\\text{ Define a relation }R\\text{ on }A\\text{ by }aRb\\text{ if }a\\text{ and }b\\text{ have the same remainder when divided by }4.",
        difficulty: 4,
        skillTags: ["equivalence_classes", "partition", "case_based"],
        figure: moduloFourPartitionFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find $[10]$.", points: 1 },
          { letter: "b", promptMarkdown: "Write the partition of $A$ formed by this relation.", points: 2 },
          { letter: "c", promptMarkdown: "Find the number of ordered pairs in $R$.", points: 1 },
        ],
        hints: [
          "Compute remainders on division by $4$.",
          "Numbers with the same remainder form one class.",
          "A block with $n$ elements contributes $n^2$ ordered pairs.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $[10]=\\{10,14\\}$." },
            { part: "b", points: 2, description: "Writes all four blocks of the partition correctly." },
            { part: "c", points: 1, description: "Computes the number of ordered pairs as $10$." },
          ],
        },
        commonErrors: [
          "Grouping numbers by closeness instead of remainder.",
          "Forgetting singleton classes.",
          "Counting block sizes instead of squares of block sizes.",
        ],
        workedSolution: [
          { part: "a", explanation: "$10$ and $14$ leave remainder $2$ on division by $4$, so $[10]=\\{10,14\\}$." },
          { part: "b", explanation: "The partition is $\\{\\{10,14\\},\\{11,15\\},\\{12\\},\\{13\\}\\}$." },
          { part: "c", explanation: "The block sizes are $2,2,1,1$, so the number of ordered pairs is $2^2+2^2+1^2+1^2=10$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "One-One and Onto Functions",
    subtopic:
      "Checking injective and surjective functions using formulas, finite mappings, and codomains.",
    mc: [
      {
        questionLatex:
          "\\text{The function }f:\\mathbb R\\to\\mathbb R\\text{ given by }f(x)=5x-7\\text{ is}",
        difficulty: 2,
        skillTags: ["one_one", "onto"],
        choices: [
          "$\\text{one-one and onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
          "$\\text{neither one-one nor onto}$",
        ],
        correctLetter: "A",
        hints: [
          "A nonzero-slope linear function is one-one.",
          "For any $y\\in\\mathbb R$, solve $y=5x-7$.",
          "$x=(y+7)/5$ is real.",
        ],
        solution: [{ step: 1, explanation: "The function is bijective.", math: "y=5x-7\\Rightarrow x=\\frac{y+7}{5}" }],
      },
      {
        questionLatex:
          "\\text{For }f:\\mathbb R\\to\\mathbb R,\\ f(x)=x^2,\\text{ the function is}",
        difficulty: 2,
        skillTags: ["one_one", "onto"],
        choices: [
          "$\\text{neither one-one nor onto}$",
          "$\\text{one-one and onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
        ],
        correctLetter: "A",
        hints: [
          "$f(1)=f(-1)$.",
          "Negative real numbers are not outputs.",
          "So both tests fail.",
        ],
        solution: [{ step: 1, explanation: "The function repeats values and misses negative outputs.", math: "f(1)=f(-1),\\quad f(x)\\ge0" }],
      },
      {
        questionLatex:
          "\\text{For }f:[0,\\infty)\\to[0,\\infty),\\ f(x)=x^2,\\text{ the function is}",
        difficulty: 3,
        skillTags: ["one_one", "onto", "domain_codomain"],
        choices: [
          "$\\text{one-one and onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
          "$\\text{neither one-one nor onto}$",
        ],
        correctLetter: "A",
        hints: [
          "The domain is restricted to nonnegative inputs.",
          "$x^2$ is increasing on $[0,\\infty)$.",
          "Every $y\\ge0$ has preimage $\\sqrt y$.",
        ],
        solution: [{ step: 1, explanation: "The restriction makes $x^2$ bijective.", math: "y\\ge0\\Rightarrow f(\\sqrt y)=y" }],
      },
      {
        questionLatex:
          "\\text{Let }f:\\{1,2,3\\}\\to\\{a,b,c\\}\\text{ be }f(1)=a,f(2)=a,f(3)=c.\\text{ Then }f\\text{ is}",
        difficulty: 3,
        skillTags: ["finite_function", "one_one", "onto"],
        figure: repeatedImageThreeFunctionFigure,
        choices: [
          "$\\text{neither one-one nor onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
          "$\\text{one-one and onto}$",
        ],
        correctLetter: "A",
        hints: [
          "Two inputs map to $a$.",
          "No input maps to $b$.",
          "So it fails both tests.",
        ],
        solution: [{ step: 1, explanation: "Two inputs share one image, and one codomain element is missed.", math: "f(1)=f(2)=a,\\quad b\\notin f(A)" }],
      },
      {
        questionLatex:
          "\\text{If }f:A\\to B\\text{ is onto and }|A|=5, |B|=5,\\text{ then }f\\text{ is}",
        difficulty: 4,
        skillTags: ["finite_function", "one_one", "onto"],
        choices: [
          "$\\text{one-one}$",
          "$\\text{not one-one}$",
          "$\\text{constant}$",
          "$\\text{not a function}$",
        ],
        correctLetter: "A",
        hints: [
          "Five inputs hit all five elements of $B$.",
          "If two inputs shared an output, at most four outputs could be hit.",
          "So every output is hit exactly once.",
        ],
        solution: [{ step: 1, explanation: "For finite sets of equal size, onto implies one-one.", math: "|A|=|B|<\\infty" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Show that }f:\\mathbb R\\to\\mathbb R,\\ f(x)=2x+3\\text{ is one-one.}",
        difficulty: 2,
        skillTags: ["one_one"],
        parts: singlePart("a", "Prove one-one using $f(a)=f(b)$.", 2),
        hints: [
          "Start with $2a+3=2b+3$.",
          "Subtract $3$.",
          "Divide by $2$.",
        ],
        rubric: singleRubric("a", 2, "Shows $f(a)=f(b)\\Rightarrow a=b$."),
        commonErrors: ["Only saying the graph is a line without proof."],
        workedSolution: [{ part: "a", explanation: "Let $f(a)=f(b)$. Then $2a+3=2b+3$, so $2a=2b$ and $a=b$. Hence $f$ is one-one." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the range of }f:[1,\\infty)\\to\\mathbb R,\\ f(x)=x^2-2x+2.",
        difficulty: 2,
        skillTags: ["range", "domain_codomain"],
        parts: singlePart("a", "Find the range.", 2),
        hints: [
          "Complete the square.",
          "$x^2-2x+2=(x-1)^2+1$.",
          "Since $x\\ge1$, the minimum value is $1$.",
        ],
        rubric: singleRubric("a", 2, "Finds range $[1,\\infty)$."),
        commonErrors: ["Using the range on all real numbers without noticing the domain."],
        workedSolution: [{ part: "a", explanation: "$f(x)=(x-1)^2+1$. For $x\\ge1$, $(x-1)^2\\ge0$, so the range is $[1,\\infty)$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Determine whether }f:\\mathbb R\\to\\mathbb R\\text{ defined by }f(x)=x^3+1\\text{ is one-one and onto.}",
        difficulty: 3,
        skillTags: ["one_one", "onto"],
        parts: singlePart("a", "Justify both one-one and onto.", 3),
        hints: [
          "$x^3$ is strictly increasing.",
          "For onto, solve $y=x^3+1$.",
          "$x=\\sqrt[3]{y-1}$ is real for every real $y$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "States or proves one-one." },
            { part: "a", points: 1, description: "Solves $y=x^3+1$ for $x$." },
            { part: "a", points: 1, description: "Concludes onto and hence bijective." },
          ],
        },
        commonErrors: ["Assuming every polynomial is onto.", "Confusing cube root with square root restrictions."],
        workedSolution: [{ part: "a", explanation: "$x^3+1$ is strictly increasing, so it is one-one. For any $y\\in\\mathbb R$, choose $x=\\sqrt[3]{y-1}$. Then $f(x)=y$, so $f$ is onto. Hence $f$ is one-one and onto." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Let }f:[-2,\\infty)\\to[0,\\infty)\\text{ be defined by }f(x)=(x+2)^2.",
        difficulty: 4,
        skillTags: ["one_one", "onto", "bijective_function"],
        parts: [
          { letter: "a", promptMarkdown: "Show that $f$ is one-one.", points: 2 },
          { letter: "b", promptMarkdown: "Show that $f$ is onto.", points: 2 },
          { letter: "c", promptMarkdown: "Hence state whether $f$ is bijective.", points: 1 },
        ],
        hints: [
          "On the domain, $x+2\\ge0$.",
          "For onto, choose $x=\\sqrt y-2$ for $y\\ge0$.",
          "A function that is both one-one and onto is bijective.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Correctly proves one-one using the restricted domain." },
            { part: "b", points: 2, description: "Correctly proves onto by finding a preimage for arbitrary $y\\ge0$." },
            { part: "c", points: 1, description: "Concludes that $f$ is bijective." },
          ],
        },
        commonErrors: ["Taking both square-root branches while proving one-one.", "Ignoring the codomain $[0,\\infty)$.", "Proving only one-one and forgetting onto before saying bijective."],
        workedSolution: [
          { part: "a", explanation: "If $f(a)=f(b)$, then $(a+2)^2=(b+2)^2$. Since $a,b\\ge-2$, $a+2,b+2\\ge0$, so $a+2=b+2$ and $a=b$. Hence $f$ is one-one." },
          { part: "b", explanation: "Let $y\\in[0,\\infty)$. Choose $x=\\sqrt y-2$. Then $x\\ge-2$ and $f(x)=y$, so $f$ is onto." },
          { part: "c", explanation: "Since $f$ is both one-one and onto, $f$ is bijective." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Let }A=\\{1,2,3,4\\},\\ B=\\{3,5,7,9\\},\\text{ and }f:A\\to B\\text{ be defined by }f(x)=2x+1.",
        difficulty: 4,
        skillTags: ["one_one", "onto", "finite_function", "case_based"],
        figure: linearFiniteFunctionFigure,
        parts: [
          { letter: "a", promptMarkdown: "Write the range of $f$.", points: 1 },
          { letter: "b", promptMarkdown: "Check whether $f$ is one-one.", points: 1 },
          { letter: "c", promptMarkdown: "Check whether $f$ is onto. Hence decide whether $f$ is bijective.", points: 2 },
        ],
        hints: [
          "Find $f(1),f(2),f(3),f(4)$.",
          "One-one means no two distinct elements of $A$ have the same image.",
          "Onto means every element of $B$ is an image of some element of $A$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds range $\\{3,5,7,9\\}$." },
            { part: "b", points: 1, description: "Correctly states that $f$ is one-one." },
            { part: "c", points: 1, description: "Correctly states that $f$ is onto." },
            { part: "c", points: 1, description: "Concludes that $f$ is bijective." },
          ],
        },
        commonErrors: [
          "Ignoring the codomain $B$ while checking onto.",
          "Thinking a finite function is automatically one-one.",
          "Forgetting to compute all four images.",
        ],
        workedSolution: [
          { part: "a", explanation: "$f(1)=3$, $f(2)=5$, $f(3)=7$, and $f(4)=9$, so the range is $\\{3,5,7,9\\}$." },
          { part: "b", explanation: "All four images are distinct, so $f$ is one-one." },
          { part: "c", explanation: "The range equals the codomain $B$, so $f$ is onto. Since $f$ is both one-one and onto, it is bijective." },
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Domain, Range, and Bijective Functions",
    subtopic:
      "CBSE-style practice with domain, codomain, range, one-one, onto, and bijective functions.",
    mc: [
      {
        questionLatex:
          "\\text{For }f:\\mathbb R\\to\\mathbb R\\text{ defined by }f(x)=3x-4,\\text{ the function is}",
        difficulty: 2,
        skillTags: ["one_one", "onto", "bijective_function"],
        choices: [
          "$\\text{one-one and onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
          "$\\text{neither one-one nor onto}$",
        ],
        correctLetter: "A",
        hints: [
          "A nonzero-slope linear function is one-one.",
          "For any real output $y$, solve $y=3x-4$.",
          "$x=(y+4)/3$ is real for every real $y$.",
        ],
        solution: [{ step: 1, explanation: "Every real output is reached exactly once.", math: "y=3x-4\\Rightarrow x=\\frac{y+4}{3}" }],
      },
      {
        questionLatex:
          "\\text{For }f:\\mathbb R\\to\\mathbb R\\text{ defined by }f(x)=x^2-1,\\text{ the function is}",
        difficulty: 2,
        skillTags: ["one_one", "onto", "range"],
        choices: [
          "$\\text{neither one-one nor onto}$",
          "$\\text{one-one and onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
        ],
        correctLetter: "A",
        hints: [
          "$f(1)=f(-1)$.",
          "The minimum value of $x^2-1$ is $-1$.",
          "No number less than $-1$ is in the range.",
        ],
        solution: [{ step: 1, explanation: "The function repeats values and misses some real outputs.", math: "f(1)=f(-1)=0,\\quad f(x)\\ge-1" }],
      },
      {
        questionLatex:
          "\\text{For }f:[0,\\infty)\\to[-1,\\infty)\\text{ defined by }f(x)=x^2-1,\\text{ the function is}",
        difficulty: 3,
        skillTags: ["one_one", "onto", "domain_codomain"],
        choices: [
          "$\\text{one-one and onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
          "$\\text{neither one-one nor onto}$",
        ],
        correctLetter: "A",
        hints: [
          "On $[0,\\infty)$, $x^2$ does not repeat values.",
          "For every $y\\ge-1$, $x=\\sqrt{y+1}$ is allowed.",
          "The codomain is exactly $[-1,\\infty)$.",
        ],
        solution: [{ step: 1, explanation: "The restricted domain and codomain make the function bijective.", math: "y\\ge-1\\Rightarrow f(\\sqrt{y+1})=y" }],
      },
      {
        questionLatex:
          "\\text{Let }f:\\{1,2,3,4\\}\\to\\{a,b,c,d\\}\\text{ be }f(1)=a,f(2)=c,f(3)=c,f(4)=d.\\text{ Then }f\\text{ is}",
        difficulty: 3,
        skillTags: ["finite_function", "one_one", "onto"],
        figure: repeatedImageFunctionFigure,
        choices: [
          "$\\text{neither one-one nor onto}$",
          "$\\text{one-one but not onto}$",
          "$\\text{onto but not one-one}$",
          "$\\text{one-one and onto}$",
        ],
        correctLetter: "A",
        hints: [
          "Two different inputs have image $c$.",
          "The codomain element $b$ is not used.",
          "So both tests fail.",
        ],
        solution: [{ step: 1, explanation: "The function is not one-one and not onto.", math: "f(2)=f(3)=c,\\quad b\\notin f(A)" }],
      },
      {
        questionLatex:
          "\\text{Assertion (A): If }f:A\\to B\\text{ is one-one and }|A|=|B|=6,\\text{ then }f\\text{ is onto. Reason (R): A one-one function from a finite set of 6 elements has 6 distinct images.}",
        difficulty: 4,
        skillTags: ["finite_function", "one_one", "onto", "assertion_reason"],
        choices: [
          "$\\text{Both A and R are true, and R explains A.}$",
          "$\\text{Both A and R are true, but R does not explain A.}$",
          "$\\text{A is true, but R is false.}$",
          "$\\text{A is false, but R is true.}$",
        ],
        correctLetter: "A",
        hints: [
          "A one-one function uses distinct images.",
          "There are exactly 6 elements in the codomain.",
          "Six distinct images must cover all of $B$.",
        ],
        solution: [{ step: 1, explanation: "The assertion and reason are both true, and the reason proves onto.", math: "|f(A)|=6=|B|" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Let }f:\\{1,2,3\\}\\to\\{3,4,5,6\\}\\text{ be }f(x)=x+2.",
        difficulty: 2,
        skillTags: ["range", "finite_function"],
        parts: singlePart("a", "Find the range of $f$.", 2),
        hints: [
          "Find $f(1),f(2),f(3)$.",
          "The range is the set of actual images.",
          "Do not include unused codomain elements.",
        ],
        rubric: singleRubric("a", 2, "Finds range $\\{3,4,5\\}$."),
        commonErrors: ["Writing the whole codomain instead of the actual range."],
        workedSolution: [{ part: "a", explanation: "$f(1)=3$, $f(2)=4$, and $f(3)=5$. Hence the range is $\\{3,4,5\\}$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Is }f:\\mathbb R\\to\\mathbb R\\text{ defined by }f(x)=|x|\\text{ one-one?}",
        difficulty: 2,
        skillTags: ["one_one"],
        parts: singlePart("a", "Answer with a reason.", 2),
        hints: [
          "Try two different inputs with the same absolute value.",
          "$f(1)=1$ and $f(-1)=1$.",
          "Different inputs giving the same output means not one-one.",
        ],
        rubric: singleRubric("a", 2, "States that $f$ is not one-one and gives a valid counterexample."),
        commonErrors: ["Saying yes because each input has one output; that only checks that it is a function."],
        workedSolution: [{ part: "a", explanation: "No. Since $f(1)=1$ and $f(-1)=1$ but $1\\ne-1$, the function is not one-one." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Let }\\mathbb N=\\{1,2,3,\\ldots\\}\\text{ and }f:\\mathbb N\\to\\mathbb N\\text{ be defined by }f(n)=n+1.",
        difficulty: 3,
        skillTags: ["one_one", "onto"],
        parts: singlePart("a", "Check whether $f$ is one-one and onto.", 3),
        hints: [
          "If $f(a)=f(b)$, compare $a+1$ and $b+1$.",
          "Check whether $1\\in\\mathbb N$ is an output.",
          "No natural number maps to $1$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Correctly proves or states one-one." },
            { part: "a", points: 1, description: "Correctly identifies that $1$ is not an image." },
            { part: "a", points: 1, description: "Concludes one-one but not onto." },
          ],
        },
        commonErrors: ["Saying onto because the values keep increasing.", "Forgetting that $1$ belongs to the codomain."],
        workedSolution: [{ part: "a", explanation: "If $f(a)=f(b)$, then $a+1=b+1$, so $a=b$; hence $f$ is one-one. But no $n\\in\\mathbb N$ satisfies $n+1=1$, so $1$ is not in the range. Therefore $f$ is not onto." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Let }f:[1,\\infty)\\to[0,\\infty)\\text{ be defined by }f(x)=(x-1)^2.",
        difficulty: 4,
        skillTags: ["one_one", "onto", "bijective_function"],
        parts: [
          { letter: "a", promptMarkdown: "Show that $f$ is one-one.", points: 2 },
          { letter: "b", promptMarkdown: "Show that $f$ is onto.", points: 2 },
          { letter: "c", promptMarkdown: "Hence state whether $f$ is bijective.", points: 1 },
        ],
        hints: [
          "On the domain, $x-1\\ge0$.",
          "For a given $y\\ge0$, choose $x=1+\\sqrt y$.",
          "One-one and onto together mean bijective.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Correctly proves one-one using $x\\ge1$." },
            { part: "b", points: 2, description: "Correctly proves onto by finding a preimage for arbitrary $y\\ge0$." },
            { part: "c", points: 1, description: "Concludes that $f$ is bijective." },
          ],
        },
        commonErrors: ["Using both square-root branches despite the restricted domain.", "Forgetting to prove onto before saying bijective."],
        workedSolution: [
          { part: "a", explanation: "If $f(a)=f(b)$, then $(a-1)^2=(b-1)^2$. Since $a,b\\ge1$, $a-1,b-1\\ge0$, so $a-1=b-1$ and $a=b$. Hence $f$ is one-one." },
          { part: "b", explanation: "Let $y\\in[0,\\infty)$. Choose $x=1+\\sqrt y$. Then $x\\ge1$ and $f(x)=(\\sqrt y)^2=y$, so $f$ is onto." },
          { part: "c", explanation: "Since $f$ is both one-one and onto, $f$ is bijective." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A school club assigns badge numbers to five members using }f:A\\to B,\\text{ where }A=\\{1,2,3,4,5\\},\\ B=\\{10,20,30,40,50,60\\},\\text{ and }f(x)=10x.",
        difficulty: 4,
        skillTags: ["range", "one_one", "onto", "case_based"],
        figure: badgeFunctionFigure,
        parts: [
          { letter: "a", promptMarkdown: "Find the range of $f$.", points: 1 },
          { letter: "b", promptMarkdown: "Check whether $f$ is one-one.", points: 1 },
          { letter: "c", promptMarkdown: "Check whether $f$ is onto. Hence state whether $f$ is bijective.", points: 2 },
        ],
        hints: [
          "Find the five actual badge numbers assigned.",
          "Check whether two different members get the same badge number.",
          "Compare the range with the codomain $B$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds range $\\{10,20,30,40,50\\}$." },
            { part: "b", points: 1, description: "Correctly states that $f$ is one-one." },
            { part: "c", points: 1, description: "Correctly states that $f$ is not onto because $60$ is missed." },
            { part: "c", points: 1, description: "Concludes that $f$ is not bijective." },
          ],
        },
        commonErrors: [
          "Calling the function onto because every member receives a badge.",
          "Writing the codomain as the range.",
          "Saying bijective after proving only one-one.",
        ],
        workedSolution: [
          { part: "a", explanation: "The images are $10,20,30,40,50$, so the range is $\\{10,20,30,40,50\\}$." },
          { part: "b", explanation: "Different elements of $A$ give different badge numbers, so $f$ is one-one." },
          { part: "c", explanation: "Since $60\\in B$ is not an image of any element of $A$, $f$ is not onto. Therefore $f$ is not bijective." },
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Inverse Trigonometric Functions",
    subtopic:
      "Principal values, domains, ranges, and graph reading for inverse trigonometric functions.",
    mc: [
      {
        questionLatex:
          "\\text{The principal value of }\\sin^{-1}\\left(-\\frac12\\right)\\text{ is}",
        difficulty: 2,
        skillTags: ["inverse_trig_principal_value"],
        choices: ["$-\\frac\\pi6$", "$\\frac{7\\pi}{6}$", "$\\frac{11\\pi}{6}$", "$\\frac\\pi6$"],
        correctLetter: "A",
        hints: [
          "The range of $\\sin^{-1}x$ is $[-\\pi/2,\\pi/2]$.",
          "The sine value is negative.",
          "Choose $-\\pi/6$.",
        ],
        solution: [{ step: 1, explanation: "Use the principal branch.", math: "\\sin^{-1}\\left(-\\frac12\\right)=-\\frac\\pi6" }],
      },
      {
        questionLatex:
          "\\text{The principal value of }\\cos^{-1}\\left(-\\frac{\\sqrt3}{2}\\right)\\text{ is}",
        difficulty: 2,
        skillTags: ["inverse_trig_principal_value"],
        choices: ["$\\frac{5\\pi}{6}$", "$-\\frac{5\\pi}{6}$", "$\\frac\\pi6$", "$\\frac{7\\pi}{6}$"],
        correctLetter: "A",
        hints: [
          "The range of $\\cos^{-1}x$ is $[0,\\pi]$.",
          "Cosine is negative in quadrant II.",
          "$\\cos(5\\pi/6)=-\\sqrt3/2$.",
        ],
        solution: [{ step: 1, explanation: "Choose the quadrant-II principal angle.", math: "\\cos^{-1}\\left(-\\frac{\\sqrt3}{2}\\right)=\\frac{5\\pi}{6}" }],
      },
      {
        questionLatex:
          "\\text{The domain of }f(x)=\\sin^{-1}(3x-1)\\text{ is}",
        difficulty: 3,
        skillTags: ["inverse_trig_principal_value", "domain"],
        choices: ["$\\left[0,\\frac23\\right]$", "$[-1,1]$", "$\\left[-\\frac13,1\\right]$", "$\\mathbb R$"],
        correctLetter: "A",
        hints: [
          "The input of $\\sin^{-1}$ must be between $-1$ and $1$.",
          "Solve $-1\\le3x-1\\le1$.",
          "This gives $0\\le x\\le2/3$.",
        ],
        solution: [{ step: 1, explanation: "Solve the domain inequality.", math: "-1\\le3x-1\\le1\\Rightarrow0\\le x\\le\\frac23" }],
      },
      {
        questionLatex:
          "\\text{Using the graph of }y=\\sin^{-1}x,\\text{ its range is}",
        difficulty: 3,
        skillTags: ["inverse_trig_graph", "range"],
        figure: arcsinFigure,
        choices: ["$\\left[-\\frac\\pi2,\\frac\\pi2\\right]$", "$[0,\\pi]$", "$[-1,1]$", "$\\mathbb R$"],
        correctLetter: "A",
        hints: [
          "Range means the possible $y$-values.",
          "Read the lowest and highest marked $y$-values.",
          "The graph runs from $-\\pi/2$ to $\\pi/2$.",
        ],
        solution: [{ step: 1, explanation: "Read the vertical interval.", math: "\\operatorname{Range}(\\sin^{-1}x)=\\left[-\\frac\\pi2,\\frac\\pi2\\right]" }],
      },
      {
        questionLatex:
          "\\text{The graph shown represents }y=\\cos^{-1}x.\\text{ Which point is on the graph?}",
        difficulty: 4,
        skillTags: ["inverse_trig_graph"],
        figure: arccosFigure,
        choices: ["$(-1,\\pi)$", "$(1,\\pi)$", "$(-1,0)$", "$(0,0)$"],
        correctLetter: "A",
        hints: [
          "A point $(x,y)$ means $y=\\cos^{-1}x$.",
          "$\\cos^{-1}(-1)=\\pi$.",
          "So $(-1,\\pi)$ lies on the graph.",
        ],
        solution: [{ step: 1, explanation: "Use the endpoint value of inverse cosine.", math: "\\cos^{-1}(-1)=\\pi" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\tan^{-1}(1).",
        difficulty: 2,
        skillTags: ["inverse_trig_principal_value"],
        parts: singlePart("a", "Write the principal value.", 2),
        hints: [
          "The range of $\\tan^{-1}x$ is $(-\\pi/2,\\pi/2)$.",
          "Find the angle whose tangent is $1$.",
          "Use $\\pi/4$.",
        ],
        rubric: singleRubric("a", 2, "Finds $\\tan^{-1}(1)=\\pi/4$."),
        commonErrors: ["Writing $5\\pi/4$, which is not a principal value."],
        workedSolution: [{ part: "a", explanation: "Since $\\tan(\\pi/4)=1$ and $\\pi/4\\in(-\\pi/2,\\pi/2)$, $\\tan^{-1}(1)=\\pi/4$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Find the range of }\\cos^{-1}x.",
        difficulty: 2,
        skillTags: ["range", "inverse_trig_principal_value"],
        parts: singlePart("a", "Write the range.", 2),
        hints: [
          "This is the principal branch of inverse cosine.",
          "It starts at $0$ and ends at $\\pi$.",
          "Use a closed interval.",
        ],
        rubric: singleRubric("a", 2, "Writes range $[0,\\pi]$."),
        commonErrors: ["Writing the range of inverse sine instead."],
        workedSolution: [{ part: "a", explanation: "The range of $\\cos^{-1}x$ is $[0,\\pi]$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Evaluate }\\sin^{-1}\\left(\\frac12\\right)+\\cos^{-1}\\left(-\\frac12\\right).",
        difficulty: 3,
        skillTags: ["inverse_trig_principal_value"],
        parts: singlePart("a", "Find the exact value.", 3),
        hints: [
          "Evaluate each inverse-trig value separately.",
          "$\\sin^{-1}(1/2)=\\pi/6$.",
          "$\\cos^{-1}(-1/2)=2\\pi/3$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $\\sin^{-1}(1/2)=\\pi/6$." },
            { part: "a", points: 1, description: "Finds $\\cos^{-1}(-1/2)=2\\pi/3$." },
            { part: "a", points: 1, description: "Adds to get $5\\pi/6$." },
          ],
        },
        commonErrors: ["Using $4\\pi/3$ for inverse cosine.", "Forgetting principal ranges."],
        workedSolution: [{ part: "a", explanation: "$\\sin^{-1}(1/2)=\\pi/6$ and $\\cos^{-1}(-1/2)=2\\pi/3$. Therefore the sum is $\\pi/6+2\\pi/3=5\\pi/6$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Let }\\theta=\\sin^{-1}\\left(\\frac35\\right).",
        difficulty: 4,
        skillTags: ["inverse_trig_principal_value", "right_triangle"],
        parts: [
          { letter: "a", promptMarkdown: "State the principal interval containing $\\theta$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\cos\\theta$ and $\\tan\\theta$.", points: 2 },
          { letter: "c", promptMarkdown: "Find $\\cos^{-1}(-1/2)$.", points: 2 },
        ],
        hints: [
          "$\\theta$ is an inverse-sine principal value.",
          "Use a $3-4-5$ triangle.",
          "For inverse cosine, choose an angle in $[0,\\pi]$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "States $\\theta\\in[-\\pi/2,\\pi/2]$." },
            { part: "b", points: 1, description: "Finds $\\cos\\theta=4/5$." },
            { part: "b", points: 1, description: "Finds $\\tan\\theta=3/4$." },
            { part: "c", points: 2, description: "Finds $\\cos^{-1}(-1/2)=2\\pi/3$ with principal range." },
          ],
        },
        commonErrors: ["Taking cosine negative for a first-quadrant inverse-sine value.", "Giving $4\\pi/3$ for inverse cosine."],
        workedSolution: [
          { part: "a", explanation: "Since $\\theta=\\sin^{-1}(3/5)$, $\\theta\\in[-\\pi/2,\\pi/2]$." },
          { part: "b", explanation: "The triangle has opposite $3$, hypotenuse $5$, and adjacent $4$. Hence $\\cos\\theta=4/5$ and $\\tan\\theta=3/4$." },
          { part: "c", explanation: "The angle in $[0,\\pi]$ whose cosine is $-1/2$ is $2\\pi/3$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{A camera is placed so that its angle of elevation }\\theta\\text{ satisfies }\\sin\\theta=\\frac{5}{13}.\\text{ The software records the principal value }\\theta=\\sin^{-1}\\left(\\frac{5}{13}\\right).",
        difficulty: 4,
        skillTags: ["inverse_trig_principal_value", "right_triangle", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "State the principal interval containing $\\theta$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $\\cos\\theta$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $\\tan\\theta$ and evaluate $\\cos^{-1}(12/13)$ in terms of $\\theta$.", points: 2 },
        ],
        hints: [
          "$\\theta$ is an inverse-sine principal value.",
          "Use a $5-12-13$ right triangle.",
          "Since $\\cos\\theta=12/13$ and $\\theta$ is principal, $\\cos^{-1}(12/13)=\\theta$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "States $\\theta\\in[-\\pi/2,\\pi/2]$." },
            { part: "b", points: 1, description: "Finds $\\cos\\theta=12/13$." },
            { part: "c", points: 1, description: "Finds $\\tan\\theta=5/12$." },
            { part: "c", points: 1, description: "Correctly states $\\cos^{-1}(12/13)=\\theta$." },
          ],
        },
        commonErrors: [
          "Using a non-principal angle for inverse sine.",
          "Taking the adjacent side as $13-5=8$ instead of using Pythagoras.",
          "Forgetting that $\\theta$ is already in the principal range for inverse cosine after finding $\\cos\\theta=12/13$.",
        ],
        workedSolution: [
          { part: "a", explanation: "Since $\\theta=\\sin^{-1}(5/13)$, $\\theta\\in[-\\pi/2,\\pi/2]$. Here $\\theta$ is positive, so it is in the first quadrant." },
          { part: "b", explanation: "With opposite $5$ and hypotenuse $13$, the adjacent side is $12$. Thus $\\cos\\theta=12/13$." },
          { part: "c", explanation: "$\\tan\\theta=5/12$. Since $\\cos\\theta=12/13$ and $\\theta$ is in the principal range for inverse cosine, $\\cos^{-1}(12/13)=\\theta$." },
        ],
      },
    ],
  },
  {
    topicCode: "1.6",
    title: "Inverse Trigonometric Identities and Equations",
    subtopic:
      "Direct CBSE-style simplification and equation solving using inverse trigonometric identities.",
    mc: [
      {
        questionLatex:
          "\\text{For }-1\\le x\\le1,\\ \\sin^{-1}x+\\cos^{-1}x=",
        difficulty: 2,
        skillTags: ["inverse_trig_identity"],
        choices: ["$\\frac\\pi2$", "$\\pi$", "$0$", "$x$"],
        correctLetter: "A",
        hints: [
          "This is a standard complementary identity.",
          "Inverse sine and inverse cosine add to a right angle.",
          "The value is $\\pi/2$.",
        ],
        solution: [{ step: 1, explanation: "Use the standard identity.", math: "\\sin^{-1}x+\\cos^{-1}x=\\frac\\pi2" }],
      },
      {
        questionLatex:
          "\\text{For }x>0,\\ \\tan^{-1}x+\\tan^{-1}\\left(\\frac1x\\right)=",
        difficulty: 2,
        skillTags: ["inverse_trig_identity"],
        choices: ["$\\frac\\pi2$", "$0$", "$\\pi$", "$\\tan^{-1}(x+1/x)$"],
        correctLetter: "A",
        hints: [
          "The two positive angles are complementary.",
          "Their tangent values are reciprocal.",
          "The sum is $\\pi/2$.",
        ],
        solution: [{ step: 1, explanation: "Use the reciprocal tangent identity.", math: "x>0\\Rightarrow \\tan^{-1}x+\\tan^{-1}\\left(\\frac1x\\right)=\\frac\\pi2" }],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\sin^{-1}\\left(\\sin\\frac{5\\pi}{6}\\right).",
        difficulty: 3,
        skillTags: ["inverse_trig_principal_value"],
        choices: ["$\\frac\\pi6$", "$\\frac{5\\pi}{6}$", "$-\\frac\\pi6$", "$\\frac{7\\pi}{6}$"],
        correctLetter: "A",
        hints: [
          "$\\sin(5\\pi/6)=1/2$.",
          "$\\sin^{-1}$ returns values in $[-\\pi/2,\\pi/2]$.",
          "$\\sin^{-1}(1/2)=\\pi/6$.",
        ],
        solution: [{ step: 1, explanation: "First evaluate sine, then use the principal inverse value.", math: "\\sin^{-1}\\left(\\sin\\frac{5\\pi}{6}\\right)=\\sin^{-1}\\left(\\frac12\\right)=\\frac\\pi6" }],
      },
      {
        questionLatex:
          "\\text{Solve }\\sin^{-1}x=\\frac\\pi6.",
        difficulty: 3,
        skillTags: ["inverse_trig_equation"],
        choices: ["$\\frac12$", "$\\frac{\\sqrt3}{2}$", "$-\\frac12$", "$\\frac{5\\pi}{6}$"],
        correctLetter: "A",
        hints: [
          "Apply sine to both sides.",
          "$x=\\sin(\\pi/6)$.",
          "$x=1/2$.",
        ],
        solution: [{ step: 1, explanation: "Convert the inverse equation to a trig value.", math: "x=\\sin\\frac\\pi6=\\frac12" }],
      },
      {
        questionLatex:
          "\\text{Evaluate }\\tan\\left(\\sin^{-1}\\frac35\\right).",
        difficulty: 4,
        skillTags: ["inverse_trig_identity", "right_triangle"],
        choices: ["$\\frac34$", "$\\frac35$", "$\\frac45$", "$\\frac43$"],
        correctLetter: "A",
        hints: [
          "Let $\\theta=\\sin^{-1}(3/5)$.",
          "Then $\\sin\\theta=3/5$.",
          "Use the $3-4-5$ triangle.",
        ],
        solution: [{ step: 1, explanation: "Using a right triangle, opposite $3$, adjacent $4$.", math: "\\tan\\theta=\\frac34" }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Evaluate }\\cos^{-1}\\left(\\cos\\frac{7\\pi}{6}\\right).",
        difficulty: 2,
        skillTags: ["inverse_trig_principal_value"],
        parts: singlePart("a", "Find the principal value.", 2),
        hints: [
          "$\\cos(7\\pi/6)=-\\sqrt3/2$.",
          "The range of $\\cos^{-1}$ is $[0,\\pi]$.",
          "Choose $5\\pi/6$.",
        ],
        rubric: singleRubric("a", 2, "Finds $5\\pi/6$."),
        commonErrors: ["Writing $7\\pi/6$, which is outside the range of $\\cos^{-1}$."],
        workedSolution: [{ part: "a", explanation: "$\\cos(7\\pi/6)=-\\sqrt3/2$. Hence $\\cos^{-1}(\\cos(7\\pi/6))=\\cos^{-1}(-\\sqrt3/2)=5\\pi/6$." }],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "\\text{Solve }\\tan^{-1}x=\\frac\\pi4.",
        difficulty: 2,
        skillTags: ["inverse_trig_equation"],
        parts: singlePart("a", "Find $x$.", 2),
        hints: [
          "Apply tangent to both sides.",
          "$x=\\tan(\\pi/4)$.",
          "$x=1$.",
        ],
        rubric: singleRubric("a", 2, "Finds $x=1$."),
        commonErrors: ["Writing the angle instead of the value of $x$."],
        workedSolution: [{ part: "a", explanation: "$\\tan^{-1}x=\\pi/4\\Rightarrow x=\\tan(\\pi/4)=1$." }],
      },
      {
        responseType: "saq",
        questionLatex:
          "\\text{Evaluate }\\sin\\left(\\cos^{-1}\\frac45\\right).",
        difficulty: 3,
        skillTags: ["inverse_trig_identity", "right_triangle"],
        parts: singlePart("a", "Find the exact value.", 3),
        hints: [
          "Let $\\theta=\\cos^{-1}(4/5)$.",
          "Then $\\cos\\theta=4/5$.",
          "Use a $3-4-5$ triangle.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Defines the principal angle." },
            { part: "a", points: 1, description: "Uses the correct triangle." },
            { part: "a", points: 1, description: "Finds $3/5$." },
          ],
        },
        commonErrors: ["Returning $4/5$ because it appears in the original expression."],
        workedSolution: [{ part: "a", explanation: "Let $\\theta=\\cos^{-1}(4/5)$. Then $\\cos\\theta=4/5$, so adjacent $=4$, hypotenuse $=5$, and opposite $=3$. Therefore $\\sin\\theta=3/5$." }],
      },
      {
        responseType: "laq",
        questionLatex:
          "\\text{Use inverse trigonometric identities to solve the following.}",
        difficulty: 4,
        skillTags: ["inverse_trig_identity", "inverse_trig_equation"],
        parts: [
          { letter: "a", promptMarkdown: "Prove that $\\sin^{-1}x+\\cos^{-1}x=\\pi/2$ for $-1\\le x\\le1$.", points: 3 },
          { letter: "b", promptMarkdown: "Hence solve $2\\sin^{-1}x=\\cos^{-1}x$.", points: 2 },
        ],
        hints: [
          "Let $\\alpha=\\sin^{-1}x$.",
          "Use $\\cos(\\pi/2-\\alpha)=\\sin\\alpha$.",
          "Then solve $2u=\\pi/2-u$ where $u=\\sin^{-1}x$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Defines $\\alpha=\\sin^{-1}x$." },
            { part: "a", points: 1, description: "Uses the principal range of $\\cos^{-1}$ correctly." },
            { part: "a", points: 1, description: "Derives the identity." },
            { part: "b", points: 1, description: "Obtains $3\\sin^{-1}x=\\pi/2$." },
            { part: "b", points: 1, description: "Finds $x=1/2$." },
          ],
        },
        commonErrors: ["Using identities without checking principal ranges.", "Stopping at $\\sin^{-1}x=\\pi/6$ without finding $x$."],
        workedSolution: [
          { part: "a", explanation: "Let $\\alpha=\\sin^{-1}x$. Then $\\sin\\alpha=x$ and $\\alpha\\in[-\\pi/2,\\pi/2]$. Since $\\cos(\\pi/2-\\alpha)=x$ and $\\pi/2-\\alpha\\in[0,\\pi]$, we get $\\cos^{-1}x=\\pi/2-\\alpha$. Hence $\\sin^{-1}x+\\cos^{-1}x=\\pi/2$." },
          { part: "b", explanation: "Using part (a), $\\cos^{-1}x=\\pi/2-\\sin^{-1}x$. Hence $2\\sin^{-1}x=\\pi/2-\\sin^{-1}x$, so $3\\sin^{-1}x=\\pi/2$. Thus $\\sin^{-1}x=\\pi/6$ and $x=1/2$." },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "\\text{Let }u=\\sin^{-1}x\\text{ and }v=\\cos^{-1}x\\text{ for }-1\\le x\\le1.\\text{ Suppose }2u=v.",
        difficulty: 4,
        skillTags: ["inverse_trig_identity", "inverse_trig_equation", "case_based"],
        parts: [
          { letter: "a", promptMarkdown: "Write the relation between $u$ and $v$ using the identity for $\\sin^{-1}x+\\cos^{-1}x$.", points: 1 },
          { letter: "b", promptMarkdown: "Find $u$ when $2u=v$.", points: 1 },
          { letter: "c", promptMarkdown: "Find $x$ and evaluate $\\tan(\\sin^{-1}x)$.", points: 2 },
        ],
        hints: [
          "Use $u+v=\\pi/2$.",
          "Substitute $v=2u$.",
          "After finding $x$, use a right triangle for the tangent value.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Writes $u+v=\\pi/2$." },
            { part: "b", points: 1, description: "Finds $u=\\pi/6$." },
            { part: "c", points: 1, description: "Finds $x=1/2$." },
            { part: "c", points: 1, description: "Evaluates $\\tan(\\sin^{-1}x)=1/\\sqrt3$ or $\\sqrt3/3$." },
          ],
        },
        commonErrors: [
          "Using $u-v=\\pi/2$ instead of $u+v=\\pi/2$.",
          "Stopping at the angle $u=\\pi/6$ without finding $x$.",
          "Using tangent of $x$ instead of tangent of the angle $\\sin^{-1}x$.",
        ],
        workedSolution: [
          { part: "a", explanation: "Since $u=\\sin^{-1}x$ and $v=\\cos^{-1}x$, the identity gives $u+v=\\pi/2$." },
          { part: "b", explanation: "Given $2u=v$, substitute into $u+v=\\pi/2$: $u+2u=\\pi/2$, so $u=\\pi/6$." },
          { part: "c", explanation: "Since $u=\\sin^{-1}x=\\pi/6$, $x=\\sin(\\pi/6)=1/2$. Therefore $\\tan(\\sin^{-1}x)=\\tan(\\pi/6)=1/\\sqrt3=\\sqrt3/3$." },
        ],
      },
    ],
  },
];

export const relationsFunctionsTopics: Topic[] = topicSeeds.map(makeTopic);
