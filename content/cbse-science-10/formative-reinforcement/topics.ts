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

const COURSE = "cbse-science-10";
const UNIT = "formative-reinforcement";
const VERSION = "0.1.2";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface ChoiceSeed {
  text: string;
  correct?: boolean;
  rationale: string;
  misconceptionTag?: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [ChoiceSeed, ChoiceSeed, ChoiceSeed, ChoiceSeed];
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
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
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body,
  }));
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function parts(items: readonly [string, string, number][]): FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) =>
    part(letter, promptMarkdown, points),
  );
}

function criterion(
  partLetter: string,
  points: number,
  description: string,
): FrqRubric["criteria"][number] {
  return { part: partLetter, points, description };
}

function rubric(
  criteria: readonly FrqRubric["criteria"][number][],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((sum, item) => sum + item.points, 0),
    criteria: [...criteria],
  };
}

function autoRubric(frqParts: readonly FrqPart[]): FrqRubric {
  return rubric(
    frqParts.map((item) =>
      criterion(
        item.letter,
        item.points,
        `Scientifically correct response for part ${item.letter}, with the stated term, reason, or inference.`,
      ),
    ),
  );
}

function solutionPart(
  partLetter: string,
  explanation: string,
  math?: string,
): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function correct(text: string): ChoiceSeed {
  return { text, correct: true, rationale: "" };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [ChoiceSeed, ChoiceSeed, ChoiceSeed, ChoiceSeed],
  hintItems: readonly [string, string, string],
  solution: readonly SolutionStep[],
  figure?: ItemFigure,
  commonMisconceptions?: string[],
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    hints: hintItems,
    solution,
    ...(figure ? { figure } : {}),
    ...(commonMisconceptions ? { commonMisconceptions } : {}),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  frqParts: readonly FrqPart[],
  hintItems: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
  commonMisconceptions?: string[],
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts: frqParts,
    hints: hintItems,
    rubric: autoRubric(frqParts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
    ...(commonMisconceptions ? { commonMisconceptions } : {}),
  };
}

