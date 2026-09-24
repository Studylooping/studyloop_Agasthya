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
const UNIT = "u1-chemical-substances-nature-behaviour";
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

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function criterion(
  partLetter: string,
  points: number,
  description: string,
): FrqRubric["criteria"][number] {
  return { part: partLetter, points, description };
}

function rubric(criteria: readonly FrqRubric["criteria"][number][]): FrqRubric {
  return {
    maxPoints: criteria.reduce((sum, item) => sum + item.points, 0),
    criteria: [...criteria],
  };
}

function solutionPart(
  partLetter: string,
  explanation: string,
  math?: string,
): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the observation, equation, or property being tested.${checkStep} The correct choice is ${correctText}.`;
}

function calibrateScience10Difficulty({
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

  const text = questionLatex.toLowerCase();
  const isRecall =
    /\b(identify|name|which gas|which salt|which formula|is called|best represents)\b/.test(
      text,
    ) && !/\b(data|justify|infer|predict|compare|case|experiment|sequence)\b/.test(text);

  if (kind === "mc_single" && difficulty >= 3 && isRecall) {
    return Math.max(2, difficulty - 1) as Difficulty;
  }

  if (kind === "frq" && responseType === "saq" && difficulty >= 4 && isRecall) {
    return 3;
  }

  return difficulty;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const correctIndex = LETTERS.indexOf(seed.correctLetter);
  if (correctIndex < 0) {
    throw new Error(`${meta.topicCode} MC ${index + 1} has invalid correct letter.`);
  }

  const choices = seed.choices.map((text, choiceIndex) => {
    const letter = LETTERS[choiceIndex];
    const isCorrect = letter === seed.correctLetter;
    return {
      letter,
      text,
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : (seed.rationales[letter] ?? fallbackWrongRationale(seed, letter)),
      misconceptionTag: isCorrect
        ? null
        : (seed.misconceptionTags?.[letter] ??
          "incorrect_cbse_class10_science_chemistry_reasoning"),
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateScience10Difficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_a_keyword_without_checking_the_observation_or_equation",
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
    difficulty: calibrateScience10Difficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_result_without_connecting_it_to_evidence_or_balanced_equations",
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

const sealedReactionSetupFigure: ItemFigure = {
  type: "svg",
  title: "Closed reaction setup on a balance",
  description:
    "A closed conical flask with a delivery tube is placed on a balance before and after a reaction.",
  svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="300" fill="#ffffff"/>
  <text x="160" y="36" text-anchor="middle" font-family="Arial" font-size="18" fill="#0f172a">before reaction</text>
  <text x="520" y="36" text-anchor="middle" font-family="Arial" font-size="18" fill="#0f172a">after reaction</text>
  <g transform="translate(55 58)">
    <rect x="0" y="172" width="215" height="36" rx="8" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
    <text x="108" y="195" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">balance</text>
    <path d="M80 52 L50 168 H165 L135 52 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
    <rect x="84" y="36" width="48" height="22" rx="5" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
    <path d="M132 45 C160 44 172 70 188 78" fill="none" stroke="#475569" stroke-width="3"/>
    <circle cx="190" cy="80" r="4" fill="#475569"/>
    <circle cx="82" cy="125" r="5" fill="#60a5fa"/>
    <circle cx="108" cy="140" r="5" fill="#60a5fa"/>
    <circle cx="130" cy="118" r="5" fill="#60a5fa"/>
  </g>
  <g transform="translate(415 58)">
    <rect x="0" y="172" width="215" height="36" rx="8" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
    <text x="108" y="195" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">balance</text>
    <path d="M80 52 L50 168 H165 L135 52 Z" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <rect x="84" y="36" width="48" height="22" rx="5" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
    <path d="M132 45 C160 44 172 70 188 78" fill="none" stroke="#475569" stroke-width="3"/>
    <circle cx="190" cy="80" r="4" fill="#475569"/>
    <circle cx="78" cy="105" r="5" fill="#22c55e"/>
    <circle cx="110" cy="132" r="5" fill="#22c55e"/>
    <circle cx="136" cy="118" r="5" fill="#22c55e"/>
    <circle cx="116" cy="92" r="5" fill="#22c55e"/>
  </g>
  <path d="M300 156 H380" stroke="#64748b" stroke-width="3" marker-end="url(#arrow)"/>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#64748b"/>
    </marker>
  </defs>
</svg>`,
};

const phStripFigure: ItemFigure = {
  type: "svg",
  title: "pH paper readings from household samples",
  description:
    "Five labelled pH strips are shown with their numerical readings for interpretation.",
  svg: `<svg viewBox="0 0 700 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="330" fill="#ffffff"/>
  <text x="350" y="34" text-anchor="middle" font-family="Arial" font-size="19" fill="#0f172a">pH readings from five samples</text>
  <g font-family="Arial" font-size="15" fill="#0f172a">
    <text x="86" y="88">P</text>
    <text x="86" y="128">Q</text>
    <text x="86" y="168">R</text>
    <text x="86" y="208">S</text>
    <text x="86" y="248">T</text>
  </g>
  <g stroke="#334155" stroke-width="1.5">
    <line x1="130" y1="84" x2="610" y2="84"/>
    <line x1="130" y1="124" x2="610" y2="124"/>
    <line x1="130" y1="164" x2="610" y2="164"/>
    <line x1="130" y1="204" x2="610" y2="204"/>
    <line x1="130" y1="244" x2="610" y2="244"/>
  </g>
  <g>
    <rect x="130" y="70" width="480" height="20" fill="#fef08a"/>
    <rect x="130" y="110" width="480" height="20" fill="#fca5a5"/>
    <rect x="130" y="150" width="480" height="20" fill="#bbf7d0"/>
    <rect x="130" y="190" width="480" height="20" fill="#bfdbfe"/>
    <rect x="130" y="230" width="480" height="20" fill="#fde68a"/>
  </g>
  <g font-family="Arial" font-size="15" fill="#0f172a">
    <text x="628" y="86">pH 7</text>
    <text x="628" y="126">pH 2</text>
    <text x="628" y="166">pH 8</text>
    <text x="628" y="206">pH 12</text>
    <text x="628" y="246">pH 5</text>
  </g>
  <line x1="130" y1="288" x2="610" y2="288" stroke="#334155" stroke-width="2"/>
  <g font-family="Arial" font-size="13" fill="#475569">
    <text x="128" y="310">acidic</text>
    <text x="334" y="310">neutral</text>
    <text x="575" y="310">basic</text>
  </g>
</svg>`,
};

const reactivityTestFigure: ItemFigure = {
  type: "svg",
  title: "Displacement tests using salt solutions",
  description:
    "Four test tubes show whether a visible deposit formed when metal strips were placed in salt solutions.",
  svg: `<svg viewBox="0 0 720 350" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="350" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="19" fill="#0f172a">observations after 20 minutes</text>
  <g font-family="Arial" font-size="15" fill="#0f172a" text-anchor="middle">
    <text x="120" y="78"><tspan>Zn strip in FeSO</tspan><tspan baseline-shift="sub" font-size="10">4</tspan></text>
    <text x="280" y="78"><tspan>Fe strip in CuSO</tspan><tspan baseline-shift="sub" font-size="10">4</tspan></text>
    <text x="440" y="78"><tspan>Cu strip in FeSO</tspan><tspan baseline-shift="sub" font-size="10">4</tspan></text>
    <text x="600" y="78"><tspan>Al strip in ZnSO</tspan><tspan baseline-shift="sub" font-size="10">4</tspan></text>
  </g>
  <g stroke="#334155" stroke-width="3" fill="#dbeafe">
    <path d="M88 96 V260 Q88 288 120 288 Q152 288 152 260 V96"/>
    <path d="M248 96 V260 Q248 288 280 288 Q312 288 312 260 V96"/>
    <path d="M408 96 V260 Q408 288 440 288 Q472 288 472 260 V96"/>
    <path d="M568 96 V260 Q568 288 600 288 Q632 288 632 260 V96"/>
  </g>
  <g stroke="#64748b" stroke-width="7" stroke-linecap="round">
    <line x1="120" y1="114" x2="120" y2="242"/>
    <line x1="280" y1="114" x2="280" y2="242"/>
    <line x1="440" y1="114" x2="440" y2="242"/>
    <line x1="600" y1="114" x2="600" y2="242"/>
  </g>
  <g fill="#b45309">
    <circle cx="280" cy="160" r="5"/>
    <circle cx="288" cy="190" r="5"/>
    <circle cx="273" cy="222" r="5"/>
  </g>
  <g fill="#475569">
    <circle cx="120" cy="180" r="4"/>
    <circle cx="128" cy="214" r="4"/>
    <circle cx="600" cy="176" r="4"/>
    <circle cx="592" cy="214" r="4"/>
  </g>
  <g font-family="Arial" font-size="14" text-anchor="middle" fill="#0f172a">
    <text x="120" y="322">coating forms</text>
    <text x="280" y="322">brown deposit</text>
    <text x="440" y="322">no visible change</text>
    <text x="600" y="322">coating forms</text>
  </g>
</svg>`,
};

