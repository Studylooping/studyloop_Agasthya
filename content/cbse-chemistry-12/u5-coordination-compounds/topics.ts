import { answerRubric } from "../../../lib/content/answer-rubric";
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
const UNIT = "u5-coordination-compounds";
const VERSION = "0.1.4";
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
  commonMisconceptions?: string[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function topicNumber(topicCode: string) {
  return Number(topicCode.split(".")[1] ?? 1);
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|le|ge|neq|mu|sqrt|sigma|pi)\b/g,
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
  return `You chose ${choiceText}. Recheck the coordination sphere, ligand denticity, oxidation state, isomer type, bonding model, or application before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_coordination_reasoning",
    };
  });

  const correctSeedIndex = LETTERS.indexOf(seed.correctLetter);
  const globalMcIndex = (topicNumber(meta.topicCode) - 1) * 5 + index;
  const targetCorrectIndex = (globalMcIndex * 3 + 1) % LETTERS.length;
  const rotation =
    (correctSeedIndex - targetCorrectIndex + LETTERS.length) % LETTERS.length;
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "treats_the_complex_formula_as_ordinary_salt_formula_without_identifying_the_coordination_sphere",
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_coordination_fact_without_linking_it_to_charge_geometry_ligand_field_or_isomerism",
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

function parts(items: readonly [string, string, number][]): readonly FrqPart[] {
  return items.map(([letter, promptMarkdown, points]) => ({
    letter,
    promptMarkdown,
    points,
  }));
}

function rubric(items: readonly FrqPart[], solutions: readonly FrqSolutionPart[]): FrqRubric {
  return answerRubric(items, solutions);
}

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hintItems: readonly [string, string, string],
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
    hints: hintItems,
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
    rubric: rubric(questionParts, workedSolution),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
  };
}

const squarePlanarIsomerFigure: ItemFigure = {
  type: "svg",
  title: "Square-planar isomer layouts",
  description:
    "Two square-planar arrangements with identical ligand counts are shown to compare adjacent and opposite ligand placement.",
  svg: `<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="360" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Square-planar arrangements of MA<tspan baseline-shift="sub" font-size="13">2</tspan>B<tspan baseline-shift="sub" font-size="13">2</tspan></text>
  <g transform="translate(190 180)" font-family="Arial" text-anchor="middle">
    <circle cx="0" cy="0" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="0" y="6" font-size="16" fill="#1e3a8a">M</text>
    <line x1="-18" y1="0" x2="-88" y2="0" stroke="#334155" stroke-width="3"/><line x1="18" y1="0" x2="88" y2="0" stroke="#334155" stroke-width="3"/>
    <line x1="0" y1="-18" x2="0" y2="-88" stroke="#334155" stroke-width="3"/><line x1="0" y1="18" x2="0" y2="88" stroke="#334155" stroke-width="3"/>
    <text x="-112" y="6" font-size="18" fill="#be123c">A</text><text x="112" y="6" font-size="18" fill="#0f766e">B</text>
    <text x="0" y="-104" font-size="18" fill="#be123c">A</text><text x="0" y="118" font-size="18" fill="#0f766e">B</text>
    <text x="0" y="148" font-size="15" fill="#334155">Arrangement I</text>
  </g>
  <g transform="translate(570 180)" font-family="Arial" text-anchor="middle">
    <circle cx="0" cy="0" r="18" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="0" y="6" font-size="16" fill="#1e3a8a">M</text>
    <line x1="-18" y1="0" x2="-88" y2="0" stroke="#334155" stroke-width="3"/><line x1="18" y1="0" x2="88" y2="0" stroke="#334155" stroke-width="3"/>
    <line x1="0" y1="-18" x2="0" y2="-88" stroke="#334155" stroke-width="3"/><line x1="0" y1="18" x2="0" y2="88" stroke="#334155" stroke-width="3"/>
    <text x="-112" y="6" font-size="18" fill="#be123c">A</text><text x="112" y="6" font-size="18" fill="#be123c">A</text>
    <text x="0" y="-104" font-size="18" fill="#0f766e">B</text><text x="0" y="118" font-size="18" fill="#0f766e">B</text>
    <text x="0" y="148" font-size="15" fill="#334155">Arrangement II</text>
  </g>
</svg>`,
};

const octahedralSplittingFigure: ItemFigure = {
  type: "svg",
  title: "Octahedral crystal-field splitting",
  description:
    "A crystal-field splitting diagram shows lower t2g and higher eg levels separated by delta-o for an octahedral complex.",
  svg: `<svg viewBox="0 0 760 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="400" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Octahedral splitting of d orbitals</text>
  <line x1="135" y1="208" x2="285" y2="208" stroke="#2563eb" stroke-width="4"/>
  <line x1="135" y1="250" x2="285" y2="250" stroke="#2563eb" stroke-width="4"/>
  <line x1="135" y1="292" x2="285" y2="292" stroke="#2563eb" stroke-width="4"/>
  <text x="95" y="256" text-anchor="end" font-family="Arial" font-size="18" fill="#1e3a8a">t<tspan baseline-shift="sub" font-size="12">2g</tspan></text>
  <line x1="475" y1="118" x2="625" y2="118" stroke="#dc2626" stroke-width="4"/>
  <line x1="475" y1="168" x2="625" y2="168" stroke="#dc2626" stroke-width="4"/>
  <text x="666" y="150" font-family="Arial" font-size="18" fill="#991b1b">e<tspan baseline-shift="sub" font-size="12">g</tspan></text>
  <line x1="380" y1="250" x2="380" y2="142" stroke="#111827" stroke-width="3" marker-end="url(#arrowUp)"/>
  <defs><marker id="arrowUp" markerWidth="10" markerHeight="10" refX="4" refY="1" orient="auto"><path d="M0,8 L4,0 L8,8 z" fill="#111827"/></marker></defs>
  <text x="402" y="200" font-family="Arial" font-size="18" fill="#111827">&#916;<tspan baseline-shift="sub" font-size="12">o</tspan></text>
  <text x="380" y="340" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">Octahedral field splitting pattern</text>
</svg>`,
};

const carbonylSynergyFigure: ItemFigure = {
  type: "svg",
  title: "Metal-carbonyl synergic bonding",
  description:
    "A schematic shows two reinforcing electron-flow directions between carbon monoxide and a metal centre.",
  svg: `<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="360" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Synergic bonding in a metal carbonyl</text>
  <circle cx="245" cy="180" r="48" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="245" y="188" text-anchor="middle" font-family="Arial" font-size="24" fill="#1e3a8a">M</text>
  <circle cx="520" cy="180" r="36" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="520" y="188" text-anchor="middle" font-family="Arial" font-size="22" fill="#991b1b">CO</text>
  <path d="M480 155 C420 105 340 105 286 154" fill="none" stroke="#16a34a" stroke-width="4" marker-end="url(#arrowLeft)"/>
  <path d="M292 207 C352 265 435 265 486 207" fill="none" stroke="#7c3aed" stroke-width="4" marker-end="url(#arrowRight)"/>
  <defs>
    <marker id="arrowLeft" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/></marker>
    <marker id="arrowRight" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#7c3aed"/></marker>
  </defs>
  <text x="380" y="105" text-anchor="middle" font-family="Arial" font-size="16" fill="#166534">interaction I</text>
  <text x="390" y="284" text-anchor="middle" font-family="Arial" font-size="16" fill="#5b21b6">interaction II</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Werner's Theory and Coordination Terms",
    subtopic:
      "Primary and secondary valencies, coordination sphere, ligand, denticity, coordination number, and oxidation state.",
    mc: [
      mc(
        L`For the compound $\mathrm{[Co(NH_3)_5Cl]Cl_2}$, Werner's primary valency and secondary valency of cobalt are respectively`,
        2,
        ["werner_theory", "primary_secondary_valency", "coordination_number"],
        [L`$2$ and $5$`, L`$3$ and $6$`, L`$3$ and $5$`, L`$1$ and $6$`],
        "B",
        {
          A: L`Two chloride ions are ionisable, but cobalt is in the $+3$ oxidation state and has coordination number $6$.`,
          C: L`The inner chloride also occupies one secondary valency, so the coordination number is $6$, not $5$.`,
          D: L`Only one chloride is inside the sphere, but primary valency is the cobalt oxidation state, not the number of inner chloride ligands.`,
        },
        [
          L`Primary valency corresponds to oxidation state.`,
          L`Secondary valency corresponds to coordination number.`,
          L`Cobalt is bonded to five ammine ligands and one chlorido ligand inside the sphere.`,
        ],
        [
          {
            step: 1,
            explanation: L`In $\mathrm{[Co(NH_3)_5Cl]Cl_2}$, cobalt is $+3$ and six donor atoms are coordinated.`,
            math: L`\text{primary valency}=3,\quad \text{secondary valency}=6`,
          },
        ],
      ),
      mc(
        L`In $\mathrm{[Cr(H_2O)_4Cl_2]Cl}$, the charge on the complex ion and the oxidation state of chromium are respectively`,
        2,
        ["oxidation_state", "coordination_sphere", "complex_charge"],
        [
          L`$+1$ and $+3$`,
          L`$+3$ and $+1$`,
          L`$-1$ and $+3$`,
          L`$+1$ and $+1$`,
        ],
        "A",
        {
          B: L`The complex ion is balanced by one outside chloride, so its charge is $+1$, not $+3$.`,
          C: L`An outside chloride ion requires the coordination sphere to be cationic.`,
          D: L`The two inner chloride ligands each contribute $-1$, so chromium must be $+3$.`,
        },
        [
          L`The outside chloride has charge $-1$.`,
          L`Therefore the complex ion has charge $+1$.`,
          L`Water is neutral and each inner chloride is $-1$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Let chromium oxidation state be $x$.`,
            math: L`x+4(0)+2(-1)=+1\Rightarrow x=+3`,
          },
        ],
      ),
      mc(
        L`The coordination number of the metal in $\mathrm{[PtCl_2(en)]}$ is`,
        2,
        ["coordination_number", "denticity", "ethane_1_2_diamine"],
        [L`$2$`, L`$3$`, L`$4$`, L`$6$`],
        "C",
        {
          A: L`This counts only the two chlorido ligands and ignores that $\mathrm{en}$ donates through two nitrogen atoms.`,
          B: L`This counts ligand units, not donor atoms.`,
          D: L`There are four donor atoms around platinum, not six.`,
        },
        [
          L`Coordination number counts donor atoms.`,
          L`Each chlorido ligand is monodentate.`,
          L`Ethane-1,2-diamine is bidentate.`,
        ],
        [
          {
            step: 1,
            explanation: L`Two chlorido donors plus two nitrogen donors from $\mathrm{en}$ give coordination number $4$.`,
          },
        ],
      ),
      mc(
        L`Which pair correctly matches ligand and denticity?`,
        2,
        ["ligand", "denticity", "chelation"],
        [
          L`$\mathrm{NH_3}$: bidentate`,
          L`$\mathrm{en}$: bidentate`,
          L`$\mathrm{Cl^-}$: hexadentate`,
          L`$\mathrm{EDTA^{4-}}$: monodentate`,
        ],
        "B",
        {
          A: L`Ammonia donates through one nitrogen atom and is monodentate.`,
          C: L`Chloride donates through one atom and is monodentate.`,
          D: L`$\mathrm{EDTA^{4-}}$ is a hexadentate ligand, not monodentate.`,
        },
        [
          L`Denticity means number of donor atoms from one ligand.`,
          L`$\mathrm{en}$ has two nitrogen donor atoms.`,
          L`A ligand with two donor atoms is bidentate.`,
        ],
        [
          {
            step: 1,
            explanation: L`Ethane-1,2-diamine, abbreviated $\mathrm{en}$, binds through two nitrogen atoms and is bidentate.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): In Werner's theory, secondary valencies are non-ionisable and have fixed spatial directions. Reason (R): Secondary valencies correspond to the coordination number and are satisfied by ligands inside the coordination sphere.`,
        3,
        ["assertion_reason", "werner_theory", "secondary_valency"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains why secondary valencies are fixed in space and non-ionisable.`,
          C: L`The reason correctly states the role of secondary valencies.`,
          D: L`The assertion is one of Werner's key postulates.`,
        },
        [
          L`Recall the two types of valency in Werner's theory.`,
          L`Primary valency is ionisable; secondary valency is not.`,
          L`Secondary valency fixes the number and arrangement of ligands.`,
        ],
        [
          {
            step: 1,
            explanation: L`Both statements are true, and the reason explains the assertion.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define a ligand in a coordination compound.`,
        1,
        ["definition", "ligand", "coordination_bond"],
        parts([["a", L`Give the definition.`, 1]]),
        [
          L`Think of the species attached to the central metal ion.`,
          L`A ligand donates an electron pair.`,
          L`Mention coordinate bond formation.`,
        ],
        [
          {
            part: "a",
            explanation: L`A ligand is an ion or molecule that donates an electron pair to a central metal atom or ion to form a coordinate bond.`,
          },
        ],
        [
          L`Calling every ion near the compound a ligand, including counter-ions outside the sphere.`,
          L`Forgetting electron-pair donation.`,
        ],
      ),
      frq(
        "saq",
        L`For $\mathrm{[Co(en)_2Cl_2]^+}$, calculate the oxidation state of cobalt and the coordination number.`,
        2,
        ["oxidation_state", "coordination_number", "denticity"],
        parts([
          ["a", L`Find the oxidation state of cobalt.`, 1],
          ["b", L`Find the coordination number.`, 1],
        ]),
        [
          L`$\mathrm{en}$ is neutral and bidentate.`,
          L`Each chlorido ligand has charge $-1$.`,
          L`Coordination number counts donor atoms, not ligand units.`,
        ],
        [
          {
            part: "a",
            explanation: L`Let the oxidation state of cobalt be $x$.`,
            math: L`x+2(0)+2(-1)=+1\Rightarrow x=+3`,
          },
          {
            part: "b",
            explanation: L`Two $\mathrm{en}$ ligands provide four donor atoms and two chlorido ligands provide two more, so coordination number is $6$.`,
          },
        ],
        [
          L`Counting two $\mathrm{en}$ ligands as only two donor atoms.`,
          L`Treating $\mathrm{en}$ as charged.`,
        ],
      ),
      frq(
        "saq",
        L`Distinguish between a double salt and a coordination compound in aqueous solution, using one example of each.`,
        2,
        ["double_salt", "coordination_compound", "dissociation"],
        parts([
          ["a", L`State the difference in dissociation behaviour.`, 1],
          ["b", L`Give one example of each.`, 1],
        ]),
        [
          L`A double salt loses its identity in solution.`,
          L`A coordination compound retains the complex ion in solution.`,
          L`Use familiar examples such as Mohr's salt and $\mathrm{K_4[Fe(CN)_6]}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`A double salt dissociates completely into simple ions, whereas a coordination compound retains its complex ion in solution.`,
          },
          {
            part: "b",
            explanation: L`For example, Mohr's salt is a double salt; $\mathrm{K_4[Fe(CN)_6]}$ is a coordination compound because $\mathrm{[Fe(CN)_6]^{4-}}$ remains as a complex ion.`,
          },
        ],
        [
          L`Saying a coordination compound never ionises at all.`,
          L`Giving only formulas without comparing solution behaviour.`,
        ],
      ),
      frq(
        "laq",
        L`A compound has formula $\mathrm{[Co(NH_3)_4Cl_2]Cl}$. Analyse it using Werner's theory.`,
        3,
        ["werner_theory", "ionisation", "oxidation_state"],
        parts([
          ["a", L`Find the oxidation state of cobalt.`, 1],
          ["b", L`State the coordination number of cobalt.`, 1],
          [
            "c",
            L`How many moles of $\mathrm{AgCl}$ will form immediately from one mole of the compound with excess $\mathrm{AgNO_3}$?`,
            1,
          ],
        ]),
        [
          L`Only the chloride outside the bracket is immediately ionisable.`,
          L`Inside the bracket there are four neutral ammine ligands and two chlorido ligands.`,
          L`The complex ion has charge $+1$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Let cobalt oxidation state be $x$.`,
            math: L`x+4(0)+2(-1)=+1\Rightarrow x=+3`,
          },
          {
            part: "b",
            explanation: L`Cobalt is attached to four ammine ligands and two chlorido ligands, so coordination number is $6$.`,
          },
          {
            part: "c",
            explanation: L`There is one chloride ion outside the coordination sphere, so one mole of compound gives one mole of $\mathrm{AgCl}$.`,
          },
        ],
        [
          L`Precipitating inner-sphere chloride immediately with silver nitrate.`,
          L`Taking coordination number as the number of ligand types instead of donor atoms.`,
        ],
      ),
      frq(
        "case",
        L`Three cobalt(III) compounds have the same six-coordinate cobalt centre. Compound I gives three moles of $\mathrm{AgCl}$ per mole with excess $\mathrm{AgNO_3}$, compound II gives two, and compound III gives one. The formula unit in each case contains cobalt, ammonia and three chloride ions.`,
        3,
        ["case_based", "werner_theory", "ionisable_chloride"],
        parts([
          [
            "a",
            L`Which compound has all three chloride ions outside the coordination sphere?`,
            1,
          ],
          [
            "b",
            L`For compound II, how many chloride ions are inside the coordination sphere?`,
            1,
          ],
          [
            "c",
            L`Write a likely coordination formula for compound III if the coordination number is $6$.`,
            1,
          ],
        ]),
        [
          L`Silver nitrate detects chloride ions outside the coordination sphere.`,
          L`The number of $\mathrm{AgCl}$ moles equals the number of outside chloride ions.`,
          L`Compound III has one outside chloride, so two chloride ligands must be inside.`,
        ],
        [
          {
            part: "a",
            explanation: L`Compound I has all three chloride ions outside because it gives three moles of $\mathrm{AgCl}$.`,
          },
          {
            part: "b",
            explanation: L`Compound II gives two moles of $\mathrm{AgCl}$, so two chloride ions are outside and one is inside.`,
          },
          {
            part: "c",
            explanation: L`A likely formula is $\mathrm{[Co(NH_3)_4Cl_2]Cl}$, with two chlorido ligands inside and one chloride ion outside.`,
          },
        ],
        [
          L`Assuming all chloride ions always precipitate with silver nitrate immediately.`,
          L`Forgetting that cobalt remains six-coordinate in all three compounds.`,
        ],
      ),
    ],
  },
  {
    topicCode: "5.2",
    title: "Nomenclature and Formula Writing",
    subtopic:
      "IUPAC naming of mononuclear coordination compounds, ligand order, oxidation state, and formula construction.",
    mc: [
      mc(
        L`The correct IUPAC name of $\mathrm{[Co(NH_3)_5Cl]Cl_2}$ is`,
        2,
        ["iupac_nomenclature", "ammine", "chlorido"],
        [
          L`pentaamminechloridocobalt(III) chloride`,
          L`chloropentaamminecobalt(II) chloride`,
          L`pentaamminechloridocobalt(III) dichloride`,
          L`pentaammoniachlorocobalt(III) chloride`,
        ],
        "A",
        {
          B: L`Cobalt is in the $+3$ state, and modern ligand naming uses chlorido.`,
          C: L`The counter-ion part is named chloride; the prefix dichloride is not used in this salt name.`,
          D: L`The ligand name is ammine, not ammonia, in coordination nomenclature.`,
        },
        [
          L`Name the cationic complex first.`,
          L`Use ammine for $\mathrm{NH_3}$ and chlorido for coordinated $\mathrm{Cl^-}$.`,
          L`Find cobalt oxidation state before writing the Roman numeral.`,
        ],
        [
          {
            step: 1,
            explanation: L`The complex cation is pentaamminechloridocobalt(III), followed by chloride counter-ions.`,
          },
        ],
      ),
      mc(
        L`The formula of potassium hexacyanidoferrate(II) is`,
        2,
        ["formula_writing", "anionic_complex", "oxidation_state"],
        [
          L`$\mathrm{K_3[Fe(CN)_6]}$`,
          L`$\mathrm{K_4[Fe(CN)_6]}$`,
          L`$\mathrm{[Fe(CN)_6]K_2}$`,
          L`$\mathrm{K[Fe(CN)_6]}$`,
        ],
        "B",
        {
          A: L`This would balance a $3-$ complex, but iron(II) with six cyanido ligands gives a $4-$ complex.`,
          C: L`The formula must show four potassium ions for charge balance.`,
          D: L`One potassium ion is not enough to balance $\mathrm{[Fe(CN)_6]^{4-}}$.`,
        },
        [
          L`Iron is $+2$.`,
          L`Each cyanido ligand is $-1$.`,
          L`The complex charge is $2-6=-4$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Four potassium ions are required to balance $\mathrm{[Fe(CN)_6]^{4-}}$.`,
            math: L`\mathrm{K_4[Fe(CN)_6]}`,
          },
        ],
      ),
      mc(
        L`The IUPAC name of $\mathrm{[Ni(CO)_4]}$ is`,
        2,
        ["iupac_nomenclature", "metal_carbonyl", "oxidation_state_zero"],
        [
          L`tetracarbonylnickelate(II)`,
          L`tetracarbonylnickel(0)`,
          L`nickel tetracarbonate(IV)`,
          L`tetracyanonickel(0)`,
        ],
        "B",
        {
          A: L`The complex is neutral, so nickel does not take the -ate ending here, and CO is neutral.`,
          C: L`Carbonyl is not carbonate, and nickel is in the zero oxidation state.`,
          D: L`CO is carbonyl, not cyanido.`,
        },
        [
          L`Carbon monoxide as a ligand is carbonyl.`,
          L`CO is neutral.`,
          L`The neutral complex has nickel in oxidation state $0$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Four carbonyl ligands around nickel in oxidation state zero give tetracarbonylnickel(0).`,
          },
        ],
      ),
      mc(
        L`Which formula matches diamminedichloridoplatinum(II)?`,
        2,
        ["formula_writing", "platinum_complex", "neutral_complex"],
        [
          L`$\mathrm{[Pt(NH_3)_2Cl_2]}$`,
          L`$\mathrm{[Pt(NH_3)_2Cl_2]Cl_2}$`,
          L`$\mathrm{K_2[Pt(NH_3)_2Cl_2]}$`,
          L`$\mathrm{[PtCl_4]^{2-}}$`,
        ],
        "A",
        {
          B: L`The name has no counter-ion after the complex name, so the compound is neutral.`,
          C: L`Potassium would appear in the name if the complex were an anion salt.`,
          D: L`This formula has no ammine ligands and four chlorido ligands.`,
        },
        [
          L`Platinum(II) has charge $+2$.`,
          L`Two ammine ligands are neutral and two chlorido ligands give $-2$.`,
          L`The whole complex is neutral.`,
        ],
        [
          {
            step: 1,
            explanation: L`The ligand set is two ammine and two chlorido around $\mathrm{Pt^{2+}}$, so the formula is neutral.`,
            math: L`\mathrm{[Pt(NH_3)_2Cl_2]}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): In the name potassium diamminetetrachloridochromate(III), the metal name ends in -ate. Reason (R): The coordination entity is an anion.`,
        3,
        ["assertion_reason", "nomenclature", "anionic_complex"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The -ate ending is specifically used because the complex ion is anionic.`,
          C: L`The reason is true for this name.`,
          D: L`The assertion is true; chromate is used for an anionic chromium complex.`,
        },
        [
          L`Find the charge of $\mathrm{[Cr(NH_3)_2Cl_4]^-}$.`,
          L`Anionic complexes use the metal name ending in -ate.`,
          L`Potassium is the counter-cation.`,
        ],
        [
          {
            step: 1,
            explanation: L`The complex ion is anionic, so chromium is named as chromate.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the ligand names used for $\mathrm{NH_3}$ and $\mathrm{H_2O}$ in coordination nomenclature.`,
        1,
        ["ligand_names", "nomenclature", "ammine_aqua"],
        parts([["a", L`Give both ligand names.`, 1]]),
        [
          L`The ammonia ligand has a double m in its name.`,
          L`Water is not named water inside the coordination sphere.`,
          L`Use ammine and aqua.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{NH_3}$ is named ammine and $\mathrm{H_2O}$ is named aqua.`,
          },
        ],
        [
          L`Writing ammonia instead of ammine.`,
          L`Writing water instead of aqua.`,
        ],
      ),
      frq(
        "saq",
        L`Name $\mathrm{[Cr(H_2O)_4Cl_2]Cl}$ by IUPAC rules.`,
        2,
        ["iupac_nomenclature", "oxidation_state", "ligand_order"],
        parts([
          ["a", L`Find the oxidation state of chromium.`, 1],
          ["b", L`Write the full name.`, 1],
        ]),
        [
          L`The complex ion has charge $+1$.`,
          L`Aqua is neutral and chlorido is $-1$.`,
          L`List ligands alphabetically: aqua before chlorido.`,
        ],
        [
          {
            part: "a",
            explanation: L`Let chromium oxidation state be $x$.`,
            math: L`x+4(0)+2(-1)=+1\Rightarrow x=+3`,
          },
          {
            part: "b",
            explanation: L`The name is tetraaquadichloridochromium(III) chloride.`,
          },
        ],
        [
          L`Naming the outside chloride before the complex cation.`,
          L`Using chromium(I) by ignoring the inner chlorido ligands.`,
        ],
      ),
      frq(
        "saq",
        L`Write the formula of tetraamminecopper(II) sulphate and state the charge on the complex ion.`,
        2,
        ["formula_writing", "tetraammine", "charge_balance"],
        parts([
          ["a", L`Write the formula.`, 1],
          ["b", L`State the complex-ion charge.`, 1],
        ]),
        [
          L`Tetraammine means four neutral $\mathrm{NH_3}$ ligands.`,
          L`Copper(II) gives the complex cation charge $+2$.`,
          L`Sulphate is $\mathrm{SO_4^{2-}}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The formula is $\mathrm{[Cu(NH_3)_4]SO_4}$.`,
          },
          {
            part: "b",
            explanation: L`The complex ion is $\mathrm{[Cu(NH_3)_4]^{2+}}$.`,
          },
        ],
        [
          L`Putting sulphate inside the coordination sphere without it being named as a ligand.`,
          L`Treating ammine as charged.`,
        ],
      ),
      frq(
        "laq",
        L`A student proposes the name "potassium tetrachloridonickel(II)" for $\mathrm{K_2[NiCl_4]}$. Evaluate and correct the name if needed.`,
        3,
        ["nomenclature_error_correction", "anionic_complex", "oxidation_state"],
        parts([
          ["a", L`Find the oxidation state of nickel.`, 1],
          ["b", L`Identify the naming error.`, 1],
          ["c", L`Write the corrected name.`, 1],
        ]),
        [
          L`The complex ion has charge $2-$.`,
          L`Each chlorido ligand is $-1$.`,
          L`An anionic nickel complex uses the name nickelate.`,
        ],
        [
          {
            part: "a",
            explanation: L`Let nickel oxidation state be $x$.`,
            math: L`x+4(-1)=-2\Rightarrow x=+2`,
          },
          {
            part: "b",
            explanation: L`The metal name should end in -ate because the complex ion is anionic.`,
          },
          {
            part: "c",
            explanation: L`The corrected name is potassium tetrachloridonickelate(II).`,
          },
        ],
        [
          L`Forgetting the -ate ending for anionic complexes.`,
          L`Changing the oxidation state while correcting only the suffix.`,
        ],
      ),
      frq(
        "case",
        L`A label has partly rubbed off from three bottles. Bottle I reads $\mathrm{[Co(NH_3)_6]Cl_3}$. Bottle II reads potassium hexacyanidoferrate(II). Bottle III reads diamminedichloridoplatinum(II).`,
        3,
        ["case_based", "nomenclature", "formula_name_conversion"],
        parts([
          ["a", L`Name bottle I.`, 1],
          ["b", L`Write the formula for bottle II.`, 1],
          [
            "c",
            L`State whether bottle III is a neutral complex or an ionic compound.`,
            1,
          ],
        ]),
        [
          L`Bottle I has a cationic cobalt complex and chloride counter-ions.`,
          L`Hexacyanidoferrate(II) has charge $4-$.`,
          L`Diamminedichloridoplatinum(II) has no counter-ion named.`,
        ],
        [
          {
            part: "a",
            explanation: L`Bottle I is hexaamminecobalt(III) chloride.`,
          },
          {
            part: "b",
            explanation: L`Bottle II is $\mathrm{K_4[Fe(CN)_6]}$.`,
          },
          {
            part: "c",
            explanation: L`Bottle III is a neutral complex, $\mathrm{[Pt(NH_3)_2Cl_2]}$.`,
          },
        ],
        [
          L`Writing cobalt(I) by counting only outside chloride.`,
          L`Using only one potassium ion for a $4-$ complex.`,
        ],
      ),
    ],
  },
  {
    topicCode: "5.3",
    title: "Isomerism in Coordination Compounds",
    subtopic:
      "Structural isomerism, linkage isomerism, ionisation isomerism, geometrical isomerism, and optical isomerism.",
    mc: [
      mc(
        L`The complex $\mathrm{[Pt(NH_3)_2Cl_2]}$ shows geometrical isomerism because it can have`,
        2,
        ["geometrical_isomerism", "square_planar", "cis_trans"],
        [
          L`two chlorido ligands adjacent or opposite in a square plane`,
          L`different oxidation states of platinum in the same formula`,
          L`one chloride outside and one chloride inside the coordination sphere`,
          L`different denticities of the ammine ligand`,
        ],
        "A",
        {
          B: L`Geometrical isomerism keeps the oxidation state unchanged.`,
          C: L`That would suggest ionisation-type change, not cis-trans arrangement in the same sphere.`,
          D: L`Ammine is monodentate in both isomers.`,
        },
        [
          L`$\mathrm{Pt(II)}$ often forms square-planar complexes.`,
          L`Square-planar $\mathrm{MA_2B_2}$ complexes can be cis or trans.`,
          L`Cis means adjacent; trans means opposite.`,
        ],
        [
          {
            step: 1,
            explanation: L`The same ligand set can be arranged with like ligands adjacent or opposite in a square plane.`,
          },
        ],
      ),
      mc(
        L`Linkage isomerism is most directly possible when the ligand is`,
        2,
        ["linkage_isomerism", "ambidentate_ligand", "nitrito"],
        [
          L`monodentate and neutral only`,
          L`ambidentate, such as $\mathrm{NO_2^-}$`,
          L`a counter-ion outside the sphere`,
          L`a metal ion with zero oxidation state only`,
        ],
        "B",
        {
          A: L`A monodentate neutral ligand such as $\mathrm{NH_3}$ usually has only one donor atom.`,
          C: L`Counter-ions outside the sphere do not create linkage isomerism.`,
          D: L`Linkage isomerism depends on ligand donor atoms, not zero oxidation state of the metal.`,
        },
        [
          L`Linkage means attachment through different donor atoms.`,
          L`An ambidentate ligand has two possible donor atoms.`,
          L`$\mathrm{NO_2^-}$ can bind through nitrogen or oxygen.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{NO_2^-}$ can bind as nitro or nitrito, so it can produce linkage isomers.`,
          },
        ],
      ),
      mc(
        L`The pair $\mathrm{[Co(NH_3)_5Br]SO_4}$ and $\mathrm{[Co(NH_3)_5SO_4]Br}$ is best described as`,
        3,
        ["ionisation_isomerism", "coordination_sphere", "structural_isomerism"],
        [
          L`linkage isomers`,
          L`ionisation isomers`,
          L`optical isomers`,
          L`geometrical isomers`,
        ],
        "B",
        {
          A: L`No ambidentate ligand is changing its donor atom here.`,
          C: L`The difference is not mirror-image non-superimposability.`,
          D: L`The ligand positions in space are not the defining change here.`,
        },
        [
          L`Compare which ion is inside the coordination sphere.`,
          L`One formula has bromide inside and sulphate outside.`,
          L`The other swaps them, so different ions are released in solution.`,
        ],
        [
          {
            step: 1,
            explanation: L`The compounds give different ions in solution because bromide and sulphate exchange positions inside and outside the coordination sphere.`,
          },
        ],
      ),
      mc(
        L`The number of geometrical isomers expected for an octahedral complex of type $\mathrm{MA_4B_2}$ is`,
        2,
        ["geometrical_isomerism", "octahedral", "ma4b2"],
        [L`$1$`, L`$2$`, L`$3$`, L`$4$`],
        "B",
        {
          A: L`There are two distinct relative positions for the two B ligands.`,
          C: L`Three isomers are typical for some $\mathrm{MA_3B_3}$ fac-mer arrangements, not $\mathrm{MA_4B_2}$.`,
          D: L`Four overcounts equivalent rotations of the same arrangement.`,
        },
        [
          L`Focus on the positions of the two B ligands.`,
          L`They may be adjacent or opposite.`,
          L`Those are cis and trans.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{MA_4B_2}$ octahedral complexes show cis and trans forms, so there are two geometrical isomers.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): $\mathrm{[Co(en)_3]^{3+}}$ can show optical isomerism. Reason (R): Three bidentate $\mathrm{en}$ ligands can arrange around an octahedral metal centre as non-superimposable mirror images.`,
        3,
        ["assertion_reason", "optical_isomerism", "bidentate_ligand"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains the optical activity of this tris-chelate octahedral complex.`,
          C: L`The reason is true for $\mathrm{[Co(en)_3]^{3+}}$.`,
          D: L`The assertion is true; tris-bidentate octahedral complexes can be optically active.`,
        },
        [
          L`Each $\mathrm{en}$ ligand forms a chelate ring.`,
          L`Three chelate rings can wrap in two handed arrangements.`,
          L`Non-superimposable mirror images are optical isomers.`,
        ],
        [
          {
            step: 1,
            explanation: L`Both assertion and reason are true, and the reason explains optical isomerism in $\mathrm{[Co(en)_3]^{3+}}$.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name two ambidentate ligands that can give linkage isomerism.`,
        1,
        ["ambidentate_ligand", "linkage_isomerism", "examples"],
        parts([["a", L`Give two examples.`, 1]]),
        [
          L`Think of ligands with two possible donor atoms.`,
          L`Nitrite can bind through nitrogen or oxygen.`,
          L`Thiocyanate can bind through sulphur or nitrogen.`,
        ],
        [
          {
            part: "a",
            explanation: L`Examples are $\mathrm{NO_2^-}$ and $\mathrm{SCN^-}$.`,
          },
        ],
        [
          L`Giving $\mathrm{NH_3}$, which has only one donor atom.`,
          L`Confusing bidentate ligands with ambidentate ligands.`,
        ],
      ),
      frq(
        "saq",
        L`For square-planar $\mathrm{[Pt(NH_3)_2Cl_2]}$, describe the cis and trans forms without drawing them.`,
        2,
        ["cis_trans", "square_planar", "geometrical_isomerism"],
        parts([
          ["a", L`Describe the cis form.`, 1],
          ["b", L`Describe the trans form.`, 1],
        ]),
        [
          L`Square-planar means all four ligands lie around the metal in one plane.`,
          L`Cis means like ligands adjacent.`,
          L`Trans means like ligands opposite.`,
        ],
        [
          {
            part: "a",
            explanation: L`In the cis form, the two chlorido ligands are adjacent to each other, and the two ammine ligands are also adjacent.`,
          },
          {
            part: "b",
            explanation: L`In the trans form, the two chlorido ligands are opposite each other, and the two ammine ligands are opposite each other.`,
          },
        ],
        [
          L`Calling any two different ligands cis just because they are bonded to the same metal.`,
          L`Forgetting that square-planar and tetrahedral $\mathrm{MA_2B_2}$ do not behave the same in geometrical isomerism.`,
        ],
      ),
      frq(
        "saq",
        L`Distinguish ionisation isomerism and linkage isomerism using the pairs $\mathrm{[Co(NH_3)_5Br]SO_4}/\mathrm{[Co(NH_3)_5SO_4]Br}$ and $\mathrm{[Co(NH_3)_5(NO_2)]^{2+}}/\mathrm{[Co(NH_3)_5(ONO)]^{2+}}$.`,
        3,
        ["isomerism", "ionisation_isomerism", "linkage_isomerism"],
        parts([
          ["a", L`Identify the ionisation-isomer pair and explain.`, 1],
          ["b", L`Identify the linkage-isomer pair and explain.`, 1],
        ]),
        [
          L`Ionisation isomerism changes which ion is released outside the sphere.`,
          L`Linkage isomerism changes donor atom of an ambidentate ligand.`,
          L`Compare bromide/sulphate exchange with nitro/nitrito binding.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{[Co(NH_3)_5Br]SO_4}$ and $\mathrm{[Co(NH_3)_5SO_4]Br}$ are ionisation isomers because bromide and sulphate exchange inside/outside positions and release different ions in solution.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{[Co(NH_3)_5(NO_2)]^{2+}}$ and $\mathrm{[Co(NH_3)_5(ONO)]^{2+}}$ are linkage isomers because $\mathrm{NO_2^-}$ binds through different donor atoms.`,
          },
        ],
        [
          L`Calling the nitro/nitrito pair geometrical isomers.`,
          L`Ignoring which ion is outside the coordination sphere in ionisation isomerism.`,
        ],
      ),
      frq(
        "laq",
        L`A six-coordinate complex has formula $\mathrm{[Co(NH_3)_4Cl_2]Cl}$. It exists in two geometrical forms.`,
        3,
        ["octahedral_isomerism", "cis_trans", "ionisation"],
        parts([
          ["a", L`Identify the geometry around cobalt.`, 1],
          ["b", L`Name the two geometrical forms.`, 1],
          [
            "c",
            L`How many chloride ions are immediately precipitated per formula unit by excess $\mathrm{AgNO_3}$?`,
            1,
          ],
        ]),
        [
          L`Six-coordinate cobalt(III) complexes are octahedral in this syllabus context.`,
          L`Two inner chlorido ligands can be adjacent or opposite.`,
          L`Only the chloride outside the bracket is immediately ionisable.`,
        ],
        [
          {
            part: "a",
            explanation: L`The coordination number is $6$, so the geometry is octahedral.`,
          },
          {
            part: "b",
            explanation: L`The two forms are cis and trans, based on the relative positions of the two chlorido ligands.`,
          },
          {
            part: "c",
            explanation: L`One chloride ion is outside the coordination sphere, so one $\mathrm{AgCl}$ precipitate forms per formula unit.`,
          },
        ],
        [
          L`Treating both inner chlorido ligands as immediately ionisable.`,
          L`Assuming only square-planar complexes show cis-trans isomerism.`,
        ],
      ),
      frq(
        "case",
        L`The figure shows two square-planar arrangements of a complex $\mathrm{MA_2B_2}$. Arrangement I places the two A ligands adjacent; Arrangement II places them opposite. A medicinal platinum complex has the same type of square-planar arrangement issue.`,
        3,
        ["case_based", "square_planar", "cis_trans", "application"],
        parts([
          ["a", L`Which arrangement is the cis form?`, 1],
          ["b", L`Which arrangement is the trans form?`, 1],
          [
            "c",
            L`Why can the two forms have different properties even though their formula is the same?`,
            1,
          ],
        ]),
        [
          L`Cis means the identical ligands are adjacent.`,
          L`Trans means the identical ligands are opposite.`,
          L`Different spatial arrangement changes interaction with other molecules.`,
        ],
        [
          {
            part: "a",
            explanation: L`Arrangement I is cis because the two A ligands are adjacent.`,
          },
          {
            part: "b",
            explanation: L`Arrangement II is trans because the two A ligands are opposite.`,
          },
          {
            part: "c",
            explanation: L`The spatial arrangement controls how the complex approaches and binds other species, so isomers can differ in reactivity and biological effect.`,
          },
        ],
        [
          L`Using molecular formula alone to decide properties.`,
          L`Confusing adjacent with opposite placement.`,
        ],
        squarePlanarIsomerFigure,
      ),
    ],
  },
  {
    topicCode: "5.4",
    title: "Bonding, Colour and Magnetic Behaviour",
    subtopic:
      "Valence bond ideas, crystal-field splitting, strong and weak field ligands, spin state, colour, and magnetic moment.",
    mc: [
      mc(
        L`The complex $\mathrm{[Ni(CN)_4]^{2-}}$ is expected to be`,
        3,
        ["vbt", "strong_field_ligand", "magnetic_behaviour"],
        [
          L`tetrahedral and paramagnetic with two unpaired electrons`,
          L`square planar and diamagnetic`,
          L`octahedral and diamagnetic`,
          L`linear and paramagnetic`,
        ],
        "B",
        {
          A: L`Cyanido is a strong-field ligand and favours pairing in this $\mathrm{Ni^{2+}}$ complex.`,
          C: L`The coordination number is $4$, not $6$.`,
          D: L`A four-coordinate $\mathrm{Ni^{2+}}$ complex is not linear here.`,
        },
        [
          L`Nickel is in the $+2$ oxidation state.`,
          L`$\mathrm{Ni^{2+}}$ is $3d^8$.`,
          L`Strong-field $\mathrm{CN^-}$ favours pairing and square-planar $\mathrm{dsp^2}$ description.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{[Ni(CN)_4]^{2-}}$ is a square-planar, diamagnetic complex in the valence-bond description.`,
          },
        ],
      ),
      mc(
        L`For $\mathrm{[NiCl_4]^{2-}}$, the most suitable CBSE-level description is`,
        3,
        ["vbt", "weak_field_ligand", "tetrahedral_complex"],
        [
          L`square planar and diamagnetic`,
          L`tetrahedral and paramagnetic`,
          L`linear and diamagnetic`,
          L`octahedral and paramagnetic`,
        ],
        "B",
        {
          A: L`Chlorido is a weak-field ligand and does not force pairing as cyanido does in the analogous complex.`,
          C: L`The coordination number is $4$, so linear geometry is not suitable.`,
          D: L`There are four ligands, not six.`,
        },
        [
          L`Chlorido is a weak-field ligand.`,
          L`Four-coordinate $\mathrm{Ni^{2+}}$ with weak ligands is treated as tetrahedral.`,
          L`Unpaired electrons make it paramagnetic.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{[NiCl_4]^{2-}}$ is described as tetrahedral and paramagnetic.`,
          },
        ],
      ),
      mc(
        L`In an octahedral field, strong-field ligands generally cause`,
        2,
        ["crystal_field_theory", "strong_field_ligand", "pairing"],
        [
          L`a larger $\Delta_o$ and greater tendency for electron pairing`,
          L`zero splitting of all $d$ orbitals`,
          L`mandatory tetrahedral geometry for every metal ion`,
          L`loss of all ligands from the coordination sphere`,
        ],
        "A",
        {
          B: L`Crystal-field splitting is the central idea; it does not become zero with strong ligands.`,
          C: L`Strong-field ligand behaviour does not force all complexes to become tetrahedral.`,
          D: L`Ligand field strength is about orbital splitting, not ligand loss.`,
        },
        [
          L`Compare $\Delta_o$ with pairing energy.`,
          L`Strong-field ligands create larger splitting.`,
          L`When splitting is large, pairing in lower orbitals can be favoured.`,
        ],
        [
          {
            step: 1,
            explanation: L`Strong-field ligands increase $\Delta_o$, so pairing can occur before electrons occupy higher-energy orbitals.`,
          },
        ],
      ),
      mc(
        L`The spin-only magnetic moment of a complex ion with four unpaired electrons is closest to`,
        3,
        ["magnetic_moment", "spin_only", "unpaired_electrons"],
        [
          L`$1.73\,\mathrm{BM}$`,
          L`$2.83\,\mathrm{BM}$`,
          L`$4.90\,\mathrm{BM}$`,
          L`$5.92\,\mathrm{BM}$`,
        ],
        "C",
        {
          A: L`This value corresponds to one unpaired electron.`,
          B: L`This value corresponds to two unpaired electrons.`,
          D: L`This value corresponds to five unpaired electrons.`,
        },
        [
          L`Use $\mu=\sqrt{n(n+2)}\,\mathrm{BM}$.`,
          L`Here $n=4$.`,
          L`Compute $\sqrt{4(6)}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For four unpaired electrons,`,
            math: L`\mu=\sqrt{4(4+2)}=\sqrt{24}\approx4.90\,\mathrm{BM}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): $\mathrm{[Fe(CN)_6]^{4-}}$ is diamagnetic. Reason (R): $\mathrm{CN^-}$ is a strong-field ligand and pairs the electrons of low-spin $\mathrm{Fe^{2+}}$ in an octahedral field.`,
        3,
        ["assertion_reason", "low_spin", "cyanido_complex"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains the absence of unpaired electrons.`,
          C: L`$\mathrm{CN^-}$ is a strong-field ligand and does cause low-spin pairing in this case.`,
          D: L`The assertion is true for $\mathrm{[Fe(CN)_6]^{4-}}$.`,
        },
        [
          L`Find iron oxidation state: $+2$.`,
          L`$\mathrm{Fe^{2+}}$ is $d^6$.`,
          L`Strong-field octahedral $d^6$ becomes low spin with paired electrons.`,
        ],
        [
          {
            step: 1,
            explanation: L`Low-spin $d^6$ has all electrons paired in the lower set, so the complex is diamagnetic.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Give one strong-field ligand and one weak-field ligand from the coordination-compound syllabus.`,
        1,
        ["ligand_field_strength", "strong_field", "weak_field"],
        parts([["a", L`Give one example of each.`, 1]]),
        [
          L`Cyanido and carbonyl are common strong-field ligands.`,
          L`Fluorido and chlorido are weak-field examples.`,
          L`Give one from each category.`,
        ],
        [
          {
            part: "a",
            explanation: L`For example, $\mathrm{CN^-}$ is strong-field and $\mathrm{F^-}$ is weak-field.`,
          },
        ],
        [
          L`Putting $\mathrm{CN^-}$ in the weak-field list.`,
          L`Giving two ligands from the same field-strength category.`,
        ],
      ),
      frq(
        "saq",
        L`Calculate the spin-only magnetic moment of a complex with three unpaired electrons.`,
        2,
        ["magnetic_moment", "spin_only", "calculation"],
        parts([["a", L`Calculate $\mu$ in $\mathrm{BM}$.`, 2]]),
        [
          L`Use the spin-only formula.`,
          L`Here $n=3$.`,
          L`Evaluate $\sqrt{3(3+2)}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using the spin-only expression,`,
            math: L`\mu=\sqrt{n(n+2)}=\sqrt{3(5)}=\sqrt{15}\approx3.87\,\mathrm{BM}`,
            markingPoints: [L`Uses $\mu=\sqrt{n(n+2)}$ with $n=3$.`, L`Evaluates $\sqrt{15}\approx3.87\,\mathrm{BM}$, including the unit. Accept a correct exact radical.`],
          },
        ],
        [
          L`Using total $d$ electrons instead of unpaired electrons.`,
          L`Forgetting the square root in the formula.`,
        ],
      ),
      frq(
        "saq",
        L`Compare $\mathrm{[Fe(CN)_6]^{4-}}$ and $\mathrm{[Fe(H_2O)_6]^{2+}}$ in terms of spin state and magnetic behaviour.`,
        3,
        ["low_spin_high_spin", "magnetic_behaviour", "ligand_field"],
        parts([
          [
            "a",
            L`State the oxidation state and $d$ count of iron in both complexes.`,
            1,
          ],
          ["b", L`Compare their magnetic behaviour.`, 2],
        ]),
        [
          L`Both complexes contain $\mathrm{Fe^{2+}}$.`,
          L`$\mathrm{CN^-}$ is strong field; $\mathrm{H_2O}$ is weaker field.`,
          L`Strong-field $d^6$ is low spin; weaker-field $d^6$ is high spin.`,
        ],
        [
          {
            part: "a",
            explanation: L`In both complexes, iron is $+2$, so it is $d^6$.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{[Fe(CN)_6]^{4-}}$ is low spin and diamagnetic, while $\mathrm{[Fe(H_2O)_6]^{2+}}$ is treated as high spin and paramagnetic at this level.`,
            markingPoints: [L`Identifies the cyanido complex as low-spin $d^6$, with no unpaired electrons, hence diamagnetic.`, L`Identifies the aqua complex as high-spin $d^6$, with four unpaired electrons, hence paramagnetic.`],
          },
        ],
        [
          L`Assuming all $\mathrm{Fe^{2+}}$ complexes have the same spin state regardless of ligand.`,
          L`Treating water as a strong-field ligand like cyanido.`,
        ],
      ),
      frq(
        "laq",
        L`Use the octahedral splitting diagram to explain why a strong-field ligand can change both colour and magnetic behaviour of a transition-metal complex.`,
        4,
        [
          "crystal_field_theory",
          "colour",
          "magnetism",
          "figure_interpretation",
        ],
        parts([
          ["a", L`State what $\Delta_o$ represents.`, 1],
          ["b", L`Explain how $\Delta_o$ is related to colour.`, 1],
          [
            "c",
            L`Explain how a large $\Delta_o$ can affect pairing and magnetism.`,
            2,
          ],
        ]),
        [
          L`$\Delta_o$ is the gap between lower and higher split $d$ levels in an octahedral field.`,
          L`Light absorption can promote an electron across this gap.`,
          L`If the gap is large, pairing in the lower set can be favoured.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\Delta_o$ is the energy separation between the lower $\mathrm{t_{2g}}$ and higher $\mathrm{e_g}$ levels in an octahedral field.`,
          },
          {
            part: "b",
            explanation: L`Absorption of visible light can promote an electron across $\Delta_o$; the complementary colour is observed.`,
          },
          {
            part: "c",
            explanation: L`A strong-field ligand makes $\Delta_o$ large. If $\Delta_o$ becomes greater than the pairing energy, electrons pair in lower orbitals, reducing the number of unpaired electrons and hence lowering paramagnetism or producing diamagnetism.`,
            markingPoints: [L`Compares $\Delta_o$ with pairing energy: when splitting exceeds pairing energy, lower-orbital pairing is favoured.`, L`Links fewer unpaired electrons to a smaller magnetic moment; diamagnetism follows if all electrons are paired.`],
          },
        ],
        [
          L`Saying colour comes from nuclear reactions.`,
          L`Ignoring that magnetism depends on unpaired electrons.`,
        ],
        octahedralSplittingFigure,
      ),
      frq(
        "case",
        L`Two octahedral $\mathrm{d^4}$ complexes are compared. Complex I has a weak-field ligand and complex II has a strong-field ligand. Assume the usual high-spin and low-spin arrangements.`,
        3,
        ["case_based", "high_spin_low_spin", "unpaired_electrons"],
        parts([
          ["a", L`How many unpaired electrons are expected in complex I?`, 1],
          ["b", L`How many unpaired electrons are expected in complex II?`, 1],
          [
            "c",
            L`Which complex should have the larger spin-only magnetic moment?`,
            1,
          ],
        ]),
        [
          L`Weak-field octahedral $\mathrm{d^4}$ is high spin.`,
          L`Strong-field octahedral $\mathrm{d^4}$ is low spin.`,
          L`More unpaired electrons means larger spin-only magnetic moment.`,
        ],
        [
          {
            part: "a",
            explanation: L`Weak-field high-spin $\mathrm{d^4}$ has four unpaired electrons.`,
          },
          {
            part: "b",
            explanation: L`Strong-field low-spin $\mathrm{d^4}$ has two unpaired electrons.`,
          },
          {
            part: "c",
            explanation: L`Complex I has the larger magnetic moment because it has more unpaired electrons.`,
          },
        ],
        [
          L`Assuming strong-field and weak-field ligands give the same electron arrangement.`,
          L`Comparing magnetic moment without counting unpaired electrons.`,
        ],
      ),
    ],
  },
  {
    topicCode: "5.5",
    title: "Metal Carbonyls and Applications",
    subtopic:
      "Synergic bonding in metal carbonyls and the biological, analytical, medicinal, and industrial uses of coordination compounds.",
    mc: [
      mc(
        L`The metal-carbon bond in metal carbonyls is strengthened mainly by`,
        3,
        ["metal_carbonyl", "synergic_bonding", "sigma_pi"],
        [
          L`only ionic attraction between $\mathrm{M^+}$ and $\mathrm{CO^-}$`,
          L`only transfer of all metal electrons to carbon monoxide`,
          L`$\sigma$ donation from CO to metal and $\pi$ back donation from metal to CO`,
          L`hydrogen bonding between metal and carbon monoxide`,
        ],
        "C",
        {
          A: L`Metal carbonyl bonding is described by synergic covalent interaction, not simple ionic attraction.`,
          B: L`Complete electron transfer is not the bonding model for metal carbonyls.`,
          D: L`There is no hydrogen atom in carbon monoxide to support this explanation.`,
        },
        [
          L`CO donates a lone pair from carbon to metal.`,
          L`Filled metal orbitals can donate back into empty antibonding orbitals of CO.`,
          L`The two effects reinforce each other.`,
        ],
        [
          {
            step: 1,
            explanation: L`The bond has synergic $\sigma$ donation and $\pi$ back donation.`,
          },
        ],
      ),
      mc(
        L`Which correctly matches a coordination compound or complex with its biological or medicinal role?`,
        2,
        ["applications", "biological_complexes", "cisplatin"],
        [
          L`chlorophyll: magnesium complex involved in photosynthesis`,
          L`haemoglobin: zinc complex used as a fertiliser`,
          L`vitamin $\mathrm{B_{12}}$: nickel carbonyl used in metallurgy`,
          L`cisplatin: iron complex used as a green pigment`,
        ],
        "A",
        {
          B: L`Haemoglobin is an iron complex involved in oxygen transport.`,
          C: L`Vitamin $\mathrm{B_{12}}$ contains cobalt; it is not nickel carbonyl.`,
          D: L`Cisplatin is a platinum anticancer drug, not an iron pigment.`,
        },
        [
          L`Chlorophyll contains magnesium.`,
          L`Haemoglobin contains iron.`,
          L`Cisplatin contains platinum.`,
        ],
        [
          {
            step: 1,
            explanation: L`Chlorophyll is a magnesium coordination compound essential for photosynthesis.`,
          },
        ],
      ),
      mc(
        L`The ligand $\mathrm{CO}$ in metal carbonyls is generally a`,
        2,
        ["carbonyl_ligand", "strong_field", "low_spin"],
        [
          L`weak-field ligand that always prevents pairing`,
          L`strong-field ligand that often favours low-spin complexes`,
          L`hexadentate anionic ligand`,
          L`counter-ion outside the coordination sphere`,
        ],
        "B",
        {
          A: L`Carbonyl is a strong-field ligand, not weak-field.`,
          C: L`CO is neutral and normally monodentate through carbon.`,
          D: L`CO is a ligand inside the coordination sphere in metal carbonyls.`,
        },
        [
          L`CO is high in the spectrochemical series.`,
          L`Strong-field ligands can cause pairing.`,
          L`Many metal carbonyls are low-spin or diamagnetic.`,
        ],
        [
          {
            step: 1,
            explanation: L`Carbonyl is a strong-field ligand and favours low-spin arrangements where applicable.`,
          },
        ],
      ),
      mc(
        L`Coordination compounds help in qualitative analysis mainly because`,
        2,
        ["applications", "qualitative_analysis", "complex_formation"],
        [
          L`all metal ions become colourless in every ligand`,
          L`metal ions can form characteristic coloured or soluble complexes with selected ligands`,
          L`ligands destroy the identity of every metal ion completely`,
          L`complex formation eliminates the need for selective reactions`,
        ],
        "B",
        {
          A: L`Many complexes are coloured, and colour can be diagnostically useful.`,
          C: L`Complex formation changes coordination environment but does not destroy the metal identity.`,
          D: L`Qualitative analysis depends on selective reactions and observations.`,
        },
        [
          L`Think of tests that use colour changes or precipitate dissolution.`,
          L`Ligands bind selectively to metal ions.`,
          L`The resulting complex may have characteristic colour or solubility.`,
        ],
        [
          {
            step: 1,
            explanation: L`Selective complex formation gives characteristic colours or solubilities, so it helps identify ions.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Cisplatin and transplatin have the same formula but different biological effects. Reason (R): Spatial arrangement of ligands in a square-planar complex can control how the complex interacts with biomolecules.`,
        3,
        ["assertion_reason", "cisplatin", "geometrical_isomerism"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The spatial arrangement is exactly why the two isomers behave differently.`,
          C: L`The reason correctly connects square-planar geometry to biological interaction.`,
          D: L`Cisplatin and transplatin do have different biological effects.`,
        },
        [
          L`Cis and trans are geometrical isomers.`,
          L`They have the same formula but different ligand positions.`,
          L`Biological binding depends strongly on shape.`,
        ],
        [
          {
            step: 1,
            explanation: L`Both statements are true, and the reason explains the different behaviour of the isomers.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the two components of synergic bonding in a metal carbonyl.`,
        1,
        ["metal_carbonyl", "synergic_bonding", "sigma_pi"],
        parts([["a", L`Name both components.`, 1]]),
        [
          L`One component is ligand to metal donation.`,
          L`The other component is metal to ligand back donation.`,
          L`Use the words $\sigma$ and $\pi$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Synergic bonding has CO to metal $\sigma$ donation and metal to CO $\pi$ back donation.`,
          },
        ],
        [
          L`Mentioning only one direction of donation.`,
          L`Calling it hydrogen bonding.`,
        ],
      ),
      frq(
        "saq",
        L`Use the two-interaction schematic to explain why $\mathrm{CO}$ forms stable metal carbonyls even though it is a neutral ligand.`,
        2,
        ["metal_carbonyl", "neutral_ligand", "back_bonding"],
        parts([["a", L`Give the bonding explanation.`, 2]]),
        [
          L`Neutral ligands can still donate electron pairs.`,
          L`In the schematic, interaction I is ligand-to-metal donation.`,
          L`Interaction II is metal-to-ligand back donation, and the two effects reinforce each other.`,
        ],
        [
          {
            part: "a",
            explanation: L`CO donates a lone pair from carbon to the metal through $\sigma$ donation, while filled metal orbitals can back-donate electron density into empty antibonding orbitals of CO. These two interactions reinforce each other and stabilise metal carbonyls.`,
            markingPoints: [L`Describes carbon-to-metal lone-pair $\sigma$ donation from CO.`, L`Describes metal-to-CO $\pi$ back donation into empty antibonding orbitals and notes that the interactions reinforce one another.`],
          },
        ],
        [
          L`Assuming neutral ligands cannot coordinate.`,
          L`Ignoring metal-to-ligand back donation.`,
        ],
        carbonylSynergyFigure,
      ),
      frq(
        "saq",
        L`Give two biological coordination compounds and identify the central metal ion or atom in each.`,
        2,
        ["applications", "biological_complexes", "central_metal"],
        parts([["a", L`Give two correct compound-metal pairs.`, 2]]),
        [
          L`Common examples include haemoglobin, chlorophyll and vitamin $\mathrm{B_{12}}$.`,
          L`Haemoglobin contains iron.`,
          L`Chlorophyll contains magnesium; vitamin $\mathrm{B_{12}}$ contains cobalt.`,
        ],
        [
          {
            part: "a",
            explanation: L`Examples: haemoglobin contains iron, chlorophyll contains magnesium, and vitamin $\mathrm{B_{12}}$ contains cobalt. Any two correct pairs are sufficient.`,
            markingPoints: [L`Gives one correct pair: haemoglobin-iron, chlorophyll-magnesium, vitamin $\mathrm{B_{12}}$-cobalt, or another valid biological coordination compound and its metal.`, L`Gives a second distinct correct compound-metal pair. Do not count a repeated pair twice.`],
          },
        ],
        [
          L`Writing zinc for haemoglobin.`,
          L`Giving only names without identifying metals.`,
        ],
      ),
      frq(
        "laq",
        L`Coordination compounds are useful in medicine, analysis and industry. Justify this statement with three specific examples.`,
        3,
        ["applications", "medicine", "analysis", "industry"],
        parts([
          ["a", L`Give one medicinal example.`, 1],
          ["b", L`Give one analytical example.`, 1],
          ["c", L`Give one industrial or biological-material example.`, 1],
        ]),
        [
          L`Cisplatin is a medicinal platinum complex.`,
          L`Qualitative analysis uses selective complex formation.`,
          L`Metal carbonyls and biological complexes provide other examples.`,
        ],
        [
          {
            part: "a",
            explanation: L`Cisplatin is a platinum coordination compound used as an anticancer drug.`,
          },
          {
            part: "b",
            explanation: L`Selective complex formation helps identify metal ions in qualitative analysis through characteristic colours or solubilities.`,
          },
          {
            part: "c",
            explanation: L`Examples include nickel carbonyl in purification of nickel, chlorophyll as a magnesium complex in photosynthesis, or haemoglobin as an iron complex for oxygen transport.`,
          },
        ],
        [
          L`Giving vague claims without named examples.`,
          L`Using examples that are not coordination compounds or complexes.`,
        ],
      ),
      frq(
        "case",
        L`A research display shows three substances: haemoglobin, chlorophyll and $\mathrm{[Ni(CO)_4]}$. It asks students to connect coordination chemistry with transport, photosynthesis and metal-carbonyl bonding.`,
        3,
        [
          "case_based",
          "applications",
          "metal_carbonyl",
          "biological_complexes",
        ],
        parts([
          ["a", L`Which substance is associated with oxygen transport?`, 1],
          ["b", L`Which substance contains magnesium?`, 1],
          [
            "c",
            L`For $\mathrm{[Ni(CO)_4]}$, name the ligand and state the oxidation state of nickel.`,
            1,
          ],
        ]),
        [
          L`Haemoglobin contains iron and carries oxygen.`,
          L`Chlorophyll contains magnesium and is linked with photosynthesis.`,
          L`CO is neutral in nickel carbonyl.`,
        ],
        [
          {
            part: "a",
            explanation: L`Haemoglobin is associated with oxygen transport.`,
          },
          {
            part: "b",
            explanation: L`Chlorophyll contains magnesium.`,
          },
          {
            part: "c",
            explanation: L`The ligand is carbonyl, $\mathrm{CO}$. Since CO is neutral and the complex is neutral, nickel is in oxidation state $0$.`,
          },
        ],
        [
          L`Assigning oxygen transport to chlorophyll.`,
          L`Giving nickel oxidation state $+4$ by treating CO as $-1$.`,
        ],
      ),
    ],
  },
];

export const coordinationCompoundsTopics: Topic[] = topicSeeds.map(makeTopic);