function calibrateFormativeDifficulty({
  difficulty,
  kind,
  responseType,
  questionLatex,
}: {
  difficulty: Difficulty;
  kind: "mc_single" | "frq";
  responseType?: ResponseType;
  questionLatex: string;
}): Difficulty {
  if (responseType === "vsaq") return Math.min(difficulty, 2) as Difficulty;
  if (difficulty <= 2) return difficulty;

  const text = questionLatex.toLowerCase();
  const recallOnly =
    /\b(name|state|identify|which device|which rule|which statement|is called)\b/.test(
      text,
    ) && !/\b(explain|justify|predict|compare|infer|case|data|diagram|why)\b/.test(
      text,
    );

  if (recallOnly && difficulty >= 4) return 3;
  if (kind === "mc_single" && recallOnly && difficulty === 3) return 2;
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ??
    "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the formative concept and the reason attached to it, not just a memorised keyword.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const correctCount = seed.choices.filter((choice) => choice.correct).length;
  if (correctCount !== 1) {
    throw new Error(`${meta.topicCode} MC ${index + 1} must have exactly one correct choice.`);
  }

  const choices = seed.choices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: Boolean(choice.correct),
    rationaleIfWrong: choice.correct
      ? null
      : (choice.rationale ?? fallbackWrongRationale(seed, choice)),
    misconceptionTag: choice.correct
      ? null
      : (choice.misconceptionTag ??
        "incorrect_cbse_class10_formative_reinforcement_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFormativeDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "treats_formative_reinforcement_as_plain_recall_without_reasoning",
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
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFormativeDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "gives_a_keyword_without_linking_it_to_the_observation_or_principle",
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

const periodicTrendFigure: ItemFigure = {
  type: "svg",
  title: "Partial modern periodic table",
  description:
    "A small labelled portion of the periodic table showing two groups and one period for trend-based reasoning.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" aria-label="Partial periodic table with selected elements">
  <rect width="720" height="360" fill="#f8fafc"/>
  <text x="360" y="42" text-anchor="middle" font-size="20" fill="#0f172a" font-family="Arial">Selected positions in the modern periodic table</text>
  <g stroke="#334155" stroke-width="2" font-family="Arial" text-anchor="middle">
    <rect x="110" y="85" width="76" height="56" fill="#dbeafe"/>
    <text x="148" y="118" font-size="18" fill="#1e3a8a">Li</text>
    <rect x="110" y="151" width="76" height="56" fill="#dbeafe"/>
    <text x="148" y="184" font-size="18" fill="#1e3a8a">Na</text>
    <rect x="110" y="217" width="76" height="56" fill="#dbeafe"/>
    <text x="148" y="250" font-size="18" fill="#1e3a8a">K</text>
    <rect x="518" y="85" width="76" height="56" fill="#fee2e2"/>
    <text x="556" y="118" font-size="18" fill="#991b1b">F</text>
    <rect x="518" y="151" width="76" height="56" fill="#fee2e2"/>
    <text x="556" y="184" font-size="18" fill="#991b1b">Cl</text>
    <rect x="518" y="217" width="76" height="56" fill="#fee2e2"/>
    <text x="556" y="250" font-size="18" fill="#991b1b">Br</text>
    <rect x="202" y="151" width="76" height="56" fill="#dcfce7"/>
    <text x="240" y="184" font-size="18" fill="#166534">Mg</text>
    <rect x="294" y="151" width="76" height="56" fill="#fef9c3"/>
    <text x="332" y="184" font-size="18" fill="#854d0e">Al</text>
    <rect x="386" y="151" width="76" height="56" fill="#ede9fe"/>
    <text x="424" y="184" font-size="18" fill="#5b21b6">Si</text>
  </g>
  <text x="62" y="118" font-size="14" fill="#475569" font-family="Arial">Period 2</text>
  <text x="62" y="184" font-size="14" fill="#475569" font-family="Arial">Period 3</text>
  <text x="62" y="250" font-size="14" fill="#475569" font-family="Arial">Period 4</text>
  <text x="148" y="306" text-anchor="middle" font-size="14" fill="#475569" font-family="Arial">Group 1</text>
  <text x="556" y="306" text-anchor="middle" font-size="14" fill="#475569" font-family="Arial">Group 17</text>
</svg>`,
};

const evolutionBranchFigure: ItemFigure = {
  type: "svg",
  title: "Branching pattern of descent",
  description:
    "A simple branching diagram showing populations splitting from a common ancestor over time.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" aria-label="Evolutionary branching diagram">
  <rect width="720" height="380" fill="#f8fafc"/>
  <text x="360" y="38" text-anchor="middle" font-size="20" fill="#0f172a" font-family="Arial">Branching from a common ancestor</text>
  <line x1="360" y1="310" x2="360" y2="235" stroke="#334155" stroke-width="4"/>
  <line x1="360" y1="235" x2="250" y2="160" stroke="#334155" stroke-width="4"/>
  <line x1="360" y1="235" x2="470" y2="160" stroke="#334155" stroke-width="4"/>
  <line x1="470" y1="160" x2="410" y2="92" stroke="#334155" stroke-width="4"/>
  <line x1="470" y1="160" x2="530" y2="92" stroke="#334155" stroke-width="4"/>
  <circle cx="360" cy="310" r="20" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="250" cy="160" r="20" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <circle cx="410" cy="92" r="20" fill="#fef9c3" stroke="#ca8a04" stroke-width="3"/>
  <circle cx="530" cy="92" r="20" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="360" y="316" text-anchor="middle" font-size="14" fill="#1e3a8a" font-family="Arial">A</text>
  <text x="250" y="166" text-anchor="middle" font-size="14" fill="#166534" font-family="Arial">B</text>
  <text x="410" y="98" text-anchor="middle" font-size="14" fill="#854d0e" font-family="Arial">C</text>
  <text x="530" y="98" text-anchor="middle" font-size="14" fill="#991b1b" font-family="Arial">D</text>
  <line x1="110" y1="320" x2="110" y2="80" stroke="#64748b" stroke-width="3" marker-end="url(#timeArrow)"/>
  <text x="78" y="74" font-size="16" fill="#475569" font-family="Arial">time</text>
  <text x="130" y="330" font-size="15" fill="#475569" font-family="Arial">older</text>
  <text x="130" y="88" font-size="15" fill="#475569" font-family="Arial">newer</text>
  <defs>
    <marker id="timeArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#64748b"/>
    </marker>
  </defs>
</svg>`,
};

const motorCoilFigure: ItemFigure = {
  type: "svg",
  title: "DC motor coil between magnetic poles",
  description:
    "A rectangular coil placed between N and S poles with a split-ring commutator and brushes.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 420" role="img" aria-label="DC motor coil with commutator">
  <rect width="760" height="420" fill="#f8fafc"/>
  <rect x="86" y="116" width="96" height="164" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="134" y="204" text-anchor="middle" font-size="34" fill="#1d4ed8" font-family="Arial">N</text>
  <rect x="578" y="116" width="96" height="164" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="626" y="204" text-anchor="middle" font-size="34" fill="#991b1b" font-family="Arial">S</text>
  <g stroke="#94a3b8" stroke-width="2">
    <line x1="190" y1="160" x2="562" y2="160"/>
    <line x1="190" y1="198" x2="562" y2="198"/>
    <line x1="190" y1="236" x2="562" y2="236"/>
  </g>
  <rect x="298" y="122" width="164" height="150" fill="none" stroke="#0f172a" stroke-width="5"/>
  <line x1="298" y1="122" x2="462" y2="272" stroke="#0f172a" stroke-width="2" opacity="0.25"/>
  <line x1="462" y1="122" x2="298" y2="272" stroke="#0f172a" stroke-width="2" opacity="0.25"/>
  <path d="M314 124 L314 166" stroke="#16a34a" stroke-width="5" marker-end="url(#motorArrowGreen)"/>
  <path d="M446 270 L446 228" stroke="#f97316" stroke-width="5" marker-end="url(#motorArrowOrange)"/>
  <text x="286" y="112" font-size="15" fill="#166534" font-family="Arial">current in arm AB</text>
  <text x="468" y="294" font-size="15" fill="#c2410c" font-family="Arial">current in arm CD</text>
  <path d="M342 303 A34 34 0 0 0 380 337" fill="none" stroke="#0f172a" stroke-width="5"/>
  <path d="M418 303 A34 34 0 0 1 380 337" fill="none" stroke="#0f172a" stroke-width="5"/>
  <rect x="288" y="338" width="74" height="20" fill="#64748b"/>
  <rect x="398" y="338" width="74" height="20" fill="#64748b"/>
  <text x="380" y="392" text-anchor="middle" font-size="15" fill="#334155" font-family="Arial">split-ring commutator and brushes</text>
  <defs>
    <marker id="motorArrowGreen" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/>
    </marker>
    <marker id="motorArrowOrange" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#f97316"/>
    </marker>
  </defs>
</svg>`,
};

const inductionCoilFigure: ItemFigure = {
  type: "svg",
  title: "Magnet and coil induction setup",
  description:
    "A bar magnet moving towards a coil connected to a centre-zero galvanometer.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 380" role="img" aria-label="Magnet moving into a coil connected to a galvanometer">
  <rect width="760" height="380" fill="#f8fafc"/>
  <rect x="92" y="160" width="108" height="54" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="200" y="160" width="108" height="54" rx="6" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="146" y="194" text-anchor="middle" font-size="22" fill="#1d4ed8" font-family="Arial">N</text>
  <text x="254" y="194" text-anchor="middle" font-size="22" fill="#991b1b" font-family="Arial">S</text>
  <path d="M320 188 L400 188" stroke="#334155" stroke-width="4" marker-end="url(#motionArrow)"/>
  <text x="360" y="158" text-anchor="middle" font-size="15" fill="#334155" font-family="Arial">motion</text>
  <g fill="none" stroke="#0f172a" stroke-width="4">
    <ellipse cx="472" cy="188" rx="18" ry="78"/>
    <ellipse cx="494" cy="188" rx="18" ry="78"/>
    <ellipse cx="516" cy="188" rx="18" ry="78"/>
    <ellipse cx="538" cy="188" rx="18" ry="78"/>
    <ellipse cx="560" cy="188" rx="18" ry="78"/>
  </g>
  <path d="M472 266 C472 322 596 322 596 252" fill="none" stroke="#334155" stroke-width="4"/>
  <path d="M560 110 C560 56 596 58 596 122" fill="none" stroke="#334155" stroke-width="4"/>
  <circle cx="596" cy="188" r="58" fill="#fff7ed" stroke="#f97316" stroke-width="3"/>
  <line x1="596" y1="188" x2="628" y2="168" stroke="#f97316" stroke-width="4"/>
  <text x="596" y="196" text-anchor="middle" font-size="15" fill="#9a3412" font-family="Arial">G</text>
  <defs>
    <marker id="motionArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155"/>
    </marker>
  </defs>
</svg>`,
};

const generatorFigure: ItemFigure = {
  type: "svg",
  title: "Simple AC generator",
  description:
    "A rotating coil between magnetic poles connected to two slip rings, brushes and an external load.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 430" role="img" aria-label="Simple AC generator with slip rings and brushes">
  <rect width="760" height="430" fill="#f8fafc"/>
  <rect x="82" y="118" width="96" height="164" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="130" y="207" text-anchor="middle" font-size="34" fill="#1d4ed8" font-family="Arial">N</text>
  <rect x="582" y="118" width="96" height="164" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="630" y="207" text-anchor="middle" font-size="34" fill="#991b1b" font-family="Arial">S</text>
  <rect x="286" y="122" width="188" height="148" fill="none" stroke="#0f172a" stroke-width="5"/>
  <path d="M256 196 A124 124 0 0 1 505 196" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="8 8"/>
  <path d="M505 196 L488 185 L490 208 z" fill="#64748b"/>
  <line x1="348" y1="270" x2="348" y2="324" stroke="#0f172a" stroke-width="4"/>
  <line x1="412" y1="270" x2="412" y2="324" stroke="#0f172a" stroke-width="4"/>
  <circle cx="348" cy="338" r="18" fill="none" stroke="#0f172a" stroke-width="5"/>
  <circle cx="412" cy="338" r="18" fill="none" stroke="#0f172a" stroke-width="5"/>
  <rect x="306" y="356" width="64" height="16" fill="#64748b"/>
  <rect x="390" y="356" width="64" height="16" fill="#64748b"/>
  <path d="M338 372 C338 406 422 406 422 372" fill="none" stroke="#334155" stroke-width="4"/>
  <rect x="350" y="392" width="60" height="20" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <text x="380" y="407" text-anchor="middle" font-size="13" fill="#92400e" font-family="Arial">load</text>
  <text x="286" y="342" text-anchor="end" font-size="14" fill="#334155" font-family="Arial">slip rings</text>
  <line x1="292" y1="338" x2="330" y2="338" stroke="#334155" stroke-width="2"/>
  <text x="478" y="368" font-size="14" fill="#334155" font-family="Arial">brushes</text>
  <line x1="470" y1="362" x2="454" y2="362" stroke="#334155" stroke-width="2"/>
  <text x="380" y="52" text-anchor="middle" font-size="18" fill="#0f172a" font-family="Arial">rotating coil</text>
  <text x="380" y="88" text-anchor="middle" font-size="15" fill="#475569" font-family="Arial">mechanical energy in, electrical energy out</text>
</svg>`,
};

const topicSeeds: TopicSeed[] = [
  {
    topicCode: "F.1",
    title: "Periodic Classification of Elements",
    subtopic:
      "Formative reinforcement: Dobereiner's triads, Newlands' octaves, Mendeleev's periodic table, modern periodic table, valency and broad trends.",
    mc: [
      mc(
        L`Elements $X$, $Y$ and $Z$ have atomic numbers $3$, $11$ and $19$. The best reason they show similar chemical properties is that they`,
        2,
        ["periodic_table", "valence_electrons"],
        [
          wrong(
            "have consecutive atomic masses",
            "The atomic numbers are not consecutive, and modern classification depends mainly on atomic number and electronic configuration.",
            "uses_atomic_mass_instead_of_valence_shell",
          ),
          wrong(
            "belong to the same period",
            "Lithium, sodium and potassium lie in different periods, not the same horizontal row.",
            "confuses_group_with_period",
          ),
          correct("have one electron in the outermost shell"),
          wrong(
            "all have completely filled outer shells",
            "A completely filled outer shell would suggest noble-gas behaviour, not alkali-metal behaviour.",
            "confuses_reactive_metals_with_noble_gases",
          ),
        ],
        [
          "Write the electronic configurations of atomic numbers 3, 11 and 19.",
          "Compare only the outermost shell.",
          "Elements in the same group usually have the same number of valence electrons.",
        ],
        [
          step(1, L`Their configurations are $2,1$; $2,8,1$; and $2,8,8,1$.`),
          step(2, L`Each has one valence electron, so they are placed in the same group and show similar reactions.`),
        ],
      ),
      mc(
        L`In Period 3, the element with electronic configuration $2,8,7$ is most likely to`,
        2,
        ["periodic_table", "group_17"],
        [
          correct("gain one electron and form a negative ion"),
          wrong(
            "lose seven electrons and form a positive ion",
            "Losing seven electrons is energetically unreasonable; a group 17 atom tends to gain one electron.",
            "misreads_valency_as_electrons_lost",
          ),
          wrong(
            "have valency zero because its first two shells are filled",
            "Valency is decided by the outermost shell, which has seven electrons here.",
            "ignores_outermost_shell",
          ),
          wrong(
            "behave like a group 1 metal",
            "Group 1 elements have one valence electron; this element has seven.",
            "confuses_one_needed_with_one_present",
          ),
        ],
        [
          "Count the electrons in the outermost shell.",
          "A stable octet would need one more electron.",
          "Elements with seven valence electrons usually form negative ions by gaining one electron.",
        ],
        [
          step(1, L`The outer shell contains $7$ electrons.`),
          step(2, L`It needs one more electron to complete an octet, so it tends to gain one electron.`),
        ],
      ),
      mc(
        L`Which statement correctly compares early attempts at classifying elements?`,
        3,
        ["early_classification", "mendeleev_table", "scientific_prediction"],
        [
          wrong(
            "Dobereiner arranged every known element by atomic number into complete periods.",
            "Dobereiner's triads grouped some sets of three similar elements; atomic number was not the basis of his classification.",
            "confuses_dobereiner_with_modern_table",
          ),
          wrong(
            "Newlands' law of octaves successfully explained all known and undiscovered elements without limitations.",
            "Newlands' pattern worked only for lighter elements and had clear limitations as more elements were known.",
            "overstates_newlands_law",
          ),
          wrong(
            "Mendeleev avoided gaps because his table was only a list of atomic masses.",
            "Mendeleev deliberately left some gaps and used them to predict properties of undiscovered elements.",
            "misses_mendeleev_prediction",
          ),
          correct("Dobereiner used triads, Newlands proposed octaves, and Mendeleev left predictive gaps for undiscovered elements."),
        ],
        [
          "Separate the three historical attempts before judging the options.",
          "Dobereiner's idea was triads; Newlands' idea was octaves.",
          "Mendeleev's table became powerful partly because it predicted missing elements.",
        ],
        [
          step(1, L`Dobereiner grouped some elements in triads and Newlands observed a repeating octave pattern among lighter elements.`),
          step(2, L`Mendeleev arranged elements by atomic mass and properties, leaving useful gaps for undiscovered elements.`),
        ],
      ),
      mc(
        L`Across a period from left to right, atomic size generally decreases. The most suitable explanation is that`,
        3,
        ["periodic_trends", "atomic_size"],
        [
          wrong(
            "the number of shells decreases by one at every step",
            "Across a period, electrons are added to the same shell; the number of shells does not decrease step by step.",
            "misstates_period_structure",
          ),
          correct("nuclear charge increases while electrons enter the same shell"),
          wrong(
            "all elements become noble gases before the period ends",
            "Only the last element of a period is a noble gas; the trend cannot be explained this way.",
            "overgeneralises_noble_gas_position",
          ),
          wrong(
            "atomic mass becomes smaller from left to right",
            "Atomic mass generally increases; size decreases for a different reason involving nuclear attraction.",
            "uses_mass_as_size_reason",
          ),
        ],
        [
          "In one period, electrons are added to the same principal shell.",
          "Protons increase one by one across the period.",
          "Greater nuclear charge pulls the same-shell electrons closer.",
        ],
        [
          step(1, L`Across a period, the shell number remains the same while nuclear charge increases.`),
          step(2, L`The increased attraction pulls the electron cloud closer, so atomic size decreases.`),
        ],
      ),
      mc(
        L`Using the partial table, which comparison is most reasonable?`,
        4,
        ["periodic_trends", "trend_inference"],
        [
          wrong(
            "Fluorine and potassium should have nearly identical chemical properties.",
            "They lie in very different groups, so their valence-shell structures and reactions are not similar.",
            "matches_by_opposite_corners",
          ),
          wrong(
            "Sodium should be less metallic than chlorine because it is farther left.",
            "Metallic character generally decreases left to right, so the left-side element is more metallic.",
            "reverses_metallic_trend",
          ),
          correct("Sodium and potassium should have similar chemical properties because they are in one group."),
          wrong(
            "Magnesium and chlorine should have the same valency because they are in one period.",
            "Same period does not mean same valency; group position is more useful for valence electrons.",
            "confuses_period_with_valency",
          ),
        ],
        [
          "Use vertical columns for chemical similarity.",
          "A period shows changing properties, not identical valency.",
          "Elements in one group have similar valence-shell structure.",
        ],
        [
          step(1, L`Na and K are in Group 1 in the displayed table.`),
          step(2, L`They have the same number of valence electrons, so similar chemical properties are expected.`),
        ],
        periodicTrendFigure,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the modern periodic law.`,
        1,
        ["modern_periodic_law"],
        parts([["a", "Write the law in one sentence.", 1]]),
        [
          "The modern table is not based primarily on atomic mass.",
          "Use atomic number in the statement.",
          "Properties recur periodically when elements are arranged by increasing atomic number.",
        ],
        [
          solutionPart(
            "a",
            L`The physical and chemical properties of elements are periodic functions of their atomic numbers.`,
          ),
        ],
        [L`Writing Mendeleev's older mass-based law instead of the modern atomic-number law.`],
      ),
      frq(
        "saq",
        L`An element has atomic number $17$. Predict its period, group and valency from its electronic configuration.`,
        2,
        ["electronic_configuration", "period_group_valency"],
        parts([
          ["a", "Write the electronic configuration.", 1],
          ["b", "State the period, group and valency.", 2],
        ]),
        [
          "Distribute 17 electrons shell-wise.",
          "The number of occupied shells gives the period.",
          "Seven valence electrons means group 17 and valency 1.",
        ],
        [
          solutionPart("a", L`The configuration is $2,8,7$.`),
          solutionPart(
            "b",
            L`There are three occupied shells, so the period is 3. With seven valence electrons, it is in group 17 and has valency 1.`,
          ),
        ],
        [L`Calling the valency 7 instead of recognising that one electron is needed to complete the octet.`],
      ),
      frq(
        "saq",
        L`A class chart lists Dobereiner's triads, Newlands' law of octaves and Mendeleev's periodic table. State one useful idea and one limitation from these early classifications.`,
        3,
        ["early_classification", "periodic_table_comparison"],
        parts([
          ["a", "State one useful idea from any one early classification.", 1],
          ["b", "State one limitation from Dobereiner's or Newlands' classification.", 1],
          ["c", "State how the modern table corrected the basis of arrangement.", 1],
        ]),
        [
          "Dobereiner's triads linked similar properties with an approximate average atomic mass pattern.",
          "Newlands' octaves worked mainly up to calcium and then broke down.",
          "The modern table uses atomic number as the basis.",
        ],
        [
          solutionPart(
            "a",
            L`One useful idea is that elements with similar properties can be grouped. In Dobereiner's triads, the atomic mass of the middle element was approximately the average of the other two in some groups; Newlands noticed repeating properties like musical octaves.`,
          ),
          solutionPart(
            "b",
            L`A limitation is that Dobereiner's triads worked only for a few groups, while Newlands' octaves worked mainly up to calcium and failed for many heavier elements.`,
          ),
          solutionPart(
            "c",
            L`The modern table arranges elements by increasing atomic number, which gives a more consistent classification.`,
          ),
        ],
        [L`Writing only names of scientists without linking each classification to its idea or limitation.`],
      ),
      frq(
        "case",
        L`A teacher gives a partial table containing Li, Na, K in one column and F, Cl, Br in another column.`,
        3,
        ["periodic_table_case", "trend_reasoning"],
        parts([
          ["a", "Which column contains alkali metals?", 1],
          ["b", "Which pair from one column is expected to have similar reactions with water?", 1],
          ["c", "Why do elements in one column show similar chemical behaviour?", 1],
          ["d", "Which of Na and Cl is more metallic? Give the trend reason.", 1],
        ]),
        [
          "Li, Na and K are Group 1 elements.",
          "Similarity follows valence electrons.",
          "Metallic character decreases across a period from left to right.",
        ],
        [
          solutionPart("a", L`The Li-Na-K column contains alkali metals.`),
          solutionPart("b", L`Li and Na, or Na and K, are expected to show similar reactions.`),
          solutionPart(
            "c",
            L`Elements in the same group have the same number of valence electrons, so their chemical behaviour is similar.`,
          ),
          solutionPart(
            "d",
            L`Na is more metallic than Cl because metallic character decreases from left to right across a period.`,
          ),
        ],
        [L`Using horizontal position alone to claim equal valency or equal chemical behaviour.`],
        periodicTrendFigure,
      ),
      frq(
        "laq",
        L`Explain how the periodic table helps predict properties of an unknown element $E$ with configuration $2,8,2$.`,
        4,
        ["periodic_prediction", "application"],
        parts([
          ["a", "Find the period and group of $E$.", 2],
          ["b", "Predict its valency and broad metallic/non-metallic character.", 2],
          ["c", "Name one known element likely to show similar behaviour.", 1],
        ]),
        [
          "Period comes from occupied shells.",
          "Group comes from the number of valence electrons for representative elements.",
          "Compare the configuration with magnesium.",
        ],
        [
          solutionPart(
            "a",
            L`The configuration has three occupied shells and two valence electrons, so $E$ is in Period 3 and Group 2.`,
          ),
          solutionPart(
            "b",
            L`Its valency is 2. As a left-side Group 2 element, it is expected to be metallic.`,
          ),
          solutionPart(
            "c",
            L`Magnesium has configuration $2,8,2$, so it is the known element and would be expected to show similar behaviour.`,
          ),
        ],
        [L`Using total electrons as valency, or calling every period-3 element chemically similar.`],
      ),
    ],
  },
  {
    topicCode: "F.2",
    title: "Evolution",
    subtopic:
      "Formative reinforcement: inherited variation, natural selection, fossils, homologous organs, evolution by stages, human evolution and speciation.",
    mc: [
      mc(
        L`A beetle loses weight during a food shortage. Its offspring are not automatically born lighter mainly because`,
        2,
        ["acquired_traits", "inheritance"],
        [
          wrong(
            "all changes in body size are always inherited",
            "Only changes that affect genetic material in reproductive cells can be inherited reliably.",
            "treats_acquired_trait_as_inherited",
          ),
          correct("the weight loss is an acquired change, not a change in inherited DNA"),
          wrong(
            "offspring never inherit any feature from parents",
            "Offspring do inherit genetic traits, but starvation-induced weight loss is not one of them.",
            "overrejects_inheritance",
          ),
          wrong(
            "natural selection stops whenever food is scarce",
            "Food shortage can cause selection pressure, but an individual's acquired weight loss is not directly inherited.",
            "confuses_selection_pressure_with_acquired_trait",
          ),
        ],
        [
          "Ask whether the change affects DNA passed to the next generation.",
          "A change due to environment during life is usually acquired.",
          "Inherited variation and acquired change are different ideas.",
        ],
        [
          step(1, L`Weight loss due to food shortage is an acquired trait of that beetle.`),
          step(2, L`Acquired traits are not automatically encoded in reproductive DNA, so they are not directly inherited.`),
        ],
      ),
      mc(
        L`The forelimbs of a human, a whale and a bat have the same basic bone plan but perform different functions. This is evidence for`,
        3,
        ["homologous_organs", "common_ancestry"],
        [
          wrong(
            "analogous organs only",
            "Analogous organs have similar function but different origin; here the shared bone plan points to common origin.",
            "confuses_homologous_and_analogous",
          ),
          wrong(
            "no evolutionary relationship",
            "A shared structural plan is exactly the kind of clue used to infer relationship.",
            "ignores_structural_similarity",
          ),
          wrong(
            "inheritance of acquired characters",
            "The example compares inherited anatomical plans, not acquired changes during life.",
            "misuses_acquired_character",
          ),
          correct("homologous organs suggesting common ancestry"),
        ],
        [
          "Look at origin and structure, not only use.",
          "Same plan with different function is homologous.",
          "Homology is used as evidence for common ancestry.",
        ],
        [
          step(1, L`The organs have the same basic structural plan but different functions.`),
          step(2, L`Such organs are homologous and suggest descent from a common ancestor.`),
        ],
      ),
      mc(
        L`A claim says, "Humans evolved from chimpanzees living today." Which correction is most accurate?`,
        2,
        ["human_evolution", "common_ancestry"],
        [
          correct("Humans and modern chimpanzees share a common ancestor; one did not directly evolve from the other."),
          wrong(
            "Humans evolved from chimpanzees only because chimpanzees are less intelligent.",
            "Evolution is not a rank ladder of intelligence, and modern chimpanzees are not direct ancestors of humans.",
            "uses_ladder_model_of_evolution",
          ),
          wrong(
            "Chimpanzees evolved from humans after humans became modern.",
            "The evidence supports shared ancestry, not chimpanzees directly descending from modern humans.",
            "reverses_descent_claim",
          ),
          wrong(
            "Humans have no evolutionary relationship with other primates.",
            "Comparative anatomy and DNA evidence support evolutionary relationships among primates.",
            "denies_common_ancestry",
          ),
        ],
        [
          "Avoid reading evolution as a straight line from one living species to another.",
          "Modern related species can share an older ancestor.",
          "Humans and modern chimpanzees are better described as related branches.",
        ],
        [
          step(1, L`Modern chimpanzees and humans are living branches, not ancestor and descendant in a direct line.`),
          step(2, L`The accurate inference is that they share a common ancestor in evolutionary history.`),
        ],
      ),
      mc(
        L`Two populations of the same species become separated by a mountain range for many generations. Which combination most strongly supports formation of two species?`,
        4,
        ["speciation", "selection"],
        [
          wrong(
            "Separation for one day and no genetic variation",
            "Speciation needs many generations and heritable variation; one day is not enough.",
            "understates_time_and_variation",
          ),
          wrong(
            "Identical environments with no mutations or recombination",
            "Without heritable differences, long-term divergence is unlikely.",
            "ignores_variation",
          ),
          correct("Isolation, heritable variation and different selection pressures"),
          wrong(
            "Only acquired changes such as stronger muscles after exercise",
            "Acquired changes alone do not create inherited reproductive separation.",
            "uses_acquired_traits_for_speciation",
          ),
        ],
        [
          "Speciation is a population-level change over generations.",
          "Isolation reduces interbreeding.",
          "Variation plus different selection can gradually build reproductive separation.",
        ],
        [
          step(1, L`Geographical isolation limits gene flow between populations.`),
          step(2, L`Heritable variation and different selection pressures can accumulate differences over generations.`),
        ],
      ),
      mc(
        L`In the branching diagram, which statement is the safest inference?`,
        3,
        ["evolution_tree", "common_ancestry"],
        [
          wrong(
            "C evolved from D after D became extinct.",
            "The diagram shows C and D as branches from a common point, not one directly changing into the other.",
            "reads_branch_as_direct_descent",
          ),
          correct("C and D share a more recent common branch with each other than either shares with B."),
          wrong(
            "A is the most advanced organism because it is at the bottom.",
            "The bottom position indicates older ancestry in this diagram, not superiority.",
            "confuses_old_with_advanced",
          ),
          wrong(
            "B, C and D cannot be related because they are separate endpoints.",
            "Separate endpoints can still share ancestors through earlier branches.",
            "misses_common_ancestor",
          ),
        ],
        [
          "Do not read one endpoint as necessarily becoming another endpoint.",
          "Look for the nearest branching point.",
          "C and D join each other before their line joins B.",
        ],
        [
          step(1, L`C and D meet at a branching point above the point where their line connects with B.`),
          step(2, L`So C and D share a more recent common ancestor with each other than with B.`),
        ],
        evolutionBranchFigure,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is a fossil?`,
        1,
        ["fossils"],
        parts([["a", "Define the term fossil.", 1]]),
        [
          "Think of preserved evidence, not only bones.",
          "It may be a body part, impression or trace.",
          "It comes from organisms that lived in the past.",
        ],
        [
          solutionPart(
            "a",
            L`A fossil is preserved remains, impressions or traces of organisms that lived in the past.`,
          ),
        ],
        [L`Restricting fossils only to complete skeletons.`],
      ),
      frq(
        "saq",
        L`Distinguish homologous and analogous organs using one example of each.`,
        3,
        ["homologous_analogous"],
        parts([
          ["a", "State the basis for homologous organs and give an example.", 2],
          ["b", "State the basis for analogous organs and give an example.", 2],
        ]),
        [
          "Homologous means common origin/basic plan.",
          "Analogous means similar function but different origin/basic plan.",
          "Use standard examples such as vertebrate forelimbs and wings of birds/insects.",
        ],
        [
          solutionPart(
            "a",
            L`Homologous organs have a similar origin or basic structural plan but may perform different functions, such as human arm and whale flipper.`,
          ),
          solutionPart(
            "b",
            L`Analogous organs perform similar functions but have different origins or structural plans, such as wings of birds and insects.`,
          ),
        ],
        [L`Using only function to identify both kinds of organs.`],
      ),
      frq(
        "saq",
        L`Why does a useful variation become more common in a population over many generations?`,
        3,
        ["natural_selection"],
        parts([
          ["a", "Connect the variation to survival or reproduction.", 1],
          ["b", "Explain how inheritance changes the population over generations.", 2],
        ]),
        [
          "Natural selection acts through survival and reproduction.",
          "The variation must be inherited.",
          "More successful individuals leave more offspring carrying the variation.",
        ],
        [
          solutionPart(
            "a",
            L`If a variation improves survival or reproduction in that environment, individuals carrying it leave more offspring.`,
          ),
          solutionPart(
            "b",
            L`Because the variation is inherited, a larger fraction of the next generations carry it, so it becomes more common.`,
          ),
        ],
        [L`Saying individuals change because they need to change, rather than selection acting on inherited variation.`],
      ),
      frq(
        "case",
        L`A beetle population lives on green leaves. A mutation produces some brown beetles. Later, a dry season makes brown leaves common, and birds find green beetles more easily.`,
        4,
        ["evolution_case", "selection_pressure"],
        parts([
          ["a", "Which beetles now have a survival advantage?", 1],
          ["b", "Why is mutation important in this case?", 1],
          ["c", "Why is the dry season described as a selection pressure?", 1],
          ["d", "Will the whole population change in one generation? Explain briefly.", 1],
        ]),
        [
          "The useful colour depends on the environment.",
          "Mutation supplies heritable variation.",
          "Population change usually takes generations.",
        ],
        [
          solutionPart("a", L`Brown beetles now have a survival advantage.`),
          solutionPart(
            "b",
            L`The mutation created a heritable colour variation on which selection could act.`,
          ),
          solutionPart(
            "c",
            L`The dry season changed the background and made birds select against more visible beetles.`,
          ),
          solutionPart(
            "d",
            L`No. The frequency of brown beetles may increase over generations as survivors reproduce more.`,
          ),
        ],
        [L`Treating mutation as a planned response by beetles rather than a source of variation.`],
      ),
      frq(
        "laq",
        L`Use the branching diagram and the idea of evolution by stages to explain why evolution is not a straight ladder of progress.`,
        4,
        ["evolution_tree_reasoning", "evolution_by_stages"],
        parts([
          ["a", "Identify the common-ancestor idea shown by the diagram.", 1],
          ["b", "Explain why endpoints are not necessarily ancestors of one another.", 2],
          ["c", "Explain why complex structures can evolve through useful intermediate stages.", 1],
          ["d", "State why words like 'higher' and 'lower' can be misleading in evolution.", 1],
        ]),
        [
          "A branch point represents a shared ancestor.",
          "Endpoint species can be cousins rather than parent-child forms.",
          "Intermediate stages must have some use of their own.",
        ],
        [
          solutionPart(
            "a",
            L`The lower branching point represents an ancestor from which later populations diverged.`,
          ),
          solutionPart(
            "b",
            L`B, C and D are terminal branches. The diagram supports common ancestry, not the claim that one endpoint directly turned into another.`,
          ),
          solutionPart(
            "c",
            L`Complex structures can evolve in small steps if each intermediate stage gives some advantage, even if it does not yet perform the final function perfectly.`,
          ),
          solutionPart(
            "d",
            L`Terms like 'higher' and 'lower' imply a fixed ladder of improvement, while evolution produces adaptation to different environments.`,
          ),
        ],
        [L`Reading the diagram as a rank list from primitive to perfect.`],
        evolutionBranchFigure,
      ),
    ],
  },
  {
    topicCode: "F.3",
    title: "Electric Motor",
    subtopic:
      "Formative reinforcement: force on a current-carrying conductor, Fleming's left-hand rule and DC motor action.",
    mc: [
      mc(
        L`An electric motor is primarily a device that converts`,
        1,
        ["motor_energy_conversion"],
        [
          wrong(
            "mechanical energy into electrical energy",
            "That is the generator direction of conversion, not the motor direction.",
            "confuses_motor_and_generator",
          ),
          wrong(
            "chemical energy directly into magnetic energy",
            "A motor uses electrical energy to produce mechanical rotation; it is not mainly a chemical device.",
            "misidentifies_energy_conversion",
          ),
          wrong(
            "heat energy into sound energy",
            "Heat and sound are not the intended energy conversion in a motor.",
            "random_energy_conversion",
          ),
          correct("electrical energy into mechanical energy"),
        ],
        [
          "Think of a fan or mixer motor.",
          "The input is electric current.",
          "The useful output is rotation or motion.",
        ],
        [
          step(1, L`A motor takes electrical input.`),
          step(2, L`It produces mechanical rotation, so it converts electrical energy into mechanical energy.`),
        ],
      ),
      mc(
        L`In a simple DC motor, the split-ring commutator is needed mainly to`,
        3,
        ["commutator_role"],
        [
          wrong(
            "increase the resistance of the coil after every half turn",
            "The commutator's role is not to vary resistance; it changes current connection.",
            "confuses_commutator_with_resistor",
          ),
          wrong(
            "make the magnetic field vanish every half turn",
            "The field from the magnets is not made to vanish; current reversal keeps torque in the same rotational sense.",
            "misreads_field_role",
          ),
          correct("reverse the current in the coil after each half turn"),
          wrong(
            "convert the motor permanently into a generator",
            "A commutator is part of the motor's current-reversal mechanism, not a conversion switch to a generator.",
            "confuses_device_function",
          ),
        ],
        [
          "A coil would otherwise have its torque reverse after half a turn.",
          "The current in each arm must reverse at the right time.",
          "The split ring swaps connections after every half turn.",
        ],
        [
          step(1, L`After half a rotation, the coil arms exchange positions.`),
          step(2, L`The split ring reverses current through the coil so torque continues in the same rotational sense.`),
        ],
      ),
      mc(
        L`A motor coil is placed between magnetic poles as shown. If the current in the two opposite arms is reversed by the commutator at the correct instant, the coil`,
        3,
        ["motor_torque", "left_hand_rule"],
        [
          wrong(
            "stops permanently at the vertical position",
            "Stopping would be likely if current were not reversed properly; correct reversal supports continued rotation.",
            "misses_commutator_timing",
          ),
          correct("continues rotating in the same sense"),
          wrong(
            "experiences no magnetic force at any position",
            "A current-carrying conductor in a magnetic field can experience a force.",
            "denies_magnetic_force",
          ),
          wrong(
            "starts converting electrical energy only into heat",
            "Heating losses exist, but the motor's intended effect is mechanical rotation.",
            "focuses_only_on_heating_loss",
          ),
        ],
        [
          "Use Fleming's left-hand rule for each arm.",
          "Current reversal prevents the torque from reversing after half a turn.",
          "That is why the coil keeps rotating.",
        ],
        [
          step(1, L`Opposite arms carry current in opposite directions, so they experience opposite forces.`),
          step(2, L`The commutator reverses current after half a turn, keeping the torque direction suitable for continuous rotation.`),
        ],
        motorCoilFigure,
      ),
      mc(
        L`Which change should increase the turning effect of a simple motor coil, other conditions being suitable?`,
        3,
        ["motor_strength", "application"],
        [
          correct("increase the number of turns of the coil"),
          wrong(
            "replace the magnets with much weaker magnets",
            "A weaker magnetic field reduces the magnetic force on the current-carrying arms.",
            "reverses_field_strength_effect",
          ),
          wrong(
            "decrease the current through the coil",
            "Lower current generally reduces force, not increases it.",
            "reverses_current_effect",
          ),
          wrong(
            "remove the commutator while expecting steady one-way rotation",
            "Without current reversal at the correct time, steady rotation is not maintained in a simple DC motor.",
            "ignores_commutator",
          ),
        ],
        [
          "The force depends on current, field strength and length of wire in the field.",
          "More turns means more effective conductor length in the field.",
          "That increases the turning effect.",
        ],
        [
          step(1, L`Each turn contributes force on the coil arms.`),
          step(2, L`Increasing the number of turns increases the total turning effect, if the supply and field remain suitable.`),
        ],
      ),
      mc(
        L`A student applies Fleming's left-hand rule to a motor but uses the thumb for current, forefinger for force and middle finger for magnetic field. The error is that`,
        4,
        ["fleming_left_hand_rule", "error_analysis"],
        [
          wrong(
            "the left-hand rule is never used for motors",
            "The left-hand rule is exactly the standard rule used for force in motor action.",
            "rejects_correct_rule",
          ),
          wrong(
            "the rule works only if all three fingers point in the same direction",
            "The rule uses three mutually perpendicular directions, not the same direction.",
            "misuses_perpendicular_directions",
          ),
          wrong(
            "the rule gives induced current, not force",
            "Induced current direction is associated with Fleming's right-hand rule; the left-hand rule gives force in motor action.",
            "confuses_left_and_right_rules",
          ),
          correct("the thumb should represent force or motion, not current"),
        ],
        [
          "For the left hand, remember FBI: Force, magnetic Field, current.",
          "Thumb is force/motion.",
          "Forefinger is field; middle finger is current.",
        ],
        [
          step(1, L`Fleming's left-hand rule maps thumb to force or motion.`),
          step(2, L`The forefinger gives magnetic field and the middle finger gives current, so using the thumb for current is wrong.`),
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the rule used to find the direction of force on a current-carrying conductor in a magnetic field.`,
        1,
        ["fleming_left_hand_rule"],
        parts([["a", "Name the rule.", 1]]),
        [
          "This is motor action.",
          "Do not use the generator rule.",
          "The required rule is Fleming's left-hand rule.",
        ],
        [solutionPart("a", L`Fleming's left-hand rule is used.`)],
        [L`Writing Fleming's right-hand rule, which is used for induced current in generator action.`],
      ),
      frq(
        "saq",
        L`State the function of the split-ring commutator in a simple DC motor.`,
        2,
        ["commutator_role"],
        parts([
          ["a", "State what it does to the current.", 1],
          ["b", "State why that helps the coil rotate continuously.", 1],
        ]),
        [
          "The split ring changes electrical contact after half a rotation.",
          "This reverses the current in the coil.",
          "The torque remains in the required rotational sense.",
        ],
        [
          solutionPart("a", L`It reverses the current in the coil after every half rotation.`),
          solutionPart(
            "b",
            L`This prevents the torque from reversing and helps maintain continuous rotation in one sense.`,
          ),
        ],
        [L`Saying the commutator only supports the coil mechanically.`],
      ),
      frq(
        "saq",
        L`In the motor diagram, explain why the two vertical arms of the coil experience forces in opposite directions.`,
        3,
        ["motor_force_pair", "diagram_reasoning"],
        parts([
          ["a", "Identify the factor that is opposite in the two arms.", 1],
          ["b", "Use the left-hand rule to explain the force directions.", 2],
        ]),
        [
          "The magnetic field is the same between the poles.",
          "The current directions in the two arms are opposite.",
          "With the same field but opposite current, the forces are opposite.",
        ],
        [
          solutionPart(
            "a",
            L`The current directions in the two vertical arms are opposite.`,
          ),
          solutionPart(
            "b",
            L`By Fleming's left-hand rule, reversing current while the magnetic field direction is unchanged reverses the force direction. The two arms therefore experience opposite forces and produce a turning effect.`,
          ),
        ],
        [L`Assuming the two arms have the same current direction because they are part of the same coil.`],
        motorCoilFigure,
      ),
      frq(
        "case",
        L`A model motor rotates briefly but then stops after half a turn. The battery and magnets are working, but the split-ring contacts are not changing connection properly.`,
        3,
        ["motor_case", "fault_diagnosis"],
        parts([
          ["a", "Which part is most directly faulty?", 1],
          ["b", "What current change should happen after each half turn?", 1],
          ["c", "Why can the coil stop if this change does not happen?", 2],
        ]),
        [
          "The fault description points to contacts that reverse current.",
          "Without reversal, the torque direction changes at the wrong time.",
          "A motor needs current reversal for continuous one-way rotation.",
        ],
        [
          solutionPart("a", L`The split-ring commutator or its brush contact is faulty.`),
          solutionPart("b", L`The current in the coil should reverse after each half turn.`),
          solutionPart(
            "c",
            L`If current is not reversed, the force pair reverses after the coil crosses the half-turn position, so the coil may stop or oscillate instead of rotating continuously.`,
          ),
        ],
        [L`Blaming the magnet alone even though the given fault is in the commutator contact.`],
      ),
      frq(
        "laq",
        L`Describe the working of a simple DC motor using the ideas of magnetic force, commutator and energy conversion.`,
        4,
        ["motor_working"],
        parts([
          ["a", "State the energy conversion.", 1],
          ["b", "Explain how force acts on the two arms of the coil.", 2],
          ["c", "Explain the role of the commutator in continuous rotation.", 2],
        ]),
        [
          "Start with a current-carrying coil in a magnetic field.",
          "Opposite arms carry opposite currents.",
          "The commutator reverses current after each half turn.",
        ],
        [
          solutionPart("a", L`A DC motor converts electrical energy into mechanical energy.`),
          solutionPart(
            "b",
            L`The two vertical arms carry currents in opposite directions in the same magnetic field. By Fleming's left-hand rule, they experience opposite forces, producing a turning effect on the coil.`,
          ),
          solutionPart(
            "c",
            L`After every half turn, the split-ring commutator reverses current in the coil. This keeps the torque acting in the required sense and allows continuous rotation.`,
          ),
        ],
        [L`Giving only the device name without explaining current reversal and force directions.`],
        motorCoilFigure,
      ),
    ],
  },
  {
    topicCode: "F.4",
    title: "Electromagnetic Induction",
    subtopic:
      "Formative reinforcement: changing magnetic flux, induced current, galvanometer observations and Fleming's right-hand rule.",
    mc: [
      mc(
        L`A current is induced in a coil when a bar magnet is moved towards it. The necessary change is a change in`,
        2,
        ["electromagnetic_induction", "magnetic_flux"],
        [
          correct("magnetic field linked with the coil"),
          wrong(
            "mass of the magnet",
            "The magnet's mass is not the cause; the linked magnetic field changes as it moves relative to the coil.",
            "uses_irrelevant_physical_quantity",
          ),
          wrong(
            "colour of the coil insulation",
            "Insulation colour has no role in producing induced current.",
            "uses_visual_feature",
          ),
          wrong(
            "temperature of the room only",
            "Room temperature alone is not the induction condition in this setup.",
            "uses_unrelated_condition",
          ),
        ],
        [
          "Induction needs a changing magnetic effect through the circuit.",
          "Relative motion changes the magnetic field linked with the coil.",
          "A changing magnetic flux can induce current.",
        ],
        [
          step(1, L`Moving the magnet changes the magnetic field linked with the coil.`),
          step(2, L`This changing flux induces current in the closed coil circuit.`),
        ],
        inductionCoilFigure,
      ),
      mc(
        L`A magnet is pushed into a coil and then pulled out along the same line. The galvanometer deflections are expected to be`,
        3,
        ["galvanometer_observation", "induced_current_direction"],
        [
          wrong(
            "in the same direction both times",
            "Approach and withdrawal change the magnetic flux in opposite ways, so the induced current direction reverses.",
            "misses_direction_reversal",
          ),
          correct("in opposite directions"),
          wrong(
            "zero in both cases because the magnet is not touching the coil",
            "Contact is not required; changing magnetic field through the coil is enough.",
            "requires_physical_contact",
          ),
          wrong(
            "maximum only when the magnet is held still inside the coil",
            "A stationary magnet produces no changing flux, so the deflection falls to zero.",
            "confuses_field_presence_with_changing_flux",
          ),
        ],
        [
          "Think about how the linked magnetic field changes.",
          "Moving in and moving out are opposite changes.",
          "Opposite changes give opposite induced current directions.",
        ],
        [
          step(1, L`Pushing the magnet in increases the linked magnetic field in one sense.`),
          step(2, L`Pulling it out decreases the linked magnetic field, so the induced current direction reverses and the galvanometer deflects oppositely.`),
        ],
        inductionCoilFigure,
      ),
      mc(
        L`Which arrangement should produce the largest induced current in an otherwise identical coil circuit?`,
        3,
        ["induced_current_magnitude"],
        [
          wrong(
            "Move a weak magnet slowly near a coil of few turns.",
            "Slow motion, weak field and fewer turns all reduce the induced effect.",
            "chooses_smallest_change",
          ),
          wrong(
            "Keep a strong magnet stationary inside the coil.",
            "A stationary magnet gives no continuing change in linked magnetic field.",
            "confuses_strong_field_with_changing_field",
          ),
          wrong(
            "Move the coil and magnet together with no relative motion.",
            "If there is no relative change in linked field, induction is not enhanced.",
            "ignores_relative_motion",
          ),
          correct("Move a strong magnet rapidly into a coil with many turns."),
        ],
        [
          "Induced current increases with faster change of magnetic field.",
          "A stronger magnet gives a larger field change.",
          "More turns increase the induced effect.",
        ],
        [
          step(1, L`A stronger magnet and faster motion increase the rate of change of linked magnetic field.`),
          step(2, L`More turns increase the total induced emf, so this arrangement gives the largest induced current.`),
        ],
      ),
      mc(
        L`Fleming's right-hand rule is used in this formative topic to find the direction of`,
        2,
        ["fleming_right_hand_rule"],
        [
          wrong(
            "force on a current-carrying conductor in a motor",
            "That direction is found using Fleming's left-hand rule.",
            "confuses_right_with_left_rule",
          ),
          wrong(
            "heat produced in a resistor",
            "Joule heating is not a direction found by Fleming's right-hand rule.",
            "misapplies_direction_rule",
          ),
          correct("induced current when a conductor moves in a magnetic field"),
          wrong(
            "chemical reaction in a dry cell",
            "The rule is electromagnetic, not a rule for cell chemistry.",
            "uses_unrelated_context",
          ),
        ],
        [
          "Right hand is associated with generator action.",
          "The rule connects motion, magnetic field and induced current.",
          "Left hand is for motor force; right hand is for induced current.",
        ],
        [
          step(1, L`Fleming's right-hand rule is used for generator action.`),
          step(2, L`It gives the direction of induced current when a conductor moves in a magnetic field.`),
        ],
      ),
      mc(
        L`A coil connected to a galvanometer is near a magnet. In which case should the galvanometer show no momentary deflection?`,
        3,
        ["no_induction_condition", "case_reasoning"],
        [
          correct("The magnet and coil remain at rest relative to each other."),
          wrong(
            "The magnet is pushed rapidly into the coil.",
            "Rapid approach changes the linked field and should produce a deflection.",
            "misses_motion_effect",
          ),
          wrong(
            "The magnet is pulled rapidly away from the coil.",
            "Rapid withdrawal also changes the linked field and produces a deflection in the opposite direction.",
            "misses_withdrawal_effect",
          ),
          wrong(
            "The number of turns in the coil is increased while the magnet is moving.",
            "Changing turns while the magnet moves does not remove induction; it can change the magnitude.",
            "misuses_turns_factor",
          ),
        ],
        [
          "The key condition is change in magnetic field linked with the circuit.",
          "Relative rest means no change in linked field.",
          "No changing flux means no induced current.",
        ],
        [
          step(1, L`With the magnet and coil at rest relative to each other, the linked magnetic field is not changing.`),
          step(2, L`Since there is no change in flux, no momentary induced current is shown by the galvanometer.`),
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the principle of electromagnetic induction.`,
        1,
        ["electromagnetic_induction"],
        parts([["a", "State the principle.", 1]]),
        [
          "Use the word changing.",
          "The change is in the magnetic field linked with a circuit.",
          "A current or emf is induced when the magnetic field linked with the circuit changes.",
        ],
        [
          solutionPart(
            "a",
            L`When the magnetic field linked with a closed circuit changes, an induced current is produced in the circuit.`,
          ),
        ],
        [L`Writing only that a magnetic field exists, without requiring it to change.`],
      ),
      frq(
        "saq",
        L`A bar magnet is moved rapidly towards a coil connected to a galvanometer. Explain the observation and the energy change involved.`,
        3,
        ["induction_observation", "energy_conversion"],
        parts([
          ["a", "State the galvanometer observation.", 1],
          ["b", "Explain why it happens.", 1],
          ["c", "State the broad energy conversion.", 1],
        ]),
        [
          "The needle deflects momentarily.",
          "The linked magnetic field is changing.",
          "Mechanical work of motion is converted into electrical energy in the circuit.",
        ],
        [
          solutionPart("a", L`The galvanometer shows a momentary deflection.`),
          solutionPart(
            "b",
            L`Moving the magnet changes the magnetic field linked with the coil, inducing current.`,
          ),
          solutionPart(
            "c",
            L`Mechanical energy supplied in moving the magnet is converted partly into electrical energy.`,
          ),
        ],
        [L`Saying the galvanometer deflects because the magnet touches the coil.`],
        inductionCoilFigure,
      ),
      frq(
        "saq",
        L`Give two ways to increase the induced current in a coil-magnet experiment, and justify each briefly.`,
        3,
        ["induced_current_magnitude"],
        parts([
          ["a", "Give one method related to motion or field strength.", 1],
          ["b", "Give one method related to the coil.", 1],
          ["c", "Justify both using rate of change of linked magnetic field.", 2],
        ]),
        [
          "Think faster motion or stronger magnet.",
          "Think more turns in the coil.",
          "The induced effect depends on how rapidly the linked magnetic field changes.",
        ],
        [
          solutionPart("a", L`Move the magnet faster or use a stronger magnet.`),
          solutionPart("b", L`Use a coil with more turns.`),
          solutionPart(
            "c",
            L`Faster motion or a stronger magnet increases the rate of change of linked magnetic field. More turns increase the total induced emf in the coil.`,
          ),
        ],
        [L`Increasing current by just holding the magnet still inside the coil.`],
      ),
      frq(
        "case",
        L`In three trials, a magnet is (i) held still inside a coil, (ii) pushed into the coil, and (iii) pulled out of the coil. The coil is connected to a centre-zero galvanometer.`,
        3,
        ["induction_case", "galvanometer_direction"],
        parts([
          ["a", "In which trial is there no deflection?", 1],
          ["b", "How are the deflections in trials (ii) and (iii) related?", 1],
          ["c", "Explain the difference using linked magnetic field.", 2],
        ]),
        [
          "Holding still gives no change in linked field.",
          "Pushing in and pulling out are opposite changes.",
          "Opposite changes give opposite current directions.",
        ],
        [
          solutionPart("a", L`Trial (i) shows no deflection after the magnet is held still.`),
          solutionPart("b", L`Trials (ii) and (iii) give deflections in opposite directions.`),
          solutionPart(
            "c",
            L`Pushing the magnet in changes the linked field in one sense, while pulling it out changes it in the opposite sense. Hence the induced currents are opposite.`,
          ),
        ],
        [L`Predicting a steady deflection just because a magnet is present.`],
      ),
      frq(
        "laq",
        L`Compare Fleming's left-hand rule and Fleming's right-hand rule in terms of situation, quantity found and device example.`,
        4,
        ["left_right_rule_comparison"],
        parts([
          ["a", "State the situation for Fleming's left-hand rule.", 1],
          ["b", "State the situation for Fleming's right-hand rule.", 1],
          ["c", "Give one device example for each.", 2],
        ]),
        [
          "Left-hand rule is motor action.",
          "Right-hand rule is generator or induction action.",
          "Motor finds force; generator rule finds induced current direction.",
        ],
        [
          solutionPart(
            "a",
            L`Fleming's left-hand rule is used to find the direction of force or motion on a current-carrying conductor in a magnetic field.`,
          ),
          solutionPart(
            "b",
            L`Fleming's right-hand rule is used to find the direction of induced current when a conductor moves in a magnetic field.`,
          ),
          solutionPart(
            "c",
            L`A motor is the left-hand-rule example, while a generator or moving conductor induction setup is the right-hand-rule example.`,
          ),
        ],
        [L`Interchanging the two rules because both involve magnetic field and current.`],
      ),
    ],
  },
  {
    topicCode: "F.5",
    title: "Electric Generator",
    subtopic:
      "Formative reinforcement: AC generator principle, slip rings, brushes and alternating output.",
    mc: [
      mc(
        L`An electric generator works on the principle of`,
        2,
        ["generator_principle"],
        [
          wrong(
            "heating effect of current",
            "Heating effect explains devices like heaters and fuses, not the basic working of a generator.",
            "confuses_effects_of_current",
          ),
          wrong(
            "chemical neutralisation",
            "Neutralisation is a chemical process and is unrelated to generator action.",
            "uses_unrelated_chemistry",
          ),
          correct("electromagnetic induction"),
          wrong(
            "reflection of light",
            "Reflection of light is unrelated to producing current in a generator.",
            "uses_unrelated_physics",
          ),
        ],
        [
          "A generator produces current because magnetic field linked with a coil changes.",
          "That is the induction principle.",
          "The principle is electromagnetic induction.",
        ],
        [
          step(1, L`A generator rotates a coil in a magnetic field.`),
          step(2, L`The changing magnetic field linked with the coil induces current, so it works by electromagnetic induction.`),
        ],
      ),
      mc(
        L`In a simple AC generator, the use of slip rings instead of a split-ring commutator helps the external circuit receive`,
        3,
        ["ac_generator", "slip_rings"],
        [
          wrong(
            "current in one fixed direction only",
            "One fixed direction is associated with commutation in a DC generator, not ordinary slip rings in an AC generator.",
            "confuses_slip_ring_with_split_ring",
          ),
          wrong(
            "no current because slip rings insulate the circuit completely",
            "Slip rings maintain electrical contact through brushes while allowing rotation.",
            "misreads_slip_ring_contact",
          ),
          wrong(
            "only heat and no electrical output",
            "A generator's intended output is electrical energy, not merely heat.",
            "misstates_energy_output",
          ),
          correct("alternating current"),
        ],
        [
          "A split ring reverses connections to make output one-way.",
          "Slip rings keep the two ends connected separately.",
          "As the coil rotates, the induced current reverses every half turn, giving AC.",
        ],
        [
          step(1, L`Slip rings keep each end of the coil connected to its own brush.`),
          step(2, L`The induced current reverses after each half turn, so the external output is alternating current.`),
        ],
        generatorFigure,
      ),
      mc(
        L`A generator is rotated faster between the same magnetic poles. The expected effect on the induced emf is that it`,
        3,
        ["generator_output", "rate_of_change"],
        [
          wrong(
            "must become zero because the coil has less time inside the field",
            "Faster rotation increases the rate of change of flux rather than making it zero.",
            "misreads_speed_effect",
          ),
          correct("increases because the magnetic flux changes more rapidly"),
          wrong(
            "changes into a chemical current",
            "The source remains electromagnetic induction, not a chemical cell process.",
            "uses_unrelated_current_source",
          ),
          wrong(
            "is unaffected by speed in all conditions",
            "In generator action, faster change of flux generally increases induced emf.",
            "ignores_rate_of_change",
          ),
        ],
        [
          "Induced emf depends on the rate of change of magnetic field linked with the coil.",
          "Faster rotation changes flux more rapidly.",
          "So the induced emf increases.",
        ],
        [
          step(1, L`Increasing rotational speed increases the rate at which magnetic flux through the coil changes.`),
          step(2, L`A greater rate of change of flux produces a larger induced emf.`),
        ],
      ),
      mc(
        L`A student says, "A motor and a generator are the same because both have a coil and magnets." The best correction is that`,
        4,
        ["motor_generator_comparison", "claim_correction"],
        [
          correct("they may share parts, but their energy conversion and working role are opposite"),
          wrong(
            "a motor has no magnetic field at all",
            "A motor uses magnetic field; denying the field is incorrect.",
            "denies_motor_field",
          ),
          wrong(
            "a generator needs no motion or changing magnetic field",
            "Generator action needs changing magnetic flux, commonly supplied by rotating the coil.",
            "ignores_generator_motion",
          ),
          wrong(
            "both always give identical output current in identical direction",
            "A motor uses input current for motion, while a generator produces induced current; their outputs are not identical.",
            "overgeneralises_shared_parts",
          ),
        ],
        [
          "Compare input and output energy.",
          "A motor consumes electrical energy to make motion.",
          "A generator uses mechanical motion to produce electrical energy.",
        ],
        [
          step(1, L`A motor converts electrical energy into mechanical energy.`),
          step(2, L`A generator converts mechanical energy into electrical energy by electromagnetic induction.`),
        ],
      ),
      mc(
        L`In the generator diagram, brushes are needed mainly to`,
        2,
        ["generator_brushes"],
        [
          wrong(
            "block current from reaching the external circuit",
            "Brushes are conductive contacts; they are not meant to block output current.",
            "reverses_brush_role",
          ),
          wrong(
            "create the magnetic field by themselves",
            "The magnetic field is supplied by the poles or magnets, not by the brushes alone.",
            "misidentifies_field_source",
          ),
          wrong(
            "stop the coil from rotating",
            "Brushes maintain electrical contact while rotation continues.",
            "misreads_mechanical_role",
          ),
          correct("maintain electrical contact between rotating rings and the external circuit"),
        ],
        [
          "The rings rotate with the coil.",
          "The external circuit is stationary.",
          "Brushes provide sliding electrical contact between them.",
        ],
        [
          step(1, L`The slip rings rotate with the coil.`),
          step(2, L`Brushes touch the rings and carry current to the stationary external circuit.`),
        ],
        generatorFigure,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the energy conversion in an electric generator.`,
        1,
        ["generator_energy_conversion"],
        parts([["a", "Write the energy conversion.", 1]]),
        [
          "A generator is driven mechanically.",
          "Its output is electrical.",
          "Mechanical energy is converted into electrical energy.",
        ],
        [
          solutionPart(
            "a",
            L`An electric generator converts mechanical energy into electrical energy.`,
          ),
        ],
        [L`Writing the motor conversion instead: electrical energy into mechanical energy.`],
      ),
      frq(
        "saq",
        L`Explain why the output of a simple AC generator changes direction after every half rotation of the coil.`,
        3,
        ["ac_generator_output"],
        parts([
          ["a", "Mention the changing orientation of the coil in the magnetic field.", 1],
          ["b", "Connect this to reversal of induced current.", 2],
        ]),
        [
          "As the coil rotates, each arm exchanges its motion relative to the magnetic field after half a turn.",
          "The direction of induced current reverses.",
          "This repeated reversal gives alternating current.",
        ],
        [
          solutionPart(
            "a",
            L`After half a rotation, the arms of the coil have exchanged positions and their motion relative to the magnetic field is reversed.`,
          ),
          solutionPart(
            "b",
            L`By generator action, reversal of the relative motion reverses the direction of induced current. Therefore the output alternates after every half rotation.`,
          ),
        ],
        [L`Saying AC changes direction because the battery terminals are swapped; a generator does not use a battery to create the output.`],
        generatorFigure,
      ),
      frq(
        "saq",
        L`Differentiate the role of slip rings and split-ring commutator in generator-type devices.`,
        3,
        ["slip_ring_split_ring_comparison"],
        parts([
          ["a", "State what slip rings do in an AC generator.", 1],
          ["b", "State what a split-ring commutator does in a DC output arrangement.", 1],
          ["c", "State the output difference.", 1],
        ]),
        [
          "Slip rings maintain separate continuous contact.",
          "A split ring reverses connections every half turn.",
          "That changes AC output into one-direction external output in a DC generator model.",
        ],
        [
          solutionPart(
            "a",
            L`Slip rings connect the rotating coil ends to brushes without reversing the external connections.`,
          ),
          solutionPart(
            "b",
            L`A split-ring commutator reverses the external connection after every half turn.`,
          ),
          solutionPart(
            "c",
            L`Slip rings give AC output, while a split-ring arrangement can give a unidirectional DC-type output.`,
          ),
        ],
        [L`Using the terms slip ring and split ring as if they were identical.`],
      ),
      frq(
        "case",
        L`A hand-cranked classroom generator lights a small lamp dimly at first. When the handle is turned faster, the lamp glows brighter.`,
        3,
        ["generator_case", "rate_of_change_application"],
        parts([
          ["a", "What energy conversion is taking place?", 1],
          ["b", "Why does faster cranking make the lamp brighter?", 2],
          ["c", "Name the principle involved.", 1],
        ]),
        [
          "The hand supplies mechanical energy.",
          "Faster rotation changes magnetic flux more rapidly.",
          "The principle is electromagnetic induction.",
        ],
        [
          solutionPart("a", L`Mechanical energy is converted into electrical energy.`),
          solutionPart(
            "b",
            L`Faster cranking increases the rate of change of magnetic flux through the coil, producing a larger induced emf and current, so the lamp glows brighter.`,
          ),
          solutionPart("c", L`The principle is electromagnetic induction.`),
        ],
        [L`Explaining brightness only by frictional heating of the handle.`],
      ),
      frq(
        "laq",
        L`Describe the working of a simple AC generator using the labelled parts in the diagram.`,
        4,
        ["generator_working", "diagram_explanation"],
        parts([
          ["a", "Name the main parts shown.", 2],
          ["b", "Explain how current is induced.", 2],
          ["c", "Explain why the external output is alternating.", 1],
        ]),
        [
          "Identify magnets, rotating coil, slip rings, brushes and load.",
          "Rotation changes magnetic flux through the coil.",
          "The current reverses after each half turn in an AC generator.",
        ],
        [
          solutionPart(
            "a",
            L`The main parts are the field magnets, rotating coil, slip rings, brushes and external load.`,
          ),
          solutionPart(
            "b",
            L`When the coil is rotated between magnetic poles, the magnetic field linked with it changes. This induces an emf and current in the coil.`,
          ),
          solutionPart(
            "c",
            L`After each half rotation the direction of induced current reverses, and slip rings deliver this reversing current to the external circuit as AC.`,
          ),
        ],
        [L`Describing a motor instead of a generator, or omitting the reason for alternating output.`],
        generatorFigure,
      ),
    ],
  },
];

export const science10FormativeReinforcementTopics: Topic[] =
  topicSeeds.map(makeTopic);
