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
import { calibrateCbseChemistryDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-chemistry-11";
const UNIT = "u6-equilibrium";
const VERSION = "0.1.4";
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
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
  figure?: ItemFigure;
  calculatorAllowed?: boolean;
  commonMisconceptions?: string[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  parts: readonly FrqPart[];
  hints: readonly [string, string, string];
  rubric: FrqRubric;
  commonErrors: readonly string[];
  workedSolution: readonly FrqSolutionPart[];
  figure?: ItemFigure;
  calculatorAllowed?: boolean;
  commonMisconceptions?: string[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function hintLadder(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightleftharpoons|ightarrow)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|log|Delta|alpha|circ|rightleftharpoons|rightarrow|approx)\b/g,
        "$1\\$2",
      ),
  );
}

function repairSolutionStep(step: SolutionStep): SolutionStep {
  return {
    ...step,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function repairPart(part: FrqPart): FrqPart {
  return {
    ...part,
    promptMarkdown: repairInlineLatex(part.promptMarkdown),
  };
}

function repairRubric(rubric: FrqRubric): FrqRubric {
  return {
    maxPoints: rubric.maxPoints,
    criteria: rubric.criteria.map((criterion) => ({
      ...criterion,
      description: repairInlineLatex(criterion.description),
    })),
  };
}

function repairWorkedSolution(part: FrqSolutionPart): FrqSolutionPart {
  return {
    ...part,
    explanation: repairInlineLatex(part.explanation),
    ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the equilibrium expression, reaction quotient, ionisation relation, pH scale, buffer relation, or solubility-product condition before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    const fallbackRationale =
      seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter);
    return {
      text: repairInlineLatex(seed.choices[choiceIndex]),
      isCorrect,
      rationaleIfWrong: isCorrect ? null : repairInlineLatex(fallbackRationale),
      misconceptionTag: isCorrect
        ? null
        : "incorrect_cbse_class11_chemistry_equilibrium_reasoning",
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

  return {
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_equilibrium_formula_without_checking_direction_units_or_assumptions",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hintLadder(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
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
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_equilibrium_result_without_expression_shift_or_ion_balance_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hintLadder(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
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

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const concentrationTimeFigure: ItemFigure = {
  type: "svg",
  title: "Concentration changes before a steady state",
  description:
    "A concentration-time graph shows one species decreasing and another increasing until both become constant.",
  svg: `<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-conc-u6" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="90" y1="340" x2="570" y2="340" stroke="#334155" stroke-width="2" marker-end="url(#arrow-conc-u6)"/>
  <line x1="90" y1="340" x2="90" y2="70" stroke="#334155" stroke-width="2" marker-end="url(#arrow-conc-u6)"/>
  <text x="560" y="374" font-family="Arial" font-size="16" fill="#111827">time</text>
  <text x="22" y="82" font-family="Arial" font-size="16" fill="#111827">concentration</text>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="280" x2="545" y2="280"/>
    <line x1="90" y1="220" x2="545" y2="220"/>
    <line x1="90" y1="160" x2="545" y2="160"/>
    <line x1="180" y1="340" x2="180" y2="85"/>
    <line x1="270" y1="340" x2="270" y2="85"/>
    <line x1="360" y1="340" x2="360" y2="85"/>
    <line x1="450" y1="340" x2="450" y2="85"/>
  </g>
  <path d="M105 105 C160 132 210 180 258 218 C320 267 390 285 535 285" fill="none" stroke="#2563eb" stroke-width="4"/>
  <path d="M105 315 C168 290 220 248 270 222 C340 185 410 176 535 176" fill="none" stroke="#dc2626" stroke-width="4"/>
  <text x="485" y="305" font-family="Arial" font-size="16" fill="#1d4ed8">A</text>
  <text x="485" y="164" font-family="Arial" font-size="16" fill="#991b1b">B</text>
  <line x1="362" y1="96" x2="362" y2="340" stroke="#64748b" stroke-width="2" stroke-dasharray="7 6"/>
  <text x="378" y="110" font-family="Arial" font-size="15" fill="#475569">steady region</text>
</svg>`,
};

const leChatelierVesselFigure: ItemFigure = {
  type: "svg",
  title: "Equilibrium vessel before and after a stress",
  description:
    "Two sealed vessels show a reversible gas equilibrium before and after an external stress is applied.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-shift-u6" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <rect x="85" y="85" width="210" height="180" rx="18" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
  <rect x="425" y="85" width="210" height="180" rx="18" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
  <text x="190" y="60" text-anchor="middle" font-family="Arial" font-size="18" fill="#111827">initial mixture</text>
  <text x="530" y="60" text-anchor="middle" font-family="Arial" font-size="18" fill="#111827">after stress</text>
  <g fill="#2563eb">
    <circle cx="130" cy="132" r="10"/><circle cx="172" cy="190" r="10"/><circle cx="242" cy="140" r="10"/><circle cx="220" cy="230" r="10"/>
    <circle cx="478" cy="125" r="10"/><circle cx="515" cy="180" r="10"/><circle cx="570" cy="135" r="10"/>
  </g>
  <g fill="#dc2626">
    <circle cx="160" cy="135" r="7"/><circle cx="205" cy="160" r="7"/><circle cx="250" cy="210" r="7"/>
    <circle cx="465" cy="220" r="7"/><circle cx="495" cy="155" r="7"/><circle cx="542" cy="225" r="7"/><circle cx="590" cy="194" r="7"/><circle cx="608" cy="132" r="7"/>
  </g>
  <path d="M320 175 H390" stroke="#334155" stroke-width="3" marker-end="url(#arrow-shift-u6)"/>
  <text x="355" y="153" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">stress</text>
  <text x="360" y="315" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Use the observed composition change to infer direction of shift</text>
</svg>`,
};

const acidIonizationFigure: ItemFigure = {
  type: "svg",
  title: "Strong and weak acid particle pictures",
  description:
    "Two beakers compare nearly complete ionisation with partial ionisation at the same formal concentration.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Acid solutions at the same formal concentration</text>
  <path d="M105 80 L145 325 H285 L325 80" fill="#eff6ff" stroke="#64748b" stroke-width="3"/>
  <path d="M395 80 L435 325 H575 L615 80" fill="#eff6ff" stroke="#64748b" stroke-width="3"/>
  <path d="M135 218 C185 198 235 236 292 212 L276 310 H154 Z" fill="#bfdbfe" opacity="0.8"/>
  <path d="M425 218 C475 198 525 236 582 212 L566 310 H444 Z" fill="#bfdbfe" opacity="0.8"/>
  <text x="215" y="360" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">solution I</text>
  <text x="505" y="360" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">solution II</text>
  <g font-family="Arial" font-size="14" font-weight="700">
    <circle cx="165" cy="170" r="15" fill="#fee2e2" stroke="#dc2626"/><text x="165" y="175" text-anchor="middle" fill="#991b1b">H+</text>
    <circle cx="230" cy="145" r="15" fill="#dcfce7" stroke="#16a34a"/><text x="230" y="150" text-anchor="middle" fill="#166534">A-</text>
    <circle cx="190" cy="250" r="15" fill="#fee2e2" stroke="#dc2626"/><text x="190" y="255" text-anchor="middle" fill="#991b1b">H+</text>
    <circle cx="250" cy="245" r="15" fill="#dcfce7" stroke="#16a34a"/><text x="250" y="250" text-anchor="middle" fill="#166534">A-</text>
    <circle cx="470" cy="160" r="18" fill="#fef3c7" stroke="#f59e0b"/><text x="470" y="165" text-anchor="middle" fill="#92400e">HA</text>
    <circle cx="530" cy="235" r="18" fill="#fef3c7" stroke="#f59e0b"/><text x="530" y="240" text-anchor="middle" fill="#92400e">HA</text>
    <circle cx="510" cy="175" r="15" fill="#fee2e2" stroke="#dc2626"/><text x="510" y="180" text-anchor="middle" fill="#991b1b">H+</text>
    <circle cx="560" cy="170" r="15" fill="#dcfce7" stroke="#16a34a"/><text x="560" y="175" text-anchor="middle" fill="#166534">A-</text>
  </g>
</svg>`,
};

const bufferCurveFigure: ItemFigure = {
  type: "svg",
  title: "pH change on adding small amounts of acid or base",
  description:
    "A graph compares a buffer solution with unbuffered water as small amounts of acid or base are added.",
  svg: `<svg viewBox="0 0 680 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="430" fill="#ffffff"/>
  <defs>
    <marker id="arrow-buffer-u6" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="100" y1="350" x2="570" y2="350" stroke="#334155" stroke-width="2" marker-end="url(#arrow-buffer-u6)"/>
  <line x1="335" y1="350" x2="335" y2="70" stroke="#334155" stroke-width="2" marker-end="url(#arrow-buffer-u6)"/>
  <text x="560" y="382" font-family="Arial" font-size="15" fill="#111827">added base</text>
  <text x="92" y="382" font-family="Arial" font-size="15" fill="#111827">added acid</text>
  <text x="303" y="83" font-family="Arial" font-size="16" fill="#111827">pH</text>
  <line x1="115" y1="210" x2="555" y2="210" stroke="#e2e8f0" stroke-width="2"/>
  <path d="M120 312 C205 250 265 220 335 210 C405 200 470 170 555 108" fill="none" stroke="#dc2626" stroke-width="4"/>
  <path d="M120 230 C225 216 295 212 335 210 C385 208 470 204 555 190" fill="none" stroke="#2563eb" stroke-width="4"/>
  <text x="462" y="132" font-family="Arial" font-size="16" fill="#991b1b">unbuffered</text>
  <text x="450" y="196" font-family="Arial" font-size="16" fill="#1d4ed8">buffer</text>
  <text x="335" y="395" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">small additions near the centre</text>
</svg>`,
};

const solubilityProductFigure: ItemFigure = {
  type: "svg",
  title: "Ionic solid in contact with saturated solution",
  description:
    "A sparingly soluble ionic solid is shown at the bottom of a beaker with its ions in solution above it.",
  svg: `<svg viewBox="0 0 650 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="650" height="390" fill="#ffffff"/>
  <path d="M180 70 L220 330 H430 L470 70" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
  <path d="M215 205 C275 185 335 225 435 198 L420 316 H232 Z" fill="#bfdbfe" opacity="0.8"/>
  <rect x="232" y="292" width="188" height="35" rx="4" fill="#e2e8f0" stroke="#64748b"/>
  <text x="325" y="316" text-anchor="middle" font-family="Arial" font-size="16" fill="#334155">solid salt</text>
  <g font-family="Arial" font-size="14" font-weight="700">
    <circle cx="260" cy="160" r="17" fill="#dbeafe" stroke="#2563eb"/><text x="260" y="165" text-anchor="middle" fill="#1d4ed8">M+</text>
    <circle cx="350" cy="138" r="17" fill="#fee2e2" stroke="#dc2626"/><text x="350" y="143" text-anchor="middle" fill="#991b1b">X-</text>
    <circle cx="395" cy="215" r="17" fill="#dbeafe" stroke="#2563eb"/><text x="395" y="220" text-anchor="middle" fill="#1d4ed8">M+</text>
    <circle cx="295" cy="238" r="17" fill="#fee2e2" stroke="#dc2626"/><text x="295" y="243" text-anchor="middle" fill="#991b1b">X-</text>
  </g>
  <text x="325" y="45" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Saturated solution with undissolved solid</text>
  <text x="325" y="363" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">Dissolution and precipitation occur together at equilibrium</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Dynamic Equilibrium and Equilibrium Constants",
    subtopic:
      "Physical and chemical equilibrium, dynamic nature, law of mass action, equilibrium constant, reaction quotient and Kp-Kc relation",
    mc: [
      {
        questionLatex: L`A closed bottle contains liquid water and water vapour at constant temperature. Which statement best describes the equilibrium condition?`,
        difficulty: 2,
        skillTags: ["physical_equilibrium", "dynamic_equilibrium"],
        choices: [
          "evaporation stops completely",
          "condensation stops completely",
          "rate of evaporation equals rate of condensation",
          "the amount of liquid must equal the amount of vapour",
        ],
        correctLetter: "C",
        rationales: {
          A: "At dynamic equilibrium, evaporation continues microscopically.",
          B: "Condensation also continues microscopically.",
          D: "Equal rates do not require equal amounts of liquid and vapour.",
        },
        hints: [
          "Equilibrium is dynamic, not static.",
          "Think in terms of opposing rates.",
          "Macroscopic amounts remain constant when the two rates are equal.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a closed system, liquid water and vapour continue to interconvert.",
          },
          {
            step: 2,
            explanation:
              "At equilibrium, the rate of evaporation equals the rate of condensation.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{N_2(g)+3H_2(g)\rightleftharpoons 2NH_3(g)}$, the correct expression for $K_c$ is`,
        difficulty: 3,
        skillTags: ["law_of_mass_action", "kc_expression"],
        choices: [
          L`$\frac{[\mathrm{NH_3}]^2}{[\mathrm{N_2}][\mathrm{H_2}]^3}$`,
          L`$\frac{[\mathrm{N_2}][\mathrm{H_2}]^3}{[\mathrm{NH_3}]^2}$`,
          L`$\frac{2[\mathrm{NH_3}]}{[\mathrm{N_2}]+3[\mathrm{H_2}]}$`,
          L`$\frac{[\mathrm{NH_3}]}{[\mathrm{N_2}][\mathrm{H_2}]}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the reciprocal of the required expression.",
          C: "Stoichiometric coefficients become powers, not multipliers or sums.",
          D: "This misses the powers from the balanced equation.",
        },
        hints: [
          "Products go in the numerator.",
          "Reactants go in the denominator.",
          "Coefficients become exponents.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Apply the law of mass action to the balanced equation.",
            math: L`K_c=\frac{[\mathrm{NH_3}]^2}{[\mathrm{N_2}][\mathrm{H_2}]^3}`,
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{H_2(g)+I_2(g)\rightleftharpoons 2HI(g)}$, an equilibrium mixture has $[\mathrm{H_2}]=0.20\text{ M}$, $[\mathrm{I_2}]=0.30\text{ M}$ and $[\mathrm{HI}]=0.60\text{ M}$. The value of $K_c$ is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["kc_calculation", "equilibrium_concentration"],
        choices: [L`$2.0$`, L`$6.0$`, L`$0.167$`, L`$18.0$`],
        correctLetter: "B",
        rationales: {
          A: "This misses the square on $[\\mathrm{HI}]$.",
          C: "This is close to the reciprocal of the correct value.",
          D: "This overcounts one of the concentration factors.",
        },
        hints: [
          "Write $K_c=[HI]^2/([H_2][I_2])$.",
          "Square $0.60$.",
          "Divide by $0.20\\times0.30$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute equilibrium concentrations.",
            math: L`K_c=\frac{(0.60)^2}{(0.20)(0.30)}=\frac{0.36}{0.06}=6.0`,
          },
        ],
      },
      {
        questionLatex: L`For a reaction mixture of $\mathrm{N_2O_4(g)\rightleftharpoons 2NO_2(g)}$, $K_c=0.40$ at a given temperature and the current reaction quotient is $Q_c=0.10$. What happens next?`,
        difficulty: 4,
        skillTags: ["reaction_quotient", "shift_direction"],
        choices: [
          "the reaction shifts forward to form more $\\mathrm{NO_2}$",
          "the reaction shifts backward to form more $\\mathrm{N_2O_4}$",
          "the mixture is already at equilibrium",
          "the value of $K_c$ changes to $0.10$",
        ],
        correctLetter: "A",
        rationales: {
          B: "If $Q<K$, the product ratio is too small, so the forward direction is favoured.",
          C: "Equilibrium requires $Q=K$.",
          D: "At fixed temperature, $K_c$ does not change just because the current mixture is not at equilibrium.",
        },
        hints: [
          "Compare $Q_c$ with $K_c$.",
          "$Q_c<K_c$ means too little product relative to equilibrium.",
          "The reaction moves forward until $Q_c$ reaches $K_c$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Here $Q_c=0.10<K_c=0.40$.",
          },
          {
            step: 2,
            explanation:
              "The reaction moves forward to increase product concentration and raise $Q_c$.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{N_2O_4(g)\rightleftharpoons 2NO_2(g)}$, the relation between $K_p$ and $K_c$ is`,
        difficulty: 3,
        skillTags: ["kp_kc_relation", "gas_moles"],
        choices: [
          L`$K_p=K_c(RT)^{-1}$`,
          L`$K_p=K_c$`,
          L`$K_p=K_c(RT)$`,
          L`$K_p=K_c(RT)^2$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The change in gaseous moles is products minus reactants, $2-1=+1$.",
          B: "$K_p=K_c$ only when $\\Delta n_g=0$.",
          D: "The exponent is $\\Delta n_g=1$, not 2.",
        },
        hints: [
          "Use $K_p=K_c(RT)^{\\Delta n_g}$.",
          "Find gaseous product moles minus gaseous reactant moles.",
          "$\\Delta n_g=2-1=1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate the change in gaseous moles.",
            math: L`\Delta n_g=2-1=1`,
          },
          {
            step: 2,
            explanation: "Therefore $K_p=K_c(RT)^1=K_cRT$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is meant by dynamic equilibrium?`,
        difficulty: 1,
        skillTags: ["dynamic_equilibrium"],
        parts: singlePart("a", "Give the meaning in one or two sentences.", 2),
        hints: [
          "Dynamic means microscopic change continues.",
          "At equilibrium, opposing rates are equal.",
          "Macroscopic properties remain constant.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that forward and reverse processes continue at equal rates, so macroscopic properties remain constant.",
        ),
        commonErrors: ["Saying all molecular motion stops at equilibrium."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Dynamic equilibrium is the state in which forward and reverse processes continue, but their rates are equal, so observable properties remain constant.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{PCl_5(g)\rightleftharpoons PCl_3(g)+Cl_2(g)}$, write the expression for $K_c$ and state what a large value of $K_c$ indicates.`,
        difficulty: 3,
        skillTags: ["kc_expression", "interpret_k"],
        parts: [
          { letter: "a", promptMarkdown: "Write $K_c$.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Interpret a large value of $K_c$.",
            points: 2,
          },
        ],
        hints: [
          "Products are placed in the numerator.",
          "Use concentrations and powers from coefficients.",
          "Large $K_c$ means products are favoured at equilibrium.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Writes $K_c=[\\mathrm{PCl_3}][\\mathrm{Cl_2}]/[\\mathrm{PCl_5}]$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "States that products are present in relatively greater amount at equilibrium.",
            },
          ],
        },
        commonErrors: ["Putting $\\mathrm{PCl_5}$ in the numerator."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$K_c=[\\mathrm{PCl_3}][\\mathrm{Cl_2}]/[\\mathrm{PCl_5}]$.",
          },
          {
            part: "b",
            explanation:
              "A large $K_c$ means the equilibrium mixture contains relatively more products than reactants.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The concentration-time graph shows two species approaching constant concentrations in a closed reversible reaction.`,
        figure: concentrationTimeFigure,
        difficulty: 3,
        skillTags: ["graph_interpretation", "dynamic_equilibrium"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "What does the steady region of the graph indicate?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Does the steady region mean the reaction has stopped? Explain.",
            points: 2,
          },
        ],
        hints: [
          "Constant concentration is a macroscopic observation.",
          "Equilibrium is dynamic.",
          "Rates of forward and reverse reactions become equal.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Connects constant concentrations with equilibrium.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains that reactions continue with equal forward and reverse rates.",
            },
          ],
        },
        commonErrors: [
          "Interpreting flat concentration curves as zero reaction rates.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The steady region indicates that the system has reached equilibrium and concentrations are no longer changing macroscopically.",
          },
          {
            part: "b",
            explanation:
              "No. The forward and reverse reactions still occur, but at equal rates.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For $\mathrm{CO(g)+Cl_2(g)\rightleftharpoons COCl_2(g)}$, an equilibrium mixture contains $[\mathrm{CO}]=0.20\text{ M}$, $[\mathrm{Cl_2}]=0.10\text{ M}$ and $[\mathrm{COCl_2}]=0.80\text{ M}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["kc_calculation", "kp_kc_relation"],
        parts: [
          { letter: "a", promptMarkdown: "Calculate $K_c$.", points: 2 },
          { letter: "b", promptMarkdown: "Find $\\Delta n_g$.", points: 1 },
          {
            letter: "c",
            promptMarkdown:
              "Write the relation between $K_p$ and $K_c$ for this reaction.",
            points: 2,
          },
        ],
        hints: [
          "Write the concentration expression first.",
          "Product gas moles are fewer than reactant gas moles.",
          "Use $K_p=K_c(RT)^{\\Delta n_g}$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $K_c=40$." },
            { part: "b", points: 1, description: "Finds $\\Delta n_g=-1$." },
            {
              part: "c",
              points: 2,
              description: "Writes $K_p=K_c(RT)^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Using reactant moles minus product moles for $\\Delta n_g$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$K_c=[\\mathrm{COCl_2}]/([\\mathrm{CO}][\\mathrm{Cl_2}])=0.80/(0.20\\times0.10)=40$.",
          },
          {
            part: "b",
            explanation: "$\\Delta n_g=1-(1+1)=-1$.",
          },
          {
            part: "c",
            explanation: "So $K_p=K_c(RT)^{-1}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sealed vessel contains $\mathrm{A(g)}$ and $\mathrm{B(g)}$ forming $\mathrm{C(g)}$ reversibly. At $500\text{ K}$, $K_c=12$. Three trial mixtures have $Q_c=4$, $12$ and $20$ respectively.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["case_based", "reaction_quotient", "shift_direction"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the direction of shift for $Q_c=4$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the direction of shift for $Q_c=12$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the direction of shift for $Q_c=20$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why $K_c$ is not changed by choosing a different trial mixture at the same temperature.",
            points: 2,
          },
        ],
        hints: [
          "Compare each $Q_c$ with $K_c$.",
          "$Q<K$ shifts forward; $Q>K$ shifts backward.",
          "At a fixed temperature, $K$ is fixed for the reaction.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Forward shift." },
            { part: "b", points: 1, description: "Already at equilibrium." },
            { part: "c", points: 1, description: "Backward shift." },
            {
              part: "d",
              points: 2,
              description:
                "States that equilibrium constant depends only on temperature for a given reaction.",
            },
          ],
        },
        commonErrors: ["Changing $K_c$ to match each current value of $Q_c$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$Q_c=4<K_c$, so the mixture shifts forward.",
          },
          {
            part: "b",
            explanation: "$Q_c=K_c=12$, so the mixture is at equilibrium.",
          },
          {
            part: "c",
            explanation: "$Q_c=20>K_c$, so the mixture shifts backward.",
          },
          {
            part: "d",
            explanation:
              "For a given reaction, $K_c$ is fixed at a fixed temperature. The trial mixture changes $Q_c$, not $K_c$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.2",
    title: "Le Chatelier Principle and Shifts in Equilibrium",
    subtopic:
      "Effect of changes in concentration, pressure, volume, temperature and catalysts on physical and chemical equilibria",
    mc: [
      {
        questionLatex: L`For $\mathrm{N_2(g)+3H_2(g)\rightleftharpoons 2NH_3(g)}$, increasing pressure at constant temperature favours`,
        difficulty: 3,
        skillTags: ["le_chateliers_principle", "pressure_effect"],
        choices: [
          "the reverse reaction because there are fewer reactant moles",
          "the forward reaction because fewer gaseous moles are produced",
          "no shift because all species are gases",
          "a decrease in $K_c$",
        ],
        correctLetter: "B",
        rationales: {
          A: "The reactant side has four gaseous moles; the product side has two.",
          C: "Pressure changes can affect gas equilibria when gaseous mole counts differ.",
          D: "At constant temperature, $K_c$ does not change.",
        },
        hints: [
          "Count gaseous moles on both sides.",
          "Increased pressure favours the side with fewer gas moles.",
          "The product side has two moles of gas.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Reactants have $1+3=4$ gaseous moles; products have $2$ gaseous moles.",
          },
          {
            step: 2,
            explanation:
              "Increasing pressure favours the side with fewer gaseous moles, so ammonia formation is favoured.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{N_2O_4(g)\rightleftharpoons 2NO_2(g)}$, the forward reaction is endothermic. Raising the temperature shifts equilibrium`,
        difficulty: 3,
        skillTags: ["temperature_effect", "le_chateliers_principle"],
        choices: [
          "towards $\\mathrm{N_2O_4}$",
          "towards $\\mathrm{NO_2}$",
          "nowhere, because temperature never affects equilibrium",
          "towards the side with fewer gaseous moles only",
        ],
        correctLetter: "B",
        rationales: {
          A: "Heating favours the endothermic direction, which is forward here.",
          C: "Temperature is the stress that can change the equilibrium constant.",
          D: "Mole count controls pressure effects, not the heat stress in this question.",
        },
        hints: [
          "Treat heat as a reactant for an endothermic forward reaction.",
          "Adding heat favours the direction that consumes heat.",
          "The forward direction forms $\\mathrm{NO_2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The forward reaction absorbs heat, so heating favours the forward direction.",
          },
          {
            step: 2,
            explanation:
              "Therefore the equilibrium shifts towards $\\mathrm{NO_2}$.",
          },
        ],
      },
      {
        questionLatex: L`In the figure, the composition after stress contains relatively more red particles than before. If red particles represent product, the observed change is best described as`,
        figure: leChatelierVesselFigure,
        difficulty: 2,
        skillTags: ["figure_interpretation", "equilibrium_shift"],
        choices: [
          "a shift towards reactants",
          "a shift towards products",
          "no shift at all",
          "a change in the balanced chemical equation",
        ],
        correctLetter: "B",
        rationales: {
          A: "The product particles have increased, not decreased.",
          C: "A composition change indicates a shift.",
          D: "A stress changes equilibrium composition, not the balanced equation.",
        },
        hints: [
          "Compare the two vessels.",
          "Red particles are stated to represent product.",
          "More product after the stress means a product-side shift.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The product particles are more numerous after the stress.",
          },
          {
            step: 2,
            explanation:
              "That observation corresponds to a shift towards products.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{H_2(g)+I_2(g)\rightleftharpoons 2HI(g)}$, decreasing the volume at constant temperature causes`,
        difficulty: 4,
        skillTags: ["pressure_effect", "gas_moles", "le_chateliers_principle"],
        choices: [
          "a shift to the product side",
          "a shift to the reactant side",
          "no shift due to pressure change because gaseous moles are equal",
          "a change in stoichiometric coefficients",
        ],
        correctLetter: "C",
        rationales: {
          A: "Both sides have two gaseous moles, so pressure change has no directional preference.",
          B: "The same mole-count argument rules out a reverse preference.",
          D: "Changing volume cannot change the balanced chemical equation.",
        },
        hints: [
          "Count gas moles on both sides.",
          "Reactants have $1+1=2$ moles of gas.",
          "Products have $2$ moles of gas.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Both sides have the same number of gaseous moles.",
            math: L`\Delta n_g=2-2=0`,
          },
          {
            step: 2,
            explanation:
              "A pressure or volume change does not shift this equilibrium by mole-count effect.",
          },
        ],
      },
      {
        questionLatex: L`Adding a catalyst to a reversible reaction at equilibrium`,
        difficulty: 3,
        skillTags: ["catalyst_effect", "equilibrium"],
        choices: [
          "increases the equilibrium constant",
          "decreases the equilibrium constant",
          "changes the equilibrium composition permanently",
          "speeds up both forward and reverse reactions without changing equilibrium composition",
        ],
        correctLetter: "D",
        rationales: {
          A: "Only temperature changes the equilibrium constant for a given reaction.",
          B: "A catalyst does not change $K$.",
          C: "A catalyst helps the system reach equilibrium faster but does not shift it.",
        },
        hints: [
          "A catalyst lowers activation energy.",
          "It affects both directions.",
          "It changes rate of approach, not equilibrium composition.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A catalyst increases the rates of both forward and reverse reactions.",
          },
          {
            step: 2,
            explanation:
              "It does not change the value of $K$ or the equilibrium composition.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State Le Chatelier's principle.`,
        difficulty: 1,
        skillTags: ["le_chateliers_principle"],
        parts: singlePart("a", "State the principle clearly.", 2),
        hints: [
          "Think of a system already at equilibrium.",
          "A stress may be concentration, pressure or temperature change.",
          "The system shifts to reduce the effect of the stress.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that when a system at equilibrium is disturbed, it shifts in a direction that tends to reduce the effect of the disturbance.",
        ),
        commonErrors: ["Saying the system always shifts to the product side."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Le Chatelier's principle states that when a system at equilibrium is subjected to a change, it shifts in a direction that tends to counteract the change.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{2SO_2(g)+O_2(g)\rightleftharpoons 2SO_3(g)}$, predict the effect of increasing pressure and justify your answer.`,
        difficulty: 3,
        skillTags: ["pressure_effect", "gas_moles"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Count gaseous moles on both sides.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Predict the shift on increasing pressure.",
            points: 2,
          },
        ],
        hints: [
          "Reactant side has sulphur dioxide and oxygen.",
          "Product side has only sulphur trioxide.",
          "Pressure favours fewer gaseous moles.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Counts 3 gas moles on left and 2 on right.",
            },
            {
              part: "b",
              points: 2,
              description: "Predicts forward shift towards $\\mathrm{SO_3}$.",
            },
          ],
        },
        commonErrors: [
          "Ignoring stoichiometric coefficients while counting gas moles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The reactant side has $2+1=3$ gaseous moles, while the product side has $2$ gaseous moles.",
          },
          {
            part: "b",
            explanation:
              "Increasing pressure favours the side with fewer gas moles, so the equilibrium shifts towards $\\mathrm{SO_3}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{CaCO_3(s)\rightleftharpoons CaO(s)+CO_2(g)}$, predict the effect of adding more solid calcium carbonate at constant temperature.`,
        difficulty: 3,
        skillTags: ["heterogeneous_equilibrium", "solid_activity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the equilibrium expression.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Predict whether adding more $\\mathrm{CaCO_3(s)}$ shifts the equilibrium.",
            points: 2,
          },
        ],
        hints: [
          "Pure solids are not included in the equilibrium expression.",
          "Only carbon dioxide appears in $K_c$.",
          "Adding more pure solid does not change the reaction quotient.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Writes $K_c=[\\mathrm{CO_2}]$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "States no shift, provided some solid is already present.",
            },
          ],
        },
        commonErrors: ["Including pure solids in the equilibrium expression."],
        workedSolution: [
          {
            part: "a",
            explanation: "Pure solids are omitted, so $K_c=[\\mathrm{CO_2}]$.",
          },
          {
            part: "b",
            explanation:
              "Adding more $\\mathrm{CaCO_3(s)}$ does not change $Q_c$ or $K_c$, so it does not shift the equilibrium if solid is already present.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For $\mathrm{CO(g)+2H_2(g)\rightleftharpoons CH_3OH(g)}$, the forward reaction is exothermic. Predict the effect of each change on the equilibrium yield of methanol.`,
        difficulty: 5,
        skillTags: ["le_chateliers_principle", "pressure_temperature"],
        parts: [
          { letter: "a", promptMarkdown: "Increasing pressure.", points: 1 },
          { letter: "b", promptMarkdown: "Increasing temperature.", points: 2 },
          { letter: "c", promptMarkdown: "Adding more hydrogen.", points: 1 },
          { letter: "d", promptMarkdown: "Adding a catalyst.", points: 1 },
        ],
        hints: [
          "Count gaseous moles for pressure.",
          "For exothermic forward reaction, heat behaves like a product.",
          "A catalyst changes speed, not equilibrium yield.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Increases yield." },
            {
              part: "b",
              points: 2,
              description: "Decreases yield, with heat-as-product reasoning.",
            },
            { part: "c", points: 1, description: "Increases yield." },
            {
              part: "d",
              points: 1,
              description: "No equilibrium-yield change.",
            },
          ],
        },
        commonErrors: [
          "Saying a catalyst increases equilibrium yield instead of rate of attainment.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Increasing pressure favours the side with fewer gaseous moles. Products have one mole versus three on reactants, so yield increases.",
          },
          {
            part: "b",
            explanation:
              "Since the forward reaction is exothermic, heating favours the reverse endothermic direction, so methanol yield decreases.",
          },
          {
            part: "c",
            explanation:
              "Adding hydrogen increases a reactant concentration, so equilibrium shifts forward and yield increases.",
          },
          {
            part: "d",
            explanation:
              "A catalyst speeds up attainment of equilibrium but does not change equilibrium yield.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A teacher demonstrates the equilibrium $\mathrm{Fe^{3+}(aq)+SCN^-(aq)\rightleftharpoons FeSCN^{2+}(aq)}$. The product ion is red. In four trials the teacher adds $\mathrm{Fe^{3+}}$, adds $\mathrm{SCN^-}$, dilutes the mixture, and adds a reagent that removes $\mathrm{Fe^{3+}}$.`,
        difficulty: 5,
        skillTags: [
          "case_based",
          "concentration_effect",
          "le_chateliers_principle",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Predict the colour intensity after adding $\\mathrm{Fe^{3+}}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Predict the colour intensity after adding $\\mathrm{SCN^-}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Predict the effect of removing $\\mathrm{Fe^{3+}}$.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "State the principle used in all predictions.",
            points: 1,
          },
        ],
        hints: [
          "More product ion means deeper red colour.",
          "Adding a reactant favours product formation.",
          "Removing a reactant shifts equilibrium to replace it.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Red colour deepens." },
            { part: "b", points: 1, description: "Red colour deepens." },
            {
              part: "c",
              points: 2,
              description:
                "Equilibrium shifts left; product decreases and red colour fades.",
            },
            {
              part: "d",
              points: 1,
              description: "Names Le Chatelier's principle.",
            },
          ],
        },
        commonErrors: [
          "Treating colour dilution as proof that equilibrium has stopped.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Adding $\\mathrm{Fe^{3+}}$ shifts equilibrium forward, so more red product forms and colour deepens.",
          },
          {
            part: "b",
            explanation:
              "Adding $\\mathrm{SCN^-}$ also shifts equilibrium forward, deepening the red colour.",
          },
          {
            part: "c",
            explanation:
              "Removing $\\mathrm{Fe^{3+}}$ shifts equilibrium backward to replace it, so product concentration falls and the red colour fades.",
          },
          {
            part: "d",
            explanation: "The principle used is Le Chatelier's principle.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.3",
    title: "Ionic Equilibrium, Acids, Bases and pH",
    subtopic:
      "Strong and weak electrolytes, degree of ionisation, ionisation constants, polybasic acids, acid strength and pH calculations",
    mc: [
      {
        questionLatex: L`A $0.010\text{ M}$ strong monoprotic acid solution has pH closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["ph", "strong_acid"],
        choices: [L`$1$`, L`$2$`, L`$7$`, L`$12$`],
        correctLetter: "B",
        rationales: {
          A: "pH 1 would correspond to about $0.10\\text{ M}$ hydrogen ion.",
          C: "pH 7 is neutral water, not a strong acid at this concentration.",
          D: "pH 12 is strongly basic.",
        },
        hints: [
          "For a strong monoprotic acid, $[H^+]$ equals acid concentration.",
          "Use $\\mathrm{pH}=-\\log[H^+]$.",
          "$10^{-2}$ gives pH 2.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Strong monoprotic acid fully ionises.",
            math: L`[H^+]=0.010=10^{-2}\text{ M}`,
          },
          { step: 2, explanation: "Therefore pH is 2." },
        ],
      },
      {
        questionLatex: L`The particle picture shows two acid solutions of equal formal concentration. Which solution has the larger degree of ionisation?`,
        figure: acidIonizationFigure,
        difficulty: 3,
        skillTags: ["degree_ionisation", "figure_interpretation"],
        choices: [
          "solution I",
          "solution II",
          "both have the same degree because formal concentration is same",
          "degree of ionisation cannot be compared from particle pictures",
        ],
        correctLetter: "A",
        rationales: {
          B: "Solution II still shows more undissociated acid molecules.",
          C: "Equal formal concentration does not guarantee equal ionisation.",
          D: "The relative numbers of ions and undissociated molecules are exactly the relevant evidence.",
        },
        hints: [
          "Degree of ionisation is fraction dissociated.",
          "Look for more ions and fewer undissociated HA units.",
          "Solution I shows nearly complete ionisation.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Solution I shows mostly ions, while solution II shows undissociated HA molecules.",
          },
          {
            step: 2,
            explanation:
              "Therefore solution I has the larger degree of ionisation.",
          },
        ],
      },
      {
        questionLatex: L`For a weak acid $\mathrm{HA}$ of concentration $C$ and degree of ionisation $\alpha$, the approximate expression for $K_a$ when $\alpha$ is small is`,
        difficulty: 3,
        skillTags: ["weak_acid", "degree_ionisation", "ka"],
        choices: [
          L`$K_a=C\alpha^2$`,
          L`$K_a=C/\alpha^2$`,
          L`$K_a=\alpha/C$`,
          L`$K_a=C\alpha$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This reverses the dependence on ionisation.",
          C: "The concentration dependence is not in the denominator for this approximation.",
          D: "The hydrogen ion and conjugate base concentrations each contribute a factor of $\\alpha$.",
        },
        hints: [
          "At equilibrium, $[H^+]=[A^-]=C\\alpha$.",
          "$[HA]\\approx C$ when $\\alpha$ is small.",
          "Substitute into $K_a=[H^+][A^-]/[HA]$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a weak monoprotic acid, $[H^+]=[A^-]=C\\alpha$ and $[HA]\\approx C$.",
          },
          {
            step: 2,
            explanation: "Thus $K_a\\approx C\\alpha^2$.",
          },
        ],
      },
      {
        questionLatex: L`A weak acid has $K_a=4.0\times10^{-5}$ and concentration $0.10\text{ M}$. Using $[H^+]\approx\sqrt{K_aC}$, the pH is closest to`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["weak_acid_ph", "ka"],
        choices: [L`$2.70$`, L`$3.40$`, L`$4.40$`, L`$5.00$`],
        correctLetter: "A",
        rationales: {
          B: "This is too high; check the square root of $4.0\\times10^{-6}$.",
          C: "This treats $K_a$ itself as the hydrogen ion concentration.",
          D: "This corresponds to $[H^+]$ near $10^{-5}$ M, too small for the given acid.",
        },
        hints: [
          "Multiply $K_a$ by $C$.",
          "$4.0\\times10^{-5}\\times0.10=4.0\\times10^{-6}$.",
          "The square root is $2.0\\times10^{-3}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Estimate hydrogen ion concentration.",
            math: L`[H^+]\approx\sqrt{(4.0\times10^{-5})(0.10)}=2.0\times10^{-3}\text{ M}`,
          },
          {
            step: 2,
            explanation: "Then pH is about $-\\log(2.0\\times10^{-3})=2.70$.",
          },
        ],
      },
      {
        questionLatex: L`For a diprotic acid $\mathrm{H_2A}$ with $K_{a1}\gg K_{a2}$, which statement is generally correct?`,
        difficulty: 4,
        skillTags: ["polybasic_acid", "successive_ionisation"],
        choices: [
          "the first ionisation is usually much greater than the second",
          "both ionisations must occur to the same extent",
          "the second ionisation is always greater because the ion is already charged",
          "the acid cannot donate more than one proton",
        ],
        correctLetter: "A",
        rationales: {
          B: "Successive ionisation constants are usually different, often much smaller after the first step.",
          C: "Removing a proton from a negatively charged ion is generally less favourable.",
          D: "A diprotic acid can donate two protons in steps.",
        },
        hints: [
          "Compare $K_{a1}$ and $K_{a2}$.",
          "A much larger $K_{a1}$ means the first step is more extensive.",
          "Successive ionisations occur stepwise.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$K_{a1}\\gg K_{a2}$ means the first proton donation is much more favourable.",
          },
          {
            step: 2,
            explanation:
              "Therefore the first ionisation is usually much greater than the second.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define degree of ionisation.`,
        difficulty: 1,
        skillTags: ["degree_ionisation"],
        parts: singlePart("a", "Give the definition.", 2),
        hints: [
          "It is a fraction.",
          "Compare ionised molecules with initially dissolved molecules.",
          "It may also be expressed as a percentage.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Defines degree of ionisation as the fraction of dissolved molecules that ionise.",
        ),
        commonErrors: ["Defining it as total ion concentration only."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Degree of ionisation is the fraction of dissolved molecules of an electrolyte that ionise in solution.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Calculate the pH of $0.0010\,\mathrm{M}\ \mathrm{HCl}$, assuming complete ionisation.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["ph", "strong_acid"],
        parts: singlePart("a", "Find the pH.", 3),
        hints: [
          "Hydrochloric acid is a strong acid.",
          "So $[H^+]$ equals the acid concentration.",
          "$0.0010=10^{-3}$.",
        ],
        rubric: singleRubric(
          "a",
          3,
          "Uses $[H^+]=10^{-3}\\text{ M}$ and finds pH 3.",
        ),
        commonErrors: ["Using pH 11 by treating the acid as a base."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$[H^+]=0.0010\\text{ M}=10^{-3}\\text{ M}$, so $\\mathrm{pH}=-\\log(10^{-3})=3$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For a weak monoprotic acid $\mathrm{HA}$, derive the approximate relation $K_a=C\alpha^2$ when $\alpha$ is small.`,
        difficulty: 4,
        skillTags: ["weak_acid", "derivation", "degree_ionisation"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write equilibrium concentrations in terms of $C$ and $\\alpha$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Substitute into the $K_a$ expression and simplify.",
            points: 2,
          },
        ],
        hints: [
          "Start with $\\mathrm{HA\\rightleftharpoons H^+ + A^-}$.",
          "$[H^+]=[A^-]=C\\alpha$.",
          "For small $\\alpha$, $[HA]=C(1-\\alpha)\\approx C$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Gives $[H^+]=[A^-]=C\\alpha$ and $[HA]=C(1-\\alpha)$.",
            },
            {
              part: "b",
              points: 2,
              description: "Substitutes and obtains $K_a\\approx C\\alpha^2$.",
            },
          ],
        },
        commonErrors: ["Dropping one factor of $\\alpha$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $\\mathrm{HA\\rightleftharpoons H^+ + A^-}$, $[H^+]=[A^-]=C\\alpha$ and $[HA]=C(1-\\alpha)$.",
          },
          {
            part: "b",
            explanation:
              "$K_a=\\frac{(C\\alpha)(C\\alpha)}{C(1-\\alpha)}=\\frac{C\\alpha^2}{1-\\alpha}\\approx C\\alpha^2$ for small $\\alpha$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $0.20\text{ M}$ weak acid has degree of ionisation $5.0\%$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["degree_ionisation", "ka_calculation", "ph"],
        parts: [
          { letter: "a", promptMarkdown: "Find $[H^+]$.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the approximate pH.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Estimate $K_a$ using $K_a\\approx C\\alpha^2$.",
            points: 2,
          },
        ],
        hints: [
          "Convert percentage ionisation to a fraction.",
          "$[H^+]=C\\alpha$ for a monoprotic acid.",
          "Use $\\alpha=0.050$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $[H^+]=0.010\\text{ M}$.",
            },
            { part: "b", points: 2, description: "Finds pH about 2." },
            {
              part: "c",
              points: 2,
              description: "Finds $K_a=5.0\\times10^{-4}$.",
            },
          ],
        },
        commonErrors: ["Using 5.0 instead of 0.050 for degree of ionisation."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\alpha=5.0\\%=0.050$, so $[H^+]=C\\alpha=0.20\\times0.050=0.010\\text{ M}$.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{pH}=-\\log(10^{-2})=2$.",
          },
          {
            part: "c",
            explanation:
              "$K_a\\approx C\\alpha^2=0.20(0.050)^2=5.0\\times10^{-4}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two $0.10\text{ M}$ acid solutions are compared. Acid P has pH $1.00$. Acid Q has pH $2.87$. Both are monoprotic.`,
        figure: acidIonizationFigure,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["case_based", "ph", "acid_strength"],
        parts: [
          { letter: "a", promptMarkdown: "Which acid is stronger?", points: 1 },
          { letter: "b", promptMarkdown: "Estimate $[H^+]$ for Q.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Estimate degree of ionisation of Q.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why equal formal concentration does not imply equal pH.",
            points: 1,
          },
        ],
        hints: [
          "Lower pH means higher hydrogen ion concentration.",
          "$10^{-2.87}$ is about $1.35\\times10^{-3}$.",
          "Degree of ionisation is $[H^+]/C$ for a monoprotic acid.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies P as stronger." },
            {
              part: "b",
              points: 1,
              description: "Finds about $1.35\\times10^{-3}\\text{ M}$.",
            },
            { part: "c", points: 2, description: "Finds about $1.35\\%$." },
            {
              part: "d",
              points: 1,
              description:
                "Connects pH difference to different ionisation extents.",
            },
          ],
        },
        commonErrors: [
          "Assuming both acids fully ionise because their formal concentration is equal.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P is stronger because pH 1.00 means $[H^+]=0.10\\text{ M}$, nearly complete ionisation.",
          },
          {
            part: "b",
            explanation:
              "For Q, $[H^+]\\approx10^{-2.87}=1.35\\times10^{-3}\\text{ M}$.",
          },
          {
            part: "c",
            explanation:
              "$\\alpha=[H^+]/C=(1.35\\times10^{-3})/0.10=0.0135$, or about $1.35\\%$.",
          },
          {
            part: "d",
            explanation:
              "Equal formal concentration does not imply equal pH because weak acids ionise only partially.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.4",
    title: "Buffers, Salt Hydrolysis and Henderson Equation",
    subtopic:
      "Buffer action, Henderson-Hasselbalch equation, elementary salt hydrolysis and pH resistance",
    mc: [
      {
        questionLatex: L`Which mixture is a buffer solution?`,
        difficulty: 2,
        skillTags: ["buffer_solution", "acid_base_pairs"],
        choices: [
          L`$\mathrm{HCl}$ and $\mathrm{NaCl}$`,
          L`$\mathrm{CH_3COOH}$ and $\mathrm{CH_3COONa}$`,
          L`$\mathrm{NaOH}$ and $\mathrm{NaCl}$`,
          L`$\mathrm{HNO_3}$ and $\mathrm{KNO_3}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "A strong acid and its neutral salt do not form a weak acid-conjugate base buffer.",
          C: "A strong base with neutral salt is not a conjugate acid-base buffer pair.",
          D: "A strong acid with its salt is not a buffer pair.",
        },
        hints: [
          "An acidic buffer contains a weak acid and its conjugate base salt.",
          "Acetic acid is weak.",
          "Sodium acetate supplies acetate ion.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\mathrm{CH_3COOH}$ is a weak acid and $\\mathrm{CH_3COONa}$ supplies its conjugate base.",
          },
          {
            step: 2,
            explanation: "Therefore this pair forms an acidic buffer.",
          },
        ],
      },
      {
        questionLatex: L`For an acidic buffer, the Henderson equation is`,
        difficulty: 3,
        skillTags: ["henderson_equation", "buffer"],
        choices: [
          L`$\mathrm{pH}=pK_a+\log\frac{[\text{salt}]}{[\text{acid}]}$`,
          L`$\mathrm{pH}=pK_a+\log\frac{[\text{acid}]}{[\text{salt}]}$`,
          L`$\mathrm{pH}=pK_b+\log\frac{[\text{base}]}{[\text{salt}]}$`,
          L`$\mathrm{pH}=14-pK_a$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This inverts the buffer ratio.",
          C: "That form is for basic-buffer reasoning, not the acidic buffer asked here.",
          D: "This is not the Henderson equation.",
        },
        hints: [
          "Use the weak acid and conjugate base ratio.",
          "The conjugate base is supplied by the salt.",
          "Salt goes over acid for acidic buffer pH.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For an acidic buffer, $\\mathrm{pH}=pK_a+\\log([\\text{salt}]/[\\text{acid}])$.",
          },
        ],
      },
      {
        questionLatex: L`An acidic buffer has $pK_a=4.76$ and equal concentrations of weak acid and its salt. Its pH is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["henderson_equation", "buffer_ph"],
        choices: [L`$4.76$`, L`$7.00$`, L`$9.24$`, L`$0.00$`],
        correctLetter: "A",
        rationales: {
          B: "Equal acid and salt in a weak acid buffer does not automatically mean neutral pH.",
          C: "This resembles $14-pK_a$, not the Henderson relation here.",
          D: "The logarithmic ratio is zero, not the whole pH.",
        },
        hints: [
          "Use the Henderson equation.",
          "The salt-to-acid ratio is 1.",
          "$\\log 1=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute the equal concentration ratio.",
            math: L`\mathrm{pH}=4.76+\log 1=4.76`,
          },
        ],
      },
      {
        questionLatex: L`The graph compares a buffer with unbuffered water. Which conclusion is best supported?`,
        figure: bufferCurveFigure,
        difficulty: 3,
        skillTags: ["buffer_action", "graph_interpretation"],
        choices: [
          "the buffer resists large pH changes on small addition of acid or base",
          "the buffer keeps pH exactly constant under any amount of acid or base",
          "unbuffered water resists pH change better than a buffer",
          "buffer action is unrelated to conjugate acid-base pairs",
        ],
        correctLetter: "A",
        rationales: {
          B: "Buffers resist small changes; they have finite capacity.",
          C: "The unbuffered curve changes more steeply.",
          D: "Buffer action depends on a conjugate acid-base pair.",
        },
        hints: [
          "Compare the slopes of the two curves near the centre.",
          "A flatter curve means smaller pH change for the same addition.",
          "Buffer capacity is limited, not infinite.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The buffer curve is flatter near the centre than the unbuffered curve.",
          },
          {
            step: 2,
            explanation:
              "Thus the buffer resists large pH changes for small additions of acid or base.",
          },
        ],
      },
      {
        questionLatex: L`A salt of a strong acid and weak base is dissolved in water. The resulting solution is generally`,
        difficulty: 3,
        skillTags: ["salt_hydrolysis", "acidic_basic_salts"],
        choices: ["acidic", "basic", "neutral", "always a buffer"],
        correctLetter: "A",
        rationales: {
          B: "A weak-base conjugate acid hydrolyses to produce acidic solution.",
          C: "Neutral salts generally come from strong acid and strong base.",
          D: "A salt solution alone is not automatically a buffer.",
        },
        hints: [
          "Identify which ion hydrolyses.",
          "The conjugate acid of a weak base can donate protons.",
          "This makes the solution acidic.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The cation from the weak base undergoes hydrolysis and produces an acidic solution.",
          },
          {
            step: 2,
            explanation:
              "Therefore a salt of a strong acid and weak base is generally acidic.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is a buffer solution?`,
        difficulty: 1,
        skillTags: ["buffer_solution"],
        parts: singlePart("a", "Define buffer solution.", 2),
        hints: [
          "A buffer resists pH change.",
          "The resistance is for small addition of acid or base.",
          "It usually contains a conjugate acid-base pair.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Defines a buffer as a solution that resists pH change on small addition of acid or base.",
        ),
        commonErrors: [
          "Saying a buffer keeps pH unchanged for unlimited acid or base.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A buffer solution resists change in pH when small amounts of acid or base are added.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An acidic buffer contains $0.20\,\mathrm{M}\ \mathrm{CH_3COOH}$ and $0.10\,\mathrm{M}\ \mathrm{CH_3COONa}$. Given $pK_a=4.76$, calculate its pH.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["henderson_equation", "buffer_ph"],
        parts: singlePart("a", "Calculate the pH.", 4),
        hints: [
          "Use the Henderson equation for acidic buffer.",
          "Salt-to-acid ratio is $0.10/0.20$.",
          "$\\log(0.5)\\approx -0.30$.",
        ],
        rubric: singleRubric(
          "a",
          4,
          "Uses Henderson equation and finds pH about 4.46.",
        ),
        commonErrors: [
          "Using acid-to-salt ratio instead of salt-to-acid ratio.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{pH}=pK_a+\\log([\\text{salt}]/[\\text{acid}])=4.76+\\log(0.10/0.20)=4.76-0.30=4.46$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain how an acetate buffer resists a small addition of acid.`,
        difficulty: 3,
        skillTags: ["buffer_action", "conjugate_base"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Name the species that reacts with added $\\mathrm{H^+}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why pH changes only slightly.",
            points: 3,
          },
        ],
        hints: [
          "Acetate ion is the conjugate base.",
          "It consumes added hydrogen ions.",
          "The ratio of salt to acid changes only slightly for a small addition.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies acetate ion." },
            {
              part: "b",
              points: 3,
              description:
                "Explains conversion of acetate to acetic acid and small ratio change.",
            },
          ],
        },
        commonErrors: ["Saying the added acid disappears without reaction."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The acetate ion, $\\mathrm{CH_3COO^-}$, reacts with added $\\mathrm{H^+}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{CH_3COO^-+H^+\\rightarrow CH_3COOH}$. This consumes much of the added acid, so the conjugate-base to acid ratio changes only slightly and pH changes little.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Classify the aqueous solutions of $\mathrm{NaCl}$, $\mathrm{NH_4Cl}$ and $\mathrm{CH_3COONa}$ as acidic, basic or neutral. Give a reason in each case.`,
        difficulty: 4,
        skillTags: ["salt_hydrolysis", "acidic_basic_salts"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Classify $\\mathrm{NaCl(aq)}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Classify $\\mathrm{NH_4Cl(aq)}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Classify $\\mathrm{CH_3COONa(aq)}$.",
            points: 2,
          },
        ],
        hints: [
          "Strong acid plus strong base gives neutral salt.",
          "A conjugate acid of a weak base makes solution acidic.",
          "A conjugate base of a weak acid makes solution basic.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "NaCl neutral." },
            {
              part: "b",
              points: 2,
              description:
                "NH4Cl acidic due to hydrolysis of $\\mathrm{NH_4^+}$.",
            },
            {
              part: "c",
              points: 2,
              description: "CH3COONa basic due to hydrolysis of acetate ion.",
            },
          ],
        },
        commonErrors: ["Calling every salt solution neutral."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{NaCl}$ is neutral because it comes from strong acid $\\mathrm{HCl}$ and strong base $\\mathrm{NaOH}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{NH_4Cl}$ is acidic because $\\mathrm{NH_4^+}$ is the conjugate acid of weak base $\\mathrm{NH_3}$ and hydrolyses in water.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{CH_3COONa}$ is basic because acetate ion is the conjugate base of weak acid acetic acid and hydrolyses in water.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A lab prepares two solutions. Solution P contains $0.10\text{ M}$ acetic acid and $0.10\text{ M}$ sodium acetate. Solution Q contains only $0.10\text{ M}$ acetic acid. Small amounts of acid and base are added separately to samples of both solutions.`,
        figure: bufferCurveFigure,
        difficulty: 5,
        skillTags: ["case_based", "buffer_action", "henderson_equation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which solution is a buffer?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "If $pK_a=4.76$, estimate the initial pH of P.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which solution shows larger pH change on small acid addition?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Give the chemical reason.",
            points: 1,
          },
        ],
        hints: [
          "A buffer needs weak acid and conjugate base.",
          "For equal acid and salt, pH equals $pK_a$.",
          "The buffer consumes added acid or base.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies P." },
            { part: "b", points: 2, description: "Finds pH 4.76." },
            { part: "c", points: 1, description: "Identifies Q." },
            {
              part: "d",
              points: 1,
              description: "Explains conjugate pair in P resists pH change.",
            },
          ],
        },
        commonErrors: ["Saying pure weak acid alone is a buffer."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P is a buffer because it contains acetic acid and acetate ion.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{pH}=pK_a+\\log([\\text{salt}]/[\\text{acid}])=4.76+\\log 1=4.76$.",
          },
          {
            part: "c",
            explanation:
              "Q shows the larger pH change because it lacks the conjugate base reserve.",
          },
          {
            part: "d",
            explanation:
              "In P, acetate ion consumes added acid and acetic acid consumes added base, so the pH changes only slightly.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.5",
    title: "Solubility Product and Common-Ion Effect",
    subtopic:
      "Solubility equilibria of sparingly soluble salts, ionic product, solubility product, precipitation condition and common-ion effect",
    mc: [
      {
        questionLatex: L`For $\mathrm{AgCl(s)\rightleftharpoons Ag^+(aq)+Cl^-(aq)}$, the solubility product expression is`,
        difficulty: 2,
        skillTags: ["ksp_expression", "sparingly_soluble_salt"],
        choices: [
          L`$K_{sp}=[\mathrm{Ag^+}][\mathrm{Cl^-}]$`,
          L`$K_{sp}=\frac{[\mathrm{AgCl}]}{[\mathrm{Ag^+}][\mathrm{Cl^-}]}$`,
          L`$K_{sp}=[\mathrm{AgCl}][\mathrm{Ag^+}][\mathrm{Cl^-}]$`,
          L`$K_{sp}=\frac{[\mathrm{Ag^+}]}{[\mathrm{Cl^-}]}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Pure solid $\\mathrm{AgCl}$ is not included in the expression.",
          C: "Pure solids are omitted from equilibrium expressions.",
          D: "The ions multiply according to the dissolution equation.",
        },
        hints: [
          "Omit the pure solid.",
          "Include aqueous ions.",
          "Use stoichiometric powers from the dissolution equation.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For $\\mathrm{AgCl(s)\\rightleftharpoons Ag^+ + Cl^-}$, the pure solid is omitted.",
          },
          {
            step: 2,
            explanation: "So $K_{sp}=[\\mathrm{Ag^+}][\\mathrm{Cl^-}]$.",
          },
        ],
      },
      {
        questionLatex: L`If the molar solubility of $\mathrm{AgCl}$ in pure water is $s$, then $K_{sp}$ is`,
        difficulty: 3,
        skillTags: ["molar_solubility", "ksp"],
        choices: [L`$s$`, L`$s^2$`, L`$2s^2$`, L`$4s^3$`],
        correctLetter: "B",
        rationales: {
          A: "Both ion concentrations must be multiplied.",
          C: "This factor would not appear for a 1:1 salt.",
          D: "This resembles a 1:2 or 2:1 salt expression, not $\\mathrm{AgCl}$.",
        },
        hints: ["$[Ag^+]=s$.", "$[Cl^-]=s$.", "$K_{sp}=s\\times s$."],
        solution: [
          {
            step: 1,
            explanation:
              "For each mole of $\\mathrm{AgCl}$ dissolving, one mole each of $\\mathrm{Ag^+}$ and $\\mathrm{Cl^-}$ forms.",
          },
          {
            step: 2,
            explanation: "$K_{sp}=s^2$.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{CaF_2(s)\rightleftharpoons Ca^{2+}(aq)+2F^-(aq)}$, if molar solubility is $s$, then $K_{sp}$ is`,
        difficulty: 4,
        skillTags: ["molar_solubility", "ksp_stoichiometry"],
        choices: [L`$s^2$`, L`$2s^2$`, L`$4s^3$`, L`$s^3$`],
        correctLetter: "C",
        rationales: {
          A: "This misses both the fluoride coefficient and the cubic dependence.",
          B: "The fluoride concentration is $2s$, and it is squared.",
          D: "This misses the factor $4$ from $(2s)^2$.",
        },
        hints: ["$[Ca^{2+}]=s$.", "$[F^-]=2s$.", "$K_{sp}=s(2s)^2$."],
        solution: [
          {
            step: 1,
            explanation: "Write ion concentrations in terms of $s$.",
            math: L`[\mathrm{Ca^{2+}}]=s,\quad [\mathrm{F^-}]=2s`,
          },
          {
            step: 2,
            explanation: "Substitute into the solubility product.",
            math: L`K_{sp}=s(2s)^2=4s^3`,
          },
        ],
      },
      {
        questionLatex: L`The figure shows a sparingly soluble salt in contact with a saturated solution. At equilibrium, adding a soluble salt containing the common ion $\mathrm{X^-}$ will generally`,
        figure: solubilityProductFigure,
        difficulty: 3,
        skillTags: ["common_ion_effect", "solubility"],
        choices: [
          "increase the solubility of the solid salt",
          "decrease the solubility of the solid salt",
          "make $K_{sp}$ zero",
          "remove all ions from solution immediately",
        ],
        correctLetter: "B",
        rationales: {
          A: "A common ion shifts the dissolution equilibrium backward.",
          C: "$K_{sp}$ is fixed at a given temperature.",
          D: "The effect is a shift in equilibrium, not instant removal of all ions.",
        },
        hints: [
          "The added ion is already a product of dissolution.",
          "Le Chatelier's principle applies.",
          "Adding product suppresses further dissolution.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Adding $\\mathrm{X^-}$ increases a product ion concentration.",
          },
          {
            step: 2,
            explanation:
              "The equilibrium shifts towards the solid, so solubility decreases.",
          },
        ],
      },
      {
        questionLatex: L`For a salt $\mathrm{MX}$, $K_{sp}=1.0\times10^{-10}$. If a solution has $[\mathrm{M^+}]=2.0\times10^{-5}\text{ M}$ and $[\mathrm{X^-}]=3.0\times10^{-5}\text{ M}$, the solution is`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["ionic_product", "precipitation_condition"],
        choices: [
          "unsaturated; no precipitate forms",
          "saturated exactly; no shift is possible",
          "supersaturated; precipitation is favoured",
          "impossible because ion concentrations cannot be multiplied",
        ],
        correctLetter: "C",
        rationales: {
          A: "The ionic product is greater than $K_{sp}$, not less.",
          B: "Equality would require ionic product exactly equal to $K_{sp}$.",
          D: "The ionic product is precisely the product of relevant ion concentrations.",
        },
        hints: [
          "Calculate ionic product $Q_{sp}$.",
          "Compare $Q_{sp}$ with $K_{sp}$.",
          "If $Q_{sp}>K_{sp}$, precipitation is favoured.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate the ionic product.",
            math: L`Q_{sp}=(2.0\times10^{-5})(3.0\times10^{-5})=6.0\times10^{-10}`,
          },
          {
            step: 2,
            explanation:
              "$Q_{sp}>K_{sp}$, so the solution is supersaturated and precipitation is favoured.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is meant by the solubility product of a sparingly soluble salt?`,
        difficulty: 1,
        skillTags: ["solubility_product"],
        parts: singlePart(
          "a",
          "Give the definition using saturated-solution ion concentrations.",
          2,
        ),
        hints: [
          "It applies to a saturated solution.",
          "It involves ion concentrations.",
          "Each concentration is raised to its stoichiometric coefficient.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Defines solubility product as the product of ion concentrations in saturated solution, each raised to the appropriate power.",
        ),
        commonErrors: [
          "Including undissolved solid concentration in $K_{sp}$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Solubility product is the product of molar concentrations of ions in a saturated solution of a sparingly soluble salt, each raised to the power of its stoichiometric coefficient.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{BaSO_4(s)\rightleftharpoons Ba^{2+}(aq)+SO_4^{2-}(aq)}$, write $K_{sp}$ and express it in terms of molar solubility $s$ in pure water.`,
        difficulty: 3,
        skillTags: ["ksp_expression", "molar_solubility"],
        parts: [
          { letter: "a", promptMarkdown: "Write $K_{sp}$.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Express $K_{sp}$ in terms of $s$.",
            points: 2,
          },
        ],
        hints: [
          "The solid is omitted.",
          "The salt gives one barium ion and one sulphate ion.",
          "In pure water, both ion concentrations equal $s$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Writes $K_{sp}=[\\mathrm{Ba^{2+}}][\\mathrm{SO_4^{2-}}]$.",
            },
            { part: "b", points: 2, description: "Gives $K_{sp}=s^2$." },
          ],
        },
        commonErrors: ["Writing $K_{sp}=2s^2$ for a 1:1 salt."],
        workedSolution: [
          {
            part: "a",
            explanation: "$K_{sp}=[\\mathrm{Ba^{2+}}][\\mathrm{SO_4^{2-}}]$.",
          },
          {
            part: "b",
            explanation:
              "If molar solubility is $s$, then $[\\mathrm{Ba^{2+}}]=s$ and $[\\mathrm{SO_4^{2-}}]=s$, so $K_{sp}=s^2$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The solubility product of $\mathrm{AgCl}$ is $1.6\times10^{-10}$ at a certain temperature. Estimate its molar solubility in pure water.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["ksp_calculation", "molar_solubility"],
        parts: singlePart("a", "Calculate molar solubility.", 4),
        hints: [
          "For AgCl, $K_{sp}=s^2$.",
          "Take square root of $1.6\\times10^{-10}$.",
          "$\\sqrt{1.6}\\approx1.26$.",
        ],
        rubric: singleRubric(
          "a",
          4,
          "Finds $s\\approx1.26\\times10^{-5}\\text{ M}$.",
        ),
        commonErrors: ["Using $s=K_{sp}$ instead of square root."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $\\mathrm{AgCl}$, $K_{sp}=s^2$. Thus $s=\\sqrt{1.6\\times10^{-10}}\\approx1.26\\times10^{-5}\\text{ M}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For $\mathrm{PbCl_2(s)\rightleftharpoons Pb^{2+}(aq)+2Cl^-(aq)}$, let the molar solubility in pure water be $s$.`,
        difficulty: 4,
        skillTags: ["ksp_stoichiometry", "molar_solubility"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write ion concentrations in terms of $s$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write $K_{sp}$ in terms of $s$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain qualitatively what added $\\mathrm{NaCl}$ does to solubility.",
            points: 1,
          },
        ],
        hints: [
          "One formula unit gives one lead ion.",
          "One formula unit gives two chloride ions.",
          "Added chloride is a common ion.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Gives $[\\mathrm{Pb^{2+}}]=s$, $[\\mathrm{Cl^-}]=2s$.",
            },
            { part: "b", points: 2, description: "Gives $K_{sp}=4s^3$." },
            {
              part: "c",
              points: 1,
              description: "States added chloride decreases solubility.",
            },
          ],
        },
        commonErrors: [
          "Writing chloride concentration as $s$ instead of $2s$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$[\\mathrm{Pb^{2+}}]=s$ and $[\\mathrm{Cl^-}]=2s$.",
          },
          {
            part: "b",
            explanation:
              "$K_{sp}=[\\mathrm{Pb^{2+}}][\\mathrm{Cl^-}]^2=s(2s)^2=4s^3$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{NaCl}$ adds the common ion $\\mathrm{Cl^-}$, shifting equilibrium toward solid $\\mathrm{PbCl_2}$ and decreasing solubility.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A water sample is tested for precipitation of $\mathrm{AgCl}$. In trial P, $[\mathrm{Ag^+}]=1.0\times10^{-5}\text{ M}$ and $[\mathrm{Cl^-}]=1.0\times10^{-5}\text{ M}$. In trial Q, $[\mathrm{Ag^+}]=4.0\times10^{-5}\text{ M}$ and $[\mathrm{Cl^-}]=5.0\times10^{-5}\text{ M}$. Take $K_{sp}(\mathrm{AgCl})=1.8\times10^{-10}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["case_based", "ionic_product", "precipitation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $Q_{sp}$ for trial P.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State whether P precipitates.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find $Q_{sp}$ for trial Q.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "State whether Q precipitates and justify.",
            points: 2,
          },
        ],
        hints: [
          "$Q_{sp}=[Ag^+][Cl^-]$.",
          "Compare each value with $K_{sp}$.",
          "Precipitation is favoured when $Q_{sp}>K_{sp}$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1.0\\times10^{-10}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States no precipitate in P.",
            },
            { part: "c", points: 1, description: "Finds $2.0\\times10^{-9}$." },
            {
              part: "d",
              points: 2,
              description:
                "States precipitate forms in Q because $Q_{sp}>K_{sp}$.",
            },
          ],
        },
        commonErrors: [
          "Comparing ion concentration directly with $K_{sp}$ instead of ionic product.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For P, $Q_{sp}=(1.0\\times10^{-5})(1.0\\times10^{-5})=1.0\\times10^{-10}$.",
          },
          {
            part: "b",
            explanation:
              "$Q_{sp}<K_{sp}$, so P is unsaturated with respect to $\\mathrm{AgCl}$ and no precipitate forms.",
          },
          {
            part: "c",
            explanation:
              "For Q, $Q_{sp}=(4.0\\times10^{-5})(5.0\\times10^{-5})=2.0\\times10^{-9}$.",
          },
          {
            part: "d",
            explanation:
              "$Q_{sp}>K_{sp}$, so precipitation of $\\mathrm{AgCl}$ is favoured in trial Q.",
          },
        ],
      },
    ],
  },
];

const largeTopicExpansions: Record<
  string,
  { mc: readonly McSeed[]; constructed: readonly ConstructedSeed[] }
> = {
  "6.1": {
    mc: [
      {
        questionLatex: L`For $\mathrm{CaCO_3(s)\rightleftharpoons CaO(s)+CO_2(g)}$, the correct equilibrium constant expression is`,
        difficulty: 3,
        skillTags: ["heterogeneous_equilibrium", "kc_expression"],
        choices: [
          L`$K_c=[\mathrm{CO_2}]$`,
          L`$K_c=\frac{[\mathrm{CaO}][\mathrm{CO_2}]}{[\mathrm{CaCO_3}]}$`,
          L`$K_c=[\mathrm{CaCO_3}][\mathrm{CO_2}]$`,
          L`$K_c=\frac{1}{[\mathrm{CO_2}]}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Pure solids are not included in the equilibrium expression.",
          C: "This includes a pure solid and also misses the ratio form.",
          D: "The gaseous product appears in the numerator for the forward reaction.",
        },
        hints: [
          "Identify which species are pure solids.",
          "Pure solids have constant activity.",
          "Only carbon dioxide appears in the expression.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Pure solids are omitted from the expression for a heterogeneous equilibrium.",
          },
          { step: 2, explanation: L`Thus $K_c=[\mathrm{CO_2}]$.` },
        ],
      },
      {
        questionLatex: L`For $\mathrm{A(g)\rightleftharpoons B(g)}$, $K_c=9.0$ for the forward reaction at a given temperature. The value of $K_c$ for $\mathrm{B(g)\rightleftharpoons A(g)}$ at the same temperature is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["reverse_reaction", "equilibrium_constant"],
        choices: [L`$9.0$`, L`$-9.0$`, L`$1/9$`, L`$18$`],
        correctLetter: "C",
        rationales: {
          A: "Reversing the reaction reciprocates the equilibrium constant.",
          B: "Equilibrium constants are not made negative by reversing a reaction.",
          D: "This would correspond to doubling a reaction in a different way, not reversing it.",
        },
        hints: [
          "Write the two expressions.",
          "The second expression is the reciprocal of the first.",
          "Use $K_\\text{reverse}=1/K_\\text{forward}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For the reverse reaction, the ratio is inverted.",
            math: L`K_\mathrm{reverse}=\frac{1}{K_\mathrm{forward}}=\frac{1}{9}`,
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{H_2(g)+I_2(g)\rightleftharpoons 2HI(g)}$, which equality follows because the total gaseous mole count is the same on both sides?`,
        difficulty: 4,
        skillTags: ["kp_kc_relation", "gas_moles"],
        choices: [
          L`$K_p=K_cRT$`,
          L`$K_p=K_c/(RT)$`,
          L`$K_p=K_c$`,
          L`$K_p=K_c(RT)^2$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This assumes $\\Delta n_g=1$, but here gaseous moles are equal.",
          B: "This assumes $\\Delta n_g=-1$, which is not the case.",
          D: "This assumes $\\Delta n_g=2$, which is not the case.",
        },
        hints: [
          "Use $K_p=K_c(RT)^{\\Delta n_g}$.",
          "Count gaseous moles on both sides.",
          "$\\Delta n_g=2-2=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "The number of gaseous moles is two on each side.",
            math: L`\Delta n_g=2-(1+1)=0`,
          },
          {
            step: 2,
            explanation: L`Therefore $K_p=K_c(RT)^0=K_c$.`,
          },
        ],
      },
      {
        questionLatex: L`For a reaction at fixed temperature, $K_c=25$. A trial mixture has $Q_c=100$. The reaction will initially`,
        difficulty: 3,
        skillTags: ["reaction_quotient", "shift_direction"],
        choices: [
          "shift forward because $Q_c>K_c$",
          "shift backward because $Q_c>K_c$",
          "remain at equilibrium because $Q_c$ is positive",
          "change $K_c$ from $25$ to $100$",
        ],
        correctLetter: "B",
        rationales: {
          A: "When $Q>K$, the product-to-reactant ratio is too high, so the reverse direction is favoured.",
          C: "A positive quotient alone does not mean equilibrium.",
          D: "Changing the trial mixture changes $Q$, not $K$ at fixed temperature.",
        },
        hints: [
          "Compare $Q_c$ with $K_c$.",
          "$Q_c$ is larger than $K_c$.",
          "The mixture must reduce the product ratio.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$Q_c>K_c$, so the mixture contains too much product relative to equilibrium.",
          },
          {
            step: 2,
            explanation:
              "The reaction therefore shifts backward until $Q_c$ becomes equal to $K_c$.",
          },
        ],
      },
      {
        questionLatex: L`For a reaction at $298\ \mathrm{K}$, $K=1.0\times10^4$. Which statement about standard Gibbs energy change is correct?`,
        difficulty: 4,
        skillTags: ["gibbs_energy", "equilibrium_constant"],
        choices: [
          L`$\Delta G^\circ$ is positive`,
          L`$\Delta G^\circ$ is zero`,
          L`$\Delta G^\circ$ is negative`,
          L`$\Delta G^\circ$ cannot be related to $K$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "$K>1$ makes $\\ln K$ positive, so $-RT\\ln K$ is negative.",
          B: "$\\Delta G^\circ=0$ only when $K=1$.",
          D: "The syllabus relation is $\\Delta G^\circ=-RT\\ln K$.",
        },
        hints: [
          "Recall $\\Delta G^\circ=-RT\\ln K$.",
          "$K$ is greater than one.",
          "A positive logarithm multiplied by $-RT$ gives a negative value.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$K>1$, so $\\ln K>0$.",
          },
          {
            step: 2,
            explanation:
              "Since $\\Delta G^\circ=-RT\\ln K$, the standard Gibbs energy change is negative.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{PCl_5(g)\rightleftharpoons PCl_3(g)+Cl_2(g)}$, $K_c=0.040$ at a certain temperature. A mixture has $[\mathrm{PCl_5}]=0.20\,\mathrm{M}$, $[\mathrm{PCl_3}]=0.040\,\mathrm{M}$ and $[\mathrm{Cl_2}]=0.10\,\mathrm{M}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["reaction_quotient", "shift_direction"],
        parts: [
          { letter: "a", promptMarkdown: "Calculate $Q_c$.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Predict the initial direction of reaction.",
            points: 2,
          },
        ],
        hints: [
          "Use the same expression as $K_c$ but with present concentrations.",
          "$Q_c=[\\mathrm{PCl_3}][\\mathrm{Cl_2}]/[\\mathrm{PCl_5}]$.",
          "Compare $Q_c$ with $K_c$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $Q_c=0.020$." },
            {
              part: "b",
              points: 2,
              description: "Predicts forward shift because $Q_c<K_c$.",
            },
          ],
        },
        commonErrors: ["Using equilibrium constant value directly as $Q_c$."],
        workedSolution: [
          {
            part: "a",
            explanation: "$Q_c=(0.040)(0.10)/(0.20)=0.020$.",
          },
          {
            part: "b",
            explanation:
              "$Q_c<K_c$, so more product must form. The reaction shifts forward.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{2NO_2(g)\rightleftharpoons N_2O_4(g)}$, write the relation between $K_p$ and $K_c$.`,
        difficulty: 3,
        skillTags: ["kp_kc_relation", "gas_moles"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate $\\Delta n_g$ for the reaction.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write $K_p$ in terms of $K_c$, $R$ and $T$.",
            points: 2,
          },
        ],
        hints: [
          "Products have one mole of gas.",
          "Reactants have two moles of gas.",
          "Use $K_p=K_c(RT)^{\\Delta n_g}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Finds $\\Delta n_g=-1$." },
            {
              part: "b",
              points: 2,
              description: "Writes $K_p=K_c(RT)^{-1}=K_c/(RT)$.",
            },
          ],
        },
        commonErrors: [
          "Using reactant minus product moles instead of product minus reactant moles.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\Delta n_g=1-2=-1$.",
          },
          {
            part: "b",
            explanation: "Therefore $K_p=K_c(RT)^{-1}=K_c/(RT)$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`At a fixed temperature, what happens to $K_c$ when all concentrations in a non-equilibrium trial mixture are doubled before the reaction is allowed to proceed?`,
        difficulty: 2,
        skillTags: ["equilibrium_constant", "reaction_quotient"],
        parts: singlePart("a", "Answer with a reason.", 2),
        hints: [
          "Separate $K_c$ from $Q_c$.",
          "$Q_c$ depends on the trial mixture.",
          "$K_c$ depends only on temperature for a given reaction.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that $K_c$ is unchanged because temperature is unchanged.",
        ),
        commonErrors: [
          "Saying $K_c$ doubles whenever concentrations are doubled.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$K_c$ remains unchanged. The trial concentrations change $Q_c$, but for a given reaction $K_c$ changes only with temperature.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For $\mathrm{N_2(g)+3H_2(g)\rightleftharpoons 2NH_3(g)}$, an equilibrium mixture at a fixed temperature has $[\mathrm{N_2}]=0.50\,\mathrm{M}$, $[\mathrm{H_2}]=1.0\,\mathrm{M}$ and $[\mathrm{NH_3}]=0.20\,\mathrm{M}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["kc_calculation", "reaction_quotient"],
        parts: [
          { letter: "a", promptMarkdown: "Calculate $K_c$.", points: 2 },
          {
            letter: "b",
            promptMarkdown:
              "If another mixture at the same temperature has $Q_c=0.20$, state the direction of shift.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State whether $K_c$ is large or small for product formation in this example.",
            points: 1,
          },
        ],
        hints: [
          "Write $K_c=[\\mathrm{NH_3}]^2/([\\mathrm{N_2}][\\mathrm{H_2}]^3)$.",
          "Compare the second mixture's $Q_c$ with your $K_c$.",
          "If $Q_c>K_c$, the shift is backward.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Finds $K_c=0.080$." },
            {
              part: "b",
              points: 2,
              description: "Predicts backward shift because $Q_c>K_c$.",
            },
            {
              part: "c",
              points: 1,
              description: "States product formation is not strongly favoured.",
            },
          ],
        },
        commonErrors: ["Forgetting to cube the hydrogen concentration."],
        workedSolution: [
          {
            part: "a",
            explanation: "$K_c=(0.20)^2/[(0.50)(1.0)^3]=0.040/0.50=0.080$.",
          },
          {
            part: "b",
            explanation: "Since $Q_c=0.20>K_c$, the mixture shifts backward.",
          },
          {
            part: "c",
            explanation:
              "Here $K_c<1$, so products are not strongly favoured at this temperature.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Three sealed flasks contain the same reversible reaction at the same temperature. For the reaction, $K_c=5.0$. Flask A has $Q_c=1.0$, flask B has $Q_c=5.0$, and flask C has $Q_c=12.0$.`,
        difficulty: 4,
        skillTags: ["case_based", "reaction_quotient", "equilibrium_constant"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the shift in flask A.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the shift in flask B.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State the shift in flask C.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Which value remains common to all three flasks at this temperature?",
            points: 2,
          },
        ],
        hints: [
          "Compare each quotient with $5.0$.",
          "$Q<K$ means forward; $Q>K$ means backward.",
          "The equilibrium constant is fixed at fixed temperature.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Forward." },
            { part: "b", points: 1, description: "No shift/equilibrium." },
            { part: "c", points: 1, description: "Backward." },
            {
              part: "d",
              points: 2,
              description: "States $K_c=5.0$ remains common.",
            },
          ],
        },
        commonErrors: ["Treating each $Q_c$ as a new equilibrium constant."],
        workedSolution: [
          { part: "a", explanation: "A has $Q_c<K_c$, so it shifts forward." },
          {
            part: "b",
            explanation: "B has $Q_c=K_c$, so it is at equilibrium.",
          },
          { part: "c", explanation: "C has $Q_c>K_c$, so it shifts backward." },
          {
            part: "d",
            explanation:
              "The common value is $K_c=5.0$ because the temperature and reaction are the same.",
          },
        ],
      },
    ],
  },
  "6.2": {
    mc: [
      {
        questionLatex: L`For $\mathrm{PCl_5(g)\rightleftharpoons PCl_3(g)+Cl_2(g)}$, decreasing volume at constant temperature favours`,
        difficulty: 3,
        skillTags: ["pressure_effect", "le_chateliers_principle"],
        choices: [
          L`$\mathrm{PCl_5}$ formation`,
          L`$\mathrm{PCl_3}$ and $\mathrm{Cl_2}$ formation`,
          "no shift because all species are gases",
          "a larger value of $K_c$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The product side has more gaseous moles.",
          C: "Gas equilibria respond to pressure when gaseous mole counts differ.",
          D: "At constant temperature, the equilibrium constant is unchanged.",
        },
        hints: [
          "Decreasing volume increases pressure.",
          "Higher pressure favours fewer gas moles.",
          "The left side has one mole of gas; the right side has two.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The left side has fewer gaseous moles, so increased pressure favours the left side.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{2SO_2(g)+O_2(g)\rightleftharpoons 2SO_3(g)}$, the forward reaction is exothermic. Raising temperature at constant pressure will`,
        difficulty: 4,
        skillTags: ["temperature_effect", "exothermic_equilibrium"],
        choices: [
          L`increase $\mathrm{SO_3}$ yield`,
          L`decrease $\mathrm{SO_3}$ yield`,
          "have no effect on equilibrium composition",
          "change the balanced equation",
        ],
        correctLetter: "B",
        rationales: {
          A: "Heating favours the endothermic direction, which is reverse here.",
          C: "Temperature changes can change equilibrium composition and $K$.",
          D: "A temperature change does not alter stoichiometric coefficients.",
        },
        hints: [
          "For an exothermic forward reaction, heat behaves like a product.",
          "Adding heat favours the direction that consumes heat.",
          "The reverse direction is endothermic.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Heating favours the reverse, endothermic direction, so sulphur trioxide yield decreases.",
          },
        ],
      },
      {
        questionLatex: L`A small amount of inert gas is added to an equilibrium gas mixture at constant volume and temperature. The equilibrium position generally`,
        difficulty: 4,
        skillTags: ["inert_gas", "pressure_effect"],
        choices: [
          "shifts to the side with fewer moles",
          "shifts to the side with more moles",
          "does not shift because partial pressures of reacting gases are unchanged",
          "always shifts to products",
        ],
        correctLetter: "C",
        rationales: {
          A: "Total pressure rises, but reacting-gas partial pressures are unchanged at constant volume.",
          B: "That applies to some constant-pressure dilution cases, not this condition.",
          D: "There is no universal product-side shift.",
        },
        hints: [
          "Check whether volume changes.",
          "At constant volume, moles of reacting gases per volume are unchanged.",
          "The reaction quotient for reacting gases is unchanged.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At constant volume and temperature, adding inert gas does not change partial pressures of the reacting gases.",
          },
          {
            step: 2,
            explanation:
              "So $Q$ remains unchanged and the equilibrium position does not shift.",
          },
        ],
      },
      {
        questionLatex: L`For $\mathrm{Fe^{3+}+SCN^-\rightleftharpoons FeSCN^{2+}}$, adding $\mathrm{SCN^-}$ makes the red colour deeper. This observation supports`,
        difficulty: 3,
        skillTags: ["concentration_effect", "experimental_observation"],
        choices: [
          "a shift towards reactants",
          "a shift towards product",
          "complete stopping of the reverse reaction",
          "decomposition of the product by catalyst",
        ],
        correctLetter: "B",
        rationales: {
          A: "A deeper red colour indicates more red product, not less.",
          C: "Equilibrium shifts do not mean one microscopic reaction stops completely.",
          D: "No catalyst effect is described.",
        },
        hints: [
          "Identify which species gives red colour.",
          "More red colour means more product ion.",
          "Adding a reactant favours product formation.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Adding thiocyanate ion increases a reactant concentration, so the system shifts forward and forms more red product.",
          },
        ],
      },
      {
        questionLatex: L`Which change can alter the numerical value of $K_c$ for a given reversible reaction?`,
        difficulty: 2,
        skillTags: ["equilibrium_constant", "temperature_effect"],
        choices: [
          "adding a catalyst",
          "changing temperature",
          "adding more pure solid",
          "choosing a different initial mixture at the same temperature",
        ],
        correctLetter: "B",
        rationales: {
          A: "A catalyst changes rates but not the equilibrium constant.",
          C: "Pure solids do not affect $K_c$.",
          D: "Initial mixture affects $Q$, not $K$ at the same temperature.",
        },
        hints: [
          "For a given reaction, $K$ is temperature-dependent.",
          "Catalysts change the rate of attainment.",
          "Initial concentration changes the reaction quotient.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Only temperature changes the equilibrium constant for a given reaction.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{N_2(g)+3H_2(g)\rightleftharpoons 2NH_3(g)}$, predict the effect of adding hydrogen at constant temperature.`,
        difficulty: 3,
        skillTags: ["concentration_effect", "le_chateliers_principle"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the direction of shift.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain using Le Chatelier's principle.",
            points: 3,
          },
        ],
        hints: [
          "Hydrogen is a reactant.",
          "The system tends to consume the added species.",
          "Consuming hydrogen means moving forward.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Predicts forward shift." },
            {
              part: "b",
              points: 3,
              description:
                "Explains that the system consumes added hydrogen by forming more ammonia.",
            },
          ],
        },
        commonErrors: ["Saying adding a reactant always changes $K_c$."],
        workedSolution: [
          { part: "a", explanation: "The equilibrium shifts forward." },
          {
            part: "b",
            explanation:
              "Adding hydrogen increases a reactant concentration. The system reduces this stress by consuming hydrogen and producing more ammonia.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{H_2(g)+I_2(g)\rightleftharpoons 2HI(g)}$, explain why increasing pressure at constant temperature does not shift the equilibrium.`,
        difficulty: 3,
        skillTags: ["pressure_effect", "gas_moles"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Count gaseous moles on both sides.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Use the count to state the pressure effect.",
            points: 2,
          },
        ],
        hints: [
          "Reactant side has one mole each of hydrogen and iodine.",
          "Product side has two moles of hydrogen iodide.",
          "Pressure has no preferred side when gas mole count is equal.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Counts two gas moles on each side.",
            },
            {
              part: "b",
              points: 2,
              description: "States no shift due to pressure change.",
            },
          ],
        },
        commonErrors: ["Assuming pressure always favours product formation."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Reactants have $1+1=2$ gaseous moles and products have $2$ gaseous moles.",
          },
          {
            part: "b",
            explanation:
              "Since gaseous mole count is equal, increasing pressure does not shift the equilibrium.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Why does a catalyst not change the equilibrium yield of a reaction?`,
        difficulty: 2,
        skillTags: ["catalyst_effect", "equilibrium"],
        parts: singlePart("a", "Give the reason.", 2),
        hints: [
          "A catalyst changes activation energy.",
          "It affects both forward and reverse reactions.",
          "It does not change $K$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that a catalyst speeds forward and reverse reactions equally in terms of reaching equilibrium and does not change $K$.",
        ),
        commonErrors: [
          "Saying catalyst increases product yield at equilibrium.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A catalyst changes the rate at which equilibrium is reached, but it does not change the equilibrium constant or final equilibrium composition.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For $\mathrm{N_2O_4(g)\rightleftharpoons 2NO_2(g)}$, the forward reaction is endothermic and $\mathrm{NO_2}$ is brown. Predict the visible effect of each change.`,
        difficulty: 5,
        skillTags: [
          "temperature_effect",
          "pressure_effect",
          "colour_equilibrium",
        ],
        parts: [
          { letter: "a", promptMarkdown: "Heating the mixture.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Compressing the mixture at constant temperature.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Adding a catalyst.", points: 1 },
        ],
        hints: [
          "Brown colour comes from nitrogen dioxide.",
          "Heating favours the endothermic direction.",
          "Compression favours fewer gas moles.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Brown colour deepens due forward shift.",
            },
            {
              part: "b",
              points: 2,
              description: "Brown colour fades due reverse shift.",
            },
            { part: "c", points: 1, description: "No final colour change." },
          ],
        },
        commonErrors: [
          "Mixing up the colourless dimer with brown nitrogen dioxide.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Heating favours the endothermic forward direction, producing more brown $\\mathrm{NO_2}$.",
          },
          {
            part: "b",
            explanation:
              "Compression favours the side with fewer gaseous moles, $\\mathrm{N_2O_4}$, so brown colour fades.",
          },
          {
            part: "c",
            explanation:
              "A catalyst changes the rate of attainment but not the equilibrium composition, so the final colour is unchanged.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sealed vessel contains $\mathrm{CO(g)+Cl_2(g)\rightleftharpoons COCl_2(g)}$. Formation of $\mathrm{COCl_2}$ is exothermic. A student tries four changes: adding $\mathrm{CO}$, raising temperature, compressing the vessel, and adding catalyst.`,
        difficulty: 5,
        skillTags: ["case_based", "mixed_stress", "le_chateliers_principle"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Effect of adding $\\mathrm{CO}$ on product amount.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Effect of raising temperature on product amount.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Effect of compression on product amount.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown: "Effect of catalyst on equilibrium amount.",
            points: 1,
          },
        ],
        hints: [
          "Adding a reactant tends to consume it.",
          "For an exothermic forward reaction, heat is like a product.",
          "Compression favours fewer gas moles.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Product increases." },
            { part: "b", points: 1, description: "Product decreases." },
            {
              part: "c",
              points: 2,
              description:
                "Product increases because right side has fewer gas moles.",
            },
            {
              part: "d",
              points: 1,
              description: "No equilibrium amount change.",
            },
          ],
        },
        commonErrors: [
          "Treating every stress as if it favours the same direction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Adding $\\mathrm{CO}$ shifts equilibrium forward, so product increases.",
          },
          {
            part: "b",
            explanation:
              "Raising temperature favours the reverse endothermic direction, so product decreases.",
          },
          {
            part: "c",
            explanation:
              "Reactants have two gas moles and product has one. Compression favours $\\mathrm{COCl_2}$ formation.",
          },
          {
            part: "d",
            explanation: "A catalyst does not change the equilibrium amount.",
          },
        ],
      },
    ],
  },
  "6.3": {
    mc: [
      {
        questionLatex: L`The pH of $0.010\,\mathrm{M}\ \mathrm{Ba(OH)_2}$, assuming complete dissociation, is closest to`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["strong_base_ph", "stoichiometry"],
        choices: [L`$2.00$`, L`$12.00$`, L`$12.30$`, L`$1.70$`],
        correctLetter: "C",
        rationales: {
          A: "This treats hydroxide concentration like acid concentration.",
          B: "This ignores that each formula unit supplies two hydroxide ions.",
          D: "This is the pOH, not the pH.",
        },
        hints: [
          "Each $\\mathrm{Ba(OH)_2}$ gives two $\\mathrm{OH^-}$ ions.",
          "$[\\mathrm{OH^-}]=0.020\\,\\mathrm{M}$.",
          "Find pOH first, then use $\\mathrm{pH}+\\mathrm{pOH}=14$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$[\\mathrm{OH^-}]=2(0.010)=0.020\\,\\mathrm{M}$.",
          },
          {
            step: 2,
            explanation:
              "$\\mathrm{pOH}=-\\log(0.020)\\approx1.70$, so $\\mathrm{pH}=14-1.70=12.30$.",
          },
        ],
      },
      {
        questionLatex: L`For a weak monoprotic acid of concentration $0.10\,\mathrm{M}$ and $K_a=1.0\times10^{-5}$, the approximate degree of ionisation is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["weak_acid", "degree_ionisation"],
        choices: [L`$0.1\%$`, L`$1.0\%$`, L`$10\%$`, L`$50\%$`],
        correctLetter: "B",
        rationales: {
          A: "This is too small by a factor of ten.",
          C: "This would give $K_a$ about $10^{-3}$, not $10^{-5}$.",
          D: "The weak-acid approximation would not support such large ionisation.",
        },
        hints: [
          "Use $K_a\\approx C\\alpha^2$.",
          "$\\alpha\\approx\\sqrt{K_a/C}$.",
          "$\\sqrt{10^{-4}}=10^{-2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\alpha=\\sqrt{(1.0\\times10^{-5})/0.10}=\\sqrt{10^{-4}}=10^{-2}$.",
          },
          {
            step: 2,
            explanation: "So the degree of ionisation is about $1.0\\%$.",
          },
        ],
      },
      {
        questionLatex: L`For a diprotic acid $\mathrm{H_2A}$, the second ionisation is usually much smaller than the first mainly because`,
        difficulty: 3,
        skillTags: ["polybasic_acids", "ionisation_constant"],
        choices: [
          "the first ionisation produces a negatively charged ion that holds the remaining proton more strongly",
          "the second proton has no charge",
          "water cannot accept more than one proton",
          "the acid becomes a strong base after first ionisation",
        ],
        correctLetter: "A",
        rationales: {
          B: "A proton is always positively charged.",
          C: "Water can accept protons in acid-base reactions.",
          D: "The conjugate species need not become a strong base in that sense.",
        },
        hints: [
          "After first ionisation, the species is an anion.",
          "Removing a proton from an anion is less favourable.",
          "Thus $K_{a2}<K_{a1}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "After losing one proton, $\\mathrm{HA^-}$ is negatively charged and holds the remaining proton more strongly.",
          },
        ],
      },
      {
        questionLatex: L`Equal volumes of $0.10\,\mathrm{M}\ \mathrm{HCl}$ and $0.10\,\mathrm{M}\ \mathrm{NaOH}$ are mixed at $25^\circ\mathrm{C}$. The resulting solution is approximately`,
        difficulty: 3,
        skillTags: ["neutralisation", "ph"],
        choices: ["acidic", "basic", "neutral", "buffered"],
        correctLetter: "C",
        rationales: {
          A: "The acid and base have equal moles and neutralise completely.",
          B: "There is no excess strong base.",
          D: "A strong acid and strong base salt mixture is not a buffer.",
        },
        hints: [
          "Compare moles, not only concentrations.",
          "Equal volumes and equal molarity give equal moles.",
          "Strong acid and strong base neutralise to salt and water.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Equal moles of $\\mathrm{H^+}$ and $\\mathrm{OH^-}$ react completely.",
          },
          {
            step: 2,
            explanation:
              "The resulting $\\mathrm{NaCl}$ solution is approximately neutral at $25^\circ\\mathrm{C}$.",
          },
        ],
      },
      {
        questionLatex: L`For the weak base $\mathrm{NH_3(aq)+H_2O(l)\rightleftharpoons NH_4^+(aq)+OH^-(aq)}$, the expression for $K_b$ is`,
        difficulty: 3,
        skillTags: ["base_ionisation", "kb_expression"],
        choices: [
          L`$K_b=\frac{[\mathrm{NH_4^+}][\mathrm{OH^-}]}{[\mathrm{NH_3}]}$`,
          L`$K_b=\frac{[\mathrm{NH_3}]}{[\mathrm{NH_4^+}][\mathrm{OH^-}]}$`,
          L`$K_b=[\mathrm{NH_4^+}]+[\mathrm{OH^-}]$`,
          L`$K_b=\frac{[\mathrm{NH_4^+}][\mathrm{OH^-}]}{[\mathrm{H_2O}]}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the reciprocal expression.",
          C: "Equilibrium expressions multiply concentrations with powers; they are not sums.",
          D: "Pure liquid water is omitted from the expression.",
        },
        hints: [
          "Products go in numerator.",
          "Weak base remains in denominator.",
          "Pure liquid water is not included.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Water is a pure liquid and is omitted, so $K_b=[\\mathrm{NH_4^+}][\\mathrm{OH^-}]/[\\mathrm{NH_3}]$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`Calculate the pH of $0.0050\,\mathrm{M}\ \mathrm{NaOH}$ at $25^\circ\mathrm{C}$, assuming complete dissociation.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["strong_base_ph"],
        parts: [
          { letter: "a", promptMarkdown: "Find the pOH.", points: 2 },
          { letter: "b", promptMarkdown: "Find the pH.", points: 2 },
        ],
        hints: [
          "$[\\mathrm{OH^-}]=0.0050\\,\\mathrm{M}$.",
          "$\\mathrm{pOH}=-\\log[\\mathrm{OH^-}]$.",
          "Use $\\mathrm{pH}=14-\\mathrm{pOH}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $\\mathrm{pOH}\\approx2.30$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $\\mathrm{pH}\\approx11.70$.",
            },
          ],
        },
        commonErrors: ["Reporting pOH as pH."],
        workedSolution: [
          {
            part: "a",
            explanation: "$\\mathrm{pOH}=-\\log(5.0\\times10^{-3})\\approx2.30$.",
          },
          { part: "b", explanation: "$\\mathrm{pH}=14.00-2.30=11.70$." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A weak monoprotic acid has $C=0.20\,\mathrm{M}$ and degree of ionisation $\alpha=2.0\%$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["weak_acid", "degree_ionisation", "ka_calculation"],
        parts: [
          { letter: "a", promptMarkdown: "Find $[H^+]$.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Estimate $K_a$ using $K_a\\approx C\\alpha^2$.",
            points: 2,
          },
        ],
        hints: [
          "Convert percent ionisation to decimal.",
          "$[H^+]=C\\alpha$.",
          "Use $K_a\\approx C\\alpha^2$ for small $\\alpha$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $[H^+]=4.0\\times10^{-3}\\,\\mathrm{M}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $K_a=8.0\\times10^{-5}$.",
            },
          ],
        },
        commonErrors: ["Using $2.0$ instead of $0.020$ for $\\alpha$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\alpha=0.020$, so $[H^+]=0.20(0.020)=4.0\\times10^{-3}\\,\\mathrm{M}$.",
          },
          {
            part: "b",
            explanation: "$K_a\\approx0.20(0.020)^2=8.0\\times10^{-5}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A solution is made by mixing $100\,\mathrm{mL}$ of $0.10\,\mathrm{M}\ \mathrm{HCl}$ with $50\,\mathrm{mL}$ of $0.10\,\mathrm{M}\ \mathrm{NaOH}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["neutralisation", "ph_calculation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find excess moles of acid.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find approximate pH of the final solution.",
            points: 2,
          },
        ],
        hints: [
          "Convert volumes to litres.",
          "Subtract moles of base from moles of acid.",
          "Divide excess acid moles by total volume.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $5.0\\times10^{-3}$ mol excess acid.",
            },
            { part: "b", points: 2, description: "Finds pH about $1.48$." },
          ],
        },
        commonErrors: [
          "Dividing by only the acid volume instead of total volume.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Moles acid $=0.100(0.10)=0.0100$ mol; moles base $=0.050(0.10)=0.0050$ mol, so excess acid is $0.0050$ mol.",
          },
          {
            part: "b",
            explanation:
              "Total volume $=0.150\\,\\mathrm{L}$, so $[H^+]=0.0050/0.150=0.0333\\,\\mathrm{M}$ and $\\mathrm{pH}\\approx1.48$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Why is $K_{a2}$ of a diprotic acid usually smaller than $K_{a1}$?`,
        difficulty: 3,
        skillTags: ["polybasic_acids", "acid_strength"],
        parts: singlePart("a", "Give the reason.", 2),
        hints: [
          "Compare removing a proton from a neutral acid and from an anion.",
          "The second step starts from a negatively charged ion.",
          "A negative ion holds the remaining proton more strongly.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Explains that the second proton is removed from an anion and is therefore less easily ionised.",
        ),
        commonErrors: ["Saying the second proton has lower mass or no charge."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "After the first ionisation, the acid particle is negatively charged. Removing another proton from this anion is less favourable, so $K_{a2}<K_{a1}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two $0.10\,\mathrm{M}$ acid solutions are compared. Solution P has pH $1.00$. Solution Q has pH $2.50$. Both acids are monoprotic.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["case_based", "acid_strength", "degree_ionisation"],
        parts: [
          { letter: "a", promptMarkdown: "Which acid is stronger?", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find $[H^+]$ in solution Q.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Estimate percent ionisation of acid Q.",
            points: 2,
          },
        ],
        hints: [
          "Lower pH means larger hydrogen ion concentration.",
          "$[H^+]=10^{-\\mathrm{pH}}$.",
          "Percent ionisation is $[H^+]/C\\times100$ for a monoprotic acid.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies P as stronger." },
            {
              part: "b",
              points: 2,
              description: "Finds $[H^+]\\approx3.16\\times10^{-3}\\,\\mathrm{M}$.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds percent ionisation about $3.16\\%$.",
            },
          ],
        },
        commonErrors: [
          "Comparing pH values directly as if higher pH means stronger acid.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P is stronger because it has the lower pH at the same concentration.",
          },
          {
            part: "b",
            explanation:
              "For Q, $[H^+]=10^{-2.50}=3.16\\times10^{-3}\\,\\mathrm{M}$.",
          },
          {
            part: "c",
            explanation:
              "Percent ionisation $=(3.16\\times10^{-3}/0.10)\\times100=3.16\\%$.",
          },
        ],
      },
    ],
  },
  "6.4": {
    mc: [
      {
        questionLatex: L`An acidic buffer has $pK_a=4.76$ and $[\text{salt}]/[\text{acid}]=10$. Its pH is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["henderson_equation", "buffer_ph"],
        choices: [L`$3.76$`, L`$4.76$`, L`$5.76$`, L`$10.0$`],
        correctLetter: "C",
        rationales: {
          A: "This uses the reciprocal ratio.",
          B: "pH equals $pK_a$ only when salt and acid concentrations are equal.",
          D: "The logarithm of $10$ is $1$, not $10$.",
        },
        hints: [
          "Use $\\mathrm{pH}=pK_a+\\log([\\text{salt}]/[\\text{acid}])$.",
          "$\\log 10=1$.",
          "Add this value to $4.76$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$\\mathrm{pH}=4.76+\\log 10=4.76+1.00=5.76$.",
          },
        ],
      },
      {
        questionLatex: L`A buffer is most effective when the desired pH is`,
        difficulty: 2,
        skillTags: ["buffer_selection", "henderson_equation"],
        choices: [
          "very far below the acid's $pK_a$",
          "close to the acid's $pK_a$",
          "always exactly $14$",
          "unrelated to $pK_a$",
        ],
        correctLetter: "B",
        rationales: {
          A: "A very unequal acid/base ratio gives poor buffering range.",
          C: "Most buffers do not operate near pH 14.",
          D: "Henderson equation directly links pH and $pK_a$.",
        },
        hints: [
          "Think of comparable acid and conjugate-base concentrations.",
          "Equal concentrations give pH equal to $pK_a$.",
          "The useful range is around $pK_a$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A buffer works best when weak acid and conjugate base are comparable, which gives pH near $pK_a$.",
          },
        ],
      },
      {
        questionLatex: L`An aqueous solution of $\mathrm{NH_4Cl}$ is acidic mainly because`,
        difficulty: 3,
        skillTags: ["salt_hydrolysis", "acidic_salt"],
        choices: [
          L`$\mathrm{Cl^-}$ hydrolyses to give $\mathrm{OH^-}$`,
          L`$\mathrm{NH_4^+}$ hydrolyses to give $\mathrm{H_3O^+}$`,
          L`$\mathrm{Na^+}$ hydrolyses strongly`,
          "both ions come from strong electrolytes",
        ],
        correctLetter: "B",
        rationales: {
          A: "$\\mathrm{Cl^-}$ is the conjugate base of a strong acid and is essentially neutral.",
          C: "There is no sodium ion in ammonium chloride.",
          D: "The ammonium ion comes from a weak base and can hydrolyse.",
        },
        hints: [
          "Identify the parent acid and base.",
          "$\\mathrm{NH_4^+}$ is the conjugate acid of weak base ammonia.",
          "Its hydrolysis produces hydronium ions.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\mathrm{NH_4^+}$ donates a proton to water, producing $\\mathrm{H_3O^+}$ and making the solution acidic.",
          },
        ],
      },
      {
        questionLatex: L`When a small amount of strong acid is added to an acetate buffer, the main reaction that resists pH change is`,
        difficulty: 3,
        skillTags: ["buffer_action", "common_ion"],
        choices: [
          L`$\mathrm{CH_3COO^-+H^+\rightarrow CH_3COOH}$`,
          L`$\mathrm{CH_3COOH\rightarrow CH_3COO^-+H^+}$ only`,
          L`$\mathrm{Na^++OH^-\rightarrow NaOH}$`,
          L`$\mathrm{H^++Cl^-\rightarrow HCl}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This would release more hydrogen ions instead of consuming the added acid.",
          C: "Sodium ions are spectator ions here.",
          D: "Chloride is a spectator ion from the added strong acid.",
        },
        hints: [
          "The conjugate base component handles added acid.",
          "Acetate ion consumes added hydrogen ions.",
          "The product is weak acetic acid.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The acetate ion combines with added $\\mathrm{H^+}$ to form weak acetic acid, limiting the pH drop.",
          },
        ],
      },
      {
        questionLatex: L`For a basic buffer made from weak base $\mathrm{B}$ and its salt $\mathrm{BH^+Cl^-}$, the Henderson form is`,
        difficulty: 4,
        skillTags: ["basic_buffer", "henderson_equation"],
        choices: [
          L`$\mathrm{pOH}=pK_b+\log\frac{[\text{salt}]}{[\text{base}]}$`,
          L`$\mathrm{pH}=pK_b+\log\frac{[\text{salt}]}{[\text{base}]}$`,
          L`$\mathrm{pOH}=pK_b+\log\frac{[\text{base}]}{[\text{salt}]}$`,
          L`$\mathrm{pH}=pK_a+\log[\text{base}][\text{salt}]$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The direct weak-base buffer equation gives pOH, not pH.",
          C: "The salt/base ratio is inverted.",
          D: "This is not the Henderson form for a basic buffer.",
        },
        hints: [
          "Basic buffers are usually written in pOH form.",
          "The conjugate-acid salt appears in the numerator.",
          "Then pH can be found from $14-\\mathrm{pOH}$ if needed.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a weak base buffer, $\\mathrm{pOH}=pK_b+\\log([\\text{salt}]/[\\text{base}])$.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`An acetic acid-acetate buffer has $pK_a=4.76$, $[\mathrm{CH_3COOH}]=0.050\,\mathrm{M}$ and $[\mathrm{CH_3COONa}]=0.20\,\mathrm{M}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["henderson_equation", "buffer_ph"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the salt-to-acid ratio.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Calculate the pH.", points: 3 },
        ],
        hints: [
          "Use salt divided by acid.",
          "The ratio is $4$.",
          "$\\log 4\\approx0.60$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds ratio $4$." },
            { part: "b", points: 3, description: "Finds pH about $5.36$." },
          ],
        },
        commonErrors: [
          "Using acid/salt instead of salt/acid in the logarithm.",
        ],
        workedSolution: [
          { part: "a", explanation: "The ratio is $0.20/0.050=4$." },
          {
            part: "b",
            explanation: "$\\mathrm{pH}=4.76+\\log 4=4.76+0.60=5.36$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student needs a buffer near pH $5.0$. Two weak acids are available: acid X with $pK_a=2.2$ and acid Y with $pK_a=4.8$.`,
        difficulty: 3,
        skillTags: ["buffer_selection", "application"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Choose the better acid for the buffer.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Justify the choice.", points: 3 },
        ],
        hints: [
          "A useful buffer has pH near $pK_a$.",
          "Compare $5.0$ with both $pK_a$ values.",
          "$4.8$ is closer to $5.0$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Chooses acid Y." },
            {
              part: "b",
              points: 3,
              description:
                "Explains that buffer range is best near $pK_a$ and $4.8$ is close to $5.0$.",
            },
          ],
        },
        commonErrors: [
          "Choosing the acid with the smaller $pK_a$ simply because it is stronger.",
        ],
        workedSolution: [
          { part: "a", explanation: "Acid Y is better." },
          {
            part: "b",
            explanation:
              "A buffer is most effective when the target pH is close to the weak acid's $pK_a$. Since $4.8$ is close to $5.0$, acid Y is suitable.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`Why does adding $\mathrm{CH_3COONa}$ to acetic acid suppress ionisation of acetic acid?`,
        difficulty: 3,
        skillTags: ["common_ion_effect", "weak_acid"],
        parts: singlePart("a", "Explain the common-ion effect.", 2),
        hints: [
          "Sodium acetate supplies acetate ions.",
          "Acetate is already a product in acetic acid ionisation.",
          "Adding product shifts equilibrium backward.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Explains that added acetate ion shifts acetic acid ionisation backward.",
        ),
        commonErrors: ["Saying sodium ion neutralises the acid directly."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{CH_3COONa}$ supplies the common ion $\\mathrm{CH_3COO^-}$. This shifts $\\mathrm{CH_3COOH\\rightleftharpoons H^+ + CH_3COO^-}$ backward and suppresses ionisation.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Classify the aqueous solutions of $\mathrm{Na_2CO_3}$, $\mathrm{KNO_3}$ and $\mathrm{AlCl_3}$ as acidic, basic or neutral. Give one reason for each.`,
        difficulty: 5,
        skillTags: ["salt_hydrolysis", "classification"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Classify $\\mathrm{Na_2CO_3}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Classify $\\mathrm{KNO_3}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Classify $\\mathrm{AlCl_3}$.",
            points: 2,
          },
        ],
        hints: [
          "Trace each salt to its parent acid and base.",
          "An anion of a weak acid gives a basic solution.",
          "A highly charged small cation can make solution acidic by hydrolysis.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Basic; carbonate is from weak carbonic acid.",
            },
            {
              part: "b",
              points: 1,
              description: "Neutral; strong acid and strong base salt.",
            },
            {
              part: "c",
              points: 2,
              description: "Acidic; hydrated aluminium ion hydrolyses.",
            },
          ],
        },
        commonErrors: ["Classifying every chloride salt as neutral."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{Na_2CO_3}$ is basic because $\\mathrm{CO_3^{2-}}$ is from weak carbonic acid and hydrolyses to produce $\\mathrm{OH^-}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{KNO_3}$ is approximately neutral because it comes from strong base $\\mathrm{KOH}$ and strong acid $\\mathrm{HNO_3}$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{AlCl_3}$ is acidic because the hydrated $\\mathrm{Al^{3+}}$ ion undergoes hydrolysis and releases $\\mathrm{H^+}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two solutions have initial pH $4.76$. Solution A is an acetic acid-acetate buffer with equal acid and salt concentrations. Solution B is adjusted to pH $4.76$ using dilute acid only. A small amount of $\mathrm{HCl}$ is added to both.`,
        difficulty: 5,
        skillTags: ["case_based", "buffer_action", "ph_change"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Which solution shows smaller pH change?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the main reaction in solution A.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Explain why solution B changes more.",
            points: 2,
          },
        ],
        hints: [
          "Only one solution contains a conjugate acid-base pair.",
          "Acetate ion consumes added hydrogen ion.",
          "A non-buffer lacks a reserve of conjugate base.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Identifies solution A." },
            {
              part: "b",
              points: 2,
              description: "Writes acetate reacting with hydrogen ion.",
            },
            {
              part: "c",
              points: 2,
              description: "Explains lack of conjugate-base reserve in B.",
            },
          ],
        },
        commonErrors: [
          "Assuming equal initial pH means equal resistance to pH change.",
        ],
        workedSolution: [
          { part: "a", explanation: "Solution A shows the smaller pH change." },
          {
            part: "b",
            explanation:
              "$\\mathrm{CH_3COO^-+H^+\\rightarrow CH_3COOH}$ consumes much of the added acid.",
          },
          {
            part: "c",
            explanation:
              "Solution B has the same initial pH but no conjugate base reservoir, so added acid directly increases $[H^+]$ much more.",
          },
        ],
      },
    ],
  },
  "6.5": {
    mc: [
      {
        questionLatex: L`For $\mathrm{AgCl}$, $K_{sp}=1.6\times10^{-10}$. In $0.010\,\mathrm{M}\ \mathrm{NaCl}$, the approximate molar solubility of $\mathrm{AgCl}$ is`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["common_ion_effect", "ksp_calculation"],
        choices: [
          L`$1.6\times10^{-8}\,\mathrm{M}$`,
          L`$1.6\times10^{-10}\,\mathrm{M}$`,
          L`$1.3\times10^{-5}\,\mathrm{M}$`,
          L`$1.6\times10^{-12}\,\mathrm{M}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This forgets to divide by the chloride concentration.",
          C: "This is the pure-water solubility, not the common-ion case.",
          D: "This divides by $100$ times too much.",
        },
        hints: [
          "In the salt solution, $[\\mathrm{Cl^-}]\\approx0.010\\,\\mathrm{M}$.",
          "$K_{sp}=[\\mathrm{Ag^+}][\\mathrm{Cl^-}]$.",
          "Let $[\\mathrm{Ag^+}]=s$ and divide by $0.010$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$s=K_{sp}/[\\mathrm{Cl^-}]=(1.6\\times10^{-10})/(0.010)=1.6\\times10^{-8}\\,\\mathrm{M}$.",
          },
        ],
      },
      {
        questionLatex: L`A saturated pure-water solution of $\mathrm{Mg(OH)_2}$ has molar solubility $s$. Which expression correctly accounts for the two hydroxide ions released per formula unit?`,
        difficulty: 3,
        skillTags: ["ksp_expression", "molar_solubility"],
        choices: [L`$s^2$`, L`$2s^2$`, L`$4s^3$`, L`$s^3$`],
        correctLetter: "C",
        rationales: {
          A: "This treats the salt as a 1:1 electrolyte.",
          B: "This still misses the square on hydroxide concentration.",
          D: "This misses the factor from $[OH^-]=2s$.",
        },
        hints: [
          "Write the dissolution equation.",
          "$[\\mathrm{Mg^{2+}}]=s$ and $[\\mathrm{OH^-}]=2s$.",
          "Use $K_{sp}=[\\mathrm{Mg^{2+}}][\\mathrm{OH^-}]^2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "$K_{sp}=s(2s)^2=4s^3$.",
          },
        ],
      },
      {
        questionLatex: L`A solution contains $[\mathrm{Pb^{2+}}]=1.0\times10^{-3}\,\mathrm{M}$ and $[\mathrm{Cl^-}]=2.0\times10^{-2}\,\mathrm{M}$. If $K_{sp}(\mathrm{PbCl_2})=1.6\times10^{-5}$, then`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["precipitation_condition", "ionic_product"],
        choices: [
          "no precipitate forms because $Q_{sp}<K_{sp}$",
          "a precipitate forms because $Q_{sp}>K_{sp}$",
          "the solution is exactly saturated",
          "lead ions disappear completely before comparison",
        ],
        correctLetter: "A",
        rationales: {
          B: "The ionic product is $4.0\\times10^{-7}$, which is less than $K_{sp}$.",
          C: "Saturation would require equality.",
          D: "Precipitation is decided by comparing $Q_{sp}$ and $K_{sp}$.",
        },
        hints: [
          "For lead chloride, $Q_{sp}=[\\mathrm{Pb^{2+}}][\\mathrm{Cl^-}]^2$.",
          "Square $2.0\\times10^{-2}$.",
          "Compare $4.0\\times10^{-7}$ with $1.6\\times10^{-5}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$Q_{sp}=(1.0\\times10^{-3})(2.0\\times10^{-2})^2=4.0\\times10^{-7}$.",
          },
          {
            step: 2,
            explanation: "$Q_{sp}<K_{sp}$, so no precipitate forms.",
          },
        ],
      },
      {
        questionLatex: L`For a sparingly soluble salt $\mathrm{MX_2(s)\rightleftharpoons M^{2+}(aq)+2X^-(aq)}$, the solubility product expression is`,
        difficulty: 3,
        skillTags: ["ksp_expression"],
        choices: [
          L`$K_{sp}=[\mathrm{M^{2+}}][\mathrm{X^-}]$`,
          L`$K_{sp}=[\mathrm{M^{2+}}][\mathrm{X^-}]^2$`,
          L`$K_{sp}=\frac{[\mathrm{MX_2}]}{[\mathrm{M^{2+}}][\mathrm{X^-}]^2}$`,
          L`$K_{sp}=2[\mathrm{M^{2+}}][\mathrm{X^-}]$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This misses the coefficient becoming a power.",
          C: "The pure solid is omitted.",
          D: "Coefficients become exponents, not multipliers outside the product.",
        },
        hints: [
          "Omit the pure solid.",
          "The coefficient 2 on $\\mathrm{X^-}$ becomes a square.",
          "Multiply the ion concentrations with powers.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The expression is $K_{sp}=[\\mathrm{M^{2+}}][\\mathrm{X^-}]^2$.",
          },
        ],
      },
      {
        questionLatex: L`Adding a soluble salt containing a common ion to a saturated solution of a sparingly soluble salt generally`,
        difficulty: 2,
        skillTags: ["common_ion_effect", "le_chateliers_principle"],
        choices: [
          "increases solubility by removing ions",
          "decreases solubility by shifting dissolution equilibrium backward",
          "changes $K_{sp}$ at constant temperature",
          "makes the salt highly volatile",
        ],
        correctLetter: "B",
        rationales: {
          A: "A common ion adds one product ion rather than removing it.",
          C: "$K_{sp}$ is fixed at a fixed temperature.",
          D: "Volatility is unrelated to this ionic equilibrium.",
        },
        hints: [
          "A common ion is already present as a product of dissolution.",
          "Adding product shifts equilibrium backward.",
          "Less solid dissolves.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The common ion increases product concentration, so the dissolution equilibrium shifts toward undissolved solid and solubility decreases.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{CaF_2}$, $K_{sp}=3.2\times10^{-11}$ at a certain temperature. Estimate its molar solubility in pure water.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["ksp_calculation", "molar_solubility"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write $K_{sp}$ in terms of $s$.",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Calculate $s$.", points: 2 },
        ],
        hints: [
          "$\\mathrm{CaF_2}$ gives one calcium ion and two fluoride ions.",
          "$K_{sp}=4s^3$.",
          "$s^3=8.0\\times10^{-12}$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 2, description: "Writes $K_{sp}=4s^3$." },
            {
              part: "b",
              points: 2,
              description: "Finds $s=2.0\\times10^{-4}\\,\\mathrm{M}$.",
            },
          ],
        },
        commonErrors: ["Using $K_{sp}=s^2$ for a 1:2 salt."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$[\\mathrm{Ca^{2+}}]=s$ and $[\\mathrm{F^-}]=2s$, so $K_{sp}=s(2s)^2=4s^3$.",
          },
          {
            part: "b",
            explanation:
              "$s^3=(3.2\\times10^{-11})/4=8.0\\times10^{-12}$, hence $s=2.0\\times10^{-4}\\,\\mathrm{M}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Will $\mathrm{AgCl}$ precipitate when $10.0\,\mathrm{mL}$ of $1.0\times10^{-4}\,\mathrm{M}\ \mathrm{AgNO_3}$ is mixed with $10.0\,\mathrm{mL}$ of $1.0\times10^{-4}\,\mathrm{M}\ \mathrm{NaCl}$? Take $K_{sp}(\mathrm{AgCl})=1.6\times10^{-10}$.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["dilution", "precipitation_condition"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find ion concentrations after mixing, before precipitation.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Compare $Q_{sp}$ with $K_{sp}$ and conclude.",
            points: 3,
          },
        ],
        hints: [
          "Mixing equal volumes halves each concentration.",
          "Calculate $Q_{sp}=[\\mathrm{Ag^+}][\\mathrm{Cl^-}]$.",
          "Precipitation needs $Q_{sp}>K_{sp}$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Finds both concentrations $5.0\\times10^{-5}\\,\\mathrm{M}$.",
            },
            {
              part: "b",
              points: 3,
              description:
                "Finds $Q_{sp}=2.5\\times10^{-9}>K_{sp}$ and predicts precipitate.",
            },
          ],
        },
        commonErrors: ["Forgetting dilution after mixing equal volumes."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "After mixing equal volumes, $[\\mathrm{Ag^+}]=[\\mathrm{Cl^-}]=5.0\\times10^{-5}\\,\\mathrm{M}$.",
          },
          {
            part: "b",
            explanation:
              "$Q_{sp}=(5.0\\times10^{-5})^2=2.5\\times10^{-9}$, which is greater than $1.6\\times10^{-10}$. Hence $\\mathrm{AgCl}$ precipitates.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex: L`State the precipitation condition in terms of ionic product $Q_{sp}$ and solubility product $K_{sp}$.`,
        difficulty: 2,
        skillTags: ["precipitation_condition"],
        parts: singlePart("a", "State the condition.", 2),
        hints: [
          "Compare the present ionic product with the saturated value.",
          "If the ionic product is too high, ions must leave solution.",
          "That gives a precipitate.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that precipitation occurs when $Q_{sp}>K_{sp}$.",
        ),
        commonErrors: ["Saying precipitation occurs whenever $Q_{sp}<K_{sp}$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A precipitate forms when the ionic product exceeds the solubility product: $Q_{sp}>K_{sp}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A solution contains $0.010\,\mathrm{M}\ \mathrm{Ba^{2+}}$ and $0.010\,\mathrm{M}\ \mathrm{Ca^{2+}}$. Sulphate ions are slowly added. Given $K_{sp}(\mathrm{BaSO_4})=1.0\times10^{-10}$ and $K_{sp}(\mathrm{CaSO_4})=2.4\times10^{-5}$, compare which sulphate precipitates first.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["selective_precipitation", "ksp_threshold"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find $[\\mathrm{SO_4^{2-}}]$ needed to start $\\mathrm{BaSO_4}$ precipitation.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find $[\\mathrm{SO_4^{2-}}]$ needed to start $\\mathrm{CaSO_4}$ precipitation.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State which precipitates first.",
            points: 1,
          },
        ],
        hints: [
          "At first precipitation, $Q_{sp}=K_{sp}$.",
          "$[\\mathrm{SO_4^{2-}}]=K_{sp}/[\\text{cation}]$.",
          "The smaller required sulphate concentration precipitates first.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $1.0\\times10^{-8}\\,\\mathrm{M}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $2.4\\times10^{-3}\\,\\mathrm{M}$.",
            },
            {
              part: "c",
              points: 1,
              description: "States $\\mathrm{BaSO_4}$ precipitates first.",
            },
          ],
        },
        commonErrors: [
          "Comparing $K_{sp}$ values without considering ion concentrations.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $\\mathrm{BaSO_4}$, $[\\mathrm{SO_4^{2-}}]=1.0\\times10^{-10}/0.010=1.0\\times10^{-8}\\,\\mathrm{M}$.",
          },
          {
            part: "b",
            explanation:
              "For $\\mathrm{CaSO_4}$, $[\\mathrm{SO_4^{2-}}]=2.4\\times10^{-5}/0.010=2.4\\times10^{-3}\\,\\mathrm{M}$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{BaSO_4}$ needs a much smaller sulphate concentration, so it precipitates first.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A lab tests precipitation of $\mathrm{Mg(OH)_2}$ with $K_{sp}=1.0\times10^{-11}$. Three solutions have $[\mathrm{Mg^{2+}}]=1.0\times10^{-3}\,\mathrm{M}$ and hydroxide concentrations $1.0\times10^{-5}\,\mathrm{M}$, $1.0\times10^{-4}\,\mathrm{M}$ and $1.0\times10^{-3}\,\mathrm{M}$ respectively.`,
        difficulty: 5,
        calculatorAllowed: true,
        skillTags: ["case_based", "ionic_product", "precipitation_condition"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $Q_{sp}$ for the first solution.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find $Q_{sp}$ for the second solution.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find $Q_{sp}$ for the third solution.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "State in which solution(s) precipitation begins.",
            points: 2,
          },
        ],
        hints: [
          "Use $Q_{sp}=[\\mathrm{Mg^{2+}}][\\mathrm{OH^-}]^2$.",
          "Compare each value with $1.0\\times10^{-11}$.",
          "Equality is saturation; greater value gives precipitation.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $1.0\\times10^{-13}$." },
            { part: "b", points: 1, description: "Finds $1.0\\times10^{-11}$." },
            { part: "c", points: 1, description: "Finds $1.0\\times10^{-9}$." },
            {
              part: "d",
              points: 2,
              description:
                "States third precipitates; second is just saturated.",
            },
          ],
        },
        commonErrors: ["Forgetting to square hydroxide concentration."],
        workedSolution: [
          {
            part: "a",
            explanation: "$Q_{sp}=10^{-3}(10^{-5})^2=1.0\\times10^{-13}$.",
          },
          {
            part: "b",
            explanation: "$Q_{sp}=10^{-3}(10^{-4})^2=1.0\\times10^{-11}$.",
          },
          {
            part: "c",
            explanation: "$Q_{sp}=10^{-3}(10^{-3})^2=1.0\\times10^{-9}$.",
          },
          {
            part: "d",
            explanation:
              "Only the third solution has $Q_{sp}>K_{sp}$, so precipitation begins there. The second is just saturated.",
          },
        ],
      },
    ],
  },
};

const expandedTopicSeeds: readonly TopicSeed[] = topicSeeds.map((seed) => {
  const extra = largeTopicExpansions[seed.topicCode];
  if (!extra) return seed;

  return {
    ...seed,
    mc: [...seed.mc, ...extra.mc],
    constructed: [...seed.constructed, ...extra.constructed],
  };
});

export const equilibriumTopics: Topic[] = expandedTopicSeeds.map(makeTopic);
