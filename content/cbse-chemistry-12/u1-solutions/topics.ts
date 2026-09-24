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

const COURSE = "cbse-chemistry-12";
const UNIT = "u1-solutions";
const VERSION = "0.1.4";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const TOPIC_CHOICE_ROTATION_OFFSETS: Record<string, number> = {
  "1.1": 0,
  "1.2": 2,
  "1.3": 1,
  "1.4": 1,
  "1.5": 1,
};
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

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|Pi|pi|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|le|ge|neq)\b/g,
        "$1\\$2",
      ),
  );
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairSolutionStep(step: SolutionStep): SolutionStep {
  return {
    ...step,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function repairPart(part: FrqPart): FrqPart {
  return { ...part, promptMarkdown: repairInlineLatex(part.promptMarkdown) };
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
  return `You chose ${choiceText}. Recheck the concentration unit, particle count, or solution-law assumption before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_solutions_reasoning",
    };
  });

  const rotation =
    (index + (TOPIC_CHOICE_ROTATION_OFFSETS[meta.topicCode] ?? 0)) %
    LETTERS.length;
  const orderedChoices = [
    ...unletteredChoices.slice(rotation),
    ...unletteredChoices.slice(0, rotation),
  ];

  const choices = orderedChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationaleIfWrong: choice.rationaleIfWrong,
    misconceptionTag: choice.misconceptionTag,
  })) as McChoice[];

  return {
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_a_formula_without_checking_solution_units_or_particles",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
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
    contentId: `${COURSE}.u1.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_numerical_answer_without_unit_or_particle_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
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

function parts(items: readonly [string, string, number][]): readonly FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) => ({
    letter,
    promptMarkdown,
    points,
  }));
}

