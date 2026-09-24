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
const UNIT = "u8-organic-chemistry-basic-principles-techniques";
const VERSION = "0.1.2";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
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

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|rightarrow|rightleftharpoons|approx|cdot|times|sigma|pi|theta|alpha|beta)\b/g,
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
  return `You chose ${choiceText}. Recheck the carbon skeleton, functional group priority, electron movement, or analysis formula before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class11_chemistry_organic_reasoning",
    };
  });

  const rotation = index % LETTERS.length;
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
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "treats_formula_or_name_as_enough_without_checking_structure",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
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
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_an_organic_answer_without_structural_or_electron_accounting",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
    reviewStatus: REVIEW_STATUS,
    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),
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

function rubric(parts: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: parts.reduce((total, part) => total + part.points, 0),
    criteria: parts.map((part) => ({
      part: part.letter,
      points: part.points,
      description: `Completes part ${part.letter} with correct organic-chemistry reasoning, structure and notation.`,
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
  explanation: string,
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
    solution: [{ step: 1, explanation }],
    ...(figure ? { figure } : {}),
  };
}

function frq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  parts: readonly FrqPart[],
  hints: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
  figure?: ItemFigure,
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts,
    hints,
    rubric: rubric(parts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
  };
}

const carbonShapesFigure: ItemFigure = {
  type: "svg",
  title: "Three carbon environments",
  description:
    "Three labelled carbon centres show four single bonds, one double bond environment and one triple bond environment.",
  svg: `<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="330" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Carbon environments</text>
  <g transform="translate(120 170)">
    <circle cx="0" cy="0" r="26" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
    <text x="0" y="6" text-anchor="middle" font-family="Arial" font-size="18" fill="#1e3a8a">C</text>
    <line x1="0" y1="-26" x2="0" y2="-78" stroke="#334155" stroke-width="3"/>
    <line x1="24" y1="-10" x2="70" y2="-34" stroke="#334155" stroke-width="3"/>
    <line x1="-24" y1="-10" x2="-70" y2="-34" stroke="#334155" stroke-width="3"/>
    <line x1="0" y1="26" x2="0" y2="78" stroke="#334155" stroke-width="3"/>
    <text x="0" y="120" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">four single bonds</text>
  </g>
  <g transform="translate(380 170)">
    <circle cx="-38" cy="0" r="23" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
    <circle cx="38" cy="0" r="23" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
    <line x1="-15" y1="-7" x2="15" y2="-7" stroke="#334155" stroke-width="3"/>
    <line x1="-15" y1="7" x2="15" y2="7" stroke="#334155" stroke-width="3"/>
    <text x="-38" y="6" text-anchor="middle" font-family="Arial" font-size="18" fill="#92400e">C</text>
    <text x="38" y="6" text-anchor="middle" font-family="Arial" font-size="18" fill="#92400e">C</text>
    <text x="0" y="120" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">double bond</text>
  </g>
  <g transform="translate(635 170)">
    <circle cx="-38" cy="0" r="23" fill="#ecfdf5" stroke="#16a34a" stroke-width="3"/>
    <circle cx="38" cy="0" r="23" fill="#ecfdf5" stroke="#16a34a" stroke-width="3"/>
    <line x1="-15" y1="-10" x2="15" y2="-10" stroke="#334155" stroke-width="3"/>
    <line x1="-15" y1="0" x2="15" y2="0" stroke="#334155" stroke-width="3"/>
    <line x1="-15" y1="10" x2="15" y2="10" stroke="#334155" stroke-width="3"/>
    <text x="-38" y="6" text-anchor="middle" font-family="Arial" font-size="18" fill="#166534">C</text>
    <text x="38" y="6" text-anchor="middle" font-family="Arial" font-size="18" fill="#166534">C</text>
    <text x="0" y="120" text-anchor="middle" font-family="Arial" font-size="16" fill="#0f172a">triple bond</text>
  </g>
</svg>`,
};

const skeletalFormulaFigure: ItemFigure = {
  type: "svg",
  title: "Bond-line formula",
  description:
    "A zig-zag carbon skeleton with a terminal hydroxyl group is shown without writing every carbon and hydrogen atom.",
  svg: `<svg viewBox="0 0 660 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="260" fill="#ffffff"/>
  <text x="330" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Bond-line representation</text>
  <polyline points="120,145 210,95 300,145 390,95 480,145" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="480" y1="145" x2="560" y2="110" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/>
  <text x="580" y="112" font-family="Arial" font-size="24" fill="#16a34a">OH</text>
  <text x="330" y="222" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Skeletal chain with a terminal hydroxyl group</text>
</svg>`,
};

const mechanismArrowFigure: ItemFigure = {
  type: "svg",
  title: "Mechanism arrow sketch",
  description:
    "A curved arrow is shown between a reagent and a carbon centre bonded to a leaving group.",
  svg: `<svg viewBox="0 0 720 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="300" fill="#ffffff"/>
  <defs>
    <marker id="arrow-mech" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Curved-arrow idea</text>
  <text x="120" y="156" font-family="Arial" font-size="26" fill="#166534">Nu:</text>
  <circle cx="183" cy="137" r="4" fill="#166534"/>
  <circle cx="198" cy="137" r="4" fill="#166534"/>
  <path d="M215 130 C300 80 405 82 475 132" fill="none" stroke="#2563eb" stroke-width="5" marker-end="url(#arrow-mech)"/>
  <text x="500" y="154" font-family="Arial" font-size="28" fill="#7c2d12">C</text>
  <line x1="530" y1="145" x2="610" y2="145" stroke="#334155" stroke-width="4"/>
  <text x="624" y="154" font-family="Arial" font-size="26" fill="#7c2d12">X</text>
  <text x="360" y="240" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">Curved arrow in a reaction step</text>