const carbonStructureFigure: ItemFigure = {
  type: "svg",
  title: "Three carbon compounds",
  description:
    "Displayed formulae of three carbon compounds labelled P, Q and R.",
  svg: `<svg viewBox="0 0 720 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="260" fill="#ffffff"/>
  <g font-family="Arial" fill="#0f172a" text-anchor="middle">
    <text x="130" y="55" font-size="20">P</text>
    <text x="360" y="55" font-size="20">Q</text>
    <text x="590" y="55" font-size="20">R</text>
    <text x="130" y="135" font-size="24">
      <tspan>CH</tspan><tspan baseline-shift="sub" font-size="15">3</tspan><tspan>-CH</tspan><tspan baseline-shift="sub" font-size="15">2</tspan><tspan>-OH</tspan>
    </text>
    <text x="360" y="135" font-size="24">
      <tspan>CH</tspan><tspan baseline-shift="sub" font-size="15">3</tspan><tspan>-COOH</tspan>
    </text>
    <text x="590" y="135" font-size="24">
      <tspan>CH</tspan><tspan baseline-shift="sub" font-size="15">2</tspan><tspan>=CH</tspan><tspan baseline-shift="sub" font-size="15">2</tspan>
    </text>
  </g>
  <g stroke="#94a3b8" stroke-width="2">
    <line x1="240" y1="84" x2="240" y2="190"/>
    <line x1="480" y1="84" x2="480" y2="190"/>
  </g>
</svg>`,
};

