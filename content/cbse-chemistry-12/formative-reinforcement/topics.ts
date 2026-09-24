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
const UNIT = "formative-reinforcement";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type SolutionStepSeed = Omit<SolutionStep, "step"> & { step?: number };

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
  solution: readonly SolutionStepSeed[];
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
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|xrightarrow|le|ge|neq|mu|sqrt|sigma|pi)\b/g,
        "$1\\$2",
      ),
  );
}

function repairQuestionStem(text: string): string {
  const repaired = repairInlineLatex(text);
  if (repaired.includes("$") || repaired.includes("\\text{")) return repaired;
  if (/[\\{}]/.test(repaired)) return repaired;
  return `\\text{${repaired}}`;
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairStep(step: SolutionStepSeed, index: number): SolutionStep {
  return {
    step: step.step ?? index + 1,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the formative concept, observation, classification, or cause-effect link before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const choices = LETTERS.map((letter, choiceIndex) => {
    const isCorrect = letter === seed.correctLetter;
    return {
      letter,
      text: repairInlineLatex(seed.choices[choiceIndex]),
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : repairInlineLatex(
            seed.rationales[letter] ?? fallbackWrongRationale(seed, letter),
          ),
      misconceptionTag: isCorrect
        ? null
        : "incorrect_cbse_class12_chemistry_formative_reasoning",
    };
  }) as McChoice[];

  return {
    contentId: `${COURSE}.${UNIT}.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "treats_formative_topic_as_memory_only_without_reasoning_from_the_observation",
    ],
    questionLatex: repairQuestionStem(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: seed.correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairStep),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_term_without_linking_it_to_the_experimental_or_application_context",
    ],
    questionLatex: repairQuestionStem(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map((part) => ({
      ...part,
      promptMarkdown: repairInlineLatex(part.promptMarkdown),
    })),
    hintLadder: hints(seed.hints),
    rubric: {
      maxPoints: seed.rubric.maxPoints,
      criteria: seed.rubric.criteria.map((criterion) => ({
        ...criterion,
        description: repairInlineLatex(criterion.description),
      })),
    },
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map((part) => ({
      ...part,
      explanation: repairInlineLatex(part.explanation),
      ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
    })),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
    items: [
      ...seed.mc.map((item, index) => makeMc(meta, item, index)),
      ...seed.constructed.map((item, index) =>
        makeConstructed(meta, item, index),
      ),
    ],
  };
}

function parts(items: readonly [string, string, number][]): FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) => ({
    letter,
    promptMarkdown: repairInlineLatex(promptMarkdown),
    points,
  }));
}

function onePart(promptMarkdown: string, marks = 1): FrqPart[] {
  return parts([["a", promptMarkdown, marks]]);
}

function rubric(items: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: items.reduce((total, item) => total + item.points, 0),
    criteria: items.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Completes part ${item.letter} with the required formative concept, observation, classification, calculation, or application reasoning.`,
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
  hintsInput: readonly [string, string, string],
  solution: readonly SolutionStepSeed[],
  figure?: ItemFigure,
  calculatorAllowed?: boolean,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints: hintsInput,
    solution,
    ...(figure ? { figure } : {}),
    ...(calculatorAllowed === undefined ? {} : { calculatorAllowed }),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  frqParts: readonly FrqPart[],
  hintsInput: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
  calculatorAllowed?: boolean,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts: frqParts,
    hints: hintsInput,
    rubric: rubric(frqParts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
    ...(calculatorAllowed === undefined ? {} : { calculatorAllowed }),
  };
}

const adsorptionIsothermFigure: ItemFigure = {
  type: "svg",
  title: "Freundlich adsorption plot",
  description:
    "A straight-line plot of log x/m against log p for gas adsorption on a solid adsorbent.",
  svg: `<svg viewBox="0 0 620 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="390" fill="#ffffff"/>
  <defs>
    <marker id="chem12-formative-axis" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#334155"/>
    </marker>
  </defs>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <line x1="92" y1="320" x2="545" y2="320" stroke="#334155" stroke-width="3" marker-end="url(#chem12-formative-axis)"/>
    <line x1="92" y1="320" x2="92" y2="62" stroke="#334155" stroke-width="3" marker-end="url(#chem12-formative-axis)"/>
    <g stroke="#e2e8f0" stroke-width="1">
      <line x1="160" y1="70" x2="160" y2="320"/><line x1="240" y1="70" x2="240" y2="320"/>
      <line x1="320" y1="70" x2="320" y2="320"/><line x1="400" y1="70" x2="400" y2="320"/>
      <line x1="480" y1="70" x2="480" y2="320"/><line x1="92" y1="260" x2="530" y2="260"/>
      <line x1="92" y1="200" x2="530" y2="200"/><line x1="92" y1="140" x2="530" y2="140"/>
    </g>
    <line x1="130" y1="275" x2="485" y2="105" stroke="#2563eb" stroke-width="5"/>
    <circle cx="130" cy="275" r="5" fill="#2563eb"/><circle cx="240" cy="222" r="5" fill="#2563eb"/>
    <circle cx="350" cy="170" r="5" fill="#2563eb"/><circle cx="485" cy="105" r="5" fill="#2563eb"/>
    <text x="500" y="350" font-size="18">log p</text>
    <text x="18" y="82" font-size="18">log x/m</text>
    <text x="292" y="111" font-size="17" fill="#1d4ed8">slope = 1/n</text>
    <text x="122" y="345" font-size="15">low pressure</text>
    <text x="412" y="345" font-size="15">higher pressure</text>
  </g>
</svg>`,
};

const frothFloatFigure: ItemFigure = {
  type: "svg",
  title: "Froth flotation cell",
  description:
    "A flotation cell showing sulphide ore particles collected in froth while wetted gangue remains lower in water.",
  svg: `<svg viewBox="0 0 660 410" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="410" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <rect x="112" y="76" width="435" height="278" rx="22" fill="#e0f2fe" stroke="#334155" stroke-width="3"/>
    <path d="M127 112 C170 88 214 119 253 100 C292 81 331 116 374 98 C420 79 462 113 532 94 L532 153 L127 153 Z" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
    <text x="236" y="55" font-size="18">sulphide-rich froth</text>
    <g fill="#ca8a04">
      <circle cx="169" cy="118" r="7"/><circle cx="220" cy="103" r="6"/><circle cx="286" cy="116" r="6"/>
      <circle cx="353" cy="104" r="7"/><circle cx="445" cy="112" r="6"/><circle cx="492" cy="99" r="7"/>
    </g>
    <g fill="#64748b">
      <rect x="177" y="265" width="12" height="10" rx="2"/><rect x="255" y="292" width="14" height="11" rx="2"/>
      <rect x="338" y="272" width="13" height="10" rx="2"/><rect x="431" y="300" width="12" height="10" rx="2"/>
    </g>
    <path d="M322 355 L322 225" stroke="#2563eb" stroke-width="5"/>
    <circle cx="322" cy="214" r="9" fill="#60a5fa"/><circle cx="305" cy="197" r="6" fill="#60a5fa"/>
    <circle cx="342" cy="191" r="5" fill="#60a5fa"/><circle cx="319" cy="174" r="4" fill="#60a5fa"/>
    <text x="353" y="238" font-size="17" fill="#2563eb">air bubbles</text>
    <text x="355" y="326" font-size="17">gangue remains wetted</text>
    <text x="132" y="384" font-size="17">water + pine oil + ore mixture</text>
  </g>
</svg>`,
};

const polymerChainFigure: ItemFigure = {
  type: "svg",
  title: "Polymer chain patterns",
  description:
    "Three chain sketches comparing a linear homopolymer, a copolymer, and a cross-linked network.",
  svg: `<svg viewBox="0 0 700 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="430" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="64" y="50" font-size="20">linear homopolymer</text>
    <g transform="translate(70 82)">
      <line x1="28" y1="32" x2="330" y2="32" stroke="#64748b" stroke-width="4"/>
      <g fill="#2563eb"><circle cx="28" cy="32" r="17"/><circle cx="88" cy="32" r="17"/><circle cx="148" cy="32" r="17"/><circle cx="208" cy="32" r="17"/><circle cx="268" cy="32" r="17"/><circle cx="328" cy="32" r="17"/></g>
      <g fill="#ffffff" font-size="15" text-anchor="middle"><text x="28" y="37">A</text><text x="88" y="37">A</text><text x="148" y="37">A</text><text x="208" y="37">A</text><text x="268" y="37">A</text><text x="328" y="37">A</text></g>
    </g>
    <text x="64" y="177" font-size="20">copolymer</text>
    <g transform="translate(70 210)">
      <line x1="28" y1="32" x2="330" y2="32" stroke="#64748b" stroke-width="4"/>
      <circle cx="28" cy="32" r="17" fill="#2563eb"/><circle cx="88" cy="32" r="17" fill="#f97316"/>
      <circle cx="148" cy="32" r="17" fill="#2563eb"/><circle cx="208" cy="32" r="17" fill="#f97316"/>
      <circle cx="268" cy="32" r="17" fill="#2563eb"/><circle cx="328" cy="32" r="17" fill="#f97316"/>
      <g fill="#ffffff" font-size="15" text-anchor="middle"><text x="28" y="37">A</text><text x="88" y="37">B</text><text x="148" y="37">A</text><text x="208" y="37">B</text><text x="268" y="37">A</text><text x="328" y="37">B</text></g>
    </g>
    <text x="444" y="50" font-size="20">cross-linked</text>
    <g transform="translate(440 82)" stroke="#64748b" stroke-width="4">
      <line x1="30" y1="42" x2="190" y2="42"/><line x1="30" y1="104" x2="190" y2="104"/>
      <line x1="70" y1="42" x2="70" y2="104"/><line x1="150" y1="42" x2="150" y2="104"/>
      <g fill="#16a34a" stroke="none"><circle cx="30" cy="42" r="15"/><circle cx="110" cy="42" r="15"/><circle cx="190" cy="42" r="15"/><circle cx="30" cy="104" r="15"/><circle cx="110" cy="104" r="15"/><circle cx="190" cy="104" r="15"/></g>
    </g>
    <text x="430" y="260" font-size="16">network structure gives</text>
    <text x="430" y="284" font-size="16">rigidity, lower flexibility</text>
  </g>
</svg>`,
};

const micelleFigure: ItemFigure = {
  type: "svg",
  title: "Soap micelle around grease",
  description:
    "Soap molecules arranged around a grease droplet with hydrophobic tails inward and ionic heads facing water.",
  svg: `<svg viewBox="0 0 660 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="420" fill="#ffffff"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <circle cx="330" cy="205" r="74" fill="#fde68a" stroke="#92400e" stroke-width="3"/>
    <text x="304" y="210" font-size="18">grease</text>
    <g stroke="#2563eb" stroke-width="4" stroke-linecap="round">
      <line x1="250" y1="124" x2="286" y2="160"/><line x1="330" y1="92" x2="330" y2="142"/>
      <line x1="410" y1="124" x2="374" y2="160"/><line x1="444" y1="205" x2="393" y2="205"/>
      <line x1="410" y1="286" x2="374" y2="250"/><line x1="330" y1="318" x2="330" y2="268"/>
      <line x1="250" y1="286" x2="286" y2="250"/><line x1="216" y1="205" x2="267" y2="205"/>
    </g>
    <g fill="#22c55e" stroke="#15803d" stroke-width="2">
      <circle cx="238" cy="112" r="17"/><circle cx="330" cy="75" r="17"/><circle cx="422" cy="112" r="17"/>
      <circle cx="462" cy="205" r="17"/><circle cx="422" cy="298" r="17"/><circle cx="330" cy="335" r="17"/>
      <circle cx="238" cy="298" r="17"/><circle cx="198" cy="205" r="17"/>
    </g>
    <text x="430" y="76" font-size="16" fill="#15803d">ionic heads</text>
    <text x="430" y="98" font-size="16" fill="#15803d">face water</text>
    <text x="402" y="352" font-size="16" fill="#2563eb">hydrophobic tails</text>
    <text x="402" y="374" font-size="16" fill="#2563eb">enter grease</text>
    <text x="72" y="48" font-size="18">water outside the micelle</text>
    <g fill="#93c5fd" opacity="0.7"><circle cx="105" cy="95" r="6"/><circle cx="128" cy="138" r="5"/><circle cx="535" cy="148" r="6"/><circle cx="548" cy="248" r="5"/><circle cx="126" cy="306" r="6"/></g>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "F.1",
    title: "Surface Chemistry",
    subtopic:
      "Adsorption, catalysis, colloids, emulsions, coagulation and everyday applications.",
    mc: [
      mc(
        L`Silica gel packets are kept with electronic goods mainly because silica gel`,
        2,
        ["adsorption", "daily_life_application"],
        [
          L`adsorbs moisture on its large surface area`,
          L`reacts chemically with copper wires to form a dry coating`,
          L`absorbs the whole air uniformly into its bulk`,
          L`produces oxygen and reduces humidity`,
        ],
        "A",
        {
          B: L`The drying action is not due to reaction with copper; it is a surface adsorption effect.`,
          C: L`Absorption is bulk uptake, but silica gel is used here for surface adsorption of water vapour.`,
          D: L`Silica gel does not produce oxygen; it removes water vapour from the surroundings.`,
        },
        [
          L`Recall the difference between adsorption and absorption.`,
          L`Silica gel has a porous surface and high surface area.`,
          L`Water vapour collects on that surface.`,
        ],
        [
          { explanation: L`Silica gel controls humidity because water molecules are adsorbed on its surface.` },
        ],
      ),
      mc(
        L`The adsorption plot shown is linear for a gas on charcoal. The slope of this Freundlich plot represents`,
        3,
        ["freundlich_isotherm", "graph_interpretation"],
        [
          L`$n$`,
          L`$\frac{1}{n}$`,
          L`$k p$`,
          L`$\frac{x}{m}$ at zero pressure`,
        ],
        "B",
        {
          A: L`The linear form has slope $1/n$, not $n$ itself.`,
          C: L`$kp$ is not the slope of the log-log Freundlich plot.`,
          D: L`The graph does not represent adsorption at exactly zero pressure.`,
        },
        [
          L`Write Freundlich adsorption as $x/m=k p^{1/n}$.`,
          L`Take logarithm on both sides.`,
          L`The coefficient of $\log p$ is the slope.`,
        ],
        [
          { explanation: L`For Freundlich adsorption,` , math: L`\frac{x}{m}=k p^{1/n}` },
          { explanation: L`Taking logarithm gives`, math: L`\log \frac{x}{m}=\log k+\frac{1}{n}\log p` },
          { explanation: L`Thus the slope of the plotted line is $\frac{1}{n}$.` },
        ],
        adsorptionIsothermFigure,
      ),
      mc(
        L`A freshly prepared $\mathrm{Fe(OH)_3}$ sol moves towards the cathode during electrophoresis. The sol particles are`,
        2,
        ["colloids", "electrophoresis"],
        [
          L`neutral because all colloids are uncharged`,
          L`negatively charged because they move to the positive electrode`,
          L`positively charged because they move to the negative electrode`,
          L`molecularly dissolved like common salt`,
        ],
        "C",
        {
          A: L`Electrophoresis itself shows that colloidal particles carry charge.`,
          B: L`The cathode is the negative electrode, so motion towards it indicates positive charge.`,
          D: L`A sol is a colloidal dispersion, not a true molecular solution.`,
        },
        [
          L`The cathode is negatively charged.`,
          L`Opposite charges attract.`,
          L`Movement towards the cathode means the particles are positive.`,
        ],
        [
          { explanation: L`Since the sol particles move towards the cathode, they are attracted to the negative electrode.` },
          { explanation: L`Therefore the $\mathrm{Fe(OH)_3}$ sol particles are positively charged.` },
        ],
      ),
      mc(
        L`In coagulating a negatively charged arsenious sulphide sol, which ion will usually have the greatest coagulating power?`,
        3,
        ["hardy_schulze_rule", "coagulation"],
        [
          L`$\mathrm{Cl^-}$`,
          L`$\mathrm{SO_4^{2-}}$`,
          L`$\mathrm{Na^+}$`,
          L`$\mathrm{Al^{3+}}$`,
        ],
        "D",
        {
          A: L`A negative ion will not be the effective counter-ion for a negatively charged sol.`,
          B: L`Sulphate is also negative, so it is not the counter-ion needed here.`,
          C: L`$\mathrm{Na^+}$ can coagulate, but its charge is lower than $\mathrm{Al^{3+}}$.`,
        },
        [
          L`Use the Hardy-Schulze rule.`,
          L`For a negative sol, cations are the coagulating counter-ions.`,
          L`Higher charge on the counter-ion gives higher coagulating power.`,
        ],
        [
          { explanation: L`A negatively charged sol is coagulated most effectively by oppositely charged ions.` },
          { explanation: L`Among the given cations, $\mathrm{Al^{3+}}$ has the highest charge, so it has the greatest coagulating power.` },
        ],
      ),
      mc(
        L`Milk is best classified as`,
        1,
        ["emulsion", "colloid_classification"],
        [
          L`an emulsion of fat droplets in water`,
          L`a solid sol of protein in metal`,
          L`a suspension of sand in water`,
          L`a gas dispersed in a solid`,
        ],
        "A",
        {
          B: L`Milk is not a metal-based solid sol.`,
          C: L`Milk is colloidal; sand-water is a coarse suspension.`,
          D: L`The dispersed phase in milk is not a gas in a solid.`,
        },
        [
          L`An emulsion has liquid dispersed in liquid.`,
          L`Milk contains fat droplets dispersed in an aqueous medium.`,
          L`That makes it an oil-in-water type emulsion.`,
        ],
        [
          { explanation: L`Milk contains liquid fat droplets dispersed in water, so it is an emulsion.` },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State one difference between adsorption and absorption.`,
        1,
        ["adsorption_vs_absorption"],
        onePart(L`Give the distinction in terms of where the substance is concentrated.`, 1),
        [
          L`Adsorption is a surface effect.`,
          L`Absorption involves the bulk of the material.`,
          L`Use a phrase such as "surface only" versus "throughout the bulk".`,
        ],
        [
          {
            part: "a",
            explanation: L`In adsorption, the substance is concentrated at the surface; in absorption, it is distributed throughout the bulk of the material.`,
          },
        ],
        [L`Saying both terms mean exactly the same thing.`],
      ),
      frq(
        "saq",
        L`A teacher adds a small amount of electrolyte to a colloidal sol and the sol coagulates.`,
        2,
        ["coagulation", "colloid_stability"],
        parts([
          ["a", L`Explain why an electrolyte can coagulate a sol.`, 1],
          ["b", L`State the rule that relates coagulating power to ion charge.`, 1],
        ]),
        [
          L`Colloidal particles are stabilised partly by charge.`,
          L`Counter-ions neutralise this charge.`,
          L`The Hardy-Schulze rule compares coagulating power.`,
        ],
        [
          {
            part: "a",
            explanation: L`The counter-ions from the electrolyte reduce or neutralise the charge on colloidal particles, so the particles aggregate and coagulate.`,
          },
          {
            part: "b",
            explanation: L`According to the Hardy-Schulze rule, higher charge on the effective counter-ion gives greater coagulating power.`,
          },
        ],
        [L`Thinking that coagulation happens because electrolyte increases only the colour of the sol.`],
      ),
      frq(
        "saq",
        L`A sample of hydrogen first shows weak adsorption on nickel at low temperature, but at higher temperature the adsorption becomes more specific and stronger.`,
        2,
        ["physisorption_chemisorption", "temperature_effect"],
        parts([
          ["a", L`Name the low-temperature type of adsorption.`, 1],
          ["b", L`Name the stronger type and explain why temperature can help it begin.`, 1],
        ]),
        [
          L`Weak van der Waals attraction is one type.`,
          L`Bond formation on the surface is another type.`,
          L`Chemisorption often needs activation energy.`,
        ],
        [
          {
            part: "a",
            explanation: L`The low-temperature weak adsorption is physisorption.`,
          },
          {
            part: "b",
            explanation: L`The stronger adsorption is chemisorption; higher temperature can help overcome its activation energy and allow surface bond formation.`,
          },
        ],
        [L`Assuming every adsorption always decreases with temperature in exactly the same way.`],
      ),
      frq(
        "laq",
        L`A student studies adsorption of a gas on charcoal and obtains a straight line when $\log(x/m)$ is plotted against $\log p$.`,
        3,
        ["freundlich_isotherm", "data_reasoning"],
        parts([
          ["a", L`Write the Freundlich adsorption equation.`, 1],
          ["b", L`Write its logarithmic form.`, 1],
          ["c", L`Identify the slope and intercept of the straight line.`, 1],
        ]),
        [
          L`Start from $x/m=kp^{1/n}$.`,
          L`Taking logs converts the power form into a line.`,
          L`Compare with $y=mx+c$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The Freundlich adsorption equation is`,
            math: L`\frac{x}{m}=k p^{1/n}`,
          },
          {
            part: "b",
            explanation: L`The logarithmic form is`,
            math: L`\log\frac{x}{m}=\log k+\frac{1}{n}\log p`,
          },
          {
            part: "c",
            explanation: L`For a plot of $\log(x/m)$ against $\log p$, the slope is $1/n$ and the intercept is $\log k$.`,
          },
        ],
        [L`Calling $\log k$ the slope because it appears before the slope term.`],
        adsorptionIsothermFigure,
      ),
      frq(
        "case",
        L`A water-treatment demonstration uses a colloidal impurity. Alum is added, the mixture is stirred, and larger flocs settle. In a second beaker, soap stabilises tiny oil droplets for a longer time.`,
        3,
        ["surface_chemistry_case", "coagulation_emulsion"],
        parts([
          ["a", L`What process is alum causing in the first beaker?`, 1],
          ["b", L`Why do the particles settle after alum is added?`, 1],
          ["c", L`What is soap acting as in the oil-water mixture?`, 1],
          ["d", L`Name the type of colloid formed by oil droplets dispersed in water.`, 1],
        ]),
        [
          L`Alum supplies ions to destabilise the sol.`,
          L`Destabilised particles aggregate into larger flocs.`,
          L`Soap helps an emulsion persist.`,
        ],
        [
          {
            part: "a",
            explanation: L`Alum causes coagulation or flocculation of the colloidal impurity.`,
          },
          {
            part: "b",
            explanation: L`Charge on the particles is reduced, so they aggregate into larger flocs that can settle under gravity.`,
          },
          {
            part: "c",
            explanation: L`Soap acts as an emulsifying agent.`,
          },
          {
            part: "d",
            explanation: L`Oil droplets dispersed in water form an emulsion.`,
          },
        ],
        [L`Confusing coagulation with dialysis; dialysis removes small ions through a membrane.`],
      ),
    ],
  },
  {
    topicCode: "F.2",
    title: "Isolation of Elements",
    subtopic:
      "Concentration, calcination, roasting, reduction principles and refining methods.",
    mc: [
      mc(
        L`In froth flotation of a sulphide ore, pine oil is added mainly to`,
        2,
        ["froth_flotation", "ore_concentration"],
        [
          L`dissolve the metal completely in water`,
          L`make sulphide ore particles preferentially enter the froth`,
          L`convert all gangue into volatile gas`,
          L`reduce the metal oxide to metal at room temperature`,
        ],
        "B",
        {
          A: L`Froth flotation is a concentration method, not complete dissolution of metal.`,
          C: L`Gangue is separated by wetting differences, not by converting all of it into gas.`,
          D: L`Reduction to metal is a later extraction step, not the role of pine oil.`,
        },
        [
          L`Froth flotation separates particles by wetting behaviour.`,
          L`Sulphide ore is preferentially wetted by oil.`,
          L`The ore-rich froth is skimmed off.`,
        ],
        [
          { explanation: L`Pine oil helps sulphide ore particles attach to froth while gangue remains wetted by water.` },
        ],
        frothFloatFigure,
      ),
      mc(
        L`A carbonate ore is heated strongly in limited or no air to convert it into oxide. This operation is called`,
        1,
        ["calcination", "ore_processing"],
        [
          L`roasting`,
          L`calcination`,
          L`electrorefining`,
          L`liquation`,
        ],
        "B",
        {
          A: L`Roasting is generally heating in excess air, commonly for sulphide ores.`,
          C: L`Electrorefining purifies a metal after extraction.`,
          D: L`Liquation is based on melting-point differences, not carbonate decomposition.`,
        },
        [
          L`Carbonates decompose on heating to oxides and carbon dioxide.`,
          L`The process is done in limited or no air.`,
          L`That term is calcination.`,
        ],
        [
          { explanation: L`Heating carbonate ore in limited or no air to obtain oxide is calcination.` },
        ],
      ),
      mc(
        L`In the extraction of aluminium, cryolite is added to molten alumina mainly to`,
        2,
        ["aluminium_extraction", "electrolysis"],
        [
          L`increase the melting point and stop electrolysis`,
          L`convert aluminium into a volatile carbonyl`,
          L`lower the melting point and improve electrical conductivity`,
          L`act as the final reducing metal`,
        ],
        "C",
        {
          A: L`Cryolite lowers the effective melting point; it does not stop electrolysis.`,
          B: L`Volatile carbonyl formation is related to Mond refining of nickel, not aluminium extraction.`,
          D: L`Aluminium is obtained electrolytically; cryolite is not the reducing metal.`,
        },
        [
          L`Pure alumina has a very high melting point.`,
          L`The electrolyte must conduct electricity well.`,
          L`Cryolite improves the molten mixture for electrolysis.`,
        ],
        [
          { explanation: L`Cryolite lowers the melting point of the alumina mixture and increases its electrical conductivity, making electrolysis feasible.` },
        ],
      ),
      mc(
        L`In the Mond process, nickel is purified because nickel forms`,
        2,
        ["mond_process", "vapour_phase_refining"],
        [
          L`a non-volatile sulphide that is filtered off`,
          L`a magnetic oxide that is separated by a magnet`,
          L`a soluble hydroxide that remains in water`,
          L`a volatile carbonyl that decomposes to pure nickel`,
        ],
        "D",
        {
          A: L`Mond process is vapour-phase refining, not sulphide filtration.`,
          B: L`Magnetic separation is not the key chemistry of Mond purification.`,
          C: L`A soluble hydroxide is not the refining intermediate here.`,
        },
        [
          L`Vapour-phase refining needs a volatile compound.`,
          L`Nickel reacts with carbon monoxide under suitable conditions.`,
          L`The carbonyl decomposes to give pure nickel.`,
        ],
        [
          { explanation: L`Nickel forms volatile nickel tetracarbonyl, which decomposes on heating to give pure nickel.` },
        ],
      ),
      mc(
        L`The Ellingham diagram is especially useful because it helps compare`,
        3,
        ["ellingham_diagram", "reduction"],
        [
          L`the feasibility of reducing metal oxides at different temperatures`,
          L`the colours of hydrated salts in water`,
          L`the rate of polymerisation of monomers`,
          L`the viscosity of colloidal sols`,
        ],
        "A",
        {
          B: L`Ellingham diagrams are thermodynamic extraction tools, not colour charts.`,
          C: L`Polymerisation rates are not read from an Ellingham diagram.`,
          D: L`Colloid viscosity is unrelated to the oxide-reduction lines in the diagram.`,
        },
        [
          L`Ellingham diagrams plot standard Gibbs energy change against temperature.`,
          L`They are used for oxide formation/reduction decisions.`,
          L`A suitable reducing agent can be chosen from relative line positions.`,
        ],
        [
          { explanation: L`An Ellingham diagram compares the thermodynamic tendency of oxides to form or be reduced at different temperatures.` },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the process used to concentrate sulphide ores using froth.`,
        1,
        ["froth_flotation"],
        onePart(L`Give the name of the concentration method.`, 1),
        [
          L`The ore particles enter froth.`,
          L`Oil and water wet different particles differently.`,
          L`This method is named after the froth it produces.`,
        ],
        [
          {
            part: "a",
            explanation: L`The process is froth flotation.`,
          },
        ],
        [L`Calling it calcination, which is a thermal conversion step.`],
      ),
      frq(
        "saq",
        L`A zinc blende sample is converted to zinc oxide before reduction.`,
        2,
        ["roasting", "zinc_extraction"],
        parts([
          ["a", L`Name the thermal process used for sulphide ore.`, 1],
          ["b", L`Write the main chemical change in words.`, 1],
        ]),
        [
          L`Zinc blende is $\mathrm{ZnS}$.`,
          L`Sulphide ores are heated in excess air.`,
          L`Sulphide changes to oxide with sulphur dioxide formation.`,
        ],
        [
          {
            part: "a",
            explanation: L`The process is roasting.`,
          },
          {
            part: "b",
            explanation: L`Zinc sulphide is converted into zinc oxide with sulphur dioxide as a gaseous product.`,
          },
        ],
        [L`Using calcination for a sulphide ore heated in air.`],
      ),
      frq(
        "saq",
        L`A metal sample is purified by making it the anode in an electrolytic cell. A thin sheet of pure metal is used as the cathode.`,
        2,
        ["electrorefining", "metal_purification"],
        parts([
          ["a", L`Name the refining method.`, 1],
          ["b", L`Where does the pure metal get deposited?`, 1],
        ]),
        [
          L`The impure metal dissolves from one electrode.`,
          L`Metal ions are reduced at the other electrode.`,
          L`This is electrorefining.`,
        ],
        [
          {
            part: "a",
            explanation: L`The method is electrolytic refining or electrorefining.`,
          },
          {
            part: "b",
            explanation: L`Pure metal is deposited on the cathode.`,
          },
        ],
        [L`Saying pure metal deposits on the anode; the anode dissolves during electrorefining.`],
      ),
      frq(
        "laq",
        L`Choose a suitable method for each case: a sulphide ore mixed with silica gangue, a carbonate ore before reduction, and nickel containing metallic impurities.`,
        3,
        ["metallurgy_methods", "method_selection"],
        parts([
          ["a", L`Select the concentration method for the sulphide ore.`, 1],
          ["b", L`Select the thermal conversion method for the carbonate ore.`, 1],
          ["c", L`Select a refining method suitable for nickel.`, 1],
        ]),
        [
          L`Sulphide ore concentration often uses wetting differences.`,
          L`Carbonates decompose on heating in limited air.`,
          L`Nickel can form a volatile carbonyl.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use froth flotation for the sulphide ore mixed with silica gangue.`,
          },
          {
            part: "b",
            explanation: L`Use calcination to convert the carbonate ore into oxide.`,
          },
          {
            part: "c",
            explanation: L`Use Mond vapour-phase refining for nickel.`,
          },
        ],
        [L`Using the same extraction method for every ore without considering ore type.`],
        frothFloatFigure,
      ),
      frq(
        "case",
        L`A metallurgy lab compares three operations. Sample P is a sulphide ore heated in excess air. Sample Q is a carbonate ore heated in limited air. Sample R is impure copper purified using an electrolytic cell.`,
        3,
        ["metallurgy_case", "process_identification"],
        parts([
          ["a", L`Name the process for P.`, 1],
          ["b", L`Name the process for Q.`, 1],
          ["c", L`In R, which electrode is made of impure copper?`, 1],
          ["d", L`What collects below the anode during copper electrorefining?`, 1],
        ]),
        [
          L`Sulphide ore in air suggests roasting.`,
          L`Carbonate ore in limited air suggests calcination.`,
          L`In electrorefining, the impure metal is the anode.`,
        ],
        [
          {
            part: "a",
            explanation: L`P undergoes roasting.`,
          },
          {
            part: "b",
            explanation: L`Q undergoes calcination.`,
          },
          {
            part: "c",
            explanation: L`The impure copper is made the anode.`,
          },
          {
            part: "d",
            explanation: L`Insoluble impurities collect as anode mud below the anode.`,
          },
        ],
        [L`Interchanging roasting and calcination only because both involve heating.`],
      ),
    ],
  },
  {
    topicCode: "F.3",
    title: "Polymers",
    subtopic:
      "Polymer classification, addition and condensation polymerisation, fibres, rubbers and biodegradable polymers.",
    mc: [
      mc(
        L`The chain labelled "copolymer" in the figure represents a polymer made from`,
        2,
        ["copolymer", "polymer_classification"],
        [
          L`two different monomer species`,
          L`only one monomer repeated without variation`,
          L`only metal ions joined by coordinate bonds`,
          L`small molecules held only by hydrogen bonding without covalent chains`,
        ],
        "A",
        {
          B: L`A single repeated monomer gives a homopolymer, not a copolymer.`,
          C: L`The figure concerns organic polymer chains, not coordination polymers of metal ions.`,
          D: L`Polymer chains are covalent macromolecules, not just hydrogen-bonded small molecules.`,
        },
        [
          L`Look at the repeating units in the labelled chain.`,
          L`A and B units both appear in the same chain.`,
          L`A polymer from two monomers is a copolymer.`,
        ],
        [
          { explanation: L`A copolymer is formed from two or more different monomer species, as shown by alternating A and B units.` },
        ],
        polymerChainFigure,
      ),
      mc(
        L`Nylon-6,6 is classified as a condensation polymer mainly because its formation involves`,
        2,
        ["condensation_polymer", "nylon"],
        [
          L`only breaking a metal lattice`,
          L`elimination of small molecules during step-growth polymerisation`,
          L`addition of ethene units without any by-product`,
          L`coagulation of colloidal particles`,
        ],
        "B",
        {
          A: L`Nylon formation is an organic polymerisation reaction, not metal-lattice breaking.`,
          C: L`Addition of ethene without by-product describes polythene, not nylon-6,6.`,
          D: L`Coagulation is a colloid process, not polymer formation.`,
        },
        [
          L`Condensation polymerisation joins bifunctional monomers.`,
          L`Small molecules such as water or HCl may be eliminated.`,
          L`Nylon-6,6 has amide linkages formed this way.`,
        ],
        [
          { explanation: L`Nylon-6,6 is made by condensation polymerisation of bifunctional monomers with elimination of small molecules.` },
        ],
      ),
      mc(
        L`High-density polythene is harder and has a higher density than low-density polythene mainly because HDPE chains are`,
        2,
        ["polyethene", "structure_property"],
        [
          L`cross-linked like Bakelite`,
          L`highly branched and loosely packed`,
          L`more linear and closely packed`,
          L`ionic and soluble in water`,
        ],
        "C",
        {
          A: L`HDPE is more linear; Bakelite is a cross-linked thermosetting polymer.`,
          B: L`High branching prevents close packing and is associated with lower density.`,
          D: L`Polythene is not an ionic water-soluble polymer.`,
        },
        [
          L`Density depends on packing of chains.`,
          L`Branching prevents close packing.`,
          L`Linear chains can pack more closely.`,
        ],
        [
          { explanation: L`HDPE has comparatively linear chains, so they pack closely and give higher density and hardness.` },
        ],
      ),
      mc(
        L`Buna-S is made using buta-1,3-diene and styrene. Therefore Buna-S is best described as`,
        2,
        ["synthetic_rubber", "copolymer"],
        [
          L`a natural polysaccharide`,
          L`a thermosetting phenol-formaldehyde resin`,
          L`a biodegradable polyester only`,
          L`a synthetic copolymer rubber`,
        ],
        "D",
        {
          A: L`Buna-S is not a natural carbohydrate polymer.`,
          B: L`Phenol-formaldehyde resin describes Bakelite, not Buna-S.`,
          C: L`Buna-S is a synthetic rubber, not described as a biodegradable polyester.`,
        },
        [
          L`Two monomers are named in the stem.`,
          L`Buta-1,3-diene contributes rubber-like unsaturation.`,
          L`Styrene plus butadiene gives the copolymer Buna-S.`,
        ],
        [
          { explanation: L`Buna-S is a synthetic rubber copolymer made from buta-1,3-diene and styrene.` },
        ],
      ),
      mc(
        L`PHBV is valued as a biodegradable polymer because it can`,
        2,
        ["biodegradable_polymer", "polymer_application"],
        [
          L`undergo environmental degradation more readily than common non-biodegradable plastics`,
          L`never break down under any biological condition`,
          L`act as a strong mineral acid in water`,
          L`convert every plastic waste into protein`,
        ],
        "A",
        {
          B: L`Biodegradable means it can break down under suitable biological/environmental conditions.`,
          C: L`PHBV is a polymer, not a mineral acid.`,
          D: L`It does not convert all plastic waste into protein.`,
        },
        [
          L`The prefix "bio" here points to degradation by biological action.`,
          L`PHBV is a known biodegradable polyester.`,
          L`It is contrasted with persistent plastics.`,
        ],
        [
          { explanation: L`PHBV is a biodegradable polymer, so it can be degraded more readily under suitable environmental or biological conditions than many common plastics.` },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define a monomer in the context of polymer chemistry.`,
        1,
        ["monomer_definition"],
        onePart(L`State the definition.`, 1),
        [
          L`A polymer is a large molecule built from smaller units.`,
          L`The smaller unit repeats in the chain.`,
          L`That repeating starting molecule is the monomer.`,
        ],
        [
          {
            part: "a",
            explanation: L`A monomer is a small molecule that can combine repeatedly with similar or different molecules to form a polymer.`,
          },
        ],
        [L`Defining a monomer as the whole long polymer chain.`],
      ),
      frq(
        "saq",
        L`Classify each polymer as addition or condensation: polythene and terylene.`,
        2,
        ["addition_condensation", "polymer_classification"],
        parts([
          ["a", L`Classify polythene.`, 1],
          ["b", L`Classify terylene.`, 1],
        ]),
        [
          L`Polythene forms by addition of ethene units.`,
          L`Terylene forms from a diol and a dicarboxylic acid.`,
          L`Ester linkage formation with small-molecule loss points to condensation.`,
        ],
        [
          {
            part: "a",
            explanation: L`Polythene is an addition polymer.`,
          },
          {
            part: "b",
            explanation: L`Terylene is a condensation polymer.`,
          },
        ],
        [L`Classifying every polymer with a long chain as an addition polymer.`],
      ),
      frq(
        "saq",
        L`Explain why vulcanisation improves natural rubber.`,
        2,
        ["vulcanisation", "rubber_properties"],
        parts([
          ["a", L`State what is introduced during vulcanisation.`, 1],
          ["b", L`State one property improvement.`, 1],
        ]),
        [
          L`Sulphur is used in vulcanisation.`,
          L`Sulphur links polymer chains.`,
          L`Cross-linking improves mechanical properties.`,
        ],
        [
          {
            part: "a",
            explanation: L`Vulcanisation introduces sulphur cross-links between rubber chains.`,
          },
          {
            part: "b",
            explanation: L`It improves elasticity, strength, durability and resistance to temperature changes; any one such improvement earns credit.`,
          },
        ],
        [L`Saying vulcanisation removes all double bonds without changing properties.`],
      ),
      frq(
        "laq",
        L`Use the polymer chain figure to distinguish linear homopolymer, copolymer and cross-linked structures.`,
        3,
        ["polymer_structure", "figure_interpretation"],
        parts([
          ["a", L`Give one feature of a linear homopolymer.`, 1],
          ["b", L`Give one feature of a copolymer.`, 1],
          ["c", L`Give one effect of cross-linking on polymer properties.`, 1],
        ]),
        [
          L`A homopolymer has one type of repeating unit.`,
          L`A copolymer has more than one monomer type.`,
          L`Cross-links connect chains and restrict movement.`,
        ],
        [
          {
            part: "a",
            explanation: L`A linear homopolymer has one type of monomer unit repeated in an unbranched chain.`,
          },
          {
            part: "b",
            explanation: L`A copolymer contains units derived from two or more different monomers in the same polymer structure.`,
          },
          {
            part: "c",
            explanation: L`Cross-linking restricts chain movement and usually increases rigidity or hardness.`,
          },
        ],
        [L`Calling every polymer with repeated units a homopolymer even when two monomer types are present.`],
        polymerChainFigure,
      ),
      frq(
        "case",
        L`A school display compares four materials: a soft polythene bag, a hard electrical switch made from Bakelite, a nylon rope, and a PHBV sample used for a biodegradable article.`,
        3,
        ["polymer_case", "application_classification"],
        parts([
          ["a", L`Which material is a thermosetting polymer?`, 1],
          ["b", L`Which material contains amide linkages?`, 1],
          ["c", L`Which material is chosen for biodegradability?`, 1],
          ["d", L`Why is the soft polythene bag not the same structural type as Bakelite?`, 1],
        ]),
        [
          L`Bakelite is a cross-linked thermoset.`,
          L`Nylons are polyamides.`,
          L`PHBV is the biodegradable polymer named in the stem.`,
        ],
        [
          {
            part: "a",
            explanation: L`Bakelite is the thermosetting polymer.`,
          },
          {
            part: "b",
            explanation: L`Nylon contains amide linkages.`,
          },
          {
            part: "c",
            explanation: L`PHBV is chosen for biodegradability.`,
          },
          {
            part: "d",
            explanation: L`Polythene is not a heavily cross-linked thermosetting network like Bakelite; it has flexible hydrocarbon chains and can soften on heating depending on grade.`,
          },
        ],
        [L`Treating all plastics as thermosetting because they are solid at room temperature.`],
      ),
    ],
  },
  {
    topicCode: "F.4",
    title: "Chemistry in Everyday Life",
    subtopic:
      "Drugs, receptors and enzymes, antiseptics/disinfectants, food additives, soaps and detergents.",
    mc: [
      mc(
        L`In the micelle figure, the hydrocarbon tails of soap molecules point inward because they are`,
        2,
        ["soap_micelle", "cleansing_action"],
        [
          L`positively charged metal ions that dissolve only in acid`,
          L`large protein enzymes that digest grease`,
          L`hydrophobic and interact better with grease than with water`,
          L`strong oxidising agents that bleach water`,
        ],
        "C",
        {
          A: L`Soap tails are hydrocarbon chains, not positively charged metal ions.`,
          B: L`Soap molecules are not enzymes.`,
          D: L`Cleansing action is mainly emulsification of grease, not oxidation of water.`,
        },
        [
          L`Soap has an ionic head and a non-polar tail.`,
          L`Grease is non-polar.`,
          L`The non-polar tail enters grease while the ionic head faces water.`,
        ],
        [
          { explanation: L`The hydrocarbon tails are hydrophobic, so they orient towards grease; ionic heads remain towards water.` },
        ],
        micelleFigure,
      ),
      mc(
        L`Antacids such as magnesium hydroxide give relief from acidity mainly by`,
        1,
        ["antacids", "medicine_classification"],
        [
          L`stimulating extra hydrochloric acid formation`,
          L`killing every stomach cell permanently`,
          L`neutralising excess acid in the stomach`,
          L`acting as synthetic detergents`,
        ],
        "C",
        {
          A: L`Antacids are used to reduce the effect of excess acid, not stimulate more acid.`,
          B: L`That is not the therapeutic action of antacids.`,
          D: L`Antacids are medicines, not cleansing detergents.`,
        },
        [
          L`The word "anti-acid" is a clue.`,
          L`Metal hydroxides are basic.`,
          L`They neutralise excess stomach acid.`,
        ],
        [
          { explanation: L`Magnesium hydroxide is basic, so it neutralises excess acid in the stomach and relieves acidity symptoms.` },
        ],
      ),
      mc(
        L`A solution used on a living wound should be classified as an antiseptic rather than a disinfectant because antiseptics are`,
        2,
        ["antiseptic_disinfectant", "classification"],
        [
          L`always edible nutrients`,
          L`used only to clean floors and drains`,
          L`the same as all antibiotics taken by mouth`,
          L`applied to living tissues to prevent microbial growth`,
        ],
        "D",
        {
          A: L`Antiseptics are not defined as edible nutrients.`,
          B: L`Chemicals used on inanimate objects are disinfectants.`,
          C: L`Antiseptics are applied externally to tissues; antibiotics are a different medicinal category.`,
        },
        [
          L`Separate living tissue from inanimate objects.`,
          L`Wounds are living tissue.`,
          L`Antiseptics are safe enough for such external use at suitable concentration.`,
        ],
        [
          { explanation: L`Antiseptics are applied to living tissues such as wounds to kill or prevent growth of microorganisms.` },
        ],
      ),
      mc(
        L`A drug blocks the binding site of an enzyme so that the natural substrate cannot bind. The drug is acting as`,
        2,
        ["enzyme_inhibition", "drug_action"],
        [
          L`a food preservative`,
          L`a cleansing surfactant`,
          L`a monomer for nylon`,
          L`an enzyme inhibitor`,
        ],
        "D",
        {
          A: L`The stem describes enzyme-site blocking, not food preservation.`,
          B: L`Surfactants reduce surface tension and form micelles; they do not define this enzyme action.`,
          C: L`A nylon monomer is not described by enzyme-site blocking.`,
        },
        [
          L`The enzyme has a binding site for substrate.`,
          L`The drug prevents substrate binding.`,
          L`That is inhibition of enzyme action.`,
        ],
        [
          { explanation: L`A drug that blocks an enzyme binding site and prevents substrate binding is acting as an enzyme inhibitor.` },
        ],
      ),
      mc(
        L`Synthetic detergents can clean better than ordinary soaps in hard water mainly because detergents`,
        2,
        ["detergents", "hard_water"],
        [
          L`are always proteins that digest the hardness ions`,
          L`do not form insoluble scum as readily with $\mathrm{Ca^{2+}}$ and $\mathrm{Mg^{2+}}$ ions`,
          L`turn hard water into pure ethanol`,
          L`work only when all water is removed`,
        ],
        "B",
        {
          A: L`Detergents are not defined as proteins digesting ions.`,
          C: L`They do not convert water into ethanol.`,
          D: L`Cleaning with detergents occurs in water; removing all water is not the reason.`,
        },
        [
          L`Hard water contains calcium and magnesium ions.`,
          L`Ordinary soaps can form insoluble salts with these ions.`,
          L`Detergents are designed to avoid this scum problem more effectively.`,
        ],
        [
          { explanation: L`Synthetic detergents generally do not form insoluble scum as readily with $\mathrm{Ca^{2+}}$ and $\mathrm{Mg^{2+}}$, so they clean better in hard water.` },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is meant by a receptor in drug action?`,
        1,
        ["drug_receptor"],
        onePart(L`State the meaning in one sentence.`, 1),
        [
          L`Drugs interact with biological macromolecules.`,
          L`Some macromolecules receive chemical messages.`,
          L`A receptor is the binding site/macromolecular target for such a message or drug.`,
        ],
        [
          {
            part: "a",
            explanation: L`A receptor is a biological macromolecular site that binds a chemical messenger or drug and produces a biological response.`,
          },
        ],
        [L`Defining receptor as any laboratory glassware that receives a liquid.`],
      ),
      frq(
        "saq",
        L`Distinguish antiseptics and disinfectants using one example of where each is applied.`,
        2,
        ["antiseptic_disinfectant"],
        parts([
          ["a", L`Where is an antiseptic applied?`, 1],
          ["b", L`Where is a disinfectant applied?`, 1],
        ]),
        [
          L`Antiseptics are used on living tissues.`,
          L`Disinfectants are used on non-living objects or surfaces.`,
          L`Use examples such as wound versus floor/drainage surface.`,
        ],
        [
          {
            part: "a",
            explanation: L`An antiseptic is applied to living tissue, such as a wound or cut, at a suitable concentration.`,
          },
          {
            part: "b",
            explanation: L`A disinfectant is applied to inanimate objects, such as floors, drains or instruments, not directly to living tissue at strong concentration.`,
          },
        ],
        [L`Saying disinfectants are safer than antiseptics for open wounds just because both kill microbes.`],
      ),
      frq(
        "saq",
        L`Explain the cleansing action of soap using the micelle figure.`,
        2,
        ["soap_micelle", "cleansing_action"],
        parts([
          ["a", L`State how the tail and head of soap orient around grease.`, 1],
          ["b", L`Explain how this helps remove grease in water.`, 1],
        ]),
        [
          L`The hydrocarbon tail is non-polar.`,
          L`The ionic head is water-facing.`,
          L`Micelles help disperse grease droplets in water.`,
        ],
        [
          {
            part: "a",
            explanation: L`The hydrophobic hydrocarbon tails enter the grease while the ionic heads face water.`,
          },
          {
            part: "b",
            explanation: L`This forms micelles that keep grease dispersed in water, so the grease can be washed away.`,
          },
        ],
        [L`Saying soap dissolves grease by making grease ionic throughout its bulk.`],
        micelleFigure,
      ),
      frq(
        "laq",
        L`A medicine cabinet contains an antacid, an antihistamine and an analgesic. Classify their general use without recommending any dosage.`,
        3,
        ["drug_classes", "safe_classification"],
        parts([
          ["a", L`State the general use of an antacid.`, 1],
          ["b", L`State the general use of an antihistamine.`, 1],
          ["c", L`State the general use of an analgesic.`, 1],
        ]),
        [
          L`Use chemistry classification, not medical advice.`,
          L`Antacid relates to excess stomach acid.`,
          L`Antihistamine relates to histamine-mediated allergy symptoms; analgesic relates to pain relief.`,
        ],
        [
          {
            part: "a",
            explanation: L`An antacid is used to neutralise or reduce the effect of excess stomach acid.`,
          },
          {
            part: "b",
            explanation: L`An antihistamine counteracts histamine action and is associated with relief of allergy-type symptoms.`,
          },
          {
            part: "c",
            explanation: L`An analgesic is used for pain relief.`,
          },
        ],
        [L`Turning drug classification into personal medical dosage advice, which is outside this chemistry question.`],
      ),
      frq(
        "case",
        L`A household label lists three products: a soap bar for bathing, a phenyl solution for floors, and a food packet containing a permitted preservative.`,
        3,
        ["everyday_chemistry_case", "classification"],
        parts([
          ["a", L`Which product works mainly by micelle formation during cleaning?`, 1],
          ["b", L`Which product is used as a disinfectant-type cleaning agent?`, 1],
          ["c", L`What is the broad purpose of the preservative in the food packet?`, 1],
          ["d", L`Why should the floor-cleaning solution not automatically be applied to living tissue?`, 1],
        ]),
        [
          L`Soap forms micelles with grease in water.`,
          L`Phenyl-type floor cleaner is for inanimate surfaces.`,
          L`Food preservatives slow spoilage under permitted use conditions.`,
        ],
        [
          {
            part: "a",
            explanation: L`The soap bar works mainly by micelle formation during cleaning.`,
          },
          {
            part: "b",
            explanation: L`The phenyl solution is the disinfectant-type cleaning agent for floors.`,
          },
          {
            part: "c",
            explanation: L`The preservative helps delay microbial or chemical spoilage of food under permitted conditions.`,
          },
          {
            part: "d",
            explanation: L`A disinfectant for floors may be too harsh or toxic for living tissue; antiseptics are formulated for living tissue at suitable concentration.`,
          },
        ],
        [L`Assuming every antimicrobial product is safe for every surface and every concentration.`],
      ),
    ],
  },
];

export const chemistry12FormativeReinforcementTopics: Topic[] =
  topicSeeds.map(makeTopic);