</svg>`,
};

const chromatographyFigure: ItemFigure = {
  type: "svg",
  title: "Paper chromatography strip",
  description:
    "A chromatogram shows an origin line, solvent front and two separated spots at different heights.",
  svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="380" fill="#ffffff"/>
  <rect x="205" y="44" width="110" height="285" fill="#f8fafc" stroke="#475569" stroke-width="3"/>
  <line x1="190" y1="300" x2="330" y2="300" stroke="#334155" stroke-width="3"/>
  <line x1="190" y1="80" x2="330" y2="80" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 6"/>
  <circle cx="260" cy="170" r="15" fill="#f97316" stroke="#9a3412" stroke-width="2"/>
  <circle cx="260" cy="230" r="13" fill="#22c55e" stroke="#166534" stroke-width="2"/>
  <text x="342" y="85" font-family="Arial" font-size="16" fill="#1d4ed8">solvent front</text>
  <text x="342" y="305" font-family="Arial" font-size="16" fill="#111827">origin</text>
  <text x="245" y="360" font-family="Arial" font-size="16" fill="#475569">chromatography paper</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "8.1",
    title: "Carbon Tetravalence, Shapes and Representations",
    subtopic:
      "Tetravalence, catenation, sigma and pi bonds, hybridisation-based shapes, condensed, expanded and bond-line representations.",
    mc: [
      mc(
        L`The usual tetravalence of carbon in organic compounds means that a neutral carbon atom commonly forms`,
        1,
        ["tetravalence", "carbon_bonding"],
        [
          "two covalent bonds",
          "four covalent bonds",
          "one ionic bond only",
          "six covalent bonds",
        ],
        "B",
        {
          A: "Carbon has four valence electrons and normally completes an octet by four covalent bonds.",
          C: "Most organic bonding is covalent, not described as one ionic bond.",
          D: "Six ordinary covalent bonds would exceed carbon's octet in Class 11 organic chemistry.",
        },
        [
          "Carbon has atomic number 6.",
          "Its valence-shell configuration has four valence electrons.",
          "It shares four electrons to complete an octet.",
        ],
        "Tetravalence means carbon usually forms four covalent bonds in stable organic molecules.",
      ),
      mc(
        L`The carbon centre with four single bonds in the figure is best associated with which local shape?`,
        2,
        ["carbon_shape", "hybridisation"],
        ["linear", "trigonal planar", "tetrahedral", "square planar"],
        "C",
        {
          A: "Linear geometry is typical around a carbon involved in a triple bond.",
          B: "Trigonal planar geometry is typical around a carbon in a double-bond environment.",
          D: "Square planar is not the ordinary shape for saturated carbon.",
        },
        [
          "Four single bonds mean four electron-pair directions around carbon.",
          "Four equivalent directions minimise repulsion through a tetrahedral arrangement.",
          "The ideal angle is close to $109.5^\\circ$.",
        ],
        "A carbon with four single bonds is usually tetrahedral.",
        carbonShapesFigure,
      ),
      mc(
        L`In ethene, $\mathrm{CH_2=CH_2}$, the carbon-carbon double bond consists of`,
        2,
        ["sigma_pi_bonds", "double_bond"],
        [
          L`two $\sigma$ bonds`,
          L`one $\sigma$ bond and one $\pi$ bond`,
          L`two $\pi$ bonds`,
          L`one ionic bond and one covalent bond`,
        ],
        "B",
        {
          A: "A double bond has only one sigma component.",
          C: "The first overlap between two atoms is sigma; the second is pi.",
          D: "The carbon-carbon double bond is covalent.",
        },
        [
          "A single bond is a sigma bond.",
          "The extra bond in a double bond is a pi bond.",
          "So a double bond is one sigma plus one pi.",
        ],
        L`A carbon-carbon double bond contains one $\sigma$ bond and one $\pi$ bond.`,
      ),
      mc(
        L`The total number of $\sigma$ and $\pi$ bonds in ethyne, $\mathrm{HC\equiv CH}$, is`,
        3,
        ["sigma_pi_count", "triple_bond"],
        [
          L`$2\sigma$ and $1\pi$`,
          L`$3\sigma$ and $2\pi$`,
          L`$1\sigma$ and $3\pi$`,
          L`$4\sigma$ and $1\pi$`,
        ],
        "B",
        {
          A: "This misses one carbon-hydrogen sigma bond and one pi bond.",
          C: "A triple bond has one sigma and two pi bonds, not three pi bonds.",
          D: "There are only three sigma bonds: two C-H and one C-C.",
        },
        [
          "Each C-H single bond is a sigma bond.",
          "A carbon-carbon triple bond has one sigma and two pi bonds.",
          "Add both C-H sigma bonds.",
        ],
        L`Ethyne has two C-H $\sigma$ bonds and one C-C $\sigma$ bond, plus two $\pi$ bonds: $3\sigma+2\pi$.`,
      ),
      mc(
        L`In a bond-line formula, a line end or bend normally represents`,
        1,
        ["bond_line_formula", "structural_representation"],
        [
          "a hydrogen atom only",
          "a carbon atom with enough hydrogens to satisfy valency",
          "an oxygen atom unless labelled",
          "a lone pair of electrons",
        ],
        "B",
        {
          A: "Hydrogens attached to carbon are usually not drawn separately in bond-line notation.",
          C: "Heteroatoms such as oxygen are written explicitly.",
          D: "Line ends and bends represent atoms, not lone pairs.",
        },
        [
          "Bond-line notation suppresses carbon labels.",
          "Hydrogens on carbon are also usually suppressed.",
          "Heteroatoms are written explicitly.",
        ],
        "In skeletal notation, line ends and vertices represent carbon atoms, with implied hydrogens as needed.",
        skeletalFormulaFigure,
      ),
      mc(
        L`Two consecutive members of a homologous series differ by`,
        2,
        ["homologous_series"],
        [
          L`$\mathrm{CH_2}$`,
          L`$\mathrm{CO_2}$`,
          L`$\mathrm{H_2O}$`,
          "one functional group change",
        ],
        "A",
        {
          B: "The repeating unit in a homologous series is not carbon dioxide.",
          C: "Water is not the difference between consecutive homologues.",
          D: "Members of a homologous series have the same functional group.",
        },
        [
          "Compare formulas such as methane, ethane and propane.",
          "Each step adds one carbon and two hydrogens.",
          "That group is $\\mathrm{CH_2}$.",
        ],
        L`Consecutive homologues differ by a $\mathrm{CH_2}$ unit.`,
      ),
      mc(
        L`Which formula alone cannot distinguish ethanol from methoxymethane?`,
        3,
        ["molecular_formula", "structural_formula"],
        [
          "expanded structural formula",
          "molecular formula",
          "condensed structural formula",
          "functional-group formula",
        ],
        "B",
        {
          A: "An expanded structure shows the connectivity.",
          C: "A condensed structure such as $\\mathrm{CH_3CH_2OH}$ or $\\mathrm{CH_3OCH_3}$ shows connectivity.",
          D: "The functional group distinguishes alcohol from ether.",
        },
        [
          "Ethanol and methoxymethane have the same molecular formula.",
          "They differ in atom connectivity.",
          "A molecular formula does not show connectivity.",
        ],
        L`Both have molecular formula $\mathrm{C_2H_6O}$, so the molecular formula alone cannot distinguish them.`,
      ),
      mc(
        L`The main reason carbon forms a very large number of organic compounds is its ability to`,
        2,
        ["catenation", "organic_diversity"],
        [
          "form only ionic compounds",
          "show catenation and form strong covalent bonds",
          "exist only as graphite",
          "avoid bonding with hydrogen",
        ],
        "B",
        {
          A: "Organic compounds are largely covalent.",
          C: "Carbon has many allotropic and compound forms; graphite alone does not explain organic diversity.",
          D: "Many organic compounds contain carbon-hydrogen bonds.",
        },
        [
          "Catenation means self-linking.",
          "Carbon-carbon bonds are strong enough to form chains and rings.",
          "Carbon also bonds with many heteroatoms.",
        ],
        "Carbon's tetravalence, catenation and strong covalent bonding account for organic diversity.",
      ),
      mc(
        L`A carbon atom directly involved in a carbon-carbon triple bond is generally`,
        2,
        ["hybridisation", "shape"],
        [
          L`$sp^3$ and tetrahedral`,
          L`$sp^2$ and trigonal planar`,
          L`$sp$ and linear`,
          L`unhybridised and square planar`,
        ],
        "C",
        {
          A: "$sp^3$ is typical for a carbon with four single bonds.",
          B: "$sp^2$ is typical for a double-bond carbon.",
          D: "Square planar is not the usual description for alkyne carbon.",
        },
        [
          "A triple-bond carbon has two regions of electron density.",
          "Two regions arrange linearly.",
          "The corresponding hybridisation is $sp$.",
        ],
        L`An alkyne carbon is generally $sp$ hybridised and linear.`,
      ),
      mc(
        L`Which representation gives the greatest connectivity detail for $\mathrm{C_2H_6O}$?`,
        2,
        ["structural_representation"],
        [
          L`$\mathrm{C_2H_6O}$ only`,
          L`$\mathrm{CH_3CH_2OH}$`,
          "percentage composition only",
          "empirical formula only",
        ],
        "B",
        {
          A: "The molecular formula gives atom counts but not connectivity.",
          C: "Percentage composition does not show which atoms are bonded.",
          D: "The empirical formula is even less detailed than the molecular formula.",
        },
        [
          "Connectivity tells which atom is attached to which.",
          "Condensed formula can show the carbon chain and functional group.",
          "$\\mathrm{CH_3CH_2OH}$ shows the alcohol group.",
        ],
        L`The condensed structural formula $\mathrm{CH_3CH_2OH}$ gives connectivity information.`,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State what is meant by catenation of carbon.`,
        1,
        ["catenation"],
        singlePart("a", "Define catenation in one sentence.", 1),
        [
          "It is a property of carbon atoms.",
          "Think of carbon-carbon bonding.",
          "It allows chains, branches and rings.",
        ],
        [
          {
            part: "a",
            explanation:
              "Catenation is the ability of carbon atoms to form covalent bonds with other carbon atoms, giving chains, branched chains and rings.",
          },
        ],
        ["Writing only tetravalence without mentioning carbon-carbon bonding."],
      ),
      frq(
        "vsaq",
        L`How many $\sigma$ bonds and how many $\pi$ bonds are present in $\mathrm{CH_2=CH_2}$?`,
        2,
        ["sigma_pi_count", "ethene"],
        singlePart("a", "Give both counts.", 2),
        [
          "There are four C-H single bonds.",
          "The C=C double bond has one sigma and one pi component.",
          "Add all sigma bonds.",
        ],
        [
          {
            part: "a",
            explanation:
              "Ethene has four C-H $\\sigma$ bonds and one C-C $\\sigma$ bond, so there are five $\\sigma$ bonds and one $\\pi$ bond.",
          },
        ],
        ["Counting the double bond as two sigma bonds."],
      ),
      frq(
        "saq",
        L`For the three carbon environments shown in the figure, connect the bond type with shape.`,
        4,
        ["shape", "hybridisation"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State the shape around a carbon with four single bonds.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the shape around a carbon in a double-bond environment.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "State the shape around a carbon in a triple-bond environment.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Give the corresponding hybridisations.",
            points: 2,
          },
        ],
        [
          "Four single bonds correspond to four electron-pair directions.",
          "A double-bond carbon has three regions of electron density.",
          "A triple-bond carbon has two regions of electron density.",
        ],
        [
          {
            part: "a",
            explanation: "Four single bonds give tetrahedral geometry.",
          },
          {
            part: "b",
            explanation: "A double-bond carbon is trigonal planar.",
          },
          { part: "c", explanation: "A triple-bond carbon is linear." },
          {
            part: "d",
            explanation:
              "The corresponding hybridisations are $sp^3$, $sp^2$ and $sp$, respectively.",
          },
        ],
        ["Using the number of bonds instead of regions of electron density."],
        carbonShapesFigure,
      ),
      frq(
        "saq",
        L`Convert the condensed formula $\mathrm{CH_3CH_2CH_2OH}$ into a useful structural description.`,
        3,
        ["condensed_formula", "functional_group"],
        [
          {
            letter: "a",
            promptMarkdown: "How many carbon atoms are in the chain?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which functional group is present?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Is the functional group terminal or internal?",
            points: 1,
          },
        ],
        [
          "Read the carbon groups from left to right.",
          "The last group is $\\mathrm{CH_2OH}$.",
          "The oxygen-hydrogen group is attached at the end.",
        ],
        [
          { part: "a", explanation: "The chain has three carbon atoms." },
          {
            part: "b",
            explanation: "The functional group is hydroxyl, $\\mathrm{-OH}$.",
          },
          {
            part: "c",
            explanation:
              "It is terminal because the $\\mathrm{-OH}$ group is on an end carbon.",
          },
        ],
        ["Reading the formula as if oxygen is between two carbon atoms."],
      ),
      frq(
        "laq",
        L`A compound has molecular formula $\mathrm{C_2H_6O}$. Explain why the molecular formula is not enough to identify a unique compound.`,
        4,
        ["molecular_formula", "connectivity", "isomer_awareness"],
        [
          {
            letter: "a",
            promptMarkdown: "Write two possible condensed structural formulas.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State the functional group in each structure.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Conclude why structural representation is needed.",
            points: 1,
          },
        ],
        [
          "One structure has oxygen at the end as $\\mathrm{-OH}$.",
          "Another has oxygen between two carbon groups.",
          "Same atom counts can have different connectivities.",
        ],
        [
          {
            part: "a",
            explanation:
              "Two possible formulas are $\\mathrm{CH_3CH_2OH}$ and $\\mathrm{CH_3OCH_3}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{CH_3CH_2OH}$ is an alcohol and $\\mathrm{CH_3OCH_3}$ is an ether.",
          },
          {
            part: "c",
            explanation:
              "The molecular formula gives atom counts only; the structural formula is needed to show connectivity.",
          },
        ],
        ["Assuming one molecular formula can represent only one compound."],
      ),
      frq(
        "case",
        L`A learner draws the bond-line formula shown and says every corner must be a hydrogen atom because no carbon symbols are written.`,
        4,
        ["bond_line_formula", "misconception_repair"],
        [
          {
            letter: "a",
            promptMarkdown: "What does each line end or bend represent?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "How are hydrogens attached to carbon shown in this notation?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why is the written $\\mathrm{OH}$ group not omitted?",
            points: 1,
          },
        ],
        [
          "Skeletal formulas suppress carbon labels.",
          "Hydrogens on carbon are implied.",
          "Heteroatoms are written explicitly.",
        ],
        [
          {
            part: "a",
            explanation: "Each line end or bend represents a carbon atom.",
          },
          {
            part: "b",
            explanation:
              "Hydrogens attached to carbon are not usually drawn; they are implied to complete carbon's valency.",
          },
          {
            part: "c",
            explanation:
              "Heteroatoms such as oxygen must be written, so the hydroxyl group appears as $\\mathrm{OH}$.",
          },
        ],
        ["Treating every unlabeled vertex as hydrogen."],
        skeletalFormulaFigure,
      ),
      frq(
        "saq",
        L`Compare $\mathrm{CH_3CH_3}$, $\mathrm{CH_2=CH_2}$ and $\mathrm{HC\equiv CH}$ in terms of carbon-carbon bonding.`,
        4,
        ["sigma_pi_bonds", "bond_order"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the bond order in each compound.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the number of $\\pi$ bonds in each carbon-carbon bond.",
            points: 2,
          },
        ],
        [
          "Single, double and triple bonds have different bond orders.",
          "A single bond has no pi bond.",
          "Double and triple bonds contain one and two pi bonds respectively.",
        ],
        [
          {
            part: "a",
            explanation:
              "Ethane has a single C-C bond, ethene has a $\\mathrm{C=C}$ double bond and ethyne has a $\\mathrm{C\\equiv C}$ triple bond.",
          },
          {
            part: "b",
            explanation:
              "The C-C single bond has 0 pi bonds, the double bond has 1 pi bond and the triple bond has 2 pi bonds.",
          },
        ],
        ["Counting all bonds in a multiple bond as pi bonds."],
      ),
      frq(
        "saq",
        L`A hydrocarbon chain has the condensed formula $\mathrm{CH_3CH_2CH_2CH_3}$.`,
        2,
        ["structural_representation", "valency"],
        [
          {
            letter: "a",
            promptMarkdown: "How many carbon-carbon sigma bonds are present?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "How many carbon-hydrogen sigma bonds are present?",
            points: 1,
          },
        ],
        [
          "The chain has four carbon atoms.",
          "A straight four-carbon chain has three C-C links.",
          "Count all hydrogens in the formula.",
        ],
        [
          { part: "a", explanation: "There are three C-C sigma bonds." },
          { part: "b", explanation: "There are ten C-H sigma bonds." },
        ],
        ["Counting carbon atoms instead of carbon-carbon links."],
      ),
      frq(
        "case",
        L`Three unknown organic compounds are represented only by their formulas: P is $\mathrm{C_3H_8}$, Q is $\mathrm{C_3H_6}$ and R is $\mathrm{C_3H_4}$.`,
        4,
        ["formula_interpretation", "unsaturation"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Which formula matches a saturated open-chain hydrocarbon?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which formula could contain one double bond in an open chain?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which formula could contain one triple bond in an open chain?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State why a structural formula is still needed for certainty.",
            points: 1,
          },
        ],
        [
          "An open-chain alkane has formula $\\mathrm{C_nH_{2n+2}}$.",
          "One double bond reduces hydrogen count by two.",
          "One triple bond reduces hydrogen count by four.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{C_3H_8}$ matches an open-chain saturated hydrocarbon.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{C_3H_6}$ could contain one double bond.",
          },
          {
            part: "c",
            explanation: "$\\mathrm{C_3H_4}$ could contain one triple bond.",
          },
          {
            part: "d",
            explanation:
              "A formula alone does not show whether atoms are arranged as chains, rings or different connectivities.",
          },
        ],
        ["Treating molecular formula as a full structure."],
      ),
      frq(
        "vsaq",
        L`Why are heteroatoms such as oxygen or chlorine written explicitly in bond-line formulas?`,
        2,
        ["bond_line_formula", "heteroatoms"],
        singlePart("a", "Give the reason.", 2),
        [
          "Bond-line notation hides carbon labels.",
          "Hydrogen on carbon is usually implied.",
          "Atoms other than carbon and hydrogen must be identified.",
        ],
        [
          {
            part: "a",
            explanation:
              "Only carbon atoms and their attached hydrogens are usually implied; heteroatoms must be written so the functional group and connectivity are clear.",
          },
        ],
        ["Omitting heteroatoms as if all vertices are carbon."],
      ),
    ],
  },
  {
    topicCode: "8.2",
    title: "Classification and Nomenclature of Organic Compounds",
    subtopic:
      "Functional groups, parent chain choice, locants, prefixes, suffixes and IUPAC naming of simple organic compounds.",
    mc: [
      mc(
        L`The IUPAC name of $\mathrm{CH_3CH_2CH(CH_3)CH_3}$ is`,
        2,
        ["iupac_naming", "branched_alkane"],
        ["2-methylbutane", "3-methylbutane", "pentane", "2-ethylpropane"],
        "A",
        {
          B: "Numbering from the other end gives a lower locant, 2, for the methyl group.",
          C: "The longest continuous chain has four carbons, not five.",
          D: "The parent chain should be the longest continuous chain.",
        },
        [
          "Choose the longest continuous carbon chain.",
          "The parent chain has four carbon atoms.",
          "Number from the end nearer the branch.",
        ],
        "The parent chain is butane and the methyl group is at carbon 2, so the name is 2-methylbutane.",
      ),
      mc(
        L`In the usual classification of organic compounds, benzene is best described as`,
        2,
        ["classification", "aromatic_compounds"],
        [
          "an open-chain aliphatic compound",
          "a homocyclic aromatic compound",
          "a heterocyclic aromatic compound",
          "an acyclic saturated compound",
        ],
        "B",
        {
          A: "Benzene is cyclic, not open-chain.",
          C: "A heterocyclic compound has at least one ring atom other than carbon.",
          D: "Benzene is cyclic and unsaturated, not acyclic saturated.",
        },
        [
          "First decide whether the compound is open-chain or cyclic.",
          "All ring atoms in benzene are carbon atoms.",
          "Benzene is the standard aromatic ring.",
        ],
        "Benzene is a cyclic compound with only carbon atoms in the ring and aromatic character, so it is a homocyclic aromatic compound.",
      ),
      mc(
        L`A three-carbon compound has a carbonyl group between two methyl groups: $\mathrm{CH_3COCH_3}$. Its IUPAC name is`,
        2,
        ["iupac_naming", "ketone"],
        ["propanal", "propanone", "ethanone", "propan-1-ol"],
        "B",
        {
          A: "Propanal has a terminal aldehyde group $\\mathrm{-CHO}$.",
          C: "The parent chain has three carbons, not two.",
          D: "There is no hydroxyl group.",
        },
        [
          "The carbonyl carbon is bonded to two carbon groups.",
          "A three-carbon ketone has suffix -one.",
          "The only possible ketone position is carbon 2.",
        ],
        "The compound is the three-carbon ketone propanone.",
      ),
      mc(
        L`The terminal carbonyl compound $\mathrm{CH_3CH_2CHO}$ is named`,
        2,
        ["iupac_naming", "aldehyde"],
        ["propanal", "propanone", "ethanol", "propanoic acid"],
        "A",
        {
          B: "A ketone has the carbonyl group inside the chain, not terminal as $\\mathrm{-CHO}$.",
          C: "Ethanol has only two carbons and a hydroxyl group.",
          D: "A carboxylic acid contains $\\mathrm{-COOH}$.",
        },
        [
          "The terminal group is $\\mathrm{-CHO}$.",
          "Aldehydes use the suffix -al.",
          "The chain has three carbons.",
        ],
        L`$\mathrm{CH_3CH_2CHO}$ is propanal.`,
      ),
      mc(
        L`Which group has highest suffix priority among the following in ordinary Class 11 IUPAC naming?`,
        3,
        ["functional_group_priority", "nomenclature"],
        [
          L`$\mathrm{-OH}$`,
          L`$\mathrm{-CHO}$`,
          L`$\mathrm{-COOH}$`,
          L`$\mathrm{-Br}$`,
        ],
        "C",
        {
          A: "Alcohol has lower suffix priority than carboxylic acid.",
          B: "Aldehyde has lower priority than carboxylic acid.",
          D: "Halogen is normally used as a prefix.",
        },
        [
          "Carboxylic acids often control the parent suffix.",
          "Halogens are prefixes.",
          "Compare acid, aldehyde and alcohol priority.",
        ],
        L`The carboxyl group $\mathrm{-COOH}$ has the highest priority in this list.`,
      ),
      mc(
        L`The correct IUPAC name of $\mathrm{HOCH_2CH_2Cl}$ is`,
        4,
        ["iupac_naming", "priority_locants"],
        [
          "1-chloroethan-2-ol",
          "2-chloroethan-1-ol",
          "chloroethanol only",
          "2-hydroxychloroethane",
        ],
        "B",
        {
          A: "Numbering should give the hydroxyl suffix group the lowest possible locant.",
          C: "This is not a complete IUPAC name.",
          D: "Hydroxyl is the suffix group here, not merely a prefix.",
        },
        [
          "The $\\mathrm{-OH}$ group is named by the suffix -ol.",
          "Give the carbon bearing $\\mathrm{-OH}$ locant 1.",
          "Chloro then appears at carbon 2.",
        ],
        "The parent is ethan-1-ol with chloro at carbon 2: 2-chloroethan-1-ol.",
      ),
      mc(
        L`The compound $\mathrm{CH_3COOCH_3}$ belongs to which class?`,
        2,
        ["functional_group_classification", "ester"],
        ["aldehyde", "ester", "ether", "ketone"],
        "B",
        {
          A: "An aldehyde has a terminal $\\mathrm{-CHO}$ group.",
          C: "An ether has $\\mathrm{R-O-R'}$ without the carbonyl group.",
          D: "A ketone has $\\mathrm{R-CO-R'}$, not $\\mathrm{R-COO-R'}$.",
        },
        [
          "Look for a carbonyl next to oxygen.",
          "The pattern is $\\mathrm{R-COO-R'}$.",
          "That pattern is an ester.",
        ],
        L`$\mathrm{CH_3COOCH_3}$ has the ester linkage $\mathrm{-COO-}$.`,
      ),
      mc(
        L`For the secondary bromo compound $\mathrm{CH_3CH(Br)CH_2CH_3}$, the correct IUPAC name is`,
        2,
        ["iupac_naming", "haloalkane"],
        ["1-bromobutane", "2-bromobutane", "3-bromobutane", "butyl bromide"],
        "B",
        {
          A: "The bromo substituent is not on an end carbon.",
          C: "Numbering from the nearer end gives locant 2, not 3.",
          D: "This is a common-style name, not the requested IUPAC name.",
        },
        [
          "The parent chain has four carbons.",
          "Number from the end nearer bromine.",
          "Bromine is at carbon 2.",
        ],
        "The correct IUPAC name is 2-bromobutane.",
      ),
      mc(
        L`For the alkene $\mathrm{CH_3CH=CHCH_3}$, the double-bond locant gives the name`,
        2,
        ["iupac_naming", "alkene_locant"],
        ["but-1-ene", "but-2-ene", "2-methylpropene", "butane"],
        "B",
        {
          A: "The double bond is between carbons 2 and 3, so locant 2 is used.",
          C: "The chain is not branched in the written structure.",
          D: "The molecule has a double bond, so it is not butane.",
        },
        [
          "Choose a four-carbon parent chain.",
          "Locate the double bond.",
          "Use the lower double-bond locant.",
        ],
        "The four-carbon alkene has the double bond starting at carbon 2, so it is but-2-ene.",
      ),
      mc(
        L`When $\mathrm{CH_3CH(CH_3)CH_2COOH}$ is numbered from the carboxyl carbon, its IUPAC name is`,
        4,
        ["iupac_naming", "carboxylic_acid"],
        [
          "2-methylbutanoic acid",
          "3-methylbutanoic acid",
          "pentanoic acid",
          "3-methylbutanal",
        ],
        "B",
        {
          A: "Numbering begins at the carboxyl carbon, which makes the methyl group at carbon 3.",
          C: "The longest chain containing the carboxyl carbon has four carbons, not five.",
          D: "The functional group is carboxylic acid, not aldehyde.",
        },
        [
          "The carboxyl carbon is always carbon 1.",
          "Choose the chain that includes $\\mathrm{-COOH}$.",
          "Count from the acid carbon toward the branch.",
        ],
        "The parent is butanoic acid and the methyl group is on carbon 3: 3-methylbutanoic acid.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the IUPAC name of $\mathrm{CH_3CH_2CH_2OH}$.`,
        1,
        ["iupac_naming", "alcohol"],
        singlePart("a", "Give the IUPAC name.", 1),
        [
          "The chain has three carbons.",
          "The functional group is $\\mathrm{-OH}$.",
          "Number to give $\\mathrm{-OH}$ the lowest locant.",
        ],
        [{ part: "a", explanation: "The name is propan-1-ol." }],
        [
          "Writing propanol without the locant when the locant is being tested.",
        ],
      ),
      frq(
        "vsaq",
        L`Name the ether $\mathrm{CH_3OCH_2CH_3}$ by the alkoxyalkane system.`,
        2,
        ["iupac_naming", "ether"],
        singlePart("a", "Give the IUPAC name.", 2),
        [
          "Treat the longer side as the parent alkane.",
          "The smaller alkoxy group is methoxy.",
          "The parent is ethane.",
        ],
        [{ part: "a", explanation: "The IUPAC name is methoxyethane." }],
        ["Naming it as an alcohol because oxygen is present."],
      ),
      frq(
        "saq",
        L`For $\mathrm{CH_3CH_2COOH}$, identify the functional group and give the IUPAC name.`,
        3,
        ["functional_group", "iupac_naming"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the functional group.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Give the IUPAC name.", points: 2 },
        ],
        [
          "The group at the end is $\\mathrm{-COOH}$.",
          "The chain has three carbons including the carboxyl carbon.",
          "Carboxylic acids use the suffix -oic acid.",
        ],
        [
          {
            part: "a",
            explanation: "The functional group is carboxyl, $\\mathrm{-COOH}$.",
          },
          { part: "b", explanation: "The IUPAC name is propanoic acid." },
        ],
        [
          "Counting only carbons before $\\mathrm{COOH}$ and naming it ethanoic acid.",
        ],
      ),
      frq(
        "saq",
        L`Give the IUPAC names of $\mathrm{CH_3CH(Cl)CH_3}$ and $\mathrm{CH_3CH_2CH_2Cl}$.`,
        3,
        ["iupac_naming", "haloalkane"],
        [
          {
            letter: "a",
            promptMarkdown: "Name $\\mathrm{CH_3CH(Cl)CH_3}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name $\\mathrm{CH_3CH_2CH_2Cl}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State why the locants differ.",
            points: 1,
          },
        ],
        [
          "Both have a three-carbon chain.",
          "Locate chlorine in each structure.",
          "Use the lowest possible locant.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{CH_3CH(Cl)CH_3}$ is 2-chloropropane.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{CH_3CH_2CH_2Cl}$ is 1-chloropropane.",
          },
          {
            part: "c",
            explanation:
              "In the first compound chlorine is on the middle carbon; in the second it is on an end carbon.",
          },
        ],
        [
          "Using the same name for both because both have formula $\\mathrm{C_3H_7Cl}$.",
        ],
      ),
      frq(
        "laq",
        L`Name $\mathrm{CH_3CH(CH_3)CH_2CH_2OH}$ by IUPAC rules.`,
        5,
        ["iupac_naming", "branched_alcohol"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Choose the parent chain containing the functional group.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Number the chain correctly.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Write the final name.", points: 2 },
        ],
        [
          "The parent chain must include the carbon bearing $\\mathrm{-OH}$.",
          "Give $\\mathrm{-OH}$ the lowest possible locant.",
          "Then locate the methyl branch.",
        ],
        [
          {
            part: "a",
            explanation:
              "The longest chain containing $\\mathrm{-OH}$ has four carbon atoms.",
          },
          {
            part: "b",
            explanation:
              "Number from the $\\mathrm{-OH}$ end, making it butan-1-ol.",
          },
          {
            part: "c",
            explanation:
              "The methyl substituent is at carbon 3, so the name is 3-methylbutan-1-ol.",
          },
        ],
        [
          "Numbering from the branch end and giving the hydroxyl group a higher locant.",
        ],
      ),
      frq(
        "case",
        L`A teacher gives four labelled samples: P is $\mathrm{CH_3CHO}$, Q is $\mathrm{CH_3COCH_3}$, R is $\mathrm{CH_3COOH}$ and S is $\mathrm{CH_3CH_2OH}$.`,
        4,
        ["case_based", "functional_group_classification"],
        [
          {
            letter: "a",
            promptMarkdown: "Which sample is an aldehyde?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which sample is a ketone?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Which sample is a carboxylic acid?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Which sample is an alcohol?",
            points: 1,
          },
        ],
        [
          "$\\mathrm{-CHO}$ indicates aldehyde.",
          "$\\mathrm{>C=O}$ within a chain indicates ketone.",
          "$\\mathrm{-COOH}$ and $\\mathrm{-OH}$ identify acid and alcohol respectively.",
        ],
        [
          { part: "a", explanation: "P is an aldehyde." },
          { part: "b", explanation: "Q is a ketone." },
          { part: "c", explanation: "R is a carboxylic acid." },
          { part: "d", explanation: "S is an alcohol." },
        ],
        ["Classifying every oxygen-containing compound as an alcohol."],
      ),
      frq(
        "saq",
        L`Write the IUPAC name of $\mathrm{CH_2=CHCH_2Cl}$ and explain the numbering choice.`,
        4,
        ["iupac_naming", "alkene_locant"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the parent alkene.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give the numbering reason.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Write the final name.", points: 2 },
        ],
        [
          "The chain has three carbons.",
          "The double bond receives the lowest possible locant.",
          "Chloro is then located on the remaining carbon.",
        ],
        [
          { part: "a", explanation: "The parent is prop-1-ene." },
          {
            part: "b",
            explanation:
              "Numbering starts from the double-bond end to give the double bond locant 1.",
          },
          { part: "c", explanation: "The final name is 3-chloroprop-1-ene." },
        ],
        ["Numbering from the chlorine end and naming it 1-chloroprop-2-ene."],
      ),
      frq(
        "saq",
        L`A lab sheet lists two carbonyl compounds: $\mathrm{CH_3CH_2CHO}$ and $\mathrm{CH_3CH_2COCH_3}$. Name both.`,
        3,
        ["iupac_naming", "carbonyl_compounds"],
        [
          {
            letter: "a",
            promptMarkdown: "Name $\\mathrm{CH_3CH_2CHO}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name $\\mathrm{CH_3CH_2COCH_3}$.",
            points: 2,
          },
        ],
        [
          "Terminal $\\mathrm{-CHO}$ gives suffix -al.",
          "A carbonyl inside the chain gives suffix -one.",
          "Use the lower locant for the ketone carbonyl.",
        ],
        [
          { part: "a", explanation: "$\\mathrm{CH_3CH_2CHO}$ is propanal." },
          {
            part: "b",
            explanation: "$\\mathrm{CH_3CH_2COCH_3}$ is butan-2-one.",
          },
        ],
        ["Naming both carbonyl compounds as aldehydes."],
      ),
      frq(
        "case",
        L`A student names $\mathrm{CH_3CH(OH)CH_2CH_3}$ as butan-3-ol by counting from the left end as written.`,
        4,
        ["case_based", "naming_error_analysis"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the parent chain.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the correct locant for $\\mathrm{-OH}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Write the correct IUPAC name.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Explain the student's error.",
            points: 1,
          },
        ],
        [
          "The chain has four carbons.",
          "Number from the nearer end to the suffix functional group.",
          "The hydroxyl group should get the lower locant.",
        ],
        [
          { part: "a", explanation: "The parent chain is butane." },
          { part: "b", explanation: "The hydroxyl group is at carbon 2." },
          { part: "c", explanation: "The correct name is butan-2-ol." },
          {
            part: "d",
            explanation:
              "The student counted from the written left side instead of choosing the direction that gives the functional group the lower locant.",
          },
        ],
        ["Assuming the written order fixes the numbering direction."],
      ),
      frq(
        "saq",
        L`A table lists propane, cyclohexane and benzene. Classify each as open-chain aliphatic, alicyclic or aromatic.`,
        3,
        ["classification", "aliphatic_alicyclic_aromatic"],
        [
          { letter: "a", promptMarkdown: "Classify propane.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Classify cyclohexane.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Classify benzene.", points: 1 },
        ],
        [
          "Propane has no ring.",
          "Cyclohexane has a carbon ring but is not aromatic.",
          "Benzene is the standard aromatic ring.",
        ],
        [
          { part: "a", explanation: "Propane is open-chain aliphatic." },
          {
            part: "b",
            explanation: "Cyclohexane is alicyclic.",
          },
          { part: "c", explanation: "Benzene is aromatic." },
        ],
        ["Calling every cyclic compound aromatic."],
      ),
    ],
  },
  {
    topicCode: "8.3",
    title: "Isomerism in Organic Compounds",
    subtopic:
      "Structural isomerism, chain, position, functional and metameric isomerism, plus the basic condition for geometrical isomerism.",
    mc: [
      mc(
        L`The number of chain isomers possible for $\mathrm{C_4H_{10}}$ is`,
        2,
        ["chain_isomerism", "isomer_count"],
        ["1", "2", "3", "4"],
        "B",
        {
          A: "Butane and 2-methylpropane are two different carbon skeletons.",
          C: "Only two carbon skeletons exist for $\\mathrm{C_4H_{10}}$.",
          D: "This overcounts drawings of the same skeleton.",
        },
        [
          "Try a straight chain first.",
          "Then try a branched chain.",
          "Do not count rotations as new isomers.",
        ],
        L`$\mathrm{C_4H_{10}}$ has n-butane and 2-methylpropane, so it has two chain isomers.`,
      ),
      mc(
        L`$\mathrm{CH_3CH_2CH_2OH}$ and $\mathrm{CH_3CH(OH)CH_3}$ are`,
        2,
        ["position_isomerism"],
        ["chain isomers", "position isomers", "functional isomers", "metamers"],
        "B",
        {
          A: "The carbon skeleton remains the same three-carbon chain.",
          C: "Both compounds are alcohols.",
          D: "Metamerism involves different alkyl groups around a polyvalent functional group.",
        },
        [
          "Both have the same functional group.",
          "The carbon chain length is the same.",
          "The position of $\\mathrm{-OH}$ changes.",
        ],
        "They are position isomers because the hydroxyl group occupies different positions on the same carbon skeleton.",
      ),
      mc(
        L`Ethanol and methoxymethane are best described as`,
        3,
        ["functional_isomerism"],
        [
          "chain isomers",
          "position isomers",
          "functional isomers",
          "geometrical isomers",
        ],
        "C",
        {
          A: "They do not merely differ in carbon skeleton.",
          B: "They do not have the same functional group in different positions.",
          D: "No restricted double-bond arrangement is involved.",
        },
        [
          "Both have molecular formula $\\mathrm{C_2H_6O}$.",
          "One is an alcohol and the other is an ether.",
          "Different functional groups mean functional isomerism.",
        ],
        "Ethanol and methoxymethane are functional isomers.",
      ),
      mc(
        L`Which compound can show geometrical isomerism?`,
        4,
        ["geometrical_isomerism"],
        [
          L`$\mathrm{CH_2=CH_2}$`,
          L`$\mathrm{CH_3CH=CH_2}$`,
          L`$\mathrm{CHCl=CHCl}$`,
          L`$\mathrm{CH_2=CCl_2}$`,
        ],
        "C",
        {
          A: "Each double-bond carbon has identical hydrogens.",
          B: "One double-bond carbon has two hydrogens.",
          D: "One double-bond carbon has two identical chlorines.",
        },
        [
          "Geometrical isomerism needs restricted rotation.",
          "Each double-bond carbon must have two different groups.",
          "Check both carbons of the double bond.",
        ],
        L`$\mathrm{CHCl=CHCl}$ can show geometrical isomerism because each double-bond carbon has H and Cl attached.`,
      ),
      mc(
        L`The pair $\mathrm{CH_3OCH_2CH_2CH_3}$ and $\mathrm{CH_3CH_2OCH_2CH_3}$ illustrates`,
        4,
        ["metamerism", "ether"],
        [
          "metamerism",
          "geometrical isomerism",
          "optical isomerism",
          "tautomerism",
        ],
        "A",
        {
          B: "There is no carbon-carbon double bond restricting rotation.",
          C: "No chiral centre is being tested here.",
          D: "No proton shift and double-bond shift are shown.",
        },
        [
          "Both are ethers with formula $\\mathrm{C_4H_{10}O}$.",
          "The alkyl groups on the two sides of oxygen differ.",
          "This is metamerism.",
        ],
        "They are metamers because the carbon groups on either side of the ether oxygen are distributed differently.",
      ),
      mc(
        L`Which pair represents chain isomerism?`,
        3,
        ["chain_isomerism", "classification"],
        [
          L`$\mathrm{CH_3CH_2CH_2CH_3}$ and $\mathrm{(CH_3)_3CH}$`,
          L`$\mathrm{CH_3CH_2OH}$ and $\mathrm{CH_3OCH_3}$`,
          L`$\mathrm{CH_3CH_2CH_2OH}$ and $\mathrm{CH_3CH(OH)CH_3}$`,
          L`cis-$\mathrm{CHCl=CHCl}$ and trans-$\mathrm{CHCl=CHCl}$`,
        ],
        "A",
        {
          B: "This is functional isomerism.",
          C: "This is position isomerism.",
          D: "This is geometrical isomerism.",
        },
        [
          "Chain isomers differ in carbon skeleton.",
          "Butane and 2-methylpropane have different skeletons.",
          "The formula remains the same.",
        ],
        L`The straight-chain and branched $\mathrm{C_4H_{10}}$ structures are chain isomers.`,
      ),
      mc(
        L`Structural isomers have the same molecular formula but differ in`,
        2,
        ["structural_isomerism"],
        [
          "molecular mass only",
          "connectivity of atoms",
          "percentage composition only",
          "number of atoms",
        ],
        "B",
        {
          A: "Same molecular formula gives the same molecular mass.",
          C: "Same molecular formula gives the same percentage composition for the same elements.",
          D: "The number of atoms is the same.",
        },
        [
          "The formula is unchanged.",
          "The bonding pattern changes.",
          "This is a difference in connectivity.",
        ],
        "Structural isomers differ in connectivity of atoms.",
      ),
      mc(
        L`Which pair is not a pair of isomers?`,
        3,
        ["isomer_test", "molecular_formula"],
        [
          L`$\mathrm{C_2H_5OH}$ and $\mathrm{CH_3OCH_3}$`,
          L`$\mathrm{CH_3CH_2CH_3}$ and $\mathrm{CH_3CH_2CH_2CH_3}$`,
          L`$\mathrm{CH_3CH_2CHO}$ and $\mathrm{CH_3COCH_3}$`,
          L`$\mathrm{CH_3CH_2CH_2Cl}$ and $\mathrm{CH_3CHClCH_3}$`,
        ],
        "B",
        {
          A: "Both have formula $\\mathrm{C_2H_6O}$.",
          C: "Both have formula $\\mathrm{C_3H_6O}$.",
          D: "Both have formula $\\mathrm{C_3H_7Cl}$.",
        },
        [
          "Isomers must have the same molecular formula.",
          "Compare carbon counts first.",
          "Propane and butane have different formulas.",
        ],
        "Propane and butane do not have the same molecular formula, so they are not isomers.",
      ),
      mc(
        L`Propanal and propanone show`,
        3,
        ["functional_isomerism", "carbonyl"],
        [
          "position isomerism",
          "functional isomerism",
          "chain isomerism",
          "metamerism",
        ],
        "B",
        {
          A: "They have different functional groups, not just different positions of one group.",
          C: "Their carbon skeleton is not the distinguishing feature.",
          D: "Metamerism is not the correct description for aldehyde-ketone difference.",
        },
        [
          "Both have formula $\\mathrm{C_3H_6O}$.",
          "Propanal is an aldehyde.",
          "Propanone is a ketone.",
        ],
        "They are functional isomers because aldehyde and ketone groups differ.",
      ),
      mc(
        L`If two structures are merely rotations of the same sigma-bond framework, they should be counted as`,
        3,
        ["isomer_counting", "conformations"],
        [
          "different structural isomers",
          "the same compound for structural-isomer counting",
          "functional isomers",
          "different molecular formulas",
        ],
        "B",
        {
          A: "Rotation around a single bond does not change connectivity.",
          C: "No functional group change is implied.",
          D: "The molecular formula remains the same.",
        },
        [
          "Structural isomerism depends on connectivity.",
          "Single-bond rotation usually changes conformation, not connectivity.",
          "Do not overcount rotated drawings.",
        ],
        "Rotations around sigma bonds are not counted as different structural isomers.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the two chain isomers of $\mathrm{C_4H_{10}}$ by name.`,
        2,
        ["chain_isomerism"],
        singlePart("a", "Give both names.", 2),
        ["One is straight-chain.", "One is branched.", "Use IUPAC names."],
        [
          {
            part: "a",
            explanation:
              "The two chain isomers are butane and 2-methylpropane.",
          },
        ],
        ["Writing two drawings of butane as different isomers."],
      ),
      frq(
        "saq",
        L`Classify the isomerism between $\mathrm{CH_3CH_2OH}$ and $\mathrm{CH_3OCH_3}$.`,
        3,
        ["functional_isomerism"],
        [
          {
            letter: "a",
            promptMarkdown: "Show that the molecular formula is the same.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the functional group in each.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Name the type of isomerism.",
            points: 1,
          },
        ],
        [
          "Count C, H and O atoms in both.",
          "One has $\\mathrm{-OH}$ and the other has $\\mathrm{-O-}$.",
          "Same formula but different functional groups.",
        ],
        [
          {
            part: "a",
            explanation: "Both have molecular formula $\\mathrm{C_2H_6O}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{CH_3CH_2OH}$ is an alcohol and $\\mathrm{CH_3OCH_3}$ is an ether.",
          },
          { part: "c", explanation: "They show functional isomerism." },
        ],
        [
          "Calling them position isomers because oxygen appears in different places.",
        ],
      ),
      frq(
        "saq",
        L`Explain why $\mathrm{CH_3CH_2CH_2OH}$ and $\mathrm{CH_3CH(OH)CH_3}$ are position isomers.`,
        3,
        ["position_isomerism"],
        [
          {
            letter: "a",
            promptMarkdown: "Compare their molecular formula.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Compare the functional group.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "State what changes.", points: 1 },
        ],
        [
          "Both have three carbon atoms and one oxygen atom.",
          "Both are alcohols.",
          "The position of $\\mathrm{-OH}$ changes.",
        ],
        [
          {
            part: "a",
            explanation: "Both have molecular formula $\\mathrm{C_3H_8O}$.",
          },
          { part: "b", explanation: "Both contain the hydroxyl group." },
          {
            part: "c",
            explanation:
              "The hydroxyl group is on carbon 1 in one compound and carbon 2 in the other, so they are position isomers.",
          },
        ],
        ["Calling them functional isomers even though both are alcohols."],
      ),
      frq(
        "laq",
        L`A formula $\mathrm{C_3H_6O}$ is assigned to two compounds, one giving aldehyde reactions and the other giving ketone reactions.`,
        5,
        ["case_based", "functional_isomerism", "carbonyl"],
        [
          {
            letter: "a",
            promptMarkdown: "Write a possible aldehyde structure and name.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write a possible ketone structure and name.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the isomerism relation.",
            points: 1,
          },
        ],
        [
          "A three-carbon aldehyde is terminal carbonyl.",
          "A three-carbon ketone has the carbonyl on the middle carbon.",
          "Same formula but different functional groups.",
        ],
        [
          {
            part: "a",
            explanation:
              "The aldehyde can be $\\mathrm{CH_3CH_2CHO}$, propanal.",
          },
          {
            part: "b",
            explanation: "The ketone can be $\\mathrm{CH_3COCH_3}$, propanone.",
          },
          { part: "c", explanation: "They are functional isomers." },
        ],
        ["Writing two names for the same carbonyl structure."],
      ),
      frq(
        "saq",
        L`For $\mathrm{CHCl=CHCl}$, state whether geometrical isomerism is possible and justify.`,
        4,
        ["geometrical_isomerism"],
        [
          {
            letter: "a",
            promptMarkdown: "State the condition on each double-bond carbon.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Apply it to $\\mathrm{CHCl=CHCl}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the two possible arrangements.",
            points: 1,
          },
        ],
        [
          "Double-bond rotation is restricted.",
          "Each double-bond carbon must have two different substituents.",
          "Here each carbon has H and Cl.",
        ],
        [
          {
            part: "a",
            explanation:
              "Each carbon of the double bond must carry two different groups for geometrical isomerism.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{CHCl=CHCl}$ satisfies this because each double-bond carbon has H and Cl.",
          },
          { part: "c", explanation: "It can have cis and trans forms." },
        ],
        ["Checking only one carbon of the double bond."],
      ),
      frq(
        "vsaq",
        L`Why does $\mathrm{CH_2=CCl_2}$ not show geometrical isomerism?`,
        2,
        ["geometrical_isomerism", "negative_case"],
        singlePart("a", "Give the reason.", 2),
        [
          "Look at each double-bond carbon.",
          "One carbon has two identical hydrogens.",
          "The condition fails if either carbon has identical groups.",
        ],
        [
          {
            part: "a",
            explanation:
              "It does not show geometrical isomerism because each double-bond carbon must have two different groups, but one carbon has two identical hydrogens and the other has two identical chlorines.",
          },
        ],
        ["Saying every alkene automatically shows cis-trans isomerism."],
      ),
      frq(
        "case",
        L`A student lists four structures for $\mathrm{C_4H_{10}}$ by drawing butane from left to right, right to left, bent and zig-zag.`,
        4,
        ["case_based", "isomer_counting"],
        [
          {
            letter: "a",
            promptMarkdown: "How many actual chain isomers exist?",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Name them.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "Explain the overcounting error.",
            points: 1,
          },
        ],
        [
          "Drawings can look different without changing connectivity.",
          "Only different carbon skeletons count.",
          "There are straight and branched skeletons.",
        ],
        [
          { part: "a", explanation: "There are two actual chain isomers." },
          { part: "b", explanation: "They are butane and 2-methylpropane." },
          {
            part: "c",
            explanation:
              "The student counted rotations or different drawings of the same connectivity as new isomers.",
          },
        ],
        ["Counting conformations or rotated drawings as structural isomers."],
      ),
      frq(
        "saq",
        L`Show that $\mathrm{CH_3OCH_2CH_2CH_3}$ and $\mathrm{CH_3CH_2OCH_2CH_3}$ are metamers.`,
        4,
        ["metamerism", "ether"],
        [
          {
            letter: "a",
            promptMarkdown: "State the common functional group.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Compare the alkyl groups around oxygen.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "Name the isomerism.", points: 1 },
        ],
        [
          "Both are ethers.",
          "One has methyl and propyl around oxygen.",
          "The other has ethyl and ethyl around oxygen.",
        ],
        [
          {
            part: "a",
            explanation: "Both contain the ether linkage $\\mathrm{-O-}$.",
          },
          {
            part: "b",
            explanation:
              "In one compound the groups are methyl and propyl; in the other they are ethyl and ethyl.",
          },
          { part: "c", explanation: "They are metamers." },
        ],
        [
          "Calling them chain isomers without noticing the different distribution around oxygen.",
        ],
      ),
      frq(
        "saq",
        L`A compound pair has the same molecular formula but one is an aldehyde and the other is a ketone. What type of isomerism is this, and why?`,
        3,
        ["functional_isomerism"],
        [
          { letter: "a", promptMarkdown: "Name the isomerism.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Explain the structural reason.",
            points: 2,
          },
        ],
        [
          "The molecular formula is the same.",
          "The functional groups are different.",
          "Aldehyde and ketone are different functional classes.",
        ],
        [
          { part: "a", explanation: "It is functional isomerism." },
          {
            part: "b",
            explanation:
              "The compounds have the same molecular formula but different functional groups, $\\mathrm{-CHO}$ and $\\mathrm{>C=O}$.",
          },
        ],
        [
          "Calling it position isomerism without checking functional group identity.",
        ],
      ),
      frq(
        "case",
        L`Three pairs are given: P: propan-1-ol/propan-2-ol, Q: ethanol/methoxymethane, R: butane/2-methylpropane.`,
        4,
        ["case_based", "isomerism_classification"],
        [
          { letter: "a", promptMarkdown: "Classify pair P.", points: 1 },
          { letter: "b", promptMarkdown: "Classify pair Q.", points: 1 },
          { letter: "c", promptMarkdown: "Classify pair R.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "State the common test used before classifying isomers.",
            points: 1,
          },
        ],
        [
          "P differs in $\\mathrm{-OH}$ position.",
          "Q differs in functional group.",
          "R differs in carbon skeleton.",
        ],
        [
          { part: "a", explanation: "P shows position isomerism." },
          { part: "b", explanation: "Q shows functional isomerism." },
          { part: "c", explanation: "R shows chain isomerism." },
          {
            part: "d",
            explanation:
              "First check that the pair has the same molecular formula; otherwise it is not an isomeric pair.",
          },
        ],
        ["Classifying pairs before checking whether formulas match."],
      ),
    ],
  },
  {
    topicCode: "8.4",
    title: "Fundamental Concepts in Organic Reaction Mechanism",
    subtopic:
      "Bond fission, electrophiles, nucleophiles, carbocations, carbanions, free radicals, inductive effect, resonance and hyperconjugation.",
    mc: [
      mc(
        L`Homolytic cleavage of a covalent bond generally produces`,
        2,
        ["bond_fission", "free_radicals"],
        [
          "carbocations only",
          "carbanions only",
          "free radicals",
          "only neutral molecules with no unpaired electrons",
        ],
        "C",
        {
          A: "Carbocations arise from heterolytic cleavage when the bonding pair goes to the other atom.",
          B: "Carbanions also arise from heterolytic cleavage.",
          D: "Homolysis gives species with unpaired electrons.",
        },
        [
          "In homolysis, each atom takes one electron from the bond.",
          "That leaves unpaired electrons.",
          "Species with unpaired electrons are free radicals.",
        ],
        "Homolytic fission produces free radicals.",
      ),
      mc(
        L`An electrophile is a species that`,
        1,
        ["electrophile", "reaction_mechanism"],
        [
          "donates an electron pair",
          "accepts an electron pair",
          "always has negative charge",
          "cannot react with pi bonds",
        ],
        "B",
        {
          A: "Electron-pair donors are nucleophiles.",
          C: "Many electrophiles are positive or electron-deficient, not negative.",
          D: "Electrophiles often react with electron-rich pi bonds.",
        },
        [
          "The prefix electro- points toward electron attraction.",
          "Electrophiles seek electron-rich regions.",
          "They accept an electron pair.",
        ],
        "An electrophile is electron-deficient and accepts an electron pair.",
      ),
      mc(
        L`Which species is most clearly a nucleophile?`,
        2,
        ["nucleophile", "electron_pair_donor"],
        [
          L`$\mathrm{OH^-}$`,
          L`$\mathrm{BF_3}$`,
          L`$\mathrm{NO_2^+}$`,
          L`$\mathrm{H^+}$`,
        ],
        "A",
        {
          B: "$\\mathrm{BF_3}$ is electron-deficient and acts as a Lewis acid.",
          C: "$\\mathrm{NO_2^+}$ is a positively charged electrophile.",
          D: "$\\mathrm{H^+}$ accepts an electron pair.",
        },
        [
          "A nucleophile donates an electron pair.",
          "Negative charge often indicates electron richness.",
          "$\\mathrm{OH^-}$ has lone pairs and negative charge.",
        ],
        L`$\mathrm{OH^-}$ is electron-rich and can donate an electron pair, so it is a nucleophile.`,
      ),
      mc(
        L`Heterolytic cleavage of $\mathrm{CH_3-Cl}$ in the direction where chlorine takes the bonding pair gives`,
        3,
        ["heterolytic_fission", "carbocation"],
        [
          L`$\mathrm{CH_3^\cdot}$ and $\mathrm{Cl^\cdot}$`,
          L`$\mathrm{CH_3^+}$ and $\mathrm{Cl^-}$`,
          L`$\mathrm{CH_3^-}$ and $\mathrm{Cl^+}$`,
          L`only $\mathrm{CH_4}$`,
        ],
        "B",
        {
          A: "That would be homolytic cleavage.",
          C: "If chlorine takes the pair, carbon becomes electron-deficient, not negative.",
          D: "No hydrogen transfer is described.",
        },
        [
          "Heterolysis sends both bonding electrons to one atom.",
          "Chlorine is more electronegative.",
          "Carbon is left electron-deficient.",
        ],
        L`If chlorine takes the bonding pair, products are $\mathrm{CH_3^+}$ and $\mathrm{Cl^-}$.`,
      ),
      mc(
        L`The $-I$ effect of chlorine in chloroethane means chlorine`,
        3,
        ["inductive_effect", "electron_withdrawal"],
        [
          "withdraws electron density through sigma bonds",
          "donates electron density only by resonance",
          "has no effect on nearby sigma bonds",
          "always makes carbon negatively charged",
        ],
        "A",
        {
          B: "The inductive effect is transmitted through sigma bonds, not described here as resonance donation.",
          C: "Electronegativity difference polarises nearby sigma bonds.",
          D: "Chlorine withdrawal tends to make the bonded carbon electron-poor.",
        },
        [
          "Inductive effect is a sigma-bond effect.",
          "Chlorine is more electronegative than carbon.",
          "It withdraws electron density.",
        ],
        "Chlorine shows a negative inductive effect by withdrawing electron density through sigma bonds.",
      ),
      mc(
        L`The relative stability of simple alkyl carbocations is usually`,
        3,
        ["carbocation_stability", "hyperconjugation"],
        [
          L`$3^\circ>2^\circ>1^\circ>\mathrm{CH_3^+}$`,
          L`$\mathrm{CH_3^+}>1^\circ>2^\circ>3^\circ$`,
          L`$1^\circ>2^\circ>3^\circ>\mathrm{CH_3^+}$`,
          "all are equally stable",
        ],
        "A",
        {
          B: "Methyl carbocation lacks alkyl stabilisation.",
          C: "More alkyl groups generally stabilise carbocations.",
          D: "Carbocation stability depends strongly on substitution.",
        },
        [
          "Alkyl groups donate electron density by +I effect and hyperconjugation.",
          "More alkyl groups stabilise positive charge better.",
          "Tertiary is more stable than secondary and primary.",
        ],
        L`Alkyl carbocation stability is $3^\circ>2^\circ>1^\circ>\mathrm{CH_3^+}$.`,
      ),
      mc(
        L`A curved arrow in an organic mechanism normally represents movement of`,
        2,
        ["curved_arrow", "electron_movement"],
        [
          "the nucleus",
          "an electron pair",
          "a whole molecule only",
          "heat energy",
        ],
        "B",
        {
          A: "Mechanism arrows track electrons, not nuclei.",
          C: "The arrow does not mean the whole molecule travels along that path.",
          D: "Heat is not represented by a curved electron-pair arrow.",
        },
        [
          "Organic mechanisms are electron-accounting tools.",
          "The tail starts where electrons are available.",
          "The arrow head points where the electron pair goes.",
        ],
        "A curved arrow represents movement of an electron pair.",
      ),
      mc(
        L`The inductive effect in a carbon chain`,
        3,
        ["inductive_effect", "distance"],
        [
          "increases strongly with distance",
          "is transmitted only through pi bonds",
          "decreases with distance from the substituent",
          "requires a free radical",
        ],
        "C",
        {
          A: "Inductive effect becomes weaker with distance.",
          B: "Inductive effect is transmitted through sigma bonds.",
          D: "Free radicals are not required for inductive polarisation.",
        },
        [
          "Inductive effect is a sigma-bond polarisation.",
          "The polarisation is strongest near the substituent.",
          "It fades along the chain.",
        ],
        "The inductive effect decreases rapidly with distance from the substituent.",
      ),
      mc(
        L`Which statement about resonance is correct?`,
        3,
        ["resonance", "delocalisation"],
        [
          "Resonance means atoms rapidly jump between positions",
          "Resonance structures differ only in electron arrangement, not atom positions",
          "Resonance always breaks sigma bonds",
          "Resonance applies only to saturated alkanes",
        ],
        "B",
        {
          A: "Resonance is not physical jumping of atoms between structures.",
          C: "Resonance usually involves pi electrons or lone pairs, not breaking sigma bonds.",
          D: "Saturated alkanes generally do not have the required delocalised pi system.",
        },
        [
          "Compare resonance contributors carefully.",
          "Atom positions stay fixed.",
          "Only electrons are redistributed.",
        ],
        "Resonance structures differ in electron arrangement while atom positions remain the same.",
      ),
      mc(
        L`A carbanion is most directly described as`,
        2,
        ["reactive_intermediate", "carbanion"],
        [
          "carbon with a positive charge",
          "carbon with a negative charge and lone pair",
          "neutral carbon with one unpaired electron",
          "a carbon atom with no valence electrons",
        ],
        "B",
        {
          A: "Positive carbon is a carbocation.",
          C: "A neutral species with an unpaired electron is a free radical.",
          D: "Carbon does not have zero valence electrons in a carbanion.",
        },
        [
          "The suffix anion indicates negative charge.",
          "Carbon bears the charge.",
          "A lone pair is associated with that negative charge.",
        ],
        "A carbanion is a negatively charged carbon species carrying a lone pair.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define electrophile in terms of electron-pair movement.`,
        1,
        ["electrophile"],
        singlePart("a", "Give the definition.", 1),
        [
          "Electrophiles are electron-seeking.",
          "They are electron-deficient.",
          "They accept an electron pair.",
        ],
        [
          {
            part: "a",
            explanation:
              "An electrophile is an electron-deficient species that accepts an electron pair.",
          },
        ],
        ["Calling an electrophile an electron-pair donor."],
      ),
      frq(
        "vsaq",
        L`Define nucleophile in terms of electron-pair movement.`,
        1,
        ["nucleophile"],
        singlePart("a", "Give the definition.", 1),
        [
          "Nucleophiles are nucleus-seeking because they are electron-rich.",
          "They donate an electron pair.",
          "They attack electron-deficient centres.",
        ],
        [
          {
            part: "a",
            explanation:
              "A nucleophile is an electron-rich species that donates an electron pair.",
          },
        ],
        ["Calling a nucleophile an electron-pair acceptor."],
      ),
      frq(
        "saq",
        L`Classify $\mathrm{OH^-}$, $\mathrm{H^+}$ and $\mathrm{BF_3}$ as nucleophile or electrophile.`,
        3,
        ["nucleophile_electrophile", "classification"],
        [
          {
            letter: "a",
            promptMarkdown: "Classify $\\mathrm{OH^-}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Classify $\\mathrm{H^+}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Classify $\\mathrm{BF_3}$.",
            points: 1,
          },
        ],
        [
          "Negative charge often indicates electron richness.",
          "$\\mathrm{H^+}$ accepts an electron pair.",
          "$\\mathrm{BF_3}$ has an electron-deficient boron centre.",
        ],
        [
          { part: "a", explanation: "$\\mathrm{OH^-}$ is a nucleophile." },
          { part: "b", explanation: "$\\mathrm{H^+}$ is an electrophile." },
          { part: "c", explanation: "$\\mathrm{BF_3}$ is an electrophile." },
        ],
        [
          "Classifying every neutral molecule as neither electrophile nor nucleophile.",
        ],
      ),
      frq(
        "saq",
        L`Compare homolytic and heterolytic cleavage of a covalent bond.`,
        4,
        ["bond_fission"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State what happens to the bonding pair in homolytic cleavage.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State what happens to the bonding pair in heterolytic cleavage.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Name the usual type of species produced in homolysis.",
            points: 1,
          },
        ],
        [
          "Homolytic means equal splitting.",
          "Heterolytic means unequal splitting.",
          "Equal splitting produces unpaired electrons.",
        ],
        [
          {
            part: "a",
            explanation:
              "In homolytic cleavage, each bonded atom takes one electron from the shared pair.",
          },
          {
            part: "b",
            explanation:
              "In heterolytic cleavage, both bonding electrons go to one atom, giving ionic species.",
          },
          { part: "c", explanation: "Homolysis produces free radicals." },
        ],
        ["Saying both cleavage types produce the same charged products."],
      ),
      frq(
        "laq",
        L`A mechanism step is represented by the figure with a nucleophile approaching a carbon bonded to a leaving group.`,
        5,
        ["curved_arrow", "nucleophile", "mechanism_interpretation"],
        [
          {
            letter: "a",
            promptMarkdown: "What does the curved arrow show?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which species is electron-rich?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Which centre is being attacked?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Why is this not an arrow for motion of the whole nucleophile?",
            points: 2,
          },
        ],
        [
          "Curved arrows track electron pairs.",
          "The nucleophile has a lone pair.",
          "The carbon bonded to a leaving group is electron-poor.",
        ],
        [
          {
            part: "a",
            explanation: "The curved arrow shows movement of an electron pair.",
          },
          { part: "b", explanation: "The nucleophile is electron-rich." },
          {
            part: "c",
            explanation:
              "The electron-deficient carbon bonded to X is attacked.",
          },
          {
            part: "d",
            explanation:
              "Mechanism arrows begin at an electron source and end where those electrons are used; they are electron-accounting arrows, not path diagrams for whole particles.",
          },
        ],
        [
          "Reading the curved arrow as movement of the entire atom or molecule.",
        ],
        mechanismArrowFigure,
      ),
      frq(
        "saq",
        L`Explain why $\mathrm{(CH_3)_3C^+}$ is more stable than $\mathrm{CH_3CH_2^+}$.`,
        4,
        ["carbocation_stability", "hyperconjugation", "inductive_effect"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify the class of each carbocation.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the stabilising effects of alkyl groups.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Give the stability conclusion.",
            points: 1,
          },
        ],
        [
          "Count alkyl groups attached to the positively charged carbon.",
          "Alkyl groups donate electron density.",
          "More alkyl groups stabilise positive charge better.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{(CH_3)_3C^+}$ is tertiary; $\\mathrm{CH_3CH_2^+}$ is primary.",
          },
          {
            part: "b",
            explanation:
              "Alkyl groups stabilise carbocations by +I effect and hyperconjugation.",
          },
          {
            part: "c",
            explanation: "Therefore the tertiary carbocation is more stable.",
          },
        ],
        [
          "Assuming positive charge is destabilised equally in all carbocations.",
        ],
      ),
      frq(
        "saq",
        L`Use inductive effect to compare the acidity of chloroacetic acid and acetic acid qualitatively.`,
        4,
        ["inductive_effect", "acid_strength"],
        [
          {
            letter: "a",
            promptMarkdown: "State the inductive effect of chlorine.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain its effect on the conjugate base.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State which acid is stronger.",
            points: 1,
          },
        ],
        [
          "Chlorine is electronegative.",
          "It withdraws electron density through sigma bonds.",
          "Stabilising the carboxylate ion increases acidity.",
        ],
        [
          { part: "a", explanation: "Chlorine shows a $-I$ effect." },
          {
            part: "b",
            explanation:
              "The $-I$ effect withdraws electron density and helps stabilise the carboxylate conjugate base.",
          },
          {
            part: "c",
            explanation: "Chloroacetic acid is stronger than acetic acid.",
          },
        ],
        [
          "Saying chlorine makes the acid weaker only because it is a substituent.",
        ],
      ),
      frq(
        "case",
        L`A student writes two resonance structures of an ion but moves one atom to a new position in the second structure.`,
        4,
        ["case_based", "resonance_error"],
        [
          {
            letter: "a",
            promptMarkdown: "What must remain fixed in resonance structures?",
            points: 1,
          },
          { letter: "b", promptMarkdown: "What may change?", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Correct the student's misconception.",
            points: 2,
          },
        ],
        [
          "Resonance contributors are not different structures with atoms moved.",
          "Only electrons are redistributed.",
          "Sigma framework usually remains fixed.",
        ],
        [
          {
            part: "a",
            explanation: "The positions of atoms must remain fixed.",
          },
          {
            part: "b",
            explanation: "Only the arrangement of electrons changes.",
          },
          {
            part: "c",
            explanation:
              "The student's second drawing is not a valid resonance contributor if an atom has moved; it is a different structure, not resonance.",
          },
        ],
        ["Treating resonance as rapid switching of atom positions."],
      ),
      frq(
        "saq",
        L`Classify $\mathrm{CH_3^+}$, $\mathrm{CH_3^-}$ and $\mathrm{CH_3^\cdot}$ as reactive intermediates.`,
        3,
        ["reactive_intermediates"],
        [
          {
            letter: "a",
            promptMarkdown: "Classify $\\mathrm{CH_3^+}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Classify $\\mathrm{CH_3^-}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Classify $\\mathrm{CH_3^\\cdot}$.",
            points: 1,
          },
        ],
        [
          "Positive carbon is a cation.",
          "Negative carbon is an anion.",
          "A dot shows an unpaired electron.",
        ],
        [
          { part: "a", explanation: "$\\mathrm{CH_3^+}$ is a carbocation." },
          { part: "b", explanation: "$\\mathrm{CH_3^-}$ is a carbanion." },
          {
            part: "c",
            explanation: "$\\mathrm{CH_3^\\cdot}$ is a free radical.",
          },
        ],
        ["Calling all three free radicals because they are reactive."],
      ),
      frq(
        "case",
        L`A reagent has a lone pair and negative charge. It reacts with a positively polarised carbon in an organic molecule.`,
        3,
        ["case_based", "nucleophile_electrophile"],
        [
          { letter: "a", promptMarkdown: "Classify the reagent.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "Classify the positively polarised carbon as an electron-pair acceptor or donor.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Describe the direction of electron-pair movement.",
            points: 1,
          },
        ],
        [
          "Negative charge and lone pair indicate electron richness.",
          "A positively polarised carbon is electron-poor.",
          "Electrons move from rich to poor.",
        ],
        [
          { part: "a", explanation: "The reagent is a nucleophile." },
          {
            part: "b",
            explanation:
              "The positively polarised carbon acts as an electron-pair acceptor.",
          },
          {
            part: "c",
            explanation:
              "The electron pair moves from the nucleophile toward the electron-deficient carbon.",
          },
        ],
        ["Drawing the arrow from positive carbon to the nucleophile."],
      ),
    ],
  },
  {
    topicCode: "8.5",
    title: "Purification and Analysis of Organic Compounds",
    subtopic:
      "Crystallisation, sublimation, distillation, chromatography, qualitative detection of elements and quantitative elemental analysis.",
    mc: [
      mc(
        L`Crystallisation is most suitable for purifying an organic solid when`,
        2,
        ["purification", "crystallisation"],
        [
          "the solid and impurity have identical solubility at all temperatures",
          "the compound is much more soluble in hot solvent than in cold solvent",
          "the compound is a gas at room temperature",
          "the impurity has the same crystal form and solubility",
        ],
        "B",
        {
          A: "No separation occurs if solubilities remain identical.",
          C: "Crystallisation is not the normal method for purifying gases.",
          D: "Identical behaviour prevents purification.",
        },
        [
          "Crystallisation depends on solubility differences.",
          "The desired solid dissolves in hot solvent.",
          "It crystallises on cooling while impurities remain dissolved or removed.",
        ],
        "Crystallisation works when solubility changes strongly with temperature and impurities behave differently.",
      ),
      mc(
        L`A mixture of two miscible liquids with boiling points close to each other is best separated by`,
        2,
        ["purification", "fractional_distillation"],
        [
          "simple distillation",
          "fractional distillation",
          "sublimation",
          "filtration",
        ],
        "B",
        {
          A: "Simple distillation is better when boiling points differ widely.",
          C: "Sublimation is for solids that directly vapourise.",
          D: "Filtration separates insoluble solids from liquids, not miscible liquids.",
        },
        [
          "The liquids are miscible.",
          "Their boiling points are close.",
          "A fractionating column improves separation.",
        ],
        "Fractional distillation is used for miscible liquids with close boiling points.",
      ),
      mc(
        L`A mixture of naphthalene and sodium chloride can be separated conveniently by`,
        1,
        ["purification", "sublimation"],
        [
          "sublimation",
          "chromatography only",
          "fractional distillation",
          "steam distillation",
        ],
        "A",
        {
          B: "Chromatography is not the most convenient method for this common sublimable solid mixture.",
          C: "Fractional distillation is for liquids.",
          D: "Steam distillation is not needed for this solid-solid mixture.",
        },
        [
          "Naphthalene is sublimable.",
          "Sodium chloride is not sublimable under ordinary conditions.",
          "Sublimation leaves salt behind.",
        ],
        "Naphthalene sublimes while sodium chloride remains, so sublimation separates the mixture.",
      ),
      mc(
        L`Chromatography separates components mainly because they differ in`,
        2,
        ["chromatography", "separation_principle"],
        [
          "nuclear charge only",
          "adsorption or partition between stationary and mobile phases",
          "number of protons only",
          "melting point only in all cases",
        ],
        "B",
        {
          A: "Chromatography does not separate by nuclear charge alone.",
          C: "Organic molecules are not separated merely by proton number.",
          D: "Melting point is not the general principle of chromatography.",
        },
        [
          "A chromatogram has stationary and mobile phases.",
          "Different components spend different time in each phase.",
          "That difference produces separation.",
        ],
        "Chromatography depends on differential adsorption or partition between phases.",
      ),
      mc(
        L`An organic acid dissolved in ether is shaken with aqueous sodium hydrogen carbonate, and the acid moves into the aqueous layer as its salt. The separation method used is`,
        3,
        ["purification", "differential_extraction"],
        [
          "fractional distillation",
          "sublimation",
          "differential extraction",
          "Carius estimation",
        ],
        "C",
        {
          A: "Fractional distillation separates miscible liquids by boiling point differences.",
          B: "Sublimation separates a sublimable solid from non-sublimable matter.",
          D: "Carius estimation is an analytical method for halogens, not a purification by layer transfer.",
        },
        [
          "The two liquids form separate layers.",
          "The solute is transferred from one layer to another by changing solubility.",
          "A separating funnel is commonly used for this operation.",
        ],
        "The compound is transferred between immiscible layers according to solubility, so the method is differential extraction.",
      ),
      mc(
        L`In Lassaigne's test, sodium fusion is used mainly to convert covalently bonded elements into`,
        3,
        ["qualitative_analysis", "lassaigne_test"],
        [
          "volatile hydrocarbons",
          "ionic sodium salts soluble in water",
          "only carbon dioxide and water",
          "insoluble metals",
        ],
        "B",
        {
          A: "The purpose is not to form volatile hydrocarbons.",
          C: "Carbon and hydrogen combustion analysis gives carbon dioxide and water.",
          D: "The test aims to make water-soluble ionic salts.",
        },
        [
          "Organic compounds are covalent.",
          "Qualitative tests often need ionic forms.",
          "Sodium fusion forms salts such as sodium cyanide, sulfide or halide.",
        ],
        "Sodium fusion converts elements such as N, S and halogens into water-soluble ionic sodium salts.",
      ),
      mc(
        L`In quantitative estimation of carbon and hydrogen by combustion, carbon is measured from the mass of`,
        2,
        ["quantitative_analysis", "carbon_hydrogen"],
        [
          L`$\mathrm{H_2O}$`,
          L`$\mathrm{CO_2}$`,
          L`$\mathrm{NH_3}$`,
          L`$\mathrm{AgCl}$`,
        ],
        "B",
        {
          A: "Water is used to estimate hydrogen.",
          C: "Ammonia is related to some nitrogen estimation methods.",
          D: "Silver chloride is used for halogen estimation.",
        },
        [
          "Combustion converts carbon to an oxide.",
          "Carbon forms carbon dioxide.",
          "The mass of carbon dioxide gives the mass of carbon.",
        ],
        L`Carbon in the organic compound is oxidised to $\mathrm{CO_2}$, whose mass is used to calculate carbon percentage.`,
      ),
      mc(
        L`In Carius method for chlorine estimation, chlorine is finally weighed as`,
        3,
        ["quantitative_analysis", "carius_method"],
        [
          L`$\mathrm{AgCl}$`,
          L`$\mathrm{NaCl}$`,
          L`$\mathrm{HCl}$`,
          L`$\mathrm{Cl_2}$`,
        ],
        "A",
        {
          B: "Sodium chloride is not the precipitate weighed in Carius estimation.",
          C: "Hydrogen chloride is not weighed as the final product.",
          D: "Chlorine gas is not the usual weighed product.",
        },
        [
          "Halogens are converted into halide ions.",
          "Silver nitrate precipitates silver halide.",
          "For chlorine, the precipitate is silver chloride.",
        ],
        L`In Carius estimation, chlorine is precipitated and weighed as $\mathrm{AgCl}$.`,
      ),
      mc(
        L`A compound gives $0.44\text{ g}$ of $\mathrm{CO_2}$ on combustion of $0.30\text{ g}$ sample. The mass of carbon in the sample is`,
        4,
        ["quantitative_analysis", "combustion_calculation"],
        [
          L`$0.12\text{ g}$`,
          L`$0.30\text{ g}$`,
          L`$0.44\text{ g}$`,
          L`$0.18\text{ g}$`,
        ],
        "A",
        {
          B: "This is the sample mass, not carbon mass.",
          C: "This is the mass of carbon dioxide, not carbon.",
          D: "This would correspond to a wrong fraction of carbon in carbon dioxide.",
        },
        [
          "Each mole of $\\mathrm{CO_2}$ contains 12 g carbon per 44 g carbon dioxide.",
          "Mass of carbon is $12/44$ of mass of $\\mathrm{CO_2}$.",
          "Use $0.44\\times12/44$.",
        ],
        L`Mass of carbon $=0.44\times(12/44)=0.12\text{ g}$.`,
      ),
      mc(
        L`Kjeldahl's method estimates nitrogen by converting it mainly into`,
        3,
        ["quantitative_analysis", "kjeldahl_method"],
        [
          "ammonium sulfate during digestion",
          "silver chloride",
          "carbon dioxide",
          "water vapour only",
        ],
        "A",
        {
          B: "Silver chloride is related to chlorine estimation.",
          C: "Carbon dioxide is used for carbon estimation.",
          D: "Water vapour is used for hydrogen estimation.",
        },
        [
          "Kjeldahl's method is a nitrogen estimation method.",
          "The organic compound is digested with concentrated sulfuric acid.",
          "Nitrogen is converted into an ammonium salt.",
        ],
        "In Kjeldahl's method, nitrogen is converted into ammonium sulfate during digestion.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the purification method used for a sublimable organic solid mixed with a non-sublimable impurity.`,
        1,
        ["purification", "sublimation"],
        singlePart("a", "Name the method.", 1),
        [
          "The desired solid directly changes to vapour.",
          "The impurity does not sublime.",
          "Use the method based on sublimation.",
        ],
        [{ part: "a", explanation: "The method is sublimation." }],
        ["Choosing crystallisation without using the sublimable property."],
      ),
      frq(
        "saq",
        L`A liquid mixture contains two miscible liquids with boiling points $78^\circ\text{C}$ and $82^\circ\text{C}$.`,
        3,
        ["purification", "fractional_distillation"],
        [
          {
            letter: "a",
            promptMarkdown: "Which separation method is appropriate?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Why is simple distillation less suitable?",
            points: 2,
          },
        ],
        [
          "The liquids are miscible.",
          "Their boiling points are very close.",
          "A fractionating column improves repeated vapour-liquid equilibration.",
        ],
        [
          { part: "a", explanation: "Fractional distillation is appropriate." },
          {
            part: "b",
            explanation:
              "Simple distillation is less suitable because the boiling points are close; fractional distillation gives better separation through repeated condensation and vaporisation.",
          },
        ],
        ["Choosing filtration for two miscible liquids."],
      ),
      frq(
        "saq",
        L`In paper chromatography, the solvent front moves $12\text{ cm}$ and a component moves $7.2\text{ cm}$ from the origin.`,
        3,
        ["chromatography", "rf_value"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the formula for $R_f$.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Calculate $R_f$.", points: 2 },
        ],
        [
          "$R_f$ compares movement of solute and solvent front.",
          "Both distances are measured from the origin.",
          "Divide $7.2$ by $12$.",
        ],
        [
          {
            part: "a",
            explanation:
              "$R_f=\\dfrac{\\text{distance moved by component}}{\\text{distance moved by solvent front}}$.",
          },
          { part: "b", explanation: "$R_f=7.2/12=0.60$." },
        ],
        ["Measuring the spot from the solvent front instead of the origin."],
        chromatographyFigure,
      ),
      frq(
        "saq",
        L`Explain the purpose of sodium fusion in Lassaigne's test for nitrogen, sulphur and halogens.`,
        4,
        ["qualitative_analysis", "lassaigne_test"],
        [
          {
            letter: "a",
            promptMarkdown: "State why direct testing is difficult.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State what sodium fusion does.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Give one example of an ionic product formed.",
            points: 1,
          },
        ],
        [
          "Organic compounds are mostly covalent.",
          "Qualitative tests often require ionic species in solution.",
          "Sodium converts elements into sodium salts.",
        ],
        [
          {
            part: "a",
            explanation:
              "Direct testing is difficult because elements such as nitrogen, sulphur and halogens are covalently bonded in organic compounds.",
          },
          {
            part: "b",
            explanation:
              "Sodium fusion converts these elements into water-soluble ionic sodium salts.",
          },
          {
            part: "c",
            explanation:
              "Examples include $\\mathrm{NaCN}$ for nitrogen, $\\mathrm{Na_2S}$ for sulphur and $\\mathrm{NaX}$ for halogens.",
          },
        ],
        [
          "Saying sodium fusion is only a heating step with no chemical conversion.",
        ],
      ),
      frq(
        "laq",
        L`On combustion, $0.30\text{ g}$ of an organic compound gives $0.44\text{ g}$ of $\mathrm{CO_2}$ and $0.18\text{ g}$ of $\mathrm{H_2O}$.`,
        5,
        ["quantitative_analysis", "combustion_calculation"],
        [
          {
            letter: "a",
            promptMarkdown: "Find the mass of carbon in the sample.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the mass of hydrogen in the sample.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the percentages of carbon and hydrogen.",
            points: 2,
          },
        ],
        [
          "Carbon is $12/44$ of the mass of carbon dioxide.",
          "Hydrogen is $2/18$ of the mass of water.",
          "Percentage is element mass divided by sample mass times $100$.",
        ],
        [
          {
            part: "a",
            explanation: "Mass of carbon $=0.44\\times12/44=0.12\\text{ g}$.",
          },
          {
            part: "b",
            explanation: "Mass of hydrogen $=0.18\\times2/18=0.020\\text{ g}$.",
          },
          {
            part: "c",
            explanation:
              "$\\%\\mathrm{C}=0.12/0.30\\times100=40.0\\%$ and $\\%\\mathrm{H}=0.020/0.30\\times100\\approx6.67\\%$.",
          },
        ],
        ["Using the full mass of carbon dioxide as the mass of carbon."],
      ),
      frq(
        "case",
        L`A student has an impure solid that dissolves well in hot ethanol but only sparingly in cold ethanol. Most impurities remain dissolved even after cooling.`,
        4,
        ["case_based", "crystallisation"],
        [
          {
            letter: "a",
            promptMarkdown: "Which purification method should be chosen?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Why is hot solvent used first?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Why does cooling help purification?",
            points: 2,
          },
        ],
        [
          "The desired compound has strong temperature-dependent solubility.",
          "Hot solvent dissolves more solid.",
          "Cooling lowers solubility and crystals form.",
        ],
        [
          { part: "a", explanation: "Crystallisation should be chosen." },
          { part: "b", explanation: "Hot solvent dissolves the impure solid." },
          {
            part: "c",
            explanation:
              "On cooling, the desired compound crystallises while many impurities remain in solution, improving purity.",
          },
        ],
        [
          "Choosing distillation for a non-volatile solid purification problem.",
        ],
      ),
      frq(
        "saq",
        L`A compound contains chlorine. In Carius estimation, $0.50\text{ g}$ sample gives $0.287\text{ g}$ of $\mathrm{AgCl}$. Find the percentage of chlorine. Use $\mathrm{AgCl}=143.5$ and $\mathrm{Cl}=35.5$.`,
        5,
        ["quantitative_analysis", "carius_method"],
        [
          {
            letter: "a",
            promptMarkdown: "Find mass of chlorine in the precipitate.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find percentage chlorine in the sample.",
            points: 2,
          },
        ],
        [
          "Only part of the mass of $\\mathrm{AgCl}$ is chlorine.",
          "Use the fraction $35.5/143.5$.",
          "Divide chlorine mass by sample mass and multiply by $100$.",
        ],
        [
          {
            part: "a",
            explanation:
              "Mass of chlorine $=0.287\\times(35.5/143.5)=0.071\\text{ g}$ approximately.",
          },
          {
            part: "b",
            explanation:
              "Percentage chlorine $=(0.071/0.50)\\times100\\approx14.2\\%$.",
          },
        ],
        ["Using the whole mass of silver chloride as chlorine mass."],
      ),
      frq(
        "case",
        L`A coloured plant extract gives two spots on a paper chromatogram. Spot A moves farther than spot B in the same solvent.`,
        3,
        ["case_based", "chromatography_interpretation"],
        [
          {
            letter: "a",
            promptMarkdown: "What does two spots indicate about the extract?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which spot has the larger $R_f$ value?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Give one reason why A moved farther.",
            points: 1,
          },
        ],
        [
          "Each separated component can form a spot.",
          "$R_f$ depends on distance moved from origin.",
          "A component moves farther if it is more soluble in the mobile phase or less strongly retained by the stationary phase.",
        ],
        [
          {
            part: "a",
            explanation: "The extract contains at least two components.",
          },
          { part: "b", explanation: "Spot A has the larger $R_f$ value." },
          {
            part: "c",
            explanation:
              "A may be more soluble in the mobile phase or less strongly adsorbed on the stationary phase.",
          },
        ],
        [
          "Saying the farther spot must be heavier without considering phase interactions.",
        ],
        chromatographyFigure,
      ),
      frq(
        "saq",
        L`Choose a suitable purification method for each mixture: iodine with sand, benzene with toluene, and an organic compound mixed with coloured insoluble impurity.`,
        4,
        ["purification_methods", "method_selection"],
        [
          { letter: "a", promptMarkdown: "Iodine with sand.", points: 1 },
          { letter: "b", promptMarkdown: "Benzene with toluene.", points: 1 },
          {
            letter: "c",
            promptMarkdown:
              "Organic compound with coloured insoluble impurity.",
            points: 2,
          },
        ],
        [
          "Iodine is sublimable.",
          "Benzene and toluene are volatile liquids.",
          "Insoluble impurity can be removed during crystallisation by hot filtration.",
        ],
        [
          { part: "a", explanation: "Use sublimation for iodine and sand." },
          {
            part: "b",
            explanation: "Use fractional distillation for benzene and toluene.",
          },
          {
            part: "c",
            explanation:
              "Use crystallisation with filtration/decolourisation as needed, because the impurity is insoluble or can be removed before crystallisation.",
          },
        ],
        [
          "Applying one purification method to every mixture without checking properties.",
        ],
      ),
      frq(
        "vsaq",
        L`In Dumas method for nitrogen estimation, nitrogen from the organic compound is finally measured mainly as which gas?`,
        1,
        ["quantitative_analysis", "dumas_method"],
        singlePart("a", "Name the gas.", 1),
        [
          "Dumas method is a nitrogen estimation method.",
          "The nitrogen-containing compound is strongly oxidised.",
          "The measured gaseous product is elemental nitrogen.",
        ],
        [
          {
            part: "a",
            explanation:
              "Nitrogen is finally measured mainly as $\\mathrm{N_2}$ gas.",
          },
        ],
        [
          "Confusing Dumas nitrogen estimation with combustion estimation of carbon dioxide or water.",
        ],
      ),
    ],
  },
];

export const organicChemistryBasicsTopics: Topic[] = topicSeeds.map(makeTopic);