const soapTestFigure: ItemFigure = {
  type: "svg",
  title: "Soap solution shaken with two water samples",
  description:
    "Two stoppered tubes show different foam and scum after soap solution is shaken with water samples.",
  svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="300" fill="#ffffff"/>
  <text x="310" y="34" text-anchor="middle" font-family="Arial" font-size="19" fill="#0f172a">after shaking equal soap solution</text>
  <g transform="translate(125 62)">
    <rect x="0" y="0" width="120" height="200" rx="18" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
    <rect x="16" y="28" width="88" height="62" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
    <circle cx="34" cy="42" r="7" fill="#e0f2fe"/>
    <circle cx="58" cy="56" r="9" fill="#e0f2fe"/>
    <circle cx="83" cy="44" r="7" fill="#e0f2fe"/>
    <text x="60" y="230" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">sample A</text>
  </g>
  <g transform="translate(375 62)">
    <rect x="0" y="0" width="120" height="200" rx="18" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
    <rect x="18" y="138" width="84" height="22" rx="8" fill="#cbd5e1"/>
    <circle cx="34" cy="126" r="4" fill="#e2e8f0"/>
    <circle cx="58" cy="118" r="5" fill="#e2e8f0"/>
    <circle cx="82" cy="126" r="4" fill="#e2e8f0"/>
    <text x="60" y="230" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">sample B</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Chemical Reactions and Equations",
    subtopic:
      "Balanced equations, reaction types, redox reasoning and observable evidence",
    mc: [
      {
        questionLatex: L`An iron nail is kept in blue copper sulphate solution. After some time, the solution turns pale green and a brown deposit appears. Which balanced equation best explains the observation?`,
        difficulty: 2,
        skillTags: ["displacement_reaction", "balanced_equations"],
        choices: [
          L`$Fe + CuSO_4 \rightarrow FeSO_4 + Cu$`,
          L`$Cu + FeSO_4 \rightarrow CuSO_4 + Fe$`,
          L`$Fe_2O_3 + 3Cu \rightarrow 2Fe + 3CuO$`,
          L`$Fe + CuSO_4 \rightarrow FeS + CuO_4$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This reverses the actual displacement. Copper is less reactive than iron and does not displace iron from iron sulphate.",
          C: "This is not the salt-solution experiment described; it invents iron oxide and copper oxide.",
          D: "This breaks the sulphate ion incorrectly and does not represent the observed salt solution.",
        },
        hints: [
          "Use the colour change: copper sulphate is blue and iron sulphate is pale green.",
          "A more reactive metal displaces a less reactive metal from its salt solution.",
          "Keep the sulphate group together while writing the displacement equation.",
        ],
        solution: [
          step(1, "Iron is more reactive than copper, so it displaces copper from copper sulphate solution."),
          step(2, "The pale green solution is iron sulphate and the brown deposit is copper."),
          step(3, "The balanced displacement equation is:", "Fe + CuSO_4 \\rightarrow FeSO_4 + Cu"),
        ],
      },
      {
        questionLatex: L`Assertion (A): Changing $H_2 + O_2 \rightarrow H_2O$ into $2H_2 + O_2 \rightarrow 2H_2O$ obeys conservation of mass. Reason (R): Balancing changes coefficients, not the formulae of substances.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "conservation_of_mass"],
        choices: [
          "Both A and R are true, and R correctly explains A.",
          "Both A and R are true, but R does not explain A.",
          "A is true, but R is false.",
          "A is false, but R is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains why the equation can be balanced without changing the substances.",
          C: "The reason is true: subscripts inside formulae are not changed during balancing.",
          D: "The assertion is true because both sides then contain four H atoms and two O atoms.",
        },
        hints: [
          "Count atoms on both sides after balancing.",
          "Ask whether $H_2O$ was changed into a different formula.",
          "Coefficients multiply whole formula units; subscripts define the substance.",
        ],
        solution: [
          step(1, "The unbalanced equation has two oxygen atoms on the left but one on the right."),
          step(2, "Using coefficients gives four H atoms and two O atoms on each side."),
          step(3, "The formula $H_2O$ is not altered; only the number of molecules is changed.", "2H_2 + O_2 \\rightarrow 2H_2O"),
        ],
      },
      {
        questionLatex: L`On heating lead nitrate strongly, brown fumes are observed and a yellow residue remains. The reaction is best classified as`,
        difficulty: 2,
        skillTags: ["thermal_decomposition", "reaction_classification"],
        choices: [
          "combination reaction",
          "double displacement reaction",
          "neutralisation reaction",
          "thermal decomposition reaction",
        ],
        correctLetter: "D",
        rationales: {
          A: "Combination forms one product from two or more reactants; here one compound breaks down.",
          B: "Double displacement needs exchange of ions between two compounds in solution.",
          C: "Neutralisation involves acid and base forming salt and water, not brown nitrogen dioxide fumes.",
        },
        hints: [
          "Look at the word 'heating' and the fact that one compound gives several products.",
          "Lead nitrate gives lead oxide, nitrogen dioxide and oxygen.",
          "Breaking down by heat is thermal decomposition.",
        ],
        solution: [
          step(1, "Heating lead nitrate makes it decompose."),
          step(2, "The brown fumes are $NO_2$ and the yellow residue is $PbO$."),
          step(3, "The balanced equation is:", "2Pb(NO_3)_2 \\rightarrow 2PbO + 4NO_2 + O_2"),
        ],
      },
      {
        questionLatex: L`Zinc oxide is heated with carbon: $ZnO + C \rightarrow Zn + CO$. Which statement identifies the redox change correctly?`,
        difficulty: 3,
        skillTags: ["redox", "oxidation_reduction"],
        choices: [
          "$ZnO$ is oxidised and carbon is reduced.",
          "$ZnO$ is reduced and carbon is oxidised.",
          "Both $ZnO$ and carbon are reduced.",
          "No oxidation or reduction occurs because no oxygen gas is used.",
        ],
        correctLetter: "B",
        rationales: {
          A: "$ZnO$ loses oxygen to form zinc, so it is reduced, not oxidised.",
          C: "Carbon gains oxygen to form carbon monoxide, so carbon is oxidised.",
          D: "Oxygen transfer can show redox even when oxygen gas is not a reactant.",
        },
        hints: [
          "Reduction can be seen as loss of oxygen.",
          "Oxidation can be seen as gain of oxygen.",
          "Track where the oxygen atom from $ZnO$ goes.",
        ],
        solution: [
          step(1, "$ZnO$ loses oxygen and becomes zinc, so $ZnO$ is reduced."),
          step(2, "Carbon gains oxygen and becomes carbon monoxide, so carbon is oxidised."),
          step(3, "Both processes occur together, so the reaction is redox."),
        ],
      },
      {
        questionLatex: L`A student mixes two colourless salt solutions and obtains an insoluble white solid immediately. Which inference is most justified from this observation alone?`,
        difficulty: 3,
        skillTags: ["precipitation", "evidence_based_inference"],
        choices: [
          "A gas has evolved.",
          "A metal has displaced another metal from solution.",
          "A precipitate has formed in a double displacement reaction.",
          "The reaction must be endothermic.",
        ],
        correctLetter: "C",
        rationales: {
          A: "Gas evolution would be indicated by bubbles, not by an insoluble solid alone.",
          B: "Metal displacement requires a metal and a salt solution; the stem has two salt solutions.",
          D: "Temperature change is not given, so endothermic behaviour cannot be inferred.",
        },
        hints: [
          "A solid appearing from two solutions has a specific name.",
          "Two salt solutions exchange ions.",
          "Only infer what the observation directly supports.",
        ],
        solution: [
          step(1, "An insoluble solid formed from solutions is a precipitate."),
          step(2, "Two salt solutions usually exchange ions."),
          step(3, "Therefore the observation supports a double displacement precipitation reaction."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A student mixes aqueous potassium iodide with aqueous lead nitrate and observes a yellow solid. Name the type of reaction.`,
        difficulty: 2,
        skillTags: ["precipitation", "reaction_type"],
        parts: [part("a", "Name the reaction type.", 1)],
        hints: [
          "Focus on the yellow solid formed from two solutions.",
          "An insoluble solid is called a precipitate.",
          "Precipitation is a type of double displacement reaction.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies the reaction as precipitation or double displacement precipitation."),
        ]),
        commonErrors: [
          "Calling it displacement because a solid appears.",
          "Writing only the colour without naming the reaction type.",
        ],
        workedSolution: [
          solutionPart("a", "It is a precipitation reaction, specifically a double displacement reaction forming yellow lead iodide.", "Pb(NO_3)_2 + 2KI \\rightarrow PbI_2 + 2KNO_3"),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Balance and classify the reaction of iron with steam: $Fe + H_2O \rightarrow Fe_3O_4 + H_2$.`,
        difficulty: 3,
        skillTags: ["balancing", "redox", "reaction_classification"],
        parts: [
          part("a", "Write the balanced equation.", 1),
          part("b", "Classify the reaction and state one reason.", 1),
        ],
        hints: [
          "Balance iron atoms first because $Fe_3O_4$ contains three iron atoms.",
          "Then balance oxygen by adjusting water.",
          "Hydrogen gas is formed and iron is converted to an oxide.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $3Fe + 4H_2O \\rightarrow Fe_3O_4 + 4H_2$."),
          criterion("b", 1, "Classifies it as redox and supports using oxygen/hydrogen transfer."),
        ]),
        commonErrors: [
          "Balancing iron but leaving hydrogen unequal.",
          "Calling it neutralisation because water is present.",
        ],
        workedSolution: [
          solutionPart("a", "The balanced equation is:", "3Fe + 4H_2O \\rightarrow Fe_3O_4 + 4H_2"),
          solutionPart("b", "It is a redox reaction: iron gains oxygen to form $Fe_3O_4$, while water is reduced to hydrogen gas."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A packet of fried snacks becomes unpleasant in smell after being kept open for many days. Explain the chemical cause and give two preventive methods.`,
        difficulty: 3,
        skillTags: ["oxidation", "rancidity", "application"],
        parts: [
          part("a", "Name the process responsible.", 1),
          part("b", "State two methods to slow it down.", 2),
        ],
        hints: [
          "The oils and fats in the snack react slowly with air.",
          "This is an oxidation process linked to smell and taste.",
          "Reducing contact with oxygen or lowering temperature slows it.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names rancidity due to oxidation of fats/oils."),
          criterion("b", 2, "Gives two valid methods such as airtight packing, nitrogen flushing, refrigeration, or antioxidants."),
        ]),
        commonErrors: [
          "Saying it is only evaporation of water.",
          "Giving storage methods without linking them to oxygen or oxidation.",
        ],
        workedSolution: [
          solutionPart("a", "The process is rancidity, caused by oxidation of fats and oils in the food."),
          solutionPart("b", "It can be slowed by keeping the food in airtight packets, flushing packets with nitrogen, refrigeration, or adding suitable antioxidants."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher performs four reactions: quicklime with water, heating ferrous sulphate crystals, iron nails in copper sulphate solution, and sodium sulphate solution with barium chloride solution.`,
        difficulty: 4,
        skillTags: ["reaction_classification", "lab_observation", "balanced_equations"],
        parts: [
          part("a", "Classify the reaction of quicklime with water.", 1),
          part("b", "Write one expected observation when ferrous sulphate crystals are heated strongly.", 1),
          part("c", "Write the balanced equation for sodium sulphate solution reacting with barium chloride solution.", 2),
          part("d", "Which of the four reactions is a displacement reaction? Give the reason.", 2),
        ],
        hints: [
          "Match each observation to the reaction type, not just to the reactant name.",
          "Ferrous sulphate changes colour and gives gases on strong heating.",
          "Barium sulphate is insoluble and appears as a white precipitate.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies combination reaction, preferably exothermic."),
          criterion("b", 1, "States a valid observation such as green crystals turning brown or gas evolution."),
          criterion("c", 2, "Writes a balanced equation with correct products."),
          criterion("d", 2, "Identifies iron in copper sulphate and explains iron displaces copper due to higher reactivity."),
        ]),
        commonErrors: [
          "Calling every lab reaction decomposition.",
          "Writing barium chloride as a gas product.",
          "Saying copper displaces iron in the nail experiment.",
        ],
        workedSolution: [
          solutionPart("a", "Quicklime reacts with water to form one product, slaked lime, so it is a combination reaction. It is also exothermic.", "CaO + H_2O \\rightarrow Ca(OH)_2"),
          solutionPart("b", "On heating ferrous sulphate crystals, green crystals turn brown and gases are released."),
          solutionPart("c", "The balanced precipitation equation is:", "Na_2SO_4 + BaCl_2 \\rightarrow BaSO_4 + 2NaCl"),
          solutionPart("d", "Iron nails in copper sulphate show displacement because iron, being more reactive, displaces copper from copper sulphate.", "Fe + CuSO_4 \\rightarrow FeSO_4 + Cu"),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows a reaction carried out in a closed flask placed on a balance before and after the reaction.`,
        difficulty: 3,
        skillTags: ["conservation_of_mass", "experimental_reasoning"],
        figure: sealedReactionSetupFigure,
        parts: [
          part("a", "State the law being tested.", 1),
          part("b", "Predict whether the balance reading should change in a properly closed flask. Justify.", 2),
          part("c", "Why might an open flask give a different reading in a gas-evolution reaction?", 2),
        ],
        hints: [
          "A closed system does not allow matter to enter or leave.",
          "Chemical reactions rearrange atoms; they do not create or destroy atoms.",
          "In an open system, gas can escape into the surroundings.",
        ],
        rubric: rubric([
          criterion("a", 1, "States law of conservation of mass."),
          criterion("b", 2, "Predicts no change and justifies using closed-system conservation of atoms/mass."),
          criterion("c", 2, "Explains that escaping gas lowers the measured mass of the open setup."),
        ]),
        commonErrors: [
          "Saying mass decreases because products are lighter.",
          "Ignoring the difference between closed and open systems.",
        ],
        workedSolution: [
          solutionPart("a", "The law is the law of conservation of mass."),
          solutionPart("b", "The balance reading should remain the same because no matter escapes from the closed flask and atoms are only rearranged."),
          solutionPart("c", "In an open flask, a gaseous product may escape. The balance then measures less mass remaining in the flask, even though total mass including escaped gas is conserved."),
        ],
      },
    ],
  },
  {
    topicCode: "1.2",
    title: "Acids, Bases and Salts",
    subtopic:
      "pH, indicators, neutralisation, common salts and everyday applications",
    mc: [
      {
        questionLatex: L`In the figure, five samples are tested using pH paper. Which sample is the strongest base?`,
        difficulty: 2,
        skillTags: ["ph_scale", "data_interpretation"],
        figure: phStripFigure,
        choices: ["P", "Q", "S", "T"],
        correctLetter: "C",
        rationales: {
          A: "P is neutral at pH 7, so it cannot be the strongest base.",
          B: "Q is strongly acidic at pH 2; a base must have pH greater than 7.",
          D: "T is mildly acidic at pH 5, while the strongest base has the highest pH.",
        },
        hints: [
          "On the pH scale, values above 7 are basic.",
          "A stronger base has a higher pH value.",
          "Compare the pH numbers printed for the samples.",
        ],
        solution: [
          step(1, "A base has pH greater than 7."),
          step(2, "Among the given samples, S has pH 12, the highest pH."),
          step(3, "Therefore S is the strongest base."),
        ],
      },
      {
        questionLatex: L`A colourless liquid gives brisk effervescence with sodium hydrogen carbonate, and the gas turns lime water milky. The liquid is most likely`,
        difficulty: 3,
        skillTags: ["acid_properties", "gas_test"],
        choices: ["distilled water", "sodium hydroxide solution", "dilute ethanoic acid", "soap solution"],
        correctLetter: "C",
        rationales: {
          A: "Water does not react with sodium hydrogen carbonate to give carbon dioxide.",
          B: "Sodium hydroxide is a base and will not give this acid-carbonate effervescence.",
          D: "Soap solution is basic; the described test points to an acid.",
        },
        hints: [
          "Carbonates and hydrogen carbonates release a gas with acids.",
          "The gas that turns lime water milky is carbon dioxide.",
          "Ethanoic acid is a weak acid but still reacts with sodium hydrogen carbonate.",
        ],
        solution: [
          step(1, "Effervescence with sodium hydrogen carbonate indicates release of $CO_2$."),
          step(2, "$CO_2$ turns lime water milky."),
          step(3, "Therefore the liquid is acidic; among the options, dilute ethanoic acid fits.", "CH_3COOH + NaHCO_3 \\rightarrow CH_3COONa + H_2O + CO_2"),
        ],
      },
      {
        questionLatex: L`Dry hydrogen chloride gas is passed over dry blue litmus paper and no colour change occurs. When the litmus paper is moistened, it turns red. The best explanation is that`,
        difficulty: 3,
        skillTags: ["acid_ionisation", "indicator_reasoning"],
        choices: [
          "$HCl$ shows acidic behaviour only in the presence of water",
          "dry litmus is not an indicator",
          "$HCl$ becomes a base when dry",
          "moist litmus contains sodium hydroxide",
        ],
        correctLetter: "A",
        rationales: {
          B: "Litmus is an indicator, but acid colour change requires ions in aqueous conditions.",
          C: "Dry $HCl$ does not become a base; it lacks ionisation in water.",
          D: "Moistening with water is enough; sodium hydroxide is not involved.",
        },
        hints: [
          "Acids furnish $H^+$ or $H_3O^+$ ions in water.",
          "Dry $HCl$ gas is not ionised like aqueous hydrochloric acid.",
          "The water is needed for acidic ions to affect litmus.",
        ],
        solution: [
          step(1, "Acidic behaviour of $HCl$ is due to ions formed in water."),
          step(2, "Dry $HCl$ does not produce hydrated hydrogen ions on dry litmus."),
          step(3, "Moist litmus supplies water, so $HCl$ ionises and turns blue litmus red."),
        ],
      },
      {
        questionLatex: L`A farmer adds slaked lime to a field after testing the soil. Which condition of the soil most likely required this treatment?`,
        difficulty: 2,
        skillTags: ["neutralisation", "soil_ph"],
        choices: ["too basic", "too acidic", "neutral", "rich in common salt"],
        correctLetter: "B",
        rationales: {
          A: "A basic substance would not be added to correct soil that is already too basic.",
          C: "Neutral soil does not require neutralisation by slaked lime.",
          D: "Common salt content is not corrected by the acid-base neutralisation described here.",
        },
        hints: [
          "Slaked lime is calcium hydroxide.",
          "Calcium hydroxide is basic.",
          "A base is used to neutralise excess acid.",
        ],
        solution: [
          step(1, "Slaked lime, $Ca(OH)_2$, is basic."),
          step(2, "A base is added when soil is too acidic."),
          step(3, "Therefore the soil was likely too acidic."),
        ],
      },
      {
        questionLatex: L`Plaster of Paris should be stored in moisture-proof containers because it`,
        difficulty: 2,
        skillTags: ["common_salts", "plaster_of_paris"],
        choices: [
          "reacts with carbon dioxide to form bleaching powder",
          "evaporates slowly in air",
          "turns into washing soda in moist air",
          "absorbs water and changes into gypsum",
        ],
        correctLetter: "D",
        rationales: {
          A: "Bleaching powder is prepared from slaked lime and chlorine, not from plaster of Paris.",
          B: "The issue is hydration, not evaporation.",
          C: "Washing soda is sodium carbonate decahydrate; plaster of Paris is a calcium sulphate compound.",
        },
        hints: [
          "Plaster of Paris sets when mixed with water.",
          "It is a hydrated/dehydrated calcium sulphate system.",
          "Moisture makes it form gypsum and harden.",
        ],
        solution: [
          step(1, "Plaster of Paris is calcium sulphate hemihydrate."),
          step(2, "It takes up water and forms gypsum, causing setting."),
          step(3, "So moisture-proof storage prevents premature hardening.", "CaSO_4\\cdot \\frac{1}{2}H_2O + \\frac{3}{2}H_2O \\rightarrow CaSO_4\\cdot 2H_2O"),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A sample has pH 3. State whether it is acidic, basic or neutral.`,
        difficulty: 1,
        skillTags: ["ph_scale"],
        parts: [part("a", "Classify the sample.", 1)],
        hints: [
          "Compare the pH with 7.",
          "Values below 7 are acidic.",
          "pH 3 is below 7.",
        ],
        rubric: rubric([criterion("a", 1, "Classifies pH 3 as acidic.")]),
        commonErrors: ["Calling lower pH weaker acid.", "Treating pH 7 as acidic."],
        workedSolution: [
          solutionPart("a", "The sample is acidic because its pH is less than 7."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Why should concentrated acid be added slowly to water while diluting, and not water to acid?`,
        difficulty: 3,
        skillTags: ["lab_safety", "dilution"],
        parts: [
          part("a", "Give the safety reason.", 1),
          part("b", "State the correct method.", 1),
        ],
        hints: [
          "Dilution of concentrated acid releases heat.",
          "A small amount of water on acid can boil and splash.",
          "The larger volume of water absorbs heat more safely.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains that dilution is highly exothermic and may cause splashing."),
          criterion("b", 1, "States acid should be added slowly to water with stirring."),
        ]),
        commonErrors: [
          "Saying the order does not matter.",
          "Only saying 'dangerous' without mentioning heat or splashing.",
        ],
        workedSolution: [
          solutionPart("a", "Dilution of concentrated acid is highly exothermic. If water is poured into acid, the small amount of water may heat suddenly and splash acid."),
          solutionPart("b", "Add acid slowly to water with constant stirring so the heat is absorbed by the larger amount of water."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student has baking soda, washing soda and bleaching powder. Write the chemical name and one use of any two of these substances.`,
        difficulty: 3,
        skillTags: ["common_salts", "everyday_chemistry"],
        parts: [
          part("a", "Give the chemical name of any two.", 2),
          part("b", "Give one correct use for each of the two chosen substances.", 2),
        ],
        hints: [
          "Recall the sodium salts and calcium compound from the common salts section.",
          "Baking soda is sodium hydrogen carbonate.",
          "Uses must match the salt selected.",
        ],
        rubric: rubric([
          criterion("a", 2, "Gives correct chemical names for any two substances."),
          criterion("b", 2, "Gives one valid use for each selected substance."),
        ]),
        commonErrors: [
          "Confusing baking soda with washing soda.",
          "Giving a use but no chemical name.",
        ],
        workedSolution: [
          solutionPart("a", "Examples: baking soda is sodium hydrogen carbonate, $NaHCO_3$; washing soda is sodium carbonate decahydrate, $Na_2CO_3\\cdot 10H_2O$; bleaching powder is calcium oxychloride, commonly written as $CaOCl_2$."),
          solutionPart("b", "Baking soda can be used in baking powder or as an antacid; washing soda is used for softening hard water or cleaning; bleaching powder is used for bleaching or disinfecting water."),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A solution turns red litmus blue. It is accidentally mixed with dilute hydrochloric acid until the final solution is neutral.`,
        difficulty: 3,
        skillTags: ["neutralisation", "salt_formation", "indicators"],
        parts: [
          part("a", "What is the nature of the original solution?", 1),
          part("b", "Name the type of reaction occurring during neutralisation.", 1),
          part("c", "If the original solution was sodium hydroxide, write the balanced equation.", 2),
          part("d", "State one everyday use of neutralisation.", 1),
        ],
        hints: [
          "Red litmus turning blue shows a base.",
          "Acid plus base gives salt and water.",
          "Use $NaOH$ and $HCl$ for the equation.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies the original solution as basic."),
          criterion("b", 1, "Names neutralisation or double displacement acid-base reaction."),
          criterion("c", 2, "Writes balanced equation with salt and water."),
          criterion("d", 1, "Gives a valid everyday example such as antacid, soil treatment or sting relief."),
        ]),
        commonErrors: [
          "Calling the original solution acidic because acid was added later.",
          "Writing hydrogen gas as a product of neutralisation.",
        ],
        workedSolution: [
          solutionPart("a", "The original solution is basic because it turns red litmus blue."),
          solutionPart("b", "The reaction is neutralisation."),
          solutionPart("c", "For sodium hydroxide and hydrochloric acid:", "NaOH + HCl \\rightarrow NaCl + H_2O"),
          solutionPart("d", "One use is taking antacids to neutralise excess acid in the stomach."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Five household samples are tested using pH paper as shown in the figure.`,
        difficulty: 3,
        skillTags: ["ph_scale", "case_based_reasoning", "application"],
        figure: phStripFigure,
        parts: [
          part("a", "Which sample is neutral?", 1),
          part("b", "Which sample would be most suitable for cleaning a greasy sink, assuming only pH is considered?", 1),
          part("c", "Which sample is more acidic, Q or T? Explain using pH.", 2),
          part("d", "A toothpaste is mildly basic. Which sample is closest to that behaviour?", 1),
        ],
        hints: [
          "Neutral solutions have pH 7.",
          "Basic solutions have pH above 7 and can help remove grease.",
          "Lower pH means stronger acidity.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies P as neutral."),
          criterion("b", 1, "Identifies S as the strongest base from the data."),
          criterion("c", 2, "Identifies Q and explains pH 2 is lower than pH 5."),
          criterion("d", 1, "Identifies R as mildly basic because pH 8 is just above 7."),
        ]),
        commonErrors: [
          "Treating a higher pH as more acidic.",
          "Choosing pH 12 as mildly basic.",
        ],
        workedSolution: [
          solutionPart("a", "P is neutral because it has pH 7."),
          solutionPart("b", "S is most suitable by pH alone because it is strongly basic at pH 12."),
          solutionPart("c", "Q is more acidic than T because Q has pH 2, which is lower than T's pH 5."),
          solutionPart("d", "R is closest to mildly basic behaviour because pH 8 is slightly above 7."),
        ],
      },
    ],
  },
  {
    topicCode: "1.3",
    title: "Metals and Non-metals",
    subtopic:
      "Reactivity, ionic compounds, corrosion, metallurgy and lab displacement evidence",
    mc: [
      {
        questionLatex: L`Metal X displaces metal Y from $YSO_4$ solution but does not displace metal Z from $ZSO_4$ solution. Which order of reactivity is supported?`,
        difficulty: 3,
        skillTags: ["reactivity_series", "displacement"],
        choices: ["$X > Y > Z$", "$Y > X > Z$", "$Y > Z > X$", "$Z > X > Y$"],
        correctLetter: "D",
        rationales: {
          A: "If X cannot displace Z, then X is not more reactive than Z.",
          B: "X displaces Y, so X must be more reactive than Y.",
          C: "Y cannot be above X because X displaced Y from its salt solution.",
        },
        hints: [
          "A metal displaces another metal only if it is more reactive.",
          "X displaces Y means $X > Y$.",
          "X does not displace Z means $Z > X$.",
        ],
        solution: [
          step(1, "Since X displaces Y, X is more reactive than Y."),
          step(2, "Since X does not displace Z, Z is more reactive than X."),
          step(3, "So the supported order is:", "Z > X > Y"),
        ],
      },
      {
        questionLatex: L`An ionic compound is solid at room temperature, has a high melting point and conducts electricity only when molten or dissolved in water. The best reason is that`,
        difficulty: 3,
        skillTags: ["ionic_compounds", "structure_property"],
        choices: [
          "ions are fixed in solid state but mobile in molten or aqueous state",
          "electrons move freely through the solid crystal",
          "molecules become magnetic when heated",
          "ionic compounds contain only non-metals",
        ],
        correctLetter: "A",
        rationales: {
          B: "Free electron movement explains metals better, not ionic solids.",
          C: "Magnetism is irrelevant to electrical conduction here.",
          D: "Ionic compounds usually form between metals and non-metals; the key is mobile ions.",
        },
        hints: [
          "Ask what carries charge in an ionic compound.",
          "In the solid crystal, ions cannot move freely.",
          "Molten or aqueous ionic compounds have mobile ions.",
        ],
        solution: [
          step(1, "Ionic compounds contain ions arranged in a crystal lattice."),
          step(2, "In solid state, ions are fixed in position and cannot carry charge through the solid."),
          step(3, "When molten or dissolved, ions can move and conduct electricity."),
        ],
      },
      {
        questionLatex: L`Aluminium articles resist corrosion better than freshly cut iron because aluminium`,
        difficulty: 2,
        skillTags: ["corrosion", "oxide_layer"],
        choices: [
          "does not react with oxygen at all",
          "forms a thin, protective oxide layer",
          "is below iron in the reactivity series",
          "is a non-metal in pure form",
        ],
        correctLetter: "B",
        rationales: {
          A: "Aluminium reacts with oxygen readily; the oxide layer then protects the metal.",
          C: "Aluminium is actually more reactive than iron, but its oxide coating protects it.",
          D: "Aluminium is a metal; its corrosion resistance comes from the protective oxide film.",
        },
        hints: [
          "Aluminium is reactive, but its surface changes quickly.",
          "The surface layer is not loose like rust.",
          "A protective oxide layer prevents deeper corrosion.",
        ],
        solution: [
          step(1, "Aluminium reacts with oxygen to form aluminium oxide on the surface."),
          step(2, "This oxide layer is thin, adherent and protective."),
          step(3, "It prevents further corrosion of the article."),
        ],
      },
      {
        questionLatex: L`A metal oxide reacts with both dilute hydrochloric acid and sodium hydroxide solution. The oxide is`,
        difficulty: 2,
        skillTags: ["amphoteric_oxide", "metal_oxides"],
        choices: ["acidic", "basic only", "amphoteric", "neutral only"],
        correctLetter: "C",
        rationales: {
          A: "An acidic oxide would react with bases but not typically with acids.",
          B: "A basic oxide would react with acids but not with bases.",
          D: "A neutral oxide would not show both acid and base reactions.",
        },
        hints: [
          "Some oxides can behave as both acidic and basic.",
          "Reaction with acid and base is the clue.",
          "Aluminium oxide and zinc oxide are common examples.",
        ],
        solution: [
          step(1, "A substance reacting with both acids and bases has dual behaviour."),
          step(2, "Such oxides are called amphoteric oxides."),
          step(3, "Examples include $Al_2O_3$ and $ZnO$."),
        ],
      },
      {
        questionLatex: L`Which pair of conditions will speed up rusting of iron most effectively?`,
        difficulty: 2,
        skillTags: ["rusting", "corrosion_prevention"],
        choices: [
          "dry air and oil coating",
          "moist air and salt",
          "dry nitrogen and paint",
          "vacuum and grease coating",
        ],
        correctLetter: "B",
        rationales: {
          A: "Dry air and oil coating reduce rusting by limiting water and oxygen contact.",
          C: "Dry nitrogen and paint prevent contact with oxygen and moisture.",
          D: "Vacuum and grease coating remove or block the reactants needed for rusting.",
        },
        hints: [
          "Rusting needs oxygen and water.",
          "Salt water increases corrosion.",
          "Protective coatings slow rusting.",
        ],
        solution: [
          step(1, "Rusting of iron requires both moisture and oxygen."),
          step(2, "Salt increases the rate of corrosion by improving ionic conduction in water."),
          step(3, "Therefore moist air and salt speed up rusting most effectively."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name a metal that is liquid at room temperature.`,
        difficulty: 1,
        skillTags: ["metal_properties"],
        parts: [part("a", "Name the metal.", 1)],
        hints: [
          "Recall the exception among common metals.",
          "It is used in thermometers historically.",
          "The metal is mercury.",
        ],
        rubric: rubric([criterion("a", 1, "Names mercury.")]),
        commonErrors: ["Naming bromine, which is a non-metal.", "Naming gallium without context of near room temperature."],
        workedSolution: [solutionPart("a", "Mercury is a metal that is liquid at room temperature.")],
      },
      {
        responseType: "saq",
        questionLatex: L`Why is sodium stored under kerosene oil?`,
        difficulty: 2,
        skillTags: ["reactive_metals", "lab_safety"],
        parts: [
          part("a", "State the property of sodium that makes this necessary.", 1),
          part("b", "Explain how kerosene helps.", 1),
        ],
        hints: [
          "Sodium reacts vigorously with water.",
          "It also reacts with oxygen in air.",
          "Kerosene prevents contact with air and moisture.",
        ],
        rubric: rubric([
          criterion("a", 1, "States sodium is highly reactive with air/moisture/water."),
          criterion("b", 1, "Explains kerosene prevents contact with air and water."),
        ]),
        commonErrors: [
          "Saying kerosene makes sodium less reactive chemically.",
          "Mentioning only water but not contact protection.",
        ],
        workedSolution: [
          solutionPart("a", "Sodium is highly reactive and reacts vigorously with water and oxygen/moisture in air."),
          solutionPart("b", "Kerosene keeps sodium away from air and water, preventing dangerous reaction."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why ionic compounds usually have high melting points and conduct electricity in molten state.`,
        difficulty: 3,
        skillTags: ["ionic_compounds", "structure_property"],
        parts: [
          part("a", "Give the reason for high melting point.", 1),
          part("b", "Give the reason for conduction in molten state.", 1),
        ],
        hints: [
          "Think about forces between oppositely charged ions.",
          "High melting point means a lot of energy is needed to separate particles.",
          "Conduction requires mobile charged particles.",
        ],
        rubric: rubric([
          criterion("a", 1, "Mentions strong electrostatic attraction between ions."),
          criterion("b", 1, "Mentions mobile ions in molten state carry current."),
        ]),
        commonErrors: [
          "Explaining conduction by free electrons.",
          "Saying molecules melt without mentioning ions.",
        ],
        workedSolution: [
          solutionPart("a", "Ionic compounds have strong electrostatic forces of attraction between oppositely charged ions, so high energy is required to melt them."),
          solutionPart("b", "In molten state the ions become mobile and carry electric current."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student performs displacement tests shown in the figure.`,
        difficulty: 4,
        skillTags: ["reactivity_series", "experimental_inference", "displacement"],
        figure: reactivityTestFigure,
        parts: [
          part("a", "From the first tube, compare the reactivity of zinc and iron.", 1),
          part("b", "From the third tube, what can be inferred about copper and iron?", 1),
          part("c", "Write the balanced equation for the second tube.", 2),
          part("d", "Arrange Al, Zn, Fe and Cu in decreasing reactivity using the figure.", 2),
        ],
        hints: [
          "A coating or deposit means displacement has occurred.",
          "No visible change means the strip metal could not displace the metal ion.",
          "Use all four observations to build the order.",
        ],
        rubric: rubric([
          criterion("a", 1, "Infers zinc is more reactive than iron."),
          criterion("b", 1, "Infers copper is less reactive than iron."),
          criterion("c", 2, "Writes $Fe + CuSO_4 \\rightarrow FeSO_4 + Cu$."),
          criterion("d", 2, "Gives decreasing order $Al > Zn > Fe > Cu$ from observations."),
        ]),
        commonErrors: [
          "Treating no visible change as no substances present.",
          "Arranging by colour of deposit instead of displacement logic.",
        ],
        workedSolution: [
          solutionPart("a", "Zinc displaces iron from iron sulphate, so zinc is more reactive than iron."),
          solutionPart("b", "Copper does not displace iron from iron sulphate, so copper is less reactive than iron."),
          solutionPart("c", "The brown deposit in the second tube is copper:", "Fe + CuSO_4 \\rightarrow FeSO_4 + Cu"),
          solutionPart("d", "Aluminium displaces zinc, zinc displaces iron, and iron displaces copper. Therefore:", "Al > Zn > Fe > Cu"),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Iron articles often rust in coastal areas faster than in dry inland areas.`,
        difficulty: 3,
        skillTags: ["rusting", "corrosion_prevention", "application"],
        parts: [
          part("a", "Name the brown flaky substance formed on iron.", 1),
          part("b", "Why do coastal conditions increase rusting?", 2),
          part("c", "State two methods to prevent rusting.", 2),
        ],
        hints: [
          "Rusting needs oxygen and water.",
          "Coastal air contains moisture and salts.",
          "Prevention methods block air/water or protect by another metal.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names rust or hydrated iron(III) oxide."),
          criterion("b", 2, "Explains moisture and salt increase corrosion rate."),
          criterion("c", 2, "States two valid methods such as painting, oiling, greasing, galvanising, alloying or plating."),
        ]),
        commonErrors: [
          "Saying only sunlight causes rusting.",
          "Giving cleaning as a prevention method without a protective layer.",
        ],
        workedSolution: [
          solutionPart("a", "The brown flaky substance is rust, hydrated iron(III) oxide."),
          solutionPart("b", "Coastal air is moist and contains salts. Moisture is needed for rusting, and salts increase the rate of corrosion."),
          solutionPart("c", "Rusting can be prevented by painting, oiling, greasing, galvanising, electroplating or making stainless steel alloys."),
        ],
      },
    ],
  },
  {
    topicCode: "1.4",
    title: "Carbon and Its Compounds",
    subtopic:
      "Covalent bonding, homologous series, functional groups and carbon compound reactions",
    mc: [
      {
        questionLatex: L`A hydrocarbon decolourises bromine water quickly without burning. This observation most directly shows that the hydrocarbon is`,
        difficulty: 2,
        skillTags: ["unsaturation", "addition_reaction"],
        choices: ["saturated", "an alcohol", "a carboxylic acid", "unsaturated"],
        correctLetter: "D",
        rationales: {
          A: "Saturated hydrocarbons generally do not decolourise bromine water by addition under these conditions.",
          B: "Alcohol is a functional group, but the observation tests carbon-carbon multiple bonds.",
          C: "Carboxylic acids are identified by acidity tests such as reaction with carbonate.",
        },
        hints: [
          "Bromine water is a common test for carbon-carbon double or triple bonds.",
          "Decolourisation happens by addition across a multiple bond.",
          "Multiple bond means unsaturated.",
        ],
        solution: [
          step(1, "Bromine adds across carbon-carbon double or triple bonds."),
          step(2, "This removes the colour of bromine water."),
          step(3, "Therefore the hydrocarbon is unsaturated."),
        ],
      },
      {
        questionLatex: L`Which compound in the figure would react with sodium hydrogen carbonate to release carbon dioxide?`,
        difficulty: 3,
        skillTags: ["functional_groups", "acid_carbonate_test"],
        figure: carbonStructureFigure,
        choices: ["P", "Q", "R", "Both P and R"],
        correctLetter: "B",
        rationales: {
          A: "P is ethanol, an alcohol; it does not show the acid-carbonate effervescence.",
          C: "R is ethene, an unsaturated hydrocarbon, not a carboxylic acid.",
          D: "Neither ethanol nor ethene reacts with sodium hydrogen carbonate to release carbon dioxide.",
        },
        hints: [
          "Sodium hydrogen carbonate gives carbon dioxide with acids.",
          "Look for the $-COOH$ group.",
          "Compound Q contains the carboxylic acid group.",
        ],
        solution: [
          step(1, "The $-COOH$ group identifies a carboxylic acid."),
          step(2, "Q is $CH_3COOH$, ethanoic acid."),
          step(3, "Ethanoic acid reacts with sodium hydrogen carbonate to release carbon dioxide.", "CH_3COOH + NaHCO_3 \\rightarrow CH_3COONa + H_2O + CO_2"),
        ],
      },
      {
        questionLatex: L`Two successive members of a homologous series differ by`,
        difficulty: 2,
        skillTags: ["homologous_series"],
        choices: ["$CH_2$ and 14 u", "$CO_2$ and 44 u", "$H_2O$ and 18 u", "$O_2$ and 32 u"],
        correctLetter: "A",
        rationales: {
          B: "Carbon dioxide is not the repeating unit in a homologous series.",
          C: "Water is not the repeating unit in a homologous series.",
          D: "Oxygen gas is not the repeating unit in carbon chains.",
        },
        hints: [
          "A homologous series has a gradual change in molecular mass.",
          "Each next member adds one carbon and two hydrogens.",
          "The mass difference is $12 + 2 = 14$ u.",
        ],
        solution: [
          step(1, "Consecutive members differ by one $CH_2$ group."),
          step(2, "The mass of $CH_2$ is $12 + 2(1) = 14$ u."),
          step(3, "So the difference is $CH_2$ and 14 u."),
        ],
      },
      {
        questionLatex: L`Which formula represents an alkyne?`,
        difficulty: 2,
        skillTags: ["nomenclature", "hydrocarbon_formulae"],
        choices: ["$C_2H_6$", "$C_3H_8$", "$C_2H_2$", "$C_2H_5OH$"],
        correctLetter: "C",
        rationales: {
          A: "$C_2H_6$ is ethane, an alkane with only single carbon-carbon bonds.",
          B: "$C_3H_8$ is propane, an alkane that follows $C_nH_{2n+2}$.",
          D: "$C_2H_5OH$ is ethanol, an alcohol, not a hydrocarbon alkyne.",
        },
        hints: [
          "Alkynes contain a carbon-carbon triple bond.",
          "Their general formula is $C_nH_{2n-2}$.",
          "For $n=2$, the formula is $C_2H_2$.",
        ],
        solution: [
          step(1, "Alkynes follow the general formula $C_nH_{2n-2}$."),
          step(2, "For $n=2$, $H = 2(2)-2 = 2$."),
          step(3, "So $C_2H_2$ is an alkyne."),
        ],
      },
      {
        questionLatex: L`A carbon compound burns with a yellow sooty flame. Which inference is most reasonable?`,
        difficulty: 3,
        skillTags: ["combustion", "saturated_unsaturated"],
        choices: [
          "It is certainly pure methane.",
          "It contains no carbon.",
          "It may be an unsaturated compound or have a high carbon content.",
          "It must be a strong acid.",
        ],
        correctLetter: "C",
        rationales: {
          A: "Methane usually burns with a cleaner blue flame in sufficient oxygen.",
          B: "A sooty flame indicates carbon particles from incomplete combustion.",
          D: "Flame soot does not prove acidic nature.",
        },
        hints: [
          "Soot is unburnt carbon.",
          "Unsaturated compounds often burn with a sooty flame.",
          "Do not infer acid-base nature from flame alone.",
        ],
        solution: [
          step(1, "A yellow sooty flame indicates incomplete combustion and unburnt carbon particles."),
          step(2, "Unsaturated compounds and compounds with high carbon content commonly show this."),
          step(3, "Therefore option C is the most reasonable inference."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the next member of the homologous series after ethane, $C_2H_6$.`,
        difficulty: 1,
        skillTags: ["homologous_series"],
        parts: [part("a", "Write the next member.", 1)],
        hints: [
          "Ethane is an alkane.",
          "Successive members differ by $CH_2$.",
          "Add $CH_2$ to $C_2H_6$.",
        ],
        rubric: rubric([criterion("a", 1, "Writes propane, $C_3H_8$.")]),
        commonErrors: ["Adding only carbon but not two hydrogens.", "Writing ethene instead of the next alkane."],
        workedSolution: [
          solutionPart("a", "The next member is propane, because adding $CH_2$ to $C_2H_6$ gives $C_3H_8$."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Why do most covalent compounds have low melting points and poor electrical conductivity?`,
        difficulty: 3,
        skillTags: ["covalent_bonding", "structure_property"],
        parts: [
          part("a", "Explain the low melting point.", 1),
          part("b", "Explain poor conductivity.", 1),
        ],
        hints: [
          "Covalent compounds are usually made of molecules.",
          "The forces between molecules are relatively weak.",
          "They generally lack free ions or electrons.",
        ],
        rubric: rubric([
          criterion("a", 1, "Mentions weak intermolecular forces between molecules."),
          criterion("b", 1, "Mentions absence of mobile charged particles."),
        ]),
        commonErrors: [
          "Saying covalent bonds themselves are always weak.",
          "Explaining conductivity by magnetic effects.",
        ],
        workedSolution: [
          solutionPart("a", "Most covalent compounds consist of molecules with relatively weak forces between molecules, so less heat is needed to melt them."),
          solutionPart("b", "They usually do not have free ions or free electrons, so they conduct electricity poorly."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Distinguish ethanol and ethanoic acid using two chemical tests.`,
        difficulty: 3,
        skillTags: ["functional_groups", "chemical_tests"],
        parts: [
          part("a", "State one indicator-based test.", 1),
          part("b", "State one sodium hydrogen carbonate test.", 2),
        ],
        hints: [
          "Ethanoic acid is acidic; ethanol is nearly neutral.",
          "Acids affect blue litmus.",
          "Carboxylic acids react with sodium hydrogen carbonate to give $CO_2$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Mentions ethanoic acid turns blue litmus red while ethanol does not."),
          criterion("b", 2, "Mentions ethanoic acid gives effervescence of $CO_2$ with $NaHCO_3$; ethanol does not."),
        ]),
        commonErrors: [
          "Using smell alone as a confirmatory chemical test.",
          "Saying ethanol gives carbon dioxide with sodium hydrogen carbonate.",
        ],
        workedSolution: [
          solutionPart("a", "Ethanoic acid turns blue litmus red, while ethanol does not show acidic litmus change."),
          solutionPart("b", "Ethanoic acid reacts with sodium hydrogen carbonate to give brisk effervescence of carbon dioxide; ethanol does not.", "CH_3COOH + NaHCO_3 \\rightarrow CH_3COONa + H_2O + CO_2"),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A compound has molecular formula $C_3H_6$ and decolourises bromine water.`,
        difficulty: 3,
        skillTags: ["unsaturation", "nomenclature", "addition_reaction"],
        parts: [
          part("a", "Is the compound saturated or unsaturated? Give a reason.", 2),
          part("b", "Name one possible compound with this formula.", 1),
          part("c", "What type of reaction occurs with bromine?", 1),
          part("d", "Write the general formula of the homologous series to which propene belongs.", 1),
        ],
        hints: [
          "Compare $C_3H_6$ with alkane and alkene formulae.",
          "Bromine water decolourisation is evidence of a multiple bond.",
          "Propene belongs to the alkene series.",
        ],
        rubric: rubric([
          criterion("a", 2, "Identifies unsaturated and supports using bromine decolourisation or alkene formula."),
          criterion("b", 1, "Names propene."),
          criterion("c", 1, "States addition reaction."),
          criterion("d", 1, "Writes $C_nH_{2n}$."),
        ]),
        commonErrors: [
          "Calling it propane because it has three carbon atoms.",
          "Writing substitution instead of addition for bromine across a double bond.",
        ],
        workedSolution: [
          solutionPart("a", "The compound is unsaturated because it decolourises bromine water, showing the presence of a carbon-carbon multiple bond."),
          solutionPart("b", "One possible compound is propene."),
          solutionPart("c", "It undergoes an addition reaction with bromine."),
          solutionPart("d", "Propene belongs to the alkene homologous series:", "C_nH_{2n}"),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The figure shows three carbon compounds P, Q and R. A student tests each with blue litmus, sodium hydrogen carbonate and bromine water.`,
        difficulty: 4,
        skillTags: ["functional_groups", "case_based_reasoning", "chemical_tests"],
        figure: carbonStructureFigure,
        parts: [
          part("a", "Which compound is an alcohol?", 1),
          part("b", "Which compound turns blue litmus red?", 1),
          part("c", "Which compound decolourises bromine water? Give the reason.", 2),
          part("d", "Write the IUPAC name of Q.", 1),
        ],
        hints: [
          "Identify $-OH$, $-COOH$ and carbon-carbon double bond separately.",
          "Only the carboxylic acid group gives acid behaviour here.",
          "Ethene has a carbon-carbon double bond.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies P as the alcohol."),
          criterion("b", 1, "Identifies Q as acidic."),
          criterion("c", 2, "Identifies R and explains presence of double bond/unsaturation."),
          criterion("d", 1, "Names Q as ethanoic acid."),
        ]),
        commonErrors: [
          "Treating every $-OH$ containing formula as an acid.",
          "Missing the double bond in ethene.",
        ],
        workedSolution: [
          solutionPart("a", "P is ethanol, an alcohol."),
          solutionPart("b", "Q is ethanoic acid, so it turns blue litmus red."),
          solutionPart("c", "R decolourises bromine water because it is ethene and contains a carbon-carbon double bond."),
          solutionPart("d", "Q is named ethanoic acid."),
        ],
      },
    ],
  },
  {
    topicCode: "1.5",
    title: "Integrated Practical Chemistry",
    subtopic:
      "Practical observations across reactions, acids-bases, metals and carbon compounds",
    mc: [
      {
        questionLatex: L`Equal amounts of soap solution are shaken with two water samples as shown. Which inference is most reasonable?`,
        difficulty: 2,
        skillTags: ["soap_detergent", "practical_observation"],
        figure: soapTestFigure,
        choices: [
          "Sample A is harder than sample B.",
          "Sample B is likely hard water.",
          "Both samples are equally soft.",
          "Soap works by producing carbon dioxide.",
        ],
        correctLetter: "B",
        rationales: {
          A: "Sample A forms more foam and no clear scum layer, which is more typical of soft water.",
          C: "The difference in foam and scum shows the samples are not behaving equally.",
          D: "Soap cleaning is not based on carbon dioxide production.",
        },
        hints: [
          "Hard water forms scum with soap.",
          "Soft water gives lather more easily.",
          "Compare foam and scum in the two tubes.",
        ],
        solution: [
          step(1, "Soap forms more lather in soft water."),
          step(2, "Hard water forms scum and less lather."),
          step(3, "Sample B shows scum and little foam, so it is likely hard water."),
        ],
      },
      {
        questionLatex: L`A student wants to distinguish dilute hydrochloric acid from ethanol using the safest single chemical test from the options. Which should be chosen?`,
        difficulty: 3,
        skillTags: ["test_selection", "acid_properties"],
        choices: [
          "Add sodium hydrogen carbonate and test the gas with lime water.",
          "Heat both liquids strongly until they evaporate.",
          "Smell both samples directly.",
          "Add copper sulphate solution and look for a metal deposit.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Heating unknown liquids strongly is not the safest or most diagnostic test here.",
          C: "Direct smelling is unsafe and not a reliable chemical test.",
          D: "Copper sulphate displacement tests metal reactivity, not acid versus alcohol.",
        },
        hints: [
          "Acids react with hydrogen carbonates.",
          "The gas released can be confirmed using lime water.",
          "Ethanol does not give this acid-carbonate reaction.",
        ],
        solution: [
          step(1, "Hydrochloric acid reacts with sodium hydrogen carbonate to release carbon dioxide."),
          step(2, "$CO_2$ turns lime water milky."),
          step(3, "Ethanol will not show this reaction, so the test distinguishes them safely."),
        ],
      },
      {
        questionLatex: L`A magnesium ribbon burns in air to form a white ash. The ash is added to water and tested with red litmus. Which sequence is correct?`,
        difficulty: 3,
        skillTags: ["metal_oxide", "basic_oxide", "indicator"],
        choices: [
          "Magnesium oxide forms; solution turns red litmus blue.",
          "Magnesium chloride forms; solution turns blue litmus red.",
          "Carbon dioxide forms; lime water turns milky.",
          "Magnesium sulphate forms; no indicator change is possible.",
        ],
        correctLetter: "A",
        rationales: {
          B: "No chlorine source is present during burning in air.",
          C: "Magnesium burning in air forms magnesium oxide, not carbon dioxide.",
          D: "No sulphate source is present, and magnesium oxide is basic.",
        },
        hints: [
          "Burning magnesium reacts with oxygen.",
          "Most metal oxides are basic.",
          "A basic solution turns red litmus blue.",
        ],
        solution: [
          step(1, "Magnesium burns in oxygen to form magnesium oxide."),
          step(2, "Magnesium oxide forms magnesium hydroxide with water to a small extent."),
          step(3, "The basic solution turns red litmus blue.", "2Mg + O_2 \\rightarrow 2MgO"),
        ],
      },
      {
        questionLatex: L`A student records: "On adding solution X to solution Y, an insoluble white solid forms. The test tube becomes slightly warm." Which conclusion is safest?`,
        difficulty: 3,
        skillTags: ["evidence_based_inference", "practical_reasoning"],
        choices: [
          "Only a precipitation reaction occurred; heat observation is impossible.",
          "No chemical reaction occurred because both reactants were solutions.",
          "A reaction occurred with precipitate formation, and it may also be exothermic.",
          "The white solid must be sodium chloride.",
        ],
        correctLetter: "C",
        rationales: {
          A: "A reaction can form a precipitate and also release heat; the observations should both be considered.",
          B: "Two solutions can react chemically, especially by ion exchange.",
          D: "Sodium chloride is soluble in water, so it is not a sensible identification for an insoluble white solid.",
        },
        hints: [
          "Do not ignore either observation.",
          "An insoluble solid from solutions indicates precipitation.",
          "A warmer test tube suggests heat release.",
        ],
        solution: [
          step(1, "The insoluble white solid shows precipitate formation."),
          step(2, "The warming suggests the reaction may release heat."),
          step(3, "The safest conclusion is that a precipitation reaction occurred and may be exothermic."),
        ],
      },
      {
        questionLatex: L`Which investigation plan best tests whether concentration of acid affects the rate of reaction with zinc granules?`,
        difficulty: 4,
        skillTags: ["experimental_design", "variables"],
        choices: [
          "Use different acids, different masses of zinc and different temperatures.",
          "Use only one acid concentration and record the smell.",
          "Use different metals and keep acid concentration unknown.",
          "Use the same acid at different concentrations, equal zinc mass, equal temperature and measure gas volume with time.",
        ],
        correctLetter: "D",
        rationales: {
          A: "Changing many variables at once prevents a fair test of concentration.",
          B: "One concentration gives no comparison, and smell is not a proper rate measurement.",
          C: "Changing the metal changes reactivity, so acid concentration is not isolated.",
        },
        hints: [
          "Only the independent variable should change.",
          "Keep mass of zinc and temperature controlled.",
          "Gas volume per time gives a measurable rate.",
        ],
        solution: [
          step(1, "To test acid concentration, concentration must be the independent variable."),
          step(2, "Other variables such as zinc mass, surface area and temperature should be controlled."),
          step(3, "Measuring gas volume over time gives reaction rate data."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write one observation when ethanoic acid is added to sodium hydrogen carbonate.`,
        difficulty: 1,
        skillTags: ["acid_carbonate_test", "practical_observation"],
        parts: [part("a", "State one observation.", 1)],
        hints: [
          "A gas is released.",
          "The gas is carbon dioxide.",
          "The visible observation is bubbling or effervescence.",
        ],
        rubric: rubric([criterion("a", 1, "States brisk effervescence/bubbling due to carbon dioxide.")]),
        commonErrors: ["Saying a brown gas is produced.", "Saying no reaction because ethanoic acid is weak."],
        workedSolution: [
          solutionPart("a", "Brisk effervescence is observed because carbon dioxide gas is released."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student has four unknown samples: dilute acid, dilute base, salt solution and ethanol. Suggest a short test sequence to identify the acid and the base.`,
        difficulty: 3,
        skillTags: ["test_sequence", "indicators", "acid_base"],
        parts: [
          part("a", "State a suitable first test.", 1),
          part("b", "Explain how the acid and base will be identified.", 2),
        ],
        hints: [
          "Universal indicator or litmus can separate acid and base.",
          "Acid has pH below 7 and turns blue litmus red.",
          "Base has pH above 7 and turns red litmus blue.",
        ],
        rubric: rubric([
          criterion("a", 1, "Chooses a suitable indicator such as universal indicator or litmus."),
          criterion("b", 2, "Correctly identifies acid and base from colour/pH or litmus changes."),
        ]),
        commonErrors: [
          "Using smell as the first test.",
          "Trying sodium hydrogen carbonate on all samples without an indicator plan.",
        ],
        workedSolution: [
          solutionPart("a", "Use universal indicator or red/blue litmus paper as the first test."),
          solutionPart("b", "The acid gives pH below 7 or turns blue litmus red. The base gives pH above 7 or turns red litmus blue. The salt solution and ethanol should not show these strong acid/base changes."),
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Classify the following reactions and give one reason for each: (i) $2Mg + O_2 \rightarrow 2MgO$ (ii) $AgNO_3 + NaCl \rightarrow AgCl + NaNO_3$.`,
        difficulty: 3,
        skillTags: ["reaction_classification", "balanced_equations"],
        parts: [
          part("a", "Classify reaction (i) with reason.", 2),
          part("b", "Classify reaction (ii) with reason.", 2),
        ],
        hints: [
          "In (i), two reactants form one main product.",
          "In (ii), ions exchange partners.",
          "$AgCl$ is insoluble and forms a precipitate.",
        ],
        rubric: rubric([
          criterion("a", 2, "Classifies as combination reaction and supports with reactants combining."),
          criterion("b", 2, "Classifies as double displacement/precipitation and supports with ion exchange/AgCl precipitate."),
        ]),
        commonErrors: [
          "Calling reaction (i) displacement because magnesium is a metal.",
          "Ignoring the precipitate in reaction (ii).",
        ],
        workedSolution: [
          solutionPart("a", "Reaction (i) is a combination reaction because magnesium and oxygen combine to form magnesium oxide."),
          solutionPart("b", "Reaction (ii) is a double displacement precipitation reaction because ions exchange partners and insoluble silver chloride forms.", "AgNO_3 + NaCl \\rightarrow AgCl + NaNO_3"),
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A cleaning powder label says: "Contains sodium hydrogen carbonate. Reacts with acids to release a gas. Mildly basic."`,
        difficulty: 3,
        skillTags: ["common_salts", "acid_base_application", "balanced_equations"],
        parts: [
          part("a", "Write the formula of sodium hydrogen carbonate.", 1),
          part("b", "Write a balanced equation for its reaction with dilute hydrochloric acid.", 2),
          part("c", "How can the gas be confirmed?", 1),
          part("d", "Why is it safer to call the powder mildly basic rather than strongly basic?", 1),
        ],
        hints: [
          "Sodium hydrogen carbonate is baking soda.",
          "Acid plus hydrogen carbonate gives salt, water and carbon dioxide.",
          "Carbon dioxide turns lime water milky.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $NaHCO_3$."),
          criterion("b", 2, "Writes balanced reaction with $HCl$."),
          criterion("c", 1, "States lime water test for $CO_2$."),
          criterion("d", 1, "Explains mild basicity means lower caustic/corrosive effect than strong bases."),
        ]),
        commonErrors: [
          "Writing washing soda formula instead of baking soda.",
          "Writing hydrogen gas instead of carbon dioxide.",
        ],
        workedSolution: [
          solutionPart("a", "The formula is:", "NaHCO_3"),
          solutionPart("b", "With dilute hydrochloric acid:", "NaHCO_3 + HCl \\rightarrow NaCl + H_2O + CO_2"),
          solutionPart("c", "The gas can be passed through lime water; $CO_2$ turns lime water milky."),
          solutionPart("d", "Sodium hydrogen carbonate is only mildly basic, so it is less caustic than strong bases such as sodium hydroxide."),
        ],
      },
      {
        responseType: "case",
        questionLatex: L`At four practical stations, students record these observations: Station I gives pH 2; Station II forms a brown deposit on an iron nail in blue solution; Station III decolourises bromine water; Station IV forms scum with soap solution.`,
        difficulty: 4,
        skillTags: ["integrated_practical_reasoning", "case_based_reasoning"],
        parts: [
          part("a", "Which station contains an acidic sample?", 1),
          part("b", "At Station II, identify the brown deposit.", 1),
          part("c", "What does Station III show about the carbon compound?", 1),
          part("d", "What does Station IV suggest about the water sample?", 1),
          part("e", "Write the balanced equation for the reaction most likely occurring at Station II.", 2),
        ],
        hints: [
          "Use each observation independently.",
          "Blue copper sulphate with iron gives copper deposit.",
          "Bromine water decolourisation indicates unsaturation.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies Station I as acidic."),
          criterion("b", 1, "Identifies copper as the brown deposit."),
          criterion("c", 1, "Infers unsaturation/multiple bond."),
          criterion("d", 1, "Infers hard water due to scum with soap."),
          criterion("e", 2, "Writes balanced displacement equation."),
        ]),
        commonErrors: [
          "Using one observation to answer all stations.",
          "Calling the brown deposit rust.",
          "Saying bromine water decolourisation proves acidity.",
        ],
        workedSolution: [
          solutionPart("a", "Station I contains an acidic sample because pH 2 is below 7."),
          solutionPart("b", "The brown deposit at Station II is copper."),
          solutionPart("c", "Station III shows the carbon compound is unsaturated."),
          solutionPart("d", "Station IV suggests hard water because soap forms scum."),
          solutionPart("e", "The likely displacement reaction is:", "Fe + CuSO_4 \\rightarrow FeSO_4 + Cu"),
        ],
      },
    ],
  },
];

export const chemicalSubstancesNatureBehaviourTopics: Topic[] =
  topicSeeds.map(makeTopic);