function rubric(items: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: items.reduce((total, item) => total + item.points, 0),
    criteria: items.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Completes part ${item.letter} using correct solution chemistry, units and reasoning.`,
    })),
  };
}

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hints: readonly [string, string, string],
  solution: readonly SolutionStep[],
  figure?: ItemFigure,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints,
    solution,
    ...(figure ? { figure } : {}),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  questionParts: readonly FrqPart[],
  hintItems: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts: questionParts,
    hints: hintItems,
    rubric: rubric(questionParts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
  };
}

const idealVapourPressureFigure: ItemFigure = {
  type: "svg",
  title: "Vapour pressure composition plot for a binary liquid solution",
  description:
    "Straight partial-pressure lines and a straight total-pressure line are plotted against mole fraction for an ideal binary liquid solution.",
  svg: `<svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="420" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Vapour pressure vs composition</text>
  <line x1="92" y1="340" x2="620" y2="340" stroke="#334155" stroke-width="3"/>
  <line x1="92" y1="340" x2="92" y2="72" stroke="#334155" stroke-width="3"/>
  <path d="M620 340 L608 333 M620 340 L608 347" stroke="#334155" stroke-width="3"/>
  <path d="M92 72 L85 84 M92 72 L99 84" stroke="#334155" stroke-width="3"/>
  <line x1="92" y1="340" x2="620" y2="120" stroke="#2563eb" stroke-width="4"/>
  <line x1="92" y1="210" x2="620" y2="340" stroke="#ea580c" stroke-width="4"/>
  <line x1="92" y1="210" x2="620" y2="120" stroke="#16a34a" stroke-width="4"/>
  <line x1="92" y1="210" x2="84" y2="210" stroke="#334155" stroke-width="2"/>
  <line x1="620" y1="120" x2="628" y2="120" stroke="#334155" stroke-width="2"/>
  <text x="82" y="214" text-anchor="end" font-family="Arial" font-size="15" fill="#475569">pB*</text>
  <text x="636" y="124" font-family="Arial" font-size="15" fill="#475569">pA*</text>
  <text x="356" y="374" text-anchor="middle" font-family="Arial" font-size="17" fill="#0f172a">mole fraction of A</text>
  <text x="32" y="206" text-anchor="middle" transform="rotate(-90 32 206)" font-family="Arial" font-size="17" fill="#0f172a">vapour pressure</text>
  <text x="88" y="365" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">0</text>
  <text x="620" y="365" text-anchor="middle" font-family="Arial" font-size="15" fill="#0f172a">1</text>
  <text x="454" y="174" font-family="Arial" font-size="16" fill="#16a34a">total pressure</text>
  <text x="404" y="238" font-family="Arial" font-size="16" fill="#2563eb">pA</text>
  <text x="244" y="238" font-family="Arial" font-size="16" fill="#ea580c">pB</text>
</svg>`,
};

const osmoticPressureFigure: ItemFigure = {
  type: "svg",
  title: "Osmosis through a semipermeable membrane",
  description:
    "A solvent side and a solution side are separated by a semipermeable membrane, with a higher liquid level on the solution side after osmosis.",
  svg: `<svg viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="430" fill="#ffffff"/>
  <text x="360" y="36" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Osmosis setup</text>
  <rect x="128" y="110" width="190" height="240" fill="#eff6ff" stroke="#334155" stroke-width="3"/>
  <rect x="402" y="74" width="190" height="276" fill="#dcfce7" stroke="#334155" stroke-width="3"/>
  <rect x="318" y="94" width="84" height="256" fill="#f8fafc" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
  <text x="360" y="384" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">semipermeable membrane</text>
  <text x="224" y="236" text-anchor="middle" font-family="Arial" font-size="18" fill="#1e3a8a">pure solvent</text>
  <text x="497" y="218" text-anchor="middle" font-family="Arial" font-size="18" fill="#166534">solution</text>
  <path d="M280 198 C320 176 366 176 430 198" fill="none" stroke="#2563eb" stroke-width="4"/>
  <path d="M430 198 L411 190 M430 198 L414 210" stroke="#2563eb" stroke-width="4"/>
  <line x1="612" y1="74" x2="646" y2="74" stroke="#ef4444" stroke-width="3"/>
  <line x1="612" y1="110" x2="646" y2="110" stroke="#ef4444" stroke-width="3"/>
  <line x1="632" y1="74" x2="632" y2="110" stroke="#ef4444" stroke-width="3"/>
  <text x="658" y="96" font-family="Arial" font-size="15" fill="#991b1b">level rise</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "1.1",
    title: "Concentration and Composition of Solutions",
    subtopic:
      "Mass percent, molarity, molality, mole fraction, ppm and dilution.",
    mc: [
      mc(
        L`A solution is prepared by dissolving $18.0\,\mathrm{g}$ of glucose $(M=180\,\mathrm{g\,mol^{-1}})$ in $500\,\mathrm{g}$ of water. Its molality is`,
        2,
        ["molality", "solution_concentration", "mass_to_moles"],
        [
          L`$0.10\,\mathrm{mol\,kg^{-1}}$`,
          L`$0.20\,\mathrm{mol\,kg^{-1}}$`,
          L`$0.36\,\mathrm{mol\,kg^{-1}}$`,
          L`$2.0\,\mathrm{mol\,kg^{-1}}$`,
        ],
        "B",
        {
          A: L`This divides by total solution mass roughly, not by kilograms of solvent.`,
          C: L`This uses the mass of glucose as if it were the molar mass step directly.`,
          D: L`This forgets to convert $500\,\mathrm{g}$ water to $0.500\,\mathrm{kg}$.`,
        },
        [
          L`Molality uses kilograms of solvent, not litres of solution.`,
          L`First find moles of glucose from $18/180$.`,
          L`Then divide by $0.500\,\mathrm{kg}$ of water.`,
        ],
        [
          {
            step: 1,
            explanation: L`Moles of glucose are $18.0/180=0.100\,\mathrm{mol}$. Molality is moles of solute per kilogram of solvent.`,
            math: L`m=\frac{0.100}{0.500}=0.20\,\mathrm{mol\,kg^{-1}}`,
          },
        ],
      ),
      mc(
        L`$10.0\,\mathrm{g}$ of $\mathrm{NaOH}$ is dissolved and the solution is made up to $250\,\mathrm{mL}$. The molarity of the solution is`,
        2,
        ["molarity", "volumetric_solution", "stoichiometric_calculation"],
        [
          L`$0.25\,\mathrm{M}$`,
          L`$0.50\,\mathrm{M}$`,
          L`$1.00\,\mathrm{M}$`,
          L`$4.00\,\mathrm{M}$`,
        ],
        "C",
        {
          A: L`This is only the number of moles of $\mathrm{NaOH}$, not moles per litre.`,
          B: L`This treats $250\,\mathrm{mL}$ as $0.500\,\mathrm{L}$.`,
          D: L`This divides litres by moles instead of moles by litres.`,
        },
        [
          L`Use $M=\frac{n}{V}$ with volume in litres.`,
          L`$M(\mathrm{NaOH})=40\,\mathrm{g\,mol^{-1}}$.`,
          L`The solution volume is $0.250\,\mathrm{L}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The solute amount is $10.0/40=0.250\,\mathrm{mol}$ and the solution volume is $0.250\,\mathrm{L}$.`,
            math: L`M=\frac{0.250}{0.250}=1.00\,\mathrm{M}`,
          },
        ],
      ),
      mc(
        L`A liquid mixture contains $46\,\mathrm{g}$ ethanol $(M=46)$ and $90\,\mathrm{g}$ water $(M=18)$. The mole fraction of ethanol is closest to`,
        3,
        ["mole_fraction", "binary_solution", "composition"],
        [L`$0.100$`, L`$0.167$`, L`$0.333$`, L`$0.500$`],
        "B",
        {
          A: L`This compares ethanol moles only with water mass-like numbers, not total moles.`,
          C: L`This would follow from $1$ mol ethanol and $2$ mol water, but water is $5$ mol here.`,
          D: L`Equal masses do not mean equal mole fractions; the molar masses differ.`,
        },
        [
          L`Find moles of each liquid separately.`,
          L`Ethanol is $1$ mol and water is $5$ mol.`,
          L`Mole fraction is moles of ethanol divided by total moles.`,
        ],
        [
          {
            step: 1,
            explanation: L`Ethanol moles $=46/46=1$ and water moles $=90/18=5$.`,
            math: L`x_{\mathrm{ethanol}}=\frac{1}{1+5}=0.167`,
          },
        ],
      ),
      mc(
        L`Some water evaporates from an open beaker containing aqueous $\mathrm{NaCl}$, while no salt is lost. Which concentration measure must increase?`,
        3,
        ["concentration_change", "molality", "conceptual_reasoning"],
        [
          L`Molality of $\mathrm{NaCl}$`,
          L`Moles of $\mathrm{NaCl}$`,
          L`Mass of solvent`,
          L`Mole fraction of water`,
        ],
        "A",
        {
          B: L`The solute is not lost, so its moles remain constant rather than increasing.`,
          C: L`Evaporation decreases the mass of solvent.`,
          D: L`The mole fraction of water decreases because water moles are removed.`,
        },
        [
          L`Track what changes and what remains fixed.`,
          L`Molality is $\frac{\text{moles solute}}{\text{kg solvent}}$.`,
          L`A fixed numerator and smaller denominator make molality larger.`,
        ],
        [
          {
            step: 1,
            explanation: L`Moles of $\mathrm{NaCl}$ remain fixed but kilograms of water decrease. Therefore moles per kilogram of solvent increases.`,
          },
        ],
      ),
      mc(
        L`$50.0\,\mathrm{mL}$ of $2.0\,\mathrm{M}\ \mathrm{H_2SO_4}$ is diluted to $500\,\mathrm{mL}$. The final molarity is`,
        2,
        ["dilution", "molarity", "laboratory_solution"],
        [
          L`$0.10\,\mathrm{M}$`,
          L`$0.20\,\mathrm{M}$`,
          L`$1.0\,\mathrm{M}$`,
          L`$20\,\mathrm{M}$`,
        ],
        "B",
        {
          A: L`This corresponds to a twenty-fold dilution, but the volume increases ten-fold.`,
          C: L`This halves the concentration instead of applying the full dilution factor.`,
          D: L`Dilution cannot increase concentration.`,
        },
        [
          L`Moles of acid stay constant during dilution.`,
          L`Use $M_1V_1=M_2V_2$.`,
          L`The final volume is ten times the initial volume.`,
        ],
        [
          {
            step: 1,
            explanation: L`Using $M_1V_1=M_2V_2$, the concentration falls by a factor of $500/50=10$.`,
            math: L`M_2=\frac{2.0\times 50.0}{500}=0.20\,\mathrm{M}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State one reason why molality is preferred over molarity in temperature-dependent colligative-property calculations.`,
        1,
        ["molality", "temperature_effect", "conceptual_definition"],
        parts([["a", L`Give the reason in one or two sentences.`, 1]]),
        [
          L`Compare whether mass or volume changes with temperature.`,
          L`Molality uses solvent mass; molarity uses solution volume.`,
          L`Volume expands or contracts with temperature, mass does not.`,
        ],
        [
          {
            part: "a",
            explanation: L`Molality depends on mass of solvent, which is practically independent of temperature. Molarity depends on solution volume, which changes with temperature.`,
          },
        ],
        [
          L`Saying only that molality is "more accurate" without explaining the temperature dependence.`,
          L`Confusing kilograms of solution with kilograms of solvent.`,
        ],
      ),
      frq(
        "saq",
        L`A student has to prepare $250\,\mathrm{mL}$ of $0.250\,\mathrm{M}\ \mathrm{Na_2CO_3}$ solution. Calculate the mass of anhydrous $\mathrm{Na_2CO_3}$ required. Use $M(\mathrm{Na_2CO_3})=106\,\mathrm{g\,mol^{-1}}$.`,
        2,
        ["molarity", "solution_preparation", "laboratory_calculation"],
        parts([["a", L`Calculate the required mass.`, 2]]),
        [
          L`Find moles from $M\times V$.`,
          L`Convert $250\,\mathrm{mL}$ to $0.250\,\mathrm{L}$.`,
          L`Mass equals moles times molar mass.`,
        ],
        [
          {
            part: "a",
            explanation: L`Required moles are $0.250\times 0.250=0.0625\,\mathrm{mol}$.`,
            math: L`m=0.0625\times 106=6.625\,\mathrm{g}`,
          },
        ],
        [
          L`Using $250$ instead of $0.250\,\mathrm{L}$.`,
          L`Using molality formula for a volumetric preparation.`,
        ],
      ),
      frq(
        "saq",
        L`A water sample contains $1.9\,\mathrm{mg}$ fluoride ions in $2.5\,\mathrm{kg}$ of water. Calculate the concentration in ppm by mass.`,
        2,
        ["ppm", "mass_concentration", "environmental_chemistry"],
        parts([["a", L`Find the ppm concentration.`, 2]]),
        [
          L`For dilute aqueous samples, ppm by mass is approximately $\mathrm{mg}$ solute per $\mathrm{kg}$ water.`,
          L`Divide $1.9$ by $2.5$.`,
          L`Attach ppm as the unit.`,
        ],
        [
          {
            part: "a",
            explanation: L`The sample has $1.9\,\mathrm{mg}$ fluoride in $2.5\,\mathrm{kg}$ water.`,
            math: L`\mathrm{ppm}=\frac{1.9}{2.5}=0.76\,\mathrm{ppm}`,
          },
        ],
        [
          L`Converting milligrams to grams and then forgetting the $10^6$ ppm factor.`,
          L`Dividing by litres without density information.`,
        ],
      ),
      frq(
        "laq",
        L`$5.85\,\mathrm{g}$ of $\mathrm{NaCl}$ is dissolved in $500\,\mathrm{g}$ water. The final volume of the solution is $505\,\mathrm{mL}$. Use $M(\mathrm{NaCl})=58.5\,\mathrm{g\,mol^{-1}}$.`,
        4,
        ["molality", "mole_fraction", "molarity", "multi_step_solution"],
        parts([
          ["a", L`Calculate the molality of $\mathrm{NaCl}$.`, 1],
          ["b", L`Calculate the mole fraction of $\mathrm{NaCl}$.`, 2],
          ["c", L`Calculate the molarity of $\mathrm{NaCl}$.`, 1],
        ]),
        [
          L`First calculate moles of $\mathrm{NaCl}$.`,
          L`For mole fraction, include moles of water as well as moles of salt.`,
          L`For molarity, use final solution volume in litres.`,
        ],
        [
          {
            part: "a",
            explanation: L`Moles of $\mathrm{NaCl}=5.85/58.5=0.100\,\mathrm{mol}$ and solvent mass is $0.500\,\mathrm{kg}$.`,
            math: L`m=\frac{0.100}{0.500}=0.200\,\mathrm{mol\,kg^{-1}}`,
          },
          {
            part: "b",
            explanation: L`Moles of water are $500/18=27.78\,\mathrm{mol}$.`,
            math: L`x_{\mathrm{NaCl}}=\frac{0.100}{0.100+27.78}=3.59\times 10^{-3}`,
          },
          {
            part: "c",
            explanation: L`The final solution volume is $0.505\,\mathrm{L}$.`,
            math: L`M=\frac{0.100}{0.505}=0.198\,\mathrm{M}`,
          },
        ],
        [
          L`Using final solution volume in the molality calculation.`,
          L`Using only moles of solute in the mole-fraction denominator.`,
          L`Rounding $505\,\mathrm{mL}$ to $0.500\,\mathrm{L}$ without justification.`,
        ],
      ),
      frq(
        "case",
        L`Normal saline is labelled $0.90\%\,(w/V)\ \mathrm{NaCl}$, meaning $0.90\,\mathrm{g}\ \mathrm{NaCl}$ per $100\,\mathrm{mL}$ solution. Take $M(\mathrm{NaCl})=58.5\,\mathrm{g\,mol^{-1}}$ and assume the density is approximately $1.00\,\mathrm{g\,mL^{-1}}$.`,
        3,
        ["case_based", "percent_concentration", "molarity", "molality"],
        parts([
          [
            "a",
            L`Find the mass of $\mathrm{NaCl}$ in $500\,\mathrm{mL}$ saline.`,
            1,
          ],
          ["b", L`Find its approximate molarity.`, 2],
          ["c", L`Find its approximate molality.`, 1],
        ]),
        [
          L`Use the label first: $0.90\,\mathrm{g}$ per $100\,\mathrm{mL}$.`,
          L`For molarity, convert grams per litre to moles per litre.`,
          L`For molality, subtract solute mass from solution mass to estimate solvent mass.`,
        ],
        [
          {
            part: "a",
            explanation: L`$500\,\mathrm{mL}$ is five times $100\,\mathrm{mL}$, so the salt mass is $5\times0.90=4.50\,\mathrm{g}$.`,
          },
          {
            part: "b",
            explanation: L`The solution contains $9.0\,\mathrm{g}\ \mathrm{NaCl}$ per litre.`,
            math: L`M=\frac{9.0/58.5}{1.00}=0.154\,\mathrm{M}`,
          },
          {
            part: "c",
            explanation: L`In $1.00\,\mathrm{L}$ solution, approximate solution mass is $1000\,\mathrm{g}$ and solvent mass is $991\,\mathrm{g}=0.991\,\mathrm{kg}$.`,
            math: L`m=\frac{9.0/58.5}{0.991}=0.155\,\mathrm{mol\,kg^{-1}}`,
          },
        ],
        [
          L`Treating $0.90\%\,(w/V)$ as $0.90\,\mathrm{mol\,L^{-1}}$.`,
          L`Using mass of solution instead of mass of solvent for molality without noting the approximation.`,
        ],
      ),
    ],
  },
  {
    topicCode: "1.2",
    title: "Solubility, Henry's Law and Raoult's Law",
    subtopic:
      "Gas solubility, vapour pressure of liquid solutions, ideal and non-ideal behaviour.",
    mc: [
      mc(
        L`For a dilute gas solution obeying Henry's law $p=K_Hx$, the pressure of a gas above the liquid is doubled at constant temperature. The mole fraction of the dissolved gas will approximately`,
        2,
        ["henrys_law", "gas_solubility", "proportional_reasoning"],
        [
          L`be halved`,
          L`remain unchanged`,
          L`be doubled`,
          L`become four times`,
        ],
        "C",
        {
          A: L`Henry's law gives direct proportionality between $p$ and $x$, not inverse proportionality.`,
          B: L`At fixed $K_H$, changing pressure changes dissolved mole fraction.`,
          D: L`A square relation is not present in Henry's law.`,
        },
        [
          L`Temperature is constant, so $K_H$ is constant.`,
          L`Rearrange Henry's law as $x=p/K_H$.`,
          L`If the numerator doubles, $x$ doubles.`,
        ],
        [
          {
            step: 1,
            explanation: L`At constant temperature $K_H$ is fixed, so $x$ is directly proportional to $p$.`,
            math: L`x=\frac{p}{K_H}`,
          },
        ],
      ),
      mc(
        L`A cold carbonated drink loses fizz rapidly after its cap is opened. The best explanation is that opening the bottle`,
        2,
        ["henrys_law", "daily_life_application", "gas_solubility"],
        [
          L`raises the partial pressure of $\mathrm{CO_2}$ and increases solubility`,
          L`lowers the partial pressure of $\mathrm{CO_2}$ and decreases solubility`,
          L`converts dissolved $\mathrm{CO_2}$ into an electrolyte`,
          L`makes $K_H$ zero for $\mathrm{CO_2}$`,
        ],
        "B",
        {
          A: L`The cap release lowers, not raises, the $\mathrm{CO_2}$ pressure above the liquid.`,
          C: L`Fizzing is an escape of dissolved gas, not electrolyte formation.`,
          D: L`$K_H$ changes with temperature and gas-solvent pair, not to zero on opening a bottle.`,
        },
        [
          L`A sealed bottle maintains high $\mathrm{CO_2}$ pressure.`,
          L`Opening the cap reduces the gas pressure above the liquid.`,
          L`Lower pressure means lower dissolved mole fraction by Henry's law.`,
        ],
        [
          {
            step: 1,
            explanation: L`Opening the bottle reduces the partial pressure of $\mathrm{CO_2}$. By Henry's law, the dissolved mole fraction falls, so excess $\mathrm{CO_2}$ escapes as bubbles.`,
          },
        ],
      ),
      mc(
        L`The graph shown for a binary liquid solution has straight partial-pressure lines and a straight total-pressure line. Which conclusion is most justified?`,
        3,
        ["raoults_law", "vapour_pressure_graph", "ideal_solution"],
        [
          L`The solution obeys Raoult's law over the composition range shown.`,
          L`The solution must form a maximum-boiling azeotrope.`,
          L`The solution shows positive deviation from Raoult's law.`,
          L`The two liquids are completely immiscible.`,
        ],
        "A",
        {
          B: L`A maximum-boiling azeotrope is linked with negative deviation and a vapour-pressure minimum, not the straight ideal plot shown.`,
          C: L`Positive deviation would curve the total pressure above the ideal line.`,
          D: L`Immiscibility would not give a single ideal-composition vapour-pressure plot.`,
        },
        [
          L`For an ideal binary solution, each partial pressure is proportional to its mole fraction.`,
          L`The total pressure is the sum of two linear partial pressures.`,
          L`Straight partial and total pressure lines are the Raoult-law signature.`,
        ],
        [
          {
            step: 1,
            explanation: L`The straight partial-pressure lines show $p_A=x_Ap_A^0$ and $p_B=x_Bp_B^0$. Therefore the mixture follows Raoult's law in the plotted range.`,
          },
        ],
        idealVapourPressureFigure,
      ),
      mc(
        L`Assertion (A): A solution with stronger $A-B$ attractions than $A-A$ and $B-B$ attractions shows negative deviation from Raoult's law. Reason (R): Its escaping tendency is lower than predicted for an ideal solution.`,
        3,
        ["assertion_reason", "nonideal_solution", "negative_deviation"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The lower escaping tendency is exactly why vapour pressure is lower than ideal, so it explains negative deviation.`,
          C: L`The reason is true: stronger unlike interactions hold molecules more strongly in liquid phase.`,
          D: L`The assertion is true for stronger unlike interactions.`,
        },
        [
          L`Negative deviation means observed vapour pressure is lower than ideal.`,
          L`Stronger unlike attractions hold molecules in the liquid more strongly.`,
          L`Lower escaping tendency explains lower vapour pressure.`,
        ],
        [
          {
            step: 1,
            explanation: L`Stronger $A-B$ interactions reduce the tendency of molecules to escape to vapour phase. Hence the observed vapour pressure is below Raoult-law prediction, so both statements are true and R explains A.`,
          },
        ],
      ),
      mc(
        L`An ideal solution is formed from liquids A and B with $p_A^0=100\,\mathrm{kPa}$ and $p_B^0=60\,\mathrm{kPa}$. If $x_A=0.25$, the total vapour pressure is`,
        3,
        ["raoults_law", "vapour_pressure_calculation", "ideal_binary_solution"],
        [
          L`$40\,\mathrm{kPa}$`,
          L`$70\,\mathrm{kPa}$`,
          L`$85\,\mathrm{kPa}$`,
          L`$160\,\mathrm{kPa}$`,
        ],
        "B",
        {
          A: L`This subtracts pressures rather than adding partial pressures.`,
          C: L`This uses $x_A$ for both components or misses $x_B=0.75$.`,
          D: L`This adds pure vapour pressures without mole-fraction weighting.`,
        },
        [
          L`For an ideal solution, $p_{total}=x_Ap_A^0+x_Bp_B^0$.`,
          L`If $x_A=0.25$, then $x_B=0.75$.`,
          L`Add the two partial pressures.`,
        ],
        [
          {
            step: 1,
            explanation: L`Use Raoult's law for each component and add partial pressures.`,
            math: L`p=0.25(100)+0.75(60)=25+45=70\,\mathrm{kPa}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State Henry's law for the solubility of a gas in a liquid and explain what a larger $K_H$ means at the same gas pressure.`,
        2,
        ["henrys_law", "conceptual_definition", "gas_solubility"],
        parts([
          ["a", L`State the law.`, 1],
          ["b", L`Interpret a larger $K_H$.`, 1],
        ]),
        [
          L`Use the CBSE form $p=K_Hx$.`,
          L`At fixed pressure, $x=p/K_H$.`,
          L`A larger denominator gives smaller dissolved mole fraction.`,
        ],
        [
          {
            part: "a",
            explanation: L`At constant temperature, the partial pressure of a gas above a solution is proportional to its mole fraction in solution.`,
            math: L`p=K_Hx`,
          },
          {
            part: "b",
            explanation: L`For the same pressure, a larger $K_H$ gives a smaller $x$, so the gas is less soluble.`,
          },
        ],
        [
          L`Writing $x=K_Hp$ instead of $p=K_Hx$.`,
          L`Saying larger $K_H$ means higher solubility without checking the equation.`,
        ],
      ),
      frq(
        "saq",
        L`For a gas dissolved in water at $298\,\mathrm{K}$, $K_H=1.67\times10^8\,\mathrm{Pa}$. Calculate the mole fraction of the gas when its partial pressure is $2.50\times10^5\,\mathrm{Pa}$.`,
        2,
        ["henrys_law", "numerical_calculation", "gas_solubility"],
        parts([["a", L`Calculate $x$ using Henry's law.`, 2]]),
        [
          L`Use $p=K_Hx$.`,
          L`Rearrange to $x=p/K_H$.`,
          L`Keep powers of ten carefully.`,
        ],
        [
          {
            part: "a",
            explanation: L`Substitute the pressure and Henry's constant in $x=p/K_H$.`,
            math: L`x=\frac{2.50\times10^5}{1.67\times10^8}=1.50\times10^{-3}`,
          },
        ],
        [
          L`Inverting the ratio and obtaining a value greater than one.`,
          L`Dropping the powers of ten while dividing.`,
        ],
      ),
      frq(
        "saq",
        L`Write two thermodynamic characteristics of an ideal liquid solution. Give one suitable example.`,
        2,
        ["ideal_solution", "raoults_law", "conceptual_recall"],
        parts([["a", L`State two characteristics and one example.`, 2]]),
        [
          L`Think about enthalpy and volume changes on mixing.`,
          L`Ideal solutions obey Raoult's law throughout composition.`,
          L`A common example is benzene and toluene.`,
        ],
        [
          {
            part: "a",
            explanation: L`An ideal solution obeys Raoult's law over the entire composition range, has $\Delta_{mix}H=0$, and has $\Delta_{mix}V=0$. Benzene and toluene form an approximately ideal solution.`,
          },
        ],
        [
          L`Giving only one condition when two are asked.`,
          L`Using a strongly hydrogen-bonded pair as an ideal-solution example.`,
        ],
      ),
      frq(
        "laq",
        L`An ideal solution contains $2.0\,\mathrm{mol}$ liquid A and $3.0\,\mathrm{mol}$ liquid B at a fixed temperature. The vapour pressures of pure A and pure B are $80\,\mathrm{torr}$ and $120\,\mathrm{torr}$ respectively.`,
        4,
        ["raoults_law", "vapour_composition", "multi_step_solution"],
        parts([
          ["a", L`Calculate $p_A$ and $p_B$.`, 2],
          ["b", L`Calculate the total vapour pressure.`, 1],
          ["c", L`Calculate the mole fraction of A in the vapour phase.`, 1],
        ]),
        [
          L`Find liquid mole fractions first.`,
          L`Use $p_i=x_ip_i^0$ for each component.`,
          L`Vapour-phase mole fraction is partial pressure divided by total pressure.`,
        ],
        [
          {
            part: "a",
            explanation: L`Liquid mole fractions are $x_A=2/(2+3)=0.40$ and $x_B=0.60$.`,
            math: L`p_A=0.40(80)=32\,\mathrm{torr},\quad p_B=0.60(120)=72\,\mathrm{torr}`,
          },
          {
            part: "b",
            explanation: L`Total vapour pressure is the sum of the partial pressures.`,
            math: L`p_{total}=32+72=104\,\mathrm{torr}`,
          },
          {
            part: "c",
            explanation: L`The vapour mole fraction of A equals its partial pressure divided by total pressure.`,
            math: L`y_A=\frac{32}{104}=0.308`,
          },
        ],
        [
          L`Using vapour mole fractions before calculating partial pressures.`,
          L`Adding pure vapour pressures instead of partial pressures.`,
        ],
      ),
      frq(
        "case",
        L`Acetone and chloroform form a non-ideal solution. The unlike molecular attractions become stronger because of specific interaction between the two components.`,
        3,
        ["case_based", "negative_deviation", "azeotrope"],
        parts([
          [
            "a",
            L`State whether the solution shows positive or negative deviation from Raoult's law.`,
            1,
          ],
          [
            "b",
            L`Compare its observed vapour pressure with the ideal value.`,
            1,
          ],
          [
            "c",
            L`State the type of azeotrope expected at the extreme composition, if an azeotrope is formed.`,
            1,
          ],
          ["d", L`Give the molecular reason for the deviation.`, 1],
        ]),
        [
          L`Stronger unlike interactions reduce escaping tendency.`,
          L`Lower escaping tendency means lower vapour pressure.`,
          L`Negative deviation is associated with maximum-boiling azeotropes.`,
        ],
        [
          {
            part: "a",
            explanation: L`The solution shows negative deviation from Raoult's law.`,
          },
          {
            part: "b",
            explanation: L`Its observed vapour pressure is lower than the ideal Raoult-law value.`,
          },
          {
            part: "c",
            explanation: L`Negative deviation can produce a maximum-boiling azeotrope.`,
          },
          {
            part: "d",
            explanation: L`Stronger acetone-chloroform attractions hold molecules more strongly in the liquid phase, reducing escaping tendency.`,
          },
        ],
        [
          L`Calling it positive deviation just because the solution is non-ideal.`,
          L`Confusing maximum-boiling and minimum-boiling azeotropes.`,
        ],
      ),
    ],
  },
  {
    topicCode: "1.3",
    title: "Colligative Properties: Boiling and Freezing",
    subtopic:
      "Relative lowering of vapour pressure, elevation in boiling point, depression in freezing point and molar mass.",
    mc: [
      mc(
        L`$18.0\,\mathrm{g}$ of a non-electrolyte dissolved in $500\,\mathrm{g}$ water lowers the freezing point by $0.186\,\mathrm{K}$. If $K_f$ for water is $1.86\,\mathrm{K\,kg\,mol^{-1}}$, the molar mass of the solute is`,
        3,
        ["freezing_point_depression", "molar_mass", "colligative_property"],
        [
          L`$90\,\mathrm{g\,mol^{-1}}$`,
          L`$180\,\mathrm{g\,mol^{-1}}$`,
          L`$360\,\mathrm{g\,mol^{-1}}$`,
          L`$720\,\mathrm{g\,mol^{-1}}$`,
        ],
        "C",
        {
          A: L`This makes the molality four times too large.`,
          B: L`This forgets that the solvent mass is only $0.500\,\mathrm{kg}$.`,
          D: L`This halves the moles after already accounting for $0.500\,\mathrm{kg}$ solvent.`,
        },
        [
          L`Use $\Delta T_f=K_fm$ for a non-electrolyte.`,
          L`Find molality first, then moles using kilograms of water.`,
          L`Molar mass equals solute mass divided by solute moles.`,
        ],
        [
          {
            step: 1,
            explanation: L`Molality is $0.186/1.86=0.100\,\mathrm{mol\,kg^{-1}}$. In $0.500\,\mathrm{kg}$ water, moles are $0.0500$.`,
            math: L`M=\frac{18.0}{0.0500}=360\,\mathrm{g\,mol^{-1}}`,
          },
        ],
      ),
      mc(
        L`For a dilute solution containing a non-volatile solute, the mole fraction of solute is $0.040$. If Raoult's law is obeyed, the relative lowering of vapour pressure of the solvent is`,
        2,
        [
          "relative_lowering_vapour_pressure",
          "raoults_law",
          "colligative_property",
        ],
        [L`$0.040$`, L`$0.960$`, L`$1.040$`, L`$25.0$`],
        "A",
        {
          B: L`$0.960$ is the solvent mole fraction, not the relative lowering.`,
          C: L`This adds the solute mole fraction to $1$; relative lowering is not $1+x_{solute}$.`,
          D: L`This inverts the solute mole fraction instead of using it directly.`,
        },
        [
          L`Use Raoult's law for a solution with a non-volatile solute.`,
          L`Relative lowering is $\frac{p^0-p}{p^0}$.`,
          L`For a dilute ideal solution, this equals the mole fraction of solute.`,
        ],
        [
          {
            step: 1,
            explanation: L`For a non-volatile solute obeying Raoult's law, relative lowering of vapour pressure of the solvent equals the mole fraction of solute.`,
            math: L`\frac{p^0-p}{p^0}=x_{solute}=0.040`,
          },
        ],
      ),
      mc(
        L`Two separate aqueous solutions have the same molality: one contains glucose and the other contains urea. Both are non-electrolytes. At the same pressure, their boiling-point elevations are`,
        2,
        ["boiling_point_elevation", "non_electrolyte", "colligative_property"],
        [
          L`equal, because both have the same number of solute particles per kilogram solvent`,
          L`higher for glucose, because glucose has larger molar mass`,
          L`higher for urea, because urea contains nitrogen`,
          L`zero for both, because neither is an electrolyte`,
        ],
        "A",
        {
          B: L`At equal molality, particle count per kilogram solvent is equal; molar mass has already been accounted for.`,
          C: L`Elemental composition is not what controls a colligative property.`,
          D: L`Non-electrolytes still cause colligative effects; their $i$ is approximately $1$.`,
        },
        [
          L`For non-electrolytes, $\Delta T_b=K_bm$.`,
          L`Both have the same solvent and same molality.`,
          L`Therefore the elevation is the same.`,
        ],
        [
          {
            step: 1,
            explanation: L`Since both are non-electrolytes, $i=1$. With the same solvent and same molality, $\Delta T_b=K_bm$ is equal for both.`,
          },
        ],
      ),
      mc(
        L`Assuming complete dissociation, the freezing-point depression of $0.010\,\mathrm{m}\ \mathrm{CaCl_2}$ in water is closest to $(K_f=1.86\,\mathrm{K\,kg\,mol^{-1}})$`,
        3,
        ["freezing_point_depression", "electrolyte", "van_t_hoff_factor"],
        [
          L`$0.0186\,\mathrm{K}$`,
          L`$0.0372\,\mathrm{K}$`,
          L`$0.0558\,\mathrm{K}$`,
          L`$0.186\,\mathrm{K}$`,
        ],
        "C",
        {
          A: L`This treats $\mathrm{CaCl_2}$ as a non-electrolyte with $i=1$.`,
          B: L`This counts only two ions, but $\mathrm{CaCl_2}$ gives three ions ideally.`,
          D: L`This uses $0.100\,\mathrm{m}$ instead of $0.010\,\mathrm{m}$.`,
        },
        [
          L`For complete dissociation, $\mathrm{CaCl_2}$ gives $\mathrm{Ca^{2+}+2Cl^-}$.`,
          L`Use $i=3$.`,
          L`Apply $\Delta T_f=iK_fm$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Complete dissociation gives three ions per formula unit, so $i=3$.`,
            math: L`\Delta T_f=3(1.86)(0.010)=0.0558\,\mathrm{K}`,
          },
        ],
      ),
      mc(
        L`Benzoic acid dissolved in benzene gives an observed molar mass higher than its normal molar mass. The best inference is`,
        3,
        ["abnormal_molar_mass", "association", "freezing_point_depression"],
        [
          L`benzoic acid associates in benzene`,
          L`benzoic acid completely dissociates in benzene`,
          L`benzene dissociates into ions`,
          L`the solution must be ideal with $i=1$`,
        ],
        "A",
        {
          B: L`Dissociation increases particle count and would give a lower observed molar mass.`,
          C: L`Benzene is the solvent and does not dissociate into ions in this context.`,
          D: L`An abnormal observed molar mass indicates $i\neq1$.`,
        },
        [
          L`Higher observed molar mass means fewer particles than expected.`,
          L`Fewer particles can arise from association.`,
          L`Benzoic acid commonly dimerises in benzene.`,
        ],
        [
          {
            step: 1,
            explanation: L`Association reduces the number of solute particles. That makes the colligative effect smaller and the calculated molar mass higher than the normal value.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why are elevation in boiling point and depression in freezing point called colligative properties?`,
        1,
        ["colligative_property", "conceptual_definition"],
        parts([["a", L`Answer in one or two sentences.`, 1]]),
        [
          L`Focus on what the property depends on.`,
          L`It is not controlled by the chemical nature of the solute in dilute ideal solutions.`,
          L`It depends on the number of solute particles.`,
        ],
        [
          {
            part: "a",
            explanation: L`They are called colligative because, for dilute solutions, their values depend on the number of solute particles relative to solvent particles, not on the chemical nature of the solute.`,
          },
        ],
        [
          L`Saying only that they depend on concentration without mentioning particle count.`,
          L`Forgetting the dilute-solution condition.`,
        ],
      ),
      frq(
        "saq",
        L`$1.00\,\mathrm{g}$ of a non-volatile non-electrolyte is dissolved in $50.0\,\mathrm{g}$ water. The boiling point is raised by $0.104\,\mathrm{K}$. Calculate the molar mass of the solute. Use $K_b=0.52\,\mathrm{K\,kg\,mol^{-1}}$.`,
        3,
        ["boiling_point_elevation", "molar_mass", "numerical_calculation"],
        parts([["a", L`Calculate the molar mass.`, 3]]),
        [
          L`First use $\Delta T_b=K_bm$.`,
          L`Convert $50.0\,\mathrm{g}$ water to $0.0500\,\mathrm{kg}$.`,
          L`Moles of solute equal molality times kilograms of solvent.`,
        ],
        [
          {
            part: "a",
            explanation: L`Molality is obtained from boiling-point elevation.`,
            math: L`m=\frac{0.104}{0.52}=0.200\,\mathrm{mol\,kg^{-1}}`,
          },
          {
            part: "a",
            explanation: L`Moles of solute in $0.0500\,\mathrm{kg}$ water are $0.200\times0.0500=0.0100\,\mathrm{mol}$.`,
            math: L`M=\frac{1.00}{0.0100}=100\,\mathrm{g\,mol^{-1}}`,
          },
        ],
        [
          L`Using $50.0$ instead of $0.0500\,\mathrm{kg}$.`,
          L`Calculating molality but stopping before converting to molar mass.`,
        ],
      ),
      frq(
        "saq",
        L`Calculate the freezing point of an aqueous $0.200\,\mathrm{m}$ glucose solution. Use $K_f=1.86\,\mathrm{K\,kg\,mol^{-1}}$.`,
        2,
        [
          "freezing_point_depression",
          "non_electrolyte",
          "numerical_calculation",
        ],
        parts([["a", L`Find the freezing point.`, 2]]),
        [
          L`Glucose is a non-electrolyte, so $i=1$.`,
          L`Calculate $\Delta T_f=K_fm$.`,
          L`Subtract the depression from $0.00^\circ\mathrm{C}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`For glucose, $i=1$, so the depression is $1.86\times0.200=0.372\,\mathrm{K}$.`,
            math: L`T_f=0.000-0.372=-0.372^\circ\mathrm{C}`,
          },
        ],
        [
          L`Reporting $+0.372^\circ\mathrm{C}$ instead of a depressed freezing point.`,
          L`Adding an electrolyte factor for glucose.`,
        ],
      ),
      frq(
        "laq",
        L`$1.50\,\mathrm{g}$ of a non-electrolyte is dissolved in $25.0\,\mathrm{g}$ benzene. The freezing point of benzene is lowered by $1.02\,\mathrm{K}$. Calculate the molar mass of the solute. Use $K_f(\text{benzene})=5.12\,\mathrm{K\,kg\,mol^{-1}}$.`,
        4,
        ["freezing_point_depression", "molar_mass", "above_cbse_numerical"],
        parts([
          ["a", L`Find the molality of the solution.`, 1],
          ["b", L`Find moles of solute present.`, 1],
          ["c", L`Find the molar mass of the solute.`, 2],
        ]),
        [
          L`Use $\Delta T_f=K_fm$ because the solute is a non-electrolyte.`,
          L`The solvent mass is $0.0250\,\mathrm{kg}$.`,
          L`Molar mass is given mass divided by moles.`,
        ],
        [
          {
            part: "a",
            explanation: L`Molality is calculated from the depression in freezing point.`,
            math: L`m=\frac{1.02}{5.12}=0.199\,\mathrm{mol\,kg^{-1}}`,
          },
          {
            part: "b",
            explanation: L`Moles in $0.0250\,\mathrm{kg}$ benzene are $0.199\times0.0250=0.00498\,\mathrm{mol}$.`,
          },
          {
            part: "c",
            explanation: L`Divide the solute mass by the calculated moles.`,
            math: L`M=\frac{1.50}{0.00498}=3.01\times10^2\,\mathrm{g\,mol^{-1}}`,
          },
        ],
        [
          L`Using water's $K_f$ instead of benzene's.`,
          L`Using solute mass instead of solvent mass in the molality step.`,
        ],
      ),
      frq(
        "case",
        L`Ethylene glycol, $\mathrm{HOCH_2CH_2OH}$, is used in car radiators. A solution is made by dissolving $62.0\,\mathrm{g}$ ethylene glycol $(M=62.0)$ in $500\,\mathrm{g}$ water. Use $K_f=1.86$ and $K_b=0.52$ for water.`,
        4,
        [
          "case_based",
          "antifreeze",
          "boiling_point_elevation",
          "freezing_point_depression",
        ],
        parts([
          ["a", L`Calculate the molality of ethylene glycol.`, 1],
          ["b", L`Calculate the freezing point depression.`, 1],
          ["c", L`Calculate the boiling point elevation.`, 1],
          [
            "d",
            L`Explain why the same solute helps in both winter and summer.`,
            1,
          ],
        ]),
        [
          L`Ethylene glycol is treated as a non-electrolyte.`,
          L`Calculate molality from moles and kilograms of water.`,
          L`Use $\Delta T_f=K_fm$ and $\Delta T_b=K_bm$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Moles of ethylene glycol are $62.0/62.0=1.00\,\mathrm{mol}$ in $0.500\,\mathrm{kg}$ water.`,
            math: L`m=2.00\,\mathrm{mol\,kg^{-1}}`,
          },
          {
            part: "b",
            explanation: L`Freezing point depression is $K_fm$.`,
            math: L`\Delta T_f=1.86\times2.00=3.72\,\mathrm{K}`,
          },
          {
            part: "c",
            explanation: L`Boiling point elevation is $K_bm$.`,
            math: L`\Delta T_b=0.52\times2.00=1.04\,\mathrm{K}`,
          },
          {
            part: "d",
            explanation: L`The solute lowers freezing point in winter and raises boiling point in summer because both effects depend on reduced escaping/freezing tendency of solvent in solution.`,
          },
        ],
        [
          L`Treating ethylene glycol as an electrolyte.`,
          L`Using solution mass instead of water mass for molality.`,
        ],
      ),
    ],
  },
  {
    topicCode: "1.4",
    title: "Osmotic Pressure and Isotonic Solutions",
    subtopic:
      "Osmosis, osmotic pressure, reverse osmosis, isotonicity and molar mass from osmotic pressure.",
    mc: [
      mc(
        L`The osmotic pressure of a $0.010\,\mathrm{M}$ glucose solution at $300\,\mathrm{K}$ is closest to $(R=0.0821\,\mathrm{L\,atm\,K^{-1}\,mol^{-1}})$`,
        2,
        ["osmotic_pressure", "non_electrolyte", "numerical_calculation"],
        [
          L`$0.0246\,\mathrm{atm}$`,
          L`$0.246\,\mathrm{atm}$`,
          L`$2.46\,\mathrm{atm}$`,
          L`$24.6\,\mathrm{atm}$`,
        ],
        "B",
        {
          A: L`This misses a factor of $10$ in concentration or temperature multiplication.`,
          C: L`This uses $0.100\,\mathrm{M}$ instead of $0.010\,\mathrm{M}$.`,
          D: L`This forgets the small concentration factor.`,
        },
        [
          L`For glucose, use $\pi=CRT$.`,
          L`Substitute $C=0.010$, $R=0.0821$, $T=300$.`,
          L`The answer should be much less than $1\,\mathrm{atm}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Glucose is a non-electrolyte, so $\pi=CRT$.`,
            math: L`\pi=0.010\times0.0821\times300=0.246\,\mathrm{atm}`,
          },
        ],
      ),
      mc(
        L`Which pair is closest to isotonic at the same temperature, assuming ideal behaviour?`,
        3,
        ["isotonic_solution", "osmotic_pressure", "particle_count"],
        [
          L`$0.10\,\mathrm{M}$ glucose and $0.10\,\mathrm{M}$ urea`,
          L`$0.10\,\mathrm{M}$ glucose and $0.10\,\mathrm{M}\ \mathrm{NaCl}$`,
          L`$0.10\,\mathrm{M}$ glucose and $0.20\,\mathrm{M}$ urea`,
          L`$0.20\,\mathrm{M}$ glucose and $0.10\,\mathrm{M}$ urea`,
        ],
        "A",
        {
          B: L`Ideal $\mathrm{NaCl}$ gives about twice as many particles as glucose at the same molarity.`,
          C: L`The urea solution has double the molarity, so its osmotic pressure is double.`,
          D: L`The glucose solution has double the molarity, so its osmotic pressure is double.`,
        },
        [
          L`Isotonic solutions have equal osmotic pressure.`,
          L`For non-electrolytes, $\pi=CRT$.`,
          L`Glucose and urea are both non-electrolytes here, so equal molarity gives equal $\pi$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Glucose and urea are non-electrolytes. At equal molarity and temperature, both have the same particle concentration and hence the same osmotic pressure.`,
          },
        ],
      ),
      mc(
        L`In reverse osmosis, the external pressure must be applied`,
        2,
        ["reverse_osmosis", "osmotic_pressure", "conceptual_reasoning"],
        [
          L`on the pure solvent side and less than osmotic pressure`,
          L`on the solution side and greater than osmotic pressure`,
          L`on both sides equally and equal to atmospheric pressure`,
          L`only after removing the semipermeable membrane`,
        ],
        "B",
        {
          A: L`Pressure must oppose natural solvent flow, so it is applied on the solution side.`,
          C: L`Equal pressure on both sides cannot reverse osmosis.`,
          D: L`A semipermeable membrane is essential for reverse osmosis.`,
        },
        [
          L`Natural osmosis moves solvent into the solution side.`,
          L`To reverse it, push solvent out of the solution.`,
          L`The applied pressure must exceed the osmotic pressure.`,
        ],
        [
          {
            step: 1,
            explanation: L`Reverse osmosis requires pressure greater than osmotic pressure on the solution side, forcing solvent through the semipermeable membrane in the reverse direction.`,
          },
        ],
      ),
      mc(
        L`$1.00\,\mathrm{g}$ of a polymer in $100\,\mathrm{mL}$ solution has osmotic pressure $0.0040\,\mathrm{atm}$ at $300\,\mathrm{K}$. Its molar mass is closest to`,
        4,
        ["osmotic_pressure", "polymer_molar_mass", "above_cbse_numerical"],
        [
          L`$6.2\times10^2\,\mathrm{g\,mol^{-1}}$`,
          L`$6.2\times10^3\,\mathrm{g\,mol^{-1}}$`,
          L`$6.2\times10^4\,\mathrm{g\,mol^{-1}}$`,
          L`$6.2\times10^5\,\mathrm{g\,mol^{-1}}$`,
        ],
        "C",
        {
          A: L`This is too small by a factor of $100$; check the $0.100\,\mathrm{L}$ volume and tiny pressure.`,
          B: L`This is too small by a factor of $10$.`,
          D: L`This is too large by a factor of $10$.`,
        },
        [
          L`Use $\pi V=nRT=(w/M)RT$.`,
          L`Rearrange: $M=wRT/(\pi V)$.`,
          L`Use $V=0.100\,\mathrm{L}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For a polymer, osmotic pressure is useful because the pressure is measurable even at low particle concentration.`,
            math: L`M=\frac{1.00\times0.0821\times300}{0.0040\times0.100}=6.16\times10^4\,\mathrm{g\,mol^{-1}}`,
          },
        ],
      ),
      mc(
        L`A red blood cell placed in a hypotonic solution swells and may burst because`,
        3,
        ["osmosis", "biological_application", "isotonic_solution"],
        [
          L`water enters the cell through its membrane`,
          L`water leaves the cell through its membrane`,
          L`solute particles freely leave the cell until pressure becomes zero`,
          L`the cell membrane stops acting as a semipermeable membrane`,
        ],
        "A",
        {
          B: L`Water leaves a cell in a hypertonic solution, not a hypotonic one.`,
          C: L`The key movement in osmosis is solvent movement through a semipermeable membrane.`,
          D: L`The effect occurs because the membrane permits selective solvent movement.`,
        },
        [
          L`Hypotonic means lower solute concentration outside the cell.`,
          L`Water moves from dilute side to concentrated side through a semipermeable membrane.`,
          L`Therefore water enters the cell.`,
        ],
        [
          {
            step: 1,
            explanation: L`A hypotonic external solution has lower solute concentration than the cell interior. Water enters by osmosis, so the cell swells and may burst.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is a semipermeable membrane in the context of osmosis?`,
        1,
        ["osmosis", "semipermeable_membrane", "conceptual_definition"],
        parts([["a", L`Define the term.`, 1]]),
        [
          L`Think about selective passage.`,
          L`The solvent can pass more readily than solute particles.`,
          L`Use this to define the membrane.`,
        ],
        [
          {
            part: "a",
            explanation: L`A semipermeable membrane allows solvent molecules to pass through but prevents, or greatly restricts, passage of solute particles.`,
          },
        ],
        [
          L`Calling it a membrane that blocks both solute and solvent.`,
          L`Forgetting the selective nature of the membrane.`,
        ],
      ),
      frq(
        "saq",
        L`$5.00\,\mathrm{g}$ of a non-electrolyte dissolved in water to make $250\,\mathrm{mL}$ solution has osmotic pressure $1.20\,\mathrm{atm}$ at $300\,\mathrm{K}$. Calculate the molar mass of the solute. Use $R=0.0821\,\mathrm{L\,atm\,K^{-1}\,mol^{-1}}$.`,
        3,
        ["osmotic_pressure", "molar_mass", "numerical_calculation"],
        parts([["a", L`Calculate the molar mass.`, 3]]),
        [
          L`Use $\pi V=nRT$.`,
          L`Replace $n$ by $w/M$.`,
          L`Use volume in litres.`,
        ],
        [
          {
            part: "a",
            explanation: L`For a non-electrolyte, $\pi V=(w/M)RT$, so $M=wRT/(\pi V)$.`,
            math: L`M=\frac{5.00\times0.0821\times300}{1.20\times0.250}=4.11\times10^2\,\mathrm{g\,mol^{-1}}`,
          },
        ],
        [
          L`Using $250$ instead of $0.250\,\mathrm{L}$.`,
          L`Using $\pi=CRT$ but treating mass concentration as molarity.`,
        ],
      ),
      frq(
        "saq",
        L`Compare the osmotic pressures of ideal $0.20\,\mathrm{M}\ \mathrm{NaCl}$ and $0.20\,\mathrm{M}$ glucose at the same temperature. Give the ratio $\pi_{\mathrm{NaCl}}:\pi_{\mathrm{glucose}}$.`,
        2,
        ["osmotic_pressure", "electrolyte", "isotonic_solution"],
        parts([["a", L`Find the ratio and justify it.`, 2]]),
        [
          L`For glucose, $i=1$.`,
          L`For ideal $\mathrm{NaCl}$, $i=2$.`,
          L`Osmotic pressure is proportional to $iC$ at fixed temperature.`,
        ],
        [
          {
            part: "a",
            explanation: L`At the same concentration and temperature, osmotic pressure is proportional to van't Hoff factor. Ideal $\mathrm{NaCl}$ gives two ions, while glucose gives one particle.`,
            math: L`\pi_{\mathrm{NaCl}}:\pi_{\mathrm{glucose}}=2:1`,
          },
        ],
        [
          L`Treating $\mathrm{NaCl}$ as a non-electrolyte.`,
          L`Comparing molar masses instead of particle concentrations.`,
        ],
      ),
      frq(
        "laq",
        L`A $0.90\%\,(w/V)\ \mathrm{NaCl}$ solution is used as saline. Estimate its osmotic pressure at $300\,\mathrm{K}$ if the effective van't Hoff factor of $\mathrm{NaCl}$ is $1.85$. Use $M(\mathrm{NaCl})=58.5\,\mathrm{g\,mol^{-1}}$ and $R=0.0821\,\mathrm{L\,atm\,K^{-1}\,mol^{-1}}$.`,
        4,
        [
          "osmotic_pressure",
          "saline",
          "van_t_hoff_factor",
          "multi_step_solution",
        ],
        parts([
          ["a", L`Convert $0.90\%\,(w/V)$ into molarity.`, 2],
          ["b", L`Calculate osmotic pressure using the effective $i$.`, 2],
        ]),
        [
          L`$0.90\%\,(w/V)$ means $9.0\,\mathrm{g}$ per litre.`,
          L`Convert grams per litre to moles per litre.`,
          L`Use $\pi=iCRT$.`,
        ],
        [
          {
            part: "a",
            explanation: L`$0.90\,\mathrm{g}$ per $100\,\mathrm{mL}$ equals $9.0\,\mathrm{g}$ per litre.`,
            math: L`C=\frac{9.0}{58.5}=0.154\,\mathrm{M}`,
          },
          {
            part: "b",
            explanation: L`Use $\pi=iCRT$ with $i=1.85$.`,
            math: L`\pi=1.85\times\frac{9.0}{58.5}\times0.0821\times300=7.01\,\mathrm{atm}`,
          },
        ],
        [
          L`Forgetting the dissociation factor of $\mathrm{NaCl}$.`,
          L`Treating $0.90\%$ as $0.90\,\mathrm{M}$.`,
        ],
      ),
      frq(
        "case",
        L`The diagram shows a pure solvent and a solution separated by a semipermeable membrane. A student observes a rise in the liquid level on the solution side.`,
        3,
        ["case_based", "osmosis", "reverse_osmosis", "osmotic_pressure"],
        parts([
          ["a", L`Name the process responsible for the level rise.`, 1],
          ["b", L`State why the solution side rises.`, 1],
          ["c", L`What must be done to produce reverse osmosis?`, 1],
          [
            "d",
            L`Calculate the minimum pressure needed to reverse osmosis for a $0.100\,\mathrm{M}$ sucrose solution at $298\,\mathrm{K}$. Use $R=0.0821\,\mathrm{L\,atm\,K^{-1}\,mol^{-1}}$.`,
            1,
          ],
        ]),
        [
          L`The membrane allows solvent movement.`,
          L`Solvent moves from pure solvent side to solution side.`,
          L`Minimum reverse-osmosis pressure is the osmotic pressure.`,
        ],
        [
          {
            part: "a",
            explanation: L`The process is osmosis.`,
          },
          {
            part: "b",
            explanation: L`Solvent molecules pass through the membrane into the solution because the solution has lower solvent chemical potential.`,
          },
          {
            part: "c",
            explanation: L`Apply external pressure greater than the osmotic pressure on the solution side.`,
          },
          {
            part: "d",
            explanation: L`Sucrose is a non-electrolyte, so the minimum pressure equals $CRT$.`,
            math: L`\pi=0.100\times0.0821\times298=2.45\,\mathrm{atm}`,
          },
        ],
        [
          L`Saying solute crosses the membrane to the solvent side.`,
          L`Applying reverse-osmosis pressure on the pure solvent side.`,
        ],
        osmoticPressureFigure,
      ),
    ],
  },
  {
    topicCode: "1.5",
    title: "Abnormal Molar Mass and van't Hoff Factor",
    subtopic:
      "Association, dissociation, degree of ionisation and corrected colligative-property calculations.",
    mc: [
      mc(
        L`Acetic acid associates in benzene. For such a solution, the van't Hoff factor $i$ is expected to be`,
        2,
        ["van_t_hoff_factor", "association", "abnormal_molar_mass"],
        [
          L`less than $1$`,
          L`equal to $1$`,
          L`between $1$ and $2$`,
          L`exactly $2$`,
        ],
        "A",
        {
          B: L`$i=1$ is expected for a normal non-electrolyte with no association or dissociation.`,
          C: L`Values greater than $1$ indicate dissociation into more particles.`,
          D: L`$i=2$ would represent doubling of particle count, not association.`,
        },
        [
          L`Association combines particles.`,
          L`Fewer particles give a smaller colligative effect.`,
          L`Therefore $i<1$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Association reduces the number of solute particles relative to the formula units dissolved, so the van't Hoff factor is less than $1$.`,
          },
        ],
      ),
      mc(
        L`If $\mathrm{KCl}$ is $80\%$ dissociated in water, its van't Hoff factor is approximately`,
        3,
        ["van_t_hoff_factor", "degree_of_dissociation", "electrolyte"],
        [L`$0.80$`, L`$1.20$`, L`$1.80$`, L`$2.80$`],
        "C",
        {
          A: L`Degree of dissociation is not itself the van't Hoff factor.`,
          B: L`This subtracts the dissociated fraction instead of adding the extra ion contribution.`,
          D: L`This would require production of more than two particles per formula unit.`,
        },
        [
          L`$\mathrm{KCl}$ dissociates as $\mathrm{KCl\rightarrow K^+ + Cl^-}$.`,
          L`For dissociation into two ions, $i=1+\alpha$.`,
          L`Use $\alpha=0.80$.`,
        ],
        [
          {
            step: 1,
            explanation: L`One formula unit gives two ions, so $i=1+\alpha(n-1)$ with $n=2$.`,
            math: L`i=1+0.80(2-1)=1.80`,
          },
        ],
      ),
      mc(
        L`Benzoic acid has normal molar mass $122\,\mathrm{g\,mol^{-1}}$, but its observed molar mass in benzene is $244\,\mathrm{g\,mol^{-1}}$. If association is only dimerisation, the degree of association is`,
        4,
        ["association", "abnormal_molar_mass", "van_t_hoff_factor"],
        [L`$25\%$`, L`$50\%$`, L`$75\%$`, L`$100\%$`],
        "D",
        {
          A: L`This would give $i=1-0.25/2=0.875$, not $0.5$.`,
          B: L`This would give $i=0.75$, not $0.5$.`,
          C: L`This would give $i=0.625$, not $0.5$.`,
        },
        [
          L`First find $i=\frac{M_{normal}}{M_{observed}}$.`,
          L`For dimerisation, $i=1-\alpha/2$.`,
          L`Solve for $\alpha$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The van't Hoff factor from molar masses is $122/244=0.5$. For dimerisation, $i=1-\alpha/2$.`,
            math: L`0.5=1-\frac{\alpha}{2}\Rightarrow \alpha=1.00`,
          },
        ],
      ),
      mc(
        L`Equal molal aqueous solutions are prepared using glucose, $\mathrm{NaCl}$, $\mathrm{Na_2SO_4}$ and $\mathrm{AlCl_3}$. Assuming complete dissociation where applicable, the largest freezing-point depression is produced by`,
        3,
        ["freezing_point_depression", "particle_count", "electrolyte"],
        [
          L`glucose`,
          L`$\mathrm{NaCl}$`,
          L`$\mathrm{Na_2SO_4}$`,
          L`$\mathrm{AlCl_3}$`,
        ],
        "D",
        {
          A: L`Glucose is a non-electrolyte and has $i=1$.`,
          B: L`$\mathrm{NaCl}$ gives two ions, fewer than $\mathrm{AlCl_3}$.`,
          C: L`$\mathrm{Na_2SO_4}$ gives three ions, fewer than $\mathrm{AlCl_3}$.`,
        },
        [
          L`At equal molality, compare van't Hoff factors.`,
          L`Complete dissociation gives the number of ions per formula unit.`,
          L`$\mathrm{AlCl_3}$ gives four ions ideally.`,
        ],
        [
          {
            step: 1,
            explanation: L`For equal molality, $\Delta T_f$ is proportional to $i$. Complete dissociation gives $i=1$ for glucose, $2$ for $\mathrm{NaCl}$, $3$ for $\mathrm{Na_2SO_4}$ and $4$ for $\mathrm{AlCl_3}$.`,
          },
        ],
      ),
      mc(
        L`A $0.100\,\mathrm{m}$ weak monoprotic acid solution has freezing-point depression $0.2046\,\mathrm{K}$ in water. If $K_f=1.86\,\mathrm{K\,kg\,mol^{-1}}$, the degree of dissociation is`,
        4,
        [
          "degree_of_dissociation",
          "freezing_point_depression",
          "weak_electrolyte",
        ],
        [L`$5\%$`, L`$10\%$`, L`$20\%$`, L`$50\%$`],
        "B",
        {
          A: L`$5\%$ would give $i=1.05$ and a smaller depression.`,
          C: L`$20\%$ would give $i=1.20$ and a larger depression.`,
          D: L`$50\%$ would give $i=1.50$, far too large.`,
        },
        [
          L`First calculate $i=\Delta T_f/(K_fm)$.`,
          L`For $\mathrm{HA\rightleftharpoons H^+ + A^-}$, $i=1+\alpha$.`,
          L`Convert $\alpha$ to percent.`,
        ],
        [
          {
            step: 1,
            explanation: L`The van't Hoff factor is found from the observed depression.`,
            math: L`i=\frac{0.2046}{1.86\times0.100}=1.10`,
          },
          {
            step: 2,
            explanation: L`For a monoprotic acid dissociating into two ions, $i=1+\alpha$.`,
            math: L`\alpha=1.10-1=0.10=10\%`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define van't Hoff factor and write its relation with normal and observed molar mass obtained from a colligative-property experiment.`,
        2,
        ["van_t_hoff_factor", "abnormal_molar_mass", "conceptual_definition"],
        parts([
          ["a", L`Define $i$.`, 1],
          ["b", L`Write the molar-mass relation.`, 1],
        ]),
        [
          L`$i$ compares actual particle count with expected particle count.`,
          L`It also compares observed colligative property with normal colligative property.`,
          L`For molar mass, association gives observed molar mass larger than normal.`,
        ],
        [
          {
            part: "a",
            explanation: L`The van't Hoff factor is the ratio of observed colligative property to the calculated normal colligative property for the same concentration.`,
          },
          {
            part: "b",
            explanation: L`For molar masses obtained from colligative properties,`,
            math: L`i=\frac{M_{normal}}{M_{observed}}`,
          },
        ],
        [
          L`Writing the molar-mass ratio upside down.`,
          L`Defining $i$ only for electrolytes and ignoring association.`,
        ],
      ),
      frq(
        "saq",
        L`A $0.050\,\mathrm{m}\ \mathrm{BaCl_2}$ solution is $70\%$ dissociated. Calculate its boiling-point elevation in water. Use $K_b=0.512\,\mathrm{K\,kg\,mol^{-1}}$.`,
        3,
        ["boiling_point_elevation", "degree_of_dissociation", "electrolyte"],
        parts([["a", L`Calculate $\Delta T_b$.`, 3]]),
        [
          L`$\mathrm{BaCl_2}$ gives three ions on complete dissociation.`,
          L`Use $i=1+\alpha(n-1)$.`,
          L`Then use $\Delta T_b=iK_bm$.`,
        ],
        [
          {
            part: "a",
            explanation: L`For $\mathrm{BaCl_2\rightarrow Ba^{2+}+2Cl^-}$, $n=3$ and $\alpha=0.70$.`,
            math: L`i=1+0.70(3-1)=2.40`,
          },
          {
            part: "a",
            explanation: L`Now apply the boiling-point elevation formula.`,
            math: L`\Delta T_b=2.40\times0.512\times0.050=0.0614\,\mathrm{K}`,
          },
        ],
        [
          L`Using $i=3$ despite partial dissociation.`,
          L`Using $70$ instead of $0.70$ for degree of dissociation.`,
        ],
      ),
      frq(
        "saq",
        L`The true molar mass of a solute is $122\,\mathrm{g\,mol^{-1}}$, but due to association its van't Hoff factor in benzene is $0.50$. What molar mass will be observed from freezing-point depression?`,
        2,
        ["association", "observed_molar_mass", "van_t_hoff_factor"],
        parts([["a", L`Calculate the observed molar mass.`, 2]]),
        [
          L`Use $i=M_{normal}/M_{observed}$.`,
          L`Association gives $i<1$ and a larger observed molar mass.`,
          L`Rearrange for $M_{observed}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using $i=M_{normal}/M_{observed}$,`,
            math: L`M_{observed}=\frac{122}{0.50}=244\,\mathrm{g\,mol^{-1}}`,
          },
        ],
        [
          L`Multiplying $122$ by $0.50$ and getting a smaller mass despite association.`,
          L`Confusing true molar mass with observed molar mass.`,
        ],
      ),
      frq(
        "laq",
        L`A salt $\mathrm{AB_2}$ of true molar mass $120\,\mathrm{g\,mol^{-1}}$ is $60\%$ dissociated in water. A $0.200\,\mathrm{m}$ solution is prepared. Use $K_f=1.86\,\mathrm{K\,kg\,mol^{-1}}$.`,
        4,
        [
          "dissociation",
          "freezing_point_depression",
          "apparent_molar_mass",
          "multi_step_solution",
        ],
        parts([
          ["a", L`Calculate the van't Hoff factor.`, 1],
          ["b", L`Calculate the freezing-point depression.`, 2],
          ["c", L`Find the apparent molar mass if dissociation is ignored.`, 1],
        ]),
        [
          L`$\mathrm{AB_2}$ gives three ions on complete dissociation.`,
          L`Use $i=1+\alpha(n-1)$.`,
          L`Ignoring dissociation makes the apparent molar mass lower by factor $i$.`,
        ],
        [
          {
            part: "a",
            explanation: L`For $\mathrm{AB_2\rightarrow A^{2+}+2B^-}$, $n=3$ and $\alpha=0.60$.`,
            math: L`i=1+0.60(3-1)=2.20`,
          },
          {
            part: "b",
            explanation: L`Use the corrected freezing-point depression formula.`,
            math: L`\Delta T_f=iK_fm=2.20\times1.86\times0.200=0.818\,\mathrm{K}`,
          },
          {
            part: "c",
            explanation: L`A larger colligative effect makes the calculated molar mass smaller if dissociation is ignored.`,
            math: L`M_{apparent}=\frac{120}{2.20}=54.5\,\mathrm{g\,mol^{-1}}`,
          },
        ],
        [
          L`Using $i=3$ instead of accounting for $60\%$ dissociation.`,
          L`Multiplying the true molar mass by $i$ for apparent molar mass.`,
        ],
      ),
      frq(
        "case",
        L`Three $0.100\,\mathrm{m}$ aqueous solutions are prepared: A is urea, B is $\mathrm{NaCl}$ with $90\%$ dissociation, and C is a weak acid $\mathrm{HA}$ with $5\%$ dissociation. Assume the same solvent and temperature.`,
        4,
        [
          "case_based",
          "van_t_hoff_factor",
          "freezing_point_depression",
          "ranking",
        ],
        parts([
          ["a", L`Find $i$ for A, B and C.`, 2],
          [
            "b",
            L`Arrange the three solutions in increasing order of freezing-point depression.`,
            1,
          ],
          ["c", L`Which solution has the highest boiling point?`, 1],
        ]),
        [
          L`Urea is a non-electrolyte.`,
          L`For $\mathrm{NaCl}$ and $\mathrm{HA}$, use $i=1+\alpha$ because each gives two ions.`,
          L`At equal molality, compare $i$ values directly.`,
        ],
        [
          {
            part: "a",
            explanation: L`Urea does not dissociate, so $i_A=1.00$. For $\mathrm{NaCl}$, $i_B=1+0.90=1.90$. For $\mathrm{HA}$, $i_C=1+0.05=1.05$.`,
          },
          {
            part: "b",
            explanation: L`At equal molality, freezing-point depression is proportional to $i$.`,
            math: L`A<C<B`,
          },
          {
            part: "c",
            explanation: L`The solution with the largest $i$ also has the largest boiling-point elevation, so B has the highest boiling point.`,
          },
        ],
        [
          L`Ranking by molar mass instead of particle count.`,
          L`Treating the weak acid as completely dissociated.`,
        ],
      ),
    ],
  },
];

export const solutionsTopics: Topic[] = topicSeeds.map(makeTopic);
