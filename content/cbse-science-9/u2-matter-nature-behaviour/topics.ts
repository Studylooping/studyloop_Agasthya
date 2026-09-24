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

const COURSE = "cbse-science-9";
const UNIT = "u2-matter-nature-behaviour";
const VERSION = "0.1.4";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

type McLetter = (typeof LETTERS)[number];
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
  rationale?: string;
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
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body,
  }));
}

function part(
  letter: string,
  promptMarkdown: string,
  points: number,
): FrqPart {
  return { letter, promptMarkdown, points };
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

function calibrateMatterDifficulty({
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
  const isRecall =
    /\b(name|identify|which technique|which process|which law|which model|which pair|is called|best described)\b/.test(
      text,
    ) && !/\bcalculate|explain|justify|infer|conclude|predict|data|graph|case\b/.test(text);

  if (kind === "mc_single" && difficulty >= 4 && isRecall) {
    return 3;
  }

  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ?? "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the substance, particle, or calculation clue before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        "incorrect_cbse_class9_matter_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMatterDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_a_keyword_without_checking_the_evidence_or_units",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMatterDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_term_without_supporting_it_with_particle_or_lab_evidence",
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

const dispersionEvidenceFigure: ItemFigure = {
  type: "svg",
  title: "Three mixture samples tested in light",
  description:
    "Three beakers are shown with observations about clarity, light path and settling.",
  svg: `<svg viewBox="0 0 660 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="300" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="110" y="38" text-anchor="middle" font-size="18" font-weight="700">Sample P</text>
    <text x="330" y="38" text-anchor="middle" font-size="18" font-weight="700">Sample Q</text>
    <text x="550" y="38" text-anchor="middle" font-size="18" font-weight="700">Sample R</text>
  </g>
  <g stroke="#334155" stroke-width="3" fill="none">
    <path d="M55 70 L80 235 L140 235 L165 70"/>
    <path d="M275 70 L300 235 L360 235 L385 70"/>
    <path d="M495 70 L520 235 L580 235 L605 70"/>
  </g>
  <path d="M78 130 H143 L128 222 H92 Z" fill="#dbeafe" opacity="0.85"/>
  <path d="M298 130 H363 L348 222 H312 Z" fill="#fde68a" opacity="0.9"/>
  <path d="M518 130 H583 L568 222 H532 Z" fill="#cbd5e1" opacity="0.9"/>
  <path d="M42 176 H178" stroke="#f59e0b" stroke-width="3"/>
  <path d="M262 176 H398" stroke="#f59e0b" stroke-width="3"/>
  <path d="M482 176 H618" stroke="#f59e0b" stroke-width="3" stroke-dasharray="7 6"/>
  <path d="M305 213 H355" stroke="#92400e" stroke-width="6" stroke-linecap="round"/>
  <g font-family="Arial, sans-serif" fill="#334155" font-size="14">
    <text x="110" y="264" text-anchor="middle">clear; no visible light path</text>
    <text x="330" y="264" text-anchor="middle">particles settle on standing</text>
    <text x="550" y="264" text-anchor="middle">light path visible; no settling</text>
  </g>
</svg>`,
};

const solubilityGraphFigure: ItemFigure = {
  type: "svg",
  title: "Solubility of a salt in water",
  description:
    "A line graph gives solubility in grams per 100 g water at different temperatures.",
  svg: `<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="300" x2="570" y2="300"/>
    <line x1="90" y1="250" x2="570" y2="250"/>
    <line x1="90" y1="200" x2="570" y2="200"/>
    <line x1="90" y1="150" x2="570" y2="150"/>
    <line x1="90" y1="100" x2="570" y2="100"/>
    <line x1="90" y1="50" x2="570" y2="50"/>
    <line x1="110" y1="50" x2="110" y2="300"/>
    <line x1="190" y1="50" x2="190" y2="300"/>
    <line x1="270" y1="50" x2="270" y2="300"/>
    <line x1="350" y1="50" x2="350" y2="300"/>
    <line x1="430" y1="50" x2="430" y2="300"/>
    <line x1="510" y1="50" x2="510" y2="300"/>
  </g>
  <line x1="90" y1="300" x2="590" y2="300" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="300" x2="90" y2="35" stroke="#334155" stroke-width="2"/>
  <path d="M110 212.5 L190 187.5 L270 175 L350 150 L430 100 L510 62.5" fill="none" stroke="#2563eb" stroke-width="4"/>
  <g fill="#2563eb">
    <circle cx="110" cy="212.5" r="5"/><circle cx="190" cy="187.5" r="5"/><circle cx="270" cy="175" r="5"/>
    <circle cx="350" cy="150" r="5"/><circle cx="430" cy="100" r="5"/><circle cx="510" cy="62.5" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="13">
    <text x="110" y="322" text-anchor="middle">20</text>
    <text x="190" y="322" text-anchor="middle">30</text>
    <text x="270" y="322" text-anchor="middle">40</text>
    <text x="350" y="322" text-anchor="middle">50</text>
    <text x="430" y="322" text-anchor="middle">60</text>
    <text x="510" y="322" text-anchor="middle">70</text>
    <text x="70" y="304" text-anchor="end">0</text>
    <text x="70" y="254" text-anchor="end">20</text>
    <text x="70" y="204" text-anchor="end">40</text>
    <text x="70" y="154" text-anchor="end">60</text>
    <text x="70" y="104" text-anchor="end">80</text>
    <text x="70" y="54" text-anchor="end">100</text>
    <text x="330" y="355" text-anchor="middle">Temperature in degree Celsius</text>
    <text x="24" y="185" transform="rotate(-90 24 185)" text-anchor="middle">Solubility in g per 100 g water</text>
  </g>
</svg>`,
};

const chromatogramFigure: ItemFigure = {
  type: "svg",
  title: "Paper chromatogram of an ink sample",
  description:
    "A chromatography strip shows a baseline, solvent front and three separated colour spots.",
  svg: `<svg viewBox="0 0 430 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="430" height="360" fill="#ffffff"/>
  <rect x="170" y="40" width="90" height="260" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <line x1="152" y1="80" x2="278" y2="80" stroke="#334155" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="152" y1="280" x2="278" y2="280" stroke="#334155" stroke-width="2"/>
  <circle cx="215" cy="130" r="14" fill="#ef4444" opacity="0.9"/>
  <circle cx="215" cy="190" r="14" fill="#3b82f6" opacity="0.9"/>
  <circle cx="215" cy="220" r="14" fill="#22c55e" opacity="0.9"/>
  <line x1="295" y1="80" x2="295" y2="280" stroke="#64748b" stroke-width="2"/>
  <path d="M288 80 H302 M288 280 H302" stroke="#64748b" stroke-width="2"/>
  <g font-family="Arial, sans-serif" font-size="14" fill="#0f172a">
    <text x="215" y="314" text-anchor="middle">baseline</text>
    <text x="312" y="184">8.0 cm</text>
    <text x="282" y="84">solvent front</text>
    <text x="240" y="134">6.0 cm</text>
    <text x="240" y="194">3.6 cm</text>
    <text x="240" y="224">2.4 cm</text>
  </g>
</svg>`,
};

const bohrShellFigure: ItemFigure = {
  type: "svg",
  title: "Bohr shell arrangement for element X",
  description:
    "A nucleus labelled X is surrounded by three shells containing 2, 8 and 7 electrons.",
  svg: `<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="480" height="360" fill="#ffffff"/>
  <circle cx="240" cy="180" r="32" fill="#fde68a" stroke="#ca8a04" stroke-width="2"/>
  <text x="240" y="186" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">X</text>
  <circle cx="240" cy="180" r="65" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <circle cx="240" cy="180" r="105" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <circle cx="240" cy="180" r="145" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <g fill="#2563eb">
    <circle cx="240" cy="115" r="5"/><circle cx="240" cy="245" r="5"/>
    <circle cx="240" cy="75" r="5"/><circle cx="240" cy="285" r="5"/><circle cx="135" cy="180" r="5"/><circle cx="345" cy="180" r="5"/>
    <circle cx="166" cy="106" r="5"/><circle cx="314" cy="106" r="5"/><circle cx="166" cy="254" r="5"/><circle cx="314" cy="254" r="5"/>
    <circle cx="240" cy="35" r="5"/><circle cx="102" cy="135" r="5"/><circle cx="102" cy="225" r="5"/>
    <circle cx="378" cy="135" r="5"/><circle cx="378" cy="225" r="5"/><circle cx="190" cy="316" r="5"/><circle cx="290" cy="316" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#334155">
    <text x="318" y="72">K: 2</text>
    <text x="360" y="108">L: 8</text>
    <text x="392" y="145">M: 7</text>
  </g>
</svg>`,
};

const conservationMassFigure: ItemFigure = {
  type: "svg",
  title: "Sealed reaction vessel on a balance",
  description:
    "A sealed flask is shown on a balance before and after mixing two solutions.",
  svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="300" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="170" y="38" text-anchor="middle" font-size="18" font-weight="700">Before mixing</text>
    <text x="510" y="38" text-anchor="middle" font-size="18" font-weight="700">After mixing</text>
  </g>
  <g stroke="#334155" stroke-width="2" fill="none">
    <path d="M125 70 C125 118 105 142 105 196 C105 235 235 235 235 196 C235 142 215 118 215 70 Z"/>
    <path d="M465 70 C465 118 445 142 445 196 C445 235 575 235 575 196 C575 142 555 118 555 70 Z"/>
  </g>
  <rect x="123" y="170" width="94" height="42" fill="#bfdbfe" opacity="0.85"/>
  <rect x="463" y="170" width="94" height="42" fill="#bfdbfe" opacity="0.85"/>
  <ellipse cx="510" cy="204" rx="42" ry="8" fill="#fbbf24" opacity="0.85"/>
  <rect x="75" y="240" width="190" height="34" rx="6" fill="#e2e8f0" stroke="#94a3b8"/>
  <rect x="415" y="240" width="190" height="34" rx="6" fill="#e2e8f0" stroke="#94a3b8"/>
  <g font-family="Arial, sans-serif" font-size="15" fill="#0f172a">
    <text x="170" y="263" text-anchor="middle">100.0 g</text>
    <text x="510" y="263" text-anchor="middle">100.0 g</text>
    <text x="170" y="226" text-anchor="middle">sealed</text>
    <text x="510" y="226" text-anchor="middle">sealed</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Mixtures, Solutions and Concentration",
    subtopic:
      "Homogeneous and heterogeneous mixtures, solutions, colloids, suspensions and concentration expressions.",
    mc: [
      {
        questionLatex:
          "A liquid sample is uniform throughout, leaves no residue on filtration and does not scatter a light beam. The sample is best classified as",
        difficulty: 2,
        skillTags: ["solutions", "mixture_classification"],
        choices: [
          {
            text: "a suspension",
            rationale:
              "A suspension has large particles that can settle or be filtered.",
          },
          { text: "a solution", correct: true },
          {
            text: "a colloid",
            rationale:
              "A colloid scatters light due to the Tyndall effect.",
          },
          {
            text: "a pure element",
            rationale:
              "Uniform appearance alone does not prove that the substance is a pure element.",
          },
        ],
        hints: [
          "Check whether particles settle or scatter light.",
          "A solution is homogeneous at the particle level.",
          "No residue, no settling and no Tyndall effect point to a true solution.",
        ],
        solution: [
          step(
            1,
            "The sample is uniform and does not show visible suspended particles.",
          ),
          step(
            2,
            "It also does not scatter light, so it is not a colloid.",
          ),
          step(3, "Therefore the best classification is a solution."),
        ],
      },
      {
        questionLatex:
          "A student dissolves $8\\,\\text{g}$ of salt in $92\\,\\text{g}$ of water. The mass by mass percentage of the solution is",
        difficulty: 2,
        skillTags: ["concentration", "mass_percent"],
        choices: [
          {
            text: "$4\\%$",
            rationale:
              "This halves the solute mass without reason. Use solute mass divided by total solution mass.",
          },
          {
            text: "$8.7\\%$",
            rationale:
              "This divides by the mass of water only, not by the mass of the solution.",
          },
          {
            text: "$92\\%$",
            rationale:
              "This is close to the water percentage, not the salt percentage.",
          },
          { text: "$8\\%$", correct: true },
        ],
        hints: [
          "First find the mass of the whole solution.",
          "Mass percent is solute mass divided by solution mass, multiplied by 100.",
          "$8/(8+92) \\times 100 = 8\\%$.",
        ],
        solution: [
          step(1, "The mass of solution is salt plus water.", "8+92=100\\,\\text{g}"),
          step(
            2,
            "Now use the mass by mass percentage formula.",
            "\\frac{8}{100}\\times 100=8\\%",
          ),
        ],
      },
      {
        questionLatex:
          "A mixture contains $15\\,\\text{mL}$ ethanol and $45\\,\\text{mL}$ water. Assuming volumes are additive, the volume by volume percentage of ethanol is",
        difficulty: 2,
        skillTags: ["concentration", "volume_percent"],
        choices: [
          { text: "$25\\%$", correct: true },
          {
            text: "$33.3\\%$",
            rationale:
              "This divides ethanol volume by water volume, not by total solution volume.",
          },
          {
            text: "$45\\%$",
            rationale:
              "This uses the water volume as if it were the ethanol percentage.",
          },
          {
            text: "$75\\%$",
            rationale:
              "This is the water fraction, not the ethanol fraction.",
          },
        ],
        hints: [
          "Find total volume first.",
          "Use ethanol volume divided by total mixture volume.",
          "$15/(15+45) = 15/60$.",
        ],
        solution: [
          step(1, "The total volume is $60\\,\\text{mL}$.", "15+45=60"),
          step(
            2,
            "The percentage of ethanol is one-fourth of the total volume.",
            "\\frac{15}{60}\\times 100=25\\%",
          ),
        ],
      },
      {
        questionLatex:
          "Milk scatters a beam of light, but its particles do not settle on standing. In this test, milk behaves mainly as",
        difficulty: 2,
        skillTags: ["colloids", "tyndall_effect"],
        choices: [
          {
            text: "a true solution",
            rationale:
              "A true solution does not show the Tyndall effect.",
          },
          {
            text: "a suspension",
            rationale:
              "A suspension generally has particles that settle on standing.",
          },
          { text: "a colloid", correct: true },
          {
            text: "a compound",
            rationale:
              "Milk is not represented here as one pure compound; the clues are about a dispersion.",
          },
        ],
        hints: [
          "The light-scattering clue is important.",
          "Particles do not settle, so it is not a suspension.",
          "A colloid shows Tyndall effect without ordinary settling.",
        ],
        solution: [
          step(
            1,
            "Scattering of light by dispersed particles is the Tyndall effect.",
          ),
          step(
            2,
            "Since the particles do not settle on standing, the sample is a colloid rather than a suspension.",
          ),
        ],
      },
      {
        questionLatex:
          "A clear sugar solution is heated gently until all water evaporates and sugar remains in the dish. Which statement is most accurate?",
        difficulty: 3,
        skillTags: ["solutions", "physical_separation"],
        choices: [
          {
            text: "The sugar changed into a new substance.",
            rationale:
              "Evaporation removes solvent; it does not by itself prove formation of a new substance.",
          },
          { text: "The sugar was dissolved but still present in the solution.", correct: true },
          {
            text: "The solution was a colloid because sugar appeared later.",
            rationale:
              "The sugar appearing after evaporation does not make the original mixture a colloid.",
          },
          {
            text: "Water and sugar could not be separated by physical methods.",
            rationale:
              "Evaporation is a physical separation method.",
          },
        ],
        hints: [
          "Dissolved does not mean destroyed.",
          "Evaporation removes the solvent.",
          "The solute remains after the solvent is driven off.",
        ],
        solution: [
          step(
            1,
            "In a sugar solution, sugar particles are spread uniformly through water.",
          ),
          step(
            2,
            "Heating evaporates water. Sugar is still present and remains in the dish.",
          ),
        ],
      },
      {
        questionLatex:
          "A mixture contains sand and common salt. Which sequence can separate both components with minimum loss?",
        difficulty: 3,
        skillTags: ["mixture_separation", "solution_properties"],
        choices: [
          { text: "add water, filter, then evaporate the filtrate", correct: true },
          {
            text: "filter the dry mixture directly",
            rationale:
              "Dry filtration will not separate salt from sand because both solids remain together.",
          },
          {
            text: "use a separating funnel",
            rationale:
              "A separating funnel is used for immiscible liquids, not a salt-sand solid mixture.",
          },
          {
            text: "use paper chromatography",
            rationale:
              "Chromatography separates components based on movement on a stationary phase, not this simple salt-sand mixture.",
          },
        ],
        hints: [
          "Use the difference in solubility.",
          "Salt dissolves in water; sand does not.",
          "Filter sand, then recover salt by evaporating water.",
        ],
        solution: [
          step(1, "Salt dissolves in water, while sand remains insoluble."),
          step(2, "Filtration separates sand from the salt solution."),
          step(3, "Evaporation of the filtrate gives common salt."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "State one feature of a homogeneous mixture.",
        difficulty: 1,
        skillTags: ["homogeneous_mixtures"],
        parts: [part("a", "Write one clear feature.", 1)],
        hints: [
          "Think about whether the composition changes from place to place.",
          "A solution of salt in water is a common example.",
          "Uniform composition throughout is the key idea.",
        ],
        rubric: rubric([
          criterion(
            "a",
            1,
            "States a correct feature, such as uniform composition throughout or indistinguishable components.",
          ),
        ]),
        commonErrors: [
          "Writing only an example without any feature.",
          "Confusing homogeneous with visibly separate layers.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "A homogeneous mixture has uniform composition throughout, so its components are not seen as separate parts.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Differentiate between a solution, a colloid and a suspension using particle behaviour.",
        difficulty: 2,
        skillTags: ["solutions_colloids_suspensions"],
        parts: [part("a", "Give two clear differences using settling, filtration or light scattering.", 2)],
        hints: [
          "A true solution has very small particles.",
          "A suspension has particles large enough to settle.",
          "A colloid scatters light but generally does not settle.",
        ],
        rubric: rubric([
          criterion("a", 1, "Correctly describes the solution and suspension distinction."),
          criterion("a", 1, "Correctly includes the colloid clue, such as Tyndall effect without settling."),
        ]),
        commonErrors: [
          "Calling all cloudy mixtures suspensions.",
          "Saying a solution scatters light like a colloid.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "In a solution, particles are so small that they do not settle and do not scatter light visibly. In a colloid, particles do not usually settle but scatter light. In a suspension, larger particles may settle and can often be separated by filtration.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student dissolves $6\\,\\text{g}$ glucose in water and makes the final volume $150\\,\\text{mL}$. Calculate the mass by volume percentage.",
        difficulty: 2,
        skillTags: ["mass_by_volume_percent"],
        parts: [part("a", "Calculate the mass by volume percentage.", 2)],
        hints: [
          "Mass by volume percentage is based on grams per 100 mL solution.",
          "Use $\\frac{\\text{mass of solute}}{\\text{volume of solution}}\\times 100$.",
          "$6/150\\times 100=4$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses the correct mass by volume expression."),
          criterion("a", 1, "Calculates the answer as $4\\%$ mass by volume."),
        ]),
        commonErrors: [
          "Using the mass of water instead of final solution volume.",
          "Forgetting to multiply by 100.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Mass by volume percentage is mass of solute divided by volume of solution, multiplied by 100.",
            "\\frac{6}{150}\\times 100=4\\%",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the observations in the figure to classify Samples P, Q and R as solution, suspension or colloid.",
        difficulty: 3,
        skillTags: ["diagram_reasoning", "dispersion_classification"],
        figure: dispersionEvidenceFigure,
        parts: [part("a", "Classify all three samples and justify each classification briefly.", 3)],
        hints: [
          "Start with whether the light path is visible.",
          "Next check whether particles settle on standing.",
          "No visible light path suggests a solution; settling suggests suspension.",
        ],
        rubric: rubric([
          criterion("a", 1, "Classifies P as a solution using clear/no light path evidence."),
          criterion("a", 1, "Classifies Q as a suspension using settling evidence."),
          criterion("a", 1, "Classifies R as a colloid using light scattering without settling."),
        ]),
        commonErrors: [
          "Using colour alone to classify the samples.",
          "Calling every light-scattering mixture a suspension.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Sample P is a solution because it is clear and does not show a visible light path. Sample Q is a suspension because particles settle on standing. Sample R is a colloid because the light path is visible but the particles do not settle.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A health worker prepares an oral rehydration solution by dissolving $2.6\\,\\text{g}$ salts in water and making the final volume $200\\,\\text{mL}$. The solution must be uniform before it is given.",
        difficulty: 4,
        skillTags: ["concentration", "real_life_chemistry", "ors_context"],
        parts: [
          part("a", "Calculate the mass by volume percentage of salts.", 2),
          part("b", "Why should the final mixture be uniform?", 1),
          part("c", "Name one error in preparation that would change the concentration.", 1),
        ],
        hints: [
          "Use grams per 100 mL for mass by volume percentage.",
          "Uniform solution means each sip has the same composition.",
          "Changing final volume or solute mass changes concentration.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses the correct concentration expression."),
          criterion("a", 1, "Calculates $1.3\\%$ mass by volume."),
          criterion("b", 1, "Explains uniform composition/dose in the solution."),
          criterion("c", 1, "Names a valid concentration-changing error."),
        ]),
        commonErrors: [
          "Dividing by 200 and stopping without multiplying by 100.",
          "Saying uniformity only affects colour, not composition.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "The mass by volume percentage is",
            "\\frac{2.6}{200}\\times 100=1.3\\%",
          ),
          solutionPart(
            "b",
            "The mixture should be uniform so that every portion has the same concentration of dissolved salts.",
          ),
          solutionPart(
            "c",
            "One error is adding water to a volume different from $200\\,\\text{mL}$ after measuring the salts.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A bottle is labelled '10 percent sugar solution by mass'. Explain what this means using a $100\\,\\text{g}$ sample of the solution.",
        difficulty: 3,
        skillTags: ["mass_percent_interpretation"],
        parts: [part("a", "Interpret the label correctly.", 2)],
        hints: [
          "The percentage is by mass, not by volume.",
          "Use a 100 g sample to make the meaning direct.",
          "The solute mass is 10 g in every 100 g of solution.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that $10\\,\\text{g}$ sugar is present."),
          criterion("a", 1, "States that this is in $100\\,\\text{g}$ of solution, not $100\\,\\text{g}$ water."),
        ]),
        commonErrors: [
          "Writing $10\\,\\text{g}$ sugar in $100\\,\\text{g}$ water.",
          "Treating mass percent as volume percent.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "A 10 percent sugar solution by mass means $10\\,\\text{g}$ sugar is present in $100\\,\\text{g}$ of the solution. The remaining $90\\,\\text{g}$ is mainly solvent.",
          ),
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Separation Techniques and Solubility",
    subtopic:
      "Crystallisation, distillation, chromatography, sublimation, centrifugation, loading, sedimentation and solubility graphs.",
    mc: [
      {
        questionLatex:
          "A mixture contains ammonium chloride and common salt. Which technique should be used first to remove ammonium chloride?",
        difficulty: 2,
        skillTags: ["sublimation", "separation_techniques"],
        choices: [
          {
            text: "filtration",
            rationale:
              "Filtration separates an insoluble solid from a liquid, not two dry solids when one sublimes.",
          },
          {
            text: "separating funnel",
            rationale:
              "A separating funnel is used for immiscible liquids.",
          },
          { text: "sublimation", correct: true },
          {
            text: "centrifugation",
            rationale:
              "Centrifugation separates suspended particles by rapid spinning, not ammonium chloride from salt.",
          },
        ],
        hints: [
          "One component changes directly from solid to vapour.",
          "Common salt does not sublime under this school-lab condition.",
          "Use sublimation first.",
        ],
        solution: [
          step(
            1,
            "Ammonium chloride sublimes on heating, while common salt remains behind.",
          ),
          step(2, "So sublimation is the first suitable technique."),
        ],
      },
      {
        questionLatex:
          "In paper chromatography of black ink, different coloured spots appear because the dyes",
        difficulty: 3,
        skillTags: ["paper_chromatography", "separation_principle"],
        choices: [
          { text: "move at different rates due to different solubilities and attractions to the paper", correct: true },
          {
            text: "all have exactly the same solubility in the solvent",
            rationale:
              "If all dyes behaved exactly the same, they would not separate into spots.",
          },
          {
            text: "are converted into new elements during the experiment",
            rationale:
              "Chromatography is a physical separation method; it does not change dyes into new elements.",
          },
          {
            text: "settle at the bottom due to gravity",
            rationale:
              "The separation occurs as the solvent carries dyes upward along the paper.",
          },
        ],
        hints: [
          "The solvent moves up the paper.",
          "Different dyes interact differently with solvent and paper.",
          "Different movement causes separated spots.",
        ],
        solution: [
          step(
            1,
            "Dyes dissolve in the moving solvent to different extents and are attracted to the paper differently.",
          ),
          step(
            2,
            "Therefore they travel different distances and form separate spots.",
          ),
        ],
      },
      {
        questionLatex:
          "Cream is separated from milk in a dairy by spinning the milk rapidly. The method used is",
        difficulty: 2,
        skillTags: ["centrifugation"],
        choices: [
          {
            text: "distillation",
            rationale:
              "Distillation separates liquids based on boiling points.",
          },
          {
            text: "crystallisation",
            rationale:
              "Crystallisation obtains pure crystals from a solution.",
          },
          {
            text: "paper chromatography",
            rationale:
              "Paper chromatography separates small dissolved components such as dyes.",
          },
          { text: "centrifugation", correct: true },
        ],
        hints: [
          "The clue is rapid spinning.",
          "Particles/components separate due to different densities.",
          "Rapid spinning is centrifugation.",
        ],
        solution: [
          step(
            1,
            "Centrifugation uses rapid spinning to separate components of different densities.",
          ),
          step(2, "This is used to separate cream from milk."),
        ],
      },
      {
        questionLatex:
          "According to the solubility graph, a saturated solution at $60^\\circ\\text{C}$ contains $80\\,\\text{g}$ salt in $100\\,\\text{g}$ water. If it is cooled to $30^\\circ\\text{C}$, about how much salt crystallises?",
        difficulty: 3,
        skillTags: ["solubility_graph", "crystallisation"],
        figure: solubilityGraphFigure,
        choices: [
          {
            text: "$20\\,\\text{g}$",
            rationale:
              "This does not use the solubility value at $30^\\circ\\text{C}$ from the graph.",
          },
          { text: "$35\\,\\text{g}$", correct: true },
          {
            text: "$45\\,\\text{g}$",
            rationale:
              "About $45\\,\\text{g}$ remains dissolved at $30^\\circ\\text{C}$; it is not the amount crystallised.",
          },
          {
            text: "$80\\,\\text{g}$",
            rationale:
              "Not all salt crystallises; some remains dissolved at the lower temperature.",
          },
        ],
        hints: [
          "Read the solubility at $30^\\circ\\text{C}$.",
          "Subtract the amount that remains dissolved from the amount initially dissolved.",
          "$80-45=35$.",
        ],
        solution: [
          step(
            1,
            "At $30^\\circ\\text{C}$, about $45\\,\\text{g}$ remains dissolved in $100\\,\\text{g}$ water.",
          ),
          step(
            2,
            "The extra salt crystallises.",
            "80-45=35\\,\\text{g}",
          ),
        ],
      },
      {
        questionLatex:
          "A mixture of two miscible liquids has components with different boiling points, and both liquids must be collected separately. The most suitable technique is",
        difficulty: 3,
        skillTags: ["distillation", "separation_techniques", "boiling_point"],
        choices: [
          {
            text: "filter paper",
            rationale:
              "Filtration separates insoluble solids from liquids, not miscible liquids.",
          },
          {
            text: "chromatography paper",
            rationale:
              "Chromatography is useful for small dissolved components such as dyes, not for collecting two liquid fractions.",
          },
          { text: "distillation", correct: true },
          {
            text: "evaporating dish",
            rationale:
              "Evaporation may remove one liquid, but it does not collect both liquids separately.",
          },
        ],
        hints: [
          "The liquids are miscible, so they do not form layers.",
          "Use the difference in boiling points.",
          "Distillation vaporises one component and condenses it separately.",
        ],
        solution: [
          step(
            1,
            "Miscible liquids cannot be separated by a separating funnel.",
          ),
          step(
            2,
            "Distillation uses different boiling points and condensation to collect the liquids separately.",
          ),
        ],
      },
      {
        questionLatex:
          "Muddy water becomes clearer after alum is added and the mixture is left undisturbed. In Class 9 separation terminology, alum mainly helps by",
        difficulty: 2,
        skillTags: ["loading", "sedimentation", "water_purification"],
        choices: [
          {
            text: "distillation",
            rationale:
              "No boiling and condensation are involved here.",
          },
          {
            text: "sublimation",
            rationale:
              "Sublimation is solid directly changing to vapour.",
          },
          {
            text: "chromatography",
            rationale:
              "No movement on a stationary phase is described.",
          },
          { text: "loading fine suspended particles so that they settle faster", correct: true },
        ],
        hints: [
          "Alum helps fine particles come together.",
          "Larger clumps settle more easily.",
          "At this level, alum is used for loading before sedimentation.",
        ],
        solution: [
          step(
            1,
            "Alum helps fine suspended particles join into heavier clumps.",
          ),
          step(
            2,
            "The heavier particles settle faster; in Class 9 separation work this is treated as loading followed by sedimentation.",
          ),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the process used to obtain pure copper sulphate crystals from its solution.",
        difficulty: 1,
        skillTags: ["crystallisation"],
        parts: [part("a", "Name the process.", 1)],
        hints: [
          "The product is pure crystals.",
          "The solution is concentrated and allowed to cool.",
          "The process is crystallisation.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names crystallisation."),
        ]),
        commonErrors: [
          "Writing evaporation only, without recognising crystal formation.",
          "Writing distillation, which collects a liquid distillate.",
        ],
        workedSolution: [
          solutionPart("a", "The process is crystallisation."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why filtration cannot separate dissolved salt from salt solution, but evaporation can recover salt.",
        difficulty: 2,
        skillTags: ["filtration", "evaporation", "particle_size"],
        parts: [part("a", "Give the reason in terms of particles and solvent removal.", 2)],
        hints: [
          "Dissolved salt particles pass through filter paper with water.",
          "Evaporation removes the water.",
          "Salt remains because it is non-volatile under the condition.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains why dissolved salt passes through filter paper."),
          criterion("a", 1, "Explains that evaporation removes water and leaves salt behind."),
        ]),
        commonErrors: [
          "Saying filter paper has holes small enough to stop dissolved salt.",
          "Saying salt evaporates first.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Filtration cannot separate dissolved salt because salt particles are too small and pass through the filter along with water. Evaporation removes water as vapour, leaving salt behind.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "From the solubility graph, find the increase in solubility between $40^\\circ\\text{C}$ and $70^\\circ\\text{C}$, and state what this tells us about temperature.",
        difficulty: 3,
        skillTags: ["solubility_graph", "data_interpretation"],
        figure: solubilityGraphFigure,
        parts: [part("a", "Read the two graph values and interpret the trend.", 3)],
        hints: [
          "Read the graph at $40^\\circ\\text{C}$ and at $70^\\circ\\text{C}$.",
          "Subtract the smaller solubility from the larger one.",
          "The plotted line rises with temperature.",
        ],
        rubric: rubric([
          criterion("a", 1, "Reads about $50\\,\\text{g}$ per $100\\,\\text{g}$ water at $40^\\circ\\text{C}$."),
          criterion("a", 1, "Reads about $95\\,\\text{g}$ per $100\\,\\text{g}$ water at $70^\\circ\\text{C}$ and calculates an increase of about $45\\,\\text{g}$."),
          criterion("a", 1, "States that solubility increases with temperature for this salt."),
        ]),
        commonErrors: [
          "Reading the temperature axis as solubility.",
          "Stating that all salts must have exactly the same graph.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "The graph shows about $50\\,\\text{g}$ at $40^\\circ\\text{C}$ and about $95\\,\\text{g}$ at $70^\\circ\\text{C}$. The increase is about $45\\,\\text{g}$ per $100\\,\\text{g}$ water, so this salt becomes more soluble as temperature rises.",
            "95-50=45\\,\\text{g}",
          ),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A mixture contains sand, common salt and ammonium chloride. Plan a sequence to separate all three components.",
        difficulty: 4,
        skillTags: ["multi_step_separation", "sublimation", "filtration"],
        parts: [
          part("a", "State the first separation step and the component removed.", 1),
          part("b", "State how you separate sand from common salt.", 2),
          part("c", "State how common salt is finally recovered.", 1),
        ],
        hints: [
          "Start with the component that sublimes.",
          "After that, use solubility difference between sand and salt.",
          "Recover dissolved salt by removing water.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses sublimation to remove ammonium chloride."),
          criterion("b", 1, "Adds water so common salt dissolves and sand remains insoluble."),
          criterion("b", 1, "Uses filtration to separate sand."),
          criterion("c", 1, "Evaporates the filtrate/crystallises to recover common salt."),
        ]),
        commonErrors: [
          "Trying to filter the dry mixture directly.",
          "Evaporating before removing sand.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Heat the mixture gently and collect ammonium chloride by sublimation.",
          ),
          solutionPart(
            "b",
            "Add water to the remaining sand and common salt. Salt dissolves but sand does not. Filter the mixture to collect sand as residue.",
          ),
          solutionPart(
            "c",
            "Evaporate or crystallise the filtrate to recover common salt.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A black ink sample is separated by paper chromatography. The solvent front moves $8.0\\,\\text{cm}$ from the baseline. Three colour spots move $6.0\\,\\text{cm}$, $3.6\\,\\text{cm}$ and $2.4\\,\\text{cm}$.",
        difficulty: 4,
        skillTags: ["chromatography", "data_interpretation", "rf_value"],
        figure: chromatogramFigure,
        parts: [
          part("a", "What does the experiment show about black ink?", 1),
          part("b", "Which spot has moved the farthest relative to the solvent front?", 1),
          part("c", "Calculate the ratio $\\frac{\\text{distance moved by farthest spot}}{\\text{distance moved by solvent front}}$.", 2),
        ],
        hints: [
          "More than one spot means more than one dye.",
          "Compare distances from the baseline.",
          "Use $6.0/8.0$ for the farthest spot.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that black ink is a mixture of dyes."),
          criterion("b", 1, "Identifies the $6.0\\,\\text{cm}$ spot as farthest."),
          criterion("c", 1, "Uses the correct ratio."),
          criterion("c", 1, "Calculates the value as $0.75$ or $3/4$."),
        ]),
        commonErrors: [
          "Using distance from the top of the strip instead of from the baseline.",
          "Dividing solvent-front distance by spot distance.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "The separate spots show that black ink contains more than one dye.",
          ),
          solutionPart(
            "b",
            "The farthest dye spot moved $6.0\\,\\text{cm}$ from the baseline.",
          ),
          solutionPart(
            "c",
            "The requested ratio is",
            "\\frac{6.0}{8.0}=0.75",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In a water-treatment activity, alum is added to muddy water before filtration. Explain why this improves filtration.",
        difficulty: 3,
        skillTags: ["loading", "sedimentation", "filtration", "water_treatment"],
        parts: [part("a", "Explain the role of alum and the later filtration step.", 3)],
        hints: [
          "Very fine particles may pass slowly or remain suspended.",
          "Alum helps fine suspended particles form heavier clumps.",
          "Larger particles are easier to settle or filter.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that alum helps fine suspended particles form heavier clumps."),
          criterion("a", 1, "Explains that larger clumps settle or are trapped more easily."),
          criterion("a", 1, "Links this to clearer water after filtration/settling."),
        ]),
        commonErrors: [
          "Saying alum kills all microbes in this activity.",
          "Calling loading the same as evaporation.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Alum helps fine suspended particles in muddy water form heavier clumps. These clumps settle more easily and can be removed more effectively by filtration, so the water becomes clearer.",
          ),
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Atomic Models and Electronic Arrangement",
    subtopic:
      "Subatomic particles, Thomson, Rutherford and Bohr models, shells and electronic distributions up to element 18.",
    mc: [
      {
        questionLatex:
          "In Rutherford's alpha-particle scattering experiment, most alpha particles passed through the gold foil undeflected. This observation suggested that",
        difficulty: 2,
        skillTags: ["rutherford_model", "atomic_structure"],
        choices: [
          {
            text: "atoms have no positive charge at all",
            rationale:
              "Rutherford inferred a small positive nucleus, not absence of positive charge.",
          },
          {
            text: "electrons are inside a solid positive sphere",
            rationale:
              "This resembles Thomson's model and does not explain the scattering evidence well.",
          },
          {
            text: "the whole atom is packed with heavy matter",
            rationale:
              "If the atom were packed with matter, most alpha particles would not pass straight through.",
          },
          { text: "most of the atom is empty space", correct: true },
        ],
        hints: [
          "Focus on the word 'most'.",
          "If most particles pass straight through, they encounter little matter.",
          "This led to the empty-space idea.",
        ],
        solution: [
          step(
            1,
            "Most alpha particles were not deflected by the foil.",
          ),
          step(
            2,
            "This means most of the volume of an atom is empty space.",
          ),
        ],
      },
      {
        questionLatex:
          "Which limitation of Thomson's model became clear after Rutherford's scattering experiment?",
        difficulty: 3,
        skillTags: ["atomic_models", "model_limitation"],
        choices: [
          {
            text: "It placed electrons outside the atom.",
            rationale:
              "Thomson's model did include electrons in the atom.",
          },
          { text: "It did not account for a small, dense, positively charged nucleus.", correct: true },
          {
            text: "It gave the correct arrangement of electrons in shells.",
            rationale:
              "Shell arrangement is associated with Bohr's model, not Thomson's model.",
          },
          {
            text: "It proved neutrons are negatively charged.",
            rationale:
              "Neutrons are neutral, and this is not the issue revealed by Rutherford's experiment.",
          },
        ],
        hints: [
          "Rutherford's key conclusion was about the nucleus.",
          "Thomson's model spread positive charge through the atom.",
          "A dense positive centre was missing from Thomson's model.",
        ],
        solution: [
          step(
            1,
            "Thomson's model had electrons embedded in a positively charged sphere.",
          ),
          step(
            2,
            "Rutherford's experiment required a small, dense, positively charged nucleus to explain large deflections.",
          ),
        ],
      },
      {
        questionLatex:
          "The electronic distribution of aluminium with atomic number $13$ is",
        difficulty: 2,
        skillTags: ["electronic_configuration", "first_18_elements"],
        choices: [
          {
            text: "$2,7,4$",
            rationale:
              "The second shell is filled up to 8 before the third shell receives the remaining electrons here.",
          },
          {
            text: "$2,6,5$",
            rationale:
              "This does not follow the usual shell filling for the first 18 elements.",
          },
          { text: "$2,8,3$", correct: true },
          {
            text: "$8,2,3$",
            rationale:
              "The K shell cannot hold 8 electrons.",
          },
        ],
        hints: [
          "The K shell holds 2 electrons.",
          "The L shell is filled with 8 for aluminium.",
          "The remaining 3 go to the M shell.",
        ],
        solution: [
          step(1, "Aluminium has 13 electrons in a neutral atom."),
          step(2, "Distribute them as K = 2, L = 8, M = 3.", "2+8+3=13"),
        ],
      },
      {
        questionLatex:
          "An atom has electronic distribution $2,8,7$. Its usual valency is",
        difficulty: 2,
        skillTags: ["valency", "electronic_configuration"],
        choices: [
          { text: "$1$", correct: true },
          {
            text: "$2$",
            rationale:
              "The atom needs one electron to complete its octet, not two.",
          },
          {
            text: "$7$",
            rationale:
              "Seven is the number of valence electrons, not the usual valency here.",
          },
          {
            text: "$8$",
            rationale:
              "Valency is not the total capacity of an outer shell.",
          },
        ],
        hints: [
          "Count electrons in the outermost shell.",
          "It is closer to gaining one electron than losing seven.",
          "Valency is 1.",
        ],
        solution: [
          step(1, "The outermost shell has 7 electrons."),
          step(
            2,
            "The atom needs one more electron to complete an octet, so its valency is 1.",
          ),
        ],
      },
      {
        questionLatex:
          "For chlorine, atomic number $17$, the correct Bohr shell distribution is",
        difficulty: 2,
        skillTags: ["bohr_model", "chlorine"],
        choices: [
          {
            text: "$2,7,8$",
            rationale:
              "This fills the third shell before completing the second shell, which is not the arrangement for chlorine.",
          },
          {
            text: "$8,8,1$",
            rationale:
              "The K shell cannot hold 8 electrons.",
          },
          {
            text: "$2,8,8$",
            rationale:
              "This distribution totals 18 electrons, not 17.",
          },
          { text: "$2,8,7$", correct: true },
        ],
        hints: [
          "A neutral chlorine atom has 17 electrons.",
          "Fill K as 2 and L as 8.",
          "The remaining 7 are in M.",
        ],
        solution: [
          step(1, "Chlorine has 17 electrons."),
          step(2, "The distribution is $2,8,7$.", "2+8+7=17"),
        ],
      },
      {
        questionLatex:
          "A student writes sodium as $\\text{S}$ and sulphur as $\\text{Na}$ in a table of the first eighteen elements. Which correction is needed?",
        difficulty: 2,
        skillTags: ["chemical_symbols", "first_18_elements"],
        choices: [
          {
            text: "Both symbols are correct.",
            rationale:
              "$\\text{S}$ is sulphur and $\\text{Na}$ is sodium, so the two labels have been interchanged.",
          },
          { text: "Sodium is $\\text{Na}$ and sulphur is $\\text{S}$.", correct: true },
          {
            text: "Sodium is $\\text{So}$ and sulphur is $\\text{Su}$.",
            rationale:
              "These are not the accepted IUPAC chemical symbols for these elements.",
          },
          {
            text: "Sodium and sulphur have no symbols because they are not in the first eighteen elements.",
            rationale:
              "Both sodium and sulphur are among the first eighteen elements and have accepted symbols.",
          },
        ],
        hints: [
          "Recall the symbols used in formula writing.",
          "$\\text{Na}$ comes from the Latin name natrium.",
          "$\\text{S}$ is sulphur, while sodium is $\\text{Na}$.",
        ],
        solution: [
          step(
            1,
            "The accepted symbol of sodium is $\\text{Na}$, and the accepted symbol of sulphur is $\\text{S}$.",
          ),
          step(2, "The student's table has interchanged the two symbols."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "State the charge and usual location of an electron in an atom.",
        difficulty: 1,
        skillTags: ["electron_properties"],
        parts: [part("a", "Write charge and location.", 1)],
        hints: [
          "An electron is not in the nucleus in the shell model.",
          "Its charge is negative.",
          "It moves around the nucleus in shells or energy levels.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that an electron is negatively charged and found outside the nucleus/in shells."),
        ]),
        commonErrors: [
          "Putting electrons inside the nucleus.",
          "Calling electrons neutral.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "An electron has negative charge and is found outside the nucleus in shells or energy levels.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Draw or describe the Bohr arrangement of oxygen, atomic number $8$, and state its valency.",
        difficulty: 2,
        skillTags: ["bohr_model", "oxygen", "valency"],
        parts: [part("a", "Give shell distribution and valency.", 2)],
        hints: [
          "Oxygen has 8 electrons in a neutral atom.",
          "The K shell holds 2 electrons.",
          "The outer shell has 6 electrons, so valency is 2.",
        ],
        rubric: rubric([
          criterion("a", 1, "Gives shell distribution $2,6$."),
          criterion("a", 1, "States valency as 2 with correct reasoning."),
        ]),
        commonErrors: [
          "Writing $2,8$ for oxygen.",
          "Calling 6 the valency instead of valence electrons.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Oxygen has 8 electrons, arranged as $2,6$. It needs two more electrons to complete the octet, so its valency is 2.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Compare Thomson's model and Rutherford's model of the atom using two points.",
        difficulty: 3,
        skillTags: ["atomic_models", "comparison"],
        parts: [part("a", "Write two meaningful comparison points.", 2)],
        hints: [
          "Compare how positive charge is arranged.",
          "Compare whether a nucleus is present.",
          "Rutherford's model has a small dense nucleus and mostly empty space.",
        ],
        rubric: rubric([
          criterion("a", 1, "Correctly describes Thomson's spread-out positive charge/electrons embedded idea."),
          criterion("a", 1, "Correctly describes Rutherford's nucleus and mostly empty space idea."),
        ]),
        commonErrors: [
          "Saying both models are identical.",
          "Attributing shell energy levels to Thomson's model.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "In Thomson's model, negative electrons are embedded in a positively charged sphere. In Rutherford's model, almost all positive charge and mass are concentrated in a small nucleus, and most of the atom is empty space.",
          ),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "An atom $X$ has atomic number $17$ and mass number $35$.",
        difficulty: 4,
        skillTags: ["atomic_number", "mass_number", "configuration", "valency"],
        parts: [
          part("a", "Find the number of protons, electrons and neutrons in a neutral atom of $X$.", 2),
          part("b", "Write its electronic distribution.", 1),
          part("c", "State its valency with reason.", 1),
        ],
        hints: [
          "Atomic number gives protons and electrons in a neutral atom.",
          "Neutrons equal mass number minus atomic number.",
          "Use the outer-shell electrons to find valency.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds protons and electrons as 17 each."),
          criterion("a", 1, "Finds neutrons as 18."),
          criterion("b", 1, "Writes electronic distribution $2,8,7$."),
          criterion("c", 1, "States valency 1 because one electron is needed to complete octet."),
        ]),
        commonErrors: [
          "Taking mass number as number of electrons.",
          "Writing valency as 7 instead of 1.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Atomic number $17$ means 17 protons. A neutral atom has 17 electrons. Neutrons are mass number minus atomic number.",
            "35-17=18",
          ),
          solutionPart("b", "The electronic distribution is $2,8,7$."),
          solutionPart(
            "c",
            "The atom needs one electron to complete its octet, so its valency is 1.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "The diagram shows element $X$ with shell distribution $2,8,7$.",
        difficulty: 3,
        skillTags: ["bohr_diagram", "valence_electrons", "valency"],
        figure: bohrShellFigure,
        parts: [
          part("a", "How many valence electrons does $X$ have?", 1),
          part("b", "What is the valency of $X$?", 1),
          part("c", "Will $X$ more likely gain one electron or lose seven electrons to become stable? Give reason.", 2),
        ],
        hints: [
          "Valence electrons are in the outermost shell.",
          "Valency is about reaching a stable outer shell.",
          "Gaining one electron is easier than losing seven.",
        ],
        rubric: rubric([
          criterion("a", 1, "States 7 valence electrons."),
          criterion("b", 1, "States valency 1."),
          criterion("c", 1, "States that $X$ is more likely to gain one electron."),
          criterion("c", 1, "Gives the octet/stability reason."),
        ]),
        commonErrors: [
          "Confusing valence electrons with valency.",
          "Counting all electrons as valence electrons.",
        ],
        workedSolution: [
          solutionPart("a", "The outermost shell has 7 electrons."),
          solutionPart("b", "The valency is 1."),
          solutionPart(
            "c",
            "$X$ is more likely to gain one electron because that completes the octet. Losing seven electrons is not the usual simple route to stability.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Differentiate between isotopes and isobars using one example of each pair.",
        difficulty: 3,
        skillTags: ["isotopes", "isobars"],
        parts: [part("a", "Give the difference and one example pair for each.", 3)],
        hints: [
          "Isotopes have the same atomic number.",
          "Isobars have the same mass number.",
          "Use carbon isotopes and argon/calcium isobars as possible examples.",
        ],
        rubric: rubric([
          criterion("a", 1, "States isotopes have same atomic number but different mass numbers."),
          criterion("a", 1, "States isobars have same mass number but different atomic numbers."),
          criterion("a", 1, "Gives at least one valid example pair."),
        ]),
        commonErrors: [
          "Reversing isotope and isobar definitions.",
          "Giving examples without atomic or mass-number logic.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Isotopes are atoms of the same element with the same atomic number but different mass numbers, such as $^{35}\\text{Cl}$ and $^{37}\\text{Cl}$. Isobars have the same mass number but different atomic numbers, such as $^{40}\\text{Ar}$ and $^{40}\\text{Ca}$.",
          ),
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Atomic Number, Mass Number and Valency",
    subtopic:
      "Calculating protons, neutrons and electrons; ions; isotopes, isobars and valency-based formula reasoning.",
    mc: [
      {
        questionLatex:
          "An ion has $11$ protons, $12$ neutrons and $10$ electrons. Which statement is correct?",
        difficulty: 3,
        skillTags: ["ions", "mass_number", "charge"],
        choices: [
          { text: "It has mass number $23$ and charge $+1$.", correct: true },
          {
            text: "It has mass number $21$ and charge $-1$.",
            rationale:
              "Mass number is protons plus neutrons, and fewer electrons than protons gives positive charge.",
          },
          {
            text: "It has atomic number $12$ and charge $0$.",
            rationale:
              "Atomic number is the number of protons, not neutrons.",
          },
          {
            text: "It has mass number $33$ and charge $+2$.",
            rationale:
              "This incorrectly adds electrons into mass number and miscounts charge.",
          },
        ],
        hints: [
          "Mass number counts protons and neutrons.",
          "Charge depends on protons compared with electrons.",
          "$11+12=23$, and $11-10=+1$.",
        ],
        solution: [
          step(1, "Mass number is protons plus neutrons.", "11+12=23"),
          step(2, "There is one more proton than electron, so the charge is $+1$."),
        ],
      },
      {
        questionLatex:
          "Atoms $^{35}_{17}X$ and $^{37}_{17}X$ are",
        difficulty: 2,
        skillTags: ["isotopes"],
        choices: [
          {
            text: "isobars because their atomic numbers are equal",
            rationale:
              "Equal atomic number means same element; different mass numbers make them isotopes.",
          },
          {
            text: "different elements because their mass numbers differ",
            rationale:
              "They have the same atomic number, so they are atoms of the same element.",
          },
          { text: "isotopes because their atomic numbers are equal but mass numbers differ", correct: true },
          {
            text: "ions because their mass numbers are not equal",
            rationale:
              "Different mass number does not by itself mean charge.",
          },
        ],
        hints: [
          "Look at the lower number first.",
          "Same atomic number means same element.",
          "Same element with different mass numbers means isotopes.",
        ],
        solution: [
          step(
            1,
            "Both atoms have atomic number 17, so they are the same element.",
          ),
          step(
            2,
            "Their mass numbers are 35 and 37, so they are isotopes.",
          ),
        ],
      },
      {
        questionLatex:
          "Which pair represents isobars?",
        difficulty: 2,
        skillTags: ["isobars"],
        choices: [
          {
            text: "$^{35}\\text{Cl}$ and $^{37}\\text{Cl}$",
            rationale:
              "These are isotopes of chlorine because the element is the same but mass numbers differ.",
          },
          { text: "$^{40}\\text{Ar}$ and $^{40}\\text{Ca}$", correct: true },
          {
            text: "$^{12}\\text{C}$ and $^{14}\\text{C}$",
            rationale:
              "These are isotopes of carbon, not isobars.",
          },
          {
            text: "$^{16}\\text{O}$ and $^{32}\\text{S}$",
            rationale:
              "Their mass numbers are different, so they are not isobars.",
          },
        ],
        hints: [
          "Isobars have the same mass number.",
          "They usually belong to different elements.",
          "Choose the pair with mass number 40 for both.",
        ],
        solution: [
          step(
            1,
            "Isobars have the same mass number but different atomic numbers.",
          ),
          step(
            2,
            "$^{40}\\text{Ar}$ and $^{40}\\text{Ca}$ both have mass number 40 and are different elements.",
          ),
        ],
      },
      {
        questionLatex:
          "A neutral atom has atomic number $8$. The valency of this atom is",
        difficulty: 3,
        skillTags: ["valency", "oxygen"],
        choices: [
          {
            text: "$1$",
            rationale:
              "Atomic number 8 gives electronic distribution $2,6$, so it needs two electrons for an octet.",
          },
          {
            text: "$6$",
            rationale:
              "Six is the number of valence electrons, not the usual valency.",
          },
          {
            text: "$8$",
            rationale:
              "Eight is the stable octet target, not this atom's valency.",
          },
          { text: "$2$", correct: true },
        ],
        hints: [
          "Write the electronic distribution for atomic number 8.",
          "The outer shell has 6 electrons.",
          "It needs 2 electrons to complete the octet.",
        ],
        solution: [
          step(1, "Atomic number 8 gives electronic distribution $2,6$."),
          step(2, "It needs two more electrons to complete its octet, so valency is 2."),
        ],
      },
      {
        questionLatex:
          "An aluminium atom has $13$ electrons. The number of electrons in $\\text{Al}^{3+}$ is",
        difficulty: 2,
        skillTags: ["ions", "electron_count"],
        choices: [
          { text: "$10$", correct: true },
          {
            text: "$13$",
            rationale:
              "$\\text{Al}^{3+}$ has lost three electrons compared with the neutral atom.",
          },
          {
            text: "$16$",
            rationale:
              "A positive ion has fewer electrons, not more.",
          },
          {
            text: "$3$",
            rationale:
              "The charge $3+$ is not the total number of electrons.",
          },
        ],
        hints: [
          "A positive ion forms by loss of electrons.",
          "$3+$ means three electrons lost.",
          "$13-3=10$.",
        ],
        solution: [
          step(1, "$\\text{Al}^{3+}$ is formed by losing three electrons."),
          step(2, "Number of electrons is", "13-3=10"),
        ],
      },
      {
        questionLatex:
          "The formula of the compound formed from $\\text{Mg}^{2+}$ and $\\text{N}^{3-}$ is",
        difficulty: 3,
        skillTags: ["chemical_formula", "ions", "valency"],
        choices: [
          {
            text: "$\\text{MgN}$",
            rationale:
              "The charges $+2$ and $-3$ do not balance in a 1:1 ratio.",
          },
          {
            text: "$\\text{Mg}_2\\text{N}_3$",
            rationale:
              "This reverses the criss-cross ratio and gives unequal total charges.",
          },
          { text: "$\\text{Mg}_3\\text{N}_2$", correct: true },
          {
            text: "$\\text{Mg}_3\\text{N}$",
            rationale:
              "This gives total positive charge $+6$ but only $-3$ negative charge.",
          },
        ],
        hints: [
          "Total positive and negative charges must balance.",
          "Three magnesium ions give $+6$.",
          "Two nitride ions give $-6$.",
        ],
        solution: [
          step(
            1,
            "The least common multiple of 2 and 3 is 6.",
          ),
          step(
            2,
            "Use 3 magnesium ions and 2 nitride ions to balance charges.",
            "3(2+)+2(3-)=0",
          ),
          step(3, "The formula is $\\text{Mg}_3\\text{N}_2$."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "A neutral atom has atomic number $12$. What does this tell us about its protons and electrons?",
        difficulty: 2,
        skillTags: ["atomic_number"],
        parts: [part("a", "State the number of protons and electrons.", 2)],
        hints: [
          "Atomic number is the number of protons.",
          "A neutral atom has equal protons and electrons.",
          "So both counts are 12 here.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the atom has 12 protons."),
          criterion("a", 1, "States that the neutral atom has 12 electrons."),
        ]),
        commonErrors: [
          "Using 12 as mass number.",
          "Forgetting that neutrality means equal protons and electrons.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Atomic number $12$ means the atom has 12 protons. Since the atom is neutral, it also has 12 electrons.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "For $^{27}_{13}\\text{Al}^{3+}$, calculate the number of protons, neutrons and electrons.",
        difficulty: 2,
        skillTags: ["ion_particle_count", "atomic_notation"],
        parts: [part("a", "Find protons, neutrons and electrons.", 3)],
        hints: [
          "The lower number gives protons.",
          "Neutrons are mass number minus atomic number.",
          "$3+$ means three electrons fewer than the neutral atom.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds protons as 13."),
          criterion("a", 1, "Finds neutrons as 14."),
          criterion("a", 1, "Finds electrons as 10."),
        ]),
        commonErrors: [
          "Subtracting 3 from protons instead of electrons.",
          "Using mass number as electron number.",
        ],
        workedSolution: [
          solutionPart("a", "Protons equal the atomic number: 13."),
          solutionPart("a", "Neutrons are mass number minus atomic number.", "27-13=14"),
          solutionPart("a", "$\\text{Al}^{3+}$ has lost 3 electrons, so electrons are", "13-3=10"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Atoms $P$ and $Q$ have atomic numbers $6$ and $8$ respectively. Predict their usual valencies and explain.",
        difficulty: 3,
        skillTags: ["valency_prediction", "electronic_distribution"],
        parts: [part("a", "Find both valencies with reasoning.", 4)],
        hints: [
          "Write electronic distributions for atomic numbers 6 and 8.",
          "Carbon has distribution $2,4$.",
          "Oxygen has distribution $2,6$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes/uses $P: 2,4$."),
          criterion("a", 1, "States valency of $P$ as 4."),
          criterion("a", 1, "Writes/uses $Q: 2,6$."),
          criterion("a", 1, "States valency of $Q$ as 2."),
        ]),
        commonErrors: [
          "Writing valency equal to atomic number.",
          "Calling oxygen valency 6.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "$P$ has atomic number 6, so its distribution is $2,4$ and usual valency is 4. $Q$ has atomic number 8, so its distribution is $2,6$ and it needs two electrons to complete the octet; its valency is 2.",
          ),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "The following nuclei are given: $^{16}_{8}A$, $^{18}_{8}B$, $^{18}_{9}C$ and $^{40}_{20}D$.",
        difficulty: 4,
        skillTags: ["isotopes_isobars", "atomic_notation"],
        parts: [
          part("a", "Identify one pair of isotopes.", 1),
          part("b", "Identify one pair of isobars.", 1),
          part("c", "Find the number of neutrons in $^{18}_{9}C$.", 1),
          part("d", "Explain why $^{16}_{8}A$ and $^{18}_{9}C$ are neither isotopes nor isobars.", 1),
        ],
        hints: [
          "For isotopes, compare lower numbers.",
          "For isobars, compare upper numbers.",
          "Neutrons equal upper number minus lower number.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies $^{16}_{8}A$ and $^{18}_{8}B$ as isotopes."),
          criterion("b", 1, "Identifies $^{18}_{8}B$ and $^{18}_{9}C$ as isobars."),
          criterion("c", 1, "Finds neutrons in $^{18}_{9}C$ as 9."),
          criterion("d", 1, "Explains that both atomic number and mass number differ for the stated pair."),
        ]),
        commonErrors: [
          "Using the element letters instead of atomic/mass numbers.",
          "Calling same mass and same atomic number the same relationship.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "$^{16}_{8}A$ and $^{18}_{8}B$ have the same atomic number 8 but different mass numbers, so they are isotopes.",
          ),
          solutionPart(
            "b",
            "$^{18}_{8}B$ and $^{18}_{9}C$ have the same mass number 18 but different atomic numbers, so they are isobars.",
          ),
          solutionPart("c", "Neutrons in $^{18}_{9}C$ are", "18-9=9"),
          solutionPart(
            "d",
            "$^{16}_{8}A$ and $^{18}_{9}C$ have different atomic numbers and different mass numbers, so they are neither isotopes nor isobars.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A hospital uses a radioactive isotope of iodine in a controlled diagnostic test. Another atom of iodine used in ordinary chemistry has the same atomic number but a different mass number.",
        difficulty: 3,
        skillTags: ["isotopes", "societal_application", "atomic_number"],
        parts: [
          part("a", "Why are the two iodine atoms isotopes?", 1),
          part("b", "Which number must be the same in both atoms?", 1),
          part("c", "Which subatomic particle count is different?", 1),
        ],
        hints: [
          "Isotopes belong to the same element.",
          "Same element means same atomic number.",
          "Different mass number means different neutron number.",
        ],
        rubric: rubric([
          criterion("a", 1, "Explains same atomic number but different mass number."),
          criterion("b", 1, "States atomic number/proton number."),
          criterion("c", 1, "States neutron number."),
        ]),
        commonErrors: [
          "Saying isotopes have different proton numbers.",
          "Confusing medical use with a change in element identity.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "They are isotopes because both are iodine atoms with the same atomic number but different mass numbers.",
          ),
          solutionPart("b", "The atomic number, or number of protons, is the same."),
          solutionPart("c", "The number of neutrons is different."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Element $M$ has electronic distribution $2,8,2$. Predict the ion it is likely to form and the formula of its chloride.",
        difficulty: 3,
        skillTags: ["valency", "ions", "formula_writing"],
        parts: [part("a", "Predict the ion and chloride formula.", 3)],
        hints: [
          "The outer shell has two electrons.",
          "Losing two electrons gives a stable shell.",
          "Balance $M^{2+}$ with chloride ions.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that $M$ forms $M^{2+}$ by losing two electrons."),
          criterion("a", 1, "States valency as 2."),
          criterion("a", 1, "Writes chloride formula as $M\\text{Cl}_2$."),
        ]),
        commonErrors: [
          "Writing $M^-$ because the outer shell is not complete.",
          "Writing $M_2\\text{Cl}$ by reversing the charges.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "$M$ has two valence electrons, so it can lose two electrons to form $M^{2+}$. Chloride is $\\text{Cl}^-$. Two chloride ions are needed to balance one $M^{2+}$ ion, so the formula is $M\\text{Cl}_2$.",
          ),
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Chemical Formulae, Masses and Laws",
    subtopic:
      "Law of conservation of mass, law of constant proportion, Dalton's theory, ions, covalent and ionic compounds, molecular mass and formula unit mass.",
    mc: [
      {
        questionLatex:
          "In a sealed container, $10\\,\\text{g}$ of substance $A$ reacts completely with $16\\,\\text{g}$ of substance $B$. The total mass of products should be",
        difficulty: 2,
        skillTags: ["law_of_conservation_of_mass"],
        choices: [
          {
            text: "$6\\,\\text{g}$",
            rationale:
              "This subtracts masses. Conservation compares total reactant mass with total product mass.",
          },
          { text: "$26\\,\\text{g}$", correct: true },
          {
            text: "$16\\,\\text{g}$",
            rationale:
              "This ignores substance $A$.",
          },
          {
            text: "more than $26\\,\\text{g}$",
            rationale:
              "In a sealed system, mass is conserved during the reaction.",
          },
        ],
        hints: [
          "The container is sealed.",
          "Add the masses of reactants.",
          "Total reactant mass equals total product mass.",
        ],
        solution: [
          step(
            1,
            "By the law of conservation of mass, total mass of products equals total mass of reactants.",
          ),
          step(2, "Total mass is", "10+16=26\\,\\text{g}"),
        ],
      },
      {
        questionLatex:
          "Assertion (A): Pure water obtained from rainwater and pure water obtained from ice contain hydrogen and oxygen in the same mass ratio. Reason (R): A pure compound always contains the same elements in a fixed proportion by mass. Choose the correct option.",
        difficulty: 3,
        skillTags: ["assertion_reason", "law_of_constant_proportion"],
        choices: [
          {
            text: "Both A and R are true, and R is the correct explanation of A.",
            correct: true,
          },
          {
            text: "Both A and R are true, but R is not the correct explanation of A.",
            rationale:
              "The reason directly explains why pure water has the same mass ratio from different sources.",
          },
          {
            text: "A is true, but R is false.",
            rationale:
              "The reason is true for pure compounds; this is the law of constant proportion.",
          },
          {
            text: "A is false, but R is true.",
            rationale:
              "The assertion is true for pure water; the source does not change its fixed composition.",
          },
        ],
        hints: [
          "Judge A and R separately first.",
          "The assertion is about fixed composition of a pure compound.",
          "The reason is the law of constant proportion, and it explains the assertion.",
        ],
        solution: [
          step(
            1,
            "The assertion is true: pure water has a fixed hydrogen to oxygen mass ratio.",
          ),
          step(
            2,
            "The reason is also true and explains the assertion because it states the law of constant proportion.",
          ),
        ],
      },
      {
        questionLatex:
          "The molecular mass of $\\text{H}_2\\text{SO}_4$ is $\\left(\\text{H}=1,\\ \\text{S}=32,\\ \\text{O}=16\\right)$",
        difficulty: 3,
        skillTags: ["molecular_mass"],
        choices: [
          {
            text: "$49\\,\\text{u}$",
            rationale:
              "This misses the full contribution of all atoms in the formula.",
          },
          {
            text: "$82\\,\\text{u}$",
            rationale:
              "This counts only one oxygen less than required.",
          },
          { text: "$98\\,\\text{u}$", correct: true },
          {
            text: "$100\\,\\text{u}$",
            rationale:
              "This overcounts the hydrogen contribution.",
          },
        ],
        hints: [
          "Count 2 H atoms, 1 S atom and 4 O atoms.",
          "Use $2(1)+32+4(16)$.",
          "The total is 98 u.",
        ],
        solution: [
          step(
            1,
            "Add the atomic masses according to the formula.",
            "2(1)+32+4(16)=2+32+64=98\\,\\text{u}",
          ),
        ],
      },
      {
        questionLatex:
          "The formula of calcium chloride formed from $\\text{Ca}^{2+}$ and $\\text{Cl}^-$ is",
        difficulty: 2,
        skillTags: ["formula_writing", "ionic_compounds"],
        choices: [
          { text: "$\\text{CaCl}_2$", correct: true },
          {
            text: "$\\text{Ca}_2\\text{Cl}$",
            rationale:
              "This reverses the charge-balancing ratio.",
          },
          {
            text: "$\\text{CaCl}$",
            rationale:
              "One chloride ion does not balance $\\text{Ca}^{2+}$.",
          },
          {
            text: "$\\text{Ca}_2\\text{Cl}_2$",
            rationale:
              "The formula should be written in the simplest whole-number ratio.",
          },
        ],
        hints: [
          "Calcium has charge $2+$.",
          "Each chloride ion has charge $1-$.",
          "Two chloride ions balance one calcium ion.",
        ],
        solution: [
          step(
            1,
            "One $\\text{Ca}^{2+}$ ion needs two $\\text{Cl}^-$ ions for charge balance.",
          ),
          step(2, "The formula is $\\text{CaCl}_2$."),
        ],
      },
      {
        questionLatex:
          "The formula unit mass of $\\text{Na}_2\\text{CO}_3$ is $\\left(\\text{Na}=23,\\ \\text{C}=12,\\ \\text{O}=16\\right)$",
        difficulty: 3,
        skillTags: ["formula_unit_mass"],
        choices: [
          {
            text: "$83\\,\\text{u}$",
            rationale:
              "This counts only one sodium atom.",
          },
          { text: "$106\\,\\text{u}$", correct: true },
          {
            text: "$99\\,\\text{u}$",
            rationale:
              "This undercounts the oxygen contribution.",
          },
          {
            text: "$122\\,\\text{u}$",
            rationale:
              "This overcounts the number of oxygen atoms.",
          },
        ],
        hints: [
          "Count 2 sodium atoms.",
          "Count 1 carbon and 3 oxygen atoms.",
          "$2(23)+12+3(16)=106$.",
        ],
        solution: [
          step(
            1,
            "Formula unit mass is the sum of atomic masses in the formula unit.",
            "2(23)+12+3(16)=46+12+48=106\\,\\text{u}",
          ),
        ],
      },
      {
        questionLatex:
          "If an oxide has formula $X_2\\text{O}_3$ and oxygen has valency $2$, the valency of $X$ is",
        difficulty: 3,
        skillTags: ["valency", "formula_reasoning"],
        choices: [
          {
            text: "$1$",
            rationale:
              "Valency 1 would not balance three oxygen atoms of valency 2.",
          },
          {
            text: "$2$",
            rationale:
              "If $X$ had valency 2, the simplest oxide would be closer to $XO$, not $X_2O_3$.",
          },
          {
            text: "$6$",
            rationale:
              "Six is the total oxygen valency contribution, not the valency of one $X$ atom.",
          },
          { text: "$3$", correct: true },
        ],
        hints: [
          "Three oxygen atoms contribute total valency $3\\times 2=6$.",
          "Two $X$ atoms must balance this total.",
          "Each $X$ has valency 3.",
        ],
        solution: [
          step(
            1,
            "Total valency contribution of oxygen is",
            "3\\times 2=6",
          ),
          step(
            2,
            "Two atoms of $X$ balance 6, so each $X$ has valency 3.",
            "\\frac{6}{2}=3",
          ),
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex:
          "A compound $P$ is made of ions and has a high melting point. A compound $Q$ is made of molecules and does not conduct electricity in solid form. Identify which is more likely ionic and which is more likely covalent, with one reason.",
        difficulty: 3,
        skillTags: ["ionic_covalent_compounds", "property_reasoning"],
        parts: [part("a", "Classify $P$ and $Q$ and give one reason.", 3)],
        hints: [
          "Ionic compounds are made of ions.",
          "Covalent compounds are made of molecules.",
          "High melting point is commonly associated with ionic compounds at this level.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies $P$ as ionic."),
          criterion("a", 1, "Identifies $Q$ as covalent."),
          criterion("a", 1, "Gives a valid property-based reason."),
        ]),
        commonErrors: [
          "Classifying only by whether the compound name sounds familiar.",
          "Writing that all compounds conduct electricity in solid form.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "$P$ is more likely ionic because it is made of ions and has a high melting point. $Q$ is more likely covalent because it is made of molecules and does not conduct electricity in solid form.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Write the formulae of magnesium chloride, aluminium oxide and calcium hydroxide.",
        difficulty: 2,
        skillTags: ["formula_writing", "valency"],
        parts: [part("a", "Write all three formulae.", 3)],
        hints: [
          "Use charges or valencies to balance each compound.",
          "$\\text{Mg}^{2+}$ balances two chloride ions.",
          "Hydroxide is the group $\\text{OH}^-$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $\\text{MgCl}_2$."),
          criterion("a", 1, "Writes $\\text{Al}_2\\text{O}_3$."),
          criterion("a", 1, "Writes $\\text{Ca}(\\text{OH})_2$."),
        ]),
        commonErrors: [
          "Writing $\\text{CaOH}_2$ instead of using brackets around hydroxide.",
          "Writing $\\text{AlO}$ for aluminium oxide.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "The formulae are magnesium chloride: $\\text{MgCl}_2$, aluminium oxide: $\\text{Al}_2\\text{O}_3$, and calcium hydroxide: $\\text{Ca}(\\text{OH})_2$.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Calculate the molecular or formula unit masses of $\\text{CaCO}_3$ and $\\text{HNO}_3$. Use $\\text{Ca}=40$, $\\text{C}=12$, $\\text{O}=16$, $\\text{H}=1$, $\\text{N}=14$.",
        difficulty: 3,
        skillTags: ["molecular_mass", "formula_unit_mass"],
        parts: [part("a", "Show both calculations.", 4)],
        hints: [
          "Count the atoms in each formula.",
          "$\\text{CaCO}_3$ has one calcium, one carbon and three oxygen atoms.",
          "$\\text{HNO}_3$ has one hydrogen, one nitrogen and three oxygen atoms.",
        ],
        rubric: rubric([
          criterion("a", 1, "Sets up/calculates $\\text{CaCO}_3$ correctly."),
          criterion("a", 1, "Gets $100\\,\\text{u}$ for $\\text{CaCO}_3$."),
          criterion("a", 1, "Sets up/calculates $\\text{HNO}_3$ correctly."),
          criterion("a", 1, "Gets $63\\,\\text{u}$ for $\\text{HNO}_3$."),
        ]),
        commonErrors: [
          "Counting only one oxygen atom in each formula.",
          "Adding atomic numbers instead of given atomic masses.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "For calcium carbonate:",
            "40+12+3(16)=100\\,\\text{u}",
          ),
          solutionPart(
            "a",
            "For nitric acid:",
            "1+14+3(16)=63\\,\\text{u}",
          ),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "The figure shows a reaction carried out in a sealed flask on a balance.",
        difficulty: 4,
        skillTags: ["law_of_conservation_of_mass", "experimental_reasoning"],
        figure: conservationMassFigure,
        parts: [
          part("a", "Which law is verified by the equal balance readings?", 1),
          part("b", "Why is using a sealed flask important?", 1),
          part("c", "If a gas escaped in an open flask, how could the reading mislead a student?", 2),
        ],
        hints: [
          "Compare total mass before and after reaction.",
          "A sealed flask prevents material from leaving.",
          "A lower final reading in an open setup may not mean mass is destroyed.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names the law of conservation of mass."),
          criterion("b", 1, "Explains that a sealed flask prevents loss/gain of matter."),
          criterion("c", 1, "States that escaping gas can reduce the measured mass."),
          criterion("c", 1, "Explains that this is an experimental loss, not violation of the law."),
        ]),
        commonErrors: [
          "Saying mass is not conserved if the balance reading falls in an open flask.",
          "Ignoring the word sealed.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "The equal readings verify the law of conservation of mass.",
          ),
          solutionPart(
            "b",
            "The flask is sealed so no reactant or product can escape and no outside matter can enter.",
          ),
          solutionPart(
            "c",
            "If gas escaped from an open flask, the balance reading would decrease. That would show loss of matter from the apparatus, not destruction of mass in the reaction.",
          ),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A compound of elements $X$ and oxygen is prepared twice. In sample I, $2.8\\,\\text{g}$ of $X$ combines with $1.6\\,\\text{g}$ oxygen. In sample II, $7.0\\,\\text{g}$ of $X$ combines with $4.0\\,\\text{g}$ oxygen. A third sample contains $5.6\\,\\text{g}$ of $X$.",
        difficulty: 5,
        skillTags: ["constant_proportion", "mass_ratio", "multi_step_reasoning"],
        parts: [
          part("a", "Show whether samples I and II obey the law of constant proportion.", 2),
          part("b", "Predict the mass of oxygen that should combine with $5.6\\,\\text{g}$ of $X$.", 2),
          part("c", "State why this reasoning applies only to a pure compound, not to an arbitrary mixture.", 1),
        ],
        hints: [
          "Compare the mass ratio $X:O$ in both samples.",
          "Scale the first sample from $2.8\\,\\text{g}$ of $X$ to $5.6\\,\\text{g}$ of $X$.",
          "Compounds have fixed composition; mixtures can have variable composition.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates or compares ratio for sample I."),
          criterion("a", 1, "Calculates or compares ratio for sample II and concludes ratios match."),
          criterion("b", 1, "Uses the correct scaling factor or ratio."),
          criterion("b", 1, "Predicts $3.2\\,\\text{g}$ oxygen."),
          criterion("c", 1, "Explains that pure compounds have fixed composition while mixtures do not."),
        ]),
        commonErrors: [
          "Comparing only total sample masses instead of element mass ratios.",
          "Assuming every mixture must have a fixed mass ratio.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "For sample I, the ratio $X:O$ is $2.8:1.6=7:4$. For sample II, $7.0:4.0=7:4$. Since the ratios are the same, the samples obey the law of constant proportion.",
          ),
          solutionPart(
            "b",
            "$5.6\\,\\text{g}$ is twice $2.8\\,\\text{g}$, so oxygen mass is twice $1.6\\,\\text{g}$.",
            "2\\times 1.6=3.2\\,\\text{g}",
          ),
          solutionPart(
            "c",
            "This applies to a pure compound because its elements combine in a fixed mass ratio. A mixture may contain components in different proportions.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use Dalton's atomic theory to explain the law of conservation of mass in one reaction.",
        difficulty: 3,
        skillTags: ["dalton_atomic_theory", "conservation_of_mass"],
        parts: [part("a", "Link atoms and mass conservation.", 3)],
        hints: [
          "Dalton's theory treats atoms as indivisible in chemical reactions.",
          "Chemical reactions rearrange atoms.",
          "If atoms are not created or destroyed, total mass is conserved.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that atoms are not created or destroyed in a chemical reaction."),
          criterion("a", 1, "States that atoms are rearranged to form products."),
          criterion("a", 1, "Links unchanged atoms to conserved total mass."),
        ]),
        commonErrors: [
          "Saying atoms vanish and new atoms appear.",
          "Explaining only by memorising the law without atomic reasoning.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "According to Dalton's atomic theory, atoms are not created or destroyed in a chemical reaction. They rearrange to form new substances. Since the same atoms remain present before and after the reaction, the total mass remains conserved.",
          ),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Chlorine has atomic number $17$. Draw or describe the electron-dot structure of a chlorine molecule, $\\text{Cl}_2$, and explain why one pair of electrons is shared.",
        difficulty: 3,
        skillTags: ["electron_dot_structure", "covalent_compounds", "valency"],
        parts: [
          part("a", "Give the electron-dot structure idea and the reason for sharing.", 3),
        ],
        hints: [
          "First write chlorine's shell distribution.",
          "A chlorine atom has 7 valence electrons.",
          "Two chlorine atoms share one pair so that each completes its octet.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that each chlorine atom has 7 valence electrons."),
          criterion("a", 1, "Shows or describes one shared pair between two chlorine atoms."),
          criterion("a", 1, "Explains that sharing helps each chlorine atom complete an octet."),
        ]),
        commonErrors: [
          "Drawing an ionic transfer instead of a shared pair.",
          "Giving chlorine only one valence electron.",
        ],
        workedSolution: [
          solutionPart(
            "a",
            "Chlorine has electronic distribution $2,8,7$, so each chlorine atom has 7 valence electrons. In $\\text{Cl}_2$, the two chlorine atoms share one pair of electrons, usually shown as $\\text{Cl}:\\text{Cl}$ with three lone pairs remaining on each chlorine atom. The shared pair lets each atom count 8 electrons in its outer shell.",
          ),
        ],
      },
    ],
  },
];

export const matterNatureBehaviourTopics: Topic[] = topicSeeds.map(makeTopic);
